export default function Content() {
  return (
    <>
      <p>
        上一篇文章在 <strong>v0.5.306</strong> 收尾，主线是 gen-GC + JSON + 基准。四天后，Perry 已经到了 <strong>v0.5.359</strong> — 也就是 <strong>53 个补丁版本</strong> — 故事又变了。这些版本里没有一个是以基准数字作为头条。几乎全部都是 <strong>跟踪器中的 issue 被关闭</strong>。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> 上线 — 桌面应用的 Sparkle / Tauri 风格自动更新（对 SHA-256 摘要做 Ed25519 签名、哨兵回滚、分离重启）。社区 PR，由 <strong>TheHypnoo</strong> 贡献（<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>）。</li>
        <li><strong>Geisterhand 阶段 D</strong> — <code>http://localhost:7676</code> 上的实时 inspector，包含 widget 树、按 widget 详情、点击分发、以及通过 <code>POST /style/:h</code> 实时编辑样式。</li>
        <li><strong>编译器重构。</strong> 在 v0.5.329 → v0.5.343 期间，最常被提到的 4 个文件被切分：<code>lower::lower_expr</code> 6,687 → 624 LOC（−91%）、<code>compile.rs</code> 9,391 → 3,783 LOC（−60%）、<code>lower.rs</code> 13,591 → 7,554 LOC（−44%）、<code>lower_call.rs</code> 7,000+ → 4,681 LOC（−33%）。新的 <code>walker.rs</code> 把 <code>_ =&gt; {}</code> 通配 catch-all 这一类 bug 转成编译期错误。</li>
        <li><strong>UI 样式阶段 C 收官</strong> — 在 Apple、Android、GTK4、Windows 和 Web 的每个 widget 上都支持内联 <code>style: {`{ ... }`}</code> 属性。Windows 接通了 5 个桩中的 4 个（decoration / opacity / borders）；只剩 <code>widget.shadow</code>（DirectComposition 后续跟进）。</li>
        <li><strong>面向 Windows 的 Scoop bucket</strong>：<code>scoop install perry-ts/perry</code>。release 工作流加入 SHA-256 sidecar。</li>
        <li><strong>一波社区 issue 修复</strong> — 在 runtime、codegen、fetch、GTK4、Windows linker、async、stdlib 等维度共关闭约 30 个 issue。</li>
      </ul>

      <h2>1. perry/updater — 桌面应用自动更新</h2>
      <p>
        修复前 Perry 没有任何更新路径。应用打包发布、再发布，仅此而已。<strong>TheHypnoo</strong> 在 <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> 提供了完整方案：
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // 上次启动崩溃时执行哨兵回滚

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // 在新构建成功启动后调用`}</code></pre>
      <p>
        信任模型：<strong>对文件的 SHA-256 摘要做 Ed25519 签名</strong>（不是对文件字节签名 — 大二进制下验证仍然便宜）。manifest 是 JSON，带 schema 版本，每个 <code>&lt;os&gt;-&lt;arch&gt;</code> 三元组一条记录。原子安装并保留 <code>&lt;exe&gt;.prev</code> 备份，分离重启（Unix 上 <code>setsid</code>，Windows 上 <code>DETACHED_PROCESS</code>）。移动端按设计排除 — App Store / Play Store 在 OS 层面拥有安装管线。
      </p>
      <p>
        编写冒烟测试时浮现出 Perry 运行时的两个怪癖，并被一并修掉：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> 之前只返回元数据 stub。</strong> 在 <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> 修复（同样是 TheHypnoo） — <code>js_response_array_buffer</code> 现在分配真正的 <code>BufferHeader</code>，并把 <code>resp.body</code> 通过 <code>memcpy</code> 拷贝进去。</li>
        <li><strong><code>fs.appendFileSync</code> 写入了 0 字节。</strong> 在 <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> 修复 — 命名空间导入的 lowering 路径（<code>import * as fs from &quot;fs&quot;</code>）没有 <code>appendFileSync</code> 的分支，LLVM codegen 也没有对应 HIR 变体的分支。两边都已接通。</li>
      </ul>
      <p>
        文档位于 <code>docs/src/updater/overview.md</code>。
      </p>

      <h2>2. Geisterhand：localhost:7676 上的实时 inspector</h2>
      <p>
        Geisterhand 一直是 Perry 的进程内 UI 测试工具 — 端口 7676 上的 HTTP API，用来快照 widget 状态、分发点击。阶段 D 把它变成可以从任何浏览器打开的 devtools 风格 inspector。
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>步骤 1（v0.5.349）</strong> — <code>GET /</code> 提供一个单页 vanilla-JS UI，包含 widget 树、按 widget 的详情（frame、value、原始 JSON）、1.5 秒自动刷新（可暂停/恢复），以及一个&ldquo;触发 onClick&rdquo;按钮。codegen 针对 macOS 的延迟加载 <code>-dead_strip</code> 把 <code>INSPECTOR_HTML</code> 钉死，确保它在 release 构建中存活下来。</li>
        <li><strong>步骤 2（v0.5.350）</strong> — <code>POST /style/:h</code> 接收一袋 JSON 属性并实时应用。9 个属性（<code>backgroundColor</code>、<code>color</code>、<code>borderColor</code>、<code>borderWidth</code>、<code>borderRadius</code>、<code>opacity</code>、<code>padding</code>、<code>hidden</code>、<code>enabled</code>）通过现有 pump-queue 从 HTTP 线程 → 主线程流转。坏 JSON → 400；坏 handle → 400；未知属性在服务端被过滤，响应里列出哪些通过了。</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        macOS 派发器已接通；Linux / Windows / iOS / tvOS / visionOS / Android 走相同形态，是接下来要做的。
      </p>

      <h2>3. 编译器重构 — 切开四个最大的文件</h2>
      <p>
        跟踪器中的 5 个 issue（<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>、<a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>、<a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>、<a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>，加上长尾）形态相同：往 <code>ir.rs</code> 加了一个新的 <code>Expr</code> 变体，但 <code>lower.rs</code> 中四个临时 walker 之一带有 <code>_ =&gt; {}</code> 通配，悄悄把新变体编译错了。在运行时抓这种问题代价昂贵 — 有时是无形的，有时是 SSO 下的 SIGSEGV。
      </p>
      <p>
        <strong>v0.5.329</strong> 引入 <code>crates/perry-hir/src/walker.rs</code>，提供 <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — 对全部 178 个 <code>Expr</code> 变体的穷尽 match，<strong>不带 catch-all</strong>。增加新变体而不在这里登记，现在直接是编译错误。四个消费者（<code>substitute_locals</code>、<code>find_max_local_id::check_expr</code>、<code>collect_local_refs_expr</code>、<code>remap_local_ids_in_expr</code>）随之收缩：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">函数</th>
              <th className="text-right py-2 px-3">前</th>
              <th className="text-right py-2 px-3">后</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90%</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        合计：<strong>消除 1,830 行重复 descent</strong>，被 <strong>新增 1,840 行集中式 walker</strong> 取代 — 净增减为零，但这一类 bug 没了。
      </p>
      <p>
        随后其他工作得以推进。<strong>v0.5.331 → v0.5.343</strong> 在 14 次提交里切开了四个巨石。头条数字：
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">文件</th>
              <th className="text-right py-2 px-3">前</th>
              <th className="text-right py-2 px-3">后</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6,687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9,391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3,783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13,591</td><td className="text-right py-2 px-3">7,554</td><td className="text-right py-2 px-3">−44%</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7,000+</td><td className="text-right py-2 px-3">4,681</td><td className="text-right py-2 px-3">−33%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        切分落地为 19 个聚焦的子模块：<code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>、<code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>、<code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>，外加新的 <code>crates/perry-dispatch</code> crate，成为 UI / system / i18n 方法表的单一事实源（曾导致 issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a>&ldquo;在 macOS 上能编译，在 web 上崩&rdquo;那种意外的 <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> 扇出，现在就一次查表）。
      </p>
      <p>
        <strong>Tier 4 性能优化</strong> 同行（v0.5.335–v0.5.336）：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>把 <code>inline_functions</code> 中两个 pass 与 <code>compile.rs</code> 中三个 rayon pass 合并 — 每次编译节省 5 次模块扫描和 3 次调度往返。</li>
        <li>把 <code>perry dev</code> 的解析缓存限制为 500 条、FIFO 淘汰。修复前一个遍历 <code>node_modules</code> 的会话能持有 100+ MB 的 SWC AST。</li>
        <li>把 codegen 后的 <code>.ll</code> 写入循环并行化 — 在含 50+ 模块的 SSD 上 wall-time 快 2–4 倍。</li>
        <li>用 <code>Arc&lt;I18nTable&gt;</code> 取代每个 worker 都克隆 locale 表。</li>
      </ul>
      <p>
        Workspace 测试每次提交都保持 <strong>434 passed / 0 failed / 5 ignored</strong>；gap 测试维持基线 25/28；doc-tests 维持基线 80/82。
      </p>

      <h2>4. UI 样式阶段 C，收尾</h2>
      <p>
        阶段 C 是内联 <code>style: {`{ ... }`}</code> 的铺开。本时间窗内步骤 1–7 收口：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — <code>StyleProps</code> 类型表面 + Button 上的内联 <code>style:</code>。</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — 每个表格类 widget 上的 color/padding/shadow 内联解构，随后是 VStack / HStack。</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — 十六进制字符串 + 渐变 + 用于动态值的运行时 <code>parseColor</code>。</li>
        <li><strong>v0.5.312</strong> — 样式文档 + Windows 跟踪 issue。</li>
      </ul>
      <p>之后是跨平台扫尾：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong>（<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>、<a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>） — 接通 4 个样式 FFI，外加阻塞 Linux doc-tests gate 的 7 个缺失 FFI（v0.5.322）。</li>
        <li><strong>macOS</strong>（v0.5.324） — 为 <code>widget.shadow</code> 接通 <code>CALayer</code> 阴影管道 + visual_test 基础设施；为非 <code>NSTextField</code> widget 加上 <code>set_color</code> 类探测。</li>
        <li><strong>iOS / tvOS / visionOS</strong>（v0.5.346） — Button 的 <code>color: ...</code> 之前在 <code>UIButton</code> 上调用 <code>setTextColor:</code>，但它没有实现这个 selector；<code>objc2</code> 的 panic 跨过 <code>extern &quot;C&quot;</code> 边界，进程被中止。沿用 macOS 同款类探测模式修复 — UIButton 现在走 <code>setTitleColor:forState:UIControlStateNormal</code>。</li>
        <li><strong>Windows</strong>（v0.5.347） — 接通了 5 个样式桩中的 4 个（<code>text.decoration</code> 走 <code>LOGFONT</code> round-trip，<code>widget.opacity</code> 走 <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>，borders 走 <code>SetWindowSubclass</code> + <code>WM_PAINT</code>）。只剩 <code>widget.shadow</code>（需要 DirectComposition）。</li>
      </ul>
      <p>
        <code>docs/src/ui/styling-matrix.md</code> 中的样式矩阵在窗口结束时为：<strong>Web 43/43 已接通</strong>、<strong>Windows 42/43 已接通</strong>，其余覆盖完整。
      </p>

      <h2>5. 运行时正确性 pass — 一个 issue 一个 issue 地</h2>
      <p>
        本时段的主题：每个通过跟踪器进来的错误编译，要么变成修复，要么变成编译期错误。亮点：
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>（v0.5.323）</strong> — <code>fn</code> 内的类方法无法捕获包裹 fn 的 local。多模块复现现在与 Node 字节级一致。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>（v0.5.321 + v0.5.330）</strong> — 7 处字符串操作数点位的 SSO 安全 string-handle 拆箱：<code>arr.join</code>、<code>arr.toString</code>、<code>obj[stringKey]</code> 的 get/set/delete、<code>string.match(re)</code>、<code>process.env[dynKey]</code>、crypto digest 输入。修复前每一处对内联字符串操作数都要么悄悄返回垃圾，要么直接 SIGSEGV。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a>（v0.5.351）</strong> — 模块级别为空的 <code>const</code> 数组从函数内部接收的 <code>arr[i]=</code> 写入会丢失。Bloom-Engine/jump 的 <code>discoverLevels()</code> 在模块级别用 index-assign 填 <code>LEVEL_FILES</code>，关卡选择界面渲染为空时浮现。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a>（v0.5.357）</strong> — 当数组以参数形式传入 async 函数时，<code>Array.push</code> 会被悄悄限制在 16 个元素。async 函数不会被内联；重新分配返回的新指针调用方看不到。修复：每次扩容都在旧位置安装一个 forwarding 指针，复用 GC 现有的 <code>GC_FLAG_FORWARDED</code> 机制。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a>（v0.5.358）</strong> — 调用方省略尾部参数时，方法默认参数派发会传垃圾。两处共谋：跨模块方法声明硬编码 6 个 double，而不是 <code>arity + 1</code>；同时 <code>lower_class_method</code> 根本没调用 <code>build_default_param_stmts</code>。在 mongodb 的 <code>findOne(filter, options = {`{}`})</code> 静默挂起时浮现；修复在本地与跨模块派发上是统一的。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a>（v0.5.355）</strong> — 来自一个复现的三个独立 fetch + promise bug：api.github.com 对匿名请求返回 403（现在设置默认 User-Agent），<code>.then(console.log)</code> 永久挂起（null 回调没有把 TASK_QUEUE 条目入队），每个 fetch 拒绝都打印 <code>Uncaught exception: [object Object]</code>（NaN-box 的裸 <code>*StringHeader</code> 而不是真正的 <code>ErrorHeader</code>）。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a>（v0.5.359）</strong> — 拥有 <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code> 实例方法的真实 <code>Blob</code>。修复前 <code>await response.blob()</code> 只返回元数据 stub <code>{`{size, type}`}</code>。三部分修复落地于 runtime + HIR + codegen。</li>
      </ul>
      <p>外加一些小补：</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup 在 Linux 上过度修剪泛型单态化 + GTK4 链接静默 fallback。修复：用通过 <code>llvm-nm</code> 的<strong>符号集合</strong>比较替代名称模式过滤。哪怕只有一个独有符号的成员都保留。在没有链接错误的情况下把 <code>libperry_ui_macos.a</code> 从 196 → 35 个对象。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — 给 Windows 链接行加上 <code>secur32.lib</code>。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> 通过 Ryū 进行 FP round-trip。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — 为 <code>perry/i18n</code> 的格式包装器接通 codegen 派发。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — <code>perry/plugin</code> codegen 派发。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — Canvas widget 通过 LLVM codegen。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView 通过 codegen。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — Table widget 通过 codegen。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong>（部分） — 11 个 stdlib helper 派发分支。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — iOS + Android 的后台接收通知（warm-path）。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — watchOS 游戏循环 FFI 钩子的弱回退。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — <code>using</code> / <code>await using</code> 的 dispose 钩子。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — <code>js_native_call_method</code> 的参数 alloca 提升到 entry 块。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — <code>substitute_locals</code> 的 Uint8Array 分支。</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> 端到端接通（社区 PR）。</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        Windows 工具链故事在持续简化。<strong>v0.5.353</strong> 在 host 构建中对 <code>clang -target</code> 进行钉死 — PATH 上的非 MSVC clang（MinGW / MSYS2 / Anaconda / Rust GNU bundle）会悄悄把 Perry 的 <code>x86_64-pc-windows-msvc</code> IR 改写成 <code>windows-gnu</code>，lld-link 无法解析 LLVM 的 mingw32 emitter 插入的 <code>__main</code> 引用。新增的 <code>probe_clang_default_triple</code> 每个进程跑一次 <code>clang --version</code>，当 host 默认是 GNU 但我们目标是 MSVC 时打印一行信息提示。可用 <code>PERRY_NO_CLANG_PROBE=1</code> 抑制。
      </p>
      <p>
        <strong>v0.5.345</strong> 把 Win64 上的 <code>perry-ui</code> ABI 与 <code>perry-dispatch</code> 对齐 — 三个运行时 extern 签名漂移了（<code>perry_ui_navstack_create</code>、<code>perry_ui_menu_add_item_with_shortcut</code>、<code>perry_ui_app_set_timer</code>）。Win64 ABI 中整型与浮点位置参数共享槽位索引，因此不匹配时会从未初始化寄存器读到垃圾。SysV（macOS / Linux）使用分离的 int/float 寄存器池，恰好落上有效位 — 仅 Windows 崩溃，已在 8 个 perry-ui-* 平台 crate 中全部修复。
      </p>
      <p>
        然后：<strong><code>scoop install perry-ts/perry</code></strong>。manifest 钉在 v0.5.345（用 <code>depends: main/llvm</code> 自动拉取官方 MSVC 默认 LLVM）。release 工作流现在会在每个归档旁产出 <code>&lt;artifact&gt;.sha256</code> sidecar，格式与 <code>sha256sum</code> 兼容，便于任何下游包管理器 bumper 使用。
      </p>
      <pre><code>{`# Windows host
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. 收尾</h2>
      <p>
        本阶段的主线是社区参与加上内部清扫。<strong>TheHypnoo</strong> 提交了三个重要 PR（<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater、<a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> <code>fs.appendFileSync</code> 接通、<a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> <code>response.arrayBuffer</code> 的 body 字节）。跟踪器清掉了大约 30 个 issue。编译器最大文件缩了 60%，并长出了一个穷尽 walker，让&ldquo;忘了更新四个临时 walker 中的一个&rdquo;从运行时错编译变成 <code>cargo build</code> 错误。UI 样式在所有桌面平台上达到等同水准，Windows 上仅剩阴影。Geisterhand 长出了浏览器端的 devtools 表面。Windows 上的安装路径少了一条命令。
      </p>
      <p>试一试：</p>
      <pre><code>{`# npm（任意平台）
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew（macOS）
brew install PerryTS/perry/perry

# Scoop（Windows）
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# 桌面应用自动更新
npm install @perry/updater

# 实时 inspector
perry compile main.ts -o app --enable-geisterhand
./app &  # 然后打开 http://localhost:7676`}</code></pre>
      <p>
        源码：<a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues：<a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog：<a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
