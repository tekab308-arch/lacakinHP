# Audit Keamanan & Ceklis Proyek LacakHP

**Tanggal Audit:** 24 November 2026  
**Cakupan:** Seluruh kode sumber Android (`tracker-android` flavor `full` & `play`), Web (`tracker-web`), konfigurasi Vercel, CI/CD GitHub Actions, dan skrip rilis (`publish-update.sh`).  
**Status Kode Lokal:** Siap rilis **v2.7 (Build 9)** — seluruh unit test & build lulus 100%, menunggu keputusan deploy ke `https://lacakinhp110.my.id`.

---

## 1. Ceklis Temuan yang SUDAH Diperbaiki & Teruji

### 🔴 HIGH (Keamanan & Integritas Kritis)
- [x] **Perbaikan Celah XSS pada Popup Peta Leaflet**
  - **File:** `tracker-web/src/components/RadarMap.tsx`
  - **Perbaikan:** Menambahkan `escapeHtml()` untuk seluruh data teks (`deviceId`, `mdl`, `prv`, timestamp) yang masuk ke `bindPopup()`, validasi `Number.isFinite()` pada koordinat, serta `encodeURIComponent()` + `rel="noopener noreferrer"` pada tautan Google Maps.
- [x] **Tutup Bypass Modal Persetujuan UU ITE & UU PDP**
  - **File:** `tracker-web/src/components/ArchitectureGuide.tsx`
  - **Perbaikan:** Mengubah tombol unduh APK langsung menjadi tombol yang wajib melewati `LegalConsentModal` (Pasal 30 & 31 UU ITE serta Pasal 65 UU PDP No. 27/2022).
- [x] **Sinkronisasi Otomatis Versi & Checksum SHA-256 APK di Seluruh Web**
  - **File:** `tracker-web/src/lib/releaseInfo.ts`, `WelcomeBanner.tsx`, `ArchitectureGuide.tsx`, `AboutProject.tsx`
  - **Perbaikan:** Menghapus hash SHA-256 dan nomor versi hardcoded yang sempat basi (`40846386...` / `v2.5`). Seluruh tampilan kini membaca dinamis dari `/version.json` agar selalu 100% cocok saat pengguna memverifikasi file unduhan.

### 🟠 MEDIUM (Keandalan Android Modern & Keamanan Operasional)
- [x] **Hardening Anti-SIM Swap (Benteng Terakhir) & Edge-Case Izin Lokasi**
  - **File:** `tracker-android/app/src/full/java/com/lacakhp/app/SimChangeReceiver.kt`, `tracker-android/app/src/full/AndroidManifest.xml`
  - **Perbaikan:** Menggunakan `goAsync()` + `PARTIAL_WAKE_LOCK` (35 detik) + jeda pematangan modem 2,2 detik untuk Dual-SIM/MediaTek/Snapdragon, mendaftarkan 4 broadcast SIM resmi, mengecek izin lokasi sebelum memanggil `TrackerService`, dan langsung menembakkan **Direct SMS Fallback** jika service ditolak Android 12–15 atau izin lokasi dicabut.
- [x] **Fail-Safe Direct Receiver Fallback untuk Perintah SMS Darurat**
  - **File:** `tracker-android/app/src/full/java/com/lacakhp/app/SmsCommandReceiver.kt`
  - **Perbaikan:** Jika Android 12–15 menolak `startForegroundService()` saat Doze Mode atau izin lokasi tidak aktif, receiver kini langsung mengeksekusi perintah `LOCK` (`dpm.lockNow()`), `STATUS`, `LOCATE` (koordinat tersimpan terakhir), dan `RING` (alarm 10 detik) langsung dari background receiver via `goAsync()`.
- [x] **Nonaktifkan Backup Sistem/ADB untuk Mencegah Kebocoran Kunci Rahasia**
  - **File:** `tracker-android/app/src/main/AndroidManifest.xml`
  - **Perbaikan:** Mengubah `android:allowBackup="true"` menjadi `android:allowBackup="false"`.
