export default function Content() {
  return (
    <>
      <p>
        On June 16 the instruction was one sentence: <em>&ldquo;find the claude code folder and get the (compiled, minified) javascript from there … let&apos;s see if we can compile it :D&rdquo;</em> When the obvious objection came back — that this would be brutal — the answer was the actual thesis: <em>&ldquo;it&apos;s brutal but also a real gut check and wall check, which is why I want to do it. Nothing replaces real-world apps in terms of finding limits.&rdquo;</em>
      </p>
      <p>
        A month later, a Perry-compiled binary of Anthropic&apos;s Claude Code CLI launches, runs <code>/login</code> through the OAuth flow, streams a real response back from the API, and paints the characters you type. Getting there took <strong>160 pull requests merged into Perry between June 20 and July 17</strong> — a no-op <code>MessageChannel</code>, a missing GC write barrier on RegExp headers, a <code>continue</code> statement that only spun on the real API and never on our mock, and about a hundred and fifty more.
      </p>
      <p>
        This post is the tour. Not because compiling someone else&apos;s CLI is a product — we don&apos;t ship this binary and never will — but because it is the single most productive bug-finding instrument we have ever pointed at Perry.
      </p>

      <figure className="my-8">
        <img
          src="/blog/compiling-claude-code/claude-code-session.png"
          alt="A macOS terminal running a Perry-compiled Claude Code binary from /tmp/verify: the v2.1.112 banner, a successful /login, the prompt “awesome, who are you?”, a streamed reply, and a clean exit back to the shell."
          width={1708}
          height={926}
          className="w-full rounded-lg border border-slate-800"
        />
        <figcaption className="text-sm text-slate-400 mt-3">
          No <code>node</code> in that command line. <code>/tmp/verify/cc_fptest_dbg25</code> is a single native executable produced by <code>perry compile</code> from the shipped <code>cli.js</code> — logging in, streaming a real answer, and exiting cleanly on Ctrl-C.
        </figcaption>
      </figure>

      <h2>What &ldquo;compiling Claude Code&rdquo; actually means</h2>
      <p>
        The target is the artifact npm ships. <code>npm pack @anthropic-ai/claude-code@2.1.112</code> gives you a <code>cli.js</code>: <strong>13 MB of minified, self-executing JavaScript</strong> with a <code>#!/usr/bin/env node</code> shebang. No source, no sourcemap, no build step of ours. We point <code>perry compile</code> at that file, unmodified, and ask for a native executable.
      </p>
      <p>
        Perry chews on it for about 37 minutes and produces roughly 207 MB of IR across <strong>16,023 functions</strong>, which link into a ~180 MB binary. Every one of those functions has one-letter names and no type annotations, and the whole thing has to work ahead-of-time — no JIT, no <code>eval</code>, no lazy bail-out to an interpreter when the compiler guesses wrong. If Perry mis-lowers one of those 16,023 functions, there is nothing to catch it.
      </p>
      <p>
        The scoring ladder comes from our internal stress suite, and it is deliberately unforgiving:
      </p>
      <pre><code>{`parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types`}</code></pre>
      <p>
        <code>correct</code> is the only tier that counts. Node v26 is the oracle; anything that isn&apos;t byte-identical to what Node prints is a Perry bug until proven otherwise.
      </p>

      <h2>Why this app in particular</h2>
      <p>
        A coding-agent CLI is an unusually hostile pile of JavaScript to compile ahead of time. In one binary you get: React reconciling into a terminal through Ink, a raw-mode stdin reader, an ANSI/emoji-saturated renderer that runs regexes on every frame, a streaming SSE HTTP client, zod schemas built at startup, an OAuth flow, <code>worker_threads</code>, <code>MessageChannel</code> used as a macrotask scheduler, WeakMaps holding fiber state, dynamic <code>require</code>, and a filesystem layer that writes to stdout by file descriptor.
      </p>
      <p>
        Each of those is a different subsystem of Perry, and the app exercises them <em>together</em>, at scale, under GC pressure, for minutes at a time. Our own test suites — 3,000 Rust unit tests, thousands of TypeScript regression programs, the Node API parity matrix, test262 — are all oriented at pinning known behavior. This bundle is oriented at finding behavior nobody has thought to pin.
      </p>

      <h2>The wall chain</h2>
      <p>
        The work went in one direction only: clear the current wall, find the next one. Compressed:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Milestone</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jun 21</td><td className="py-2 px-3"><code>--help</code> runs natively, exit code 0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jun 22</td><td className="py-2 px-3">Real subcommands stop hanging at startup</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jun 23</td><td className="py-2 px-3"><code>-p</code> opens an ESTABLISHED TCP socket to api.anthropic.com</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jun 24</td><td className="py-2 px-3">zod schemas construct correctly; auth path reached</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jun 27</td><td className="py-2 px-3">The TUI renders — logo, welcome box, input frame</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jul 9</td><td className="py-2 px-3">First full round-trip: <code>-p</code> against the real API prints the reply, exit 0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jul 10</td><td className="py-2 px-3">Node-vs-Perry differential harness: 12/12 identical</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jul 13</td><td className="py-2 px-3">Byte-identical to Node on <code>-p</code> text + JSON, TUI render, filesystem</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Jul 16</td><td className="py-2 px-3">Typed characters finally appear in the input line</td></tr>
            <tr><td className="py-2 px-3">Jul 17</td><td className="py-2 px-3">Full loop validated by hand: launch → <code>/login</code> → API response → typing</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Every fix went upstream as a standalone pull request with a minimal, generic reproduction. None of them mention the app they came from — that was a rule from day one. A Perry user who reads the changelog sees &ldquo;<code>continue</code> in for-await drivers skipped the iterator advance,&rdquo; not &ldquo;we were trying to compile someone&apos;s CLI.&rdquo; The bugs are real independent of the vehicle that surfaced them.
      </p>

      <h2>Five bugs worth the trip</h2>

      <h3>1. MessageChannel was a polite no-op</h3>
      <p>
        <code>--help</code> worked on June 21. Every <em>real</em> subcommand — <code>doctor</code>, <code>agents</code>, <code>mcp list</code> — hung forever. Not busy: <code>sample</code> showed the process parked, <code>lsof</code> showed no child processes, no sockets, just two pipes.
      </p>
      <p>
        Perry&apos;s <code>MessageChannel</code> installed <code>postMessage</code> as a no-op and <code>onmessage</code> as <code>null</code>. That&apos;s harmless right up until you meet the React-scheduler pattern, which uses a message channel as its macrotask scheduler:
      </p>
      <pre><code>{`const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick`}</code></pre>
      <p>
        The message was dropped, the callback never ran, and the event loop idled on its own wakeup pipe forever. <a href="https://github.com/PerryTS/perry/pull/5530" className="text-amber-400 hover:text-amber-300">#5530</a> gave ports real same-thread delivery — entangled pairs, a FIFO queue, delivery through the <code>setImmediate</code> macrotask, and a GC root scanner so queued messages survive a collection.
      </p>

      <h3>2. One accessor on Object.prototype cost 42 seconds</h3>
      <p>
        Before the hang, the same subcommands were CPU-bound for tens of seconds. Profiling pointed at the generic <code>[[Set]]</code> path, and the root cause was a process-global flag.
      </p>
      <p>
        Perry has a fast path for dynamic property writes, gated on &ldquo;does <code>Object.prototype</code> currently carry any descriptors?&rdquo; The bundle installs exactly one accessor on <code>Object.prototype</code> at startup. That flipped the flag process-wide, and from then on <em>every</em> dynamic write in the program took the slow interception walk, which is O(own-key-count). Building a wide object became quadratic:
      </p>
      <pre><code>{`20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms`}</code></pre>
      <p>
        <a href="https://github.com/PerryTS/perry/pull/5524" className="text-amber-400 hover:text-amber-300">#5524</a> replaced the global flag with a per-key question — <em>does <code>Object.prototype</code> have an own property for <strong>this</strong> key?</em> An absent key can&apos;t be intercepted, so the write is safe to fast-path. 42 s → 23 ms, with interception still correct.
      </p>
      <p>
        Then the same shape reappeared for class instances, which the fast path excluded outright: a 20,000-key build on a plain object took 25 ms, on a <code>class</code> instance 44 seconds. Fixing that one carefully mattered — a naive prototype-chain check would have skipped inherited setters and silently corrupted data — so <a href="https://github.com/PerryTS/perry/pull/5528" className="text-amber-400 hover:text-amber-300">#5528</a> resolves the instance&apos;s prototype through the class registry and adds an O(1) wide-key index. Back to 30 ms, and linear again.
      </p>

      <h3>3. The bug that only the real API could trigger</h3>
      <p>
        This is the one we tell people about. By early July the compiled binary would do a complete <code>-p</code> turn against our local mock server: connect, POST, read the SSE stream, print the reply, exit 0. Against the actual Anthropic API it hung forever, every time.
      </p>
      <p>
        The debugging chain was: a forward-proxy mock proved the full 200 response arrived intact → a replay mock, fed the captured real byte stream, reproduced the hang locally → bisecting the SSE event list found the culprit event → a ten-line reproduction.
      </p>
      <p>
        The real API sends <code>event: ping</code> frames. Our mock never did. And <code>ping</code> is the one event the SDK&apos;s stream loop skips with a bare <code>continue</code>. Perry lowered <code>for await</code> into a driver whose iterator advance sat at the <em>bottom</em> of the loop body:
      </p>
      <pre><code>{`// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}`}</code></pre>
      <p>
        Six separate lowering sites had the same shape. <a href="https://github.com/PerryTS/perry/pull/6196" className="text-amber-400 hover:text-amber-300">#6196</a> moved the advance to the top in all of them. The lesson we keep re-learning: a mock that passes is evidence about the mock.
      </p>

      <h3>4. A regex that outlived its own pattern string</h3>
      <p>
        The TUI would render, then die of <code>SIGBUS</code> within seconds — 12 crashes in 12 runs under a window-resize stress harness, at different addresses in different functions each time. Weeks of the investigation went into GC theories that A/B testing then refuted, including one of our own &ldquo;fixes&rdquo; that turned out to be unsound and had to be withdrawn.
      </p>
      <p>
        The actual root cause was four lines of Rust. <code>js_regexp_new</code> allocates a RegExp header and stores its <code>pattern</code> and <code>flags</code> string pointers with raw writes — <strong>no write barrier</strong>. An old-generation object pointing at a fresh young string, with the collector never told about the edge. The minor GC swept those strings out from under a live RegExp, and the next read of the freed slot faulted.
      </p>
      <p>
        Why did this only show up here? Because a terminal UI is regex-saturated — ANSI parsing and emoji width measurement run patterns on every single frame — so the window between allocation and collection gets crossed thousands of times a minute. Our minimal reproduction, 6,000 regexes plus deliberate allocation churn, <em>never</em> triggered it. The bundle triggered it every time. <a href="https://github.com/PerryTS/perry/pull/6288" className="text-amber-400 hover:text-amber-300">#6288</a> added the barrier both fields had always needed.
      </p>

      <h3>5. The characters you typed were there. The frame threw them away.</h3>
      <p>
        The most stubborn wall: the entire UI painted perfectly — welcome box, input frame, cursor block, status line. Typing <code>/</code> opened the command menu, so the keystroke was reaching React. But the letters never appeared on the input line.
      </p>
      <p>
        Instrumented builds showed Perry painting the typed character correctly at every stage, and then <code>onRender</code> throwing <em>after</em> the paint — into an Ink <code>try/catch</code> that swallowed it. The frame was abandoned before commit, so every subsequent render built on an empty frame. The app looked completely healthy while ignoring you.
      </p>
      <p>
        Two independent bugs were hiding behind that one symptom:
      </p>
      <ul>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6453" className="text-amber-400 hover:text-amber-300">#6453</a> — Perry&apos;s inline lowering of <code>charAt</code>/<code>codePointAt</code>/<code>split</code> called ToString on a non-string receiver without the required coercibility guard. So <code>undefined.codePointAt(0)</code> quietly returned <code>117</code> — the code point of <code>&quot;u&quot;</code>, from the string <code>&quot;undefined&quot;</code> — instead of throwing. A bug that <em>invents</em> plausible data is far worse than one that crashes.
          </p>
        </li>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6471" className="text-amber-400 hover:text-amber-300">#6471</a> — the real blocker. When an array grows, Perry leaves a permanent forwarding stub at the old address. The minor sweep was reclaiming those stubs while an old-generation parent still pointed at one: the renderer&apos;s character cache held a pre-growth pointer on a page that wasn&apos;t dirty. Reading through the stale stub produced a garbage length, and every frame aborted. Minors now retain all stubs; full traces reclaim them by mark.
          </p>
        </li>
      </ul>
      <p>
        Fixing those exposed a third layer — objects born black during incremental marking were never traced, so anything reachable only through them got swept while live (<a href="https://github.com/PerryTS/perry/pull/6494" className="text-amber-400 hover:text-amber-300">#6494</a>), and the layout mask under-reported overflow slots so the collector skipped them (<a href="https://github.com/PerryTS/perry/pull/6506" className="text-amber-400 hover:text-amber-300">#6506</a>). Those two are the kind of soundness holes that produce a one-in-fifty mystery crash in <em>any</em> compiled program. We would not have found them with a test suite.
      </p>

      <h2>How you debug a 13 MB minified binary</h2>
      <p>
        None of the above is findable by reading code. The tooling that made it tractable:
      </p>
      <ul>
        <li>
          <p>
            <strong>A differential harness with Node as oracle.</strong> Every hypothesis becomes a small TypeScript program run under both <code>node --experimental-strip-types</code> and a Perry binary, compared byte-for-byte. It found bugs on its own — a class expression used only as an <code>instanceof</code> right-hand side was dead-code-eliminated because eleven analysis passes couldn&apos;t see through that node type (<a href="https://github.com/PerryTS/perry/pull/6245" className="text-amber-400 hover:text-amber-300">#6245</a>).
          </p>
        </li>
        <li>
          <p>
            <strong>Three mock API servers.</strong> A logging mock, a forward proxy that captures real response bytes, and a replay server that feeds those exact bytes back deterministically. The replay server is what turned &ldquo;hangs against production&rdquo; into a local reproduction.
          </p>
        </li>
        <li>
          <p>
            <strong>A PTY harness that answers terminal queries.</strong> A dumb pseudo-terminal gets you 50 bytes and a stall. The app probes for cursor position (<code>ESC[6n</code>), device attributes (<code>ESC[c</code>) and background color (<code>OSC 11</code>) and waits for replies before painting. Answer them and you get the full 3,331-byte welcome screen — and a byte-comparable render between Node and Perry.
          </p>
        </li>
        <li>
          <p>
            <strong>Link maps for symbolication.</strong> Stripped 180 MB binaries produce crash reports full of raw offsets; <code>ld64 -map</code> output plus a bisect script turns those back into function names.
          </p>
        </li>
        <li>
          <p>
            <strong>A/B everything.</strong> The rule that emerged, written at the top of the handoff notes in capitals: <em>never inherit a theory — test it.</em> Four consecutive root-cause hypotheses for one bug were each refuted by A/B runs. One verifier signal we chased for days (&ldquo;445 missing old→young edges&rdquo;) turned out to be a measurement artifact — the check ran between clearing and restoring the remembered set. The code&apos;s own comment warned about it.
          </p>
        </li>
      </ul>

      <h2>Where it actually stands</h2>
      <p>
        Honestly: it works, and it is slow.
      </p>
      <p>
        Working today, byte-identical to Node where output is comparable: startup, <code>--help</code>, <code>--version</code>, one-shot <code>-p</code> mode against the real API including error classification and the JSON envelope, the full TUI render, the OAuth <code>/login</code> flow, streaming responses, and typing. Here is the whole loop in one take — launch, <code>/login</code>, a question, a streamed answer, exit:
      </p>

      <figure className="my-8">
        <video
          controls
          playsInline
          preload="none"
          poster="/blog/compiling-claude-code/claude-code-demo-poster.png"
          className="w-full rounded-lg border border-slate-800"
        >
          <source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4" />
          Your browser doesn&apos;t support embedded video.
        </video>
        <figcaption className="text-sm text-slate-400 mt-3">
          63 seconds, no audio, cut in two places: the browser half of the OAuth handshake and a stray macOS keychain prompt. Everything in the terminal is real time and unedited — including the startup delay, which is the slowest thing in this post.
        </figcaption>
      </figure>

      <p>
        Two things are still open, and they may well be one thing. Input stops registering after roughly a minute of sustained interactive use — no crash, no error, it just stops. And <code>ESC</code> does not interrupt an in-flight response, though <code>Ctrl-C</code> does now quit cleanly, which it did not do a week ago (that&apos;s the exit you see at the end of the recording). A quit path that works while an interrupt path doesn&apos;t points at the same suspect as the input death: keypress events that stop reaching the app, rather than anything wrong with the app&apos;s own handlers.
      </p>
      <p>
        The performance picture, measured against Node running the identical bundle, before and after the first round of the speed campaign that started the day correctness landed:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Metric</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Perry (Jul 17)</th>
              <th className="text-right py-2 px-3">Perry (after)</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--version</code></td><td className="text-right py-2 px-3">328 ms</td><td className="text-right py-2 px-3">1,168 ms</td><td className="text-right py-2 px-3"><strong>227 ms</strong></td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--help</code></td><td className="text-right py-2 px-3">715 ms</td><td className="text-right py-2 px-3">5,071 ms</td><td className="text-right py-2 px-3">4,099 ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">TUI first paint</td><td className="text-right py-2 px-3">0.76 s</td><td className="text-right py-2 px-3">10.9 s</td><td className="text-right py-2 px-3">8.4 s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Keystroke → paint (p50)</td><td className="text-right py-2 px-3">2.2 ms</td><td className="text-right py-2 px-3">111–143 ms</td><td className="text-right py-2 px-3">119–138 ms</td></tr>
            <tr><td className="py-2 px-3">Memory footprint, idle</td><td className="text-right py-2 px-3">290 MB flat</td><td className="text-right py-2 px-3">~420 MB climbing</td><td className="text-right py-2 px-3">~420 MB climbing</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>--version</code> now <strong>beats Node</strong>, and the win was embarrassing in origin: the compiled executable was exporting 300,281 symbols, so ~80% of that launch was dyld doing weak-definition coalescing. One linker flag took exports to 3 and the binary from 228 MB to 197 MB (<a href="https://github.com/PerryTS/perry/pull/6533" className="text-amber-400 hover:text-amber-300">#6533</a>). Building each unique regex once instead of twice (<a href="https://github.com/PerryTS/perry/pull/6534" className="text-amber-400 hover:text-amber-300">#6534</a>) and caching the per-store interception check (<a href="https://github.com/PerryTS/perry/pull/6532" className="text-amber-400 hover:text-amber-300">#6532</a>, <a href="https://github.com/PerryTS/perry/pull/6541" className="text-amber-400 hover:text-amber-300">#6541</a>) took the rest.
      </p>
      <p>
        On that 197 MB, before anyone leads with it: Perry statically links its own runtime and emits machine code for all 16,023 functions ahead of time with nothing to dead-strip — a self-executing bundle makes essentially everything reachable, so there is no cross-bundle DCE to lean on — which means 197 MB is an entire program <em>plus</em> its runtime in one file, against the <strong>138 MB the Node v26 binary weighs before it has read a single line of your JavaScript</strong>.
      </p>
      <p>
        The keystroke row is the one to read carefully, because the &ldquo;after&rdquo; number looks worse. It isn&apos;t: those are ranges across repeated runs and they overlap, so the median did not move in either direction — that is run-to-run variance, not a regression. It is also exactly what we expected. All three changes touch the link step, regex construction, and the <em>store</em> path; the keystroke median is dominated by the property <em>read</em> path, per-call rooting overhead, and GC steps of 40–80 ms landing inside keypress windows. The proof came in the next round: get/set fast lanes made a field-access microbenchmark 3× faster and moved this number by nothing at all (<a href="https://github.com/PerryTS/perry/pull/6539" className="text-amber-400 hover:text-amber-300">#6539</a>). A microbenchmark win that doesn&apos;t show up in the app is a wrong diagnosis, and we had one.
      </p>
      <p>
        The memory line is the current campaign. Perry&apos;s copying collector <em>can</em> compact — the problem is that it becomes eligible roughly once per 45 seconds of idle, so the nursery regrows to ~300 MB between firings while Node stays flat by compacting continuously. That is a trigger-frequency problem, not an algorithm problem, which is a much better place to be than where we were in June.
      </p>
      <p>
        None of which is parked. The memory and performance campaign is <em>live</em> as this post goes up — the GC trigger work is running today, on this exact binary — so the performance table above is the part of this post we most expect to invalidate, and the sooner the better. Correctness took a month of walls to get through. What is left is a trigger-frequency problem and a read-path problem, both understood, both already in flight. We expect this thing to feel smooth rather than merely be correct, and we expect it soon.
      </p>

      <h2>Why we do this</h2>
      <p>
        None of the 160 fixes are about Claude Code. A missing write barrier on RegExp headers corrupts memory in <em>any</em> program that builds regexes under load. <code>for await</code> with a <code>continue</code> spins in any stream consumer. <code>MessageChannel</code> dropping messages breaks every React-scheduler-shaped app. The <code>Object.prototype</code> descriptor flag made <em>every</em> program that touches <code>Object.prototype</code> quadratic in its widest object.
      </p>
      <p>
        Those bugs were all sitting in Perry while CI was green, while test262 numbers climbed, while the Node parity matrix said 97%. It took thirteen megabytes of somebody else&apos;s minified JavaScript, doing real work against a real API in a real terminal, to shake them loose.
      </p>
      <p>
        We&apos;ll keep doing it. The next targets are already queued.
      </p>

      <hr className="border-slate-800 my-8" />
      <p className="text-sm text-slate-500">
        Perry is not affiliated with or endorsed by Anthropic. Claude Code is a trademark of Anthropic PBC. The binary described here was built from the publicly published npm package purely as a compiler test target, and is not distributed.
      </p>
    </>
  );
}
