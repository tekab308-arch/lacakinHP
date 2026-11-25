import {
  CryptoVersion,
  DecryptedLocationPoint,
  DualDerivedKeys,
  decryptNostrPayload,
  verifyNostrEventSignature,
} from './crypto';

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

export const FALLBACK_RELAYS = [
  'wss://offchain.pub',
  'wss://nostr.mom',
  'wss://nostr.bitcoiner.social',
];

export interface RawNostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface RelayQueryStatus {
  url: string;
  state: 'connecting' | 'connected' | 'done' | 'error';
  eventCount: number;
  latencyMs?: number;
  isFallback?: boolean;
}

export interface NostrQueryResult {
  points: DecryptedLocationPoint[];
  rawPoints: DecryptedLocationPoint[];
  filteredOutlierCount: number;
  rawSampleEvent: RawNostrEvent | null;
  totalEncryptedEvents: number;
  matchedVersion: CryptoVersion | null;
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Filters coarse cell-tower/network bounces and single-sample GPS teleports
 * from decrypted newest-first points so stationary devices do not zigzag on the map.
 */
export function filterCoarseJumps(pointsDesc: DecryptedLocationPoint[]): {
  cleanPoints: DecryptedLocationPoint[];
  filteredCount: number;
} {
  if (pointsDesc.length <= 1) {
    return { cleanPoints: pointsDesc, filteredCount: 0 };
  }

  const chrono = pointsDesc.slice().reverse();
  const clean: DecryptedLocationPoint[] = [];

  for (let i = 0; i < chrono.length; i++) {
    const p = chrono[i];
    if (clean.length === 0) {
      clean.push(p);
      continue;
    }

    // If the trail started on a coarse cell-tower fix and a sharp fix arrived soon after, drop the coarse start.
    if (
      clean.length === 1 &&
      (clean[0].acc || 0) > 150 &&
      (p.acc || 0) > 0 &&
      p.acc <= 100 &&
      Math.max(0, (p.ts || 0) - (clean[0].ts || 0)) <= 60 * 60_000
    ) {
      clean[0] = p;
      continue;
    }

    const anchor = clean[clean.length - 1];
    const dist = haversineMeters(anchor, p);
    const dtMs = Math.max(0, (p.ts || 0) - (anchor.ts || 0));
    if (dtMs <= 2_000 && dist < 5) {
      continue;
    }
    const pAcc = p.acc || 0;
    const anchorAcc = anchor.acc || 0;

    const nextAccurateReturnsToAnchor = chrono.slice(i + 1).some((q) => {
      const qDt = Math.max(0, (q.ts || 0) - (p.ts || 0));
      return (
        qDt <= 60 * 60_000 &&
        (q.acc || 0) > 0 &&
        q.acc <= 100 &&
        haversineMeters(anchor, q) <= 200
      );
    });

    const isCoarseOverSharp = pAcc > 150 && (anchorAcc <= 0 || pAcc > anchorAcc * 2);
    if (isCoarseOverSharp) {
      const overlapRadius = Math.max(pAcc * 2.5, 400);
      if ((dist <= overlapRadius && dtMs < 60 * 60_000) || nextAccurateReturnsToAnchor) {
        continue;
      }
    }

    if (dtMs > 0 && dtMs <= 120_000 && dist / (dtMs / 1000) > 85) {
      if (nextAccurateReturnsToAnchor || pAcc > 100) {
        continue;
      }
    }

    clean.push(p);
  }

  return {
    cleanPoints: clean.reverse(),
    filteredCount: pointsDesc.length - clean.length,
  };
}

const MAX_CUSTOM_RELAYS = 8;
const MAX_EVENTS_PER_RELAY = 200;
const MAX_WS_FRAME_BYTES = 16_384;
const MAX_SEEN_EVENT_IDS = 2000;

export function parseRelaysCsv(raw: string): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const part of String(raw || '').split(',')) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.length > 200) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.username || parsed.password) continue;
      const isSecure = parsed.protocol === 'wss:';
      const isLocalDev =
        parsed.protocol === 'ws:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
      if (!isSecure && !isLocalDev) continue;
      const normalized = parsed.toString().replace(/\/$/, '');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        valid.push(normalized);
        if (valid.length >= MAX_CUSTOM_RELAYS) break;
      }
    } catch {
      // Invalid URL skipped
    }
  }
  return valid;
}