- [x] **Lifecycle Guard & Safe Executor pada `TrackerService`**
  - **File:** `tracker-android/app/src/main/java/com/lacakhp/app/TrackerService.kt`
  - **Perbaikan:** Menambahkan flag `isInitialized` agar `onStartCommand()` tidak berjalan jika `onCreate()` sudah `stopSelf()`, membungkus seluruh eksekusi background dengan `runIoSafe(...)` untuk mencegah `RejectedExecutionException` & memastikan `WakeLock` selalu dilepas, menambahkan fallback koordinat bertingkat pada `handleSimChanged`, serta memperbaiki reset notifikasi hardcoded ke `defaultModeNotificationText()`.
- [x] **Perbaikan Bug Mode Penyamaran (Stealth) pada Flavor `play`**
  - **File:** `tracker-android/app/src/main/java/com/lacakhp/app/MainActivity.kt`
  - **Perbaikan:** Memperbaiki nama komponen alias launcher dari `"$packageName.DefaultLauncherAlias"` menjadi `"com.lacakhp.app.DefaultLauncherAlias"` dan `"com.lacakhp.app.StealthLauncherAlias"` agar berfungsi di flavor `play` (`com.lacakhp.app.play`) maupun `full`.
- [x] **Pengecekan Eksplisit Izin Telepon (`READ_PHONE_STATE`) untuk Kunci SIM**
  - **File:** `tracker-android/app/src/full/java/com/lacakhp/app/VariantSmsBridge.kt`, `play/VariantSmsBridge.kt`, `MainActivity.kt`
  - **Perbaikan:** Menambahkan `hasPhoneStatePermission()` agar sebelum mengunci SIM permanen, izin Telepon dipastikan aktif demi pembacaan slot Dual-SIM yang akurat (tanpa memblokir fungsi SMS jika pengguna memilih hanya mengizinkan SMS).

### 🟡 LOW (Hardening Tambahan & Konsistensi)
- [x] **Validasi Domain Resmi pada `UpdateChecker`**
  - **File:** `tracker-android/app/src/main/java/com/lacakhp/app/UpdateChecker.kt`
  - **Perbaikan:** Memastikan `apkUrl` dari `version.json` wajib berawalan `https://lacakinhp110.my.id/`, jika tidak valid otomatis kembali ke URL resmi bawaan.
- [x] **Penambahan Header Keamanan HTTP Ketat (CSP, COOP, CORP, No-Referrer, Cache Control)**
  - **File:** `tracker-web/vercel.json`, `tracker-web/index.html`, `tracker-web/vite.config.ts`
  - **Perbaikan:** Menambahkan `Content-Security-Policy` ketat (`connect-src 'self' wss:`, `upgrade-insecure-requests`, `object-src 'none'`, `frame-ancestors 'none'`), `Referrer-Policy: no-referrer` (+ meta tag fallback), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy` penuh, `X-XSS-Protection: 0` (OWASP modern), `Cache-Control: no-store` untuk `/version.json`, `Content-Disposition: attachment` untuk APK, dan `sourcemap: false` eksplisit.
- [x] **Auto-Scrub Magic Link `#hash` & Tombol "Bersihkan Sesi & Hapus Kunci dari RAM"**
  - **File:** `tracker-web/src/App.tsx`, `tracker-web/src/components/TrackerWorkspace.tsx`
  - **Perbaikan:** Begitu tautan 1-klik (`#id=...&key=...`) dibaca ke RAM, URL hash langsung dihapus dari bilah alamat (`history.replaceState`) agar aman dari *shoulder-surfing*, tangkapan layar, dan sinkronisasi riwayat browser. Ditambahkan tombol 1-klik **"Bersihkan Sesi & Hapus Kunci dari RAM"** untuk memutus WebSocket, mengosongkan RAM, dan menghapus `localStorage` (aman dipakai di HP pinjaman/warnet).
