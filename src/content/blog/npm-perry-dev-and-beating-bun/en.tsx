export default function Content() {
  return (
    <>
      <p>
        The last post closed with Perry at v0.5.80 and one stubborn loss on the benchmark table: <code>JSON.parse</code>/<code>stringify</code> roundtrip was still 1.6x slower than Node. Six days later Perry is on <strong>v0.5.174</strong> — that&apos;s <strong>94 patch releases</strong> — and three things changed that are worth calling out before anything else:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> ships on <strong>npm</strong>. One command installs Perry on every supported platform.</li>
        <li><strong><code>perry dev</code></strong> adds watch-mode auto-recompile, on top of a new in-memory AST cache and on-disk per-module object cache.</li>
        <li>The <code>json_roundtrip</code> loss closed. Perry now <strong>beats Node and Bun on every benchmark</strong> in the main suite (15/15 vs both).</li>
      </ul>
      <p>
        The rest of the post is the supporting cast: WebAssembly fixes, watchOS finally compiling end-to-end, <code>perry/thread</code> primitives wired up the rest of the way, and a batch of compile-time strictness wins that turn silent drops into real errors.
      </p>

      <h2>1. <code>@perryts/perry</code> on npm</h2>
      <p>
        Perry has always installed via Homebrew on macOS and APT on Debian/Ubuntu. Good coverage for developers on those platforms, nothing at all for Windows users unless they built from source, and nothing uniform across a team that mixes Mac and Linux and Windows. v0.5.107 made that problem go away.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        The package is a thin launcher that depends on seven per-platform optional packages — macOS arm64/x64, Linux x64/arm64 on both glibc and musl, Windows x64 — and npm installs only the one matching your machine. Binary size per platform is in the low single-digit megabytes. The install itself is seconds. There&apos;s a global install path too (<code>npm install -g @perryts/perry</code>) if you prefer that, but the project-local install pins the compiler version next to your dependencies, which is the right default.
      </p>
      <p>
        Publishing went through OIDC Trusted Publisher so every release is provenanced and tied back to the CI job that built it. That was its own day of CI work — several <code>v0.5.107</code> CI commits chasing the right <code>--provenance</code> / npm version / workflow path combination — but it landed, and every release since has been clean. Windows users are first-class citizens now, and the cross-team friction of &ldquo;install it however your OS likes&rdquo; is gone.
      </p>

      <h2>2. <code>perry dev</code> — watch mode</h2>
      <p>
        v0.5.143 added a new CLI subcommand:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        That&apos;s it. It watches your project, recompiles on save, and relaunches your binary. The inspiration is Vite and <code>nodemon</code>; the point is to stop pretending a compiler-to-binary workflow has to feel slower than a runtime. For most projects <code>perry dev</code> rebuilds in under a second on a warm cache.
      </p>
      <p>
        The &ldquo;warm cache&rdquo; bit matters. Two new caches landed alongside <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>In-memory AST cache</strong> (v0.5.156). Across rebuilds in a single <code>perry dev</code> session, Perry keeps the parsed AST for every module that hasn&apos;t changed on disk. Editing one file re-parses one file, not the whole module graph.
        </li>
        <li>
          <strong>On-disk per-module object cache (V2.2)</strong>. Each module compiles to its own <code>.o</code> file and gets hashed; unchanged modules skip codegen entirely and the linker picks up the cached object. The cache verbose output matches the spec in <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, and a round of audit hardening in v0.5.160 closed the edge cases where stale cache entries could survive a header change.
        </li>
      </ul>
      <p>
        The two caches stack. First edit of the session is full compilation; everything after that only does work proportional to what you actually changed. This is the single biggest DX shift of the week.
      </p>

      <h2>3. Beating Bun on every benchmark</h2>
      <p>
        At v0.5.166 the README had one honest caveat: Perry was 1.6x slower than Node on <code>json_roundtrip</code> (50× <code>JSON.parse</code> + <code>JSON.stringify</code> on a 1MB, 10K-item blob), and 2.4x slower than Bun. Issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> tracked the follow-up. By v0.5.173 — seven days later — that gap closed.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry now wins every workload in the main benchmark suite — <strong>15/15 vs Node, 15/15 vs Bun</strong>, best of 5 runs on macOS ARM64. Bun 1.3 is still ahead on peak RSS (84MB vs Perry&apos;s 310MB on <code>json_roundtrip</code>), so allocator pressure is the next thing to close, but raw latency is Perry&apos;s.
      </p>
      <p>
        The closing of the JSON gap wasn&apos;t one change — it was the accumulation of the object-layout parity work that ran through this week: Phase 1 object-literal shape inference (v0.5.167), Phase 4 body-based return-type inference for free functions, class methods, getters, and arrows (v0.5.169), and Phase 4.1 method-call return-type inference (v0.5.170). The theme is the same as the last post: give LLVM enough static structure to see through, and the optimizer does the rest.
      </p>
      <p>
        v0.5.164 also restored <code>&lt;2 x double&gt;</code> parallel-accumulator autovectorization on pure-fadd reduction loops, which had silently regressed at some point in the v0.5.9x→v0.5.16x range. That&apos;s what brings <code>math_intensive</code> and <code>accumulate</code> back to their old 3-4x lead over Rust/C++/Go/Swift — same LLVM, one <code>reassoc contract</code> flag, one vectorized loop body.
      </p>

      <h2>4. <code>perry/ui</code> and doc-tests</h2>
      <p>
        Four remaining perry/ui gaps closed in v0.5.151. Alongside that, v0.5.119 flipped silent perry/ui API misuse from &ldquo;compiles and does nothing&rdquo; to a hard compile error — same logic as v0.5.165 applied to decorators (see below). Misuse surfacing at compile time is always better than at runtime.
      </p>
      <p>
        v0.5.123 shipped a <strong>doc-examples test harness</strong> and a widget gallery. Every TypeScript example in the documentation is now compiled on every CI run, and the widget gallery compares screenshots against blessed baselines. v0.5.125 extended that to a cross-compile matrix: every doc example is built for iOS, tvOS, Android, WASM, and Web as well as the host platform, so API drift across targets gets caught on the PR that introduced it rather than the release cycle that shipped it.
      </p>
      <p>
        A small quality-of-life win: <code>perry check</code> now emits <code>file:line:column</code> for HIR lowering errors (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), which means editor jump-to-error works instead of showing a generic message without a location.
      </p>

      <h2>5. watchOS compiles end-to-end</h2>
      <p>
        watchOS shipped as a compilation target last month, but a clean end-to-end build had some rough edges. This week&apos;s watchOS work:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> and <code>--target watchos-simulator</code> now compile end-to-end without the workarounds that had accumulated.</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> for Metal-surface apps.</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> for SwiftUI-hosted rendering — when you want SwiftUI to own the app lifecycle and Perry to compose the UI inside it.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> wired into perry-ui-ios and perry-ui-tvos, so Geisterhand UI testing runs the same way on those two targets as it does on macOS and Linux.</li>
      </ul>

      <h2>6. <code>perry/thread</code> primitives fully wired</h2>
      <p>
        v0.5.174 (today) closed <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code>, and <code>spawn</code> are fully wired through the codegen path with compile-time safety enforcement. Mutable captures get rejected at compile time — the same compile-time-correctness posture perry/ui and decorators now have. Thread primitives that were partially wired since the v0.4.0 announcement are now complete end-to-end.
      </p>

      <h2>7. WebAssembly and the web target</h2>
      <p>
        Two WASM fixes worth calling out:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: five compounding bugs in <code>--target web</code> (the WASM output path) that masked each other. Fixed as a batch so the web target now holds up under the full <code>perry/ui</code> surface (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> inside <code>if</code> inside a loop was hanging on WASM — a codegen bug that didn&apos;t reproduce on the native targets. Fixed (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Also on the correctness side: v0.5.157 fixed <code>obj.field</code> returning <code>NaN</code> on Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), and v0.5.162 fixed a cursed ws bug where <code>sendToClient</code> and <code>closeClient</code> had been compiling to silent no-ops (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Compile-time strictness wins</h2>
      <p>
        A theme of this week: anything that used to be a silent failure is now a compile error.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: TypeScript decorators were parsed into HIR and then silently dropped. Now they error at the decoration point with a clear message (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). Same warn→bail reasoning as v0.5.119 applied to perry/ui.</li>
        <li><strong>v0.5.119</strong>: perry/ui API misuse rejected at compile time instead of producing a no-op binary.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> now emits a real native backtrace to stderr instead of only echoing the message (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). Symbolicated frames require <code>PERRY_DEBUG_SYMBOLS=1</code>; without it you get addresses, which is still more than the message-echo behavior it replaces.</li>
      </ul>

      <h2>9. Wrapping up</h2>
      <p>
        The pattern of the week: <strong>distribution</strong> (npm), <strong>developer experience</strong> (<code>perry dev</code>, incremental caches), and <strong>the last remaining benchmark loss closed</strong>. Plus a batch of compile-time strictness that turns silent drops into real errors. Six days, 94 patch releases, one major DX shift.
      </p>
      <p>
        Try it:
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
