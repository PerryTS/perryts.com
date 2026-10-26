---
title: "tvOS, Linux'tan iOS Çapraz Derleme ve Perry Login"
excerpt: "Perry v0.4.24: 10. derleme hedefi olarak tvOS, ld64.lld ile Linux'tan iOS ve macOS çapraz derleme, kullanım bazlı faturalandırma ile perry login, Windows UI yenilemesi, macOS noter onayı ve 5 günde 120 commit."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Beş gün, 120 commit ve Perry v0.4.0'dan v0.4.24'e atlıyor. Öne çıkanlar: tvOS 10. derleme hedefi oluyor, iOS ve macOS uygulamaları artık tamamen Linux'tan oluşturulabiliyor, perry login kullanıma dayalı faturalandırma getiriyor ve Windows UI kapsamlı bir yenileme alıyor. İşte gönderilen her şey.

## tvOS: 10. Derleme Hedefi

Perry artık Apple TV için derliyor. tvOS hedefi, watchOS ile aynı SwiftUI oluşturucusunu kullanır ve Perry'nin bir UI ağacı oluşturup gönderilen Swift host uygulamasının onu yerel olarak oluşturduğu veri güdümlü mimariyi paylaşır. Mevcut `@perry/threads` WASM entegrasyonu ile birleştirildiğinde, tvOS uygulamaları UI'yi duyarlı tutarken arka planda hesaplama yoğun iş yüklerini çalıştırabilir.

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

Bu toplam hedef sayısını **10**'a çıkarır: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly ve Web/JavaScript. Tek TypeScript kod tabanı, on yerel çıktı.

## Linux'tan iOS ve macOS Cross-Compile

Perry artık Mach-O bağlayıcısı olarak `ld64.lld` kullanarak iOS ve macOS ikili dosyalarını tamamen bir Linux makinesinden oluşturabiliyor. Bu, tamamen otomatik CI/CD için eksik parçaydı — TypeScript'i bir Linux sunucusuna gönderin, macOS build makinesi olmadan her Apple platformu için imzalı yerel ikili dosyalar alın.

Buraya ulaşmak, bir dizi bağlayıcı sorununu çözmeyi gerektirdi:

-   **Mach-O codegen triple** — Cranelift için `aarch64-apple-macos` ve `aarch64-apple-ios` hedef triple'ları eklendi
-   **Framework bağlama** — cross-compile için CoreGraphics, Metal, IOKit, DiskArbitration framework arama yolları
-   **`-lobjc`** — tüm Apple hedefleri için gereken ObjC çalışma zamanı sembolleri
-   **SDK sürümü** — ld64.lld'de `sdk_version 26.0` (Apple, iOS 18+ gerektirir)
-   **Ölü kod temizleme** — Mach-O bağlayıcısı için `-Wl,-dead_strip` yerine `-dead_strip`
-   **Çalışma zamanı tekilleştirme** — bağlama hatalarını önlemek için UI statik kütüphanelerinden tekrarlanan `perry_runtime`'ı kaldırma

Mevcut Linux → Windows cross-compilation (v0.2.195+) ile birleştirildiğinde, Perry artık **Linux'tan tüm platformlara** cross-compile yapabilir — iOS, macOS, Windows, Android, WASM ve Web.

## iOS App Store Hazırlığı

Bu döngünün önemli bir odağı, Perry ile derlenen iOS uygulamalarını tam App Store uyumlu hale getirmekti:

-   **Tam Info.plist** — Apple tarafından gereken tüm anahtarlar: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — standart iOS ikon adlandırması (`AppIcon60x60@2x`, vb.) yedek çözünürlük ile
-   **perry.toml'dan sürüm** — `version` ve `build_number` alanları doğrudan Info.plist'e akar
-   **UILaunchScreen** — `UILaunchStoryboardName` yerine modern anahtarı kullanır (storyboard dosyası gerekmez)
-   **Hazırlama profilleri** — App Store ve TestFlight dağıtımı için macOS hazırlama profili desteği

## Perry Login ve Faturalandırma

