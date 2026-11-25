import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Radio,
  Blocks,
  Monitor,
  Lock,
  Zap,
  ExternalLink,
  Terminal,
  Activity,
} from 'lucide-react';

interface StageData {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  role: string;
  icon: React.ElementType;
  primaryColor: string; // Tailwind color token
  accentHex: string;
  glowHex: string;
  shortTag: string;
  specs: { label: string; value: string }[];
  terminalLog: string[];
  description: string;
}

const PIPELINE_STAGES: StageData[] = [
  {
    id: 'edge',
    number: '01',
    title: 'Edge Hardware (HP Target)',
    subtitle: 'Chip GPS Satelit & Kriptografi Lokal',
    role: 'Penguncian Satelit & Penandatanganan Data',
    icon: Smartphone,
    primaryColor: 'sky',
    accentHex: '#38bdf8',
    glowHex: 'rgba(56, 189, 248, 0.4)',
    shortTag: 'CHIP GPS • BIP-340',
    specs: [
      { label: 'Sensor', value: 'GNSS Satelit Fisik (Offline)' },
      { label: 'Enkripsi Payload', value: 'AES-256-GCM (12-byte IV)' },
      { label: 'Tanda Tangan', value: 'BIP-340 Schnorr (secp256k1)' },
      { label: 'Key Derivation', value: 'PBKDF2-HMAC-SHA256 (100k iters)' },
    ],
    terminalLog: [
      '> [GPS_LOCK] Satelit GNSS terkunci: 11 satelit • Akurasi 3.8m',
      '> [CRYPTO_CORE] Generate IV acak 96-bit via CSPRNG...',
      '> [AES-256-GCM] Mengenkripsi payload koordinat ke ciphertext v1...',
      '> [BIP-340] Menandatangani ID hash dengan kurva secp256k1: OK',
    ],
    description:
      'HP mengunci titik koordinat langsung dari satelit GPS di angkasa secara offline tanpa server. Data seketika dibungkus enkripsi militer AES-256-GCM dan ditandatangani Schnorr BIP-340 sebelum dipancarkan.',
  },
  {
    id: 'nostr',
    number: '02',
    title: 'Nostr Multi-Relay Mesh',
    subtitle: 'Jaringan Soket Terdesentralisasi Sedunia',
    role: 'Distribusi Paket P2P Tanpa Database Pusat',
    icon: Radio,
    primaryColor: 'emerald',
    accentHex: '#34d399',
    glowHex: 'rgba(52, 211, 153, 0.4)',
    shortTag: 'P2P MESH • 3 RELAYS',
    specs: [
      { label: 'Protokol Transmisi', value: 'WebSocket NIP-01 / NIP-33' },
      { label: 'Relay Primer', value: 'wss://damus.io • nos.lol' },
      { label: 'Relay Cadangan', value: 'wss://relay.primal.net • offchain.pub' },
      { label: 'Format Pesan', value: 'Nostr Event Kind 30078 / 3078' },
    ],
    terminalLog: [
      '> [SOCKET_INIT] Membuka koneksi WSS paralel ke 3 relay publik...',
      '> [BROADCAST] Mengirim ["EVENT", {kind:30078, pubkey:dbf7...}]',
      '> [RELAY_ACK] wss://relay.damus.io -> ["OK", event_id, true]',
      '> [RELAY_ACK] wss://nos.lol -> ["OK", event_id, true] (Quorum tercapai)',
    ],
    description:
      'Paket lokasi terenkripsi disebar serentak ke berbagai server relay sukarelawan di AS, Eropa, dan Asia. Tidak ada database terpusat yang bisa disita, diretas, atau dimatikan oleh otoritas mana pun.',
  },
  {
    id: 'ipfs',
    number: '03',
    title: 'Brankas Abadi IPFS',
    subtitle: 'InterPlanetary File System (Web3)',
    role: 'Penyimpanan Kode Web Permanen Anti-Hack',
    icon: Blocks,
    primaryColor: 'indigo',
    accentHex: '#818cf8',
    glowHex: 'rgba(129, 140, 248, 0.4)',
    shortTag: 'CID IPFS • ANTI-SITA',
    specs: [
      { label: 'Content ID (CID)', value: 'bafybeiedexeztfbfe2n6p7jidh...' },
      { label: 'Jaringan Hosting', value: 'P2P IPFS Network (4EVERLAND)' },
      { label: 'Integritas Kode', value: 'Immutable Cryptographic Hash' },
      { label: 'Ketahanan Domain', value: 'Kebal Phishing & Manipulasi Kode' },
    ],
    terminalLog: [
      '> [IPFS_GATEWAY] Resolving root CID bafybeiedexeztfbfe...',
      '> [MERKLE_DAG] Verifikasi kepingan SHA-256 aset HTML & JS: Cocok 100%',
      '> [IMMUTABILITY] Kode berstatus murni (tidak bisa dimodifikasi malware)',
      '> [PEER_ROUTING] Menyajikan antarmuka pelacak via node P2P terdekat',
    ],
    description:
      'Seluruh kode tampilan web LacakHP disimpan di ribuan node P2P IPFS dunia menggunakan kode hash matematis (CID). Kode bersifat permanen — tidak ada hacker yang bisa menyusupi malware ke dalam sistem.',
  },
  {
    id: 'viewer',
    number: '04',
    title: 'Layar Pemantau Keluarga',
    subtitle: 'Browser / Tablet / Laptop Terverifikasi',
    role: 'Dekripsi Nol-Pengetahuan (Zero-Knowledge)',
    icon: Monitor,
    primaryColor: 'amber',
    accentHex: '#fbbf24',
    glowHex: 'rgba(251, 191, 36, 0.4)',
    shortTag: 'RAM DECRYPT • PRIVATE',
    specs: [
      { label: 'Eksekusi Dekripsi', value: '100% Client-Side di RAM Browser' },
      { label: 'Kunci Rahasia', value: 'Kata Sandi Keluarga (Tidak Dikirim)' },
      { label: 'WebCrypto Engine', value: 'SubtleCrypto AES-GCM 256-bit' },
      { label: 'Anti-Shoulder-Surfing', value: 'Verifikasi Kredensial Layar HP' },
    ],
    terminalLog: [
      '> [CLIENT_SUB] Menerima ciphertext terenkripsi dari relay Nostr...',
      '> [VERIFY_SIG] Validasi tanda tangan BIP-340 Schnorr pengirim: SAH',
      '> [KEY_DERIVE] Membuka kunci via PBKDF2 dari kata sandi pemilik...',
      '> [SUCCESS] Dekripsi sukses di RAM: Lat -6.2088 • Lng 106.8456 (Peta Terbuka)',
    ],
    description:
      'Browser keluarga menarik ciphertext acak dari relay dan mendekripsinya secara instan hanya di dalam memori RAM komputer/HP Anda. Server mana pun di internet hanya melihat deretan angka acak tanpa arti.',
  },
];

