import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0 es la versión más grande desde el inicio del proyecto. Tres saltos de versión en un ciclo — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — y el compilador en sí ahora es paralelo. Aquí está todo lo que se lanzó.
      </p>

      <h2>Multi-Threading real</h2>
      <p>
        Perry ahora tiene paralelismo real basado en hilos del sistema operativo. No son web workers con sobrecarga de serialización. No es <code>SharedArrayBuffer</code> con <code>Atomics</code>. Hilos reales — hilos del SO ligeros con pila de 8 MB que no comparten nada y no cuestan nada cuando están inactivos.
      </p>
      <p>
        El nuevo módulo <code>perry/thread</code> expone tres primitivas:
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Dividir trabajo entre todos los núcleos de CPU, resultados en orden
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filtrar en paralelo
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Lanzar un hilo en segundo plano, obtener una Promise
const result = await spawn(() => {
  // se ejecuta en un hilo del SO separado
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> y <code>parallelFilter</code> detectan automáticamente el número de núcleos de CPU y dividen el array de entrada entre ellos. Para arrays pequeños, omiten el threading por completo y se ejecutan de forma síncrona — sin sobrecarga para cargas de trabajo triviales.
      </p>
      <p>
        <code>spawn</code> lanza un hilo del SO en segundo plano y devuelve una Promise. El resultado fluye de vuelta a través de una cola de resultados pendientes que se drena durante el procesamiento de microtareas, por lo que se puede usar <code>await</code> como cualquier otra operación asíncrona.
      </p>

      <h3>Seguridad en tiempo de compilación</h3>
      <p>
        La parte más importante no es la API — es lo que el compilador <em>previene</em>. Perry rechaza estáticamente los closures que capturan variables mutables:
      </p>
      <pre><code>{`let counter = 0;

// ✗ Error de compilación: closure captura variable mutable 'counter'
parallelMap(items, (item) => {
  counter++;  // rechazado en tiempo de compilación
  return item * 2;
});`}</code></pre>
      <p>
        Sin estado mutable compartido significa sin carreras de datos. Sin locks, sin mutexes, sin <code>Atomics</code>. El compilador impone la seguridad de hilos antes de que se emita una sola línea de código máquina.
      </p>

      <h3>Bajo el capó</h3>
      <p>
        Cada hilo worker obtiene su propia arena de memoria con limpieza <code>Drop</code> — sin coordinación de GC entre hilos. Los valores se transfieren mediante copia profunda <code>SerializedValue</code>: coste cero para números, O(n) para strings, arrays y objetos. La implementación vive en un único archivo Rust de 1.120 líneas (<code>perry-runtime/src/thread.rs</code>) y no requirió cambios en el recolector de basura.
      </p>
      <p>
        Compara esto con los aislados de V8, que requieren heaps separados por worker con ~2 MB de sobrecarga cada uno. Los hilos de Perry son simplemente pthreads con arenas.
      </p>

      <h3>Pipeline de compilador paralelo</h3>
      <p>
        El compilador en sí ahora también es paralelo. La generación de código de módulos, las pasadas de transformación (imports de JS, instancias nativas, monomorfización) y el escaneo de símbolos con <code>nm</code> se ejecutan en todos los núcleos de CPU a través de rayon. Combinado con la actualización a Cranelift 0.121 (desde 0.113 — ocho versiones menores de asignación de registros y mejoras x64), la compilación es significativamente más rápida.
      </p>

      <h2>i18n en tiempo de compilación (v0.3.0)</h2>
      <p>
        El sistema de internacionalización de Perry no tiene ceremonia. Los literales de cadena en widgets de UI se tratan automáticamente como claves localizables. Los archivos de traducción son JSON plano en un directorio <code>locales/</code>. Toda la validación ocurre en tiempo de compilación.
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Tu código — usa strings normalmente
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        El compilador valida todo: traducciones faltantes, desajustes de parámetros, errores de formas plurales. Las traducciones se integran en el binario como una tabla de cadenas 2D embebida con búsqueda en tiempo de ejecución cercana a cero — sin parsear JSON al inicio.
      </p>

      <h3>Qué incluye</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Reglas de plural CLDR</strong> para más de 30 locales con sufijos <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code></li>
        <li><strong>Wrappers de formato</strong>: <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>Detección nativa de locale</strong> en todas las plataformas: <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI: escanea archivos TS/TSX, genera y actualiza scaffolds JSON de locales</li>
        <li><strong>Generación de recursos nativos de plataforma</strong>: directorios iOS <code>.lproj</code> y Android <code>values-xx/</code></li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> para localizar strings fuera de la UI</li>
      </ul>
      <p>
        Configúralo en <code>perry.toml</code>:
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>Apps nativas para watchOS (v0.3.2)</h2>
      <p>
        Perry ahora compila para watchOS — el 9.º objetivo de compilación. Esto no es un wrapper ni una app companion. Es un binario watchOS independiente con una interfaz nativa SwiftUI.
      </p>
      <p>
        El renderizador watchOS usa un <strong>enfoque basado en datos</strong>: Perry construye un árbol de UI a través de llamadas FFI <code>perry_ui_*</code>, y un <code>PerryWatchApp.swift</code> incluido consulta el árbol y renderiza vistas SwiftUI de forma reactiva. Se soportan 15 tipos de widgets con stubs para los no soportados.
      </p>
      <pre><code>{`# Compilar para watchOS
perry compile main.ts --target watchos

# Ejecutar en el simulador de Apple Watch
perry run watchos

# Configurar firma para watchOS
perry setup watchos`}</code></pre>
      <p>
        El flujo completo funciona: <code>perry setup watchos</code> comparte las credenciales de App Store Connect con iOS, <code>perry run watchos</code> detecta automáticamente los simuladores de Apple Watch, y <code>perry publish watchos</code> envía al App Store.
      </p>
      <p>
        Esto también eleva el recuento total de <strong>objetivos de widgets a cuatro</strong>: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) y Wear OS (Tiles). Cada uno tiene su propio objetivo de compilación y backend de codegen.
      </p>

      <h2>APIs de audio y cámara</h2>
      <p>
        Dos nuevas APIs de hardware se incluyen en esta versión:
      </p>
      <h3>Captura de audio (<code>perry/system</code>)</h3>
      <p>
        Captura de audio multiplataforma con medición dB(A) ponderada en A:
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) con suavizado EMA
const waveform = audioGetWaveformSamples();  // buffer circular de 256 muestras
audioStop();`}</code></pre>
      <p>
        Backends por plataforma: AVAudioEngine (macOS/iOS), AudioRecord vía JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).
      </p>
      <h3>Captura de cámara (<code>perry/ui</code>)</h3>
      <p>
        Vista previa de cámara nativa con muestreo de color a nivel de píxel (iOS):
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // promedio 5x5`}</code></pre>

      <h2>Paquetes del ecosistema</h2>
      <p>
        Se lanzaron dos paquetes nativos de primera parte:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — Bindings de notificaciones push para iOS/macOS: solicitudes de permisos, obtención de token APNs, conteo de badges. Stub de Android con FCM planificado.</li>
        <li><strong>perry/storekit</strong> — Bindings de compras in-app StoreKit 2: carga de productos, compras con recibos JWS, verificación de suscripciones, restauración y listeners de transacciones.</li>
      </ul>
      <p>
        Ambos siguen la misma arquitectura: declaraciones TypeScript → crate FFI Rust → puente Swift. Instalar como dependencia, importar las funciones, <code>await</code> los resultados. El compilador maneja todos los puentes nativos.
      </p>

      <h2>Infraestructura</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — ocho versiones menores de asignación de registros, correcciones x64 y mejoras de alineación de slots de pila</li>
        <li><strong>División de funciones en Windows</strong> — divide automáticamente funciones con más de 50 declaraciones en continuaciones para evitar problemas de codegen de Cranelift en Windows</li>
        <li><strong>Carga selectiva de variables de módulo</strong> — solo carga variables de nivel de módulo referenciadas en la entrada de función, reduciendo el tamaño del binario de Windows en un 26 %</li>
        <li><strong>Mejora de Array.sort()</strong> — de ordenamiento por inserción O(n²) a híbrido TimSort O(n log n)</li>
        <li><strong>perry run android</strong> — pipeline completo de compilación de APK: compilar, generación de proyecto Gradle, assembleDebug, instalar, lanzar</li>
        <li><strong>Entradas personalizadas de Info.plist</strong> — <code>[ios.info_plist]</code> en perry.toml para descripciones de privacidad, esquemas URL, modos en segundo plano</li>
      </ul>

      <h2>En números</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Versión</strong>: 0.2.197 → 0.4.0 (tres hitos principales)</li>
        <li><strong>Objetivos de compilación</strong>: 8 → 9 (se añadió watchOS)</li>
        <li><strong>Objetivos de widgets</strong>: 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>Nuevos crates</strong>: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>Nueva documentación</strong>: threading (4 páginas), i18n (4 páginas), watchOS, docs de widgets expandidos (3 → 8 páginas)</li>
        <li><strong>Implementación de perry/thread</strong>: 1.120 líneas de Rust, cero cambios en el GC</li>
      </ul>

      <h2>Qué viene después</h2>
      <p>
        La base de threading abre muchas posibilidades: procesamiento paralelo de solicitudes HTTP, operaciones de archivo concurrentes y cargas de trabajo computacionalmente intensivas que antes estaban bloqueadas por la ejecución de un solo hilo. En el lado del lenguaje, el soporte completo de regex sigue siendo la mayor brecha, y la expansión de <code>perry/ui</code> (arrastrar y soltar, accesibilidad, DatePicker) continúa.
      </p>
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
