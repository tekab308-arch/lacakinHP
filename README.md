# LacakHP — Projek Amal Open-Source Zero-Knowledge

Aplikasi tambahan gratis untuk menjaga dan membantu melacak handphone Android yang hilang atau dicuri demi mendukung masyarakat serta tugas kepolisian — dibangun dengan arsitektur **End-to-End Encryption (E2EE) Zero-Knowledge**, **Nostr Multi-Relay Auto-Failover** (tanpa server penyimpanan pusat), **antrean SQLite offline**, **Direct Boot Recovery**, **Anti-Sabotase**, dan **Perintah SMS Darurat**.

- **Portal Web Resmi:** [`https://lacakinhp110.my.id`](https://lacakinhp110.my.id) *(Mirror resmi: [`https://tracker-web-xi.vercel.app`](https://tracker-web-xi.vercel.app))*
- **Unduhan APK Resmi:** [`https://lacakinhp110.my.id/lacakhp-resmi.apk`](https://lacakinhp110.my.id/lacakhp-resmi.apk)
- **Endpoint Versi Terbaru:** [`https://lacakinhp110.my.id/version.json`](https://lacakinhp110.my.id/version.json)

> **Waspada Penipuan:** LacakHP adalah projek amal *open-source* **100% gratis**. Kami tidak pernah meminta tebusan, transfer uang, PIN bank, atau kode OTP untuk membuka lokasi.

---

## Struktur Direktori
- `tracker-android/` — Aplikasi Android Kotlin dengan 2 versi build:
  - `full` (`com.lacakhp.app`): Versi Lengkap dengan perintah SMS offline (`LACAK`, `LACAK KUNCI`, `LACAK BUNYI`, `LACAK STATUS`) dan peringatan ganti SIM (`SimChangeReceiver`).
  - `play` (`com.lacakhp.app.play`): Versi Internet bebas izin SMS (`SEND_SMS` / `RECEIVE_SMS`), siap jalur Google Play.
- `tracker-web/` — Portal web **React + Vite + TypeScript + Tailwind CSS** (OpenStreetMap + Leaflet + Web Crypto + `@noble/secp256k1` ter-bundle lokal tanpa CDN JS eksternal) yang mendekripsi koordinat **100% lokal di RAM browser**, dilengkapi peta radar, inspeksi kriptografi transparan, SOP Pertolongan Pertama (LP/STPL + Call Center Polri `110`), dan panduan instalasi APK untuk masyarakat.
- `publish-update.sh` — Skrip rilis 1-perintah untuk build APK, menghitung SHA-256, memperbarui `version.json`, dan deploy ke domain resmi.

---

## Ringkasan Fitur Keamanan & Anti-Sabotase (v2.2)

1. **Mode Keamanan Fleksibel & Tautan 1-Klik (`#id=...&key=...&relays=...`):**
   - Mendukung **Kata Sandi Pribadi** maupun **12 Kata Seed BIP-39** dengan derivasi **v2 PBKDF2-HMAC-SHA256 (100.000 putaran)** serta dukungan mundur v1.
   - Fragmen URL di belakang tanda `#` diproses lokal di browser tanpa pernah terkirim ke server hosting.
2. **Direct Boot Recovery & Kotak Hitam SQLite:**
   - Layanan dan penerima sinyal tetap menyala setelah HP di-*restart* bahkan **sebelum PIN layar dibuka** (`LOCKED_BOOT_COMPLETED` + *Device-Protected Storage*).
   - Mencatat hingga 2.000 titik GPS ke SQLite lokal saat internet mati dan otomatis mengirimkannya begitu tersambung ke WiFi/seluler.
3. **Anti-Uninstall, Kunci SIM Permanen, & Anti-Sabotase:**
   - Mengunci tombol uninstall via `DevicePolicyManager` serta menembakkan sinyal darurat jika Admin coba dinonaktifkan (`onDisableRequested`).
   - Mendeteksi penggantian kartu SIM, tombol Matikan Daya (*Shutdown Last-Gasp*), pengaktifan Mode Pesawat, baterai kritis (`<= 8%`), serta percobaan salah PIN layar kunci berulang kali (3x ke Nostr Relay, 5x ke SMS pemantau).
   - Mendukung **Mode Penyamaran (*Stealth*)** opsional (*Layanan Sinkronisasi Sistem*) dan perintah SMS `<KATA_KUNCI> KUNCI` untuk mengunci paksa layar HP dari jarak jauh.
4. **Auto-Failover Multi-Relay Nostr & Update Otomatis:**
   - Mengutamakan 3 relay utama (`relay.damus.io`, `nos.lol`, `relay.primal.net`) dan otomatis beralih ke 3 relay cadangan (`offchain.pub`, `nostr.mom`, `relay.snort.social`) apabila relay utama terganggu.
   - Pemeriksaan pembaruan APK otomatis di dalam aplikasi via `version.json` serta verifikasi sertifikat rilis resmi SHA-256 (`ApkIntegrityHelper`).

---

## Verifikasi Keaslian Rilis Resmi (Anti-Clone & Anti-Phishing)
- **Sidik Jari Sertifikat Penandatangan APK (SHA-256):**
  `E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48`
- **Paket Resmi:** `com.lacakhp.app`
- **Domain Resmi:** `https://lacakinhp110.my.id`

---

## Audit Kode, Bug Report, & Sanggahan Developer
Kami mengundang developer dan auditor keamanan untuk memeriksa atau menyanggah klaim di proyek ini:
- Baca [SECURITY.md](SECURITY.md) untuk daftar klaim audit, batasan sistem Android, dan pelaporan celah keamanan secara privat (*Responsible Disclosure*).
- Baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan build lokal, aturan *Pull Request*, dan cara mengajukan sanggahan teknis via `.github/ISSUE_TEMPLATE/`.
- Baca [LICENSE](LICENSE) untuk ketentuan lisensi amal non-komersial dan perlindungan merek resmi **LacakHP**.
