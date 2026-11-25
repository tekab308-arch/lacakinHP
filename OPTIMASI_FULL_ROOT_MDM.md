# Spesifikasi Desain Terkunci: Benteng Device Owner (MDM) & Bukti Hukum IMEI

**Status Desain:** ✅ **FINAL — Disepakati via Sesi `/grill-me` (24 November 2026)**  
**Nama Paket Resmi:** `com.lacakhp.app` (`TrackerAdminReceiver`)  
**Prinsip Utama:** **100% Patuh Whitelist Google Play Protect**, Zero-Knowledge E2EE, dan tanpa ketergantungan SDK pihak ketiga tambahan di dalam APK.

> [!IMPORTANT]
> **Aturan Rilis Selama Review Google Play Protect:**  
> Jangan menimpa file `/lacakhp-resmi.apk` di server `https://lacakinhp110.my.id` sampai email persetujuan whitelist dari tim Google Play Protect diterima, agar checksum SHA-256 file APK tetap konsisten selama proses peninjauan. Pengembangan fitur sisi Web (`tracker-web`) dan kode lokal Android (`tracker-android`) aman dikerjakan tanpa menyentuh biner APK live.

---

## 1. Ringkasan 7 Keputusan Arsitektur (Hasil Alignment)

| No | Cabang Desain | Keputusan yang Dikunci | Alasan Keamanan & Operasional |
| :---: | :--- | :--- | :--- |
| **1** | **Mekanisme Inti Anti-Hapus** | **Murni `Device Owner` resmi** di atas `BIND_DEVICE_ADMIN` (**tanpa `AccessibilityService`** dan tanpa modifikasi root `/system` pada APK utama). | `AccessibilityService` pemblokir menu Setelan identik dengan pola trojan perbankan (berisiko mencabut whitelist Play Protect & diblokir *Restricted Settings* Android 13–15). `Device Owner` memakai izin `BIND_DEVICE_ADMIN` yang sudah diajukan secara resmi. |
| **2** | **Jalur Aktivasi Pengguna** | **2 Tingkat Bertahap tanpa SDK tambahan di APK:**<br>• **Level 1 (Awam):** *Device Admin* biasa 1-klik.<br>• **Level 2 (Benteng Maksimal):** Panduan perintah salin-tempel ADB / *aShell+Shizuku* + **QR Code Provisioning** di web untuk HP baru/reset. | Menjaga ukuran & kebersihan APK tetap murni tanpa library eksekusi shell pihak ketiga, sekaligus mudah dipakai baik oleh keluarga awam maupun pengguna lanjutan tanpa laptop. |
| **3** | **Aturan Pembatasan Sistem (*Mode Cerdas*)** | • **Aktif Permanen:** Blokir Uninstall (`setUninstallBlocked`), Blokir Factory Reset (`DISALLOW_FACTORY_RESET`), Blokir Safe Mode (`DISALLOW_SAFE_BOOT`), Blokir User Tamu (`DISALLOW_ADD_USER`), & Kunci Izin Lokasi/SMS/Telepon (`PERMISSION_GRANT_STATE_GRANTED`).<br>• **Saklar Opsional + Otomatis Saat Darurat:** Blokir Mode Pesawat (`DISALLOW_AIRPLANE_MODE`) & Paksa GPS Nyala (`setLocationEnabled(true)`) aktif otomatis saat terdeteksi Ganti SIM / Salah PIN / Perintah `LACAK KUNCI`. | Tidak menyulitkan pemilik sah dalam pemakaian harian (mis. saat naik pesawat komersial), namun otomatis mengunci seluruh jalur pelarian sinyal begitu terjadi indikasi pencurian. |
| **4** | **Syarat Pelepasan Sah (*Anti-Shoulder-Surfing*)** | **Verifikasi Ganda Wajib:** Lolos Kunci Layar HP (PIN/Sidik Jari) **DAN** mengetik ulang **Kunci Rahasia LacakHP (Sandi / 12 Kata Seed)** sebelum memanggil `clearDeviceOwnerApp()`. | Melindungi dari skenario pencuri yang mengintip PIN layar 6 angka di tempat umum sebelum merampas HP, tanpa risiko pemilik terkunci karena Kunci Rahasia tercatat di Kartu Darurat keluarga. |
| **5** | **Pengamanan Port USB Debugging / ADB** | **Matikan & kunci otomatis `DISALLOW_DEBUGGING_FEATURES`** segera setelah `Device Owner` aktif, dilengkapi saklar *"Izinkan USB Debugging Sementara"* di dalam aplikasi (wajib Verifikasi Ganda). | Menutup celah pemilik yang lupa mematikan USB Debugging seusai setup ADB/Shizuku, sehingga laptop konter servis langsung ditolak di level OS. |
| **6** | **Arsitektur Penyimpanan Nomor IMEI** | **Lokal & Kartu Darurat (0% sebar ke Nostr):** Baca otomatis via `getImei()` saat `Device Owner` aktif (atau input opsional 1x via `*#06#`) untuk dicantumkan pada **Kartu Darurat WA keluarga**, ditambah **kolom input lokal di RAM browser** saat mencetak PDF laporan. | Keluarga tidak kelabakan mencari dus HP saat panik, namun nomor IMEI tidak pernah ikut disiarkan di lalu lintas jaringan publik Nostr. |
| **7** | **Format Lembar Bukti Kepolisian & Operator** | **Modal khusus *"Siapkan Lembar Bukti Polisi & Blokir IMEI"* di Web:** Input opsional di RAM (Nama, No HP Hilang, IMEI 1/2, Kronologi) $\rightarrow$ menghasilkan cetakan **A4 resmi** siap lampiran LP/STPL SPKT Polri & CEIR Operator lengkap dengan **Pubkey, Event ID SHA-256, & Signature Schnorr BIP-340**. | Memberikan bukti forensik kriptografis yang rapi dan dapat diverifikasi keasliannya oleh penyidik kepolisian maupun petugas gerai operator seluler. |

