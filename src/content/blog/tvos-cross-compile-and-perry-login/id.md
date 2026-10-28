---
title: "tvOS, Kompilasi Silang iOS dari Linux, dan Perry Login"
excerpt: "Perry v0.4.24: tvOS sebagai target kompilasi ke-10, kompilasi silang iOS dan macOS dari Linux via ld64.lld, perry login dengan penagihan berbasis penggunaan, perombakan UI Windows, notarisasi macOS, dan 120 commit dalam 5 hari."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Lima hari, 120 commit, dan Perry melompat dari v0.4.0 ke v0.4.24. Sorotan utama: tvOS menjadi target kompilasi ke-10, aplikasi iOS dan macOS sekarang bisa di-build sepenuhnya dari Linux, perry login menghadirkan billing berbasis penggunaan, dan UI Windows mendapat overhaul menyeluruh. Berikut semua yang dirilis.

## tvOS: Target Kompilasi ke-10

Perry kini mengompilasi ke Apple TV. Target tvOS menggunakan perender SwiftUI yang sama dengan watchOS, berbagi arsitektur berbasis data tempat Perry membuat pohon UI dan aplikasi host Swift yang dikirimkan akan merendernya secara asli. Dikombinasikan dengan integrasi WASM `@perry/threads` yang ada, aplikasi tvOS dapat menjalankan beban kerja komputasi yang berat di latar belakang sambil menjaga UI tetap responsif.

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

Ini menjadikan jumlah total target menjadi **10**: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly, dan Web/JavaScript. Satu basis kode TypeScript, sepuluh keluaran asli.

## Cross-Compile iOS dan macOS dari Linux

Perry kini dapat membuat biner iOS dan macOS seluruhnya dari mesin Linux menggunakan `ld64.lld` sebagai Mach-O penghubung. Ini adalah bagian yang hilang untuk CI/CD yang sepenuhnya otomatis — masukkan TypeScript ke server Linux, dapatkan biner asli yang ditandatangani untuk setiap platform Apple tanpa mesin build macOS.

Untuk sampai ke sini diperlukan penyelesaian serangkaian masalah tautan:

-   **codegen Mach-O triple** — menambahkan target triples `aarch64-apple-macos` dan `aarch64-apple-ios` untuk Cranelift
-   **Penautan kerangka kerja** — Jalur pencarian kerangka kerja CoreGraphics, Metal, IOKit, DiskArbitration untuk kompilasi silang
-   **`-lobjc`** — Simbol runtime ObjC diperlukan untuk semua target Apple
-   **SDK versi** — `sdk_version 26.0` di ld64.lld (Apple memerlukan iOS 18+)
-   **Dead stripping** — `-dead_strip` sebagai pengganti `-Wl,-dead_strip` untuk linker Mach-O
-   **Runtime dedup** — menghapus duplikat `perry_runtime` dari lib statis UI untuk menghindari kesalahan tautan

Dikombinasikan dengan kompilasi silang Linux → Windows yang ada (v0.2.195+), Perry kini dapat melakukan kompilasi silang ke **setiap platform dari Linux** — iOS, macOS, Windows, Android, WASM, dan Web.

## Kesiapan iOS App Store

Fokus utama siklus ini adalah membuat aplikasi Perry yang dikompilasi iOS sepenuhnya mematuhi App Store:

-   **Info Lengkap.plist** — semua kunci yang diperlukan Apple: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — penamaan ikon iOS standar (`AppIcon60x60@2x`, dll.) dengan resolusi cadangan
-   **Versi dari perry.toml** — kolom `version` dan `build_number` mengalir langsung ke Info.plist
-   **UILaunchScreen** — menggunakan kunci modern sebagai pengganti `UILaunchStoryboardName` (tidak diperlukan file storyboard)
-   **Profil penyediaan** — macOS dukungan profil penyediaan untuk App Store dan distribusi TestFlight

## Perry Login dan Billing