export const Web3SovereignMeshAnimation: React.FC = () => {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Smooth automatic pipeline progression
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const activeStage = PIPELINE_STAGES[activeStageIndex];

  return (
    <section className="relative rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-2xl">
      {/* Subtle Blueprint Ambient Glows */}
      <div
        className="absolute -top-32 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 opacity-20"
        style={{ backgroundColor: activeStage.accentHex }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Header & Architecture Control Bar */}
      <div className="relative z-10 px-5 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-500"
            style={{
              backgroundColor: `${activeStage.accentHex}15`,
              borderColor: `${activeStage.accentHex}40`,
              color: activeStage.accentHex,
            }}
          >
            <Zap className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                Topologi Jaringan Berdaulat (Sovereign Web3 Pipeline)
              </h3>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[0.625rem] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                ● Live Topology
              </span>
            </div>
            <p className="text-[0.6875rem] sm:text-xs text-slate-400">
              Alur data terenkripsi ujung-ke-ujung dari satelit luar angkasa ke relay global &amp; IPFS
            </p>
          </div>
        </div>

        {/* Playback Controls & Stage Counter */}
        <div className="flex items-center gap-2">
          <div className="text-[0.6875rem] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            TAHAP <span className="text-slate-100 font-bold">{activeStage.number}</span> / 04
          </div>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition cursor-pointer flex items-center gap-1.5"
            aria-label={isPlaying ? 'Jeda Simulasi Alur' : 'Putar Simulasi Alur'}
          >
            <Activity className="w-3 h-3 text-sky-400" />
            <span>{isPlaying ? 'Jeda Alur' : 'Putar Alur'}</span>
          </button>
        </div>
      </div>

      {/* Bespoke Interactive SVG Circuit Topology Canvas */}
      <div className="relative z-10 px-4 pt-4 sm:px-6">
        <div className="w-full relative rounded-xl bg-slate-900/60 border border-slate-800/80 p-3 sm:p-5 overflow-hidden">
          {/* Responsive SVG Schematic */}
          <svg
            viewBox="0 0 800 160"
            className="w-full h-auto max-h-[170px] select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Dynamic Gradients */}
              <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="35%" stopColor="#34d399" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
              </linearGradient>

              {/* Glowing Laser Filter */}
              <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Circuit Interconnect Buses (Angled Traces) */}
            <path
              d="M 100 80 L 260 80 L 300 80 L 460 80 L 500 80 L 660 80 L 700 80"
              stroke="#334155"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 4"
            />
            <path
              d="M 100 80 L 260 80 L 300 80 L 460 80 L 500 80 L 660 80 L 700 80"
              stroke="url(#traceGrad)"
              strokeWidth="2.5"
              fill="none"
              opacity="0.85"
            />

            {/* Flowing Laser Packet Pulses along Conduit */}
            <motion.circle
              r="4.5"
              fill="#38bdf8"
              filter="url(#laserGlow)"
              animate={{
                cx: [100, 300, 500, 700],
                opacity: [0.2, 1, 1, 0.2],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.6,
                ease: 'easeInOut',
              }}
              cy="80"
            />
            <motion.circle
              r="3.5"
              fill="#34d399"
              filter="url(#laserGlow)"
              animate={{
                cx: [100, 300, 500, 700],
                opacity: [0.1, 0.9, 0.9, 0.1],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.6,
                delay: 1.8,
                ease: 'easeInOut',
              }}
              cy="80"
            />

            {/* 4 Interactive Schematic Nodes */}
            {[
              { idx: 0, x: 100, label: '01. EDGE HP', sub: 'GPS + BIP-340' },
              { idx: 1, x: 300, label: '02. NOSTR', sub: 'P2P Relays' },
              { idx: 2, x: 500, label: '03. IPFS', sub: 'CID Immutability' },
              { idx: 3, x: 700, label: '04. PEMANTAU', sub: 'RAM Decrypt' },
            ].map(({ idx, x, label, sub }) => {
              const isSelected = activeStageIndex === idx;
              const nodeData = PIPELINE_STAGES[idx];

              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => {
                    setActiveStageIndex(idx);
                    setIsPlaying(false);
                  }}
                >
                  {/* Outer Pulsing Halo when active */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy="80"
                      r="36"
                      fill={nodeData.accentHex}
                      opacity="0.15"
                      className="animate-pulse"
                    />
                  )}

                  {/* Primary Node Outer Ring */}
                  <circle
                    cx={x}
                    cy="80"
                    r={isSelected ? 26 : 22}
                    fill="#090d16"
                    stroke={isSelected ? nodeData.accentHex : '#475569'}
                    strokeWidth={isSelected ? '3' : '1.5'}
                    className="transition-all duration-300"
                  />

                  {/* Inner Core Light */}
                  <circle
                    cx={x}
                    cy="80"
                    r={isSelected ? 9 : 6}
                    fill={isSelected ? nodeData.accentHex : '#64748b'}
                    className="transition-all duration-300"
                  />

                  {/* Node Label Text */}
                  <text
                    x={x}
                    y="126"
                    textAnchor="middle"
                    fill={isSelected ? '#f8fafc' : '#94a3b8'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {label}
                  </text>
                  <text
                    x={x}
                    y="142"
                    textAnchor="middle"
                    fill={isSelected ? nodeData.accentHex : '#64748b'}
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {sub}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Stage Selector Pills (Touch & Mobile Friendly) */}
      <div className="relative z-10 px-4 sm:px-6 pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isSelected = activeStageIndex === idx;
            const Icon = stage.icon;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setActiveStageIndex(idx);
                  setIsPlaying(false);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900/90 border-slate-700 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700'
                }`}
                style={{
                  borderColor: isSelected ? stage.accentHex : undefined,
                }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="pillBar"
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: stage.accentHex }}
                  />
                )}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[0.625rem] font-mono font-bold text-slate-400">
                    STAGE {stage.number}
                  </span>
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: isSelected ? stage.accentHex : '#64748b' }}
                  />
                </div>
                <div className="text-xs font-bold text-slate-100 truncate">
                  {stage.title}
                </div>
                <div className="text-[0.6875rem] font-mono truncate text-slate-400 mt-0.5">
                  {stage.shortTag}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deep-Dive Stage Inspector & Live Terminal Stream */}
      <div className="relative z-10 p-4 sm:p-6 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4"
          >
            {/* Left: Architecture Specifications (7 cols) */}
            <div className="lg:col-span-7 rounded-xl bg-slate-900/80 border border-slate-800/90 p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center border"
                    style={{
                      backgroundColor: `${activeStage.accentHex}15`,
                      borderColor: `${activeStage.accentHex}40`,
                      color: activeStage.accentHex,
                    }}
                  >
                    <activeStage.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100 leading-none">
                      {activeStage.title}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {activeStage.subtitle}
                    </span>
                  </div>
                </div>

                <span
                  className="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-mono border"
                  style={{
                    backgroundColor: `${activeStage.accentHex}15`,
                    borderColor: `${activeStage.accentHex}30`,
                    color: activeStage.accentHex,
                  }}
                >
                  {activeStage.role}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {activeStage.description}
              </p>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-mono">
                {activeStage.specs.map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 space-y-0.5"
                  >
                    <span className="text-[0.6875rem] text-slate-400 block">
                      {item.label}
                    </span>
                    <span className="text-slate-100 font-semibold text-xs truncate block">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {activeStage.id === 'ipfs' && (
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Mirror IPFS Publik Aktif:
                  </span>
                  <a
                    href="https://lacakinhp-79so.ipfs.4everland.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-semibold transition"
                  >
                    <span>Buka Portal IPFS Live</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Right: Real-Time Telemetry Terminal (5 cols) */}
            <div className="lg:col-span-5 rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs flex flex-col justify-between shadow-inner space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[0.6875rem]">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SOVEREIGN_TELEMETRY.log</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </div>

                <div className="space-y-2 text-[0.75rem] leading-relaxed">
                  {activeStage.terminalLog.map((line, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.18 }}
                      className={
                        idx === activeStage.terminalLog.length - 1
                          ? 'text-emerald-300 font-bold'
                          : 'text-slate-300'
                      }
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Cryptographic Assurance Stamp */}
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[0.6875rem] text-slate-400">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Jaminan Kedaulatan Data</span>
                </span>
                <span className="text-emerald-400 font-bold">100% P2P SECURED</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
