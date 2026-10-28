---
title: "GC Generasional, Lazy JSON, dan Benchmark yang Tahan Pemeriksaan"
excerpt: "Perry v0.5.174 → v0.5.306 dalam tiga hari, plus pekerjaan GC dan JSON yang mendarat bersamanya. GC generasional kini default. Small String Optimization kini default. Pipeline JSON mendapatkan lazy tape yang mendarat di median 75 ms pada validate-and-roundtrip — terbaik di kelompok dynamic typing. Halaman benchmark ditulis ulang dengan median RUNS=11 + p95 + σ, simdjson dan AssemblyScript+json-as ditambahkan sebagai peer, dan setiap kelemahan Perry diungkap secara jujur."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
Artikel terakhir ditutup pada **v0.5.174** dengan satu sorotan utama: Perry akhirnya memenangkan setiap benchmark dalam suite in-tree melawan Node maupun Bun. Tiga hari kerja dan setumpuk commit GC + JSON kemudian, Perry berada di **v0.5.306** — itu berarti **132 rilis patch** — dan ceritanya berbeda. Sorotan utamanya bukan speedup 547x atau kolom kemenangan baru. Ini tentang pekerjaan yang membuat kemenangan-kemenangan itu dapat dipertahankan.

-   **GC generasional** dirilis sebagai default. Fase A hingga D mendarat di v0.5.217–v0.5.237.
-   **Small String Optimization** dirilis sebagai default. Step 1.5 → 2 mendarat di v0.5.213–v0.5.216.
-   **Pipeline JSON** mendapat parser berbasis tape, lazy parse, lazy stringify, dan materialisasi sparse per-elemen. Validate-and-roundtrip default sekarang **median 75 ms** — terbaik di kelompok dynamic-typing.
-   **Halaman benchmark** ditulis ulang dari awal hingga akhir dengan **RUNS=11 median + p95 + σ + min + max**, simdjson dan AssemblyScript+json-as ditambahkan sebagai pembanding, optimization probe dipisahkan dari perbandingan nyata, dan setiap kelemahan Perry dimunculkan secara jujur.

Pemain pendukungnya adalah serangkaian perbaikan kebenaran yang stabil: FIFO microtask Promise, kesetaraan NaN dan format angka ECMAScript, two's complement BigInt, AsyncLocalStorage end-to-end, runtime decimal.js + ioredis + commander, dan segfault JSON.stringify pada f64 polos yang sebelumnya tersembunyi di balik jalur tape. Ditambah toolchain Windows yang akhirnya menjadi ringan: LLVM + xwin, tanpa perlu instalasi Visual Studio.

## 1\. GC generasional, aktif secara default

GC generasional telah menjadi roll-out bertahap selama dua bulan. Ringkasan fase yang ditutup dalam jendela ini:

-   **v0.5.217–v0.5.221** — Fase A: scaffolding runtime shadow-stack, emisi push/pop, threading slot-map, mirroring shadow `Let`/`LocalSet`, dan root scanner.
-   **v0.5.222** — Fase B: pemisahan arena nursery + old-gen.
-   **v0.5.223–v0.5.225** — Fase C1–C2: infrastruktur runtime write-barrier, codegen memancarkan barrier, setiap heap store melewatinya.
-   **v0.5.226–v0.5.228** — Fase C3a–C4: root remembered-set mengalir ke mark + clear; trace minor GC melewati old-gen; tenuring non-moving.
-   **v0.5.229–v0.5.236** — Fase C4b α/β/γ/δ: infrastruktur forwarding-pointer, pass pinning + evakuasi, scanner + transitive pinning, penulisan ulang referensi, blok nursery idle dikembalikan ke OS, trigger GC dibatasi pada threshold awal.
-   **v0.5.237** — Fase D bagian 1: `PERRY_GEN_GC=1` secara default.
-   **v0.5.238** — Fase D bagian 2: `PERRY_SHADOW_STACK=1` secara default.
-   **v0.5.239–v0.5.240** — dokumentasi penutup: roadmap difinalisasi, lampiran lineage akademis + industri (Bartlett 1988, Ungar 1984, Cheney 1970).

