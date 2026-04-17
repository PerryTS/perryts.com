export default function Content() {
  return (
    <>
      <p>
        Artikel blog terakhir dirilis bersamaan dengan Perry v0.5.12. Hari ini kami di v0.5.80. Itu berarti <strong>68 rilis patch dalam tujuh hari</strong>, hampir seluruhnya difokuskan pada satu hal: mengubah setiap slow path yang tersisa menjadi fast path.
      </p>
      <p>
        Peralihan LLVM di v0.5.0 pulih hingga setara dengan Cranelift pada v0.5.12. Itu adalah akhir dari satu cerita dan awal dari cerita lain. LLVM kini melihat segalanya. Pertanyaan berhenti menjadi &ldquo;mengapa ini lambat?&rdquo; dan berubah menjadi &ldquo;mengapa ini belum cepat?&rdquo; &mdash; yang merupakan pertanyaan yang jauh lebih mudah ditangani.
      </p>
      <p>
        Artikel ini adalah tur minggu tersebut. JSON mendapat percepatan 547x. mimalloc menjadi allocator global. Property access mendapat monomorphic inline cache. Buffer mendapat slot pointer bertipe dengan metadata <code>noalias</code>. Server Fastify dan WebSocket berhenti crash setelah satu menit. Dan benchmark bergerak lagi.
      </p>

      <h2>1. JSON: menutup celah 547x</h2>
      <p>
        Pada v0.5.29, JSON.parse Perry pada array 20-record adalah <strong>547x lebih lambat dari Node</strong>. Pada v0.5.46 angkanya menjadi 1,3x. Angka itu adalah delta tunggal terbesar minggu ini, dan layak ditelusuri karena setiap optimasi lain dalam artikel ini adalah variasi dari tema yang sama: jangan lakukan pekerjaan yang tidak perlu Anda lakukan.
      </p>
      <p>
        Parser asli mengalokasikan satu Vec per properti, satu Vec key per objek, dan satu thread-local yang dijaga RefCell untuk cache key. Ia menyalin setiap string. Ia me-rehash setiap nama field. Ia membangun shape objek baru untuk setiap record, bahkan ketika semua 20 record memiliki field yang sama persis dalam urutan yang sama persis. Parser Node menangani ini dengan mengenali pola dan berbagi satu shape tunggal di semua record. Parser Perry tidak.
      </p>
      <p>Perbaikannya datang dalam empat langkah:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Key interning melalui <code>PARSE_KEY_CACHE</code> thread-local</strong> (v0.5.45). Record pertama mengalokasikan N string key; record 2 hingga 20 mengalokasikan nol. Key yang berulang diselesaikan ke pointer yang sama, yang membuatnya dapat digunakan sebagai key lookup shape-cache tanpa strcmp.</li>
        <li><strong>Shape sharing melalui transition cache</strong> (v0.5.45). Objek yang dibangun oleh <code>js_object_set_field_by_name</code> berjalan di graf transisi yang sama. Ketika schema berulang, pointer <code>keys_array</code> dibagi, dan itulah yang dibutuhkan polymorphic inline cache untuk hit.</li>
        <li><strong>Parsing string zero-copy + pembangunan objek inkremental</strong> (v0.5.46). <code>parse_string_bytes</code> sekarang mengembalikan <code>ParsedStr::Borrowed(&amp;[u8])</code> ketika tidak ada escape backslash &mdash; yang merupakan kasus umum untuk setiap key dan sebagian besar value. <code>parse_object</code> menulis field secara langsung alih-alih mengumpulkannya ke dalam Vec terlebih dahulu.</li>
        <li><strong>Penekanan GC selama parse</strong> (v0.5.60, menutup #59). Mem-parse array besar mengalokasikan ribuan objek kecil dalam loop yang ketat. Setiap alokasi memicu pemeriksaan threshold GC. Menyetel flag &ldquo;parsing in progress&rdquo; menunda koleksi hingga parse selesai &mdash; ukuran heap efektif yang sama, jauh lebih sedikit percabangan pembukuan.</li>
      </ol>
      <p>
        Kemudian stringify. JSON.stringify pada array homogen &mdash; shape yang sama, jutaan kali &mdash; melakukan iterasi properti penuh per objek, yang untuk array dengan shape-stable adalah pemborosan murni. Perbaikan lima langkah menutup sebagian besar celah itu juga:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: fast path itoa / ryu untuk angka, pemeriksaan referensi sirkular berbasis kedalaman alih-alih HashSet.</li>
        <li>v0.5.63: guard <code>toJSON</code> + cache key persisten + dispatch inline (tiga biaya per-call yang menumpuk).</li>
        <li>v0.5.65: template stringify shape-homogen + fast path escape ASCII. Ketika setiap elemen memiliki shape yang sama, scaffolding key/colon/comma diprakomputasi sekali.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: cache shape-template per-call, menutup celah GC sisa parse, menghilangkan sisa overhead per-call yang tetap.</li>
        <li>v0.5.79: jalur nilai kecil. Angka, boolean, dan string pendek melewati jalur langsung yang tidak menyiapkan mesin objek apa pun.</li>
      </ul>
      <p>
        Hasil kumulatif: pipeline JSON yang <strong>547x di belakang Node</strong> pada awal minggu sekarang kira-kira <strong>1,3x di belakang pada parse dan kompetitif pada stringify</strong>, pada beban kerja realistis.
      </p>

      <h2>2. Kisah allocator</h2>
      <p>
        Perry banyak mengalokasikan. Setiap literal objek, setiap literal array, setiap konkatenasi string, setiap closure. Allocator adalah hot, dan untuk sebagian besar v0.5, ia adalah system allocator bawaan Rust plus arena thread-local untuk nilai berumur pendek.
      </p>
      <p>
        v0.5.67 mengganti allocator global dengan <strong>mimalloc</strong>. Ini adalah perubahan satu baris di Cargo.toml yang segera membayar diri pada beban kerja apa pun yang melakukan banyak alokasi kecil &mdash; yang berarti setiap program TypeScript. v0.5.66 mendahuluinya dengan mengonsolidasikan semua state thread-local <code>gc_malloc</code> menjadi satu akses TLS per panggilan, sehingga jalur ke mimalloc semurah mungkin.
      </p>
      <p>
        v0.5.68 melangkah lebih jauh dengan <strong>string yang dialokasikan di arena</strong>. String berumur pendek (hasil konkatenasi perantara, potongan <code>split()</code>, scratch parser) melewati allocator global sepenuhnya dan mendarat di bump arena per-thread yang direset di batas natural. Untuk parsing JSON ini sendiri adalah kemenangan persentase dua digit.
      </p>
      <p>
        Dan dua optimasi yang sama sekali tidak mengalokasikan:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Scalar replacement dari objek non-escape</strong> (v0.5.17, lalu literal objek di v0.5.76). Jika sebuah objek tidak pernah meninggalkan fungsi pembungkusnya, ia tidak perlu ada. Field-nya menjadi local biasa. LLVM menangani ini secara default begitu Anda berhenti menyembunyikan objek di balik panggilan allocator yang tidak transparan.</li>
        <li><strong>Scalar replacement dari array non-escape</strong> (v0.5.73). Ide yang sama &mdash; jika array tidak escape, elemennya menjadi nilai SSA dan seluruh alokasi menghilang.</li>
      </ul>
      <p>
        Khusus untuk jalur literal array, v0.5.69 menambahkan <strong>fast path ukuran-tepat</strong> (lewati mesin pertumbuhan kapasitas ketika ukurannya diketahui pada waktu kompilasi), dan v0.5.74 menginline IR bump-allocator untuk literal array kecil sehingga LLVM bisa melihat alokasinya, melipatnya, mengangkatnya, atau menghilangkannya. Benchmark yang array-heavy bergerak satu langkah lagi.
      </p>
      <p>
        Sebagai penutup, v0.5.25 memperbaiki bug yang lebih tenang: <code>gc_malloc</code> tidak memicu koleksi di jalurnya sendiri, sehingga beban kerja yang malloc-heavy dapat menumbuhkan heap tanpa batas sebelum ada yang memeriksa. v0.5.61 menambahkan sizing langkah adaptif ke threshold, yang merupakan apa yang sebenarnya Anda inginkan: periksa dengan murah ketika heap kecil, lebih jarang ketika besar.
      </p>

      <h2>3. Property access mendapat inline cache sungguhan</h2>
      <p>
        Setiap mesin JavaScript modern memiliki polymorphic inline cache (PIC) pada property access. Untuk sebagian besar seri v0.5 Perry, PropertyGet berjalan melalui shape-table lookup dengan hash thread-local. Itu baik-baik saja untuk kode dingin. Itu tidak baik-baik saja ketika 95% pembacaan properti Anda di call site tertentu melihat shape yang sama, yang hampir selalu terjadi.
      </p>
      <p>
        v0.5.44 mendaratkan <strong>monomorphic inline cache</strong> untuk <code>PropertyGet</code>. Setiap site PropertyGet mendapat entri cache per-callsite: pointer shape yang diharapkan dan offset field. Jalur hit adalah satu compare plus satu indexed load. Jalur miss jatuh ke helper lambat yang memperbarui cache.
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51 menambahkan <strong>cache shape-transition berbasis content-hash</strong> untuk penulisan properti dinamis. Dua objek yang menumbuhkan field yang sama dalam urutan yang sama akan hash ke transisi yang sama, sehingga mereka berbagi shape yang sama &mdash; dan itu berarti sisi baca PIC benar-benar hit.
      </p>
      <p>
        v0.5.55 mengupas akses TLS terakhir dari transition cache. v0.5.46 memperbaiki bug PIC miss-handler di mana objek dengan &gt;8 field membaca melewati slot inline ke memori yang tidak diinisialisasi (menutup #55). v0.5.78 menambahkan guard untuk mencegah PIC PropertyGet mengindeks ke receiver non-pointer seperti angka mentah &mdash; yang bisa terjadi pada refinement tipe yang terlalu optimistis dan merupakan salah satu masalah stabilitas terakhir di IC.
      </p>
      <p>
        Efek bersih: kode yang property-heavy &mdash; yang dalam praktik berarti sebagian besar TypeScript &mdash; kira-kira 2-3x lebih cepat dari seminggu yang lalu, hanya dari IC saja.
      </p>

      <h2>4. Integer, bitwise, dan pola <code>| 0</code></h2>
      <p>
        NaN-boxing membuat setiap angka menjadi f64. Programmer TypeScript menulis <code>x | 0</code> untuk memaksa semantik integer. V8 telah menghabiskan lima belas tahun membuat itu murah. Perry menghabiskan minggu ini untuk mengejar ketertinggalan.
      </p>
      <p>Tumpukan perubahan, berurutan:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> untuk <code>(int / const) | 0</code>. LLVM melipatnya menjadi <code>smulh + asr</code>, yang ~2 siklus vs ~10 untuk <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> pada batas Uint8ArrayGet. Mengganti diamond branch+phi pemeriksaan batas dengan satu basic block yang dapat dipikirkan oleh vectorizer.</li>
        <li><strong>v0.5.49</strong>: perbaiki operasi bitwise dengan NaN/Infinity untuk menghasilkan 0 sesuai spec ToInt32. Kebenaran dulu.</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code> yang melewati guard NaN/Inf 5-instruksi ketika nilai diketahui-finite. Plus <code>alwaysinline</code> pada helper kecil dan deteksi clamp.</li>
        <li><strong>v0.5.52</strong>: target fungsi clamp langsung dengan intrinsik <code>smin</code>/<code>smax</code>. Clamp adalah pola integer paling umum setelah increment.</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> dan <code>x &gt;&gt;&gt; 0</code> pada nilai yang diketahui-finite menjadi noop &mdash; hanya <code>fptosi + sitofp</code>, tanpa guard sama sekali.</li>
        <li><strong>v0.5.56</strong>: operasi bitwise i32-native; index dan value i32 di Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> diturunkan ke native i32 multiply alih-alih jalur polyfill. Deteksi polyfill mengenali shim <code>Math.imul</code> yang ditulis pengguna dan menggantinya.</li>
        <li><strong>v0.5.59</strong>: inlining init fungsi murni + seeding integer-local. Analisis integer function-local dapat melihat melewati batas call ketika callee kecil dan murni.</li>
        <li><strong>v0.5.37&ndash;v0.5.40</strong>: fast path aritmetika integer pola-akumulator. Loop klasik <code>for (...) acc += f(i)</code> tetap di i32 end-to-end ketika tipenya mengizinkan.</li>
      </ul>
      <p>
        v0.5.41 adalah yang halus. Ketika codegen melihat <code>const K: number[][] = [[...], ...]</code> tingkat-modul, ia menurunkannya seluruhnya menjadi konstanta <code>[N x i32]</code> flat di <code>.rodata</code>. <code>K[y][x]</code> menjadi satu <code>getelementptr + load i32</code>. Dikombinasikan dengan jembatan analisis integer di v0.5.43, inilah yang memberi <code>image_conv</code> (Gaussian blur 5&times;5 pada frame RGB 4K) <strong>percepatan 3x dalam satu rilis</strong>.
      </p>

      <h2>5. Buffer dan Uint8Array</h2>
      <p>
        Beban kerja biner &mdash; kripto, pemrosesan gambar, parsing, networking &mdash; hidup di Buffer dan Uint8Array. v0.5.64 memberi mereka <strong>slot pointer bertipe plus metadata <code>noalias</code></strong>. Di mana Buffer dulunya adalah double NaN-boxed di <code>alloca double</code>, sekarang ia adalah pointer <code>i64</code> mentah di <code>alloca i64</code>, dengan anotasi LLVM yang memberi tahu optimizer &ldquo;pointer ini tidak alias dengan pointer lain dalam scope.&rdquo; Itu membuka penyusunan ulang load/store, vectorization, dan alokasi register yang jika tidak akan ditolak oleh optimizer.
      </p>
      <p>
        v0.5.80 menutup masalah kebenaran terakhir di sini: counter <code>alias-scope</code> buffer module-wide yang di-reset per-fungsi, yang dalam kasus langka bisa membiarkan LLVM bernalar lintas scope yang tidak seharusnya berbagi ID scope. Sekarang counter-nya module-wide dan cerita <code>noalias</code> benar-benar rapat.
      </p>
      <p>
        v0.5.53 membuat <code>Uint8ArraySet</code> branchless &mdash; masked store alih-alih if/else yang menulis 0 saat out-of-bounds. v0.5.54 menambahkan <strong>Two-Way indexOf</strong> untuk pola yang lebih panjang dan <code>split</code> yang dialokasikan di arena, yang bersama-sama menutup sebagian besar celah pada parsing Buffer yang string-heavy.
      </p>

      <h2>6. String: ASCII adalah fast path</h2>
      <p>
        String JavaScript adalah UTF-16, tetapi sebagian besar string dunia nyata (key, identifier, header HTTP, scaffolding JSON) adalah ASCII. v0.5.71 menambahkan <strong>O(1) <code>charCodeAt</code> dan <code>codePointAt</code> untuk string ASCII</strong> &mdash; tanpa scan UTF-16, hanya byte load. v0.5.20 sudah membuat <code>indexOf</code>, <code>slice</code>, dan <code>charAt</code> melewati scan UTF-16 pada ASCII.
      </p>
      <p>
        Satu catatan kebenaran di dalam rilis yang sama: <code>String.length</code> sekarang mengembalikan code unit UTF-16 (spec ECMAScript) alih-alih jumlah byte. Itu adalah bug yang mengintai di mana <code>&quot;caf&eacute;&quot;.length</code> mengembalikan 5 alih-alih 4.
      </p>

      <h2>7. Server-server sekarang benar-benar tetap hidup</h2>
      <p>
        Pekerjaan paling tidak glamor minggu ini juga yang paling terlihat oleh pengguna: membuat server gaya Node yang berjalan lama &mdash; Fastify, ws, http, net &mdash; tidak crash setelah beberapa menit.
      </p>
      <p>
        Semua crash tersebut berbagi akar masalah: GC tidak tahu tentang closure listener. Ketika Anda menulis <code>wss.on(&apos;message&apos;, handler)</code>, closure menangkap variabel, yang hidup sebagai field di dalam cell yang dialokasikan GC. Jika root scanner GC tidak tahu untuk mengunjungi cell tersebut, capture-nya direklamasi dan event message berikutnya melakukan dereference memori yang sudah dibebaskan.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: root-scan closure event listener <code>net.Socket</code> (menutup #35).</li>
        <li><strong>v0.5.27</strong>: perluas ke <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>.</li>
        <li><strong>v0.5.28</strong>: daftarkan global tingkat-modul sebagai root GC (menutup #36). Bug lifetime satu lapis di atasnya.</li>
        <li><strong>v0.5.21</strong>: keamanan <code>gc()</code> di dalam handler request Fastify/WebSocket &mdash; panggilan GC eksplisit berjalan saat handler request memegang pointer ke arena (menutup #31).</li>
      </ul>
      <p>
        Di samping pekerjaan GC, v0.5.20 merilis <strong>event loop utama</strong> &mdash; yang sungguhan, bukan placeholder &mdash; yang menjaga server berbasis WebSocket dan timer tetap hidup alih-alih keluar setelah panggilan sync terakhir kembali (refs #28). Ini adalah perbaikan tunggal paling berdampak bagi siapa pun yang mencoba menjalankan Perry sebagai server HTTP produksi. Fastify sekarang tetap hidup. Server WebSocket sekarang tetap hidup.
      </p>
      <p>
        v0.5.19 memperbaiki ketidakcocokan ABI SysV AMD64 untuk argumen/return FFI JSValue &mdash; masalah di Linux di mana panggilan FFI native dapat secara diam-diam merusak argumen. v0.5.18 menambahkan dispatch native untuk <code>axios</code> (get/post/put/delete/patch), termasuk <code>response.status</code> dan <code>response.data</code>. v0.5.30 memperbaiki dispatch <code>fastify request.header()</code> dan <code>request.headers[]</code>, yang telah mengembalikan undefined untuk lookup case-insensitive.
      </p>

      <h2>8. <code>@perry/postgres</code>: driver yang membuat semua ini perlu</h2>
      <p>
        Banyak pekerjaan minggu ini didorong oleh satu beban kerja: membuat <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">driver Postgres</a> yang sepenuhnya kompatibel dengan Node berjalan di Perry-native. Driver ini mampu TLS, memiliki registri codec lintas-modul, mendukung cancel/close/notify, dan sekarang di-benchmark melawan <code>pg</code>, <code>postgres.js</code>, dan <code>tokio-postgres</code>.
      </p>
      <p>Pekerjaan perf di sisi driver paralel dengan sisi compiler:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hoist codec per-kolom</strong> dan menghilangkan salinan Buffer per-sel. BigInt(string) untuk int8 untuk menghindari alokasi perantara.</li>
        <li><strong>Konstruktor Row dinamis per-shape</strong> untuk baris berbentuk objek. Jika query Anda selalu mengembalikan kolom yang sama, driver membangun konstruktor baris yang dispesialisasikan shape pertama kali dan menggunakannya kembali &mdash; yang, dikombinasikan dengan PIC compiler, membuat akses field pada baris secepat akses field pada objek lain.</li>
        <li><strong>Opt-out <code>parseTypes: &apos;minimal&apos;</code></strong> untuk caller yang menginginkan string mentah untuk int8/numeric/date.</li>
      </ul>
      <p>
        Ini adalah positive feedback loop yang selalu dimaksudkan untuk dimungkinkan oleh compiler. Driver nyata memunculkan bottleneck nyata. Bottleneck mendapat reproducer satu baris yang diajukan sebagai issue GitHub. Seminggu perbaikan compiler kemudian, driver menjadi lebih cepat dan compiler menjadi lebih cepat untuk semua orang juga. Itulah seluruh rencana, dikompresi menjadi tujuh hari.
      </p>

      <h2>9. Perbaikan kebenaran yang layak disebut</h2>
      <p>
        Pekerjaan performa memunculkan masalah kebenaran dengan cara seperti mengeruk sungai memunculkan kereta belanja. Daftar sebagian:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> membaca <code>.value</code> saat rejection alih-alih <code>.reason</code>, sehingga rejection tertelan diam-diam (v0.5.13&ndash;v0.5.14).</li>
        <li><strong>Promise.any</strong> sekarang melempar <code>AggregateError</code> yang tepat ketika semua input promise rejected. Menambahkan <code>Promise.withResolvers</code> dan memperbaiki urutan <code>queueMicrotask</code>.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> sekarang menghasilkan array karakter alih-alih objek rusak (menutup #16).</li>
        <li><strong>Aritmetika BigInt dan koersi <code>BigInt()</code></strong> (menutup #33). Fast path bigint i64 (v0.5.29) membuat kasus umum menjadi murah.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> dengan argumen byte numerik membandingkan dengan pointer buffer alih-alih nilai byte (menutup #56).</li>
        <li><strong>Operasi bitwise dengan NaN/Infinity</strong> menghasilkan 0 sesuai spec ToInt32 (menutup #57).</li>
        <li><strong>Windows x86_64</strong>: lima perbaikan platform-spesifik &mdash; <code>localtime</code>, penemuan <code>clang</code>, dan beberapa penyesuaian codegen &mdash; membuat Windows x86_64 kembali hijau (v0.5.72).</li>
      </ul>

      <h2>10. Angka-angkanya</h2>
      <p>
        Benchmark utama dari artikel terakhir adalah <code>factorial</code> pada 24,6x lebih cepat dari Node. Angka itu tidak berubah. Yang bergerak minggu ini adalah segalanya di sekitarnya:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Beban kerja</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (schema 20-record)</td><td className="text-right py-2 px-3">547x lebih lambat dari Node</td><td className="text-right py-2 px-3">1,3x lebih lambat dari Node</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (blur 4K 5&times;5)</td><td className="text-right py-2 px-3">1.980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4,3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Kode property-heavy (PIC hit)</td><td className="text-right py-2 px-3">baseline</td><td className="text-right py-2 px-3">2&ndash;3x</td><td className="text-right py-2 px-3 text-green-400">2&ndash;3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1,3x</td></tr>
            <tr><td className="py-2 px-3">Uptime Fastify di bawah beban</td><td className="text-right py-2 px-3">~60d sebelum crash</td><td className="text-right py-2 px-3">tak terbatas</td><td className="text-right py-2 px-3 text-green-400">&infin;</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Suite 15-benchmark lengkap melawan Node masih 14 kemenangan dan 1 seri &mdash; tabel yang sama seperti artikel lalu, dengan angka yang sedikit lebih baik di semua lini. Pergerakan nyata minggu ini ada pada beban kerja yang tidak ada dalam suite itu: JSON, pemrosesan gambar, server berjalan lama. Di sanalah celah-celah itu hidup, dan itulah yang telah ditutup.
      </p>

      <h2>11. Apa yang berikutnya</h2>
      <p>
        Satu benchmark yang masih kami kejar adalah <code>image_conv</code> vs Zig. Perry ada di 457ms; Zig ada di 246ms. Celah itu arsitektural, bukan tingkat optimization-pass, dan ia hidup di tiga tempat:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Local buffer bertipe</strong>. Sebagian besar pekerjaan Buffer mendarat minggu ini, tetapi parameter fungsi dan local bertipe buffer masih unbox di setiap akses. Pendekatan slot <code>i64</code> yang kami gunakan untuk counter loop perlu diperluas ke buffer.</li>
        <li><strong>Pemisahan loop interior/border</strong>. Loop blur men-clamp setiap piksel, termasuk 99,9% piksel yang tidak memerlukannya. Memisahkan menjadi region border (di-clamp) dan interior (tanpa clamp) memungkinkan LLVM memvektorisasi interior dengan NEON <code>ld3</code>/<code>st3</code>.</li>
        <li><strong>Hash FNV-1a Double-ABI</strong>. Helper hash dipanggil melalui ABI NaN-box. Menspesialisasikannya ke i64 mentah masuk/keluar untuk hot path adalah beberapa jam pekerjaan yang akan membayar di setiap beban kerja hash-heavy.</li>
      </ol>
      <p>
        Itu dilacak di <code>PERF_ROADMAP.md</code>. Harapkan untuk melihatnya di siklus berikutnya.
      </p>

      <h2>Penutup</h2>
      <p>
        Pola minggu ini &mdash; 68 rilis patch, hampir semua performa, satu celah JSON berubah dari 547x menjadi 1,3x &mdash; adalah apa yang terjadi ketika Anda menyeberang ke sisi baik bukit peralihan LLVM. Optimizer sekarang sekutu alih-alih dinding, dan sebagian besar yang tersisa adalah pekerjaan kecil, spesifik, terukur: temukan slow path, cari tahu mengapa optimizer tidak bisa melihat tembusnya, ekspos strukturnya, ukur lagi. Tidak ada commit ini yang eksotis. Mereka hanya diterapkan di tempat yang dibutuhkan.
      </p>
      <p>
        Jika Anda ingin mencoba semua ini:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Kode sumber: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Issue, reproducer, dan benchmark yang belum cukup cepat: teruskan saja. Kecepatan ini hanya berhasil karena laporan bug cukup spesifik untuk diubah menjadi reproducer satu baris. Setiap commit dalam artikel ini memiliki <code>#N</code> yang menyertainya dengan alasan.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