function querySingleRelay(
  relayUrl: string,
  authors: string[],
  onStatus: (status: RelayQueryStatus) => void
): Promise<RawNostrEvent[]> {
  return new Promise((resolve) => {
    const events: RawNostrEvent[] = [];
    const subId = 'lh_' + Math.random().toString(36).slice(2, 10);
    const startTime = performance.now();
    let settled = false;

    onStatus({ url: relayUrl, state: 'connecting', eventCount: 0 });

    const finish = (ws: WebSocket | null, finalState: 'done' | 'error') => {
      if (settled) return;
      settled = true;
      try {
        ws?.close();
      } catch {
        // Ignore socket close error
      }
      onStatus({
        url: relayUrl,
        state: finalState,
        eventCount: events.length,
        latencyMs: Math.round(performance.now() - startTime),
      });
      resolve(events);
    };

    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      finish(null, 'error');
      return;
    }

    const timer = setTimeout(() => {
      finish(ws, events.length > 0 ? 'done' : 'error');
    }, 5500);

    ws.onopen = () => {
      onStatus({ url: relayUrl, state: 'connected', eventCount: 0 });
      ws.send(
        JSON.stringify([
          'REQ',
          subId,
          { authors, kinds: [30078, 3078], limit: 100 },
        ])
      );
    };

    ws.onmessage = (msg) => {
      try {
        const rawFrame = String(msg.data ?? '');
        if (rawFrame.length > MAX_WS_FRAME_BYTES) return;
        const arr = JSON.parse(rawFrame);
        if (arr[0] === 'EVENT' && arr[1] === subId && arr[2]) {
          if (events.length < MAX_EVENTS_PER_RELAY) {
            events.push(arr[2] as RawNostrEvent);
          }
          if (events.length >= MAX_EVENTS_PER_RELAY) {
            clearTimeout(timer);
            finish(ws, 'done');
          }
        } else if (arr[0] === 'EOSE' && arr[1] === subId) {
          clearTimeout(timer);
          finish(ws, 'done');
        }
      } catch {
        // Malformed frame ignored
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      finish(ws, 'error');
    };
  });
}

/**
 * Dual-Lookup query across multiple decentralized Nostr relays in a single subscription
 * covering both v2 (PBKDF2 100k) and legacy v1 (SHA-256) pubkeys seamlessly.
 */
