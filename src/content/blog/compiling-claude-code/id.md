---
title: "Mengompilasi Claude Code: satu bundle yang diminifikasi, 160 perbaikan compiler"
excerpt: "Kami mencoba memakai Perry untuk mengubah cli.js hasil minifikasi berukuran 13 MB yang didistribusikan npm untuk Claude Code menjadi biner native. Sebulan kemudian, program dapat dijalankan, login, menerima respons API sungguhan secara streaming, dan menampilkan karakter yang diketik. Sebanyak 160 pull request digabungkan ke Perry, dari MessageChannel yang tidak melakukan apa pun hingga write barrier GC yang hilang pada header RegExp."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
Pada tanggal 16 Juni, instruksinya berupa satu kalimat: *“temukan folder kode claude dan dapatkan javascript (yang dikompilasi, diperkecil) dari sana… mari kita lihat apakah kita dapat mengkompilasinya :D”* Ketika muncul keberatan yang jelas — bahwa ini akan brutal — jawabannya adalah tesis sebenarnya: *“ini brutal tetapi juga merupakan ujian nyata atas kemampuan dan batasan kita, itulah sebabnya Saya ingin melakukannya. Tidak ada yang bisa menggantikan aplikasi dunia nyata dalam hal menemukan batasan.”*

Sebulan kemudian, biner Claude Code CLI milik Anthropic yang dikompilasi dengan Perry dapat dijalankan, menyelesaikan `/login` melalui alur OAuth, menerima respons sungguhan dari API secara streaming, dan menampilkan karakter yang diketik. Untuk mencapainya, **160 pull request digabungkan ke Perry antara 20 Juni dan 17 Juli** — memperbaiki `MessageChannel` yang tidak melakukan apa pun, write barrier GC yang hilang pada header RegExp, pernyataan `continue` yang hanya berputar tanpa akhir saat memakai API nyata dan tidak pernah pada mock kami, serta sekitar seratus lima puluh masalah lainnya.

Postingan ini adalah turnya. Bukan karena mengkompilasi CLI orang lain adalah sebuah produk — kami tidak merilis biner ini dan tidak akan pernah merilisnya — namun karena ini adalah satu-satunya instrumen pencarian bug paling produktif yang pernah kami tunjuk pada Perry.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="Terminal macOS yang menjalankan biner Perry yang dikompilasi Claude Code dari /tmp/verify: spanduk v2.1.112, /login yang berhasil, perintah “luar biasa, siapa kamu?”, balasan yang mengalir, dan jalan keluar yang bersih kembali ke shell." width="1708" height="926"><figcaption>Tidak ada <code>node</code> di baris perintah tersebut. <code>/tmp/verify/cc_fptest_dbg25</code> adalah executable asli tunggal yang dihasilkan oleh <code>perry compile</code> dari <code>cli.js</code> yang dikirimkan — masuk, mengalirkan jawaban sebenarnya, dan keluar dengan lancar di Ctrl-C. Karena nama file mengundang pertanyaan: <code>dbg25</code> adalah build ke-25 dari seri diagnostik dari penyelidikan GC yang masih berjalan saat ini ditulis — simbol debug, ditambah penghapusan penghalang tulis dimatikan sehingga <em>setiap</em> penyimpanan array memancarkan penghalang. Ini membawa lebih banyak overhead daripada bangunan biasa, bukan lebih sedikit. Tabel performa di bagian bawah diukur pada biner berbeda yang tidak diinstrumentasi.</figcaption></figure>

## Apa arti sebenarnya dari “kompilasi Claude Code”

Target kompilasi adalah file yang didistribusikan dalam paket npm. `npm pack @anthropic-ai/claude-code@2.1.112` memberi Anda `cli.js`: **13 MB JavaScript** yang diperkecil dan dijalankan sendiri dengan `#!/usr/bin/env node` shebang. Tidak ada sumber, tidak ada peta sumber, tidak ada langkah pembangunan kami. Kami mengarahkan `perry compile` ke file tersebut, tidak dimodifikasi, dan meminta executable asli.

