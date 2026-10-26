---
title: "Distribusi npm, perry dev, dan Memenangkan Setiap Benchmark"
excerpt: "Perry v0.5.80 → v0.5.174 dalam enam hari. @perryts/perry dirilis di npm untuk ketujuh platform yang didukung. perry dev menambahkan auto-recompile mode watch di atas cache AST in-memory dan cache objek per-modul di-disk. json_roundtrip menutup celah terakhirnya — Perry sekarang memenangkan setiap benchmark melawan Node.js dan Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
Artikel terakhir ditutup dengan Perry di v0.5.80 dan satu kekalahan membandel di tabel benchmark: roundtrip `JSON.parse`/`stringify` masih 1,6x lebih lambat dari Node. Enam hari kemudian Perry berada di **v0.5.174** — itu berarti **94 rilis patch** — dan tiga hal berubah yang layak disorot sebelum yang lain:

-   `@perryts/perry` dirilis di **npm**. Satu perintah memasang Perry di setiap platform yang didukung.
-   **`perry dev`** menambahkan auto-recompile mode watch, di atas cache AST in-memory baru dan cache objek per-modul di-disk.
-   Kekalahan `json_roundtrip` tertutup. Perry sekarang **mengalahkan Node dan Bun pada setiap benchmark** di suite utama (15/15 lawan keduanya).

Sisa artikel ini adalah pemain pendukung: perbaikan WebAssembly, watchOS akhirnya kompilasi end-to-end, primitif `perry/thread` terhubung penuh sisanya, dan serangkaian kemenangan ketegasan compile-time yang mengubah drop diam-diam menjadi error nyata.

## 1\. `@perryts/perry` di npm

Perry selalu dapat dipasang melalui Homebrew di macOS dan APT di Debian/Ubuntu. Cakupan yang baik untuk pengembang di platform tersebut, tidak ada sama sekali untuk pengguna Windows kecuali mereka membangun dari sumber, dan tidak ada yang seragam untuk tim yang mencampur Mac, Linux, dan Windows. v0.5.107 menghilangkan masalah itu.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

Paket ini adalah launcher tipis yang bergantung pada tujuh paket opsional per-platform — macOS arm64/x64, Linux x64/arm64 di glibc dan musl, Windows x64 — dan npm hanya memasang yang cocok dengan mesin Anda. Ukuran biner per platform berada di kisaran megabyte satu digit rendah. Pemasangannya sendiri hanya butuh hitungan detik. Ada juga jalur install global (`npm install -g @perryts/perry`) jika Anda lebih suka itu, tetapi install project-local mengunci versi compiler di samping dependensi Anda, yang merupakan default yang tepat.

Publishing melalui OIDC Trusted Publisher sehingga setiap rilis memiliki provenance dan terhubung kembali ke job CI yang membangunnya. Itu adalah satu hari kerja CI tersendiri — beberapa commit CI `v0.5.107` mengejar kombinasi `--provenance` / versi npm / jalur workflow yang tepat — tetapi berhasil mendarat, dan setiap rilis sejak itu bersih. Pengguna Windows sekarang adalah warga kelas satu, dan friksi lintas-tim dari “install sesuai yang OS Anda sukai” sudah hilang.

## 2\. `perry dev` — mode watch

v0.5.143 menambahkan subcommand CLI baru:

```
perry dev
```

Hanya itu. Ia mengawasi project Anda, merekompilasi saat simpan, dan meluncurkan ulang biner Anda. Inspirasinya adalah Vite dan `nodemon`; intinya adalah berhenti berpura-pura bahwa alur kerja compiler-ke-biner harus terasa lebih lambat daripada runtime. Untuk sebagian besar project `perry dev` membangun ulang dalam kurang dari satu detik pada cache yang hangat.

Bagian “cache hangat” itu penting. Dua cache baru mendarat bersamaan dengan `perry dev`:

