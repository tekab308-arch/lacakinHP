import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  LifeBuoy,
  Radio,
  RefreshCw,
  HeartHandshake,
} from 'lucide-react';

export type ActiveTab = 'tracker' | 'firstaid' | 'architecture' | 'about';

interface NavbarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  isTracking: boolean;
  latestPointTs: number | null;
  isDemoMode: boolean;
}

function formatLastActiveBadge(
  ts: number,
  now: number
): {
  label: string;
  shortLabel: string;
  tier: 'fresh' | 'standby' | 'stale';
} {
  const diffMs = Math.max(0, now - ts);
  const diffMin = Math.floor(diffMs / 60000);

  const tier: 'fresh' | 'standby' | 'stale' =
    diffMin < 15 ? 'fresh' : diffMin <= 35 ? 'standby' : 'stale';

  if (diffMin < 1) {
    return { label: 'Terakhir aktif baru saja', shortLabel: 'Baru saja', tier };
  }
  if (diffMin < 60) {
    return {
      label: `Terakhir aktif ${diffMin} menit lalu`,
      shortLabel: `${diffMin}m lalu`,
      tier,
    };
  }
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHr < 24) {
    return {
      label:
        remMin > 0
          ? `Terakhir aktif ${diffHr} jam ${remMin} mnt lalu`
          : `Terakhir aktif ${diffHr} jam lalu`,
      shortLabel: `${diffHr}j lalu`,
      tier,
    };
  }
  const diffDay = Math.floor(diffHr / 24);
  return {
    label: `Terakhir aktif ${diffDay} hari lalu`,
    shortLabel: `${diffDay}h lalu`,
    tier,
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  isTracking,
  latestPointTs,
  isDemoMode,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!latestPointTs) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => window.clearInterval(timer);
  }, [latestPointTs]);

  const activeBadge =
    latestPointTs && latestPointTs > 0
      ? formatLastActiveBadge(latestPointTs, now)
      : null;
  const navItems: {
    id: ActiveTab;
    label: string;
    mobileLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'tracker',
      label: 'Pelacak Live',
      mobileLabel: 'Pelacak',
      icon: <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />,
    },
    {
      id: 'firstaid',
      label: 'Pertolongan Pertama',
      mobileLabel: 'Darurat',
      icon: <LifeBuoy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />,
    },
    {
      id: 'architecture',
      label: 'Cara Kerja & Keamanan',
      mobileLabel: 'Keamanan',
      icon: <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />,
    },
    {
      id: 'about',
      label: 'Tentang Projek',
      mobileLabel: 'Tentang',
      icon: <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />,
    },
  ];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl overflow-hidden sm:overflow-visible">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onChangeTab('tracker')}
          className="flex items-center gap-2 sm:gap-2.5 text-left group min-w-0 shrink"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition-colors shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                LacakHP
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Open-Source Charity
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">
              Zero-Knowledge E2EE • Multi-Relay Nostr
            </p>
          </div>
        </button>

        {/* Segmented Tabs (Desktop) with Framer Motion gliding pill */}
        <nav className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-slate-800 border border-slate-700/70 shadow-sm"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Live Status Pill */}
        <div className="flex items-center gap-1.5 shrink-0 max-w-[55%] sm:max-w-none">
          {isDemoMode && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
              Demo
            </span>
          )}

          {activeBadge ? (
            <span
              title={`Titik GPS terbaru: ${new Date(
                latestPointTs!
              ).toLocaleString('id-ID')}`}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold backdrop-blur-md transition-all duration-300 ${
                activeBadge.tier === 'fresh'
                  ? 'bg-gradient-to-r from-emerald-950/85 via-slate-900/90 to-emerald-950/75 text-emerald-300 border border-emerald-500/35 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                  : activeBadge.tier === 'standby'
                  ? 'bg-gradient-to-r from-sky-950/85 via-slate-900/90 to-sky-950/75 text-sky-200 border border-sky-500/35 shadow-[0_0_20px_-5px_rgba(56,189,248,0.35),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                  : 'bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/70 text-amber-200 border border-amber-500/35 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
              }`}
            >
              {activeBadge.tier === 'fresh' ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
              ) : activeBadge.tier === 'standby' ? (
                <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] shrink-0" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] shrink-0" />
              )}
              <span className="tracking-tight whitespace-nowrap hidden sm:inline">
                {activeBadge.label}
              </span>
              <span className="tracking-tight whitespace-nowrap sm:hidden">
                {activeBadge.shortLabel}
              </span>
              {isTracking && (
                <RefreshCw
                  className="w-3 h-3 animate-spin opacity-75 shrink-0"
                  aria-label="Menyinkronkan relay"
                />
              )}
            </span>
          ) : isTracking ? (
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-indigo-950/85 via-slate-900/90 to-indigo-950/75 text-indigo-200 border border-indigo-500/35 shadow-[0_0_20px_-5px_rgba(99,102,241,0.4),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md">
              <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
              <span className="tracking-tight whitespace-nowrap hidden sm:inline">
                Kueri Relay...
              </span>
              <span className="tracking-tight whitespace-nowrap sm:hidden">
                Kueri...
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-slate-900/90 text-slate-400 border border-slate-800/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-slate-600 shrink-0" />
              <span className="tracking-tight whitespace-nowrap">
                E2EE Siap
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Mobile Tab Strip (Thumb-friendly 4 columns, comfortable touch targets >= 46px) */}
      <nav
        aria-label="Navigasi Utama Ponsel"
        className="md:hidden border-t border-slate-800/70 px-1.5 py-1 grid grid-cols-4 gap-1 bg-slate-950/95"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-h-[46px] py-1 px-1 rounded-xl text-[10px] font-semibold transition-colors touch-manipulation ${
                active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-mobile-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-slate-800/95 border border-slate-700/80 shadow-sm"
                />
              )}
              <span className="relative z-10 flex flex-col items-center justify-center gap-0.5 min-w-0 w-full">
                {item.icon}
                <span className="truncate max-w-full tracking-tight">{item.mobileLabel}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
