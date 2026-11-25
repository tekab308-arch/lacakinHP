import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Eye,
  EyeOff,
  Link2,
  Printer,
  ChevronDown,
  ChevronUp,
  Wifi,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Battery,
  Clock,
  Target,
  ShieldCheck,
  ExternalLink,
  Copy,
  Download,
  Trash2,
} from 'lucide-react';
import {
  CryptoVersion,
  DecryptedLocationPoint,
  detectSecretMode,
} from '../lib/crypto';
import { DemoStoryStage } from '../lib/demoData';
import {
  RawNostrEvent,
  RelayQueryStatus,
  parseRelaysCsv,
  pointsToCsv,
  pointsToGpx,
} from '../lib/nostr';
import { RadarMap } from './RadarMap';
import { SpotlightCard } from './SpotlightCard';
import { DemoSimulatorBar } from './DemoSimulatorBar';

interface TrackerWorkspaceProps {
  deviceId: string;
  setDeviceId: (v: string) => void;
  secretKey: string;
  setSecretKey: (v: string) => void;
  relaysCsv: string;
  setRelaysCsv: (v: string) => void;
  points: DecryptedLocationPoint[];
  isTracking: boolean;
  hasMagicHash: boolean;
  isDemoMode: boolean;
  demoStages: DemoStoryStage[];
  demoVisibleCount: number;
  demoIsPlaying: boolean;
  demoFailoverSim: boolean;
  derivedPubHex: string;
  matchedCryptoVersion: CryptoVersion | null;
  rawSampleEvent: RawNostrEvent | null;
  totalEncryptedEvents: number;
  filteredOutlierCount?: number;
  showRawPoints?: boolean;
  onToggleShowRaw?: () => void;
  relayStatuses: Record<string, RelayQueryStatus>;
  onTrack: () => void;
  onCopyMagicLink: () => void;
  onStartDemo: () => void;
  onSelectDemoStage: (count: number) => void;
  onToggleDemoPlay: () => void;
  onReplayDemo: () => void;
  onToggleDemoFailover: () => void;
  onExitDemo: () => void;
  onClearSession: () => void;
  onShowToast: (msg: string, ok?: boolean) => void;
}

function formatRelativeTime(ts: number): string {
  if (!ts) return '-';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHr < 24) {
    return remMin > 0
      ? `${diffHr} jam ${remMin} mnt lalu`
      : `${diffHr} jam lalu`;
  }
  return `${Math.floor(diffHr / 24)} hari lalu`;
}