Perry mengerjakannya selama sekitar 37 menit dan menghasilkan sekitar 207 MB IR di **16.023 fungsi**, yang terhubung ke biner ~180 MB. Setiap fungsi tersebut memiliki nama satu huruf dan tidak ada anotasi tipe, dan semuanya harus bekerja terlebih dahulu — tidak ada JIT, tidak ada `eval`, tidak ada dana talangan yang malas untuk penerjemah ketika kompiler salah menebak. Jika Perry salah menurunkan salah satu dari 16.023 fungsi tersebut, tidak ada yang dapat menghalanginya.

Tingkat penilaian berasal dari rangkaian stres internal kami, dan hal ini sengaja tidak dapat dimaafkan:

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

`correct` adalah satu-satunya tingkatan yang diperhitungkan. Node v26 adalah oracle; apa pun yang tidak identik dengan byte dengan apa yang dicetak Node adalah bug Perry hingga terbukti sebaliknya.

## Mengapa aplikasi ini khususnya

Agen pengkodean CLI adalah tumpukan JavaScript yang sangat berbahaya untuk dikompilasi terlebih dahulu. Dalam satu biner Anda mendapatkan: React direkonsiliasi ke terminal melalui Ink, pembaca stdin mode mentah, ANSI/perender jenuh emoji yang menjalankan regex pada setiap frame, SSE klien HTTP, skema zod yang dibuat saat startup, alur OAuth, `worker_threads`, `MessageChannel` digunakan sebagai penjadwal tugas makro, WeakMaps yang menampung status fiber, `require` dinamis, dan lapisan sistem file yang menulis ke stdout berdasarkan deskriptor file.

Masing-masing merupakan subsistem yang berbeda dari Perry, dan aplikasi melatihnya *bersama-sama*, dalam skala besar, di bawah tekanan GC, selama beberapa menit dalam satu waktu. Rangkaian pengujian kami — 3.000 pengujian unit Rust, ribuan program regresi TypeScript, matriks paritas Node API, test262 — semuanya berorientasi pada menyematkan perilaku yang diketahui. Paket ini berorientasi untuk menemukan perilaku yang tidak terpikirkan oleh siapa pun untuk dipasangi pin.

## Urutan rintangan

Pekerjaan hanya berjalan dalam satu arah: bersihkan tembok saat ini, temukan tembok berikutnya. Terkompresi:

| Tanggal| Tonggak Sejarah |
| --- | --- |
| 21 Juni| `--help` berjalan secara native, kode keluar 0 |
| 22 Juni| Sub-perintah sebenarnya berhenti berhenti saat startup |
| 23 Juni| `-p` membuka soket TCP YANG DIDIRIKAN ke api.anthropic.com |
| 24 Juni| Skema zod dibuat dengan benar; jalur autentikasi tercapai |
| 27 Juni| Render TUI — logo, kotak selamat datang, bingkai masukan |
| 9 Juli| Perjalanan pulang pergi penuh pertama: `-p` melawan API asli mencetak balasan, keluar 0 |
| 10 Juli| Node-vs-Perry rangkaian kabel diferensial: 12/12 identik |
| 13 Juli| Byte-identik dengan Node pada `-p` teks + JSON, TUI render, sistem file |
| 16 Juli| Karakter yang diketik akhirnya muncul di baris input |
| 17 Juli| Loop penuh divalidasi secara manual: peluncuran → respons `/login` → API → mengetik |

Setiap perbaikan dikirim ke upstream sebagai permintaan penarikan mandiri dengan reproduksi umum yang minimal. Tak satu pun dari mereka menyebutkan aplikasi asal mereka — itu adalah aturan sejak hari pertama. Pengguna Perry yang membaca changelog melihat “`continue` pada driver yang menunggu melewati proses iterator,” bukan “kami mencoba mengkompilasi CLI seseorang.” Bug tersebut sebenarnya tidak bergantung pada kendaraan yang memunculkannya.

