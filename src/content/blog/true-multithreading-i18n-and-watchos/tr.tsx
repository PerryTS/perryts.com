import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0, projenin başlangıcından bu yana en b&uuml;y&uuml;k s&uuml;r&uuml;m. Tek bir d&ouml;ng&uuml;de &uuml;&ccedil; versiyon atlayışı — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — ve derleyicinin kendisi artık paralel. İşte g&ouml;nderilen her şey.
      </p>

      <h2>Ger&ccedil;ek Multi-Threading</h2>
      <p>
        Perry artık ger&ccedil;ek işletim sistemi iş par&ccedil;acığı paralelliğine sahip. Serileştirme y&uuml;k&uuml; olan web worker&apos;lar değil. <code>Atomics</code> ile <code>SharedArrayBuffer</code> değil. Ger&ccedil;ek iş par&ccedil;acıkları — hiçbir şey paylaşmayan ve boş kaldığında maliyet oluşturmayan 8MB y&iacute;ğın boyutlu hafif işletim sistemi iş par&ccedil;acıkları.
      </p>
      <p>
        Yeni <code>perry/thread</code> mod&uuml;l&uuml; &uuml;&ccedil; temel yapı sunar:
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> ve <code>parallelFilter</code> CPU &ccedil;ekirdek sayısını otomatik olarak algılar ve giriş dizisini aralarında b&ouml;ler. K&uuml;&ccedil;&uuml;k diziler i&ccedil;in iş par&ccedil;acığını tamamen atlar ve eşzamanlı &ccedil;alışır — &ouml;nemsiz iş y&uuml;kleri i&ccedil;in sıfır y&uuml;k.
      </p>
      <p>
        <code>spawn</code> bir arka plan işletim sistemi iş par&ccedil;acığı başlatır ve bir Promise d&ouml;nd&uuml;r&uuml;r. Sonu&ccedil;, mikrog&ouml;rev işleme sırasında boşaltılan bekleyen sonu&ccedil;lar kuyruğu aracılığıyla geri akar, b&ouml;ylece diğer herhangi bir asenkron işlem gibi <code>await</code> edersiniz.
      </p>

      <h3>Derleme Zamanı G&uuml;venliği</h3>
      <p>
        En &ouml;nemli kısım API değil — derleyicinin <em>engellediği</em> şeydir. Perry, değiştirilebilir değişkenleri yakalayan closure&apos;ları statik olarak reddeder:
      </p>
      <pre><code>{`let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});`}</code></pre>
      <p>
        Paylaşılan değiştirilebilir durum olmaması, veri yarışı olmaması demektir. Lock yok, mutex yok, <code>Atomics</code> yok. Derleyici, tek bir makine kodu satırı yayılmadan &ouml;nce iş par&ccedil;acığı g&uuml;venliğini sağlar.
      </p>

      <h3>Kaputun Altında</h3>
      <p>
        Her &ccedil;alışan iş par&ccedil;acığı, <code>Drop</code> temizliği ile kendi bellek arenasını alır — iş par&ccedil;acıkları arasında GC koordinasyonu yok. Değerler, <code>SerializedValue</code> derin kopya yoluyla aktarılır: sayılar i&ccedil;in sıfır maliyet, dizeler, diziler ve nesneler i&ccedil;in O(n). Uygulama tek bir 1.120 satırlık Rust dosyasında (<code>perry-runtime/src/thread.rs</code>) bulunur ve &ccedil;&ouml;p toplayıcıda hi&ccedil;bir değişiklik gerektirmemiştir.
      </p>
      <p>
        Bunu, her biri ~2MB y&uuml;k ile worker başına ayrı heap gerektiren V8 isolate&apos;ları ile karşılaştırın. Perry&apos;nin iş par&ccedil;acıkları sadece arenalı pthread&apos;lerdir.
      </p>

      <h3>Paralel Derleyici İş Hattı</h3>
      <p>
        Derleyicinin kendisi de artık paralel. Mod&uuml;l codegen, d&ouml;n&uuml;ş&uuml;m ge&ccedil;işleri (JS import&apos;ları, yerel &ouml;rnekler, monomorfizasyon) ve <code>nm</code> sembol taraması hepsi rayon aracılığıyla t&uuml;m CPU &ccedil;ekirdeklerinde &ccedil;alışır. Cranelift 0.121 y&uuml;kseltmesiyle birleştirildiğinde (0.113&apos;ten — sekiz k&uuml;&ccedil;&uuml;k s&uuml;r&uuml;m kayıt tahsisi ve x64 iyileştirmesi), derleme &ouml;nemli &ouml;l&ccedil;&uuml;de daha hızlıdır.
      </p>

      <h2>Derleme Zamanı i18n (v0.3.0)</h2>
      <p>
        Perry&apos;nin uluslararasılaştırma sistemi sıfır t&ouml;ren i&ccedil;erir. UI widget&apos;larındaki string sabit değerleri otomatik olarak yerelleştirilebilir anahtarlar olarak ele alınır. &Ccedil;eviri dosyaları, <code>locales/</code> dizinindeki d&uuml;z JSON&apos;dur. T&uuml;m doğrulama derleme zamanında ger&ccedil;ekleşir.
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        Derleyici her şeyi doğrular: eksik &ccedil;eviriler, parametre uyumsuzlukları, &ccedil;oğul form hataları. &Ccedil;eviriler, neredeyse sıfır &ccedil;alışma zamanı araması ile g&ouml;m&uuml;l&uuml; 2D dize tablosu olarak ikili dosyaya yerleştirilir — başlangı&ccedil;ta JSON ayrıştırma yok.
      </p>

      <h3>Neleri İ&ccedil;eriyor</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>CLDR &ccedil;oğul kuralları</strong> 30&apos;dan fazla yerel ayar i&ccedil;in <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code> sonekleriyle</li>
        <li><strong>Format sarmalayıcıları</strong>: <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>T&uuml;m platformlarda yerel locale algılama</strong>: <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI: TS/TSX dosyalarını tarar, locale JSON iskelelerini oluşturur ve g&uuml;nceller</li>
        <li><strong>Platform yerel kaynak &uuml;retimi</strong>: iOS <code>.lproj</code> ve Android <code>values-xx/</code> dizinleri</li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> UI olmayan dizeleri yerelleştirmek i&ccedil;in</li>
      </ul>
      <p>
        <code>perry.toml</code>&apos;da yapılandırın:
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>watchOS Yerel Uygulamaları (v0.3.2)</h2>
      <p>
        Perry artık watchOS i&ccedil;in derliyor — 9. derleme hedefi. Bu bir sarmalayıcı veya eşlik&ccedil;i uygulama değil. Yerel SwiftUI aray&uuml;z&uuml;ne sahip bağımsız bir watchOS ikili dosyasıdır.
      </p>
      <p>
        watchOS oluşturucusu <strong>veri g&uuml;d&uuml;ml&uuml; bir yaklaşım</strong> kullanır: Perry, <code>perry_ui_*</code> FFI &ccedil;ağrıları aracılığıyla bir UI ağacı oluşturur ve g&ouml;nderilen bir <code>PerryWatchApp.swift</code> ağacı sorgular ve SwiftUI g&ouml;r&uuml;n&uuml;mlerini reaktif olarak oluşturur. Desteklenmeyen olanlar i&ccedil;in stub&apos;larla birlikte 15 widget t&uuml;r&uuml; desteklenir.
      </p>
      <pre><code>{`# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos`}</code></pre>
      <p>
        Tam akış &ccedil;alışır: <code>perry setup watchos</code> App Store Connect kimlik bilgilerini iOS ile paylaşır, <code>perry run watchos</code> Apple Watch sim&uuml;lat&ouml;rlerini otomatik algılar ve <code>perry publish watchos</code> App Store&apos;a g&ouml;nderir.
      </p>
      <p>
        Bu ayrıca toplam <strong>widget hedef sayısını d&ouml;rde</strong> &ccedil;ıkarır: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) ve Wear OS (Tiles). Her birinin kendi derleme hedefi ve codegen arka ucu vardır.
      </p>

      <h2>Ses ve Kamera API&apos;leri</h2>
      <p>
        Bu s&uuml;r&uuml;mde iki yeni donanım API&apos;si:
      </p>
      <h3>Ses Yakalama (<code>perry/system</code>)</h3>
      <p>
        A-ağırlıklı dB(A) &ouml;l&ccedil;&uuml;m&uuml; ile platformlar arası ses yakalama:
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();`}</code></pre>
      <p>
        Platform arka u&ccedil;ları: AVAudioEngine (macOS/iOS), JNI aracılığıyla AudioRecord (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).
      </p>
      <h3>Kamera Yakalama (<code>perry/ui</code>)</h3>
      <p>
        Piksel d&uuml;zeyinde renk &ouml;rnekleme ile yerel kamera &ouml;nizlemesi (iOS):
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging`}</code></pre>

      <h2>Ekosistem Paketleri</h2>
      <p>
        İki birinci taraf yerel paket başlatıldı:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — iOS/macOS i&ccedil;in push bildirim bağlamaları: izin istekleri, APNs token alma, rozet sayısı. FCM planlanan Android stub&apos;ı.</li>
        <li><strong>perry/storekit</strong> — StoreKit 2 uygulama i&ccedil;i satın alma bağlamaları: &uuml;r&uuml;n y&uuml;kleme, JWS makbuzlu satın almalar, abonelik kontrolü, geri y&uuml;kleme ve işlem dinleyicileri.</li>
      </ul>
      <p>
        Her ikisi de aynı mimariyi izler: TypeScript bildirimleri → Rust FFI crate → Swift k&ouml;pr&uuml;s&uuml;. Bağımlılık olarak kurun, fonksiyonları i&ccedil;e aktarın, sonu&ccedil;ları <code>await</code> edin. Derleyici t&uuml;m yerel k&ouml;pr&uuml;lemeyi halleder.
      </p>

      <h2>Altyapı</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — sekiz k&uuml;&ccedil;&uuml;k s&uuml;r&uuml;m kayıt tahsisi, x64 d&uuml;zeltmeleri ve yığın yuvası hizalama iyileştirmeleri</li>
        <li><strong>Windows fonksiyon b&ouml;lme</strong> — 50&apos;den fazla ifadeli fonksiyonları Windows&apos;ta Cranelift codegen sorunlarını aşmak i&ccedil;in otomatik olarak devam b&ouml;l&uuml;mlerine ayırır</li>
        <li><strong>Se&ccedil;ici mod&uuml;l değişkeni y&uuml;kleme</strong> — fonksiyon girişinde yalnızca referans verilen mod&uuml;l d&uuml;zeyi değişkenleri y&uuml;kler, Windows ikili boyutunu %26 azaltır</li>
        <li><strong>Array.sort() y&uuml;kseltmesi</strong> — O(n&sup2;) ekleme sıralamasından O(n log n) TimSort tarzı hibrite</li>
        <li><strong>perry run android</strong> — tam APK build iş hattı: derleme, Gradle proje &uuml;retimi, assembleDebug, kurulum, başlatma</li>
        <li><strong>&Ouml;zel Info.plist girişleri</strong> — gizlilik a&ccedil;ıklamaları, URL şemaları, arka plan modları i&ccedil;in perry.toml&apos;da <code>[ios.info_plist]</code></li>
      </ul>

      <h2>Rakamlarla</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>S&uuml;r&uuml;m</strong>: 0.2.197 → 0.4.0 (&uuml;&ccedil; b&uuml;y&uuml;k kilometre taşı)</li>
        <li><strong>Derleme hedefleri</strong>: 8 → 9 (watchOS eklendi)</li>
        <li><strong>Widget hedefleri</strong>: 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>Yeni crate&apos;ler</strong>: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>Yeni belgeler</strong>: threading (4 sayfa), i18n (4 sayfa), watchOS, genişletilmiş widget belgeleri (3 → 8 sayfa)</li>
        <li><strong>perry/thread uygulaması</strong>: 1.120 satır Rust, GC&apos;de sıfır değişiklik</li>
      </ul>

      <h2>Sırada Ne Var</h2>
      <p>
        Threading temeli bir&ccedil;ok şeyi a&ccedil;ıyor: paralel HTTP istek işleme, eşzamanlı dosya işlemleri ve daha &ouml;nce tek iş par&ccedil;acıklı y&uuml;r&uuml;tme tarafından engellenen hesaplama yoğun iş y&uuml;kleri. Dil tarafında, tam regex desteği en b&uuml;y&uuml;k a&ccedil;ık olmaya devam ediyor ve <code>perry/ui</code> genişlemesi (s&uuml;r&uuml;kle bırak, erişilebilirlik, DatePicker) devam ediyor.
      </p>
      <p>
        İlerlemeyi{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>&apos;da takip edin, belgeleri{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>&apos;da okuyun veya tam resim i&ccedil;in{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">yol haritasına</Link>
        {" "}g&ouml;z atın.
      </p>
    </>
  );
}
