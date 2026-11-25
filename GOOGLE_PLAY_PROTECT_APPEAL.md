# Berkas Pengajuan Banding Resmi Google Play Protect (Whitelist Submission)

Dokumen ini berisi seluruh data teknis dan draf teks resmi yang siap disalin (*copy-paste*) untuk diajukan ke portal keamanan **Google Play Protect Appeals** secara gratis.

---

## 1. Tautan Formulir Pengajuan
Buka tautan ini di browser (cukup login akun Gmail biasa):  
👉 **[https://support.google.com/googleplay/android-developer/contact/protectappeals](https://support.google.com/googleplay/android-developer/contact/protectappeals)**

---

## 2. Isian Kolom Formulir (Tinggal Salin-Tempel)

| Kolom di Formulir Google | Nilai yang Harus Diisikan |
| :--- | :--- |
| **Developer Name** | `Sena / LacakHP Open-Source Project` |
| **Email Address** | *(Masukkan alamat email Gmail aktif Anda)* |
| **Application Package Name** | `com.lacakhp.app` |
| **Link to Download APK** | `https://lacakinhp110.my.id/lacakhp-resmi.apk` |
| **Certificate SHA-256 Fingerprint** | `E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48` |
| **APK File SHA-256 Checksum** | `40846386060feb4505226327e65c1cfaac103533cb21b1075356ae97cbf4dfaa` |

---

## 3. Teks Surat Penjelasan Resmi (Kolom Justification)

Salin seluruh teks bahasa Inggris di bawah ini ke dalam kotak:  
**_“Describe why you believe your app is not harmful or why it should not be blocked”_**:

```text
Dear Google Play Protect Security & Anti-Malware Team,

I am writing to respectfully request a security review and whitelisting for our non-profit, open-source emergency lost-device recovery application, "LacakHP" (Package Name: com.lacakhp.app).

Our official website is: https://lacakinhp110.my.id
Direct APK download link: https://lacakinhp110.my.id/lacakhp-resmi.apk
Certificate Fingerprint (SHA-256): E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48
APK File SHA-256: 40846386060feb4505226327e65c1cfaac103533cb21b1075356ae97cbf4dfaa

Justification for High-Privilege Permissions:
1. SEND_SMS & RECEIVE_SMS: Strictly used as an offline failover channel when stolen devices have cellular data or Wi-Fi severed by thieves. This allows verified family members to retrieve GPS coordinates through an authorized PIN-protected command ("LACAK <PIN>"). Our application DOES NOT harvest contact lists, DOES NOT intercept banking OTPs, and DOES NOT send unauthorized premium SMS.
2. ACCESS_BACKGROUND_LOCATION & ACCESS_FINE_LOCATION: Essential for continuously recording GNSS satellite coordinates to a local device-protected SQLite queue while the screen is off/locked during an active recovery scenario.
3. BIND_DEVICE_ADMIN: Used solely via DevicePolicyManager to prevent thieves from immediately uninstalling the security service upon acquiring the device.
4. Privacy & Zero-Knowledge Architecture: All location points are encrypted locally on the device using AES-256-GCM and signed with BIP-340 Schnorr signatures prior to transmission over decentralized Nostr relays (NIP-01/NIP-78). No centralized tracking database exists, and user privacy is mathematically preserved.

Our application is distributed 100% free of charge for humanitarian assistance and contains zero ad SDKs, zero spyware, and zero monetization trackers.

We kindly ask your team to review this clean build and whitelist its signing certificate to remove false-positive installation warnings for our users.

Thank you very much for your time and assistance.

Sincerely,
Sena
Lead Developer, LacakHP Indonesia
https://lacakinhp110.my.id
```

---

## 4. Panduan Langkah Kirim (Hanya 3 Menit)

1. Buka formulir di [Google Play Protect Appeals](https://support.google.com/googleplay/android-developer/contact/protectappeals).
2. Isi nama dan email Gmail Anda.
3. Tempelkan data Package Name, link APK, dan sertifikat SHA-256 dari tabel di atas.
4. Tempelkan teks surat bahasa Inggris di atas ke kotak penjelasan.
5. Centang konfirmasi dan ketuk tombol **Submit / Kirim**.

---

## 5. Apa yang Perlu Dilakukan Setelah Kirim?

* **Periksa Kotak Masuk Gmail:** Anda akan menerima email konfirmasi otomatis dari tim Google Play Protect (*"We received your appeal request"*).
* **Waktu Tinjauan:** Proses pemindaian otomatis memakan waktu **1 hingga 3 hari kerja**.
* **Konfirmasi Selesai:** Begitu disetujui, Google akan mengirimkan email pemberitahuan bahwa sistem deteksi Play Protect telah diperbarui untuk mengenali APK kita sebagai aplikasi yang aman.
