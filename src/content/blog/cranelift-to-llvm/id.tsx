export default function Content() {
  return (
    <>
      <p>
        Migrasi backend Perry dari Cranelift ke LLVM telah selesai. Sejak v0.5.12, LLVM adalah satu-satunya backend code generation, dan Perry kini mengalahkan Node.js di 14 dari 15 benchmark &mdash; dengan margin mulai dari 1,06x hingga 24,6x.
      </p>
      <p>
        Perjalanan ke sini tidaklah lurus. Peralihan awal di v0.5.0 membuat beberapa benchmark <strong>70x lebih lambat</strong> dari versi Cranelift yang digantikannya. Artikel ini adalah versi lengkap dari apa yang terjadi, mengapa kami tetap beralih, apa yang rusak, apa yang memperbaikinya, dan seperti apa angka-angkanya di sisi lain.
      </p>
      <p>
        Jika Anda sedang membangun compiler, mengevaluasi backend codegen, atau sekadar penasaran mengapa &ldquo;beralih ke LLVM&rdquo; jarang sesederhana kedengarannya, ini untuk Anda.
      </p>

      <h2>Bagian 1: Mengapa Beralih?</h2>
      <p>
        Perry mengompilasi TypeScript langsung ke kode mesin native. Tanpa Node, tanpa V8, tanpa Electron, tanpa WebView. Proposisinya adalah &ldquo;tulis TypeScript, hasilkan binary native,&rdquo; dan seluruh proposisi nilai itu runtuh jika binary tersebut sebenarnya tidak cepat.
      </p>
      <p>
        Untuk beberapa versi minor pertama Perry, backend codegen-nya adalah <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. Cranelift luar biasa &mdash; ia adalah codegen di balik wasmtime, digunakan oleh baseline JIT SpiderMonkey, dan merupakan pilihan utama ketika Anda membutuhkan kompilasi yang cepat dan dapat diprediksi dengan integrasi yang bersih. Untuk proyek yang sedang mem-bootstrap bahasa baru, ini adalah titik awal yang tepat.
      </p>
      <p>
        Tetapi dua hal akhirnya mendorong kami meninggalkannya.
      </p>

      <h3>1. Batas atas optimizer</h3>
      <p>
        Cranelift dengan sengaja dirancang sebagai compiler optimasi cepat satu tingkat. Mandatnya adalah &ldquo;hasilkan kode yang layak dengan cepat,&rdquo; bukan &ldquo;hasilkan kode terbaik yang mungkin tanpa batas waktu.&rdquo; Itu adalah tradeoff yang tepat untuk JIT. Itu adalah tradeoff yang salah untuk compiler AOT yang seluruh nilai jualnya adalah performa native.
      </p>
      <p>
        LLVM telah memiliki lebih dari dua dekade kerja yang dicurahkan ke middle-end-nya. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis &mdash; tidak ada dunia realistis di mana proyek yang lebih kecil bisa menyusul. Jika Perry akan mengklaim &ldquo;lebih cepat dari Node,&rdquo; kami membutuhkan mesin itu.
      </p>

      <h3>2. Masalah arm64_32</h3>
      <p>
        Faktor pemaksa langsung adalah Apple Watch. <code>arm64_32</code> adalah ABI yang diperkenalkan Apple untuk Series 4 ke atas &mdash; instruksi 64-bit, pointer 32-bit. Cranelift tidak mendukungnya, dan tidak ada jalur realistis untuk dukungan itu hadir. Agar Perry bisa mengklaim &ldquo;9 platform dari satu codebase&rdquo; dengan kredibel, watchOS tidak boleh absen. LLVM mendukung <code>arm64_32</code> langsung.
      </p>
      <p>
        Begitu kami menerima bahwa <em>beberapa</em> target akan memerlukan LLVM, memelihara dua backend menjadi tidak bisa dipertahankan. Dua backend berarti dua set bug, dua set optimization pass, dua matriks pengujian, dua baseline performa. Jawaban jujurnya adalah: pilih satu.
      </p>
      <p>Kami memilih LLVM.</p>

      <h2>Bagian 2: Sepatah Kata tentang Cranelift</h2>
      <p>
        Sebelum melanjutkan: artikel ini bukan pembongkaran Cranelift. Cranelift adalah karya teknik yang brilian, dan jika Anda membangun JIT, runtime yang di-sandbox, atau apa pun di mana latensi kompilasi lebih penting dari throughput puncak, ia harus berada di urutan teratas daftar Anda. wasmtime menggunakannya dengan alasan yang bagus. Bytecode Alliance telah melakukan pekerjaan yang patut dicontoh.
      </p>
      <p>
        Kebutuhan Perry berbeda. Kami mengompilasi ahead of time, kami mengirimkan binary sekali, dan pengguna menjalankannya jutaan kali. Asimetri itu &mdash; kompilasi jarang, eksekusi selalu &mdash; adalah persis rezim di mana optimizer yang lebih berat dari LLVM membayar dirinya sendiri. Alat berbeda untuk pekerjaan berbeda.
      </p>

      <h2>Bagian 3: Bencana Peralihan</h2>
      <p>
        v0.5.0 adalah rilis pertama dengan LLVM sebagai satu-satunya backend. Kami mengharapkan regresi kecil dalam waktu kompilasi dan peningkatan bermakna dalam performa runtime. Kami mendapat kebalikan dari yang kedua.
      </p>
      <p>Ini tabel yang tidak ingin saya posting saat itu:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x lebih lambat</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x lebih lambat</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x lebih lambat</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2,8x lebih cepat</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1,8x lebih lambat</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2,3x lebih lambat</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Beberapa beban kerja menjadi lebih cepat. Sebagian besar menjadi jauh lebih buruk. <code>method_calls</code> &mdash; salah satu benchmark terpenting karena merepresentasikan penggunaan class TypeScript yang idiomatis &mdash; hampir 70x lebih buruk dari yang kami kirimkan dua rilis sebelumnya.
      </p>

      <h3>Apa yang sebenarnya salah</h3>
      <p>
        Perry menggunakan <strong>NaN-boxing</strong> untuk representasi nilai. Setiap nilai TypeScript adalah word 64-bit. Angka f64 disimpan langsung; semua yang lain (objek, string, boolean, undefined, null) dikodekan ke dalam bit-bit yang tidak terpakai dari quiet NaN IEEE 754.
      </p>
      <p>
        Keuntungannya: angka tanpa biaya. Tidak ada boxing, tidak ada tagging, tidak ada alokasi untuk aritmetika.
      </p>
      <p>
        Kekurangannya: setiap operasi pada nilai non-angka memerlukan manipulasi bit untuk membongkar, mengoperasikan, dan mengemas ulang. Jika urutan tersebut ada sebagai IR inline di codegen Anda, optimizer dapat menggabungkan dan menyederhanakannya. Jika ada sebagai <strong>panggilan ke fungsi helper runtime</strong>, optimizer melihat panggilan yang tidak transparan dan menyerah.
      </p>
      <p>
        Backend Cranelift kami telah mengembangkan banyak inline lowering untuk operasi-operasi panas &mdash; pemuatan properti, dispatch metode, alokasi objek, aritmetika integer pada nilai yang di-tag f64. Peralihan LLVM, demi menghasilkan kode yang <em>benar</em> terlebih dahulu, merutekan hampir semuanya melalui helper runtime di <code>perry-runtime</code>. Setiap helper adalah instruksi <code>call</code> di LLVM IR.
      </p>
      <p>
        LLVM luar biasa, tetapi tidak bisa menginline fungsi yang body-nya tidak pernah dilihat. <code>perry-runtime</code> dikompilasi terpisah, di-link di akhir, dan dari perspektif optimizer setiap panggilan helper adalah kotak hitam. Hasilnya adalah loop panas yang backend Cranelift telah kompilasi menjadi ~5 instruksi aritmetika inline kini dikompilasi menjadi panggilan fungsi &mdash; penyimpanan register, setup stack frame, semuanya &mdash; diulang jutaan kali.
      </p>
      <p>
        Dari situlah 70x itu berasal. Bukan codegen yang buruk. <strong>Batas inlining</strong> yang buruk.
      </p>

      <h2>Bagian 4: Perbaikannya</h2>
      <p>
        Pekerjaan untuk memulihkan dan melampaui angka Cranelift terbagi dalam kurang-lebih enam kategori. Tidak ada yang eksotis. Sebagian besar adalah optimasi compiler dari buku teks yang hanya perlu diterapkan di tempat yang tepat.
      </p>

      <h3>1. Inline bump allocator untuk alokasi objek</h3>
      <p>
        <code>object_create</code> adalah regresi terburuk setelah <code>method_calls</code>. Jalur lama memanggil <code>js_object_alloc_class_with_keys</code> untuk setiap <code>new Point()</code> &mdash; panggilan fungsi, akses arena thread-local, pencarian shape-cache, dan penulisan header GC + header objek.
      </p>
      <p>
        Perbaikannya: emit bump allocation <strong>inline</strong> di LLVM IR. Setiap fungsi yang mengalokasikan objek mendapat pointer yang di-cache ke struct <code>InlineArenaState</code> thread-local. Alokasi menjadi:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        Fast path-nya adalah ~13 instruksi IR inline yang bisa dilihat, dijadwalkan, dan diangkat dari loop oleh LLVM. <code>object_create</code> turun dari 318ms ke 9ms.
      </p>

      <h3>2. Loop counter i32</h3>
      <p>
        NaN-boxing berarti setiap angka TypeScript adalah f64. Termasuk counter loop. Loop <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> dengan variabel induksi f64 adalah bencana: increment f64, perbandingan f64, konversi f64-ke-i64 setiap kali mengindeks array.
      </p>
      <p>
        Codegen mendeteksi for-loop di mana variabel induksi terbukti bernilai integer dan mengalokasikan <strong>slot stack i32 paralel</strong>. Kondisi loop berubah dari <code>fcmp</code> ke <code>icmp slt i32</code>, menghilangkan counter f64 sepenuhnya.
      </p>
      <p>
        Ini memindahkan <code>array_write</code> dari 11ms ke 3ms, <code>nested_loops</code> dari 18ms ke 9ms, dan <code>array_read</code> dari 11ms ke 4ms.
      </p>

      <h3>3. Flag fast-math</h3>
      <p>
        Kami menambahkan flag <code>reassoc contract</code> ke setiap instruksi aritmetika f64. <code>reassoc</code> memungkinkan LLVM memecah rantai akumulator serial menjadi paralel, dan <code>contract</code> mengizinkan fused multiply-add. Kami membiarkan <code>nnan</code> dan <code>ninf</code> mati karena Perry menggunakan bit NaN sebagai tag nilai.
      </p>
      <p>
        Dengan flag tersebut, loop vectorizer LLVM bekerja pada <code>math_intensive</code>, yang turun dari 131ms ke 14ms &mdash; mengalahkan Node sebesar 3,5x.
      </p>

      <h3>4. Fast path untuk modulo integer</h3>
      <p>
        <code>%</code> pada f64 di JavaScript adalah <code>fmod</code>, yang merupakan panggilan libm di ARM. Tetapi untuk operan f64 bernilai integer, kita bisa melakukan <code>fptosi &rarr; srem &rarr; sitofp</code> dan melewatkan perjalanan pulang-pergi libm sepenuhnya. Codegen menggunakan analisis statis untuk mendeteksi operan bernilai integer &mdash; tidak perlu pemeriksaan runtime.
      </p>
      <p>
        Inilah satu-satunya alasan <code>factorial</code> turun dari 1.553ms ke 24ms &mdash; dan dari 591ms Node ke 24ms. <strong>24,6x lebih cepat dari Node.</strong>
      </p>

      <h3>5. LICM untuk loop bersarang</h3>
      <p>
        LLVM melakukan loop-invariant code motion secara bawaan, tetapi NaN-boxing menyembunyikan strukturnya. <code>arr.length</code> di-lower menjadi pemuatan melalui pointer NaN-boxed dengan pemeriksaan tag &mdash; tidak jelas invariant.
      </p>
      <p>
        Codegen mendeteksi pola <code>{'for (...; i < arr.length; ...)'}</code> dan memuat panjang ke slot stack sebelum loop, dengan walker statis yang memverifikasi bahwa body loop tidak bisa mengubah panjang array. Ketika counter dibatasi oleh panjang yang telah diangkat ini, IndexGet/IndexSet melewatkan pemeriksaan batas sepenuhnya.
      </p>

      <h3>6. Objek dengan shape-cache</h3>
      <p>
        Ketika codegen mengetahui class dari suatu objek, ia menyelesaikan offset field pada waktu kompilasi dan menghasilkan <strong>pemuatan terindeks langsung</strong> &mdash; tanpa dispatch runtime. Untuk dispatch metode, <code>obj.method(args)</code> menjadi panggilan langsung <code>call @perry_method_Class_name(this, args)</code> &mdash; tanpa vtable, tanpa inline cache, tanpa hash lookup.
      </p>
      <p>
        Peralihan LLVM telah meregresikan ini ke slow path universal. Memulihkan dispatch statis memberi kami pemulihan <code>method_calls</code> &mdash; dari 1.084ms kembali ke 1ms. <strong>11x lebih cepat dari Node.</strong>
      </p>

      <h2>Bagian 5: Angka-Angka Hari Ini</h2>
      <p>Median dari tiga kali menjalankan, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">seri</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">seri</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        14 dari 15 kemenangan. Satu-satunya kekalahan adalah <code>object_create</code>, di mana allocator V8 memang sangat baik dan kami hanya selisih 12%.
      </p>

      <h2>Bagian 6: Pertanyaan Waktu Kompilasi</h2>
      <p>
        Alasan nomor satu orang memilih Cranelift daripada LLVM adalah kecepatan kompilasi. Jadi mari kita bahas.
      </p>
      <p>
        LLVM meningkatkan waktu kompilasi per-file Perry sebesar <strong>20-50ms</strong>, atau sekitar <strong>8-19%</strong>. Bukan 5x. Bukan 2x. Persentase satu digit hingga dua digit rendah.
      </p>
      <p>
        Alasannya adalah codegen bukan bottleneck di pipeline Perry. Rincian untuk file tipikal:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Parsing SWC: ~30%</li>
        <li>Lowering HIR (AST &rarr; IR, inferensi tipe): ~25%</li>
        <li>Pass transformasi IR (konversi closure, lowering async, inlining): ~15%</li>
        <li><strong>Codegen (emisi teks LLVM IR + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + library runtime): ~10%</li>
      </ul>
      <p>
        Codegen adalah satu irisan dari lima. Bahkan menggandakan irisan itu hanya menggerakkan total sebesar 5-10%. Jika Anda membangun compiler AOT di mana pengguna mengetik <code>perry compile</code> sekali lalu menjalankan binary-nya selamanya, perhitungannya adalah: habiskan 25ms lebih banyak saat kompilasi, hemat hingga 24x di setiap eksekusi.
      </p>

      <h2>Bagian 7: Apa yang Akan Saya Lakukan Berbeda</h2>
      <p>
        Jika saya memulai Perry hari ini dan bisa langsung lompat ke LLVM, saya tidak akan melakukannya. Fase Cranelift benar-benar berharga. Ini memungkinkan kami mengiterasi frontend tanpa beban kompleksitas LLVM, memberi kami baseline yang berfungsi untuk perbandingan, dan memaksa kami menjaga HIR cukup bersih agar portable lintas backend.
      </p>
      <p>
        Yang akan saya lakukan berbeda adalah peralihan itu sendiri. Kami merilis v0.5.0 dengan sebagian besar operasi melewati panggilan helper runtime, berniat untuk menginline-kannya nanti. Itu salah. Urutan yang benar seharusnya: identifikasi hot path terlebih dahulu, lower secara inline sebelum peralihan, dan baru rilis setelah backend LLVM setidaknya setara.
      </p>
      <p>
        Pelajarannya adalah yang membosankan: batas optimasi lebih penting dari kualitas optimizer. LLVM adalah perangkat lunak yang luar biasa, tetapi tidak bisa membantu Anda dengan kode yang tidak bisa dilihatnya. Jika codegen Anda merutekan semuanya melalui panggilan runtime yang tidak transparan, Anda telah membangun dinding antara program sumber Anda dan setiap optimization pass yang ada.
      </p>

      <h2>Penutup</h2>
      <p>
        Perry sekarang hanya LLVM, lebih cepat dari Node di 14 dari 15 benchmark, dan telah dirilis. Migrasi ini memakan waktu lebih lama dari yang saya rencanakan, lebih menyakitkan dari yang saya harapkan di tengah jalan, dan jelas merupakan keputusan yang tepat dalam retrospeksi. Cranelift membawa kami ke v0.5; LLVM membawa kami selanjutnya.
      </p>
      <p>Jika Anda ingin mencoba Perry:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Kode sumber: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Jalankan benchmark sendiri: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Jika Anda punya pertanyaan, menemukan bug, atau ingin berdebat tentang backend codegen, issue GitHub-nya terbuka. Saya membaca semuanya.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
