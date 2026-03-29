import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Bu hafta Perry derleyicisine 103 commit. &Ouml;ne &ccedil;ıkan &ouml;zellikler: artık Linux&apos;tan Windows &ccedil;alıştırılabilir dosyaları cross-compile edebilirsiniz, iOS uygulamaları engelleyici oyun d&ouml;ng&uuml;leri &ccedil;alıştırabilir, derleyici telemetri i&ccedil;in &ccedil;&ouml;kmeleri raporluyor ve self-hosting derleyici kendisine atılan her deterministik testi ge&ccedil;iyor. Ayrıca b&uuml;y&uuml;k bir Hub altyapı y&uuml;kseltmesi ve 50&apos;den fazla hata d&uuml;zeltmesi.
      </p>

      <h2>Linux&apos;tan Windows&apos;a Cross-Compile</h2>
      <p>
        Perry artık bir Linux ana bilgisayardan Windows <code className="text-amber-400">.exe</code> ikili dosyaları &uuml;retebiliyor. Bu, t&uuml;m derleme i&ccedil;in bir Windows build makinesi &ccedil;alıştırmadan Windows&apos;u hedeflemesi gereken CI/CD iş hatları i&ccedil;in eksik par&ccedil;aydı.
      </p>
      <p>
        Uygulama, derleme zamanı <code className="text-amber-400">#[cfg]</code> kontrol&uuml;n&uuml; &ccedil;alışma zamanı hedef algılamasıyla değiştiriyor. Derleyici, Windows olmayan bir ana bilgisayarda Windows hedefi g&ouml;rd&uuml;ğ&uuml;nde, yeni <code className="text-amber-400">find_llvm_tool()</code> yardımcısı aracılığıyla Rust ara&ccedil; zinciri veya PATH&apos;ten <code className="text-amber-400">lld-link</code>,{" "}
        <code className="text-amber-400">llvm-nm</code> ve{" "}
        <code className="text-amber-400">llvm-ar</code>&apos;ı bulur. Windows sistem k&uuml;t&uuml;phaneleri, <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code> tarafından g&ouml;sterilen{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          xwin
        </a>{" "}
        tarzı bir sysroot&apos;tan gelir.
      </p>
      <p>
        Bağlayıcı otomatik olarak <code className="text-amber-400">/FORCE:UNRESOLVED</code> kullanır ve eksik UI sembolleri i&ccedil;in stub&apos;lar &uuml;retir, b&ouml;ylece CLI uygulamaları sorunsuz cross-compile olur. Windows hedeflendiğinde &ccedil;ıktı varsayılan olarak <code className="text-amber-400">.exe</code>&apos;dir. Tam ayrıntılar{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          cross-compilation belgelerinde
        </a> bulunabilir.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>iOS Oyun D&ouml;ng&uuml;s&uuml; Desteği</h2>
      <p>
        iOS, UIKit&apos;in ana iş par&ccedil;acığına sahip olmasını gerektirir. Olay g&uuml;d&uuml;ml&uuml; uygulamalar i&ccedil;in sorun değil, ancak engelleyici <code className="text-amber-400">while (!shouldClose)</code> d&ouml;ng&uuml;s&uuml;ne ihtiya&ccedil; duyan oyunlar i&ccedil;in bir sorundur. Perry artık bunu <code className="text-amber-400">--features ios-game-loop</code> bayrağıyla &ccedil;&ouml;z&uuml;yor.
      </p>
      <p>
        Etkinleştirildiğinde, derleyici{" "}
        <code className="text-amber-400">main</code> yerine{" "}
        <code className="text-amber-400">_perry_user_main</code> yayar. &Ccedil;alışma zamanı, ana iş par&ccedil;acığında{" "}
        <code className="text-amber-400">UIApplicationMain</code>&apos;i &ccedil;ağıran ve kodunuzu bir arka plan iş par&ccedil;acığında başlatan bir{" "}
        <code className="text-amber-400">main()</code> sağlar. Scene delegate ve app delegate, oyun d&ouml;ng&uuml;n&uuml;z engellenmeden &ccedil;alışırken tam UIKit yaşam d&ouml;ng&uuml;s&uuml;n&uuml; y&ouml;netir.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Your game loop runs on a background thread</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        Bu, daha &ouml;nce iOS&apos;ta pratik olmayan oyunlar, sim&uuml;lasyonlar, ger&ccedil;ek zamanlı g&ouml;rseller gibi bir uygulama kategorisinin tamamını m&uuml;mk&uuml;n kılıyor. iOS pump ve callback yolları artık panik y&ouml;netimi ile sarılmıştır, b&ouml;ylece oyun d&ouml;ng&uuml;s&uuml;nde veya UIKit yaşam d&ouml;ng&uuml;s&uuml;nde meydana gelen &ccedil;&ouml;kmeler temiz bir şekilde yakalanır.
      </p>

      <h2>&Ccedil;&ouml;kme Raporlama</h2>
      <p>
        Perry ile derlenmiş uygulamalar artık başlangı&ccedil;ta{" "}
        <code className="text-amber-400">SIGSEGV</code>,{" "}
        <code className="text-amber-400">SIGBUS</code> ve{" "}
        <code className="text-amber-400">SIGABRT</code> i&ccedil;in bir panik hook&apos;u ve sinyal işleyicileri kuruyor. &Ouml;l&uuml;mc&uuml;l bir &ccedil;&ouml;kme meydana geldiğinde, ayrıntılar Chirp telemetri sistemi i&ccedil;in <code className="text-amber-400">~/.hone/crash.log</code>&apos;a yazılır. Yakalanan panikler ({" "}
        <code className="text-amber-400">catch_callback_panic</code> i&ccedil;inde) log&apos;u temizler, b&ouml;ylece yalnızca ger&ccedil;ek anlamda kurtarılamaz &ccedil;&ouml;kmeler raporlanır.
      </p>
      <p>
        Bu bir &uuml;retim hazırlığı &ouml;zelliğidir. Sahada bir şeyler ters gittiğinde, bunu bileceğiz — ve &ccedil;&ouml;kme log&apos;u, kullanıcıların herhangi bir şeyi manuel olarak bildirmelerini gerektirmeden sorunu teşhis etmek i&ccedil;in yeterli bağlam i&ccedil;erir.
      </p>

      <h2>Hub: İki Aşamalı Windows Build İş Hattı</h2>
      <p>
        Perry Hub build altyapısı &ouml;nemli bir mimari y&uuml;kseltme aldı. Daha &ouml;nce, Windows i&ccedil;in build yapmak t&uuml;m derleme i&ccedil;in bir Windows i&scedil;&ccedil;isi gerektiriyordu. Şimdi iş hattı iki aşamaya b&ouml;l&uuml;n&uuml;yor:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Bir Linux işçisi yeni lld-link desteğini kullanarak Windows artefaktını cross-compile eder</li>
        <li>Hub &ouml;nceden derlenmiş artefaktı tutar ve işi bir Windows işçisi i&ccedil;in yeniden kuyruğa alır</li>
        <li>Windows işçisi yalnızca imzalama ve paketleme ile ilgilenir — &ccedil;ok daha hafif bir g&ouml;rev</li>
      </ol>
      <p>
        Bir işçi <code className="text-amber-400">complete</code>&apos;i{" "}
        <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code> ile g&ouml;nderdiğinde, Hub işi şeffaf bir şekilde yeniden kuyruğa alır. CLI, kesintisiz tek bir build deneyimi g&ouml;r&uuml;r.
      </p>
      <p>
        Hub artık hi&ccedil;bir Windows işçisi bağlı olmadığında Azure Windows VM&apos;lerini otomatik olarak başlatıyor ve build işçileri yeni s&uuml;r&uuml;mlerde en son Perry s&uuml;r&uuml;m&uuml;ne otomatik olarak g&uuml;ncelleniyor. Daha az manuel altyapı y&ouml;netimi, daha hızlı build&apos;ler.
      </p>

      <h2>Belge Revizyonu</h2>
      <p>
        Bu hafta{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>&apos;da iki b&uuml;y&uuml;k belge yeniden yazımı yayınlandı:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>perry.toml referansı</strong> — her yapılandırma se&ccedil;eneğini, bundle ID &ccedil;&ouml;z&uuml;mlemeyi, giriş dosyası &ccedil;&ouml;z&uuml;mlemeyi, build numarası otomatik artırımını ve CI/CD &ouml;rneklerini kapsayan kapsamlı b&ouml;l&uuml;m belgesi
        </li>
        <li>
          <strong>Geisterhand referansı</strong> — platformlar arası UI test &ccedil;er&ccedil;evesi i&ccedil;in tam API belgeleri, platform kurulumu, test otomasyon kalıpları ve mimari genel bakış
        </li>
      </ul>
      <p>
        Bunlar artımlı g&uuml;ncellemeler değildir. Her ikisi de her &ouml;zelliği ve yapılandırma se&ccedil;eneğini kapsayan sıfırdan yeniden yazımlardır. Yeni bir proje kuruyorsanız veya test yazıyorsanız, buradan başlayın.
      </p>

      <h2>Platformlar Arası Men&uuml; API&apos;leri</h2>
      <p>
        <code className="text-amber-400">menuClear</code> ve{" "}
        <code className="text-amber-400">menuAddStandardAction</code> daha &ouml;nce yalnızca macOS i&ccedil;indi. Artık 6 yerel platformun tamamında &ccedil;alışıyor. Bu ayrıca Windows&apos;ta <code className="text-amber-400">dispatch_menu_item</code>&apos;daki bir <code className="text-amber-400">RefCell</code> yeniden giriş paniğinin d&uuml;zeltilmesini de i&ccedil;eriyor.
      </p>

      <h3>Android: 16 KB Sayfa Hizalaması</h3>
      <p>
        Google Play artık yerel k&uuml;t&uuml;phaneler i&ccedil;in 16 KB sayfa hizalaması gerektiriyor. Perry uygun <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code>{" "}
        değerlerini otomatik olarak ayarlar ve eşlik eden <code className="text-amber-400">.so</code> dosyaları APK/AAB dahil edilmesi i&ccedil;in &ccedil;ıktının yanına kopyalanır.
      </p>

      <h2>Perry React: Kanban Tahtası</h2>
      <p>
        React uyumluluk katmanı ger&ccedil;ek d&uuml;nya testinden ge&ccedil;ti: taşıma, ekleme, silme ve g&ouml;r&uuml;nt&uuml;leme işlemlerini i&ccedil;eren tam bir 5 s&uuml;tunlu Kanban tahtası. Bunu oluşturmak, JSX&apos;te i&ccedil; i&ccedil;e dizi children render&apos;ını ortaya &ccedil;ıkardı ve d&uuml;zeltti — &ouml;zyinelemeli{" "}
        <code className="text-amber-400">_appendChildren</code> işleyicisi artık <code className="text-amber-400">.map()</code> &ccedil;ağrılarından d&ouml;nen dizileri d&uuml;zg&uuml;n bir şekilde d&uuml;zleştiriyor. Ayrıca &ccedil;eşitli UI kalıplarını kapsayan yeni 14 b&ouml;l&uuml;ml&uuml;k Kitchen Sink WorkBench demosu da eklendi.
      </p>

      <h2>Anvil: %100 Deterministik Test Eşitliği</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — TypeScript ile yazılmış ve Perry tarafından derlenmiş self-hosting LLVM derleyicisi — artık <strong>68&apos;den 68&apos;ini</strong> ge&ccedil;erek ana derleyicinin &ccedil;ıktısıyla tam olarak eşleşiyor. Tek farklar doğasaldır (zaman damgaları, <code className="text-amber-400">Math.random()</code>) ve 11 test, hen&uuml;z uygulanmamış UI, zamanlayıcı, kriptografi veya platforma &ouml;zg&uuml; &ouml;zellikler gerektirdiği i&ccedil;in atlanıyor.
      </p>
      <p>
        Bunu başaran temel &ccedil;alışmalar:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Aray&uuml;z metot g&ouml;nderimi</strong> — aray&uuml;z tipli değişkenler artık ObjectHeader&apos;daki class_id tabanlı g&ouml;nderim yoluyla doğru metotları d&ouml;nd&uuml;r&uuml;yor</li>
        <li><strong>Dinamik &ouml;zellik erişimi</strong> — hesaplanmış &ouml;zellik adları i&ccedil;in &ccedil;alışma zamanı g&ouml;nderimi</li>
        <li><strong>Closure&apos;lar ve this-binding</strong> — nesne metotları i&ccedil;in doğru yakalama semantiği</li>
        <li><strong>Faz 6 devam ediyor</strong> — async/await, jenerat&ouml;rler ve koşul d&uuml;zeltmeleri</li>
      </ul>
      <p>
        Deterministik testlerde %100 eşitlik &ouml;nemli bir kilometre taşıdır. Kendi kendini derleyen{" "}
        <code className="text-amber-400">anvil</code> ikili dosyasının, test edilebilir her senaryo i&ccedil;in ana derleyiciyle tamamen aynı &ccedil;ıktıyı &uuml;rettiği anlamına gelir. Tam self-hosting&apos;e doğru a&ccedil;ık daralıyor.
      </p>

      <h2>50&apos;den Fazla Hata D&uuml;zeltmesi</h2>
      <p>
        Bu hafta b&uuml;y&uuml;k bir doğruluk hamlesı. &Ouml;ne &ccedil;ıkanlar:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — diziler artık 16 &ouml;ğede kesilmiyor, ge&ccedil;ersiz giriş doğru işleniyor</li>
        <li><strong>Uint8Array</strong> — dizi değişkeninden oluşturucu, <code className="text-amber-400">.set(source, offset)</code> uygulaması (eskiden no-op&apos;tu)</li>
        <li><strong>BigInt</strong> — mod&uuml;ller arası &ccedil;ağrılar i&ccedil;in <code className="text-amber-400">BIGINT_TAG</code> ile NaN-boxing, keccak256 32-bit kesme d&uuml;zeltmeleri</li>
        <li><strong>Optional chaining</strong> — i&ccedil; i&ccedil;e koşullu ifadeler, toString algılama, d&ouml;n&uuml;ş değeri NaN-boxing</li>
        <li><strong>IndexSet</strong> — <code className="text-amber-400">POINTER_TAG</code> yerine <code className="text-amber-400">STRING_TAG</code> kullanmak &uuml;zere dize NaN-boxing d&uuml;zeltildi</li>
        <li><strong>MySQL</strong> — DATETIME ve BLOB t&uuml;rleri, <code className="text-amber-400">Date(string)</code> oluşturucusu</li>
        <li><strong>Math.min/max</strong> — spread arg&uuml;man işleme</li>
        <li><strong>Yerel metot g&ouml;nderimi</strong> — <code className="text-amber-400">POINTER_TAG</code> nesneleri i&ccedil;in field-scan-and-call</li>
      </ul>
      <p>
        Bunlar u&ccedil; durumlar değildir. JSON.parse&apos;ın dizileri 16 &ouml;ğede kesmesi herhangi bir ger&ccedil;ek uygulamayı bozar. Uint8Array.set&apos;in no-op olması verileri sessizce bozar. Bunlar, derleyiciyi her seferinde bir doğruluk hatası d&uuml;zelterek &uuml;retim kalitesine taşıyan d&uuml;zeltmelerdir.
      </p>

      <h2>Rakamlarla</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 commit</strong> ana Perry derleyicisine</li>
        <li><strong>3 s&uuml;r&uuml;m</strong>: v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 ana &ouml;zellik</strong>: Linux&apos;tan Windows&apos;a cross-compile</li>
        <li><strong>1 yeni uygulama kategorisi</strong>: iOS oyun d&ouml;ng&uuml;leri</li>
        <li><strong>68/68</strong> perrysdad&apos;da deterministik test eşitliği</li>
        <li><strong>50&apos;den fazla hata d&uuml;zeltmesi</strong>: NaN-boxing, stdlib ve yerel FFI genelinde</li>
        <li><strong>2 belge yeniden yazımı</strong>: perry.toml ve Geisterhand</li>
        <li><strong>5 Hub iyileştirmesi</strong>: iki aşamalı iş hattı, Azure otomatik başlatma, işçi otomatik g&uuml;ncelleme</li>
      </ul>

      <h2>Sırada Ne Var</h2>
      <p>
        Windows cross-compilation, tamamen otomatik &ccedil;ok platformlu CI/CD&apos;nin kapısını a&ccedil;ıyor — TypeScript g&ouml;nderin, her işletim sistemi i&ccedil;in &ouml;zel build makineleri olmadan her hedef i&ccedil;in yerel ikili dosyalar alın. Oyun d&ouml;ng&uuml;s&uuml; desteği tamamen yeni bir iOS uygulama kategorisinin kilidini a&ccedil;ıyor. Ve perrysdad&apos;da %100 deterministik test eşitliği, self-hosting&apos;in &ccedil;ok ger&ccedil;ek hale geldiği anlamına geliyor. Kalan:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Tam regex desteği</strong> — son b&uuml;y&uuml;k dil a&ccedil;ığı</li>
        <li><strong>perry/ui genişlemesi</strong> — s&uuml;r&uuml;kle bırak, erişilebilirlik etiketleri, DatePicker</li>
        <li><strong>perrysdad Faz 6</strong> — async/await, jenerat&ouml;rler, tam Perry eşitliğine doğru genişleme</li>
        <li><strong>Hub genel beta</strong> — dağıtık build&apos;leri dış kullanıcılara a&ccedil;ma</li>
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
