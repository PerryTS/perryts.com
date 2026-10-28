---
title: "Optimizarlo todo: una semana, 68 versiones y un acelerón JSON 547x"
excerpt: "Perry v0.5.13 → v0.5.80 en siete días. JSON.parse cierra una brecha 547x con Node. mimalloc aterriza como asignador global. Inline caches, transiciones de shape, slots de Buffer tipados, operaciones bitwise nativas en i32, scalar replacement y un event loop nativo que mantiene vivos los servidores Fastify y WebSocket."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
El último artículo del blog se lanzó con Perry en v0.5.12. Hoy estamos en v0.5.80. Eso son **68 releases de parche en siete días**, casi enteramente enfocados en una sola cosa: convertir cada camino lento restante en un camino rápido.

La transición a LLVM en v0.5.0 recuperó la paridad con Cranelift en v0.5.12. Ese fue el final de una historia y el comienzo de otra. LLVM ahora lo ve todo. La pregunta dejó de ser “¿por qué esto es lento?” y pasó a ser “¿por qué esto no es ya rápido?” — que es una pregunta mucho más tratable.

Este artículo es un recorrido por la semana. JSON obtuvo una aceleración de 547x. mimalloc se convirtió en el allocator global. El acceso a propiedades ganó una inline cache monomórfica. Los buffers ganaron slots de puntero tipados con metadata `noalias`. Los servidores Fastify y WebSocket dejaron de crashear después de un minuto. Y los benchmarks se movieron otra vez.

## 1\. JSON: cerrando una brecha de 547x

En v0.5.29, JSON.parse de Perry sobre un array de 20 registros era **547x más lento que Node**. Para v0.5.46 era 1,3x. Ese número es el mayor delta individual de la semana, y vale la pena recorrerlo porque cada otra optimización en este artículo es una variación del mismo tema: no hagas trabajo que no tienes que hacer.

El parser original asignaba un Vec por propiedad, un Vec de claves por objeto, y un thread-local protegido por RefCell para la cache de claves. Copiaba cada string. Re-hasheaba cada nombre de campo. Construía una shape de objeto totalmente nueva para cada registro, incluso cuando los 20 registros tenían exactamente los mismos campos en exactamente el mismo orden. El parser de Node maneja esto notando el patrón y compartiendo una sola shape entre todos los registros. El de Perry no lo hacía.

La solución llegó en cuatro pasos:

