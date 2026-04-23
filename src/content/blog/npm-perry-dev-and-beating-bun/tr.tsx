export default function Content() {
  return (
    <>
      <p>
        Son yazı Perry v0.5.80&apos;de ve benchmark tablosunda inatçı bir yenilgiyle kapanmıştı: <code>JSON.parse</code>/<code>stringify</code> roundtrip hâlâ Node&apos;dan 1,6 kat daha yavaştı. Altı gün sonra Perry <strong>v0.5.174</strong>&apos;te — yani <strong>94 patch sürümü</strong> — ve her şeyden önce dikkat çekmeye değer üç şey değişti:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> <strong>npm</strong>&apos;de yayında. Tek komut Perry&apos;yi desteklenen her platforma kurar.</li>
        <li><strong><code>perry dev</code></strong>, yeni bir bellek içi AST cache&apos;inin ve modül başına disk üstü nesne cache&apos;inin üstüne watch-mode otomatik yeniden derleme ekliyor.</li>
        <li><code>json_roundtrip</code> yenilgisi kapandı. Perry artık ana benchmark suite&apos;inde <strong>Node ve Bun&apos;a karşı her benchmark&apos;ı kazanıyor</strong> (her ikisine karşı 15/15).</li>
      </ul>
      <p>
        Yazının geri kalanı yardımcı kadro: WebAssembly düzeltmeleri, nihayet uçtan uca derlenen watchOS, <code>perry/thread</code> primitive&apos;lerinin geri kalanının da devreye alınması ve sessiz düşüşleri gerçek hatalara dönüştüren bir grup derleme zamanı katılık kazancı.
      </p>

      <h2>1. <code>@perryts/perry</code> npm&apos;de</h2>
      <p>
        Perry her zaman macOS&apos;ta Homebrew ve Debian/Ubuntu&apos;da APT üzerinden kurulmuştur. O platformlardaki geliştiriciler için iyi kapsama, kaynaktan derlemedikleri sürece Windows kullanıcıları için hiçbir şey ve Mac, Linux ve Windows&apos;u karıştıran bir ekipte tutarlı hiçbir şey yok. v0.5.107 bu sorunu ortadan kaldırdı.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        Paket, yedi platforma özel opsiyonel pakete bağımlı ince bir launcher&apos;dır — macOS arm64/x64, hem glibc hem de musl üzerinde Linux x64/arm64, Windows x64 — ve npm yalnızca makinenize uyan olanı kurar. Platform başına binary boyutu düşük tek haneli megabaytlar seviyesinde. Kurulumun kendisi saniyeler sürer. Tercih ederseniz global kurulum yolu (<code>npm install -g @perryts/perry</code>) de var, ancak proje-yerel kurulum derleyici sürümünü bağımlılıklarınızın yanına sabitler, ki bu da doğru varsayılandır.
      </p>
      <p>
        Yayınlama OIDC Trusted Publisher üzerinden yapıldı, böylece her sürümün provenance&apos;ı var ve onu oluşturan CI işine geri bağlı. Bu kendi başına bir günlük CI işiydi — doğru <code>--provenance</code> / npm sürümü / workflow yolu kombinasyonunu kovalayan birkaç <code>v0.5.107</code> CI commit&apos;i — ama başarıldı ve o zamandan beri her sürüm temiz geldi. Windows kullanıcıları artık birinci sınıf vatandaş ve &ldquo;OS&apos;unuz nasıl isterse öyle kurun&rdquo; ekipler arası sürtüşmesi gitti.
      </p>

      <h2>2. <code>perry dev</code> — watch mode</h2>
      <p>
        v0.5.143 yeni bir CLI alt komutu ekledi:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        Hepsi bu. Projenizi izler, kaydedildiğinde yeniden derler ve binary&apos;nizi yeniden başlatır. İlham kaynağı Vite ve <code>nodemon</code>; amaç ise derleyici-binary iş akışının bir runtime&apos;dan daha yavaş hissettirmek zorunda olduğu numarasını bırakmak. Çoğu proje için <code>perry dev</code>, sıcak cache&apos;te bir saniyenin altında yeniden derler.
      </p>
      <p>
        &ldquo;Sıcak cache&rdquo; kısmı önemli. <code>perry dev</code>&apos;in yanı sıra iki yeni cache geldi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Bellek içi AST cache&apos;i</strong> (v0.5.156). Tek bir <code>perry dev</code> oturumundaki yeniden derlemeler arasında Perry, diskte değişmeyen her modül için ayrıştırılmış AST&apos;yi saklar. Bir dosyayı düzenlemek tüm modül grafiğini değil, tek bir dosyayı yeniden ayrıştırır.
        </li>
        <li>
          <strong>Modül başına disk üstü nesne cache&apos;i (V2.2)</strong>. Her modül kendi <code>.o</code> dosyasına derlenir ve hash&apos;lenir; değişmeyen modüller codegen&apos;i tamamen atlar ve linker cached nesneyi alır. Cache verbose çıktısı <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>&apos;deki spesifikasyonla eşleşiyor ve v0.5.160&apos;daki bir tur denetim sertleştirmesi, eski cache girişlerinin bir header değişikliğinden sonra hayatta kalabileceği uç durumları kapattı.
        </li>
      </ul>
      <p>
        İki cache üst üste binebilir. Oturumun ilk düzenlemesi tam derleme; bundan sonra her şey yalnızca gerçekten değiştirdiğiniz şeyle orantılı iş yapar. Haftanın tek başına en büyük DX kayması bu.
      </p>

      <h2>3. Her benchmark&apos;ta Bun&apos;ı yenmek</h2>
      <p>
        v0.5.166&apos;da README&apos;nin dürüst bir çekincesi vardı: Perry, <code>json_roundtrip</code>&apos;ta Node&apos;dan 1,6 kat daha yavaştı (1MB, 10K öğeli bir blob üzerinde 50× <code>JSON.parse</code> + <code>JSON.stringify</code>) ve Bun&apos;dan 2,4 kat daha yavaştı. Issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> takibi izledi. v0.5.173&apos;e kadar — yedi gün sonra — o fark kapandı.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">İş yükü</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry artık ana benchmark suite&apos;indeki her iş yükünü kazanıyor — <strong>Node&apos;a karşı 15/15, Bun&apos;a karşı 15/15</strong>, macOS ARM64 üzerinde 5 koşunun en iyisi. Bun 1.3 hâlâ tepe RSS&apos;te önde (<code>json_roundtrip</code>&apos;ta Perry&apos;nin 310MB&apos;sine karşı 84MB), dolayısıyla allocator baskısı kapatılacak bir sonraki şey, ama ham latency Perry&apos;nin.
      </p>
      <p>
        JSON açığının kapanması tek bir değişiklik değildi — bu hafta boyunca süren nesne-düzeni parite çalışmasının birikimiydi: Phase 1 nesne-literali şekil çıkarımı (v0.5.167), serbest fonksiyonlar, sınıf metotları, getter&apos;lar ve arrow&apos;lar için Phase 4 gövde tabanlı dönüş-tipi çıkarımı (v0.5.169) ve Phase 4.1 metot çağrısı dönüş-tipi çıkarımı (v0.5.170). Tema son yazıdakiyle aynı: LLVM&apos;e içinden görebileceği kadar statik yapı verin, gerisini optimizer halleder.
      </p>
      <p>
        v0.5.164 ayrıca saf-fadd reduction döngülerinde <code>&lt;2 x double&gt;</code> paralel-akümülatör otovektorizasyonunu geri getirdi; v0.5.9x→v0.5.16x aralığında bir noktada sessizce gerilemişti. <code>math_intensive</code> ve <code>accumulate</code>&apos;i Rust/C++/Go/Swift üzerindeki eski 3-4x liderliklerine geri getiren de bu — aynı LLVM, bir <code>reassoc contract</code> bayrağı, bir vektorize edilmiş döngü gövdesi.
      </p>

      <h2>4. <code>perry/ui</code> ve doc-test&apos;ler</h2>
      <p>
        Kalan dört perry/ui açığı v0.5.151&apos;de kapandı. Bunun yanı sıra v0.5.119, sessiz perry/ui API kötüye kullanımını &ldquo;derlenir ve hiçbir şey yapmaz&rdquo;dan sert bir derleme hatasına çevirdi — aynı mantık v0.5.165&apos;te decorator&apos;lara uygulandı (aşağı bakın). Kötüye kullanımın derleme zamanında yüzeye çıkması her zaman runtime&apos;da çıkmasından daha iyidir.
      </p>
      <p>
        v0.5.123 bir <strong>doc-examples test harness&apos;ı</strong> ve bir widget galerisi gönderdi. Dokümantasyondaki her TypeScript örneği artık her CI koşusunda derleniyor ve widget galerisi ekran görüntülerini onaylanmış baseline&apos;larla karşılaştırıyor. v0.5.125 bunu bir cross-compile matrisine genişletti: her doküman örneği host platformunun yanı sıra iOS, tvOS, Android, WASM ve Web için de derleniyor, böylece hedefler arası API kayması, gönderen release döngüsü yerine onu tanıtan PR&apos;da yakalanıyor.
      </p>
      <p>
        Küçük bir yaşam kalitesi kazanımı: <code>perry check</code> artık HIR lowering hataları için <code>file:line:column</code> yayıyor (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), yani editör jump-to-error&apos;ı, konum olmadan genel bir mesaj göstermek yerine çalışıyor.
      </p>

      <h2>5. watchOS uçtan uca derleniyor</h2>
      <p>
        watchOS geçen ay bir derleme hedefi olarak gönderildi, ancak temiz uçtan uca bir build&apos;in bazı pürüzleri vardı. Bu haftanın watchOS çalışması:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> ve <code>--target watchos-simulator</code> artık biriken workaround&apos;lar olmadan uçtan uca derleniyor.</li>
        <li><strong>v0.5.114</strong>: Metal-surface uygulamaları için <code>--features watchos-game-loop</code>.</li>
        <li><strong>v0.5.122</strong>: SwiftUI tarafından host edilen render için <code>--features watchos-swift-app</code> — SwiftUI&apos;nin uygulama yaşam döngüsüne sahip olmasını ve Perry&apos;nin içindeki UI&apos;yı oluşturmasını istediğinizde.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code>, perry-ui-ios ve perry-ui-tvos&apos;a bağlandı; böylece Geisterhand UI testi o iki hedefte macOS ve Linux&apos;taki gibi çalışıyor.</li>
      </ul>

      <h2>6. <code>perry/thread</code> primitive&apos;leri tamamen bağlandı</h2>
      <p>
        v0.5.174 (bugün) <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>&apos;yı kapattı: <code>parallelMap</code>, <code>parallelFilter</code> ve <code>spawn</code>, derleme zamanı güvenlik uygulamasıyla codegen yolundan tamamen geçirildi. Mutable yakalamalar derleme zamanında reddediliyor — perry/ui ve decorator&apos;ların artık sahip olduğu aynı derleme zamanı doğruluğu duruşu. v0.4.0 duyurusundan bu yana kısmen bağlı olan thread primitive&apos;leri artık uçtan uca tamamlandı.
      </p>

      <h2>7. WebAssembly ve web hedefi</h2>
      <p>
        Dikkat çekmeye değer iki WASM düzeltmesi:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: <code>--target web</code>&apos;de (WASM çıkış yolu) birbirini maskeleyen beş birikmiş bug. Bir grup olarak düzeltildi, dolayısıyla web hedefi artık tam <code>perry/ui</code> yüzeyi altında sağlam duruyor (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: Bir döngü içindeki <code>if</code> içindeki <code>break</code>/<code>continue</code> WASM&apos;da asılı kalıyordu — native hedeflerde yeniden üretilemeyen bir codegen bug&apos;ı. Düzeltildi (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Doğruluk tarafında ayrıca: v0.5.157, Android&apos;de <code>obj.field</code>&apos;in <code>NaN</code> döndürmesini düzeltti (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>) ve v0.5.162, <code>sendToClient</code> ve <code>closeClient</code>&apos;ın sessiz no-op&apos;lara derlendiği lanetli bir ws bug&apos;ını düzeltti (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Derleme zamanı katılık kazançları</h2>
      <p>
        Bu haftanın bir teması: eskiden sessiz bir başarısızlık olan her şey artık bir derleme hatası.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: TypeScript decorator&apos;ları HIR&apos;a ayrıştırılıp sonra sessizce düşürülüyordu. Artık dekorasyon noktasında net bir mesajla hata veriyorlar (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). v0.5.119&apos;da perry/ui&apos;ye uygulanan aynı uyarı→iptal mantığı.</li>
        <li><strong>v0.5.119</strong>: perry/ui API kötüye kullanımı, no-op binary üretmek yerine derleme zamanında reddediliyor.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> artık yalnızca mesajı yankılamak yerine stderr&apos;e gerçek bir native backtrace yayıyor (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). Sembolik frame&apos;ler <code>PERRY_DEBUG_SYMBOLS=1</code> gerektirir; o olmadan adresler alırsınız, ki bu hâlâ yerine geçtiği mesaj-yankılama davranışından fazlasıdır.</li>
      </ul>

      <h2>9. Toparlama</h2>
      <p>
        Haftanın deseni: <strong>dağıtım</strong> (npm), <strong>geliştirici deneyimi</strong> (<code>perry dev</code>, artımlı cache&apos;ler) ve <strong>kalan son benchmark yenilgisi kapandı</strong>. Artı, sessiz düşüşleri gerçek hatalara çeviren bir grup derleme zamanı katılığı. Altı gün, 94 patch sürümü, büyük bir DX kayması.
      </p>
      <p>
        Deneyin:
      </p>
      <pre><code>{`# npm (herhangi bir platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Yinelemeli geliştirme için watch mode
perry dev`}</code></pre>
      <p>
        Kaynak: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
