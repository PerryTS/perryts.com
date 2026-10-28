---
title: "npm Dağıtımı, perry dev ve Her Benchmark'ı Kazanmak"
excerpt: "Perry v0.5.80 → v0.5.174 altı günde. @perryts/perry, desteklenen tüm yedi platform için npm'de yayında. perry dev, bellek içi AST cache'i ve modül başına disk üstü nesne cache'inin üstüne watch-mode otomatik yeniden derleme ekliyor. json_roundtrip son açığını kapatıyor — Perry artık hem Node.js hem de Bun'a karşı her benchmark'ı kazanıyor."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
Son yazı Perry v0.5.80'de ve benchmark tablosunda inatçı bir yenilgiyle kapanmıştı: `JSON.parse`/`stringify` roundtrip hâlâ Node'dan 1,6 kat daha yavaştı. Altı gün sonra Perry **v0.5.174**'te — yani **94 patch sürümü** — ve her şeyden önce dikkat çekmeye değer üç şey değişti:

-   `@perryts/perry` **npm**'de yayında. Tek komut Perry'yi desteklenen her platforma kurar.
-   **`perry dev`**, yeni bir bellek içi AST cache'inin ve modül başına disk üstü nesne cache'inin üstüne watch-mode otomatik yeniden derleme ekliyor.
-   `json_roundtrip` yenilgisi kapandı. Perry artık ana benchmark suite'inde **Node ve Bun'a karşı her benchmark'ı kazanıyor** (her ikisine karşı 15/15).

Yazının geri kalanı yardımcı kadro: WebAssembly düzeltmeleri, nihayet uçtan uca derlenen watchOS, `perry/thread` primitive'lerinin geri kalanının da devreye alınması ve sessiz düşüşleri gerçek hatalara dönüştüren bir grup derleme zamanı katılık kazancı.

## 1\. `@perryts/perry` npm'de

Perry her zaman macOS'ta Homebrew ve Debian/Ubuntu'da APT üzerinden kurulmuştur. O platformlardaki geliştiriciler için iyi kapsama, kaynaktan derlemedikleri sürece Windows kullanıcıları için hiçbir şey ve Mac, Linux ve Windows'u karıştıran bir ekipte tutarlı hiçbir şey yok. v0.5.107 bu sorunu ortadan kaldırdı.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

Paket, yedi platforma özel opsiyonel pakete bağımlı ince bir launcher'dır — macOS arm64/x64, hem glibc hem de musl üzerinde Linux x64/arm64, Windows x64 — ve npm yalnızca makinenize uyan olanı kurar. Platform başına binary boyutu düşük tek haneli megabaytlar seviyesinde. Kurulumun kendisi saniyeler sürer. Tercih ederseniz global kurulum yolu (`npm install -g @perryts/perry`) de var, ancak proje-yerel kurulum derleyici sürümünü bağımlılıklarınızın yanına sabitler, ki bu da doğru varsayılandır.

Yayınlama OIDC Trusted Publisher üzerinden yapıldı, böylece her sürümün provenance'ı var ve onu oluşturan CI işine geri bağlı. Bu kendi başına bir günlük CI işiydi — doğru `--provenance` / npm sürümü / workflow yolu kombinasyonunu kovalayan birkaç `v0.5.107` CI commit'i — ama başarıldı ve o zamandan beri her sürüm temiz geldi. Windows kullanıcıları artık birinci sınıf vatandaş ve “OS'unuz nasıl isterse öyle kurun” ekipler arası sürtüşmesi gitti.

## 2. `perry dev` — akıllı saat modu

v0.5.143 yeni bir CLI alt komutu ekledi:

```
perry dev
```

Hepsi bu. Projenizi izler, kaydedildiğinde yeniden derler ve binary'nizi yeniden başlatır. İlham kaynağı Vite ve `nodemon`; amaç ise derleyici-binary iş akışının bir runtime'dan daha yavaş hissettirmek zorunda olduğu numarasını bırakmak. Çoğu proje için `perry dev`, sıcak cache'te bir saniyenin altında yeniden derler.

“Sıcak cache” kısmı önemli. `perry dev`'in yanı sıra iki yeni cache geldi:

-   **Bellek içi AST cache'i** (v0.5.156). Tek bir `perry dev` oturumundaki yeniden derlemeler arasında Perry, diskte değişmeyen her modül için ayrıştırılmış AST'yi saklar. Bir dosyayı düzenlemek tüm modül grafiğini değil, tek bir dosyayı yeniden ayrıştırır.
-   **Modül başına disk üstü nesne cache'i (V2.2)**. Her modül kendi `.o` dosyasına derlenir ve hash'lenir; değişmeyen modüller codegen'i tamamen atlar ve linker cached nesneyi alır. Cache verbose çıktısı [#131](https://github.com/PerryTS/perry/issues/131)'deki spesifikasyonla eşleşiyor ve v0.5.160'daki bir tur denetim sertleştirmesi, eski cache girişlerinin bir header değişikliğinden sonra hayatta kalabileceği uç durumları kapattı.

İki cache üst üste binebilir. Oturumun ilk düzenlemesi tam derleme; bundan sonra her şey yalnızca gerçekten değiştirdiğiniz şeyle orantılı iş yapar. Haftanın tek başına en büyük DX kayması bu.

## 3\. Her benchmark'ta Bun'ı yenmek

v0.5.166'da README'nin dürüst bir çekincesi vardı: Perry, `json_roundtrip`'ta Node'dan 1,6 kat daha yavaştı (1MB, 10K öğeli bir blob üzerinde 50× `JSON.parse` + `JSON.stringify`) ve Bun'dan 2,4 kat daha yavaştı. Issue [#149](https://github.com/PerryTS/perry/issues/149) takibi izledi. v0.5.173'e kadar — yedi gün sonra — o fark kapandı.