## Lima bug perangkat lunak yang perlu didiskusikan

### 1. MessageChannel adalah larangan yang sopan

`--help` berfungsi pada tanggal 21 Juni. Setiap subperintah *nyata* — `doctor`, `agents`, `mcp list` — digantung selamanya. Tidak sibuk: `sample` menunjukkan proses diparkir, `lsof` menunjukkan tidak ada proses turunan, tidak ada soket, hanya dua pipa.

Implementasi `MessageChannel` milik Perry memasang `postMessage` sebagai operasi kosong dan `onmessage` sebagai `null`. Hal itu tampak tidak berbahaya sampai kita menjumpai pola penjadwal React, yang menggunakan kanal pesan sebagai penjadwal macrotask:

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

Pesan dihapus, callback tidak pernah dijalankan, dan loop peristiwa menganggur di pipa bangunnya sendiri selamanya. [#5530](https://github.com/PerryTS/perry/pull/5530) memberikan port pengiriman thread yang sama secara nyata — pasangan terjerat, antrean FIFO, pengiriman melalui tugas makro `setImmediate`, dan GC root scanner sehingga pesan dalam antrean tetap bertahan dalam pengumpulan.

### 2. Satu pengakses di Object.prototype membutuhkan waktu 42 detik

Sebelum hang, subperintah yang sama terikat pada CPU selama puluhan detik. Pembuatan profil mengarah ke jalur `[[Set]]` umum, dan penyebab utamanya adalah tanda proses global.

Perry memiliki jalur cepat untuk penulisan properti dinamis, dengan gerbang pada “apakah `Object.prototype` saat ini membawa deskriptor apa pun?” Bundel ini menginstal tepat satu pengakses pada `Object.prototype` saat startup. Hal ini membalikkan seluruh proses, dan sejak saat itu *setiap* penulisan dinamis dalam program melakukan intersepsi lambat, yaitu O(jumlah kunci sendiri). Membangun benda yang lebar menjadi persegi:

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) mengganti tanda global dengan pertanyaan per kunci — *apakah `Object.prototype` memiliki properti sendiri untuk **ini** key?* Kunci yang tidak ada tidak dapat disadap, sehingga penulisan aman untuk jalur cepat. 42 s → 23 ms, dengan intersepsi masih tepat.

