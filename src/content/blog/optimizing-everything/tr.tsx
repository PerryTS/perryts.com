export default function Content() {
  return (
    <>
      <p>
        Son blog yaz&inodot;s&inodot; Perry v0.5.12 ile yay&inodot;nlanm&inodot;&scedil;t&inodot;. Bug&uuml;n v0.5.80&apos;deyiz. Bu <strong>yedi g&uuml;nde 68 patch s&uuml;r&uuml;m&uuml;</strong>, neredeyse tamamen tek bir &scedil;eye odaklanm&inodot;&scedil; durumda: kalan her yava&scedil; yolu h&inodot;zl&inodot; bir yola d&ouml;n&uuml;&scedil;t&uuml;rmek.
      </p>
      <p>
        v0.5.0&apos;daki LLVM ge&ccedil;i&scedil;i v0.5.12 itibar&inodot;yla Cranelift ile e&scedil;it seviyeye geri d&ouml;nd&uuml;. Bu bir hikayenin sonu ve ba&scedil;kas&inodot;n&inodot;n ba&scedil;lang&inodot;c&inodot;yd&inodot;. LLVM art&inodot;k her &scedil;eyi g&ouml;r&uuml;yor. Soru art&inodot;k &ldquo;bu neden yava&scedil;?&rdquo; olmaktan &ccedil;&inodot;kt&inodot; ve &ldquo;bu neden zaten h&inodot;zl&inodot; de&gbreve;il?&rdquo; olmaya ba&scedil;lad&inodot; &mdash; ki bu &ccedil;ok daha ele al&inodot;nabilir bir soru.
      </p>
      <p>
        Bu yaz&inodot; o haftan&inodot;n bir turu. JSON 547x h&inodot;zlanma ald&inodot;. mimalloc global allocator oldu. &Ouml;zellik eri&scedil;imi monomorfik bir inline cache kazand&inodot;. Buffer&apos;lar <code>noalias</code> metadata&apos;s&inodot; ile tipli pointer slotlar&inodot; kazand&inodot;. Fastify ve WebSocket sunucular&inodot; bir dakika sonra &ccedil;&ouml;kmeyi b&inodot;rakt&inodot;. Ve benchmark&apos;lar yeniden hareket etti.
      </p>

      <h2>1. JSON: 547x u&ccedil;urumu kapatmak</h2>
      <p>
        v0.5.29&apos;da Perry&apos;nin JSON.parse&apos;&inodot;, 20 kay&inodot;tl&inodot; bir dizide <strong>Node&apos;dan 547 kat daha yava&scedil;t&inodot;</strong>. v0.5.46 itibar&inodot;yla 1,3 kat. Bu rakam haftan&inodot;n tek ba&scedil;&inodot;na en b&uuml;y&uuml;k deltas&inodot; ve ad&inodot;m ad&inodot;m anlatmaya de&gbreve;er &ccedil;&uuml;nk&uuml; bu yaz&inodot;daki di&gbreve;er her optimizasyon ayn&inodot; temaya ait bir varyasyon: yapmak zorunda olmad&inodot;&gbreve;&inodot;n&inodot;z i&scedil;i yapmay&inodot;n.
      </p>
      <p>
        Orijinal parser, her &ouml;zellik i&ccedil;in bir Vec, her nesne i&ccedil;in bir anahtar Vec&apos;i ve anahtar cache&apos;i i&ccedil;in RefCell korumal&inodot; bir thread-local ay&inodot;r&inodot;yordu. Her string&apos;i kopyal&inodot;yordu. Her alan ad&inodot;n&inodot; yeniden hash&apos;liyordu. Her kay&inodot;t i&ccedil;in yepyeni bir nesne &scedil;ekli olu&scedil;turuyordu, 20 kayd&inodot;n tamam&inodot; ayn&inodot; alanlar&inodot; ayn&inodot; s&inodot;rada i&ccedil;erse bile. Node&apos;un parser&apos;&inodot; bu deseni fark edip t&uuml;m kay&inodot;tlar aras&inodot;nda tek bir &scedil;ekli payla&scedil;arak hallediyor. Perry&apos;ninki halletmiyordu.
      </p>
      <p>D&uuml;zeltme d&ouml;rt ad&inodot;mda geldi:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Thread-local bir <code>PARSE_KEY_CACHE</code> &uuml;zerinden anahtar interning</strong> (v0.5.45). &Inodot;lk kay&inodot;t N anahtar string ay&inodot;r&inodot;yor; 2&apos;den 20&apos;ye kadar olan kay&inodot;tlar s&inodot;f&inodot;r ay&inodot;r&inodot;yor. Tekrarlanan anahtarlar ayn&inodot; pointer&apos;a &ccedil;&ouml;z&uuml;n&uuml;r, bu da onlar&inodot; strcmp olmadan shape-cache arama anahtarlar&inodot; olarak kullan&inodot;labilir k&inodot;lar.</li>
        <li><strong>Transition cache &uuml;zerinden &scedil;ekil payla&scedil;&inodot;m&inodot;</strong> (v0.5.45). <code>js_object_set_field_by_name</code> taraf&inodot;ndan olu&scedil;turulan nesneler ayn&inodot; transition grafi&gbreve;inde dola&scedil;&inodot;r. &Scedil;ema tekrarland&inodot;&gbreve;&inodot;nda <code>keys_array</code> pointer&apos;&inodot; payla&scedil;&inodot;l&inodot;r ve polimorfik inline cache&apos;in isabet etmesi i&ccedil;in ihtiya&ccedil; duydu&gbreve;u tam da budur.</li>
        <li><strong>S&inodot;f&inodot;r kopyal&inodot; string parsing + artan &scedil;ekilde nesne in&scedil;as&inodot;</strong> (v0.5.46). <code>parse_string_bytes</code> art&inodot;k ters b&ouml;len ka&ccedil;&inodot;&scedil; olmad&inodot;&gbreve;&inodot;nda <code>ParsedStr::Borrowed(&amp;[u8])</code> d&ouml;nd&uuml;r&uuml;yor &mdash; ki bu her anahtar ve &ccedil;o&gbreve;u de&gbreve;er i&ccedil;in ortak durum. <code>parse_object</code> &ouml;nce bir Vec&apos;e toplamak yerine alanlar&inodot; do&gbreve;rudan yaz&inodot;yor.</li>
        <li><strong>Parse s&inodot;ras&inodot;nda GC bask&inodot;lama</strong> (v0.5.60, #59 kapan&inodot;r). B&uuml;y&uuml;k bir dizinin parse edilmesi s&inodot;k&inodot; bir d&ouml;ng&uuml;de binlerce k&uuml;&ccedil;&uuml;k nesne ay&inodot;r&inodot;yor. Her biri GC e&scedil;ik kontrol&uuml;n&uuml; g&inodot;d&inodot;kl&inodot;yordu. &ldquo;parse devam ediyor&rdquo; bayra&gbreve;&inodot; ayarlanmas&inodot;, parse d&ouml;nene kadar toplamay&inodot; erteliyor &mdash; etkin heap boyutu ayn&inodot;, bookkeeping dallanmas&inodot; &ccedil;ok daha az.</li>
      </ol>
      <p>
        Sonra stringify. Homojen diziler &uuml;zerinde JSON.stringify &mdash; ayn&inodot; &scedil;ekil, milyonlarca kez &mdash; nesne ba&scedil;&inodot;na tam &ouml;zellik iterasyonu yap&inodot;yordu, ki bu &scedil;ekil kararl&inodot; bir dizi i&ccedil;in saf israf. Be&scedil; ad&inodot;ml&inodot; bir d&uuml;zeltme bu u&ccedil;urumun da b&uuml;y&uuml;k k&inodot;sm&inodot;n&inodot; kapatt&inodot;:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: say&inodot;lar i&ccedil;in itoa / ryu h&inodot;zl&inodot; yollar&inodot;, HashSet yerine derinli&gbreve;e dayal&inodot; d&ouml;ng&uuml;sel referans kontrol&uuml;.</li>
        <li>v0.5.63: <code>toJSON</code> koruyucusu + kal&inodot;c&inodot; anahtar cache&apos;i + inline dispatch (birikip toplam olu&scedil;turan &ccedil;a&gbreve;r&inodot; ba&scedil;&inodot;na &uuml;&ccedil; maliyet).</li>
        <li>v0.5.65: homojen &scedil;ekilli stringify &scedil;ablonu + ASCII ka&ccedil;&inodot;&scedil; h&inodot;zl&inodot; yolu. Her eleman ayn&inodot; &scedil;ekle sahip oldu&gbreve;unda anahtar/iki nokta/virg&uuml;l iskelesi bir kez &ouml;nceden hesaplan&inodot;r.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: &ccedil;a&gbreve;r&inodot; ba&scedil;&inodot;na shape-&scedil;ablon cache&apos;i, parse-kalan&inodot; GC a&ccedil;&inodot;&gbreve;&inodot;n&inodot; kapa, kalan sabit &ccedil;a&gbreve;r&inodot; ba&scedil;&inodot;na y&uuml;k&uuml; yok et.</li>
        <li>v0.5.79: k&uuml;&ccedil;&uuml;k de&gbreve;er yolu. Say&inodot;lar, boolean&apos;lar ve k&inodot;sa stringler, nesne mekanizmas&inodot;n&inodot;n hi&ccedil;birini kurmayan do&gbreve;rudan bir yoldan ge&ccedil;er.</li>
      </ul>
      <p>
        Birikmi&scedil; sonu&ccedil;: haftan&inodot;n ba&scedil;&inodot;nda <strong>Node&apos;dan 547x uzak</strong> olan bir JSON pipeline&apos;&inodot; art&inodot;k ger&ccedil;ek&ccedil;i i&scedil; y&uuml;klerinde <strong>parse&apos;ta kabaca 1,3x uzakta ve stringify&apos;da rekabet&ccedil;i</strong>.
      </p>

      <h2>2. Allocator hikayesi</h2>
      <p>
        Perry &ccedil;ok &scedil;ey ay&inodot;r&inodot;yor. Her nesne literali, her dizi literali, her string birle&scedil;tirme, her closure. Allocator s&inodot;cak ve v0.5&apos;in &ccedil;o&gbreve;u i&ccedil;in Rust&apos;&inodot;n varsay&inodot;lan sistem allocator&apos;&inodot; art&inodot; k&inodot;sa &ouml;m&uuml;rl&uuml; de&gbreve;erler i&ccedil;in bir thread-local arena idi.
      </p>
      <p>
        v0.5.67 global allocator&apos;&inodot; <strong>mimalloc</strong> ile de&gbreve;i&scedil;tirdi. Bu, Cargo.toml&apos;da tek sat&inodot;rl&inodot;k bir de&gbreve;i&scedil;iklik ve &ccedil;ok say&inodot;da k&uuml;&ccedil;&uuml;k ay&inodot;rma yapan herhangi bir i&scedil; y&uuml;k&uuml;nde &mdash; ki bu her TypeScript program&inodot; demek &mdash; hemen kar&scedil;&inodot;l&inodot;&gbreve;&inodot;n&inodot; veriyor. v0.5.66 bundan &ouml;nce geldi ve t&uuml;m <code>gc_malloc</code> thread-local state&apos;ini &ccedil;a&gbreve;r&inodot; ba&scedil;&inodot;na tek bir TLS eri&scedil;iminde birle&scedil;tirdi, b&ouml;ylece mimalloc&apos;a giden yol m&uuml;mk&uuml;n oldu&gbreve;u kadar ucuzdu.
      </p>
      <p>
        v0.5.68 bunu <strong>arena&apos;da ay&inodot;r&inodot;lan stringler</strong> ile daha ileri g&ouml;t&uuml;rd&uuml;. K&inodot;sa &ouml;m&uuml;rl&uuml; stringler (ara concat sonu&ccedil;lar&inodot;, <code>split()</code> par&ccedil;alar&inodot;, parser &ccedil;al&inodot;&scedil;ma alan&inodot;) global allocator&apos;&inodot; tamamen atl&inodot;yor ve do&gbreve;al s&inodot;n&inodot;rlarda s&inodot;f&inodot;rlanan thread ba&scedil;&inodot;na bir bump arena&apos;ya in&scedil; ediyor. JSON parsing i&ccedil;in bu tek ba&scedil;&inodot;na iki haneli y&uuml;zde kazanc&inodot;yd&inodot;.
      </p>
      <p>
        Ve hi&ccedil; ay&inodot;rma yapmayan iki optimizasyon:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Ka&ccedil;mayan nesnelerin skaler yerine ge&ccedil;mesi</strong> (v0.5.17, sonra v0.5.76&apos;da nesne literalleri). Bir nesne kendisini &ccedil;evreleyen fonksiyondan asla &ccedil;&inodot;km&inodot;yorsa, var olmas&inodot; gerekmez. Alanlar&inodot; s&inodot;radan local&apos;lara d&ouml;n&uuml;&scedil;&uuml;r. LLVM, nesneyi opak bir allocator &ccedil;a&gbreve;r&inodot;s&inodot;n&inodot;n arkas&inodot;nda gizlemeyi b&inodot;rakt&inodot;&gbreve;&inodot;n&inodot;zda bunu kutudan &ccedil;&inodot;kan haliyle halleder.</li>
        <li><strong>Ka&ccedil;mayan dizilerin skaler yerine ge&ccedil;mesi</strong> (v0.5.73). Ayn&inodot; fikir &mdash; dizi ka&ccedil;m&inodot;yorsa, elemanlar&inodot; SSA de&gbreve;erlerine d&ouml;n&uuml;&scedil;&uuml;r ve t&uuml;m ay&inodot;rma ortadan kalkar.</li>
      </ul>
      <p>
        Dizi literali yolu i&ccedil;in &ouml;zellikle v0.5.69 <strong>tam boyutlu bir h&inodot;zl&inodot; yol</strong> ekledi (boyut derleme zaman&inodot;nda bilindi&gbreve;inde kapasite-b&uuml;y&uuml;tme mekanizmas&inodot;n&inodot; atla) ve v0.5.74 k&uuml;&ccedil;&uuml;k dizi literalleri i&ccedil;in bump allocator IR&apos;sini inline yapt&inodot; b&ouml;ylece LLVM ay&inodot;rmay&inodot; g&ouml;rebilir, katlayabilir, hoist edebilir veya elimine edebilir. Dizi a&gbreve;&inodot;rl&inodot;kl&inodot; benchmark&apos;lar bir ad&inodot;m daha hareket etti.
      </p>
      <p>
        Kapan&inodot;&scedil; olarak, v0.5.25 daha sessiz bir hatay&inodot; d&uuml;zeltti: <code>gc_malloc</code> kendi yolunda toplama tetiklemiyordu, dolay&inodot;s&inodot;yla malloc-a&gbreve;&inodot;rl&inodot;kl&inodot; i&scedil; y&uuml;kleri herhangi bir kontrol yap&inodot;lmadan &ouml;nce heap&apos;i s&inodot;n&inodot;rs&inodot;z &scedil;ekilde b&uuml;y&uuml;tebiliyordu. v0.5.61 e&scedil;i&gbreve;e adaptif ad&inodot;m boyutlama ekledi, ki asl&inodot;nda istedi&gbreve;iniz &scedil;ey budur: heap k&uuml;&ccedil;&uuml;kken ucuza kontrol et, b&uuml;y&uuml;kken daha seyrek kontrol et.
      </p>

      <h2>3. &Ouml;zellik eri&scedil;imi ger&ccedil;ek bir inline cache kazand&inodot;</h2>
      <p>
        Her modern JavaScript motorunun &ouml;zellik eri&scedil;imi &uuml;zerinde polimorfik bir inline cache&apos;i (PIC) vard&inodot;r. Perry&apos;nin v0.5 serisinin &ccedil;o&gbreve;u i&ccedil;in PropertyGet, thread-local bir hash ile shape-tablo aramas&inodot;ndan ge&ccedil;iyordu. So&gbreve;uk kod i&ccedil;in bu iyi. Belirli bir &ccedil;a&gbreve;r&inodot; konumundaki &ouml;zellik okumalar&inodot;n&inodot;z&inodot;n %95&apos;i ayn&inodot; &scedil;ekli g&ouml;rd&uuml;&gbreve;&uuml;nde &mdash; ki neredeyse her zaman &ouml;yledir &mdash; iyi de&gbreve;il.
      </p>
      <p>
        v0.5.44, <code>PropertyGet</code> i&ccedil;in <strong>monomorfik bir inline cache</strong> getirdi. Her PropertyGet konumu, konum ba&scedil;&inodot;na bir cache giri&scedil;i al&inodot;r: beklenen bir &scedil;ekil pointer&apos;&inodot; ve bir alan offset&apos;i. Hit yolu tek bir kar&scedil;&inodot;la&scedil;t&inodot;rma art&inodot; indeksli bir y&uuml;klemedir. Miss yolu, cache&apos;i g&uuml;ncelleyen yava&scedil; bir helper&apos;a d&uuml;&scedil;er.
      </p>
      <pre><code>{`; obj.foo i&ccedil;in monomorfik IC h&inodot;zl&inodot; yolu
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... val&apos;&inodot; kullan
  br label %cont`}</code></pre>
      <p>
        v0.5.51 dinamik &ouml;zellik yazmalar&inodot; i&ccedil;in <strong>i&ccedil;erik-hash shape-transition cache&apos;i</strong> ekledi. Ayn&inodot; alanlar&inodot; ayn&inodot; s&inodot;rada b&uuml;y&uuml;ten iki nesne ayn&inodot; transition&apos;a hash edilir, dolay&inodot;s&inodot;yla ayn&inodot; &scedil;ekli payla&scedil;&inodot;rlar &mdash; ve bu da PIC&apos;in okuma taraf&inodot;n&inodot;n ger&ccedil;ekten isabet etmesi anlam&inodot;na gelir.
      </p>
      <p>
        v0.5.55 transition cache&apos;inden son TLS eri&scedil;imini de &ccedil;&inodot;kard&inodot;. v0.5.46, &gt;8 alan&inodot; olan nesnelerin inline slot&apos;lar&inodot;n &ouml;tesine, ba&scedil;lat&inodot;lmam&inodot;&scedil; belle&gbreve;e okuma yapt&inodot;&gbreve;&inodot; bir PIC miss-handler hatas&inodot;n&inodot; d&uuml;zeltti (#55 kapan&inodot;r). v0.5.78, PropertyGet&apos;in PIC&apos;ini ham say&inodot;lar gibi pointer olmayan al&inodot;c&inodot;lara indekslemekten alakoyan bir koruyucu ekledi &mdash; ki bu fazla iyimser tip daralt&inodot;m&inodot;nda olabiliyordu ve IC&apos;deki son kararl&inodot;l&inodot;k sorunlar&inodot;ndan biriydi.
      </p>
      <p>
        Net etki: &ouml;zellik a&gbreve;&inodot;rl&inodot;kl&inodot; kod &mdash; pratikte &ccedil;o&gbreve;u TypeScript demek &mdash; sadece IC sayesinde bir hafta &ouml;ncekinden kabaca 2-3x daha h&inodot;zl&inodot;.
      </p>

      <h2>4. Tamsay&inodot;lar, bitwise ve <code>| 0</code> kal&inodot;b&inodot;</h2>
      <p>
        NaN-boxing her say&inodot;y&inodot; bir f64 yapar. TypeScript programc&inodot;lar&inodot; tamsay&inodot; semanti&gbreve;i zorlamak i&ccedil;in <code>x | 0</code> yazar. V8 on be&scedil; y&inodot;l&inodot;n&inodot; bunu ucuzlatmaya harcad&inodot;. Perry bu haftay&inodot; yeti&scedil;meye harcad&inodot;.
      </p>
      <p>S&inodot;rayla de&gbreve;i&scedil;iklik y&inodot;&gbreve;&inodot;n&inodot;:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>(int / const) | 0</code> i&ccedil;in <code>sdiv</code>. LLVM bunu <code>smulh + asr</code>&apos;a katlar, ki bu <code>fdiv</code> i&ccedil;in ~10 cycle yerine ~2 cycle.</li>
        <li><strong>v0.5.48</strong>: Uint8ArrayGet s&inodot;n&inodot;rlar&inodot;nda <code>@llvm.assume</code>. S&inodot;n&inodot;r kontrol&uuml; dal+phi elmas&inodot;n&inodot; vekt&ouml;rle&scedil;tiricinin d&uuml;&scedil;&uuml;nebilece&gbreve;i tek bir temel blok ile de&gbreve;i&scedil;tirir.</li>
        <li><strong>v0.5.49</strong>: ToInt32 spesifikasyonu gere&gbreve;i NaN/Infinity ile bitwise i&scedil;lemlerin 0 &uuml;retmesi i&ccedil;in d&uuml;zeltme. &Ouml;nce do&gbreve;ruluk.</li>
        <li><strong>v0.5.50</strong>: De&gbreve;erin bilinen &scedil;ekilde sonlu oldu&gbreve;u bilindi&gbreve;inde 5 komutluk NaN/Inf koruyucusunu atlayan <code>toint32_fast</code>. Art&inodot; k&uuml;&ccedil;&uuml;k helper&apos;larda <code>alwaysinline</code> ve clamp tespiti.</li>
        <li><strong>v0.5.52</strong>: Clamp fonksiyonlar&inodot;n&inodot; do&gbreve;rudan <code>smin</code>/<code>smax</code> intrinsic&apos;leri ile hedefle. Clamp, art&inodot;rmadan sonra en yayg&inodot;n tamsay&inodot; kal&inodot;b&inodot;d&inodot;r.</li>
        <li><strong>v0.5.53</strong>: Bilinen &scedil;ekilde sonlu bir de&gbreve;erde <code>x | 0</code> ve <code>x &gt;&gt;&gt; 0</code> bir noop olur &mdash; sadece <code>fptosi + sitofp</code>, hi&ccedil; koruyucu yok.</li>
        <li><strong>v0.5.56</strong>: i32-native bitwise i&scedil;lemler; Uint8ArrayGet/Set&apos;te i32 indeks ve de&gbreve;er.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> polyfill yolu yerine native i32 &ccedil;arp&inodot;mas&inodot;na al&ccedil;al&inodot;r. Polyfill tespiti, kullan&inodot;c&inodot;n&inodot;n yazd&inodot;&gbreve;&inodot; <code>Math.imul</code> shim&apos;lerini tan&inodot;r ve de&gbreve;i&scedil;tirir.</li>
        <li><strong>v0.5.59</strong>: Saf fonksiyon init inlining + tamsay&inodot; local seeding. Callee k&uuml;&ccedil;&uuml;k ve saf oldu&gbreve;unda fonksiyon local tamsay&inodot; analizi &ccedil;a&gbreve;r&inodot; s&inodot;n&inodot;rlar&inodot;n&inodot;n &ouml;tesini g&ouml;rebilir.</li>
        <li><strong>v0.5.37&ndash;v0.5.40</strong>: Ak&uuml;m&uuml;lat&ouml;r kal&inodot;b&inodot; int-aritmetik h&inodot;zl&inodot; yolu. Klasik <code>for (...) acc += f(i)</code> d&ouml;ng&uuml;s&uuml; tipler izin verdi&gbreve;inde ba&scedil;tan sona i32&apos;de kal&inodot;r.</li>
      </ul>
      <p>
        v0.5.41 ince olan&inodot;. Codegen mod&uuml;l d&uuml;zeyinde bir <code>const K: number[][] = [[...], ...]</code> g&ouml;rd&uuml;&gbreve;&uuml;nde, her &scedil;eyi <code>.rodata</code>&apos;da d&uuml;z bir <code>[N x i32]</code> sabitine al&ccedil;alt&inodot;r. <code>K[y][x]</code> tek bir <code>getelementptr + load i32</code> olur. v0.5.43&apos;teki int-analiz k&ouml;pr&uuml;s&uuml; ile birle&scedil;ti&gbreve;inde, <code>image_conv</code>&apos;a (4K RGB frame &uuml;zerinde 5&times;5 Gaussian blur) <strong>tek bir s&uuml;r&uuml;mde 3x h&inodot;zlanma</strong> veren de budur.
      </p>

      <h2>5. Buffer&apos;lar ve Uint8Array</h2>
      <p>
        &Inodot;kili i&scedil; y&uuml;kleri &mdash; kripto, g&ouml;r&uuml;nt&uuml; i&scedil;leme, parsing, a&gbreve; &mdash; Buffer ve Uint8Array i&ccedil;inde ya&scedil;ar. v0.5.64 bunlara <strong>tipli pointer slotlar&inodot; art&inodot; <code>noalias</code> metadata&apos;s&inodot;</strong> verdi. Bir Buffer eskiden <code>alloca double</code>&apos;da NaN-boxed bir double iken, art&inodot;k <code>alloca i64</code>&apos;da ham bir <code>i64</code> pointer&apos;&inodot;; LLVM ek a&ccedil;&inodot;klamalar&inodot; ile optimizer&apos;a &ldquo;bu pointer kapsamdaki di&gbreve;er pointer&apos;larla alias olu&scedil;turmuyor&rdquo; diyor. Bu, optimizer&apos;&inodot;n aksi halde yapmay&inodot; reddedece&gbreve;i load/store yeniden s&inodot;ralamas&inodot;n&inodot;, vekt&ouml;rle&scedil;tirmeyi ve register tahsisini serbest b&inodot;rak&inodot;r.
      </p>
      <p>
        v0.5.80, buradaki son do&gbreve;ruluk sorununu kapatt&inodot;: fonksiyon ba&scedil;&inodot;na s&inodot;f&inodot;rlanan mod&uuml;l genelinde bir buffer <code>alias-scope</code> saya&ccedil;&inodot; vard&inodot; ve bu nadir durumlarda LLVM&apos;nin bir scope ID&apos;si payla&scedil;mamas&inodot; gereken scope&apos;lar aras&inodot;nda mant&inodot;k y&uuml;r&uuml;tmesine izin verebiliyordu. &Scedil;imdi saya&ccedil; mod&uuml;l geneli ve <code>noalias</code> hikayesi sa&gbreve;lam.
      </p>
      <p>
        v0.5.53, <code>Uint8ArraySet</code>&apos;i dals&inodot;z yapt&inodot; &mdash; s&inodot;n&inodot;r d&inodot;&scedil;&inodot;na 0 yazan bir if/else yerine maskeli bir store. v0.5.54, uzun desenler i&ccedil;in <strong>Two-Way indexOf</strong> ve arena&apos;da ay&inodot;r&inodot;lan bir <code>split</code> ekledi; ki bunlar birlikte string a&gbreve;&inodot;rl&inodot;kl&inodot; Buffer parsing&apos;indeki a&ccedil;&inodot;&gbreve;&inodot;n b&uuml;y&uuml;k k&inodot;sm&inodot;n&inodot; kapatt&inodot;.
      </p>

      <h2>6. Stringler: ASCII h&inodot;zl&inodot; yoldur</h2>
      <p>
        JavaScript stringleri UTF-16, ama ger&ccedil;ek d&uuml;nyadaki stringlerin &ccedil;o&gbreve;u (anahtarlar, tan&inodot;mlay&inodot;c&inodot;lar, HTTP ba&scedil;l&inodot;klar&inodot;, JSON iskelesi) ASCII. v0.5.71 <strong>ASCII stringler i&ccedil;in O(1) <code>charCodeAt</code> ve <code>codePointAt</code></strong> ekledi &mdash; UTF-16 taramas&inodot; yok, sadece byte y&uuml;klemesi. v0.5.20 zaten <code>indexOf</code>, <code>slice</code> ve <code>charAt</code>&apos;&inodot;n ASCII&apos;de UTF-16 taramas&inodot;n&inodot; atlamas&inodot;n&inodot; sa&gbreve;lam&inodot;&scedil;t&inodot;.
      </p>
      <p>
        Ayn&inodot; s&uuml;r&uuml;mdeki bir do&gbreve;ruluk notu: <code>String.length</code> art&inodot;k byte say&inodot;s&inodot; yerine UTF-16 kod birimleri (ECMAScript spec) d&ouml;nd&uuml;r&uuml;yor. <code>&quot;caf&eacute;&quot;.length</code>&apos;in 4 yerine 5 d&ouml;nd&uuml;rd&uuml;&gbreve;&uuml; gizli bir hata vard&inodot;.
      </p>

      <h2>7. Sunucular art&inodot;k ger&ccedil;ekten ayakta kal&inodot;yor</h2>
      <p>
        Haftan&inodot;n en g&ouml;steri&scedil;siz &ccedil;al&inodot;&scedil;mas&inodot; ayn&inodot; zamanda en kullan&inodot;c&inodot; g&ouml;r&uuml;n&uuml;r olan&inodot;yd&inodot;: uzun s&uuml;re &ccedil;al&inodot;&scedil;an Node tarz&inodot; sunucular&inodot;n &mdash; Fastify, ws, http, net &mdash; birka&ccedil; dakika sonra &ccedil;&ouml;kmemesini sa&gbreve;lamak.
      </p>
      <p>
        &Ccedil;&ouml;k&uuml;&scedil;lerin hepsinin ortak bir k&ouml;k sebebi vard&inodot;: GC, dinleyici closure&apos;lar&inodot;n&inodot; bilmiyordu. <code>wss.on(&apos;message&apos;, handler)</code> yazd&inodot;&gbreve;&inodot;n&inodot;zda, closure de&gbreve;i&scedil;kenleri yakalar, ki bunlar GC&apos;de ay&inodot;r&inodot;lm&inodot;&scedil; bir h&uuml;crenin i&ccedil;inde alanlar olarak ya&scedil;ar. E&gbreve;er GC k&ouml;k taray&inodot;c&inodot;s&inodot; bu h&uuml;creleri ziyaret etmesini bilmiyorsa, yakalamalar&inodot; geri al&inodot;n&inodot;r ve bir sonraki mesaj olay&inodot; serbest b&inodot;rak&inodot;lm&inodot;&scedil; belle&gbreve;e dereference yapar.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: <code>net.Socket</code> olay dinleyicisi closure&apos;lar&inodot;n&inodot; k&ouml;k taramaya dahil et (#35 kapan&inodot;r).</li>
        <li><strong>v0.5.27</strong>: <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>&apos;a geni&scedil;let.</li>
        <li><strong>v0.5.28</strong>: Mod&uuml;l d&uuml;zeyindeki globalleri GC k&ouml;kleri olarak kaydet (#36 kapan&inodot;r). Bir katman yukar&inodot;daki ya&scedil;am s&uuml;resi hatas&inodot;.</li>
        <li><strong>v0.5.21</strong>: Fastify/WebSocket request handler&apos;lar&inodot; i&ccedil;inde <code>gc()</code> g&uuml;venli&gbreve;i &mdash; a&ccedil;&inodot;k GC &ccedil;a&gbreve;r&inodot;s&inodot;, request handler&apos;lar arena&apos;ya pointer tutarken &ccedil;al&inodot;&scedil;&inodot;yordu (#31 kapan&inodot;r).</li>
      </ul>
      <p>
        GC &ccedil;al&inodot;&scedil;mas&inodot;n&inodot;n yan&inodot;nda, v0.5.20 bir <strong>ana olay d&ouml;ng&uuml;s&uuml;</strong> g&ouml;nderdi &mdash; bir placeholder de&gbreve;il, ger&ccedil;ek olan&inodot; &mdash; bu da WebSocket ve timer tabanl&inodot; sunucular&inodot;, son senkron &ccedil;a&gbreve;r&inodot; d&ouml;nd&uuml;kten sonra &ccedil;&inodot;kmak yerine canl&inodot; tutuyor (#28&apos;e ref). Bu, Perry&apos;yi bir &uuml;retim HTTP sunucusu olarak &ccedil;al&inodot;&scedil;t&inodot;rmaya &ccedil;al&inodot;&scedil;an herkes i&ccedil;in en etkili d&uuml;zeltmeydi. Fastify art&inodot;k ayakta kal&inodot;yor. WebSocket sunucular&inodot; art&inodot;k ayakta kal&inodot;yor.
      </p>
      <p>
        v0.5.19, JSValue FFI arg/return&apos;leri i&ccedil;in SysV AMD64 ABI uyumsuzlu&gbreve;unu d&uuml;zeltti &mdash; Linux&apos;ta native FFI &ccedil;a&gbreve;r&inodot;lar&inodot;n&inodot;n arg&uuml;manlar&inodot; sessizce bozabildi&gbreve;i bir sorun. v0.5.18, <code>axios</code> i&ccedil;in native dispatch ekledi (get/post/put/delete/patch), <code>response.status</code> ve <code>response.data</code> dahil. v0.5.30, <code>fastify request.header()</code> ve <code>request.headers[]</code> dispatch&apos;ini d&uuml;zeltti; ki bu b&uuml;y&uuml;k/k&uuml;&ccedil;&uuml;k harf duyars&inodot;z aramalar i&ccedil;in undefined d&ouml;nd&uuml;r&uuml;yordu.
      </p>

      <h2>8. <code>@perry/postgres</code>: t&uuml;m bunlar&inodot; gerekli k&inodot;lan s&uuml;r&uuml;c&uuml;</h2>
      <p>
        Bu haftaki &ccedil;al&inodot;&scedil;man&inodot;n b&uuml;y&uuml;k k&inodot;sm&inodot; tek bir i&scedil; y&uuml;k&uuml;nden kaynaklan&inodot;yordu: Perry-native &uuml;zerinde &ccedil;al&inodot;&scedil;an tam Node uyumlu bir <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">Postgres s&uuml;r&uuml;c&uuml;s&uuml;</a> elde etmek. S&uuml;r&uuml;c&uuml; TLS yetene&gbreve;ine sahip, mod&uuml;ller aras&inodot; codec kayd&inodot; var, cancel/close/notify destekliyor ve art&inodot;k <code>pg</code>, <code>postgres.js</code> ve <code>tokio-postgres</code>&apos;a kar&scedil;&inodot; benchmark ediliyor.
      </p>
      <p>S&uuml;r&uuml;c&uuml; taraf&inodot; perf &ccedil;al&inodot;&scedil;mas&inodot; derleyici taraf&inodot;na paralel gitti:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>S&uuml;tun ba&scedil;&inodot;na codec&apos;i hoist et</strong> ve h&uuml;cre ba&scedil;&inodot;na Buffer kopyalar&inodot;n&inodot; d&uuml;&scedil;&uuml;r. Ara ay&inodot;rmalardan ka&ccedil;&inodot;nmak i&ccedil;in int8 i&ccedil;in BigInt(string).</li>
        <li><strong>Nesne formundaki sat&inodot;rlar i&ccedil;in dinamik &scedil;ekil ba&scedil;&inodot;na Row constructor</strong>. Sorgunuz her zaman ayn&inodot; s&uuml;tunlar&inodot; d&ouml;nd&uuml;r&uuml;yorsa, s&uuml;r&uuml;c&uuml; ilk kez &scedil;ekil-&ouml;zelle&scedil;tirilmi&scedil; bir sat&inodot;r constructor&apos;&inodot; olu&scedil;turur ve yeniden kullan&inodot;r &mdash; ki bu, derleyicinin PIC&apos;i ile birle&scedil;ti&gbreve;inde sat&inodot;rlar &uuml;zerindeki alan eri&scedil;imini di&gbreve;er nesnelerdeki alan eri&scedil;imi kadar h&inodot;zl&inodot; yapar.</li>
        <li>int8/numeric/date i&ccedil;in ham string isteyen &ccedil;a&gbreve;r&inodot;c&inodot;lar i&ccedil;in <strong><code>parseTypes: &apos;minimal&apos;</code> opt-out&apos;u</strong>.</li>
      </ul>
      <p>
        Bu, derleyicinin her zaman sa&gbreve;lamak istedi&gbreve;i pozitif geri bildirim d&ouml;ng&uuml;s&uuml;. Ger&ccedil;ek bir s&uuml;r&uuml;c&uuml; ger&ccedil;ek darbo&gbreve;azlar&inodot; ortaya &ccedil;&inodot;kar&inodot;r. Darbo&gbreve;az, GitHub issue&apos;su olarak dosyalanan tek sat&inodot;rl&inodot;k bir reprod&uuml;ksiyon al&inodot;r. Bir haftal&inodot;k derleyici d&uuml;zeltmelerinden sonra, s&uuml;r&uuml;c&uuml; daha h&inodot;zl&inodot; ve derleyici herkes i&ccedil;in daha h&inodot;zl&inodot;. Yedi g&uuml;ne s&inodot;k&inodot;&scedil;t&inodot;r&inodot;lm&inodot;&scedil; t&uuml;m plan bu.
      </p>

      <h2>9. &Inodot;simlendirilmeye de&gbreve;er do&gbreve;ruluk d&uuml;zeltmeleri</h2>
      <p>
        Performans &ccedil;al&inodot;&scedil;mas&inodot;, bir nehri taramak market arabalar&inodot;n&inodot; y&uuml;zeye &ccedil;&inodot;kard&inodot;&gbreve;&inodot; gibi do&gbreve;ruluk sorunlar&inodot;n&inodot; y&uuml;zeye &ccedil;&inodot;kar&inodot;r. K&inodot;smi bir liste:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong>, reddedilmede <code>.reason</code> yerine <code>.value</code>&apos;yu okuyordu, dolay&inodot;s&inodot;yla reddetmeler sessizce yutuluyordu (v0.5.13&ndash;v0.5.14).</li>
        <li><strong>Promise.any</strong> art&inodot;k t&uuml;m girdi promise&apos;leri reddetti&gbreve;inde uygun bir <code>AggregateError</code> at&inodot;yor. <code>Promise.withResolvers</code> eklendi ve <code>queueMicrotask</code> s&inodot;ralamas&inodot; d&uuml;zeltildi.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> art&inodot;k bozuk bir nesne yerine bir karakter dizisi &uuml;retiyor (#16 kapan&inodot;r).</li>
        <li><strong>BigInt aritmeti&gbreve;i ve <code>BigInt()</code> zorlamas&inodot;</strong> (#33 kapan&inodot;r). i64 bigint h&inodot;zl&inodot; yolu (v0.5.29) ortak durumu ucuzlat&inodot;r.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong>, say&inodot;sal byte arg&uuml;man&inodot; ile byte de&gbreve;erleri yerine buffer pointer&apos;lar&inodot;na kar&scedil;&inodot; kar&scedil;&inodot;la&scedil;t&inodot;r&inodot;yordu (#56 kapan&inodot;r).</li>
        <li><strong>NaN/Infinity ile bitwise i&scedil;lemler</strong> ToInt32 spesifikasyonu gere&gbreve;i 0 &uuml;retiyor (#57 kapan&inodot;r).</li>
        <li><strong>Windows x86_64</strong>: platforma &ouml;zel be&scedil; d&uuml;zeltme &mdash; <code>localtime</code>, <code>clang</code> ke&scedil;fi ve bir avu&ccedil; codegen ayar&inodot; &mdash; Windows x86_64&apos;&uuml; tekrar ye&scedil;ile getirdi (v0.5.72).</li>
      </ul>

      <h2>10. Rakamlar</h2>
      <p>
        Son yaz&inodot;daki ba&scedil;l&inodot;k benchmark&apos;&inodot;, Node&apos;dan 24,6x daha h&inodot;zl&inodot; olan <code>factorial</code>&apos;d&inodot;. Bu rakam de&gbreve;i&scedil;medi. Bu hafta hareket eden &scedil;ey etraf&inodot;ndaki her &scedil;ey:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">&Inodot;&scedil; y&uuml;k&uuml;</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (20 kay&inodot;tl&inodot; &scedil;ema)</td><td className="text-right py-2 px-3">Node&apos;dan 547x yava&scedil;</td><td className="text-right py-2 px-3">Node&apos;dan 1,3x yava&scedil;</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (4K 5&times;5 blur)</td><td className="text-right py-2 px-3">1.980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4,3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">&Ouml;zellik a&gbreve;&inodot;rl&inodot;kl&inodot; kod (PIC hit)</td><td className="text-right py-2 px-3">taban</td><td className="text-right py-2 px-3">2-3x</td><td className="text-right py-2 px-3 text-green-400">2-3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1,3x</td></tr>
            <tr><td className="py-2 px-3">Y&uuml;k alt&inodot;nda Fastify &ccedil;al&inodot;&scedil;ma s&uuml;resi</td><td className="text-right py-2 px-3">&ccedil;&ouml;kmeden &ouml;nce ~60s</td><td className="text-right py-2 px-3">s&uuml;resiz</td><td className="text-right py-2 px-3 text-green-400">&infin;</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Node&apos;a kar&scedil;&inodot; t&uuml;m 15 benchmark&apos;l&inodot;k suite hala 14 galibiyet ve 1 beraberlik &mdash; son yaz&inodot;yla ayn&inodot; tablo, genel olarak biraz daha iyi rakamlarla. Bu haftaki ger&ccedil;ek hareket, o suite&apos;de olmayan i&scedil; y&uuml;klerinde: JSON, g&ouml;r&uuml;nt&uuml; i&scedil;leme, uzun s&uuml;re &ccedil;al&inodot;&scedil;an sunucular. A&ccedil;&inodot;klar oradayd&inodot;, ve kapanan da onlar.
      </p>

      <h2>11. S&inodot;radaki ne</h2>
      <p>
        H&acirc;l&acirc; pe&scedil;inde oldu&gbreve;umuz tek benchmark <code>image_conv</code>&apos;un Zig&apos;e kar&scedil;&inodot; olan&inodot;. Perry 457ms&apos;de; Zig 246ms&apos;de. Bu a&ccedil;&inodot;k mimari, optimizasyon-pass d&uuml;zeyinde de&gbreve;il ve &uuml;&ccedil; yerde ya&scedil;&inodot;yor:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Tipli buffer local&apos;lar&inodot;</strong>. Buffer &ccedil;al&inodot;&scedil;mas&inodot;n&inodot;n &ccedil;o&gbreve;u bu hafta girdi, ancak buffer tipli fonksiyon parametreleri ve local&apos;lar&inodot; h&acirc;l&acirc; her eri&scedil;imde unbox ediyor. D&ouml;ng&uuml; say&inodot;c&inodot;lar&inodot; i&ccedil;in kulland&inodot;&gbreve;&inodot;m&inodot;z <code>i64</code> slot yakla&scedil;&inodot;m&inodot; buffer&apos;lara geni&scedil;lemeli.</li>
        <li><strong>&Inodot;&ccedil;/s&inodot;n&inodot;r d&ouml;ng&uuml; b&ouml;l&uuml;nmesi</strong>. Blur d&ouml;ng&uuml;s&uuml; her pikseli clamp ediyor, buna ihtiyac&inodot; olmayan piksellerin %99,9&apos;u dahil. S&inodot;n&inodot;r b&ouml;lgelerine (clamped) ve i&ccedil;e (clamp yok) b&ouml;lmek, LLVM&apos;nin i&ccedil; k&inodot;sm&inodot; NEON <code>ld3</code>/<code>st3</code> ile vekt&ouml;rle&scedil;tirmesine olanak tan&inodot;r.</li>
        <li><strong>Double-ABI FNV-1a hash</strong>. Hash helper&apos;&inodot; NaN-box ABI &uuml;zerinden &ccedil;a&gbreve;r&inodot;l&inodot;yor. S&inodot;cak yollar i&ccedil;in ham i64 in/out&apos;a &ouml;zelle&scedil;tirmek birka&ccedil; saatlik bir i&scedil; ve her hash-a&gbreve;&inodot;rl&inodot;kl&inodot; i&scedil; y&uuml;k&uuml;nde kar&scedil;&inodot;l&inodot;&gbreve;&inodot;n&inodot; verecek.</li>
      </ol>
      <p>
        Bunlar <code>PERF_ROADMAP.md</code>&apos;de takip ediliyor. Bir sonraki d&ouml;ng&uuml;de g&ouml;r&uuml;nmelerini bekleyin.
      </p>

      <h2>Toparlama</h2>
      <p>
        Bu haftan&inodot;n deseni &mdash; 68 patch s&uuml;r&uuml;m&uuml;, neredeyse tamam&inodot; performans, bir JSON a&ccedil;&inodot;&gbreve;&inodot; 547x&apos;ten 1,3x&apos;e &mdash; LLVM ge&ccedil;i&scedil;i tepesinin iyi taraf&inodot;na ge&ccedil;ti&gbreve;inizde olan &scedil;ey. Optimizer art&inodot;k bir duvar yerine bir m&uuml;ttefik ve geriye kalanlar&inodot;n &ccedil;o&gbreve;u k&uuml;&ccedil;&uuml;k, belirli, &ouml;l&ccedil;&uuml;lebilir i&scedil;: yava&scedil; bir yol bul, optimizer&apos;&inodot;n neden i&ccedil;inden g&ouml;remedi&gbreve;ini anla, yap&inodot;y&inodot; a&ccedil;&inodot;&gbreve;a &ccedil;&inodot;kar, tekrar &ouml;l&ccedil;. Bu commit&apos;lerin hi&ccedil;biri egzotik de&gbreve;il. Sadece gereken yerlerde uygulan&inodot;yorlar.
      </p>
      <p>
        Bunlardan herhangi birini denemek isterseniz:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Kaynak: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Yeterince h&inodot;zl&inodot; olmayan issue&apos;lar, reprod&uuml;ksiyonlar ve benchmark&apos;lar: gelmeye devam etsin. Bu h&inodot;z yaln&inodot;zca hata raporlar&inodot; tek sat&inodot;rl&inodot;k reprod&uuml;ksiyonlara d&ouml;n&uuml;&scedil;t&uuml;r&uuml;lecek kadar spesifik oldu&gbreve;u i&ccedil;in &ccedil;al&inodot;&scedil;&inodot;yor. Bu yaz&inodot;daki her commit&apos;in bir nedenden dolay&inodot; ekli bir <code>#N</code>&apos;si var.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
