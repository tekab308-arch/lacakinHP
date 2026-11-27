import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, ExternalLink, Lock, FileCode2, Scale } from 'lucide-react';
import {
  GITHUB_REPO_URL,
  GITHUB_RELEASES_URL,
  GITHUB_LICENSE_URL,
  GITHUB_SECURITY_URL,
} from '../lib/releaseInfo';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-policy-title"
            className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl overflow-hidden z-10 text-slate-200"
          >
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="privacy-policy-title"
                    className="text-sm sm:text-base font-bold text-white leading-snug"
                  >
                    Kebijakan Privasi &amp; Transparansi Open-Source
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    LacakHP Indonesia • Nirlaba • Zero-Knowledge E2EE
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-[0.8125rem] sm:text-sm leading-relaxed max-h-[70vh] overflow-y-auto">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>1. Kebijakan Tanpa Pengumpulan Data (Zero-Knowledge)</span>
                </div>
                <p className="text-slate-200">
                  Portal web ini berjalan 100% statis di sisi klien (browser). Kami{' '}
                  <b>tidak memiliki server basis data pengguna</b>, tidak memakai
                  cookie pelacak iklan, dan tidak pernah mengirimkan ID Perangkat,
                  Kunci Rahasia, PIN, maupun koordinat GPS Anda ke server hosting.
                  Seluruh dekripsi dilakukan secara lokal di RAM browser Anda.
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sky-300">
                  <FileCode2 className="w-4 h-4 shrink-0" />
                  <span>2. Audit Kode Sumber &amp; Verifikasi APK Resmi</span>
                </div>
                <p className="text-slate-200">
                  Seluruh kode sumber aplikasi Android (<code>tracker-android</code>)
                  dan portal web (<code>tracker-web</code>) dipublikasikan secara
                  terbuka di GitHub untuk diaudit oleh publik, akademisi, dan praktisi
                  keamanan. File APK resmi hanya ditandatangani dengan sertifikat
                  SHA-256 tunggal pengembang dan dapat diperiksa ulang secara lokal di
                  tab <b>Cara Kerja &amp; Keamanan</b>.
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Scale className="w-4 h-4 shrink-0" />
                  <span>3. Ketentuan Penggunaan &amp; Kepatuhan Hukum</span>
                </div>
                <p className="text-slate-200">
                  LacakHP disediakan 100% gratis untuk perlindungan perangkat milik
                  sendiri atau keluarga yang sah. Segala bentuk penyalahgunaan untuk
                  pemantauan tanpa izin (stalkerware) dilarang keras oleh lisensi
                  proyek maupun hukum yang berlaku (UU ITE &amp; UU PDP).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 transition"
                >
                  <span>Repositori GitHub Resmi</span>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                </a>
                <a
                  href={GITHUB_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 transition"
                >
                  <span>Arsip Rilis APK (GitHub Releases)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </a>
                <a
                  href={GITHUB_SECURITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 transition"
                >
                  <span>Kebijakan Keamanan (SECURITY.md)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </a>
                <a
                  href={GITHUB_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 transition"
                >
                  <span>Lisensi Amal Non-Komersial</span>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                </a>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-100 transition"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
