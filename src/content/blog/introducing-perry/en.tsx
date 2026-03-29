import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        We&apos;re excited to introduce Perry — a native TypeScript compiler written in Rust
        that compiles your TypeScript directly to standalone executables. No Node.js runtime,
        no Electron wrapper, no compromises. Just your code, compiled to a native binary that
        starts instantly and runs anywhere.
      </p>
      <p>
        Perry represents a fundamental rethinking of what TypeScript can be. Instead of
        treating it as a superset of JavaScript that must run through a JS engine, Perry
        treats TypeScript as a systems language — one that happens to have a syntax millions
        of developers already know and love.
      </p>

      <h2>Why We Built Perry</h2>
      <p>
        TypeScript has become the lingua franca of modern software development. It&apos;s the
        language behind most web frontends, a growing share of backends, and increasingly the
        choice for tooling, scripting, and automation. But it has always carried a fundamental
        limitation: it compiles to JavaScript, and JavaScript requires a runtime.
      </p>
      <p>
        That runtime — whether it&apos;s Node.js, Deno, or Bun — comes with trade-offs.
        Cold start times measured in tens or hundreds of milliseconds. Memory overhead from the
        JIT compiler and garbage collector. Binary distributions that either bundle the entire
        runtime or require the user to install one. And for GUI applications, the only option
        has been Electron, which ships an entire Chromium browser with your app.
      </p>
      <p>
        We asked: what if TypeScript didn&apos;t have to go through JavaScript at all? What if
        you could compile it directly to native machine code, the same way you compile Rust,
        Go, or C++?
      </p>

      <h2>How Perry Works</h2>
      <p>
        Perry&apos;s compilation pipeline has three stages:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Parsing</strong> — Perry uses SWC (the Rust-based TypeScript/JavaScript parser)
          to parse your TypeScript source into an AST. SWC is the same parser used by Next.js,
          and it&apos;s extremely fast.
        </li>
        <li>
          <strong>Type-directed compilation</strong> — Perry walks the AST with full type
          information. Unlike a JS engine that must handle dynamic types at runtime, Perry knows
          every type at compile time. This enables monomorphization of generics, static dispatch
          of method calls, and direct memory layout optimization.
        </li>
        <li>
          <strong>Code generation</strong> — Perry generates native machine code using Cranelift,
          the same code generator used by Wasmtime and parts of the Firefox JIT. Cranelift
          produces efficient native code for x86_64 and ARM64.
        </li>
      </ol>
      <p>
        The result is a standalone executable — typically 2–5 MB for a CLI tool — that starts
        instantly with zero warm-up time.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>What TypeScript Features Are Supported</h2>
      <p>
        Perry supports a broad and growing subset of TypeScript. The goal is full compatibility
        with the language as developers actually use it. Today, that includes:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>All primitive types</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interfaces and type aliases</strong> — including union types, intersection types, and mapped types</li>
        <li><strong>Generics</strong> — compiled via monomorphization, so <code className="text-perry-400">Array&lt;number&gt;</code> and <code className="text-perry-400">Array&lt;string&gt;</code> generate distinct optimized code paths</li>
        <li><strong>Classes</strong> — with inheritance, private fields (<code className="text-perry-400">#field</code>), static members, getters/setters, and decorators</li>
        <li><strong>Async/await and Promises</strong> — compiled to a state machine, similar to how Rust handles async</li>
        <li><strong>Generators and iterators</strong> — <code className="text-perry-400">function*</code> and <code className="text-perry-400">for...of</code> loops</li>
        <li><strong>Closures</strong> — with proper capture semantics</li>
        <li><strong>Destructuring</strong> — arrays, objects, nested patterns, and rest elements</li>
        <li><strong>Template literals</strong> — including tagged templates</li>
        <li><strong>Modules</strong> — ESM imports/exports resolved at compile time</li>
      </ul>

      <h2>Cross-Platform Native UI</h2>
      <p>
        Perry isn&apos;t limited to CLI tools and server-side applications. It ships with native
        UI frameworks for six platforms:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField, and more)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (same API as iOS, with iPad-specific adaptations)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, common controls, GDI)</li>
      </ul>
      <p>
        The key insight is that Perry maps a common TypeScript API to each platform&apos;s
        native widget toolkit at compile time. There&apos;s no bridge layer, no web view, and
        no custom rendering engine. Your app uses real platform widgets, rendered by the OS
        itself. Read more in our deep dive:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          Cross-Platform Native UI from TypeScript
        </Link>.
      </p>

      <h2>27+ Native npm Package Implementations</h2>
      <p>
        One of the biggest practical challenges of a new compiler is ecosystem compatibility.
        Developers don&apos;t just write code from scratch — they use packages. Perry addresses
        this with native implementations of 27+ popular npm packages:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Databases</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Security</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Utilities</strong> — uuid, chalk, dotenv, lodash (partial), moment</li>
        <li><strong>System</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        These aren&apos;t thin wrappers around Node.js modules. They&apos;re compiled directly
        into your binary using native system libraries — libpq for PostgreSQL, OpenSSL for
        crypto, libcurl for HTTP. The API surface matches what you&apos;d expect from the npm
        package, so migration is straightforward.
      </p>

      <h2>Optional V8 Compatibility Layer</h2>
      <p>
        For npm packages that don&apos;t have native Perry implementations yet, Perry offers an
        optional V8 embedding mode. When enabled, Perry bundles a V8 runtime and can execute
        standard JavaScript npm packages alongside your compiled TypeScript. This is a pragmatic
        escape hatch that lets you adopt Perry incrementally — compile the hot paths to native
        code while still accessing the full npm ecosystem for everything else.
      </p>

      <h2>Cross-Compilation</h2>
      <p>
        Perry supports cross-compilation out of the box. From your macOS development machine,
        you can compile for Linux (x86_64 and ARM64) and iOS. This means you can build your
        CI/CD pipeline on macOS and produce binaries for all your deployment targets without
        needing dedicated build machines for each platform.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Performance</h2>
      <p>
        Perry-compiled binaries are fast. Because there&apos;s no JIT warm-up, no interpreter
        overhead, and no garbage collector pauses, performance is predictable and consistent
        from the first invocation.
      </p>
      <p>
        In our benchmarks:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Startup time</strong> — effectively 0 ms (native process launch)</li>
        <li><strong>Binary size</strong> — 2–5 MB for typical CLI tools (vs 50+ MB for bundled Node.js)</li>
        <li><strong>Memory usage</strong> — 5–10x lower than equivalent Node.js applications</li>
        <li><strong>Throughput</strong> — competitive with hand-written C for compute-bound workloads</li>
      </ul>
      <p>
        You can see live benchmarks at{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, which compares Perry-compiled executables against Node.js and Bun in real time.
      </p>

      <h2>Current Status</h2>
      <p>
        Perry is in active development. The compiler is stable with 62 out of 62 tests
        passing across the test suite. All six platform UI backends are functional. The core
        language features are solid and expanding.
      </p>
      <p>
        We&apos;re actively working on expanding the UI widget library, improving string and
        object performance, completing full regex support, and building the Stream module. Longer
        term, we&apos;re planning WASM compilation targets, multi-threading, a VS Code extension,
        and package manager integration.
      </p>
      <p>
        Check out the full <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> for
        details on what&apos;s shipped, what&apos;s in progress, and what&apos;s coming next.
      </p>

      <h2>Get Started</h2>
      <p>
        Perry is open source. You can clone the repo, build from source, and start compiling
        TypeScript today:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Browse the source on{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , check out the{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">showcase</Link>
        {" "}to see what&apos;s being built with Perry, or jump straight into the code.
        We can&apos;t wait to see what you build.
      </p>
    </>
  );
}
