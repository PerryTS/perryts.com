import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = String.raw`**Ringkasnya.** Perry mengompilasi TypeScript menjadi binary native dan memakai tracing collector generational yang dapat memindahkan object dengan precise roots — bukan reference counting. Setelah sebulan ketika hampir seluruh pekerjaan GC adalah *mencari tahu apa yang sebenarnya dilakukan collector*, Perry kini mengalahkan Node pada 9 dari 19 benchmark bercorak GC (sebelumnya 3), mengalahkan pesaing AOT berbasis reference counting pada 14 dari 19, dan berada dalam 1,3× Node pada 15 dari 19. Di sepanjang jalan kami menemukan kelas bug yang tak meninggalkan bukti forensik, environment variable yang tidak mengendalikan apa pun, CI gate yang secara struktur tidak dapat gagal, doc comment yang diam-diam membuat collector lain terkirim, dan pengukuran terakhir yang menunjukkan bahwa selisih tersisa ada pada *layout* object, bukan collection. Sembilan aturan yang kami tarik ada di akhir; sebagian besar tak ada hubungannya dengan garbage collection.

Perry mengompilasi TypeScript langsung menjadi executable native: SWC melakukan parsing, kami lower ke HIR, LLVM menghasilkan machine code, lalu ¤cc¤ melakukan linking. Tidak ada interpreter atau bytecode. Namun bahasanya tetap punya closure yang keluar dari scope, object yang hidup lebih lama dari scope, dan reference cycle — sehingga di balik binary native itu harus ada garbage collector sungguhan.

Tulisan ini menceritakan keputusan saat membangunnya, hal-hal yang mengejutkan kami — hampir semuanya tidak menyenangkan — dan posisi angkanya hari ini. Collector telah menjadi area paling aktif selama berbulan-bulan: **sejak 1 Juli 2026, 201 commit menyentuh ¤crates/perry-runtime/src/{gc,arena}¤, 110 di antaranya dalam dua belas hari terakhir**, pada 127 file dan sekitar 75 ribu baris. Dari 572 changelog fragment yang belum dirilis, 135 memiliki nama terkait GC.

Hampir tak satu pun merupakan “mengimplementasikan collector”. Pekerjaannya adalah menemukan apa yang benar-benar dilakukan collector kami.

---

## Bagian 1 — Pilihan kami

### Bukan reference counting

Pertanyaan pertama biasanya: bukankah compiler AOT seharusnya memakai reference counting saja? Tampak cocok: tak ada masalah root discovery, safepoint, atau kerja sama dengan optimizer. Compiler TypeScript AOT pesaing yang kami ukur memang memilih itu.

Namun kami memilih tracing collector karena reference counting membuat kasus umum membayar kasus langka: setiap pointer store memperbarui counter, cycle tetap membutuhkan tracer cadangan, dan JS mengalokasikan banyak sekali object yang langsung mati — tepat kasus yang diselesaikan nursery hampir gratis. Hari ini keputusan ini tampak benar pada 14 dari 19 benchmark GC dan salah pada 5; kita kembali ke sana di akhir.

### Value memakai NaN-boxing — dan sebagian sedang kami bongkar

Setiap JS value adalah satu word 64 bit. Kami memakai sekitar 2⁵² pola NaN kosong IEEE 754 untuk memberi tag pada pointer, integer kecil, dan singleton; sisanya adalah ¤f64¤ biasa:

¤¤¤
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
¤¤¤

Bagi collector ini kesepakatan bagus: “apakah word ini pointer?” selesai dengan mask-and-compare, tanpa type lookup per value saat tracing. Angka yang diam sudah berisi bit IEEE-nya sendiri, sehingga numeric field tak membayar box atau header.

Bagi *mutator*, ini justru penghalang tunggal terbesar antara kami dan V8, dan kami aktif menghapusnya. Masalahnya bukan hanya NaN-boxed ¤double¤ adalah *salah satu* representation, melainkan ia menjadi representation **canonical**. Native machine type hanya ada sebagai overlay lokal suatu region, sementara keluarga ¤materialize_*_to_js_value¤ melakukan boxing ulang pada setiap boundary yang terlihat JS. Dalam IR yang dihasilkan, loop accumulator yang terbukti ¤i32¤ hidup di ¤alloca double¤, tetap menjadi ¤phi double¤ melewati back-edge setelah ¤-O3¤, dan membayar ¤fptosi¤ + ¤sitofp¤ **setiap iterasi**. Parameter function seragam ¤double %argN¤ sehingga hot function meng-unbox ulang argument jutaan kali; dahulu numeric local bahkan didaftarkan sebagai GC root meski angka tak mungkin menjadi pointer.

Pengukuran penentu: ¤_encipher¤ bcryptjs yang di-unroll secara setia membutuhkan 834 ms dibanding 184 ms di Node — dan *menambah type annotation malah memburuk*, 834 menjadi 2732 ms, karena sekitar 80 guard per read dan rematerialization pada boundary mendominasi. Fast path tingkat expression tak memperbaiki representation problem; masing-masing hanya overlay lain di atas canonical boxed dan pada unrolled code efeknya berbalik.

Arah kami (¤docs/representation-selection-rfc.md¤ dan kampanye unbox-by-default) adalah menjadikan native form unboxed sebagai canonical bagi semua value yang terbukti statis — scalar, string, object, typed array, closure — dari ujung ke ujung melalui local, parameter, return, dan typed heap slot; NaN-boxing dibatasi pada value yang terbukti polymorphic. Ia tetap representation *default*, tetapi bukan *satu-satunya*. Phase 1, 2, 3a, 3b, 4a, dan 4b sudah merge. Static Hermes adalah existence proof. AOT harus *membuktikan* type ketika JIT dapat berspekulasi, tetapi itu juga kelebihan: kernel terbukti tak butuh warmup dan tak dapat deopt.

Ini memengaruhi GC dua arah. Unboxing menghapus roots yang harus dipindai collector — scalar terbukti bukan root — sekaligus menambah kewajiban: jika heap slot menyimpan sesuatu selain NaN-boxed word, collector tak dapat menyimpulkan dari value apakah itu pointer dan harus melihat layout mask per shape. Mesin ¤pointer_mask¤, ¤raw_f64_mask¤, dan layout note ini melahirkan beberapa bug di bawah.

### Satu heap per thread, tanpa sharing

Perry default-nya single-threaded; ¤perry/thread¤ menyediakan ¤spawn¤ dan ¤parallelMap¤, dan value melewati thread boundary lewat deep copy (¤SerializedValue¤), bukan sharing. Ada biaya ergonomis, tetapi collector memperoleh hal besar: **tak pernah sinkronisasi dengan thread lain.** Tak ada global safepoint protocol, handshake, atau read barrier untuk invariant cross-thread. Setiap arena, root scanner, dan remembered set adalah thread-local.

### Generational karena distribusi allocation mengatakannya

Ada dua region per thread: nursery (¤ARENA¤, block 1 MB) dan old generation (¤OLD_ARENA¤), ¤GcHeader¤ 8 byte per allocation, dua aging bit (¤HAS_SURVIVED¤ dan ¤TENURED¤) menggantikan counter, serta ¤PROMOTION_AGE = 2¤. Rencana awal yang ditulis 24 April 2026 sebelum ada code merangkum alasannya: lebih dari 90% allocation JS mati dalam scope yang menciptakannya, sehingga flat arena menghabiskan hidupnya remark object yang jelas mati.

Rencana itu juga tepat mengenali prerequisite tempat semua hal lain bergantung:

> **Generational GC membutuhkan precise roots.**

Conservative scanner cukup untuk collector non-moving: false positive hanya menahan object mati satu cycle lagi. Collector *moving* tak bisa begitu. Jika roots tidak dapat dienumerasi tepat, mereka tak dapat di-rewrite; tanpa rewrite, tak ada yang dapat dipindahkan.

### Roots: satu analysis, dua lowering, dan LLVM statepoints secara default

LLVM dapat menyimpan value di register, melakukan rematerialize, dan spill di mana saja; collector tak bisa menginspeksi itu. Jawaban Perry punya dua lapisan dan terlalu lama bagi kami untuk memisahkannya.

**Analysis** — local mana menyimpan GC pointer dan sampai mana tiap value harus live — independen dari backend. **Lowering** jawaban itu ke emitted code adalah pilihan:

- *Shadow stack.* ¤js_shadow_frame_push(n)¤ saat masuk, satu ¤js_shadow_slot_bind¤ per JS-level local, ¤js_shadow_frame_pop¤ saat keluar; collector berjalan melalui frame yang ditopang heap.
- *Native stack maps melalui RS4GC.* Root alloca menjadi ¤ptr addrspace(1)¤, function mendapat ¤gc "statepoint-example"¤, dan setiap module melewati ¤opt -passes='function(mem2reg),rewrite-statepoints-for-gc'¤. LLVM sendiri menambahkan statepoint, relocation, dan rewrite penggunaan berikut; saat collection kami membaca roots dari section ¤__perry_gcmap¤ yang ringkas.

**Sejak #7370, statepoint lowering menjadi default.** ¤PERRY_RS4GC=1¤ tak perlu lagi; ¤PERRY_RS4GC=0¤ kembali ke shadow stack untuk bisection. Keputusan bergantung target karena ¤gc_map¤ menolak emit map bagi target yang frame base-nya tak dapat diselesaikan runtime — map yang tak dibaca siapa pun diam-diam kehilangan roots. Aturannya native roots tempat runtime dapat berjalan, shadow stack tempat tidak. aarch64/arm64 dan x86-64 memakai statepoints; watchOS ¤arm64_32¤ dan Windows ARM64 mempertahankan shadow frame. Fallback bukan “tanpa roots”, melainkan lowering lain dari analysis yang sama.

Bukti peralihan tanpa env: full gap suite 479 tests dengan **0 regression dan 0 compile failure**; semua **128 test berisi ¤try¤** compile, tepat class yang tak dapat ditangani bridge statepoint tulisan tangan lama; 10 GC ratchet probe byte-identical dengan Node; runtime −1–2%, sedikit lebih cepat; binary +1,86% pada 81 module zod.

Keunggulan nyata dibanding “kami emit shadow stack” bukan 1–2%. Statepoint membawa **relocation semantics yang wajib dihormati optimizer**, sedangkan shadow stack hanya benar selama optimizer tidak pintar dengan value yang lupa kami spill. Buktinya di Bagian 3.

Ada juga **79 runtime root scanner terdaftar** untuk state yang hidup di runtime, bukan user code: pending promise, timer callback, exception state, async-context stack, shape cache, string intern table, dan JSON scratch table.

Conservative native-stack scanner juga ada. Dokumen arsitektur menyebutnya satu dari tiga mekanisme setara; teks itu usang, dan menemukan ini saat menulis cukup instruktif. Dalam production, ¤conservative_stack_scan_decision()¤ menjadi ¤SkipDisabled¤: liveness bergantung penuh pada precise map — statepoints atau shadow frame pada fallback target — plus ¤RuntimeHandleScope¤ di runtime helper. Conservative path tersisa untuk mode tertentu, terutama collection di allocation point, bukan safety net bagi precise path.

### Write barrier yang di-arm secara lazy

Bahaya generational adalah pointer old→young: minor GC yang hanya trace nursery harus mengetahuinya. Codegen emit ¤js_write_barrier¤ pada pointer store dan runtime menjaga remembered set.

Invariant arm dari #7250 adalah salah satu bagian collector paling reusable:

> Saat disarmed, barrier tidak merekam apa pun. Sebagai gantinya, *pembacaan* remembered set pertama pada thread tidak memercayai log; ia membangun ulang set lengkap edge old→young dari heap dan meng-arm barrier sambil berjalan.

Ini dipaksa secara struktur: ¤remembered_dirty_snapshot()¤ adalah ¤pub(super)¤, punya tujuh call site, semuanya di ¤gc/¤.

*(Catatan bagi pembaca source: Perry punya dua hal tak terkait bernama “barrier” — GC write barrier dan compile-time promotion barrier ¤Ptr<Shape>¤ di representation-selection pass. Tiga issue membuang waktu karena mencampurnya. Selalu sebut file.)*

---

## Bagian 2 — Kejutan

### 1. Kelas bug yang tak meninggalkan bukti

Rooting invariant cukup satu kalimat:

> Setiap GC-managed value yang tetap live melewati collection point harus reachable dari root sebelum point itu. Value yang dibaca dari root dan ditahan di SSA register melintasi call **tidak rooted**: ia salinan, dan collector tak melihat salinan.

Melanggarnya menghasilkan pengalaman debugging terburuk dalam proyek. Saat collection *tak ada yang dapat ditemukan*: tidak ada dangling reference, slot yang belum forward, atau anomaly. Kemudian nursery me-recycle address; stale pointer membaca object valid lain dan program mati satu atau lebih cycle kemudian, di function lain, dengan ¤TypeError: value is not a function¤.

Semua runtime GC probe kami buta. From-space scan dan verify pass bersih. ¤PERRY_GC_VERIFY_EVACUATION¤ dapat memastikan reachable slot di-forward, tetapi tak bisa memeriksa register yang tak diketahuinya.

Kami sudah mengatalogkan lima bentuk yang pernah terkirim:

| # | Bentuk | Mengapa lolos review |
|---|---|---|
| #7184 | Root store emit pada index di luar frame yang di-push | ¤js_shadow_slot_bind¤ bounds-check lalu diam-diam no-op; IR *mengatakan* rooted |
| #7192 | Root store emit *setelah* call yang allocate | slot akhirnya rooted **dan** dangling; lolos setiap pertanyaan “sudah rooted?” |
| #7206 | Method receiver di-load, lalu argument yang bisa allocate di-lower sebelum dipakai | load sendiri tampak jelas benar |
| #7206 | ¤base[key]¤: materialize base, lower key expression, lalu gunakan stale base | dua operand; satu dievaluasi pertama dan dipakai terakhir |
| #7226/#7239 | Thread-local/static cell menyimpan heap pointer yang tak di-rewrite scanner | tak terlihat di IR |

Empat bentuk **terkirim dalam satu hari**. Tiap fix hanya beberapa baris; biayanya selalu detection lag. Hanya bentuk pertama khusus shadow stack. Lainnya independen lowering dan lolos perpindahan ke statepoints karena kesalahan ada pada *kapan lowering emit root*, bukan apa itu root.

Heuristic yang benar-benar berguna: **bug GC yang reproduce sempurna berarti table, bukan register.** Unrooted register hanya rusak jika collection masuk window sehingga intermittent; unrooted cache rusak pada collection #0 dan tetap rusak. Ada satu pengecualian: ¤&str¤ atau ¤&[u8]¤ yang di-borrow dari heap ¤StringHeader¤ lalu ditahan melintasi allocating call. Rooting rewrite *slot*; borrow bukan slot. Satu-satunya fix sound adalah menyalin byte keluar heap sebelum allocation pertama.

### 2. Kami berhenti menginspeksi dan mulai membangun instrument

Titik balik #7154 bukan fix, melainkan menyerah pada inspection setelah sepuluh ronde investigation dan membuat tool yang mengubah bug menjadi fault seketika.

**From-space quarantine.** Setelah evacuating minor, from-space tidak di-recycle. Block retired dipisahkan ke ring terbatas, diisi poison word yang byte pertamanya tampak sebagai ¤obj_type¤ invalid (¤0xDE¤), dan interior page-aligned diberi ¤mprotect(PROT_NONE)¤. Stale dereference kini SIGSEGV *pada instruction yang bersalah* saat holder masih di stack. Reporter menyebut address, minor yang retire page itu, dan object yang dahulu hidup di sana, lalu memulihkan ¤SIG_DFL¤ dan fault lagi agar debugger melihat site asli.

**GC zeal.** Paksa evacuating minor di setiap safepoint agar unrooted value berpindah pada exposure pertama, bukan ketika allocation burst tak terkait kebetulan cocok dengan window. Terinspirasi ¤--stress-scavenge¤ V8 dan ¤gcZeal¤ SpiderMonkey.

**Depth knob yang tak disangka perlu.** Quarantine adalah ring *N* retired page-set, default 4. Reproducer ¤new C(…)¤ #7154 tak fault pada 4, 8, atau 100; constructor melewati ~600 back-edge poll, sehingga ketika return override memublikasikan stale register caller, page sudah 600 retirement. Dengan ¤PERRY_GC_PROTECT_FROMSPACE_DEPTH=800¤ ia fault pada penggunaan pertama. “Naikkan depth” kini saran awal ketika bug dicurigai tak reproduce.

Instrument **di-sabotage-test**, bukan sekadar dijalankan: ¤quarantine_catches_a_planted_stale_from_space_deref¤ menanam bentuk #7184/#7192 dan mewajibkan instrument melihat poison ketika control tanpa instrument membaca recycled object yang valid. Control membuktikan bug benar-benar tak terlihat tanpa tool.

Static instrument ¤scripts/gc_root_dominance_check.py¤ membaca LLVM IR dan memeriksa root store dominate setiap site berikut yang dapat collect. CI gate punya allowlist **kosong**; hit baru membuat build merah. Namun secara struktur ia buta pada runtime table, unrooted local di runtime Rust, dan symbol yang tak dikenalnya; kami menyatakan ini karena clean report dua kali dianggap bukti untuk hal yang mustahil diperiksanya.

### 3. Separuh knob kami tidak mengendalikan apa pun

Kejutan ini mengubah kebijakan engineering lebih dari code.

Berbulan-bulan ¤PERRY_GEN_GC_EVACUATE¤ adalah knob untuk membuktikan perubahan aman dalam evacuation. Saat akhirnya diukur benar — binary identik, host sama, cell-by-cell diff atas 12 ratchet probe × 8 counter — ia mengubah **0 dari 96 cell**. Median bit-identical. Prosedur sama dengan ¤PERRY_GEN_GC=0¤ mengubah 79 cell; harness sensitif, knob itu tidak. Ia gate fallback path tempat counter tak pernah berasal.

Satu efek hidupnya adalah footgun: ia memveto forced evacuation, sehingga ¤PERRY_GEN_GC_EVACUATE=0¤ di environment diam-diam disarm ¤PERRY_GC_ZEAL¤ dan zeal run bisa berkata “clean” tanpa memindahkan apa pun.

Ia tidak sendiri:

- ¤PERRY_GC_FORCE_EVACUATE¤ dibaca **hanya pada minor path**, sementara setiap test memanggil ¤gc()¤ yang menjalankan full mark-sweep setelah forced conservative scan. Berbulan “lolos forced evacuation” tak berarti.
- Knob ¤--pressure¤ pada stress matrix mematikan path yang diukur: defer hard cap dan arena trigger ceiling berbagi formula lalu collapse bersama; arm ¤default¤ menjalankan zero copying minor pada semua 22 row.
- ¤PERRY_GC_FROMSPACE_SCAN_ABORT=1¤ inert sendiri: scan tak jalan, tak ada yang abort, run melapor sukses.
- Doc comment ¤gc_incremental_enabled¤ berkata “EXPERIMENTAL — default OFF” delapan baris di atas body comment “DEFAULT ON”. Keputusan merge memakai yang salah.

Kebijakan hasilnya mengikat dalam ¤CLAUDE.md¤:

> **Setiap GC env knob harus punya required CI arm yang exercise OFF atau dihapus setelah satu release soak.** Maksimal satu diagnostic-only knob pada satu waktu, berlabel untested.
>
> **Mode yang masih ada adalah keputusan yang belum dibuat.**

¤PERRY_GEN_GC_EVACUATE¤ dihapus, bukan diperbaiki. Setiap deletion site menyisakan tombstone comment yang menjelaskan apa yang dahulu ada dan mengapa hilang — lima titik persis tempat orang akan menambah conjunction kembali. CI audit menurunkan nama knob yang diterima dari production parser uncommented dan fail pada claim hidup tentang knob terhapus; self-test menanam knob terhapus di balik parser commented dan membuktikan keduanya tak lolos.

### 4. Gate yang tidak dapat gagal

¤CLAUDE.md¤ mencantumkan empat cara CI gate secara struktur tak dapat membuat merge merah. Semuanya pernah mengenai repo ini, tiga dalam satu minggu:

1. ¤continue-on-error: true¤ — ¤gc-stress¤ membawanya berbulan-bulan saat menjadi satu-satunya job yang mencakup GC correctness.
2. Tidak ada dalam required context branch protection — job yang melaporkan failure tanpa block adalah documentation, bukan gate.
3. ¤concurrency¤ dengan ¤cancel-in-progress¤ tanpa syarat — pada runner queue lambat, merge baru membatalkan run sebelumnya sebelum sampai runner; ¤gc-ratchet¤ mengalami tiga run ¤main¤ berturut dibatalkan dan zero execution.
4. **Gate berjalan, tetapi subject tak pernah berjalan** — paling berbahaya karena job benar-benar green.

Lalu dua lagi. ¤gc-stress¤ *tak pernah berjalan pada ¤main¤*: trigger ¤push:¤ hanya tags dan kondisi ¤if:¤ job tak memuat ¤schedule¤, jadi 12/12 nightly berkata ¤skipped¤. ¤lint¤ — required context — merah lebih dari tiga nightly karena 16 file melewati batas 2000 baris, artinya setiap merge masuk lewat admin bypass. Branch protection hanyalah teater; gate baru yang benar dan terhubung ke ¤lint¤ akan inert saat tiba.

Konsekuensi yang terus dipelajari: **gate harus assert subject-nya live, bukan sekadar tak ada yang throw.** Zeal run mencetak ¤forced_collections=… copying_minors=… moved_objects=… loop_polls=…¤ saat exit dan **exit 70 jika salah satunya zero**; run yang tak exercise apa pun harus merah, bukan hijau.

### 5. Collector terus menjadwalkan collection yang tak dapat membantunya

Structural bug berulang, tiga instance independen, satu bentuk: *predicate menjadwalkan collection yang tidak dapat mengubah quantity yang dibaca predicate.*

**Survivor-promotion handoff (#7592).** Predicate mengganti minor dengan full mark-sweep untuk membuka ruang old-gen bagi survivor yang akan promote. Namun full mark-sweep non-moving — tak promote apa pun — sehingga tidak mengurangi pressure yang menjadwalkannya dan true lagi pada minor berikut. Di JSON pipeline 200k record: **19 dari 22 collection adalah full ini, masing-masing free 0.0 MB pada ~400 ms**: 7,6 s dari phase 8,6 s. Copying minor yang benar-benar melakukan promotion tak pernah berjalan.

**Nursery cap (#7690).** Cap berbasis from-space occupancy diterapkan ke minor *non-moving* yang sweep in-place dan membiarkan from-space penuh. Trigger capped yang menjalankan non-moving minor langsung due lagi pada block berikut: satu whole-arena collection tiap 1 MB allocated, quadratic terhadap live set.

**Live-proportional cap yang menjadi fixed point.** ¤max(base, arena_in_use)¤ dipakai agar cap scale dengan live set. Tetapi due test membandingkan *from-space occupancy* dengan cap, dan pada workload itu from-space ≈ live; from-space tak pernah melewati cap-nya sendiri, scavenging berhenti total. Terukur 5,9× lebih cepat karena tidak bekerja.

Dua aturan utama pacing code:

> **Jangan pace collection berdasarkan quantity yang tidak dapat dipindahkannya.**
>
> **Jangan pace collector dengan cost per-cycle O(live) memakai constant band.** Total work menjadi quadratic pada live set; constant lebih besar hanya menggeser tebing.

Memperbaiki family ini membawa satu JSON workload dari **60,4 s ke 3,86 s**, dengan per-record cost datar dalam ~30% di rentang size 20× yang sebelumnya tumbuh 70×.

### 6. Pernah sekali collector mendokumentasikan perubahan yang tak dibuatnya

Satu baris termahal dalam kisah ini adalah doc comment.

#7690 menulis argumen lengkap untuk mengaktifkan moving-loop back-edge poll secara default ke dua doc comment — runtime dan codegen — lalu **tidak mengubah body keduanya.** Keduanya masih hanya match ¤1|on|true¤, berarti default OFF; tak ada test yang pin default. Comment runtime bahkan berkata mirror codegen “MUST agree”; memang agree, tetapi pada nilai yang menurut dokumen sudah ditinggalkan.

Ini bukan sekadar configuration lebih lambat; ini collector berbeda. Nursery pressure punya tepat dua precise collection point: loop back-edge poll dan outermost microtask-pump boundary. Tanpa poll, compute-only program tak mencapai keduanya. Semua nursery collection jatuh di allocation point, tempat fix sebelumnya benar membuat collection non-moving. **Collector yang terkirim sama sekali tak punya nursery evacuation** dan fallback ke whole-arena full collection.

| bench | ¤main¤ terkirim | polls benar-benar aktif |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

Satu benchmark menjalankan **13 whole-arena full collection (pause 0.477 s)** di tempat program yang sama beberapa minggu sebelumnya menjalankan **105 copying minor (0.016 s)**. Total GC pause ¤tree¤ turun 4.107 s → 0.550 s; max pause 266 ms → 16 ms. Diagnostic yang menemukannya bukan wall time, melainkan *jenis* cycle di ¤PERRY_GC_TRACE=1¤: ¤{'full': 13}¤ alih-alih ¤{'minor': 105}¤.

Tiga test kini pin default termasuk unrecognised-value arm, dan satu lagi pin bahwa kedua crate sepakat; disagreement diam-diam pada kedua arah — poll yang tak dikonsumsi atau deferral yang tak di-drain — sehingga perlu assertion, bukan dua comment yang mengaku sama.

Class ini belum tutup. Profiling pekan ini menemukan bentuk sama di write barrier: **codegen emit ¤seq_cst¤ load atas barrier-active counter — ¤ldar¤ di aarch64, 42 site dalam ¤evalNode¤ — sementara runtime membaca global sama secara ¤Relaxed¤ untuk keputusan yang sama**; doc comment codegen menyebut “one relaxed load of a ¤static¤”. Dua reader tak setuju ordering dan docs berpihak berlawanan dengan code. Paling banyak satu yang benar; jika runtime salah, bug jauh lebih serius dari ¤ldar¤. Ia di-file, sengaja tidak ditebak, sebab missed insertion barrier diam saat collection dan muncul beberapa cycle kemudian sebagai ¤TypeError: value is not a function¤.

### 7. Pekerjaan GC tercepat adalah pekerjaan yang dihapus

Setelah pacing bug hilang, cost tersisa berulang kali adalah pekerjaan yang seharusnya tidak ada.

**Heap tempat tak ada yang mati terus di-mark.** ¤retain.ts¤ membangun array 3M record dan tak melepaskan apa pun. Perry menghabiskan **1,26 s dari run 1,31 s dalam collector** — 96%; Node 0,13 s. Dua full mark-sweep reclaim total 4 MB, satu mengubah arena occupancy tepat zero, karena escalation predicate berbasis growth dan live set tumbuh melewati threshold setiap dua kali lipat. Fix: nilai full dari yang direclaim dan geser threshold saat full terbukti tak produktif.

**Setiap evacuated object mengambil process-global mutex untuk hash map kosong.** Move hook menjalankan SipHash ¤remove¤ pada registry sisa ¤Object.setPrototypeOf¤, kosong dalam program yang tak re-prototype. Sudah ada latch yang berkata demikian; move hook satu-satunya reader yang mengabaikannya. Promotion 3M record membayar 2,5M mutex acquisition nyata tanpa guna.

**Lalu kami berhenti memindahkan object.** Bila nursery copying minor hampir seluruhnya live, evacuation object demi object adalah pure overhead: old-gen allocation baru, ¤memcpy¤, layout transfer, accounting, move hook, forwarding stub, dan rewrite setiap referring slot untuk menaruh object di tempat yang tak perlu. Whole-block in-place promotion — page promotion di V8 — hanya mengganti generation label. Tak ada yang pindah, tak ada rewrite:

| workload | sebelum | sesudah |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**Lalu kami berhenti tracing juga.** Tiga pass tetap berjalan atas setiap survivor: remembered-set dirty scan mark, drain menyentuh lagi, ¤clear_marks¤ ketiga kali. Pada cycle saat tak ada yang move atau free, trace ~55–67 ns/object sementara walk promotion nyata ~9 ns. Promoting cycle kini skip trace ketika measured young-survival ratio sebelumnya di fully-live regime, dan menolak bila assumption mana pun berbiaya: registered weak-target holder, malloc registry tidak kosong, incremental mark berjalan, atau salah satu tiga verify instrument armed — semua memakai trace sebagai subject dan cycle tanpa marks dapat melapor sukses tanpa memeriksa apa pun. ¤retain¤ −33,6%, ¤deeplist¤ −43%; cycle 243 ns/object menjadi **8,9 ns**.

Kebijakannya *measurement*, bukan tebakan. Block liveness tak diketahui sebelum trace, jadi keputusan per-cycle memakai measured young-survival ratio cycle sebelumnya. Populasi ternyata bimodal tiga orde magnitudo:

| keluarga workload | copying minors | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *tak ada copying minor sama sekali* |

Cycle yang salah prediksi menahan paling banyak beberapa persen satu nursery, promoting cycle tetap trace cukup sering untuk mengukur diri, dan running cap pada promoted dead bytes membatasi steady state.

Perlu dinyatakan: **cerita “satu mekanisme” biasanya salah dan profil berubah di bawah kaki.** Pause fraction hari ini, diukur pada commit yang sama dengan standings di bawah:

| program | wall | GC pause | pause fraction | cycles |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

Dua angka seminggu lalu 93% dan 62%; pekerjaan section ini membunuhnya. ¤shapes¤ pada 7% bukan benchmark GC lagi — sebelum bug §8, 94 ms dari program 139 ms adalah GC dan kami menamainya “high-survival GC” dari ratio itu. GC lever tak memindahkannya lagi. Ratio yang tampak seragam antarbechmark adalah kebetulan aritmetika, bukan common cause.

### 7b. “Zero cycle” bukan “tanpa cost GC” — counter yang kami baca sebagai kesimpulan

Baris ¤asyncpipe¤ berkata 0 ms pause dalam 0 cycle, dan kami menulis “pure mutator; semua GC lever tak relevan”. Profiling round yang diberi premise itu membantahnya.

¤asyncpipe¤ tak pernah mencetak ¤[gc]¤, namun **~33% leaf profile tetap collector machinery**: write barriers, per-object layout side table, dan ¤RuntimeHandleScope¤ rooting. Mematikan moving-loop back-edge poll mengukur **−14,1% ketika program tetap menjalankan zero GC cycle**: old-generation incremental mark/sweep digerakkan pada poll tanpa menyelesaikan cycle sehingga tak melaporkan. Ini lever terbesar round, dan premise mengarahkan profiler menjauh. (¤PERRY_WRITE_BARRIERS=0¤ +0,9%; codegen barrier bebas, incremental drive tidak.)

> **Cycle counter mengukur collection, bukan cost collector.**

Barrier, side-table maintenance, rooting, dan incremental slice ada di sisi mutator dan secara struktur tak terlihat di per-cycle trace. ¤0 cycles¤ tampak seperti kesimpulan, tetapi hanya mengamati satu mekanisme.

Jebakan terkait: ¤asyncpipe_big.ts¤ **bukan scaled version valid**. Pada 120 batch zero cycle, 240 dua copying minor, 1200 GC mendominasi. Scaling untuk melewati timing noise diam-diam menciptakan benchmark lain, bentuk yang sama dengan “realistic” variant kosong §9; tertangkap hanya karena kami memastikan properti yang dipelajari bertahan saat scale.

### 8. Enam belas byte di atas garis

Bug tunggal terbaik kampanye. ¤shapes¤ menghabiskan 94 ms dari run 139 ms dalam dua minor collection, melaporkan survival ratio 739‰ dan 925‰ sementara live set nyata sekitar 3200 object.

¤arena_alloc_gc¤ membuat segala sesuatu di atas ¤LARGE_OBJECT_THRESHOLD_BYTES¤ — 16 KB — langsung di old-gen dan mark ¤TENURED¤. Backing store ¤Node2D[]¤ 2000 element adalah 16.400 byte. **Enam belas byte di atasnya.**

Setiap array menjadi live permanen — minor tak sweep old-gen —, write barrier merekam edge old→young tiap store dengan benar, dan minor berikut remark semua 2000: 94.000 lalu 118.006 slot.

Fix menarik karena “naikkan threshold” salah. Menyeberanginya menukar *copy cost* dengan *retention cost*. Untuk pointer-free object keduanya dibatasi size, jadi 16 KB tetap. Untuk pointer-bearing object, retention transitive dan tanpa batas; array, object, dan closure mendapat 128 KB — ¤kMaxRegularHeapObjectSize¤ V8 menggambar garis sama karena alasan sama. Selection membaca flag ¤pointer_free¤ yang ada, bukan daftar type; unknown type mempertahankan nilai conservative.

¤shapes¤ turun 0,139 s → 0,061 s pada round itu — 0,058 s dan **1,39× lebih cepat** dari Node di final sweep —, peak RSS 71,4 MB → 32,3 MB. 18 program lain dalam ±1,3%.

### 9. Mengukur lebih sulit daripada memperbaiki

Daftar parsial hal yang menghasilkan kesimpulan salah penuh percaya diri:

- **Benchmark melawan ¤main¤ rusak.** Program allocation-heavy ~20× lambat selama beberapa hari karena surprise #6, membuat A/B tak berguna. Signature load-independent: 105 → 1304 collection. Tak ada yang melihat karena waktu hanya *buruk*, bukan absurd.
- **Auto-optimize relink membangun runtime dengan ¤--no-default-features¤**, diam-diam membuang ¤diagnostics¤. ¤PERRY_GC_TRACE¤ tak mencetak dan cycle tampak **0**. Satu investigation menyimpulkan “zero collection” pada tiga arm.
- **Ratchet baseline dipin ke host lain dan tiga puluh revision lalu** melaporkan 29 “regression” yang sebenarnya drift. Selalu ukur dua arm berurutan pada mesin sama.
- **Kemenangan pretenuring 108 MB → 0 adalah confound**: baseline arm sebelum perubahan antara. Mekanisme benar, target salah — parse tree yang dialokasikan runtime, bukan literal codegen-visible — dan batas sekitar 1 MB.
- **Kami men-timing program yang crash selama berminggu.** Binary pesaing mencetak jawaban benar pada ¤deeplist¤ lalu exit −11 (SIGSEGV) saat recursive refcount drop. Kami mencatat kekalahan. Kini setiap harness menyimpan exit code per cell.
- **¤grep -c¤ exit 1 saat zero match**, memotong chain ¤&&¤. Pipe ¤PERRY_GC_TRACE¤ juga kena SIGPIPE dan output 141.

Aturan yang bertahan: kutip census counter, bukan jam — ia independen load —; bandingkan *binary* sebelum timing; assert comparison benar membandingkan sesuatu; pastikan arm yang diklaim memang live.

---

## Bagian 3 — Dua jalan panjang

### Statepoints: jalan yang dipilih, setelah empat bulan dan tiga enabler

Sejak prototype pertama, ¤gc.statepoint¤ LLVM jelas lebih unggul secara correctness. Ia memberi **relocation semantics yang wajib dihormati optimizer**, sedangkan shadow stack hanya benar selama optimizer tak melakukan hal pintar pada value yang lupa Anda spill. Yang menarik adalah seluruh jarak antara “jelas lebih baik” dan “terkirim secara default”, karena tak satu pun delay soal performance.

**Ia terhalang oleh hal yang bukan GC.** Exception di-lower menjadi ¤setjmp¤/¤longjmp¤, dan ¤longjmp¤ dapat melompat *melewati* ¤gc.relocate¤ sehingga relocated pointer tak ditulis kembali. Dalam RS4GC lebih buruk: ¤mem2reg¤ tak promote volatile alloca yang dibutuhkan setjmp correctness, maka try-region roots tak pernah masuk SSA atau relocate. ¤gc.statepoint¤ punya invoke form tepat untuk ini. Jalan ke statepoints melewati penghapusan seluruh setjmp exception lowering Perry dan penggantiannya dengan invoke/landingpad (#7302/#7305), serta memindahkan LLVM in-process (#7301) agar pass pipeline kami kendalikan. Tak satu pun GC ticket.

**Kompromi yang menggoda adalah jebakan.** “Pertahankan shadow stack bagi function ber-¤try¤” akan membekukan dua root mechanism selamanya. “Hapus shadow stack, simpan statepoints” ternyata tak dapat *diekspresikan*, karena statepoints adalah lowering alternatif dari root-set analysis shadow stack, bukan mekanisme independen. Memisahkan predicate (#7340) memungkinkan default per target dan deletion nanti; sebelumnya ¤PERRY_SHADOW_STACK=0¤ + statepoints menghasilkan binary **tanpa precise root sama sekali**, tanpa section ¤__perry_gcmap¤, output benar, dan tak dapat dibedakan dari build baik sampai collection free sesuatu yang live.

**Salah satu dari dua backend harus mati.** Kami pernah membawa bridge statepoint tulisan tangan di samping RS4GC. Keduanya bukan peer: bridge tak dapat root ¤invoke¤ sehingga menolak function dengan try, sekaligus silent fallback RS4GC — tepat bentuk untested configuration yang dicegah knob kill-policy. Sebelum menghapusnya kami mengukur: **1.574 function pada app Drizzle nyata dan ratchet probe seluruhnya di-lower dengan RS4GC; tidak satu pun fallback.** Bridge, CFG liveness analysis, call parser, emitter, enum ¤PreciseRootBackend¤, dan knob ¤PERRY_STATEPOINTS¤ ikut pergi; bail kini hard failure bernama function, bukan downgrade.

**Lalu default terkirim tanpa coverage.** Native roots menjadi default berbulan-bulan pada setiap walkable target sementara **sembilan root-lowering mechanic memiliki zero assertion terhadap lowering yang benar-benar di-emit Perry**; tiga test yang tampak coverage mengukur nol: mereka assert ¤js_shadow_slot_bind¤ *absen*, hal yang benar bagi semua program di native default, rooted atau tidak. Hazard 4 kembali di sistem yang tugasnya tak kehilangan roots diam-diam. #7653 memperbaiki dengan tiga vantage — IR pra-¤opt¤, bundle ¤"gc-live"¤ pasca-RS4GC, dan blob ¤__perry_gcmap¤ decoded — karena masing-masing buta pada yang ditangkap berikutnya. Static root-dominance checker pun anchor ke ¤@js_shadow_slot_bind¤, compile corpus dengan ¤PERRY_RS4GC=0¤, dan memeriksa lowering yang tak lagi kami kirim sampai #7663 mengajarkannya statepoints.

Satu design law lahir dari negative result terukur: **root metadata tanpa relocation semantics unsound di bawah optimizing compiler.** Scheme metadata per-function yang ringkas memberi map 10–13× lebih kecil dan deterministic corrupt churn loop 10 baris — bukan karena map salah, melainkan mutator membaca from-space melalui stale heap-derived SSA value yang hanya dapat diperbaiki relocation. Barrier membatasi memory ordering, bukan dataflow.

### Unboxing: sedang berjalan dan kini menjadi acara utama

Jalan panjang lain dari Bagian 1: membuat unboxed native representation canonical dan menurunkan NaN-boxing menjadi polymorphic fallback. Phase 1 (scalar locals), 2 (specialised ABI), 3a/3b (strings dan ¤Ptr<Shape>¤ pointer locals), 4a/4b (typed heap: numeric arrays lalu bookkeeping yang dibayar boxed layout tanpa perlu) telah merge.

Dua hal layak dilaporkan jujur.

**Satu sub-phase dinilai dan ditolak, dan alasannya pujian bagi NaN-boxing.** Unboxed *object fields* — headline awal Phase 4b — di-scope-out setelah recon, bukan dibangun. Slot field ¤number¤ sudah berisi raw IEEE bits sebab NaN-boxing hanya mereservasi ¤0x7FF9..=0x7FFF¤; ¤raw_f64_mask¤ layout adalah *proof bit*, bukan perubahan storage, dan read guard sudah hilang. Raw string handle saat diam akan merusak small-string optimisation dengan heap-materialize short string sia-sia. Raw ¤i1¤/¤i32¤ slot membutuhkan mask ketiga dan layout probe di ~25 direct slot-read site termasuk ¤JSON.stringify¤, ¤util.inspect¤, dan ¤v8¤ serde — hot path, bukan yang langka. Yang terkirim justru elision: field store pada proven receiver menghentikan layout note ketika value non-pointer by construction, dan string addref ketika value tak mungkin heap string.

**GC memberi kampanye target berikutnya.** Pengukuran penutup Bagian 4 menunjukkan collector bukan lagi binding constraint pada cluster tersulit; mutator-lah, khususnya karena **object literal dua field menempati 72 byte**. Ini representation problem tepat seperti RFC dan ke sanalah “actual objects” berikutnya.

### Jalan yang tidak diambil

**Concurrency.** Arahan pemilik saat ditanya langsung:

> “Saya tidak ingin mengejar parallelism/concurrency demi itu sendiri. Ia harus menjadi pilihan kemudian untuk pekerjaan yang wajib, tetapi bukan dengan mengorbankan hot path.”

Batasan ini *memutuskan* design, bukan menundanya. Tiga family berbeda tepat pada tempat menagih mutator: parallel stop-the-world tidak menagih — GC thread hanya hidup saat pause; concurrent marking menambah store barrier pada setiap pointer write; concurrent compaction menambah **load barrier** pada setiap pointer read. Load jauh lebih banyak dari store, jadi yang terakhir adalah penolakan terkeras. Parallel STW satu-satunya design yang dapat diterima dan nomor tiga setelah (1) menghapus per-object work yang tak seharusnya ada dan (2) pretenure immortal cohort. Mem-parallel-kan 2,1M object visit yang tak seharusnya terjadi adalah memakai empat core untuk mengerjakan hal salah lebih cepat.

Measurement setuju secara independen dan lebih kuat. Setelah §7, visit pada promotion case terburuk terbelah kira-kira antara pekerjaan yang dihapus dan **9,6 ms dari program 159 ms**. Tak cukup collector time untuk layak diparalelkan — 2× pada GC work hanya 3% program. Parallel GC bukan rencana tertunda; pada workload ini ia non-lever terukur.

Argumen correctness lebih serius: hari ini “bug GC yang reproduce sempurna berarti table, bukan register” adalah diagnostic nyata. Parallel collector menghancurkannya dan membuat 79 root scanner serta setiap ¤thread_local!¤ cache menjadi potential data race.

**Old-page defragmentation — terkirim aktif default lalu direvert hari yang sama.** Compact old page partially-live telah off sejak bug 2026-07 mereproduksi stale non-heap reference ke old object yang dipindah (corruption 6/6 saat aktif). Mengaktifkan lagi dilacak sebagai *rewrite-contract project*, bukan env flip; acceptance bar-nya enumerate setiap metadata/IC/cache path yang dapat menyimpan movable old address, dan **“re-enable defrag hanya setelah reproducer dan dependency-scale stress corpus bersih.”**

Contract work merge dengan baik: static root-dominance allowlist tetap kosong sehingga ~40 hit yang dulu exempt benar-benar diperbaiki; runtime holder policy *diperketat* agar ¤open_gap¤ dan ¤unverified¤ fail; dua cache yang safety-nya bertumpu pada “hanya old-gen defrag yang bisa memindahkan” diperbaiki, bukan exempt; exemption yang dihapus punya tripwire ¤becomes_real_when¤ yang menyebut trigger ini.

Tetapi **default flip** ikut tanpa evidence — sebab suite secara struktur tidak dapat memberi. Selection butuh ¤dead_bytes >= live_bytes¤ pada old page, yakni promote-then-die berskala. Family ¤retain¤ bertahan 999–1000‰, ¤churn¤ hampir tak promote, sehingga **tak ada benchmark yang dapat menghasilkan candidate page.** Suite tak memberi benefit atau regression signal tetapi mewarisi seluruh old-address rewrite surface; semua GC gate masih queued dan belum berjalan saat merge.

Kami menyimpan semua correctness work dan merevert default ke opt-in sampai ada fragmentation workload yang benar-benar exercise; saat ada, arm kalah dihapus. Aturan baru:

> **Feature yang tak dapat di-trigger benchmark suite adalah feature yang tak dapat dibela suite.** Kirim default OFF sampai ada workload yang mampu, atau akui kedua arm untested.

**Pretenuring.** Dibangun dua kali, diukur, dibantah, lalu diparkir dengan syarat reopen tertulis. Hal yang benar secara arsitektur — menaruh long-lived object di old-gen saat lahir — kalah dari hal emergently cukup — seed promote-on-first-copy yang membatasi tiap cohort satu hop. Pada setiap load yang dapat dibuat, kedua arm tak terbedakan. Meta-lesson langsung masuk praktik: **uji discriminating shape sebelum membangun invariant.**

---

## Bagian 4 — Perkembangannya

Closing sweep 2026-08-12, M1 mini tenang dan dipin, best-of-5, exit-checked, output byte-verified terhadap ¤node --experimental-strip-types¤ sebelum timing. 19 benchmark bercorak GC melawan Node 26.5.1 dan pesaing AOT reference counting.

**Perry mengalahkan Node pada 9 dari 19** (awalnya 3), **mengalahkan compiler reference counting pada 14 dari 19**, dan **berada dalam 1,3× Node pada 15 dari 19.**

| bench | perry | node | P/node | Δ ronde ini |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

Yang tersisa dua cluster **terpisah**; memperlakukannya sebagai satu mekanisme adalah kesalahan yang pernah kami buat:

1. **Melawan Node — dispatch dan mutator, kebanyakan bukan GC.** ¤iso_miss¤, ¤interp¤, ¤pipeline¤, ¤asyncpipe¤. Umumnya polymorphic property dispatch, inline cache, representation selection — kampanye lain. Namun lihat koreksi di bawah sebelum membaca 0% ¤asyncpipe¤ sebagai “tak ada GC”.
2. **Melawan compiler reference counting — family ¤retain¤.** ¤retain1¤ 1,80×, ¤retain_wide1¤ 1,67×, ¤retain_wide¤ 1,65×. Semuanya sudah mengalahkan Node. Ini row tempat tak ada yang mati, persis tempat tracing collector diperkirakan terburuk — dan dugaan itu salah secara menarik.

Temuan closing sweep yang membingkai ulang kampanye: **pada cluster kedua, collector bukan lagi binding constraint — mutator-lah.** Kurangi *semua* GC pause; ¤retain_wide¤ (130,8 ms pure mutator) dan ¤shapes¤ (60,2 ms) masih kalah. ¤retain¤ perlu tepat zero GC untuk parity. Cost sebenarnya: **object literal dua field menempati 72 byte**, sehingga ¤retain¤ menulis **216 MB memory untuk menyimpan 48 MB angka** — write amplification 4,5×. Keunggulan pesaing bukan refcount, melainkan compactness. Ini kini representation problem (#7916), bukan collector problem: kampanye unbox-by-default Bagian 1 diarahkan ke object layout, bukan scalar.

Defect pasangan di cluster lain: ¤asyncpipe¤ collect pada 1.200–1.650 ns/object, termasuk **minor collection 122 ms yang menangani zero object** — lebih lama dari seluruh program. Cost per-cycle yang independen dari object count adalah fixed overhead, bagian terakhir collector yang tampak di critical path (#7915).

Satu hal dicoba dan dicatat sebagai negative result karena tampak langkah berikut tetapi salah: **jangan kecilkan nursery pertama.** Cycle 0 adalah 58–81% GC pause family retain, jadi cap tampak gratis; pada 2 MB pause ¤retain¤ turun 52 → 31 ms. Namun ¤asyncpipe¤ dari 0 collection ke 4 dan memakan 385 ms pada program 127 ms; promotion lebih awal me-retime old-gen trigger ke extra full mark-sweep (¤retain_wide1¤ +182%).

Untuk skala titik awal: JSON pipeline pembuka kampanye turun 60,4 s → 3,86 s. Family ¤retain¤ bergerak 36–46% dalam satu ronde pekerjaan di atas. Seluruh collector masih punya kill switch ke full mark-sweep (¤PERRY_GEN_GC=0¤) yang kami exercise, karena hari ketika tak bisa bisect dengannya adalah hari kami berhenti percaya angka ini.

---

## Aturan yang kini kami pakai

Sebagian besar pelajaran berlaku di luar garbage collection:

1. **Mode yang masih ada adalah keputusan yang belum dibuat.** Hapus branch yang kalah atau simpan arm yang exercise; tinggalkan tombstone comment saat menghapus.
2. **Gate harus assert subject-nya live**, bukan hanya tak ada yang throw. “Green karena tak menjalankan apa pun” lebih buruk dari red.
3. **Jangan pace feedback loop berdasarkan quantity yang tak dapat dipindahkannya.** Tiga livelock independen, satu bentuk.
4. **Jangan pace proses O(live) dengan constant band.** Constant lebih besar hanya menggeser tebing.
5. **Ketika kelas bug tak meninggalkan bukti, berhenti investigation dan bangun instrument.** Lalu sabotage-test, termasuk control tanpa instrument yang membuktikan bug tak terlihat.
6. **Doc comment bukan perubahan.** Pin default dengan test, termasuk unrecognised-value case, dan pin agreement antarcomponent yang harus sama.
7. **Ukur kedua arm pada host sama dari tree sama, dan cek exit code.**
8. **Uji discriminating shape sebelum membangun invariant.**
9. **Tolak permanent hybrid.** “Pertahankan mekanisme lama bagi kasus sulit” adalah cara migration menjadi dua mekanisme selamanya. Buat kasus sulit bekerja atau jangan migrate.

Collector belum selesai. Untuk pertama kalinya ia *terbaca*: setiap knob gate sesuatu, setiap gate dapat fail, setiap default dipin test, dan setiap angka publik diukur pada mesin tenang setelah output diverifikasi. Keterbacaan itu membutuhkan lebih banyak kerja daripada collector, dan satu-satunya alasan angka bulan terakhir bergerak.
`.replaceAll("¤", "`");

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
