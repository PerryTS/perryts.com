---
title: "Paket npm Nyata Kini Ter-compile: axios, zod, express — dan Sapuan Konformansi"
excerpt: "Sekitar 270 release dari v0.5.875 ke v0.5.1146 bukan tentang satu benchmark — melainkan tentang membuat paket npm nyata ter-compile dan berjalan. axios, zod v4, express, fastify, dan hono kini berfungsi; paritas test262 melonjak (String 60→79%, Array 61→72%); Windows menjadi Fluent dengan Mica; dan DatePicker + drag & drop mendarat di setiap platform."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
Posting terakhir berakhir di **v0.5.875** dengan kisah GC — menutup gap yang dibuka benchmark aya\_koto. Posting itu tentang memenangkan satu benchmark. Yang ini tentang jenis pekerjaan berbeda: sekitar **270 release antara v0.5.875 dan v0.5.1146**, mendarat selama sekitar empat minggu, hampir tidak ada yang menjadi headline benchmark. Temanya bergeser dari “lari cepat di microbenchmark” menjadi **“membuat TypeScript dunia nyata dan paket npm nyata benar-benar ter-compile dan berjalan.”** Plus perombakan visual Windows penuh dan setumpuk widget baru sepanjang jalan.

Inilah yang dirilis, dikelompokkan menurut tujuan sebenarnya.

## Paket npm nyata kini ter-compile

Benang tunggal terbesar lewat jendela ini adalah sapuan untuk membuat paket npm populer ter-compile menjadi binary native dan lulus tes perilaku — bukan sekadar “link tanpa error,” tetapi berjalan dan menghasilkan output yang benar. Daftar yang kini berfungsi lewat `perry.compilePackages` mencakup **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, dan Colyseus**.

Masing-masing gagal karena alasannya sendiri, dan setiap fix adalah cerita kecilnya sendiri:

