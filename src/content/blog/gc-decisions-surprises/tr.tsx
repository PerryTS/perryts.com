import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = String.raw`**Özet.** Perry, TypeScript'i yerel ikili dosyalara derliyor ve referans sayımı yerine taşınabilir, nesilsel ve kesin köklere sahip bir izleme toplayıcısı kullanıyor. GC çalışmalarının neredeyse tamamının *toplayıcının gerçekte ne yaptığını bulmak* olduğu bir ayın ardından Perry, GC ağırlıklı 19 benchmark'ın 9'unda Node'u yeniyor (başlangıçta 3'tü), referans sayımlı AOT rakibini 19'un 14'ünde geçiyor ve 19'un 15'inde Node'un 1,3 katı içinde kalıyor. Bu sırada adli kanıt bırakmayan bir hata sınıfı, hiçbir şeyi kontrol etmeyen ortam değişkenleri, yapısal olarak başarısız olamayan CI kapıları, sessizce başka bir toplayıcı göndermemize yol açan bir dokümantasyon yorumu ve kalan farkın collection'da değil nesne *layout*'unda olduğunu gösteren son bir ölçüm bulduk. Çıkardığımız dokuz kural yazının sonunda; çoğunun garbage collection ile ilgisi yok.

Perry, TypeScript'i doğrudan yerel bir çalıştırılabilir dosyaya derler: SWC parse eder, biz HIR'a lower ederiz, LLVM makine kodunu üretir ve ¤cc¤ link eder. Interpreter ya da bytecode yoktur. Yine de dilde scope'tan kaçan closure'lar, scope'larından uzun yaşayan nesneler ve referans döngüleri vardır; dolayısıyla yerel binary'nin arkasında gerçek bir çöp toplayıcı bulunmalıdır.

Bu yazı onu oluştururken verdiğimiz kararları, bizi şaşırtan şeyleri — neredeyse hepsi tatsızdı — ve bugünkü sayıları anlatıyor. Toplayıcı aylardır codebase'in en hareketli bölgesi: **1 Temmuz 2026'dan beri 201 commit ¤crates/perry-runtime/src/{gc,arena}¤ yoluna dokundu; bunların 110'u son on iki günde geldi**, 127 dosya ve yaklaşık 75 bin satır. Yayımlanmamış 572 changelog fragment'ının 135'i GC çalışmasıyla ilişkili adlar taşıyor.

Bunların neredeyse hiçbiri “bir toplayıcı implement etmek” değildi. Toplayıcımızın gerçekte ne yaptığını bulmaktı.

---

## Bölüm 1 — Seçtiklerimiz

### Referans sayımı yok

İlk soru genellikle bir AOT derleyicisinin neden yalnızca referans sayımı kullanmadığıdır. Açıkça uygun görünür: root discovery sorunu yok, safepoint yok, optimizer ile işbirliği gerekmiyor. Kendimizi ölçtüğümüz rakip AOT TypeScript derleyicisi tam olarak bunu yapıyor.

Yine de tracing collector seçtik, çünkü referans sayımı nadir durum için genel duruma bedel ödetir: her pointer store bir counter günceller, döngüler yine yedek bir tracer gerektirir ve JS hemen ölen devasa sayıda nesne ayırır — nursery'nin neredeyse bedelsiz çözdüğü tam durum. Bugün bu karar 19 GC benchmark'ının 14'ünde doğru, 5'inde yanlış görünüyor; sonda geri döneceğiz.

### Değerler NaN-boxed — ve bunun bir bölümünü geri alıyoruz

Her JS değeri tek bir 64 bit word'dür. IEEE 754'ün yaklaşık 2⁵² boş NaN kalıbını pointer, küçük integer ve singleton'ları etiketlemek için kullanır; kalan her şey sıradan bir ¤f64¤'dır:

¤¤¤
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
¤¤¤

Toplayıcı için bu mükemmel bir anlaşmadır: “bu word bir pointer mı?” sorusu mask-and-compare ile yanıtlanır; tracing sırasında değer başına type lookup yoktur. Durağan bir sayı zaten kendi IEEE bitlerini taşır, bu yüzden numeric field box ya da header maliyeti ödemez.

*Mutator* içinse V8 ile aramızdaki en büyük tek engeldir ve onu etkin biçimde kaldırıyoruz. Sorun NaN-boxed ¤double¤'ın temsillerden *biri* değil, **canonical temsil** olmasıdır. Yerel makine type'ları yalnızca bölgesel overlay'ler olarak var olur; ¤materialize_*_to_js_value¤ ailesi JS-visible her sınırda yeniden boxing yapar. Üretilen IR'da kanıtlanmış ¤i32¤ bir loop accumulator ¤alloca double¤ içinde yaşar, ¤-O3¤ sonrasında back-edge boyunca ¤phi double¤ olarak kalır ve **her iterasyonda** ¤fptosi¤ + ¤sitofp¤ gidiş dönüşünü öder. Function parametreleri tekdüze ¤double %argN¤ olduğundan sıcak bir function argümanları milyonlarca kez yeniden unbox eder; eskiden sayı hiçbir zaman pointer olamayacağı hâlde numeric local'lar bile GC root olarak kaydediliyordu.

Belirleyici ölçüm: bcryptjs'in sadakatle unroll edilmiş ¤_encipher¤ sürümü Node'da 184 ms iken 834 ms sürüyor — ve *type annotation eklemek daha da kötüleştirerek* 834'ten 2732 ms'ye çıkarıyor; çünkü okuma başına yaklaşık 80 guard ve sınırlardaki rematerialization baskın hâle geliyor. Expression seviyesinde fast path bir representation sorununu çözmez; her biri boxed canonical üzerinde başka bir overlay'dir ve unrolled kodda etkisi tersine döner.

Yönümüz (¤docs/representation-selection-rfc.md¤ ve unbox-by-default kampanyası), statik olarak kanıtlanan her değer — scalar, string, object, typed array ve closure — için unboxed native biçimi local, parameter, return ve typed heap slot boyunca uçtan uca canonical yapmak; NaN-boxing'i yalnızca kanıtlanmış polymorphic değerlere bırakmaktır. Hâlâ *varsayılan* temsildir ama *tek* temsil değildir. Faz 1, 2, 3a, 3b, 4a ve 4b merge edildi. Static Hermes bunun yapılabildiğinin kanıtıdır. AOT'ta JIT'in spekülasyon yapabildiği yerde type'ı *kanıtlamamız* gerekir; bu aynı zamanda avantajdır: kanıtlanmış kernel warmup istemez ve deopt olamaz.

Bu, GC'yi iki yönden doğrudan etkiler. Unboxing, collector'ın tarayacağı roots'u azaltır — kanıtlanmış scalar root değildir — ve yeni bir yükümlülük ekler: heap slot NaN-boxed word dışında bir şey tutuyorsa collector değerden pointer olup olmadığını anlayamaz, shape başına layout mask'e bakmalıdır. Bu mekanizma — ¤pointer_mask¤, ¤raw_f64_mask¤ ve layout notları — aşağıdaki birkaç hatayı doğurdu.

### Thread başına bir heap, paylaşım yok

Perry varsayılan olarak single-threaded'dır; ¤perry/thread¤, ¤spawn¤ ve ¤parallelMap¤ sunar ve değerler thread sınırlarını sharing ile değil deep copy (¤SerializedValue¤) ile geçer. Ergonomik bedeli gerçektir ama collector büyük bir şey kazanır: **başka thread ile hiçbir zaman senkronize olmaz.** Global safepoint protokolü, handshake ya da thread'ler arası invariant için read barrier yoktur. Her arena, root scanner ve remembered set thread-local'dır.

### Allocation dağılımı öyle söylediği için nesilsel

Thread başına iki region vardır: nursery (¤ARENA¤, 1 MB bloklar) ve old generation (¤OLD_ARENA¤); allocation başına 8 byte ¤GcHeader¤, counter yerine iki aging biti (¤HAS_SURVIVED¤ ve ¤TENURED¤) ve ¤PROMOTION_AGE = 2¤. Herhangi bir koddan önce 24 Nisan 2026'da yazılan ilk plan gerekçeyi şöyle özetledi: JS allocation'larının %90'dan fazlası kendilerini oluşturan scope içinde ölür; flat arena ömrünü açıkça ölü nesneleri tekrar tekrar mark ederek geçirir.

Plan, geri kalan her şeyin dayandığı önkoşulu da doğru belirledi:

> **Nesilsel GC kesin kökler gerektirir.**

Conservative scanner taşımayan collector için yeterlidir: false positive yalnızca ölü nesneyi bir cycle daha korur. *Moving* collector böyle çalışamaz. Roots'u kesin enumerate edemiyorsanız rewrite edemezsiniz; rewrite edemezseniz hiçbir şeyi taşıyamazsınız.

### Roots: tek analiz, iki lowering ve varsayılan LLVM statepoints

LLVM değerleri register'da tutabilir, rematerialize edebilir ve istediği yerde spill edebilir; collector bunların hiçbirini inceleyemez. Perry'nin cevabı iki katmanlıdır ve onları ayırmak gereğinden uzun sürdü.

**Analiz** — hangi local'lar GC pointer taşır ve nerede live kalmalıdır — backend'den bağımsızdır. Yanıtı üretilen koda indiren **lowering** ise bir seçimdir:

- *Shadow stack.* Girişte ¤js_shadow_frame_push(n)¤, JS-level local başına bir ¤js_shadow_slot_bind¤, çıkışta ¤js_shadow_frame_pop¤; collector heap-backed frame'i yürür.
- *RS4GC ile native stack maps.* Root alloca'lar ¤ptr addrspace(1)¤ olur, function'lar ¤gc "statepoint-example"¤ alır ve her module ¤opt -passes='function(mem2reg),rewrite-statepoints-for-gc'¤ içinden geçer. LLVM her statepoint, relocation ve sonraki kullanım rewrite'ını kendisi ekler; collection sırasında roots'u kompakt ¤__perry_gcmap¤ section'ından okuruz.

**#7370'ten beri statepoint lowering varsayılandır.** Artık ¤PERRY_RS4GC=1¤ gerekmez; ¤PERRY_RS4GC=0¤ bisection için shadow stack'e döner. Karar target-aware'dır; ¤gc_map¤, runtime'ın frame base'lerini çözemediği target için map üretmeyi reddeder — kimsenin okumadığı map sessizce roots kaybeder. Kural, runtime'ın yürüyebildiği yerde native roots, yürüyemediği yerde shadow stack'tir. aarch64/arm64 ve x86-64 statepoints; watchOS ¤arm64_32¤ ve Windows ARM64 shadow frame kullanır. Fallback “root yok” değil, aynı analizin diğer lowering'idir.

Env ayarlamadan geçişin kanıtı: 479 testlik tam gap suite'te **0 regression, 0 compile failure**; eski el yazısı bridge'in çözemediği **¤try¤ içeren 128 testin tamamı** compile edildi; 10 GC ratchet probe Node ile byte-identical kaldı; runtime −%1–2 ile biraz daha hızlı; zod'un 81 module'ünde binary +%1,86.

“Shadow stack emit ediyoruz”dan asıl üstünlüğü %1–2 değildir. Statepoint, **optimizer'ın uyması gereken relocation semantics** taşır; shadow stack ise yalnızca optimizer spill etmeyi unuttuğumuz değerle akıllıca bir şey yapmadığı sürece doğrudur. Kanıt Bölüm 3'te.

Ayrıca user code'da değil runtime'da yaşayan state için **79 kayıtlı runtime root scanner** vardır: pending promise'lar, timer callback'leri, exception state, async-context stack'leri, shape cache'leri, string intern table ve JSON scratch table'ları.

Conservative native-stack scanner da bulunur. Mimari belgemiz onu eşdeğer üç mekanizmadan biri sayar; bu metin eskidir ve bunu yazarken fark etmek öğreticiydi. Production yapılandırmasında ¤conservative_stack_scan_decision()¤, ¤SkipDisabled¤ döndürür: liveness tamamen precise map'e — statepoint ya da fallback target'ta shadow frame — ve runtime helper'larındaki ¤RuntimeHandleScope¤'a dayanır. Conservative path, özellikle allocation-point collection gibi belirli mode'lar için kalır; precise sistemin güvenlik ağı değildir.

### Tembelce arm edilen write barrier'lar

Nesilsel tehlike old→young pointer'lardır: yalnızca nursery'yi trace eden minor GC bunları bilmelidir. Codegen pointer store'larda ¤js_write_barrier¤ üretir ve runtime remembered set tutar.

#7250'nin arm invariant'ı collector'ın en yeniden kullanılabilir parçalarındandır:

> Disarmed iken barrier hiçbir şey kaydetmez. Karşılığında bir thread'de remembered set'in ilk *okunması* log'a güvenmez; old→young edge'lerin tam kümesini heap'ten yeniden kurar ve yürürken barrier'ı arm eder.

Bu yapısal olarak zorlanır: ¤remembered_dirty_snapshot()¤, ¤pub(super)¤'dır; yedi call site'ı vardır ve hepsi ¤gc/¤ içindedir.

*(Source okuyanlara: Perry'de “barrier” denen ilgisiz iki şey vardır — GC write barrier ve representation-selection pass'indeki compile-time ¤Ptr<Shape>¤ promotion barrier. Üç issue bunları karıştırarak zaman kaybetti. Her zaman dosyayı da söyleyin.)*

---

## Bölüm 2 — Sürprizler

### 1. Hiç kanıt bırakmayan hata sınıfı

Rooting invariant tek cümledir:

> Bir collection point boyunca live kalan her GC-managed değer, o point'ten önce bir root'tan erişilebilir olmalıdır. Root'tan okunup bir call boyunca SSA register'da tutulan değer **rooted değildir**: bir kopyadır ve collector kopyaları görmez.

Bunu ihlal etmek projedeki en kötü debugging deneyimini verir. Collection anında bulunacak *hiçbir şey yoktur*: dangling reference, forward edilmemiş slot ya da anomali yoktur. Sonra nursery adresi recycle eder; stale pointer başka bir geçerli nesneyi okur ve program bir veya daha fazla cycle sonra başka function'da ¤TypeError: value is not a function¤ ile ölür.

Runtime GC probe'larımızın tamamı kördür. From-space scan ve verify pass temizdir. ¤PERRY_GC_VERIFY_EVACUATION¤ erişilebilir slot'ların forward edildiğini doğrular ama varlığından habersiz olduğu register'ı doğrulayamaz.

Dağıtılmış beş ayrı biçimi katalogladık:

| # | Biçim | Review'dan neden geçti |
|---|---|---|
| #7184 | Push edilen frame'in dışındaki index'e root store emit edilmesi | ¤js_shadow_slot_bind¤ bounds-check yapıp sessizce no-op olur; IR *rooted olduğunu söyler* |
| #7192 | Allocation yapan call'dan *sonra* root store emit edilmesi | Slot hem rooted **hem** dangling olur; “rooted mı?” sorularının tümünü geçer |
| #7206 | Method receiver load edilir, sonra her biri allocate edebilen arguments lower edilir ve en son kullanılır | Load tek başına açıkça doğru görünür |
| #7206 | ¤base[key]¤: base materialize edilir, key expression lower edilir, stale base kullanılır | İki operand; biri önce değerlendirilir, son kullanılır |
| #7226/#7239 | Thread-local ya da static cell, hiçbir scanner'ın rewrite etmediği heap pointer saklar | IR'da görünmez |

Dördü **tek bir günde dağıtıldı**. Her fix birkaç satırdı; maliyet her zaman detection lag'di. Yalnız ilki shadow stack'e özgüdür. Diğerleri lowering'den bağımsızdır ve statepoints geçişinden değişmeden kurtuldu; hata root'un ne olduğunda değil, *lowering'in root'u ne zaman emit ettiğindedir*.

Gerçekten yararlı tek heuristic: **kusursuz reproduce edilen GC hatası register değil table demektir.** Unrooted register ancak collection penceresine düşerse bozulur, dolayısıyla intermittent'tır; unrooted cache collection #0'da bozulur ve bozuk kalır. Tek bilinen istisna heap ¤StringHeader¤'ından borrow edilen ¤&str¤ veya ¤&[u8]¤'ın allocation yapan call boyunca tutulmasıdır. Rooting *slot*'u rewrite eder; borrow slot değildir. Tek sound fix ilk allocation'dan önce byte'ları heap dışına kopyalamaktır.

### 2. İncelemeyi bırakıp araç yapmaya başladık

#7154'te dönüm noktası fix değil, on investigation turundan sonra inspection'dan vazgeçip hatayı anında fault'a çeviren araçlar yapmaktı.

**From-space quarantine.** Evacuating minor sonrasında from-space'i recycle etmeyiz. Eski blokları sınırlı bir ring'e ayırır, ilk byte'ı geçersiz ¤obj_type¤ (¤0xDE¤) görünen poison word ile doldurur ve page-aligned iç bölgeyi ¤mprotect(PROT_NONE)¤ yaparız. Stale dereference artık holder stack'teyken *hatalı instruction'da* SIGSEGV olur. Reporter adresi, page'i hangi minor'ın retire ettiğini ve orada eskiden hangi nesnenin yaşadığını söyler; sonra ¤SIG_DFL¤'ı geri yükleyip yeniden fault ederek debugger'a gerçek noktayı gösterir.

**GC zeal.** Her safepoint'te evacuating minor zorlayarak unrooted değerin, ilgisiz allocation burst'ünün pencereye denk gelmesini beklemek yerine ilk exposure'da taşınmasını sağlar. V8'in ¤--stress-scavenge¤ ve SpiderMonkey'in ¤gcZeal¤'ından esinlenir.

**Kimsenin beklemediği depth knob.** Quarantine varsayılan 4 olan *N* retired page-set'lik ring'dir. #7154'ün ¤new C(…)¤ reproducer'ı depth 4, 8 ya da 100'de fault etmez; constructor yaklaşık 600 back-edge poll geçer ve return override caller'ın stale register'ını yayımladığında page 600 retirement yaşındadır. ¤PERRY_GC_PROTECT_FROMSPACE_DEPTH=800¤ ile ilk kullanımda fault eder. Şüpheli hata reproduce olmuyorsa ilk tavsiye artık “depth'i artır”dır.

Araçlar yalnızca çalıştırılmaz, **sabotage-test edilir**: ¤quarantine_catches_a_planted_stale_from_space_deref¤ #7184/#7192 biçimini eker ve instrumentsız control tamamen geçerli recycled object okurken instrument'ın poison gördüğünü şart koşar. Control, hatanın araç olmadan gerçekten görünmez olduğunu kanıtlar.

Statik araç ¤scripts/gc_root_dominance_check.py¤ üretilen LLVM IR'ı okuyup root store'ların sonraki collect edebilir noktaları dominate ettiğini doğrular. CI gate'in allowlist'i **boştur**; yeni hit build'i kırmızı yapar. Yine de runtime table'lara, runtime Rust'taki unrooted local'lara ve adını bilmediği symbol'lara yapısal olarak kördür; temiz rapor iki kez denetleyemeyeceği bir şeyin kanıtı sayıldığı için bunu açıkça yazarız.

### 3. Knob'larımızın yarısı hiçbir şeyi gate etmiyordu

Bu sürpriz koddan çok mühendislik politikasını değiştirdi.

Aylarca ¤PERRY_GEN_GC_EVACUATE¤ değişikliğin evacuation altında güvenli olduğunu kanıtlama knob'uydu. Nihayet doğru ölçtüğümüzde — aynı binary, aynı host, 12 ratchet probe × 8 counter üzerinde cell-by-cell diff — **96 cell'in 0'ını** oynattı. Median'lar bit-identical. Aynı yöntem ¤PERRY_GEN_GC=0¤ ile 79 cell oynattı; harness duyarlıydı, bu knob değildi. Counter'ların hiç gelmediği bir fallback path'i gate ediyordu.

Tek canlı etkisi footgun'dı: forced evacuation'ı veto ediyordu; ortamda ¤PERRY_GEN_GC_EVACUATE=0¤ bulunması ¤PERRY_GC_ZEAL¤'ı sessizce disarm ediyor ve hiçbir şey taşımayan zeal run “clean” diyebiliyordu.

Yalnız değildi:

- ¤PERRY_GC_FORCE_EVACUATE¤ **yalnızca minor path'te** okunuyordu; onu kullanan tüm tests ¤gc()¤ çağırıyor, bu da forced conservative scan arkasından full mark-sweep yapıyordu. Aylarca “forced evacuation altında geçiyor” hiçbir şey ifade etmedi.
- Stress matrix'in ¤--pressure¤ knob'u ölçtüğü path'i kapatıyordu: defer hard cap ile arena trigger ceiling aynı formülü kullanıp birlikte çöküyor, ¤default¤ arm 22 satırın tamamında sıfır copying minor çalıştırıyordu.
- ¤PERRY_GC_FROMSPACE_SCAN_ABORT=1¤ tek başına tamamen inert'tı: scan çalışmıyor, hiçbir şey abort olmuyor, run başarı bildiriyordu.
- ¤gc_incremental_enabled¤ doc comment'i “EXPERIMENTAL — default OFF”, sekiz satır aşağıdaki body comment “DEFAULT ON” diyordu. Merge kararı yanlış olana göre verildi.

Sonuç politikası ¤CLAUDE.md¤ içinde bağlayıcıdır:

> **Her GC env knob'u ya OFF durumunu çalıştıran required CI arm'a sahiptir ya da bir release soak sonrasında silinir.** Aynı anda en fazla bir diagnostic-only knob bulunabilir ve untested olarak etiketlenmelidir.
>
> **Hâlâ var olan mode, henüz verilmemiş bir karardır.**

¤PERRY_GEN_GC_EVACUATE¤ düzeltilmedi, silindi. Her deletion site, orada ne olduğunu ve neden gittiğini anlatan tombstone comment saklar — birinin conjunction'ı yeniden ekleyeceği tam beş satır. CI audit kabul edilen knob adlarını uncommented production parser'lardan türetir, silinen knob hakkındaki canlı claim'de fail eder; self-test commented parser arkasına silinmiş knob ekip hiçbirinin geçemediğini kanıtlar.

### 4. Başarısız olamayan kapılar

¤CLAUDE.md¤ bir CI gate'in merge'i yapısal olarak kırmızıya çeviremediği dört yolu listeler. Dördü de bu repo'yu vurdu, üçü aynı hafta:

1. ¤continue-on-error: true¤ — ¤gc-stress¤, GC correctness'i kapsayan tek job iken aylarca bunu taşıdı.
2. Branch protection'ın required context'lerinde olmamak — block etmeden failure bildiren job gate değil documentation'dır.
3. Koşulsuz ¤cancel-in-progress¤ ile ¤concurrency¤ — yavaş runner queue'da her yeni merge, önceki run'ı runner'a ulaşmadan iptal eder. ¤gc-ratchet¤ art arda üç ¤main¤ run'ı iptal, sıfır execution gördü.
4. **Gate çalışır ama subject hiç çalışmaz** — gerçekten green olduğu için en tehlikelisi.

Sonra iki tane daha bulduk. ¤gc-stress¤, ¤main¤ üzerinde *hiç çalışmamıştı*: workflow'un ¤push:¤ trigger'ı yalnız tag'ler içindi ve job'ın ¤if:¤ koşulu ¤schedule¤'ı atlıyordu; 12 nightly'nin 12'si ¤skipped¤. Required context olan ¤lint¤ ise 2000 satır sınırını geçen 16 dosya yüzünden üçten fazla nightly'dir kırmızıydı; yani repo'daki her merge admin bypass ile iniyordu. Branch protection tiyatroydu ve ¤lint¤ içine bağlanan doğru yeni gate daha geldiği gün inert olacaktı.

Tekrar tekrar öğrendiğimiz sonuç: **gate yalnız hiçbir şey throw etmediğini değil, subject'in live olduğunu assert etmelidir.** Zeal run'larımız çıkışta ¤forced_collections=… copying_minors=… moved_objects=… loop_polls=…¤ yazar ve **bunlardan biri sıfırsa exit 70** verir; hiçbir şey exercise etmeyen run green değil red olur.

### 5. Collector ona yardım edemeyecek collection'ları schedule etmeye devam etti

Tekrarlanan yapısal hata, üç bağımsız örnek, tek biçim: *predicate, okuduğu niceliği değiştiremeyen bir collection schedule eder.*

**Survivor-promotion handoff (#7592).** Predicate, promote edilmek üzere olan survivor'lara old-gen'de yer açmak için minor'ı full mark-sweep ile değiştirdi. Ama full mark-sweep non-moving'dir — hiçbir şeyi promote etmez — dolayısıyla onu schedule eden pressure'ı azaltamaz ve sonraki minor'da yeniden true olur. 200k record'luk JSON pipeline ölçümü: **22 collection'ın 19'u bu full'lerdi; her biri yaklaşık 400 ms'de 0.0 MB free etti.** 8.6 s'lik phase'in 7.6 s'si. Asıl promotion'ı yapacak copying minor hiç çalışmadı.

**Nursery cap (#7690).** From-space occupancy'ye bağlı cap, yerinde sweep edip from-space'i dolu bırakan *non-moving* minor'a uygulanıyordu. Capped trigger non-moving minor çalıştırınca bir sonraki blokta yine due olur: ayrılan her 1 MB için bir whole-arena collection ve live set'e göre quadratic maliyet.

**Fixed point olan live-proportional cap.** Nursery cap'i live set'e uydurmak için ¤max(base, arena_in_use)¤ kullanıldı. Fakat due test *from-space occupancy* ile cap'i karşılaştırıyor ve workload'da from-space ≈ live olduğundan from-space kendi cap'ini aşamıyordu; scavenging tamamen durdu. Hiç iş yapmayarak 5,9× kazanç ölçtü.

Pacing kodumuzun taşıyıcı iki kuralı:

> **Bir collection'ı, o collection'ın değiştiremeyeceği bir nicelikle pace etmeyin.**
>
> **Cycle başı maliyeti O(live) olan collector'ı sabit bir bantla pace etmeyin.** Toplam iş live set'e göre quadratic olur; daha büyük constant yalnız uçurumu taşır.

Bu family'yi düzeltmek bir JSON workload'ını **60,4 s'den 3,86 s'ye** indirdi; per-record cost, daha önce 70× büyüdüğü 20× boyut aralığında yaklaşık %30 içinde düz kaldı.

### 6. Bir keresinde collector hiç yapmadığı değişikliği belgeledi

Bu hikâyedeki en pahalı tek satır bir doc comment'tir.

#7690 moving-loop back-edge poll'larını varsayılan açmanın tüm gerekçesini iki doc comment'e — runtime ve codegen — yazdı ama **iki body'yi de değiştirmedi.** İkisi hâlâ yalnız ¤1|on|true¤ ile eşleşiyor, yani default OFF; hiçbir test default'u pin etmiyordu. Runtime comment'i “codegen mirror'ı MUTLAKA aynı olmalı” bile diyordu; aynıydılar, ama belgenin artık kullanılmadığını söylediği değerde.

Bu yalnızca daha yavaş config değil, farklı bir collector'dır. Nursery pressure'ın tam iki precise collection point'i vardır: loop back-edge poll ve en dış microtask-pump boundary. Poll üretilmeyince compute-only program ikisine de ulaşmaz. Her nursery collection allocation point'e düşer; önceki bir fix burada collection'ı doğru biçimde non-moving yapmıştı. **Dağıtılan collector'da nursery evacuation hiç yoktu** ve whole-arena full collection'a düşüyordu.

| bench | dağıtılan ¤main¤ | polls gerçekten açık |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

Bir benchmark, birkaç hafta önce **105 copying minor (0.016 s)** yaptığı yerde **13 whole-arena full collection (0.477 s pause)** yaptı. ¤tree¤ toplam GC pause 4.107 s → 0.550 s; max pause 266 ms → 16 ms. Bunu bulan diagnostic wall time değil, ¤PERRY_GC_TRACE=1¤ içindeki cycle *türleri*ydi: beklenen ¤{'minor': 105}¤ yerine ¤{'full': 13}¤.

Artık tanınmayan değer arm'ı dahil üç test default'u, üçüncü bir test de iki crate'in aynı olduğunu pin ediyor; anlaşmazlık her iki yönde de sessizdir — kimsenin tüketmediği poll veya kimsenin drain etmediği deferral — bu yüzden aynı olduklarını iddia eden iki comment değil assertion gerekir.

Sınıf kapanmış değil. Son profiling turu write barrier'da aynı biçimi buldu: **codegen barrier-active counter için ¤seq_cst¤ load emit ediyor — aarch64'te ¤ldar¤, ¤evalNode¤ içinde 42 site — runtime ise aynı global'ı aynı karar için ¤Relaxed¤ okuyor**; codegen doc comment'i de “bir ¤static¤'ten tek relaxed load” diyor. Tek global'ın iki okuyucusu ordering konusunda anlaşmıyor ve belge kodun karşı tarafını tutuyor. En fazla biri doğru; runtime yanlışsa hata ¤ldar¤'dan çok daha ciddi. Tahmin etmek missed insertion barrier üreteceğinden — collection anında sessiz kalıp cycle'lar sonra ¤TypeError: value is not a function¤ olarak çıkar — dosyalandı, bilerek düzeltilmedi.

### 7. En hızlı GC işi sildiğiniz iştir

Pacing hataları çıkınca kalan maliyet tekrar tekrar hiç var olmaması gereken iş çıktı.

**Hiçbir şeyin ölmediği heap tekrar tekrar mark ediliyordu.** ¤retain.ts¤ 3M record'luk array oluşturur ve hiçbirini bırakmaz. Perry 1.31 s'lik run'ın **1.26 s'sini collector'da** geçiriyordu — %96; Node 0.13 s. İki full mark-sweep toplam 4 MB reclaim etti, biri arena occupancy'yi tam sıfır oynattı; growth temelli escalation predicate büyüyen live set her ikiye katlandığında threshold geçiyordu. Fix: full'ü reclaim ettiği şeyle fiyatlandır ve verimsiz full'den sonra threshold'u uzağa taşı.

**Her evacuate edilen nesne boş map'i hash etmek için process-global mutex alıyordu.** Move hook, hiç re-prototype etmeyen programda boş olan residual ¤Object.setPrototypeOf¤ registry'sinde SipHash ¤remove¤ yapıyordu. Bunu söyleyen latch zaten vardı; move hook onu atlayan tek reader'dı. 3M-record promotion hiçbir şey için 2.5M gerçek mutex acquisition ödedi.

**Sonra nesneleri taşımayı bıraktık.** Copying minor nursery'si neredeyse tamamen live ise object-by-object evacuation saf overhead'dir: yeni old-gen allocation, ¤memcpy¤, layout transfer, accounting, move hooks, forwarding stub ve tüm referring slot'ların rewrite'ı. Whole-block in-place promotion — V8'de page promotion — yalnız generation label değiştirir; hiçbir şey taşınmaz ve rewrite gerekmez:

| workload | önce | sonra |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**Sonra onları trace etmeyi de bıraktık.** Üç pass hâlâ her survivor'ı yürüyordu: remembered-set dirty scan mark ediyor, drain yeniden dokunuyor, ¤clear_marks¤ üçüncü kez dokunuyordu. Hiçbir şeyin taşınmadığı ya da free edilemediği cycle'da trace object başına ~55–67 ns, gerçek promotion walk'u ~9 ns idi. Promoting cycle artık son measured survival ratio fully-live rejimindeyken trace'i atlıyor; ancak assumption'larından biri maliyetliyse açıkça reddediyor: kayıtlı weak-target holder, boş olmayan malloc registry, sürmekte olan incremental mark veya üç verify instrument'tan biri armed ise — her biri trace'i subject olarak kullanıyor ve marks üretmeyen cycle hiçbir şey incelemeden başarı bildirebilir. ¤retain¤ −%33,6, ¤deeplist¤ −%43; 243 ns/object olan cycle **8,9 ns** oldu.

Politika tahmin değil *ölçüm*dür. Block liveness trace öncesinde bilinemez; karar önceki cycle'ın measured young-survival ratio'suna göre verilir. Dağılım üç büyüklük mertebesiyle bimodal çıktı:

| workload family | copying minors | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *hiç copying minor çalışmaz* |

Yanlış tahmin bir nursery'nin en fazla birkaç yüzdesini tutar; promoting cycle kendini ölçecek kadar sık trace eder ve promoted dead bytes üzerindeki running cap steady state'i sınırlar.

Açıkça söyleyelim: **“tek mekanizma” hikâyesi genellikle yanlıştır ve profil ayağınızın altında değişir.** Aşağıdaki sıralamayla aynı commit'te ölçülen bugünkü pause fraction'lar:

| program | wall | GC pause | pause fraction | cycles |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

İki sayı bir hafta önce %93 ve %62 idi; bu bölümdeki iş onları öldürdü. ¤shapes¤ %7 ile artık GC benchmark'ı değildir — §8'deki hatadan önce 139 ms programın 94 ms'si GC idi ve bu ratio ile “high-survival GC” diye sınıflandırdık. GC lever'ları onu artık oynatmaz. Benchmark'lar arasında aynı görünen oran ortak neden değil aritmetik tesadüftü.

### 7b. “Sıfır cycle”, “GC maliyeti yok” değildir — sonuç sandığımız counter

¤asyncpipe¤ satırı 0 cycle'da 0 ms pause diyor ve içeride “pure mutator; her GC lever ilgisiz” yazdık. Tam bu premise ile başlayan profiling turu onu çürüttü.

¤asyncpipe¤ hiç ¤[gc]¤ satırı yazmaz ama **leaf profile'ın yaklaşık %33'ü yine collector machinery'dir**: write barriers, object başına layout side table'ları ve ¤RuntimeHandleScope¤ rooting. Moving-loop back-edge poll'larını kapatmak, program hâlâ sıfır GC cycle çalıştırırken **−%14,1** ölçer: old-generation incremental mark/sweep bu poll'larda ilerler, cycle tamamlamaz ve raporlamaz. Turun en büyük lever'ı buydu, verdiğimiz premise profiler'ı ters yöne gönderdi. (¤PERRY_WRITE_BARRIERS=0¤ burada +%0,9; codegen barrier'lar suçsuz, incremental drive değil.)

> **Cycle counter collection'ları ölçer, collector maliyetini değil.**

Barrier, side-table bakımı, rooting ve incremental slice'lar mutator tarafındadır ve per-cycle trace'te yapısal olarak görünmez. ¤0 cycles¤ sonuç gibi görünür ama yalnızca bir mekanizmayı gözler.

İlgili tuzak: ¤asyncpipe_big.ts¤ geçerli bir scaled version **değildir**. 120 batch'te sıfır cycle, 240'ta iki copying minor, 1200'de GC baskındır. Timing noise'u aşmak için scale etmek sessizce başka benchmark oluşturdu; §9'daki boş “realistic” variant'larla aynı biçim. Yalnız incelenen özelliğin scale boyunca yaşadığını doğruladığımız için yakalandı.

### 8. Eşiğin on altı byte üstü

Kampanyanın en iyi tek hatası. ¤shapes¤, 139 ms run'ın 94 ms'sini iki minor collection'da harcıyor; gerçek live set yaklaşık 3200 object iken 739‰ ve 925‰ survival ratio bildiriyordu.

¤arena_alloc_gc¤, ¤LARGE_OBJECT_THRESHOLD_BYTES¤ — 16 KB — üstündeki her şeyi doğrudan old-gen'de oluşturup ¤TENURED¤ işaretler. 2000 element'lik ¤Node2D[]¤ backing store 16.400 byte'tır. **Eşiğin on altı byte üstü.**

Her array sonsuza kadar live kalıyordu — minor old-gen'i sweep etmez —, write barrier her store için old→young edge'i doğru kaydediyor ve her sonraki minor 2000'ini yeniden mark ediyordu: 94.000, sonra 118.006 slot.

“Eşiği yükseltmek” yanlış olacağı için fix ilginçtir. Eşiği geçmek *copy cost* ile *retention cost* arasında değiş tokuştur. Pointer-free object'te ikisi de boyutla sınırlıdır, dolayısıyla 16 KB kalır. Pointer taşıyanda retention transitive ve sınırsızdır; array, object ve closure 128 KB alır — V8'in ¤kMaxRegularHeapObjectSize¤'ı aynı çizgiyi aynı nedenle çizer. Seçim type listesi değil mevcut ¤pointer_free¤ flag'ini okur; unknown type conservative değerde kalır.

¤shapes¤ bu turda 0.139 s → 0.061 s oldu — son sweep'te 0.058 s ve Node'dan **1,39× hızlı** —, peak RSS 71.4 MB → 32.3 MB. Diğer 18 program ±%1,3 içinde kaldı.

### 9. Ölçmek düzeltmekten zordu

Kendinden emin yanlış sonuçlar üreten şeylerin kısmi listesi:

- **Bozuk ¤main¤'e karşı benchmark.** Surprise #6 nedeniyle allocation-heavy programlar günlerce ~20× yavaştı ve A/B anlamsızdı. Load-independent imza 105 → 1304 collection'dı; süreler yalnız *kötü*, saçma görünmediği için kimse bakmadı.
- **Auto-optimize relink runtime'ı ¤--no-default-features¤ ile yeniden kuruyor**, ¤diagnostics¤'i sessizce kaldırıyordu. ¤PERRY_GC_TRACE¤ yazmıyor, cycle sayısı **0** görünüyordu. Bir investigation üç arm için “sıfır collection” sonucuna vardı.
- **Başka host'a ve otuz revision geriye pin edilmiş ratchet baseline** aslında drift olan 29 “regression” bildirdi. İki arm'ı aynı makinede arka arkaya ölçün.
- **Pretenuring 108 MB → 0 kazancı confound'dı**: baseline arm ara değişiklikten önceydi. Mekanizma doğru, target yanlış — codegen-visible literal değil runtime'ın allocate ettiği parse tree — ve tavan yaklaşık 1 MB.
- **Haftalarca crash eden programı zamanladık.** Rakip binary ¤deeplist¤'te doğru yanıtı yazıp recursive refcount drop sırasında −11 (SIGSEGV) ile çıktı; bunu yenilgi yazdık. Artık her harness cell başına exit code saklar.
- **¤grep -c¤ sıfır match'te exit 1 verir**, ¤&&¤ zincirlerini keser. ¤PERRY_GC_TRACE¤ pipe'ı da SIGPIPE ile 141 vermişti.

Ayakta kalan kurallar: saate değil load-independent census counter'a atıf yapın; timing'den önce *binary'leri* karşılaştırın; karşılaştırmanın gerçekten bir şey karşılaştırdığını assert edin; iddia edilen arm'ın live olduğunu doğrulayın.

---

## Bölüm 3 — İki uzun yol

### Statepoints: dört ay ve üç önkoşuldan sonra seçilen yol

LLVM'in ¤gc.statepoint¤'i ilk prototipten beri correctness açısından açıkça üstündü. **Optimizer'ın uyması gereken relocation semantics** sunar; shadow stack ise yalnızca optimizer spill etmeyi unuttuğunuz değerle akıllıca bir şey yapmazsa doğrudur. İlginç olan “açıkça daha iyi” ile “varsayılan dağıtıldı” arasındaki her şeydir; gecikmenin hiçbiri performance yüzünden değildi.

**GC olmayan şeyler tarafından engellendi.** Exception'lar ¤setjmp¤/¤longjmp¤'a lower ediliyordu ve ¤longjmp¤ bir ¤gc.relocate¤'in *ötesine* atlayarak relocated pointer'ın geri yazılmasını önleyebilir. RS4GC'de daha kötüdür: ¤mem2reg¤, setjmp correctness için gerekli volatile alloca'ları promote etmez; try-region roots SSA'ya hiç girmez ve relocate edilmez. ¤gc.statepoint¤ tam bu yüzden invoke formuna sahiptir. Statepoints yolu Perry'nin tüm setjmp exception lowering'ini silip invoke/landingpad ile değiştirmekten (#7302/#7305) ve pass pipeline'ı kontrol etmek için LLVM'i in-process taşımaktan (#7301) geçti. Hiçbiri GC ticket'ı değildi.

**Cazip uzlaşma tuzaktı.** “¤try¤ function'larında shadow stack'i tut” iki root mekanizmasını sonsuza kadar donduracaktı. “Shadow stack'i sil, statepoints'i tut” da *ifade edilemiyordu*; statepoints bağımsız mekanizma değil shadow stack root-set analysis'inin alternatif lowering'idir. Predicate'i ayırmak (#7340) target başına default'u ve gelecekteki deletion'ı mümkün kıldı; daha önce ¤PERRY_SHADOW_STACK=0¤ + statepoints, **hiç precise root'u olmayan**, ¤__perry_gcmap¤ section'ı bulunmayan, collection canlı şeyi free edene dek iyi build'den ayırt edilemeyen doğru çıktılı binary üretiyordu.

**İki backend'den biri ölmeliydi.** Bir süre RS4GC yanında el yazısı statepoint bridge taşıdık. Peer değillerdi: bridge bir ¤invoke¤'u root edemiyor ve try-carrying function'ı reddediyordu; ayrıca RS4GC'nin sessiz fallback'iydi, tam knob kill-policy'nin önlediği untested configuration biçimi. Silmeden önce ölçtük: **gerçek bir Drizzle app ve ratchet probe'lardaki 1.574 function'ın tamamı RS4GC olarak lower edildi, hiçbiri fallback yapmadı.** Bridge, CFG liveness analysis, call parser, emitter, ¤PreciseRootBackend¤ enum'u ve ¤PERRY_STATEPOINTS¤ knob'u gitti. Artık bail, downgrade değil function adını veren hard failure'dır.

**Sonra default coverage olmadan dağıtıldı.** Native roots aylardır her walkable target'ta default iken **dokuz root-lowering mechanic'in Perry'nin gerçekten emit ettiği lowering'e karşı sıfır assertion'ı vardı**; coverage görünen üç test hiçbir şey ölçmüyordu: ¤js_shadow_slot_bind¤'ın *yokluğunu* assert ediyordu, native default'ta rooted olsun olmasın her programda doğru. Hazard 4, görevi roots'u sessizce kaybetmemek olan sistemde yeniden. #7653 üç vantage ekledi — ¤opt¤ öncesi IR, RS4GC sonrası ¤"gc-live"¤ bundle'ları, decoded ¤__perry_gcmap¤ blob — çünkü her biri bir sonrakinin gördüğüne kördür. Static root-dominance checker da ¤@js_shadow_slot_bind¤'a anchor oluyor ve corpus'u ¤PERRY_RS4GC=0¤ ile compile ediyordu; #7663 statepoints'i öğretene dek dağıtmadığımız lowering'i kontrol ediyordu.

Ölçülmüş negatif sonuçtan bir design law çıktı: **relocation semantics olmadan root metadata optimizing compiler altında unsound'dur.** Kompakt per-function metadata 10–13× küçük map verdi ve 10 satırlık churn loop'u deterministic bozdu; map yanlış olduğu için değil, mutator yalnız relocation'ın düzeltebileceği heap-derived stale SSA value üzerinden from-space okuduğu için. Barrier memory ordering'i sınırlar; dataflow'u değil.

### Unboxing: sürüyor ve artık ana olay

Diğer uzun yol Bölüm 1'den: unboxed native representation'ı canonical yapıp NaN-boxing'i polymorphic fallback'e düşürmek. Faz 1 (scalar locals), 2 (specialised ABI), 3a/3b (strings ve ¤Ptr<Shape>¤ pointer locals), 4a/4b (typed heap: numeric arrays ve boxed layout'ın gereksiz bookkeeping'i) merge edildi.

İki şeyi dürüstçe bildirmek gerekir.

**Bir alt faz değerlendirildi ve reddedildi; nedeni NaN-boxing'e iltifattır.** Unboxed *object fields* — Faz 4b'nin ilk başlığı — keşiften sonra inşa edilmeden scope dışı bırakıldı. ¤number¤ field slot zaten raw IEEE bits tutar; NaN-boxing yalnız ¤0x7FF9..=0x7FFF¤ ayırdığı için layout'ın ¤raw_f64_mask¤'i storage değişimi değil *proof bit*'idir ve read-side guard zaten gitmiştir. Raw string handle short string'leri boşuna heap-materialize ederek small-string optimisation'ı kırar. Raw ¤i1¤/¤i32¤ slot ise üçüncü mask ve ¤JSON.stringify¤, ¤util.inspect¤, ¤v8¤ serde dahil yaklaşık 25 doğrudan slot-read site'ında layout probe ister — varsayılanın aksine hot path'ler. Bunun yerine elision dağıtıldı: kanıtlanmış receiver'a field store, değer yapısı gereği non-pointer ise layout note'u; heap string olamazsa string addref'i emekli eder.

**GC kampanyaya sonraki hedefi verdi.** Bölüm 4'ün son ölçümü en zor cluster'da collector'ın artık binding constraint olmadığını gösterir: mutator'dır ve özellikle **iki field'lı object literal 72 byte tutar**. RFC anlamında tam representation problemidir ve “actual objects” bundan sonra buraya gider.

### Seçilmeyen yollar

**Concurrency.** Sahibin doğrudan sorulduğunda verdiği talimat:

> “Sırf olsun diye parallelism/concurrency peşinde koşmak istemiyorum. Yapılması gereken iş için daha sonraki çare olmalı, hot path pahasına değil.”

Bu kısıt design'ı ertelemez, *karar verir*. Üç family mutator'dan nerede ücret aldığıyla ayrılır: parallel stop-the-world hiçbir şey almaz (GC thread'leri yalnız pause içinde yaşar); concurrent marking her pointer write'a store barrier; concurrent compaction her pointer read'e **load barrier** koyar. Load'lar store'lardan çok daha fazladır, sonuncusu en kesin hayırdır. Parallel STW tek kabul edilebilir design'dır ve (1) var olmaması gereken per-object işi silmek ile (2) immortal cohort'u pretenure etmekten sonra üçüncü sıradadır. Olmaması gereken 2.1M object visit'i paralelleştirmek dört core ile yanlış işi hızlandırmaktır.

Ölçüm bağımsız ve daha güçlü biçimde aynı sonucu verdi. §7 sonrasında en kötü promotion case'teki visits'in yarısı sildiğimiz iş, diğer yarısı **159 ms programın 9,6 ms'si** oldu. Paralelleştirmeye değecek collector zamanı kalmadı; GC işinde 2×, programda %3'tür. Parallel GC ertelenmiş plan değil, bu workload set'inde ölçülmüş non-lever'dır.

Correctness gerekçesi performance'tan daha önemlidir: bugün “kusursuz reproduce edilen GC hatası table demektir, register değil” gerçek bir diagnostic'tir. Parallel collector bunu yok eder ve 79 root scanner ile her ¤thread_local!¤ cache'i potansiyel data race yapar.

**Old-page defragmentation — varsayılan açık dağıtıldı ve aynı gün geri alındı.** Kısmen live old page'leri compact etmek, 2026-07'de taşınmış old object'e stale non-heap reference'ı 6/6 bozan hatadan beri kapalıydı. Yeniden açma env flip değil *rewrite-contract projesi* olarak izlendi; acceptance bar her movable old address tutabilen metadata/IC/cache path'ini enumerate etmek ve **“reproducer ile dependency-scale stress corpus temiz olmadan defrag'ı açmamak”** idi.

Contract work iyi merge edildi: static root-dominance allowlist hâlâ boş, yani yaklaşık 40 eski exemption gerçekten düzeltildi; runtime holder policy sıkılaştırılarak ¤open_gap¤ ve ¤unverified¤ doğrudan fail oldu; güvenliği “yalnız old-gen defrag bunları taşıyabilir”e dayanan iki cache exempt edilmek yerine düzeltildi; silinen exemption'ın ¤becomes_real_when¤ tripwire'ı bu trigger'ı adıyla söylüyordu.

Ama **default flip** kanıtsız geldi; suite'imizden yapısal olarak kanıt alamaz. Selection old page'de ¤dead_bytes >= live_bytes¤, yani scale'de promote-then-die ister. ¤retain¤ family 999–1000‰ yaşar, ¤churn¤ neredeyse hiçbir şeyi promote etmez; **sahip olduğumuz hiçbir benchmark candidate page üretemez.** Suite fayda ya da regression sinyali veremez ama tüm old-address rewrite surface'i taşır; merge anında tüm GC gate'leri queued ve çalışmamıştı.

Correctness işinin tamamını tuttuk ve gerçekten exercise eden fragmentation workload gelene kadar default'u opt-in yaptık; gelince kaybeden arm ayakta bırakılmayacak, silinecek. Yeni kural:

> **Benchmark suite'inizin trigger edemediği feature, suite'inizin savunamadığı feature'dır.** Bunu yapabilen workload gelene kadar default OFF gönderin ya da iki arm'ın da untested olduğunu kabul edin.

**Pretenuring.** İki kez yapıldı, ölçüldü, çürütüldü ve yazılı reopen koşuluyla park edildi. Mimari olarak doğru şey — uzun ömürlü object'i old-gen'de doğurmak — emergent biçimde yeterli şeye — her cohort'u tek sıçrayışa sınırlayan promote-on-first-copy seed — kaybetti. Kurulabilir her load'da arm'lar ayırt edilemedi. Meta-ders doğrudan pratiğe girdi: **invariant'ı kurmadan önce discriminating shape'i test edin.**

---

## Bölüm 4 — Nasıl gidiyor

12 Ağustos 2026 kapanış sweep'i; sessiz ve pin edilmiş M1 mini, best-of-5, exit-checked, timing öncesi output ¤node --experimental-strip-types¤ ile byte-verified. Node 26.5.1 ve referans sayımlı AOT rakibine karşı 19 GC biçimli benchmark.

**Perry 19'un 9'unda Node'u yeniyor** (tur başında 3'tü), **19'un 14'ünde referans sayımlı compiler'ı yeniyor** ve **19'un 15'inde Node'un 1,3× içinde.**

| bench | perry | node | P/node | Δ bu tur |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

Geriye **ayrık** iki cluster kalır; tek mekanizma saymak daha önce yaptığımız bir hatadır:

1. **Node'a karşı — dispatch ve mutator, çoğunlukla GC değil.** ¤iso_miss¤, ¤interp¤, ¤pipeline¤, ¤asyncpipe¤. Büyük ölçüde polymorphic property dispatch, inline cache ve representation selection; başka kampanya. Ancak ¤asyncpipe¤'ın %0'ını “burada GC yok” diye okumadan aşağıdaki düzeltmeye bakın.
2. **Referans sayımlı compiler'a karşı — ¤retain¤ family.** ¤retain1¤ 1,80×, ¤retain_wide1¤ 1,67×, ¤retain_wide¤ 1,65×. Hepsi Node'u yeniyor. Hiçbir şeyin ölmediği satırlar; tracing collector'ın en kötü olmasını beklediğimiz tam yer — beklenti ilginç biçimde yanlış.

Kapanış sweep'inin tüm kampanyayı yeniden çerçeveleyen bulgusu: **ikinci cluster'da collector artık binding constraint değil — mutator.** *Tüm* GC pause'u çıkarın; ¤retain_wide¤ (130,8 ms saf mutator) ve ¤shapes¤ (60,2 ms) yine kaybeder. ¤retain¤ ancak GC tam sıfırsa parity'ye gelir. Gerçek maliyet **iki field'lı object literal'ın 72 byte tutmasıdır**; ¤retain¤, **48 MB sayı saklamak için 216 MB memory yazar** — 4,5× write amplification. Rakibin avantajı refcount değil compactness'tı. Bu artık collector değil representation problemidir (#7916): Bölüm 1'in unbox-by-default kampanyası scalar yerine object layout'a yöneliyor.

Diğer cluster'da eşleşen kusur: ¤asyncpipe¤ object başına 1.200–1.650 ns'de collect ediyor; içinde **sıfır object işleyen 122 ms minor collection** var — tüm programdan uzun. Object count'tan bağımsız per-cycle cost fixed overhead'dir ve collector'ın critical path'te görünen son parçasıdır (#7915).

Bariz sonraki hamle olduğu için deneyip negatif sonuç olarak kaydettiğimiz şey: **ilk nursery'yi küçültmeyin.** Cycle 0, retain family GC pause'unun %58–81'idir; cap bedava görünür, 2 MB'de ¤retain¤ pause 52 → 31 ms olur. Ama ¤asyncpipe¤ 0 collection'dan 4'e çıkarak 127 ms programda 385 ms harcar ve erken promotion old-gen trigger'ı ekstra full mark-sweep'lere taşır (¤retain_wide1¤ +%182).

Başlangıç ölçeği: kampanyayı açan JSON pipeline 60,4 s → 3,86 s oldu. ¤retain¤ family bu işin tek turunda %36–46 ilerledi. Collector'ın tamamında hâlâ full mark-sweep kill switch'i (¤PERRY_GEN_GC=0¤) var ve onu exercise ediyoruz; ona karşı bisect edemediğimiz gün bu sayıların hiçbirine güvenemeyiz.

---

## Artık çalıştığımız kurallar

Öğrendiklerimizin çoğu garbage collection'ın ötesine genellenir:

1. **Hâlâ var olan mode, henüz verilmemiş karardır.** Kaybeden branch'i silin ya da onu exercise eden arm tutun; sildiğiniz yerde tombstone comment bırakın.
2. **Gate subject'in live olduğunu assert etmelidir**, yalnız hiçbir şey throw etmediğini değil. “Hiçbir şey çalıştırmadığı için green” red'den kötüdür.
3. **Feedback loop'u değiştiremeyeceği nicelikle pace etmeyin.** Üç bağımsız livelock, tek biçim.
4. **O(live) süreci sabit bantla pace etmeyin.** Daha büyük constant yalnız uçurumu taşır.
5. **Hata sınıfı kanıt bırakmıyorsa investigation'ı bırakıp instrument yapın.** Sonra görünmezliği kanıtlayan instrumentsız control dahil sabotage-test edin.
6. **Doc comment değişiklik değildir.** Tanınmayan değer durumu dahil default'ları ve eşleşmesi gereken component'lerin agreement'ını testlerle pin edin.
7. **İki arm'ı aynı host'ta aynı tree'den ölçün ve exit code'u kontrol edin.**
8. **Invariant'ı kurmadan önce discriminating shape'i test edin.**
9. **Kalıcı hibriti reddedin.** “Zor durumlarda eski mekanizmayı tut” migration'ı sonsuza dek iki mekanizmaya çevirir. Zor durumu çalıştırın ya da migrate etmeyin.

Collector bitmedi. İlk kez *okunabilir*: her knob bir şeyi gate ediyor, her gate fail olabilir, her default testle pin'li ve yayımlanan her sayı önce output doğrulanarak sessiz makinede ölçüldü. Bu okunabilirlik collector'dan daha çok iş istedi ve son ayın sayılarını oynatabilmemizin tek nedeni.
`.replaceAll("¤", "`");

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
