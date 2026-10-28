---
title: "Membangun Pry: Penampil JSON Native dalam TypeScript"
excerpt: "Panduan membuat Pry, penampil JSON asli yang dikompilasi dari TypeScript ke kode mesin dengan runtime Perry dan GC tertaut dan tidak ada tampilan web."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry adalah viewer JSON native yang dibangun sepenuhnya dengan TypeScript dan dikompilasi dengan Perry. Ini bukan demo teknologi — ini adalah alat nyata yang kami gunakan sehari-hari untuk menginspeksi respons API, file konfigurasi, dan data dump. Artikel ini membahas cara pembuatannya, cara kompilasinya, dan bagaimana pengalaman pengembangan ketika TypeScript Anda dikompilasi menjadi aplikasi native.

## Apa yang Dilakukan Pry

Pry membaca file JSON (atau menerima JSON dari stdin) dan merendernya sebagai pohon interaktif yang dapat dinavigasi dalam jendela native. Jika Anda pernah menggunakan Quick Look bawaan macOS untuk JSON, bayangkan itu — tapi lebih cepat, bisa dicari, dan dengan navigasi keyboard.

Fitur-fiturnya:

-   **Tampilan pohon** — node yang bisa dilipat untuk objek dan array, dengan indikator kedalaman dan expand/collapse semua
-   **Pencarian** — pencarian teks penuh di key dan value dengan highlighting real-time dan navigasi hasil
-   **Keyboard shortcut** — tombol panah untuk navigasi, enter untuk expand/collapse, slash untuk mencari, `⌘C` untuk menyalin
-   **Clipboard** — salin node atau subtree apa pun sebagai JSON yang diformat
-   **Pewarnaan sintaks** — string hijau, angka oranye, boolean ungu, null merah
-   **Status bar** — menampilkan total node, kedalaman saat ini, ukuran file, dan waktu parsing

## Kode Sumber

Pry ditulis dalam TypeScript standar. Tidak ada sintaks khusus, tidak ada macro, tidak ada code generation saat build. Ia menggunakan UI API Perry, yang menyediakan widget native yang dikompilasi ke kode spesifik platform.

Berikut entry point-nya (disederhanakan untuk kejelasan):

**pry.ts**

```typescript
import { App, VStack, TreeView, SearchBar, StatusBar, State }
from "perry/ui";
import { readFile, readStdin } from "perry/fs";
// Read input from file arg or stdin
const input = process.argv[2]
? readFile(process.argv[2])
: readStdin();
const startTime = Date.now();
const data = JSON.parse(input);
const parseMs = Date.now() - startTime;
// Reactive state
const searchQuery = new State("");
const matchCount = new State(0);
// Build the app
const app = new App("Pry", {
width: 800,
height: 600,
minWidth: 400,
minHeight: 300,
});
app.body(() => {
return VStack({ spacing: 0 }, [
SearchBar({
placeholder: "Search keys and values...",
onSearch: (q) => searchQuery.value = q,
}),
TreeView(data, {
collapsible: true,
syntaxHighlight: true,
searchQuery: searchQuery,
onMatchCount: (n) => matchCount.value = n,
copyOnClick: true,
}),
StatusBar([
`${countNodes(data)} nodes`,
`Parsed in ${parseMs}ms`,
`${matchCount.value} matches`,
]),
]);
});
app.registerShortcut("/", () => app.focusSearchBar());
app.registerShortcut("Escape", () => {
searchQuery.value = "";
app.focusTree();
});
app.run();
```

Itulah inti dari aplikasi native. Tanpa boilerplate framework, tanpa konfigurasi build, tanpa file khusus platform. Satu file TypeScript.

### Fungsi Pembantu

Pry juga menyertakan utilitas `countNodes` yang secara rekursif menghitung semua node dalam pohon JSON, dan helper `formatBytes` untuk menampilkan ukuran file. Ini adalah fungsi TypeScript standar — tidak ada yang khusus Perry. Mereka dikompilasi ke kode native seperti yang lainnya.

**utils.ts**

```typescript
export function countNodes(data: unknown): number {
if (data === null || typeof data !== "object") {
return 1;
}
if (Array.isArray(data)) {
return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);
}
const values = Object.values(data as Record<string, unknown>);
return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);
}
```

