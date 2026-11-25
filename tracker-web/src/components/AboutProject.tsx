import React from 'react';
import { motion } from 'framer-motion';
import {
  HeartHandshake,
  ShieldCheck,
  Users,
  Code2,
  ArrowRight,
  Cpu,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { Web3SovereignMeshAnimation } from './Web3SovereignMeshAnimation';
import {
  useReleaseInfo,
  shortHexHash,
  shortCertFingerprint,
} from '../lib/releaseInfo';

interface AboutProjectProps {
  onOpenArchitecture: () => void;
  onOpenTracker: () => void;
}

const TECH_SPECS = [
  'AES-256-GCM',
  'PBKDF2 100k',
  'BIP-340 Schnorr',
  'Nostr Multi-Relay',
  '0 Database Pusat',
];

export const AboutProject: React.FC<AboutProjectProps> = ({
  onOpenArchitecture,
  onOpenTracker,
}) => {
  const releaseInfo = useReleaseInfo();
  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
      {/* Hero Story & Sincere Vision Card */}
      <SpotlightCard
        as="section"
        tone="sky"
        radius={620}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        restingBgClassName="bg-slate-950/70"
        restingBorderClassName="border-sky-500/30"
        contentClassName="p-4 sm:p-8 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/25">
            <HeartHandshake className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Tentang Projek Amal LacakHP</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
            <span className="relative flex h-2 w-2">
              <motion.span
                animate={{ scale: [1, 2.1], opacity: [0.75, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>OPEN-SOURCE • ZERO-KNOWLEDGE</span>
          </div>
        </div>

        <div className="space-y-2 max-w-[62ch]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-50 leading-snug">
            Lahir dari Kepedulian untuk Membantu Sesama
          </h1>
          <p className="text-sm sm:text-[0.9375rem] text-slate-200 leading-relaxed">
            Sebuah inisiatif teknologi nirlaba independen yang dibangun untuk
            menjadi jaring pengaman darurat bagi siapa saja saat musibah
            terjadi.
          </p>
        </div>

        {/* Lightweight Tech Signal Strip */}
        <div className="rounded-xl bg-slate-950/90 border border-slate-800/90 p-3.5 space-y-2.5 overflow-hidden">
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-300">
            <span className="inline-flex items-center gap-1.5 text-sky-300 font-semibold">
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span>ARSITEKTUR KRIPTOGRAFI TERBUKA</span>
            </span>
            <span className="hidden sm:inline text-slate-400">
              End-to-End • Tanpa Server Pusat
            </span>
          </div>

          <div className="relative h-1 w-full rounded-full bg-slate-800/90 overflow-hidden">
            <motion.div
              animate={{ x: ['-40%', '260%'] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
              className="h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-sky-400 to-emerald-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TECH_SPECS.map((spec, idx) => (
              <motion.span
                key={spec}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.05 * idx,
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-mono text-[0.6875rem] text-slate-200"
              >
                {spec}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Poetic Vision Quote */}
        <blockquote className="relative rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-indigo-950/40 border border-slate-700/80 border-l-2 border-l-sky-400/70 p-5 sm:p-6 space-y-4 shadow-inner">
          <p className="text-[0.9375rem] sm:text-base text-slate-100 leading-relaxed font-normal italic max-w-[65ch]">
            &ldquo;Di tengah maraknya musibah handphone hilang dan tindak
            pencurian yang kerap menimpa masyarakat tanpa memandang latar
            belakang, saya berharap hadirnya aplikasi sederhana ini dapat
            menjadi setitik ikhtiar dan jalan pertolongan di saat genting. Saya
            menyadari sepenuhnya bahwa karya ini masih memiliki banyak
            kekurangan dan jauh dari kata sempurna — namun seluruh tenaga dan
            karya di dalamnya saya niatkan dengan tulus dan ikhlas tanpa
            pamrih, demi membantu sesama masyarakat serta turut mendukung
            kelancaran tugas kepolisian di lapangan.&rdquo;
          </p>

          <footer className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm sm:text-base font-bold text-slate-50 tracking-wide">
                Sena
              </div>
              <div className="text-xs text-sky-300 font-medium">
                Inisiator &amp; Pengembang LacakHP Indonesia
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
              100% Gratis
            </span>
          </footer>
        </blockquote>
      </SpotlightCard>

      {/* Web3 Sovereign Architecture Mesh Animation */}
      <Web3SovereignMeshAnimation />

      {/* 3 Pillars of Commitment */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SpotlightCard
          radius={340}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          contentClassName="p-5 space-y-2.5 h-full"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-100">
            Gratis Selamanya
          </h2>
          <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
            Tidak ada biaya langganan, iklan, ataupun pungutan sepeser pun.
            Waspadalah terhadap pihak luar yang memungut biaya dengan
            mengatasnamakan LacakHP.
          </p>
        </SpotlightCard>

        <SpotlightCard
          radius={340}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          contentClassName="p-5 space-y-2.5 h-full"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-100">
            Menjaga Amanah Privasi Pengguna
          </h2>
          <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
            Arsitektur <i>Zero-Knowledge</i> memastikan bahkan pembuat aplikasi
            sekalipun tidak dapat melihat lokasi, sandi, atau data siapa pun.
            Kendali mutlak milik pemilik HP.
          </p>
        </SpotlightCard>

        <SpotlightCard
          radius={340}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          contentClassName="p-5 space-y-2.5 h-full"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Code2 className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-100">
            Terbuka untuk Koreksi &amp; Gotong Royong
          </h2>
          <p className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed">
            Kode disusun secara terbuka agar para pengembang, praktisi
            keamanan, maupun relawan dapat saling menguji, menyanggah bug, dan
            menyempurnakannya bersama-sama.
          </p>
        </SpotlightCard>
      </section>

      {/* Security Mitigation & Anti-Phishing Guard Card */}
      <SpotlightCard
        radius={420}
        tone="radar"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        restingBgClassName="bg-slate-950/80"
        restingBorderClassName="border-emerald-500/30"
        contentClassName="p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mitigasi Keamanan: Lindungi Diri dari Penipuan &amp; Aplikasi Palsu</span>
          </div>
          <span className="text-[0.6875rem] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            VERIFIKASI RESMI
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[0.8125rem] sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Ciri Phishing / Kloning Palsu:</span>
            </div>
            <ul className="text-slate-200 text-[0.8125rem] leading-relaxed space-y-1.5 list-disc list-inside">
              <li>Meminta pembayaran, transfer pulsa, atau kartu kredit untuk melacak.</li>
              <li>Mengharuskan login akun media sosial, email, atau memasukkan kode OTP.</li>
              <li>Menggunakan domain tiruan selain <code>lacakinhp110.my.id</code> (atau mirror <code>lacakinhp.pages.dev</code>).</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[0.8125rem] sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ciri Keaslian LacakHP Resmi:</span>
            </div>
            <ul className="text-slate-200 text-[0.8125rem] leading-relaxed space-y-1.5 list-disc list-inside">
              <li>Domain resmi utama: <strong className="text-slate-50">lacakinhp110.my.id</strong> (mirror: <code>lacakinhp.pages.dev</code>)</li>
              <li>100% Gratis selamanya, tanpa iklan, dan tanpa pungutan apa pun.</li>
              <li>Data koordinat terenkripsi lokal (Zero-Knowledge, aman dari sadapan).</li>
            </ul>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300 tabular-nums">
          <span>
            SHA-256 APK Resmi (v{releaseInfo.versionName}):{' '}
            <code className="text-sky-300">
              {shortHexHash(releaseInfo.apkSha256)}
            </code>
          </span>
          <span>
            Signature:{' '}
            <code className="text-emerald-300">
              {shortCertFingerprint(releaseInfo.certSha256)}
            </code>
          </span>
        </div>
      </SpotlightCard>

      {/* Bottom Action Card */}
      <SpotlightCard
        radius={480}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        restingBgClassName="bg-slate-950/65"
        contentClassName="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3 min-w-0 max-w-[60ch]">
          <div className="p-2.5 rounded-xl bg-slate-800 text-sky-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-[0.8125rem] sm:text-sm text-slate-200 leading-relaxed min-w-0">
            <b className="text-slate-100 block mb-0.5">
              Ingin ikut menguji atau mempelajari cara kerjanya?
            </b>
            Anda bisa melihat simulasi peta di halaman utama atau memeriksa
            bukti keaslian SHA-256 aplikasi resmi.
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenArchitecture}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[0.8125rem] font-semibold text-slate-100 transition min-h-[44px] touch-manipulation"
          >
            <span>Cara Kerja &amp; SHA-256</span>
          </button>
          <button
            type="button"
            onClick={onOpenTracker}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-[0.8125rem] font-bold transition min-h-[44px] touch-manipulation"
          >
            <span>Buka Pelacak</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </SpotlightCard>
    </div>
  );
};
