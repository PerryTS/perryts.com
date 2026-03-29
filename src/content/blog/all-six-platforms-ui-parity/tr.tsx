import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry&apos;nin yerel UI sisteminin ilk surumunu gonderdigimizde &quot;coklu platform&quot; macOS&apos;un iyi calisip diger bes platformun stub oldugu anlamina geliyordu. Bugun v0.2.162 ile bu artik gecerli degil. Alti platformun tamami — macOS, iOS, iPadOS, Android, Linux ve Windows — artik tam ozellik paritesini paylasiyor. Ayni TypeScript kodu her hedefte yerel widget&apos;lara derleniyor.
      </p>
      <p>
        Bu yazi v0.2.152 ve v0.2.164 arasinda neler gonderdigimizi kapsiyor: bir Canvas widget&apos;i, tam bir NSTableView uygulamasi, toplam 20&apos;den fazla UI widget&apos;i,{" "}
        <code className="text-amber-400">perry/system</code> modulu, coklu pencere destegi, sistem bildirimleri, anahtarlik erisimi, otomatik ikili boyut azaltma ve derleme zamani eklenti sistemi. Cok sey oldu.
      </p>

      <h2>Widget Sprinti: 20&apos;den Fazla Yerel UI Bileseni</h2>
      <p>
        En buyuk atlama v0.2.155&apos;te geldi ve tum platformlarda 20&apos;den fazla UI widget&apos;i getirdi. Perry&apos;nin TypeScript UI API&apos;si artik gercek bir uygulama gondermek icin ihtiyaciniz olan bilesenleri kapsiyor:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Yerlesim</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>Giris</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>Goruntuleme</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>Veri</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>Kaplama</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>Cizim</strong> — Canvas (2D cizim API&apos;si, platform basina donanim hizlandirilmis)</li>
      </ul>
      <p>
        Bunlar ozel bir renderlayici etrafindaki sarmalayicilar degildir. Her widget platformun kendi yerel bilesenine derlenir: macOS&apos;ta <code className="text-amber-400">NSButton</code>,{" "}
        iOS&apos;ta <code className="text-amber-400">UIButton</code>,{" "}
        Linux&apos;ta <code className="text-amber-400">GtkButton</code>,{" "}
        Android&apos;de JNI araciligiyla <code className="text-amber-400">android.widget.Button</code> ve{" "}
        Windows&apos;ta <code className="text-amber-400">CreateWindowEx</code>. Isletim sistemi onlari cizer, temalar ve erisilebilirlik islenir — Perry sadece TypeScript API&apos;sini baglar.
      </p>

      <h2>Canvas: TypeScript&apos;ten 2D Cizim</h2>
      <p>
        Teknik olarak en ilginc eklemelerden biri Canvas widget&apos;idir (v0.2.152). Dogrudan TypeScript&apos;ten taninidik bir 2D cizim API&apos;si sunar ve platformun hizlandirilmis 2D arka ucuna derlenir: macOS/iOS&apos;ta Core Graphics, Linux&apos;ta Cairo, Windows&apos;ta Direct2D ve Android&apos;de Skia.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compiles to Core Graphics on macOS, Cairo on Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Table Widget&apos;i: NSTableView TypeScript&apos;e Geliyor</h2>
      <p>
        v0.2.163 Table widget&apos;ini getirdi — kutuphanedeki en karmasik bilesen. macOS&apos;ta tam delege/veri kaynagi baglantisiyla <code className="text-amber-400">NSTableView</code>&apos;a eslenir. Linux&apos;ta GTK4&apos;un <code className="text-amber-400">GtkTreeView</code>&apos;unu kullanir. Windows&apos;ta Win32&apos;nin <code className="text-amber-400">ListView</code> kontrolu. Android&apos;de JNI araciligiyla <code className="text-amber-400">RecyclerView</code>&apos;a baglanir.
      </p>
      <p>
        TypeScript API&apos;si bildirimseldir: sutunlari tanimlar, bir veri kaynagi saglarsınız ve Perry derleme zamaninda platforma ozgu baglantilari yonetir.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// TypeScript array of objects</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>perry/system Modulu</h2>
      <p>
        v0.2.155 ayrica <code className="text-amber-400">perry/system</code>&apos;i tanitti — hicbir calisma zamani olmadan platform sistem API&apos;lerini sunan bir TypeScript modulu: dosya diyaloglari, kaydetme diyaloglari, uyarilar, sheets, anahtarlik erisimi, sistem bildirimleri ve coklu pencere yonetimi.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — yerel dosya secici</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — yerel kaydetme diyalogu</li>
        <li><code className="text-amber-400">system.showAlert()</code> — yerel uyari paneli</li>
        <li><code className="text-amber-400">system.notify()</code> — isletim sistemi bildirimi</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — coklu pencere yonetimi</li>
      </ul>

      <h2>Alti Platform Ozellik Paritesi: v0.2.162</h2>
      <p>
        v0.2.162 bosluklari kapatmakla ilgiliydi. Bu surumden once macOS en tam ozellik setine sahipti, iOS neredeyse oradaydi ve Linux/Windows/Android gerideydi. v0.2.162 tum platformlari ayni seviyeye getirdi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, tam widget seti, Keychain, bildirimler, coklu pencere, arac cubugu</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, macOS ile tam widget paritesi, sahne yasam dongusu</li>
        <li><strong>Android</strong> — JNI koprüsü, Android Views araciligiyla tum widget&apos;lar, NDK capraz derleme</li>
        <li><strong>Linux</strong> — GTK4, Table dahil tam widget seti, dosya diyaloglari, libsecret anahtarlik</li>
        <li><strong>Windows</strong> — Win32, tum widget&apos;lar, Windows Credential Store, WinRT bildirimleri</li>
      </ul>

      <h2>Otomatik Ikili Boyut Azaltma</h2>
      <p>
        v0.2.153 otomatik ikili boyut azaltmayi getirdi — derleyici artik kullanilmayan kod yollarini agresif sekilde cikarir, ulasilamaz stdlib fonksiyonlarini eler ve baglama sirasinda sembol tanimlarini tekil hale getirir. Onceden ~4 MB&apos;ye derlenen tipik bir CLI araci artik kaynak kodunuzda sifir degisiklikle 2 MB&apos;nin altina iniyor.
      </p>

      <h2>Derleme Zamani Eklenti Sistemi</h2>
      <p>
        v0.2.152 Perry&apos;nin eklenti sistemini tanitti. Calisma zamani eklenti yuklemesi yok, IPC yok, dinamik <code className="text-amber-400">require()</code> yok. Eklentiler Perry&apos;nin derleme zamaninda cozdugu TypeScript modulleridir.
      </p>
      <p>
        Bunun arkasindaki felsefeyi{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          Eklenti Sistemleri Performans Vergisidir
        </Link> yazisinda yazdik. Calisma zamani eklenti mimarileri performansi genisletilebilirlik icin takas eder. Derleme zamani bilesimi ikisini birden verir.
      </p>

      <h2>Dil Iyilestirmeleri</h2>
      <p>
        UI sprinti tek basina gerceklesmedi — derleyicinin kendisi de daha yetenekli olmaya devam etti:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Sinif ifadeleri</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> artik dogru derleniyor</li>
        <li><strong>Generator donusumleri</strong> — <code className="text-amber-400">function*</code> ve <code className="text-amber-400">yield</code> yerel durum makinelerine derleniyor</li>
        <li><strong>Sinif alani olarak Map/Set</strong> — <code className="text-amber-400">private items = new Map()</code> codegen&apos;de calisiyor</li>
        <li><code className="text-amber-400">string.match()</code> — artik tam olarak destekleniyor</li>
        <li><strong>Web hedefi</strong> — Perry karma dagitimlar icin web uyumlu ciktiya derleyebiliyor</li>
      </ul>

      <h2>Sirada Ne Var</h2>
      <p>
        Alti platform UI paritesi gonderildigine gore sonraki asama genislik yerine derinliktir:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Tam RegExp destegi</li>
        <li>Surukle birak, ozel baglam menuleri ve erisilebilirlik etiketleri</li>
        <li>Perry teshis icin VS Code uzantisi</li>
        <li>Paket yoneticisi entegrasyonu</li>
        <li>WASM derleme hedefi</li>
        <li><code className="text-amber-400">Worker</code> iplikleri araciligiyla coklu is parcacigi</li>
      </ul>
      <p>
        Takip etmek istiyorsaniz{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Perry deposu
        </a>{" "}
        aciktir.{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">Vitrine</Link>
        {" "}bakarak neler yapildigini gorun veya{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">yol haritasina</Link>
        {" "}goz atin.
      </p>
    </>
  );
}
