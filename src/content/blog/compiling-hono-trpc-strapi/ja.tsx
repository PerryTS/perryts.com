export default function Content() {
  return (
    <>
      <p>
        Perry は3つの主要な TypeScript フレームワーク — Hono、tRPC、Strapi — をネイティブ ARM64
        実行ファイルにコンパイルできるようになりました。1秒未満でコンパイルし、2 MB 未満のバイナリを生成し、
        クラッシュなしで動作します。
      </p>
      <p>
        この記事では、何が動作するか、まだ動作しないもの、そして実際のコードに対してコンパイラを
        試した際に学んだことを紹介します。
      </p>

      <h2>プロジェクト</h2>
      <p>
        TypeScript の異なる形態を代表するため、この3つを選びました：
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — 軽量 Web フレームワーク（29モジュール）。ジェネリクス、クラス継承、
          動的メソッド割り当て、<code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>{" "}
          Web API を多用。エクスポート構造はバレルファイルを通じた名前付き再エクスポートを使用。
        </li>
        <li>
          <strong>tRPC</strong> — 型安全な RPC フレームワーク（52モジュール）。4段階以上にわたる深い再エクスポートチェーン、
          ジェネリック型の絞り込みを伴うビルダーパターン、モジュールスコープでのクラスインスタンス化、
          Web Streams によるストリーミング。
        </li>
        <li>
          <strong>Strapi</strong> — ヘッドレス CMS コア（4モジュールがネイティブコンパイル、残りは外部として解決）。
          ワークスペースパッケージ解決を持つモノレポ、名前空間再エクスポート
          （<code className="text-perry-400">export * as X</code>）、
          <code className="text-perry-400">Map</code> を使用したサービスコンテナパターン、ファクトリ関数。
        </li>
      </ul>

      <h2>コンパイル結果</h2>
      <p>
        3つすべてがコンパイルエラーゼロでネイティブバイナリにコンパイルされます：
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">プロジェクト</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">コンパイル済みモジュール</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">バイナリサイズ</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">コンパイル時間</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        すべてのソースモジュールが完全なパイプラインを通過します：SWC パース、HIR ローワリング、Cranelift コード生成、
        オブジェクトファイル出力、ネイティブリンキング。コンパイル時間にはパースから最終リンクまですべてが含まれます。
      </p>
      <p>
        参考までに、tRPC だけの <code className="text-perry-400">tsc --noEmit</code> に数秒かかります。
        Perry は52モジュールをリンク済みネイティブバイナリに1秒未満でコンパイルします。
      </p>

      <h2>ランタイムで動作するもの</h2>

      <h3>クロスモジュールクラスインスタンス化</h3>
      <p>
        これが大きなマイルストーンでした。Hono のエクスポート構造：
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">hono export chain</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>
        この <code className="text-perry-400">export {"{"} Hono {"}"}</code> は名前付き再エクスポートです —
        <code className="text-perry-400">export * from</code> でも{" "}
        <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code> でもありません。
        Perry の HIR では <code className="text-perry-400">Export::Named</code> になり、
        <code className="text-perry-400">Export::ReExport</code> や{" "}
        <code className="text-perry-400">Export::ExportAll</code> ではありません。以前は、コンパイラのクラス伝播が
        <code className="text-perry-400">ExportAll</code> と <code className="text-perry-400">ReExport</code>
        チェーンのみを辿っていたため、<code className="text-perry-400">index.ts</code> から{" "}
        <code className="text-perry-400">Hono</code> をインポートすると暗黙に失敗し、
        <code className="text-perry-400">new Hono()</code> が <code className="text-perry-400">undefined</code>
        を返していました。
      </p>
      <p>
        現在、Perry は <code className="text-perry-400">Export::Named</code> をモジュールのインポートを通じて
        元のクラス定義まで遡り、それを伝播します。結果：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>
      <p>
        Hono のコンストラクタが実行され、<code className="text-perry-400">SmartRouter</code>
        （内部で <code className="text-perry-400">RegExpRouter</code> と{" "}
        <code className="text-perry-400">TrieRouter</code> の両方を作成）を初期化し、実際のオブジェクトを返します。
        複数の独立したインスタンスが動作します。コンストラクタオプションも受け入れられます。
      </p>

      <h3>マルチレベル再エクスポート解決</h3>
      <p>
        tRPC の <code className="text-perry-400">initTRPC</code> は4段階の深さにあります：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">ExportAll</code> →{" "}
        <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code> です。
        Perry は完全なチェーンを解決し、<code className="text-perry-400">initTRPC</code> はコンパイル済みバイナリで
        アクセス可能です。同じパスを辿る <code className="text-perry-400">TRPCError</code> も同様です。
      </p>

      <h3>引数付きクロスモジュールクラスインスタンス化</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">err</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCError</span>({"{"} code: <span className="text-green-400">&apos;NOT_FOUND&apos;</span>, message: <span className="text-green-400">&apos;resource missing&apos;</span> {"}"})</p>
          <p className="text-green-400">// PASS: new TRPCError() returned object</p>
          <p className="text-green-400">// PASS: err.code = NOT_FOUND</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">TRPCError</code> は1つのモジュールで定義され、3つの中間バレルファイルを通じて
        再エクスポートされ、テストでインポートされ、オプションオブジェクトでインスタンス化されます。
        インスタンスの <code className="text-perry-400">code</code> フィールドにアクセスできます。
      </p>

      <h3>モノレポでのパッケージ解決</h3>
      <p>
        Strapi はワークスペースパッケージを使用しています — <code className="text-perry-400">@strapi/core</code> は
        モノレポ内の兄弟パッケージで、npm 依存関係ではありません。Perry は{" "}
        <code className="text-perry-400">package.json</code> の exports フィールドを通じてベア指定子を解決します：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-green-400">&quot;exports&quot;</span>: {"{"}</p>
          <p>  <span className="text-green-400">&quot;.&quot;</span>: {"{"} <span className="text-green-400">&quot;source&quot;</span>: <span className="text-green-400">&quot;./src/index.ts&quot;</span>, <span className="text-green-400">&quot;import&quot;</span>: <span className="text-green-400">&quot;./dist/index.mjs&quot;</span> {"}"}</p>
          <p>{"}"}</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">createStrapi</code> 関数は
        <code className="text-perry-400">export * from &apos;@strapi/core&apos;</code> を通じて呼び出し可能な関数として
        正しく解決されます。
      </p>

      <h3>型のみのエクスポートフィルタリング</h3>
      <p>
        TypeScript の <code className="text-perry-400">export type {"{"} Foo {"}"}</code> 構文はランタイムでは
        意味を持ちません — しかし以前は Perry がこれらを実際の{" "}
        <code className="text-perry-400">Export::ReExport</code> エントリに変換し、リンカーを通じて伝播して
        スタブシンボルを生成していました。Hono の <code className="text-perry-400">index.ts</code> だけで
        数十の型をカバーする4つの <code className="text-perry-400">export type</code> 宣言があります。
      </p>
      <p>
        Perry は SWC の <code className="text-perry-400">ExportNamed</code> 宣言の{" "}
        <code className="text-perry-400">type_only</code> フラグと個々の指定子の{" "}
        <code className="text-perry-400">is_type_only</code> をチェックし、HIR ローワリング中にスキップするようになりました。
        これにより、3つすべてのプロジェクトで型再エクスポートからのデッドスタブ生成が排除されました。
      </p>

      <h3>RegExp コンストラクタ</h3>
      <p>
        <code className="text-perry-400">new RegExp(pattern, flags)</code> は Perry の既存の{" "}
        <code className="text-perry-400">js_regexp_new</code> ランタイム関数にコンパイルされるようになりました。
        ランタイムは既に RegExp をサポートしていましたが、{" "}
        <code className="text-perry-400">Expr::New</code> のコード生成ハンドラにそのケースがなく、
        すべての <code className="text-perry-400">new RegExp(...)</code> が「Unknown class」警告に
        フォールスルーしていました。Hono の <code className="text-perry-400">RegExpRouter</code> はこれを
        多用しています。
      </p>

      <h2>まだ動作しないもの</h2>
      <p>
        ギャップは成功と同じくらい重要な情報を伝えるため、ここでは具体的に述べます。
      </p>

      <h3><code className="text-perry-400">this</code> への動的プロパティ割り当て</h3>
      <p>
        Hono のコンストラクタは HTTP メソッドハンドラを動的にセットアップします：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">allMethods</span> = [<span className="text-green-400">&apos;get&apos;</span>, <span className="text-green-400">&apos;post&apos;</span>, <span className="text-green-400">&apos;put&apos;</span>, <span className="text-green-400">&apos;delete&apos;</span>, ...]</p>
          <p><span className="text-cyan-400">allMethods</span>.<span className="text-yellow-400">forEach</span>((<span className="text-cyan-400">method</span>) =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">this</span>[<span className="text-cyan-400">method</span>] = (<span className="text-cyan-400">args1</span>, ...<span className="text-cyan-400">args</span>) =&gt; {"{"}</p>
          <p>    <span className="text-slate-500">// register route</span></p>
          <p>    <span className="text-purple-400">return this</span></p>
          <p>  {"}"}</p>
          <p>{"}"})</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">app.get</code>、<code className="text-perry-400">app.post</code>
        などは静的に宣言されていません — 計算されたプロパティ名を介してランタイムで割り当てられます。
        Perry はまだ <code className="text-perry-400">this[variable] = value</code> をサポートしていないため、
        これらのメソッドが欠落しています：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">[4] Dynamic method assignment (this[method] = ...)</span></p>
          <p className="text-amber-400">  INFO: app.get not available</p>
          <p className="text-amber-400">  INFO: app.on not available</p>
        </div>
      </div>
      <p>
        Hono にとって最大の単一のギャップです。Hono クラスは存在し、ルーターは初期化されていますが、
        ルートを登録できません。
      </p>

      <h3>モジュールレベルのコンストラクタ呼び出し</h3>
      <p>
        tRPC はそのエントリポイントを次のように定義しています：
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">export const</span> <span className="text-cyan-400">initTRPC</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCBuilder</span>()</p>
        </div>
      </div>
      <p>
        ランタイムでは、<code className="text-perry-400">initTRPC</code> は{" "}
        <code className="text-perry-400">typeof object</code> ではなく{" "}
        <code className="text-perry-400">typeof function</code> として現れます —
        モジュールレベルの <code className="text-perry-400">new TRPCBuilder()</code> 式がコンストラクタを
        実行していないため、インスタンスではなくクラスへの参照が得られます。つまり{" "}
        <code className="text-perry-400">initTRPC.create()</code> と{" "}
        <code className="text-perry-400">initTRPC.context()</code> は共に{" "}
        <code className="text-perry-400">undefined</code> です。
      </p>

      <h3>継承されたプロパティ</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code> で、{" "}
        <code className="text-perry-400">TRPCError</code> に直接定義された{" "}
        <code className="text-perry-400">err.code</code> は動作しますが、{" "}
        <code className="text-perry-400">Error</code> から継承された{" "}
        <code className="text-perry-400">err.message</code> にはアクセスできません。
        プロパティルックアップのプロトタイプチェーンが完全には実装されていません。
      </p>

      <h3>複雑なコンストラクタチェーン</h3>
      <p>
        Strapi の <code className="text-perry-400">createStrapi()</code> 関数は内部で{" "}
        <code className="text-perry-400">new Strapi(opts)</code> を呼び出し、これが{" "}
        <code className="text-perry-400">Container</code>（<code className="text-perry-400">Map</code> で裏打ち）を
        継承し、<code className="text-perry-400">loadConfiguration()</code> を呼び出し、プロバイダーを反復して
        サービスを登録します。この深いコンストラクタチェーンはフォールシーな戻り値を生成します —
        クラッシュはしませんが、使用可能なインスタンスも生成しません。
      </p>

      <h3>Web API ビルトインクラス</h3>
      <p>
        3つのプロジェクトで残っている「Unknown class」警告：
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">クラス</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">件数</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Response", "11"],
              ["TransformStream", "7"],
              ["ReadableStream", "5"],
              ["Request", "4"],
              ["Headers", "3"],
              ["Proxy", "2"],
              ["TextEncoderStream", "2"],
              ["WritableStream", "1"],
              ["DOMException", "1"],
            ].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800">
                <td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td>
                <td className="py-2 px-4 text-slate-400">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <code className="text-perry-400">Response</code>、<code className="text-perry-400">Request</code>、
        <code className="text-perry-400">Headers</code> はあらゆる HTTP フレームワークにとって重要です。
        <code className="text-perry-400">Map</code>、<code className="text-perry-400">Set</code>、{" "}
        <code className="text-perry-400">RegExp</code>、<code className="text-perry-400">Buffer</code>、{" "}
        <code className="text-perry-400">AbortController</code> などに既にあるものと同様のビルトインコード生成サポートが
        必要です。
      </p>

      <h2>これが示すこと</h2>
      <p>
        良いニュース：Perry のコンパイルパイプラインは実際のフレームワークコードを処理できます。
        複雑な再エクスポートチェーン、ジェネリクスが多い型シグネチャ、クラス階層、モノレポパッケージ解決を持つ
        マルチファイルプロジェクトが、すべてリンク済みバイナリにまで到達します。
      </p>
      <p>
        ギャップはコンパイルのギャップではなく、ランタイムのギャップです。残りの作業：
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>動的プロパティ割り当て</strong> — メソッドをプログラム的にセットアップするフレームワークに必要</li>
        <li><strong>モジュールレベルの初期化式</strong> — <code className="text-perry-400">export const x = new Foo()</code> が実際にコンストラクタを実行する必要がある</li>
        <li><strong>プロトタイプチェーン</strong> — 継承されたプロパティとメソッド</li>
        <li><strong>Web API ビルトイン</strong> — HTTP フレームワーク用の <code className="text-perry-400">Response</code>、<code className="text-perry-400">Request</code>、<code className="text-perry-400">Headers</code></li>
      </ol>
      <p>
        これらは具体的で、範囲が明確な問題です。アーキテクチャの変更を必要とするものはありません —
        より単純なケースで既に動作しているパターンの拡張です。
      </p>
      <p>
        引き続き取り組んでいきます。目標は{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        がネイティブバイナリで動作する HTTP サーバーを生成することです。
      </p>
    </>
  );
}
