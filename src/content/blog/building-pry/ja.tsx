import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry は TypeScript で完全に構築され、Perry でコンパイルされたネイティブ JSON ビューアです。
        技術デモではありません — API レスポンス、設定ファイル、データダンプの検査に毎日使っている
        実際のツールです。この記事では、どのように構築され、どのようにコンパイルされ、TypeScript が
        ネイティブアプリにコンパイルされるときの開発体験がどのようなものかを紹介します。
      </p>

      <h2>Pry の機能</h2>
      <p>
        Pry は JSON ファイルを読み込み（または stdin から JSON を受け取り）、ネイティブウィンドウで
        インタラクティブなナビゲーション可能なツリーとしてレンダリングします。macOS の Quick Look で
        JSON を見たことがあれば、それを想像してください — ただし、より高速で、検索可能で、
        キーボード駆動のナビゲーション付きです。
      </p>
      <p>
        機能セット：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>ツリービュー</strong> — オブジェクトと配列の折りたたみ可能なノード、深さインジケータ、すべて展開/折りたたみ</li>
        <li><strong>検索</strong> — キーと値の全文検索、リアルタイムハイライト、マッチナビゲーション</li>
        <li><strong>キーボードショートカット</strong> — 矢印キーでナビゲート、Enter で展開/折りたたみ、スラッシュで検索、<code className="text-perry-400">⌘C</code> でコピー</li>
        <li><strong>クリップボード</strong> — 任意のノードまたはサブツリーをフォーマット済み JSON としてコピー</li>
        <li><strong>シンタックスカラーリング</strong> — 文字列は緑、数値はオレンジ、ブール値は紫、null は赤</li>
        <li><strong>ステータスバー</strong> — 合計ノード数、現在の深さ、ファイルサイズ、パース時間を表示</li>
      </ul>

      <h2>ソースコード</h2>
      <p>
        Pry は標準的な TypeScript で書かれています。特別な構文もマクロもビルド時のコード生成も
        ありません。Perry の UI API を使用しており、プラットフォーム固有のコードにコンパイルされる
        ネイティブウィジェットを提供します。
      </p>
      <p>
        エントリポイントは以下の通りです（分かりやすくするために簡略化）：
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
        これがネイティブアプリケーションの核心です。フレームワークのボイラープレートなし、ビルド設定なし、
        プラットフォーム固有のファイルなし。1つの TypeScript ファイルです。
      </p>

      <h3>ヘルパー関数</h3>
      <p>
        Pry には JSON ツリーのすべてのノードを再帰的にカウントする <code className="text-perry-400">countNodes</code>
        ユーティリティと、ファイルサイズを表示するための <code className="text-perry-400">formatBytes</code>
        ヘルパーも含まれています。これらは標準的な TypeScript 関数で、Perry 固有のものは何もありません。
        他のすべてと同様にネイティブコードにコンパイルされます。
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

      <h2>Pry のコンパイル</h2>
      <p>
        Perry で Pry をコンパイルするのは1つのコマンドです。Xcode プロジェクトも Gradle 設定も
        webpack 設定も不要。Perry をエントリファイルに向けてターゲットを指定するだけです。
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
        バイナリは 48 MB です。完全な AppKit UI スタック — ツリービューレンダリング、検索ハイライト、
        シンタックスカラーリング、キーボードハンドリングを含むためです。比較として、同じアプリを
        Electron で作ると 200+ MB になります。CLI のみの Perry アプリは 2～5 MB にコンパイルされます。
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        iOS ビルドは AppKit の代わりに UIKit にリンクします。Perry は同じ{" "}
        <code className="text-perry-400">TreeView</code> API を展開可能なセクション付きの
        <code className="text-perry-400">UITableView</code> に、<code className="text-perry-400">SearchBar</code> を{" "}
        <code className="text-perry-400">UISearchBar</code> にマッピングし、タッチイベントがマウスイベントに代わります。
        iOS ビルドは物理デバイスとシミュレータにデプロイできます。
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Android ビルドは JNI を通じてロードされるネイティブライブラリを生成し、APK にパッケージングされます。{" "}
        <code className="text-perry-400">TreeView</code> は展開可能なビューホルダー付きの
        <code className="text-perry-400">RecyclerView</code> にマッピングされ、
        <code className="text-perry-400">SearchBar</code> は <code className="text-perry-400">TextWatcher</code> 付きの{" "}
        <code className="text-perry-400">EditText</code> にマッピングされ、ステータスバーはレイアウト下部の
        <code className="text-perry-400">TextView</code> にマッピングされます。
      </p>

      <h2>内部で何が起こっているか</h2>
      <p>
        Perry が Pry をコンパイルする際、いくつかのフェーズを経ます：
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>パース</strong> — SWC が TypeScript ソースを AST にパースします。{" "}
          <code className="text-perry-400">perry/ui</code> と <code className="text-perry-400">perry/fs</code> からの
          インポートは Perry の組み込みモジュール実装に解決されます。
        </li>
        <li>
          <strong>型解析</strong> — Perry はジェネリックな{" "}
          <code className="text-perry-400">State&lt;string&gt;</code> と{" "}
          <code className="text-perry-400">State&lt;number&gt;</code> を含むすべての型を解決し、
          具体的な型に単相化します。
        </li>
        <li>
          <strong>プラットフォーム解決</strong> — ターゲットフラグに基づいて、Perry は適切な UI バックエンドを
          選択します。各 <code className="text-perry-400">TreeView</code>、{" "}
          <code className="text-perry-400">SearchBar</code>、<code className="text-perry-400">Button</code> の呼び出しが
          プラットフォーム固有の実装に解決されます。
        </li>
        <li>
          <strong>IR 生成</strong> — Perry はネイティブ API 呼び出しを含む中間表現を生成します —
          macOS/iOS では Objective-C メッセージ送信、Android では JNI 呼び出し、GTK4/Win32 では C 関数呼び出し。
        </li>
        <li>
          <strong>コード生成</strong> — Cranelift がターゲットアーキテクチャ向けに IR をネイティブマシンコードに
          コンパイルします。
        </li>
        <li>
          <strong>リンキング</strong> — ネイティブコードがプラットフォームフレームワーク
          （AppKit、UIKit、Android NDK、GTK4、Win32）にリンクされ、最終的な実行ファイルが生成されます。
        </li>
      </ol>

      <h2>ランタイムなし、Web ビューなし</h2>
      <p>
        これは Perry と他のすべての TypeScript-to-native アプローチの核心的な違いであるため、
        強調する価値があります。コンパイルされた Pry バイナリには：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>JavaScript エンジンなし</strong> — V8 なし、Hermes なし、JavaScriptCore なし</li>
        <li><strong>Web ビューなし</strong> — Chromium なし、WebKit なし、WKWebView なし</li>
        <li><strong>ブリッジレイヤーなし</strong> — JS とネイティブ間のシリアライズされたメッセージなし</li>
        <li><strong>フレームワークランタイムなし</strong> — React なし、Flutter エンジンなし、Dart VM なし</li>
      </ul>
      <p>
        バイナリはプラットフォーム API を直接呼び出します。macOS では AppKit オブジェクトとの
        やり取りに <code className="text-perry-400">objc_msgSend</code> を呼び出します。Android では
        ビューの作成と操作に JNI 関数を呼び出します。ネイティブの Swift や Kotlin アプリと
        同じことをしています。
      </p>
      <p>
        実用的な結果：Pry は即座に起動します。VM の起動なし、JIT のウォームアップなし、
        スクリプトのパースなし。プロセスが起動し、ウィンドウが表示され、JSON がレンダリングされます。
        メモリ使用量は Electron の同等品が消費するものの数分の一です。
      </p>

      <h2>開発体験</h2>
      <p>
        Pry の構築は、通常の TypeScript アプリケーションの構築と驚くほど似ていました。
        ワークフローは：
      </p>
      <ol className="list-decimal list-inside">
        <li>お気に入りのエディタ（VS Code、Zed、Neovim など）で TypeScript を書く</li>
        <li><code className="text-perry-400">perry compile pry.ts</code> を実行</li>
        <li><code className="text-perry-400">./pry test.json</code> を実行</li>
        <li>繰り返す</li>
      </ol>
      <p>
        設定すべき Xcode プロジェクトなし。インストールすべき Android Studio なし。
        45 秒かかる Gradle ビルドなし。Perry コンパイラ自体は高速で、Pry のパースとコンパイルには
        数秒しかかからず、さらに高速化に取り組んでいます。
      </p>
      <p>
        書く TypeScript は標準的な TypeScript です。エディタの型チェック、オートコンプリート、
        リファクタリングツールはすべて機能します。関数の抽出、モジュールの作成、
        ジェネリクスの使用 — すでに知っている TypeScript のパターンがすべて使えます。
      </p>

      <h2>学んだこと</h2>
      <p>
        Pry の構築から、Perry の UI API が何をサポートすべきかについて多くのことを学びました。いくつかの教訓：
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>ツリービューは複雑です。</strong>展開、折りたたみ、検索ハイライト、
          キーボードナビゲーション、クリップボード統合のすべてを協調させる必要があります。Perry の{" "}
          <code className="text-perry-400">TreeView</code> ウィジェットはこれを内部で処理しますが、
          ネイティブ実装が3つのプラットフォームすべてで一貫していることを確認する必要がありました。
        </li>
        <li>
          <strong>キーボードショートカットにはプラットフォームの慣習が必要です。</strong>macOS では
          コピーは <code className="text-perry-400">⌘C</code> です。Linux と Android では{" "}
          <code className="text-perry-400">Ctrl+C</code> です。Perry のショートカットシステムはこれを抽象化しますが、
          正しく動作させるには慎重な実装が必要でした。
        </li>
        <li>
          <strong>ステータスバーは意外と簡単ではありません。</strong>各プラットフォームには、
          ステータス情報をどこにどのように表示するかについて異なる慣習があります。AppKit はウィンドウの
          下部バー、UIKit はツールバー、Android はレイアウト内の下部ビューを使用します。Perry の{" "}
          <code className="text-perry-400">StatusBar</code> はそれぞれに正しくマッピングされます。
        </li>
        <li>
          <strong>stdin サポートにはプラットフォーム認識が必要でした。</strong>macOS と Linux では、
          stdin からの読み取りは簡単です。iOS と Android では「stdin」は同じ形では存在しないため、
          Pry はモバイルプラットフォームではファイル選択を代わりに使用します。Perry の{" "}
          <code className="text-perry-400">readStdin</code> はこれを透過的に処理します。
        </li>
      </ul>

      <h2>パフォーマンス</h2>
      <p>
        Pry は大きな JSON ファイルを快適に処理します。テスト結果：
      </p>
      <ul className="list-disc list-inside">
        <li>1 MB の JSON ファイル（10,000 以上のノード）のパースとレンダリングが 50 ms 未満</li>
        <li>10 MB の JSON ファイルのレンダリングが 200 ms 未満</li>
        <li>10,000 ノードの検索結果が入力中にリアルタイムで表示、目に見えるラグなし</li>
        <li>大きなファイルでもメモリ使用量が 50 MB 未満</li>
      </ul>
      <p>
        これがネイティブコンパイルの利点です。Perry での JSON パースは GC ポーズのない
        タイトなネイティブループにコンパイルされます。ツリーレンダリングにはプラットフォーム固有の
        仮想化リストビュー（NSOutlineView、UITableView、RecyclerView）を使用しており、
        パフォーマンスについて実績があります。
      </p>

      <h2>ソースとダウンロード</h2>
      <p>
        Pry はオープンソースです。完全なソースを閲覧したり、自分でビルドしたり、
        Perry ネイティブ UI アプリの構造を理解するためにコードを見ることができます。
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            GitHub リポジトリ
          </a>{" "}
          — 完全なソースコードとビルド手順
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            ショーケースページ
          </Link>{" "}
          — スクリーンショット、機能一覧、プラットフォーム詳細
        </li>
      </ul>
      <p>
        Perry で何かを構築している方は、ぜひお知らせください。{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          Perry リポジトリ
        </a>{" "}
        で Issue を開くかディスカッションを始めてください。Perry はオープンに開発しており、
        実際のアプリを構築している実際のユーザーからのフィードバックは非常に貴重です。
      </p>
    </>
  );
}
