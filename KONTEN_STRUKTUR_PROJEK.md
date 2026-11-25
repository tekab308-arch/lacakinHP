# Bedah Struktur & Arsitektur Projek LacakHP: Panduan Materi Konten

Dokumen ini disusun khusus sebagai bahan materi konten (artikel blog, utas Twitter/X, naskah video TikTok/Reels/YouTube, atau presentasi teknis) untuk mengedukasi masyarakat dan komunitas pengembang mengenai cara kerja dan struktur di balik **LacakHP**.

---

## 💡 Hook & Sudut Pandang Konten (Angle)

> **"Kenapa saat HP hilang, aplikasi pelacak biasa malah sering gagal? Dan bagaimana sebuah inisiatif amal mandiri bisa menciptakan sistem pelacakan darurat tanpa server pusat yang aman bahkan dari pembuatnya sendiri?"**

---

## 1. Masalah Besar di Lapangan vs Solusi LacakHP

| Masalah Aplikasi Konvensional (Google / Play Store) | Solusi Radikal di LacakHP |
| :--- | :--- |
| **Jebakan 2FA (Verifikasi 2 Langkah):** Saat mau melacak lewat laptop, Google minta kode OTP yang dikirim ke HP yang baru saja hilang. | **Tautan 1-Klik Instan (`#hash`):** Keluarga cukup klik link di WhatsApp, browser langsung buka peta tanpa login akun. |
| **Mati Kutu Saat Maling Mematikan Internet:** Pelacak biasa langsung berstatus *Offline*. | **Dual-Channel (Internet + SMS Darurat):** Tetap merespons titik koordinat satelit via perintah SMS rahasia ber-PIN. |
| **Maling Ganti Kartu SIM / Copot Aplikasi:** Pelacak biasa mudah dihapus maling dalam 5 detik. | **Device Admin & Anti-SIM Swap:** Tombol *Uninstall* dikunci mati oleh sistem, dan penggantian SIM otomatis mengirim SMS darurat. |
| **Privasi Dijual / Server Bocor:** Riwayat lokasi dicatat di database korporasi yang rentan bocor. | **Zero-Knowledge E2EE:** Data dienkripsi di HP dengan **AES-256-GCM**. Pembuat aplikasi dan relay sekalipun tidak bisa melihat lokasi. |

---

## 2. Peta Alur Arsitektur Sistem (Data Flow)

```
[HP KORBAN (LacakHP Android)]
   │
   ├── (Sensor Gerak Mendeteksi HP Berpindah)
   ├── (Chip GPS Mengunci Koordinat Satelit)
   ├── (Enkripsi Lokal: AES-256-GCM + Tanda Tangan Schnorr BIP-340)
   │
   ├──► [Kanal 1: Internet Aktif] ──► [Jaringan Nostr Multi-Relay Terdesentralisasi]
   │                                  (damus.io • nos.lol • primal.net)
   │                                                 │
   │                                                 ▼ (WebSocket Live Push)
   │                                  [PETA WEB PEMANTAU KELUARGA]
   │                                  (lacakinhp110.my.id/#id=...&key=...)
   │                                  *Dekripsi 100% Lokal di Browser*
   │
   └──► [Kanal 2: Internet Mati] ───► [SMS Darurat Otomatis] ──► [HP Keluarga]
```

---

## 3. Anatomi Struktur Repositori (Codebase Breakdown)

Projek ini terbagi menjadi 2 pilar utama yang sangat ramping dan terisolasi:

