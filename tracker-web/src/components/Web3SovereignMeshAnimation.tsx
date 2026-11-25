import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockTxSlice {
  id: string;
  name: string;
  bytes: number;
  color: string;
  detail: string;
  hexPreview: string;
}

interface CryptoBlock {
  height: number;
  type: 'LATEST_HEARTBEAT' | 'HISTORY_EVENT' | 'IPFS_DAG_PIN';
  kind: number;
  timestamp: string;
  parentHash: string;
  blockHash: string;
  schnorrSig: string;
  ipfsCid: string;
  relayAcks: string[];
  payloadSize: string;
  txSlices: BlockTxSlice[];
  rawNostrEnvelope: {
    id: string;
    pubkey: string;
    kind: number;
    created_at: number;
    tags: string[][];
    content: string;
    sig: string;
  };
}

const INITIAL_BLOCKS: CryptoBlock[] = [
  {
    height: 1082,
    type: 'HISTORY_EVENT',
    kind: 3078,
    timestamp: '2026-11-25 21:55:12 UTC',
    parentHash: '0000a39f1c7d884e1b2f90a887b4e99c1d0f5e7a892b11e2f3890c4d871a2b3c',
    blockHash: '0000c8f12a9e4b771f280a9c8b71d49e6f3a180d55e4e8a1b2c3d4e5f6071829',
    schnorrSig: '6896bd60eeae296db48a229ff71dfe071bde413e6d43f917dc8dcf8c78de33418f4a7c8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60',
    ipfsCid: 'bafybeiedexeztfbfe2n6p7jidhkls7tsw3flkvd6wjtvs4mxv56rlakbk4',
    relayAcks: ['wss://relay.damus.io', 'wss://nos.lol'],
    payloadSize: '248 B',
    txSlices: [
      { id: 'gps', name: 'GPS_LAT_LNG_CIPHER', bytes: 72, color: '#38bdf8', detail: 'AES-256-GCM iv=a7x9c1.. tag=9b42.. (Latitude & Longitude Terenkripsi)', hexPreview: 'a7x9c14d88e20f1b29a8c43e' },
      { id: 'sig', name: 'BIP340_SCHNORR_SIG', bytes: 64, color: '#34d399', detail: 'Kurva Secp256k1 auxRand=0^32 (Tanda Tangan Kriptografi HP)', hexPreview: '6896bd60eeae296db48a229f' },
      { id: 'meta', name: 'BATTERY_ACCURACY', bytes: 38, color: '#818cf8', detail: 'Status Daya: 88% • Akurasi Satelit: 3.8m • Provider: GPS GNSS', hexPreview: '5842415438382c414343332e' },
      { id: 'tag', name: 'NOSTR_NIP01_TAGS', bytes: 74, color: '#f59e0b', detail: 'NIP-01 Protocol Header [["t","lacakhp"], ["h","1082"]]', hexPreview: '5b5b2274222c226c6163616b' },
    ],
    rawNostrEnvelope: {
      id: '0000c8f12a9e4b771f280a9c8b71d49e6f3a180d55e4e8a1b2c3d4e5f6071829',
      pubkey: 'dbf7f7a0c351830594c75e532bae3cc3626e2dc2a39dad1819825a775f6b3f5f',
      kind: 3078,
      created_at: 1795617312,
      tags: [['t', 'lacakhp'], ['h', '1082']],
      content: 'v1:a7x9c14d88e20f:Mjk4N2FmOGMzMGEwODky...',
      sig: '6896bd60eeae296db48a229ff71dfe071bde413e6d43f917dc8dcf8c78de33418f4a7c8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60',
    },
  },
  {
    height: 1083,
    type: 'HISTORY_EVENT',
    kind: 3078,
    timestamp: '2026-11-25 22:05:40 UTC',
    parentHash: '0000c8f12a9e4b771f280a9c8b71d49e6f3a180d55e4e8a1b2c3d4e5f6071829',
    blockHash: '00007d4b9a11e2f3890c4d871a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f901a',
    schnorrSig: 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d8877665544332211aabbccddeeff00112233445566778899aabbccddeeff0011',
    ipfsCid: 'bafybeiedexeztfbfe2n6p7jidhkls7tsw3flkvd6wjtvs4mxv56rlakbk4',
    relayAcks: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'],
    payloadSize: '256 B',
    txSlices: [
      { id: 'gps', name: 'GPS_LAT_LNG_CIPHER', bytes: 76, color: '#38bdf8', detail: 'AES-256-GCM delta=24m displacement (Pergerakan Terdeteksi)', hexPreview: 'b28f9910c2738a19230198de' },
      { id: 'sig', name: 'BIP340_SCHNORR_SIG', bytes: 64, color: '#34d399', detail: 'Verifikasi Kurva Elips secp256k1: LULUS (Authentic HP Hardware)', hexPreview: 'a1b2c3d4e5f60718293a4b5c' },
      { id: 'meta', name: 'MOTION_SENSOR_DATA', bytes: 42, color: '#818cf8', detail: 'Akselerometer: Significant Motion Validated • Speed: 1.2 m/s', hexPreview: '4d4f54494f4e5f56414c4944' },
      { id: 'tag', name: 'NOSTR_NIP01_TAGS', bytes: 74, color: '#f59e0b', detail: 'NIP-01 Protocol Header [["t","lacakhp"], ["seq","83"]]', hexPreview: '5b5b2274222c226c6163616b' },
    ],
    rawNostrEnvelope: {
      id: '00007d4b9a11e2f3890c4d871a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f901a',
      pubkey: 'dbf7f7a0c351830594c75e532bae3cc3626e2dc2a39dad1819825a775f6b3f5f',
      kind: 3078,
      created_at: 1795617940,
      tags: [['t', 'lacakhp'], ['seq', '83'], ['h', '1083']],
      content: 'v1:c810b42f710a:T3B0aW1pemVkR1BTTW90...',
      sig: 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d8877665544332211aabbccddeeff00112233445566778899aabbccddeeff0011',
    },
  },
  {
    height: 1084,
    type: 'LATEST_HEARTBEAT',
    kind: 30078,
    timestamp: '2026-11-25 22:15:18 UTC',
    parentHash: '00007d4b9a11e2f3890c4d871a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f901a',
    blockHash: '00001f89bc44d7102e3a5f9c0b1a2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
    schnorrSig: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    ipfsCid: 'bafybeiedexeztfbfe2n6p7jidhkls7tsw3flkvd6wjtvs4mxv56rlakbk4',
    relayAcks: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://offchain.pub'],
    payloadSize: '284 B',
    txSlices: [
      { id: 'gps', name: 'LATEST_E2EE_POINT', bytes: 84, color: '#38bdf8', detail: 'Replaceable Kind 30078 d=lacakhp-latest (Titik GPS Realtime Terkini)', hexPreview: '1f89bc44d7102e3a5f9c0b1a' },
      { id: 'sig', name: 'BIP340_SCHNORR_SIG', bytes: 64, color: '#34d399', detail: 'BIP-340 X-Only 32-byte Schnorr Signature Valid', hexPreview: '9f8e7d6c5b4a3f2e1d0c9b8a' },
      { id: 'ipfs', name: 'IPFS_MERKLE_CID', bytes: 62, color: '#818cf8', detail: 'P2P Web Mirror Root CID: bafybeiedexe... (4EVERLAND Node Pin)', hexPreview: '626166796265696564657865' },
      { id: 'tag', name: 'PARAM_TAGS_D', bytes: 74, color: '#f59e0b', detail: 'Nostr Parameterized Replaceable Tag [["d", "lacakhp-latest"]]', hexPreview: '5b5b2264222c226c6163616b' },
    ],
    rawNostrEnvelope: {
      id: '00001f89bc44d7102e3a5f9c0b1a2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
      pubkey: 'dbf7f7a0c351830594c75e532bae3cc3626e2dc2a39dad1819825a775f6b3f5f',
      kind: 30078,
      created_at: 1795618518,
      tags: [['d', 'lacakhp-latest'], ['h', '1084']],
      content: 'v1:e2eePayloadNonceB64:SealedCiphertextBytesB64==',
      sig: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
  },
];

export const Web3SovereignMeshAnimation: React.FC = () => {
  const [blocks, setBlocks] = useState<CryptoBlock[]>(INITIAL_BLOCKS);
  const [selectedBlock, setSelectedBlock] = useState<CryptoBlock>(INITIAL_BLOCKS[2]);
  const [selectedSlice, setSelectedSlice] = useState<BlockTxSlice | null>(INITIAL_BLOCKS[2].txSlices[0]);
  const [isLiveMining, setIsLiveMining] = useState<boolean>(true);
  const [pendingTxProgress, setPendingTxProgress] = useState<number>(45);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'treemap' | 'nostr' | 'verify'>('treemap');

  // Trigger mining/sealing a block
  const sealNewBlock = () => {
    setBlocks((prev) => {
      const last = prev[prev.length - 1];
      const newHeight = last.height + 1;
      const newParent = last.blockHash;
      const randHex = Math.random().toString(16).slice(2, 10);
      const fullRandHex = Array.from({ length: 7 }, () => Math.random().toString(16).slice(2, 10)).join('');
      const newBlockHash = `0000${randHex}${fullRandHex.slice(0, 52)}`;
      const newSig = Array.from({ length: 16 }, () => Math.random().toString(16).slice(2, 10)).join('').slice(0, 128);

      const isLiveKind = newHeight % 2 === 0;
      const newBlock: CryptoBlock = {
        height: newHeight,
        type: isLiveKind ? 'LATEST_HEARTBEAT' : 'HISTORY_EVENT',
        kind: isLiveKind ? 30078 : 3078,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        parentHash: newParent,
        blockHash: newBlockHash,
        schnorrSig: newSig,
        ipfsCid: 'bafybeiedexeztfbfe2n6p7jidhkls7tsw3flkvd6wjtvs4mxv56rlakbk4',
        relayAcks: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'],
        payloadSize: `${240 + Math.floor(Math.random() * 45)} B`,
        txSlices: [
          {
            id: 'gps',
            name: isLiveKind ? 'LATEST_E2EE_POINT' : 'GPS_LAT_LNG_CIPHER',
            bytes: 78 + Math.floor(Math.random() * 8),
            color: '#38bdf8',
            detail: `AES-256-GCM paket #${newHeight} (${isLiveKind ? 'Kind:30078 Titik Terkini' : 'Kind:3078 Riwayat Jejak'})`,
            hexPreview: newBlockHash.slice(4, 28),
          },
          {
            id: 'sig',
            name: 'BIP340_SCHNORR_SIG',
            bytes: 64,
            color: '#34d399',
            detail: `BIP-340 secp256k1 validasi kriptografis perangkat mandiri`,
            hexPreview: newSig.slice(0, 24),
          },
          {
            id: 'ipfs',
            name: 'IPFS_MERKLE_CID',
            bytes: 58,
            color: '#818cf8',
            detail: `P2P Merkle DAG Pin di IPFS Swarm (CID: bafybeiedexe...)`,
            hexPreview: '626166796265696564657865',
          },
          {
            id: 'tag',
            name: isLiveKind ? 'PARAM_TAGS_D' : 'NOSTR_NIP01_TAGS',
            bytes: 72,
            color: '#f59e0b',
            detail: `Relay Consensus Quorum (3/3 relays acknowledged)`,
            hexPreview: '5b5b2274222c226c6163616b',
          },
        ],
        rawNostrEnvelope: {
          id: newBlockHash,
          pubkey: 'dbf7f7a0c351830594c75e532bae3cc3626e2dc2a39dad1819825a775f6b3f5f',
          kind: isLiveKind ? 30078 : 3078,
          created_at: Math.floor(Date.now() / 1000),
          tags: isLiveKind ? [['d', 'lacakhp-latest'], ['h', String(newHeight)]] : [['t', 'lacakhp'], ['h', String(newHeight)]],
          content: `v1:iv${randHex}==:ctEncryptedGpsCoordCoordinates==`,
          sig: newSig,
        },
      };

      setSelectedBlock(newBlock);
      setSelectedSlice(newBlock.txSlices[0]);
      return [...prev.slice(1), newBlock];
    });
    setPendingTxProgress(0);
  };

  // Simulated live blockchain progression
  useEffect(() => {
    if (!isLiveMining) return;
    const progressInterval = setInterval(() => {
      setPendingTxProgress((p) => {
        if (p >= 100) {
          sealNewBlock();
          return 0;
        }
        return p + 20;
      });
    }, 1200);

    return () => clearInterval(progressInterval);
  }, [isLiveMining]);

  return (
    <section className="rounded-2xl bg-[#080b12] border border-slate-800 font-mono text-slate-200 overflow-hidden shadow-2xl relative">
      {/* Top Telemetry Header Bar (Mempool & Blockchain Explorer Style) */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#0f1422] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="font-bold text-slate-100 tracking-wider">
              MEMPOOL &amp; CRYPTOGRAPHIC BLOCKSTREAM
            </span>
          </div>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-slate-400 text-[0.6875rem]">
            NOSTR NIP-01 • BIP-340 SCHNORR • IPFS DAG
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={sealNewBlock}
            className="px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-[0.6875rem] font-semibold text-sky-300 transition cursor-pointer"
            title="Kunci data GPS terkini menjadi blok rantai baru"
          >
            + KUNCI BLOK BARU
          </button>
          <button
            type="button"
            onClick={() => setIsLiveMining((v) => !v)}
            className="px-2.5 py-1 rounded bg-[#182033] hover:bg-[#202b44] border border-slate-700 text-[0.6875rem] text-slate-300 transition cursor-pointer"
          >
            {isLiveMining ? 'PAUSE STREAM' : 'RESUME STREAM'}
          </button>
          <div className="text-emerald-400 text-[0.6875rem] bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded font-bold">
            HEIGHT: #{blocks[blocks.length - 1].height}
          </div>
        </div>
      </div>

      {/* Network Metrics Sub-strip */}
      <div className="px-4 sm:px-6 py-2 bg-[#0a0d16] border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[0.6875rem] text-slate-400">
        <div>
          <span className="text-slate-500">KONSENSUS:</span>{' '}
          <span className="text-emerald-400 font-semibold">ZERO-SERVER P2P</span>
        </div>
        <div>
          <span className="text-slate-500">NOSTR RELAYS:</span>{' '}
          <span className="text-sky-300 font-semibold">3/3 ACTIVE QUORUM</span>
        </div>
        <div>
          <span className="text-slate-500">SIG KURVA:</span>{' '}
          <span className="text-slate-200 font-semibold">secp256k1 (BIP-340)</span>
        </div>
        <div className="text-right sm:text-left">
          <span className="text-slate-500">IPFS MERKLE:</span>{' '}
          <span className="text-indigo-400 font-semibold">CID-v1 PINNED</span>
        </div>
      </div>

      {/* Main Horizontal Blockchain Conveyor */}
      <div className="p-4 sm:p-6 overflow-x-auto select-none">
        <div className="flex items-stretch gap-2.5 min-w-[760px] pb-2">
          {/* Confirmed Chained Blocks */}
          <AnimatePresence mode="popLayout">
            {blocks.map((b, i) => {
              const isSelected = selectedBlock.height === b.height;
              return (
                <React.Fragment key={b.height}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: 40, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -40, scale: 0.9 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    onClick={() => {
                      setSelectedBlock(b);
                      setSelectedSlice(b.txSlices[0]);
                    }}
                    className={`flex-1 min-w-[190px] rounded-xl p-3.5 transition-all cursor-pointer border relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#151c2d] border-sky-400/90 shadow-[0_0_24px_rgba(56,189,248,0.22)]'
                        : 'bg-[#0f1422] border-slate-800 hover:border-slate-700 hover:bg-[#131a2b]'
                    }`}
                  >
                    {/* Block Header */}
                    <div>
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80 mb-2.5">
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="text-sky-400">#{b.height}</span>
                            <span className="text-[0.625rem] text-slate-400 font-normal">
                              {b.kind === 30078 ? 'KIND:30078 (LIVE)' : 'KIND:3078 (HIST)'}
                            </span>
                          </div>
                          <div className="text-[0.5625rem] text-slate-500 truncate max-w-[130px] pt-0.5">
                            {b.timestamp}
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[0.625rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                          SEALED
                        </span>
                      </div>

                      {/* Mempool.space Style Proportional Tx Treemap Rectangles */}
                      <div className="w-full h-20 bg-[#06080e] rounded-lg border border-slate-800/80 p-1 mb-2.5 grid grid-cols-2 gap-1 overflow-hidden">
                        {b.txSlices.map((slice) => {
                          const isSliceActive = selectedSlice?.id === slice.id && isSelected;
                          return (
                            <div
                              key={slice.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBlock(b);
                                setSelectedSlice(slice);
                              }}
                              className={`rounded p-1 flex flex-col justify-between transition-all border cursor-pointer ${
                                isSliceActive
                                  ? 'border-white brightness-125 ring-1 ring-white/80'
                                  : 'border-transparent hover:border-white/40 opacity-90'
                              }`}
                              style={{ backgroundColor: `${slice.color}20` }}
                              title={`${slice.name} (${slice.bytes} bytes)`}
                            >
                              <div
                                className="text-[0.625rem] font-bold truncate leading-none"
                                style={{ color: slice.color }}
                              >
                                {slice.name.split('_')[0]}
                              </div>
                              <div className="text-[0.5625rem] text-slate-400 leading-none">
                                {slice.bytes}B
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Block Hash Footers */}
                    <div className="space-y-1 text-[0.625rem] text-slate-400 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">HASH:</span>
                        <span className="text-slate-300 font-mono">
                          {b.blockHash.slice(0, 10)}...
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">BIP-340:</span>
                        <span className="text-emerald-400 font-semibold">PASS ✓</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Cryptographic Hash Pointer Link Connector */}
                  {i < blocks.length - 1 && (
                    <div className="flex flex-col items-center justify-center text-slate-600 px-0.5 self-center">
                      <span className="text-[0.5625rem] text-sky-400 font-mono tracking-tighter">
                        SHA256
                      </span>
                      <div className="w-6 h-0.5 bg-gradient-to-r from-sky-400 to-emerald-400 relative my-1">
                        <motion.div
                          animate={{ x: [0, 20, 0] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                          className="absolute -top-1 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_6px_#34d399]"
                        />
                      </div>
                      <span className="text-[0.5625rem] text-slate-500">POINTER</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </AnimatePresence>

          {/* Pending Mempool Block (Assembling real-time data bytes) */}
          <div className="flex flex-col items-center justify-center text-slate-600 px-0.5 self-center">
            <span className="text-[0.5625rem] text-amber-400 font-mono">MEMPOOL</span>
            <div className="w-6 h-0.5 bg-dashed border-t border-amber-500/60 my-1" />
            <span className="text-[0.5625rem] text-amber-500 font-bold animate-pulse">MINING</span>
          </div>

          <div className="w-[200px] min-w-[200px] rounded-xl p-3.5 border border-dashed border-amber-500/50 bg-[#12151f] flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80 mb-2">
                <span className="font-bold text-amber-400">
                  #{blocks[blocks.length - 1].height + 1}
                </span>
                <span className="text-[0.625rem] text-amber-300 font-mono font-bold animate-pulse">
                  ASSEMBLING...
                </span>
              </div>
              <div className="text-[0.6875rem] text-slate-400 space-y-1">
                <div className="truncate text-slate-300">› Lock Satelit GNSS: Terkunci</div>
                <div className="truncate text-slate-400">› CSPRNG: Generate IV 96-bit</div>
                <div className="truncate text-slate-400">› AES-256-GCM: Segel Payload</div>
                <div className="truncate text-amber-300/90">› Schnorr BIP-340: Sign secp256k1</div>
              </div>
            </div>

            {/* Block Assembly Progress Bar */}
            <div className="space-y-1 pt-3">
              <div className="flex justify-between text-[0.625rem] text-slate-400">
                <span>Buffer Enkripsi</span>
                <span className="text-amber-400 font-bold">{pendingTxProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400"
                  style={{ width: `${pendingTxProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Block Cryptographic Verification Drawer (Terminal / Mempool Inspector) */}
      <div className="p-4 sm:p-6 pt-0">
        <div className="rounded-xl bg-[#06080e] border border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">INSPEKSI BLOK:</span>
              <span className="text-sm font-bold text-sky-400">
                BLOCK #{selectedBlock.height} ({selectedBlock.type})
              </span>
              <span className="text-[0.6875rem] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                UKURAN: {selectedBlock.payloadSize}
              </span>
            </div>

            {/* Inspector Tab Buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('treemap')}
                className={`px-2.5 py-1 rounded transition text-[0.6875rem] font-semibold cursor-pointer ${
                  activeInspectorTab === 'treemap'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-[#101422] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                PAYLOAD SLICES
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('nostr')}
                className={`px-2.5 py-1 rounded transition text-[0.6875rem] font-semibold cursor-pointer ${
                  activeInspectorTab === 'nostr'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-[#101422] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                RAW NOSTR EVENT
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('verify')}
                className={`px-2.5 py-1 rounded transition text-[0.6875rem] font-semibold cursor-pointer ${
                  activeInspectorTab === 'verify'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-[#101422] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                BUKTI KRIPTOGRAFI
              </button>
            </div>
          </div>

          {/* Cryptographic Link Continuity Strip */}
          <div className="p-2.5 rounded-lg bg-[#0c101b] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[0.6875rem]">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-500">PARENT HASH:</span>
              <span className="text-slate-300 font-mono truncate max-w-[280px]">
                {selectedBlock.parentHash}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">RANTAI:</span>
              <span className="text-emerald-400 font-bold">
                ✓ CONTINUOUS LEDGER MATCH
              </span>
            </div>
          </div>

          {/* Tab Content Display */}
          {activeInspectorTab === 'treemap' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Treemap Slices Inspector */}
              <div className="lg:col-span-5 space-y-2">
                <div className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider">
                  Struktur Data Kriptografis (Payload Slices)
                </div>
                <div className="space-y-1.5">
                  {selectedBlock.txSlices.map((slice) => {
                    const isActive = selectedSlice?.id === slice.id;
                    return (
                      <div
                        key={slice.id}
                        onClick={() => setSelectedSlice(slice)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                          isActive
                            ? 'bg-[#151c2d] border-sky-400'
                            : 'bg-[#0c101b] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="font-bold text-slate-200">
                            {slice.name}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono">
                          {slice.bytes} Bytes
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedSlice && (
                  <div className="p-3 rounded-lg bg-[#0c101b] border border-slate-800 text-xs space-y-1.5">
                    <div className="text-[0.625rem] text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>Detail Slice: {selectedSlice.name}</span>
                      <span className="text-sky-400 font-mono">{selectedSlice.bytes}B</span>
                    </div>
                    <div className="text-slate-200 text-[0.6875rem]">
                      {selectedSlice.detail}
                    </div>
                    <div className="text-[0.625rem] text-slate-500 font-mono truncate">
                      HEX PREVIEW: 0x{selectedSlice.hexPreview}...
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Technical Specs & Merkle Node Proofs */}
              <div className="lg:col-span-7 space-y-3">
                <div className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider">
                  Verifikasi Kedaulatan Data &amp; Multi-Relay Quorum
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-[#0c101b] border border-slate-800 space-y-1">
                    <span className="text-[0.625rem] text-slate-500 block">MULTI-RELAY ACKNOWLEDGEMENT:</span>
                    <div className="space-y-1 text-[0.6875rem]">
                      {selectedBlock.relayAcks.map((relay, idx) => (
                        <div key={idx} className="text-emerald-400 flex items-center gap-1.5 font-mono">
                          <span>✓</span>
                          <span className="text-slate-300">{relay}</span>
                          <span className="text-emerald-400 text-[0.5625rem]">[OK]</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0c101b] border border-slate-800 space-y-1">
                    <span className="text-[0.625rem] text-slate-500 block">DESENTRALISASI HOSTING IPFS:</span>
                    <div className="text-indigo-400 font-mono text-[0.6875rem] break-all">
                      CID: {selectedBlock.ipfsCid}
                    </div>
                    <a
                      href="https://lacakinhp-79so.ipfs.4everland.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-[0.625rem] text-indigo-300 hover:text-indigo-200 font-bold underline"
                    >
                      Buka Web Mirror di IPFS Swarm →
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0c101b] border border-slate-800 space-y-1 font-mono text-[0.6875rem]">
                  <div className="text-slate-500 text-[0.625rem]">BIP-340 SCHNORR SIGNATURE HASH:</div>
                  <div className="text-slate-300 break-all">{selectedBlock.schnorrSig}</div>
                </div>
              </div>
            </div>
          )}

          {activeInspectorTab === 'nostr' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider">
                  Raw Nostr Event JSON Envelope (NIP-01 / NIP-33 / BIP-340)
                </span>
                <span className="text-[0.625rem] text-emerald-400 font-bold">
                  ✓ SIGNATURE SECP256K1 VERIFIED
                </span>
              </div>
              <div className="bg-[#030408] border border-slate-800 rounded-lg p-3 text-[0.6875rem] font-mono text-slate-300 overflow-x-auto max-h-[220px]">
                <pre>{JSON.stringify(selectedBlock.rawNostrEnvelope, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeInspectorTab === 'verify' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider">
                Audit Kriptografis Independen (Zero-Knowledge Audit)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-[#0c101b] border border-emerald-900/60 space-y-1">
                  <div className="text-emerald-400 text-xs font-bold">1. Keabsahan Tanda Tangan</div>
                  <div className="text-[0.6875rem] text-slate-300">
                    BIP-340 Schnorr 64-byte signature valid di atas kurva secp256k1 milik HP target.
                  </div>
                  <span className="text-[0.625rem] text-emerald-400 font-bold">STATUS: VALID</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0c101b] border border-sky-900/60 space-y-1">
                  <div className="text-sky-400 text-xs font-bold">2. Enkripsi End-to-End</div>
                  <div className="text-[0.6875rem] text-slate-300">
                    Kunci AES-256 diturunkan via PBKDF2 (100.000 iterasi) hanya di memori browser pelacak.
                  </div>
                  <span className="text-[0.625rem] text-sky-400 font-bold">STATUS: ZERO-LEAK</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0c101b] border border-indigo-900/60 space-y-1">
                  <div className="text-indigo-400 text-xs font-bold">3. Ketahanan Sensor IPFS</div>
                  <div className="text-[0.6875rem] text-slate-300">
                    Aplikasi web tersemat di jutaan node IPFS terdesentralisasi global tanpa ketergantungan DNS.
                  </div>
                  <span className="text-[0.625rem] text-indigo-400 font-bold">STATUS: IMMUTABLE</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