- [x] **Anti-CSV Formula Injection (DDE/Excel), Hardening XML GPX, Verifikasi Schnorr BIP-340 NIP-01 & Anti-DoS**
  - **File:** `tracker-web/src/lib/crypto.ts`, `tracker-web/src/lib/nostr.ts`, `tracker-web/src/lib/releaseInfo.ts`, `tracker-web/vercel.json`, `tracker-web/scripts/run-tests.mjs`
  - **Perbaikan:**
    - Verifikasi penuh **NIP-01 SHA-256 Event Commitment ID + Tanda Tangan Schnorr BIP-340** (`verifySchnorrBip340` & `verifyNostrEventSignature`) langsung di browser sebelum dekripsi atau deduplikasi event (mencegah *relay cache poisoning* dan pemalsuan amplop event tanpa menambah dependensi npm baru; teruji dengan vektor resmi BIP-340).
    - Penguncian supply-chain build Vercel dengan `"installCommand": "npm ci --ignore-scripts"` agar wajib memakai hash integritas `package-lock.json` dan memblokir seluruh skrip instalasi paket pihak ketiga.
    - Menetralisir awalan formula Excel (`=`, `+`, `-`, `@`, `\t`, `\r`) pada ekspor CSV serta escape XML lengkap (`"`, `'`, `<`, `>`, `&`) dan penanganan `NaN`/invalid timestamp pada GPX.
    - Validasi ketat `decryptNostrPayload()` (batas ciphertext 4KB, validasi rentang lintang/bujur `[-90..90]`, `[-180..180]`, batas panjang `prv`/`mdl`).
    - Validasi ketat `parseRelaysCsv()` (wajib `wss://` untuk publik, blokir kredensial URL, blokir skema asing, cap maks 8 relay) dan pembatasan ukuran frame WebSocket (16KB) & jumlah event (200/query, 2000 seen cap) untuk mencegah tab browser dibekukan (DoS) oleh relay jahat.
    - Validasi regex ketat SHA-256 & cert fingerprint pada `releaseInfo.ts` dan paksa path unduhan lokal `/lacakhp-resmi.apk`.
- [x] **Publikasi `/.well-known/security.txt` (RFC 9116) & `robots.txt`**
  - **File:** `tracker-web/public/.well-known/security.txt`, `tracker-web/public/robots.txt`
- [x] **Konsistensi Data Simulasi Demo**
  - **File:** `tracker-web/src/lib/demoData.ts`
  - **Perbaikan:** Menyelaraskan contoh ciphertext wire ke format `v1:...` dan relay failover ke `wss://nostr.bitcoiner.social`.
- [x] **Reproducible / Deterministic Build Gradle & Mode Bebas Daemon**
  - **File:** `tracker-android/build.gradle.kts`, `publish-update.sh`
  - **Perbaikan:** Mengaktifkan `isPreserveFileTimestamps = false` dan `isReproducibleFileOrder = true`, serta memakai `./gradlew --no-daemon` di skrip rilis agar tidak menyisakan proses Java/Gradle di RAM Mac.

---

## 2. Ceklis yang BELUM Dilakukan (Rilis, Uji Lapangan & Roadmap)

