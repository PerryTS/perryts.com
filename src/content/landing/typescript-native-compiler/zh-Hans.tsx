import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript 原生编译器：Perry 如何将 TS 编译为机器码",
  description:
    "Perry 是一个用 Rust 编写的 TypeScript 原生编译器：SWC 解析、带类型的 HIR、单态化、LLVM 代码生成。为 10 个平台生成原生二进制文件，没有虚拟机。",
  breadcrumb: "TypeScript 原生编译器",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            一个 TypeScript 原生编译器，{" "}
            <span className="gradient-text">用 Rust 构建</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry 把你已经在写的 TypeScript 编译为机器码——就像 Rust 或 Go 工具
            链编译各自语言那样。没有转译出的 JavaScript，没有虚拟机，目标系统
            上也没有运行时。
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            不是转译器，也不是运行时。
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            大多数 TypeScript 工具都属于两大类。转译器——
            <code className="text-slate-300">tsc</code>、SWC、esbuild——检查
            并剥离类型信息，然后生成供引擎稍后执行的 JavaScript。运行时——
            Node.js、Bun、Deno——正是那些引擎：它们在你的程序每次启动时解析、
            解释并 JIT 编译这些 JavaScript。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            原生编译器是第三大类，而对 TypeScript 来说，这一类几乎一直是空
            白。Perry 并不把类型标注当作可以剥离的文档，而是把它当作驱动代码
            生成的输入。{" "}
            <code className="text-slate-300">perry compile main.ts</code>{" "}
            的结果是一个包含机器码的独立可执行文件——通常{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB，启动时间约一毫秒
            </Link>
            。
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">流水线，逐步拆解</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">解析（SWC）。</strong> 源
              文件由 SWC——这个用 Rust 编写的原生 TypeScript 解析器——进行解
              析，因此即使是大型项目也能在毫秒级完成解析。模块代码生成、转
              换遍历和符号扫描会跨核心并行运行。
            </li>
            <li>
              <strong className="text-slate-300">类型解析。</strong>{" "}
              编译器会解析已声明的类型并推断其余部分，在代码生成开始之前为
              每个表达式赋予一个具体类型。
            </li>
            <li>
              <strong className="text-slate-300">
                带类型的 HIR 与单态化。
              </strong>{" "}
              AST 被降级为一种带类型的高级 IR。泛型函数和类会被单态化——每
              一次实例化，比如{" "}
              <code className="text-slate-300">{`Stack<number>`}</code>，都
              会带着其具体类型被单独编译，因此泛型在运行时不产生任何开销。在
              类型已知的地方，方法调用会变成静态分派，对象字段访问也会变成
              直接的固定偏移加载。
            </li>
            <li>
              <strong className="text-slate-300">代码生成（LLVM）。</strong>{" "}
              HIR 被降级为 LLVM IR，经过 LLVM 的优化流水线——内联、循环优化、
              向量化——然后为目标平台生成机器码。
            </li>
            <li>
              <strong className="text-slate-300">链接。</strong> 输出的是
              一个普通的平台可执行文件：macOS 上的 Mach-O、Linux 上的 ELF、
              Windows 上的 PE——此外还有移动端、手表、TV 和 WebAssembly 目
              标。
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            这其中 LLVM 相关的部分——为何选择 LLVM 而非 Cranelift、NaN 装箱
            如何表示动态值、优化器对带类型的 IR 做了什么——有专门的深度剖析：
            {" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript 与 LLVM
            </Link>
            。NaN 装箱、静态分派和零成本抽象等实现细节则在{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              编译器内部原理
            </Link>
            中介绍。
          </p>

          <h2 className="text-2xl font-bold mb-6">
            动态代码和 npm 呢？
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript 本质上仍然是 JavaScript，一个原生 TypeScript 编译器
            必须对此保持坦诚。Perry 针对官方 test262 套件的兼容性是被测量
            并公开发布的——截至 v0.5.1146，String 语义为 79%，Array 为
            72%，且两者都在逐个版本持续提升。纯 TypeScript/JavaScript 的
            npm 包可以通过{" "}
            <code className="text-slate-300">perry.compilePackages</code>{" "}
            原生编译：axios、zod v4、express、fastify 和 hono 如今已能编译
            并运行。需要完整引擎语义的代码，可以通过{" "}
            <code className="text-slate-300">--enable-js-runtime</code>{" "}
            选择使用内嵌的 V8 回退方案。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            完整的故事见{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              真实 npm 包与一次一致性扫尾
            </Link>
            。
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry 与其他&ldquo;原生 TypeScript&rdquo;项目的关系
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry 并不是唯一一个从 TypeScript 的类型标注中看到编译机会的项
            目——但各家的方案差异很大。AssemblyScript 只把一种严格的类
            TypeScript 语言编译为 WebAssembly：它刻意不与 JavaScript 兼容，
            也不产出操作系统可执行文件或原生 UI。Meta 的 Static Hermes 在
            Hermes 引擎内部对一个带类型的 JavaScript 子集进行提前编译，主
            要面向 React Native——截至 2026 年年中，它仍是一个必须从源码
            构建的研究项目，而真正在 React Native 中上线的 Hermes V1 引擎
            并不包含这些静态编译特性（
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              完整对比
            </Link>
            ）。
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perry 的赌注在这两个维度上都不同：以标准 TypeScript 作为输入语
            言，以普通的平台可执行文件——CLI、服务端和 GUI——作为输出，如今
            就可以通过 Homebrew、APT、winget 或 npm 安装。
          </p>

          <h2 className="text-2xl font-bold mb-6">一个编译器，十个目标平台</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            由于代码生成经由 LLVM 完成，同一份代码可以编译到 macOS、iOS、
            iPadOS、Android、Linux、Windows、watchOS、tvOS、WebAssembly 和
            纯粹的 Web/JS——包括从 Linux 机器交叉编译出 Windows、macOS 和
            iOS 二进制文件。GUI 应用使用{" "}
            <code className="text-slate-300">perry/ui</code>，这是一套构建
            在真正平台组件（AppKit、UIKit、GTK4、Win32，以及通过 JNI 实现
            的 Android）之上的声明式 API——完全不涉及 webview。
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            这与其他方案相比如何：{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry 对比 Bun、Deno、Electron、Tauri、React Native 和 Static
              Hermes
            </Link>
            。
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              试试这个编译器
            </h2>
            <p className="text-slate-400 mb-6">
              安装 Perry，一分钟内编译出你的第一个原生二进制文件。
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
