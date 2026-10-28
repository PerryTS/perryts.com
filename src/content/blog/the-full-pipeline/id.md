---
title: "Pipeline Lengkap: Dokumentasi, Distribusi, dan WidgetKit"
excerpt: "82 commit dalam satu minggu: situs dokumentasi 49 halaman, publikasi otomatis ke App Store dan Play Store, paket Homebrew dan APT, ekstensi WidgetKit native dari TypeScript, widget baru, modul http/https, dan kompiler LLVM self-hosting."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 commit dalam tujuh hari. Situs dokumentasi dengan 49 halaman. Publikasi App Store dan Play Store otomatis. Paket Homebrew dan APT. Ekstensi WidgetKit native yang dikompilasi dari TypeScript. Compiler LLVM self-hosting. Dan puluhan perbaikan bug di setiap platform.

Postingan ini mencakup semua yang dikirimkan di Perry antara tanggal 6 Maret dan 13 Maret 2026. Tema telah selesai — mengisi kekosongan antara "Saya menulis beberapa TypeScript" dan "aplikasi saya ada di App Store."

## docs.perryts.com

Perry kini memiliki situs dokumentasi nyata. 49 halaman dibuat dengan mdBook, mencakup segala hal mulai dari memulai hingga referensi CLI. Dokumen disusun menjadi beberapa bagian:

-   **Memulai** — instalasi, proyek pertama, struktur proyek
-   **Fitur Bahasa** — semuanya Perry mendukung dari TypeScript
-   **UI Asli** — 12 halaman yang mencakup semua jenis widget, tata letak, pengelolaan status, dan perilaku spesifik platform
-   **Platform** — halaman khusus untuk masing-masing dari 6 platform target
-   **Perpustakaan Standar** — 50+ implementasi paket asli didokumentasikan
-   **API Sistem** — dialog file, gantungan kunci, notifikasi, multi-jendela
-   **WidgetKit** — modul ekstensi widget baru
-   **Plugin** — arsitektur plugin waktu kompilasi
-   **CLI** — setiap perintah dan tanda

