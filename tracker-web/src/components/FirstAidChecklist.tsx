import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  PhoneCall,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
  tip?: {
    label: string;
    detail: string;
  };
  linkLabel?: string;
  linkHref?: string;
  urgent?: boolean;
}

const EMERGENCY_STEPS: ChecklistItem[] = [
  {
    id: 'find-official',
    title: '1. Coba Lacak via LacakHP atau Ekosistem Bawaan',
    desc: 'Jika LacakHP sudah terpasang, langsung buka Tautan 1-Klik di WhatsApp keluarga atau kirim SMS LACAK. Jika LacakHP belum terpasang, pinjam HP keluarga lalu buka Google Find My Device (Android) atau iCloud Find (iPhone) lewat mode Incognito.',
    linkLabel: 'Buka Google Find My Device',
    linkHref: 'https://www.google.com/android/find',
    urgent: true,
  },
  {
    id: 'check-imei',
    title: '2. Selamatkan Data Tipe HP & IMEI',
    desc: 'Jika dus/kotak HP tidak ada di tangan, cek daftar perangkat akun Google Anda untuk melengkapi data tipe perangkat dan nomor IMEI pada laporan resmi ke operator atau kepolisian.',
    linkLabel: 'Cek Google Device Activity',
    linkHref: 'https://myaccount.google.com/device-activity',
  },
  {
    id: 'block-sim',
    title: '3. Kapan Harus Blokir Kartu SIM & Amankan Nomor OTP?',
    desc: 'Hati-hati menentukan urutan langkah ini agar pelacakan tidak terputus sebelum waktunya:',
    tip: {
      label: 'Aturan Emas untuk Pengguna LacakHP',
      detail:
        'Jika LacakHP SUDAH terpasang & HP masih merespons, TUNDA blokir SIM 15–30 menit pertama supaya 4G dan SMS darurat (LACAK / LACAK BUNYI) tetap bisa menjangkau HP. Segera blokir SIM hanya jika: (a) belum pasang LacakHP, (b) HP dimatikan/SIM tidak merespons, atau (c) saldo m-banking/e-wallet kritis harus segera diamankan dari SMS OTP. (Catatan: jika SIM diblokir, WiFi Auto-Flush & deteksi SIM baru di LacakHP tetap bekerja jika HP terkoneksi WiFi atau dimasuki SIM baru).',
    },
    urgent: true,
  },
  {
    id: 'freeze-finance',
    title: '4. Bekukan M-Banking, E-Wallet & Ganti Sandi Email Utama',
    desc: 'Hubungi call center bank terkait (BCA, BRI, Mandiri, BNI, dll.) atau kunci sementara akun GoPay/OVO/DANA/ShopeePay. Segera ganti kata sandi akun Gmail/Apple ID utama yang terpasang di HP tersebut.',
  },
  {
    id: 'police-report',
    title: '5. Buat Laporan Resmi ke Kepolisian (LP atau STPL)',
    desc: 'Datangi SPKT Polsek atau Polres terdekat dengan membawa KTP, bukti kepemilikan (dus/faktur/nomor IMEI), serta hasil cetak PDF riwayat koordinat dari tab Pelacak Live sebagai data pendukung. Sesuaikan jenis laporan dengan kejadian:',
    tip: {
      label: 'Perbedaan LP & STPL untuk Pemberkasan',
      detail:
        '• Laporan Polisi (LP): dibuat apabila kehilangan merupakan dugaan tindak pidana kejahatan (pencurian, perampasan, atau penjambretan) sebagai dasar penyelidikan kepolisian.\n• Surat Keterangan / Tanda Penerimaan Laporan (STPL) Kehilangan: dibuat apabila HP murni hilang/tercecer untuk keperluan pemberkasan administrasi (ganti kartu SIM, blokir IMEI, atau klaim asuransi).',
    },
  },
];

const EMERGENCY_CONTACT = {
  title: 'Call Center Polri 110',
  phone: '110',
  note: 'Layanan Darurat Kepolisian 24 Jam (Bebas Pulsa)',
  detail:
    'Hubungi 110 jika terjadi perampasan/pencurian yang membahayakan keselamatan atau untuk koordinasi pelaporan resmi (LP/STPL) ke Polsek/Polres terdekat.',
};

