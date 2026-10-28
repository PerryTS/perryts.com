---
title: "Multi-Threading Sejati, i18n Waktu Kompilasi, dan watchOS"
excerpt: "Perry v0.4.0: thread OS nyata dengan keamanan waktu kompilasi, sistem internasionalisasi tanpa ribet untuk 30+ bahasa, watchOS sebagai target kompilasi ke-9, API audio dan kamera, dan pipeline kompiler paralel."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 adalah rilis terbesar sejak proyek dimulai. Tiga lompatan versi dalam satu siklus — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — dan compiler-nya sendiri sekarang paralel. Berikut semua yang dirilis.

## Multi-Threading Sejati

Perry kini memiliki paralelisme thread OS yang sebenarnya. Bukan pekerja web dengan overhead serialisasi. Bukan `SharedArrayBuffer` dengan `Atomics`. Thread sebenarnya — thread OS ringan dengan tumpukan 8 MB yang tidak berbagi apa pun dan tidak memerlukan biaya apa pun saat tidak digunakan.

Modul `perry/thread` baru memperlihatkan tiga primitif:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` dan `parallelFilter` secara otomatis mendeteksi jumlah inti CPU dan membagi larik input ke seluruh inti tersebut. Untuk array kecil, array melewatkan threading sepenuhnya dan berjalan secara sinkron — tidak ada overhead untuk beban kerja sepele.

`spawn` meluncurkan thread OS latar belakang dan mengembalikan Promise. Hasilnya mengalir kembali melalui antrean hasil tertunda yang terkuras selama pemrosesan tugas mikro, sehingga Anda `await` seperti operasi asinkron lainnya.

### Keamanan Waktu Kompilasi

Bagian terpenting bukanlah API — melainkan apa yang *dicegah* oleh compiler. Perry secara statis menolak penutupan yang menangkap variabel yang bisa berubah:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

Tidak ada status bersama yang dapat diubah berarti tidak ada data race. Tanpa kunci, tanpa mutex, tanpa `Atomics`. Kompiler menerapkan keamanan thread sebelum satu baris kode mesin dikeluarkan.

### Di Balik Layar

Setiap thread pekerja mendapatkan arena memorinya sendiri dengan pembersihan `Drop` — tanpa koordinasi GC di seluruh thread. Nilai ditransfer melalui salinan mendalam `SerializedValue`: tanpa biaya untuk angka, O(n) untuk string, array, dan objek. Implementasinya berada dalam satu file Rust 1.120 baris (`perry-runtime/src/thread.rs`) dan tidak memerlukan perubahan pada pengumpul sampah.

Bandingkan ini dengan isolat V8, yang memerlukan heap terpisah per pekerja dengan overhead ~2MB masing-masing. Thread Perry hanyalah pthread dengan arena.

### Pipeline Compiler Paralel

Kompilatornya sendiri sekarang juga paralel. Kodegen modul, lintasan transformasi (impor JS, instance asli, monomorfisasi), dan pemindaian simbol `nm` semuanya dijalankan di seluruh inti CPU melalui rayon. Dikombinasikan dengan peningkatan Cranelift 0.121 (dari 0.113 — delapan versi minor alokasi register dan penyempurnaan x64), kompilasi menjadi jauh lebih cepat.

## i18n Waktu Kompilasi (v0.3.0)

Perry tidak ada upacaranya. Literal string di widget UI secara otomatis diperlakukan sebagai kunci yang dapat dilokalkan. File terjemahan berbentuk datar JSON di direktori `locales/`. Semua validasi terjadi pada waktu kompilasi.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

Kompiler memvalidasi segalanya: terjemahan yang hilang, ketidakcocokan parameter, kesalahan bentuk jamak. Terjemahan dimasukkan ke dalam biner sebagai tabel string 2D yang tersemat dengan pencarian runtime mendekati nol — tanpa penguraian JSON saat startup.

### Apa yang Termasuk

-   **Aturan jamak CLDR** untuk 30+ lokal dengan `.one`/`.other`/`.few`/`.many`/`.zero`/`.two` sufiks
-   **Format pembungkus**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Deteksi lokal asli** di semua platform: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: memindai file TS/TSX, membuat dan memperbarui JSON scaffold
-   **Pembuatan sumber daya asli platform**: iOS `.lproj` dan direktori `values-xx/` Android
-   **`import { t } from "perry/i18n"`** untuk melokalkan string non-UI

Konfigurasi di `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## Aplikasi watchOS Native (v0.3.2)

