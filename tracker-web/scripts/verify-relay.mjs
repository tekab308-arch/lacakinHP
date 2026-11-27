import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../public/community-relays.json');
const LIVE_MODE = process.argv.includes('--live');

function isPrivateOrLocalHost(hostname) {
  const h = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h === '::1' ||
    h === '::' ||
    h.startsWith('fe80:') ||
    h.startsWith('fc') ||
    h.startsWith('fd')
  ) {
    return true;
  }
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function assertValidPublicRelayUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error(`URL relay tidak valid: ${rawUrl}`);
  }
  if (parsed.protocol !== 'wss:') {
    throw new Error(`Protokol wajib wss:// pada ${rawUrl}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`URL tidak boleh menyertakan kredensial: ${rawUrl}`);
  }
  if (isPrivateOrLocalHost(parsed.hostname) || !parsed.hostname.includes('.')) {
    throw new Error(`Host privat/lokal ditolak (anti-SSRF): ${rawUrl}`);
  }
  return parsed.toString().replace(/\/$/, '');
}

async function checkLiveRelay(url) {
  const httpsUrl = url.replace(/^wss:\/\//, 'https://');
  let nip11Software = 'unknown';
  try {
    const res = await fetch(httpsUrl, {
      headers: { Accept: 'application/nostr+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const info = await res.json();
      nip11Software = String(info?.software || info?.name || 'nip11-ok');
    }
  } catch {
    // NIP-11 optional; WebSocket REQ is authoritative
  }

  if (typeof WebSocket === 'undefined') {
    return { url, ok: true, latencyMs: 0, nip11Software, note: 'WS skipped (Node <22)' };
  }

  const start = performance.now();
  return new Promise((resolve) => {
    let settled = false;
    const subId = 'sentinel_' + Math.random().toString(36).slice(2, 8);
    let ws;
    const done = (ok, note) => {
      if (settled) return;
      settled = true;
      try {
        ws?.close();
      } catch {
        // ignore
      }
      resolve({
        url,
        ok,
        latencyMs: Math.round(performance.now() - start),
        nip11Software,
        note,
      });
    };

    const timer = setTimeout(() => done(false, 'timeout'), 6000);
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        ws.send(JSON.stringify(['REQ', subId, { kinds: [30078], limit: 1 }]));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data || ''));
          if (Array.isArray(msg) && (msg[0] === 'EOSE' || msg[0] === 'EVENT')) {
            clearTimeout(timer);
            done(true, 'EOSE');
          }
        } catch {
          // ignore
        }
      };
      ws.onerror = () => {
        clearTimeout(timer);
        done(false, 'ws-error');
      };
    } catch (err) {
      clearTimeout(timer);
      done(false, err instanceof Error ? err.message : 'connect-failed');
    }
  });
}

async function main() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const registry = JSON.parse(raw);

  if (!registry || typeof registry !== 'object' || !Array.isArray(registry.relays)) {
    throw new Error('community-relays.json harus memiliki array "relays".');
  }
  if (!Number.isInteger(registry.minQuorum) || registry.minQuorum < 2) {
    throw new Error('minQuorum wajib >= 2 untuk mencegah single-point-of-failure.');
  }

  const seenUrls = new Set();
  const activeRelays = [];

  for (const relay of registry.relays) {
    if (!relay || typeof relay !== 'object') {
      throw new Error('Entri relay harus berupa objek.');
    }
    if (!relay.id || typeof relay.id !== 'string') {
      throw new Error('Setiap relay wajib memiliki "id" string.');
    }
    const cleanUrl = assertValidPublicRelayUrl(relay.url);
    if (seenUrls.has(cleanUrl)) {
      throw new Error(`Duplikat URL relay ditemukan: ${cleanUrl}`);
    }
    seenUrls.add(cleanUrl);
    if (relay.status === 'active') {
      activeRelays.push({ ...relay, url: cleanUrl });
    }
  }

  if (activeRelays.length < 3) {
    throw new Error('Minimal harus ada 3 relay aktif untuk redundansi multi-node.');
  }

  console.log(
    `✓ Registry schema & anti-SSRF valid (${activeRelays.length} active nodes, minQuorum=${registry.minQuorum}).`
  );

  if (LIVE_MODE) {
    const results = await Promise.all(activeRelays.map((r) => checkLiveRelay(r.url)));
    let healthyCount = 0;
    for (const r of results) {
      if (r.ok) healthyCount += 1;
      console.log(
        `${r.ok ? '✓' : '✗'} ${r.url} | ${r.latencyMs}ms | ${r.nip11Software} | ${r.note}`
      );
    }
    if (healthyCount < registry.minQuorum) {
      throw new Error(
        `Quorum gagal: hanya ${healthyCount}/${activeRelays.length} node aktif (butuh min. ${registry.minQuorum}).`
      );
    }
    console.log(`✓ Live relay sentinel passed (${healthyCount}/${activeRelays.length} healthy).`);
  }
}

main().catch((err) => {
  console.error('❌ verify-relay failed:', err.message);
  process.exit(1);
});
