import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Navbar, ActiveTab } from './components/Navbar';
import { NetworkPulseCanvas } from './components/NetworkPulseCanvas';
import { WelcomeBanner } from './components/WelcomeBanner';
import { TrackerWorkspace } from './components/TrackerWorkspace';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { FirstAidChecklist } from './components/FirstAidChecklist';
import { AboutProject } from './components/AboutProject';
import {
  CryptoVersion,
  DecryptedLocationPoint,
  deriveAllKeyVersions,
} from './lib/crypto';
import {
  DEFAULT_RELAYS,
  RawNostrEvent,
  RelayQueryStatus,
  fetchAndDecryptFromRelays,
  filterCoarseJumps,
  parseRelaysCsv,
  subscribeToRelays,
} from './lib/nostr';
import {
  DEMO_DEVICE_ID,
  DEMO_SECRET,
  DemoScenarioData,
  buildDemoScenario,
} from './lib/demoData';

const OFFICIAL_WEB_HOSTS = new Set([
  'lacakinhp110.my.id',
  'www.lacakinhp110.my.id',
  'lacakinhp.pages.dev',
  'lacakhp.pages.dev',
  'tracker-web-xi.vercel.app',
  'localhost',
  '127.0.0.1',
]);

function isOfficialWebHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (OFFICIAL_WEB_HOSTS.has(h)) return true;
  if (h.endsWith('-senarendy37-tekab308s-projects.vercel.app')) return true;
  if (h.endsWith('.pages.dev') && (h.includes('lacakhp') || h.includes('lacakinhp'))) return true;
  return false;
}

