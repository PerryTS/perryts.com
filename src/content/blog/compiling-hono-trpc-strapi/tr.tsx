export default function Content() {
  return (
    <>
      <p>
        Perry artik uc buyuk TypeScript cercevesini — Hono, tRPC ve Strapi — yerel ARM64 calistirilabilir dosyalara derliyor. Bir saniyenin altinda derleniyor, 2 MB&apos;nin altinda ikililer uretiyor ve cokme olmadan calisiyor.
      </p>
      <p>
        Bu yazi nelerin calistigini, nelerin henuz calismadigini ve derleyiciyi gercek dunya koduna karsi test ederken neler ogrendigimizi kapsiyor.
      </p>

      <h2>Projeler</h2>
      <p>
        Bu ucu sectik cunku farkli TypeScript sekillerini temsil ediyorlar:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — Hafif bir web cercevesi (29 modul). Yogun jenerik kullanimi, sinif kalitimi, dinamik metot atamasi ve <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>{" "} Web API&apos;leri. Disari aktarma yapisi barrel dosyalari araciligiyla adli yeniden disari aktarmalar kullanir.
        </li>
        <li>
          <strong>tRPC</strong> — Tur guvenli bir RPC cercevesi (52 modul). 4+ seviye uzerinde derin yeniden disari aktarma zincirleri, jenerik tur daraltmali olusturucu deseni, modul kapsaminda sinif ornekleme ve Web Streams araciligiyla akis.
        </li>
        <li>
          <strong>Strapi</strong> — Basiz bir CMS cekirdegi (4 modul yerel olarak derlendi, gerisi harici olarak cozumlendi). Calisma alani paket cozumlemeli monorepo, ad alani yeniden disari aktarmalari (<code className="text-perry-400">export * as X</code>), <code className="text-perry-400">Map</code> ile hizmet konteyneri deseni ve fabrika fonksiyonlari.
        </li>
      </ul>

      <h2>Derleme Sonuclari</h2>
      <p>
        Ucu de sifir derleme hatasiyla yerel ikililer olarak derleniyor:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Proje</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Derlenen Moduller</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Ikili Boyutu</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Derleme Suresi</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Her kaynak modul tam boru hattindan gecer: SWC ayristirma, HIR indirme, Cranelift kod uretimi, nesne dosyasi cikarma ve yerel baglama. Derleme sureleri hepsini icerir — ayristirmadan son baglantiya kadar.
      </p>
      <p>
        Baglam olarak, tek basina tRPC uzerinde <code className="text-perry-400">tsc --noEmit</code> birkac saniye surer. Perry 52 modulu bir saniyenin altinda baglanmis yerel bir ikiliye derler.
      </p>

      <h2>Calisma Zamaninda Ne Calisiyor</h2>

      <h3>Moduller Arasi Sinif Ornekleme</h3>
      <p>
        Bu buyuk donum noktasiydi. Hono&apos;nun disari aktarma yapisi soyle gorunur:
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">hono export chain</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>
        Bu <code className="text-perry-400">export {"{"} Hono {"}"}</code> adli bir yeniden disari aktarmadir — <code className="text-perry-400">export * from</code> veya <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code> degil. Perry&apos;nin HIR&apos;inda bu <code className="text-perry-400">Export::Named</code> olur, <code className="text-perry-400">Export::ReExport</code> veya <code className="text-perry-400">Export::ExportAll</code> degil. Onceden derleyicinin sinif yayilimi yalnizca <code className="text-perry-400">ExportAll</code> ve <code className="text-perry-400">ReExport</code> zincirlerini takip ediyordu, bu nedenle <code className="text-perry-400">index.ts</code>&apos;den <code className="text-perry-400">Hono</code>&apos;yu iceri aktarmak sessizce basarisiz oluyordu — sinif arama iskalaniyordu ve <code className="text-perry-400">new Hono()</code> <code className="text-perry-400">undefined</code> donduruyordu.
      </p>
      <p>
        Artik Perry <code className="text-perry-400">Export::Named</code>&apos;i modulun iceri aktarmalari araciligiyla orijinal sinif tanimini bulmak ve yaymak icin geri izler. Sonuc:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>
      <p>
        Hono yapicisi calisir, bir <code className="text-perry-400">SmartRouter</code> baslatir (dahili olarak hem bir <code className="text-perry-400">RegExpRouter</code> hem de bir <code className="text-perry-400">TrieRouter</code> olusturur) ve gercek bir nesne dondurur. Birden fazla bagimsiz ornek calisir. Yapici secenekleri kabul edilir.
      </p>

      <h3>Cok Seviyeli Yeniden Disari Aktarma Cozumlemesi</h3>
      <p>
        tRPC&apos;nin <code className="text-perry-400">initTRPC</code>&apos;si 4 seviye derinliktedir:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>
        Bu <code className="text-perry-400">ExportAll</code> → <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>&apos;dir. Perry tam zinciri cozer — <code className="text-perry-400">initTRPC</code> derlenmis ikilide erisilebilir. Ayni yolu izleyen <code className="text-perry-400">TRPCError</code> icin de ayni.
      </p>

      <h3>Argumanlari Olan Moduller Arasi Sinif Ornekleme</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">err</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCError</span>({"{"} code: <span className="text-green-400">&apos;NOT_FOUND&apos;</span>, message: <span className="text-green-400">&apos;resource missing&apos;</span> {"}"})</p>
          <p className="text-green-400">// PASS: new TRPCError() returned object</p>
          <p className="text-green-400">// PASS: err.code = NOT_FOUND</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">TRPCError</code> bir modulde tanimlanir, uc ara barrel dosyasi araciligiyla yeniden disari aktarilir, testte iceri aktarilir ve bir secenekler nesnesiyle orneklenir. Ornegin <code className="text-perry-400">code</code> alani erisilebilir.
      </p>

      <h3>Monorepo&apos;larda Paket Cozumlemesi</h3>
      <p>
        Strapi calisma alani paketleri kullanir — <code className="text-perry-400">@strapi/core</code> monorepo&apos;da bir kardes pakettir, npm bagimliligi degildir. Perry, <code className="text-perry-400">package.json</code> exports alanlari araciligiyla ciplak belirticiyi cozer:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-green-400">&quot;exports&quot;</span>: {"{"}</p>
          <p>  <span className="text-green-400">&quot;.&quot;</span>: {"{"} <span className="text-green-400">&quot;source&quot;</span>: <span className="text-green-400">&quot;./src/index.ts&quot;</span>, <span className="text-green-400">&quot;import&quot;</span>: <span className="text-green-400">&quot;./dist/index.mjs&quot;</span> {"}"}</p>
          <p>{"}"}</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">createStrapi</code> fonksiyonu <code className="text-perry-400">export * from &apos;@strapi/core&apos;</code> araciligiyla cagirilabilir bir fonksiyon olarak dogru sekilde cozumlenir.
      </p>

      <h3>Yalnizca Tur Disari Aktarma Filtrelemesi</h3>
      <p>
        TypeScript&apos;in <code className="text-perry-400">export type {"{"} Foo {"}"}</code> sozdiziminin calisma zamani anlamı yoktur — ancak onceden Perry bunlari baglayici araciligiyla yayilan ve stub sembolleri ureten gercek <code className="text-perry-400">Export::ReExport</code> girislerine donusturuyordu. Hono&apos;nun <code className="text-perry-400">index.ts</code>&apos;si tek basina onlarca turu kapsayan dort <code className="text-perry-400">export type</code> bildirimi icerir.
      </p>
      <p>
        Perry artik <code className="text-perry-400">ExportNamed</code> bildirimlerinde SWC&apos;nin <code className="text-perry-400">type_only</code> bayragini ve bireysel belirticilerde <code className="text-perry-400">is_type_only</code>&apos;yi kontrol eder ve bunlari HIR indirme sirasinda atlar. Bu, uc projenin tamaminda tur yeniden disari aktarmalarindan olu stub uretimini ortadan kaldirdi.
      </p>

      <h3>RegExp Yapicisi</h3>
      <p>
        <code className="text-perry-400">new RegExp(pattern, flags)</code> artik Perry&apos;nin mevcut <code className="text-perry-400">js_regexp_new</code> calisma zamani fonksiyonuna derlenir. Bu basitti — calisma zamani zaten RegExp&apos;i destekliyordu — ancak <code className="text-perry-400">Expr::New</code> codegen isleyicisinde bunun icin bir durum yoktu, bu nedenle her <code className="text-perry-400">new RegExp(...)</code> bir &quot;Unknown class&quot; uyarisina dusuyordu. Hono&apos;nun <code className="text-perry-400">RegExpRouter</code>&apos;u bunu kapsamli olarak kullanir.
      </p>

      <h2>Henuz Ne Calismiyor</h2>
      <p>
        Burada belirgin oluyoruz cunku bosluklar kazanimlar kadar cok sey anlatiyor.
      </p>

      <h3><code className="text-perry-400">this</code> Uzerinde Dinamik Ozellik Atamasi</h3>
      <p>
        Hono&apos;nun yapicisi HTTP metot isleyicilerini dinamik olarak kurar:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">allMethods</span> = [<span className="text-green-400">&apos;get&apos;</span>, <span className="text-green-400">&apos;post&apos;</span>, <span className="text-green-400">&apos;put&apos;</span>, <span className="text-green-400">&apos;delete&apos;</span>, ...]</p>
          <p><span className="text-cyan-400">allMethods</span>.<span className="text-yellow-400">forEach</span>((<span className="text-cyan-400">method</span>) =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">this</span>[<span className="text-cyan-400">method</span>] = (<span className="text-cyan-400">args1</span>, ...<span className="text-cyan-400">args</span>) =&gt; {"{"}</p>
          <p>    <span className="text-slate-500">// register route</span></p>
          <p>    <span className="text-purple-400">return this</span></p>
          <p>  {"}"}</p>
          <p>{"}"})</p>
        </div>
      </div>
      <p>
        Bu, <code className="text-perry-400">app.get</code>, <code className="text-perry-400">app.post</code> vb.&apos;nin statik olarak bildirilmedigini — hesaplanmis ozellik adlari araciligiyla calisma zamaninda atandigini gosterir. Perry henuz <code className="text-perry-400">this[variable] = value</code>&apos;yu desteklemiyor, bu nedenle bu metotlar eksik:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">[4] Dynamic method assignment (this[method] = ...)</span></p>
          <p className="text-amber-400">  INFO: app.get not available</p>
          <p className="text-amber-400">  INFO: app.on not available</p>
        </div>
      </div>
      <p>
        Bu Hono icin en buyuk bosluktur. Hono sinifi mevcuttur, yonlendiricisi baslatilmistir, ancak rota kaydedemezsiniz.
      </p>

      <h3>Modul Seviyesi Yapici Cagrilari</h3>
      <p>tRPC giris noktasini su sekilde tanimlar:</p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">export const</span> <span className="text-cyan-400">initTRPC</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCBuilder</span>()</p>
        </div>
      </div>
      <p>
        Calisma zamaninda <code className="text-perry-400">initTRPC</code>, <code className="text-perry-400">typeof object</code> yerine <code className="text-perry-400">typeof function</code> olarak gorunur — modul seviyesi <code className="text-perry-400">new TRPCBuilder()</code> ifadesi yapiciyi calistirmiyor, bu nedenle bir ornek yerine sinifa bir referans elde edersiniz. Bu <code className="text-perry-400">initTRPC.create()</code> ve <code className="text-perry-400">initTRPC.context()</code>&apos;un her ikisinin de <code className="text-perry-400">undefined</code> oldugu anlamina gelir.
      </p>

      <h3>Miras Alinan Ozellikler</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code> ve <code className="text-perry-400">err.code</code> (<code className="text-perry-400">TRPCError</code> uzerinde dogrudan tanimlanmis) calisirken, <code className="text-perry-400">err.message</code> (<code className="text-perry-400">Error</code>&apos;dan miras alinan) erisilebilir degildir. Ozellik arama icin prototip zinciri tam olarak uygulanmamistir.
      </p>

      <h3>Karmasik Yapici Zincirleri</h3>
      <p>
        Strapi&apos;nin <code className="text-perry-400">createStrapi()</code> fonksiyonu dahili olarak <code className="text-perry-400">new Strapi(opts)</code>&apos;u cagirir, bu <code className="text-perry-400">Container</code>&apos;i (<code className="text-perry-400">Map</code> tarafindan desteklenen) genisletir, <code className="text-perry-400">loadConfiguration()</code>&apos;i cagirir, saglayicilari yineler ve hizmetleri kaydeder. Bu derin yapici zinciri bir falsy donus degeri uretir — cokmiyor ancak kullanilabilir bir ornek de uretmiyor.
      </p>

      <h3>Web API Yerlesik Siniflari</h3>
      <p>
        Uc proje genelinde kalan &quot;Unknown class&quot; uyarilari bunlardir:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Sinif</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Sayi</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Response", "11"],
              ["TransformStream", "7"],
              ["ReadableStream", "5"],
              ["Request", "4"],
              ["Headers", "3"],
              ["Proxy", "2"],
              ["TextEncoderStream", "2"],
              ["WritableStream", "1"],
              ["DOMException", "1"],
            ].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800">
                <td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td>
                <td className="py-2 px-4 text-slate-400">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code> ve <code className="text-perry-400">Headers</code> herhangi bir HTTP cercevesi icin kritik olanlardir. Bunlar <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>, <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>, <code className="text-perry-400">AbortController</code> ve digerleri icin sahip oldugumuz benzer yerlesik codegen destegine ihtiyac duyar.
      </p>

      <h2>Bu Bize Ne Anlatiyor</h2>
      <p>
        Iyi haber: Perry&apos;nin derleme boru hatti gercek cerceve koduyla basariyla ilgileniyor. Karmasik yeniden disari aktarma zincirleri, jenerik agirlikli tur imzalari, sinif hiyerarsileri ve monorepo paket cozumlemesi olan cok dosyali projeler bagli ikililer olusturmak icin tamamiyla geciyor.
      </p>
      <p>
        Bosluklar calisma zamani bosluklaridir, derleme bosluklari degil. Kalan is:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Dinamik ozellik atamasi</strong> — metotlari programatik olarak kuran cerceveler icin gerekli</li>
        <li><strong>Modul seviyesi baslangic ifadeleri</strong> — <code className="text-perry-400">export const x = new Foo()</code> gercekten yapiciyi calistirmali</li>
        <li><strong>Prototip zinciri</strong> — miras alinan ozellikler ve metotlar</li>
        <li><strong>Web API yerlesikleri</strong> — HTTP cercereleri icin <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code></li>
      </ol>
      <p>
        Bunlar somut, iyi kapsamli sorunlardir. Hicbiri mimari degisiklik gerektirmez — daha basit durumlar icin zaten calisan kaliplarin uzantilaridir.
      </p>
      <p>
        Bunlar uzerinde calismaya devam edecegiz. Hedef <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>&apos;in yerel bir ikilide calisan bir HTTP sunucusu uretmesidir.
      </p>
    </>
  );
}
