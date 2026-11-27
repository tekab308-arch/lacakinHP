import { useEffect, useState } from 'react';
import {
  DEFAULT_RELAYS,
  FALLBACK_RELAYS,
  isValidPublicRelayUrl,
} from './nostr';

export interface CommunityRelayNode {
  id: string;
  url: string;
  name: string;
  location: string;
  operator: string;
  isCore: boolean;
  status: 'active' | 'inactive';
}

export interface CommunityRelayRegistry {
  version: number;
  updatedAt: string;
  minQuorum: number;
  relays: CommunityRelayNode[];
}

export const DEFAULT_COMMUNITY_REGISTRY: CommunityRelayRegistry = {
  version: 1,
  updatedAt: '2026-11-27T16:15:00Z',
  minQuorum: 2,
  relays: [
    ...DEFAULT_RELAYS.map((url, idx) => ({
      id: `core-${idx + 1}`,
      url,
      name: url.replace(/^wss:\/\//, ''),
      location: 'Global Core',
      operator: 'Nostr Public Relay',
      isCore: true,
      status: 'active' as const,
    })),
    ...FALLBACK_RELAYS.map((url, idx) => ({
      id: `community-${idx + 1}`,
      url,
      name: url.replace(/^wss:\/\//, ''),
      location: 'Global Backup',
      operator: 'Community Relay',
      isCore: false,
      status: 'active' as const,
    })),
  ],
};

function sanitizeLabel(raw: unknown, fallback: string, maxLen = 64): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\r\n\t<>]/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}

export function parseCommunityRelaysRegistry(
  data: unknown
): CommunityRelayRegistry {
  if (!data || typeof data !== 'object') {
    return DEFAULT_COMMUNITY_REGISTRY;
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.relays)) {
    return DEFAULT_COMMUNITY_REGISTRY;
  }

  const seenUrls = new Set<string>();
  const validRelays: CommunityRelayNode[] = [];

  for (const item of obj.relays) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (r.status !== 'active') continue;
    if (typeof r.url !== 'string' || !isValidPublicRelayUrl(r.url)) continue;

    const normalizedUrl = new URL(r.url.trim()).toString().replace(/\/$/, '');
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    validRelays.push({
      id: sanitizeLabel(r.id, `relay-${validRelays.length + 1}`, 40),
      url: normalizedUrl,
      name: sanitizeLabel(r.name, normalizedUrl.replace(/^wss:\/\//, ''), 48),
      location: sanitizeLabel(r.location, 'Global', 40),
      operator: sanitizeLabel(r.operator, 'Relawan Nostr', 48),
      isCore: Boolean(r.isCore),
      status: 'active',
    });

    if (validRelays.length >= 24) break;
  }

  if (validRelays.length < 2) {
    return DEFAULT_COMMUNITY_REGISTRY;
  }

  const minQuorum =
    typeof obj.minQuorum === 'number' &&
    Number.isInteger(obj.minQuorum) &&
    obj.minQuorum >= 1 &&
    obj.minQuorum <= validRelays.length
      ? obj.minQuorum
      : 2;

  return {
    version:
      typeof obj.version === 'number' && Number.isInteger(obj.version)
        ? obj.version
        : 1,
    updatedAt: sanitizeLabel(
      obj.updatedAt,
      DEFAULT_COMMUNITY_REGISTRY.updatedAt,
      40
    ),
    minQuorum,
    relays: validRelays,
  };
}

let cachedRegistry: CommunityRelayRegistry | null = null;
let inflightRegistryPromise: Promise<CommunityRelayRegistry> | null = null;

async function fetchCommunityRelays(): Promise<CommunityRelayRegistry> {
  if (cachedRegistry) return cachedRegistry;
  if (!inflightRegistryPromise) {
    inflightRegistryPromise = fetch('/community-relays.json', {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        cachedRegistry = parseCommunityRelaysRegistry(data);
        return cachedRegistry;
      })
      .catch(() => DEFAULT_COMMUNITY_REGISTRY)
      .finally(() => {
        inflightRegistryPromise = null;
      });
  }
  return inflightRegistryPromise;
}

export function useCommunityRelays(): CommunityRelayRegistry {
  const [registry, setRegistry] = useState<CommunityRelayRegistry>(
    () => cachedRegistry ?? DEFAULT_COMMUNITY_REGISTRY
  );

  useEffect(() => {
    let active = true;
    fetchCommunityRelays().then((resolved) => {
      if (active) setRegistry(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return registry;
}
