export default function Content() {
  return (
    <>
      <p>
        Önceki yazı <strong>v0.5.306</strong>&apos;da gen-GC + JSON + benchmark hikayesiyle kapanmıştı. Dört gün sonra Perry <strong>v0.5.359</strong>&apos;da — yani <strong>53 patch sürüm</strong> — ve hikaye yine farklı. Bu sürümlerin hiçbiri benchmark sayılarını manşete taşımıyor. Neredeyse hepsi <strong>tracker&apos;daki issue&apos;ların kapanması</strong> üzerine.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> geldi — masaüstü uygulamaları için Sparkle/Tauri tarzı otomatik güncelleme (SHA-256 digest&apos;e Ed25519, sentinel-rollback, ayrılmış yeniden başlatma). Topluluk PR&apos;ı <strong>TheHypnoo</strong>&apos;dan (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Faz D</strong> — <code>http://localhost:7676</code> üzerinde canlı bir inspector: widget ağacı, widget bazlı detay, click dispatch ve <code>POST /style/:h</code> ile canlı stil düzenleme.</li>
        <li><strong>Derleyici refactor&apos;u.</strong> v0.5.329 → v0.5.343 boyunca en çok atıfta bulunulan dört dosya parçalandı: <code>lower::lower_expr</code> 6.687 → 624 LOC (−%91), <code>compile.rs</code> 9.391 → 3.783 LOC (−%60), <code>lower.rs</code> 13.591 → 7.554 LOC (−%44), <code>lower_call.rs</code> 7.000+ → 4.681 LOC (−%33). Yeni <code>walker.rs</code>, <code>_ =&gt; {}</code> catch-all bug sınıfını derleme hatasına çeviriyor.</li>
        <li><strong>UI styling Faz C kapandı</strong> — Apple, Android, GTK4, Windows ve Web&apos;de her widget&apos;ta inline <code>style: {`{ ... }`}</code> props. Windows 5 stub&apos;tan 4&apos;ünü bağladı (decoration / opacity / borders); kalan tek şey <code>widget.shadow</code> (DirectComposition takibi).</li>
        <li><strong>Windows için Scoop bucket&apos;ı</strong>: <code>scoop install perry-ts/perry</code>. Release workflow&apos;una SHA-256 sidecar&apos;ları.</li>
        <li><strong>Topluluk issue düzeltmeleri dalgası</strong> — runtime, codegen, fetch, GTK4, Windows linker, async ve stdlib boyunca yaklaşık 30 issue kapandı.</li>
      </ul>

      <h2>1. perry/updater — masaüstü uygulamaları için otomatik güncelleme</h2>
      <p>
        Düzeltmeden önce Perry&apos;nin güncelleme yolu yoktu. Uygulamalar yayınlanıyordu, yine yayınlanıyordu, hepsi bu. <strong>TheHypnoo</strong> <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>&apos;ü tüm hikayeyle birlikte açtı:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // önceki açılış crash ettiyse sentinel-rollback

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // yeni build başarıyla başladıktan sonra çağır`}</code></pre>
      <p>
        Güven modeli: <strong>dosyanın SHA-256 digest&apos;i üzerine Ed25519</strong> (dosya bayt&apos;ları üzerine değil — büyük ikilikilerde doğrulamayı ucuz tutar). Manifest JSON, şema sürümlü, <code>&lt;os&gt;-&lt;arch&gt;</code> üçlüsü başına bir kayıt. <code>&lt;exe&gt;.prev</code> yedeğiyle atomik kurulum, ayrılmış yeniden başlatma (Unix&apos;te <code>setsid</code>, Windows&apos;ta <code>DETACHED_PROCESS</code>). Mobil tasarım gereği dışarıda — App Store / Play Store kurulum hattını OS düzeyinde sahipleniyor.
      </p>
      <p>
        Smoke test yazılırken Perry runtime&apos;ının iki tuhaflığı su yüzüne çıktı ve aynı anda düzeltildi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> sadece metadata stub&apos;u döndürüyordu.</strong> <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a>&apos;de düzeltildi (yine TheHypnoo) — <code>js_response_array_buffer</code> artık gerçek bir <code>BufferHeader</code> ayırıyor ve <code>resp.body</code>&apos;yi içine <code>memcpy</code> ile kopyalıyor.</li>
        <li><strong><code>fs.appendFileSync</code> 0 bayt yazıyordu.</strong> <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a>&apos;da düzeltildi — namespace-import lowering yolunda (<code>import * as fs from &quot;fs&quot;</code>) <code>appendFileSync</code> için kol yoktu, LLVM codegen&apos;de de HIR varyantı için kol yoktu. İkisi de bağlandı.</li>
      </ul>
      <p>
        Belgeler <code>docs/src/updater/overview.md</code>&apos;de yaşıyor.
      </p>

      <h2>2. Geisterhand: localhost:7676 üzerinde canlı inspector</h2>
      <p>
        Geisterhand, Perry&apos;nin in-process UI test koşumuydu — port 7676 üzerinde HTTP API ile widget durumlarını snapshot&apos;lamak ve tıklama dağıtmak için. Faz D bunu, herhangi bir tarayıcıdan açılabilen devtools tarzı bir inspector&apos;a dönüştürüyor.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Adım 1 (v0.5.349)</strong> — <code>GET /</code>, widget ağacı, widget başına detay (frame, value, raw JSON), pause/resume&apos;lı 1.5 sn auto-refresh ve &laquo;onClick fırlat&raquo; aksiyon düğmesi içeren tek-sayfalık bir vanilla-JS UI sunuyor. codegen, macOS lazy-load <code>-dead_strip</code>&apos;ine karşı <code>INSPECTOR_HTML</code>&apos;i sabitleyerek release build&apos;lerinde hayatta kalmasını sağlıyor.</li>
        <li><strong>Adım 2 (v0.5.350)</strong> — <code>POST /style/:h</code>, JSON&apos;da bir prop torbasını alıyor ve canlı uyguluyor. 9 prop (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) mevcut pump-queue üzerinden HTTP thread → ana thread&apos;e akıyor. Hatalı JSON → 400; hatalı handle → 400; bilinmeyen prop&apos;lar sunucu tarafında filtreleniyor ve cevap, geçenleri listeliyor.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        macOS dispatcher bağlı; Linux / Windows / iOS / tvOS / visionOS / Android aynı şekli takip ediyor ve sıradaki.
      </p>

      <h2>3. Derleyici refactor&apos;u — en büyük dört dosyayı bölmek</h2>
      <p>
        Tracker&apos;daki beş issue (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, artı uzun bir kuyruk) aynı şekildeydi: <code>ir.rs</code>&apos;e yeni bir <code>Expr</code> varyantı eklendi, ama <code>lower.rs</code>&apos;deki dört ad-hoc walker&apos;dan birinin <code>_ =&gt; {}</code> catch-all&apos;u vardı ve yeni varyantı sessizce yanlış derliyordu. Bunu çalışma zamanında yakalamak pahalı — bazen görünmez, bazen SSO altında SIGSEGV.
      </p>
      <p>
        <strong>v0.5.329</strong>, <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> ile <code>crates/perry-hir/src/walker.rs</code>&apos;i tanıttı — 178 <code>Expr</code> varyantının tümü üzerinde exhaustive match, <strong>catch-all yok</strong>. Yeni bir varyantı burada listelemeden eklemek artık derleme hatası. Dört tüketici (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) şöyle çöktü:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Fonksiyon</th>
              <th className="text-right py-2 px-3">Önce</th>
              <th className="text-right py-2 px-3">Sonra</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−%75</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−%86</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−%90</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−%84</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Toplam: <strong>−1.830 satır mükerrer descent</strong>, yerine <strong>+1.840 satır tek merkezli walker</strong> — net düz, ama bug sınıfı yok oldu.
      </p>
      <p>
        Bu, gerisinin önünü açtı. <strong>v0.5.331 → v0.5.343</strong>, dört monoliti 14 commit&apos;te kesip biçti. Manşet sayıları:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Dosya</th>
              <th className="text-right py-2 px-3">Önce</th>
              <th className="text-right py-2 px-3">Sonra</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6.687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−%91</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9.391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3.783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−%60</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13.591</td><td className="text-right py-2 px-3">7.554</td><td className="text-right py-2 px-3">−%44</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7.000+</td><td className="text-right py-2 px-3">4.681</td><td className="text-right py-2 px-3">−%33</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Bölme, 19 yeni odaklı alt modül olarak yere indi: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code> ve UI / system / i18n metot tabloları için tek doğruluk kaynağı haline gelen yeni <code>crates/perry-dispatch</code> crate&apos;i (issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a>&apos;in &laquo;macOS&apos;ta derlenir, web&apos;de kırılır&raquo; sürprizlerine yol açan <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> fan-out&apos;u artık tek lookup).
      </p>
      <p>
        <strong>Tier 4 perf kazanımları</strong> eşlik etti (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>inline_functions</code>&apos;daki iki pass ile <code>compile.rs</code>&apos;deki üç rayon pass&apos;ı birleştirildi — derleme başına 5 modül taraması + 3 scheduler gidiş-dönüşü tasarrufu.</li>
        <li><code>perry dev</code>&apos;in parse cache&apos;i 500 girdiyle sınırlandı, FIFO eviction. Düzeltmeden önce <code>node_modules</code>&apos;u dolaşan bir oturum 100+ MB SWC AST tutabiliyordu.</li>
        <li>codegen sonrası <code>.ll</code> yazma döngüsü paralelleştirildi — 50+ modüllü SSD&apos;lerde wall-time 2–4 kat hızlandı.</li>
        <li>Locale tablosunu worker başına klonlamak yerine <code>Arc&lt;I18nTable&gt;</code>.</li>
      </ul>
      <p>
        Workspace testleri her commit boyunca <strong>434 passed / 0 failed / 5 ignored</strong>&apos;da kaldı; gap testleri 25/28 baseline; doc-tests 80/82 baseline.
      </p>

      <h2>4. UI styling Faz C, tamam</h2>
      <p>
        Faz C, inline <code>style: {`{ ... }`}</code> rollout&apos;uydu. 1–7 arası adımlar bu pencerede kapandı:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — <code>StyleProps</code> tip yüzeyi + Button&apos;da inline <code>style:</code>.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — her tablo widget&apos;ında color/padding/shadow inline destructure, ardından VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — hex string&apos;ler + gradient + dinamik değerler için runtime <code>parseColor</code>.</li>
        <li><strong>v0.5.312</strong> — styling docs + Windows takip issue&apos;sı.</li>
      </ul>
      <p>Sonra cross-platform süpürme:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 styling FFI bağlandı, ayrıca Linux doc-tests kapısını tıkayan 7 eksik FFI (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — <code>widget.shadow</code> için <code>CALayer</code> gölge tesisatı + visual_test altyapısı; <code>NSTextField</code> olmayan widget&apos;lar için <code>set_color</code> sınıf-probe.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button&apos;da <code>color: ...</code>, <code>UIButton</code> üzerinde <code>setTextColor:</code>&apos;a vuruyordu, ki bu selector implement edilmiyor; <code>objc2</code> panic&apos;i bir <code>extern &quot;C&quot;</code> sınırını aşıyordu ve süreç abort oluyordu. macOS&apos;teki sınıf-probe deseniyle düzeltildi — UIButton artık <code>setTitleColor:forState:UIControlStateNormal</code> üzerinden yönlendiriliyor.</li>
        <li><strong>Windows</strong> (v0.5.347) — 5 styling stub&apos;tan 4&apos;ü bağlandı (<code>text.decoration</code> <code>LOGFONT</code> round-trip&apos;i ile, <code>widget.opacity</code> <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code> ile, borders <code>SetWindowSubclass</code> + <code>WM_PAINT</code> ile). Yalnızca <code>widget.shadow</code> kaldı (DirectComposition gerekiyor).</li>
      </ul>
      <p>
        <code>docs/src/ui/styling-matrix.md</code>&apos;deki styling matrisi, pencereyi <strong>Web 43/43 Wired</strong>, <strong>Windows 42/43 Wired</strong>, geri kalanı tam kapsamla bitiriyor.
      </p>

      <h2>5. Runtime doğruluk geçişi — issue&apos;dan issue&apos;ya</h2>
      <p>
        Dönemin teması: tracker&apos;dan gelen her miscompile ya bir düzeltmeye ya da derleme zamanı hatasına dönüştü. Öne çıkanlar:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — <code>fn</code> içindeki sınıf metotları, çevreleyen fn&apos;in local&apos;lerini yakalayamıyordu. Çoklu modül repro&su artık Node ile bayt-bayt eşleşiyor.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — 7 string operand site&apos;ında SSO-güvenli string-handle unboxing: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, crypto digest girişi. Düzeltmeden önce her biri ya sessizce çöp döndürüyordu ya inline-string operandlarda SIGSEGV oluyordu.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — modül seviyesindeki boş <code>const</code> dizileri, fonksiyon içlerinden gelen <code>arr[i]=</code> yazmalarını düşürüyordu. Bloom-Engine/jump&apos;ın <code>discoverLevels()</code>&apos;i, <code>LEVEL_FILES</code>&apos;ı modül seviyesinde index-assign ile dolduruyor ve seviye seçim ekranı boş çıkıyorken ortaya çıktı.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — async fonksiyon içinden <code>Array.push</code>, dizi parametre olarak girdiğinde sessizce 16 elemanla sınırlanıyordu. Async fonksiyonlar inline edilmez; reallocation yeni bir pointer döndürüyor ama çağıran bunu görmüyordu. Düzeltme: her büyümede eski konuma forwarding pointer kur, GC&apos;nin mevcut <code>GC_FLAG_FORWARDED</code> mekanizmasını yeniden kullan.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — çağıranlar sondaki args&apos;ları atladığında metot default param dispatch&apos;i çöp aktarıyordu. İki katkı parçası: cross-module metot declare&apos;ları <code>arity + 1</code> yerine 6 double sabit kodluyordu, ve <code>lower_class_method</code> hiç <code>build_default_param_stmts</code> çağırmıyordu. mongodb&apos;nin <code>findOne(filter, options = {`{}`})</code>&apos;ı sessizce takılıyorken yüzeye çıktı; düzeltme yerel ve cross-module dispatch&apos;te tek tip.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — bir repro&apos;dan üç bağımsız fetch + promise hatası: api.github.com anonim için 403 dönüyordu (artık varsayılan User-Agent set), <code>.then(console.log)</code> sonsuza kadar takılıyordu (null callback&apos;ler TASK_QUEUE girdileri push&apos;lamıyordu), her fetch reddi <code>Uncaught exception: [object Object]</code> basıyordu (gerçek <code>ErrorHeader</code> yerine NaN-box&apos;lı çıplak <code>*StringHeader</code>).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code> instance metotlarına sahip gerçek <code>Blob</code>. Düzeltmeden önce <code>await response.blob()</code> sadece metadata stub&apos;u <code>{`{size, type}`}</code> döndürüyordu. Üç parçalı düzeltme runtime + HIR + codegen üzerine indi.</li>
      </ul>
      <p>Artı küçük yetişmeler:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup, Linux&apos;ta jenerik monomorfizasyonları aşırı budayarak + GTK4 link sessiz-fallback. Düzeltme: isim deseniyle filtrelemeyi <code>llvm-nm</code> üzerinden <strong>sembol kümesi</strong> karşılaştırmasıyla değiştir. Tek bir benzersiz sembolü bile olan üyeler korunuyor. Link hatasız <code>libperry_ui_macos.a</code> 196 → 35 nesneye budandı.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — Windows link satırına <code>secur32.lib</code> eklendi.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> Ryū üzerinden FP round-trip.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — <code>perry/i18n</code> format wrapper&apos;ları için codegen dispatch bağlandı.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — <code>perry/plugin</code> codegen dispatch.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — Canvas widget&apos;ı LLVM codegen üzerinden.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView codegen üzerinden.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — Table widget&apos;ı codegen üzerinden.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (kısmi) — 11 stdlib helper dispatch kolu.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — iOS + Android&apos;de arka planda bildirim alma (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — watchOS oyun döngüsü FFI hook&apos;ları için zayıf fallback&apos;ler.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — <code>using</code> / <code>await using</code> dispose hook&apos;ları.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — <code>js_native_call_method</code> args alloca&apos;sı entry bloğuna kaldırıldı.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — <code>substitute_locals</code> Uint8Array kolları.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> uçtan uca bağlandı (topluluk PR&apos;ı).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        Windows toolchain hikayesi sadeleşmeye devam ediyor. <strong>v0.5.353</strong>, host build&apos;lerde <code>clang -target</code>&apos;ı sabitledi — PATH&apos;teki MSVC olmayan clang (MinGW / MSYS2 / Anaconda / Rust GNU bundle&apos;ları) Perry&apos;nin <code>x86_64-pc-windows-msvc</code> IR&apos;ını sessizce <code>windows-gnu</code>&apos;ya çeviriyordu, ve lld-link, LLVM&apos;in mingw32 emitter&apos;ının eklediği <code>__main</code> referansını çözemiyordu. Yeni <code>probe_clang_default_triple</code>, süreç başına bir kez <code>clang --version</code> çalıştırıyor ve host varsayılanı GNU iken hedef MSVC ise tek bir bilgi notu yazıyor. <code>PERRY_NO_CLANG_PROBE=1</code> ile bastırılabilir.
      </p>
      <p>
        <strong>v0.5.345</strong>, Win64 <code>perry-ui</code> ABI&apos;ını <code>perry-dispatch</code> ile hizaladı — üç runtime extern imzası kaymıştı (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Win64 ABI&apos;ında integer ve float pozisyonel arg&apos;lar slot indekslerini paylaşır, dolayısıyla bir uyumsuzluk başlatılmamış register&apos;lardan çöp okur. SysV (macOS / Linux) ayrı int/float register havuzları kullanıyor ve şans eseri geçerli bit&apos;ler düşüyordu — yalnızca Windows&apos;a özgü crash, 8 perry-ui-* platform crate&apos;inin hepsinde düzeltildi.
      </p>
      <p>
        Sonra: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest v0.5.345&apos;e sabit (resmi MSVC-default LLVM&apos;i otomatik çekmek için <code>depends: main/llvm</code> ile). Release workflow&apos;u artık her arşivin yanına <code>&lt;artifact&gt;.sha256</code> sidecar&apos;ları yayıyor; format <code>sha256sum</code> uyumlu, herhangi bir downstream paket yöneticisi bumper&apos;ı için.
      </p>
      <pre><code>{`# Windows host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Toparlama</h2>
      <p>
        Bu dönemin örüntüsü topluluk katılımı artı dahili hijyen. <strong>TheHypnoo</strong> üç kayda değer PR teslim etti (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> <code>fs.appendFileSync</code> bağlantısı, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> <code>response.arrayBuffer</code> body bayt&apos;ları). Tracker yaklaşık 30 issue boşaldı. Derleyici en büyük dosyasında %60 küçüldü ve &laquo;dört ad-hoc walker&apos;dan birini güncellemeyi unuttum&raquo;u runtime miscompile&apos;dan <code>cargo build</code> hatasına çeviren exhaustive bir walker kazandı. UI styling, Windows&apos;taki gölgeler hariç her masaüstü platformunda parite yakaladı. Geisterhand tarayıcı tabanlı bir devtools yüzeyi büyüttü. Windows kurulum yolu bir komut kısaldı.
      </p>
      <p>Dene:</p>
      <pre><code>{`# npm (her platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Masaüstü uygulamaları için otomatik güncelleme
npm install @perry/updater

# Canlı inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # sonra http://localhost:7676 aç`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
