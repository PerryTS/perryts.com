import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Perry 快速入门——安装并将 TypeScript 编译为原生程序",
  description:
    "通过 Homebrew、APT 或 winget 安装 Perry，一分钟内把你的第一个 TypeScript 文件编译为原生可执行文件。无需 Node.js。",
  breadcrumb: "快速入门",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            开始使用 <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            三步之内，从零到一个可运行的原生可执行文件。目标机器上无需
            Node.js，无需打包工具，也无需安装任何运行时。
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            一步步生成你的第一个二进制文件
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            安装好 Perry 后，将 TypeScript 编译为原生可执行文件只需一条命令。先写一个文件：
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">hello.ts</span>
            </div>
            <pre className="text-sm text-slate-300">
              <code>{`const name = process.argv[2] ?? "World";
console.log(\`Hello, \${name}!\`);`}</code>
            </pre>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            编译并运行结果——输出的是一个自包含的机器码二进制文件，而不是一个打包后的脚本：
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">terminal</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span> compile hello.ts
              </p>
              <p className="text-green-400">✓ Compiled executable: hello</p>
              <p>
                <span className="text-slate-500">$</span> ./hello Perry
              </p>
              <p className="text-slate-300">Hello, Perry!</p>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-12">
            该二进制文件启动大约只需一毫秒，并且可以在任何拥有相同操作系统和架构的机器上运行——无需预先安装任何东西。深入了解{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry 如何将 TypeScript 编译为二进制文件
            </Link>{" "}
            ，或探索{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript 原生编译器
            </Link>
            内部的工作原理。
          </p>

          <h2 className="text-2xl font-bold mb-6">接下来去哪里看看</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                文档
              </h3>
              <p className="text-slate-400 text-sm">
                关于 CLI、perry/ui 组件、多线程、i18n 以及各个编译目标的指南——尽在 docs.perryts.com。
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                使用 Perry 编译的真实应用，已在 App Store 等平台上线。
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                对比
              </h3>
              <p className="text-slate-400 text-sm">
                Perry 与 Bun、Deno、Electron、Tauri、React Native 和 Static Hermes 相比表现如何。
              </p>
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                GitHub
              </h3>
              <p className="text-slate-400 text-sm">
                源代码、Issues 和讨论——Perry 是开源的。
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