Kemudian bentuk yang sama muncul kembali untuk instance kelas, yang langsung dikecualikan oleh jalur cepat: build 20.000 kunci pada objek biasa membutuhkan waktu 25 ms, pada instance `class` 44 detik. Memperbaiki hal tersebut sangatlah penting — pemeriksaan rantai prototipe yang naif akan melewatkan setter yang diwariskan dan secara diam-diam merusak data — jadi [#5528](https://github.com/PerryTS/perry/pull/5528) menyelesaikan prototipe instance melalui registri kelas dan menambahkan indeks kunci lebar O(1). Kembali ke 30 ms, dan linier lagi.

### 3. Bug yang hanya dapat dipicu oleh API asli

Inilah yang kami sampaikan kepada orang-orang. Pada awal Juli, biner yang dikompilasi akan melakukan `-p` sepenuhnya terhadap server tiruan lokal kami: sambungkan, POST, baca aliran SSE, cetak balasan, keluar dari 0. Terhadap Anthropic API terhenti selamanya, setiap saat.

Rantai proses debugnya adalah: tiruan proksi maju membuktikan 200 respons penuh tiba secara utuh → tiruan pemutaran ulang, memasukkan aliran byte asli yang diambil, mereproduksi hang secara lokal → membagi dua daftar peristiwa SSE menemukan peristiwa pelakunya → reproduksi sepuluh baris.

API yang sebenarnya mengirimkan bingkai `event: ping`. Tiruan kami tidak pernah berhasil. Dan `ping` adalah satu peristiwa yang dilewati oleh loop aliran SDK dengan `continue`. Perry menurunkan `for await` ke dalam driver yang gerak maju iteratornya berada di *bawah* badan loop:

```
// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}
```

Enam lokasi penurunan yang terpisah memiliki bentuk yang sama. [#6196](https://github.com/PerryTS/perry/pull/6196) memindahkan kemajuan ke posisi teratas dalam semuanya. Pelajaran yang terus kita pelajari kembali: tiruan yang lolos adalah bukti tentang tiruan tersebut.

### 4. Regex yang umurnya lebih lama dari string polanya sendiri

TUI akan dirender, lalu mati dari `SIGBUS` dalam hitungan detik — 12 error dalam 12 kali berjalan di bawah stress harness pengubah ukuran jendela, pada alamat berbeda dalam fungsi berbeda setiap kali. Investigasi selama berminggu-minggu mengarah pada teori GC yang kemudian dibantah oleh pengujian A/B, termasuk salah satu “perbaikan” kami yang ternyata tidak masuk akal dan harus ditarik.

Akar penyebab sebenarnya adalah empat baris Rust. `js_regexp_new` mengalokasikan RegExp header dan menyimpan `pattern` dan `flags` pointer string dengan penulisan mentah — **tidak ada penulisan penghalang**. Sebuah benda generasi lama yang menunjuk pada seutas tali muda yang segar, dan sang kolektor tidak pernah menceritakan tentang tepiannya. GC minor menghapus string tersebut dari bawah RegExp yang aktif, dan pembacaan selanjutnya dari slot yang dibebaskan mengalami kesalahan.

Mengapa ini hanya muncul di sini? Karena UI terminal jenuh dengan regex — penguraian ANSI dan pengukuran lebar emoji menjalankan pola pada setiap bingkai — sehingga jendela antara alokasi dan pengumpulan dilewati ribuan kali dalam satu menit. Reproduksi minimal kami, 6.000 regex ditambah churn alokasi yang disengaja, *tidak pernah* memicunya. Bundel itu memicunya setiap saat. [#6288](https://github.com/PerryTS/perry/pull/6288) menambahkan penghalang yang selalu dibutuhkan kedua bidang.

### 5. Karakter yang Anda ketik ada di sana. Bingkai itu membuangnya.

Dinding yang paling keras kepala: seluruh UI dicat dengan sempurna — kotak selamat datang, bingkai masukan, blok kursor, baris status. Mengetik `/` akan membuka menu perintah, sehingga penekanan tombol mencapai React. Namun huruf tersebut tidak pernah muncul di baris input.

Build yang diinstrumentasi menunjukkan Perry mengecat karakter yang diketik dengan benar di setiap tahapan, lalu `onRender` melemparkan *setelah* pengecatan — ke dalam Ink `try/catch` yang menelannya. Bingkai ditinggalkan sebelum dilakukan, sehingga setiap render berikutnya dibuat pada bingkai kosong. Aplikasi ini terlihat sangat sehat namun mengabaikan Anda.

Dua bug independen bersembunyi di balik satu gejala tersebut:

-   [#6453](https://github.com/PerryTS/perry/pull/6453) — Perry menurunkan `charAt`/`codePointAt`/`split` memanggil ToString pada penerima non-string tanpa pelindung koersibilitas yang diperlukan. Jadi `undefined.codePointAt(0)` secara diam-diam mengembalikan `117` — titik kode `"u"`, dari string `"undefined"` — alih-alih melempar. Bug yang *menemukan* data yang masuk akal jauh lebih buruk daripada bug yang mogok.

-   [#6471](https://github.com/PerryTS/perry/pull/6471) — pemblokir sebenarnya. Saat array bertambah, Perry meninggalkan stub penerusan permanen di alamat lama. Sapuan kecil adalah mendapatkan kembali rintisan tersebut sementara orang tua generasi lama masih menunjuk pada satu hal: cache karakter penyaji menyimpan penunjuk pra-pertumbuhan pada halaman yang tidak kotor. Membaca rintisan basi menghasilkan panjang sampah, dan setiap frame dibatalkan. Anak di bawah umur sekarang memiliki semua potongan; jejak penuh merebutnya kembali dengan tanda.


Memperbaiki objek yang terekspos pada lapisan ketiga — objek yang berwarna hitam selama penandaan tambahan tidak akan pernah dilacak, jadi apa pun yang hanya dapat dijangkau melalui objek tersebut akan tersapu saat ditayangkan ([#6494](https://github.com/PerryTS/perry/pull/6494)), dan slot luapan masker tata letak tidak dilaporkan sehingga kolektor melewatkannya ([#6506](https://github.com/PerryTS/perry/pull/6506)). Keduanya adalah jenis lubang kesehatan yang menghasilkan satu dari lima puluh misteri crash di *setiap* program yang dikompilasi. Kami tidak akan menemukannya dengan rangkaian pengujian.

## Cara Anda men-debug biner yang diperkecil berukuran 13 MB

Tidak satu pun hal di atas dapat ditemukan dengan membaca kode. Perkakas yang membuatnya mudah diatur:

-   **Kemanfaatan diferensial dengan Node sebagai oracle.** Setiap hipotesis menjadi program TypeScript kecil yang dijalankan pada `node --experimental-strip-types` dan Biner Perry, dibandingkan byte demi byte. Ia menemukan bug sendiri — ekspresi kelas yang hanya digunakan di sisi kanan `instanceof` telah dihilangkan dengan kode mati karena sebelas lintasan analisis tidak dapat melihat jenis simpul tersebut ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Tiga server API tiruan.** Sebuah tiruan logging, proksi penerusan yang menangkap byte respons nyata, dan server pemutaran ulang yang mengembalikan byte tersebut secara deterministik. Server replay inilah yang mengubah “hang terhadap produksi” menjadi reproduksi lokal.

-   **Harness PTY yang menjawab pertanyaan terminal.** Terminal semu yang bodoh memberi Anda 50 byte dan terhenti. Aplikasi menyelidiki posisi kursor (`ESC[6n`), atribut perangkat (`ESC[c`) dan warna latar belakang (`OSC 11`) dan menunggu balasan sebelum mengecat. Jawablah pertanyaan tersebut dan Anda akan mendapatkan layar selamat datang berukuran 3.331 byte penuh — dan render yang sebanding dengan byte antara Node dan Perry.

-   **Tautkan peta untuk simbolisasi.** Biner 180 MB yang dihapus menghasilkan laporan kerusakan yang penuh dengan offset mentah; Output `ld64 -map` ditambah skrip membagi dua mengubahnya kembali menjadi nama fungsi.

-   **A/B semuanya.** Aturan yang muncul, ditulis di bagian atas catatan handoff dalam huruf kapital: *jangan pernah mewarisi teori — ujilah.* Empat hipotesis akar penyebab berturut-turut untuk satu bug masing-masing dibantah oleh proses A/B. Salah satu sinyal pemverifikasi yang kami kejar selama berhari-hari (“445 tepi tua→muda hilang”) ternyata merupakan artefak pengukuran — pemeriksaan dilakukan antara membersihkan dan memulihkan set yang diingat. Komentar kode itu sendiri memperingatkan tentang hal itu.


## Tempat sebenarnya

Sejujurnya: ini berfungsi, dan lambat.

Bekerja hari ini, byte-identik dengan Node yang keluarannya sebanding: startup, `--help`, `--version`, mode `-p` sekali pakai melawan API yang sebenarnya termasuk klasifikasi error dan JSON envelope, rendering TUI lengkap, OAuth `/login`, respons streaming, dan pengetikan. Berikut keseluruhan perulangan dalam satu kali pengambilan — peluncuran, `/login`, pertanyaan, jawaban streaming, keluar:

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Browser Anda tidak mendukung video tersemat.</video><figcaption>63 detik, tidak ada audio, terpotong di dua tempat: setengah dari jabat tangan OAuth browser dan macOS. Segala sesuatu di terminal bersifat real-time dan tidak diedit — termasuk penundaan startup, yang merupakan hal paling lambat dalam postingan ini.</figcaption></figure>

Ada dua hal yang masih terbuka, dan mungkin keduanya merupakan satu hal. Input berhenti didaftarkan setelah kira-kira satu menit penggunaan interaktif berkelanjutan — tidak ada kerusakan, tidak ada kesalahan, input berhenti begitu saja. Dan `ESC` tidak mengganggu respons dalam penerbangan, meskipun `Ctrl-C` kini berhenti dengan lancar, hal yang tidak dilakukannya seminggu yang lalu (itulah jalan keluar yang Anda lihat di akhir rekaman). Jalur keluar yang berfungsi saat jalur interupsi tidak menunjuk pada tersangka yang sama dengan penghentian input: peristiwa penekanan tombol yang berhenti menjangkau aplikasi, dan bukan kesalahan apa pun pada pengendali aplikasi itu sendiri.

Gambaran kinerja, diukur terhadap Node yang menjalankan paket yang sama, sebelum dan sesudah putaran pertama kampanye kecepatan yang dimulai pada hari yang tepat. Ini berasal dari `cc_final` dan `cc_perf2` pada tanggal 17 Juli — build biasa tanpa kompilasi diagnostik, bukan biner berinstrumen pada tangkapan layar di atas:

| Metrik| Node| Perry (17 Juli)| Perry (setelah) |
| --- | --- | --- | --- |
| `--version` | 328 ms| 1.168 ms| **227 mdtk** |
| `--help` | 715 ms| 5.071 ms| 4.099 ms |
| TUI pengecatan pertama| 0.76 s | 10.9 s | 8.4 s |
| Penekanan tombol → cat (p50)| 2,2 ms| 111–143 mdtk| 119–138 mdtk |
| Jejak memori, menganggur| 290 MB datar| ~420 MB mendaki| ~420 MB mendaki |

`--version` sekarang **mengalahkan Node**, dan kemenangan tersebut awalnya memalukan: executable yang dikompilasi mengekspor 300.281 simbol, jadi ~80% dari peluncuran tersebut adalah dyld melakukan penggabungan definisi lemah. Satu flag linker meningkatkan ekspor menjadi 3 dan biner dari 228 MB menjadi 197 MB ([#6533](https://github.com/PerryTS/perry/pull/6533)). Membangun setiap regex unik satu kali, bukan dua kali ([#6534](https://github.com/PerryTS/perry/pull/6534)) dan menyimpan pemeriksaan intersepsi per toko dalam cache ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) mengambil sisanya.

Dengan 197 MB tersebut, sebelum ada yang memimpinnya: Perry secara statis menghubungkan runtime-nya sendiri dan mengeluarkan kode mesin untuk semua 16.023 fungsi sebelumnya tanpa ada yang terhenti — bundel yang dijalankan sendiri pada dasarnya membuat semuanya dapat dijangkau, sehingga tidak ada paket silang DCE untuk dijadikan sandaran — artinya 197 MB adalah keseluruhan program *ditambah* waktu prosesnya dalam satu file, dibandingkan dengan **138 MB yang merupakan bobot biner Node v26 sebelum membaca satu baris JavaScript**.

Baris penekanan tombol adalah baris yang harus dibaca dengan cermat, karena angka “setelah” terlihat lebih buruk. Hal ini tidak terjadi: rentang tersebut merupakan rentang dari proses berulang dan tumpang tindih, sehingga median tidak bergerak ke salah satu arah — yaitu varians proses, bukan regresi. Ini juga persis seperti yang kami harapkan. Ketiga perubahan tersebut menyentuh langkah tautan, konstruksi regex, dan jalur *penyimpanan*; median penekanan tombol didominasi oleh jalur properti *baca*, overhead rooting per panggilan, dan GC langkah 40–80 ms yang masuk ke dalam jendela penekanan tombol. Buktinya muncul pada putaran berikutnya: dapatkan/setel jalur cepat membuat microbenchmark akses lapangan 3× lebih cepat dan tidak memindahkan angka ini sama sekali ([#6539](https://github.com/PerryTS/perry/pull/6539)). Kemenangan microbenchmark yang tidak muncul di aplikasi adalah diagnosis yang salah, dan kami mengalaminya.

Baris memori adalah kampanye saat ini. Kolektor penyalin Perry *dapat* memadat — masalahnya adalah ia memenuhi syarat kira-kira sekali setiap 45 detik waktu idle, sehingga pembibitan tumbuh kembali menjadi ~300 MB di antara pengaktifan sementara Node tetap datar dengan pemadatan terus-menerus. Itu adalah masalah frekuensi pemicu, bukan masalah algoritme, dan kondisi ini jauh lebih baik dibandingkan saat kita berada di bulan Juni.

Tidak ada satupun yang diparkir. Kampanye memori dan kinerja *langsung* saat postingan ini muncul — pekerjaan pemicu GC sedang berjalan hari ini, pada biner yang sama persis ini — jadi tabel kinerja di atas adalah bagian dari postingan ini yang paling kami perkirakan akan dibatalkan, dan semakin cepat semakin baik. Kebenaran membutuhkan waktu satu bulan untuk melewati tembok. Yang tersisa adalah masalah frekuensi pemicu dan masalah jalur baca, keduanya dipahami, keduanya sudah dalam penerbangan. Kami berharap hal ini terasa lancar dan bukan sekadar benar, dan kami mengharapkannya segera.

## Mengapa kami melakukan ini

Tidak satu pun dari 160 perbaikan yang berkaitan dengan Claude Code. Hilangnya penghalang tulis pada header RegExp merusak memori di *program* apa pun yang membuat regex saat dimuat. `for await` dengan `continue` berputar di konsumen aliran mana pun. `MessageChannel` menghapus pesan akan merusak setiap aplikasi berbentuk penjadwal React. Flag deskriptor `Object.prototype` membuat *setiap* program yang menyentuh `Object.prototype` menjadi kuadrat pada objek terluasnya.

Semua bug tersebut ada di Perry saat CI berwarna hijau, sementara angka test262 meningkat, sedangkan matriks paritas Node menunjukkan 97%. Dibutuhkan tiga belas megabyte JavaScript milik orang lain yang telah diperkecil, melakukan pekerjaan nyata terhadap API nyata di terminal nyata, untuk melepaskannya.

Ada satu hal lagi, dan itu adalah bagian yang menurut kami paling lucu. Perry tidak ditulis dengan tangan saja — sebagian besar, termasuk sebagian besar *kampanye ini*, ditulis dengan Claude Code. Server tiruan, PTY harness, differential runner, malam yang panjang dalam membagi dua bug GC pada pukul empat pagi: sesi agen, ditinjau dan digabungkan oleh manusia. Tidak semuanya Perry, dan bukannya tanpa banyak argumen. Namun cukuplah bahwa kalimat tersebut benar dua arah.

Kompiler yang menggunakan Claude Code, sebagian besar, dibuat oleh Claude Code.

Kami akan terus melakukannya. Target selanjutnya sudah masuk antrian.

* * *

Perry tidak berafiliasi atau didukung oleh Anthropic. Claude Code adalah merek dagang dari Anthropic PBC. Biner yang dijelaskan di sini dibuat dari paket npm yang dipublikasikan secara publik, murni sebagai target pengujian compiler, dan tidak didistribusikan.