-   **zod v4** crash dengan `Cannot read properties of undefined (reading 'onattach')`. Akar masalah (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()` di mana `F` adalah fungsi yang diimpor dari modul lain diam-diam menghasilkan objek kosong — body konstruktor tidak pernah berjalan, sehingga setiap pemeriksaan bergaya `$ZodCheckMinLength` kembali tanpa properti `_zod`\-nya.
-   **axios + jose** membutuhkan crypto dan kompresi yang belum dimiliki Perry: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` untuk AES-GCM, dan `randomFillSync` (v0.5.972–976).
-   **fastify** deadlock pada timeout polling satu detik di `wait_for_promise`; kami menggantinya dengan condvar wait dan membuat promise yang ditolak muncul sebagai `HTTP 500` alih-alih menggantung (v0.5.912).
-   **@hono/node-server** tidak bisa membaca body POST — `c.req.text()` / `.json()` / `.formData()` mengembalikan kosong pada POST/PUT sampai fix parent-registration di v0.5.1142.
-   **chalk, ms, debug, express** semua menabrak bentuk yang sama: sebuah *nilai yang bisa dipanggil dengan properti terlampir* (`chalk.red`, `express()` plus `express.Router`). Tiga varian dari pola itu diperbaiki lintas v0.5.935 dan sapuan npm di sekitarnya, plus `util.inherits` + scaffold prototype stream untuk membuka jalan express (v0.5.990).
-   **dayjs**, dirilis sebagai bundle terminifikasi, melatih dispatch prototype-method JS-classic (`Class.prototype.m = fn`) yang di-lower Perry secara salah (v0.5.924/932).

Di bawah semua itu duduk bagian yang membuat paket yang Perry *tidak bisa* compile secara native tetap berjalan: **runtime fallback-V8** menjadi nyata di jendela ini. ModuleLoader-nya kini membaca dari module map ter-embed, sehingga binary fallback tetap **self-contained** — tanpa `node_modules` lepas saat runtime (v0.5.994). `createServer` menjembatani ke server hyper nyata (v0.5.999), dan global Web Fetch `Response` / `Request` / `Headers` ada di jalur fallback (v0.5.1006). Dan **dynamic `import()` compile-time** — `await import('./foo.ts')` string-literal diselesaikan saat build — akhirnya mendarat (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Sapuan konformansi test262

Benang dominan lainnya adalah konformansi. Kami menjalankan pass terfokus terhadap radar subset test262 dan menggerakkan jarum pada built-in yang paling diandalkan kode nyata:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

Lonjakan String datang dari memberi setiap metode `String.prototype` dispatch `this`\-generik dan memperbaiki koersi indeks `slice`/`substring`. Lonjakan Array adalah `thisArg` pada callback dense-array (`forEach`/`map`/`filter`/…), `ToLength` array-like, pengurutan operasi spec, dan validasi zero-argument. Destructuring mengambil parameter-destructuring lintas metode kelas plain, generator, async-generator, static, dan private.

Bersama angka headline, ekor panjang kebenaran mendarat: `JSON.parse` kini melempar `SyntaxError` nyata (bukan `TypeError`) dan menolak token di belakang; reviver-nya berjalan via algoritma spec `InternalizeJSONProperty`; `Object.prototype.toString` mem-brand dengan benar untuk typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; `RegExp.prototype.toString` mengembalikan `/source/flags`; async generator memperoleh semantik `yield`\-awaits-operand-nya dengan benar. Ini adalah radar subset, bukan suite penuh — Perry masih mendaki — tetapi pendakian bulan ini curam.

## Windows menjadi Fluent

Windows mendapat perombakan visual (seri [#4681](https://github.com/PerryTS/perry/issues/4681)). Window Perry kini ikut serta dalam chrome DWM modern secara default — **backdrop Mica**, sudut membulat, dan title bar yang sadar-tema — dan kontrol umum me-render lewat **comctl32 v6** alih-alih default era Windows 95. Window proc kini menangani `WM_DPICHANGED`, sehingga jendela tetap tajam saat kamu menyeretnya antar monitor dengan scaling campuran alih-alih ter-stretch bitmap.

Yang penting, tidak ada satu pun dari ini yang memperkenalkan kembali regresi lama [#1542](https://github.com/PerryTS/perry/issues/1542) “area hitam setelah resize”: area klien tetap dilukis opaque, dan blur-through Mica/Acrylic full-frame tetap opt-in eksplisit `app.setVibrancy(...)`. Ada juga scaffold backend `--target windows-winui` baru (WinUI 3) untuk aplikasi yang menginginkan stack sepenuhnya modern, dan fix kecil tetapi nyata yang membuat `perry compile main.ts -o main` menghasilkan `main.exe` di Windows sehingga PowerShell benar-benar meluncurkannya (v0.5.1146).

## Widget baru, setiap platform

Dua widget mendarat hanya di hari terakhir, dan keduanya merentang setiap platform UI yang ditarget Perry:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — kontrol tanggal bergaya field yang ringkas: `NSDatePicker` di macOS, `UIDatePicker` (.compact) di iOS/visionOS, `SysDateTimePick32` di Windows, `android.widget.DatePicker` di Android, GTK4 di Linux. Satu permukaan TS lintas semuanya.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — widget apa pun bisa menjadi tujuan drop dan sumber drag untuk teks/file/URL, dipetakan ke `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit), dan `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Lebih awal di jendela ini rak widget juga terisi lintas desktop dan mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, dan ImageGallery yang bisa di-swipe — masing-masing didukung kontrol native nyata di setiap platform. HarmonyOS (ArkTS) mendapat Chart dan TreeView (v0.5.893), dua widget terakhir yang ia butuhkan untuk mencapai paritas dengan yang lain.

## GC, internals, dan stabilitas

Sebagian besar dari 270 release itu bukan headline — itu bug fix dan internals, dan itulah inti fase ini. Beberapa yang layak disebut:

-   **GC berlanjut.** Kerja free-list kondisional dari posting GC terus mengendap, dan kelas bug tajam ditutup: Promise yang dijembatani native kini **di-pin selama in-flight di worker tokio** sehingga GC tidak bisa menyapunya sebelum resolusi mendarat (v0.5.923). Jika kamu menjalankan fetch async di bawah beban dan melihat collection hantu, itu adalah ini.
-   **Model memori didokumentasikan.** Kini ada deep-dive `internals/memory-model.md` — NaN-boxing, GC generasional, shadow stack, dan write barrier — tersambung ke situs dokumentasi (v0.5.933).
-   **Gelombang fix stabilitas codegen** yang dimunculkan sapuan npm: arrow `const` level-modul yang dipanggil di dalam langkah async yang diresume tidak lagi SIGSEGV (v0.5.953), `try { await rejected } catch { return X }` tidak lagi menggantung selamanya (v0.5.870), dan segelintir crash `js_is_truthy` / raw-pointer-range yang ditabrak bundle nyata.

## Beberes Apple

Lebih kecil tetapi nyata: `perry setup ios --development` kini menyediakan provisi untuk build development (v0.5.1023), dan jalur build/link cross-library Apple dideduplikasi dan dibuat pointer-width-portable (v0.5.1121/1125) — yang membuka matriks publish npm / Homebrew / APT / winget yang sempat tersangkut.

## Di mana ini meninggalkan segalanya

Taruhan di balik Perry selalu bahwa “TypeScript native” hanya berarti jika TypeScript *nyata* berjalan — bukan subset mainan, tetapi paket aktual yang orang `npm install`. Bulan ini sebagian besar pekerjaan itu: kurang satu angka untuk dibanggakan, lebih dorongan panjang tanpa glamor untuk menutup gap antara “ter-compile” dan “berfungsi.” Radar konformansi dan tes paritas npm adalah papan skor yang kami awasi sekarang, dan kami akan terus memposting angkanya — yang bagus dan yang masih belum sempurna.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
