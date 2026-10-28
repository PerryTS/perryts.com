---
title: "Diğer tüm yollar başarısız olduğunda Apple Watch’a özel bir uygulamayı App Store’da yayımlamak"
excerpt: "Bağımsız bir watchOS uygulamasını App Store’a yüklemek için belgelenmiş tüm yollar başarısız oluyor: altool, iTMSTransporter, xcodebuild, hatta Xcode 26’nın Organizer’ı bile watchOS platformunu reddediyor. İşte çalışan ve eski saatler için arm64_32 desteğini koruyan belgelenmemiş çözüm: iTMSTransporter ile yüklenen bir ITSWatchOnlyContainer iOS stub’ı."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter**, Apple Watch için bir ses seviyesi ölçerdir — watchOS uygulaması, iPhone karşılığı, Perry ile tek bir TypeScript dosyasından derlendi. Akıllı saati oluşturup çalıştırmayı sağlamak zor olmasını beklediğimiz kısımdı. Aslında bir güne mal olan kısım, onu *App Store*'a koymaktı. Belgelenen yükleme yollarının her biri, bağımsız bir watchOS uygulamasını reddeder ve işe yarayan geçici çözüm neredeyse hiçbir yerde yazılı değildir. Bu yayın o eksik sayfadır.

Kısa versiyon: Yalnızca akıllı saatlere yönelik bir uygulamayı yayınlamak için, uygulamayı `ITSWatchOnlyContainer` ile işaretlenmiş bir iOS *konteyner koçanı* içine sararsınız ve `iTMSTransporter` — Xcode değil, `altool` değil. Uzun versiyonda, her birinin keşfedilmesi için Apple'ın sunucularına gidiş-dönüş maliyeti olan üç mayın bulunuyor.

## Uygulama

dB Meter bir `WKWatchOnly` uygulamasıdır: akıllı saatte kendi başına çalışır, eşleştirilmiş iPhone uygulamasına gerek yoktur. Perry, TypeScript'i doğrudan yerel bir watchOS ikili dosyasında derler ve onu bir **evrensel** dilim olarak dağıtır - `arm64` Seri 9/10/11 ve Ultras için, ayrıca Seri 4 ila 8 ve SE için `arm64_32` (ILP32: 64 bit kayıtlar, 32 bit işaretçiler). Bu ikinci dilim önemlidir: O olmadan Series 4'ten SE 2'ye kadar her şey uygulamayı yükleyemez. `arm64_32`'yi canlı tutmanın, bariz geçici çözümü ortadan kaldıran kısıtlama olduğu ortaya çıktı.

## Hiçbir şey bağımsız bir akıllı saat uygulaması yükleyemez

Yalnızca akıllı saat `.ipa`, üst düzey uygulamasının `CFBundleSupportedPlatforms = [WatchOS]` olarak bildirdiği bir pakettir. Apple'ın komut satırı dağıtım araçları bununla ne yapacağını bilmiyor:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Bu yüzden Xcode’a yöneliyorsunuz. Ama `method: app-store-connect` ile çalışan `xcodebuild -exportArchive`, yöntemler listelenirken başarısız oluyor. Nedeni açıklayıcı: Xcode 26’nın dağıtım yöntemleri kaydında bir watchOS arşivi için *hiç App Store seçeneği yok*:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

Organizatör GUI'si tamamen aynı üç kutucuğu gösterir: Sürüm Testi, Kurumsal, Hata Ayıklama ve hiçbir işe yaramayan "Özel". Özel, kurumsal, geliştirme. App Store yok. Bugün yüklenen Xcode sürümünde, bağımsız bir akıllı saat uygulamasını Apple'ın kendi ön kapılarından App Store Connect'e aktarmanın desteklenen bir yolu yoktur.

## Tamamlayıcı tuzak

Cazip kaçış yolu, yalnızca akıllı saatlere yönelik olmayı bırakmaktır. Akıllı saat uygulamalarının yıllardır sunulduğu şekilde `Payload/YourApp.app/Watch/` adresinde akıllı saat uygulamasını *gömecek* gerçek bir iOS uygulaması gönderin. Üst düzey paket normal bir iOS uygulaması olduğundan, bu `altool --type ios` ile temiz bir şekilde yüklenir.

Bu yol ayrıca iki sorun doğuruyor. İlk olarak App Store Connect artık bir iPhone uygulaması görüyor ve **iPhone ekran görüntüleri istiyor**. Yalnızca “bunu saatinizde açın” diyen bir iPhone uygulaması da 4.2 kapsamındaki asgari işlevsellik şartından reddedilebilir. İkincisi — ve bizim için belirleyici olanı — iOS’un *en üst düzeydeki* ikilisi `arm64_32` dilimi içeremez. Apple’ın doğrulayıcısı bunu reddediyor:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

Dolayısıyla tamamlayıcı yapı sizi `arm64_32`'yi çıkarıp yalnızca arm64'e geçmeye zorluyor; bu, üzerinde test ettiğimiz Series 7 de dahil olmak üzere tüm Seri 4–8 ve SE akıllı saatlerinden düşer. Tamamlayıcı tuzak, eski akıllı saat desteğinizi işe yarayan bir yüklemeyle değiştirir. Bu takası istemedik.

## Yalnızca akıllı saatlere yönelik kapsayıcı

