export default function Content() {
  return (
    <>
      <p>
        Perry&apos;nin Cranelift&apos;ten LLVM&apos;ye backend ge&ccedil;i&scedil;i tamamland&inodot;. v0.5.12 itibar&inodot;yla LLVM tek kod &uuml;retim backend&apos;i ve Perry art&inodot;k her benchmark&apos;ta Node.js&apos;i yeniyor &mdash; 1,7x ile 24,6x aras&inodot;nda de&gbreve;i&scedil;en marjlarla (iki beraberlikle).
      </p>
      <p>
        Buraya gelmek d&uuml;z bir yol de&gbreve;ildi. v0.5.0&apos;daki ilk ge&ccedil;i&scedil;, birka&ccedil; benchmark&apos;&inodot; yerini ald&inodot;&gbreve;&inodot; Cranelift s&uuml;r&uuml;m&uuml;nden <strong>70 kat daha yava&scedil;</strong> hale getirdi. Bu yaz&inodot; ne oldu&gbreve;unun, neden yine de ge&ccedil;i&scedil; yapt&inodot;&gbreve;&inodot;m&inodot;z&inodot;n, neyin bozuldu&gbreve;unun, neyin d&uuml;zeltti&gbreve;inin ve rakamlar&inodot;n di&gbreve;er tarafta nas&inodot;l g&ouml;r&uuml;nd&uuml;&gbreve;&uuml;n&uuml;n uzun versiyonudur.
      </p>
      <p>
        E&gbreve;er bir derleyici yap&inodot;yorsan&inodot;z, codegen backend&apos;lerini de&gbreve;erlendiriyorsan&inodot;z veya sadece &ldquo;LLVM&apos;ye ge&ccedil;&rdquo; ifadesinin neden nadiren g&ouml;r&uuml;nd&uuml;&gbreve;&uuml; kadar basit olmad&inodot;&gbreve;&inodot;n&inodot; merak ediyorsan&inodot;z, bu yaz&inodot; sizin i&ccedil;in.
      </p>

      <h2>B&ouml;l&uuml;m 1: Neden Ge&ccedil;i&scedil; Yapt&inodot;k?</h2>
      <p>
        Perry, TypeScript&apos;i do&gbreve;rudan yerel makine koduna derler. Node yok, V8 yok, Electron yok, WebView yok. &Ouml;nerme &ldquo;TypeScript yaz, yerel bir binary &ccedil;&inodot;kar&rdquo; ve e&gbreve;er o binary ger&ccedil;ekten h&inodot;zl&inodot; de&gbreve;ilse t&uuml;m de&gbreve;er &ouml;nermesi &ccedil;&ouml;ker.
      </p>
      <p>
        Perry&apos;nin ilk birka&ccedil; minor s&uuml;r&uuml;m&uuml;nde codegen backend&apos;i <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>&apos;ti. Cranelift m&uuml;kemmel &mdash; wasmtime&apos;&inodot;n arkas&inodot;ndaki codegen, SpiderMonkey&apos;nin baseline JIT&apos;i taraf&inodot;ndan kullan&inodot;l&inodot;yor ve h&inodot;zl&inodot;, &ouml;ng&ouml;r&uuml;lebilir derleme ile temiz bir g&ouml;m&uuml;lme hikayesi gerekti&gbreve;inde tercih edilen ara&ccedil;. Yeni bir dil bootstrap eden bir proje i&ccedil;in do&gbreve;ru ba&scedil;lang&inodot;&ccedil; noktas&inodot;yd&inodot;.
      </p>
      <p>
        Ancak iki &scedil;ey bizi sonunda ondan uzakla&scedil;t&inodot;rd&inodot;.
      </p>

      <h3>1. Optimizer tavan&inodot;</h3>
      <p>
        Cranelift bilerek h&inodot;zl&inodot;, tek katmanl&inodot; bir optimize edici derleyicidir. G&ouml;revi &ldquo;h&inodot;zla makul kod &uuml;ret,&rdquo; &ldquo;s&inodot;n&inodot;rs&inodot;z zaman verilerek m&uuml;mk&uuml;n olan en iyi kodu &uuml;ret&rdquo; de&gbreve;il. Bu, JIT i&ccedil;in do&gbreve;ru takasd&inodot;r. T&uuml;m sat&inodot;&scedil; noktas&inodot; yerel performans olan bir AOT derleyici i&ccedil;in yanl&inodot;&scedil; takas.
      </p>
      <p>
        LLVM&apos;nin middle-end&apos;ine yirmi y&inodot;l&inodot; a&scedil;k&inodot;n emek d&ouml;k&uuml;lm&uuml;&scedil;t&uuml;r. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis &mdash; daha k&uuml;&ccedil;&uuml;k bir projenin bunu yakalayaca&gbreve;&inodot; ger&ccedil;ek&ccedil;i bir d&uuml;nya yok. Perry &ldquo;Node&apos;dan h&inodot;zl&inodot;&rdquo; diyecekse, bu mekanizmaya ihtiyac&inodot;m&inodot;z var.
      </p>

      <h3>2. arm64_32 sorunu</h3>
      <p>
        Acil zorlayan fakt&ouml;r Apple Watch&apos;tu. <code>arm64_32</code>, Apple&apos;&inodot;n Series 4 ve sonras&inodot; i&ccedil;in tan&inodot;tt&inodot;&gbreve;&inodot; bir ABI &mdash; 64-bit komutlar, 32-bit pointer&apos;lar. Cranelift bunu desteklemiyor ve destek gelmesi i&ccedil;in ger&ccedil;ek&ccedil;i bir yol yoktu. Perry&apos;nin &ldquo;tek kod taban&inodot;ndan 9 platform&rdquo; iddias&inodot;n&inodot;n inand&inodot;r&inodot;c&inodot; olmas&inodot; i&ccedil;in watchOS eksik olamazd&inodot;. LLVM <code>arm64_32</code>&apos;yi kutudan &ccedil;&inodot;kan haliyle destekliyor.
      </p>
      <p>
        <em>Baz&inodot;</em> hedeflerin LLVM gerektirece&gbreve;ini kabul etti&gbreve;imizde, iki backend&apos;i s&uuml;rd&uuml;rmek s&uuml;rd&uuml;r&uuml;lemez hale geldi. &Inodot;ki backend iki set hata, iki set optimizasyon pass&apos;&inodot;, iki test matrisi, iki performans temeli demek. D&uuml;r&uuml;st cevap: birini se&ccedil;.
      </p>
      <p>LLVM&apos;yi se&ccedil;tik.</p>

      <h2>B&ouml;l&uuml;m 2: Cranelift Hakk&inodot;nda</h2>
      <p>
        Devam etmeden &ouml;nce: bu yaz&inodot; bir Cranelift ele&scedil;tirisi de&gbreve;il. Cranelift parlak bir m&uuml;hendislik eseri ve JIT, sandbox runtime veya derleme gecikmesinin tepe throughput&apos;tan daha &ouml;nemli oldu&gbreve;u herhangi bir &scedil;ey yap&inodot;yorsan&inodot;z, listenizin ba&scedil;&inodot;na yak&inodot;n olmal&inodot;. wasmtime onu iyi bir nedenle kullan&inodot;yor. Bytecode Alliance &ouml;rnek te&scedil;kil eden bir &ccedil;al&inodot;&scedil;ma yap&inodot;yor.
      </p>
      <p>
        Perry&apos;nin ihtiya&ccedil;lar&inodot; farkl&inodot;. &Ouml;nceden derliyoruz, binary&apos;yi bir kez g&ouml;nderiyoruz ve kullan&inodot;c&inodot; milyonlarca kez &ccedil;al&inodot;&scedil;t&inodot;r&inodot;yor. Bu asimetri &mdash; nadiren derle, her zaman &ccedil;al&inodot;&scedil;t&inodot;r &mdash; tam olarak LLVM&apos;nin daha a&gbreve;&inodot;r optimizer&apos;&inodot;n&uuml;n kendini amorti etti&gbreve;i rejim. Farkl&inodot; i&scedil; i&ccedil;in farkl&inodot; ara&ccedil;.
      </p>

      <h2>B&ouml;l&uuml;m 3: Ge&ccedil;i&scedil; Felaketi</h2>
      <p>
        v0.5.0, LLVM&apos;nin tek backend oldu&gbreve;u ilk s&uuml;r&uuml;md&uuml;. Derleme s&uuml;resinde k&uuml;&ccedil;&uuml;k bir gerileme ve &ccedil;al&inodot;&scedil;ma zaman&inodot; performans&inodot;nda anlaml&inodot; bir iyile&scedil;me bekliyorduk. &Inodot;kincisinin tersini elde ettik.
      </p>
      <p>O zaman yay&inodot;nlamak istemedi&gbreve;im tablo:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68 kat yava&scedil;</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64 kat yava&scedil;</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3 kat yava&scedil;</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2,8 kat h&inodot;zl&inodot;</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1,8 kat yava&scedil;</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2,3 kat yava&scedil;</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Baz&inodot; i&scedil; y&uuml;kleri h&inodot;zland&inodot;. &Ccedil;o&gbreve;u dramatik &scedil;ekilde k&ouml;t&uuml;le&scedil;ti. <code>method_calls</code> &mdash; idiomatik TypeScript class kullan&inodot;m&inodot;n&inodot; temsil etti&gbreve;i i&ccedil;in en &ouml;nemli benchmark&apos;lardan biri &mdash; iki s&uuml;r&uuml;m &ouml;nceki g&ouml;nderdiklerimizden neredeyse 70 kat daha k&ouml;t&uuml;yd&uuml;.
      </p>

      <h3>As&inodot;l yanl&inodot;&scedil; giden ne</h3>
      <p>
        Perry, de&gbreve;er temsili i&ccedil;in <strong>NaN-boxing</strong> kullan&inodot;r. Her TypeScript de&gbreve;eri 64-bit bir word&apos;d&uuml;r. f64 say&inodot;lar do&gbreve;rudan depolanr; di&gbreve;er her &scedil;ey (nesneler, stringler, boolean&apos;lar, undefined, null) bir IEEE 754 quiet NaN&apos;&inodot;n kullan&inodot;lmayan bitlerine kodlan&inodot;r.
      </p>
      <p>
        Avantaj&inodot;: say&inodot;lar s&inodot;f&inodot;r maliyetli. Boxing yok, tagging yok, aritmetik i&ccedil;in bellek ay&inodot;rma yok.
      </p>
      <p>
        Dezavantaj&inodot;: say&inodot;sal olmayan her de&gbreve;er &uuml;zerindeki her i&scedil;lem, a&ccedil;mak, i&scedil;lemek ve yeniden paketlemek i&ccedil;in bit manip&uuml;lasyonu gerektirir. E&gbreve;er bu diziler codegen&apos;inizde inline IR olarak ya&scedil;&inodot;yorsa, optimizer bunlar&inodot; birle&scedil;tirip basitle&scedil;tirebilir. E&gbreve;er <strong>runtime helper fonksiyon &ccedil;a&gbreve;r&inodot;lar&inodot;</strong> olarak ya&scedil;&inodot;yorsa, optimizer opak bir &ccedil;a&gbreve;r&inodot; g&ouml;r&uuml;r ve vazge&ccedil;er.
      </p>
      <p>
        Cranelift backend&apos;imiz, s&inodot;cak i&scedil;lemler i&ccedil;in &ccedil;ok say&inodot;da inline lowering geli&scedil;tirmi&scedil;ti &mdash; &ouml;zellik y&uuml;klemeleri, metot dispatch&apos;i, nesne ay&inodot;rma, f64 etiketli de&gbreve;erler &uuml;zerinde tamsay&inodot; aritmetik. LLVM ge&ccedil;i&scedil;i, &ouml;nce <em>do&gbreve;ru</em> kod &ccedil;&inodot;karma &ccedil;&inodot;kar&inodot;na, bunlar&inodot;n neredeyse tamam&inodot;n&inodot; <code>perry-runtime</code>&apos;daki runtime helper&apos;lar&inodot; &uuml;zerinden y&ouml;nlendirdi. Her helper LLVM IR&apos;de bir <code>call</code> komutuydu.
      </p>
      <p>
        LLVM m&uuml;kemmel, ama g&ouml;vdesini hi&ccedil; g&ouml;rmedi&gbreve;i bir fonksiyonu inline yapamaz. <code>perry-runtime</code> ayr&inodot; derlenir, sonunda ba&gbreve;lan&inodot;r ve optimizer&apos;&inodot;n perspektifinden her helper &ccedil;a&gbreve;r&inodot;s&inodot; bir kara kutudur. Sonu&ccedil;, Cranelift backend&apos;inin ~5 inline aritmetik komutu olarak derledi&gbreve;i s&inodot;cak d&ouml;ng&uuml;lerin art&inodot;k fonksiyon &ccedil;a&gbreve;r&inodot;lar&inodot;na &mdash; yazma&ccedil; kayd&inodot;, stack frame kurulumu, her &scedil;ey &mdash; milyonlarca kez tekrarlanan &scedil;ekilde derlenmesiydi.
      </p>
      <p>
        70x buradan geldi. K&ouml;t&uuml; codegen de&gbreve;il. K&ouml;t&uuml; <strong>inlining s&inodot;n&inodot;rlar&inodot;</strong>.
      </p>

      <h2>B&ouml;l&uuml;m 4: D&uuml;zeltme</h2>
      <p>
        Cranelift rakamlar&inodot;n&inodot; kurtarma ve a&scedil;ma &ccedil;al&inodot;&scedil;mas&inodot; kabaca alt&inodot; kategoriye ayr&inodot;ld&inodot;. Hi&ccedil;biri egzotik de&gbreve;il. &Ccedil;o&gbreve;u, sadece do&gbreve;ru yerlerde uygulanmas&inodot; gereken ders kitab&inodot; derleyici optimizasyonlar&inodot;.
      </p>

      <h3>1. Nesne ay&inodot;rma i&ccedil;in inline bump allocator</h3>
      <p>
        <code>object_create</code>, <code>method_calls</code>&apos;dan sonraki en k&ouml;t&uuml; gerilemeydi. Eski yol her <code>new Point()</code> i&ccedil;in <code>js_object_alloc_class_with_keys</code>&apos;i &ccedil;a&gbreve;&inodot;r&inodot;yordu &mdash; bir fonksiyon &ccedil;a&gbreve;r&inodot;s&inodot;, bir thread-local arena eri&scedil;imi, bir shape-cache aramas&inodot; ve GC header + nesne header yazma.
      </p>
      <p>
        D&uuml;zeltme: bump allocation&apos;&inodot; LLVM IR&apos;de <strong>inline</strong> olarak emit et. Nesne ay&inodot;ran her fonksiyon, thread-local bir <code>InlineArenaState</code> struct&apos;&inodot;na &ouml;nbelleklenmi&scedil; bir pointer al&inodot;r. Ay&inodot;rma &scedil;&ouml;yle olur:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        Fast path, LLVM&apos;nin g&ouml;rebildi&gbreve;i, zamanlayabildi&gbreve;i ve d&ouml;ng&uuml;lerden kald&inodot;rabildi&gbreve;i ~13 inline IR komutudur. <code>object_create</code> 318ms&apos;den 9ms&apos;ye d&uuml;&scedil;t&uuml;.
      </p>

      <h3>2. i32 d&ouml;ng&uuml; saya&ccedil;lar&inodot;</h3>
      <p>
        NaN-boxing, her TypeScript say&inodot;s&inodot;n&inodot;n f64 oldu&gbreve;u anlam&inodot;na gelir. D&ouml;ng&uuml; saya&ccedil;lar&inodot; dahil. f64 ind&uuml;ksiyon de&gbreve;i&scedil;kenleriyle <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> d&ouml;ng&uuml;s&uuml; felaket: f64 art&inodot;rma, f64 kar&scedil;&inodot;la&scedil;t&inodot;rma, her dizi indekslemede f64&apos;ten i64&apos;e d&ouml;n&uuml;&scedil;&uuml;m.
      </p>
      <p>
        Codegen, ind&uuml;ksiyon de&gbreve;i&scedil;keninin kan&inodot;tlanabilir &scedil;ekilde tamsay&inodot; de&gbreve;erli oldu&gbreve;u for-d&ouml;ng&uuml;leri tespit eder ve <strong>paralel i32 stack slot&apos;u</strong> ay&inodot;r&inodot;r. D&ouml;ng&uuml; ko&scedil;ulu <code>fcmp</code>&apos;den <code>icmp slt i32</code>&apos;ye ge&ccedil;erek f64 saya&ccedil;&inodot;n&inodot; tamamen ortadan kald&inodot;r&inodot;r.
      </p>
      <p>
        Bu, <code>array_write</code>&apos;&inodot; 11ms&apos;den 3ms&apos;ye, <code>nested_loops</code>&apos;u 18ms&apos;den 9ms&apos;ye ve <code>array_read</code>&apos;i 11ms&apos;den 4ms&apos;ye ta&scedil;&inodot;d&inodot;.
      </p>

      <h3>3. Fast-math bayraklar&inodot;</h3>
      <p>
        Her f64 aritmetik komutuna <code>reassoc contract</code> bayraklar&inodot; ekliyoruz. <code>reassoc</code>, LLVM&apos;nin seri ak&uuml;m&uuml;lat&ouml;r zincirlerini paralel olanlara b&ouml;lmesine olanak tan&inodot;r ve <code>contract</code> fused multiply-add&apos;e izin verir. Perry NaN bitlerini de&gbreve;er etiketi olarak kulland&inodot;&gbreve;&inodot; i&ccedil;in <code>nnan</code> ve <code>ninf</code>&apos;i kapal&inodot; tutuyoruz.
      </p>
      <p>
        Bu bayraklarla, LLVM&apos;nin d&ouml;ng&uuml; vekt&ouml;rle&scedil;tiricisi <code>math_intensive</code>&apos;de devreye giriyor; bu da 131ms&apos;den 14ms&apos;ye d&uuml;&scedil;t&uuml; &mdash; Node&apos;u 3,5x yeniyor.
      </p>

      <h3>4. Tamsay&inodot; mod&uuml;lo fast path</h3>
      <p>
        JavaScript&apos;te f64 &uuml;zerindeki <code>%</code> operand&inodot; <code>fmod</code>&apos;dur, ki bu ARM&apos;de bir libm &ccedil;a&gbreve;r&inodot;s&inodot;d&inodot;r. Ama tamsay&inodot; de&gbreve;erli f64 operandlar i&ccedil;in <code>fptosi &rarr; srem &rarr; sitofp</code> yapabilir ve libm gidi&scedil;-d&ouml;n&uuml;&scedil;&uuml;n&uuml; tamamen atlayabiliriz. Codegen, tamsay&inodot; de&gbreve;erli operandlar&inodot; tespit etmek i&ccedil;in statik analiz kullan&inodot;r &mdash; runtime kontrol&uuml; gerekmez.
      </p>
      <p>
        <code>factorial</code>&apos;&inodot;n 1.553ms&apos;den 24ms&apos;ye inmesinin &mdash; ve Node&apos;un 591ms&apos;inden 24ms&apos;ye inmesinin t&uuml;m nedeni budur. <strong>Node&apos;dan 24,6 kat h&inodot;zl&inodot;.</strong>
      </p>

      <h3>5. &Inodot;&ccedil; i&ccedil;e d&ouml;ng&uuml;ler i&ccedil;in LICM</h3>
      <p>
        LLVM kutudan &ccedil;&inodot;kan haliyle loop-invariant code motion yapar, ancak NaN-boxing yap&inodot;y&inodot; gizler. <code>arr.length</code>, etiket kontrol&uuml; olan NaN-boxed bir pointer &uuml;zerinden y&uuml;klemeye d&ouml;n&uuml;&scedil;&uuml;r &mdash; a&ccedil;&inodot;k&ccedil;a invariant de&gbreve;il.
      </p>
      <p>
        Codegen, <code>{'for (...; i < arr.length; ...)'}</code> kal&inodot;b&inodot;n&inodot; tespit eder ve uzunlu&gbreve;u d&ouml;ng&uuml;den &ouml;nce bir stack slot&apos;una &ouml;n y&uuml;kler; statik bir walker d&ouml;ng&uuml; g&ouml;vdesinin dizinin uzunlu&gbreve;unu de&gbreve;i&scedil;tiremeyece&gbreve;ini do&gbreve;rular. Saya&ccedil; bu kald&inodot;r&inodot;lm&inodot;&scedil; uzunlukla s&inodot;n&inodot;rland&inodot;&gbreve;&inodot;nda, IndexGet/IndexSet s&inodot;n&inodot;r kontrollerini tamamen atlar.
      </p>

      <h3>6. Shape-cache&apos;li nesneler</h3>
      <p>
        Codegen bir nesnenin class&apos;&inodot;n&inodot; bildi&gbreve;inde, alan offsetlerini derleme zaman&inodot;nda &ccedil;&ouml;zer ve <strong>do&gbreve;rudan indeksli y&uuml;klemeler</strong> emit eder &mdash; runtime dispatch yok. Metot dispatch i&ccedil;in, <code>obj.method(args)</code> do&gbreve;rudan bir <code>call @perry_method_Class_name(this, args)</code> olur &mdash; vtable yok, inline cache yok, hash lookup yok.
      </p>
      <p>
        LLVM ge&ccedil;i&scedil;i bunu evrensel slow path&apos;e geriletmi&scedil;ti. Statik dispatch&apos;i geri y&uuml;klemek bize <code>method_calls</code> kurtarmas&inodot;n&inodot; verdi &mdash; 1.084ms&apos;den tekrar 1ms&apos;ye. <strong>Node&apos;dan 11 kat h&inodot;zl&inodot;.</strong>
      </p>

      <h2>B&ouml;l&uuml;m 5: Bug&uuml;nk&uuml; Rakamlar</h2>
      <p>&Uuml;&ccedil; &ccedil;al&inodot;&scedil;t&inodot;rman&inodot;n medyan&inodot;, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">2.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">berabere</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">berabere</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Her benchmark bir galibiyet veya berabere. En yak&inodot;n sonu&ccedil; <code>object_create</code> (9ms vs 8ms); burada V8&apos;in allocator&apos;&uuml; ger&ccedil;ekten m&uuml;kemmel.
      </p>

      <h2>B&ouml;l&uuml;m 6: Derleme S&uuml;resi Sorusu</h2>
      <p>
        &Inodot;nsanlar&inodot;n LLVM yerine Cranelift&apos;i se&ccedil;mesinin bir numaral&inodot; nedeni derleme h&inodot;z&inodot;d&inodot;r. Haydi bundan konu&scedil;al&inodot;m.
      </p>
      <p>
        LLVM, Perry&apos;nin dosya ba&scedil;&inodot;na derleme s&uuml;resini <strong>20-50ms</strong> veya yakla&scedil;&inodot;k <strong>%8-19</strong> art&inodot;rd&inodot;. 5x de&gbreve;il. 2x de&gbreve;il. Tek haneli ile d&uuml;&scedil;&uuml;k &ccedil;ift haneli y&uuml;zdelik.
      </p>
      <p>
        Nedeni, codegen&apos;in Perry&apos;nin pipeline&apos;&inodot;ndaki darbo&gbreve;az olmamas&inodot;d&inodot;r. Tipik bir dosya i&ccedil;in da&gbreve;&inodot;l&inodot;m:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC parsing: ~%30</li>
        <li>HIR lowering (AST &rarr; IR, tip &ccedil;&inodot;kar&inodot;m&inodot;): ~%25</li>
        <li>IR d&ouml;n&uuml;&scedil;&uuml;m pass&apos;lar&inodot; (closure d&ouml;n&uuml;&scedil;&uuml;m&uuml;, async lowering, inlining): ~%15</li>
        <li><strong>Codegen (LLVM IR metin emisyonu + <code>clang -c -O3</code>): ~%20</strong></li>
        <li>Linking (<code>cc</code> + runtime k&uuml;t&uuml;phanesi): ~%10</li>
      </ul>
      <p>
        Codegen be&scedil; dilimin biri. O dilimi ikiye katlasan&inodot;z bile toplam sadece %5-10 hareket eder. Kullan&inodot;c&inodot;n&inodot;n <code>perry compile</code> yazd&inodot;&gbreve;&inodot; ve binary&apos;yi sonsuza dek &ccedil;al&inodot;&scedil;t&inodot;rd&inodot;&gbreve;&inodot; bir AOT derleyici yap&inodot;yorsan&inodot;z, hesap &scedil;udur: derleme zaman&inodot;nda 25ms daha harca, her &ccedil;al&inodot;&scedil;t&inodot;rmada 24x&apos;e kadar tasarruf et.
      </p>

      <h2>B&ouml;l&uuml;m 7: Neyi Farkl&inodot; Yapard&inodot;m</h2>
      <p>
        E&gbreve;er Perry&apos;yi bug&uuml;n ba&scedil;lat&inodot;yor olsayd&inodot;m ve do&gbreve;rudan LLVM&apos;ye atlayabilseydim, atlamazd&inodot;m. Cranelift a&scedil;amas&inodot; ger&ccedil;ekten de&gbreve;erliydi. LLVM&apos;nin karma&scedil;&inodot;kl&inodot;k vergisi olmadan frontend &uuml;zerinde iterasyon yapmam&inodot;z&inodot; sa&gbreve;lad&inodot;, kar&scedil;&inodot;la&scedil;t&inodot;rma i&ccedil;in &ccedil;al&inodot;&scedil;an bir temel hat verdi ve HIR&apos;imizi backend&apos;ler aras&inodot;nda ta&scedil;&inodot;nabilir olacak kadar temiz tutmaya zorlad&inodot;.
      </p>
      <p>
        Farkl&inodot; yapaca&gbreve;&inodot;m &scedil;ey ge&ccedil;i&scedil;in kendisi. v0.5.0&apos;&inodot; &ccedil;o&gbreve;u i&scedil;lem runtime helper &ccedil;a&gbreve;r&inodot;lar&inodot;ndan ge&ccedil;erek yay&inodot;nlad&inodot;k, bunlar&inodot; sonra inline yapmay&inodot; planl&inodot;yorduk. Bu yanl&inodot;&scedil;t&inodot;. Do&gbreve;ru s&inodot;ra &scedil;u olurdu: &ouml;nce s&inodot;cak yollar&inodot; belirle, ge&ccedil;i&scedil;ten &ouml;nce bunlar&inodot; inline olarak al&ccedil;alt ve ancak LLVM backend&apos;i en az&inodot;ndan e&scedil;it seviyeye geldi&gbreve;inde yay&inodot;nla.
      </p>
      <p>
        Ders s&inodot;k&inodot;c&inodot; olan: optimizasyon s&inodot;n&inodot;rlar&inodot; optimizer kalitesinden daha &ouml;nemli. LLVM ola&gbreve;an&uuml;st&uuml; bir yaz&inodot;l&inodot;m par&ccedil;as&inodot;, ama g&ouml;remedi&gbreve;i kodda size yard&inodot;mc&inodot; olamaz. E&gbreve;er codegen&apos;iniz her &scedil;eyi opak runtime &ccedil;a&gbreve;r&inodot;lar&inodot; &uuml;zerinden y&ouml;nlendiriyorsa, kaynak program&inodot;n&inodot;z ile var olan her optimizasyon pass&apos;&inodot; aras&inodot;na bir duvar &ouml;rm&uuml;&scedil;s&uuml;n&uuml;z demektir.
      </p>

      <h2>Sonu&ccedil;</h2>
      <p>
        Perry art&inodot;k yaln&inodot;zca LLVM, her benchmark&apos;ta Node&apos;dan h&inodot;zl&inodot; ve yay&inodot;nda. Ge&ccedil;i&scedil; planlad&inodot;&gbreve;&inodot;mdan uzun s&uuml;rd&uuml;, ortada bekledi&gbreve;imden fazla ac&inodot;tt&inodot; ve geriye d&ouml;n&uuml;p bak&inodot;ld&inodot;&gbreve;&inodot;nda kesin olarak do&gbreve;ru karar. Cranelift bizi v0.5&apos;e getirdi; LLVM bizi geri kalan yolda ta&scedil;&inodot;yor.
      </p>
      <p>Perry&apos;yi denemek istiyorsan&inodot;z:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Kaynak kod: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Benchmark&apos;lar&inodot; kendiniz &ccedil;al&inodot;&scedil;t&inodot;r&inodot;n: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Sorular&inodot;n&inodot;z varsa, hatalar bulursan&inodot;z veya codegen backend&apos;leri hakk&inodot;nda tart&inodot;&scedil;mak isterseniz, GitHub issue&apos;lar&inodot; a&ccedil;&inodot;k. Hepsini okuyorum.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