| İş yükü | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry artık ana benchmark suite'indeki her iş yükünü kazanıyor — **Node'a karşı 15/15, Bun'a karşı 15/15**, macOS ARM64 üzerinde 5 koşunun en iyisi. Bun 1.3 hâlâ tepe RSS'te önde (`json_roundtrip`'ta Perry'nin 310MB'sine karşı 84MB), dolayısıyla allocator baskısı kapatılacak bir sonraki şey, ama ham latency Perry'nin.

JSON açığının kapanması tek bir değişiklik değildi — bu hafta boyunca süren nesne-düzeni parite çalışmasının birikimiydi: Phase 1 nesne-literali şekil çıkarımı (v0.5.167), serbest fonksiyonlar, sınıf metotları, getter'lar ve arrow'lar için Phase 4 gövde tabanlı dönüş-tipi çıkarımı (v0.5.169) ve Phase 4.1 metot çağrısı dönüş-tipi çıkarımı (v0.5.170). Tema son yazıdakiyle aynı: LLVM'e içinden görebileceği kadar statik yapı verin, gerisini optimizer halleder.

v0.5.164 ayrıca saf-fadd reduction döngülerinde `<2 x double>` paralel-akümülatör otovektorizasyonunu geri getirdi; v0.5.9x→v0.5.16x aralığında bir noktada sessizce gerilemişti. `math_intensive` ve `accumulate`'i Rust/C++/Go/Swift üzerindeki eski 3-4x liderliklerine geri getiren de bu — aynı LLVM, bir `reassoc contract` bayrağı, bir vektorize edilmiş döngü gövdesi.

## 4\. `perry/ui` ve doc-test'ler

Kalan dört perry/ui açığı v0.5.151'de kapandı. Bunun yanı sıra v0.5.119, sessiz perry/ui API kötüye kullanımını “derlenir ve hiçbir şey yapmaz”dan sert bir derleme hatasına çevirdi — aynı mantık v0.5.165'te decorator'lara uygulandı (aşağı bakın). Kötüye kullanımın derleme zamanında yüzeye çıkması her zaman runtime'da çıkmasından daha iyidir.

v0.5.123 bir **doc-examples test harness'ı** ve bir widget galerisi gönderdi. Dokümantasyondaki her TypeScript örneği artık her CI koşusunda derleniyor ve widget galerisi ekran görüntülerini onaylanmış baseline'larla karşılaştırıyor. v0.5.125 bunu bir cross-compile matrisine genişletti: her doküman örneği host platformunun yanı sıra iOS, tvOS, Android, WASM ve Web için de derleniyor, böylece hedefler arası API kayması, gönderen release döngüsü yerine onu tanıtan PR'da yakalanıyor.

Küçük bir yaşam kalitesi kazanımı: `perry check` artık HIR lowering hataları için `file:line:column` yayıyor ([#129](https://github.com/PerryTS/perry/issues/129)), yani editör jump-to-error'ı, konum olmadan genel bir mesaj göstermek yerine çalışıyor.

## 5\. watchOS uçtan uca derleniyor

watchOS geçen ay bir derleme hedefi olarak gönderildi, ancak temiz uçtan uca bir build'in bazı pürüzleri vardı. Bu haftanın watchOS çalışması:

-   **v0.5.113**: `--target watchos` ve `--target watchos-simulator` artık biriken workaround'lar olmadan uçtan uca derleniyor.
-   **v0.5.114**: Metal-surface uygulamaları için `--features watchos-game-loop`.
-   **v0.5.122**: SwiftUI tarafından host edilen render için `--features watchos-swift-app` — SwiftUI'nin uygulama yaşam döngüsüne sahip olmasını ve Perry'nin içindeki UI'yı oluşturmasını istediğinizde.
-   **v0.5.135**: `PERRY_UI_TEST_MODE`, perry-ui-ios ve perry-ui-tvos'a bağlandı; böylece Geisterhand UI testi o iki hedefte macOS ve Linux'taki gibi çalışıyor.

## 6\. `perry/thread` primitive'leri tamamen bağlandı

v0.5.174 (bugün) [#146](https://github.com/PerryTS/perry/issues/146)'yı kapattı: `parallelMap`, `parallelFilter` ve `spawn`, derleme zamanı güvenlik uygulamasıyla codegen yolundan tamamen geçirildi. Mutable yakalamalar derleme zamanında reddediliyor — perry/ui ve decorator'ların artık sahip olduğu aynı derleme zamanı doğruluğu duruşu. v0.4.0 duyurusundan bu yana kısmen bağlı olan thread primitive'leri artık uçtan uca tamamlandı.

## 7\. WebAssembly ve web hedefi

Dikkat çekmeye değer iki WASM düzeltmesi:

-   **v0.5.158**: `--target web`'de (WASM çıkış yolu) birbirini maskeleyen beş birikmiş bug. Bir grup olarak düzeltildi, dolayısıyla web hedefi artık tam `perry/ui` yüzeyi altında sağlam duruyor ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: Bir döngü içindeki `if` içindeki `break`/`continue` WASM'da asılı kalıyordu — native hedeflerde yeniden üretilemeyen bir codegen bug'ı. Düzeltildi ([#135](https://github.com/PerryTS/perry/issues/135)).

Doğruluk tarafında ayrıca: v0.5.157, Android'de `obj.field`'in `NaN` döndürmesini düzeltti ([#128](https://github.com/PerryTS/perry/issues/128)) ve v0.5.162, `sendToClient` ve `closeClient`'ın sessiz no-op'lara derlendiği lanetli bir ws bug'ını düzeltti ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Derleme zamanı katılık kazançları

Bu haftanın bir teması: eskiden sessiz bir başarısızlık olan her şey artık bir derleme hatası.

-   **v0.5.165**: TypeScript decorator'ları HIR'a ayrıştırılıp sonra sessizce düşürülüyordu. Artık dekorasyon noktasında net bir mesajla hata veriyorlar ([#144](https://github.com/PerryTS/perry/issues/144)). v0.5.119'da perry/ui'ye uygulanan aynı uyarı→iptal mantığı.
-   **v0.5.119**: perry/ui API kötüye kullanımı, no-op binary üretmek yerine derleme zamanında reddediliyor.
-   **v0.5.172**: `console.trace()` artık yalnızca mesajı yankılamak yerine stderr'e gerçek bir native backtrace yayıyor ([#20](https://github.com/PerryTS/perry/issues/20)). Sembolik frame'ler `PERRY_DEBUG_SYMBOLS=1` gerektirir; o olmadan adresler alırsınız, ki bu hâlâ yerine geçtiği mesaj-yankılama davranışından fazlasıdır.

## 9\. Toparlama

Haftanın deseni: **dağıtım** (npm), **geliştirici deneyimi** (`perry dev`, artımlı cache'ler) ve **kalan son benchmark yenilgisi kapandı**. Artı, sessiz düşüşleri gerçek hatalara çeviren bir grup derleme zamanı katılığı. Altı gün, 94 patch sürümü, büyük bir DX kayması.

Deneyin:

```
# npm (herhangi bir platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Yinelemeli geliştirme için watch mode
perry dev
```

Kaynak: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
