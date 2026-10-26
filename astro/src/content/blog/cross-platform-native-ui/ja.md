---
title: "TypeScript からクロスプラットフォームのネイティブ UI を実現"
excerpt: "How Perry maps one TypeScript codebase to platform widgets across its documented targets, including the platform-specific limitations and prerequisites."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Perry の最も野心的な目標の1つは、単一の TypeScript コードベースから真にネイティブな GUI アプリケーションを 提供することです。ネイティブシェルにラップされた Web ビューではありません。独自のピクセルを描画する カスタムレンダリングエンジンでもありません。各プラットフォーム独自の UI フレームワークによってレンダリングされる 本物のネイティブウィジェットを、ビルド時に TypeScript からコンパイルします。

この記事では、その仕組み — アーキテクチャ、プラットフォームマッピング、トレードオフ、 そして現在の状況について説明します。

## 現在のアプローチの問題点

クロスプラットフォーム GUI 開発は数十年にわたって難しい問題でした。すべての主要な フレームワークが異なる妥協を行ってきました：

### Electron / Tauri（Web ベース）

Electron は Chromium と Node.js をバンドルし、Web ブラウザをアプリシェルとして提供します。 Web プラットフォームへの完全なアクセスが得られますが、「ネイティブ」アプリは 150+ MB の ダウンロードで、ウィンドウを表示するだけで数百 MB の RAM を使用します。Tauri は Chromium を OS の Web ビューに置き換え、サイズを大幅に削減しますが、UI は依然として Web ビューで レンダリングされる HTML/CSS であり、ネイティブウィジェットではありません。

### React Native（ブリッジベース）

React Native は JavaScript を JS エンジン（Hermes または V8）で実行し、シリアライズされた メッセージキューを通じてネイティブウィジェットにブリッジします。本物のネイティブウィジェットが得られますが、 ブリッジはジェスチャーやアニメーションにおいてレイテンシーを追加します。複雑なインタラクションには ネイティブコード（Swift/Kotlin）に降りる必要があり、単一コードベースの約束を台無しにします。

### Flutter（カスタムレンダラー）

Flutter は Dart をネイティブコードにコンパイルし、独自の Skia ベースのレンダリングエンジンで すべてを描画します。パフォーマンスは優れていますが、ウィジェットはネイティブではありません — ピクセルパーフェクトなレプリカです。つまり、プラットフォームの慣習（スクロール物理、テキスト選択、 アクセシビリティの動作）は継承するのではなく再実装する必要があります。デスクトップでは その違いがより目立ちます。

### KMP + Compose Multiplatform（部分的ネイティブ）

Kotlin Multiplatform は Android では JVM に、iOS ではネイティブにコンパイルしますが、 Compose Multiplatform を通じた共有 UI はカスタム Skia ベースのレンダラーを使用します — Flutter と同じ トレードオフです。真にネイティブな UI のためには、プラットフォーム固有のコードを書くことに戻ります。

## Perry のアプローチ：ネイティブツールキットへのコンパイル

Perry は根本的に異なるアプローチを取ります。ランタイムでコードを実行してネイティブウィジェットに ブリッジしたり、カスタムピクセルを描画する代わりに、Perry は TypeScript の UI コードを ビルド時に各プラットフォームのネイティブツールキットへの呼び出しに直接コンパイルします。

重要な違い：**コードとプラットフォーム SDK の間にランタイムレイヤーがありません。** コンパイルされたバイナリは AppKit、UIKit、Android Views、GTK4、Win32 を直接呼び出します。 Swift、Kotlin、C++ で書かれたアプリとまったく同じです。

## 統一 UI API

Perry はユーザーインターフェースを構築するための共通 TypeScript API を提供します。この API は 意図的に高レベルです — UI に何を含め、どのように動作すべきかを記述すると、 Perry が適切なネイティブ構成にマッピングします。

counter.ts

import { App, Text, Button, VStack, State } from "perry/ui";

const count = new State(0);

const app = new App("Counter", { width: 400, height: 300 });

