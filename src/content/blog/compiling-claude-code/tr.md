---
title: "Claude Code’u derlemek: tek küçültülmüş bundle, 160 derleyici düzeltmesi"
excerpt: "Perry ile npm’in Claude Code için dağıttığı 13 MB’lık küçültülmüş cli.js dosyasını yerel bir ikiliye derlemeyi denedik. Bir ay sonra program açılıyor, oturum açıyor, API’den gerçek yanıtları akış halinde alıyor ve yazdığınız karakterleri çiziyor. Bu süreçte, hiçbir şey yapmayan bir MessageChannel’dan RegExp başlıklarındaki eksik GC yazma bariyerine kadar 160 pull request Perry’ye birleştirildi."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
16 Haziran'daki talimat bir cümleden oluşuyordu: *“Claude kod klasörünü bulun ve oradan (derlenmiş, küçültülmüş) javascript'i alın… bakalım onu derleyebilecek miyiz :D”* Bariz itiraz (bunun acımasız olacağı yönünde) geri geldiğinde cevap asıl tezdi: *“acımasız ama aynı zamanda yeteneklerimiz ve sınırlarımız açısından da gerçek bir test. bu yüzden bunu yapmak istiyorum. Sınırları bulma açısından hiçbir şey gerçek dünyadaki uygulamaların yerini alamaz."*

Bir ay sonra Anthropic’in Claude Code CLI’ının Perry ile derlenmiş ikilisi açılıyor, `/login` komutuyla OAuth akışını tamamlıyor, API’den gerçek bir yanıtı akış halinde alıyor ve yazdığınız karakterleri çiziyor. Buraya ulaşmak için **20 Haziran ile 17 Temmuz arasında Perry’ye 160 pull request birleştirildi** — hiçbir şey yapmayan bir `MessageChannel`, RegExp başlıklarında eksik bir GC yazma bariyeri, yalnızca gerçek API ile sonsuz döngüye giren ama sahte sunucumuzda hiç takılmayan bir `continue` ifadesi ve yaklaşık yüz elli başka düzeltme.

Bu yazı turdur. Başka birinin CLI'sini derlemenin bir ürün olması nedeniyle değil - bu ikili programı yayınlamayacağız ve hiçbir zaman yayınlamayacağız - ama bu, şimdiye kadar Perry'ye yönelttiğimiz en verimli hata bulma aracı olduğu için.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="/tmp/verify'dan Perry tarafından derlenmiş bir Claude Code ikili programını çalıştıran bir macOS terminali: v2.1.112 banner'ı, başarılı bir /login, &quot;harika, kimsiniz&quot; istemi sen?&quot;, yayınlanmış bir yanıt ve kabuğa temiz bir geri dönüş." width="1708" height="926"><figcaption>Bu komut satırında <code>node</code> yok. <code>/tmp/verify/cc_fptest_dbg25</code>, dağıtılan <code>cli.js</code> dosyasından <code>perry compile</code> ile üretilmiş tek bir yerel yürütülebilir dosya: oturum açıyor, gerçek bir yanıtı akış halinde alıyor ve Ctrl-C ile temiz biçimde kapanıyor. Dosya adı soruyu akla getirdiği için açıklayalım: <code>dbg25</code>, bu yazı hazırlanırken hâlâ süren GC araştırmasındaki tanılama serisinin 25. derlemesi. Hata ayıklama sembolleri içeriyor ve yazma bariyeri atlama optimizasyonu kapalı; dolayısıyla <em>her</em> dizi yazımı bir bariyer üretiyor. Normal bir derlemeye göre daha az değil, daha fazla ek yük taşıyor. Aşağıdaki performans tablosu, tanılama araçları eklenmemiş farklı ikililerle ölçüldü.</figcaption></figure>

## "Claude Code derlemek" gerçekte ne anlama gelir

Derleme hedefi, npm paketinde dağıtılan dosyadır. `npm pack @anthropic-ai/claude-code@2.1.112` size bir `cli.js` verir: **13 MB küçültülmüş, kendi kendine çalışan JavaScript** `#!/usr/bin/env node` shebang. Kaynak yok, kaynak haritası yok, bizim inşa adımımız yok. `perry compile` bu dosyaya değiştirmeden yönlendiririz ve yerel bir yürütülebilir dosya isteriz.

