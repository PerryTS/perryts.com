import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Cuando lanzamos la primera versión del sistema de UI nativo de Perry, &quot;multiplataforma&quot; significaba que macOS funcionaba bien y las otras cinco plataformas eran stubs. Hoy, con v0.2.162, eso ya no es así. Las seis plataformas — macOS, iOS, iPadOS, Android, Linux y Windows — comparten ahora paridad completa de funcionalidades. El mismo código TypeScript compila a widgets nativos en cada objetivo.
      </p>
      <p>
        Este artículo recorre lo que lanzamos entre v0.2.152 y v0.2.164: un widget Canvas, una implementación completa de NSTableView, más de 20 widgets de UI en total, el módulo{" "}
        <code className="text-amber-400">perry/system</code>, soporte multi-ventana, notificaciones del sistema, acceso al llavero, reducción automática del tamaño del binario y un sistema de plugins en tiempo de compilación. Pasaron muchas cosas.
      </p>

      <h2>El sprint de widgets: Más de 20 componentes de UI nativos</h2>
      <p>
        El mayor salto individual llegó con v0.2.155, que introdujo más de 20 widgets de UI en todas las plataformas. La API de UI TypeScript de Perry ahora cubre los componentes que realmente necesitas para lanzar una app real:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Layout</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>Entrada</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>Visualización</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>Datos</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>Overlay</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>Dibujo</strong> — Canvas (API de dibujo 2D, acelerado por hardware por plataforma)</li>
      </ul>
      <p>
        Estos no son wrappers alrededor de un renderizador personalizado. Cada widget compila al componente nativo propio de la plataforma: <code className="text-amber-400">NSButton</code> en macOS,{" "}
        <code className="text-amber-400">UIButton</code> en iOS,{" "}
        <code className="text-amber-400">GtkButton</code> en Linux,{" "}
        <code className="text-amber-400">android.widget.Button</code> en Android vía JNI, y{" "}
        <code className="text-amber-400">CreateWindowEx</code> en Windows. El SO los dibuja, les aplica tema y maneja la accesibilidad — Perry solo conecta la API TypeScript.
      </p>

      <h2>Canvas: Dibujo 2D desde TypeScript</h2>
      <p>
        Una de las adiciones técnicamente más interesantes es el widget Canvas (v0.2.152). Expone una API de dibujo 2D familiar directamente desde TypeScript — curvas de Bézier, rellenos, trazos, transferencia de imágenes — y compila al backend 2D acelerado de la plataforma: Core Graphics en macOS/iOS, Cairo en Linux, Direct2D en Windows y Skia en Android.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compila a Core Graphics en macOS, Cairo en Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Widget Table: NSTableView llega a TypeScript</h2>
      <p>
        v0.2.163 trajo el widget Table — el componente más complejo de la biblioteca. En macOS se mapea a <code className="text-amber-400">NSTableView</code> con toda la conexión delegate/data source. En Linux usa <code className="text-amber-400">GtkTreeView</code> de GTK4. En Windows, el control <code className="text-amber-400">ListView</code> de Win32. En Android se vincula a{" "}
        <code className="text-amber-400">RecyclerView</code> a través de JNI.
      </p>
      <p>
        La API TypeScript es declarativa: defines columnas, proporcionas una fuente de datos, y Perry maneja la conexión específica de la plataforma en tiempo de compilación. La ordenación de columnas, el manejo de selección y la personalización de altura de fila funcionan directamente.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// Array de objetos TypeScript</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>El módulo perry/system</h2>
      <p>
        v0.2.155 también introdujo <code className="text-amber-400">perry/system</code> — un módulo TypeScript que expone APIs del sistema de la plataforma sin ningún runtime: diálogos de archivos, diálogos de guardado, alertas, sheets, acceso al llavero, notificaciones del sistema y gestión multi-ventana.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — selector de archivos nativo (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — diálogo de guardado nativo</li>
        <li><code className="text-amber-400">system.showAlert()</code> — panel de alerta nativo</li>
        <li><code className="text-amber-400">system.notify()</code> — notificación del SO (UserNotifications / libnotify / WinRT)</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — gestión multi-ventana</li>
      </ul>
      <p>
        Todos estos llaman a APIs nativas de la plataforma directamente — sin IPC de Electron, sin puente de vista web. Perry compila el punto de llamada TypeScript a una llamada de función nativa directa al SDK de la plataforma.
      </p>

      <h2>Paridad de funcionalidades en seis plataformas: v0.2.162</h2>
      <p>
        El hito v0.2.162 trató de cerrar brechas. Antes de esta versión, macOS tenía el conjunto de funcionalidades más completo, iOS estaba casi listo, y Linux/Windows/Android iban rezagados. v0.2.162 llevó las seis plataformas al mismo nivel:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, conjunto completo de widgets, Keychain, notificaciones, multi-ventana, toolbar</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, paridad completa de widgets con macOS, ciclo de vida de scene</li>
        <li><strong>Android</strong> — puente JNI, todos los widgets vía Android Views, compilación cruzada NDK</li>
        <li><strong>Linux</strong> — GTK4, conjunto completo de widgets incluyendo Table, diálogos de archivo, llavero libsecret</li>
        <li><strong>Windows</strong> — Win32, todos los widgets, Windows Credential Store, notificaciones WinRT</li>
      </ul>
      <p>
        Este es el hito que hace &quot;una base de código, seis plataformas&quot; real en lugar de aspiracional. El mismo archivo TypeScript compila a apps nativas en los seis objetivos sin necesidad de rutas de código específicas de plataforma para los casos de uso comunes.
      </p>

      <h2>Reducción automática del tamaño del binario</h2>
      <p>
        v0.2.153 introdujo la reducción automática del tamaño del binario — el compilador ahora elimina agresivamente las rutas de código no utilizadas, elimina funciones stdlib inalcanzables y deduplica definiciones de símbolos durante el enlace. Una herramienta CLI típica que previamente compilaba a ~4 MB ahora queda por debajo de 2 MB sin cambios en tu código fuente.
      </p>
      <p>
        Esto importa para despliegues reales. Cuando tu binario es la unidad de despliegue — copiado a un servidor, distribuido como un solo archivo, embebido en un contenedor — el tamaño afecta directamente al tiempo de transferencia y al coste de almacenamiento. Reducir el tamaño del binario a la mitad sin coste es una mejora significativa.
      </p>

      <h2>El sistema de plugins en tiempo de compilación</h2>
      <p>
        v0.2.152 introdujo el sistema de plugins de Perry — y es arquitectónicamente diferente a cualquier otro sistema de plugins en el ecosistema TypeScript. No hay carga de plugins en tiempo de ejecución, no hay IPC, no hay <code className="text-amber-400">require()</code> dinámico. Los plugins son módulos TypeScript que Perry resuelve y compila en tiempo de compilación.
      </p>
      <p>
        El resultado: los plugins tienen exactamente cero sobrecarga en tiempo de ejecución. Se compilan en el mismo binario que el código de tu aplicación, con llamadas a funciones directas entre el código del plugin y el código del host. Si no usas un plugin, no aparece en tu binario. Si lo usas, se inlinea como cualquier otro módulo.
      </p>
      <p>
        Escribimos sobre la filosofía detrás de esto en{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          Los sistemas de plugins son un impuesto al rendimiento
        </Link>. La versión corta: las arquitecturas de plugins en tiempo de ejecución sacrifican rendimiento por extensibilidad. La composición en tiempo de compilación te da ambas cosas.
      </p>

      <h2>Mejoras del lenguaje</h2>
      <p>
        El sprint de UI no ocurrió de forma aislada — el compilador en sí siguió siendo cada vez más capaz. A lo largo de estas versiones:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Expresiones de clase</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> ahora compila correctamente</li>
        <li><strong>Transformaciones de generadores</strong> — <code className="text-amber-400">function*</code> y <code className="text-amber-400">yield</code> compilan a máquinas de estado nativas</li>
        <li><strong>Map/Set como campos de clase</strong> — <code className="text-amber-400">private items = new Map()</code> funciona en codegen</li>
        <li><strong>Coerción de tipos de parámetros FFI</strong> — las llamadas a bibliotecas nativas manejan la coerción de tipos automáticamente</li>
        <li><strong>Referencias a métodos vinculados</strong> — las referencias <code className="text-amber-400">this.method</code> funcionan para módulos nativos (fs, os, path)</li>
        <li><code className="text-amber-400">string.match()</code> — ahora completamente soportado</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>, <code className="text-amber-400">path.join()</code> multi-argumento, <code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Objetivo web</strong> — Perry ahora puede compilar a una salida compatible con web para despliegues híbridos</li>
      </ul>

      <h2>Qué viene después</h2>
      <p>
        Con la paridad de UI en seis plataformas lanzada, la siguiente fase es profundidad sobre amplitud. Estamos trabajando en:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Soporte completo de RegExp (<code className="text-amber-400">regex.test()</code>, <code className="text-amber-400">string.matchAll()</code>)</li>
        <li>Arrastrar y soltar, menús contextuales personalizados y etiquetas de accesibilidad en el sistema de widgets</li>
        <li>Una extensión de VS Code para diagnósticos de Perry y compilación al guardar</li>
        <li>Integración con gestor de paquetes — instalar y compilar paquetes nativos de Perry con un solo comando</li>
        <li>Objetivo de compilación WASM para despliegue en navegador</li>
        <li>Multi-threading vía threads <code className="text-amber-400">Worker</code></li>
      </ul>
      <p>
        Si quieres seguir el desarrollo, el{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          repositorio de Perry
        </a>{" "}
        es abierto. Echa un vistazo al{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">showcase</Link>
        {" "}para ver qué se está construyendo, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">hoja de ruta</Link>
        {" "}para el panorama completo.
      </p>
    </>
  );
}
