---
title: "Dari Kompiler ke Ekosistem: React, Database, dan Cloud Build"
excerpt: "Perry berkembang dari kompiler menjadi ekosistem lengkap. perry/ui sebagai inti, ORM kompatibel Prisma untuk MySQL/PostgreSQL/SQLite, push notification universal, build terdistribusi dengan publikasi App Store, dan lapisan kompatibilitas React — semuanya dalam satu minggu."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Seminggu yang lalu, Perry adalah compiler dengan UI toolkit. Anda bisa menulis TypeScript, mengkompilasinya menjadi binary native, dan mendistribusikannya di enam platform. Itu ceritanya. Hari ini ceritanya lebih besar: Perry menjadi sebuah ekosistem. Tiga database ORM, push notification universal, distributed build dengan publikasi App Store dan Play Store, layer kompatibilitas React, dan verifikasi aplikasi otomatis — semuanya hadir dalam seminggu terakhir.

Postingan ini membahas apa yang dikirimkan, mengapa itu penting, dan seperti apa kodenya.

## perry/ui: Fondasi

Sebelum masuk ke perpustakaan baru, ada baiknya menekankan apa yang menjadi pusat dari segalanya: `perry/ui`. Ini adalah perangkat UI asli Perry — 20+ widget yang dikompilasi langsung ke komponen asli platform pada keenam target. Ini bukan pembungkus, bukan lapisan abstraksi, bukan tampilan web. Setiap `Button` menjadi `NSButton` di macOS, sebuah `UIButton` di iOS, sebuah `GtkButton` di Linux, `android.widget.Button` di Android, dan kontrol `CreateWindowEx` di Windows.

`perry/ui` adalah Perry permukaan UI utama dan tercanggih. Ini mencakup manajemen keadaan reaktif, wadah tata letak (VStack, HStack, ZStack, SplitView), yang dipercepat perangkat keras Tampilan Canvas, Table dengan penyortiran kolom, modul `perry/system` untuk dialog file, akses gantungan kunci, notifikasi, dan multi-jendela — semuanya dari TypeScript, semuanya dikompilasi untuk mengarahkan panggilan API platform. Setiap pendekatan UI lainnya di Perry, termasuk lapisan kompatibilitas React, dibuat di atas `perry/ui` dan dipetakan kembali ke widgetnya.

**app.ts**

```typescript
import { Window, VStack, Button, Text, State } from 'perry/ui';
const count = new State(0);
const window = new Window({ title: "Counter" });
window.setContent(
  new VStack({ children: [
    new Text({ text: count }),
    new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),
  ] })
);
```

Objek `State` reaktif adalah primitif kunci. Saat nilai State berubah, hanya widget yang terikat pada pembaruan status tersebut — tidak ada perbedaan DOM virtual, tidak ada perenderan ulang seluruh pohon, tidak ada proses rekonsiliasi. Ini adalah jalur paling langsung dari TypeScript ke UI platform asli yang pernah ada.

## Kompatibilitas React: Layer Tipis di atas perry/ui

Untuk pengembang yang berasal dari React, `perry-react` menyediakan lapisan kompatibilitas yang memetakan model komponen React ke widget `perry/ui`. Anda dapat menggunakan `useState`, `useRef`, `useReducer`, dan JSX — dan Perry mengkompilasinya ke widget asli yang sama di bawahnya. Ini adalah jembatan praktis, bukan mesin rendering terpisah.

**counter.tsx**

