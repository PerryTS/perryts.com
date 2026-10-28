---
title: "Windows'a Çapraz Derleme, iOS Game Loop'ları ve %100 Test Eşitliği"
excerpt: "Bir haftada 103 commit: lld-link ile Linux'tan Windows'a çapraz derleme, iOS game loop desteği, çökme raporlama, iki aşamalı Hub derleme pipeline'ı ve kendi kendini barındıran derleyici 68/68 deterministik test eşitliğine ulaşır."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
Bu hafta Perry derleyicisine 103 commit. Öne çıkan özellikler: artık Linux'tan Windows çalıştırılabilir dosyaları cross-compile edebilirsiniz, iOS uygulamaları engelleyici oyun döngüleri çalıştırabilir, derleyici telemetri için çökmeleri raporluyor ve self-hosting derleyici kendisine atılan her deterministik testi geçiyor. Ayrıca büyük bir Hub altyapı yükseltmesi ve 50'den fazla hata düzeltmesi.

## Linux'tan Windows'a Cross-Compile

Perry artık bir Linux ana bilgisayardan Windows `.exe` ikili dosyaları üretebiliyor. Bu, tüm derleme için bir Windows build makinesi çalıştırmadan Windows'u hedeflemesi gereken CI/CD iş hatları için eksik parçaydı.

