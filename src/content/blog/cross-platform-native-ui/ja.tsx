import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry の最も野心的な目標の1つは、単一の TypeScript コードベースから真にネイティブな GUI アプリケーションを
        提供することです。ネイティブシェルにラップされた Web ビューではありません。独自のピクセルを描画する
        カスタムレンダリングエンジンでもありません。各プラットフォーム独自の UI フレームワークによってレンダリングされる
        本物のネイティブウィジェットを、ビルド時に TypeScript からコンパイルします。
      </p>
      <p>
        この記事では、その仕組み — アーキテクチャ、プラットフォームマッピング、トレードオフ、
        そして現在の状況について説明します。
      </p>

      <h2>現在のアプローチの問題点</h2>
      <p>
        クロスプラットフォーム GUI 開発は数十年にわたって難しい問題でした。すべての主要な
        フレームワークが異なる妥協を行ってきました：
      </p>

      <h3>Electron / Tauri（Web ベース）</h3>
      <p>
        Electron は Chromium と Node.js をバンドルし、Web ブラウザをアプリシェルとして提供します。
        Web プラットフォームへの完全なアクセスが得られますが、「ネイティブ」アプリは 150+ MB の
        ダウンロードで、ウィンドウを表示するだけで数百 MB の RAM を使用します。Tauri は
        Chromium を OS の Web ビューに置き換え、サイズを大幅に削減しますが、UI は依然として Web ビューで
        レンダリングされる HTML/CSS であり、ネイティブウィジェットではありません。
      </p>

      <h3>React Native（ブリッジベース）</h3>
      <p>
        React Native は JavaScript を JS エンジン（Hermes または V8）で実行し、シリアライズされた
        メッセージキューを通じてネイティブウィジェットにブリッジします。本物のネイティブウィジェットが得られますが、
        ブリッジはジェスチャーやアニメーションにおいてレイテンシーを追加します。複雑なインタラクションには
        ネイティブコード（Swift/Kotlin）に降りる必要があり、単一コードベースの約束を台無しにします。
      </p>

      <h3>Flutter（カスタムレンダラー）</h3>
      <p>
        Flutter は Dart をネイティブコードにコンパイルし、独自の Skia ベースのレンダリングエンジンで
        すべてを描画します。パフォーマンスは優れていますが、ウィジェットはネイティブではありません —
        ピクセルパーフェクトなレプリカです。つまり、プラットフォームの慣習（スクロール物理、テキスト選択、
        アクセシビリティの動作）は継承するのではなく再実装する必要があります。デスクトップでは
        その違いがより目立ちます。
      </p>

      <h3>KMP + Compose Multiplatform（部分的ネイティブ）</h3>
      <p>
        Kotlin Multiplatform は Android では JVM に、iOS ではネイティブにコンパイルしますが、
        Compose Multiplatform を通じた共有 UI はカスタム Skia ベースのレンダラーを使用します — Flutter と同じ
        トレードオフです。真にネイティブな UI のためには、プラットフォーム固有のコードを書くことに戻ります。
      </p>

      <h2>Perry のアプローチ：ネイティブツールキットへのコンパイル</h2>
      <p>
        Perry は根本的に異なるアプローチを取ります。ランタイムでコードを実行してネイティブウィジェットに
        ブリッジしたり、カスタムピクセルを描画する代わりに、Perry は TypeScript の UI コードを
        ビルド時に各プラットフォームのネイティブツールキットへの呼び出しに直接コンパイルします。
      </p>
      <p>
        重要な違い：<strong>コードとプラットフォーム SDK の間にランタイムレイヤーがありません。</strong>{" "}
        コンパイルされたバイナリは AppKit、UIKit、Android Views、GTK4、Win32 を直接呼び出します。
        Swift、Kotlin、C++ で書かれたアプリとまったく同じです。
      </p>

      <h2>統一 UI API</h2>
      <p>
        Perry はユーザーインターフェースを構築するための共通 TypeScript API を提供します。この API は
        意図的に高レベルです — UI に何を含め、どのように動作すべきかを記述すると、
        Perry が適切なネイティブ構成にマッピングします。
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        同じコードが6つのプラットフォームすべてでネイティブ UI にコンパイルされます。<code className="text-perry-400">#ifdef</code> なし、
        プラットフォームチェックなし、条件付きインポートなし。
      </p>

      <h2>プラットフォームマッピングの詳細</h2>
      <p>
        Perry が統一 API を各プラットフォームのネイティブフレームワークにどのようにマッピングするかを説明します：
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        macOS では、Perry は AppKit オブジェクトを直接作成・管理するコードを生成します。
        <code className="text-perry-400">App</code> は <code className="text-perry-400">NSWindow</code> を持つ
        <code className="text-perry-400">NSApplication</code> になります。{" "}
        <code className="text-perry-400">Text</code> は <code className="text-perry-400">NSTextField</code>（編集無効）になります。{" "}
        <code className="text-perry-400">Button</code> はコールバックに接続された target-action パターンを持つ
        <code className="text-perry-400">NSButton</code> になります。{" "}
        <code className="text-perry-400">VStack</code> は垂直方向の <code className="text-perry-400">NSStackView</code> になります。
        レイアウトには Auto Layout 制約を使用します。
      </p>
      <p>
        コンパイルされたバイナリは AppKit フレームワークにリンクし、Objective-C ランタイム関数を
        直接呼び出します。Xcode でコンパイルされた Swift と同じことをしています。
      </p>

      <h3>iOS と iPadOS — UIKit</h3>
      <p>
        iOS では、マッピングは同様ですが UIKit をターゲットにします。{" "}
        <code className="text-perry-400">App</code> は <code className="text-perry-400">UIWindow</code> と
        ルート <code className="text-perry-400">UIViewController</code> を持つ
        <code className="text-perry-400">UIApplication</code> になります。{" "}
        <code className="text-perry-400">Text</code> は <code className="text-perry-400">UILabel</code> にマッピングされます。{" "}
        <code className="text-perry-400">Button</code> は <code className="text-perry-400">UIButton</code> にマッピングされます。{" "}
        レイアウトには <code className="text-perry-400">UIStackView</code> と Auto Layout を使用します。
        タッチイベントは UIKit のレスポンダチェーンを通じて処理されます。
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        Android では、Perry は JNI（Java Native Interface）を介してロードされるネイティブライブラリを生成します。{" "}
        <code className="text-perry-400">App</code> は <code className="text-perry-400">Activity</code> にマッピングされます。{" "}
        <code className="text-perry-400">Text</code> は <code className="text-perry-400">TextView</code> になります。{" "}
        <code className="text-perry-400">Button</code> は <code className="text-perry-400">OnClickListener</code> 付きの
        <code className="text-perry-400">android.widget.Button</code> になります。{" "}
        <code className="text-perry-400">VStack</code> は垂直 <code className="text-perry-400">LinearLayout</code> にマッピングされます。
        ネイティブコードは JNI を通じて Android フレームワークを呼び出し、実際の Android ビューを
        作成・操作します。
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        Linux では、Perry は GTK4 をターゲットにします。{" "}
        <code className="text-perry-400">App</code> は <code className="text-perry-400">GtkApplicationWindow</code> を持つ
        <code className="text-perry-400">GtkApplication</code> になります。{" "}
        <code className="text-perry-400">Text</code> は <code className="text-perry-400">GtkLabel</code> にマッピングされます。{" "}
        <code className="text-perry-400">Button</code> はシグナルハンドラ付きの
        <code className="text-perry-400">GtkButton</code> にマッピングされます。{" "}
        <code className="text-perry-400">VStack</code> は垂直方向の <code className="text-perry-400">GtkBox</code> にマッピングされます。
        GTK の CSS テーマ機能により、アプリはユーザーのデスクトップテーマに自動的に従います。
      </p>

      <h3>Windows — Win32</h3>
      <p>
        Windows では、Perry は Win32 API 呼び出しを生成します。{" "}
        <code className="text-perry-400">App</code> はウィンドウクラスを作成して登録し、メッセージループを実行します。{" "}
        <code className="text-perry-400">Button</code> は <code className="text-perry-400">CreateWindowEx</code> で作成された
        <code className="text-perry-400">BUTTON</code> コントロールになります。{" "}
        <code className="text-perry-400">Text</code> は <code className="text-perry-400">STATIC</code> コントロールにマッピングされます。
        イベントは Win32 メッセージポンプ（<code className="text-perry-400">WM_COMMAND</code>、{" "}
        <code className="text-perry-400">WM_NOTIFY</code> など）を通じて処理されます。
      </p>

      <h2>状態管理</h2>
      <p>
        Perry の <code className="text-perry-400">State&lt;T&gt;</code> プリミティブは、プラットフォームネイティブの
        更新メカニズムにコンパイルされるリアクティブな状態管理を提供します。状態値が変更されると、
        Perry はプラットフォーム独自の無効化システムを通じて UI 更新をトリガーします — macOS/iOS では
        <code className="text-perry-400">setNeedsDisplay</code>、Android では{" "}
        <code className="text-perry-400">invalidate()</code>、Linux では{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code>。
      </p>
      <p>
        仮想 DOM の差分比較も、リコンシリエーションパスも、シリアライゼーションもありません。
        状態変更は値を表示するネイティブウィジェットに直接伝播します。
      </p>

      <h2>なぜ SwiftUI / Jetpack Compose の構文ではないのか？</h2>
      <p>
        Perry が SwiftUI や Jetpack Compose に似た宣言的構文を使わないのはなぜかと
        思うかもしれません。答えは実用的です：Perry は TypeScript をコンパイルし、TypeScript には
        固有のイディオムがあります。TypeScript 開発者にとって違和感のある DSL を発明するのではなく、
        Perry は TypeScript で自然に感じられるビルダースタイルの API を使用します — コンストラクタ、
        メソッド呼び出し、コールバック、クロージャ。Express、React フック、その他の TypeScript
        ライブラリで既に使っているのと同じパターンです。
      </p>

      <h2>現在利用可能なもの</h2>
      <p>
        6つのプラットフォームバックエンドはすべて実装済みで安定しています。現在のウィジェットセット：
      </p>
      <ul className="list-disc list-inside">
        <li><strong>レイアウト</strong> — VStack、HStack、Spacer、ScrollView、Divider</li>
        <li><strong>表示</strong> — Text、Image</li>
        <li><strong>入力</strong> — Button、TextField、Toggle、Slider</li>
        <li><strong>ナビゲーション</strong> — NavigationView、TabView、List</li>
        <li><strong>コンテナ</strong> — TreeView、SearchBar、StatusBar</li>
        <li><strong>状態</strong> — リアクティブ更新のための State&lt;T&gt;</li>
      </ul>

      <h2>今後の予定</h2>
      <p>
        ウィジェットライブラリを積極的に拡張しています。次に予定されているもの：
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — プラットフォームネイティブのセキュアテキスト入力によるパスワード入力</li>
        <li><code className="text-perry-400">ProgressView</code> — 確定・不確定プログレスインジケータ</li>
        <li><code className="text-perry-400">Alert</code> — ボタンとテキストフィールド付きのネイティブアラートダイアログ</li>
        <li><code className="text-perry-400">DatePicker</code> — プラットフォームネイティブの日付/時刻選択</li>
        <li><code className="text-perry-400">Menu</code> — ネイティブメニューバーとコンテキストメニュー</li>
      </ul>
      <p>
        目標はすべてのプラットフォームで完全な GUI フレームワークパリティを達成することです — すべてのウィジェット、
        レイアウト、ジェスチャー、アニメーションがどこでも利用可能に。全体像は{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">ロードマップ</Link>をご覧ください。
      </p>

      <h2>試してみよう</h2>
      <p>
        Perry のネイティブ UI を理解する最良の方法は、実際に動作しているのを見ることです。{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> は Perry で
        完全に TypeScript で構築されたネイティブ JSON ビューアです — ツリーナビゲーション、検索、
        キーボードショートカットを備えた実際のアプリで、macOS、iOS、Android のネイティブバイナリに
        コンパイルされています。構築方法の{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">完全なウォークスルー</Link>{" "}
        をお読みください。
      </p>
    </>
  );
}
