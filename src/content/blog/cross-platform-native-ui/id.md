---
title: "UI Native Lintas Platform dari TypeScript"
excerpt: "Bagaimana Perry memetakan basis kode TypeScript ke widget platform di seluruh target yang terdokumentasi, termasuk batasan dan prasyarat khusus platform."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Salah satu tujuan paling ambisius Perry adalah menghadirkan aplikasi GUI yang benar-benar native dari satu codebase TypeScript. Bukan web view yang dibungkus dalam shell native. Bukan engine rendering kustom yang menggambar pikselnya sendiri. Widget native asli, di-render oleh framework UI milik masing-masing platform, dikompilasi dari TypeScript pada waktu build.

Artikel ini menjelaskan cara kerjanya — arsitektur, pemetaan platform, trade-off, dan di mana kami berada saat ini.

## Masalah dengan Pendekatan Saat Ini

Pengembangan GUI lintas platform telah menjadi masalah sulit selama beberapa dekade. Setiap framework besar membuat set kompromi yang berbeda:

### Electron / Tauri (Berbasis Web)

Electron membundel Chromium dan Node.js, memberikan Anda browser web sebagai shell aplikasi. Anda mendapat akses penuh ke platform web, tapi aplikasi "native" Anda berukuran 150+ MB yang menggunakan ratusan megabyte RAM hanya untuk menampilkan sebuah jendela. Tauri mengganti Chromium dengan web view OS, mengurangi ukuran secara drastis, tapi UI Anda tetap HTML/CSS yang di-render dalam web view — bukan widget native.

### React Native (Berbasis Bridge)

React Native menjalankan JavaScript Anda di JS engine (Hermes atau V8) dan menjembatani ke widget native melalui antrian pesan serial. Anda mendapat widget native asli, tapi bridge menambah latensi, terutama untuk gesture dan animasi. Interaksi kompleks memerlukan penulisan kode native (Swift/Kotlin), mengalahkan janji satu codebase.

### Flutter (Renderer kustom)

Flutter mengkompilasi Dart ke kode native dan menggambar semuanya dengan engine rendering berbasis Skia. Performanya sangat baik, tapi widget Anda bukan native — mereka adalah replika pixel-perfect. Ini berarti konvensi platform (fisika scroll, pemilihan teks, perilaku aksesibilitas) harus diimplementasi ulang alih-alih diwarisi. Dan di desktop, perbedaannya semakin terlihat.

### KMP + Compose Multiplatform (Sebagian native)

Kotlin Multiplatform mengkompilasi ke JVM di Android dan native di iOS, tapi UI bersama melalui Compose Multiplatform menggunakan renderer berbasis Skia kustom — trade-off yang sama dengan Flutter. Untuk UI yang benar-benar native, Anda kembali menulis kode khusus platform.

## Pendekatan Perry: Kompilasi ke Toolkit Native

Perry mengambil pendekatan yang secara fundamental berbeda. Alih-alih menjalankan kode Anda di runtime dan menjembatani ke widget native, atau menggambar piksel kustom, Perry mengkompilasi kode UI TypeScript Anda langsung menjadi panggilan ke toolkit native setiap platform pada waktu build.

Perbedaan kuncinya: **tidak ada lapisan runtime antara kode Anda dan SDK platform.** Binary yang dikompilasi memanggil AppKit, UIKit, Android Views, GTK4, atau Win32 secara langsung, persis seperti aplikasi yang ditulis dalam Swift, Kotlin, atau C++.

## API UI Terpadu

Perry menyediakan API TypeScript umum untuk membangun antarmuka pengguna. API ini sengaja dibuat high-level — Anda mendeskripsikan apa yang harus ada di UI dan bagaimana perilakunya, dan Perry memetakannya ke konstruksi native yang sesuai.

**counter.ts**

```typescript
import { App, Text, Button, VStack, State } from "perry/ui";
const count = new State(0);
const app = new App("Counter", { width: 400, height: 300 });
app.body(() => {
return VStack({ spacing: 16, alignment: "center" }, [
Text(`Count: ${count.value}`, { fontSize: 32 }),
Button("Increment", () => count.value++),
Button("Reset", () => count.value = 0),
]);
});
app.run();
```

Kode yang sama ini dikompilasi menjadi UI native di keenam platform. Tanpa `#ifdef`, tanpa pengecekan platform, tanpa import kondisional.

## Detail Pemetaan Platform

Berikut cara Perry memetakan API terpadu ke framework native setiap platform:

### macOS — AppKit

Di macOS, Perry menghasilkan kode yang membuat dan mengelola objek AppKit secara langsung.`App` menjadi `NSApplication` dengan sebuah `NSWindow`. `Text` menjadi `NSTextField` (dengan editing dinonaktifkan). `Button` menjadi `NSButton` dengan pola target-action yang terhubung ke callback Anda. `VStack` menjadi `NSStackView` dengan orientasi vertikal. Layout menggunakan Auto Layout constraints.

