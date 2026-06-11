export default function Content() {
  return (
    <>
      <p>
        El último post terminó en <strong>v0.5.875</strong> con la historia del GC — cerrando el gap que expuso el benchmark de aya_koto. Aquel post fue sobre ganar un benchmark. Este es sobre un tipo distinto de trabajo: las aproximadamente <strong>270 releases entre v0.5.875 y v0.5.1146</strong>, aterrizadas a lo largo de unas cuatro semanas, casi ninguna de las cuales es un titular de benchmark. El tema cambió de &ldquo;ir rápido en un microbenchmark&rdquo; a <strong>&ldquo;hacer que TypeScript del mundo real y paquetes npm reales realmente compilen y corran.&rdquo;</strong> Más una revisión visual completa de Windows y un montón de nuevos widgets por el camino.
      </p>
      <p>
        Esto es lo que se lanzó, agrupado por para qué servía realmente.
      </p>

      <h2>Paquetes npm reales ahora compilan</h2>
      <p>
        El hilo individual más grande a través de esta ventana es un barrido para hacer que paquetes npm populares compilen a binarios nativos y pasen pruebas de comportamiento — no solo &ldquo;enlazar sin errores,&rdquo; sino correr y producir la salida correcta. La lista que ahora funciona a través de <code>perry.compilePackages</code> incluye <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, y Colyseus</strong>.
      </p>
      <p>
        Cada uno fallaba por su propia razón, y cada fix es su propia pequeña historia:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> crasheaba con <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>. Causa raíz (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code> donde <code>F</code> es una función importada de otro módulo producía en silencio un objeto vacío — el cuerpo del constructor nunca corría, así que cada check tipo <code>$ZodCheckMinLength</code> volvía despojado de su propiedad <code>_zod</code>.</li>
        <li><strong>axios + jose</strong> necesitaban crypto y compresión que Perry aún no tenía: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> para AES-GCM, y <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> se bloqueaba en un timeout de polling de un segundo en <code>wait_for_promise</code>; lo reemplazamos por una espera condvar e hicimos que las promesas rechazadas aparecieran como <code>HTTP 500</code> en lugar de colgarse (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> no podía leer un cuerpo POST — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> devolvían vacío en POST/PUT hasta un fix de registro padre en v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> todos chocaron con la misma forma: un <em>valor invocable con propiedades adjuntas</em> (<code>chalk.red</code>, <code>express()</code> más <code>express.Router</code>). Tres variantes de ese patrón se arreglaron a lo largo de v0.5.935 y el barrido npm circundante, más <code>util.inherits</code> + un andamiaje de prototipo de stream para desbloquear express (v0.5.990).</li>
        <li><strong>dayjs</strong>, enviado como un bundle minificado, ejercitaba el dispatch de método de prototipo JS-clásico (<code>Class.prototype.m = fn</code>) que Perry hacía lowering mal (v0.5.924/932).</li>
      </ul>
      <p>
        Debajo de todo eso está la parte que hace que los paquetes que Perry <em>no puede</em> compilar nativamente sigan corriendo: el <strong>runtime de fallback de V8</strong> se volvió real en esta ventana. Su ModuleLoader ahora lee de un mapa de módulos embebido, así que un binario de fallback sigue siendo <strong>autocontenido</strong> — sin <code>node_modules</code> sueltos en runtime (v0.5.994). <code>createServer</code> hace de puente a un servidor hyper real (v0.5.999), y los globales Web Fetch <code>Response</code> / <code>Request</code> / <code>Headers</code> existen en el camino de fallback (v0.5.1006). Y el <strong><code>import()</code> dinámico en tiempo de compilación</strong> — <code>await import(&apos;./foo.ts&apos;)</code> con string-literal resuelto en build time — por fin aterrizó (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Un barrido de conformidad de test262</h2>
      <p>
        El otro hilo dominante es la conformidad. Corrimos pases enfocados contra los radares del subconjunto de test262 y movimos la aguja en los built-ins en los que el código real más se apoya:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        El salto de String vino de darle a cada método de <code>String.prototype</code> dispatch genérico de <code>this</code> y arreglar la coerción de índices de <code>slice</code>/<code>substring</code>. El salto de Array fue <code>thisArg</code> en los callbacks de array denso (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), <code>ToLength</code> tipo array-like, ordenamiento de operaciones de la spec, y validación de cero argumentos. El destructuring recogió destructuring de parámetros a través de métodos de clase plain, generator, async-generator, static, y private.
      </p>
      <p>
        Junto a los números titulares, aterrizó una larga cola de correctitud: <code>JSON.parse</code> ahora lanza un <code>SyntaxError</code> real (no un <code>TypeError</code>) y rechaza tokens sobrantes; su reviver recorre vía el algoritmo <code>InternalizeJSONProperty</code> de la spec; <code>Object.prototype.toString</code> marca correctamente para typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; <code>RegExp.prototype.toString</code> devuelve <code>/source/flags</code>; los async generators acertaron su semántica de <code>yield</code>-awaits-operand. Estos son radares de subconjunto, no la suite completa — Perry sigue escalando — pero la escalada de este mes fue empinada.
      </p>

      <h2>Windows se vuelve Fluent</h2>
      <p>
        Windows recibió una revisión visual (la serie <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>). Las ventanas de Perry ahora optan por el chrome DWM moderno por defecto — <strong>fondo Mica</strong>, esquinas redondeadas, y una barra de título consciente del tema — y los controles comunes se renderizan a través de <strong>comctl32 v6</strong> en lugar de los defaults de la era de Windows 95. El window proc ahora maneja <code>WM_DPICHANGED</code>, así que una ventana se mantiene nítida cuando la arrastras entre monitores con escalado mixto en lugar de quedar estirada como bitmap.
      </p>
      <p>
        Crucialmente, nada de esto reintrodujo la vieja regresión <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> de &ldquo;área negra tras redimensionar&rdquo;: el área de cliente sigue pintándose opaca, y el blur-through Mica/Acrylic de marco completo se queda como un opt-in explícito de <code>app.setVibrancy(...)</code>. También hay un nuevo andamiaje de backend <code>--target windows-winui</code> (WinUI 3) para apps que quieren el stack completamente moderno, y un fix pequeño pero real que hace que <code>perry compile main.ts -o main</code> produzca <code>main.exe</code> en Windows para que PowerShell efectivamente lo lance (v0.5.1146).
      </p>

      <h2>Nuevos widgets, cada plataforma</h2>
      <p>
        Dos widgets aterrizaron solo en el último día, y ambos abarcan cada plataforma de UI a la que Perry apunta:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — un control de fecha compacto, estilo campo: <code>NSDatePicker</code> en macOS, <code>UIDatePicker</code> (.compact) en iOS/visionOS, <code>SysDateTimePick32</code> en Windows, <code>android.widget.DatePicker</code> en Android, GTK4 en Linux. Una sola superficie TS a través de todos ellos.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — cualquier widget puede ser destino de soltado y origen de arrastre para texto/archivos/URLs, mapeado a <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit), y <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Antes en la ventana la estantería de widgets también se llenó a lo largo de escritorio y móvil — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, y una ImageGallery deslizable — cada uno respaldado por el control nativo real en cada plataforma. HarmonyOS (ArkTS) recibió Chart y TreeView (v0.5.893), los dos últimos widgets que necesitaba para alcanzar paridad con los demás.
      </p>

      <h2>GC, internals, y estabilidad</h2>
      <p>
        La mayoría de esas 270 releases no son titulares — son fixes de bugs e internals, y ese es el punto de esta fase. Algunos que vale la pena destacar:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>El GC continuó.</strong> El trabajo de free-list condicional del post del GC siguió asentándose, y se cerró una clase aguda de bug: las Promises con puente nativo ahora están <strong>fijadas mientras están en vuelo en un worker de tokio</strong> para que el GC no pueda barrerlas antes de que aterrice la resolución (v0.5.923). Si corriste un fetch async bajo carga y viste una colección fantasma, era esto.</li>
        <li><strong>El modelo de memoria está documentado.</strong> Ahora hay un análisis a fondo en <code>internals/memory-model.md</code> — NaN-boxing, el GC generacional, la shadow stack, y las write barriers — cableado en el sitio de docs (v0.5.933).</li>
        <li><strong>Una ola de fixes de estabilidad de codegen</strong> aflorados por el barrido npm: una arrow <code>const</code> a nivel de módulo llamada dentro de un paso async reanudado ya no hace SIGSEGV (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> ya no se cuelga para siempre (v0.5.870), y un puñado de crashes de <code>js_is_truthy</code> / rango de raw-pointer que tropezaban los bundles reales.</li>
      </ul>

      <h2>Tareas domésticas de Apple</h2>
      <p>
        Más pequeño pero real: <code>perry setup ios --development</code> ahora aprovisiona para builds de desarrollo (v0.5.1023), y el camino de build/link de cross-library de Apple se dedupicó y se hizo portable en ancho de puntero (v0.5.1121/1125) — que es lo que desbloqueó la matriz de publicación npm / Homebrew / APT / winget que había estado atascada.
      </p>

      <h2>Dónde deja esto las cosas</h2>
      <p>
        La apuesta detrás de Perry siempre ha sido que &ldquo;TypeScript nativo&rdquo; solo importa si corre TypeScript <em>real</em> — no un subconjunto de juguete, los paquetes reales que la gente hace <code>npm install</code>. Este mes fue mayormente ese trabajo: menos un único número del que presumir, más un empuje largo y poco glamoroso para cerrar el gap entre &ldquo;compila&rdquo; y &ldquo;funciona.&rdquo; Los radares de conformidad y los tests de paridad npm son el marcador que estamos vigilando ahora, y seguiremos publicando los números — los buenos y los todavía imperfectos.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
