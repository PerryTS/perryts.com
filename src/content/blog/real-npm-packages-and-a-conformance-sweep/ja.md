---
title: "本物の npm パッケージが今コンパイルできる：axios、zod、express — そして適合性の一掃"
excerpt: "v0.5.875 から v0.5.1146 までの約 270 リリースは、1 つのベンチマークについてではなかった — 本物の npm パッケージをコンパイルして動かすことについてだった。axios、zod v4、express、fastify、hono が今や動く。test262 パリティが跳躍した（String 60→79%、Array 61→72%）。Windows は Mica で Fluent になった。そして DatePicker とドラッグ & ドロップがすべてのプラットフォームに着地した。"
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
前回の投稿は **v0.5.875** で GC のストーリーとともに締めくくりました — aya\_koto 氏のベンチマークが暴いたギャップを埋める話です。あの投稿は 1 つのベンチマークに勝つ話でした。今回は別の種類の仕事についてです：約 4 週間にわたって着地した、**v0.5.875 から v0.5.1146 までのおよそ 270 リリース**、そのほとんどはベンチマークの見出しではありません。テーマは「マイクロベンチマークで速く走る」から **「実世界の TypeScript と本物の npm パッケージを実際にコンパイルして動かす」** へと移りました。加えて、その道のりで Windows の全面的なビジュアル刷新と、新しいウィジェットの山も。

出荷されたものを、実際に何のためだったかでグループ分けして紹介します。

## 本物の npm パッケージが今コンパイルできる

このウィンドウを貫く最大の単一スレッドは、人気の npm パッケージをネイティブバイナリにコンパイルして振る舞いのテストを通す一掃でした — 単に「エラーなくリンクする」だけでなく、実行して正しい出力を生むこと。今 `perry.compilePackages` を通して動くリストには、**axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, Colyseus** が含まれます。

それぞれが固有の理由で失敗し、それぞれの修正が固有の小さなストーリーです：