Uygulama, derleme zamanı `#[cfg]` kontrolünü çalışma zamanı hedef algılamasıyla değiştiriyor. Derleyici, Windows olmayan bir ana bilgisayarda Windows hedefi gördüğünde, yeni `find_llvm_tool()` yardımcısı aracılığıyla Rust araç zinciri veya PATH'ten `lld-link`, `llvm-nm` ve `llvm-ar`'ı bulur. Windows sistem kütüphaneleri, `PERRY_WINDOWS_SYSROOT` tarafından gösterilen [xwin](https://github.com/Jake-Shadle/xwin) tarzı bir sysroot'tan gelir.

Bağlayıcı otomatik olarak `/FORCE:UNRESOLVED` kullanır ve eksik UI sembolleri için stub'lar üretir, böylece CLI uygulamaları sorunsuz cross-compile olur. Windows hedeflendiğinde çıktı varsayılan olarak `.exe`'dir. Tam ayrıntılar [cross-compilation belgelerinde](https://docs.perryts.com) bulunabilir.

**terminal — Linux ana bilgisayarı**

```
$ perry compile main.ts --target windows
Compiling main.ts for windows-x86_64...
Using lld-link from Rust toolchain
✓ Compiled executable: main.exe (2.8 MB)
```

## iOS Oyun Döngüsü Desteği

iOS, UIKit'in ana iş parçacığına sahip olmasını gerektirir. Olay güdümlü uygulamalar için sorun değil, ancak engelleyici `while (!shouldClose)` döngüsüne ihtiyaç duyan oyunlar için bir sorundur. Perry artık bunu `--features ios-game-loop` bayrağıyla çözüyor.

Etkinleştirildiğinde, derleyici `main` yerine `_perry_user_main` yayar. Çalışma zamanı, ana iş parçacığında `UIApplicationMain`'i çağıran ve kodunuzu bir arka plan iş parçacığında başlatan bir `main()` sağlar. Scene delegate ve app delegate, oyun döngünüz engellenmeden çalışırken tam UIKit yaşam döngüsünü yönetir.

**main.ts**

```typescript
// Your game loop runs on a background thread
while (!shouldClose) {
update();
render();
awaitNextFrame();
}
```

```text
$ perry run ios --features ios-game-loop
```

Bu, daha önce iOS'ta pratik olmayan oyunlar, simülasyonlar, gerçek zamanlı görseller gibi bir uygulama kategorisinin tamamını mümkün kılıyor. iOS pump ve callback yolları artık panik yönetimi ile sarılmıştır, böylece oyun döngüsünde veya UIKit yaşam döngüsünde meydana gelen çökmeler temiz bir şekilde yakalanır.

## Çökme Raporlama

Perry ile derlenmiş uygulamalar artık başlangıçta `SIGSEGV`, `SIGBUS` ve `SIGABRT` için bir panik hook'u ve sinyal işleyicileri kuruyor. Ölümcül bir çökme meydana geldiğinde, ayrıntılar Chirp telemetri sistemi için `~/.hone/crash.log`'a yazılır. Yakalanan panikler ( `catch_callback_panic` içinde) log'u temizler, böylece yalnızca gerçek anlamda kurtarılamaz çökmeler raporlanır.

Bu bir üretim hazırlığı özelliğidir. Sahada bir şeyler ters gittiğinde, bunu bileceğiz — ve çökme log'u, kullanıcıların herhangi bir şeyi manuel olarak bildirmelerini gerektirmeden sorunu teşhis etmek için yeterli bağlam içerir.

## Hub: İki Aşamalı Windows Build İş Hattı

Perry Hub build altyapısı önemli bir mimari yükseltme aldı. Daha önce, Windows için build yapmak tüm derleme için bir Windows i&scedil;çisi gerektiriyordu. Şimdi iş hattı iki aşamaya bölünüyor:

1.  Bir Linux işçisi yeni lld-link desteğini kullanarak Windows artefaktını cross-compile eder
2.  Hub önceden derlenmiş artefaktı tutar ve işi bir Windows işçisi için yeniden kuyruğa alır
3.  Windows işçisi yalnızca imzalama ve paketleme ile ilgilenir — çok daha hafif bir görev

Bir işçi `complete`'i `needs_finishing: "windows"` ile gönderdiğinde, Hub işi şeffaf bir şekilde yeniden kuyruğa alır. CLI, kesintisiz tek bir build deneyimi görür.

Hub artık hiçbir Windows işçisi bağlı olmadığında Azure Windows VM'lerini otomatik olarak başlatıyor ve build işçileri yeni sürümlerde en son Perry sürümüne otomatik olarak güncelleniyor. Daha az manuel altyapı yönetimi, daha hızlı build'ler.

## Belge Revizyonu

Bu hafta [docs.perryts.com](https://docs.perryts.com)'da iki büyük belge yeniden yazımı yayınlandı:

-   **perry.toml referansı** — her yapılandırma seçeneğini, bundle ID çözümlemeyi, giriş dosyası çözümlemeyi, build numarası otomatik artırımını ve CI/CD örneklerini kapsayan kapsamlı bölüm belgesi
-   **Geisterhand referansı** — platformlar arası UI test çerçevesi için tam API belgeleri, platform kurulumu, test otomasyon kalıpları ve mimari genel bakış

Bunlar artımlı güncellemeler değildir. Her ikisi de her özelliği ve yapılandırma seçeneğini kapsayan sıfırdan yeniden yazımlardır. Yeni bir proje kuruyorsanız veya test yazıyorsanız, buradan başlayın.

## Platformlar Arası Menü API'leri

`menuClear` ve `menuAddStandardAction` daha önce yalnızca macOS içindi. Artık 6 yerel platformun tamamında çalışıyor. Bu ayrıca Windows'ta `dispatch_menu_item`'daki bir `RefCell` yeniden giriş paniğinin düzeltilmesini de içeriyor.

### Android: 16 KB Sayfa Hizalaması

Google Play artık yerel kütüphaneler için 16 KB sayfa hizalaması gerektiriyor. Perry uygun `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` değerlerini otomatik olarak ayarlar ve eşlik eden `.so` dosyaları APK/AAB dahil edilmesi için çıktının yanına kopyalanır.

## Perry React: Kanban Tahtası

React uyumluluk katmanı gerçek dünya testinden geçti: taşıma, ekleme, silme ve görüntüleme işlemlerini içeren tam bir 5 sütunlu Kanban tahtası. Bunu oluşturmak, JSX'te iç içe dizi children render'ını ortaya çıkardı ve düzeltti — özyinelemeli `_appendChildren` işleyicisi artık `.map()` çağrılarından dönen dizileri düzgün bir şekilde düzleştiriyor. Ayrıca çeşitli UI kalıplarını kapsayan yeni 14 bölümlük Kitchen Sink WorkBench demosu da eklendi.

## Anvil: %100 Deterministik Test Eşitliği

`perrysdad` — TypeScript ile yazılmış ve Perry tarafından derlenmiş self-hosting LLVM derleyicisi — artık **68'den 68'ini** geçerek ana derleyicinin çıktısıyla tam olarak eşleşiyor. Tek farklar doğasaldır (zaman damgaları, `Math.random()`) ve 11 test, henüz uygulanmamış UI, zamanlayıcı, kriptografi veya platforma özgü özellikler gerektirdiği için atlanıyor.

Bunu başaran temel çalışmalar:

-   **Arayüz metot gönderimi** — arayüz tipli değişkenler artık ObjectHeader'daki class\_id tabanlı gönderim yoluyla doğru metotları döndürüyor
-   **Dinamik özellik erişimi** — hesaplanmış özellik adları için çalışma zamanı gönderimi
-   **Closure'lar ve this-binding** — nesne metotları için doğru yakalama semantiği
-   **Faz 6 devam ediyor** — async/await, jeneratörler ve koşul düzeltmeleri

Deterministik testlerde %100 eşitlik önemli bir kilometre taşıdır. Kendi kendini derleyen `anvil` ikili dosyasının, test edilebilir her senaryo için ana derleyiciyle tamamen aynı çıktıyı ürettiği anlamına gelir. Tam self-hosting'e doğru açık daralıyor.

## 50'den Fazla Hata Düzeltmesi

Bu hafta büyük bir doğruluk hamlesı. Öne çıkanlar:

-   **JSON.parse** — diziler artık 16 öğede kesilmiyor, geçersiz giriş doğru işleniyor
-   **Uint8Array** — dizi değişkeninden oluşturucu, `.set(source, offset)` uygulaması (eskiden no-op'tu)
-   **BigInt** — modüller arası çağrılar için `BIGINT_TAG` ile NaN-boxing, keccak256 32-bit kesme düzeltmeleri
-   **Optional chaining** — iç içe koşullu ifadeler, toString algılama, dönüş değeri NaN-boxing
-   **IndexSet** — `POINTER_TAG` yerine `STRING_TAG` kullanmak üzere dize NaN-boxing düzeltildi
-   **MySQL** — DATETIME ve BLOB türleri, `Date(string)` oluşturucusu
-   **Math.min/max** — spread argüman işleme
-   **Yerel metot gönderimi** — `POINTER_TAG` nesneleri için field-scan-and-call

Bunlar uç durumlar değildir. JSON.parse'ın dizileri 16 öğede kesmesi herhangi bir gerçek uygulamayı bozar. Uint8Array.set'in no-op olması verileri sessizce bozar. Bunlar, derleyiciyi her seferinde bir doğruluk hatası düzelterek üretim kalitesine taşıyan düzeltmelerdir.

## Rakamlarla

-   **103 commit** ana Perry derleyicisine
-   **3 sürüm**: v0.2.195, v0.2.196, v0.2.197
-   **1 ana özellik**: Linux'tan Windows'a cross-compile
-   **1 yeni uygulama kategorisi**: iOS oyun döngüleri
-   **68/68** perrysdad'da deterministik test eşitliği
-   **50'den fazla hata düzeltmesi**: NaN-boxing, stdlib ve yerel FFI genelinde
-   **2 belge yeniden yazımı**: perry.toml ve Geisterhand
-   **5 Hub iyileştirmesi**: iki aşamalı iş hattı, Azure otomatik başlatma, işçi otomatik güncelleme

## Sırada Ne Var

Windows cross-compilation, tamamen otomatik çok platformlu CI/CD'nin kapısını açıyor — TypeScript gönderin, her işletim sistemi için özel build makineleri olmadan her hedef için yerel ikili dosyalar alın. Oyun döngüsü desteği tamamen yeni bir iOS uygulama kategorisinin kilidini açıyor. Ve perrysdad'da %100 deterministik test eşitliği, self-hosting'in çok gerçek hale geldiği anlamına geliyor. Kalan:

-   **Tam regex desteği** — son büyük dil açığı
-   **perry/ui genişlemesi** — sürükle bırak, erişilebilirlik etiketleri, DatePicker
-   **perrysdad Faz 6** — async/await, jeneratörler, tam Perry eşitliğine doğru genişleme
-   **Hub genel beta** — dağıtık build'leri dış kullanıcılara açma

İlerlemeyi [GitHub](https://github.com/PerryTS/perry)'da takip edin, belgeleri [docs.perryts.com](https://docs.perryts.com)'da okuyun veya tam resim için [yol haritasına](/tr/roadmap/) göz atın.
