import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        1週間前、PerryはUIツールキットを持つコンパイラでした。TypeScriptを書き、ネイティブバイナリにコンパイルし、
        6つのプラットフォームで配布できました。それがストーリーでした。今日、ストーリーはより大きくなりました：
        Perryはエコシステムへと進化しています。3つのデータベースORM、ユニバーサルプッシュ通知、
        App StoreとPlay Storeへの公開を伴う分散ビルド、React互換レイヤー、
        そして自動アプリ検証 — すべてがこの1週間で実現しました。
      </p>
      <p>
        この投稿では、リリースされた内容、その重要性、そしてコードの見た目について説明します。
      </p>

      <h2>perry/ui：基盤</h2>
      <p>
        新しいライブラリに入る前に、すべての中心にあるものを強調する価値があります：
        <code className="text-amber-400">perry/ui</code>。これはPerryの独自ネイティブUIツールキットで、
        6つすべてのターゲットでプラットフォームネイティブコンポーネントに直接コンパイルされる20以上のウィジェットを備えています。
        ラッパーではなく、抽象化レイヤーでもなく、Webビューでもありません。
        すべての<code className="text-amber-400">Button</code>はmacOSでは{" "}
        <code className="text-amber-400">NSButton</code>に、iOSでは{" "}
        <code className="text-amber-400">UIButton</code>に、Linuxでは{" "}
        <code className="text-amber-400">GtkButton</code>に、Androidでは{" "}
        <code className="text-amber-400">android.widget.Button</code>に、Windowsでは{" "}
        <code className="text-amber-400">CreateWindowEx</code>コントロールになります。
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code>はPerryの主要かつ最も高度な
        UIサーフェスです。リアクティブな状態管理、レイアウトコンテナ（VStack、HStack、
        ZStack、SplitView）、ハードウェアアクセラレーションされたCanvas、カラムソート付きTableビュー、
        ファイルダイアログ、キーチェーンアクセス、通知、マルチウィンドウのための{" "}
        <code className="text-amber-400">perry/system</code>モジュールを含みます — すべてTypeScriptから、
        すべてプラットフォームAPIへの直接呼び出しにコンパイルされます。React互換レイヤーを含むPerryの他のすべてのUIアプローチは、
        <code className="text-amber-400">perry/ui</code>の上に構築され、そのウィジェットにマッピングされます。
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
        リアクティブな<code className="text-amber-400">State</code>オブジェクトが重要なプリミティブです。
        State値が変更されると、その状態にバインドされたウィジェットだけが更新されます — 仮想DOMの差分比較なし、
        フルツリーの再レンダリングなし、リコンシリエーションパスなし。TypeScriptからネイティブプラットフォームUIへの
        最も直接的なパスです。
      </p>

      <h2>React互換性：perry/ui上の薄いレイヤー</h2>
      <p>
        Reactから来た開発者のために、<code className="text-amber-400">perry-react</code>{" "}
        はReactのコンポーネントモデルを{" "}
        <code className="text-amber-400">perry/ui</code>のウィジェットにマッピングする互換レイヤーを提供します。{" "}
        <code className="text-amber-400">useState</code>、{" "}
        <code className="text-amber-400">useRef</code>、{" "}
        <code className="text-amber-400">useReducer</code>、そしてJSXを使用でき、Perryはそれらを
        同じネイティブウィジェットにコンパイルします。これは便利なブリッジであり、別のレンダリングエンジンではありません。
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
        内部では、すべてのJSX要素が<code className="text-amber-400">perry/ui</code>{" "}
        ウィジェットにマッピングされます：<code className="text-amber-400">{`<div>`}</code>はVStackに、{" "}
        <code className="text-amber-400">{`<button>`}</code>はButtonに、{" "}
        <code className="text-amber-400">useState</code>はPerryのリアクティブStateで実装されています。
        まだ初期段階です — フルツリー再レンダリングとグローバルフックストレージのフェーズ1ですが、
        既存のReactコードがPerryを通じてネイティブプラットフォームをターゲットにできることを証明しています。
        同様のアプローチでAngularとIonicの互換性も検討中です。
      </p>

      <h2>3つのデータベースORM：Prisma API、ネイティブパフォーマンス</h2>
      <p>
        データベースと通信するサーバーやデスクトップアプリを構築しているなら、Perryは
        Prisma互換の3つのORMでカバーします：{" "}
        <code className="text-amber-400">perry-prisma</code>（MySQL）、{" "}
        <code className="text-amber-400">perry-sqlite</code>（SQLite）、{" "}
        <code className="text-amber-400">perry-postgres</code>（PostgreSQL）。3つすべてが
        <code className="text-amber-400">@prisma/client</code>のドロップイン置換です。同じAPI、同じ
        クエリパターン、しかしデータベースへの直接FFIを持つネイティブコードにコンパイルされます — Prismaエンジンなし、
        Node.jsなし。
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
        内部では、各ORMは{" "}
        <code className="text-amber-400">sqlx</code>を使用するRust FFIレイヤーに支えられたTypeScriptフロントエンドです。
        クエリフロー：TypeScriptがクエリをJSONにシリアライズし、FFI境界を越えて渡し、Rustがパラメータ化されたSQLを構築し、
        コネクションプール経由で実行し、結果をシリアライズして返します。Prismaスキーマはビルド時に読み込まれます
         — ランタイムのパースはゼロです。
      </p>
      <p>
        3つの実装はコードの約95%を共有しています。違いは予想通りのものです：
        識別子のクォーティング（<code className="text-amber-400">`col`</code> vs{" "}
        <code className="text-amber-400">&quot;col&quot;</code>）、プレースホルダ構文（{" "}
        <code className="text-amber-400">?</code> vs{" "}
        <code className="text-amber-400">$1, $2</code>）、トランザクションセマンティクス。3つすべてが
        PrismaのCRUDサーフェス全体をサポート：findMany、findFirst、findUnique、create、createMany、
        update、updateMany、upsert、delete、deleteMany、count — さらに生SQL、トランザクション、
        10以上のWHEREフィルタオペレーター。
      </p>

      <h2>perry-push：ユニバーサルプッシュ通知</h2>
      <p>
        <code className="text-amber-400">perry-push</code>は、すべてのプラットフォームでプッシュ通知を処理する
        単一のライブラリです：APNs（iOS/macOS）、FCM（Android）、Web Push（ブラウザ）、
        WNS（Windows）。各プロバイダーは、正確に3つの関数を持つRust FFIモジュールです：{" "}
        <code className="text-amber-400">*_provider_new</code>、{" "}
        <code className="text-amber-400">*_provider_close</code>、{" "}
        <code className="text-amber-400">*_send</code>。
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
        暗号化は{" "}
        <code className="text-amber-400">ring</code>で処理されます — APNsとVAPID用のES256 JWT、
        FCMサービスアカウント用のRS256、Web Pushペイロード暗号化用のAES-GCM。すべてネイティブコードにコンパイルされます。
        <code className="text-amber-400">node-gyp</code>なし、OpenSSL依存なし。
      </p>

      <h2>Perry Hub + ビルダー：分散クラウドビルド</h2>
      <p>
        これがインフラストラクチャの動きです。<code className="text-amber-400">perry-hub</code>は
        ビルドオーケストレーションサーバーで、Perry自身によってTypeScriptからコンパイルされたもので、
        ビルドワーカーのプールを管理します。プロジェクトをプッシュすると、ハブがターゲットプラットフォームに基づいて
        適切なワーカーにディスパッチし、ワーカーがコンパイル、署名、そしてオプションでアプリを公開します。
      </p>
      <p>
        現在2つのワーカーが存在します：macOSビルダー（macOS、iOS、Androidターゲットを処理）と
        Linuxビルダー（LinuxとAndroidを処理）。どちらもWebSocket経由でハブに接続し、
        ソースtarballをダウンロードし、Perryコンパイラを実行し、アーティファクトをアップロードするRustバイナリです。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>コード署名</strong> — macOSのApple公証、iOSのプロビジョニングプロファイル、Androidキーストア署名</li>
        <li><strong>App Store公開</strong> — App Store ConnectとGoogle Play Storeへの直接アップロード</li>
        <li><strong>アーティファクト管理</strong> — ビルドされたバイナリがTTLベースのクリーンアップでハブにアップロード</li>
        <li><strong>ライセンス管理</strong> — ライセンスごとのレート制限、優先キューイング（プロティアが優先）</li>
      </ul>
      <p>
        ハブ自体は興味深いケーススタディです。約1,500行のTypeScriptファイルがPerryによって2 MBのネイティブバイナリに
        コンパイルされています。HTTP用にポート3456でFastifyを、WebSocket用にポート3457で{" "}
        <code className="text-amber-400">ws</code>を実行します。すべての状態はJSON永続化を伴う
        インメモリです — 外部データベースなし。<code className="text-amber-400">scp</code>と
        systemdユニットファイルでデプロイできる種類のサーバーです。
      </p>

      <h2>perry-verify：自動アプリ検証</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>は、コンパイル済みバイナリと設定を受け取り、
        検証パイプラインを実行し、スクリーンショット付きの構造化されたpass/fail結果を返すスタンドアロンHTTPサービスです。
        アプリを起動し、認証フロー（確定的またはAI支援）を実行し、状態をチェックし、証拠をキャプチャします。
      </p>
      <p>
        macOS（アクセシビリティAPI経由）、Linux（AT-SPI）、iOS SimulatorとAndroid Emulatorのスタブ用の
        プラットフォームアダプターが存在します。AIレイヤーは、確定的チェックが不可能な場合のフォールバック認証と
        状態検証にClaudeを使用します。ハブのビルドパイプラインにポストビルドステップとして組み込むように設計されています：
        コンパイル、署名、検証、公開。
      </p>

      <h2>Pryがあらゆる場所で出荷</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>は、
        Perryのショーケースとして構築したネイティブJSONビューアーで、5つのプラットフォームで出荷されるようになりました。{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Mac App Store
        </a>{" "}
        と{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Google Play
        </a>に掲載されており、LinuxとWindows用のネイティブバイナリもあります。同じTypeScriptコードベース、
        5つのプラットフォーム固有のエントリポイント、5つのネイティブバイナリ。このアプローチ全体がエンドツーエンドで
        機能する最も具体的な証拠です — TypeScriptソースからApp Storeリスティングまで。
      </p>

      <h2>これが意味すること</h2>
      <p>
        コンパイラは面白い。エコシステムは便利。先週、Perryは
        「TypeScriptをネイティブにコンパイルできる」から「ネイティブUI、Prismaデータベース、プッシュ通知、
        App Storeに自動公開するビルドを備えたフルアプリを構築できる」に変わりました。
      </p>
      <p>
        ピースがつながり始めています：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong>はTypeScriptからネイティブプラットフォームUIへの最も直接的なパス — リアクティブな状態、20以上のウィジェット、抽象化レイヤーゼロ</li>
        <li><strong>perry-prisma/sqlite/postgres</strong>は既存のデータベースコードが最小限の変更で移植できることを意味します</li>
        <li><strong>perry-push</strong>はプラットフォームごとのライブラリなしでネイティブプッシュ通知を意味します</li>
        <li><strong>perry-hub + ビルダー</strong>は<code className="text-amber-400">perry publish</code>からApp Storeまでワンステップで行けることを意味します</li>
        <li><strong>perry-verify</strong>はソースだけでなくコンパイル済み出力の自動テストを意味します</li>
        <li><strong>perry-react</strong>はReact開発者がおなじみのパターンを使ってPerryに移行でき、すべてが内部でperry/uiにマッピングされることを意味します</li>
      </ul>
      <p>
        これらは理論的なものではありません。ここに挙げたすべてのライブラリには、動作するコード、テスト、
        ドキュメントがあります。いくつかはすでに本番で使用されています — Perryのランディングサイト自体が
        Perryでコンパイルされたサーバーで稼働しており、Pryは2つのアプリストアで公開されています。
      </p>

      <h2>次のステップ</h2>
      <p>
        直近のロードマップ：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/uiの拡張</strong> — ドラッグアンドドロップ、アクセシビリティラベル、カスタムコンテキストメニュー、より多くのレイアウトプリミティブ</li>
        <li><strong>perry-verifyの統合</strong> — ビルドパイプラインでの自動検証</li>
        <li><strong>フレームワーク互換性</strong> — perry/uiへのオンランプとしてのReact、Angular、Ionicレイヤーの改善</li>
        <li><strong>完全な正規表現サポート</strong> — ネイティブにコンパイルされるECMAScript互換の正規表現エンジン</li>
      </ul>
      <p>
        進捗は{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>でフォローするか、{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">ロードマップ</Link>
        {" "}で全体像をご確認ください。
      </p>
    </>
  );
}