Situs ini juga menyertakan file `llms.txt` agar AI dapat ditemukan, dan diterapkan melalui Halaman GitHub dengan domain khusus di [docs.perryts.com](https://docs.perryts.com).

## Instal Perry dalam Satu Perintah

Perry kini didistribusikan melalui Homebrew dan APT, selain membangun dari sumber. Pipeline rilis Actions GitHub yang baru membuat binari untuk macOS (arm64 dan x86_64) dan Linux (x86_64 dan arm64), lalu secara otomatis memperbarui tap Homebrew dan APT repositori.

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

Tidak perlu lagi mengkloning repo dan membangun dengan Cargo. Instal Perry dengan cara yang sama seperti Anda menginstal alat lainnya.

## Publikasi App Store Otomatis

Ini adalah perubahan yang menciutkan sebagian besar langkah manual. Menjalankan `perry publish ios` kini menangani seluruh pipeline distribusi iOS secara otomatis:

1.  Menghasilkan kunci RSA dan CSR melalui App Store Connect API
2.  Membuat sertifikat distribusi dan memaketkannya ke dalam `.p12`
3.  Mendaftarkan ID paket
4.  Membuat dan mengunduh profil penyediaan
5.  Membuat App Store Connect data aplikasi
6.  Membuat, menandatangani, dan mengunggah ke TestFlight atau App Store

Tidak ada Xcode. Tidak ada kunjungan portal manual. Tidak ada pengunduhan sertifikat dari browser. Wizard penyiapan berjalan otomatis saat pertama kali Anda memublikasikan, menelusuri konfigurasi kunci API dan menyimpan kredensial di `perry.toml`.

Distribusi macOS juga dilakukan secara otomatis. Perry mendukung tiga mode: TestFlight, DMG yang disahkan, dan mode **"keduanya"** baru yang dipublikasikan ke App Store dan membuat DMG yang disahkan secara bersamaan. Tiga jenis sertifikat dibuat secara otomatis: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION`, dan `DEVELOPER_ID_APPLICATION`.

Publikasi Android juga mendapatkan wizard penyiapan yang dipicu secara otomatis. Ketiga platform kini mengikuti pola yang sama: proses pertama memicu penyiapan, kredensial disimpan ke proyek, proses berikutnya tanpa konfigurasi.

Validasi pra-penerbangan menemukan masalah sebelum pembangunan dimulai — ketidakcocokan ID bundel profil penyediaan, masa berlaku sertifikat, ikon aplikasi hilang, format versi tidak valid, ID tim salah. Dan `encryption_exempt` di `perry.toml [ios]` menyetel otomatis kunci Info.plist `ITSAppUsesNonExemptEncryption`, dan melewati perintah kepatuhan ekspor manual di App Store Connect.

## perry/widget: WidgetKit dari TypeScript

Perry kini dapat mengkompilasi TypeScript ke ekstensi SwiftUI WidgetKit asli. Ini bukan pembungkus atau jembatan — kompiler menjalankan pohon render pada tingkat HIR dan mengeluarkan kode sumber SwiftUI secara langsung. Outputnya adalah paket ekstensi WidgetKit lengkap yang dapat disematkan oleh Xcode (atau Perry) ke dalam aplikasi Anda.

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

Pendekatannya pada dasarnya berbeda dari kompilasi Perry lainnya. Kode Perry normal melewati Cranelift ke kode mesin asli. Kode widget melewati HIR ke keluaran teks SwiftUI, karena WidgetKit memerlukan SwiftUI — tidak ada cara untuk membuat ekstensi widget dengan perintah UIKit atau kode AppKit. Perry memecahkan masalah ini dengan memperlakukan pohon render widget sebagai templat waktu kompilasi, bukan kode waktu proses.

## Widget Baru dan Peningkatan Platform

Empat jenis widget baru hadir minggu ini:

-   **TextArea** — pengeditan teks multi-baris di macOS, iOS, dan Android
-   **SecureField** — masukan sandi di iOS dan macOS
-   **Kode QR** — pembuatan kode QR asli di iOS, macOS, dan Android
-   **Splash Screen** — storyboard LaunchScreen yang dibuat secara otomatis (iOS) dan tema splash (Android)

### iPad Menjadi Native

Perry kini menghasilkan aplikasi lengkap asli iPad: `UIDeviceFamily [1,2]`, dukungan orientasi, `UIRequiresFullScreen`, dan storyboard LaunchScreen yang dikompilasi melalui ibtool. Fungsi `getDeviceIdiom()` baru mendeteksi ponsel vs. iPad saat runtime, dan `PerryFrameSplit` menyediakan wadah pemisahan horizontal berbasis bingkai untuk tata letak iPad.

### Windows

Windows mendapat dukungan pengatur waktu (centang `WM_TIMER` 50 md), tombol yang dibuat oleh pemilik dengan latar belakang tema gelap, dan perbaikan untuk bug penggunaan setelah bebas di `to_wide().as_ptr()` di 18 file widget. Waktu proses V8 kini berfungsi di Windows dengan pustaka sistem yang diperlukan tertaut.

### GTK4 (Linux)

Backend GTK4 menerima penyempurnaan visual agar sesuai dengan macOS: padding CSS untuk sisipan tepi, gaya tombol Adwaita, perbaikan margin VStack, dan kebijakan horizontal ScrollView.

## http/https dan lebih baik-sqlite3

Dua tambahan stdlib yang signifikan:

Modul asli `http` dan `https` yang baru menyediakan HTTP sisi klien menggunakan reqwest di balik terpal. API cocok dengan Node.js: `request()`, `get()`, `ClientRequest` dengan write/end/on, dan `IncomingMessage` dengan statusCode dan event handler.

`better-sqlite3` kini didukung penuh: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — dengan objek kotak dan baris NaN yang tepat dengan akses properti bernama.

Peningkatan stdlib lainnya: `crypto.randomBytes()` sekarang mengembalikan Buffer (cocok dengan Node.js), MongoDB memperoleh `listDatabases` dan `listCollections` dengan perbaikan keamanan thread, dan mysql2 INSERT/UPDATE/DELETE kini mengembalikan `ResultSetHeader` dengan `insertId`.

## Perbaikan GC dan Kebenaran

Beberapa pengumpul sampah penting dan perbaikan kebenaran waktu proses dikirimkan minggu ini:

-   **GC penjaga masuk kembali** — mencegah pengumpulan selama alokasi, memperbaiki kepanikan peminjaman ganda RefCell
-   **GC Pelacakan peta** — Peta kini ditelusuri dengan benar selama fase penandaan, sehingga mencegah pengumpulan kunci string
-   **Perbaikan aliasing string** — penambahan string sekarang selalu mengalokasikan string baru, memperbaiki kerusakan dari aliasing salinan pointer
-   **Aritmatika BigInt** — pergeseran kanan menggunakan pergeseran aritmatika untuk angka negatif, operasi bitwise menggunakan semantik pembungkus ToInt32
-   **Map.get() tidak terdefinisi** — mengembalikan `TAG_UNDEFINED` yang benar untuk kunci yang hilang dan bukan tag NaN yang salah
-   **Bidang statis GC** — Nilai BigInt dalam bidang kelas statis terdaftar sebagai GC

Ini bukan masalah kecil. Perbaikan masuknya kembali GC saja dapat menyelesaikan seluruh kelas error yang terjadi secara berkala. Perbaikan aliasing string memengaruhi program apa pun yang menetapkan satu variabel string ke variabel lain dan kemudian bermutasi. Ini adalah jenis bug yang hanya muncul saat beban kerja sebenarnya, dan memperbaikinya adalah hal yang menjadikan compiler berkelas produksi.

## perry-verify: Dikeraskan

`perry-verify`, layanan verifikasi aplikasi otomatis, mendapat izin penguatan keamanan: eksekusi sandbox melalui `bwrap` di Linux dan `sandbox-exec` di macOS, token autentikasi pada jabat tangan WebSocket dan unduhan biner, pembatasan kecepatan per IP, ID tugas UUID lengkap untuk mencegah enumerasi, dan pengurangan batas isi.

## perrysdad: Kompiler Hosting Mandiri

Dalam upaya paralel, `perrysdad` — kompiler LLVM IR yang dihosting sendiri dan ditulis dalam TypeScript — berubah dari nol menjadi kompilasi mandiri dalam lima fase selama seminggu:

1.  **Fase 0–1** — kerangka menyeluruh dari awal hingga akhir: HIR → teks LLVM IR → clang, ditautkan dengan `libperry_runtime.a` milik Perry
2.  **Fase 2** — pengurai keturunan rekursif linting tangan dengan penguraian ekspresi Pratt untuk file `.ts` nyata
3.  **Fase 3** — array, objek, dan peta dengan runtime FFI, ditambah perbaikan ketidakcocokan ABI kritis (JSValue dinyatakan sebagai ganda di LLVM IR bukan i64)
4.  **Fase 4** — kelas, enum, penutupan, kompilasi multi-file dengan penemuan modul dan pengurutan topologi

Pencapaian penting: biner `anvil` yang dikompilasi sendiri kini dapat mengkompilasi program pengujian dan menghasilkan output yang benar yang cocok dengan versi yang dikompilasi node. Kompiler TypeScript, dikompilasi oleh Perry ke kode asli, mengkompilasi lebih banyak TypeScript ke kode asli. Kura-kura sampai ke bawah.

## Dalam Angka

-   **82 melakukan** ke kompiler Perry utama
-   **1 rilis**: v0.2.173 (8 Maret)
-   **49 halaman dokumentasi** di docs.perryts.com
-   **4 widget baru**: TextArea, SecureField, Kode QR, Layar Pembuka
-   **3 saluran distribusi**: Homebrew, APT, sumber
-   **3 saluran penyimpanan otomatis**: App Store, TestFlight, Google Play
-   **Keenam platform** menerima peningkatan minggu ini

## Apa Selanjutnya

Saluran pipa sudah terisi. Anda dapat menulis TypeScript, mengkompilasi ke enam platform, mendistribusikan melalui Homebrew atau APT, memublikasikan ke App Store dan Play Store, menambahkan widget layar utama, dan membaca dokumentasi komprehensif — semuanya tanpa meninggalkan rantai alat Perry. Yang tersisa:

-   **Dukungan regex penuh** — kesenjangan bahasa utama yang terakhir
-   **ekspansi Perry/ui** — seret dan lepas, label aksesibilitas, DatePicker
-   **pematangan perrysdad** — memperluas compiler self-hosting menuju paritas Perry penuh
-   **Hub publik beta** — membuka build terdistribusi untuk pengguna eksternal

Ikuti kemajuan di [GitHub](https://github.com/PerryTS/perry), baca dokumen baru di [docs.perryts.com](https://docs.perryts.com), atau periksa [peta jalan](/id/roadmap/) untuk gambaran selengkapnya.