-   **zod v4** は `Cannot read properties of undefined (reading 'onattach')` でクラッシュしていました。根本原因（v0.5.1144、[#4698](https://github.com/PerryTS/perry/issues/4698)）：別のモジュールからインポートされた関数 `F` に対する `new F()` が静かに空のオブジェクトを生んでいた — コンストラクタの本体が一度も実行されず、その結果すべての `$ZodCheckMinLength` 系のチェックが `_zod` プロパティを剥ぎ取られた状態で返ってきていました。
-   **axios + jose** は Perry がまだ持っていなかった crypto と圧縮を必要としました：`zlib.createBrotliDecompress`、`crypto.subtle.wrapKey`/`unwrapKey`、AES-GCM 向けの `subtle.generateKey` / `encrypt` / `decrypt`、そして `randomFillSync`（v0.5.972–976）。
-   **fastify** は `wait_for_promise` の 1 秒ポーリングタイムアウトでデッドロックしていました。私たちはそれを condvar の待機に置き換え、リジェクトされた Promise がハングする代わりに `HTTP 500` として表面化するようにしました（v0.5.912）。
-   **@hono/node-server** は POST のボディを読めませんでした — v0.5.1142 の親登録の修正までは、`c.req.text()` / `.json()` / `.formData()` が POST/PUT で空を返していました。
-   **chalk, ms, debug, express** はすべて同じ形にぶつかりました：*プロパティが付与された呼び出し可能な値*（`chalk.red`、`express()` に加えて `express.Router`）。そのパターンの 3 つのフレーバーが v0.5.935 とその周辺の npm 一掃にわたって修正され、加えて express を解放するための `util.inherits` + ストリームのプロトタイプ足場（v0.5.990）。
-   **dayjs** は minify されたバンドルとして出荷されており、Perry が誤って lowering していた JS クラシックなプロトタイプメソッドのディスパッチ（`Class.prototype.m = fn`）を行使していました（v0.5.924/932）。

そのすべての下には、Perry が *ネイティブに*コンパイルできないパッケージをそれでも動かす部分があります：このウィンドウで **V8 フォールバックランタイム**が本物になりました。その ModuleLoader は今や埋め込まれたモジュールマップから読み込むので、フォールバックバイナリも依然として **自己完結** です — ランタイムにバラバラの `node_modules` はありません（v0.5.994）。`createServer` は本物の hyper サーバにブリッジし（v0.5.999）、`Response` / `Request` / `Headers` という Web Fetch のグローバルがフォールバックパスに存在します（v0.5.1006）。そして **コンパイル時の動的 `import()`** — ビルド時に解決される文字列リテラルの `await import('./foo.ts')` — がついに着地しました（v0.5.905、[#100](https://github.com/PerryTS/perry/issues/100)）。

## test262 適合性の一掃

もう 1 つの支配的なスレッドは適合性です。私たちは test262 のサブセットレーダーに対して焦点を絞ったパスを走らせ、実際のコードが最も強く依存する組み込みで針を動かしました：

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

String の跳躍は、すべての `String.prototype` メソッドにジェネリックな `this` ディスパッチを与え、`slice`/`substring` のインデックス強制を修正したことから来ました。Array の跳躍は、密配列のコールバック（`forEach`/`map`/`filter`/…）での `thisArg`、配列ライクな `ToLength`、仕様どおりの操作順序、そして引数ゼロのバリデーションでした。デストラクチャリングは、プレーン・ジェネレータ・async ジェネレータ・static・private のクラスメソッドにまたがるパラメータデストラクチャリングを拾いました。

見出しの数値と並んで、正しさのロングテールが着地しました：`JSON.parse` は今や本物の `SyntaxError`（`TypeError` ではなく）をスローし、末尾のトークンを拒否します。その reviver は仕様の `InternalizeJSONProperty` アルゴリズムを介して歩きます。`Object.prototype.toString` は型付き配列、Symbol、BigInt、Map/Set/WeakMap/WeakSet/Promise/RegExp に対して正しくブランド付けします。`RegExp.prototype.toString` は `/source/flags` を返します。async ジェネレータは `yield` がオペランドを await するセマンティクスを正しくしました。これらはフルスイートではなくサブセットレーダーです — Perry はまだ登り続けています — が、今月の登りは急峻でした。

## Windows が Fluent になる

Windows はビジュアルの刷新を受けました（[#4681](https://github.com/PerryTS/perry/issues/4681) シリーズ）。Perry のウィンドウは今やデフォルトでモダンな DWM クロームにオプトインします — **Mica の背景**、丸い角、そしてテーマ対応のタイトルバー — そしてコモンコントロールは、Windows 95 時代のデフォルトではなく **comctl32 v6** を通してレンダリングされます。ウィンドウプロシージャは今や `WM_DPICHANGED` を処理するので、スケーリングが混在したモニタ間でウィンドウをドラッグしても、ビットマップが引き伸ばされる代わりにくっきりしたままです。

重要なのは、これらのいずれも、古い [#1542](https://github.com/PerryTS/perry/issues/1542)「リサイズ後の黒い領域」リグレッションを再導入しなかったことです：クライアント領域は依然として不透明に描画され、フルフレームの Mica/Acrylic のブラースルーは明示的な `app.setVibrancy(...)` のオプトインのままです。完全にモダンなスタックを望むアプリのための新しい `--target windows-winui` バックエンドの足場（WinUI 3）もあり、そして小さいが本物の修正として、`perry compile main.ts -o main` が Windows で `main.exe` を生成するようにして、PowerShell が実際にそれを起動できるようにしました（v0.5.1146）。

## 新しいウィジェット、すべてのプラットフォームで

2 つのウィジェットがちょうど直近の 1 日で着地し、両方とも Perry がターゲットとするすべての UI プラットフォームにまたがります：

-   **DatePicker**（[#4772](https://github.com/PerryTS/perry/issues/4772)） — コンパクトでフィールドスタイルの日付コントロール：macOS では `NSDatePicker`、iOS/visionOS では `UIDatePicker`（.compact）、Windows では `SysDateTimePick32`、Android では `android.widget.DatePicker`、Linux では GTK4。そのすべてにまたがる 1 つの TS サーフェス。
-   **ドラッグ & ドロップ**（[#4773](https://github.com/PerryTS/perry/issues/4773)） — どのウィジェットもテキスト/ファイル/URL のドロップ先かつドラッグ元になれ、`NSDraggingDestination`（AppKit）、`UIDropInteraction`（UIKit）、`View.setOnDragListener`（Android）にマップされます。

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

このウィンドウの早い段階で、ウィジェットの棚はデスクトップとモバイルにまたがって埋まりました — Combobox、TreeView、Calendar、Chart、CommandPalette、RichTextEditor、MapView、PdfView、BottomNavigation、そしてスワイプ可能な ImageGallery — それぞれがすべてのプラットフォームで本物のネイティブコントロールに裏打ちされています。HarmonyOS（ArkTS）は Chart と TreeView を得て（v0.5.893）、他と肩を並べるために必要だった最後の 2 つのウィジェットでした。

## GC、内部実装、そして安定性

それら 270 リリースのほとんどは見出しではありません — バグ修正と内部実装であり、それこそがこのフェーズの要点です。いくつか挙げる価値のあるもの：

-   **GC は続きました。** GC の投稿の条件付きフリーリストの作業は落ち着き続け、鋭いクラスのバグがクローズされました：ネイティブブリッジされた Promise は今や **tokio ワーカー上で実行中はピン留め**され、解決が着地する前に GC がそれらをスイープできないようになっています（v0.5.923）。負荷の下で非同期の fetch を走らせて幻のコレクションを見たことがあれば、それがこれでした。
-   **メモリモデルが文書化されました。** 今や `internals/memory-model.md` のディープダイブがあります — NaN ボクシング、世代別 GC、シャドウスタック、ライトバリア — ドキュメントサイトに配線されています（v0.5.933）。
-   **codegen の安定性修正の波**が npm 一掃によって表面化しました：再開された async ステップの内側で呼ばれたモジュールレベルの `const` アロー関数がもはや SIGSEGV しなくなり（v0.5.953）、`try { await rejected } catch { return X }` がもはや永遠にハングしなくなり（v0.5.870）、そして本物のバンドルがつまずいた一握りの `js_is_truthy` / 生ポインタ範囲のクラッシュが修正されました。

## Apple のハウスキーピング

より小さいが本物：`perry setup ios --development` は今や開発ビルド用にプロビジョニングし（v0.5.1023）、Apple のクロスライブラリのビルド/リンクパスは重複が除去されてポインタ幅ポータブルになりました（v0.5.1121/1125） — これが、行き詰まっていた npm / Homebrew / APT / winget の公開マトリックスを解放したものです。

## これが残すもの

Perry の背後にある賭けは、常に「ネイティブ TypeScript」が意味を持つのは *本物の* TypeScript が走るときだけ — おもちゃのサブセットではなく、人々が `npm install` する実際のパッケージ — であるというものでした。今月はほとんどがその仕事でした：誇るべき単一の数値というより、「コンパイルできる」と「動く」の間のギャップを埋める、長く地味な押し込みです。適合性レーダーと npm パリティのテストが、今私たちが見守っているスコアボードであり、私たちは数値を投稿し続けます — 良いものも、まだ不完全なものも。

ソース：[github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues：[github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
