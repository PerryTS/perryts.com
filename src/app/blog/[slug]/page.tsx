import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogLayout } from "@/components/BlogLayout";
import { getBlogPost, getAllSlugs } from "@/lib/blog";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} - Perry Blog`,
    description: post.excerpt,
  };
}

/* ─────────────────────────────────────────────
   Post 1 — Introducing Perry
   ───────────────────────────────────────────── */

function IntroducingPerryContent() {
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
          <p><span className="text-slate-500">$</span> git clone https://github.com/skelpo/perry.git</p>
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
        <a href="https://github.com/skelpo/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
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

/* ─────────────────────────────────────────────
   Post 2 — Cross-Platform Native UI from TypeScript
   ───────────────────────────────────────────── */

function CrossPlatformUIContent() {
  return (
    <>
      <p>
        One of Perry&apos;s most ambitious goals is delivering truly native GUI applications
        from a single TypeScript codebase. Not web views wrapped in a native shell. Not a
        custom rendering engine drawing its own pixels. Real native widgets, rendered by each
        platform&apos;s own UI framework, compiled from TypeScript at build time.
      </p>
      <p>
        This post explains how it works — the architecture, the platform mapping, the trade-offs,
        and where we are today.
      </p>

      <h2>The Problem with Current Approaches</h2>
      <p>
        Cross-platform GUI development has been a hard problem for decades. Every major
        framework has made a different set of compromises:
      </p>

      <h3>Electron / Tauri (Web-based)</h3>
      <p>
        Electron bundles Chromium and Node.js, giving you a web browser as your app shell.
        You get full access to the web platform, but your &quot;native&quot; app is a 150+ MB
        download that uses hundreds of megabytes of RAM just to show a window. Tauri replaces
        Chromium with the OS web view, reducing size dramatically, but your UI is still HTML/CSS
        rendered in a web view — not native widgets.
      </p>

      <h3>React Native (Bridge-based)</h3>
      <p>
        React Native runs your JavaScript in a JS engine (Hermes or V8) and bridges to native
        widgets through a serialized message queue. You get real native widgets, but the bridge
        adds latency, especially for gestures and animations. Complex interactions require
        dropping down to native code (Swift/Kotlin), defeating the single-codebase promise.
      </p>

      <h3>Flutter (Custom renderer)</h3>
      <p>
        Flutter compiles Dart to native code and draws everything with its own Skia-based
        rendering engine. Performance is excellent, but your widgets aren&apos;t native — they&apos;re
        pixel-perfect replicas. This means platform conventions (scroll physics, text selection,
        accessibility behaviors) have to be reimplemented rather than inherited. And on desktop,
        the differences become more noticeable.
      </p>

      <h3>KMP + Compose Multiplatform (Partial native)</h3>
      <p>
        Kotlin Multiplatform compiles to JVM on Android and native on iOS, but shared UI through
        Compose Multiplatform uses a custom Skia-based renderer — same trade-off as Flutter. For
        truly native UI, you&apos;re back to writing platform-specific code.
      </p>

      <h2>Perry&apos;s Approach: Compile to Native Toolkits</h2>
      <p>
        Perry takes a fundamentally different approach. Instead of running your code in a runtime
        and bridging to native widgets, or drawing custom pixels, Perry compiles your TypeScript
        UI code directly into calls to each platform&apos;s native toolkit at build time.
      </p>
      <p>
        The key difference: <strong>there is no runtime layer between your code and the platform SDK.</strong>{" "}
        The compiled binary calls AppKit, UIKit, Android Views, GTK4, or Win32 directly, exactly
        like an app written in Swift, Kotlin, or C++ would.
      </p>

      <h2>The Unified UI API</h2>
      <p>
        Perry provides a common TypeScript API for building user interfaces. This API is
        deliberately high-level — you describe what your UI should contain and how it should
        behave, and Perry maps it to the appropriate native constructs.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        This same code compiles to native UI on all six platforms. No <code className="text-perry-400">#ifdef</code>,
        no platform checks, no conditional imports.
      </p>

      <h2>Platform Mapping in Detail</h2>
      <p>
        Here&apos;s how Perry maps the unified API to each platform&apos;s native framework:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        On macOS, Perry generates code that creates and manages AppKit objects directly.
        An <code className="text-perry-400">App</code> becomes an <code className="text-perry-400">NSApplication</code> with
        an <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> becomes <code className="text-perry-400">NSTextField</code> (with editing disabled).{" "}
        <code className="text-perry-400">Button</code> becomes <code className="text-perry-400">NSButton</code> with a target-action
        pattern wired to your callback.{" "}
        <code className="text-perry-400">VStack</code> becomes an <code className="text-perry-400">NSStackView</code> with vertical
        orientation. Layout uses Auto Layout constraints.
      </p>
      <p>
        The compiled binary links against the AppKit framework and calls Objective-C runtime
        functions directly. It&apos;s the same thing Xcode-compiled Swift would do.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        On iOS, the mapping is similar but targets UIKit.{" "}
        <code className="text-perry-400">App</code> becomes a <code className="text-perry-400">UIApplication</code> with
        a <code className="text-perry-400">UIWindow</code> and root <code className="text-perry-400">UIViewController</code>.{" "}
        <code className="text-perry-400">Text</code> maps to <code className="text-perry-400">UILabel</code>.{" "}
        <code className="text-perry-400">Button</code> maps to <code className="text-perry-400">UIButton</code>.{" "}
        Layout uses <code className="text-perry-400">UIStackView</code> and Auto Layout.
        Touch events are handled through UIKit&apos;s responder chain.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        On Android, Perry generates a native library loaded via JNI (Java Native Interface).{" "}
        <code className="text-perry-400">App</code> maps to an <code className="text-perry-400">Activity</code>.{" "}
        <code className="text-perry-400">Text</code> becomes a <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> becomes an <code className="text-perry-400">android.widget.Button</code> with
        an <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> maps to a vertical <code className="text-perry-400">LinearLayout</code>.
        The native code calls back into the Android framework through JNI, creating and
        manipulating real Android views.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        On Linux, Perry targets GTK4.{" "}
        <code className="text-perry-400">App</code> becomes a <code className="text-perry-400">GtkApplication</code> with
        a <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> maps to <code className="text-perry-400">GtkLabel</code>.{" "}
        <code className="text-perry-400">Button</code> maps to <code className="text-perry-400">GtkButton</code> with
        a signal handler.{" "}
        <code className="text-perry-400">VStack</code> maps to a <code className="text-perry-400">GtkBox</code> with vertical
        orientation. GTK&apos;s CSS theming means your app automatically follows the user&apos;s
        desktop theme.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        On Windows, Perry generates Win32 API calls.{" "}
        <code className="text-perry-400">App</code> creates a window class, registers it, and runs a message
        loop.{" "}
        <code className="text-perry-400">Button</code> becomes a <code className="text-perry-400">BUTTON</code> control
        created with <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> maps to a <code className="text-perry-400">STATIC</code> control.
        Events are handled through the Win32 message pump (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, etc.).
      </p>

      <h2>State Management</h2>
      <p>
        Perry&apos;s <code className="text-perry-400">State&lt;T&gt;</code> primitive provides reactive
        state management that compiles to platform-native update mechanisms. When a
        state value changes, Perry triggers a UI update through the platform&apos;s own
        invalidation system — <code className="text-perry-400">setNeedsDisplay</code> on macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> on Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> on Linux.
      </p>
      <p>
        There&apos;s no virtual DOM diffing, no reconciliation pass, no serialization. State
        changes propagate directly to the native widget that displays the value.
      </p>

      <h2>Why Not SwiftUI / Jetpack Compose Syntax?</h2>
      <p>
        You might wonder why Perry doesn&apos;t use a declarative syntax similar to SwiftUI or
        Jetpack Compose. The answer is pragmatic: Perry compiles TypeScript, and TypeScript
        has its own idioms. Rather than inventing a DSL that looks foreign to TypeScript
        developers, Perry uses a builder-style API that feels natural in TypeScript — constructors,
        method calls, callbacks, and closures. It&apos;s the same patterns you already use when
        working with Express, React hooks, or any other TypeScript library.
      </p>

      <h2>What&apos;s Available Today</h2>
      <p>
        All six platform backends are implemented and stable. The current widget set includes:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Layout</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Display</strong> — Text, Image</li>
        <li><strong>Input</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navigation</strong> — NavigationView, TabView, List</li>
        <li><strong>Containers</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>State</strong> — State&lt;T&gt; for reactive updates</li>
      </ul>

      <h2>What&apos;s Coming</h2>
      <p>
        We&apos;re actively expanding the widget library. Next up:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — password input with platform-native secure text entry</li>
        <li><code className="text-perry-400">ProgressView</code> — determinate and indeterminate progress indicators</li>
        <li><code className="text-perry-400">Alert</code> — native alert dialogs with buttons and text fields</li>
        <li><code className="text-perry-400">DatePicker</code> — platform-native date/time selection</li>
        <li><code className="text-perry-400">Menu</code> — native menu bars and context menus</li>
      </ul>
      <p>
        The goal is full GUI framework parity across all platforms — every widget, layout,
        gesture, and animation available everywhere. See the{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</Link> for the
        complete picture.
      </p>

      <h2>Try It</h2>
      <p>
        The best way to understand Perry&apos;s native UI is to see it in action.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> is a native
        JSON viewer built entirely in TypeScript with Perry — a real app with tree navigation,
        search, and keyboard shortcuts, compiled to native binaries on macOS, iOS, and Android.
        Read the{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">full walkthrough</Link>{" "}
        of how it was built.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Post 3 — Building Pry: A Native JSON Viewer in TypeScript
   ───────────────────────────────────────────── */

function BuildingPryContent() {
  return (
    <>
      <p>
        Pry is a native JSON viewer built entirely in TypeScript and compiled with Perry. It&apos;s
        not a tech demo — it&apos;s a real tool we use every day to inspect API responses, configuration
        files, and data dumps. This post walks through how it was built, how it compiles, and what
        the developer experience looks like when your TypeScript compiles to a native app.
      </p>

      <h2>What Pry Does</h2>
      <p>
        Pry reads a JSON file (or accepts JSON from stdin) and renders it as an interactive,
        navigable tree in a native window. If you&apos;ve used macOS&apos;s built-in Quick Look
        for JSON, imagine that — but faster, searchable, and with keyboard-driven navigation.
      </p>
      <p>
        The feature set:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tree view</strong> — collapsible nodes for objects and arrays, with depth indicators and expand/collapse all</li>
        <li><strong>Search</strong> — full-text search across keys and values with real-time highlighting and match navigation</li>
        <li><strong>Keyboard shortcuts</strong> — arrow keys to navigate, enter to expand/collapse, slash to search, <code className="text-perry-400">⌘C</code> to copy</li>
        <li><strong>Clipboard</strong> — copy any node or subtree as formatted JSON</li>
        <li><strong>Syntax coloring</strong> — strings in green, numbers in orange, booleans in purple, null in red</li>
        <li><strong>Status bar</strong> — shows total node count, current depth, file size, and parse time</li>
      </ul>

      <h2>The Source Code</h2>
      <p>
        Pry is written in standard TypeScript. There&apos;s no special syntax, no macros, no
        build-time code generation. It uses Perry&apos;s UI API, which provides native widgets
        that compile to platform-specific code.
      </p>
      <p>
        Here&apos;s the entry point (simplified for clarity):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        That&apos;s the core of a native application. No framework boilerplate, no build
        configuration, no platform-specific files. One TypeScript file.
      </p>

      <h3>The Helper Functions</h3>
      <p>
        Pry also includes a <code className="text-perry-400">countNodes</code> utility that
        recursively counts all nodes in the JSON tree, and a{" "}
        <code className="text-perry-400">formatBytes</code> helper for displaying file sizes. These
        are standard TypeScript functions — nothing Perry-specific about them. They compile to
        native code just like everything else.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Compiling Pry</h2>
      <p>
        Compiling Pry with Perry is a single command. No Xcode project, no Gradle configuration,
        no webpack config. Just point Perry at the entry file and specify your target.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        The binary is 48 MB because it includes the full AppKit UI stack — tree view rendering,
        search highlighting, syntax coloring, and keyboard handling. For comparison, the same app
        in Electron would be 200+ MB. A CLI-only Perry app compiles to 2–5 MB.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        The iOS build links against UIKit instead of AppKit. Perry maps the same{" "}
        <code className="text-perry-400">TreeView</code> API to <code className="text-perry-400">UITableView</code> with
        expandable sections, <code className="text-perry-400">SearchBar</code> to{" "}
        <code className="text-perry-400">UISearchBar</code>, and touch events replace mouse events.
        The iOS build can be deployed to physical devices and simulators.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        The Android build generates a native library loaded through JNI, packaged into an APK.{" "}
        <code className="text-perry-400">TreeView</code> maps to a <code className="text-perry-400">RecyclerView</code> with
        expandable view holders, <code className="text-perry-400">SearchBar</code> maps to an{" "}
        <code className="text-perry-400">EditText</code> with a <code className="text-perry-400">TextWatcher</code>, and the
        status bar maps to a <code className="text-perry-400">TextView</code> at the bottom of the layout.
      </p>

      <h2>What Happens Under the Hood</h2>
      <p>
        When Perry compiles Pry, it goes through several phases:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Parse</strong> — SWC parses the TypeScript source into an AST. Imports from{" "}
          <code className="text-perry-400">perry/ui</code> and <code className="text-perry-400">perry/fs</code> are
          resolved to Perry&apos;s built-in module implementations.
        </li>
        <li>
          <strong>Type analysis</strong> — Perry resolves all types, including the generic{" "}
          <code className="text-perry-400">State&lt;string&gt;</code> and{" "}
          <code className="text-perry-400">State&lt;number&gt;</code>, monomorphizing them into
          concrete types.
        </li>
        <li>
          <strong>Platform resolution</strong> — Based on the target flag, Perry selects the
          appropriate UI backend. Each <code className="text-perry-400">TreeView</code>,{" "}
          <code className="text-perry-400">SearchBar</code>, and <code className="text-perry-400">Button</code> call is
          resolved to the platform-specific implementation.
        </li>
        <li>
          <strong>IR generation</strong> — Perry generates an intermediate representation that
          includes native API calls — Objective-C message sends for macOS/iOS, JNI calls for
          Android, C function calls for GTK4/Win32.
        </li>
        <li>
          <strong>Code generation</strong> — Cranelift compiles the IR to native machine code
          for the target architecture.
        </li>
        <li>
          <strong>Linking</strong> — The native code is linked against the platform frameworks
          (AppKit, UIKit, Android NDK, GTK4, or Win32) to produce the final executable.
        </li>
      </ol>

      <h2>No Runtime, No Web Views</h2>
      <p>
        This is worth emphasizing because it&apos;s the core difference between Perry and every
        other TypeScript-to-native approach. The compiled Pry binary has:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>No JavaScript engine</strong> — no V8, no Hermes, no JavaScriptCore</li>
        <li><strong>No web views</strong> — no Chromium, no WebKit, no WKWebView</li>
        <li><strong>No bridge layer</strong> — no serialized messages between JS and native</li>
        <li><strong>No framework runtime</strong> — no React, no Flutter engine, no Dart VM</li>
      </ul>
      <p>
        The binary calls platform APIs directly. On macOS, it calls{" "}
        <code className="text-perry-400">objc_msgSend</code> to interact with AppKit objects. On Android,
        it calls JNI functions to create and manipulate Views. It&apos;s the same thing a native
        Swift or Kotlin app would do.
      </p>
      <p>
        The practical consequence: Pry launches instantly. There&apos;s no VM startup, no JIT
        warm-up, no script parsing. The process starts, the window appears, the JSON is rendered.
        Memory usage is a fraction of what an Electron equivalent would consume.
      </p>

      <h2>Developer Experience</h2>
      <p>
        Building Pry felt remarkably similar to building any TypeScript application. The
        workflow is:
      </p>
      <ol className="list-decimal list-inside">
        <li>Write TypeScript in your editor (VS Code, Zed, Neovim, whatever you prefer)</li>
        <li>Run <code className="text-perry-400">perry build pry.ts</code></li>
        <li>Execute <code className="text-perry-400">./pry test.json</code></li>
        <li>Iterate</li>
      </ol>
      <p>
        No Xcode project to configure. No Android Studio to install. No Gradle build that takes
        45 seconds. The Perry compiler itself is fast — parsing and compiling Pry takes a few
        seconds, and we&apos;re actively working on making it faster.
      </p>
      <p>
        The TypeScript you write is standard TypeScript. Your editor&apos;s type checking,
        autocomplete, and refactoring tools all work. You can extract functions, create modules,
        use generics — all the TypeScript patterns you already know.
      </p>

      <h2>What We Learned</h2>
      <p>
        Building Pry taught us a lot about what the Perry UI API needs to support. Some lessons:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Tree views are complex.</strong> Expanding, collapsing, search highlighting,
          keyboard navigation, and clipboard integration all need to be coordinated. Perry&apos;s{" "}
          <code className="text-perry-400">TreeView</code> widget handles this internally, but we had
          to ensure the native implementation was consistent across all three platforms.
        </li>
        <li>
          <strong>Keyboard shortcuts need platform conventions.</strong> On macOS, it&apos;s{" "}
          <code className="text-perry-400">⌘C</code> to copy. On Linux and Android, it&apos;s{" "}
          <code className="text-perry-400">Ctrl+C</code>. Perry&apos;s shortcut system abstracts this,
          but it took careful implementation to get right.
        </li>
        <li>
          <strong>Status bars are surprisingly non-trivial.</strong> Each platform has a different
          convention for where and how to display status information. AppKit uses the window&apos;s
          bottom bar, UIKit uses a toolbar, Android uses a bottom view in the layout. Perry&apos;s{" "}
          <code className="text-perry-400">StatusBar</code> maps to each correctly.
        </li>
        <li>
          <strong>Stdin support required platform awareness.</strong> On macOS and Linux, reading
          from stdin is straightforward. On iOS and Android, &quot;stdin&quot; doesn&apos;t really exist
          in the same way, so Pry uses file selection instead on mobile platforms. Perry&apos;s{" "}
          <code className="text-perry-400">readStdin</code> handles this transparently.
        </li>
      </ul>

      <h2>Performance</h2>
      <p>
        Pry handles large JSON files comfortably. In our testing:
      </p>
      <ul className="list-disc list-inside">
        <li>A 1 MB JSON file (10,000+ nodes) parses and renders in under 50 ms</li>
        <li>A 10 MB JSON file renders in under 200 ms</li>
        <li>Search across 10,000 nodes returns results as you type, with no visible lag</li>
        <li>Memory usage stays under 50 MB even for large files</li>
      </ul>
      <p>
        This is the advantage of native compilation. JSON parsing in Perry is compiled to
        tight native loops with no GC pauses. Tree rendering uses the platform&apos;s own
        virtualized list views (NSOutlineView, UITableView, RecyclerView), which are
        battle-tested for performance.
      </p>

      <h2>Source and Downloads</h2>
      <p>
        Pry is open source. You can browse the full source, build it yourself, or just look at
        the code to understand how a Perry native UI app is structured.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            GitHub repo
          </a>{" "}
          — full source code and build instructions
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            Showcase page
          </Link>{" "}
          — screenshots, feature list, and platform details
        </li>
      </ul>
      <p>
        If you&apos;re building something with Perry, we&apos;d love to hear about it. Open an
        issue on the{" "}
        <a href="https://github.com/skelpo/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          Perry repo
        </a>{" "}
        or start a discussion. We&apos;re building Perry in the open and feedback from real
        users building real apps is invaluable.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Content map & page component
   ───────────────────────────────────────────── */

const contentMap: Record<string, () => React.JSX.Element> = {
  "introducing-perry": IntroducingPerryContent,
  "cross-platform-native-ui": CrossPlatformUIContent,
  "building-pry": BuildingPryContent,
};

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const ContentComponent = contentMap[params.slug];
  if (!ContentComponent) notFound();

  return (
    <main className="min-h-screen">
      <Header />
      <BlogLayout post={post}>
        <ContentComponent />
      </BlogLayout>
      <Footer />
    </main>
  );
}
