---
title: "コンパイラからエコシステムへ：React、データベース、クラウドビルド"
excerpt: "Perry はコンパイラから完全なエコシステムへと成長しました。perry/ui を中核に、MySQL/PostgreSQL/SQLite 対応の Prisma 互換 ORM、ユニバーサルプッシュ通知、App Store 公開付き分散ビルド、React 互換レイヤー——すべて 1 週間で。"
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
1週間前、PerryはUIツールキットを持つコンパイラでした。TypeScriptを書き、ネイティブバイナリにコンパイルし、 6つのプラットフォームで配布できました。それがストーリーでした。今日、ストーリーはより大きくなりました： Perryはエコシステムへと進化しています。3つのデータベースORM、ユニバーサルプッシュ通知、 App StoreとPlay Storeへの公開を伴う分散ビルド、React互換レイヤー、 そして自動アプリ検証 — すべてがこの1週間で実現しました。

この投稿では、リリースされた内容、その重要性、そしてコードの見た目について説明します。

## perry/ui：基盤

新しいライブラリに入る前に、すべての中心にあるものを強調する価値があります：`perry/ui`。これはPerryの独自ネイティブUIツールキットで、 6つすべてのターゲットでプラットフォームネイティブコンポーネントに直接コンパイルされる20以上のウィジェットを備えています。 ラッパーではなく、抽象化レイヤーでもなく、Webビューでもありません。 すべての`Button`はmacOSでは `NSButton`に、iOSでは `UIButton`に、Linuxでは `GtkButton`に、Androidでは `android.widget.Button`に、Windowsでは `CreateWindowEx`コントロールになります。

`perry/ui`はPerryの主要かつ最も高度な UIサーフェスです。リアクティブな状態管理、レイアウトコンテナ（VStack、HStack、 ZStack、SplitView）、ハードウェアアクセラレーションされたCanvas、カラムソート付きTableビュー、 ファイルダイアログ、キーチェーンアクセス、通知、マルチウィンドウのための `perry/system`モジュールを含みます — すべてTypeScriptから、 すべてプラットフォームAPIへの直接呼び出しにコンパイルされます。React互換レイヤーを含むPerryの他のすべてのUIアプローチは、`perry/ui`の上に構築され、そのウィジェットにマッピングされます。

**app.ts**

```typescript
import { Window, VStack, Button, Text, State } from 'perry/ui';
const count = new State(0);
const window = new Window({ title: "Counter" });
window.setContent(
  new VStack({ children: [
    new Text({ text: count }),
    new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),
  ] })
);
```

リアクティブな`State`オブジェクトが重要なプリミティブです。 State値が変更されると、その状態にバインドされたウィジェットだけが更新されます — 仮想DOMの差分比較なし、 フルツリーの再レンダリングなし、リコンシリエーションパスなし。TypeScriptからネイティブプラットフォームUIへの 最も直接的なパスです。

## React互換性：perry/ui上の薄いレイヤー

Reactから来た開発者のために、`perry-react` はReactのコンポーネントモデルを `perry/ui`のウィジェットにマッピングする互換レイヤーを提供します。 `useState`、 `useRef`、 `useReducer`、そしてJSXを使用でき、Perryはそれらを 同じネイティブウィジェットにコンパイルします。これは便利なブリッジであり、別のレンダリングエンジンではありません。

**counter.tsx**

