---
title: "tvOS、Linux からの iOS クロスコンパイル、Perry Login"
excerpt: "Perry v0.4.24：10 番目のコンパイルターゲットとしての tvOS、ld64.lld 経由で Linux から iOS・macOS へのクロスコンパイル、従量課金制の perry login、Windows UI 刷新、macOS 公証、5 日間で 120 コミット。"
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
5日間、120コミット、Perry は v0.4.0 から v0.4.24 に跳躍しました。ハイライト：tvOS が10番目のコンパイルターゲットに、iOS と macOS のアプリが Linux から完全にビルド可能に、perry login で従量課金制に、Windows UI が完全刷新。リリースされた全内容を紹介します。

## tvOS：10番目のコンパイルターゲット

Perry が Apple TV にコンパイル可能になりました。tvOS ターゲットは watchOS と同じ SwiftUI レンダラーを使用し、Perry が UI ツリーを構築して同梱の Swift ホストアプリがネイティブにレンダリングするデータ駆動型アーキテクチャを共有します。既存の `@perry/threads` WASM 統合と組み合わせて、tvOS アプリは UI をレスポンシブに保ちながらバックグラウンドで重い処理を実行できます。

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

ターゲット総数は **10** になりました：macOS、iOS、iPadOS、Android、Linux、Windows、watchOS、tvOS、WebAssembly、Web/JavaScript。1つの TypeScript コードベース、10のネイティブ出力。

## Linux から iOS と macOS をクロスコンパイル

Perry は `ld64.lld` を Mach-O リンカーとして使用し、Linux マシンから完全に iOS と macOS バイナリをビルドできるようになりました。完全自動化された CI/CD の最後のピース — Linux サーバーに TypeScript をプッシュすれば、macOS ビルドマシンなしですべての Apple プラットフォーム向けの署名済みネイティブバイナリを取得できます。

ここに到達するには、リンカーの問題の連鎖を解決する必要がありました：

-   **Mach-O コード生成トリプル** — Cranelift 向けに `aarch64-apple-macos` と `aarch64-apple-ios` ターゲットトリプルを追加
-   **フレームワークリンキング** — クロスコンパイル用の CoreGraphics、Metal、IOKit、DiskArbitration フレームワーク検索パス
-   **`-lobjc`** — すべての Apple ターゲットに必要な ObjC ランタイムシンボル
-   **SDK バージョン** — ld64.lld で `sdk_version 26.0`（Apple は iOS 18+ を要求）
-   **デッドストリッピング** — Mach-O リンカー用に `-Wl,-dead_strip` ではなく `-dead_strip`
-   **ランタイム重複排除** — リンクエラーを避けるため UI 静的ライブラリから重複する `perry_runtime` を除去

既存の Linux → Windows クロスコンパイル（v0.2.195+）と合わせて、Perry は **Linux からすべてのプラットフォームに**クロスコンパイルできるようになりました — iOS、macOS、Windows、Android、WASM、Web。

## iOS App Store 対応

このサイクルの主な焦点は、Perry コンパイル済み iOS アプリを完全に App Store 準拠にすることでした：

