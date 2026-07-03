import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript をバイナリにコンパイルする（スタンドアロン実行ファイル）",
  description:
    "TypeScript をバイナリにコンパイル：Node.js 不要の 2–5 MB スタンドアロンネイティブ実行ファイル。Perry と bun build --compile、Node SEA の比較。",
  breadcrumb: "TypeScript をバイナリにコンパイル",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript を<span className="gradient-text">バイナリにコンパイル</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            コマンド1つで<code className="text-slate-300">main.ts</code>{" "}
            がスタンドアロンのネイティブ実行ファイルになります。ターゲット
            マシンに Node.js は不要、バンドルされたランタイムも不要、ユーザー
            側のインストール作業も不要です。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Perry をインストール
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

          <div className="max-w-2xl mx-auto text-left">
            <div className="code-block glow">
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs">terminal</span>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-slate-500">$</span>{" "}
                  <span className="text-cyan-400">perry</span> compile main.ts
                </p>
                <p className="text-green-400">
                  ✓ Compiled executable: main (2.3 MB)
                </p>
                <p className="mt-4">
                  <span className="text-slate-500">$</span> ./main
                </p>
                <p className="text-slate-300">Hello, World!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            &ldquo;TypeScript のコンパイル&rdquo;と呼ばれる3つのもの
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            開発者が「TypeScript をバイナリにコンパイルする方法」を調べると、
            同じ言葉を共有する3つのまったく異なる技術に行き当たるのが常です。
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">トランスパイル。</strong>{" "}
              <code className="text-slate-300">tsc</code>、SWC、esbuild は
              TypeScript を JavaScript に変換します。出力を実行するには
              依然として Node.js、Bun、あるいはブラウザが必要です。バイナリ
              は一切関与しません。
            </li>
            <li>
              <strong className="text-slate-300">ランタイム埋め込み。</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>、{" "}
              <code className="text-slate-300">deno compile</code>、そして
              Node.js の Single Executable Applications（SEA）は、バンドル
              された JavaScript をランタイム一式と連結します。1つのファイル
              にはなりますが、エンジンはその中に同梱されたままで、プロセス
              が起動するたびにコードはパースされ JIT コンパイルされます。
            </li>
            <li>
              <strong className="text-slate-300">
                事前（AOT）ネイティブコンパイル。
              </strong>{" "}
              これが Perry のやり方です。TypeScript は SWC でパースされ、
              型が解決され、ジェネリクスは単相化され、LLVM がマシンコードを
              出力します。リンカが生成するのは通常の実行ファイル——Rust、
              Go、C++ のツールチェーンが生成するのと同じ種類の成果物です。
              バイナリの中に JavaScript エンジンはまったく存在しません。
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            起動するエンジンも、起動時にパースするものもないため、Perry の
            バイナリは約1ミリ秒で起動します。パイプラインそのものについては
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript ネイティブコンパイラ
            </Link>
            のページと
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              コンパイラ内部構造
            </Link>
            でさらに詳しく説明しています。
          </p>

          <h2 className="text-2xl font-bold mb-6">バイナリの大きさは？</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            実際に使うコードだけがコンパイル・リンクされるため、サイズは
            何を取り込むかによって決まります。
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              hello world はおよそ{" "}
              <strong className="text-slate-300">330 KB</strong>。
            </li>
            <li>
              一般的な CLI ツールは{" "}
              <strong className="text-slate-300">2–5 MB</strong>に収まります。
            </li>
            <li>
              大きなフレームワーク（Fastify、mysql2 など）をリンクするフル
              アプリケーションでもおよそ{" "}
              <strong className="text-slate-300">48 MB</strong>です。
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            比較として：Node SEA の実行ファイルは{" "}
            <code className="text-slate-300">node</code>{" "}
            バイナリそのもののコピーであるため、コードを追加する前の時点で
            プラットフォームによっては約88–118 MBから始まり、Bun でコンパイル
            された hello world は macOS arm64 で約60 MB、Linux x64 で約100 MB
            前後になります——Bun ランタイム一式が丸ごと埋め込まれるためです。
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            3つとも、誰かに渡せる単一のファイルを生成します。それ以外の点
            ではまったく異なるツールであり、それぞれに正解となる相手が
            います。
          </p>
          <div className="overflow-x-auto mb-8 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">
                    Perry
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    bun build --compile
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    Node SEA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    生成されるもの
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    AOT コンパイル済みマシンコード（LLVM）
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    バンドルされた JS + 埋め込み Bun ランタイム
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    バンドルされたスクリプトを注入した node バイナリのコピー
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    実行モデル
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ネイティブコード、JS エンジンなし
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    実行時に JIT（JavaScriptCore）
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    実行時に JIT（V8）
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    hello world のサイズ
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB（macOS arm64）〜100 MB超（Linux/Windows）
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB（node バイナリのサイズ）
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    起動時間
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    クロスコンパイル
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10ターゲット、Linux から Windows/macOS/iOS への
                    クロスコンパイルを含む
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    可能——--target 経由で Linux、Windows、macOS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    不可——代わりにプラットフォームごとの node バイナリを
                    コピーする
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    JS / npm 互換性
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    拡大中：axios、zod v4、express、fastify、hono は
                    ネイティブにコンパイル可能。それ以外はオプションの
                    V8 フォールバック
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    完全——Bun ランタイムそのものなので
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    完全な Node セマンティクス。事前バンドルが必要、
                    Node 24 LTS では CommonJS のみ
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    ステータス
                  </td>
                  <td className="px-4 py-3 text-slate-400">1.0 未満</td>
                  <td className="px-4 py-3 text-slate-400">安定版</td>
                  <td className="px-4 py-3 text-slate-400">
                    Node 24 LTS では&ldquo;Active development&rdquo;の
                    安定度
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            正直な整理をすると：アプリケーションが npm エコシステム全体に
            依存していて互換性リスクをゼロにしたいなら、Bun と Node SEA は
            すでに開発対象としているエンジンのセマンティクスをそのまま実行
            します——それが彼らの強みであり、デプロイ先によってはサイズの
            コストは問題にならないかもしれません。Perry は違う賭けです。
            真の事前コンパイル、小さなバイナリ、ミリ秒単位の起動を手に
            入れる代わりに、V8 から受け継いだものではなく計測・公開されて
            いる（test262：String 79%、Array 72%、v0.5.1146 時点）1.0 未満
            のコンパイラを採用することになります。
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            詳しい比較：
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            と
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            。npm パッケージがどのようにコンパイルされるかについては、
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Real npm packages and a conformance sweep
            </Link>
            を参照してください。
          </p>
        </article>
      </section>

      {/* Benchmark table (shared section) */}
      <Performance />

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              今日、最初のバイナリをコンパイルしよう
            </h2>
            <p className="text-slate-400 mb-6">
              Homebrew、APT、winget でインストールしたら、あとは{" "}
              <code className="text-slate-300">perry compile main.ts</code>
              だけです。
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