export const App: React.FC = () => {
  const isOfficialDomain =
    typeof window !== 'undefined'
      ? isOfficialWebHost(window.location.hostname)
      : true;
  const [activeTab, setActiveTab] = useState<ActiveTab>('tracker');
  const [largeText, setLargeText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lacakhp_ui_large_text') === '1';
    } catch {
      return false;
    }
  });
  const [deviceId, setDeviceId] = useState<string>(
    () => localStorage.getItem('lacakhp_e2ee_device_id') || ''
  );
  const [secretKey, setSecretKey] = useState<string>('');
  const [relaysCsv, setRelaysCsv] = useState<string>(
    () =>
      localStorage.getItem('lacakhp_e2ee_relays') || DEFAULT_RELAYS.join(',')
  );

  const [rawPoints, setRawPoints] = useState<DecryptedLocationPoint[]>([]);
  const [showRawPoints, setShowRawPoints] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [hasMagicHash, setHasMagicHash] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoScenario, setDemoScenario] = useState<DemoScenarioData | null>(
    null
  );
  const [demoVisibleCount, setDemoVisibleCount] = useState(6);
  const [demoIsPlaying, setDemoIsPlaying] = useState(false);
  const [demoFailoverSim, setDemoFailoverSim] = useState(false);
  const [derivedPubHex, setDerivedPubHex] = useState('');
  const [matchedCryptoVersion, setMatchedCryptoVersion] =
    useState<CryptoVersion | null>(null);
  const [rawSampleEvent, setRawSampleEvent] = useState<RawNostrEvent | null>(
    null
  );
  const [totalEncryptedEvents, setTotalEncryptedEvents] = useState(0);
  const [relayStatuses, setRelayStatuses] = useState<
    Record<string, RelayQueryStatus>
  >({});

  const [toast, setToast] = useState<{
    msg: string;
    ok: boolean;
    visible: boolean;
  }>({ msg: '', ok: true, visible: false });

  const toastTimerRef = useRef<number | null>(null);
  const liveUnsubRef = useRef<(() => void) | null>(null);

  const stopLiveSubscription = useCallback(() => {
    if (liveUnsubRef.current) {
      liveUnsubRef.current();
      liveUnsubRef.current = null;
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('font-comfortable', largeText);
    if (!hasMagicHash) {
      try {
        if (largeText) {
          localStorage.setItem('lacakhp_ui_large_text', '1');
        } else {
          localStorage.removeItem('lacakhp_ui_large_text');
        }
      } catch {
        // Ignore storage quota / private mode restrictions
      }
    }
  }, [largeText, hasMagicHash]);

  const { cleanPoints, filteredCount: filteredOutlierCount } = useMemo(
    () => (isDemoMode ? { cleanPoints: rawPoints, filteredCount: 0 } : filterCoarseJumps(rawPoints)),
    [rawPoints, isDemoMode]
  );
  const points = showRawPoints ? rawPoints : cleanPoints;

  const showToast = useCallback((msg: string, ok = true) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ msg, ok, visible: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3400);
  }, []);

  const runTrack = useCallback(
    async (
      targetId: string,
      targetSecret: string,
      targetRelaysCsv: string,
      silentIfNotFound = false,
      ephemeral = false
    ) => {
      const cleanId = targetId.trim();
      const cleanSecret = targetSecret.trim();
      const relays = parseRelaysCsv(targetRelaysCsv);

      if (!cleanId || !cleanSecret || relays.length === 0) {
        if (!silentIfNotFound) {
          showToast(
            'Isi ID Perangkat, Kunci Rahasia, dan minimal 1 Relay Nostr.',
            false
          );
        }
        return;
      }

      setIsDemoMode(false);
      stopLiveSubscription();
      if (!ephemeral) {
        try {
          localStorage.setItem('lacakhp_e2ee_device_id', cleanId);
          localStorage.setItem('lacakhp_e2ee_relays', relays.join(','));
        } catch {
          // Ignore storage quota/privacy errors
        }
      }

      setIsTracking(true);
      if (!silentIfNotFound) {
        setRelayStatuses({});
      }

      try {
        const dualKeys = await deriveAllKeyVersions(cleanId, cleanSecret);
        setDerivedPubHex(dualKeys.v2.pubHex);

        const result = await fetchAndDecryptFromRelays(
          relays,
          dualKeys,
          (url, status) => {
            setRelayStatuses((prev) => ({ ...prev, [url]: status }));
          }
        );

        setRawSampleEvent(result.rawSampleEvent);
        setTotalEncryptedEvents(result.totalEncryptedEvents);
        setMatchedCryptoVersion(result.matchedVersion);

        if (result.matchedVersion === 'v1') {
          setDerivedPubHex(dualKeys.v1.pubHex);
        }

        if (result.rawPoints.length === 0) {
          if (!silentIfNotFound) {
            showToast(
              'Belum ada titik lokasi cocok. Pastikan ID & Kunci Rahasia sama persis.',
              false
            );
          }
          setRawPoints([]);
        } else {
          setRawPoints(result.rawPoints);
        }

        // Subscribe live over persistent WebSockets (no 15s reconnect storm -> no relay 503).
        const sinceSec = Math.floor(Date.now() / 1000) - 60;
        liveUnsubRef.current = subscribeToRelays(
          relays,
          dualKeys,
          sinceSec,
          (pt, rawEv, ver) => {
            setRawSampleEvent((prev) => prev ?? rawEv);
            setTotalEncryptedEvents((n) => n + 1);
            setMatchedCryptoVersion((prev) => prev ?? ver);
            setRawPoints((prev) => {
              const key = `${pt.ts}_${pt.lat.toFixed(6)}_${pt.lng.toFixed(6)}`;
              const map = new Map<string, DecryptedLocationPoint>();
              for (const item of prev) {
                map.set(`${item.ts}_${item.lat.toFixed(6)}_${item.lng.toFixed(6)}`, item);
              }
              if (map.has(key)) return prev;
              map.set(key, pt);
              return Array.from(map.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
            });
          }
        );
      } catch (err) {
        console.error(err);
        if (!silentIfNotFound) {
          showToast('Gagal mendekripsi atau menghubungi relay.', false);
        }
      } finally {
        setIsTracking(false);
      }
    },
    [showToast, stopLiveSubscription]
  );

  // Live pubkey preview when typing credentials locally (debounced slightly for 100k PBKDF2)
  useEffect(() => {
    if (!deviceId.trim() || !secretKey.trim()) {
      setDerivedPubHex('');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      deriveAllKeyVersions(deviceId, secretKey)
        .then((dual) => {
          if (!cancelled) setDerivedPubHex(dual.v2.pubHex);
        })
        .catch(() => {});
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deviceId, secretKey]);

  // Parse #id=...&key=...&relays=... URL fragment cleanly without ever sending secrets to server
  useEffect(() => {
    const parseHashAndAutoTrack = () => {
      const hash = window.location.hash;
      if (!hash || hash.length <= 1) return;
      try {
        const params = new URLSearchParams(hash.substring(1));
        const id = params.get('id');
        const key = params.get('key');
        const relaysParam = params.get('relays');
        const parsedHashRelays = relaysParam ? parseRelaysCsv(relaysParam) : [];

        const nextId = id ?? deviceId;
        const nextKey = key ?? secretKey;
        const nextRelays =
          parsedHashRelays.length > 0 ? parsedHashRelays.join(',') : relaysCsv;

        if (id) setDeviceId(nextId);
        if (key) setSecretKey(nextKey);
        if (parsedHashRelays.length > 0) setRelaysCsv(nextRelays);

        if (id && key) {
          setHasMagicHash(true);
          setActiveTab('tracker');
          // Scrub secret fragment from address bar immediately after loading into RAM
          // so the key is not exposed to shoulder-surfing, screenshots, or browser history sync.
          try {
            window.history.replaceState(
              null,
              '',
              window.location.pathname + window.location.search
            );
          } catch {
            // Ignore history replace restriction in sandboxed environments
          }
          runTrack(nextId, nextKey, nextRelays, true, true);
        }
      } catch (err) {
        console.error('Invalid URL hash fragment', err);
      }
    };

    parseHashAndAutoTrack();
    window.addEventListener('hashchange', parseHashAndAutoTrack);
    return () => {
      window.removeEventListener('hashchange', parseHashAndAutoTrack);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopLiveSubscription();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [stopLiveSubscription]);

  const handleManualTrack = () => {
    runTrack(deviceId, secretKey, relaysCsv, false, hasMagicHash);
  };

  const handleCopyMagicLink = () => {
    const id = deviceId.trim();
    const key = secretKey.trim();
    if (!id || !key) {
      showToast('Isi ID Perangkat dan Kunci Rahasia terlebih dahulu.', false);
      return;
    }
    const baseUrl = window.location.origin + window.location.pathname;
    const normalizedRelays = parseRelaysCsv(relaysCsv);
    const hasCustomRelays =
      normalizedRelays.length > 0 &&
      normalizedRelays.join(',') !== DEFAULT_RELAYS.join(',');
    const relaySuffix = hasCustomRelays
      ? `&relays=${encodeURIComponent(normalizedRelays.join(','))}`
      : '';
    const magicUrl = `${baseUrl}#id=${encodeURIComponent(
      id
    )}&key=${encodeURIComponent(key)}${relaySuffix}`;
    navigator.clipboard
      .writeText(magicUrl)
      .then(() => {
        showToast(
          hasCustomRelays
            ? 'Tautan 1-Klik (+ Relay Kustom) disalin! Kirim ke WhatsApp keluarga.'
            : 'Tautan 1-Klik disalin! Kirim ke WhatsApp keluarga untuk akses darurat.',
          true
        );
      })
      .catch(() => {
        window.prompt('Salin tautan 1-klik darurat berikut:', magicUrl);
      });
  };

  const applyDemoStageCount = useCallback(
    (scenario: DemoScenarioData, count: number) => {
      const clamped = Math.max(1, Math.min(scenario.stages.length, count));
      const sliceNewestFirst = scenario.stages
        .slice(0, clamped)
        .map((s) => s.point)
        .reverse();
      setDemoVisibleCount(clamped);
      setRawPoints(sliceNewestFirst);
      setTotalEncryptedEvents(clamped);
    },
    []
  );

  useEffect(() => {
    if (!isDemoMode || !demoIsPlaying || !demoScenario) return;
    if (demoVisibleCount >= demoScenario.stages.length) {
      setDemoIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      applyDemoStageCount(demoScenario, demoVisibleCount + 1);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [
    isDemoMode,
    demoIsPlaying,
    demoScenario,
    demoVisibleCount,
    applyDemoStageCount,
  ]);

  const handleStartDemo = () => {
    stopLiveSubscription();
    const demo = buildDemoScenario();
    setDemoScenario(demo);
    setDemoFailoverSim(false);
    setDemoIsPlaying(false);
    setIsDemoMode(true);
    setShowRawPoints(false);
    setHasMagicHash(false);
    setDeviceId(DEMO_DEVICE_ID);
    setSecretKey(DEMO_SECRET);
    applyDemoStageCount(demo, demo.stages.length);
    setDerivedPubHex(demo.pubHex);
    setMatchedCryptoVersion('v2');
    setRawSampleEvent(demo.rawSampleEvent);
    setRelayStatuses(demo.relayStatuses);
    setActiveTab('tracker');
    showToast(
      'Simulasi darurat dimuat! Coba Putar Ulang Rute atau uji skenario di panel.',
      true
    );
  };

  const handleSelectDemoStage = (count: number) => {
    if (!demoScenario) return;
    setDemoIsPlaying(false);
    applyDemoStageCount(demoScenario, count);
  };

  const handleToggleDemoPlay = () => {
    if (!demoScenario) return;
    if (demoIsPlaying) {
      setDemoIsPlaying(false);
      return;
    }
    if (demoVisibleCount >= demoScenario.stages.length) {
      applyDemoStageCount(demoScenario, 1);
    }
    setDemoIsPlaying(true);
  };

  const handleReplayDemo = () => {
    if (!demoScenario) return;
    applyDemoStageCount(demoScenario, 1);
    setDemoIsPlaying(true);
  };

  const handleToggleDemoFailover = () => {
    if (!demoScenario) return;
    const next = !demoFailoverSim;
    setDemoFailoverSim(next);
    setRelayStatuses(
      next ? demoScenario.failoverRelayStatuses : demoScenario.relayStatuses
    );
    showToast(
      next
        ? 'Simulasi Auto-Failover aktif: 3 relay cadangan mengambil alih!'
        : 'Simulasi relay dikembalikan ke 3 relay utama.',
      true
    );
  };

  const handleExitDemo = () => {
    stopLiveSubscription();
    setIsDemoMode(false);
    setShowRawPoints(false);
    setDemoIsPlaying(false);
    setDemoFailoverSim(false);
    setDemoScenario(null);
    setDeviceId(localStorage.getItem('lacakhp_e2ee_device_id') || '');
    setSecretKey('');
    setRawPoints([]);
    setMatchedCryptoVersion(null);
    setRawSampleEvent(null);
    setTotalEncryptedEvents(0);
    setRelayStatuses({});
  };

  const handleClearSession = () => {
    stopLiveSubscription();
    setIsDemoMode(false);
    setHasMagicHash(false);
    setShowRawPoints(false);
    setDemoIsPlaying(false);
    setDemoFailoverSim(false);
    setDemoScenario(null);
    setDeviceId('');
    setSecretKey('');
    setRelaysCsv(DEFAULT_RELAYS.join(','));
    setRawPoints([]);
    setDerivedPubHex('');
    setMatchedCryptoVersion(null);
    setRawSampleEvent(null);
    setTotalEncryptedEvents(0);
    setRelayStatuses({});
    try {
      localStorage.removeItem('lacakhp_e2ee_device_id');
      localStorage.removeItem('lacakhp_e2ee_relays');
      if (window.location.hash) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }
    } catch {
      // Ignore storage/history errors
    }
    showToast('Sesi & kunci rahasia dibersihkan dari RAM dan browser.', true);
  };

  const latestPoint = points[0];
  const latestPointTs: number | null =
    latestPoint && latestPoint.ts > 0 ? latestPoint.ts : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden w-full max-w-full">
        {/* Global Full-Page Ambient Nostr Relay Constellation Canvas */}
        <NetworkPulseCanvas />

        <div className="relative z-10 flex-1 flex flex-col min-w-0 w-full max-w-full">
          <Navbar
            activeTab={activeTab}
            onChangeTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo(0, 0);
            }}
            isTracking={isTracking}
            latestPointTs={latestPointTs}
            isDemoMode={isDemoMode}
            largeText={largeText}
            onToggleLargeText={() =>
              setLargeText((prev) => {
                const next = !prev;
                showToast(
                  next
                    ? 'Mode Baca Nyaman (Huruf Besar A+) diaktifkan'
                    : 'Ukuran huruf dikembalikan ke standar'
                );
                return next;
              })
            }
          />

          {!isOfficialDomain && (
            <div className="no-print bg-rose-950/95 border-b border-rose-500/50 px-4 py-3 text-center text-xs sm:text-sm text-rose-100 leading-relaxed">
              <b>⚠️ PERINGATAN KEAMANAN (DOMAIN TIDAK RESMI):</b> Halaman ini
              berjalan di luar domain resmi LacakHP (
              <code>lacakinhp110.my.id</code>). Jangan pernah membayar biaya apa
              pun atau memasukkan Kunci Rahasia Anda di situs tiruan!
            </div>
          )}

          <main className="flex-1 px-3 sm:px-6 py-4 sm:py-7 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'tracker' && (
                <>
                  <WelcomeBanner
                    hasMagicHash={hasMagicHash}
                    onStartDemo={handleStartDemo}
                    onOpenArchitecture={() => setActiveTab('architecture')}
                  />
                  <TrackerWorkspace
                    deviceId={deviceId}
                    setDeviceId={setDeviceId}
                    secretKey={secretKey}
                    setSecretKey={setSecretKey}
                    relaysCsv={relaysCsv}
                    setRelaysCsv={setRelaysCsv}
                    points={points}
                    isTracking={isTracking}
                    hasMagicHash={hasMagicHash}
                    isDemoMode={isDemoMode}
                    demoStages={demoScenario?.stages ?? []}
                    demoVisibleCount={demoVisibleCount}
                    demoIsPlaying={demoIsPlaying}
                    demoFailoverSim={demoFailoverSim}
                    derivedPubHex={derivedPubHex}
                    matchedCryptoVersion={matchedCryptoVersion}
                    rawSampleEvent={rawSampleEvent}
                    totalEncryptedEvents={totalEncryptedEvents}
                    filteredOutlierCount={filteredOutlierCount}
                    showRawPoints={showRawPoints}
                    onToggleShowRaw={() => setShowRawPoints((v) => !v)}
                    relayStatuses={relayStatuses}
                    onTrack={handleManualTrack}
                    onCopyMagicLink={handleCopyMagicLink}
                    onStartDemo={handleStartDemo}
                    onSelectDemoStage={handleSelectDemoStage}
                    onToggleDemoPlay={handleToggleDemoPlay}
                    onReplayDemo={handleReplayDemo}
                    onToggleDemoFailover={handleToggleDemoFailover}
                    onExitDemo={handleExitDemo}
                    onClearSession={handleClearSession}
                    onShowToast={showToast}
                  />
                </>
              )}

              {activeTab === 'firstaid' && <FirstAidChecklist />}

              {activeTab === 'architecture' && <ArchitectureGuide />}

              {activeTab === 'about' && (
                <AboutProject
                  onOpenArchitecture={() => {
                    setActiveTab('architecture');
                    window.scrollTo(0, 0);
                  }}
                  onOpenTracker={() => {
                    setActiveTab('tracker');
                    window.scrollTo(0, 0);
                  }}
                />
              )}
            </motion.div>
          </main>

          <footer className="no-print border-t border-slate-900/90 bg-slate-950/70 backdrop-blur-sm py-6 px-4 text-center text-xs sm:text-sm text-slate-300 space-y-2">
            <div>
              LacakHP Open-Source Charity • Zero-Knowledge E2EE • Tanpa Server
              Pelacakan Terpusat •{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('about');
                  window.scrollTo(0, 0);
                }}
                className="text-sky-400 hover:underline font-semibold"
              >
                Tentang Projek (Inisiator: Sena)
              </button>
            </div>
            <div className="text-xs text-amber-300/90 max-w-2xl mx-auto leading-relaxed">
              Projek Amal Open-Source Demi Mendukung Tugas Kepolisian — Kami
              tidak pernah meminta biaya, transfer uang, PIN, atau kode OTP
              untuk membuka lokasi.
            </div>
          </footer>
        </div>

        {/* Floating Toast */}
      <div
        className={`no-print fixed bottom-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl sm:rounded-full bg-slate-900/95 border border-slate-700 text-xs sm:text-sm font-medium text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-300 ${
          toast.visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        {toast.ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <span>{toast.msg}</span>
      </div>
    </div>
    </MotionConfig>
  );
};

export default App;
