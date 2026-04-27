import { Link } from "@/i18n/navigation";

export default function Content() {
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
          <a href="https://github.com/perryts/pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
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