export async function fetchAndDecryptFromRelays(
  relays: string[],
  keys: DualDerivedKeys,
  onRelayProgress: (url: string, status: RelayQueryStatus) => void
): Promise<NostrQueryResult> {
  const authors = [keys.v2.pubHex, keys.v1.pubHex];
  let healthyPrimaryRelays = 0;

  const lists = await Promise.all(
    relays.map((url) =>
      querySingleRelay(url, authors, (status) => {
        if (status.state === 'done') {
          healthyPrimaryRelays += 1;
        }
        onRelayProgress(url, status);
      })
    )
  );

  const uniqueById = new Map<string, RawNostrEvent>();
  const ingestVerifiedEvents = async (batches: RawNostrEvent[][]) => {
    for (const list of batches) {
      for (const ev of list) {
        if (!ev || typeof ev.id !== 'string' || uniqueById.has(ev.id)) continue;
        if (ev.pubkey !== keys.v2.pubHex && ev.pubkey !== keys.v1.pubHex) continue;
        // Verify NIP-01 SHA-256 commitment + BIP-340 Schnorr BEFORE inserting into uniqueById
        // so a hostile relay cannot poison uniqueById with a forged event sharing a real ID.
        if (await verifyNostrEventSignature(ev)) {
          uniqueById.set(ev.id, ev);
        }
      }
    }
  };

  await ingestVerifiedEvents(lists);

  // Smart Auto-Failover: if fewer than 2 primary relays succeeded OR zero verified events were found,
  // automatically sweep backup relays so blocked/slow relays never prevent finding a lost device.
  if (healthyPrimaryRelays < 2 || uniqueById.size === 0) {
    const backupRelays = FALLBACK_RELAYS.filter((r) => !relays.includes(r));
    if (backupRelays.length > 0) {
      const backupLists = await Promise.all(
        backupRelays.map((url) =>
          querySingleRelay(url, authors, (status) =>
            onRelayProgress(url, { ...status, isFallback: true })
          )
        )
      );
      await ingestVerifiedEvents(backupLists);
    }
  }

  let rawSampleEvent: RawNostrEvent | null = null;
  let hasV2 = false;
  let hasV1 = false;
  const v2Points: DecryptedLocationPoint[] = [];
  const v1Points: DecryptedLocationPoint[] = [];

  for (const ev of uniqueById.values()) {
    if (ev.pubkey === keys.v2.pubHex) {
      try {
        const payload = await decryptNostrPayload(keys.v2.aesKey, ev.content);
        if (payload) {
          if (!rawSampleEvent) rawSampleEvent = ev;
          hasV2 = true;
          v2Points.push(payload);
        }
      } catch {
        // Corrupted v2 event; ignore
      }
    } else if (ev.pubkey === keys.v1.pubHex) {
      try {
        const payload = await decryptNostrPayload(keys.v1.aesKey, ev.content);
        if (payload) {
          if (!rawSampleEvent) rawSampleEvent = ev;
          hasV1 = true;
          v1Points.push(payload);
        }
      } catch {
        // Corrupted v1 event; ignore
      }
    }
  }

  // Prefer v2 points if available; otherwise seamless fallback to v1
  const chosenPoints = v2Points.length > 0 ? v2Points : v1Points;
  const matchedVersion: CryptoVersion | null = hasV2 ? 'v2' : hasV1 ? 'v1' : null;

  const pointMap = new Map<string, DecryptedLocationPoint>();
  for (const p of chosenPoints) {
    const key = `${p.ts}_${p.lat.toFixed(6)}_${p.lng.toFixed(6)}`;
    pointMap.set(key, p);
  }

  const sortedPoints = Array.from(pointMap.values()).sort(
    (a, b) => (b.ts || 0) - (a.ts || 0)
  );
  const { cleanPoints, filteredCount } = filterCoarseJumps(sortedPoints);

  return {
    points: cleanPoints,
    rawPoints: sortedPoints,
    filteredOutlierCount: filteredCount,
    rawSampleEvent,
    totalEncryptedEvents: uniqueById.size,
    matchedVersion,
  };
}

/**
 * Keeps 1 persistent WebSocket subscription per relay for live location updates
 * instead of reconnecting every 15s (avoids public relay 503 rate-limiting).
 */
export function subscribeToRelays(
  relays: string[],
  keys: DualDerivedKeys,
  sinceSec: number,
  onPoint: (point: DecryptedLocationPoint, rawEvent: RawNostrEvent, version: CryptoVersion) => void,
  onRelayProgress?: (url: string, status: RelayQueryStatus) => void
): () => void {
  const authors = [keys.v2.pubHex, keys.v1.pubHex];
  const seenEventIds = new Set<string>();
  const sockets = new Map<string, WebSocket>();
  const retryTimers = new Map<string, number>();
  let closed = false;

  const connect = (relayUrl: string, attempt: number) => {
    if (closed) return;
    const subId = 'lh_live_' + Math.random().toString(36).slice(2, 9);
    const startTime = performance.now();
    let eventCount = 0;

    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      return;
    }
    sockets.set(relayUrl, ws);

    ws.onopen = () => {
      if (closed) {
        ws.close();
        return;
      }
      onRelayProgress?.(relayUrl, {
        url: relayUrl,
        state: 'done',
        eventCount,
        latencyMs: Math.round(performance.now() - startTime),
      });
      ws.send(
        JSON.stringify([
          'REQ',
          subId,
          { authors, kinds: [30078, 3078], since: sinceSec },
        ])
      );
    };

    ws.onmessage = (msg) => {
      if (closed) return;
      try {
        const rawFrame = String(msg.data ?? '');
        if (rawFrame.length > MAX_WS_FRAME_BYTES) return;
        const arr = JSON.parse(rawFrame);
        if (arr[0] !== 'EVENT' || arr[1] !== subId || !arr[2]) return;
        const ev = arr[2] as RawNostrEvent;
        if (!ev || !ev.id || typeof ev.id !== 'string' || seenEventIds.has(ev.id)) return;
        if (ev.pubkey !== keys.v2.pubHex && ev.pubkey !== keys.v1.pubHex) return;

        verifyNostrEventSignature(ev)
          .then(async (sigValid) => {
            if (!sigValid || closed || seenEventIds.has(ev.id)) return;
            if (seenEventIds.size >= MAX_SEEN_EVENT_IDS) {
              const oldest = seenEventIds.values().next().value;
              if (oldest) seenEventIds.delete(oldest);
            }
            seenEventIds.add(ev.id);
            eventCount += 1;

            const isV2 = ev.pubkey === keys.v2.pubHex;
            const pt = await decryptNostrPayload(
              isV2 ? keys.v2.aesKey : keys.v1.aesKey,
              ev.content
            );
            if (pt && !closed) {
              onPoint(pt, ev, isV2 ? 'v2' : 'v1');
            }
          })
          .catch(() => {});
      } catch {
        // Malformed frame ignored
      }
    };

    const scheduleReconnect = () => {
      if (closed) return;
      const delayMs = Math.min(60_000, 15_000 * Math.pow(2, Math.min(attempt, 2)));
      const t = window.setTimeout(() => connect(relayUrl, attempt + 1), delayMs);
      retryTimers.set(relayUrl, t);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // Ignore
      }
    };

    ws.onclose = () => {
      sockets.delete(relayUrl);
      scheduleReconnect();
    };
  };

  for (const url of relays) {
    connect(url, 0);
  }

  return () => {
    closed = true;
    for (const timer of retryTimers.values()) {
      window.clearTimeout(timer);
    }
    retryTimers.clear();
    for (const ws of sockets.values()) {
      try {
        ws.close();
      } catch {
        // Ignore
      }
    }
    sockets.clear();
  };
}

