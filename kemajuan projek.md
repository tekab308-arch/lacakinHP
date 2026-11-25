# Kemajuan Proyek: LacakHP Open-Source (Charity Edition)

Dokumen ini mencatat ringkasan arsitektur, kemajuan fitur, hasil uji coba nyata, serta penjelasan teknis sistem pelacakan mandiri **LacakHP** untuk pertolongan darurat masyarakat umum.

---

## 1. Filosofi & Visi Proyek
* **Tujuan Utama:** Pertolongan pertama pencarian HP hilang/dicuri untuk masyarakat umum tanpa bergantung pada ekosistem berbayar.
* **Biaya Server:** **Rp 0 (Nol Rupiah)** — Memanfaatkan *Static Hosting* (Vercel) dan jaringan terdesentralisasi *Nostr Public Multi-Relay*.
* **Privasi Mutlak (Zero-Knowledge E2EE):** Tidak ada server pusat, tidak ada database admin yang bisa bocor atau mengintip lokasi pengguna. Seluruh koordinat dienkripsi secara lokal di HP dan hanya bisa dibuka di browser peramban keluarga yang memiliki kunci rahasia.
* **Tahan Kondisi Ekstrem (Offline-First):** Tetap bekerja mencatat rute satelit GPS dan merespons via SMS meskipun data internet mati, kuota habis, atau kartu SIM dicabut.

---

## 2. Fitur yang Telah Selesai Diimplementasikan

### A. Dua Varian Android (Dual-Flavor Architecture)
1. **Varian `full` (Sideload / F-Droid):**
   * Mendukung perintah SMS darurat: `LACAK`, `LACAK BUNYI`, `LACAK STATUS`.
   * Dilengkapi fitur **Kunci Kartu SIM (Anti-SIM Swap)**: jika pencuri mengganti kartu SIM lama dengan kartu SIM baru miliknya, aplikasi otomatis mendeteksi pergantian tersebut dan diam-diam mengirim SMS koordinat ke nomor keluarga menggunakan pulsa kartu SIM si pencuri.
2. **Varian `play` (Google Play Store Compliant):**
   * Bebas dari izin SMS (`SEND_SMS`, `RECEIVE_SMS`, `READ_PHONE_STATE`).
   * Menggunakan pelacakan murni berbasis internet Nostr E2EE agar lolos kebijakan ketat Google Play Store.

### B. Keamanan Kriptografi Zero-Knowledge
* **Enkripsi:** AES-256-GCM dengan *Initialization Vector* (IV) 12 byte acak di setiap titik lokasi.
* **Tanda Tangan Digital:** BIP-340 Schnorr Signature (`libsecp256k1` via JNI native C/Rust) deterministik diturunkan dari `(ID Perangkat + Kunci Rahasia)`.
* **Protokol Transmisi:** Nostr NIP-01 (Events Kind `30078` Parameterized Replaceable & Kind `3078`).

### C. Pilihan Mode Keamanan Fleksibel (Security vs Usability)
* **Mode Sederhana (Kata Sandi Pribadi / Passphrase):**
  * Pengguna bisa membuat kata sandi sendiri (minimal 6 karakter, misal: `kucinglucu2024` atau nama yang mudah dihafal).
  * Menghilangkan beban menghafal kata acak saat kondisi panik darurat.
* **Mode Brankas (12 Kata Seed BIP-39):**
  * Dibuat otomatis oleh sistem dengan entropi acak matematis maksimal untuk jurnalis, aktivis, atau pegiat privasi.

### D. Tautan Darurat 1-Klik (*Magic Link Zero-Knowledge*)
* Tombol **"Kirim ke Keluarga"** di Android menghasilkan tautan URL Hash:
  `https://tracker-web-xi.vercel.app/#id=samsung-sm-a217f&key=kucinglucu2024`
* Karakter setelah tanda `#` **tidak pernah dikirim ke server web Vercel**.
* Keluarga cukup mengklik tautan tersebut di chat WhatsApp $\rightarrow$ Web langsung mendekripsi dan menampilkan peta OpenStreetMap secara otomatis tanpa perlu mengetik kata sandi manual.

