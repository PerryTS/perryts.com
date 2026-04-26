export default function Content() {
  return (
    <>
      <p>
        El artículo anterior cerraba con <strong>v0.5.174</strong> y un titular: Perry por fin ganaba todos los benchmarks de la suite in-tree contra Node y Bun. Tres días de trabajo y una cola de commits de GC + JSON después, Perry está en <strong>v0.5.306</strong> — eso son <strong>132 releases de parche</strong> — y la historia es otra. El titular no es un speedup de 547x ni una nueva columna de victorias. Es el trabajo que hace que esas victorias sean defendibles.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>El <strong>GC generacional</strong> se envía como predeterminado. Las fases A a D aterrizaron entre v0.5.217 y v0.5.237.</li>
        <li>La <strong>Small String Optimization</strong> se envía como predeterminada. Los pasos 1.5 → 2 aterrizaron en v0.5.213–v0.5.216.</li>
        <li>El <strong>pipeline de JSON</strong> recibió un parser basado en tape, parse perezoso, stringify perezoso y materialización dispersa por elemento. El validate-and-roundtrip por defecto está ahora en <strong>75 ms de mediana</strong> — el mejor del grupo de tipado dinámico.</li>
        <li>La <strong>página de benchmarks</strong> está reescrita de extremo a extremo con <strong>RUNS=11 mediana + p95 + σ + min + max</strong>, simdjson y AssemblyScript+json-as añadidos como pares, las pruebas de optimización separadas de las comparaciones reales, y cada debilidad de Perry expuesta con honestidad.</li>
      </ul>
      <p>
        El reparto secundario es una racha sostenida de arreglos de corrección: FIFO de microtareas de Promise, igualdad de NaN y formato de números ECMAScript, complemento a dos de BigInt, AsyncLocalStorage de extremo a extremo, runtimes de decimal.js + ioredis + commander, y un segfault de JSON.stringify sobre un f64 plano que estaba escondido bajo los caminos del tape. Más el toolchain de Windows que por fin se vuelve ligero: LLVM + xwin, sin necesidad de instalar Visual Studio.
      </p>

      <h2>1. GC generacional, activado por defecto</h2>
      <p>
        El GC generacional ha sido un despliegue por fases durante dos meses. El resumen de las fases que se cerraron en esta ventana:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> — Fase A: andamiaje del runtime de shadow-stack, emisión de push/pop, threading del slot-map, mirroring shadow de <code>Let</code>/<code>LocalSet</code>, y el escáner de raíces.</li>
        <li><strong>v0.5.222</strong> — Fase B: separación de arenas nursery + old-gen.</li>
        <li><strong>v0.5.223–v0.5.225</strong> — Fase C1–C2: infraestructura runtime de write-barrier, codegen emite la barrera, cada store al heap pasa por ella.</li>
        <li><strong>v0.5.226–v0.5.228</strong> — Fase C3a–C4: las raíces del remembered-set fluyen al mark + clear; el trace de minor GC salta el old-gen; tenuring no-moving.</li>
        <li><strong>v0.5.229–v0.5.236</strong> — Fase C4b α/β/γ/δ: infraestructura de forwarding-pointer, pase de pinning + evacuation, escáner + pinning transitivo, reescritura de referencias, bloques de nursery inactivos devueltos al SO, trigger del GC capado al umbral inicial.</li>
        <li><strong>v0.5.237</strong> — Fase D parte 1: <code>PERRY_GEN_GC=1</code> por defecto.</li>
        <li><strong>v0.5.238</strong> — Fase D parte 2: <code>PERRY_SHADOW_STACK=1</code> por defecto.</li>
        <li><strong>v0.5.239–v0.5.240</strong> — docs de cierre: roadmap finalizada, apéndice de linaje académico + industrial (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        La victoria medida que más importó: <code>test_memory_json_churn</code> bajó de <strong>115 MB → 91 MB</strong> de RSS pico en el momento en que el predeterminado del gen-GC se activó. Las regresiones de cómputo fueron pequeñas y se listaron sin disculpas — <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> +1 ms cada uno. La vía de escape (<code>PERRY_GEN_GC=0</code>) recupera los números antiguos; el trade-off fue deliberado, y la página de benchmarks ahora lista ambas filas lado a lado para que el lector pueda elegir.
      </p>

      <h2>2. Small String Optimization, activada por defecto</h2>
      <p>
        SSO es una representación de string inline de 22 bytes que evita la asignación en heap para strings cortos — las claves típicas de JSON (2–8 bytes) y los valores cortos caen en la forma inline. El despliegue fue diminuto en la superficie y grande por debajo:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: infraestructura SSO (representación + accessors).</li>
        <li><strong>v0.5.214</strong>: brazos del consumidor del Paso 1 + puerta <code>PERRY_SSO_FORCE</code> para testing.</li>
        <li><strong>v0.5.215</strong>: codegen del Paso 1.5 con rama de tres vías en <code>PropertyGet</code> — fast path para strings inline, fast path para strings en heap, slow path para el residuo.</li>
        <li><strong>v0.5.216</strong>: cambio del Paso 2 — emitir SSO por defecto.</li>
      </ul>
      <p>
        Los seguimientos en v0.5.279 cerraron el último bug de NaN en lectura de propiedades que afloró cuando SSO estaba caliente, y el arreglo de despacho encadenado de getters cross-module en v0.5.272 cerró otro. Ambos estaban en la lista de pendientes antes del cambio del predeterminado; ambos se enviaron sin regresión de rendimiento.
      </p>

      <h2>3. JSON: parse basado en tape, perezoso por defecto</h2>
      <p>
        El pipeline de JSON recibió la reescritura más invasiva del periodo. Comportamiento antiguo: <code>JSON.parse</code> construía un árbol completamente materializado de valores con NaN-boxing. Comportamiento nuevo: <code>JSON.parse</code> construye un tape de 12 bytes por valor y materializa de forma perezosa — solo los valores que realmente lees pagan el coste de materialización. Stringify sobre un parse no mutado es ahora un memcpy del input original, el mismo truco de fast-path que simdjson usa con <code>raw_json()</code>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: parse dirigido por schema <code>JSON.parse&lt;T&gt;(blob)</code> (Paso 1). Una shape conocida en tiempo de compilación deja al compilador emitir acceso a claves pre-resuelto.</li>
        <li><strong>v0.5.203</strong>: cimientos del parse basado en tape — Paso 2 Fase 1.</li>
        <li><strong>v0.5.204</strong>: parse perezoso + stringify perezoso — Paso 2 Fases 2+4.</li>
        <li><strong>v0.5.206</strong>: acceso indexado lazy-safe + casos borde — Paso 2 Fase 3.</li>
        <li><strong>v0.5.208</strong>: materialización dispersa por elemento — Paso 2 Fase 5b.</li>
        <li><strong>v0.5.209</strong>: cursor de walk + umbral adaptativo de materialize.</li>
        <li><strong>v0.5.210</strong>: cambio del parse perezoso a predeterminado para blobs ≥1 KB.</li>
      </ul>
      <p>
        El resultado en la carga de trabajo para la que se diseñó el lazy tape (10k registros, blob de ~1 MB, parse → stringify sin iteración intermedia):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementación</th>
              <th className="text-right py-2 px-3">Mediana (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">RSS pico</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry a <strong>75 ms de mediana</strong> es el runtime de tipado dinámico más rápido en la comparación — gana a Bun (259 ms), gana a Node (394 ms), gana al JIT del servidor de Kotlin (453 ms). simdjson a 24 ms es el techo C++ acelerado por SIMD y vive en la página a propósito, no escondido detrás de un cherry-pick. Perry no le gana. El objetivo es mostrar la brecha para que cerrarla tenga un blanco — registrado en <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        El bench compañero honesto es <strong>parse-and-iterate</strong>: mismo blob, pero cada iteración suma el <code>nested.x</code> de cada registro, lo que fuerza al lazy tape a materializar. Ahí Perry aterriza en <strong>466 ms</strong> — más lento que los 375 ms de la vía de escape mark-sweep porque el tape paga un overhead que no puede amortizar. Esa fila está en el TL;DR §B. Cuando no puedes evitar el trabajo, el lazy tape no finge poder hacerlo.
      </p>

      <h2>4. La página de benchmarks, reescrita</h2>
      <p>
        Tres cosas cambiaron sobre cómo Perry presenta los números de rendimiento.
      </p>
      <p>
        <strong>RUNS=11 mediana + p95 + σ + min + max, no best-of-N.</strong> Best-of-N descarta silenciosamente la latencia de cola; en este hardware estaba escondiendo outliers de Python <code>accumulate</code> de 9,4 segundos y picos de p95 de 5,3 segundos del JSON de Swift. La mediana devuelve las colas a la página. El cambio de metodología aterrizó en v0.5.248; cada celda en TL;DR §A y §B es RUNS=11 fresco a fecha de <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>Las pruebas de optimización están separadas del rendimiento real de runtime.</strong> Las cinco celdas que muestran a Perry en 12–34 ms vs Rust/C++ en 98 ms — <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> — miden la postura de flags del compilador, no el silicio. Están ahora en su propia subsección, con un párrafo encima explicando que <code>clang++ -O3 -ffast-math</code> las cierra hasta el milisegundo. El kernel real-runtime estrella es <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry se sienta justo en el grupo sin contrato FMA en un kernel donde el compilador genuinamente no puede plegar el trabajo. Esa es la comparación honesta.
      </p>
      <p>
        <strong>Pares añadidos.</strong> simdjson (4.3.0) está ahora en ambas tablas de JSON — el techo de throughput de parse en C++, en la página para que el lector pueda ver la brecha. AssemblyScript con json-as (1.3.2) es el par TS-a-nativo instalable más cercano; porffor hacía segfault en la carga de trabajo a este tamaño, Static Hermes no se instalaba en macOS arm64. Kotlin con kotlinx.serialization se unió al políglota JSON en v0.5.241–v0.5.242. Cada fila es real, cada disclaimer está en la página.
      </p>

      <h2>5. La tabla políglota de cómputo</h2>
      <p>
        Los kernels estrella genuinamente no plegables, mediana RUNS=11, refrescados 2026-04-25 en v0.5.249:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        En <code>fibonacci</code>, Perry iguala al grupo compilado dentro de 3–15 ms. El JIT HotSpot de Java es ~11% más rápido por inlinear la llamada recursiva. En <code>loop_data_dependent</code>, el kernel se separa en dos clústeres de FP-contract: el grupo con contrato FMA en ~128 ms (Go por defecto, <code>g++ -O3</code> en Apple Clang — ambos fusionan <code>sum * a + b</code> en un único FMADDD) y el grupo sin contrato en 229–235 ms (Perry, Rust por defecto, Swift, Java sin <code>-XX:+UseFMA</code>, Bun) corriendo FMUL + FADD escalares. LLVM iguala al grupo FMA con <code>-ffp-contract=fast</code>; Perry no lo activa por defecto. <code>nested_loops</code> está limitado por caché, no por cómputo; todos aterrizan en 8–21 ms.
      </p>

      <h2>6. Toolchain de Windows, ligero</h2>
      <p>
        Los usuarios de Windows ya no necesitan instalar Visual Studio. <strong>v0.5.199</strong> cerró <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin reemplaza todo el árbol de VS BuildTools. <code>v0.5.201</code> quitó la puerta cfg sobre <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> para que el descubrimiento de rutas funcione en cada plataforma que tenga como target Windows, no solo en hosts macOS.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Pase de corrección de runtime</h2>
      <p>
        Un tema del periodo: las divergencias silenciosas de runtime respecto a V8/JSC se convirtieron o en arreglos o en errores de compilación. Las no triviales:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: complemento a dos en <code>BigInt.fromTwos</code>/<code>toTwos</code>.</li>
        <li><strong>v0.5.263</strong>: discriminación de tipo no-promise en <code>Promise.all</code>/<code>race</code>/<code>any</code>.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + formato de números ECMAScript (<code>3 → &quot;3&quot;</code>, no <code>&quot;3.0&quot;</code>; <code>-0 → &quot;0&quot;</code>; etc.).</li>
        <li><strong>v0.5.280</strong>: coerción ToInt32 de <code>NaN</code>/<code>Infinity</code> en <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong>: FIFO de microtareas de Promise + propagación de handlers que lanzan.</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> de un f64 plano hacía segfault bajo los caminos del tape.</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> devuelve Buffer cuando no se pasa encoding (coincide con Node).</li>
        <li><strong>v0.5.272</strong>: el despacho encadenado de getters cross-module devolvía <code>undefined</code>.</li>
      </ul>
      <p>
        Los seguimientos de stdlib para el issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> se completaron: AsyncLocalStorage de extremo a extremo (v0.5.261), runtime de commander + codegen invocando de verdad <code>.action()</code> (v0.5.250), código de decimal.js (v0.5.259), Redis ioredis de extremo a extremo (v0.5.270), patrón async-factory de pg + mongo (v0.5.275), y el mismo bug de async-factory en EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        Del lado de <code>perry/ui</code>: callback de tap de notificación (#97) cableado tanto en Apple (v0.5.254) como en Android (v0.5.258); programar + cancelar notificaciones locales (#96, v0.5.244); registro + recepción de FCM en Android (v0.5.262).
      </p>

      <h2>8. Cerrando</h2>
      <p>
        El patrón de este tramo no son números de titular. Es el trabajo que hace que las victorias existentes sobrevivan al escrutinio: un GC generacional que captura cargas de trabajo de asignación sostenida, una SSO que cierra la brecha de coste de strings cortos, un pipeline de JSON que explota la estructura de &ldquo;sin modificación&rdquo; de la carga de trabajo más común, y una página de benchmarks que mide medianas en lugar de best-of-N y muestra el techo de parse de 24 ms de simdjson en la misma fila que los 75 ms de Perry. El lector llega a ver la brecha — y dónde se sitúa Perry respecto al suelo.
      </p>
      <p>
        Pruébalo:
      </p>
      <pre><code>{`# npm (cualquier plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — sin necesidad de instalar VS)
winget install PerryTS.Perry

# Suite de benchmarks por defecto
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Benchmarks: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
