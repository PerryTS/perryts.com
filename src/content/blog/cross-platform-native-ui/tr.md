---
title: "TypeScript'ten Çapraz Platform Yerel UI"
excerpt: "Perry, bir TypeScript kod tabanını, platforma özgü sınırlamalar ve önkoşullar da dahil olmak üzere, belgelenmiş hedefleri genelinde platform widget'larıyla nasıl eşler?"
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Perry'nin en iddiali hedeflerinden biri, tek bir TypeScript kod tabanindan gercekten yerel GUI uygulamalari sunmaktir. Yerel bir kabukla sarmalanmis web gorunumleri degil. Kendi piksellerini cizen ozel bir renderlama motoru degil. Her platformun kendi UI cercevesi tarafindan renderlanan gercek yerel widget'lar, derleme zamaninda TypeScript'ten derlenmis.

Bu yazi nasil calistigini acikliyor — mimari, platform esleme, odunler ve bugun nerede oldugumuz.

## Mevcut Yaklasimlarin Sorunu

Coklu platform GUI gelistirme onlarca yildir zor bir problem olmustur. Her buyuk cerceve farkli bir odunler seti yapmistir:

### Electron / Tauri (Web tabanli)

Electron, Chromium ve Node.js'yi paketleyerek uygulama kabugunuz olarak bir web tarayicisi sunar. Web platformuna tam erisim elde edersiniz, ancak "yerel" uygulamaniz yuzlerce megabayt RAM kullanan 150+ MB'lik bir indirmedir — sadece bir pencere gostermek icin. Tauri, Chromium'u isletim sistemi web gorunumuyle degistirerek boyutu onemli olcude azaltir, ancak UI'niz hala web gorunumunde renderlanan HTML/CSS'dir — yerel widget'lar degil.

### React Native (Kopru tabanli)

React Native, JavaScript'inizi bir JS motorunda (Hermes veya V8) calistirir ve serializasyon edilmis bir mesaj kuyrugu araciligiyla yerel widget'lara kopru kurar. Gercek yerel widget'lar elde edersiniz, ancak kopru gecikme ekler, ozellikle hareketler ve animasyonlar icin. Karmasik etkilesimler yerel koda (Swift/Kotlin) inmeyi gerektirir, bu da tek kod tabani sozu verilmesini gecirsiz kilar.

### Flutter (Ozel renderlayici)

Flutter, Dart'i yerel koda derler ve her seyi kendi Skia tabanli renderlama motoruyla cizer. Performans mukemmeldir, ancak widget'lariniz yerel degildir — piksel mukemmel kopyalardir. Bu, platform konvansiyonlarinin (kayma fizigi, metin secimi, erisebilirlik davranislari) miras alinmak yerine yeniden uygulanmasi gerektigini ifade eder. Masaustunde farklar daha belirgin hale gelir.

### KMP + Compose Multiplatform (Kismi yerel)

Kotlin Multiplatform, Android'de JVM'ye ve iOS'ta yerel'e derler, ancak Compose Multiplatform araciligiyla paylasilan UI, Skia tabanli bir renderlayici kullanir — Flutter ile ayni odun. Gercekten yerel UI icin platforma ozgu kod yazmaniz gerekir.

## Perry'nin Yaklasimi: Yerel Arac Setlerine Derleme

Perry temelden farkli bir yaklasim benimser. Kodunuzu bir calisma zamaninda calistirip yerel widget'lara kopru kurmak veya ozel pikseller cizmek yerine, Perry TypeScript UI kodunuzu derleme zamaninda dogrudan her platformun yerel arac setine yapilan cagrilara derler.

Onemli fark: **kodunuz ile platform SDK'si arasinda calisma zamani katmani yoktur.** Derlenmis ikili dosya AppKit, UIKit, Android Views, GTK4 veya Win32'yi dogrudan cagirir, tipki Swift, Kotlin veya C++ ile yazilmis bir uygulamanin yapacagi gibi.

## Birlesik UI API'si

Perry, kullanici arayuzleri olusturmak icin ortak bir TypeScript API'si saglar. Bu API bilerek yuksek seviyelidir — UI'nizin ne icermesi gerektigini ve nasil davranmasi gerektigini tanimlarsiniz, Perry onu uygun yerel yapilara esler.

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

Ayni kod alti platformun hepsinde yerel UI'ya derlenir. `#ifdef` yok, platform kontrolleri yok, kosullu import'lar yok.

## Detayli Platform Eslemesi

Perry'nin birlesik API'yi her platformun yerel cercevesine nasil esledigini inceleyelim:

### macOS — AppKit

macOS'ta Perry, AppKit nesnelerini dogrudan olusturan ve yoneten kod uretir. Bir `App`, bir `NSWindow` ile bir `NSApplication` olur. `Text`, `NSTextField` olur (duzenleme devre disi). `Button`, callback'inize baglanmis target-action deseniyle`NSButton` olur. `VStack`, dikey yonelimli bir `NSStackView` olur. Yerlesim Auto Layout kisitlamalari kullanir.

Derlenmis ikili dosya AppKit cercevesine baglanir ve Objective-C calisma zamani fonksiyonlarini dogrudan cagirir. Xcode ile derlenmis Swift'in yapacagi sey budur.

