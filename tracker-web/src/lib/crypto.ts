import * as secp from '@noble/secp256k1';

export type CryptoVersion = 'v2' | 'v1';

export interface DerivedKeys {
  aesKey: CryptoKey;
  pubHex: string;
  version: CryptoVersion;
  keyModeLabel: string;
}

export interface DualDerivedKeys {
  v2: DerivedKeys;
  v1: DerivedKeys;
  keyModeLabel: string;
}

export interface DecryptedLocationPoint {
  lat: number;
  lng: number;
  acc: number;
  prv: string;
  bat: number;
  ts: number;
  mdl?: string;
  eventId?: string;
  pubkey?: string;
  sig?: string;
  relay?: string;
}

async function sha256Bytes(input: string | Uint8Array): Promise<Uint8Array> {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return new Uint8Array(hash);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export function normalizeSecret(secret: string): string {
  return secret.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function detectSecretMode(secret: string): string {
  const norm = normalizeSecret(secret);
  if (!norm) return 'Belum diisi';
  const words = norm.split(' ').filter(Boolean);
  if (words.length >= 12) return `Seedphrase (${words.length} kata)`;
  return `Kata Sandi Pribadi (${norm.length} karakter)`;
}

/**
 * Derives both v2 (PBKDF2-HMAC-SHA256 100,000 iterations) and legacy v1 (SHA-256)
 * key pairs locally inside the browser, matching Android CryptoHelper byte-for-byte.
 */
export async function deriveAllKeyVersions(
  deviceId: string,
  secret: string
): Promise<DualDerivedKeys> {
  const normDevice = deviceId.trim().toLowerCase();
  const normSeed = normalizeSecret(secret);
  const keyModeLabel = detectSecretMode(secret);
  const enc = new TextEncoder();

  // v2: PBKDF2-HMAC-SHA256 (100,000 iterations, 512 bits output)
  const pbkdf2BaseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(normSeed) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const masterBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(`lacakhp:v2:${normDevice}`) as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    pbkdf2BaseKey,
    512
  );
  const masterBytes = new Uint8Array(masterBits);
  const aesRawV2 = masterBytes.slice(0, 32);
  let privV2: Uint8Array = masterBytes.slice(32, 64);
  while (!secp.utils.isValidPrivateKey(privV2)) {
    privV2 = await sha256Bytes(privV2);
  }
  const aesKeyV2 = await crypto.subtle.importKey(
    'raw',
    aesRawV2 as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const pubHexV2 = bytesToHex(secp.getPublicKey(privV2, true).slice(1));

  // v1: Legacy SHA-256 derivation for seamless backward compatibility
  const aesRawV1 = await sha256Bytes(`lacakhp:aes:v1:${normDevice}:${normSeed}`);
  const aesKeyV1 = await crypto.subtle.importKey(
    'raw',
    aesRawV1 as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  let privV1 = await sha256Bytes(`lacakhp:nostr:v1:${normDevice}:${normSeed}`);
  while (!secp.utils.isValidPrivateKey(privV1)) {
    privV1 = await sha256Bytes(privV1);
  }
  const pubHexV1 = bytesToHex(secp.getPublicKey(privV1, true).slice(1));

  return {
    v2: {
      aesKey: aesKeyV2,
      pubHex: pubHexV2,
      version: 'v2',
      keyModeLabel,
    },
    v1: {
      aesKey: aesKeyV1,
      pubHex: pubHexV1,
      version: 'v1',
      keyModeLabel,
    },
    keyModeLabel,
  };
}

const MAX_CIPHERTEXT_CHARS = 4096;
const HEX64_LOWER_RE = /^[0-9a-f]{64}$/;
const HEX128_LOWER_RE = /^[0-9a-f]{128}$/;

let cachedBip340ChallengeTag: Promise<Uint8Array> | null = null;

function getBip340ChallengeTagHash(): Promise<Uint8Array> {
  if (!cachedBip340ChallengeTag) {
    cachedBip340ChallengeTag = sha256Bytes('BIP0340/challenge');
  }
  return cachedBip340ChallengeTag;
}

export interface VerifiableNostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Pure BIP-340 Schnorr signature verification over secp256k1 using @noble/secp256k1 primitives
 * and WebCrypto SHA-256 (zero additional npm dependencies).
 */
export async function verifySchnorrBip340(
  sigHex: string,
  msgHex32: string,
  pubKeyHex32: string
): Promise<boolean> {
  try {
    if (
      typeof sigHex !== 'string' ||
      typeof msgHex32 !== 'string' ||
      typeof pubKeyHex32 !== 'string'
    ) {
      return false;
    }
    const sNorm = sigHex.toLowerCase();
    const mNorm = msgHex32.toLowerCase();
    const pNorm = pubKeyHex32.toLowerCase();
    if (
      !HEX128_LOWER_RE.test(sNorm) ||
      !HEX64_LOWER_RE.test(mNorm) ||
      !HEX64_LOWER_RE.test(pNorm)
    ) {
      return false;
    }

    const sigBytes = secp.etc.hexToBytes(sNorm);
    const msgBytes = secp.etc.hexToBytes(mNorm);
    const pubBytes = secp.etc.hexToBytes(pNorm);

    const r = secp.etc.bytesToNumberBE(sigBytes.subarray(0, 32));
    const s = secp.etc.bytesToNumberBE(sigBytes.subarray(32, 64));
    if (r >= secp.CURVE.p || s >= secp.CURVE.n) {
      return false;
    }

    // lift_x(pk): 0x02 || pk lifts x to curve point P with even y (throws if x === 0, x >= p, or off-curve)
    const liftedPrefix = new Uint8Array(33);
    liftedPrefix[0] = 0x02;
    liftedPrefix.set(pubBytes, 1);
    const P = secp.Point.fromBytes(liftedPrefix);

    // e = int(hash_BIP0340/challenge(bytes(r) || bytes(P) || m)) mod n
    const tagHash = await getBip340ChallengeTagHash();
    const challengeInput = secp.etc.concatBytes(
      tagHash,
      tagHash,
      sigBytes.subarray(0, 32),
      pubBytes,
      msgBytes
    );
    const challengeDigest = await sha256Bytes(challengeInput);
    const e = secp.etc.mod(
      secp.etc.bytesToNumberBE(challengeDigest),
      secp.CURVE.n
    );

    // R = s*G - e*P
    const sG =
      s === 0n ? secp.Point.ZERO : secp.Point.BASE.multiply(s, false);
    const eP = e === 0n ? secp.Point.ZERO : P.multiply(e, false);
    const R = sG.add(eP.negate());
    if (R.is0()) {
      return false;
    }

    const { x: rx, y: ry } = R.toAffine();
    return (ry & 1n) === 0n && rx === r;
  } catch {
    return false;
  }
}

/**
 * Verifies NIP-01 canonical SHA-256 event commitment ID and 64-byte BIP-340 Schnorr signature,
 * preventing malicious relays from spoofing IDs, poisoning dedup caches, or replaying mutated envelopes.
 */
export async function verifyNostrEventSignature(
  ev: VerifiableNostrEvent
): Promise<boolean> {
  if (!ev || typeof ev !== 'object') return false;
  if (
    typeof ev.id !== 'string' ||
    !HEX64_LOWER_RE.test(ev.id) ||
    typeof ev.pubkey !== 'string' ||
    !HEX64_LOWER_RE.test(ev.pubkey) ||
    typeof ev.sig !== 'string' ||
    !HEX128_LOWER_RE.test(ev.sig)
  ) {
    return false;
  }
  if (
    typeof ev.created_at !== 'number' ||
    !Number.isInteger(ev.created_at) ||
    ev.created_at < 0 ||
    typeof ev.kind !== 'number' ||
    !Number.isInteger(ev.kind) ||
    typeof ev.content !== 'string' ||
    ev.content.length > MAX_CIPHERTEXT_CHARS
  ) {
    return false;
  }
  if (
    !Array.isArray(ev.tags) ||
    ev.tags.length > 32 ||
    !ev.tags.every(
      (t) =>
        Array.isArray(t) &&
        t.length <= 16 &&
        t.every((v) => typeof v === 'string' && v.length <= 256)
    )
  ) {
    return false;
  }

  const canonical = JSON.stringify([
    0,
    ev.pubkey,
    ev.created_at,
    ev.kind,
    ev.tags,
    ev.content,
  ]);
  const computedIdHex = bytesToHex(await sha256Bytes(canonical));
  if (computedIdHex !== ev.id) {
    return false;
  }

  return verifySchnorrBip340(ev.sig, ev.id, ev.pubkey);
}

export async function decryptNostrPayload(
  aesKey: CryptoKey,
  content: string
): Promise<DecryptedLocationPoint | null> {
  const raw = String(content || '');
  if (!raw || raw.length > MAX_CIPHERTEXT_CHARS) return null;
  const parts = raw.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;

  const iv = base64UrlToBytes(parts[1]);
  if (iv.length !== 12) return null;
  const ct = base64UrlToBytes(parts[2]);
  if (ct.length < 16) return null;

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    ct as BufferSource
  );
  const parsed = JSON.parse(new TextDecoder().decode(plainBuf));
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.lat !== 'number' ||
    typeof parsed.lng !== 'number' ||
    !Number.isFinite(parsed.lat) ||
    !Number.isFinite(parsed.lng) ||
    parsed.lat < -90 ||
    parsed.lat > 90 ||
    parsed.lng < -180 ||
    parsed.lng > 180
  ) {
    return null;
  }

  const acc =
    typeof parsed.acc === 'number' && Number.isFinite(parsed.acc) && parsed.acc >= 0
      ? Math.min(parsed.acc, 100_000)
      : 0;
  const bat =
    typeof parsed.bat === 'number' && Number.isFinite(parsed.bat)
      ? Math.max(-1, Math.min(100, Math.round(parsed.bat)))
      : -1;
  const ts =
    typeof parsed.ts === 'number' &&
    Number.isFinite(parsed.ts) &&
    parsed.ts >= 0 &&
    parsed.ts <= 8_640_000_000_000_000
      ? Math.floor(parsed.ts)
      : 0;
  const prv =
    typeof parsed.prv === 'string' && parsed.prv.trim()
      ? parsed.prv.trim().slice(0, 32)
      : 'gps';
  const mdl =
    typeof parsed.mdl === 'string' && parsed.mdl.trim()
      ? parsed.mdl.trim().slice(0, 80)
      : undefined;

  return {
    lat: parsed.lat,
    lng: parsed.lng,
    acc,
    prv,
    bat,
    ts,
    ...(mdl ? { mdl } : {}),
  };
}
