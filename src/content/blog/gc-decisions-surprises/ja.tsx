import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `**TL;DR.** Perry は TypeScript をネイティブバイナリへコンパイルし、参照カウントではなく、移動式・世代別・正確なルートを持つトレーシング GC を使っています。GC 作業のほぼすべてが「Collector が実際には何をしていたのかを突き止めること」だった1か月を経て、Perry は GC 型のベンチマーク19本中9本で Node に勝ち（開始時は3本）、参照カウント方式の AOT 競合には14本で勝ち、15本で Node の1.3倍以内に収まりました。その過程で遭遇したのは、法医学的な証拠を何も残さないバグの種類、何も切り替えていなかった環境変数、構造上失敗できない CI gate、別の Collector をひそかに出荷させた doc comment、そして残る差が Collection ではなくオブジェクトの *layout* にあることを示す最終計測でした。そこから得た9つのルールを末尾にまとめています。その大半は GC とは関係ありません。

Perry は TypeScript を直接ネイティブ実行ファイルへコンパイルします。SWC が parse し、HIR へ lower し、LLVM が machine code を生成し、\`cc\` が link します。Interpreter も bytecode もありません。それでも対象言語には、scope の外へ escape する closure、scope より長生きする object、reference cycle があります。つまり、その native binary の背後には本物の garbage collector が必要です。

これは、その Collector を構築する際に行った判断、私たちを驚かせたこと（ほぼすべて不愉快な驚きでした）、そして現在の数値についての記録です。Collector は数か月にわたって codebase で最も活発な領域でした。**2026-07-01 以降、201件の commit が \`crates/perry-runtime/src/{gc,arena}\` に触れ、そのうち110件は直近12日間のものです**。対象は127ファイル、およそ75,000行に及びます。未公開 changelog fragment 572件のうち135件が GC 作業に由来する名前です。

そのほとんどは「Collector の実装」ではありません。私たちの Collector が実際に何をしていたのかを突き止める作業でした。

---

## 第1部 — 私たちが選んだもの

### 参照カウントを使わない

最初によく聞かれるのは、AOT compiler なら単純に reference counting を使えばよいのではないか、という質問です。これは明らかに相性がよく見えます。root discovery の問題がなく、safepoint も不要で、optimizer との協調も要りません。比較対象にしている AOT TypeScript compiler は、まさにその方法を採っています。

それでも tracing collector を選びました。Reference counting は、まれな場合のために一般的な場合へコストを負わせるからです。すべての pointer store が counter update になり、cycle には結局 backup tracer が必要で、JS は大量の object を allocate してすぐ捨てます。これは nursery がほぼ無料で処理できるケースです。現在、この判断は19本の GC benchmark のうち14本で正しく、5本で誤って見えます。後半で詳しく説明します。

### Value は NaN-boxed — そして今、その一部を元に戻している

すべての JS value は64-bit word 1つです。IEEE 754 の約2⁵²個の未使用 NaN pattern を使って pointer、小さい整数、singleton を tag し、それ以外は普通の \`f64\` として扱います。

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

Collector にとって、これは本当に好都合です。「この word は pointer か？」は mask と compare だけで判定でき、tracing 中に value ごとの型 lookup は不要です。静止した数値はすでに IEEE bit そのものなので、numeric field に box も header も要りません。

一方、*mutator* にとっては、V8 との差を生んでいる最大の単一要因であり、現在積極的に取り除いています。問題は、NaN-boxed \`double\` が単なる *1つの* representation ではなく、**canonical representation** だということです。Native machine type は region-local overlay としてしか存在せず、\`materialize_*_to_js_value\` の一群が JS-visible boundary ごとに再 box 化します。生成 IR では、明らかに \`i32\` と証明できる loop accumulator が \`alloca double\` に置かれ、\`-O3\` 後も back-edge をまたぐ \`phi double\` として残り、**毎 iteration** \`fptosi\` + \`sitofp\` の往復を支払います。Function parameter は一律 \`double %argN\` なので、hot function は何百万回もの call のたびに argument を再 unbox します。かつては、数値が pointer になり得ないにもかかわらず numeric local まで GC root として登録していました。

決着をつけた計測はこれです。bcryptjs の \`_encipher\` を忠実に unroll したものが、Node の184 msに対して834 msかかりました。しかも *型注釈を追加すると悪化* し、834 → 2732 msになりました。約80個の per-read guard と boundary での rematerialization が支配したからです。Expression-level fast path では representation problem を直せません。それぞれが boxed canonical の上に載る別の overlay にすぎず、unrolled code では逆効果になります。

したがって方向性（\`docs/representation-selection-rfc.md\`、unbox-by-default campaign）は、静的に証明されたすべての value — scalar、string、object、typed array、closure — について、local、parameter、return、typed heap slot の端から端まで unboxed native form を canonical にし、NaN-boxing を証明可能な polymorphic value に限定することです。NaN-boxing は *default* representation ではあり続けますが、*唯一* の representation ではなくなります。Phase 1、2、3a、3b、4a、4b は merge 済みです。Static Hermes が existence proof です。AOT では JIT が speculate できる箇所で type を *prove* しなければなりませんが、それは利点でもあります。証明済み kernel は warmup が不要で、deopt もしません。

これは GC に双方向で直接影響します。Unboxing は、collector が scan するはずだった root を減らします。証明済み scalar はそもそも root ではありません。同時に新しい義務も生みます。Heap slot が NaN-boxed word 以外を持つと、collector は value から pointer 性を読めず、shape ごとの layout mask を調べなければなりません。この仕組み — \`pointer_mask\`、\`raw_f64_mask\`、layout note — が、後述する複数の bug の発生源でした。

### Thread ごとに1つの heap、共有なし

Perry は default では single-threaded です。\`perry/thread\` は \`spawn\` と \`parallelMap\` を提供し、value は共有ではなく deep copy（\`SerializedValue\`）で thread boundary を越えます。これは実際の ergonomic cost ですが、collector に大きな利点をもたらします。**別 thread と同期することが一度もありません。** Global safepoint protocol、handshake、cross-thread invariant のための read barrier は不要です。すべての arena、root scanner、remembered set は thread-local です。

### Allocation distribution が示すため、generational を採用

Thread ごとに2 region あります。Nursery（\`ARENA\`、1 MB block）と old generation（\`OLD_ARENA\`）です。Allocation ごとに8-byte \`GcHeader\`、counter field の代わりに2つの aging bit（\`HAS_SURVIVED\`、\`TENURED\`）、\`PROMOTION_AGE = 2\` を使います。コードを書く前の2026-04-24に作成した原案は、理由を明快に述べています。JS allocation の90%以上は、それを作った scope 内で死にます。Flat arena は、明らかに dead な object を何度も mark することに一生を費やします。

原案は前提条件も正しく特定していました。この投稿の残りはすべて、この判断にかかっています。

> **Generational GC には precise root が必要です。**

Conservative scanner は non-moving collector なら十分です。False positive は dead object を1 cycle 長く保持するだけです。しかし *moving* collector はそうはいきません。Root を正確に列挙できなければ rewrite できず、rewrite できなければ何も move できません。

### Root：1つの analysis、2つの lowering、default は LLVM statepoint

LLVM は value を register に保持し、rematerialize し、好きな場所へ spill できます。Collector はそのどれも introspect できません。Perry の答えは2 layer であり、両者を分けて考えられるようになるまで、恥ずかしいほど時間がかかりました。

**Analysis** — どの local が GC pointer を持ち、どこまで live でなければならないか — は backend-independent です。その答えを emit code へ落とす **lowering** には選択肢があります。

- *Shadow stack.* Entry で \`js_shadow_frame_push(n)\`、JS-level local ごとに \`js_shadow_slot_bind\`、exit で \`js_shadow_frame_pop\`。Collector は heap-backed frame を walk します。
- *RS4GC による native stack map.* Root alloca は \`ptr addrspace(1)\` になり、function に \`gc "statepoint-example"\` を付け、各 module を \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\` に通します。LLVM 自身が statepoint、relocation、後続 use の rewrite を挿入し、collection 時には compact な \`__perry_gcmap\` section から root を読み取ります。

**#7370 以降、statepoint lowering が default です。** \`PERRY_RS4GC=1\` を設定する必要はなく、\`PERRY_RS4GC=0\` で bisection 用に shadow stack へ戻せます。Target-aware であり一律ではありません。\`gc_map\` は runtime が frame base を解決できない target には map を emit しないからです。誰も読まない map は root をひそかに失います。ルールは、runtime が walk できる場所では native root、できない場所では shadow stack です。aarch64/arm64 と x86-64 は statepoint、watchOS \`arm64_32\` と ARM64 Windows は shadow frame を使います。Fallback は「root なし」ではなく、同じ analysis のもう一方の lowering です。

Env を設定しない状態での切替根拠：479-test の full gap suite で **regression 0、compile failure 0**。古い手書き statepoint bridge が扱えなかった **\`try\` を含む128 test** がすべて compile。10本の GC ratchet probe が Node と byte-identical。Runtime は −1〜2%（わずかに高速）、zod 81 module で binary size +1.86% でした。

「shadow stack を emit している」より良い理由は1〜2%ではありません。Statepoint は **optimizer が尊重すべき relocation semantics** を持ちます。Shadow stack は、spill し忘れた value に optimizer が賢いことをしない限り正しいだけです。この違いの証拠は第3部で示します。

さらに、user code ではなく runtime 内に存在する state のために **79個の runtime root scanner** を登録しています。Pending promise、timer callback、exception state、async-context stack、shape cache、string intern table、JSON scratch table などです。

Conservative native-stack scanner もあります。社内 architecture doc は3つの同等な mechanism の1つと説明していますが、その文章は古く、この記事を書きながら発見したこと自体が教訓でした。出荷 production configuration で \`conservative_stack_scan_decision()\` は \`SkipDisabled\` になります。Liveness は precise root map（statepoint、fallback target では shadow frame）と runtime helper の \`RuntimeHandleScope\` に完全に依存します。Conservative path は allocation-point collection など特定 mode のために残っているのであって、precise path の safety net ではありません。

### Write barrier は遅延して arm する

Generational hazard は old→young pointer です。Nursery だけを trace する minor GC はそれを知らなければなりません。Codegen は pointer store で \`js_write_barrier\` call を emit し、runtime は remembered set を管理します。

#7250 で出荷した arm の invariant は、collector で最も再利用性の高い design の1つです。

> Disarmed の間、barrier は何も記録しません。その代わり、thread 上で remembered set を最初に *読む* ときは log を一切信用せず、heap から old→young edge の完全な集合を再構築し、その途中で barrier を arm します。

これは慣習ではなく構造で強制されます。\`remembered_dirty_snapshot()\` は \`pub(super)\`、call site は7つで、すべて \`gc/\` 内です。

*(source を読む人へ：Perry には互いに無関係な2つの「barrier」があります。GC write barrier と、representation-selection pass 内の compile-time \`Ptr<Shape>\` promotion barrier です。両者を混同した3件の issue が時間を消費しました。必ずファイル名も示してください。)*

---

## 第2部 — 驚いたこと

### 1. 証拠を一切残さないバグの種類

Rooting invariant は一文です。

> Collection point を越えて live な GC-managed value は、その point より前に root から到達可能でなければなりません。Root から読んだ value を call 中に SSA register へ保持しても、その value は **rooted ではありません**。それは copy であり、collector は copy を見られません。

違反すると、この project で最悪の debugging experience になります。Collection の瞬間には collector が見つけられるものが *何もありません*。Dangling reference も、unforwarded slot も、異常もありません。その後 nursery が address を recycle し、stale pointer は有効だが別の object を読み、program は1 cycle 以上あとに別 function で \`TypeError: value is not a function\` として死にます。

所有する runtime GC probe はすべて盲目です。From-space scan は clean。Verify pass も clean。\`PERRY_GC_VERIFY_EVACUATION\` は reachable slot が forward されたか確認できますが、存在を知らない register は確認できません。

現在、出荷済みの5つの形を分類しています。

| # | 形 | Review を生き残った理由 |
|---|---|---|
| #7184 | Push した frame の外の slot index に root store を emit | \`js_shadow_slot_bind\` は bounds-check 後に黙って no-op。IR は *rooted と言っている* |
| #7192 | Allocate する call の *あと* に root store を emit | Slot は rooted **かつ** dangling になる。「rooted か？」という check をすべて通る |
| #7206 | Method receiver を load し、allocate し得る argument expression を lower してから使用 | Load 単体では明らかに正しく見える |
| #7206 | \`base[key]\`：base を materialize、key expression を lower、その後 stale base を使用 | 2 operand の一方を最初に評価し、最後に使用 |
| #7226/#7239 | Scanner が rewrite しない heap pointer を thread-local / static cell が cache | IR にはまったく見えない |

4つは **1日で出荷** されました。Fix は毎回数行でした。コストは常に detection lag です。最初の形だけが shadow-stack-specific です。残りは lowering-independent で、statepoint 移行後もそのまま残りました。間違いは root の定義ではなく、*lowering がいつ root を emit するか* にあるからです。

本当に役立つ唯一の heuristic：**完全に再現可能な GC bug は register ではなく table を意味します。** Unrooted register は collection が window に落ちたときだけ壊れるため intermittent です。Unrooted cache は collection #0 で壊れ、そのままです。既知の例外は1つ、rooting で直せない6番目の形です。Heap \`StringHeader\` から borrow した \`&str\` / \`&[u8]\` を allocating call 中に保持するケースです。Rooting が rewrite するのは *slot* であり、borrow は slot ではありません。Sound な fix は、最初の allocation より前に byte を off-heap へ copy することだけです。

### 2. 調査をやめ、instrument を作り始めた

#7154 の転機は fix ではありません。10回の investigation のあと inspection を諦め、bug を即時 fault へ変える tool を作ったことです。

**From-space quarantine.** Evacuating minor 後に from-space を recycle しません。Retired block を bounded ring へ切り離し、先頭 byte が invalid \`obj_type\` (\`0xDE\`) に見える poison word で埋め、page-aligned interior を \`mprotect(PROT_NONE)\` にします。Stale dereference は holder がまだ stack 上にいる状態で、*問題の instruction* で SIGSEGV になります。Reporter は fault address、その page を retire した minor、以前そこにあった object を表示し、\`SIG_DFL\` を復元して再 fault するため、debugger も実際の site を見られます。

**GC zeal.** すべての safepoint で evacuating minor を強制し、unrooted value が無関係な allocation burst と偶然重なるまで待たず、最初の exposure で move するようにします。V8 の \`--stress-scavenge\` と SpiderMonkey の \`gcZeal\` がモデルです。

**誰も必要だと思わなかった depth knob.** Quarantine は *N* 個の retired page-set の ring で、default 4です。#7154 の \`new C(…)\` reproducer は depth 4、8、100でも fault しません。Constructor body は約600 back-edge poll を越えるため、return-override が caller の stale register を公開するとき、その page は600回前の retirement です。\`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\` なら最初の use で fault します。疑わしい bug が再現しないとき、「depth を上げる」が最初の助言になりました。

Instrument 自体も単に実行するのではなく、**sabotage-test** します。\`quarantine_catches_a_planted_stale_from_space_deref\` は #7184/#7192 の形を意図的に仕込み、instrument が poison を報告する一方、un-instrumented control は完全に有効な recycled object を読むことを確認します。この control が重要です。Tool なしでは本当に invisible だと示します。

Static instrument もあります。\`scripts/gc_root_dominance_check.py\` は emitted LLVM IR を読み、root store が後続の collect 可能 site を dominate するか確認します。CI gate の known-remaining allowlist は現在 **空** で、新しい hit は red build です。ただし runtime table、runtime Rust の unrooted local、symbol set に名前のないものという3 class には構造的に blind です。それを明記しています。Clean report が、確認不可能な事柄の証拠として二度扱われたためです。

### 3. Knob の半分は何も切り替えていなかった

これは code より engineering policy を変えた驚きです。

\`PERRY_GEN_GC_EVACUATE\` は何か月も、変更が evacuation 下で安全だと証明する knob でした。ようやく正しく計測すると — identical binary、same host、12 ratchet probe × 8 counter の cell-by-cell diff — **96 cell 中0 cell** しか動きませんでした。Median は bit-identical。同じ手順で \`PERRY_GEN_GC=0\` は79 cell を動かしたので harness は sensitive、しかしその knob は違いました。Counter が発生しない fallback path を gate していたのです。

唯一の live effect は footgun でした。Forced evacuation を veto するため、環境に \`PERRY_GEN_GC_EVACUATE=0\` があると前節の \`PERRY_GC_ZEAL\` をひそかに disarm し、何も move していない zeal run が「clean」と報告できました。

ほかにもありました。

- \`PERRY_GC_FORCE_EVACUATE\` は **minor path だけ** で読まれ、これを使う全 test は \`gc()\` から collection を動かしていました。そこでは forced conservative scan のあと full mark-sweep が走ります。何か月もの「forced evacuation で pass」は無意味でした。
- Stress matrix の \`--pressure\` knob は測る path を無効化しました。Defer hard cap と arena trigger ceiling が式を共有して一緒に collapse し、\`default\` arm は22 row すべてで copying minor 0でした。
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\` は単体で完全に inert。Scan は走らず、何も abort せず、run は success。
- \`gc_incremental_enabled\` の doc comment は「EXPERIMENTAL — default OFF」、8行下の body comment は「DEFAULT ON」。Merge decision が間違った方に基づきました。

生まれた policy は \`CLAUDE.md\` で binding です。

> **すべての GC env knob は OFF state を実行する required CI arm を持つか、1 release の soak 後に削除します。** Diagnostic-only knob は同時に最大1つで、untested と明記します。
>
> **まだ存在する mode は、まだ下されていない decision です。**

\`PERRY_GEN_GC_EVACUATE\` は fix ではなく delete しました。各 deletion site には、そこに何がありなぜ消えたかを説明する tombstone comment が残ります。誰かが conjunction を再導入しそうな位置に5つです。CI audit は comment でない production parser から accepted knob name を導出し、削除済み knob に関する live claim を fail します。Self-test は commented-out parser の後ろへ削除済み knob を植え、どちらも pass できないと証明します。

### 4. 失敗できない gate

\`CLAUDE.md\` には CI gate が構造的に merge を red にできない4つの形を載せています。4つすべてがこの repo を襲い、うち3つは1週間以内でした。

1. \`continue-on-error: true\`。\`gc-stress\` は GC correctness を覆う唯一の job なのに数か月これを持っていました。
2. Branch protection の required context でない。Failure を報告しても block しない job は gate ではなく documentation です。
3. 無条件 \`cancel-in-progress\` 付き \`concurrency\`。遅い runner queue では、新しい merge が前の run を runner 到達前に cancel します。\`gc-ratchet\` は連続3件の \`main\` run が cancel、実行0。
4. **Gate は走るが、その subject が一度も走らない。** Job が本当に green なので最も危険です。

さらに2つ見つかりました。\`gc-stress\` は \`main\` で *一度も走っていません*。Workflow の \`push:\` trigger は tag-only、job の \`if:\` は \`schedule\` を含まず、nightly 12/12 が \`skipped\`。そして required context の \`lint\` は、2000行 limit を超えた16 file によって3回以上の nightly で red。すべての merge は admin bypass で入りました。Branch protection は芝居で、正しく構築し \`lint\` に接続した新 gate も到着時から inert だったでしょう。

繰り返し学ぶ帰結：**gate は、何も throw しなかったことではなく、subject が live だったことを assert しなければなりません。** Zeal run は exit 時に \`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\` を出し、**どれかが0なら exit 70**。何も exercise しない run は green でなく red です。

### 5. Collector は役に立てない collection を繰り返し schedule した

再発する structural bug、独立した3 instance、同じ形です。*Predicate が、predicate の読む量を変えられない collection を schedule する。*

**Survivor-promotion handoff (#7592).** Promote 予定 survivor のため old-gen space を空ける目的で、predicate が minor を full mark-sweep に置換しました。しかし full mark-sweep は non-moving で何も promote せず、schedule 原因の pressure を緩和できません。次の minor でも再び true。200k record の JSON pipeline では、**22 collection 中19がこの full、各約400 msで0.0 MB free**。8.6秒 phase のうち7.6秒。実際に promotion する copying minor は一度も走りませんでした。

**Nursery cap (#7690).** From-space occupancy に基づく cap を、in-place sweep で from-space を占有したままの *non-moving* minor に適用。Cap trigger が non-moving minor を起動すると次 block ですぐ due になり、allocate 1 MB ごとに whole-arena collection、live set に対して quadratic です。

**Fixed point になった live-proportional cap.** \`max(base, arena_in_use)\` を使って nursery cap を live set に合わせました。しかし due test は *from-space occupancy* と cap を比較し、その workload では from-space ≈ live。From-space は自分自身の cap を越えられず、scavenge が完全停止。何もしないことで5.9×高速化しました。

Pacing code を支える2ルールが生まれました。

> **Collection が動かせない量を使って、その collection の cadence を決めてはいけません。**
>
> **Per-cycle cost が O(live) の collector を constant band で pace してはいけません。** Total work は live set に対して quadratic になり、大きな constant は cliff を移動するだけです。

この一群を直すと、JSON workload は **60.4秒から3.86秒** へ。以前70×増えていた20× size range で、per-record cost は約30%以内に平坦になりました。

### 6. Collector が、一度も行っていない変更を文書化したこともある

この話で最も高価な1行は doc comment です。

#7690 は moving loop back-edge poll を default ON にする完全な論拠を runtime と codegen の2つの doc comment に書き、**どちらの body も変更しませんでした。** 両方とも \`1|on|true\` のみを match、つまり default OFF。どちら向きにも default を固定する test はありません。Runtime comment は codegen mirror と「MUST agree」とまで断言。実際、document が変更済みだと主張する以前の value で一致していました。

単なる遅い configuration ではなく、別の collector です。Nursery pressure の precise collection point は loop back-edge poll と outermost microtask-pump boundary の2つだけです。Poll が emit されなければ compute-only program はどちらにも到達しません。そのため全 nursery collection が allocation point に落ち、以前の fix により正しく non-moving でした。**出荷 collector は nursery evacuation を一度も行わず**、whole-arena full collection へ fallback していました。

| benchmark | 出荷 \`main\` | poll を実際に ON |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

ある benchmark は、数週間前なら **105 copying minor（0.016秒）** だったところで **13 whole-arena full collection（0.477秒 pause）**。\`tree\` の total GC pause は4.107秒 → 0.550秒、max pause は266 ms → 16 ms。

見つけた diagnostic は wall time でなく、\`PERRY_GC_TRACE=1\` の cycle の *種類* でした。\`{'minor': 105}\` のはずが \`{'full': 13}\`。

3 test が unrecognized-value arm を含む default を固定し、さらに1つが2 crate の一致を固定します。不一致は両方向に silent です — 消費されない poll、drain されない deferral — から、agreement を主張する2 comment ではなく assertion が必要です。

この class は未解決です。今週の profiling で write barrier に同じ形が見つかりました。**Codegen は barrier-active counter を \`seq_cst\` load — aarch64 の \`ldar\`、\`evalNode\` に42 site — する一方、runtime は同じ判断の同じ global を \`Relaxed\` で読みます。** Codegen の doc comment は「one relaxed load of a \`static\`」。同じ global の2 reader が required ordering に反対し、documentation は code に反対しています。正しいのは最大1つ。Runtime が間違っていれば \`ldar\` よりはるかに重大です。推測の failure mode は insertion barrier の見落としで、collection 時には silent、数 cycle 後に \`TypeError: value is not a function\` となるため、意図的に file だけして fix していません。

### 7. 最も速い GC 作業は、削除した作業

Pacing bug を除くと、残る cost は何度も「存在すべきでない作業」だと判明しました。

**何も死なない heap を何度も mark。** \`retain.ts\` は3M element の record array を作り、何も drop しません。Perry は **1.31秒中1.26秒を collector 内**、96%。Node は0.13秒。2回の full mark-sweep が合わせて4 MB reclaim、片方は arena occupancy を正確に0しか動かしません。Escalation predicate が growth に基づき、増える live set は倍になるたび threshold を越えたからです。Fix は full を reclaim 量で評価し、productive でないと証明されたら threshold を右へ shift。

**全 evacuated object が空 map を hash するため process-global mutex を取得。** Move hook が residual \`Object.setPrototypeOf\` registry へ SipHash \`remove\`。Re-prototype しない program では空です。空を示す latch は既存でしたが、move hook だけ使わず、3M record promotion で2.5M回の uncontended-but-real mutex acquire。

**次に object 自体を move しなくした。** Copying minor の nursery がほぼ全 live なら、object-by-object evacuation は純 overhead です。Fresh old-gen allocation、\`memcpy\`、layout transfer、accounting、move hook、forwarding stub、全 referring slot の rewrite。行く理由のない場所へ移すだけです。Whole-block in-place promotion（V8 の page promotion）は block の generation label を変えます。Move しないため rewrite も不要です。

| workload | 前 | 後 |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**その後、trace さえやめた。** それでも3 pass が survivor 全体を walk。Remembered-set dirty scan が mark、drain が再 touch、\`clear_marks\` が3回目。何も move せず free できない cycle で trace は約55〜67 ns/object、実際に promote する walk は約9 ns。直前に測った survival ratio が fully-live regime なら、promoting cycle は trace を完全 skip します。ただし登録済み weak-target holder、non-empty malloc registry、進行中 incremental mark、3つの verify instrument のどれかがあれば拒否。各 instrument は trace を subject にし、mark がない cycle では何も調べず success を報告できるからです。結果、\`retain\` −33.6%、\`deeplist\` −43%、243 ns/object だった promoting cycle は **8.9 ns**。

Policy は推測でなく *測定* です。Block liveness は trace 前に不明なので、decision は previous cycle の measured young-survival ratio から per-cycle で行います。Population は3桁にわたり bimodal でした。

| workload family | copying minor | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *copying minor は一度も走らない* |

Mispredict した cycle が retain するのは nursery の数%まで。Promoting cycle は自己測定に十分な頻度で trace し、promoted dead byte の running cap が steady state を制限します。

明言すべきこと：**「1 mechanism」という話はたいてい誤りで、profile 自体が足元で動きます。** 最終順位と同じ commit で測った現在の pause fraction：

| program | wall | GC pause | pause fraction | cycle |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

2つの値は1週間前まで93%と62%。この節の作業が消しました。\`shapes\` 7%はもう GC benchmark ではありません。\`8 の bug 前は139 ms中94 msがGCで、その ratio だけを根拠に「high-survival GC」に分類していました。GC lever はもう動かしません。Benchmark 間で一様に見えた ratio は算術上の偶然で、共通原因の証拠ではありません。

### 7b. 「0 cycle」は「GC cost なし」ではない — 結論と誤読した counter

\`asyncpipe\` は0 cycle、pause 0 ms。内部では「pure mutator program、全 GC lever irrelevant」と書きました。その premise で brief した profiling round が否定しました。

\`asyncpipe\` は \`[gc]\` line を一度も出しませんが、**leaf profile の約33%は collector machinery** — write barrier、per-object layout side table、\`RuntimeHandleScope\` rooting。Moving loop back-edge poll を off にすると、**program がなお0 GC cycle のまま −14.1%**。Incremental old-gen mark/sweep が poll で drive され、cycle を完了せず、したがって報告もしません。Round 最大の lever なのに、premise はそこから目を逸らしました。\`PERRY_WRITE_BARRIERS=0\` は +0.9% なので codegen barrier は無罪、incremental drive は違います。

> **Cycle counter は collection を測り、collector cost を測りません。**

Barrier、side-table maintenance、rooting、incremental slice は mutator-side で per-cycle trace から構造的に invisible。\`0 cycles\` は結論に見えて1 mechanism の観察にすぎません。

同じ round の関連 trap：\`asyncpipe_big.ts\` は valid な scaled \`asyncpipe\` ではありません。120 batch は0 cycle、240は2 copying minor、1200はGC-dominated。Noise floor を越すため scale すると別 benchmark をひそかに生成しました。\`9 の vacuous「realistic」variant と同じ形で、study property が scaling 後も残るか確認したため発見。

### 8. 境界を16 byte 超えた

Campaign 最高の単一 bug。\`shapes\` は139 ms run のうち94 msを2 minor collection に費やし、実際の live set は約3,200 object なのに young-survival ratio 739‰、925‰。

\`arena_alloc_gc\` は \`LARGE_OBJECT_THRESHOLD_BYTES\`（16 KB）を超えるものを直接 old-gen に生み、\`TENURED\` を付けます。2000 element の \`Node2D[]\` backing store は16,400 byte。**境界を16 byte 超えています。**

各 round の array は永久に live（minor は old-gen を sweep しない）。Write barrier は2000 store ごとに old→young edge を忠実に記録し、後続 minor の remembered-set scan が2000すべてを live と再 mark。94,000、次に118,006 slot を remark。

「threshold を上げる」は誤りなので fix が興味深い。境界越えは *copy cost* と *retention cost* の交換です。Pointer-free object では同じ量、object size で bounded なので16 KBを維持。Pointer-bearing object の retention は transitive で unbounded、よって array、object、closure は128 KB（V8 の \`kMaxRegularHeapObjectSize\` も同じ理由で同じ線）。Selection は hardcoded type list でなく既存 \`pointer_free\` flag を読み、unknown type は conservative value。

\`shapes\` は fix round で0.139秒 → 0.061秒、最終 sweep で0.058秒、Node より1.39× *高速*。Peak RSS は71.4 MB → 32.3 MB。他18 program は±1.3%以内。

### 9. 計測は fix より難しかった

自信をもって誤った結論を生んだものの一部です。

- **壊れた \`main\` に対して benchmark。** 数日間 allocation-heavy program は約20×遅く（驚き#6）、すべての A/B が無意味。Load-independent な signature — collection count 105 → 1304 — は決定的でしたが、wall-clock が単に *悪く*、荒唐無稽でなかったため誰も見ませんでした。
- **Auto-optimize relink が runtime を \`--no-default-features\` で rebuild** し、\`diagnostics\` を黙って落とす。\`PERRY_GC_TRACE\` は何も出さず、cycle count は **0**。ある investigation は3 arm を「0 collection」と結論。
- **別 host、30 version 前の pinned ratchet baseline** が pure drift の29「regression」を報告。常に同じ machine で両 A/B arm を back-to-back。
- **Pretenuring win 108 MB → 0 は confound。** Base arm 後に別 change が landing。Mechanism は正しく target が誤り（runtime-allocated parse tree で、到達可能な codegen-visible literal ではない）、ceiling は約1 MB。
- **Crash する program を数週間 timing。** Competitor binary は \`deeplist\` の正解を出した後、recursive refcount drop で −11 (SIGSEGV)。その column を loss と記録。現在は全 timing harness が cell ごとの exit code を記録。
- **\`grep -c\` は0 match で exit 1**、benchmark script の \`&&\` chain を黙って切る。Exit 141 の SIGPIPE を受ける \`PERRY_GC_TRACE\` pipe も同様。

残ったルール：clock ではなく census counter を引用（load-independent）。Timing 前に *binary* を比較。Comparison が実際に何かを比較したと assert。Test 対象 arm が live だったか確認。

---

## 第3部 — 2つの長い道

### Statepoint：4か月と3つの enabler を経て選んだ道

LLVM の \`gc.statepoint\` は最初の prototype から、correctness 上明らかに優れた mechanism でした。**Optimizer が尊重しなければならない relocation semantics** を持ちます。Shadow stack は、spill し忘れた value に optimizer が賢いことをしない間だけ正しいものです。興味深いのは「明らかに優れている」から「default で出荷」までのすべてで、遅延理由に performance はありません。

**GC ではないものに block されていました。** Exception は \`setjmp\`/\`longjmp\` へ lower され、\`longjmp\` は \`gc.relocate\` を *飛び越えられる* ため relocated pointer が書き戻されません。RS4GC ではさらに悪く、\`mem2reg\` は setjmp correctness に必要な volatile alloca を promote しないので、try-region root は SSA に入らず relocate されません。\`gc.statepoint\` にはまさにそのため invoke form があります。Statepoint への道は、Perry の setjmp exception lowering 全体を削除して invoke/landingpad へ置換（#7302/#7305）し、pass pipeline を制御できるよう LLVM を in-process 化（#7301）するところを通りました。どちらも GC ticket ではありません。

**魅力的な compromise が trap でした。** 「\`try\` function には shadow stack を残す」は2 root mechanism を永久に固定します。「shadow stack を消して statepoint を残す」も候補でしたが、statepoint は shadow stack の root-set analysis の alternative lowering であって independent mechanism ではなく、そもそも *表現不可能* でした。Predicate の分割（#7340）で初めて per-target default と将来の deletion が可能になりました。それ以前の \`PERRY_SHADOW_STACK=0\` + statepoint は **precise root が一切ない binary**、\`__perry_gcmap\` section なし、correct output、collection が live object を free するまで good build と区別不能でした。

**2 backend の片方は死ぬ必要がありました。** RS4GC と並んで explicit hand-written statepoint bridge を維持していましたが peer ではありません。Bridge は \`invoke\` を root できず、\`try\` を持つ function を拒否。また RS4GC の silent fallback であり、knob kill-policy が防ぐ untested configuration でした。削除前に計測：**real Drizzle app と ratchet probe の1574 function はすべて RS4GC lowering、fallback 0。** Bridge、CFG-based liveness analysis、call parser、emitter、\`PreciseRootBackend\` enum、\`PERRY_STATEPOINTS\` knob はまとめて削除。Bail は downgrade でなく function 名を示す hard failure です。

**その後 default は coverage なしで出荷。** Walkable target では native root が何か月も default なのに、**root-lowering mechanics 9個が Perry の実際の lowering に対する assertion 0**。Coverage に見える3 test は何も測らず、\`js_shadow_slot_bind\` が *absent* と assert。Native default 下では rooted / unrooted を問わずすべての program で true です。Root を黙って失わないことが仕事の system で再び hazard 4。#7653 は pre-\`opt\` IR、post-RS4GC \`"gc-live"\` bundle、decoded \`__perry_gcmap\` blob の3 vantage で修正。各々が次の blind spot を補います。Static root-dominance checker は逆側から同じ問題で、\`@js_shadow_slot_bind\` に anchor したため corpus は \`PERRY_RS4GC=0\`。#7663 まで、もう出荷しない lowering を検査していました。

測定した negative result と引き換えに1つの design law が得られました。**Relocation semantics のない root metadata は optimizing compiler 下で unsound。** Compact per-function metadata scheme は map を10〜13×小さくしましたが、10行 churn loop を deterministic に corruption。Map machinery でなく、mutator が stale heap-derived SSA value 経由で from-space を読むためで、relocation だけが直せます。Barrier は memory ordering を制約し、dataflow は制約しません。

### Unboxing：進行中、そして今や主役

もう1つの長い道は第1部のものです。Unboxed native representation を canonical にし、NaN-boxing を polymorphic fallback へ降格。Phase 1（scalar local）、2（specialized ABI）、3a/3b（string と \`Ptr<Shape>\` pointer local）、4a/4b（typed heap：numeric array、その後 boxed layout が不必要に払っていた bookkeeping）は merge 済みです。

正直に報告すべきことが2つあります。

**1 sub-phase は評価後に却下。その理由は NaN-boxing への賛辞です。** Phase 4b の元の headline、unboxed *object field* は recon 後に実装しませんでした。\`number\` field slot はすでに raw IEEE bit です。NaN-boxing は \`0x7FF9..=0x7FFF\` だけを reserve するので layout の \`raw_f64_mask\` は *proof bit* で storage change ではなく、read-side guard も消えていました。Raw string handle は短い string を無駄に heap materialize して small-string optimization を壊します。Raw \`i1\`/\`i32\` slot は3つ目の mask と約25 direct slot-read site で layout probe が必要で、\`JSON.stringify\`、\`util.inspect\`、\`v8\` serde など hot path を含みます。代わりに出荷したのは elision。Proven receiver への field store は value が構造上 non-pointer なら layout note、heap string になれないなら string addref を不要にします。

**GC が campaign の次 target を渡しました。** 第4部の最終計測では hardest cluster の constraint は collector でなく mutator、具体的には **2-field object literal が72 byte**。RFC が言うまさに representation problem で、「actual object」は次にそこへ向かいます。

### 選ばなかった道

**Concurrency.** Owner の直接の指示：

> 「Parallelism / concurrency を目的化して追いたくない。必要な作業のための後の手段であるべきで、hot path を犠牲にしてはいけない。」

Constraint が design を *決定* します。3 family は mutator への課金箇所が異なります。Parallel stop-the-world は課金なし（GC thread は pause 中だけ存在）。Concurrent marking は pointer write ごとに store barrier。Concurrent compaction は pointer read ごとに **load barrier**。Load は store より圧倒的に多く、最後が最も強い no。Parallel STW だけが admissible で、(1)不要な per-object work の削除、(2)immortal cohort の pretenuring の後、3番目です。存在すべきでない2.1M object visit を parallelize するのは、4 core で間違ったことを高速化するだけです。

測定は指示以上に強く同意しました。\`7 後、worst promotion case の per-object visit は、削除済み work と **159 ms program 中9.6 ms** にほぼ二分。Parallelize する collector time が足りず、GC work 2×でも program 3%。Parallel GC は deferred plan ではなく、この workload set では measured non-lever です。

Correctness argument もあります。現在「完全再現 GC bug は table、register ではない」は本物の diagnostic。Parallel collector はそれを壊し、79 root scanner と全 \`thread_local!\` cache を data race 候補にします。

**Old-page defragmentation：default ON で出荷し、同日 revert。** Rule 1 の最も新しく明快な例です。

Partially-live old page compaction は2026-07 bug 以来 off。Moved old object への stale non-heap reference が、enabled で6/6 corruption。再有効化は env flip でなく *rewrite-contract project*。Tracking issue は全 metadata/IC/cache path を列挙し、**「reproducer と dependency-scale stress corpus が clean になってからだけ defrag を re-enable」** と acceptance bar を明記。

Contract work は良好です。Static root-dominance allowlist は空のまま、以前 exempt だった約40 hit は再 suppress でなく本当に fix。Runtime holder policy は *強化* し、\`open_gap\` と \`unverified\` を fail。安全性が明示的に「only old-gen defrag can move them」に依存した2 cache も exempt でなく fix。削除した exemption の \`becomes_real_when\` はまさにこの trigger を指していました。

**Default flip** は一緒に来ましたが evidence はなし。Suite が構造的に生成できません。Selection は old page で \`dead_bytes >= live_bytes\`、つまり大規模な promote-then-die が必要。\`retain\` は999〜1000‰ survive、\`churn\` はほぼ promote せず、**候補 page を作れる benchmark がない。** Benefit signal も regression signal もなく、old-address rewrite surface 全体だけ継承。Merge 時には全 GC gate が queue で未実行。

Correctness work はすべて保持し、実際に exercise する fragmentation workload ができるまで default を opt-in へ revert。その時 losing arm は放置せず削除します。新ルール：

> **Benchmark suite が trigger できない feature を、その suite は defend できません。** Workload が存在するまで default OFF で出荷するか、両 arm が untested と認めてください。

**Pretenuring.** 2回 build、measure、refute、written reopen condition とともに park。Architecturally correct な「long-lived object を birth 時から old-gen」は、emergently sufficient な「promote-on-first-copy seed が cohort を1 hopに制限」に負けました。構築可能な全 load で両 arm は indistinguishable。Meta-lesson：**invariant を構築する前に discriminating shape を test。**

---

## 第4部 — 現在の状況

2026-08-12 最終 sweep。静かな pinned M1 mini、best-of-5、exit-checked、timing 前に \`node --experimental-strip-types\` と output を byte-verify。Node 26.5.1 と参照カウント AOT competitor に対する19本の GC-shaped benchmark。

**Perry は19本中9本で Node に勝ち**（開始時3本）、**refcounting compiler には14本で勝ち**、**15本で Node の1.3×以内**。

| bench | perry | node | P/node | Δ 今回 |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

残るのは2つの **disjoint cluster**。1 mechanism として扱うのは、すでに一度犯した誤りです。

1. **対 Node：dispatch と mutator、ほぼ GC ではない。** \`iso_miss\`、\`interp\`、\`pipeline\`、\`asyncpipe\`。主に polymorphic property dispatch、inline cache、representation selection — 別 campaign。ただし \`asyncpipe\` の0%を「GCなし」と読む前に下の訂正を参照。
2. **対 refcounting compiler：\`retain\` family。** \`retain1\` 1.80×、\`retain_wide1\` 1.67×、\`retain_wide\` 1.65×。すべてすでに Node に勝利。何も死なず、tracing collector が最悪と予想した row ですが、その予想は興味深い形で誤り。

最終 sweep の発見が campaign 全体を再構成します。**第2 cluster で binding constraint は collector ではなく mutator。** *全* GC pause を引いても \`retain_wide\`（pure mutator 130.8 ms）と \`shapes\`（60.2 ms）は負けます。\`retain\` は parity に正確に zero GC が必要。実際の cost は **2-field object literal が72 byte** で、\`retain\` は **48 MB の数値を保存するため216 MBを書き込む** — 4.5× write amplification。Competitor の優位は refcounting でなく compactness でした。これは collector problem でなく representation problem (#7916)、第1部の unbox-by-default を scalar ではなく object layout へ向けるものです。

他 cluster に対応する defect：\`asyncpipe\` は1200〜1650 ns/object で collect、うち **0 object を処理した122 ms minor collection** は program 全体より長い。Object count 非依存の per-cycle cost は fixed overhead で、critical path に残る collector 最後の部分 (#7915)。

Negative result として記録する obvious next move：**最初の nursery を縮めない。** Cycle 0 は \`retain\` family の GC pause 58〜81%。2 MB cap なら \`retain\` pause 52 → 31 msで無料に見えます。しかし \`asyncpipe\` は0 collection → 4、127 ms program に385 ms。早い promotion が old-gen trigger を追加 full mark-sweep へ retime（\`retain_wide1\` +182%）。

開始点の規模：campaign を始めた JSON pipeline は60.4秒 → 3.86秒。\`retain\` family はこの作業1 round で36〜46%改善。Collector 全体には full mark-sweep への kill switch（\`PERRY_GEN_GC=0\`）があり exercise を継続。これと bisect できなくなる日は、数値を信頼できなくなる日です。

---

## 現在の作業ルール

学びの大半は GC を越えて一般化できます。

1. **まだ存在する mode は、まだ下されていない decision。** Losing branch を delete するか、exercise する arm を保持。削除位置に tombstone comment。
2. **Gate は subject が live だったと assert** し、何も throw しなかっただけでは不可。「何も走らず green」は red より悪い。
3. **動かせない量で feedback loop を pace しない。** 3つの別 livelock、1つの形。
4. **O(live) process を constant band で pace しない。** 大きい constant は cliff を移すだけ。
5. **証拠を残さない bug class では調査をやめ instrument を作る。** Bug が invisible だったと証明する uninstrumented control を含め sabotage-test。
6. **Doc comment は change ではない。** Unrecognized-value case を含め default を test で固定し、一致すべき component 間の agreement も固定。
7. **同じ host、同じ tree から両 arm を測り exit code を確認。**
8. **Invariant を作る前に discriminating shape を test。**
9. **Permanent hybrid を拒否。** 「hard case は old mechanism のまま」が migration を永遠の2 mechanism にする。Hard case を動かすか、migrate しない。

Collector は完成していません。しかし初めて *理解可能* になりました。すべての knob は何かを gate し、すべての gate は fail でき、すべての default は test で固定され、すべての公開値は output を先に verify した静かな machine で測定されました。この理解可能性は Collector 本体より多くの作業を要し、直近1か月の数値が動いた唯一の理由です。
`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