Kemenangan terukur yang paling penting: `test_memory_json_churn` turun dari **115 MB → 91 MB** peak RSS pada saat default gen-GC dibalik. Regresi compute kecil dan dicantumkan tanpa permintaan maaf — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` +1 ms masing-masing. Escape hatch (`PERRY_GEN_GC=0`) memulihkan angka lama; trade-off ini disengaja, dan halaman benchmark sekarang mencantumkan kedua baris berdampingan agar pembaca dapat memilih.

## 2\. Small String Optimization, aktif secara default

SSO adalah representasi inline-string 22-byte yang menghindari alokasi heap untuk string pendek — key JSON tipikal (2–8 byte) dan nilai pendek mendarat dalam bentuk inline. Roll-out-nya kecil di permukaan dan besar di bawahnya:

-   **v0.5.213**: infrastruktur SSO (representasi + accessor).
-   **v0.5.214**: arms konsumen Step 1 + gate `PERRY_SSO_FORCE` untuk testing.
-   **v0.5.215**: codegen Step 1.5 cabang tiga arah `PropertyGet` — fast path untuk string inline, fast path untuk string heap, slow path untuk sisanya.
-   **v0.5.216**: flip Step 2 — emisi SSO secara default.

Tindak lanjut di v0.5.279 menutup bug NaN property-read terakhir yang muncul setelah SSO menjadi panas, dan perbaikan dispatch getter cross-module berantai di v0.5.272 menutup yang lain. Keduanya ada di punch list sebelum default dibalik; keduanya dirilis tanpa regresi performa.

## 3\. JSON: parse berbasis tape, lazy secara default

Pipeline JSON mendapat penulisan ulang paling invasif dalam periode ini. Perilaku lama: `JSON.parse` membangun pohon nilai NaN-boxed yang termaterialisasi penuh. Perilaku baru: `JSON.parse` membangun tape 12-byte-per-nilai dan memterialisasi secara lazy — hanya nilai yang benar-benar Anda baca yang membayar biaya materialisasi. Stringify pada parse yang tidak dimutasi sekarang adalah memcpy dari input asli, trik fast-path yang sama yang digunakan simdjson dengan `raw_json()`.

-   **v0.5.200**: `JSON.parse<T>(blob)` parse berbasis schema (Step 1). Bentuk yang diketahui pada compile-time memungkinkan compiler memancarkan akses key yang sudah pre-resolved.
-   **v0.5.203**: fondasi parse berbasis tape — Step 2 Fase 1.
-   **v0.5.204**: lazy parse + lazy stringify — Step 2 Fase 2+4.
-   **v0.5.206**: akses indexed yang lazy-safe + edge case — Step 2 Fase 3.
-   **v0.5.208**: materialisasi sparse per-elemen — Step 2 Fase 5b.
-   **v0.5.209**: walk cursor + threshold materialize adaptif.
-   **v0.5.210**: balik lazy parse menjadi default untuk blob ≥1 KB.

Hasil pada beban kerja yang dirancang untuk lazy tape (10k record, blob ~1 MB, parse → stringify tanpa iterasi perantara):

| Implementasi | Median (ms)| p95 (ms) | σ | Peak RSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto`| 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + pita malas)| 75 | 91 | 6.9 | 85 MB |
| karat serde_json (LTO)| 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialisasi)| 473 | 533 | 21.4 | 606 MB |
| skrip perakitan+json-as (waktu habis)| 598 | 621 | 10.5 | 58 MB |

Perry pada **median 75 ms** adalah runtime dynamic-typing tercepat dalam perbandingan — mengalahkan Bun (259 ms), mengalahkan Node (394 ms), mengalahkan server JIT Kotlin (453 ms). simdjson pada 24 ms adalah ceiling C++ yang dipercepat SIMD dan ada di halaman dengan sengaja, bukan disembunyikan di balik cherry-pick. Perry tidak mengalahkannya. Tujuannya adalah menunjukkan celahnya sehingga menutupnya memiliki target — dilacak di `docs/json-typed-parse-plan.md`.

Bench pendamping yang jujur adalah **parse-and-iterate**: blob yang sama, tetapi setiap iterasi menjumlahkan `nested.x` setiap record, yang memaksa lazy tape untuk memterialisasi. Di sana Perry mendarat di **466 ms** — lebih lambat dari escape hatch mark-sweep yang 375 ms karena tape membayar overhead yang tidak dapat diamortisasi. Baris itu ada di TL;DR §B. Ketika Anda tidak dapat menghindari pekerjaan, lazy tape tidak berpura-pura.

## 4\. Halaman benchmark, ditulis ulang

Tiga hal berubah tentang bagaimana Perry menyajikan angka performa.

**RUNS=11 median + p95 + σ + min + max, bukan best-of-N.** Best-of-N secara diam-diam menjatuhkan tail latency; pada hardware ini ia menyembunyikan outlier `accumulate` Python 9,4 detik dan spike p95 JSON Swift 5,3 detik. Median mengembalikan tail ke halaman. Perubahan metodologi mendarat di v0.5.248; setiap sel di TL;DR §A dan §B adalah RUNS=11 segar per **2026-04-25**.

