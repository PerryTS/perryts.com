export default function Content() {
  return (
    <>
      <p>
        Perry now compiles three major TypeScript frameworks — Hono, tRPC, and Strapi — into
        native ARM64 executables. They compile in under a second, produce binaries under 2 MB,
        and run without crashes.
      </p>
      <p>
        This post covers what works, what doesn&apos;t yet, and what we learned pushing the
        compiler against real-world code.
      </p>

      <h2>The Projects</h2>
      <p>
        We picked these three because they represent different shapes of TypeScript:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — A lightweight web framework (29 modules). Heavy use of generics,
          class inheritance, dynamic method assignment, and the <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>{" "}
          Web APIs. Its export structure uses named re-exports through barrel files.
        </li>
        <li>
          <strong>tRPC</strong> — A type-safe RPC framework (52 modules). Deep re-export chains
          across 4+ levels, builder pattern with generic type narrowing, class instantiation at
          module scope, and streaming via Web Streams.
        </li>
        <li>
          <strong>Strapi</strong> — A headless CMS core (4 modules compiled natively, rest resolved
          as external). Monorepo with workspace package resolution, namespace re-exports
          (<code className="text-perry-400">export * as X</code>), service container pattern with{" "}
          <code className="text-perry-400">Map</code>, and factory functions.
        </li>
      </ul>

      <h2>Compilation Results</h2>
      <p>
        All three compile to native binaries with zero compilation errors:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Project</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Modules Compiled</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Binary Size</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Compile Time</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Every source module goes through the full pipeline: SWC parse, HIR lowering, Cranelift
        codegen, object file emission, and native linking. The compile times include all of it —
        parsing through final link.
      </p>
      <p>
        For context, <code className="text-perry-400">tsc --noEmit</code> on tRPC alone takes several
        seconds. Perry compiles 52 modules to a linked native binary in under one.
      </p>

      <h2>What Works at Runtime</h2>

      <h3>Cross-Module Class Instantiation</h3>
      <p>
        This was the big milestone. Hono&apos;s export structure looks like this:
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">hono export chain</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>
        That <code className="text-perry-400">export {"{"} Hono {"}"}</code> is a named re-export — not{" "}
        <code className="text-perry-400">export * from</code> or{" "}
        <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code>. In Perry&apos;s
        HIR, this becomes <code className="text-perry-400">Export::Named</code>, not{" "}
        <code className="text-perry-400">Export::ReExport</code> or{" "}
        <code className="text-perry-400">Export::ExportAll</code>. Previously, the compiler&apos;s class
        propagation only followed <code className="text-perry-400">ExportAll</code> and{" "}
        <code className="text-perry-400">ReExport</code> chains, so importing{" "}
        <code className="text-perry-400">Hono</code> from <code className="text-perry-400">index.ts</code> silently
        failed — the class lookup missed, and <code className="text-perry-400">new Hono()</code> returned{" "}
        <code className="text-perry-400">undefined</code>.
      </p>
      <p>
        Now Perry traces <code className="text-perry-400">Export::Named</code> back through the module&apos;s
        imports to find the original class definition and propagates it. The result:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>
      <p>
        The Hono constructor runs, initializes a <code className="text-perry-400">SmartRouter</code>{" "}
        (which internally creates both a <code className="text-perry-400">RegExpRouter</code> and a{" "}
        <code className="text-perry-400">TrieRouter</code>), and returns a real object. Multiple independent
        instances work. Constructor options are accepted.
      </p>

      <h3>Multi-Level Re-Export Resolution</h3>
      <p>
        tRPC&apos;s <code className="text-perry-400">initTRPC</code> lives 4 levels deep:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>
        That&apos;s <code className="text-perry-400">ExportAll</code> →{" "}
        <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>. Perry
        resolves the full chain — <code className="text-perry-400">initTRPC</code> is accessible in the
        compiled binary. Same for <code className="text-perry-400">TRPCError</code>, which follows the same path.
      </p>

      <h3>Cross-Module Class Instantiation with Arguments</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">err</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCError</span>({"{"} code: <span className="text-green-400">&apos;NOT_FOUND&apos;</span>, message: <span className="text-green-400">&apos;resource missing&apos;</span> {"}"})</p>
          <p className="text-green-400">// PASS: new TRPCError() returned object</p>
          <p className="text-green-400">// PASS: err.code = NOT_FOUND</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">TRPCError</code> is defined in one module, re-exported through
        three intermediate barrel files, imported in the test, and instantiated with an options
        object. The instance&apos;s <code className="text-perry-400">code</code> field is accessible.
      </p>

      <h3>Package Resolution in Monorepos</h3>
      <p>
        Strapi uses workspace packages — <code className="text-perry-400">@strapi/core</code> is a sibling
        package in the monorepo, not an npm dependency. Perry resolves the bare specifier through{" "}
        <code className="text-perry-400">package.json</code> exports fields:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-green-400">&quot;exports&quot;</span>: {"{"}</p>
          <p>  <span className="text-green-400">&quot;.&quot;</span>: {"{"} <span className="text-green-400">&quot;source&quot;</span>: <span className="text-green-400">&quot;./src/index.ts&quot;</span>, <span className="text-green-400">&quot;import&quot;</span>: <span className="text-green-400">&quot;./dist/index.mjs&quot;</span> {"}"}</p>
          <p>{"}"}</p>
        </div>
      </div>
      <p>
        The <code className="text-perry-400">createStrapi</code> function resolves correctly as a callable
        function through <code className="text-perry-400">export * from &apos;@strapi/core&apos;</code>.
      </p>

      <h3>Type-Only Export Filtering</h3>
      <p>
        TypeScript&apos;s <code className="text-perry-400">export type {"{"} Foo {"}"}</code> syntax has no
        runtime meaning — but previously Perry lowered these into real{" "}
        <code className="text-perry-400">Export::ReExport</code> entries that propagated through the linker
        and generated stub symbols. Hono&apos;s <code className="text-perry-400">index.ts</code> alone has
        four <code className="text-perry-400">export type</code> declarations covering dozens of types.
      </p>
      <p>
        Perry now checks SWC&apos;s <code className="text-perry-400">type_only</code> flag on{" "}
        <code className="text-perry-400">ExportNamed</code> declarations and{" "}
        <code className="text-perry-400">is_type_only</code> on individual specifiers, skipping them during
        HIR lowering. This eliminated dead stub generation from type re-exports across all three
        projects.
      </p>

      <h3>RegExp Constructor</h3>
      <p>
        <code className="text-perry-400">new RegExp(pattern, flags)</code> now compiles to Perry&apos;s
        existing <code className="text-perry-400">js_regexp_new</code> runtime function. This was
        straightforward — the runtime already supported RegExp — but the{" "}
        <code className="text-perry-400">Expr::New</code> codegen handler had no case for it, so every{" "}
        <code className="text-perry-400">new RegExp(...)</code> fell through to an &quot;Unknown class&quot;
        warning. Hono&apos;s <code className="text-perry-400">RegExpRouter</code> uses this extensively.
      </p>

      <h2>What Doesn&apos;t Work Yet</h2>
      <p>
        We&apos;re being specific here because the gaps tell you as much as the wins.
      </p>

      <h3>Dynamic Property Assignment on <code className="text-perry-400">this</code></h3>
      <p>
        Hono&apos;s constructor sets up HTTP method handlers dynamically:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">allMethods</span> = [<span className="text-green-400">&apos;get&apos;</span>, <span className="text-green-400">&apos;post&apos;</span>, <span className="text-green-400">&apos;put&apos;</span>, <span className="text-green-400">&apos;delete&apos;</span>, ...]</p>
          <p><span className="text-cyan-400">allMethods</span>.<span className="text-yellow-400">forEach</span>((<span className="text-cyan-400">method</span>) =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">this</span>[<span className="text-cyan-400">method</span>] = (<span className="text-cyan-400">args1</span>, ...<span className="text-cyan-400">args</span>) =&gt; {"{"}</p>
          <p>    <span className="text-slate-500">// register route</span></p>
          <p>    <span className="text-purple-400">return this</span></p>
          <p>  {"}"}</p>
          <p>{"}"})</p>
        </div>
      </div>
      <p>
        This means <code className="text-perry-400">app.get</code>,{" "}
        <code className="text-perry-400">app.post</code>, etc. are not statically declared — they&apos;re
        assigned at runtime via computed property names. Perry doesn&apos;t support{" "}
        <code className="text-perry-400">this[variable] = value</code> yet, so these methods are missing:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">[4] Dynamic method assignment (this[method] = ...)</span></p>
          <p className="text-amber-400">  INFO: app.get not available</p>
          <p className="text-amber-400">  INFO: app.on not available</p>
        </div>
      </div>
      <p>
        This is the single biggest gap for Hono. The Hono class exists, its router is initialized,
        but you can&apos;t register routes.
      </p>

      <h3>Module-Level Constructor Calls</h3>
      <p>
        tRPC defines its entry point as:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">export const</span> <span className="text-cyan-400">initTRPC</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCBuilder</span>()</p>
        </div>
      </div>
      <p>
        At runtime, <code className="text-perry-400">initTRPC</code> shows up as{" "}
        <code className="text-perry-400">typeof function</code> rather than{" "}
        <code className="text-perry-400">typeof object</code> — the module-level{" "}
        <code className="text-perry-400">new TRPCBuilder()</code> expression isn&apos;t executing the
        constructor, so what you get is a reference to the class rather than an instance. This
        means <code className="text-perry-400">initTRPC.create()</code> and{" "}
        <code className="text-perry-400">initTRPC.context()</code> are both{" "}
        <code className="text-perry-400">undefined</code>.
      </p>

      <h3>Inherited Properties</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code>, and while{" "}
        <code className="text-perry-400">err.code</code> (defined directly on{" "}
        <code className="text-perry-400">TRPCError</code>) works,{" "}
        <code className="text-perry-400">err.message</code> (inherited from{" "}
        <code className="text-perry-400">Error</code>) is not accessible. The prototype chain for property
        lookup isn&apos;t fully implemented.
      </p>

      <h3>Complex Constructor Chains</h3>
      <p>
        Strapi&apos;s <code className="text-perry-400">createStrapi()</code> function internally calls{" "}
        <code className="text-perry-400">new Strapi(opts)</code>, which extends{" "}
        <code className="text-perry-400">Container</code> (backed by{" "}
        <code className="text-perry-400">Map</code>), calls{" "}
        <code className="text-perry-400">loadConfiguration()</code>, iterates over providers, and registers
        services. This deep constructor chain produces a falsy return value — it doesn&apos;t crash,
        but it doesn&apos;t produce a usable instance either.
      </p>

      <h3>Web API Built-In Classes</h3>
      <p>
        These are the remaining &quot;Unknown class&quot; warnings across the three projects:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Class</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Count</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Response", "11"],
              ["TransformStream", "7"],
              ["ReadableStream", "5"],
              ["Request", "4"],
              ["Headers", "3"],
              ["Proxy", "2"],
              ["TextEncoderStream", "2"],
              ["WritableStream", "1"],
              ["DOMException", "1"],
            ].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800">
                <td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td>
                <td className="py-2 px-4 text-slate-400">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>,
        and <code className="text-perry-400">Headers</code> are the critical ones for any HTTP framework.
        These need built-in codegen support similar to what we already have for{" "}
        <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>,{" "}
        <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>,{" "}
        <code className="text-perry-400">AbortController</code>, and others.
      </p>

      <h2>What This Tells Us</h2>
      <p>
        The good news: Perry&apos;s compilation pipeline handles real framework code. Multi-file
        projects with complex re-export chains, generics-heavy type signatures, class hierarchies,
        and monorepo package resolution all make it through to linked binaries.
      </p>
      <p>
        The gaps are runtime gaps, not compilation gaps. The remaining work is:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Dynamic property assignment</strong> — needed for frameworks that set up methods programmatically</li>
        <li><strong>Module-level init expressions</strong> — <code className="text-perry-400">export const x = new Foo()</code> needs to actually execute the constructor</li>
        <li><strong>Prototype chain</strong> — inherited properties and methods</li>
        <li><strong>Web API built-ins</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> for HTTP frameworks</li>
      </ol>
      <p>
        These are concrete, well-scoped problems. None of them require architectural changes —
        they&apos;re extensions of patterns that already work for simpler cases.
      </p>
      <p>
        We&apos;ll keep pushing on these. The goal is{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        producing a working HTTP server in a native binary.
      </p>
    </>
  );
}