export const FirstAidChecklist: React.FC = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const touchFocusTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (touchFocusTimerRef.current !== null) {
        window.clearTimeout(touchFocusTimerRef.current);
      }
    };
  }, []);

  const clearTouchTimer = () => {
    if (touchFocusTimerRef.current !== null) {
      window.clearTimeout(touchFocusTimerRef.current);
      touchFocusTimerRef.current = null;
    }
  };

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
      <SpotlightCard
        tone="amber"
        radius={540}
        restingBgClassName="bg-amber-500/10"
        restingBorderClassName="border-amber-500/30"
        hoverBgClassName="bg-slate-900/95"
        contentClassName="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white">
              SOP Pertolongan Pertama Saat HP Hilang / Dicuri
            </h1>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed">
              Arahkan kursor atau ketuk salah satu langkah di bawah untuk fokus
              membaca, lalu centang tindakan yang sudah selesai dilakukan.
            </p>
          </div>
        </div>
        <div className="shrink-0 bg-slate-950/85 border border-slate-800 rounded-xl px-4 py-2.5 text-center">
          <div className="text-[11px] text-slate-400">Progres Tindakan</div>
          <div className="text-lg font-bold text-amber-300">
            {completedCount} / {EMERGENCY_STEPS.length}
          </div>
        </div>
      </SpotlightCard>

      {/* Interactive Checklist with Warm Amber/Emerald Triage Spotlight */}
      <div
        className="space-y-3"
        onMouseLeave={() => setFocusedId(null)}
      >
        {EMERGENCY_STEPS.map((item) => {
          const isDone = Boolean(checked[item.id]);
          const isFocused = focusedId === item.id;
          const isDimmed = focusedId !== null && !isFocused && !isDone;

          return (
            <SpotlightCard
              key={item.id}
              tone={isDone ? 'emerald' : 'amber'}
              forceActive={isFocused}
              radius={440}
              restingBgClassName={
                isDone
                  ? 'bg-emerald-950/40'
                  : item.urgent
                  ? 'bg-slate-950/80'
                  : 'bg-slate-950/75'
              }
              restingBorderClassName={
                isDone
                  ? 'border-emerald-500/35'
                  : item.urgent
                  ? 'border-slate-700/90'
                  : 'border-slate-800/90'
              }
              onClick={() => toggle(item.id)}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'touch') {
                  clearTouchTimer();
                  setFocusedId(item.id);
                }
              }}
              onPointerDown={(e) => {
                if (e.pointerType !== 'touch') return;
                clearTouchTimer();
                setFocusedId(item.id);
                touchFocusTimerRef.current = window.setTimeout(() => {
                  touchFocusTimerRef.current = null;
                  setFocusedId((curr) => (curr === item.id ? null : curr));
                }, 1400);
              }}
              onPointerCancel={(e) => {
                if (e.pointerType === 'touch') {
                  clearTouchTimer();
                  setFocusedId((curr) => (curr === item.id ? null : curr));
                }
              }}
              onFocus={() => setFocusedId(item.id)}
              onBlur={() =>
                setFocusedId((curr) => (curr === item.id ? null : curr))
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(item.id);
                }
              }}
              animate={{
                y: isFocused ? -2 : 0,
                scale: isFocused ? 1.008 : 1,
                opacity: isDimmed ? 0.58 : isDone && !isFocused ? 0.8 : 1,
              }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="cursor-pointer"
              contentClassName="p-4 sm:p-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Square
                      className={`w-5 h-5 transition-colors ${
                        isFocused ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className={`text-sm sm:text-[15px] font-bold transition-colors ${
                        isDone
                          ? 'line-through text-slate-400'
                          : isFocused
                          ? 'text-amber-200'
                          : 'text-white'
                      }`}
                    >
                      {item.title}
                    </h2>
                    {item.urgent && !isDone && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Prioritas 15 Menit Pertama
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs sm:text-[13px] leading-relaxed transition-colors ${
                      isFocused ? 'text-slate-100' : 'text-slate-300'
                    }`}
                  >
                    {item.desc}
                  </p>

                  {item.tip && (
                    <div
                      className={`rounded-xl border p-3 text-xs leading-relaxed transition-colors ${
                        isFocused
                          ? 'bg-amber-950/35 border-amber-500/40 text-amber-50'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 font-bold mb-1 ${
                          isFocused ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.tip.label}</span>
                      </div>
                      <p className="text-[11px] sm:text-xs leading-relaxed whitespace-pre-line">
                        {item.tip.detail}
                      </p>
                    </div>
                  )}

                  {item.linkHref && (
                    <div className="pt-0.5">
                      <a
                        href={item.linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-4"
                      >
                        <span>{item.linkLabel}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Police 110 Emergency Contact */}
      <SpotlightCard
        tone="amber"
        radius={540}
        restingBgClassName="bg-slate-950/80"
        restingBorderClassName="border-slate-800"
        hoverBgClassName="bg-slate-900/95"
        contentClassName="p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="text-sm font-bold text-white">
                {EMERGENCY_CONTACT.title}
              </h2>
            </div>
            <div className="text-[11px] font-medium text-amber-300/90">
              {EMERGENCY_CONTACT.note}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
              {EMERGENCY_CONTACT.detail}
            </p>
          </div>
          <a
            href={`tel:${EMERGENCY_CONTACT.phone}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-sm font-mono font-bold text-amber-300 transition shrink-0 min-h-[46px] touch-manipulation"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            <span>Hubungi {EMERGENCY_CONTACT.phone}</span>
          </a>
        </div>

        <div className="flex items-start gap-2.5 pt-2 text-[11px] text-slate-300 border-t border-slate-800/80">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <b>Waspada Penipuan &amp; Situs Tiruan:</b> LacakHP adalah projek
            amal open-source 100% gratis demi mendukung tugas kepolisian. Kami{' '}
            <b>tidak pernah</b> meminta biaya, transfer uang, PIN, atau kode OTP
            untuk membuka lokasi — jangan pernah menyerahkan data tersebut
            kepada pihak mana pun yang mengaku menemukan HP Anda.
          </p>
        </div>
      </SpotlightCard>
    </div>
  );
};
