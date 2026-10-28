---
title: "Mengoptimalkan Semuanya: Satu Minggu, 68 Rilis, dan Percepatan JSON 547x"
excerpt: "Perry v0.5.13 → v0.5.80 dalam tujuh hari. JSON.parse menutup jarak 547x dengan Node. mimalloc hadir sebagai allocator global. Inline cache, transisi shape, slot Buffer bertipe, operasi bitwise i32-native, scalar replacement, dan event loop native yang menjaga server Fastify dan WebSocket tetap hidup."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
Artikel blog terakhir dirilis bersamaan dengan Perry v0.5.12. Hari ini kami di v0.5.80. Itu berarti **68 rilis patch dalam tujuh hari**, hampir seluruhnya difokuskan pada satu hal: mengubah setiap slow path yang tersisa menjadi fast path.

Peralihan LLVM di v0.5.0 pulih hingga setara dengan Cranelift pada v0.5.12. Itu adalah akhir dari satu cerita dan awal dari cerita lain. LLVM kini melihat segalanya. Pertanyaan berhenti menjadi “mengapa ini lambat?” dan berubah menjadi “mengapa ini belum cepat?” — yang merupakan pertanyaan yang jauh lebih mudah ditangani.

Artikel ini adalah tur minggu tersebut. JSON mendapat percepatan 547x. mimalloc menjadi allocator global. Property access mendapat monomorphic inline cache. Buffer mendapat slot pointer bertipe dengan metadata `noalias`. Server Fastify dan WebSocket berhenti crash setelah satu menit. Dan benchmark bergerak lagi.

## 1\. JSON: menutup celah 547x

Pada v0.5.29, JSON.parse Perry pada array 20-record adalah **547x lebih lambat dari Node**. Pada v0.5.46 angkanya menjadi 1,3x. Angka itu adalah delta tunggal terbesar minggu ini, dan layak ditelusuri karena setiap optimasi lain dalam artikel ini adalah variasi dari tema yang sama: jangan lakukan pekerjaan yang tidak perlu Anda lakukan.

Parser asli mengalokasikan satu Vec per properti, satu Vec key per objek, dan satu thread-local yang dijaga RefCell untuk cache key. Ia menyalin setiap string. Ia me-rehash setiap nama field. Ia membangun shape objek baru untuk setiap record, bahkan ketika semua 20 record memiliki field yang sama persis dalam urutan yang sama persis. Parser Node menangani ini dengan mengenali pola dan berbagi satu shape tunggal di semua record. Parser Perry tidak.

Perbaikannya datang dalam empat langkah:

