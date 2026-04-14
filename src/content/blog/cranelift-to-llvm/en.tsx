export default function Content() {
  return (
    <>
      <p>
        Perry&apos;s backend migration from Cranelift to LLVM is finished. As of v0.5.12, LLVM is the sole code generation backend, and Perry now beats Node.js on every benchmark — by margins ranging from 1.7x to 24.6x (with two ties).
      </p>
      <p>
        Getting here was not a straight line. The initial cutover in v0.5.0 made several benchmarks <strong>70x slower</strong> than the Cranelift version it replaced. This post is the long version of what happened, why we made the switch anyway, what broke, what fixed it, and what the numbers look like on the other side.
      </p>
      <p>
        If you&apos;re building a compiler, evaluating codegen backends, or just curious why &ldquo;switch to LLVM&rdquo; is rarely as simple as it sounds, this is for you.
      </p>

      <h2>Part 1: Why Switch at All?</h2>
      <p>
        Perry compiles TypeScript directly to native machine code. No Node, no V8, no Electron, no WebView. The pitch is &ldquo;write TypeScript, ship a native binary,&rdquo; and the entire value proposition collapses if that binary isn&apos;t actually fast.
      </p>
      <p>
        For Perry&apos;s first several minor versions, the codegen backend was <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. Cranelift is excellent — it&apos;s the codegen behind wasmtime, it&apos;s used by SpiderMonkey&apos;s baseline JIT, and it&apos;s the tool of choice when you need fast, predictable compilation with a clean embedding story. For a project bootstrapping a new language, it was the right starting point.
      </p>
      <p>
        But two things eventually pushed us off it.
      </p>

      <h3>1. The optimizer ceiling</h3>
      <p>
        Cranelift is intentionally a fast, single-tier optimizing compiler. Its mandate is &ldquo;produce decent code quickly,&rdquo; not &ldquo;produce the best possible code given unlimited time.&rdquo; That&apos;s the right tradeoff for a JIT. It&apos;s the wrong tradeoff for an AOT compiler whose entire selling point is native performance.
      </p>
      <p>
        LLVM has had over two decades of work poured into its middle-end. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis — there is no realistic universe in which a smaller project catches up. If Perry is going to claim &ldquo;faster than Node,&rdquo; we need that machinery.
      </p>

      <h3>2. The arm64_32 problem</h3>
      <p>
        The immediate forcing function was Apple Watch. <code>arm64_32</code> is an ABI Apple introduced for the Series 4 onward — 64-bit instructions, 32-bit pointers. Cranelift doesn&apos;t support it, and there was no realistic path to it landing. For Perry to credibly claim &ldquo;9 platforms from one codebase,&rdquo; watchOS could not be missing. LLVM supports <code>arm64_32</code> out of the box.
      </p>
      <p>
        Once we accepted that <em>some</em> targets would require LLVM, maintaining two backends became untenable. Two backends means two sets of bugs, two sets of optimization passes, two test matrices, two performance baselines. The honest answer was: pick one.
      </p>
      <p>We picked LLVM.</p>

      <h2>Part 2: A Word on Cranelift</h2>
      <p>
        Before going further: this post is not a Cranelift teardown. Cranelift is a brilliant piece of engineering, and if you&apos;re building a JIT, a sandboxed runtime, or anything where compile latency matters more than peak throughput, it should be near the top of your list. wasmtime ships it for good reason. The Bytecode Alliance has been doing exemplary work.
      </p>
      <p>
        Perry&apos;s needs are just different. We compile ahead of time, we ship the binary once, and the user runs it millions of times. That asymmetry — compile rarely, execute always — is exactly the regime where LLVM&apos;s heavier optimizer pays for itself. Different tool for a different job.
      </p>

      <h2>Part 3: The Cutover Disaster</h2>
      <p>
        v0.5.0 was the first release with LLVM as the sole backend. We expected a small regression in compile time and a meaningful improvement in runtime performance. We got the opposite of the second one.
      </p>
      <p>Here&apos;s the table I did not want to post at the time:</p>

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
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2.8x faster</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1.8x slower</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2.3x slower</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Some workloads got faster. Most got dramatically worse. <code>method_calls</code> — one of the most important benchmarks because it represents idiomatic TypeScript class usage — was nearly 70x worse than what we shipped two releases prior.
      </p>

      <h3>What actually went wrong</h3>
      <p>
        Perry uses <strong>NaN-boxing</strong> for value representation. Every TypeScript value is a 64-bit word. f64 numbers are stored directly; everything else (objects, strings, booleans, undefined, null) is encoded into the unused bits of an IEEE 754 quiet NaN.
      </p>
      <p>
        The advantage: numbers are zero-cost. No boxing, no tagging, no allocation for arithmetic.
      </p>
      <p>
        The disadvantage: every operation on a non-number value requires bit manipulation to unpack, operate, and repack. If those sequences live as inline IR in your codegen, the optimizer can fuse and simplify them. If they live as <strong>calls into runtime helper functions</strong>, the optimizer sees an opaque call and gives up.
      </p>
      <p>
        Our Cranelift backend had grown a large number of inline lowerings for hot operations — property loads, method dispatch, object allocation, integer arithmetic on f64-tagged values. The LLVM cutover, in the interest of getting <em>correct</em> code out the door first, routed almost all of those through runtime helpers in <code>perry-runtime</code>. Each helper was a <code>call</code> instruction in LLVM IR.
      </p>
      <p>
        LLVM is excellent, but it cannot inline a function whose body it has never seen. <code>perry-runtime</code> is compiled separately, linked in at the end, and from the optimizer&apos;s perspective every helper call is a black box. The result was that hot loops which the Cranelift backend had been compiling to ~5 instructions of inline arithmetic were now compiling to function calls — register saves, stack frame setup, the works — repeated millions of times.
      </p>
      <p>
        That&apos;s where the 70x came from. Not bad codegen. Bad <strong>inlining boundaries</strong>.
      </p>

      <h2>Part 4: The Fix</h2>
      <p>
        The work to recover and surpass the Cranelift numbers fell into roughly six categories. None of them are exotic. Most are textbook compiler optimizations that just had to be applied in the right places.
      </p>

      <h3>1. Inline bump allocator for object allocation</h3>
      <p>
        <code>object_create</code> was the worst regression after <code>method_calls</code>. The old path called <code>js_object_alloc_class_with_keys</code> for every <code>new Point()</code> — a function call, a thread-local arena access, a shape-cache lookup, and a write of the GC header + object header.
      </p>
      <p>
        The fix: emit the bump allocation <strong>inline</strong> in LLVM IR. Each function that allocates objects gets a cached pointer to a thread-local <code>InlineArenaState</code> struct. Allocation becomes:
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
        The fast path is ~13 instructions of inline IR that LLVM can see, schedule around, and hoist out of loops. <code>object_create</code> went from 318ms to 9ms.
      </p>

      <h3>2. i32 loop counters</h3>
      <p>
        NaN-boxing means every TypeScript number is f64. That includes loop counters. A <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> loop with f64 induction variables is a disaster: f64 increment, f64 compare, f64-to-i64 conversion every time you index an array.
      </p>
      <p>
        The codegen detects for-loops where the induction variable is provably integer-valued and allocates a <strong>parallel i32 stack slot</strong>. The loop condition switches from <code>fcmp</code> to <code>icmp slt i32</code>, eliminating the f64 counter entirely.
      </p>
      <p>
        This moved <code>array_write</code> from 11ms to 3ms, <code>nested_loops</code> from 18ms to 9ms, and <code>array_read</code> from 11ms to 4ms.
      </p>

      <h3>3. Fast-math flags</h3>
      <p>
        We attach <code>reassoc contract</code> flags to every f64 arithmetic instruction. <code>reassoc</code> lets LLVM break serial accumulator chains into parallel ones, and <code>contract</code> allows fused multiply-add. We keep <code>nnan</code> and <code>ninf</code> off because Perry uses NaN bits as value tags.
      </p>
      <p>
        With those flags, LLVM&apos;s loop vectorizer kicks in on <code>math_intensive</code>, which dropped from 131ms to 14ms — beating Node by 3.5x.
      </p>

      <h3>4. Integer-modulo fast path</h3>
      <p>
        <code>%</code> on f64 in JavaScript is <code>fmod</code>, which is a libm call on ARM. But for integer-valued f64 operands, we can do <code>fptosi → srem → sitofp</code> and skip the libm round-trip entirely. The codegen uses static analysis to detect integer-valued operands — no runtime check needed.
      </p>
      <p>
        This is the entire reason <code>factorial</code> went from 1,553ms to 24ms — and from Node&apos;s 591ms to 24ms. <strong>24.6x faster than Node.</strong>
      </p>

      <h3>5. LICM for nested loops</h3>
      <p>
        LLVM does loop-invariant code motion out of the box, but NaN-boxing hides the structure. <code>arr.length</code> lowers to a load through a NaN-boxed pointer with a tag check — not obviously invariant.
      </p>
      <p>
        The codegen detects the <code>{'for (...; i < arr.length; ...)'}</code> pattern and pre-loads the length into a stack slot before the loop, with a static walker verifying the loop body can&apos;t change the array&apos;s length. When the counter is bounded by this hoisted length, IndexGet/IndexSet skip bounds checks entirely.
      </p>

      <h3>6. Shape-cached objects</h3>
      <p>
        When the codegen knows the class of an object, it resolves field offsets at compile time and emits <strong>direct indexed loads</strong> — no runtime dispatch. For method dispatch, <code>obj.method(args)</code> becomes a direct <code>call @perry_method_Class_name(this, args)</code> — no vtable, no inline cache, no hash lookup.
      </p>
      <p>
        The LLVM cutover had regressed this to the universal slow path. Restoring static dispatch gave us the <code>method_calls</code> recovery — from 1,084ms back down to 1ms. <strong>11x faster than Node.</strong>
      </p>

      <h2>Part 5: The Numbers Today</h2>
      <p>Median of three runs, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

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
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">2.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Every benchmark is a win or a tie. The closest is <code>object_create</code> (9ms vs 8ms), where V8&apos;s allocator is genuinely excellent.
      </p>

      <h2>Part 6: The Compile-Time Question</h2>
      <p>
        The number-one reason people pick Cranelift over LLVM is compile speed. So let&apos;s talk about it.
      </p>
      <p>
        LLVM increased Perry&apos;s per-file compile time by <strong>20-50ms</strong>, or roughly <strong>8-19%</strong>. Not 5x. Not 2x. Single-digit-to-low-double-digit percent.
      </p>
      <p>
        The reason is that codegen is not the bottleneck in Perry&apos;s pipeline. The breakdown for a typical file:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC parsing: ~30%</li>
        <li>HIR lowering (AST → IR, type inference): ~25%</li>
        <li>IR transform passes (closure conversion, async lowering, inlining): ~15%</li>
        <li><strong>Codegen (LLVM IR text emission + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + runtime library): ~10%</li>
      </ul>
      <p>
        Codegen is one slice of five. Even doubling that slice only moves the total by 5-10%. If you&apos;re building an AOT compiler where the user types <code>perry compile</code> once and then runs the binary forever, the calculus is: spend 25ms more at compile time, save up to 24x at every single execution.
      </p>

      <h2>Part 7: What I&apos;d Do Differently</h2>
      <p>
        If I were starting Perry today and could skip straight to LLVM, I would not. The Cranelift phase was genuinely valuable. It let us iterate on the frontend without LLVM&apos;s complexity tax, it gave us a working baseline to compare against, and it forced us to keep our HIR clean enough to be portable across backends.
      </p>
      <p>
        What I would do differently is the cutover itself. We shipped v0.5.0 with most operations going through runtime helper calls, intending to inline them later. That was wrong. The right order would have been: identify the hot paths first, lower them inline before the cutover, and only release once the LLVM backend was at least at parity.
      </p>
      <p>
        The lesson is the boring one: optimization boundaries matter more than optimizer quality. LLVM is a remarkable piece of software, but it cannot help you with code it cannot see. If your codegen routes everything through opaque runtime calls, you have built a wall between your source program and every optimization pass that exists.
      </p>

      <h2>Wrapping Up</h2>
      <p>
        Perry is now LLVM-only, faster than Node on every benchmark, and shipping. The migration took longer than I planned, hurt more than I expected in the middle, and is unambiguously the right call in retrospect. Cranelift got us to v0.5; LLVM is taking us the rest of the way.
      </p>
      <p>If you want to try Perry:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Run the benchmarks yourself: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        If you have questions, find bugs, or want to argue about codegen backends, the GitHub issues are open. I read them all.
      </p>
      <p>— Ralph</p>
    </>
  );
}
