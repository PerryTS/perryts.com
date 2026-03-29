import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Yedi günde 82 commit. 49 sayfalık bir dokümantasyon sitesi. Otomatik App Store ve Play Store
        yayınlama. Homebrew ve APT paketleri. TypeScript&apos;ten derlenen yerel WidgetKit uzantıları.
        Kendi kendini derleyen bir LLVM derleyicisi. Ve her platformda düzinelerce hata düzeltmesi.
      </p>
      <p>
        Bu yazı, 6-13 Mart 2026 arasında Perry&apos;de yayınlanan her şeyi kapsar. Tema
        tamamlanma — &quot;biraz TypeScript yazdım&quot; ile &quot;uygulamam App Store&apos;da&quot;
        arasındaki boşlukları doldurmak.
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perry artık gerçek bir dokümantasyon sitesine sahip. mdBook ile oluşturulmuş 49 sayfa, başlangıçtan
        CLI referansına kadar her şeyi kapsıyor. Dokümanlar bölümlere ayrılmış:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Başlarken</strong> — kurulum, ilk proje, proje yapısı</li>
        <li><strong>Dil Özellikleri</strong> — Perry&apos;nin TypeScript&apos;ten desteklediği her şey</li>
        <li><strong>Yerel UI</strong> — tüm widget türlerini, düzeni, durum yönetimini ve platforma özgü davranışı kapsayan 12 sayfa</li>
        <li><strong>Platformlar</strong> — 6 hedef platformun her biri için özel sayfalar</li>
        <li><strong>Standart Kütüphane</strong> — 50&apos;den fazla yerel paket uygulaması belgelenmiş</li>
        <li><strong>Sistem API&apos;leri</strong> — dosya diyalogları, keychain, bildirimler, çoklu pencere</li>
        <li><strong>WidgetKit</strong> — yeni widget uzantı modülü</li>
        <li><strong>Eklentiler</strong> — derleme zamanı eklenti mimarisi</li>
        <li><strong>CLI Referansı</strong> — her komut ve bayrak</li>
      </ul>
      <p>
        Site ayrıca yapay zeka keşfedilebilirliği için bir <code className="text-amber-400">llms.txt</code> dosyası içeriyor
        ve GitHub Pages üzerinden{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a> özel alan adıyla dağıtılıyor.
      </p>

      <h2>Perry&apos;yi Tek Komutla Kurun</h2>
      <p>
        Perry artık kaynak koddan derlemeye ek olarak Homebrew ve APT üzerinden dağıtılıyor. Yeni bir
        GitHub Actions sürüm ardışık düzeni, macOS (arm64 ve x86_64) ile
        Linux (x86_64 ve arm64) için ikili dosyalar oluşturuyor, ardından Homebrew tap ve APT deposunu otomatik olarak güncelliyor.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        Artık repoyu klonlayıp Cargo ile derlemeye gerek yok. Perry&apos;yi diğer araçları kurduğunuz gibi kurun.
      </p>

      <h2>Otomatik App Store Yayınlama</h2>
      <p>
        Bu, en fazla manuel adımı ortadan kaldıran değişikliktir.{" "}
        <code className="text-amber-400">perry publish ios</code> çalıştırmak artık tüm iOS dağıtım
        ardışık düzenini otomatik olarak yönetir:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>App Store Connect API üzerinden RSA anahtarı ve CSR oluşturur</li>
        <li>Dağıtım sertifikası oluşturur ve <code className="text-amber-400">.p12</code>&apos;ye paketler</li>
        <li>Paket kimliğini kaydeder</li>
        <li>Provisioning profili oluşturur ve indirir</li>
        <li>App Store Connect uygulama kaydını oluşturur</li>
        <li>Derler, imzalar ve TestFlight veya App Store&apos;a yükler</li>
      </ol>
      <p>
        Xcode yok. Manuel portal ziyareti yok. Tarayıcıdan sertifika indirme yok. Kurulum
        sihirbazı ilk yayınladığınızda otomatik olarak çalışır, API anahtarı yapılandırmasında rehberlik eder
        ve kimlik bilgilerini <code className="text-amber-400">perry.toml</code>&apos;a kaydeder.
      </p>
      <p>
        macOS dağıtımı da aynı şekilde otomatikleştirilmiştir. Perry üç modu destekler: TestFlight, noter onaylı DMG
        ve App Store&apos;a yayınlayıp aynı anda noter onaylı DMG oluşturan yeni bir <strong>&quot;ikisi birden&quot;</strong> modu.
        Üç sertifika türü otomatik oluşturulur:{" "}
        <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>,{" "}
        <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code> ve{" "}
        <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>.
      </p>
      <p>
        Android yayınlama da otomatik tetiklenen bir kurulum sihirbazı kazandı. Üç platform artık
        aynı kalıbı izliyor: ilk çalıştırma kurulumu tetikler, kimlik bilgileri projeye kaydedilir, sonraki
        çalıştırmalar sıfır yapılandırmayla gerçekleşir.
      </p>
      <p>
        Ön kontrol doğrulaması, derleme başlamadan önce sorunları yakalar — provisioning profili paket
        kimliği uyumsuzluğu, sertifika süresi dolması, eksik uygulama simgesi, geçersiz sürüm formatı, yanlış takım kimliği.
        Ve <code className="text-amber-400">perry.toml [ios]</code>&apos;daki{" "}
        <code className="text-amber-400">encryption_exempt</code>,{" "}
        <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> Info.plist anahtarını otomatik ayarlar,
        App Store Connect&apos;teki manuel ihracat uyumluluk istemini atlar.
      </p>

      <h2>perry/widget: TypeScript&apos;ten WidgetKit</h2>
      <p>
        Perry artık TypeScript&apos;i yerel SwiftUI WidgetKit uzantılarına derleyebilir. Bu bir sarmalayıcı
        veya köprü değil — derleyici HIR düzeyinde render ağacını gezer ve doğrudan SwiftUI kaynak kodu
        üretir. Çıktı, Xcode&apos;un (veya Perry&apos;nin derleme ardışık düzeninin) uygulamanıza gömebileceği
        eksiksiz bir WidgetKit uzantı paketidir.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        Yaklaşım, Perry&apos;nin derlemesinin geri kalanından temelden farklıdır. Normal Perry
        kodu Cranelift üzerinden yerel makine koduna gider. Widget kodu HIR&apos;den SwiftUI
        metin çıktısına gider, çünkü WidgetKit SwiftUI gerektirir — zorunlu UIKit veya AppKit koduyla
        bir widget uzantısı oluşturmanın yolu yoktur. Perry bunu widget render ağacını
        çalışma zamanı kodu değil, derleme zamanı şablonu olarak ele alarak çözer.
      </p>

      <h2>Yeni Widget&apos;lar ve Platform İyileştirmeleri</h2>
      <p>
        Bu hafta dört yeni widget türü geldi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — macOS, iOS ve Android&apos;de çok satırlı metin düzenleme</li>
        <li><strong>SecureField</strong> — iOS ve macOS&apos;ta şifre girişi</li>
        <li><strong>QR Code</strong> — iOS, macOS ve Android&apos;de yerel QR kod oluşturma</li>
        <li><strong>Splash Screen</strong> — otomatik oluşturulan LaunchScreen storyboard&apos;ları (iOS) ve splash temaları (Android)</li>
      </ul>

      <h3>iPad Yerelleşiyor</h3>
      <p>
        Perry artık tam iPad yerel uygulamaları oluşturuyor: <code className="text-amber-400">UIDeviceFamily [1,2]</code>,
        yönlendirme desteği, <code className="text-amber-400">UIRequiresFullScreen</code> ve ibtool aracılığıyla
        derlenmiş LaunchScreen storyboard. Yeni <code className="text-amber-400">getDeviceIdiom()</code>{" "}
        fonksiyonu çalışma zamanında telefon vs. iPad&apos;i algılar ve <code className="text-amber-400">PerryFrameSplit</code>{" "}
        iPad düzenleri için çerçeve tabanlı yatay bölünmüş konteynerler sağlar.
      </p>

      <h3>Windows</h3>
      <p>
        Windows zamanlayıcı desteği (50ms <code className="text-amber-400">WM_TIMER</code> tiki),
        koyu tema arka planlı sahip-çizimli düğmeler ve 18 widget dosyasında{" "}
        <code className="text-amber-400">to_wide().as_ptr()</code>&apos;daki use-after-free hatası düzeltmeleri aldı. V8 çalışma zamanı
        artık gerekli sistem kütüphaneleri bağlanmış olarak Windows&apos;ta çalışıyor.
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        GTK4 arka ucu macOS&apos;a uyum sağlamak için görsel cilalama aldı: kenar boşlukları için CSS dolgu, Adwaita
        düğme stili, VStack kenar boşluğu düzeltmeleri ve ScrollView yatay politikası.
      </p>

      <h2>http/https ve better-sqlite3</h2>
      <p>
        İki önemli stdlib eklentisi:
      </p>
      <p>
        Yeni <code className="text-amber-400">http</code> ve{" "}
        <code className="text-amber-400">https</code> yerel modülleri, arka planda reqwest kullanarak
        istemci tarafı HTTP sağlıyor. API Node.js ile eşleşiyor:{" "}
        <code className="text-amber-400">request()</code>,{" "}
        <code className="text-amber-400">get()</code>,{" "}
        write/end/on ile <code className="text-amber-400">ClientRequest</code> ve
        statusCode ve olay işleyicileri ile <code className="text-amber-400">IncomingMessage</code>.
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> artık tam destekleniyor:{" "}
        <code className="text-amber-400">new Database()</code>,{" "}
        <code className="text-amber-400">prepare</code>,{" "}
        <code className="text-amber-400">exec</code>,{" "}
        <code className="text-amber-400">run</code>,{" "}
        <code className="text-amber-400">get</code>,{" "}
        <code className="text-amber-400">all</code> — uygun NaN-boxing ve adlandırılmış özellik erişimli
        satır nesneleri ile.
      </p>
      <p>
        Diğer stdlib iyileştirmeleri: <code className="text-amber-400">crypto.randomBytes()</code> artık
        Buffer döndürüyor (Node.js ile eşleşiyor), MongoDB iş parçacığı güvenliği düzeltmeleriyle{" "}
        <code className="text-amber-400">listDatabases</code> ve{" "}
        <code className="text-amber-400">listCollections</code> kazandı ve
        mysql2 INSERT/UPDATE/DELETE artık{" "}
        <code className="text-amber-400">insertId</code> ile{" "}
        <code className="text-amber-400">ResultSetHeader</code> döndürüyor.
      </p>

      <h2>GC ve Doğruluk Düzeltmeleri</h2>
      <p>
        Bu hafta birkaç kritik çöp toplayıcı ve çalışma zamanı doğruluk düzeltmesi yayınlandı:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GC yeniden giriş koruması</strong> — tahsis sırasında toplamayı önler, RefCell çift-ödünç paniklerini düzeltir</li>
        <li><strong>GC Map izleme</strong> — Map&apos;ler artık işaretleme aşamasında düzgün şekilde izleniyor, dize anahtar toplanmasını önlüyor</li>
        <li><strong>Dize takma ad düzeltmesi</strong> — dize ekleme artık her zaman taze dizeler tahsis ediyor, işaretçi kopyalama takma adından kaynaklanan bozulmayı düzeltiyor</li>
        <li><strong>BigInt aritmetiği</strong> — sağa kaydırma negatif sayılar için aritmetik kaydırma kullanıyor, bitsel işlemler ToInt32 sarmalama semantiği kullanıyor</li>
        <li><strong>Map.get() undefined</strong> — eksik anahtarlar için yanlış NaN etiketi yerine doğru <code className="text-amber-400">TAG_UNDEFINED</code> döndürüyor</li>
        <li><strong>Statik alan GC kökleri</strong> — statik sınıf alanlarındaki BigInt değerleri GC kökleri olarak kaydedildi</li>
      </ul>
      <p>
        Bunlar küçük düzeltmeler değil. Tek başına GC yeniden giriş düzeltmesi, aralıklı çökmelerin tüm bir sınıfını
        çözdü. Dize takma ad düzeltmesi, bir dize değişkenini diğerine atayan ve sonra herhangi birini değiştiren
        her programı etkiledi. Bunlar yalnızca gerçek iş yükleri altında ortaya çıkan türden hatalardır
        ve bunları düzeltmek derleyiciyi üretime hazır yapan şeydir.
      </p>

      <h2>perry-verify: Güçlendirildi</h2>
      <p>
        Otomatik uygulama doğrulama hizmeti <code className="text-amber-400">perry-verify</code>,
        bir güvenlik sertleştirme geçişi aldı: Linux&apos;ta{" "}
        <code className="text-amber-400">bwrap</code> ve macOS&apos;ta{" "}
        <code className="text-amber-400">sandbox-exec</code> aracılığıyla korumalı alan yürütme, WebSocket
        el sıkışma ve ikili dosya indirmede kimlik doğrulama belirteçleri, IP başına hız sınırlama, numaralandırmayı önleyen
        tam UUID iş kimlikleri ve azaltılmış gövde limitleri.
      </p>

      <h2>perrysdad: Kendi Kendini Derleyen Derleyici</h2>
      <p>
        Paralel bir çabada, TypeScript ile yazılmış kendi kendini derleyen LLVM IR derleyicisi{" "}
        <code className="text-amber-400">perrysdad</code>, hafta boyunca beş aşamada sıfırdan kendi kendini derlemeye ulaştı:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>Aşama 0-1</strong> — uçtan uca iskelet: HIR&apos;den LLVM IR metnine, clang&apos;a, Perry&apos;nin <code className="text-amber-400">libperry_runtime.a</code>&apos;sına karşı bağlanmış</li>
        <li><strong>Aşama 2</strong> — gerçek <code className="text-amber-400">.ts</code> dosyaları için Pratt ifade ayrıştırmalı el yapımı özyinelemeli iniş ayrıştırıcı</li>
        <li><strong>Aşama 3</strong> — çalışma zamanı FFI ile diziler, nesneler ve map&apos;ler, artı kritik bir ABI uyumsuzluğu düzeltmesi (LLVM IR&apos;de JSValue i64 yerine double olarak bildirilmiş)</li>
        <li><strong>Aşama 4</strong> — sınıflar, enum&apos;lar, closure&apos;lar, modül keşfi ve topolojik sıralama ile çok dosyalı derleme</li>
      </ol>
      <p>
        Kilometre taşı: kendi kendini derleyen <code className="text-amber-400">anvil</code> ikili dosyası artık
        test programlarını derleyebilir ve node ile derlenen sürümle eşleşen doğru çıktı üretebilir. Bir TypeScript
        derleyicisi, Perry tarafından yerel koda derlenen, daha fazla TypeScript&apos;i yerel koda derliyor. Sonuna kadar
        kaplumbağalar.
      </p>

      <h2>Rakamlarla</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 commit</strong> ana Perry derleyicisine</li>
        <li><strong>1 sürüm</strong>: v0.2.173 (8 Mart)</li>
        <li><strong>49 dokümantasyon sayfası</strong> docs.perryts.com&apos;da</li>
        <li><strong>4 yeni widget</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 dağıtım kanalı</strong>: Homebrew, APT, kaynak</li>
        <li><strong>3 otomatik mağaza ardışık düzeni</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>6 platformun tamamı</strong> bu hafta iyileştirmeler aldı</li>
      </ul>

      <h2>Sırada Ne Var</h2>
      <p>
        Ardışık düzen dolmaya başlıyor. TypeScript yazabilir, altı platforma derleyebilir, Homebrew veya APT ile
        dağıtabilir, App Store ve Play Store&apos;a yayınlayabilir, ana ekran widget&apos;ları ekleyebilir ve
        kapsamlı dokümantasyonu okuyabilirsiniz — hepsi Perry&apos;nin araç zincirinden ayrılmadan. Geriye kalan:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Tam regex desteği</strong> — son büyük dil boşluğu</li>
        <li><strong>perry/ui genişlemesi</strong> — sürükle bırak, erişilebilirlik etiketleri, DatePicker</li>
        <li><strong>perrysdad olgunlaşması</strong> — kendi kendini derleyen derleyiciyi tam Perry eşitliğine doğru genişletme</li>
        <li><strong>Hub genel beta</strong> — dağıtık derlemeleri harici kullanıcılara açma</li>
      </ul>
      <p>
        Gelişmeleri{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>&apos;da takip edin, yeni dokümanları{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>&apos;da okuyun veya tam resim için{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">yol haritasına</Link>
        {" "}göz atın.
      </p>
    </>
  );
}
