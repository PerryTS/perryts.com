export default function Content() {
  return (
    <>
      <p>
        前回の投稿は <strong>v0.5.306</strong> で締めくくり、ストーリーは gen-GC + JSON + ベンチマーク でした。4 日後、Perry は <strong>v0.5.359</strong> に到達 — つまり <strong>53 のパッチリリース</strong> — そして、ストーリーはまた違うものになっています。これらのリリースに、ベンチマーク数値を見出しにしたものはありません。ほぼすべてが <strong>トラッカーで Issue がクローズされていく</strong> 話です。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> 登場 — デスクトップアプリ向けの Sparkle / Tauri スタイルの自動アップデート（SHA-256 ダイジェストに対する Ed25519、センチネル方式のロールバック、デタッチ再起動）。コミュニティ PR、<strong>TheHypnoo</strong> 氏 から（<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>）。</li>
        <li><strong>Geisterhand フェーズ D</strong> — <code>http://localhost:7676</code> のライブインスペクター。ウィジェットツリー、ウィジェット別詳細、クリックディスパッチ、そして <code>POST /style/:h</code> によるライブスタイル編集。</li>
        <li><strong>コンパイラのリファクタリング。</strong> v0.5.329 → v0.5.343 にかけて、最も参照されていた 4 ファイルを分割：<code>lower::lower_expr</code> 6,687 → 624 LOC（−91 %）、<code>compile.rs</code> 9,391 → 3,783 LOC（−60 %）、<code>lower.rs</code> 13,591 → 7,554 LOC（−44 %）、<code>lower_call.rs</code> 7,000+ → 4,681 LOC（−33 %）。新しい <code>walker.rs</code> は <code>_ =&gt; {}</code> キャッチオールのバグクラスをコンパイルエラーに変えます。</li>
        <li><strong>UI スタイリング フェーズ C 完了</strong> — Apple、Android、GTK4、Windows、Web のすべてのウィジェットでインライン <code>style: {`{ ... }`}</code> プロップ。Windows は 5 つのスタブのうち 4 つを配線（decoration / opacity / borders）。残るは <code>widget.shadow</code> のみ（DirectComposition フォローアップ）。</li>
        <li><strong>Windows 用の Scoop バケット</strong>：<code>scoop install perry-ts/perry</code>。リリースワークフローに SHA-256 サイドカー。</li>
        <li><strong>コミュニティ Issue 修正の波</strong> — runtime、codegen、fetch、GTK4、Windows リンカ、async、stdlib にまたがって 約 30 の Issue がクローズ。</li>
      </ul>

      <h2>1. perry/updater — デスクトップアプリの自動アップデート</h2>
      <p>
        修正前の Perry にはアップデート手段がありませんでした。アプリは出荷され、出荷され、それで終わり。<strong>TheHypnoo</strong> 氏が <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> でフルセットを提案：
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // 前回起動がクラッシュしていたらセンチネル・ロールバック

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // 新しいビルドが正しく起動した後に呼ぶ`}</code></pre>
      <p>
        信頼モデル：<strong>Ed25519 をファイルの SHA-256 ダイジェストにかける</strong>（ファイルバイトではなく — 大きなバイナリでも検証を安価に保つため）。マニフェストは JSON、スキーマバージョン付き、<code>&lt;os&gt;-&lt;arch&gt;</code> トリプルごとに 1 エントリ。<code>&lt;exe&gt;.prev</code> バックアップ付きのアトミックインストール、デタッチ再起動（Unix では <code>setsid</code>、Windows では <code>DETACHED_PROCESS</code>）。モバイルは設計上除外 — App Store / Play Store が OS レベルでインストールパイプラインを所有しているため。
      </p>
      <p>
        スモークテストを書く中で 2 つの Perry ランタイムの癖が表面化し、その場で修正されました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> はメタデータだけのスタブを返していた。</strong> <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> で修正（こちらも TheHypnoo 氏） — <code>js_response_array_buffer</code> は実体の <code>BufferHeader</code> をアロケートし、<code>resp.body</code> を <code>memcpy</code> で中に入れます。</li>
        <li><strong><code>fs.appendFileSync</code> が 0 バイトを書き込んでいた。</strong> <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> で修正 — namespace-import の lowering パス（<code>import * as fs from &quot;fs&quot;</code>）に <code>appendFileSync</code> のアームがなく、LLVM codegen 側にも HIR バリアント用のアームがなかった。両方とも配線。</li>
      </ul>
      <p>
        ドキュメントは <code>docs/src/updater/overview.md</code> にあります。
      </p>

      <h2>2. Geisterhand：localhost:7676 のライブインスペクター</h2>
      <p>
        Geisterhand は Perry のインプロセス UI テストハーネス — ポート 7676 上の HTTP API でウィジェット状態をスナップショット取得し、クリックをディスパッチしていました。フェーズ D はこれをブラウザから開ける devtools 風インスペクターに変えます。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>ステップ 1（v0.5.349）</strong> — <code>GET /</code> はウィジェットツリー、ウィジェット別詳細（frame、value、raw JSON）、1.5 秒の自動更新（一時停止 / 再開）、「fire onClick」アクションボタンを備えた、シングルページの Vanilla-JS UI を返します。Codegen は macOS の lazy-load <code>-dead_strip</code> に対して <code>INSPECTOR_HTML</code> をピン留めし、リリースビルドでも生き残らせます。</li>
        <li><strong>ステップ 2（v0.5.350）</strong> — <code>POST /style/:h</code> は JSON のプロパティバッグを受け取り、ライブで適用します。9 つのプロパティ（<code>backgroundColor</code>、<code>color</code>、<code>borderColor</code>、<code>borderWidth</code>、<code>borderRadius</code>、<code>opacity</code>、<code>padding</code>、<code>hidden</code>、<code>enabled</code>）が、既存のポンプキューを介して HTTP スレッド → メインスレッドへ流れます。不正な JSON → 400、不正なハンドル → 400、未知のプロパティはサーバ側でフィルタされ、レスポンスは適用されたものを列挙します。</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        macOS のディスパッチャは配線済み。Linux / Windows / iOS / tvOS / visionOS / Android は同じ形で次の対象です。
      </p>

      <h2>3. コンパイラのリファクタリング — 最大の 4 ファイルを分割</h2>
      <p>
        トラッカーの 5 つの Issue（<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>、<a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>、<a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>、<a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>、それにロングテール）が同じ形をしていました：新しい <code>Expr</code> バリアントが <code>ir.rs</code> に追加されたが、<code>lower.rs</code> 内の 4 つのアドホックな walker のうち 1 つが <code>_ =&gt; {}</code> のキャッチオールを持っていて、新しいバリアントを黙って誤コンパイルしていた。これをランタイムで捕まえるのは高くつく — 不可視な場合もあれば、SSO 下で SIGSEGV することもある。
      </p>
      <p>
        <strong>v0.5.329</strong> は <code>crates/perry-hir/src/walker.rs</code> を導入し、<code>walk_expr_children</code> / <code>walk_expr_children_mut</code> を提供 — 全 178 個の <code>Expr</code> バリアントに対する exhaustive な match で、<strong>キャッチオールなし</strong>。新しいバリアントをここにリストせず追加すると、これがコンパイルエラーになります。4 つの利用側（<code>substitute_locals</code>、<code>find_max_local_id::check_expr</code>、<code>collect_local_refs_expr</code>、<code>remap_local_ids_in_expr</code>）は次のように崩れました：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">関数</th>
              <th className="text-right py-2 px-3">前</th>
              <th className="text-right py-2 px-3">後</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90 %</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84 %</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        合計：<strong>−1,830 行の重複した descent</strong> が、<strong>+1,840 行の集約された walker</strong> に置き換わりました — 差し引きフラットですが、バグクラスは消滅しています。
      </p>
      <p>
        これで残りが解放されました。<strong>v0.5.331 → v0.5.343</strong> は 14 コミットにわたり 4 つのモノリスを切り分けました。見出しの数値：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">ファイル</th>
              <th className="text-right py-2 px-3">前</th>
              <th className="text-right py-2 px-3">後</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6,687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9,391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3,783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13,591</td><td className="text-right py-2 px-3">7,554</td><td className="text-right py-2 px-3">−44 %</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7,000+</td><td className="text-right py-2 px-3">4,681</td><td className="text-right py-2 px-3">−33 %</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        分割は 19 個の新しい焦点を絞ったサブモジュールとして着地しました：<code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>、<code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>、<code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>、加えて UI / system / i18n のメソッドテーブルの単一の真実の源泉となった新しい <code>crates/perry-dispatch</code> クレート（Issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> の「macOS ではコンパイルできるが Web で壊れる」サプライズを引き起こしていた <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> のファンアウトは、今や 1 回のルックアップに）。
      </p>
      <p>
        <strong>Tier 4 のパフォーマンス改善</strong> も同行（v0.5.335–v0.5.336）：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>inline_functions</code> 内の 2 パスと <code>compile.rs</code> 内の 3 つの rayon パスを融合 — コンパイルあたりモジュールスキャン 5 回 + スケジューラのラウンドトリップ 3 回を節約。</li>
        <li><code>perry dev</code> のパースキャッシュを 500 エントリに制限、FIFO 排出。修正前は <code>node_modules</code> をたどるセッションで 100 MB 超の SWC AST を保持し得ました。</li>
        <li>codegen 後の <code>.ll</code> 書き込みループを並列化 — 50+ モジュールの SSD で wall-time が 2–4 倍速。</li>
        <li>ロケールテーブルをワーカーごとにクローンする代わりに <code>Arc&lt;I18nTable&gt;</code>。</li>
      </ul>
      <p>
        ワークスペーステストは全コミットを通じて <strong>434 passed / 0 failed / 5 ignored</strong>、ギャップテストは 25/28 ベースライン、ドキュメントテストは 80/82 ベースラインを維持。
      </p>

      <h2>4. UI スタイリング フェーズ C、完了</h2>
      <p>
        フェーズ C はインライン <code>style: {`{ ... }`}</code> のロールアウトでした。ステップ 1〜7 がこのウィンドウでクローズ：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — <code>StyleProps</code> 型サーフェス + Button へのインライン <code>style:</code>。</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — すべてのテーブル系ウィジェット、続いて VStack / HStack に対する color/padding/shadow のインラインデストラクチャ。</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — hex 文字列 + グラデーション + 動的値のためのランタイム <code>parseColor</code>。</li>
        <li><strong>v0.5.312</strong> — スタイリング ドキュメント + Windows のトラッキング Issue。</li>
      </ul>
      <p>そしてクロスプラットフォームの一掃：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong>（<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>、<a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>） — 4 つのスタイリング FFI を配線、加えて Linux のドキュメントテストゲートを止めていた 7 つの欠落 FFI（v0.5.322）。</li>
        <li><strong>macOS</strong>（v0.5.324） — <code>widget.shadow</code> のための <code>CALayer</code> シャドウ配管 + visual_test インフラ；非 <code>NSTextField</code> ウィジェットのための <code>set_color</code> クラスプローブ。</li>
        <li><strong>iOS / tvOS / visionOS</strong>（v0.5.346） — Button の <code>color: ...</code> は <code>UIButton</code> の <code>setTextColor:</code> を叩いていた（このセレクタは実装されていない）；<code>objc2</code> の panic が <code>extern &quot;C&quot;</code> 境界を越え、プロセスがアボートしていました。macOS と同じクラスプローブ パターンで修正 — UIButton は <code>setTitleColor:forState:UIControlStateNormal</code> 経由でルーティング。</li>
        <li><strong>Windows</strong>（v0.5.347） — 5 つのスタイリングスタブのうち 4 つを配線（<code>text.decoration</code> は <code>LOGFONT</code> ラウンドトリップ経由、<code>widget.opacity</code> は <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code> 経由、borders は <code>SetWindowSubclass</code> + <code>WM_PAINT</code> 経由）。残るは <code>widget.shadow</code> のみ（DirectComposition が必要）。</li>
      </ul>
      <p>
        <code>docs/src/ui/styling-matrix.md</code> のスタイリング マトリックスは、ウィンドウを <strong>Web 43/43 Wired</strong>、<strong>Windows 42/43 Wired</strong>、その他はフルカバレッジで終えています。
      </p>

      <h2>5. ランタイム正しさのパス — Issue ごとに</h2>
      <p>
        この期間のテーマ：トラッカーから入ってきた誤コンパイルはすべて、修正に変わるか、コンパイル時エラーに変わりました。ハイライト：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>（v0.5.323）</strong> — <code>fn</code> 内のクラスメソッドが囲っている fn のローカルをキャプチャできなかった。マルチモジュールの再現は今や Node とバイト単位で一致。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>（v0.5.321 + v0.5.330）</strong> — 7 つの string-operand サイトでの SSO-safe な string-handle アンボックス：<code>arr.join</code>、<code>arr.toString</code>、<code>obj[stringKey]</code> get/set/delete、<code>string.match(re)</code>、<code>process.env[dynKey]</code>、crypto digest 入力。修正前は、これらのいずれもインライン文字列オペランドに対して、黙ってゴミを返すか SIGSEGV を起こしていました。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a>（v0.5.351）</strong> — モジュールレベルの空の <code>const</code> 配列が、関数内からの <code>arr[i]=</code> 書き込みを取りこぼしていた。Bloom-Engine/jump の <code>discoverLevels()</code> が <code>LEVEL_FILES</code> を index-assign でモジュールレベルに埋めようとしたとき、レベル選択画面が空で出た事例で表面化。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a>（v0.5.357）</strong> — async 関数内からの <code>Array.push</code> は、配列がパラメータとして渡されたとき静かに 16 要素で頭打ちになっていた。async 関数はインライン化されない；リアロケーションは新しいポインタを返すが、呼び出し元はそれを見られない。修正：成長のたびに古い場所にフォワーディングポインタを設置し、GC 既存の <code>GC_FLAG_FORWARDED</code> 機構を再利用。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a>（v0.5.358）</strong> — 呼び出し元が末尾の引数を省略したとき、メソッドのデフォルト引数ディスパッチがゴミを渡していた。寄与した 2 つの部分：cross-module のメソッド宣言が <code>arity + 1</code> ではなく 6 ダブルをハードコード、そして <code>lower_class_method</code> が <code>build_default_param_stmts</code> をまったく呼んでいなかった。mongodb の <code>findOne(filter, options = {`{}`})</code> が静かにハングする現象として表面化；修正はローカルおよび cross-module ディスパッチ全体で統一されています。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a>（v0.5.355）</strong> — 1 つの再現から 3 つの独立した fetch + promise バグ：api.github.com は匿名で 403（デフォルト User-Agent を設定）、<code>.then(console.log)</code> が永久にハング（null コールバックが TASK_QUEUE エントリを push していなかった）、すべての fetch リジェクションが <code>Uncaught exception: [object Object]</code> を出力（実際の <code>ErrorHeader</code> ではなく裸の <code>*StringHeader</code> が NaN-box されていた）。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a>（v0.5.359）</strong> — <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code> インスタンスメソッドを持つ実体の <code>Blob</code>。修正前は、<code>await response.blob()</code> はメタデータだけのスタブ <code>{`{size, type}`}</code> を返していました。3 部構成の修正が runtime + HIR + codegen にまたがって着地。</li>
      </ul>
      <p>加えて小さなキャッチアップ：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup が Linux のジェネリック単形化を過剰に刈り取っていた + GTK4 のリンク サイレントフォールバック。修正：名前パターンによるフィルタリングを <code>llvm-nm</code> 経由の <strong>シンボル集合</strong> 比較に置き換え。1 つでもユニークなシンボルを持つメンバーは保持。<code>libperry_ui_macos.a</code> をリンクエラーなしで 196 → 35 オブジェクトに刈り込み。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — Windows のリンク行に <code>secur32.lib</code> を追加。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n の <code>FormatNumber</code> FP ラウンドトリップを Ryū 経由で。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — <code>perry/i18n</code> のフォーマット ラッパー用に codegen ディスパッチを配線。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — <code>perry/plugin</code> の codegen ディスパッチ。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — Canvas ウィジェットを LLVM codegen 経由で。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView を codegen 経由で。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — Table ウィジェットを codegen 経由で。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong>（部分対応） — stdlib ヘルパー ディスパッチのアームを 11 個。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — iOS + Android でのバックグラウンド受信通知（warm-path）。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — watchOS のゲームループ FFI フック用の弱い fallback。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — <code>using</code> / <code>await using</code> の dispose フック。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — <code>js_native_call_method</code> の引数 alloca を entry ブロックへ巻き上げ。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — <code>substitute_locals</code> の Uint8Array アーム。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> をエンドツーエンドで配線（コミュニティ PR）。</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        Windows のツールチェーン物語はさらにシンプル化を続けます。<strong>v0.5.353</strong> はホストビルドで <code>clang -target</code> をピン留め — PATH 上の非 MSVC な clang（MinGW / MSYS2 / Anaconda / Rust GNU バンドル）が、Perry の <code>x86_64-pc-windows-msvc</code> IR を黙って <code>windows-gnu</code> に書き換えていて、lld-link は LLVM の mingw32 エミッタが挿入する <code>__main</code> 参照を解決できずにいました。新しい <code>probe_clang_default_triple</code> は、プロセスごとに 1 回 <code>clang --version</code> を実行し、ホストのデフォルトが GNU で、しかし MSVC をターゲットしている場合に 1 行だけ情報メモを出します。<code>PERRY_NO_CLANG_PROBE=1</code> で抑制可能。
      </p>
      <p>
        <strong>v0.5.345</strong> は Win64 の <code>perry-ui</code> ABI を <code>perry-dispatch</code> に揃えました — 3 つの runtime extern シグネチャがずれていました（<code>perry_ui_navstack_create</code>、<code>perry_ui_menu_add_item_with_shortcut</code>、<code>perry_ui_app_set_timer</code>）。Win64 ABI では整数と浮動小数の位置引数がスロットインデックスを共有するため、ミスマッチは未初期化レジスタからゴミを読みます。SysV（macOS / Linux）は int/float のレジスタプールが分離していて偶然有効なビットが乗っていた — Windows 限定のクラッシュで、8 つの perry-ui-* プラットフォームクレートすべてで修正。
      </p>
      <p>
        そして：<strong><code>scoop install perry-ts/perry</code></strong>。マニフェストは v0.5.345 にピン留め（<code>depends: main/llvm</code> で公式の MSVC デフォルト LLVM を自動取得）。リリースワークフローは今、<code>&lt;artifact&gt;.sha256</code> サイドカーを各アーカイブの隣に出力し、形式は <code>sha256sum</code> 互換 — 任意の下流パッケージマネージャ バンパー向け。
      </p>
      <pre><code>{`# Windows ホスト
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. まとめ</h2>
      <p>
        この期間のパターンは、コミュニティのエンゲージメントと内部的な衛生のミックス。<strong>TheHypnoo</strong> 氏は重要な PR を 3 つ届けました（<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater、<a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> <code>fs.appendFileSync</code> の配線、<a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> <code>response.arrayBuffer</code> の body バイト）。トラッカーは約 30 の Issue が空になりました。コンパイラは最大ファイルが 60 % 縮小し、4 つのアドホック walker のうち 1 つを更新し忘れることがランタイムの誤コンパイルから <code>cargo build</code> エラーへと変わる exhaustive な walker を獲得。UI スタイリングは Windows のシャドウを除く全デスクトッププラットフォームで均等に達成。Geisterhand はブラウザベースの devtools サーフェスを獲得。Windows のインストールパスはコマンド 1 つ短くなりました。
      </p>
      <p>試す：</p>
      <pre><code>{`# npm（任意のプラットフォーム）
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew（macOS）
brew install PerryTS/perry/perry

# Scoop（Windows）
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# デスクトップアプリの自動アップデート
npm install @perry/updater

# ライブインスペクター
perry compile main.ts -o app --enable-geisterhand
./app &  # その後 http://localhost:7676 を開く`}</code></pre>
      <p>
        ソース：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues：<a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog：<a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
