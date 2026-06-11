export default function Content() {
  return (
    <>
      <p>
        Beberapa minggu lalu, <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto di X) memublikasikan <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">benchmark Perry melawan Deno dan Bun</a> pada soal AtCoder ABC451D, &ldquo;Concat Power of 2.&rdquo; Pengukurannya: Perry berjalan <strong>3.85× lebih lambat dari Bun</strong>. Kesimpulannya sopan tetapi tegas — Perry belum siap menjadi runtime competitive-programming, dan mungkin belum siap bahkan setelah matang.
      </p>
      <p>
        Kami berutang tindak lanjut padanya. Inilah posisi kami pada benchmark yang sama, dengan perintah <code>hyperfine</code> yang sama, di kelas mesin yang sama:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        Menutup gap itu membutuhkan investigasi yang dimulai dengan hipotesis yang salah, menemukan trade-off arsitektur GC yang nyata tetapi disengaja, dan menghasilkan sesuatu yang menurut kami layak ditulis — bukan karena kami menyusul, tetapi karena cara trade-off itu terlihat di bawah profiling menarik dengan sendirinya.
      </p>

      <h2>Benchmark-nya</h2>
      <p>
        <code>abc451d-perry.ts</code> milik aya_koto melakukan pencarian depth-first rekursif atas konkatenasi string pangkat-2, dideduplikasi lewat <code>Set&lt;number&gt;</code> dan diurutkan. Fungsi panasnya pendek:
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}`}</code></pre>
      <p>
        Bentuknya adalah ceritanya. Setiap pemanggilan meng-allocate <code>string[]</code> baru. Rekursinya dalam — branching factor hingga sekitar 30 di puncak — dan setiap parent frame menjaga array <code>answers</code>-nya tetap hidup sementara ia mengiterasi array anaknya dan mendorong ke array sendiri. Alokasi berumur pendek, rekursi dalam, referensi hidup tersebar di setiap blok arena aktif. Ternyata inilah persis beban kerja yang GC Perry <em>tidak</em> dioptimasi untuknya.
      </p>

      <h2>Hipotesis yang salah</h2>
      <p>
        Seorang pembaca meninggalkan catatan kaki di artikel aya_koto yang menunjukkan bahwa BigInt Perry secara internal adalah integer 1024-bit panjang tetap, dan bahwa program berat-BigInt berjalan sekitar 4× lebih lambat dari Bun. ABC451D melibatkan pangkat 2 — angka besar tampak masuk akal — sehingga insting pertama adalah: BigInt biang keladinya, perbaiki jalur BigInt, gap-nya menutup.
      </p>
      <p>
        Ternyata tidak. <code>grep -i bigint abc451d-perry.ts</code> tidak mengembalikan apa-apa. Benchmark itu memakai <code>number</code> sepanjang program; setiap nilai muat nyaman di bawah 2^53. Catatan kaki BigInt itu benar, nyata, dan masalah yang layak diperbaiki — dan kami memang memperbaikinya, terpisah, di v0.5.736. Tetapi itu tidak ada hubungannya dengan ABC451D.
      </p>
      <p>
        Biaya mengejar hipotesis salah lebih dulu sekitar satu hari. Pelajarannya — yang ingin kuklaim sudah kami tahu — adalah: profil dulu sebelum berkomitmen pada teori, bahkan ketika teori itu datang dari sumber kredibel dan cocok dengan prior-mu. Terutama saat itu.
      </p>

      <h2>Mereproduksi benchmark</h2>
      <p>
        Hal pertama yang kami lakukan setelah berhenti mengejar BigInt adalah mereproduksi angka aya_koto dengan bersih. Kami berharap mendarat dekat 1.219 s miliknya di Perry. Kami mendarat di <strong>2.998 s</strong> di Perry v0.5.729.
      </p>
      <p>
        Itu regresi 2.5× antara versi yang ia uji dan main kami saat itu. Deno dan Bun direproduksi dalam 50% dari angkanya (hardware berbeda, drift versi). Gap Perry telah tumbuh dari 3.85× menjadi 6.59× tanpa ada yang memperhatikan.
      </p>
      <p>
        Kami tidak melakukan bisect commit mana yang menyebabkan regresi — itu di luar cakupan investigasi ini. Tetapi ketiadaan guardrail CI yang akan menangkap drift itu sendiri adalah temuan, dan kami akan kembali ke sana di akhir.
      </p>

      <h2>Diagnosis berbasis profil</h2>
      <p>
        Di-compile dengan <code>PERRY_DEBUG_SYMBOLS=1</code> dan direkam dengan <code>samply</code>, gambaran self-time-nya tanpa ambigu:
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>76% self time adalah mesin GC.</strong> Inclusive time setuju: <code>gc_collect_minor</code> di 80%, <code>Arena::alloc</code> di 76%, <code>js_array_alloc</code> di 45%, <code>js_array_push_f64</code> di 22%. <code>search()</code> rekursif memang panas, tetapi panas di bawah fase mark GC. Setiap pemanggilan memicu cukup alokasi untuk menyalakan satu collection.
      </p>
      <p>
        Microbenchmark negative-control mengonfirmasi perlambatan itu tidak umum. <code>fib(80) × 100_000</code> integer ketat, tanpa alokasi: Perry <strong>6.1 ms</strong> vs Bun <strong>24.7 ms</strong> — Perry 4× lebih cepat. Codegen untuk hot loop tanpa alokasi sudah unggul dari Bun. Gap ABC451D terkonsentrasi di satu jalur kode spesifik: throughput alokasi plus mark-sweep GC pada bentuk alokasi ini.
      </p>

      <h2>Bukti yang menentukan</h2>
      <p>
        Kami punya flag — <code>PERRY_GC_DIAG=1</code> — yang mencetak statistik GC per-cycle. Output-nya adalah observasi penopang dari seluruh investigasi:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Setiap cycle, pola yang sama. Sweep mengidentifikasi dengan benar bahwa <strong>55–60% objek yang dialokasikan sudah mati</strong>. Dan arena meng-reclaim <strong>nol blok</strong>. Heap tumbuh monoton sepanjang run, sementara GC terus membayar biaya mark-sweep atas working set yang kian besar.
      </p>
      <p>
        Mengapa <code>block_reclaim=0</code> padahal lebih dari separuh objek mati? Karena GC arena Perry meng-reclaim pada granularitas blok. Blok 1 MB di-reset hanya ketika setiap objek di dalamnya mati. Di ABC451D, <code>search()</code> rekursif menjaga referensi hidup — array <code>answers</code> milik parent frame — tersebar di setiap blok aktif. Tidak ada blok yang pernah sepenuhnya mati. Mark-sweep mengidentifikasi objek mati dengan benar, tidak punya jalur reclaim per-objek, sehingga tidak melakukan apa-apa dengannya. Heap tumbuh, pemicu GC menyala di atas treadmill, dan biaya tiap cycle naik seiring naiknya working set.
      </p>

      <h2>Trade-off yang disengaja</h2>
      <p>
        Hal paling informatif yang kami temukan bukan di profil. Itu di dalam sweep itu sendiri, di <code>crates/perry-runtime/src/gc.rs:2733</code>, sebagai komentar yang menjelaskan desainnya:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        Kami sengaja TIDAK mendorong objek mati ke ARENA_FREE_LIST global. Bump allocator inline tidak pernah membaca free list — ia memakai per-block reset sebagai gantinya. Mendorong objek mati ke free list akan menelan ~50ns per objek × ~700k objek per GC × ~12 GC cycle per benchmark = 420ms pemborosan murni di <code>object_create</code>.
      </blockquote>
      <p>
        Ini persis benar untuk beban kerja yang menjadi dasar tuning-nya. <code>object_create</code> adalah benchmark yang kami pedulikan, di mana alokasi mati dalam loop ketat dan seluruh blok benar-benar kosong di antara cycle. Menambahkan pass free-list per-objek akan membakar 420 ms pencatatan sia-sia untuk beban kerja itu, dan jalur block-reset menangkap memori yang sama dengan lebih murah.
      </p>
      <p>
        Ia cocok buruk untuk bentuk ABC451D, di mana referensi hidup tetap tersebar dan block-reset tidak pernah menyala. Arsitektur memiliki trade-off yang disengaja ter-encode di dalamnya, dan kami tidak pernah mem-benchmark kasus di mana trade-off itu berjalan ke arah yang salah.
      </p>
      <p>
        Itulah pelajaran sesungguhnya. GC-nya tidak rusak. Ia di-tune untuk distribusi pola alokasi yang berbeda dari yang diwakili benchmark aya_koto, dan kami tidak menyadari bahwa distribusi yang menjadi dasar tuning-nya mengecualikan kelas beban kerja nyata — pencarian rekursif, tree walk, apa pun yang menahan state hidup di setiap level stack sambil melakukan alokasi berumur pendek di bawahnya.
      </p>

      <h2>Hal-hal yang tidak berhasil</h2>
      <p>
        Sebelum kami sampai ke fix nyata, beberapa tuas yang tampak masuk akal ternyata tuas yang salah. Melaporkan ini dengan angka karena inilah separuh investigasi yang lebih menarik:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry sudah punya pass copying-evacuation opt-in. Menyalakannya untuk ABC451D: <strong>11.4 detik</strong>, empat kali lebih lambat dari baseline. Pass itu berjalan setiap cycle entah berguna atau tidak, dan biaya copy per-objek plus reference-rewrite-nya katastrofik ketika live set adalah objek kecil berumur pendek. Layak dipertahankan untuk beban kerja yang diuntungkan, tetapi bukan jawaban di sini.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (mark-sweep penuh alih-alih generational) — 3.06 s, pada dasarnya identik dengan baseline. Pilihan strategi bukanlah yang mengikat; ketiadaan reclaim per-objeklah yang mengikat.</li>
        <li><strong>Pembersihan struktural <code>ValidPointerSet</code> (commit 0fa42e0b).</strong> Menggabung dua vektor terurut terpisah (pointer arena dan pointer malloc) menjadi satu, menambahkan prefilter rentang min/max, meng-inline penolakan tag <code>try_mark_value</code>. Memangkas separuh biaya per-pemanggilan <code>contains()</code> — yang merupakan inner loop panas yang ditandai profil. Benchmark ABC451D bergerak dari 3.07 s ke 3.21 s. Sia-sia, dalam noise. Perubahan ini tetap memberi nilai untuk beban kerja di mana <code>contains()</code> memang benar-benar constraint pengikat (benchmark berbentuk ECS, hono compose chain), tetapi itu bukan constraint pengikat di sini. Volume pemanggilan absolut — didorong tekanan alokasi yang menyuapi fase mark — mendominasi bahkan pada biaya per-pemanggilan nol.</li>
      </ul>
      <p>
        Pola di ketiganya: strategi GC dan biaya inner-loop per-pemanggilan adalah orde kedua. Constraint pengikatnya adalah ketiadaan jalur reclaim untuk objek mati di blok yang tidak menjadi kosong sepenuhnya. Sampai itu ditangani, tidak ada yang lain menggerakkan jarum.
      </p>

      <h2>Posisi kami sekarang</h2>
      <p>
        Antara v0.5.737 dan v0.5.875, lintas sekitar 137 versi patch, gap-nya menutup. Kami bersikap deliberat dalam menulis ini: kami tidak mem-bisect ke satu commit pahlawan. Fix-nya mendarat lintas serangkaian perubahan di subsistem GC yang membuat trade-off &ldquo;tanpa free list per-objek&rdquo; yang disengaja itu menjadi kondisional alih-alih permanen — ketika <code>block_reclaim</code> tetap nol lintas cycle berturut-turut, sweep mulai mengisi free list berbucket ukuran dan bump allocator mendapat jalur fallback. Urutan persisnya dan patch mana yang menyumbang berapa membutuhkan bisect cermat yang kami utang tetapi belum kami lakukan.
      </p>
      <p>
        Hasilnya, pada benchmark dan perintah persis aya_koto, di Apple M-series, macOS 26.4:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Dua catatan kejujuran tentang tabel ini. Pertama, margin 1.01× Perry atas Bun berada dalam error bar — kata yang benar adalah &ldquo;seri,&rdquo; bukan &ldquo;lebih cepat.&rdquo; Kedua, varians di ketiga runtime signifikan (max Perry adalah 745 ms terhadap mean 425 ms), dan run tunggal mana pun bisa mendarat di salah satu ekor. Kami menampilkan min dan max di samping mean untuk alasan itu; kami lebih suka kamu melihat sebarannya.
      </p>

      <h2>Yang masih belum sempurna</h2>
      <p>
        Beberapa hal yang tidak kami tutup-tutupi:
      </p>
      <p>
        Regresi dari 1.2 s ke 3.0 s yang terjadi antara pengukuran aya_koto dan awal investigasi ini memberi tahu kami bahwa kami tidak punya guardrail CI yang menangkap kelas perlambatan ini. Kami menambahkan <code>abc451d-perry.ts</code> dan suite kecil di sekitarnya ke CI Perry sebagai gerbang regresi perf sebelum posting ini tayang. Jika benchmark ini diam-diam terdegradasi di release mendatang, ia seharusnya menggagalkan build, bukan benchmark dari seorang kritikus tiga bulan dari sekarang.
      </p>
      <p>
        Fix ini melonggarkan trade-off yang disengaja ke arah spesifik. Kami mengawasi benchmark <code>object_create</code> dan kawan-kawan — beban kerja yang dilindungi pilihan &ldquo;tanpa free list&rdquo; awal — untuk memastikan jalur free-list kondisional tidak meregresikannya. Angka awal dalam noise, tetapi ini jenis hal di mana keyakinan datang dari waktu, bukan dari satu run benchmark.
      </p>
      <p>
        Kami tidak mem-bisect rentang 137-versi. Kami akan melakukannya. Itu penting untuk dokumentasi, dan penting untuk memahami mekanisme conditional-free-list mana yang melakukan pekerjaan.
      </p>

      <h2>Penghargaan</h2>
      <p>
        Artikel aya_koto persis jenis tulisan yang dibutuhkan proyek open-source tetapi jarang didapat. Ia mengukur dengan cermat, memublikasikan repo tesnya, menyebut friksi spesifik di jalur instalasi, dan mencapai kesimpulan jujur bahwa Perry belum siap untuk use case yang ia evaluasi. Kesimpulan itu benar saat ia membuatnya. Itu akan tetap benar lebih lama jika ia tidak menulisnya.
      </p>
      <p>
        Repo tesnya ada di <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>. Artikelnya ada di <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>. Keduanya layak dibaca bahkan setelah tindak lanjut ini — artikelnya terutama, karena ia mendokumentasikan evaluasi jujur atas compiler tahap awal dari seseorang tanpa insentif untuk bersikap sopan.
      </p>
      <p>
        Dua hal spesifik di artikelnya yang perlu kami catat. Friksi jalur instalasi yang ia tandai — bahwa bagian atas perryts.com menunjuk satu metode sementara dokumentasi merekomendasikan yang lain — telah diperbaiki; jalur npm kini adalah opsi yang menonjol di halaman landing, cocok dengan dokumentasi. Frustrasi &ldquo;hal di luar dokumen limitasi yang tidak ter-compile&rdquo; yang ia tandai — kami menelusuri setiap file <code>.ts</code> di repo tesnya terhadap Perry saat ini; celah yang nyata difilekan sebagai issue, dan limitasi terdokumentasi diperluas.
      </p>
      <p>
        Catatan kaki BigInt di artikelnya, seperti dibahas di atas, tidak terkait dengan ABC451D tetapi nyata dengan sendirinya — implementasi BigInt Perry memang integer 1024-bit lebar tetap di baliknya, dan program berat-BigInt membayarnya. Itu diperbaiki di v0.5.736, dengan jalur inline nilai kecil dan <code>num-bigint</code> sebagai fallback presisi-arbitrer. Penghargaan di sana milik pembaca yang meninggalkan catatan kaki di artikel aya_koto; kami tidak tahu siapa mereka, tetapi jika kamu membaca ini: terima kasih.
      </p>

      <h2>Reproduksi</h2>
      <p>
        Jika kamu ingin mereproduksi angka-angka ini sendiri:
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        Angka-angkamu akan bervariasi dengan hardware dan versi runtime. Jika ia bervariasi dengan cara yang tampak salah, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">buka issue</a> — kami lebih suka mendengarnya.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
