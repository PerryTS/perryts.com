---
title: "Merilis aplikasi khusus Apple Watch ke App Store ketika semua cara lain gagal"
excerpt: "Semua cara terdokumentasi untuk mengunggah aplikasi watchOS mandiri ke App Store gagal: altool, iTMSTransporter, xcodebuild, bahkan Organizer di Xcode 26 menolak platform watchOS. Solusi yang belum terdokumentasi ini berhasil sekaligus mempertahankan arm64_32 untuk Watch lama: bungkus aplikasi dengan stub iOS bertanda ITSWatchOnlyContainer, lalu unggah menggunakan iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** adalah pengukur tingkat suara untuk Apple Watch — aplikasi watchOS mandiri tanpa iPhone, dikompilasi dari satu file TypeScript dengan Perry. Membangun dan menjalankannya di jam tangan pintar adalah bagian yang kami perkirakan akan sulit. Bagian yang sebenarnya memakan biaya sehari adalah memasukkannya *ke dalam App Store*. Setiap jalur upload yang terdokumentasi menolak aplikasi watchOS yang berdiri sendiri, dan solusi yang berhasil hampir tidak dituliskan di mana pun. Postingan ini adalah halaman yang hilang itu.

Versi singkatnya: untuk merilis aplikasi khusus jam tangan pintar, Anda membungkusnya dalam iOS *container stub* yang ditandai `ITSWatchOnlyContainer`, dan mengunggahnya dengan `iTMSTransporter` — bukan Xcode, bukan `altool`. Versi panjangnya memiliki tiga ranjau darat yang masing-masing memerlukan perjalanan pulang pergi ke server Apple untuk menemukannya.

## Aplikasi

dB Meter adalah aplikasi `WKWatchOnly`: aplikasi ini berjalan sendiri di jam tangan pintar, tidak memerlukan aplikasi iPhone yang dipasangkan. Perry mengkompilasi TypeScript langsung ke biner watchOS asli dan mendistribusikannya sebagai potongan **universal** — `arm64` untuk Seri 9/10/11 dan Ultra, ditambah `arm64_32` (ILP32: register 64-bit, pointer 32-bit) untuk Seri 4 hingga 8 dan SE. Potongan kedua itu penting: tanpanya, segala sesuatu mulai dari Seri 4 hingga SE 2 tidak dapat menginstal aplikasi. Menjaga `arm64_32` tetap hidup ternyata menjadi kendala yang mengesampingkan solusi yang jelas.

## Tidak ada yang bisa mengupload aplikasi jam tangan pintar mandiri

`.ipa` khusus jam tangan pintar adalah paket yang aplikasi tingkat atasnya mendeklarasikan `CFBundleSupportedPlatforms = [WatchOS]`. Alat pengiriman baris perintah Apple tidak tahu apa yang harus dilakukan dengan hal itu:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Jadi, Anda beralih ke Xcode. Namun `xcodebuild -exportArchive` dengan `method: app-store-connect` gagal selama enumerasi metode, dan alasannya bersifat instruktif — pada Xcode 26 registri metode distribusi *tidak memiliki App Store sama sekali* untuk arsip watchOS:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

GUI Penyelenggara menampilkan tiga ubin yang sama persis — Pengujian Rilis, Perusahaan, Debugging, dan "Kustom" yang tidak berguna. Ad hoc, perusahaan, pengembangan. Tidak ada App Store. Pada versi Xcode yang diinstal saat ini, tidak ada cara yang didukung untuk mendorong aplikasi jam tangan pintar mandiri ke App Store Connect melalui pintu depan Apple sendiri.

## Perangkap pendamping

Pintu keluar yang menarik adalah berhenti menggunakan jam tangan pintar saja. Kirimkan aplikasi iOS asli yang *menyematkan* aplikasi jam tangan pintar di `Payload/YourApp.app/Watch/`, cara aplikasi jam tangan pintar dikirimkan selama bertahun-tahun. Pengunggahan tersebut berjalan lancar dengan `altool --type ios`, karena paket tingkat teratas adalah aplikasi iOS normal.

Ini juga membawa Anda ke dalam dua masalah. Pertama, App Store Connect kini melihat aplikasi iPhone dan **meminta iPhone screenshot** — dan aplikasi iPhone yang tidak melakukan apa pun selain mengatakan "buka ini di jam tangan pintar Anda" adalah kandidat untuk penolakan fungsionalitas minimum 4.2. Kedua, dan fatal bagi kami: biner iOS *tingkat atas* tidak boleh berisi irisan `arm64_32`. Validator Apple menolaknya:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

Jadi, struktur pendamping memaksa Anda untuk menghapus `arm64_32` dan menggunakan arm64 saja, yang akan menghentikan setiap jam tangan pintar Seri 4–8 dan SE — termasuk Seri 7 yang kami uji. Perangkap pendamping menukar dukungan jam tangan pintar lama Anda dengan unggahan yang berfungsi. Kami tidak menginginkan perdagangan itu.

## Wadah khusus jam tangan pintar