```tsx
import React, { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

内部では、すべてのJSX要素が`perry/ui` ウィジェットにマッピングされます：`<div>`はVStackに、 `<button>`はButtonに、 `useState`はPerryのリアクティブStateで実装されています。 まだ初期段階です — フルツリー再レンダリングとグローバルフックストレージのフェーズ1ですが、 既存のReactコードがPerryを通じてネイティブプラットフォームをターゲットにできることを証明しています。 同様のアプローチでAngularとIonicの互換性も検討中です。

## 3つのデータベースORM：Prisma API、ネイティブパフォーマンス

データベースと通信するサーバーやデスクトップアプリを構築しているなら、Perryは Prisma互換の3つのORMでカバーします： `perry-prisma`（MySQL）、 `perry-sqlite`（SQLite）、 `perry-postgres`（PostgreSQL）。3つすべてが`@prisma/client`のドロップイン置換です。同じAPI、同じ クエリパターン、しかしデータベースへの直接FFIを持つネイティブコードにコンパイルされます — Prismaエンジンなし、 Node.jsなし。

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Same Prisma API — compiled to native SQL via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

内部では、各ORMは `sqlx`を使用するRust FFIレイヤーに支えられたTypeScriptフロントエンドです。 クエリフロー：TypeScriptがクエリをJSONにシリアライズし、FFI境界を越えて渡し、Rustがパラメータ化されたSQLを構築し、 コネクションプール経由で実行し、結果をシリアライズして返します。Prismaスキーマはビルド時に読み込まれます — ランタイムのパースはゼロです。

3つの実装はコードの約95%を共有しています。違いは予想通りのものです： 識別子のクォーティング（`` `col` `` vs `"col"`）、プレースホルダ構文（ `?` vs `$1, $2`）、トランザクションセマンティクス。3つすべてが PrismaのCRUDサーフェス全体をサポート：findMany、findFirst、findUnique、create、createMany、 update、updateMany、upsert、delete、deleteMany、count — さらに生SQL、トランザクション、 10以上のWHEREフィルタオペレーター。

## perry-push：ユニバーサルプッシュ通知

`perry-push`は、すべてのプラットフォームでプッシュ通知を処理する 単一のライブラリです：APNs（iOS/macOS）、FCM（Android）、Web Push（ブラウザ）、 WNS（Windows）。各プロバイダーは、正確に3つの関数を持つRust FFIモジュールです： `*_provider_new`、 `*_provider_close`、 `*_send`。

**notify.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Unified result type for all providers
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

暗号化は `ring`で処理されます — APNsとVAPID用のES256 JWT、 FCMサービスアカウント用のRS256、Web Pushペイロード暗号化用のAES-GCM。すべてネイティブコードにコンパイルされます。`node-gyp`なし、OpenSSL依存なし。

## Perry Hub + ビルダー：分散クラウドビルド

これがインフラストラクチャの動きです。`perry-hub`は ビルドオーケストレーションサーバーで、Perry自身によってTypeScriptからコンパイルされたもので、 ビルドワーカーのプールを管理します。プロジェクトをプッシュすると、ハブがターゲットプラットフォームに基づいて 適切なワーカーにディスパッチし、ワーカーがコンパイル、署名、そしてオプションでアプリを公開します。

現在2つのワーカーが存在します：macOSビルダー（macOS、iOS、Androidターゲットを処理）と Linuxビルダー（LinuxとAndroidを処理）。どちらもWebSocket経由でハブに接続し、 ソースtarballをダウンロードし、Perryコンパイラを実行し、アーティファクトをアップロードするRustバイナリです。

-   **コード署名** — macOSのApple公証、iOSのプロビジョニングプロファイル、Androidキーストア署名
-   **App Store公開** — App Store ConnectとGoogle Play Storeへの直接アップロード
-   **アーティファクト管理** — ビルドされたバイナリがTTLベースのクリーンアップでハブにアップロード
-   **ライセンス管理** — ライセンスごとのレート制限、優先キューイング（プロティアが優先）

ハブ自体は興味深いケーススタディです。約1,500行のTypeScriptファイルがPerryによって2 MBのネイティブバイナリに コンパイルされています。HTTP用にポート3456でFastifyを、WebSocket用にポート3457で `ws`を実行します。すべての状態はJSON永続化を伴う インメモリです — 外部データベースなし。`scp`と systemdユニットファイルでデプロイできる種類のサーバーです。

## perry-verify：自動アプリ検証

`perry-verify`は、コンパイル済みバイナリと設定を受け取り、 検証パイプラインを実行し、スクリーンショット付きの構造化されたpass/fail結果を返すスタンドアロンHTTPサービスです。 アプリを起動し、認証フロー（確定的またはAI支援）を実行し、状態をチェックし、証拠をキャプチャします。

macOS（アクセシビリティAPI経由）、Linux（AT-SPI）、iOS SimulatorとAndroid Emulatorのスタブ用の プラットフォームアダプターが存在します。AIレイヤーは、確定的チェックが不可能な場合のフォールバック認証と 状態検証にClaudeを使用します。ハブのビルドパイプラインにポストビルドステップとして組み込むように設計されています： コンパイル、署名、検証、公開。

## Pryがあらゆる場所で出荷

[Pry](/ja/blog/building-pry/)は、 Perryのショーケースとして構築したネイティブJSONビューアーで、5つのプラットフォームで出荷されるようになりました。 [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) と [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry)に掲載されており、LinuxとWindows用のネイティブバイナリもあります。同じTypeScriptコードベース、 5つのプラットフォーム固有のエントリポイント、5つのネイティブバイナリ。このアプローチ全体がエンドツーエンドで 機能する最も具体的な証拠です — TypeScriptソースからApp Storeリスティングまで。

## これが意味すること

コンパイラは面白い。エコシステムは便利。先週、Perryは 「TypeScriptをネイティブにコンパイルできる」から「ネイティブUI、Prismaデータベース、プッシュ通知、 App Storeに自動公開するビルドを備えたフルアプリを構築できる」に変わりました。

ピースがつながり始めています：

-   **perry/ui**はTypeScriptからネイティブプラットフォームUIへの最も直接的なパス — リアクティブな状態、20以上のウィジェット、抽象化レイヤーゼロ
-   **perry-prisma/sqlite/postgres**は既存のデータベースコードが最小限の変更で移植できることを意味します
-   **perry-push**はプラットフォームごとのライブラリなしでネイティブプッシュ通知を意味します
-   **perry-hub + ビルダー**は`perry publish`からApp Storeまでワンステップで行けることを意味します
-   **perry-verify**はソースだけでなくコンパイル済み出力の自動テストを意味します
-   **perry-react**はReact開発者がおなじみのパターンを使ってPerryに移行でき、すべてが内部でperry/uiにマッピングされることを意味します

これらは理論的なものではありません。ここに挙げたすべてのライブラリには、動作するコード、テスト、 ドキュメントがあります。いくつかはすでに本番で使用されています — Perryのランディングサイト自体が Perryでコンパイルされたサーバーで稼働しており、Pryは2つのアプリストアで公開されています。

## 次のステップ

直近のロードマップ：

-   **perry/uiの拡張** — ドラッグアンドドロップ、アクセシビリティラベル、カスタムコンテキストメニュー、より多くのレイアウトプリミティブ
-   **perry-verifyの統合** — ビルドパイプラインでの自動検証
-   **フレームワーク互換性** — perry/uiへのオンランプとしてのReact、Angular、Ionicレイヤーの改善
-   **完全な正規表現サポート** — ネイティブにコンパイルされるECMAScript互換の正規表現エンジン

進捗は [GitHub](https://github.com/PerryTS/perry)でフォローするか、 [ロードマップ](/ja/roadmap/) で全体像をご確認ください。
