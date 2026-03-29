import { Link } from "@/i18n/navigation";

export default function Content() {
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
