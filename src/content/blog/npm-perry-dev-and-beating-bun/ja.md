---
title: "npm配布、perry dev、そしてすべてのベンチマークで勝利"
excerpt: "Perry v0.5.80 → v0.5.174を6日間で達成。@perryts/perryがサポートされている7つのすべてのプラットフォーム向けにnpmで出荷。perry devがインメモリASTキャッシュとディスク上のモジュール単位オブジェクトキャッシュの上にウォッチモードでの自動再コンパイルを追加。json_roundtripが最後のギャップを閉じる――Perryは今やNode.jsとBunの両方に対してすべてのベンチマークで勝利。"
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
前回の記事はPerry v0.5.80で締めくくられ、ベンチマーク表には1つの頑固な負けが残っていました――`JSON.parse`/`stringify`のラウンドトリップは依然としてNodeより1.6倍遅い状態でした。6日後、Perryは**v0.5.174**に到達しました――これは**94回のパッチリリース**です――そして他の何よりも先に取り上げるに値する3つの変化がありました：

-   `@perryts/perry`が**npm**で出荷されました。1つのコマンドで、サポートされているすべてのプラットフォームにPerryをインストールできます。
-   **`perry dev`**はウォッチモードでの自動再コンパイルを追加します。その上に、新しいインメモリASTキャッシュとディスク上のモジュール単位のオブジェクトキャッシュがあります。
-   `json_roundtrip`の負けが埋まりました。Perryはメインスイート内のすべてのベンチマークで**NodeとBunの両方に勝つ**ようになりました（両者に対して15/15）。

記事の残りは脇役です：WebAssemblyの修正、watchOSがついにエンドツーエンドでコンパイルできるようになったこと、`perry/thread`プリミティブの残りの配線、そして静かな脱落を本物のエラーに変える一連のコンパイル時厳密性の勝利。

## 1\. npm上の`@perryts/perry`

Perryは常にmacOSではHomebrew、Debian/UbuntuではAPT経由でインストールされてきました。これらのプラットフォームの開発者には良いカバレッジでしたが、ソースからビルドしない限りWindowsユーザーには何もなく、MacとLinuxとWindowsが混在するチームにとっては何も統一されていませんでした。v0.5.107がその問題を解消しました。

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

パッケージは薄いランチャーで、7つのプラットフォーム別オプションパッケージに依存しています――macOS arm64/x64、Linux x64/arm64（glibcとmuslの両方）、Windows x64――そしてnpmはあなたのマシンに一致する1つだけをインストールします。プラットフォームごとのバイナリサイズは数メガバイト程度です。インストール自体は数秒です。グローバルインストールのパスもあります（`npm install -g @perryts/perry`）――そちらを好むなら使えますが、プロジェクトローカルインストールは依存関係の隣にコンパイラのバージョンを固定するため、そちらが正しいデフォルトです。

公開はOIDC Trusted Publisherを通じて行われたので、すべてのリリースにプロビナンスが付与され、それをビルドしたCIジョブに紐づけられています。それ自体が1日分のCI作業でした――正しい`--provenance` / npmバージョン / ワークフローパスの組み合わせを追いかける`v0.5.107`のCIコミットがいくつかありましたが――実現し、それ以降のすべてのリリースはクリーンです。Windowsユーザーは今や一級市民であり、「OSが好む方法でインストールしてください」というチーム間の摩擦は消えました。

## 2\. `perry dev`――ウォッチモード

v0.5.143で新しいCLIサブコマンドが追加されました：

```
perry dev
```

これだけです。プロジェクトを監視し、保存時に再コンパイルし、バイナリを再起動します。インスピレーションはViteと`nodemon`です。狙いは、コンパイラからバイナリへのワークフローがランタイムより遅く感じる必要があるかのように振る舞うのをやめることです。ほとんどのプロジェクトでは、`perry dev`はウォームキャッシュで1秒未満で再ビルドします。

「ウォームキャッシュ」の部分が重要です。`perry dev`と並行して2つの新しいキャッシュが着地しました：