Perry sekarang dikompilasi ke watchOS — target kompilasi ke-9. Ini bukan aplikasi pembungkus atau pendamping. Ini adalah biner watchOS mandiri dengan antarmuka SwiftUI asli.

Perender watchOS menggunakan **pendekatan berbasis data**: Perry membuat pohon UI melalui `perry_ui_*` FFI memanggil, dan `PerryWatchApp.swift` yang dikirimkan mengkueri pohon dan merender tampilan SwiftUI secara reaktif. 15 jenis widget didukung dengan stub untuk yang tidak didukung.

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

Alur lengkapnya berfungsi: `perry setup watchos` berbagi kredensial App Store Connect dengan iOS, `perry run watchos` mendeteksi otomatis Simulator Apple Watch, dan `perry publish watchos` dikirimkan ke App Store.

Ini juga menjadikan total **jumlah target widget menjadi empat**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit), dan Wear OS (Ubin). Masing-masing memiliki target kompilasi dan backend codegen sendiri.

## API Audio & Kamera

Dua API perangkat keras baru dirilis dalam rilis ini:

### Pengambilan Audio (`perry/system`)

Pengambilan audio lintas platform dengan pengukuran dB(A) berbobot A:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

Backend platform: AVAudioEngine (macOS/iOS), AudioRecord melalui JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Pengambilan Kamera (`perry/ui`)

Pratinjau kamera asli dengan pengambilan sampel warna tingkat piksel (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## Paket Ekosistem

Dua paket asli pihak pertama diluncurkan:

-   **perry/Push** — Pengikatan pemberitahuan push untuk iOS/macOS: permintaan izin, pengambilan token APNs, jumlah lencana. Rintisan Android dengan FCM direncanakan.
-   **perry/storekit** — Ikatan pembelian dalam aplikasi StoreKit 2: pemuatan produk, pembelian dengan tanda terima JWS, pemeriksaan langganan, pemulihan, dan pemroses transaksi.

Keduanya mengikuti arsitektur yang sama: deklarasi TypeScript → Rust FFI crate → Swift bridge. Instal sebagai dependensi, impor fungsinya, `await` hasilnya. Kompiler menangani semua penghubungan asli.

## Infrastruktur

-   **Cranelift 0,113 → 0,121** — delapan versi minor alokasi register, perbaikan x64, dan penyempurnaan penyelarasan slot tumpukan
-   **Pemisahan fungsi Windows** — pemisahan otomatis fungsi dengan 50+ pernyataan menjadi lanjutan untuk mengatasi Cranelift masalah codegen di Windows
-   **Pemuatan var modul selektif** — hanya memuat variabel tingkat modul yang direferensikan pada entri fungsi, sehingga mengurangi ukuran biner Windows sebesar 26%
-   **Peningkatan array.sort()** — dari pengurutan penyisipan O(n²) ke hibrid gaya TimSort O(n log n)
-   **perry menjalankan Android** — pipeline pembangunan APK lengkap: kompilasi, pembuatan proyek Gradle, assembleDebug, instalasi, peluncuran
-   **Entri Info.plist khusus** — `[ios.info_plist]` di perry.toml untuk deskripsi privasi, skema URL, mode latar belakang

## Dalam Angka

-   **Versi**: 0.2.197 → 0.4.0 (tiga pencapaian utama)
-   **Target kompilasi**: 8 → 9 (menambahkan watchOS)
-   **Target widget**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Peti baru**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Dokumen baru**: threading (4 halaman), i18n (4 halaman), watchOS, dokumen widget yang diperluas (3 → 8 halaman)
-   **implementasi perry/thread**: 1.120 baris Rust, tidak ada perubahan pada GC

## Apa Selanjutnya

Fondasi threading membuka banyak hal: pemrosesan permintaan HTTP paralel, operasi file secara bersamaan, dan beban kerja komputasi berat yang sebelumnya diblokir oleh eksekusi thread tunggal. Di sisi bahasa, dukungan regex penuh masih menjadi kesenjangan terbesar, dan perluasan `perry/ui` (seret dan lepas, aksesibilitas, DatePicker) terus berlanjut.

Ikuti perkembangannya di [GitHub](https://github.com/PerryTS/perry), baca dokumen di [docs.perryts.com](https://docs.perryts.com), atau periksa [peta jalan](/id/roadmap/) untuk gambaran selengkapnya.
