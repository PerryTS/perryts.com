---
title: "Altı Platformun Tamamında Tam Özellik Eşitliği"
excerpt: "20'den fazla yerel UI widget'ı, Canvas widget'ı, Table view'lar, sistem bildirimleri, keychain erişimi, çoklu pencere desteği ve macOS, iOS, iPadOS, Android, Linux ve Windows genelinde tam özellik eşitliği — tek bir TypeScript kod tabanından."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Perry'nin yerel UI sisteminin ilk surumunu gonderdigimizde "coklu platform" macOS'un iyi calisip diger bes platformun stub oldugu anlamina geliyordu. Bugun v0.2.162 ile bu artik gecerli degil. Alti platformun tamami — macOS, iOS, iPadOS, Android, Linux ve Windows — artik tam ozellik paritesini paylasiyor. Ayni TypeScript kodu her hedefte yerel widget'lara derleniyor.

Bu yazi v0.2.152 ve v0.2.164 arasinda neler gonderdigimizi kapsiyor: bir Canvas widget'i, tam bir NSTableView uygulamasi, toplam 20'den fazla UI widget'i, `perry/system` modulu, coklu pencere destegi, sistem bildirimleri, anahtarlik erisimi, otomatik ikili boyut azaltma ve derleme zamani eklenti sistemi. Cok sey oldu.

## Widget Sprinti: 20'den Fazla Yerel UI Bileseni

En buyuk atlama v0.2.155'te geldi ve tum platformlarda 20'den fazla UI widget'i getirdi. Perry'nin TypeScript UI API'si artik gercek bir uygulama gondermek icin ihtiyaciniz olan bilesenleri kapsiyor:

-   **Yerlesim** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Giris** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Goruntuleme** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Veri** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Kaplama** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Cizim** — Canvas (2D cizim API'si, platform basina donanim hizlandirilmis)

Bunlar ozel bir renderlayici etrafindaki sarmalayicilar degildir. Her widget platformun kendi yerel bilesenine derlenir: macOS'ta `NSButton`, iOS'ta `UIButton`, Linux'ta `GtkButton`, Android'de JNI araciligiyla `android.widget.Button` ve Windows'ta `CreateWindowEx`. Isletim sistemi onlari cizer, temalar ve erisilebilirlik islenir — Perry sadece TypeScript API'sini baglar.

## Canvas: TypeScript'ten 2D Cizim

Teknik olarak en ilginc eklemelerden biri Canvas widget'idir (v0.2.152). Dogrudan TypeScript'ten taninidik bir 2D cizim API'si sunar ve platformun hizlandirilmis 2D arka ucuna derlenir: macOS/iOS'ta Core Graphics, Linux'ta Cairo, Windows'ta Direct2D ve Android'de Skia.

**canvas.ts**

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

## Table Widget'i: NSTableView TypeScript'e Geliyor

v0.2.163 Table widget'ini getirdi — kutuphanedeki en karmasik bilesen. macOS'ta tam delege/veri kaynagi baglantisiyla `NSTableView`'a eslenir. Linux'ta GTK4'un `GtkTreeView`'unu kullanir. Windows'ta Win32'nin `ListView` kontrolu. Android'de JNI araciligiyla `RecyclerView`'a baglanir.

TypeScript API'si bildirimseldir: sutunlari tanimlar, bir veri kaynagi saglarsınız ve Perry derleme zamaninda platforma ozgu baglantilari yonetir.

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

## perry/system Modulu

v0.2.155 ayrica `perry/system`'i tanitti — hicbir calisma zamani olmadan platform sistem API'lerini sunan bir TypeScript modulu: dosya diyaloglari, kaydetme diyaloglari, uyarilar, sheets, anahtarlik erisimi, sistem bildirimleri ve coklu pencere yonetimi.

-   `system.showOpenDialog()` — yerel dosya secici
-   `system.showSaveDialog()` — yerel kaydetme diyalogu
-   `system.showAlert()` — yerel uyari paneli
-   `system.notify()` — isletim sistemi bildirimi
-   `system.keychain.get/set()` — Anahtar Zinciri Hizmetleri / Gizli Servis / Windows Kimlik Bilgisi Deposu
-   `system.openWindow()` — coklu pencere yonetimi

## Alti Platform Ozellik Paritesi: v0.2.162

v0.2.162 bosluklari kapatmakla ilgiliydi. Bu surumden once macOS en tam ozellik setine sahipti, iOS neredeyse oradaydi ve Linux/Windows/Android gerideydi. v0.2.162 tum platformlari ayni seviyeye getirdi:

-   **macOS** — AppKit, tam widget seti, Keychain, bildirimler, coklu pencere, arac cubugu
-   **iOS / iPadOS** — UIKit, macOS ile tam widget paritesi, sahne yasam dongusu
-   **Android** — JNI koprüsü, Android Views araciligiyla tum widget'lar, NDK capraz derleme
-   **Linux** — GTK4, Table dahil tam widget seti, dosya diyaloglari, libsecret anahtarlik
-   **Windows** — Win32, tum widget'lar, Windows Credential Store, WinRT bildirimleri

## Otomatik Ikili Boyut Azaltma

v0.2.153 otomatik ikili boyut azaltmayi getirdi — derleyici artik kullanilmayan kod yollarini agresif sekilde cikarir, ulasilamaz stdlib fonksiyonlarini eler ve baglama sirasinda sembol tanimlarini tekil hale getirir. Onceden ~4 MB'ye derlenen tipik bir CLI araci artik kaynak kodunuzda sifir degisiklikle 2 MB'nin altina iniyor.

## Derleme Zamani Eklenti Sistemi

v0.2.152 Perry'nin eklenti sistemini tanitti. Calisma zamani eklenti yuklemesi yok, IPC yok, dinamik `require()` yok. Eklentiler Perry'nin derleme zamaninda cozdugu TypeScript modulleridir.

Bunun arkasindaki felsefeyi [Eklenti Sistemleri Performans Vergisidir](/tr/blog/plugin-systems-are-a-performance-tax/) yazisinda yazdik. Calisma zamani eklenti mimarileri performansi genisletilebilirlik icin takas eder. Derleme zamani bilesimi ikisini birden verir.

## Dil Iyilestirmeleri

UI sprinti tek basina gerceklesmedi — derleyicinin kendisi de daha yetenekli olmaya devam etti:

-   **Sinif ifadeleri** — `const Foo = class extends Bar {}` artik dogru derleniyor
-   **Generator donusumleri** — `function*` ve `yield` yerel durum makinelerine derleniyor
-   **Sinif alani olarak Map/Set** — `private items = new Map()` codegen'de calisiyor
-   `string.match()` — artik tam olarak destekleniyor
-   **Web hedefi** — Perry karma dagitimlar icin web uyumlu ciktiya derleyebiliyor

## Sirada Ne Var

Alti platform UI paritesi gonderildigine gore sonraki asama genislik yerine derinliktir:

-   Tam RegExp destegi
-   Surukle birak, ozel baglam menuleri ve erisilebilirlik etiketleri
-   Perry teshis icin VS Code uzantisi
-   Paket yoneticisi entegrasyonu
-   WASM derleme hedefi
-   `Worker` iplikleri araciligiyla coklu is parcacigi

Takip etmek istiyorsaniz [Perry deposu](https://github.com/PerryTS/perry) aciktir. [Vitrine](/tr/showcase/) bakarak neler yapildigini gorun veya [yol haritasina](/tr/roadmap/) goz atin.