Perry yaklaşık 37 dakika boyunca bunu çiğniyor ve ~180 MB'lık bir ikili dosyaya bağlanan **16.023 işlev** genelinde yaklaşık 207 MB IR üretiyor. Bu işlevlerin her birinin tek harfli adları vardır ve tür ek açıklamaları yoktur ve her şeyin önceden çalışması gerekir; JIT yok, `eval` yok, derleyici yanlış tahminde bulunduğunda yorumlayıcıya tembel bir şekilde yardım etmek yok. Perry bu 16.023 işlevden birini yanlış düşürürse onu yakalayacak hiçbir şey kalmaz.

Puanlama merdiveni dahili stres paketimizden gelir ve kasıtlı olarak affetmez:

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

Önemli olan tek katman `correct`'dur. Node v26 oracle'dır; Node'un yazdırdığı şeyle bayt açısından özdeş olmayan herhangi bir şey, aksi kanıtlanana kadar bir Perry hatasıdır.

## Neden özellikle bu uygulama

Kodlama aracısı CLI, önceden derlenecek, alışılmışın dışında düşmanca bir JavaScript yığınıdır. Bir ikili dosyada şunları elde edersiniz: React aracılığıyla bir terminale uzlaştırma Ink, ham modlu bir stdin okuyucu, her karede normal ifadeleri çalıştıran bir ANSI/emoji doymuş oluşturucu, bir akış SSE HTTP istemcisi, başlangıçta oluşturulan zod şemaları, bir OAuth akışı, `worker_threads`, `MessageChannel`, fiber durumunu tutan WeakMaps, dinamik `require` ve dosya tanımlayıcıya göre stdout'a yazan bir dosya sistemi katmanı.

Bunların her biri, Perry'in farklı bir alt sistemidir ve uygulama bunları *birlikte*, geniş ölçekte, GC baskısı altında, dakikalarca çalıştırır. Kendi test paketlerimiz — 3.000 Rust birim testi, binlerce TypeScript regresyon programı, Node API eşlik matrisi, test262 — tümü bilinen davranışları sabitlemeye yöneliktir. Bu paket, kimsenin sabitlemeyi düşünmediği davranışları bulmaya yöneliktir.

## Engellerin sırası

İş yalnızca tek bir yönde ilerledi: Mevcut duvarı temizleyin, sonrakini bulun. Sıkıştırılmış:

| Tarih| Dönüm Noktası |
| --- | --- |
| 21 Haziran| `--help` yerel olarak çalışır, kod 0'dan çıkın |
| 22 Haziran| Gerçek alt komutlar başlangıçta asılı kalmayı durdurur |
| 23 Haziran| `-p`, api.anthropic.com'a KURULMUŞ bir TCP soketi açar |
| 24 Haziran| zod şemaları doğru şekilde oluşturulur; kimlik doğrulama yoluna ulaşıldı |
| 27 Haziran| TUI görselleri — logo, karşılama kutusu, giriş çerçevesi |
| 9 Temmuz| İlk tam gidiş-dönüş: `-p`, gerçek API'ye karşı yanıtı yazdırır, çıkış 0 |
| 10 Temmuz| Node-vs-Perry diferansiyel kablo demeti: 12/12 aynı |
| 13 Temmuz| `-p` metin + JSON üzerindeki Node ile bayt olarak aynıdır, TUI oluşturma, dosya sistemi |
| 16 Temmuz| Yazılan karakterler sonunda giriş satırında görünüyor |
| 17 Temmuz| Tam döngü elle doğrulandı: başlat → `/login` → API yanıtı → yazma |

Her düzeltme, minimum düzeyde genel bir çoğaltmayla bağımsız bir çekme isteği olarak yukarı yönde ilerledi. Hiçbiri geldikleri uygulamadan bahsetmiyor; bu ilk günden beri bir kuraldı. Değişiklik günlüğünü okuyan bir Perry kullanıcısı, "birinin CLI'sini derlemeye çalışıyorduk" ifadesini değil, "bekleme amaçlı sürücülerde yineleyici ilerlemesini atladığını" "`continue` gördüğünü görüyor. Hatalar, onları ortaya çıkaran araçtan gerçekten bağımsızdır.

