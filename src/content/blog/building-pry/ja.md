---
title: "Pry の開発：TypeScript によるネイティブ JSON ビューア"
excerpt: "A walkthrough of building Pry, a native JSON viewer compiled from TypeScript to machine code with the Perry runtime and GC linked in and no webview."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry は TypeScript で完全に構築され、Perry でコンパイルされたネイティブ JSON ビューアです。 技術デモではありません — API レスポンス、設定ファイル、データダンプの検査に毎日使っている 実際のツールです。この記事では、どのように構築され、どのようにコンパイルされ、TypeScript が ネイティブアプリにコンパイルされるときの開発体験がどのようなものかを紹介します。

## Pry の機能

Pry は JSON ファイルを読み込み（または stdin から JSON を受け取り）、ネイティブウィンドウで インタラクティブなナビゲーション可能なツリーとしてレンダリングします。macOS の Quick Look で JSON を見たことがあれば、それを想像してください — ただし、より高速で、検索可能で、 キーボード駆動のナビゲーション付きです。

機能セット：

-   **ツリービュー** — オブジェクトと配列の折りたたみ可能なノード、深さインジケータ、すべて展開/折りたたみ
-   **検索** — キーと値の全文検索、リアルタイムハイライト、マッチナビゲーション
-   **キーボードショートカット** — 矢印キーでナビゲート、Enter で展開/折りたたみ、スラッシュで検索、`⌘C` でコピー
-   **クリップボード** — 任意のノードまたはサブツリーをフォーマット済み JSON としてコピー
-   **シンタックスカラーリング** — 文字列は緑、数値はオレンジ、ブール値は紫、null は赤
-   **ステータスバー** — 合計ノード数、現在の深さ、ファイルサイズ、パース時間を表示

## ソースコード

Pry は標準的な TypeScript で書かれています。特別な構文もマクロもビルド時のコード生成も ありません。Perry の UI API を使用しており、プラットフォーム固有のコードにコンパイルされる ネイティブウィジェットを提供します。

エントリポイントは以下の通りです（分かりやすくするために簡略化）：

pry.ts

import { App, VStack, TreeView, SearchBar, StatusBar, State }

from "perry/ui";

import { readFile, readStdin } from "perry/fs";

// Read input from file arg or stdin

const input = process.argv\[2\]

? readFile(process.argv\[2\])

: readStdin();

const startTime = Date.now();

const data = JSON.parse(input);

const parseMs = Date.now() - startTime;

// Reactive state

const searchQuery = new State("");

const matchCount = new State(0);

// Build the app

const app = new App("Pry", {

width: 800,

height: 600,

minWidth: 400,

minHeight: 300,

});