Binary yang dikompilasi terhubung dengan framework AppKit dan memanggil fungsi Objective-C runtime secara langsung. Ini sama persis dengan yang dilakukan Swift yang dikompilasi Xcode.

### iOS & iPadOS — UIKit

Di iOS, pemetaannya serupa tapi menargetkan UIKit. `App` menjadi `UIApplication` dengan sebuah `UIWindow` dan root `UIViewController`. `Text` dipetakan ke `UILabel`. `Button` dipetakan ke `UIButton`. Layout menggunakan `UIStackView` dan Auto Layout. Event sentuh ditangani melalui responder chain UIKit.

### Android — JNI + Tampilan

Di Android, Perry menghasilkan library native yang dimuat melalui JNI (Java Native Interface). `App` dipetakan ke `Activity`. `Text` menjadi `TextView`. `Button` menjadi `android.widget.Button` dengan sebuah `OnClickListener`. `VStack` dipetakan ke `LinearLayout` vertikal. Kode native memanggil kembali ke framework Android melalui JNI, membuat dan memanipulasi view Android asli.

### Linux — GTK4

Di Linux, Perry menargetkan GTK4. `App` menjadi `GtkApplication` dengan sebuah `GtkApplicationWindow`. `Text` dipetakan ke `GtkLabel`. `Button` dipetakan ke `GtkButton` dengan sebuah signal handler. `VStack` dipetakan ke `GtkBox` dengan orientasi vertikal. Theming CSS GTK berarti aplikasi Anda secara otomatis mengikuti tema desktop pengguna.

### Windows — Win32

Di Windows, Perry menghasilkan panggilan Win32 API. `App` membuat window class, mendaftarkannya, dan menjalankan message loop. `Button` menjadi kontrol `BUTTON`yang dibuat dengan `CreateWindowEx`. `Text` dipetakan ke kontrol `STATIC`. Event ditangani melalui message pump Win32 (`WM_COMMAND`, `WM_NOTIFY`, dll.).

## Manajemen State

Primitif `State<T>` Perry menyediakan manajemen state reaktif yang dikompilasi ke mekanisme update native platform. Ketika nilai state berubah, Perry memicu update UI melalui sistem invalidasi milik platform — `setNeedsDisplay` di macOS/iOS, `invalidate()` di Android, `gtk_widget_queue_draw` di Linux.

Tidak ada virtual DOM diffing, tidak ada pass reconciliation, tidak ada serialisasi. Perubahan state menyebar langsung ke widget native yang menampilkan nilainya.

## Mengapa Bukan Sintaks SwiftUI / Jetpack Compose?

Anda mungkin bertanya mengapa Perry tidak menggunakan sintaks deklaratif mirip SwiftUI atau Jetpack Compose. Jawabannya pragmatis: Perry mengkompilasi TypeScript, dan TypeScript memiliki idiomnya sendiri. Alih-alih membuat DSL yang terasa asing bagi developer TypeScript, Perry menggunakan API bergaya builder yang terasa natural di TypeScript — constructor, pemanggilan method, callback, dan closure. Ini adalah pola yang sama yang sudah Anda gunakan saat bekerja dengan Express, React hooks, atau library TypeScript lainnya.

## Yang Tersedia Saat Ini

Keenam backend platform telah diimplementasikan dan stabil. Set widget saat ini meliputi:

-   **Layout** — VStack, HStack, Spacer, ScrollView, Divider
-   **Tampilan** — Text, Image
-   **Input** — Button, TextField, Toggle, Slider
-   **Navigasi** — NavigationView, TabView, List
-   **Container** — TreeView, SearchBar, StatusBar
-   **State** — State<T> untuk update reaktif

## Yang Akan Datang

Kami aktif memperluas library widget. Selanjutnya:

-   `SecureField` — input password dengan secure text entry native platform
-   `ProgressView` — indikator progress determinate dan indeterminate
-   `Alert` — dialog alert native dengan tombol dan text field
-   `DatePicker` — pemilihan tanggal/waktu native platform
-   `Menu` — menu bar native dan context menu

Tujuannya adalah paritas penuh framework GUI di semua platform — setiap widget, layout, gesture, dan animasi tersedia di mana saja. Lihat [roadmap](/id/roadmap/) untuk gambaran lengkapnya.

## Coba Sekarang

Cara terbaik untuk memahami UI native Perry adalah melihatnya beraksi. [Pry](/id/showcase/pry/) adalah viewer JSON native yang dibangun sepenuhnya dengan TypeScript menggunakan Perry — aplikasi nyata dengan navigasi tree, pencarian, dan keyboard shortcut, dikompilasi menjadi binary native di macOS, iOS, dan Android. Baca [panduan lengkap](/id/blog/building-pry/) tentang cara pembuatannya.
