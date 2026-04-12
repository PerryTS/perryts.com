export default function Content() {
  return (
    <>
      <p>
        La migración del backend de Perry de Cranelift a LLVM está completa. A partir de v0.5.12, LLVM es el único backend de generación de código, y Perry ahora supera a Node.js en 14 de 15 benchmarks — con márgenes que van de 1,06x a 24,6x.
      </p>
      <p>
        Llegar hasta aquí no fue un camino recto. La transición inicial en v0.5.0 hizo que varios benchmarks fueran <strong>70x más lentos</strong> que la versión con Cranelift a la que reemplazaba. Este artículo es la versión larga de lo que pasó, por qué hicimos el cambio de todos modos, qué se rompió, qué lo arregló y cómo lucen los números al otro lado.
      </p>
      <p>
        Si estás construyendo un compilador, evaluando backends de codegen, o simplemente tienes curiosidad de por qué &ldquo;cambiar a LLVM&rdquo; rara vez es tan simple como suena, esto es para ti.
      </p>

      <h2>Parte 1: ¿Por qué cambiar?</h2>
      <p>
        Perry compila TypeScript directamente a código máquina nativo. Sin Node, sin V8, sin Electron, sin WebView. La propuesta es &ldquo;escribe TypeScript, entrega un binario nativo&rdquo;, y toda la propuesta de valor se derrumba si ese binario no es realmente rápido.
      </p>
      <p>
        Durante las primeras versiones menores de Perry, el backend de codegen fue <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. Cranelift es excelente — es el codegen detrás de wasmtime, lo usa el JIT baseline de SpiderMonkey, y es la herramienta de elección cuando necesitas compilación rápida y predecible con una historia de integración limpia. Para un proyecto que arranca un nuevo lenguaje, fue el punto de partida correcto.
      </p>
      <p>
        Pero dos cosas nos empujaron a dejarlo.
      </p>

      <h3>1. El techo del optimizador</h3>
      <p>
        Cranelift es intencionalmente un compilador optimizador rápido de un solo nivel. Su mandato es &ldquo;producir código decente rápidamente&rdquo;, no &ldquo;producir el mejor código posible sin límite de tiempo&rdquo;. Ese es el compromiso correcto para un JIT. Es el compromiso equivocado para un compilador AOT cuyo argumento de venta es el rendimiento nativo.
      </p>
      <p>
        LLVM tiene más de dos décadas de trabajo invertido en su middle-end. Vectorización de bucles, LICM, GVN, SCCP, combinación de instrucciones, heurísticas de inlining, reasociación fast-math, análisis de alias — no existe un universo realista en el que un proyecto más pequeño alcance ese nivel. Si Perry va a afirmar &ldquo;más rápido que Node&rdquo;, necesitamos esa maquinaria.
      </p>

      <h3>2. El problema de arm64_32</h3>
      <p>
        El detonante inmediato fue el Apple Watch. <code>arm64_32</code> es un ABI que Apple introdujo para el Series 4 en adelante — instrucciones de 64 bits, punteros de 32 bits. Cranelift no lo soporta, y no había un camino realista para que llegara. Para que Perry afirme con credibilidad &ldquo;9 plataformas desde una sola base de código&rdquo;, watchOS no podía faltar. LLVM soporta <code>arm64_32</code> de fábrica.
      </p>
      <p>
        Una vez que aceptamos que <em>algunos</em> targets requerirían LLVM, mantener dos backends se volvió insostenible. Dos backends significan dos conjuntos de bugs, dos conjuntos de pases de optimización, dos matrices de pruebas, dos líneas base de rendimiento. La respuesta honesta fue: elegir uno.
      </p>
      <p>Elegimos LLVM.</p>

      <h2>Parte 2: Una nota sobre Cranelift</h2>
      <p>
        Antes de continuar: este artículo no es un derribo de Cranelift. Cranelift es una pieza brillante de ingeniería, y si estás construyendo un JIT, un runtime sandboxed, o cualquier cosa donde la latencia de compilación importa más que el rendimiento máximo, debería estar al tope de tu lista. wasmtime lo usa por buenas razones. La Bytecode Alliance está haciendo un trabajo ejemplar.
      </p>
      <p>
        Las necesidades de Perry simplemente son diferentes. Compilamos con anticipación, entregamos el binario una vez, y el usuario lo ejecuta millones de veces. Esa asimetría — compilar raramente, ejecutar siempre — es exactamente el régimen donde el optimizador más pesado de LLVM se paga solo. Herramienta diferente para un trabajo diferente.
      </p>

      <h2>Parte 3: El desastre de la transición</h2>
      <p>
        v0.5.0 fue el primer release con LLVM como único backend. Esperábamos una pequeña regresión en tiempo de compilación y una mejora significativa en rendimiento en tiempo de ejecución. Obtuvimos lo opuesto de lo segundo.
      </p>
      <p>Aquí está la tabla que no quería publicar en ese momento:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2.8x faster</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1.8x slower</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2.3x slower</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Algunas cargas de trabajo se aceleraron. La mayoría empeoró drásticamente. <code>method_calls</code> — uno de los benchmarks más importantes porque representa el uso idiomático de clases en TypeScript — fue casi 70x peor que lo que habíamos entregado dos releases antes.
      </p>

      <h3>Qué salió mal realmente</h3>
      <p>
        Perry usa <strong>NaN-boxing</strong> para la representación de valores. Cada valor TypeScript es una palabra de 64 bits. Los números f64 se almacenan directamente; todo lo demás (objetos, strings, booleans, undefined, null) se codifica en los bits no utilizados de un IEEE 754 quiet NaN.
      </p>
      <p>
        La ventaja: los números son de costo cero. Sin boxing, sin tagging, sin asignación de memoria para la aritmética.
      </p>
      <p>
        La desventaja: cada operación sobre un valor que no es número requiere manipulación de bits para desempaquetar, operar y volver a empaquetar. Si esas secuencias están como IR inline en tu codegen, el optimizador puede fusionarlas y simplificarlas. Si están como <strong>llamadas a funciones helper del runtime</strong>, el optimizador ve una llamada opaca y se rinde.
      </p>
      <p>
        Nuestro backend de Cranelift había acumulado un gran número de lowerings inline para operaciones calientes — cargas de propiedades, dispatch de métodos, asignación de objetos, aritmética entera sobre valores etiquetados como f64. La transición a LLVM, en aras de sacar código <em>correcto</em> primero, canalizó casi todas esas operaciones a través de helpers del runtime en <code>perry-runtime</code>. Cada helper era una instrucción <code>call</code> en LLVM IR.
      </p>
      <p>
        LLVM es excelente, pero no puede hacer inline de una función cuyo cuerpo nunca ha visto. <code>perry-runtime</code> se compila por separado, se enlaza al final, y desde la perspectiva del optimizador cada llamada a un helper es una caja negra. El resultado fue que bucles calientes que el backend de Cranelift había compilado a ~5 instrucciones de aritmética inline ahora se compilaban a llamadas de función — guardado de registros, configuración de stack frame, todo el paquete — repetido millones de veces.
      </p>
      <p>
        De ahí vinieron los 70x. No era mal codegen. Eran malas <strong>fronteras de inlining</strong>.
      </p>

      <h2>Parte 4: La solución</h2>
      <p>
        El trabajo para recuperar y superar los números de Cranelift cayó aproximadamente en seis categorías. Ninguna es exótica. La mayoría son optimizaciones de compilador de libro de texto que simplemente tenían que aplicarse en los lugares correctos.
      </p>

      <h3>1. Bump allocator inline para asignación de objetos</h3>
      <p>
        <code>object_create</code> fue la peor regresión después de <code>method_calls</code>. El camino anterior llamaba a <code>js_object_alloc_class_with_keys</code> para cada <code>new Point()</code> — una llamada de función, un acceso a arena thread-local, una búsqueda en la cache de shapes, y una escritura del GC header + object header.
      </p>
      <p>
        La solución: emitir la asignación bump <strong>inline</strong> en LLVM IR. Cada función que asigna objetos obtiene un puntero cacheado a una estructura <code>InlineArenaState</code> thread-local. La asignación se convierte en:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        El camino rápido son ~13 instrucciones de IR inline que LLVM puede ver, planificar y sacar de los bucles. <code>object_create</code> pasó de 318ms a 9ms.
      </p>

      <h3>2. Contadores de bucle i32</h3>
      <p>
        NaN-boxing significa que cada número TypeScript es f64. Eso incluye los contadores de bucle. Un bucle <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> con variables de inducción f64 es un desastre: incremento f64, comparación f64, conversión f64-a-i64 cada vez que se indexa un array.
      </p>
      <p>
        El codegen detecta bucles for donde la variable de inducción es probablemente entera y asigna un <strong>slot de pila i32 paralelo</strong>. La condición del bucle cambia de <code>fcmp</code> a <code>icmp slt i32</code>, eliminando el contador f64 por completo.
      </p>
      <p>
        Esto llevó <code>array_write</code> de 11ms a 3ms, <code>nested_loops</code> de 18ms a 9ms, y <code>array_read</code> de 11ms a 4ms.
      </p>

      <h3>3. Flags de fast-math</h3>
      <p>
        Adjuntamos flags <code>reassoc contract</code> a cada instrucción aritmética f64. <code>reassoc</code> permite a LLVM romper cadenas de acumulador seriales en paralelas, y <code>contract</code> permite multiply-add fusionado. Mantenemos <code>nnan</code> y <code>ninf</code> desactivados porque Perry usa los bits NaN como etiquetas de valor.
      </p>
      <p>
        Con esos flags, el vectorizador de bucles de LLVM se activa en <code>math_intensive</code>, que cayó de 131ms a 14ms — superando a Node por 3,5x.
      </p>

      <h3>4. Camino rápido para módulo entero</h3>
      <p>
        <code>%</code> sobre f64 en JavaScript es <code>fmod</code>, que es una llamada a libm en ARM. Pero para operandos f64 de valor entero, podemos hacer <code>fptosi → srem → sitofp</code> y saltar el viaje de ida y vuelta por libm completamente. El codegen usa análisis estático para detectar operandos de valor entero — no se necesita verificación en runtime.
      </p>
      <p>
        Esta es la razón completa por la que <code>factorial</code> pasó de 1.553ms a 24ms — y de los 591ms de Node a 24ms. <strong>24,6x más rápido que Node.</strong>
      </p>

      <h3>5. LICM para bucles anidados</h3>
      <p>
        LLVM hace loop-invariant code motion de forma nativa, pero NaN-boxing oculta la estructura. <code>arr.length</code> se baja a un load a través de un puntero NaN-boxed con una verificación de etiqueta — no es obviamente invariante.
      </p>
      <p>
        El codegen detecta el patrón <code>{'for (...; i < arr.length; ...)'}</code> y precarga la longitud en un slot de pila antes del bucle, con un walker estático que verifica que el cuerpo del bucle no puede cambiar la longitud del array. Cuando el contador está acotado por esta longitud izada, IndexGet/IndexSet omiten las verificaciones de límites por completo.
      </p>

      <h3>6. Objetos con cache de shapes</h3>
      <p>
        Cuando el codegen conoce la clase de un objeto, resuelve los offsets de campo en tiempo de compilación y emite <strong>cargas indexadas directas</strong> — sin dispatch en runtime. Para el dispatch de métodos, <code>obj.method(args)</code> se convierte en un <code>call @perry_method_Class_name(this, args)</code> directo — sin vtable, sin inline cache, sin búsqueda hash.
      </p>
      <p>
        La transición a LLVM había regresado esto al camino lento universal. Restaurar el dispatch estático nos dio la recuperación de <code>method_calls</code> — de 1.084ms de vuelta a 1ms. <strong>11x más rápido que Node.</strong>
      </p>

      <h2>Parte 5: Los números hoy</h2>
      <p>Mediana de tres ejecuciones, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        14 de 15 victorias. La única derrota es <code>object_create</code>, donde el allocator de V8 es genuinamente excelente y estamos dentro del 12%.
      </p>

      <h2>Parte 6: La pregunta del tiempo de compilación</h2>
      <p>
        La razón número uno por la que la gente elige Cranelift sobre LLVM es la velocidad de compilación. Así que hablemos de eso.
      </p>
      <p>
        LLVM aumentó el tiempo de compilación por archivo de Perry en <strong>20-50ms</strong>, o aproximadamente <strong>8-19%</strong>. No 5x. No 2x. Porcentaje de un solo dígito a doble dígito bajo.
      </p>
      <p>
        La razón es que el codegen no es el cuello de botella en el pipeline de Perry. El desglose para un archivo típico:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC parsing: ~30%</li>
        <li>HIR lowering (AST → IR, inferencia de tipos): ~25%</li>
        <li>Pases de transformación IR (conversión de closures, async lowering, inlining): ~15%</li>
        <li><strong>Codegen (emisión de texto LLVM IR + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + biblioteca de runtime): ~10%</li>
      </ul>
      <p>
        El codegen es una porción de cinco. Incluso duplicar esa porción solo mueve el total un 5-10%. Si estás construyendo un compilador AOT donde el usuario escribe <code>perry compile</code> una vez y luego ejecuta el binario para siempre, el cálculo es: gastar 25ms más en tiempo de compilación, ahorrar hasta 24x en cada ejecución.
      </p>

      <h2>Parte 7: Qué haría diferente</h2>
      <p>
        Si empezara Perry hoy y pudiera saltar directamente a LLVM, no lo haría. La fase de Cranelift fue genuinamente valiosa. Nos permitió iterar en el frontend sin el impuesto de complejidad de LLVM, nos dio una línea base funcional contra la cual comparar, y nos obligó a mantener nuestro HIR lo suficientemente limpio como para ser portable entre backends.
      </p>
      <p>
        Lo que haría diferente es la transición en sí. Lanzamos v0.5.0 con la mayoría de operaciones pasando por llamadas a helpers del runtime, con la intención de inlinearlas después. Eso fue un error. El orden correcto habría sido: identificar los caminos calientes primero, bajarlos inline antes de la transición, y solo lanzar cuando el backend LLVM estuviera al menos en paridad.
      </p>
      <p>
        La lección es la aburrida: las fronteras de optimización importan más que la calidad del optimizador. LLVM es una pieza de software notable, pero no puede ayudarte con código que no puede ver. Si tu codegen canaliza todo a través de llamadas opacas al runtime, has construido un muro entre tu programa fuente y cada pase de optimización que existe.
      </p>

      <h2>Conclusión</h2>
      <p>
        Perry ahora es solo LLVM, más rápido que Node en 14 de 15 benchmarks, y en producción. La migración tomó más tiempo del que planeé, dolió más de lo que esperaba en el medio, y es inequívocamente la decisión correcta en retrospectiva. Cranelift nos llevó hasta v0.5; LLVM nos lleva el resto del camino.
      </p>
      <p>Si quieres probar Perry:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Ejecuta los benchmarks tú mismo: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Si tienes preguntas, encuentras bugs o quieres debatir sobre backends de codegen, los issues de GitHub están abiertos. Los leo todos.
      </p>
      <p>— Ralph</p>
    </>
  );
}
