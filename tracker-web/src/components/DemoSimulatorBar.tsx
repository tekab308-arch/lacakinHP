import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  WifiOff,
  Lock,
  MessageSquareWarning,
  Printer,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { DemoStoryStage } from '../lib/demoData';
import { RawNostrEvent } from '../lib/nostr';
import { SpotlightCard } from './SpotlightCard';

interface DemoSimulatorBarProps {
  stages: DemoStoryStage[];
  visibleStageCount: number;
  isPlaying: boolean;
  isFailoverSimulated: boolean;
  rawSampleEvent: RawNostrEvent | null;
  onSelectStageCount: (count: number) => void;
  onTogglePlay: () => void;
  onReplayFromStart: () => void;
  onToggleFailoverSim: () => void;
  onExitDemo: () => void;
}

const TONE_BADGE: Record<DemoStoryStage['tone'], string> = {
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export const DemoSimulatorBar: React.FC<DemoSimulatorBarProps> = ({
  stages,
  visibleStageCount,
  isPlaying,
  isFailoverSimulated,
  rawSampleEvent,
  onSelectStageCount,
  onTogglePlay,
  onReplayFromStart,
  onToggleFailoverSim,
  onExitDemo,
}) => {
  const [activeTool, setActiveTool] = useState<'none' | 'sms' | 'e2ee'>('none');

  const safeIndex = Math.max(0, Math.min(stages.length - 1, visibleStageCount - 1));
  const currentStage = stages[safeIndex];
  const latestPt = currentStage?.point;

  return (
    <SpotlightCard
      as="section"
      tone="sky"
      radius={640}
      restingBgClassName="bg-slate-950/75"
      restingBorderClassName="border-sky-500/35"
      contentClassName="p-4 sm:p-5 space-y-4"
      className="no-print"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
            <Play className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white">
                Simulasi Darurat Interaktif (Bukan HP Asli)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Tahap {safeIndex + 1} / {stages.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Klik tahap di bawah atau tekan <b>Putar Simulasi</b> untuk melihat
              bagaimana LacakHP bertahan saat sinyal diputus pencuri.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={isPlaying ? onTogglePlay : visibleStageCount >= stages.length ? onReplayFromStart : onTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg shadow-sky-500/20 transition min-h-[38px] touch-manipulation"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Jeda</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>
                  {visibleStageCount >= stages.length
                    ? 'Putar Ulang Rute'
                    : 'Lanjutkan'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReplayFromStart}
            title="Ulang dari Tahap 1"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition touch-manipulation shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExitDemo}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition min-h-[38px] touch-manipulation shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Keluar Demo</span>
          </button>
        </div>
      </div>

      {/* 6-Step Interactive Story Timeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stages.map((s) => {
          const isCurrent = s.stage === safeIndex + 1;
          const isReached = s.stage <= visibleStageCount;
          return (
            <button
              key={s.stage}
              type="button"
              onClick={() => onSelectStageCount(s.stage)}
              className={`text-left rounded-xl p-2.5 border transition-all ${
                isCurrent
                  ? 'bg-slate-900 border-sky-400/80 shadow-[0_0_16px_-4px_rgba(56,189,248,0.45)]'
                  : isReached
                  ? 'bg-slate-950/90 border-slate-700/80 hover:border-slate-500'
                  : 'bg-slate-950/45 border-slate-800/70 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  #{s.stage}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {s.point.bat}%
                </span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-white line-clamp-2 leading-snug">
                {s.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Stage Narrative Card */}
      {currentStage && (
        <motion.div
          key={currentStage.stage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white">
                Tahap {currentStage.stage}: {currentStage.title}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  TONE_BADGE[currentStage.tone]
                }`}
              >
                {currentStage.badge}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentStage.detail}
            </p>
          </div>
          <div className="font-mono text-[10px] text-slate-400 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 shrink-0">
            Akurasi ±{currentStage.point.acc}m ({currentStage.point.prv}) •{' '}
            {new Date(currentStage.point.ts).toLocaleTimeString('id-ID')}
          </div>
        </motion.div>
      )}

      {/* Interactive Defense Scenario Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={onToggleFailoverSim}
          className={`flex-1 min-w-[140px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold transition min-h-[38px] touch-manipulation ${
            isFailoverSimulated
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {isFailoverSimulated
              ? '✓ Simulasi Relay Terganggu Aktif'
              : 'Uji Relay Terblokir (Auto-Failover)'}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTool((prev) => (prev === 'e2ee' ? 'none' : 'e2ee'))
          }
          className={`flex-1 min-w-[140px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold transition min-h-[38px] touch-manipulation ${
            activeTool === 'e2ee'
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Bedah Enkripsi Zero-Knowledge</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTool((prev) => (prev === 'sms' ? 'none' : 'sms'))
          }
          className={`flex-1 min-w-[140px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold transition min-h-[38px] touch-manipulation ${
            activeTool === 'sms'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <MessageSquareWarning className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulasi SMS &ldquo;LACAK KUNCI&rdquo;</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 min-w-[120px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 transition min-h-[38px] touch-manipulation"
        >
          <Printer className="w-3.5 h-3.5 text-sky-400" />
          <span>Pratinjau Cetak PDF Polisi</span>
        </button>
      </div>

      {/* Expandable Interactive Lab Drawer */}
      <AnimatePresence initial={false}>
        {activeTool === 'e2ee' && latestPt && (
          <motion.div
            key="tool-e2ee"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-950 border border-rose-500/30 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-300">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Yang Dilihat Server Relay / Peretas di Internet</span>
                </div>
                <pre className="font-mono text-[10px] text-amber-300/90 break-all whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      kind: 30078,
                      pubkey: rawSampleEvent?.pubkey.slice(0, 24) + '...',
                      content: rawSampleEvent?.content,
                    },
                    null,
                    2
                  )}
                </pre>
                <p className="text-slate-400">
                  Server hanya melihat huruf acak tak bermakna — alamat &amp;
                  koordinat Anda tetap buta bagi siapa pun.
                </p>
              </div>

              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Yang Dibuka Lokal di RAM Browser Keluarga Anda</span>
                </div>
                <pre className="font-mono text-[10px] text-emerald-300 break-all whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      lat: latestPt.lat,
                      lng: latestPt.lng,
                      acc_meter: latestPt.acc,
                      baterai_persen: latestPt.bat,
                      sumber: latestPt.prv,
                      perangkat: latestPt.mdl,
                    },
                    null,
                    2
                  )}
                </pre>
                <p className="text-slate-400">
                  Dekripsi dilakukan 100% di browser memakai kunci lokal{' '}
                  <code>kucing-hitam-jaga-hp-2026</code> tanpa pernah dikirim ke
                  server.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTool === 'sms' && latestPt && (
          <motion.div
            key="tool-sms"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-slate-800 bg-slate-950/90 rounded-xl p-3.5 border border-amber-500/30 space-y-2 text-xs">
              <div className="font-bold text-amber-300">
                Contoh Balasan SMS Saat Kuota HP Dimatikan Pencuri:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
                  <div className="text-slate-400 font-semibold">
                    1. Keluarga kirim SMS ke nomor HP yang hilang:
                  </div>
                  <div className="font-mono text-sky-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 inline-block">
                    LACAK 7492 KUNCI
                  </div>
                </div>
                <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-2.5 space-y-1">
                  <div className="text-emerald-300 font-semibold">
                    2. HP otomatis mengunci layar paksa &amp; membalas SMS:
                  </div>
                  <pre className="font-mono text-[10px] text-slate-200 whitespace-pre-wrap">
                    {`[LacakHP] LAYAR HP BERHASIL DIKUNCI PAKSA!\nKoordinat: ${latestPt.lat.toFixed(
                      6
                    )}, ${latestPt.lng.toFixed(6)}\nAkurasi: ${
                      latestPt.acc
                    }m (${latestPt.prv}) • Baterai: ${
                      latestPt.bat
                    }%\nhttps://maps.google.com/?q=${latestPt.lat},${
                      latestPt.lng
                    }`}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SpotlightCard>
  );
};
