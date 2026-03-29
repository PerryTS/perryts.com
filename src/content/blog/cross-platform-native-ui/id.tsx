import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Salah satu tujuan paling ambisius Perry adalah menghadirkan aplikasi GUI yang benar-benar native
        dari satu codebase TypeScript. Bukan web view yang dibungkus dalam shell native. Bukan engine
        rendering kustom yang menggambar pikselnya sendiri. Widget native asli, di-render oleh framework
        UI milik masing-masing platform, dikompilasi dari TypeScript pada waktu build.
      </p>
      <p>
        Artikel ini menjelaskan cara kerjanya — arsitektur, pemetaan platform, trade-off,
        dan di mana kami berada saat ini.
      </p>

      <h2>Masalah dengan Pendekatan Saat Ini</h2>
      <p>
        Pengembangan GUI lintas platform telah menjadi masalah sulit selama beberapa dekade. Setiap
        framework besar membuat set kompromi yang berbeda:
      </p>

      <h3>Electron / Tauri (Berbasis Web)</h3>
      <p>
        Electron membundel Chromium dan Node.js, memberikan Anda browser web sebagai shell aplikasi.
        Anda mendapat akses penuh ke platform web, tapi aplikasi &quot;native&quot; Anda berukuran
        150+ MB yang menggunakan ratusan megabyte RAM hanya untuk menampilkan sebuah jendela. Tauri
        mengganti Chromium dengan web view OS, mengurangi ukuran secara drastis, tapi UI Anda tetap
        HTML/CSS yang di-render dalam web view — bukan widget native.
      </p>

      <h3>React Native (Berbasis Bridge)</h3>
      <p>
        React Native menjalankan JavaScript Anda di JS engine (Hermes atau V8) dan menjembatani ke
        widget native melalui antrian pesan serial. Anda mendapat widget native asli, tapi bridge
        menambah latensi, terutama untuk gesture dan animasi. Interaksi kompleks memerlukan penulisan
        kode native (Swift/Kotlin), mengalahkan janji satu codebase.
      </p>

      <h3>Flutter (Renderer kustom)</h3>
      <p>
        Flutter mengkompilasi Dart ke kode native dan menggambar semuanya dengan engine rendering
        berbasis Skia. Performanya sangat baik, tapi widget Anda bukan native — mereka adalah replika
        pixel-perfect. Ini berarti konvensi platform (fisika scroll, pemilihan teks, perilaku
        aksesibilitas) harus diimplementasi ulang alih-alih diwarisi. Dan di desktop, perbedaannya
        semakin terlihat.
      </p>

      <h3>KMP + Compose Multiplatform (Sebagian native)</h3>
      <p>
        Kotlin Multiplatform mengkompilasi ke JVM di Android dan native di iOS, tapi UI bersama
        melalui Compose Multiplatform menggunakan renderer berbasis Skia kustom — trade-off yang sama
        dengan Flutter. Untuk UI yang benar-benar native, Anda kembali menulis kode khusus platform.
      </p>

      <h2>Pendekatan Perry: Kompilasi ke Toolkit Native</h2>
      <p>
        Perry mengambil pendekatan yang secara fundamental berbeda. Alih-alih menjalankan kode Anda
        di runtime dan menjembatani ke widget native, atau menggambar piksel kustom, Perry
        mengkompilasi kode UI TypeScript Anda langsung menjadi panggilan ke toolkit native setiap
        platform pada waktu build.
      </p>
      <p>
        Perbedaan kuncinya: <strong>tidak ada lapisan runtime antara kode Anda dan SDK platform.</strong>{" "}
        Binary yang dikompilasi memanggil AppKit, UIKit, Android Views, GTK4, atau Win32 secara
        langsung, persis seperti aplikasi yang ditulis dalam Swift, Kotlin, atau C++.
      </p>

      <h2>API UI Terpadu</h2>
      <p>
        Perry menyediakan API TypeScript umum untuk membangun antarmuka pengguna. API ini sengaja
        dibuat high-level — Anda mendeskripsikan apa yang harus ada di UI dan bagaimana perilakunya,
        dan Perry memetakannya ke konstruksi native yang sesuai.
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
        Kode yang sama ini dikompilasi menjadi UI native di keenam platform. Tanpa <code className="text-perry-400">#ifdef</code>,
        tanpa pengecekan platform, tanpa import kondisional.
      </p>

      <h2>Detail Pemetaan Platform</h2>
      <p>
        Berikut cara Perry memetakan API terpadu ke framework native setiap platform:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        Di macOS, Perry menghasilkan kode yang membuat dan mengelola objek AppKit secara langsung.
        <code className="text-perry-400">App</code> menjadi <code className="text-perry-400">NSApplication</code> dengan
        sebuah <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> menjadi <code className="text-perry-400">NSTextField</code> (dengan editing dinonaktifkan).{" "}
        <code className="text-perry-400">Button</code> menjadi <code className="text-perry-400">NSButton</code> dengan pola target-action
        yang terhubung ke callback Anda.{" "}
        <code className="text-perry-400">VStack</code> menjadi <code className="text-perry-400">NSStackView</code> dengan
        orientasi vertikal. Layout menggunakan Auto Layout constraints.
      </p>
      <p>
        Binary yang dikompilasi terhubung dengan framework AppKit dan memanggil fungsi Objective-C
        runtime secara langsung. Ini sama persis dengan yang dilakukan Swift yang dikompilasi Xcode.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        Di iOS, pemetaannya serupa tapi menargetkan UIKit.{" "}
        <code className="text-perry-400">App</code> menjadi <code className="text-perry-400">UIApplication</code> dengan
        sebuah <code className="text-perry-400">UIWindow</code> dan root <code className="text-perry-400">UIViewController</code>.{" "}
        <code className="text-perry-400">Text</code> dipetakan ke <code className="text-perry-400">UILabel</code>.{" "}
        <code className="text-perry-400">Button</code> dipetakan ke <code className="text-perry-400">UIButton</code>.{" "}
        Layout menggunakan <code className="text-perry-400">UIStackView</code> dan Auto Layout.
        Event sentuh ditangani melalui responder chain UIKit.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        Di Android, Perry menghasilkan library native yang dimuat melalui JNI (Java Native Interface).{" "}
        <code className="text-perry-400">App</code> dipetakan ke <code className="text-perry-400">Activity</code>.{" "}
        <code className="text-perry-400">Text</code> menjadi <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> menjadi <code className="text-perry-400">android.widget.Button</code> dengan
        sebuah <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> dipetakan ke <code className="text-perry-400">LinearLayout</code> vertikal.
        Kode native memanggil kembali ke framework Android melalui JNI, membuat dan memanipulasi
        view Android asli.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        Di Linux, Perry menargetkan GTK4.{" "}
        <code className="text-perry-400">App</code> menjadi <code className="text-perry-400">GtkApplication</code> dengan
        sebuah <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> dipetakan ke <code className="text-perry-400">GtkLabel</code>.{" "}
        <code className="text-perry-400">Button</code> dipetakan ke <code className="text-perry-400">GtkButton</code> dengan
        sebuah signal handler.{" "}
        <code className="text-perry-400">VStack</code> dipetakan ke <code className="text-perry-400">GtkBox</code> dengan
        orientasi vertikal. Theming CSS GTK berarti aplikasi Anda secara otomatis mengikuti tema
        desktop pengguna.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        Di Windows, Perry menghasilkan panggilan Win32 API.{" "}
        <code className="text-perry-400">App</code> membuat window class, mendaftarkannya, dan menjalankan message loop.{" "}
        <code className="text-perry-400">Button</code> menjadi kontrol <code className="text-perry-400">BUTTON</code>
        yang dibuat dengan <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> dipetakan ke kontrol <code className="text-perry-400">STATIC</code>.
        Event ditangani melalui message pump Win32 (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, dll.).
      </p>

      <h2>Manajemen State</h2>
      <p>
        Primitif <code className="text-perry-400">State&lt;T&gt;</code> Perry menyediakan manajemen state
        reaktif yang dikompilasi ke mekanisme update native platform. Ketika nilai state berubah,
        Perry memicu update UI melalui sistem invalidasi milik platform
        — <code className="text-perry-400">setNeedsDisplay</code> di macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> di Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> di Linux.
      </p>
      <p>
        Tidak ada virtual DOM diffing, tidak ada pass reconciliation, tidak ada serialisasi. Perubahan
        state menyebar langsung ke widget native yang menampilkan nilainya.
      </p>

      <h2>Mengapa Bukan Sintaks SwiftUI / Jetpack Compose?</h2>
      <p>
        Anda mungkin bertanya mengapa Perry tidak menggunakan sintaks deklaratif mirip SwiftUI atau
        Jetpack Compose. Jawabannya pragmatis: Perry mengkompilasi TypeScript, dan TypeScript memiliki
        idiomnya sendiri. Alih-alih membuat DSL yang terasa asing bagi developer TypeScript, Perry
        menggunakan API bergaya builder yang terasa natural di TypeScript — constructor, pemanggilan
        method, callback, dan closure. Ini adalah pola yang sama yang sudah Anda gunakan saat bekerja
        dengan Express, React hooks, atau library TypeScript lainnya.
      </p>

      <h2>Yang Tersedia Saat Ini</h2>
      <p>
        Keenam backend platform telah diimplementasikan dan stabil. Set widget saat ini meliputi:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Layout</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Tampilan</strong> — Text, Image</li>
        <li><strong>Input</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navigasi</strong> — NavigationView, TabView, List</li>
        <li><strong>Container</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>State</strong> — State&lt;T&gt; untuk update reaktif</li>
      </ul>

      <h2>Yang Akan Datang</h2>
      <p>
        Kami aktif memperluas library widget. Selanjutnya:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — input password dengan secure text entry native platform</li>
        <li><code className="text-perry-400">ProgressView</code> — indikator progress determinate dan indeterminate</li>
        <li><code className="text-perry-400">Alert</code> — dialog alert native dengan tombol dan text field</li>
        <li><code className="text-perry-400">DatePicker</code> — pemilihan tanggal/waktu native platform</li>
        <li><code className="text-perry-400">Menu</code> — menu bar native dan context menu</li>
      </ul>
      <p>
        Tujuannya adalah paritas penuh framework GUI di semua platform — setiap widget, layout,
        gesture, dan animasi tersedia di mana saja. Lihat{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> untuk
        gambaran lengkapnya.
      </p>

      <h2>Coba Sekarang</h2>
      <p>
        Cara terbaik untuk memahami UI native Perry adalah melihatnya beraksi.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> adalah
        viewer JSON native yang dibangun sepenuhnya dengan TypeScript menggunakan Perry — aplikasi nyata
        dengan navigasi tree, pencarian, dan keyboard shortcut, dikompilasi menjadi binary native di
        macOS, iOS, dan Android. Baca{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">panduan lengkap</Link>{" "}
        tentang cara pembuatannya.
      </p>
    </>
  );
}
