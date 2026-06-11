export default function Content() {
  return (
    <>
      <p>
        数週間前、<a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> 氏（X では @axt_ayakoto）が、AtCoder の問題 ABC451D「Concat Power of 2」で <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">Perry を Deno と Bun と比較したベンチマーク</a> を公開しました。彼の計測：Perry は <strong>Bun より 3.85× 遅い</strong>。彼の結論は丁寧ながらも明確でした — Perry は競技プログラミングのランタイムとして使える状態ではなく、成熟しても使えるようにはならないかもしれない、と。
      </p>
      <p>
        彼にはフォローアップを返すべきでしょう。同じベンチマーク、同じ <code>hyperfine</code> コマンド、同じマシンクラスで、私たちが到達したところを示します：
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        このギャップを埋める作業は、誤った仮説から始まり、現実の、しかし意図的な GC アーキテクチャのトレードオフを見つけ、書く価値があると思える結果を生んだ調査でした — 追いついたからではなく、プロファイリング下でそのトレードオフがどう見えたか、それ自体が興味深いからです。
      </p>

      <h2>ベンチマーク</h2>
      <p>
        aya_koto 氏の <code>abc451d-perry.ts</code> は、2 のべき乗の文字列を連結したものに対して再帰的な深さ優先探索を行い、<code>Set&lt;number&gt;</code> で重複を除去してソートします。ホット関数は短いものです：
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}`}</code></pre>
      <p>
        この形がストーリーそのものです。呼び出しのたびに新しい <code>string[]</code> をアロケートします。再帰は深く — 最上位での分岐係数はおよそ 30 まで — そして各親フレームは、子の配列をイテレートして自分自身に push している間、自分の <code>answers</code> 配列をライブに保ち続けます。短命なアロケーション、深い再帰、すべてのアクティブなアリーナブロックに散らばったライブ参照。これがまさに、Perry の GC が <em>チューニングされていなかった</em> ワークロードだったのです。
      </p>

      <h2>誤った仮説</h2>
      <p>
        ある読者が aya_koto 氏の記事に脚注を残していて、Perry の BigInt が内部的には固定長 1024 ビット整数であり、BigInt を多用するプログラムは Bun よりおよそ 4× 遅い、と指摘していました。ABC451D は 2 のべき乗を扱う — 大きな数値があり得そうに思えた — ので、最初の直感はこうでした：BigInt が犯人だ、BigInt のパスを直せばギャップは埋まる。
      </p>
      <p>
        そうではありませんでした。<code>grep -i bigint abc451d-perry.ts</code> は何も返しませんでした。このベンチマークは全体を通して <code>number</code> を使っていて、どの値も余裕で 2^53 未満に収まります。BigInt の脚注は正しく、現実で、直す価値のある問題でした — そして実際、私たちは v0.5.736 で別途それを修正しました。しかしそれは ABC451D とは何の関係もありませんでした。
      </p>
      <p>
        誤った仮説を最初に追いかけたコストはおよそ 1 日。教訓は — すでに知っていたと主張したいところですが — こうです：理論にコミットする前にプロファイルを取ること、たとえその理論が信頼できる情報源から来ていて、自分の事前知識と一致していてもなお。特に、そういうときこそ。
      </p>

      <h2>ベンチの再現</h2>
      <p>
        BigInt の追跡をやめてまず最初にやったのは、aya_koto 氏の数値をきれいに再現することでした。彼の Perry の値 1.219 s 近くに着地すると期待していました。私たちは Perry v0.5.729 で <strong>2.998 s</strong> に着地しました。
      </p>
      <p>
        これは、彼がテストしたバージョンと当時の私たちの main との間で 2.5× のリグレッションです。Deno と Bun は彼の数値の 50% 以内で再現しました（ハードウェアの違い、バージョンのドリフト）。Perry のギャップは、誰も見ていない間に 3.85× から 6.59× に広がっていたのです。
      </p>
      <p>
        どのコミットがリグレッションを引き起こしたかは二分探索しませんでした — それはこの調査の範囲を超えていました。しかし、このドリフトを捕まえたであろう CI のガードレールが存在しなかったこと自体が 1 つの発見であり、最後にそこへ戻ってきます。
      </p>

      <h2>プロファイル駆動の診断</h2>
      <p>
        <code>PERRY_DEBUG_SYMBOLS=1</code> でコンパイルし、<code>samply</code> で記録すると、self-time の絵は明白でした：
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>self time の 76% が GC の機構でした。</strong> inclusive time も同意していました：<code>gc_collect_minor</code> が 80%、<code>Arena::alloc</code> が 76%、<code>js_array_alloc</code> が 45%、<code>js_array_push_f64</code> が 22%。再帰的な <code>search()</code> はホットでしたが、それは GC のマークフェーズの下でホットだったのです。各呼び出しが、コレクションを引き起こすのに十分なアロケーションをトリガーしていました。
      </p>
      <p>
        ネガティブコントロールのマイクロベンチマークが、この鈍化が一般的なものではないことを確認しました。タイトな整数の <code>fib(80) × 100_000</code>、アロケーションなし：Perry <strong>6.1 ms</strong> 対 Bun <strong>24.7 ms</strong> — Perry が 4× 速い。アロケーションを伴わないホットループの codegen は、すでに Bun を上回っていました。ABC451D のギャップは、1 つの特定のコードパスに集中していました：アロケーションのスループットと、この特定のアロケーション形状に対する GC のマーク&スイープです。
      </p>

      <h2>決定的証拠</h2>
      <p>
        私たちには 1 つのフラグがありました — <code>PERRY_GC_DIAG=1</code> — これはサイクルごとの GC 統計を出力します。その出力こそ、調査全体の中で最も重要な観測でした：
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        どのサイクルも、同じパターン。スイープは、<strong>アロケートされたオブジェクトの 55〜60% がデッドである</strong> ことを正しく識別していました。そしてアリーナは <strong>ブロックを 1 つも回収していません</strong>でした。ヒープは実行を通じて単調に増大し、その一方で GC は常に拡大していくワーキングセットに対してマーク&スイープのコストを払い続けていたのです。
      </p>
      <p>
        オブジェクトの半数以上がデッドであるにもかかわらず、なぜ <code>block_reclaim=0</code> なのか？ それは、Perry のアリーナ GC がブロック粒度で回収するからです。1 MB のブロックは、その中のすべてのオブジェクトがデッドになって初めてリセットされます。ABC451D では、再帰的な <code>search()</code> がライブ参照 — 親フレームの <code>answers</code> 配列 — をすべてのアクティブなブロックに散らばらせたまま保持します。完全にデッドになるブロックは決して現れません。マーク&スイープはデッドオブジェクトを正しく識別しますが、オブジェクト単位の回収パスを持たないため、それらに対して何もしません。ヒープは増大し、GC のトリガーはトレッドミルの上で発火し続け、ワーキングセットが膨らむにつれて各サイクルのコストが上昇していきます。
      </p>

      <h2>意図的なトレードオフ</h2>
      <p>
        私たちが見つけた最も示唆に富むものは、プロファイルの中にはありませんでした。それはスイープそのものの中、<code>crates/perry-runtime/src/gc.rs:2733</code> に、設計を説明するコメントとしてありました：
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        私たちは意図的に、デッドオブジェクトをグローバルな ARENA_FREE_LIST に push しません。インラインのバンプアロケータはフリーリストを決して読まず — 代わりにブロックごとのリセットを使います。デッドオブジェクトをフリーリストに push することは、オブジェクトあたり約 50ns × GC あたり約 700k オブジェクト × ベンチマークあたり約 12 GC サイクル = <code>object_create</code> における 420ms の純粋な無駄になります。
      </blockquote>
      <p>
        これは、それがチューニングされたワークロードに対しては完全に正しいのです。<code>object_create</code> は私たちが重視するベンチマークで、そこではアロケーションがタイトなループの中で死に、サイクルの間にブロック全体が空になります。オブジェクト単位のフリーリストパスを追加することは、そのワークロードに対して 420 ms の無意味な簿記を燃やすことになり、ブロックリセットのパスが同じメモリをより安価に回収します。
      </p>
      <p>
        それは ABC451D の形状には不向きです。そこではライブ参照が散らばったままになり、ブロックリセットは決して発火しません。アーキテクチャには意図的なトレードオフがエンコードされていて、私たちはそのトレードオフが裏目に出るケースをベンチマークしたことがなかったのです。
      </p>
      <p>
        それが本当の教訓です。GC は壊れていませんでした。それは、aya_koto 氏のベンチが代表するものとは異なるアロケーションパターンの分布に対してチューニングされていただけで、チューニングされた分布が現実のワークロードのあるクラス — 再帰探索、ツリーウォーク、スタックのあらゆるレベルでライブ状態を保持しながらその下で短命なアロケーションを行うあらゆるもの — を除外していたことに、私たちは気づいていなかったのです。
      </p>

      <h2>うまくいかなかったこと</h2>
      <p>
        本当の修正にたどり着く前に、もっともらしく見えるレバーのいくつかが、間違ったレバーであることが判明しました。これらを数値とともに報告するのは、それらが調査のうちより興味深い半分だったからです：
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry にはすでにオプトインのコピー退避パスがありました。ABC451D に対してそれをオンにすると：<strong>11.4 秒</strong>、ベースラインより 4 倍遅い。このパスは有用かどうかにかかわらず毎サイクル実行され、ライブセットが小さく短命なオブジェクトであるときには、オブジェクト単位のコピーと参照の書き換えのコストが破滅的になります。恩恵を受けるワークロードのために残す価値はありますが、ここでの答えではありません。</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong>（世代別ではなくフルのマーク&スイープ） — 3.06 s、本質的にベースラインと同一。戦略の選択が制約になっているのではなく、オブジェクト単位の回収がないことが制約なのです。</li>
        <li><strong><code>ValidPointerSet</code> の構造的なクリーンアップ（コミット 0fa42e0b）。</strong> 2 つの別々のソート済みベクタ（アリーナポインタと malloc されたポインタ）を 1 つにマージし、min/max のレンジ事前フィルタを追加し、<code>try_mark_value</code> のタグ拒否をインライン化しました。<code>contains()</code> の呼び出しあたりのコストを半減 — これはプロファイルがフラグを立てたホットな内側のループでした。ABC451D のベンチは 3.07 s から 3.21 s へ動きました。ノイズの範囲内で、無効果。この変更は、<code>contains()</code> が実際に制約となるワークロード（ECS 形状のベンチマーク、hono の compose チェーン）に対しては依然として価値を出荷しますが、ここでは制約ではありませんでした。絶対的な呼び出し回数 — マークフェーズに供給されるアロケーション圧力によって駆動される — が、呼び出しあたりのコストがゼロでも支配的でした。</li>
      </ul>
      <p>
        3 つすべてに共通するパターン：GC 戦略と呼び出しあたりの内側ループのコストは二次的でした。制約となっていたのは、完全に空にならないブロック内のデッドオブジェクトに対する回収パスがないことでした。それに対処するまで、他の何ものも針を動かしませんでした。
      </p>

      <h2>到達したところ</h2>
      <p>
        v0.5.737 と v0.5.875 の間、およそ 137 のパッチバージョンにわたって、ギャップは埋まりました。これを書くにあたっては慎重でありたい：私たちは単一のヒーローコミットへ二分探索しませんでした。修正は、意図的な「オブジェクト単位のフリーリストなし」というトレードオフを恒久的なものではなく条件付きにする一連の変更にわたって GC サブシステムに着地しました — <code>block_reclaim</code> が連続するサイクルにわたってゼロのままのとき、スイープはサイズバケット化されたフリーリストの構築を始め、バンプアロケータはフォールバックパスを得ます。正確な順序と、どのパッチがどれだけ寄与したかは、私たちが負っているが、まだやっていない丁寧な二分探索を要するでしょう。
      </p>
      <p>
        結果は、aya_koto 氏のまさにそのベンチとコマンドで、Apple M シリーズ、macOS 26.4 にて：
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        この表についての誠実さに関する 2 つの注記。第一に、Perry の Bun に対する 1.01× のマージンは誤差範囲内です — 正しい言葉は「速い」ではなく「タイ」です。第二に、3 つのランタイムすべての分散には意味があり（Perry の最大値は平均 425 ms に対して 745 ms）、どの単一の実行も、どちらかの裾に着地し得ます。そのために平均と並べて min と max を示しました。私たちは、あなたにその広がりを見てほしいのです。
      </p>

      <h2>まだ不完全なこと</h2>
      <p>
        私たちが覆い隠していないいくつかのこと：
      </p>
      <p>
        aya_koto 氏の計測とこの調査の開始の間に起きた 1.2 s から 3.0 s へのリグレッションは、私たちがこのクラスの鈍化を捕まえる CI のガードレールを持っていなかったことを物語っています。この投稿が公開される前に、<code>abc451d-perry.ts</code> と小さな周辺スイートを、perf リグレッションゲートとして Perry の CI に追加します。このベンチが将来のリリースで静かに劣化したら、3 か月後の批評家からのベンチマークではなく、ビルドを失敗させるべきです。
      </p>
      <p>
        この修正は、意図的なトレードオフを特定の方向に緩和します。私たちは <code>object_create</code> ベンチマークとその仲間 — 元の「フリーリストなし」の選択が保護していたワークロード — を見守り、条件付きフリーリストのパスがそれらをリグレッションさせないことを確認しています。初期の数値はノイズの範囲内ですが、これは、自信が単一のベンチマーク実行からではなく時間から来る類のものです。
      </p>
      <p>
        私たちは 137 バージョンの範囲を二分探索しませんでした。やります。それはドキュメントのために重要であり、条件付きフリーリストの機構のどれが仕事をしているのかを理解するためにも重要です。
      </p>

      <h2>クレジット</h2>
      <p>
        aya_koto 氏の記事は、オープンソースプロジェクトが必要としながらめったに得られない、まさにその種の書き物でした。彼は注意深く計測し、テストリポジトリを公開し、インストールパスでの具体的な摩擦を指摘し、Perry が彼が評価しようとしていたユースケースに対して準備ができていないという誠実な結論に達しました。その結論は、彼が下したときには正しかった。彼がそれについて書いていなかったら、もっと長く正しいままでいられたでしょう。
      </p>
      <p>
        彼のテストリポジトリは <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a> にあります。彼の記事は <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a> にあります。このフォローアップの後でも、どちらも読む価値があります — 特に記事は、丁寧であるインセンティブを持たない人物による、初期段階のコンパイラの誠実な評価を記録しているからです。
      </p>
      <p>
        彼の記事の中の、特に注目すべき 2 つのこと。彼が指摘したインストールパスの摩擦 — perryts.com のトップが 1 つの方法を指していた一方でドキュメントは別の方法を推奨していた — は修正されました。npm のパスがランディングページで目立つオプションになり、ドキュメントと一致しています。彼が指摘した「制限事項ドキュメントの外にある、コンパイルできないもの」というフラストレーション — 私たちは彼のテストリポジトリのすべての <code>.ts</code> ファイルを現在の Perry に対して通しで確認しました。本物のギャップには Issue が立てられ、文書化された制限は拡張されました。
      </p>
      <p>
        彼の記事の BigInt の脚注は、前述のとおり ABC451D とは無関係でしたが、それ自体は現実でした — Perry の BigInt 実装は確かに内部的には固定幅 1024 ビット整数で、BigInt を多用するプログラムはその代償を払っていました。それは v0.5.736 で、小さい値のインラインパスと、任意精度のフォールバックとしての <code>num-bigint</code> によって修正されています。そこでのクレジットは、aya_koto 氏の記事に脚注を残した読者に帰します。私たちは彼らが誰なのか知りませんが、もしこれを読んでいるなら：ありがとう。
      </p>

      <h2>再現</h2>
      <p>
        これらの数値を自分で再現したい場合：
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        あなたの数値はハードウェアとランタイムのバージョンによって変わります。間違って見える形で変わる場合は、<a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">Issue を立ててください</a> — 私たちはそれについて聞きたいのです。
      </p>
      <p>
        ソース：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues：<a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
