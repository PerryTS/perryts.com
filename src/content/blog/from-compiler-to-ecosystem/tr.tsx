import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Bir hafta önce Perry, UI araç seti olan bir derleyiciydi. TypeScript yazabilir, yerel bir
        ikili dosyaya derleyebilir ve altı platformda dağıtabilirdiniz. Hikaye buydu. Bugün hikaye
        daha büyük: Perry bir ekosisteme dönüşüyor. Üç veritabanı ORM&apos;u, evrensel push bildirimleri,
        App Store ve Play Store yayınlaması ile dağıtık derlemeler, bir React uyumluluk katmanı
        ve otomatik uygulama doğrulaması — hepsi geçen hafta geldi.
      </p>
      <p>
        Bu yazı nelerin yayınlandığını, neden önemli olduğunu ve kodun nasıl göründüğünü kapsar.
      </p>

      <h2>perry/ui: Temel</h2>
      <p>
        Yeni kütüphanelere girmeden önce, her şeyin merkezinde ne olduğunu vurgulamakta fayda var:{" "}
        <code className="text-amber-400">perry/ui</code>. Bu, Perry&apos;nin kendi yerel UI araç setidir —
        altı hedefin tamamında doğrudan platforma özgü bileşenlere derlenen 20&apos;den fazla widget.
        Bir sarmalayıcı değil, bir soyutlama katmanı değil, bir web görünümü değil.
        Her <code className="text-amber-400">Button</code>, macOS&apos;ta bir{" "}
        <code className="text-amber-400">NSButton</code>, iOS&apos;ta bir{" "}
        <code className="text-amber-400">UIButton</code>, Linux&apos;ta bir{" "}
        <code className="text-amber-400">GtkButton</code>, Android&apos;de bir{" "}
        <code className="text-amber-400">android.widget.Button</code> ve Windows&apos;ta bir{" "}
        <code className="text-amber-400">CreateWindowEx</code> kontrolü olur.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code>, Perry&apos;nin birincil ve en gelişmiş
        UI yüzeyidir. Reaktif durum yönetimi, düzen konteynerları (VStack, HStack,
        ZStack, SplitView), donanım hızlandırmalı Canvas, sütun sıralamalı Table görünümleri,
        dosya diyalogları, keychain erişimi, bildirimler ve çoklu pencere için{" "}
        <code className="text-amber-400">perry/system</code> modülünü içerir — hepsi TypeScript&apos;ten,
        hepsi doğrudan platform API çağrılarına derlenir. React uyumluluk katmanı dahil Perry&apos;deki
        diğer tüm UI yaklaşımları, <code className="text-amber-400">perry/ui</code> üzerine inşa edilir
        ve onun widget&apos;larına eşlenir.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        Reaktif <code className="text-amber-400">State</code> nesnesi anahtar ilkeldir.
        Bir State değeri değiştiğinde, yalnızca o duruma bağlı widget&apos;lar güncellenir — sanal DOM
        karşılaştırması yok, tam ağaç yeniden renderlama yok, uzlaştırma geçişi yok. TypeScript&apos;ten
        yerel platform UI&apos;sine mevcut en doğrudan yoldur.
      </p>

      <h2>React Uyumluluğu: perry/ui Üzerinde İnce Bir Katman</h2>
      <p>
        React&apos;ten gelen geliştiriciler için, <code className="text-amber-400">perry-react</code>{" "}
        React&apos;ın bileşen modelini{" "}
        <code className="text-amber-400">perry/ui</code> widget&apos;larına eşleyen bir uyumluluk katmanı sağlar.{" "}
        <code className="text-amber-400">useState</code>,{" "}
        <code className="text-amber-400">useRef</code>,{" "}
        <code className="text-amber-400">useReducer</code> ve JSX kullanabilirsiniz — ve Perry bunları
        altındaki aynı yerel widget&apos;lara derler. Ayrı bir renderlama motoru değil, bir kolaylık köprüsüdür.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        Perde arkasında, her JSX öğesi bir <code className="text-amber-400">perry/ui</code>{" "}
        widget&apos;ına eşlenir: <code className="text-amber-400">{`<div>`}</code> bir VStack olur,{" "}
        <code className="text-amber-400">{`<button>`}</code> bir Button olur,{" "}
        <code className="text-amber-400">useState</code> Perry&apos;nin reaktif State&apos;i tarafından desteklenir.
        Erken aşamada — tam ağaç yeniden renderlama ve global hook depolama ile Faz 1 — ama
        mevcut React kodunun Perry aracılığıyla yerel platformları hedefleyebildiğini kanıtlıyor.
        Benzer hatlar boyunca Angular ve Ionic uyumluluğunu da keşfediyoruz.
      </p>

      <h2>Üç Veritabanı ORM&apos;u: Prisma API&apos;si, Yerel Performans</h2>
      <p>
        Bir veritabanıyla iletişim kuran bir sunucu veya masaüstü uygulaması oluşturuyorsanız, Perry artık
        sizi Prisma uyumlu üç ORM ile karşılıyor:{" "}
        <code className="text-amber-400">perry-prisma</code> (MySQL),{" "}
        <code className="text-amber-400">perry-sqlite</code> (SQLite) ve{" "}
        <code className="text-amber-400">perry-postgres</code> (PostgreSQL). Üçü de{" "}
        <code className="text-amber-400">@prisma/client</code> için doğrudan yerine geçen
        değişikliklerdir. Aynı API, aynı sorgu kalıpları, ama doğrudan veritabanı FFI&apos;si ile yerel koda
        derlenir — Prisma motoru yok, Node.js yok.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Same Prisma API — compiled to native SQL via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Perde arkasında, her ORM{" "}
        <code className="text-amber-400">sqlx</code> kullanan bir Rust FFI katmanı tarafından desteklenen bir TypeScript ön yüzüdür.
        Sorgu akışı: TypeScript sorguyu JSON&apos;a serileştirir, FFI sınırı üzerinden geçirir, Rust parametreli SQL oluşturur,
        bağlantı havuzu üzerinden çalıştırır ve sonucu geri serileştirir. Prisma şeması
        derleme zamanında okunur — sıfır çalışma zamanı ayrıştırma.
      </p>
      <p>
        Üç uygulama kodlarının yaklaşık %95&apos;ini paylaşır. Farklılıklar beklediğiniz şeylerdir:
        tanımlayıcı tırnaklama (<code className="text-amber-400">`col`</code> vs{" "}
        <code className="text-amber-400">&quot;col&quot;</code>), yer tutucu sözdizimi ({" "}
        <code className="text-amber-400">?</code> vs{" "}
        <code className="text-amber-400">$1, $2</code>) ve işlem semantiği. Üçü de
        tam Prisma CRUD yüzeyini destekler: findMany, findFirst, findUnique, create, createMany,
        update, updateMany, upsert, delete, deleteMany, count — artı ham SQL, işlemler
        ve 10&apos;dan fazla WHERE filtre operatörü.
      </p>

      <h2>perry-push: Evrensel Push Bildirimleri</h2>
      <p>
        <code className="text-amber-400">perry-push</code>, her platformda push bildirimlerini yöneten
        tek bir kütüphanedir: APNs (iOS/macOS), FCM (Android), Web Push (tarayıcılar)
        ve WNS (Windows). Her sağlayıcı, tam olarak üç fonksiyona sahip bir Rust FFI modülüdür:{" "}
        <code className="text-amber-400">*_provider_new</code>,{" "}
        <code className="text-amber-400">*_provider_close</code> ve{" "}
        <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Unified result type for all providers</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Kriptografi{" "}
        <code className="text-amber-400">ring</code> tarafından yönetilir — APNs ve VAPID için ES256 JWT&apos;ler,
        FCM hizmet hesapları için RS256, Web Push yük şifrelemesi için AES-GCM. Hepsi yerel koda derlenir.
        <code className="text-amber-400">node-gyp</code> yok, OpenSSL bağımlılığı yok.
      </p>

      <h2>Perry Hub + Builder&apos;lar: Dağıtık Bulut Derlemeleri</h2>
      <p>
        Bu altyapı hamlesidir. <code className="text-amber-400">perry-hub</code>, Perry tarafından
        TypeScript&apos;ten derlenen bir derleme orkestrasyon sunucusudur ve bir derleme işçisi havuzunu yönetir.
        Projenizi gönderirsiniz, hub hedef platforma göre doğru işçiye yönlendirir
        ve işçi uygulamanızı derler, imzalar ve isteğe bağlı olarak yayınlar.
      </p>
      <p>
        Bugün iki işçi mevcut: bir macOS builder (macOS, iOS ve Android hedeflerini yönetir) ve bir
        Linux builder (Linux ve Android&apos;i yönetir). Her ikisi de WebSocket üzerinden hub&apos;a bağlanan,
        kaynak tarball&apos;ları indiren, Perry derleyicisini çalıştıran ve yapıtları geri yükleyen Rust ikili dosyalarıdır.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Kod imzalama</strong> — macOS için Apple noter onayı, iOS için provisioning profilleri, Android keystore imzalama</li>
        <li><strong>App Store yayınlama</strong> — App Store Connect ve Google Play Store&apos;a doğrudan yükleme</li>
        <li><strong>Yapıt yönetimi</strong> — derlenen ikili dosyalar TTL tabanlı temizleme ile hub&apos;a yüklenir</li>
        <li><strong>Lisans yönetimi</strong> — lisans başına hız limitleri, öncelikli kuyruklama (pro seviye öncelik alır)</li>
      </ul>
      <p>
        Hub&apos;ın kendisi büyüleyici bir vaka çalışmasıdır. Perry tarafından 2 MB yerel ikili dosyaya derlenen yaklaşık
        1.500 satırlık bir TypeScript dosyasıdır. HTTP için 3456 portunda Fastify ve WebSocket için
        3457 portunda <code className="text-amber-400">ws</code> çalıştırır. Tüm durum JSON kalıcılığı ile
        bellekte tutulur — harici veritabanı yok. <code className="text-amber-400">scp</code> ve bir
        systemd birim dosyası ile dağıtabileceğiniz türden bir sunucudur.
      </p>

      <h2>perry-verify: Otomatik Uygulama Doğrulaması</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>, derlenmiş bir ikili dosya ve yapılandırma alan,
        bir doğrulama ardışık düzeni çalıştıran ve ekran görüntüleriyle yapılandırılmış başarılı/başarısız sonuçları
        döndüren bağımsız bir HTTP hizmetidir. Uygulamayı başlatır, kimlik doğrulama akışlarını
        (deterministik veya yapay zeka destekli) çalıştırır, durumu kontrol eder ve kanıt yakalar.
      </p>
      <p>
        macOS (erişilebilirlik API&apos;leri aracılığıyla), Linux (AT-SPI) ve iOS Simulator ile Android Emulator
        için stub platform adaptörleri mevcuttur. Yapay zeka katmanı, deterministik kontrollerin mümkün
        olmadığı durumlarda yedek kimlik doğrulama ve durum doğrulaması için Claude kullanır.
        Hub&apos;ın derleme ardışık düzenine derleme sonrası adım olarak yerleştirilmek üzere tasarlanmıştır:
        derle, imzala, doğrula, yayınla.
      </p>

      <h2>Pry Her Yerde</h2>
      <p>
        Perry vitrin uygulaması olarak oluşturduğumuz yerel JSON görüntüleyicisi{" "}
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>,
        artık beş platformda sunuluyor.{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Mac App Store
        </a>{" "}
        ve{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Google Play
        </a>&apos;de, Linux ve Windows için yerel ikili dosyalarla birlikte. Aynı TypeScript kod tabanı, beş
        platforma özgü giriş noktası, beş yerel ikili dosya. Tüm bu yaklaşımın uçtan uca
        çalıştığının en somut kanıtıdır — TypeScript kaynağından App Store listesine.
      </p>

      <h2>Tüm Bunlar Ne Anlama Geliyor</h2>
      <p>
        Bir derleyici ilginçtir. Bir ekosistem kullanışlıdır. Geçen hafta Perry,
        &quot;TypeScript&apos;i yerele derleyebilirsiniz&quot;den &quot;yerel UI, Prisma veritabanı,
        push bildirimleri ve App Store&apos;a otomatik yayınlayan derlemelerle tam bir uygulama
        oluşturabilirsiniz&quot;e geçti.
      </p>
      <p>
        Parçalar bağlanmaya başlıyor:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> TypeScript&apos;ten yerel platform UI&apos;sine en doğrudan yoldur — reaktif durum, 20&apos;den fazla widget, sıfır soyutlama katmanı</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> mevcut veritabanı kodunun minimum değişiklikle taşınabileceği anlamına gelir</li>
        <li><strong>perry-push</strong> platforma özgü kütüphaneler olmadan yerel push bildirimleri anlamına gelir</li>
        <li><strong>perry-hub + builder&apos;lar</strong> <code className="text-amber-400">perry publish</code>&apos;ten App Store&apos;a tek adımda gidebileceğiniz anlamına gelir</li>
        <li><strong>perry-verify</strong> yalnızca kaynak değil, derlenmiş çıktının otomatik testi anlamına gelir</li>
        <li><strong>perry-react</strong> React geliştiricilerinin tanıdık kalıpları kullanarak Perry&apos;ye geçebileceği, hepsinin altında perry/ui&apos;ye eşlendiği anlamına gelir</li>
      </ul>
      <p>
        Bunlar teorik değil. Burada listelenen her kütüphanenin çalışan kodu, testleri ve
        belgeleri var. Birçoğu zaten üretimde kullanılıyor — Perry landing sitesinin kendisi
        Perry ile derlenmiş bir Fastify sunucusunda çalışıyor ve Pry iki uygulama mağazasında yayında.
      </p>

      <h2>Sırada Ne Var</h2>
      <p>
        Yakın vadeli yol haritası:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui genişlemesi</strong> — sürükle bırak, erişilebilirlik etiketleri, özel bağlam menüleri, daha fazla düzen ilkeli</li>
        <li><strong>perry-verify entegrasyonu</strong> — derleme ardışık düzeninde otomatik doğrulama</li>
        <li><strong>Framework uyumluluğu</strong> — perry/ui&apos;ye giriş rampaları olarak React, Angular ve Ionic katmanlarının iyileştirilmesi</li>
        <li><strong>Tam regex desteği</strong> — yerele derlenen ECMAScript uyumlu regex motoru</li>
      </ul>
      <p>
        Gelişmeleri{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>&apos;da takip edin veya tam resim için{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">yol haritasına</Link>
        {" "}göz atın.
      </p>
    </>
  );
}