-   **完全な Info.plist** — Apple 必須キーすべて：`CFBundleIdentifier`、`CFBundleName`、`CFBundleShortVersionString`、`CFBundleVersion`、`UIDeviceFamily`、`UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — 標準 iOS アイコン命名（`AppIcon60x60@2x` など）フォールバック解像度付き
-   **perry.toml からのバージョン** — `version` と `build_number` フィールドが直接 Info.plist に流れる
-   **UILaunchScreen** — `UILaunchStoryboardName` の代わりにモダンキーを使用（ストーリーボードファイル不要）
-   **プロビジョニングプロファイル** — App Store と TestFlight 配布用 macOS プロビジョニングプロファイルサポート

## Perry Login と課金

Perry にアカウントと従量課金制が追加されました。新しい `perry login` CLI コマンドと [app.perryts.com](https://app.perryts.com) のダッシュボードで動作します。

### 仕組み

-   **`perry login`** — GitHub OAuth デバイスフロー、ブラウザを開いて完了をポーリング
-   **無料プラン** — 月15ビルド、GitHub アカウントで無制限プロジェクト
-   **Pro プラン** — Polar.sh サブスクリプションで無制限ビルド
-   **API トークン** — CI/CD 用にダッシュボードからトークンを生成・管理
-   **使用量トラッキング** — リアルタイム使用量バー付きの月間 publish・verify カウンター

ダッシュボード自体は Perry コンパイル済み Fastify サーバーと Next.js 静的エクスポートで構築されています — Perry で構築し、Perry ユーザーにサービスを提供。

## macOS 公証とコード署名

2つの新しい署名機能：

-   **`perry publish macos --notarize`** — 自動的に Developer ID 証明書に切り替え（App Store 証明書の代わりに）、Apple の公証サービスに送信し、結果をステープル
-   **GCloud KMS コード署名** — Windows ビルドを Google Cloud KMS キーで署名可能に。秘密鍵を露出させずに CI で自動署名を実現

## Windows UI 刷新

Windows UI バックエンドが最も包括的なアップデートを受けました：

-   **DPI 対応スケーリング** — ウィンドウサイズ、フォント、ウィジェット寸法が高 DPI ディスプレイで正しくスケール
-   **ランチャースタイルウィンドウ API** — ランチャー/Spotlight スタイル UI のためのボーダーレスウィンドウとカスタムポジショニング
-   **グローバルホットキー** — アプリがフォーカスされていなくても動作するシステムワイドのキーボードショートカット
-   **アプリアイコン** — ランチャー UI でアプリケーションアイコンを表示する `getAppIcon` API
-   **リエントランシーセーフレイアウト** — ネストされた WM\_PAINT メッセージ中のパニックを防ぐため `RefCell` ベースのペインティングを `SetPropW` HWND ストレージに置換
-   **Geisterhand 統合** — すべてのウィジェットタイプが UI テストフレームワークに登録、`/type` は HWND マップ経由で `SendMessageW` を使用
-   **Android カメラサポート** — カメラキャプチャ API を JNI 経由で Android に拡張

## パフォーマンス

v0.4.14 で包括的なパフォーマンス監査をリリース：

-   **ネイティブ `fcmp`** — 浮動小数点比較がランタイム関数呼び出しの代わりにネイティブ CPU 命令を使用。マンデルブロベンチマーク **30% 高速化**。
-   **インプレース文字列追記** — `str += "text"` が新しい文字列を割り当てる代わりにバッファをインプレースで変更。繰り返し連結で **125倍高速化**。
-   **短絡 AND/OR** — `&&` と `||` が結果が既に決定されている場合、右オペランドの評価をスキップ。
-   **負のリテラルフォールディング** — `-1`、`-0.5` などが否定命令を出力する代わりに HIR レベルで定数に畳み込み。

## Hub 並列ビルド

ビルドオーケストレーションサーバーがワーカーごとの並行ビルドをサポート：

-   **スロットベースディスパッチ** — ワーカーが `max_concurrent` 容量を報告、Hub がワーカーごとのアクティブジョブを追跡
-   **429 なし** — 全ワーカーがビジーな時にジョブが拒否される代わりにキューイング
-   **Base64 アーティファクトダウンロード** — Perry ランタイムがraw バイナリ HTTP レスポンスを処理できない場合、バイナリアーティファクトを base64 で提供
-   **自動再接続 WebSocket** — ビルドモニタリング接続が切断時に自動再接続

## 新パッケージ: perry/appstorereview

アプリストアレビューを促すための新しいファーストパーティパッケージ：

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

1つの関数、2つのプラットフォーム、ネイティブレビュー UI。タイミングと表示ロジックは完全に開発者に委ねられます。

## コード生成の修正

120コミットは多くのバグ修正を意味します。最もインパクトのあるもの：

-   **厳密等価 (===)** — v0.4.2 で3つの個別バグを修正：型タグ比較、NaN 処理、null/undefined の区別
-   **連結文字列の文字列比較** — ポインタ比較ではなくコンテンツ比較が必要なため、連結で構築された文字列の比較で `===` が失敗
-   **コンストラクタ解決** — `new X(args)` がクロスモジュールインポートされたコンストラクタとクロージャベースのコンストラクタ関数を正しく解決
-   **モジュールレベル配列 push** — ループ内のネストされた関数呼び出し内でモジュールレベル配列にプッシュされた値が再割り当て後の古いポインタにより失われた
-   **null 算術変換** — `null + 1` が `js_number_coerce` を通じて正しく `1` を生成
-   **ビットワイズ NOT ラッピング** — `~x` が ECMAScript セマンティクスに従い i32 にラップ
-   **fetch().then()** — ネイティブ UI アプリでイベントループのドレイン不足によりコールバックが発火しなかった（v0.4.3）
-   **WASM 剰余と累乗** — `%` と `**` 演算子が WASM バリデーションエラーを引き起こした（v0.4.5）

## 数字で見る

-   **約120コミット**（5日間で Perry メインコンパイラに）
-   **24のパッチリリース**：v0.4.1 → v0.4.24
-   **コンパイルターゲット**：9 → 10（tvOS 追加）
-   **Linux からのクロスコンパイルターゲット**：Windows → Windows、iOS、macOS（全 Apple + Windows）
-   **新パッケージ**：perry/appstorereview
-   **新インフラ**：app.perryts.com ダッシュボード、perry login CLI、Polar.sh 課金
-   **パフォーマンス向上**：マンデルブロ 30% 高速化（ネイティブ fcmp）、文字列連結 125倍高速化

## 今後の予定

Linux からの iOS と macOS のクロスコンパイルにより、Hub は単一の Linux サーバーからすべてのプラットフォーム向けにビルド可能になりました — コンパイル用の専用 macOS ビルドマシンは不要に（署名のみ必要）。課金インフラは Hub パブリックベータへの道を開きます。tvOS の追加により、Perry はすべての Apple プラットフォームをカバー：macOS、iOS、iPadOS、watchOS、tvOS。

-   **Hub パブリックベータ** — 外部ユーザーが TypeScript をプッシュしてネイティブバイナリを取得可能に
-   **完全な正規表現サポート** — 最後の主要言語ギャップ
-   **perry/ui 拡張** — ドラッグ＆ドロップ、アクセシビリティ、DatePicker
-   **ソースマップとデバッグ情報** — ネイティブデバッグ用 DWARF デバッグ情報

進捗は [GitHub](https://github.com/PerryTS/perry) でフォローし、ドキュメントは [docs.perryts.com](https://docs.perryts.com) で読み、全体像は [ロードマップ](/ja/roadmap/) をご確認ください。
