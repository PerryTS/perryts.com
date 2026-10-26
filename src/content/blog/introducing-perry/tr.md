---
title: "Perry'yi Tanıtıyoruz"
excerpt: "Perry compiles supported TypeScript to standalone native executables with its runtime and GC linked in, without requiring an external Node.js installation or JavaScript engine."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Perry'yi tanitmaktan heyecan duyuyoruz — Rust ile yazilmis, TypeScript'inizi dogrudan bagimsiz calistirilabilir dosyalara derleyen yerel bir TypeScript derleyicisi. Node.js calisma zamani yok, Electron sarmalayicisi yok, taviz yok. Sadece kodunuz, aninda baslayan ve her yerde calisan yerel bir ikiliye derlenmis.

Perry, TypeScript'in ne olabilecegine dair temel bir yeniden dusunceyi temsil eder. Onu bir JS motoru uzerinden calismasi gereken JavaScript'in bir ust kumesi olarak ele almak yerine, Perry TypeScript'i bir sistem dili olarak ele alir — milyonlarca gelistiricinin zaten bildigi ve sevdigi bir sozdizimi olan bir dil.

## Perry'yi Neden Insa Ettik

TypeScript, modern yazilim gelistirmenin ortak dili haline geldi. Cogu web on yuzunun, artan bir arka uc payinin ve giderek daha fazla arac, betik ve otomasyon tercihinin arkasindaki dildir. Ancak her zaman temel bir sinirlamayla gelmistir: JavaScript'e derlenir ve JavaScript bir calisma zamani gerektirir.

Bu calisma zamani — ister Node.js, Deno ya da Bun olsun — odunlerle birlikte gelir. Onlarca veya yuzlerce milisaniye olarak olculen soguk baslama sureleri. JIT derleyici ve cop toplayicidan gelen bellek yuku. Ya tum calisma zamanini paketleyen ya da kullanicinin bir tane yuklemesini gerektiren ikili dagitimlar. Ve GUI uygulamalari icin tek secenek, uygulamanizla birlikte tam bir Chromium tarayicisi gondermek olan Electron olmustur.

Sorduk: ya TypeScript hic JavaScript'ten gecmek zorunda olmasaydi? Ya onu dogrudan yerel makine koduna derleyebilseydiniz, tipki Rust, Go veya C++ derlediginiz gibi?

## Perry Nasil Calisir

Perry'nin derleme hatti uc asamadan olusur:

1.  **Ayristirma** — Perry, TypeScript kaynaginizi bir AST'ye ayristirmak icin SWC'yi (Rust tabanli TypeScript/JavaScript ayristirici) kullanir. SWC, Next.js tarafindan kullanilan ayristiriciyla aynidir ve son derece hizlidir.
2.  **Ture yonelik derleme** — Perry, tam tur bilgisiyle AST'yi gezer. Calisma zamaninda dinamik turlerle ugasmak zorunda olan bir JS motorunun aksine, Perry her turu derleme zamaninda bilir. Bu, jeneriklerin monomorfizasyonunu, metot cagrilarinin statik dagitimini ve dogrudan bellek duzeni optimizasyonunu mumkun kilar.
3.  **Kod uretimi** — Perry, Wasmtime ve Firefox JIT'in bazilari tarafindan kullanilan ayni kod ureticisi olan Cranelift kullanarak yerel makine kodu uretir. Cranelift, x86\_64 ve ARM64 icin verimli yerel kod uretir.

Sonuc, tipik olarak bir CLI araci icin 2-5 MB olan, sifir isinma suresiyle aninda baslayan bagimsiz bir calistirilabilir dosyadir.

terminal

$ perry build app.ts

Parsing app.ts...

Compiling (cranelift, arm64)...

Linking...

✓ Built executable: app (2.3 MB)

$ ./app

Hello from native TypeScript!

$ file app

app: Mach-O 64-bit executable arm64

## Hangi TypeScript Ozellikleri Destekleniyor

Perry, TypeScript'in genis ve buyuyen bir alt kumesini destekler. Hedef, dilin gelistiricilerin gercekte kullandigi sekliyle tam uyumluluktur. Bugun bu sunlari icerir:

-   **Tum ilkel turler** — string, number, boolean, null, undefined, bigint, symbol
-   **Arayuzler ve tur takma adlari** — union turleri, intersection turleri ve mapped turleri dahil
-   **Jenerikler** — monomorfizasyon yoluyla derlenir, bu nedenle `Array<number>` ve `Array<string>` ayri optimize edilmis kod yollari uretir
-   **Siniflar** — kalitim, ozel alanlar (`#field`), statik uyeler, getters/setters ve dekoratorler ile
-   **Async/await ve Promises** — Rust'in async'i ele alma bicimine benzer sekilde bir durum makinesine derlenir
-   **Generators ve iterators** — `function*` ve `for...of` donguler
-   **Closures** — uygun yakalama semantikleri ile
-   **Yapisokum** — diziler, nesneler, ic ice kaliplar ve rest elemanlari
-   **Template literals** — tagged templates dahil
-   **Moduller** — derleme zamaninda cozumlenen ESM imports/exports

## Coklu Platform Yerel UI

Perry, CLI araclari ve sunucu tarafi uygulamalarla sinirli degildir. Alti platform icin yerel UI cerceveleri ile birlikte gelir:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField ve daha fazlasi)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (iOS ile ayni API, iPad'e ozel uyarlamalarla)
-   **Android** — JNI + Android Views (Activity, View, Button, RecyclerView)
-   **Linux** — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, ortak kontroller, GDI)

