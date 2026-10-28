---
title: "Memperkenalkan Perry"
excerpt: "Perry mengkompilasi TypeScript yang didukung ke executable asli mandiri dengan runtime-nya dan GC tertaut, tanpa memerlukan Node.js atau mesin JavaScript."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Kami dengan senang hati memperkenalkan Perry — sebuah compiler TypeScript native yang ditulis dalam Rust yang mengkompilasi TypeScript Anda langsung menjadi executable mandiri. Tanpa runtime Node.js, tanpa wrapper Electron, tanpa kompromi. Hanya kode Anda, dikompilasi menjadi binary native yang langsung berjalan dan dapat dijalankan di mana saja.

Perry merupakan pemikiran ulang fundamental tentang apa yang bisa dilakukan TypeScript. Alih-alih memperlakukannya sebagai superset dari JavaScript yang harus berjalan melalui JS engine, Perry memperlakukan TypeScript sebagai bahasa sistem — yang kebetulan memiliki sintaks yang sudah dikenal dan disukai jutaan developer.

## Mengapa Kami Membangun Perry

TypeScript telah menjadi lingua franca pengembangan perangkat lunak modern. Ini adalah bahasa di balik sebagian besar frontend web, porsi backend yang terus bertumbuh, dan semakin menjadi pilihan untuk tooling, scripting, dan otomasi. Tapi ia selalu membawa keterbatasan fundamental: ia dikompilasi ke JavaScript, dan JavaScript memerlukan runtime.

Runtime tersebut — baik itu Node.js, Deno, atau Bun — datang dengan trade-off. Waktu cold start yang diukur dalam puluhan atau ratusan milidetik. Overhead memori dari compiler JIT dan garbage collector. Distribusi binary yang harus membundel seluruh runtime atau mengharuskan pengguna menginstalnya. Dan untuk aplikasi GUI, satu-satunya pilihan adalah Electron, yang menyertakan seluruh browser Chromium dengan aplikasi Anda.

Kami bertanya: bagaimana jika TypeScript tidak harus melalui JavaScript sama sekali? Bagaimana jika Anda bisa mengkompilasinya langsung ke kode mesin native, sama seperti Anda mengkompilasi Rust, Go, atau C++?

## Cara Kerja Perry

Pipeline kompilasi Perry memiliki tiga tahap:

1.  **Parsing** — Perry menggunakan SWC (parser TypeScript/JavaScript berbasis Rust) untuk mem-parse source TypeScript Anda menjadi AST. SWC adalah parser yang sama yang digunakan oleh Next.js, dan sangat cepat.
2.  **Kompilasi berbasis tipe** — Perry menelusuri AST dengan informasi tipe lengkap. Tidak seperti JS engine yang harus menangani tipe dinamis saat runtime, Perry mengetahui setiap tipe pada waktu kompilasi. Ini memungkinkan monomorphization generics, static dispatch untuk pemanggilan method, dan optimasi layout memori langsung.
3.  **Code generation** — Perry menghasilkan kode mesin native menggunakan Cranelift, code generator yang sama yang digunakan oleh Wasmtime dan bagian dari Firefox JIT. Cranelift menghasilkan kode native yang efisien untuk x86\_64 dan ARM64.

Hasilnya adalah executable mandiri — biasanya 2–5 MB untuk alat CLI — yang langsung berjalan tanpa waktu pemanasan.

```text
$ perry build app.ts
Parsing app.ts...
Compiling (cranelift, arm64)...
Linking...
✓ Built executable: app (2.3 MB)
$ ./app
Hello from native TypeScript!
$ file app
app: Mach-O 64-bit executable arm64
```

## Fitur TypeScript yang Didukung

Perry mendukung subset TypeScript yang luas dan terus berkembang. Tujuannya adalah kompatibilitas penuh dengan bahasa sebagaimana developer benar-benar menggunakannya. Saat ini, itu mencakup:

-   **Semua tipe primitif** — string, number, boolean, null, undefined, bigint, symbol
-   **Interface dan type alias** — termasuk union type, intersection type, dan mapped type
-   **Generics** — dikompilasi melalui monomorphization, sehingga `Array<number>` dan `Array<string>` menghasilkan jalur kode yang dioptimalkan secara terpisah
-   **Class** — dengan inheritance, private field (`#field`), static member, getter/setter, dan decorator
-   **Async/await dan Promise** — dikompilasi menjadi state machine, mirip cara Rust menangani async
-   **Generator dan iterator** — `function*` dan loop `for...of`
-   **Closure** — dengan semantik capture yang benar
-   **Destructuring** — array, object, pattern bersarang, dan rest element
-   **Template literal** — termasuk tagged template
-   **Module** — ESM import/export diselesaikan pada waktu kompilasi

## UI Native Lintas Platform

Perry tidak terbatas pada alat CLI dan aplikasi sisi server. Perry dilengkapi dengan framework UI native untuk enam platform:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField, dan lainnya)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (API sama dengan iOS, dengan adaptasi khusus iPad)
-   **Android** — JNI + Tampilan Android (Aktivitas, Tampilan, Button, RecyclerView)
-   **Linux** — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, kontrol umum, GDI)