### E. Pertahanan dari Upaya Penghapusan (Anti-Maling)
1. **Anti-Uninstall (Administrator Perangkat):**
   * Menggunakan `TrackerAdminReceiver` (`DevicePolicyManager`).
   * Tombol "Copot Pemasangan" di pengaturan Android dinonaktifkan (di-lock) sehingga pencuri tidak bisa sembarangan menghapus aplikasi.
2. **Direct Boot Recovery (`LOCKED_BOOT_COMPLETED`):**
   * Jika HP dimatikan atau di-force restart, aplikasi otomatis langsung menyala dan memancarkan GPS di latar belakang **bahkan sebelum layar kunci (PIN/pola) dibuka**.
3. **Peringatan Baterai Kritis (*Last-Gasp*):**
   * Saat baterai tersisa $\le 8\%$, HP otomatis mengunci koordinat GPS satelit paling presisi lalu mengirimkannya via SMS dan Nostr sebelum HP mati kehabisan daya.
4. **Antrean Kotak Hitam (SQLite Offline Queue):**
   * Titik-titik satelit GPS tetap dicatat ke database lokal saat offline, dan langsung disinkronkan otomatis saat HP mendeteksi koneksi WiFi (misalnya WiFi di rumah pencuri / konter servis).

### F. Antarmuka Web React + TypeScript Modern & Informatif (Bebas CORS & Tanpa AI-Slop)
`tracker-web/` telah ditingkatkan menjadi aplikasi web statis **React + Vite + TypeScript + Tailwind CSS** (~122 KB gzipped, ter-bundle bersama Leaflet, Lucide icons, dan `@noble/secp256k1` tanpa bergantung CDN JS/CSS eksternal):
* **3 Tab Navigasi Utama yang Informatif:**
  1. **Pelacak Live (`TrackerWorkspace`):** Form dekripsi + deteksi mode kunci otomatis, indikator **status live per-relay Nostr** (latensi ms & jumlah event), **Inspeksi Kriptografi Zero-Knowledge** (menampilkan *pubkey* turunan lokal & contoh *ciphertext* yang dilihat relay), kartu telemetri + bar baterai kritis, **peta OpenStreetMap dengan toggle Mode Gelap/Terang & animasi Radar Beacon**, **Mode Simulasi Demo Interaktif**, serta **riwayat jejak klik-untuk-fokus**.
  2. **Cara Kerja & Keamanan (`ArchitectureGuide`):** Penjelasan visual alur enkripsi HP $\rightarrow$ Nostr Relay $\rightarrow$ Dekripsi Browser, fitur ketahanan offline/SMS/Last-Gasp, serta tabel perbandingan jujur dengan Google Find My Device.
  3. **Pertolongan Pertama (`FirstAidChecklist`):** Daftar periksa SOP darurat interaktif (Incognito Find My, cek IMEI, daftar nomor Call Center blokir SIM operator Indonesia, pembekuan e-wallet/m-banking, hingga laporan polisi).
* **Jaminan Bebas CORS:** Seluruh JS/CSS di-hosting satu origin di Vercel, peta memakai tile standar `tile.openstreetmap.org`, dan koneksi Nostr memakai WebSocket (`wss://`) yang kebal pembatasan HTTP CORS.

### G. Security Hardening & Ketahanan Uji Lapangan (`v2`)
* **Kriptografi PBKDF2-HMAC-SHA256 `v2` (100.000 Iterasi) + ID Unik:** `ID Perangkat` bawaan otomatis mendapat akhiran acak 4 hex (mis. `samsung-sm-a217f-7f3a`), dan derivasi kunci ditingkatkan ke PBKDF2 100k iterasi di Android (`CryptoHelper.kt`) & Browser (`crypto.ts`) lengkap dengan **Dual-Lookup** (`v2` + fallback `v1` legacy) di Web Viewer.
* **Perlindungan Layar Tidak Terkunci (`KeyguardManager`):** Kunci Rahasia disamarkan secara default (`••••••`) dan hanya bisa dibuka, disalin, diubah, atau dilepas Admin-nya setelah lolos verifikasi PIN/Sidik Jari layar HP.
* **Direct Boot Asli (`directBootAware` + `DeviceProtectedStorage`):** `TrackerPrefs`, `LocationDbHelper`, `BootReceiver`, `TrackerService`, `SmsCommandReceiver`, dan `SimChangeReceiver` sudah memindahkan/memakai *Device-Protected Storage* dan `LOCKED_BOOT_COMPLETED` agar tetap aktif setelah restart meski PIN layar belum dibuka.
* **Otorisasi SMS Ketat & Anti-Spam Fallback (`SmsHelper.kt`, `SmsFallbackReceiver.kt`):** SMS `LACAK` polos ditolak dari nomor asing jika Nomor Pemantau kosong (hanya mengizinkan nomor terdaftar atau SMS dengan PIN khusus `LACAK <PIN>`), serta otomatis mengirim ulang koordinat angka polos tanpa URL jika pengiriman SMS bertautan Google Maps ditolak operator.
* **Interval GPS Adaptif Hemat Baterai & Panel Diagnosa:** Interval otomatis turun ke 30 menit bila HP diam $> 20$ menit (`isStationaryMode`) dan kembali 10 menit saat bergerak $> 50\text{m}$, dilengkapi tombol **Simulasi Kritis (7%)** dan **Diagnosa Kesiapan HP** (termasuk panduan Samsung One UI).