---

## 2. Spesifikasi Teknis Implementasi

### Fase A — Fitur Sisi Web (`tracker-web`) *(Dapat Dikerjakan & Di-deploy Lebih Dulu)*

1. **Simpan Metadata Bukti Kriptografi pada Dekripsi Nostr (`nostr.ts` & `crypto.ts`):**
   - Menyimpan `eventId` (SHA-256 64-hex), `pubkey` (secp256k1 x-only 64-hex), dan `sig` (Schnorr BIP-340 128-hex) pada objek titik lokasi yang berhasil didekripsi dan diverifikasi.
2. **Modal & Layout Cetak A4 `PoliceEvidenceModal.tsx` (`TrackerWorkspace.tsx`):**
   - Seluruh input formulir tambahan (**Nama Pelapor**, **Nomor HP Korban**, **IMEI 1 & IMEI 2**, **Catatan Kejadian**) hidup **100% di state RAM React** (tidak pernah disimpan ke `localStorage` dan tidak pernah dikirim ke server).
   - Output cetak `@media print` A4 bersih berlatar putih:
     - Judul dokumen: **LAMPIRAN DATA TEKNIS PELACAKAN MANDIRI & BUKTI KRIPTOGRAFI DIGITAL (PENDUKUNG LP / STPL KEPOLISIAN & PEMBLOKIRAN IMEI OPERATOR)**.
     - Tabel Identitas Perangkat (Tipe HP dari telemetri, ID Perangkat, IMEI 1/2, Nomor Terdampak).
     - Titik Koordinat Terakhir Presisi (Lintang, Bujur, Akurasi ±meter, Provider GNSS/Network, Baterai, Waktu WIB, & Link/QR Google Maps).
     - Tabel Riwayat Kronologi Pergerakan (10–20 titik terbaru yang sudah bersih dari loncatan BTS).
     - Kotak **Segel Keaslian Kriptografi (BIP-340 Schnorr / SHA-256)** agar dapat diaudit secara matematis.
3. **Panduan & Generator QR Provisioning `Device Owner` (`ArchitectureGuide.tsx`):**
   - Menampilkan perintah resmi salin-tempel dengan nama paket yang benar:
     ```bash
     adb shell dpm set-device-owner com.lacakhp.app/.TrackerAdminReceiver
     ```
   - Panduan 3 langkah praktis tanpa laptop via *Shizuku + aShell* (lepas akun Google sementara 1 menit $\rightarrow$ jalankan perintah $\rightarrow$ login kembali akun Google).

---

### Fase B — Fitur Sisi Android (`tracker-android` v2.7+) *(Uji Lokal Dulu, Tahan Upload APK Sampai Whitelist Keluar)*

