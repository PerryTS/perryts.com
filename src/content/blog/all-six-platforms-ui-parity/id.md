---
title: "Enam Platform Sekaligus, Paritas Fitur Penuh"
excerpt: "20+ widget UI native, widget Canvas, Table view, notifikasi sistem, akses keychain, dukungan multi-window, dan paritas fitur penuh di macOS, iOS, iPadOS, Android, Linux, dan Windows — semuanya dari satu kode sumber TypeScript."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Ketika kami meluncurkan versi pertama sistem UI native Perry, "lintas platform" berarti macOS berfungsi baik dan lima platform lainnya hanyalah stub. Hari ini, dengan v0.2.162, itu tidak lagi benar. Keenam platform — macOS, iOS, iPadOS, Android, Linux, dan Windows — sekarang berbagi paritas fitur penuh. Kode TypeScript yang sama dikompilasi menjadi widget native di setiap target.

Postingan ini membahas apa yang kami kirimkan antara v0.2.152 dan v0.2.164: widget Canvas, implementasi NSTableView lengkap, total 20+ widget UI, modul `perry/system`, dukungan multi-jendela, notifikasi sistem, akses gantungan kunci, biner otomatis pengurangan ukuran, dan sistem plugin waktu kompilasi. Banyak yang terjadi.

## Sprint Widget: 20+ Komponen UI Native

Lompatan terbesar terjadi pada v0.2.155, yang menghasilkan 20+ widget UI di semua platform. UI TypeScript API Perry kini mencakup komponen yang sebenarnya Anda perlukan untuk merilis aplikasi sebenarnya:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Input** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Tampilan** — Text, Label, Gambar, ProgressView, Divider, Spacer
-   **Data** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Gambar** — Canvas (gambar 2D API, diakselerasi perangkat keras per platform)

Ini bukan pembungkus perender khusus. Setiap widget dikompilasi ke komponen asli platform: `NSButton` di macOS, `UIButton` di iOS, `GtkButton` di Linux, `android.widget.Button` di Android melalui JNI, dan `CreateWindowEx` di Windows. OS menggambarnya, menentukan temanya, dan menangani aksesibilitas — Perry baru saja menyambungkan TypeScript API.

## Canvas: Menggambar 2D dari TypeScript

Salah satu tambahan yang lebih menarik secara teknis adalah widget Canvas (v0.2.152). Ini memperlihatkan API gambar 2D yang familiar langsung dari TypeScript — kurva, isian, guratan, blitting gambar yang lebih bezier — dan dikompilasi ke backend 2D platform yang dipercepat: Grafik Inti di macOS/iOS, Kairo di Linux, Direct2D di Windows, dan Skia di Android.

**kanvas.ts**

```typescript
import { Canvas, Color } from 'perry/ui';
// Compiles to Core Graphics on macOS, Cairo on Linux, etc.
const canvas = new Canvas({ width: 400, height: 300 });
canvas.onDraw((ctx) => {
  ctx.fillStyle = Color.amber;
  ctx.fillRect(10, 10, 100, 60);
  ctx.strokeStyle = Color.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(200, 150, 80, 0, Math.PI * 2);
  ctx.stroke();
});
```

## Widget Table: NSTableView Hadir di TypeScript

v0.2.163 menampilkan widget Table — komponen paling kompleks di perpustakaan. Di macOS ia dipetakan ke `NSTableView` dengan kabel delegasi/sumber data penuh. Di Linux menggunakan `GtkTreeView` GTK4. Di Windows, kontrol `ListView` Win32. Di Android, ini terikat ke `RecyclerView` melalui JNI.

TypeScript API bersifat deklaratif: Anda menentukan kolom, menyediakan sumber data, dan Perry menangani pengkabelan khusus platform pada waktu kompilasi. Penyortiran kolom, penanganan pemilihan, dan penyesuaian tinggi baris semuanya dapat dilakukan dengan mudah.

**table.ts**

```typescript
import { Table, Column } from 'perry/ui';
const table = new Table({
  columns: [
    new Column({ title: "Name", key: "name", width: 200 }),
    new Column({ title: "Size", key: "size", width: 80 }),
  ],
  rows: files,  // TypeScript array of objects
  onSelect: (row) => console.log(row.name),
});
```

## Modul perry/system

v0.2.155 juga memperkenalkan `perry/system` — modul TypeScript yang mengekspos API sistem platform tanpa runtime apa pun: dialog file, dialog penyimpanan, peringatan, sheet, akses rantai kunci, notifikasi sistem, dan pengelolaan multi-jendela.

