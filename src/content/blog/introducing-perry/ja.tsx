import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry をご紹介します。Perry は Rust で書かれたネイティブ TypeScript コンパイラで、
        TypeScript を直接スタンドアロン実行ファイルにコンパイルします。Node.js ランタイム不要、
        Electron ラッパー不要、妥協なし。あなたのコードが、即座に起動しどこでも動作するネイティブバイナリに
        コンパイルされます。
      </p>
      <p>
        Perry は TypeScript の可能性を根本から再考するものです。JavaScript のスーパーセットとして
        JS エンジンを通して実行しなければならないものとして扱う代わりに、Perry は TypeScript を
        システム言語として扱います。何百万人もの開発者がすでに知り、愛している構文を持つ
        システム言語として。
      </p>

      <h2>Perry を作った理由</h2>
      <p>
        TypeScript は現代のソフトウェア開発における共通言語となりました。ほとんどの Web フロントエンド、
        増加するバックエンドのシェア、そしてますますツール、スクリプティング、自動化の選択肢として
        使われている言語です。しかし、常に根本的な制限を抱えていました。JavaScript にコンパイルされ、
        JavaScript にはランタイムが必要だという制限です。
      </p>
      <p>
        そのランタイム — Node.js、Deno、Bun のいずれであっても — にはトレードオフがあります。
        数十から数百ミリ秒のコールドスタート時間。JIT コンパイラとガベージコレクタによるメモリオーバーヘッド。
        ランタイム全体をバンドルするか、ユーザーにインストールを要求するバイナリ配布。
        そして GUI アプリケーションについては、唯一の選択肢が Electron で、
        アプリと一緒に Chromium ブラウザ全体を同梱します。
      </p>
      <p>
        私たちは問いかけました。TypeScript が JavaScript を経由しなくてよいとしたら？
        Rust、Go、C++ をコンパイルするのと同じように、直接ネイティブマシンコードにコンパイルできるとしたら？
      </p>

      <h2>Perry の仕組み</h2>
      <p>
        Perry のコンパイルパイプラインには3つのステージがあります：
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>パース</strong> — Perry は SWC（Rust ベースの TypeScript/JavaScript パーサー）を
          使用して TypeScript ソースを AST にパースします。SWC は Next.js でも使用されている
          同じパーサーで、非常に高速です。
        </li>
        <li>
          <strong>型指向コンパイル</strong> — Perry は完全な型情報を持って AST を走査します。
          実行時に動的型を処理しなければならない JS エンジンとは異なり、Perry はコンパイル時にすべての型を
          把握しています。これによりジェネリクスの単相化、メソッド呼び出しの静的ディスパッチ、
          メモリレイアウトの直接最適化が可能になります。
        </li>
        <li>
          <strong>コード生成</strong> — Perry は Cranelift を使用してネイティブマシンコードを生成します。
          Cranelift は Wasmtime や Firefox JIT の一部で使用されているコードジェネレータです。
          x86_64 と ARM64 向けに効率的なネイティブコードを生成します。
        </li>
      </ol>
      <p>
        結果はスタンドアロン実行ファイルです。CLI ツールで通常 2～5 MB で、
        ウォームアップ時間ゼロで即座に起動します。
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>サポートされている TypeScript 機能</h2>
      <p>
        Perry は TypeScript の幅広く成長中のサブセットをサポートしています。目標は開発者が実際に
        使用する形での言語との完全な互換性です。現在サポートされている機能：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>すべてのプリミティブ型</strong> — string、number、boolean、null、undefined、bigint、symbol</li>
        <li><strong>インターフェースと型エイリアス</strong> — ユニオン型、交差型、マップ型を含む</li>
        <li><strong>ジェネリクス</strong> — 単相化によりコンパイルされるため、<code className="text-perry-400">Array&lt;number&gt;</code> と <code className="text-perry-400">Array&lt;string&gt;</code> はそれぞれ異なる最適化されたコードパスを生成</li>
        <li><strong>クラス</strong> — 継承、プライベートフィールド（<code className="text-perry-400">#field</code>）、静的メンバー、getter/setter、デコレータ対応</li>
        <li><strong>Async/await と Promise</strong> — Rust の async 処理と同様にステートマシンにコンパイル</li>
        <li><strong>ジェネレータとイテレータ</strong> — <code className="text-perry-400">function*</code> と <code className="text-perry-400">for...of</code> ループ</li>
        <li><strong>クロージャ</strong> — 適切なキャプチャセマンティクス付き</li>
        <li><strong>分割代入</strong> — 配列、オブジェクト、ネストパターン、残余要素</li>
        <li><strong>テンプレートリテラル</strong> — タグ付きテンプレートを含む</li>
        <li><strong>モジュール</strong> — コンパイル時に解決される ESM インポート/エクスポート</li>
      </ul>

      <h2>クロスプラットフォームネイティブ UI</h2>
      <p>
        Perry は CLI ツールやサーバーサイドアプリケーションに限定されません。6つのプラットフォーム向けの
        ネイティブ UI フレームワークを搭載しています：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit（NSWindow、NSView、NSButton、NSTextField など）</li>
        <li><strong>iOS</strong> — UIKit（UIViewController、UIView、UIButton、UITableView）</li>
        <li><strong>iPadOS</strong> — UIKit（iOS と同じ API、iPad 固有の適応あり）</li>
        <li><strong>Android</strong> — JNI + Android Views（Activity、View、Button、RecyclerView）</li>
        <li><strong>Linux</strong> — GTK4（GtkWindow、GtkBox、GtkButton、GtkEntry）</li>
        <li><strong>Windows</strong> — Win32（CreateWindowEx、コモンコントロール、GDI）</li>
      </ul>
      <p>
        重要な点は、Perry が共通の TypeScript API を各プラットフォームのネイティブウィジェットツールキットに
        コンパイル時にマッピングすることです。ブリッジレイヤーも、Web ビューも、
        カスタムレンダリングエンジンもありません。アプリは OS 自体がレンダリングする本物のプラットフォームウィジェットを
        使用します。詳細は以下の記事をご覧ください：{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          TypeScript からのクロスプラットフォームネイティブ UI
        </Link>。
      </p>

      <h2>27以上のネイティブ npm パッケージ実装</h2>
      <p>
        新しいコンパイラの最大の実用的課題の1つはエコシステムの互換性です。
        開発者はゼロからコードを書くだけではありません — パッケージを使います。Perry は
        27以上の人気 npm パッケージのネイティブ実装でこの課題に対処しています：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>データベース</strong> — mysql2、pg、mongodb、better-sqlite3、ioredis</li>
        <li><strong>HTTP</strong> — axios、express、ws（WebSocket）</li>
        <li><strong>セキュリティ</strong> — bcrypt、jsonwebtoken、crypto</li>
        <li><strong>ユーティリティ</strong> — uuid、chalk、dotenv、lodash（部分的）、moment</li>
        <li><strong>システム</strong> — fs-extra、glob、chokidar、commander</li>
      </ul>
      <p>
        これらは Node.js モジュールの薄いラッパーではありません。ネイティブシステムライブラリを使用して
        直接バイナリにコンパイルされます。PostgreSQL には libpq、暗号化には OpenSSL、
        HTTP には libcurl を使用します。API サーフェスは npm パッケージから期待されるものと一致するため、
        移行は簡単です。
      </p>

      <h2>オプションの V8 互換レイヤー</h2>
      <p>
        まだ Perry のネイティブ実装がない npm パッケージについては、Perry はオプションの V8
        エンベッディングモードを提供しています。有効にすると、Perry は V8 ランタイムをバンドルし、
        コンパイル済み TypeScript と並行して標準 JavaScript npm パッケージを実行できます。
        これは段階的に Perry を採用できる実用的なエスケープハッチです。ホットパスをネイティブコードに
        コンパイルしながら、それ以外は完全な npm エコシステムにアクセスできます。
      </p>

      <h2>クロスコンパイル</h2>
      <p>
        Perry はクロスコンパイルをそのままサポートしています。macOS の開発マシンから
        Linux（x86_64 と ARM64）と iOS 向けにコンパイルできます。これにより、macOS 上で
        CI/CD パイプラインを構築し、各プラットフォーム専用のビルドマシンなしで
        すべてのデプロイターゲット向けのバイナリを生成できます。
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>パフォーマンス</h2>
      <p>
        Perry でコンパイルされたバイナリは高速です。JIT のウォームアップ、インタプリタのオーバーヘッド、
        ガベージコレクタの一時停止がないため、最初の呼び出しからパフォーマンスは予測可能で安定しています。
      </p>
      <p>
        ベンチマーク結果：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>起動時間</strong> — 実質 0 ms（ネイティブプロセス起動）</li>
        <li><strong>バイナリサイズ</strong> — 一般的な CLI ツールで 2～5 MB（バンドルされた Node.js の 50+ MB に対して）</li>
        <li><strong>メモリ使用量</strong> — 同等の Node.js アプリケーションの 5～10 分の 1</li>
        <li><strong>スループット</strong> — 演算集約型のワークロードで手書きの C と同等</li>
      </ul>
      <p>
        ライブベンチマークは{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a> で確認できます。Perry コンパイル済み実行ファイルと Node.js、Bun をリアルタイムで比較しています。
      </p>

      <h2>現在の状況</h2>
      <p>
        Perry は活発に開発中です。コンパイラはテストスイートで 62 中 62 テストがパスし
        安定しています。6つのプラットフォーム UI バックエンドはすべて機能しています。
        コア言語機能は堅固で拡張中です。
      </p>
      <p>
        UI ウィジェットライブラリの拡張、文字列とオブジェクトのパフォーマンス改善、
        完全な正規表現サポートの完成、Stream モジュールの構築に積極的に取り組んでいます。
        長期的には、WASM コンパイルターゲット、マルチスレッド、VS Code 拡張機能、
        パッケージマネージャ統合を計画しています。
      </p>
      <p>
        リリース済み、進行中、今後の予定の詳細は完全な<Link href="/roadmap" className="text-perry-400 hover:text-perry-300">ロードマップ</Link>をご確認ください。
      </p>

      <h2>始めましょう</h2>
      <p>
        Perry はオープンソースです。リポジトリをクローンし、ソースからビルドして、
        今日から TypeScript のコンパイルを始められます：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        ソースコードは{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        {" "}で閲覧できます。{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">ショーケース</Link>
        {" "}で Perry を使って構築されているものを確認するか、直接コードに飛び込んでください。
        あなたが何を構築するか、楽しみにしています。
      </p>
    </>
  );
}
