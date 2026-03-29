import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Cinco días, 120 commits, y Perry salta de v0.4.0 a v0.4.24. Lo destacado: tvOS se convierte en el 10.º objetivo de compilación, las apps de iOS y macOS ahora pueden construirse completamente desde Linux, perry login trae facturación basada en uso, y la UI de Windows recibe una renovación completa. Aquí está todo lo que se lanzó.
      </p>

      <h2>tvOS: El 10.º objetivo de compilación</h2>
      <p>
        Perry ahora compila para Apple TV. El objetivo tvOS usa el mismo renderizador SwiftUI que watchOS, compartiendo la arquitectura basada en datos donde Perry construye un árbol de UI y una app host Swift incluida lo renderiza de forma nativa. Combinado con la integración WASM existente de <code>@perry/threads</code>, las apps de tvOS pueden ejecutar cargas de trabajo pesadas en segundo plano mientras mantienen la interfaz de usuario receptiva.
      </p>
      <pre><code>{`# Compilar para Apple TV
perry compile main.ts --target tvos

# Ejecutar en el simulador de tvOS
perry run tvos`}</code></pre>
      <p>
        Esto eleva el recuento total de objetivos a <strong>10</strong>: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly y Web/JavaScript. Una base de código TypeScript, diez salidas nativas.
      </p>

      <h2>Compilación cruzada de iOS y macOS desde Linux</h2>
      <p>
        Perry ahora puede construir binarios de iOS y macOS completamente desde una máquina Linux usando <code>ld64.lld</code> como enlazador Mach-O. Esta es la pieza que faltaba para CI/CD completamente automatizado — enviar TypeScript a un servidor Linux y obtener binarios nativos firmados para cada plataforma Apple sin una máquina de compilación macOS.
      </p>
      <p>
        Llegar aquí requirió resolver una cascada de problemas del enlazador:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Triple de codegen Mach-O</strong> — se añadieron los triples de destino <code>aarch64-apple-macos</code> y <code>aarch64-apple-ios</code> para Cranelift</li>
        <li><strong>Enlace de frameworks</strong> — rutas de búsqueda de frameworks CoreGraphics, Metal, IOKit, DiskArbitration para compilación cruzada</li>
        <li><strong><code>-lobjc</code></strong> — símbolos del runtime ObjC necesarios para todos los objetivos Apple</li>
        <li><strong>Versión del SDK</strong> — <code>sdk_version 26.0</code> en ld64.lld (Apple requiere iOS 18+)</li>
        <li><strong>Dead stripping</strong> — <code>-dead_strip</code> en lugar de <code>-Wl,-dead_strip</code> para el enlazador Mach-O</li>
        <li><strong>Deduplicación del runtime</strong> — eliminar <code>perry_runtime</code> duplicado de las bibliotecas estáticas de UI para evitar errores de enlace</li>
      </ul>
      <p>
        Combinado con la compilación cruzada existente de Linux → Windows (v0.2.195+), Perry ahora puede compilar cruzadamente a <strong>todas las plataformas desde Linux</strong> — iOS, macOS, Windows, Android, WASM y Web.
      </p>

      <h2>Preparación para el App Store de iOS</h2>
      <p>
        Un enfoque principal de este ciclo fue hacer que las apps iOS compiladas con Perry sean totalmente compatibles con el App Store:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Info.plist completo</strong> — todas las claves requeridas por Apple: <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — nomenclatura estándar de iconos iOS (<code>AppIcon60x60@2x</code>, etc.) con resolución de respaldo</li>
        <li><strong>Versión desde perry.toml</strong> — los campos <code>version</code> y <code>build_number</code> fluyen directamente a la Info.plist</li>
        <li><strong>UILaunchScreen</strong> — usa la clave moderna en lugar de <code>UILaunchStoryboardName</code> (no necesita archivo de storyboard)</li>
        <li><strong>Perfiles de aprovisionamiento</strong> — soporte de perfiles de aprovisionamiento macOS para distribución App Store y TestFlight</li>
      </ul>

      <h2>Perry Login y facturación</h2>
      <p>
        Perry ahora tiene cuentas y facturación basada en uso, impulsado por un nuevo comando CLI <code>perry login</code> y un panel de control en <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>.
      </p>
      <h3>Cómo funciona</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — flujo de dispositivo GitHub OAuth, abre el navegador, consulta el estado de finalización</li>
        <li><strong>Nivel gratuito</strong> — 15 compilaciones/mes, proyectos ilimitados con una cuenta de GitHub</li>
        <li><strong>Nivel Pro</strong> — compilaciones ilimitadas mediante suscripción a Polar.sh</li>
        <li><strong>Tokens de API</strong> — generar y gestionar tokens desde el panel de control para CI/CD</li>
        <li><strong>Seguimiento de uso</strong> — contadores mensuales de publicación y verificación con barras de uso en tiempo real</li>
      </ul>
      <p>
        El panel de control en sí es un servidor Fastify compilado con Perry con una exportación estática de Next.js — construido con Perry, sirviendo a usuarios de Perry.
      </p>

      <h2>Notarización de macOS y firma de código</h2>
      <p>
        Dos nuevas capacidades de firma:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — cambia automáticamente al certificado Developer ID (en lugar del certificado App Store), envía al servicio de notarización de Apple y adjunta el resultado</li>
        <li><strong>Firma de código con GCloud KMS</strong> — las compilaciones de Windows ahora pueden firmarse usando claves de Google Cloud KMS, habilitando la firma automatizada en CI sin exponer claves privadas</li>
      </ul>

      <h2>Renovación de la UI de Windows</h2>
      <p>
        El backend de UI de Windows recibió su actualización más completa hasta la fecha:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Escalado consciente de DPI</strong> — tamaño de ventana, fuentes y dimensiones de widgets escalan correctamente en pantallas de alto DPI</li>
        <li><strong>APIs de ventana tipo launcher</strong> — ventanas sin bordes con posicionamiento personalizado para interfaces tipo launcher/spotlight</li>
        <li><strong>Hotkeys globales</strong> — atajos de teclado a nivel de sistema que funcionan incluso cuando la app no está enfocada</li>
        <li><strong>Iconos de app</strong> — API <code>getAppIcon</code> para mostrar iconos de aplicación en interfaces tipo launcher</li>
        <li><strong>Layout seguro ante reentrancia</strong> — el pintado basado en <code>RefCell</code> fue reemplazado con almacenamiento HWND <code>SetPropW</code> para prevenir panics durante mensajes WM_PAINT anidados</li>
        <li><strong>Integración con Geisterhand</strong> — todos los tipos de widgets registrados con el framework de pruebas de UI, <code>/type</code> usa <code>SendMessageW</code> a través del mapa HWND</li>
        <li><strong>Soporte de cámara Android</strong> — API de captura de cámara extendida a Android mediante JNI</li>
      </ul>

      <h2>Rendimiento</h2>
      <p>
        v0.4.14 incluyó una auditoría de rendimiento exhaustiva:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>fcmp</code> nativo</strong> — las comparaciones de punto flotante usan instrucciones nativas de CPU en lugar de llamadas a funciones del runtime. Benchmark Mandelbrot <strong>30 % más rápido</strong>.</li>
        <li><strong>Append de string in-place</strong> — <code>str += &quot;text&quot;</code> modifica el búfer directamente en lugar de asignar un nuevo string. <strong>125x más rápido</strong> para concatenación repetida.</li>
        <li><strong>Cortocircuito AND/OR</strong> — <code>&amp;&amp;</code> y <code>||</code> omiten la evaluación del operando derecho cuando el resultado ya está determinado.</li>
        <li><strong>Plegado de literales negativos</strong> — <code>-1</code>, <code>-0.5</code> etc. se pliegan a constantes a nivel HIR en lugar de emitir una instrucción de negación.</li>
      </ul>

      <h2>Compilaciones paralelas del Hub</h2>
      <p>
        El servidor de orquestación de compilaciones ahora soporta compilaciones concurrentes por worker:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Despacho basado en slots</strong> — los workers reportan capacidad <code>max_concurrent</code>, el Hub rastrea los trabajos activos por worker</li>
        <li><strong>No más 429s</strong> — los trabajos se encolan en lugar de rechazarse cuando todos los workers están ocupados</li>
        <li><strong>Descargas de artefactos en Base64</strong> — artefactos binarios servidos como Base64 cuando el runtime de Perry no puede manejar respuestas HTTP binarias crudas</li>
        <li><strong>WebSocket con reconexión automática</strong> — las conexiones de monitoreo de compilación se reconectan automáticamente al desconectarse</li>
      </ul>

      <h2>Nuevo paquete: perry/appstorereview</h2>
      <p>
        Un nuevo paquete de primera parte para solicitar reseñas en las tiendas de aplicaciones:
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Abre el diálogo nativo de reseña
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        Una función, dos plataformas, UI de reseña nativa. El timing y la lógica de visualización quedan completamente en manos del desarrollador.
      </p>

      <h2>Correcciones de codegen</h2>
      <p>
        120 commits significan muchas correcciones de errores. Las más impactantes:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Igualdad estricta (===)</strong> — tres bugs separados corregidos en v0.4.2: comparación de etiquetas de tipo, manejo de NaN y distinción null/undefined</li>
        <li><strong>Comparación de strings concatenados</strong> — <code>===</code> fallaba al comparar strings construidos mediante concatenación debido a comparación de punteros en lugar de contenido</li>
        <li><strong>Resolución de constructores</strong> — <code>new X(args)</code> ahora resuelve correctamente constructores importados entre módulos y funciones constructoras basadas en closures</li>
        <li><strong>Array push a nivel de módulo</strong> — los valores añadidos a arrays de nivel de módulo dentro de llamadas a funciones anidadas en bucles se perdían debido a punteros obsoletos después de la reasignación</li>
        <li><strong>Coerción aritmética de null</strong> — <code>null + 1</code> ahora produce correctamente <code>1</code> mediante <code>js_number_coerce</code></li>
        <li><strong>Wrapping de NOT bit a bit</strong> — <code>~x</code> ahora se ajusta a i32 según la semántica ECMAScript</li>
        <li><strong>fetch().then()</strong> — los callbacks nunca se disparaban en apps de UI nativas debido a la falta de drenaje del bucle de eventos (v0.4.3)</li>
        <li><strong>Módulo y exponente WASM</strong> — los operadores <code>%</code> y <code>**</code> causaban errores de validación WASM (v0.4.5)</li>
      </ul>

      <h2>En números</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 commits</strong> al compilador principal de Perry en 5 días</li>
        <li><strong>24 versiones de parche</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>Objetivos de compilación</strong>: 9 → 10 (se añadió tvOS)</li>
        <li><strong>Objetivos de compilación cruzada desde Linux</strong>: Windows → Windows, iOS, macOS (todo Apple + Windows)</li>
        <li><strong>Nuevos paquetes</strong>: perry/appstorereview</li>
        <li><strong>Nueva infraestructura</strong>: panel de control app.perryts.com, CLI perry login, facturación Polar.sh</li>
        <li><strong>Mejoras de rendimiento</strong>: Mandelbrot 30 % más rápido (fcmp nativo), concatenación de strings 125x más rápida</li>
      </ul>

      <h2>Qué viene después</h2>
      <p>
        La compilación cruzada de iOS y macOS desde Linux significa que el Hub ahora puede compilar para todas las plataformas desde un único servidor Linux — no más máquinas de compilación macOS dedicadas para la compilación (solo para la firma). La infraestructura de facturación abre el camino a la beta pública del Hub. Y con tvOS añadido, Perry cubre todas las plataformas Apple: macOS, iOS, iPadOS, watchOS y tvOS.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Beta pública del Hub</strong> — usuarios externos pueden enviar TypeScript y obtener binarios nativos</li>
        <li><strong>Soporte completo de regex</strong> — la última gran brecha del lenguaje</li>
        <li><strong>Expansión de perry/ui</strong> — arrastrar y soltar, accesibilidad, DatePicker</li>
        <li><strong>Source maps &amp; info de depuración</strong> — información de depuración DWARF para depuración nativa</li>
      </ul>
      <p>
        Sigue el progreso en{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, lee la documentación en{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">hoja de ruta</Link>
        {" "}para el panorama completo.
      </p>
    </>
  );
}
