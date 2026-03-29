import { Link } from "@/i18n/navigation";

export default function Content() {
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
