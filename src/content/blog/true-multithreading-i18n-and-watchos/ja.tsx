import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0 はプロジェクト開始以来最大のリリースです。1サイクルで3つのバージョンジャンプ — v0.3.0（i18n）、v0.3.2（watchOS）、v0.4.0（マルチスレッド）— そしてコンパイラ自体も並列化されました。リリースされた全内容を紹介します。
      </p>

      <h2>真のマルチスレッド</h2>
      <p>
        Perry に実際の OS スレッド並列処理が追加されました。シリアライズのオーバーヘッドがある Web Worker ではありません。<code>Atomics</code> を使う <code>SharedArrayBuffer</code> でもありません。本物のスレッド — 8MB スタックの軽量 OS スレッドで、何も共有せず、アイドル時のコストはゼロです。
      </p>
      <p>
        新しい <code>perry/thread</code> モジュールは3つのプリミティブを公開します：
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
        <code>parallelMap</code> と <code>parallelFilter</code> は CPU コア数を自動検出し、入力配列をそれらに分割します。小さな配列ではスレッディングを完全にスキップして同期実行します — 些細なワークロードにオーバーヘッドはありません。
      </p>
      <p>
        <code>spawn</code> はバックグラウンド OS スレッドを起動し、Promise を返します。結果はマイクロタスク処理中にドレインされるペンディング結果キューを通じて返されるため、他の非同期操作と同様に <code>await</code> できます。
      </p>

      <h3>コンパイル時の安全性</h3>
      <p>
        最も重要な部分は API ではなく、コンパイラが<em>防止する</em>ものです。Perry はミュータブルな変数をキャプチャするクロージャを静的に拒否します：
      </p>
      <pre><code>{`let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});`}</code></pre>
      <p>
        共有ミュータブル状態がないということはデータ競合がないということです。ロックなし、ミューテックスなし、<code>Atomics</code> なし。コンパイラはマシンコードが1行も生成される前にスレッド安全性を保証します。
      </p>

      <h3>内部の仕組み</h3>
      <p>
        各ワーカースレッドは <code>Drop</code> クリーンアップ付きの独自メモリアリーナを持ちます — スレッド間の GC 協調はありません。値は <code>SerializedValue</code> のディープコピーで転送されます：数値はゼロコスト、文字列・配列・オブジェクトは O(n)。実装は単一の 1,120 行の Rust ファイル（<code>perry-runtime/src/thread.rs</code>）にあり、ガベージコレクタへの変更は不要でした。
      </p>
      <p>
        V8 アイソレートと比較してください。ワーカーごとに約 2MB のオーバーヘッドを持つ別々のヒープが必要です。Perry のスレッドはアリーナ付きの単なる pthread です。
      </p>

      <h3>並列コンパイラパイプライン</h3>
      <p>
        コンパイラ自体も並列化されました。モジュールコード生成、変換パス（JS インポート、ネイティブインスタンス、単相化）、<code>nm</code> シンボルスキャンはすべて rayon を通じてすべての CPU コアで実行されます。Cranelift 0.121 へのアップグレード（0.113 から — レジスタ割り当てと x64 改善の8つのマイナーバージョン）と合わせて、コンパイルは大幅に高速化されました。
      </p>

      <h2>コンパイル時 i18n（v0.3.0）</h2>
      <p>
        Perry の国際化システムはセレモニーゼロです。UI ウィジェットの文字列リテラルは自動的にローカライズ可能なキーとして扱われます。翻訳ファイルは <code>locales/</code> ディレクトリのフラット JSON です。すべての検証はコンパイル時に行われます。
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        コンパイラがすべてを検証します：欠落した翻訳、パラメータの不一致、複数形エラー。翻訳は組み込みの 2D 文字列テーブルとしてバイナリに焼き込まれ、ランタイムのルックアップはほぼゼロです — 起動時の JSON パースはありません。
      </p>

      <h3>含まれるもの</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>CLDR 複数形ルール</strong>：30以上のロケールで <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code> サフィックス</li>
        <li><strong>フォーマットラッパー</strong>：<code>Currency</code>、<code>Percent</code>、<code>ShortDate</code>、<code>LongDate</code>、<code>FormatNumber</code>、<code>FormatTime</code>、<code>Raw</code></li>
        <li><strong>ネイティブロケール検出</strong>：全プラットフォーム対応 — <code>CFLocaleCopyCurrent</code>（macOS/iOS）、<code>GetUserDefaultLocaleName</code>（Windows）、<code>system_property_get</code>（Android）、<code>LANG</code>/<code>LC_ALL</code>（Linux）</li>
        <li><strong><code>perry i18n extract</code></strong> CLI：TS/TSX ファイルをスキャンし、ロケール JSON スキャフォールドを生成・更新</li>
        <li><strong>プラットフォームネイティブリソース生成</strong>：iOS <code>.lproj</code> および Android <code>values-xx/</code> ディレクトリ</li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong>：非 UI 文字列のローカライズ用</li>
      </ul>
      <p>
        <code>perry.toml</code> で設定：
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>watchOS ネイティブアプリ（v0.3.2）</h2>
      <p>
        Perry が watchOS にコンパイル可能になりました — 9番目のコンパイルターゲットです。ラッパーでもコンパニオンアプリでもありません。ネイティブ SwiftUI インターフェースを持つスタンドアロンの watchOS バイナリです。
      </p>
      <p>
        watchOS レンダラーは<strong>データ駆動型アプローチ</strong>を使用します：Perry が <code>perry_ui_*</code> FFI 呼び出しを通じて UI ツリーを構築し、同梱の <code>PerryWatchApp.swift</code> がツリーをクエリしてリアクティブに SwiftUI ビューをレンダリングします。15種類のウィジェットがサポートされ、未サポートのものにはスタブがあります。
      </p>
      <pre><code>{`# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos`}</code></pre>
      <p>
        完全なフローが動作します：<code>perry setup watchos</code> は App Store Connect の認証情報を iOS と共有し、<code>perry run watchos</code> は Apple Watch シミュレータを自動検出し、<code>perry publish watchos</code> は App Store に送信します。
      </p>
      <p>
        これにより<strong>ウィジェットターゲットの総数は4</strong>になります：iOS（WidgetKit）、Android（Glance）、watchOS（WidgetKit）、Wear OS（Tiles）。それぞれ独自のコンパイルターゲットとコード生成バックエンドを持ちます。
      </p>

      <h2>オーディオ＆カメラ API</h2>
      <p>
        このリリースで2つの新しいハードウェア API：
      </p>
      <h3>オーディオキャプチャ（<code>perry/system</code>）</h3>
      <p>
        A 加重 dB(A) 測定付きクロスプラットフォームオーディオキャプチャ：
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();`}</code></pre>
      <p>
        プラットフォームバックエンド：AVAudioEngine（macOS/iOS）、JNI 経由 AudioRecord（Android）、PulseAudio（Linux）、WASAPI（Windows）、getUserMedia + AnalyserNode（Web）。
      </p>
      <h3>カメラキャプチャ（<code>perry/ui</code>）</h3>
      <p>
        ピクセルレベルの色サンプリング付きネイティブカメラプレビュー（iOS）：
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging`}</code></pre>

      <h2>エコシステムパッケージ</h2>
      <p>
        2つのファーストパーティネイティブパッケージがローンチ：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — iOS/macOS 向けプッシュ通知バインディング：パーミッションリクエスト、APNs トークン取得、バッジカウント。FCM 対応の Android スタブは計画中。</li>
        <li><strong>perry/storekit</strong> — StoreKit 2 アプリ内課金バインディング：製品ロード、JWS レシート付き購入、サブスクリプション確認、復元、トランザクションリスナー。</li>
      </ul>
      <p>
        両方とも同じアーキテクチャに従います：TypeScript 宣言 → Rust FFI クレート → Swift ブリッジ。依存関係としてインストールし、関数をインポートし、結果を <code>await</code>。コンパイラがすべてのネイティブブリッジングを処理します。
      </p>

      <h2>インフラストラクチャ</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — レジスタ割り当て、x64 修正、スタックスロットアライメント改善の8つのマイナーバージョン</li>
        <li><strong>Windows 関数分割</strong> — 50以上のステートメントを持つ関数を自動的に継続に分割し、Windows での Cranelift コード生成の問題を回避</li>
        <li><strong>選択的モジュール変数ロード</strong> — 関数エントリで参照されたモジュールレベル変数のみをロードし、Windows バイナリサイズを 26% 削減</li>
        <li><strong>Array.sort() アップグレード</strong> — O(n&sup2;) の挿入ソートから O(n log n) の TimSort スタイルハイブリッドへ</li>
        <li><strong>perry run android</strong> — 完全な APK ビルドパイプライン：コンパイル、Gradle プロジェクト生成、assembleDebug、インストール、起動</li>
        <li><strong>カスタム Info.plist エントリ</strong> — perry.toml の <code>[ios.info_plist]</code> でプライバシー説明、URL スキーム、バックグラウンドモードを設定</li>
      </ul>

      <h2>数字で見る</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>バージョン</strong>：0.2.197 → 0.4.0（3つの主要マイルストーン）</li>
        <li><strong>コンパイルターゲット</strong>：8 → 9（watchOS 追加）</li>
        <li><strong>ウィジェットターゲット</strong>：1 → 4（iOS、Android、watchOS、Wear OS）</li>
        <li><strong>新クレート</strong>：perry-ui-watchos、perry-codegen-glance、perry-codegen-wear-tiles</li>
        <li><strong>新ドキュメント</strong>：スレッディング（4ページ）、i18n（4ページ）、watchOS、ウィジェットドキュメント拡張（3 → 8ページ）</li>
        <li><strong>perry/thread 実装</strong>：1,120 行の Rust、GC への変更ゼロ</li>
      </ul>

      <h2>今後の予定</h2>
      <p>
        スレッディング基盤により多くの可能性が開かれます：並列 HTTP リクエスト処理、並行ファイル操作、シングルスレッド実行でブロックされていた演算集約型ワークロード。言語面では、完全な正規表現サポートが最大のギャップとして残り、<code>perry/ui</code> の拡張（ドラッグ＆ドロップ、アクセシビリティ、DatePicker）は継続します。
      </p>
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
