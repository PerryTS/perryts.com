import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Một tuần trước, Perry là một trình biên dịch với bộ công cụ UI. Bạn có thể viết TypeScript, biên dịch nó
        thành binary native, và phân phối trên sáu nền tảng. Đó là câu chuyện. Hôm nay câu chuyện lớn hơn: Perry đang trở thành một hệ sinh thái. Ba ORM cơ sở dữ liệu, push notification đa nền tảng,
        build phân tán với xuất bản App Store và Play Store, lớp tương thích React,
        và xác minh ứng dụng tự động — tất cả đã ra mắt trong tuần qua.
      </p>
      <p>
        This post covers what shipped, why it matters, and what the code looks like.
      </p>

      <h2>perry/ui: Nền tảng</h2>
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

      <h2>Tương thích React: Một lớp mỏng trên perry/ui</h2>
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

      <h2>Ba ORM Cơ sở dữ liệu: API Prisma, Hiệu năng Native</h2>
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

      <h2>perry-push: Push Notification đa nền tảng</h2>
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

      <h2>Perry Hub + Builder: Build đám mây phân tán</h2>
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

      <h2>perry-verify: Xác minh ứng dụng tự động</h2>
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

      <h2>Pry ra mắt khắp nơi</h2>
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

      <h2>Tất cả điều này có ý nghĩa gì</h2>
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

      <h2>Tiếp theo là gì</h2>
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
