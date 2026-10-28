---
title: "Perry の紹介"
excerpt: "Perry は、外部の Node.js のインストールやリンクされたランタイムと GC を使用して、サポートされている TypeScript をスタンドアロンのネイティブ実行可能ファイルにコンパイルします。 JavaScript エンジン。"
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Perry をご紹介します。Perry は Rust で書かれたネイティブ TypeScript コンパイラで、 TypeScript を直接スタンドアロン実行ファイルにコンパイルします。Node.js ランタイム不要、 Electron ラッパー不要、妥協なし。あなたのコードが、即座に起動しどこでも動作するネイティブバイナリに コンパイルされます。

Perry は TypeScript の可能性を根本から再考するものです。JavaScript のスーパーセットとして JS エンジンを通して実行しなければならないものとして扱う代わりに、Perry は TypeScript を システム言語として扱います。何百万人もの開発者がすでに知り、愛している構文を持つ システム言語として。

## Perry を作った理由

TypeScript は現代のソフトウェア開発における共通言語となりました。ほとんどの Web フロントエンド、 増加するバックエンドのシェア、そしてますますツール、スクリプティング、自動化の選択肢として 使われている言語です。しかし、常に根本的な制限を抱えていました。JavaScript にコンパイルされ、 JavaScript にはランタイムが必要だという制限です。

そのランタイム — Node.js、Deno、Bun のいずれであっても — にはトレードオフがあります。 数十から数百ミリ秒のコールドスタート時間。JIT コンパイラとガベージコレクタによるメモリオーバーヘッド。 ランタイム全体をバンドルするか、ユーザーにインストールを要求するバイナリ配布。 そして GUI アプリケーションについては、唯一の選択肢が Electron で、 アプリと一緒に Chromium ブラウザ全体を同梱します。

私たちは問いかけました。TypeScript が JavaScript を経由しなくてよいとしたら？ Rust、Go、C++ をコンパイルするのと同じように、直接ネイティブマシンコードにコンパイルできるとしたら？

## Perry の仕組み

Perry のコンパイルパイプラインには3つのステージがあります：

1.  **パース** — Perry は SWC（Rust ベースの TypeScript/JavaScript パーサー）を 使用して TypeScript ソースを AST にパースします。SWC は Next.js でも使用されている 同じパーサーで、非常に高速です。
2.  **型指向コンパイル** — Perry は完全な型情報を持って AST を走査します。 実行時に動的型を処理しなければならない JS エンジンとは異なり、Perry はコンパイル時にすべての型を 把握しています。これによりジェネリクスの単相化、メソッド呼び出しの静的ディスパッチ、 メモリレイアウトの直接最適化が可能になります。
3.  **コード生成** — Perry は Cranelift を使用してネイティブマシンコードを生成します。 Cranelift は Wasmtime や Firefox JIT の一部で使用されているコードジェネレータです。 x86\_64 と ARM64 向けに効率的なネイティブコードを生成します。

結果はスタンドアロン実行ファイルです。CLI ツールで通常 2～5 MB で、 ウォームアップ時間ゼロで即座に起動します。

```text
$ perry build app.ts
Parsing app.ts...
Compiling (cranelift, arm64)...
Linking...
✓ Built executable: app (2.3 MB)
$ ./app
Hello from native TypeScript!
$ file app
app: Mach-O 64-bit executable arm64
```

## サポートされている TypeScript 機能

Perry は TypeScript の幅広く成長中のサブセットをサポートしています。目標は開発者が実際に 使用する形での言語との完全な互換性です。現在サポートされている機能：

-   **すべてのプリミティブ型** — string、number、boolean、null、undefined、bigint、symbol
-   **インターフェースと型エイリアス** — ユニオン型、交差型、マップ型を含む
-   **ジェネリクス** — 単相化によりコンパイルされるため、`Array<number>` と `Array<string>` はそれぞれ異なる最適化されたコードパスを生成
-   **クラス** — 継承、プライベートフィールド（`#field`）、静的メンバー、getter/setter、デコレータ対応
-   **Async/await と Promise** — Rust の async 処理と同様にステートマシンにコンパイル
-   **ジェネレータとイテレータ** — `function*` と `for...of` ループ
-   **クロージャ** — 適切なキャプチャセマンティクス付き
-   **分割代入** — 配列、オブジェクト、ネストパターン、残余要素
-   **テンプレートリテラル** — タグ付きテンプレートを含む
-   **モジュール** — コンパイル時に解決される ESM インポート/エクスポート

## クロスプラットフォームネイティブ UI

Perry は CLI ツールやサーバーサイドアプリケーションに限定されません。6つのプラットフォーム向けの ネイティブ UI フレームワークを搭載しています：

-   **macOS** — AppKit（NSWindow、NSView、NSButton、NSTextField など）
-   **iOS** — UIKit（UIViewController、UIView、UIButton、UITableView）
-   **iPadOS** — UIKit（iOS と同じ API、iPad 固有の適応あり）
-   **Android** — JNI + Android Views（Activity、View、Button、RecyclerView）
-   **Linux** — GTK4（GtkWindow、GtkBox、GtkButton、GtkEntry）
-   **Windows** — Win32（CreateWindowEx、コモンコントロール、GDI）

