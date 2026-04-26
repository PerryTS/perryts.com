export default function Content() {
  return (
    <>
      <p>
        Artikel terakhir ditutup pada <strong>v0.5.174</strong> dengan satu sorotan utama: Perry akhirnya memenangkan setiap benchmark dalam suite in-tree melawan Node maupun Bun. Tiga hari kerja dan setumpuk commit GC + JSON kemudian, Perry berada di <strong>v0.5.306</strong> &mdash; itu berarti <strong>132 rilis patch</strong> &mdash; dan ceritanya berbeda. Sorotan utamanya bukan speedup 547x atau kolom kemenangan baru. Ini tentang pekerjaan yang membuat kemenangan-kemenangan itu dapat dipertahankan.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GC generasional</strong> dirilis sebagai default. Fase A hingga D mendarat di v0.5.217&ndash;v0.5.237.</li>
        <li><strong>Small String Optimization</strong> dirilis sebagai default. Step 1.5 &rarr; 2 mendarat di v0.5.213&ndash;v0.5.216.</li>
        <li><strong>Pipeline JSON</strong> mendapat parser berbasis tape, lazy parse, lazy stringify, dan materialisasi sparse per-elemen. Validate-and-roundtrip default sekarang <strong>median 75 ms</strong> &mdash; terbaik di kelompok dynamic-typing.</li>
        <li><strong>Halaman benchmark</strong> ditulis ulang dari awal hingga akhir dengan <strong>RUNS=11 median + p95 + σ + min + max</strong>, simdjson dan AssemblyScript+json-as ditambahkan sebagai pembanding, optimization probe dipisahkan dari perbandingan nyata, dan setiap kelemahan Perry dimunculkan secara jujur.</li>
      </ul>
      <p>
        Pemain pendukungnya adalah serangkaian perbaikan kebenaran yang stabil: FIFO microtask Promise, kesetaraan NaN dan format angka ECMAScript, two&apos;s complement BigInt, AsyncLocalStorage end-to-end, runtime decimal.js + ioredis + commander, dan segfault JSON.stringify pada f64 polos yang sebelumnya tersembunyi di balik jalur tape. Ditambah toolchain Windows yang akhirnya menjadi ringan: LLVM + xwin, tanpa perlu instalasi Visual Studio.
      </p>

      <h2>1. GC generasional, aktif secara default</h2>
      <p>
        GC generasional telah menjadi roll-out bertahap selama dua bulan. Ringkasan fase yang ditutup dalam jendela ini:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217&ndash;v0.5.221</strong> &mdash; Fase A: scaffolding runtime shadow-stack, emisi push/pop, threading slot-map, mirroring shadow <code>Let</code>/<code>LocalSet</code>, dan root scanner.</li>
        <li><strong>v0.5.222</strong> &mdash; Fase B: pemisahan arena nursery + old-gen.</li>
        <li><strong>v0.5.223&ndash;v0.5.225</strong> &mdash; Fase C1&ndash;C2: infrastruktur runtime write-barrier, codegen memancarkan barrier, setiap heap store melewatinya.</li>
        <li><strong>v0.5.226&ndash;v0.5.228</strong> &mdash; Fase C3a&ndash;C4: root remembered-set mengalir ke mark + clear; trace minor GC melewati old-gen; tenuring non-moving.</li>
        <li><strong>v0.5.229&ndash;v0.5.236</strong> &mdash; Fase C4b α/β/γ/δ: infrastruktur forwarding-pointer, pass pinning + evakuasi, scanner + transitive pinning, penulisan ulang referensi, blok nursery idle dikembalikan ke OS, trigger GC dibatasi pada threshold awal.</li>
        <li><strong>v0.5.237</strong> &mdash; Fase D bagian 1: <code>PERRY_GEN_GC=1</code> secara default.</li>
        <li><strong>v0.5.238</strong> &mdash; Fase D bagian 2: <code>PERRY_SHADOW_STACK=1</code> secara default.</li>
        <li><strong>v0.5.239&ndash;v0.5.240</strong> &mdash; dokumentasi penutup: roadmap difinalisasi, lampiran lineage akademis + industri (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        Kemenangan terukur yang paling penting: <code>test_memory_json_churn</code> turun dari <strong>115 MB &rarr; 91 MB</strong> peak RSS pada saat default gen-GC dibalik. Regresi compute kecil dan dicantumkan tanpa permintaan maaf &mdash; <code>nested_loops</code> 8 &rarr; 18 ms, <code>accumulate</code> 24 &rarr; 34 ms, <code>object_create</code> 0 &rarr; 1 ms, <code>array_read</code> / <code>array_write</code> +1 ms masing-masing. Escape hatch (<code>PERRY_GEN_GC=0</code>) memulihkan angka lama; trade-off ini disengaja, dan halaman benchmark sekarang mencantumkan kedua baris berdampingan agar pembaca dapat memilih.
      </p>

      <h2>2. Small String Optimization, aktif secara default</h2>
      <p>
        SSO adalah representasi inline-string 22-byte yang menghindari alokasi heap untuk string pendek &mdash; key JSON tipikal (2&ndash;8 byte) dan nilai pendek mendarat dalam bentuk inline. Roll-out-nya kecil di permukaan dan besar di bawahnya:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: infrastruktur SSO (representasi + accessor).</li>
        <li><strong>v0.5.214</strong>: arms konsumen Step 1 + gate <code>PERRY_SSO_FORCE</code> untuk testing.</li>
        <li><strong>v0.5.215</strong>: codegen Step 1.5 cabang tiga arah <code>PropertyGet</code> &mdash; fast path untuk string inline, fast path untuk string heap, slow path untuk sisanya.</li>
        <li><strong>v0.5.216</strong>: flip Step 2 &mdash; emisi SSO secara default.</li>
      </ul>
      <p>
        Tindak lanjut di v0.5.279 menutup bug NaN property-read terakhir yang muncul setelah SSO menjadi panas, dan perbaikan dispatch getter cross-module berantai di v0.5.272 menutup yang lain. Keduanya ada di punch list sebelum default dibalik; keduanya dirilis tanpa regresi performa.
      </p>

      <h2>3. JSON: parse berbasis tape, lazy secara default</h2>
      <p>
        Pipeline JSON mendapat penulisan ulang paling invasif dalam periode ini. Perilaku lama: <code>JSON.parse</code> membangun pohon nilai NaN-boxed yang termaterialisasi penuh. Perilaku baru: <code>JSON.parse</code> membangun tape 12-byte-per-nilai dan memterialisasi secara lazy &mdash; hanya nilai yang benar-benar Anda baca yang membayar biaya materialisasi. Stringify pada parse yang tidak dimutasi sekarang adalah memcpy dari input asli, trik fast-path yang sama yang digunakan simdjson dengan <code>raw_json()</code>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> parse berbasis schema (Step 1). Bentuk yang diketahui pada compile-time memungkinkan compiler memancarkan akses key yang sudah pre-resolved.</li>
        <li><strong>v0.5.203</strong>: fondasi parse berbasis tape &mdash; Step 2 Fase 1.</li>
        <li><strong>v0.5.204</strong>: lazy parse + lazy stringify &mdash; Step 2 Fase 2+4.</li>
        <li><strong>v0.5.206</strong>: akses indexed yang lazy-safe + edge case &mdash; Step 2 Fase 3.</li>
        <li><strong>v0.5.208</strong>: materialisasi sparse per-elemen &mdash; Step 2 Fase 5b.</li>
        <li><strong>v0.5.209</strong>: walk cursor + threshold materialize adaptif.</li>
        <li><strong>v0.5.210</strong>: balik lazy parse menjadi default untuk blob ≥1 KB.</li>
      </ul>
      <p>
        Hasil pada beban kerja yang dirancang untuk lazy tape (10k record, blob ~1 MB, parse &rarr; stringify tanpa iterasi perantara):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementasi</th>
              <th className="text-right py-2 px-3">Median (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">Peak RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry pada <strong>median 75 ms</strong> adalah runtime dynamic-typing tercepat dalam perbandingan &mdash; mengalahkan Bun (259 ms), mengalahkan Node (394 ms), mengalahkan server JIT Kotlin (453 ms). simdjson pada 24 ms adalah ceiling C++ yang dipercepat SIMD dan ada di halaman dengan sengaja, bukan disembunyikan di balik cherry-pick. Perry tidak mengalahkannya. Tujuannya adalah menunjukkan celahnya sehingga menutupnya memiliki target &mdash; dilacak di <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        Bench pendamping yang jujur adalah <strong>parse-and-iterate</strong>: blob yang sama, tetapi setiap iterasi menjumlahkan <code>nested.x</code> setiap record, yang memaksa lazy tape untuk memterialisasi. Di sana Perry mendarat di <strong>466 ms</strong> &mdash; lebih lambat dari escape hatch mark-sweep yang 375 ms karena tape membayar overhead yang tidak dapat diamortisasi. Baris itu ada di TL;DR §B. Ketika Anda tidak dapat menghindari pekerjaan, lazy tape tidak berpura-pura.
      </p>

      <h2>4. Halaman benchmark, ditulis ulang</h2>
      <p>
        Tiga hal berubah tentang bagaimana Perry menyajikan angka performa.
      </p>
      <p>
        <strong>RUNS=11 median + p95 + σ + min + max, bukan best-of-N.</strong> Best-of-N secara diam-diam menjatuhkan tail latency; pada hardware ini ia menyembunyikan outlier <code>accumulate</code> Python 9,4 detik dan spike p95 JSON Swift 5,3 detik. Median mengembalikan tail ke halaman. Perubahan metodologi mendarat di v0.5.248; setiap sel di TL;DR §A dan §B adalah RUNS=11 segar per <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>Optimization probe dipisahkan dari performa runtime nyata.</strong> Lima sel yang menunjukkan Perry pada 12&ndash;34 ms vs Rust/C++ pada 98 ms &mdash; <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> &mdash; mengukur postur flag compiler, bukan silikon. Sekarang mereka ada di subsection sendiri, dengan paragraf di atas yang menjelaskan bahwa <code>clang++ -O3 -ffast-math</code> menutupnya hingga dalam satu milidetik. Kernel real-runtime utama adalah <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 &mdash; Perry duduk persis di kelompok no-FMA-contract pada kernel di mana compiler sungguh-sungguh tidak dapat melipat pekerjaan tersebut. Itulah perbandingan yang jujur.
      </p>
      <p>
        <strong>Pembanding ditambahkan.</strong> simdjson (4.3.0) sekarang ada di kedua tabel JSON &mdash; ceiling parse-throughput C++, ada di halaman agar pembaca dapat melihat celahnya. AssemblyScript dengan json-as (1.3.2) adalah pembanding TS-to-native yang dapat di-install yang paling dekat; porffor segfault pada beban kerja sebesar ini, Static Hermes tidak mau diinstal di macOS arm64. Kotlin dengan kotlinx.serialization bergabung dengan JSON polyglot di v0.5.241&ndash;v0.5.242. Setiap baris nyata, setiap disclaimer ada di halaman.
      </p>

      <h2>5. Tabel compute polyglot</h2>
      <p>
        Kernel utama yang sungguh tidak dapat dilipat, RUNS=11 median, di-refresh 2026-04-25 di v0.5.249:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Pada <code>fibonacci</code>, Perry menyamai kelompok compiled dalam selisih 3&ndash;15 ms. JIT HotSpot Java ~11% lebih cepat karena meng-inline panggilan rekursif. Pada <code>loop_data_dependent</code>, kernel terbagi menjadi dua kluster FP-contract: kelompok FMA-contract pada ~128 ms (default Go, <code>g++ -O3</code> pada Apple Clang &mdash; keduanya menggabungkan <code>sum * a + b</code> menjadi satu FMADDD) dan kelompok no-contract pada 229&ndash;235 ms (Perry, default Rust, Swift, Java tanpa <code>-XX:+UseFMA</code>, Bun) yang menjalankan FMUL + FADD scalar. LLVM cocok dengan kelompok FMA dengan <code>-ffp-contract=fast</code>; Perry tidak mengaktifkannya secara default. <code>nested_loops</code> adalah cache-bound, bukan compute-bound; semua mendarat di 8&ndash;21 ms.
      </p>

      <h2>6. Toolchain Windows, ringan</h2>
      <p>
        Pengguna Windows tidak lagi memerlukan instalasi Visual Studio. <strong>v0.5.199</strong> menutup <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin menggantikan seluruh tree VS BuildTools. <code>v0.5.201</code> menjatuhkan cfg gate pada <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> sehingga path discovery berfungsi pada setiap platform yang menargetkan Windows, bukan hanya host macOS.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Pass kebenaran runtime</h2>
      <p>
        Tema periode ini: divergensi runtime diam-diam dari V8/JSC berubah menjadi perbaikan atau error kompilasi. Yang non-trivial:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: <code>BigInt.fromTwos</code>/<code>toTwos</code> two&apos;s complement.</li>
        <li><strong>v0.5.263</strong>: diskriminasi tipe non-promise <code>Promise.all</code>/<code>race</code>/<code>any</code>.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + format angka ECMAScript (<code>3 &rarr; &quot;3&quot;</code>, bukan <code>&quot;3.0&quot;</code>; <code>-0 &rarr; &quot;0&quot;</code>; dll.).</li>
        <li><strong>v0.5.280</strong>: koersi ToInt32 <code>NaN</code>/<code>Infinity</code> di <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong>: FIFO microtask Promise + propagasi thrown-handler.</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> dari f64 polos segfault di bawah jalur tape.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> mengembalikan Buffer ketika tidak ada encoding yang dilewatkan (cocok dengan Node).</li>
        <li><strong>v0.5.272</strong>: dispatch getter cross-module berantai mengembalikan <code>undefined</code>.</li>
      </ul>
      <p>
        Tindak lanjut stdlib untuk issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> diisi: AsyncLocalStorage end-to-end (v0.5.261), runtime commander + codegen yang benar-benar memanggil <code>.action()</code> (v0.5.250), kode decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pola async-factory pg + mongo (v0.5.275), dan bug async-factory yang sama pada EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        Di sisi <code>perry/ui</code>: callback notification tap (#97) terhubung di Apple (v0.5.254) dan Android (v0.5.258); schedule + cancel notifikasi lokal (#96, v0.5.244); register + receive FCM di Android (v0.5.262).
      </p>

      <h2>8. Penutup</h2>
      <p>
        Pola periode ini bukanlah angka headline. Ini tentang pekerjaan yang membuat kemenangan yang sudah ada bertahan dari pemeriksaan: GC generasional yang menangkap beban kerja sustained-allocation, SSO yang menutup celah biaya string pendek, pipeline JSON yang mengeksploitasi struktur &ldquo;tanpa modifikasi&rdquo; dari beban kerja paling umum, dan halaman benchmark yang mengukur median alih-alih best-of-N dan menampilkan ceiling parse simdjson 24 ms pada baris yang sama dengan 75 ms Perry. Pembaca dapat melihat celahnya &mdash; dan di mana Perry duduk relatif terhadap floor.
      </p>
      <p>
        Cobalah:
      </p>
      <pre><code>{`# npm (platform apa pun)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — tanpa instalasi VS)
winget install PerryTS.Perry

# Suite benchmark default
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        Kode sumber: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Benchmark: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
