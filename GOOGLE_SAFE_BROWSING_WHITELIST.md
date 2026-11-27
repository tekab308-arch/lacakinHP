# Panduan Whitelist Google Safe Browsing & Migrasi APK ke GitHub Releases

Dokumen ini berisi langkah praktis untuk menghilangkan status mencurigakan Google pada domain **`https://lacakinhp110.my.id`** tanpa merusak pengajuan banding Google Play Protect yang sedang berlangsung.

> **Penting:** Sesuai aturan integritas rilis proyek, file `tracker-web/public/lacakhp-resmi.apk` (v2.6, SHA-256 `de81c0fe3bc3d6cbe50a467bb4143fe4a0a41d9207ba56f12281f105cea1d970`) dan `version.json` **tidak ditimpa** selama proses peninjauan Play Protect berlangsung.

---

## Langkah 1 — Upload APK v2.6 Saat Ini ke GitHub Releases

### Opsi A — Langsung dari Termius / Terminal SSH
Jika ingin mengunggah langsung lewat terminal tanpa buka browser:
```zsh
brew install gh
gh auth login
gh release create v2.6 tracker-web/public/lacakhp-resmi.apk \
  --title "LacakHP v2.6 (Build 8) — Rilis Resmi" \
  --notes "Rilis resmi LacakHP v2.6 (APK SHA-256: de81c0fe3bc3d6cbe50a467bb4143fe4a0a41d9207ba56f12281f105cea1d970)"
```

### Opsi B — Lewat Browser
1. Buka `https://github.com/tekab308-arch/lacakinHP/releases/new`
2. Isi:
   - **Tag version:** `v2.6`
   - **Release title:** `LacakHP v2.6 (Build 8) — Rilis Resmi`
   - **Attach binaries:** unggah file `tracker-web/public/lacakhp-resmi.apk` yang sudah ada (jangan build ulang agar SHA-256 tetap `de81c0fe3bc3d6cbe50a467bb4143fe4a0a41d9207ba56f12281f105cea1d970`).
3. Klik **Publish release**.

### Cek Link Rilis Sudah Aktif (Dari Termius)
```zsh
curl -I -L https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk
```
Pastikan status akhir `HTTP/2 200`.

---

## Langkah 2 — Arahkan `version.json` ke GitHub Releases

Setelah langkah 1 selesai (dan setelah email whitelist Play Protect diterima jika sedang menunggu):

1. Ubah `apkUrl` di `tracker-web/public/version.json` menjadi:
   ```json
   "apkUrl": "https://github.com/tekab308-arch/lacakinHP/releases/download/v2.6/lacakhp-resmi.apk"
   ```
2. Portal web (`WelcomeBanner` & `ArchitectureGuide`) sudah diperbarui untuk otomatis membaca `apkUrl` dari `version.json` selama berasal dari repositori resmi `https://github.com/tekab308-arch/lacakinHP/releases/`.
3. Untuk rilis versi mendatang (misal v2.7 setelah whitelist Play Protect disetujui), jalankan:
   ```zsh
   HOST_APK_ON_GITHUB=1 ./publish-update.sh 9 "2.7" "Hardening keamanan menyeluruh..."
   ```

---

## Langkah 3 — Klaim & Request Review di Google Search Console

1. Buka **[Google Search Console](https://search.google.com/search-console)** -> **Add Property** -> pilih **Domain**: `lacakinhp110.my.id`.
2. Tambahkan **DNS TXT Record** verifikasi dari Google ke pengaturan DNS registrar domain `.my.id` Anda, lalu klik **Verify**.
3. Di menu kiri, buka **Security & Manual Actions** -> **Security issues**.
4. Jika muncul peringatan (*Deceptive pages* / *Harmful downloads*), klik **Request Review** dan tempel teks berikut:

```text
This domain (https://lacakinhp110.my.id) is the official non-profit portal for the open-source emergency lost-device recovery project "LacakHP".

1. Open-Source Verification: Complete source code for both the web portal and Android app is publicly auditable at https://github.com/tekab308-arch/lacakinHP under our non-commercial anti-abuse license.
2. Zero-Knowledge Client-Side Web App: The website collects zero personal data, uses no tracking cookies, and performs all cryptographic decryption locally in browser memory (no login, no OTP, no payment).
3. Transparent Distribution & Security Policy: Privacy policy, SHA-256 checksum verifier, and SECURITY.md are linked directly on the homepage and footer. Official APK binaries are distributed via GitHub Releases.

Please review and clear any false-positive Safe Browsing warning on lacakinhp110.my.id. Thank you.
```

---

## Langkah 4 — Cek Status & Submit Sitemap

1. Di Google Search Console -> menu **Sitemaps**, kirimkan:
   `https://lacakinhp110.my.id/sitemap.xml`
2. Cek status Safe Browsing secara berkala di:
   `https://transparencyreport.google.com/safe-browsing/search?url=lacakinhp110.my.id`
3. Jika peringatan masih muncul dari form publik, kirim laporan tambahan melalui:
   **[Google Safe Browsing Incorrect Phishing/Malware Warning](https://safebrowsing.google.com/safebrowsing/report_error/)** untuk URL `https://lacakinhp110.my.id/`.
