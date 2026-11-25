# Kebijakan Keamanan & Audit Terbuka LacakHP

LacakHP adalah proyek amal *open-source* yang memprioritaskan transparansi dan audit publik. Kami **sangat menyambut** pengembang, peneliti keamanan, dan tim IT untuk menguji, meninjau, serta **menyanggah** implementasi keamanan maupun privasi di kode sumber ini.

---

## 1. Melaporkan Celah Keamanan Secara Privat (*Responsible Disclosure*)

Jika Anda menemukan celah keamanan berdampak tinggi (misalnya kebocoran kunci dekripsi, celah pada eksekusi perintah SMS jarak jauh, celah XSS di web dekripsi, atau bypass verifikasi PIN/Device Admin):

1. **Jangan** mempublikasikan rincian eksploitasi secara terbuka terlebih dahulu agar pengguna di lapangan tidak menjadi sasaran penyalahgunaan.
2. Laporkan secara **privat** melalui fitur **GitHub Security Advisories** (tab **Security → Advisories → Report a vulnerability** pada repositori ini) atau hubungi pengelola resmi proyek.
3. Sertakan informasi lengkap berikut dalam laporan:
   - Lokasi berkas & baris kode terkait (`tracker-android/` atau `tracker-web/`).
   - Skenario serangan atau *Proof of Concept* (PoC) yang dapat direproduksi.
   - Dampak terhadap kerahasiaan lokasi, kunci rahasia pengguna, atau kontrol perangkat.
4. Setelah perbaikan dirilis dan disebarkan ke pengguna melalui endpoint pembaruan resmi (`https://lacakinhp110.my.id/version.json`), laporan dapat dipublikasikan secara terbuka dengan kredit kepada penemu (jika bersedia).

---

## 2. Ruang Lingkup Klaim yang Terbuka untuk Diaudit & Disanggah

Developer dipersilakan menguji klaim-klaim inti berikut langsung dari kode sumber:

| Komponen | Klaim Keamanan / Privasi | Berkas Acuan untuk Diaudit |
| :--- | :--- | :--- |
| **Enkripsi Zero-Knowledge** | Koordinat dienkripsi AES-256-GCM sebelum meninggalkan HP; derivasi kunci v2 memakai PBKDF2-HMAC-SHA256 100.000 putaran; tanda tangan event Nostr memakai BIP-340 Schnorr (`secp256k1`). | `tracker-android/.../CryptoHelper.kt`, `tracker-web/src/lib/crypto.ts` |
| **Tautan 1-Klik (`#hash`)** | `ID Perangkat`, `Kunci Rahasia`, dan `relays` berada di fragmen URL `#` sehingga tidak dikirim ke server web saat browser memuat halaman. | `tracker-android/.../TrackerPrefs.kt`, `tracker-web/src/App.tsx` |
| **Direct Boot & Offline Queue** | Kunci & antrean GPS SQLite disimpan di *Device-Protected Storage* (`createDeviceProtectedStorageContext()`) agar menyala sebelum PIN layar dibuka setelah restart. | `BootReceiver.kt`, `TrackerPrefs.kt`, `LocationDbHelper.kt`, `TrackerService.kt` |
| **Otorisasi SMS (Versi Lengkap)** | Perintah SMS hanya melayani nomor pemantau terdaftar (*whitelist*) atau pengirim yang menyertakan PIN SMS eksplisit. | `tracker-android/app/src/full/java/com/lacakhp/app/SmsHelper.kt`, `SmsCommandReceiver.kt` |
| **Anti-Uninstall & Anti-Sabotase** | Mengunci tombol uninstall via `DevicePolicyManager`, mengirim peringatan sabotase saat Admin dicoba dimatikan, salah PIN layar berulang, mode pesawat, atau shutdown. | `TrackerAdminReceiver.kt`, `TrackerService.kt` |
| **Keaslian APK & Anti-Clone** | Verifikasi runtime sertifikat X.509 APK terhadap sidik jari SHA-256 rilis resmi + pemeriksaan domain resmi di web. | `ApkIntegrityHelper.kt`, `tracker-web/src/App.tsx` |

---

## 3. Batasan Teknis yang Diketahui (*Known Limitations*)

Untuk menjaga kejujuran teknis kepada masyarakat dan auditor, hal-hal berikut memang merupakan batasan sistem operasi Android dan bukan bug tersembunyi:

1. **Factory Reset Paksa:** Menghapus seluruh partisi data termasuk aplikasi LacakHP. Pada kondisi ini, pemilik tetap mengandalkan *Factory Reset Protection (FRP)* bawaan Google dan riwayat jejak terakhir yang sudah terunggah ke relay sebelum reset.
2. **Pembatasan Izin Android 13–15 / Xiaomi HyperOS (*Restricted Settings*):** Pemasangan `.apk` dari luar Play Store secara bawaan mengunci izin SMS sampai pemilik membuka *Izinkan setelan terbatas* di Info Aplikasi secara manual.
3. **Agresivitas Penghemat Baterai OEM (Samsung / Xiaomi / Oppo / Vivo):** Diperlukan penyetelan baterai **Tidak dibatasi** (*Unrestricted*) dan kunci aplikasi di daftar aplikasi terbuka agar proses latar belakang tidak dimatikan sistem saat layar tidur lama.

---

## 4. Verifikasi Rilis Resmi

Cocokkan aplikasi dan situs yang Anda audit dengan identitas resmi berikut:

- **Domain Web Resmi:** `https://lacakinhp110.my.id` (Mirror: `https://tracker-web-xi.vercel.app`)
- **Application ID Android (Versi Lengkap):** `com.lacakhp.app`
- **Sidik Jari Sertifikat Penandatangan APK (SHA-256):**
  `E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48`
- **Ketentuan Hukum & Lisensi:** Lihat berkas [LICENSE](LICENSE).
