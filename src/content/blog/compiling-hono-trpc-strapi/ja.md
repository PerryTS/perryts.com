---
title: "Hono、tRPC、Strapi をネイティブバイナリにコンパイル"
excerpt: "Perry は 3 つの主要な TypeScript フレームワーク——Hono、tRPC、Strapi——をネイティブ ARM64 実行ファイルにコンパイルできるようになりました。1 秒未満でコンパイルし、2 MB 未満のバイナリを生成し、クラッシュなしで動作します。"
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry は3つの主要な TypeScript フレームワーク — Hono、tRPC、Strapi — をネイティブ ARM64 実行ファイルにコンパイルできるようになりました。1秒未満でコンパイルし、2 MB 未満のバイナリを生成し、 クラッシュなしで動作します。

この記事では、何が動作するか、まだ動作しないもの、そして実際のコードに対してコンパイラを 試した際に学んだことを紹介します。

## プロジェクト

TypeScript の異なる形態を代表するため、この3つを選びました：

-   **Hono** — 軽量 Web フレームワーク（29モジュール）。ジェネリクス、クラス継承、 動的メソッド割り当て、`Request`/`Response` Web API を多用。エクスポート構造はバレルファイルを通じた名前付き再エクスポートを使用。
-   **tRPC** — 型安全な RPC フレームワーク（52モジュール）。4段階以上にわたる深い再エクスポートチェーン、 ジェネリック型の絞り込みを伴うビルダーパターン、モジュールスコープでのクラスインスタンス化、 Web Streams によるストリーミング。
-   **Strapi** — ヘッドレス CMS コア（4モジュールがネイティブコンパイル、残りは外部として解決）。 ワークスペースパッケージ解決を持つモノレポ、名前空間再エクスポート （`export * as X`）、`Map` を使用したサービスコンテナパターン、ファクトリ関数。

## コンパイル結果

3つすべてがコンパイルエラーゼロでネイティブバイナリにコンパイルされます：

| プロジェクト | コンパイル済みモジュール | バイナリサイズ | コンパイル時間 |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

すべてのソースモジュールが完全なパイプラインを通過します：SWC パース、HIR ローワリング、Cranelift コード生成、 オブジェクトファイル出力、ネイティブリンキング。コンパイル時間にはパースから最終リンクまですべてが含まれます。

参考までに、tRPC だけの `tsc --noEmit` に数秒かかります。 Perry は52モジュールをリンク済みネイティブバイナリに1秒未満でコンパイルします。

## ランタイムで動作するもの

### クロスモジュールクラスインスタンス化

これが大きなマイルストーンでした。Hono のエクスポート構造：

**hono 輸出チェーン**

```
// hono/src/hono.ts
export class Hono extends HonoBase { ... }
// hono/src/index.ts
import { Hono } from './hono'
export { Hono }
```

この `export { Hono }` は名前付き再エクスポートです —`export * from` でも `export { Hono } from './hono'` でもありません。 Perry の HIR では `Export::Named` になり、`Export::ReExport` や `Export::ExportAll` ではありません。以前は、コンパイラのクラス伝播が`ExportAll` と `ReExport`チェーンのみを辿っていたため、`index.ts` から `Hono` をインポートすると暗黙に失敗し、`new Hono()` が `undefined`を返していました。

現在、Perry は `Export::Named` をモジュールのインポートを通じて 元のクラス定義まで遡り、それを伝播します。結果：

```
$ ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono
[1] Class instantiation through named re-export chain
PASS: new Hono() returned a real object
[2] Constructor-initialized fields
PASS: app.router initialized by constructor
PASS: app.router.name = SmartRouter
[5] Multiple instances
PASS: second instance created with router
[6] Constructor with options
PASS: new Hono({ strict: false }) accepted options
```

Hono のコンストラクタが実行され、`SmartRouter`（内部で `RegExpRouter` と `TrieRouter` の両方を作成）を初期化し、実際のオブジェクトを返します。 複数の独立したインスタンスが動作します。コンストラクタオプションも受け入れられます。

### マルチレベル再エクスポート解決

tRPC の `initTRPC` は4段階の深さにあります：

```
initTRPC.ts                          (export const initTRPC = ...)
-> unstable-core-do-not-import.ts  (export * from './initTRPC')
-> @trpc/server/index.ts           (export { initTRPC } from '../../..')
-> index.ts                        (export * from './@trpc/server')
```

`ExportAll` → `Named` → `ExportAll` です。 Perry は完全なチェーンを解決し、`initTRPC` はコンパイル済みバイナリで アクセス可能です。同じパスを辿る `TRPCError` も同様です。

### 引数付きクロスモジュールクラスインスタンス化

```
const err = new TRPCError({ code: 'NOT_FOUND', message: 'resource missing' })
// PASS: new TRPCError() returned object
// PASS: err.code = NOT_FOUND
```

`TRPCError` は1つのモジュールで定義され、3つの中間バレルファイルを通じて 再エクスポートされ、テストでインポートされ、オプションオブジェクトでインスタンス化されます。 インスタンスの `code` フィールドにアクセスできます。

### モノレポでのパッケージ解決

Strapi はワークスペースパッケージを使用しています — `@strapi/core` は モノレポ内の兄弟パッケージで、npm 依存関係ではありません。Perry は `package.json` の exports フィールドを通じてベア指定子を解決します：