Temel kavrayis, Perry'nin derleme zamaninda ortak bir TypeScript API'sini her platformun yerel widget arac setine eslemesidir. Kopru katmani yok, web gorunumu yok ve ozel isleme motoru yok. Uygulamaniz, isletim sisteminin kendisi tarafindan olusturulan gercek platform widget'larini kullanir. Derinlemesine incelememizde daha fazlasini okuyun: [TypeScript'ten Coklu Platform Yerel UI](/tr/blog/cross-platform-native-ui/).

## 27'den Fazla Yerel npm Paket Uygulamasi

Yeni bir derleyicinin en buyuk pratik zorluklarindan biri ekosistem uyumlulugudur. Gelistiriciler sadece sifirdan kod yazmaz — paketler kullanir. Perry bu sorunu 27'den fazla populer npm paketinin yerel uygulamalariyla cozer:

-   **Veritabanlari** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSockets)
-   **Guvenlik** — bcrypt, jsonwebtoken, crypto
-   **Araclar** — uuid, chalk, dotenv, lodash (kismi), moment
-   **Sistem** — fs-extra, glob, chokidar, commander

Bunlar Node.js modulleri etrafindaki ince sarmalayicilar degildir. Yerel sistem kutuphaneleri kullanilarak dogrudan ikili dosyaniza derlenir — PostgreSQL icin libpq, kripto icin OpenSSL, HTTP icin libcurl. API yuzeyi npm paketinden beklediginiz seyle eslestigi icin gecis basittir.

## Istege Bagli V8 Uyumluluk Katmani

Henuz yerel Perry uygulamalari olmayan npm paketleri icin Perry, istege bagli bir V8 gomme modu sunar. Etkinlestirildiginde Perry bir V8 calisma zamani paketler ve standart JavaScript npm paketlerini derlenenmis TypeScript'inizle birlikte calistirir. Bu, Perry'yi kademeli olarak benimsemenizi saglayan pragmatik bir kacis kapisidir — sicak yollari yerel koda derlerken geri kalan her sey icin tam npm ekosistemine erismeye devam edin.

## Capraz Derleme

Perry, kutudan cikar cikmaz capraz derlemeyi destekler. macOS gelistirme makinenizden Linux (x86\_64 ve ARM64) ve iOS icin derleyebilirsiniz. Bu, macOS uzerinde CI/CD boru hattinizi olusturabileceginiz ve her platform icin ozel derleme makinelerine ihtiyac duymadan tum dagitim hedefleriniz icin ikililer uretebileceginiz anlamina gelir.

\# Build for Linux from macOS

$ perry build app.ts --target linux-x86\_64

✓ Built executable: app (3.1 MB)

\# Build for iOS from macOS

$ perry build app.ts --target ios-arm64

✓ Built executable: app (4.8 MB)

## Performans

Perry ile derlenmis ikililer hizlidir. JIT isinmasi, yorumlayici yuku ve cop toplayici duraklamalari olmadigindan performans, ilk cagrimadan itibaren tahmin edilebilir ve tutarlidir.

Kiyas testlerimizde:

-   **Baslama suresi** — fiilen 0 ms (yerel surec baslatma)
-   **Ikili boyutu** — tipik CLI araclari icin 2-5 MB (paketlenmis Node.js icin 50+ MB'ye karsi)
-   **Bellek kullanimi** — esdeger Node.js uygulamalarindan 5-10 kat daha az
-   **Is hacmi** — hesaplama yogun is yukleri icin elle yazilmis C ile rekabet edebilir

Canli kiyas testlerini [demo.perryts.com](https://demo.perryts.com) adresinde gorebilirsiniz; burada Perry ile derlenmis calistirilabilir dosyalar Node.js ve Bun ile gercek zamanli olarak karsilastirilir.

## Mevcut Durum

Perry aktif gelistirme asamasindadir. Derleyici, test paketi genelinde 62 testin 62'sini gecerek kararli durumdadir. Alti platform UI arka ucunun tamami islevseldir. Temel dil ozellikleri saglamdir ve genislemektedir.

UI widget kutuphanesini genisletmek, string ve nesne performansini iyilestirmek, tam regex destegini tamamlamak ve Stream modulunu olusturmak uzerinde aktif olarak calisiyoruz. Uzun vadede, WASM derleme hedefleri, coklu is parcacigi, VS Code uzantisi ve paket yoneticisi entegrasyonu planliyoruz.

Neler gonderildi, neler devam ediyor ve sirada ne var gibi detaylar icin tam [yol haritasina](/tr/roadmap/) goz atin.

## Baslayin

Perry acik kaynaklidir. Depoyu klonlayabilir, kaynaktan derleyebilir ve bugun TypeScript derlemeye baslayabilirsiniz:

$ git clone https://github.com/PerryTS/perry.git

$ cd perry

$ cargo build --release

\# Compile your first TypeScript file

$ ./target/release/perry build hello.ts

✓ Built executable: hello (2.1 MB)

$ ./hello

Hello, world!

Kaynak koduna [GitHub](https://github.com/PerryTS/perry)'da goz atin, [vitrin](/tr/showcase/) sayfasina bakarak Perry ile neler insa edildigini gorun veya dogrudan koda dalin. Ne insa edeceginizi gormek icin sabirsizlaniyoruz.
