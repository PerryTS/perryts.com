---
title: "Eklenti Sistemleri Bir Performans Vergisidir"
excerpt: "Eklenti mimarileri performansı genişletilebilirlik için takas eder. Peki ya genişletilebilirlik runtime yerine derleme zamanında gerçekleşseydi? Derleme zamanı bileşimi size her ikisini de verir — sıfır yük, tam esneklik."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
VS Code'u kuruyorsunuz. Hizli. 15 uzanti ekliyorsunuz. Artik baslamasi 4 saniye suruyor ve Extension Host 800 MB RAM yiyor. Ne oldu?

Bu desen her yerde tekrarlaniyor: WordPress, Eclipse, Chrome, Figma, Slack. Uygulama hizli gelir. Eklentiler onu yavaslatir. Artik kimse sasirmiyor — bunu genisletilebilirligin bedeli olarak kabul ettik.

Ancak eklenti sistemleri sadece bir performans sorunu degildir. Bir tasarim felsefesi sorunudur. Sektor, "genisletilebilirlik" ile "calisma zamani dinamizmi"ni karistirmistir, oysa cogu zaman daha iyi cevap derleme zamani birlesimidir. Performansli olan tek eklentiler, derleme zamaninda eklenti olmaktan cikan eklentilerdir.

## Genisletilebilirligin Performans Spektrumu

Her genisletilebilirlik ayni maliyete sahip degildir. Sifir maliyetten maksimum maliyete bir spektrum vardir ve sektorun cogu pahali ucta konumlanmistir:

1.  **Statik baglama / derleme zamani modulleri** — sifir ek yuk. C kutuphaneleri, Rust crate'leri, Go paketleri. Modul siniri son ikilide tamamen kaybolur.
2.  **Baslangiçta yuklenen paylasimli kutuphaneler** — neredeyse sifir. nginx modulleri, Linux cekirdek modulleri. Yuklemede bir defalik maliyet, sonra dogrudan fonksiyon cagilari.
3.  **Arayuzler / vtable'lar araciligiyla dinamik dagitim** — kucuk ek yuk. C++'ta oyun motoru eklentileri. Cagri basina bir isarretci yonlendirmesi.
4.  **Ayni surec icinde yorumlanan eklentiler** — orta. WordPress PHP eklentileri, Eclipse OSGi paketleri. Her eklenti cagrisi bir yorumlayicidan gecer.
5.  **IPC uzerinden ayri surec eklentileri** — onemli. VS Code uzantilari, Chrome uzantilari. Her etkilesim bir surec sinirini gecer ve veri serializasyonu yapar.
6.  **Serializasyon edilmis IPC uzerinden sandbox'li eklentiler** — agir. Figma eklentileri, tarayici uzantisi icerik betikleri. Her cagida serializasyon, deserializasyon ve sandbox uygulamasi.

Kilit fikir: performansli olan tek eklentiler derleme zamaninda eklenti olmaktan cikanlardir. Seviye 1 ve 2 hizlidir cunku "eklenti" son urunde ana koddan ayirt edilemez hale gelir.

## Gercek Dunya Hasari

### WordPress

Her eklenti istek yasam dongusune baglanir. 30 eklenti, sayfa yukleme basina 30 katman fonksiyon cagrisi anlamina gelir. Sonuc: onbellek eklentileri yalnizca diger eklentilerin hasarini azaltmak icin vardir. Eklentilerin olusturdugu performans sorununu cozmek icin performans eklentileri. Meta-ironi kendini yazar.

### VS Code

Uzantilar ayri bir surecteki tek bir Node.js olay dongusunu paylasiyor. Kotuye kullanan bir uzanti diger tumunu engelliyor. Extension Host duzgun olarak gelistirici makinelerinde en yuksek CPU tuketicisi olarak gorunuyor. Microsoft profil olusturma araclari, ikiye bolme komutlari ve etkinlestirme olay sistemleri insa etmistir — uzantilarin olusturdugu sorunu yonetmek icin bütün bir altyapi.

