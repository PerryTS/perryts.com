export default function Content() {
  return (
    <>
      <p>
        The last post closed at <strong>v0.5.306</strong> on the gen-GC + JSON + benchmarks story. Four days later, Perry is on <strong>v0.5.359</strong> — that&apos;s <strong>53 patch releases</strong> — and the story is different again. None of those releases are headline benchmark numbers. Almost all of them are <strong>issues from the tracker getting closed</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> ships — Sparkle/Tauri-shape auto-update for desktop apps (Ed25519 over a SHA-256 digest, sentinel-rollback, detached relaunch). Community PR from <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Phase D</strong> — a live inspector at <code>http://localhost:7676</code> with widget tree, per-widget detail, click dispatch, and live style edit via <code>POST /style/:h</code>.</li>
        <li><strong>The compiler refactor.</strong> Across v0.5.329 → v0.5.343 the four most-cited files got carved up: <code>lower::lower_expr</code> 6,687 → 624 LOC (−91%), <code>compile.rs</code> 9,391 → 3,783 LOC (−60%), <code>lower.rs</code> 13,591 → 7,554 LOC (−44%), <code>lower_call.rs</code> 7,000+ → 4,681 LOC (−33%). New <code>walker.rs</code> turns the <code>_ =&gt; {}</code> catch-all bug class into a compile error.</li>
        <li><strong>UI styling Phase C closes out</strong> — inline <code>style: {`{ ... }`}</code> props on every widget across Apple, Android, GTK4, Windows, and Web. Windows gets 4 of 5 stubs wired (decoration / opacity / borders); only <code>widget.shadow</code> remains (DirectComposition follow-up).</li>
        <li><strong>A Scoop bucket</strong> for Windows: <code>scoop install perry-ts/perry</code>. SHA-256 sidecars in the release workflow.</li>
        <li><strong>Wave of community issue fixes</strong> — about 30 issues closed across runtime, codegen, fetch, GTK4, Windows linker, async, and stdlib.</li>
      </ul>

      <h2>1. perry/updater — auto-update for desktop apps</h2>
      <p>
        Pre-fix Perry had no update path. Apps shipped, and shipped, and that was it. <strong>TheHypnoo</strong> opened <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> with the full story:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback if the previous launch crashed

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // call after the new build successfully boots`}</code></pre>
      <p>
        Trust model: <strong>Ed25519 over the SHA-256 digest of the file</strong> (not the file bytes — keeps the verify cheap on big binaries). Manifest is JSON, schema-versioned, one entry per <code>&lt;os&gt;-&lt;arch&gt;</code> triple. Atomic install with <code>&lt;exe&gt;.prev</code> backup, detached relaunch (<code>setsid</code> on Unix, <code>DETACHED_PROCESS</code> on Windows). Mobile is excluded by design — App Store / Play Store own the install pipeline at the OS level.
      </p>
      <p>
        Two Perry runtime quirks surfaced from writing the smoke test, and got fixed inline:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> was returning a metadata-only stub.</strong> Fixed in <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (also TheHypnoo) — <code>js_response_array_buffer</code> now allocates a real <code>BufferHeader</code> and <code>memcpy</code>s <code>resp.body</code> into it.</li>
        <li><strong><code>fs.appendFileSync</code> wrote 0 bytes.</strong> Fixed in <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — the namespace-import lowering path (<code>import * as fs from &quot;fs&quot;</code>) had no arm for <code>appendFileSync</code>, and the LLVM codegen had no arm for the HIR variant either. Both wired.</li>
      </ul>
      <p>
        Documentation lives at <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand: a live inspector at localhost:7676</h2>
      <p>
        Geisterhand has been Perry&apos;s in-process UI test harness — HTTP API on port 7676 for snapshotting widget state and dispatching clicks. Phase D turns it into a devtools-style inspector you can browse from any browser.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Step 1 (v0.5.349)</strong> — <code>GET /</code> serves a single-page vanilla-JS UI with a widget tree, per-widget detail (frame, value, raw JSON), 1.5s auto-refresh with pause/resume, and a &ldquo;fire onClick&rdquo; action button. Codegen pins <code>INSPECTOR_HTML</code> against macOS lazy-load <code>-dead_strip</code> so it survives release builds.</li>
        <li><strong>Step 2 (v0.5.350)</strong> — <code>POST /style/:h</code> takes a JSON prop bag and applies it live. 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) flow HTTP-thread → main-thread via the existing pump-queue. Bad JSON → 400; bad handle → 400; unknown props are filtered server-side and the response lists which ones made it through.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        macOS dispatcher is wired; Linux / Windows / iOS / tvOS / visionOS / Android follow the same shape and are next.
      </p>

      <h2>3. The compiler refactor — splitting the four biggest files</h2>
      <p>
        Five issues in the tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, plus a long tail) had the same shape: a new <code>Expr</code> variant got added to <code>ir.rs</code>, but one of four ad-hoc walkers in <code>lower.rs</code> had a <code>_ =&gt; {}</code> catch-all and silently miscompiled the new variant. Catching this at runtime is expensive — sometimes invisible, sometimes a SIGSEGV under SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> introduced <code>crates/perry-hir/src/walker.rs</code> with <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — exhaustive matches over all 178 <code>Expr</code> variants, <strong>no catch-all</strong>. Adding a new variant without listing it here is now a compile error. The four consumers (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) collapsed:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Function</th>
              <th className="text-right py-2 px-3">Before</th>
              <th className="text-right py-2 px-3">After</th>
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
        Total: <strong>−1,830 lines of duplicated descent</strong>, replaced by <strong>+1,840 lines of one centralized walker</strong> — net flat, but the bug class is gone.
      </p>
      <p>
        That unblocked the rest. <strong>v0.5.331 → v0.5.343</strong> carved up the four monoliths over 14 commits. The headline numbers:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">File</th>
              <th className="text-right py-2 px-3">Before</th>
              <th className="text-right py-2 px-3">After</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6,687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9,391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3,783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13,591</td><td className="text-right py-2 px-3">7,554</td><td className="text-right py-2 px-3">−44%</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7,000+</td><td className="text-right py-2 px-3">4,681</td><td className="text-right py-2 px-3">−33%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The split landed as 19 new focused sub-modules: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, plus a new <code>crates/perry-dispatch</code> crate that became the single source of truth for UI / system / i18n method tables (the <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> fan-out that drove issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a>&apos;s &ldquo;compiles on macOS, breaks on web&rdquo; surprises is now one lookup).
      </p>
      <p>
        <strong>Tier 4 perf wins</strong> rode along (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Fused two passes in <code>inline_functions</code> and three rayon passes in <code>compile.rs</code> — saves 5 module scans + 3 scheduler round-trips per compile.</li>
        <li>Bounded the <code>perry dev</code> parse cache at 500 entries, FIFO eviction. Pre-fix a session walking <code>node_modules</code> could hold 100+ MB of SWC AST.</li>
        <li>Parallelized the post-codegen <code>.ll</code> write loop — 2–4× faster wall-time on SSDs with 50+ modules.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> instead of cloning the locale table per worker.</li>
      </ul>
      <p>
        Workspace tests stayed at <strong>434 passed / 0 failed / 5 ignored</strong> through every commit; gap tests at 25/28 baseline; doc-tests at 80/82 baseline.
      </p>

      <h2>4. UI styling Phase C, finished</h2>
      <p>
        Phase C was the inline <code>style: {`{ ... }`}</code> rollout. Steps 1–7 closed in this window:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — <code>StyleProps</code> type surface + inline <code>style:</code> on Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — color/padding/shadow inline destructure on every table widget, then VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — hex strings + gradient + runtime <code>parseColor</code> for dynamic values.</li>
        <li><strong>v0.5.312</strong> — styling docs + Windows tracking issue.</li>
      </ul>
      <p>Then the cross-platform sweep:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 styling FFIs wired, plus 7 missing FFIs blocking the Linux doc-tests gate (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — <code>CALayer</code> shadow plumbing for <code>widget.shadow</code> + visual_test infrastructure; <code>set_color</code> class-probe for non-<code>NSTextField</code> widgets.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button <code>color: ...</code> was hitting <code>setTextColor:</code> on <code>UIButton</code>, which doesn&apos;t implement that selector; <code>objc2</code> panic crossed an <code>extern &quot;C&quot;</code> boundary and the process aborted. Fixed via the same class-probe pattern as macOS — UIButton now routes through <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4 of 5 styling stubs wired (<code>text.decoration</code> via <code>LOGFONT</code> round-trip, <code>widget.opacity</code> via <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders via <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Only <code>widget.shadow</code> remains (needs DirectComposition).</li>
      </ul>
      <p>
        The styling matrix in <code>docs/src/ui/styling-matrix.md</code> ends the window with <strong>Web at 43/43 Wired</strong>, <strong>Windows at 42/43 Wired</strong>, the rest at full coverage.
      </p>

      <h2>5. The runtime correctness pass — issue by issue</h2>
      <p>
        A theme of the period: every miscompile that came in over the tracker either turned into a fix or a compile-time error. Highlights:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — class methods inside <code>fn</code> couldn&apos;t capture enclosing-fn locals. Multi-module repros now match Node byte-for-byte.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — SSO-safe string-handle unboxing across 7 string-operand sites: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, crypto digest input. Pre-fix every one of them either silently returned garbage or SIGSEGV&apos;d on inline-string operands.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — module-level empty <code>const</code> arrays dropped <code>arr[i]=</code> writes from inside functions. Surfaced when Bloom-Engine/jump&apos;s <code>discoverLevels()</code> populated <code>LEVEL_FILES</code> at module level via index-assign and the level-select screen rendered empty.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> from inside an async function silently capped at 16 elements when the array was passed in as a parameter. Async functions don&apos;t inline; reallocation returned a new pointer the caller never saw. Fix: install a forwarding pointer at the old location on every grow, reusing the GC&apos;s existing <code>GC_FLAG_FORWARDED</code> mechanism.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — method-default-param dispatch was passing garbage when callers skipped trailing args. Two contributing parts: cross-module method declares hardcoded 6 doubles instead of <code>arity + 1</code>, and <code>lower_class_method</code> had no <code>build_default_param_stmts</code> call at all. Surfaced in mongodb&apos;s <code>findOne(filter, options = {`{}`})</code> hanging silently; fix is uniform across local + cross-module dispatch.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — three independent fetch + promise bugs from one repro: api.github.com 403&apos;d anonymous (default User-Agent now set), <code>.then(console.log)</code> hung forever (null callbacks weren&apos;t pushing TASK_QUEUE entries), every fetch rejection printed <code>Uncaught exception: [object Object]</code> (NaN-boxed bare <code>*StringHeader</code> instead of a real <code>ErrorHeader</code>).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — real <code>Blob</code> with <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code> instance methods. Pre-fix <code>await response.blob()</code> returned a metadata-only <code>{`{size, type}`}</code> stub. Three-part fix landed across runtime + HIR + codegen.</li>
      </ul>
      <p>Plus the small catch-ups:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup over-pruned generic monomorphizations on Linux + GTK4 link silent-fallback. Fix: replace name-pattern filtering with <strong>symbol-set</strong> comparison via <code>llvm-nm</code>. Members with even one unique symbol are kept. Trimmed <code>libperry_ui_macos.a</code> 196 → 35 objects with no link errors.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — <code>secur32.lib</code> added to the Windows link line.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> FP round-trip via Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — codegen dispatch wired for <code>perry/i18n</code> format wrappers.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — <code>perry/plugin</code> codegen dispatch.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — Canvas widget through LLVM codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView through codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — Table widget through codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (partial) — 11 stdlib helper dispatch arms.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — background-receive notifications on iOS + Android (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — watchOS weak fallbacks for game-loop FFI hooks.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — <code>using</code> / <code>await using</code> dispose hooks.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — <code>js_native_call_method</code> args alloca hoisted to entry block.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — <code>substitute_locals</code> Uint8Array arms.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> wired end-to-end (community PR).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        The Windows toolchain story keeps simplifying. <strong>v0.5.353</strong> pinned <code>clang -target</code> on host builds — non-MSVC clang on PATH (MinGW / MSYS2 / Anaconda / Rust GNU bundles) was silently rewriting Perry&apos;s <code>x86_64-pc-windows-msvc</code> IR to <code>windows-gnu</code>, and lld-link couldn&apos;t resolve the <code>__main</code> reference LLVM&apos;s mingw32 emitter inserted. New <code>probe_clang_default_triple</code> runs <code>clang --version</code> once per process and prints a single informational note when the host default is GNU but we&apos;re targeting MSVC. Suppress with <code>PERRY_NO_CLANG_PROBE=1</code>.
      </p>
      <p>
        <strong>v0.5.345</strong> aligned the Win64 <code>perry-ui</code> ABI with <code>perry-dispatch</code> — three runtime extern signatures had drifted (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). On Win64 ABI integer and float positional args share slot indices, so a mismatch read garbage from uninitialized registers. SysV (macOS / Linux) uses separate int/float register pools and happened to land valid bits — Windows-only crash, fixed across all 8 perry-ui-* platform crates.
      </p>
      <p>
        Then: <strong><code>scoop install perry-ts/perry</code></strong>. Manifest pinned to v0.5.345 (with <code>depends: main/llvm</code> to auto-pull official MSVC-default LLVM). Release workflow now emits <code>&lt;artifact&gt;.sha256</code> sidecars next to every archive, in <code>sha256sum</code>-compatible format for every downstream package-manager bumper.
      </p>
      <pre><code>{`# Windows host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Wrapping up</h2>
      <p>
        The pattern of this stretch is community engagement plus internal hygiene. <strong>TheHypnoo</strong> shipped three significant PRs (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> <code>fs.appendFileSync</code> wiring, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> <code>response.arrayBuffer</code> body bytes). The tracker emptied of about 30 issues. The compiler got 60% smaller on its biggest file and grew an exhaustive walker that turns &ldquo;forgot to update one of four ad-hoc walkers&rdquo; from a runtime miscompile into a <code>cargo build</code> error. UI styling reached parity across every desktop platform except shadows on Windows. Geisterhand grew a browser-based devtools surface. The Windows install path got one command shorter.
      </p>
      <p>Try it:</p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update for desktop apps
npm install @perry/updater

# Live inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # then open http://localhost:7676`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