### iOS & iPadOS — UIKit

iOS'ta esleme benzerdir ancak UIKit'i hedefler. `App`, bir `UIWindow` ve kok `UIViewController` ile bir `UIApplication` olur. `Text`, `UILabel`'a eslenir. `Button`, `UIButton`'a eslenir. Yerlesim `UIStackView` ve Auto Layout kullanir. Dokunma olaylari UIKit'in yanitlayici zinciri araciligiyla islenir.

### Android — JNI + Görünümler

Android'de Perry, JNI (Java Native Interface) araciligiyla yuklenen yerel bir kutuphane uretir. `App`, bir `Activity`'ye eslenir. `Text`, bir `TextView` olur. `Button`, bir `OnClickListener` ile`android.widget.Button` olur. `VStack`, dikey bir `LinearLayout`'a eslenir. Yerel kod, JNI araciligiyla Android cercevesine geri cagri yapar, gercek Android view'larini olusturur ve manipule eder.

### Linux — GTK4

Linux'ta Perry, GTK4'u hedefler. `App`, bir `GtkApplicationWindow` ile bir `GtkApplication` olur. `Text`, `GtkLabel`'a eslenir. `Button`, bir sinyal isleyicisi ile`GtkButton`'a eslenir. `VStack`, dikey yonelimli bir `GtkBox`'a eslenir. GTK'nin CSS temalamasi, uygulamanizin kullanicinin masaustu temasini otomatik olarak takip etmesi anlamina gelir.

### Windows — Win32

Windows'ta Perry, Win32 API cagilari uretir. `App` bir pencere sinifi olusturur, kaydeder ve bir mesaj dongusu calistirir. `Button`, `CreateWindowEx` ile olusturulan bir`BUTTON` kontrolu olur. `Text`, bir `STATIC` kontrole eslenir. Olaylar Win32 mesaj pompasi araciligiyla islenir (`WM_COMMAND`, `WM_NOTIFY` vb.).

## Durum Yonetimi

Perry'nin `State<T>` temeli, platforma yerel guncelleme mekanizmalarina derlenen reaktif durum yonetimi saglar. Bir durum degeri degistiginde, Perry platformun kendi gecersiz kilma sistemi araciligiyla bir UI guncellemesi tetikler — macOS/iOS'ta `setNeedsDisplay`, Android'de `invalidate()`, Linux'ta `gtk_widget_queue_draw`.

Sanal DOM farkliligi yok, uzlasma gecisi yok, serializasyon yok. Durum degisiklikleri degeri gosteren yerel widget'a dogrudan yayilir.

## Neden SwiftUI / Jetpack Compose Sozdizimi Degil?

Perry'nin neden SwiftUI veya Jetpack Compose'a benzer bir bildirimsel sozdizimi kullanmadigini merak edebilirsiniz. Cevap pragmatiktir: Perry TypeScript derler ve TypeScript'in kendi deyimleri vardir. TypeScript gelistiricilerine yabanci gelen bir DSL icat etmek yerine, Perry TypeScript'te dogal hissettiren bir olusturucu tarzi API kullanir — yapicilar, metot cagrilari, geri cagirmalar ve kapanimlar. Express, React hook'lari veya herhangi baska bir TypeScript kutuphanesiyle calisirken zaten kullandiginiz kaliplardir.

## Bugun Mevcut Olan

Alti platform arka ucunun tamami uygulanmis ve kararlıdır. Mevcut widget seti sunlari icerir:

-   **Yerlesim** — VStack, HStack, Spacer, ScrollView, Divider
-   **Goruntuleme** — Text, Image
-   **Giris** — Button, TextField, Toggle, Slider
-   **Navigasyon** — NavigationView, TabView, List
-   **Konteynerler** — TreeView, SearchBar, StatusBar
-   **Durum** — reaktif guncellemeler icin State<T>

## Sirada Ne Var

Widget kutuphanesini aktif olarak genisletiyoruz. Siradakiler:

-   `SecureField` — platforma yerel guvenli metin girisi ile sifre alani
-   `ProgressView` — belirli ve belirsiz ilerleme gostergeleri
-   `Alert` — butonlar ve metin alanlari ile yerel uyari diyaloglari
-   `DatePicker` — platforma yerel tarih/saat secimi
-   `Menu` — yerel menu cubugu ve baglam menuleri

Hedef tum platformlarda tam GUI cerceve paritesidir — her widget, yerlesim, hareket ve animasyon her yerde mevcut. Tam resim icin [yol haritasina](/tr/roadmap/) bakin.

## Deneyin

Perry'nin yerel UI'sini anlamanin en iyi yolu onu calisirken gormektir. [Pry](/tr/showcase/pry/), tamamen TypeScript ile Perry kullanilarak olusturulmus yerel bir JSON goruntuluyucudur — agac navigasyonu, arama ve klavye kisayollariyla gercek bir uygulama, macOS, iOS ve Android'de yerel ikililer olarak derlenmistir. Nasil yapildiginin [tam anlatimini](/tr/blog/building-pry/) okuyun.