```tsx
import React, { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

Di balik layar, setiap elemen JSX dipetakan ke widget `perry/ui`: `<div>` menjadi VStack, `<button>` menjadi Button, dan `useState` ditopang oleh State reaktif milik Perry. Ini masih tahap awal — Fase 1 dengan render ulang seluruh pohon dan penyimpanan hook global — tetapi membuktikan bahwa kode React yang sudah ada dapat menargetkan platform native melalui Perry. Kami juga menjajaki kompatibilitas Angular dan Ionic dengan pendekatan serupa.

## Tiga Database ORM: API Prisma, Performa Native

Jika Anda membuat server atau aplikasi desktop yang terhubung dengan database, Perry kini menyediakan tiga Prisma: `perry-prisma` (MySQL), `perry-sqlite` (SQLite), dan `perry-postgres` (PostgreSQL). Ketiganya merupakan pengganti drop-in untuk `@prisma/client`. API yang sama, pola kueri yang sama, tetapi dikompilasi ke kode asli dengan basis data langsung FFI — tanpa mesin Prisma, tanpa Node.js.

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Same Prisma API — compiled to native SQL via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

Di balik terpalnya, setiap ORM adalah front-end TypeScript yang didukung oleh lapisan Rust FFI menggunakan `sqlx`. Alur kueri: TypeScript membuat serial kueri ke JSON, meneruskannya melintasi batas FFI, Rust membuat SQL berparameter, mengeksekusinya melalui koneksi pool, dan membuat serial hasilnya kembali. Skema Prisma dibaca pada waktu build — tanpa penguraian waktu proses.

Ketiga implementasi tersebut berbagi ~95% kodenya. Perbedaannya sesuai dengan yang Anda harapkan: kutipan pengidentifikasi (`` `col` `` vs `"col"`), sintaksis placeholder ( `?` vs `$1, $2`), dan semantik transaksi. Ketiganya mendukung permukaan CRUD Prisma penuh: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — plus SQL mentah, transaksi, dan 10+ operator filter WHERE.

## perry-push: Push Notification Universal

`perry-push` adalah pustaka tunggal yang menangani notifikasi push di setiap platform: APNs (iOS/macOS), FCM (Android), Web Push (browser), dan WNS (Windows). Setiap penyedia adalah modul Rust FFI dengan tiga fungsi: `*_provider_new`, `*_provider_close`, dan `*_send`.

**notify.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Unified result type for all providers
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

Kriptografi ditangani oleh `ring` — JWT ES256 untuk APNs dan VAPID, RS256 untuk akun layanan FCM, AES-GCM untuk enkripsi payload Web Push. Semua dikompilasi ke kode asli. Tidak ada `node-gyp`, tidak ada ketergantungan OpenSSL.

## Perry Hub + Builder: Build Cloud Terdistribusi

Ini adalah permainan infrastruktur. `perry-hub` adalah server orkestrasi build — yang dikompilasi dari TypeScript oleh Perry — yang mengelola kumpulan pekerja build. Anda mendorong proyek Anda, hub mengirimkannya ke pekerja yang tepat berdasarkan platform target, dan pekerja tersebut mengompilasi, menandatangani, dan secara opsional memublikasikan aplikasi Anda.

Ada dua pekerja saat ini: pembuat macOS (menangani macOS, iOS, dan target Android) dan pembuat Linux (menangani Linux dan Android). Keduanya merupakan biner Rust yang terhubung ke hub melalui WebSocket, mendownload tarball sumber, menjalankan compiler Perry, dan mengupload kembali artefak.

-   **Penandatanganan kode** — Notaris Apple untuk macOS, menyediakan profil untuk iOS, penandatanganan keystore Android
-   **App Store** — unggah langsung ke App Store Connect dan Google Play Store
-   **Pengelolaan artefak** — biner buatan yang diunggah ke hub dengan pembersihan berbasis TTL
-   **Manajemen lisensi** — batas tarif per lisensi, antrian prioritas (tingkat pro mendapat prioritas)

Hub itu sendiri adalah studi kasus yang menarik. Ini adalah file TypeScript ~1.500 baris yang dikompilasi ke biner asli 2 MB oleh Perry. Ini menjalankan Fastify pada port 3456 untuk HTTP dan `ws` pada port 3457 untuk WebSocket. Semua status ada di memori dengan persistensi JSON — tanpa database eksternal. Ini adalah jenis server yang dapat Anda terapkan dengan `scp` dan file unit systemd.

## perry-verify: Verifikasi Aplikasi Otomatis

`perry-verify` adalah layanan HTTP mandiri yang mengambil biner terkompilasi dan konfigurasi, menjalankan pipeline verifikasi, dan mengembalikan hasil lulus/gagal terstruktur dengan tangkapan layar. Ini meluncurkan aplikasi, menjalankan alur autentikasi (deterministik atau dibantu AI), memeriksa status, dan mengambil bukti.

Adaptor platform tersedia untuk macOS (melalui API aksesibilitas), Linux (AT-SPI), dan stub untuk iOS Simulator dan Android Emulator. Lapisan AI menggunakan Claude untuk autentikasi fallback dan verifikasi status ketika pemeriksaan deterministik tidak dapat dilakukan. Ini dirancang untuk dimasukkan ke dalam alur pembangunan hub sebagai langkah pasca-pembuatan: kompilasi, penandatanganan, verifikasi, publikasi.

## Pry Hadir di Mana-mana

[Pry](/id/blog/building-pry/), penampil JSON asli yang kami buat sebagai etalase Perry, kini didistribusikan di lima platform. Ada di [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) dan [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), dengan biner asli untuk Linux dan Windows. Basis kode TypeScript yang sama, lima titik masuk khusus platform, lima biner asli. Ini adalah bukti paling nyata bahwa keseluruhan pendekatan ini berfungsi secara menyeluruh — mulai dari sumber TypeScript hingga listingan App Store.

## Apa Arti Semua Ini

Kompiler itu menarik. Ekosistem bermanfaat. Pada minggu lalu, Perry berubah dari "Anda dapat mengkompilasi TypeScript ke asli" menjadi "Anda dapat membuat aplikasi lengkap dengan UI asli, database Prisma, pemberitahuan push, dan build yang dipublikasikan secara otomatis ke App Store."

Bagian-bagiannya mulai terhubung:

-   **perry/ui** adalah jalur paling langsung dari TypeScript ke UI platform asli — status reaktif, 20+ widget, tanpa lapisan abstraksi
-   **perry-prisma/sqlite/postgres** berarti port kode database yang ada dengan sedikit perubahan
-   **perry-Push** berarti notifikasi push asli tanpa pustaka per platform
-   **perry-hub + builders** berarti Anda dapat beralih dari `perry publish` ke App Store dalam satu langkah
-   **perry-verify** berarti pengujian otomatis terhadap keluaran yang dikompilasi, bukan hanya sumbernya
-   **perry-react** berarti pengembang React dapat dengan mudah mengakses Perry menggunakan pola yang sudah dikenal, semua pemetaan ke perry/ui di bawahnya

Ini bukan teori. Setiap perpustakaan yang tercantum di sini memiliki kode kerja, tes, dan dokumentasi. Beberapa sudah digunakan dalam produksi — situs arahan Perry sendiri berjalan di server Fastify yang dikompilasi Perry, dan Pry tersedia di dua toko aplikasi.

## Apa Selanjutnya

Peta jalan langsung:

-   **ekspansi perry/ui** — seret dan lepas, label aksesibilitas, menu konteks khusus, tata letak primitif lainnya
-   **integrasi perry-verify** — verifikasi otomatis dalam pipeline build
-   **Kompatibilitas kerangka kerja** — meningkatkan lapisan React, Angular, dan Ionic sebagai jalan menuju perry/ui
-   **Dukungan regex penuh** — Mesin regex yang kompatibel dengan ECMAScript dikompilasi ke asli

Ikuti perkembangannya di [GitHub](https://github.com/PerryTS/perry), atau periksa [peta jalan](/id/roadmap/) untuk gambaran lengkapnya.
