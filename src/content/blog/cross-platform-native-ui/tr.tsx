import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry&apos;nin en iddiali hedeflerinden biri, tek bir TypeScript kod tabanindan gercekten yerel GUI uygulamalari
        sunmaktir. Yerel bir kabukla sarmalanmis web gorunumleri degil. Kendi piksellerini cizen
        ozel bir renderlama motoru degil. Her platformun kendi UI cercevesi tarafindan renderlanan gercek yerel widget&apos;lar,
        derleme zamaninda TypeScript&apos;ten derlenmis.
      </p>
      <p>
        Bu yazi nasil calistigini acikliyor — mimari, platform esleme, odunler
        ve bugun nerede oldugumuz.
      </p>

      <h2>Mevcut Yaklasimlarin Sorunu</h2>
      <p>
        Coklu platform GUI gelistirme onlarca yildir zor bir problem olmustur. Her buyuk
        cerceve farkli bir odunler seti yapmistir:
      </p>

      <h3>Electron / Tauri (Web tabanli)</h3>
      <p>
        Electron, Chromium ve Node.js&apos;yi paketleyerek uygulama kabugunuz olarak bir web tarayicisi sunar.
        Web platformuna tam erisim elde edersiniz, ancak &quot;yerel&quot; uygulamaniz yuzlerce megabayt RAM kullanan
        150+ MB&apos;lik bir indirmedir — sadece bir pencere gostermek icin. Tauri, Chromium&apos;u
        isletim sistemi web gorunumuyle degistirerek boyutu onemli olcude azaltir, ancak UI&apos;niz hala
        web gorunumunde renderlanan HTML/CSS&apos;dir — yerel widget&apos;lar degil.
      </p>

      <h3>React Native (Kopru tabanli)</h3>
      <p>
        React Native, JavaScript&apos;inizi bir JS motorunda (Hermes veya V8) calistirir ve serializasyon edilmis
        bir mesaj kuyrugu araciligiyla yerel widget&apos;lara kopru kurar. Gercek yerel widget&apos;lar elde edersiniz, ancak kopru
        gecikme ekler, ozellikle hareketler ve animasyonlar icin. Karmasik etkilesimler
        yerel koda (Swift/Kotlin) inmeyi gerektirir, bu da tek kod tabani sozu verilmesini gecirsiz kilar.
      </p>

      <h3>Flutter (Ozel renderlayici)</h3>
      <p>
        Flutter, Dart&apos;i yerel koda derler ve her seyi kendi Skia tabanli
        renderlama motoruyla cizer. Performans mukemmeldir, ancak widget&apos;lariniz yerel degildir — piksel
        mukemmel kopyalardir. Bu, platform konvansiyonlarinin (kayma fizigi, metin secimi,
        erisebilirlik davranislari) miras alinmak yerine yeniden uygulanmasi gerektigini ifade eder. Masaustunde
        farklar daha belirgin hale gelir.
      </p>

      <h3>KMP + Compose Multiplatform (Kismi yerel)</h3>
      <p>
        Kotlin Multiplatform, Android&apos;de JVM&apos;ye ve iOS&apos;ta yerel&apos;e derler, ancak
        Compose Multiplatform araciligiyla paylasilan UI, Skia tabanli bir renderlayici kullanir — Flutter ile ayni odun.
        Gercekten yerel UI icin platforma ozgu kod yazmaniz gerekir.
      </p>

      <h2>Perry&apos;nin Yaklasimi: Yerel Arac Setlerine Derleme</h2>
      <p>
        Perry temelden farkli bir yaklasim benimser. Kodunuzu bir calisma zamaninda calistirip
        yerel widget&apos;lara kopru kurmak veya ozel pikseller cizmek yerine, Perry TypeScript
        UI kodunuzu derleme zamaninda dogrudan her platformun yerel arac setine yapilan cagrilara derler.
      </p>
      <p>
        Onemli fark: <strong>kodunuz ile platform SDK&apos;si arasinda calisma zamani katmani yoktur.</strong>{" "}
        Derlenmis ikili dosya AppKit, UIKit, Android Views, GTK4 veya Win32&apos;yi dogrudan cagirir,
        tipki Swift, Kotlin veya C++ ile yazilmis bir uygulamanin yapacagi gibi.
      </p>

      <h2>Birlesik UI API&apos;si</h2>
      <p>
        Perry, kullanici arayuzleri olusturmak icin ortak bir TypeScript API&apos;si saglar. Bu API
        bilerek yuksek seviyelidir — UI&apos;nizin ne icermesi gerektigini ve nasil davranmasi gerektigini
        tanimlarsiniz, Perry onu uygun yerel yapilara esler.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Ayni kod alti platformun hepsinde yerel UI&apos;ya derlenir. <code className="text-perry-400">#ifdef</code> yok,
        platform kontrolleri yok, kosullu import&apos;lar yok.
      </p>

      <h2>Detayli Platform Eslemesi</h2>
      <p>
        Perry&apos;nin birlesik API&apos;yi her platformun yerel cercevesine nasil esledigini inceleyelim:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        macOS&apos;ta Perry, AppKit nesnelerini dogrudan olusturan ve yoneten kod uretir.
        Bir <code className="text-perry-400">App</code>, bir <code className="text-perry-400">NSWindow</code> ile
        bir <code className="text-perry-400">NSApplication</code> olur.{" "}
        <code className="text-perry-400">Text</code>, <code className="text-perry-400">NSTextField</code> olur (duzenleme devre disi).{" "}
        <code className="text-perry-400">Button</code>, callback&apos;inize baglanmis target-action deseniyle
        <code className="text-perry-400">NSButton</code> olur.{" "}
        <code className="text-perry-400">VStack</code>, dikey yonelimli bir <code className="text-perry-400">NSStackView</code> olur.
        Yerlesim Auto Layout kisitlamalari kullanir.
      </p>
      <p>
        Derlenmis ikili dosya AppKit cercevesine baglanir ve Objective-C calisma zamani
        fonksiyonlarini dogrudan cagirir. Xcode ile derlenmis Swift&apos;in yapacagi sey budur.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        iOS&apos;ta esleme benzerdir ancak UIKit&apos;i hedefler.{" "}
        <code className="text-perry-400">App</code>, bir <code className="text-perry-400">UIWindow</code> ve kok <code className="text-perry-400">UIViewController</code> ile
        bir <code className="text-perry-400">UIApplication</code> olur.{" "}
        <code className="text-perry-400">Text</code>, <code className="text-perry-400">UILabel</code>&apos;a eslenir.{" "}
        <code className="text-perry-400">Button</code>, <code className="text-perry-400">UIButton</code>&apos;a eslenir.{" "}
        Yerlesim <code className="text-perry-400">UIStackView</code> ve Auto Layout kullanir.
        Dokunma olaylari UIKit&apos;in yanitlayici zinciri araciligiyla islenir.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        Android&apos;de Perry, JNI (Java Native Interface) araciligiyla yuklenen yerel bir kutuphane uretir.{" "}
        <code className="text-perry-400">App</code>, bir <code className="text-perry-400">Activity</code>&apos;ye eslenir.{" "}
        <code className="text-perry-400">Text</code>, bir <code className="text-perry-400">TextView</code> olur.{" "}
        <code className="text-perry-400">Button</code>, bir <code className="text-perry-400">OnClickListener</code> ile
        <code className="text-perry-400">android.widget.Button</code> olur.{" "}
        <code className="text-perry-400">VStack</code>, dikey bir <code className="text-perry-400">LinearLayout</code>&apos;a eslenir.
        Yerel kod, JNI araciligiyla Android cercevesine geri cagri yapar, gercek Android view&apos;larini olusturur ve
        manipule eder.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        Linux&apos;ta Perry, GTK4&apos;u hedefler.{" "}
        <code className="text-perry-400">App</code>, bir <code className="text-perry-400">GtkApplicationWindow</code> ile
        bir <code className="text-perry-400">GtkApplication</code> olur.{" "}
        <code className="text-perry-400">Text</code>, <code className="text-perry-400">GtkLabel</code>&apos;a eslenir.{" "}
        <code className="text-perry-400">Button</code>, bir sinyal isleyicisi ile
        <code className="text-perry-400">GtkButton</code>&apos;a eslenir.{" "}
        <code className="text-perry-400">VStack</code>, dikey yonelimli bir <code className="text-perry-400">GtkBox</code>&apos;a eslenir.
        GTK&apos;nin CSS temalamasi, uygulamanizin kullanicinin masaustu temasini otomatik olarak takip etmesi anlamina gelir.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        Windows&apos;ta Perry, Win32 API cagilari uretir.{" "}
        <code className="text-perry-400">App</code> bir pencere sinifi olusturur, kaydeder ve bir mesaj dongusu calistirir.{" "}
        <code className="text-perry-400">Button</code>, <code className="text-perry-400">CreateWindowEx</code> ile olusturulan bir
        <code className="text-perry-400">BUTTON</code> kontrolu olur.{" "}
        <code className="text-perry-400">Text</code>, bir <code className="text-perry-400">STATIC</code> kontrole eslenir.
        Olaylar Win32 mesaj pompasi araciligiyla islenir (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code> vb.).
      </p>

      <h2>Durum Yonetimi</h2>
      <p>
        Perry&apos;nin <code className="text-perry-400">State&lt;T&gt;</code> temeli, platforma yerel guncelleme
        mekanizmalarina derlenen reaktif durum yonetimi saglar. Bir durum degeri degistiginde,
        Perry platformun kendi gecersiz kilma sistemi araciligiyla bir UI guncellemesi tetikler —
        macOS/iOS&apos;ta <code className="text-perry-400">setNeedsDisplay</code>,{" "}
        Android&apos;de <code className="text-perry-400">invalidate()</code>,{" "}
        Linux&apos;ta <code className="text-perry-400">gtk_widget_queue_draw</code>.
      </p>
      <p>
        Sanal DOM farkliligi yok, uzlasma gecisi yok, serializasyon yok. Durum
        degisiklikleri degeri gosteren yerel widget&apos;a dogrudan yayilir.
      </p>

      <h2>Neden SwiftUI / Jetpack Compose Sozdizimi Degil?</h2>
      <p>
        Perry&apos;nin neden SwiftUI veya Jetpack Compose&apos;a benzer bir bildirimsel sozdizimi kullanmadigini merak
        edebilirsiniz. Cevap pragmatiktir: Perry TypeScript derler ve TypeScript&apos;in kendi deyimleri vardir.
        TypeScript gelistiricilerine yabanci gelen bir DSL icat etmek yerine,
        Perry TypeScript&apos;te dogal hissettiren bir olusturucu tarzi API kullanir — yapicilar,
        metot cagrilari, geri cagirmalar ve kapanimlar. Express, React hook&apos;lari veya herhangi baska bir TypeScript kutuphanesiyle
        calisirken zaten kullandiginiz kaliplardir.
      </p>

      <h2>Bugun Mevcut Olan</h2>
      <p>
        Alti platform arka ucunun tamami uygulanmis ve kararlıdır. Mevcut widget seti sunlari icerir:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Yerlesim</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Goruntuleme</strong> — Text, Image</li>
        <li><strong>Giris</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navigasyon</strong> — NavigationView, TabView, List</li>
        <li><strong>Konteynerler</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>Durum</strong> — reaktif guncellemeler icin State&lt;T&gt;</li>
      </ul>

      <h2>Sirada Ne Var</h2>
      <p>
        Widget kutuphanesini aktif olarak genisletiyoruz. Siradakiler:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — platforma yerel guvenli metin girisi ile sifre alani</li>
        <li><code className="text-perry-400">ProgressView</code> — belirli ve belirsiz ilerleme gostergeleri</li>
        <li><code className="text-perry-400">Alert</code> — butonlar ve metin alanlari ile yerel uyari diyaloglari</li>
        <li><code className="text-perry-400">DatePicker</code> — platforma yerel tarih/saat secimi</li>
        <li><code className="text-perry-400">Menu</code> — yerel menu cubugu ve baglam menuleri</li>
      </ul>
      <p>
        Hedef tum platformlarda tam GUI cerceve paritesidir — her widget, yerlesim,
        hareket ve animasyon her yerde mevcut. Tam resim icin{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">yol haritasina</Link> bakin.
      </p>

      <h2>Deneyin</h2>
      <p>
        Perry&apos;nin yerel UI&apos;sini anlamanin en iyi yolu onu calisirken gormektir.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link>, tamamen
        TypeScript ile Perry kullanilarak olusturulmus yerel bir JSON goruntuluyucudur — agac navigasyonu,
        arama ve klavye kisayollariyla gercek bir uygulama, macOS, iOS ve Android&apos;de yerel ikililer olarak
        derlenmistir. Nasil yapildiginin{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">tam anlatimini</Link>{" "}
        okuyun.
      </p>
    </>
  );
}