Insight kuncinya adalah Perry memetakan API TypeScript umum ke toolkit widget native setiap platform pada waktu kompilasi. Tidak ada lapisan bridge, tidak ada web view, dan tidak ada engine rendering kustom. Aplikasi Anda menggunakan widget platform asli, di-render oleh OS itu sendiri. Baca selengkapnya di pembahasan mendalam kami: [UI Native Lintas Platform dari TypeScript](/id/blog/cross-platform-native-ui/).

## 27+ Implementasi Native Paket npm

Salah satu tantangan praktis terbesar dari compiler baru adalah kompatibilitas ekosistem. Developer tidak hanya menulis kode dari nol — mereka menggunakan paket. Perry mengatasi ini dengan implementasi native dari 27+ paket npm populer:

-   **Database** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSockets)
-   **Keamanan** — bcrypt, jsonwebtoken, crypto
-   **Utilitas** — uuid, chalk, dotenv, lodash (sebagian), moment
-   **Sistem** — fs-extra, glob, chokidar, commander

Ini bukan wrapper tipis di sekitar modul Node.js. Mereka dikompilasi langsung ke dalam binary Anda menggunakan library sistem native — libpq untuk PostgreSQL, OpenSSL untuk crypto, libcurl untuk HTTP. Surface API cocok dengan yang Anda harapkan dari paket npm, sehingga migrasi mudah dilakukan.

## Layer Kompatibilitas V8 Opsional

Untuk paket npm yang belum memiliki implementasi native Perry, Perry menawarkan mode embedding V8 opsional. Ketika diaktifkan, Perry membundel runtime V8 dan dapat mengeksekusi paket npm JavaScript standar bersama TypeScript yang dikompilasi. Ini adalah escape hatch pragmatis yang memungkinkan Anda mengadopsi Perry secara bertahap — kompilasi hot path ke kode native sambil tetap mengakses seluruh ekosistem npm untuk yang lainnya.

## Kompilasi Silang

Perry mendukung cross-compilation secara bawaan. Dari mesin pengembangan macOS Anda, Anda dapat mengkompilasi untuk Linux (x86\_64 dan ARM64) dan iOS. Ini berarti Anda dapat membangun pipeline CI/CD di macOS dan menghasilkan binary untuk semua target deployment tanpa memerlukan mesin build khusus untuk setiap platform.

```
# Build for Linux from macOS
$ perry build app.ts --target linux-x86_64
✓ Built executable: app (3.1 MB)
# Build for iOS from macOS
$ perry build app.ts --target ios-arm64
✓ Built executable: app (4.8 MB)
```

## Performa

Binary yang dikompilasi Perry sangat cepat. Karena tidak ada pemanasan JIT, tidak ada overhead interpreter, dan tidak ada jeda garbage collector, performa dapat diprediksi dan konsisten sejak pemanggilan pertama.

Dalam benchmark kami:

-   **Waktu startup** — efektif 0 ms (peluncuran proses native)
-   **Ukuran binary** — 2–5 MB untuk alat CLI biasa (vs 50+ MB untuk Node.js yang dibundel)
-   **Penggunaan memori** — 5–10x lebih rendah dari aplikasi Node.js setara
-   **Throughput** — kompetitif dengan C yang ditulis tangan untuk beban kerja compute-bound

Anda dapat melihat benchmark langsung di [demo.perryts.com](https://demo.perryts.com), yang membandingkan executable yang dikompilasi Perry dengan Node.js dan Bun secara real time.

## Status Saat Ini

Perry sedang dalam pengembangan aktif. Compiler stabil dengan 62 dari 62 tes lolos di seluruh test suite. Semua enam backend UI platform berfungsi. Fitur bahasa inti solid dan terus berkembang.

Kami sedang aktif memperluas library widget UI, meningkatkan performa string dan object, menyelesaikan dukungan regex penuh, dan membangun modul Stream. Dalam jangka panjang, kami merencanakan target kompilasi WASM, multi-threading, ekstensi VS Code, dan integrasi package manager.

Lihat [roadmap](/id/roadmap/) lengkap untuk detail tentang apa yang sudah dirilis, sedang dikerjakan, dan akan datang.

## Mulai Sekarang

Perry adalah open source. Anda dapat clone repo, build dari source, dan mulai mengkompilasi TypeScript hari ini:

```
$ git clone https://github.com/PerryTS/perry.git
$ cd perry
$ cargo build --release
# Compile your first TypeScript file
$ ./target/release/perry build hello.ts
✓ Built executable: hello (2.1 MB)
$ ./hello
Hello, world!
```

Jelajahi source di [GitHub](https://github.com/PerryTS/perry), lihat [showcase](/id/showcase/) untuk melihat apa yang sedang dibangun dengan Perry, atau langsung terjun ke kode. Kami tidak sabar melihat apa yang akan Anda bangun.
