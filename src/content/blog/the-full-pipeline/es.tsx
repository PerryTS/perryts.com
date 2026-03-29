import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        82 commits en siete días. Un sitio de documentación con 49 páginas. Publicación automatizada en App Store y Play Store. Paquetes Homebrew y APT. Extensiones nativas de WidgetKit compiladas desde TypeScript. Un compilador LLVM auto-hospedado. Y docenas de correcciones de errores en cada plataforma.
      </p>
      <p>
        Este artículo cubre todo lo que se lanzó en Perry entre el 6 y el 13 de marzo de 2026. El tema es completitud — rellenar los huecos entre &quot;escribí algo de TypeScript&quot; y &quot;mi app está en el App Store.&quot;
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perry ahora tiene un sitio de documentación real. 49 páginas construidas con mdBook, cubriendo todo desde los primeros pasos hasta la referencia CLI. Los docs están organizados en secciones:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Primeros pasos</strong> — instalación, primer proyecto, estructura del proyecto</li>
        <li><strong>Características del lenguaje</strong> — todo lo que Perry soporta de TypeScript</li>
        <li><strong>UI nativa</strong> — 12 páginas cubriendo todos los tipos de widgets, layout, gestión de estado y comportamiento específico de plataforma</li>
        <li><strong>Plataformas</strong> — páginas dedicadas para cada una de las 6 plataformas objetivo</li>
        <li><strong>Biblioteca estándar</strong> — más de 50 implementaciones de paquetes nativos documentadas</li>
        <li><strong>APIs del sistema</strong> — diálogos de archivos, llavero, notificaciones, multi-ventana</li>
        <li><strong>WidgetKit</strong> — el nuevo módulo de extensiones de widgets</li>
        <li><strong>Plugins</strong> — arquitectura de plugins en tiempo de compilación</li>
        <li><strong>Referencia CLI</strong> — cada comando y flag</li>
      </ul>
      <p>
        El sitio también incluye un archivo <code className="text-amber-400">llms.txt</code> para descubribilidad por IA, y está desplegado vía GitHub Pages con un dominio personalizado en{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>.
      </p>

      <h2>Instalar Perry en un comando</h2>
      <p>
        Perry ahora se distribuye a través de Homebrew y APT, además de compilar desde el código fuente. Un nuevo pipeline de release de GitHub Actions compila binarios para macOS (arm64 y x86_64) y Linux (x86_64 y arm64), y luego actualiza automáticamente el tap de Homebrew y el repositorio APT.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        Se acabó clonar el repo y compilar con Cargo. Instala Perry de la misma manera que instalas cualquier otra herramienta.
      </p>

      <h2>Publicación automatizada en el App Store</h2>
      <p>
        Este es el cambio que colapsa más pasos manuales. Ejecutar{" "}
        <code className="text-amber-400">perry publish ios</code> ahora maneja automáticamente todo el pipeline de distribución iOS:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Genera una clave RSA y CSR vía la API de App Store Connect</li>
        <li>Crea un certificado de distribución y lo empaqueta en un <code className="text-amber-400">.p12</code></li>
        <li>Registra el bundle ID</li>
        <li>Crea y descarga un perfil de aprovisionamiento</li>
        <li>Crea el registro de la app en App Store Connect</li>
        <li>Compila, firma y sube a TestFlight o al App Store</li>
      </ol>
      <p>
        Sin Xcode. Sin visitas manuales al portal. Sin descargar certificados desde un navegador. El asistente de configuración se ejecuta automáticamente la primera vez que publicas, guiándote a través de la configuración de la clave API y almacenando credenciales en <code className="text-amber-400">perry.toml</code>.
      </p>
      <p>
        La distribución de macOS está igualmente automatizada. Perry soporta tres modos: TestFlight, DMG notarizado y un nuevo modo <strong>&quot;both&quot;</strong> que publica en el App Store y crea un DMG notarizado simultáneamente. Se auto-generan tres tipos de certificados: <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>, <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code> y <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>.
      </p>
      <p>
        La publicación de Android también ganó un asistente de configuración con activación automática. Las tres plataformas ahora siguen el mismo patrón: la primera ejecución activa la configuración, las credenciales se guardan en el proyecto, las ejecuciones posteriores son sin configuración.
      </p>
      <p>
        La validación pre-vuelo detecta problemas antes de que comience la compilación — desajuste de bundle ID del perfil de aprovisionamiento, expiración de certificados, ícono de app faltante, formato de versión inválido, ID de equipo incorrecto. Y <code className="text-amber-400">encryption_exempt</code> en <code className="text-amber-400">perry.toml [ios]</code> auto-establece la clave <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> del Info.plist, saltando la solicitud manual de cumplimiento de exportación en App Store Connect.
      </p>

      <h2>perry/widget: WidgetKit desde TypeScript</h2>
      <p>
        Perry ahora puede compilar TypeScript a extensiones nativas de SwiftUI WidgetKit. Esto no es un wrapper ni un bridge — el compilador recorre el árbol de renderizado a nivel HIR y emite código fuente SwiftUI directamente. La salida es un bundle completo de extensión WidgetKit que Xcode (o el pipeline de compilación de Perry) puede embeber en tu app.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        El enfoque es fundamentalmente diferente al resto de la compilación de Perry. El código normal de Perry pasa por Cranelift a código máquina nativo. El código de widget pasa por la HIR a texto de salida SwiftUI, porque WidgetKit requiere SwiftUI — no hay forma de construir una extensión de widget con código imperativo UIKit o AppKit. Perry resuelve esto tratando el árbol de renderizado del widget como una plantilla en tiempo de compilación, no como código en tiempo de ejecución.
      </p>

      <h2>Nuevos widgets y mejoras de plataforma</h2>
      <p>
        Cuatro nuevos tipos de widget aterrizaron esta semana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — edición de texto multilínea en macOS, iOS y Android</li>
        <li><strong>SecureField</strong> — entrada de contraseña en iOS y macOS</li>
        <li><strong>QR Code</strong> — generación nativa de códigos QR en iOS, macOS y Android</li>
        <li><strong>Splash Screen</strong> — storyboards de LaunchScreen auto-generados (iOS) y temas splash (Android)</li>
      </ul>

      <h3>iPad se vuelve nativo</h3>
      <p>
        Perry ahora genera apps completamente nativas para iPad: <code className="text-amber-400">UIDeviceFamily [1,2]</code>, soporte de orientación, <code className="text-amber-400">UIRequiresFullScreen</code> y un storyboard LaunchScreen compilado vía ibtool. Una nueva función <code className="text-amber-400">getDeviceIdiom()</code> detecta teléfono vs. iPad en tiempo de ejecución, y <code className="text-amber-400">PerryFrameSplit</code> proporciona contenedores de división horizontal basados en frames para layouts de iPad.
      </p>

      <h3>Windows</h3>
      <p>
        Windows obtuvo soporte de temporizadores (tick de 50ms <code className="text-amber-400">WM_TIMER</code>), botones owner-drawn con fondos de tema oscuro y correcciones para un bug use-after-free en <code className="text-amber-400">to_wide().as_ptr()</code> en 18 archivos de widgets. El runtime V8 ahora funciona en Windows con las bibliotecas del sistema requeridas enlazadas.
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        El backend GTK4 recibió pulido visual para coincidir con macOS: CSS padding para edge insets, estilo de botones Adwaita, correcciones de márgenes de VStack y política horizontal de ScrollView.
      </p>

      <h2>http/https y better-sqlite3</h2>
      <p>
        Dos adiciones significativas a la stdlib:
      </p>
      <p>
        Los nuevos módulos nativos <code className="text-amber-400">http</code> y <code className="text-amber-400">https</code> proporcionan HTTP del lado del cliente usando reqwest internamente. La API coincide con Node.js: <code className="text-amber-400">request()</code>, <code className="text-amber-400">get()</code>, <code className="text-amber-400">ClientRequest</code> con write/end/on e <code className="text-amber-400">IncomingMessage</code> con statusCode y manejadores de eventos.
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> ahora está completamente soportado: <code className="text-amber-400">new Database()</code>, <code className="text-amber-400">prepare</code>, <code className="text-amber-400">exec</code>, <code className="text-amber-400">run</code>, <code className="text-amber-400">get</code>, <code className="text-amber-400">all</code> — con NaN-boxing correcto y objetos de fila con acceso a propiedades con nombre.
      </p>
      <p>
        Otras mejoras de la stdlib: <code className="text-amber-400">crypto.randomBytes()</code> ahora devuelve un Buffer (coincidiendo con Node.js), MongoDB ganó <code className="text-amber-400">listDatabases</code> y <code className="text-amber-400">listCollections</code> con correcciones de thread-safety, y mysql2 INSERT/UPDATE/DELETE ahora devuelve <code className="text-amber-400">ResultSetHeader</code> con <code className="text-amber-400">insertId</code>.
      </p>

      <h2>Correcciones de GC y corrección</h2>
      <p>
        Varias correcciones críticas del recolector de basura y de corrección del runtime se lanzaron esta semana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Guard de reentrancia del GC</strong> — previene la recolección durante la asignación, corrigiendo panics de double-borrow de RefCell</li>
        <li><strong>Trazado de Map del GC</strong> — los Maps ahora se trazan correctamente durante la fase de marcado, previniendo la recolección de claves string</li>
        <li><strong>Corrección de aliasing de strings</strong> — el append de strings ahora siempre asigna strings frescos, corrigiendo corrupción por aliasing de copia de punteros</li>
        <li><strong>Aritmética BigInt</strong> — right-shift usa shift aritmético para números negativos, las ops bit a bit usan semántica de wrapping ToInt32</li>
        <li><strong>Map.get() undefined</strong> — devuelve el <code className="text-amber-400">TAG_UNDEFINED</code> correcto para claves faltantes en lugar de un tag NaN incorrecto</li>
        <li><strong>Raíces GC de campos estáticos</strong> — valores BigInt en campos estáticos de clases registrados como raíces GC</li>
      </ul>
      <p>
        Estos no son menores. La corrección de reentrancia del GC por sí sola resolvió toda una clase de crashes intermitentes. La corrección de aliasing de strings afectaba a cualquier programa que asignaba una variable string a otra y luego mutaba cualquiera de las dos. Estos son el tipo de bugs que solo aparecen bajo cargas de trabajo reales, y corregirlos es lo que hace que el compilador sea apto para producción.
      </p>

      <h2>perry-verify: Endurecido</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>, el servicio de verificación automatizada de apps, recibió un pase de endurecimiento de seguridad: ejecución en sandbox vía <code className="text-amber-400">bwrap</code> en Linux y <code className="text-amber-400">sandbox-exec</code> en macOS, tokens de autenticación en el handshake WebSocket y descarga de binarios, limitación de tasa por IP, IDs de trabajo UUID completos para prevenir enumeración y límites de cuerpo reducidos.
      </p>

      <h2>perrysdad: El compilador auto-hospedado</h2>
      <p>
        En un esfuerzo paralelo, <code className="text-amber-400">perrysdad</code> — un compilador LLVM IR auto-hospedado escrito en TypeScript — pasó de cero a auto-compilación en cinco fases durante la semana:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>Fase 0-1</strong> — esqueleto end-to-end: HIR a texto LLVM IR a clang, enlazado contra <code className="text-amber-400">libperry_runtime.a</code> de Perry</li>
        <li><strong>Fase 2</strong> — parser de descenso recursivo hecho a mano con parsing de expresiones Pratt para archivos <code className="text-amber-400">.ts</code> reales</li>
        <li><strong>Fase 3</strong> — arrays, objetos y maps con FFI de runtime, más corrección de un desajuste ABI crítico (JSValue declarado como double en LLVM IR en lugar de i64)</li>
        <li><strong>Fase 4</strong> — clases, enums, closures, compilación multi-archivo con descubrimiento de módulos y ordenamiento topológico</li>
      </ol>
      <p>
        El hito: el binario <code className="text-amber-400">anvil</code> auto-compilado ahora puede compilar programas de prueba y producir salida correcta que coincide con la versión compilada por node. Un compilador TypeScript, compilado por Perry a código nativo, compilando más TypeScript a código nativo. Tortugas hasta el fondo.
      </p>

      <h2>En números</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 commits</strong> al compilador principal de Perry</li>
        <li><strong>1 release</strong>: v0.2.173 (8 de marzo)</li>
        <li><strong>49 páginas de documentación</strong> en docs.perryts.com</li>
        <li><strong>4 nuevos widgets</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 canales de distribución</strong>: Homebrew, APT, código fuente</li>
        <li><strong>3 pipelines de tienda automatizados</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>Las 6 plataformas</strong> recibieron mejoras esta semana</li>
      </ul>

      <h2>Qué viene después</h2>
      <p>
        El pipeline se está completando. Puedes escribir TypeScript, compilar a seis plataformas, distribuir vía Homebrew o APT, publicar en el App Store y Play Store, añadir widgets de pantalla de inicio y leer documentación completa — todo sin salir de la toolchain de Perry. Lo que queda:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Soporte completo de regex</strong> — la última gran brecha del lenguaje</li>
        <li><strong>Expansión de perry/ui</strong> — arrastrar y soltar, etiquetas de accesibilidad, DatePicker</li>
        <li><strong>Maduración de perrysdad</strong> — expandir el compilador auto-hospedado hacia paridad completa con Perry</li>
        <li><strong>Beta pública del Hub</strong> — abrir compilaciones distribuidas a usuarios externos</li>
      </ul>
      <p>
        Sigue el progreso en{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, lee la nueva documentación en{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">hoja de ruta</Link>
        {" "}para el panorama completo.
      </p>
    </>
  );
}
