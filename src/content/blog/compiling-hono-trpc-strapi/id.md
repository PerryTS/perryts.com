---
title: "Mengompilasi Hono, tRPC, dan Strapi ke Binary Native"
excerpt: "Perry kini mengompilasi tiga framework TypeScript utama — Hono, tRPC, dan Strapi — menjadi executable ARM64 native. Dikompilasi dalam waktu kurang dari satu detik, menghasilkan binary di bawah 2 MB, dan berjalan tanpa crash."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry sekarang mengkompilasi tiga framework TypeScript utama — Hono, tRPC, dan Strapi — menjadi executable ARM64 native. Mereka dikompilasi dalam waktu kurang dari satu detik, menghasilkan binary di bawah 2 MB, dan berjalan tanpa crash.

Artikel ini membahas apa yang berhasil, apa yang belum, dan apa yang kami pelajari saat mendorong compiler menghadapi kode dunia nyata.

## Proyek-proyek

Kami memilih ketiganya karena mewakili bentuk TypeScript yang berbeda:

-   **Hono** — Framework web ringan (29 modul). Penggunaan berat generics, inheritance class, dynamic method assignment, dan Web API `Request`/`Response`. Struktur export menggunakan named re-export melalui barrel file.
-   **tRPC** — Framework RPC type-safe (52 modul). Chain re-export dalam 4+ level, builder pattern dengan generic type narrowing, instansiasi class di scope modul, dan streaming via Web Streams.
-   **Strapi** — Core headless CMS (4 modul dikompilasi native, sisanya diselesaikan sebagai external). Monorepo dengan resolusi workspace package, namespace re-export (`export * as X`), service container pattern dengan `Map`, dan factory function.

## Hasil Kompilasi

Ketiganya dikompilasi ke binary native dengan nol error kompilasi:

| Proyek | Modul Dikompilasi | Ukuran Binary | Waktu Kompilasi |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Setiap modul sumber melewati pipeline lengkap: SWC parse, HIR lowering, Cranelift codegen, object file emission, dan native linking. Waktu kompilasi mencakup semuanya — dari parsing hingga link akhir.

Sebagai konteks, `tsc --noEmit` pada tRPC saja memakan beberapa detik. Perry mengkompilasi 52 modul ke binary native yang ter-link dalam kurang dari satu detik.

## Apa yang Berhasil di Runtime

### Instansiasi Class Lintas Modul

Ini adalah milestone besar. Perry sekarang melacak `Export::Named`kembali melalui import modul untuk menemukan definisi class asli dan menyebarkannya. Hasilnya: constructor Hono berjalan, menginisialisasi `SmartRouter`, dan mengembalikan objek nyata.

### Resolusi Re-Export Multi-Level

`initTRPC` milik tRPC berada 4 level dalam: rantai`ExportAll` → `Named` → `ExportAll`. Perry menyelesaikan seluruh rantai.

### Resolusi Package dalam Monorepo

Strapi menggunakan workspace package. Perry menyelesaikan bare specifier melalui field exports di `package.json`.

## Apa yang Belum Berhasil

### Dynamic Property Assignment pada `this`

Constructor Hono menyiapkan handler method HTTP secara dinamis. Perry belum mendukung`this[variable] = value`, jadi method ini hilang. Ini adalah gap terbesar untuk Hono.

### Panggilan Constructor Level Modul

`export const initTRPC = new TRPCBuilder()` tidak mengeksekusi constructor saat runtime, menghasilkan referensi class alih-alih instance.

### Properti yang Diwarisi

`err.code` berfungsi tapi `err.message`(diwarisi dari `Error`) tidak bisa diakses. Prototype chain belum sepenuhnya diimplementasikan.

## Apa Artinya Ini

Kabar baiknya: pipeline kompilasi Perry menangani kode framework nyata. Proyek multi-file dengan chain re-export kompleks, type signature berat generics, hierarki class, dan resolusi package monorepo semuanya berhasil dikompilasi menjadi binary yang ter-link.

Gap-nya ada di runtime, bukan kompilasi. Pekerjaan yang tersisa:

1.  **Dynamic property assignment** — diperlukan untuk framework yang menyiapkan method secara programatik
2.  **Ekspresi init level modul** — `export const x = new Foo()` perlu benar-benar mengeksekusi constructor
3.  **Prototype chain** — properti dan method yang diwarisi
4.  **Built-in Web API** — `Response`, `Request`, `Headers` untuk framework HTTP

Ini adalah masalah konkret dengan scope yang jelas. Tidak ada yang memerlukan perubahan arsitektur — mereka adalah ekstensi dari pola yang sudah berfungsi untuk kasus yang lebih sederhana.

Kami akan terus mendorong ini. Tujuannya adalah `new Hono().get('/', (c) => c.text('hello'))` menghasilkan HTTP server yang berfungsi dalam binary native.
