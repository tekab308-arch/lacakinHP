# Daftar Pekerjaan yang Belum Selesai (To-Do List LacakHP)

**Diperbarui:** 24 November 2026  
**Status Saat Ini:**  
- **Website (`https://lacakinhp110.my.id`)**: Kode & HTTP Security Headers sudah diperkeras dan **LIVE**.  
- **Android (`tracker-android`)**: Kode v2.7 (hardening Anti-SIM Swap, Direct SMS Command Fallback, `allowBackup=false`, perbaikan Stealth Mode) sudah lulus unit test & build lokal, **belum di-deploy**.

---

## 🔴 Prioritas 1 — Kunci Pintu Masuk Infrastruktur (Paling Mendesak)

- [ ] **Aktifkan 2FA (Authenticator App / Passkey, bukan SMS) di GitHub**
  - Tutup risiko pengambilalihan repositori & penyisipan kode berbahaya.
  - Simpan *Recovery Codes* secara offline (kertas/brankas terpisah).
- [ ] **Aktifkan 2FA di Akun Vercel**
  - Mencegah pihak luar mengganti `lacakhp-resmi.apk` atau memodifikasi halaman `lacakinhp110.my.id`.
- [ ] **Aktifkan 2FA + Domain Lock + DNSSEC di Registrar Domain `lacakinhp110.my.id`**
  - Mencegah pembajakan DNS / pengalihan domain ke situs phishing.
- [ ] **Aktifkan Branch Protection di GitHub (`main`)**
  - Wajibkan GitHub Actions CI lulus sebelum perubahan masuk ke branch `main`.
- [x] **Commit & Push seluruh kode terbaru ke GitHub** *(Selesai — branch main tekab308-arch/lacakinHP)*
- [ ] **Cek skor header live di `securityheaders.com`**
  - Verifikasi skor A/A+ di `https://securityheaders.com/?q=https://lacakinhp110.my.id`.

---

## 🟠 Prioritas 2 — Desentralisasi & Penyempurnaan Website

- [x] **Mode Ephemeral Penuh untuk Magic Link (`#id=...&key=...`)** *(Selesai — 100% RAM, tanpa menyentuh `localStorage`)*
- [x] **Alat Cek Keaslian File APK Lokal di Browser (*Client-Side SHA-256 Verifier*)** *(Selesai — di tab Cara Kerja & Keamanan)*
- [x] **Perbaikan Layer Peta Mode Gelap/Terang (`strict-origin-when-cross-origin` + Auto-Fallback CARTO)** *(Selesai & LIVE)*
- [x] **Fitur Web: Modal "Lembar Bukti Polisi (LP/STPL) & Blokir IMEI" (Cetak A4 Resmi + Bukti BIP-340 Schnorr)**
  - Selesai — Form RAM-only, segel BIP-340 Schnorr & SHA-256 event ID, tabel kronologi, dan format cetak A4 resmi untuk SPKT Polri & CEIR.
- [x] **Panduan Aktivasi Benteng Device Owner (MDM Anti-Hapus)**
  - Selesai — Panduan 3 langkah Shizuku+aShell tanpa PC, perintah ADB salin 1-klik, format JSON QR Provisioning, dan 6 Mode Cerdas di tab Cara Kerja & Keamanan.
- [x] **Dukungan Mode Offline / PWA App-Shell (`Network-First`) & Web Manifest**
  - Service Worker (`sw.js`) aktif, mengecualikan file APK 12MB & version.json, dan siap offline fallback.
- [x] **Konfigurasi Mirror Cloudflare Pages (`public/_headers`) & Whitelist `lacakhp.pages.dev`**
  - File security headers setara Vercel siap digunakan saat deploy ke Cloudflare Pages.
- [ ] **Siapkan Mirror Hosting Multi-Platform (Deploy Fisik ke Cloudflare Pages)**
  - Hubungkan repositori GitHub ke Cloudflare Pages dengan build command `npm run build` dan output `dist`.

---

## 🟡 Prioritas 3 — Rilis APK Android v2.7 & Uji Lapangan Fisik

- [ ] **Publikasikan APK Android v2.7 (Build 9) ke `https://lacakinhp110.my.id`** *(Tahan sampai email persetujuan whitelist Google Play Protect keluar agar hash APK tidak berubah saat direview)*
  - Jalankan saat siap rilis:
    ```zsh
    ./publish-update.sh 9 "2.7" "Hardening keamanan menyeluruh: fail-safe SMS Command & SIM Swap, allowBackup=false, validasi domain update, dan perbaikan Stealth Mode."
    ```
- [ ] **Uji Lapangan Anti-SIM Swap di HP Fisik (Android 12–15, Dual-SIM)**
  - Kunci SIM sah → kunci layar (Doze/idle) → tukar dengan SIM lain → pastikan SMS darurat masuk ke Nomor Pemantau beserta nomor HP baru & koordinat (uji di luar ruangan dan di dalam gedung).
- [ ] **Uji Lapangan Perintah SMS Saat Layar Mati Lama (Doze Mode)**
  - Matikan data seluler, biarkan layar terkunci > 30 menit, lalu kirim: `LACAK <PIN>`, `LACAK <PIN> KUNCI`, `LACAK <PIN> BUNYI`, dan `LACAK <PIN> STATUS`.
- [ ] **Uji Skenario Izin Parsial**
  - Matikan izin Lokasi (sisakan SMS & Telepon), lalu uji tukar kartu SIM dan SMS `LACAK <PIN> KUNCI` untuk memastikan *Direct Receiver Fallback* tetap membalas SMS.

---

## 🟢 Prioritas 4 — Keamanan & Ekosistem Jangka Panjang

- [x] **Migrasi Build ke Release Non-Debuggable (`debuggable = false`, `isMinifyEnabled = false`)**
  - Selesai di kode lokal (`build.gradle.kts` & `publish-update.sh` memakai `assembleFullRelease` dengan sertifikat resmi `E3:10:0D:61...` agar kompatibel update menimpa & patuh whitelist Play Protect).
- [ ] **Tindak Lanjut Banding Google Play Protect**
  - Pantau hasil pengajuan appeal yang tercatat pada `GOOGLE_PLAY_PROTECT_APPEAL.md`.
- [ ] **Bangun Jaringan Relay Nostr Komunitas Terkurasi**
  - Eksekusi rencana infrastruktur pada `RELAY_PLANNING.md` agar tidak bergantung penuh pada relay publik global.
- [x] **Implementasi Benteng `Device Owner` Mode Cerdas, Mode Kejar 2 Menit, Verifikasi Ganda & IMEI Kartu Darurat (`tracker-android`)**
  - Selesai & lulus uji lokal (`DeviceOwnerHelper.kt`, Kepatuhan QR Android 12–15, Auto-Relock USB 30 menit, Eskalasi 0 detik di Receiver, & Masking IMEI). Menunggu rilis APK v2.7 setelah email Play Protect keluar.
- [x] **Auto-Failover Mirror & Tampilkan SHA-256 APK pada Dialog Update di Android (`UpdateChecker`)**
  - Selesai di kode lokal (`lacakinhp110.my.id` -> `lacakinhp.pages.dev` -> `tracker-web-xi.vercel.app` + validasi `certSha256` & tombol salin `apkSha256`).
