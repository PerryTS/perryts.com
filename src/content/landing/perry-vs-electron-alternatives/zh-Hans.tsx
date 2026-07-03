import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript 的 Electron 替代方案：Perry 对比 Tauri 对比 Bun",
  description:
    "正在寻找 TypeScript 的 Electron 替代方案？从二进制大小、内存占用、UI 技术栈和语言等方面比较 Electron、Tauri、基于 Bun 的方案以及 Perry。",
  breadcrumb: "TypeScript 的 Electron 替代方案",
};

export default function Content() {
  return (
    <>
            <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            返回对比
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              面向 TypeScript 开发者的 Electron 替代方案
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron 让 Web 开发者也能轻松制作桌面应用，而它在体积和内存上
            的代价，也让&ldquo;Electron alternative&rdquo;成了一个长盛不衰
            的搜索词。如果 TypeScript 是你的语言，2026 年有四条现实的路
            径：留在 Electron、转向 Tauri、用 Bun 构建内嵌运行时的二进制
            文件，或者用 Perry 编译为原生代码。它们做出的取舍截然不同。
          </p>

          <h2 className="text-2xl font-bold mb-6">四种方案</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron——基准方案
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                每个应用都打包了 Chromium 和 Node.js。好处是十多年的生产
                环境成熟度，以及一套你的团队已经熟悉的 UI 技术栈
                （HTML/CSS/JS）——VS Code、Slack 和 Discord 都构建在它之
                上。坏处是基础成本：hello-world 安装包约为 80–150 MB，多
                个 Chromium 进程，空闲时占用数百 MB 内存。仅限桌面端。{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  完整的 Perry 对比 Electron
                </Link>
                。
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri——在系统 webview 中运行 Web UI，后端为 Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri 保留了 Web 前端，但去掉了打包的 Chromium：UI 在操作
                系统自带的 webview（WKWebView、WebView2、WebKitGTK）中渲
                染，因此安装包体积落在个位数 MB 量级。它稳定、文档完善，
                且 Tauri 2 增加了对 iOS/Android 的支持。代价是：后端是
                Rust，而不是 TypeScript——UI 之外的应用逻辑意味着要写 Rust
                并跨越一个 IPC 桥——而且由于每个操作系统自带的 webview 不
                同，渲染表现在各平台之间会有细微差异。{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  完整的 Perry 对比 Tauri
                </Link>
                。
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun——单文件二进制，没有 GUI 层
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                搜索&ldquo;bun electron&rdquo;的人通常是想要 Electron 的便
                利，却不想承担它的体积。{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                通过把 Bun 运行时和你打包好的 TypeScript 一起内嵌，产出单
                个可执行文件——非常适合 CLI 和服务端场景，由于它本身就是
                运行时，因此拥有完整的 npm 兼容性。但这个二进制文件大约在
                60 MB（macOS arm64）到 100+ MB（Linux/Windows）之间，代码
                依然以 JIT 方式执行，而且 Bun 没有 UI 框架——桌面应用仍然
                需要在其上叠加 Electron、Tauri 或某个 webview 库。{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  完整的 Perry 对比 Bun
                </Link>
                。
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry——将 TypeScript 编译为原生组件
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry 把 TypeScript 提前编译为机器码，并通过真正的平台组
                件——AppKit、UIKit、GTK4、Win32，以及通过 JNI 实现的
                Android——渲染 UI，完全没有 webview，也没有 IPC 桥。UI 和
                逻辑用同一种语言，hello world 约 330 KB，典型二进制约
                2–5 MB，启动时间约 1 毫秒，十个目标平台涵盖移动端、手表
                和 TV。坦诚的提醒：Perry 是 Pre-1.0，它的 UI API 是自成一
                体的（声明式，SwiftUI 风格——而非 HTML/CSS），生态相比
                Electron 还很年轻。
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">并排对比</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">语言</td>
                  <td className="px-4 py-3 text-slate-400">全程 TypeScript</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS 前端，Rust 后端</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">UI 方案</td>
                  <td className="px-4 py-3 text-slate-400">原生平台组件</td>
                  <td className="px-4 py-3 text-slate-400">内置 Chromium</td>
                  <td className="px-4 py-3 text-slate-400">系统 webview</td>
                  <td className="px-4 py-3 text-slate-400">无（CLI/服务端）</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Hello-world 大小</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">按平台约 60–116 MB</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">执行方式</td>
                  <td className="px-4 py-3 text-slate-400">AOT 机器码</td>
                  <td className="px-4 py-3 text-slate-400">JIT（V8）</td>
                  <td className="px-4 py-3 text-slate-400">JIT（webview JS 引擎）+ 原生 Rust</td>
                  <td className="px-4 py-3 text-slate-400">JIT（JavaScriptCore）</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">空闲时内存占用</td>
                  <td className="px-4 py-3 text-slate-400">数十 MB（单一原生进程）</td>
                  <td className="px-4 py-3 text-slate-400">数百 MB（多进程 Chromium）</td>
                  <td className="px-4 py-3 text-slate-400">低于 Electron（系统 webview）</td>
                  <td className="px-4 py-3 text-slate-400">运行时的典型水平</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">移动 / 手表 / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">不支持</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">不支持</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">成熟度</td>
                  <td className="px-4 py-3 text-slate-400">Pre-1.0</td>
                  <td className="px-4 py-3 text-slate-400">生产环境十余年</td>
                  <td className="px-4 py-3 text-slate-400">稳定（1.x/2.x）</td>
                  <td className="px-4 py-3 text-slate-400">稳定</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            React Native 或 Flutter 呢？
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            它们在每个讨论 Electron 的话题里都会出现，但它们回答的是不同
            的问题。React Native 是移动优先的：你的 JavaScript 运行在
            Hermes 引擎中，并通过一座桥驱动原生视图，桌面端支持仅存在于
            独立的社区/微软分支中——它并不是 Electron 的直接替代品（
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry 对比 React Native
            </Link>
            ）。Flutter 覆盖桌面和移动端，但意味着要放弃 TypeScript 转投
            Dart，而且它是自己绘制组件，而不是使用平台自带的组件。如果留
            在 TypeScript 是硬性约束，那么现实可行的桌面端候选仍然是上述
            四个选项。
          </p>

          <h2 className="text-2xl font-bold mb-6">应该选哪一个？</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                留在 Web 技术栈
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                如果你的 UI 已经用 React/Vue/Svelte 构建好了，而且今天就
                需要经过实战检验的桌面端分发方案，Electron 仍然是风险最
                低的选择——代价是体积和内存。如果这个代价让你在意，并且你
                愿意用 Rust 写后端，Tauri 能以极小的体积代价给你大部分
                Web 技术栈的体验。
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                抛开 webview
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                如果你真正想要的是&ldquo;输入 TypeScript，输出原生应
                用&rdquo;——一种语言、真正的平台组件、小体积二进制文件，
                以及用同一份代码覆盖移动端/手表/TV——这正是 Perry 存在的
                意义，代价是 Pre-1.0 的成熟度。而如果你只需要一个零兼容
                性风险的单文件 CLI 或服务端程序，Bun 的{" "}
                <code className="text-slate-300">--compile</code> 就是务
                实之选。
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              亲自体验一下
            </h2>
            <p className="text-slate-400 mb-6">
              安装 Perry，从 TypeScript 交付一个原生应用。
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
      </article>
    </>
  );
}