app.body(() => {

return VStack({ spacing: 0 }, \[

SearchBar({

placeholder: "Search keys and values...",

onSearch: (q) => searchQuery.value = q,

}),

TreeView(data, {

collapsible: true,

syntaxHighlight: true,

searchQuery: searchQuery,

onMatchCount: (n) => matchCount.value = n,

copyOnClick: true,

}),

StatusBar(\[

\`${countNodes(data)} nodes\`,

\`Parsed in ${parseMs}ms\`,

\`${matchCount.value} matches\`,

\]),

\]);

});

app.registerShortcut("/", () => app.focusSearchBar());

app.registerShortcut("Escape", () => {

searchQuery.value = "";

app.focusTree();

});

app.run();

これがネイティブアプリケーションの核心です。フレームワークのボイラープレートなし、ビルド設定なし、 プラットフォーム固有のファイルなし。1つの TypeScript ファイルです。

### ヘルパー関数

Pry には JSON ツリーのすべてのノードを再帰的にカウントする `countNodes`ユーティリティと、ファイルサイズを表示するための `formatBytes`ヘルパーも含まれています。これらは標準的な TypeScript 関数で、Perry 固有のものは何もありません。 他のすべてと同様にネイティブコードにコンパイルされます。

utils.ts

export function countNodes(data: unknown): number {

if (data === null || typeof data !== "object") {

return 1;

}

if (Array.isArray(data)) {

return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);

}

const values = Object.values(data as Record<string, unknown\>);

return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);

}

## Pry のコンパイル

Perry で Pry をコンパイルするのは1つのコマンドです。Xcode プロジェクトも Gradle 設定も webpack 設定も不要。Perry をエントリファイルに向けてターゲットを指定するだけです。

### macOS (ARM64)

$ perry build pry.ts --target macos-arm64

Parsing pry.ts...

Resolving imports: perry/ui, perry/fs

Compiling (cranelift, arm64)...

Linking with AppKit.framework...

✓ Built executable: pry (48 MB)

$ file pry

pry: Mach-O 64-bit executable arm64

$ otool -L pry | head -5

pry:

/System/Library/Frameworks/AppKit.framework/AppKit

/System/Library/Frameworks/Foundation.framework/Foundation

/usr/lib/libSystem.B.dylib

バイナリは 48 MB です。完全な AppKit UI スタック — ツリービューレンダリング、検索ハイライト、 シンタックスカラーリング、キーボードハンドリングを含むためです。比較として、同じアプリを Electron で作ると 200+ MB になります。CLI のみの Perry アプリは 2～5 MB にコンパイルされます。

### iOS

$ perry build pry.ts --target ios-arm64

✓ Built executable: pry (52 MB)

iOS ビルドは AppKit の代わりに UIKit にリンクします。Perry は同じ `TreeView` API を展開可能なセクション付きの`UITableView` に、`SearchBar` を `UISearchBar` にマッピングし、タッチイベントがマウスイベントに代わります。 iOS ビルドは物理デバイスとシミュレータにデプロイできます。

### Android

$ perry build pry.ts --target android-arm64

✓ Built: pry.apk

Android ビルドは JNI を通じてロードされるネイティブライブラリを生成し、APK にパッケージングされます。 `TreeView` は展開可能なビューホルダー付きの`RecyclerView` にマッピングされ、`SearchBar` は `TextWatcher` 付きの `EditText` にマッピングされ、ステータスバーはレイアウト下部の`TextView` にマッピングされます。

## 内部で何が起こっているか

Perry が Pry をコンパイルする際、いくつかのフェーズを経ます：

1.  **パース** — SWC が TypeScript ソースを AST にパースします。 `perry/ui` と `perry/fs` からの インポートは Perry の組み込みモジュール実装に解決されます。
2.  **型解析** — Perry はジェネリックな `State<string>` と `State<number>` を含むすべての型を解決し、 具体的な型に単相化します。
3.  **プラットフォーム解決** — ターゲットフラグに基づいて、Perry は適切な UI バックエンドを 選択します。各 `TreeView`、 `SearchBar`、`Button` の呼び出しが プラットフォーム固有の実装に解決されます。
4.  **IR 生成** — Perry はネイティブ API 呼び出しを含む中間表現を生成します — macOS/iOS では Objective-C メッセージ送信、Android では JNI 呼び出し、GTK4/Win32 では C 関数呼び出し。
5.  **コード生成** — Cranelift がターゲットアーキテクチャ向けに IR をネイティブマシンコードに コンパイルします。
6.  **リンキング** — ネイティブコードがプラットフォームフレームワーク （AppKit、UIKit、Android NDK、GTK4、Win32）にリンクされ、最終的な実行ファイルが生成されます。

## ランタイムなし、Web ビューなし

これは Perry と他のすべての TypeScript-to-native アプローチの核心的な違いであるため、 強調する価値があります。コンパイルされた Pry バイナリには：

-   **JavaScript エンジンなし** — V8 なし、Hermes なし、JavaScriptCore なし
-   **Web ビューなし** — Chromium なし、WebKit なし、WKWebView なし
-   **ブリッジレイヤーなし** — JS とネイティブ間のシリアライズされたメッセージなし
-   **フレームワークランタイムなし** — React なし、Flutter エンジンなし、Dart VM なし

バイナリはプラットフォーム API を直接呼び出します。macOS では AppKit オブジェクトとの やり取りに `objc_msgSend` を呼び出します。Android では ビューの作成と操作に JNI 関数を呼び出します。ネイティブの Swift や Kotlin アプリと 同じことをしています。

実用的な結果：Pry は即座に起動します。VM の起動なし、JIT のウォームアップなし、 スクリプトのパースなし。プロセスが起動し、ウィンドウが表示され、JSON がレンダリングされます。 メモリ使用量は Electron の同等品が消費するものの数分の一です。

## 開発体験

Pry の構築は、通常の TypeScript アプリケーションの構築と驚くほど似ていました。 ワークフローは：

1.  お気に入りのエディタ（VS Code、Zed、Neovim など）で TypeScript を書く
2.  `perry compile pry.ts` を実行
3.  `./pry test.json` を実行
4.  繰り返す

設定すべき Xcode プロジェクトなし。インストールすべき Android Studio なし。 45 秒かかる Gradle ビルドなし。Perry コンパイラ自体は高速で、Pry のパースとコンパイルには 数秒しかかからず、さらに高速化に取り組んでいます。

書く TypeScript は標準的な TypeScript です。エディタの型チェック、オートコンプリート、 リファクタリングツールはすべて機能します。関数の抽出、モジュールの作成、 ジェネリクスの使用 — すでに知っている TypeScript のパターンがすべて使えます。

## 学んだこと

Pry の構築から、Perry の UI API が何をサポートすべきかについて多くのことを学びました。いくつかの教訓：

-   **ツリービューは複雑です。**展開、折りたたみ、検索ハイライト、 キーボードナビゲーション、クリップボード統合のすべてを協調させる必要があります。Perry の `TreeView` ウィジェットはこれを内部で処理しますが、 ネイティブ実装が3つのプラットフォームすべてで一貫していることを確認する必要がありました。
-   **キーボードショートカットにはプラットフォームの慣習が必要です。**macOS では コピーは `⌘C` です。Linux と Android では `Ctrl+C` です。Perry のショートカットシステムはこれを抽象化しますが、 正しく動作させるには慎重な実装が必要でした。
-   **ステータスバーは意外と簡単ではありません。**各プラットフォームには、 ステータス情報をどこにどのように表示するかについて異なる慣習があります。AppKit はウィンドウの 下部バー、UIKit はツールバー、Android はレイアウト内の下部ビューを使用します。Perry の `StatusBar` はそれぞれに正しくマッピングされます。
-   **stdin サポートにはプラットフォーム認識が必要でした。**macOS と Linux では、 stdin からの読み取りは簡単です。iOS と Android では「stdin」は同じ形では存在しないため、 Pry はモバイルプラットフォームではファイル選択を代わりに使用します。Perry の `readStdin` はこれを透過的に処理します。

## パフォーマンス

Pry は大きな JSON ファイルを快適に処理します。テスト結果：

-   1 MB の JSON ファイル（10,000 以上のノード）のパースとレンダリングが 50 ms 未満
-   10 MB の JSON ファイルのレンダリングが 200 ms 未満
-   10,000 ノードの検索結果が入力中にリアルタイムで表示、目に見えるラグなし
-   大きなファイルでもメモリ使用量が 50 MB 未満

これがネイティブコンパイルの利点です。Perry での JSON パースは GC ポーズのない タイトなネイティブループにコンパイルされます。ツリーレンダリングにはプラットフォーム固有の 仮想化リストビュー（NSOutlineView、UITableView、RecyclerView）を使用しており、 パフォーマンスについて実績があります。

## ソースとダウンロード

Pry はオープンソースです。完全なソースを閲覧したり、自分でビルドしたり、 Perry ネイティブ UI アプリの構造を理解するためにコードを見ることができます。

-   [GitHub リポジトリ](https://github.com/perryts/pry) — 完全なソースコードとビルド手順
-   [ショーケースページ](/ja/showcase/pry/) — スクリーンショット、機能一覧、プラットフォーム詳細

Perry で何かを構築している方は、ぜひお知らせください。 [Perry リポジトリ](https://github.com/PerryTS/perry) で Issue を開くかディスカッションを始めてください。Perry はオープンに開発しており、 実際のアプリを構築している実際のユーザーからのフィードバックは非常に貴重です。
