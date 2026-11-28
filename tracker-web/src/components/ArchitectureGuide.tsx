import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Server,
  Globe,
  Lock,
  Unlock,
  KeyRound,
  MapPin,
  FileText,
  WifiOff,
  BatteryWarning,
  Shield,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  FileCheck2,
  Upload,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { LegalConsentModal } from './LegalConsentModal';
import {
  useReleaseInfo,
  computeBufferSha256Hex,
  verifyApkHash,
  getProvisioningApkUrl,
  triggerApkDownload,
  GITHUB_REPO_URL,
  GITHUB_RELEASES_URL,
} from '../lib/releaseInfo';
import {
  encodeQrMatrix,
  buildQrSvgPath,
  hexSha256ToBase64UrlNoPad,
} from '../lib/qrSvg';

const STORY_STEPS = [
  {
    num: '01',
    short: 'Buat ID & Kunci',
    badge: 'TAHAP 1 • DI HP PEMILIK',
    title: 'Buat ID Perangkat & Kunci Rahasia (Sandi / 12 Kata Seed)',
    desc: 'Pemilik HP cukup membuat ID Perangkat + Kunci Rahasia (kata sandi pribadi atau 12 kata seed), lalu membagikan Tautan 1-Klik ke WhatsApp keluarga. Setiap titik GPS langsung dikunci AES-256-GCM sebelum keluar dari HP.',
    accent: 'sky',
  },
  {
    num: '02',
    short: 'Dekripsi Lokal',
    badge: 'TAHAP 2 • DI BROWSER KELUARGA',
    title: 'Browser Keluarga Membuka Enkripsi Langsung di RAM',
    desc: 'Saat darurat, keluarga cukup membuka Tautan 1-Klik (#hash tidak pernah terkirim ke server). Browser mengambil paket terenkripsi dari relay Nostr lalu mendekripsinya secara lokal — tanpa login akun dan tanpa OTP.',
    accent: 'emerald',
  },
  {
    num: '03',
    short: 'Peta Live & Bukti',
    badge: 'TAHAP 3 • AKSI LAPANGAN',
    title: 'Pantau Peta Live, Ekspor Bukti Polisi & Siaga SMS Offline',
    desc: 'Koordinat bersih tampil real-time di peta (loncatan BTS disaring otomatis), siap dibuka di Google Maps atau dicetak PDF / CSV / GPX untuk laporan kepolisian. Jika internet dimatikan, jalur SMS darurat tetap siaga.',
    accent: 'indigo',
  },
] as const;

const STEP_DURATION_MS = 5500;