1.  **Interning de claves vía un thread-local `PARSE_KEY_CACHE`** (v0.5.45). El primer registro asigna N strings de clave; los registros del 2 al 20 asignan cero. Las claves repetidas resuelven al mismo puntero, lo que las hace utilizables como claves de búsqueda en la shape-cache sin un strcmp.
2.  **Compartición de shapes a través de la transition cache** (v0.5.45). Los objetos construidos por `js_object_set_field_by_name` recorren el mismo grafo de transiciones. Cuando el schema se repite, el puntero `keys_array` se comparte, y eso es lo que una inline cache polimórfica necesita para acertar.
3.  **Parsing de strings zero-copy + construcción incremental de objetos** (v0.5.46). `parse_string_bytes` ahora devuelve `ParsedStr::Borrowed(&[u8])` cuando no hay escapes de backslash — que es el caso común para cada clave y la mayoría de los valores. `parse_object` escribe los campos directamente en lugar de recolectarlos primero en un Vec.
4.  **Supresión del GC durante el parse** (v0.5.60, cierra #59). Parsear un array grande asigna miles de objetos pequeños en un bucle apretado. Cada uno estaba disparando la verificación del umbral del GC. Establecer un flag de “parsing en progreso” difiere la recolección hasta que el parse retorna — el mismo tamaño efectivo de heap, vastamente menos ramas de bookkeeping.

Luego stringify. JSON.stringify sobre arrays homogéneos — la misma shape, millones de veces — estaba haciendo iteración completa de propiedades por objeto, lo que para un array de shape estable es puro desperdicio. Una solución de cinco pasos cerró la mayor parte de esa brecha también:

-   v0.5.62: caminos rápidos itoa / ryu para números, verificación de referencia circular basada en profundidad en lugar de un HashSet.
-   v0.5.63: guard de `toJSON` + cache de claves persistente + dispatch inline (los tres costos por llamada que se sumaban).
-   v0.5.65: template de stringify para shape homogénea + camino rápido de escape ASCII. Cuando cada elemento tiene la misma shape, el andamiaje de clave/dos puntos/coma se precomputa una sola vez.
-   v0.5.70, v0.5.72, v0.5.75: cache de template de shape por llamada, cerrar la brecha del GC que quedaba del parse, matar el overhead fijo restante por llamada.
-   v0.5.79: el camino de valores pequeños. Números, booleans y strings cortos pasan por un camino directo que no configura nada de la maquinaria de objetos.

El resultado acumulado: un pipeline de JSON que estaba **547x por detrás de Node** al comienzo de la semana ahora está aproximadamente **1,3x por detrás en parse y es competitivo en stringify**, en cargas de trabajo realistas.

## 2\. La historia del allocator

Perry asigna mucho. Cada literal de objeto, cada literal de array, cada concatenación de strings, cada closure. El allocator es caliente, y para la mayor parte de v0.5 era el allocator de sistema por defecto de Rust más una arena thread-local para valores de vida corta.

v0.5.67 reemplazó el allocator global con **mimalloc**. Este es un cambio de una línea en Cargo.toml que se paga inmediatamente en cualquier carga de trabajo que haga muchas asignaciones pequeñas — que es todo programa TypeScript. v0.5.66 lo precedió consolidando todo el estado thread-local de `gc_malloc` en un único acceso TLS por llamada, para que el camino hacia mimalloc fuera lo más barato posible.

v0.5.68 llevó esto más allá con **strings asignados en arena**. Los strings de vida corta (resultados intermedios de concat, piezas de `split()`, scratch del parser) saltan el allocator global por completo y caen en una arena bump por hilo que se resetea en límites naturales. Para el parsing de JSON esto fue por sí solo una ganancia de dos dígitos porcentuales.

Y las dos optimizaciones que no asignan en absoluto:

-   **Scalar replacement de objetos no escapantes** (v0.5.17, luego literales de objeto en v0.5.76). Si un objeto nunca deja su función contenedora, no necesita existir. Sus campos se convierten en locales planos. LLVM maneja esto de fábrica una vez que dejas de esconder el objeto detrás de una llamada opaca al allocator.
-   **Scalar replacement de arrays no escapantes** (v0.5.73). La misma idea — si el array no escapa, sus elementos se convierten en valores SSA y toda la asignación desaparece.

Para el camino de literales de array específicamente, v0.5.69 añadió un **camino rápido de tamaño exacto** (saltar la maquinaria de crecimiento de capacidad cuando el tamaño se conoce en tiempo de compilación), y v0.5.74 inlineó el IR del bump-allocator para literales de array pequeños de modo que LLVM pueda ver la asignación, plegarla, izarla o eliminarla. Los benchmarks intensivos en arrays se movieron otro escalón.

Para rematar, v0.5.25 arregló un bug más silencioso: `gc_malloc` no estaba disparando la recolección en su propio camino, así que las cargas de trabajo pesadas en malloc podían hacer crecer el heap sin límite antes de que algo verificara. v0.5.61 añadió un dimensionamiento adaptativo de pasos al umbral, que es lo que realmente quieres: verificar barato cuando el heap es pequeño, menos a menudo cuando es grande.

## 3\. El acceso a propiedades ganó una inline cache de verdad

Todo motor moderno de JavaScript tiene una inline cache polimórfica (PIC) sobre el acceso a propiedades. Durante la mayor parte de la serie v0.5 de Perry, PropertyGet pasaba por una búsqueda en shape-table con un hash thread-local. Eso está bien para código frío. No está bien cuando el 95% de tus lecturas de propiedades en un call site dado ven la misma shape, que es casi siempre.

v0.5.44 trajo una **inline cache monomórfica** para `PropertyGet`. Cada sitio de PropertyGet obtiene una entrada de cache por call site: un puntero a shape esperada y un offset de campo. El camino de hit es una sola comparación más un load indexado. El camino de miss cae a un helper lento que actualiza la cache.

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

v0.5.51 añadió una **cache de transiciones de shape basada en hash de contenido** para escrituras dinámicas de propiedades. Dos objetos que hacen crecer los mismos campos en el mismo orden hashean a la misma transición, así que terminan compartiendo la misma shape — y eso significa que el lado de lectura del PIC realmente acierta.

v0.5.55 eliminó el último acceso TLS de la transition cache. v0.5.46 arregló un bug en el manejador de miss del PIC donde objetos con >8 campos estaban leyendo más allá de los slots inline en memoria no inicializada (cierra #55). v0.5.78 añadió un guard para evitar que el PIC de PropertyGet indexara en receptores no-puntero como números crudos — que podía pasar en refinamiento de tipos demasiado optimista y fue uno de los últimos problemas de estabilidad en el IC.

Efecto neto: el código pesado en propiedades — que en la práctica significa la mayoría del TypeScript — es aproximadamente 2–3x más rápido que hace una semana, solo por el IC.

## 4\. Enteros, bitwise, y el patrón `| 0`

NaN-boxing hace que cada número sea un f64. Los programadores de TypeScript escriben `x | 0` para forzar semántica de entero. V8 ha pasado quince años haciendo eso barato. Perry pasó esta semana poniéndose al día.

La pila de cambios, en orden:

-   **v0.5.48**: `sdiv` para `(int / const) | 0`. LLVM lo pliega a `smulh + asr`, que son ~2 ciclos vs ~10 para `fdiv`.
-   **v0.5.48**: `@llvm.assume` sobre los límites de Uint8ArrayGet. Reemplaza el diamante de rama+phi de verificación de límites con un solo bloque básico sobre el cual el vectorizador puede razonar.
-   **v0.5.49**: arreglar operaciones bitwise con NaN/Infinity para que produzcan 0 según la spec de ToInt32. Correctitud primero.
-   **v0.5.50**: `toint32_fast` que salta el guard de NaN/Inf de 5 instrucciones cuando se sabe que el valor es finito. Además `alwaysinline` en helpers pequeños y detección de clamp.
-   **v0.5.52**: apuntar a funciones clamp directamente con intrínsecos `smin`/`smax`. Clamp es el patrón entero más común después del incremento.
-   **v0.5.53**: `x | 0` y `x >>> 0` sobre un valor conocido-finito se convierten en un noop — solo `fptosi + sitofp`, sin guard en absoluto.
-   **v0.5.56**: operaciones bitwise nativas i32; índice y valor i32 en Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60**: `Math.imul` baja a la multiplicación nativa i32 en lugar del camino polyfill. La detección de polyfill reconoce shims de `Math.imul` escritos por el usuario y los reemplaza.
-   **v0.5.59**: inlining de init de funciones puras + seeding de locales enteros. El análisis entero local de funciones puede ver más allá de los límites de llamadas cuando el callee es pequeño y puro.
-   **v0.5.37–v0.5.40**: camino rápido de aritmética entera con patrón acumulador. El clásico bucle `for (...) acc += f(i)` se mantiene en i32 de extremo a extremo cuando los tipos lo permiten.

v0.5.41 es el sutil. Cuando el codegen ve un `const K: number[][] = [[...], ...]` a nivel de módulo, baja todo eso a una constante plana `[N x i32]` en `.rodata`. `K[y][x]` se convierte en un único `getelementptr + load i32`. Combinado con el puente de análisis entero en v0.5.43, esto es lo que le dio a `image_conv` (un blur gaussiano 5×5 sobre un frame RGB 4K) una **aceleración de 3x en un solo release**.

## 5\. Buffers y Uint8Array

Las cargas de trabajo binarias — crypto, procesamiento de imágenes, parsing, networking — viven en Buffer y Uint8Array. v0.5.64 les dio **slots de puntero tipados más metadata `noalias`**. Donde un Buffer solía ser un double NaN-boxed en un `alloca double`, ahora es un puntero `i64` crudo en un `alloca i64`, con anotaciones de LLVM que le dicen al optimizador “este puntero no hace alias con otros punteros en el alcance”. Eso desbloquea reordenamiento de load/store, vectorización y asignación de registros que el optimizador de otro modo se negaría a hacer.

v0.5.80 cerró el último problema de correctitud aquí: un contador `alias-scope` de buffer a nivel de módulo que se estaba reseteando por función, lo que en raros casos podía dejar a LLVM razonar a través de scopes que no deberían compartir un scope ID. Ahora el contador es a nivel de módulo y la historia de `noalias` es hermética.

v0.5.53 hizo `Uint8ArraySet` sin ramas — un store enmascarado en lugar de un if/else que escribía 0 fuera de límites. v0.5.54 añadió un **Two-Way indexOf** para patrones más largos y un `split` asignado en arena, que juntos cerraron la mayor parte de la brecha en parsing de Buffer pesado en strings.

## 6\. Strings: ASCII es el camino rápido

Los strings de JavaScript son UTF-16, pero la mayoría de los strings del mundo real (claves, identificadores, cabeceras HTTP, andamiaje JSON) son ASCII. v0.5.71 añadió un **`charCodeAt` y `codePointAt` O(1) para strings ASCII** — sin escaneo UTF-16, solo un load de byte. v0.5.20 ya había hecho que `indexOf`, `slice` y `charAt` evitaran el escaneo UTF-16 en ASCII.

Una nota de correctitud dentro de ese mismo release: `String.length` ahora devuelve unidades de código UTF-16 (spec ECMAScript) en lugar de conteo de bytes. Ese era un bug latente donde `"café".length` devolvía 5 en lugar de 4.

## 7\. Los servidores ahora se mantienen de verdad

El trabajo menos glamoroso de la semana fue también el más visible para el usuario: hacer que los servidores de larga duración estilo Node — Fastify, ws, http, net — no crashen después de unos minutos.

Los crashes todos compartían una causa raíz: el GC no sabía sobre los closures de listeners. Cuando escribes `wss.on('message', handler)`, el closure captura variables, que viven como campos dentro de una celda asignada por el GC. Si el root scanner del GC no sabe que debe visitar esas celdas, sus capturas se reclaman y el siguiente evento de mensaje derreferencia memoria liberada.

-   **v0.5.26**: root-scan de closures de event listeners de `net.Socket` (cierra #35).
-   **v0.5.27**: extender a `ws`, `http`, `events`, `fastify`.
-   **v0.5.28**: registrar globales a nivel de módulo como roots del GC (cierra #36). Bug de lifetime una capa arriba.
-   **v0.5.21**: seguridad de `gc()` dentro de los manejadores de peticiones de Fastify/WebSocket — la llamada explícita al GC estaba corriendo mientras los manejadores de peticiones mantenían punteros dentro de la arena (cierra #31).

Junto con el trabajo de GC, v0.5.20 entregó un **bucle de eventos principal** — uno de verdad, no un placeholder — que mantiene vivos los servidores WebSocket y basados en timers en lugar de salir después de que la última llamada síncrona retorna (refs #28). Este fue el arreglo más impactante para cualquiera que intentara correr Perry como un servidor HTTP de producción. Fastify ahora se mantiene arriba. Los servidores WebSocket ahora se mantienen arriba.

v0.5.19 arregló el mismatch de ABI SysV AMD64 para args/returns JSValue de FFI — un problema en Linux donde las llamadas FFI nativas podían corromper argumentos silenciosamente. v0.5.18 añadió dispatch nativo para `axios` (get/post/put/delete/patch), incluyendo `response.status` y `response.data`. v0.5.30 arregló el dispatch de `fastify request.header()` y `request.headers[]`, que había estado devolviendo undefined para búsquedas insensibles a mayúsculas.

## 8\. `@perry/postgres`: el driver que hizo todo esto necesario

Gran parte del trabajo de esta semana fue impulsado por una carga de trabajo: hacer funcionar un [driver de Postgres](https://github.com/PerryTS/postgres) completamente compatible con Node sobre Perry-nativo. El driver soporta TLS, tiene un registro de codecs cross-module, soporta cancel/close/notify, y ahora se compara en benchmarks contra `pg`, `postgres.js`, y `tokio-postgres`.

El trabajo de rendimiento del lado del driver fue paralelo al del lado del compilador:

-   **Hoist del codec por columna** y eliminar las copias de Buffer por celda. BigInt(string) para int8 para evitar asignaciones intermedias.
-   **Constructor dinámico de Row por shape** para filas en forma de objeto. Si tu query siempre devuelve las mismas columnas, el driver construye un constructor de fila especializado por shape la primera vez y lo reutiliza — lo que, en combinación con el PIC del compilador, hace que el acceso a campos en las filas sea tan rápido como el acceso a campos en cualquier otro objeto.
-   **Opt-out `parseTypes: 'minimal'`** para llamadores que quieren strings crudos para int8/numeric/date.

Este es el bucle de retroalimentación positiva que el compilador siempre estuvo destinado a habilitar. Un driver real saca a la superficie cuellos de botella reales. El cuello de botella obtiene un reproductor de una línea archivado como un issue de GitHub. Una semana de arreglos del compilador más tarde, el driver es más rápido y el compilador es más rápido para todos los demás también. Ese es todo el plan, comprimido en siete días.

## 9\. Arreglos de correctitud que vale la pena nombrar

El trabajo de rendimiento saca a la superficie problemas de correctitud de la misma manera que dragar un río saca carritos de supermercado. Una lista parcial:

-   **Promise.race** estaba leyendo `.value` en el rechazo en lugar de `.reason`, así que los rechazos se tragaban silenciosamente (v0.5.13–v0.5.14).
-   **Promise.any** ahora lanza un `AggregateError` apropiado cuando todas las promises de entrada rechazan. Se añadió `Promise.withResolvers` y se arregló el orden de `queueMicrotask`.
-   **`[..."hello"]`** ahora produce un array de caracteres en lugar de un objeto roto (cierra #16).
-   **Aritmética de BigInt y coerción de `BigInt()`** (cierra #33). El camino rápido de bigint i64 (v0.5.29) hace el caso común barato.
-   **Buffer.indexOf / Buffer.includes** con un argumento de byte numérico estaban comparando contra punteros de buffer en lugar de valores de byte (cierra #56).
-   **Operaciones bitwise con NaN/Infinity** producen 0 según la spec de ToInt32 (cierra #57).
-   **Windows x86\_64**: cinco arreglos específicos de plataforma — `localtime`, descubrimiento de `clang`, y un puñado de ajustes de codegen — devolvieron Windows x86\_64 a verde (v0.5.72).

## 10\. Los números

El benchmark destacado del artículo anterior fue `factorial` a 24,6x más rápido que Node. Ese número no ha cambiado. Lo que se movió esta semana es todo lo que lo rodea:

| Carga de trabajo | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (schema de 20 registros) | 547x más lento que Node | 1,3x más lento que Node | ~420x |
| image\_conv (blur 5×5 a 4K) | 1.980ms | 457ms | 4,3x |
| Código pesado en propiedades (hit del PIC) | línea base | 2–3x | 2–3x |
| Fibonacci(40)| 401ms | 309ms | 1,3x |
| Uptime de Fastify bajo carga | ~60s antes de crash | indefinido | ∞ |

La suite completa de 15 benchmarks contra Node sigue siendo 14 victorias y 1 empate — la misma tabla que el artículo anterior, con números ligeramente mejores en todos los frentes. El movimiento real esta semana es en cargas de trabajo que no estaban en esa suite: JSON, procesamiento de imágenes, servidores de larga duración. Ahí era donde vivían las brechas, y eso es lo que se cerró.

## 11\. Qué sigue

El único benchmark que todavía estamos persiguiendo es `image_conv` vs Zig. Perry está en 457ms; Zig está en 246ms. Esa brecha es arquitectónica, no a nivel de pase de optimización, y vive en tres lugares:

1.  **Locales de buffer tipados**. La mayor parte del trabajo de Buffer llegó esta semana, pero los parámetros de función y locales tipados como buffer todavía hacen unbox en cada acceso. El enfoque de slot `i64` que usamos para los contadores de bucle necesita extenderse a los buffers.
2.  **División de bucles interior/borde**. El bucle de blur hace clamp a cada píxel, incluyendo el 99,9% de los píxeles que no lo necesitan. Dividir en regiones de borde (clampeadas) e interior (sin clamp) permite a LLVM vectorizar el interior con NEON `ld3`/`st3`.
3.  **Hash FNV-1a con doble ABI**. El helper de hash se llama a través del ABI de NaN-box. Especializarlo a i64 crudo de entrada/salida para los caminos calientes son unas horas de trabajo que se pagarán en cada carga de trabajo pesada en hashing.

Esos están rastreados en `PERF_ROADMAP.md`. Espera verlos en el próximo ciclo.

## Cerrando

El patrón de esta semana — 68 releases de parche, casi todo rendimiento, una brecha de JSON pasando de 547x a 1,3x — es lo que pasa cuando cruzas al lado bueno de la colina de la transición a LLVM. El optimizador ahora es un aliado en lugar de un muro, y la mayor parte de lo que queda es trabajo pequeño, específico y medible: encuentra un camino lento, descubre por qué el optimizador no puede ver a través de él, expón la estructura, mide de nuevo. Ninguno de estos commits es exótico. Simplemente se aplican donde se necesitan.

Si quieres probar algo de esto:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Fuente: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Documentos: [docs.perryts.com](https://docs.perryts.com) — Registro de cambios: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issues, reproductores, y benchmarks que no son lo suficientemente rápidos: sigan viniendo. Este ritmo solo funciona porque los reportes de bugs son lo suficientemente específicos como para convertirse en reproductores de una línea. Cada commit en este artículo tiene un `#N` adjunto por una razón.

— Ralph