```
"exports": {
".": { "source": "./src/index.ts", "import": "./dist/index.mjs" }
}
```

`createStrapi` 関数は`export * from '@strapi/core'` を通じて呼び出し可能な関数として 正しく解決されます。

### 型のみのエクスポートフィルタリング

TypeScript の `export type { Foo }` 構文はランタイムでは 意味を持ちません — しかし以前は Perry がこれらを実際の `Export::ReExport` エントリに変換し、リンカーを通じて伝播して スタブシンボルを生成していました。Hono の `index.ts` だけで 数十の型をカバーする4つの `export type` 宣言があります。

Perry は SWC の `ExportNamed` 宣言の `type_only` フラグと個々の指定子の `is_type_only` をチェックし、HIR ローワリング中にスキップするようになりました。 これにより、3つすべてのプロジェクトで型再エクスポートからのデッドスタブ生成が排除されました。

### RegExp コンストラクタ

`new RegExp(pattern, flags)` は Perry の既存の `js_regexp_new` ランタイム関数にコンパイルされるようになりました。 ランタイムは既に RegExp をサポートしていましたが、 `Expr::New` のコード生成ハンドラにそのケースがなく、 すべての `new RegExp(...)` が「Unknown class」警告に フォールスルーしていました。Hono の `RegExpRouter` はこれを 多用しています。

## まだ動作しないもの

ギャップは成功と同じくらい重要な情報を伝えるため、ここでは具体的に述べます。

### `this` への動的プロパティ割り当て

Hono のコンストラクタは HTTP メソッドハンドラを動的にセットアップします：

```
const allMethods = ['get', 'post', 'put', 'delete', ...]
allMethods.forEach((method) => {
this[method] = (args1, ...args) => {
// register route
return this
}
})
```

`app.get`、`app.post`などは静的に宣言されていません — 計算されたプロパティ名を介してランタイムで割り当てられます。 Perry はまだ `this[variable] = value` をサポートしていないため、 これらのメソッドが欠落しています：

```
[4] Dynamic method assignment (this[method] = ...)
INFO: app.get not available
INFO: app.on not available
```

Hono にとって最大の単一のギャップです。Hono クラスは存在し、ルーターは初期化されていますが、 ルートを登録できません。

### モジュールレベルのコンストラクタ呼び出し

tRPC はそのエントリポイントを次のように定義しています：

```
export const initTRPC = new TRPCBuilder()
```

ランタイムでは、`initTRPC` は `typeof object` ではなく `typeof function` として現れます — モジュールレベルの `new TRPCBuilder()` 式がコンストラクタを 実行していないため、インスタンスではなくクラスへの参照が得られます。つまり `initTRPC.create()` と `initTRPC.context()` は共に `undefined` です。

### 継承されたプロパティ

`TRPCError extends Error` で、 `TRPCError` に直接定義された `err.code` は動作しますが、 `Error` から継承された `err.message` にはアクセスできません。 プロパティルックアップのプロトタイプチェーンが完全には実装されていません。

### 複雑なコンストラクタチェーン

Strapi の `createStrapi()` 関数は内部で `new Strapi(opts)` を呼び出し、これが `Container`（`Map` で裏打ち）を 継承し、`loadConfiguration()` を呼び出し、プロバイダーを反復して サービスを登録します。この深いコンストラクタチェーンはフォールシーな戻り値を生成します — クラッシュはしませんが、使用可能なインスタンスも生成しません。

### Web API ビルトインクラス

3つのプロジェクトで残っている「Unknown class」警告：

| クラス | 件数 |
| --- | --- |
|応答| 11 |
|変換ストリーム| 7 |
|読み取り可能なストリーム| 5 |
| Request | 4 |
| Headers | 3 |
| Proxy | 2 |
| TextEncoderStream| 2 |
|書き込み可能なストリーム| 1 |
| DOM例外| 1 |

`Response`、`Request`、`Headers` はあらゆる HTTP フレームワークにとって重要です。`Map`、`Set`、 `RegExp`、`Buffer`、 `AbortController` などに既にあるものと同様のビルトインコード生成サポートが 必要です。

## これが示すこと

良いニュース：Perry のコンパイルパイプラインは実際のフレームワークコードを処理できます。 複雑な再エクスポートチェーン、ジェネリクスが多い型シグネチャ、クラス階層、モノレポパッケージ解決を持つ マルチファイルプロジェクトが、すべてリンク済みバイナリにまで到達します。

ギャップはコンパイルのギャップではなく、ランタイムのギャップです。残りの作業：

1.  **動的プロパティ割り当て** — メソッドをプログラム的にセットアップするフレームワークに必要
2.  **モジュールレベルの初期化式** — `export const x = new Foo()` が実際にコンストラクタを実行する必要がある
3.  **プロトタイプチェーン** — 継承されたプロパティとメソッド
4.  **Web API ビルトイン** — HTTP フレームワーク用の `Response`、`Request`、`Headers`

これらは具体的で、範囲が明確な問題です。アーキテクチャの変更を必要とするものはありません — より単純なケースで既に動作しているパターンの拡張です。

引き続き取り組んでいきます。目標は `new Hono().get('/', (c) => c.text('hello'))` がネイティブバイナリで動作する HTTP サーバーを生成することです。
