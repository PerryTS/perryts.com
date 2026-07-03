import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript のための Electron 代替：Perry vs Tauri vs Bun",
  description:
    "TypeScript で Electron の代替を探していますか？Electron、Tauri、Bun ベースの手法、そして Perry を、バイナリサイズ、メモリ、UI スタック、言語で比較します。",
  breadcrumb: "TypeScript のための Electron 代替",
};

export default function Content() {
  return (
    <>
            <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            比較一覧に戻る
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              TypeScript 開発者のための Electron 代替
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron はデスクトップアプリを Web 開発者にとって身近なもの
            にしましたが、そのサイズとメモリのコストは「Electron 代替」を
            定番の検索キーワードにしました。TypeScript を言語として使う
            なら、2026年時点で現実的な道は4つあります：Electron に留まる、
            Tauri へ移行する、Bun でランタイム埋め込みのバイナリを作る、
            あるいは Perry でネイティブへコンパイルする。それぞれがまった
            く異なるトレードオフを取ります。
          </p>

          <h2 className="text-2xl font-bold mb-6">4つのアプローチ</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron——基準点
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                すべてのアプリに Chromium と Node.js を同梱します。長所は
                10年に及ぶ本番実績と、チームがすでに知っている UI スタック
                （HTML/CSS/JS）です——VS Code、Slack、Discord もこの上で
                動いています。短所はその基準コストです：hello world の
                インストーラでおよそ80–150 MB、複数の Chromium プロセス、
                アイドル時に数百 MB の RAM。デスクトップ専用です。
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perry vs Electron の詳細な比較
                </Link>
                。
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri——システム webview 内の Web UI、Rust バックエンド
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri は Web フロントエンドを維持しつつ、同梱の Chromium
                を捨てます：UI は OS の webview（WKWebView、WebView2、
                WebKitGTK）内で描画されるため、インストーラは一桁台の
                MB に収まります。安定しており、ドキュメントも充実して
                おり、Tauri 2 では iOS/Android が追加されました。トレード
                オフは、バックエンドが TypeScript ではなく Rust であり、
                UI を超えたアプリロジックには Rust を書いて IPC ブリッジ
                を越える必要があること、そして各 OS が異なる webview を
                提供するためレンダリングがプラットフォームごとにわずかに
                異なることです。
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perry vs Tauri の詳細な比較
                </Link>
                。
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun——シングルファイルバイナリ、GUI レイヤーなし
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                「bun electron」を検索する人の多くは、Electron の重さなし
                に Electron の手軽さを求めています。
                <code className="text-slate-300">bun build --compile</code>{" "}
                は、Bun ランタイムをバンドルされた TypeScript と一緒に
                埋め込むことで単一の実行ファイルを生成します——CLI や
                サーバーには最適で、それ自体がランタイムであるため npm
                との完全な互換性があります。しかしバイナリはおよそ60 MB
                （macOS arm64）から100 MB超（Linux/Windows）になり、
                コードは依然として JIT 実行され、Bun には UI フレーム
                ワークがありません——デスクトップアプリには結局
                Electron、Tauri、あるいは webview ライブラリが別途必要
                です。
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perry vs Bun の詳細な比較
                </Link>
                。
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry——ネイティブウィジェットへコンパイルされる TypeScript
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry は TypeScript を事前にマシンコードへコンパイルし、
                本物のプラットフォームウィジェット——AppKit、UIKit、
                GTK4、Win32、JNI 経由の Android——を通じて UI を描画
                します。webview も IPC ブリッジも一切ありません。UI と
                ロジックの両方に1つの言語だけを使い、hello world は
                ~330 KB、一般的なバイナリは2–5 MB、起動は~1 ms、そして
                モバイル・ウォッチ・TV を含む10のターゲットに対応します。
                正直な注意点：Perry は1.0未満であり、UI API は独自のもの
                （宣言的で SwiftUI に近く、HTML/CSS ではありません）、
                エコシステムは Electron に比べればまだ若いということです。
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">横並びで比較</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">言語</td>
                  <td className="px-4 py-3 text-slate-400">全体を通して TypeScript</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS フロントエンド、Rust バックエンド</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">UI のアプローチ</td>
                  <td className="px-4 py-3 text-slate-400">ネイティブなプラットフォームウィジェット</td>
                  <td className="px-4 py-3 text-slate-400">同梱の Chromium</td>
                  <td className="px-4 py-3 text-slate-400">システムの webview</td>
                  <td className="px-4 py-3 text-slate-400">なし（CLI / サーバー）</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">hello world のサイズ</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">プラットフォームにより~60–116 MB</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">実行</td>
                  <td className="px-4 py-3 text-slate-400">AOT マシンコード</td>
                  <td className="px-4 py-3 text-slate-400">JIT（V8）</td>
                  <td className="px-4 py-3 text-slate-400">JIT（webview の JS エンジン）+ ネイティブ Rust</td>
                  <td className="px-4 py-3 text-slate-400">JIT（JavaScriptCore）</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">アイドル時のメモリ</td>
                  <td className="px-4 py-3 text-slate-400">数十 MB（単一のネイティブプロセス）</td>
                  <td className="px-4 py-3 text-slate-400">数百 MB（マルチプロセスの Chromium）</td>
                  <td className="px-4 py-3 text-slate-400">Electron より少ない（OS の webview）</td>
                  <td className="px-4 py-3 text-slate-400">ランタイム相応</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">モバイル / ウォッチ / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS、iPadOS、Android、watchOS、tvOS</td>
                  <td className="px-4 py-3 text-slate-400">なし</td>
                  <td className="px-4 py-3 text-slate-400">iOS、Android（Tauri 2）</td>
                  <td className="px-4 py-3 text-slate-400">なし</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">成熟度</td>
                  <td className="px-4 py-3 text-slate-400">1.0 未満</td>
                  <td className="px-4 py-3 text-slate-400">本番実績10年以上</td>
                  <td className="px-4 py-3 text-slate-400">安定版（1.x/2.x）</td>
                  <td className="px-4 py-3 text-slate-400">安定版</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            React Native や Flutter はどうなのか？
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Electron に関するあらゆるスレッドでこの2つは話題に上がります
            が、答えている問いが違います。React Native はモバイルファースト
            です：あなたの JavaScript は Hermes エンジン上で動作し、
            ブリッジ越しにネイティブビューを操作します。デスクトップ対応
            は別のコミュニティ／Microsoft のフォークを通じてのみ存在して
            おり、Electron のそのまま置き換えにはなりません（
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ）。Flutter はデスクトップとモバイルの両方をカバーします
            が、TypeScript を離れて Dart を使うことになり、プラット
            フォームのウィジェットを使う代わりに自前で描画します。
            TypeScript に留まることが制約であるなら、現実的なデスクトップ
            の候補は上記の4つのままです。
          </p>

          <h2 className="text-2xl font-bold mb-6">どれを選ぶべきか？</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Web スタックに留まる
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                UI がすでに React/Vue/Svelte で構築されていて、今すぐ実績
                十分なデスクトップ配布が必要なら、Electron は依然として
                最もリスクの低い選択です——サイズとメモリで対価を払う
                ことになります。そのコストが気になり、バックエンドを
                Rust で書くことに抵抗がないなら、Tauri は Web スタックの
                体験の大部分を、はるかに小さいフットプリントで提供して
                くれます。
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                webview を手放す
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                本当に求めているのが、TypeScript を入れればネイティブ
                アプリが出てくること——1つの言語、本物のプラットフォーム
                ウィジェット、小さなバイナリ、そして同じコードベースから
                のモバイル／ウォッチ／TV——であるなら、それはまさに
                Perry が埋めるために存在するギャップです。対価として
                1.0未満という成熟度を払うことになります。そして CLI
                やサーバーを、互換性リスクゼロの単一ファイルとして
                だけ必要としているなら、Bun の
                <code className="text-slate-300">--compile</code>{" "}
                が現実的な選択です。
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              自分の目で確かめよう
            </h2>
            <p className="text-slate-400 mb-6">
              Perry をインストールして、TypeScript からネイティブアプリを
              出荷しましょう。
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
        </div>
      </article>
    </>
  );
}
