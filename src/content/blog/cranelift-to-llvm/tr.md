---
title: "Cranelift'ten LLVM'ye: Ne Bozuldu ve Nasıl Düzelttik"
excerpt: "Perry'nin Cranelift'ten LLVM'ye backend geçişi tamamlandı. İlk geçiş benchmark'ları 70 kat yavaşlattı — işte neyin bozulduğu ve onu düzelten altı hedefli optimizasyon."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Düzeltme (Eylül 2026):** Aşağıda “factorial” olarak adlandırılan benchmark yanlış adlandırılmıştı: bir döngüde `i % 1000` toplar ve hiçbir faktöriyel hesaplamaz. 24,6 kat rakamı, yeniden üretilemeyen eski bir Node.js çalıştırmasından geliyordu; güncel yayımlanan harness’ımızda Node.js ile berabere (93 ms’ye karşı 95 ms). Bu, tamsayı mod işlemi hızlı yolunun bir mikrobenchmark’ıdır, tipik TypeScript performansının bir ölçüsü değildir. Aşağıdaki sonuçlar tarihsel kayıt olarak korunmuştur. Perry’nin kaybettiği benchmark’lar dahil güncel rakamlar şurada: [Perry README](https://github.com/PerryTS/perry#performance)

Perry'nin Cranelift'ten LLVM'ye backend geçi&scedil;i tamamland&inodot;. v0.5.12 itibar&inodot;yla LLVM tek kod üretim backend'i ve Perry art&inodot;k her benchmark'ta Node.js'i yeniyor — 1,7x ile 24,6x aras&inodot;nda de&gbreve;i&scedil;en marjlarla (iki beraberlikle).

Buraya gelmek düz bir yol de&gbreve;ildi. v0.5.0'daki ilk geçi&scedil;, birkaç benchmark'&inodot; yerini ald&inodot;&gbreve;&inodot; Cranelift sürümünden **70 kat daha yava&scedil;** hale getirdi. Bu yaz&inodot; ne oldu&gbreve;unun, neden yine de geçi&scedil; yapt&inodot;&gbreve;&inodot;m&inodot;z&inodot;n, neyin bozuldu&gbreve;unun, neyin düzeltti&gbreve;inin ve rakamlar&inodot;n di&gbreve;er tarafta nas&inodot;l göründü&gbreve;ünün uzun versiyonudur.

E&gbreve;er bir derleyici yap&inodot;yorsan&inodot;z, codegen backend'lerini de&gbreve;erlendiriyorsan&inodot;z veya sadece “LLVM'ye geç” ifadesinin neden nadiren göründü&gbreve;ü kadar basit olmad&inodot;&gbreve;&inodot;n&inodot; merak ediyorsan&inodot;z, bu yaz&inodot; sizin için.

## Bölüm 1: Neden Geçi&scedil; Yapt&inodot;k?

Perry, TypeScript'i do&gbreve;rudan yerel makine koduna derler. Node yok, V8 yok, Electron yok, WebView yok. Önerme “TypeScript yaz, yerel bir binary ç&inodot;kar” ve e&gbreve;er o binary gerçekten h&inodot;zl&inodot; de&gbreve;ilse tüm de&gbreve;er önermesi çöker.

Perry'nin ilk birkaç minor sürümünde codegen backend'i [Cranelift](https://cranelift.dev/)'ti. Cranelift mükemmel — wasmtime'&inodot;n arkas&inodot;ndaki codegen, SpiderMonkey'nin baseline JIT'i taraf&inodot;ndan kullan&inodot;l&inodot;yor ve h&inodot;zl&inodot;, öngörülebilir derleme ile temiz bir gömülme hikayesi gerekti&gbreve;inde tercih edilen araç. Yeni bir dil bootstrap eden bir proje için do&gbreve;ru ba&scedil;lang&inodot;ç noktas&inodot;yd&inodot;.

Ancak iki &scedil;ey bizi sonunda ondan uzakla&scedil;t&inodot;rd&inodot;.

### 1\. Optimizer tavan&inodot;

Cranelift bilerek h&inodot;zl&inodot;, tek katmanl&inodot; bir optimize edici derleyicidir. Görevi “h&inodot;zla makul kod üret,” “s&inodot;n&inodot;rs&inodot;z zaman verilerek mümkün olan en iyi kodu üret” de&gbreve;il. Bu, JIT için do&gbreve;ru takasd&inodot;r. Tüm sat&inodot;&scedil; noktas&inodot; yerel performans olan bir AOT derleyici için yanl&inodot;&scedil; takas.

LLVM'nin middle-end'ine yirmi y&inodot;l&inodot; a&scedil;k&inodot;n emek dökülmü&scedil;tür. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis — daha küçük bir projenin bunu yakalayaca&gbreve;&inodot; gerçekçi bir dünya yok. Perry “Node'dan h&inodot;zl&inodot;” diyecekse, bu mekanizmaya ihtiyac&inodot;m&inodot;z var.

### 2\. arm64\_32 sorunu

Acil zorlayan faktör Apple Watch'tu. `arm64_32`, Apple'&inodot;n Series 4 ve sonras&inodot; için tan&inodot;tt&inodot;&gbreve;&inodot; bir ABI — 64-bit komutlar, 32-bit pointer'lar. Cranelift bunu desteklemiyor ve destek gelmesi için gerçekçi bir yol yoktu. Perry'nin “tek kod taban&inodot;ndan 9 platform” iddias&inodot;n&inodot;n inand&inodot;r&inodot;c&inodot; olmas&inodot; için watchOS eksik olamazd&inodot;. LLVM `arm64_32`'yi kutudan ç&inodot;kan haliyle destekliyor.

*Baz&inodot;* hedeflerin LLVM gerektirece&gbreve;ini kabul etti&gbreve;imizde, iki backend'i sürdürmek sürdürülemez hale geldi. &Inodot;ki backend iki set hata, iki set optimizasyon pass'&inodot;, iki test matrisi, iki performans temeli demek. Dürüst cevap: birini seç.

LLVM'yi seçtik.

## Bölüm 2: Cranelift Hakk&inodot;nda

Devam etmeden önce: bu yaz&inodot; bir Cranelift ele&scedil;tirisi de&gbreve;il. Cranelift parlak bir mühendislik eseri ve JIT, sandbox runtime veya derleme gecikmesinin tepe throughput'tan daha önemli oldu&gbreve;u herhangi bir &scedil;ey yap&inodot;yorsan&inodot;z, listenizin ba&scedil;&inodot;na yak&inodot;n olmal&inodot;. wasmtime onu iyi bir nedenle kullan&inodot;yor. Bytecode Alliance örnek te&scedil;kil eden bir çal&inodot;&scedil;ma yap&inodot;yor.

Perry'nin ihtiyaçlar&inodot; farkl&inodot;. Önceden derliyoruz, binary'yi bir kez gönderiyoruz ve kullan&inodot;c&inodot; milyonlarca kez çal&inodot;&scedil;t&inodot;r&inodot;yor. Bu asimetri — nadiren derle, her zaman çal&inodot;&scedil;t&inodot;r — tam olarak LLVM'nin daha a&gbreve;&inodot;r optimizer'&inodot;nün kendini amorti etti&gbreve;i rejim. Farkl&inodot; i&scedil; için farkl&inodot; araç.

## Bölüm 3: Geçi&scedil; Felaketi

v0.5.0, LLVM'nin tek backend oldu&gbreve;u ilk sürümdü. Derleme süresinde küçük bir gerileme ve çal&inodot;&scedil;ma zaman&inodot; performans&inodot;nda anlaml&inodot; bir iyile&scedil;me bekliyorduk. &Inodot;kincisinin tersini elde ettik.

O zaman yay&inodot;nlamak istemedi&gbreve;im tablo:

| Benchmark | Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method\_calls | 16ms | 1,084ms | 68 kat yava&scedil; |
| object\_create | 5ms | 318ms | 64 kat yava&scedil; |
| matrix\_multiply | 61ms | 184ms | 3 kat yava&scedil; |
| math\_intensive | 370ms | 131ms | 2,8 kat h&inodot;zl&inodot; |
| nested\_loops | 32ms | 57ms | 1,8 kat yava&scedil; |
| fibonacci(40) | 505ms | 1,156ms | 2,3 kat yava&scedil; |

Baz&inodot; i&scedil; yükleri h&inodot;zland&inodot;. Ço&gbreve;u dramatik &scedil;ekilde kötüle&scedil;ti. `method_calls` — idiomatik TypeScript class kullan&inodot;m&inodot;n&inodot; temsil etti&gbreve;i için en önemli benchmark'lardan biri — iki sürüm önceki gönderdiklerimizden neredeyse 70 kat daha kötüydü.

### As&inodot;l yanl&inodot;&scedil; giden ne

Perry, de&gbreve;er temsili için **NaN-boxing** kullan&inodot;r. Her TypeScript de&gbreve;eri 64-bit bir word'dür. f64 say&inodot;lar do&gbreve;rudan depolanr; di&gbreve;er her &scedil;ey (nesneler, stringler, boolean'lar, undefined, null) bir IEEE 754 quiet NaN'&inodot;n kullan&inodot;lmayan bitlerine kodlan&inodot;r.

Avantaj&inodot;: say&inodot;lar s&inodot;f&inodot;r maliyetli. Boxing yok, tagging yok, aritmetik için bellek ay&inodot;rma yok.

Dezavantaj&inodot;: say&inodot;sal olmayan her de&gbreve;er üzerindeki her i&scedil;lem, açmak, i&scedil;lemek ve yeniden paketlemek için bit manipülasyonu gerektirir. E&gbreve;er bu diziler codegen'inizde inline IR olarak ya&scedil;&inodot;yorsa, optimizer bunlar&inodot; birle&scedil;tirip basitle&scedil;tirebilir. E&gbreve;er **runtime helper fonksiyon ça&gbreve;r&inodot;lar&inodot;** olarak ya&scedil;&inodot;yorsa, optimizer opak bir ça&gbreve;r&inodot; görür ve vazgeçer.

Cranelift backend'imiz, s&inodot;cak i&scedil;lemler için çok say&inodot;da inline lowering geli&scedil;tirmi&scedil;ti — özellik yüklemeleri, metot dispatch'i, nesne ay&inodot;rma, f64 etiketli de&gbreve;erler üzerinde tamsay&inodot; aritmetik. LLVM geçi&scedil;i, önce *do&gbreve;ru* kod ç&inodot;karma ç&inodot;kar&inodot;na, bunlar&inodot;n neredeyse tamam&inodot;n&inodot; `perry-runtime`'daki runtime helper'lar&inodot; üzerinden yönlendirdi. Her helper LLVM IR'de bir `call` komutuydu.

LLVM mükemmel, ama gövdesini hiç görmedi&gbreve;i bir fonksiyonu inline yapamaz. `perry-runtime` ayr&inodot; derlenir, sonunda ba&gbreve;lan&inodot;r ve optimizer'&inodot;n perspektifinden her helper ça&gbreve;r&inodot;s&inodot; bir kara kutudur. Sonuç, Cranelift backend'inin ~5 inline aritmetik komutu olarak derledi&gbreve;i s&inodot;cak döngülerin art&inodot;k fonksiyon ça&gbreve;r&inodot;lar&inodot;na — yazmaç kayd&inodot;, stack frame kurulumu, her &scedil;ey — milyonlarca kez tekrarlanan &scedil;ekilde derlenmesiydi.

70x buradan geldi. Kötü codegen de&gbreve;il. Kötü **inlining s&inodot;n&inodot;rlar&inodot;**.

## Bölüm 4: Düzeltme

Cranelift rakamlar&inodot;n&inodot; kurtarma ve a&scedil;ma çal&inodot;&scedil;mas&inodot; kabaca alt&inodot; kategoriye ayr&inodot;ld&inodot;. Hiçbiri egzotik de&gbreve;il. Ço&gbreve;u, sadece do&gbreve;ru yerlerde uygulanmas&inodot; gereken ders kitab&inodot; derleyici optimizasyonlar&inodot;.

### 1\. Nesne ay&inodot;rma için inline bump allocator

`object_create`, `method_calls`'dan sonraki en kötü gerilemeydi. Eski yol her `new Point()` için `js_object_alloc_class_with_keys`'i ça&gbreve;&inodot;r&inodot;yordu — bir fonksiyon ça&gbreve;r&inodot;s&inodot;, bir thread-local arena eri&scedil;imi, bir shape-cache aramas&inodot; ve GC header + nesne header yazma.

Düzeltme: bump allocation'&inodot; LLVM IR'de **inline** olarak emit et. Nesne ay&inodot;ran her fonksiyon, thread-local bir `InlineArenaState` struct'&inodot;na önbelleklenmi&scedil; bir pointer al&inodot;r. Ay&inodot;rma &scedil;öyle olur:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
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
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

Fast path, LLVM'nin görebildi&gbreve;i, zamanlayabildi&gbreve;i ve döngülerden kald&inodot;rabildi&gbreve;i ~13 inline IR komutudur. `object_create` 318ms'den 9ms'ye dü&scedil;tü.

### 2\. i32 döngü sayaçlar&inodot;

NaN-boxing, her TypeScript say&inodot;s&inodot;n&inodot;n f64 oldu&gbreve;u anlam&inodot;na gelir. Döngü sayaçlar&inodot; dahil. f64 indüksiyon de&gbreve;i&scedil;kenleriyle `for (let i = 0; i < 100_000_000; i++)` döngüsü felaket: f64 art&inodot;rma, f64 kar&scedil;&inodot;la&scedil;t&inodot;rma, her dizi indekslemede f64'ten i64'e dönü&scedil;üm.

Codegen, indüksiyon de&gbreve;i&scedil;keninin kan&inodot;tlanabilir &scedil;ekilde tamsay&inodot; de&gbreve;erli oldu&gbreve;u for-döngüleri tespit eder ve **paralel i32 stack slot'u** ay&inodot;r&inodot;r. Döngü ko&scedil;ulu `fcmp`'den `icmp slt i32`'ye geçerek f64 sayaç&inodot;n&inodot; tamamen ortadan kald&inodot;r&inodot;r.

Bu, `array_write`'&inodot; 11ms'den 3ms'ye, `nested_loops`'u 18ms'den 9ms'ye ve `array_read`'i 11ms'den 4ms'ye ta&scedil;&inodot;d&inodot;.

### 3\. Fast-math bayraklar&inodot;

Her f64 aritmetik komutuna `reassoc contract` bayraklar&inodot; ekliyoruz. `reassoc`, LLVM'nin seri akümülatör zincirlerini paralel olanlara bölmesine olanak tan&inodot;r ve `contract` fused multiply-add'e izin verir. Perry NaN bitlerini de&gbreve;er etiketi olarak kulland&inodot;&gbreve;&inodot; için `nnan` ve `ninf`'i kapal&inodot; tutuyoruz.

Bu bayraklarla, LLVM'nin döngü vektörle&scedil;tiricisi `math_intensive`'de devreye giriyor; bu da 131ms'den 14ms'ye dü&scedil;tü — Node'u 3,5x yeniyor.

### 4\. Tamsay&inodot; modülo fast path

JavaScript'te f64 üzerindeki `%` operand&inodot; `fmod`'dur, ki bu ARM'de bir libm ça&gbreve;r&inodot;s&inodot;d&inodot;r. Ama tamsay&inodot; de&gbreve;erli f64 operandlar için `fptosi → srem → sitofp` yapabilir ve libm gidi&scedil;-dönü&scedil;ünü tamamen atlayabiliriz. Codegen, tamsay&inodot; de&gbreve;erli operandlar&inodot; tespit etmek için statik analiz kullan&inodot;r — runtime kontrolü gerekmez.

`factorial`'&inodot;n 1.553ms'den 24ms'ye inmesinin — ve Node'un 591ms'inden 24ms'ye inmesinin tüm nedeni budur. **Node'dan 24,6 kat h&inodot;zl&inodot;.**

### 5\. &Inodot;ç içe döngüler için LICM

LLVM kutudan ç&inodot;kan haliyle loop-invariant code motion yapar, ancak NaN-boxing yap&inodot;y&inodot; gizler. `arr.length`, etiket kontrolü olan NaN-boxed bir pointer üzerinden yüklemeye dönü&scedil;ür — aç&inodot;kça invariant de&gbreve;il.

Codegen, `for (...; i < arr.length; ...)` kal&inodot;b&inodot;n&inodot; tespit eder ve uzunlu&gbreve;u döngüden önce bir stack slot'una ön yükler; statik bir walker döngü gövdesinin dizinin uzunlu&gbreve;unu de&gbreve;i&scedil;tiremeyece&gbreve;ini do&gbreve;rular. Sayaç bu kald&inodot;r&inodot;lm&inodot;&scedil; uzunlukla s&inodot;n&inodot;rland&inodot;&gbreve;&inodot;nda, IndexGet/IndexSet s&inodot;n&inodot;r kontrollerini tamamen atlar.

### 6\. Shape-cache'li nesneler

Codegen bir nesnenin class'&inodot;n&inodot; bildi&gbreve;inde, alan offsetlerini derleme zaman&inodot;nda çözer ve **do&gbreve;rudan indeksli yüklemeler** emit eder — runtime dispatch yok. Metot dispatch için, `obj.method(args)` do&gbreve;rudan bir `call @perry_method_Class_name(this, args)` olur — vtable yok, inline cache yok, hash lookup yok.

LLVM geçi&scedil;i bunu evrensel slow path'e geriletmi&scedil;ti. Statik dispatch'i geri yüklemek bize `method_calls` kurtarmas&inodot;n&inodot; verdi — 1.084ms'den tekrar 1ms'ye. **Node'dan 11 kat h&inodot;zl&inodot;.**

## Bölüm 5: Bugünkü Rakamlar

Üç çal&inodot;&scedil;t&inodot;rman&inodot;n medyan&inodot;, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Benchmark | Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| factorial | 24ms | 591ms | 24.6x |
| method\_calls | 1ms | 11ms | 11x |
| loop\_overhead | 12ms | 53ms | 4.4x |
| math\_intensive | 14ms | 49ms | 3.5x |
| array\_read | 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array\_write | 3ms | 8ms | 2.6x |
| string\_concat | 1ms | 2ms | 2x |
| nested\_loops | 9ms | 16ms | 1.7x |
| prime\_sieve | 4ms | 7ms | 1.7x |
| matrix\_multiply | 21ms | 34ms | 1.6x |
| fibonacci(40) | 401ms | 991ms | 2.5x |
| binary\_trees | 9ms | 9ms | berabere |
| mandelbrot | 24ms | 24ms | berabere |
| object\_create | 9ms | 8ms | 0.9x |

Her benchmark bir galibiyet veya berabere. En yak&inodot;n sonuç `object_create` (9ms vs 8ms); burada V8'in allocator'ü gerçekten mükemmel.

## Bölüm 6: Derleme Süresi Sorusu

&Inodot;nsanlar&inodot;n LLVM yerine Cranelift'i seçmesinin bir numaral&inodot; nedeni derleme h&inodot;z&inodot;d&inodot;r. Haydi bundan konu&scedil;al&inodot;m.

LLVM, Perry'nin dosya ba&scedil;&inodot;na derleme süresini **20-50ms** veya yakla&scedil;&inodot;k **%8-19** art&inodot;rd&inodot;. 5x de&gbreve;il. 2x de&gbreve;il. Tek haneli ile dü&scedil;ük çift haneli yüzdelik.

Nedeni, codegen'in Perry'nin pipeline'&inodot;ndaki darbo&gbreve;az olmamas&inodot;d&inodot;r. Tipik bir dosya için da&gbreve;&inodot;l&inodot;m:

-   SWC parsing: ~%30
-   HIR lowering (AST → IR, tip ç&inodot;kar&inodot;m&inodot;): ~%25
-   IR dönü&scedil;üm pass'lar&inodot; (closure dönü&scedil;ümü, async lowering, inlining): ~%15
-   **Codegen (LLVM IR metin emisyonu + `clang -c -O3`): ~%20**
-   Linking (`cc` + runtime kütüphanesi): ~%10

Codegen be&scedil; dilimin biri. O dilimi ikiye katlasan&inodot;z bile toplam sadece %5-10 hareket eder. Kullan&inodot;c&inodot;n&inodot;n `perry compile` yazd&inodot;&gbreve;&inodot; ve binary'yi sonsuza dek çal&inodot;&scedil;t&inodot;rd&inodot;&gbreve;&inodot; bir AOT derleyici yap&inodot;yorsan&inodot;z, hesap &scedil;udur: derleme zaman&inodot;nda 25ms daha harca, her çal&inodot;&scedil;t&inodot;rmada 24x'e kadar tasarruf et.

## Bölüm 7: Neyi Farkl&inodot; Yapard&inodot;m

E&gbreve;er Perry'yi bugün ba&scedil;lat&inodot;yor olsayd&inodot;m ve do&gbreve;rudan LLVM'ye atlayabilseydim, atlamazd&inodot;m. Cranelift a&scedil;amas&inodot; gerçekten de&gbreve;erliydi. LLVM'nin karma&scedil;&inodot;kl&inodot;k vergisi olmadan frontend üzerinde iterasyon yapmam&inodot;z&inodot; sa&gbreve;lad&inodot;, kar&scedil;&inodot;la&scedil;t&inodot;rma için çal&inodot;&scedil;an bir temel hat verdi ve HIR'imizi backend'ler aras&inodot;nda ta&scedil;&inodot;nabilir olacak kadar temiz tutmaya zorlad&inodot;.

Farkl&inodot; yapaca&gbreve;&inodot;m &scedil;ey geçi&scedil;in kendisi. v0.5.0'&inodot; ço&gbreve;u i&scedil;lem runtime helper ça&gbreve;r&inodot;lar&inodot;ndan geçerek yay&inodot;nlad&inodot;k, bunlar&inodot; sonra inline yapmay&inodot; planl&inodot;yorduk. Bu yanl&inodot;&scedil;t&inodot;. Do&gbreve;ru s&inodot;ra &scedil;u olurdu: önce s&inodot;cak yollar&inodot; belirle, geçi&scedil;ten önce bunlar&inodot; inline olarak alçalt ve ancak LLVM backend'i en az&inodot;ndan e&scedil;it seviyeye geldi&gbreve;inde yay&inodot;nla.

Ders s&inodot;k&inodot;c&inodot; olan: optimizasyon s&inodot;n&inodot;rlar&inodot; optimizer kalitesinden daha önemli. LLVM ola&gbreve;anüstü bir yaz&inodot;l&inodot;m parças&inodot;, ama göremedi&gbreve;i kodda size yard&inodot;mc&inodot; olamaz. E&gbreve;er codegen'iniz her &scedil;eyi opak runtime ça&gbreve;r&inodot;lar&inodot; üzerinden yönlendiriyorsa, kaynak program&inodot;n&inodot;z ile var olan her optimizasyon pass'&inodot; aras&inodot;na bir duvar örmü&scedil;sünüz demektir.

## Sonuç

Perry art&inodot;k yaln&inodot;zca LLVM, her benchmark'ta Node'dan h&inodot;zl&inodot; ve yay&inodot;nda. Geçi&scedil; planlad&inodot;&gbreve;&inodot;mdan uzun sürdü, ortada bekledi&gbreve;imden fazla ac&inodot;tt&inodot; ve geriye dönüp bak&inodot;ld&inodot;&gbreve;&inodot;nda kesin olarak do&gbreve;ru karar. Cranelift bizi v0.5'e getirdi; LLVM bizi geri kalan yolda ta&scedil;&inodot;yor.

Perry'yi denemek istiyorsan&inodot;z:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Kaynak kod: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Benchmark'lar&inodot; kendiniz çal&inodot;&scedil;t&inodot;r&inodot;n: `cd benchmarks/suite && ./run_benchmarks.sh`

Sorular&inodot;n&inodot;z varsa, hatalar bulursan&inodot;z veya codegen backend'leri hakk&inodot;nda tart&inodot;&scedil;mak isterseniz, GitHub issue'lar&inodot; aç&inodot;k. Hepsini okuyorum.

— Ralph
