export default function Content() {
  return (
    <>
      <p>
        El último artículo del blog se lanzó con Perry en v0.5.12. Hoy estamos en v0.5.80. Eso son <strong>68 releases de parche en siete días</strong>, casi enteramente enfocados en una sola cosa: convertir cada camino lento restante en un camino rápido.
      </p>
      <p>
        La transición a LLVM en v0.5.0 recuperó la paridad con Cranelift en v0.5.12. Ese fue el final de una historia y el comienzo de otra. LLVM ahora lo ve todo. La pregunta dejó de ser &ldquo;¿por qué esto es lento?&rdquo; y pasó a ser &ldquo;¿por qué esto no es ya rápido?&rdquo; — que es una pregunta mucho más tratable.
      </p>
      <p>
        Este artículo es un recorrido por la semana. JSON obtuvo una aceleración de 547x. mimalloc se convirtió en el allocator global. El acceso a propiedades ganó una inline cache monomórfica. Los buffers ganaron slots de puntero tipados con metadata <code>noalias</code>. Los servidores Fastify y WebSocket dejaron de crashear después de un minuto. Y los benchmarks se movieron otra vez.
      </p>

      <h2>1. JSON: cerrando una brecha de 547x</h2>
      <p>
        En v0.5.29, JSON.parse de Perry sobre un array de 20 registros era <strong>547x más lento que Node</strong>. Para v0.5.46 era 1,3x. Ese número es el mayor delta individual de la semana, y vale la pena recorrerlo porque cada otra optimización en este artículo es una variación del mismo tema: no hagas trabajo que no tienes que hacer.
      </p>
      <p>
        El parser original asignaba un Vec por propiedad, un Vec de claves por objeto, y un thread-local protegido por RefCell para la cache de claves. Copiaba cada string. Re-hasheaba cada nombre de campo. Construía una shape de objeto totalmente nueva para cada registro, incluso cuando los 20 registros tenían exactamente los mismos campos en exactamente el mismo orden. El parser de Node maneja esto notando el patrón y compartiendo una sola shape entre todos los registros. El de Perry no lo hacía.
      </p>
      <p>La solución llegó en cuatro pasos:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Interning de claves vía un thread-local <code>PARSE_KEY_CACHE</code></strong> (v0.5.45). El primer registro asigna N strings de clave; los registros del 2 al 20 asignan cero. Las claves repetidas resuelven al mismo puntero, lo que las hace utilizables como claves de búsqueda en la shape-cache sin un strcmp.</li>
        <li><strong>Compartición de shapes a través de la transition cache</strong> (v0.5.45). Los objetos construidos por <code>js_object_set_field_by_name</code> recorren el mismo grafo de transiciones. Cuando el schema se repite, el puntero <code>keys_array</code> se comparte, y eso es lo que una inline cache polimórfica necesita para acertar.</li>
        <li><strong>Parsing de strings zero-copy + construcción incremental de objetos</strong> (v0.5.46). <code>parse_string_bytes</code> ahora devuelve <code>ParsedStr::Borrowed(&amp;[u8])</code> cuando no hay escapes de backslash — que es el caso común para cada clave y la mayoría de los valores. <code>parse_object</code> escribe los campos directamente en lugar de recolectarlos primero en un Vec.</li>
        <li><strong>Supresión del GC durante el parse</strong> (v0.5.60, cierra #59). Parsear un array grande asigna miles de objetos pequeños en un bucle apretado. Cada uno estaba disparando la verificación del umbral del GC. Establecer un flag de &ldquo;parsing en progreso&rdquo; difiere la recolección hasta que el parse retorna — el mismo tamaño efectivo de heap, vastamente menos ramas de bookkeeping.</li>
      </ol>
      <p>
        Luego stringify. JSON.stringify sobre arrays homogéneos — la misma shape, millones de veces — estaba haciendo iteración completa de propiedades por objeto, lo que para un array de shape estable es puro desperdicio. Una solución de cinco pasos cerró la mayor parte de esa brecha también:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: caminos rápidos itoa / ryu para números, verificación de referencia circular basada en profundidad en lugar de un HashSet.</li>
        <li>v0.5.63: guard de <code>toJSON</code> + cache de claves persistente + dispatch inline (los tres costos por llamada que se sumaban).</li>
        <li>v0.5.65: template de stringify para shape homogénea + camino rápido de escape ASCII. Cuando cada elemento tiene la misma shape, el andamiaje de clave/dos puntos/coma se precomputa una sola vez.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: cache de template de shape por llamada, cerrar la brecha del GC que quedaba del parse, matar el overhead fijo restante por llamada.</li>
        <li>v0.5.79: el camino de valores pequeños. Números, booleans y strings cortos pasan por un camino directo que no configura nada de la maquinaria de objetos.</li>
      </ul>
      <p>
        El resultado acumulado: un pipeline de JSON que estaba <strong>547x por detrás de Node</strong> al comienzo de la semana ahora está aproximadamente <strong>1,3x por detrás en parse y es competitivo en stringify</strong>, en cargas de trabajo realistas.
      </p>

      <h2>2. La historia del allocator</h2>
      <p>
        Perry asigna mucho. Cada literal de objeto, cada literal de array, cada concatenación de strings, cada closure. El allocator es caliente, y para la mayor parte de v0.5 era el allocator de sistema por defecto de Rust más una arena thread-local para valores de vida corta.
      </p>
      <p>
        v0.5.67 reemplazó el allocator global con <strong>mimalloc</strong>. Este es un cambio de una línea en Cargo.toml que se paga inmediatamente en cualquier carga de trabajo que haga muchas asignaciones pequeñas — que es todo programa TypeScript. v0.5.66 lo precedió consolidando todo el estado thread-local de <code>gc_malloc</code> en un único acceso TLS por llamada, para que el camino hacia mimalloc fuera lo más barato posible.
      </p>
      <p>
        v0.5.68 llevó esto más allá con <strong>strings asignados en arena</strong>. Los strings de vida corta (resultados intermedios de concat, piezas de <code>split()</code>, scratch del parser) saltan el allocator global por completo y caen en una arena bump por hilo que se resetea en límites naturales. Para el parsing de JSON esto fue por sí solo una ganancia de dos dígitos porcentuales.
      </p>
      <p>
        Y las dos optimizaciones que no asignan en absoluto:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Scalar replacement de objetos no escapantes</strong> (v0.5.17, luego literales de objeto en v0.5.76). Si un objeto nunca deja su función contenedora, no necesita existir. Sus campos se convierten en locales planos. LLVM maneja esto de fábrica una vez que dejas de esconder el objeto detrás de una llamada opaca al allocator.</li>
        <li><strong>Scalar replacement de arrays no escapantes</strong> (v0.5.73). La misma idea — si el array no escapa, sus elementos se convierten en valores SSA y toda la asignación desaparece.</li>
      </ul>
      <p>
        Para el camino de literales de array específicamente, v0.5.69 añadió un <strong>camino rápido de tamaño exacto</strong> (saltar la maquinaria de crecimiento de capacidad cuando el tamaño se conoce en tiempo de compilación), y v0.5.74 inlineó el IR del bump-allocator para literales de array pequeños de modo que LLVM pueda ver la asignación, plegarla, izarla o eliminarla. Los benchmarks intensivos en arrays se movieron otro escalón.
      </p>
      <p>
        Para rematar, v0.5.25 arregló un bug más silencioso: <code>gc_malloc</code> no estaba disparando la recolección en su propio camino, así que las cargas de trabajo pesadas en malloc podían hacer crecer el heap sin límite antes de que algo verificara. v0.5.61 añadió un dimensionamiento adaptativo de pasos al umbral, que es lo que realmente quieres: verificar barato cuando el heap es pequeño, menos a menudo cuando es grande.
      </p>

      <h2>3. El acceso a propiedades ganó una inline cache de verdad</h2>
      <p>
        Todo motor moderno de JavaScript tiene una inline cache polimórfica (PIC) sobre el acceso a propiedades. Durante la mayor parte de la serie v0.5 de Perry, PropertyGet pasaba por una búsqueda en shape-table con un hash thread-local. Eso está bien para código frío. No está bien cuando el 95% de tus lecturas de propiedades en un call site dado ven la misma shape, que es casi siempre.
      </p>
      <p>
        v0.5.44 trajo una <strong>inline cache monomórfica</strong> para <code>PropertyGet</code>. Cada sitio de PropertyGet obtiene una entrada de cache por call site: un puntero a shape esperada y un offset de campo. El camino de hit es una sola comparación más un load indexado. El camino de miss cae a un helper lento que actualiza la cache.
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51 añadió una <strong>cache de transiciones de shape basada en hash de contenido</strong> para escrituras dinámicas de propiedades. Dos objetos que hacen crecer los mismos campos en el mismo orden hashean a la misma transición, así que terminan compartiendo la misma shape — y eso significa que el lado de lectura del PIC realmente acierta.
      </p>
      <p>
        v0.5.55 eliminó el último acceso TLS de la transition cache. v0.5.46 arregló un bug en el manejador de miss del PIC donde objetos con &gt;8 campos estaban leyendo más allá de los slots inline en memoria no inicializada (cierra #55). v0.5.78 añadió un guard para evitar que el PIC de PropertyGet indexara en receptores no-puntero como números crudos — que podía pasar en refinamiento de tipos demasiado optimista y fue uno de los últimos problemas de estabilidad en el IC.
      </p>
      <p>
        Efecto neto: el código pesado en propiedades — que en la práctica significa la mayoría del TypeScript — es aproximadamente 2–3x más rápido que hace una semana, solo por el IC.
      </p>

      <h2>4. Enteros, bitwise, y el patrón <code>| 0</code></h2>
      <p>
        NaN-boxing hace que cada número sea un f64. Los programadores de TypeScript escriben <code>x | 0</code> para forzar semántica de entero. V8 ha pasado quince años haciendo eso barato. Perry pasó esta semana poniéndose al día.
      </p>
      <p>La pila de cambios, en orden:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> para <code>(int / const) | 0</code>. LLVM lo pliega a <code>smulh + asr</code>, que son ~2 ciclos vs ~10 para <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> sobre los límites de Uint8ArrayGet. Reemplaza el diamante de rama+phi de verificación de límites con un solo bloque básico sobre el cual el vectorizador puede razonar.</li>
        <li><strong>v0.5.49</strong>: arreglar operaciones bitwise con NaN/Infinity para que produzcan 0 según la spec de ToInt32. Correctitud primero.</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code> que salta el guard de NaN/Inf de 5 instrucciones cuando se sabe que el valor es finito. Además <code>alwaysinline</code> en helpers pequeños y detección de clamp.</li>
        <li><strong>v0.5.52</strong>: apuntar a funciones clamp directamente con intrínsecos <code>smin</code>/<code>smax</code>. Clamp es el patrón entero más común después del incremento.</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> y <code>x &gt;&gt;&gt; 0</code> sobre un valor conocido-finito se convierten en un noop &mdash; solo <code>fptosi + sitofp</code>, sin guard en absoluto.</li>
        <li><strong>v0.5.56</strong>: operaciones bitwise nativas i32; índice y valor i32 en Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> baja a la multiplicación nativa i32 en lugar del camino polyfill. La detección de polyfill reconoce shims de <code>Math.imul</code> escritos por el usuario y los reemplaza.</li>
        <li><strong>v0.5.59</strong>: inlining de init de funciones puras + seeding de locales enteros. El análisis entero local de funciones puede ver más allá de los límites de llamadas cuando el callee es pequeño y puro.</li>
        <li><strong>v0.5.37–v0.5.40</strong>: camino rápido de aritmética entera con patrón acumulador. El clásico bucle <code>for (...) acc += f(i)</code> se mantiene en i32 de extremo a extremo cuando los tipos lo permiten.</li>
      </ul>
      <p>
        v0.5.41 es el sutil. Cuando el codegen ve un <code>const K: number[][] = [[...], ...]</code> a nivel de módulo, baja todo eso a una constante plana <code>[N x i32]</code> en <code>.rodata</code>. <code>K[y][x]</code> se convierte en un único <code>getelementptr + load i32</code>. Combinado con el puente de análisis entero en v0.5.43, esto es lo que le dio a <code>image_conv</code> (un blur gaussiano 5×5 sobre un frame RGB 4K) una <strong>aceleración de 3x en un solo release</strong>.
      </p>

      <h2>5. Buffers y Uint8Array</h2>
      <p>
        Las cargas de trabajo binarias — crypto, procesamiento de imágenes, parsing, networking — viven en Buffer y Uint8Array. v0.5.64 les dio <strong>slots de puntero tipados más metadata <code>noalias</code></strong>. Donde un Buffer solía ser un double NaN-boxed en un <code>alloca double</code>, ahora es un puntero <code>i64</code> crudo en un <code>alloca i64</code>, con anotaciones de LLVM que le dicen al optimizador &ldquo;este puntero no hace alias con otros punteros en el alcance&rdquo;. Eso desbloquea reordenamiento de load/store, vectorización y asignación de registros que el optimizador de otro modo se negaría a hacer.
      </p>
      <p>
        v0.5.80 cerró el último problema de correctitud aquí: un contador <code>alias-scope</code> de buffer a nivel de módulo que se estaba reseteando por función, lo que en raros casos podía dejar a LLVM razonar a través de scopes que no deberían compartir un scope ID. Ahora el contador es a nivel de módulo y la historia de <code>noalias</code> es hermética.
      </p>
      <p>
        v0.5.53 hizo <code>Uint8ArraySet</code> sin ramas — un store enmascarado en lugar de un if/else que escribía 0 fuera de límites. v0.5.54 añadió un <strong>Two-Way indexOf</strong> para patrones más largos y un <code>split</code> asignado en arena, que juntos cerraron la mayor parte de la brecha en parsing de Buffer pesado en strings.
      </p>

      <h2>6. Strings: ASCII es el camino rápido</h2>
      <p>
        Los strings de JavaScript son UTF-16, pero la mayoría de los strings del mundo real (claves, identificadores, cabeceras HTTP, andamiaje JSON) son ASCII. v0.5.71 añadió un <strong><code>charCodeAt</code> y <code>codePointAt</code> O(1) para strings ASCII</strong> — sin escaneo UTF-16, solo un load de byte. v0.5.20 ya había hecho que <code>indexOf</code>, <code>slice</code> y <code>charAt</code> evitaran el escaneo UTF-16 en ASCII.
      </p>
      <p>
        Una nota de correctitud dentro de ese mismo release: <code>String.length</code> ahora devuelve unidades de código UTF-16 (spec ECMAScript) en lugar de conteo de bytes. Ese era un bug latente donde <code>&quot;caf&eacute;&quot;.length</code> devolvía 5 en lugar de 4.
      </p>

      <h2>7. Los servidores ahora se mantienen de verdad</h2>
      <p>
        El trabajo menos glamoroso de la semana fue también el más visible para el usuario: hacer que los servidores de larga duración estilo Node — Fastify, ws, http, net — no crashen después de unos minutos.
      </p>
      <p>
        Los crashes todos compartían una causa raíz: el GC no sabía sobre los closures de listeners. Cuando escribes <code>wss.on(&apos;message&apos;, handler)</code>, el closure captura variables, que viven como campos dentro de una celda asignada por el GC. Si el root scanner del GC no sabe que debe visitar esas celdas, sus capturas se reclaman y el siguiente evento de mensaje derreferencia memoria liberada.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: root-scan de closures de event listeners de <code>net.Socket</code> (cierra #35).</li>
        <li><strong>v0.5.27</strong>: extender a <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>.</li>
        <li><strong>v0.5.28</strong>: registrar globales a nivel de módulo como roots del GC (cierra #36). Bug de lifetime una capa arriba.</li>
        <li><strong>v0.5.21</strong>: seguridad de <code>gc()</code> dentro de los manejadores de peticiones de Fastify/WebSocket — la llamada explícita al GC estaba corriendo mientras los manejadores de peticiones mantenían punteros dentro de la arena (cierra #31).</li>
      </ul>
      <p>
        Junto con el trabajo de GC, v0.5.20 entregó un <strong>bucle de eventos principal</strong> — uno de verdad, no un placeholder — que mantiene vivos los servidores WebSocket y basados en timers en lugar de salir después de que la última llamada síncrona retorna (refs #28). Este fue el arreglo más impactante para cualquiera que intentara correr Perry como un servidor HTTP de producción. Fastify ahora se mantiene arriba. Los servidores WebSocket ahora se mantienen arriba.
      </p>
      <p>
        v0.5.19 arregló el mismatch de ABI SysV AMD64 para args/returns JSValue de FFI — un problema en Linux donde las llamadas FFI nativas podían corromper argumentos silenciosamente. v0.5.18 añadió dispatch nativo para <code>axios</code> (get/post/put/delete/patch), incluyendo <code>response.status</code> y <code>response.data</code>. v0.5.30 arregló el dispatch de <code>fastify request.header()</code> y <code>request.headers[]</code>, que había estado devolviendo undefined para búsquedas insensibles a mayúsculas.
      </p>

      <h2>8. <code>@perry/postgres</code>: el driver que hizo todo esto necesario</h2>
      <p>
        Gran parte del trabajo de esta semana fue impulsado por una carga de trabajo: hacer funcionar un <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">driver de Postgres</a> completamente compatible con Node sobre Perry-nativo. El driver soporta TLS, tiene un registro de codecs cross-module, soporta cancel/close/notify, y ahora se compara en benchmarks contra <code>pg</code>, <code>postgres.js</code>, y <code>tokio-postgres</code>.
      </p>
      <p>El trabajo de rendimiento del lado del driver fue paralelo al del lado del compilador:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hoist del codec por columna</strong> y eliminar las copias de Buffer por celda. BigInt(string) para int8 para evitar asignaciones intermedias.</li>
        <li><strong>Constructor dinámico de Row por shape</strong> para filas en forma de objeto. Si tu query siempre devuelve las mismas columnas, el driver construye un constructor de fila especializado por shape la primera vez y lo reutiliza — lo que, en combinación con el PIC del compilador, hace que el acceso a campos en las filas sea tan rápido como el acceso a campos en cualquier otro objeto.</li>
        <li><strong>Opt-out <code>parseTypes: &apos;minimal&apos;</code></strong> para llamadores que quieren strings crudos para int8/numeric/date.</li>
      </ul>
      <p>
        Este es el bucle de retroalimentación positiva que el compilador siempre estuvo destinado a habilitar. Un driver real saca a la superficie cuellos de botella reales. El cuello de botella obtiene un reproductor de una línea archivado como un issue de GitHub. Una semana de arreglos del compilador más tarde, el driver es más rápido y el compilador es más rápido para todos los demás también. Ese es todo el plan, comprimido en siete días.
      </p>

      <h2>9. Arreglos de correctitud que vale la pena nombrar</h2>
      <p>
        El trabajo de rendimiento saca a la superficie problemas de correctitud de la misma manera que dragar un río saca carritos de supermercado. Una lista parcial:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> estaba leyendo <code>.value</code> en el rechazo en lugar de <code>.reason</code>, así que los rechazos se tragaban silenciosamente (v0.5.13–v0.5.14).</li>
        <li><strong>Promise.any</strong> ahora lanza un <code>AggregateError</code> apropiado cuando todas las promises de entrada rechazan. Se añadió <code>Promise.withResolvers</code> y se arregló el orden de <code>queueMicrotask</code>.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> ahora produce un array de caracteres en lugar de un objeto roto (cierra #16).</li>
        <li><strong>Aritmética de BigInt y coerción de <code>BigInt()</code></strong> (cierra #33). El camino rápido de bigint i64 (v0.5.29) hace el caso común barato.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> con un argumento de byte numérico estaban comparando contra punteros de buffer en lugar de valores de byte (cierra #56).</li>
        <li><strong>Operaciones bitwise con NaN/Infinity</strong> producen 0 según la spec de ToInt32 (cierra #57).</li>
        <li><strong>Windows x86_64</strong>: cinco arreglos específicos de plataforma — <code>localtime</code>, descubrimiento de <code>clang</code>, y un puñado de ajustes de codegen — devolvieron Windows x86_64 a verde (v0.5.72).</li>
      </ul>

      <h2>10. Los números</h2>
      <p>
        El benchmark destacado del artículo anterior fue <code>factorial</code> a 24,6x más rápido que Node. Ese número no ha cambiado. Lo que se movió esta semana es todo lo que lo rodea:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Carga de trabajo</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (schema de 20 registros)</td><td className="text-right py-2 px-3">547x más lento que Node</td><td className="text-right py-2 px-3">1,3x más lento que Node</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (blur 5×5 a 4K)</td><td className="text-right py-2 px-3">1.980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4,3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Código pesado en propiedades (hit del PIC)</td><td className="text-right py-2 px-3">línea base</td><td className="text-right py-2 px-3">2–3x</td><td className="text-right py-2 px-3 text-green-400">2–3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1,3x</td></tr>
            <tr><td className="py-2 px-3">Uptime de Fastify bajo carga</td><td className="text-right py-2 px-3">~60s antes de crash</td><td className="text-right py-2 px-3">indefinido</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        La suite completa de 15 benchmarks contra Node sigue siendo 14 victorias y 1 empate — la misma tabla que el artículo anterior, con números ligeramente mejores en todos los frentes. El movimiento real esta semana es en cargas de trabajo que no estaban en esa suite: JSON, procesamiento de imágenes, servidores de larga duración. Ahí era donde vivían las brechas, y eso es lo que se cerró.
      </p>

      <h2>11. Qué sigue</h2>
      <p>
        El único benchmark que todavía estamos persiguiendo es <code>image_conv</code> vs Zig. Perry está en 457ms; Zig está en 246ms. Esa brecha es arquitectónica, no a nivel de pase de optimización, y vive en tres lugares:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Locales de buffer tipados</strong>. La mayor parte del trabajo de Buffer llegó esta semana, pero los parámetros de función y locales tipados como buffer todavía hacen unbox en cada acceso. El enfoque de slot <code>i64</code> que usamos para los contadores de bucle necesita extenderse a los buffers.</li>
        <li><strong>División de bucles interior/borde</strong>. El bucle de blur hace clamp a cada píxel, incluyendo el 99,9% de los píxeles que no lo necesitan. Dividir en regiones de borde (clampeadas) e interior (sin clamp) permite a LLVM vectorizar el interior con NEON <code>ld3</code>/<code>st3</code>.</li>
        <li><strong>Hash FNV-1a con doble ABI</strong>. El helper de hash se llama a través del ABI de NaN-box. Especializarlo a i64 crudo de entrada/salida para los caminos calientes son unas horas de trabajo que se pagarán en cada carga de trabajo pesada en hashing.</li>
      </ol>
      <p>
        Esos están rastreados en <code>PERF_ROADMAP.md</code>. Espera verlos en el próximo ciclo.
      </p>

      <h2>Cerrando</h2>
      <p>
        El patrón de esta semana — 68 releases de parche, casi todo rendimiento, una brecha de JSON pasando de 547x a 1,3x — es lo que pasa cuando cruzas al lado bueno de la colina de la transición a LLVM. El optimizador ahora es un aliado en lugar de un muro, y la mayor parte de lo que queda es trabajo pequeño, específico y medible: encuentra un camino lento, descubre por qué el optimizador no puede ver a través de él, expón la estructura, mide de nuevo. Ninguno de estos commits es exótico. Simplemente se aplican donde se necesitan.
      </p>
      <p>
        Si quieres probar algo de esto:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Issues, reproductores, y benchmarks que no son lo suficientemente rápidos: sigan viniendo. Este ritmo solo funciona porque los reportes de bugs son lo suficientemente específicos como para convertirse en reproductores de una línea. Cada commit en este artículo tiene un <code>#N</code> adjunto por una razón.
      </p>
      <p>— Ralph</p>
    </>
  );
}
