import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

function IntroducingPerryContent() {
  return (
    <>
      <p>
        We&apos;re excited to introduce Perry — a native TypeScript compiler written in Rust
        that compiles your TypeScript directly to standalone executables. No Node.js runtime,
        no Electron wrapper, no compromises.
      </p>

      <h2>The Vision</h2>
      <p>
        TypeScript is one of the most loved programming languages in the world, but it&apos;s
        always been tethered to JavaScript runtimes. Perry changes that. We believe you should
        be able to write TypeScript and compile it to a native binary that runs on any platform
        — with native UI, native performance, and zero dependencies.
      </p>

      <h2>How It Works</h2>
      <p>
        Perry uses SWC to parse TypeScript, performs type-directed compilation, and generates
        native machine code through Cranelift. The result is a standalone executable — typically
        2-5 MB — that starts instantly and uses minimal memory.
      </p>
      <div className="code-block my-6">
        <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
        <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
        <p className="mt-2"><span className="text-slate-500">$</span> ./app</p>
        <p className="text-slate-300">Hello from native TypeScript!</p>
      </div>

      <h2>Cross-Platform Native UI</h2>
      <p>
        Perry isn&apos;t just for CLI tools. It includes native UI frameworks for six platforms:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit</li>
        <li><strong>iOS</strong> — UIKit</li>
        <li><strong>iPadOS</strong> — UIKit</li>
        <li><strong>Android</strong> — JNI + Views</li>
        <li><strong>Linux</strong> — GTK4</li>
        <li><strong>Windows</strong> — Win32</li>
      </ul>
      <p>
        Write your UI once in TypeScript. Perry compiles it to the platform&apos;s native
        widget toolkit. No web views, no bridges, no abstraction layers that add latency.
      </p>

      <h2>27+ Native Package Implementations</h2>
      <p>
        Perry ships with native implementations of popular npm packages — mysql2, pg, mongodb,
        axios, bcrypt, express, and more. These aren&apos;t wrappers around Node.js modules;
        they&apos;re compiled directly into your binary using native system libraries.
      </p>

      <h2>What&apos;s Next</h2>
      <p>
        Perry is in active development with 62 out of 62 tests passing. We&apos;re working on
        expanding the UI widget library, adding WASM compilation targets, and building
        multi-threading support. Check out the <a href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</a> for
        the full picture.
      </p>
    </>
  );
}

function CrossPlatformUIContent() {
  return (
    <>
      <p>
        One of Perry&apos;s most ambitious goals is delivering truly native GUI applications
        from a single TypeScript codebase. Not web views wrapped in a native shell — real
        native widgets rendered by each platform&apos;s own UI framework.
      </p>

      <h2>The Problem with Current Approaches</h2>
      <p>
        Electron apps ship an entire Chromium browser. React Native uses a bridge layer.
        Flutter draws its own pixels. Each approach makes trade-offs between developer
        experience, performance, and native fidelity.
      </p>
      <p>
        Perry takes a different approach: compile TypeScript UI code directly to each
        platform&apos;s native toolkit. The result is an app that&apos;s indistinguishable
        from one written in Swift, Kotlin, or C++.
      </p>

      <h2>Platform Mapping</h2>
      <p>
        Perry maps a common TypeScript UI API to each platform&apos;s native framework:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField, etc.)</li>
        <li><strong>iOS &amp; iPadOS</strong> — UIKit (UIViewController, UIView, UIButton, etc.)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, TextView, etc.)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry, etc.)</li>
        <li><strong>Windows</strong> — Win32 (HWND, CreateWindowEx, message loop, etc.)</li>
      </ul>

      <h2>How Compilation Works</h2>
      <p>
        When Perry encounters a UI component in your TypeScript code, it resolves the target
        platform and emits the appropriate native API calls. A <code className="text-perry-400">Button</code> component
        becomes an <code className="text-perry-400">NSButton</code> on macOS, a <code className="text-perry-400">UIButton</code> on
        iOS, a <code className="text-perry-400">android.widget.Button</code> on Android, and so on.
      </p>
      <div className="code-block my-6">
        <p className="text-slate-500">// TypeScript source</p>
        <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
        <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;My App&quot;</span>);</p>
        <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addText</span>(<span className="text-green-400">&quot;Hello, native world!&quot;</span>);</p>
        <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addButton</span>(<span className="text-green-400">&quot;Click me&quot;</span>, () =&gt; {"{"}</p>
        <p>  console.<span className="text-yellow-400">log</span>(<span className="text-green-400">&quot;Native button clicked!&quot;</span>);</p>
        <p>{"}"});</p>
        <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
      </div>

      <h2>No Abstraction Penalty</h2>
      <p>
        Because Perry compiles to native code at build time, there&apos;s no runtime bridge,
        no message passing, and no serialization overhead. Your app calls directly into the
        platform SDK, just like a native app would.
      </p>

      <h2>Current Status</h2>
      <p>
        All six platform backends are implemented and stable. We&apos;re actively expanding
        the widget library with more controls like SecureField, ProgressView, Alert, and
        state management primitives. See the <a href="/roadmap" className="text-perry-400 hover:text-perry-300">roadmap</a> for
        details.
      </p>
    </>
  );
}

