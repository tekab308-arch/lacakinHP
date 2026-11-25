import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ShieldCheck,
  Printer,
  X,
  AlertCircle,
  User,
  Smartphone,
} from 'lucide-react';
import { DecryptedLocationPoint } from '../lib/crypto';
import { RawNostrEvent } from '../lib/nostr';
import { encodeQrMatrix, buildQrSvgPath } from '../lib/qrSvg';

interface PoliceEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  derivedPubHex: string;
  points: DecryptedLocationPoint[];
  rawSampleEvent: RawNostrEvent | null;
}

export const PoliceEvidenceModal: React.FC<PoliceEvidenceModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  derivedPubHex,
  points,
  rawSampleEvent,
}) => {
  // RAM-only form state (Never stored in localStorage, never sent to server)
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [policeStation, setPoliceStation] = useState(
    'Sentra Pelayanan Kepolisian Terpadu (SPKT)'
  );
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentChronology, setIncidentChronology] = useState('');
  const [documentRef, setDocumentRef] = useState('');

  const latestPoint = points[0] || null;

  useEffect(() => {
    if (isOpen) {
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `LP-E2EE-${deviceId ? deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : 'DEVICE'}-${randomSuffix}`;
      setDocumentRef(code);
      if (!incidentDate && latestPoint?.ts) {
        setIncidentDate(new Date(latestPoint.ts).toLocaleString('id-ID'));
      }
    }
  }, [isOpen, deviceId, latestPoint]);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('police-print-active');
    const cleanup = () => {
      document.body.classList.remove('police-print-active');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    // Fallback timer if afterprint event doesn't fire
    setTimeout(cleanup, 3000);
  };

  const modelName = latestPoint?.mdl || 'Perangkat Android LacakHP';
  const effectiveEventId = latestPoint?.eventId || rawSampleEvent?.id || '-';
  const effectivePubkey = latestPoint?.pubkey || derivedPubHex || rawSampleEvent?.pubkey || '-';
  const effectiveSig = latestPoint?.sig || rawSampleEvent?.sig || '-';

  // Last 15 clean history points for chronological proof table
  const trailPoints = points.slice(0, 15);
  const mapsUrl = latestPoint
    ? `https://www.google.com/maps?q=${latestPoint.lat.toFixed(6)},${latestPoint.lng.toFixed(6)}`
    : '';
  const mapsQrSvg = mapsUrl
    ? (() => {
        try {
          return buildQrSvgPath(encodeQrMatrix(mapsUrl), 2);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Siapkan Lembar Bukti Polisi (LP/STPL) &amp; Blokir IMEI
                </h2>
                <p className="text-[11px] text-slate-400">
                  Format Berkas Resmi Cetak A4 • Segel Forensik BIP-340 Schnorr
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Privacy Banner */}
          <div className="px-5 py-2.5 bg-emerald-950/50 border-b border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <b>Privasi Terjamin:</b> Semua isian di bawah ini hanya disimpan di memori sementara (RAM) browser Anda untuk keperluan cetak, dan <b>tidak pernah dikirim ke server</b>.
            </span>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-200">
            {/* Guidance Alert */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Petunjuk Lampiran Laporan Polisi &amp; Pemblokiran IMEI</span>
              </div>
              <p className="leading-relaxed">
                Dokumen ini dirancang sebagai <b>Lampiran Resmi Data Forensik Digital</b> untuk melengkapi berkas Laporan Polisi (LP) atau Surat Tanda Penerimaan Laporan (STPL) di SPKT Polri, serta bukti kepemilikan sah saat meminta pemblokiran IMEI ke gerai operator seluler (CEIR). Isilah formulir di bawah ini jika ingin mencantumkannya di berkas cetak.
              </p>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom Kiri: Data Identitas Pelapor & Perangkat */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <h3 className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5" />
                  Identitas Pelapor &amp; Korban
                </h3>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Nama Pemilik / Pelapor Sah:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Nomor Kontak Pelapor / Keluarga (Aktif):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812-3456-7890"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Nomor SIM Korban di HP Hilang:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0857-9876-5432"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Kantor Polisi / Instansi Tujuan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Sentra Pelayanan Kepolisian Terpadu (SPKT) POLRI"
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>
              </div>

              {/* Kolom Kanan: Nomor IMEI & Kronologi */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <h3 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <Smartphone className="w-3.5 h-3.5" />
                  Identitas Hardware (IMEI) &amp; Kejadian
                </h3>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                    <span>Nomor IMEI Slot 1 (15 Digit):</span>
                    <span className="text-[10px] text-slate-500">Cek di dus HP / *#06#</span>
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="Contoh: 356789101234567"
                    value={imei1}
                    onChange={(e) => setImei1(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Nomor IMEI Slot 2 (Opsional / Dual-SIM):
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="Contoh: 356789101234568"
                    value={imei2}
                    onChange={(e) => setImei2(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Waktu &amp; Tanggal Kejadian / Terakhir Diketahui:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 25 November 2026, 14:30 WIB"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Perkiraan Lokasi Terakhir Diketahui (TKP):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Area Mal Boemi Kedaton / Jl. Teuku Umar"
                    value={incidentLocation}
                    onChange={(e) => setIncidentLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Kronologi Textarea */}
            <div className="space-y-1 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <label className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                <span>Catatan Kronologi Kejadian Singkat:</span>
                <span className="text-[10px] text-slate-500">Opsional untuk lampiran berkas</span>
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: HP tertinggal di atas meja saat makan siang, setelah dicek 15 menit kemudian sudah tidak ada. Pelacakan mandiri menunjukkan pergerakan ke arah Kedaton."
                value={incidentChronology}
                onChange={(e) => setIncidentChronology(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs leading-relaxed"
              />
            </div>

            {/* Technical Cryptographic Preview Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  Segel Integritas Kriptografi Digital yang Akan Dicantumkan
                </span>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  BIP-340 Schnorr / SHA-256
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 truncate">
                  <span className="text-slate-500 block text-[10px]">ID Perangkat LacakHP:</span>
                  <span className="text-white font-semibold">{deviceId || '-'}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 truncate">
                  <span className="text-slate-500 block text-[10px]">Koordinat Terakhir:</span>
                  <span className="text-emerald-400 font-semibold">
                    {latestPoint ? `${latestPoint.lat.toFixed(6)}, ${latestPoint.lng.toFixed(6)} (±${latestPoint.acc}m)` : '-'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 truncate sm:col-span-2">
                  <span className="text-slate-500 block text-[10px]">Nostr Public Key (secp256k1):</span>
                  <span className="text-sky-300 break-all">{effectivePubkey}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 truncate sm:col-span-2">
                  <span className="text-slate-500 block text-[10px]">Canonical Nostr Event ID (SHA-256 Commitment):</span>
                  <span className="text-indigo-300 break-all">{effectiveEventId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-slate-950/80">
            <div className="text-[11px] text-slate-400">
              Dokumen Ref: <span className="font-mono text-slate-300 font-semibold">{documentRef}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Resmi (A4) / Simpan PDF</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ======================================================== */}
      {/* PRINT-ONLY OFFICIAL A4 DOCUMENT LAYOUT (Visible only when body.police-print-active is set) */}
      {/* ======================================================== */}
      <div id="police-evidence-print-document" className="police-print-sheet hidden print:block">
        {/* Document Frame */}
        <div className="p-8 max-w-[210mm] mx-auto text-black bg-white space-y-5 text-sm leading-normal">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-black pb-4 text-center space-y-1">
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-700">
              {policeStation.toUpperCase()} • DOKUMEN LAMPIRAN BUKTI ELEKTRONIK
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase text-black">
              LAMPIRAN DATA TEKNIS PELACAKAN MANDIRI &amp; BUKTI KRIPTOGRAFI DIGITAL
            </h1>
            <p className="text-xs italic text-gray-700">
              Bahan Bukti Pendukung Laporan Polisi (LP / STPL) &amp; Verifikasi Pemblokiran IMEI CEIR Operator Seluler
            </p>
            <div className="pt-2 flex justify-between items-center text-[10px] font-mono border-t border-gray-300 mt-2">
              <span>Nomor Referensi Berkas: <b>{documentRef}</b></span>
              <span>Waktu Cetak: <b>{new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' })}</b></span>
            </div>
          </div>

          {/* Section 1: Identitas Pelapor & Perangkat */}
          <div className="space-y-1.5">
            <div className="bg-gray-100 px-3 py-1 font-bold text-xs uppercase border border-gray-300">
              I. IDENTITAS PELAPOR &amp; PERANGKAT TERDAMPAK
            </div>
            <table className="w-full text-xs border-collapse border border-gray-300">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="w-1/3 p-2 bg-gray-50 font-semibold border-r border-gray-300">Nama Pelapor / Pemilik Sah:</td>
                  <td className="p-2 font-bold">{reporterName || '- (Belum diisi)'}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">Nomor Kontak Pelapor / Keluarga:</td>
                  <td className="p-2">{reporterPhone || '- (Belum diisi)'}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">Nomor SIM Korban di HP Terlacak:</td>
                  <td className="p-2 font-bold">{targetPhone || '- (Belum diisi)'}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">Tipe / Model Perangkat:</td>
                  <td className="p-2 font-bold">{modelName}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">ID Perangkat Sistem (LacakHP):</td>
                  <td className="p-2 font-mono">{deviceId || '-'}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">Nomor IMEI 1 (Hardware):</td>
                  <td className="p-2 font-mono font-bold">{imei1 || '- (Harap lampirkan dus HP / cek *#06#)'}</td>
                </tr>
                {imei2 && (
                  <tr className="border-b border-gray-300">
                    <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">Nomor IMEI 2 (Hardware Dual-SIM):</td>
                    <td className="p-2 font-mono">{imei2}</td>
                  </tr>
                )}
                <tr>
                  <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">Perkiraan Waktu &amp; Lokasi Kejadian (TKP):</td>
                  <td className="p-2">
                    {incidentDate ? `${incidentDate}` : '-'} {incidentLocation ? `• Lokasi: ${incidentLocation}` : ''}
                  </td>
                </tr>
                {incidentChronology && (
                  <tr className="border-t border-gray-300">
                    <td className="p-2 bg-gray-50 font-semibold border-r border-gray-300">Kronologi Singkat:</td>
                    <td className="p-2 italic">{incidentChronology}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 2: Posisi Terakhir Terkunci */}
          <div className="space-y-1.5">
            <div className="bg-gray-100 px-3 py-1 font-bold text-xs uppercase border border-gray-300">
              II. POSISI KOORDINAT TERAKHIR YANG TERVERIFIKASI
            </div>
            {latestPoint ? (
              <div className="border border-gray-300 p-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-600 block text-[10px]">Titik Koordinat (Lintang, Bujur):</span>
                    <span className="font-mono text-sm font-bold text-black">
                      {latestPoint.lat.toFixed(6)}, {latestPoint.lng.toFixed(6)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block text-[10px]">Akurasi Radius Sinyal:</span>
                    <span className="font-bold text-black">
                      ±{latestPoint.acc} meter ({latestPoint.prv.toUpperCase() === 'GPS' ? 'GNSS Satelit Hardware' : 'Network Fused Location'})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block text-[10px]">Waktu Pencatatan Koordinat (WIB):</span>
                    <span className="font-semibold text-black">
                      {latestPoint.ts ? new Date(latestPoint.ts).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block text-[10px]">Status Daya Baterai:</span>
                    <span className="font-bold text-black">
                      {latestPoint.bat >= 0 ? `${latestPoint.bat}%` : 'Tidak terdeteksi'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-3 text-[11px]">
                  <div className="min-w-0">
                    <span className="font-semibold block">Tautan Peta Langsung (Google Maps):</span>
                    <span className="font-mono text-[10px] break-all">{mapsUrl}</span>
                  </div>
                  {mapsQrSvg && (
                    <div className="shrink-0 flex flex-col items-center border border-gray-300 p-1 bg-white">
                      <svg
                        viewBox={`0 0 ${mapsQrSvg.viewBoxSize} ${mapsQrSvg.viewBoxSize}`}
                        shapeRendering="crispEdges"
                        className="w-16 h-16"
                      >
                        <rect width={mapsQrSvg.viewBoxSize} height={mapsQrSvg.viewBoxSize} fill="#ffffff" />
                        <path d={mapsQrSvg.pathD} fill="#000000" />
                      </svg>
                      <span className="text-[8px] font-semibold text-gray-700">Scan Peta</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 border border-gray-300 text-xs italic text-gray-500">
                Belum ada titik koordinat yang diterima dari relay.
              </div>
            )}
          </div>

          {/* Section 3: Rekam Jejak Kronologis */}
          {trailPoints.length > 0 && (
            <div className="space-y-1.5">
              <div className="bg-gray-100 px-3 py-1 font-bold text-xs uppercase border border-gray-300">
                III. REKAM JEJAK KRONOLOGIS PERGERAKAN TERAKHIR ({trailPoints.length} TITIK)
              </div>
              <table className="w-full text-[10px] border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-left font-bold">
                    <th className="p-1.5 border-r border-gray-300 text-center w-8">No</th>
                    <th className="p-1.5 border-r border-gray-300">Waktu (WIB)</th>
                    <th className="p-1.5 border-r border-gray-300">Koordinat (Lat, Lng)</th>
                    <th className="p-1.5 border-r border-gray-300 text-center">Akurasi</th>
                    <th className="p-1.5 border-r border-gray-300 text-center">Baterai</th>
                    <th className="p-1.5 border-r border-gray-300 text-center">Provider</th>
                    <th className="p-1.5 font-mono">Event ID (Hex)</th>
                  </tr>
                </thead>
                <tbody>
                  {trailPoints.map((pt, idx) => (
                    <tr key={`${pt.ts}-${idx}`} className="border-b border-gray-200">
                      <td className="p-1.5 border-r border-gray-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-1.5 border-r border-gray-300 whitespace-nowrap">
                        {pt.ts ? new Date(pt.ts).toLocaleTimeString('id-ID') : '-'}
                      </td>
                      <td className="p-1.5 border-r border-gray-300 font-mono">
                        {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                      </td>
                      <td className="p-1.5 border-r border-gray-300 text-center">±{pt.acc}m</td>
                      <td className="p-1.5 border-r border-gray-300 text-center">{pt.bat >= 0 ? `${pt.bat}%` : '-'}</td>
                      <td className="p-1.5 border-r border-gray-300 text-center uppercase">{pt.prv || 'gps'}</td>
                      <td className="p-1.5 font-mono text-[9px] truncate max-w-[120px]">
                        {pt.eventId ? pt.eventId.slice(0, 16) + '...' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 4: Segel Integritas Kriptografi Forensik */}
          <div className="space-y-1.5">
            <div className="bg-gray-100 px-3 py-1 font-bold text-xs uppercase border border-gray-300">
              IV. SEGEL INTEGRITAS KRIPTOGRAFI DIGITAL (BIP-340 SCHNORR &amp; SHA-256)
            </div>
            <div className="border border-gray-300 p-2.5 space-y-1.5 text-[10px] font-mono">
              <div>
                <span className="text-gray-600 block">Nostr Device Public Key (secp256k1 x-only 32-byte hex):</span>
                <span className="font-bold break-all">{effectivePubkey}</span>
              </div>
              <div>
                <span className="text-gray-600 block">Canonical Event Commitment ID (SHA-256 Hash):</span>
                <span className="font-bold break-all">{effectiveEventId}</span>
              </div>
              <div>
                <span className="text-gray-600 block">Digital Signature (Schnorr BIP-340 64-byte hex):</span>
                <span className="break-all">{effectiveSig}</span>
              </div>
              <div className="p-2 bg-gray-50 border border-gray-200 text-gray-800 text-[10px] font-sans leading-relaxed">
                <b>Keterangan Yuridis Bukti Elektronik:</b> Seluruh data titik telemetri di atas dienkripsi (AES-256-GCM) dan ditandatangani secara kriptografis menggunakan algoritma <b>Schnorr BIP-340 pada kurva eliptik secp256k1</b> langsung dari chip perangkat keras sumber sebelum dipancarkan ke jaringan relay publik. Tanda tangan matematis ini membuktikan bahwa muatan lokasi tidak dapat direkayasa, disisipkan, atau diubah oleh server perantara maupun pihak ketiga mana pun (Memenuhi asas integritas dan otentisitas alat bukti elektronik sesuai <b>Pasal 5 &amp; 6 UU ITE No. 1/2024</b>).
              </div>
            </div>
          </div>

          {/* Section 5: Lembar Tanda Tangan / Pengesahan */}
          <div className="pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-14">
                <div>
                  <div className="font-semibold">Pelapor / Pemilik Sah Perangkat,</div>
                  <div className="text-[10px] text-gray-500">(Tanda tangan &amp; nama terang)</div>
                </div>
                <div className="border-b border-black w-48 mx-auto font-bold uppercase">
                  ( {reporterName || '...........................................'} )
                </div>
              </div>

              <div className="space-y-14">
                <div>
                  <div className="font-semibold">Petugas Penerima Laporan,</div>
                  <div className="text-[10px] text-gray-500">({policeStation})</div>
                </div>
                <div className="border-b border-black w-48 mx-auto font-bold uppercase">
                  ( ........................................... )
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[9px] text-center text-gray-500 pt-3 border-t border-gray-200">
            Dokumen cetak ini digenerate secara otomatis oleh Antarmuka Dekripsi Klien LacakHP E2EE (https://lacakinhp110.my.id).
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
