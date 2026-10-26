---
title: "世代別GC、遅延JSON、そして精査に耐えるベンチマーク"
excerpt: "Perry v0.5.174 → v0.5.306を3日間で達成。並行して投入されたGCとJSONの作業も含む。世代別GCがデフォルトに昇格。Small String Optimizationもデフォルトに昇格。JSONパイプラインに遅延テープが入り、validate-and-roundtripで中央値75ms――動的型付けランタイム勢では最速。ベンチマークページもRUNS=11の中央値+p95+σで書き直され、simdjsonとAssemblyScript+json-asがピアとして追加され、Perryのあらゆる弱点が正直に提示されている。"
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
前回の記事は**v0.5.174**で締めくくられ、見出しは1つでした：Perryはついに、ツリー内スイートのすべてのベンチマークでNodeとBunの両方に勝っていました。3日間の作業とGC + JSONコミットのバックログを経て、Perryは**v0.5.306**に到達しました――これは**132回のパッチリリース**です――そしてストーリーは別のものになっています。見出しは547倍のスピードアップでもなければ、新しい勝ち列でもありません。それらの勝利を擁護可能なものにする作業です。

-   **世代別GC**がデフォルトとして出荷されます。Phase A〜Dはv0.5.217〜v0.5.237にわたって着地しました。
-   **Small String Optimization**がデフォルトとして出荷されます。Step 1.5 → 2はv0.5.213〜v0.5.216で着地しました。
-   **JSONパイプライン**はテープベースのパーサ、遅延パース、遅延ストリンギファイ、要素ごとの疎なマテリアライズを得ました。デフォルトのvalidate-and-roundtripは今や**中央値75 ms**――動的型付けの中で最速です。
-   **ベンチマークページ**は端から端まで書き直され、**RUNS=11 中央値 + p95 + σ + min + max**、ピアとして追加されたsimdjsonとAssemblyScript+json-as、本物の比較から分離された最適化プローブ、そしてPerryが持つすべての弱点を正直に表面化しました。

脇役は正しさの修正の安定した一連の流れです：Promiseマイクロタスク FIFO、NaN等価性とECMAScript数値フォーマット、BigInt 2の補数、AsyncLocalStorageのエンドツーエンド、decimal.js + ioredis + commanderランタイム、そしてテープパスの下に隠れていた素のf64でのJSON.stringifyのsegfault。加えて、Windowsツールチェーンがついに軽量化されました：LLVM + xwin、Visual Studioのインストールは不要です。

## 1\. デフォルトオンの世代別GC

世代別GCは2か月間にわたる段階的なロールアウトでした。この期間に閉じたフェーズの要約：

-   **v0.5.217〜v0.5.221** ― Phase A：シャドウスタックランタイムの足場、push/pop発行、スロットマップスレッディング、`Let`/`LocalSet`シャドウミラーリング、ルートスキャナ。
-   **v0.5.222** ― Phase B：ナーサリ + 旧世代アリーナ分割。
-   **v0.5.223〜v0.5.225** ― Phase C1〜C2：ライトバリアランタイムインフラ、codegenがバリアを発行、すべてのヒープストアがそれを通る。
-   **v0.5.226〜v0.5.228** ― Phase C3a〜C4：remembered-setのルートがマーク + クリアに流れる；マイナーGCトレースは旧世代をスキップ；非移動式テニュアリング。
-   **v0.5.229〜v0.5.236** ― Phase C4b α/β/γ/δ：フォワーディングポインタインフラ、ピン留め + 退避パス、スキャナ + 推移的ピン留め、参照リライト、アイドルナーサリブロックをOSに返却、GCトリガーを初期しきい値で上限。
-   **v0.5.237** ― Phase D Part 1：`PERRY_GEN_GC=1`がデフォルト。
-   **v0.5.238** ― Phase D Part 2：`PERRY_SHADOW_STACK=1`がデフォルト。
-   **v0.5.239〜v0.5.240** ― クローズアウトドキュメント：ロードマップ確定、学術 + 産業の系譜の付録（Bartlett 1988、Ungar 1984、Cheney 1970）。

最も重要だった測定された勝利：`test_memory_json_churn`はgen-GCのデフォルトが切り替わった瞬間に、ピークRSSが**115 MB → 91 MB**に下がりました。計算面のリグレッションは小さく、言い訳なしに列挙されています ― `nested_loops` 8 → 18 ms、`accumulate` 24 → 34 ms、`object_create` 0 → 1 ms、`array_read` / `array_write`がそれぞれ +1 ms。エスケープハッチ（`PERRY_GEN_GC=0`）は古い数値を取り戻します；トレードオフは意図的なものであり、ベンチマークページは今や両方の行を並べて掲載しているので、読者が選べます。

## 2\. デフォルトオンのSmall String Optimization

SSOは22バイトのインライン文字列表現で、短い文字列のヒープアロケーションを回避します ― 典型的なJSONキー（2〜8バイト）と短い値はインライン形式に収まります。ロールアウトは表面的には小さく、内部的には大きいものでした：