-   **インメモリASTキャッシュ**（v0.5.156）。単一の`perry dev`セッション内での再ビルドをまたいで、Perryはディスク上で変更されていないすべてのモジュールのパース済みASTを保持します。1つのファイルを編集すると、モジュールグラフ全体ではなく1つのファイルだけが再パースされます。
-   **ディスク上のモジュール単位オブジェクトキャッシュ（V2.2）**。各モジュールは独自の`.o`ファイルにコンパイルされ、ハッシュが取られます。変更されていないモジュールはcodegenを完全にスキップし、リンカはキャッシュされたオブジェクトを拾います。キャッシュの詳細出力は[#131](https://github.com/PerryTS/perry/issues/131)の仕様と一致しており、v0.5.160での監査ハードニングのラウンドで、ヘッダー変更を生き延びる可能性のあった古いキャッシュエントリのエッジケースが閉じられました。

2つのキャッシュは積み重なります。セッションの最初の編集はフルコンパイルですが、それ以降はあなたが実際に変更したものに比例する作業だけを行います。これは今週の単独で最大のDXの転換点です。

## 3\. すべてのベンチマークでBunに勝つ

v0.5.166の時点で、READMEには1つの正直な注意書きがありました：Perryは`json_roundtrip`（1MBで10K項目のブロブに対する50回の`JSON.parse` + `JSON.stringify`）でNodeより1.6倍遅く、Bunより2.4倍遅いと。Issue [#149](https://github.com/PerryTS/perry/issues/149)がフォローアップを追跡していました。v0.5.173までに――7日後――そのギャップが埋まりました。

|ワークロード| Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perryは今やメインベンチマークスイートのすべてのワークロードで勝っています――**Nodeに対して15/15、Bunに対して15/15**、macOS ARM64で5回実行のベスト。Bun 1.3は依然としてピークRSSで先行しています（`json_roundtrip`でPerryの310MBに対して84MB）。なのでアロケータ圧が次に閉じるべきものですが、生のレイテンシはPerryのものです。

JSONギャップの解消は1つの変更ではありませんでした――今週を通じて進められたオブジェクトレイアウト同等性作業の積み重ねでした：Phase 1のオブジェクトリテラル形状推論（v0.5.167）、自由関数、クラスメソッド、ゲッター、アロー関数に対するPhase 4の本体ベースの戻り値型推論（v0.5.169）、Phase 4.1のメソッド呼び出し戻り値型推論（v0.5.170）。テーマは前回の記事と同じです：LLVMに見通せるだけの静的構造を与えれば、オプティマイザが残りを片付ける。

v0.5.164は`<2 x double>`並列アキュムレータの自動ベクトル化を純粋なfadd縮約ループで復元しました――これはv0.5.9x→v0.5.16xの範囲のどこかで静かにリグレッションしていたものです。これが`math_intensive`と`accumulate`をRust/C++/Go/Swiftに対する以前の3～4倍のリードに戻したものです――同じLLVM、1つの`reassoc contract`フラグ、1つのベクトル化されたループ本体。

## 4\. `perry/ui`とドキュメントテスト

perry/uiに残っていた4つのギャップがv0.5.151で閉じられました。それと並行して、v0.5.119は静かなperry/ui APIの誤用を「コンパイルして何もしない」から本物のコンパイルエラーに切り替えました――v0.5.165の同じロジックがデコレータに適用されたのと同じです（以下参照）。誤用がコンパイル時に表面化することは、ランタイムよりも常に優れています。

v0.5.123は**ドキュメント例テストハーネス**とウィジェットギャラリーを出荷しました。ドキュメント内のすべてのTypeScript例は、CI実行のたびにコンパイルされるようになり、ウィジェットギャラリーはスクリーンショットを承認済みベースラインと比較します。v0.5.125はそれをクロスコンパイルマトリックスに拡張しました：すべてのドキュメント例がホストプラットフォームだけでなくiOS、tvOS、Android、WASM、Web向けにもビルドされるので、ターゲットをまたいだAPIドリフトは、それを出荷したリリースサイクルではなく、それを導入したPRで捕捉されます。

小さなQoLの勝利：`perry check`はHIR低下エラーに対して`file:line:column`を出すようになりました（[#129](https://github.com/PerryTS/perry/issues/129)）。これはエディタのジャンプ・トゥ・エラーが機能することを意味します――場所のない一般的なメッセージを表示する代わりに。

## 5\. watchOSがエンドツーエンドでコンパイル

watchOSは先月コンパイルターゲットとして出荷されましたが、クリーンなエンドツーエンドビルドには粗いエッジがいくつかありました。今週のwatchOS作業：

-   **v0.5.113**：`--target watchos`と`--target watchos-simulator`が、蓄積されていた回避策なしでエンドツーエンドでコンパイルできるようになりました。
-   **v0.5.114**：Metalサーフェスアプリ用の`--features watchos-game-loop`。
-   **v0.5.122**：SwiftUIホストレンダリング用の`--features watchos-swift-app`――SwiftUIにアプリのライフサイクルを所有させ、Perryにその中のUIを構成させたい場合用です。
-   **v0.5.135**：`PERRY_UI_TEST_MODE`がperry-ui-iosとperry-ui-tvosに配線されたので、Geisterhand UIテストはこの2つのターゲットでもmacOSとLinuxと同じように実行されます。

## 6\. `perry/thread`プリミティブが完全配線

v0.5.174（本日）は[#146](https://github.com/PerryTS/perry/issues/146)を閉じました：`parallelMap`、`parallelFilter`、`spawn`がcodegenパスを通じて完全に配線され、コンパイル時の安全性が強制されます。ミュータブルキャプチャはコンパイル時に拒否されます――perry/uiとデコレータが今持っているのと同じコンパイル時正しさの姿勢です。v0.4.0の発表以来部分的に配線されていたスレッドプリミティブが、エンドツーエンドで完成しました。

## 7\. WebAssemblyとWebターゲット

取り上げるに値する2つのWASM修正：

-   **v0.5.158**：`--target web`（WASM出力パス）の5つの相互にマスクし合う複合バグ。バッチで修正され、Webターゲットは今や完全な`perry/ui`サーフェスの下で持ちこたえます（[#133](https://github.com/PerryTS/perry/issues/133)）。
-   **v0.5.161**：ループ内の`if`内の`break`/`continue`がWASMでハングしていました――ネイティブターゲットでは再現しなかったcodegenバグです。修正済み（[#135](https://github.com/PerryTS/perry/issues/135)）。

また正しさ面で：v0.5.157はAndroidで`obj.field`が`NaN`を返す問題を修正しました（[#128](https://github.com/PerryTS/perry/issues/128)）。v0.5.162は`sendToClient`と`closeClient`が静かなno-opにコンパイルされていた呪われたwsバグを修正しました（[#136](https://github.com/PerryTS/perry/issues/136)）。

## 8\. コンパイル時厳密性の勝利

今週のテーマ：以前は静かな失敗だったものはすべてコンパイルエラーになりました。

-   **v0.5.165**：TypeScriptデコレータはHIRにパースされた後、静かに落とされていました。今ではデコレーションポイントで明確なメッセージとともにエラーになります（[#144](https://github.com/PerryTS/perry/issues/144)）。v0.5.119でperry/uiに適用されたのと同じwarn→bailの推論です。
-   **v0.5.119**：perry/ui APIの誤用は、no-opバイナリを生成する代わりにコンパイル時に拒否されます。
-   **v0.5.172**：`console.trace()`は、単にメッセージをエコーする代わりに、本物のネイティブバックトレースをstderrに出すようになりました（[#20](https://github.com/PerryTS/perry/issues/20)）。シンボル化されたフレームには`PERRY_DEBUG_SYMBOLS=1`が必要です。それなしではアドレスが得られますが、それでも置き換えられたメッセージエコー動作よりは多いです。

## 9\. まとめ

今週のパターン：**配布**（npm）、**開発者体験**（`perry dev`、インクリメンタルキャッシュ）、そして**残っていた最後のベンチマーク敗北が閉じた**こと。加えて、静かな脱落を本物のエラーに変える一連のコンパイル時厳密性。6日間、94回のパッチリリース、1つの大きなDXシフト。

試してみてください：

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev
```

ソース：[github.com/PerryTS/perry](https://github.com/PerryTS/perry) ― ドキュメント：[docs.perryts.com](https://docs.perryts.com) ― チェンジログ：[CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

― Ralph
