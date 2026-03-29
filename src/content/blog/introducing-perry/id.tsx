import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Kami dengan senang hati memperkenalkan Perry — sebuah compiler TypeScript native yang ditulis
        dalam Rust yang mengkompilasi TypeScript Anda langsung menjadi executable mandiri. Tanpa
        runtime Node.js, tanpa wrapper Electron, tanpa kompromi. Hanya kode Anda, dikompilasi menjadi
        binary native yang langsung berjalan dan dapat dijalankan di mana saja.
      </p>
      <p>
        Perry merupakan pemikiran ulang fundamental tentang apa yang bisa dilakukan TypeScript. Alih-alih
        memperlakukannya sebagai superset dari JavaScript yang harus berjalan melalui JS engine, Perry
        memperlakukan TypeScript sebagai bahasa sistem — yang kebetulan memiliki sintaks yang sudah
        dikenal dan disukai jutaan developer.
      </p>

      <h2>Mengapa Kami Membangun Perry</h2>
      <p>
        TypeScript telah menjadi lingua franca pengembangan perangkat lunak modern. Ini adalah bahasa
        di balik sebagian besar frontend web, porsi backend yang terus bertumbuh, dan semakin menjadi
        pilihan untuk tooling, scripting, dan otomasi. Tapi ia selalu membawa keterbatasan fundamental:
        ia dikompilasi ke JavaScript, dan JavaScript memerlukan runtime.
      </p>
      <p>
        Runtime tersebut — baik itu Node.js, Deno, atau Bun — datang dengan trade-off.
        Waktu cold start yang diukur dalam puluhan atau ratusan milidetik. Overhead memori dari
        compiler JIT dan garbage collector. Distribusi binary yang harus membundel seluruh
        runtime atau mengharuskan pengguna menginstalnya. Dan untuk aplikasi GUI, satu-satunya
        pilihan adalah Electron, yang menyertakan seluruh browser Chromium dengan aplikasi Anda.
      </p>
      <p>
        Kami bertanya: bagaimana jika TypeScript tidak harus melalui JavaScript sama sekali? Bagaimana
        jika Anda bisa mengkompilasinya langsung ke kode mesin native, sama seperti Anda mengkompilasi
        Rust, Go, atau C++?
      </p>

      <h2>Cara Kerja Perry</h2>
      <p>
        Pipeline kompilasi Perry memiliki tiga tahap:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Parsing</strong> — Perry menggunakan SWC (parser TypeScript/JavaScript berbasis Rust)
          untuk mem-parse source TypeScript Anda menjadi AST. SWC adalah parser yang sama yang digunakan
          oleh Next.js, dan sangat cepat.
        </li>
        <li>
          <strong>Kompilasi berbasis tipe</strong> — Perry menelusuri AST dengan informasi tipe lengkap.
          Tidak seperti JS engine yang harus menangani tipe dinamis saat runtime, Perry mengetahui
          setiap tipe pada waktu kompilasi. Ini memungkinkan monomorphization generics, static dispatch
          untuk pemanggilan method, dan optimasi layout memori langsung.
        </li>
        <li>
          <strong>Code generation</strong> — Perry menghasilkan kode mesin native menggunakan Cranelift,
          code generator yang sama yang digunakan oleh Wasmtime dan bagian dari Firefox JIT. Cranelift
          menghasilkan kode native yang efisien untuk x86_64 dan ARM64.
        </li>
      </ol>
      <p>
        Hasilnya adalah executable mandiri — biasanya 2–5 MB untuk alat CLI — yang langsung
        berjalan tanpa waktu pemanasan.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>Fitur TypeScript yang Didukung</h2>
      <p>
        Perry mendukung subset TypeScript yang luas dan terus berkembang. Tujuannya adalah kompatibilitas
        penuh dengan bahasa sebagaimana developer benar-benar menggunakannya. Saat ini, itu mencakup:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Semua tipe primitif</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interface dan type alias</strong> — termasuk union type, intersection type, dan mapped type</li>
        <li><strong>Generics</strong> — dikompilasi melalui monomorphization, sehingga <code className="text-perry-400">Array&lt;number&gt;</code> dan <code className="text-perry-400">Array&lt;string&gt;</code> menghasilkan jalur kode yang dioptimalkan secara terpisah</li>
        <li><strong>Class</strong> — dengan inheritance, private field (<code className="text-perry-400">#field</code>), static member, getter/setter, dan decorator</li>
        <li><strong>Async/await dan Promise</strong> — dikompilasi menjadi state machine, mirip cara Rust menangani async</li>
        <li><strong>Generator dan iterator</strong> — <code className="text-perry-400">function*</code> dan loop <code className="text-perry-400">for...of</code></li>
        <li><strong>Closure</strong> — dengan semantik capture yang benar</li>
        <li><strong>Destructuring</strong> — array, object, pattern bersarang, dan rest element</li>
        <li><strong>Template literal</strong> — termasuk tagged template</li>
        <li><strong>Module</strong> — ESM import/export diselesaikan pada waktu kompilasi</li>
      </ul>

      <h2>UI Native Lintas Platform</h2>
      <p>
        Perry tidak terbatas pada alat CLI dan aplikasi sisi server. Perry dilengkapi dengan framework
        UI native untuk enam platform:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField, dan lainnya)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (API sama dengan iOS, dengan adaptasi khusus iPad)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, common controls, GDI)</li>
      </ul>
      <p>
        Insight kuncinya adalah Perry memetakan API TypeScript umum ke toolkit widget native setiap
        platform pada waktu kompilasi. Tidak ada lapisan bridge, tidak ada web view, dan tidak ada
        engine rendering kustom. Aplikasi Anda menggunakan widget platform asli, di-render oleh OS
        itu sendiri. Baca selengkapnya di pembahasan mendalam kami:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          UI Native Lintas Platform dari TypeScript
        </Link>.
      </p>

      <h2>27+ Implementasi Native Paket npm</h2>
      <p>
        Salah satu tantangan praktis terbesar dari compiler baru adalah kompatibilitas ekosistem.
        Developer tidak hanya menulis kode dari nol — mereka menggunakan paket. Perry mengatasi
        ini dengan implementasi native dari 27+ paket npm populer:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Database</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Keamanan</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Utilitas</strong> — uuid, chalk, dotenv, lodash (sebagian), moment</li>
        <li><strong>Sistem</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Ini bukan wrapper tipis di sekitar modul Node.js. Mereka dikompilasi langsung ke dalam
        binary Anda menggunakan library sistem native — libpq untuk PostgreSQL, OpenSSL untuk
        crypto, libcurl untuk HTTP. Surface API cocok dengan yang Anda harapkan dari paket npm,
        sehingga migrasi mudah dilakukan.
      </p>

      <h2>Layer Kompatibilitas V8 Opsional</h2>
      <p>
        Untuk paket npm yang belum memiliki implementasi native Perry, Perry menawarkan mode
        embedding V8 opsional. Ketika diaktifkan, Perry membundel runtime V8 dan dapat mengeksekusi
        paket npm JavaScript standar bersama TypeScript yang dikompilasi. Ini adalah escape hatch
        pragmatis yang memungkinkan Anda mengadopsi Perry secara bertahap — kompilasi hot path ke
        kode native sambil tetap mengakses seluruh ekosistem npm untuk yang lainnya.
      </p>

      <h2>Cross-Compilation</h2>
      <p>
        Perry mendukung cross-compilation secara bawaan. Dari mesin pengembangan macOS Anda,
        Anda dapat mengkompilasi untuk Linux (x86_64 dan ARM64) dan iOS. Ini berarti Anda dapat
        membangun pipeline CI/CD di macOS dan menghasilkan binary untuk semua target deployment
        tanpa memerlukan mesin build khusus untuk setiap platform.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Performa</h2>
      <p>
        Binary yang dikompilasi Perry sangat cepat. Karena tidak ada pemanasan JIT, tidak ada overhead
        interpreter, dan tidak ada jeda garbage collector, performa dapat diprediksi dan konsisten
        sejak pemanggilan pertama.
      </p>
      <p>
        Dalam benchmark kami:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Waktu startup</strong> — efektif 0 ms (peluncuran proses native)</li>
        <li><strong>Ukuran binary</strong> — 2–5 MB untuk alat CLI biasa (vs 50+ MB untuk Node.js yang dibundel)</li>
        <li><strong>Penggunaan memori</strong> — 5–10x lebih rendah dari aplikasi Node.js setara</li>
        <li><strong>Throughput</strong> — kompetitif dengan C yang ditulis tangan untuk beban kerja compute-bound</li>
      </ul>
      <p>
        Anda dapat melihat benchmark langsung di{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, yang membandingkan executable yang dikompilasi Perry dengan Node.js dan Bun secara real time.
      </p>

      <h2>Status Saat Ini</h2>
      <p>
        Perry sedang dalam pengembangan aktif. Compiler stabil dengan 62 dari 62 tes lolos
        di seluruh test suite. Semua enam backend UI platform berfungsi. Fitur bahasa inti
        solid dan terus berkembang.
      </p>
      <p>
        Kami sedang aktif memperluas library widget UI, meningkatkan performa string dan object,
        menyelesaikan dukungan regex penuh, dan membangun modul Stream. Dalam jangka panjang,
        kami merencanakan target kompilasi WASM, multi-threading, ekstensi VS Code, dan integrasi
        package manager.
      </p>
      <p>
        Lihat <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> lengkap untuk
        detail tentang apa yang sudah dirilis, sedang dikerjakan, dan akan datang.
      </p>

      <h2>Mulai Sekarang</h2>
      <p>
        Perry adalah open source. Anda dapat clone repo, build dari source, dan mulai mengkompilasi
        TypeScript hari ini:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Jelajahi source di{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , lihat{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">showcase</Link>
        {" "}untuk melihat apa yang sedang dibangun dengan Perry, atau langsung terjun ke kode.
        Kami tidak sabar melihat apa yang akan Anda bangun.
      </p>
    </>
  );
}