-   **Cache AST in-memory** (v0.5.156). Di seluruh rebuild dalam satu sesi `perry dev`, Perry menyimpan AST yang telah di-parse untuk setiap modul yang tidak berubah di disk. Mengedit satu file mem-parse ulang satu file, bukan seluruh graf modul.
-   **Cache objek per-modul di-disk (V2.2)**. Setiap modul dikompilasi ke file `.o`\-nya sendiri dan di-hash; modul yang tidak berubah melewati codegen sepenuhnya dan linker mengambil objek yang di-cache. Output verbose cache cocok dengan spesifikasi di [#131](https://github.com/PerryTS/perry/issues/131), dan satu putaran audit hardening di v0.5.160 menutup edge case di mana entri cache basi bisa bertahan dari perubahan header.

Kedua cache saling menumpuk. Edit pertama dari sesi adalah kompilasi penuh; setelah itu semuanya hanya melakukan pekerjaan sesuai dengan apa yang sebenarnya Anda ubah. Ini adalah pergeseran DX terbesar tunggal minggu ini.

## 3\. Mengalahkan Bun pada setiap benchmark

Pada v0.5.166 README punya satu catatan jujur: Perry 1,6x lebih lambat dari Node pada `json_roundtrip` (50× `JSON.parse` + `JSON.stringify` pada blob 1MB, 10K-item), dan 2,4x lebih lambat dari Bun. Issue [#149](https://github.com/PerryTS/perry/issues/149) melacak tindak lanjutnya. Pada v0.5.173 — tujuh hari kemudian — celah itu tertutup.

| Beban kerja | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry sekarang menang di setiap beban kerja di suite benchmark utama — **15/15 lawan Node, 15/15 lawan Bun**, terbaik dari 5 run di macOS ARM64. Bun 1.3 masih unggul pada peak RSS (84MB vs Perry 310MB pada `json_roundtrip`), jadi tekanan allocator adalah hal berikutnya yang harus ditutup, tetapi latensi mentah sudah milik Perry.

Penutupan celah JSON bukanlah satu perubahan — itu adalah akumulasi pekerjaan paritas object-layout yang berjalan sepanjang minggu ini: inferensi shape object-literal Fase 1 (v0.5.167), inferensi tipe kembalian berbasis body Fase 4 untuk fungsi bebas, method kelas, getter, dan arrow (v0.5.169), dan inferensi tipe kembalian method-call Fase 4.1 (v0.5.170). Temanya sama seperti artikel lalu: beri LLVM struktur statis yang cukup untuk dilihat, dan optimizer melakukan sisanya.

v0.5.164 juga memulihkan autovectorization parallel-accumulator `<2 x double>` pada loop reduksi pure-fadd, yang telah secara diam-diam mengalami regresi di suatu titik pada rentang v0.5.9x→v0.5.16x. Itulah yang membawa `math_intensive` dan `accumulate` kembali ke keunggulan 3-4x lama mereka atas Rust/C++/Go/Swift — LLVM yang sama, satu flag `reassoc contract`, satu body loop tervektorisasi.

## 4\. `perry/ui` dan doc-tests

Empat celah perry/ui yang tersisa tertutup di v0.5.151. Bersamaan dengan itu, v0.5.119 membalikkan penyalahgunaan API perry/ui yang diam-diam dari “kompilasi dan tidak melakukan apa-apa” menjadi error kompilasi keras — logika yang sama dengan v0.5.165 yang diterapkan pada decorator (lihat di bawah). Penyalahgunaan yang muncul pada waktu kompilasi selalu lebih baik daripada pada waktu runtime.

v0.5.123 merilis **harness test doc-examples** dan galeri widget. Setiap contoh TypeScript dalam dokumentasi sekarang dikompilasi pada setiap run CI, dan galeri widget membandingkan screenshot dengan baseline yang diberkati. v0.5.125 memperluasnya ke matriks cross-compile: setiap contoh doc dibangun untuk iOS, tvOS, Android, WASM, dan Web serta platform host, sehingga drift API lintas target tertangkap pada PR yang memperkenalkannya alih-alih siklus rilis yang mengirimkannya.

Kemenangan kualitas-hidup kecil: `perry check` sekarang memancarkan `file:line:column` untuk error HIR lowering ([#129](https://github.com/PerryTS/perry/issues/129)), yang berarti jump-to-error di editor berfungsi alih-alih menampilkan pesan generik tanpa lokasi.

## 5\. watchOS kompilasi end-to-end

watchOS dirilis sebagai target kompilasi bulan lalu, tetapi build end-to-end yang bersih memiliki beberapa sisi kasar. Pekerjaan watchOS minggu ini:

-   **v0.5.113**: `--target watchos` dan `--target watchos-simulator` sekarang kompilasi end-to-end tanpa workaround yang telah menumpuk.
-   **v0.5.114**: `--features watchos-game-loop` untuk aplikasi Metal-surface.
-   **v0.5.122**: `--features watchos-swift-app` untuk rendering yang di-host SwiftUI — ketika Anda ingin SwiftUI memiliki siklus hidup aplikasi dan Perry menyusun UI di dalamnya.
-   **v0.5.135**: `PERRY_UI_TEST_MODE` terhubung ke perry-ui-ios dan perry-ui-tvos, sehingga testing UI Geisterhand berjalan dengan cara yang sama pada kedua target tersebut seperti di macOS dan Linux.

## 6\. Primitif `perry/thread` terhubung sepenuhnya

v0.5.174 (hari ini) menutup [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter`, dan `spawn` terhubung sepenuhnya melalui jalur codegen dengan penegakan keamanan compile-time. Mutable capture ditolak pada waktu kompilasi — postur compile-time-correctness yang sama yang sekarang dimiliki perry/ui dan decorator. Primitif thread yang terhubung sebagian sejak pengumuman v0.4.0 sekarang lengkap end-to-end.

## 7\. WebAssembly dan target web

Dua perbaikan WASM yang layak disorot:

-   **v0.5.158**: lima bug yang saling menumpuk di `--target web` (jalur output WASM) yang saling menutupi. Diperbaiki sebagai satu batch sehingga target web sekarang tahan di bawah permukaan `perry/ui` penuh ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: `break`/`continue` di dalam `if` di dalam loop menggantung di WASM — bug codegen yang tidak terproduksi ulang pada target native. Diperbaiki ([#135](https://github.com/PerryTS/perry/issues/135)).

Juga di sisi kebenaran: v0.5.157 memperbaiki `obj.field` mengembalikan `NaN` di Android ([#128](https://github.com/PerryTS/perry/issues/128)), dan v0.5.162 memperbaiki bug ws terkutuk di mana `sendToClient` dan `closeClient` telah terkompilasi menjadi no-op diam-diam ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Kemenangan ketegasan compile-time

Tema minggu ini: apa pun yang dulunya merupakan kegagalan diam-diam sekarang menjadi error kompilasi.

-   **v0.5.165**: decorator TypeScript di-parse menjadi HIR dan kemudian dijatuhkan diam-diam. Sekarang mereka error di titik dekorasi dengan pesan yang jelas ([#144](https://github.com/PerryTS/perry/issues/144)). Penalaran warn→bail yang sama dengan v0.5.119 diterapkan pada perry/ui.
-   **v0.5.119**: penyalahgunaan API perry/ui ditolak pada waktu kompilasi alih-alih menghasilkan biner no-op.
-   **v0.5.172**: `console.trace()` sekarang memancarkan backtrace native nyata ke stderr alih-alih hanya menggemakan pesan ([#20](https://github.com/PerryTS/perry/issues/20)). Frame yang di-simbolisasi memerlukan `PERRY_DEBUG_SYMBOLS=1`; tanpa itu Anda mendapatkan alamat, yang masih lebih baik daripada perilaku echo-pesan yang digantikannya.

## 9\. Penutup

Pola minggu ini: **distribusi** (npm), **pengalaman pengembang** (`perry dev`, cache inkremental), dan **kekalahan benchmark terakhir yang tersisa tertutup**. Ditambah serangkaian ketegasan compile-time yang mengubah drop diam-diam menjadi error nyata. Enam hari, 94 rilis patch, satu pergeseran DX besar.

Cobalah:

```
# npm (platform apa pun)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Mode watch untuk dev iteratif
perry dev
```

Kode sumber: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
