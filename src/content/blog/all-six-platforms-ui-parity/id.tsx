import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Ketika kami meluncurkan versi pertama sistem UI native Perry, &quot;lintas platform&quot;
        berarti macOS berfungsi baik dan lima platform lainnya hanyalah stub. Hari ini, dengan v0.2.162, itu
        tidak lagi benar. Keenam platform — macOS, iOS, iPadOS, Android, Linux, dan Windows — sekarang
        berbagi paritas fitur penuh. Kode TypeScript yang sama dikompilasi menjadi widget native di setiap target.
      </p>
      <p>
        This post walks through what we shipped between v0.2.152 and v0.2.164: a Canvas widget,
        a full NSTableView implementation, 20+ total UI widgets, the{" "}
        <code className="text-amber-400">perry/system</code> module, multi-window support, system
        notifications, keychain access, automatic binary size reduction, and a compile-time plugin system.
        A lot happened.
      </p>

      <h2>Sprint Widget: 20+ Komponen UI Native</h2>
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

      <h2>Canvas: Menggambar 2D dari TypeScript</h2>
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

      <h2>Widget Table: NSTableView Hadir di TypeScript</h2>
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

      <h2>Modul perry/system</h2>
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

      <h2>Paritas Fitur Enam Platform: v0.2.162</h2>
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

      <h2>Pengurangan Ukuran Binary Otomatis</h2>
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

      <h2>Sistem Plugin Waktu Kompilasi</h2>
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

      <h2>Peningkatan Bahasa</h2>
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

      <h2>Apa Selanjutnya</h2>
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
        Jika Anda ingin mengikuti,{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Perry repo
        </a>{" "}
        terbuka. Lihat{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">showcase</Link>
        {" "}untuk melihat apa yang sedang dibangun, atau jelajahi{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}untuk gambaran lengkap.
      </p>
    </>
  );
}
