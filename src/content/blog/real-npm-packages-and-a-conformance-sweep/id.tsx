export default function Content() {
  return (
    <>
      <p>
        Posting terakhir berakhir di <strong>v0.5.875</strong> dengan kisah GC — menutup gap yang dibuka benchmark aya_koto. Posting itu tentang memenangkan satu benchmark. Yang ini tentang jenis pekerjaan berbeda: sekitar <strong>270 release antara v0.5.875 dan v0.5.1146</strong>, mendarat selama sekitar empat minggu, hampir tidak ada yang menjadi headline benchmark. Temanya bergeser dari &ldquo;lari cepat di microbenchmark&rdquo; menjadi <strong>&ldquo;membuat TypeScript dunia nyata dan paket npm nyata benar-benar ter-compile dan berjalan.&rdquo;</strong> Plus perombakan visual Windows penuh dan setumpuk widget baru sepanjang jalan.
      </p>
      <p>
        Inilah yang dirilis, dikelompokkan menurut tujuan sebenarnya.
      </p>

      <h2>Paket npm nyata kini ter-compile</h2>
      <p>
        Benang tunggal terbesar lewat jendela ini adalah sapuan untuk membuat paket npm populer ter-compile menjadi binary native dan lulus tes perilaku — bukan sekadar &ldquo;link tanpa error,&rdquo; tetapi berjalan dan menghasilkan output yang benar. Daftar yang kini berfungsi lewat <code>perry.compilePackages</code> mencakup <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, dan Colyseus</strong>.
      </p>
      <p>
        Masing-masing gagal karena alasannya sendiri, dan setiap fix adalah cerita kecilnya sendiri:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> crash dengan <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>. Akar masalah (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code> di mana <code>F</code> adalah fungsi yang diimpor dari modul lain diam-diam menghasilkan objek kosong — body konstruktor tidak pernah berjalan, sehingga setiap pemeriksaan bergaya <code>$ZodCheckMinLength</code> kembali tanpa properti <code>_zod</code>-nya.</li>
        <li><strong>axios + jose</strong> membutuhkan crypto dan kompresi yang belum dimiliki Perry: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> untuk AES-GCM, dan <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> deadlock pada timeout polling satu detik di <code>wait_for_promise</code>; kami menggantinya dengan condvar wait dan membuat promise yang ditolak muncul sebagai <code>HTTP 500</code> alih-alih menggantung (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> tidak bisa membaca body POST — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> mengembalikan kosong pada POST/PUT sampai fix parent-registration di v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> semua menabrak bentuk yang sama: sebuah <em>nilai yang bisa dipanggil dengan properti terlampir</em> (<code>chalk.red</code>, <code>express()</code> plus <code>express.Router</code>). Tiga varian dari pola itu diperbaiki lintas v0.5.935 dan sapuan npm di sekitarnya, plus <code>util.inherits</code> + scaffold prototype stream untuk membuka jalan express (v0.5.990).</li>
        <li><strong>dayjs</strong>, dirilis sebagai bundle terminifikasi, melatih dispatch prototype-method JS-classic (<code>Class.prototype.m = fn</code>) yang di-lower Perry secara salah (v0.5.924/932).</li>
      </ul>
      <p>
        Di bawah semua itu duduk bagian yang membuat paket yang Perry <em>tidak bisa</em> compile secara native tetap berjalan: <strong>runtime fallback-V8</strong> menjadi nyata di jendela ini. ModuleLoader-nya kini membaca dari module map ter-embed, sehingga binary fallback tetap <strong>self-contained</strong> — tanpa <code>node_modules</code> lepas saat runtime (v0.5.994). <code>createServer</code> menjembatani ke server hyper nyata (v0.5.999), dan global Web Fetch <code>Response</code> / <code>Request</code> / <code>Headers</code> ada di jalur fallback (v0.5.1006). Dan <strong>dynamic <code>import()</code> compile-time</strong> — <code>await import(&apos;./foo.ts&apos;)</code> string-literal diselesaikan saat build — akhirnya mendarat (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Sapuan konformansi test262</h2>
      <p>
        Benang dominan lainnya adalah konformansi. Kami menjalankan pass terfokus terhadap radar subset test262 dan menggerakkan jarum pada built-in yang paling diandalkan kode nyata:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        Lonjakan String datang dari memberi setiap metode <code>String.prototype</code> dispatch <code>this</code>-generik dan memperbaiki koersi indeks <code>slice</code>/<code>substring</code>. Lonjakan Array adalah <code>thisArg</code> pada callback dense-array (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), <code>ToLength</code> array-like, pengurutan operasi spec, dan validasi zero-argument. Destructuring mengambil parameter-destructuring lintas metode kelas plain, generator, async-generator, static, dan private.
      </p>
      <p>
        Bersama angka headline, ekor panjang kebenaran mendarat: <code>JSON.parse</code> kini melempar <code>SyntaxError</code> nyata (bukan <code>TypeError</code>) dan menolak token di belakang; reviver-nya berjalan via algoritma spec <code>InternalizeJSONProperty</code>; <code>Object.prototype.toString</code> mem-brand dengan benar untuk typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; <code>RegExp.prototype.toString</code> mengembalikan <code>/source/flags</code>; async generator memperoleh semantik <code>yield</code>-awaits-operand-nya dengan benar. Ini adalah radar subset, bukan suite penuh — Perry masih mendaki — tetapi pendakian bulan ini curam.
      </p>

      <h2>Windows menjadi Fluent</h2>
      <p>
        Windows mendapat perombakan visual (seri <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>). Window Perry kini ikut serta dalam chrome DWM modern secara default — <strong>backdrop Mica</strong>, sudut membulat, dan title bar yang sadar-tema — dan kontrol umum me-render lewat <strong>comctl32 v6</strong> alih-alih default era Windows 95. Window proc kini menangani <code>WM_DPICHANGED</code>, sehingga jendela tetap tajam saat kamu menyeretnya antar monitor dengan scaling campuran alih-alih ter-stretch bitmap.
      </p>
      <p>
        Yang penting, tidak ada satu pun dari ini yang memperkenalkan kembali regresi lama <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;area hitam setelah resize&rdquo;: area klien tetap dilukis opaque, dan blur-through Mica/Acrylic full-frame tetap opt-in eksplisit <code>app.setVibrancy(...)</code>. Ada juga scaffold backend <code>--target windows-winui</code> baru (WinUI 3) untuk aplikasi yang menginginkan stack sepenuhnya modern, dan fix kecil tetapi nyata yang membuat <code>perry compile main.ts -o main</code> menghasilkan <code>main.exe</code> di Windows sehingga PowerShell benar-benar meluncurkannya (v0.5.1146).
      </p>

      <h2>Widget baru, setiap platform</h2>
      <p>
        Dua widget mendarat hanya di hari terakhir, dan keduanya merentang setiap platform UI yang ditarget Perry:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — kontrol tanggal bergaya field yang ringkas: <code>NSDatePicker</code> di macOS, <code>UIDatePicker</code> (.compact) di iOS/visionOS, <code>SysDateTimePick32</code> di Windows, <code>android.widget.DatePicker</code> di Android, GTK4 di Linux. Satu permukaan TS lintas semuanya.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — widget apa pun bisa menjadi tujuan drop dan sumber drag untuk teks/file/URL, dipetakan ke <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit), dan <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Lebih awal di jendela ini rak widget juga terisi lintas desktop dan mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, dan ImageGallery yang bisa di-swipe — masing-masing didukung kontrol native nyata di setiap platform. HarmonyOS (ArkTS) mendapat Chart dan TreeView (v0.5.893), dua widget terakhir yang ia butuhkan untuk mencapai paritas dengan yang lain.
      </p>

      <h2>GC, internals, dan stabilitas</h2>
      <p>
        Sebagian besar dari 270 release itu bukan headline — itu bug fix dan internals, dan itulah inti fase ini. Beberapa yang layak disebut:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC berlanjut.</strong> Kerja free-list kondisional dari posting GC terus mengendap, dan kelas bug tajam ditutup: Promise yang dijembatani native kini <strong>di-pin selama in-flight di worker tokio</strong> sehingga GC tidak bisa menyapunya sebelum resolusi mendarat (v0.5.923). Jika kamu menjalankan fetch async di bawah beban dan melihat collection hantu, itu adalah ini.</li>
        <li><strong>Model memori didokumentasikan.</strong> Kini ada deep-dive <code>internals/memory-model.md</code> — NaN-boxing, GC generasional, shadow stack, dan write barrier — tersambung ke situs dokumentasi (v0.5.933).</li>
        <li><strong>Gelombang fix stabilitas codegen</strong> yang dimunculkan sapuan npm: arrow <code>const</code> level-modul yang dipanggil di dalam langkah async yang diresume tidak lagi SIGSEGV (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> tidak lagi menggantung selamanya (v0.5.870), dan segelintir crash <code>js_is_truthy</code> / raw-pointer-range yang ditabrak bundle nyata.</li>
      </ul>

      <h2>Beberes Apple</h2>
      <p>
        Lebih kecil tetapi nyata: <code>perry setup ios --development</code> kini menyediakan provisi untuk build development (v0.5.1023), dan jalur build/link cross-library Apple dideduplikasi dan dibuat pointer-width-portable (v0.5.1121/1125) — yang membuka matriks publish npm / Homebrew / APT / winget yang sempat tersangkut.
      </p>

      <h2>Di mana ini meninggalkan segalanya</h2>
      <p>
        Taruhan di balik Perry selalu bahwa &ldquo;TypeScript native&rdquo; hanya berarti jika TypeScript <em>nyata</em> berjalan — bukan subset mainan, tetapi paket aktual yang orang <code>npm install</code>. Bulan ini sebagian besar pekerjaan itu: kurang satu angka untuk dibanggakan, lebih dorongan panjang tanpa glamor untuk menutup gap antara &ldquo;ter-compile&rdquo; dan &ldquo;berfungsi.&rdquo; Radar konformansi dan tes paritas npm adalah papan skor yang kami awasi sekarang, dan kami akan terus memposting angkanya — yang bagus dan yang masih belum sempurna.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
