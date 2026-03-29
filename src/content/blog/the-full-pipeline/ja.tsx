import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        7日間で82コミット。49ページのドキュメントサイト。App StoreとPlay Storeへの自動公開。
        HomebrewとAPTパッケージ。TypeScriptからコンパイルされたネイティブWidgetKit拡張。
        セルフホスティングLLVMコンパイラ。そしてすべてのプラットフォームにわたる数十のバグ修正。
      </p>
      <p>
        この投稿では、2026年3月6日から3月13日の間にPerryで出荷されたすべてを取り上げます。テーマは
        完成 — 「TypeScriptを書いた」から「アプリがApp Storeにある」までのギャップを埋めることです。
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perryに本格的なドキュメントサイトができました。mdBookで構築された49ページで、
        入門からCLIリファレンスまですべてをカバーしています。ドキュメントはセクションに整理されています：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>はじめに</strong> — インストール、最初のプロジェクト、プロジェクト構造</li>
        <li><strong>言語機能</strong> — PerryがTypeScriptからサポートするすべて</li>
        <li><strong>ネイティブUI</strong> — すべてのウィジェットタイプ、レイアウト、状態管理、プラットフォーム固有の動作をカバーする12ページ</li>
        <li><strong>プラットフォーム</strong> — 6つのターゲットプラットフォームそれぞれの専用ページ</li>
        <li><strong>標準ライブラリ</strong> — 50以上のネイティブパッケージ実装のドキュメント</li>
        <li><strong>システムAPI</strong> — ファイルダイアログ、キーチェーン、通知、マルチウィンドウ</li>
        <li><strong>WidgetKit</strong> — 新しいウィジェット拡張モジュール</li>
        <li><strong>プラグイン</strong> — コンパイル時プラグインアーキテクチャ</li>
        <li><strong>CLIリファレンス</strong> — すべてのコマンドとフラグ</li>
      </ul>
      <p>
        サイトにはAI発見性のための<code className="text-amber-400">llms.txt</code>ファイルも含まれており、
        GitHub Pagesで{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>のカスタムドメインでデプロイされています。
      </p>

      <h2>ワンコマンドでPerryをインストール</h2>
      <p>
        Perryは、ソースからのビルドに加えて、HomebrewとAPTを通じて配布されるようになりました。新しい
        GitHub Actionsリリースパイプラインが、macOS（arm64とx86_64）と
        Linux（x86_64とarm64）用のバイナリをビルドし、HomebrewタップとAPTリポジトリを自動的に更新します。
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
        リポジトリをクローンしてCargoでビルドする必要はもうありません。他のツールと同じ方法でPerryをインストールできます。
      </p>

      <h2>App Store公開の自動化</h2>
      <p>
        これが最も多くの手動ステップを排除する変更です。{" "}
        <code className="text-amber-400">perry publish ios</code>を実行すると、iOSディストリビューション
        パイプライン全体を自動的に処理します：
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>App Store Connect APIを介してRSAキーとCSRを生成</li>
        <li>ディストリビューション証明書を作成し<code className="text-amber-400">.p12</code>にバンドル</li>
        <li>バンドルIDを登録</li>
        <li>プロビジョニングプロファイルを作成してダウンロード</li>
        <li>App Store Connectアプリレコードを作成</li>
        <li>ビルド、署名、TestFlightまたはApp Storeにアップロード</li>
      </ol>
      <p>
        Xcodeなし。手動のポータル訪問なし。ブラウザからの証明書ダウンロードなし。セットアップ
        ウィザードは初回公開時に自動的に実行され、APIキーの設定を案内し、
        認証情報を<code className="text-amber-400">perry.toml</code>に保存します。
      </p>
      <p>
        macOSの配布も同様に自動化されています。Perryは3つのモードをサポート：TestFlight、公証済みDMG、
        そしてApp Storeへの公開と公証済みDMGの作成を同時に行う新しい<strong>「両方」</strong>モード。
        3つの証明書タイプが自動生成されます：{" "}
        <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>、{" "}
        <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code>、{" "}
        <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>。
      </p>
      <p>
        Android公開にも自動トリガーのセットアップウィザードが追加されました。3つのプラットフォームすべてが
        同じパターンに従います：初回実行でセットアップがトリガーされ、認証情報がプロジェクトに保存され、
        以降の実行はゼロコンフィギュレーションです。
      </p>
      <p>
        プリフライト検証がビルド開始前に問題をキャッチします — プロビジョニングプロファイルの
        バンドルIDミスマッチ、証明書の有効期限切れ、アプリアイコンの欠如、無効なバージョン形式、誤ったチームID。
        そして<code className="text-amber-400">perry.toml [ios]</code>の{" "}
        <code className="text-amber-400">encryption_exempt</code>はInfo.plistの{" "}
        <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code>キーを自動設定し、
        App Store Connectの手動エクスポートコンプライアンスプロンプトをスキップします。
      </p>

      <h2>perry/widget：TypeScriptからWidgetKit</h2>
      <p>
        PerryはTypeScriptをネイティブSwiftUI WidgetKit拡張にコンパイルできるようになりました。これはラッパーや
        ブリッジではありません — コンパイラがHIRレベルでレンダーツリーを走査し、SwiftUIソースコードを
        直接出力します。出力はXcode（またはPerryのビルドパイプライン）がアプリに埋め込める完全な
        WidgetKit拡張バンドルです。
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
        このアプローチはPerryの他のコンパイルとは根本的に異なります。通常のPerryコードは
        Craneliftを経てネイティブマシンコードになります。ウィジェットコードはHIRからSwiftUI
        テキスト出力になります。なぜならWidgetKitはSwiftUIを要求するからです — 命令型UIKitや
        AppKitコードでウィジェット拡張を構築する方法はありません。Perryはウィジェットのレンダーツリーを
        ランタイムコードではなくコンパイル時テンプレートとして扱うことでこれを解決します。
      </p>

      <h2>新しいウィジェットとプラットフォームの改善</h2>
      <p>
        今週4つの新しいウィジェットタイプが追加されました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — macOS、iOS、Androidでの複数行テキスト編集</li>
        <li><strong>SecureField</strong> — iOSとmacOSでのパスワード入力</li>
        <li><strong>QR Code</strong> — iOS、macOS、AndroidでのネイティブQRコード生成</li>
        <li><strong>Splash Screen</strong> — 自動生成されるLaunchScreenストーリーボード（iOS）とスプラッシュテーマ（Android）</li>
      </ul>

      <h3>iPadがネイティブに</h3>
      <p>
        Perryは完全なiPadネイティブアプリを生成するようになりました：<code className="text-amber-400">UIDeviceFamily [1,2]</code>、
        画面の向きのサポート、<code className="text-amber-400">UIRequiresFullScreen</code>、そしてibtoolを介した
        コンパイル済みLaunchScreenストーリーボード。新しい<code className="text-amber-400">getDeviceIdiom()</code>{" "}
        関数がランタイムで電話 vs. iPadを検出し、<code className="text-amber-400">PerryFrameSplit</code>{" "}
        がiPadレイアウト用のフレームベースの水平分割コンテナを提供します。
      </p>

      <h3>Windows</h3>
      <p>
        Windowsがタイマーサポート（50ms <code className="text-amber-400">WM_TIMER</code>ティック）、
        ダークテーマ背景のオーナー描画ボタン、18のウィジェットファイルにわたる{" "}
        <code className="text-amber-400">to_wide().as_ptr()</code>のuse-after-freeバグの修正を得ました。V8ランタイムは
        必要なシステムライブラリがリンクされた状態でWindowsで動作するようになりました。
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        GTK4バックエンドはmacOSに合わせたビジュアルポリッシュを受けました：エッジインセット用のCSSパディング、Adwaita
        ボタンスタイリング、VStackマージン修正、ScrollView水平ポリシー。
      </p>

      <h2>http/httpsとbetter-sqlite3</h2>
      <p>
        2つの重要なstdlib追加：
      </p>
      <p>
        新しい<code className="text-amber-400">http</code>と{" "}
        <code className="text-amber-400">https</code>ネイティブモジュールは、内部でreqwestを使用した
        クライアントサイドHTTPを提供します。APIはNode.jsに一致：{" "}
        <code className="text-amber-400">request()</code>、{" "}
        <code className="text-amber-400">get()</code>、{" "}
        write/end/on付きの<code className="text-amber-400">ClientRequest</code>、{" "}
        statusCodeとイベントハンドラ付きの<code className="text-amber-400">IncomingMessage</code>。
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code>が完全にサポートされるようになりました：{" "}
        <code className="text-amber-400">new Database()</code>、{" "}
        <code className="text-amber-400">prepare</code>、{" "}
        <code className="text-amber-400">exec</code>、{" "}
        <code className="text-amber-400">run</code>、{" "}
        <code className="text-amber-400">get</code>、{" "}
        <code className="text-amber-400">all</code> — 適切なNaN-boxingと名前付きプロパティアクセスの
        行オブジェクト付き。
      </p>
      <p>
        その他のstdlib改善：<code className="text-amber-400">crypto.randomBytes()</code>が
        Buffer を返すように（Node.jsに一致）、MongoDBが{" "}
        <code className="text-amber-400">listDatabases</code>と{" "}
        <code className="text-amber-400">listCollections</code>をスレッドセーフティ修正と共に獲得、
        mysql2のINSERT/UPDATE/DELETEが{" "}
        <code className="text-amber-400">insertId</code>付きの{" "}
        <code className="text-amber-400">ResultSetHeader</code>を返すように。
      </p>

      <h2>GCと正確性の修正</h2>
      <p>
        今週、いくつかの重要なガベージコレクタとランタイム正確性の修正が出荷されました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GC再入ガード</strong> — アロケーション中の収集を防止し、RefCellダブルボローパニックを修正</li>
        <li><strong>GC Mapトレーシング</strong> — Mapがマークフェーズ中に適切にトレースされるようになり、文字列キーの収集を防止</li>
        <li><strong>文字列エイリアシング修正</strong> — 文字列appendが常にフレッシュな文字列を割り当てるようになり、ポインタコピーエイリアシングによる破損を修正</li>
        <li><strong>BigInt算術</strong> — 右シフトが負の数に対して算術シフトを使用、ビット演算がToInt32ラッピングセマンティクスを使用</li>
        <li><strong>Map.get() undefined</strong> — 欠落キーに対して誤ったNaNタグの代わりに正しい<code className="text-amber-400">TAG_UNDEFINED</code>を返す</li>
        <li><strong>静的フィールドGCルート</strong> — 静的クラスフィールドのBigInt値がGCルートとして登録</li>
      </ul>
      <p>
        これらはマイナーな修正ではありません。GC再入修正だけで、断続的なクラッシュの全クラスが解決されました。
        文字列エイリアシング修正は、ある文字列変数を別の変数に代入し、いずれかを変更するすべてのプログラムに影響しました。
        これらは実際のワークロードでのみ表面化するタイプのバグであり、それらを修正することがコンパイラを
        プロダクショングレードにするのです。
      </p>

      <h2>perry-verify：強化</h2>
      <p>
        自動アプリ検証サービスの<code className="text-amber-400">perry-verify</code>が
        セキュリティ強化パスを受けました：Linuxでは{" "}
        <code className="text-amber-400">bwrap</code>、macOSでは{" "}
        <code className="text-amber-400">sandbox-exec</code>によるサンドボックス実行、WebSocket
        ハンドシェイクとバイナリダウンロードでの認証トークン、IPごとのレート制限、列挙を防ぐ完全UUIDジョブID、
        そして削減されたボディ制限。
      </p>

      <h2>perrysdad：セルフホスティングコンパイラ</h2>
      <p>
        並行する取り組みで、TypeScriptで書かれたセルフホスティングLLVM IRコンパイラの
        <code className="text-amber-400">perrysdad</code>が、この週に5つのフェーズでゼロからセルフコンパイルに到達しました：
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>フェーズ0-1</strong> — エンドツーエンドのスケルトン：HIRからLLVM IRテキストからclang、Perryの<code className="text-amber-400">libperry_runtime.a</code>に対してリンク</li>
        <li><strong>フェーズ2</strong> — 実際の<code className="text-amber-400">.ts</code>ファイル用のPratt式パーシング付き手書き再帰下降パーサー</li>
        <li><strong>フェーズ3</strong> — ランタイムFFI付きの配列、オブジェクト、Map、さらに重要なABIミスマッチの修正（LLVM IRでJSValueがi64ではなくdoubleとして宣言されていた）</li>
        <li><strong>フェーズ4</strong> — クラス、列挙型、クロージャ、モジュール発見とトポロジカルソート付きマルチファイルコンパイル</li>
      </ol>
      <p>
        マイルストーン：セルフコンパイルされた<code className="text-amber-400">anvil</code>バイナリが
        テストプログラムをコンパイルし、nodeコンパイル版と一致する正しい出力を生成できるようになりました。
        TypeScriptコンパイラが、Perryによってネイティブコードにコンパイルされ、さらにTypeScriptをネイティブコードにコンパイルする。
        まさにタートルズ・オール・ザ・ウェイ・ダウン。
      </p>

      <h2>数字で見る</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82コミット</strong>がメインのPerryコンパイラに</li>
        <li><strong>1リリース</strong>：v0.2.173（3月8日）</li>
        <li><strong>49ページのドキュメント</strong>がdocs.perryts.comに</li>
        <li><strong>4つの新しいウィジェット</strong>：TextArea、SecureField、QR Code、Splash Screen</li>
        <li><strong>3つの配布チャネル</strong>：Homebrew、APT、ソース</li>
        <li><strong>3つの自動ストアパイプライン</strong>：App Store、TestFlight、Google Play</li>
        <li><strong>全6プラットフォーム</strong>が今週改善を受けた</li>
      </ul>

      <h2>次のステップ</h2>
      <p>
        パイプラインが充実してきています。TypeScriptを書き、6つのプラットフォームにコンパイルし、
        HomebrewやAPTで配布し、App StoreとPlay Storeに公開し、ホーム画面ウィジェットを追加し、
        包括的なドキュメントを読むことができます — すべてPerryのツールチェーンから離れることなく。残っているのは：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>完全な正規表現サポート</strong> — 最後の主要な言語ギャップ</li>
        <li><strong>perry/uiの拡張</strong> — ドラッグアンドドロップ、アクセシビリティラベル、DatePicker</li>
        <li><strong>perrysdadの成熟</strong> — セルフホスティングコンパイラの完全なPerry対等性への拡張</li>
        <li><strong>Hubパブリックベータ</strong> — 外部ユーザーへの分散ビルドの公開</li>
      </ul>
      <p>
        進捗は{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>でフォロー、新しいドキュメントは{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>で読む、または{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">ロードマップ</Link>
        {" "}で全体像をご確認ください。
      </p>
    </>
  );
}
