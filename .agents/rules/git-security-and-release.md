---
name: git-security-and-release
description: Guardrails untuk memastikan tidak ada kredensial/file terlarang yang ter-commit ke Git, menjaga integritas hash APK selama review Play Protect, dan menyinkronkan whitelist mirror domain.
trigger: always_on
---

# Aturan Keamanan Git & Distribusi LacakHP

## 1. Larangan Mutlak Commit Git (Pre-Commit Audit)
Sebelum menjalankan `git commit` atau `git push`:
- WAJIB verifikasi daftar staged files (`git diff --cached --name-only`).
- DILARANG KERAS menyertakan:
  - File kunci / keystore (`*.jks`, `*.keystore`, `keystore.properties`)
  - File kredensial/lingkungan (`.env`, `.env.*`, token, password)
  - File path lokal (`local.properties`)
  - Konfigurasi internal hosting (`.vercel/`)
  - Artefak build lokal (`build/`, `dist/`, `.gradle/`, `.idea/`, `.DS_Store`)

## 2. Integritas Rilis APK Selama Review Google Play Protect
- Jangan menimpa file `tracker-web/public/lacakhp-resmi.apk` atau mengubah `version.json` di server live jika pengajuan banding Google Play Protect sedang dalam proses peninjauan.
- Seluruh perbaikan kode Android dapat terus diuji dan di-build secara lokal tanpa menyentuh biner APK live sampai email konfirmasi whitelist diterima.

## 3. Sinkronisasi Whitelist Domain Mirror
- Setiap kali menambahkan platform mirror hosting baru (seperti Cloudflare Pages atau custom domain), WAJIB serentak memperbarui:
  1. `OFFICIAL_WEB_HOSTS` dan fungsi `isOfficialWebHost` di `tracker-web/src/App.tsx`.
  2. Entri `Mirrors` di `tracker-web/public/.well-known/security.txt`.
  3. Header keamanan `public/_headers` dan `vercel.json` agar skor keamanan selalu A+.
