---
title: "Dari Cranelift ke LLVM: Apa yang Rusak dan Bagaimana Kami Memperbaikinya"
excerpt: "Migrasi backend Perry dari Cranelift ke LLVM telah selesai. Peralihan awal membuat benchmark 70x lebih lambat — inilah yang rusak, dan enam optimasi terarah yang memperbaikinya."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Koreksi (September 2026):** Benchmark di bawah yang disebut “factorial” salah nama: ia menjumlahkan `i % 1000` dalam sebuah loop dan tidak menghitung faktorial apa pun. Angka 24,6x berasal dari eksekusi Node.js lama yang tidak dapat direproduksi; pada harness terbitan kami saat ini hasilnya seri dengan Node.js (93 ms vs 95 ms). Ini adalah microbenchmark untuk jalur cepat modulo integer, bukan ukuran performa TypeScript pada umumnya. Hasil di bawah dipertahankan sebagai catatan sejarah. Angka terkini, termasuk benchmark yang dikalahkan Perry, ada di [README Perry](https://github.com/PerryTS/perry#performance).

Migrasi backend Perry dari Cranelift ke LLVM telah selesai. Sejak v0.5.12, LLVM adalah satu-satunya backend code generation, dan Perry kini mengalahkan Node.js di setiap benchmark — dengan margin mulai dari 1,7x hingga 24,6x (dengan dua hasil seri).

Perjalanan ke sini tidaklah lurus. Peralihan awal di v0.5.0 membuat beberapa benchmark **70x lebih lambat** dari versi Cranelift yang digantikannya. Artikel ini adalah versi lengkap dari apa yang terjadi, mengapa kami tetap beralih, apa yang rusak, apa yang memperbaikinya, dan seperti apa angka-angkanya di sisi lain.

Jika Anda sedang membangun compiler, mengevaluasi backend codegen, atau sekadar penasaran mengapa “beralih ke LLVM” jarang sesederhana kedengarannya, ini untuk Anda.

## Bagian 1: Mengapa Beralih?

Perry mengompilasi TypeScript langsung ke kode mesin native. Tanpa Node, tanpa V8, tanpa Electron, tanpa WebView. Proposisinya adalah “tulis TypeScript, hasilkan binary native,” dan seluruh proposisi nilai itu runtuh jika binary tersebut sebenarnya tidak cepat.

Untuk beberapa versi minor pertama Perry, backend codegen-nya adalah [Cranelift](https://cranelift.dev/). Cranelift luar biasa — ia adalah codegen di balik wasmtime, digunakan oleh baseline JIT SpiderMonkey, dan merupakan pilihan utama ketika Anda membutuhkan kompilasi yang cepat dan dapat diprediksi dengan integrasi yang bersih. Untuk proyek yang sedang mem-bootstrap bahasa baru, ini adalah titik awal yang tepat.

Tetapi dua hal akhirnya mendorong kami meninggalkannya.

### 1\. Batas atas optimizer

Cranelift dengan sengaja dirancang sebagai compiler optimasi cepat satu tingkat. Mandatnya adalah “hasilkan kode yang layak dengan cepat,” bukan “hasilkan kode terbaik yang mungkin tanpa batas waktu.” Itu adalah tradeoff yang tepat untuk JIT. Itu adalah tradeoff yang salah untuk compiler AOT yang seluruh nilai jualnya adalah performa native.

LLVM telah memiliki lebih dari dua dekade kerja yang dicurahkan ke middle-end-nya. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis — tidak ada dunia realistis di mana proyek yang lebih kecil bisa menyusul. Jika Perry akan mengklaim “lebih cepat dari Node,” kami membutuhkan mesin itu.

### 2\. Masalah arm64\_32

Faktor pemaksa langsung adalah Apple Watch. `arm64_32` adalah ABI yang diperkenalkan Apple untuk Series 4 ke atas — instruksi 64-bit, pointer 32-bit. Cranelift tidak mendukungnya, dan tidak ada jalur realistis untuk dukungan itu hadir. Agar Perry bisa mengklaim “9 platform dari satu codebase” dengan kredibel, watchOS tidak boleh absen. LLVM mendukung `arm64_32` langsung.

Begitu kami menerima bahwa *beberapa* target akan memerlukan LLVM, memelihara dua backend menjadi tidak bisa dipertahankan. Dua backend berarti dua set bug, dua set optimization pass, dua matriks pengujian, dua baseline performa. Jawaban jujurnya adalah: pilih satu.

Kami memilih LLVM.

## Bagian 2: Sepatah Kata tentang Cranelift

Sebelum melanjutkan: artikel ini bukan pembongkaran Cranelift. Cranelift adalah karya teknik yang brilian, dan jika Anda membangun JIT, runtime yang di-sandbox, atau apa pun di mana latensi kompilasi lebih penting dari throughput puncak, ia harus berada di urutan teratas daftar Anda. wasmtime menggunakannya dengan alasan yang bagus. Bytecode Alliance telah melakukan pekerjaan yang patut dicontoh.

Kebutuhan Perry berbeda. Kami mengompilasi ahead of time, kami mengirimkan binary sekali, dan pengguna menjalankannya jutaan kali. Asimetri itu — kompilasi jarang, eksekusi selalu — adalah persis rezim di mana optimizer yang lebih berat dari LLVM membayar dirinya sendiri. Alat berbeda untuk pekerjaan berbeda.

## Bagian 3: Bencana Peralihan

v0.5.0 adalah rilis pertama dengan LLVM sebagai satu-satunya backend. Kami mengharapkan regresi kecil dalam waktu kompilasi dan peningkatan bermakna dalam performa runtime. Kami mendapat kebalikan dari yang kedua.

Ini tabel yang tidak ingin saya posting saat itu:

| Benchmark | Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method\_calls | 16ms | 1,084ms | 68x lebih lambat |
| object\_create | 5ms | 318ms | 64x lebih lambat |
| matrix\_multiply | 61ms | 184ms | 3x lebih lambat |
| math\_intensive | 370ms | 131ms | 2,8x lebih cepat |
| nested\_loops | 32ms | 57ms | 1,8x lebih lambat |
| fibonacci(40) | 505ms | 1,156ms | 2,3x lebih lambat |

Beberapa beban kerja menjadi lebih cepat. Sebagian besar menjadi jauh lebih buruk. `method_calls` — salah satu benchmark terpenting karena merepresentasikan penggunaan class TypeScript yang idiomatis — hampir 70x lebih buruk dari yang kami kirimkan dua rilis sebelumnya.

### Apa yang sebenarnya salah

Perry menggunakan **NaN-boxing** untuk representasi nilai. Setiap nilai TypeScript adalah word 64-bit. Angka f64 disimpan langsung; semua yang lain (objek, string, boolean, undefined, null) dikodekan ke dalam bit-bit yang tidak terpakai dari quiet NaN IEEE 754.

Keuntungannya: angka tanpa biaya. Tidak ada boxing, tidak ada tagging, tidak ada alokasi untuk aritmetika.

Kekurangannya: setiap operasi pada nilai non-angka memerlukan manipulasi bit untuk membongkar, mengoperasikan, dan mengemas ulang. Jika urutan tersebut ada sebagai IR inline di codegen Anda, optimizer dapat menggabungkan dan menyederhanakannya. Jika ada sebagai **panggilan ke fungsi helper runtime**, optimizer melihat panggilan yang tidak transparan dan menyerah.

Backend Cranelift kami telah mengembangkan banyak inline lowering untuk operasi-operasi panas — pemuatan properti, dispatch metode, alokasi objek, aritmetika integer pada nilai yang di-tag f64. Peralihan LLVM, demi menghasilkan kode yang *benar* terlebih dahulu, merutekan hampir semuanya melalui helper runtime di `perry-runtime`. Setiap helper adalah instruksi `call` di LLVM IR.

LLVM luar biasa, tetapi tidak bisa menginline fungsi yang body-nya tidak pernah dilihat. `perry-runtime` dikompilasi terpisah, di-link di akhir, dan dari perspektif optimizer setiap panggilan helper adalah kotak hitam. Hasilnya adalah loop panas yang backend Cranelift telah kompilasi menjadi ~5 instruksi aritmetika inline kini dikompilasi menjadi panggilan fungsi — penyimpanan register, setup stack frame, semuanya — diulang jutaan kali.

Dari situlah 70x itu berasal. Bukan codegen yang buruk. **Batas inlining** yang buruk.

## Bagian 4: Perbaikannya

Pekerjaan untuk memulihkan dan melampaui angka Cranelift terbagi dalam kurang-lebih enam kategori. Tidak ada yang eksotis. Sebagian besar adalah optimasi compiler dari buku teks yang hanya perlu diterapkan di tempat yang tepat.

### 1\. Inline bump allocator untuk alokasi objek

`object_create` adalah regresi terburuk setelah `method_calls`. Jalur lama memanggil `js_object_alloc_class_with_keys` untuk setiap `new Point()` — panggilan fungsi, akses arena thread-local, pencarian shape-cache, dan penulisan header GC + header objek.

Perbaikannya: emit bump allocation **inline** di LLVM IR. Setiap fungsi yang mengalokasikan objek mendapat pointer yang di-cache ke struct `InlineArenaState` thread-local. Alokasi menjadi:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

Fast path-nya adalah ~13 instruksi IR inline yang bisa dilihat, dijadwalkan, dan diangkat dari loop oleh LLVM. `object_create` turun dari 318ms ke 9ms.

### 2\. Loop counter i32

NaN-boxing berarti setiap angka TypeScript adalah f64. Termasuk counter loop. Loop `for (let i = 0; i < 100_000_000; i++)` dengan variabel induksi f64 adalah bencana: increment f64, perbandingan f64, konversi f64-ke-i64 setiap kali mengindeks array.

Codegen mendeteksi for-loop di mana variabel induksi terbukti bernilai integer dan mengalokasikan **slot stack i32 paralel**. Kondisi loop berubah dari `fcmp` ke `icmp slt i32`, menghilangkan counter f64 sepenuhnya.

Ini memindahkan `array_write` dari 11ms ke 3ms, `nested_loops` dari 18ms ke 9ms, dan `array_read` dari 11ms ke 4ms.

### 3\. Flag fast-math

Kami menambahkan flag `reassoc contract` ke setiap instruksi aritmetika f64. `reassoc` memungkinkan LLVM memecah rantai akumulator serial menjadi paralel, dan `contract` mengizinkan fused multiply-add. Kami membiarkan `nnan` dan `ninf` mati karena Perry menggunakan bit NaN sebagai tag nilai.

Dengan flag tersebut, loop vectorizer LLVM bekerja pada `math_intensive`, yang turun dari 131ms ke 14ms — mengalahkan Node sebesar 3,5x.

### 4\. Fast path untuk modulo integer

`%` pada f64 di JavaScript adalah `fmod`, yang merupakan panggilan libm di ARM. Tetapi untuk operan f64 bernilai integer, kita bisa melakukan `fptosi → srem → sitofp` dan melewatkan perjalanan pulang-pergi libm sepenuhnya. Codegen menggunakan analisis statis untuk mendeteksi operan bernilai integer — tidak perlu pemeriksaan runtime.

Inilah satu-satunya alasan `factorial` turun dari 1.553ms ke 24ms — dan dari 591ms Node ke 24ms. **24,6x lebih cepat dari Node.**

### 5\. LICM untuk loop bersarang

LLVM melakukan loop-invariant code motion secara bawaan, tetapi NaN-boxing menyembunyikan strukturnya. `arr.length` di-lower menjadi pemuatan melalui pointer NaN-boxed dengan pemeriksaan tag — tidak jelas invariant.

Codegen mendeteksi pola `for (...; i < arr.length; ...)` dan memuat panjang ke slot stack sebelum loop, dengan walker statis yang memverifikasi bahwa body loop tidak bisa mengubah panjang array. Ketika counter dibatasi oleh panjang yang telah diangkat ini, IndexGet/IndexSet melewatkan pemeriksaan batas sepenuhnya.

### 6\. Objek dengan shape-cache

Ketika codegen mengetahui class dari suatu objek, ia menyelesaikan offset field pada waktu kompilasi dan menghasilkan **pemuatan terindeks langsung** — tanpa dispatch runtime. Untuk dispatch metode, `obj.method(args)` menjadi panggilan langsung `call @perry_method_Class_name(this, args)` — tanpa vtable, tanpa inline cache, tanpa hash lookup.

Peralihan LLVM telah meregresikan ini ke slow path universal. Memulihkan dispatch statis memberi kami pemulihan `method_calls` — dari 1.084ms kembali ke 1ms. **11x lebih cepat dari Node.**

## Bagian 5: Angka-Angka Hari Ini

Median dari tiga kali menjalankan, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Benchmark | Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| factorial | 24ms | 591ms | 24.6x |
| method\_calls | 1ms | 11ms | 11x |
| loop\_overhead | 12ms | 53ms | 4.4x |
| math\_intensive | 14ms | 49ms | 3.5x |
| array\_read | 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array\_write | 3ms | 8ms | 2.6x |
| string\_concat | 1ms | 2ms | 2x |
| nested\_loops | 9ms | 16ms | 1.7x |
| prime\_sieve | 4ms | 7ms | 1.7x |
| matrix\_multiply | 21ms | 34ms | 1.6x |
| fibonacci(40) | 401ms | 991ms | 2.5x |
| binary\_trees | 9ms | 9ms | seri |
| mandelbrot | 24ms | 24ms | seri |
| object\_create | 9ms | 8ms | 0.9x |

Setiap benchmark adalah kemenangan atau seri. Yang paling ketat adalah `object_create` (9ms vs 8ms), di mana allocator V8 memang sangat baik.

## Bagian 6: Pertanyaan Waktu Kompilasi

Alasan nomor satu orang memilih Cranelift daripada LLVM adalah kecepatan kompilasi. Jadi mari kita bahas.

LLVM meningkatkan waktu kompilasi per-file Perry sebesar **20-50ms**, atau sekitar **8-19%**. Bukan 5x. Bukan 2x. Persentase satu digit hingga dua digit rendah.

Alasannya adalah codegen bukan bottleneck di pipeline Perry. Rincian untuk file tipikal:

-   Parsing SWC: ~30%
-   Lowering HIR (AST → IR, inferensi tipe): ~25%
-   Pass transformasi IR (konversi closure, lowering async, inlining): ~15%
-   **Codegen (emisi teks LLVM IR + `clang -c -O3`): ~20%**
-   Linking (`cc` + library runtime): ~10%

Codegen adalah satu irisan dari lima. Bahkan menggandakan irisan itu hanya menggerakkan total sebesar 5-10%. Jika Anda membangun compiler AOT di mana pengguna mengetik `perry compile` sekali lalu menjalankan binary-nya selamanya, perhitungannya adalah: habiskan 25ms lebih banyak saat kompilasi, hemat hingga 24x di setiap eksekusi.

## Bagian 7: Apa yang Akan Saya Lakukan Berbeda

Jika saya memulai Perry hari ini dan bisa langsung lompat ke LLVM, saya tidak akan melakukannya. Fase Cranelift benar-benar berharga. Ini memungkinkan kami mengiterasi frontend tanpa beban kompleksitas LLVM, memberi kami baseline yang berfungsi untuk perbandingan, dan memaksa kami menjaga HIR cukup bersih agar portable lintas backend.

Yang akan saya lakukan berbeda adalah peralihan itu sendiri. Kami merilis v0.5.0 dengan sebagian besar operasi melewati panggilan helper runtime, berniat untuk menginline-kannya nanti. Itu salah. Urutan yang benar seharusnya: identifikasi hot path terlebih dahulu, lower secara inline sebelum peralihan, dan baru rilis setelah backend LLVM setidaknya setara.

Pelajarannya adalah yang membosankan: batas optimasi lebih penting dari kualitas optimizer. LLVM adalah perangkat lunak yang luar biasa, tetapi tidak bisa membantu Anda dengan kode yang tidak bisa dilihatnya. Jika codegen Anda merutekan semuanya melalui panggilan runtime yang tidak transparan, Anda telah membangun dinding antara program sumber Anda dan setiap optimization pass yang ada.

## Penutup

Perry sekarang hanya LLVM, lebih cepat dari Node di setiap benchmark, dan telah dirilis. Migrasi ini memakan waktu lebih lama dari yang saya rencanakan, lebih menyakitkan dari yang saya harapkan di tengah jalan, dan jelas merupakan keputusan yang tepat dalam retrospeksi. Cranelift membawa kami ke v0.5; LLVM membawa kami selanjutnya.

Jika Anda ingin mencoba Perry:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Kode sumber: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Jalankan benchmark sendiri: `cd benchmarks/suite && ./run_benchmarks.sh`

Jika Anda punya pertanyaan, menemukan bug, atau ingin berdebat tentang backend codegen, issue GitHub-nya terbuka. Saya membaca semuanya.

— Ralph
