import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        103 commit cho trình biên dịch Perry tuần này. Các tính năng nổi bật: bạn giờ có thể biên dịch chéo
        các tệp thực thi Windows từ Linux, ứng dụng iOS có thể chạy game loop blocking, trình biên dịch báo cáo
        crash cho telemetry, và trình biên dịch tự host vượt qua mọi bài kiểm tra xác định mà chúng tôi đưa ra.
        Cộng thêm nâng cấp hạ tầng Hub lớn và hơn 50 bản sửa lỗi.
      </p>

      <h2>Biên dịch chéo sang Windows từ Linux</h2>
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

      <h2>Hỗ trợ Game Loop iOS</h2>
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

      <h2>Báo cáo sự cố</h2>
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

      <h2>Hub: Pipeline Build Windows hai giai đoạn</h2>
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

      <h2>Đại tu tài liệu</h2>
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

      <h2>API Menu đa nền tảng</h2>
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

      <h2>Perry React: Bảng Kanban</h2>
      <p>
        The React compatibility layer got a real-world test: a full 5-column Kanban board with
        move, add, delete, and view operations. Building it uncovered and fixed nested array
        children rendering in JSX — the recursive{" "}
        <code className="text-amber-400">_appendChildren</code> handler now properly flattens
        arrays returned from <code className="text-amber-400">.map()</code> calls. There&apos;s
        also a new 14-section Kitchen Sink WorkBench demo covering various UI patterns.
      </p>

      <h2>Anvil: 100% Tương đương bài kiểm tra xác định</h2>
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

      <h2>Hơn 50 bản sửa lỗi</h2>
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

      <h2>Bằng số liệu</h2>
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

      <h2>Tiếp theo là gì</h2>
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
