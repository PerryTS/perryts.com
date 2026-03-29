import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Uno de los objetivos más ambiciosos de Perry es ofrecer aplicaciones GUI verdaderamente nativas desde una única base de código TypeScript. No son vistas web envueltas en un shell nativo. No es un motor de renderizado personalizado dibujando sus propios píxeles. Widgets nativos reales, renderizados por el framework de UI propio de cada plataforma, compilados desde TypeScript en tiempo de compilación.
      </p>
      <p>
        Este artículo explica cómo funciona — la arquitectura, el mapeo de plataformas, los compromisos y dónde estamos hoy.
      </p>

      <h2>El problema con los enfoques actuales</h2>
      <p>
        El desarrollo de GUI multiplataforma ha sido un problema difícil durante décadas. Cada framework importante ha hecho un conjunto diferente de compromisos:
      </p>

      <h3>Electron / Tauri (Basado en web)</h3>
      <p>
        Electron empaqueta Chromium y Node.js, dándote un navegador web como shell de la app. Tienes acceso completo a la plataforma web, pero tu app &quot;nativa&quot; es una descarga de más de 150 MB que usa cientos de megabytes de RAM solo para mostrar una ventana. Tauri reemplaza Chromium con la vista web del SO, reduciendo el tamaño dramáticamente, pero tu UI sigue siendo HTML/CSS renderizado en una vista web — no widgets nativos.
      </p>

      <h3>React Native (Basado en bridge)</h3>
      <p>
        React Native ejecuta tu JavaScript en un motor JS (Hermes o V8) y hace puente hacia widgets nativos a través de una cola de mensajes serializada. Obtienes widgets nativos reales, pero el bridge añade latencia, especialmente para gestos y animaciones. Las interacciones complejas requieren bajar a código nativo (Swift/Kotlin), derrotando la promesa de una única base de código.
      </p>

      <h3>Flutter (Renderizador personalizado)</h3>
      <p>
        Flutter compila Dart a código nativo y dibuja todo con su propio motor de renderizado basado en Skia. El rendimiento es excelente, pero tus widgets no son nativos — son réplicas perfectas a nivel de píxel. Esto significa que las convenciones de la plataforma (física de desplazamiento, selección de texto, comportamientos de accesibilidad) deben reimplementarse en lugar de heredarse. Y en escritorio, las diferencias se notan más.
      </p>

      <h3>KMP + Compose Multiplatform (Parcialmente nativo)</h3>
      <p>
        Kotlin Multiplatform compila a JVM en Android y nativo en iOS, pero la UI compartida a través de Compose Multiplatform usa un renderizador personalizado basado en Skia — el mismo compromiso que Flutter. Para UI verdaderamente nativa, vuelves a escribir código específico de plataforma.
      </p>

      <h2>El enfoque de Perry: Compilar a toolkits nativos</h2>
      <p>
        Perry toma un enfoque fundamentalmente diferente. En lugar de ejecutar tu código en un runtime y hacer puente hacia widgets nativos, o dibujar píxeles personalizados, Perry compila tu código de UI TypeScript directamente en llamadas al toolkit nativo de cada plataforma en tiempo de compilación.
      </p>
      <p>
        La diferencia clave: <strong>no hay capa de runtime entre tu código y el SDK de la plataforma.</strong>{" "}
        El binario compilado llama a AppKit, UIKit, Android Views, GTK4 o Win32 directamente, exactamente como lo haría una app escrita en Swift, Kotlin o C++.
      </p>

      <h2>La API de UI unificada</h2>
      <p>
        Perry proporciona una API TypeScript común para construir interfaces de usuario. Esta API es deliberadamente de alto nivel — describes lo que tu UI debe contener y cómo debe comportarse, y Perry lo mapea a los constructos nativos apropiados.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Este mismo código compila a UI nativa en las seis plataformas. Sin <code className="text-perry-400">#ifdef</code>, sin comprobaciones de plataforma, sin imports condicionales.
      </p>

      <h2>Mapeo de plataformas en detalle</h2>
      <p>
        Así es como Perry mapea la API unificada al framework nativo de cada plataforma:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        En macOS, Perry genera código que crea y gestiona objetos AppKit directamente. Un <code className="text-perry-400">App</code> se convierte en una <code className="text-perry-400">NSApplication</code> con un <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> se convierte en <code className="text-perry-400">NSTextField</code> (con edición desactivada).{" "}
        <code className="text-perry-400">Button</code> se convierte en <code className="text-perry-400">NSButton</code> con un patrón target-action conectado a tu callback.{" "}
        <code className="text-perry-400">VStack</code> se convierte en un <code className="text-perry-400">NSStackView</code> con orientación vertical. El layout usa restricciones Auto Layout.
      </p>
      <p>
        El binario compilado enlaza contra el framework AppKit y llama a funciones del runtime Objective-C directamente. Es lo mismo que haría Swift compilado por Xcode.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        En iOS, el mapeo es similar pero apunta a UIKit.{" "}
        <code className="text-perry-400">App</code> se convierte en una <code className="text-perry-400">UIApplication</code> con un <code className="text-perry-400">UIWindow</code> y un <code className="text-perry-400">UIViewController</code> raíz.{" "}
        <code className="text-perry-400">Text</code> mapea a <code className="text-perry-400">UILabel</code>.{" "}
        <code className="text-perry-400">Button</code> mapea a <code className="text-perry-400">UIButton</code>.{" "}
        El layout usa <code className="text-perry-400">UIStackView</code> y Auto Layout. Los eventos táctiles se manejan a través de la cadena de respondedores de UIKit.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        En Android, Perry genera una biblioteca nativa cargada vía JNI (Java Native Interface).{" "}
        <code className="text-perry-400">App</code> mapea a una <code className="text-perry-400">Activity</code>.{" "}
        <code className="text-perry-400">Text</code> se convierte en un <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> se convierte en un <code className="text-perry-400">android.widget.Button</code> con un <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> mapea a un <code className="text-perry-400">LinearLayout</code> vertical. El código nativo llama de vuelta al framework Android a través de JNI, creando y manipulando vistas Android reales.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        En Linux, Perry apunta a GTK4.{" "}
        <code className="text-perry-400">App</code> se convierte en una <code className="text-perry-400">GtkApplication</code> con un <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> mapea a <code className="text-perry-400">GtkLabel</code>.{" "}
        <code className="text-perry-400">Button</code> mapea a <code className="text-perry-400">GtkButton</code> con un manejador de señales.{" "}
        <code className="text-perry-400">VStack</code> mapea a una <code className="text-perry-400">GtkBox</code> con orientación vertical. El theming CSS de GTK4 significa que tu app sigue automáticamente el tema de escritorio del usuario.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        En Windows, Perry genera llamadas a la API Win32.{" "}
        <code className="text-perry-400">App</code> crea una clase de ventana, la registra y ejecuta un bucle de mensajes.{" "}
        <code className="text-perry-400">Button</code> se convierte en un control <code className="text-perry-400">BUTTON</code> creado con <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> mapea a un control <code className="text-perry-400">STATIC</code>. Los eventos se manejan a través de la bomba de mensajes Win32 (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, etc.).
      </p>

      <h2>Gestión de estado</h2>
      <p>
        La primitiva <code className="text-perry-400">State&lt;T&gt;</code> de Perry proporciona gestión de estado reactiva que compila a mecanismos de actualización nativos de la plataforma. Cuando un valor de estado cambia, Perry dispara una actualización de UI a través del sistema de invalidación propio de la plataforma — <code className="text-perry-400">setNeedsDisplay</code> en macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> en Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> en Linux.
      </p>
      <p>
        No hay diffing de DOM virtual, no hay pase de reconciliación, no hay serialización. Los cambios de estado se propagan directamente al widget nativo que muestra el valor.
      </p>

      <h2>¿Por qué no la sintaxis de SwiftUI / Jetpack Compose?</h2>
      <p>
        Podrías preguntarte por qué Perry no usa una sintaxis declarativa similar a SwiftUI o Jetpack Compose. La respuesta es pragmática: Perry compila TypeScript, y TypeScript tiene sus propios modismos. En lugar de inventar un DSL que parezca extraño para los desarrolladores TypeScript, Perry usa una API estilo builder que se siente natural en TypeScript — constructores, llamadas a métodos, callbacks y closures. Son los mismos patrones que ya usas al trabajar con Express, hooks de React o cualquier otra biblioteca TypeScript.
      </p>

      <h2>Qué está disponible hoy</h2>
      <p>
        Los seis backends de plataforma están implementados y estables. El conjunto actual de widgets incluye:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Layout</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Visualización</strong> — Text, Image</li>
        <li><strong>Entrada</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navegación</strong> — NavigationView, TabView, List</li>
        <li><strong>Contenedores</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>Estado</strong> — State&lt;T&gt; para actualizaciones reactivas</li>
      </ul>

      <h2>Qué viene</h2>
      <p>
        Estamos expandiendo activamente la biblioteca de widgets. Próximamente:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — entrada de contraseña con entrada de texto segura nativa de la plataforma</li>
        <li><code className="text-perry-400">ProgressView</code> — indicadores de progreso determinados e indeterminados</li>
        <li><code className="text-perry-400">Alert</code> — diálogos de alerta nativos con botones y campos de texto</li>
        <li><code className="text-perry-400">DatePicker</code> — selección de fecha/hora nativa de la plataforma</li>
        <li><code className="text-perry-400">Menu</code> — barras de menú y menús contextuales nativos</li>
      </ul>
      <p>
        El objetivo es paridad completa del framework GUI en todas las plataformas — cada widget, layout, gesto y animación disponible en todas partes. Consulta la{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">hoja de ruta</Link> para el panorama completo.
      </p>

      <h2>Pruébalo</h2>
      <p>
        La mejor manera de entender la UI nativa de Perry es verla en acción.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> es un visor JSON nativo construido completamente en TypeScript con Perry — una app real con navegación en árbol, búsqueda y atajos de teclado, compilada a binarios nativos en macOS, iOS y Android. Lee el{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">recorrido completo</Link>{" "}
        de cómo fue construido.
      </p>
    </>
  );
}
