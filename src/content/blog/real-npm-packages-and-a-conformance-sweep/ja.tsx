export default function Content() {
  return (
    <>
      <p>
        前回の投稿は <strong>v0.5.875</strong> で GC のストーリーとともに締めくくりました — aya_koto 氏のベンチマークが暴いたギャップを埋める話です。あの投稿は 1 つのベンチマークに勝つ話でした。今回は別の種類の仕事についてです：約 4 週間にわたって着地した、<strong>v0.5.875 から v0.5.1146 までのおよそ 270 リリース</strong>、そのほとんどはベンチマークの見出しではありません。テーマは「マイクロベンチマークで速く走る」から <strong>「実世界の TypeScript と本物の npm パッケージを実際にコンパイルして動かす」</strong> へと移りました。加えて、その道のりで Windows の全面的なビジュアル刷新と、新しいウィジェットの山も。
      </p>
      <p>
        出荷されたものを、実際に何のためだったかでグループ分けして紹介します。
      </p>

      <h2>本物の npm パッケージが今コンパイルできる</h2>
      <p>
        このウィンドウを貫く最大の単一スレッドは、人気の npm パッケージをネイティブバイナリにコンパイルして振る舞いのテストを通す一掃でした — 単に「エラーなくリンクする」だけでなく、実行して正しい出力を生むこと。今 <code>perry.compilePackages</code> を通して動くリストには、<strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, Colyseus</strong> が含まれます。
      </p>
      <p>
        それぞれが固有の理由で失敗し、それぞれの修正が固有の小さなストーリーです：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> は <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code> でクラッシュしていました。根本原因（v0.5.1144、<a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>）：別のモジュールからインポートされた関数 <code>F</code> に対する <code>new F()</code> が静かに空のオブジェクトを生んでいた — コンストラクタの本体が一度も実行されず、その結果すべての <code>$ZodCheckMinLength</code> 系のチェックが <code>_zod</code> プロパティを剥ぎ取られた状態で返ってきていました。</li>
        <li><strong>axios + jose</strong> は Perry がまだ持っていなかった crypto と圧縮を必要としました：<code>zlib.createBrotliDecompress</code>、<code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>、AES-GCM 向けの <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code>、そして <code>randomFillSync</code>（v0.5.972–976）。</li>
        <li><strong>fastify</strong> は <code>wait_for_promise</code> の 1 秒ポーリングタイムアウトでデッドロックしていました。私たちはそれを condvar の待機に置き換え、リジェクトされた Promise がハングする代わりに <code>HTTP 500</code> として表面化するようにしました（v0.5.912）。</li>
        <li><strong>@hono/node-server</strong> は POST のボディを読めませんでした — v0.5.1142 の親登録の修正までは、<code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> が POST/PUT で空を返していました。</li>
        <li><strong>chalk, ms, debug, express</strong> はすべて同じ形にぶつかりました：<em>プロパティが付与された呼び出し可能な値</em>（<code>chalk.red</code>、<code>express()</code> に加えて <code>express.Router</code>）。そのパターンの 3 つのフレーバーが v0.5.935 とその周辺の npm 一掃にわたって修正され、加えて express を解放するための <code>util.inherits</code> + ストリームのプロトタイプ足場（v0.5.990）。</li>
        <li><strong>dayjs</strong> は minify されたバンドルとして出荷されており、Perry が誤って lowering していた JS クラシックなプロトタイプメソッドのディスパッチ（<code>Class.prototype.m = fn</code>）を行使していました（v0.5.924/932）。</li>
      </ul>
      <p>
        そのすべての下には、Perry が <em>ネイティブに</em>コンパイルできないパッケージをそれでも動かす部分があります：このウィンドウで <strong>V8 フォールバックランタイム</strong>が本物になりました。その ModuleLoader は今や埋め込まれたモジュールマップから読み込むので、フォールバックバイナリも依然として <strong>自己完結</strong> です — ランタイムにバラバラの <code>node_modules</code> はありません（v0.5.994）。<code>createServer</code> は本物の hyper サーバにブリッジし（v0.5.999）、<code>Response</code> / <code>Request</code> / <code>Headers</code> という Web Fetch のグローバルがフォールバックパスに存在します（v0.5.1006）。そして <strong>コンパイル時の動的 <code>import()</code></strong> — ビルド時に解決される文字列リテラルの <code>await import(&apos;./foo.ts&apos;)</code> — がついに着地しました（v0.5.905、<a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>）。
      </p>

      <h2>test262 適合性の一掃</h2>
      <p>
        もう 1 つの支配的なスレッドは適合性です。私たちは test262 のサブセットレーダーに対して焦点を絞ったパスを走らせ、実際のコードが最も強く依存する組み込みで針を動かしました：
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        String の跳躍は、すべての <code>String.prototype</code> メソッドにジェネリックな <code>this</code> ディスパッチを与え、<code>slice</code>/<code>substring</code> のインデックス強制を修正したことから来ました。Array の跳躍は、密配列のコールバック（<code>forEach</code>/<code>map</code>/<code>filter</code>/…）での <code>thisArg</code>、配列ライクな <code>ToLength</code>、仕様どおりの操作順序、そして引数ゼロのバリデーションでした。デストラクチャリングは、プレーン・ジェネレータ・async ジェネレータ・static・private のクラスメソッドにまたがるパラメータデストラクチャリングを拾いました。
      </p>
      <p>
        見出しの数値と並んで、正しさのロングテールが着地しました：<code>JSON.parse</code> は今や本物の <code>SyntaxError</code>（<code>TypeError</code> ではなく）をスローし、末尾のトークンを拒否します。その reviver は仕様の <code>InternalizeJSONProperty</code> アルゴリズムを介して歩きます。<code>Object.prototype.toString</code> は型付き配列、Symbol、BigInt、Map/Set/WeakMap/WeakSet/Promise/RegExp に対して正しくブランド付けします。<code>RegExp.prototype.toString</code> は <code>/source/flags</code> を返します。async ジェネレータは <code>yield</code> がオペランドを await するセマンティクスを正しくしました。これらはフルスイートではなくサブセットレーダーです — Perry はまだ登り続けています — が、今月の登りは急峻でした。
      </p>

      <h2>Windows が Fluent になる</h2>
      <p>
        Windows はビジュアルの刷新を受けました（<a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a> シリーズ）。Perry のウィンドウは今やデフォルトでモダンな DWM クロームにオプトインします — <strong>Mica の背景</strong>、丸い角、そしてテーマ対応のタイトルバー — そしてコモンコントロールは、Windows 95 時代のデフォルトではなく <strong>comctl32 v6</strong> を通してレンダリングされます。ウィンドウプロシージャは今や <code>WM_DPICHANGED</code> を処理するので、スケーリングが混在したモニタ間でウィンドウをドラッグしても、ビットマップが引き伸ばされる代わりにくっきりしたままです。
      </p>
      <p>
        重要なのは、これらのいずれも、古い <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a>「リサイズ後の黒い領域」リグレッションを再導入しなかったことです：クライアント領域は依然として不透明に描画され、フルフレームの Mica/Acrylic のブラースルーは明示的な <code>app.setVibrancy(...)</code> のオプトインのままです。完全にモダンなスタックを望むアプリのための新しい <code>--target windows-winui</code> バックエンドの足場（WinUI 3）もあり、そして小さいが本物の修正として、<code>perry compile main.ts -o main</code> が Windows で <code>main.exe</code> を生成するようにして、PowerShell が実際にそれを起動できるようにしました（v0.5.1146）。
      </p>

      <h2>新しいウィジェット、すべてのプラットフォームで</h2>
      <p>
        2 つのウィジェットがちょうど直近の 1 日で着地し、両方とも Perry がターゲットとするすべての UI プラットフォームにまたがります：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong>（<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>） — コンパクトでフィールドスタイルの日付コントロール：macOS では <code>NSDatePicker</code>、iOS/visionOS では <code>UIDatePicker</code>（.compact）、Windows では <code>SysDateTimePick32</code>、Android では <code>android.widget.DatePicker</code>、Linux では GTK4。そのすべてにまたがる 1 つの TS サーフェス。</li>
        <li><strong>ドラッグ &amp; ドロップ</strong>（<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>） — どのウィジェットもテキスト/ファイル/URL のドロップ先かつドラッグ元になれ、<code>NSDraggingDestination</code>（AppKit）、<code>UIDropInteraction</code>（UIKit）、<code>View.setOnDragListener</code>（Android）にマップされます。</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        このウィンドウの早い段階で、ウィジェットの棚はデスクトップとモバイルにまたがって埋まりました — Combobox、TreeView、Calendar、Chart、CommandPalette、RichTextEditor、MapView、PdfView、BottomNavigation、そしてスワイプ可能な ImageGallery — それぞれがすべてのプラットフォームで本物のネイティブコントロールに裏打ちされています。HarmonyOS（ArkTS）は Chart と TreeView を得て（v0.5.893）、他と肩を並べるために必要だった最後の 2 つのウィジェットでした。
      </p>

      <h2>GC、内部実装、そして安定性</h2>
      <p>
        それら 270 リリースのほとんどは見出しではありません — バグ修正と内部実装であり、それこそがこのフェーズの要点です。いくつか挙げる価値のあるもの：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC は続きました。</strong> GC の投稿の条件付きフリーリストの作業は落ち着き続け、鋭いクラスのバグがクローズされました：ネイティブブリッジされた Promise は今や <strong>tokio ワーカー上で実行中はピン留め</strong>され、解決が着地する前に GC がそれらをスイープできないようになっています（v0.5.923）。負荷の下で非同期の fetch を走らせて幻のコレクションを見たことがあれば、それがこれでした。</li>
        <li><strong>メモリモデルが文書化されました。</strong> 今や <code>internals/memory-model.md</code> のディープダイブがあります — NaN ボクシング、世代別 GC、シャドウスタック、ライトバリア — ドキュメントサイトに配線されています（v0.5.933）。</li>
        <li><strong>codegen の安定性修正の波</strong>が npm 一掃によって表面化しました：再開された async ステップの内側で呼ばれたモジュールレベルの <code>const</code> アロー関数がもはや SIGSEGV しなくなり（v0.5.953）、<code>{`try { await rejected } catch { return X }`}</code> がもはや永遠にハングしなくなり（v0.5.870）、そして本物のバンドルがつまずいた一握りの <code>js_is_truthy</code> / 生ポインタ範囲のクラッシュが修正されました。</li>
      </ul>

      <h2>Apple のハウスキーピング</h2>
      <p>
        より小さいが本物：<code>perry setup ios --development</code> は今や開発ビルド用にプロビジョニングし（v0.5.1023）、Apple のクロスライブラリのビルド/リンクパスは重複が除去されてポインタ幅ポータブルになりました（v0.5.1121/1125） — これが、行き詰まっていた npm / Homebrew / APT / winget の公開マトリックスを解放したものです。
      </p>

      <h2>これが残すもの</h2>
      <p>
        Perry の背後にある賭けは、常に「ネイティブ TypeScript」が意味を持つのは <em>本物の</em> TypeScript が走るときだけ — おもちゃのサブセットではなく、人々が <code>npm install</code> する実際のパッケージ — であるというものでした。今月はほとんどがその仕事でした：誇るべき単一の数値というより、「コンパイルできる」と「動く」の間のギャップを埋める、長く地味な押し込みです。適合性レーダーと npm パリティのテストが、今私たちが見守っているスコアボードであり、私たちは数値を投稿し続けます — 良いものも、まだ不完全なものも。
      </p>
      <p>
        ソース：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues：<a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
