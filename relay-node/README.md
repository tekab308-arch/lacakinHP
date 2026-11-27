# Panduan Node Relay Relawan LacakHP (5 Menit via Docker)

Siapa pun (komunitas IT, kampus, atau relawan) dapat menjalankan node relay Nostr mandiri agar jaringan **LacakHP** semakin terdesentralisasi dan bebas dari titik kegagalan tunggal (*single point of failure*).

Relay ini **buta total (Zero-Knowledge)**: seluruh koordinat HP sudah terenkripsi AES-256-GCM dan ditandatangani BIP-340 Schnorr sebelum keluar dari HP. Operator relay tidak dapat membaca lokasi maupun memalsukan data.

---

## Prasyarat
- 1 VPS Linux (1 vCPU / 1 GB RAM sudah sangat cukup) dengan Docker & Docker Compose terpasang.
- 1 domain/subdomain (misal `relay.komunitas-anda.id`) yang DNS A-record-nya sudah diarahkan ke IP VPS, dengan port `80` dan `443` terbuka.

---

## Langkah Menjalankan Node

1. Masuk ke folder `relay-node` dan sesuaikan metadata di `strfry.conf` (opsional: isi `name` dan `contact` agar muncul di NIP-11).
2. Jalankan Docker dengan nama domain Anda:
   ```bash
   RELAY_DOMAIN=relay.komunitas-anda.id docker compose up -d
   ```
3. Caddy akan otomatis menerbitkan sertifikat SSL Let's Encrypt dan membuka endpoint `wss://relay.komunitas-anda.id`.
4. Uji koneksi node Anda:
   ```bash
   curl -H "Accept: application/nostr+json" https://relay.komunitas-anda.id
   ```

---

## Mendaftarkan Node ke Registry Publik LacakHP

1. Tambahkan entri node Anda di `tracker-web/public/community-relays.json` dengan `"isCore": false` dan `"status": "active"`.
2. Uji validasi lokal:
   ```bash
   node tracker-web/scripts/verify-relay.mjs --live
   ```
3. Kirim **Pull Request** ke repositori `tekab308-arch/lacakinHP` — GitHub Action akan memverifikasi aturan anti-SSRF, handshake NIP-11, dan koneksi WSS secara otomatis.
