---
title: "真のマルチスレッド、コンパイル時 i18n、watchOS"
excerpt: "Perry v0.4.0：コンパイル時の安全性を備えた本物の OS スレッド、30 以上のロケール向けゼロセレモニー国際化システム、9 番目のコンパイルターゲットとしての watchOS、オーディオ・カメラ API、並列コンパイラパイプライン。"
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 はプロジェクト開始以来最大のリリースです。1サイクルで3つのバージョンジャンプ — v0.3.0（i18n）、v0.3.2（watchOS）、v0.4.0（マルチスレッド）— そしてコンパイラ自体も並列化されました。リリースされた全内容を紹介します。

## 真のマルチスレッド

Perry に実際の OS スレッド並列処理が追加されました。シリアライズのオーバーヘッドがある Web Worker ではありません。`Atomics` を使う `SharedArrayBuffer` でもありません。本物のスレッド — 8MB スタックの軽量 OS スレッドで、何も共有せず、アイドル時のコストはゼロです。

新しい `perry/thread` モジュールは3つのプリミティブを公開します：

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` と `parallelFilter` は CPU コア数を自動検出し、入力配列をそれらに分割します。小さな配列ではスレッディングを完全にスキップして同期実行します — 些細なワークロードにオーバーヘッドはありません。

`spawn` はバックグラウンド OS スレッドを起動し、Promise を返します。結果はマイクロタスク処理中にドレインされるペンディング結果キューを通じて返されるため、他の非同期操作と同様に `await` できます。

### コンパイル時の安全性

最も重要な部分は API ではなく、コンパイラが*防止する*ものです。Perry はミュータブルな変数をキャプチャするクロージャを静的に拒否します：

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

共有ミュータブル状態がないということはデータ競合がないということです。ロックなし、ミューテックスなし、`Atomics` なし。コンパイラはマシンコードが1行も生成される前にスレッド安全性を保証します。

### 内部の仕組み

各ワーカースレッドは `Drop` クリーンアップ付きの独自メモリアリーナを持ちます — スレッド間の GC 協調はありません。値は `SerializedValue` のディープコピーで転送されます：数値はゼロコスト、文字列・配列・オブジェクトは O(n)。実装は単一の 1,120 行の Rust ファイル（`perry-runtime/src/thread.rs`）にあり、ガベージコレクタへの変更は不要でした。

V8 アイソレートと比較してください。ワーカーごとに約 2MB のオーバーヘッドを持つ別々のヒープが必要です。Perry のスレッドはアリーナ付きの単なる pthread です。

### 並列コンパイラパイプライン

コンパイラ自体も並列化されました。モジュールコード生成、変換パス（JS インポート、ネイティブインスタンス、単相化）、`nm` シンボルスキャンはすべて rayon を通じてすべての CPU コアで実行されます。Cranelift 0.121 へのアップグレード（0.113 から — レジスタ割り当てと x64 改善の8つのマイナーバージョン）と合わせて、コンパイルは大幅に高速化されました。

## コンパイル時 i18n（v0.3.0）

Perry の国際化システムはセレモニーゼロです。UI ウィジェットの文字列リテラルは自動的にローカライズ可能なキーとして扱われます。翻訳ファイルは `locales/` ディレクトリのフラット JSON です。すべての検証はコンパイル時に行われます。

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

コンパイラがすべてを検証します：欠落した翻訳、パラメータの不一致、複数形エラー。翻訳は組み込みの 2D 文字列テーブルとしてバイナリに焼き込まれ、ランタイムのルックアップはほぼゼロです — 起動時の JSON パースはありません。

### 含まれるもの

-   **CLDR 複数形ルール**：30以上のロケールで `.one`/`.other`/`.few`/`.many`/`.zero`/`.two` サフィックス
-   **フォーマットラッパー**：`Currency`、`Percent`、`ShortDate`、`LongDate`、`FormatNumber`、`FormatTime`、`Raw`
-   **ネイティブロケール検出**：全プラットフォーム対応 — `CFLocaleCopyCurrent`（macOS/iOS）、`GetUserDefaultLocaleName`（Windows）、`system_property_get`（Android）、`LANG`/`LC_ALL`（Linux）
-   **`perry i18n extract`** CLI：TS/TSX ファイルをスキャンし、ロケール JSON スキャフォールドを生成・更新
-   **プラットフォームネイティブリソース生成**：iOS `.lproj` および Android `values-xx/` ディレクトリ
-   **`import { t } from "perry/i18n"`**：非 UI 文字列のローカライズ用

`perry.toml` で設定：

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## watchOS ネイティブアプリ（v0.3.2）

Perry が watchOS にコンパイル可能になりました — 9番目のコンパイルターゲットです。ラッパーでもコンパニオンアプリでもありません。ネイティブ SwiftUI インターフェースを持つスタンドアロンの watchOS バイナリです。

watchOS レンダラーは**データ駆動型アプローチ**を使用します：Perry が `perry_ui_*` FFI 呼び出しを通じて UI ツリーを構築し、同梱の `PerryWatchApp.swift` がツリーをクエリしてリアクティブに SwiftUI ビューをレンダリングします。15種類のウィジェットがサポートされ、未サポートのものにはスタブがあります。

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

完全なフローが動作します：`perry setup watchos` は App Store Connect の認証情報を iOS と共有し、`perry run watchos` は Apple Watch シミュレータを自動検出し、`perry publish watchos` は App Store に送信します。

これにより**ウィジェットターゲットの総数は4**になります：iOS（WidgetKit）、Android（Glance）、watchOS（WidgetKit）、Wear OS（Tiles）。それぞれ独自のコンパイルターゲットとコード生成バックエンドを持ちます。

## オーディオ＆カメラ API

このリリースで2つの新しいハードウェア API：

### オーディオキャプチャ（`perry/system`）

A 加重 dB(A) 測定付きクロスプラットフォームオーディオキャプチャ：

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

プラットフォームバックエンド：AVAudioEngine（macOS/iOS）、JNI 経由 AudioRecord（Android）、PulseAudio（Linux）、WASAPI（Windows）、getUserMedia + AnalyserNode（Web）。

### カメラキャプチャ（`perry/ui`）

ピクセルレベルの色サンプリング付きネイティブカメラプレビュー（iOS）：

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## エコシステムパッケージ

2つのファーストパーティネイティブパッケージがローンチ：

-   **perry/push** — iOS/macOS 向けプッシュ通知バインディング：パーミッションリクエスト、APNs トークン取得、バッジカウント。FCM 対応の Android スタブは計画中。
-   **perry/storekit** — StoreKit 2 アプリ内課金バインディング：製品ロード、JWS レシート付き購入、サブスクリプション確認、復元、トランザクションリスナー。

両方とも同じアーキテクチャに従います：TypeScript 宣言 → Rust FFI クレート → Swift ブリッジ。依存関係としてインストールし、関数をインポートし、結果を `await`。コンパイラがすべてのネイティブブリッジングを処理します。

## インフラストラクチャ

-   **Cranelift 0.113 → 0.121** — レジスタ割り当て、x64 修正、スタックスロットアライメント改善の8つのマイナーバージョン
-   **Windows 関数分割** — 50以上のステートメントを持つ関数を自動的に継続に分割し、Windows での Cranelift コード生成の問題を回避
-   **選択的モジュール変数ロード** — 関数エントリで参照されたモジュールレベル変数のみをロードし、Windows バイナリサイズを 26% 削減
-   **Array.sort() アップグレード** — O(n²) の挿入ソートから O(n log n) の TimSort スタイルハイブリッドへ
-   **perry run android** — 完全な APK ビルドパイプライン：コンパイル、Gradle プロジェクト生成、assembleDebug、インストール、起動
-   **カスタム Info.plist エントリ** — perry.toml の `[ios.info_plist]` でプライバシー説明、URL スキーム、バックグラウンドモードを設定

## 数字で見る

-   **バージョン**：0.2.197 → 0.4.0（3つの主要マイルストーン）
-   **コンパイルターゲット**：8 → 9（watchOS 追加）
-   **ウィジェットターゲット**：1 → 4（iOS、Android、watchOS、Wear OS）
-   **新クレート**：perry-ui-watchos、perry-codegen-glance、perry-codegen-wear-tiles
-   **新ドキュメント**：スレッディング（4ページ）、i18n（4ページ）、watchOS、ウィジェットドキュメント拡張（3 → 8ページ）
-   **perry/thread 実装**：1,120 行の Rust、GC への変更ゼロ

## 今後の予定

スレッディング基盤により多くの可能性が開かれます：並列 HTTP リクエスト処理、並行ファイル操作、シングルスレッド実行でブロックされていた演算集約型ワークロード。言語面では、完全な正規表現サポートが最大のギャップとして残り、`perry/ui` の拡張（ドラッグ＆ドロップ、アクセシビリティ、DatePicker）は継続します。

進捗は [GitHub](https://github.com/PerryTS/perry) でフォローし、ドキュメントは [docs.perryts.com](https://docs.perryts.com) で読み、全体像は [ロードマップ](/ja/roadmap/) をご確認ください。
