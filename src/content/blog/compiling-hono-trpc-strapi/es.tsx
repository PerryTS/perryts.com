export default function Content() {
  return (
    <>
      <p>
        Perry ahora compila tres frameworks TypeScript importantes — Hono, tRPC y Strapi — a ejecutables nativos ARM64. Compilan en menos de un segundo, producen binarios de menos de 2 MB y se ejecutan sin crashes.
      </p>
      <p>Este artículo cubre qué funciona, qué aún no y qué aprendimos al empujar el compilador contra código del mundo real.</p>

      <h2>Los proyectos</h2>
      <p>Elegimos estos tres porque representan diferentes formas de TypeScript:</p>
      <ul className="list-disc list-inside">
        <li><strong>Hono</strong> — Un framework web ligero (29 módulos). Uso intensivo de genéricos, herencia de clases, asignación dinámica de métodos y las APIs web <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>. Su estructura de exportación usa re-exportaciones nombradas a través de archivos barrel.</li>
        <li><strong>tRPC</strong> — Un framework RPC con seguridad de tipos (52 módulos). Cadenas de re-exportación profundas a través de 4+ niveles, patrón builder con estrechamiento de tipo genérico, instanciación de clases a nivel de módulo y streaming vía Web Streams.</li>
        <li><strong>Strapi</strong> — Un core de CMS headless (4 módulos compilados nativamente, el resto resuelto como externo). Monorepo con resolución de paquetes de workspace, re-exportaciones de namespace (<code className="text-perry-400">export * as X</code>), patrón de contenedor de servicios con <code className="text-perry-400">Map</code> y funciones factory.</li>
      </ul>

      <h2>Resultados de compilación</h2>
      <p>Los tres compilan a binarios nativos con cero errores de compilación:</p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Proyecto</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Módulos compilados</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Tamaño del binario</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Tiempo de compilación</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">Hono</td><td className="py-3 px-4 text-slate-400">29</td><td className="py-3 px-4 text-slate-400">1.6 MB</td><td className="py-3 px-4 text-slate-400">0.59s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">tRPC</td><td className="py-3 px-4 text-slate-400">52</td><td className="py-3 px-4 text-slate-400">1.8 MB</td><td className="py-3 px-4 text-slate-400">0.97s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">Strapi</td><td className="py-3 px-4 text-slate-400">4</td><td className="py-3 px-4 text-slate-400">1.9 MB</td><td className="py-3 px-4 text-slate-400">0.80s</td></tr>
          </tbody>
        </table>
      </div>
      <p>Cada módulo fuente pasa por el pipeline completo: análisis SWC, bajada a HIR, codegen Cranelift, emisión de archivo objeto y enlace nativo. Los tiempos de compilación incluyen todo — desde el análisis hasta el enlace final.</p>
      <p>Para contexto, <code className="text-perry-400">tsc --noEmit</code> solo en tRPC toma varios segundos. Perry compila 52 módulos a un binario nativo enlazado en menos de uno.</p>

      <h2>Qué funciona en tiempo de ejecución</h2>
      <h3>Instanciación de clases entre módulos</h3>
      <p>Este fue el gran hito. La estructura de exportación de Hono se ve así:</p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500"><div className="w-3 h-3 rounded-full bg-red-500/50" /><div className="w-3 h-3 rounded-full bg-yellow-500/50" /><div className="w-3 h-3 rounded-full bg-green-500/50" /><span className="ml-2 text-xs">hono export chain</span></div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>Ese <code className="text-perry-400">export {"{"} Hono {"}"}</code> es una re-exportación nombrada — no <code className="text-perry-400">export * from</code> ni <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code>. En la HIR de Perry, esto se convierte en <code className="text-perry-400">Export::Named</code>, no <code className="text-perry-400">Export::ReExport</code> ni <code className="text-perry-400">Export::ExportAll</code>. Anteriormente, la propagación de clases del compilador solo seguía las cadenas <code className="text-perry-400">ExportAll</code> y <code className="text-perry-400">ReExport</code>, por lo que importar <code className="text-perry-400">Hono</code> desde <code className="text-perry-400">index.ts</code> fallaba silenciosamente. Ahora Perry rastrea <code className="text-perry-400">Export::Named</code> a través de los imports del módulo para encontrar la definición de clase original y la propaga.</p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>

      <h3>Resolución de re-exportación multi-nivel</h3>
      <p>El <code className="text-perry-400">initTRPC</code> de tRPC vive 4 niveles de profundidad:</p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>Eso es <code className="text-perry-400">ExportAll</code> → <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>. Perry resuelve la cadena completa.</p>

      <h3>Filtrado de exportaciones solo de tipos</h3>
      <p>Perry ahora verifica el flag <code className="text-perry-400">type_only</code> de SWC en declaraciones <code className="text-perry-400">ExportNamed</code> y <code className="text-perry-400">is_type_only</code> en especificadores individuales, omittiéndolos durante el lowering a HIR. Esto eliminó la generación de stubs muertos de re-exportaciones de tipos en los tres proyectos.</p>

      <h2>Qué aún no funciona</h2>
      <p>Somos específicos aquí porque las brechas dicen tanto como los éxitos.</p>

      <h3>Asignación dinámica de propiedades en <code className="text-perry-400">this</code></h3>
      <p>Perry no soporta <code className="text-perry-400">this[variable] = value</code> aún, por lo que los métodos HTTP de Hono como <code className="text-perry-400">app.get</code>, <code className="text-perry-400">app.post</code> no están disponibles. Esta es la brecha más grande para Hono.</p>

      <h3>Llamadas a constructores a nivel de módulo</h3>
      <p><code className="text-perry-400">export const initTRPC = new TRPCBuilder()</code> no ejecuta el constructor en tiempo de ejecución, por lo que <code className="text-perry-400">initTRPC.create()</code> es <code className="text-perry-400">undefined</code>.</p>

      <h3>Propiedades heredadas</h3>
      <p><code className="text-perry-400">TRPCError extends Error</code>, y mientras <code className="text-perry-400">err.code</code> funciona, <code className="text-perry-400">err.message</code> (heredado de <code className="text-perry-400">Error</code>) no es accesible. La cadena de prototipos para búsqueda de propiedades no está completamente implementada.</p>

      <h3>Clases Built-In de Web API</h3>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700"><th className="text-left py-3 px-4 font-semibold text-slate-300">Clase</th><th className="text-left py-3 px-4 font-semibold text-slate-300">Cantidad</th></tr></thead>
          <tbody>
            {[["Response","11"],["TransformStream","7"],["ReadableStream","5"],["Request","4"],["Headers","3"],["Proxy","2"],["TextEncoderStream","2"],["WritableStream","1"],["DOMException","1"]].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800"><td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td><td className="py-2 px-4 text-slate-400">{count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code> y <code className="text-perry-400">Headers</code> son los críticos para cualquier framework HTTP. Estos necesitan soporte de codegen built-in similar a lo que ya tenemos para <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>, <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>, <code className="text-perry-400">AbortController</code> y otros.</p>

      <h2>Qué nos dice esto</h2>
      <p>La buena noticia: el pipeline de compilación de Perry maneja código real de frameworks. Las brechas son de runtime, no de compilación. El trabajo restante es:</p>
      <ol className="list-decimal list-inside">
        <li><strong>Asignación dinámica de propiedades</strong> — necesaria para frameworks que configuran métodos programáticamente</li>
        <li><strong>Expresiones init a nivel de módulo</strong> — <code className="text-perry-400">export const x = new Foo()</code> necesita ejecutar el constructor</li>
        <li><strong>Cadena de prototipos</strong> — propiedades y métodos heredados</li>
        <li><strong>Built-ins de Web API</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> para frameworks HTTP</li>
      </ol>
      <p>Son problemas concretos y bien definidos. Ninguno requiere cambios arquitectónicos — son extensiones de patrones que ya funcionan para casos más simples.</p>
      <p>Seguiremos trabajando en esto. El objetivo es que <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code> produzca un servidor HTTP funcional en un binario nativo.</p>
    </>
  );
}