function safeIsoTimestamp(ts: number): string {
  if (!ts || !Number.isFinite(ts) || ts <= 0) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function csvSafeCell(raw: string): string {
  const cleaned = String(raw ?? '').replace(/[\r\n]+/g, ' ');
  const neutralized = /^[=+\-@\t\r]/.test(cleaned) ? `'${cleaned}` : cleaned;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function pointsToCsv(points: DecryptedLocationPoint[]): string {
  const header = 'timestamp_iso,latitude,longitude,accuracy_m,provider,battery_pct,model';
  const rows = points.map((p) => {
    const iso = safeIsoTimestamp(p.ts);
    const lat = Number.isFinite(p.lat) ? p.lat.toFixed(6) : '0.000000';
    const lng = Number.isFinite(p.lng) ? p.lng.toFixed(6) : '0.000000';
    const acc = Number.isFinite(p.acc) ? Math.round(p.acc) : 0;
    const bat = typeof p.bat === 'number' && Number.isFinite(p.bat) ? p.bat : '';
    const prv = csvSafeCell(p.prv || 'gps');
    const mdl = csvSafeCell(p.mdl || '');
    return `${iso},${lat},${lng},${acc},${prv},${bat},${mdl}`;
  });
  return [header, ...rows].join('\n');
}

export function pointsToGpx(points: DecryptedLocationPoint[], deviceId: string): string {
  const esc = (s: string) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  const chrono = points.slice().reverse();
  const trkpts = chrono
    .map((p) => {
      const iso = safeIsoTimestamp(p.ts);
      const timeTag = iso ? `<time>${iso}</time>` : '';
      const lat = Number.isFinite(p.lat) ? p.lat.toFixed(6) : '0.000000';
      const lng = Number.isFinite(p.lng) ? p.lng.toFixed(6) : '0.000000';
      const acc = Number.isFinite(p.acc) ? Math.round(p.acc) : 0;
      const bat = typeof p.bat === 'number' && Number.isFinite(p.bat) ? p.bat : '-';
      const desc = `acc=${acc}m prv=${esc(p.prv || 'gps')} bat=${bat}%`;
      return `      <trkpt lat="${lat}" lon="${lng}">${timeTag}<desc>${desc}</desc></trkpt>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="LacakHP Open-Source" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <trk><name>${esc(deviceId || 'lacakhp')}</name><trkseg>`,
    trkpts,
    '  </trkseg></trk>',
    '</gpx>',
  ].join('\n');
}
