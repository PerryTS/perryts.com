---
title: "6 つのプラットフォームすべてで完全な機能パリティ"
excerpt: "20 以上のネイティブ UI ウィジェット、Canvas ウィジェット、テーブルビュー、システム通知、キーチェーンアクセス、マルチウィンドウサポート、そして macOS、iOS、iPadOS、Android、Linux、Windows での完全な機能パリティ——すべてひとつの TypeScript コードベースから。"
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Perryのネイティブ UIシステムの最初のバージョンを出荷した時、「クロスプラットフォーム」とは macOSがうまく動き、他の5つのプラットフォームはスタブという意味でした。v0.2.162の今日、 それはもう当てはまりません。6つのプラットフォームすべて — macOS、iOS、iPadOS、Android、Linux、Windows — が 完全な機能パリティを共有しています。同じTypeScriptコードがすべてのターゲットでネイティブウィジェットにコンパイルされます。

この記事では、v0.2.152からv0.2.164の間に出荷したものを紹介します：Canvasウィジェット、 完全なNSTableView実装、20以上のUIウィジェット、 `perry/system` モジュール、マルチウィンドウサポート、 システム通知、キーチェーンアクセス、自動バイナリサイズ削減、そしてコンパイル時プラグインシステム。 多くのことがありました。

## ウィジェットスプリント：20以上のネイティブUIコンポーネント

最大の進歩はv0.2.155で、全プラットフォームにわたって20以上のUIウィジェットが追加されました。 PerryのTypeScript UI APIは、実際のアプリを出荷するために必要なコンポーネントをカバーしています：

-   **レイアウト** — VStack、HStack、ZStack、LazyVStack、ScrollView、SplitView
-   **入力** — Button、TextField、TextEditor、Checkbox、Toggle、Slider、Picker
-   **表示** — Text、Label、Image、ProgressView、Divider、Spacer
-   **データ** — List、Table（NSTableView / GTK4 TreeView / Win32 ListView）
-   **オーバーレイ** — Alert、Sheet、Popover、Toolbar、NavigationBar
-   **描画** — Canvas（2D描画API、プラットフォームごとにハードウェアアクセラレーション）

これらはカスタムレンダラーのラッパーではありません。各ウィジェットはプラットフォーム固有の ネイティブコンポーネントにコンパイルされます：macOSでは `NSButton`、 iOSでは `UIButton`、 Linuxでは `GtkButton`、 AndroidではJNI経由で `android.widget.Button`、 Windowsでは `CreateWindowEx`。 OSがそれらを描画し、テーマを適用し、アクセシビリティを処理します — Perryは TypeScript APIを接続するだけです。

## Canvas：TypeScriptからの2D描画

技術的に最も興味深い追加の1つがCanvasウィジェット（v0.2.152）です。TypeScriptから直接 馴染みのある2D描画API — ベジェ曲線、塗りつぶし、ストローク、画像ブリッティング — を公開し、 プラットフォームのアクセラレーテッド2Dバックエンドにコンパイルされます： macOS/iOSではCore Graphics、LinuxではCairo、WindowsではDirect2D、AndroidではSkia。

canvas.ts

import { Canvas, Color } from 'perry/ui';

// Compiles to Core Graphics on macOS, Cairo on Linux, etc.

const canvas = new Canvas({ width: 400, height: 300 });

canvas.onDraw((ctx) => {

ctx.fillStyle = Color.amber;

ctx.fillRect(10, 10, 100, 60);

ctx.strokeStyle = Color.blue;

ctx.lineWidth = 2;

ctx.beginPath();

ctx.arc(200, 150, 80, 0, Math.PI \* 2);

ctx.stroke();

});

## Tableウィジェット：NSTableViewがTypeScriptに

v0.2.163でTableウィジェットが追加されました — ライブラリ内で最も複雑なコンポーネントです。macOSでは 完全なdelegate/data sourceの接続を持つ `NSTableView` に対応します。 LinuxではGTK4の `GtkTreeView` を使用します。Windowsでは Win32の `ListView` コントロール。AndroidではJNIを通じて `RecyclerView` にバインドされます。

TypeScript APIは宣言的です：カラムを定義し、データソースを提供すれば、Perryがコンパイル時に プラットフォーム固有の接続を処理します。カラムソート、選択ハンドリング、行の高さ カスタマイズがすべてそのまま動作します。

table.ts

import { Table, Column } from 'perry/ui';

const table = new Table({

columns: \[

new Column({ title: "Name", key: "name", width: 200 }),

new Column({ title: "Size", key: "size", width: 80 }),

\],

rows: files, // TypeScript array of objects

onSelect: (row) => console.log(row.name),

});

## perry/system モジュール

v0.2.155では `perry/system` も導入されました — ランタイムなしで プラットフォームのシステムAPIを公開するTypeScriptモジュールです：ファイルダイアログ、 保存ダイアログ、アラート、シート、キーチェーンアクセス、システム通知、マルチウィンドウ管理。

-   `system.showOpenDialog()` — ネイティブファイルピッカー（NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME）
-   `system.showSaveDialog()` — ネイティブ保存ダイアログ
-   `system.showAlert()` — ネイティブアラートパネル
-   `system.notify()` — OS通知（UserNotifications / libnotify / WinRT）
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — マルチウィンドウ管理