Perry kini memiliki akun dan penagihan berbasis penggunaan, didukung oleh perintah `perry login` CLI baru dan dasbor di [app.perryts.com](https://app.perryts.com).

### Cara Kerjanya

-   **`perry login`** — GitHub OAuth alur perangkat, membuka browser, melakukan jajak pendapat untuk penyelesaian
-   **Tingkat gratis** — 15 build/bulan, proyek tak terbatas dengan akun GitHub
-   **Tingkat Pro** — build tanpa batas melalui langganan Polar.sh
-   **API** — membuat dan mengelola token dari dasbor untuk CI/CD
-   **Pelacakan penggunaan** — publikasi bulanan dan verifikasi penghitung dengan bilah penggunaan waktu nyata

Dasbornya sendiri adalah server Fastify yang dikompilasi Perry dengan ekspor statis Next.js — dibuat dengan Perry, melayani pengguna Perry.

## Notarisasi macOS dan Code Signing

Dua kemampuan penandatanganan baru:

-   **`perry publish macos --notarize`** — secara otomatis beralih ke sertifikat ID Pengembang (bukan sertifikat App Store), mengirimkan ke layanan notaris Apple, dan menjepret hasilnya
-   **Penandatanganan kode GCloud KMS** — Versi Windows kini dapat ditandatangani menggunakan kunci Google Cloud KMS, sehingga memungkinkan penandatanganan otomatis di CI tanpa mengekspos kunci pribadi

## Perombakan UI Windows

Backend UI Windows menerima pembaruan paling komprehensif:

-   **Penskalaan sesuai DPI** — ukuran jendela, font, dan dimensi widget diskalakan dengan benar pada tampilan DPI tinggi
-   **API jendela bergaya peluncur** — jendela tanpa batas dengan pemosisian khusus untuk UI bergaya peluncur/sorotan
-   **Tombol pintas global** — pintasan keyboard seluruh sistem yang berfungsi bahkan saat aplikasi tidak fokus
-   **Ikon aplikasi** — `getAppIcon` API untuk menampilkan ikon aplikasi di UI peluncur
-   **Tata letak yang aman untuk masuk kembali** — Lukisan berbasis `RefCell` diganti dengan penyimpanan HWND `SetPropW` untuk mencegah kepanikan selama pesan WM_PAINT bertumpuk
-   **Integrasi Geisterhand** — semua jenis widget yang terdaftar dengan kerangka pengujian UI, `/type` menggunakan `SendMessageW` melalui peta HWND
-   **Dukungan kamera Android** — API pengambilan kamera diperluas ke Android melalui JNI

## Performa

v0.4.14 mengirimkan audit kinerja yang komprehensif:

-   **`fcmp`** asli — perbandingan floating-point menggunakan instruksi CPU asli dan bukan pemanggilan fungsi runtime. Tolok ukur Mandelbrot **30% lebih cepat**.
-   **Penambahan string di tempat** — `str += "text"` memodifikasi buffer di tempat alih-alih mengalokasikan string baru. **125x lebih cepat** untuk penggabungan berulang.
-   **Hubungan pendek DAN/ATAU** — `&&` dan `||` melewatkan evaluasi operan yang tepat ketika hasilnya sudah ditentukan.
-   **Pelipatan literal negatif** — `-1`, `-0.5` dll. dilipat ke konstanta pada tingkat HIR alih-alih mengeluarkan instruksi negasi.

## Build Paralel Hub

Server orkestrasi pembangunan kini mendukung pembangunan serentak per pekerja:

-   **Pengiriman berbasis slot** — pekerja melaporkan kapasitas `max_concurrent`, Hub melacak pekerjaan aktif per pekerja
-   **Tidak ada lagi 429** — antrian pekerjaan bukannya ditolak ketika semua pekerja sedang sibuk
-   **unduhan artefak Base64** — artefak biner berfungsi sebagai base64 ketika runtime Perry tidak dapat menangani respons HTTP biner mentah
-   **Sambungkan kembali secara otomatis WebSocket** — membangun koneksi pemantauan secara otomatis menyambung kembali saat terputus

## Paket Baru: perry/appstorereview

Paket pihak pertama baru untuk meminta peninjauan toko aplikasi:

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Satu fungsi, dua platform, UI ulasan asli. Logika pengaturan waktu dan tampilan diserahkan sepenuhnya kepada pengembang.

## Perbaikan Codegen

120 commit berarti banyak perbaikan bug. Yang paling berdampak:

-   **Kesetaraan yang ketat (===)** — tiga bug terpisah diperbaiki di v0.4.2: perbandingan tag tipe, penanganan NaN, dan perbedaan null/tidak terdefinisi
-   **Perbandingan string untuk string gabungan** — `===` gagal saat membandingkan string yang dibuat melalui penggabungan karena perbandingan penunjuk dan bukan perbandingan konten
-   **Resolusi konstruktor** — `new X(args)` baru kini menyelesaikan dengan benar konstruktor yang diimpor lintas modul dan fungsi konstruktor berbasis penutupan
-   **Pendorongan array tingkat modul** — nilai yang didorong ke array tingkat modul di dalam panggilan fungsi bersarang dalam loop hilang karena pointer basi setelah alokasi ulang
-   **Paksaan aritmatika nol** — `null + 1` kini menghasilkan `1` dengan benar melalui `js_number_coerce`
-   **Bitwise TIDAK membungkus** — `~x` sekarang digabungkan ke i32 sesuai semantik ECMAScript
-   **fetch().then()** — callback tidak pernah diaktifkan di aplikasi UI asli karena tidak ada event loop drain (v0.4.3)
-   **Modulo dan eksponen WASM** — Operator `%` dan `**` menyebabkan kesalahan validasi WASM (v0.4.5)

## Dalam Angka

-   **~120 commit** ke compiler Perry utama dalam 5 hari
-   **24 rilis patch**: v0.4.1 → v0.4.24
-   **Target kompilasi**: 9 → 10 (menambahkan tvOS)
-   **Target kompilasi silang dari Linux**: Windows → Windows, iOS, macOS (semua Apple + Windows)
-   **Paket baru**: perry/appstorereview
-   **Infrastruktur baru**: dasbor app.perryts.com, login perry CLI, penagihan Polar.sh
-   **Peningkatan performa**: mandelbrot (fcmp asli) 30% lebih cepat, penggabungan string 125x lebih cepat

## Apa Selanjutnya

Kompilasi silang iOS dan macOS dari Linux berarti Hub kini dapat membangun untuk setiap platform dari satu server Linux — tidak ada lagi mesin pembuat macOS khusus untuk kompilasi (hanya untuk penandatanganan). Infrastruktur penagihan membuka jalur ke Hub publik beta. Dan dengan tambahan tvOS, Perry mencakup semua platform Apple: macOS, iOS, iPadOS, watchOS, dan tvOS.

-   **Hub public beta** — pengguna eksternal dapat menggunakan TypeScript dan mendapatkan binari asli
-   **Dukungan regex penuh** — kesenjangan bahasa utama yang terakhir
-   **ekspansi Perry/ui** — seret dan lepas, aksesibilitas, DatePicker
-   **Sumber peta & info debug** — Info debug DWARF untuk proses debug asli

Ikuti perkembangannya di [GitHub](https://github.com/PerryTS/perry), baca dokumen di [docs.perryts.com](https://docs.perryts.com), atau periksa [peta jalan](/id/roadmap/) untuk gambaran selengkapnya.
