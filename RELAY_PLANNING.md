# Rencana Arsitektur & Manajemen Jaringan Relay Relawan (LacakHP Relay Network)

Dokumen ini memuat perencanaan teknis, standar keamanan, tata cara kurasi otomatis, serta peta jalan (*roadmap*) penggabungan server relay relawan (*Community Nodes*) ke dalam sistem darurat **LacakHP**.

---

## 1. Filosofi & Batasan Arsitektur

1. **Zero-Knowledge Imperative:** Server relay **hanya kurir buta** (*blind courier*). Seluruh muatan lokasi wajib terenkripsi lokal dengan **AES-256-GCM** sebelum menyentuh relay.
2. **Kedaulatan Tanda Tangan Digital:** Setiap *event* Nostr kind `3078` dan `30078` wajib menyertakan tanda tangan kriptografi **BIP-340 Schnorr** yang valid. Relay tidak memiliki wewenang memodifikasi paket.
3. **Quorum & Redundansi (Anti Single-Point-of-Failure):** Klien Android dan Web selalu memancarkan dan mendengarkan data ke **minimal 3 relay** secara paralel. Jika satu relay tumbang atau dimatikan oleh relawan, sistem beralih otomatis tanpa jeda (*zero downtime*).
4. **Isolasi Keamanan (Zero-Trust):** Pendaftaran relay relawan baru tidak boleh membuka celah peretasan web browser (XSS, SSRF, Port Scanning, maupun spamming).

---

## 2. Struktur Berkas Registry (`community-relays.json`)

Berkas publik berversi yang ditempatkan di:  
`tracker-web/public/community-relays.json`

```json
{
  "version": 1,
  "updatedAt": "2026-11-23T20:30:00Z",
  "minQuorum": 2,
  "relays": [
    {
      "id": "damus-core",
      "url": "wss://relay.damus.io",
      "name": "Damus Global Core",
      "location": "Global / US-EU",
      "operator": "Damus Foundation",
      "isCore": true,
      "status": "active",
      "latencyMs": 190
    },
    {
      "id": "noslol-core",
      "url": "wss://nos.lol",
      "name": "Nos.lol Core",
      "location": "Global",
      "operator": "Nos.lol Collective",
      "isCore": true,
      "status": "active",
      "latencyMs": 180
    },
    {
      "id": "primal-core",
      "url": "wss://relay.primal.net",
      "name": "Primal Production Core",
      "location": "Global / US",
      "operator": "Primal Inc.",
      "isCore": true,
      "status": "active",
      "latencyMs": 210
    },
    {
      "id": "id-relawan-jkt-01",
      "url": "wss://relay.lacak-relawan.id",
      "name": "Relawan Cyber Jakarta",
      "location": "Jakarta, ID",
      "operator": "Komunitas Relawan IT Indonesia",
      "contact": "admin@lacak-relawan.id",
      "isCore": false,
      "status": "active",
      "verifiedAt": "2026-11-23",
      "latencyMs": 12
    }
  ]
}
```

---

## 3. Alur Verifikasi Otomatis (*Automated Validation Pipeline*)

Untuk memastikan server relawan aman dan stabil sebelum masuk ke registri nasional, bot CI/CD (GitHub Action) menjalankan pengujian 4 tahap:

```
[Pengajuan PR / Form Web]
       │
       ▼
[Tahap 1: Validasi Sintaks & Sanitasi URL]
  • Wajib diawali "wss://" (Enkripsi WSS/TLS)
  • Wajib nama FQDN sah (Domain Publik)
  • Tolak alamat IP lokal (127.0.0.1, localhost, 192.168.x.x, 10.x.x.x)
       │
       ▼
[Tahap 2: Handshake NIP-11 Metadata]
  • Mengirim HTTP GET Header "Accept: application/nostr+json"
  • Mengecek ketersediaan software relay (strfry / khatru / nostr-rs-relay)
       │
       ▼
[Tahap 3: Uji Tulis & Baca Nostr Kind 3078]
  • Mengirim dummy event terenkripsi AES-256
  • Menguji pembacaan kembali melalui filter ["REQ", ...]
  • Memastikan event tidak di-drop atau diblokir
       │
       ▼
[Tahap 4: Uji Latensi & Benchmark Jaringan]
  • Round-trip time (RTT) wajib < 350 ms
  • Tidak ada packet loss dalam 5x handshake berturut-turut
       │
       ▼
[LULUS: Bot Beri Label 'Passed-Verification'] -> Siap di-Merge
```