### Eclipse

Uyari oykusu. OSGi paket cozumlemesi, sinif yukleme ek yuku, devasa bagimlilik grafikleri. Bir zamanlar en populer IDE, artik ana akim gelistiriciler tarafindan buyuk olcude terk edilmis. En buyuk gucu olmasi gereken eklenti mimarisi tanimlayici zayifligi oldu.

### Electron'un Kendisi

Platform seviyesinde eklenti sorunu. Her Electron uygulamasi tam bir Chromium + Node.js calisma zamani gonderir. VS Code Electron'dur. Slack Electron'dur. Discord Electron'dur. Her biri temelde bir sohbet penceresi veya metin editoru olani render etmek icin bagimsiz olarak 300–500 MB RAM tuketiyor. Buradaki "eklenti" her uygulama icin yeniden paketlenen web platformunun tamami.

## Sektor Neden Yine de Eklentileri Seciyor

Eklentiler bu kadar pahaliysa neden herkes onlari insa etmeye devam ediyor? Nedenler cogunlukla organizasyonel, teknik degil:

-   **Gelistirici deneyimi** — performansi onemsemediginizde eklentileri yazmak kolaydir. Bir JS dosyasi gonderin, bazi olaylara baglanin, tamam.
-   **Ekosistem buyumesi** — eklentiler ag etkileri ve topluluk katilimi yaratir. 30.000 uzantilik bir pazar yeri guclu bir hendektir.
-   **Organizasyonel kolaylik** — eklentiler takimlarin tasarim kararlarini ertelemesine olanak tanir. "Birisi bunun icin bir eklenti yazacak" "post-produksiyonda duzeltecegiz"in mimari esdegeridir.
-   **Is modeli** — eklenti pazarlari gelir ve kilit yaratir. Platform ekosistemden deger yakalar.

Rahatsiz edici gercek: eklentiler cogu zaman cekirdege neyin ait oldugu hakkinda zor mimari kararlar almaktan kacinmanin bir yoludur. Eksik bir sey gondermenize ve buna "genisletilebilir" demenize izin verirler.

## Alternatif: Derleme Zamani Bilesimi

Ya genisletilebilirlik calisma zamani yerine derleme zamaninda gerceklesirse?

Bu varsayimsal degil. Sistem dillerinde iyi kanitlanmis emsaller var:

-   **Rust proc makrolari** — derleme zamaninda calisan ve sifir ek yuklu yerel kod ureten rastgele kod. Serde serializasyonu, Tokio asenkron calisma zamani kurulumu, Axum yonlendirme — programiniz baslamadan once hepsi cozulur.
-   **Zig comptime** — tum calisma zamani dallanmasini ortadan kaldiran derleme zamani yurutmesi. Jenerik veri yapilari monomorfize edilir, yapilandirma cozulur, olu kod elenir. Geri kalan tam olarak calisan seydir.
-   **C++ sablonlari / constexpr** — sifir calisma zamani maliyetli derleme zamani polimorfizmi. STL olaganüstü performans elde eder cunku her jenerik algoritma derleme zamaninda uzmanlasmistir.
-   **Paketleyicilerde tree-shaking** — JavaScript'e uygulanan bu fikrin kismi, kusurlu bir versiyonu. Webpack ve Rollup kullanilmayan disari aktarmalari derleme zamaninda kaldiran. Sinirlamasi yalnizca kod cikarabilmesi, uzmanlastaramamisdir.

Desen tutarlidir: kararlari calisma zamanindan derleme zamanina tasiyin. Dahil etmediginiz sey hicbir seye mal olmaz. Dahil ettiginiz sey yonlendirme olmaksizin yerel koda derlenir. Modul siniri bir kaynak seviyesi organizasyon araci olur, calisma zamani performans siniri degil.

## Bu TypeScript Icin Ne Anlama Geliyor

