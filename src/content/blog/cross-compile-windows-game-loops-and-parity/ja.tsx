import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        今週、Perryコンパイラに103件のコミット。主要な機能：LinuxからWindowsの実行ファイルをクロスコンパイルできるようになり、iOSアプリでブロッキングゲームループが実行可能になり、コンパイラがテレメトリのためにクラッシュを報告し、セルフホスティングコンパイラがすべての決定論的テストに合格しました。さらにHubインフラの大規模アップグレードと50以上のバグ修正があります。
      </p>

      <h2>LinuxからWindowsへのクロスコンパイル</h2>
      <p>
        Perryは、LinuxホストからWindows <code className="text-amber-400">.exe</code>バイナリを生成できるようになりました。これは、コンパイル全体のためにWindowsビルドマシンを実行せずにWindowsをターゲットにする必要があるCI/CDパイプラインに欠けていたピースです。
      </p>
      <p>
        この実装は、コンパイル時の<code className="text-amber-400">#[cfg]</code>チェックをランタイムのターゲット検出に置き換えます。コンパイラが非WindowsホストでWindowsターゲットを検出すると、新しい<code className="text-amber-400">find_llvm_tool()</code>ヘルパーを通じてRustツールチェーンまたはPATHから<code className="text-amber-400">lld-link</code>、{" "}
        <code className="text-amber-400">llvm-nm</code>、および{" "}
        <code className="text-amber-400">llvm-ar</code>を検索します。Windowsシステムライブラリは、<code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code>で指定された{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          xwin
        </a>スタイルの
        sysrootから提供されます。
      </p>
      <p>
        リンカーは自動的に<code className="text-amber-400">/FORCE:UNRESOLVED</code>を使用し、不足しているUIシンボルのスタブを生成するため、CLIアプリはクリーンにクロスコンパイルされます。Windowsをターゲットにする場合、出力はデフォルトで<code className="text-amber-400">.exe</code>になります。詳細は{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          クロスコンパイルドキュメント
        </a>をご覧ください。
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

      <h2>iOSゲームループサポート</h2>
      <p>
        iOSではUIKitがメインスレッドを所有する必要があります。イベント駆動型アプリには問題ありませんが、ブロッキング<code className="text-amber-400">while (!shouldClose)</code>ループを必要とするゲームにとっては問題です。Perryは<code className="text-amber-400">--features ios-game-loop</code>フラグでこれを解決しました。
      </p>
      <p>
        有効にすると、コンパイラは{" "}
        <code className="text-amber-400">main</code>の代わりに{" "}
        <code className="text-amber-400">_perry_user_main</code>を出力します。ランタイムはメインスレッドで{" "}
        <code className="text-amber-400">UIApplicationMain</code>を呼び出し、バックグラウンドスレッドでユーザーコードを生成する{" "}
        <code className="text-amber-400">main()</code>を提供します。Scene delegateとapp delegateがUIKitの完全なライフサイクルを処理し、ゲームループはブロックされずに実行されます。
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
        これにより、ゲーム、シミュレーション、リアルタイムビジュアライゼーションなど、以前はiOSでは実用的でなかったアプリのカテゴリ全体が可能になります。iOSのポンプとコールバックパスもパニックハンドリングでラップされたため、ゲームループまたはUIKitライフサイクルのどちらでのクラッシュもクリーンにキャッチされます。
      </p>

      <h2>クラッシュレポート</h2>
      <p>
        Perryでコンパイルされたアプリは、起動時にパニックフックと{" "}
        <code className="text-amber-400">SIGSEGV</code>、{" "}
        <code className="text-amber-400">SIGBUS</code>、および{" "}
        <code className="text-amber-400">SIGABRT</code>のシグナルハンドラーをインストールするようになりました。致命的なクラッシュが発生すると、詳細がChirpテレメトリシステム用に<code className="text-amber-400">~/.hone/crash.log</code>に書き込まれます。キャッチされたパニック（{" "}
        <code className="text-amber-400">catch_callback_panic</code>内）はログをクリアするため、真に回復不可能なクラッシュのみが報告されます。
      </p>
      <p>
        これは本番環境対応の機能です。フィールドで何か問題が発生した場合、私たちはそれを把握できます — そしてクラッシュログには、ユーザーに手動での報告を求めることなく問題を診断するための十分なコンテキストが含まれています。
      </p>

      <h2>Hub: 2段階Windowsビルドパイプライン</h2>
      <p>
        Perry Hubのビルドインフラが大幅なアーキテクチャのアップグレードを受けました。以前は、Windows向けのビルドにはコンパイル全体にWindowsワーカーが必要でした。現在、パイプラインは2つのステージに分割されます：
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Linuxワーカーが新しいlld-linkサポートを使用してWindowsアーティファクトをクロスコンパイル</li>
        <li>Hubがプリコンパイル済みアーティファクトを保持し、Windowsワーカー向けにジョブを再キュー</li>
        <li>Windowsワーカーは署名とパッケージングのみを処理 — はるかに軽いタスク</li>
      </ol>
      <p>
        ワーカーが<code className="text-amber-400">complete</code>を{" "}
        <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code>と共に送信すると、Hubは透過的にジョブを再キューします。CLIからはシームレスな単一ビルド体験に見えます。
      </p>
      <p>
        Hubは、Windowsワーカーが接続されていない場合にAzure Windows VMを自動起動するようにもなり、ビルドワーカーは新しいリリースで最新のPerryバージョンに自動更新されます。手動のインフラ管理が減り、ビルドが高速化します。
      </p>

      <h2>ドキュメントの改訂</h2>
      <p>
        今週、{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>に2つの主要なドキュメント書き直しが公開されました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>perry.tomlリファレンス</strong> — すべての設定オプション、バンドルID解決、エントリファイル解決、ビルド番号自動インクリメント、CI/CDの例を網羅した完全なセクションドキュメント
        </li>
        <li>
          <strong>Geisterhandリファレンス</strong> — クロスプラットフォームUIテストフレームワークの完全なAPIドキュメント、プラットフォームセットアップ、テスト自動化パターン、アーキテクチャ概要
        </li>
      </ul>
      <p>
        これらは段階的な更新ではありません。どちらもすべての機能と設定オプションをカバーするゼロからの書き直しです。新しいプロジェクトのセットアップやテストの作成を行う場合は、ここから始めてください。
      </p>

      <h2>クロスプラットフォームメニューAPI</h2>
      <p>
        <code className="text-amber-400">menuClear</code>と{" "}
        <code className="text-amber-400">menuAddStandardAction</code>は以前macOS専用でした。現在は6つのネイティブプラットフォームすべてで動作します。これには、Windowsでの<code className="text-amber-400">dispatch_menu_item</code>における<code className="text-amber-400">RefCell</code>再入パニックの修正も含まれています。
      </p>

      <h3>Android: 16 KBページアラインメント</h3>
      <p>
        Google Playは、ネイティブライブラリに16 KBのページアラインメントを要求するようになりました。Perryは適切な<code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code>{" "}
        を自動的に設定し、コンパニオン<code className="text-amber-400">.so</code>ファイルがAPK/AABに含めるために出力の隣にコピーされます。
      </p>

      <h2>Perry React: カンバンボード</h2>
      <p>
        React互換レイヤーが実世界のテストを受けました：移動、追加、削除、表示操作を備えた完全な5列カンバンボードです。構築する中で、JSXのネストされた配列childrenレンダリングが発見され修正されました — 再帰的な{" "}
        <code className="text-amber-400">_appendChildren</code>ハンドラーが<code className="text-amber-400">.map()</code>呼び出しから返される配列を適切にフラット化するようになりました。さまざまなUIパターンをカバーする14セクションのKitchen Sink WorkBenchデモも新たに追加されました。
      </p>

      <h2>Anvil: 100%決定論的テストパリティ</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — TypeScriptで書かれ、PerryでコンパイルされたセルフホスティングLLVMコンパイラ — が<strong>68件中68件</strong>の決定論的テストに合格し、メインコンパイラの出力と正確に一致するようになりました。唯一の違いは固有のもの（タイムスタンプ、<code className="text-amber-400">Math.random()</code>）であり、11件のテストはUI、タイマー、暗号化、またはまだ実装されていないプラットフォーム固有の機能を必要とするためスキップされています。
      </p>
      <p>
        達成に至った主要な作業：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>インターフェースメソッドディスパッチ</strong> — インターフェース型の変数がObjectHeaderのclass_idベースのディスパッチを通じて正しいメソッドを返すように</li>
        <li><strong>動的プロパティアクセス</strong> — 計算されたプロパティ名のランタイムディスパッチ</li>
        <li><strong>クロージャとthisバインディング</strong> — オブジェクトメソッドの正しいキャプチャセマンティクス</li>
        <li><strong>フェーズ6進行中</strong> — async/await、ジェネレーター、条件修正</li>
      </ul>
      <p>
        決定論的テストの100%パリティは重要なマイルストーンです。セルフコンパイルされた{" "}
        <code className="text-amber-400">anvil</code>バイナリが、テスト可能なすべてのシナリオでメインコンパイラとまったく同じ出力を生成することを意味します。完全なセルフホスティングに向けてギャップは狭まっています。
      </p>

      <h2>50以上のバグ修正</h2>
      <p>
        今週は正確性に関する大きな推進がありました。ハイライト：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — 配列が16要素で切り捨てられなくなり、無効な入力が正しく処理されるように</li>
        <li><strong>Uint8Array</strong> — 配列変数からのコンストラクター、<code className="text-amber-400">.set(source, offset)</code>の実装（以前はno-op）</li>
        <li><strong>BigInt</strong> — クロスモジュール呼び出し用の<code className="text-amber-400">BIGINT_TAG</code>によるNaN-boxing、keccak256の32ビット切り捨て修正</li>
        <li><strong>Optional chaining</strong> — ネストされた条件式、toString検出、戻り値のNaN-boxing</li>
        <li><strong>IndexSet</strong> — <code className="text-amber-400">POINTER_TAG</code>の代わりに<code className="text-amber-400">STRING_TAG</code>を使用するよう文字列NaN-boxingを修正</li>
        <li><strong>MySQL</strong> — DATETIMEおよびBLOB型、<code className="text-amber-400">Date(string)</code>コンストラクター</li>
        <li><strong>Math.min/max</strong> — スプレッド引数の処理</li>
        <li><strong>ネイティブメソッドディスパッチ</strong> — <code className="text-amber-400">POINTER_TAG</code>オブジェクトのfield-scan-and-call</li>
      </ul>
      <p>
        これらはエッジケースではありません。JSON.parseが配列を16要素で切り捨てると、あらゆる実際のアプリケーションが壊れます。Uint8Array.setがno-opだと、データがサイレントに破損します。これらは、一度に1つの正確性バグを修正しながら、コンパイラを本番グレードにする修正です。
      </p>

      <h2>数字で見る成果</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103コミット</strong>をPerryメインコンパイラに</li>
        <li><strong>3バージョン</strong>: v0.2.195、v0.2.196、v0.2.197</li>
        <li><strong>1つの主要機能</strong>: LinuxからWindowsへのクロスコンパイル</li>
        <li><strong>1つの新しいアプリカテゴリ</strong>: iOSゲームループ</li>
        <li><strong>68/68</strong> perrysdadの決定論的テストパリティ</li>
        <li><strong>50以上のバグ修正</strong>：NaN-boxing、stdlib、ネイティブFFI全体</li>
        <li><strong>2つのドキュメント書き直し</strong>: perry.tomlとGeisterhand</li>
        <li><strong>5つのHub改善</strong>: 2段階パイプライン、Azure自動起動、ワーカー自動更新</li>
      </ul>

      <h2>次のステップ</h2>
      <p>
        Windowsクロスコンパイルは、完全に自動化されたマルチプラットフォームCI/CDへの扉を開きます — TypeScriptをプッシュすれば、各OS専用のビルドマシンなしで、すべてのターゲット向けのネイティブバイナリが得られます。ゲームループサポートは、iOSアプリのまったく新しいカテゴリを解き放ちます。そしてperrysdadの100%決定論的テストパリティは、セルフホスティングが非常に現実的になっていることを意味します。残っているもの：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>完全なregexサポート</strong> — 最後の主要な言語ギャップ</li>
        <li><strong>perry/uiの拡張</strong> — ドラッグアンドドロップ、アクセシビリティラベル、DatePicker</li>
        <li><strong>perrysdadフェーズ6</strong> — async/await、ジェネレーター、完全なPerryパリティに向けた拡張</li>
        <li><strong>Hubパブリックベータ</strong> — 分散ビルドを外部ユーザーに開放</li>
      </ul>
      <p>
        進捗状況は{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>でフォロー、ドキュメントは{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>で閲覧、または{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">ロードマップ</Link>
        {" "}で全体像をご確認ください。
      </p>
    </>
  );
}
