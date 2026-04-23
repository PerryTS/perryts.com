export default function Content() {
  return (
    <>
      <p>
        前回の記事はPerry v0.5.80で締めくくられ、ベンチマーク表には1つの頑固な負けが残っていました――<code>JSON.parse</code>/<code>stringify</code>のラウンドトリップは依然としてNodeより1.6倍遅い状態でした。6日後、Perryは<strong>v0.5.174</strong>に到達しました――これは<strong>94回のパッチリリース</strong>です――そして他の何よりも先に取り上げるに値する3つの変化がありました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code>が<strong>npm</strong>で出荷されました。1つのコマンドで、サポートされているすべてのプラットフォームにPerryをインストールできます。</li>
        <li><strong><code>perry dev</code></strong>はウォッチモードでの自動再コンパイルを追加します。その上に、新しいインメモリASTキャッシュとディスク上のモジュール単位のオブジェクトキャッシュがあります。</li>
        <li><code>json_roundtrip</code>の負けが埋まりました。Perryはメインスイート内のすべてのベンチマークで<strong>NodeとBunの両方に勝つ</strong>ようになりました（両者に対して15/15）。</li>
      </ul>
      <p>
        記事の残りは脇役です：WebAssemblyの修正、watchOSがついにエンドツーエンドでコンパイルできるようになったこと、<code>perry/thread</code>プリミティブの残りの配線、そして静かな脱落を本物のエラーに変える一連のコンパイル時厳密性の勝利。
      </p>

      <h2>1. npm上の<code>@perryts/perry</code></h2>
      <p>
        Perryは常にmacOSではHomebrew、Debian/UbuntuではAPT経由でインストールされてきました。これらのプラットフォームの開発者には良いカバレッジでしたが、ソースからビルドしない限りWindowsユーザーには何もなく、MacとLinuxとWindowsが混在するチームにとっては何も統一されていませんでした。v0.5.107がその問題を解消しました。
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        パッケージは薄いランチャーで、7つのプラットフォーム別オプションパッケージに依存しています――macOS arm64/x64、Linux x64/arm64（glibcとmuslの両方）、Windows x64――そしてnpmはあなたのマシンに一致する1つだけをインストールします。プラットフォームごとのバイナリサイズは数メガバイト程度です。インストール自体は数秒です。グローバルインストールのパスもあります（<code>npm install -g @perryts/perry</code>）――そちらを好むなら使えますが、プロジェクトローカルインストールは依存関係の隣にコンパイラのバージョンを固定するため、そちらが正しいデフォルトです。
      </p>
      <p>
        公開はOIDC Trusted Publisherを通じて行われたので、すべてのリリースにプロビナンスが付与され、それをビルドしたCIジョブに紐づけられています。それ自体が1日分のCI作業でした――正しい<code>--provenance</code> / npmバージョン / ワークフローパスの組み合わせを追いかける<code>v0.5.107</code>のCIコミットがいくつかありましたが――実現し、それ以降のすべてのリリースはクリーンです。Windowsユーザーは今や一級市民であり、「OSが好む方法でインストールしてください」というチーム間の摩擦は消えました。
      </p>

      <h2>2. <code>perry dev</code>――ウォッチモード</h2>
      <p>
        v0.5.143で新しいCLIサブコマンドが追加されました：
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        これだけです。プロジェクトを監視し、保存時に再コンパイルし、バイナリを再起動します。インスピレーションはViteと<code>nodemon</code>です。狙いは、コンパイラからバイナリへのワークフローがランタイムより遅く感じる必要があるかのように振る舞うのをやめることです。ほとんどのプロジェクトでは、<code>perry dev</code>はウォームキャッシュで1秒未満で再ビルドします。
      </p>
      <p>
        「ウォームキャッシュ」の部分が重要です。<code>perry dev</code>と並行して2つの新しいキャッシュが着地しました：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>インメモリASTキャッシュ</strong>（v0.5.156）。単一の<code>perry dev</code>セッション内での再ビルドをまたいで、Perryはディスク上で変更されていないすべてのモジュールのパース済みASTを保持します。1つのファイルを編集すると、モジュールグラフ全体ではなく1つのファイルだけが再パースされます。
        </li>
        <li>
          <strong>ディスク上のモジュール単位オブジェクトキャッシュ（V2.2）</strong>。各モジュールは独自の<code>.o</code>ファイルにコンパイルされ、ハッシュが取られます。変更されていないモジュールはcodegenを完全にスキップし、リンカはキャッシュされたオブジェクトを拾います。キャッシュの詳細出力は<a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>の仕様と一致しており、v0.5.160での監査ハードニングのラウンドで、ヘッダー変更を生き延びる可能性のあった古いキャッシュエントリのエッジケースが閉じられました。
        </li>
      </ul>
      <p>
        2つのキャッシュは積み重なります。セッションの最初の編集はフルコンパイルですが、それ以降はあなたが実際に変更したものに比例する作業だけを行います。これは今週の単独で最大のDXの転換点です。
      </p>

      <h2>3. すべてのベンチマークでBunに勝つ</h2>
      <p>
        v0.5.166の時点で、READMEには1つの正直な注意書きがありました：Perryは<code>json_roundtrip</code>（1MBで10K項目のブロブに対する50回の<code>JSON.parse</code> + <code>JSON.stringify</code>）でNodeより1.6倍遅く、Bunより2.4倍遅いと。Issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a>がフォローアップを追跡していました。v0.5.173までに――7日後――そのギャップが埋まりました。
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perryは今やメインベンチマークスイートのすべてのワークロードで勝っています――<strong>Nodeに対して15/15、Bunに対して15/15</strong>、macOS ARM64で5回実行のベスト。Bun 1.3は依然としてピークRSSで先行しています（<code>json_roundtrip</code>でPerryの310MBに対して84MB）。なのでアロケータ圧が次に閉じるべきものですが、生のレイテンシはPerryのものです。
      </p>
      <p>
        JSONギャップの解消は1つの変更ではありませんでした――今週を通じて進められたオブジェクトレイアウト同等性作業の積み重ねでした：Phase 1のオブジェクトリテラル形状推論（v0.5.167）、自由関数、クラスメソッド、ゲッター、アロー関数に対するPhase 4の本体ベースの戻り値型推論（v0.5.169）、Phase 4.1のメソッド呼び出し戻り値型推論（v0.5.170）。テーマは前回の記事と同じです：LLVMに見通せるだけの静的構造を与えれば、オプティマイザが残りを片付ける。
      </p>
      <p>
        v0.5.164は<code>&lt;2 x double&gt;</code>並列アキュムレータの自動ベクトル化を純粋なfadd縮約ループで復元しました――これはv0.5.9x→v0.5.16xの範囲のどこかで静かにリグレッションしていたものです。これが<code>math_intensive</code>と<code>accumulate</code>をRust/C++/Go/Swiftに対する以前の3～4倍のリードに戻したものです――同じLLVM、1つの<code>reassoc contract</code>フラグ、1つのベクトル化されたループ本体。
      </p>

      <h2>4. <code>perry/ui</code>とドキュメントテスト</h2>
      <p>
        perry/uiに残っていた4つのギャップがv0.5.151で閉じられました。それと並行して、v0.5.119は静かなperry/ui APIの誤用を「コンパイルして何もしない」から本物のコンパイルエラーに切り替えました――v0.5.165の同じロジックがデコレータに適用されたのと同じです（以下参照）。誤用がコンパイル時に表面化することは、ランタイムよりも常に優れています。
      </p>
      <p>
        v0.5.123は<strong>ドキュメント例テストハーネス</strong>とウィジェットギャラリーを出荷しました。ドキュメント内のすべてのTypeScript例は、CI実行のたびにコンパイルされるようになり、ウィジェットギャラリーはスクリーンショットを承認済みベースラインと比較します。v0.5.125はそれをクロスコンパイルマトリックスに拡張しました：すべてのドキュメント例がホストプラットフォームだけでなくiOS、tvOS、Android、WASM、Web向けにもビルドされるので、ターゲットをまたいだAPIドリフトは、それを出荷したリリースサイクルではなく、それを導入したPRで捕捉されます。
      </p>
      <p>
        小さなQoLの勝利：<code>perry check</code>はHIR低下エラーに対して<code>file:line:column</code>を出すようになりました（<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>）。これはエディタのジャンプ・トゥ・エラーが機能することを意味します――場所のない一般的なメッセージを表示する代わりに。
      </p>

      <h2>5. watchOSがエンドツーエンドでコンパイル</h2>
      <p>
        watchOSは先月コンパイルターゲットとして出荷されましたが、クリーンなエンドツーエンドビルドには粗いエッジがいくつかありました。今週のwatchOS作業：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>：<code>--target watchos</code>と<code>--target watchos-simulator</code>が、蓄積されていた回避策なしでエンドツーエンドでコンパイルできるようになりました。</li>
        <li><strong>v0.5.114</strong>：Metalサーフェスアプリ用の<code>--features watchos-game-loop</code>。</li>
        <li><strong>v0.5.122</strong>：SwiftUIホストレンダリング用の<code>--features watchos-swift-app</code>――SwiftUIにアプリのライフサイクルを所有させ、Perryにその中のUIを構成させたい場合用です。</li>
        <li><strong>v0.5.135</strong>：<code>PERRY_UI_TEST_MODE</code>がperry-ui-iosとperry-ui-tvosに配線されたので、Geisterhand UIテストはこの2つのターゲットでもmacOSとLinuxと同じように実行されます。</li>
      </ul>

      <h2>6. <code>perry/thread</code>プリミティブが完全配線</h2>
      <p>
        v0.5.174（本日）は<a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>を閉じました：<code>parallelMap</code>、<code>parallelFilter</code>、<code>spawn</code>がcodegenパスを通じて完全に配線され、コンパイル時の安全性が強制されます。ミュータブルキャプチャはコンパイル時に拒否されます――perry/uiとデコレータが今持っているのと同じコンパイル時正しさの姿勢です。v0.4.0の発表以来部分的に配線されていたスレッドプリミティブが、エンドツーエンドで完成しました。
      </p>

      <h2>7. WebAssemblyとWebターゲット</h2>
      <p>
        取り上げるに値する2つのWASM修正：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>：<code>--target web</code>（WASM出力パス）の5つの相互にマスクし合う複合バグ。バッチで修正され、Webターゲットは今や完全な<code>perry/ui</code>サーフェスの下で持ちこたえます（<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>）。</li>
        <li><strong>v0.5.161</strong>：ループ内の<code>if</code>内の<code>break</code>/<code>continue</code>がWASMでハングしていました――ネイティブターゲットでは再現しなかったcodegenバグです。修正済み（<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>）。</li>
      </ul>
      <p>
        また正しさ面で：v0.5.157はAndroidで<code>obj.field</code>が<code>NaN</code>を返す問題を修正しました（<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>）。v0.5.162は<code>sendToClient</code>と<code>closeClient</code>が静かなno-opにコンパイルされていた呪われたwsバグを修正しました（<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>）。
      </p>

      <h2>8. コンパイル時厳密性の勝利</h2>
      <p>
        今週のテーマ：以前は静かな失敗だったものはすべてコンパイルエラーになりました。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>：TypeScriptデコレータはHIRにパースされた後、静かに落とされていました。今ではデコレーションポイントで明確なメッセージとともにエラーになります（<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>）。v0.5.119でperry/uiに適用されたのと同じwarn→bailの推論です。</li>
        <li><strong>v0.5.119</strong>：perry/ui APIの誤用は、no-opバイナリを生成する代わりにコンパイル時に拒否されます。</li>
        <li><strong>v0.5.172</strong>：<code>console.trace()</code>は、単にメッセージをエコーする代わりに、本物のネイティブバックトレースをstderrに出すようになりました（<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>）。シンボル化されたフレームには<code>PERRY_DEBUG_SYMBOLS=1</code>が必要です。それなしではアドレスが得られますが、それでも置き換えられたメッセージエコー動作よりは多いです。</li>
      </ul>

      <h2>9. まとめ</h2>
      <p>
        今週のパターン：<strong>配布</strong>（npm）、<strong>開発者体験</strong>（<code>perry dev</code>、インクリメンタルキャッシュ）、そして<strong>残っていた最後のベンチマーク敗北が閉じた</strong>こと。加えて、静かな脱落を本物のエラーに変える一連のコンパイル時厳密性。6日間、94回のパッチリリース、1つの大きなDXシフト。
      </p>
      <p>
        試してみてください：
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev`}</code></pre>
      <p>
        ソース：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}― ドキュメント：<a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}― チェンジログ：<a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>― Ralph</p>
    </>
  );
}