---

## 3. Penjelasan Khusus: Relay Nostr (pisahkan koma)

### Apa Itu Relay Nostr?
Relay Nostr adalah **server kurir / menara siaran terdesentralisasi**. Berbeda dengan aplikasi konvensional (seperti Google Find My Device, Life360, atau Zenly) yang mengirim data ke satu perusahaan raksasa:
* Nostr menggunakan ribuan server terbuka (*relay*) di seluruh dunia yang dijalankan oleh komunitas secara independen.
* Aplikasi LacakHP mengirimkan paket data terenkripsi ke beberapa relay sekaligus (*multi-relay redundancy*). Jika satu relay sedang down atau diblokir operator, relay lainnya tetap menerima dan menyampaikan data tersebut ke web viewer Anda.

### Apakah Kolom Relay Harus Diisi Sendiri oleh Pengguna?
**JAWABAN: TIDAK PERLU.**
* Sistem aplikasi Android dan web viewer sudah mengisinya secara otomatis (*pre-filled default*):
  `wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net`
* Pengguna awam tidak perlu repot mencari atau mengetik alamat relay. Langsung pakai tanpa perlu pusing memikirkan infrastruktur di baliknya.

### Lalu Apa Fungsi Kolom Tersebut Disediakan?
Kolom input tersebut disediakan untuk prinsip **Kemerdekaan Infrastruktur (Open-Source Freedom)**:
1. **Toleransi Gangguan (Redundansi):** Jika salah satu relay publik mengalami gangguan jaringan (seperti status HTTP 503), sistem tetap dapat bertukar data melalui relay cadangan.
2. **Relay Pribadi (Private Relay) untuk Instansi/Keluarga:** Komunitas kemanusiaan, tim relawan bencana, atau instansi yang ingin privasi 100% mandiri dapat menyewa VPS sendiri seharga $2/bulan untuk menjalankan relay Nostr pribadi, lalu memasukkan alamatnya di kolom tersebut.

### Apakah Pemilik Relay Bisa Melihat Lokasi HP Pengguna?
**SAMA SEKALI TIDAK BISA.**
Data koordinat telah dienkripsi dengan algoritma standar militer **AES-256-GCM** langsung di dalam memori HP sebelum dikirim lewat internet. Pemilik relay hanya melihat kumpulan huruf acak (*ciphertext*) seperti `v1:qK8f1...:Lp9Z...` yang mustahil dipecahkan tanpa kunci rahasia pengguna.

---

## 4. Status Pengujian Nyata Perangkat Keras

* **Perangkat Uji:** Samsung Galaxy A21s (`SM-A217F` / `a21snnxx`), Android 12.
* **Koneksi Debug:** Wireless ADB (`192.168.1.12:37489`).
* **Hasil Verifikasi Kompilasi:**
  * `assembleFullDebug` $\rightarrow$ Sukses (0 error).
  * `assemblePlayDebug` $\rightarrow$ Sukses (0 error).
* **Hasil Uji Relay:** Berhasil menerbitkan dan mendekripsi telemetri koordinat GPS secara real-time (`Published 1/1 point(s) across 3 relay(s)`).
* **Hasil Uji Web Viewer:** Live di Vercel ([https://tracker-web-xi.vercel.app](https://tracker-web-xi.vercel.app)), responsif di mobile dan desktop dengan Leaflet OpenStreetMap.
