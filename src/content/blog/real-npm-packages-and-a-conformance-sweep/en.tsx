export default function Content() {
  return (
    <>
      <p>
        The last post ended at <strong>v0.5.875</strong> with the GC story — closing the gap aya_koto&apos;s benchmark exposed. That post was about winning one benchmark. This one is about a different kind of work: the roughly <strong>270 releases between v0.5.875 and v0.5.1146</strong>, landed over about four weeks, almost none of which are benchmark headlines. The theme shifted from &ldquo;go fast on a microbenchmark&rdquo; to <strong>&ldquo;make real-world TypeScript and real npm packages actually compile and run.&rdquo;</strong> Plus a full Windows visual overhaul and a pile of new widgets along the way.
      </p>
      <p>
        Here&apos;s what shipped, grouped by what it was actually for.
      </p>

      <h2>Real npm packages compile now</h2>
      <p>
        The biggest single thread through this window is a sweep to make popular npm packages compile to native binaries and pass behavioral tests — not just &ldquo;link without errors,&rdquo; but run and produce the right output. The list that now works through <code>perry.compilePackages</code> includes <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, and Colyseus</strong>.
      </p>
      <p>
        Each one failed for its own reason, and each fix is its own small story:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> crashed with <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>. Root cause (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code> where <code>F</code> is a function imported from another module silently produced an empty object — the constructor body never ran, so every <code>$ZodCheckMinLength</code>-style check came back stripped of its <code>_zod</code> property.</li>
        <li><strong>axios + jose</strong> needed crypto and compression Perry didn&apos;t have yet: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> for AES-GCM, and <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> was deadlocking on a one-second polling timeout in <code>wait_for_promise</code>; we replaced it with a condvar wait and made rejected promises surface as <code>HTTP 500</code> instead of hanging (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> couldn&apos;t read a POST body — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> returned empty on POST/PUT until a parent-registration fix in v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> all hit the same shape: a <em>callable value with properties attached</em> (<code>chalk.red</code>, <code>express()</code> plus <code>express.Router</code>). Three flavors of that pattern got fixed across v0.5.935 and the surrounding npm sweep, plus <code>util.inherits</code> + a stream prototype scaffold to unblock express (v0.5.990).</li>
        <li><strong>dayjs</strong>, shipped as a minified bundle, exercised JS-classic prototype-method dispatch (<code>Class.prototype.m = fn</code>) that Perry lowered wrong (v0.5.924/932).</li>
      </ul>
      <p>
        Underneath all of that sits the part that makes packages Perry <em>can&apos;t</em> compile natively still run: the <strong>V8-fallback runtime</strong> got real this window. Its ModuleLoader now reads from an embedded module map, so a fallback binary is still <strong>self-contained</strong> — no loose <code>node_modules</code> at runtime (v0.5.994). <code>createServer</code> bridges to a real hyper server (v0.5.999), and <code>Response</code> / <code>Request</code> / <code>Headers</code> Web Fetch globals exist in the fallback path (v0.5.1006). And <strong>compile-time dynamic <code>import()</code></strong> — string-literal <code>await import(&apos;./foo.ts&apos;)</code> resolved at build time — finally landed (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>A test262 conformance sweep</h2>
      <p>
        The other dominant thread is conformance. We ran focused passes against the test262 subset radars and moved the needle on the built-ins that real code leans on hardest:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        The String jump came from giving every <code>String.prototype</code> method generic-<code>this</code> dispatch and fixing <code>slice</code>/<code>substring</code> index coercion. The Array jump was <code>thisArg</code> on the dense-array callbacks (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), array-like <code>ToLength</code>, spec operation ordering, and zero-argument validation. Destructuring picked up parameter-destructuring across plain, generator, async-generator, static, and private class methods.
      </p>
      <p>
        Alongside the headline numbers, a long tail of correctness landed: <code>JSON.parse</code> now throws a real <code>SyntaxError</code> (not a <code>TypeError</code>) and rejects trailing tokens; its reviver walks via the spec <code>InternalizeJSONProperty</code> algorithm; <code>Object.prototype.toString</code> brands correctly for typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; <code>RegExp.prototype.toString</code> returns <code>/source/flags</code>; async generators got their <code>yield</code>-awaits-operand semantics right. These are subset radars, not the full suite — Perry is still climbing — but the climb this month was steep.
      </p>

      <h2>Windows goes Fluent</h2>
      <p>
        Windows got a visual overhaul (the <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a> series). Perry windows now opt into the modern DWM chrome by default — <strong>Mica backdrop</strong>, rounded corners, and a theme-aware title bar — and the common controls render through <strong>comctl32 v6</strong> instead of the Windows 95-era defaults. The window proc now handles <code>WM_DPICHANGED</code>, so a window stays crisp when you drag it between monitors with mixed scaling instead of getting bitmap-stretched.
      </p>
      <p>
        Crucially, none of this reintroduced the old <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;black area after resize&rdquo; regression: the client area is still painted opaque, and full-frame Mica/Acrylic blur-through stays an explicit <code>app.setVibrancy(...)</code> opt-in. There&apos;s also a new <code>--target windows-winui</code> backend scaffold (WinUI 3) for apps that want the fully modern stack, and a small but real fix that makes <code>perry compile main.ts -o main</code> produce <code>main.exe</code> on Windows so PowerShell will actually launch it (v0.5.1146).
      </p>

      <h2>New widgets, every platform</h2>
      <p>
        Two widgets landed in just the last day, and both span every UI platform Perry targets:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — a compact, field-style date control: <code>NSDatePicker</code> on macOS, <code>UIDatePicker</code> (.compact) on iOS/visionOS, <code>SysDateTimePick32</code> on Windows, <code>android.widget.DatePicker</code> on Android, GTK4 on Linux. One TS surface across all of them.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — any widget can be a drop destination and a drag source for text/files/URLs, mapped to <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit), and <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Earlier in the window the widget shelf filled out across desktop and mobile too — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, and a swipeable ImageGallery — each backed by the real native control on every platform. HarmonyOS (ArkTS) got Chart and TreeView (v0.5.893), the last two widgets it needed to reach parity with the others.
      </p>

      <h2>GC, internals, and stability</h2>
      <p>
        Most of those 270 releases are not headlines — they&apos;re bug fixes and internals, and that&apos;s the point of this phase. A few worth calling out:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC continued.</strong> The conditional free-list work from the GC post kept settling in, and a sharp class of bug got closed: native-bridged Promises are now <strong>pinned while in flight on a tokio worker</strong> so the GC can&apos;t sweep them before resolution lands (v0.5.923). If you ran an async fetch under load and saw a phantom collection, that was this.</li>
        <li><strong>The memory model is documented.</strong> There&apos;s now an <code>internals/memory-model.md</code> deep-dive — NaN-boxing, the generational GC, the shadow stack, and write barriers — wired into the docs site (v0.5.933).</li>
        <li><strong>A wave of codegen stability fixes</strong> surfaced by the npm sweep: a module-level <code>const</code> arrow called inside a resumed async step no longer SIGSEGVs (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> no longer hangs forever (v0.5.870), and a handful of <code>js_is_truthy</code> / raw-pointer-range crashes that real bundles tripped.</li>
      </ul>

      <h2>Apple housekeeping</h2>
      <p>
        Smaller but real: <code>perry setup ios --development</code> now provisions for development builds (v0.5.1023), and the Apple cross-library build/link path was deduplicated and made pointer-width-portable (v0.5.1121/1125) — which is what unblocked the npm / Homebrew / APT / winget publish matrix that had been wedged.
      </p>

      <h2>Where this leaves things</h2>
      <p>
        The bet behind Perry has always been that &ldquo;native TypeScript&rdquo; only matters if <em>real</em> TypeScript runs — not a toy subset, the actual packages people <code>npm install</code>. This month was mostly that work: less a single number to brag about, more a long, unglamorous push to close the gap between &ldquo;compiles&rdquo; and &ldquo;works.&rdquo; The conformance radars and the npm parity tests are the scoreboard we&apos;re watching now, and we&apos;ll keep posting the numbers — the good and the still-imperfect.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
