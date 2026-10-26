---
title: "Her Şeyi Optimize Etmek: Bir Hafta, 68 Sürüm ve 547x JSON Hızlanması"
excerpt: "Perry v0.5.13 → v0.5.80 yedi günde. JSON.parse Node'a olan 547x farkı kapatıyor. mimalloc global allocator olarak geliyor. Inline cache'ler, shape geçişleri, typed Buffer slot'ları, i32-native bitwise işlemleri, scalar replacement ve Fastify ile WebSocket sunucularını ayakta tutan native bir event loop."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
Son blog yaz&inodot;s&inodot; Perry v0.5.12 ile yay&inodot;nlanm&inodot;&scedil;t&inodot;. Bugün v0.5.80'deyiz. Bu **yedi günde 68 patch sürümü**, neredeyse tamamen tek bir &scedil;eye odaklanm&inodot;&scedil; durumda: kalan her yava&scedil; yolu h&inodot;zl&inodot; bir yola dönü&scedil;türmek.

v0.5.0'daki LLVM geçi&scedil;i v0.5.12 itibar&inodot;yla Cranelift ile e&scedil;it seviyeye geri döndü. Bu bir hikayenin sonu ve ba&scedil;kas&inodot;n&inodot;n ba&scedil;lang&inodot;c&inodot;yd&inodot;. LLVM art&inodot;k her &scedil;eyi görüyor. Soru art&inodot;k “bu neden yava&scedil;?” olmaktan ç&inodot;kt&inodot; ve “bu neden zaten h&inodot;zl&inodot; de&gbreve;il?” olmaya ba&scedil;lad&inodot; — ki bu çok daha ele al&inodot;nabilir bir soru.

Bu yaz&inodot; o haftan&inodot;n bir turu. JSON 547x h&inodot;zlanma ald&inodot;. mimalloc global allocator oldu. Özellik eri&scedil;imi monomorfik bir inline cache kazand&inodot;. Buffer'lar `noalias` metadata's&inodot; ile tipli pointer slotlar&inodot; kazand&inodot;. Fastify ve WebSocket sunucular&inodot; bir dakika sonra çökmeyi b&inodot;rakt&inodot;. Ve benchmark'lar yeniden hareket etti.

## 1\. JSON: 547x uçurumu kapatmak

v0.5.29'da Perry'nin JSON.parse'&inodot;, 20 kay&inodot;tl&inodot; bir dizide **Node'dan 547 kat daha yava&scedil;t&inodot;**. v0.5.46 itibar&inodot;yla 1,3 kat. Bu rakam haftan&inodot;n tek ba&scedil;&inodot;na en büyük deltas&inodot; ve ad&inodot;m ad&inodot;m anlatmaya de&gbreve;er çünkü bu yaz&inodot;daki di&gbreve;er her optimizasyon ayn&inodot; temaya ait bir varyasyon: yapmak zorunda olmad&inodot;&gbreve;&inodot;n&inodot;z i&scedil;i yapmay&inodot;n.

Orijinal parser, her özellik için bir Vec, her nesne için bir anahtar Vec'i ve anahtar cache'i için RefCell korumal&inodot; bir thread-local ay&inodot;r&inodot;yordu. Her string'i kopyal&inodot;yordu. Her alan ad&inodot;n&inodot; yeniden hash'liyordu. Her kay&inodot;t için yepyeni bir nesne &scedil;ekli olu&scedil;turuyordu, 20 kayd&inodot;n tamam&inodot; ayn&inodot; alanlar&inodot; ayn&inodot; s&inodot;rada içerse bile. Node'un parser'&inodot; bu deseni fark edip tüm kay&inodot;tlar aras&inodot;nda tek bir &scedil;ekli payla&scedil;arak hallediyor. Perry'ninki halletmiyordu.

Düzeltme dört ad&inodot;mda geldi:

1.  **Thread-local bir `PARSE_KEY_CACHE` üzerinden anahtar interning** (v0.5.45). &Inodot;lk kay&inodot;t N anahtar string ay&inodot;r&inodot;yor; 2'den 20'ye kadar olan kay&inodot;tlar s&inodot;f&inodot;r ay&inodot;r&inodot;yor. Tekrarlanan anahtarlar ayn&inodot; pointer'a çözünür, bu da onlar&inodot; strcmp olmadan shape-cache arama anahtarlar&inodot; olarak kullan&inodot;labilir k&inodot;lar.
2.  **Transition cache üzerinden &scedil;ekil payla&scedil;&inodot;m&inodot;** (v0.5.45). `js_object_set_field_by_name` taraf&inodot;ndan olu&scedil;turulan nesneler ayn&inodot; transition grafi&gbreve;inde dola&scedil;&inodot;r. &Scedil;ema tekrarland&inodot;&gbreve;&inodot;nda `keys_array` pointer'&inodot; payla&scedil;&inodot;l&inodot;r ve polimorfik inline cache'in isabet etmesi için ihtiyaç duydu&gbreve;u tam da budur.
3.  **S&inodot;f&inodot;r kopyal&inodot; string parsing + artan &scedil;ekilde nesne in&scedil;as&inodot;** (v0.5.46). `parse_string_bytes` art&inodot;k ters bölen kaç&inodot;&scedil; olmad&inodot;&gbreve;&inodot;nda `ParsedStr::Borrowed(&[u8])` döndürüyor — ki bu her anahtar ve ço&gbreve;u de&gbreve;er için ortak durum. `parse_object` önce bir Vec'e toplamak yerine alanlar&inodot; do&gbreve;rudan yaz&inodot;yor.
4.  **Parse s&inodot;ras&inodot;nda GC bask&inodot;lama** (v0.5.60, #59 kapan&inodot;r). Büyük bir dizinin parse edilmesi s&inodot;k&inodot; bir döngüde binlerce küçük nesne ay&inodot;r&inodot;yor. Her biri GC e&scedil;ik kontrolünü g&inodot;d&inodot;kl&inodot;yordu. “parse devam ediyor” bayra&gbreve;&inodot; ayarlanmas&inodot;, parse dönene kadar toplamay&inodot; erteliyor — etkin heap boyutu ayn&inodot;, bookkeeping dallanmas&inodot; çok daha az.

Sonra stringify. Homojen diziler üzerinde JSON.stringify — ayn&inodot; &scedil;ekil, milyonlarca kez — nesne ba&scedil;&inodot;na tam özellik iterasyonu yap&inodot;yordu, ki bu &scedil;ekil kararl&inodot; bir dizi için saf israf. Be&scedil; ad&inodot;ml&inodot; bir düzeltme bu uçurumun da büyük k&inodot;sm&inodot;n&inodot; kapatt&inodot;:

-   v0.5.62: say&inodot;lar için itoa / ryu h&inodot;zl&inodot; yollar&inodot;, HashSet yerine derinli&gbreve;e dayal&inodot; döngüsel referans kontrolü.
-   v0.5.63: `toJSON` koruyucusu + kal&inodot;c&inodot; anahtar cache'i + inline dispatch (birikip toplam olu&scedil;turan ça&gbreve;r&inodot; ba&scedil;&inodot;na üç maliyet).
-   v0.5.65: homojen &scedil;ekilli stringify &scedil;ablonu + ASCII kaç&inodot;&scedil; h&inodot;zl&inodot; yolu. Her eleman ayn&inodot; &scedil;ekle sahip oldu&gbreve;unda anahtar/iki nokta/virgül iskelesi bir kez önceden hesaplan&inodot;r.
-   v0.5.70, v0.5.72, v0.5.75: ça&gbreve;r&inodot; ba&scedil;&inodot;na shape-&scedil;ablon cache'i, parse-kalan&inodot; GC aç&inodot;&gbreve;&inodot;n&inodot; kapa, kalan sabit ça&gbreve;r&inodot; ba&scedil;&inodot;na yükü yok et.
-   v0.5.79: küçük de&gbreve;er yolu. Say&inodot;lar, boolean'lar ve k&inodot;sa stringler, nesne mekanizmas&inodot;n&inodot;n hiçbirini kurmayan do&gbreve;rudan bir yoldan geçer.

Birikmi&scedil; sonuç: haftan&inodot;n ba&scedil;&inodot;nda **Node'dan 547x uzak** olan bir JSON pipeline'&inodot; art&inodot;k gerçekçi i&scedil; yüklerinde **parse'ta kabaca 1,3x uzakta ve stringify'da rekabetçi**.

## 2\. Allocator hikayesi

Perry çok &scedil;ey ay&inodot;r&inodot;yor. Her nesne literali, her dizi literali, her string birle&scedil;tirme, her closure. Allocator s&inodot;cak ve v0.5'in ço&gbreve;u için Rust'&inodot;n varsay&inodot;lan sistem allocator'&inodot; art&inodot; k&inodot;sa ömürlü de&gbreve;erler için bir thread-local arena idi.

v0.5.67 global allocator'&inodot; **mimalloc** ile de&gbreve;i&scedil;tirdi. Bu, Cargo.toml'da tek sat&inodot;rl&inodot;k bir de&gbreve;i&scedil;iklik ve çok say&inodot;da küçük ay&inodot;rma yapan herhangi bir i&scedil; yükünde — ki bu her TypeScript program&inodot; demek — hemen kar&scedil;&inodot;l&inodot;&gbreve;&inodot;n&inodot; veriyor. v0.5.66 bundan önce geldi ve tüm `gc_malloc` thread-local state'ini ça&gbreve;r&inodot; ba&scedil;&inodot;na tek bir TLS eri&scedil;iminde birle&scedil;tirdi, böylece mimalloc'a giden yol mümkün oldu&gbreve;u kadar ucuzdu.

v0.5.68 bunu **arena'da ay&inodot;r&inodot;lan stringler** ile daha ileri götürdü. K&inodot;sa ömürlü stringler (ara concat sonuçlar&inodot;, `split()` parçalar&inodot;, parser çal&inodot;&scedil;ma alan&inodot;) global allocator'&inodot; tamamen atl&inodot;yor ve do&gbreve;al s&inodot;n&inodot;rlarda s&inodot;f&inodot;rlanan thread ba&scedil;&inodot;na bir bump arena'ya in&scedil; ediyor. JSON parsing için bu tek ba&scedil;&inodot;na iki haneli yüzde kazanc&inodot;yd&inodot;.

Ve hiç ay&inodot;rma yapmayan iki optimizasyon:

-   **Kaçmayan nesnelerin skaler yerine geçmesi** (v0.5.17, sonra v0.5.76'da nesne literalleri). Bir nesne kendisini çevreleyen fonksiyondan asla ç&inodot;km&inodot;yorsa, var olmas&inodot; gerekmez. Alanlar&inodot; s&inodot;radan local'lara dönü&scedil;ür. LLVM, nesneyi opak bir allocator ça&gbreve;r&inodot;s&inodot;n&inodot;n arkas&inodot;nda gizlemeyi b&inodot;rakt&inodot;&gbreve;&inodot;n&inodot;zda bunu kutudan ç&inodot;kan haliyle halleder.
-   **Kaçmayan dizilerin skaler yerine geçmesi** (v0.5.73). Ayn&inodot; fikir — dizi kaçm&inodot;yorsa, elemanlar&inodot; SSA de&gbreve;erlerine dönü&scedil;ür ve tüm ay&inodot;rma ortadan kalkar.

Dizi literali yolu için özellikle v0.5.69 **tam boyutlu bir h&inodot;zl&inodot; yol** ekledi (boyut derleme zaman&inodot;nda bilindi&gbreve;inde kapasite-büyütme mekanizmas&inodot;n&inodot; atla) ve v0.5.74 küçük dizi literalleri için bump allocator IR'sini inline yapt&inodot; böylece LLVM ay&inodot;rmay&inodot; görebilir, katlayabilir, hoist edebilir veya elimine edebilir. Dizi a&gbreve;&inodot;rl&inodot;kl&inodot; benchmark'lar bir ad&inodot;m daha hareket etti.

Kapan&inodot;&scedil; olarak, v0.5.25 daha sessiz bir hatay&inodot; düzeltti: `gc_malloc` kendi yolunda toplama tetiklemiyordu, dolay&inodot;s&inodot;yla malloc-a&gbreve;&inodot;rl&inodot;kl&inodot; i&scedil; yükleri herhangi bir kontrol yap&inodot;lmadan önce heap'i s&inodot;n&inodot;rs&inodot;z &scedil;ekilde büyütebiliyordu. v0.5.61 e&scedil;i&gbreve;e adaptif ad&inodot;m boyutlama ekledi, ki asl&inodot;nda istedi&gbreve;iniz &scedil;ey budur: heap küçükken ucuza kontrol et, büyükken daha seyrek kontrol et.

## 3\. Özellik eri&scedil;imi gerçek bir inline cache kazand&inodot;

Her modern JavaScript motorunun özellik eri&scedil;imi üzerinde polimorfik bir inline cache'i (PIC) vard&inodot;r. Perry'nin v0.5 serisinin ço&gbreve;u için PropertyGet, thread-local bir hash ile shape-tablo aramas&inodot;ndan geçiyordu. So&gbreve;uk kod için bu iyi. Belirli bir ça&gbreve;r&inodot; konumundaki özellik okumalar&inodot;n&inodot;z&inodot;n %95'i ayn&inodot; &scedil;ekli gördü&gbreve;ünde — ki neredeyse her zaman öyledir — iyi de&gbreve;il.

v0.5.44, `PropertyGet` için **monomorfik bir inline cache** getirdi. Her PropertyGet konumu, konum ba&scedil;&inodot;na bir cache giri&scedil;i al&inodot;r: beklenen bir &scedil;ekil pointer'&inodot; ve bir alan offset'i. Hit yolu tek bir kar&scedil;&inodot;la&scedil;t&inodot;rma art&inodot; indeksli bir yüklemedir. Miss yolu, cache'i güncelleyen yava&scedil; bir helper'a dü&scedil;er.

```
; obj.foo i&ccedil;in monomorfik IC h&inodot;zl&inodot; yolu
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... val&apos;&inodot; kullan
  br label %cont
```

v0.5.51 dinamik özellik yazmalar&inodot; için **içerik-hash shape-transition cache'i** ekledi. Ayn&inodot; alanlar&inodot; ayn&inodot; s&inodot;rada büyüten iki nesne ayn&inodot; transition'a hash edilir, dolay&inodot;s&inodot;yla ayn&inodot; &scedil;ekli payla&scedil;&inodot;rlar — ve bu da PIC'in okuma taraf&inodot;n&inodot;n gerçekten isabet etmesi anlam&inodot;na gelir.

v0.5.55 transition cache'inden son TLS eri&scedil;imini de ç&inodot;kard&inodot;. v0.5.46, >8 alan&inodot; olan nesnelerin inline slot'lar&inodot;n ötesine, ba&scedil;lat&inodot;lmam&inodot;&scedil; belle&gbreve;e okuma yapt&inodot;&gbreve;&inodot; bir PIC miss-handler hatas&inodot;n&inodot; düzeltti (#55 kapan&inodot;r). v0.5.78, PropertyGet'in PIC'ini ham say&inodot;lar gibi pointer olmayan al&inodot;c&inodot;lara indekslemekten alakoyan bir koruyucu ekledi — ki bu fazla iyimser tip daralt&inodot;m&inodot;nda olabiliyordu ve IC'deki son kararl&inodot;l&inodot;k sorunlar&inodot;ndan biriydi.

Net etki: özellik a&gbreve;&inodot;rl&inodot;kl&inodot; kod — pratikte ço&gbreve;u TypeScript demek — sadece IC sayesinde bir hafta öncekinden kabaca 2-3x daha h&inodot;zl&inodot;.

## 4\. Tamsay&inodot;lar, bitwise ve `| 0` kal&inodot;b&inodot;

NaN-boxing her say&inodot;y&inodot; bir f64 yapar. TypeScript programc&inodot;lar&inodot; tamsay&inodot; semanti&gbreve;i zorlamak için `x | 0` yazar. V8 on be&scedil; y&inodot;l&inodot;n&inodot; bunu ucuzlatmaya harcad&inodot;. Perry bu haftay&inodot; yeti&scedil;meye harcad&inodot;.

S&inodot;rayla de&gbreve;i&scedil;iklik y&inodot;&gbreve;&inodot;n&inodot;:

-   **v0.5.48**: `(int / const) | 0` için `sdiv`. LLVM bunu `smulh + asr`'a katlar, ki bu `fdiv` için ~10 cycle yerine ~2 cycle.
-   **v0.5.48**: Uint8ArrayGet s&inodot;n&inodot;rlar&inodot;nda `@llvm.assume`. S&inodot;n&inodot;r kontrolü dal+phi elmas&inodot;n&inodot; vektörle&scedil;tiricinin dü&scedil;ünebilece&gbreve;i tek bir temel blok ile de&gbreve;i&scedil;tirir.
-   **v0.5.49**: ToInt32 spesifikasyonu gere&gbreve;i NaN/Infinity ile bitwise i&scedil;lemlerin 0 üretmesi için düzeltme. Önce do&gbreve;ruluk.
-   **v0.5.50**: De&gbreve;erin bilinen &scedil;ekilde sonlu oldu&gbreve;u bilindi&gbreve;inde 5 komutluk NaN/Inf koruyucusunu atlayan `toint32_fast`. Art&inodot; küçük helper'larda `alwaysinline` ve clamp tespiti.
-   **v0.5.52**: Clamp fonksiyonlar&inodot;n&inodot; do&gbreve;rudan `smin`/`smax` intrinsic'leri ile hedefle. Clamp, art&inodot;rmadan sonra en yayg&inodot;n tamsay&inodot; kal&inodot;b&inodot;d&inodot;r.
-   **v0.5.53**: Bilinen &scedil;ekilde sonlu bir de&gbreve;erde `x | 0` ve `x >>> 0` bir noop olur — sadece `fptosi + sitofp`, hiç koruyucu yok.
-   **v0.5.56**: i32-native bitwise i&scedil;lemler; Uint8ArrayGet/Set'te i32 indeks ve de&gbreve;er.
-   **v0.5.58, v0.5.60**: `Math.imul` polyfill yolu yerine native i32 çarp&inodot;mas&inodot;na alçal&inodot;r. Polyfill tespiti, kullan&inodot;c&inodot;n&inodot;n yazd&inodot;&gbreve;&inodot; `Math.imul` shim'lerini tan&inodot;r ve de&gbreve;i&scedil;tirir.
-   **v0.5.59**: Saf fonksiyon init inlining + tamsay&inodot; local seeding. Callee küçük ve saf oldu&gbreve;unda fonksiyon local tamsay&inodot; analizi ça&gbreve;r&inodot; s&inodot;n&inodot;rlar&inodot;n&inodot;n ötesini görebilir.
-   **v0.5.37–v0.5.40**: Akümülatör kal&inodot;b&inodot; int-aritmetik h&inodot;zl&inodot; yolu. Klasik `for (...) acc += f(i)` döngüsü tipler izin verdi&gbreve;inde ba&scedil;tan sona i32'de kal&inodot;r.

v0.5.41 ince olan&inodot;. Codegen modül düzeyinde bir `const K: number[][] = [[...], ...]` gördü&gbreve;ünde, her &scedil;eyi `.rodata`'da düz bir `[N x i32]` sabitine alçalt&inodot;r. `K[y][x]` tek bir `getelementptr + load i32` olur. v0.5.43'teki int-analiz köprüsü ile birle&scedil;ti&gbreve;inde, `image_conv`'a (4K RGB frame üzerinde 5×5 Gaussian blur) **tek bir sürümde 3x h&inodot;zlanma** veren de budur.

## 5\. Buffer'lar ve Uint8Array

&Inodot;kili i&scedil; yükleri — kripto, görüntü i&scedil;leme, parsing, a&gbreve; — Buffer ve Uint8Array içinde ya&scedil;ar. v0.5.64 bunlara **tipli pointer slotlar&inodot; art&inodot; `noalias` metadata's&inodot;** verdi. Bir Buffer eskiden `alloca double`'da NaN-boxed bir double iken, art&inodot;k `alloca i64`'da ham bir `i64` pointer'&inodot;; LLVM ek aç&inodot;klamalar&inodot; ile optimizer'a “bu pointer kapsamdaki di&gbreve;er pointer'larla alias olu&scedil;turmuyor” diyor. Bu, optimizer'&inodot;n aksi halde yapmay&inodot; reddedece&gbreve;i load/store yeniden s&inodot;ralamas&inodot;n&inodot;, vektörle&scedil;tirmeyi ve register tahsisini serbest b&inodot;rak&inodot;r.

v0.5.80, buradaki son do&gbreve;ruluk sorununu kapatt&inodot;: fonksiyon ba&scedil;&inodot;na s&inodot;f&inodot;rlanan modül genelinde bir buffer `alias-scope` sayaç&inodot; vard&inodot; ve bu nadir durumlarda LLVM'nin bir scope ID'si payla&scedil;mamas&inodot; gereken scope'lar aras&inodot;nda mant&inodot;k yürütmesine izin verebiliyordu. &Scedil;imdi sayaç modül geneli ve `noalias` hikayesi sa&gbreve;lam.

v0.5.53, `Uint8ArraySet`'i dals&inodot;z yapt&inodot; — s&inodot;n&inodot;r d&inodot;&scedil;&inodot;na 0 yazan bir if/else yerine maskeli bir store. v0.5.54, uzun desenler için **Two-Way indexOf** ve arena'da ay&inodot;r&inodot;lan bir `split` ekledi; ki bunlar birlikte string a&gbreve;&inodot;rl&inodot;kl&inodot; Buffer parsing'indeki aç&inodot;&gbreve;&inodot;n büyük k&inodot;sm&inodot;n&inodot; kapatt&inodot;.

## 6\. Stringler: ASCII h&inodot;zl&inodot; yoldur

JavaScript stringleri UTF-16, ama gerçek dünyadaki stringlerin ço&gbreve;u (anahtarlar, tan&inodot;mlay&inodot;c&inodot;lar, HTTP ba&scedil;l&inodot;klar&inodot;, JSON iskelesi) ASCII. v0.5.71 **ASCII stringler için O(1) `charCodeAt` ve `codePointAt`** ekledi — UTF-16 taramas&inodot; yok, sadece byte yüklemesi. v0.5.20 zaten `indexOf`, `slice` ve `charAt`'&inodot;n ASCII'de UTF-16 taramas&inodot;n&inodot; atlamas&inodot;n&inodot; sa&gbreve;lam&inodot;&scedil;t&inodot;.

Ayn&inodot; sürümdeki bir do&gbreve;ruluk notu: `String.length` art&inodot;k byte say&inodot;s&inodot; yerine UTF-16 kod birimleri (ECMAScript spec) döndürüyor. `"café".length`'in 4 yerine 5 döndürdü&gbreve;ü gizli bir hata vard&inodot;.

## 7\. Sunucular art&inodot;k gerçekten ayakta kal&inodot;yor

Haftan&inodot;n en gösteri&scedil;siz çal&inodot;&scedil;mas&inodot; ayn&inodot; zamanda en kullan&inodot;c&inodot; görünür olan&inodot;yd&inodot;: uzun süre çal&inodot;&scedil;an Node tarz&inodot; sunucular&inodot;n — Fastify, ws, http, net — birkaç dakika sonra çökmemesini sa&gbreve;lamak.

Çökü&scedil;lerin hepsinin ortak bir kök sebebi vard&inodot;: GC, dinleyici closure'lar&inodot;n&inodot; bilmiyordu. `wss.on('message', handler)` yazd&inodot;&gbreve;&inodot;n&inodot;zda, closure de&gbreve;i&scedil;kenleri yakalar, ki bunlar GC'de ay&inodot;r&inodot;lm&inodot;&scedil; bir hücrenin içinde alanlar olarak ya&scedil;ar. E&gbreve;er GC kök taray&inodot;c&inodot;s&inodot; bu hücreleri ziyaret etmesini bilmiyorsa, yakalamalar&inodot; geri al&inodot;n&inodot;r ve bir sonraki mesaj olay&inodot; serbest b&inodot;rak&inodot;lm&inodot;&scedil; belle&gbreve;e dereference yapar.

-   **v0.5.26**: `net.Socket` olay dinleyicisi closure'lar&inodot;n&inodot; kök taramaya dahil et (#35 kapan&inodot;r).
-   **v0.5.27**: `ws`, `http`, `events`, `fastify`'a geni&scedil;let.
-   **v0.5.28**: Modül düzeyindeki globalleri GC kökleri olarak kaydet (#36 kapan&inodot;r). Bir katman yukar&inodot;daki ya&scedil;am süresi hatas&inodot;.
-   **v0.5.21**: Fastify/WebSocket request handler'lar&inodot; içinde `gc()` güvenli&gbreve;i — aç&inodot;k GC ça&gbreve;r&inodot;s&inodot;, request handler'lar arena'ya pointer tutarken çal&inodot;&scedil;&inodot;yordu (#31 kapan&inodot;r).

GC çal&inodot;&scedil;mas&inodot;n&inodot;n yan&inodot;nda, v0.5.20 bir **ana olay döngüsü** gönderdi — bir placeholder de&gbreve;il, gerçek olan&inodot; — bu da WebSocket ve timer tabanl&inodot; sunucular&inodot;, son senkron ça&gbreve;r&inodot; döndükten sonra ç&inodot;kmak yerine canl&inodot; tutuyor (#28'e ref). Bu, Perry'yi bir üretim HTTP sunucusu olarak çal&inodot;&scedil;t&inodot;rmaya çal&inodot;&scedil;an herkes için en etkili düzeltmeydi. Fastify art&inodot;k ayakta kal&inodot;yor. WebSocket sunucular&inodot; art&inodot;k ayakta kal&inodot;yor.

v0.5.19, JSValue FFI arg/return'leri için SysV AMD64 ABI uyumsuzlu&gbreve;unu düzeltti — Linux'ta native FFI ça&gbreve;r&inodot;lar&inodot;n&inodot;n argümanlar&inodot; sessizce bozabildi&gbreve;i bir sorun. v0.5.18, `axios` için native dispatch ekledi (get/post/put/delete/patch), `response.status` ve `response.data` dahil. v0.5.30, `fastify request.header()` ve `request.headers[]` dispatch'ini düzeltti; ki bu büyük/küçük harf duyars&inodot;z aramalar için undefined döndürüyordu.

## 8\. `@perry/postgres`: tüm bunlar&inodot; gerekli k&inodot;lan sürücü

Bu haftaki çal&inodot;&scedil;man&inodot;n büyük k&inodot;sm&inodot; tek bir i&scedil; yükünden kaynaklan&inodot;yordu: Perry-native üzerinde çal&inodot;&scedil;an tam Node uyumlu bir [Postgres sürücüsü](https://github.com/PerryTS/postgres) elde etmek. Sürücü TLS yetene&gbreve;ine sahip, modüller aras&inodot; codec kayd&inodot; var, cancel/close/notify destekliyor ve art&inodot;k `pg`, `postgres.js` ve `tokio-postgres`'a kar&scedil;&inodot; benchmark ediliyor.

Sürücü taraf&inodot; perf çal&inodot;&scedil;mas&inodot; derleyici taraf&inodot;na paralel gitti:

-   **Sütun ba&scedil;&inodot;na codec'i hoist et** ve hücre ba&scedil;&inodot;na Buffer kopyalar&inodot;n&inodot; dü&scedil;ür. Ara ay&inodot;rmalardan kaç&inodot;nmak için int8 için BigInt(string).
-   **Nesne formundaki sat&inodot;rlar için dinamik &scedil;ekil ba&scedil;&inodot;na Row constructor**. Sorgunuz her zaman ayn&inodot; sütunlar&inodot; döndürüyorsa, sürücü ilk kez &scedil;ekil-özelle&scedil;tirilmi&scedil; bir sat&inodot;r constructor'&inodot; olu&scedil;turur ve yeniden kullan&inodot;r — ki bu, derleyicinin PIC'i ile birle&scedil;ti&gbreve;inde sat&inodot;rlar üzerindeki alan eri&scedil;imini di&gbreve;er nesnelerdeki alan eri&scedil;imi kadar h&inodot;zl&inodot; yapar.
-   int8/numeric/date için ham string isteyen ça&gbreve;r&inodot;c&inodot;lar için **`parseTypes: 'minimal'` opt-out'u**.

Bu, derleyicinin her zaman sa&gbreve;lamak istedi&gbreve;i pozitif geri bildirim döngüsü. Gerçek bir sürücü gerçek darbo&gbreve;azlar&inodot; ortaya ç&inodot;kar&inodot;r. Darbo&gbreve;az, GitHub issue'su olarak dosyalanan tek sat&inodot;rl&inodot;k bir reprodüksiyon al&inodot;r. Bir haftal&inodot;k derleyici düzeltmelerinden sonra, sürücü daha h&inodot;zl&inodot; ve derleyici herkes için daha h&inodot;zl&inodot;. Yedi güne s&inodot;k&inodot;&scedil;t&inodot;r&inodot;lm&inodot;&scedil; tüm plan bu.

## 9\. &Inodot;simlendirilmeye de&gbreve;er do&gbreve;ruluk düzeltmeleri

Performans çal&inodot;&scedil;mas&inodot;, bir nehri taramak market arabalar&inodot;n&inodot; yüzeye ç&inodot;kard&inodot;&gbreve;&inodot; gibi do&gbreve;ruluk sorunlar&inodot;n&inodot; yüzeye ç&inodot;kar&inodot;r. K&inodot;smi bir liste:

-   **Promise.race**, reddedilmede `.reason` yerine `.value`'yu okuyordu, dolay&inodot;s&inodot;yla reddetmeler sessizce yutuluyordu (v0.5.13–v0.5.14).
-   **Promise.any** art&inodot;k tüm girdi promise'leri reddetti&gbreve;inde uygun bir `AggregateError` at&inodot;yor. `Promise.withResolvers` eklendi ve `queueMicrotask` s&inodot;ralamas&inodot; düzeltildi.
-   **`[..."hello"]`** art&inodot;k bozuk bir nesne yerine bir karakter dizisi üretiyor (#16 kapan&inodot;r).
-   **BigInt aritmeti&gbreve;i ve `BigInt()` zorlamas&inodot;** (#33 kapan&inodot;r). i64 bigint h&inodot;zl&inodot; yolu (v0.5.29) ortak durumu ucuzlat&inodot;r.
-   **Buffer.indexOf / Buffer.includes**, say&inodot;sal byte argüman&inodot; ile byte de&gbreve;erleri yerine buffer pointer'lar&inodot;na kar&scedil;&inodot; kar&scedil;&inodot;la&scedil;t&inodot;r&inodot;yordu (#56 kapan&inodot;r).
-   **NaN/Infinity ile bitwise i&scedil;lemler** ToInt32 spesifikasyonu gere&gbreve;i 0 üretiyor (#57 kapan&inodot;r).
-   **Windows x86\_64**: platforma özel be&scedil; düzeltme — `localtime`, `clang` ke&scedil;fi ve bir avuç codegen ayar&inodot; — Windows x86\_64'ü tekrar ye&scedil;ile getirdi (v0.5.72).

## 10\. Rakamlar

Son yaz&inodot;daki ba&scedil;l&inodot;k benchmark'&inodot;, Node'dan 24,6x daha h&inodot;zl&inodot; olan `factorial`'d&inodot;. Bu rakam de&gbreve;i&scedil;medi. Bu hafta hareket eden &scedil;ey etraf&inodot;ndaki her &scedil;ey:

| &Inodot;&scedil; yükü | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (20 kay&inodot;tl&inodot; &scedil;ema) | Node'dan 547x yava&scedil; | Node'dan 1,3x yava&scedil; | ~420x |
| image\_conv (4K 5×5 blur) | 1.980ms | 457ms | 4,3x |
| Özellik a&gbreve;&inodot;rl&inodot;kl&inodot; kod (PIC hit) | taban | 2-3x | 2-3x |
| Fibonacci(40) | 401ms | 309ms | 1,3x |
| Yük alt&inodot;nda Fastify çal&inodot;&scedil;ma süresi | çökmeden önce ~60s | süresiz | ∞ |

Node'a kar&scedil;&inodot; tüm 15 benchmark'l&inodot;k suite hala 14 galibiyet ve 1 beraberlik — son yaz&inodot;yla ayn&inodot; tablo, genel olarak biraz daha iyi rakamlarla. Bu haftaki gerçek hareket, o suite'de olmayan i&scedil; yüklerinde: JSON, görüntü i&scedil;leme, uzun süre çal&inodot;&scedil;an sunucular. Aç&inodot;klar oradayd&inodot;, ve kapanan da onlar.

## 11\. S&inodot;radaki ne

Hâlâ pe&scedil;inde oldu&gbreve;umuz tek benchmark `image_conv`'un Zig'e kar&scedil;&inodot; olan&inodot;. Perry 457ms'de; Zig 246ms'de. Bu aç&inodot;k mimari, optimizasyon-pass düzeyinde de&gbreve;il ve üç yerde ya&scedil;&inodot;yor:

1.  **Tipli buffer local'lar&inodot;**. Buffer çal&inodot;&scedil;mas&inodot;n&inodot;n ço&gbreve;u bu hafta girdi, ancak buffer tipli fonksiyon parametreleri ve local'lar&inodot; hâlâ her eri&scedil;imde unbox ediyor. Döngü say&inodot;c&inodot;lar&inodot; için kulland&inodot;&gbreve;&inodot;m&inodot;z `i64` slot yakla&scedil;&inodot;m&inodot; buffer'lara geni&scedil;lemeli.
2.  **&Inodot;ç/s&inodot;n&inodot;r döngü bölünmesi**. Blur döngüsü her pikseli clamp ediyor, buna ihtiyac&inodot; olmayan piksellerin %99,9'u dahil. S&inodot;n&inodot;r bölgelerine (clamped) ve içe (clamp yok) bölmek, LLVM'nin iç k&inodot;sm&inodot; NEON `ld3`/`st3` ile vektörle&scedil;tirmesine olanak tan&inodot;r.
3.  **Double-ABI FNV-1a hash**. Hash helper'&inodot; NaN-box ABI üzerinden ça&gbreve;r&inodot;l&inodot;yor. S&inodot;cak yollar için ham i64 in/out'a özelle&scedil;tirmek birkaç saatlik bir i&scedil; ve her hash-a&gbreve;&inodot;rl&inodot;kl&inodot; i&scedil; yükünde kar&scedil;&inodot;l&inodot;&gbreve;&inodot;n&inodot; verecek.

Bunlar `PERF_ROADMAP.md`'de takip ediliyor. Bir sonraki döngüde görünmelerini bekleyin.

## Toparlama

Bu haftan&inodot;n deseni — 68 patch sürümü, neredeyse tamam&inodot; performans, bir JSON aç&inodot;&gbreve;&inodot; 547x'ten 1,3x'e — LLVM geçi&scedil;i tepesinin iyi taraf&inodot;na geçti&gbreve;inizde olan &scedil;ey. Optimizer art&inodot;k bir duvar yerine bir müttefik ve geriye kalanlar&inodot;n ço&gbreve;u küçük, belirli, ölçülebilir i&scedil;: yava&scedil; bir yol bul, optimizer'&inodot;n neden içinden göremedi&gbreve;ini anla, yap&inodot;y&inodot; aç&inodot;&gbreve;a ç&inodot;kar, tekrar ölç. Bu commit'lerin hiçbiri egzotik de&gbreve;il. Sadece gereken yerlerde uygulan&inodot;yorlar.

Bunlardan herhangi birini denemek isterseniz:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Kaynak: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Yeterince h&inodot;zl&inodot; olmayan issue'lar, reprodüksiyonlar ve benchmark'lar: gelmeye devam etsin. Bu h&inodot;z yaln&inodot;zca hata raporlar&inodot; tek sat&inodot;rl&inodot;k reprodüksiyonlara dönü&scedil;türülecek kadar spesifik oldu&gbreve;u için çal&inodot;&scedil;&inodot;yor. Bu yaz&inodot;daki her commit'in bir nedenden dolay&inodot; ekli bir `#N`'si var.

— Ralph
