---
title: "De Cranelift a LLVM: qué se rompió y cómo lo arreglamos"
excerpt: "La migración del backend de Perry de Cranelift a LLVM está completa. La transición inicial hizo los benchmarks 70x más lentos — esto es lo que se rompió y las seis optimizaciones específicas que lo arreglaron."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Corrección (septiembre de 2026):** El benchmark de abajo llamado «factorial» tenía un nombre incorrecto: suma `i % 1000` en un bucle y no calcula ningún factorial. La cifra de 24,6x provenía de una ejecución antigua de Node.js que no se reproduce; en nuestro harness publicado actual es un empate con Node.js (93 ms frente a 95 ms). Es un microbenchmark de una ruta rápida de módulo entero, no una medida del rendimiento típico de TypeScript. Los resultados de abajo se conservan como registro histórico. Las cifras actuales, incluidos los benchmarks que Perry pierde, están en el [README de Perry](https://github.com/PerryTS/perry#performance).

La migración del backend de Perry de Cranelift a LLVM está completa. A partir de v0.5.12, LLVM es el único backend de generación de código, y Perry ahora supera a Node.js en cada benchmark — con márgenes que van de 1,7x a 24,6x (con dos empates).

Llegar hasta aquí no fue un camino recto. La transición inicial en v0.5.0 hizo que varios benchmarks fueran **70x más lentos** que la versión con Cranelift a la que reemplazaba. Este artículo es la versión larga de lo que pasó, por qué hicimos el cambio de todos modos, qué se rompió, qué lo arregló y cómo lucen los números al otro lado.

Si estás construyendo un compilador, evaluando backends de codegen, o simplemente tienes curiosidad de por qué “cambiar a LLVM” rara vez es tan simple como suena, esto es para ti.

## Parte 1: ¿Por qué cambiar?

Perry compila TypeScript directamente a código máquina nativo. Sin Node, sin V8, sin Electron, sin WebView. La propuesta es “escribe TypeScript, entrega un binario nativo”, y toda la propuesta de valor se derrumba si ese binario no es realmente rápido.

Durante las primeras versiones menores de Perry, el backend de codegen fue [Cranelift](https://cranelift.dev/). Cranelift es excelente — es el codegen detrás de wasmtime, lo usa el JIT baseline de SpiderMonkey, y es la herramienta de elección cuando necesitas compilación rápida y predecible con una historia de integración limpia. Para un proyecto que arranca un nuevo lenguaje, fue el punto de partida correcto.

Pero dos cosas nos empujaron a dejarlo.

### 1\. El techo del optimizador

Cranelift es intencionalmente un compilador optimizador rápido de un solo nivel. Su mandato es “producir código decente rápidamente”, no “producir el mejor código posible sin límite de tiempo”. Ese es el compromiso correcto para un JIT. Es el compromiso equivocado para un compilador AOT cuyo argumento de venta es el rendimiento nativo.

LLVM tiene más de dos décadas de trabajo invertido en su middle-end. Vectorización de bucles, LICM, GVN, SCCP, combinación de instrucciones, heurísticas de inlining, reasociación fast-math, análisis de alias — no existe un universo realista en el que un proyecto más pequeño alcance ese nivel. Si Perry va a afirmar “más rápido que Node”, necesitamos esa maquinaria.

### 2\. El problema de arm64\_32

El detonante inmediato fue el Apple Watch. `arm64_32` es un ABI que Apple introdujo para el Series 4 en adelante — instrucciones de 64 bits, punteros de 32 bits. Cranelift no lo soporta, y no había un camino realista para que llegara. Para que Perry afirme con credibilidad “9 plataformas desde una sola base de código”, watchOS no podía faltar. LLVM soporta `arm64_32` de fábrica.

Una vez que aceptamos que *algunos* targets requerirían LLVM, mantener dos backends se volvió insostenible. Dos backends significan dos conjuntos de bugs, dos conjuntos de pases de optimización, dos matrices de pruebas, dos líneas base de rendimiento. La respuesta honesta fue: elegir uno.

Elegimos LLVM.

## Parte 2: Una nota sobre Cranelift

Antes de continuar: este artículo no es un derribo de Cranelift. Cranelift es una pieza brillante de ingeniería, y si estás construyendo un JIT, un runtime sandboxed, o cualquier cosa donde la latencia de compilación importa más que el rendimiento máximo, debería estar al tope de tu lista. wasmtime lo usa por buenas razones. La Bytecode Alliance está haciendo un trabajo ejemplar.

Las necesidades de Perry simplemente son diferentes. Compilamos con anticipación, entregamos el binario una vez, y el usuario lo ejecuta millones de veces. Esa asimetría — compilar raramente, ejecutar siempre — es exactamente el régimen donde el optimizador más pesado de LLVM se paga solo. Herramienta diferente para un trabajo diferente.

## Parte 3: El desastre de la transición

v0.5.0 fue el primer release con LLVM como único backend. Esperábamos una pequeña regresión en tiempo de compilación y una mejora significativa en rendimiento en tiempo de ejecución. Obtuvimos lo opuesto de lo segundo.

Aquí está la tabla que no quería publicar en ese momento:

| Benchmark | Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| method\_calls | 16ms | 1,084ms | 68x slower |
| object\_create | 5ms | 318ms | 64x slower |
| matrix\_multiply | 61ms | 184ms | 3x slower |
| math\_intensive | 370ms | 131ms | 2.8x faster |
| nested\_loops | 32ms | 57ms | 1.8x slower |
| fibonacci(40) | 505ms | 1,156ms | 2.3x slower |

Algunas cargas de trabajo se aceleraron. La mayoría empeoró drásticamente. `method_calls` — uno de los benchmarks más importantes porque representa el uso idiomático de clases en TypeScript — fue casi 70x peor que lo que habíamos entregado dos releases antes.

### Qué salió mal realmente

Perry usa **NaN-boxing** para la representación de valores. Cada valor TypeScript es una palabra de 64 bits. Los números f64 se almacenan directamente; todo lo demás (objetos, strings, booleans, undefined, null) se codifica en los bits no utilizados de un IEEE 754 quiet NaN.

La ventaja: los números son de costo cero. Sin boxing, sin tagging, sin asignación de memoria para la aritmética.

La desventaja: cada operación sobre un valor que no es número requiere manipulación de bits para desempaquetar, operar y volver a empaquetar. Si esas secuencias están como IR inline en tu codegen, el optimizador puede fusionarlas y simplificarlas. Si están como **llamadas a funciones helper del runtime**, el optimizador ve una llamada opaca y se rinde.

Nuestro backend de Cranelift había acumulado un gran número de lowerings inline para operaciones calientes — cargas de propiedades, dispatch de métodos, asignación de objetos, aritmética entera sobre valores etiquetados como f64. La transición a LLVM, en aras de sacar código *correcto* primero, canalizó casi todas esas operaciones a través de helpers del runtime en `perry-runtime`. Cada helper era una instrucción `call` en LLVM IR.

LLVM es excelente, pero no puede hacer inline de una función cuyo cuerpo nunca ha visto. `perry-runtime` se compila por separado, se enlaza al final, y desde la perspectiva del optimizador cada llamada a un helper es una caja negra. El resultado fue que bucles calientes que el backend de Cranelift había compilado a ~5 instrucciones de aritmética inline ahora se compilaban a llamadas de función — guardado de registros, configuración de stack frame, todo el paquete — repetido millones de veces.

De ahí vinieron los 70x. No era mal codegen. Eran malas **fronteras de inlining**.

## Parte 4: La solución

El trabajo para recuperar y superar los números de Cranelift cayó aproximadamente en seis categorías. Ninguna es exótica. La mayoría son optimizaciones de compilador de libro de texto que simplemente tenían que aplicarse en los lugares correctos.

### 1\. Bump allocator inline para asignación de objetos

`object_create` fue la peor regresión después de `method_calls`. El camino anterior llamaba a `js_object_alloc_class_with_keys` para cada `new Point()` — una llamada de función, un acceso a arena thread-local, una búsqueda en la cache de shapes, y una escritura del GC header + object header.

La solución: emitir la asignación bump **inline** en LLVM IR. Cada función que asigna objetos obtiene un puntero cacheado a una estructura `InlineArenaState` thread-local. La asignación se convierte en:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
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
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

El camino rápido son ~13 instrucciones de IR inline que LLVM puede ver, planificar y sacar de los bucles. `object_create` pasó de 318ms a 9ms.

### 2\. Contadores de bucle i32

NaN-boxing significa que cada número TypeScript es f64. Eso incluye los contadores de bucle. Un bucle `for (let i = 0; i < 100_000_000; i++)` con variables de inducción f64 es un desastre: incremento f64, comparación f64, conversión f64-a-i64 cada vez que se indexa un array.

El codegen detecta bucles for donde la variable de inducción es probablemente entera y asigna un **slot de pila i32 paralelo**. La condición del bucle cambia de `fcmp` a `icmp slt i32`, eliminando el contador f64 por completo.

Esto llevó `array_write` de 11ms a 3ms, `nested_loops` de 18ms a 9ms, y `array_read` de 11ms a 4ms.

### 3\. Flags de fast-math

Adjuntamos flags `reassoc contract` a cada instrucción aritmética f64. `reassoc` permite a LLVM romper cadenas de acumulador seriales en paralelas, y `contract` permite multiply-add fusionado. Mantenemos `nnan` y `ninf` desactivados porque Perry usa los bits NaN como etiquetas de valor.

Con esos flags, el vectorizador de bucles de LLVM se activa en `math_intensive`, que cayó de 131ms a 14ms — superando a Node por 3,5x.

### 4\. Camino rápido para módulo entero

`%` sobre f64 en JavaScript es `fmod`, que es una llamada a libm en ARM. Pero para operandos f64 de valor entero, podemos hacer `fptosi → srem → sitofp` y saltar el viaje de ida y vuelta por libm completamente. El codegen usa análisis estático para detectar operandos de valor entero — no se necesita verificación en runtime.

Esta es la razón completa por la que `factorial` pasó de 1.553ms a 24ms — y de los 591ms de Node a 24ms. **24,6x más rápido que Node.**

### 5\. LICM para bucles anidados

LLVM hace loop-invariant code motion de forma nativa, pero NaN-boxing oculta la estructura. `arr.length` se baja a un load a través de un puntero NaN-boxed con una verificación de etiqueta — no es obviamente invariante.

El codegen detecta el patrón `for (...; i < arr.length; ...)` y precarga la longitud en un slot de pila antes del bucle, con un walker estático que verifica que el cuerpo del bucle no puede cambiar la longitud del array. Cuando el contador está acotado por esta longitud izada, IndexGet/IndexSet omiten las verificaciones de límites por completo.

### 6\. Objetos con cache de shapes

Cuando el codegen conoce la clase de un objeto, resuelve los offsets de campo en tiempo de compilación y emite **cargas indexadas directas** — sin dispatch en runtime. Para el dispatch de métodos, `obj.method(args)` se convierte en un `call @perry_method_Class_name(this, args)` directo — sin vtable, sin inline cache, sin búsqueda hash.

La transición a LLVM había regresado esto al camino lento universal. Restaurar el dispatch estático nos dio la recuperación de `method_calls` — de 1.084ms de vuelta a 1ms. **11x más rápido que Node.**

## Parte 5: Los números hoy

Mediana de tres ejecuciones, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Benchmark | Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| factorial | 24ms | 591ms | 24.6x |
| method\_calls | 1ms | 11ms | 11x |
| loop\_overhead | 12ms | 53ms | 4.4x |
| math\_intensive | 14ms | 49ms | 3.5x |
| array\_read | 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array\_write | 3ms | 8ms | 2.6x |
| string\_concat | 1ms | 2ms | 2x |
| nested\_loops | 9ms | 16ms | 1.7x |
| prime\_sieve | 4ms | 7ms | 1.7x |
| matrix\_multiply | 21ms | 34ms | 1.6x |
| fibonacci(40) | 401ms | 991ms | 2.5x |
| binary\_trees | 9ms | 9ms | tied |
| mandelbrot | 24ms | 24ms | tied |
| object\_create | 9ms | 8ms | 0.9x |

Cada benchmark es una victoria o un empate. El más reñido es `object_create` (9ms vs 8ms), donde el allocator de V8 es genuinamente excelente.

## Parte 6: La pregunta del tiempo de compilación

La razón número uno por la que la gente elige Cranelift sobre LLVM es la velocidad de compilación. Así que hablemos de eso.

LLVM aumentó el tiempo de compilación por archivo de Perry en **20-50ms**, o aproximadamente **8-19%**. No 5x. No 2x. Porcentaje de un solo dígito a doble dígito bajo.

La razón es que el codegen no es el cuello de botella en el pipeline de Perry. El desglose para un archivo típico:

-   SWC parsing: ~30%
-   HIR lowering (AST → IR, inferencia de tipos): ~25%
-   Pases de transformación IR (conversión de closures, async lowering, inlining): ~15%
-   **Codegen (emisión de texto LLVM IR + `clang -c -O3`): ~20%**
-   Linking (`cc` + biblioteca de runtime): ~10%

El codegen es una porción de cinco. Incluso duplicar esa porción solo mueve el total un 5-10%. Si estás construyendo un compilador AOT donde el usuario escribe `perry compile` una vez y luego ejecuta el binario para siempre, el cálculo es: gastar 25ms más en tiempo de compilación, ahorrar hasta 24x en cada ejecución.

## Parte 7: Qué haría diferente

Si empezara Perry hoy y pudiera saltar directamente a LLVM, no lo haría. La fase de Cranelift fue genuinamente valiosa. Nos permitió iterar en el frontend sin el impuesto de complejidad de LLVM, nos dio una línea base funcional contra la cual comparar, y nos obligó a mantener nuestro HIR lo suficientemente limpio como para ser portable entre backends.

Lo que haría diferente es la transición en sí. Lanzamos v0.5.0 con la mayoría de operaciones pasando por llamadas a helpers del runtime, con la intención de inlinearlas después. Eso fue un error. El orden correcto habría sido: identificar los caminos calientes primero, bajarlos inline antes de la transición, y solo lanzar cuando el backend LLVM estuviera al menos en paridad.

La lección es la aburrida: las fronteras de optimización importan más que la calidad del optimizador. LLVM es una pieza de software notable, pero no puede ayudarte con código que no puede ver. Si tu codegen canaliza todo a través de llamadas opacas al runtime, has construido un muro entre tu programa fuente y cada pase de optimización que existe.

## Conclusión

Perry ahora es solo LLVM, más rápido que Node en cada benchmark, y en producción. La migración tomó más tiempo del que planeé, dolió más de lo que esperaba en el medio, y es inequívocamente la decisión correcta en retrospectiva. Cranelift nos llevó hasta v0.5; LLVM nos lleva el resto del camino.

Si quieres probar Perry:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Ejecuta los benchmarks tú mismo: `cd benchmarks/suite && ./run_benchmarks.sh`

Si tienes preguntas, encuentras bugs o quieres debatir sobre backends de codegen, los issues de GitHub están abiertos. Los leo todos.

— Ralph
