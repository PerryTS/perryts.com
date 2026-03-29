import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Nos emociona presentar Perry — un compilador nativo de TypeScript escrito en Rust que compila tu TypeScript directamente a ejecutables independientes. Sin runtime de Node.js, sin wrapper de Electron, sin compromisos. Solo tu código, compilado a un binario nativo que arranca instantáneamente y se ejecuta en cualquier lugar.
      </p>
      <p>
        Perry representa un replanteamiento fundamental de lo que TypeScript puede ser. En lugar de tratarlo como un superconjunto de JavaScript que debe ejecutarse a través de un motor JS, Perry trata TypeScript como un lenguaje de sistemas — uno que resulta tener una sintaxis que millones de desarrolladores ya conocen y aman.
      </p>

      <h2>Por qué construimos Perry</h2>
      <p>
        TypeScript se ha convertido en la lingua franca del desarrollo de software moderno. Es el lenguaje detrás de la mayoría de los frontends web, una cuota creciente de backends, y cada vez más la elección para herramientas, scripting y automatización. Pero siempre ha llevado una limitación fundamental: compila a JavaScript, y JavaScript requiere un runtime.
      </p>
      <p>
        Ese runtime — ya sea Node.js, Deno o Bun — viene con compromisos. Tiempos de arranque en frío medidos en decenas o cientos de milisegundos. Sobrecarga de memoria del compilador JIT y el recolector de basura. Distribuciones binarias que o empaquetan todo el runtime o requieren que el usuario instale uno. Y para aplicaciones GUI, la única opción ha sido Electron, que incluye un navegador Chromium completo con tu app.
      </p>
      <p>
        Nos preguntamos: ¿y si TypeScript no tuviera que pasar por JavaScript en absoluto? ¿Y si pudieras compilarlo directamente a código máquina nativo, de la misma manera que compilas Rust, Go o C++?
      </p>

      <h2>Cómo funciona Perry</h2>
      <p>
        La pipeline de compilación de Perry tiene tres etapas:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Análisis sintáctico</strong> — Perry usa SWC (el parser de TypeScript/JavaScript basado en Rust) para analizar tu código fuente TypeScript en un AST. SWC es el mismo parser usado por Next.js, y es extremadamente rápido.
        </li>
        <li>
          <strong>Compilación dirigida por tipos</strong> — Perry recorre el AST con información completa de tipos. A diferencia de un motor JS que debe manejar tipos dinámicos en tiempo de ejecución, Perry conoce cada tipo en tiempo de compilación. Esto permite la monomorfización de genéricos, el dispatch estático de llamadas a métodos y la optimización directa del diseño de memoria.
        </li>
        <li>
          <strong>Generación de código</strong> — Perry genera código máquina nativo usando Cranelift, el mismo generador de código usado por Wasmtime y partes del JIT de Firefox. Cranelift produce código nativo eficiente para x86_64 y ARM64.
        </li>
      </ol>
      <p>
        El resultado es un ejecutable independiente — típicamente 2–5 MB para una herramienta CLI — que arranca instantáneamente sin tiempo de calentamiento.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>Qué características de TypeScript están soportadas</h2>
      <p>
        Perry soporta un subconjunto amplio y creciente de TypeScript. El objetivo es compatibilidad completa con el lenguaje tal como los desarrolladores lo usan realmente. Hoy, eso incluye:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Todos los tipos primitivos</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interfaces y type aliases</strong> — incluyendo tipos unión, tipos intersección y mapped types</li>
        <li><strong>Genéricos</strong> — compilados vía monomorfización, así que <code className="text-perry-400">Array&lt;number&gt;</code> y <code className="text-perry-400">Array&lt;string&gt;</code> generan caminos de código optimizados distintos</li>
        <li><strong>Clases</strong> — con herencia, campos privados (<code className="text-perry-400">#field</code>), miembros estáticos, getters/setters y decoradores</li>
        <li><strong>Async/await y Promises</strong> — compilados a una máquina de estados, similar a cómo Rust maneja async</li>
        <li><strong>Generadores e iteradores</strong> — <code className="text-perry-400">function*</code> y bucles <code className="text-perry-400">for...of</code></li>
        <li><strong>Closures</strong> — con semántica de captura correcta</li>
        <li><strong>Destructuring</strong> — arrays, objetos, patrones anidados y elementos rest</li>
        <li><strong>Template literals</strong> — incluyendo tagged templates</li>
        <li><strong>Módulos</strong> — imports/exports ESM resueltos en tiempo de compilación</li>
      </ul>

      <h2>UI nativa multiplataforma</h2>
      <p>
        Perry no se limita a herramientas CLI y aplicaciones del lado del servidor. Incluye frameworks de UI nativos para seis plataformas:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField y más)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (misma API que iOS, con adaptaciones específicas para iPad)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, controles comunes, GDI)</li>
      </ul>
      <p>
        La idea clave es que Perry mapea una API TypeScript común al toolkit de widgets nativo de cada plataforma en tiempo de compilación. No hay capa de bridge, no hay vista web y no hay motor de renderizado personalizado. Tu app usa widgets reales de la plataforma, renderizados por el propio SO. Lee más en nuestro análisis profundo:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          UI nativa multiplataforma desde TypeScript
        </Link>.
      </p>

      <h2>Más de 27 implementaciones nativas de paquetes npm</h2>
      <p>
        Uno de los mayores desafíos prácticos de un nuevo compilador es la compatibilidad con el ecosistema. Los desarrolladores no solo escriben código desde cero — usan paquetes. Perry aborda esto con implementaciones nativas de más de 27 paquetes npm populares:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Bases de datos</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Seguridad</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Utilidades</strong> — uuid, chalk, dotenv, lodash (parcial), moment</li>
        <li><strong>Sistema</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Estos no son wrappers delgados alrededor de módulos Node.js. Se compilan directamente en tu binario usando bibliotecas nativas del sistema — libpq para PostgreSQL, OpenSSL para criptografía, libcurl para HTTP. La superficie de API coincide con lo que esperarías del paquete npm, por lo que la migración es directa.
      </p>

      <h2>Capa de compatibilidad V8 opcional</h2>
      <p>
        Para paquetes npm que aún no tienen implementaciones nativas de Perry, Perry ofrece un modo de incrustación V8 opcional. Cuando está habilitado, Perry empaqueta un runtime V8 y puede ejecutar paquetes npm JavaScript estándar junto a tu TypeScript compilado. Esta es una válvula de escape pragmática que te permite adoptar Perry incrementalmente — compila los caminos calientes a código nativo mientras sigues accediendo al ecosistema npm completo para todo lo demás.
      </p>

      <h2>Compilación cruzada</h2>
      <p>
        Perry soporta compilación cruzada de fábrica. Desde tu máquina de desarrollo macOS, puedes compilar para Linux (x86_64 y ARM64) e iOS. Esto significa que puedes construir tu pipeline CI/CD en macOS y producir binarios para todos tus objetivos de despliegue sin necesitar máquinas de compilación dedicadas para cada plataforma.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Compilar para Linux desde macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Compilar para iOS desde macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Rendimiento</h2>
      <p>
        Los binarios compilados con Perry son rápidos. Como no hay calentamiento JIT, no hay sobrecarga de intérprete y no hay pausas del recolector de basura, el rendimiento es predecible y consistente desde la primera invocación.
      </p>
      <p>
        En nuestros benchmarks:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tiempo de arranque</strong> — efectivamente 0 ms (lanzamiento de proceso nativo)</li>
        <li><strong>Tamaño del binario</strong> — 2–5 MB para herramientas CLI típicas (vs 50+ MB para Node.js empaquetado)</li>
        <li><strong>Uso de memoria</strong> — 5–10x menor que aplicaciones Node.js equivalentes</li>
        <li><strong>Throughput</strong> — competitivo con C escrito a mano para cargas de trabajo de cómputo intensivo</li>
      </ul>
      <p>
        Puedes ver benchmarks en vivo en{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, que compara ejecutables compilados con Perry contra Node.js y Bun en tiempo real.
      </p>

      <h2>Estado actual</h2>
      <p>
        Perry está en desarrollo activo. El compilador es estable con 62 de 62 tests pasando en la suite de pruebas. Los seis backends de UI de plataforma son funcionales. Las características principales del lenguaje son sólidas y se están expandiendo.
      </p>
      <p>
        Estamos trabajando activamente en expandir la biblioteca de widgets de UI, mejorar el rendimiento de strings y objetos, completar el soporte completo de regex y construir el módulo Stream. A más largo plazo, planeamos objetivos de compilación WASM, multi-threading, una extensión de VS Code e integración con gestores de paquetes.
      </p>
      <p>
        Consulta la <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">hoja de ruta</Link> completa para detalles sobre lo que se ha lanzado, lo que está en progreso y lo que viene después.
      </p>

      <h2>Comenzar</h2>
      <p>
        Perry es open source. Puedes clonar el repositorio, compilar desde el código fuente y empezar a compilar TypeScript hoy:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compila tu primer archivo TypeScript</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Explora el código fuente en{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , echa un vistazo al{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">showcase</Link>
        {" "}para ver qué se está construyendo con Perry, o sumérgete directamente en el código. No podemos esperar a ver qué construyes.
      </p>
    </>
  );
}
