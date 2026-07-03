import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript ネイティブコンパイラ：Perry が TS をマシンコードにコンパイルする仕組み",
  description:
    "Perry は Rust で書かれた TypeScript ネイティブコンパイラです：SWC パース、型付き HIR、単相化、LLVM コード生成。VM なしで 10 プラットフォーム向けのネイティブバイナリを出力します。",
  breadcrumb: "TypeScript ネイティブコンパイラ",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript ネイティブコンパイラ、{" "}
            <span className="gradient-text">Rust で構築</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry は、あなたが今書いている TypeScript をマシンコードへ
            コンパイルします——Rust や Go のツールチェーンが自らの言語を
            コンパイルするのと同じやり方です。トランスパイルされた
            JavaScript も、仮想マシンも、ターゲットシステム上のランタイム
            も不要です。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/getting-started" className="btn-primary">
              はじめる
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              GitHub で見る
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            トランスパイラではなく、ランタイムでもない。
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            ほとんどの TypeScript ツールは2つの系統に分かれます。トランス
            パイラ——<code className="text-slate-300">tsc</code>、SWC、
            esbuild——は型をチェックして取り除き、あとでエンジンが実行する
            ための JavaScript を出力します。ランタイム——Node.js、Bun、
            Deno——はそのエンジンそのものです。プログラムが起動するたびに
            JavaScript をパースし、解釈し、JIT コンパイルします。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            ネイティブコンパイラは3つ目の系統であり、TypeScript においては
            これまでほぼ空白でした。Perry は型注釈を、取り除かれるべき
            ドキュメントとしてではなく、コード生成を駆動する入力として
            扱います。
            <code className="text-slate-300">perry compile main.ts</code>{" "}
            の結果は、マシンコードを含むスタンドアロンの実行ファイルです——
            通常
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB、起動は約1ミリ秒
            </Link>
            です。
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">パイプラインを、段階ごとに</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">パース（SWC）。</strong>{" "}
              ソースファイルは Rust ネイティブの TypeScript パーサーである
              SWC でパースされるため、大きなプロジェクトでもミリ秒単位で
              パースが終わります。モジュールのコード生成、変換パス、
              シンボルスキャンはすべて複数コアにまたがって並列に実行され
              ます。
            </li>
            <li>
              <strong className="text-slate-300">型解決。</strong>{" "}
              コンパイラは宣言された型を解決し、残りを推論することで、コード
              生成が始まる前にすべての式に具体的な型を与えます。
            </li>
            <li>
              <strong className="text-slate-300">
                型付き HIR と単相化。
              </strong>{" "}
              AST は型付きの高レベル IR へと下げられます。ジェネリックな
              関数やクラスは単相化されます——
              <code className="text-slate-300">{`Stack<number>`}</code>{" "}
              のようなインスタンス化はそれぞれ具体的な型で個別にコンパイル
              されるため、ジェネリクスは実行時に一切コストがかかりません。
              型が判明している箇所では、メソッド呼び出しは静的ディスパッチ
              になり、オブジェクトのフィールドは直接的な固定オフセット
              ロードになります。
            </li>
            <li>
              <strong className="text-slate-300">コード生成（LLVM）。</strong>{" "}
              HIR は LLVM IR へと下げられ、インライン化、ループ最適化、
              ベクトル化といった LLVM の最適化パイプラインを通過したのち、
              ターゲット向けのマシンコードとして出力されます。
            </li>
            <li>
              <strong className="text-slate-300">リンク。</strong>{" "}
              出力されるのは通常のプラットフォーム実行ファイルです：
              macOS では Mach-O、Linux では ELF、Windows では PE——
              加えてモバイル、ウォッチ、TV、WebAssembly の各ターゲットも
              あります。
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            このうち LLVM に関わる部分——なぜ Cranelift ではなく LLVM が
            選ばれたのか、NaN-boxing がどのように動的な値を表現するのか、
            オプティマイザが型付き IR に対して何を行うのか——には専用の
            深掘り記事があります：
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              LLVM 上の TypeScript
            </Link>
            。NaN-boxing、静的ディスパッチ、ゼロコスト抽象化といった実装の
            詳細は
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              コンパイラ内部構造
            </Link>
            で解説しています。
          </p>

          <h2 className="text-2xl font-bold mb-6">
            動的なコードや npm はどうなるのか？
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript は根底では依然として JavaScript であり、ネイティブ
            な TypeScript コンパイラはその点について正直でなければなり
            ません。Perry の test262 公式スイートに対する準拠度は計測・
            公開されています——v0.5.1146 時点で、String のセマンティクスは
            79%、Array は72%で、いずれもリリースを重ねるごとに上昇して
            います。純粋な TypeScript / JavaScript の npm パッケージは
            <code className="text-slate-300">perry.compilePackages</code>{" "}
            を通じてネイティブにコンパイルされます：axios、zod v4、
            express、fastify、hono は今日時点でコンパイルして実行できます。
            完全なエンジンセマンティクスを必要とするコードは、
            <code className="text-slate-300">--enable-js-runtime</code>{" "}
            で組み込み V8 フォールバックを利用できます。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            詳しい経緯は
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
            </Link>
            にまとめています。
          </p>

          <h2 className="text-2xl font-bold mb-6">
            他の&ldquo;ネイティブ TypeScript&rdquo;の取り組みとの関係
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript の型注釈にコンパイルの可能性を見出したのは Perry
            だけではありません——ただし、そのアプローチは大きく異なります。
            AssemblyScript は厳格な TypeScript ライクな言語を WebAssembly
            のみへコンパイルします：意図的に JavaScript とは互換性がなく、
            OS の実行ファイルもネイティブ UI も生成しません。Meta の
            Static Hermes は、主に React Native 向けに、型付き
            JavaScript サブセットを Hermes エンジン内で事前コンパイル
            します——2026年半ば時点では依然としてソースからのビルドが
            必要な研究プロジェクトであり、実際に React Native に出荷
            された Hermes V1 エンジンには静的コンパイル機能は含まれて
            いません（
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              詳細な比較
            </Link>
            ）。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perry の賭けはどちらの軸でも異なります。標準的な TypeScript
            を入力言語とし、CLI、サーバー、GUI といった通常のプラット
            フォーム実行ファイルを出力とすること——それは Homebrew、
            APT、winget、npm を通じて今日インストールできます。
          </p>

          <h2 className="text-2xl font-bold mb-6">1つのコンパイラ、10のターゲット</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            コード生成が LLVM を経由するため、1つのコードベースが
            macOS、iOS、iPadOS、Android、Linux、Windows、watchOS、tvOS、
            WebAssembly、そして通常の Web/JS にコンパイルされます——
            Linux マシンから Windows、macOS、iOS 向けバイナリをクロス
            コンパイルすることも含まれます。GUI アプリは
            <code className="text-slate-300">perry/ui</code>{" "}
            を使用します。これは本物のプラットフォームウィジェット
            （AppKit、UIKit、GTK4、Win32、JNI 経由の Android）の上に
            構築された宣言的な API であり、webview は一切関与しません。
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            他のアプローチと比べてどうなのか：
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun、Deno、Electron、Tauri、React Native、Static
              Hermes
            </Link>
            。
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              コンパイラを試してみよう
            </h2>
            <p className="text-slate-400 mb-6">
              Perry をインストールして、1分足らずで最初のネイティブバイナリ
              をコンパイルしましょう。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                はじめる
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                ドキュメントを読む
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
