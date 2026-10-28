---
title: "Gerçek Çok İş Parçacığı, Derleme Zamanı i18n ve watchOS"
excerpt: "Perry v0.4.0: derleme zamanı güvenliği ile gerçek işletim sistemi iş parçacıkları, 30'dan fazla dil için sıfır tören uluslararasılaştırma sistemi, 9. derleme hedefi olarak watchOS, ses ve kamera API'leri ve paralel derleyici pipeline'ı."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0, projenin başlangıcından bu yana en büyük sürüm. Tek bir döngüde üç versiyon atlayışı — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — ve derleyicinin kendisi artık paralel. İşte gönderilen her şey.

## Gerçek Multi-Threading

Perry artık gerçek işletim sistemi iş parçacığı paralelliğine sahip. Serileştirme yükü olan web worker'lar değil. `Atomics` ile `SharedArrayBuffer` değil. Gerçek iş parçacıkları — hiçbir şey paylaşmayan ve boş kaldığında maliyet oluşturmayan 8MB yíğın boyutlu hafif işletim sistemi iş parçacıkları.

Yeni `perry/thread` modülü üç temel yapı sunar:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` ve `parallelFilter` CPU çekirdek sayısını otomatik olarak algılar ve giriş dizisini aralarında böler. Küçük diziler için iş parçacığını tamamen atlar ve eşzamanlı çalışır — önemsiz iş yükleri için sıfır yük.

`spawn` bir arka plan işletim sistemi iş parçacığı başlatır ve bir Promise döndürür. Sonuç, mikrogörev işleme sırasında boşaltılan bekleyen sonuçlar kuyruğu aracılığıyla geri akar, böylece diğer herhangi bir asenkron işlem gibi `await` edersiniz.

### Derleme Zamanı Güvenliği

En önemli kısım API değil — derleyicinin *engellediği* şeydir. Perry, değiştirilebilir değişkenleri yakalayan closure'ları statik olarak reddeder:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

Paylaşılan değiştirilebilir durum olmaması, veri yarışı olmaması demektir. Lock yok, mutex yok, `Atomics` yok. Derleyici, tek bir makine kodu satırı yayılmadan önce iş parçacığı güvenliğini sağlar.

### Kaputun Altında

Her çalışan iş parçacığı, `Drop` temizliği ile kendi bellek arenasını alır — iş parçacıkları arasında GC koordinasyonu yok. Değerler, `SerializedValue` derin kopya yoluyla aktarılır: sayılar için sıfır maliyet, dizeler, diziler ve nesneler için O(n). Uygulama tek bir 1.120 satırlık Rust dosyasında (`perry-runtime/src/thread.rs`) bulunur ve çöp toplayıcıda hiçbir değişiklik gerektirmemiştir.

Bunu, her biri ~2MB yük ile worker başına ayrı heap gerektiren V8 isolate'ları ile karşılaştırın. Perry'nin iş parçacıkları sadece arenalı pthread'lerdir.

### Paralel Derleyici İş Hattı

Derleyicinin kendisi de artık paralel. Modül codegen, dönüşüm geçişleri (JS import'ları, yerel örnekler, monomorfizasyon) ve `nm` sembol taraması hepsi rayon aracılığıyla tüm CPU çekirdeklerinde çalışır. Cranelift 0.121 yükseltmesiyle birleştirildiğinde (0.113'ten — sekiz küçük sürüm kayıt tahsisi ve x64 iyileştirmesi), derleme önemli ölçüde daha hızlıdır.

## Derleme Zamanı i18n (v0.3.0)

Perry'nin uluslararasılaştırma sistemi sıfır tören içerir. UI widget'larındaki string sabit değerleri otomatik olarak yerelleştirilebilir anahtarlar olarak ele alınır. Çeviri dosyaları, `locales/` dizinindeki düz JSON'dur. Tüm doğrulama derleme zamanında gerçekleşir.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

Derleyici her şeyi doğrular: eksik çeviriler, parametre uyumsuzlukları, çoğul form hataları. Çeviriler, neredeyse sıfır çalışma zamanı araması ile gömülü 2D dize tablosu olarak ikili dosyaya yerleştirilir — başlangıçta JSON ayrıştırma yok.

### Neleri İçeriyor

-   **CLDR çoğul kuralları** 30'dan fazla yerel ayar için `.one`/`.other`/`.few`/`.many`/`.zero`/`.two` sonekleriyle
-   **Format sarmalayıcıları**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Tüm platformlarda yerel locale algılama**: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: TS/TSX dosyalarını tarar, locale JSON iskelelerini oluşturur ve günceller
-   **Platform yerel kaynak üretimi**: iOS `.lproj` ve Android `values-xx/` dizinleri
-   **`import { t } from "perry/i18n"`** UI olmayan dizeleri yerelleştirmek için

`perry.toml`'da yapılandırın:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## watchOS Yerel Uygulamaları (v0.3.2)

Perry artık watchOS için derliyor — 9. derleme hedefi. Bu bir sarmalayıcı veya eşlikçi uygulama değil. Yerel SwiftUI arayüzüne sahip bağımsız bir watchOS ikili dosyasıdır.

watchOS oluşturucusu **veri güdümlü bir yaklaşım** kullanır: Perry, `perry_ui_*` FFI çağrıları aracılığıyla bir UI ağacı oluşturur ve gönderilen bir `PerryWatchApp.swift` ağacı sorgular ve SwiftUI görünümlerini reaktif olarak oluşturur. Desteklenmeyen olanlar için stub'larla birlikte 15 widget türü desteklenir.

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

Tam akış çalışır: `perry setup watchos` App Store Connect kimlik bilgilerini iOS ile paylaşır, `perry run watchos` Apple Watch simülatörlerini otomatik algılar ve `perry publish watchos` App Store'a gönderir.

Bu ayrıca toplam **widget hedef sayısını dörde** çıkarır: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) ve Wear OS (Tiles). Her birinin kendi derleme hedefi ve codegen arka ucu vardır.

## Ses ve Kamera API'leri

Bu sürümde iki yeni donanım API'si:

### Ses Yakalama (`perry/system`)

A-ağırlıklı dB(A) ölçümü ile platformlar arası ses yakalama:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

Platform arka uçları: AVAudioEngine (macOS/iOS), JNI aracılığıyla AudioRecord (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Kamera Yakalama (`perry/ui`)

Piksel düzeyinde renk örnekleme ile yerel kamera önizlemesi (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## Ekosistem Paketleri

İki birinci taraf yerel paket başlatıldı:

-   **perry/push** — iOS/macOS için push bildirim bağlamaları: izin istekleri, APNs token alma, rozet sayısı. FCM planlanan Android stub'ı.
-   **perry/storekit** — StoreKit 2 uygulama içi satın alma bağlamaları: ürün yükleme, JWS makbuzlu satın almalar, abonelik kontrolü, geri yükleme ve işlem dinleyicileri.

Her ikisi de aynı mimariyi izler: TypeScript bildirimleri → Rust FFI crate → Swift köprüsü. Bağımlılık olarak kurun, fonksiyonları içe aktarın, sonuçları `await` edin. Derleyici tüm yerel köprülemeyi halleder.

## Altyapı

-   **Cranelift 0.113 → 0.121** — sekiz küçük sürüm kayıt tahsisi, x64 düzeltmeleri ve yığın yuvası hizalama iyileştirmeleri
-   **Windows fonksiyon bölme** — 50'den fazla ifadeli fonksiyonları Windows'ta Cranelift codegen sorunlarını aşmak için otomatik olarak devam bölümlerine ayırır
-   **Seçici modül değişkeni yükleme** — fonksiyon girişinde yalnızca referans verilen modül düzeyi değişkenleri yükler, Windows ikili boyutunu %26 azaltır
-   **Array.sort() yükseltmesi** — O(n²) ekleme sıralamasından O(n log n) TimSort tarzı hibrite
-   **perry run android** — tam APK build iş hattı: derleme, Gradle proje üretimi, assembleDebug, kurulum, başlatma
-   **Özel Info.plist girişleri** — gizlilik açıklamaları, URL şemaları, arka plan modları için perry.toml'da `[ios.info_plist]`

## Rakamlarla

-   **Sürüm**: 0.2.197 → 0.4.0 (üç büyük kilometre taşı)
-   **Derleme hedefleri**: 8 → 9 (watchOS eklendi)
-   **Widget hedefleri**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Yeni crate'ler**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Yeni belgeler**: threading (4 sayfa), i18n (4 sayfa), watchOS, genişletilmiş widget belgeleri (3 → 8 sayfa)
-   **perry/thread uygulaması**: 1.120 satır Rust, GC'de sıfır değişiklik

## Sırada Ne Var

Threading temeli birçok şeyi açıyor: paralel HTTP istek işleme, eşzamanlı dosya işlemleri ve daha önce tek iş parçacıklı yürütme tarafından engellenen hesaplama yoğun iş yükleri. Dil tarafında, tam regex desteği en büyük açık olmaya devam ediyor ve `perry/ui` genişlemesi (sürükle bırak, erişilebilirlik, DatePicker) devam ediyor.

İlerlemeyi [GitHub](https://github.com/PerryTS/perry)'da takip edin, belgeleri [docs.perryts.com](https://docs.perryts.com)'da okuyun veya tam resim için [yol haritasına](/tr/roadmap/) göz atın.
