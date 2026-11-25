import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  BookOpenCheck,
  GitPullRequest,
  ShieldCheck,
  Play,
  ChevronDown,
  X,
  Server,
  Smartphone,
  HeartHandshake,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Share2,
  Scale,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { LegalConsentModal } from './LegalConsentModal';
import { useReleaseInfo, shortCertFingerprint } from '../lib/releaseInfo';

interface WelcomeBannerProps {
  hasMagicHash: boolean;
  onStartDemo: () => void;
  onOpenArchitecture: () => void;
}

const INSTALL_STEPS = [
  {
    icon: <Download className="w-4 h-4 text-emerald-400 shrink-0" />,
    title: '1. Unduh & Ketuk "Tetap Instal"',
    desc: 'Buka file lacakhp-resmi.apk. Jika muncul peringatan browser/Play Protect ("File mungkin berbahaya" / "Aplikasi tidak dikenal"), ketuk "Detail selengkapnya" lalu pilih "Tetap instal (Install anyway)".',
  },
  {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    title: '2. Buka "Setelan Terbatas" (HyperOS / Android 13–15)',
    desc: 'Jika izin SMS terkunci: buka Pengaturan → Aplikasi → LacakHP. Di Xiaomi HyperOS gulir ke PALING BAWAH layar (di Samsung/lainnya ketuk titik tiga ⋮ di kanan atas) → ketuk "Izinkan setelan terbatas", lalu di menu Izin ubah SMS ke "Selalu izinkan".',
  },
  {
    icon: <Lock className="w-4 h-4 text-sky-400 shrink-0" />,
    title: '3. Aktifkan Perlindungan Wajib',
    desc: 'Di Bagian 2 aplikasi, aktifkan Lokasi ("Izinkan sepanjang waktu"), Izin SMS, Bebas Hemat Baterai ("Tidak dibatasi"), Kunci Anti-Uninstall, & Kunci SIM Sah.',
  },
  {
    icon: <Share2 className="w-4 h-4 text-indigo-400 shrink-0" />,
    title: '4. Kirim Tautan 1-Klik ke WA Keluarga',
    desc: 'Ketuk "Kirim Kartu Darurat ke WhatsApp" di Bagian 1 aplikasi agar keluarga bisa langsung membuka peta https://lacakinhp110.my.id dengan 1 klik saat darurat.',
  },
];

