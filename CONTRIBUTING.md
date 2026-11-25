# Panduan Kontribusi, Pelaporan Bug, & Sanggahan Teknis (CONTRIBUTING)

Terima kasih telah meluangkan waktu untuk meninjau, menguji, mengoreksi, atau berkontribusi pada proyek amal **LacakHP**. Proyek ini terbuka bagi developer Android, pengembang web, praktisi keamanan siber, maupun relawan untuk bersama-sama menjaga kualitas serta keandalannya di lapangan.

---

## 1. Cara Menyanggah Klaim atau Melaporkan Bug

Agar diskusi berjalan objektif dan mudah ditindaklanjuti, pilih jalur pelaporan yang sesuai:

1. **Bug Aplikasi / Web / Kompatibilitas HP (Samsung, Xiaomi HyperOS, Oppo, Vivo, dll.):**
   Buka **GitHub Issue** menggunakan template **`Bug Report`** (`.github/ISSUE_TEMPLATE/bug_report.md`). Jelaskan merek HP, versi Android/OS, versi APK, dan langkah reproduksi.
2. **Sanggahan Teknis, Audit Kriptografi, atau Koreksi Arsitektur:**
   Buka **GitHub Issue** menggunakan template **`Audit & Sanggahan Teknis`** (`.github/ISSUE_TEMPLATE/audit_dan_sanggahan.md`). Sertakan referensi baris kode yang disanggah, alasan teknis atau hasil pengujian, serta usulan perbaikannya.
3. **Celah Keamanan Kritis (Privasi / Kriptografi / Izin Berbahaya):**
   Laporkan secara **privat** terlebih dahulu sesuai panduan di [SECURITY.md](SECURITY.md) — jangan mempublikasikan eksploitasi aktif di ruang publik sebelum tambalan dirilis.

---

## 2. Lingkungan Pengembangan & Cara Build Lokal

### A. Aplikasi Android (`tracker-android/`)
- **Prasyarat:** JDK 17 dan Android SDK (`compileSdk = 35`, `minSdk = 26`, `targetSdk = 35`).
- **Build dua versi APK (`full` & `play`):**
  ```zsh
  cd tracker-android
  ./gradlew assembleFullDebug assemblePlayDebug
  ```
- **Output APK:**
  - `tracker-android/app/build/outputs/apk/full/debug/app-full-debug.apk`
  - `tracker-android/app/build/outputs/apk/play/debug/app-play-debug.apk`

### B. Portal Web (`tracker-web/`)
- **Prasyarat:** Node.js 20+ dan npm.
- **Menjalankan server pengembangan / build produksi:**
  ```zsh
  cd tracker-web
  npm install
  npm run dev
  npm run build
  ```

---

## 3. Prinsip Wajib Setiap Perubahan Kode (*Pull Request*)

Setiap *Pull Request* akan ditinjau oleh pengelola resmi sebelum digabungkan (*merge*). Perubahan kode wajib mematuhi prinsip berikut:

1. **Tetap Zero-Knowledge & Tanpa Backend Pelacakan Pusat:**
   Tidak boleh mengirim `ID Perangkat`, `Kunci Rahasia`, atau koordinat lokasi polos ke server HTTP mana pun maupun layanan analitik pihak ketiga (Google Analytics, Firebase, iklan, dll.).
2. **Kompatibilitas Mundur Enkripsi (v1 & v2):**
   Perubahan pada skema derivasi kunci atau payload Nostr wajib tetap mendukung dekripsi data lama (v1 & v2) agar perangkat yang sudah terpasang di HP masyarakat tidak putus pelacakannya.
3. **Minimalkan Izin Sensitif:**
   - Versi **`play`** wajib bebas dari izin SMS (`SEND_SMS`, `RECEIVE_SMS`, `READ_PHONE_STATE`).
   - Versi **`full`** hanya memakai izin SMS/lokasi/Admin untuk fitur darurat pemilik yang sah.
4. **Bahasa Jelas untuk Masyarakat:**
   Setiap teks antarmuka (UI) di aplikasi dan web diupayakan memakai bahasa Indonesia yang jelas, ramah untuk masyarakat awam, dan terbebas dari istilah yang membingungkan.
5. **Kepatuhan Lisensi & Identitas Resmi:**
   Jangan menyertakan file kunci penandatangan (`.keystore` / `.jks`) atau kredensial privat ke dalam commit/PR. Seluruh kontribusi mengikuti ketentuan non-komersial dan perlindungan merek pada berkas [LICENSE](LICENSE).
