import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Perry をはじめよう — インストールして TypeScript をネイティブへコンパイル",
  description:
    "Homebrew、APT、winget で Perry をインストールし、最初の TypeScript ファイルを 1 分足らずでネイティブ実行ファイルにコンパイルしましょう。Node.js は不要です。",
  breadcrumb: "はじめに",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">Perry</span> をはじめよう
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            ゼロから、動作するネイティブ実行ファイルまでたった3ステップ。Node.js
            も、バンドラも、ターゲットマシンにインストールするランタイムも不要です。
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            最初のバイナリを、ステップごとに
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Perry をインストールしたら、TypeScript をネイティブ実行ファイルに
            コンパイルするのはコマンド1つです。まずファイルを書きます。
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">hello.ts</span>
            </div>
            <pre className="text-sm text-slate-300">
              <code>{`const name = process.argv[2] ?? "World";
console.log(\`Hello, \${name}!\`);`}</code>
            </pre>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            コンパイルして実行してみましょう——出力されるのは自己完結型の
            マシンコードバイナリであり、バンドルされたスクリプトではありません。
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">terminal</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span> compile hello.ts
              </p>
              <p className="text-green-400">✓ Compiled executable: hello</p>
              <p>
                <span className="text-slate-500">$</span> ./hello Perry
              </p>
              <p className="text-slate-300">Hello, Perry!</p>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-12">
            そのバイナリは約1ミリ秒で起動し、同じ OS とアーキテクチャを持つ
            マシンならどこでも動作します——事前に何かをインストールする必要は
            ありません。詳しくは
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry が TypeScript をバイナリにコンパイルする仕組み
            </Link>
            や、
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript ネイティブコンパイラ
            </Link>
            の内部で何が起きているかをご覧ください。
          </p>

          <h2 className="text-2xl font-bold mb-6">次に見るべきもの</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                ドキュメント
              </h3>
              <p className="text-slate-400 text-sm">
                CLI、perry/ui ウィジェット、スレッド、i18n、そしてすべての
                コンパイルターゲットに関するガイドを docs.perryts.com で。
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Perry でコンパイルされ、App Store をはじめ各所で出荷されている
                実際のアプリたち。
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                比較
              </h3>
              <p className="text-slate-400 text-sm">
                Perry が Bun、Deno、Electron、Tauri、React Native、Static
                Hermes と比べてどうなのか。
              </p>
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                GitHub
              </h3>
              <p className="text-slate-400 text-sm">
                ソースコード、Issue、ディスカッション——Perry はオープンソース
                です。
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