**Optimization probe dipisahkan dari performa runtime nyata.** Lima sel yang menunjukkan Perry pada 12–34 ms vs Rust/C++ pada 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — mengukur postur flag compiler, bukan silikon. Sekarang mereka ada di subsection sendiri, dengan paragraf di atas yang menjelaskan bahwa `clang++ -O3 -ffast-math` menutupnya hingga dalam satu milidetik. Kernel real-runtime utama adalah `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry duduk persis di kelompok no-FMA-contract pada kernel di mana compiler sungguh-sungguh tidak dapat melipat pekerjaan tersebut. Itulah perbandingan yang jujur.

**Pembanding ditambahkan.** simdjson (4.3.0) sekarang ada di kedua tabel JSON — ceiling parse-throughput C++, ada di halaman agar pembaca dapat melihat celahnya. AssemblyScript dengan json-as (1.3.2) adalah pembanding TS-to-native yang dapat di-install yang paling dekat; porffor segfault pada beban kerja sebesar ini, Static Hermes tidak mau diinstal di macOS arm64. Kotlin dengan kotlinx.serialization bergabung dengan JSON polyglot di v0.5.241–v0.5.242. Setiap baris nyata, setiap disclaimer ada di halaman.

## 5\. Tabel compute polyglot

Kernel utama yang sungguh tidak dapat dilipat, RUNS=11 median, di-refresh 2026-04-25 di v0.5.249:

| Tolok ukur| Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci| 318 | 330 | 315 | 282 | 1022 | 589 |
| loop_data_dependen| 235 | 229 | 129 | 229 | 322 | 232 |
| objek_buat| 1 | 0 | 0 | 5 | 11 | 6 |
| loop_sarang| 18 | 8 | 8 | 11 | 18 | 21 |

Pada `fibonacci`, Perry menyamai kelompok compiled dalam selisih 3–15 ms. JIT HotSpot Java ~11% lebih cepat karena meng-inline panggilan rekursif. Pada `loop_data_dependent`, kernel terbagi menjadi dua kluster FP-contract: kelompok FMA-contract pada ~128 ms (default Go, `g++ -O3` pada Apple Clang — keduanya menggabungkan `sum * a + b` menjadi satu FMADDD) dan kelompok no-contract pada 229–235 ms (Perry, default Rust, Swift, Java tanpa `-XX:+UseFMA`, Bun) yang menjalankan FMUL + FADD scalar. LLVM cocok dengan kelompok FMA dengan `-ffp-contract=fast`; Perry tidak mengaktifkannya secara default. `nested_loops` adalah cache-bound, bukan compute-bound; semua mendarat di 8–21 ms.

## 6\. Toolchain Windows, ringan

Pengguna Windows tidak lagi memerlukan instalasi Visual Studio. **v0.5.199** menutup [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin menggantikan seluruh tree VS BuildTools. `v0.5.201` menjatuhkan cfg gate pada `find_lld_link` / `find_perry_windows_sdk` sehingga path discovery berfungsi pada setiap platform yang menargetkan Windows, bukan hanya host macOS.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Pass kebenaran runtime

Tema periode ini: divergensi runtime diam-diam dari V8/JSC berubah menjadi perbaikan atau error kompilasi. Yang non-trivial:

-   **v0.5.255**: `BigInt.fromTwos`/`toTwos` dua pelengkap.
-   **v0.5.263**: diskriminasi tipe non-promise `Promise.all`/`race`/`any`.
-   **v0.5.281**: `NaN==NaN` + format angka ECMAScript (`3 → "3"`, bukan `"3.0"`; `-0 → "0"`; dll.).
-   **v0.5.280**: koersi ToInt32 `NaN`/`Infinity` di `(x) | 0`.
-   **v0.5.284**: FIFO microtask Promise + propagasi thrown-handler.
-   **v0.5.286**: `JSON.stringify` dari f64 polos segfault di bawah jalur tape.
-   **v0.5.277**: `fs.readFileSync` mengembalikan Buffer ketika tidak ada encoding yang dilewatkan (cocok dengan Node).
-   **v0.5.272**: dispatch getter cross-module berantai mengembalikan `undefined`.

Tindak lanjut stdlib untuk issue [#187](https://github.com/PerryTS/perry/issues/187) diisi: AsyncLocalStorage end-to-end (v0.5.261), runtime commander + codegen yang benar-benar memanggil `.action()` (v0.5.250), kode decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pola async-factory pg + mongo (v0.5.275), dan bug async-factory yang sama pada EE/LRU/WSS (v0.5.252).

Di sisi `perry/ui`: callback notification tap (#97) terhubung di Apple (v0.5.254) dan Android (v0.5.258); schedule + cancel notifikasi lokal (#96, v0.5.244); register + receive FCM di Android (v0.5.262).

## 8\. Penutup

Pola periode ini bukanlah angka headline. Ini tentang pekerjaan yang membuat kemenangan yang sudah ada bertahan dari pemeriksaan: GC generasional yang menangkap beban kerja sustained-allocation, SSO yang menutup celah biaya string pendek, pipeline JSON yang mengeksploitasi struktur “tanpa modifikasi” dari beban kerja paling umum, dan halaman benchmark yang mengukur median alih-alih best-of-N dan menampilkan ceiling parse simdjson 24 ms pada baris yang sama dengan 75 ms Perry. Pembaca dapat melihat celahnya — dan di mana Perry duduk relatif terhadap floor.

Cobalah:

```
# npm (platform apa pun)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — tanpa instalasi VS)
winget install PerryTS.Perry

# Suite benchmark default
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Kode sumber: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmark: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