Gerçek cevap, akıllı saat uygulamasını yalnızca akıllı saat için tutar *ve*, `arm64_32` tutar. Akıllı saat uygulamasını küçük bir iOS **kapsayıcı koçanının** içine yerleştirirsiniz ve saplamayı işaretlersiniz, böylece App Store Connect her şeyi yalnızca akıllı saate özel bir ürün olarak ele alır. İşaretleme işlemini iki Info.plist anahtarı gerçekleştirir ve işin tamamı bunlardır:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true`, App Store Connect'e "bu iOS paketinin yalnızca içindeki akıllı saat uygulaması için bir dağıtım aracı olduğunu söyler. iPhone ekran görüntüsü gereksinimini ortadan kaldıran şey bu tek anahtardır; mağaza, ürünü yalnızca akıllı saat olarak sınıflandırır. `LSApplicationLaunchProhibited=true`, saplamanın hiçbir zaman başlatılmadığını, dolayısıyla gerçek bir uygulama olmasına gerek olmadığını söylüyor; üst düzey platformun iOS olarak okunması ve dağıtım araçlarının şikayet etmeyi bırakması için var olması yeterlidir. İçerisindeki akıllı saat uygulaması `WKWatchOnly=true` ve *no* `WKCompanionAppBundleIdentifier`'ı tutar — saplamanın tamamlayıcısı değildir, saplama onu çevreleyen bir sarmalayıcıdır.

Saplamanın kalan Info.plist anahtarları, doğrulayıcının üzerinde ısrar ettiği standart anahtarlardır: `UIDeviceFamily=[1,2]`, dört `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]` ve — saplama arm64 olduğundan — `UIRequiredDeviceCapabilities=[arm64]`. Taslakta hiçbir simge yoktur; akıllı saat uygulaması bunları taşır.

Ardından `-assetFile` modu artık üst düzey paket iOS olduğundan mutlu olan `iTMSTransporter` ile yükleme yaparsınız:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

Derleme, watchOS derlemesi olarak App Store Connect'te, `arm64_32` bozulmadan yer alır ve sürüm, iPhone istemeyi bırakır ekran görüntüleri.

## Üç mayın yolda

Bunların her biri, yerel araçların yakaladığı bir şey değil, Apple'ın doğrulayıcısından gelen başarısız bir yüklemeydi:

1.  **Stub, yeni bir `swiftc` ikilisi olamaz.** Yüklü Xcode’un iOS SDK’sıyla basit bir UIKit stub’ı derlemek, *“desteklenmeyen bir SDK veya Xcode sürümüyle derlenmiş”* gerekçesiyle reddediliyor (hata 90534); bu SDK ön sürüm sayılıyor. Elimizde zaten kabul edilen bir SDK sürümü taşıyan gerçek bir iOS ikilisi vardı: Perry’nin kendi `--target ios` çıktısı. Perry kendi çalışma zamanını bağlıyor ve yayımlanmış bir SDK sürümü kaydediyor, böylece `swiftc` ile geçilemeyen doğrulamadan geçiyor. Stub, Perry ile derlenmiş “bu bir Apple Watch uygulamasıdır” ekranı; `LSApplicationLaunchProhibited` sayesinde gerçekte hiç çalışmıyor.

2.  **Simgeler için yalnızca anahtar değil, sözlük de gerekli.** `CFBundleIconName` ayarlı ve `Assets.car` mevcut olduğu halde Watch uygulaması *“CFBundleIconName değeri eksik”* hatasıyla doğrulamadan geçemedi. Doğrulayıcı tam yapıyı istiyor: `CFBundleIconName` *ve* `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}` sözlüğü. Yalnızca en üst düzey anahtarı ayarlarsanız hâlâ anahtarın eksik olduğunu söylüyor.

3.  **`WKWatchOnly`, zaten iOS derlemelerini dağıtan bir kayıtta reddedilir.** App Store kaydınız daha önce bir iOS derlemesi, yalnızca akıllı saat yüklemesi reddedilir ve yeni bir uygulama kaydına ihtiyacınız vardır (ASC API bunu oluşturamaz — `POST /apps` 403 değerini döndürür, dolayısıyla bunu web kullanıcı arayüzünde yaparsınız). Yalnızca *dağıtılmamış* yapıya sahip bir kayıtta sorun yoktur.


Birkaç küçük değişmez: saplama ve akıllı saat uygulaması aynı `CFBundleVersion`'u paylaşmalıdır ve `--generate-entitlement-der` ve `get-task-allow=false`.

## Bu neden bir Perry hikayesi

Konteyner tesisatlarının hiçbiri Perry'ye özgü değildir; ne inşa etmiş olursa olsun, herhangi bir bağımsız watchOS uygulaması için geçerlidir. Ancak Perry, dB Meter'ın ilk etapta yerel bir akıllı saat ikili dosyasına derlenen 280 satırlık tek bir TypeScript dosyası olmasının nedenidir ve bu dosyayı da Perry oluşturur. SDK-clean iOS saplaması, `swiftc` başarısız olduğunda 90534 hatasını geçti. `arm64_32` için derleme aynı zamanda gerçek bir codegen hatasını da ortadan kaldırdı; yazılan nesne dizesi alanı, ILP32'de çöp kayan nokta olarak geri okunuyordu çünkü satır içi sınıf alanı erişimi, hedefe duyarlı yerine 64 bit nesne başlığı boyutunda (24 bayt) sağlanıyordu 20 — eski saatleri sessizce bırakmak yerine onları desteklemekte ısrar ettiğinizde karşılaşacağınız türden bir şey.

Tüm ardışık düzen - TypeScript'ten evrensel bir watchOS ikili dosyasına ve imzalı, yalnızca akıllı saate yönelik bir App Store derlemesine kadar - artık yeniden çalıştırabileceğimiz bir komut dosyasında yaşıyor. Bağımsız bir akıllı saat uygulaması yayınlıyorsanız ve Xcode size bunun yapılamayacağını söylüyorsa şunları yapabilir: sarmalayabilir, `ITSWatchOnlyContainer` olarak işaretleyebilir ve `iTMSTransporter`'a verebilir.
