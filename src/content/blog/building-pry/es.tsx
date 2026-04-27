import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry es un visor JSON nativo construido completamente en TypeScript y compilado con Perry. No es una demo técnica — es una herramienta real que usamos a diario para inspeccionar respuestas de API, archivos de configuración y volcados de datos. Este artículo recorre cómo fue construido, cómo compila y cómo es la experiencia de desarrollo cuando tu TypeScript compila a una app nativa.
      </p>

      <h2>Qué hace Pry</h2>
      <p>
        Pry lee un archivo JSON (o acepta JSON desde stdin) y lo renderiza como un árbol interactivo y navegable en una ventana nativa. Si has usado el Quick Look integrado de macOS para JSON, imagina eso — pero más rápido, con búsqueda y con navegación por teclado.
      </p>
      <p>
        El conjunto de funcionalidades:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Vista de árbol</strong> — nodos plegables para objetos y arrays, con indicadores de profundidad y expandir/colapsar todo</li>
        <li><strong>Búsqueda</strong> — búsqueda de texto completo en claves y valores con resaltado en tiempo real y navegación de coincidencias</li>
        <li><strong>Atajos de teclado</strong> — flechas para navegar, enter para expandir/colapsar, barra para buscar, <code className="text-perry-400">⌘C</code> para copiar</li>
        <li><strong>Portapapeles</strong> — copiar cualquier nodo o subárbol como JSON formateado</li>
        <li><strong>Coloreo de sintaxis</strong> — strings en verde, números en naranja, booleanos en púrpura, null en rojo</li>
        <li><strong>Barra de estado</strong> — muestra el conteo total de nodos, profundidad actual, tamaño de archivo y tiempo de análisis</li>
      </ul>

      <h2>El código fuente</h2>
      <p>
        Pry está escrito en TypeScript estándar. No hay sintaxis especial, no hay macros, no hay generación de código en tiempo de compilación. Usa la API de UI de Perry, que proporciona widgets nativos que compilan a código específico de plataforma.
      </p>
      <p>
        Aquí está el punto de entrada (simplificado para claridad):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Leer entrada desde argumento de archivo o stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Estado reactivo</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Construir la app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Ese es el núcleo de una aplicación nativa. Sin boilerplate de framework, sin configuración de compilación, sin archivos específicos de plataforma. Un archivo TypeScript.
      </p>

      <h3>Las funciones auxiliares</h3>
      <p>
        Pry también incluye una utilidad <code className="text-perry-400">countNodes</code> que cuenta recursivamente todos los nodos en el árbol JSON, y un helper <code className="text-perry-400">formatBytes</code> para mostrar tamaños de archivo. Son funciones TypeScript estándar — nada específico de Perry en ellas. Compilan a código nativo igual que todo lo demás.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Compilando Pry</h2>
      <p>
        Compilar Pry con Perry es un solo comando. Sin proyecto Xcode, sin configuración Gradle, sin config de webpack. Solo apuntar Perry al archivo de entrada y especificar tu objetivo.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        El binario tiene 48 MB porque incluye el stack completo de UI AppKit — renderizado de vista de árbol, resaltado de búsqueda, coloreo de sintaxis y manejo de teclado. Para comparación, la misma app en Electron sería de más de 200 MB. Una app Perry solo CLI compila a 2-5 MB.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        La compilación iOS enlaza contra UIKit en lugar de AppKit. Perry mapea la misma API <code className="text-perry-400">TreeView</code> a <code className="text-perry-400">UITableView</code> con secciones expandibles, <code className="text-perry-400">SearchBar</code> a <code className="text-perry-400">UISearchBar</code>, y los eventos táctiles reemplazan los eventos de ratón. La compilación iOS puede desplegarse en dispositivos físicos y simuladores.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        La compilación Android genera una biblioteca nativa cargada a través de JNI, empaquetada en un APK. <code className="text-perry-400">TreeView</code> mapea a un <code className="text-perry-400">RecyclerView</code> con view holders expandibles, <code className="text-perry-400">SearchBar</code> mapea a un <code className="text-perry-400">EditText</code> con un <code className="text-perry-400">TextWatcher</code>, y la barra de estado mapea a un <code className="text-perry-400">TextView</code> en la parte inferior del layout.
      </p>

      <h2>Qué pasa bajo el capó</h2>
      <p>Cuando Perry compila Pry, pasa por varias fases:</p>
      <ol className="list-decimal list-inside">
        <li><strong>Análisis</strong> — SWC analiza el código fuente TypeScript en un AST. Los imports de <code className="text-perry-400">perry/ui</code> y <code className="text-perry-400">perry/fs</code> se resuelven a las implementaciones de módulos incorporados de Perry.</li>
        <li><strong>Análisis de tipos</strong> — Perry resuelve todos los tipos, incluyendo los genéricos <code className="text-perry-400">State&lt;string&gt;</code> y <code className="text-perry-400">State&lt;number&gt;</code>, monomorfizándolos en tipos concretos.</li>
        <li><strong>Resolución de plataforma</strong> — Basándose en el flag de objetivo, Perry selecciona el backend de UI apropiado. Cada llamada a <code className="text-perry-400">TreeView</code>, <code className="text-perry-400">SearchBar</code> y <code className="text-perry-400">Button</code> se resuelve a la implementación específica de la plataforma.</li>
        <li><strong>Generación de IR</strong> — Perry genera una representación intermedia que incluye llamadas a API nativas — envíos de mensajes Objective-C para macOS/iOS, llamadas JNI para Android, llamadas a funciones C para GTK4/Win32.</li>
        <li><strong>Generación de código</strong> — Cranelift compila la IR a código máquina nativo para la arquitectura objetivo.</li>
        <li><strong>Enlace</strong> — El código nativo se enlaza contra los frameworks de la plataforma (AppKit, UIKit, Android NDK, GTK4 o Win32) para producir el ejecutable final.</li>
      </ol>

      <h2>Sin runtime, sin vistas web</h2>
      <p>
        Esto vale la pena enfatizarlo porque es la diferencia central entre Perry y cualquier otro enfoque TypeScript-a-nativo. El binario compilado de Pry tiene:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Sin motor JavaScript</strong> — sin V8, sin Hermes, sin JavaScriptCore</li>
        <li><strong>Sin vistas web</strong> — sin Chromium, sin WebKit, sin WKWebView</li>
        <li><strong>Sin capa bridge</strong> — sin mensajes serializados entre JS y nativo</li>
        <li><strong>Sin runtime de framework</strong> — sin React, sin motor Flutter, sin VM Dart</li>
      </ul>
      <p>
        El binario llama a las APIs de la plataforma directamente. En macOS, llama a <code className="text-perry-400">objc_msgSend</code> para interactuar con objetos AppKit. En Android, llama a funciones JNI para crear y manipular Views. Es lo mismo que haría una app nativa Swift o Kotlin.
      </p>
      <p>
        La consecuencia práctica: Pry se lanza instantáneamente. No hay arranque de VM, no hay calentamiento JIT, no hay análisis de scripts. El proceso arranca, la ventana aparece, el JSON se renderiza. El uso de memoria es una fracción de lo que un equivalente Electron consumiría.
      </p>

      <h2>Experiencia de desarrollo</h2>
      <p>Construir Pry se sintió notablemente similar a construir cualquier aplicación TypeScript. El flujo de trabajo es:</p>
      <ol className="list-decimal list-inside">
        <li>Escribir TypeScript en tu editor (VS Code, Zed, Neovim, lo que prefieras)</li>
        <li>Ejecutar <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>Ejecutar <code className="text-perry-400">./pry test.json</code></li>
        <li>Iterar</li>
      </ol>
      <p>
        Sin proyecto Xcode que configurar. Sin Android Studio que instalar. Sin compilación Gradle de 45 segundos. El compilador Perry en sí es rápido — analizar y compilar Pry toma unos pocos segundos, y estamos trabajando activamente en hacerlo más rápido.
      </p>
      <p>
        El TypeScript que escribes es TypeScript estándar. La verificación de tipos de tu editor, el autocompletado y las herramientas de refactorización funcionan todas. Puedes extraer funciones, crear módulos, usar genéricos — todos los patrones TypeScript que ya conoces.
      </p>

      <h2>Qué aprendimos</h2>
      <p>Construir Pry nos enseñó mucho sobre lo que la API de UI de Perry necesita soportar. Algunas lecciones:</p>
      <ul className="list-disc list-inside">
        <li><strong>Las vistas de árbol son complejas.</strong> Expandir, colapsar, resaltado de búsqueda, navegación por teclado e integración con el portapapeles necesitan estar coordinados. El widget <code className="text-perry-400">TreeView</code> de Perry maneja esto internamente, pero tuvimos que asegurarnos de que la implementación nativa fuera consistente en las tres plataformas.</li>
        <li><strong>Los atajos de teclado necesitan convenciones de plataforma.</strong> En macOS, es <code className="text-perry-400">⌘C</code> para copiar. En Linux y Android, es <code className="text-perry-400">Ctrl+C</code>. El sistema de atajos de Perry abstrae esto, pero requirió una implementación cuidadosa para hacerlo bien.</li>
        <li><strong>Las barras de estado son sorprendentemente no triviales.</strong> Cada plataforma tiene una convención diferente sobre dónde y cómo mostrar información de estado. AppKit usa la barra inferior de la ventana, UIKit usa una toolbar, Android usa una view inferior en el layout. La <code className="text-perry-400">StatusBar</code> de Perry mapea a cada una correctamente.</li>
        <li><strong>El soporte de stdin requirió conciencia de plataforma.</strong> En macOS y Linux, leer de stdin es directo. En iOS y Android, stdin no &quot;existe&quot; realmente de la misma manera, así que Pry usa selección de archivos en plataformas móviles. El <code className="text-perry-400">readStdin</code> de Perry maneja esto de forma transparente.</li>
      </ul>

      <h2>Rendimiento</h2>
      <p>Pry maneja archivos JSON grandes cómodamente. En nuestras pruebas:</p>
      <ul className="list-disc list-inside">
        <li>Un archivo JSON de 1 MB (más de 10.000 nodos) analiza y renderiza en menos de 50 ms</li>
        <li>Un archivo JSON de 10 MB renderiza en menos de 200 ms</li>
        <li>La búsqueda en 10.000 nodos devuelve resultados mientras escribes, sin retraso visible</li>
        <li>El uso de memoria se mantiene por debajo de 50 MB incluso para archivos grandes</li>
      </ul>
      <p>
        Esta es la ventaja de la compilación nativa. El análisis JSON en Perry se compila a bucles nativos ajustados sin pausas de GC. El renderizado del árbol usa las vistas de lista virtualizadas propias de la plataforma (NSOutlineView, UITableView, RecyclerView), que están probadas en batalla para rendimiento.
      </p>

      <h2>Código fuente y descargas</h2>
      <p>Pry es open source. Puedes explorar el código fuente completo, compilarlo tú mismo, o simplemente mirar el código para entender cómo está estructurada una app de UI nativa de Perry.</p>
      <ul className="list-disc list-inside">
        <li><a href="https://github.com/perryts/pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">Repositorio GitHub</a>{" "} — código fuente completo e instrucciones de compilación</li>
        <li><Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Página del showcase</Link>{" "} — capturas de pantalla, lista de funcionalidades y detalles de plataforma</li>
      </ul>
      <p>
        Si estás construyendo algo con Perry, nos encantaría saberlo. Abre un issue en el{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">repositorio de Perry</a>{" "}
        o inicia una discusión. Estamos construyendo Perry de forma abierta y el feedback de usuarios reales construyendo apps reales es invaluable.
      </p>
    </>
  );
}
