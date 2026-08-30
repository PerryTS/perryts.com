import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = String.raw`**摘要。** Perry 把 TypeScript 编译成原生二进制文件，使用的是可移动、分代、具有精确根的追踪式收集器，而不是引用计数。经历了一个月几乎全部 GC 工作都在*弄清收集器实际上做了什么*之后，Perry 现在在 19 个 GC 型 benchmark 中有 9 个胜过 Node（最初是 3 个），14 个胜过采用引用计数的 AOT 竞争者，15 个与 Node 的差距不超过 1.3 倍。一路上，我们遇到了不留下任何取证证据的一类 bug、什么都不控制的环境变量、结构上不可能失败的 CI gate、一条让我们悄悄发布了另一种收集器的文档注释，以及一项表明剩余差距在对象 *layout* 而非 collection 的最终测量。我们提炼出的九条规则在文末，其中大多与垃圾回收无关。

Perry 直接把 TypeScript 编译成原生可执行文件：SWC 负责 parse，我们 lower 到 HIR，LLVM 生成机器码，¤cc¤ 完成链接。没有解释器，也没有 bytecode。但这门语言仍有逃逸出 scope 的 closure、比其 scope 活得更久的对象和引用环，因此原生 binary 背后必须有真正的垃圾回收器。

本文记录我们构建它时作出的选择、令我们意外的事情——几乎都令人不快——以及今天的数据。几个月来，收集器一直是 codebase 最活跃的区域：**自 2026 年 7 月 1 日以来，有 201 个 commit 触及 ¤crates/perry-runtime/src/{gc,arena}¤，其中 110 个发生在最近十二天**，涉及 127 个文件和约 7.5 万行。572 个尚未发布的 changelog fragment 中，135 个名称与 GC 工作有关。

这些工作几乎都不是“实现收集器”，而是弄清我们的收集器实际上在做什么。

---

## 第一部分——我们的选择

### 不使用引用计数

第一个问题通常是：AOT 编译器为什么不直接使用引用计数？它看起来很合适：没有 root discovery 问题，不需要 safepoint，也不必和优化器协作。我们用于对比的 AOT TypeScript 编译器正是这么做的。

但我们选择了追踪式收集器，因为引用计数会让常见情况为罕见情况付费：每次 pointer store 都要更新 counter，环仍需要备用 tracer，而 JS 会分配海量立即死亡的对象——这正是 nursery 几乎免费处理的情况。如今这个决定在 19 个 GC benchmark 中有 14 个看起来正确、5 个错误；文末再谈它们。

### Value 使用 NaN-boxing——而我们正在撤销其中一部分

每个 JS value 占一个 64 位 word。我们使用 IEEE 754 大约 2⁵² 个空闲 NaN pattern 给 pointer、小整数和 singleton 加 tag，其余都是普通 ¤f64¤：

¤¤¤
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
¤¤¤

对收集器来说，这是一笔极好的交易：“这个 word 是 pointer 吗？”只需 mask-and-compare，tracing 时不需要逐 value 查询 type。静止的数字已经包含自己的 IEEE bit，因此 numeric field 不需要 box 或 header。

但对 *mutator* 来说，它是我们与 V8 之间最大的单一障碍，我们正在主动移除它。问题不只是 NaN-boxed ¤double¤ 是*一种* representation，而是它成了 **canonical representation**。原生机器 type 只能作为局部 region 的 overlay 存在，而整套 ¤materialize_*_to_js_value¤ 会在每个 JS-visible boundary 重新 boxing。生成的 IR 中，一个已证明是 ¤i32¤ 的 loop accumulator 却住在 ¤alloca double¤，经过 ¤-O3¤ 后仍以 ¤phi double¤ 跨越 back-edge，并在**每次迭代**支付 ¤fptosi¤ + ¤sitofp¤ 往返。Function parameter 一律是 ¤double %argN¤，因此 hot function 会重复 unbox 参数数百万次；以前甚至 numeric local 也注册为 GC root，尽管数字永远不可能是 pointer。

决定性的测量是：忠实 unroll 的 bcryptjs ¤_encipher¤ 用时 834 ms，而 Node 为 184 ms——并且*添加类型标注反而更差*，从 834 变成 2732 ms，因为每次读取约 80 个 guard 和 boundary 上的 rematerialization 占据主导。Expression 级 fast path 修不好 representation problem；每一条都只是 boxed canonical 上的另一层 overlay，在 unrolled code 中效果甚至相反。

我们的方向（¤docs/representation-selection-rfc.md¤ 与 unbox-by-default 计划）是：让所有能静态证明的 value——scalar、string、object、typed array、closure——从 local、parameter、return 到 typed heap slot 全程以 unboxed native form 为 canonical，只把 NaN-boxing 留给已证明 polymorphic 的 value。它仍是*默认* representation，但不再是*唯一* representation。Phase 1、2、3a、3b、4a、4b 已合并。Static Hermes 是存在性证明。AOT 必须在 JIT 可以猜测的地方*证明* type，但这也是优势：已证明的 kernel 不需要 warmup，也不会 deopt。

这会从两个方向直接影响 GC。Unboxing 移除了收集器要扫描的 roots——已证明的 scalar 不是 root——同时增加了义务：当 heap slot 存储的不是 NaN-boxed word 时，收集器无法从 value 推断它是否为 pointer，必须查询每个 shape 的 layout mask。¤pointer_mask¤、¤raw_f64_mask¤ 和 layout note 这套机制引发了下文数个 bug。

### 每个 thread 一个 heap，不共享

Perry 默认 single-threaded；¤perry/thread¤ 提供 ¤spawn¤ 和 ¤parallelMap¤，value 通过 deep copy（¤SerializedValue¤）而不是共享来跨越 thread boundary。人体工程学成本确实存在，但收集器获得了巨大好处：**它永远不与另一个 thread 同步。** 不需要全局 safepoint protocol、handshake 或维护跨 thread invariant 的 read barrier。每个 arena、root scanner 和 remembered set 都是 thread-local。

### 因 allocation 分布而选择分代

每个 thread 有两个 region：nursery（¤ARENA¤，1 MB block）和 old generation（¤OLD_ARENA¤）；每次 allocation 有 8 byte ¤GcHeader¤，用两个 aging bit（¤HAS_SURVIVED¤ 和 ¤TENURED¤）代替 counter，并有 ¤PROMOTION_AGE = 2¤。2026 年 4 月 24 日、任何代码之前写下的初始计划概括了理由：超过 90% 的 JS allocation 会在创建它的 scope 内死亡，flat arena 会把一生花在反复 mark 明显已死的对象上。

计划还正确指出了其余一切依赖的 prerequisite：

> **分代 GC 需要精确的根。**

Conservative scanner 对 non-moving collector 足够：false positive 只会让死对象多活一个 cycle。*Moving* collector 不能这样。如果无法精确 enumerate roots，就无法 rewrite；不能 rewrite，就不能移动任何东西。

### Roots：一套 analysis、两种 lowering，默认使用 LLVM statepoints

LLVM 可以把 value 放在 register、rematerialize，或在任意位置 spill；收集器无法 inspect。Perry 的答案有两层，我们花了太久才把它们分开。

**Analysis**——哪些 local 包含 GC pointer、每个必须 live 到哪里——与 backend 无关。把答案放入 emitted code 的 **lowering** 则有两种：

- *Shadow stack.* 进入时 ¤js_shadow_frame_push(n)¤，每个 JS-level local 一次 ¤js_shadow_slot_bind¤，退出时 ¤js_shadow_frame_pop¤；收集器遍历 heap-backed frame。
- *通过 RS4GC 的 native stack map.* Root alloca 变成 ¤ptr addrspace(1)¤，function 得到 ¤gc "statepoint-example"¤，每个 module 通过 ¤opt -passes='function(mem2reg),rewrite-statepoints-for-gc'¤。LLVM 自己插入每个 statepoint、relocation 和后续 use rewrite；collection 时，我们从紧凑的 ¤__perry_gcmap¤ section 读取 roots。

**从 #7370 起，statepoint lowering 是默认值。** 不再需要 ¤PERRY_RS4GC=1¤；¤PERRY_RS4GC=0¤ 会回到 shadow stack 供 bisection。这个决定依 target 而定，因为 ¤gc_map¤ 拒绝为 runtime 无法解析 frame base 的 target 生成 map——没人读取的 map 会静默丢 roots。规则是 runtime 能 walk 的地方用 native roots，不能的地方用 shadow stack。aarch64/arm64 和 x86-64 用 statepoints；watchOS ¤arm64_32¤ 和 Windows ARM64 保留 shadow frame。Fallback 不是“没有 roots”，而是同一 analysis 的另一种 lowering。

不设 env 的切换证据：完整的 479-test gap suite **0 regression、0 compile failure**；所有 **128 个包含 ¤try¤ 的 test** 都成功 compile，这正是旧手写 statepoint bridge 无法处理的 class；10 个 GC ratchet probe 与 Node byte-identical；runtime −1–2%，略快；zod 81 个 module 的 binary +1.86%。

它胜过“我们 emit 了 shadow stack”的真正原因并非 1–2%。Statepoint 携带**优化器必须尊重的 relocation semantics**，而 shadow stack 只在优化器不聪明处理我们忘记 spill 的 value 时正确。证据见第三部分。

此外还有 **79 个注册的 runtime root scanner**，用于存在于 runtime 而非 user code 中的 state：pending promise、timer callback、exception state、async-context stack、shape cache、string intern table 和 JSON scratch table。

也存在 conservative native-stack scanner。我们的架构文档把它称为三种等价机制之一；这段文字已过时，而写作时发现这一点很有启发。在 production 中，¤conservative_stack_scan_decision()¤ 解析为 ¤SkipDisabled¤：liveness 完全依靠 precise map——statepoints 或 fallback target 的 shadow frame——以及 runtime helper 中的 ¤RuntimeHandleScope¤。Conservative path 仍用于特定 mode，主要是 allocation-point collection，不是 precise path 的 safety net。

### 延迟 arm 的 write barrier

分代的危险是 old→young pointer：只 trace nursery 的 minor GC 必须知道它们。Codegen 在 pointer store 处 emit ¤js_write_barrier¤，runtime 维护 remembered set。

#7250 的 arm invariant 是收集器中最可复用的设计之一：

> Disarmed 时 barrier 不记录任何东西。作为交换，一个 thread 首次*读取* remembered set 时不相信 log，而是从 heap 重建完整的 old→young edge 集合，并在遍历时 arm barrier。

它由结构强制：¤remembered_dirty_snapshot()¤ 是 ¤pub(super)¤，有七个 call site，全部位于 ¤gc/¤。

*(给 source 读者的说明：Perry 有两个互不相关的“barrier”——GC write barrier，以及 representation-selection pass 中编译期的 ¤Ptr<Shape>¤ promotion barrier。三个 issue 因混淆二者浪费了时间。请总是说明文件。)*

---

## 第二部分——意外

### 1. 不留下任何证据的一类 bug

Rooting invariant 一句话即可：

> 任何跨过 collection point 仍 live 的 GC-managed value，都必须在该 point 前从 root reachable。从 root 读出并跨 call 保存在 SSA register 中的 value **没有 rooted**：它只是副本，而收集器看不到副本。

违反它会带来项目中最糟的 debugging 体验。Collection 当下*没有任何东西可找*：没有 dangling reference、未 forward 的 slot 或 anomaly。随后 nursery recycle 地址；stale pointer 读到另一个有效对象，程序在一到多个 cycle 后、另一个 function 中以 ¤TypeError: value is not a function¤ 死亡。

所有 runtime GC probe 都是盲的。From-space scan 和 verify pass 都干净。¤PERRY_GC_VERIFY_EVACUATION¤ 能验证 reachable slot 已 forward，却无法检查一个它不知道存在的 register。

我们已归类五种曾经发布的形态：

| # | 形态 | 为什么通过 review |
|---|---|---|
| #7184 | Root store emit 到已 push frame 之外的 index | ¤js_shadow_slot_bind¤ bounds-check 后静默 no-op；IR *声称*它 rooted |
| #7192 | Root store 在会 allocate 的 call *之后* emit | slot 最终既 rooted **又** dangling；通过所有“是否 rooted？”检查 |
| #7206 | Load method receiver，再 lower 每个都可能 allocate 的 argument，最后使用 | 单看 load 显然正确 |
| #7206 | ¤base[key]¤：materialize base、lower key expression，再用 stale base | 两个 operand；一个先求值、后使用 |
| #7226/#7239 | Thread-local 或 static cell 保存 scanner 不 rewrite 的 heap pointer | 在 IR 中不可见 |

四种在**同一天发布**。每个 fix 只有几行，成本始终是 detection lag。只有第一种是 shadow-stack-specific。其余与 lowering 无关，也原样存活过 statepoints 迁移，因为错误在于 *lowering 何时 emit root*，而非什么是 root。

唯一真正有用的 heuristic：**完全可复现的 GC bug 意味着 table，而不是 register。** Unrooted register 只有 collection 落入 window 才坏，因此 intermittent；unrooted cache 从 collection #0 就坏并一直坏。唯一已知例外是从 heap ¤StringHeader¤ borrow 的 ¤&str¤ 或 ¤&[u8]¤ 被跨 allocating call 持有。Rooting rewrite 的是 *slot*；borrow 不是 slot。唯一 sound 的修复是在第一次 allocation 前把 bytes 拷出 heap。

### 2. 我们停止检查，开始构建工具

#7154 的转折点不是 fix，而是在十轮 investigation 后放弃 inspection，构建让 bug 立刻变成 fault 的工具。

**From-space quarantine.** Evacuating minor 后不 recycle from-space。Retired block 被放入有界 ring，用首 byte 看起来像非法 ¤obj_type¤（¤0xDE¤）的 poison word 填充，page-aligned interior 设为 ¤mprotect(PROT_NONE)¤。Stale dereference 会在 holder 仍在 stack 上时，*正好于出错 instruction* SIGSEGV。Reporter 给出地址、哪个 minor retire 了该 page、曾有哪些 object，然后恢复 ¤SIG_DFL¤ 并再次 fault，让 debugger 看到真实位置。

**GC zeal.** 在每个 safepoint 强制 evacuating minor，让 unrooted value 首次暴露时就移动，而不是等待无关 allocation burst 恰好对上 window。参照 V8 的 ¤--stress-scavenge¤ 和 SpiderMonkey 的 ¤gcZeal¤。

**没人预料需要的 depth knob。** Quarantine 是 *N* 个 retired page-set 的 ring，默认 4。#7154 的 ¤new C(…)¤ reproducer 在 4、8 甚至 100 都不 fault；constructor 跨过约 600 个 back-edge poll，等 return override 发布 caller 的 stale register 时，page 已经过了 600 次 retirement。¤PERRY_GC_PROTECT_FROMSPACE_DEPTH=800¤ 会在首次使用 fault。“提高 depth”如今是疑似 bug 无法复现时的第一条建议。

Instrument 会被**破坏式测试**，而不只是运行：¤quarantine_catches_a_planted_stale_from_space_deref¤ 植入 #7184/#7192 形态，要求 instrument 看到 poison，而未 instrument 的 control 读到完全有效的 recycled object。这个 control 证明没有工具时 bug 确实不可见。

还有 static instrument ¤scripts/gc_root_dominance_check.py¤，读取 emitted LLVM IR 并检查 root store dominate 后续所有可能 collect 的 site。CI gate 的 allowlist **为空**；新 hit 会让 build 变红。但它结构上看不到 runtime table、runtime Rust 中的 unrooted local 和未命名 symbol；我们明确写出这一点，因为 clean report 曾两次被当成它不可能检查之事的证据。

### 3. 一半 knob 什么都没控制

这个意外改变工程政策多于代码。

数月来，¤PERRY_GEN_GC_EVACUATE¤ 是证明变更在 evacuation 下安全的 knob。终于正确测量时——相同 binary、相同 host、12 个 ratchet probe × 8 个 counter 的逐 cell diff——它改变了 **96 个 cell 中的 0 个**。Median bit-identical。同一流程用 ¤PERRY_GEN_GC=0¤ 改变 79 个，说明 harness 敏感；这个 knob 不敏感。它 gate 的 fallback path 根本不是 counter 来源。

它唯一活着的效果是 footgun：它 veto forced evacuation，所以环境中的 ¤PERRY_GEN_GC_EVACUATE=0¤ 会静默 disarm ¤PERRY_GC_ZEAL¤，zeal run 能在什么也没移动时报告“clean”。

它并不孤单：

- ¤PERRY_GC_FORCE_EVACUATE¤ **只在 minor path** 读取，但所有使用它的 test 都调用 ¤gc()¤，后者在 forced conservative scan 后执行 full mark-sweep。数月的“forced evacuation 下通过”没有意义。
- Stress matrix 的 ¤--pressure¤ knob 关闭了它测量的 path：defer hard cap 和 arena trigger ceiling 共享公式并一起 collapse；¤default¤ arm 的 22 行全部运行 zero copying minor。
- ¤PERRY_GC_FROMSPACE_SCAN_ABORT=1¤ 单独使用完全 inert：scan 不运行，没有东西 abort，run 报告成功。
- ¤gc_incremental_enabled¤ 的 doc comment 写“EXPERIMENTAL — default OFF”，八行后的 body comment 写“DEFAULT ON”。Merge 决策采用了错误的一条。

由此产生的政策在 ¤CLAUDE.md¤ 中是强制的：

> **每个 GC env knob 要么有 required CI arm exercise OFF 状态，要么在一个 release soak 后删除。** 同时最多存在一个 diagnostic-only knob，并标为 untested。
>
> **仍然存在的 mode，就是尚未作出的决定。**

¤PERRY_GEN_GC_EVACUATE¤ 被删除，而非修复。每个 deletion site 都留下 tombstone comment 解释曾有什么、为何消失——共五处，恰好是有人会重新加入 conjunction 的位置。CI audit 从 uncommented production parser 推导允许的 knob 名，对已删除 knob 的 live claim 会 fail；self-test 在 commented parser 后植入已删除 knob，证明二者都无法通过。

### 4. 不可能失败的 gate

¤CLAUDE.md¤ 列出 CI gate 在结构上无法把 merge 变红的四种方式。四种都击中过 repo，三种发生在同一周：

1. ¤continue-on-error: true¤——¤gc-stress¤ 数月携带它，尽管它是唯一覆盖 GC correctness 的 job。
2. 不在 branch protection 的 required context 中——只报告 failure 而不 block 的 job 是 documentation，不是 gate。
3. ¤concurrency¤ 配无条件 ¤cancel-in-progress¤——慢 runner queue 中，每次新 merge 会在前一个 run 到 runner 前取消它；¤gc-ratchet¤ 连续三个 ¤main¤ run 被取消，zero execution。
4. **Gate 运行了，但它的 subject 从未运行**——最危险，因为 job 确实是 green。

后来又发现两个。¤gc-stress¤ *从未在 ¤main¤ 上运行*：workflow 的 ¤push:¤ trigger 只针对 tag，job 的 ¤if:¤ 遗漏 ¤schedule¤，12/12 nightly 都报 ¤skipped¤。而 required context ¤lint¤ 因 16 个文件超过 2000 行上限，连续三个以上 nightly 为红；这意味着每次 merge 都靠 admin bypass。Branch protection 只是戏剧，正确接入 ¤lint¤ 的新 gate 到达时也会 inert。

反复学到的结论：**gate 必须 assert 它的 subject 确实 live，而不只是没有东西 throw。** Zeal run 退出时打印 ¤forced_collections=… copying_minors=… moved_objects=… loop_polls=…¤，并在任一值为 zero 时 **exit 70**；什么都没 exercise 的 run 应该红，而不是绿。

### 5. 收集器不断安排无法帮助自己的 collection

一个反复出现的 structural bug，三个独立实例，同一形态：*predicate 安排一个无法改变其所读 quantity 的 collection。*

**Survivor-promotion handoff（#7592）。** Predicate 用 full mark-sweep 替换 minor，为即将 promote 的 survivor 腾出 old-gen 空间。但 full mark-sweep 是 non-moving 的——它什么都不 promote——所以无法缓解安排它的 pressure，下一次 minor 时又为 true。在 200k record 的 JSON pipeline 上：**22 次 collection 中 19 次是这种 full，每次约 400 ms、释放 0.0 MB**，占 8.6 s phase 中的 7.6 s。真正会 promotion 的 copying minor 一次也没运行。

**Nursery cap（#7690）。** 基于 from-space occupancy 的 cap 被应用于*non-moving* minor；它原地 sweep 并保持 from-space 占用。Capped trigger 运行一次 non-moving minor，下一 block 就再次 due：每分配 1 MB 执行一次 whole-arena collection，相对 live set 呈 quadratic。

**成为 fixed point 的 live-proportional cap。** 为让 nursery cap 随 live set 伸缩，我们用了 ¤max(base, arena_in_use)¤。但 due test 比较的是 *from-space occupancy* 与 cap，而该 workload 中 from-space ≈ live，所以 from-space 永远无法超过自身 cap，scavenging 完全停止。它因为不做事而测得 5.9× 提升。

支撑 pacing code 的两条规则是：

> **不要依据 collection 自身无法移动的 quantity 来 pace 它。**
>
> **不要用 constant band pace 每 cycle 成本为 O(live) 的 collector。** 总工作会相对 live set 呈 quadratic；更大的 constant 只是移动悬崖。

修复这个 family 让一个 JSON workload 从 **60.4 s 降到 3.86 s**；在曾经增长 70× 的 20× size 范围内，per-record cost 保持在约 30% 内平坦。

### 6. 有一次，收集器记录了它从未做过的变更

整个故事中最昂贵的一行是 doc comment。

#7690 把默认开启 moving-loop back-edge poll 的完整论证写进两条 doc comment——runtime 和 codegen——然后**一个 body 也没改。** 两者仍只 match ¤1|on|true¤，即 default OFF；没有 test pin 默认值。Runtime comment 甚至声称 codegen 的 mirror “MUST agree”；它们确实一致，但一致在文档说已不再采用的值上。

这不只是较慢的 configuration，而是另一种 collector。Nursery pressure 只有两个 precise collection point：loop back-edge poll 和最外层 microtask-pump boundary。没有 emit poll 时，compute-only program 两者都到不了。所有 nursery collection 都落在 allocation point，而之前的 fix 正确地让这里的 collection non-moving。**实际发布的收集器完全没有 nursery evacuation**，退化成 whole-arena full collection。

| bench | 已发布的 ¤main¤ | polls 真正开启 |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

一个 benchmark 执行了 **13 次 whole-arena full collection（pause 0.477 s）**，而几周前同一 program 执行 **105 次 copying minor（0.016 s）**。¤tree¤ 总 GC pause 从 4.107 s → 0.550 s，max pause 266 ms → 16 ms。发现它的 diagnostic 不是 wall time，而是 ¤PERRY_GC_TRACE=1¤ 中 cycle 的*种类*：本应是 ¤{'minor': 105}¤，却是 ¤{'full': 13}¤。

现在三个 test pin 默认值，包括 unrecognised-value arm，另一个 pin 两个 crate 一致——不一致在两个方向都静默：无人 consume 的 poll，或无人 drain 的 deferral——所以需要 assertion，而不是两条声称一致的 comment。

这个 class 尚未关闭。本周 profiling 在 write barrier 中找到同一形态：**codegen emit barrier-active counter 的 ¤seq_cst¤ load——aarch64 上是 ¤ldar¤，¤evalNode¤ 有 42 处——runtime 却为同一决策用 ¤Relaxed¤ 读取同一 global**；codegen 自己的 doc comment 还写“one relaxed load of a ¤static¤”。同一 global 的两个 reader 对 ordering 意见相左，文档又站在代码另一边。最多一个正确；若 runtime 错了，问题远比 ¤ldar¤ 严重。它被 filed 而非猜测修复，因为 missed insertion barrier 会在 collection 时静默，几个 cycle 后才以 ¤TypeError: value is not a function¤ 出现。

### 7. 最快的 GC 工作，是被删除的工作

Pacing bug 消失后，剩余成本一次次证明是不该存在的工作。

**什么都不死的 heap 被反复 mark。** ¤retain.ts¤ 构建 3M record 的 array，一个也不丢。Perry 在 1.31 s run 中有 **1.26 s 位于 collector**——96%；Node 只需 0.13 s。两次 full mark-sweep 总共 reclaim 4 MB，其中一次让 arena occupancy 的变化恰好为 zero，因为 escalation predicate 基于 growth，而增长的 live set 每翻倍就越过 threshold。Fix：按 full reclaim 的东西定价；full 证明低效后右移 threshold。

**每个 evacuated object 都为 hash 空 map 获取 process-global mutex。** Move hook 对 residual ¤Object.setPrototypeOf¤ registry 执行 SipHash ¤remove¤；在从不 re-prototype 的程序中它为空。已有 latch 说明这一点，但 move hook 是唯一忽略它的 reader。3M-record promotion 为无用工作支付了 2.5M 次真实 mutex acquisition。

**然后我们完全停止移动对象。** 当 copying minor 的 nursery 几乎全部 live 时，逐 object evacuation 是纯 overhead：新 old-gen allocation、¤memcpy¤、layout transfer、accounting、move hook、forwarding stub，以及 rewrite 每个 referring slot，只为把对象移到没有理由去的位置。Whole-block in-place promotion——V8 称 page promotion——只更改 generation label。没有移动，就无需 rewrite：

| workload | 之前 | 之后 |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**接着也停止 trace 它们。** 三个 pass 仍会遍历每个 survivor：remembered-set dirty scan mark，drain 再触碰，¤clear_marks¤ 第三次触碰。在什么也不 move、也不能 free 的 cycle 中，trace 约 55–67 ns/object，真正 promotion 的 walk 约 9 ns。现在 promoting cycle 会在最近测得的 young-survival ratio 处于 fully-live regime 时跳过 trace；若任何 assumption 有代价则明确拒绝：已注册 weak-target holder、非空 malloc registry、进行中的 incremental mark，或三个 verify instrument 中任一 armed——每个都以 trace 为 subject，没有 marks 的 cycle 会让它们什么也没检查就成功。结果：¤retain¤ −33.6%、¤deeplist¤ −43%，原先 243 ns/object 的 cycle 变成 **8.9 ns**。

政策是*测量*，不是猜测。Trace 前无法知道 block liveness，因此每 cycle 根据上一次测得的 young-survival ratio 决策。分布呈现跨三个数量级的双峰：

| workload family | copying minors | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *完全不运行 copying minor* |

误判 cycle 最多保留一个 nursery 的几个百分点；promoting cycle 仍足够频繁地 trace 以测量自己；promoted dead bytes 的 running cap 限制 steady state。

还要直说：**“一个机制”的故事通常是错的，你的 profile 会在脚下变化。** 与文末排行同一 commit 测得的当前 pause fraction：

| program | wall | GC pause | pause fraction | cycles |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

其中两个数字一周前是 93% 和 62%；本节工作消灭了它们。¤shapes¤ 在 7% 时已不再是 GC benchmark——§8 的 bug 修复前，139 ms program 中 94 ms 是 GC，我们据此把它归为“high-survival GC”。GC lever 已无法改变它。Benchmark 间看似一致的 ratio 只是算术巧合，不是共同原因。

### 7b. “Zero cycle”不等于“没有 GC 成本”——被误读为结论的 counter

¤asyncpipe¤ 一行写 0 cycle、0 ms pause，我们在内部总结为“pure mutator；所有 GC lever 都无关”。一轮以此 premise 开始的 profiling 推翻了它。

¤asyncpipe¤ 从不打印 ¤[gc]¤，但 **leaf profile 约 33% 仍是 collector machinery**：write barrier、per-object layout side table、¤RuntimeHandleScope¤ rooting。关闭 moving-loop back-edge poll 测得 **−14.1%，同时程序仍运行 zero GC cycle**：old-generation incremental mark/sweep 在 poll 上推进，却从未完成 cycle，因而不报告。这是该轮最大的 lever，而我们的 premise 把 profiler 引向反面。（¤PERRY_WRITE_BARRIERS=0¤ 在这里 +0.9%，codegen barrier 无罪；incremental drive 并非如此。）

> **Cycle counter 测量 collection，不测量 collector 的成本。**

Barrier、side-table maintenance、rooting、incremental slice 都在 mutator 一侧，结构上对 per-cycle trace 不可见。¤0 cycles¤ 看起来像结论，却只观察一个机制。

相关陷阱：¤asyncpipe_big.ts¤ **不是有效的 scaled version**。120 batch 时 zero cycle，240 时两个 copying minor，1200 时 GC 主导。为超过 timing noise 而 scale，悄悄造出了另一个 benchmark，与 §9 空洞的“realistic” variant 同形；只有检查研究的属性跨 scale 仍存在才抓住。

### 8. 超过阈值十六个 byte

整个计划最精彩的单个 bug。¤shapes¤ 在 139 ms run 中花 94 ms 于两次 minor collection，报告 survival ratio 739‰ 和 925‰，但真实 live set 约 3200 object。

¤arena_alloc_gc¤ 把任何超过 ¤LARGE_OBJECT_THRESHOLD_BYTES¤——16 KB——的东西直接创建在 old-gen，并 mark ¤TENURED¤。2000 element 的 ¤Node2D[]¤ backing store 是 16,400 byte。**恰好超过十六个 byte。**

每个 array 永久 live——minor 不 sweep old-gen——write barrier 忠实记录每次 store 的 old→young edge，之后每次 minor 都 remark 这 2000 个：94,000，随后 118,006 个 slot。

Fix 有趣，因为“提高 threshold”是错的。越过阈值是在 *copy cost* 与 *retention cost* 之间交换。Pointer-free object 的两者都受 size 限制，所以保留 16 KB。含 pointer 的 object 中，retention 是传递且无界的；array、object、closure 得到 128 KB——V8 的 ¤kMaxRegularHeapObjectSize¤ 出于同样原因画同一条线。Selection 读取已有的 ¤pointer_free¤ flag，而非 type 列表；unknown type 保持 conservative 值。

该轮 ¤shapes¤ 从 0.139 s → 0.061 s——最终 sweep 为 0.058 s，比 Node **快 1.39×**——peak RSS 71.4 MB → 32.3 MB。其他 18 个 program 均在 ±1.3% 内。

### 9. 测量比修复更困难

会产生自信而错误结论的部分清单：

- **对坏掉的 ¤main¤ 做 benchmark。** 因意外 #6，allocation-heavy program 连续数日慢约 20×，A/B 无意义。与 load 无关的 signature 是 105 → 1304 次 collection。因为时间只是*很差*而非荒谬，没人去看。
- **Auto-optimize relink 用 ¤--no-default-features¤ 重建 runtime**，静默移除 ¤diagnostics¤。¤PERRY_GC_TRACE¤ 不打印，cycle 看起来是 **0**。一项 investigation 对三个 arm 得出“zero collection”。
- **Ratchet baseline pin 在另一 host 和三十个 revision 以前**，报告 29 个实际为 drift 的“regression”。始终在同一机器连续测两个 arm。
- **Pretenuring 108 MB → 0 的胜利是 confound**：baseline arm 位于中间变更之前。机制正确，target 错误——是 runtime allocate 的 parse tree，不是 codegen-visible literal——上限约 1 MB。
- **我们给 crash 的程序计时了数周。** 竞争 binary 在 ¤deeplist¤ 打印正确答案，随后在 recursive refcount drop 中 exit −11（SIGSEGV）。我们记成失败。现在每个 harness 保存逐 cell exit code。
- **¤grep -c¤ 在 zero match 时 exit 1**，截断 ¤&&¤ chain。¤PERRY_GC_TRACE¤ pipe 也曾 SIGPIPE 并 output 141。

保留下来的规则：引用与 load 无关的 census counter，不引用时钟；timing 前比较 *binary*；assert comparison 确实比较了东西；确认声称的 arm 真正 live。

---

## 第三部分——两条漫长的路

### Statepoints：历时四个月和三个前置条件后选择的道路

从第一个 prototype 起，LLVM 的 ¤gc.statepoint¤ 在 correctness 上就明显更优。它提供**优化器必须尊重的 relocation semantics**；shadow stack 只在优化器不聪明处理你忘记 spill 的 value 时正确。真正有趣的是“明显更好”到“默认发布”之间的一切，因为延迟无一与 performance 有关。

**它被非 GC 的事情阻塞。** Exception 被 lower 成 ¤setjmp¤/¤longjmp¤，而 ¤longjmp¤ 可以跳过 ¤gc.relocate¤，导致 relocated pointer 永远不写回。RS4GC 下更糟：¤mem2reg¤ 不会 promote setjmp correctness 所需的 volatile alloca，try-region roots 因此从未进入 SSA，也从未 relocate。¤gc.statepoint¤ 正为此提供 invoke form。因此 statepoints 之路经过了删除 Perry 全部 setjmp exception lowering 并换成 invoke/landingpad（#7302/#7305），也经过把 LLVM 移入进程（#7301）以控制 pass pipeline。没有一个是 GC ticket。

**诱人的折中正是陷阱。** “为有 ¤try¤ 的 function 保留 shadow stack”会让两种 root mechanism 永久固化。“删除 shadow stack、保留 statepoints”则根本无法*表达*，因为 statepoints 是 shadow stack root-set analysis 的另一种 lowering，不是独立机制。拆分 predicate（#7340）才让 per-target default 和未来 deletion 成为可能；此前 ¤PERRY_SHADOW_STACK=0¤ 加 statepoints 会生成**完全没有 precise roots**、没有 ¤__perry_gcmap¤ section、输出正确的 binary，直到 collection free 活对象前都无法和好 build 区分。

**两个 backend 必须死一个。** 一段时间里，我们同时维护手写 statepoint bridge 与 RS4GC。它们从不对等：bridge 无法 root ¤invoke¤，会直接拒绝带 try 的 function；它也是 RS4GC 的 silent fallback，正是 knob kill-policy 要防止的 untested configuration 形态。删除前测量：**真实 Drizzle app 与 ratchet probes 中 1,574 个 function 全部以 RS4GC lower，没有 fallback。** Bridge、CFG liveness analysis、call parser、emitter、¤PreciseRootBackend¤ enum 和 ¤PERRY_STATEPOINTS¤ knob 一并删除；现在 bail 是指名 function 的 hard failure，而非 downgrade。

**随后默认值在没有 coverage 的情况下发布。** Native roots 在每个 walkable target 上默认数月，而 **九项 root-lowering mechanic 对 Perry 实际 emit 的 lowering 没有一条 assertion**；三项看似 coverage 的 test 什么也没测：它们 assert ¤js_shadow_slot_bind¤ *不存在*，这在 native default 下对所有 program 都成立，无论 rooted 与否。Hazard 4 再次出现在职责就是不静默丢 root 的系统里。#7653 用三个 vantage 修复——¤opt¤ 前 IR、RS4GC 后的 ¤"gc-live"¤ bundle、decoded ¤__perry_gcmap¤ blob——因为每个都看不到下一个捕获的东西。Static root-dominance checker 从另一边有同样问题：anchor 在 ¤@js_shadow_slot_bind¤，所以用 ¤PERRY_RS4GC=0¤ compile corpus；直到 #7663 教会它 statepoints，它一直检查我们不再发布的 lowering。

实验产生了一条以 measured negative result 换来的 design law：**没有 relocation semantics 的 root metadata 在 optimizing compiler 下不 sound。** 一个紧凑的 per-function metadata 方案生成小 10–13× 的 map，却 deterministic corrupt 一个 10 行 churn loop——不是 map machinery 错，而是 mutator 通过 stale heap-derived SSA value 读取 from-space，只有 relocation 能修。Barrier 约束 memory ordering，不约束 dataflow。

### Unboxing：进行中，而且现在是主角

另一条长路来自第一部分：让 unboxed native representation 成为 canonical，把 NaN-boxing 降为 polymorphic fallback。Phase 1（scalar locals）、2（specialised ABI）、3a/3b（strings 与 ¤Ptr<Shape>¤ pointer locals）、4a/4b（typed heap：numeric arrays，以及 boxed layout 无谓承担的 bookkeeping）已 merge。

有两点应诚实报告。

**一个 sub-phase 被评估并拒绝，理由反而是对 NaN-boxing 的赞美。** Unboxed *object fields*——Phase 4b 原本的 headline——在 recon 后被 scope out，而非构建。¤number¤ field slot 已保存 raw IEEE bits，因为 NaN-boxing 只保留 ¤0x7FF9..=0x7FFF¤；layout 的 ¤raw_f64_mask¤ 是 *proof bit*，不是 storage 变化，read-side guard 也早已消失。静止的 raw string handle 会把 short string 无谓 heap-materialize，破坏 small-string optimisation。Raw ¤i1¤/¤i32¤ slot 则需要第三种 mask，并在约 25 个 direct slot-read site 做 layout probe，包括 ¤JSON.stringify¤、¤util.inspect¤、¤v8¤ serde——都是 hot path。实际发布的是 elision：对 proven receiver 的 field store，在 value 按构造必为 non-pointer 时取消 layout note，在 value 不可能是 heap string 时取消 string addref。

**而 GC 给计划送来了下个目标。** 第四部分的最终测量说明，最难 cluster 中 collector 已非 binding constraint，mutator 才是，具体而言**一个双 field object literal 占 72 byte**。这正是 RFC 所说的 representation problem，也是“actual objects”的下一站。

### 没有选择的道路

**Concurrency。** 所有者被直接询问后的指示：

> “我不想为了 parallelism/concurrency 本身去追它。它应该是必须完成的工作最后采用的手段，但不能以 hot path 为代价。”

这个约束不是延迟，而是*决定* design。三个 family 恰在向 mutator 收费的位置不同：parallel stop-the-world 不收费——GC thread 只存在于 pause 内；concurrent marking 对每次 pointer write 收 store barrier；concurrent compaction 对每次 pointer read 收 **load barrier**。Load 远多于 store，因此最后一种最不可接受。Parallel STW 是唯一可接受的 design，排在（1）删除不该存在的 per-object work、（2）pretenure immortal cohort 之后。Parallelize 不该发生的 2.1M object visit，是用四个 core 更快地做错事。

测量独立且更强地同意。§7 工作后，最差 promotion case 的 per-object visit 一半是已删除的工作，另一半只有 **159 ms program 中的 9.6 ms**。已没有足够 collector 时间值得 parallelize——GC work 快 2× 只让 program 快 3%。Parallel GC 不是延期计划，而是这组 workload 上测得的 non-lever。

Correctness 论证比 perf 更重要：如今“完全可复现的 GC bug 意味着 table 而非 register”是真正的 diagnostic。Parallel collector 会摧毁它，并把 79 个 root scanner 和每个 ¤thread_local!¤ cache 变成潜在 data race。

**Old-page defragmentation——默认开启发布，同日回滚。** Compact partially-live old page 自 2026-07 的 bug 后一直关闭：它复现了指向已移动 old object 的 stale non-heap reference（开启时 6/6 corruption）。重新开启被当作 *rewrite-contract project* 而非 env flip；acceptance bar 是 enumerate 每条可能保留 movable old address 的 metadata/IC/cache path，并且**“只有 reproducer 与 dependency-scale stress corpus 都干净后才 re-enable defrag”。**

Contract work 合并得很好：static root-dominance allowlist 仍为空，约 40 个原先 exempt 的 hit 被真正修复；runtime holder policy 还被*收紧*，让 ¤open_gap¤ 和 ¤unverified¤ 直接 fail；两个 safety 明确依赖“只有 old-gen defrag 能移动它们”的 cache 被修复而非 exempt；删除的 exemption 上有 ¤becomes_real_when¤ tripwire，正好点名此 trigger。

但**默认值切换**随之搭车，且没有证据——因为 suite 结构上无法提供。Selection 要求 old page 上 ¤dead_bytes >= live_bytes¤，即大规模 promote-then-die。¤retain¤ family 存活率 999–1000‰，¤churn¤ family 几乎不 promote，所以**没有一个 benchmark 能产生 candidate page。** Suite 既不给 benefit signal，也不给 regression signal，却继承全部 old-address rewrite surface；merge 时所有 GC gate 仍在 queued、尚未执行。

因此我们保留全部 correctness work，把 default 回滚为 opt-in，直到存在真正能 exercise 的 fragmentation workload；届时失败 arm 会被删除。新规则：

> **Benchmark suite 无法 trigger 的 feature，也是 suite 无法保护的 feature。** 在有能触发的 workload 前默认关闭，或者承认两个 arm 都 untested。

**Pretenuring。** 构建两次、测量、否证，带书面 reopen 条件暂停。架构上正确的事——让 long-lived object 出生在 old-gen——输给 emergently sufficient 的事——用 promote-on-first-copy seed 限制任何 cohort 只跳一次。所有可构造 load 上两个 arm 不可区分。Meta-lesson 直接进入实践：**构建 invariant 前先测试 discriminating shape。**

---

## 第四部分——目前进展如何

2026-08-12 的 closing sweep：安静、固定的 M1 mini，best-of-5，检查 exit code，timing 前将 output 与 ¤node --experimental-strip-types¤ 逐 byte 验证。19 个 GC 型 benchmark，对比 Node 26.5.1 与采用 reference counting 的 AOT 竞争者。

**Perry 在 19 个中有 9 个胜过 Node**（本轮开始时 3 个），**14 个胜过引用计数 compiler**，并且**15 个与 Node 的差距不超过 1.3×。**

| bench | perry | node | P/node | Δ 本轮 |
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

剩余的是两个**互不相交**的 cluster；把它们当成一个机制，是我们已经犯过的错：

1. **对 Node——dispatch 与 mutator，大多不是 GC。** ¤iso_miss¤、¤interp¤、¤pipeline¤、¤asyncpipe¤。主要是 polymorphic property dispatch、inline cache、representation selection——另一项计划。但把 ¤asyncpipe¤ 的 0% 读成“这里没有 GC”前，请看下方修正。
2. **对引用计数 compiler——¤retain¤ family。** ¤retain1¤ 1.80×、¤retain_wide1¤ 1.67×、¤retain_wide¤ 1.65×。它们都已胜过 Node。这些行什么也不死，正是我们预期 tracing collector 最差的地方——而这个预期以有趣的方式错了。

Closing sweep 中重构整个计划的发现是：**在第二个 cluster 上，collector 已不再是 binding constraint——mutator 才是。** 减去*全部* GC pause，¤retain_wide¤（130.8 ms 纯 mutator）和 ¤shapes¤（60.2 ms）仍输。¤retain¤ 需要 GC 恰好为 zero 才 parity。真正的成本是**双 field object literal 占 72 byte**，因此 ¤retain¤ 要写入 **216 MB memory 来存储 48 MB 数字**——4.5× write amplification。竞争者的优势从来不是 refcount，而是 compactness。这现在是 representation problem（#7916），不是 collector problem：第一部分的 unbox-by-default 计划转向 object layout 而非 scalar。

另一 cluster 有对应缺陷：¤asyncpipe¤ 以 1,200–1,650 ns/object 进行 collect，其中包含一次**处理 zero object、耗时 122 ms 的 minor collection**——比整个 program 还长。与 object count 无关的 per-cycle cost 是 fixed overhead，也是 collector 在 critical path 上仍可见的最后部分（#7915）。

我们尝试过一个显然的下一步，并把它记录为 negative result，因为它错了：**不要缩小第一个 nursery。** Cycle 0 占 retain family GC pause 的 58–81%，所以 cap 看似免费；2 MB 时 ¤retain¤ pause 从 52 → 31 ms。但 ¤asyncpipe¤ 从 0 次 collection 变成 4 次，在 127 ms program 上花 385 ms；更早 promotion 还把 old-gen trigger 重新定时到额外 full mark-sweep（¤retain_wide1¤ +182%）。

看起点规模：开启这项计划的 JSON pipeline 从 60.4 s → 3.86 s。¤retain¤ family 在上述一轮工作中改善 36–46%。整个 collector 仍保留切回 full mark-sweep 的 kill switch（¤PERRY_GEN_GC=0¤）并持续 exercise，因为无法和它 bisect 的那天，就是我们不再能相信这些数字的那天。

---

## 我们现在遵循的规则

学到的多数内容可以推广到垃圾回收之外：

1. **仍存在的 mode，就是尚未作出的决定。** 删除失败 branch，或保留 exercise 它的 arm；在删除处留下 tombstone comment。
2. **Gate 必须 assert subject 确实 live**，不只是没有东西 throw。“因为什么都没运行而 green”比 red 更糟。
3. **不要依据 feedback loop 无法移动的 quantity 来 pace 它。** 三个独立 livelock，同一种形态。
4. **不要用 constant band pace O(live) 的过程。** 更大的 constant 只会移动悬崖。
5. **当一类 bug 不留证据时，停止 investigation，构建 instrument。** 然后破坏式测试，包括证明 bug 原本不可见的未 instrument control。
6. **Doc comment 不是变更。** 用 test pin 默认值，包括 unrecognised-value case，并 pin 必须一致的 component 间 agreement。
7. **在同一 host、同一 tree 上测两个 arm，并检查 exit code。**
8. **构建 invariant 前，先测试 discriminating shape。**
9. **拒绝永久 hybrid。** “困难情况保留旧机制”会让 migration 永远变成两套机制。让困难情况工作，或者不要迁移。

收集器尚未完成。但它第一次变得*可读*：每个 knob 都 gate 某件事，每个 gate 都可能 fail，每个 default 都由 test pin，所有公布数字都在安静机器上、先验证 output 后测得。这种可读性比收集器本身花了更多工作，也是最近一个月数据能够变化的唯一原因。
`.replaceAll("¤", "`");

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
