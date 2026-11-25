import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, AlertTriangle, X, Download } from 'lucide-react';

interface LegalConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDownload: () => void;
}

export const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirmDownload,
}) => {
  const [agreed, setAgreed] = useState<boolean>(false);

  // Reset agreement on open
  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    if (!agreed) return;
    onConfirmDownload();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl overflow-hidden z-10 text-slate-200"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                    Peringatan Hukum &amp; Etika Penggunaan
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                      UU ITE Pasal 30 &amp; 31
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                      UU PDP No. 27/2022
                    </span>
                  </div>
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

            {/* Content Body */}
            <div className="p-4 sm:p-5 space-y-3.5 text-sm leading-relaxed max-h-[70vh] overflow-y-auto">
              <p className="text-slate-100">
                Aplikasi <b>LacakHP</b> dibangun secara sukarela murni untuk{' '}
                <span className="text-emerald-300 font-semibold">
                  perlindungan darurat perangkat pribadi, inventaris kerja sah,
                  atau perlindungan keluarga atas persetujuan bersama
                </span>.
              </p>

              {/* Sanction Box */}
              <div className="rounded-xl bg-rose-950/35 border border-rose-500/35 p-4 space-y-2.5 text-rose-100 text-[0.8125rem] sm:text-sm">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>DILARANG KERAS MEMATA-MATAI ATAU MENYADAP:</span>
                </div>
                <p className="text-slate-100 leading-relaxed">
                  Memasang aplikasi ini secara diam-diam tanpa izin pada HP milik
                  orang lain untuk memata-matai (<i>stalking</i>) atau melacak
                  lokasi secara melawan hukum merupakan <b>Tindak Pidana Kejahatan Siber</b>:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-[0.8125rem]">
                  <li>
                    <b>Pasal 30 &amp; 31 UU ITE:</b> Pidana penjara hingga{' '}
                    <span className="text-rose-300 font-bold">10 Tahun</span> dan/atau
                    denda hingga <span className="text-rose-300 font-bold">Rp 800 Juta</span>.
                  </li>
                  <li>
                    <b>Pasal 65 jo. 67 UU Pelindungan Data Pribadi:</b> Pidana
                    penjara hingga <span className="text-rose-300 font-bold">5 Tahun</span> dan/atau
                    denda hingga <span className="text-rose-300 font-bold">Rp 5 Miliar</span>.
                  </li>
                </ul>
              </div>

              <p className="text-xs text-slate-300 italic">
                * Inisiator dan pengembang LacakHP berlepas diri dari segala
                bentuk penyalahgunaan yang melanggar hukum dan norma kemanusiaan.
              </p>

              {/* Consent Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-700 cursor-pointer hover:border-slate-600 transition select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[0.8125rem] sm:text-sm text-slate-100 leading-snug">
                  Saya menyatakan bahwa aplikasi ini{' '}
                  <b>hanya akan saya pasang pada perangkat milik saya pribadi</b>{' '}
                  atau keluarga atas persetujuan yang sah demi keperluan
                  keselamatan.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[0.8125rem] font-semibold text-slate-200 transition text-center min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!agreed}
                onClick={handleConfirm}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[0.8125rem] font-bold transition shadow-lg min-h-[44px] ${
                  agreed
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                }`}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Saya Setuju &amp; Unduh APK</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