Jawaban sebenarnya menjadikan aplikasi jam tangan pintar hanya untuk jam tangan pintar *dan* mempertahankan `arm64_32`. Anda menempatkan aplikasi jam tangan pintar di dalam iOS **container stub** kecil, dan Anda menandai stub tersebut sehingga App Store Connect memperlakukan semuanya sebagai produk khusus jam tangan pintar. Dua kunci Info.plist melakukan penandaan, dan itulah keseluruhan triknya:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` memberi tahu App Store Connect “paket iOS ini hanyalah sarana penyampaian aplikasi jam tangan pintar di dalamnya.” Kunci tunggal itulah yang menghilangkan persyaratan tangkapan layar iPhone — toko mengklasifikasikan produk sebagai produk jam tangan pintar saja. `LSApplicationLaunchProhibited=true` menyatakan bahwa stub tidak pernah diluncurkan, sehingga tidak perlu berupa aplikasi nyata; itu hanya perlu ada sehingga platform tingkat atas terbaca sebagai iOS dan alat pengiriman tidak lagi mengeluh. Aplikasi jam tangan pintar di dalamnya menyimpan `WKWatchOnly=true` dan *no* `WKCompanionAppBundleIdentifier` — aplikasi ini bukan pendamping stub, stub adalah pembungkus di sekelilingnya.

Kunci Info.plist stub yang tersisa adalah boilerplate yang harus digunakan oleh validator: `UIDeviceFamily=[1,2]`, keempat `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]`, dan — karena stubnya adalah arm64 — `UIRequiredDeviceCapabilities=[arm64]`. Rintisan tersebut tidak memuat ikon sama sekali; aplikasi jam tangan pintar membawanya.

Kemudian Anda mengunggah dengan `iTMSTransporter`, yang mode `-assetFile` sekarang sudah senang karena paket tingkat teratas adalah iOS:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

Build ini berada di App Store Connect sebagai watchOS build, `arm64_32` utuh, dan versi tersebut tidak lagi meminta iPhone tangkapan layar.

## Tiga ranjau darat dalam perjalanan

Masing-masing merupakan unggahan gagal yang berasal dari validator Apple, bukan sesuatu yang tertangkap oleh alat lokal:

1.  **Stub tidak boleh berupa biner baru hasil `swiftc`.** Mengompilasi stub UIKit sederhana dengan iOS SDK dari Xcode yang terpasang membuatnya ditolak sebagai *“dibangun dengan SDK atau versi Xcode yang tidak didukung”* (error 90534), karena SDK itu dianggap prarilis. Kami sudah memiliki biner iOS sungguhan dengan versi SDK yang diterima: keluaran `--target ios` dari Perry. Perry menautkan runtime-nya sendiri dan mencatat versi SDK yang sudah dirilis, sehingga lolos di tempat `swiftc` gagal. Stub itu adalah layar “ini aplikasi Apple Watch” yang dikompilasi dengan Perry dan, berkat `LSApplicationLaunchProhibited`, sebenarnya tidak pernah dijalankan.

2.  **Ikon memerlukan dict, bukan hanya kunci.** Aplikasi jam tangan pintar gagal validasi dengan *“nilai untuk CFBundleIconName tidak ada”* meskipun `CFBundleIconName` telah disetel dan `Assets.car` hadir. Validator menginginkan struktur lengkap: `CFBundleIconName` *dan* kamus `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}`. Tetapkan hanya kunci tingkat atas dan kunci tersebut akan tetap hilang.

3.  **`WKWatchOnly` ditolak pada rekaman yang sudah mendistribusikan build iOS.** Jika rekaman App Store Anda pernah mengirimkan iOS build, unggahan khusus jam tangan pintar ke dalamnya ditolak, dan Anda memerlukan catatan aplikasi baru (yang tidak dapat dibuat oleh API ASC — `POST /apps` mengembalikan 403, jadi Anda membuatnya di UI web). Catatan yang hanya memiliki build *tidak terdistribusi* tidak masalah.


Beberapa invarian yang lebih kecil: stub dan aplikasi jam tangan pintar harus berbagi `CFBundleVersion` yang sama, dan Anda keluar-masuk — aplikasi jam tangan pintar terlebih dahulu, lalu stub — dengan `--generate-entitlement-der` dan `get-task-allow=false`.

## Mengapa ini menjadi cerita Perry

Tidak ada satu pun pipa kontainer yang khusus Perry — ini berlaku untuk aplikasi watchOS yang berdiri sendiri, apa pun pembuatnya. Namun Perry adalah alasan mengapa dB Meter adalah file TypeScript 280 baris yang pertama kali dikompilasi ke biner jam tangan pintar asli, dan Perry itulah yang menghasilkan rintisan SDK-clean iOS yang berhasil melewati kesalahan 90534 ketika `swiftc` tidak bisa. Kompilasi untuk `arm64_32` juga menghilangkan bug codegen yang sebenarnya - bidang string objek yang diketik dibaca kembali sebagai pelampung sampah di ILP32 karena akses bidang kelas inline dimasukkan dalam ukuran header objek 64-bit (24 byte) dan bukannya target-aware 20 — hal yang hanya Anda temukan saat Anda bersikeras untuk mendukung jam tangan lama alih-alih menjatuhkannya secara diam-diam.

Keseluruhan pipeline — TypeScript ke biner watchOS universal ke build App Store khusus jam tangan pintar yang ditandatangani — kini berada dalam skrip yang dapat kita jalankan kembali. Jika Anda merilis aplikasi jam tangan pintar mandiri dan Xcode memberi tahu Anda bahwa aplikasi tersebut tidak dapat dilakukan, aplikasi tersebut dapat: membungkusnya, menandainya `ITSWatchOnlyContainer`, dan menyerahkannya ke `iTMSTransporter`.