-   **v0.5.213**：SSOインフラ（表現 + アクセサ）。
-   **v0.5.214**：Step 1コンシューマアーム + テスト用`PERRY_SSO_FORCE`ゲート。
-   **v0.5.215**：Step 1.5 codegen `PropertyGet`三方向分岐 ― インライン文字列のファストパス、ヒープ文字列のファストパス、残りのスローパス。
-   **v0.5.216**：Step 2フリップ ― デフォルトでSSOを発行。

v0.5.279のフォローアップは、SSOがホットになって表面化した最後のプロパティリードNaNバグを閉じ、v0.5.272のチェーンされたクロスモジュールゲッターディスパッチ修正はもう1つを閉じました。両方ともデフォルトが切り替わる前のパンチリストにありました；両方ともperfのリグレッションなしに出荷されました。

## 3\. JSON：テープベースパース、デフォルトで遅延

JSONパイプラインはこの期間で最も侵襲的な書き換えを受けました。旧動作：`JSON.parse`はNaNボックス化された値の完全にマテリアライズされたツリーを構築していました。新動作：`JSON.parse`は1値あたり12バイトのテープを構築し、遅延でマテリアライズします ― あなたが実際に読んだ値だけがマテリアライズコストを支払います。変更されていないパースに対するstringifyは、今や元の入力のmemcpyになります。simdjsonが`raw_json()`で使うのと同じファストパスのトリックです。

-   **v0.5.200**：`JSON.parse<T>(blob)`スキーマ駆動パース（Step 1）。コンパイル時に既知の形状により、コンパイラは事前解決済みのキーアクセスを発行できます。
-   **v0.5.203**：テープベースパース基盤 ― Step 2 Phase 1。
-   **v0.5.204**：遅延パース + 遅延ストリンギファイ ― Step 2 Phase 2+4。
-   **v0.5.206**：遅延セーフなインデックス付きアクセス + エッジケース ― Step 2 Phase 3。
-   **v0.5.208**：要素ごとの疎なマテリアライズ ― Step 2 Phase 5b。
-   **v0.5.209**：ウォークカーソル + 適応マテリアライズしきい値。
-   **v0.5.210**：≥1 KBのブロブで遅延パースをデフォルトにフリップ。

遅延テープが設計対象としていたワークロード（10kレコード、約1 MBのブロブ、中間的反復なしのparse → stringify）における結果：

| 実装 | 中央値 (ms) | p95 (ms) | σ | ピークRSS |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson) | 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + lazy tape) | 75 | 91 | 6.9 | 85 MB |
| rust serde\_json (LTO) | 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialization) | 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime) | 598 | 621 | 10.5 | 58 MB |

Perryの**中央値75 ms**は比較中で最速の動的型付けランタイムです ― Bun（259 ms）に勝ち、Node（394 ms）に勝ち、KotlinのサーバJIT（453 ms）に勝ちます。simdjsonの24 msはSIMDアクセラレートされたC++の上限であり、つまみ食い（cherry-pick）の裏に隠さず、意図的にページ上に存在します。Perryはそれには勝てません。ポイントはギャップを示すことで、それを閉じることに目標を持たせることです ― `docs/json-typed-parse-plan.md`で追跡されています。

正直なコンパニオンベンチは**parse-and-iterate**です：同じブロブですが、各反復ですべてのレコードの`nested.x`を合計するので、遅延テープのマテリアライズが強制されます。そこではPerryは**466 ms**に着地します ― マーク・スイープのエスケープハッチの375 msより遅いのは、テープが償却できないオーバーヘッドを支払うからです。その行はTL;DR §Bにあります。作業を回避できないとき、遅延テープは振りをしません。

## 4\. 書き直されたベンチマークページ

Perryがパフォーマンス数値を提示する方法について、3つのことが変わりました。

**RUNS=11 中央値 + p95 + σ + min + max、best-of-Nではない。**Best-of-Nはテールレイテンシを静かに落とします；このハードウェアでは、9.4秒のPython `accumulate`外れ値とSwift JSONの5.3秒のp95スパイクを隠していました。中央値はテールをページに戻します。方法論の変更はv0.5.248で着地しました；TL;DR §Aと§Bのすべてのセルは**2026-04-25**時点でRUNS=11の最新版です。

**最適化プローブは本物のランタイムperfから分離されています。**Perryが12〜34 msで、Rust/C++が98 msと示している5つのセル ― `loop_overhead`、`math_intensive`、`accumulate`、`array_read`、`array_write` ― はコンパイラフラグの姿勢を測っており、シリコンを測っているのではありません。今は独自のサブセクションにあり、上の段落で`clang++ -O3 -ffast-math`がそれらを1ミリ秒以内まで閉じることを説明しています。見出しの本物のランタイムカーネルは`loop_data_dependent`です：Perry 235 ms、Rust 229、Swift 233、Java 229、Bun 232 ― コンパイラが本当に作業を畳み込めないカーネルで、Perryはno-FMA-contractグループのど真ん中に座っています。それが正直な比較です。

