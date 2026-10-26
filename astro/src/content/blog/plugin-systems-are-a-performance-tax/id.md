---
title: "Sistem Plugin Adalah Pajak Performa"
excerpt: "Arsitektur plugin menukar performa demi ekstensibilitas. Tapi bagaimana jika ekstensibilitas terjadi saat kompilasi bukan saat runtime? Komposisi waktu kompilasi memberikan keduanya — nol overhead, fleksibilitas penuh."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
Anda menginstal VS Code. Cepat. Anda menambahkan 15 ekstensi. Sekarang butuh 4 detik untuk start dan Extension Host menghabiskan 800 MB RAM. Apa yang terjadi?

Pola ini berulang di mana-mana: WordPress, Eclipse, Chrome, Figma, Slack. Aplikasi diluncurkan cepat. Plugin membuatnya lambat. Tidak ada yang terkejut lagi — kita sudah menerimanya sebagai biaya dari ekstensibilitas.

Tapi sistem plugin bukan hanya masalah performa. Mereka adalah masalah filosofi desain. Industri telah mengacaukan "ekstensibilitas" dengan "dinamisme runtime" padahal seringkali jawaban yang lebih baik adalah komposisi waktu kompilasi. Plugin yang performan hanyalah yang berhenti menjadi plugin saat kompilasi.

## Spektrum Performa Ekstensibilitas

Tidak semua ekstensibilitas memiliki biaya yang sama. Ada spektrum dari zero-cost hingga maximum-cost, dan sebagian besar industri telah memilih ujung yang mahal:

1.  **Static linking / modul waktu kompilasi** — zero overhead. Library C, crate Rust, package Go. Batas modul hilang sepenuhnya di binary akhir.
2.  **Shared library yang dimuat saat startup** — hampir nol. Modul nginx, modul kernel Linux. Biaya satu kali saat load, lalu panggilan fungsi langsung.
3.  **Dynamic dispatch via interface / vtable** — overhead kecil. Plugin game engine C++. Satu pointer indirection per panggilan.
4.  **Plugin interpreted dalam proses yang sama** — overhead sedang. Plugin PHP WordPress, bundle Eclipse OSGi.
5.  **Plugin proses terpisah via IPC** — overhead signifikan. Ekstensi VS Code, ekstensi Chrome.
6.  **Plugin sandbox via IPC serial** — berat. Plugin Figma, content script ekstensi browser.

## Kerusakan Dunia Nyata

### WordPress

Setiap plugin hook ke dalam lifecycle request. 30 plugin berarti 30 lapisan pemanggilan fungsi per page load. Hasilnya: plugin caching ada semata-mata untuk mengurangi kerusakan dari plugin lain. Plugin performa untuk memperbaiki masalah performa yang diciptakan plugin. Ironi meta ini menulis dirinya sendiri.

### VS Code

Ekstensi berbagi satu event loop Node.js dalam proses terpisah. Satu ekstensi bermasalah memblokir semua yang lain. Extension Host secara rutin muncul sebagai consumer CPU teratas di mesin developer. Microsoft telah membangun tool profiling, perintah bisect, dan sistem activation event — seluruh infrastruktur untuk mengelola masalah yang diciptakan ekstensi.

### Eclipse

Kisah peringatan. Resolusi bundle OSGi, overhead class loading, graf dependensi masif. Dulunya IDE paling populer, sekarang sebagian besar ditinggalkan developer mainstream. Arsitektur plugin yang seharusnya menjadi kekuatan terbesarnya malah menjadi kelemahan terbesarnya.

### Electron

Masalah plugin di level platform. Setiap aplikasi Electron membawa runtime Chromium + Node.js lengkap. VS Code adalah Electron. Slack adalah Electron. Discord adalah Electron. Masing-masing secara independen mengonsumsi 300-500 MB RAM untuk merender apa yang pada dasarnya adalah jendela chat atau editor teks.

## Mengapa Industri Tetap Memilih Plugin

Jika plugin begitu mahal, mengapa semua orang terus membangunnya? Alasannya sebagian besar organisasional, bukan teknis.

## Alternatifnya: Komposisi Waktu Kompilasi

Bagaimana jika ekstensibilitas terjadi pada waktu build alih-alih runtime?

Ini bukan hipotetis. Ada preseden yang telah terbukti di bahasa sistem:

## Apa Artinya bagi TypeScript

TypeScript adalah bahasa paling populer untuk membangun tool yang extensible — dan terburuk dalam performa runtime. Seluruh ekosistem TypeScript berjalan di Node.js, yang berjalan di V8, yang JIT-compile JavaScript.

Di sinilah Perry berperan. Perry mengkompilasi TypeScript langsung ke binary native. Tanpa V8, tanpa pemanasan JIT, tanpa jeda garbage collection, tanpa batas IPC.

terminal

\# Your app, your dependencies, your "plugins" — one binary

$ perry compile server.ts -o server

Compiling server.ts + 43 modules...

✓ Built executable: server (1.8 MB, 0.7s)

$ ./server

Listening on port 3000

## Ekstensibilitas yang Benar-Benar Anda Butuhkan

Keberatan itu jelas: "Tapi saya butuh ekstensibilitas runtime. Pengguna perlu menginstal plugin tanpa kompilasi ulang."

Benarkah? Untuk sebagian besar aplikasi, set ekstensi diketahui pada waktu build.

## Jalan ke Depan

Kecanduan industri terhadap arsitektur plugin adalah gejala dari menerima runtime overhead sebagai hal yang tak terhindarkan. Itu tidak benar. Compiler bisa melakukan pekerjaannya. Komposisi waktu build memberikan ekstensibilitas tanpa pajak.

Sistem plugin tercepat adalah yang tidak ada saat runtime.