export const TrackerWorkspace: React.FC<TrackerWorkspaceProps> = ({
  deviceId,
  setDeviceId,
  secretKey,
  setSecretKey,
  relaysCsv,
  setRelaysCsv,
  points,
  isTracking,
  hasMagicHash,
  isDemoMode,
  demoStages,
  demoVisibleCount,
  demoIsPlaying,
  demoFailoverSim,
  derivedPubHex,
  matchedCryptoVersion,
  rawSampleEvent,
  totalEncryptedEvents,
  filteredOutlierCount = 0,
  showRawPoints = false,
  onToggleShowRaw,
  relayStatuses,
  onTrack,
  onCopyMagicLink,
  onStartDemo,
  onSelectDemoStage,
  onToggleDemoPlay,
  onReplayDemo,
  onToggleDemoFailover,
  onExitDemo,
  onClearSession,
  onShowToast,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [showRelayConfig, setShowRelayConfig] = useState(false);
  const [showCryptoAudit, setShowCryptoAudit] = useState(false);
  const [focusedPoint, setFocusedPoint] =
    useState<DecryptedLocationPoint | null>(null);

  const latest = points[0] ?? null;
  const parsedRelays = parseRelaysCsv(relaysCsv);
  const activeFallbackRelays = Object.keys(relayStatuses).filter(
    (url) => !parsedRelays.includes(url)
  );
  const displayedRelays = [...parsedRelays, ...activeFallbackRelays];
  const detectedMode = detectSecretMode(secretKey);

  const handleCopyCoords = () => {
    if (!latest) return;
    const coordsText = `${latest.lat.toFixed(6)}, ${latest.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordsText).then(() => {
      onShowToast(`Koordinat ${coordsText} disalin!`, true);
    });
  };

  const handleDownloadExport = (format: 'csv' | 'gpx') => {
    if (points.length === 0) return;
    const content =
      format === 'csv'
        ? pointsToCsv(points)
        : pointsToGpx(points, deviceId || 'lacakhp');
    const mime =
      format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/gpx+xml;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lacakhp-${(deviceId || 'jejak').replace(/[^a-z0-9_-]/gi, '-')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(`Riwayat ${points.length} titik diekspor ke ${format.toUpperCase()}.`, true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Contextual Banners */}
      {hasMagicHash && !isDemoMode && (
        <div className="no-print bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <b>Mode Ephemeral (100% RAM):</b> Kunci di belakang{' '}
                <code>#</code> sudah otomatis dihapus dari URL dan tidak ada
                data yang disimpan ke penyimpanan browser (aman di HP pinjaman).
              </span>
            </div>
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="text-xs font-semibold text-indigo-300 hover:text-white underline underline-offset-4"
          >
            {showSecret ? 'Sembunyikan Kunci' : 'Lihat Kunci'}
          </button>
        </div>
      )}

      {isDemoMode && demoStages.length > 0 && (
        <DemoSimulatorBar
          stages={demoStages}
          visibleStageCount={demoVisibleCount}
          isPlaying={demoIsPlaying}
          isFailoverSimulated={demoFailoverSim}
          rawSampleEvent={rawSampleEvent}
          onSelectStageCount={onSelectDemoStage}
          onTogglePlay={onToggleDemoPlay}
          onReplayFromStart={onReplayDemo}
          onToggleFailoverSim={onToggleDemoFailover}
          onExitDemo={onExitDemo}
        />
      )}

      {/* Official Print Report Header (Visible only when printing to PDF) */}
      <div className="hidden print:block border-b-2 border-slate-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-slate-900">
          LAPORAN PELACAKAN LOKASI PERANGKAT (LACAKHP E2EE)
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          ID Perangkat: <b>{deviceId || '-'}</b> • Dicetak pada:{' '}
          {new Date().toLocaleString('id-ID')} • Sumber Data: Terenkripsi
          AES-256-GCM / Nostr Relay
        </p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* LEFT RAIL: Access Control + Live Relay Health + Crypto Audit */}
        <aside className="no-print contents lg:block lg:col-span-4 lg:space-y-4 min-w-0">
          {/* Credentials Card */}
          <SpotlightCard
            tone="radar"
            radius={420}
            restingBgClassName="bg-slate-950/55"
            hoverBgClassName="bg-slate-950/85"
            className={`w-full min-w-0 shadow-xl ${
              points.length > 0 ? 'order-3' : 'order-1'
            }`}
            contentClassName="p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white truncate">
                Akses Dekripsi Perangkat
              </h2>
              <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Lokal di RAM
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ID Perangkat{' '}
                  <span className="text-slate-500 font-normal">
                    (dari Kartu Darurat)
                  </span>
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="mis. samsung-sm-a217f"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-medium text-slate-300 shrink-0">
                    Kunci Rahasia
                  </label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 truncate">
                    {detectedMode}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onTrack();
                    }}
                    placeholder="Kata sandi pribadi atau 12 kata seed..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3.5 py-2.5 pr-11 text-base sm:text-sm text-sky-300 font-medium placeholder-slate-600 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={
                      showSecret ? 'Sembunyikan kunci' : 'Lihat kunci'
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition touch-manipulation"
                  >
                    {showSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onTrack}
                disabled={isTracking}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/15 transition-all min-h-[46px] touch-manipulation"
              >
                {isTracking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghubungi Relay &amp; Mendekripsi...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Lacak &amp; Dekripsi Sekarang</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCopyMagicLink}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition min-h-[42px] touch-manipulation"
                >
                  <Link2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">Salin Link 1-Klik</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition min-h-[42px] touch-manipulation"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="truncate">Cetak PDF</span>
                </button>
              </div>

              {(deviceId || secretKey || points.length > 0) && (
                <button
                  type="button"
                  onClick={onClearSession}
                  title="Hapus ID, kunci rahasia, & riwayat dari RAM serta penyimpanan browser (penting jika memakai HP pinjaman)"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-[11px] font-semibold text-rose-300 transition min-h-[38px] touch-manipulation"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Bersihkan Sesi &amp; Hapus Kunci dari RAM</span>
                </button>
              )}

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2.5 flex items-start gap-2 text-[11px] text-amber-200/95 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <b>Waspada Penipuan:</b> LacakHP adalah projek amal
                  open-source 100% gratis demi mendukung tugas kepolisian. Kami{' '}
                  <b>tidak pernah</b> meminta biaya, transfer uang, PIN, atau
                  kode OTP untuk membuka lokasi.
                </span>
              </div>
            </div>
          </SpotlightCard>

          {/* Live Multi-Relay Status & Config Card */}
          <SpotlightCard
            tone="radar"
            radius={380}
            restingBgClassName="bg-slate-950/55"
            hoverBgClassName="bg-slate-950/85"
            className={`w-full min-w-0 ${
              points.length > 0 ? 'order-5' : 'order-4'
            }`}
            contentClassName="p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Wifi className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  Status Jaringan Nostr Relay
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Auto-Failover
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRelayConfig((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white shrink-0"
              >
                <span>Ubah Relay</span>
                {showRelayConfig ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              {displayedRelays.map((url) => {
                const st = relayStatuses[url];
                const isFallback = st?.isFallback || !parsedRelays.includes(url);
                return (
                  <div
                    key={url}
                    className="flex items-center justify-between gap-2 text-[11px] bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 min-w-0"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-slate-300 truncate min-w-0">
                        {url.replace(/^wss?:\/\//, '')}
                      </span>
                      {isFallback && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                          CADANGAN
                        </span>
                      )}
                    </div>
                    {!st ? (
                      <span className="text-slate-500 shrink-0">Siaga</span>
                    ) : st.state === 'connecting' ||
                      st.state === 'connected' ? (
                      <span className="inline-flex items-center gap-1 text-indigo-300 shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Kueri...
                      </span>
                    ) : st.state === 'done' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        {st.eventCount} ({st.latencyMs}ms)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 shrink-0">
                        <AlertCircle className="w-3 h-3" />
                        Timeout
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <AnimatePresence initial={false}>
              {showRelayConfig && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <label className="block text-[11px] text-slate-400">
                      Daftar URL Relay (pisahkan koma):
                    </label>
                    <input
                      type="text"
                      value={relaysCsv}
                      onChange={(e) => setRelaysCsv(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-base sm:text-xs font-mono text-slate-300 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Sudah terisi otomatis untuk masyarakat umum. Ubah hanya
                      jika Anda memiliki server relay Nostr pribadi.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SpotlightCard>

          {/* Transparent Zero-Knowledge Crypto Audit Drawer */}
          <SpotlightCard
            tone="radar"
            radius={360}
            restingBgClassName="bg-slate-950/55"
            hoverBgClassName="bg-slate-950/85"
            className={`w-full min-w-0 ${
              points.length > 0 ? 'order-6' : 'order-5'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowCryptoAudit((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200 truncate">
                  Inspeksi Kriptografi (Zero-Knowledge)
                </span>
              </div>
              {showCryptoAudit ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {showCryptoAudit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-2.5 text-[11px] min-w-0">
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-slate-400">Versi Derivasi Kunci:</span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                          matchedCryptoVersion === 'v1'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {matchedCryptoVersion === 'v1'
                          ? 'v1 SHA-256 (Legacy)'
                          : matchedCryptoVersion === 'v2'
                          ? 'v2 PBKDF2-100k'
                          : 'Dual-Lookup (v2 + v1)'}
                      </span>
                    </div>
                    <div>
                      <div className="text-slate-400">
                        Nostr Pubkey Turunan Lokal (x-only secp256k1):
                      </div>
                      <div className="font-mono text-sky-300 break-all bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1">
                        {derivedPubHex ||
                          'Masukkan ID & Kunci untuk menghitung pubkey secara lokal'}
                      </div>
                    </div>

                    {rawSampleEvent && (
                      <div>
                        <div className="text-slate-400 flex items-center justify-between gap-2">
                          <span>Data Mentah yang Dilihat Server Relay:</span>
                          <span className="text-emerald-400 shrink-0">
                            {totalEncryptedEvents} event
                          </span>
                        </div>
                        <pre className="font-mono text-[10px] text-amber-300/90 bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 max-w-full overflow-x-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(
                            {
                              kind: rawSampleEvent.kind,
                              content:
                                rawSampleEvent.content.slice(0, 64) + '...',
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SpotlightCard>

          {/* Mini 3-Step Guide if user hasn't tracked anything yet */}
          {points.length === 0 && (
            <SpotlightCard
              tone="radar"
              radius={360}
              restingBgClassName="bg-slate-900/50"
              hoverBgClassName="bg-slate-900/85"
              className="w-full min-w-0 order-7"
              contentClassName="p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Panduan Cepat 3 Langkah
                </span>
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="text-[11px] font-semibold text-sky-400 hover:underline shrink-0"
                >
                  Coba Demo
                </button>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>
                  Masukkan <b>ID Perangkat</b> &amp; <b>Kunci Rahasia</b> dari
                  Kartu Darurat (atau klik link 1-klik di WhatsApp).
                </li>
                <li>
                  Klik <b>Lacak &amp; Dekripsi</b> — browser mengambil data acak
                  dari relay dan membukanya secara lokal.
                </li>
                <li>
                  Gunakan tombol <b>Google Maps</b> untuk rute navigasi atau{' '}
                  <b>Cetak PDF</b> untuk laporan kepolisian.
                </li>
              </ol>
            </SpotlightCard>
          )}
        </aside>

        {/* RIGHT STAGE: Telemetry Tiles + Radar Map + Breadcrumb History */}
        <div className="contents lg:block lg:col-span-8 lg:space-y-4 min-w-0">
          {/* 4 Telemetry Metric Tiles */}
          <div
            className={`w-full min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 ${
              points.length > 0 ? 'order-1' : 'order-3'
            }`}
          >
            <SpotlightCard
              as="button"
              type="button"
              tone="radar"
              radius={220}
              onClick={handleCopyCoords}
              disabled={!latest}
              restingBgClassName="bg-slate-950/55"
              hoverBgClassName="bg-slate-950/85"
              className="print-card text-left group min-w-0"
              contentClassName="p-3 sm:p-3.5"
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 print-text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  Koordinat
                </span>
                {latest && (
                  <Copy className="no-print w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                )}
              </div>
              <div className="mt-1.5 font-mono font-bold text-[11px] sm:text-xs text-white print-text-dark leading-tight break-all">
                {latest
                  ? `${latest.lat.toFixed(6)}, ${latest.lng.toFixed(6)}`
                  : '-'}
              </div>
            </SpotlightCard>

            <SpotlightCard
              tone="radar"
              radius={220}
              restingBgClassName="bg-slate-950/55"
              hoverBgClassName="bg-slate-950/85"
              className="print-card min-w-0"
              contentClassName="p-3 sm:p-3.5"
            >
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 print-text-muted">
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Akurasi
              </div>
              <div className="mt-1.5 font-bold text-xs sm:text-sm text-emerald-400 print-text-dark break-words">
                {latest
                  ? `±${Math.round(latest.acc || 0)}m (${latest.prv || 'gps'})`
                  : '-'}
              </div>
            </SpotlightCard>

            <SpotlightCard
              tone="radar"
              radius={220}
              restingBgClassName="bg-slate-950/55"
              hoverBgClassName="bg-slate-950/85"
              className="print-card min-w-0"
              contentClassName="p-3 sm:p-3.5"
            >
              <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-slate-400 print-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Baterai
                </span>
                {latest && latest.bat >= 0 && latest.bat <= 15 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300">
                    KRITIS
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`font-bold text-xs sm:text-sm print-text-dark shrink-0 ${
                    latest && latest.bat >= 0 && latest.bat <= 15
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  {latest && latest.bat >= 0 ? `${latest.bat}%` : '-'}
                </span>
                {latest && latest.bat >= 0 && (
                  <div className="no-print flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        latest.bat <= 15
                          ? 'bg-rose-500'
                          : latest.bat <= 40
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, latest.bat))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </SpotlightCard>

            <SpotlightCard
              tone="radar"
              radius={220}
              restingBgClassName="bg-slate-950/55"
              hoverBgClassName="bg-slate-950/85"
              className="print-card min-w-0"
              contentClassName="p-3 sm:p-3.5"
            >
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 print-text-muted">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Laporan Terakhir
              </div>
              <div className="mt-1.5 font-bold text-xs text-sky-300 print-text-dark truncate">
                {latest ? formatRelativeTime(latest.ts) : '-'}
              </div>
              {latest && (
                <div className="text-[10px] text-slate-500 truncate font-mono">
                  {new Date(latest.ts).toLocaleString('id-ID')}
                </div>
              )}
            </SpotlightCard>
          </div>

          {/* Interactive Leaflet Radar Map */}
          <div className="w-full min-w-0 order-2">
            <RadarMap
              points={points}
              focusedPoint={focusedPoint}
              deviceId={deviceId}
              onStartDemo={onStartDemo}
            />
          </div>

          {/* Breadcrumb Trail History */}
          <SpotlightCard
            tone="radar"
            radius={520}
            restingBgClassName="bg-slate-950/55"
            hoverBgClassName="bg-slate-950/85"
            className={`w-full min-w-0 print-card ${
              points.length > 0 ? 'order-4' : 'order-6'
            }`}
            contentClassName="p-4 sm:p-5 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white print-text-dark truncate">
                  Riwayat Jejak (Breadcrumbs)
                </h2>
                <p className="text-[11px] text-slate-400 print-text-muted">
                  Ketuk titik mana pun untuk memfokuskan peta
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                {filteredOutlierCount > 0 && onToggleShowRaw && (
                  <button
                    type="button"
                    onClick={onToggleShowRaw}
                    title="Beralih antara tampilan bersih (loncatan BTS disaring) dan seluruh titik mentah"
                    className={`no-print px-2.5 py-1.5 sm:py-1 rounded-full text-[11px] font-medium border transition touch-manipulation ${
                      showRawPoints
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {showRawPoints
                      ? `Mode Mentah (+${filteredOutlierCount} BTS)`
                      : `${filteredOutlierCount} BTS disaring • Lihat Mentah`}
                  </button>
                )}
                {points.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadExport('csv')}
                      title="Unduh riwayat koordinat format CSV"
                      className="no-print inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-full text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition touch-manipulation"
                    >
                      <Download className="w-3 h-3 text-sky-400" />
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadExport('gpx')}
                      title="Unduh jalur koordinat format GPX (Google Earth / QGIS)"
                      className="no-print inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-full text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition touch-manipulation"
                    >
                      <Download className="w-3 h-3 text-indigo-400" />
                      GPX
                    </button>
                  </>
                )}
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {points.length} titik
                </span>
              </div>
            </div>

            {points.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Belum ada riwayat koordinat terdekripsi.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
                {points.slice(0, 50).map((p, idx) => {
                  const isSelected =
                    focusedPoint !== null &&
                    focusedPoint.ts === p.ts &&
                    focusedPoint.lat === p.lat &&
                    focusedPoint.lng === p.lng;
                  return (
                  <div
                    key={`${p.ts}_${p.lat}_${p.lng}`}
                    onClick={() => setFocusedPoint({ ...p })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setFocusedPoint({ ...p });
                      }
                    }}
                    className={`py-2.5 px-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-colors min-w-0 ${
                      isSelected
                        ? 'bg-sky-500/15 ring-1 ring-inset ring-sky-500/40'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          idx === 0 || isSelected
                            ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                            : 'bg-indigo-500/70'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-sky-300 print-text-dark break-all">
                            {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
                          </span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                              TERBARU
                            </span>
                          )}
                          {isSelected && idx !== 0 && (
                            <span className="no-print px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/35 shrink-0">
                              DIPILIH
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 print-text-muted mt-0.5">
                          ±{Math.round(p.acc || 0)}m ({p.prv || 'gps'}) • Baterai{' '}
                          {p.bat >= 0 ? `${p.bat}%` : '-'}
                        </div>
                        <div className="sm:hidden font-mono text-[10px] text-slate-500 print-text-muted mt-0.5">
                          {p.ts ? new Date(p.ts).toLocaleString('id-ID') : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="hidden sm:inline font-mono text-[11px] text-slate-400 print-text-muted">
                        {p.ts ? new Date(p.ts).toLocaleString('id-ID') : '-'}
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${p.lat},${p.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Buka di Google Maps"
                        className="no-print p-2 sm:p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 transition shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
};
