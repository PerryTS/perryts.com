export default function Content() {
  return (
    <>
      <p>
        You install VS Code. It&apos;s fast. You add 15 extensions. Now it takes 4 seconds
        to start and the Extension Host eats 800 MB of RAM. What happened?
      </p>
      <p>
        The pattern repeats everywhere: WordPress, Eclipse, Chrome, Figma, Slack. The app
        ships fast. Plugins make it slow. Nobody is surprised anymore — we&apos;ve accepted
        it as the cost of extensibility.
      </p>
      <p>
        But plugin systems are not just a performance problem. They&apos;re a design
        philosophy problem. The industry has confused &quot;extensibility&quot; with
        &quot;runtime dynamism&quot; when often the better answer is compile-time
        composition. The only performant plugins are the ones that stop being plugins at
        compile time.
      </p>

      <h2>The Performance Spectrum of Extensibility</h2>
      <p>
        Not all extensibility costs the same. There&apos;s a spectrum from zero-cost to
        maximum-cost, and most of the industry has settled at the expensive end:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Static linking / compile-time modules</strong> — zero overhead. C
          libraries, Rust crates, Go packages. The module boundary disappears entirely
          in the final binary.
        </li>
        <li>
          <strong>Shared libraries loaded at startup</strong> — near-zero. nginx modules,
          Linux kernel modules. One-time cost at load, then direct function calls.
        </li>
        <li>
          <strong>Dynamic dispatch via interfaces / vtables</strong> — small overhead.
          Game engine plugins in C++. One pointer indirection per call.
        </li>
        <li>
          <strong>Same-process interpreted plugins</strong> — moderate. WordPress PHP
          plugins, Eclipse OSGi bundles. Every plugin invocation goes through an
          interpreter.
        </li>
        <li>
          <strong>Separate-process plugins over IPC</strong> — significant. VS Code
          extensions, Chrome extensions. Every interaction crosses a process boundary
          and serializes data.
        </li>
        <li>
          <strong>Sandboxed plugins over serialized IPC</strong> — heavy. Figma plugins,
          browser extension content scripts. Serialization, deserialization, and sandbox
          enforcement on every call.
        </li>
      </ol>
      <p>
        The key insight: the only performant plugins are the ones that stop being
        plugins at compile time. Levels 1 and 2 are fast precisely because the
        &quot;plugin&quot; becomes indistinguishable from the host code in the final
        artifact.
      </p>

      <h2>The Real-World Damage</h2>

      <h3>WordPress</h3>
      <p>
        Every plugin hooks into the request lifecycle. 30 plugins means 30 layers of
        function calls per page load. The result: caching plugins exist solely to
        mitigate the damage of other plugins. Performance plugins to fix the performance
        problem that plugins created. The meta-irony writes itself.
      </p>

      <h3>VS Code</h3>
      <p>
        Extensions share a single Node.js event loop in a separate process. One
        misbehaving extension blocks all others. The Extension Host regularly shows up
        as the top CPU consumer on developer machines. Microsoft has built profiling
        tools, bisect commands, and activation event systems — an entire infrastructure
        to manage the problem that extensions create.
      </p>

      <h3>Eclipse</h3>
      <p>
        The cautionary tale. OSGi bundle resolution, class loading overhead, massive
        dependency graphs. Once the most popular IDE, now largely abandoned by mainstream
        developers. The plugin architecture that was supposed to be its greatest strength
        became its defining weakness.
      </p>

      <h3>Electron Itself</h3>
      <p>
        The plugin problem at the platform level. Every Electron app ships a full
        Chromium + Node.js runtime. VS Code is Electron. Slack is Electron. Discord is
        Electron. Each one independently consuming 300&ndash;500 MB of RAM to render what
        is essentially a chat window or a text editor. The &quot;plugin&quot; here is the
        entire web platform, bundled fresh for every application.
      </p>

      <h2>Why the Industry Keeps Choosing Plugins Anyway</h2>
      <p>
        If plugins are so expensive, why does everyone keep building them? The reasons
        are mostly organizational, not technical:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Developer experience</strong> — plugins are easy to write when you
          don&apos;t care about performance. Ship a JS file, hook into some events, done.
        </li>
        <li>
          <strong>Ecosystem growth</strong> — plugins create network effects and community
          engagement. A marketplace of 30,000 extensions is a powerful moat.
        </li>
        <li>
          <strong>Organizational convenience</strong> — plugins let teams defer design
          decisions. &quot;Someone will write a plugin for that&quot; is the architecture
          equivalent of &quot;we&apos;ll fix it in post.&quot;
        </li>
        <li>
          <strong>Business model</strong> — plugin marketplaces create revenue and lock-in.
          The platform captures value from the ecosystem.
        </li>
      </ul>
      <p>
        The uncomfortable truth: plugins are often a way to avoid making hard
        architectural decisions about what belongs in the core. They let you ship
        something incomplete and call it &quot;extensible.&quot;
      </p>

      <h2>The Alternative: Compile-Time Composition</h2>
      <p>
        What if extensibility happened at build time instead of runtime?
      </p>
      <p>
        This isn&apos;t a hypothetical. There are well-proven precedents across systems
        languages:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Rust proc macros</strong> — arbitrary code that runs at compile time and
          generates zero-overhead native code. Serde serialization, Tokio async runtime
          setup, Axum routing — all resolved before your program starts.
        </li>
        <li>
          <strong>Zig comptime</strong> — compile-time execution that eliminates all
          runtime branching. Generic data structures are monomorphized, configuration
          is resolved, dead code is eliminated. What remains is exactly what runs.
        </li>
        <li>
          <strong>C++ templates / constexpr</strong> — compile-time polymorphism with
          zero runtime cost. The STL achieves extraordinary performance because every
          generic algorithm specializes at compile time.
        </li>
        <li>
          <strong>Tree-shaking in bundlers</strong> — a partial, imperfect version of
          this idea applied to JavaScript. Webpack and Rollup eliminate unused exports
          at build time. The limitation is that they can only remove code, not
          specialize it.
        </li>
      </ul>
      <p>
        The pattern is consistent: move decisions from runtime to build time. What you
        don&apos;t include doesn&apos;t cost anything. What you do include compiles to
        native code with no indirection. The module boundary becomes a source-level
        organization tool, not a runtime performance boundary.
      </p>

      <h2>What This Means for TypeScript</h2>
      <p>
        TypeScript is the most popular language for building extensible tools — and the
        worst at runtime performance. The entire TypeScript ecosystem runs on Node.js,
        which runs on V8, which JIT-compiles JavaScript. Every layer adds overhead: JIT
        warmup time, garbage collection pauses, dynamic dispatch for every property
        access, IPC boundaries between processes.
      </p>
      <p>
        This is where Perry comes in. Perry compiles TypeScript directly to native
        binaries. No V8, no JIT warmup, no garbage collection pauses, no IPC
        boundaries.
      </p>
      <p>
        When your modules compile to native code, &quot;plugins&quot; become
        just... modules. They compose at build time. The final binary has zero plugin
        overhead because there are no plugins — just native code. An Express route
        handler, a middleware function, a utility library — they all compile down to
        direct function calls in the same binary. No dynamic loading, no
        serialization, no process boundaries.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Your app, your dependencies, your &quot;plugins&quot; — one binary</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <p>
        This isn&apos;t theoretical. Perry already compiles real-world TypeScript
        frameworks — Hono, tRPC, Strapi — into native ARM64 binaries under 2 MB,
        in under a second. The modules that make up those frameworks get compiled,
        linked, and inlined into a single executable. What would be a plugin
        architecture with runtime overhead in Node.js becomes zero-cost composition
        in a Perry binary.
      </p>

      <h2>The Extensibility You Actually Need</h2>
      <p>
        The objection is obvious: &quot;But I need runtime extensibility. Users need to
        install plugins without recompiling.&quot;
      </p>
      <p>
        Do they? For most applications, the set of extensions is known at build time.
        You choose your Express middleware, your database driver, your auth library, your
        logging framework — and then you deploy. The &quot;extensibility&quot; is in your{" "}
        <code className="text-perry-400">package.json</code>, resolved at{" "}
        <code className="text-perry-400">npm install</code>, not at runtime.
      </p>
      <p>
        The applications that genuinely need runtime plugin loading — VS Code, WordPress,
        browsers — are the exception, not the rule. And even those pay a steep price for
        it. For everything else, compile-time composition gives you the same flexibility
        with none of the overhead.
      </p>
      <p>
        The difference is architectural honesty. Instead of pretending every application
        needs a plugin system, you ask: does this extensibility need to happen at runtime,
        or can the compiler do the work?
      </p>

      <h2>The Path Forward</h2>
      <p>
        The industry&apos;s addiction to plugin architectures is a symptom of accepting
        runtime overhead as inevitable. It isn&apos;t. The compiler can do the work.
        Build-time composition gives you extensibility without the tax.
      </p>
      <p>
        We&apos;re building Perry because we believe TypeScript developers deserve native
        performance without giving up the language they love. Your modules should compose
        at build time, compile to direct function calls, and run without the overhead of
        a runtime that exists only to make &quot;extensibility&quot; possible.
      </p>
      <p>
        The fastest plugin system is the one that doesn&apos;t exist at runtime.
      </p>
    </>
  );
}
