export default function Content() {
  return (
    <>
      <p>
        Son yazı <strong>v0.5.875</strong>&apos;te GC hikayesiyle bitmişti — aya_koto&apos;nun benchmark&apos;ının açığa çıkardığı açığı kapatmakla. O yazı tek bir benchmark&apos;ı kazanmakla ilgiliydi. Bu yazı farklı türden bir işle ilgili: yaklaşık dört hafta boyunca inen, neredeyse hiçbiri benchmark manşeti olmayan <strong>v0.5.875 ile v0.5.1146 arasındaki kabaca 270 sürüm</strong>. Tema, &ldquo;bir mikrobenchmark&apos;ta hızlı git&rdquo;ten <strong>&ldquo;gerçek dünya TypeScript&apos;ini ve gerçek npm paketlerini gerçekten derle ve çalıştır&rdquo;</strong>a kaydı. Artı yol boyunca tam bir Windows görsel elden geçirmesi ve bir yığın yeni widget.
      </p>
      <p>
        İşte yayınlananlar, gerçekte ne için olduklarına göre gruplanmış.
      </p>

      <h2>Gerçek npm paketleri artık derleniyor</h2>
      <p>
        Bu pencerenin en büyük tek dizisi, popüler npm paketlerini native ikiliklere derleyip davranışsal testleri geçirmeye yönelik bir süpürme — yalnızca &ldquo;hatasız linkle&rdquo; değil, çalış ve doğru çıktıyı üret. <code>perry.compilePackages</code> üzerinden artık çalışan liste şunları içeriyor: <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2 ve Colyseus</strong>.
      </p>
      <p>
        Her biri kendi nedeniyle başarısız oluyordu ve her düzeltme kendi küçük hikayesi:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong>, <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code> ile çöküyordu. Kök neden (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>F</code>&apos;in başka bir modülden import edilmiş bir fonksiyon olduğu <code>new F()</code> sessizce boş bir nesne üretiyordu — constructor gövdesi hiç çalışmadığı için, her <code>$ZodCheckMinLength</code>-tarzı kontrol <code>_zod</code> property&apos;sinden soyulmuş halde geri geliyordu.</li>
        <li><strong>axios + jose</strong>, Perry&apos;nin henüz sahip olmadığı crypto ve sıkıştırmaya ihtiyaç duyuyordu: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, AES-GCM için <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> ve <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong>, <code>wait_for_promise</code>&apos;teki bir saniyelik polling timeout&apos;unda deadlock&apos;a giriyordu; onu bir condvar bekleyişiyle değiştirdik ve reddedilen promise&apos;ların asılı kalmak yerine <code>HTTP 500</code> olarak yüzeye çıkmasını sağladık (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> bir POST gövdesini okuyamıyordu — v0.5.1142&apos;deki bir parent-registration düzeltmesine kadar <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> POST/PUT&apos;ta boş dönüyordu.</li>
        <li><strong>chalk, ms, debug, express</strong> hepsi aynı şekle çarptı: <em>property&apos;leri iliştirilmiş çağrılabilir bir değer</em> (<code>chalk.red</code>, <code>express()</code> artı <code>express.Router</code>). Bu örüntünün üç çeşidi v0.5.935 ve onu çevreleyen npm süpürmesi boyunca düzeltildi, artı express&apos;i serbest bırakmak için <code>util.inherits</code> + bir stream prototype iskeleti (v0.5.990).</li>
        <li><strong>dayjs</strong>, minify edilmiş bir bundle olarak yayınlanmış halde, Perry&apos;nin yanlış lower ettiği JS-klasik prototype-metot dispatch&apos;ini (<code>Class.prototype.m = fn</code>) çalıştırıyordu (v0.5.924/932).</li>
      </ul>
      <p>
        Tüm bunların altında, Perry&apos;nin native derleyemediği paketlerin yine de çalışmasını sağlayan kısım yatıyor: <strong>V8-fallback runtime</strong> bu pencerede gerçek oldu. ModuleLoader&apos;ı artık gömülü bir modül haritasından okuyor, dolayısıyla bir fallback ikiliği hâlâ <strong>kendi kendine yeterli</strong> — runtime&apos;da gevşek <code>node_modules</code> yok (v0.5.994). <code>createServer</code> gerçek bir hyper sunucusuna köprü kuruyor (v0.5.999) ve <code>Response</code> / <code>Request</code> / <code>Headers</code> Web Fetch global&apos;leri fallback yolunda mevcut (v0.5.1006). Ve <strong>derleme zamanı dinamik <code>import()</code></strong> — build zamanında çözülen string-literal <code>await import(&apos;./foo.ts&apos;)</code> — nihayet indi (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Bir test262 uygunluk süpürmesi</h2>
      <p>
        Diğer baskın dizi uygunluk. test262 alt küme radarlarına karşı odaklı geçişler yaptık ve gerçek kodun en çok dayandığı built-in&apos;lerde iğneyi oynattık:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        String sıçraması, her <code>String.prototype</code> metoduna generic-<code>this</code> dispatch vermekten ve <code>slice</code>/<code>substring</code> index coercion&apos;ını düzeltmekten geldi. Array sıçraması, dense-array callback&apos;lerindeki (<code>forEach</code>/<code>map</code>/<code>filter</code>/…) <code>thisArg</code>, array-like <code>ToLength</code>, spec işlem sıralaması ve sıfır-argümanlı doğrulamaydı. Destructuring; düz, generator, async-generator, static ve private sınıf metotları boyunca parametre-destructuring kazandı.
      </p>
      <p>
        Manşet sayıların yanında, uzun bir doğruluk kuyruğu indi: <code>JSON.parse</code> artık gerçek bir <code>SyntaxError</code> fırlatıyor (<code>TypeError</code> değil) ve sondaki token&apos;ları reddediyor; reviver&apos;ı spec <code>InternalizeJSONProperty</code> algoritmasıyla dolaşıyor; <code>Object.prototype.toString</code> typed array&apos;ler, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp için doğru markalıyor; <code>RegExp.prototype.toString</code> <code>/source/flags</code> döndürüyor; async generator&apos;lar <code>yield</code>-awaits-operand semantiğini doğru aldı. Bunlar alt küme radarları, tam paket değil — Perry hâlâ tırmanıyor — ama bu ayki tırmanış dikti.
      </p>

      <h2>Windows Fluent oluyor</h2>
      <p>
        Windows bir görsel elden geçirme aldı (<a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a> serisi). Perry pencereleri artık varsayılan olarak modern DWM chrome&apos;una geçiyor — <strong>Mica backdrop</strong>, yuvarlatılmış köşeler ve tema-duyarlı bir başlık çubuğu — ve ortak kontroller Windows 95 dönemi varsayılanları yerine <strong>comctl32 v6</strong> üzerinden render ediliyor. Window proc artık <code>WM_DPICHANGED</code>&apos;i ele alıyor, böylece bir pencereyi karışık ölçekli monitörler arasında sürüklediğinizde bitmap olarak gerilmek yerine net kalıyor.
      </p>
      <p>
        Kritik olarak, bunların hiçbiri eski <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;yeniden boyutlandırmadan sonra siyah alan&rdquo; gerilemesini yeniden getirmedi: client alanı hâlâ opak boyanıyor ve tam çerçeve Mica/Acrylic blur-through açık bir <code>app.setVibrancy(...)</code> opt-in&apos;i olarak kalıyor. Ayrıca tamamen modern yığını isteyen uygulamalar için yeni bir <code>--target windows-winui</code> backend iskelesi (WinUI 3) ve <code>perry compile main.ts -o main</code>&apos;in Windows&apos;ta <code>main.exe</code> üretmesini sağlayan küçük ama gerçek bir düzeltme var; böylece PowerShell onu gerçekten başlatabiliyor (v0.5.1146).
      </p>

      <h2>Yeni widget&apos;lar, her platform</h2>
      <p>
        Sadece son günde iki widget indi ve ikisi de Perry&apos;nin hedeflediği her UI platformunu kapsıyor:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — kompakt, alan-tarzı bir tarih kontrolü: macOS&apos;ta <code>NSDatePicker</code>, iOS/visionOS&apos;ta <code>UIDatePicker</code> (.compact), Windows&apos;ta <code>SysDateTimePick32</code>, Android&apos;de <code>android.widget.DatePicker</code>, Linux&apos;ta GTK4. Hepsinin üzerinde tek bir TS yüzeyi.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — herhangi bir widget metin/dosya/URL için bir bırakma hedefi ve bir sürükleme kaynağı olabilir; <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit) ve <code>View.setOnDragListener</code> (Android)&apos;e eşlenmiş.</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Pencerenin başlarında widget rafı masaüstü ve mobil boyunca da doldu — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation ve kaydırılabilir bir ImageGallery — her biri her platformda gerçek native kontrolle destekleniyor. HarmonyOS (ArkTS), diğerleriyle pariteye ulaşmak için ihtiyaç duyduğu son iki widget olan Chart ve TreeView&apos;i aldı (v0.5.893).
      </p>

      <h2>GC, internals ve kararlılık</h2>
      <p>
        O 270 sürümün çoğu manşet değil — bug düzeltmeleri ve internals, ve bu fazın amacı da bu. Öne çıkarmaya değer birkaçı:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC devam etti.</strong> GC yazısındaki koşullu free-list çalışması yerine oturmaya devam etti ve keskin bir bug sınıfı kapandı: native-köprülenmiş Promise&apos;lar artık <strong>bir tokio worker&apos;ında uçuştayken sabitleniyor</strong>, böylece GC çözülme inmeden önce onları sweep edemiyor (v0.5.923). Yük altında bir async fetch çalıştırıp hayalet bir collection gördüyseniz, o buydu.</li>
        <li><strong>Bellek modeli belgelendi.</strong> Artık bir <code>internals/memory-model.md</code> derin-dalışı var — NaN-boxing, generational GC, shadow stack ve write barrier&apos;lar — docs sitesine bağlanmış halde (v0.5.933).</li>
        <li><strong>npm süpürmesinin açığa çıkardığı bir codegen kararlılık düzeltmeleri dalgası</strong>: resume edilmiş bir async adımın içinde çağrılan modül seviyesindeki bir <code>const</code> arrow artık SIGSEGV vermiyor (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> artık sonsuza dek asılı kalmıyor (v0.5.870) ve gerçek bundle&apos;ların takıldığı bir avuç <code>js_is_truthy</code> / raw-pointer-range çökmesi.</li>
      </ul>

      <h2>Apple ev işleri</h2>
      <p>
        Daha küçük ama gerçek: <code>perry setup ios --development</code> artık development build&apos;leri için provision yapıyor (v0.5.1023) ve Apple cross-library build/link yolu tekilleştirildi ve pointer-genişliği taşınabilir yapıldı (v0.5.1121/1125) — ki bu da sıkışıp kalmış olan npm / Homebrew / APT / winget publish matrisini serbest bırakan şey.
      </p>

      <h2>Bu işin bıraktığı yer</h2>
      <p>
        Perry&apos;nin arkasındaki bahis her zaman şu oldu: &ldquo;native TypeScript&rdquo;, ancak <em>gerçek</em> TypeScript çalışırsa önem kazanır — oyuncak bir alt küme değil, insanların <code>npm install</code> ettiği gerçek paketler. Bu ay çoğunlukla o işti: övünülecek tek bir sayıdan çok, &ldquo;derleniyor&rdquo; ile &ldquo;çalışıyor&rdquo; arasındaki açığı kapatmaya yönelik uzun, gösterişsiz bir itiş. Uygunluk radarları ve npm parite testleri artık izlediğimiz skor tablosu ve sayıları yayınlamaya devam edeceğiz — iyilerini de hâlâ kusurlu olanları da.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
