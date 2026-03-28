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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
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
        <li>Run <code className="text-perry-400">perry compile pry.ts</code></li>
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
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          Perry repo
        </a>{" "}
        or start a discussion. We&apos;re building Perry in the open and feedback from real
        users building real apps is invaluable.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Post 4 — Compiling Hono, tRPC, and Strapi to Native Binaries
   ───────────────────────────────────────────── */

function CompilingFrameworksContent() {
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

/* ─────────────────────────────────────────────
   Post 5 — Plugin Systems Are a Performance Tax
   ───────────────────────────────────────────── */

function PluginSystemsContent() {
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

/* ─────────────────────────────────────────────
   Post 6 — All Six Platforms, Full Feature Parity
   ───────────────────────────────────────────── */

function AllSixPlatformsContent() {
  return (
    <>
      <p>
        When we shipped the first version of Perry&apos;s native UI system, &quot;cross-platform&quot;
        meant macOS worked well and the other five platforms were stubs. Today, with v0.2.162, that&apos;s
        no longer true. All six platforms — macOS, iOS, iPadOS, Android, Linux, and Windows — now
        share full feature parity. The same TypeScript code compiles to native widgets on every target.
      </p>
      <p>
        This post walks through what we shipped between v0.2.152 and v0.2.164: a Canvas widget,
        a full NSTableView implementation, 20+ total UI widgets, the{" "}
        <code className="text-amber-400">perry/system</code> module, multi-window support, system
        notifications, keychain access, automatic binary size reduction, and a compile-time plugin system.
        A lot happened.
      </p>

      <h2>The Widget Sprint: 20+ Native UI Components</h2>
      <p>
        The biggest single jump came in v0.2.155, which landed 20+ UI widgets across all platforms.
        Perry&apos;s TypeScript UI API now covers the components you actually need to ship a real app:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Layout</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>Input</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>Display</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>Data</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>Overlay</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>Drawing</strong> — Canvas (2D drawing API, hardware-accelerated per platform)</li>
      </ul>
      <p>
        These aren&apos;t wrappers around a custom renderer. Each widget compiles to the platform&apos;s
        own native component: <code className="text-amber-400">NSButton</code> on macOS,{" "}
        <code className="text-amber-400">UIButton</code> on iOS,{" "}
        <code className="text-amber-400">GtkButton</code> on Linux,{" "}
        <code className="text-amber-400">android.widget.Button</code> on Android via JNI, and{" "}
        <code className="text-amber-400">CreateWindowEx</code> on Windows. The OS draws them,
        themes them, and handles accessibility — Perry just wires up the TypeScript API.
      </p>

      <h2>Canvas: 2D Drawing from TypeScript</h2>
      <p>
        One of the more technically interesting additions is the Canvas widget (v0.2.152). It exposes
        a familiar 2D drawing API directly from TypeScript — bezier curves, fills, strokes, image
        blitting — and compiles to the platform&apos;s accelerated 2D backend:
        Core Graphics on macOS/iOS, Cairo on Linux, Direct2D on Windows, and Skia on Android.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compiles to Core Graphics on macOS, Cairo on Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Table Widget: NSTableView Comes to TypeScript</h2>
      <p>
        v0.2.163 landed the Table widget — the most complex component in the library. On macOS it maps
        to <code className="text-amber-400">NSTableView</code> with full delegate/data source wiring.
        On Linux it uses GTK4&apos;s <code className="text-amber-400">GtkTreeView</code>. On Windows,
        Win32&apos;s <code className="text-amber-400">ListView</code> control. On Android it binds to{" "}
        <code className="text-amber-400">RecyclerView</code> through JNI.
      </p>
      <p>
        The TypeScript API is declarative: you define columns, provide a data source, and Perry handles
        the platform-specific wiring at compile time. Column sorting, selection handling, and row
        height customization all work out of the box.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// TypeScript array of objects</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>The perry/system Module</h2>
      <p>
        v0.2.155 also introduced <code className="text-amber-400">perry/system</code> — a TypeScript
        module that exposes platform system APIs without any runtime: file dialogs, save dialogs, alerts,
        sheets, keychain access, system notifications, and multi-window management.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — native file picker (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — native save dialog</li>
        <li><code className="text-amber-400">system.showAlert()</code> — native alert panel</li>
        <li><code className="text-amber-400">system.notify()</code> — OS notification (UserNotifications / libnotify / WinRT)</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — multi-window management</li>
      </ul>
      <p>
        All of these call native platform APIs directly — no Electron IPC, no web view bridge.
        Perry compiles the TypeScript call site to a direct native function call into the platform SDK.
      </p>

      <h2>Six-Platform Feature Parity: v0.2.162</h2>
      <p>
        The v0.2.162 milestone was about closing gaps. Before this release, macOS had the fullest
        feature set, iOS was mostly there, and Linux/Windows/Android lagged. v0.2.162 brought
        all six platforms to the same level:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, complete widget set, Keychain, notifications, multi-window, toolbar</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, full widget parity with macOS, scene lifecycle</li>
        <li><strong>Android</strong> — JNI bridge, all widgets via Android Views, NDK cross-compilation</li>
        <li><strong>Linux</strong> — GTK4, full widget set including Table, file dialogs, libsecret keychain</li>
        <li><strong>Windows</strong> — Win32, all widgets, Windows Credential Store, WinRT notifications</li>
      </ul>
      <p>
        This is the milestone that makes &quot;one codebase, six platforms&quot; real rather than aspirational.
        The same TypeScript file compiles to native apps on all six targets with no platform-specific
        code paths required for common use cases.
      </p>

      <h2>Automatic Binary Size Reduction</h2>
      <p>
        v0.2.153 shipped automatic binary size reduction — the compiler now aggressively dead-strips
        unused code paths, eliminates unreachable stdlib functions, and deduplicates symbol definitions
        during linking. A typical CLI tool that previously compiled to ~4 MB now comes in under 2 MB
        with zero changes to your source.
      </p>
      <p>
        This matters for real deployments. When your binary is the unit of deployment — copied to a
        server, distributed as a single file, embedded in a container — size directly affects transfer
        time and storage cost. Halving the binary size for free is a meaningful improvement.
      </p>

      <h2>The Compile-Time Plugin System</h2>
      <p>
        v0.2.152 introduced Perry&apos;s plugin system — and it&apos;s architecturally unlike every
        other plugin system in the TypeScript ecosystem. There&apos;s no runtime plugin loading, no
        IPC, no dynamic <code className="text-amber-400">require()</code>. Plugins are TypeScript
        modules that Perry resolves and compiles at build time.
      </p>
      <p>
        The result: plugins have exactly zero runtime overhead. They compile into the same binary as
        your application code, with direct function calls between plugin code and host code. If you
        don&apos;t use a plugin, it doesn&apos;t appear in your binary at all. If you do use it,
        it&apos;s inlined like any other module.
      </p>
      <p>
        We wrote about the philosophy behind this in{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          Plugin Systems Are a Performance Tax
        </Link>. The short version: runtime plugin architectures trade performance for extensibility.
        Build-time composition gives you both.
      </p>

      <h2>Language Improvements</h2>
      <p>
        The UI sprint didn&apos;t happen in isolation — the compiler itself kept getting more capable.
        Across these releases:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Class expressions</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> now compiles correctly</li>
        <li><strong>Generator transforms</strong> — <code className="text-amber-400">function*</code> and <code className="text-amber-400">yield</code> compile to native state machines</li>
        <li><strong>Map/Set as class fields</strong> — <code className="text-amber-400">private items = new Map()</code> works in codegen</li>
        <li><strong>FFI param type coercion</strong> — native library calls handle type coercion automatically</li>
        <li><strong>Bound method references</strong> — <code className="text-amber-400">this.method</code> references work for native modules (fs, os, path)</li>
        <li><code className="text-amber-400">string.match()</code> — now fully supported</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>, multi-arg <code className="text-amber-400">path.join()</code>, <code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Web target</strong> — Perry can now compile to a web-compatible output for hybrid deployments</li>
      </ul>

      <h2>What&apos;s Next</h2>
      <p>
        With six-platform UI parity shipped, the next phase is depth over breadth. We&apos;re working on:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Full RegExp support (<code className="text-amber-400">regex.test()</code>, <code className="text-amber-400">string.matchAll()</code>)</li>
        <li>Drag and drop, custom context menus, and accessibility labels in the widget system</li>
        <li>A VS Code extension for Perry diagnostics and compile-on-save</li>
        <li>Package manager integration — install and compile Perry-native packages with one command</li>
        <li>WASM compilation target for browser deployment</li>
        <li>Multi-threading via <code className="text-amber-400">Worker</code> threads</li>
      </ul>
      <p>
        If you want to follow along, the{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Perry repo
        </a>{" "}
        is open. Check out the{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">showcase</Link>
        {" "}to see what&apos;s already being built, or browse the{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}for the full picture.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Blog post 7: From Compiler to Ecosystem
   ───────────────────────────────────────────── */

function FromCompilerToEcosystemContent() {
  return (
    <>
      <p>
        A week ago, Perry was a compiler with a UI toolkit. You could write TypeScript, compile it
        to a native binary, and ship it on six platforms. That was the story. Today the story is
        bigger: Perry is becoming an ecosystem. Three database ORMs, universal push notifications,
        distributed builds with App Store and Play Store publishing, a React compatibility layer,
        and automated app verification — all landed in the last week.
      </p>
      <p>
        This post covers what shipped, why it matters, and what the code looks like.
      </p>

      <h2>perry/ui: The Foundation</h2>
      <p>
        Before getting into the new libraries, it&apos;s worth emphasizing what sits at the center
        of everything: <code className="text-amber-400">perry/ui</code>. This is Perry&apos;s own
        native UI toolkit — 20+ widgets that compile directly to platform-native components on all
        six targets. It&apos;s not a wrapper, not an abstraction layer, not a web view.
        Every <code className="text-amber-400">Button</code> becomes an{" "}
        <code className="text-amber-400">NSButton</code> on macOS, a{" "}
        <code className="text-amber-400">UIButton</code> on iOS, a{" "}
        <code className="text-amber-400">GtkButton</code> on Linux, an{" "}
        <code className="text-amber-400">android.widget.Button</code> on Android, and a{" "}
        <code className="text-amber-400">CreateWindowEx</code> control on Windows.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code> is Perry&apos;s primary and most advanced
        UI surface. It includes reactive state management, layout containers (VStack, HStack,
        ZStack, SplitView), a hardware-accelerated Canvas, Table views with column sorting, the{" "}
        <code className="text-amber-400">perry/system</code> module for file dialogs, keychain
        access, notifications, and multi-window — all from TypeScript, all compiled to direct
        platform API calls. Every other UI approach in Perry, including the React compatibility
        layer, is built on top of <code className="text-amber-400">perry/ui</code> and maps back
        to its widgets.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        The reactive <code className="text-amber-400">State</code> object is the key primitive.
        When a State value changes, only the widgets bound to that state update — no virtual DOM
        diffing, no full-tree re-renders, no reconciliation pass. It&apos;s the most direct path
        from TypeScript to native platform UI that exists.
      </p>

      <h2>React Compatibility: A Thin Layer on perry/ui</h2>
      <p>
        For developers coming from React, <code className="text-amber-400">perry-react</code>{" "}
        provides a compatibility layer that maps React&apos;s component model to{" "}
        <code className="text-amber-400">perry/ui</code> widgets. You can use{" "}
        <code className="text-amber-400">useState</code>,{" "}
        <code className="text-amber-400">useRef</code>,{" "}
        <code className="text-amber-400">useReducer</code>, and JSX — and Perry compiles it to the
        same native widgets underneath. It&apos;s a convenience bridge, not a separate rendering engine.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        Under the hood, every JSX element maps to a <code className="text-amber-400">perry/ui</code>{" "}
        widget: <code className="text-amber-400">{`<div>`}</code> becomes a VStack,{" "}
        <code className="text-amber-400">{`<button>`}</code> becomes a Button,{" "}
        <code className="text-amber-400">useState</code> is backed by Perry&apos;s reactive State.
        It&apos;s early — Phase 1 with full-tree re-renders and global hook storage — but it proves
        that existing React code can target native platforms through Perry. We&apos;re also exploring
        Angular and Ionic compatibility along similar lines.
      </p>

      <h2>Three Database ORMs: Prisma API, Native Performance</h2>
      <p>
        If you&apos;re building a server or a desktop app that talks to a database, Perry now has
        you covered with three Prisma-compatible ORMs:{" "}
        <code className="text-amber-400">perry-prisma</code> (MySQL),{" "}
        <code className="text-amber-400">perry-sqlite</code> (SQLite), and{" "}
        <code className="text-amber-400">perry-postgres</code> (PostgreSQL). All three are drop-in
        replacements for <code className="text-amber-400">@prisma/client</code>. Same API, same
        query patterns, but compiled to native code with direct database FFI — no Prisma engine,
        no Node.js.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Same Prisma API — compiled to native SQL via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Under the hood, each ORM is a TypeScript front-end backed by a Rust FFI layer using{" "}
        <code className="text-amber-400">sqlx</code>. The query flow: TypeScript serializes the
        query to JSON, passes it across the FFI boundary, Rust builds parameterized SQL, executes
        it via the connection pool, and serializes the result back. The Prisma schema is read at
        build time — zero runtime parsing.
      </p>
      <p>
        The three implementations share ~95% of their code. The differences are what you&apos;d
        expect: identifier quoting (<code className="text-amber-400">`col`</code> vs{" "}
        <code className="text-amber-400">&quot;col&quot;</code>), placeholder syntax ({" "}
        <code className="text-amber-400">?</code> vs{" "}
        <code className="text-amber-400">$1, $2</code>), and transaction semantics. All three
        support the full Prisma CRUD surface: findMany, findFirst, findUnique, create, createMany,
        update, updateMany, upsert, delete, deleteMany, count — plus raw SQL, transactions,
        and 10+ WHERE filter operators.
      </p>

      <h2>perry-push: Universal Push Notifications</h2>
      <p>
        <code className="text-amber-400">perry-push</code> is a single library that handles push
        notifications across every platform: APNs (iOS/macOS), FCM (Android), Web Push (browsers),
        and WNS (Windows). Each provider is a Rust FFI module with exactly three functions:{" "}
        <code className="text-amber-400">*_provider_new</code>,{" "}
        <code className="text-amber-400">*_provider_close</code>, and{" "}
        <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Unified result type for all providers</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Cryptography is handled by{" "}
        <code className="text-amber-400">ring</code> — ES256 JWTs for APNs and VAPID, RS256 for
        FCM service accounts, AES-GCM for Web Push payload encryption. All compiled to native code.
        No <code className="text-amber-400">node-gyp</code>, no OpenSSL dependency.
      </p>

      <h2>Perry Hub + Builders: Distributed Cloud Builds</h2>
      <p>
        This is the infrastructure play. <code className="text-amber-400">perry-hub</code> is a
        build orchestration server — itself compiled from TypeScript by Perry — that manages a pool
        of build workers. You push your project, the hub dispatches it to the right worker based on
        target platform, and the worker compiles, signs, and optionally publishes your app.
      </p>
      <p>
        Two workers exist today: a macOS builder (handles macOS, iOS, and Android targets) and a
        Linux builder (handles Linux and Android). Both are Rust binaries that connect to the hub
        over WebSocket, download source tarballs, run the Perry compiler, and upload artifacts back.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Code signing</strong> — Apple notarization for macOS, provisioning profiles for iOS, Android keystore signing</li>
        <li><strong>App Store publishing</strong> — direct upload to App Store Connect and Google Play Store</li>
        <li><strong>Artifact management</strong> — built binaries uploaded to the hub with TTL-based cleanup</li>
        <li><strong>License management</strong> — per-license rate limits, priority queuing (pro tier gets priority)</li>
      </ul>
      <p>
        The hub itself is a fascinating case study. It&apos;s a ~1,500-line TypeScript file compiled
        to a 2 MB native binary by Perry. It runs Fastify on port 3456 for HTTP and{" "}
        <code className="text-amber-400">ws</code> on port 3457 for WebSocket. All state is
        in-memory with JSON persistence — no external database. It&apos;s the kind of server you
        can deploy with <code className="text-amber-400">scp</code> and a systemd unit file.
      </p>

      <h2>perry-verify: Automated App Verification</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> is a standalone HTTP service that
        takes a compiled binary and a configuration, runs a verification pipeline, and returns
        structured pass/fail results with screenshots. It launches the app, runs authentication
        flows (deterministic or AI-assisted), checks state, and captures evidence.
      </p>
      <p>
        Platform adapters exist for macOS (via accessibility APIs), Linux (AT-SPI), and stubs
        for iOS Simulator and Android Emulator. The AI layer uses Claude for fallback authentication
        and state verification when deterministic checks aren&apos;t possible. It&apos;s designed
        to slot into the hub&apos;s build pipeline as a post-build step: compile, sign, verify, publish.
      </p>

      <h2>Pry Ships Everywhere</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>,
        the native JSON viewer we built as a Perry showcase, now ships on five platforms. It&apos;s
        on the{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Mac App Store
        </a>{" "}
        and{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Google Play
        </a>, with native binaries for Linux and Windows. Same TypeScript codebase, five
        platform-specific entry points, five native binaries. It&apos;s the most concrete proof
        that this whole approach works end to end — from TypeScript source to App Store listing.
      </p>

      <h2>What This All Means</h2>
      <p>
        A compiler is interesting. An ecosystem is useful. In the last week, Perry went from
        &quot;you can compile TypeScript to native&quot; to &quot;you can build a full app with
        native UI, a Prisma database, push notifications, and builds that auto-publish to
        the App Store.&quot;
      </p>
      <p>
        The pieces are starting to connect:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> is the most direct path from TypeScript to native platform UI — reactive state, 20+ widgets, zero abstraction layers</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> means existing database code ports with minimal changes</li>
        <li><strong>perry-push</strong> means native push notifications without per-platform libraries</li>
        <li><strong>perry-hub + builders</strong> means you can go from <code className="text-amber-400">perry publish</code> to App Store in one step</li>
        <li><strong>perry-verify</strong> means automated testing of the compiled output, not just the source</li>
        <li><strong>perry-react</strong> means React developers can ease into Perry using familiar patterns, all mapping to perry/ui underneath</li>
      </ul>
      <p>
        These aren&apos;t theoretical. Every library listed here has working code, tests, and
        documentation. Several are already used in production — the Perry landing site itself
        runs on a Perry-compiled Fastify server, and Pry is live in two app stores.
      </p>

      <h2>What&apos;s Next</h2>
      <p>
        The immediate roadmap:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui expansion</strong> — drag and drop, accessibility labels, custom context menus, more layout primitives</li>
        <li><strong>perry-verify integration</strong> — automated verification in the build pipeline</li>
        <li><strong>Framework compatibility</strong> — improving React, Angular, and Ionic layers as on-ramps to perry/ui</li>
        <li><strong>Full regex support</strong> — ECMAScript-compatible regex engine compiled to native</li>
      </ul>
      <p>
        Follow the progress on{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, or check the{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}for the full picture.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Blog post 8: The Full Pipeline
   ───────────────────────────────────────────── */

function TheFullPipelineContent() {
  return (
    <>
      <p>
        82 commits in seven days. A documentation site with 49 pages. Automated App Store and Play Store
        publishing. Homebrew and APT packages. Native WidgetKit extensions compiled from TypeScript.
        A self-hosting LLVM compiler. And dozens of bug fixes across every platform.
      </p>
      <p>
        This post covers everything that shipped in Perry between March 6 and March 13, 2026. The theme
        is completion — filling in the gaps between &quot;I wrote some TypeScript&quot; and &quot;my app
        is in the App Store.&quot;
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perry now has a real documentation site. 49 pages built with mdBook, covering everything from
        getting started to the CLI reference. The docs are organized into sections:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Getting Started</strong> — installation, first project, project structure</li>
        <li><strong>Language Features</strong> — everything Perry supports from TypeScript</li>
        <li><strong>Native UI</strong> — 12 pages covering all widget types, layout, state management, and platform-specific behavior</li>
        <li><strong>Platforms</strong> — dedicated pages for each of the 6 target platforms</li>
        <li><strong>Standard Library</strong> — 50+ native package implementations documented</li>
        <li><strong>System APIs</strong> — file dialogs, keychain, notifications, multi-window</li>
        <li><strong>WidgetKit</strong> — the new widget extension module</li>
        <li><strong>Plugins</strong> — compile-time plugin architecture</li>
        <li><strong>CLI Reference</strong> — every command and flag</li>
      </ul>
      <p>
        The site also includes an <code className="text-amber-400">llms.txt</code> file for
        AI discoverability, and is deployed via GitHub Pages with a custom domain at{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>.
      </p>

      <h2>Install Perry in One Command</h2>
      <p>
        Perry is now distributed through Homebrew and APT, in addition to building from source. A new
        GitHub Actions release pipeline builds binaries for macOS (arm64 and x86_64) and
        Linux (x86_64 and arm64), then automatically updates the Homebrew tap and APT repository.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        No more cloning the repo and building with Cargo. Install Perry the same way you install
        any other tool.
      </p>

      <h2>Automated App Store Publishing</h2>
      <p>
        This is the change that collapses the most manual steps. Running{" "}
        <code className="text-amber-400">perry publish ios</code> now handles the entire iOS distribution
        pipeline automatically:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Generates an RSA key and CSR via the App Store Connect API</li>
        <li>Creates a distribution certificate and bundles it into a <code className="text-amber-400">.p12</code></li>
        <li>Registers the bundle ID</li>
        <li>Creates and downloads a provisioning profile</li>
        <li>Creates the App Store Connect app record</li>
        <li>Builds, signs, and uploads to TestFlight or the App Store</li>
      </ol>
      <p>
        No Xcode. No manual portal visits. No downloading certificates from a browser. The setup
        wizard runs automatically the first time you publish, walking through API key configuration
        and storing credentials in <code className="text-amber-400">perry.toml</code>.
      </p>
      <p>
        macOS distribution is equally automated. Perry supports three modes: TestFlight, notarized DMG,
        and a new <strong>&quot;both&quot;</strong> mode that publishes to the App Store and creates a
        notarized DMG simultaneously. Three certificate types are auto-generated:{" "}
        <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>,{" "}
        <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code>, and{" "}
        <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>.
      </p>
      <p>
        Android publishing also gained an auto-triggered setup wizard. All three platforms now follow
        the same pattern: first run triggers setup, credentials are saved to the project, subsequent
        runs are zero-configuration.
      </p>
      <p>
        Pre-flight validation catches problems before the build starts — provisioning profile bundle
        ID mismatch, certificate expiration, missing app icon, invalid version format, wrong team ID.
        And <code className="text-amber-400">encryption_exempt</code> in{" "}
        <code className="text-amber-400">perry.toml [ios]</code> auto-sets the{" "}
        <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> Info.plist key, skipping
        the manual export compliance prompt in App Store Connect.
      </p>

      <h2>perry/widget: WidgetKit from TypeScript</h2>
      <p>
        Perry can now compile TypeScript to native SwiftUI WidgetKit extensions. This is not a wrapper
        or a bridge — the compiler walks the render tree at the HIR level and emits SwiftUI source code
        directly. The output is a complete WidgetKit extension bundle that Xcode (or Perry&apos;s build
        pipeline) can embed in your app.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        The approach is fundamentally different from the rest of Perry&apos;s compilation. Normal Perry
        code goes through Cranelift to native machine code. Widget code goes through the HIR to SwiftUI
        text output, because WidgetKit requires SwiftUI — there&apos;s no way to build a widget extension
        with imperative UIKit or AppKit code. Perry solves this by treating the widget render tree as a
        compile-time template, not runtime code.
      </p>

      <h2>New Widgets and Platform Improvements</h2>
      <p>
        Four new widget types landed this week:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — multi-line text editing on macOS, iOS, and Android</li>
        <li><strong>SecureField</strong> — password input on iOS and macOS</li>
        <li><strong>QR Code</strong> — native QR code generation on iOS, macOS, and Android</li>
        <li><strong>Splash Screen</strong> — auto-generated LaunchScreen storyboards (iOS) and splash themes (Android)</li>
      </ul>

      <h3>iPad Goes Native</h3>
      <p>
        Perry now generates full iPad-native apps: <code className="text-amber-400">UIDeviceFamily [1,2]</code>,
        orientation support, <code className="text-amber-400">UIRequiresFullScreen</code>, and a compiled
        LaunchScreen storyboard via ibtool. A new <code className="text-amber-400">getDeviceIdiom()</code>{" "}
        function detects phone vs. iPad at runtime, and <code className="text-amber-400">PerryFrameSplit</code>{" "}
        provides frame-based horizontal split containers for iPad layouts.
      </p>

      <h3>Windows</h3>
      <p>
        Windows got timer support (50ms <code className="text-amber-400">WM_TIMER</code> tick),
        owner-drawn buttons with dark theme backgrounds, and fixes for a use-after-free bug in{" "}
        <code className="text-amber-400">to_wide().as_ptr()</code> across 18 widget files. V8 runtime
        now works on Windows with the required system libraries linked.
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        The GTK4 backend received visual polish to match macOS: CSS padding for edge insets, Adwaita
        button styling, VStack margin fixes, and ScrollView horizontal policy.
      </p>

      <h2>http/https and better-sqlite3</h2>
      <p>
        Two significant stdlib additions:
      </p>
      <p>
        The new <code className="text-amber-400">http</code> and{" "}
        <code className="text-amber-400">https</code> native modules provide client-side HTTP
        using reqwest under the hood. The API matches Node.js:{" "}
        <code className="text-amber-400">request()</code>,{" "}
        <code className="text-amber-400">get()</code>,{" "}
        <code className="text-amber-400">ClientRequest</code> with write/end/on, and{" "}
        <code className="text-amber-400">IncomingMessage</code> with statusCode and event handlers.
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> is now fully supported:{" "}
        <code className="text-amber-400">new Database()</code>,{" "}
        <code className="text-amber-400">prepare</code>,{" "}
        <code className="text-amber-400">exec</code>,{" "}
        <code className="text-amber-400">run</code>,{" "}
        <code className="text-amber-400">get</code>,{" "}
        <code className="text-amber-400">all</code> — with proper NaN-boxing and row objects
        with named property access.
      </p>
      <p>
        Other stdlib improvements: <code className="text-amber-400">crypto.randomBytes()</code> now
        returns a Buffer (matching Node.js), MongoDB gained{" "}
        <code className="text-amber-400">listDatabases</code> and{" "}
        <code className="text-amber-400">listCollections</code> with thread-safety fixes, and
        mysql2 INSERT/UPDATE/DELETE now returns{" "}
        <code className="text-amber-400">ResultSetHeader</code> with{" "}
        <code className="text-amber-400">insertId</code>.
      </p>

      <h2>GC and Correctness Fixes</h2>
      <p>
        Several critical garbage collector and runtime correctness fixes shipped this week:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GC reentrancy guard</strong> — prevents collection during allocation, fixing RefCell double-borrow panics</li>
        <li><strong>GC Map tracing</strong> — Maps now properly traced during mark phase, preventing string key collection</li>
        <li><strong>String aliasing fix</strong> — string append now always allocates fresh strings, fixing corruption from pointer copy aliasing</li>
        <li><strong>BigInt arithmetic</strong> — right-shift uses arithmetic shift for negative numbers, bitwise ops use ToInt32 wrapping semantics</li>
        <li><strong>Map.get() undefined</strong> — returns correct <code className="text-amber-400">TAG_UNDEFINED</code> for missing keys instead of wrong NaN tag</li>
        <li><strong>Static field GC roots</strong> — BigInt values in static class fields registered as GC roots</li>
      </ul>
      <p>
        These aren&apos;t minor. The GC reentrancy fix alone resolved an entire class of intermittent
        crashes. The string aliasing fix affected any program that assigned one string variable to
        another and then mutated either. These are the kind of bugs that only surface under real
        workloads, and fixing them is what makes the compiler production-grade.
      </p>

      <h2>perry-verify: Hardened</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>, the automated app verification service,
        got a security hardening pass: sandboxed execution via{" "}
        <code className="text-amber-400">bwrap</code> on Linux and{" "}
        <code className="text-amber-400">sandbox-exec</code> on macOS, auth tokens on WebSocket
        handshake and binary download, per-IP rate limiting, full UUID job IDs to prevent enumeration,
        and reduced body limits.
      </p>

      <h2>perrysdad: The Self-Hosting Compiler</h2>
      <p>
        In a parallel effort, <code className="text-amber-400">perrysdad</code> — a self-hosting LLVM IR
        compiler written in TypeScript — went from zero to self-compilation in five phases over the week:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>Phase 0-1</strong> — end-to-end skeleton: HIR to LLVM IR text to clang, linked against Perry&apos;s <code className="text-amber-400">libperry_runtime.a</code></li>
        <li><strong>Phase 2</strong> — hand-rolled recursive descent parser with Pratt expression parsing for real <code className="text-amber-400">.ts</code> files</li>
        <li><strong>Phase 3</strong> — arrays, objects, and maps with runtime FFI, plus fixing a critical ABI mismatch (JSValue declared as double in LLVM IR instead of i64)</li>
        <li><strong>Phase 4</strong> — classes, enums, closures, multi-file compilation with module discovery and topological sort</li>
      </ol>
      <p>
        The milestone: the self-compiled <code className="text-amber-400">anvil</code> binary can now
        compile test programs and produce correct output matching the node-compiled version. A TypeScript
        compiler, compiled by Perry to native code, compiling more TypeScript to native code. Turtles
        all the way down.
      </p>

      <h2>By the Numbers</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 commits</strong> to the main Perry compiler</li>
        <li><strong>1 release</strong>: v0.2.173 (March 8)</li>
        <li><strong>49 documentation pages</strong> at docs.perryts.com</li>
        <li><strong>4 new widgets</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 distribution channels</strong>: Homebrew, APT, source</li>
        <li><strong>3 automated store pipelines</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>All 6 platforms</strong> received improvements this week</li>
      </ul>

      <h2>What&apos;s Next</h2>
      <p>
        The pipeline is filling in. You can write TypeScript, compile to six platforms, distribute via
        Homebrew or APT, publish to the App Store and Play Store, add home screen widgets, and read
        comprehensive documentation — all without leaving Perry&apos;s toolchain. What remains:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Full regex support</strong> — the last major language gap</li>
        <li><strong>perry/ui expansion</strong> — drag and drop, accessibility labels, DatePicker</li>
        <li><strong>perrysdad maturation</strong> — expanding the self-hosting compiler toward full Perry parity</li>
        <li><strong>Hub public beta</strong> — opening distributed builds to external users</li>
      </ul>
      <p>
        Follow the progress on{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, read the new docs at{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, or check the{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}for the full picture.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Blog 9: Cross-Compile to Windows, iOS Game Loops, and 100% Test Parity
   ───────────────────────────────────────────── */

function CrossCompileWindowsContent() {
  return (
    <>
      <p>
        103 commits to the Perry compiler this week. The headline features: you can now cross-compile
        Windows executables from Linux, iOS apps can run blocking game loops, the compiler reports
        crashes for telemetry, and the self-hosting compiler passes every deterministic test we throw
        at it. Plus a major Hub infrastructure upgrade and 50+ bug fixes.
      </p>

      <h2>Cross-Compile to Windows from Linux</h2>
      <p>
        Perry can now produce Windows <code className="text-amber-400">.exe</code> binaries from a
        Linux host. This is the missing piece for CI/CD pipelines that need to target Windows without
        running a Windows build machine for the entire compilation.
      </p>
      <p>
        The implementation replaces compile-time <code className="text-amber-400">#[cfg]</code> checks
        with runtime target detection. When the compiler sees a Windows target on a non-Windows host,
        it locates <code className="text-amber-400">lld-link</code>,{" "}
        <code className="text-amber-400">llvm-nm</code>, and{" "}
        <code className="text-amber-400">llvm-ar</code> from the Rust toolchain or PATH via a
        new <code className="text-amber-400">find_llvm_tool()</code> helper. The Windows system
        libraries come from an{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          xwin
        </a>-style
        sysroot pointed to by <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code>.
      </p>
      <p>
        The linker automatically uses <code className="text-amber-400">/FORCE:UNRESOLVED</code> and
        generates stubs for missing UI symbols, so CLI apps cross-compile cleanly. Output defaults
        to <code className="text-amber-400">.exe</code> when targeting Windows. The full details are
        in the{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          cross-compilation docs
        </a>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>iOS Game Loop Support</h2>
      <p>
        iOS requires UIKit to own the main thread. That&apos;s fine for event-driven apps, but it&apos;s a
        problem for games that need a blocking <code className="text-amber-400">while (!shouldClose)</code> loop.
        Perry now solves this with the <code className="text-amber-400">--features ios-game-loop</code> flag.
      </p>
      <p>
        When enabled, the compiler emits{" "}
        <code className="text-amber-400">_perry_user_main</code> instead of{" "}
        <code className="text-amber-400">main</code>. The runtime provides a{" "}
        <code className="text-amber-400">main()</code> that calls{" "}
        <code className="text-amber-400">UIApplicationMain</code> on the main thread and
        spawns your code on a background thread. Scene delegate and app delegate handle the full
        UIKit lifecycle while your game loop runs unblocked.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Your game loop runs on a background thread</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        This enables an entire category of apps — games, simulations, real-time visualizations — that
        weren&apos;t practical on iOS before. The iOS pump and callback paths are also now wrapped in
        panic handling, so crashes in either the game loop or the UIKit lifecycle are caught cleanly.
      </p>

      <h2>Crash Reporting</h2>
      <p>
        Perry-compiled apps now install a panic hook and signal handlers for{" "}
        <code className="text-amber-400">SIGSEGV</code>,{" "}
        <code className="text-amber-400">SIGBUS</code>, and{" "}
        <code className="text-amber-400">SIGABRT</code> at startup. When a fatal crash occurs,
        the details are written to <code className="text-amber-400">~/.hone/crash.log</code> for
        the Chirp telemetry system. Caught panics (in{" "}
        <code className="text-amber-400">catch_callback_panic</code>) clear the log, so only
        genuine unrecoverable crashes are reported.
      </p>
      <p>
        This is a production-readiness feature. When something goes wrong in the field, we&apos;ll
        know about it — and the crash log includes enough context to diagnose the issue without
        requiring users to manually report anything.
      </p>

      <h2>Hub: Two-Stage Windows Build Pipeline</h2>
      <p>
        The Perry Hub build infrastructure got a significant architectural upgrade. Previously,
        building for Windows required a Windows worker for the entire compilation. Now the pipeline
        splits into two stages:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>A Linux worker cross-compiles the Windows artifact using the new lld-link support</li>
        <li>The Hub holds the pre-compiled artifact and re-queues the job for a Windows worker</li>
        <li>The Windows worker only handles signing and packaging — a much lighter task</li>
      </ol>
      <p>
        When a worker sends <code className="text-amber-400">complete</code> with{" "}
        <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code>, the Hub
        transparently re-queues the job. The CLI sees a seamless single-build experience.
      </p>
      <p>
        The Hub also now auto-starts Azure Windows VMs when no Windows worker is connected,
        and build workers auto-update to the latest Perry version on new releases. Less manual
        infrastructure management, faster builds.
      </p>

      <h2>Documentation Overhaul</h2>
      <p>
        Two major documentation rewrites landed this week on{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>perry.toml reference</strong> — complete section documentation covering every
          configuration option, bundle ID resolution, entry file resolution, build number
          auto-increment, and CI/CD examples
        </li>
        <li>
          <strong>Geisterhand reference</strong> — full API docs, platform setup, test automation
          patterns, and architecture overview for the cross-platform UI testing framework
        </li>
      </ul>
      <p>
        These aren&apos;t incremental updates. Both are ground-up rewrites that cover every feature
        and configuration option. If you&apos;re setting up a new project or writing tests, start
        here.
      </p>

      <h2>Cross-Platform Menu APIs</h2>
      <p>
        <code className="text-amber-400">menuClear</code> and{" "}
        <code className="text-amber-400">menuAddStandardAction</code> were previously macOS-only.
        They now work on all 6 native platforms. This also includes a fix for a{" "}
        <code className="text-amber-400">RefCell</code> re-entrancy panic in{" "}
        <code className="text-amber-400">dispatch_menu_item</code> on Windows.
      </p>

      <h3>Android: 16 KB Page Alignment</h3>
      <p>
        Google Play now requires 16 KB page alignment for native libraries. Perry sets the
        appropriate <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code>{" "}
        automatically, and companion <code className="text-amber-400">.so</code> files are copied
        next to the output for APK/AAB inclusion.
      </p>

      <h2>Perry React: Kanban Board</h2>
      <p>
        The React compatibility layer got a real-world test: a full 5-column Kanban board with
        move, add, delete, and view operations. Building it uncovered and fixed nested array
        children rendering in JSX — the recursive{" "}
        <code className="text-amber-400">_appendChildren</code> handler now properly flattens
        arrays returned from <code className="text-amber-400">.map()</code> calls. There&apos;s
        also a new 14-section Kitchen Sink WorkBench demo covering various UI patterns.
      </p>

      <h2>Anvil: 100% Deterministic Test Parity</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — the self-hosting LLVM compiler written
        in TypeScript and compiled by Perry — now passes <strong>68 out of 68</strong> deterministic
        tests, matching the main compiler&apos;s output exactly. The only differences are inherent
        (timestamps, <code className="text-amber-400">Math.random()</code>), and 11 tests are
        skipped because they require UI, timers, crypto, or platform-specific features not yet
        implemented.
      </p>
      <p>
        Key work that got it there:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Interface method dispatch</strong> — interface-typed variables now return correct methods via class_id-based dispatch in ObjectHeader</li>
        <li><strong>Dynamic property access</strong> — runtime dispatch for computed property names</li>
        <li><strong>Closures and this-binding</strong> — correct capture semantics for object methods</li>
        <li><strong>Phase 6 in progress</strong> — async/await, generators, and condition fixes</li>
      </ul>
      <p>
        100% parity on deterministic tests is a significant milestone. It means the self-compiled{" "}
        <code className="text-amber-400">anvil</code> binary produces the exact same output as
        the main compiler for every testable scenario. The gap is narrowing toward full self-hosting.
      </p>

      <h2>50+ Bug Fixes</h2>
      <p>
        A major correctness push this week. Highlights:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — arrays no longer truncated at 16 elements, invalid input handled correctly</li>
        <li><strong>Uint8Array</strong> — constructor from array variable, <code className="text-amber-400">.set(source, offset)</code> implementation (was a no-op)</li>
        <li><strong>BigInt</strong> — NaN-boxing with <code className="text-amber-400">BIGINT_TAG</code> for cross-module calls, keccak256 32-bit truncation fixes</li>
        <li><strong>Optional chaining</strong> — nested conditional expressions, toString detection, return value NaN-boxing</li>
        <li><strong>IndexSet</strong> — string NaN-boxing corrected to use <code className="text-amber-400">STRING_TAG</code> instead of <code className="text-amber-400">POINTER_TAG</code></li>
        <li><strong>MySQL</strong> — DATETIME and BLOB types, <code className="text-amber-400">Date(string)</code> constructor</li>
        <li><strong>Math.min/max</strong> — spread argument handling</li>
        <li><strong>Native method dispatch</strong> — field-scan-and-call for <code className="text-amber-400">POINTER_TAG</code> objects</li>
      </ul>
      <p>
        These aren&apos;t edge cases. JSON.parse truncating arrays at 16 elements would break any
        real application. Uint8Array.set being a no-op would silently corrupt data. These are the
        fixes that make the compiler production-grade, one correctness bug at a time.
      </p>

      <h2>By the Numbers</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 commits</strong> to the main Perry compiler</li>
        <li><strong>3 versions</strong>: v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 major feature</strong>: cross-compile Windows from Linux</li>
        <li><strong>1 new app category</strong>: iOS game loops</li>
        <li><strong>68/68</strong> deterministic test parity in perrysdad</li>
        <li><strong>50+ bug fixes</strong> across NaN-boxing, stdlib, and native FFI</li>
        <li><strong>2 documentation rewrites</strong>: perry.toml and Geisterhand</li>
        <li><strong>5 Hub improvements</strong>: two-stage pipeline, Azure auto-startup, worker auto-update</li>
      </ul>

      <h2>What&apos;s Next</h2>
      <p>
        Windows cross-compilation opens the door to fully automated multi-platform CI/CD — push
        TypeScript, get native binaries for every target without dedicated build machines for each
        OS. The game loop support unlocks a whole new category of iOS apps. And 100% deterministic
        test parity in perrysdad means self-hosting is getting very real. What remains:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Full regex support</strong> — the last major language gap</li>
        <li><strong>perry/ui expansion</strong> — drag and drop, accessibility labels, DatePicker</li>
        <li><strong>perrysdad Phase 6</strong> — async/await, generators, expanding toward full Perry parity</li>
        <li><strong>Hub public beta</strong> — opening distributed builds to external users</li>
      </ul>
      <p>
        Follow the progress on{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, read the docs at{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, or check the{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}for the full picture.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Blog 10 — True Multi-Threading, i18n, watchOS
   ───────────────────────────────────────────── */

function TrueMultithreadingContent() {
  return (
    <>
      <p>
        Perry v0.4.0 is the biggest release since the project began. Three version jumps in one cycle — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — and the compiler itself is now parallel. Here&apos;s everything that shipped.
      </p>

      <h2>True Multi-Threading</h2>
      <p>
        Perry now has real OS-threaded parallelism. Not web workers with serialization overhead. Not <code>SharedArrayBuffer</code> with <code>Atomics</code>. Real threads — lightweight 8MB-stack OS threads that share nothing and cost nothing when idle.
      </p>
      <p>
        The new <code>perry/thread</code> module exposes three primitives:
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> and <code>parallelFilter</code> auto-detect the number of CPU cores and split the input array across them. For small arrays, they skip threading entirely and run synchronously — no overhead for trivial workloads.
      </p>
      <p>
        <code>spawn</code> launches a background OS thread and returns a Promise. The result flows back via a pending results queue that&apos;s drained during microtask processing, so you <code>await</code> it like any other async operation.
      </p>

      <h3>Compile-Time Safety</h3>
      <p>
        The most important part isn&apos;t the API — it&apos;s what the compiler <em>prevents</em>. Perry statically rejects closures that capture mutable variables:
      </p>
      <pre><code>{`let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});`}</code></pre>
      <p>
        No shared mutable state means no data races. No locks, no mutexes, no <code>Atomics</code>. The compiler enforces thread safety before a single line of machine code is emitted.
      </p>

      <h3>Under the Hood</h3>
      <p>
        Each worker thread gets its own memory arena with <code>Drop</code> cleanup — no GC coordination across threads. Values are transferred via <code>SerializedValue</code> deep-copy: zero-cost for numbers, O(n) for strings, arrays, and objects. The implementation lives in a single 1,120-line Rust file (<code>perry-runtime/src/thread.rs</code>) and required no changes to the garbage collector.
      </p>
      <p>
        Compare this to V8 isolates, which require separate heaps per worker with ~2MB overhead each. Perry&apos;s threads are just pthreads with arenas.
      </p>

      <h3>Parallel Compiler Pipeline</h3>
      <p>
        The compiler itself is now parallel too. Module codegen, transform passes (JS imports, native instances, monomorphization), and <code>nm</code> symbol scanning all run across all CPU cores via rayon. Combined with the Cranelift 0.121 upgrade (from 0.113 — eight minor versions of register allocation and x64 improvements), compilation is significantly faster.
      </p>

      <h2>Compile-Time i18n (v0.3.0)</h2>
      <p>
        Perry&apos;s internationalization system has zero ceremony. String literals in UI widgets are automatically treated as localizable keys. Translation files are flat JSON in a <code>locales/</code> directory. All validation happens at compile time.
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        The compiler validates everything: missing translations, parameter mismatches, plural form errors. Translations are baked into the binary as an embedded 2D string table with near-zero runtime lookup — no parsing JSON at startup.
      </p>

      <h3>What&apos;s Included</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>CLDR plural rules</strong> for 30+ locales with <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code> suffixes</li>
        <li><strong>Format wrappers</strong>: <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>Native locale detection</strong> on all platforms: <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI: scans TS/TSX files, generates and updates locale JSON scaffolds</li>
        <li><strong>Platform-native resource generation</strong>: iOS <code>.lproj</code> and Android <code>values-xx/</code> directories</li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> for localizing non-UI strings</li>
      </ul>
      <p>
        Configure it in <code>perry.toml</code>:
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>watchOS Native Apps (v0.3.2)</h2>
      <p>
        Perry now compiles to watchOS — the 9th compilation target. This isn&apos;t a wrapper or a companion app. It&apos;s a standalone watchOS binary with a native SwiftUI interface.
      </p>
      <p>
        The watchOS renderer uses a <strong>data-driven approach</strong>: Perry builds a UI tree via <code>perry_ui_*</code> FFI calls, and a shipped <code>PerryWatchApp.swift</code> queries the tree and renders SwiftUI views reactively. 15 widget types are supported with stubs for unsupported ones.
      </p>
      <pre><code>{`# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos`}</code></pre>
      <p>
        The full flow works: <code>perry setup watchos</code> shares App Store Connect credentials with iOS, <code>perry run watchos</code> auto-detects Apple Watch simulators, and <code>perry publish watchos</code> submits to the App Store.
      </p>
      <p>
        This also brings the total <strong>widget target count to four</strong>: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit), and Wear OS (Tiles). Each has its own compile target and codegen backend.
      </p>

      <h2>Audio & Camera APIs</h2>
      <p>
        Two new hardware APIs ship in this release:
      </p>
      <h3>Audio Capture (<code>perry/system</code>)</h3>
      <p>
        Cross-platform audio capture with A-weighted dB(A) measurement:
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();`}</code></pre>
      <p>
        Platform backends: AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).
      </p>
      <h3>Camera Capture (<code>perry/ui</code>)</h3>
      <p>
        Native camera preview with pixel-level color sampling (iOS):
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging`}</code></pre>

      <h2>Ecosystem Packages</h2>
      <p>
        Two first-party native packages launched:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — Push notification bindings for iOS/macOS: permission requests, APNs token retrieval, badge count. Android stub with FCM planned.</li>
        <li><strong>perry/storekit</strong> — StoreKit 2 in-app purchase bindings: product loading, purchases with JWS receipts, subscription checking, restore, and transaction listeners.</li>
      </ul>
      <p>
        Both follow the same architecture: TypeScript declarations → Rust FFI crate → Swift bridge. Install as a dependency, import the functions, <code>await</code> the results. The compiler handles all native bridging.
      </p>

      <h2>Infrastructure</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — eight minor versions of register allocation, x64 fixes, and stack slot alignment improvements</li>
        <li><strong>Windows function splitting</strong> — auto-splits functions with 50+ statements into continuations to work around Cranelift codegen issues on Windows</li>
        <li><strong>Selective module-var loading</strong> — only loads referenced module-level variables at function entry, reducing Windows binary size by 26%</li>
        <li><strong>Array.sort() upgrade</strong> — from O(n&sup2;) insertion sort to O(n log n) TimSort-style hybrid</li>
        <li><strong>perry run android</strong> — full APK build pipeline: compile, Gradle project generation, assembleDebug, install, launch</li>
        <li><strong>Custom Info.plist entries</strong> — <code>[ios.info_plist]</code> in perry.toml for privacy descriptions, URL schemes, background modes</li>
      </ul>

      <h2>By the Numbers</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Version</strong>: 0.2.197 → 0.4.0 (three major milestones)</li>
        <li><strong>Compilation targets</strong>: 8 → 9 (added watchOS)</li>
        <li><strong>Widget targets</strong>: 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>New crates</strong>: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>New docs</strong>: threading (4 pages), i18n (4 pages), watchOS, expanded widget docs (3 → 8 pages)</li>
        <li><strong>perry/thread implementation</strong>: 1,120 lines of Rust, zero changes to the GC</li>
      </ul>

      <h2>What&apos;s Next</h2>
      <p>
        The threading foundation opens up a lot: parallel HTTP request processing, concurrent file operations, and compute-heavy workloads that were previously blocked by single-threaded execution. On the language side, full regex support remains the biggest gap, and the <code>perry/ui</code> expansion (drag and drop, accessibility, DatePicker) continues.
      </p>
      <p>
        Follow the progress on{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, read the docs at{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, or check the{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}for the full picture.
      </p>
    </>
  );
}

/* ─────────────────────────────────────────────
   Blog 11 — tvOS, Cross-Compile iOS from Linux, Perry Login
   ───────────────────────────────────────────── */

function TvOSCrossCompileContent() {
  return (
    <>
      <p>
        Five days, 120 commits, and Perry jumps from v0.4.0 to v0.4.24. The highlights: tvOS becomes the 10th compilation target, iOS and macOS apps can now be built entirely from Linux, perry login brings usage-based billing, and the Windows UI gets a complete overhaul. Here&apos;s everything that shipped.
      </p>

      <h2>tvOS: The 10th Compilation Target</h2>
      <p>
        Perry now compiles to Apple TV. The tvOS target uses the same SwiftUI renderer as watchOS, sharing the data-driven architecture where Perry builds a UI tree and a shipped Swift host app renders it natively. Combined with the existing <code>@perry/threads</code> WASM integration, tvOS apps can run compute-heavy workloads in the background while keeping the UI responsive.
      </p>
      <pre><code>{`# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos`}</code></pre>
      <p>
        This brings the total target count to <strong>10</strong>: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly, and Web/JavaScript. One TypeScript codebase, ten native outputs.
      </p>

      <h2>Cross-Compile iOS and macOS from Linux</h2>
      <p>
        Perry can now build iOS and macOS binaries entirely from a Linux machine using <code>ld64.lld</code> as the Mach-O linker. This is the missing piece for fully automated CI/CD — push TypeScript to a Linux server, get signed native binaries for every Apple platform without a macOS build machine.
      </p>
      <p>
        Getting here required solving a cascade of linker issues:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Mach-O codegen triple</strong> — added <code>aarch64-apple-macos</code> and <code>aarch64-apple-ios</code> target triples for Cranelift</li>
        <li><strong>Framework linking</strong> — CoreGraphics, Metal, IOKit, DiskArbitration framework search paths for cross-compile</li>
        <li><strong><code>-lobjc</code></strong> — ObjC runtime symbols needed for all Apple targets</li>
        <li><strong>SDK version</strong> — <code>sdk_version 26.0</code> in ld64.lld (Apple requires iOS 18+)</li>
        <li><strong>Dead stripping</strong> — <code>-dead_strip</code> instead of <code>-Wl,-dead_strip</code> for the Mach-O linker</li>
        <li><strong>Runtime dedup</strong> — strip duplicate <code>perry_runtime</code> from UI static libs to avoid link errors</li>
      </ul>
      <p>
        Combined with the existing Linux → Windows cross-compilation (v0.2.195+), Perry can now cross-compile to <strong>every platform from Linux</strong> — iOS, macOS, Windows, Android, WASM, and Web.
      </p>

      <h2>iOS App Store Readiness</h2>
      <p>
        A major focus this cycle was making Perry-compiled iOS apps fully App Store compliant:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Full Info.plist</strong> — all Apple-required keys: <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — standard iOS icon naming (<code>AppIcon60x60@2x</code>, etc.) with fallback resolution</li>
        <li><strong>Version from perry.toml</strong> — <code>version</code> and <code>build_number</code> fields flow directly into the Info.plist</li>
        <li><strong>UILaunchScreen</strong> — uses the modern key instead of <code>UILaunchStoryboardName</code> (no storyboard file needed)</li>
        <li><strong>Provisioning profiles</strong> — macOS provisioning profile support for App Store and TestFlight distribution</li>
      </ul>

      <h2>Perry Login and Billing</h2>
      <p>
        Perry now has accounts and usage-based billing, powered by a new <code>perry login</code> CLI command and a dashboard at <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>.
      </p>
      <h3>How It Works</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — GitHub OAuth device flow, opens browser, polls for completion</li>
        <li><strong>Free tier</strong> — 15 builds/month, unlimited projects with a GitHub account</li>
        <li><strong>Pro tier</strong> — unlimited builds via Polar.sh subscription</li>
        <li><strong>API tokens</strong> — generate and manage tokens from the dashboard for CI/CD</li>
        <li><strong>Usage tracking</strong> — monthly publish and verify counters with real-time usage bars</li>
      </ul>
      <p>
        The dashboard itself is a Perry-compiled Fastify server with a Next.js static export — built with Perry, serving Perry users.
      </p>

      <h2>macOS Notarization and Code Signing</h2>
      <p>
        Two new signing capabilities:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — automatically switches to Developer ID certificate (instead of App Store cert), submits to Apple&apos;s notarization service, and staples the result</li>
        <li><strong>GCloud KMS code signing</strong> — Windows builds can now be signed using Google Cloud KMS keys, enabling automated signing in CI without exposing private keys</li>
      </ul>

      <h2>Windows UI Overhaul</h2>
      <p>
        The Windows UI backend received its most comprehensive update yet:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>DPI-aware scaling</strong> — window size, fonts, and widget dimensions scale correctly on high-DPI displays</li>
        <li><strong>Launcher-style window APIs</strong> — borderless windows with custom positioning for launcher/spotlight-style UIs</li>
        <li><strong>Global hotkeys</strong> — system-wide keyboard shortcuts that work even when the app isn&apos;t focused</li>
        <li><strong>App icons</strong> — <code>getAppIcon</code> API for displaying application icons in launcher UIs</li>
        <li><strong>Reentrancy-safe layout</strong> — <code>RefCell</code>-based painting replaced with <code>SetPropW</code> HWND storage to prevent panics during nested WM_PAINT messages</li>
        <li><strong>Geisterhand integration</strong> — all widget types registered with the UI testing framework, <code>/type</code> uses <code>SendMessageW</code> via HWND map</li>
        <li><strong>Android camera support</strong> — camera capture API extended to Android via JNI</li>
      </ul>

      <h2>Performance</h2>
      <p>
        v0.4.14 shipped a comprehensive performance audit:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Native <code>fcmp</code></strong> — floating-point comparisons use native CPU instructions instead of runtime function calls. Mandelbrot benchmark <strong>30% faster</strong>.</li>
        <li><strong>In-place string append</strong> — <code>str += &quot;text&quot;</code> modifies the buffer in place instead of allocating a new string. <strong>125x faster</strong> for repeated concatenation.</li>
        <li><strong>Short-circuit AND/OR</strong> — <code>&amp;&amp;</code> and <code>||</code> skip evaluation of the right operand when the result is already determined.</li>
        <li><strong>Negative literal folding</strong> — <code>-1</code>, <code>-0.5</code> etc. are folded to constants at HIR level instead of emitting a negation instruction.</li>
      </ul>

      <h2>Hub Parallel Builds</h2>
      <p>
        The build orchestration server now supports concurrent builds per worker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Slot-based dispatch</strong> — workers report <code>max_concurrent</code> capacity, Hub tracks active jobs per worker</li>
        <li><strong>No more 429s</strong> — jobs queue instead of being rejected when all workers are busy</li>
        <li><strong>Base64 artifact downloads</strong> — binary artifacts served as base64 when the Perry runtime can&apos;t handle raw binary HTTP responses</li>
        <li><strong>Auto-reconnect WebSocket</strong> — build monitoring connections automatically reconnect on disconnect</li>
      </ul>

      <h2>New Package: perry/appstorereview</h2>
      <p>
        A new first-party package for prompting app store reviews:
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        One function, two platforms, native review UI. Timing and display logic is left entirely to the developer.
      </p>

      <h2>Codegen Fixes</h2>
      <p>
        120 commits means a lot of bug fixes. The most impactful:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Strict equality (===)</strong> — three separate bugs fixed in v0.4.2: type tag comparison, NaN handling, and null/undefined distinction</li>
        <li><strong>String comparison for concatenated strings</strong> — <code>===</code> failed when comparing strings built via concatenation due to pointer comparison instead of content comparison</li>
        <li><strong>Constructor resolution</strong> — <code>new X(args)</code> now correctly resolves cross-module imported constructors and closure-based constructor functions</li>
        <li><strong>Module-level array push</strong> — values pushed to module-level arrays inside nested function calls in loops were lost due to stale pointers after reallocation</li>
        <li><strong>Null arithmetic coercion</strong> — <code>null + 1</code> now correctly produces <code>1</code> via <code>js_number_coerce</code></li>
        <li><strong>Bitwise NOT wrapping</strong> — <code>~x</code> now wraps to i32 as per ECMAScript semantics</li>
        <li><strong>fetch().then()</strong> — callbacks never fired in native UI apps due to missing event loop drain (v0.4.3)</li>
        <li><strong>WASM modulo and exponent</strong> — <code>%</code> and <code>**</code> operators caused WASM validation errors (v0.4.5)</li>
      </ul>

      <h2>By the Numbers</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 commits</strong> to the main Perry compiler in 5 days</li>
        <li><strong>24 patch releases</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>Compilation targets</strong>: 9 → 10 (added tvOS)</li>
        <li><strong>Cross-compile targets from Linux</strong>: Windows → Windows, iOS, macOS (all Apple + Windows)</li>
        <li><strong>New packages</strong>: perry/appstorereview</li>
        <li><strong>New infrastructure</strong>: app.perryts.com dashboard, perry login CLI, Polar.sh billing</li>
        <li><strong>Performance gains</strong>: 30% faster mandelbrot (native fcmp), 125x faster string concatenation</li>
      </ul>

      <h2>What&apos;s Next</h2>
      <p>
        Cross-compiling iOS and macOS from Linux means the Hub can now build for every platform from a single Linux server — no more dedicated macOS build machines for compilation (only for signing). The billing infrastructure opens the path to Hub public beta. And with tvOS added, Perry covers every Apple platform: macOS, iOS, iPadOS, watchOS, and tvOS.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hub public beta</strong> — external users can push TypeScript and get native binaries</li>
        <li><strong>Full regex support</strong> — the last major language gap</li>
        <li><strong>perry/ui expansion</strong> — drag and drop, accessibility, DatePicker</li>
        <li><strong>Source maps &amp; debug info</strong> — DWARF debug info for native debugging</li>
      </ul>
      <p>
        Follow the progress on{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, read the docs at{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, or check the{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}for the full picture.
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
  "plugin-systems-are-a-performance-tax": PluginSystemsContent,
  "compiling-hono-trpc-strapi": CompilingFrameworksContent,
  "all-six-platforms-ui-parity": AllSixPlatformsContent,
  "from-compiler-to-ecosystem": FromCompilerToEcosystemContent,
  "the-full-pipeline": TheFullPipelineContent,
  "cross-compile-windows-game-loops-and-parity": CrossCompileWindowsContent,
  "true-multithreading-i18n-and-watchos": TrueMultithreadingContent,
  "tvos-cross-compile-and-perry-login": TvOSCrossCompileContent,
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const ContentComponent = contentMap[slug];
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
