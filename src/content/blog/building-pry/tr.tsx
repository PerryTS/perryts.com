import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry, tamamen TypeScript ile yazilmis ve Perry ile derlenmis yerel bir JSON goruntuluyucusudur. Bir
        teknoloji demosu degildir — API yanitlarini, yapilandirma dosyalarini ve veri dokumlerini incelemek icin her gun
        kullandigimiz gercek bir aractir. Bu yazi nasil yapildigini, nasil derlendigini ve TypeScript&apos;inizin
        yerel bir uygulamaya derlenmesinde gelistirici deneyiminin nasil oldugunu anlatir.
      </p>

      <h2>Pry Ne Yapar</h2>
      <p>
        Pry bir JSON dosyasini okur (veya stdin&apos;den JSON kabul eder) ve onu yerel bir pencerede
        etkilesimli, gezilebilir bir agac olarak render eder. macOS&apos;un yerlesik Quick Look&apos;unu JSON icin
        kullandiysaniz, onu hayal edin — ama daha hizli, aranabilir ve klavye odakli navigasyonla.
      </p>
      <p>
        Ozellik seti:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Agac gorunumu</strong> — nesneler ve diziler icin katlanabilir dugumler, derinlik gostergeleri ve tumunu genislet/daralt</li>
        <li><strong>Arama</strong> — anahtarlar ve degerler uzerinde gercek zamanli vurgulama ve eslesme navigasyonu ile tam metin arama</li>
        <li><strong>Klavye kisayollari</strong> — ok tuslari ile gezin, enter ile genislet/daralt, slash ile ara, <code className="text-perry-400">⌘C</code> ile kopyala</li>
        <li><strong>Pano</strong> — herhangi bir dugum veya alt agaci bicimlenmis JSON olarak kopyala</li>
        <li><strong>Sozdizimi renklendirme</strong> — dizeler yesil, sayilar turuncu, boolean&apos;lar mor, null kirmizi</li>
        <li><strong>Durum cubugu</strong> — toplam dugum sayisi, mevcut derinlik, dosya boyutu ve ayristirma suresi gosterir</li>
      </ul>

      <h2>Kaynak Kodu</h2>
      <p>
        Pry standart TypeScript ile yazilmistir. Ozel sozdizimi, makro veya
        derleme zamani kod uretimi yoktur. Perry&apos;nin UI API&apos;sini kullanir, bu da platforma ozgu
        koda derlenen yerel widget&apos;lar saglar.
      </p>
      <p>
        Iste giris noktasi (netlik icin basitlestirilmistir):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Isste yerel bir uygulamanin ozudur. Cerceve sablonu yok, derleme yapilandirmasi yok,
        platforma ozgu dosyalar yok. Tek bir TypeScript dosyasi.
      </p>

      <h3>Yardimci Fonksiyonlar</h3>
      <p>
        Pry ayrica JSON agacindaki tum dugumleri ozyinelemeli olarak sayan bir{" "}
        <code className="text-perry-400">countNodes</code> yardimci programi ve dosya boyutlarini
        goruntulemek icin bir <code className="text-perry-400">formatBytes</code> yardimcisi icerir. Bunlar
        standart TypeScript fonksiyonlaridir — Perry&apos;ye ozgu hicbir sey yok. Diger her sey gibi
        yerel koda derlenir.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Pry&apos;i Derlemek</h2>
      <p>
        Pry&apos;i Perry ile derlemek tek bir komuttur. Xcode projesi yok, Gradle yapilandirmasi yok,
        webpack yapilandirmasi yok. Sadece Perry&apos;yi giris dosyasina yonlendirin ve hedefinizi belirtin.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        Ikili dosya 48 MB&apos;dir cunku tam AppKit UI yiginini icerir — agac gorunumu renderlama,
        arama vurgulama, sozdizimi renklendirme ve klavye isleme. Karsilastirma icin, ayni uygulama
        Electron&apos;da 200+ MB olurdu. Sadece CLI olan bir Perry uygulamasi 2-5 MB&apos;ye derlenir.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        iOS derlemesi AppKit yerine UIKit&apos;e baglanir. Perry ayni{" "}
        <code className="text-perry-400">TreeView</code> API&apos;sini genisletilebilir bolumlerle <code className="text-perry-400">UITableView</code>&apos;a,{" "}
        <code className="text-perry-400">SearchBar</code>&apos;i{" "}
        <code className="text-perry-400">UISearchBar</code>&apos;a esler ve dokunma olaylari fare olaylarinin yerini alir.
        iOS derlemesi fiziksel cihazlara ve simulatorlere dagitilabilir.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Android derlemesi JNI araciligiyla yuklenen, bir APK&apos;ya paketlenmis yerel bir kutuphane uretir.{" "}
        <code className="text-perry-400">TreeView</code>, genisletilebilir view holder&apos;larla bir <code className="text-perry-400">RecyclerView</code>&apos;a,{" "}
        <code className="text-perry-400">SearchBar</code> bir <code className="text-perry-400">TextWatcher</code> ile bir{" "}
        <code className="text-perry-400">EditText</code>&apos;e ve durum cubugu yerlesimin altindaki bir{" "}
        <code className="text-perry-400">TextView</code>&apos;a eslenir.
      </p>

      <h2>Kaput Altinda Neler Olur</h2>
      <p>
        Perry Pry&apos;i derlediginde birden fazla asamadan gecer:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Ayristirma</strong> — SWC TypeScript kaynagini bir AST&apos;ye ayristirir.{" "}
          <code className="text-perry-400">perry/ui</code> ve <code className="text-perry-400">perry/fs</code>&apos;den
          ithalatlar Perry&apos;nin yerlesik modul uygulamalarina cozumlenir.
        </li>
        <li>
          <strong>Tur analizi</strong> — Perry, jenerik{" "}
          <code className="text-perry-400">State&lt;string&gt;</code> ve{" "}
          <code className="text-perry-400">State&lt;number&gt;</code> dahil tum turleri cozer,
          bunlari somut turlere monomorfize eder.
        </li>
        <li>
          <strong>Platform cozumlemesi</strong> — Hedef bayragina gore Perry uygun
          UI arka ucunu secer. Her <code className="text-perry-400">TreeView</code>,{" "}
          <code className="text-perry-400">SearchBar</code> ve <code className="text-perry-400">Button</code> cagrisi
          platforma ozgu uygulamaya cozumlenir.
        </li>
        <li>
          <strong>IR uretimi</strong> — Perry, yerel API cagilarini iceren bir ara temsil uretir —
          macOS/iOS icin Objective-C mesaj gondermeleri, Android icin JNI cagilari, GTK4/Win32 icin C fonksiyon cagilari.
        </li>
        <li>
          <strong>Kod uretimi</strong> — Cranelift, IR&apos;yi hedef mimari icin yerel makine koduna derler.
        </li>
        <li>
          <strong>Baglama</strong> — Yerel kod, son calistirilabilir dosyayi uretmek icin platform cercevelerine
          (AppKit, UIKit, Android NDK, GTK4 veya Win32) karsi baglanir.
        </li>
      </ol>

      <h2>Runtime Yok, Web Views Yok</h2>
      <p>
        Bu vurgulanmaya deger cunku Perry ile diger tum TypeScript&apos;ten-yerel&apos;e yaklasimlari
        arasindaki temel farktir. Derlenmis Pry ikilisinde:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>JavaScript motoru yok</strong> — V8 yok, Hermes yok, JavaScriptCore yok</li>
        <li><strong>Web views yok</strong> — Chromium yok, WebKit yok, WKWebView yok</li>
        <li><strong>Kopru katmani yok</strong> — JS ve yerel arasinda serializasyon edilmis mesajlar yok</li>
        <li><strong>Cerceve calisma zamani yok</strong> — React yok, Flutter motoru yok, Dart VM yok</li>
      </ul>
      <p>
        Ikili dosya platform API&apos;lerini dogrudan cagirir. macOS&apos;ta AppKit nesneleriyle etkilesmek icin{" "}
        <code className="text-perry-400">objc_msgSend</code> cagirir. Android&apos;de View&apos;leri olusturmak ve
        manipule etmek icin JNI fonksiyonlarini cagirir. Yerel bir Swift veya Kotlin uygulamasinin yapacagiyla aynidir.
      </p>
      <p>
        Pratik sonuc: Pry aninda baslar. VM baslatma yok, JIT isinma yok, betik ayristirma yok.
        Surec baslar, pencere goruntulenir, JSON render edilir. Bellek kullanimi bir Electron
        esdegerinin tuketeceginin kucuk bir parcasidir.
      </p>

      <h2>Gelistirici Deneyimi</h2>
      <p>
        Pry&apos;i insa etmek herhangi bir TypeScript uygulamasi insa etmeye dikkat cekici olcude benziyordu.
        Is akisi:
      </p>
      <ol className="list-decimal list-inside">
        <li>Editorunuzde TypeScript yazin (VS Code, Zed, Neovim, ne tercih ederseniz)</li>
        <li><code className="text-perry-400">perry compile pry.ts</code> calistirin</li>
        <li><code className="text-perry-400">./pry test.json</code> calistirin</li>
        <li>Tekrarlayin</li>
      </ol>
      <p>
        Yapilandirilacak Xcode projesi yok. Yuklenecek Android Studio yok. 45 saniye suren Gradle
        derlemesi yok. Perry derleyicisinin kendisi hizlidir — Pry&apos;i ayristirmak ve derlemek birkac
        saniye surer ve daha hizli hale getirmek icin aktif olarak calisiyoruz.
      </p>
      <p>
        Yazdiginiz TypeScript standart TypeScript&apos;tir. Editorunuzun tur kontrolu,
        otomatik tamamlama ve yeniden duzenleme araclari calisir. Fonksiyonlari cikarabilir, moduller olusturabilir,
        jenerikler kullanabilirsiniz — zaten bildiginiz tum TypeScript kaliplari.
      </p>

      <h2>Neler Ogrendik</h2>
      <p>
        Pry&apos;i insa etmek bize Perry UI API&apos;sinin neyi desteklemesi gerektigi hakkinda cok sey ogretti. Bazi dersler:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Agac gorunumleri karmasiktir.</strong> Genisletme, daraltma, arama vurgulama,
          klavye navigasyonu ve pano entegrasyonunun koordine edilmesi gerekir. Perry&apos;nin{" "}
          <code className="text-perry-400">TreeView</code> widget&apos;i bunu dahili olarak yonetir, ancak
          yerel uygulamanin uc platformda da tutarli oldugundan emin olmamiz gerekti.
        </li>
        <li>
          <strong>Klavye kisayollarinin platform konvansiyonlarina ihtiyaci var.</strong> macOS&apos;ta kopyalamak icin{" "}
          <code className="text-perry-400">⌘C</code>. Linux ve Android&apos;de{" "}
          <code className="text-perry-400">Ctrl+C</code>. Perry&apos;nin kisayol sistemi bunu soyutlar,
          ancak dogru yapilmasi icin dikkatli uygulama gerektirdi.
        </li>
        <li>
          <strong>Durum cubuklari sasirtici olcude onemsiz degildir.</strong> Her platformun durum bilgisini
          nerede ve nasil goruntuleyecegi konusunda farkli bir konvansiyonu var. AppKit pencerenin
          alt cubugunu kullanir, UIKit bir arac cubugu kullanir, Android yerlesimde bir alt gorunum kullanir. Perry&apos;nin{" "}
          <code className="text-perry-400">StatusBar</code>&apos;i her birine dogru sekilde eslenir.
        </li>
        <li>
          <strong>Stdin destegi platform farkindaligi gerektirir.</strong> macOS ve Linux&apos;ta stdin&apos;den
          okumak basittir. iOS ve Android&apos;de &quot;stdin&quot; ayni sekilde mevcut degildir,
          bu nedenle Pry mobil platformlarda bunun yerine dosya secimi kullanir. Perry&apos;nin{" "}
          <code className="text-perry-400">readStdin</code>&apos;i bunu seffaf bir sekilde yonetir.
        </li>
      </ul>

      <h2>Performans</h2>
      <p>
        Pry buyuk JSON dosyalarini rahatca yonetir. Testlerimizde:
      </p>
      <ul className="list-disc list-inside">
        <li>1 MB JSON dosyasi (10.000+ dugum) 50 ms&apos;nin altinda ayristirilir ve render edilir</li>
        <li>10 MB JSON dosyasi 200 ms&apos;nin altinda render edilir</li>
        <li>10.000 dugum uzerinde arama, siz yazarken sonuclari dondurur, gorunur gecikme olmadan</li>
        <li>Bellek kullanimi buyuk dosyalar icin bile 50 MB&apos;nin altinda kalir</li>
      </ul>
      <p>
        Bu, yerel derlemenin avantajidir. Perry&apos;deki JSON ayristirma, GC duraklamasi olmadan
        sikistrilmis yerel donguler olarak derlenir. Agac renderlama, platformun kendi
        sanallastirilmis liste gorunumlerini (NSOutlineView, UITableView, RecyclerView) kullanir,
        bunlar performans icin savasla test edilmistir.
      </p>

      <h2>Kaynak ve Indirmeler</h2>
      <p>
        Pry acik kaynaklidir. Tam kaynaga goz atabilir, kendiniz derleyebilir veya sadece
        bir Perry yerel UI uygulamasinin nasil yapildigini anlamak icin koda bakabilirsiniz.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/perryts/pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            GitHub deposu
          </a>{" "}
          — tam kaynak kodu ve derleme talimatlari
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            Vitrin sayfasi
          </Link>{" "}
          — ekran goruntuleri, ozellik listesi ve platform detaylari
        </li>
      </ul>
      <p>
        Perry ile bir seyler insa ediyorsaniz, duymak isteriz.{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          Perry deposunda
        </a>{" "}
        bir sorun acin veya bir tartisma baslatin. Perry&apos;yi acikca insa ediyoruz ve gercek uygulamalar
        insa eden gercek kullanicilardan gelen geri bildirim paha bicilemez.
      </p>
    </>
  );
}
