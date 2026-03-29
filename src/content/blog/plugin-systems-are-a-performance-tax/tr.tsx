export default function Content() {
  return (
    <>
      <p>
        VS Code&apos;u kuruyorsunuz. Hizli. 15 uzanti ekliyorsunuz. Artik baslamasi 4 saniye suruyor ve Extension Host 800 MB RAM yiyor. Ne oldu?
      </p>
      <p>
        Bu desen her yerde tekrarlaniyor: WordPress, Eclipse, Chrome, Figma, Slack. Uygulama hizli gelir. Eklentiler onu yavaslatir. Artik kimse sasirmiyor — bunu genisletilebilirligin bedeli olarak kabul ettik.
      </p>
      <p>
        Ancak eklenti sistemleri sadece bir performans sorunu degildir. Bir tasarim felsefesi sorunudur. Sektor, &quot;genisletilebilirlik&quot; ile &quot;calisma zamani dinamizmi&quot;ni karistirmistir, oysa cogu zaman daha iyi cevap derleme zamani birlesimidir. Performansli olan tek eklentiler, derleme zamaninda eklenti olmaktan cikan eklentilerdir.
      </p>

      <h2>Genisletilebilirligin Performans Spektrumu</h2>
      <p>
        Her genisletilebilirlik ayni maliyete sahip degildir. Sifir maliyetten maksimum maliyete bir spektrum vardir ve sektorun cogu pahali ucta konumlanmistir:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Statik baglama / derleme zamani modulleri</strong> — sifir ek yuk. C kutuphaneleri, Rust crate&apos;leri, Go paketleri. Modul siniri son ikilide tamamen kaybolur.</li>
        <li><strong>Baslangiçta yuklenen paylasimli kutuphaneler</strong> — neredeyse sifir. nginx modulleri, Linux cekirdek modulleri. Yuklemede bir defalik maliyet, sonra dogrudan fonksiyon cagilari.</li>
        <li><strong>Arayuzler / vtable&apos;lar araciligiyla dinamik dagitim</strong> — kucuk ek yuk. C++&apos;ta oyun motoru eklentileri. Cagri basina bir isarretci yonlendirmesi.</li>
        <li><strong>Ayni surec icinde yorumlanan eklentiler</strong> — orta. WordPress PHP eklentileri, Eclipse OSGi paketleri. Her eklenti cagrisi bir yorumlayicidan gecer.</li>
        <li><strong>IPC uzerinden ayri surec eklentileri</strong> — onemli. VS Code uzantilari, Chrome uzantilari. Her etkilesim bir surec sinirini gecer ve veri serializasyonu yapar.</li>
        <li><strong>Serializasyon edilmis IPC uzerinden sandbox&apos;li eklentiler</strong> — agir. Figma eklentileri, tarayici uzantisi icerik betikleri. Her cagida serializasyon, deserializasyon ve sandbox uygulamasi.</li>
      </ol>
      <p>
        Kilit fikir: performansli olan tek eklentiler derleme zamaninda eklenti olmaktan cikanlardir. Seviye 1 ve 2 hizlidir cunku &quot;eklenti&quot; son urunde ana koddan ayirt edilemez hale gelir.
      </p>

      <h2>Gercek Dunya Hasari</h2>

      <h3>WordPress</h3>
      <p>
        Her eklenti istek yasam dongusune baglanir. 30 eklenti, sayfa yukleme basina 30 katman fonksiyon cagrisi anlamina gelir. Sonuc: onbellek eklentileri yalnizca diger eklentilerin hasarini azaltmak icin vardir. Eklentilerin olusturdugu performans sorununu cozmek icin performans eklentileri. Meta-ironi kendini yazar.
      </p>

      <h3>VS Code</h3>
      <p>
        Uzantilar ayri bir surecteki tek bir Node.js olay dongusunu paylasiyor. Kotuye kullanan bir uzanti diger tumunu engelliyor. Extension Host duzgun olarak gelistirici makinelerinde en yuksek CPU tuketicisi olarak gorunuyor. Microsoft profil olusturma araclari, ikiye bolme komutlari ve etkinlestirme olay sistemleri insa etmistir — uzantilarin olusturdugu sorunu yonetmek icin bütün bir altyapi.
      </p>

      <h3>Eclipse</h3>
      <p>
        Uyari oykusu. OSGi paket cozumlemesi, sinif yukleme ek yuku, devasa bagimlilik grafikleri. Bir zamanlar en populer IDE, artik ana akim gelistiriciler tarafindan buyuk olcude terk edilmis. En buyuk gucu olmasi gereken eklenti mimarisi tanimlayici zayifligi oldu.
      </p>

      <h3>Electron&apos;un Kendisi</h3>
      <p>
        Platform seviyesinde eklenti sorunu. Her Electron uygulamasi tam bir Chromium + Node.js calisma zamani gonderir. VS Code Electron&apos;dur. Slack Electron&apos;dur. Discord Electron&apos;dur. Her biri temelde bir sohbet penceresi veya metin editoru olani render etmek icin bagimsiz olarak 300&ndash;500 MB RAM tuketiyor. Buradaki &quot;eklenti&quot; her uygulama icin yeniden paketlenen web platformunun tamami.
      </p>

      <h2>Sektor Neden Yine de Eklentileri Seciyor</h2>
      <p>
        Eklentiler bu kadar pahaliysa neden herkes onlari insa etmeye devam ediyor? Nedenler cogunlukla organizasyonel, teknik degil:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Gelistirici deneyimi</strong> — performansi onemsemediginizde eklentileri yazmak kolaydir. Bir JS dosyasi gonderin, bazi olaylara baglanin, tamam.</li>
        <li><strong>Ekosistem buyumesi</strong> — eklentiler ag etkileri ve topluluk katilimi yaratir. 30.000 uzantilik bir pazar yeri guclu bir hendektir.</li>
        <li><strong>Organizasyonel kolaylik</strong> — eklentiler takimlarin tasarim kararlarini ertelemesine olanak tanir. &quot;Birisi bunun icin bir eklenti yazacak&quot; &quot;post-produksiyonda duzeltecegiz&quot;in mimari esdegeridir.</li>
        <li><strong>Is modeli</strong> — eklenti pazarlari gelir ve kilit yaratir. Platform ekosistemden deger yakalar.</li>
      </ul>
      <p>
        Rahatsiz edici gercek: eklentiler cogu zaman cekirdege neyin ait oldugu hakkinda zor mimari kararlar almaktan kacinmanin bir yoludur. Eksik bir sey gondermenize ve buna &quot;genisletilebilir&quot; demenize izin verirler.
      </p>

      <h2>Alternatif: Derleme Zamani Bilesimi</h2>
      <p>
        Ya genisletilebilirlik calisma zamani yerine derleme zamaninda gerceklesirse?
      </p>
      <p>
        Bu varsayimsal degil. Sistem dillerinde iyi kanitlanmis emsaller var:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Rust proc makrolari</strong> — derleme zamaninda calisan ve sifir ek yuklu yerel kod ureten rastgele kod. Serde serializasyonu, Tokio asenkron calisma zamani kurulumu, Axum yonlendirme — programiniz baslamadan once hepsi cozulur.</li>
        <li><strong>Zig comptime</strong> — tum calisma zamani dallanmasini ortadan kaldiran derleme zamani yurutmesi. Jenerik veri yapilari monomorfize edilir, yapilandirma cozulur, olu kod elenir. Geri kalan tam olarak calisan seydir.</li>
        <li><strong>C++ sablonlari / constexpr</strong> — sifir calisma zamani maliyetli derleme zamani polimorfizmi. STL olaganüstü performans elde eder cunku her jenerik algoritma derleme zamaninda uzmanlasmistir.</li>
        <li><strong>Paketleyicilerde tree-shaking</strong> — JavaScript&apos;e uygulanan bu fikrin kismi, kusurlu bir versiyonu. Webpack ve Rollup kullanilmayan disari aktarmalari derleme zamaninda kaldiran. Sinirlamasi yalnizca kod cikarabilmesi, uzmanlastaramamisdir.</li>
      </ul>
      <p>
        Desen tutarlidir: kararlari calisma zamanindan derleme zamanina tasiyin. Dahil etmediginiz sey hicbir seye mal olmaz. Dahil ettiginiz sey yonlendirme olmaksizin yerel koda derlenir. Modul siniri bir kaynak seviyesi organizasyon araci olur, calisma zamani performans siniri degil.
      </p>

      <h2>Bu TypeScript Icin Ne Anlama Geliyor</h2>
      <p>
        TypeScript, genisletilebilir araclar olusturmak icin en populer dildir — ve calisma zamani performansinda en kotusu. Tum TypeScript ekosistemi Node.js uzerinde calisir, bu da V8 uzerinde calisir, bu da JavaScript&apos;i JIT derler. Her katman ek yuk ekler: JIT isinma suresi, cop toplama duraklamalari, her ozellik erisimi icin dinamik dagitim, surecler arasi IPC sinirlari.
      </p>
      <p>
        Perry burada devreye girer. Perry TypeScript&apos;i dogrudan yerel ikililer olarak derler. V8 yok, JIT isinmasi yok, cop toplama duraklamalari yok, IPC sinirlari yok.
      </p>
      <p>
        Modulleriniz yerel koda derlendiginde &quot;eklentiler&quot; sadece... moduller olur. Derleme zamaninda birlesirlier. Son ikilide sifir eklenti ek yuku vardir cunku eklenti yoktur — sadece yerel kod. Bir Express rota isleyicisi, bir middleware fonksiyonu, bir yardimci kutuphane — hepsi ayni ikilide dogrudan fonksiyon cagilarina derlenir. Dinamik yukleme yok, serializasyon yok, surec sinirlari yok.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Your app, your dependencies, your &quot;plugins&quot; — one binary</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <p>
        Bu teorik degildir. Perry zaten gercek dunya TypeScript cercevelerini — Hono, tRPC, Strapi — bir saniyenin altinda 2 MB&apos;nin altinda yerel ARM64 ikililerine derler. Bu cercereleri olusturan moduller derlenir, baglanir ve tek bir calistirilabilir dosyaya alinir. Node.js&apos;de calisma zamani ek yuklu bir eklenti mimarisi olacak olan sey, bir Perry ikilisinde sifir maliyetli bilesim olur.
      </p>

      <h2>Gercekten Ihtiyaciniz Olan Genisletilebilirlik</h2>
      <p>
        Itiraz aciktir: &quot;Ama calisma zamani genisletilebilirligine ihtiyacim var. Kullnicilarin yeniden derlemeden eklenti yuklemesi gerekiyor.&quot;
      </p>
      <p>
        Oyle mi? Cogu uygulama icin uzanti seti derleme zamaninda bilinir. Express middleware&apos;inizi, veritabani suruculugunuzu, kimlik dogrulama kutuphane nizi, gunlukleme cercevenizi secersiniz — ve sonra dagitirsiniz. &quot;Genisletilebilirlik&quot; <code className="text-perry-400">package.json</code>&apos;inizdedir, calisma zamaninda degil <code className="text-perry-400">npm install</code>&apos;de cozumlenmistir.
      </p>
      <p>
        Gercekten calisma zamani eklenti yuklemesine ihtiyac duyan uygulamalar — VS Code, WordPress, tarayicilar — istisnadir, kural degil. Ve onlar bile bunun icin yuksek bir bedel oderler. Geri kalan her sey icin derleme zamani bilesimi ayni esnekligi hicbir ek yuk olmadan verir.
      </p>
      <p>
        Fark mimari durusttuktur. Her uygulamanin bir eklenti sistemine ihtiyaci varmis gibi yapmak yerine sorarsınız: bu genisletilebilirligin calisma zamaninda gerceklesmesi mi gerekiyor, yoksa derleyici isi yapabilir mi?
      </p>

      <h2>Ileriye Giden Yol</h2>
      <p>
        Sektorun eklenti mimarilerine olan bagimliligini, calisma zamani ek yukunu kacinilmaz olarak kabul etmenin bir belirtisidir. Degildir. Derleyici isi yapabilir. Derleme zamani bilesimi vergi olmadan genisletilebilirlik verir.
      </p>
      <p>
        Perry&apos;yi insa ediyoruz cunku TypeScript gelistiricilerinin sevdikleri dilden vazgecmeden yerel performansi hak ettiklerine inaniyoruz. Modulleriniz derleme zamaninda birlesmelidir, dogrudan fonksiyon cagilarina derlenmeli ve yalnizca &quot;genisletilebilirligi&quot; mumkun kilmak icin var olan bir calisma zamaninin ek yuku olmadan calistirilmalidir.
      </p>
      <p>
        En hizli eklenti sistemi calisma zamaninda var olmayan sistemdir.
      </p>
    </>
  );
}
