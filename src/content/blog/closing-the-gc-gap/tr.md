---
title: "aya_koto'nun Benchmark'ı Bize Perry'nin GC'si Hakkında Ne Öğretti"
excerpt: "Bir okur, AtCoder ABC451D üzerinde Perry'yi benchmark etti ve Bun'dan 3,85× daha yavaş ölçtü. Sessiz bir regresyon o arada farkı 6,59×'a kadar açmıştı. Düzeltme beklediğimiz yerde değildi, açığa çıkardığı kasıtlı GC ödünleşimi gerçekti ve Perry v0.5.875 artık aynı benchmark'ta Bun ile berabere: 425 ms vs 431 ms."
date: 2026-05-12
tags: ["GC", "performance", "benchmarks", "community"]
---
Birkaç hafta önce [Ayasaka-Koto](https://zenn.dev/aya_koto) (X'te @axt\_ayakoto) AtCoder problemi ABC451D, “Concat Power of 2” üzerinde [Perry'yi Deno ve Bun'a karşı ölçen bir benchmark](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4) yayınladı. Ölçümü: Perry, **Bun'dan 3.85× yavaş** çalışıyordu. Vardığı sonuç kibar ama netti — Perry, rekabetçi programlama için bir runtime olmaya hazır değildi ve olgunlaştığında bile olmayabilirdi.

Ona bir takip borçluyuz. Aynı benchmark'ta, aynı `hyperfine` komutuyla, aynı makine sınıfında nereye vardığımız işte burada:

```
Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster
```

Bu açığı kapatmak, yanlış bir hipotezle başlayan, gerçek ama kasıtlı bir GC mimari ödünleşimi bulan ve yazmaya değer bulduğumuz bir sonuç üreten bir araştırma gerektirdi — yetiştiğimiz için değil, ödünleşimin profil altında nasıl göründüğü başlı başına ilginç olduğu için.

## Benchmark

aya\_koto'nun `abc451d-perry.ts`'i, 2'nin kuvveti string'lerinin birleştirmeleri üzerinde özyinelemeli bir derinlik öncelikli arama yapıyor; sonuçlar bir `Set<number>` ile tekilleştiriliyor ve sıralanıyor. Sıcak fonksiyon kısa:

```
function search(before: string, powersOfTwoStr: string[]): string[] {
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
}
```

Hikaye, bu şeklin kendisinde. Her çağrı taze bir `string[]` ayırıyor. Özyineleme derin — tepede dallanma faktörü kabaca 30'a kadar çıkıyor — ve her ebeveyn frame'i, çocuğun dizisini dolaşırken ve kendi dizisine push yaparken kendi `answers` dizisini canlı tutuyor. Kısa ömürlü ayırmalar, derin özyineleme, her aktif arena bloğuna saçılmış canlı referanslar. Bunun tam da Perry'nin GC'sinin *karşı* ayarlanmadığı iş yükü olduğu ortaya çıktı.

## Yanlış hipotez

Bir okuyucu, aya\_koto'nun makalesine bir dipnot bırakarak Perry'nin BigInt'inin içeride sabit uzunlukta 1024-bit bir tamsayı olduğuna ve BigInt-yoğun programların Bun'dan kabaca 4× yavaş çalıştığına dikkat çekmişti. ABC451D, 2'nin kuvvetlerini içeriyor — büyük sayılar makul görünüyordu — ve ilk içgüdü şuydu: BigInt suçlu, BigInt yolunu düzelt, açık kapanır.

Öyle değildi. `grep -i bigint abc451d-perry.ts` hiçbir şey döndürmedi. Benchmark baştan sona `number` kullanıyor; her değer rahatça 2^53'ün altına sığıyor. BigInt dipnotu doğruydu, gerçekti ve düzeltilmeye değer bir sorundu — ve onu ayrıca v0.5.736'da düzelttik. Ama ABC451D ile hiçbir ilgisi yoktu.

Önce yanlış hipotezin peşinden koşmanın maliyeti yaklaşık bir gündü. Ders — ki zaten bildiğimizi iddia etmek isterim — şuydu: bir teoriye bağlanmadan önce profil çıkar, teori güvenilir bir kaynaktan gelse ve önyargılarınla örtüşse bile. Özellikle o zaman.

## Benchmark'ı yeniden üretmek

BigInt'in peşinden koşmayı bıraktığımızda yaptığımız ilk şey, aya\_koto'nun sayılarını temizce yeniden üretmek oldu. Perry'de onun 1.219 s'sine yakın inmeyi bekliyorduk. Perry v0.5.729'da **2.998 s**'e indik.

Bu, onun test ettiği sürüm ile o zamanki güncel main'imiz arasında 2.5×'lik bir gerileme. Deno ve Bun, onun sayılarının %50'si içinde yeniden üretildi (farklı donanım, sürüm kayması). Perry açığı, kimse bakmazken 3.85×'ten 6.59×'e büyümüştü.

Gerilemeye hangi commit'in yol açtığını bisect etmedik — bu araştırmanın kapsamı dışına çıktı. Ama kaymayı yakalayacak bir CI koruyucusunun yokluğu başlı başına bir bulgu ve sonunda buna geri döneceğiz.

## Profil odaklı teşhis

`PERRY_DEBUG_SYMBOLS=1` ile derlenip `samply` ile kaydedildiğinde, self-time tablosu kesindi:

```
% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator
```

**Self time'ın %76'sı GC makinesiydi.** Inclusive time de aynı fikirdeydi: `gc_collect_minor` %80'de, `Arena::alloc` %76'da, `js_array_alloc` %45'te, `js_array_push_f64` %22'de. Özyinelemeli `search()` sıcaktı, ama GC mark fazının altında sıcaktı. Her çağrı, bir collection'ı tetikleyecek kadar ayırma tetikliyordu.

Bir negatif kontrol mikro-benchmark'ı, yavaşlamanın genel olmadığını doğruladı. Sıkı tamsayı `fib(80) × 100_000`, ayırma yok: Perry **6.1 ms** vs Bun **24.7 ms** — Perry 4× hızlı. Ayırma yapmayan sıcak döngüler için codegen zaten Bun'un önündeydi. ABC451D'nin açığı tek bir spesifik kod yolunda yoğunlaşmıştı: ayırma throughput'u artı bu belirli ayırma şekli üzerinde GC mark-sweep.

## Tabanca dumanı

Elimizde bir flag vardı — `PERRY_GC_DIAG=1` — döngü başına GC istatistiklerini yazdıran. Çıktı, tüm araştırmanın yük taşıyan gözlemiydi:

```
[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+
```

Her döngüde aynı örüntü. Sweep, ayrılan nesnelerin **%55–60'ının ölü olduğunu** doğru biçimde tespit ediyordu. Ve arena **sıfır blok** geri kazanıyordu. Heap, koşu boyunca monoton olarak büyüyordu; GC ise giderek büyüyen bir çalışma kümesi üzerinde mark-sweep maliyetini ödemeye devam ediyordu.

Nesnelerin yarısından fazlası ölüyken neden `block_reclaim=0`? Çünkü Perry'nin arena GC'si blok granülaritesinde geri kazanım yapar. 1 MB'lık bir blok ancak içindeki her nesne öldüğünde sıfırlanır. ABC451D'de özyinelemeli `search()`, canlı referansları — ebeveyn frame'inin `answers` dizisini — her aktif bloğa saçılmış halde tutar. Hiçbir blok tamamen ölü olmaz. Mark-sweep, ölü nesneleri doğru biçimde tespit eder, nesne başına bir geri kazanım yolu yoktur, dolayısıyla onlarla hiçbir şey yapmaz. Heap büyür, GC tetikleri bir koşu bandında ateşlenir ve her döngünün maliyeti çalışma kümesi tırmandıkça tırmanır.

## Kasıtlı ödünleşim

Bulduğumuz en bilgilendirici şey profilde değildi. Sweep'in kendisindeydi, `crates/perry-runtime/src/gc.rs:2733`'te, tasarımı açıklayan bir yorum olarak:

> Ölü nesneleri global ARENA\_FREE\_LIST'e kasıtlı olarak push ETMİYORUZ. Inline bump allocator free list'i hiç okumaz — bunun yerine blok başına reset kullanır. Ölü nesneleri free list'e push etmek `object_create`'te nesne başına ~50ns × GC başına ~700k nesne × benchmark başına ~12 GC döngüsü = 420ms saf israfa mal olur.

Bu, karşı ayarlandığı iş yükü için tam olarak doğru. `object_create`, önemsediğimiz bir benchmark; burada ayırmalar sıkı bir döngüde ölür ve döngüler arasında tüm bloklar gerçekten boşalır. Nesne başına bir free-list pass'i eklemek, o iş yükü için 420 ms'lik anlamsız defter tutma yakar ve blok-reset yolu aynı belleği daha ucuza yakalar.

ABC451D'nin şekline ise zayıf uyum sağlar; orada canlı referanslar saçılmış kalır ve blok-reset hiç ateşlenmez. Mimaride kodlanmış kasıtlı bir ödünleşim vardı ve ödünleşimin yanlış tarafa düştüğü durumu hiç benchmark etmemiştik.

Asıl ders bu. GC bozuk değildi. aya\_koto'nun benchmark'ının temsil ettiğinden farklı bir ayırma örüntüsü dağılımına ayarlanmıştı ve ayarlandığı dağılımın gerçek iş yüklerinin bir sınıfını dışladığını fark etmemiştik — özyinelemeli arama, ağaç dolaşımları, altta kısa ömürlü ayırma yaparken stack'in her seviyesinde canlı durum tutan her şey.

## İşe yaramayan şeyler

Gerçek bir düzeltmeye ulaşmadan önce, makul görünen birkaç kaldıraç yanlış kaldıraç çıktı. Bunları sayılarla bildiriyorum çünkü araştırmanın daha ilginç yarısıydılar:

-   **`PERRY_GEN_GC_EVACUATE=1`** — Perry'nin zaten opt-in bir kopyalama-tahliye pass'i vardı. ABC451D için açmak: **11.4 saniye**, baseline'dan dört kat yavaş. Pass, yararlı olsun olmasın her döngüde çalışır ve canlı küme kısa ömürlü küçük nesnelerden oluştuğunda nesne başına kopya artı referans-yeniden-yazma maliyeti felakettir. Fayda sağladığı iş yükleri için tutmaya değer, ama buradaki yanıt değil.
-   **`PERRY_GEN_GC=0`** (generational yerine tam mark-sweep) — 3.06 s, baseline ile esasen aynı. Bağlayıcı olan strateji seçimi değil; nesne başına geri kazanımın yokluğu.
-   **`ValidPointerSet` yapısal temizliği (commit 0fa42e0b).** İki ayrı sıralı vektörü (arena pointer'ları ve malloc'lanmış pointer'lar) tek bir vektörde birleştirdi, bir min/max aralık önfiltresi ekledi, `try_mark_value`'nin tag reddini inline etti. `contains()`'in çağrı başına maliyetini — ki profilin işaret ettiği sıcak iç döngüydü — yarıya indirdi. ABC451D benchmark'ı 3.07 s'den 3.21 s'e gitti. Gürültü içinde bir berabere. Değişiklik, `contains()`'in gerçekten bağlayıcı kısıt olduğu iş yükleri için (ECS-şekilli benchmark'lar, hono compose zincirleri) hâlâ değer sunuyor, ama burada bağlayıcı kısıt o değildi. Ayırma baskısının mark fazını beslemesiyle yönlenen mutlak çağrı hacmi, çağrı başına sıfır maliyette bile baskındı.

Üçünde de örüntü aynı: GC stratejisi ve çağrı başına iç döngü maliyetleri ikincil dereceydi. Bağlayıcı kısıt, tamamen boşalmayan bloklardaki ölü nesneler için bir geri kazanım yolunun olmamasıydı. O ele alınana kadar başka hiçbir şey iğneyi oynatmadı.

## Nereye vardık

v0.5.737 ile v0.5.875 arasında, kabaca 137 patch sürüm boyunca açık kapandı. Bunu yazarken dikkatli oluyoruz: tek bir kahraman commit'e bisect etmedik. Düzeltme, kasıtlı “nesne başına free list yok” ödünleşimini kalıcı yerine koşullu yapan bir dizi değişiklik boyunca GC alt sistemine indi — `block_reclaim` ardışık döngüler boyunca sıfırda kalınca, sweep boyut-kovalı bir free list doldurmaya başlar ve bump allocator bir fallback yolu kazanır. Tam sıralama ve hangi patch'in ne kadar katkıda bulunduğu, borçlu olduğumuz ama henüz yapmadığımız dikkatli bir bisect gerektirir.

Sonuç, aya\_koto'nun tam benchmark ve komutunda, Apple M-serisi, macOS 26.4'te:

```
Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)
```

Bu tabloda iki dürüstlük notu. Birincisi, Perry'nin Bun üzerindeki 1.01× payı hata çubukları içinde — doğru sözcük “berabere”, “daha hızlı” değil. İkincisi, üç runtime'da da varyans anlamlı (Perry'nin maksimumu 425 ms'lik bir ortalamaya karşı 745 ms) ve herhangi tek bir koşu iki uçtan birine düşebilir. Bu nedenle min ve max'i ortalamanın yanında gösterdik; yayılımı görmenizi tercih ederiz.

## Hâlâ kusurlu olan

Üstünü örtmediğimiz birkaç şey:

aya\_koto'nun ölçümü ile bu araştırmanın başlangıcı arasında olan 1.2 s'den 3.0 s'e gerileme, bu sınıf yavaşlamayı yakalayan bir CI koruyucumuz olmadığını söylüyor. Bu yazı yayına girmeden önce `abc451d-perry.ts`'i ve onu çevreleyen küçük bir paketi, Perry'nin CI'sına bir perf gerileme kapısı olarak ekliyoruz. Bu benchmark gelecekteki bir sürümde sessizce bozulursa, üç ay sonra bir eleştirmenin benchmark'ını değil, bir build'i başarısız etmeli.

Düzeltme, kasıtlı bir ödünleşimi belirli bir yönde gevşetiyor. `object_create` benchmark'ını ve dostlarını — orijinal “free list yok” seçiminin koruduğu iş yüklerini — izliyoruz; koşullu free-list yolunun onları geriletmediğinden emin olmak için. Erken sayılar gürültü içinde, ama bu, güvenin tek bir benchmark koşusundan değil, zamandan geldiği türden bir şey.

137-sürümlük aralığı bisect etmedik. Edeceğiz. Belgeleme için önemli ve koşullu-free-list mekanizmalarından hangilerinin işi yaptığını anlamak için önemli.

## Teşekkür

aya\_koto'nun makalesi, tam da açık kaynak bir projenin ihtiyaç duyduğu ama nadiren aldığı türden bir yazıydı. Dikkatle ölçtü, test repo'sunu yayınladı, kurulum yolundaki belirli sürtünmeyi işaret etti ve Perry'nin değerlendirdiği kullanım senaryosu için hazır olmadığı dürüst sonucuna vardı. O sonuç, vardığında doğruydu. Hakkında yazmasaydı daha uzun süre doğru kalırdı.

Test repo'su [github.com/AXT-AyaKoto/perry-ts-test-2026-0421](https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421) adresinde. Makalesi [zenn.dev/aya\_koto/articles/553ce04b1d5ac4](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4) adresinde. Her ikisi de bu takibin ardından bile okunmaya değer — özellikle makale, çünkü kibar olmaya hiçbir teşviki olmayan birinden erken aşamadaki bir derleyicinin dürüst bir değerlendirmesini belgeliyor.

Makalesinde not etmemiz gereken iki spesifik şey. İşaret ettiği kurulum yolu sürtünmesi — perryts.com'un tepesinin bir yöntemi gösterirken docs'un başka birini önermesi — düzeltildi; npm yolu artık landing page'de öne çıkan seçenek ve docs ile eşleşiyor. İşaret ettiği “limitations dokümanının dışında olup derlenmeyen şeyler” sıkıntısı — test repo'sundaki her `.ts` dosyasını güncel Perry'ye karşı tek tek inceledik; gerçek boşluklar için issue açıldı ve belgelenmiş kısıtlamalar genişletildi.

Makalesindeki BigInt dipnotu, yukarıda tartışıldığı gibi ABC451D ile ilgisizdi ama başlı başına gerçekti — Perry'nin BigInt implementasyonu gerçekten de altında sabit genişlikte 1024-bit bir tamsayıydı ve BigInt-yoğun programlar bunun bedelini ödüyordu. Bu, v0.5.736'da düzeltildi; küçük değerler için bir inline yol ve keyfi hassasiyet fallback'i olarak `num-bigint` ile. Oradaki teşekkür, aya\_koto'nun makalesine dipnotu bırakan okuyucuya ait; kim olduklarını bilmiyoruz, ama bunu okuyorsanız: teşekkürler.

## Yeniden üretim

Bu sayıları kendiniz yeniden üretmek isterseniz:

```
git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \
  './abc451d-perry < abc451d-input.txt' \
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \
  'bun run abc451d-bun.ts < abc451d-input.txt'
```

Sayılarınız donanıma ve runtime sürümlerine göre değişecektir. Yanlış görünen şekillerde değişiyorsa, [bir issue açın](https://github.com/PerryTS/perry/issues) — bunu duymayı tercih ederiz.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