## Mengkompilasi Pry

Mengkompilasi Pry dengan Perry adalah satu perintah. Tanpa proyek Xcode, tanpa konfigurasi Gradle, tanpa konfigurasi webpack. Cukup arahkan Perry ke file entry dan tentukan target Anda.

### macOS (ARM64)

```
$ perry build pry.ts --target macos-arm64
Parsing pry.ts...
Resolving imports: perry/ui, perry/fs
Compiling (cranelift, arm64)...
Linking with AppKit.framework...
✓ Built executable: pry (48 MB)
$ file pry
pry: Mach-O 64-bit executable arm64
$ otool -L pry | head -5
pry:
/System/Library/Frameworks/AppKit.framework/AppKit
/System/Library/Frameworks/Foundation.framework/Foundation
/usr/lib/libSystem.B.dylib
```

Binary berukuran 48 MB karena mencakup seluruh stack UI AppKit — rendering tree view, highlighting pencarian, pewarnaan sintaks, dan penanganan keyboard. Sebagai perbandingan, aplikasi yang sama di Electron akan berukuran 200+ MB. Aplikasi Perry khusus CLI dikompilasi menjadi 2-5 MB.

### iOS

```
$ perry build pry.ts --target ios-arm64
✓ Built executable: pry (52 MB)
```

Build iOS terhubung dengan UIKit alih-alih AppKit. Perry memetakan API `TreeView` yang sama ke `UITableView` dengan section yang bisa di-expand, `SearchBar` ke `UISearchBar`, dan event sentuh menggantikan event mouse. Build iOS dapat di-deploy ke perangkat fisik dan simulator.

### Android

```
$ perry build pry.ts --target android-arm64
✓ Built: pry.apk
```

Build Android menghasilkan library native yang dimuat melalui JNI, dikemas ke dalam APK. `TreeView` dipetakan ke `RecyclerView` dengan expandable view holder, `SearchBar` dipetakan ke `EditText` dengan `TextWatcher`, dan status bar dipetakan ke `TextView` di bawah layout.

## Apa yang Terjadi di Balik Layar

Ketika Perry mengkompilasi Pry, ia melewati beberapa fase:

1.  **Parse** — SWC mem-parse source TypeScript menjadi AST. Import dari `perry/ui` dan `perry/fs` diselesaikan ke implementasi modul bawaan Perry.
2.  **Analisis tipe** — Perry menyelesaikan semua tipe, termasuk `State<string>` dan `State<number>` generik, men-monomorphize-kan mereka menjadi tipe konkret.
3.  **Resolusi platform** — Berdasarkan flag target, Perry memilih backend UI yang sesuai. Setiap panggilan `TreeView`, `SearchBar`, dan `Button` diselesaikan ke implementasi spesifik platform.
4.  **Pembuatan IR** — Perry menghasilkan representasi intermediate yang mencakup panggilan API native — pengiriman pesan Objective-C untuk macOS/iOS, panggilan JNI untuk Android, panggilan fungsi C untuk GTK4/Win32.
5.  **Code generation** — Cranelift mengkompilasi IR ke kode mesin native untuk arsitektur target.
6.  **Linking** — Kode native dihubungkan dengan framework platform (AppKit, UIKit, Android NDK, GTK4, atau Win32) untuk menghasilkan executable akhir.

## Tanpa Runtime, Tanpa Web View

Ini perlu ditekankan karena merupakan perbedaan inti antara Perry dan setiap pendekatan TypeScript-to-native lainnya. Binary Pry yang dikompilasi memiliki:

-   **Tanpa JavaScript engine** — tanpa V8, tanpa Hermes, tanpa JavaScriptCore
-   **Tanpa web view** — tanpa Chromium, tanpa WebKit, tanpa WKWebView
-   **Tanpa lapisan bridge** — tanpa pesan serial antara JS dan native
-   **Tanpa framework runtime** — tanpa React, tanpa Flutter engine, tanpa Dart VM

Binary memanggil API platform secara langsung. Di macOS, ia memanggil `objc_msgSend` untuk berinteraksi dengan objek AppKit. Di Android, ia memanggil fungsi JNI untuk membuat dan memanipulasi View. Ini persis yang dilakukan aplikasi Swift atau Kotlin native.

