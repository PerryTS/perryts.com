---
title: "完全なパイプライン：ドキュメント、配布、WidgetKit"
excerpt: "1 週間で 82 コミット：49 ページのドキュメントサイト、App Store と Play Store への自動公開、Homebrew と APT パッケージ、TypeScript からのネイティブ WidgetKit エクステンション、新しいウィジェット、http/https モジュール、セルフホスティング LLVM コンパイラ。"
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
7日間で82コミット。49ページのドキュメントサイト。App StoreとPlay Storeへの自動公開。 HomebrewとAPTパッケージ。TypeScriptからコンパイルされたネイティブWidgetKit拡張。 セルフホスティングLLVMコンパイラ。そしてすべてのプラットフォームにわたる数十のバグ修正。

この投稿では、2026年3月6日から3月13日の間にPerryで出荷されたすべてを取り上げます。テーマは 完成 — 「TypeScriptを書いた」から「アプリがApp Storeにある」までのギャップを埋めることです。

## docs.perryts.com

Perryに本格的なドキュメントサイトができました。mdBookで構築された49ページで、 入門からCLIリファレンスまですべてをカバーしています。ドキュメントはセクションに整理されています：

-   **はじめに** — インストール、最初のプロジェクト、プロジェクト構造
-   **言語機能** — PerryがTypeScriptからサポートするすべて
-   **ネイティブUI** — すべてのウィジェットタイプ、レイアウト、状態管理、プラットフォーム固有の動作をカバーする12ページ
-   **プラットフォーム** — 6つのターゲットプラットフォームそれぞれの専用ページ
-   **標準ライブラリ** — 50以上のネイティブパッケージ実装のドキュメント
-   **システムAPI** — ファイルダイアログ、キーチェーン、通知、マルチウィンドウ
-   **WidgetKit** — 新しいウィジェット拡張モジュール
-   **プラグイン** — コンパイル時プラグインアーキテクチャ
-   **CLIリファレンス** — すべてのコマンドとフラグ

