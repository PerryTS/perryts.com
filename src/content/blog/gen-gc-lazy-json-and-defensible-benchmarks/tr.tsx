export default function Content() {
  return (
    <>
      <p>
        Son yazı <strong>v0.5.174</strong>&apos;te tek bir manşetle kapanmıştı: Perry, ağaç içi suite&apos;teki her benchmark&apos;ta nihayet hem Node&apos;u hem de Bun&apos;ı yeniyordu. Üç günlük çalışma ve birikmiş GC + JSON commit&apos;leri sonrası Perry <strong>v0.5.306</strong>&apos;da — yani <strong>132 patch sürümü</strong> — ve hikâye farklı. Manşet 547x bir hızlanma ya da yeni bir kazanç sütunu değil. Asıl iş, o kazanımları savunulabilir kılan iş.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Generational GC</strong> varsayılan olarak gönderiliyor. Phase A&apos;dan D&apos;ye kadar v0.5.217–v0.5.237 arasında indi.</li>
        <li><strong>Small String Optimization</strong> varsayılan olarak gönderiliyor. Step 1.5 → 2 v0.5.213–v0.5.216&apos;da indi.</li>
        <li><strong>JSON pipeline&apos;ı</strong> tape tabanlı parser, lazy parse, lazy stringify ve element başına seyrek materyalizasyon kazandı. Varsayılan validate-and-roundtrip artık <strong>medyan 75 ms</strong> — dinamik tipli grupta en iyisi.</li>
        <li><strong>Benchmark sayfası</strong> uçtan uca <strong>RUNS=11 medyan + p95 + σ + min + max</strong> ile yeniden yazıldı, simdjson ve AssemblyScript+json-as eş olarak eklendi, optimizasyon probe&apos;ları gerçek karşılaştırmalardan ayrıldı ve Perry&apos;nin her zayıflığı dürüstçe yüzeye çıkarıldı.</li>
      </ul>
      <p>
        Yardımcı kadro istikrarlı bir doğruluk düzeltmesi serisi: Promise microtask FIFO, NaN eşitliği ve ECMAScript sayı biçimlendirmesi, BigInt ikiye tümleyen, uçtan uca AsyncLocalStorage, decimal.js + ioredis + commander runtime&apos;ları ve tape yolları altında saklanan bir <code>JSON.stringify</code> segfault&apos;u (düz f64 üzerinde). Ayrıca Windows toolchain nihayet hafifledi: LLVM + xwin, Visual Studio kurulumu gerekmiyor.
      </p>

      <h2>1. Generational GC, varsayılan olarak açık</h2>
      <p>
        Generational GC iki aydır aşamalı bir roll-out süreciydi. Bu pencerede kapanan fazların özeti:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> — Phase A: shadow-stack runtime iskelesi, push/pop emisyonu, slot-map threading, <code>Let</code>/<code>LocalSet</code> shadow yansıtması ve root scanner.</li>
        <li><strong>v0.5.222</strong> — Phase B: nursery + old-gen arena ayrımı.</li>
        <li><strong>v0.5.223–v0.5.225</strong> — Phase C1–C2: write-barrier runtime altyapısı, codegen barrier&apos;ı yayıyor, her heap store oradan geçiyor.</li>
        <li><strong>v0.5.226–v0.5.228</strong> — Phase C3a–C4: remembered-set kökleri mark + clear&apos;a akıyor; minor GC trace old-gen&apos;i atlıyor; non-moving tenuring.</li>
        <li><strong>v0.5.229–v0.5.236</strong> — Phase C4b α/β/γ/δ: forwarding-pointer altyapısı, pinning + evacuation pass, scanner + transitif pinning, referans yeniden yazımı, boştaki nursery blokları OS&apos;a iade ediliyor, GC tetikleyici başlangıç eşiğinde sınırlanıyor.</li>
        <li><strong>v0.5.237</strong> — Phase D part 1: <code>PERRY_GEN_GC=1</code> varsayılan.</li>
        <li><strong>v0.5.238</strong> — Phase D part 2: <code>PERRY_SHADOW_STACK=1</code> varsayılan.</li>
        <li><strong>v0.5.239–v0.5.240</strong> — kapanış dokümanları: yol haritası tamamlandı, akademik + endüstri soyağacı eki (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        En önemli ölçülen kazanç: <code>test_memory_json_churn</code> gen-GC varsayılana çevrildiği anda tepe RSS&apos;te <strong>115 MB → 91 MB</strong>&apos;ye düştü. Compute regresyonları küçüktü ve özür dilemeden listelendi — <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> her biri +1 ms. Kaçış kapısı (<code>PERRY_GEN_GC=0</code>) eski rakamları geri getiriyor; ödünleşim kasıtlıydı ve benchmark sayfası artık her iki satırı yan yana listeliyor, böylece okuyucu seçim yapabiliyor.
      </p>

      <h2>2. Small String Optimization, varsayılan olarak açık</h2>
      <p>
        SSO, kısa string&apos;ler için heap allocation&apos;ından kaçınan 22 byte&apos;lık inline-string temsilidir — tipik JSON anahtarları (2–8 byte) ve kısa değerler inline forma iniyor. Roll-out yüzeyde küçük, kaputun altında büyüktü:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: SSO altyapısı (temsil + erişimciler).</li>
        <li><strong>v0.5.214</strong>: Step 1 consumer arms + test için <code>PERRY_SSO_FORCE</code> kapısı.</li>
        <li><strong>v0.5.215</strong>: Step 1.5 codegen <code>PropertyGet</code> üç-yönlü dal — inline string&apos;ler için fast path, heap string&apos;ler için fast path, kalan için slow path.</li>
        <li><strong>v0.5.216</strong>: Step 2 flip — varsayılan olarak SSO yay.</li>
      </ul>
      <p>
        v0.5.279&apos;daki takipler, SSO sıcak hale gelince yüzeye çıkan son property-read NaN bug&apos;ını kapattı; v0.5.272&apos;deki zincirli cross-module getter dispatch düzeltmesi de bir başkasını kapattı. İkisi de varsayılan çevrilmeden önce kontrol listesindeydi; ikisi de perf regresyonu olmadan gönderildi.
      </p>

      <h2>3. JSON: tape tabanlı parse, varsayılan olarak lazy</h2>
      <p>
        JSON pipeline&apos;ı dönemin en istilacı yeniden yazımını aldı. Eski davranış: <code>JSON.parse</code> NaN-boxed değerlerden tam materyalize edilmiş bir ağaç inşa ediyordu. Yeni davranış: <code>JSON.parse</code> değer başına 12 byte&apos;lık bir tape inşa ediyor ve lazy şekilde materyalize ediyor — yalnızca gerçekten okuduğunuz değerler materyalizasyon maliyetini ödüyor. Değiştirilmemiş bir parse&apos;ın stringify&apos;ı artık orijinal girdinin memcpy&apos;si — simdjson&apos;ın <code>raw_json()</code> ile kullandığı aynı fast-path numarası.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> şema yönlendirmeli parse (Step 1). Derleme zamanında bilinen şekil, derleyicinin önceden çözümlenmiş anahtar erişimi yaymasına izin veriyor.</li>
        <li><strong>v0.5.203</strong>: tape tabanlı parse temeli — Step 2 Phase 1.</li>
        <li><strong>v0.5.204</strong>: lazy parse + lazy stringify — Step 2 Phase 2+4.</li>
        <li><strong>v0.5.206</strong>: lazy-safe indeksli erişim + uç durumlar — Step 2 Phase 3.</li>
        <li><strong>v0.5.208</strong>: element başına seyrek materyalizasyon — Step 2 Phase 5b.</li>
        <li><strong>v0.5.209</strong>: walk cursor + uyarlanır materyalize eşiği.</li>
        <li><strong>v0.5.210</strong>: ≥1 KB blob&apos;lar için lazy parse&apos;ı varsayılana çevir.</li>
      </ul>
      <p>
        Lazy tape&apos;in tasarlandığı iş yükündeki sonuç (10k kayıt, ~1 MB blob, ara yineleme olmadan parse → stringify):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementasyon</th>
              <th className="text-right py-2 px-3">Medyan (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">Tepe RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Medyan 75 ms</strong> ile Perry karşılaştırmadaki en hızlı dinamik-tipli runtime — Bun&apos;ı (259 ms), Node&apos;u (394 ms), Kotlin&apos;in sunucu JIT&apos;ini (453 ms) yeniyor. 24 ms&apos;de simdjson, SIMD-hızlandırmalı C++ tavanı ve sayfada bilinçli olarak duruyor — cherry-pick&apos;in arkasına saklanmıyor. Perry onu yenmiyor. Amaç farkı göstermek, böylece kapatmanın bir hedefi olsun — <code>docs/json-typed-parse-plan.md</code>&apos;de izleniyor.
      </p>
      <p>
        Dürüst eşlikçi bench <strong>parse-and-iterate</strong>: aynı blob, ama her yineleme her kaydın <code>nested.x</code> değerini topluyor, bu da lazy tape&apos;i materyalize etmeye zorluyor. Orada Perry <strong>466 ms</strong>&apos;ye iniyor — mark-sweep kaçış kapısının 375 ms&apos;sinden daha yavaş, çünkü tape amortize edemediği bir overhead ödüyor. O satır TL;DR §B&apos;de. İşten kaçınamadığınızda, lazy tape kaçabiliyormuş gibi davranmıyor.
      </p>

      <h2>4. Benchmark sayfası, yeniden yazıldı</h2>
      <p>
        Perry&apos;nin performans rakamlarını sunma şekliyle ilgili üç şey değişti.
      </p>
      <p>
        <strong>RUNS=11 medyan + p95 + σ + min + max, best-of-N değil.</strong> Best-of-N tail latency&apos;yi sessizce düşürür; bu donanımda 9.4 saniyelik Python <code>accumulate</code> outlier&apos;larını ve Swift JSON&apos;un 5.3 saniyelik p95 spike&apos;larını saklıyordu. Medyan kuyrukları sayfaya geri koyuyor. Metodoloji değişikliği v0.5.248&apos;de indi; TL;DR §A ve §B&apos;deki her hücre <strong>2026-04-25</strong> itibarıyla taze RUNS=11.
      </p>
      <p>
        <strong>Optimizasyon probe&apos;ları gerçek runtime perf&apos;ten ayrıldı.</strong> Perry&apos;yi 12–34 ms&apos;de, Rust/C++&apos;ı 98 ms&apos;de gösteren beş hücre — <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> — silikon değil, derleyici bayrak duruşunu ölçüyor. Artık kendi alt bölümlerindeler ve üstlerindeki bir paragraf, <code>clang++ -O3 -ffast-math</code>&apos;ın bunları bir milisaniye içine kapattığını açıklıyor. Manşet gerçek-runtime kernel&apos;i <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — derleyicinin gerçekten işi katlayamadığı bir kernel&apos;de Perry no-FMA-contract grubunun tam ortasında oturuyor. Dürüst karşılaştırma bu.
      </p>
      <p>
        <strong>Eşler eklendi.</strong> simdjson (4.3.0) artık her iki JSON tablosunda da — C++ parse-throughput tavanı, sayfada okuyucunun farkı görebilmesi için. json-as (1.3.2) ile AssemblyScript en yakın kurulabilir TS-to-native eş; porffor bu boyuttaki iş yükünde segfault verdi, Static Hermes macOS arm64&apos;te kurulmadı. kotlinx.serialization ile Kotlin v0.5.241–v0.5.242&apos;de JSON polyglot&apos;a katıldı. Her satır gerçek, her uyarı sayfada.
      </p>

      <h2>5. Polyglot compute tablosu</h2>
      <p>
        Gerçekten katlanamaz manşet kernel&apos;leri, RUNS=11 medyan, 2026-04-25&apos;te v0.5.249&apos;da yenilendi:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>fibonacci</code>&apos;de Perry, derlenmiş grupla 3–15 ms içinde eşleşiyor. Java&apos;nın HotSpot JIT&apos;i, özyinelemeli çağrıyı inline ettiği için ~%11 daha hızlı. <code>loop_data_dependent</code>&apos;ta kernel iki FP-contract kümesine ayrılıyor: ~128 ms&apos;deki FMA-contract grubu (Go default, Apple Clang&apos;daki <code>g++ -O3</code> — her ikisi de <code>sum * a + b</code>&apos;yi tek bir FMADDD&apos;ye birleştiriyor) ve 229–235 ms&apos;deki no-contract grubu (Perry, Rust default, Swift, <code>-XX:+UseFMA</code>&apos;sız Java, Bun) skaler FMUL + FADD çalıştırıyor. LLVM, FMA grubunu <code>-ffp-contract=fast</code> ile eşliyor; Perry bunu varsayılan olarak etkinleştirmiyor. <code>nested_loops</code> cache-bound, compute-bound değil; herkes 8–21 ms&apos;ye iniyor.
      </p>

      <h2>6. Windows toolchain, hafif</h2>
      <p>
        Windows kullanıcılarının artık Visual Studio kurulumuna ihtiyacı yok. <strong>v0.5.199</strong> <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>&apos;yı kapattı: <code>perry setup windows</code> + winget LLVM + xwin tüm VS BuildTools ağacının yerini alıyor. <code>v0.5.201</code> <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> üzerindeki cfg kapısını kaldırdı, böylece path keşfi yalnızca macOS host&apos;larda değil, Windows&apos;u hedefleyen her platformda çalışıyor.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Runtime doğruluk geçişi</h2>
      <p>
        Dönemin bir teması: V8/JSC&apos;den sessiz runtime sapmaları ya düzeltmelere ya da derleme hatalarına dönüştü. Önemsiz olmayanlar:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: <code>BigInt.fromTwos</code>/<code>toTwos</code> ikiye tümleyen.</li>
        <li><strong>v0.5.263</strong>: <code>Promise.all</code>/<code>race</code>/<code>any</code> non-promise tip ayrımı.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + ECMAScript sayı biçimlendirmesi (<code>3 → &quot;3&quot;</code>, <code>&quot;3.0&quot;</code> değil; <code>-0 → &quot;0&quot;</code>; vb.).</li>
        <li><strong>v0.5.280</strong>: <code>(x) | 0</code> içinde <code>NaN</code>/<code>Infinity</code> ToInt32 zorlaması.</li>
        <li><strong>v0.5.284</strong>: Promise microtask FIFO + thrown-handler propagasyonu.</li>
        <li><strong>v0.5.286</strong>: Düz f64 üzerinde <code>JSON.stringify</code> tape yolları altında segfault veriyordu.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> encoding geçilmediğinde Buffer döndürüyor (Node ile eşleşiyor).</li>
        <li><strong>v0.5.272</strong>: zincirli cross-module getter dispatch <code>undefined</code> döndürüyordu.</li>
      </ul>
      <p>
        Issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> için stdlib takipleri tamamlandı: uçtan uca AsyncLocalStorage (v0.5.261), <code>.action()</code>&apos;ı gerçekten çağıran commander runtime + codegen (v0.5.250), decimal.js kodu (v0.5.259), uçtan uca Redis ioredis (v0.5.270), pg + mongo async-factory deseni (v0.5.275) ve EE/LRU/WSS&apos;te aynı async-factory bug&apos;ı (v0.5.252).
      </p>
      <p>
        <code>perry/ui</code> tarafında: notification tap callback (#97) hem Apple (v0.5.254) hem Android (v0.5.258) tarafında bağlandı; local notification&apos;ları zamanlama + iptal (#96, v0.5.244); Android&apos;de FCM register + receive (v0.5.262).
      </p>

      <h2>8. Toparlama</h2>
      <p>
        Bu dönemin deseni manşet rakamlar değil. Mevcut kazanımların incelemeye dayanmasını sağlayan iş: sürekli-allocation iş yüklerini yakalayan bir generational GC, kısa-string maliyet açığını kapatan bir SSO, en yaygın iş yükünün &ldquo;değişiklik yok&rdquo; yapısını sömüren bir JSON pipeline&apos;ı ve best-of-N yerine medyan ölçen ve simdjson&apos;ın 24 ms parse tavanını Perry&apos;nin 75 ms&apos;siyle aynı satırda gösteren bir benchmark sayfası. Okuyucu farkı — ve Perry&apos;nin tabana göre nerede oturduğunu — görüyor.
      </p>
      <p>
        Deneyin:
      </p>
      <pre><code>{`# npm (herhangi bir platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — VS kurulumu gerekmiyor)
winget install PerryTS.Perry

# Varsayılan benchmark suite&apos;i
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        Kaynak: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Benchmarks: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
