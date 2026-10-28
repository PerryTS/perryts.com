---
title: "Pry'ı İnşa Etmek: TypeScript'te Yerel Bir JSON Görüntüleyici"
excerpt: "TypeScript'ten Perry çalışma zamanı ve bağlı GC ile makine koduna derlenen yerel bir JSON görüntüleyicisi olan Pry'ı oluşturmanın adım adım açıklaması ve web görünümü yok."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry, tamamen TypeScript ile yazilmis ve Perry ile derlenmis yerel bir JSON goruntuluyucusudur. Bir teknoloji demosu degildir — API yanitlarini, yapilandirma dosyalarini ve veri dokumlerini incelemek icin her gun kullandigimiz gercek bir aractir. Bu yazi nasil yapildigini, nasil derlendigini ve TypeScript'inizin yerel bir uygulamaya derlenmesinde gelistirici deneyiminin nasil oldugunu anlatir.

## Pry Ne Yapar

Pry bir JSON dosyasini okur (veya stdin'den JSON kabul eder) ve onu yerel bir pencerede etkilesimli, gezilebilir bir agac olarak render eder. macOS'un yerlesik Quick Look'unu JSON icin kullandiysaniz, onu hayal edin — ama daha hizli, aranabilir ve klavye odakli navigasyonla.

Ozellik seti:

-   **Agac gorunumu** — nesneler ve diziler icin katlanabilir dugumler, derinlik gostergeleri ve tumunu genislet/daralt
-   **Arama** — anahtarlar ve degerler uzerinde gercek zamanli vurgulama ve eslesme navigasyonu ile tam metin arama
-   **Klavye kisayollari** — ok tuslari ile gezin, enter ile genislet/daralt, slash ile ara, `⌘C` ile kopyala
-   **Pano** — herhangi bir dugum veya alt agaci bicimlenmis JSON olarak kopyala
-   **Sozdizimi renklendirme** — dizeler yesil, sayilar turuncu, boolean'lar mor, null kirmizi
-   **Durum cubugu** — toplam dugum sayisi, mevcut derinlik, dosya boyutu ve ayristirma suresi gosterir

## Kaynak Kodu

Pry standart TypeScript ile yazilmistir. Ozel sozdizimi, makro veya derleme zamani kod uretimi yoktur. Perry'nin UI API'sini kullanir, bu da platforma ozgu koda derlenen yerel widget'lar saglar.

Iste giris noktasi (netlik icin basitlestirilmistir):

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

Isste yerel bir uygulamanin ozudur. Cerceve sablonu yok, derleme yapilandirmasi yok, platforma ozgu dosyalar yok. Tek bir TypeScript dosyasi.

### Yardimci Fonksiyonlar

Pry ayrica JSON agacindaki tum dugumleri ozyinelemeli olarak sayan bir `countNodes` yardimci programi ve dosya boyutlarini goruntulemek icin bir `formatBytes` yardimcisi icerir. Bunlar standart TypeScript fonksiyonlaridir — Perry'ye ozgu hicbir sey yok. Diger her sey gibi yerel koda derlenir.

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

## Pry'i Derlemek

Pry'i Perry ile derlemek tek bir komuttur. Xcode projesi yok, Gradle yapilandirmasi yok, webpack yapilandirmasi yok. Sadece Perry'yi giris dosyasina yonlendirin ve hedefinizi belirtin.

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

Ikili dosya 48 MB'dir cunku tam AppKit UI yiginini icerir — agac gorunumu renderlama, arama vurgulama, sozdizimi renklendirme ve klavye isleme. Karsilastirma icin, ayni uygulama Electron'da 200+ MB olurdu. Sadece CLI olan bir Perry uygulamasi 2-5 MB'ye derlenir.

### iOS

```
$ perry build pry.ts --target ios-arm64
✓ Built executable: pry (52 MB)
```

iOS derlemesi AppKit yerine UIKit'e baglanir. Perry ayni `TreeView` API'sini genisletilebilir bolumlerle `UITableView`'a, `SearchBar`'i `UISearchBar`'a esler ve dokunma olaylari fare olaylarinin yerini alir. iOS derlemesi fiziksel cihazlara ve simulatorlere dagitilabilir.

### Android

```
$ perry build pry.ts --target android-arm64
✓ Built: pry.apk
```

Android derlemesi JNI araciligiyla yuklenen, bir APK'ya paketlenmis yerel bir kutuphane uretir. `TreeView`, genisletilebilir view holder'larla bir `RecyclerView`'a, `SearchBar` bir `TextWatcher` ile bir `EditText`'e ve durum cubugu yerlesimin altindaki bir `TextView`'a eslenir.

## Kaput Altinda Neler Olur

Perry Pry'i derlediginde birden fazla asamadan gecer:

1.  **Ayristirma** — SWC TypeScript kaynagini bir AST'ye ayristirir. `perry/ui` ve `perry/fs`'den ithalatlar Perry'nin yerlesik modul uygulamalarina cozumlenir.
2.  **Tur analizi** — Perry, jenerik `State<string>` ve `State<number>` dahil tum turleri cozer, bunlari somut turlere monomorfize eder.
3.  **Platform cozumlemesi** — Hedef bayragina gore Perry uygun UI arka ucunu secer. Her `TreeView`, `SearchBar` ve `Button` cagrisi platforma ozgu uygulamaya cozumlenir.
4.  **IR uretimi** — Perry, yerel API cagilarini iceren bir ara temsil uretir — macOS/iOS icin Objective-C mesaj gondermeleri, Android icin JNI cagilari, GTK4/Win32 icin C fonksiyon cagilari.
5.  **Kod uretimi** — Cranelift, IR'yi hedef mimari icin yerel makine koduna derler.
6.  **Baglama** — Yerel kod, son calistirilabilir dosyayi uretmek icin platform cercevelerine (AppKit, UIKit, Android NDK, GTK4 veya Win32) karsi baglanir.

## Runtime Yok, Web Views Yok

Bu vurgulanmaya deger cunku Perry ile diger tum TypeScript'ten-yerel'e yaklasimlari arasindaki temel farktir. Derlenmis Pry ikilisinde:

-   **JavaScript motoru yok** — V8 yok, Hermes yok, JavaScriptCore yok
-   **Web views yok** — Chromium yok, WebKit yok, WKWebView yok
-   **Kopru katmani yok** — JS ve yerel arasinda serializasyon edilmis mesajlar yok
-   **Cerceve calisma zamani yok** — React yok, Flutter motoru yok, Dart VM yok

Ikili dosya platform API'lerini dogrudan cagirir. macOS'ta AppKit nesneleriyle etkilesmek icin `objc_msgSend` cagirir. Android'de View'leri olusturmak ve manipule etmek icin JNI fonksiyonlarini cagirir. Yerel bir Swift veya Kotlin uygulamasinin yapacagiyla aynidir.

Pratik sonuc: Pry aninda baslar. VM baslatma yok, JIT isinma yok, betik ayristirma yok. Surec baslar, pencere goruntulenir, JSON render edilir. Bellek kullanimi bir Electron esdegerinin tuketeceginin kucuk bir parcasidir.

## Gelistirici Deneyimi

Pry'i insa etmek herhangi bir TypeScript uygulamasi insa etmeye dikkat cekici olcude benziyordu. Is akisi:

1.  Editorunuzde TypeScript yazin (VS Code, Zed, Neovim, ne tercih ederseniz)
2.  `perry compile pry.ts` calistirin
3.  `./pry test.json` calistirin
4.  Tekrarlayin

Yapilandirilacak Xcode projesi yok. Yuklenecek Android Studio yok. 45 saniye suren Gradle derlemesi yok. Perry derleyicisinin kendisi hizlidir — Pry'i ayristirmak ve derlemek birkac saniye surer ve daha hizli hale getirmek icin aktif olarak calisiyoruz.

Yazdiginiz TypeScript standart TypeScript'tir. Editorunuzun tur kontrolu, otomatik tamamlama ve yeniden duzenleme araclari calisir. Fonksiyonlari cikarabilir, moduller olusturabilir, jenerikler kullanabilirsiniz — zaten bildiginiz tum TypeScript kaliplari.

## Neler Ogrendik

Pry'i insa etmek bize Perry UI API'sinin neyi desteklemesi gerektigi hakkinda cok sey ogretti. Bazi dersler:

-   **Agac gorunumleri karmasiktir.** Genisletme, daraltma, arama vurgulama, klavye navigasyonu ve pano entegrasyonunun koordine edilmesi gerekir. Perry'nin `TreeView` widget'i bunu dahili olarak yonetir, ancak yerel uygulamanin uc platformda da tutarli oldugundan emin olmamiz gerekti.
-   **Klavye kisayollarinin platform konvansiyonlarina ihtiyaci var.** macOS'ta kopyalamak icin `⌘C`. Linux ve Android'de `Ctrl+C`. Perry'nin kisayol sistemi bunu soyutlar, ancak dogru yapilmasi icin dikkatli uygulama gerektirdi.
-   **Durum cubuklari sasirtici olcude onemsiz degildir.** Her platformun durum bilgisini nerede ve nasil goruntuleyecegi konusunda farkli bir konvansiyonu var. AppKit pencerenin alt cubugunu kullanir, UIKit bir arac cubugu kullanir, Android yerlesimde bir alt gorunum kullanir. Perry'nin `StatusBar`'i her birine dogru sekilde eslenir.
-   **Stdin destegi platform farkindaligi gerektirir.** macOS ve Linux'ta stdin'den okumak basittir. iOS ve Android'de "stdin" ayni sekilde mevcut degildir, bu nedenle Pry mobil platformlarda bunun yerine dosya secimi kullanir. Perry'nin `readStdin`'i bunu seffaf bir sekilde yonetir.

## Performans

Pry buyuk JSON dosyalarini rahatca yonetir. Testlerimizde:

-   1 MB JSON dosyasi (10.000+ dugum) 50 ms'nin altinda ayristirilir ve render edilir
-   10 MB JSON dosyasi 200 ms'nin altinda render edilir
-   10.000 dugum uzerinde arama, siz yazarken sonuclari dondurur, gorunur gecikme olmadan
-   Bellek kullanimi buyuk dosyalar icin bile 50 MB'nin altinda kalir

Bu, yerel derlemenin avantajidir. Perry'deki JSON ayristirma, GC duraklamasi olmadan sikistrilmis yerel donguler olarak derlenir. Agac renderlama, platformun kendi sanallastirilmis liste gorunumlerini (NSOutlineView, UITableView, RecyclerView) kullanir, bunlar performans icin savasla test edilmistir.

## Kaynak ve Indirmeler

Pry acik kaynaklidir. Tam kaynaga goz atabilir, kendiniz derleyebilir veya sadece bir Perry yerel UI uygulamasinin nasil yapildigini anlamak icin koda bakabilirsiniz.

-   [GitHub deposu](https://github.com/perryts/pry) — tam kaynak kodu ve derleme talimatlari
-   [Vitrin sayfasi](/tr/showcase/pry/) — ekran goruntuleri, ozellik listesi ve platform detaylari

Perry ile bir seyler insa ediyorsaniz, duymak isteriz. [Perry deposunda](https://github.com/PerryTS/perry) bir sorun acin veya bir tartisma baslatin. Perry'yi acikca insa ediyoruz ve gercek uygulamalar insa eden gercek kullanicilardan gelen geri bildirim paha bicilemez.
