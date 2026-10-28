---
title: "Kompilasi Silang ke Windows, Game Loop iOS, dan 100% Paritas Pengujian"
excerpt: "103 commit dalam satu minggu: kompilasi silang ke Windows dari Linux via lld-link, dukungan game loop iOS, pelaporan crash, pipeline build Hub dua tahap, dan kompiler self-hosting mencapai paritas pengujian deterministik 68/68."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 commit ke compiler Perry minggu ini. Fitur utama: Anda sekarang bisa cross-compile executable Windows dari Linux, aplikasi iOS bisa menjalankan game loop blocking, compiler melaporkan crash untuk telemetri, dan compiler self-hosting lolos setiap tes deterministik yang kami berikan. Ditambah upgrade infrastruktur Hub besar dan 50+ perbaikan bug.

## Cross-Compile ke Windows dari Linux

Perry kini dapat menghasilkan binari `.exe` Windows dari host Linux. Ini adalah bagian yang hilang untuk pipeline CI/CD yang perlu menargetkan Windows tanpa menjalankan mesin build Windows untuk keseluruhan kompilasi.

Implementasinya menggantikan pemeriksaan `#[cfg]` waktu kompilasi dengan deteksi target waktu proses. Ketika compiler melihat target Windows pada host non-Windows, compiler akan menemukan `lld-link`, `llvm-nm`, dan `llvm-ar` dari Rust toolchain atau PATH melalui helper `find_llvm_tool()` baru. Pustaka sistem Windows berasal dari sysroot bergaya [xwin](https://github.com/Jake-Shadle/xwin) yang ditunjukkan oleh `PERRY_WINDOWS_SYSROOT`.

Linker secara otomatis menggunakan `/FORCE:UNRESOLVED` dan menghasilkan stub untuk simbol UI yang hilang, sehingga aplikasi CLI melakukan kompilasi silang dengan rapi. Output defaultnya adalah `.exe` saat menargetkan Windows. Detail lengkapnya ada di [dokumen kompilasi silang](https://docs.perryts.com).

**terminal — host Linux**

```
$ perry compile main.ts --target windows
Compiling main.ts for windows-x86_64...
Using lld-link from Rust toolchain
✓ Compiled executable: main.exe (2.8 MB)
```

## Dukungan Game Loop iOS

iOS memerlukan UIKit untuk memiliki thread utama. Hal ini tidak masalah untuk aplikasi yang digerakkan oleh peristiwa, namun ini merupakan masalah bagi game yang memerlukan perulangan `while (!shouldClose)` pemblokiran. Perry kini menyelesaikan masalah ini dengan flag `--features ios-game-loop`.

Bila diaktifkan, kompiler mengeluarkan `_perry_user_main` alih-alih `main`. Runtime menyediakan `main()` yang memanggil `UIApplicationMain` di thread utama dan memunculkan kode Anda di thread latar belakang. Delegasi adegan dan delegasi aplikasi menangani siklus hidup UIKit penuh saat game loop Anda berjalan tanpa pemblokiran.

**main.ts**

```typescript
// Your game loop runs on a background thread
while (!shouldClose) {
update();
render();
awaitNextFrame();
}
```

```text
$ perry run ios --features ios-game-loop
```

Ini mengaktifkan seluruh kategori aplikasi — game, simulasi, visualisasi real-time — yang sebelumnya tidak praktis di iOS. Jalur pompa dan callback iOS kini juga dilengkapi dengan penanganan panik, sehingga kerusakan pada game loop atau siklus proses UIKit dapat ditangani dengan baik.

## Pelaporan Crash

Aplikasi yang dikompilasi Perry kini memasang pengait panik dan pengendali sinyal untuk `SIGSEGV`, `SIGBUS`, dan `SIGABRT` saat startup. Ketika terjadi kerusakan fatal, detailnya ditulis ke `~/.hone/crash.log` untuk sistem telemetri Chirp. Jika terjadi kepanikan (dalam `catch_callback_panic`) hapus log, sehingga hanya kerusakan asli yang tidak dapat diperbaiki yang dilaporkan.

Ini adalah fitur kesiapan produksi. Jika terjadi kesalahan di lapangan, kami akan mengetahuinya — dan log kerusakan menyertakan konteks yang cukup untuk mendiagnosis masalah tersebut tanpa mengharuskan pengguna melaporkan apa pun secara manual.

## Hub: Pipeline Build Windows Dua Tahap

Infrastruktur pembangunan Hub Perry mendapat peningkatan arsitektur yang signifikan. Sebelumnya, pembuatan untuk Windows memerlukan pekerja Windows untuk keseluruhan kompilasi. Kini pipeline terbagi menjadi dua tahap:

1.  Seorang pekerja Linux mengkompilasi silang artefak Windows menggunakan dukungan lld-link baru
2.  Hub menyimpan artefak yang telah dikompilasi sebelumnya dan mengantri ulang pekerjaan untuk pekerja Windows
3.  Pekerja Windows hanya menangani penandatanganan dan pengemasan — tugas yang jauh lebih ringan

Saat pekerja mengirimkan `complete` dengan `needs_finishing: "windows"`, Hub secara transparan mengantri ulang pekerjaan tersebut. CLI menghadirkan pengalaman build tunggal yang mulus.

Hub kini juga memulai otomatis VM Azure Windows ketika tidak ada pekerja Windows yang terhubung, dan pekerja bangunan melakukan pembaruan otomatis ke versi Perry terbaru pada rilis baru. Lebih sedikit pengelolaan infrastruktur manual, pembangunan lebih cepat.

## Pembaruan Dokumentasi

Dua penulisan ulang dokumentasi utama dilakukan minggu ini di [docs.perryts.com](https://docs.perryts.com):

-   **referensi perry.toml** — dokumentasi bagian lengkap yang mencakup setiap opsi konfigurasi, resolusi ID paket, resolusi file entri, penambahan otomatis nomor build, dan contoh CI/CD
-   **Referensi Geisterhand** — dokumen API lengkap, penyiapan platform, pola otomatisasi pengujian, dan ikhtisar arsitektur untuk framework pengujian UI lintas platform

Ini bukan pembaruan tambahan. Keduanya merupakan penulisan ulang awal yang mencakup setiap fitur dan opsi konfigurasi. Jika Anda sedang menyiapkan proyek baru atau tes menulis, mulailah dari sini.

## API Menu Lintas Platform

`menuClear` dan `menuAddStandardAction` sebelumnya hanya macOS. Mereka sekarang bekerja di keenam platform asli. Hal ini juga mencakup perbaikan kepanikan masuk kembali `RefCell` di `dispatch_menu_item` di Windows.

### Android: Perataan Halaman 16 KB

Google Play kini memerlukan penyelarasan halaman sebesar 16 KB untuk perpustakaan asli. Perry menyetel `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` yang sesuai secara otomatis, dan file `.so` pendamping disalin di sebelah output untuk penyertaan APK/AAB.

## Perry React: Papan Kanban

Lapisan kompatibilitas React telah diuji di dunia nyata: papan Kanban 5 kolom lengkap dengan operasi pemindahan, penambahan, penghapusan, dan tampilan. Membuatnya terbuka dan memperbaiki rendering turunan array bersarang di JSX — handler `_appendChildren` rekursif kini meratakan array yang dikembalikan dari panggilan `.map()` dengan benar. Ada juga demo Meja Kerja Wastafel Dapur 14 bagian baru yang mencakup berbagai pola UI.

## Anvil: 100% Paritas Tes Deterministik

`perrysdad` — kompiler LLVM yang dihosting sendiri dan ditulis dalam TypeScript dan dikompilasi oleh Perry — sekarang melewati **68 dari 68** pengujian deterministik, sama persis dengan keluaran kompiler utama. Perbedaannya hanya bersifat inheren (stempel waktu, `Math.random()`), dan 11 pengujian dilewati karena memerlukan UI, timer, kripto, atau fitur khusus platform yang belum diterapkan.

Pekerjaan utama yang mencapai hal tersebut:

-   **Pengiriman metode antarmuka** — variabel bertipe antarmuka kini mengembalikan metode yang benar melalui pengiriman berbasis class_id di ObjectHeader
-   **Akses properti dinamis** — pengiriman waktu proses untuk nama properti yang dihitung
-   **Penutupan dan pengikatan ini** — semantik penangkapan yang benar untuk metode objek
-   **Fase 6 sedang berlangsung** — async/menunggu, generator, dan perbaikan kondisi

Paritas 100% pada pengujian deterministik merupakan pencapaian yang signifikan. Artinya, biner `anvil` yang dikompilasi sendiri menghasilkan keluaran yang sama persis dengan kompiler utama untuk setiap skenario yang dapat diuji. Kesenjangan semakin menyempit menuju hosting mandiri penuh.

## 50+ Perbaikan Bug

Pendorongan koreksi besar minggu ini. Sorotan:

-   **JSON.parse** — array tidak lagi terpotong pada 16 elemen, input yang tidak valid ditangani dengan benar
-   **Uint8Array** — konstruktor dari variabel array, implementasi `.set(source, offset)` (tidak boleh dijalankan)
-   **BigInt** — NaN-boxing dengan `BIGINT_TAG` untuk panggilan lintas modul, perbaikan pemotongan 32-bit keccak256
-   **Rantaian opsional** — ekspresi kondisional bertingkat, deteksi toString, nilai kembalian NaN-boxing
-   **IndexSet** — string NaN-boxing dikoreksi untuk menggunakan `STRING_TAG` alih-alih `POINTER_TAG`
-   **MySQL** — tipe DATETIME dan BLOB, konstruktor `Date(string)`
-   **Math.min/max** — penanganan argumen sebaran
-   **Pengiriman metode asli** — pemindaian-dan-panggilan lapangan untuk objek `POINTER_TAG`

Ini bukan kasus ekstrem. JSON.parse memotong array pada 16 elemen akan merusak aplikasi nyata apa pun. Uint8Array.set menjadi no-op akan merusak data secara diam-diam. Ini adalah perbaikan yang menjadikan compiler tingkat produksi, satu bug kebenaran pada satu waktu.

## Dalam Angka

-   **103 komitmen** ke kompiler Perry utama
-   **3 versi**: v0.2.195, v0.2.196, v0.2.197
-   **1 fitur utama**: kompilasi silang Windows dari Linux
-   **1 kategori aplikasi baru**: iOS game loop
-   **68/68** paritas pengujian deterministik di perrysdad
-   **50+ perbaikan bug** di NaN-boxing, stdlib, dan FFI asli
-   **2 penulisan ulang dokumentasi**: perry.toml dan Geisterhand
-   **5 Peningkatan hub**: pipeline dua tahap, startup otomatis Azure, pembaruan otomatis pekerja

## Apa Selanjutnya

Kompilasi silang Windows membuka pintu bagi CI/CD multi-platform yang sepenuhnya otomatis — tekan TypeScript, dapatkan binari asli untuk setiap target tanpa mesin build khusus untuk setiap OS. Dukungan game loop membuka kategori aplikasi iOS yang benar-benar baru. Dan uji paritas deterministik 100% di perrysdad berarti hosting mandiri menjadi sangat nyata. Yang tersisa:

-   **Dukungan regex penuh** — kesenjangan bahasa utama yang terakhir
-   **ekspansi Perry/ui** — seret dan lepas, label aksesibilitas, DatePicker
-   **perrysdad Fase 6** — async/await, generator, berkembang menuju paritas Perry penuh
-   **Hub publik beta** — membuka build terdistribusi untuk pengguna eksternal

Ikuti perkembangannya di [GitHub](https://github.com/PerryTS/perry), baca dokumen di [docs.perryts.com](https://docs.perryts.com), atau periksa [peta jalan](/id/roadmap/) untuk gambaran selengkapnya.
