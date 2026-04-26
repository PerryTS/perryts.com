export default function Content() {
  return (
    <>
      <p>
        前回の記事は<strong>v0.5.174</strong>で締めくくられ、見出しは1つでした：Perryはついに、ツリー内スイートのすべてのベンチマークでNodeとBunの両方に勝っていました。3日間の作業とGC + JSONコミットのバックログを経て、Perryは<strong>v0.5.306</strong>に到達しました――これは<strong>132回のパッチリリース</strong>です――そしてストーリーは別のものになっています。見出しは547倍のスピードアップでもなければ、新しい勝ち列でもありません。それらの勝利を擁護可能なものにする作業です。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>世代別GC</strong>がデフォルトとして出荷されます。Phase A〜Dはv0.5.217〜v0.5.237にわたって着地しました。</li>
        <li><strong>Small String Optimization</strong>がデフォルトとして出荷されます。Step 1.5 → 2はv0.5.213〜v0.5.216で着地しました。</li>
        <li><strong>JSONパイプライン</strong>はテープベースのパーサ、遅延パース、遅延ストリンギファイ、要素ごとの疎なマテリアライズを得ました。デフォルトのvalidate-and-roundtripは今や<strong>中央値75 ms</strong>――動的型付けの中で最速です。</li>
        <li><strong>ベンチマークページ</strong>は端から端まで書き直され、<strong>RUNS=11 中央値 + p95 + σ + min + max</strong>、ピアとして追加されたsimdjsonとAssemblyScript+json-as、本物の比較から分離された最適化プローブ、そしてPerryが持つすべての弱点を正直に表面化しました。</li>
      </ul>
      <p>
        脇役は正しさの修正の安定した一連の流れです：Promiseマイクロタスク FIFO、NaN等価性とECMAScript数値フォーマット、BigInt 2の補数、AsyncLocalStorageのエンドツーエンド、decimal.js + ioredis + commanderランタイム、そしてテープパスの下に隠れていた素のf64でのJSON.stringifyのsegfault。加えて、Windowsツールチェーンがついに軽量化されました：LLVM + xwin、Visual Studioのインストールは不要です。
      </p>

      <h2>1. デフォルトオンの世代別GC</h2>
      <p>
        世代別GCは2か月間にわたる段階的なロールアウトでした。この期間に閉じたフェーズの要約：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217〜v0.5.221</strong> ― Phase A：シャドウスタックランタイムの足場、push/pop発行、スロットマップスレッディング、<code>Let</code>/<code>LocalSet</code>シャドウミラーリング、ルートスキャナ。</li>
        <li><strong>v0.5.222</strong> ― Phase B：ナーサリ + 旧世代アリーナ分割。</li>
        <li><strong>v0.5.223〜v0.5.225</strong> ― Phase C1〜C2：ライトバリアランタイムインフラ、codegenがバリアを発行、すべてのヒープストアがそれを通る。</li>
        <li><strong>v0.5.226〜v0.5.228</strong> ― Phase C3a〜C4：remembered-setのルートがマーク + クリアに流れる；マイナーGCトレースは旧世代をスキップ；非移動式テニュアリング。</li>
        <li><strong>v0.5.229〜v0.5.236</strong> ― Phase C4b α/β/γ/δ：フォワーディングポインタインフラ、ピン留め + 退避パス、スキャナ + 推移的ピン留め、参照リライト、アイドルナーサリブロックをOSに返却、GCトリガーを初期しきい値で上限。</li>
        <li><strong>v0.5.237</strong> ― Phase D Part 1：<code>PERRY_GEN_GC=1</code>がデフォルト。</li>
        <li><strong>v0.5.238</strong> ― Phase D Part 2：<code>PERRY_SHADOW_STACK=1</code>がデフォルト。</li>
        <li><strong>v0.5.239〜v0.5.240</strong> ― クローズアウトドキュメント：ロードマップ確定、学術 + 産業の系譜の付録（Bartlett 1988、Ungar 1984、Cheney 1970）。</li>
      </ul>
      <p>
        最も重要だった測定された勝利：<code>test_memory_json_churn</code>はgen-GCのデフォルトが切り替わった瞬間に、ピークRSSが<strong>115 MB → 91 MB</strong>に下がりました。計算面のリグレッションは小さく、言い訳なしに列挙されています ― <code>nested_loops</code> 8 → 18 ms、<code>accumulate</code> 24 → 34 ms、<code>object_create</code> 0 → 1 ms、<code>array_read</code> / <code>array_write</code>がそれぞれ +1 ms。エスケープハッチ（<code>PERRY_GEN_GC=0</code>）は古い数値を取り戻します；トレードオフは意図的なものであり、ベンチマークページは今や両方の行を並べて掲載しているので、読者が選べます。
      </p>

      <h2>2. デフォルトオンのSmall String Optimization</h2>
      <p>
        SSOは22バイトのインライン文字列表現で、短い文字列のヒープアロケーションを回避します ― 典型的なJSONキー（2〜8バイト）と短い値はインライン形式に収まります。ロールアウトは表面的には小さく、内部的には大きいものでした：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>：SSOインフラ（表現 + アクセサ）。</li>
        <li><strong>v0.5.214</strong>：Step 1コンシューマアーム + テスト用<code>PERRY_SSO_FORCE</code>ゲート。</li>
        <li><strong>v0.5.215</strong>：Step 1.5 codegen <code>PropertyGet</code>三方向分岐 ― インライン文字列のファストパス、ヒープ文字列のファストパス、残りのスローパス。</li>
        <li><strong>v0.5.216</strong>：Step 2フリップ ― デフォルトでSSOを発行。</li>
      </ul>
      <p>
        v0.5.279のフォローアップは、SSOがホットになって表面化した最後のプロパティリードNaNバグを閉じ、v0.5.272のチェーンされたクロスモジュールゲッターディスパッチ修正はもう1つを閉じました。両方ともデフォルトが切り替わる前のパンチリストにありました；両方ともperfのリグレッションなしに出荷されました。
      </p>

      <h2>3. JSON：テープベースパース、デフォルトで遅延</h2>
      <p>
        JSONパイプラインはこの期間で最も侵襲的な書き換えを受けました。旧動作：<code>JSON.parse</code>はNaNボックス化された値の完全にマテリアライズされたツリーを構築していました。新動作：<code>JSON.parse</code>は1値あたり12バイトのテープを構築し、遅延でマテリアライズします ― あなたが実際に読んだ値だけがマテリアライズコストを支払います。変更されていないパースに対するstringifyは、今や元の入力のmemcpyになります。simdjsonが<code>raw_json()</code>で使うのと同じファストパスのトリックです。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>：<code>JSON.parse&lt;T&gt;(blob)</code>スキーマ駆動パース（Step 1）。コンパイル時に既知の形状により、コンパイラは事前解決済みのキーアクセスを発行できます。</li>
        <li><strong>v0.5.203</strong>：テープベースパース基盤 ― Step 2 Phase 1。</li>
        <li><strong>v0.5.204</strong>：遅延パース + 遅延ストリンギファイ ― Step 2 Phase 2+4。</li>
        <li><strong>v0.5.206</strong>：遅延セーフなインデックス付きアクセス + エッジケース ― Step 2 Phase 3。</li>
        <li><strong>v0.5.208</strong>：要素ごとの疎なマテリアライズ ― Step 2 Phase 5b。</li>
        <li><strong>v0.5.209</strong>：ウォークカーソル + 適応マテリアライズしきい値。</li>
        <li><strong>v0.5.210</strong>：≥1 KBのブロブで遅延パースをデフォルトにフリップ。</li>
      </ul>
      <p>
        遅延テープが設計対象としていたワークロード（10kレコード、約1 MBのブロブ、中間的反復なしのparse → stringify）における結果：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">実装</th>
              <th className="text-right py-2 px-3">中央値 (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">ピークRSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perryの<strong>中央値75 ms</strong>は比較中で最速の動的型付けランタイムです ― Bun（259 ms）に勝ち、Node（394 ms）に勝ち、KotlinのサーバJIT（453 ms）に勝ちます。simdjsonの24 msはSIMDアクセラレートされたC++の上限であり、つまみ食い（cherry-pick）の裏に隠さず、意図的にページ上に存在します。Perryはそれには勝てません。ポイントはギャップを示すことで、それを閉じることに目標を持たせることです ― <code>docs/json-typed-parse-plan.md</code>で追跡されています。
      </p>
      <p>
        正直なコンパニオンベンチは<strong>parse-and-iterate</strong>です：同じブロブですが、各反復ですべてのレコードの<code>nested.x</code>を合計するので、遅延テープのマテリアライズが強制されます。そこではPerryは<strong>466 ms</strong>に着地します ― マーク・スイープのエスケープハッチの375 msより遅いのは、テープが償却できないオーバーヘッドを支払うからです。その行はTL;DR §Bにあります。作業を回避できないとき、遅延テープは振りをしません。
      </p>

      <h2>4. 書き直されたベンチマークページ</h2>
      <p>
        Perryがパフォーマンス数値を提示する方法について、3つのことが変わりました。
      </p>
      <p>
        <strong>RUNS=11 中央値 + p95 + σ + min + max、best-of-Nではない。</strong>Best-of-Nはテールレイテンシを静かに落とします；このハードウェアでは、9.4秒のPython <code>accumulate</code>外れ値とSwift JSONの5.3秒のp95スパイクを隠していました。中央値はテールをページに戻します。方法論の変更はv0.5.248で着地しました；TL;DR §Aと§Bのすべてのセルは<strong>2026-04-25</strong>時点でRUNS=11の最新版です。
      </p>
      <p>
        <strong>最適化プローブは本物のランタイムperfから分離されています。</strong>Perryが12〜34 msで、Rust/C++が98 msと示している5つのセル ― <code>loop_overhead</code>、<code>math_intensive</code>、<code>accumulate</code>、<code>array_read</code>、<code>array_write</code> ― はコンパイラフラグの姿勢を測っており、シリコンを測っているのではありません。今は独自のサブセクションにあり、上の段落で<code>clang++ -O3 -ffast-math</code>がそれらを1ミリ秒以内まで閉じることを説明しています。見出しの本物のランタイムカーネルは<code>loop_data_dependent</code>です：Perry 235 ms、Rust 229、Swift 233、Java 229、Bun 232 ― コンパイラが本当に作業を畳み込めないカーネルで、Perryはno-FMA-contractグループのど真ん中に座っています。それが正直な比較です。
      </p>
      <p>
        <strong>ピアが追加されました。</strong>simdjson（4.3.0）は両方のJSONテーブルにあります ― C++のパーススループットの上限で、読者がギャップを見られるようにページ上にあります。AssemblyScriptとjson-as（1.3.2）は最も近いインストール可能なTS-to-nativeのピアです；porfforはこのサイズのワークロードでsegfaultし、Static HermesはmacOS arm64ではインストールできませんでした。Kotlinとkotlinx.serializationはv0.5.241〜v0.5.242でJSONポリグロットに加わりました。すべての行は本物で、すべての免責事項はページ上にあります。
      </p>

      <h2>5. ポリグロット計算テーブル</h2>
      <p>
        v0.5.249での2026-04-25にリフレッシュされた、本物に折り畳めない見出しカーネル、RUNS=11中央値：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">ベンチマーク</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>fibonacci</code>では、Perryはコンパイル済みグループに3〜15 ms以内で並びます。JavaのHotSpot JITは再帰呼び出しのインライン化により約11%高速です。<code>loop_data_dependent</code>では、カーネルは2つのFP-contractクラスタに分かれます：約128 msのFMA-contractグループ（Goデフォルト、Apple Clangの<code>g++ -O3</code> ― どちらも<code>sum * a + b</code>を単一のFMADDDに融合）と、229〜235 msのno-contractグループ（Perry、Rustデフォルト、Swift、<code>-XX:+UseFMA</code>なしのJava、Bun）でスカラFMUL + FADDを実行。LLVMは<code>-ffp-contract=fast</code>でFMAグループに並びます；Perryはそれをデフォルトでは有効にしません。<code>nested_loops</code>はキャッシュバウンドであり、計算バウンドではありません；全員が8〜21 msに着地します。
      </p>

      <h2>6. 軽量なWindowsツールチェーン</h2>
      <p>
        WindowsユーザはVisual Studioのインストールが不要になりました。<strong>v0.5.199</strong>は<a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>を閉じました：<code>perry setup windows</code> + winget LLVM + xwinが、VS BuildToolsツリー全体を置き換えます。<code>v0.5.201</code>は<code>find_lld_link</code> / <code>find_perry_windows_sdk</code>のcfgゲートを取り除いたので、パス検出はWindowsをターゲットとするすべてのプラットフォームで機能します ― macOSホストだけではなく。
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. ランタイム正しさのパス</h2>
      <p>
        この期間のテーマ：V8/JSCからの静かなランタイム発散が、修正かコンパイルエラーのいずれかになりました。自明でないものは：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>：<code>BigInt.fromTwos</code>/<code>toTwos</code> 2の補数。</li>
        <li><strong>v0.5.263</strong>：<code>Promise.all</code>/<code>race</code>/<code>any</code>の非Promise型判別。</li>
        <li><strong>v0.5.281</strong>：<code>NaN==NaN</code> + ECMAScript数値フォーマット（<code>3 → &quot;3&quot;</code>であって<code>&quot;3.0&quot;</code>ではない；<code>-0 → &quot;0&quot;</code>；など）。</li>
        <li><strong>v0.5.280</strong>：<code>(x) | 0</code>での<code>NaN</code>/<code>Infinity</code>のToInt32強制。</li>
        <li><strong>v0.5.284</strong>：Promiseマイクロタスク FIFO + スロー済みハンドラの伝播。</li>
        <li><strong>v0.5.286</strong>：素のf64の<code>JSON.stringify</code>がテープパスでsegfaultしていました。</li>
        <li><strong>v0.5.277</strong>：<code>fs.readFileSync</code>はエンコーディングが渡されていないときBufferを返します（Nodeに一致）。</li>
        <li><strong>v0.5.272</strong>：チェーンされたクロスモジュールゲッターディスパッチが<code>undefined</code>を返していました。</li>
      </ul>
      <p>
        Issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a>のstdlibフォローアップが埋まりました：AsyncLocalStorageのエンドツーエンド（v0.5.261）、<code>.action()</code>を実際に呼び出すcommanderランタイム + codegen（v0.5.250）、decimal.jsコード（v0.5.259）、Redis ioredisのエンドツーエンド（v0.5.270）、pg + mongoのasync-factoryパターン（v0.5.275）、そしてEE/LRU/WSSの同じasync-factoryバグ（v0.5.252）。
      </p>
      <p>
        <code>perry/ui</code>側では：通知タップコールバック（#97）がApple（v0.5.254）とAndroid（v0.5.258）の両方で配線されました；ローカル通知のスケジュール + キャンセル（#96、v0.5.244）；AndroidでのFCMの登録 + 受信（v0.5.262）。
      </p>

      <h2>8. まとめ</h2>
      <p>
        この期間のパターンは見出し数値ではありません。既存の勝利を精査に耐えさせる作業です：持続的なアロケーションワークロードを捕捉する世代別GC、短い文字列のコストギャップを閉じるSSO、最も一般的なワークロードの「変更なし」構造を活用するJSONパイプライン、そしてbest-of-Nではなく中央値を測り、Perryの75 msと同じ行にsimdjsonの24 msのパース上限を表示するベンチマークページ。読者はギャップを見ることができます ― そしてPerryが床に対してどこに座るかを。
      </p>
      <p>
        試してみてください：
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        ソース：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}― ベンチマーク：<a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}― チェンジログ：<a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>― Ralph</p>
    </>
  );
}