1.  **Key interning melalui `PARSE_KEY_CACHE` thread-local** (v0.5.45). Record pertama mengalokasikan N string key; record 2 hingga 20 mengalokasikan nol. Key yang berulang diselesaikan ke pointer yang sama, yang membuatnya dapat digunakan sebagai key lookup shape-cache tanpa strcmp.
2.  **Shape sharing melalui transition cache** (v0.5.45). Objek yang dibangun oleh `js_object_set_field_by_name` berjalan di graf transisi yang sama. Ketika schema berulang, pointer `keys_array` dibagi, dan itulah yang dibutuhkan polymorphic inline cache untuk hit.
3.  **Parsing string zero-copy + pembangunan objek inkremental** (v0.5.46). `parse_string_bytes` sekarang mengembalikan `ParsedStr::Borrowed(&[u8])` ketika tidak ada escape backslash — yang merupakan kasus umum untuk setiap key dan sebagian besar value. `parse_object` menulis field secara langsung alih-alih mengumpulkannya ke dalam Vec terlebih dahulu.
4.  **Penekanan GC selama parse** (v0.5.60, menutup #59). Mem-parse array besar mengalokasikan ribuan objek kecil dalam loop yang ketat. Setiap alokasi memicu pemeriksaan threshold GC. Menyetel flag “parsing in progress” menunda koleksi hingga parse selesai — ukuran heap efektif yang sama, jauh lebih sedikit percabangan pembukuan.

Kemudian stringify. JSON.stringify pada array homogen — shape yang sama, jutaan kali — melakukan iterasi properti penuh per objek, yang untuk array dengan shape-stable adalah pemborosan murni. Perbaikan lima langkah menutup sebagian besar celah itu juga:

-   v0.5.62: fast path itoa / ryu untuk angka, pemeriksaan referensi sirkular berbasis kedalaman alih-alih HashSet.
-   v0.5.63: guard `toJSON` + cache key persisten + dispatch inline (tiga biaya per-call yang menumpuk).
-   v0.5.65: template stringify shape-homogen + fast path escape ASCII. Ketika setiap elemen memiliki shape yang sama, scaffolding key/colon/comma diprakomputasi sekali.
-   v0.5.70, v0.5.72, v0.5.75: cache shape-template per-call, menutup celah GC sisa parse, menghilangkan sisa overhead per-call yang tetap.
-   v0.5.79: jalur nilai kecil. Angka, boolean, dan string pendek melewati jalur langsung yang tidak menyiapkan mesin objek apa pun.

Hasil kumulatif: pipeline JSON yang **547x di belakang Node** pada awal minggu sekarang kira-kira **1,3x di belakang pada parse dan kompetitif pada stringify**, pada beban kerja realistis.

## 2\. Kisah allocator

Perry banyak mengalokasikan. Setiap literal objek, setiap literal array, setiap konkatenasi string, setiap closure. Allocator adalah hot, dan untuk sebagian besar v0.5, ia adalah system allocator bawaan Rust plus arena thread-local untuk nilai berumur pendek.

v0.5.67 mengganti allocator global dengan **mimalloc**. Ini adalah perubahan satu baris di Cargo.toml yang segera membayar diri pada beban kerja apa pun yang melakukan banyak alokasi kecil — yang berarti setiap program TypeScript. v0.5.66 mendahuluinya dengan mengonsolidasikan semua state thread-local `gc_malloc` menjadi satu akses TLS per panggilan, sehingga jalur ke mimalloc semurah mungkin.

v0.5.68 melangkah lebih jauh dengan **string yang dialokasikan di arena**. String berumur pendek (hasil konkatenasi perantara, potongan `split()`, scratch parser) melewati allocator global sepenuhnya dan mendarat di bump arena per-thread yang direset di batas natural. Untuk parsing JSON ini sendiri adalah kemenangan persentase dua digit.

Dan dua optimasi yang sama sekali tidak mengalokasikan:

-   **Scalar replacement dari objek non-escape** (v0.5.17, lalu literal objek di v0.5.76). Jika sebuah objek tidak pernah meninggalkan fungsi pembungkusnya, ia tidak perlu ada. Field-nya menjadi local biasa. LLVM menangani ini secara default begitu Anda berhenti menyembunyikan objek di balik panggilan allocator yang tidak transparan.
-   **Scalar replacement dari array non-escape** (v0.5.73). Ide yang sama — jika array tidak escape, elemennya menjadi nilai SSA dan seluruh alokasi menghilang.

Khusus untuk jalur literal array, v0.5.69 menambahkan **fast path ukuran-tepat** (lewati mesin pertumbuhan kapasitas ketika ukurannya diketahui pada waktu kompilasi), dan v0.5.74 menginline IR bump-allocator untuk literal array kecil sehingga LLVM bisa melihat alokasinya, melipatnya, mengangkatnya, atau menghilangkannya. Benchmark yang array-heavy bergerak satu langkah lagi.

Sebagai penutup, v0.5.25 memperbaiki bug yang lebih tenang: `gc_malloc` tidak memicu koleksi di jalurnya sendiri, sehingga beban kerja yang malloc-heavy dapat menumbuhkan heap tanpa batas sebelum ada yang memeriksa. v0.5.61 menambahkan sizing langkah adaptif ke threshold, yang merupakan apa yang sebenarnya Anda inginkan: periksa dengan murah ketika heap kecil, lebih jarang ketika besar.

## 3\. Property access mendapat inline cache sungguhan

Setiap mesin JavaScript modern memiliki polymorphic inline cache (PIC) pada property access. Untuk sebagian besar seri v0.5 Perry, PropertyGet berjalan melalui shape-table lookup dengan hash thread-local. Itu baik-baik saja untuk kode dingin. Itu tidak baik-baik saja ketika 95% pembacaan properti Anda di call site tertentu melihat shape yang sama, yang hampir selalu terjadi.

v0.5.44 mendaratkan **monomorphic inline cache** untuk `PropertyGet`. Setiap site PropertyGet mendapat entri cache per-callsite: pointer shape yang diharapkan dan offset field. Jalur hit adalah satu compare plus satu indexed load. Jalur miss jatuh ke helper lambat yang memperbarui cache.

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

v0.5.51 menambahkan **cache shape-transition berbasis content-hash** untuk penulisan properti dinamis. Dua objek yang menumbuhkan field yang sama dalam urutan yang sama akan hash ke transisi yang sama, sehingga mereka berbagi shape yang sama — dan itu berarti sisi baca PIC benar-benar hit.

v0.5.55 mengupas akses TLS terakhir dari transition cache. v0.5.46 memperbaiki bug PIC miss-handler di mana objek dengan >8 field membaca melewati slot inline ke memori yang tidak diinisialisasi (menutup #55). v0.5.78 menambahkan guard untuk mencegah PIC PropertyGet mengindeks ke receiver non-pointer seperti angka mentah — yang bisa terjadi pada refinement tipe yang terlalu optimistis dan merupakan salah satu masalah stabilitas terakhir di IC.

Efek bersih: kode yang property-heavy — yang dalam praktik berarti sebagian besar TypeScript — kira-kira 2-3x lebih cepat dari seminggu yang lalu, hanya dari IC saja.

## 4\. Integer, bitwise, dan pola `| 0`

NaN-boxing membuat setiap angka menjadi f64. Programmer TypeScript menulis `x | 0` untuk memaksa semantik integer. V8 telah menghabiskan lima belas tahun membuat itu murah. Perry menghabiskan minggu ini untuk mengejar ketertinggalan.

Tumpukan perubahan, berurutan:

-   **v0.5.48**: `sdiv` untuk `(int / const) | 0`. LLVM melipatnya menjadi `smulh + asr`, yang ~2 siklus vs ~10 untuk `fdiv`.
-   **v0.5.48**: `@llvm.assume` pada batas Uint8ArrayGet. Mengganti diamond branch+phi pemeriksaan batas dengan satu basic block yang dapat dipikirkan oleh vectorizer.
-   **v0.5.49**: perbaiki operasi bitwise dengan NaN/Infinity untuk menghasilkan 0 sesuai spec ToInt32. Kebenaran dulu.
-   **v0.5.50**: `toint32_fast` yang melewati guard NaN/Inf 5-instruksi ketika nilai diketahui-finite. Plus `alwaysinline` pada helper kecil dan deteksi clamp.
-   **v0.5.52**: target fungsi clamp langsung dengan intrinsik `smin`/`smax`. Clamp adalah pola integer paling umum setelah increment.
-   **v0.5.53**: `x | 0` dan `x >>> 0` pada nilai yang diketahui-finite menjadi noop — hanya `fptosi + sitofp`, tanpa guard sama sekali.
-   **v0.5.56**: operasi bitwise i32-native; index dan value i32 di Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60**: `Math.imul` diturunkan ke native i32 multiply alih-alih jalur polyfill. Deteksi polyfill mengenali shim `Math.imul` yang ditulis pengguna dan menggantinya.
-   **v0.5.59**: inlining init fungsi murni + seeding integer-local. Analisis integer function-local dapat melihat melewati batas call ketika callee kecil dan murni.
-   **v0.5.37–v0.5.40**: fast path aritmetika integer pola-akumulator. Loop klasik `for (...) acc += f(i)` tetap di i32 end-to-end ketika tipenya mengizinkan.

v0.5.41 adalah yang halus. Ketika codegen melihat `const K: number[][] = [[...], ...]` tingkat-modul, ia menurunkannya seluruhnya menjadi konstanta `[N x i32]` flat di `.rodata`. `K[y][x]` menjadi satu `getelementptr + load i32`. Dikombinasikan dengan jembatan analisis integer di v0.5.43, inilah yang memberi `image_conv` (Gaussian blur 5×5 pada frame RGB 4K) **percepatan 3x dalam satu rilis**.

## 5\. Buffer dan Uint8Array

Beban kerja biner — kripto, pemrosesan gambar, parsing, networking — hidup di Buffer dan Uint8Array. v0.5.64 memberi mereka **slot pointer bertipe plus metadata `noalias`**. Di mana Buffer dulunya adalah double NaN-boxed di `alloca double`, sekarang ia adalah pointer `i64` mentah di `alloca i64`, dengan anotasi LLVM yang memberi tahu optimizer “pointer ini tidak alias dengan pointer lain dalam scope.” Itu membuka penyusunan ulang load/store, vectorization, dan alokasi register yang jika tidak akan ditolak oleh optimizer.

v0.5.80 menutup masalah kebenaran terakhir di sini: counter `alias-scope` buffer module-wide yang di-reset per-fungsi, yang dalam kasus langka bisa membiarkan LLVM bernalar lintas scope yang tidak seharusnya berbagi ID scope. Sekarang counter-nya module-wide dan cerita `noalias` benar-benar rapat.

v0.5.53 membuat `Uint8ArraySet` branchless — masked store alih-alih if/else yang menulis 0 saat out-of-bounds. v0.5.54 menambahkan **Two-Way indexOf** untuk pola yang lebih panjang dan `split` yang dialokasikan di arena, yang bersama-sama menutup sebagian besar celah pada parsing Buffer yang string-heavy.

## 6\. String: ASCII adalah fast path

String JavaScript adalah UTF-16, tetapi sebagian besar string dunia nyata (key, identifier, header HTTP, scaffolding JSON) adalah ASCII. v0.5.71 menambahkan **O(1) `charCodeAt` dan `codePointAt` untuk string ASCII** — tanpa scan UTF-16, hanya byte load. v0.5.20 sudah membuat `indexOf`, `slice`, dan `charAt` melewati scan UTF-16 pada ASCII.

Satu catatan kebenaran di dalam rilis yang sama: `String.length` sekarang mengembalikan code unit UTF-16 (spec ECMAScript) alih-alih jumlah byte. Itu adalah bug yang mengintai di mana `"café".length` mengembalikan 5 alih-alih 4.

## 7\. Server-server sekarang benar-benar tetap hidup

Pekerjaan paling tidak glamor minggu ini juga yang paling terlihat oleh pengguna: membuat server gaya Node yang berjalan lama — Fastify, ws, http, net — tidak crash setelah beberapa menit.

Semua crash tersebut berbagi akar masalah: GC tidak tahu tentang closure listener. Ketika Anda menulis `wss.on('message', handler)`, closure menangkap variabel, yang hidup sebagai field di dalam cell yang dialokasikan GC. Jika root scanner GC tidak tahu untuk mengunjungi cell tersebut, capture-nya direklamasi dan event message berikutnya melakukan dereference memori yang sudah dibebaskan.

-   **v0.5.26**: root-scan closure event listener `net.Socket` (menutup #35).
-   **v0.5.27**: perluas ke `ws`, `http`, `events`, `fastify`.
-   **v0.5.28**: daftarkan global tingkat-modul sebagai root GC (menutup #36). Bug lifetime satu lapis di atasnya.
-   **v0.5.21**: keamanan `gc()` di dalam handler request Fastify/WebSocket — panggilan GC eksplisit berjalan saat handler request memegang pointer ke arena (menutup #31).

Di samping pekerjaan GC, v0.5.20 merilis **event loop utama** — yang sungguhan, bukan placeholder — yang menjaga server berbasis WebSocket dan timer tetap hidup alih-alih keluar setelah panggilan sync terakhir kembali (refs #28). Ini adalah perbaikan tunggal paling berdampak bagi siapa pun yang mencoba menjalankan Perry sebagai server HTTP produksi. Fastify sekarang tetap hidup. Server WebSocket sekarang tetap hidup.

v0.5.19 memperbaiki ketidakcocokan ABI SysV AMD64 untuk argumen/return FFI JSValue — masalah di Linux di mana panggilan FFI native dapat secara diam-diam merusak argumen. v0.5.18 menambahkan dispatch native untuk `axios` (get/post/put/delete/patch), termasuk `response.status` dan `response.data`. v0.5.30 memperbaiki dispatch `fastify request.header()` dan `request.headers[]`, yang telah mengembalikan undefined untuk lookup case-insensitive.

## 8\. `@perry/postgres`: driver yang membuat semua ini perlu

Banyak pekerjaan minggu ini didorong oleh satu beban kerja: membuat [driver Postgres](https://github.com/PerryTS/postgres) yang sepenuhnya kompatibel dengan Node berjalan di Perry-native. Driver ini mampu TLS, memiliki registri codec lintas-modul, mendukung cancel/close/notify, dan sekarang di-benchmark melawan `pg`, `postgres.js`, dan `tokio-postgres`.

Pekerjaan perf di sisi driver paralel dengan sisi compiler:

-   **Hoist codec per-kolom** dan menghilangkan salinan Buffer per-sel. BigInt(string) untuk int8 untuk menghindari alokasi perantara.
-   **Konstruktor Row dinamis per-shape** untuk baris berbentuk objek. Jika query Anda selalu mengembalikan kolom yang sama, driver membangun konstruktor baris yang dispesialisasikan shape pertama kali dan menggunakannya kembali — yang, dikombinasikan dengan PIC compiler, membuat akses field pada baris secepat akses field pada objek lain.
-   **Opt-out `parseTypes: 'minimal'`** untuk caller yang menginginkan string mentah untuk int8/numeric/date.

Ini adalah positive feedback loop yang selalu dimaksudkan untuk dimungkinkan oleh compiler. Driver nyata memunculkan bottleneck nyata. Bottleneck mendapat reproducer satu baris yang diajukan sebagai issue GitHub. Seminggu perbaikan compiler kemudian, driver menjadi lebih cepat dan compiler menjadi lebih cepat untuk semua orang juga. Itulah seluruh rencana, dikompresi menjadi tujuh hari.

## 9\. Perbaikan kebenaran yang layak disebut

Pekerjaan performa memunculkan masalah kebenaran dengan cara seperti mengeruk sungai memunculkan kereta belanja. Daftar sebagian:

-   **Promise.race** membaca `.value` saat rejection alih-alih `.reason`, sehingga rejection tertelan diam-diam (v0.5.13–v0.5.14).
-   **Promise.any** sekarang melempar `AggregateError` yang tepat ketika semua input promise rejected. Menambahkan `Promise.withResolvers` dan memperbaiki urutan `queueMicrotask`.
-   **`[..."hello"]`** sekarang menghasilkan array karakter alih-alih objek rusak (menutup #16).
-   **Aritmetika BigInt dan koersi `BigInt()`** (menutup #33). Fast path bigint i64 (v0.5.29) membuat kasus umum menjadi murah.
-   **Buffer.indexOf / Buffer.includes** dengan argumen byte numerik membandingkan dengan pointer buffer alih-alih nilai byte (menutup #56).
-   **Operasi bitwise dengan NaN/Infinity** menghasilkan 0 sesuai spec ToInt32 (menutup #57).
-   **Windows x86\_64**: lima perbaikan platform-spesifik — `localtime`, penemuan `clang`, dan beberapa penyesuaian codegen — membuat Windows x86\_64 kembali hijau (v0.5.72).

## 10\. Angka-angkanya

Benchmark utama dari artikel terakhir adalah `factorial` pada 24,6x lebih cepat dari Node. Angka itu tidak berubah. Yang bergerak minggu ini adalah segalanya di sekitarnya:

| Beban kerja | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (schema 20-record) | 547x lebih lambat dari Node | 1,3x lebih lambat dari Node | ~420x |
| image\_conv (blur 4K 5×5) | 1.980ms | 457ms | 4,3x |
| Kode property-heavy (PIC hit) | garis dasar| 2–3x | 2–3x |
| Fibonacci(40)| 401ms | 309ms | 1,3x |
| Uptime Fastify di bawah beban | ~60d sebelum crash | tak terbatas | ∞ |

Suite 15-benchmark lengkap melawan Node masih 14 kemenangan dan 1 seri — tabel yang sama seperti artikel lalu, dengan angka yang sedikit lebih baik di semua lini. Pergerakan nyata minggu ini ada pada beban kerja yang tidak ada dalam suite itu: JSON, pemrosesan gambar, server berjalan lama. Di sanalah celah-celah itu hidup, dan itulah yang telah ditutup.

## 11\. Apa yang berikutnya

Satu benchmark yang masih kami kejar adalah `image_conv` vs Zig. Perry ada di 457ms; Zig ada di 246ms. Celah itu arsitektural, bukan tingkat optimization-pass, dan ia hidup di tiga tempat:

1.  **Local buffer bertipe**. Sebagian besar pekerjaan Buffer mendarat minggu ini, tetapi parameter fungsi dan local bertipe buffer masih unbox di setiap akses. Pendekatan slot `i64` yang kami gunakan untuk counter loop perlu diperluas ke buffer.
2.  **Pemisahan loop interior/border**. Loop blur men-clamp setiap piksel, termasuk 99,9% piksel yang tidak memerlukannya. Memisahkan menjadi region border (di-clamp) dan interior (tanpa clamp) memungkinkan LLVM memvektorisasi interior dengan NEON `ld3`/`st3`.
3.  **Hash FNV-1a Double-ABI**. Helper hash dipanggil melalui ABI NaN-box. Menspesialisasikannya ke i64 mentah masuk/keluar untuk hot path adalah beberapa jam pekerjaan yang akan membayar di setiap beban kerja hash-heavy.

Itu dilacak di `PERF_ROADMAP.md`. Harapkan untuk melihatnya di siklus berikutnya.

## Penutup

Pola minggu ini — 68 rilis patch, hampir semua performa, satu celah JSON berubah dari 547x menjadi 1,3x — adalah apa yang terjadi ketika Anda menyeberang ke sisi baik bukit peralihan LLVM. Optimizer sekarang sekutu alih-alih dinding, dan sebagian besar yang tersisa adalah pekerjaan kecil, spesifik, terukur: temukan slow path, cari tahu mengapa optimizer tidak bisa melihat tembusnya, ekspos strukturnya, ukur lagi. Tidak ada commit ini yang eksotis. Mereka hanya diterapkan di tempat yang dibutuhkan.

Jika Anda ingin mencoba semua ini:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Kode sumber: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issue, reproducer, dan benchmark yang belum cukup cepat: teruskan saja. Kecepatan ini hanya berhasil karena laporan bug cukup spesifik untuk diubah menjadi reproducer satu baris. Setiap commit dalam artikel ini memiliki `#N` yang menyertainya dengan alasan.

— Ralph