**ピアが追加されました。**simdjson（4.3.0）は両方のJSONテーブルにあります ― C++のパーススループットの上限で、読者がギャップを見られるようにページ上にあります。AssemblyScriptとjson-as（1.3.2）は最も近いインストール可能なTS-to-nativeのピアです；porfforはこのサイズのワークロードでsegfaultし、Static HermesはmacOS arm64ではインストールできませんでした。Kotlinとkotlinx.serializationはv0.5.241〜v0.5.242でJSONポリグロットに加わりました。すべての行は本物で、すべての免責事項はページ上にあります。

## 5\. ポリグロット計算テーブル

v0.5.249での2026-04-25にリフレッシュされた、本物に折り畳めない見出しカーネル、RUNS=11中央値：

| ベンチマーク | Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci | 318 | 330 | 315 | 282 | 1022 | 589 |
| loop\_data\_dependent | 235 | 229 | 129 | 229 | 322 | 232 |
| object\_create | 1 | 0 | 0 | 5 | 11 | 6 |
| nested\_loops | 18 | 8 | 8 | 11 | 18 | 21 |

`fibonacci`では、Perryはコンパイル済みグループに3〜15 ms以内で並びます。JavaのHotSpot JITは再帰呼び出しのインライン化により約11%高速です。`loop_data_dependent`では、カーネルは2つのFP-contractクラスタに分かれます：約128 msのFMA-contractグループ（Goデフォルト、Apple Clangの`g++ -O3` ― どちらも`sum * a + b`を単一のFMADDDに融合）と、229〜235 msのno-contractグループ（Perry、Rustデフォルト、Swift、`-XX:+UseFMA`なしのJava、Bun）でスカラFMUL + FADDを実行。LLVMは`-ffp-contract=fast`でFMAグループに並びます；Perryはそれをデフォルトでは有効にしません。`nested_loops`はキャッシュバウンドであり、計算バウンドではありません；全員が8〜21 msに着地します。

## 6\. 軽量なWindowsツールチェーン

WindowsユーザはVisual Studioのインストールが不要になりました。**v0.5.199**は[#176](https://github.com/PerryTS/perry/issues/176)を閉じました：`perry setup windows` + winget LLVM + xwinが、VS BuildToolsツリー全体を置き換えます。`v0.5.201`は`find_lld_link` / `find_perry_windows_sdk`のcfgゲートを取り除いたので、パス検出はWindowsをターゲットとするすべてのプラットフォームで機能します ― macOSホストだけではなく。

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. ランタイム正しさのパス

この期間のテーマ：V8/JSCからの静かなランタイム発散が、修正かコンパイルエラーのいずれかになりました。自明でないものは：

-   **v0.5.255**：`BigInt.fromTwos`/`toTwos` 2の補数。
-   **v0.5.263**：`Promise.all`/`race`/`any`の非Promise型判別。
-   **v0.5.281**：`NaN==NaN` + ECMAScript数値フォーマット（`3 → "3"`であって`"3.0"`ではない；`-0 → "0"`；など）。
-   **v0.5.280**：`(x) | 0`での`NaN`/`Infinity`のToInt32強制。
-   **v0.5.284**：Promiseマイクロタスク FIFO + スロー済みハンドラの伝播。
-   **v0.5.286**：素のf64の`JSON.stringify`がテープパスでsegfaultしていました。
-   **v0.5.277**：`fs.readFileSync`はエンコーディングが渡されていないときBufferを返します（Nodeに一致）。
-   **v0.5.272**：チェーンされたクロスモジュールゲッターディスパッチが`undefined`を返していました。

Issue [#187](https://github.com/PerryTS/perry/issues/187)のstdlibフォローアップが埋まりました：AsyncLocalStorageのエンドツーエンド（v0.5.261）、`.action()`を実際に呼び出すcommanderランタイム + codegen（v0.5.250）、decimal.jsコード（v0.5.259）、Redis ioredisのエンドツーエンド（v0.5.270）、pg + mongoのasync-factoryパターン（v0.5.275）、そしてEE/LRU/WSSの同じasync-factoryバグ（v0.5.252）。

`perry/ui`側では：通知タップコールバック（#97）がApple（v0.5.254）とAndroid（v0.5.258）の両方で配線されました；ローカル通知のスケジュール + キャンセル（#96、v0.5.244）；AndroidでのFCMの登録 + 受信（v0.5.262）。

## 8\. まとめ

この期間のパターンは見出し数値ではありません。既存の勝利を精査に耐えさせる作業です：持続的なアロケーションワークロードを捕捉する世代別GC、短い文字列のコストギャップを閉じるSSO、最も一般的なワークロードの「変更なし」構造を活用するJSONパイプライン、そしてbest-of-Nではなく中央値を測り、Perryの75 msと同じ行にsimdjsonの24 msのパース上限を表示するベンチマークページ。読者はギャップを見ることができます ― そしてPerryが床に対してどこに座るかを。

試してみてください：

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

ソース：[github.com/PerryTS/perry](https://github.com/PerryTS/perry) ― ベンチマーク：[benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) ― チェンジログ：[CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

― Ralph