```text
charity/
├── tracker-android/          # Aplikasi Klien Android (Kotlin murni, Non-Root)
│   ├── app/src/main/
│   │   ├── java/com/lacakhp/app/
│   │   │   ├── MainActivity.kt        # UI penyiapan kunci, izin, & diagnostik HP
│   │   │   ├── TrackerService.kt      # Jantung latar belakang, Watchdog, & Sensor Fusion
│   │   │   ├── NostrRelayClient.kt    # Klien WebSocket Nostr multi-relay & failover
│   │   │   ├── LocationDbHelper.kt    # Antrean kotak hitam SQLite offline di Device-Protected Storage
│   │   │   ├── SmsCommandReceiver.kt  # Parser perintah SMS darurat ber-PIN (LACAK)
│   │   │   ├── SimChangeReceiver.kt   # Sensor anti-tukar kartu SIM maling
│   │   │   ├── TrackerAdminReceiver.kt# Kebijakan Device Policy Manager (Anti-Uninstall)
│   │   │   ├── BootReceiver.kt        # Direct Boot (aktif sebelum layar kunci dibuka)
│   │   │   └── ApkIntegrityHelper.kt  # Verifikasi sidik jari tanda tangan SHA-256
│   │   └── AndroidManifest.xml        # Deklarasi izin minimum & Direct Boot aware
│   └── build.gradle.kts               # Konfigurasi Reproducible & Deterministic Build
│
├── tracker-web/              # Portal Peta Web Pemantau (React + Vite + Tailwind)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── crypto.ts              # Web Crypto API murni (AES-GCM, PBKDF2 100k)
│   │   │   └── nostr.ts               # Langganan WebSocket multi-relay & auto-failover
│   │   ├── components/
│   │   │   ├── RadarMap.tsx           # Peta Leaflet interaktif (Jejak rute, Satelit Esri, Dark Mode)
│   │   │   ├── LegalConsentModal.tsx  # Modal persetujuan hukum UU ITE & UU PDP saat unduh
│   │   │   ├── WelcomeBanner.tsx      # Banner pengenalan & panduan instalasi 4 langkah
│   │   │   └── ArchitectureGuide.tsx  # Panduan interaktif cara kerja Zero-Knowledge
│   │   └── App.tsx                    # Parser URL #hash, status sinkronisasi, & ekspor CSV/GPX
│   └── vercel.json                    # Konfigurasi Security Headers (HSTS, Anti-Clickjacking, CSP)
│
└── .github/workflows/
    └── ci.yml                         # Pembangunan otomatis transparan & Reproducible Build
```

---

## 4. Tiga Pilar Keamanan "Maha-Penting" (Bahan Diskusi Konten)

### Pilar 1: "Aman Bahkan dari Pembuatnya Sendiri" (*Trustless Architecture*)
* Kunci rahasia dibuat di HP pengguna dan hanya dikirim ke WhatsApp keluarga.
* URL menggunakan tanda pagar: `lacakinhp110.my.id/#id=...&key=...`. Sesuai standar web RFC 3986, **karakter setelah `#` tidak pernah dikirim ke server hosting**.
* Pengembang tidak punya *master key* dan tidak punya database pusat. Pengembang mustahil bisa mengintip lokasi warga.

### Pilar 2: "Reproducible Builds" (Bukti Tanpa Celah Backdoor)
* Kompilasi Android dikonfigurasi secara deterministik (`isPreserveFileTimestamps = false` dan `isReproducibleFileOrder = true`).
* Siapa pun peneliti keamanan di dunia yang mengompilasi kode GitHub ini akan menghasilkan file biner APK yang identik bit-demi-bit. Ini membuktikan secara matematis bahwa **tidak ada kode jahat yang diselundupkan**.

### Pilar 3: "Benteng Hukum Terpasang Rapi"
* Tombol unduh APK dilindungi oleh **Modal Persetujuan Hukum (Clickwrap Agreement)**.
* Pengguna wajib menyetujui bahwa aplikasi hanya dipasang di HP sendiri, dan diingatkan sanksi pidana penjara hingga 10 tahun / denda miliaran rupiah (**Pasal 30 & 31 UU ITE serta Pasal 65 UU PDP No. 27/2022**) jika menyalahgunakannya untuk memata-matai orang lain.

---

## 5. Fakta Menarik untuk Naskah Video Pendek (Trivia / Reels / TikTok)

1. **Biaya Server Rp 0 Seumur Hidup:** Memanfaatkan jaringan publik Nostr yang didanai komunitas global dan static edge hosting Vercel.
2. **Bisa Melacak Tanpa Kuota Internet:** Jika HP masuk hutan atau kuota habis, keluarga cukup kirim SMS `LACAK <PIN>`, HP otomatis membalas dengan link koordinat Google Maps.
3. **Maling Tidak Bisa Mematikan Aplikasi:** Menu *Uninstall* di pengaturan HP terkunci otomatis berkat izin *Device Policy Manager*.
4. **Bisa Menyala Sebelum Layar Kunci Dibuka:** Fitur *Direct Boot Aware* membuat antena GPS langsung memancarkan koordinat begitu HP dinyalakan, bahkan sebelum pencuri memasukkan pola/PIN layar.
5. **Non-Root:** 100% aman untuk M-Banking (BCA, Mandiri, BRImo, DANA) dan garansi HP pabrik tetap aman.
