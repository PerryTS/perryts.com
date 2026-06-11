export default function Content() {
  return (
    <>
      <p>
        Birkaç hafta önce <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (X&apos;te @axt_ayakoto) AtCoder problemi ABC451D, &ldquo;Concat Power of 2&rdquo; üzerinde <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">Perry&apos;yi Deno ve Bun&apos;a karşı ölçen bir benchmark</a> yayınladı. Ölçümü: Perry, <strong>Bun&apos;dan 3.85× yavaş</strong> çalışıyordu. Vardığı sonuç kibar ama netti — Perry, rekabetçi programlama için bir runtime olmaya hazır değildi ve olgunlaştığında bile olmayabilirdi.
      </p>
      <p>
        Ona bir takip borçluyuz. Aynı benchmark&apos;ta, aynı <code>hyperfine</code> komutuyla, aynı makine sınıfında nereye vardığımız işte burada:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        Bu açığı kapatmak, yanlış bir hipotezle başlayan, gerçek ama kasıtlı bir GC mimari ödünleşimi bulan ve yazmaya değer bulduğumuz bir sonuç üreten bir araştırma gerektirdi — yetiştiğimiz için değil, ödünleşimin profil altında nasıl göründüğü başlı başına ilginç olduğu için.
      </p>

      <h2>Benchmark</h2>
      <p>
        aya_koto&apos;nun <code>abc451d-perry.ts</code>&apos;i, 2&apos;nin kuvveti string&apos;lerinin birleştirmeleri üzerinde özyinelemeli bir derinlik öncelikli arama yapıyor; sonuçlar bir <code>Set&lt;number&gt;</code> ile tekilleştiriliyor ve sıralanıyor. Sıcak fonksiyon kısa:
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}`}</code></pre>
      <p>
        Hikaye, bu şeklin kendisinde. Her çağrı taze bir <code>string[]</code> ayırıyor. Özyineleme derin — tepede dallanma faktörü kabaca 30&apos;a kadar çıkıyor — ve her ebeveyn frame&apos;i, çocuğun dizisini dolaşırken ve kendi dizisine push yaparken kendi <code>answers</code> dizisini canlı tutuyor. Kısa ömürlü ayırmalar, derin özyineleme, her aktif arena bloğuna saçılmış canlı referanslar. Bunun tam da Perry&apos;nin GC&apos;sinin <em>karşı</em> ayarlanmadığı iş yükü olduğu ortaya çıktı.
      </p>

      <h2>Yanlış hipotez</h2>
      <p>
        Bir okuyucu, aya_koto&apos;nun makalesine bir dipnot bırakarak Perry&apos;nin BigInt&apos;inin içeride sabit uzunlukta 1024-bit bir tamsayı olduğuna ve BigInt-yoğun programların Bun&apos;dan kabaca 4× yavaş çalıştığına dikkat çekmişti. ABC451D, 2&apos;nin kuvvetlerini içeriyor — büyük sayılar makul görünüyordu — ve ilk içgüdü şuydu: BigInt suçlu, BigInt yolunu düzelt, açık kapanır.
      </p>
      <p>
        Öyle değildi. <code>grep -i bigint abc451d-perry.ts</code> hiçbir şey döndürmedi. Benchmark baştan sona <code>number</code> kullanıyor; her değer rahatça 2^53&apos;ün altına sığıyor. BigInt dipnotu doğruydu, gerçekti ve düzeltilmeye değer bir sorundu — ve onu ayrıca v0.5.736&apos;da düzelttik. Ama ABC451D ile hiçbir ilgisi yoktu.
      </p>
      <p>
        Önce yanlış hipotezin peşinden koşmanın maliyeti yaklaşık bir gündü. Ders — ki zaten bildiğimizi iddia etmek isterim — şuydu: bir teoriye bağlanmadan önce profil çıkar, teori güvenilir bir kaynaktan gelse ve önyargılarınla örtüşse bile. Özellikle o zaman.
      </p>

      <h2>Benchmark&apos;ı yeniden üretmek</h2>
      <p>
        BigInt&apos;in peşinden koşmayı bıraktığımızda yaptığımız ilk şey, aya_koto&apos;nun sayılarını temizce yeniden üretmek oldu. Perry&apos;de onun 1.219 s&apos;sine yakın inmeyi bekliyorduk. Perry v0.5.729&apos;da <strong>2.998 s</strong>&apos;e indik.
      </p>
      <p>
        Bu, onun test ettiği sürüm ile o zamanki güncel main&apos;imiz arasında 2.5×&apos;lik bir gerileme. Deno ve Bun, onun sayılarının %50&apos;si içinde yeniden üretildi (farklı donanım, sürüm kayması). Perry açığı, kimse bakmazken 3.85×&apos;ten 6.59×&apos;e büyümüştü.
      </p>
      <p>
        Gerilemeye hangi commit&apos;in yol açtığını bisect etmedik — bu araştırmanın kapsamı dışına çıktı. Ama kaymayı yakalayacak bir CI koruyucusunun yokluğu başlı başına bir bulgu ve sonunda buna geri döneceğiz.
      </p>

      <h2>Profil odaklı teşhis</h2>
      <p>
        <code>PERRY_DEBUG_SYMBOLS=1</code> ile derlenip <code>samply</code> ile kaydedildiğinde, self-time tablosu kesindi:
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>Self time&apos;ın %76&apos;sı GC makinesiydi.</strong> Inclusive time de aynı fikirdeydi: <code>gc_collect_minor</code> %80&apos;de, <code>Arena::alloc</code> %76&apos;da, <code>js_array_alloc</code> %45&apos;te, <code>js_array_push_f64</code> %22&apos;de. Özyinelemeli <code>search()</code> sıcaktı, ama GC mark fazının altında sıcaktı. Her çağrı, bir collection&apos;ı tetikleyecek kadar ayırma tetikliyordu.
      </p>
      <p>
        Bir negatif kontrol mikro-benchmark&apos;ı, yavaşlamanın genel olmadığını doğruladı. Sıkı tamsayı <code>fib(80) × 100_000</code>, ayırma yok: Perry <strong>6.1 ms</strong> vs Bun <strong>24.7 ms</strong> — Perry 4× hızlı. Ayırma yapmayan sıcak döngüler için codegen zaten Bun&apos;un önündeydi. ABC451D&apos;nin açığı tek bir spesifik kod yolunda yoğunlaşmıştı: ayırma throughput&apos;u artı bu belirli ayırma şekli üzerinde GC mark-sweep.
      </p>

      <h2>Tabanca dumanı</h2>
      <p>
        Elimizde bir flag vardı — <code>PERRY_GC_DIAG=1</code> — döngü başına GC istatistiklerini yazdıran. Çıktı, tüm araştırmanın yük taşıyan gözlemiydi:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Her döngüde aynı örüntü. Sweep, ayrılan nesnelerin <strong>%55–60&apos;ının ölü olduğunu</strong> doğru biçimde tespit ediyordu. Ve arena <strong>sıfır blok</strong> geri kazanıyordu. Heap, koşu boyunca monoton olarak büyüyordu; GC ise giderek büyüyen bir çalışma kümesi üzerinde mark-sweep maliyetini ödemeye devam ediyordu.
      </p>
      <p>
        Nesnelerin yarısından fazlası ölüyken neden <code>block_reclaim=0</code>? Çünkü Perry&apos;nin arena GC&apos;si blok granülaritesinde geri kazanım yapar. 1 MB&apos;lık bir blok ancak içindeki her nesne öldüğünde sıfırlanır. ABC451D&apos;de özyinelemeli <code>search()</code>, canlı referansları — ebeveyn frame&apos;inin <code>answers</code> dizisini — her aktif bloğa saçılmış halde tutar. Hiçbir blok tamamen ölü olmaz. Mark-sweep, ölü nesneleri doğru biçimde tespit eder, nesne başına bir geri kazanım yolu yoktur, dolayısıyla onlarla hiçbir şey yapmaz. Heap büyür, GC tetikleri bir koşu bandında ateşlenir ve her döngünün maliyeti çalışma kümesi tırmandıkça tırmanır.
      </p>

      <h2>Kasıtlı ödünleşim</h2>
      <p>
        Bulduğumuz en bilgilendirici şey profilde değildi. Sweep&apos;in kendisindeydi, <code>crates/perry-runtime/src/gc.rs:2733</code>&apos;te, tasarımı açıklayan bir yorum olarak:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        Ölü nesneleri global ARENA_FREE_LIST&apos;e kasıtlı olarak push ETMİYORUZ. Inline bump allocator free list&apos;i hiç okumaz — bunun yerine blok başına reset kullanır. Ölü nesneleri free list&apos;e push etmek <code>object_create</code>&apos;te nesne başına ~50ns × GC başına ~700k nesne × benchmark başına ~12 GC döngüsü = 420ms saf israfa mal olur.
      </blockquote>
      <p>
        Bu, karşı ayarlandığı iş yükü için tam olarak doğru. <code>object_create</code>, önemsediğimiz bir benchmark; burada ayırmalar sıkı bir döngüde ölür ve döngüler arasında tüm bloklar gerçekten boşalır. Nesne başına bir free-list pass&apos;i eklemek, o iş yükü için 420 ms&apos;lik anlamsız defter tutma yakar ve blok-reset yolu aynı belleği daha ucuza yakalar.
      </p>
      <p>
        ABC451D&apos;nin şekline ise zayıf uyum sağlar; orada canlı referanslar saçılmış kalır ve blok-reset hiç ateşlenmez. Mimaride kodlanmış kasıtlı bir ödünleşim vardı ve ödünleşimin yanlış tarafa düştüğü durumu hiç benchmark etmemiştik.
      </p>
      <p>
        Asıl ders bu. GC bozuk değildi. aya_koto&apos;nun benchmark&apos;ının temsil ettiğinden farklı bir ayırma örüntüsü dağılımına ayarlanmıştı ve ayarlandığı dağılımın gerçek iş yüklerinin bir sınıfını dışladığını fark etmemiştik — özyinelemeli arama, ağaç dolaşımları, altta kısa ömürlü ayırma yaparken stack&apos;in her seviyesinde canlı durum tutan her şey.
      </p>

      <h2>İşe yaramayan şeyler</h2>
      <p>
        Gerçek bir düzeltmeye ulaşmadan önce, makul görünen birkaç kaldıraç yanlış kaldıraç çıktı. Bunları sayılarla bildiriyorum çünkü araştırmanın daha ilginç yarısıydılar:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry&apos;nin zaten opt-in bir kopyalama-tahliye pass&apos;i vardı. ABC451D için açmak: <strong>11.4 saniye</strong>, baseline&apos;dan dört kat yavaş. Pass, yararlı olsun olmasın her döngüde çalışır ve canlı küme kısa ömürlü küçük nesnelerden oluştuğunda nesne başına kopya artı referans-yeniden-yazma maliyeti felakettir. Fayda sağladığı iş yükleri için tutmaya değer, ama buradaki yanıt değil.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (generational yerine tam mark-sweep) — 3.06 s, baseline ile esasen aynı. Bağlayıcı olan strateji seçimi değil; nesne başına geri kazanımın yokluğu.</li>
        <li><strong><code>ValidPointerSet</code> yapısal temizliği (commit 0fa42e0b).</strong> İki ayrı sıralı vektörü (arena pointer&apos;ları ve malloc&apos;lanmış pointer&apos;lar) tek bir vektörde birleştirdi, bir min/max aralık önfiltresi ekledi, <code>try_mark_value</code>&apos;nin tag reddini inline etti. <code>contains()</code>&apos;in çağrı başına maliyetini — ki profilin işaret ettiği sıcak iç döngüydü — yarıya indirdi. ABC451D benchmark&apos;ı 3.07 s&apos;den 3.21 s&apos;e gitti. Gürültü içinde bir berabere. Değişiklik, <code>contains()</code>&apos;in gerçekten bağlayıcı kısıt olduğu iş yükleri için (ECS-şekilli benchmark&apos;lar, hono compose zincirleri) hâlâ değer sunuyor, ama burada bağlayıcı kısıt o değildi. Ayırma baskısının mark fazını beslemesiyle yönlenen mutlak çağrı hacmi, çağrı başına sıfır maliyette bile baskındı.</li>
      </ul>
      <p>
        Üçünde de örüntü aynı: GC stratejisi ve çağrı başına iç döngü maliyetleri ikincil dereceydi. Bağlayıcı kısıt, tamamen boşalmayan bloklardaki ölü nesneler için bir geri kazanım yolunun olmamasıydı. O ele alınana kadar başka hiçbir şey iğneyi oynatmadı.
      </p>

      <h2>Nereye vardık</h2>
      <p>
        v0.5.737 ile v0.5.875 arasında, kabaca 137 patch sürüm boyunca açık kapandı. Bunu yazarken dikkatli oluyoruz: tek bir kahraman commit&apos;e bisect etmedik. Düzeltme, kasıtlı &ldquo;nesne başına free list yok&rdquo; ödünleşimini kalıcı yerine koşullu yapan bir dizi değişiklik boyunca GC alt sistemine indi — <code>block_reclaim</code> ardışık döngüler boyunca sıfırda kalınca, sweep boyut-kovalı bir free list doldurmaya başlar ve bump allocator bir fallback yolu kazanır. Tam sıralama ve hangi patch&apos;in ne kadar katkıda bulunduğu, borçlu olduğumuz ama henüz yapmadığımız dikkatli bir bisect gerektirir.
      </p>
      <p>
        Sonuç, aya_koto&apos;nun tam benchmark ve komutunda, Apple M-serisi, macOS 26.4&apos;te:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Bu tabloda iki dürüstlük notu. Birincisi, Perry&apos;nin Bun üzerindeki 1.01× payı hata çubukları içinde — doğru sözcük &ldquo;berabere&rdquo;, &ldquo;daha hızlı&rdquo; değil. İkincisi, üç runtime&apos;da da varyans anlamlı (Perry&apos;nin maksimumu 425 ms&apos;lik bir ortalamaya karşı 745 ms) ve herhangi tek bir koşu iki uçtan birine düşebilir. Bu nedenle min ve max&apos;i ortalamanın yanında gösterdik; yayılımı görmenizi tercih ederiz.
      </p>

      <h2>Hâlâ kusurlu olan</h2>
      <p>
        Üstünü örtmediğimiz birkaç şey:
      </p>
      <p>
        aya_koto&apos;nun ölçümü ile bu araştırmanın başlangıcı arasında olan 1.2 s&apos;den 3.0 s&apos;e gerileme, bu sınıf yavaşlamayı yakalayan bir CI koruyucumuz olmadığını söylüyor. Bu yazı yayına girmeden önce <code>abc451d-perry.ts</code>&apos;i ve onu çevreleyen küçük bir paketi, Perry&apos;nin CI&apos;sına bir perf gerileme kapısı olarak ekliyoruz. Bu benchmark gelecekteki bir sürümde sessizce bozulursa, üç ay sonra bir eleştirmenin benchmark&apos;ını değil, bir build&apos;i başarısız etmeli.
      </p>
      <p>
        Düzeltme, kasıtlı bir ödünleşimi belirli bir yönde gevşetiyor. <code>object_create</code> benchmark&apos;ını ve dostlarını — orijinal &ldquo;free list yok&rdquo; seçiminin koruduğu iş yüklerini — izliyoruz; koşullu free-list yolunun onları geriletmediğinden emin olmak için. Erken sayılar gürültü içinde, ama bu, güvenin tek bir benchmark koşusundan değil, zamandan geldiği türden bir şey.
      </p>
      <p>
        137-sürümlük aralığı bisect etmedik. Edeceğiz. Belgeleme için önemli ve koşullu-free-list mekanizmalarından hangilerinin işi yaptığını anlamak için önemli.
      </p>

      <h2>Teşekkür</h2>
      <p>
        aya_koto&apos;nun makalesi, tam da açık kaynak bir projenin ihtiyaç duyduğu ama nadiren aldığı türden bir yazıydı. Dikkatle ölçtü, test repo&apos;sunu yayınladı, kurulum yolundaki belirli sürtünmeyi işaret etti ve Perry&apos;nin değerlendirdiği kullanım senaryosu için hazır olmadığı dürüst sonucuna vardı. O sonuç, vardığında doğruydu. Hakkında yazmasaydı daha uzun süre doğru kalırdı.
      </p>
      <p>
        Test repo&apos;su <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a> adresinde. Makalesi <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a> adresinde. Her ikisi de bu takibin ardından bile okunmaya değer — özellikle makale, çünkü kibar olmaya hiçbir teşviki olmayan birinden erken aşamadaki bir derleyicinin dürüst bir değerlendirmesini belgeliyor.
      </p>
      <p>
        Makalesinde not etmemiz gereken iki spesifik şey. İşaret ettiği kurulum yolu sürtünmesi — perryts.com&apos;un tepesinin bir yöntemi gösterirken docs&apos;un başka birini önermesi — düzeltildi; npm yolu artık landing page&apos;de öne çıkan seçenek ve docs ile eşleşiyor. İşaret ettiği &ldquo;limitations dokümanının dışında olup derlenmeyen şeyler&rdquo; sıkıntısı — test repo&apos;sundaki her <code>.ts</code> dosyasını güncel Perry&apos;ye karşı tek tek inceledik; gerçek boşluklar için issue açıldı ve belgelenmiş kısıtlamalar genişletildi.
      </p>
      <p>
        Makalesindeki BigInt dipnotu, yukarıda tartışıldığı gibi ABC451D ile ilgisizdi ama başlı başına gerçekti — Perry&apos;nin BigInt implementasyonu gerçekten de altında sabit genişlikte 1024-bit bir tamsayıydı ve BigInt-yoğun programlar bunun bedelini ödüyordu. Bu, v0.5.736&apos;da düzeltildi; küçük değerler için bir inline yol ve keyfi hassasiyet fallback&apos;i olarak <code>num-bigint</code> ile. Oradaki teşekkür, aya_koto&apos;nun makalesine dipnotu bırakan okuyucuya ait; kim olduklarını bilmiyoruz, ama bunu okuyorsanız: teşekkürler.
      </p>

      <h2>Yeniden üretim</h2>
      <p>
        Bu sayıları kendiniz yeniden üretmek isterseniz:
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        Sayılarınız donanıma ve runtime sürümlerine göre değişecektir. Yanlış görünen şekillerde değişiyorsa, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">bir issue açın</a> — bunu duymayı tercih ederiz.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
