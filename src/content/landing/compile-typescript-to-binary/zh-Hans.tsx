import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "将 TypeScript 编译为二进制文件（独立可执行文件）",
  description:
    "将 TypeScript 编译为二进制文件：2–5 MB 的独立原生可执行文件，无需 Node.js。了解 Perry 与 bun build --compile 及 Node SEA 的对比。",
  breadcrumb: "将 TypeScript 编译为二进制文件",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            将 TypeScript <span className="gradient-text">编译为二进制文件</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            一条命令就能把 <code className="text-slate-300">main.ts</code>{" "}
            变成一个独立的原生可执行文件。目标机器上无需 Node.js，无需打包运行时，用户也无需任何安装步骤。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              安装 Perry
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
            被统称为&ldquo;编译 TypeScript&rdquo;的三件事
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            当开发者搜索如何将 TypeScript 编译为二进制文件时，通常会遇到三种截然不同、却共用同一个说法的技术：
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">转译。</strong>{" "}
              <code className="text-slate-300">tsc</code>、SWC 和 esbuild
              将 TypeScript 转换为 JavaScript。输出的代码仍然需要 Node.js、Bun
              或浏览器才能运行，这个过程完全不涉及二进制文件。
            </li>
            <li>
              <strong className="text-slate-300">运行时内嵌。</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>、{" "}
              <code className="text-slate-300">deno compile</code> 以及 Node.js
              的单文件可执行应用（SEA）会把你打包好的 JavaScript 与完整的运行时
              拼接在一起。你确实得到了单个文件，但引擎也跟着一起打包了进去，并且
              每次进程启动时你的代码依然要被解析并 JIT 编译。
            </li>
            <li>
              <strong className="text-slate-300">
                提前原生编译。
              </strong>{" "}
              这正是 Perry 所做的事。TypeScript 先由 SWC 解析，随后解析类型、对
              泛型进行单态化，再由 LLVM 生成机器码。链接器产出的是一个普通的可
              执行文件——与 Rust、Go 或 C++ 工具链产出的是同一类产物。二进制文件
              里完全没有 JavaScript 引擎。
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            由于没有引擎需要启动，启动时也无需解析任何内容，Perry 编译出的二进
            制文件大约在一毫秒内就能启动。这条流水线本身在{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript 原生编译器
            </Link>{" "}
            页面以及{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              编译器内部原理
            </Link>
            中有更详细的介绍。
          </p>

          <h2 className="text-2xl font-bold mb-6">二进制文件有多大？</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            体积取决于你引入了什么，因为只有实际用到的代码才会被编译和链接：
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              hello world 大约为{" "}
              <strong className="text-slate-300">330 KB</strong>。
            </li>
            <li>
              典型的 CLI 工具在{" "}
              <strong className="text-slate-300">2–5 MB</strong> 之间。
            </li>
            <li>
              引入大型框架（Fastify、mysql2 等）的完整应用大约为{" "}
              <strong className="text-slate-300">48 MB</strong>。
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            作为对比：Node SEA 可执行文件本质上是{" "}
            <code className="text-slate-300">node</code> 二进制文件本身的一份
            拷贝，因此在加入你的代码之前，根据平台不同就已经约有 88–118 MB；而
            经 Bun 编译的 hello world 在 macOS arm64 上约为 60 MB，在 Linux x64
            上约为 100 MB，因为其中内嵌了完整的 Bun 运行时。
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry 对比 bun build --compile 与 Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            这三者都能给你一个可以直接交给别人的单一文件。除此之外它们是截然不
            同的工具，各自都有其适合的场景：
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
                    产出内容
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    AOT 编译的机器码（LLVM）
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    打包的 JS + 内嵌的 Bun 运行时
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    注入了你打包脚本的 node 二进制文件拷贝
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    执行模型
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    原生代码，没有 JS 引擎
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    运行时 JIT（JavaScriptCore）
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    运行时 JIT（V8）
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Hello-world 大小
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    约 60 MB（macOS arm64）到 100+ MB（Linux/Windows）
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    约 88–118 MB（node 二进制文件的大小）
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    启动时间
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    跨平台编译
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 个目标平台，包括从 Linux 交叉编译到 Windows/macOS/iOS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    支持——通过 --target 支持 Linux、Windows、macOS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    不支持——需改为为每个平台复制对应的 node 二进制文件
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    JS/npm 兼容性
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    不断增长：axios、zod v4、express、fastify、hono 已可原生
                    编译；其余可通过可选的 V8 回退方案运行
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    完整——因为它本身就是 Bun 运行时
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    完整的 Node 语义；需要预先打包，在 Node 24 LTS 上仅支持
                    CommonJS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    状态
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">稳定</td>
                  <td className="px-4 py-3 text-slate-400">
                    在 Node 24 LTS 中为&ldquo;Active development&rdquo;稳定级别
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            坦白说：如果你的应用依赖完整的 npm 生态，并且希望零兼容性风险，那么
            Bun 和 Node SEA 运行的正是你已经在开发时依赖的引擎语义——这是它们的
            优势所在，体积成本对你的部署来说也未必重要。Perry 走的是另一条路。
            你得到的是真正的提前编译、更小的二进制文件和毫秒级启动；作为交换，
            你采用的是一个 Pre-1.0 的编译器，其 JavaScript 兼容性是被测量并公
            开发布的（test262：截至 v0.5.1146，String 为 79%，Array 为
            72%），而不是像 V8 那样与生俱来。
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            详细的正面对比：{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry 对比 Bun
            </Link>{" "}
            和{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry 对比 Deno
            </Link>
            。关于 npm 包如何编译，参见{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              真实 npm 包与一次一致性扫尾
            </Link>
            。
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
              今天就编译你的第一个二进制文件
            </h2>
            <p className="text-slate-400 mb-6">
              通过 Homebrew、APT 或 winget 安装——然后运行{" "}
              <code className="text-slate-300">perry compile main.ts</code>。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                开始使用
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                阅读文档
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
