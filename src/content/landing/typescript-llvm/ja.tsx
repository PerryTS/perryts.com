import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "LLVM 上の TypeScript：単相化とネイティブコード生成",
  description:
    "Perry が TypeScript を LLVM IR へ下げる仕組み——型付き HIR、単相化、NaN-boxing——そして AOT パフォーマンスのためにバックエンドが Cranelift から LLVM へ移行した理由。",
  breadcrumb: "LLVM 上の TypeScript",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="gradient-text">LLVM</span> 上の TypeScript
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            JIT エンジン向けに設計された言語を Perry がどのように LLVM IR
            へ下げているのか——単相化、NaN-boxing、インラインローワリング
            ——そしてなぜ Cranelift を離れたのか。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              コンパイラ内部構造
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
          <h2 className="text-2xl font-bold mb-6">なぜ TypeScript に LLVM なのか？</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            事前（AOT）コンパイラは JIT とはまったく異なる領域で生きて
            います。JIT はユーザーが待っている間にコンパイルするため、
            コンパイルのレイテンシそのものが制約になります。Perry のよう
            な AOT コンパイラは、開発者のマシン上や CI 上で一度だけ
            コンパイルし、そのバイナリはその後何百万回も実行されます。
            この非対称性こそ、重量級のオプティマイザが元を取れる場所です。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM は20年分のミドルエンドの成果をもたらします：ループの
            ベクトル化、ループ不変コードの移動、グローバル値番号付け、
            疎な条件付き定数伝播、積極的なインライン化、エイリアス解析。
            Perry の仕事は、実際に最適化できる IR をその機構に渡すこと
            です——ここで TypeScript の型情報が生きてきます。
          </p>

          <h2 className="text-2xl font-bold mb-6">ローワリングパイプライン</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            ソースは SWC でパースされたのち、型付きの高レベル IR（HIR）
            へと下げられます。興味深い決定はすべて、LLVM がコードを目に
            する前にここで行われます。
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">単相化。</strong>{" "}
              ジェネリックな関数やクラスは、具体的なインスタンス化ごとに
              特殊化されます。Rust や C++ が使うのと同じ戦略です。
              <code className="text-slate-300">{`Stack<number>`}</code>{" "}
              と <code className="text-slate-300">{`Stack<string>`}</code>{" "}
              は2つの独立した完全に型付けされた関数になります——そのため
              オプティマイザは汎用のディスパッチの塊ではなく具体的な型を
              扱うことになり、ジェネリクスは実行時に一切コストがかかり
              ません。
            </li>
            <li>
              <strong className="text-slate-300">静的ディスパッチ。</strong>{" "}
              レシーバーの型がコンパイル時に判明している場合、メソッド
              呼び出しはハッシュテーブルの参照ではなく、LLVM がインライン
              化できる直接呼び出しにコンパイルされます。
            </li>
            <li>
              <strong className="text-slate-300">直接的なフィールド
              アクセス。</strong>{" "}
              オブジェクトのフィールドはコンパイル時のインデックスに解決
              されるため、プロパティの読み取りは辞書の参照ではなく固定
              オフセットのロードになります。
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing とインラインローワリング
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            値が動的な場合、Perry は NaN-boxing を使用します：すべての値
            は64ビットのワードです。倍精度浮動小数点数はそのまま格納され、
            オブジェクト、文字列、真偽値、
            <code className="text-slate-300">null</code>、
            <code className="text-slate-300">undefined</code>{" "}
            は IEEE 754 の quiet NaN の未使用ビットパターンにエンコード
            されます。数値はゼロコストです——ボクシングも、算術のための
            アロケーションも発生しません。
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            問題は、数値以外の値に対する操作は unpack-operate-repack の
            ビット列を必要とすることです。これらの列が別途コンパイルされ
            たランタイムへの呼び出しとして存在していると、LLVM からは
            不透明なブラックボックスに見え、その内側をまたいで最適化する
            ことができません。そこで Perry は、プロパティ読み取り、
            メソッドディスパッチ、オブジェクト割り当てといったホットな
            操作を、オプティマイザが融合・単純化できるインラインの LLVM
            IR として出力します。たとえばオブジェクト割り当ては、インライン
            のスレッドローカルなバンプアロケーションへとコンパイルされ
            ます。
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — inline bump allocation</span>
            </div>
            <pre className="text-sm text-slate-300 overflow-x-auto">
              <code>{`%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr        ; current bump offset
%new_off = add i64 %offset, 96           ; headers + 8 fields
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr         ; block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow`}</code>
            </pre>
          </div>

          <h2 className="text-2xl font-bold mb-6">なぜ Cranelift ではないのか？</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry の最初のバックエンドは Cranelift でした——wasmtime を
            支えるコード生成基盤で、高速かつ予測可能なコンパイルのために
            作られています。出発点としては正しい選択であり、JIT やサンド
            ボックス化されたランタイムにとっては今も優れた選択肢です。
            2つの要因が乗り換えを迫りました。
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">オプティマイザの天井。</strong>{" "}
              Cranelift は意図的に高速な単一ティアのコンパイラです：
              「まともなコードを素早く」というのは、JIT にとっては正しい
              トレードオフであり、ネイティブパフォーマンスを売りにする
              AOT コンパイラにとっては誤ったトレードオフです。
            </li>
            <li>
              <strong className="text-slate-300">arm64_32。</strong>{" "}
              Apple Watch は Cranelift がサポートしていない ABI
              （64ビット命令、32ビットポインタ）を使用しています。
              watchOS をターゲットとして成立させるには LLVM が必要で
              あり、2つのバックエンドを維持することは2組のバグ、テスト、
              パフォーマンス基準を維持することを意味しました。
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            この移行は無償ではありませんでした。ホットな操作が当初は
            不透明なランタイムヘルパー呼び出し経由になっていたため、
            最初の LLVM 専用リリースは一部のベンチマークで最大70倍も
            後退しました。そこから回復する過程——インラインローワリング、
            上記のバンプアロケータ、より良いインライン化の境界——で
            バックエンドは Cranelift の数値を超え、落ち着いた頃には
            Perry はスイート内のすべてのベンチマークで Node.js を1.7倍
            から24.6倍上回り、2つのタイがありました（2026年4月）。
            この後日談は一読の価値があります：
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              From Cranelift to LLVM
            </Link>
            。
          </p>

          <h2 className="text-2xl font-bold mb-6">さらに詳しく</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              コンパイラ内部構造のページ
            </Link>{" "}
            では、NaN-boxing、単相化、静的ディスパッチをさらに詳しく解説
            しています。ブログでは、
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Optimizing Everything
            </Link>{" "}
            がリリースごとの最適化作業を追いかけており、
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Gen GC, lazy JSON, and defensible benchmarks
            </Link>{" "}
            ではベンチマーク手法（RUNS=11、中央値 + p95）について説明して
            います。全体像をつかむには、
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript ネイティブコンパイラ
            </Link>{" "}
            の概要から始めてください。
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              出力を自分の目で確かめよう
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code>{" "}
              ——ネイティブなマシンコード、エンジンは接続されません。
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
      </section>
    </>
  );
}