TypeScript, genisletilebilir araclar olusturmak icin en populer dildir — ve calisma zamani performansinda en kotusu. Tum TypeScript ekosistemi Node.js uzerinde calisir, bu da V8 uzerinde calisir, bu da JavaScript'i JIT derler. Her katman ek yuk ekler: JIT isinma suresi, cop toplama duraklamalari, her ozellik erisimi icin dinamik dagitim, surecler arasi IPC sinirlari.

Perry burada devreye girer. Perry TypeScript'i dogrudan yerel ikililer olarak derler. V8 yok, JIT isinmasi yok, cop toplama duraklamalari yok, IPC sinirlari yok.

Modulleriniz yerel koda derlendiginde "eklentiler" sadece... moduller olur. Derleme zamaninda birlesirlier. Son ikilide sifir eklenti ek yuku vardir cunku eklenti yoktur — sadece yerel kod. Bir Express rota isleyicisi, bir middleware fonksiyonu, bir yardimci kutuphane — hepsi ayni ikilide dogrudan fonksiyon cagilarina derlenir. Dinamik yukleme yok, serializasyon yok, surec sinirlari yok.

terminal

\# Your app, your dependencies, your "plugins" — one binary

$ perry compile server.ts -o server

Compiling server.ts + 43 modules...

✓ Built executable: server (1.8 MB, 0.7s)

$ ./server

Listening on port 3000

Bu teorik degildir. Perry zaten gercek dunya TypeScript cercevelerini — Hono, tRPC, Strapi — bir saniyenin altinda 2 MB'nin altinda yerel ARM64 ikililerine derler. Bu cercereleri olusturan moduller derlenir, baglanir ve tek bir calistirilabilir dosyaya alinir. Node.js'de calisma zamani ek yuklu bir eklenti mimarisi olacak olan sey, bir Perry ikilisinde sifir maliyetli bilesim olur.

## Gercekten Ihtiyaciniz Olan Genisletilebilirlik

Itiraz aciktir: "Ama calisma zamani genisletilebilirligine ihtiyacim var. Kullnicilarin yeniden derlemeden eklenti yuklemesi gerekiyor."

Oyle mi? Cogu uygulama icin uzanti seti derleme zamaninda bilinir. Express middleware'inizi, veritabani suruculugunuzu, kimlik dogrulama kutuphane nizi, gunlukleme cercevenizi secersiniz — ve sonra dagitirsiniz. "Genisletilebilirlik" `package.json`'inizdedir, calisma zamaninda degil `npm install`'de cozumlenmistir.

Gercekten calisma zamani eklenti yuklemesine ihtiyac duyan uygulamalar — VS Code, WordPress, tarayicilar — istisnadir, kural degil. Ve onlar bile bunun icin yuksek bir bedel oderler. Geri kalan her sey icin derleme zamani bilesimi ayni esnekligi hicbir ek yuk olmadan verir.

Fark mimari durusttuktur. Her uygulamanin bir eklenti sistemine ihtiyaci varmis gibi yapmak yerine sorarsınız: bu genisletilebilirligin calisma zamaninda gerceklesmesi mi gerekiyor, yoksa derleyici isi yapabilir mi?

## Ileriye Giden Yol

Sektorun eklenti mimarilerine olan bagimliligini, calisma zamani ek yukunu kacinilmaz olarak kabul etmenin bir belirtisidir. Degildir. Derleyici isi yapabilir. Derleme zamani bilesimi vergi olmadan genisletilebilirlik verir.

Perry'yi insa ediyoruz cunku TypeScript gelistiricilerinin sevdikleri dilden vazgecmeden yerel performansi hak ettiklerine inaniyoruz. Modulleriniz derleme zamaninda birlesmelidir, dogrudan fonksiyon cagilarina derlenmeli ve yalnizca "genisletilebilirligi" mumkun kilmak icin var olan bir calisma zamaninin ek yuku olmadan calistirilmalidir.

En hizli eklenti sistemi calisma zamaninda var olmayan sistemdir.
