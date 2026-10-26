---
title: "Tam Pipeline: Dokümantasyon, Dağıtım ve WidgetKit"
excerpt: "Bir haftada 82 commit: 49 sayfalık dokümantasyon sitesi, otomatik App Store ve Play Store yayınlama, Homebrew ve APT paketleri, TypeScript'ten yerel WidgetKit uzantıları, yeni widget'lar, http/https modülleri ve kendi kendini barındıran LLVM derleyicisi."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
Yedi günde 82 commit. 49 sayfalık bir dokümantasyon sitesi. Otomatik App Store ve Play Store yayınlama. Homebrew ve APT paketleri. TypeScript'ten derlenen yerel WidgetKit uzantıları. Kendi kendini derleyen bir LLVM derleyicisi. Ve her platformda düzinelerce hata düzeltmesi.

Bu yazı, 6-13 Mart 2026 arasında Perry'de yayınlanan her şeyi kapsar. Tema tamamlanma — "biraz TypeScript yazdım" ile "uygulamam App Store'da" arasındaki boşlukları doldurmak.

## docs.perryts.com

Perry artık gerçek bir dokümantasyon sitesine sahip. mdBook ile oluşturulmuş 49 sayfa, başlangıçtan CLI referansına kadar her şeyi kapsıyor. Dokümanlar bölümlere ayrılmış:

-   **Başlarken** — kurulum, ilk proje, proje yapısı
-   **Dil Özellikleri** — Perry'nin TypeScript'ten desteklediği her şey
-   **Yerel UI** — tüm widget türlerini, düzeni, durum yönetimini ve platforma özgü davranışı kapsayan 12 sayfa
-   **Platformlar** — 6 hedef platformun her biri için özel sayfalar
-   **Standart Kütüphane** — 50'den fazla yerel paket uygulaması belgelenmiş
-   **Sistem API'leri** — dosya diyalogları, keychain, bildirimler, çoklu pencere
-   **WidgetKit** — yeni widget uzantı modülü
-   **Eklentiler** — derleme zamanı eklenti mimarisi
-   **CLI Referansı** — her komut ve bayrak