重要な点は、Perry が共通の TypeScript API を各プラットフォームのネイティブウィジェットツールキットに コンパイル時にマッピングすることです。ブリッジレイヤーも、Web ビューも、 カスタムレンダリングエンジンもありません。アプリは OS 自体がレンダリングする本物のプラットフォームウィジェットを 使用します。詳細は以下の記事をご覧ください： [TypeScript からのクロスプラットフォームネイティブ UI](/ja/blog/cross-platform-native-ui/)。

## 27以上のネイティブ npm パッケージ実装

新しいコンパイラの最大の実用的課題の1つはエコシステムの互換性です。 開発者はゼロからコードを書くだけではありません — パッケージを使います。Perry は 27以上の人気 npm パッケージのネイティブ実装でこの課題に対処しています：

-   **データベース** — mysql2、pg、mongodb、better-sqlite3、ioredis
-   **HTTP** — axios、express、ws（WebSocket）
-   **セキュリティ** — bcrypt、jsonwebtoken、crypto
-   **ユーティリティ** — uuid、chalk、dotenv、lodash（部分的）、moment
-   **システム** — fs-extra、glob、chokidar、commander

これらは Node.js モジュールの薄いラッパーではありません。ネイティブシステムライブラリを使用して 直接バイナリにコンパイルされます。PostgreSQL には libpq、暗号化には OpenSSL、 HTTP には libcurl を使用します。API サーフェスは npm パッケージから期待されるものと一致するため、 移行は簡単です。

## オプションの V8 互換レイヤー

まだ Perry のネイティブ実装がない npm パッケージについては、Perry はオプションの V8 エンベッディングモードを提供しています。有効にすると、Perry は V8 ランタイムをバンドルし、 コンパイル済み TypeScript と並行して標準 JavaScript npm パッケージを実行できます。 これは段階的に Perry を採用できる実用的なエスケープハッチです。ホットパスをネイティブコードに コンパイルしながら、それ以外は完全な npm エコシステムにアクセスできます。

## クロスコンパイル

Perry はクロスコンパイルをそのままサポートしています。macOS の開発マシンから Linux（x86\_64 と ARM64）と iOS 向けにコンパイルできます。これにより、macOS 上で CI/CD パイプラインを構築し、各プラットフォーム専用のビルドマシンなしで すべてのデプロイターゲット向けのバイナリを生成できます。

```
# Build for Linux from macOS
$ perry build app.ts --target linux-x86_64
✓ Built executable: app (3.1 MB)
# Build for iOS from macOS
$ perry build app.ts --target ios-arm64
✓ Built executable: app (4.8 MB)
```

## パフォーマンス

Perry でコンパイルされたバイナリは高速です。JIT のウォームアップ、インタプリタのオーバーヘッド、 ガベージコレクタの一時停止がないため、最初の呼び出しからパフォーマンスは予測可能で安定しています。

ベンチマーク結果：

-   **起動時間** — 実質 0 ms（ネイティブプロセス起動）
-   **バイナリサイズ** — 一般的な CLI ツールで 2～5 MB（バンドルされた Node.js の 50+ MB に対して）
-   **メモリ使用量** — 同等の Node.js アプリケーションの 5～10 分の 1
-   **スループット** — 演算集約型のワークロードで手書きの C と同等

ライブベンチマークは [demo.perryts.com](https://demo.perryts.com) で確認できます。Perry コンパイル済み実行ファイルと Node.js、Bun をリアルタイムで比較しています。

## 現在の状況

Perry は活発に開発中です。コンパイラはテストスイートで 62 中 62 テストがパスし 安定しています。6つのプラットフォーム UI バックエンドはすべて機能しています。 コア言語機能は堅固で拡張中です。

UI ウィジェットライブラリの拡張、文字列とオブジェクトのパフォーマンス改善、 完全な正規表現サポートの完成、Stream モジュールの構築に積極的に取り組んでいます。 長期的には、WASM コンパイルターゲット、マルチスレッド、VS Code 拡張機能、 パッケージマネージャ統合を計画しています。

リリース済み、進行中、今後の予定の詳細は完全な[ロードマップ](/ja/roadmap/)をご確認ください。

## 始めましょう

Perry はオープンソースです。リポジトリをクローンし、ソースからビルドして、 今日から TypeScript のコンパイルを始められます：

```
$ git clone https://github.com/PerryTS/perry.git
$ cd perry
$ cargo build --release
# Compile your first TypeScript file
$ ./target/release/perry build hello.ts
✓ Built executable: hello (2.1 MB)
$ ./hello
Hello, world!
```

ソースコードは [GitHub](https://github.com/PerryTS/perry) で閲覧できます。 [ショーケース](/ja/showcase/) で Perry を使って構築されているものを確認するか、直接コードに飛び込んでください。 あなたが何を構築するか、楽しみにしています。
