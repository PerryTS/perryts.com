import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry adalah viewer JSON native yang dibangun sepenuhnya dengan TypeScript dan dikompilasi dengan Perry. Ini bukan demo teknologi — ini adalah alat nyata yang kami gunakan sehari-hari untuk menginspeksi respons API, file konfigurasi, dan data dump. Artikel ini membahas cara pembuatannya, cara kompilasinya, dan bagaimana pengalaman pengembangan ketika TypeScript Anda dikompilasi menjadi aplikasi native.
      </p>

      <h2>Apa yang Dilakukan Pry</h2>
      <p>
        Pry membaca file JSON (atau menerima JSON dari stdin) dan merendernya sebagai pohon interaktif yang dapat dinavigasi dalam jendela native. Jika Anda pernah menggunakan Quick Look bawaan macOS untuk JSON, bayangkan itu — tapi lebih cepat, bisa dicari, dan dengan navigasi keyboard.
      </p>
      <p>
        Fitur-fiturnya:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tampilan pohon</strong> — node yang bisa dilipat untuk objek dan array, dengan indikator kedalaman dan expand/collapse semua</li>
        <li><strong>Pencarian</strong> — pencarian teks penuh di key dan value dengan highlighting real-time dan navigasi hasil</li>
        <li><strong>Keyboard shortcut</strong> — tombol panah untuk navigasi, enter untuk expand/collapse, slash untuk mencari, <code className="text-perry-400">⌘C</code> untuk menyalin</li>
        <li><strong>Clipboard</strong> — salin node atau subtree apa pun sebagai JSON yang diformat</li>
        <li><strong>Pewarnaan sintaks</strong> — string hijau, angka oranye, boolean ungu, null merah</li>
        <li><strong>Status bar</strong> — menampilkan total node, kedalaman saat ini, ukuran file, dan waktu parsing</li>
      </ul>

      <h2>Kode Sumber</h2>
      <p>
        Pry ditulis dalam TypeScript standar. Tidak ada sintaks khusus, tidak ada macro, tidak ada code generation saat build. Ia menggunakan UI API Perry, yang menyediakan widget native yang dikompilasi ke kode spesifik platform.
      </p>
      <p>
        Berikut entry point-nya (disederhanakan untuk kejelasan):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Itulah inti dari aplikasi native. Tanpa boilerplate framework, tanpa konfigurasi build, tanpa file khusus platform. Satu file TypeScript.
      </p>

      <h3>Fungsi Pembantu</h3>
      <p>
        Pry juga menyertakan utilitas <code className="text-perry-400">countNodes</code> yang secara rekursif menghitung semua node dalam pohon JSON, dan helper <code className="text-perry-400">formatBytes</code> untuk menampilkan ukuran file. Ini adalah fungsi TypeScript standar — tidak ada yang khusus Perry. Mereka dikompilasi ke kode native seperti yang lainnya.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Mengkompilasi Pry</h2>
      <p>
        Mengkompilasi Pry dengan Perry adalah satu perintah. Tanpa proyek Xcode, tanpa konfigurasi Gradle, tanpa konfigurasi webpack. Cukup arahkan Perry ke file entry dan tentukan target Anda.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        Binary berukuran 48 MB karena mencakup seluruh stack UI AppKit — rendering tree view, highlighting pencarian, pewarnaan sintaks, dan penanganan keyboard. Sebagai perbandingan, aplikasi yang sama di Electron akan berukuran 200+ MB. Aplikasi Perry khusus CLI dikompilasi menjadi 2-5 MB.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        Build iOS terhubung dengan UIKit alih-alih AppKit. Perry memetakan API <code className="text-perry-400">TreeView</code> yang sama ke <code className="text-perry-400">UITableView</code> dengan section yang bisa di-expand, <code className="text-perry-400">SearchBar</code> ke <code className="text-perry-400">UISearchBar</code>, dan event sentuh menggantikan event mouse. Build iOS dapat di-deploy ke perangkat fisik dan simulator.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Build Android menghasilkan library native yang dimuat melalui JNI, dikemas ke dalam APK. <code className="text-perry-400">TreeView</code> dipetakan ke <code className="text-perry-400">RecyclerView</code> dengan expandable view holder, <code className="text-perry-400">SearchBar</code> dipetakan ke <code className="text-perry-400">EditText</code> dengan <code className="text-perry-400">TextWatcher</code>, dan status bar dipetakan ke <code className="text-perry-400">TextView</code> di bawah layout.
      </p>

      <h2>Apa yang Terjadi di Balik Layar</h2>
      <p>
        Ketika Perry mengkompilasi Pry, ia melewati beberapa fase:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Parse</strong> — SWC mem-parse source TypeScript menjadi AST. Import dari <code className="text-perry-400">perry/ui</code> dan <code className="text-perry-400">perry/fs</code> diselesaikan ke implementasi modul bawaan Perry.</li>
        <li><strong>Analisis tipe</strong> — Perry menyelesaikan semua tipe, termasuk <code className="text-perry-400">State&lt;string&gt;</code> dan <code className="text-perry-400">State&lt;number&gt;</code> generik, men-monomorphize-kan mereka menjadi tipe konkret.</li>
        <li><strong>Resolusi platform</strong> — Berdasarkan flag target, Perry memilih backend UI yang sesuai. Setiap panggilan <code className="text-perry-400">TreeView</code>, <code className="text-perry-400">SearchBar</code>, dan <code className="text-perry-400">Button</code> diselesaikan ke implementasi spesifik platform.</li>
        <li><strong>Pembuatan IR</strong> — Perry menghasilkan representasi intermediate yang mencakup panggilan API native — pengiriman pesan Objective-C untuk macOS/iOS, panggilan JNI untuk Android, panggilan fungsi C untuk GTK4/Win32.</li>
        <li><strong>Code generation</strong> — Cranelift mengkompilasi IR ke kode mesin native untuk arsitektur target.</li>
        <li><strong>Linking</strong> — Kode native dihubungkan dengan framework platform (AppKit, UIKit, Android NDK, GTK4, atau Win32) untuk menghasilkan executable akhir.</li>
      </ol>

      <h2>Tanpa Runtime, Tanpa Web View</h2>
      <p>
        Ini perlu ditekankan karena merupakan perbedaan inti antara Perry dan setiap pendekatan TypeScript-to-native lainnya. Binary Pry yang dikompilasi memiliki:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tanpa JavaScript engine</strong> — tanpa V8, tanpa Hermes, tanpa JavaScriptCore</li>
        <li><strong>Tanpa web view</strong> — tanpa Chromium, tanpa WebKit, tanpa WKWebView</li>
        <li><strong>Tanpa lapisan bridge</strong> — tanpa pesan serial antara JS dan native</li>
        <li><strong>Tanpa framework runtime</strong> — tanpa React, tanpa Flutter engine, tanpa Dart VM</li>
      </ul>
      <p>
        Binary memanggil API platform secara langsung. Di macOS, ia memanggil <code className="text-perry-400">objc_msgSend</code> untuk berinteraksi dengan objek AppKit. Di Android, ia memanggil fungsi JNI untuk membuat dan memanipulasi View. Ini persis yang dilakukan aplikasi Swift atau Kotlin native.
      </p>
      <p>
        Konsekuensi praktisnya: Pry langsung berjalan. Tidak ada startup VM, tidak ada pemanasan JIT, tidak ada parsing script. Proses dimulai, jendela muncul, JSON di-render. Penggunaan memori hanya sebagian kecil dari yang dikonsumsi Electron.
      </p>

      <h2>Pengalaman Developer</h2>
      <p>
        Membangun Pry terasa sangat mirip dengan membangun aplikasi TypeScript biasa. Alur kerjanya:
      </p>
      <ol className="list-decimal list-inside">
        <li>Tulis TypeScript di editor Anda (VS Code, Zed, Neovim, terserah Anda)</li>
        <li>Jalankan <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>Eksekusi <code className="text-perry-400">./pry test.json</code></li>
        <li>Iterasi</li>
      </ol>
      <p>
        Tanpa proyek Xcode yang perlu dikonfigurasi. Tanpa Android Studio yang perlu diinstal. Tanpa build Gradle yang memakan 45 detik. Compiler Perry sendiri cepat — parsing dan mengkompilasi Pry memakan beberapa detik, dan kami aktif bekerja untuk membuatnya lebih cepat.
      </p>
      <p>
        TypeScript yang Anda tulis adalah TypeScript standar. Type checking, autocomplete, dan tool refactoring editor Anda semuanya berfungsi. Anda bisa mengekstrak fungsi, membuat modul, menggunakan generics — semua pola TypeScript yang sudah Anda kenal.
      </p>

      <h2>Yang Kami Pelajari</h2>
      <p>
        Membangun Pry mengajarkan kami banyak tentang apa yang perlu didukung UI API Perry. Beberapa pelajaran:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tree view itu kompleks.</strong> Expand, collapse, highlighting pencarian, navigasi keyboard, dan integrasi clipboard semua perlu dikoordinasikan. Widget <code className="text-perry-400">TreeView</code> Perry menangani ini secara internal, tapi kami harus memastikan implementasi native konsisten di ketiga platform.</li>
        <li><strong>Keyboard shortcut perlu mengikuti konvensi platform.</strong> Di macOS, <code className="text-perry-400">⌘C</code> untuk menyalin. Di Linux dan Android, <code className="text-perry-400">Ctrl+C</code>. Sistem shortcut Perry mengabstraksi ini, tapi implementasinya perlu hati-hati.</li>
        <li><strong>Status bar ternyata tidak sederhana.</strong> Setiap platform memiliki konvensi berbeda tentang di mana dan bagaimana menampilkan informasi status. AppKit menggunakan bar bawah jendela, UIKit menggunakan toolbar, Android menggunakan view di bawah layout. Widget <code className="text-perry-400">StatusBar</code> Perry memetakan ke masing-masing dengan benar.</li>
        <li><strong>Dukungan stdin memerlukan kesadaran platform.</strong> Di macOS dan Linux, membaca dari stdin mudah. Di iOS dan Android, &quot;stdin&quot; tidak benar-benar ada dengan cara yang sama, jadi Pry menggunakan pemilihan file di platform mobile. <code className="text-perry-400">readStdin</code> Perry menangani ini secara transparan.</li>
      </ul>

      <h2>Performa</h2>
      <p>
        Pry menangani file JSON besar dengan nyaman. Dalam pengujian kami:
      </p>
      <ul className="list-disc list-inside">
        <li>File JSON 1 MB (10.000+ node) di-parse dan di-render dalam waktu kurang dari 50 ms</li>
        <li>File JSON 10 MB di-render dalam waktu kurang dari 200 ms</li>
        <li>Pencarian di 10.000 node mengembalikan hasil saat Anda mengetik, tanpa lag yang terlihat</li>
        <li>Penggunaan memori tetap di bawah 50 MB bahkan untuk file besar</li>
      </ul>
      <p>
        Ini adalah keunggulan kompilasi native. Parsing JSON di Perry dikompilasi menjadi loop native yang ketat tanpa jeda GC. Rendering pohon menggunakan list view tervirtualisasi milik platform (NSOutlineView, UITableView, RecyclerView), yang sudah teruji performanya.
      </p>

      <h2>Source dan Download</h2>
      <p>
        Pry adalah open source. Anda bisa menjelajahi source lengkap, build sendiri, atau cukup lihat kodenya untuk memahami struktur aplikasi UI native Perry.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            Repo GitHub
          </a>{" "}
          — source code lengkap dan instruksi build
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            Halaman showcase
          </Link>{" "}
          — screenshot, daftar fitur, dan detail platform
        </li>
      </ul>
      <p>
        Jika Anda sedang membangun sesuatu dengan Perry, kami ingin mendengarnya. Buka issue di{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          repo Perry
        </a>{" "}
        atau mulai diskusi. Kami membangun Perry secara terbuka dan feedback dari pengguna nyata yang membangun aplikasi nyata sangat berharga.
      </p>
    </>
  );
}