1. **Manajer Kebijakan `DeviceOwnerHelper.kt` & `TrackerAdminReceiver.kt`:**
   - Deteksi `dpm.isDeviceOwnerApp(context.packageName)`.
   - Saat aktif (*Mode Cerdas*):
     ```kotlin
     dpm.setUninstallBlocked(admin, pkg, true)
     dpm.addUserRestriction(admin, UserManager.DISALLOW_FACTORY_RESET)
     dpm.addUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT)
     dpm.addUserRestriction(admin, UserManager.DISALLOW_ADD_USER)
     dpm.addUserRestriction(admin, UserManager.DISALLOW_DEBUGGING_FEATURES)
     // Kunci permanen izin runtime esensial agar tidak bisa dimatikan pencuri
     listOf(
         Manifest.permission.ACCESS_FINE_LOCATION,
         Manifest.permission.ACCESS_COARSE_LOCATION,
         Manifest.permission.ACCESS_BACKGROUND_LOCATION,
         Manifest.permission.POST_NOTIFICATIONS
     ).plus(VariantSmsBridge.requiredPermissions()).forEach { perm ->
         dpm.setPermissionGrantState(admin, pkg, perm, DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED)
     }
     ```
   - Eskalasi darurat otomatis (`enforceEmergencyLockdown`): dipanggil dari `SimChangeReceiver`, `onPasswordFailed >= 3`, dan perintah SMS `LACAK KUNCI`:
     ```kotlin
     if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && dpm.isDeviceOwnerApp(pkg)) {
         dpm.addUserRestriction(admin, UserManager.DISALLOW_AIRPLANE_MODE)
         dpm.setLocationEnabled(admin, true)
     }
     ```
2. **Alur Verifikasi Ganda (`MainActivity.kt`):**
   - Fungsi `requireDualOwnerAuth(title, subtitle, onVerified)`:
     1. Panggil `requireDeviceCredential(...)` (PIN/Biometrik layar HP).
     2. Tampilkan dialog konfirmasi **Kunci Rahasia LacakHP**; cocokkan dengan `CryptoHelper.normalizeSecret(input) == CryptoHelper.normalizeSecret(TrackerPrefs.getSeedphrase(this))`.
     3. Hanya jika keduanya valid, izinkan aksi sensitif:
        - Saklar sementara USB Debugging (`clearUserRestriction(DISALLOW_DEBUGGING_FEATURES)`).
        - Saklar Mode Pesawat.
        - Pelepasan penuh kepemilikan perangkat (`clearUserRestriction` seluruhnya + `setUninstallBlocked(false)` + `clearDeviceOwnerApp(packageName)`).
3. **Pencatatan IMEI Lokal & Kartu Darurat (`TrackerPrefs.kt` & `MainActivity.kt`):**
   - Jika `isDeviceOwnerApp` aktif dan izin `READ_PHONE_STATE` tersedia, baca otomatis `TelephonyManager.getImei(slotIndex)` untuk slot 0 & 1; selain itu sediakan tombol/kolom opsional *"Simpan Nomor IMEI (*#06#) ke Kartu Darurat"*.
   - Sertakan baris `IMEI 1 / IMEI 2` di dalam teks `buildEmergencyCardText()` yang dibagikan pemilik ke WhatsApp keluarga.

---

## 3. Ceklis Urutan Eksekusi Bertahap
- [x] **Tahap 0:** Kunci seluruh keputusan desain & keselarasan whitelist Google Play Protect (`/grill-me`).
- [ ] **Tahap 1 (Web — Aman Deploy Sekarang):** Implementasi penyimpanan bukti `eventId/pubkey/sig` Nostr + Modal **Lembar Bukti Polisi & Blokir IMEI (Cetak A4 Resmi)** di `tracker-web`.
- [ ] **Tahap 2 (Web — Aman Deploy Sekarang):** Tambahkan panduan aktivasi `Device Owner` (ADB / Shizuku) di tab *Cara Kerja & Keamanan*.
- [ ] **Tahap 3 (Android — Build & Unit Test Lokal):** Implementasi `DeviceOwnerHelper`, Mode Cerdas, Eskalasi Darurat, Verifikasi Ganda, Kunci USB Debugging, & IMEI pada Kartu Darurat di `tracker-android`.
- [ ] **Tahap 4 (Rilis APK Setelah Email Whitelist Play Protect Keluar):** Publikasikan APK v2.7+ ke `/lacakhp-resmi.apk` dan uji fisik di perangkat nyata.