const CONTRIBUTE_ROLES = [
  {
    icon: <Smartphone className="w-4 h-4 text-sky-400" />,
    title: 'Android & Web UI',
    desc: 'Bantu PR Kotlin (`tracker-android`), UI React (`tracker-web`), atau uji di berbagai merk HP.',
  },
  {
    icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    title: 'Audit Kriptografi',
    desc: 'Review implementasi AES-256-GCM, BIP-340 Schnorr, dan metadata privacy di Nostr.',
  },
  {
    icon: <Server className="w-4 h-4 text-amber-400" />,
    title: 'Relay Relawan',
    desc: 'Jalankan node Nostr relay sukarela di VPS agar pengiriman warga makin cepat & stabil.',
  },
  {
    icon: <HeartHandshake className="w-4 h-4 text-indigo-400" />,
    title: 'Relawan & Edukasi',
    desc: 'Bantu sebarkan ke keluarga, pasang APK darurat, atau beri masukan UX untuk masyarakat.',
  },
];

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  hasMagicHash,
  onStartDemo,
  onOpenArchitecture,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(hasMagicHash);
  const [activeDrawer, setActiveDrawer] = useState<'install' | 'contribute' | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const releaseInfo = useReleaseInfo();

  useEffect(() => {
    if (hasMagicHash) {
      setCollapsed(true);
    }
  }, [hasMagicHash]);

  const handleConfirmDownload = () => {
    const link = document.createElement('a');
    link.href = '/lacakhp-resmi.apk';
    link.download = 'lacakhp-resmi.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActiveDrawer('install');
  };

  return (
    <div className="no-print max-w-7xl mx-auto mb-4">
      <SpotlightCard
        as="section"
        tone="radar"
        radius={640}
        restingBgClassName={collapsed ? 'bg-slate-900/90' : 'bg-slate-950/60'}
        hoverBgClassName={collapsed ? 'bg-slate-800/90' : 'bg-slate-950/80'}
        restingBorderClassName="border-slate-800/85"
        className="w-full transition-colors duration-200"
        contentClassName="p-0"
      >
        {/* Persistent Accordion Header Bar — zero layout jump, zero delay, unmistakable Buka / Tutup */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          className="w-full flex items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-3 text-left transition min-h-[48px] touch-manipulation hover:bg-slate-800/35"
        >
          <span className="inline-flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-snug line-clamp-2 sm:line-clamp-1">
              Unduh APK Android Resmi LacakHP &amp; Panduan Instalasi 4 Langkah
            </span>
          </span>

          {collapsed ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-[11px] font-semibold text-sky-300 shrink-0">
              <span>Buka</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/35 text-[11px] font-semibold text-rose-200 shrink-0">
              <span>Tutup</span>
              <X className="w-3.5 h-3.5 shrink-0" />
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="welcome-body"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="p-4 sm:p-6 pt-4 border-t border-slate-800/80">
                <div className="space-y-2.5 max-w-3xl min-w-0">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>open-source • nirlaba • zero-knowledge</span>
                  </div>

                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-white leading-snug">
                    Aplikasi tambahan untuk menjaga &amp; melacak handphone yang
                    hilang — gratis, privat, dan tanpa server pusat.
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Dibangun secara sukarela sebagai projek amal open-source demi
                    mendukung tugas kepolisian &amp; membantu masyarakat melacak
                    perangkat hilang secara privat. Kami{' '}
                    <b className="text-amber-300">
                      tidak pernah meminta biaya, transfer uang, PIN, atau kode
                      OTP
                    </b>{' '}
                    untuk membuka lokasi.
                  </p>

                  {/* Clean Action Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLegalModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition min-h-[44px] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Unduh APK Resmi (Internet + SMS)</span>
                    </button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() =>
                        setActiveDrawer((prev) =>
                          prev === 'install' ? null : 'install'
                        )
                      }
                      className={`flex-1 min-w-[130px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition min-h-[42px] ${
                        activeDrawer === 'install'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/90 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                      }`}
                    >
                      <BookOpenCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Cara Pasang APK</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={onStartDemo}
                      className="flex-1 min-w-[130px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-sky-300 transition min-h-[42px]"
                    >
                      <Play className="w-3.5 h-3.5 shrink-0" />
                      <span>Coba Demo Peta</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() =>
                        setActiveDrawer((prev) =>
                          prev === 'contribute' ? null : 'contribute'
                        )
                      }
                      className="flex-1 min-w-[110px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition min-h-[42px]"
                    >
                      <GitPullRequest className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Kontribusi</span>
                    </motion.button>

                    <button
                      type="button"
                      onClick={onOpenArchitecture}
                      className="flex-1 min-w-[120px] sm:flex-initial sm:min-w-0 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition min-h-[40px]"
                    >
                      <span>Lihat Arsitektur</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Expandable 4-Step Layperson APK Installation Guide */}
                <AnimatePresence initial={false}>
                  {activeDrawer === 'install' && (
                    <motion.div
                      key="drawer-install"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              Panduan Instalasi APK untuk Masyarakat (4 Langkah Mudah)
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 break-all">
                            Versi Lengkap v{releaseInfo.versionName} (~12 MB) • Signature SHA-256: {shortCertFingerprint(releaseInfo.certSha256)}
                          </span>
                        </div>

                        {/* Educational Box: Why Android / Play Protect shows a warning */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] sm:text-xs text-amber-100/95 leading-relaxed space-y-1">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              Perlu Diketahui Masyarakat: Mengapa Muncul Peringatan
                              &ldquo;File Berbahaya / Aplikasi Tidak Dikenal&rdquo;?
                            </span>
                          </div>
                          <p className="text-slate-200/95">
                            Peringatan tersebut adalah respons standar Android untuk
                            semua aplikasi yang diunduh langsung dari luar Google
                            Play Store, terlebih karena LacakHP meminta{' '}
                            <b>izin akses penuh yang memang diharuskan demi keamanan</b>{' '}
                            — seperti <b>SMS Darurat Otomatis</b> (agar HP tetap
                            bisa dilacak &amp; dikunci saat kuota/internet mati),{' '}
                            <b>Lokasi Latar Belakang Sepanjang Waktu</b>, serta{' '}
                            <b>Administrator Perangkat (Anti-Uninstall)</b> agar
                            aplikasi tidak bisa dihapus pencuri. Seluruh kode
                            LacakHP bersifat terbuka (<i>open-source</i>),
                            dienkripsi Zero-Knowledge, dan telah diverifikasi dengan
                            tanda tangan kriptografi SHA-256 resmi.
                          </p>
                        </div>

                        {/* Legal & Anti-Spying Warning Notice */}
                        <div className="bg-rose-950/30 border border-rose-500/35 rounded-xl p-3 text-[11px] sm:text-xs text-rose-100/90 leading-relaxed space-y-1">
                          <div className="font-bold text-rose-300 flex items-center gap-1.5">
                            <Scale className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Peringatan Hukum &amp; Etika Penggunaan (UU ITE &amp; UU PDP):</span>
                          </div>
                          <p className="text-slate-300">
                            Aplikasi LacakHP diperuntukkan <b>khusus perlindungan HP milik sendiri atau keluarga yang sah</b>. Dilarang keras dipasang secara sembunyi-sembunyi untuk memata-matai atau melacak orang lain tanpa izin (melanggar <b>Pasal 30 &amp; 31 UU ITE</b> ancaman pidana penjara hingga 10 tahun / denda Rp 800 Juta, serta <b>Pasal 65 UU PDP No. 27/2022</b> ancaman denda Rp 5 Miliar).
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {INSTALL_STEPS.map((step, i) => (
                            <motion.div
                              key={step.title}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: i * 0.04,
                                duration: 0.22,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="bg-slate-950/85 border border-slate-800/90 rounded-xl p-3 space-y-1.5"
                            >
                              <div className="flex items-center gap-2 text-xs font-bold text-white">
                                {step.icon}
                                <span>{step.title}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {step.desc}
                              </p>
                            </motion.div>
                          ))}
                        </div>

                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-3 text-[11px] text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 leading-relaxed">
                          <span>
                            <b className="text-sky-300">
                              Tips Agar Pelacak Tidak Mati Sendiri (Samsung / Xiaomi / Oppo / Vivo):
                            </b>{' '}
                            Tekan &amp; tahan ikon <b>LacakHP</b> di layar HP &#8594;
                            pilih <b>Info Aplikasi</b> &#8594; masuk ke{' '}
                            <b>Baterai</b> &#8594; pilih <b>Tidak dibatasi</b>{' '}
                            (untuk Xiaomi, nyalakan juga <i>Mulai otomatis</i>).
                            Setelah itu, tekan tombol daftar aplikasi terbuka
                            (ikon <b>&#9776; / &#9634;</b> di bawah layar), lalu
                            ketuk ikon <b>Gembok (Kunci)</b> pada jendela LacakHP
                            agar tidak ikut mati saat membersihkan memori HP.
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsLegalModalOpen(true)}
                            className="text-emerald-400 hover:underline font-semibold shrink-0 self-end sm:self-center cursor-pointer"
                          >
                            Unduh Ulang File APK &#8594;
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeDrawer === 'contribute' && (
                    <motion.div
                      key="drawer-contribute"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {CONTRIBUTE_ROLES.map((role, i) => (
                          <motion.div
                            key={role.title}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: i * 0.04,
                              duration: 0.22,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-1.5"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                              {role.icon}
                              <span>{role.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {role.desc}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SpotlightCard>

      {/* Legal Consent & Anti-Spying Modal */}
      <LegalConsentModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        onConfirmDownload={handleConfirmDownload}
      />
    </div>
  );
};