### 🚀 Rilis & Deployment
- [x] **Deploy Hardening Website (`tracker-web`) ke `https://lacakinhp110.my.id`**
  - Sudah LIVE & terverifikasi via `curl -sI` pada 24 November 2026: seluruh header OWASP (`CSP`, `HSTS`, `COOP`, `CORP`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Frame-Options: DENY`), `version.json` (`no-store`), `lacakhp-resmi.apk` (`attachment`), dan `/.well-known/security.txt` aktif 100%.
- [ ] **Publikasikan Rilis APK Android v2.7 (Build 9) ke `https://lacakinhp110.my.id`**
  - Semua perbaikan Android (Anti-SIM Swap, Direct SMS Command Fallback, `allowBackup=false`, Stealth flavor `play`, dll.) sudah lulus unit test & build lokal, menunggu giliran rilis APK.
  - Perintah rilis saat sudah siap:
    ```zsh
    ./publish-update.sh 9 "2.7" "Hardening keamanan menyeluruh: fail-safe SMS Command & SIM Swap, allowBackup=false, validasi domain update, dan perbaikan Stealth Mode."
    ```
- [ ] **Commit & Push Perubahan ke Repositori GitHub**
  - Sinkronkan kode sumber terbaru ke GitHub agar publik/auditor bisa memverifikasi seluruh perubahan dan menjalankan GitHub Actions CI.

### 📱 Pengujian Fisik di Perangkat Nyata (Field QA)
- [ ] **Uji Lapangan Anti-SIM Swap (Hot-Swap & Cold-Swap)**
  - Uji pada HP fisik (Android 12–15, Dual-SIM seperti Xiaomi HyperOS / Samsung One UI): kunci SIM sah → kunci layar HP (Doze/idle) → tukar dengan SIM lain → pastikan SMS darurat masuk ke Nomor Pemantau beserta nomor HP kartu baru & koordinat (baik di luar ruangan maupun dalam gedung).
- [ ] **Uji Lapangan Perintah SMS Saat Layar Mati Lama (Doze Mode)**
  - Kirim `LACAK <PIN>`, `LACAK <PIN> KUNCI`, `LACAK <PIN> BUNYI`, dan `LACAK <PIN> STATUS` ketika data seluler dimatikan dan layar terkunci > 30 menit.
- [ ] **Uji Skenario Izin Parsial**
  - Matikan izin Lokasi (sisakan izin SMS & Telepon), lalu uji tukar kartu SIM dan perintah `LACAK <PIN> KUNCI` untuk memastikan Direct Receiver Fallback tetap membalas SMS.

### 🔐 Keamanan & Distribusi Jangka Panjang
- [ ] **Migrasi ke Release Signing Keystore (`debuggable = false`)**
  - Saat ini distribusi sideload masih menggunakan `app-full-debug.apk` agar sertifikat (`E3:10:0D:61...`) tetap kompatibel untuk update menimpa instalasi awal pengguna.
  - Untuk perilisan skala besar (Play Store / F-Droid / rilis mayor v3.0), perlu migrasi ke **Release Keystore** khusus (`isDebuggable = false`) dengan panduan migrasi satu kali bagi pengguna lama.
- [ ] **Pantau Hasil Banding Google Play Protect**
  - Tindak lanjuti status appeal yang didokumentasikan pada `GOOGLE_PLAY_PROTECT_APPEAL.md`.
- [ ] **Bangun Jaringan Relay Nostr Komunitas Terkurasi**
  - Rencana infrastruktur jangka panjang sesuai `RELAY_PLANNING.md` agar tidak bergantung penuh pada relay publik global.
- [ ] **Verifikasi Checksum APK di Dalam `UpdateChecker` (Opsional)**
  - Saat ini `UpdateChecker` mengambil `apkSha256` dari `version.json` namun proses unduh diserahkan ke browser. Ke depan bisa ditampilkan potongan `apkSha256` di dialog notifikasi update agar pengguna makin mudah memverifikasi.

---

## 3. Hasil Verifikasi Otomatis Terakhir

| Komponen & Perintah Uji | Status |
| :--- | :---: |
| `tracker-web`: `npm test` (PBKDF2 v2, SHA-256 v1, AES-256-GCM, BTS filter, CSV/GPX) | **✅ PASSED** |
| `tracker-web`: `npm run build` (`tsc --noEmit && vite build`) | **✅ PASSED** |
| `tracker-android`: `./gradlew --no-daemon testFullDebugUnitTest` | **✅ PASSED** |
| `tracker-android`: `./gradlew --no-daemon testPlayDebugUnitTest` | **✅ PASSED** |
| `tracker-android`: `./gradlew --no-daemon assembleFullDebug assemblePlayDebug` | **✅ PASSED** |
| Kebersihan Proses Java / Gradle / Kotlin Daemon di Mac | **✅ BERSIH (0 proses)** |
