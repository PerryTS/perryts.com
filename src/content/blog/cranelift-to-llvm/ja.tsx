export default function Content() {
  return (
    <>
      <p>
        PerryのバックエンドがCraneliftからLLVMへの移行を完了しました。v0.5.12時点でLLVMが唯一のコード生成バックエンドとなり、Perryは15のベンチマーク中14で Node.jsに勝利しています。その差は1.06倍から24.6倍に及びます。
      </p>
      <p>
        ここに至る道のりは一直線ではありませんでした。v0.5.0での初回切り替えでは、いくつかのベンチマークが置き換え前のCranelift版より<strong>70倍遅く</strong>なりました。この記事では、何が起こったのか、なぜそれでも切り替えたのか、何が壊れたのか、何が修正したのか、そして最終的な数値がどうなったのかを詳しく説明します。
      </p>
      <p>
        コンパイラを開発している方、codegenバックエンドを評価している方、あるいは「LLVMに切り替える」がなぜ見かけほど簡単ではないのか気になる方に向けた記事です。
      </p>

      <h2>パート1：そもそもなぜ切り替えるのか？</h2>
      <p>
        PerryはTypeScriptを直接ネイティブマシンコードにコンパイルします。Node不要、V8不要、Electron不要、WebView不要。「TypeScriptを書いて、ネイティブバイナリを出荷する」という価値提案は、そのバイナリが実際に高速でなければ崩壊します。
      </p>
      <p>
        Perryの初期のマイナーバージョンでは、codegenバックエンドは<a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>でした。Craneliftは優れたツールです。wasmtimeのcodegenを支え、SpiderMonkeyのベースラインJITにも使われており、高速で予測可能なコンパイルとクリーンな組み込みが必要な場合の選択肢です。新しい言語を立ち上げるプロジェクトにとって、正しい出発点でした。
      </p>
      <p>
        しかし、最終的に2つの理由でCraneliftから離れることになりました。
      </p>

      <h3>1. オプティマイザの限界</h3>
      <p>
        Craneliftは意図的に高速な単一ティアの最適化コンパイラです。その使命は「まともなコードを素早く生成すること」であり、「無制限の時間をかけて最良のコードを生成すること」ではありません。JITにとっては正しいトレードオフです。しかし、ネイティブパフォーマンスを最大の売りにするAOTコンパイラにとっては不適切なトレードオフです。
      </p>
      <p>
        LLVMには20年以上の開発が注ぎ込まれています。ループベクトル化、LICM、GVN、SCCP、命令結合、インライン化ヒューリスティクス、fast-mathの再結合、エイリアス解析など。小さなプロジェクトが追いつける現実的な世界はありません。Perryが「Nodeより速い」と主張するなら、その機構が必要です。
      </p>

      <h3>2. arm64_32の問題</h3>
      <p>
        直接的なきっかけはApple Watchでした。<code>arm64_32</code>はAppleがSeries 4以降で導入したABIで、64ビット命令と32ビットポインタを持ちます。Craneliftはこれをサポートしておらず、サポートが実現する現実的な見込みもありませんでした。Perryが「1つのコードベースから9プラットフォーム」を正当に主張するには、watchOSを欠くことはできません。LLVMは<code>arm64_32</code>を標準でサポートしています。
      </p>
      <p>
        <em>一部</em>のターゲットにLLVMが必要であることを受け入れた時点で、2つのバックエンドを維持することは持続不可能になりました。2つのバックエンドは2セットのバグ、2セットの最適化パス、2つのテストマトリクス、2つのパフォーマンスベースラインを意味します。正直な答えは「1つを選ぶ」でした。
      </p>
      <p>LLVMを選びました。</p>

      <h2>パート2：Craneliftについてひとこと</h2>
      <p>
        先に進む前に、この記事はCraneliftを批判するものではありません。Craneliftは見事なエンジニアリングの成果であり、JIT、サンドボックスランタイム、あるいはコンパイルレイテンシがピークスループットより重要なものを構築しているなら、候補リストの上位に入れるべきです。wasmtimeが採用しているのには理由があります。Bytecode Allianceは模範的な仕事をしています。
      </p>
      <p>
        Perryのニーズが異なるだけです。私たちはAOTでコンパイルし、バイナリを一度出荷し、ユーザーはそれを何百万回も実行します。この非対称性――コンパイルはまれに、実行は常に――こそがLLVMの重いオプティマイザが元を取る領域です。異なる仕事に異なるツールということです。
      </p>

      <h2>パート3：切り替えの災難</h2>
      <p>
        v0.5.0はLLVMを唯一のバックエンドとした最初のリリースでした。コンパイル時間はわずかに増加し、ランタイムパフォーマンスは大幅に改善されると予想していました。後者については正反対の結果になりました。
      </p>
      <p>当時は公開したくなかった表がこちらです：</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2.8x faster</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1.8x slower</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2.3x slower</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        一部のワークロードは高速化しました。しかし大半は劇的に悪化しました。<code>method_calls</code>は、一般的なTypeScriptのクラス使用を表すため最も重要なベンチマークの1つですが、2リリース前に出荷したものより約70倍悪化していました。
      </p>

      <h3>実際に何が問題だったのか</h3>
      <p>
        Perryは値表現に<strong>NaN-boxing</strong>を使用しています。すべてのTypeScriptの値は64ビットワードです。f64の数値はそのまま格納され、それ以外（オブジェクト、文字列、ブーリアン、undefined、null）はIEEE 754のquiet NaNの未使用ビットにエンコードされます。
      </p>
      <p>
        利点：数値はゼロコストです。ボクシングなし、タグ付けなし、算術でのアロケーションなし。
      </p>
      <p>
        欠点：数値以外の値に対する操作はすべて、アンパック、操作、リパックのためのビット操作が必要です。これらのシーケンスがcodegenのインラインIRとして存在すれば、オプティマイザはそれらを融合・簡素化できます。しかし、<strong>ランタイムヘルパー関数への呼び出し</strong>として存在すると、オプティマイザは不透明な呼び出しとして扱い、最適化を諦めます。
      </p>
      <p>
        Craneliftバックエンドはホットなオペレーションのためのインラインローワリングを多数持っていました。プロパティのロード、メソッドディスパッチ、オブジェクト割り当て、f64タグ付き値の整数演算などです。LLVM切り替え時には、まず<em>正しい</em>コードを出力することを優先し、これらのほぼすべてを<code>perry-runtime</code>のランタイムヘルパー経由としました。各ヘルパーはLLVM IRにおける<code>call</code>命令になります。
      </p>
      <p>
        LLVMは優秀ですが、本体を見たことのない関数をインライン化することはできません。<code>perry-runtime</code>は別途コンパイルされ、最後にリンクされるため、オプティマイザの視点からはすべてのヘルパー呼び出しがブラックボックスです。その結果、Craneliftバックエンドが約5命令のインライン算術にコンパイルしていたホットループが、関数呼び出し――レジスタ退避、スタックフレームセットアップなど――にコンパイルされ、それが数百万回繰り返されることになりました。
      </p>
      <p>
        70倍の原因はそこにあります。悪いcodegenではなく、悪い<strong>インライン化境界</strong>です。
      </p>

      <h2>パート4：修正</h2>
      <p>
        Craneliftの数値を回復し、それを超えるための作業は、大まかに6つのカテゴリに分かれます。どれも特殊なものではありません。ほとんどは教科書的なコンパイラ最適化を適切な場所に適用しただけです。
      </p>

      <h3>1. オブジェクト割り当て用のインラインバンプアロケータ</h3>
      <p>
        <code>object_create</code>は<code>method_calls</code>に次いで最大の後退でした。従来のパスはすべての<code>new Point()</code>に対して<code>js_object_alloc_class_with_keys</code>を呼び出していました。関数呼び出し、スレッドローカルなアリーナアクセス、シェイプキャッシュの検索、GCヘッダとオブジェクトヘッダの書き込みが含まれます。
      </p>
      <p>
        修正：バンプアロケーションをLLVM IRの<strong>インライン</strong>として出力します。オブジェクトを割り当てる各関数は、スレッドローカルの<code>InlineArenaState</code>構造体へのキャッシュ済みポインタを取得します。アロケーションは以下のようになります：
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        ファストパスはLLVMが見て、スケジューリングし、ループ外にホイストできる約13命令のインラインIRです。<code>object_create</code>は318msから9msになりました。
      </p>

      <h3>2. i32ループカウンタ</h3>
      <p>
        NaN-boxingにより、すべてのTypeScriptの数値はf64です。ループカウンタも含まれます。f64の誘導変数を持つ<code>{'for (let i = 0; i < 100_000_000; i++)'}</code>ループは大惨事です。f64のインクリメント、f64の比較、配列インデックス時のf64からi64への変換が毎回発生します。
      </p>
      <p>
        codegenは、誘導変数が整数値であることが証明可能なforループを検出し、<strong>並列i32スタックスロット</strong>を割り当てます。ループ条件が<code>fcmp</code>から<code>icmp slt i32</code>に切り替わり、f64カウンタが完全に排除されます。
      </p>
      <p>
        これにより<code>array_write</code>は11msから3msに、<code>nested_loops</code>は18msから9msに、<code>array_read</code>は11msから4msになりました。
      </p>

      <h3>3. fast-mathフラグ</h3>
      <p>
        すべてのf64算術命令に<code>reassoc contract</code>フラグを付与しています。<code>reassoc</code>はLLVMがシリアルなアキュムレータチェーンを並列に分割することを許可し、<code>contract</code>は積和演算の融合を許可します。PerryはNaNビットを値のタグとして使用するため、<code>nnan</code>と<code>ninf</code>はオフにしています。
      </p>
      <p>
        これらのフラグにより、LLVMのループベクトライザが<code>math_intensive</code>で発動し、131msから14msに低下。Nodeの3.5倍の速さを達成しました。
      </p>

      <h3>4. 整数剰余演算のファストパス</h3>
      <p>
        JavaScriptにおけるf64の<code>%</code>は<code>fmod</code>であり、ARMではlibm呼び出しです。しかし、整数値のf64オペランドに対しては、<code>fptosi → srem → sitofp</code>で完全にlibmのラウンドトリップをスキップできます。codegenは静的解析で整数値オペランドを検出します。ランタイムチェックは不要です。
      </p>
      <p>
        これが<code>factorial</code>が1,553msから24msになった理由であり、Nodeの591msに対する24ms、<strong>Node.jsの24.6倍高速</strong>を実現した理由です。
      </p>

      <h3>5. ネストされたループのLICM</h3>
      <p>
        LLVMはloop-invariant code motionを標準で行いますが、NaN-boxingが構造を隠してしまいます。<code>arr.length</code>はNaN-boxedポインタを通じたタグチェック付きのロードに展開され、明らかにループ不変とは見なされません。
      </p>
      <p>
        codegenは<code>{'for (...; i < arr.length; ...)'}</code>パターンを検出し、ループの前に長さをスタックスロットにプリロードします。静的ウォーカーがループ本体で配列の長さが変更されないことを検証します。カウンタがこのホイストされた長さで制約されている場合、IndexGet/IndexSetは境界チェックを完全にスキップします。
      </p>

      <h3>6. シェイプキャッシュされたオブジェクト</h3>
      <p>
        codegenがオブジェクトのクラスを知っている場合、コンパイル時にフィールドオフセットを解決し、<strong>直接インデックスロード</strong>を出力します。ランタイムディスパッチは不要です。メソッドディスパッチでは、<code>obj.method(args)</code>が直接の<code>call @perry_method_Class_name(this, args)</code>になります。vtableなし、インラインキャッシュなし、ハッシュルックアップなし。
      </p>
      <p>
        LLVMへの切り替えでこれが汎用スローパスに後退していました。静的ディスパッチの復元により、<code>method_calls</code>が1,084msから1msに回復。<strong>Node.jsの11倍高速</strong>を達成しました。
      </p>

      <h2>パート5：現在の数値</h2>
      <p>3回実行の中央値、macOS ARM64（Apple Silicon、M1 Max）、Node.js v25：</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        15戦14勝。唯一の敗北は<code>object_create</code>で、V8のアロケータが本当に優秀であり、差は12%以内です。
      </p>

      <h2>パート6：コンパイル時間の問題</h2>
      <p>
        人々がLLVMよりCraneliftを選ぶ最大の理由はコンパイル速度です。では、それについて話しましょう。
      </p>
      <p>
        LLVMによりPerryのファイルあたりのコンパイル時間は<strong>20-50ms</strong>、おおよそ<strong>8-19%</strong>増加しました。5倍ではありません。2倍でもありません。一桁から低い二桁のパーセントです。
      </p>
      <p>
        理由は、codegenがPerryのパイプラインにおけるボトルネックではないからです。典型的なファイルの内訳は以下の通りです：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWCパース：約30%</li>
        <li>HIRローワリング（AST → IR、型推論）：約25%</li>
        <li>IR変換パス（クロージャ変換、async lowering、インライン化）：約15%</li>
        <li><strong>Codegen（LLVM IRテキスト出力 + <code>clang -c -O3</code>）：約20%</strong></li>
        <li>リンク（<code>cc</code> + ランタイムライブラリ）：約10%</li>
      </ul>
      <p>
        Codegenは5つのうちの1つのスライスです。そのスライスを倍にしても全体は5-10%しか増えません。ユーザーが<code>perry compile</code>を一度入力し、バイナリを永遠に実行するAOTコンパイラを構築しているなら、計算は明白です。コンパイル時間に25ms多く費やし、毎回の実行で最大24倍の高速化を得る。
      </p>

      <h2>パート7：今やり直すならどうするか</h2>
      <p>
        もし今日Perryを始めて、いきなりLLVMに行けるとしても、そうはしないでしょう。Craneliftフェーズは本当に価値がありました。LLVMの複雑さの税なしにフロントエンドの反復を可能にし、比較対象となる動作するベースラインを与えてくれ、HIRをバックエンド間で移植できるほどクリーンに保つことを強制しました。
      </p>
      <p>
        やり直すとすれば、切り替え自体です。v0.5.0ではほとんどのオペレーションをランタイムヘルパー呼び出し経由にして、後でインライン化する予定でした。それは間違いでした。正しい順序は、まずホットパスを特定し、切り替え前にインライン化し、LLVMバックエンドが少なくとも同等になってからリリースすることでした。
      </p>
      <p>
        教訓は退屈なものです。最適化境界はオプティマイザの品質より重要です。LLVMは驚異的なソフトウェアですが、見えないコードに対しては何もできません。codegenがすべてを不透明なランタイム呼び出しに経由させるなら、ソースプログラムと存在するすべての最適化パスの間に壁を作ったことになります。
      </p>

      <h2>まとめ</h2>
      <p>
        PerryはLLVM専用となり、15のベンチマーク中14でNode.jsより高速で、出荷を続けています。移行は予定より長くかかり、途中で予想以上の痛みを伴いましたが、振り返れば間違いなく正しい判断でした。Craneliftがv0.5まで導いてくれました。LLVMがその先を引き継ぎます。
      </p>
      <p>Perryを試してみたい方へ：</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        ソース：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}-- ドキュメント：<a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}-- ベンチマークを自分で実行：<code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        質問やバグ報告、codegenバックエンドについて議論したい場合は、GitHub issueが開かれています。すべて読んでいます。
      </p>
      <p>-- Ralph</p>
    </>
  );
}
