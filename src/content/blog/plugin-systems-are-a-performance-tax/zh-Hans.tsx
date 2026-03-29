export default function Content() {
  return (
    <>
      <p>
        你安装了 VS Code。很快。你添加了 15 个扩展。现在启动要 4 秒，Extension Host 占用 800 MB 内存。发生了什么？
      </p>
      <p>
        这种模式到处重复：WordPress、Eclipse、Chrome、Figma、Slack。应用发布时很快。插件让它变慢。没人再感到惊讶了 —— 我们已经接受它作为可扩展性的代价。
      </p>
      <p>
        但插件系统不仅仅是性能问题。它们是设计哲学问题。行业将&quot;可扩展性&quot;与&quot;运行时动态性&quot;混为一谈，而往往更好的答案是编译时组合。唯一高性能的插件是那些在编译时不再是插件的。
      </p>

      <h2>可扩展性的性能谱系</h2>
      <p>
        不是所有的可扩展性代价都相同。从零开销到最大开销有一个谱系，而行业大部分选择了昂贵的一端：
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>静态链接 / 编译时模块</strong> — 零开销。C 库、Rust crate、Go 包。模块边界在最终二进制文件中完全消失。</li>
        <li><strong>启动时加载的共享库</strong> — 接近零。nginx 模块，Linux 内核模块。加载时一次性开销，之后是直接函数调用。</li>
        <li><strong>通过接口 / vtable 的动态分派</strong> — 小开销。C++ 游戏引擎插件。每次调用一个指针间接寻址。</li>
        <li><strong>同进程解释型插件</strong> — 中等开销。WordPress PHP 插件，Eclipse OSGi 包。</li>
        <li><strong>通过 IPC 的独立进程插件</strong> — 显著开销。VS Code 扩展，Chrome 扩展。</li>
        <li><strong>通过序列化 IPC 的沙盒插件</strong> — 重量级。Figma 插件，浏览器扩展内容脚本。</li>
      </ol>

      <h2>现实世界的损害</h2>
      <h3>WordPress</h3>
      <p>每个插件都挂钩到请求生命周期。30 个插件意味着每次页面加载都有 30 层函数调用。结果：缓存插件的存在只是为了减轻其他插件造成的损害。性能插件来修复插件造成的性能问题。这种元讽刺不言自明。</p>
      <h3>VS Code</h3>
      <p>扩展在单独进程中共享一个 Node.js 事件循环。一个行为不当的扩展会阻塞所有其他扩展。Extension Host 经常是开发者机器上最高的 CPU 消耗者。微软已经构建了分析工具、二分命令和激活事件系统 —— 整套基础设施来管理扩展造成的问题。</p>
      <h3>Eclipse</h3>
      <p>警示故事。OSGi 包解析、类加载开销、庞大的依赖图。曾经最受欢迎的 IDE，现在已被主流开发者基本抛弃。本应是其最大优势的插件架构成了其决定性弱点。</p>
      <h3>Electron</h3>
      <p>平台级别的插件问题。每个 Electron 应用都携带完整的 Chromium + Node.js 运行时。VS Code 是 Electron。Slack 是 Electron。Discord 是 Electron。每个独立消耗 300-500 MB 内存来渲染本质上只是一个聊天窗口或文本编辑器。</p>

      <h2>为什么行业仍然选择插件</h2>
      <p>如果插件这么昂贵，为什么每个人都还在构建它们？原因主要是组织性的，而非技术性的。</p>

      <h2>替代方案：编译时组合</h2>
      <p>如果可扩展性发生在构建时而不是运行时呢？</p>
      <p>这不是假设。在系统语言中有经过验证的先例：</p>

      <h2>这对 TypeScript 意味着什么</h2>
      <p>TypeScript 是构建可扩展工具最流行的语言 —— 也是运行时性能最差的。整个 TypeScript 生态系统运行在 Node.js 上，而 Node.js 运行在 V8 上，V8 JIT 编译 JavaScript。</p>
      <p>这就是 Perry 的用武之地。Perry 将 TypeScript 直接编译为原生二进制文件。没有 V8，没有 JIT 预热，没有垃圾收集暂停，没有 IPC 边界。</p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Your app, your dependencies, your &quot;plugins&quot; — one binary</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <h2>你真正需要的可扩展性</h2>
      <p>反对意见很明显：&quot;但我需要运行时可扩展性。用户需要在不重新编译的情况下安装插件。&quot;</p>
      <p>真的吗？对于大多数应用程序，扩展集在构建时就已知。</p>

      <h2>前进的道路</h2>
      <p>行业对插件架构的依赖是接受运行时开销不可避免的症状。但事实并非如此。编译器可以完成这项工作。构建时组合提供了无需付出代价的可扩展性。</p>
      <p>
        最快的插件系统是在运行时不存在的那个。
      </p>
    </>
  );
}