export const ArchitectureGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const releaseInfo = useReleaseInfo();
  const [copiedAdb, setCopiedAdb] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeOwnerTab, setActiveOwnerTab] = useState<'shizuku' | 'adb' | 'qr'>('shizuku');

  const adbCommand = 'adb shell dpm set-device-owner com.lacakhp.app/.TrackerAdminReceiver';
  const signatureChecksumB64Url =
    hexSha256ToBase64UrlNoPad(releaseInfo.certSha256) ||
    '4xANYVV7SR9l5LJCy0MpJSc7fJb1VSfKJ6nrSMOOB0g';
  const provisioningPayloadObj = {
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME':
      'com.lacakhp.app/.TrackerAdminReceiver',
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION':
      getProvisioningApkUrl(releaseInfo.apkUrl),
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM':
      signatureChecksumB64Url,
  };
  const provisioningJson = JSON.stringify(provisioningPayloadObj, null, 2);
  const provisioningCompactJson = JSON.stringify(provisioningPayloadObj);
  const provisioningQrSvg = React.useMemo(() => {
    try {
      return buildQrSvgPath(encodeQrMatrix(provisioningCompactJson), 4);
    } catch {
      return null;
    }
  }, [provisioningCompactJson]);

  const handleCopyAdb = () => {
    navigator.clipboard.writeText(adbCommand).then(() => {
      setCopiedAdb(true);
      setTimeout(() => setCopiedAdb(false), 2500);
    });
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(provisioningJson).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    });
  };

  const [apkCheckState, setApkCheckState] = useState<{
    status: 'idle' | 'hashing' | 'match' | 'mismatch' | 'error';
    fileName?: string;
    fileSizeMb?: string;
    computedSha256?: string;
    errorMsg?: string;
  }>({ status: 'idle' });

  const handleVerifyLocalApk = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size === 0) {
      setApkCheckState({
        status: 'error',
        fileName: file.name,
        errorMsg: 'File kosong (0 byte).',
      });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setApkCheckState({
        status: 'error',
        fileName: file.name,
        errorMsg: 'Ukuran file melebihi 50 MB (bukan APK resmi LacakHP).',
      });
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setApkCheckState({
      status: 'hashing',
      fileName: file.name,
      fileSizeMb: sizeMb,
    });

    try {
      const buf = await file.arrayBuffer();
      const sha256 = await computeBufferSha256Hex(buf);
      const isMatch = verifyApkHash(sha256, releaseInfo.apkSha256);
      setApkCheckState({
        status: isMatch ? 'match' : 'mismatch',
        fileName: file.name,
        fileSizeMb: sizeMb,
        computedSha256: sha256,
      });
    } catch {
      setApkCheckState({
        status: 'error',
        fileName: file.name,
        errorMsg: 'Gagal membaca file di browser.',
      });
    }
  };

  const handleConfirmDownload = () => {
    triggerApkDownload(releaseInfo.apkUrl);
  };

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STORY_STEPS.length);
    }, STEP_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const current = STORY_STEPS[activeStep];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Interactive Animated Walkthrough Hero */}
      <SpotlightCard
        as="section"
        tone="radar"
        radius={600}
        restingBgClassName="bg-slate-950/75"
        restingBorderClassName="border-slate-800"
        contentClassName="p-4 sm:p-6 space-y-5"
      >
        {/* Header + Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5 max-w-[62ch]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/25">
              <Lock className="w-3.5 h-3.5" />
              <span>Alur Kerja LacakHP (Zero-Knowledge E2EE)</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-50 tracking-tight leading-snug">
              Dari Kunci Rahasia di HP hingga Peta Lokasi di Browser Keluarga
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition shrink-0 min-h-[40px]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-sky-400" />
                <span>Jeda</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Putar</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Clickable Step Pills with Smooth Progress Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {STORY_STEPS.map((step, idx) => {
            const selected = idx === activeStep;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`relative overflow-hidden text-left rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 border transition min-w-0 touch-manipulation ${
                  selected
                    ? 'bg-slate-900/95 border-sky-500/50 text-white shadow-lg shadow-sky-500/5'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <span
                    className={`w-fit font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      selected
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {step.num}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold leading-tight sm:truncate">
                    {step.short}
                  </span>
                </div>
                {selected && (
                  <motion.div
                    key={`progress-${activeStep}-${isPlaying ? 'play' : 'pause'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isPlaying ? 1 : 0.35 }}
                    transition={{
                      duration: isPlaying ? STEP_DURATION_MS / 1000 : 0.25,
                      ease: 'linear',
                    }}
                    style={{ transformOrigin: 'left' }}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Animated Stage + Description */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center rounded-2xl bg-slate-950/90 border border-slate-800/90 p-4 sm:p-5 overflow-hidden">
          {/* Left: Concise Explanation */}
          <div className="lg:col-span-5 space-y-2.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={`copy-${activeStep}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2.5"
              >
                <div className="font-mono text-xs font-bold tracking-wider text-sky-400">
                  {current.badge}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-50 leading-snug">
                  {current.title}
                </h2>
                <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
                  {current.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Crisp Motion Diagram Stage */}
          <div className="lg:col-span-7 min-h-[188px] flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 border border-slate-800/80 p-3.5 sm:p-4 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="stage-0"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col sm:flex-row items-center justify-between gap-3"
                >
                  {/* Phone creating ID + Seedphrase */}
                  <div className="w-full sm:w-[46%] rounded-xl bg-slate-950 border border-indigo-500/35 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-300">
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>HP Pemilik</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[10px]">
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 }}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 truncate"
                      >
                        ID: <span className="text-sky-300">samsung-a21s-7f3a</span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 flex items-center gap-1.5 truncate"
                      >
                        <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-amber-300 truncate">awan batik fajar ...</span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px]"
                      >
                        PBKDF2 100k + AES-256-GCM
                      </motion.div>
                    </div>
                  </div>

                  {/* Animated Encrypted Packet Track */}
                  <div className="flex sm:flex-col items-center justify-center gap-1.5 shrink-0 py-1">
                    <div className="relative w-20 sm:w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        animate={{ x: ['-100%', '220%'] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.7,
                          ease: 'easeInOut',
                        }}
                        className="w-10 h-full rounded-full bg-gradient-to-r from-transparent via-sky-400 to-indigo-400"
                      />
                    </div>
                    <span className="font-mono text-[9px] text-sky-400 whitespace-nowrap">
                      v1:r7KpQ9...
                    </span>
                  </div>

                  {/* Blind Relay Node */}
                  <div className="w-full sm:w-[34%] rounded-xl bg-slate-950 border border-amber-500/30 p-3 space-y-1.5 text-center">
                    <motion.div
                      animate={{ scale: [1, 1.07, 1] }}
                      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                      className="mx-auto w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400"
                    >
                      <Server className="w-4 h-4" />
                    </motion.div>
                    <div className="text-[11px] font-bold text-white">Nostr Relay</div>
                    <div className="text-[10px] text-amber-300/85 leading-snug">
                      Hanya melihat teks acak, tak bisa membaca lokasi
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="stage-1"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="w-full space-y-3"
                >
                  {/* Top Bar: Magic Link Hash Privacy */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px]">
                    <span className="text-slate-400 truncate">
                      lacakinhp110.my.id/
                      <span className="text-emerald-400 font-semibold">#id=...&amp;key=...</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] shrink-0">
                      #hash hanya di RAM browser
                    </span>
                  </div>

                  {/* Cipher -> Local Unlock -> Plaintext */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="w-full sm:w-[35%] rounded-xl bg-slate-950 border border-amber-500/30 p-2.5 font-mono text-[10px] space-y-1">
                      <div className="text-slate-500 text-[9px]">PAKET DARI RELAY</div>
                      <div className="text-amber-300 break-all leading-tight">
                        v1:9fA3kL...:mZ4tYpQ1x8...
                      </div>
                    </div>

                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 0px rgba(16,185,129,0.0)',
                          '0 0 18px rgba(16,185,129,0.45)',
                          '0 0 0px rgba(16,185,129,0.0)',
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold shrink-0"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Dekripsi Lokal</span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="w-full sm:w-[37%] rounded-xl bg-slate-950 border border-emerald-500/40 p-2.5 font-mono text-[10px] space-y-1"
                    >
                      <div className="text-emerald-400 text-[9px] font-bold">TERBUKA DI BROWSER</div>
                      <div className="text-white">-5.154884, 105.299902</div>
                      <div className="text-slate-400">±15m (gps) • Bat 82%</div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="stage-2"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="w-full grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  {/* Stylized Animated Mini Radar Map */}
                  <div className="sm:col-span-7 relative h-36 rounded-xl bg-slate-950 border border-sky-500/30 overflow-hidden p-3">
                    {/* Subtle Grid */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }}
                    />
                    <svg
                      viewBox="0 0 240 120"
                      className="relative z-10 w-full h-full"
                      aria-hidden="true"
                    >
                      <motion.path
                        d="M 28 92 Q 86 78, 118 56 T 192 36"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="220"
                        initial={{ strokeDashoffset: 220, opacity: 0.4 }}
                        animate={{ strokeDashoffset: 0, opacity: 0.95 }}
                        transition={{ duration: 1.35, ease: 'easeOut' }}
                      />
                      <circle cx="28" cy="92" r="4" fill="#6366f1" stroke="#e2e8f0" strokeWidth="1.5" />
                      <circle cx="118" cy="56" r="4" fill="#6366f1" stroke="#e2e8f0" strokeWidth="1.5" />
                      <motion.circle
                        cx="192"
                        cy="36"
                        r="8"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        animate={{ r: [8, 24], opacity: [0.85, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                      />
                      <circle cx="192" cy="36" r="5.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                    </svg>
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-sky-300 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Radar Live
                      </span>
                      <span className="text-emerald-400">Loncatan BTS disaring</span>
                    </div>
                  </div>

                  {/* Action Output Pills */}
                  <div className="sm:col-span-5 space-y-2 text-[11px]">
                    {[
                      {
                        icon: MapPin,
                        color: 'text-sky-400',
                        title: 'Navigasi Google Maps',
                        sub: '1-klik menuju titik akurat',
                      },
                      {
                        icon: FileText,
                        color: 'text-emerald-400',
                        title: 'Bukti Laporan Polisi',
                        sub: 'Cetak PDF & ekspor CSV/GPX',
                      },
                      {
                        icon: MessageSquare,
                        color: 'text-amber-400',
                        title: 'Cadangan SMS Offline',
                        sub: 'Perintah LACAK / KUNCI / BUNYI',
                      },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 * i }}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800"
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                          <div className="min-w-0">
                            <div className="font-bold text-white leading-tight truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {item.sub}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SpotlightCard>

      {/* Visual Data Flow Pipeline */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <SpotlightCard
          radius={340}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, type: 'spring', stiffness: 320, damping: 28 }}
          contentClassName="p-5 flex flex-col justify-between space-y-3 h-full"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-slate-300">
                TAHAP 1 • DI HP PEMILIK
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 leading-snug">
              Enkripsi AES-256-GCM Sebelum Keluar HP
            </h2>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
              Koordinat GPS satelit diacak menjadi teks sandi acak langsung di
              memori HP memakai kunci yang diturunkan dari{' '}
              <b>ID Perangkat + Kata Sandi / 12 Kata Seed</b>.
            </p>
          </div>
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 font-mono text-[0.6875rem] text-emerald-400 leading-relaxed">
            Plaintext: &#123;"lat":-6.175,"lng":106.827,"bat":14&#125;
            <br />
            <span className="text-slate-400">&#8595; AES-256-GCM + IV Acak</span>
            <br />
            <span className="text-sky-400">Cipher: v1:r7KpQ9x...:mZ4tYpQ1...</span>
          </div>
        </SpotlightCard>

        <SpotlightCard
          radius={340}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 320, damping: 28 }}
          contentClassName="p-5 flex flex-col justify-between space-y-3 h-full"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-slate-300">
                TAHAP 2 • NOSTR RELAY
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 leading-snug">
              Jalur Relay Terdesentralisasi (Tak Bisa Melihat Isi Lokasi)
            </h2>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
              Titik lokasi yang sudah terkunci dikirim lewat WebSocket ke
              jaringan relay Nostr independen (<code>damus.io</code>,{' '}
              <code>nos.lol</code>, <code>primal.net</code>). Server relay
              hanya meneruskan paket terenkripsi berisi huruf acak dan sama
              sekali tidak dapat membaca posisi Anda.
            </p>
          </div>
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs text-amber-200 flex items-center gap-2 leading-relaxed">
            <ArrowRight className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Jika 1 relay sedang gangguan/down, 2 relay lain otomatis menjadi
              cadangan.
            </span>
          </div>
        </SpotlightCard>

        <SpotlightCard
          radius={340}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, type: 'spring', stiffness: 320, damping: 28 }}
          contentClassName="p-5 flex flex-col justify-between space-y-3 h-full"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-slate-300">
                TAHAP 3 • DI BROWSER ANDA
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 leading-snug">
              Dekripsi Lokal &amp; Tautan 1-Klik (#Hash)
            </h2>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
              Browser keluarga membuka enkripsi langsung di RAM perangkat
              mereka. Pada tautan 1-klik (<code>#id=...&amp;key=...</code>),
              bagian setelah tanda <b>#</b> tidak pernah dikirim ke server
              Vercel.
            </p>
          </div>
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 font-mono text-[0.6875rem] text-slate-200 leading-relaxed">
            HTTP ke Vercel: <span className="text-emerald-400">GET /</span>{' '}
            <span className="text-slate-400">(Bersih!)</span>
            <br />
            Lokal JS Browser:{' '}
            <span className="text-sky-400">Baca #hash &#8594; Buka Peta</span>
          </div>
        </SpotlightCard>
      </section>

      {/* Resilience Features Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SpotlightCard
          radius={360}
          contentClassName="p-5 flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-xl bg-slate-800 text-sky-400 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 leading-snug">
              Antrean Kotak Hitam SQLite (Offline-First)
            </h3>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
              Meski SIM dicabut atau kuota mati, chip GPS satelit tidak butuh
              internet. HP tetap mencatat hingga 2.000 titik ke SQLite lokal dan
              langsung mengirimkannya begitu terhubung ke WiFi mana pun.
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard
          radius={360}
          contentClassName="p-5 flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 leading-snug">
              Perintah SMS Darurat, Kunci Layar &amp; Anti-SIM Swap
            </h3>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
              Nomor keluarga bisa mengirim SMS <code>LACAK</code>,{' '}
              <code>LACAK KUNCI</code> (kunci paksa layar HP), atau{' '}
              <code>LACAK BUNYI</code> saat data seluler mati. Jika pencuri
              memasang kartu SIM baru, HP diam-diam mengirim SMS peringatan
              lokasi memakai pulsa kartu baru tersebut.
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard
          radius={360}
          contentClassName="p-5 flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400 shrink-0">
            <BatteryWarning className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 leading-snug">
              Last-Gasp Baterai &le; 8%, Matikan Daya &amp; Mode Pesawat
            </h3>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
              Saat baterai kritis &le; 8%, tombol Matikan Daya ditekan paksa,
              atau Mode Pesawat dinyalakan, HP otomatis mengunci koordinat GPS
              terakhir ke kotak hitam SQLite dan menembakkan laporan darurat ke
              Nostr Relay serta SMS keluarga sebelum sinyal putus.
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard
          radius={360}
          contentClassName="p-5 flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 leading-snug">
              Anti-Uninstall, Direct Boot, Stealth &amp; Deteksi Salah PIN
            </h3>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
              Administrator Perangkat mengunci tombol Uninstall dan mendeteksi
              percobaan salah PIN layar kunci (3x kirim ke Nostr, 5x kirim SMS
              darurat). Mendukung Mode Penyamaran (<i>Stealth</i> menjadi{' '}
              <b>Layanan Sistem</b>) serta Direct Boot sebelum PIN dibuka.
            </p>
          </div>
        </SpotlightCard>
      </section>

      {/* Honest Comparison: Stacked Cards on Mobile, Clean Table on Desktop */}
      <SpotlightCard
        as="section"
        radius={580}
        restingBgClassName="bg-slate-950/60"
      >
        <div className="p-4 sm:p-6 border-b border-slate-800 max-w-[66ch]">
          <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
            Perbandingan Realistis: Kenapa Tidak Hanya Mengandalkan Google Find
            My Device?
          </h2>
          <p className="text-[0.8125rem] sm:text-sm text-slate-200 mt-1 leading-relaxed">
            LacakHP hadir sebagai jaring pengaman (<i>fail-safe</i>) ketika akses
            akun Google terkunci di saat paling genting.
          </p>
        </div>

        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-slate-800/80">
          {[
            {
              title: 'Akses dari HP Keluarga',
              google:
                'Sering terkunci verifikasi 2FA / OTP ke HP yang justru hilang',
              lacakhp:
                'Klik tautan 1-klik di WA, langsung buka peta tanpa login/OTP',
            },
            {
              title: 'Data Seluler Mati / Habis Kuota',
              google: 'Tidak bisa meminta lokasi aktif via internet',
              lacakhp:
                'Bisa dipancing via SMS LACAK (versi Lengkap) + catat rute satelit ke SQLite',
            },
            {
              title: 'Privasi Data Lokasi',
              google: 'Tersimpan di server terpusat perusahaan',
              lacakhp: '100% Zero-Knowledge AES-256-GCM (admin pun buta)',
            },
            {
              title: 'Jika HP Di-Factory Reset Paksa',
              google: 'Mengunci perangkat dengan FRP (Factory Reset Protection)',
              lacakhp:
                'Aplikasi terhapus wipe data (kecuali Device Owner Level 2 aktif); tetap andalkan FRP bawaan + riwayat jejak sebelum reset',
            },
          ].map((row) => (
            <div key={row.title} className="p-4 space-y-2 text-[0.8125rem]">
              <div className="font-bold text-slate-100 text-sm">{row.title}</div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 leading-relaxed">
                <div className="text-slate-300">
                  <span className="font-semibold text-slate-200">Google: </span>
                  {row.google}
                </div>
                <div className="text-emerald-200 border-t border-slate-800/80 pt-2">
                  <span className="font-semibold text-sky-300">LacakHP: </span>
                  {row.lacakhp}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-[0.8125rem] sm:text-sm">
            <thead className="bg-slate-950/75 text-slate-200 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Skenario Lapangan</th>
                <th className="py-3.5 px-4 font-semibold">Google Find My Device</th>
                <th className="py-3.5 px-4 font-semibold text-sky-300">
                  LacakHP (Charity Open-Source)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 leading-relaxed">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-100">
                  Akses dari HP Keluarga
                </td>
                <td className="py-3.5 px-4 text-slate-300">
                  <span className="inline-flex items-center gap-1.5 text-rose-200">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" /> Sering
                    terkunci verifikasi 2FA / OTP ke HP yang justru hilang
                  </span>
                </td>
                <td className="py-3.5 px-4 text-emerald-200">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Klik
                    tautan 1-klik di WA, langsung buka peta tanpa login/OTP
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-100">
                  Data Seluler Dimatikan / Habis Kuota
                </td>
                <td className="py-3.5 px-4 text-slate-300">
                  Tidak bisa meminta lokasi aktif via internet
                </td>
                <td className="py-3.5 px-4 text-emerald-200">
                  Bisa dipancing via SMS <code>LACAK</code> (versi Lengkap) +
                  catat rute satelit ke SQLite
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-100">
                  Privasi Data Lokasi
                </td>
                <td className="py-3.5 px-4 text-slate-300">
                  Tersimpan di server terpusat perusahaan
                </td>
                <td className="py-3.5 px-4 text-emerald-200">
                  100% Zero-Knowledge AES-256-GCM (admin pun buta)
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-100">
                  Jika HP Di-Factory Reset Paksa
                </td>
                <td className="py-3.5 px-4 text-slate-200">
                  Mengunci perangkat dengan FRP (Factory Reset Protection)
                </td>
                <td className="py-3.5 px-4 text-slate-200">
                  Aplikasi terhapus oleh wipe data (kecuali Device Owner Level 2 aktif); tetap andalkan FRP bawaan +
                  riwayat jejak sebelum reset
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SpotlightCard>

      {/* Transparent Permission Disclosure Card */}
      <SpotlightCard
        as="section"
        tone="sky"
        radius={580}
        restingBgClassName="bg-slate-950/70"
        restingBorderClassName="border-sky-500/30"
        contentClassName="p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-400 shrink-0" />
            <h2 className="text-base font-bold text-slate-100">
              Transparansi Izin Aplikasi: Apa yang Dibaca &amp; Dampak Jika
              Dimatikan
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 text-sky-200 border border-sky-500/30">
            Hak Kontrol Penuh Pengguna
          </span>
        </div>

        <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed max-w-[66ch]">
          Demi menghilangkan rasa curiga, berikut rincian jujur mengenai setiap
          izin yang diminta aplikasi Android.{' '}
          <b className="text-sky-300">
            Jika ada izin yang dirasa terlalu pribadi, Anda bebas menolaknya
            atau mematikannya kapan saja
          </b>{' '}
          lewat Pengaturan Izin HP.
        </p>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-[0.8125rem] sm:text-sm text-emerald-100 leading-relaxed max-w-[68ch]">
          <b className="text-emerald-300">Izin yang TIDAK PERNAH diminta LacakHP:</b> Aplikasi tidak meminta
          akses ke <b>Daftar Kontak, Galeri/Foto, Kamera, Mikrofon, File Pribadi,</b>{' '}
          maupun login akun Google Anda.
        </div>

        <details className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden" open>
          <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-2 text-[0.8125rem] sm:text-sm font-semibold text-sky-200 hover:bg-slate-900 transition select-none">
            <span>🔍 Lihat Rincian 3 Izin Utama (Lokasi, Baterai, SMS/Telepon)</span>
            <ChevronDown className="details-chevron w-4 h-4 text-sky-300 shrink-0 transition-transform duration-200" />
          </summary>
          <div className="p-3.5 pt-2 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-[0.8125rem]">
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5 leading-relaxed">
              <div className="font-bold text-slate-100 text-sm">
                1. Izin Lokasi (GPS &amp; Sepanjang Waktu)
              </div>
              <p className="text-slate-200">
                <b>Kenapa diminta:</b> Mengambil titik lokasi satelit ketika HP
                hilang, termasuk saat layar sedang terkunci.
              </p>
              <p className="text-emerald-200">
                <b>Yang dibaca:</b> Hanya koordinat, akurasi, &amp; waktu lalu
                langsung dienkripsi AES-256-GCM sebelum keluar dari HP.
              </p>
              <p className="text-amber-200">
                <b>Jika dimatikan:</b> Pelacakan peta dan balas lokasi SMS tidak
                bisa mengambil posisi terbaru HP (atau berhenti saat layar mati).
              </p>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5 leading-relaxed">
              <div className="font-bold text-slate-100 text-sm">
                2. Bebas Pembatasan Baterai
              </div>
              <p className="text-slate-200">
                <b>Kenapa diminta:</b> Mencegah penghemat baterai bawaan HP
                mematikan proses pelacak saat layar tidur berjam-jam.
              </p>
              <p className="text-emerald-200">
                <b>Yang dibaca:</b> Tidak membaca data pribadi apa pun; hanya cek
                persentase baterai untuk sinyal darurat saat daya &le; 8%.
              </p>
              <p className="text-amber-200">
                <b>Jika dimatikan / dibatasi:</b> Sistem HP dapat menidurkan
                aplikasi pelacak di belakang layar sehingga laporan berhenti.
              </p>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5 leading-relaxed">
              <div className="font-bold text-slate-100 text-sm">
                3. Izin SMS &amp; Telepon (Versi Lengkap)
              </div>
              <p className="text-slate-200">
                <b>Kenapa diminta:</b> Cadangan darurat ketika kuota/Wi-Fi
                dimatikan pencuri serta pendeteksi penggantian kartu SIM.
              </p>
              <p className="text-emerald-200">
                <b>Yang dibaca:</b> TIDAK pernah membaca SMS OTP bank atau isi
                chat SMS pribadi Anda — hanya mengecek SMS yang diawali Kata Kunci
                &amp; PIN Anda.
              </p>
              <p className="text-amber-200">
                <b>Jika dimatikan:</b> Pelacakan via internet (Nostr Relay) tetap
                berjalan normal; hanya perintah SMS darurat &amp; peringatan ganti
                SIM yang tidak aktif.
              </p>
            </div>
          </div>
        </details>
      </SpotlightCard>

      {/* Benteng Proteksi 2 Tingkat: Device Owner (MDM Anti-Hapus Permanen) */}
      <SpotlightCard
        as="section"
        tone="radar"
        radius={600}
        restingBgClassName="bg-slate-950/75"
        restingBorderClassName="border-amber-500/35"
        contentClassName="p-4 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5 max-w-[64ch]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Benteng Anti-Hapus Android Enterprise (Murni Device Owner)</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-50 tracking-tight leading-snug">
              Aktivasi Proteksi 2 Tingkat: Dari Pemilik Awam hingga Benteng Maksimal
            </h2>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
              100% Mematuhi Kebijakan Google Play Protect (Murni izin resmi <code>BIND_DEVICE_ADMIN</code> tanpa modifikasi berbahaya).
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-900 text-amber-300 border border-amber-500/30">
            Paket: com.lacakhp.app
          </span>
        </div>

        {/* 2 Levels Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/85 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sky-300 text-sm">Level 1: Device Administrator (Awam)</span>
              <span className="text-[0.6875rem] font-semibold px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-200 border border-sky-500/25 shrink-0">
                1-Klik di Aplikasi
              </span>
            </div>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
              Cukup ketuk tombol <i>&quot;Aktifkan Administrator Perangkat&quot;</i> di dalam aplikasi LacakHP. Menjaga aplikasi dari pencopotan biasa dan mencatat peringatan jika ada yang salah menebak PIN layar 3 kali.
            </p>
            <div className="text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              Cocok untuk: Penggunaan harian keluarga tanpa butuh koneksi kabel atau alat tambahan.
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/85 border border-amber-500/35 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-300 text-sm">Level 2: Benteng Device Owner (Maksimal)</span>
              <span className="text-[0.6875rem] font-semibold px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/30 shrink-0">
                Anti-Hapus Absolut
              </span>
            </div>
            <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
              Menetapkan LacakHP sebagai pemilik sah sistem (Enterprise MDM). Tombol hapus instalan <b>dinonaktifkan di OS</b>, Factory Reset diblokir, Safe Boot diblokir, dan izin GPS/SMS dikunci permanen.
            </p>
            <div className="text-xs text-amber-200 pt-2 border-t border-amber-500/20">
              Pelepasan sah wajib lolos PIN Layar <b>DAN</b> mengetik ulang Kunci Rahasia LacakHP.
            </div>
          </div>
        </div>

        {/* Interactive Activation Tabs */}
        <div className="space-y-3.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Panduan Aktivasi Level 2 (Pilih Cara Paling Mudah Bagi Anda):</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveOwnerTab('shizuku')}
              className={`px-3.5 py-2 rounded-xl text-[0.8125rem] font-semibold transition touch-manipulation min-h-[42px] ${
                activeOwnerTab === 'shizuku'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              📱 1. Shizuku + aShell (Tanpa PC)
            </button>
            <button
              type="button"
              onClick={() => setActiveOwnerTab('adb')}
              className={`px-3.5 py-2 rounded-xl text-[0.8125rem] font-semibold transition touch-manipulation min-h-[42px] ${
                activeOwnerTab === 'adb'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              💻 2. Terminal ADB (Laptop / Kabel USB)
            </button>
            <button
              type="button"
              onClick={() => setActiveOwnerTab('qr')}
              className={`px-3.5 py-2 rounded-xl text-[0.8125rem] font-semibold transition touch-manipulation min-h-[42px] ${
                activeOwnerTab === 'qr'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              📷 3. QR Provisioning (HP Baru / Reset)
            </button>
          </div>

          {/* Tab Content 1: Shizuku + aShell */}
          {activeOwnerTab === 'shizuku' && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5 text-[0.8125rem] sm:text-sm leading-relaxed">
              <div className="font-bold text-amber-300">
                Cara Paling Praktis Tanpa Butuh Laptop (Cukup dari HP yang Bersangkutan)
              </div>
              <ol className="list-decimal list-inside space-y-2.5 text-slate-200 max-w-[65ch]">
                <li>
                  Pasang aplikasi <b>Shizuku</b> &amp; <b>aShell</b> dari Play Store / GitHub. Aktifkan Shizuku melalui <i>Wireless Debugging</i> (memerlukan sambungan Wi-Fi sebentar).
                </li>
                <li>
                  Buka menu <b>Pengaturan HP &gt; Akun</b>, lalu <b>Hapus / Lepas Sementara Akun Google, Samsung, atau Xiaomi</b> (Ini adalah syarat mutlak keamanan bawaan sistem operasi Android agar perintah penetapan pemilik perangkat diizinkan).
                </li>
                <li>
                  Buka aplikasi <b>aShell</b>, izinkan akses Shizuku, salin perintah di bawah ini dan tekan tombol Enter:
                </li>
              </ol>

              {/* Copyable ADB Command Box */}
              <div className="relative group bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 font-mono text-xs text-sky-300 break-all flex items-center justify-between gap-2">
                <code>{adbCommand}</code>
                <button
                  type="button"
                  onClick={handleCopyAdb}
                  title="Salin Perintah ADB"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-sans font-bold text-xs shrink-0 transition"
                >
                  {copiedAdb ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-slate-200 max-w-[65ch]">
                4. Setelah muncul teks <code>Success: Device owner set to package com.lacakhp.app</code>, silakan <b>login kembali ke Akun Google &amp; Samsung Anda</b>. Seluruh data dan aplikasi tetap aman, dan benteng LacakHP kini aktif permanen!
              </div>
            </div>
          )}

          {/* Tab Content 2: Terminal ADB */}
          {activeOwnerTab === 'adb' && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5 text-[0.8125rem] sm:text-sm leading-relaxed">
              <div className="font-bold text-sky-300">
                Aktivasi Standar via Terminal / Command Prompt Laptop
              </div>
              <ol className="list-decimal list-inside space-y-2.5 text-slate-200 max-w-[65ch]">
                <li>
                  Aktifkan <b>USB Debugging</b> di menu <i>Opsi Pengembang (Developer Options)</i> HP Anda, lalu hubungkan HP ke laptop dengan kabel data.
                </li>
                <li>
                  Lepas sementara akun Google di menu <i>Pengaturan &gt; Akun</i> pada HP Anda.
                </li>
                <li>
                  Buka Terminal (Mac/Linux) atau PowerShell / CMD (Windows) di laptop Anda, lalu jalankan perintah berikut:
                </li>
              </ol>

              {/* Copyable ADB Command Box */}
              <div className="relative group bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 font-mono text-xs text-sky-300 break-all flex items-center justify-between gap-2">
                <code>{adbCommand}</code>
                <button
                  type="button"
                  onClick={handleCopyAdb}
                  title="Salin Perintah ADB"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-sans font-bold text-xs shrink-0 transition"
                >
                  {copiedAdb ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-slate-200 max-w-[65ch]">
                4. Begitu sukses, login kembali ke akun Google Anda. Port USB Debugging pada HP akan <b>otomatis dinonaktifkan</b> oleh LacakHP untuk mencegah laptop asing atau konter servis membobol HP Anda.
              </div>
            </div>
          )}

          {(activeOwnerTab === 'shizuku' || activeOwnerTab === 'adb') && (
            <details className="rounded-xl bg-amber-500/10 border border-amber-500/30 overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-2 text-[0.8125rem] sm:text-sm font-bold text-amber-300 hover:bg-amber-500/15 transition select-none">
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Catatan Penting Per Merk HP agar Tidak Ditolak Android (Samsung / Xiaomi / Oppo &amp; Vivo)
                  </span>
                </span>
                <ChevronDown className="details-chevron w-4 h-4 text-amber-300 shrink-0 transition-transform duration-200" />
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-amber-500/20 space-y-2.5 text-[0.8125rem] sm:text-sm text-slate-100 leading-relaxed max-w-[68ch]">
                <p>
                  <b>1. Semua akun sinkronisasi harus kosong (bukan Google saja):</b>{' '}
                  Di menu <i>Pengaturan &gt; Akun &amp; Sinkronisasi</i>, hapus sementara juga akun <b>WhatsApp</b>, <b>Meet</b>, <b>Samsung/Xiaomi Account</b>, serta akun aplikasi pihak ketiga (misal keyboard sinkronisasi). Setelah menghapus akun terakhir, <b>tunggu ±15–20 detik</b> sebelum menjalankan perintah <code>dpm</code> agar sistem selesai membersihkan sesi.
                </p>
                <p>
                  <b>2. Khusus Xiaomi (MIUI / HyperOS):</b>{' '}
                  Nyalakan <b>Proses debug USB (Setelan keamanan)</b> di Opsi Pengembang (jika meminta login Mi Account untuk menggeser saklar, login sebentar lalu <i>sign out</i> lagi setelah saklar aktif). Anda juga wajib menghapus user <b>Aplikasi Ganda (Dual Apps)</b> lewat <i>Setelan &gt; Aplikasi &gt; Aplikasi ganda &gt; ikon ⚙️ &gt; Hapus akun Aplikasi ganda</i>{' '}
                  <span className="text-amber-200">
                    (peringatan: seluruh data aplikasi kloningan ke-2 akan terhapus, cadangkan terlebih dahulu)
                  </span>
                  . Setelah Device Owner aktif, wajar jika LacakHP tidak muncul di daftar <i>Mulai otomatis</i> karena sudah dikecualikan sistem — cukup izinkan <b>Baterai: Tidak ada pembatasan / Mencegah ponsel tidur</b>.
                </p>
                <p>
                  <b>3. Khusus Oppo / Realme / Vivo:</b>{' '}
                  Aktifkan saklar <b>Matikan pemantauan izin (Disable permission monitoring)</b> di Opsi Pengembang sebelum menjalankan perintah aktivasi.
                </p>
                <p>
                  <b>4. Wajib setelah sukses (FRP &amp; Kunci Panel):</b>{' '}
                  Segera <b>login kembali Akun Google</b> dan pastikan <b>PIN/Sidik Jari layar aktif</b> agar <i>Factory Reset Protection (FRP)</i> mengunci HP jika di-reset lewat tombol fisik, serta nonaktifkan akses <b>Pusat Kontrol / Jaringan di layar terkunci</b>.
                </p>
              </div>
            </details>
          )}

          {/* Tab Content 3: QR Provisioning */}
          {activeOwnerTab === 'qr' && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5 text-[0.8125rem] sm:text-sm leading-relaxed">
              <div className="font-bold text-emerald-300">
                Metode Resmi Google Enterprise untuk HP Baru atau HP yang Baru Di-Reset Pabrik
              </div>
              <p className="text-slate-200 max-w-[65ch]">
                Pada layar selamat datang pertama kali setelah HP di-factory reset (layar <i>&quot;Halo / Selamat Datang&quot;</i>), <b>ketuk layar kosong sebanyak 6 kali berturut-turut</b>. Kamera pemindai QR Enterprise bawaan Android 10–15 akan terbuka otomatis — arahkan kamera langsung ke kode QR di bawah ini:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {provisioningQrSvg && (
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-300 shadow-lg">
                    <svg
                      viewBox={`0 0 ${provisioningQrSvg.viewBoxSize} ${provisioningQrSvg.viewBoxSize}`}
                      shapeRendering="crispEdges"
                      role="img"
                      aria-label="QR Code Provisioning Android Enterprise LacakHP"
                      className="w-52 h-52 sm:w-56 sm:h-56"
                    >
                      <rect
                        width={provisioningQrSvg.viewBoxSize}
                        height={provisioningQrSvg.viewBoxSize}
                        fill="#ffffff"
                      />
                      <path d={provisioningQrSvg.pathD} fill="#000000" />
                    </svg>
                    <span className="mt-2.5 text-xs font-semibold text-slate-800 text-center">
                      100% Digenerate Lokal di Browser • Siap Pindai Ketuk-6x
                    </span>
                  </div>
                )}

                <div className={`${provisioningQrSvg ? 'md:col-span-7' : 'md:col-span-12'} space-y-2 min-w-0`}>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Profil JSON Provisioning Resmi (DevicePolicyManager):</span>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJson ? 'JSON Tersalin' : 'Salin JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[0.6875rem] text-slate-200 overflow-x-auto leading-relaxed">
                    {provisioningJson}
                  </pre>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Checksum tanda tangan kriptografi (Base64URL SHA-256 tanpa padding) dihitung otomatis dari sertifikat rilis resmi <code>{releaseInfo.certSha256.slice(0, 17)}...</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Smart Lockdown Policies Details (Collapsible Layer 2) */}
        <details className="rounded-xl bg-slate-950/90 border border-slate-800/90 overflow-hidden">
          <summary className="px-4 py-3.5 cursor-pointer flex items-center justify-between gap-2 text-[0.8125rem] sm:text-sm font-bold text-slate-100 hover:bg-slate-900/80 transition select-none">
            <span className="flex items-center gap-2 min-w-0">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>6 Perlindungan Mode Cerdas (Smart MDM Policies) Saat Device Owner Aktif (Ketuk untuk detail)</span>
            </span>
            <ChevronDown className="details-chevron w-4 h-4 text-amber-300 shrink-0 transition-transform duration-200" />
          </summary>

          <div className="p-4 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[0.8125rem] leading-relaxed">
            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 block">1. Anti-Hapus Permanen</span>
              <span className="text-slate-200 block">
                Tombol copot pemasangan aplikasi dinonaktifkan di level OS (<code>setUninstallBlocked</code>).
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 block">2. Blokir Factory Reset</span>
              <span className="text-slate-200 block">
                Pencuri tidak bisa menghapus HP melalui menu Setelan (<code>DISALLOW_FACTORY_RESET</code>).
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 block">3. Blokir Safe Mode</span>
              <span className="text-slate-200 block">
                Mencegah pencuri me-restart HP ke Mode Aman untuk mematikan layanan LacakHP (<code>DISALLOW_SAFE_BOOT</code>).
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 block">4. Kunci Izin GPS &amp; SMS</span>
              <span className="text-slate-200 block">
                Izin Lokasi, SMS, &amp; Telepon dikunci permanen sehingga tidak dapat dimatikan sepihak oleh pencuri.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 block">5. Kunci Port USB Debugging</span>
              <span className="text-slate-200 block">
                Port USB ditutup otomatis (<code>DISALLOW_DEBUGGING_FEATURES</code>) agar laptop konter servis ditolak OS.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-300 block">6. Verifikasi Ganda Pemilik</span>
              <span className="text-slate-200 block">
                Pelepasan benteng wajib lolos PIN layar <b>DAN</b> mengetik ulang Kunci Rahasia LacakHP (anti-intip PIN di tempat umum).
              </span>
            </div>
          </div>
        </details>
      </SpotlightCard>

      {/* Official APK Cryptographic Signature & Non-Commercial License Card */}
      <SpotlightCard
        as="section"
        tone="emerald"
        radius={560}
        restingBgClassName="bg-slate-950/75"
        restingBorderClassName="border-emerald-500/30"
        contentClassName="p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-base font-bold text-slate-100">
              Verifikasi Keaslian APK Resmi (SHA-256) &amp; Lisensi Amal
              Non-Komersial
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
            Anti-Clone &amp; Anti-Phishing
          </span>
        </div>

        <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed max-w-[66ch]">
          Meskipun kode sumber dibuka untuk audit transparansi publik dan
          mendukung tugas kepolisian, setiap file APK resmi LacakHP
          ditandatangani dengan kunci kriptografi privat pengembang yang{' '}
          <b>mustahil dipalsukan</b> oleh hasil <i>clone</i> pihak ketiga.
          Cocokkan sidik jari sertifikat di bagian atas aplikasi Android Anda
          dengan kode resmi berikut:
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 font-mono text-xs tabular-nums">
          <div className="text-slate-300">
            Sidik Jari Sertifikat Penandatangan APK Resmi (SHA-256):
          </div>
          <div className="text-emerald-300 break-all font-semibold">
            {releaseInfo.certSha256}
          </div>
          <div className="text-slate-300 pt-1">
            Checksum File APK Resmi (lacakhp-resmi.apk v{releaseInfo.versionName} • SHA-256):
          </div>
          <div className="text-sky-300 break-all">
            {releaseInfo.apkSha256}
          </div>
          <div className="text-slate-300 text-[0.6875rem] pt-1">
            Domain Web Resmi: https://lacakinhp110.my.id • Mirror Resmi:
            https://lacakinhp.pages.dev • Paket Resmi: com.lacakhp.app
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setIsLegalModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[0.8125rem] sm:text-sm font-bold shadow-lg shadow-emerald-500/15 transition min-h-[46px] touch-manipulation cursor-pointer"
          >
            <span>Unduh APK Resmi v{releaseInfo.versionName} (lacakhp-resmi.apk)</span>
          </button>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-300 hover:underline font-semibold"
            >
              <span>GitHub Releases</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-slate-600">•</span>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-200 hover:text-white hover:underline font-medium"
            >
              <span>Source Code</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* Client-Side SHA-256 APK Authenticity Verifier */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer?.files?.[0];
            if (f) void handleVerifyLocalApk(f);
          }}
          className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <FileCheck2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Cek Keaslian File APK di Browser (100% Lokal)</span>
            </div>
            <span className="text-[0.6875rem] font-mono px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25">
              File Tidak Diunggah ke Server
            </span>
          </div>

          <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed max-w-[65ch]">
            Menerima file <code>.apk</code> dari WhatsApp, Telegram, atau pihak
            lain? Pilih atau seret file tersebut ke sini untuk mencocokkan sidik
            jari <b>SHA-256</b>-nya secara langsung di RAM browser Anda dengan
            rilis resmi <b>v{releaseInfo.versionName}</b>.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[0.8125rem] font-semibold text-slate-100 cursor-pointer transition min-h-[44px] touch-manipulation">
              <Upload className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Pilih File .APK untuk Diperiksa</span>
              <input
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  void handleVerifyLocalApk(f);
                  e.target.value = '';
                }}
              />
            </label>
            {apkCheckState.status !== 'idle' && (
              <button
                type="button"
                onClick={() => setApkCheckState({ status: 'idle' })}
                className="text-xs text-slate-300 hover:text-white underline underline-offset-4 px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>

          {apkCheckState.status === 'hashing' && (
            <div className="flex items-center gap-2 text-[0.8125rem] text-sky-200 bg-sky-500/10 border border-sky-500/30 rounded-xl px-3.5 py-3">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                Menghitung hash SHA-256 untuk <b>{apkCheckState.fileName}</b> (
                {apkCheckState.fileSizeMb} MB)...
              </span>
            </div>
          )}

          {apkCheckState.status === 'match' && (
            <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/45 p-3.5 space-y-2 text-[0.8125rem]">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  ASLI &amp; TERVERIFIKASI — 100% Cocok dengan APK Resmi LacakHP v
                  {releaseInfo.versionName}
                </span>
              </div>
              <div className="text-emerald-100 leading-relaxed">
                File <b>{apkCheckState.fileName}</b> ({apkCheckState.fileSizeMb}{' '}
                MB) identik bit-demi-bit dan belum dimodifikasi pihak mana pun.
              </div>
              <div className="font-mono text-xs text-emerald-300 break-all bg-slate-950/85 rounded-lg px-3 py-2 border border-emerald-500/25">
                SHA-256: {apkCheckState.computedSha256}
              </div>
            </div>
          )}

          {apkCheckState.status === 'mismatch' && (
            <div className="rounded-xl bg-rose-950/60 border border-rose-500/50 p-3.5 space-y-2 text-[0.8125rem]">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  TIDAK COCOK — Waspada APK Modifikasi / Palsu atau Versi Lama!
                </span>
              </div>
              <p className="text-rose-100 leading-relaxed">
                Hash file <b>{apkCheckState.fileName}</b> (
                {apkCheckState.fileSizeMb} MB) <b>berbeda</b> dari rilis resmi v
                {releaseInfo.versionName}. Demi keamanan, jangan instal file dari
                sumber tidak jelas — unduh ulang langsung dari tombol resmi di
                atas.
              </p>
              <div className="font-mono text-xs space-y-1 bg-slate-950/85 rounded-lg px-3 py-2 border border-rose-500/30 break-all">
                <div className="text-rose-300">
                  File Anda: {apkCheckState.computedSha256}
                </div>
                <div className="text-emerald-400">
                  Resmi v{releaseInfo.versionName}: {releaseInfo.apkSha256}
                </div>
              </div>
            </div>
          )}

          {apkCheckState.status === 'error' && (
            <div className="flex items-center gap-2 text-[0.8125rem] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{apkCheckState.errorMsg}</span>
            </div>
          )}
        </div>

        <details className="rounded-xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-2 text-xs sm:text-[0.8125rem] font-semibold text-slate-200 hover:bg-slate-900 transition select-none">
            <span>⚖️ Peringatan Hukum &amp; Ketentuan Etika Penggunaan (UU ITE &amp; UU PDP)</span>
            <ChevronDown className="details-chevron w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200" />
          </summary>
          <div className="px-4 pb-3.5 pt-1.5 border-t border-slate-800/80 text-xs sm:text-[0.8125rem] text-slate-200 leading-relaxed max-w-[68ch]">
            Dilarang keras memperjualbelikan aplikasi ini, memungut biaya pembukaan lokasi,
            menyamar menggunakan nama/merek <b>LacakHP</b> pada situs/APK
            modifikasi, atau memasang secara diam-diam untuk memata-matai perangkat
            orang lain tanpa izin sah. Pelanggaran merupakan Tindak Pidana Penyadapan &amp; Ilegal Akses
            berdasarkan <b>Pasal 30 &amp; 31 UU ITE</b> (ancaman penjara hingga 10 tahun / denda Rp 800 Juta)
            serta <b>Pasal 65 UU Pelindungan Data Pribadi No. 27/2022</b> (ancaman penjara hingga 5 tahun / denda Rp 5 Miliar).
          </div>
        </details>
      </SpotlightCard>

      <LegalConsentModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        onConfirmDownload={handleConfirmDownload}
      />
    </div>
  );
};
