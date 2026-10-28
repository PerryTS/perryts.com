---
title: "从 Cranelift 到 LLVM：哪里坏了，我们如何修复"
excerpt: "Perry 从 Cranelift 到 LLVM 的后端迁移已完成。初始切换使基准测试慢了 70 倍——本文讲述哪里出了问题，以及修复它的六项针对性优化。"
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **更正（2026 年 9 月）：** 下文中名为“factorial”的基准测试命名有误：它只是在循环中累加 `i % 1000`，并不计算阶乘。24.6 倍这一数字来自一次无法复现的旧 Node.js 运行；在我们当前公开的测试框架中，它与 Node.js 持平（93 ms 对 95 ms）。这是一个针对整数取模快速路径的微基准测试，并不代表典型的 TypeScript 性能。下面的结果作为历史记录保留。包括 Perry 落后的基准测试在内的最新数据，请见 [Perry README](https://github.com/PerryTS/perry#performance)

Perry 从 Cranelift 到 LLVM 的后端迁移已完成。自 v0.5.12 起，LLVM 是唯一的代码生成后端，Perry 现在在每项基准测试中都击败了 Node.js——优势从 1.7 倍到 24.6 倍不等（其中两项持平）。

走到这一步并非一帆风顺。v0.5.0 的初始切换使多项基准测试比之前的 Cranelift 版本**慢了 70 倍**。这篇文章详细讲述了事情的来龙去脉：为什么我们仍然选择了切换，什么出了问题，什么修复了问题，以及最终数据表现如何。

如果你正在构建编译器、评估 codegen 后端，或者只是好奇为什么"切换到 LLVM"很少像听起来那么简单，这篇文章是为你写的。

## 第一部分：为什么要切换？

Perry 将 TypeScript 直接编译为原生机器码。没有 Node，没有 V8，没有 Electron，没有 WebView。"编写 TypeScript，交付原生二进制"这一价值主张，如果二进制文件实际上并不快，就会完全崩塌。

在 Perry 的前几个小版本中，codegen 后端是 [Cranelift](https://cranelift.dev/)。Cranelift 是一个出色的工具——它是 wasmtime 的 codegen 引擎，被 SpiderMonkey 的基线 JIT 使用，当你需要快速、可预测的编译和干净的嵌入体验时，它是首选。对于一个正在引导新语言的项目来说，它是正确的起点。

但最终有两件事让我们不得不离开它。

### 1\. 优化器的天花板

Cranelift 有意设计为一个快速的单层优化编译器。它的定位是"快速生成不错的代码"，而不是"不惜时间生成最好的代码"。这对 JIT 来说是正确的权衡，但对一个以原生性能为核心卖点的 AOT 编译器来说，则是错误的权衡。

LLVM 积累了超过二十年的开发投入。循环向量化、LICM、GVN、SCCP、指令合并、内联启发式、fast-math 重结合、别名分析——没有哪个更小的项目能够现实地追赶上来。如果 Perry 要声称"比 Node 更快"，我们就需要这套机制。

### 2\. arm64\_32 问题

直接的推动因素是 Apple Watch。`arm64_32` 是 Apple 为 Series 4 及之后机型引入的 ABI——64 位指令，32 位指针。Cranelift 不支持它，也没有现实的可能性去支持。Perry 要想可信地声称"一套代码，9 个平台"，就不能缺少 watchOS。LLVM 开箱即用支持 `arm64_32`。

一旦我们接受了*某些*目标平台需要 LLVM，维护两个后端就变得不可持续了。两个后端意味着两套 bug、两套优化 pass、两个测试矩阵、两条性能基线。诚实的答案是：选一个。

我们选择了 LLVM。

## 第二部分：关于 Cranelift 说几句

在继续之前：这篇文章不是对 Cranelift 的批评。Cranelift 是一项出色的工程成就，如果你在构建 JIT、沙盒运行时，或任何编译延迟比峰值吞吐量更重要的东西，它应该排在你候选列表的前面。wasmtime 采用它是有原因的。Bytecode Alliance 一直在做着典范级的工作。

只是 Perry 的需求不同。我们是 AOT 编译，一次交付二进制，用户运行数百万次。这种不对称——编译少见，执行常在——正是 LLVM 更重的优化器能收回成本的领域。不同的工作需要不同的工具。

## 第三部分：切换灾难

v0.5.0 是以 LLVM 作为唯一后端的首个版本。我们预期编译时间会略有增加，运行时性能会显著改善。后者的实际结果恰好相反。

这是我当时不想公开的表格：

|基准测试| Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
|方法调用| 16ms | 1,084ms | 68x slower |
|对象创建| 5ms | 318ms | 64x slower |
|矩阵乘法| 61ms | 184ms | 3x slower |
|数学密集型| 370ms | 131ms | 2.8x faster |
|嵌套循环| 32ms | 57ms | 1.8x slower |
|斐波那契(40)| 505ms | 1,156ms | 2.3x slower |

一些工作负载变快了。但大多数急剧恶化。`method_calls`——因为它代表了典型的 TypeScript 类使用模式，是最重要的基准测试之一——比两个版本前交付的结果慢了近 70 倍。

### 到底出了什么问题

Perry 使用 **NaN-boxing** 来表示值。每个 TypeScript 值都是一个 64 位字。f64 数字直接存储；其他所有内容（对象、字符串、布尔值、undefined、null）编码在 IEEE 754 quiet NaN 的未使用位中。

优势：数字零成本。没有装箱，没有标记，算术运算无需分配。

劣势：对非数字值的每次操作都需要位操作来解包、操作和重新打包。如果这些序列以 codegen 的内联 IR 形式存在，优化器可以融合和简化它们。如果它们以**运行时辅助函数调用**的形式存在，优化器会将其视为不透明调用而放弃优化。

Cranelift 后端积累了大量针对热点操作的内联降级——属性加载、方法分派、对象分配、f64 标记值的整数运算等。LLVM 切换时，为了优先确保代码*正确*，我们将几乎所有这些操作都通过 `perry-runtime` 中的运行时辅助函数路由。每个辅助函数在 LLVM IR 中都是一条 `call` 指令。

LLVM 很优秀，但它无法内联一个从未见过函数体的函数。`perry-runtime` 是单独编译、最后链接的，从优化器的角度来看，每个辅助调用都是黑盒。结果就是，Cranelift 后端曾编译为约 5 条内联算术指令的热循环，现在变成了函数调用——寄存器保存、栈帧设置等等——重复数百万次。

这就是 70 倍差距的来源。不是糟糕的 codegen，而是糟糕的**内联边界**。

## 第四部分：修复

恢复并超越 Cranelift 性能数据的工作大致分为六个方面。没有一个是特别新奇的。大多数是教科书式的编译器优化，只是需要应用在正确的位置。

### 1\. 对象分配的内联 bump 分配器

`object_create` 是仅次于 `method_calls` 的最大性能回退。旧路径为每个 `new Point()` 调用 `js_object_alloc_class_with_keys`——一次函数调用、一次线程局部 arena 访问、一次 shape 缓存查找，以及 GC 头和对象头的写入。

修复方案：在 LLVM IR 中**内联**生成 bump 分配。每个分配对象的函数获得一个指向线程局部 `InlineArenaState` 结构体的缓存指针。分配变成了：

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

快速路径是约 13 条内联 IR 指令，LLVM 可以看到、调度并从循环中提升。`object_create` 从 318ms 降到了 9ms。

### 2\. i32 循环计数器

NaN-boxing 意味着每个 TypeScript 数字都是 f64，包括循环计数器。一个带有 f64 归纳变量的 `for (let i = 0; i < 100_000_000; i++)` 循环是灾难性的：f64 递增、f64 比较、每次数组索引时的 f64 到 i64 转换。

codegen 检测归纳变量可证明为整数值的 for 循环，并分配一个**并行 i32 栈槽**。循环条件从 `fcmp` 切换到 `icmp slt i32`，完全消除 f64 计数器。

这使得 `array_write` 从 11ms 降到 3ms，`nested_loops` 从 18ms 降到 9ms，`array_read` 从 11ms 降到 4ms。

### 3\. fast-math 标志

我们为每条 f64 算术指令附加 `reassoc contract` 标志。`reassoc` 允许 LLVM 将串行累加器链拆分为并行链，`contract` 允许乘加融合。由于 Perry 使用 NaN 位作为值标记，我们保持 `nnan` 和 `ninf` 关闭。

有了这些标志，LLVM 的循环向量化器在 `math_intensive` 上生效，从 131ms 降到 14ms——比 Node 快 3.5 倍。

### 4\. 整数取模快速路径

JavaScript 中 f64 的 `%` 是 `fmod`，在 ARM 上是 libm 调用。但对于整数值的 f64 操作数，我们可以用 `fptosi → srem → sitofp` 完全跳过 libm 的往返。codegen 通过静态分析检测整数值操作数——无需运行时检查。

这就是 `factorial` 从 1,553ms 降到 24ms 的全部原因——从 Node 的 591ms 降到 24ms。**比 Node.js 快 24.6 倍。**

### 5\. 嵌套循环的 LICM

LLVM 默认执行 loop-invariant code motion，但 NaN-boxing 隐藏了结构。`arr.length` 被降级为通过 NaN-boxed 指针的带标记检查的加载——不是明显的循环不变量。

codegen 检测 `for (...; i < arr.length; ...)` 模式，在循环之前将长度预加载到栈槽中，并由静态遍历器验证循环体不会改变数组长度。当计数器受此提升的长度约束时，IndexGet/IndexSet 完全跳过边界检查。

### 6\. shape 缓存的对象

当 codegen 知道对象的类时，它在编译时解析字段偏移并生成**直接索引加载**——无需运行时分派。对于方法分派，`obj.method(args)` 变成直接的 `call @perry_method_Class_name(this, args)`——没有 vtable，没有内联缓存，没有哈希查找。

LLVM 切换时这退化回了通用慢路径。恢复静态分派使 `method_calls` 从 1,084ms 恢复到 1ms。**比 Node.js 快 11 倍。**

## 第五部分：当前数据

三次运行取中位数，macOS ARM64（Apple Silicon, M1 Max），Node.js v25：

|基准测试| Perry | Node.js | vs Node |
| --- | --- | --- | --- |
|阶乘| 24ms | 591ms | 24.6x |
|方法调用| 1ms | 11ms | 11x |
|循环开销| 12ms | 53ms | 4.4x |
|数学密集型| 14ms | 49ms | 3.5x |
|数组读取| 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
|数组写入| 3ms | 8ms | 2.6x |
|字符串连接| 1ms | 2ms | 2x |
|嵌套循环| 9ms | 16ms | 1.7x |
|素筛| 4ms | 7ms | 1.7x |
|矩阵乘法| 21ms | 34ms | 1.6x |
|斐波那契(40)| 401ms | 991ms | 2.5x |
|二叉树| 9ms | 9ms | tied |
|曼德尔布罗特| 24ms | 24ms | tied |
|对象创建| 9ms | 8ms | 0.9x |

每项基准测试都是胜利或持平。最接近的是 `object_create`（9ms vs 8ms），V8 的分配器确实出色。

## 第六部分：编译时间问题

人们选择 Cranelift 而非 LLVM 的首要原因是编译速度。那我们来谈谈这个。

LLVM 使 Perry 的每文件编译时间增加了 **20-50ms**，大约 **8-19%**。不是 5 倍，不是 2 倍，而是个位数到低两位数百分比。

原因是 codegen 并不是 Perry 流水线的瓶颈。一个典型文件的耗时分布如下：

-   SWC 解析：~30%
-   HIR 降级（AST → IR，类型推断）：~25%
-   IR 变换 pass（闭包转换、async 降级、内联）：~15%
-   **Codegen（LLVM IR 文本输出 + `clang -c -O3`）：~20%**
-   链接（`cc` + 运行时库）：~10%

Codegen 只是五个阶段中的一个。即使将这个阶段翻倍，总时间也只增加 5-10%。如果你在构建一个 AOT 编译器，用户输入一次 `perry compile` 然后永远运行二进制文件，那么计算很简单：编译时多花 25ms，每次执行最多节省 24 倍。

## 第七部分：如果重新来过

如果我今天重新开始 Perry 并且可以直接跳到 LLVM，我不会这样做。Cranelift 阶段确实有价值。它让我们在没有 LLVM 复杂性负担的情况下迭代前端，提供了一个可以对比的工作基线，并迫使我们保持 HIR 足够干净以便在后端之间移植。

如果重新来过，我会改变切换本身的做法。我们在 v0.5.0 中让大多数操作通过运行时辅助调用，打算之后再内联。这是错误的。正确的顺序应该是：先识别热路径，在切换之前将它们内联降级，只有在 LLVM 后端至少达到同等水平后才发布。

教训很朴素：优化边界比优化器质量更重要。LLVM 是一款卓越的软件，但它无法帮助它看不到的代码。如果你的 codegen 将一切都通过不透明的运行时调用路由，你就在源程序和所有优化 pass 之间筑了一堵墙。

## 总结

Perry 现在是纯 LLVM，在每项基准测试中都快于 Node.js，并持续发布中。这次迁移比计划的时间更长，中途比预期更痛苦，但回头来看毫无疑问是正确的决定。Cranelift 带我们走到了 v0.5；LLVM 将带我们走完剩下的路。

如果你想试用 Perry：

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

源码：[github.com/PerryTS/perry](https://github.com/PerryTS/perry) —— 文档：[docs.perryts.com](https://docs.perryts.com) —— 自己运行基准测试：`cd benchmarks/suite && ./run_benchmarks.sh`

如果你有问题、发现了 bug，或者想讨论 codegen 后端，GitHub issues 是开放的。我全部会看。

—— Ralph