## Tartışmaya değer beş yazılım hatası

### 1. MessageChannel kibarca işlem yapılmadı

`--help` 21 Haziran'da çalıştı. Her *gerçek* alt komutu — `doctor`, `agents`, `mcp list` — sonsuza kadar askıda kaldı. Meşgul değil: `sample` park edilmiş işlemi gösterdi, `lsof` hiçbir alt süreç, soket yok, yalnızca iki kanal gösterdi.

Perry’nin `MessageChannel` uygulaması, `postMessage` işlevini hiçbir şey yapmayacak, `onmessage` değerini de `null` olacak şekilde kuruyordu. Bu, macrotask zamanlayıcısı olarak mesaj kanalı kullanan React zamanlayıcı örüntüsüyle karşılaşana kadar zararsız görünüyor:

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

İleti bırakıldı, geri arama hiç yapılmadı ve olay döngüsü kendi uyandırma kanalında sonsuza kadar boşta kaldı. [#5530](https://github.com/PerryTS/perry/pull/5530) bağlantı noktalarına gerçek aynı iş parçacığı teslimatı sağladı; dolaşmış çiftler, bir FIFO kuyruğu, `setImmediate` makro görevi aracılığıyla teslimat ve bir GC kök tarayıcısı sayesinde sıradaki iletiler bir koleksiyonda hayatta kalır.

### 2. Object.prototype'taki bir erişimcinin maliyeti 42 saniyedir

Askıda kalmadan önce, aynı alt komutlar onlarca saniye boyunca CPU'ya bağlıydı. Profil oluşturma, genel `[[Set]]` yoluna işaret ediyordu ve temel neden, süreç genel işaretiydi.

Perry, dinamik özellik yazımı için hızlı bir yola sahiptir ve "`Object.prototype` şu anda herhangi bir tanımlayıcı taşıyor mu?" Paket, başlangıçta `Object.prototype`'a tam olarak bir erişimci yükler. Bu, süreç genelinde bayrağı tersine çevirdi ve o andan itibaren programdaki *her* dinamik yazma, O(own-key-count) olan yavaş müdahale yürüyüşünü gerçekleştirdi. Geniş bir nesne oluşturmak ikinci dereceden hale geldi:

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) genel bayrağı anahtar başına bir soruyla değiştirdi — *`Object.prototype`'un **bunun için kendi özelliği var mı** anahtar?* Eksik bir anahtara müdahale edilemez, dolayısıyla yazma işlemi hızlı yol için güvenlidir. 42 sn → 23 ms, müdahale hâlâ doğru.

