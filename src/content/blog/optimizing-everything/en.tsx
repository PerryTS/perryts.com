export default function Content() {
  return (
    <>
      <p>
        The last blog post shipped with Perry at v0.5.12. Today we&apos;re on v0.5.80. That&apos;s <strong>68 patch releases in seven days</strong>, almost entirely focused on one thing: turning every remaining slow path into a fast path.
      </p>
      <p>
        The LLVM cutover in v0.5.0 recovered to parity with Cranelift by v0.5.12. That was the end of one story and the beginning of another. LLVM sees everything now. The question stopped being &ldquo;why is this slow?&rdquo; and started being &ldquo;why isn&apos;t this already fast?&rdquo; — which is a much more tractable question.
      </p>
      <p>
        This post is a tour of the week. JSON got a 547x speedup. mimalloc became the global allocator. Property access grew a monomorphic inline cache. Buffers grew typed pointer slots with <code>noalias</code> metadata. Fastify and WebSocket servers stopped crashing after a minute. And the benchmarks moved again.
      </p>

      <h2>1. JSON: closing a 547x gap</h2>
      <p>
        At v0.5.29, Perry&apos;s JSON.parse on a 20-record array was <strong>547x slower than Node</strong>. By v0.5.46 it was 1.3x. That number is the single biggest delta of the week, and it&apos;s worth walking through because every other optimization in this post is a variation on the same theme: don&apos;t do work you don&apos;t have to.
      </p>
      <p>
        The original parser allocated one Vec per property, one Vec of keys per object, and one RefCell-guarded thread-local for the key cache. It copied every string. It re-hashed every field name. It built a brand-new object shape for every record, even when all 20 records had the exact same fields in the exact same order. Node&apos;s parser handles this by noticing the pattern and sharing a single shape across all records. Perry&apos;s did not.
      </p>
      <p>The fix landed in four steps:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Key interning via a thread-local <code>PARSE_KEY_CACHE</code></strong> (v0.5.45). The first record allocates N key strings; records 2 through 20 allocate zero. Repeated keys resolve to the same pointer, which makes them usable as shape-cache lookup keys without a strcmp.</li>
        <li><strong>Shape sharing through the transition cache</strong> (v0.5.45). Objects built by <code>js_object_set_field_by_name</code> walk the same transition graph. When the schema repeats, the <code>keys_array</code> pointer is shared, and that&apos;s what a polymorphic inline cache needs to hit.</li>
        <li><strong>Zero-copy string parsing + incremental object build</strong> (v0.5.46). <code>parse_string_bytes</code> now returns <code>ParsedStr::Borrowed(&amp;[u8])</code> when there are no backslash escapes — which is the common case for every key and most values. <code>parse_object</code> writes fields directly instead of collecting into a Vec first.</li>
        <li><strong>GC suppression during parse</strong> (v0.5.60, closes #59). Parsing a large array allocates thousands of small objects in a tight loop. Each one was tickling the GC threshold check. Setting a &ldquo;parsing in progress&rdquo; flag defers collection until the parse returns — same effective heap size, vastly fewer bookkeeping branches.</li>
      </ol>
      <p>
        Then stringify. JSON.stringify on homogeneous arrays — the same shape, millions of times — was doing full property iteration per object, which for a shape-stable array is pure waste. A five-step fix closed most of that gap too:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: itoa / ryu fast paths for numbers, depth-based circular-reference check instead of a HashSet.</li>
        <li>v0.5.63: <code>toJSON</code> guard + persistent key cache + inline dispatch (the three per-call costs that added up).</li>
        <li>v0.5.65: homogeneous-shape stringify template + ASCII escape fast path. When every element has the same shape, the key/colon/comma scaffolding is precomputed once.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: per-call shape-template cache, close the parse-leftover GC gap, kill the remaining fixed per-call overhead.</li>
        <li>v0.5.79: the small-value path. Numbers, booleans, and short strings go through a direct path that doesn&apos;t set up any of the object machinery.</li>
      </ul>
      <p>
        The cumulative result: a JSON pipeline that was <strong>547x off Node</strong> at the start of the week is now roughly <strong>1.3x off on parse and competitive on stringify</strong>, on realistic workloads.
      </p>

      <h2>2. The allocator story</h2>
      <p>
        Perry allocates a lot. Every object literal, every array literal, every string concatenation, every closure. The allocator is hot, and for most of v0.5 it was Rust&apos;s default system allocator plus a thread-local arena for short-lived values.
      </p>
      <p>
        v0.5.67 replaced the global allocator with <strong>mimalloc</strong>. This is a one-line change in Cargo.toml that pays back immediately on any workload that does a lot of small allocations — which is every TypeScript program. v0.5.66 preceded it by consolidating all the <code>gc_malloc</code> thread-local state into a single TLS access per call, so the path into mimalloc was as cheap as possible.
      </p>
      <p>
        v0.5.68 took this further with <strong>arena-allocated strings</strong>. Short-lived strings (intermediate concat results, <code>split()</code> pieces, parser scratch) skip the global allocator entirely and land in a per-thread bump arena that resets at natural boundaries. For JSON parsing this was a double-digit percent win on its own.
      </p>
      <p>
        And the two optimizations that don&apos;t allocate at all:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Scalar replacement of non-escaping objects</strong> (v0.5.17, then object literals in v0.5.76). If an object never leaves its enclosing function, it doesn&apos;t need to exist. Its fields become plain locals. LLVM handles this out of the box once you stop hiding the object behind an opaque allocator call.</li>
        <li><strong>Scalar replacement of non-escaping arrays</strong> (v0.5.73). Same idea — if the array doesn&apos;t escape, its elements become SSA values and the whole allocation disappears.</li>
      </ul>
      <p>
        For the array literal path specifically, v0.5.69 added an <strong>exact-sized fast path</strong> (skip the capacity-growth machinery when the size is known at compile time), and v0.5.74 inlined the bump-allocator IR for small array literals so LLVM can see the allocation, fold it, hoist it, or eliminate it. Array-heavy benchmarks moved another step.
      </p>
      <p>
        Rounding it out, v0.5.25 fixed a quieter bug: <code>gc_malloc</code> wasn&apos;t triggering collection on its own path, so malloc-heavy workloads could grow the heap unbounded before anything checked. v0.5.61 added adaptive step sizing to the threshold, which is what you actually want: check cheaply when the heap is small, less often when it&apos;s large.
      </p>

      <h2>3. Property access grew a real inline cache</h2>
      <p>
        Every modern JavaScript engine has a polymorphic inline cache (PIC) on property access. For most of Perry&apos;s v0.5 series, PropertyGet went through a shape-table lookup with a thread-local hash. That&apos;s fine for cold code. It&apos;s not fine when 95% of your property reads in a given call site see the same shape, which is almost always.
      </p>
      <p>
        v0.5.44 landed a <strong>monomorphic inline cache</strong> for <code>PropertyGet</code>. Each PropertyGet site gets a per-callsite cache entry: an expected shape pointer and a field offset. Hit path is a single compare plus an indexed load. Miss path falls through to a slow helper that updates the cache.
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
        v0.5.51 added a <strong>content-hash shape-transition cache</strong> for dynamic property writes. Two objects that grow the same fields in the same order hash to the same transition, so they end up sharing the same shape — and that means the read side of the PIC actually hits.
      </p>
      <p>
        v0.5.55 peeled off the last TLS access from the transition cache. v0.5.46 fixed a PIC miss-handler bug where objects with &gt;8 fields were reading past the inline slots into uninitialized memory (closes #55). v0.5.78 added a guard to stop PropertyGet&apos;s PIC from indexing into non-pointer receivers like raw numbers — which could happen on overly optimistic type refinement and was one of the last stability issues in the IC.
      </p>
      <p>
        Net effect: property-heavy code — which in practice means most TypeScript — is roughly 2–3x faster than it was a week ago, just from the IC alone.
      </p>

      <h2>4. Integers, bitwise, and the <code>| 0</code> pattern</h2>
      <p>
        NaN-boxing makes every number an f64. TypeScript programmers write <code>x | 0</code> to force integer semantics. V8 has spent fifteen years making that cheap. Perry spent this week catching up.
      </p>
      <p>The stack of changes, in order:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> for <code>(int / const) | 0</code>. LLVM folds to <code>smulh + asr</code>, which is ~2 cycles vs ~10 for <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> on Uint8ArrayGet bounds. Replaces the bounds-check branch+phi diamond with a single basic block the vectorizer can reason about.</li>
        <li><strong>v0.5.49</strong>: fix bitwise ops with NaN/Infinity to produce 0 per the ToInt32 spec. Correctness first.</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code> that skips the 5-instruction NaN/Inf guard when the value is known-finite. Plus <code>alwaysinline</code> on tiny helpers and clamp detection.</li>
        <li><strong>v0.5.52</strong>: target clamp functions directly with <code>smin</code>/<code>smax</code> intrinsics. Clamp is the single most common integer pattern after increment.</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> and <code>x &gt;&gt;&gt; 0</code> on a known-finite value become a noop &mdash; just <code>fptosi + sitofp</code>, no guard at all.</li>
        <li><strong>v0.5.56</strong>: i32-native bitwise ops; i32 index and value in Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> lowers to the native i32 multiply instead of the polyfill path. Polyfill detection recognizes user-written <code>Math.imul</code> shims and replaces them.</li>
        <li><strong>v0.5.59</strong>: pure-function init inlining + integer-local seeding. The function-local integer analysis gets to see past call boundaries when the callee is small and pure.</li>
        <li><strong>v0.5.37–v0.5.40</strong>: accumulator-pattern int-arithmetic fast path. The classic <code>for (...) acc += f(i)</code> loop stays in i32 end-to-end when the types allow.</li>
      </ul>
      <p>
        v0.5.41 is the subtle one. When the codegen sees a module-level <code>const K: number[][] = [[...], ...]</code>, it lowers the whole thing to a flat <code>[N x i32]</code> constant in <code>.rodata</code>. <code>K[y][x]</code> becomes a single <code>getelementptr + load i32</code>. Combined with the int-analysis bridge in v0.5.43, this is what gave <code>image_conv</code> (a 5×5 Gaussian blur over a 4K RGB frame) a <strong>3x speedup in a single release</strong>.
      </p>

      <h2>5. Buffers and Uint8Array</h2>
      <p>
        Binary workloads — crypto, image processing, parsing, networking — live in Buffer and Uint8Array. v0.5.64 gave them <strong>typed pointer slots plus <code>noalias</code> metadata</strong>. Where a Buffer used to be a NaN-boxed double in an <code>alloca double</code>, it&apos;s now a raw <code>i64</code> pointer in an <code>alloca i64</code>, with LLVM annotations telling the optimizer &ldquo;this pointer doesn&apos;t alias other pointers in scope.&rdquo; That unlocks load/store reordering, vectorization, and register allocation that the optimizer would otherwise refuse to do.
      </p>
      <p>
        v0.5.80 closed the final correctness issue here: a module-wide buffer <code>alias-scope</code> counter that was being reset per-function, which could in rare cases let LLVM reason across scopes that shouldn&apos;t share a scope ID. Now the counter is module-wide and the <code>noalias</code> story is airtight.
      </p>
      <p>
        v0.5.53 made <code>Uint8ArraySet</code> branchless — a masked store instead of an if/else that wrote 0 on out-of-bounds. v0.5.54 added a <strong>Two-Way indexOf</strong> for longer patterns and an arena-allocated <code>split</code>, which together closed most of the gap on string-heavy Buffer parsing.
      </p>

      <h2>6. Strings: ASCII is the fast path</h2>
      <p>
        JavaScript strings are UTF-16, but most real-world strings (keys, identifiers, HTTP headers, JSON scaffolding) are ASCII. v0.5.71 added an <strong>O(1) <code>charCodeAt</code> and <code>codePointAt</code> for ASCII strings</strong> — no UTF-16 scan, just a byte load. v0.5.20 already made <code>indexOf</code>, <code>slice</code>, and <code>charAt</code> bypass the UTF-16 scan on ASCII.
      </p>
      <p>
        One correctness note inside that same release: <code>String.length</code> now returns UTF-16 code units (ECMAScript spec) instead of byte count. That was a lurking bug where <code>&quot;caf&eacute;&quot;.length</code> returned 5 instead of 4.
      </p>

      <h2>7. The servers actually stay up now</h2>
      <p>
        The week&apos;s least glamorous work was also the most user-visible: making long-running Node-style servers — Fastify, ws, http, net — not crash after a few minutes.
      </p>
      <p>
        The crashes all shared a root cause: the GC didn&apos;t know about listener closures. When you write <code>wss.on(&apos;message&apos;, handler)</code>, the closure captures variables, which live as fields inside a GC-allocated cell. If the GC root scanner doesn&apos;t know to visit those cells, their captures get reclaimed and the next message event dereferences freed memory.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: root-scan <code>net.Socket</code> event listener closures (closes #35).</li>
        <li><strong>v0.5.27</strong>: extend to <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>.</li>
        <li><strong>v0.5.28</strong>: register module-level globals as GC roots (closes #36). Lifetime bug one layer up.</li>
        <li><strong>v0.5.21</strong>: <code>gc()</code> safety inside Fastify/WebSocket request handlers — the explicit GC call was running while request handlers held pointers into the arena (closes #31).</li>
      </ul>
      <p>
        Alongside the GC work, v0.5.20 shipped a <strong>main event loop</strong> — a real one, not a placeholder — that keeps WebSocket and timer-based servers alive instead of exiting after the last sync call returns (refs #28). This was the single most impactful fix for anyone trying to run Perry as a production HTTP server. Fastify now stays up. WebSocket servers now stay up.
      </p>
      <p>
        v0.5.19 fixed the SysV AMD64 ABI mismatch for JSValue FFI args/returns — an issue on Linux where native FFI calls could silently corrupt arguments. v0.5.18 added native dispatch for <code>axios</code> (get/post/put/delete/patch), including <code>response.status</code> and <code>response.data</code>. v0.5.30 fixed <code>fastify request.header()</code> and <code>request.headers[]</code> dispatch, which had been returning undefined for case-insensitive lookups.
      </p>

      <h2>8. <code>@perry/postgres</code>: the driver that made all of this necessary</h2>
      <p>
        A lot of this week&apos;s work was driven by one workload: getting a full Node-compatible <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">Postgres driver</a> working on Perry-native. The driver is TLS-capable, has a cross-module codec registry, supports cancel/close/notify, and now benchmarks against <code>pg</code>, <code>postgres.js</code>, and <code>tokio-postgres</code>.
      </p>
      <p>The driver-side perf work paralleled the compiler-side:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hoist per-column codec</strong> and drop per-cell Buffer copies. BigInt(string) for int8 to avoid intermediate allocations.</li>
        <li><strong>Dynamic per-shape Row constructor</strong> for object-form rows. If your query always returns the same columns, the driver builds a shape-specialized row constructor the first time and reuses it — which, in combination with the compiler&apos;s PIC, makes field access on rows as fast as field access on any other object.</li>
        <li><strong><code>parseTypes: &apos;minimal&apos;</code> opt-out</strong> for callers that want raw strings for int8/numeric/date.</li>
      </ul>
      <p>
        This is the positive feedback loop the compiler was always meant to enable. A real driver surfaces real bottlenecks. The bottleneck gets a one-line reproducer filed as a GitHub issue. A week of compiler fixes later, the driver is faster and the compiler is faster for everyone else too. That&apos;s the whole plan, compressed into seven days.
      </p>

      <h2>9. Correctness fixes worth naming</h2>
      <p>
        Performance work surfaces correctness issues the way dredging a river surfaces grocery carts. A partial list:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> was reading <code>.value</code> on rejection instead of <code>.reason</code>, so rejections were swallowed silently (v0.5.13–v0.5.14).</li>
        <li><strong>Promise.any</strong> now throws a proper <code>AggregateError</code> when all input promises reject. Added <code>Promise.withResolvers</code> and fixed <code>queueMicrotask</code> ordering.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> now produces a character array instead of a broken object (closes #16).</li>
        <li><strong>BigInt arithmetic and <code>BigInt()</code> coercion</strong> (closes #33). The i64 bigint fast path (v0.5.29) makes the common case cheap.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> with a numeric byte argument were comparing against buffer pointers instead of byte values (closes #56).</li>
        <li><strong>Bitwise ops with NaN/Infinity</strong> produce 0 per ToInt32 spec (closes #57).</li>
        <li><strong>Windows x86_64</strong>: five platform-specific fixes — <code>localtime</code>, <code>clang</code> discovery, and a handful of codegen adjustments — got Windows x86_64 back to green (v0.5.72).</li>
      </ul>

      <h2>10. The numbers</h2>
      <p>
        The headline benchmark from the last post was <code>factorial</code> at 24.6x faster than Node. That number is unchanged. What moved this week is everything around it:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (20-record schema)</td><td className="text-right py-2 px-3">547x slower than Node</td><td className="text-right py-2 px-3">1.3x slower than Node</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (4K 5×5 blur)</td><td className="text-right py-2 px-3">1,980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4.3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Property-heavy code (PIC hit)</td><td className="text-right py-2 px-3">baseline</td><td className="text-right py-2 px-3">2–3x</td><td className="text-right py-2 px-3 text-green-400">2–3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1.3x</td></tr>
            <tr><td className="py-2 px-3">Fastify uptime under load</td><td className="text-right py-2 px-3">~60s before crash</td><td className="text-right py-2 px-3">indefinite</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The full 15-benchmark suite against Node is still 14 wins and 1 tie — the same table as last post, with slightly better numbers across the board. The real movement this week is on workloads that weren&apos;t in that suite: JSON, image processing, long-running servers. Those were where the gaps lived, and those are what closed.
      </p>

      <h2>11. What&apos;s next</h2>
      <p>
        The one benchmark we&apos;re still chasing is <code>image_conv</code> vs Zig. Perry is at 457ms; Zig is at 246ms. That gap is architectural, not optimization-pass-level, and it lives in three places:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Typed buffer locals</strong>. Most of the Buffer work landed this week, but buffer-typed function params and locals still unbox on every access. The <code>i64</code> slot approach we use for loop counters needs to extend to buffers.</li>
        <li><strong>Interior/border loop splitting</strong>. The blur loop clamps every pixel, including the 99.9% of pixels that don&apos;t need it. Splitting into border regions (clamped) and interior (no clamp) lets LLVM vectorize the interior with NEON <code>ld3</code>/<code>st3</code>.</li>
        <li><strong>Double-ABI FNV-1a hash</strong>. The hash helper is called through the NaN-box ABI. Specializing it to raw i64 in/out for hot paths is a few hours of work that will pay off across every hash-heavy workload.</li>
      </ol>
      <p>
        Those are tracked in <code>PERF_ROADMAP.md</code>. Expect to see them in the next cycle.
      </p>

      <h2>Wrapping up</h2>
      <p>
        The pattern of this week — 68 patch releases, almost all performance, one JSON gap going from 547x to 1.3x — is what happens when you cross over onto the good side of the LLVM-cutover hill. The optimizer is now an ally instead of a wall, and most of what&apos;s left is small, specific, measurable work: find a slow path, figure out why the optimizer can&apos;t see through it, expose the structure, measure again. None of these commits are exotic. They&apos;re just applied where they&apos;re needed.
      </p>
      <p>
        If you want to try any of this:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Issues, reproducers, and benchmarks that aren&apos;t fast enough: keep them coming. This pace only works because the bug reports are specific enough to turn into one-line reproducers. Every commit in this post has a <code>#N</code> attached to it for a reason.
      </p>
      <p>— Ralph</p>
    </>
  );
}
