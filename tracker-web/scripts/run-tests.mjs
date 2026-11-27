import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lacakhp-web-test-'));

function bundle(entryRel, outName) {
  const outPath = path.join(tmpDir, outName);
  const esbuildBin = path.join(rootDir, 'node_modules', '.bin', 'esbuild');
  execFileSync(
    esbuildBin,
    [path.join(rootDir, entryRel), '--bundle', '--format=esm', `--outfile=${outPath}`],
    { stdio: 'pipe' }
  );
  return pathToFileURL(outPath).href;
}

try {
  const cryptoMod = await import(bundle('src/lib/crypto.ts', 'crypto.mjs'));
  const nostrMod = await import(bundle('src/lib/nostr.ts', 'nostr.mjs'));
  const communityMod = await import(bundle('src/lib/communityRelays.ts', 'communityRelays.mjs'));
  const releaseMod = await import(bundle('src/lib/releaseInfo.ts', 'releaseInfo.mjs'));
  const qrMod = await import(bundle('src/lib/qrSvg.ts', 'qrSvg.mjs'));

  // 1. Deterministic v2 PBKDF2-100k & v1 SHA-256 key derivation + AES-256-GCM round-trip
  const dualA = await cryptoMod.deriveAllKeyVersions('Samsung-SM-A217F-Test', '  Kucing   Lucu 2026 ');
  const dualB = await cryptoMod.deriveAllKeyVersions('samsung-sm-a217f-test', 'kucing lucu 2026');
  assert.equal(dualA.v2.pubHex, dualB.v2.pubHex, 'v2 pubkey must be normalized & deterministic');
  assert.equal(dualA.v1.pubHex, dualB.v1.pubHex, 'v1 pubkey must be normalized & deterministic');
  assert.equal(dualA.v2.pubHex.length, 64, 'x-only secp256k1 pubkey must be 64 hex chars');
  assert.notEqual(dualA.v2.pubHex, dualA.v1.pubHex, 'v2 PBKDF2 and v1 SHA-256 keys must differ');

  // Encrypt with Node WebCrypto using the same derived v2 PBKDF2 AES key and decrypt via decryptNostrPayload
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode('kucing lucu 2026'),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const master = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode('lacakhp:v2:samsung-sm-a217f-test'),
        iterations: 100_000,
        hash: 'SHA-256',
      },
      baseKey,
      512
    )
  );
  const aesEncKey = await crypto.subtle.importKey(
    'raw',
    master.slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sample = { lat: -5.154884, lng: 105.299902, acc: 15, prv: 'gps', bat: 88, ts: 1700000000000 };
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesEncKey, enc.encode(JSON.stringify(sample)))
  );
  const toB64Url = (b) => Buffer.from(b).toString('base64url');
  const wire = `v1:${toB64Url(iv)}:${toB64Url(ct)}`;
  const decrypted = await cryptoMod.decryptNostrPayload(dualA.v2.aesKey, wire);
  assert.deepEqual(decrypted, sample, 'AES-GCM round-trip payload must match');

  // 2. Stationary BTS bounce filtering + duplicate dedup + real movement preservation
  const pt = (m, lat, lng, acc, prv = 'gps') => ({
    lat,
    lng,
    acc,
    prv,
    bat: 80,
    ts: 1_700_000_000_000 + m * 60_000,
  });
  const newestFirst = [
    pt(60, -5.418, 105.262, 600, 'network'), // real 4km move (keep)
    pt(30, -5.38218, 105.25924, 18, 'gps'), // back at home (keep)
    pt(20, -5.405, 105.259, 900, 'network'), // 2.5km BTS bounce before returning home (filter)
    pt(10, -5.393, 105.265, 1200, 'network'), // 1.3km BTS bounce within overlap radius (filter)
    { ...pt(0, -5.38216, 105.25922, 15, 'gps'), ts: 1_700_000_001_000 }, // 1s duplicate (filter)
    pt(0, -5.38216, 105.25922, 15, 'gps'), // home anchor (keep)
  ];
  const filtered = nostrMod.filterCoarseJumps(newestFirst);
  assert.equal(filtered.filteredCount, 3);
  assert.equal(filtered.cleanPoints.length, 3);

  // 3. CSV & GPX evidence export + Security hardening tests
  const csv = nostrMod.pointsToCsv(filtered.cleanPoints);
  assert.match(csv, /^timestamp_iso,latitude,longitude,accuracy_m,provider,battery_pct,model\n/);
  assert.equal(csv.trim().split('\n').length, 4);

  // 3a. CSV Formula Injection (Excel/DDE) neutralization
  const maliciousCsv = nostrMod.pointsToCsv([
    {
      lat: -5.38,
      lng: 105.26,
      acc: 10,
      prv: '=HYPERLINK("http://evil.example")',
      bat: 50,
      ts: 1_700_000_000_000,
      mdl: '+CMD|\' /C calc\'!A0',
    },
  ]);
  assert.ok(
    maliciousCsv.includes(`"'=HYPERLINK(""http://evil.example"")"`),
    'CSV formula in provider must be neutralized with leading single quote'
  );
  assert.ok(
    maliciousCsv.includes(`"'+CMD|' /C calc'!A0"`),
    'CSV formula in model must be neutralized with leading single quote'
  );

  // 3b. GPX XML escaping + resilience against invalid timestamps
  const gpx = nostrMod.pointsToGpx(filtered.cleanPoints, 'samsung-test');
  assert.match(gpx, /<gpx /);
  assert.match(gpx, /<name>samsung-test<\/name>/);
  assert.equal((gpx.match(/<trkpt /g) || []).length, 3);

  const hostileGpx = nostrMod.pointsToGpx(
    [{ lat: -5.38, lng: 105.26, acc: 10, prv: 'gps"><script>', bat: 50, ts: NaN }],
    'hp"<script>alert(1)</script>'
  );
  assert.ok(!hostileGpx.includes('<script>'), 'GPX must escape XML tags');
  assert.ok(hostileGpx.includes('&lt;script&gt;'), 'GPX must contain escaped XML entities');

  // 4. Relay URL validation: enforce wss:// (block plaintext ws:// external, credentials, private/SSRF IPs, >8 relays)
  const parsedRelays = nostrMod.parseRelaysCsv(
    'wss://relay.damus.io,ws://evil.example.com,wss://192.168.1.10,wss://169.254.169.254,wss://user:pass@relay.bad.example,javascript:alert(1),ws://localhost:8080,wss://relay.damus.io/'
  );
  assert.deepEqual(
    parsedRelays,
    ['wss://relay.damus.io', 'ws://localhost:8080'],
    'parseRelaysCsv must block insecure external ws://, RFC1918/metadata IPs, URL credentials, non-WS schemes, and duplicates'
  );
  assert.equal(nostrMod.isValidPublicRelayUrl('wss://relay.damus.io'), true);
  assert.equal(nostrMod.isValidPublicRelayUrl('wss://10.0.0.5'), false);
  assert.equal(nostrMod.isValidPublicRelayUrl('ws://localhost:8080'), false);

  const parsedRegistry = communityMod.parseCommunityRelaysRegistry({
    version: 1,
    minQuorum: 2,
    relays: [
      { id: 'a', url: 'wss://relay.damus.io', name: 'Damus', location: 'Global', operator: 'Damus', isCore: true, status: 'active' },
      { id: 'bad-ssrf', url: 'wss://192.168.1.1', name: 'Bad', location: 'LAN', operator: 'Evil', isCore: false, status: 'active' },
      { id: 'b', url: 'wss://nos.lol', name: 'Nos', location: 'Global', operator: 'Nos', isCore: true, status: 'active' },
    ],
  });
  assert.equal(parsedRegistry.relays.length, 2, 'parseCommunityRelaysRegistry must drop private/SSRF relay entries');

  execFileSync('node', [path.join(rootDir, 'scripts/verify-relay.mjs')], { stdio: 'pipe' });

  const floodRelays = nostrMod.parseRelaysCsv(
    Array.from({ length: 20 }, (_, i) => `wss://relay${i}.example.com`).join(',')
  );
  assert.equal(floodRelays.length, 8, 'parseRelaysCsv must cap relay count to 8');

  // 5. Reject out-of-range coordinates & oversized ciphertexts in decryptNostrPayload
  const badCoordPt = { lat: 999, lng: 105.29, acc: 10, prv: 'gps', bat: 50, ts: 1_700_000_000_000 };
  const badCt = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesEncKey, enc.encode(JSON.stringify(badCoordPt)))
  );
  const badWire = `v1:${toB64Url(iv)}:${toB64Url(badCt)}`;
  assert.equal(
    await cryptoMod.decryptNostrPayload(dualA.v2.aesKey, badWire),
    null,
    'decryptNostrPayload must reject out-of-range coordinates'
  );
  assert.equal(
    await cryptoMod.decryptNostrPayload(dualA.v2.aesKey, 'v1:' + 'a'.repeat(5000) + ':b'),
    null,
    'decryptNostrPayload must reject oversized ciphertexts'
  );

  // 6. Client-side APK SHA-256 verifier & trusted APK URL allowlist
  const sampleBuf = new TextEncoder().encode('lacakhp-official-apk-test').buffer;
  const computedHex = await releaseMod.computeBufferSha256Hex(sampleBuf);
  assert.equal(computedHex.length, 64, 'SHA-256 hex must be 64 chars');
  assert.equal(releaseMod.verifyApkHash(computedHex, computedHex.toUpperCase()), true);
  assert.equal(releaseMod.verifyApkHash(computedHex, '0'.repeat(64)), false);
  assert.equal(releaseMod.verifyApkHash('not-a-hash', 'not-a-hash'), false);

  assert.equal(releaseMod.isTrustedApkUrl('/lacakhp-resmi.apk'), true);
  assert.equal(
    releaseMod.isTrustedApkUrl('https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk'),
    true
  );
  assert.equal(
    releaseMod.isTrustedApkUrl('https://github.com/evil/repo/releases/download/v2.6/lacakhp-resmi.apk'),
    false
  );
  assert.equal(
    releaseMod.isTrustedApkUrl('https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/../evil.apk'),
    false
  );
  assert.equal(
    releaseMod.getProvisioningApkUrl('/lacakhp-resmi.apk'),
    'https://lacakinhp110.my.id/lacakhp-resmi.apk'
  );
  assert.equal(
    releaseMod.getProvisioningApkUrl('https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk'),
    'https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk'
  );

  // 7. Official BIP-340 Schnorr Test Vectors + NIP-01 Event Anti-Tamper Verification
  const bip340Vec0Ok = await cryptoMod.verifySchnorrBip340(
    'E907831F80848D1069A5371B402410364BDF1C5F8307B0084C55F1CE2DCA821525F66A4A85EA8B71E482A74F382D2CE5EBEEE8FDB2172F477DF4900D310536C0',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9'
  );
  assert.equal(bip340Vec0Ok, true, 'Official BIP-340 test vector #0 must verify');

  const bip340Vec1Ok = await cryptoMod.verifySchnorrBip340(
    '6896BD60EEAE296DB48A229FF71DFE071BDE413E6D43F917DC8DCF8C78DE33418906D11AC976ABCCB20B091292BFF4EA897EFCB639EA871CFA95F6DE339E4B0A',
    '243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89',
    'DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659'
  );
  assert.equal(bip340Vec1Ok, true, 'Official BIP-340 test vector #1 must verify');

  const bip340TamperedSig = await cryptoMod.verifySchnorrBip340(
    '6896BD60EEAE296DB48A229FF71DFE071BDE413E6D43F917DC8DCF8C78DE33418906D11AC976ABCCB20B091292BFF4EA897EFCB639EA871CFA95F6DE339E4B0B',
    '243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89',
    'DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659'
  );
  assert.equal(bip340TamperedSig, false, 'Tampered BIP-340 signature must be rejected');

  // Sign a real NIP-01 Nostr event (matching Android CryptoHelper.createSignedNostrEvent) and test full envelope validation
  const secpMod = await import(pathToFileURL(path.join(rootDir, 'node_modules/@noble/secp256k1/index.js')).href);
  const sha256 = async (data) =>
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        typeof data === 'string' ? enc.encode(data) : data
      )
    );
  const taggedHash = async (tag, ...msgs) => {
    const th = await sha256(tag);
    return sha256(secpMod.etc.concatBytes(th, th, ...msgs));
  };
  const privBytes = master.slice(32, 64);
  const d0 = secpMod.etc.bytesToNumberBE(privBytes);
  const P = secpMod.Point.BASE.multiply(d0);
  const d = (P.y & 1n) === 0n ? d0 : secpMod.CURVE.n - d0;
  const pxBytes = secpMod.etc.numberToBytesBE(P.x);
  const pubHexLower = Buffer.from(pxBytes).toString('hex');
  assert.equal(pubHexLower, dualA.v2.pubHex, 'Derived x-only pubkey must match dualA.v2.pubHex');

  const evCreatedAt = 1700000000;
  const evKind = 30078;
  const evTags = [['d', 'lacakhp-latest']];
  const canonicalJson = JSON.stringify([0, pubHexLower, evCreatedAt, evKind, evTags, wire]);
  const idBytes = await sha256(canonicalJson);
  const idHex = Buffer.from(idBytes).toString('hex');

  // BIP-340 deterministic sign (auxRand = 0^32) for test event
  const auxHash = await taggedHash('BIP0340/aux', new Uint8Array(32));
  const dBytes = secpMod.etc.numberToBytesBE(d);
  const tXor = dBytes.map((b, i) => b ^ auxHash[i]);
  const randHash = await taggedHash('BIP0340/nonce', tXor, pxBytes, idBytes);
  const k0 = secpMod.etc.mod(secpMod.etc.bytesToNumberBE(randHash), secpMod.CURVE.n);
  const R = secpMod.Point.BASE.multiply(k0);
  const k = (R.y & 1n) === 0n ? k0 : secpMod.CURVE.n - k0;
  const rBytes = secpMod.etc.numberToBytesBE(R.x);
  const eHash = await taggedHash('BIP0340/challenge', rBytes, pxBytes, idBytes);
  const e = secpMod.etc.mod(secpMod.etc.bytesToNumberBE(eHash), secpMod.CURVE.n);
  const sBytes = secpMod.etc.numberToBytesBE(secpMod.etc.mod(k + e * d, secpMod.CURVE.n));
  const sigHex = Buffer.from(secpMod.etc.concatBytes(rBytes, sBytes)).toString('hex');

  const validEvent = {
    id: idHex,
    pubkey: pubHexLower,
    created_at: evCreatedAt,
    kind: evKind,
    tags: evTags,
    content: wire,
    sig: sigHex,
  };
  assert.equal(
    await cryptoMod.verifyNostrEventSignature(validEvent),
    true,
    'Authentic NIP-01 + BIP-340 Nostr event must pass verification'
  );
  assert.equal(
    await cryptoMod.verifyNostrEventSignature({ ...validEvent, created_at: evCreatedAt + 1 }),
    false,
    'Mutated created_at must fail NIP-01 SHA-256 commitment check'
  );
  assert.equal(
    await cryptoMod.verifyNostrEventSignature({ ...validEvent, tags: [['d', 'tampered']] }),
    false,
    'Mutated tags must fail NIP-01 SHA-256 commitment check'
  );
  const fakeIdBytes = await sha256(
    JSON.stringify([0, pubHexLower, evCreatedAt + 99, evKind, evTags, wire])
  );
  assert.equal(
    await cryptoMod.verifyNostrEventSignature({
      ...validEvent,
      created_at: evCreatedAt + 99,
      id: Buffer.from(fakeIdBytes).toString('hex'),
    }),
    false,
    'Recomputed ID without private key signature must fail BIP-340 Schnorr check'
  );

  // Offline QR Provisioning SVG & Android Base64URL signature checksum verification
  const certHex = 'E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48';
  const b64UrlSig = qrMod.hexSha256ToBase64UrlNoPad(certHex);
  assert.equal(b64UrlSig.length, 43, '32-byte SHA-256 Base64URL without padding must be 43 chars');
  assert.equal(
    Buffer.from(b64UrlSig, 'base64url').toString('hex').toUpperCase(),
    certHex.replace(/:/g, ''),
    'Base64URL checksum must round-trip byte-for-byte to certificate SHA-256'
  );
  const provJson = JSON.stringify({
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': 'com.lacakhp.app/.TrackerAdminReceiver',
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION': 'https://lacakinhp110.my.id/lacakhp-resmi.apk',
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM': b64UrlSig,
  });
  const qrMatrix = qrMod.encodeQrMatrix(provJson);
  assert.equal(qrMatrix.length, 65, '332-byte provisioning JSON must fit Version 12 (65x65) EC-L QR');
  assert.equal(qrMatrix[0][0], true, 'Top-left finder corner must be dark');
  assert.equal(qrMatrix[6][6], true, 'Finder center/timing intersection must be dark');
  assert.equal(qrMatrix[qrMatrix.length - 8][8], true, 'Dark module must be set');
  const svgOut = qrMod.buildQrSvgPath(qrMatrix, 4);
  assert.equal(svgOut.viewBoxSize, 73);
  assert.ok(svgOut.pathD.startsWith('M4,4h1v1h-1z'));

  console.log('✓ All tracker-web checks passed (crypto v1/v2 + AES-GCM + BIP-340 Schnorr NIP-01 + filterCoarseJumps + CSV/GPX + QR Provisioning + Web Security + APK Verifier)');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