Konsekuensi praktisnya: Pry langsung berjalan. Tidak ada startup VM, tidak ada pemanasan JIT, tidak ada parsing script. Proses dimulai, jendela muncul, JSON di-render. Penggunaan memori hanya sebagian kecil dari yang dikonsumsi Electron.

## Pengalaman Developer

Membangun Pry terasa sangat mirip dengan membangun aplikasi TypeScript biasa. Alur kerjanya:

1.  Tulis TypeScript di editor Anda (VS Code, Zed, Neovim, terserah Anda)
2.  Jalankan `perry compile pry.ts`
3.  Eksekusi `./pry test.json`
4.  Iterasi

Tanpa proyek Xcode yang perlu dikonfigurasi. Tanpa Android Studio yang perlu diinstal. Tanpa build Gradle yang memakan 45 detik. Compiler Perry sendiri cepat — parsing dan mengkompilasi Pry memakan beberapa detik, dan kami aktif bekerja untuk membuatnya lebih cepat.

TypeScript yang Anda tulis adalah TypeScript standar. Type checking, autocomplete, dan tool refactoring editor Anda semuanya berfungsi. Anda bisa mengekstrak fungsi, membuat modul, menggunakan generics — semua pola TypeScript yang sudah Anda kenal.

## Yang Kami Pelajari

Membangun Pry mengajarkan kami banyak tentang apa yang perlu didukung UI API Perry. Beberapa pelajaran:

-   **Tree view itu kompleks.** Expand, collapse, highlighting pencarian, navigasi keyboard, dan integrasi clipboard semua perlu dikoordinasikan. Widget `TreeView` Perry menangani ini secara internal, tapi kami harus memastikan implementasi native konsisten di ketiga platform.
-   **Keyboard shortcut perlu mengikuti konvensi platform.** Di macOS, `⌘C` untuk menyalin. Di Linux dan Android, `Ctrl+C`. Sistem shortcut Perry mengabstraksi ini, tapi implementasinya perlu hati-hati.
-   **Status bar ternyata tidak sederhana.** Setiap platform memiliki konvensi berbeda tentang di mana dan bagaimana menampilkan informasi status. AppKit menggunakan bar bawah jendela, UIKit menggunakan toolbar, Android menggunakan view di bawah layout. Widget `StatusBar` Perry memetakan ke masing-masing dengan benar.
-   **Dukungan stdin memerlukan kesadaran platform.** Di macOS dan Linux, membaca dari stdin mudah. Di iOS dan Android, "stdin" tidak benar-benar ada dengan cara yang sama, jadi Pry menggunakan pemilihan file di platform mobile. `readStdin` Perry menangani ini secara transparan.

## Performa

Pry menangani file JSON besar dengan nyaman. Dalam pengujian kami:

-   File JSON 1 MB (10.000+ node) di-parse dan di-render dalam waktu kurang dari 50 ms
-   File JSON 10 MB di-render dalam waktu kurang dari 200 ms
-   Pencarian di 10.000 node mengembalikan hasil saat Anda mengetik, tanpa lag yang terlihat
-   Penggunaan memori tetap di bawah 50 MB bahkan untuk file besar

Ini adalah keunggulan kompilasi native. Parsing JSON di Perry dikompilasi menjadi loop native yang ketat tanpa jeda GC. Rendering pohon menggunakan list view tervirtualisasi milik platform (NSOutlineView, UITableView, RecyclerView), yang sudah teruji performanya.

## Source dan Download

Pry adalah open source. Anda bisa menjelajahi source lengkap, build sendiri, atau cukup lihat kodenya untuk memahami struktur aplikasi UI native Perry.

-   [Repo GitHub](https://github.com/perryts/pry) — source code lengkap dan instruksi build
-   [Halaman showcase](/id/showcase/pry/) — screenshot, daftar fitur, dan detail platform

Jika Anda sedang membangun sesuatu dengan Perry, kami ingin mendengarnya. Buka issue di [repo Perry](https://github.com/PerryTS/perry) atau mulai diskusi. Kami membangun Perry secara terbuka dan feedback dari pengguna nyata yang membangun aplikasi nyata sangat berharga.
