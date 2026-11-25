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
- [ ] **Commit & Push seluruh kode terbaru ke GitHub**
  - Sinkronkan seluruh perbaikan keamanan Web & Android lokal agar transparan dan teruji otomatis oleh GitHub Actions CI.
- [ ] **Cek skor header live di `securityheaders.com`**
  - Verifikasi skor A/A+ di `https://securityheaders.com/?q=https://lacakinhp110.my.id`.

---

## 🟠 Prioritas 2 — Desentralisasi & Penyempurnaan Website

- [x] **Mode Ephemeral Penuh untuk Magic Link (`#id=...&key=...`)** *(Selesai — 100% RAM, tanpa menyentuh `localStorage`)*
- [x] **Alat Cek Keaslian File APK Lokal di Browser (*Client-Side SHA-256 Verifier*)** *(Selesai — di tab Cara Kerja & Keamanan)*
- [x] **Perbaikan Layer Peta Mode Gelap/Terang (`strict-origin-when-cross-origin` + Auto-Fallback CARTO)** *(Selesai & LIVE)*
- [ ] **Fitur Web: Modal "Lembar Bukti Polisi (LP/STPL) & Blokir IMEI" (Cetak A4 Resmi + Bukti BIP-340 Schnorr)**
  - Sesuai desain terkunci pada `OPTIMASI_FULL_ROOT_MDM.md` Fase A (aman dikerjakan & di-deploy ke web tanpa mengubah file APK live).
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

- [ ] **Migrasi ke Release Signing Keystore (`debuggable = false`)**
  - Beralih dari `app-full-debug.apk` ke APK release yang ditandatangani dengan keystore produksi khusus (disiapkan untuk rilis mayor v3.0 / Play Store / F-Droid dengan panduan migrasi satu kali bagi pengguna lama).
- [ ] **Tindak Lanjut Banding Google Play Protect**
  - Pantau hasil pengajuan appeal yang tercatat pada `GOOGLE_PLAY_PROTECT_APPEAL.md`.
- [ ] **Bangun Jaringan Relay Nostr Komunitas Terkurasi**
  - Eksekusi rencana infrastruktur pada `RELAY_PLANNING.md` agar tidak bergantung penuh pada relay publik global.
- [ ] **Implementasi Benteng `Device Owner` Mode Cerdas, Verifikasi Ganda & IMEI Kartu Darurat (`tracker-android`)**
  - Spesifikasi desain sudah dikunci 100% di `OPTIMASI_FULL_ROOT_MDM.md` Fase B (murni `BIND_DEVICE_ADMIN` tanpa `AccessibilityService` agar 100% aman untuk whitelist Google Play Protect).
- [ ] **Tampilkan Potongan SHA-256 APK pada Dialog Update di Android (`UpdateChecker`)**
  - Mempermudah pengguna memverifikasi keaslian file `.apk` yang baru diunduh sebelum instalasi.
