export default function Content() {
  return (
    <>
      <p>
        Postingan terakhir berakhir di <strong>v0.5.306</strong> dengan kisah gen-GC + JSON + benchmark. Empat hari kemudian, Perry sudah di <strong>v0.5.359</strong> — yaitu <strong>53 patch release</strong> — dan ceritanya berbeda lagi. Tidak ada satu pun release itu yang menjadi headline angka benchmark. Hampir semuanya adalah <strong>issue dari tracker yang ditutup</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> hadir — auto-update bergaya Sparkle/Tauri untuk aplikasi desktop (Ed25519 atas digest SHA-256, sentinel-rollback, relaunch terdetach). PR komunitas dari <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Fase D</strong> — inspector live di <code>http://localhost:7676</code> dengan pohon widget, detail per widget, dispatch klik, dan editing style live via <code>POST /style/:h</code>.</li>
        <li><strong>Refactor compiler.</strong> Sepanjang v0.5.329 → v0.5.343 empat file paling banyak disinggung dipotong: <code>lower::lower_expr</code> 6.687 → 624 LOC (−91%), <code>compile.rs</code> 9.391 → 3.783 LOC (−60%), <code>lower.rs</code> 13.591 → 7.554 LOC (−44%), <code>lower_call.rs</code> 7.000+ → 4.681 LOC (−33%). <code>walker.rs</code> baru mengubah kelas bug catch-all <code>_ =&gt; {}</code> jadi error compile.</li>
        <li><strong>UI styling Fase C tutup</strong> — props inline <code>style: {`{ ... }`}</code> di setiap widget di Apple, Android, GTK4, Windows, dan Web. Windows mendapat 4 dari 5 stub tersambung (decoration / opacity / borders); tinggal <code>widget.shadow</code> (follow-up DirectComposition).</li>
        <li><strong>Bucket Scoop</strong> untuk Windows: <code>scoop install perry-ts/perry</code>. Sidecar SHA-256 di workflow release.</li>
        <li><strong>Gelombang fix issue komunitas</strong> — sekitar 30 issue ditutup di runtime, codegen, fetch, GTK4, linker Windows, async, dan stdlib.</li>
      </ul>

      <h2>1. perry/updater — auto-update untuk aplikasi desktop</h2>
      <p>
        Sebelum fix, Perry tidak punya jalur update. Aplikasi rilis, rilis lagi, dan sudah. <strong>TheHypnoo</strong> membuka <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> dengan ceritanya lengkap:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback jika launch sebelumnya crash

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // panggil setelah build baru sukses jalan`}</code></pre>
      <p>
        Model trust: <strong>Ed25519 atas digest SHA-256 file</strong> (bukan atas byte file — verifikasi tetap murah pada binary besar). Manifest berbentuk JSON, ber-versi schema, satu entri per triple <code>&lt;os&gt;-&lt;arch&gt;</code>. Instalasi atomik dengan backup <code>&lt;exe&gt;.prev</code>, relaunch terdetach (<code>setsid</code> di Unix, <code>DETACHED_PROCESS</code> di Windows). Mobile dikecualikan secara desain — App Store / Play Store memiliki pipeline instalasi di level OS.
      </p>
      <p>
        Dua keanehan runtime Perry mencuat saat menulis smoke test, dan diperbaiki sekalian:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> mengembalikan stub metadata saja.</strong> Diperbaiki di <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (juga TheHypnoo) — <code>js_response_array_buffer</code> kini meng-allocate <code>BufferHeader</code> asli dan <code>memcpy</code> <code>resp.body</code> ke dalamnya.</li>
        <li><strong><code>fs.appendFileSync</code> menulis 0 byte.</strong> Diperbaiki di <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — jalur lowering namespace-import (<code>import * as fs from &quot;fs&quot;</code>) tidak punya cabang untuk <code>appendFileSync</code>, dan codegen LLVM juga tidak punya cabang untuk varian HIR-nya. Keduanya kini tersambung.</li>
      </ul>
      <p>
        Dokumentasi ada di <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand: inspector live di localhost:7676</h2>
      <p>
        Geisterhand selama ini adalah harness uji UI in-process Perry — HTTP API di port 7676 untuk snapshot state widget dan dispatch klik. Fase D mengubahnya menjadi inspector ala devtools yang bisa dibuka dari browser apa pun.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Langkah 1 (v0.5.349)</strong> — <code>GET /</code> menyajikan UI vanilla-JS satu halaman dengan pohon widget, detail per widget (frame, value, raw JSON), auto-refresh 1,5 detik dengan pause/resume, dan tombol &laquo;trigger onClick&raquo;. Codegen mem-pin <code>INSPECTOR_HTML</code> terhadap lazy-load <code>-dead_strip</code> macOS supaya selamat di release build.</li>
        <li><strong>Langkah 2 (v0.5.350)</strong> — <code>POST /style/:h</code> menerima sekantong props JSON dan menerapkannya live. 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) mengalir dari thread HTTP → thread utama via pump-queue yang sudah ada. JSON salah → 400; handle salah → 400; props tak dikenal disaring di server dan response mendaftar mana yang lolos.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        Dispatcher macOS sudah tersambung; Linux / Windows / iOS / tvOS / visionOS / Android mengikuti bentuk yang sama dan jadi yang berikut.
      </p>

      <h2>3. Refactor compiler — memotong empat file terbesar</h2>
      <p>
        Lima issue di tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, plus ekor panjang) berbentuk sama: varian <code>Expr</code> baru ditambahkan ke <code>ir.rs</code>, tetapi salah satu dari empat walker ad-hoc di <code>lower.rs</code> punya catch-all <code>_ =&gt; {}</code> dan diam-diam salah meng-compile varian baru itu. Menangkap ini di runtime mahal — kadang tak terlihat, kadang SIGSEGV di bawah SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> memperkenalkan <code>crates/perry-hir/src/walker.rs</code> dengan <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — match exhaustive atas seluruh 178 varian <code>Expr</code>, <strong>tanpa catch-all</strong>. Menambah varian baru tanpa mendaftarkannya di sini sekarang adalah error compile. Empat consumer (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) jadi ringkas:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Fungsi</th>
              <th className="text-right py-2 px-3">Sebelum</th>
              <th className="text-right py-2 px-3">Sesudah</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90%</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Total: <strong>−1.830 baris descent yang duplikatif</strong>, digantikan <strong>+1.840 baris satu walker tersentralisasi</strong> — netto datar, tetapi kelas bug-nya hilang.
      </p>
      <p>
        Itu membuka jalan untuk sisanya. <strong>v0.5.331 → v0.5.343</strong> memotong empat monolit dalam 14 commit. Angka headline-nya:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">File</th>
              <th className="text-right py-2 px-3">Sebelum</th>
              <th className="text-right py-2 px-3">Sesudah</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6.687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9.391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3.783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13.591</td><td className="text-right py-2 px-3">7.554</td><td className="text-right py-2 px-3">−44%</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7.000+</td><td className="text-right py-2 px-3">4.681</td><td className="text-right py-2 px-3">−33%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Pemecahannya mendarat sebagai 19 sub-modul terfokus: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, ditambah crate baru <code>crates/perry-dispatch</code> yang menjadi sumber tunggal kebenaran untuk tabel metode UI / system / i18n (fan-out <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> yang dulu memicu kejutan &laquo;compile di macOS, jebol di web&raquo; pada issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> sekarang cuma satu lookup).
      </p>
      <p>
        <strong>Win perf Tier 4</strong> ikut serta (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Menggabung dua pass di <code>inline_functions</code> dan tiga pass rayon di <code>compile.rs</code> — menghemat 5 scan modul + 3 round-trip scheduler per compile.</li>
        <li>Membatasi parse cache <code>perry dev</code> di 500 entri, eviction FIFO. Sebelum fix, sesi yang menyusuri <code>node_modules</code> bisa menahan 100+ MB AST SWC.</li>
        <li>Memparalelkan loop tulis <code>.ll</code> pasca-codegen — wall-time 2–4× lebih cepat di SSD dengan 50+ modul.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> alih-alih meng-clone tabel locale per worker.</li>
      </ul>
      <p>
        Tes workspace tetap di <strong>434 passed / 0 failed / 5 ignored</strong> di tiap commit; gap test di baseline 25/28; doc-test di baseline 80/82.
      </p>

      <h2>4. UI styling Fase C, selesai</h2>
      <p>
        Fase C adalah rollout <code>style: {`{ ... }`}</code> inline. Langkah 1–7 ditutup di jendela ini:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — surface tipe <code>StyleProps</code> + <code>style:</code> inline di Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — destructure inline color/padding/shadow di setiap widget tabel, lalu VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — string hex + gradien + <code>parseColor</code> runtime untuk nilai dinamis.</li>
        <li><strong>v0.5.312</strong> — dokumentasi styling + issue tracking Windows.</li>
      </ul>
      <p>Lalu sapuan lintas-platform:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 FFI styling tersambung, plus 7 FFI hilang yang menutup gerbang doc-test Linux (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — pipa shadow <code>CALayer</code> untuk <code>widget.shadow</code> + infrastruktur visual_test; class-probe <code>set_color</code> untuk widget non-<code>NSTextField</code>.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button dengan <code>color: ...</code> sebelumnya memanggil <code>setTextColor:</code> di <code>UIButton</code>, yang tidak mengimplementasi selektor itu; panic <code>objc2</code> melintasi batas <code>extern &quot;C&quot;</code> dan proses abort. Diperbaiki dengan pola class-probe yang sama seperti macOS — UIButton sekarang melalui <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4 dari 5 stub styling tersambung (<code>text.decoration</code> via round-trip <code>LOGFONT</code>, <code>widget.opacity</code> via <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders via <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Hanya <code>widget.shadow</code> yang tersisa (perlu DirectComposition).</li>
      </ul>
      <p>
        Matriks styling di <code>docs/src/ui/styling-matrix.md</code> menutup jendela dengan <strong>Web di 43/43 Wired</strong>, <strong>Windows di 42/43 Wired</strong>, sisanya cakupan penuh.
      </p>

      <h2>5. Pass kebenaran runtime — issue demi issue</h2>
      <p>
        Tema periode ini: setiap miscompile yang masuk via tracker berakhir sebagai fix atau error compile-time. Sorotannya:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — metode kelas di dalam <code>fn</code> tidak bisa menangkap local fn pembungkusnya. Repro multi-modul kini cocok byte-per-byte dengan Node.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — unbox string-handle yang aman SSO di 7 site operand string: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, input digest crypto. Sebelum fix, masing-masing diam-diam mengembalikan sampah atau SIGSEGV pada operand string inline.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — array <code>const</code> kosong di level modul kehilangan tulisan <code>arr[i]=</code> dari dalam fungsi. Muncul saat <code>discoverLevels()</code> Bloom-Engine/jump mengisi <code>LEVEL_FILES</code> di level modul lewat index-assign dan layar pemilihan level keluar kosong.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> dari dalam fungsi async diam-diam terbatas di 16 elemen ketika array masuk sebagai parameter. Fungsi async tidak diinline; realokasi mengembalikan pointer baru yang tidak dilihat caller. Fix: pasang pointer forwarding di posisi lama setiap kali tumbuh, memakai mekanisme <code>GC_FLAG_FORWARDED</code> yang sudah ada di GC.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — dispatch parameter default metode mengoper sampah ketika caller melewatkan arg di belakang. Dua bagian penyumbang: declare metode cross-module hardcode 6 double, bukan <code>arity + 1</code>, dan <code>lower_class_method</code> sama sekali tidak memanggil <code>build_default_param_stmts</code>. Muncul di <code>findOne(filter, options = {`{}`})</code> mongodb yang hang diam-diam; fix-nya seragam di dispatch lokal dan cross-module.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — tiga bug independen fetch + promise dari satu repro: api.github.com merespons 403 anonim (User-Agent default kini diset), <code>.then(console.log)</code> hang selamanya (callback null tidak mendorong entri ke TASK_QUEUE), setiap rejection fetch mencetak <code>Uncaught exception: [object Object]</code> (NaN-box <code>*StringHeader</code> telanjang alih-alih <code>ErrorHeader</code> sungguhan).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — <code>Blob</code> sungguhan dengan metode instance <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code>. Sebelum fix, <code>await response.blob()</code> mengembalikan stub metadata <code>{`{size, type}`}</code>. Fix tiga bagian mendarat di runtime + HIR + codegen.</li>
      </ul>
      <p>Plus penyusulan kecil:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup kelebihan memangkas monomorfisasi generik di Linux + silent-fallback link GTK4. Fix: ganti penyaringan pola nama dengan perbandingan <strong>himpunan simbol</strong> via <code>llvm-nm</code>. Anggota dengan satu saja simbol unik tetap dipertahankan. <code>libperry_ui_macos.a</code> dipangkas 196 → 35 objek tanpa error link.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — <code>secur32.lib</code> ditambahkan ke baris link Windows.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> round-trip FP via Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — codegen dispatch tersambung untuk wrapper format <code>perry/i18n</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — codegen dispatch <code>perry/plugin</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — widget Canvas via codegen LLVM.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView via codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — widget Table via codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (parsial) — 11 cabang dispatch helper stdlib.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — penerimaan notifikasi di background di iOS + Android (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — fallback lemah untuk hook FFI game-loop di watchOS.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — hook dispose <code>using</code> / <code>await using</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — alloca arg <code>js_native_call_method</code> dihoist ke blok entry.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — cabang Uint8Array di <code>substitute_locals</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> tersambung end-to-end (PR komunitas).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        Cerita toolchain Windows terus jadi lebih sederhana. <strong>v0.5.353</strong> memaku <code>clang -target</code> di build host — clang non-MSVC di PATH (MinGW / MSYS2 / Anaconda / bundle GNU Rust) diam-diam menulis ulang IR <code>x86_64-pc-windows-msvc</code> Perry menjadi <code>windows-gnu</code>, dan lld-link tidak bisa menyelesaikan referensi <code>__main</code> yang disisipkan emitter mingw32 LLVM. <code>probe_clang_default_triple</code> baru menjalankan <code>clang --version</code> sekali per proses dan mencetak satu baris catatan informatif jika default host adalah GNU sementara kita menarget MSVC. Suppress dengan <code>PERRY_NO_CLANG_PROBE=1</code>.
      </p>
      <p>
        <strong>v0.5.345</strong> menyelaraskan ABI <code>perry-ui</code> Win64 dengan <code>perry-dispatch</code> — tiga signature extern runtime sudah melenceng (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Pada ABI Win64, arg posisional integer dan float berbagi indeks slot, jadi mismatch akan membaca sampah dari register tak terinisialisasi. SysV (macOS / Linux) memakai pool register int/float terpisah dan kebetulan bit valid-nya jatuh tepat — crash khusus Windows, diperbaiki di seluruh 8 crate platform perry-ui-*.
      </p>
      <p>
        Lalu: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest dipaku di v0.5.345 (dengan <code>depends: main/llvm</code> untuk otomatis menarik LLVM resmi default-MSVC). Workflow release sekarang menerbitkan sidecar <code>&lt;artifact&gt;.sha256</code> di sebelah setiap arsip, dengan format kompatibel <code>sha256sum</code> untuk bumper package manager downstream apa pun.
      </p>
      <pre><code>{`# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Penutup</h2>
      <p>
        Pola periode ini adalah keterlibatan komunitas plus higiene internal. <strong>TheHypnoo</strong> mengirimkan tiga PR signifikan (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> menyambung <code>fs.appendFileSync</code>, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> byte body <code>response.arrayBuffer</code>). Tracker terkuras sekitar 30 issue. Compiler menyusut 60% pada file terbesarnya dan menumbuhkan walker exhaustive yang mengubah &laquo;lupa memperbarui salah satu dari empat walker ad-hoc&raquo; dari miscompile runtime menjadi error <code>cargo build</code>. UI styling mencapai paritas di setiap platform desktop kecuali bayangan di Windows. Geisterhand memperoleh permukaan devtools berbasis browser. Jalur instalasi Windows berkurang satu perintah.
      </p>
      <p>Coba:</p>
      <pre><code>{`# npm (platform mana pun)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update aplikasi desktop
npm install @perry/updater

# Inspector live
perry compile main.ts -o app --enable-geisterhand
./app &  # lalu buka http://localhost:7676`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