サイトにはAI発見性のための`llms.txt`ファイルも含まれており、 GitHub Pagesで [docs.perryts.com](https://docs.perryts.com)のカスタムドメインでデプロイされています。

## ワンコマンドでPerryをインストール

Perryは、ソースからのビルドに加えて、HomebrewとAPTを通じて配布されるようになりました。新しい GitHub Actionsリリースパイプラインが、macOS（arm64とx86\_64）と Linux（x86\_64とarm64）用のバイナリをビルドし、HomebrewタップとAPTリポジトリを自動的に更新します。

terminal

\# macOS

brew tap PerryTS/perry

brew install perry

\# Debian/Ubuntu

sudo apt update && sudo apt install perry

リポジトリをクローンしてCargoでビルドする必要はもうありません。他のツールと同じ方法でPerryをインストールできます。

## App Store公開の自動化

これが最も多くの手動ステップを排除する変更です。 `perry publish ios`を実行すると、iOSディストリビューション パイプライン全体を自動的に処理します：

1.  App Store Connect APIを介してRSAキーとCSRを生成
2.  ディストリビューション証明書を作成し`.p12`にバンドル
3.  バンドルIDを登録
4.  プロビジョニングプロファイルを作成してダウンロード
5.  App Store Connectアプリレコードを作成
6.  ビルド、署名、TestFlightまたはApp Storeにアップロード

Xcodeなし。手動のポータル訪問なし。ブラウザからの証明書ダウンロードなし。セットアップ ウィザードは初回公開時に自動的に実行され、APIキーの設定を案内し、 認証情報を`perry.toml`に保存します。

macOSの配布も同様に自動化されています。Perryは3つのモードをサポート：TestFlight、公証済みDMG、 そしてApp Storeへの公開と公証済みDMGの作成を同時に行う新しい**「両方」**モード。 3つの証明書タイプが自動生成されます： `MAC_APP_DISTRIBUTION`、 `MAC_INSTALLER_DISTRIBUTION`、 `DEVELOPER_ID_APPLICATION`。

Android公開にも自動トリガーのセットアップウィザードが追加されました。3つのプラットフォームすべてが 同じパターンに従います：初回実行でセットアップがトリガーされ、認証情報がプロジェクトに保存され、 以降の実行はゼロコンフィギュレーションです。

プリフライト検証がビルド開始前に問題をキャッチします — プロビジョニングプロファイルの バンドルIDミスマッチ、証明書の有効期限切れ、アプリアイコンの欠如、無効なバージョン形式、誤ったチームID。 そして`perry.toml [ios]`の `encryption_exempt`はInfo.plistの `ITSAppUsesNonExemptEncryption`キーを自動設定し、 App Store Connectの手動エクスポートコンプライアンスプロンプトをスキップします。

## perry/widget：TypeScriptからWidgetKit

PerryはTypeScriptをネイティブSwiftUI WidgetKit拡張にコンパイルできるようになりました。これはラッパーや ブリッジではありません — コンパイラがHIRレベルでレンダーツリーを走査し、SwiftUIソースコードを 直接出力します。出力はXcode（またはPerryのビルドパイプライン）がアプリに埋め込める完全な WidgetKit拡張バンドルです。

terminal

perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/

このアプローチはPerryの他のコンパイルとは根本的に異なります。通常のPerryコードは Craneliftを経てネイティブマシンコードになります。ウィジェットコードはHIRからSwiftUI テキスト出力になります。なぜならWidgetKitはSwiftUIを要求するからです — 命令型UIKitや AppKitコードでウィジェット拡張を構築する方法はありません。Perryはウィジェットのレンダーツリーを ランタイムコードではなくコンパイル時テンプレートとして扱うことでこれを解決します。

## 新しいウィジェットとプラットフォームの改善

今週4つの新しいウィジェットタイプが追加されました：

-   **TextArea** — macOS、iOS、Androidでの複数行テキスト編集
-   **SecureField** — iOSとmacOSでのパスワード入力
-   **QR Code** — iOS、macOS、AndroidでのネイティブQRコード生成
-   **Splash Screen** — 自動生成されるLaunchScreenストーリーボード（iOS）とスプラッシュテーマ（Android）

### iPadがネイティブに

Perryは完全なiPadネイティブアプリを生成するようになりました：`UIDeviceFamily [1,2]`、 画面の向きのサポート、`UIRequiresFullScreen`、そしてibtoolを介した コンパイル済みLaunchScreenストーリーボード。新しい`getDeviceIdiom()` 関数がランタイムで電話 vs. iPadを検出し、`PerryFrameSplit` がiPadレイアウト用のフレームベースの水平分割コンテナを提供します。

### Windows

Windowsがタイマーサポート（50ms `WM_TIMER`ティック）、 ダークテーマ背景のオーナー描画ボタン、18のウィジェットファイルにわたる `to_wide().as_ptr()`のuse-after-freeバグの修正を得ました。V8ランタイムは 必要なシステムライブラリがリンクされた状態でWindowsで動作するようになりました。

### GTK4 (Linux)

GTK4バックエンドはmacOSに合わせたビジュアルポリッシュを受けました：エッジインセット用のCSSパディング、Adwaita ボタンスタイリング、VStackマージン修正、ScrollView水平ポリシー。

## http/httpsとbetter-sqlite3

2つの重要なstdlib追加：

新しい`http`と `https`ネイティブモジュールは、内部でreqwestを使用した クライアントサイドHTTPを提供します。APIはNode.jsに一致： `request()`、 `get()`、 write/end/on付きの`ClientRequest`、 statusCodeとイベントハンドラ付きの`IncomingMessage`。

`better-sqlite3`が完全にサポートされるようになりました： `new Database()`、 `prepare`、 `exec`、 `run`、 `get`、 `all` — 適切なNaN-boxingと名前付きプロパティアクセスの 行オブジェクト付き。

その他のstdlib改善：`crypto.randomBytes()`が Buffer を返すように（Node.jsに一致）、MongoDBが `listDatabases`と `listCollections`をスレッドセーフティ修正と共に獲得、 mysql2のINSERT/UPDATE/DELETEが `insertId`付きの `ResultSetHeader`を返すように。

## GCと正確性の修正

今週、いくつかの重要なガベージコレクタとランタイム正確性の修正が出荷されました：

-   **GC再入ガード** — アロケーション中の収集を防止し、RefCellダブルボローパニックを修正
-   **GC Mapトレーシング** — Mapがマークフェーズ中に適切にトレースされるようになり、文字列キーの収集を防止
-   **文字列エイリアシング修正** — 文字列appendが常にフレッシュな文字列を割り当てるようになり、ポインタコピーエイリアシングによる破損を修正
-   **BigInt算術** — 右シフトが負の数に対して算術シフトを使用、ビット演算がToInt32ラッピングセマンティクスを使用
-   **Map.get() undefined** — 欠落キーに対して誤ったNaNタグの代わりに正しい`TAG_UNDEFINED`を返す
-   **静的フィールドGCルート** — 静的クラスフィールドのBigInt値がGCルートとして登録

これらはマイナーな修正ではありません。GC再入修正だけで、断続的なクラッシュの全クラスが解決されました。 文字列エイリアシング修正は、ある文字列変数を別の変数に代入し、いずれかを変更するすべてのプログラムに影響しました。 これらは実際のワークロードでのみ表面化するタイプのバグであり、それらを修正することがコンパイラを プロダクショングレードにするのです。

## perry-verify：強化

自動アプリ検証サービスの`perry-verify`が セキュリティ強化パスを受けました：Linuxでは `bwrap`、macOSでは `sandbox-exec`によるサンドボックス実行、WebSocket ハンドシェイクとバイナリダウンロードでの認証トークン、IPごとのレート制限、列挙を防ぐ完全UUIDジョブID、 そして削減されたボディ制限。

## perrysdad：セルフホスティングコンパイラ

並行する取り組みで、TypeScriptで書かれたセルフホスティングLLVM IRコンパイラの`perrysdad`が、この週に5つのフェーズでゼロからセルフコンパイルに到達しました：

1.  **フェーズ0-1** — エンドツーエンドのスケルトン：HIRからLLVM IRテキストからclang、Perryの`libperry_runtime.a`に対してリンク
2.  **フェーズ2** — 実際の`.ts`ファイル用のPratt式パーシング付き手書き再帰下降パーサー
3.  **フェーズ3** — ランタイムFFI付きの配列、オブジェクト、Map、さらに重要なABIミスマッチの修正（LLVM IRでJSValueがi64ではなくdoubleとして宣言されていた）
4.  **フェーズ4** — クラス、列挙型、クロージャ、モジュール発見とトポロジカルソート付きマルチファイルコンパイル

マイルストーン：セルフコンパイルされた`anvil`バイナリが テストプログラムをコンパイルし、nodeコンパイル版と一致する正しい出力を生成できるようになりました。 TypeScriptコンパイラが、Perryによってネイティブコードにコンパイルされ、さらにTypeScriptをネイティブコードにコンパイルする。 まさにタートルズ・オール・ザ・ウェイ・ダウン。

## 数字で見る

-   **82コミット**がメインのPerryコンパイラに
-   **1リリース**：v0.2.173（3月8日）
-   **49ページのドキュメント**がdocs.perryts.comに
-   **4つの新しいウィジェット**：TextArea、SecureField、QR Code、Splash Screen
-   **3つの配布チャネル**：Homebrew、APT、ソース
-   **3つの自動ストアパイプライン**：App Store、TestFlight、Google Play
-   **全6プラットフォーム**が今週改善を受けた

## 次のステップ

パイプラインが充実してきています。TypeScriptを書き、6つのプラットフォームにコンパイルし、 HomebrewやAPTで配布し、App StoreとPlay Storeに公開し、ホーム画面ウィジェットを追加し、 包括的なドキュメントを読むことができます — すべてPerryのツールチェーンから離れることなく。残っているのは：

-   **完全な正規表現サポート** — 最後の主要な言語ギャップ
-   **perry/uiの拡張** — ドラッグアンドドロップ、アクセシビリティラベル、DatePicker
-   **perrysdadの成熟** — セルフホスティングコンパイラの完全なPerry対等性への拡張
-   **Hubパブリックベータ** — 外部ユーザーへの分散ビルドの公開

進捗は [GitHub](https://github.com/PerryTS/perry)でフォロー、新しいドキュメントは [docs.perryts.com](https://docs.perryts.com)で読む、または [ロードマップ](/ja/roadmap/) で全体像をご確認ください。
