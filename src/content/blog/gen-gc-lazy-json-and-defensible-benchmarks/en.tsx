export default function Content() {
  return (
    <>
      <p>
        The last post closed at <strong>v0.5.174</strong> with one headline: Perry was finally winning every benchmark in the in-tree suite against both Node and Bun. Three days of work and a backlog of GC + JSON commits later, Perry is on <strong>v0.5.306</strong> — that&apos;s <strong>132 patch releases</strong> — and the story is a different one. The headline isn&apos;t a 547x speedup or a fresh win column. It&apos;s the work that makes those wins defensible.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>The <strong>generational GC</strong> ships as the default. Phase A through D landed across v0.5.217–v0.5.237.</li>
        <li>The <strong>Small String Optimization</strong> ships as the default. Steps 1.5 → 2 landed in v0.5.213–v0.5.216.</li>
        <li>The <strong>JSON pipeline</strong> got a tape-based parser, lazy parse, lazy stringify, and per-element sparse materialization. Default validate-and-roundtrip is now <strong>75 ms median</strong> — best in the dynamic-typing pack.</li>
        <li>The <strong>benchmarks page</strong> is rewritten end-to-end with <strong>RUNS=11 median + p95 + σ + min + max</strong>, simdjson and AssemblyScript+json-as added as peers, optimization probes separated from real comparisons, and every weakness Perry has surfaced honestly.</li>
      </ul>
      <p>
        The supporting cast is a steady run of correctness fixes: Promise microtask FIFO, NaN equality and ECMAScript number formatting, BigInt two&apos;s complement, AsyncLocalStorage end-to-end, decimal.js + ioredis + commander runtimes, and a JSON.stringify segfault on plain f64 that had been hiding under tape paths. Plus the Windows toolchain finally goes lightweight: LLVM + xwin, no Visual Studio install needed.
      </p>

      <h2>1. Generational GC, on by default</h2>
      <p>
        The generational GC has been a staged roll-out for two months. The summary of the phases that closed in this window:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> — Phase A: shadow-stack runtime scaffolding, push/pop emission, slot-map threading, <code>Let</code>/<code>LocalSet</code> shadow mirroring, and the root scanner.</li>
        <li><strong>v0.5.222</strong> — Phase B: nursery + old-gen arena split.</li>
        <li><strong>v0.5.223–v0.5.225</strong> — Phase C1–C2: write-barrier runtime infrastructure, codegen emits the barrier, every heap store goes through it.</li>
        <li><strong>v0.5.226–v0.5.228</strong> — Phase C3a–C4: remembered-set roots flow into mark + clear; minor GC trace skips old-gen; non-moving tenuring.</li>
        <li><strong>v0.5.229–v0.5.236</strong> — Phase C4b α/β/γ/δ: forwarding-pointer infrastructure, pinning + evacuation pass, scanner + transitive pinning, reference rewriting, idle nursery blocks returned to the OS, GC trigger capped at the initial threshold.</li>
        <li><strong>v0.5.237</strong> — Phase D part 1: <code>PERRY_GEN_GC=1</code> by default.</li>
        <li><strong>v0.5.238</strong> — Phase D part 2: <code>PERRY_SHADOW_STACK=1</code> by default.</li>
        <li><strong>v0.5.239–v0.5.240</strong> — close-out docs: roadmap finalized, academic + industry lineage appendix (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        The measured win that mattered the most: <code>test_memory_json_churn</code> dropped from <strong>115 MB → 91 MB</strong> peak RSS the moment the gen-GC default flipped. The compute regressions were small and listed unapologetically — <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> +1 ms each. The escape hatch (<code>PERRY_GEN_GC=0</code>) recovers the old numbers; the trade-off was deliberate, and the benchmarks page now lists both rows side by side so a reader can pick.
      </p>

      <h2>2. Small String Optimization, on by default</h2>
      <p>
        SSO is a 22-byte inline-string representation that avoids heap allocation for short strings — typical JSON keys (2–8 bytes) and short values land in the inline form. The rollout was tiny on the surface and large under the hood:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: SSO infrastructure (representation + accessors).</li>
        <li><strong>v0.5.214</strong>: Step 1 consumer arms + <code>PERRY_SSO_FORCE</code> gate for testing.</li>
        <li><strong>v0.5.215</strong>: Step 1.5 codegen <code>PropertyGet</code> three-way branch — fast path for inline strings, fast path for heap strings, slow path for the residual.</li>
        <li><strong>v0.5.216</strong>: Step 2 flip — emit SSO by default.</li>
      </ul>
      <p>
        The follow-ups in v0.5.279 closed the last property-read NaN bug that surfaced once SSO was hot, and the chained cross-module getter dispatch fix in v0.5.272 closed another one. Both were on the punch list before the default flipped; both shipped without a perf regression.
      </p>

      <h2>3. JSON: tape-based parse, lazy by default</h2>
      <p>
        The JSON pipeline got the most invasive rewrite of the period. Old behavior: <code>JSON.parse</code> built a fully-materialized tree of NaN-boxed values. New behavior: <code>JSON.parse</code> builds a 12-byte-per-value tape and materializes lazily — only the values you actually read pay the materialization cost. Stringify on an unmutated parse is now a memcpy of the original input, the same fast-path trick simdjson uses with <code>raw_json()</code>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> schema-directed parse (Step 1). Compile-time-known shape lets the compiler emit pre-resolved key access.</li>
        <li><strong>v0.5.203</strong>: tape-based parse foundation — Step 2 Phase 1.</li>
        <li><strong>v0.5.204</strong>: lazy parse + lazy stringify — Step 2 Phases 2+4.</li>
        <li><strong>v0.5.206</strong>: lazy-safe indexed access + edge cases — Step 2 Phase 3.</li>
        <li><strong>v0.5.208</strong>: per-element sparse materialization — Step 2 Phase 5b.</li>
        <li><strong>v0.5.209</strong>: walk cursor + adaptive materialize threshold.</li>
        <li><strong>v0.5.210</strong>: flip lazy parse to default for blobs ≥1 KB.</li>
      </ul>
      <p>
        The result on the workload the lazy tape was designed for (10k records, ~1 MB blob, parse → stringify with no intermediate iteration):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementation</th>
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
        Perry at <strong>75 ms median</strong> is the fastest dynamic-typing runtime in the comparison — beats Bun (259 ms), beats Node (394 ms), beats Kotlin&apos;s server JIT (453 ms). simdjson at 24 ms is the SIMD-accelerated C++ ceiling and lives on the page on purpose, not hidden behind a cherry-pick. Perry doesn&apos;t beat it. The point is to show the gap so closing it has a target — tracked in <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        The honest companion bench is <strong>parse-and-iterate</strong>: same blob, but every iteration sums every record&apos;s <code>nested.x</code>, which forces the lazy tape to materialize. There Perry lands at <strong>466 ms</strong> — slower than the mark-sweep escape hatch&apos;s 375 ms because the tape pays overhead it can&apos;t amortize. That row is in TL;DR §B. When you can&apos;t avoid the work, the lazy tape doesn&apos;t pretend to.
      </p>

      <h2>4. The benchmarks page, rewritten</h2>
      <p>
        Three things changed about how Perry presents performance numbers.
      </p>
      <p>
        <strong>RUNS=11 median + p95 + σ + min + max, not best-of-N.</strong> Best-of-N silently drops tail latency; on this hardware it was hiding 9.4-second Python <code>accumulate</code> outliers and Swift JSON&apos;s 5.3-second p95 spikes. Median puts the tails back on the page. The methodology change landed in v0.5.248; every cell in TL;DR §A and §B is RUNS=11 fresh as of <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>Optimization probes are separated from real runtime perf.</strong> The five cells that show Perry at 12–34 ms vs Rust/C++ at 98 ms — <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> — measure compiler flag posture, not silicon. They&apos;re in their own subsection now, with a paragraph above them explaining that <code>clang++ -O3 -ffast-math</code> closes them to within a millisecond. The headline real-runtime kernel is <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry sits dead in the no-FMA-contract pack on a kernel where the compiler genuinely can&apos;t fold the work away. That&apos;s the honest comparison.
      </p>
      <p>
        <strong>Peers added.</strong> simdjson (4.3.0) is now in both JSON tables — the C++ parse-throughput ceiling, on the page so a reader can see the gap. AssemblyScript with json-as (1.3.2) is the closest installable TS-to-native peer; porffor segfaulted on the workload at this size, Static Hermes wouldn&apos;t install on macOS arm64. Kotlin with kotlinx.serialization joined the JSON polyglot in v0.5.241–v0.5.242. Every row is real, every disclaimer is on the page.
      </p>

      <h2>5. The polyglot compute table</h2>
      <p>
        The genuinely-non-foldable headline kernels, RUNS=11 median, refreshed 2026-04-25 at v0.5.249:
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
        On <code>fibonacci</code>, Perry matches the compiled pack within 3–15 ms. Java&apos;s HotSpot JIT is ~11% faster from inlining the recursive call. On <code>loop_data_dependent</code>, the kernel splits into two FP-contract clusters: the FMA-contract pack at ~128 ms (Go default, <code>g++ -O3</code> on Apple Clang — both fuse <code>sum * a + b</code> into a single FMADDD) and the no-contract pack at 229–235 ms (Perry, Rust default, Swift, Java without <code>-XX:+UseFMA</code>, Bun) running scalar FMUL + FADD. LLVM matches the FMA pack with <code>-ffp-contract=fast</code>; Perry doesn&apos;t enable that by default. <code>nested_loops</code> is cache-bound, not compute-bound; everyone lands at 8–21 ms.
      </p>

      <h2>6. Windows toolchain, lightweight</h2>
      <p>
        Windows users no longer need a Visual Studio install. <strong>v0.5.199</strong> closed <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin replaces the entire VS BuildTools tree. <code>v0.5.201</code> dropped the cfg gate on <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> so the path discovery works on every platform that targets Windows, not just macOS hosts.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Runtime correctness pass</h2>
      <p>
        A theme of the period: silent runtime divergences from V8/JSC turned into either fixes or compile errors. The non-trivial ones:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: <code>BigInt.fromTwos</code>/<code>toTwos</code> two&apos;s complement.</li>
        <li><strong>v0.5.263</strong>: <code>Promise.all</code>/<code>race</code>/<code>any</code> non-promise type discrimination.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + ECMAScript number formatting (<code>3 → &quot;3&quot;</code>, not <code>&quot;3.0&quot;</code>; <code>-0 → &quot;0&quot;</code>; etc.).</li>
        <li><strong>v0.5.280</strong>: <code>NaN</code>/<code>Infinity</code> ToInt32 coercion in <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong>: Promise microtask FIFO + thrown-handler propagation.</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> of a plain f64 segfaulted under tape paths.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> returns Buffer when no encoding is passed (matches Node).</li>
        <li><strong>v0.5.272</strong>: chained cross-module getter dispatch returned <code>undefined</code>.</li>
      </ul>
      <p>
        Stdlib follow-ups for issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> filled in: AsyncLocalStorage end-to-end (v0.5.261), commander runtime + codegen actually invoking <code>.action()</code> (v0.5.250), decimal.js code (v0.5.259), Redis ioredis end-to-end (v0.5.270), pg + mongo async-factory pattern (v0.5.275), and the same async-factory bug on EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        On the <code>perry/ui</code> side: notification tap callback (#97) wired up across both Apple (v0.5.254) and Android (v0.5.258); schedule + cancel local notifications (#96, v0.5.244); FCM register + receive on Android (v0.5.262).
      </p>

      <h2>8. Wrapping up</h2>
      <p>
        The pattern of this stretch isn&apos;t headline numbers. It&apos;s the work that makes existing wins survive scrutiny: a generational GC that catches sustained-allocation workloads, an SSO that closes the short-string cost gap, a JSON pipeline that exploits the &ldquo;no modification&rdquo; structure of the most common workload, and a benchmarks page that measures medians instead of best-of-N and shows simdjson&apos;s 24 ms parse ceiling on the same row as Perry&apos;s 75 ms. The reader gets to see the gap — and where Perry sits relative to the floor.
      </p>
      <p>
        Try it:
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Benchmarks: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
