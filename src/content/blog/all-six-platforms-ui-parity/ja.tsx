import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perryのネイティブ UIシステムの最初のバージョンを出荷した時、「クロスプラットフォーム」とは
        macOSがうまく動き、他の5つのプラットフォームはスタブという意味でした。v0.2.162の今日、
        それはもう当てはまりません。6つのプラットフォームすべて — macOS、iOS、iPadOS、Android、Linux、Windows — が
        完全な機能パリティを共有しています。同じTypeScriptコードがすべてのターゲットでネイティブウィジェットにコンパイルされます。
      </p>
      <p>
        この記事では、v0.2.152からv0.2.164の間に出荷したものを紹介します：Canvasウィジェット、
        完全なNSTableView実装、20以上のUIウィジェット、{" "}
        <code className="text-amber-400">perry/system</code> モジュール、マルチウィンドウサポート、
        システム通知、キーチェーンアクセス、自動バイナリサイズ削減、そしてコンパイル時プラグインシステム。
        多くのことがありました。
      </p>

      <h2>ウィジェットスプリント：20以上のネイティブUIコンポーネント</h2>
      <p>
        最大の進歩はv0.2.155で、全プラットフォームにわたって20以上のUIウィジェットが追加されました。
        PerryのTypeScript UI APIは、実際のアプリを出荷するために必要なコンポーネントをカバーしています：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>レイアウト</strong> — VStack、HStack、ZStack、LazyVStack、ScrollView、SplitView</li>
        <li><strong>入力</strong> — Button、TextField、TextEditor、Checkbox、Toggle、Slider、Picker</li>
        <li><strong>表示</strong> — Text、Label、Image、ProgressView、Divider、Spacer</li>
        <li><strong>データ</strong> — List、Table（NSTableView / GTK4 TreeView / Win32 ListView）</li>
        <li><strong>オーバーレイ</strong> — Alert、Sheet、Popover、Toolbar、NavigationBar</li>
        <li><strong>描画</strong> — Canvas（2D描画API、プラットフォームごとにハードウェアアクセラレーション）</li>
      </ul>
      <p>
        これらはカスタムレンダラーのラッパーではありません。各ウィジェットはプラットフォーム固有の
        ネイティブコンポーネントにコンパイルされます：macOSでは <code className="text-amber-400">NSButton</code>、
        iOSでは <code className="text-amber-400">UIButton</code>、
        Linuxでは <code className="text-amber-400">GtkButton</code>、
        AndroidではJNI経由で <code className="text-amber-400">android.widget.Button</code>、
        Windowsでは <code className="text-amber-400">CreateWindowEx</code>。
        OSがそれらを描画し、テーマを適用し、アクセシビリティを処理します — Perryは
        TypeScript APIを接続するだけです。
      </p>

      <h2>Canvas：TypeScriptからの2D描画</h2>
      <p>
        技術的に最も興味深い追加の1つがCanvasウィジェット（v0.2.152）です。TypeScriptから直接
        馴染みのある2D描画API — ベジェ曲線、塗りつぶし、ストローク、画像ブリッティング — を公開し、
        プラットフォームのアクセラレーテッド2Dバックエンドにコンパイルされます：
        macOS/iOSではCore Graphics、LinuxではCairo、WindowsではDirect2D、AndroidではSkia。
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

      <h2>Tableウィジェット：NSTableViewがTypeScriptに</h2>
      <p>
        v0.2.163でTableウィジェットが追加されました — ライブラリ内で最も複雑なコンポーネントです。macOSでは
        完全なdelegate/data sourceの接続を持つ <code className="text-amber-400">NSTableView</code> に対応します。
        LinuxではGTK4の <code className="text-amber-400">GtkTreeView</code> を使用します。Windowsでは
        Win32の <code className="text-amber-400">ListView</code> コントロール。AndroidではJNIを通じて{" "}
        <code className="text-amber-400">RecyclerView</code> にバインドされます。
      </p>
      <p>
        TypeScript APIは宣言的です：カラムを定義し、データソースを提供すれば、Perryがコンパイル時に
        プラットフォーム固有の接続を処理します。カラムソート、選択ハンドリング、行の高さ
        カスタマイズがすべてそのまま動作します。
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

      <h2>perry/system モジュール</h2>
      <p>
        v0.2.155では <code className="text-amber-400">perry/system</code> も導入されました — ランタイムなしで
        プラットフォームのシステムAPIを公開するTypeScriptモジュールです：ファイルダイアログ、
        保存ダイアログ、アラート、シート、キーチェーンアクセス、システム通知、マルチウィンドウ管理。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — ネイティブファイルピッカー（NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME）</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — ネイティブ保存ダイアログ</li>
        <li><code className="text-amber-400">system.showAlert()</code> — ネイティブアラートパネル</li>
        <li><code className="text-amber-400">system.notify()</code> — OS通知（UserNotifications / libnotify / WinRT）</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — マルチウィンドウ管理</li>
      </ul>
      <p>
        これらはすべてネイティブプラットフォームAPIを直接呼び出します — Electron IPCもWeb Viewブリッジもありません。
        PerryはTypeScriptの呼び出しサイトをプラットフォームSDKへの直接的なネイティブ関数呼び出しにコンパイルします。
      </p>

      <h2>6プラットフォーム機能パリティ：v0.2.162</h2>
      <p>
        v0.2.162のマイルストーンはギャップを埋めることでした。このリリース前は、macOSが最も充実した
        機能セットを持ち、iOSはほぼ揃っていましたが、Linux/Windows/Androidは遅れていました。v0.2.162は
        6つのプラットフォームすべてを同じレベルに引き上げました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit、完全なウィジェットセット、Keychain、通知、マルチウィンドウ、ツールバー</li>
        <li><strong>iOS / iPadOS</strong> — UIKit、macOSとの完全なウィジェットパリティ、シーンライフサイクル</li>
        <li><strong>Android</strong> — JNIブリッジ、Android Views経由の全ウィジェット、NDKクロスコンパイル</li>
        <li><strong>Linux</strong> — GTK4、Tableを含む完全なウィジェットセット、ファイルダイアログ、libsecretキーチェーン</li>
        <li><strong>Windows</strong> — Win32、全ウィジェット、Windows Credential Store、WinRT通知</li>
      </ul>
      <p>
        これは「1つのコードベース、6つのプラットフォーム」を願望ではなく現実にするマイルストーンです。
        同じTypeScriptファイルが、一般的なユースケースに対してプラットフォーム固有の
        コードパスを必要とせず、6つすべてのターゲットでネイティブアプリにコンパイルされます。
      </p>

      <h2>自動バイナリサイズ削減</h2>
      <p>
        v0.2.153では自動バイナリサイズ削減が出荷されました — コンパイラは使用されていないコードパスを
        積極的にデッドストリップし、到達不能なstdlib関数を排除し、リンク時にシンボル定義を
        重複排除するようになりました。以前は約4 MBにコンパイルされていた典型的なCLIツールが、
        ソースを変更することなく2 MB以下になります。
      </p>
      <p>
        これは実際のデプロイメントにとって重要です。バイナリがデプロイメントの単位である場合 — サーバーにコピーしたり、
        単一ファイルとして配布したり、コンテナに埋め込んだり — サイズは転送時間とストレージコストに
        直接影響します。バイナリサイズを無料で半分にすることは意味のある改善です。
      </p>

      <h2>コンパイル時プラグインシステム</h2>
      <p>
        v0.2.152ではPerryのプラグインシステムが導入されました — そしてそれはTypeScriptエコシステムの
        他のあらゆるプラグインシステムとはアーキテクチャ的に異なります。ランタイムプラグインローディングなし、
        IPCなし、動的な <code className="text-amber-400">require()</code> なし。プラグインはPerryがビルド時に
        解決しコンパイルするTypeScriptモジュールです。
      </p>
      <p>
        結果：プラグインのランタイムオーバーヘッドは完全にゼロです。アプリケーションコードと同じバイナリにコンパイルされ、
        プラグインコードとホストコード間は直接関数呼び出しです。プラグインを使わなければ、
        バイナリにまったく含まれません。使えば、他のモジュールと同様にインライン化されます。
      </p>
      <p>
        この背景にある哲学については{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          プラグインシステムはパフォーマンスの税金
        </Link>で書きました。要約すると：ランタイムプラグインアーキテクチャはパフォーマンスと拡張性をトレードオフします。
        ビルド時コンポジションは両方を実現します。
      </p>

      <h2>言語の改善</h2>
      <p>
        UIスプリントは単独で起こったわけではありません — コンパイラ自体も継続的により高機能になりました。
        これらのリリースを通じて：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>クラス式</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> が正しくコンパイルされるようになりました</li>
        <li><strong>ジェネレータ変換</strong> — <code className="text-amber-400">function*</code> と <code className="text-amber-400">yield</code> がネイティブステートマシンにコンパイルされます</li>
        <li><strong>クラスフィールドとしてのMap/Set</strong> — <code className="text-amber-400">private items = new Map()</code> がコード生成で動作します</li>
        <li><strong>FFIパラメータ型強制</strong> — ネイティブライブラリ呼び出しが型強制を自動的に処理します</li>
        <li><strong>バウンドメソッド参照</strong> — <code className="text-amber-400">this.method</code> 参照がネイティブモジュール（fs、os、path）で動作します</li>
        <li><code className="text-amber-400">string.match()</code> — 完全サポートされるようになりました</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>、マルチ引数 <code className="text-amber-400">path.join()</code>、<code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Webターゲット</strong> — Perryはハイブリッドデプロイメント用のWeb互換出力にコンパイルできるようになりました</li>
      </ul>

      <h2>次のステップ</h2>
      <p>
        6プラットフォームのUIパリティが出荷されたので、次のフェーズは広さよりも深さです。現在取り組んでいるのは：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>完全なRegExpサポート（<code className="text-amber-400">regex.test()</code>、<code className="text-amber-400">string.matchAll()</code>）</li>
        <li>ウィジェットシステムでのドラッグアンドドロップ、カスタムコンテキストメニュー、アクセシビリティラベル</li>
        <li>Perry診断とコンパイル・オン・セーブのためのVS Code拡張機能</li>
        <li>パッケージマネージャー統合 — Perryネイティブパッケージのインストールとコンパイルを1コマンドで</li>
        <li>ブラウザデプロイメント用のWASMコンパイルターゲット</li>
        <li><code className="text-amber-400">Worker</code> スレッドによるマルチスレッディング</li>
      </ul>
      <p>
        フォローしたい方は、{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Perryリポジトリ
        </a>
        がオープンです。{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">ショーケース</Link>
        {" "}で既に構築されているものを確認するか、{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">ロードマップ</Link>
        {" "}で全体像をご覧ください。
      </p>
    </>
  );
}