Perry artık yeni bir `perry login` CLI komutu ve [app.perryts.com](https://app.perryts.com)'daki bir pano tarafından desteklenen hesaplara ve kullanıma dayalı faturalandırmaya sahip.

### Nasıl Çalışır

-   **`perry login`** — GitHub OAuth cihaz akışı, tarayıcı açar, tamamlanma için yoklar
-   **Ücretsiz plan** — ayda 15 build, GitHub hesabıyla sınırsız proje
-   **Pro plan** — Polar.sh aboneliği ile sınırsız build
-   **API token'ları** — CI/CD için panodan token oluşturma ve yönetme
-   **Kullanım takibi** — gerçek zamanlı kullanım çubukları ile aylık publish ve verify sayaçları

Panonun kendisi, Next.js statik dışa aktarımı ile Perry derlenmiş bir Fastify sunucusudur — Perry ile oluşturulmuş, Perry kullanıcılarına hizmet veriyor.

## macOS Noter Onayı ve Kod İmzalama

İki yeni imzalama yeteneği:

-   **`perry publish macos --notarize`** — otomatik olarak Developer ID sertifikasına geçer (App Store sertifikası yerine), Apple'ın noter onay hizmetine gönderir ve sonucu ekler
-   **GCloud KMS kod imzalama** — Windows build'leri artık Google Cloud KMS anahtarları kullanılarak imzalanabilir, özel anahtarları açığa çıkarmadan CI'da otomatik imzalamayı mümkün kılar

## Windows UI Yenilemesi

Windows UI arka ucu şimdiye kadarki en kapsamlı güncellemesini aldı:

-   **DPI duyarlı ölçekleme** — pencere boyutu, yazı tipleri ve widget boyutları yüksek DPI ekranlarda doğru şekilde ölçeklenir
-   **Launcher tarzı pencere API'leri** — launcher/spotlight tarzı UI'ler için özel konumlandırmalı çerçevesiz pencereler
-   **Global kısayol tuşları** — uygulama odaklanmamış olsa bile çalışan sistem genelinde klavye kısayolları
-   **Uygulama ikonları** — launcher UI'lerinde uygulama ikonlarını görüntülemek için `getAppIcon` API
-   **Yeniden giriş güvenli yerleşim** — iç içe WM\_PAINT mesajları sırasında panik'leri önlemek için `RefCell` tabanlı boyama, `SetPropW` HWND depolaması ile değiştirildi
-   **Geisterhand entegrasyonu** — tüm widget türleri UI test çerçevesine kaydedildi, `/type` HWND haritası aracılığıyla `SendMessageW` kullanır
-   **Android kamera desteği** — kamera yakalama API'si JNI aracılığıyla Android'e genişletildi

## Performans

v0.4.14, kapsamlı bir performans denetimi ile geldi:

-   **Yerel `fcmp`** — kayan nokta karşılaştırmaları, çalışma zamanı fonksiyon çağrıları yerine yerel CPU talimatları kullanır. Mandelbrot benchmark'ı **%30 daha hızlı**.
-   **Yerinde string ekleme** — `str += "text"` yeni bir string tahsis etmek yerine buffer'ı yerinde değiştirir. Tekrarlanan birleştirme için **125x daha hızlı**.
-   **Kısa devre AND/OR** — `&&` ve `||` sonuç zaten belirlendiğinde sağ operand'ın değerlendirmesini atlar.
-   **Negatif sabit katlama** — `-1`, `-0.5` vb. bir olumsuzlama talimatı yaymak yerine HIR düzeyinde sabitlere katlanır.

## Hub Paralel Build'ler

Build orkestrasyon sunucusu artık işçi başına eşzamanlı build'leri destekliyor:

-   **Slot tabanlı gönderim** — işçiler `max_concurrent` kapasiteyi bildiriri, Hub işçi başına aktif işleri takip eder
-   **Artık 429 yok** — tüm işçiler meşgul olduğunda işler reddedilmek yerine kuyruğa alınır
-   **Base64 artefakt indirmeleri** — Perry çalışma zamanı ham ikili HTTP yanıtlarını işleyemediğinde ikili artefaktlar base64 olarak sunulur
-   **WebSocket otomatik yeniden bağlantı** — build izleme bağlantıları bağlantı kesildiğinde otomatik olarak yeniden bağlanır

## Yeni Paket: perry/appstorereview

Uygulama mağazası değerlendirmesi istemek için yeni bir birinci taraf paket:

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Bir fonksiyon, iki platform, yerel değerlendirme UI'si. Zamanlama ve görüntüleme mantığı tamamen geliştiriciye bırakılmıştır.

## Codegen Düzeltmeleri

120 commit çok sayıda hata düzeltmesi anlamına gelir. En etkili olanlar:

-   **Katı eşitlik (===)** — v0.4.2'de üç ayrı hata düzeltildi: tip etiketi karşılaştırması, NaN işleme ve null/undefined ayrımı
-   **Birleştirilmiş stringlerde string karşılaştırma** — içerik karşılaştırması yerine işaretçi karşılaştırması nedeniyle birleştirme yoluyla oluşturulan stringleri karşılaştırırken `===` başarısız oluyordu
-   **Oluşturucu çözümleme** — `new X(args)` artık modüller arası içe aktarılan oluşturucuları ve closure tabanlı oluşturucu fonksiyonlarını doğru şekilde çözümlüyor
-   **Modül düzeyi array push** — döngülerdeki iç içe fonksiyon çağrıları içinde modül düzeyi dizilere eklenen değerler, yeniden tahsisten sonra eski işaretçiler nedeniyle kaybediliyordu
-   **Null aritmetik zorlaması** — `null + 1` artık `js_number_coerce` aracılığıyla doğru şekilde `1` üretiyor
-   **Bitwise NOT sarma** — `~x` artık ECMAScript semantiğine uygun olarak i32'ye sarılıyor
-   **fetch().then()** — yerel UI uygulamalarında eksik event loop boşaltması nedeniyle callback'ler hiç tetiklenmiyordu (v0.4.3)
-   **WASM modülo ve üs** — `%` ve `**` operatörleri WASM doğrulama hatalarına neden oluyordu (v0.4.5)

## Rakamlarla

-   **~120 commit** 5 günde ana Perry derleyicisine
-   **24 yama sürümü**: v0.4.1 → v0.4.24
-   **Derleme hedefleri**: 9 → 10 (tvOS eklendi)
-   **Linux'tan cross-compile hedefleri**: Windows → Windows, iOS, macOS (tüm Apple + Windows)
-   **Yeni paketler**: perry/appstorereview
-   **Yeni altyapı**: app.perryts.com panosu, perry login CLI, Polar.sh faturalandırma
-   **Performans kazanımları**: %30 daha hızlı mandelbrot (yerel fcmp), 125x daha hızlı string birleştirme

## Sırada Ne Var

Linux'tan iOS ve macOS cross-compile yapabilmek, Hub'ın artık tek bir Linux sunucusundan tüm platformlar için oluşturabileceği anlamına gelir — derleme için özel macOS build makinelerine artık gerek yok (yalnızca imzalama için). Faturalandırma altyapısı, Hub genel betasının yolunu açıyor. Ve tvOS eklenmesiyle Perry, tüm Apple platformlarını kapsıyor: macOS, iOS, iPadOS, watchOS ve tvOS.

-   **Hub genel beta** — dış kullanıcılar TypeScript gönderip yerel ikili dosyalar alabilir
-   **Tam regex desteği** — son büyük dil açığı
-   **perry/ui genişlemesi** — sürükle bırak, erişilebilirlik, DatePicker
-   **Source map'ler ve hata ayıklama bilgisi** — yerel hata ayıklama için DWARF hata ayıklama bilgisi

İlerlemeyi [GitHub](https://github.com/PerryTS/perry)'da takip edin, belgeleri [docs.perryts.com](https://docs.perryts.com)'da okuyun veya tam resim için [yol haritasına](/tr/roadmap/) göz atın.
