import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript 与 LLVM：单态化与原生代码生成",
  description:
    "Perry 如何将 TypeScript 降级为 LLVM IR——带类型的 HIR、单态化、NaN 装箱——以及后端为何为了 AOT 性能从 Cranelift 转向 LLVM。",
  breadcrumb: "TypeScript 与 LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript 与 <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry 如何把一门为 JIT 引擎设计的语言降级为 LLVM IR——单态化、
            NaN 装箱、内联降级——以及它为何离开了 Cranelift。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              编译器内部原理
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              在 GitHub 上查看
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">为什么 TypeScript 选择 LLVM？</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            提前编译器所处的环境和 JIT 完全不同。JIT 在用户等待的过程中进行
            编译，因此编译延迟才是约束条件。而像 Perry 这样的 AOT 编译器只
            编译一次——在开发者的机器上或 CI 中——之后这个二进制文件会被执
            行成千上万次。正是这种不对称，让一个重量级优化器物有所值。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM 带来了二十年中间端工作的积累：循环向量化、循环不变量外提、
            全局值编号、稀疏条件常量传播、激进内联、别名分析。Perry 的任务
            是把它真正能够优化的 IR 交给这套机制——而这正是 TypeScript 类
            型信息发挥作用的地方。
          </p>

          <h2 className="text-2xl font-bold mb-6">降级流水线</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            源代码先由 SWC 解析，然后降级为一种带类型的高级 IR（HIR），在
            LLVM 看到代码之前，真正有意思的决策都在这一步发生：
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">单态化。</strong>{" "}
              泛型函数和类会按每一次具体实例化进行特化，这与 Rust 和 C++
              采用的策略相同。{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> 和{" "}
              <code className="text-slate-300">{`Stack<string>`}</code> 会
              变成两个独立的、完全带类型的函数——因此优化器面对的是具体类
              型，而不是一团泛型分派逻辑，泛型在运行时不产生任何开销。
            </li>
            <li>
              <strong className="text-slate-300">静态分派。</strong>{" "}
              在编译期就已知接收者类型的地方，方法调用会被编译为 LLVM 可
              以内联的直接调用，而不是哈希表查找。
            </li>
            <li>
              <strong className="text-slate-300">直接字段访问。</strong>{" "}
              对象字段会被解析为编译期索引，因此属性读取是一次固定偏移的
              加载——而不是字典查找。
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN 装箱与内联降级
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            对于动态值，Perry 使用 NaN 装箱：每个值都是一个 64 位字。双精
            度浮点数被直接存储；对象、字符串、布尔值、
            <code className="text-slate-300">null</code> 和{" "}
            <code className="text-slate-300">undefined</code> 则被编码进
            IEEE 754 安静 NaN 未使用的位模式中。数字是零成本的——不需要装
            箱，算术运算也不需要分配内存。
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            问题在于，对非数字值的操作需要一套&ldquo;拆包—操作—重新打
            包&rdquo;的位运算序列。如果这些序列以调用单独编译的运行时的形
            式存在，LLVM 看到的就是不透明的黑盒，无法跨越它们进行优化。因
            此 Perry 把热点操作——属性读取、方法分派、对象分配——直接以内
            联 LLVM IR 的形式生成，让优化器可以对其进行融合和化简。举例来
            说，对象分配会被编译为一次内联的线程本地 bump 分配：
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

          <h2 className="text-2xl font-bold mb-6">为什么不用 Cranelift？</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry 最初的后端是 Cranelift——wasmtime 背后的代码生成器，为
            快速、可预测的编译而设计。它是一个正确的起点，对于 JIT 和沙箱
            化运行时来说，它至今仍是一个出色的选择。有两件事迫使 Perry 换
            掉了它：
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">优化器天花板。</strong>{" "}
              Cranelift 刻意被设计成一个快速的单层编译器：&ldquo;decent
              code quickly（快速产出还不错的代码）&rdquo;，这对 JIT 来说
              是正确的取舍，但对一个卖点是原生峰值性能的 AOT 编译器来说
              却是错误的。
            </li>
            <li>
              <strong className="text-slate-300">arm64_32。</strong> Apple
              Watch 使用一种 Cranelift 不支持的 ABI（64 位指令，32 位指
              针）。要让 watchOS 成为一个目标平台，就必须使用 LLVM——而同
              时维护两个后端意味着两套 bug、两套测试和两套性能基线。
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            这次迁移并非没有代价：第一个纯 LLVM 版本在部分基准测试上出现
            了高达 70 倍的性能回归，因为热点操作最初都要经过不透明的运行
            时辅助函数调用。经过修复——内联降级、上文提到的 bump 分配器、
            更好的内联边界划分——后端的表现超过了 Cranelift 的数字，等到
            尘埃落定时，Perry 在其基准测试套件的每一项上都击败了
            Node.js，幅度从 1.7 倍到 24.6 倍，另有两项打平（2026 年 4
            月）。完整的复盘值得一读：{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              从 Cranelift 到 LLVM
            </Link>
            。
          </p>

          <h2 className="text-2xl font-bold mb-6">深入了解</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            {" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              编译器内部原理页面
            </Link>{" "}
            更详细地介绍了 NaN 装箱、单态化和静态分派。在博客上，{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              优化一切
            </Link>{" "}
            逐个版本梳理了这些优化工作，而{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              分代 GC、惰性 JSON，以及经得起推敲的基准
            </Link>{" "}
            则解释了基准测试方法论是如何运作的（RUNS=11，中位数 +
            p95）。想了解全貌，可以从{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript 原生编译器
            </Link>{" "}
            概览开始。
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              亲自看看输出结果
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code>{" "}
              ——原生机器码，不附带任何引擎。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                开始使用
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                在 GitHub 上查看
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