-   `system.showOpenDialog()` — pemilih file asli (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — dialog penyimpanan asli
-   `system.showAlert()` — panel peringatan asli
-   `system.notify()` — pemberitahuan OS (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Layanan Rantai Kunci / Layanan Rahasia / Penyimpanan Kredensial Windows
-   `system.openWindow()` — pengelolaan multi-jendela

Semua ini memanggil API platform asli secara langsung — tanpa IPC Electron, tanpa jembatan tampilan web. Perry mengompilasi situs panggilan TypeScript ke panggilan fungsi asli langsung ke SDK platform.

## Paritas Fitur Enam Platform: v0.2.162

Pencapaian v0.2.162 adalah tentang menutup kesenjangan. Sebelum rilis ini, macOS memiliki rangkaian fitur terlengkap, iOS sebagian besar sudah tersedia, dan Linux/Windows/Android tertinggal. v0.2.162 membawa keenam platform ke level yang sama:

-   **macOS** — AppKit, set widget lengkap, Gantungan Kunci, notifikasi, multi-jendela, toolbar
-   **iOS / iPadOS** — UIKit, paritas widget lengkap dengan macOS, siklus hidup adegan
-   **Android** — JNI bridge, semua widget melalui Android Views, kompilasi silang NDK
-   **Linux** — GTK4, kumpulan widget lengkap termasuk Table, dialog file, gantungan kunci libsecret
-   **Windows** — Win32, semua widget, Windows Credential Store, notifikasi WinRT

Ini adalah pencapaian yang menjadikan "satu basis kode, enam platform" menjadi nyata, bukan aspirasional. File TypeScript yang sama dikompilasi ke aplikasi asli pada keenam target tanpa memerlukan jalur kode khusus platform untuk kasus penggunaan umum.

## Pengurangan Ukuran Binary Otomatis

v0.2.153 mengirimkan pengurangan ukuran biner otomatis — kompiler sekarang secara agresif menghilangkan jalur kode yang tidak digunakan, menghilangkan fungsi stdlib yang tidak dapat dijangkau, dan menghapus duplikat definisi simbol selama penautan. Alat CLI biasa yang sebelumnya dikompilasi hingga ~4 MB kini berukuran kurang dari 2 MB tanpa perubahan apa pun pada sumber Anda.

Ini penting untuk penerapan nyata. Ketika biner Anda adalah unit penerapan — disalin ke server, didistribusikan sebagai satu file, tertanam dalam wadah — ukuran secara langsung memengaruhi waktu transfer dan biaya penyimpanan. Mengurangi separuh ukuran biner secara gratis merupakan peningkatan yang berarti.

## Sistem Plugin Waktu Kompilasi

v0.2.152 memperkenalkan sistem plugin Perry — dan secara arsitekturalnya berbeda dengan sistem plugin lainnya di ekosistem TypeScript. Tidak ada pemuatan plugin runtime, tidak ada IPC, tidak ada `require()` dinamis. Plugin adalah modul TypeScript yang Perry diselesaikan dan dikompilasi pada waktu pembuatan.

Hasilnya: plugin tidak memiliki overhead runtime sama sekali. Mereka dikompilasi ke dalam biner yang sama dengan kode aplikasi Anda, dengan pemanggilan fungsi langsung antara kode plugin dan kode host. Jika Anda tidak menggunakan plugin, plugin tersebut tidak akan muncul di biner Anda sama sekali. Jika Anda menggunakannya, modul ini akan disisipkan seperti modul lainnya.

Kami menulis tentang filosofi di balik hal ini di [Sistem Plugin Adalah Pajak Kinerja](/id/blog/plugin-systems-are-a-performance-tax/). Versi singkatnya: arsitektur plugin runtime memperdagangkan kinerja untuk ekstensibilitas. Komposisi waktu pembuatan memberi Anda keduanya.

## Peningkatan Bahasa

Sprint UI tidak terjadi secara terpisah — kompilernya sendiri semakin mampu. Di seluruh rilis berikut:

-   **Ekspresi kelas** — `const Foo = class extends Bar {}` sekarang dikompilasi dengan benar
-   **Transformasi generator** — kompilasi `function*` dan `yield` ke mesin status asli
-   **Petakan/Tetapkan sebagai kolom kelas** — `private items = new Map()` berfungsi di codegen
-   **FFI pemaksaan tipe param** — panggilan perpustakaan asli menangani pemaksaan tipe secara otomatis
-   **Referensi metode terikat** — Referensi `this.method` berfungsi untuk modul asli (fs, os, path)
-   `string.match()` — kini didukung sepenuhnya
-   `path.isAbsolute()`, multi-arg `path.join()`, `path.resolve()`
-   **Target web** — Perry kini dapat mengompilasi ke keluaran yang kompatibel dengan web untuk penerapan hibrid

## Apa Selanjutnya

Dengan hadirnya paritas UI enam platform, fase selanjutnya adalah pendalaman dan keluasan. Kami sedang mengerjakan:

-   Dukungan RegExp penuh (`regex.test()`, `string.matchAll()`)
-   Seret dan lepas, menu konteks khusus, dan label aksesibilitas di sistem widget
-   Ekstensi VS Code untuk diagnostik Perry dan kompilasi-saat disimpan
-   Integrasi pengelola paket — instal dan kompilasi paket asli Perry dengan satu perintah
-   Target kompilasi WASM untuk penerapan browser
-   Multi-threading melalui thread `Worker`

Jika Anda ingin mengikuti, [Perry repo](https://github.com/PerryTS/perry) terbuka. Lihat [showcase](/id/showcase/) untuk melihat apa yang sedang dibangun, atau jelajahi [roadmap](/id/roadmap/) untuk gambaran lengkap.
