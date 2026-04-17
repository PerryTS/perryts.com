export default function Content() {
  return (
    <>
      <p>
        前回のブログ記事はPerry v0.5.12とともに公開されました。今日はv0.5.80です。これは<strong>7日間で68回のパッチリリース</strong>であり、そのほぼすべてが1つのこと――残っていたすべての遅いパスを速いパスに変えること――に集中していました。
      </p>
      <p>
        v0.5.0でのLLVMへの切り替えは、v0.5.12までにCraneliftとの同等性を回復しました。それは1つの物語の終わりであり、別の物語の始まりでした。LLVMは今やすべてを見ています。問いは「なぜこれが遅いのか？」ではなく、「なぜこれはまだ速くないのか？」に変わりました――こちらの方がはるかに扱いやすい問いです。
      </p>
      <p>
        この記事は今週のツアーです。JSONが547倍の高速化を達成しました。mimallocがグローバルアロケータになりました。プロパティアクセスにモノモルフィックインラインキャッシュが加わりました。Bufferには<code>noalias</code>メタデータ付きの型付きポインタスロットが加わりました。FastifyとWebSocketサーバーが1分後にクラッシュしなくなりました。そしてベンチマークの数値が再び動きました。
      </p>

      <h2>1. JSON：547倍の差を埋める</h2>
      <p>
        v0.5.29時点で、Perryの20レコード配列に対するJSON.parseは<strong>Nodeより547倍遅い</strong>状態でした。v0.5.46までに1.3倍になりました。この数値は今週最大の差分であり、この記事の他のすべての最適化は同じテーマのバリエーションなので、辿っておく価値があります。そのテーマとは――やらなくていい仕事はやらない、ということです。
      </p>
      <p>
        元のパーサーは、プロパティごとに1つのVec、オブジェクトごとに1つのキー用Vec、そしてキーキャッシュ用にRefCellで保護されたスレッドローカルを1つ割り当てていました。すべての文字列をコピーしていました。すべてのフィールド名を再ハッシュしていました。20レコードすべてが全く同じフィールドを全く同じ順序で持っていても、レコードごとに真新しいオブジェクトシェイプを構築していました。Nodeのパーサーはパターンを検出し、すべてのレコードで単一のシェイプを共有することでこれを処理します。Perryのパーサーはそうしていませんでした。
      </p>
      <p>修正は4つのステップで入りました：</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>スレッドローカルな<code>PARSE_KEY_CACHE</code>によるキーのインターン化</strong>（v0.5.45）。最初のレコードはN個のキー文字列を割り当て、2番目から20番目のレコードはゼロ個を割り当てます。繰り返されるキーは同じポインタに解決されるため、strcmpなしでシェイプキャッシュのルックアップキーとして使用できます。</li>
        <li><strong>遷移キャッシュ経由のシェイプ共有</strong>（v0.5.45）。<code>js_object_set_field_by_name</code>で構築されるオブジェクトは同じ遷移グラフを辿ります。スキーマが繰り返されると、<code>keys_array</code>ポインタが共有され、これがポリモルフィックインラインキャッシュがヒットするために必要なものです。</li>
        <li><strong>ゼロコピー文字列パース + インクリメンタルオブジェクト構築</strong>（v0.5.46）。<code>parse_string_bytes</code>はバックスラッシュエスケープがない場合（これはすべてのキーとほとんどの値に当てはまる一般的なケース）に<code>ParsedStr::Borrowed(&amp;[u8])</code>を返すようになりました。<code>parse_object</code>は、まずVecに集めるのではなく、直接フィールドを書き込みます。</li>
        <li><strong>パース中のGC抑制</strong>（v0.5.60、#59クローズ）。大きな配列のパースは、タイトなループで何千もの小さなオブジェクトを割り当てます。それぞれがGCの閾値チェックを誘発していました。「パース進行中」フラグを設定して、パースが返るまで収集を延期します――ヒープサイズは実効的には同じですが、記録用のブランチは大幅に減ります。</li>
      </ol>
      <p>
        次にstringifyです。同一形状のオブジェクトを何百万回も含む同種の配列に対するJSON.stringifyは、オブジェクトごとに完全なプロパティ反復を行っていましたが、シェイプが安定した配列にとっては純粋な無駄です。5ステップの修正でそのギャップのほとんども埋まりました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62：数値用のitoa / ryuファストパス、HashSetの代わりに深さベースの循環参照チェック。</li>
        <li>v0.5.63：<code>toJSON</code>ガード + 永続的なキーキャッシュ + インラインディスパッチ（積み重なっていた3つの呼び出しごとのコスト）。</li>
        <li>v0.5.65：同種シェイプ用stringifyテンプレート + ASCIIエスケープファストパス。すべての要素が同じシェイプを持つ場合、キー/コロン/カンマの骨組みは一度だけ事前計算されます。</li>
        <li>v0.5.70、v0.5.72、v0.5.75：呼び出しごとのシェイプテンプレートキャッシュ、パース残りのGCギャップを閉じる、残っていた固定の呼び出しごとのオーバーヘッドを排除。</li>
        <li>v0.5.79：小さな値用のパス。数値、ブーリアン、短い文字列は、オブジェクト機構を一切セットアップしない直接パスを通ります。</li>
      </ul>
      <p>
        累積結果：週の初めに<strong>Nodeから547倍</strong>離れていたJSONパイプラインが、現実的なワークロードで<strong>パースで約1.3倍、stringifyでは競争力のある状態</strong>になりました。
      </p>

      <h2>2. アロケータの話</h2>
      <p>
        Perryは多くを割り当てます。すべてのオブジェクトリテラル、配列リテラル、文字列連結、クロージャで。アロケータはホットで、v0.5の大半ではRustのデフォルトのシステムアロケータに加えて、短命な値用のスレッドローカルアリーナという構成でした。
      </p>
      <p>
        v0.5.67でグローバルアロケータを<strong>mimalloc</strong>に置き換えました。これはCargo.tomlの1行変更で、小さな割り当てを多数行うワークロード――つまりすべてのTypeScriptプログラム――に即座に効果を発揮します。v0.5.66はこれに先行して、すべての<code>gc_malloc</code>のスレッドローカル状態を呼び出しごとに単一のTLSアクセスにまとめ、mimallocへのパスを可能な限り安価にしました。
      </p>
      <p>
        v0.5.68はこれをさらに推し進めて、<strong>アリーナ割り当ての文字列</strong>を導入しました。短命な文字列（中間の連結結果、<code>split()</code>のピース、パーサーのスクラッチ）はグローバルアロケータを完全にスキップし、自然な境界でリセットされるスレッドごとのバンプアリーナに着地します。JSONパースについてはこれ単独で2桁パーセントの勝利でした。
      </p>
      <p>
        そして全く割り当てない2つの最適化もあります：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>エスケープしないオブジェクトのスカラー置換</strong>（v0.5.17、その後v0.5.76でオブジェクトリテラル）。オブジェクトがそれを囲む関数から決して出ないなら、存在する必要はありません。そのフィールドは単なるローカルになります。不透明なアロケータ呼び出しの背後にオブジェクトを隠すのをやめれば、LLVMはこれを標準で処理できます。</li>
        <li><strong>エスケープしない配列のスカラー置換</strong>（v0.5.73）。同じ考え方――配列がエスケープしなければ、その要素はSSA値になり、割り当て全体が消えます。</li>
      </ul>
      <p>
        配列リテラルのパスについて言えば、v0.5.69は<strong>正確なサイズのファストパス</strong>を追加し（サイズがコンパイル時に既知であれば容量拡張の機構をスキップ）、v0.5.74は小さな配列リテラル用のバンプアロケータIRをインライン化して、LLVMが割り当てを見て、畳み込み、ホイスト、または除去できるようにしました。配列重視のベンチマークはもう一歩前進しました。
      </p>
      <p>
        締めくくりとして、v0.5.25はもっと静かなバグを修正しました：<code>gc_malloc</code>が自身のパスで収集を発動させておらず、malloc重視のワークロードは何かがチェックするまでヒープが無制限に成長する可能性がありました。v0.5.61は閾値に適応的なステップサイジングを追加しました。これは実際に望ましいものです――ヒープが小さいときは安価にチェックし、大きいときは頻度を下げる。
      </p>

      <h2>3. プロパティアクセスが本物のインラインキャッシュを獲得</h2>
      <p>
        あらゆる現代のJavaScriptエンジンは、プロパティアクセスにポリモルフィックインラインキャッシュ（PIC）を持っています。Perryのv0.5系列の大半では、PropertyGetはスレッドローカルハッシュでのシェイプテーブル検索を経由していました。コールドコードにはそれで問題ありません。しかし、ある呼び出しサイトでのプロパティ読み取りの95%が同じシェイプを見ている場合――これはほとんど常にそうですが――には問題です。
      </p>
      <p>
        v0.5.44で<code>PropertyGet</code>用の<strong>モノモルフィックインラインキャッシュ</strong>が入りました。各PropertyGetサイトは呼び出しサイトごとのキャッシュエントリを持ちます：期待されるシェイプポインタとフィールドオフセットです。ヒットパスは単一の比較とインデックス付きロードです。ミスパスはキャッシュを更新する遅いヘルパーにフォールスルーします。
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51は動的なプロパティ書き込み用の<strong>コンテンツハッシュによるシェイプ遷移キャッシュ</strong>を追加しました。同じフィールドを同じ順序で成長させる2つのオブジェクトは同じ遷移にハッシュされるため、最終的に同じシェイプを共有することになります――つまり、PICの読み取り側が実際にヒットするようになります。
      </p>
      <p>
        v0.5.55は遷移キャッシュから最後のTLSアクセスを取り除きました。v0.5.46は、フィールドが8個を超えるオブジェクトがインラインスロットの範囲外の初期化されていないメモリを読み取っていたPICミスハンドラのバグを修正しました（#55クローズ）。v0.5.78は、生の数値のような非ポインタレシーバーへのインデックスからPropertyGetのPICを保護するガードを追加しました――これは過度に楽観的な型絞り込みで発生する可能性があり、ICにおける最後の安定性問題の1つでした。
      </p>
      <p>
        ネットの効果：プロパティ重視のコード――実際にはほとんどのTypeScript――はICだけで1週間前より約2～3倍高速になりました。
      </p>

      <h2>4. 整数、ビット演算、そして<code>| 0</code>パターン</h2>
      <p>
        NaN-boxingはすべての数値をf64にします。TypeScriptプログラマは整数セマンティクスを強制するために<code>x | 0</code>と書きます。V8はそれを安価にするために15年を費やしてきました。Perryは今週それに追いつきました。
      </p>
      <p>変更のスタック、順に：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>：<code>(int / const) | 0</code>に<code>sdiv</code>。LLVMは<code>smulh + asr</code>に畳み込み、<code>fdiv</code>の約10サイクルに対して約2サイクルです。</li>
        <li><strong>v0.5.48</strong>：Uint8ArrayGet境界への<code>@llvm.assume</code>。境界チェックのbranch+phiダイアモンドを、ベクトライザが推論可能な単一の基本ブロックに置き換えます。</li>
        <li><strong>v0.5.49</strong>：NaN/Infinityを含むビット演算がToInt32仕様に従って0を生成するように修正。まず正しさから。</li>
        <li><strong>v0.5.50</strong>：値が有限と判明している場合に5命令のNaN/Infガードをスキップする<code>toint32_fast</code>。加えて小さなヘルパーへの<code>alwaysinline</code>とclamp検出。</li>
        <li><strong>v0.5.52</strong>：clamp関数を<code>smin</code>/<code>smax</code>イントリンシックで直接ターゲット。Clampはインクリメントに次いで最も一般的な整数パターンです。</li>
        <li><strong>v0.5.53</strong>：有限と判明している値に対する<code>x | 0</code>と<code>x &gt;&gt;&gt; 0</code>はnoopになります――ただの<code>fptosi + sitofp</code>で、ガードは一切ありません。</li>
        <li><strong>v0.5.56</strong>：i32ネイティブのビット演算。Uint8ArrayGet/Setでのi32インデックスと値。</li>
        <li><strong>v0.5.58、v0.5.60</strong>：<code>Math.imul</code>はpolyfillパスの代わりにネイティブi32乗算にロワリングされます。Polyfill検出はユーザーが書いた<code>Math.imul</code>シムを認識して置き換えます。</li>
        <li><strong>v0.5.59</strong>：純粋関数のinitインライン化 + 整数ローカルシード。関数ローカルな整数解析が、呼び出し先が小さく純粋な場合に呼び出し境界を越えて見ることができるようになります。</li>
        <li><strong>v0.5.37～v0.5.40</strong>：アキュムレータパターンの整数算術ファストパス。古典的な<code>for (...) acc += f(i)</code>ループは、型が許せば最初から最後までi32に留まります。</li>
      </ul>
      <p>
        v0.5.41は微妙なものです。codegenがモジュールレベルの<code>const K: number[][] = [[...], ...]</code>を見ると、全体を<code>.rodata</code>にあるフラットな<code>[N x i32]</code>定数にロワリングします。<code>K[y][x]</code>は単一の<code>getelementptr + load i32</code>になります。v0.5.43の整数解析ブリッジと組み合わさり、これが<code>image_conv</code>（4K RGBフレームに対する5×5ガウシアンブラー）に<strong>単一リリースで3倍の高速化</strong>をもたらしたものです。
      </p>

      <h2>5. BufferとUint8Array</h2>
      <p>
        バイナリワークロード――暗号、画像処理、パース、ネットワーク――はBufferとUint8Arrayに住んでいます。v0.5.64でこれらに<strong>型付きポインタスロットと<code>noalias</code>メタデータ</strong>を与えました。Bufferは以前は<code>alloca double</code>内のNaN-boxed doubleでしたが、今は<code>alloca i64</code>内の生の<code>i64</code>ポインタで、LLVMアノテーションが「このポインタはスコープ内の他のポインタとエイリアスしない」とオプティマイザに伝えます。これにより、オプティマイザが普段は行わないロード/ストアの並び替え、ベクトル化、レジスタアロケーションが解放されます。
      </p>
      <p>
        v0.5.80でここでの最後の正しさの問題を解決しました：モジュール全体のバッファ<code>alias-scope</code>カウンタが関数ごとにリセットされていたため、まれにLLVMが同じスコープIDを共有すべきではないスコープをまたいで推論する可能性がありました。今やカウンタはモジュール全体で、<code>noalias</code>の話は盤石です。
      </p>
      <p>
        v0.5.53は<code>Uint8ArraySet</code>をブランチレスにしました――境界外で0を書き込むif/elseの代わりにマスク付きストアです。v0.5.54は長いパターン用の<strong>Two-Way indexOf</strong>とアリーナ割り当ての<code>split</code>を追加し、これらが合わさって文字列重視のBufferパースのギャップの大半を埋めました。
      </p>

      <h2>6. 文字列：ASCIIがファストパス</h2>
      <p>
        JavaScriptの文字列はUTF-16ですが、現実世界の文字列（キー、識別子、HTTPヘッダー、JSONの骨組み）のほとんどはASCIIです。v0.5.71は<strong>ASCII文字列に対するO(1)の<code>charCodeAt</code>と<code>codePointAt</code></strong>を追加しました――UTF-16スキャンなし、ただのバイトロードです。v0.5.20では既に<code>indexOf</code>、<code>slice</code>、<code>charAt</code>がASCIIではUTF-16スキャンをバイパスするようになっていました。
      </p>
      <p>
        同じリリースに含まれる正しさに関する注記：<code>String.length</code>はバイト数の代わりにUTF-16コード単位（ECMAScript仕様）を返すようになりました。これは<code>&quot;caf&eacute;&quot;.length</code>が4の代わりに5を返していた潜在的なバグでした。
      </p>

      <h2>7. サーバーが実際に落ちなくなった</h2>
      <p>
        今週の最も地味な作業は、同時に最もユーザーから見える作業でもありました：長時間実行のNodeスタイルサーバー――Fastify、ws、http、net――が数分後にクラッシュしないようにすることです。
      </p>
      <p>
        クラッシュはすべて同じ根本原因を共有していました：GCがリスナーのクロージャを知らなかったのです。<code>wss.on(&apos;message&apos;, handler)</code>と書くと、クロージャは変数をキャプチャし、それらはGC割り当てのセル内のフィールドとして存在します。GCルートスキャナがそれらのセルを訪問することを知らなければ、キャプチャされた変数は回収され、次のメッセージイベントは解放されたメモリを逆参照します。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>：<code>net.Socket</code>イベントリスナーのクロージャをルートスキャン（#35クローズ）。</li>
        <li><strong>v0.5.27</strong>：<code>ws</code>、<code>http</code>、<code>events</code>、<code>fastify</code>に拡張。</li>
        <li><strong>v0.5.28</strong>：モジュールレベルのグローバルをGCルートとして登録（#36クローズ）。1層上のライフタイムバグ。</li>
        <li><strong>v0.5.21</strong>：Fastify/WebSocketリクエストハンドラ内での<code>gc()</code>の安全性――明示的なGC呼び出しが、リクエストハンドラがアリーナへのポインタを保持している間に走っていました（#31クローズ）。</li>
      </ul>
      <p>
        GC作業と並行して、v0.5.20は<strong>メインイベントループ</strong>――プレースホルダではなく本物――を出荷しました。これは最後の同期呼び出しが返った後に終了する代わりに、WebSocketとタイマーベースのサーバーを生き続けさせます（refs #28）。Perryを本番HTTPサーバーとして実行しようとしている人にとって、これは単独で最も影響の大きい修正でした。Fastifyが落ちなくなりました。WebSocketサーバーが落ちなくなりました。
      </p>
      <p>
        v0.5.19はJSValue FFI引数/戻り値のSysV AMD64 ABI不一致を修正しました――Linux上でネイティブFFI呼び出しが引数を密かに破損する可能性がある問題です。v0.5.18は<code>axios</code>（get/post/put/delete/patch）のネイティブディスパッチを追加しました。<code>response.status</code>と<code>response.data</code>を含みます。v0.5.30は<code>fastify request.header()</code>と<code>request.headers[]</code>のディスパッチを修正しました。これは大文字小文字を区別しないルックアップでundefinedを返していました。
      </p>

      <h2>8. <code>@perry/postgres</code>：これらすべてを必要にしたドライバ</h2>
      <p>
        今週の作業の多くは、1つのワークロードによって牽引されました：Perryネイティブで動作する完全なNode互換の<a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">Postgresドライバ</a>を動かすことです。このドライバはTLS対応で、クロスモジュールのコーデックレジストリを持ち、cancel/close/notifyをサポートし、今や<code>pg</code>、<code>postgres.js</code>、<code>tokio-postgres</code>に対してベンチマークを取っています。
      </p>
      <p>ドライバ側のパフォーマンス作業はコンパイラ側と並行しました：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>列ごとのコーデックをホイスト</strong>して、セルごとのBufferコピーを削除。中間割り当てを避けるためint8にはBigInt(string)。</li>
        <li><strong>オブジェクト形式の行用の動的なシェイプごとのRowコンストラクタ</strong>。クエリが常に同じ列を返すなら、ドライバは初回にシェイプ特化した行コンストラクタを構築して再利用します――これがコンパイラのPICと組み合わさると、行のフィールドアクセスが他のどんなオブジェクトのフィールドアクセスと同じくらい高速になります。</li>
        <li>int8/numeric/dateに生の文字列を望む呼び出し元のための<strong><code>parseTypes: &apos;minimal&apos;</code>オプトアウト</strong>。</li>
      </ul>
      <p>
        これはコンパイラが常に可能にすることを意図していた正のフィードバックループです。本物のドライバは本物のボトルネックを浮上させます。ボトルネックは1行のリプロデューサとしてGitHub issueにファイルされます。1週間のコンパイラ修正後、ドライバが速くなり、コンパイラは他のみんなにとっても速くなります。それが計画全体で、7日間に圧縮されています。
      </p>

      <h2>9. 名前を挙げるに値する正しさの修正</h2>
      <p>
        パフォーマンス作業は、川を浚渫するとスーパーのカートが浮かび上がるように、正しさの問題を浮上させます。部分的なリスト：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong>は拒否時に<code>.reason</code>の代わりに<code>.value</code>を読んでいたため、拒否が静かに飲み込まれていました（v0.5.13～v0.5.14）。</li>
        <li><strong>Promise.any</strong>は、すべての入力プロミスが拒否された場合に適切な<code>AggregateError</code>をスローするようになりました。<code>Promise.withResolvers</code>を追加し、<code>queueMicrotask</code>の順序を修正しました。</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong>は壊れたオブジェクトの代わりに文字の配列を生成するようになりました（#16クローズ）。</li>
        <li><strong>BigInt算術と<code>BigInt()</code>強制変換</strong>（#33クローズ）。i64 bigintファストパス（v0.5.29）が一般的なケースを安価にします。</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong>に数値のバイト引数を渡すと、バイト値の代わりにバッファポインタと比較していました（#56クローズ）。</li>
        <li><strong>NaN/Infinityを含むビット演算</strong>がToInt32仕様に従って0を生成するようになりました（#57クローズ）。</li>
        <li><strong>Windows x86_64</strong>：5つのプラットフォーム固有の修正――<code>localtime</code>、<code>clang</code>の検出、いくつかのcodegen調整――でWindows x86_64をグリーンに戻しました（v0.5.72）。</li>
      </ul>

      <h2>10. 数値</h2>
      <p>
        前回の記事の目玉ベンチマークは<code>factorial</code>で、Nodeより24.6倍高速でした。その数値は変わっていません。今週動いたのはその周辺すべてです：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (20-record schema)</td><td className="text-right py-2 px-3">547x Nodeより遅い</td><td className="text-right py-2 px-3">1.3x Nodeより遅い</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (4K 5×5 blur)</td><td className="text-right py-2 px-3">1,980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4.3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Property-heavy code (PIC hit)</td><td className="text-right py-2 px-3">baseline</td><td className="text-right py-2 px-3">2–3x</td><td className="text-right py-2 px-3 text-green-400">2–3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1.3x</td></tr>
            <tr><td className="py-2 px-3">Fastify uptime under load</td><td className="text-right py-2 px-3">クラッシュまで約60秒</td><td className="text-right py-2 px-3">無期限</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Node.jsに対する15個のフルベンチマークスイートは依然として14勝1引き分け――前回の記事と同じ表で、全体的にわずかに良い数値です。今週の本当の動きは、そのスイートに入っていなかったワークロード：JSON、画像処理、長時間実行サーバーにあります。ギャップが住んでいた場所で、それらこそ埋まったものです。
      </p>

      <h2>11. 次は何か</h2>
      <p>
        まだ追いかけている1つのベンチマークは<code>image_conv</code>対Zigです。Perryは457ms、Zigは246msです。そのギャップはアーキテクチャ的なもので、最適化パスレベルではなく、3つの場所に住んでいます：
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>型付きバッファローカル</strong>。Bufferの作業の大半は今週着地しましたが、buffer型の関数パラメータとローカルは依然としてアクセスごとにアンボックスします。ループカウンタに使っている<code>i64</code>スロット方式をバッファに拡張する必要があります。</li>
        <li><strong>内部/境界ループの分割</strong>。ブラーループはすべてのピクセル――クランプが不要な99.9%のピクセルも含めて――をクランプします。境界領域（クランプあり）と内部（クランプなし）に分割すると、LLVMがNEONの<code>ld3</code>/<code>st3</code>で内部をベクトル化できます。</li>
        <li><strong>ダブルABIのFNV-1aハッシュ</strong>。ハッシュヘルパーはNaN-box ABIを通して呼ばれます。ホットパス用に生のi64入出力に特化させるのは数時間の作業で、ハッシュ重視のすべてのワークロードで元が取れます。</li>
      </ol>
      <p>
        これらは<code>PERF_ROADMAP.md</code>で追跡しています。次のサイクルで見られることを期待してください。
      </p>

      <h2>まとめ</h2>
      <p>
        今週のパターン――68回のパッチリリース、ほぼすべてパフォーマンス、1つのJSONギャップが547倍から1.3倍へ――は、LLVMへの切り替えの丘の向こう側、良い側に渡ったときに起こることです。オプティマイザは今や壁ではなく味方であり、残っているものの大半は小さく、具体的で、測定可能な作業です：遅いパスを見つけ、なぜオプティマイザがそれを見通せないのか突き止め、構造を露出させ、再度測定する。これらのコミットのどれも特殊なものではありません。必要な場所で適用されているだけです。
      </p>
      <p>
        これらのいずれかを試してみたいなら：
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        ソース：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}― ドキュメント：<a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}― チェンジログ：<a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        issue、リプロデューサ、そして十分に速くないベンチマーク：どんどん送ってください。このペースが機能するのは、バグ報告が1行のリプロデューサに変えられるほど具体的だからです。この記事のすべてのコミットには理由があって<code>#N</code>が付いています。
      </p>
      <p>― Ralph</p>
    </>
  );
}