これらはすべてネイティブプラットフォームAPIを直接呼び出します — Electron IPCもWeb Viewブリッジもありません。 PerryはTypeScriptの呼び出しサイトをプラットフォームSDKへの直接的なネイティブ関数呼び出しにコンパイルします。

## 6プラットフォーム機能パリティ：v0.2.162

v0.2.162のマイルストーンはギャップを埋めることでした。このリリース前は、macOSが最も充実した 機能セットを持ち、iOSはほぼ揃っていましたが、Linux/Windows/Androidは遅れていました。v0.2.162は 6つのプラットフォームすべてを同じレベルに引き上げました：

-   **macOS** — AppKit、完全なウィジェットセット、Keychain、通知、マルチウィンドウ、ツールバー
-   **iOS / iPadOS** — UIKit、macOSとの完全なウィジェットパリティ、シーンライフサイクル
-   **Android** — JNIブリッジ、Android Views経由の全ウィジェット、NDKクロスコンパイル
-   **Linux** — GTK4、Tableを含む完全なウィジェットセット、ファイルダイアログ、libsecretキーチェーン
-   **Windows** — Win32、全ウィジェット、Windows Credential Store、WinRT通知

これは「1つのコードベース、6つのプラットフォーム」を願望ではなく現実にするマイルストーンです。 同じTypeScriptファイルが、一般的なユースケースに対してプラットフォーム固有の コードパスを必要とせず、6つすべてのターゲットでネイティブアプリにコンパイルされます。

## 自動バイナリサイズ削減

v0.2.153では自動バイナリサイズ削減が出荷されました — コンパイラは使用されていないコードパスを 積極的にデッドストリップし、到達不能なstdlib関数を排除し、リンク時にシンボル定義を 重複排除するようになりました。以前は約4 MBにコンパイルされていた典型的なCLIツールが、 ソースを変更することなく2 MB以下になります。

これは実際のデプロイメントにとって重要です。バイナリがデプロイメントの単位である場合 — サーバーにコピーしたり、 単一ファイルとして配布したり、コンテナに埋め込んだり — サイズは転送時間とストレージコストに 直接影響します。バイナリサイズを無料で半分にすることは意味のある改善です。

## コンパイル時プラグインシステム

v0.2.152ではPerryのプラグインシステムが導入されました — そしてそれはTypeScriptエコシステムの 他のあらゆるプラグインシステムとはアーキテクチャ的に異なります。ランタイムプラグインローディングなし、 IPCなし、動的な `require()` なし。プラグインはPerryがビルド時に 解決しコンパイルするTypeScriptモジュールです。

結果：プラグインのランタイムオーバーヘッドは完全にゼロです。アプリケーションコードと同じバイナリにコンパイルされ、 プラグインコードとホストコード間は直接関数呼び出しです。プラグインを使わなければ、 バイナリにまったく含まれません。使えば、他のモジュールと同様にインライン化されます。

この背景にある哲学については [プラグインシステムはパフォーマンスの税金](/ja/blog/plugin-systems-are-a-performance-tax/)で書きました。要約すると：ランタイムプラグインアーキテクチャはパフォーマンスと拡張性をトレードオフします。 ビルド時コンポジションは両方を実現します。

## 言語の改善

UIスプリントは単独で起こったわけではありません — コンパイラ自体も継続的により高機能になりました。 これらのリリースを通じて：

-   **クラス式** — `const Foo = class extends Bar {}` が正しくコンパイルされるようになりました
-   **ジェネレータ変換** — `function*` と `yield` がネイティブステートマシンにコンパイルされます
-   **クラスフィールドとしてのMap/Set** — `private items = new Map()` がコード生成で動作します
-   **FFIパラメータ型強制** — ネイティブライブラリ呼び出しが型強制を自動的に処理します
-   **バウンドメソッド参照** — `this.method` 参照がネイティブモジュール（fs、os、path）で動作します
-   `string.match()` — 完全サポートされるようになりました
-   `path.isAbsolute()`、マルチ引数 `path.join()`、`path.resolve()`
-   **Webターゲット** — Perryはハイブリッドデプロイメント用のWeb互換出力にコンパイルできるようになりました

## 次のステップ

6プラットフォームのUIパリティが出荷されたので、次のフェーズは広さよりも深さです。現在取り組んでいるのは：

-   完全なRegExpサポート（`regex.test()`、`string.matchAll()`）
-   ウィジェットシステムでのドラッグアンドドロップ、カスタムコンテキストメニュー、アクセシビリティラベル
-   Perry診断とコンパイル・オン・セーブのためのVS Code拡張機能
-   パッケージマネージャー統合 — Perryネイティブパッケージのインストールとコンパイルを1コマンドで
-   ブラウザデプロイメント用のWASMコンパイルターゲット
-   `Worker` スレッドによるマルチスレッディング

フォローしたい方は、 [Perryリポジトリ](https://github.com/PerryTS/perry)がオープンです。 [ショーケース](/ja/showcase/) で既に構築されているものを確認するか、 [ロードマップ](/ja/roadmap/) で全体像をご覧ください。
