import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Beş g&uuml;n, 120 commit ve Perry v0.4.0&apos;dan v0.4.24&apos;e atlıyor. &Ouml;ne &ccedil;ıkanlar: tvOS 10. derleme hedefi oluyor, iOS ve macOS uygulamaları artık tamamen Linux&apos;tan oluşturulabiliyor, perry login kullanıma dayalı faturalandırma getiriyor ve Windows UI kapsamlı bir yenileme alıyor. İşte g&ouml;nderilen her şey.
      </p>

      <h2>tvOS: 10. Derleme Hedefi</h2>
      <p>
        Perry artık Apple TV i&ccedil;in derliyor. tvOS hedefi, watchOS ile aynı SwiftUI oluşturucusunu kullanır ve Perry&apos;nin bir UI ağacı oluşturup g&ouml;nderilen Swift host uygulamasının onu yerel olarak oluşturduğu veri g&uuml;d&uuml;ml&uuml; mimariyi paylaşır. Mevcut <code>@perry/threads</code> WASM entegrasyonu ile birleştirildiğinde, tvOS uygulamaları UI&apos;yi duyarlı tutarken arka planda hesaplama yoğun iş y&uuml;klerini &ccedil;alıştırabilir.
      </p>
      <pre><code>{`# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos`}</code></pre>
      <p>
        Bu toplam hedef sayısını <strong>10</strong>&apos;a &ccedil;ıkarır: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly ve Web/JavaScript. Tek TypeScript kod tabanı, on yerel &ccedil;ıktı.
      </p>

      <h2>Linux&apos;tan iOS ve macOS Cross-Compile</h2>
      <p>
        Perry artık Mach-O bağlayıcısı olarak <code>ld64.lld</code> kullanarak iOS ve macOS ikili dosyalarını tamamen bir Linux makinesinden oluşturabiliyor. Bu, tamamen otomatik CI/CD i&ccedil;in eksik par&ccedil;aydı — TypeScript&apos;i bir Linux sunucusuna g&ouml;nderin, macOS build makinesi olmadan her Apple platformu i&ccedil;in imzalı yerel ikili dosyalar alın.
      </p>
      <p>
        Buraya ulaşmak, bir dizi bağlayıcı sorununu &ccedil;&ouml;zmeyi gerektirdi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Mach-O codegen triple</strong> — Cranelift i&ccedil;in <code>aarch64-apple-macos</code> ve <code>aarch64-apple-ios</code> hedef triple&apos;ları eklendi</li>
        <li><strong>Framework bağlama</strong> — cross-compile i&ccedil;in CoreGraphics, Metal, IOKit, DiskArbitration framework arama yolları</li>
        <li><strong><code>-lobjc</code></strong> — t&uuml;m Apple hedefleri i&ccedil;in gereken ObjC &ccedil;alışma zamanı sembolleri</li>
        <li><strong>SDK s&uuml;r&uuml;m&uuml;</strong> — ld64.lld&apos;de <code>sdk_version 26.0</code> (Apple, iOS 18+ gerektirir)</li>
        <li><strong>&Ouml;l&uuml; kod temizleme</strong> — Mach-O bağlayıcısı i&ccedil;in <code>-Wl,-dead_strip</code> yerine <code>-dead_strip</code></li>
        <li><strong>&Ccedil;alışma zamanı tekilleştirme</strong> — bağlama hatalarını &ouml;nlemek i&ccedil;in UI statik k&uuml;t&uuml;phanelerinden tekrarlanan <code>perry_runtime</code>&apos;ı kaldırma</li>
      </ul>
      <p>
        Mevcut Linux → Windows cross-compilation (v0.2.195+) ile birleştirildiğinde, Perry artık <strong>Linux&apos;tan t&uuml;m platformlara</strong> cross-compile yapabilir — iOS, macOS, Windows, Android, WASM ve Web.
      </p>

      <h2>iOS App Store Hazırlığı</h2>
      <p>
        Bu d&ouml;ng&uuml;n&uuml;n &ouml;nemli bir odağı, Perry ile derlenen iOS uygulamalarını tam App Store uyumlu hale getirmekti:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Tam Info.plist</strong> — Apple tarafından gereken t&uuml;m anahtarlar: <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — standart iOS ikon adlandırması (<code>AppIcon60x60@2x</code>, vb.) yedek &ccedil;&ouml;z&uuml;n&uuml;rl&uuml;k ile</li>
        <li><strong>perry.toml&apos;dan s&uuml;r&uuml;m</strong> — <code>version</code> ve <code>build_number</code> alanları doğrudan Info.plist&apos;e akar</li>
        <li><strong>UILaunchScreen</strong> — <code>UILaunchStoryboardName</code> yerine modern anahtarı kullanır (storyboard dosyası gerekmez)</li>
        <li><strong>Hazırlama profilleri</strong> — App Store ve TestFlight dağıtımı i&ccedil;in macOS hazırlama profili desteği</li>
      </ul>

      <h2>Perry Login ve Faturalandırma</h2>
      <p>
        Perry artık yeni bir <code>perry login</code> CLI komutu ve <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>&apos;daki bir pano tarafından desteklenen hesaplara ve kullanıma dayalı faturalandırmaya sahip.
      </p>
      <h3>Nasıl &Ccedil;alışır</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — GitHub OAuth cihaz akışı, tarayıcı a&ccedil;ar, tamamlanma i&ccedil;in yoklar</li>
        <li><strong>&Uuml;cretsiz plan</strong> — ayda 15 build, GitHub hesabıyla sınırsız proje</li>
        <li><strong>Pro plan</strong> — Polar.sh aboneliği ile sınırsız build</li>
        <li><strong>API token&apos;ları</strong> — CI/CD i&ccedil;in panodan token oluşturma ve y&ouml;netme</li>
        <li><strong>Kullanım takibi</strong> — ger&ccedil;ek zamanlı kullanım &ccedil;ubukları ile aylık publish ve verify saya&ccedil;ları</li>
      </ul>
      <p>
        Panonun kendisi, Next.js statik dışa aktarımı ile Perry derlenmiş bir Fastify sunucusudur — Perry ile oluşturulmuş, Perry kullanıcılarına hizmet veriyor.
      </p>

      <h2>macOS Noter Onayı ve Kod İmzalama</h2>
      <p>
        İki yeni imzalama yeteneği:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — otomatik olarak Developer ID sertifikasına ge&ccedil;er (App Store sertifikası yerine), Apple&apos;ın noter onay hizmetine g&ouml;nderir ve sonucu ekler</li>
        <li><strong>GCloud KMS kod imzalama</strong> — Windows build&apos;leri artık Google Cloud KMS anahtarları kullanılarak imzalanabilir, &ouml;zel anahtarları a&ccedil;ığa &ccedil;ıkarmadan CI&apos;da otomatik imzalamayı m&uuml;mk&uuml;n kılar</li>
      </ul>

      <h2>Windows UI Yenilemesi</h2>
      <p>
        Windows UI arka ucu şimdiye kadarki en kapsamlı g&uuml;ncellemesini aldı:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>DPI duyarlı &ouml;l&ccedil;ekleme</strong> — pencere boyutu, yazı tipleri ve widget boyutları y&uuml;ksek DPI ekranlarda doğru şekilde &ouml;l&ccedil;eklenir</li>
        <li><strong>Launcher tarzı pencere API&apos;leri</strong> — launcher/spotlight tarzı UI&apos;ler i&ccedil;in &ouml;zel konumlandırmalı &ccedil;er&ccedil;evesiz pencereler</li>
        <li><strong>Global kısayol tuşları</strong> — uygulama odaklanmamış olsa bile &ccedil;alışan sistem genelinde klavye kısayolları</li>
        <li><strong>Uygulama ikonları</strong> — launcher UI&apos;lerinde uygulama ikonlarını g&ouml;r&uuml;nt&uuml;lemek i&ccedil;in <code>getAppIcon</code> API</li>
        <li><strong>Yeniden giriş g&uuml;venli yerleşim</strong> — i&ccedil; i&ccedil;e WM_PAINT mesajları sırasında panik&apos;leri &ouml;nlemek i&ccedil;in <code>RefCell</code> tabanlı boyama, <code>SetPropW</code> HWND depolaması ile değiştirildi</li>
        <li><strong>Geisterhand entegrasyonu</strong> — t&uuml;m widget t&uuml;rleri UI test &ccedil;er&ccedil;evesine kaydedildi, <code>/type</code> HWND haritası aracılığıyla <code>SendMessageW</code> kullanır</li>
        <li><strong>Android kamera desteği</strong> — kamera yakalama API&apos;si JNI aracılığıyla Android&apos;e genişletildi</li>
      </ul>

      <h2>Performans</h2>
      <p>
        v0.4.14, kapsamlı bir performans denetimi ile geldi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Yerel <code>fcmp</code></strong> — kayan nokta karşılaştırmaları, &ccedil;alışma zamanı fonksiyon &ccedil;ağrıları yerine yerel CPU talimatları kullanır. Mandelbrot benchmark&apos;ı <strong>%30 daha hızlı</strong>.</li>
        <li><strong>Yerinde string ekleme</strong> — <code>str += &quot;text&quot;</code> yeni bir string tahsis etmek yerine buffer&apos;ı yerinde değiştirir. Tekrarlanan birleştirme i&ccedil;in <strong>125x daha hızlı</strong>.</li>
        <li><strong>Kısa devre AND/OR</strong> — <code>&amp;&amp;</code> ve <code>||</code> sonu&ccedil; zaten belirlendiğinde sağ operand&apos;ın değerlendirmesini atlar.</li>
        <li><strong>Negatif sabit katlama</strong> — <code>-1</code>, <code>-0.5</code> vb. bir olumsuzlama talimatı yaymak yerine HIR d&uuml;zeyinde sabitlere katlanır.</li>
      </ul>

      <h2>Hub Paralel Build&apos;ler</h2>
      <p>
        Build orkestrasyon sunucusu artık işçi başına eşzamanlı build&apos;leri destekliyor:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Slot tabanlı g&ouml;nderim</strong> — işçiler <code>max_concurrent</code> kapasiteyi bildiriri, Hub işçi başına aktif işleri takip eder</li>
        <li><strong>Artık 429 yok</strong> — t&uuml;m işçiler meşgul olduğunda işler reddedilmek yerine kuyruğa alınır</li>
        <li><strong>Base64 artefakt indirmeleri</strong> — Perry &ccedil;alışma zamanı ham ikili HTTP yanıtlarını işleyemediğinde ikili artefaktlar base64 olarak sunulur</li>
        <li><strong>WebSocket otomatik yeniden bağlantı</strong> — build izleme bağlantıları bağlantı kesildiğinde otomatik olarak yeniden bağlanır</li>
      </ul>

      <h2>Yeni Paket: perry/appstorereview</h2>
      <p>
        Uygulama mağazası değerlendirmesi istemek i&ccedil;in yeni bir birinci taraf paket:
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        Bir fonksiyon, iki platform, yerel değerlendirme UI&apos;si. Zamanlama ve g&ouml;r&uuml;nt&uuml;leme mantığı tamamen geliştiriciye bırakılmıştır.
      </p>

      <h2>Codegen D&uuml;zeltmeleri</h2>
      <p>
        120 commit &ccedil;ok sayıda hata d&uuml;zeltmesi anlamına gelir. En etkili olanlar:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Katı eşitlik (===)</strong> — v0.4.2&apos;de &uuml;&ccedil; ayrı hata d&uuml;zeltildi: tip etiketi karşılaştırması, NaN işleme ve null/undefined ayrımı</li>
        <li><strong>Birleştirilmiş stringlerde string karşılaştırma</strong> — i&ccedil;erik karşılaştırması yerine işaret&ccedil;i karşılaştırması nedeniyle birleştirme yoluyla oluşturulan stringleri karşılaştırırken <code>===</code> başarısız oluyordu</li>
        <li><strong>Oluşturucu &ccedil;&ouml;z&uuml;mleme</strong> — <code>new X(args)</code> artık mod&uuml;ller arası i&ccedil;e aktarılan oluşturucuları ve closure tabanlı oluşturucu fonksiyonlarını doğru şekilde &ccedil;&ouml;z&uuml;ml&uuml;yor</li>
        <li><strong>Mod&uuml;l d&uuml;zeyi array push</strong> — d&ouml;ng&uuml;lerdeki i&ccedil; i&ccedil;e fonksiyon &ccedil;ağrıları i&ccedil;inde mod&uuml;l d&uuml;zeyi dizilere eklenen değerler, yeniden tahsisten sonra eski işaret&ccedil;iler nedeniyle kaybediliyordu</li>
        <li><strong>Null aritmetik zorlaması</strong> — <code>null + 1</code> artık <code>js_number_coerce</code> aracılığıyla doğru şekilde <code>1</code> &uuml;retiyor</li>
        <li><strong>Bitwise NOT sarma</strong> — <code>~x</code> artık ECMAScript semantiğine uygun olarak i32&apos;ye sarılıyor</li>
        <li><strong>fetch().then()</strong> — yerel UI uygulamalarında eksik event loop boşaltması nedeniyle callback&apos;ler hi&ccedil; tetiklenmiyordu (v0.4.3)</li>
        <li><strong>WASM mod&uuml;lo ve &uuml;s</strong> — <code>%</code> ve <code>**</code> operat&ouml;rleri WASM doğrulama hatalarına neden oluyordu (v0.4.5)</li>
      </ul>

      <h2>Rakamlarla</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 commit</strong> 5 g&uuml;nde ana Perry derleyicisine</li>
        <li><strong>24 yama s&uuml;r&uuml;m&uuml;</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>Derleme hedefleri</strong>: 9 → 10 (tvOS eklendi)</li>
        <li><strong>Linux&apos;tan cross-compile hedefleri</strong>: Windows → Windows, iOS, macOS (t&uuml;m Apple + Windows)</li>
        <li><strong>Yeni paketler</strong>: perry/appstorereview</li>
        <li><strong>Yeni altyapı</strong>: app.perryts.com panosu, perry login CLI, Polar.sh faturalandırma</li>
        <li><strong>Performans kazanımları</strong>: %30 daha hızlı mandelbrot (yerel fcmp), 125x daha hızlı string birleştirme</li>
      </ul>

      <h2>Sırada Ne Var</h2>
      <p>
        Linux&apos;tan iOS ve macOS cross-compile yapabilmek, Hub&apos;ın artık tek bir Linux sunucusundan t&uuml;m platformlar i&ccedil;in oluşturabileceği anlamına gelir — derleme i&ccedil;in &ouml;zel macOS build makinelerine artık gerek yok (yalnızca imzalama i&ccedil;in). Faturalandırma altyapısı, Hub genel betasının yolunu a&ccedil;ıyor. Ve tvOS eklenmesiyle Perry, t&uuml;m Apple platformlarını kapsıyor: macOS, iOS, iPadOS, watchOS ve tvOS.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hub genel beta</strong> — dış kullanıcılar TypeScript g&ouml;nderip yerel ikili dosyalar alabilir</li>
        <li><strong>Tam regex desteği</strong> — son b&uuml;y&uuml;k dil a&ccedil;ığı</li>
        <li><strong>perry/ui genişlemesi</strong> — s&uuml;r&uuml;kle bırak, erişilebilirlik, DatePicker</li>
        <li><strong>Source map&apos;ler ve hata ayıklama bilgisi</strong> — yerel hata ayıklama i&ccedil;in DWARF hata ayıklama bilgisi</li>
      </ul>
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
