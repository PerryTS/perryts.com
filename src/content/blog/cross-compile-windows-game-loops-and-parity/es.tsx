import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        103 commits al compilador de Perry esta semana. Las características principales: ahora puedes compilar cruzadamente ejecutables de Windows desde Linux, las apps de iOS pueden ejecutar game loops bloqueantes, el compilador reporta crashes para telemetría, y el compilador auto-hospedado pasa cada test determinístico que le lanzamos. Además, una actualización mayor de la infraestructura del Hub y más de 50 correcciones de errores.
      </p>

      <h2>Compilación cruzada a Windows desde Linux</h2>
      <p>
        Perry ahora puede producir binarios Windows <code className="text-amber-400">.exe</code> desde un host Linux. Esta es la pieza que faltaba para pipelines CI/CD que necesitan apuntar a Windows sin ejecutar una máquina de compilación Windows para toda la compilación.
      </p>
      <p>
        La implementación reemplaza las verificaciones <code className="text-amber-400">#[cfg]</code> en tiempo de compilación con detección de objetivo en tiempo de ejecución. Cuando el compilador detecta un objetivo Windows en un host no-Windows, localiza <code className="text-amber-400">lld-link</code>,{" "}
        <code className="text-amber-400">llvm-nm</code> y{" "}
        <code className="text-amber-400">llvm-ar</code> de la toolchain de Rust o el PATH mediante un nuevo helper <code className="text-amber-400">find_llvm_tool()</code>. Las bibliotecas del sistema Windows vienen de un sysroot estilo{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">xwin</a> apuntado por <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code>.
      </p>
      <p>
        El enlazador usa automáticamente <code className="text-amber-400">/FORCE:UNRESOLVED</code> y genera stubs para símbolos de UI faltantes, por lo que las apps CLI se compilan cruzadamente sin problemas. La salida por defecto es <code className="text-amber-400">.exe</code> al compilar para Windows. Los detalles completos están en la{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">documentación de compilación cruzada</a>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>Soporte de Game Loop para iOS</h2>
      <p>
        iOS requiere que UIKit sea dueño del hilo principal. Eso está bien para apps basadas en eventos, pero es un problema para juegos que necesitan un bucle <code className="text-amber-400">while (!shouldClose)</code> bloqueante. Perry ahora resuelve esto con el flag <code className="text-amber-400">--features ios-game-loop</code>.
      </p>
      <p>
        Cuando está habilitado, el compilador emite <code className="text-amber-400">_perry_user_main</code> en lugar de <code className="text-amber-400">main</code>. El runtime proporciona un <code className="text-amber-400">main()</code> que llama a <code className="text-amber-400">UIApplicationMain</code> en el hilo principal y lanza tu código en un hilo de fondo. El scene delegate y app delegate manejan el ciclo de vida completo de UIKit mientras tu game loop se ejecuta sin bloqueo.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Tu game loop se ejecuta en un hilo de fondo</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        Esto habilita toda una categoría de apps — juegos, simulaciones, visualizaciones en tiempo real — que no eran prácticas en iOS antes. Los caminos de pump y callback de iOS ahora también están envueltos en manejo de panic, por lo que los crashes tanto en el game loop como en el ciclo de vida UIKit se capturan limpiamente.
      </p>

      <h2>Reporte de crashes</h2>
      <p>
        Las apps compiladas con Perry ahora instalan un hook de panic y manejadores de señal para <code className="text-amber-400">SIGSEGV</code>, <code className="text-amber-400">SIGBUS</code> y <code className="text-amber-400">SIGABRT</code> al inicio. Cuando ocurre un crash fatal, los detalles se escriben en <code className="text-amber-400">~/.hone/crash.log</code> para el sistema de telemetría Chirp. Los panics capturados (en <code className="text-amber-400">catch_callback_panic</code>) limpian el log, por lo que solo se reportan crashes genuinamente irrecuperables.
      </p>
      <p>
        Esta es una característica de preparación para producción. Cuando algo sale mal en el campo, lo sabremos — y el log de crash incluye suficiente contexto para diagnosticar el problema sin requerir que los usuarios reporten nada manualmente.
      </p>

      <h2>Hub: Pipeline de compilación Windows en dos etapas</h2>
      <p>
        La infraestructura de compilación del Perry Hub recibió una actualización arquitectónica significativa. Anteriormente, compilar para Windows requería un worker Windows para toda la compilación. Ahora el pipeline se divide en dos etapas:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Un worker Linux compila cruzadamente el artefacto Windows usando el nuevo soporte lld-link</li>
        <li>El Hub retiene el artefacto precompilado y re-encola el trabajo para un worker Windows</li>
        <li>El worker Windows solo maneja la firma y el empaquetado — una tarea mucho más ligera</li>
      </ol>
      <p>
        Cuando un worker envía <code className="text-amber-400">complete</code> con <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code>, el Hub re-encola el trabajo de forma transparente. La CLI ve una experiencia de compilación única sin interrupciones.
      </p>
      <p>
        El Hub también ahora auto-inicia VMs Windows de Azure cuando no hay un worker Windows conectado, y los workers de compilación se auto-actualizan a la última versión de Perry en nuevas versiones. Menos gestión manual de infraestructura, compilaciones más rápidas.
      </p>

      <h2>Reescritura de documentación</h2>
      <p>
        Dos reescrituras mayores de documentación aterrizaron esta semana en{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Referencia de perry.toml</strong> — documentación completa de secciones cubriendo cada opción de configuración, resolución de bundle ID, resolución de archivo de entrada, auto-incremento de número de compilación y ejemplos de CI/CD</li>
        <li><strong>Referencia de Geisterhand</strong> — documentación completa de API, configuración de plataforma, patrones de automatización de pruebas y visión general de la arquitectura del framework de pruebas de UI multiplataforma</li>
      </ul>
      <p>
        Estas no son actualizaciones incrementales. Ambas son reescrituras desde cero que cubren cada característica y opción de configuración. Si estás configurando un nuevo proyecto o escribiendo pruebas, comienza aquí.
      </p>

      <h2>APIs de menú multiplataforma</h2>
      <p>
        <code className="text-amber-400">menuClear</code> y <code className="text-amber-400">menuAddStandardAction</code> eran anteriormente solo de macOS. Ahora funcionan en las 6 plataformas nativas. Esto también incluye una corrección para un panic de reentrancia <code className="text-amber-400">RefCell</code> en <code className="text-amber-400">dispatch_menu_item</code> en Windows.
      </p>

      <h3>Android: Alineación de página de 16 KB</h3>
      <p>
        Google Play ahora requiere alineación de página de 16 KB para bibliotecas nativas. Perry establece los <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code> apropiados automáticamente, y los archivos <code className="text-amber-400">.so</code> compañeros se copian junto a la salida para inclusión en APK/AAB.
      </p>

      <h2>Perry React: Tablero Kanban</h2>
      <p>
        La capa de compatibilidad React tuvo una prueba del mundo real: un tablero Kanban completo de 5 columnas con operaciones de mover, añadir, eliminar y ver. Construirlo descubrió y corrigió el renderizado de hijos de array anidados en JSX — el manejador recursivo <code className="text-amber-400">_appendChildren</code> ahora aplana correctamente los arrays retornados por llamadas <code className="text-amber-400">.map()</code>. También hay una nueva demo Kitchen Sink WorkBench de 14 secciones cubriendo varios patrones de UI.
      </p>

      <h2>Anvil: 100% de paridad de tests determinísticos</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — el compilador LLVM auto-hospedado escrito en TypeScript y compilado por Perry — ahora pasa <strong>68 de 68</strong> tests determinísticos, coincidiendo exactamente con la salida del compilador principal. Las únicas diferencias son inherentes (marcas de tiempo, <code className="text-amber-400">Math.random()</code>), y 11 tests se omiten porque requieren UI, temporizadores, criptografía o características específicas de plataforma aún no implementadas.
      </p>
      <p>
        Trabajo clave que lo logró:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Dispatch de métodos de interfaz</strong> — las variables tipadas como interfaz ahora retornan métodos correctos vía dispatch basado en class_id en ObjectHeader</li>
        <li><strong>Acceso dinámico a propiedades</strong> — dispatch en tiempo de ejecución para nombres de propiedades computados</li>
        <li><strong>Closures y vinculación de this</strong> — semántica de captura correcta para métodos de objetos</li>
        <li><strong>Fase 6 en progreso</strong> — async/await, generadores y correcciones de condiciones</li>
      </ul>
      <p>
        100% de paridad en tests determinísticos es un hito significativo. Significa que el binario <code className="text-amber-400">anvil</code> auto-compilado produce exactamente la misma salida que el compilador principal para cada escenario testeable. La brecha hacia el auto-hospedaje completo se estrecha.
      </p>

      <h2>Más de 50 correcciones de errores</h2>
      <p>
        Un gran impulso de corrección esta semana. Destacados:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — los arrays ya no se truncan a 16 elementos, la entrada inválida se maneja correctamente</li>
        <li><strong>Uint8Array</strong> — constructor desde variable de array, implementación de <code className="text-amber-400">.set(source, offset)</code> (era un no-op)</li>
        <li><strong>BigInt</strong> — NaN-boxing con <code className="text-amber-400">BIGINT_TAG</code> para llamadas entre módulos, correcciones de truncación keccak256 a 32 bits</li>
        <li><strong>Optional chaining</strong> — expresiones condicionales anidadas, detección de toString, NaN-boxing de valor de retorno</li>
        <li><strong>IndexSet</strong> — NaN-boxing de string corregido para usar <code className="text-amber-400">STRING_TAG</code> en lugar de <code className="text-amber-400">POINTER_TAG</code></li>
        <li><strong>MySQL</strong> — tipos DATETIME y BLOB, constructor <code className="text-amber-400">Date(string)</code></li>
        <li><strong>Math.min/max</strong> — manejo de argumentos spread</li>
        <li><strong>Dispatch de métodos nativos</strong> — field-scan-and-call para objetos <code className="text-amber-400">POINTER_TAG</code></li>
      </ul>
      <p>
        Estos no son casos extremos. JSON.parse truncando arrays a 16 elementos rompería cualquier aplicación real. Uint8Array.set siendo un no-op corrompería datos silenciosamente. Estas son las correcciones que hacen que el compilador sea apto para producción, un error de corrección a la vez.
      </p>

      <h2>En números</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 commits</strong> al compilador principal de Perry</li>
        <li><strong>3 versiones</strong>: v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 característica principal</strong>: compilación cruzada de Windows desde Linux</li>
        <li><strong>1 nueva categoría de apps</strong>: game loops de iOS</li>
        <li><strong>68/68</strong> paridad de tests determinísticos en perrysdad</li>
        <li><strong>Más de 50 correcciones</strong> en NaN-boxing, stdlib y FFI nativo</li>
        <li><strong>2 reescrituras de documentación</strong>: perry.toml y Geisterhand</li>
        <li><strong>5 mejoras del Hub</strong>: pipeline de dos etapas, auto-inicio de Azure, auto-actualización de workers</li>
      </ul>

      <h2>Qué viene después</h2>
      <p>
        La compilación cruzada de Windows abre la puerta a CI/CD multiplataforma completamente automatizado — enviar TypeScript, obtener binarios nativos para cada objetivo sin máquinas de compilación dedicadas para cada SO. El soporte de game loop desbloquea toda una nueva categoría de apps iOS. Y 100% de paridad de tests determinísticos en perrysdad significa que el auto-hospedaje se está volviendo muy real. Lo que queda:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Soporte completo de regex</strong> — la última gran brecha del lenguaje</li>
        <li><strong>Expansión de perry/ui</strong> — arrastrar y soltar, etiquetas de accesibilidad, DatePicker</li>
        <li><strong>perrysdad Fase 6</strong> — async/await, generadores, expandiendo hacia paridad completa con Perry</li>
        <li><strong>Beta pública del Hub</strong> — abrir compilaciones distribuidas a usuarios externos</li>
      </ul>
      <p>
        Sigue el progreso en{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, lee la documentación en{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">hoja de ruta</Link>
        {" "}para el panorama completo.
      </p>
    </>
  );
}