Site ayrıca yapay zeka keşfedilebilirliği için bir `llms.txt` dosyası içeriyor ve GitHub Pages üzerinden [docs.perryts.com](https://docs.perryts.com) özel alan adıyla dağıtılıyor.

## Perry'yi Tek Komutla Kurun

Perry artık kaynak koddan derlemeye ek olarak Homebrew ve APT üzerinden dağıtılıyor. Yeni bir GitHub Actions sürüm ardışık düzeni, macOS (arm64 ve x86\_64) ile Linux (x86\_64 ve arm64) için ikili dosyalar oluşturuyor, ardından Homebrew tap ve APT deposunu otomatik olarak güncelliyor.

terminal

\# macOS

brew tap PerryTS/perry

brew install perry

\# Debian/Ubuntu

sudo apt update && sudo apt install perry

Artık repoyu klonlayıp Cargo ile derlemeye gerek yok. Perry'yi diğer araçları kurduğunuz gibi kurun.

## Otomatik App Store Yayınlama

Bu, en fazla manuel adımı ortadan kaldıran değişikliktir. `perry publish ios` çalıştırmak artık tüm iOS dağıtım ardışık düzenini otomatik olarak yönetir:

1.  App Store Connect API üzerinden RSA anahtarı ve CSR oluşturur
2.  Dağıtım sertifikası oluşturur ve `.p12`'ye paketler
3.  Paket kimliğini kaydeder
4.  Provisioning profili oluşturur ve indirir
5.  App Store Connect uygulama kaydını oluşturur
6.  Derler, imzalar ve TestFlight veya App Store'a yükler

Xcode yok. Manuel portal ziyareti yok. Tarayıcıdan sertifika indirme yok. Kurulum sihirbazı ilk yayınladığınızda otomatik olarak çalışır, API anahtarı yapılandırmasında rehberlik eder ve kimlik bilgilerini `perry.toml`'a kaydeder.

macOS dağıtımı da aynı şekilde otomatikleştirilmiştir. Perry üç modu destekler: TestFlight, noter onaylı DMG ve App Store'a yayınlayıp aynı anda noter onaylı DMG oluşturan yeni bir **"ikisi birden"** modu. Üç sertifika türü otomatik oluşturulur: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` ve `DEVELOPER_ID_APPLICATION`.

Android yayınlama da otomatik tetiklenen bir kurulum sihirbazı kazandı. Üç platform artık aynı kalıbı izliyor: ilk çalıştırma kurulumu tetikler, kimlik bilgileri projeye kaydedilir, sonraki çalıştırmalar sıfır yapılandırmayla gerçekleşir.

Ön kontrol doğrulaması, derleme başlamadan önce sorunları yakalar — provisioning profili paket kimliği uyumsuzluğu, sertifika süresi dolması, eksik uygulama simgesi, geçersiz sürüm formatı, yanlış takım kimliği. Ve `perry.toml [ios]`'daki `encryption_exempt`, `ITSAppUsesNonExemptEncryption` Info.plist anahtarını otomatik ayarlar, App Store Connect'teki manuel ihracat uyumluluk istemini atlar.

## perry/widget: TypeScript'ten WidgetKit

Perry artık TypeScript'i yerel SwiftUI WidgetKit uzantılarına derleyebilir. Bu bir sarmalayıcı veya köprü değil — derleyici HIR düzeyinde render ağacını gezer ve doğrudan SwiftUI kaynak kodu üretir. Çıktı, Xcode'un (veya Perry'nin derleme ardışık düzeninin) uygulamanıza gömebileceği eksiksiz bir WidgetKit uzantı paketidir.

terminal

perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/

Yaklaşım, Perry'nin derlemesinin geri kalanından temelden farklıdır. Normal Perry kodu Cranelift üzerinden yerel makine koduna gider. Widget kodu HIR'den SwiftUI metin çıktısına gider, çünkü WidgetKit SwiftUI gerektirir — zorunlu UIKit veya AppKit koduyla bir widget uzantısı oluşturmanın yolu yoktur. Perry bunu widget render ağacını çalışma zamanı kodu değil, derleme zamanı şablonu olarak ele alarak çözer.

## Yeni Widget'lar ve Platform İyileştirmeleri

Bu hafta dört yeni widget türü geldi:

-   **TextArea** — macOS, iOS ve Android'de çok satırlı metin düzenleme
-   **SecureField** — iOS ve macOS'ta şifre girişi
-   **QR Code** — iOS, macOS ve Android'de yerel QR kod oluşturma
-   **Splash Screen** — otomatik oluşturulan LaunchScreen storyboard'ları (iOS) ve splash temaları (Android)

### iPad Yerelleşiyor

Perry artık tam iPad yerel uygulamaları oluşturuyor: `UIDeviceFamily [1,2]`, yönlendirme desteği, `UIRequiresFullScreen` ve ibtool aracılığıyla derlenmiş LaunchScreen storyboard. Yeni `getDeviceIdiom()` fonksiyonu çalışma zamanında telefon vs. iPad'i algılar ve `PerryFrameSplit` iPad düzenleri için çerçeve tabanlı yatay bölünmüş konteynerler sağlar.

### Windows

Windows zamanlayıcı desteği (50ms `WM_TIMER` tiki), koyu tema arka planlı sahip-çizimli düğmeler ve 18 widget dosyasında `to_wide().as_ptr()`'daki use-after-free hatası düzeltmeleri aldı. V8 çalışma zamanı artık gerekli sistem kütüphaneleri bağlanmış olarak Windows'ta çalışıyor.

### GTK4 (Linux)

GTK4 arka ucu macOS'a uyum sağlamak için görsel cilalama aldı: kenar boşlukları için CSS dolgu, Adwaita düğme stili, VStack kenar boşluğu düzeltmeleri ve ScrollView yatay politikası.

## http/https ve better-sqlite3

İki önemli stdlib eklentisi:

Yeni `http` ve `https` yerel modülleri, arka planda reqwest kullanarak istemci tarafı HTTP sağlıyor. API Node.js ile eşleşiyor: `request()`, `get()`, write/end/on ile `ClientRequest` ve statusCode ve olay işleyicileri ile `IncomingMessage`.

`better-sqlite3` artık tam destekleniyor: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — uygun NaN-boxing ve adlandırılmış özellik erişimli satır nesneleri ile.

Diğer stdlib iyileştirmeleri: `crypto.randomBytes()` artık Buffer döndürüyor (Node.js ile eşleşiyor), MongoDB iş parçacığı güvenliği düzeltmeleriyle `listDatabases` ve `listCollections` kazandı ve mysql2 INSERT/UPDATE/DELETE artık `insertId` ile `ResultSetHeader` döndürüyor.

## GC ve Doğruluk Düzeltmeleri

Bu hafta birkaç kritik çöp toplayıcı ve çalışma zamanı doğruluk düzeltmesi yayınlandı:

-   **GC yeniden giriş koruması** — tahsis sırasında toplamayı önler, RefCell çift-ödünç paniklerini düzeltir
-   **GC Map izleme** — Map'ler artık işaretleme aşamasında düzgün şekilde izleniyor, dize anahtar toplanmasını önlüyor
-   **Dize takma ad düzeltmesi** — dize ekleme artık her zaman taze dizeler tahsis ediyor, işaretçi kopyalama takma adından kaynaklanan bozulmayı düzeltiyor
-   **BigInt aritmetiği** — sağa kaydırma negatif sayılar için aritmetik kaydırma kullanıyor, bitsel işlemler ToInt32 sarmalama semantiği kullanıyor
-   **Map.get() undefined** — eksik anahtarlar için yanlış NaN etiketi yerine doğru `TAG_UNDEFINED` döndürüyor
-   **Statik alan GC kökleri** — statik sınıf alanlarındaki BigInt değerleri GC kökleri olarak kaydedildi

Bunlar küçük düzeltmeler değil. Tek başına GC yeniden giriş düzeltmesi, aralıklı çökmelerin tüm bir sınıfını çözdü. Dize takma ad düzeltmesi, bir dize değişkenini diğerine atayan ve sonra herhangi birini değiştiren her programı etkiledi. Bunlar yalnızca gerçek iş yükleri altında ortaya çıkan türden hatalardır ve bunları düzeltmek derleyiciyi üretime hazır yapan şeydir.

## perry-verify: Güçlendirildi

Otomatik uygulama doğrulama hizmeti `perry-verify`, bir güvenlik sertleştirme geçişi aldı: Linux'ta `bwrap` ve macOS'ta `sandbox-exec` aracılığıyla korumalı alan yürütme, WebSocket el sıkışma ve ikili dosya indirmede kimlik doğrulama belirteçleri, IP başına hız sınırlama, numaralandırmayı önleyen tam UUID iş kimlikleri ve azaltılmış gövde limitleri.

## perrysdad: Kendi Kendini Derleyen Derleyici

Paralel bir çabada, TypeScript ile yazılmış kendi kendini derleyen LLVM IR derleyicisi `perrysdad`, hafta boyunca beş aşamada sıfırdan kendi kendini derlemeye ulaştı:

1.  **Aşama 0-1** — uçtan uca iskelet: HIR'den LLVM IR metnine, clang'a, Perry'nin `libperry_runtime.a`'sına karşı bağlanmış
2.  **Aşama 2** — gerçek `.ts` dosyaları için Pratt ifade ayrıştırmalı el yapımı özyinelemeli iniş ayrıştırıcı
3.  **Aşama 3** — çalışma zamanı FFI ile diziler, nesneler ve map'ler, artı kritik bir ABI uyumsuzluğu düzeltmesi (LLVM IR'de JSValue i64 yerine double olarak bildirilmiş)
4.  **Aşama 4** — sınıflar, enum'lar, closure'lar, modül keşfi ve topolojik sıralama ile çok dosyalı derleme

Kilometre taşı: kendi kendini derleyen `anvil` ikili dosyası artık test programlarını derleyebilir ve node ile derlenen sürümle eşleşen doğru çıktı üretebilir. Bir TypeScript derleyicisi, Perry tarafından yerel koda derlenen, daha fazla TypeScript'i yerel koda derliyor. Sonuna kadar kaplumbağalar.

## Rakamlarla

-   **82 commit** ana Perry derleyicisine
-   **1 sürüm**: v0.2.173 (8 Mart)
-   **49 dokümantasyon sayfası** docs.perryts.com'da
-   **4 yeni widget**: TextArea, SecureField, QR Code, Splash Screen
-   **3 dağıtım kanalı**: Homebrew, APT, kaynak
-   **3 otomatik mağaza ardışık düzeni**: App Store, TestFlight, Google Play
-   **6 platformun tamamı** bu hafta iyileştirmeler aldı

## Sırada Ne Var

Ardışık düzen dolmaya başlıyor. TypeScript yazabilir, altı platforma derleyebilir, Homebrew veya APT ile dağıtabilir, App Store ve Play Store'a yayınlayabilir, ana ekran widget'ları ekleyebilir ve kapsamlı dokümantasyonu okuyabilirsiniz — hepsi Perry'nin araç zincirinden ayrılmadan. Geriye kalan:

-   **Tam regex desteği** — son büyük dil boşluğu
-   **perry/ui genişlemesi** — sürükle bırak, erişilebilirlik etiketleri, DatePicker
-   **perrysdad olgunlaşması** — kendi kendini derleyen derleyiciyi tam Perry eşitliğine doğru genişletme
-   **Hub genel beta** — dağıtık derlemeleri harici kullanıcılara açma

Gelişmeleri [GitHub](https://github.com/PerryTS/perry)'da takip edin, yeni dokümanları [docs.perryts.com](https://docs.perryts.com)'da okuyun veya tam resim için [yol haritasına](/tr/roadmap/) göz atın.
