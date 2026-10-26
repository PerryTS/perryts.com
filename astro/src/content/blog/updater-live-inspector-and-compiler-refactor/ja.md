---
title: "自動アップデート、ライブインスペクター、そして自らを半分にしたコンパイラ"
excerpt: "Perry v0.5.306 → v0.5.359 を 4 日で — 53 のパッチリリース、約 30 件の Issue クローズ、そして 3 つの大きなものが着地：デスクトップ自動アップデート用の perry/updater、localhost:7676 のライブインスペクター、そして最大の 4 ファイルを 33〜91% 縮めたコンパイラのリファクタリング。"
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
前回の投稿は **v0.5.306** で締めくくり、ストーリーは gen-GC + JSON + ベンチマーク でした。4 日後、Perry は **v0.5.359** に到達 — つまり **53 のパッチリリース** — そして、ストーリーはまた違うものになっています。これらのリリースに、ベンチマーク数値を見出しにしたものはありません。ほぼすべてが **トラッカーで Issue がクローズされていく** 話です。

-   **`perry/updater`** 登場 — デスクトップアプリ向けの Sparkle / Tauri スタイルの自動アップデート（SHA-256 ダイジェストに対する Ed25519、センチネル方式のロールバック、デタッチ再起動）。コミュニティ PR、**TheHypnoo** 氏 から（[#224](https://github.com/PerryTS/perry/pull/224)）。
-   **Geisterhand フェーズ D** — `http://localhost:7676` のライブインスペクター。ウィジェットツリー、ウィジェット別詳細、クリックディスパッチ、そして `POST /style/:h` によるライブスタイル編集。
-   **コンパイラのリファクタリング。** v0.5.329 → v0.5.343 にかけて、最も参照されていた 4 ファイルを分割：`lower::lower_expr` 6,687 → 624 LOC（−91 %）、`compile.rs` 9,391 → 3,783 LOC（−60 %）、`lower.rs` 13,591 → 7,554 LOC（−44 %）、`lower_call.rs` 7,000+ → 4,681 LOC（−33 %）。新しい `walker.rs` は `_ =>` キャッチオールのバグクラスをコンパイルエラーに変えます。
-   **UI スタイリング フェーズ C 完了** — Apple、Android、GTK4、Windows、Web のすべてのウィジェットでインライン `style: { ... }` プロップ。Windows は 5 つのスタブのうち 4 つを配線（decoration / opacity / borders）。残るは `widget.shadow` のみ（DirectComposition フォローアップ）。
-   **Windows 用の Scoop バケット**：`scoop install perry-ts/perry`。リリースワークフローに SHA-256 サイドカー。
-   **コミュニティ Issue 修正の波** — runtime、codegen、fetch、GTK4、Windows リンカ、async、stdlib にまたがって 約 30 の Issue がクローズ。

## 1\. perry/updater — デスクトップアプリの自動アップデート

修正前の Perry にはアップデート手段がありませんでした。アプリは出荷され、出荷され、それで終わり。**TheHypnoo** 氏が [#224](https://github.com/PerryTS/perry/pull/224) でフルセットを提案：

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // 前回起動がクラッシュしていたらセンチネル・ロールバック

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // 新しいビルドが正しく起動した後に呼ぶ
```

信頼モデル：**Ed25519 をファイルの SHA-256 ダイジェストにかける**（ファイルバイトではなく — 大きなバイナリでも検証を安価に保つため）。マニフェストは JSON、スキーマバージョン付き、`<os>-<arch>` トリプルごとに 1 エントリ。`<exe>.prev` バックアップ付きのアトミックインストール、デタッチ再起動（Unix では `setsid`、Windows では `DETACHED_PROCESS`）。モバイルは設計上除外 — App Store / Play Store が OS レベルでインストールパイプラインを所有しているため。

スモークテストを書く中で 2 つの Perry ランタイムの癖が表面化し、その場で修正されました：

-   **`response.arrayBuffer()` はメタデータだけのスタブを返していた。** [#232](https://github.com/PerryTS/perry/pull/232) で修正（こちらも TheHypnoo 氏） — `js_response_array_buffer` は実体の `BufferHeader` をアロケートし、`resp.body` を `memcpy` で中に入れます。
-   **`fs.appendFileSync` が 0 バイトを書き込んでいた。** [#226](https://github.com/PerryTS/perry/issues/226) で修正 — namespace-import の lowering パス（`import * as fs from "fs"`）に `appendFileSync` のアームがなく、LLVM codegen 側にも HIR バリアント用のアームがなかった。両方とも配線。

ドキュメントは `docs/src/updater/overview.md` にあります。

## 2\. Geisterhand：localhost:7676 のライブインスペクター

Geisterhand は Perry のインプロセス UI テストハーネス — ポート 7676 上の HTTP API でウィジェット状態をスナップショット取得し、クリックをディスパッチしていました。フェーズ D はこれをブラウザから開ける devtools 風インスペクターに変えます。

-   **ステップ 1（v0.5.349）** — `GET /` はウィジェットツリー、ウィジェット別詳細（frame、value、raw JSON）、1.5 秒の自動更新（一時停止 / 再開）、「fire onClick」アクションボタンを備えた、シングルページの Vanilla-JS UI を返します。Codegen は macOS の lazy-load `-dead_strip` に対して `INSPECTOR_HTML` をピン留めし、リリースビルドでも生き残らせます。
-   **ステップ 2（v0.5.350）** — `POST /style/:h` は JSON のプロパティバッグを受け取り、ライブで適用します。9 つのプロパティ（`backgroundColor`、`color`、`borderColor`、`borderWidth`、`borderRadius`、`opacity`、`padding`、`hidden`、`enabled`）が、既存のポンプキューを介して HTTP スレッド → メインスレッドへ流れます。不正な JSON → 400、不正なハンドル → 400、未知のプロパティはサーバ側でフィルタされ、レスポンスは適用されたものを列挙します。

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

macOS のディスパッチャは配線済み。Linux / Windows / iOS / tvOS / visionOS / Android は同じ形で次の対象です。

## 3\. コンパイラのリファクタリング — 最大の 4 ファイルを分割

トラッカーの 5 つの Issue（[#167](https://github.com/PerryTS/perry/issues/167)、[#169](https://github.com/PerryTS/perry/issues/169)、[#212](https://github.com/PerryTS/perry/issues/212)、[#214](https://github.com/PerryTS/perry/issues/214)、それにロングテール）が同じ形をしていました：新しい `Expr` バリアントが `ir.rs` に追加されたが、`lower.rs` 内の 4 つのアドホックな walker のうち 1 つが `_ =>` のキャッチオールを持っていて、新しいバリアントを黙って誤コンパイルしていた。これをランタイムで捕まえるのは高くつく — 不可視な場合もあれば、SSO 下で SIGSEGV することもある。

**v0.5.329** は `crates/perry-hir/src/walker.rs` を導入し、`walk_expr_children` / `walk_expr_children_mut` を提供 — 全 178 個の `Expr` バリアントに対する exhaustive な match で、**キャッチオールなし**。新しいバリアントをここにリストせず追加すると、これがコンパイルエラーになります。4 つの利用側（`substitute_locals`、`find_max_local_id::check_expr`、`collect_local_refs_expr`、`remap_local_ids_in_expr`）は次のように崩れました：

| 関数 | 前 | 後 | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75 % |
| `substitute_locals` | 553 | 80 | −86 % |
| `collect_local_refs_expr` | 720 | 70 | −90 % |
| `remap_local_ids_in_expr` | 542 | 85 | −84 % |

合計：**−1,830 行の重複した descent** が、**+1,840 行の集約された walker** に置き換わりました — 差し引きフラットですが、バグクラスは消滅しています。

これで残りが解放されました。**v0.5.331 → v0.5.343** は 14 コミットにわたり 4 つのモノリスを切り分けました。見出しの数値：

| ファイル | 前 | 後 | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6,687 | 624 | −91 % |
| `compile.rs` | 9,391 | 3,783 | −60 % |
| `lower.rs` | 13,591 | 7,554 | −44 % |
| `lower_call.rs` | 7,000+ | 4,681 | −33 % |

分割は 19 個の新しい焦点を絞ったサブモジュールとして着地しました：`compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`、`lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`、`lower_call/{ui_styling, builtin, native}.rs`、加えて UI / system / i18n のメソッドテーブルの単一の真実の源泉となった新しい `crates/perry-dispatch` クレート（Issue [#191](https://github.com/PerryTS/perry/issues/191) の「macOS ではコンパイルできるが Web で壊れる」サプライズを引き起こしていた `_ => "perry_ui_unknown"` のファンアウトは、今や 1 回のルックアップに）。

**Tier 4 のパフォーマンス改善** も同行（v0.5.335–v0.5.336）：

-   `inline_functions` 内の 2 パスと `compile.rs` 内の 3 つの rayon パスを融合 — コンパイルあたりモジュールスキャン 5 回 + スケジューラのラウンドトリップ 3 回を節約。
-   `perry dev` のパースキャッシュを 500 エントリに制限、FIFO 排出。修正前は `node_modules` をたどるセッションで 100 MB 超の SWC AST を保持し得ました。
-   codegen 後の `.ll` 書き込みループを並列化 — 50+ モジュールの SSD で wall-time が 2–4 倍速。
-   ロケールテーブルをワーカーごとにクローンする代わりに `Arc<I18nTable>`。

ワークスペーステストは全コミットを通じて **434 passed / 0 failed / 5 ignored**、ギャップテストは 25/28 ベースライン、ドキュメントテストは 80/82 ベースラインを維持。

## 4\. UI スタイリング フェーズ C、完了

フェーズ C はインライン `style: { ... }` のロールアウトでした。ステップ 1〜7 がこのウィンドウでクローズ：

-   **v0.5.305 → v0.5.306** — `StyleProps` 型サーフェス + Button へのインライン `style:`。
-   **v0.5.307 → v0.5.309** — すべてのテーブル系ウィジェット、続いて VStack / HStack に対する color/padding/shadow のインラインデストラクチャ。
-   **v0.5.310 → v0.5.311** — hex 文字列 + グラデーション + 動的値のためのランタイム `parseColor`。
-   **v0.5.312** — スタイリング ドキュメント + Windows のトラッキング Issue。

そしてクロスプラットフォームの一掃：

-   **GTK4**（[#202](https://github.com/PerryTS/perry/issues/202)、[#206](https://github.com/PerryTS/perry/issues/206)） — 4 つのスタイリング FFI を配線、加えて Linux のドキュメントテストゲートを止めていた 7 つの欠落 FFI（v0.5.322）。
-   **macOS**（v0.5.324） — `widget.shadow` のための `CALayer` シャドウ配管 + visual\_test インフラ；非 `NSTextField` ウィジェットのための `set_color` クラスプローブ。
-   **iOS / tvOS / visionOS**（v0.5.346） — Button の `color: ...` は `UIButton` の `setTextColor:` を叩いていた（このセレクタは実装されていない）；`objc2` の panic が `extern "C"` 境界を越え、プロセスがアボートしていました。macOS と同じクラスプローブ パターンで修正 — UIButton は `setTitleColor:forState:UIControlStateNormal` 経由でルーティング。
-   **Windows**（v0.5.347） — 5 つのスタイリングスタブのうち 4 つを配線（`text.decoration` は `LOGFONT` ラウンドトリップ経由、`widget.opacity` は `WS_EX_LAYERED` + `SetLayeredWindowAttributes` 経由、borders は `SetWindowSubclass` + `WM_PAINT` 経由）。残るは `widget.shadow` のみ（DirectComposition が必要）。

`docs/src/ui/styling-matrix.md` のスタイリング マトリックスは、ウィンドウを **Web 43/43 Wired**、**Windows 42/43 Wired**、その他はフルカバレッジで終えています。

## 5\. ランタイム正しさのパス — Issue ごとに

この期間のテーマ：トラッカーから入ってきた誤コンパイルはすべて、修正に変わるか、コンパイル時エラーに変わりました。ハイライト：

-   **[#212](https://github.com/PerryTS/perry/issues/212)（v0.5.323）** — `fn` 内のクラスメソッドが囲っている fn のローカルをキャプチャできなかった。マルチモジュールの再現は今や Node とバイト単位で一致。
-   **[#214](https://github.com/PerryTS/perry/issues/214)（v0.5.321 + v0.5.330）** — 7 つの string-operand サイトでの SSO-safe な string-handle アンボックス：`arr.join`、`arr.toString`、`obj[stringKey]` get/set/delete、`string.match(re)`、`process.env[dynKey]`、crypto digest 入力。修正前は、これらのいずれもインライン文字列オペランドに対して、黙ってゴミを返すか SIGSEGV を起こしていました。
-   **[#221](https://github.com/PerryTS/perry/issues/221)（v0.5.351）** — モジュールレベルの空の `const` 配列が、関数内からの `arr[i]=` 書き込みを取りこぼしていた。Bloom-Engine/jump の `discoverLevels()` が `LEVEL_FILES` を index-assign でモジュールレベルに埋めようとしたとき、レベル選択画面が空で出た事例で表面化。
-   **[#233](https://github.com/PerryTS/perry/issues/233)（v0.5.357）** — async 関数内からの `Array.push` は、配列がパラメータとして渡されたとき静かに 16 要素で頭打ちになっていた。async 関数はインライン化されない；リアロケーションは新しいポインタを返すが、呼び出し元はそれを見られない。修正：成長のたびに古い場所にフォワーディングポインタを設置し、GC 既存の `GC_FLAG_FORWARDED` 機構を再利用。
-   **[#235](https://github.com/PerryTS/perry/issues/235)（v0.5.358）** — 呼び出し元が末尾の引数を省略したとき、メソッドのデフォルト引数ディスパッチがゴミを渡していた。寄与した 2 つの部分：cross-module のメソッド宣言が `arity + 1` ではなく 6 ダブルをハードコード、そして `lower_class_method` が `build_default_param_stmts` をまったく呼んでいなかった。mongodb の `findOne(filter, options = {})` が静かにハングする現象として表面化；修正はローカルおよび cross-module ディスパッチ全体で統一されています。
-   **[#236](https://github.com/PerryTS/perry/issues/236)（v0.5.355）** — 1 つの再現から 3 つの独立した fetch + promise バグ：api.github.com は匿名で 403（デフォルト User-Agent を設定）、`.then(console.log)` が永久にハング（null コールバックが TASK\_QUEUE エントリを push していなかった）、すべての fetch リジェクションが `Uncaught exception: [object Object]` を出力（実際の `ErrorHeader` ではなく裸の `*StringHeader` が NaN-box されていた）。
-   **[#234](https://github.com/PerryTS/perry/issues/234)（v0.5.359）** — `arrayBuffer` / `text` / `bytes` / `slice` インスタンスメソッドを持つ実体の `Blob`。修正前は、`await response.blob()` はメタデータだけのスタブ `{size, type}` を返していました。3 部構成の修正が runtime + HIR + codegen にまたがって着地。

加えて小さなキャッチアップ：

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup が Linux のジェネリック単形化を過剰に刈り取っていた + GTK4 のリンク サイレントフォールバック。修正：名前パターンによるフィルタリングを `llvm-nm` 経由の **シンボル集合** 比較に置き換え。1 つでもユニークなシンボルを持つメンバーは保持。`libperry_ui_macos.a` をリンクエラーなしで 196 → 35 オブジェクトに刈り込み。
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — Windows のリンク行に `secur32.lib` を追加。
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n の `FormatNumber` FP ラウンドトリップを Ryū 経由で。
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — `perry/i18n` のフォーマット ラッパー用に codegen ディスパッチを配線。
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — `perry/plugin` の codegen ディスパッチ。
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — Canvas ウィジェットを LLVM codegen 経由で。
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView を codegen 経由で。
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — Table ウィジェットを codegen 経由で。
-   **[#193](https://github.com/PerryTS/perry/issues/193)**（部分対応） — stdlib ヘルパー ディスパッチのアームを 11 個。
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — iOS + Android でのバックグラウンド受信通知（warm-path）。
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — watchOS のゲームループ FFI フック用の弱い fallback。
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — `using` / `await using` の dispose フック。
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — `js_native_call_method` の引数 alloca を entry ブロックへ巻き上げ。
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — `substitute_locals` の Uint8Array アーム。
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync` をエンドツーエンドで配線（コミュニティ PR）。

## 6\. Windows + Scoop

Windows のツールチェーン物語はさらにシンプル化を続けます。**v0.5.353** はホストビルドで `clang -target` をピン留め — PATH 上の非 MSVC な clang（MinGW / MSYS2 / Anaconda / Rust GNU バンドル）が、Perry の `x86_64-pc-windows-msvc` IR を黙って `windows-gnu` に書き換えていて、lld-link は LLVM の mingw32 エミッタが挿入する `__main` 参照を解決できずにいました。新しい `probe_clang_default_triple` は、プロセスごとに 1 回 `clang --version` を実行し、ホストのデフォルトが GNU で、しかし MSVC をターゲットしている場合に 1 行だけ情報メモを出します。`PERRY_NO_CLANG_PROBE=1` で抑制可能。

**v0.5.345** は Win64 の `perry-ui` ABI を `perry-dispatch` に揃えました — 3 つの runtime extern シグネチャがずれていました（`perry_ui_navstack_create`、`perry_ui_menu_add_item_with_shortcut`、`perry_ui_app_set_timer`）。Win64 ABI では整数と浮動小数の位置引数がスロットインデックスを共有するため、ミスマッチは未初期化レジスタからゴミを読みます。SysV（macOS / Linux）は int/float のレジスタプールが分離していて偶然有効なビットが乗っていた — Windows 限定のクラッシュで、8 つの perry-ui-\* プラットフォームクレートすべてで修正。

そして：**`scoop install perry-ts/perry`**。マニフェストは v0.5.345 にピン留め（`depends: main/llvm` で公式の MSVC デフォルト LLVM を自動取得）。リリースワークフローは今、`<artifact>.sha256` サイドカーを各アーカイブの隣に出力し、形式は `sha256sum` 互換 — 任意の下流パッケージマネージャ バンパー向け。

```
# Windows ホスト
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. まとめ

この期間のパターンは、コミュニティのエンゲージメントと内部的な衛生のミックス。**TheHypnoo** 氏は重要な PR を 3 つ届けました（[#224](https://github.com/PerryTS/perry/pull/224) perry/updater、[#231](https://github.com/PerryTS/perry/pull/231) `fs.appendFileSync` の配線、[#232](https://github.com/PerryTS/perry/pull/232) `response.arrayBuffer` の body バイト）。トラッカーは約 30 の Issue が空になりました。コンパイラは最大ファイルが 60 % 縮小し、4 つのアドホック walker のうち 1 つを更新し忘れることがランタイムの誤コンパイルから `cargo build` エラーへと変わる exhaustive な walker を獲得。UI スタイリングは Windows のシャドウを除く全デスクトッププラットフォームで均等に達成。Geisterhand はブラウザベースの devtools サーフェスを獲得。Windows のインストールパスはコマンド 1 つ短くなりました。

試す：

```
# npm（任意のプラットフォーム）
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew（macOS）
brew install PerryTS/perry/perry

# Scoop（Windows）
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# デスクトップアプリの自動アップデート
npm install @perry/updater

# ライブインスペクター
perry compile main.ts -o app --enable-geisterhand
./app &  # その後 http://localhost:7676 を開く
```

ソース：[github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues：[github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog：[CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
