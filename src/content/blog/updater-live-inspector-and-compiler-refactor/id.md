---
title: "Auto-Update, Inspector Live, dan Compiler yang Memotong Dirinya Sendiri"
excerpt: "Perry v0.5.306 → v0.5.359 dalam empat hari — 53 patch release, ~30 issue ditutup, dan tiga hal besar mendarat: perry/updater untuk auto-update desktop, inspector live di localhost:7676, dan refactor compiler yang menyusutkan empat file terbesar sebesar 33–91%."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
Postingan terakhir berakhir di **v0.5.306** dengan kisah gen-GC + JSON + benchmark. Empat hari kemudian, Perry sudah di **v0.5.359** — yaitu **53 patch release** — dan ceritanya berbeda lagi. Tidak ada satu pun release itu yang menjadi headline angka benchmark. Hampir semuanya adalah **issue dari tracker yang ditutup**.

-   **`perry/updater`** hadir — auto-update bergaya Sparkle/Tauri untuk aplikasi desktop (Ed25519 atas digest SHA-256, sentinel-rollback, relaunch terdetach). PR komunitas dari **TheHypnoo** ([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand Fase D** — inspector live di `http://localhost:7676` dengan pohon widget, detail per widget, dispatch klik, dan editing style live via `POST /style/:h`.
-   **Refactor compiler.** Sepanjang v0.5.329 → v0.5.343 empat file paling banyak disinggung dipotong: `lower::lower_expr` 6.687 → 624 LOC (−91%), `compile.rs` 9.391 → 3.783 LOC (−60%), `lower.rs` 13.591 → 7.554 LOC (−44%), `lower_call.rs` 7.000+ → 4.681 LOC (−33%). `walker.rs` baru mengubah kelas bug catch-all `_ =>` jadi error compile.
-   **UI styling Fase C tutup** — props inline `style: { ... }` di setiap widget di Apple, Android, GTK4, Windows, dan Web. Windows mendapat 4 dari 5 stub tersambung (decoration / opacity / borders); tinggal `widget.shadow` (follow-up DirectComposition).
-   **Bucket Scoop** untuk Windows: `scoop install perry-ts/perry`. Sidecar SHA-256 di workflow release.
-   **Gelombang fix issue komunitas** — sekitar 30 issue ditutup di runtime, codegen, fetch, GTK4, linker Windows, async, dan stdlib.

## 1\. perry/updater — auto-update untuk aplikasi desktop

Sebelum fix, Perry tidak punya jalur update. Aplikasi rilis, rilis lagi, dan sudah. **TheHypnoo** membuka [#224](https://github.com/PerryTS/perry/pull/224) dengan ceritanya lengkap:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback jika launch sebelumnya crash

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // panggil setelah build baru sukses jalan
```

Model trust: **Ed25519 atas digest SHA-256 file** (bukan atas byte file — verifikasi tetap murah pada binary besar). Manifest berbentuk JSON, ber-versi schema, satu entri per triple `<os>-<arch>`. Instalasi atomik dengan backup `<exe>.prev`, relaunch terdetach (`setsid` di Unix, `DETACHED_PROCESS` di Windows). Mobile dikecualikan secara desain — App Store / Play Store memiliki pipeline instalasi di level OS.

Dua keanehan runtime Perry mencuat saat menulis smoke test, dan diperbaiki sekalian:

-   **`response.arrayBuffer()` mengembalikan stub metadata saja.** Diperbaiki di [#232](https://github.com/PerryTS/perry/pull/232) (juga TheHypnoo) — `js_response_array_buffer` kini meng-allocate `BufferHeader` asli dan `memcpy` `resp.body` ke dalamnya.
-   **`fs.appendFileSync` menulis 0 byte.** Diperbaiki di [#226](https://github.com/PerryTS/perry/issues/226) — jalur lowering namespace-import (`import * as fs from "fs"`) tidak punya cabang untuk `appendFileSync`, dan codegen LLVM juga tidak punya cabang untuk varian HIR-nya. Keduanya kini tersambung.

Dokumentasi ada di `docs/src/updater/overview.md`.

## 2\. Geisterhand: inspector live di localhost:7676

Geisterhand selama ini adalah harness uji UI in-process Perry — HTTP API di port 7676 untuk snapshot state widget dan dispatch klik. Fase D mengubahnya menjadi inspector ala devtools yang bisa dibuka dari browser apa pun.

-   **Langkah 1 (v0.5.349)** — `GET /` menyajikan UI vanilla-JS satu halaman dengan pohon widget, detail per widget (frame, value, raw JSON), auto-refresh 1,5 detik dengan pause/resume, dan tombol «trigger onClick». Codegen mem-pin `INSPECTOR_HTML` terhadap lazy-load `-dead_strip` macOS supaya selamat di release build.
-   **Langkah 2 (v0.5.350)** — `POST /style/:h` menerima sekantong props JSON dan menerapkannya live. 9 props (`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`) mengalir dari thread HTTP → thread utama via pump-queue yang sudah ada. JSON salah → 400; handle salah → 400; props tak dikenal disaring di server dan response mendaftar mana yang lolos.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

Dispatcher macOS sudah tersambung; Linux / Windows / iOS / tvOS / visionOS / Android mengikuti bentuk yang sama dan jadi yang berikut.

## 3\. Refactor compiler — memotong empat file terbesar

Lima issue di tracker ([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), plus ekor panjang) berbentuk sama: varian `Expr` baru ditambahkan ke `ir.rs`, tetapi salah satu dari empat walker ad-hoc di `lower.rs` punya catch-all `_ =>` dan diam-diam salah meng-compile varian baru itu. Menangkap ini di runtime mahal — kadang tak terlihat, kadang SIGSEGV di bawah SSO.

**v0.5.329** memperkenalkan `crates/perry-hir/src/walker.rs` dengan `walk_expr_children` / `walk_expr_children_mut` — match exhaustive atas seluruh 178 varian `Expr`, **tanpa catch-all**. Menambah varian baru tanpa mendaftarkannya di sini sekarang adalah error compile. Empat consumer (`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`) jadi ringkas:

| Fungsi | Sebelum | Sesudah | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

Total: **−1.830 baris descent yang duplikatif**, digantikan **+1.840 baris satu walker tersentralisasi** — netto datar, tetapi kelas bug-nya hilang.

Itu membuka jalan untuk sisanya. **v0.5.331 → v0.5.343** memotong empat monolit dalam 14 commit. Angka headline-nya:

| File | Sebelum | Sesudah | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6.687 | 624 | −91% |
| `compile.rs` | 9.391 | 3.783 | −60% |
| `lower.rs` | 13.591 | 7.554 | −44% |
| `lower_call.rs` | 7.000+ | 4.681 | −33% |

Pemecahannya mendarat sebagai 19 sub-modul terfokus: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, ditambah crate baru `crates/perry-dispatch` yang menjadi sumber tunggal kebenaran untuk tabel metode UI / system / i18n (fan-out `_ => "perry_ui_unknown"` yang dulu memicu kejutan «compile di macOS, jebol di web» pada issue [#191](https://github.com/PerryTS/perry/issues/191) sekarang cuma satu lookup).

**Win perf Tier 4** ikut serta (v0.5.335–v0.5.336):

-   Menggabung dua pass di `inline_functions` dan tiga pass rayon di `compile.rs` — menghemat 5 scan modul + 3 round-trip scheduler per compile.
-   Membatasi parse cache `perry dev` di 500 entri, eviction FIFO. Sebelum fix, sesi yang menyusuri `node_modules` bisa menahan 100+ MB AST SWC.
-   Memparalelkan loop tulis `.ll` pasca-codegen — wall-time 2–4× lebih cepat di SSD dengan 50+ modul.
-   `Arc<I18nTable>` alih-alih meng-clone tabel locale per worker.

Tes workspace tetap di **434 passed / 0 failed / 5 ignored** di tiap commit; gap test di baseline 25/28; doc-test di baseline 80/82.

## 4\. UI styling Fase C, selesai

Fase C adalah rollout `style: { ... }` inline. Langkah 1–7 ditutup di jendela ini:

-   **v0.5.305 → v0.5.306** — surface tipe `StyleProps` + `style:` inline di Button.
-   **v0.5.307 → v0.5.309** — destructure inline color/padding/shadow di setiap widget tabel, lalu VStack / HStack.
-   **v0.5.310 → v0.5.311** — string hex + gradien + `parseColor` runtime untuk nilai dinamis.
-   **v0.5.312** — dokumentasi styling + issue tracking Windows.

Lalu sapuan lintas-platform:

-   **GTK4** ([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 4 FFI styling tersambung, plus 7 FFI hilang yang menutup gerbang doc-test Linux (v0.5.322).
-   **macOS** (v0.5.324) — pipa shadow `CALayer` untuk `widget.shadow` + infrastruktur visual\_test; class-probe `set_color` untuk widget non-`NSTextField`.
-   **iOS / tvOS / visionOS** (v0.5.346) — Button dengan `color: ...` sebelumnya memanggil `setTextColor:` di `UIButton`, yang tidak mengimplementasi selektor itu; panic `objc2` melintasi batas `extern "C"` dan proses abort. Diperbaiki dengan pola class-probe yang sama seperti macOS — UIButton sekarang melalui `setTitleColor:forState:UIControlStateNormal`.
-   **Windows** (v0.5.347) — 4 dari 5 stub styling tersambung (`text.decoration` via round-trip `LOGFONT`, `widget.opacity` via `WS_EX_LAYERED` + `SetLayeredWindowAttributes`, borders via `SetWindowSubclass` + `WM_PAINT`). Hanya `widget.shadow` yang tersisa (perlu DirectComposition).

Matriks styling di `docs/src/ui/styling-matrix.md` menutup jendela dengan **Web di 43/43 Wired**, **Windows di 42/43 Wired**, sisanya cakupan penuh.

## 5\. Pass kebenaran runtime — issue demi issue

Tema periode ini: setiap miscompile yang masuk via tracker berakhir sebagai fix atau error compile-time. Sorotannya:

-   **[#212](https://github.com/PerryTS/perry/issues/212) (v0.5.323)** — metode kelas di dalam `fn` tidak bisa menangkap local fn pembungkusnya. Repro multi-modul kini cocok byte-per-byte dengan Node.
-   **[#214](https://github.com/PerryTS/perry/issues/214) (v0.5.321 + v0.5.330)** — unbox string-handle yang aman SSO di 7 site operand string: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, input digest crypto. Sebelum fix, masing-masing diam-diam mengembalikan sampah atau SIGSEGV pada operand string inline.
-   **[#221](https://github.com/PerryTS/perry/issues/221) (v0.5.351)** — array `const` kosong di level modul kehilangan tulisan `arr[i]=` dari dalam fungsi. Muncul saat `discoverLevels()` Bloom-Engine/jump mengisi `LEVEL_FILES` di level modul lewat index-assign dan layar pemilihan level keluar kosong.
-   **[#233](https://github.com/PerryTS/perry/issues/233) (v0.5.357)** — `Array.push` dari dalam fungsi async diam-diam terbatas di 16 elemen ketika array masuk sebagai parameter. Fungsi async tidak diinline; realokasi mengembalikan pointer baru yang tidak dilihat caller. Fix: pasang pointer forwarding di posisi lama setiap kali tumbuh, memakai mekanisme `GC_FLAG_FORWARDED` yang sudah ada di GC.
-   **[#235](https://github.com/PerryTS/perry/issues/235) (v0.5.358)** — dispatch parameter default metode mengoper sampah ketika caller melewatkan arg di belakang. Dua bagian penyumbang: declare metode cross-module hardcode 6 double, bukan `arity + 1`, dan `lower_class_method` sama sekali tidak memanggil `build_default_param_stmts`. Muncul di `findOne(filter, options = {})` mongodb yang hang diam-diam; fix-nya seragam di dispatch lokal dan cross-module.
-   **[#236](https://github.com/PerryTS/perry/issues/236) (v0.5.355)** — tiga bug independen fetch + promise dari satu repro: api.github.com merespons 403 anonim (User-Agent default kini diset), `.then(console.log)` hang selamanya (callback null tidak mendorong entri ke TASK\_QUEUE), setiap rejection fetch mencetak `Uncaught exception: [object Object]` (NaN-box `*StringHeader` telanjang alih-alih `ErrorHeader` sungguhan).
-   **[#234](https://github.com/PerryTS/perry/issues/234) (v0.5.359)** — `Blob` sungguhan dengan metode instance `arrayBuffer` / `text` / `bytes` / `slice`. Sebelum fix, `await response.blob()` mengembalikan stub metadata `{size, type}`. Fix tiga bagian mendarat di runtime + HIR + codegen.

Plus penyusulan kecil:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup kelebihan memangkas monomorfisasi generik di Linux + silent-fallback link GTK4. Fix: ganti penyaringan pola nama dengan perbandingan **himpunan simbol** via `llvm-nm`. Anggota dengan satu saja simbol unik tetap dipertahankan. `libperry_ui_macos.a` dipangkas 196 → 35 objek tanpa error link.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — `secur32.lib` ditambahkan ke baris link Windows.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` round-trip FP via Ryū.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — codegen dispatch tersambung untuk wrapper format `perry/i18n`.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — codegen dispatch `perry/plugin`.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — widget Canvas via codegen LLVM.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView via codegen.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — widget Table via codegen.
-   **[#193](https://github.com/PerryTS/perry/issues/193)** (parsial) — 11 cabang dispatch helper stdlib.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — penerimaan notifikasi di background di iOS + Android (warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — fallback lemah untuk hook FFI game-loop di watchOS.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — hook dispose `using` / `await using`.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — alloca arg `js_native_call_method` dihoist ke blok entry.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — cabang Uint8Array di `substitute_locals`.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` tersambung end-to-end (PR komunitas).

## 6. Windows + Scoop

Cerita toolchain Windows terus jadi lebih sederhana. **v0.5.353** memaku `clang -target` di build host — clang non-MSVC di PATH (MinGW / MSYS2 / Anaconda / bundle GNU Rust) diam-diam menulis ulang IR `x86_64-pc-windows-msvc` Perry menjadi `windows-gnu`, dan lld-link tidak bisa menyelesaikan referensi `__main` yang disisipkan emitter mingw32 LLVM. `probe_clang_default_triple` baru menjalankan `clang --version` sekali per proses dan mencetak satu baris catatan informatif jika default host adalah GNU sementara kita menarget MSVC. Suppress dengan `PERRY_NO_CLANG_PROBE=1`.

**v0.5.345** menyelaraskan ABI `perry-ui` Win64 dengan `perry-dispatch` — tiga signature extern runtime sudah melenceng (`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Pada ABI Win64, arg posisional integer dan float berbagi indeks slot, jadi mismatch akan membaca sampah dari register tak terinisialisasi. SysV (macOS / Linux) memakai pool register int/float terpisah dan kebetulan bit valid-nya jatuh tepat — crash khusus Windows, diperbaiki di seluruh 8 crate platform perry-ui-\*.

Lalu: **`scoop install perry-ts/perry`**. Manifest dipaku di v0.5.345 (dengan `depends: main/llvm` untuk otomatis menarik LLVM resmi default-MSVC). Workflow release sekarang menerbitkan sidecar `<artifact>.sha256` di sebelah setiap arsip, dengan format kompatibel `sha256sum` untuk bumper package manager downstream apa pun.

```
# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. Penutup

Pola periode ini adalah keterlibatan komunitas plus higiene internal. **TheHypnoo** mengirimkan tiga PR signifikan ([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) menyambung `fs.appendFileSync`, [#232](https://github.com/PerryTS/perry/pull/232) byte body `response.arrayBuffer`). Tracker terkuras sekitar 30 issue. Compiler menyusut 60% pada file terbesarnya dan menumbuhkan walker exhaustive yang mengubah «lupa memperbarui salah satu dari empat walker ad-hoc» dari miscompile runtime menjadi error `cargo build`. UI styling mencapai paritas di setiap platform desktop kecuali bayangan di Windows. Geisterhand memperoleh permukaan devtools berbasis browser. Jalur instalasi Windows berkurang satu perintah.

Coba:

```
# npm (platform mana pun)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update aplikasi desktop
npm install @perry/updater

# Inspector live
perry compile main.ts -o app --enable-geisterhand
./app &  # lalu buka http://localhost:7676
```

Sumber: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Masalah: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
