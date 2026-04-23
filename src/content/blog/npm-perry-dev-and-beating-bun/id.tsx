export default function Content() {
  return (
    <>
      <p>
        Artikel terakhir ditutup dengan Perry di v0.5.80 dan satu kekalahan membandel di tabel benchmark: roundtrip <code>JSON.parse</code>/<code>stringify</code> masih 1,6x lebih lambat dari Node. Enam hari kemudian Perry berada di <strong>v0.5.174</strong> &mdash; itu berarti <strong>94 rilis patch</strong> &mdash; dan tiga hal berubah yang layak disorot sebelum yang lain:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> dirilis di <strong>npm</strong>. Satu perintah memasang Perry di setiap platform yang didukung.</li>
        <li><strong><code>perry dev</code></strong> menambahkan auto-recompile mode watch, di atas cache AST in-memory baru dan cache objek per-modul di-disk.</li>
        <li>Kekalahan <code>json_roundtrip</code> tertutup. Perry sekarang <strong>mengalahkan Node dan Bun pada setiap benchmark</strong> di suite utama (15/15 lawan keduanya).</li>
      </ul>
      <p>
        Sisa artikel ini adalah pemain pendukung: perbaikan WebAssembly, watchOS akhirnya kompilasi end-to-end, primitif <code>perry/thread</code> terhubung penuh sisanya, dan serangkaian kemenangan ketegasan compile-time yang mengubah drop diam-diam menjadi error nyata.
      </p>

      <h2>1. <code>@perryts/perry</code> di npm</h2>
      <p>
        Perry selalu dapat dipasang melalui Homebrew di macOS dan APT di Debian/Ubuntu. Cakupan yang baik untuk pengembang di platform tersebut, tidak ada sama sekali untuk pengguna Windows kecuali mereka membangun dari sumber, dan tidak ada yang seragam untuk tim yang mencampur Mac, Linux, dan Windows. v0.5.107 menghilangkan masalah itu.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        Paket ini adalah launcher tipis yang bergantung pada tujuh paket opsional per-platform &mdash; macOS arm64/x64, Linux x64/arm64 di glibc dan musl, Windows x64 &mdash; dan npm hanya memasang yang cocok dengan mesin Anda. Ukuran biner per platform berada di kisaran megabyte satu digit rendah. Pemasangannya sendiri hanya butuh hitungan detik. Ada juga jalur install global (<code>npm install -g @perryts/perry</code>) jika Anda lebih suka itu, tetapi install project-local mengunci versi compiler di samping dependensi Anda, yang merupakan default yang tepat.
      </p>
      <p>
        Publishing melalui OIDC Trusted Publisher sehingga setiap rilis memiliki provenance dan terhubung kembali ke job CI yang membangunnya. Itu adalah satu hari kerja CI tersendiri &mdash; beberapa commit CI <code>v0.5.107</code> mengejar kombinasi <code>--provenance</code> / versi npm / jalur workflow yang tepat &mdash; tetapi berhasil mendarat, dan setiap rilis sejak itu bersih. Pengguna Windows sekarang adalah warga kelas satu, dan friksi lintas-tim dari &ldquo;install sesuai yang OS Anda sukai&rdquo; sudah hilang.
      </p>

      <h2>2. <code>perry dev</code> &mdash; mode watch</h2>
      <p>
        v0.5.143 menambahkan subcommand CLI baru:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        Hanya itu. Ia mengawasi project Anda, merekompilasi saat simpan, dan meluncurkan ulang biner Anda. Inspirasinya adalah Vite dan <code>nodemon</code>; intinya adalah berhenti berpura-pura bahwa alur kerja compiler-ke-biner harus terasa lebih lambat daripada runtime. Untuk sebagian besar project <code>perry dev</code> membangun ulang dalam kurang dari satu detik pada cache yang hangat.
      </p>
      <p>
        Bagian &ldquo;cache hangat&rdquo; itu penting. Dua cache baru mendarat bersamaan dengan <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Cache AST in-memory</strong> (v0.5.156). Di seluruh rebuild dalam satu sesi <code>perry dev</code>, Perry menyimpan AST yang telah di-parse untuk setiap modul yang tidak berubah di disk. Mengedit satu file mem-parse ulang satu file, bukan seluruh graf modul.
        </li>
        <li>
          <strong>Cache objek per-modul di-disk (V2.2)</strong>. Setiap modul dikompilasi ke file <code>.o</code>-nya sendiri dan di-hash; modul yang tidak berubah melewati codegen sepenuhnya dan linker mengambil objek yang di-cache. Output verbose cache cocok dengan spesifikasi di <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, dan satu putaran audit hardening di v0.5.160 menutup edge case di mana entri cache basi bisa bertahan dari perubahan header.
        </li>
      </ul>
      <p>
        Kedua cache saling menumpuk. Edit pertama dari sesi adalah kompilasi penuh; setelah itu semuanya hanya melakukan pekerjaan sesuai dengan apa yang sebenarnya Anda ubah. Ini adalah pergeseran DX terbesar tunggal minggu ini.
      </p>

      <h2>3. Mengalahkan Bun pada setiap benchmark</h2>
      <p>
        Pada v0.5.166 README punya satu catatan jujur: Perry 1,6x lebih lambat dari Node pada <code>json_roundtrip</code> (50&times; <code>JSON.parse</code> + <code>JSON.stringify</code> pada blob 1MB, 10K-item), dan 2,4x lebih lambat dari Bun. Issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> melacak tindak lanjutnya. Pada v0.5.173 &mdash; tujuh hari kemudian &mdash; celah itu tertutup.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Beban kerja</th>
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
        Perry sekarang menang di setiap beban kerja di suite benchmark utama &mdash; <strong>15/15 lawan Node, 15/15 lawan Bun</strong>, terbaik dari 5 run di macOS ARM64. Bun 1.3 masih unggul pada peak RSS (84MB vs Perry 310MB pada <code>json_roundtrip</code>), jadi tekanan allocator adalah hal berikutnya yang harus ditutup, tetapi latensi mentah sudah milik Perry.
      </p>
      <p>
        Penutupan celah JSON bukanlah satu perubahan &mdash; itu adalah akumulasi pekerjaan paritas object-layout yang berjalan sepanjang minggu ini: inferensi shape object-literal Fase 1 (v0.5.167), inferensi tipe kembalian berbasis body Fase 4 untuk fungsi bebas, method kelas, getter, dan arrow (v0.5.169), dan inferensi tipe kembalian method-call Fase 4.1 (v0.5.170). Temanya sama seperti artikel lalu: beri LLVM struktur statis yang cukup untuk dilihat, dan optimizer melakukan sisanya.
      </p>
      <p>
        v0.5.164 juga memulihkan autovectorization parallel-accumulator <code>&lt;2 x double&gt;</code> pada loop reduksi pure-fadd, yang telah secara diam-diam mengalami regresi di suatu titik pada rentang v0.5.9x&rarr;v0.5.16x. Itulah yang membawa <code>math_intensive</code> dan <code>accumulate</code> kembali ke keunggulan 3-4x lama mereka atas Rust/C++/Go/Swift &mdash; LLVM yang sama, satu flag <code>reassoc contract</code>, satu body loop tervektorisasi.
      </p>

      <h2>4. <code>perry/ui</code> dan doc-tests</h2>
      <p>
        Empat celah perry/ui yang tersisa tertutup di v0.5.151. Bersamaan dengan itu, v0.5.119 membalikkan penyalahgunaan API perry/ui yang diam-diam dari &ldquo;kompilasi dan tidak melakukan apa-apa&rdquo; menjadi error kompilasi keras &mdash; logika yang sama dengan v0.5.165 yang diterapkan pada decorator (lihat di bawah). Penyalahgunaan yang muncul pada waktu kompilasi selalu lebih baik daripada pada waktu runtime.
      </p>
      <p>
        v0.5.123 merilis <strong>harness test doc-examples</strong> dan galeri widget. Setiap contoh TypeScript dalam dokumentasi sekarang dikompilasi pada setiap run CI, dan galeri widget membandingkan screenshot dengan baseline yang diberkati. v0.5.125 memperluasnya ke matriks cross-compile: setiap contoh doc dibangun untuk iOS, tvOS, Android, WASM, dan Web serta platform host, sehingga drift API lintas target tertangkap pada PR yang memperkenalkannya alih-alih siklus rilis yang mengirimkannya.
      </p>
      <p>
        Kemenangan kualitas-hidup kecil: <code>perry check</code> sekarang memancarkan <code>file:line:column</code> untuk error HIR lowering (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), yang berarti jump-to-error di editor berfungsi alih-alih menampilkan pesan generik tanpa lokasi.
      </p>

      <h2>5. watchOS kompilasi end-to-end</h2>
      <p>
        watchOS dirilis sebagai target kompilasi bulan lalu, tetapi build end-to-end yang bersih memiliki beberapa sisi kasar. Pekerjaan watchOS minggu ini:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> dan <code>--target watchos-simulator</code> sekarang kompilasi end-to-end tanpa workaround yang telah menumpuk.</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> untuk aplikasi Metal-surface.</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> untuk rendering yang di-host SwiftUI &mdash; ketika Anda ingin SwiftUI memiliki siklus hidup aplikasi dan Perry menyusun UI di dalamnya.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> terhubung ke perry-ui-ios dan perry-ui-tvos, sehingga testing UI Geisterhand berjalan dengan cara yang sama pada kedua target tersebut seperti di macOS dan Linux.</li>
      </ul>

      <h2>6. Primitif <code>perry/thread</code> terhubung sepenuhnya</h2>
      <p>
        v0.5.174 (hari ini) menutup <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code>, dan <code>spawn</code> terhubung sepenuhnya melalui jalur codegen dengan penegakan keamanan compile-time. Mutable capture ditolak pada waktu kompilasi &mdash; postur compile-time-correctness yang sama yang sekarang dimiliki perry/ui dan decorator. Primitif thread yang terhubung sebagian sejak pengumuman v0.4.0 sekarang lengkap end-to-end.
      </p>

      <h2>7. WebAssembly dan target web</h2>
      <p>
        Dua perbaikan WASM yang layak disorot:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: lima bug yang saling menumpuk di <code>--target web</code> (jalur output WASM) yang saling menutupi. Diperbaiki sebagai satu batch sehingga target web sekarang tahan di bawah permukaan <code>perry/ui</code> penuh (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> di dalam <code>if</code> di dalam loop menggantung di WASM &mdash; bug codegen yang tidak terproduksi ulang pada target native. Diperbaiki (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Juga di sisi kebenaran: v0.5.157 memperbaiki <code>obj.field</code> mengembalikan <code>NaN</code> di Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), dan v0.5.162 memperbaiki bug ws terkutuk di mana <code>sendToClient</code> dan <code>closeClient</code> telah terkompilasi menjadi no-op diam-diam (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Kemenangan ketegasan compile-time</h2>
      <p>
        Tema minggu ini: apa pun yang dulunya merupakan kegagalan diam-diam sekarang menjadi error kompilasi.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: decorator TypeScript di-parse menjadi HIR dan kemudian dijatuhkan diam-diam. Sekarang mereka error di titik dekorasi dengan pesan yang jelas (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). Penalaran warn&rarr;bail yang sama dengan v0.5.119 diterapkan pada perry/ui.</li>
        <li><strong>v0.5.119</strong>: penyalahgunaan API perry/ui ditolak pada waktu kompilasi alih-alih menghasilkan biner no-op.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> sekarang memancarkan backtrace native nyata ke stderr alih-alih hanya menggemakan pesan (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). Frame yang di-simbolisasi memerlukan <code>PERRY_DEBUG_SYMBOLS=1</code>; tanpa itu Anda mendapatkan alamat, yang masih lebih baik daripada perilaku echo-pesan yang digantikannya.</li>
      </ul>

      <h2>9. Penutup</h2>
      <p>
        Pola minggu ini: <strong>distribusi</strong> (npm), <strong>pengalaman pengembang</strong> (<code>perry dev</code>, cache inkremental), dan <strong>kekalahan benchmark terakhir yang tersisa tertutup</strong>. Ditambah serangkaian ketegasan compile-time yang mengubah drop diam-diam menjadi error nyata. Enam hari, 94 rilis patch, satu pergeseran DX besar.
      </p>
      <p>
        Cobalah:
      </p>
      <pre><code>{`# npm (platform apa pun)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Mode watch untuk dev iteratif
perry dev`}</code></pre>
      <p>
        Kode sumber: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