Daha sonra aynı şekil, hızlı yolun tamamen hariç tuttuğu sınıf örnekleri için yeniden ortaya çıktı: düz bir nesne üzerinde 20.000 anahtarlı bir derleme 25 ms, `class` örneğinde 44 saniye sürdü. Bunu dikkatli bir şekilde düzeltmek önemliydi (naif bir prototip zinciri kontrolü, devralınan ayarlayıcıları atlayabilir ve verileri sessizce bozabilirdi) bu nedenle [#5528](https://github.com/PerryTS/perry/pull/5528), örneğin prototipini sınıf kaydı aracılığıyla çözer ve bir O(1) geniş anahtar dizini ekler. 30 ms'ye geri dönüldü ve tekrar doğrusal hale getirildi.

### 3. Yalnızca gerçek API'nin tetikleyebileceği hata

İnsanlara bahsettiğimiz şey budur. Temmuz ayı başlarında derlenen ikili dosya, yerel sahte sunucumuza karşı tam bir `-p` dönüşü yapacaktır: bağlanın, POST, SSE akışını okuyun, yanıtı yazdırın, 0'dan çıkın. Gerçek Anthropic API her seferinde sonsuza kadar askıda kalıyordu.

Hata ayıklama zinciri şu şekildeydi: bir ileri proxy taklidi, tam 200 yanıtın bozulmadan geldiğini kanıtladı → bir tekrar oynatma taklidi, yakalanan gerçek bayt akışını besledi, askıda kalmayı yerel olarak yeniden üretti → SSE olay listesini ikiye bölerek suçlu olayı buldu → on satırlık bir çoğaltma.

Gerçek API, `event: ping` çerçeveleri gönderir. Bizim taklitimiz asla işe yaramadı. Ve `ping`, SDK'nın akış döngüsünün çıplak bir `continue` ile atladığı tek olaydır. Perry, `for await`'i, yineleyici ilerlemesi döngü gövdesinin *altında* yer alan bir sürücüye indirdi:

```
// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}
```

Altı ayrı indirme alanı aynı şekle sahipti. [#6196](https://github.com/PerryTS/perry/pull/6196) ilerlemeyi tümünde zirveye taşıdı. Yeniden öğrenmeye devam ettiğimiz ders: Geçip giden bir taklit, sahtenin kanıtıdır.

### 4. Kendi kalıp dizesinden daha uzun süre dayanan bir normal ifade

TUI saniyeler içinde `SIGBUS`'u oluşturur ve ölür; pencereyi yeniden boyutlandıran bir stres koşum takımı altında, her seferinde farklı işlevlerde farklı adreslerde 12 çalıştırmada 12 çökme. Haftalar süren inceleme, A/B testinin daha sonra çürüttüğü GC teorileri üzerinde yapıldı; bunların arasında, sağlam olmadığı ortaya çıkan ve geri çekilmesi gereken kendi "düzeltmelerimizden" biri de vardı.

Asıl temel neden dört satırlık Rust'dı. `js_regexp_new` bir RegExp başlığı ayırır ve `pattern` ve `flags` dize işaretçilerini ham yazmalarla saklar - **yazma engeli yok**. Koleksiyoncunun kenardan hiç bahsetmediği, yeni ve genç bir ipi işaret eden eski nesil bir nesne. Küçük GC, bu dizeleri canlı bir RegExp'in altından taradı ve serbest bırakılan yuvanın bir sonraki okumasında hata oluştu.

Bu neden yalnızca burada göründü? Terminal kullanıcı arayüzü normal ifadelerle doyurulduğundan (ANSI ayrıştırma ve emoji genişlik ölçümü çalıştırma desenleri her karede) olduğundan, ayırma ve toplama arasındaki pencere dakikada binlerce kez geçilir. Minimum çoğaltmamız, 6.000 normal ifade ve kasıtlı tahsis kaybımız, bunu *hiçbir zaman* tetiklemedi. Paket her seferinde tetikledi. [#6288](https://github.com/PerryTS/perry/pull/6288) her iki alanın da her zaman ihtiyaç duyduğu bariyeri ekledi.

### 5. Yazdığınız karakterler oradaydı. Çerçeve onları çöpe attı.

En inatçı duvar: Kullanıcı arayüzünün tamamı mükemmel bir şekilde boyanmıştır — karşılama kutusu, giriş çerçevesi, imleç bloğu, durum satırı. `/` yazıldığında komut menüsü açıldı, dolayısıyla tuş vuruşu React'ye ulaşıyordu. Ancak harfler hiçbir zaman giriş satırında görünmüyordu.

Araçlı derlemeler, Perry'in yazılan karakteri her aşamada doğru şekilde boyadığını ve ardından `onRender`'ın boyamadan *sonra* bir Ink `try/catch`

Bu tek belirtinin arkasında iki bağımsız hata saklanıyordu:

-   [#6453](https://github.com/PerryTS/perry/pull/6453) — Perry'nin `charAt`/`codePointAt`/`split`, gerekli zorlanabilirlik koruması olmadan dize olmayan bir alıcıda ToString'i çağırdı. Yani `undefined.codePointAt(0)`, atmak yerine sessizce `117`'yi (`"u"`'nin kod noktası) `"undefined"` dizesinden döndürdü. Makul verileri *icat eden* bir hata, çöken bir hatadan çok daha kötüdür.

-   [#6471](https://github.com/PerryTS/perry/pull/6471) — gerçek engelleyici. Bir dizi büyüdüğünde, Perry eski adreste kalıcı bir yönlendirme koçanı bırakır. Küçük tarama, eski nesil bir ebeveyn hâlâ bir tanesini işaret ederken bu taslakları geri almaktı: oluşturucunun karakter önbelleği, kirli olmayan bir sayfada bir büyüme öncesi işaretçiyi tutuyordu. Eski taslakları okumak gereksiz bir uzunluk oluşturdu ve her kare iptal edildi. Reşit olmayanlar artık tüm taslakları elinde tutuyor; tam izler onları işaretleyerek geri alır.


Açığa çıkanlar üçüncü bir katmanla düzeltiliyor; artımlı işaretleme sırasında siyah olarak doğan nesneler hiçbir zaman izlenmedi, bu nedenle yalnızca bunların içinden erişilebilen her şey canlıyken süpürüldü ([#6494](https://github.com/PerryTS/perry/pull/6494)) ve düzen maskesi taşma yuvalarını eksik raporladı, bu nedenle toplayıcı bunları atladı ([#6506](https://github.com/PerryTS/perry/pull/6506)). Bu ikisi, *herhangi bir* derlenmiş programda ellide bir gizemli çökmeye neden olan türden sağlamlık delikleridir. Onları bir test paketiyle bulamazdık.

## 13 MB'lık küçültülmüş ikili dosyanın hatalarını nasıl ayıklarsınız

Yukarıdakilerin hiçbiri kod okunarak bulunamaz. Bunu izlenebilir kılan araçlar:

-   **Referans olarak Node kullanan bir karşılaştırmalı test düzeneği.** Her hipotez, hem `node --experimental-strip-types` altında hem de Perry ikilisi olarak çalıştırılan, çıktıları bayt bayt karşılaştırılan küçük bir TypeScript programına dönüşüyor. Düzenek kendi başına da hatalar buldu: yalnızca bir `instanceof` ifadesinin sağ tarafında kullanılan bir sınıf ifadesi, on bir analiz geçişi bu düğüm türünün içini göremediği için ölü kod olarak siliniyordu ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Üç sahte API sunucusu.** Bir günlük kaydı örneği, gerçek yanıt baytlarını yakalayan bir ileri proxy ve bu tam baytları belirleyici bir şekilde geri besleyen bir yeniden oynatma sunucusu. Tekrar sunucusu, "prodüksiyona bağlı kalmayı" yerel bir reprodüksiyona dönüştüren şeydir.

-   **Terminal sorgularına yanıt veren bir PTY koşum takımı.** Aptal bir sözde terminal size 50 bayt ve bir duraklama kazandırır. Uygulama, imleç konumunu (`ESC[6n`), cihaz özelliklerini (`ESC[c`) ve arka plan rengini (`OSC 11`) araştırır ve boyamadan önce yanıtları bekler. Bunları yanıtladığınızda 3.331 baytlık karşılama ekranının tamamına ve Node ile Perry arasında baytlarla karşılaştırılabilir bir işlemeye sahip olursunuz.

-   **Sembolleştirme için bağlantı haritaları.** Çıkartılmış 180 MB ikili dosyalar, ham ofsetlerle dolu kilitlenme raporları üretir; `ld64 -map` çıktısı artı ikiye bölünmüş bir komut dosyası, bunları tekrar işlev adlarına dönüştürür.

-   **A/B her şey.** Devir notlarının en üstünde büyük harflerle yazılan kural ortaya çıktı: *asla bir teoriyi devralmayın - onu test edin.* Bir hata için birbirini takip eden dört temel neden hipotezinin her biri A/B çalıştırmalarıyla çürütüldü. Günlerce takip ettiğimiz bir doğrulama sinyalinin ("445 eksik eski → genç kenarlar") bir ölçüm ürünü olduğu ortaya çıktı - kontrol, hatırlanan setin temizlenmesi ve geri yüklenmesi arasında gerçekleştirildi. Kodun kendi yorumu bu konuda uyarıda bulundu.


## Gerçekte durduğu yer

Dürüst olmak gerekirse: çalışıyor ve yavaş.

Bugün çalışanlar, çıktının karşılaştırılabildiği yerlerde Node ile bayt bayt aynı: açılış, `--help`, `--version`, hata sınıflandırması ve JSON zarfı dahil gerçek API’ye karşı tek seferlik `-p` modu, TUI’ın tamamının çizilmesi, OAuth `/login` akışı, akış halinde yanıtlar ve yazı girişi. İşte tek kayıtta tüm döngü: açılış → `/login` → bir soru → akış halinde yanıt → çıkış:

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Tarayıcınız gömülü videoyu desteklemiyor.</video><figcaption>63 saniye, ses yok, iki yerde kesilmiş: OAuth el sıkışmasının tarayıcı yarısı ve başıboş bir macOS anahtarlık istemi. Terminaldeki her şey gerçek zamanlı ve düzenlenmemiştir; bu yazıdaki en yavaş şey olan başlatma gecikmesi de dahil.</figcaption></figure>

İki şey hâlâ açık ve bunlar pekâlâ tek bir şey olabilir. Giriş, yaklaşık bir dakikalık sürekli etkileşimli kullanımdan sonra kaydedilmeyi durdurur; kilitlenme yok, hata yok, sadece duruyor. Ve `ESC`, uçuş sırasındaki yanıtı kesmez, ancak `Ctrl-C` artık temiz bir şekilde çıksa da, bunu bir hafta önce yapmamıştı (bu, kaydın sonunda gördüğünüz çıkıştır). Bir kesme yolu, giriş ölümüyle aynı şüpheliyi işaret etmediğinde çalışan bir çıkış yolu: uygulamanın kendi işleyicilerindeki herhangi bir sorun yerine, uygulamaya erişimi durduran tuşa basma olayları.

Doğruluğun geldiği gün başlayan hız kampanyasının ilk turundan önce ve sonra, aynı paketi çalıştıran Node'e göre ölçülen performans resmi. Bunlar, 17 Temmuz'da `cc_final` ve `cc_perf2`'den çıktı; yukarıdaki ekran görüntüsündeki araçlı ikili dosya değil, herhangi bir teşhisin derlenmediği sıradan derlemeler:

| Metrik| Node| Perry (17 Temmuz)| Perry (sonra) |
| --- | --- | --- | --- |
| `--version` | 328 ms| 1.168 ms| **227 ms** |
| `--help` | 715 ms| 5.071 ms| 4.099 ms |
| TUI ilk boyama| 0.76 s | 10.9 s | 8.4 s |
| Tuş vuruşu → boyama (p50)| 2,2 ms| 111–143 ms| 119–138 ms |
| Bellek alanı, boşta| 290 MB düz| ~420 MB tırmanış| ~420 MB tırmanış |

`--version` artık **Node** geride bırakıyor ve kazanç köken olarak utanç vericiydi: derlenen yürütülebilir dosya 300.281 sembol dışa aktarıyordu, yani bu başlatmanın ~% 80'i dyld zayıf tanımlı birleştirme yapıyor. Bir bağlayıcı bayrağı, dışa aktarımı 3'e ve ikili dosyayı 228 MB'tan 197 MB'a çıkardı ([#6533](https://github.com/PerryTS/perry/pull/6533)). Her benzersiz normal ifadeyi iki kez yerine bir kez oluşturmak ([#6534](https://github.com/PerryTS/perry/pull/6534)) ve mağaza başına müdahale kontrolünü önbelleğe almak ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) geri kalanını aldı.

Bu 197 MB'ta, kimse ona ulaşmadan önce: Perry kendi çalışma zamanını statik olarak bağlar ve 16.023 işlevin tümü için makine kodunu önceden yayınlayarak hiçbir şeyi ortadan kaldıramaz — kendi kendini çalıştıran bir paket, aslında her şeyi erişilebilir kılar, dolayısıyla çapraz paket yoktur DCE — bu, 197 MB'ın tüm programın *artı* tek bir dosyadaki çalışma süresi olduğu anlamına gelir; **138 MB'a karşılık Node v26 ikili programı, JavaScript**.

Tuş vuruşu satırı dikkatlice okunması gereken satırdır çünkü "sonraki" rakamı daha kötü görünür. Öyle değil: Bunlar tekrarlanan koşular arasındaki aralıklardır ve örtüşürler, dolayısıyla medyan her iki yönde de hareket etmedi; bu, bir gerileme değil, koşudan koşuya varyanstır. Ayrıca tam da beklediğimiz gibi oldu. Her üç değişiklik de bağlantı adımına, normal ifade yapısına ve *depolama* yoluna dokunuyor; tuş vuruşu medyanı, özellik *okuma* yolu, çağrı başına köklendirme ek yükü ve tuşa basma pencerelerine inen 40-80 ms'lik GC adımlarının hakimiyetindedir. Kanıt bir sonraki turda geldi: Hızlı şeritleri al/ayarla, saha erişimi mikro karşılaştırmasını 3 kat daha hızlı hale getirdi ve bu sayıyı hiçbir şey değiştirmedi ([#6539](https://github.com/PerryTS/perry/pull/6539)). Uygulamada görünmeyen bir mikro kıyaslama zaferi, yanlış bir teşhistir ve biz de öyle bir teşhis koyduk.

Bellek satırı geçerli kampanyadır. Perry'nin kopyalama toplayıcısı *sıkıştırabilir*; sorun şu ki, yaklaşık olarak her 45 saniyelik boşta kalma süresinde bir kez uygun hale gelir, bu nedenle, Node sürekli olarak sıkıştırılarak düz kalırken, çocuk odası tetiklemeler arasında ~300 MB'a kadar yeniden büyür. Bu bir algoritma sorunu değil, tetikleme frekansı sorunudur. Bu da Haziran ayında bulunduğumuz yerden çok daha iyi bir nokta.

Hiçbiri park edilmemiş. Bu gönderi ilerledikçe bellek ve performans kampanyası *yayına* çıkıyor - GC tetikleyici çalışması bugün tam olarak bu ikili dosyada çalışıyor - dolayısıyla yukarıdaki performans tablosu bu gönderinin geçersiz kılmayı en çok beklediğimiz kısmıdır ve ne kadar erken olursa o kadar iyidir. Doğruluğun aşılması bir ay sürdü. Geriye kalan, tetikleme frekansı sorunu ve okuma yolu sorunudur; her ikisi de anlaşılmıştır ve her ikisi de halihazırda uçuş halindedir. Bu şeyin yalnızca doğru olmaktan ziyade sorunsuz olmasını bekliyoruz ve yakında olmasını bekliyoruz.

## Bunu neden yapıyoruz

160 düzeltmenin hiçbiri Claude Code ile ilgili değil. RegExp başlıklarında eksik bir yazma engeli, yük altında normal ifadeler oluşturan *herhangi bir* programdaki belleği bozar. Herhangi bir akış tüketicisinde `continue` dönüşleriyle `for await`. `MessageChannel`'ın mesaj bırakması, tüm React-scheduler şekilli uygulamaları bozar. `Object.prototype` tanımlayıcı işareti, en geniş nesnesinde `Object.prototype`'a dokunan *her* programı ikinci dereceden yaptı.

Bu hataların tümü Perry'de mevcutken CI yeşil renkteydi, test262 sayıları artarken Node eşlik matrisi %97 olduğunu söylüyordu. Onları serbest bırakmak için, başka birinin küçültülmüş JavaScript'inin on üç megabaytının, gerçek bir terminaldeki gerçek bir API ile gerçek iş yapması gerekti.

Bir şey daha var, o da bizim en komik bulduğumuz kısım. Perry tek başına elle yazılmamıştır; *bu* kampanyanın büyük bir kısmı da dahil olmak üzere büyük bir kısmı Claude Code ile yazılmıştır. Sahte sunucular, PTY donanımı, diferansiyel çalıştırıcı, sabahın dördünde bir GC hatasını ikiye bölerek geçen uzun geceler: temsilci oturumları, bir insan tarafından incelendi ve birleştirildi. Perry'nin tamamı değil ve pek çok tartışma da yok değil. Ancak bu cümlenin her iki açıdan da doğru olması yeterlidir.

Claude Code'u yiyen derleyici, büyük ölçüde Claude Code tarafından oluşturulmuştur.

Bunu yapmaya devam edeceğiz. Sonraki hedefler zaten sıraya alındı.

* * *

Perry, Anthropic'e bağlı değildir veya onu desteklememektedir. Claude Code, Anthropic PBC'nin ticari markasıdır. Burada açıklanan ikili dosya, yalnızca derleyici test hedefi olarak herkese açık olarak yayınlanan npm paketinden oluşturulmuştur ve dağıtılmamaktadır.