app.body(() => {

return VStack({ spacing: 16, alignment: "center" }, \[

Text(\`Count: ${count.value}\`, { fontSize: 32 }),

Button("Increment", () => count.value++),

Button("Reset", () => count.value = 0),

\]);

});

app.run();

同じコードが6つのプラットフォームすべてでネイティブ UI にコンパイルされます。`#ifdef` なし、 プラットフォームチェックなし、条件付きインポートなし。

## プラットフォームマッピングの詳細

Perry が統一 API を各プラットフォームのネイティブフレームワークにどのようにマッピングするかを説明します：

### macOS — AppKit

macOS では、Perry は AppKit オブジェクトを直接作成・管理するコードを生成します。`App` は `NSWindow` を持つ`NSApplication` になります。 `Text` は `NSTextField`（編集無効）になります。 `Button` はコールバックに接続された target-action パターンを持つ`NSButton` になります。 `VStack` は垂直方向の `NSStackView` になります。 レイアウトには Auto Layout 制約を使用します。

コンパイルされたバイナリは AppKit フレームワークにリンクし、Objective-C ランタイム関数を 直接呼び出します。Xcode でコンパイルされた Swift と同じことをしています。

### iOS と iPadOS — UIKit

iOS では、マッピングは同様ですが UIKit をターゲットにします。 `App` は `UIWindow` と ルート `UIViewController` を持つ`UIApplication` になります。 `Text` は `UILabel` にマッピングされます。 `Button` は `UIButton` にマッピングされます。 レイアウトには `UIStackView` と Auto Layout を使用します。 タッチイベントは UIKit のレスポンダチェーンを通じて処理されます。

### Android — JNI + Views

Android では、Perry は JNI（Java Native Interface）を介してロードされるネイティブライブラリを生成します。 `App` は `Activity` にマッピングされます。 `Text` は `TextView` になります。 `Button` は `OnClickListener` 付きの`android.widget.Button` になります。 `VStack` は垂直 `LinearLayout` にマッピングされます。 ネイティブコードは JNI を通じて Android フレームワークを呼び出し、実際の Android ビューを 作成・操作します。

### Linux — GTK4

Linux では、Perry は GTK4 をターゲットにします。 `App` は `GtkApplicationWindow` を持つ`GtkApplication` になります。 `Text` は `GtkLabel` にマッピングされます。 `Button` はシグナルハンドラ付きの`GtkButton` にマッピングされます。 `VStack` は垂直方向の `GtkBox` にマッピングされます。 GTK の CSS テーマ機能により、アプリはユーザーのデスクトップテーマに自動的に従います。

### Windows — Win32

Windows では、Perry は Win32 API 呼び出しを生成します。 `App` はウィンドウクラスを作成して登録し、メッセージループを実行します。 `Button` は `CreateWindowEx` で作成された`BUTTON` コントロールになります。 `Text` は `STATIC` コントロールにマッピングされます。 イベントは Win32 メッセージポンプ（`WM_COMMAND`、 `WM_NOTIFY` など）を通じて処理されます。

## 状態管理

Perry の `State<T>` プリミティブは、プラットフォームネイティブの 更新メカニズムにコンパイルされるリアクティブな状態管理を提供します。状態値が変更されると、 Perry はプラットフォーム独自の無効化システムを通じて UI 更新をトリガーします — macOS/iOS では`setNeedsDisplay`、Android では `invalidate()`、Linux では `gtk_widget_queue_draw`。

仮想 DOM の差分比較も、リコンシリエーションパスも、シリアライゼーションもありません。 状態変更は値を表示するネイティブウィジェットに直接伝播します。

## なぜ SwiftUI / Jetpack Compose の構文ではないのか？

Perry が SwiftUI や Jetpack Compose に似た宣言的構文を使わないのはなぜかと 思うかもしれません。答えは実用的です：Perry は TypeScript をコンパイルし、TypeScript には 固有のイディオムがあります。TypeScript 開発者にとって違和感のある DSL を発明するのではなく、 Perry は TypeScript で自然に感じられるビルダースタイルの API を使用します — コンストラクタ、 メソッド呼び出し、コールバック、クロージャ。Express、React フック、その他の TypeScript ライブラリで既に使っているのと同じパターンです。

## 現在利用可能なもの

6つのプラットフォームバックエンドはすべて実装済みで安定しています。現在のウィジェットセット：

-   **レイアウト** — VStack、HStack、Spacer、ScrollView、Divider
-   **表示** — Text、Image
-   **入力** — Button、TextField、Toggle、Slider
-   **ナビゲーション** — NavigationView、TabView、List
-   **コンテナ** — TreeView、SearchBar、StatusBar
-   **状態** — リアクティブ更新のための State<T>

## 今後の予定

ウィジェットライブラリを積極的に拡張しています。次に予定されているもの：

-   `SecureField` — プラットフォームネイティブのセキュアテキスト入力によるパスワード入力
-   `ProgressView` — 確定・不確定プログレスインジケータ
-   `Alert` — ボタンとテキストフィールド付きのネイティブアラートダイアログ
-   `DatePicker` — プラットフォームネイティブの日付/時刻選択
-   `Menu` — ネイティブメニューバーとコンテキストメニュー

目標はすべてのプラットフォームで完全な GUI フレームワークパリティを達成することです — すべてのウィジェット、 レイアウト、ジェスチャー、アニメーションがどこでも利用可能に。全体像は [ロードマップ](/ja/roadmap/)をご覧ください。

## 試してみよう

Perry のネイティブ UI を理解する最良の方法は、実際に動作しているのを見ることです。 [Pry](/ja/showcase/pry/) は Perry で 完全に TypeScript で構築されたネイティブ JSON ビューアです — ツリーナビゲーション、検索、 キーボードショートカットを備えた実際のアプリで、macOS、iOS、Android のネイティブバイナリに コンパイルされています。構築方法の [完全なウォークスルー](/ja/blog/building-pry/) をお読みください。
