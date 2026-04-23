export default function Content() {
  return (
    <>
      <p>
        El artículo anterior cerraba con Perry en v0.5.80 y una derrota tozuda en la tabla de benchmarks: el roundtrip de <code>JSON.parse</code>/<code>stringify</code> seguía siendo 1,6x más lento que Node. Seis días después Perry está en <strong>v0.5.174</strong> — eso son <strong>94 releases de parche</strong> — y tres cosas cambiaron que vale la pena destacar antes que nada:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> se publica en <strong>npm</strong>. Un solo comando instala Perry en todas las plataformas soportadas.</li>
        <li><strong><code>perry dev</code></strong> añade recompilación automática en modo watch, sobre una nueva cache de AST en memoria y una cache de objetos en disco por módulo.</li>
        <li>La derrota de <code>json_roundtrip</code> se cerró. Perry ahora <strong>gana a Node y Bun en cada benchmark</strong> de la suite principal (15/15 vs ambos).</li>
      </ul>
      <p>
        El resto del artículo es el reparto secundario: arreglos de WebAssembly, watchOS compilando por fin de extremo a extremo, primitivas de <code>perry/thread</code> conectadas hasta el final, y un lote de victorias de estrictitud en tiempo de compilación que convierten caídas silenciosas en errores reales.
      </p>

      <h2>1. <code>@perryts/perry</code> en npm</h2>
      <p>
        Perry siempre se ha instalado vía Homebrew en macOS y APT en Debian/Ubuntu. Buena cobertura para desarrolladores en esas plataformas, nada en absoluto para usuarios de Windows salvo que compilaran desde fuente, y nada uniforme para un equipo que mezcle Mac, Linux y Windows. v0.5.107 hizo desaparecer ese problema.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        El paquete es un lanzador delgado que depende de siete paquetes opcionales por plataforma — macOS arm64/x64, Linux x64/arm64 tanto en glibc como musl, Windows x64 — y npm instala solo el que coincide con tu máquina. El tamaño del binario por plataforma es de unos pocos megabytes. La instalación en sí dura segundos. También hay un camino de instalación global (<code>npm install -g @perryts/perry</code>) si lo prefieres, pero la instalación local al proyecto fija la versión del compilador junto a tus dependencias, que es el valor por defecto correcto.
      </p>
      <p>
        La publicación pasó por OIDC Trusted Publisher, así que cada release tiene proveniencia y queda atada al job de CI que la construyó. Eso fue un día entero de trabajo en CI — varios commits de CI en <code>v0.5.107</code> persiguiendo la combinación correcta de <code>--provenance</code> / versión de npm / ruta del workflow — pero aterrizó, y cada release desde entonces ha sido limpia. Los usuarios de Windows son ciudadanos de primera clase ahora, y la fricción entre equipos de &ldquo;instálalo como quiera tu SO&rdquo; ha desaparecido.
      </p>

      <h2>2. <code>perry dev</code> — modo watch</h2>
      <p>
        v0.5.143 añadió un nuevo subcomando a la CLI:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        Eso es todo. Observa tu proyecto, recompila al guardar y relanza tu binario. La inspiración es Vite y <code>nodemon</code>; la idea es dejar de fingir que un flujo de compilador-a-binario tiene que sentirse más lento que un runtime. Para la mayoría de proyectos <code>perry dev</code> reconstruye en menos de un segundo con cache caliente.
      </p>
      <p>
        La parte de &ldquo;cache caliente&rdquo; es clave. Dos nuevas caches aterrizaron junto con <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Cache de AST en memoria</strong> (v0.5.156). A través de recompilaciones en una única sesión de <code>perry dev</code>, Perry mantiene el AST parseado de cada módulo que no ha cambiado en disco. Editar un archivo re-parsea un archivo, no todo el grafo de módulos.
        </li>
        <li>
          <strong>Cache de objetos en disco por módulo (V2.2)</strong>. Cada módulo compila a su propio archivo <code>.o</code> y se hashea; los módulos sin cambios saltan codegen por completo y el linker recoge el objeto cacheado. La salida verbose de la cache coincide con la spec en <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, y una ronda de endurecimiento por auditoría en v0.5.160 cerró los casos borde en que entradas rancias de cache podían sobrevivir a un cambio de cabecera.
        </li>
      </ul>
      <p>
        Las dos caches se acumulan. La primera edición de la sesión es compilación completa; todo lo demás solo hace trabajo proporcional a lo que realmente cambiaste. Este es el mayor cambio individual de DX de la semana.
      </p>

      <h2>3. Ganando a Bun en cada benchmark</h2>
      <p>
        En v0.5.166 el README tenía una advertencia honesta: Perry era 1,6x más lento que Node en <code>json_roundtrip</code> (50× <code>JSON.parse</code> + <code>JSON.stringify</code> sobre un blob de 1MB y 10K ítems), y 2,4x más lento que Bun. El issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> hacía seguimiento. Para v0.5.173 — siete días después — esa brecha se cerró.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Carga de trabajo</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry ahora gana en cada carga de trabajo de la suite principal de benchmarks — <strong>15/15 vs Node, 15/15 vs Bun</strong>, mejor de 5 ejecuciones en macOS ARM64. Bun 1.3 sigue por delante en RSS pico (84MB vs los 310MB de Perry en <code>json_roundtrip</code>), así que la presión sobre el allocator es lo siguiente a cerrar, pero la latencia en bruto es de Perry.
      </p>
      <p>
        El cierre de la brecha de JSON no fue un único cambio — fue la acumulación del trabajo de paridad en el layout de objetos que recorrió esta semana: inferencia de shape de literales de objeto de Fase 1 (v0.5.167), inferencia de tipo de retorno basada en el cuerpo para funciones libres, métodos de clase, getters y arrows de Fase 4 (v0.5.169), e inferencia de tipo de retorno de llamadas a método de Fase 4.1 (v0.5.170). El tema es el mismo que en el artículo anterior: dale a LLVM suficiente estructura estática para ver a través, y el optimizador hace el resto.
      </p>
      <p>
        v0.5.164 también restauró la autovectorización con acumulador paralelo <code>&lt;2 x double&gt;</code> sobre bucles de reducción de pure-fadd, que había regresionado silenciosamente en algún momento del rango v0.5.9x→v0.5.16x. Eso es lo que devuelve <code>math_intensive</code> y <code>accumulate</code> a su vieja ventaja de 3-4x sobre Rust/C++/Go/Swift — mismo LLVM, un flag <code>reassoc contract</code>, un cuerpo de bucle vectorizado.
      </p>

      <h2>4. <code>perry/ui</code> y doc-tests</h2>
      <p>
        Cuatro huecos restantes de perry/ui se cerraron en v0.5.151. Junto con eso, v0.5.119 cambió el mal uso silencioso de la API de perry/ui de &ldquo;compila y no hace nada&rdquo; a un error de compilación duro — misma lógica que v0.5.165 aplicada a decoradores (ver abajo). Que el mal uso salga a la superficie en tiempo de compilación es siempre mejor que en tiempo de ejecución.
      </p>
      <p>
        v0.5.123 entregó un <strong>harness de tests para doc-examples</strong> y una galería de widgets. Cada ejemplo TypeScript en la documentación se compila ahora en cada ejecución de CI, y la galería de widgets compara screenshots contra baselines aprobados. v0.5.125 extendió eso a una matriz de cross-compile: cada ejemplo de doc se construye para iOS, tvOS, Android, WASM y Web además de la plataforma host, así que la deriva de API entre targets se detecta en el PR que la introdujo en lugar de en el ciclo de release que la envió.
      </p>
      <p>
        Una pequeña victoria de calidad de vida: <code>perry check</code> ahora emite <code>file:line:column</code> para errores de lowering de HIR (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), lo que significa que jump-to-error del editor funciona en lugar de mostrar un mensaje genérico sin ubicación.
      </p>

      <h2>5. watchOS compila de extremo a extremo</h2>
      <p>
        watchOS se envió como target de compilación el mes pasado, pero un build limpio de extremo a extremo tenía algunas asperezas. El trabajo de watchOS de esta semana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> y <code>--target watchos-simulator</code> ahora compilan de extremo a extremo sin los workarounds que se habían acumulado.</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> para apps con superficie Metal.</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> para renderizado hospedado por SwiftUI — cuando quieres que SwiftUI sea dueño del ciclo de vida de la app y que Perry componga la UI dentro.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> conectado a perry-ui-ios y perry-ui-tvos, así que los tests de UI con Geisterhand corren igual en esos dos targets que en macOS y Linux.</li>
      </ul>

      <h2>6. Primitivas de <code>perry/thread</code> completamente conectadas</h2>
      <p>
        v0.5.174 (hoy) cerró <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code> y <code>spawn</code> están completamente conectados a través del camino de codegen con aplicación de seguridad en tiempo de compilación. Las capturas mutables se rechazan en tiempo de compilación — la misma postura de corrección en tiempo de compilación que perry/ui y los decoradores tienen ahora. Las primitivas de threading que estaban parcialmente conectadas desde el anuncio de v0.4.0 están ahora completas de extremo a extremo.
      </p>

      <h2>7. WebAssembly y el target web</h2>
      <p>
        Dos arreglos de WASM que vale la pena destacar:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: cinco bugs compuestos en <code>--target web</code> (el camino de salida a WASM) que se enmascaraban mutuamente. Arreglados en lote para que el target web aguante ahora toda la superficie de <code>perry/ui</code> (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> dentro de un <code>if</code> dentro de un bucle se colgaba en WASM — un bug de codegen que no se reproducía en los targets nativos. Arreglado (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        También del lado de la correctitud: v0.5.157 arregló <code>obj.field</code> devolviendo <code>NaN</code> en Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), y v0.5.162 arregló un bug maldito de ws donde <code>sendToClient</code> y <code>closeClient</code> habían estado compilando a no-ops silenciosos (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Victorias de estrictitud en tiempo de compilación</h2>
      <p>
        Un tema de esta semana: cualquier cosa que solía ser un fallo silencioso es ahora un error de compilación.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: los decoradores de TypeScript se parseaban a HIR y luego se descartaban silenciosamente. Ahora dan error en el punto de decoración con un mensaje claro (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). El mismo razonamiento warn→bail de v0.5.119 aplicado a perry/ui.</li>
        <li><strong>v0.5.119</strong>: el mal uso de la API de perry/ui se rechaza en tiempo de compilación en lugar de producir un binario no-op.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> ahora emite un backtrace nativo real a stderr en lugar de solo hacer eco del mensaje (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). Los frames simbolicados requieren <code>PERRY_DEBUG_SYMBOLS=1</code>; sin él obtienes direcciones, que sigue siendo más que el comportamiento de eco del mensaje que reemplaza.</li>
      </ul>

      <h2>9. Cerrando</h2>
      <p>
        El patrón de la semana: <strong>distribución</strong> (npm), <strong>experiencia del desarrollador</strong> (<code>perry dev</code>, caches incrementales) y <strong>la última derrota pendiente en benchmarks cerrada</strong>. Más un lote de estrictitud en tiempo de compilación que convierte caídas silenciosas en errores reales. Seis días, 94 releases de parche, un gran cambio de DX.
      </p>
      <p>
        Pruébalo:
      </p>
      <pre><code>{`# npm (cualquier plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Modo watch para desarrollo iterativo
perry dev`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
