import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry&apos;yi tanitmaktan heyecan duyuyoruz — Rust ile yazilmis, TypeScript&apos;inizi
        dogrudan bagimsiz calistirilabilir dosyalara derleyen yerel bir TypeScript derleyicisi. Node.js calisma zamani yok,
        Electron sarmalayicisi yok, taviz yok. Sadece kodunuz, aninda baslayan ve her yerde
        calisan yerel bir ikiliye derlenmis.
      </p>
      <p>
        Perry, TypeScript&apos;in ne olabilecegine dair temel bir yeniden dusunceyi temsil eder. Onu
        bir JS motoru uzerinden calismasi gereken JavaScript&apos;in bir ust kumesi olarak ele almak yerine, Perry
        TypeScript&apos;i bir sistem dili olarak ele alir — milyonlarca
        gelistiricinin zaten bildigi ve sevdigi bir sozdizimi olan bir dil.
      </p>

      <h2>Perry&apos;yi Neden Insa Ettik</h2>
      <p>
        TypeScript, modern yazilim gelistirmenin ortak dili haline geldi. Cogu web on yuzunun,
        artan bir arka uc payinin ve giderek daha fazla arac, betik ve otomasyon
        tercihinin arkasindaki dildir. Ancak her zaman temel bir
        sinirlamayla gelmistir: JavaScript&apos;e derlenir ve JavaScript bir calisma zamani gerektirir.
      </p>
      <p>
        Bu calisma zamani — ister Node.js, Deno ya da Bun olsun — odunlerle birlikte gelir.
        Onlarca veya yuzlerce milisaniye olarak olculen soguk baslama sureleri. JIT derleyici ve cop
        toplayicidan gelen bellek yuku. Ya tum calisma zamanini paketleyen ya da kullanicinin
        bir tane yuklemesini gerektiren ikili dagitimlar. Ve GUI uygulamalari icin tek secenek,
        uygulamanizla birlikte tam bir Chromium tarayicisi gondermek olan Electron olmustur.
      </p>
      <p>
        Sorduk: ya TypeScript hic JavaScript&apos;ten gecmek zorunda olmasaydi? Ya onu
        dogrudan yerel makine koduna derleyebilseydiniz, tipki Rust, Go veya C++ derlediginiz gibi?
      </p>

      <h2>Perry Nasil Calisir</h2>
      <p>
        Perry&apos;nin derleme hatti uc asamadan olusur:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Ayristirma</strong> — Perry, TypeScript kaynaginizi bir AST&apos;ye ayristirmak icin SWC&apos;yi (Rust tabanli TypeScript/JavaScript ayristirici) kullanir. SWC, Next.js tarafindan kullanilan ayristiriciyla aynidir
          ve son derece hizlidir.
        </li>
        <li>
          <strong>Ture yonelik derleme</strong> — Perry, tam tur bilgisiyle AST&apos;yi gezer. Calisma zamaninda dinamik turlerle ugasmak zorunda olan bir JS motorunun aksine, Perry
          her turu derleme zamaninda bilir. Bu, jeneriklerin monomorfizasyonunu, metot cagrilarinin statik dagitimini ve dogrudan bellek duzeni optimizasyonunu mumkun kilar.
        </li>
        <li>
          <strong>Kod uretimi</strong> — Perry, Wasmtime ve Firefox JIT&apos;in bazilari tarafindan kullanilan ayni kod ureticisi olan Cranelift kullanarak yerel makine kodu uretir. Cranelift, x86_64 ve ARM64 icin verimli yerel kod uretir.
        </li>
      </ol>
      <p>
        Sonuc, tipik olarak bir CLI araci icin 2-5 MB olan, sifir isinma suresiyle aninda
        baslayan bagimsiz bir calistirilabilir dosyadir.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>Hangi TypeScript Ozellikleri Destekleniyor</h2>
      <p>
        Perry, TypeScript&apos;in genis ve buyuyen bir alt kumesini destekler. Hedef, dilin
        gelistiricilerin gercekte kullandigi sekliyle tam uyumluluktur. Bugun bu sunlari icerir:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tum ilkel turler</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Arayuzler ve tur takma adlari</strong> — union turleri, intersection turleri ve mapped turleri dahil</li>
        <li><strong>Jenerikler</strong> — monomorfizasyon yoluyla derlenir, bu nedenle <code className="text-perry-400">Array&lt;number&gt;</code> ve <code className="text-perry-400">Array&lt;string&gt;</code> ayri optimize edilmis kod yollari uretir</li>
        <li><strong>Siniflar</strong> — kalitim, ozel alanlar (<code className="text-perry-400">#field</code>), statik uyeler, getters/setters ve dekoratorler ile</li>
        <li><strong>Async/await ve Promises</strong> — Rust&apos;in async&apos;i ele alma bicimine benzer sekilde bir durum makinesine derlenir</li>
        <li><strong>Generators ve iterators</strong> — <code className="text-perry-400">function*</code> ve <code className="text-perry-400">for...of</code> donguler</li>
        <li><strong>Closures</strong> — uygun yakalama semantikleri ile</li>
        <li><strong>Yapisokum</strong> — diziler, nesneler, ic ice kaliplar ve rest elemanlari</li>
        <li><strong>Template literals</strong> — tagged templates dahil</li>
        <li><strong>Moduller</strong> — derleme zamaninda cozumlenen ESM imports/exports</li>
      </ul>

      <h2>Coklu Platform Yerel UI</h2>
      <p>
        Perry, CLI araclari ve sunucu tarafi uygulamalarla sinirli degildir. Alti platform icin yerel
        UI cerceveleri ile birlikte gelir:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField ve daha fazlasi)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (iOS ile ayni API, iPad&apos;e ozel uyarlamalarla)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, ortak kontroller, GDI)</li>
      </ul>
      <p>
        Temel kavrayis, Perry&apos;nin derleme zamaninda ortak bir TypeScript API&apos;sini her platformun
        yerel widget arac setine eslemesidir. Kopru katmani yok, web gorunumu yok ve
        ozel isleme motoru yok. Uygulamaniz, isletim sisteminin kendisi tarafindan olusturulan
        gercek platform widget&apos;larini kullanir. Derinlemesine incelememizde daha fazlasini okuyun:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          TypeScript&apos;ten Coklu Platform Yerel UI
        </Link>.
      </p>

      <h2>27&apos;den Fazla Yerel npm Paket Uygulamasi</h2>
      <p>
        Yeni bir derleyicinin en buyuk pratik zorluklarindan biri ekosistem uyumlulugudur.
        Gelistiriciler sadece sifirdan kod yazmaz — paketler kullanir. Perry bu sorunu
        27&apos;den fazla populer npm paketinin yerel uygulamalariyla cozer:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Veritabanlari</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Guvenlik</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Araclar</strong> — uuid, chalk, dotenv, lodash (kismi), moment</li>
        <li><strong>Sistem</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Bunlar Node.js modulleri etrafindaki ince sarmalayicilar degildir. Yerel sistem kutuphaneleri
        kullanilarak dogrudan ikili dosyaniza derlenir — PostgreSQL icin libpq, kripto icin OpenSSL,
        HTTP icin libcurl. API yuzeyi npm paketinden beklediginiz seyle eslestigi icin
        gecis basittir.
      </p>

      <h2>Istege Bagli V8 Uyumluluk Katmani</h2>
      <p>
        Henuz yerel Perry uygulamalari olmayan npm paketleri icin Perry, istege bagli bir
        V8 gomme modu sunar. Etkinlestirildiginde Perry bir V8 calisma zamani paketler ve
        standart JavaScript npm paketlerini derlenenmis TypeScript&apos;inizle birlikte calistirir. Bu, Perry&apos;yi
        kademeli olarak benimsemenizi saglayan pragmatik bir kacis kapisidir — sicak yollari yerel
        koda derlerken geri kalan her sey icin tam npm ekosistemine erismeye devam edin.
      </p>

      <h2>Capraz Derleme</h2>
      <p>
        Perry, kutudan cikar cikmaz capraz derlemeyi destekler. macOS gelistirme makinenizden
        Linux (x86_64 ve ARM64) ve iOS icin derleyebilirsiniz. Bu, macOS uzerinde CI/CD boru hattinizi
        olusturabileceginiz ve her platform icin ozel derleme makinelerine ihtiyac duymadan
        tum dagitim hedefleriniz icin ikililer uretebileceginiz anlamina gelir.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Performans</h2>
      <p>
        Perry ile derlenmis ikililer hizlidir. JIT isinmasi, yorumlayici yuku ve cop toplayici
        duraklamalari olmadigindan performans, ilk cagrimadan itibaren tahmin edilebilir ve tutarlidir.
      </p>
      <p>
        Kiyas testlerimizde:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Baslama suresi</strong> — fiilen 0 ms (yerel surec baslatma)</li>
        <li><strong>Ikili boyutu</strong> — tipik CLI araclari icin 2-5 MB (paketlenmis Node.js icin 50+ MB&apos;ye karsi)</li>
        <li><strong>Bellek kullanimi</strong> — esdeger Node.js uygulamalarindan 5-10 kat daha az</li>
        <li><strong>Is hacmi</strong> — hesaplama yogun is yukleri icin elle yazilmis C ile rekabet edebilir</li>
      </ul>
      <p>
        Canli kiyas testlerini{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a> adresinde gorebilirsiniz; burada Perry ile derlenmis calistirilabilir dosyalar Node.js ve Bun ile gercek zamanli olarak karsilastirilir.
      </p>

      <h2>Mevcut Durum</h2>
      <p>
        Perry aktif gelistirme asamasindadir. Derleyici, test paketi genelinde 62 testin 62&apos;sini
        gecerek kararli durumdadir. Alti platform UI arka ucunun tamami islevseldir. Temel
        dil ozellikleri saglamdir ve genislemektedir.
      </p>
      <p>
        UI widget kutuphanesini genisletmek, string ve nesne performansini iyilestirmek,
        tam regex destegini tamamlamak ve Stream modulunu olusturmak uzerinde aktif olarak calisiyoruz.
        Uzun vadede, WASM derleme hedefleri, coklu is parcacigi, VS Code uzantisi
        ve paket yoneticisi entegrasyonu planliyoruz.
      </p>
      <p>
        Neler gonderildi, neler devam ediyor ve sirada ne var gibi detaylar icin
        tam <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">yol haritasina</Link> goz atin.
      </p>

      <h2>Baslayin</h2>
      <p>
        Perry acik kaynaklidir. Depoyu klonlayabilir, kaynaktan derleyebilir ve bugun TypeScript
        derlemeye baslayabilirsiniz:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Kaynak koduna{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        &apos;da goz atin,{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">vitrin</Link>
        {" "}sayfasina bakarak Perry ile neler insa edildigini gorun veya dogrudan koda dalin.
        Ne insa edeceginizi gormek icin sabirsizlaniyoruz.
      </p>
    </>
  );
}
