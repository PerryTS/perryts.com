export default function Content() {
  return (
    <>
      <p>
        Perry 现在可以将三个主要的 TypeScript 框架 —— Hono、tRPC 和 Strapi —— 编译为原生 ARM64
        可执行文件。编译时间不到一秒，生成的二进制文件不到 2 MB，运行不会崩溃。
      </p>
      <p>
        本文介绍了什么有效、什么还不行，以及我们在将编译器推向真实代码时学到了什么。
      </p>

      <h2>项目选择</h2>
      <p>
        我们选择这三个项目是因为它们代表了不同形态的 TypeScript：
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> —— 轻量级 Web 框架（29 个模块）。大量使用泛型、类继承、动态方法赋值，
          以及 <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code> Web API。
          导出结构使用通过 barrel 文件的命名重导出。
        </li>
        <li>
          <strong>tRPC</strong> —— 类型安全的 RPC 框架（52 个模块）。4+ 层深的重导出链、
          带泛型类型收窄的构建器模式、模块作用域的类实例化，以及通过 Web Streams 的流式传输。
        </li>
        <li>
          <strong>Strapi</strong> —— 无头 CMS 核心（4 个模块原生编译，其余作为外部解析）。
          带有工作区包解析的 monorepo、命名空间重导出
          （<code className="text-perry-400">export * as X</code>）、使用
          <code className="text-perry-400">Map</code> 的服务容器模式，以及工厂函数。
        </li>
      </ul>

      <h2>编译结果</h2>
      <p>三个项目都编译为原生二进制文件，零编译错误：</p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">项目</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">编译模块数</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">二进制大小</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">编译时间</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        每个源模块都经过完整管道：SWC 解析、HIR 降低、Cranelift 代码生成、目标文件输出和原生链接。
        编译时间包含所有环节 —— 从解析到最终链接。
      </p>
      <p>
        作为对比，仅 <code className="text-perry-400">tsc --noEmit</code> 在 tRPC 上就要花几秒。
        Perry 在不到一秒内将 52 个模块编译为已链接的原生二进制文件。
      </p>

      <h2>运行时有效的部分</h2>
      <h3>跨模块类实例化</h3>
      <p>
        这是重大里程碑。Perry 现在能追踪 <code className="text-perry-400">Export::Named</code>
        通过模块的导入回溯找到原始类定义并传播它。结果：Hono 的构造函数运行，初始化
        <code className="text-perry-400">SmartRouter</code>，并返回真实对象。
      </p>

      <h3>多层重导出解析</h3>
      <p>
        tRPC 的 <code className="text-perry-400">initTRPC</code> 位于 4 层深处：
        <code className="text-perry-400">ExportAll</code> →{" "}
        <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>。
        Perry 解析了整条链。
      </p>

      <h3>Monorepo 中的包解析</h3>
      <p>
        Strapi 使用工作区包。Perry 通过 <code className="text-perry-400">package.json</code> 的
        exports 字段解析裸说明符。
      </p>

      <h2>尚未有效的部分</h2>

      <h3><code className="text-perry-400">this</code> 上的动态属性赋值</h3>
      <p>
        Hono 的构造函数动态设置 HTTP 方法处理器。Perry 尚不支持
        <code className="text-perry-400">this[variable] = value</code>，所以这些方法缺失。
        这是 Hono 最大的缺口。
      </p>

      <h3>模块级构造函数调用</h3>
      <p>
        <code className="text-perry-400">export const initTRPC = new TRPCBuilder()</code> 在运行时
        不执行构造函数，产生的是类引用而不是实例。
      </p>

      <h3>继承的属性</h3>
      <p>
        <code className="text-perry-400">err.code</code> 有效但 <code className="text-perry-400">err.message</code>
        （从 <code className="text-perry-400">Error</code> 继承）不可访问。原型链的属性查找尚未完全实现。
      </p>

      <h2>这告诉我们什么</h2>
      <p>
        好消息是：Perry 的编译管道能处理真实的框架代码。具有复杂重导出链、重度泛型类型签名、
        类层次结构和 monorepo 包解析的多文件项目都能编译为已链接的二进制文件。
      </p>
      <p>
        缺口在运行时，而非编译。剩余工作是：
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>动态属性赋值</strong> —— 以编程方式设置方法的框架需要此功能</li>
        <li><strong>模块级初始化表达式</strong> —— <code className="text-perry-400">export const x = new Foo()</code> 需要实际执行构造函数</li>
        <li><strong>原型链</strong> —— 继承的属性和方法</li>
        <li><strong>Web API 内置类</strong> —— HTTP 框架需要的 <code className="text-perry-400">Response</code>、<code className="text-perry-400">Request</code>、<code className="text-perry-400">Headers</code></li>
      </ol>
      <p>
        这些都是具体、范围明确的问题。没有一个需要架构变更 —— 它们是已经适用于简单情况的模式的扩展。
      </p>
      <p>
        我们将继续推进。目标是{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        在原生二进制文件中产生一个可工作的 HTTP 服务器。
      </p>
    </>
  );
}