---

## 4. Mitigasi Keamanan Siber (*Defensive Security Matrix*)

| Potensi Vektor Serangan | Mekanisme Pertahanan di Klien LacakHP |
| :--- | :--- |
| **XSS (Injeksi Skrip di Nama Relay / URL)** | React bawaan otomatis melakukan *HTML-escaping*. Seluruh nama relay dirender sebagai plain string tanpa `dangerouslySetInnerHTML`. Header `Content-Security-Policy (CSP)` aktif di Vercel. |
| **SSRF / Pemindaian Intranet (`192.168.x.x`)** | Parser URL menolak mentah-mentah protokol selain `wss://` dan memblokir seluruh jangkauan IP RFC-1918. |
| **Relay Jahat Memalsukan Lokasi** | Koordinat dilindungi oleh **BIP-340 Schnorr Signature** perangkat asli. Server relay tidak bisa merekayasa isi tanpa membuat verifikasi signature gagal total. |
| **Relay Jahat Mengintip Koordinat** | Payload dienkripsi dengan **AES-256-GCM** menggunakan kunci rahasia turunan PIN/Secret (Zero-Knowledge). Relay hanya melihat teks acak biner. |
| **Relay Relawan Tiba-tiba Mati / Down** | Logika Auto-Failover di Web & Android: jika relay gagal merespons dalam 4 detik, klien beralih ke relay cadangan (*Fallback Pool*). |
| **Bot Pemantau Uptime Berkala** | Cron Job 6-jam memvalidasi ulang seluruh relay terdaftar. Relay yang tidak aktif > 48 jam dicopot otomatis dari daftar aktif. |

---

## 5. Sinkronisasi ke Web & Aplikasi Android

1. **Frontend Web (`tracker-web`):**
   * Saat pertama kali dimuat, memanggil `fetch('/community-relays.json')`.
   * Menggabungkan relay inti default dengan relay relawan berstatus `active` yang memiliki latensi terendah.
   * Menyediakan sakelar (*toggle*) di pengaturan teknis agar pengguna bebas memilih relay yang diinginkan.
2. **Android Client (`tracker-android`):**
   * Kelas `UpdateChecker` atau `RelaySyncWorker` mengunduh daftar relay terkurasi saat terhubung ke Wi-Fi.
   * Disimpan ke dalam `TrackerPrefs` sebagai daftar relay failover dinamis.
   * Tautan darurat 1-klik (`#hash`) menyematkan parameter `&relays=` sesuai konfigurasi aktif.

---

## 6. Peta Jalan Pelaksanaan (*Actionable Roadmap*)

* [x] **Fase 1 (Selesai):** Multi-Relay failover client-side (Damus, Nos.lol, Primal) + fallback relays.
* [x] **Fase 2 (Selesai):** Security Headers (CSP, HSTS, X-Frame-Options: DENY, Anti-Sniff) di hosting produksi.
* [ ] **Fase 3:** Pembuatan berkas `tracker-web/public/community-relays.json` dan skrip validator `scripts/verify-relay.mjs`.
* [ ] **Fase 4:** Komponen UI pemilih relay relawan lokal Indonesia di halaman pemantau web.
* [ ] **Fase 5:** Skrip GitHub Action Uptime Sentinel berkala (Cron 6 jam).
