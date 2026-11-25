import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Radio,
  Blocks,
  Monitor,
  ShieldCheck,
  Lock,
  ArrowRight,
  Zap,
  Globe,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface MeshNode {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  role: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  details: string;
  techTag: string;
  hashPreview: string;
}

const MESH_NODES: MeshNode[] = [
  {
    id: 'edge',
    number: '01',
    title: 'Perangkat Target (Edge)',
    subtitle: 'HP dengan Chip GPS Satelit Fisik',
    role: 'Pengunci Koordinat & Pembuat Enkripsi',
    icon: Smartphone,
    badge: 'Hardware GPS + secp256k1',
    badgeColor: 'border-sky-500/30 text-sky-300 bg-sky-500/10',
    details:
      'Koordinat satelit dikunci secara offline, dienkripsi seketika dengan AES-256-GCM, dan ditandatangani menggunakan tanda tangan kriptografi Schnorr BIP-340 sebelum meninggalkan HP.',
    techTag: 'AES-256-GCM • BIP-340 Schnorr',
    hashPreview: 'sig: 6896bd60eeae296db48a...',
  },
  {
    id: 'nostr',
    number: '02',
    title: 'Jaringan Nostr Global',
    subtitle: 'Multi-Relay P2P Terdesentralisasi',
    role: 'Penyebar Data Tanpa Server Pusat',
    icon: Radio,
    badge: 'Node P2P Global',
    badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
    details:
      'Paket data terenkripsi disebar ke ratusan server relay independen di seluruh dunia (Damus, Nos.lol, Primal). Tidak ada satu negara atau pihak pun yang bisa mematikan atau menyensor transmisi.',
    techTag: 'wss://damus.io • nos.lol',
    hashPreview: 'event: kind-30078 / 3078 ack:3',
  },
  {
    id: 'ipfs',
    number: '03',
    title: 'Brankas Abadi IPFS',
    subtitle: 'InterPlanetary File System (Web3)',
    role: 'Penyimpan Kode Permanen Anti-Hack',
    icon: Blocks,
    badge: 'CID: bafybeie... (Anti-Sita)',
    badgeColor: 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10',
    details:
      'Tampilan antarmuka web LacakHP disimpan di jaringan IPFS sedunia dalam bentuk rumus sidik jari matematis (CID). Kode tidak bisa disusupi malware atau ditutup paksa.',
    techTag: 'IPFS P2P • 4EVERLAND / Gateway',
    hashPreview: 'cid: bafybeiedexeztfbfe2n...',
  },
  {
    id: 'viewer',
    number: '04',
    title: 'Layar Pemantau',
    subtitle: 'Browser Keluarga / Tablet / Laptop',
    role: 'Dekripsi 100% Lokal di RAM',
    icon: Monitor,
    badge: 'Zero-Knowledge Client',
    badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
    details:
      'Browser menarik ciphertext dari relay Nostr dan aset dari IPFS, lalu membuka kunci lokasi langsung di memori RAM menggunakan Kunci Rahasia keluarga. Server tidak pernah melihat plaintext lokasi.',
    techTag: 'WebCrypto PBKDF2-100k • Local RAM',
    hashPreview: 'lat: -6.2088 • lng: 106.8456',
  },
];

