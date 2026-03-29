import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        七天 82 次提交。49 页的文档站点。自动化 App Store 和 Play Store 发布。
        Homebrew 和 APT 包。从 TypeScript 编译的原生 WidgetKit 扩展。
        自托管 LLVM 编译器。以及所有平台上的数十个错误修复。
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

      <h2>一条命令安装 Perry</h2>
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

      <h2>自动化 App Store 发布</h2>
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

      <h2>新组件和平台改进</h2>
      <p>
        Four new widget types landed this week:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — multi-line text editing on macOS, iOS, and Android</li>
        <li><strong>SecureField</strong> — password input on iOS and macOS</li>
        <li><strong>QR Code</strong> — native QR code generation on iOS, macOS, and Android</li>
        <li><strong>Splash Screen</strong> — auto-generated LaunchScreen storyboards (iOS) and splash themes (Android)</li>
      </ul>

      <h3>iPad 原生化</h3>
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

      <h2>GC 和正确性修复</h2>
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

      <h2>数据一览</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 commits</strong> to the main Perry compiler</li>
        <li><strong>1 release</strong>: v0.2.173 (March 8)</li>
        <li><strong>49 documentation pages</strong> at docs.perryts.com</li>
        <li><strong>4 new widgets</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 distribution channels</strong>: Homebrew, APT, source</li>
        <li><strong>3 automated store pipelines</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>All 6 platforms</strong> received improvements this week</li>
      </ul>

      <h2>下一步</h2>
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
