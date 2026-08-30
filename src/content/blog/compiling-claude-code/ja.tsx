export default function Content() {
  return (
    <>
      <p>
        6月16日、指示はたった一文でした。<em>&ldquo;claude code のフォルダを見つけて、そこにある（コンパイル済み、minify 済みの）javascript を持ってきて…コンパイルできるか試してみよう :D&rdquo;</em> 案の定「それは過酷だ」という反論が返ってくると、答えは本当のテーゼでした。<em>&ldquo;過酷だけど、それこそ本当の意味での実力試しであり壁チェックだから、やりたいんだ。限界を見つけるという点で、実世界のアプリに勝るものはない。&rdquo;</em>
      </p>
      <p>
        1か月後、Anthropic の Claude Code CLI を Perry でコンパイルしたバイナリは起動し、<code>/login</code> で OAuth フローを通し、API から本物のレスポンスをストリームし、入力した文字を描画するようになりました。そこに至るまでに <strong>6月20日から7月17日の間に160件のプルリクエストが Perry にマージ</strong>されました — no-op だった <code>MessageChannel</code>、RegExp ヘッダーに欠けていた GC の write barrier、本物の API に対してだけ空回りしモックでは決して起きなかった <code>continue</code> 文、そしてさらに約150件。
      </p>
      <p>
        この投稿はそのツアーです。他人の CLI をコンパイルすることが製品になるからではありません — このバイナリを出荷することはありませんし、今後もありません — そうではなく、これが私たちがこれまで Perry に向けてきた中で、最も生産的なバグ発見装置だからです。
      </p>

      <figure className="my-8">
        <img
          src="/blog/compiling-claude-code/claude-code-session.png"
          alt="/tmp/verify から Perry でコンパイルされた Claude Code バイナリを実行している macOS のターミナル。v2.1.112 のバナー、成功した /login、「awesome, who are you?」というプロンプト、ストリームされた返信、そしてシェルへのクリーンな終了が表示されている。"
          width={1708}
          height={926}
          className="w-full rounded-lg border border-slate-800"
        />
        <figcaption className="text-sm text-slate-400 mt-3">
          そのコマンドラインに <code>node</code> はありません。<code>/tmp/verify/cc_fptest_dbg25</code> は、出荷された <code>cli.js</code> から <code>perry compile</code> によって生成された単一のネイティブ実行ファイルです — ログインし、本物の回答をストリームし、Ctrl-C でクリーンに終了しています。ファイル名がその疑問を誘うので説明しておくと、<code>dbg25</code> は、これを書いている時点でまだ進行中の GC 調査の診断シリーズの25番目のビルドです — デバッグシンボル付き、さらに write-barrier のエリジョンをオフにして<em>すべての</em>配列ストアがバリアを発行するようにしています。通常のビルドより、オーバーヘッドは少ないどころかむしろ多いのです。この先の性能表は、別の、計測用の仕込みがないバイナリで計測したものです。
        </figcaption>
      </figure>

      <h2>「Claude Code をコンパイルする」とは実際どういうことか</h2>
      <p>
        対象は npm が出荷する成果物です。<code>npm pack @anthropic-ai/claude-code@2.1.112</code> を実行すると <code>cli.js</code> が手に入ります。<strong>13 MB の minify 済み、自己実行型の JavaScript</strong> で、<code>#!/usr/bin/env node</code> という shebang が付いています。ソースもソースマップもなく、私たち側のビルドステップもありません。私たちはそのファイルを一切変更せずに <code>perry compile</code> にかけ、ネイティブ実行ファイルを要求します。
      </p>
      <p>
        Perry はそれを約37分かけて処理し、<strong>16,023個の関数</strong>にわたっておよそ207 MBの IR を生成し、それらは約180 MBのバイナリにリンクされます。それらの関数はどれも1文字の名前しか持たず、型注釈もなく、しかも全体が ahead-of-time で動作しなければなりません — JIT はなく、<code>eval</code> もなく、コンパイラの推測が外れたときにインタプリタへ遅延フォールバックする仕組みもありません。もし Perry が16,023個の関数のうち1つでも誤って lower してしまったら、それを捕まえるものは何もありません。
      </p>
      <p>
        スコアリングの段階は私たちの社内ストレススイートから来ていて、意図的に容赦のないものになっています：
      </p>
      <pre><code>{`parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types`}</code></pre>
      <p>
        <code>correct</code> だけが意味を持つ層です。Node v26 がオラクルであり、Node が出力するものとバイト単位で一致しないものは、そうではないと証明されるまでは Perry のバグです。
      </p>

      <h2>なぜこのアプリだったのか</h2>
      <p>
        コーディングエージェントの CLI は、ahead-of-time でコンパイルするには異例なほど手強い JavaScript の塊です。1つのバイナリの中に、Ink を通してターミナルへ reconcile する React、raw モードの stdin リーダー、毎フレーム正規表現を走らせる ANSI/絵文字だらけのレンダラー、ストリーミング SSE の HTTP クライアント、起動時に構築される zod スキーマ、OAuth フロー、<code>worker_threads</code>、マクロタスクスケジューラとして使われる <code>MessageChannel</code>、fiber の状態を保持する WeakMap、動的な <code>require</code>、そしてファイルディスクリプタ経由で stdout に書き込むファイルシステム層が詰め込まれています。
      </p>
      <p>
        それぞれが Perry の異なるサブシステムに対応していて、このアプリはそれらを、規模を伴い GC の圧力の下で、数分間にわたって<em>同時に</em>酷使します。私たち自身のテストスイート — 3,000のRustユニットテスト、数千のTypeScriptリグレッションプログラム、Node API 互換性マトリクス、test262 — はすべて既知の挙動を固定することに向けられています。このバンドルは、誰も固定しようと思ったことすらない挙動を見つけることに向いています。
      </p>

      <h2>壁の連鎖</h2>
      <p>
        作業は一方向にしか進みませんでした。今の壁を越え、次の壁を見つける。それを圧縮すると：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">日付</th>
              <th className="text-left py-2 px-3">マイルストーン</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6月21日</td><td className="py-2 px-3"><code>--help</code> がネイティブに実行され、終了コードは0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6月22日</td><td className="py-2 px-3">実際のサブコマンドが起動時にハングしなくなる</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6月23日</td><td className="py-2 px-3"><code>-p</code> が api.anthropic.com への ESTABLISHED な TCP ソケットを開く</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6月24日</td><td className="py-2 px-3">zod スキーマが正しく構築され、認証パスに到達</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6月27日</td><td className="py-2 px-3">TUI がレンダリングされる — ロゴ、ウェルカムボックス、入力フレーム</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7月9日</td><td className="py-2 px-3">初めての完全な往復: 本物の API に対する <code>-p</code> が返信を出力し、終了コード0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7月10日</td><td className="py-2 px-3">Node と Perry の差分ハーネス: 12/12 が一致</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7月13日</td><td className="py-2 px-3"><code>-p</code> のテキスト + JSON、TUI のレンダリング、ファイルシステムで Node とバイト単位で一致</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7月16日</td><td className="py-2 px-3">入力した文字がついに入力行に表示されるようになる</td></tr>
            <tr><td className="py-2 px-3">7月17日</td><td className="py-2 px-3">手作業でループ全体を検証: 起動 → <code>/login</code> → API のレスポンス → 入力</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        すべての修正は、最小限で一般的な再現手順を添えた独立したプルリクエストとして upstream に送られました。どれも、由来元のアプリには言及していません — それは初日からのルールでした。changelog を読む Perry ユーザーの目に映るのは「for-await ドライバの <code>continue</code> がイテレータの advance をスキップしていた」であって、「誰かの CLI をコンパイルしようとしていた」ではありません。バグは、それを表面化させた乗り物とは無関係に、実在するものです。
      </p>

      <h2>紹介する価値のある5つのバグ</h2>

      <h3>1. MessageChannel は行儀のいい no-op だった</h3>
      <p>
        <code>--help</code> は6月21日に動くようになりました。<em>本物の</em>サブコマンド — <code>doctor</code>、<code>agents</code>、<code>mcp list</code> — はどれも永遠にハングしました。busy 状態ではなく、<code>sample</code> ではプロセスが停止したまま park しているのが見え、<code>lsof</code> は子プロセスなし、ソケットなし、パイプが2本あるだけでした。
      </p>
      <p>
        Perry の <code>MessageChannel</code> は <code>postMessage</code> を no-op として、<code>onmessage</code> を <code>null</code> としてインストールしていました。それは、メッセージチャンネルをマクロタスクスケジューラとして使う React スケジューラのパターンに出会うまでは無害です：
      </p>
      <pre><code>{`const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick`}</code></pre>
      <p>
        メッセージは捨てられ、コールバックは一度も実行されず、イベントループは自分自身の wakeup パイプの上で永遠にアイドルし続けました。<a href="https://github.com/PerryTS/perry/pull/5530" className="text-amber-400 hover:text-amber-300">#5530</a> は、ポートに本物の同一スレッド内配送を与えました — エンタングルされたペア、FIFO キュー、<code>setImmediate</code> のマクロタスクを介した配送、そしてキューに入ったメッセージがコレクションを生き延びられるようにする GC のルートスキャナです。
      </p>

      <h3>2. Object.prototype 上のアクセサ1つが42秒のコストになった</h3>
      <p>
        ハングする前は、同じサブコマンドが数十秒間 CPU バウンドになっていました。プロファイリングは汎用の <code>[[Set]]</code> パスを指しており、根本原因はプロセスグローバルなフラグでした。
      </p>
      <p>
        Perry には動的なプロパティ書き込みのための高速パスがあり、「<code>Object.prototype</code> は現在何らかのディスクリプタを持っているか?」という条件でゲートされています。このバンドルは起動時に <code>Object.prototype</code> にちょうど1つのアクセサをインストールします。それによりフラグはプロセス全体で反転し、以降はプログラム内の<em>すべての</em>動的な書き込みが O(own-key-count) の遅い割り込みウォークを取るようになりました。幅の広いオブジェクトを構築する処理は二次時間になりました：
      </p>
      <pre><code>{`20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms`}</code></pre>
      <p>
        <a href="https://github.com/PerryTS/perry/pull/5524" className="text-amber-400 hover:text-amber-300">#5524</a> は、グローバルなフラグをキーごとの問いに置き換えました — <em><code>Object.prototype</code> は<strong>この</strong>キーに対する own プロパティを持っているか?</em> というものです。存在しないキーは割り込まれようがないので、その書き込みは高速パスにしても安全です。42 s → 23 ms、しかも割り込みは依然として正しく動作します。
      </p>
      <p>
        その後、同じ形状がクラスインスタンスに対して再び現れました。高速パスはそれを完全に除外していたのです。20,000キーのビルドは、プレーンオブジェクトでは25 msだったのに対し、<code>class</code> インスタンスでは44秒かかりました。この修正を丁寧に行うことには意味がありました — 素朴なプロトタイプチェーンのチェックでは継承された setter を見落とし、データを黙って破損させていたはずだからです — そこで <a href="https://github.com/PerryTS/perry/pull/5528" className="text-amber-400 hover:text-amber-300">#5528</a> は、クラスレジストリを通じてインスタンスのプロトタイプを解決し、O(1) の wide-key インデックスを追加しました。30 msに戻り、再び線形になりました。
      </p>

      <h3>3. 本物の API でしか再現しないバグ</h3>
      <p>
        これは私たちが人に話したがるバグです。7月初旬までに、コンパイル済みバイナリは私たちのローカルモックサーバーに対して完全な <code>-p</code> のやり取りをこなせるようになっていました — 接続、POST、SSE ストリームの読み取り、返信の出力、終了コード0。しかし実際の Anthropic API に対しては、毎回、永遠にハングしました。
      </p>
      <p>
        デバッグの連鎖はこうでした：フォワードプロキシのモックが、完全な200レスポンスが無傷で届いていることを証明する → キャプチャした本物のバイトストリームを与えたリプレイモックが、ローカルでハングを再現する → SSE イベントリストを二分探索して原因のイベントを見つける → 10行の再現コード。
      </p>
      <p>
        本物の API は <code>event: ping</code> フレームを送ってきます。私たちのモックは一度もそれを送りませんでした。そして <code>ping</code> は、SDK のストリームループが素の <code>continue</code> でスキップする唯一のイベントです。Perry は <code>for await</code> を、イテレータの advance がループ本体の<em>末尾</em>にあるドライバへと lower していました：
      </p>
      <pre><code>{`// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}`}</code></pre>
      <p>
        6つの別々の lowering 箇所が、同じ形状を持っていました。<a href="https://github.com/PerryTS/perry/pull/6196" className="text-amber-400 hover:text-amber-300">#6196</a> は、そのすべてで advance を先頭に移動しました。私たちが何度も学び直す教訓はこうです：パスするモックは、モックについての証拠でしかない。
      </p>

      <h3>4. 自分自身のパターン文字列より長生きした正規表現</h3>
      <p>
        TUI はレンダリングされたあと、数秒以内に <code>SIGBUS</code> で死にました — ウィンドウリサイズのストレスハーネスの下で、12回の実行中12回クラッシュし、しかも毎回異なる関数の異なるアドレスでした。調査の何週間もが、A/Bテストによって後に反証される GC の仮説につぎ込まれ、その中には不健全だと判明して撤回せざるを得なかった、私たち自身の「修正」の1つも含まれていました。
      </p>
      <p>
        実際の根本原因は、Rust のコード4行でした。<code>js_regexp_new</code> は RegExp のヘッダーをアロケートし、その <code>pattern</code> と <code>flags</code> の文字列ポインタを生の書き込みで格納します — <strong>write barrier なしで</strong>。old 世代のオブジェクトが、生まれたての young な文字列を指しているのに、コレクタはそのエッジについて一度も知らされません。マイナー GC はそれらの文字列を、生きている RegExp の足元から掃き出してしまい、次に解放済みスロットを読んだときにフォールトしました。
      </p>
      <p>
        なぜこれがここでしか現れなかったのか? ターミナル UI は正規表現だらけだからです — ANSI のパースと絵文字の幅の計測が、毎フレームパターンを走らせます — そのため、アロケーションとコレクションの間のウィンドウが1分間に何千回も横切られます。私たちの最小再現コード、6,000個の正規表現に意図的なアロケーションの churn を加えたものは、<em>一度も</em>これを引き起こしませんでした。バンドルは毎回それを引き起こしました。<a href="https://github.com/PerryTS/perry/pull/6288" className="text-amber-400 hover:text-amber-300">#6288</a> は、両方のフィールドがずっと必要としていたバリアを追加しました。
      </p>

      <h3>5. 入力した文字は確かにそこにあった。フレームがそれを捨てていた。</h3>
      <p>
        最も頑固な壁でした。UI 全体は完璧に描画されていました — ウェルカムボックス、入力フレーム、カーソルブロック、ステータスライン。<code>/</code> を入力するとコマンドメニューが開いたので、キー入力は React に届いていました。しかし文字が入力行に表示されることは決してありませんでした。
      </p>
      <p>
        計測用の仕込みを入れたビルドでは、Perry がすべての段階で入力文字を正しく描画したあと、<code>onRender</code> が描画の<em>後で</em>例外を投げていることが分かりました — それを Ink の <code>try/catch</code> が飲み込んでいたのです。フレームはコミットされる前に破棄され、その後のすべてのレンダリングは空のフレームの上に積み重なりました。アプリは、あなたを無視しながら、完全に健全に見えていたのです。
      </p>
      <p>
        その1つの症状の裏には、2つの独立したバグが隠れていました：
      </p>
      <ul>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6453" className="text-amber-400 hover:text-amber-300">#6453</a> — Perry のインライン化された <code>charAt</code>/<code>codePointAt</code>/<code>split</code> の lowering は、必要な coercibility ガードなしに、文字列でない receiver に対して ToString を呼び出していました。そのため <code>undefined.codePointAt(0)</code> は、例外を投げる代わりに、静かに <code>117</code> を返していました — 文字列 <code>&quot;undefined&quot;</code> の <code>&quot;u&quot;</code> のコードポイントです。もっともらしいデータを<em>でっち上げる</em>バグは、クラッシュするバグよりもはるかに悪いものです。
          </p>
        </li>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6471" className="text-amber-400 hover:text-amber-300">#6471</a> — こちらが本当のブロッカーでした。配列が成長するとき、Perry は古いアドレスに恒久的な転送用スタブを残します。マイナーのスイープは、old 世代の親がまだそのスタブの1つを指しているのに、それらのスタブを回収していました。レンダラーの文字キャッシュが、dirty になっていないページ上の、成長前のポインタを保持していたのです。古びたスタブ越しに読むとガベージな length が生成され、すべてのフレームが中断していました。マイナーは現在すべてのスタブを保持するようになり、フルトレースはマークによってそれらを回収します。
          </p>
        </li>
      </ul>
      <p>
        それらを修正すると、第3の層が露わになりました — インクリメンタルマーキング中に black で生まれたオブジェクトは一度もトレースされておらず、それらを通してしか到達できないものは生きたまま掃かれてしまっていました（<a href="https://github.com/PerryTS/perry/pull/6494" className="text-amber-400 hover:text-amber-300">#6494</a>）。また、レイアウトマスクがオーバーフロースロットを過少に報告していたため、コレクタがそれらをスキップしていました（<a href="https://github.com/PerryTS/perry/pull/6506" className="text-amber-400 hover:text-amber-300">#6506</a>）。この2つは、コンパイルされた<em>あらゆる</em>プログラムで50回に1回の謎のクラッシュを生むタイプの健全性の穴です。テストスイートでは、これらを見つけられなかったでしょう。
      </p>

      <h2>13 MB の minify 済みバイナリをどうデバッグするか</h2>
      <p>
        上記のどれも、コードを読むだけでは見つけられません。それを扱えるものにしたツール群です：
      </p>
      <ul>
        <li>
          <p>
            <strong>Node をオラクルとする差分ハーネス。</strong> あらゆる仮説は小さな TypeScript プログラムになり、<code>node --experimental-strip-types</code> と Perry のバイナリの両方の下で実行され、バイト単位で比較されます。それ自体でもバグを見つけました — <code>instanceof</code> の右辺としてのみ使われるクラス式が、11個の解析パスがそのノード型を見通せなかったために dead-code-eliminate されていたのです（<a href="https://github.com/PerryTS/perry/pull/6245" className="text-amber-400 hover:text-amber-300">#6245</a>）。
          </p>
        </li>
        <li>
          <p>
            <strong>3つのモック API サーバー。</strong> ロギング用のモック、本物のレスポンスのバイトをキャプチャするフォワードプロキシ、そしてそのバイトをそのまま決定論的に返すリプレイサーバーです。「本番に対してハングする」をローカルでの再現に変えたのは、このリプレイサーバーでした。
          </p>
        </li>
        <li>
          <p>
            <strong>ターミナルの問い合わせに応答する PTY ハーネス。</strong> 何もしない疑似端末では、50バイトとストールしか得られません。このアプリはカーソル位置（<code>ESC[6n</code>）、デバイス属性（<code>ESC[c</code>）、背景色（<code>OSC 11</code>）を問い合わせ、描画する前に応答を待ちます。それらに答えてやれば、完全な3,331バイトのウェルカム画面が得られます — そして Node と Perry の間でバイト単位で比較可能なレンダリングも。
          </p>
        </li>
        <li>
          <p>
            <strong>シンボル化のためのリンクマップ。</strong> strip された180 MBのバイナリは、生のオフセットだらけのクラッシュレポートを生成します。<code>ld64 -map</code> の出力に二分探索スクリプトを組み合わせることで、それらを関数名に戻せます。
          </p>
        </li>
        <li>
          <p>
            <strong>すべてを A/B する。</strong> 生まれてきたルールは、引き継ぎメモの冒頭に大文字で書かれています — <em>理論を鵜呑みにするな、検証しろ。</em> 1つのバグに対する4つの連続した根本原因の仮説は、それぞれ A/B の実行によって反証されました。何日も追いかけた1つの検証シグナル（「445個の old→young エッジの欠落」）は、測定上のアーティファクトだと判明しました — そのチェックは、remembered set をクリアしてから復元するまでの間に実行されていたのです。コード自身のコメントが、それについて警告していました。
          </p>
        </li>
      </ul>

      <h2>実際のところ、今どうなっているか</h2>
      <p>
        正直に言うと、動きますし、遅いです。
      </p>
      <p>
        現時点で動作していて、出力が比較可能な範囲では Node とバイト単位で一致しているもの — 起動、<code>--help</code>、<code>--version</code>、エラー分類と JSON エンベロープを含む本物の API に対するワンショットの <code>-p</code> モード、TUI の完全なレンダリング、OAuth の <code>/login</code> フロー、ストリーミングレスポンス、そして入力です。ループ全体をワンテイクで — 起動、<code>/login</code>、質問、ストリームされた回答、終了：
      </p>

      <figure className="my-8">
        <video
          controls
          playsInline
          preload="none"
          poster="/blog/compiling-claude-code/claude-code-demo-poster.png"
          className="w-full rounded-lg border border-slate-800"
        >
          <source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4" />
          お使いのブラウザは埋め込み動画に対応していません。
        </video>
        <figcaption className="text-sm text-slate-400 mt-3">
          63秒、音声なし、2箇所をカット — OAuth ハンドシェイクのブラウザ側の部分と、脈絡のない macOS キーチェーンのプロンプトです。ターミナル内のものはすべてリアルタイムで無編集です — この投稿の中で最も遅いものである起動の遅延も含めて。
        </figcaption>
      </figure>

      <p>
        まだ未解決なことが2つあり、それらは実は1つのことかもしれません。持続的な対話的使用をおよそ1分続けると、入力が反応しなくなります — クラッシュもエラーもなく、ただ止まるのです。そして <code>Ctrl-C</code> は今ではクリーンに終了するようになりました（1週間前はそうではありませんでした。これが録画の最後に見える終了です）が、<code>ESC</code> は実行中のレスポンスを中断しません。割り込みパスが動かないのに終了パスは動くという事実は、アプリ自身のハンドラの何かがおかしいというより、キー入力イベントがアプリに届かなくなるという、入力が死ぬ現象と同じ容疑者を指しています。
      </p>
      <p>
        パフォーマンスの全体像です。同一のバンドルを実行する Node と比較して、正しさが達成された当日に始まった速度改善キャンペーンの最初のラウンドの前後で計測しました。これらは7月17日の <code>cc_final</code> と <code>cc_perf2</code> から得たものです — 上のスクリーンショットにあるような計測用の仕込み入りバイナリではなく、診断機能を組み込んでいない通常のビルドです：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">指標</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Perry（7月17日）</th>
              <th className="text-right py-2 px-3">Perry（改善後）</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--version</code></td><td className="text-right py-2 px-3">328 ms</td><td className="text-right py-2 px-3">1,168 ms</td><td className="text-right py-2 px-3"><strong>227 ms</strong></td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--help</code></td><td className="text-right py-2 px-3">715 ms</td><td className="text-right py-2 px-3">5,071 ms</td><td className="text-right py-2 px-3">4,099 ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">TUI の初回描画</td><td className="text-right py-2 px-3">0.76 s</td><td className="text-right py-2 px-3">10.9 s</td><td className="text-right py-2 px-3">8.4 s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">キー入力 → 描画（p50）</td><td className="text-right py-2 px-3">2.2 ms</td><td className="text-right py-2 px-3">111–143 ms</td><td className="text-right py-2 px-3">119–138 ms</td></tr>
            <tr><td className="py-2 px-3">メモリフットプリント（アイドル時）</td><td className="text-right py-2 px-3">290 MBで横ばい</td><td className="text-right py-2 px-3">~420 MBで増加中</td><td className="text-right py-2 px-3">~420 MBで増加中</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>--version</code> は今や<strong>Node を上回っています</strong>が、その勝因は出どころが恥ずかしいものでした — コンパイルされた実行ファイルは300,281個のシンボルをエクスポートしていて、その起動時間の~80%は dyld が weak-definition の coalescing をしている時間だったのです。リンカのフラグを1つ変えるだけでエクスポート数は3個になり、バイナリは228 MBから197 MBになりました（<a href="https://github.com/PerryTS/perry/pull/6533" className="text-amber-400 hover:text-amber-300">#6533</a>）。それぞれのユニークな正規表現を2回ではなく1回だけビルドするようにしたこと（<a href="https://github.com/PerryTS/perry/pull/6534" className="text-amber-400 hover:text-amber-300">#6534</a>）と、store ごとの割り込みチェックをキャッシュしたこと（<a href="https://github.com/PerryTS/perry/pull/6532" className="text-amber-400 hover:text-amber-300">#6532</a>、<a href="https://github.com/PerryTS/perry/pull/6541" className="text-amber-400 hover:text-amber-300">#6541</a>）が残りを片付けました。
      </p>
      <p>
        その197 MBについて、誰かがそれを先頭に持ち出す前に言っておくと — Perry は自分自身のランタイムを静的にリンクし、16,023個すべての関数のマシンコードを ahead-of-time で出力していて、dead-strip できるものがありません。自己実行型のバンドルは基本的にすべてが到達可能になるため、頼れるようなクロスバンドルの DCE がないのです — つまり197 MBというのは、プログラム全体<em>に加えて</em>そのランタイムが1つのファイルに入っているということであり、それに対して <strong>Node v26 のバイナリは、あなたの JavaScript を1行も読む前に138 MBの重さがあります</strong>。
      </p>
      <p>
        キー入力の行は注意して読むべきものです。「改善後」の数値が悪化しているように見えるからです。しかし実際には悪化していません — これらは繰り返し実行した際の範囲であり、重なり合っているので、中央値はどちらの方向にも動いていません。それは回帰ではなく、実行ごとのばらつきです。そしてこれは、私たちが予想していたとおりのことでもあります。3つの変更はすべて、リンクのステップ、正規表現の構築、そして<em>store</em>パスに触れるものでした。キー入力の中央値を支配しているのは、プロパティの<em>read</em>パス、呼び出しごとの rooting のオーバーヘッド、そしてキー入力のウィンドウの中に落ちる40–80 msの GC ステップです。その証拠は次のラウンドで得られました — get/set の高速レーンはフィールドアクセスのマイクロベンチマークを3×速くしましたが、この数値はまったく動きませんでした（<a href="https://github.com/PerryTS/perry/pull/6539" className="text-amber-400 hover:text-amber-300">#6539</a>）。アプリに現れないマイクロベンチマークの勝利は誤った診断であり、私たちはまさにそれをやってしまっていました。
      </p>
      <p>
        メモリの行は現在進行中のキャンペーンです。Perry のコピー型コレクタはコンパクションを<em>行うことができます</em> — 問題は、それがアイドル状態でおよそ45秒に1回しか発動可能にならないことで、そのため発動と発動の間に nursery が ~300 MBまで再び膨らむ一方、Node は継続的にコンパクションすることでフラットなままでいることです。これはアルゴリズムの問題ではなく、トリガーの頻度の問題であり、6月に私たちがいた場所よりもずっとましな場所です。
      </p>
      <p>
        そのどれも棚上げにはなっていません。この投稿が公開される時点でも、メモリとパフォーマンスのキャンペーンは<em>進行中</em>です — GC のトリガーに関する作業は、まさにこのバイナリの上で、今日も進められています — なので、上の性能表はこの投稿の中で私たちが最も無効化されることを期待している部分であり、それは早ければ早いほど良いのです。正しさを達成するには1か月分の壁が必要でした。残っているのはトリガー頻度の問題と read パスの問題で、どちらも原因は理解されていて、どちらもすでに対応が進行中です。私たちはこれが、単に正しいだけでなく、滑らかに感じられるようになると予想していますし、それも近いうちだと予想しています。
      </p>

      <h2>なぜ私たちはこれをやるのか</h2>
      <p>
        160件の修正のどれ1つとして、Claude Code についてのものではありません。RegExp ヘッダーの write barrier の欠落は、負荷の下で正規表現を構築する<em>あらゆる</em>プログラムのメモリを破損させます。<code>continue</code> を伴う <code>for await</code> は、あらゆるストリームの消費者の中で空回りします。<code>MessageChannel</code> がメッセージを取りこぼすことは、React スケジューラの形をしたあらゆるアプリを壊します。<code>Object.prototype</code> のディスクリプタフラグは、<code>Object.prototype</code> に触れる<em>あらゆる</em>プログラムを、その最も幅の広いオブジェクトにおいて二次時間にしていました。
      </p>
      <p>
        それらのバグはすべて、CI が green である間も、test262 の数値が上がっていく間も、Node 互換性マトリクスが97%と言っている間も、ずっと Perry の中に潜んでいました。それらを揺さぶり出すのに必要だったのは、誰か他人の13メガバイトの minify された JavaScript が、本物のターミナルの中で本物の API に対して本物の仕事をすることでした。
      </p>
      <p>
        もう1つあります。私たちが一番面白いと思っている部分です。Perry は手作業だけで書かれているわけではありません — その多くが、<em>この</em>キャンペーンの多くを含めて、Claude Code とともに書かれました。モックサーバー、PTY ハーネス、差分ランナー、朝の4時までかかった GC バグの二分探索の長い夜 — これらはエージェントセッションであり、人間によってレビューされ、マージされました。Perry のすべてがそうというわけではありませんし、多くの議論なしにというわけでもありません。しかし、この一文が両方向で真であると言えるだけの十分な量ではあります。
      </p>
      <p>
        Claude Code を食べたコンパイラは、その相当な部分が、Claude Code によって作られたものでした。
      </p>
      <p>
        私たちはこれを続けていきます。次のターゲットはすでにキューに入っています。
      </p>

      <hr className="border-slate-800 my-8" />
      <p className="text-sm text-slate-500">
        Perry は Anthropic と提携しておらず、Anthropic の支持を受けているものでもありません。Claude Code は Anthropic PBC の商標です。ここで説明されているバイナリは、公開されている npm パッケージから、純粋にコンパイラのテスト対象として構築されたものであり、配布されていません。
      </p>
    </>
  );
}