export const Web3SovereignMeshAnimation: React.FC = () => {
  const [activeNodeId, setActiveNodeId] = useState<string>('edge');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  // Auto-cycle through nodes smoothly every 4.2 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % MESH_NODES.length;
        setActiveNodeId(MESH_NODES[next].id);
        return next;
      });
    }, 4200);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const activeNode = MESH_NODES.find((n) => n.id === activeNodeId) || MESH_NODES[0];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900/90 to-indigo-950/30 border border-slate-800/90 p-4 sm:p-6 space-y-5 overflow-hidden relative shadow-2xl">
      {/* Background Subtle Cyber Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Live Telemetry HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-slate-800/80 pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              Arsitektur Web3 Berdaulat (Sovereign Decentralized Mesh)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Kombinasi Kriptografi Satelit, Jaringan Relay Nostr, dan Brankas P2P IPFS Tanpa Titik Kegagalan Tunggal
          </p>
        </div>

        {/* Live Network Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[0.6875rem] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            TAHAP {activeStep + 1} DARI {MESH_NODES.length}
          </span>
          <button
            type="button"
            onClick={() => setIsAutoPlaying((v) => !v)}
            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[0.6875rem] font-mono text-slate-300 transition cursor-pointer"
          >
            {isAutoPlaying ? '⏸ Jeda Alur' : '▶ Putar Alur'}
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>4/4 NODE AKTIF</span>
          </div>
        </div>
      </div>

      {/* Interactive 4-Node Pathway Diagram */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 relative z-10">
        {MESH_NODES.map((node, index) => {
          const Icon = node.icon;
          const isActive = node.id === activeNodeId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => {
                setActiveNodeId(node.id);
                setActiveStep(index);
                setIsAutoPlaying(false);
              }}
              className={`text-left p-3 sm:p-4 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-sky-500/50 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              {/* Active Glow Accent Bar */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400"
                />
              )}

              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span
                  className={`text-[0.6875rem] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  NODE {node.number}
                </span>
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />
              </div>

              <div className="text-xs sm:text-[0.8125rem] font-bold text-slate-100 line-clamp-1">
                {node.title}
              </div>
              <div className="text-[0.6875rem] text-slate-400 line-clamp-1 mt-0.5">
                {node.role}
              </div>

              {/* Dynamic Micro Circuit Indicator */}
              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[0.625rem] font-mono">
                <span className={isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {isActive ? '● SEDANG AKTIF' : '○ SIAGA'}
                </span>
                {index < 3 && (
                  <ArrowRight
                    className={`w-3 h-3 ${
                      isActive ? 'text-sky-400' : 'text-slate-400'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Data Conduit Beam (Visual Connection Pulse) */}
      <div className="relative h-2 w-full bg-slate-950 rounded-full border border-slate-800/80 overflow-hidden px-1 flex items-center">
        <motion.div
          animate={{
            x: ['0%', '100%'],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.2,
            ease: 'linear',
          }}
          className="h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-sky-400 to-emerald-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
        />
      </div>

      {/* Deep-Dive Inspection Card for Active Node */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNode.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 sm:p-5 space-y-3 relative z-10"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
                <activeNode.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-slate-50">
                  {activeNode.title} — {activeNode.subtitle}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Protokol: {activeNode.techTag}
                </div>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-md text-[0.6875rem] font-mono border ${activeNode.badgeColor}`}
            >
              {activeNode.badge}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-[70ch]">
            {activeNode.details}
          </p>

          {/* Cryptographic Stream Preview Bar */}
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Output Kriptografis:</span>
              <code className="text-emerald-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {activeNode.hashPreview}
              </code>
            </div>

            {activeNode.id === 'ipfs' && (
              <a
                href="https://lacakinhp-79so.ipfs.4everland.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-xs font-medium transition"
              >
                <span>Buka Mirror IPFS Live</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 3 Non-Negotiable Web3 Guarantees */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Anti-Sita &amp; Anti-Mati</span>
          </div>
          <p className="text-slate-300 text-[0.75rem] leading-relaxed">
            Tidak ada domain tunggal atau server cloud yang bisa mematikan sistem pelacakan darurat ini.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Zero-Knowledge Mutlak</span>
          </div>
          <p className="text-slate-300 text-[0.75rem] leading-relaxed">
            Data lokasi tidak pernah tersimpan di database siapa pun. Kunci rahasia hanya ada di HP keluarga.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Transparansi Kriptografi</span>
          </div>
          <p className="text-slate-300 text-[0.75rem] leading-relaxed">
            Seluruh logika menggunakan algoritma terbuka standar Bitcoin (BIP-340) yang dapat diaudit publik.
          </p>
        </div>
      </div>
    </div>
  );
};
