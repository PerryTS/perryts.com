import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        五天，120 次提交，Perry 从 v0.4.0 跃升至 v0.4.24。亮点：tvOS 成为第 10 个编译目标，iOS 和 macOS 应用现在可以完全从 Linux 构建，perry login 带来基于使用量的计费，Windows UI 进行了全面改造。以下是所有发布内容。
      </p>

      <h2>tvOS：第 10 个编译目标</h2>
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

      <h2>从 Linux 交叉编译 iOS 和 macOS</h2>
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

      <h2>iOS App Store 就绪</h2>
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

      <h2>Perry 登录和计费</h2>
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

      <h2>macOS 公证和代码签名</h2>
      <p>
        Two new signing capabilities:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — automatically switches to Developer ID certificate (instead of App Store cert), submits to Apple&apos;s notarization service, and staples the result</li>
        <li><strong>GCloud KMS code signing</strong> — Windows builds can now be signed using Google Cloud KMS keys, enabling automated signing in CI without exposing private keys</li>
      </ul>

      <h2>Windows UI 全面改造</h2>
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

      <h2>性能</h2>
      <p>
        v0.4.14 shipped a comprehensive performance audit:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Native <code>fcmp</code></strong> — floating-point comparisons use native CPU instructions instead of runtime function calls. Mandelbrot benchmark <strong>30% faster</strong>.</li>
        <li><strong>In-place string append</strong> — <code>str += &quot;text&quot;</code> modifies the buffer in place instead of allocating a new string. <strong>125x faster</strong> for repeated concatenation.</li>
        <li><strong>Short-circuit AND/OR</strong> — <code>&amp;&amp;</code> and <code>||</code> skip evaluation of the right operand when the result is already determined.</li>
        <li><strong>Negative literal folding</strong> — <code>-1</code>, <code>-0.5</code> etc. are folded to constants at HIR level instead of emitting a negation instruction.</li>
      </ul>

      <h2>Hub 并行构建</h2>
      <p>
        The build orchestration server now supports concurrent builds per worker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Slot-based dispatch</strong> — workers report <code>max_concurrent</code> capacity, Hub tracks active jobs per worker</li>
        <li><strong>No more 429s</strong> — jobs queue instead of being rejected when all workers are busy</li>
        <li><strong>Base64 artifact downloads</strong> — binary artifacts served as base64 when the Perry runtime can&apos;t handle raw binary HTTP responses</li>
        <li><strong>Auto-reconnect WebSocket</strong> — build monitoring connections automatically reconnect on disconnect</li>
      </ul>

      <h2>新包：perry/appstorereview</h2>
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

      <h2>代码生成修复</h2>
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

      <h2>数据一览</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 commits</strong> to the main Perry compiler in 5 days</li>
        <li><strong>24 patch releases</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>Compilation targets</strong>: 9 → 10 (added tvOS)</li>
        <li><strong>Cross-compile targets from Linux</strong>: Windows → Windows, iOS, macOS (all Apple + Windows)</li>
        <li><strong>New packages</strong>: perry/appstorereview</li>
        <li><strong>New infrastructure</strong>: app.perryts.com dashboard, perry login CLI, Polar.sh billing</li>
        <li><strong>Performance gains</strong>: 30% faster mandelbrot (native fcmp), 125x faster string concatenation</li>
      </ul>

      <h2>下一步</h2>
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
