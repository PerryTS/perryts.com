import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        5日間、120コミット、Perry は v0.4.0 から v0.4.24 に跳躍しました。ハイライト：tvOS が10番目のコンパイルターゲットに、iOS と macOS のアプリが Linux から完全にビルド可能に、perry login で従量課金制に、Windows UI が完全刷新。リリースされた全内容を紹介します。
      </p>

      <h2>tvOS：10番目のコンパイルターゲット</h2>
      <p>
        Perry が Apple TV にコンパイル可能になりました。tvOS ターゲットは watchOS と同じ SwiftUI レンダラーを使用し、Perry が UI ツリーを構築して同梱の Swift ホストアプリがネイティブにレンダリングするデータ駆動型アーキテクチャを共有します。既存の <code>@perry/threads</code> WASM 統合と組み合わせて、tvOS アプリは UI をレスポンシブに保ちながらバックグラウンドで重い処理を実行できます。
      </p>
      <pre><code>{`# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos`}</code></pre>
      <p>
        ターゲット総数は <strong>10</strong> になりました：macOS、iOS、iPadOS、Android、Linux、Windows、watchOS、tvOS、WebAssembly、Web/JavaScript。1つの TypeScript コードベース、10のネイティブ出力。
      </p>

      <h2>Linux から iOS と macOS をクロスコンパイル</h2>
      <p>
        Perry は <code>ld64.lld</code> を Mach-O リンカーとして使用し、Linux マシンから完全に iOS と macOS バイナリをビルドできるようになりました。完全自動化された CI/CD の最後のピース — Linux サーバーに TypeScript をプッシュすれば、macOS ビルドマシンなしですべての Apple プラットフォーム向けの署名済みネイティブバイナリを取得できます。
      </p>
      <p>
        ここに到達するには、リンカーの問題の連鎖を解決する必要がありました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Mach-O コード生成トリプル</strong> — Cranelift 向けに <code>aarch64-apple-macos</code> と <code>aarch64-apple-ios</code> ターゲットトリプルを追加</li>
        <li><strong>フレームワークリンキング</strong> — クロスコンパイル用の CoreGraphics、Metal、IOKit、DiskArbitration フレームワーク検索パス</li>
        <li><strong><code>-lobjc</code></strong> — すべての Apple ターゲットに必要な ObjC ランタイムシンボル</li>
        <li><strong>SDK バージョン</strong> — ld64.lld で <code>sdk_version 26.0</code>（Apple は iOS 18+ を要求）</li>
        <li><strong>デッドストリッピング</strong> — Mach-O リンカー用に <code>-Wl,-dead_strip</code> ではなく <code>-dead_strip</code></li>
        <li><strong>ランタイム重複排除</strong> — リンクエラーを避けるため UI 静的ライブラリから重複する <code>perry_runtime</code> を除去</li>
      </ul>
      <p>
        既存の Linux → Windows クロスコンパイル（v0.2.195+）と合わせて、Perry は <strong>Linux からすべてのプラットフォームに</strong>クロスコンパイルできるようになりました — iOS、macOS、Windows、Android、WASM、Web。
      </p>

      <h2>iOS App Store 対応</h2>
      <p>
        このサイクルの主な焦点は、Perry コンパイル済み iOS アプリを完全に App Store 準拠にすることでした：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>完全な Info.plist</strong> — Apple 必須キーすべて：<code>CFBundleIdentifier</code>、<code>CFBundleName</code>、<code>CFBundleShortVersionString</code>、<code>CFBundleVersion</code>、<code>UIDeviceFamily</code>、<code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — 標準 iOS アイコン命名（<code>AppIcon60x60@2x</code> など）フォールバック解像度付き</li>
        <li><strong>perry.toml からのバージョン</strong> — <code>version</code> と <code>build_number</code> フィールドが直接 Info.plist に流れる</li>
        <li><strong>UILaunchScreen</strong> — <code>UILaunchStoryboardName</code> の代わりにモダンキーを使用（ストーリーボードファイル不要）</li>
        <li><strong>プロビジョニングプロファイル</strong> — App Store と TestFlight 配布用 macOS プロビジョニングプロファイルサポート</li>
      </ul>

      <h2>Perry Login と課金</h2>
      <p>
        Perry にアカウントと従量課金制が追加されました。新しい <code>perry login</code> CLI コマンドと <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a> のダッシュボードで動作します。
      </p>
      <h3>仕組み</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — GitHub OAuth デバイスフロー、ブラウザを開いて完了をポーリング</li>
        <li><strong>無料プラン</strong> — 月15ビルド、GitHub アカウントで無制限プロジェクト</li>
        <li><strong>Pro プラン</strong> — Polar.sh サブスクリプションで無制限ビルド</li>
        <li><strong>API トークン</strong> — CI/CD 用にダッシュボードからトークンを生成・管理</li>
        <li><strong>使用量トラッキング</strong> — リアルタイム使用量バー付きの月間 publish・verify カウンター</li>
      </ul>
      <p>
        ダッシュボード自体は Perry コンパイル済み Fastify サーバーと Next.js 静的エクスポートで構築されています — Perry で構築し、Perry ユーザーにサービスを提供。
      </p>

      <h2>macOS 公証とコード署名</h2>
      <p>
        2つの新しい署名機能：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — 自動的に Developer ID 証明書に切り替え（App Store 証明書の代わりに）、Apple の公証サービスに送信し、結果をステープル</li>
        <li><strong>GCloud KMS コード署名</strong> — Windows ビルドを Google Cloud KMS キーで署名可能に。秘密鍵を露出させずに CI で自動署名を実現</li>
      </ul>

      <h2>Windows UI 刷新</h2>
      <p>
        Windows UI バックエンドが最も包括的なアップデートを受けました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>DPI 対応スケーリング</strong> — ウィンドウサイズ、フォント、ウィジェット寸法が高 DPI ディスプレイで正しくスケール</li>
        <li><strong>ランチャースタイルウィンドウ API</strong> — ランチャー/Spotlight スタイル UI のためのボーダーレスウィンドウとカスタムポジショニング</li>
        <li><strong>グローバルホットキー</strong> — アプリがフォーカスされていなくても動作するシステムワイドのキーボードショートカット</li>
        <li><strong>アプリアイコン</strong> — ランチャー UI でアプリケーションアイコンを表示する <code>getAppIcon</code> API</li>
        <li><strong>リエントランシーセーフレイアウト</strong> — ネストされた WM_PAINT メッセージ中のパニックを防ぐため <code>RefCell</code> ベースのペインティングを <code>SetPropW</code> HWND ストレージに置換</li>
        <li><strong>Geisterhand 統合</strong> — すべてのウィジェットタイプが UI テストフレームワークに登録、<code>/type</code> は HWND マップ経由で <code>SendMessageW</code> を使用</li>
        <li><strong>Android カメラサポート</strong> — カメラキャプチャ API を JNI 経由で Android に拡張</li>
      </ul>

      <h2>パフォーマンス</h2>
      <p>
        v0.4.14 で包括的なパフォーマンス監査をリリース：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>ネイティブ <code>fcmp</code></strong> — 浮動小数点比較がランタイム関数呼び出しの代わりにネイティブ CPU 命令を使用。マンデルブロベンチマーク <strong>30% 高速化</strong>。</li>
        <li><strong>インプレース文字列追記</strong> — <code>str += &quot;text&quot;</code> が新しい文字列を割り当てる代わりにバッファをインプレースで変更。繰り返し連結で <strong>125倍高速化</strong>。</li>
        <li><strong>短絡 AND/OR</strong> — <code>&amp;&amp;</code> と <code>||</code> が結果が既に決定されている場合、右オペランドの評価をスキップ。</li>
        <li><strong>負のリテラルフォールディング</strong> — <code>-1</code>、<code>-0.5</code> などが否定命令を出力する代わりに HIR レベルで定数に畳み込み。</li>
      </ul>

      <h2>Hub 並列ビルド</h2>
      <p>
        ビルドオーケストレーションサーバーがワーカーごとの並行ビルドをサポート：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>スロットベースディスパッチ</strong> — ワーカーが <code>max_concurrent</code> 容量を報告、Hub がワーカーごとのアクティブジョブを追跡</li>
        <li><strong>429 なし</strong> — 全ワーカーがビジーな時にジョブが拒否される代わりにキューイング</li>
        <li><strong>Base64 アーティファクトダウンロード</strong> — Perry ランタイムがraw バイナリ HTTP レスポンスを処理できない場合、バイナリアーティファクトを base64 で提供</li>
        <li><strong>自動再接続 WebSocket</strong> — ビルドモニタリング接続が切断時に自動再接続</li>
      </ul>

      <h2>新パッケージ: perry/appstorereview</h2>
      <p>
        アプリストアレビューを促すための新しいファーストパーティパッケージ：
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        1つの関数、2つのプラットフォーム、ネイティブレビュー UI。タイミングと表示ロジックは完全に開発者に委ねられます。
      </p>

      <h2>コード生成の修正</h2>
      <p>
        120コミットは多くのバグ修正を意味します。最もインパクトのあるもの：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>厳密等価 (===)</strong> — v0.4.2 で3つの個別バグを修正：型タグ比較、NaN 処理、null/undefined の区別</li>
        <li><strong>連結文字列の文字列比較</strong> — ポインタ比較ではなくコンテンツ比較が必要なため、連結で構築された文字列の比較で <code>===</code> が失敗</li>
        <li><strong>コンストラクタ解決</strong> — <code>new X(args)</code> がクロスモジュールインポートされたコンストラクタとクロージャベースのコンストラクタ関数を正しく解決</li>
        <li><strong>モジュールレベル配列 push</strong> — ループ内のネストされた関数呼び出し内でモジュールレベル配列にプッシュされた値が再割り当て後の古いポインタにより失われた</li>
        <li><strong>null 算術変換</strong> — <code>null + 1</code> が <code>js_number_coerce</code> を通じて正しく <code>1</code> を生成</li>
        <li><strong>ビットワイズ NOT ラッピング</strong> — <code>~x</code> が ECMAScript セマンティクスに従い i32 にラップ</li>
        <li><strong>fetch().then()</strong> — ネイティブ UI アプリでイベントループのドレイン不足によりコールバックが発火しなかった（v0.4.3）</li>
        <li><strong>WASM 剰余と累乗</strong> — <code>%</code> と <code>**</code> 演算子が WASM バリデーションエラーを引き起こした（v0.4.5）</li>
      </ul>

      <h2>数字で見る</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>約120コミット</strong>（5日間で Perry メインコンパイラに）</li>
        <li><strong>24のパッチリリース</strong>：v0.4.1 → v0.4.24</li>
        <li><strong>コンパイルターゲット</strong>：9 → 10（tvOS 追加）</li>
        <li><strong>Linux からのクロスコンパイルターゲット</strong>：Windows → Windows、iOS、macOS（全 Apple + Windows）</li>
        <li><strong>新パッケージ</strong>：perry/appstorereview</li>
        <li><strong>新インフラ</strong>：app.perryts.com ダッシュボード、perry login CLI、Polar.sh 課金</li>
        <li><strong>パフォーマンス向上</strong>：マンデルブロ 30% 高速化（ネイティブ fcmp）、文字列連結 125倍高速化</li>
      </ul>

      <h2>今後の予定</h2>
      <p>
        Linux からの iOS と macOS のクロスコンパイルにより、Hub は単一の Linux サーバーからすべてのプラットフォーム向けにビルド可能になりました — コンパイル用の専用 macOS ビルドマシンは不要に（署名のみ必要）。課金インフラは Hub パブリックベータへの道を開きます。tvOS の追加により、Perry はすべての Apple プラットフォームをカバー：macOS、iOS、iPadOS、watchOS、tvOS。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hub パブリックベータ</strong> — 外部ユーザーが TypeScript をプッシュしてネイティブバイナリを取得可能に</li>
        <li><strong>完全な正規表現サポート</strong> — 最後の主要言語ギャップ</li>
        <li><strong>perry/ui 拡張</strong> — ドラッグ＆ドロップ、アクセシビリティ、DatePicker</li>
        <li><strong>ソースマップとデバッグ情報</strong> — ネイティブデバッグ用 DWARF デバッグ情報</li>
      </ul>
      <p>
        進捗は{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a> でフォローし、ドキュメントは{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a> で読み、全体像は{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">ロードマップ</Link>
        {" "}をご確認ください。
      </p>
    </>
  );
}