function BuildingPryContent() {
  return (
    <>
      <p>
        Pry is a native JSON viewer built entirely in TypeScript and compiled with Perry.
        It&apos;s a real-world showcase of what Perry can do — a fully native app with tree
        navigation, search, keyboard shortcuts, and clipboard support, all compiled to a
        standalone binary.
      </p>

      <h2>What Pry Does</h2>
      <p>
        Pry reads JSON files (or stdin) and renders them as an interactive, navigable tree.
        It supports:
      </p>
      <ul className="list-disc list-inside">
        <li>Collapsible tree view for nested JSON structures</li>
        <li>Full-text search across keys and values</li>
        <li>Keyboard shortcuts for fast navigation</li>
        <li>Copy-to-clipboard for any node or subtree</li>
        <li>Status bar showing node count, depth, and file info</li>
      </ul>

      <h2>The TypeScript Source</h2>
      <p>
        Pry is written in standard TypeScript. The UI is defined using Perry&apos;s native UI
        API, which maps to AppKit on macOS, UIKit on iOS, and Android Views on Android.
      </p>
      <div className="code-block my-6">
        <p className="text-slate-500">// Pry entry point (simplified)</p>
        <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
        <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
        <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">json</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-yellow-400">readFile</span>(process.argv[2]));</p>
        <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>);</p>
        <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addSearchBar</span>({"{"} placeholder: <span className="text-green-400">&quot;Search JSON...&quot;</span> {"}"});</p>
        <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addTreeView</span>(<span className="text-cyan-400">json</span>);</p>
        <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">addStatusBar</span>();</p>
        <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
      </div>

      <h2>Compilation</h2>
      <p>
        Perry compiles this TypeScript source to a native ARM64 binary. The process is
        straightforward:
      </p>
      <div className="code-block my-6">
        <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
        <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
        <p className="mt-2"><span className="text-slate-500">$</span> ./pry data.json</p>
        <p className="text-slate-500"># Opens native macOS window with JSON tree</p>
      </div>

      <h2>No Runtime, No Web Views</h2>
      <p>
        The compiled Pry binary has zero runtime dependencies. It doesn&apos;t bundle a
        JavaScript engine, a browser, or a framework runtime. It calls AppKit/UIKit/Android
        APIs directly, just like a native app written in Swift or Kotlin would.
      </p>

      <h2>Multi-Platform Support</h2>
      <p>
        Pry currently supports macOS, iOS, and Android. The same TypeScript source compiles
        to native apps on all three platforms. Perry handles the platform-specific UI mapping
        at compile time, so each platform gets a truly native experience.
      </p>

      <h2>Try It Yourself</h2>
      <p>
        Check out the <a href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry showcase page</a> for
        screenshots and more details, or browse the source on{" "}
        <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">GitHub</a>.
      </p>
    </>
  );
}

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
