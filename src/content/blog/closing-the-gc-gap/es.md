---
title: "Lo que el benchmark de aya_koto nos enseñó sobre el GC de Perry"
excerpt: "Un lector benchmarkeó Perry en AtCoder ABC451D y lo midió 3,85× más lento que Bun. Una regresión silenciosa había ampliado el gap a 6,59× desde entonces. El fix no estaba donde lo esperábamos, el trade-off deliberado del GC que reveló era real, y Perry v0.5.875 ahora empata con Bun en el mismo bench: 425 ms vs 431 ms."
date: 2026-05-12
tags: ["GC", "performance", "benchmarks", "community"]
---
Hace unas semanas, [Ayasaka-Koto](https://zenn.dev/aya_koto) (@axt\_ayakoto en X) publicó [un benchmark de Perry contra Deno y Bun](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4) sobre el problema ABC451D de AtCoder, “Concat Power of 2.” Su medición: Perry corría **3.85× más lento que Bun**. Su conclusión fue cortés pero firme — Perry no estaba listo para ser un runtime de programación competitiva, y quizá no lo estaría ni siquiera al madurar.

Le debemos un seguimiento. Aquí está dónde aterrizamos en el mismo benchmark, con el mismo comando `hyperfine`, en la misma clase de máquina:

```
Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster
```

Cerrar ese gap requirió una investigación que empezó con una hipótesis equivocada, encontró un trade-off de arquitectura de GC real pero deliberado, y produjo un resultado que creemos que merece escribirse — no porque alcanzamos a alguien, sino porque la forma en que el trade-off se veía bajo el profiling es interesante en sí misma.

## El benchmark

El `abc451d-perry.ts` de aya\_koto hace una búsqueda en profundidad recursiva sobre concatenaciones de strings potencia-de-2, deduplicadas a través de un `Set<number>` y ordenadas. La función caliente es corta:

```
function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}
```

La forma es la historia. Cada llamada aloca un `string[]` nuevo. La recursión es profunda — factor de ramificación de hasta aproximadamente 30 en la cima — y cada frame padre mantiene su array `answers` vivo mientras itera el array del hijo y hace push sobre el suyo propio. Allocations de vida corta, recursión profunda, referencias vivas dispersas por cada bloque de arena activo. Esto resultó ser exactamente la carga de trabajo contra la que el GC de Perry *no* estaba afinado.

## La hipótesis equivocada

Un lector había dejado una nota al pie en el artículo de aya\_koto señalando que el BigInt de Perry era internamente un entero de longitud fija de 1024 bits, y que los programas con uso intensivo de BigInt corrían aproximadamente 4× más lento que Bun. ABC451D involucra potencias de 2 — números grandes parecían plausibles — y así el primer instinto fue: BigInt es el culpable, arregla el camino de BigInt, el gap se cierra.

No lo era. `grep -i bigint abc451d-perry.ts` no devolvió nada. El benchmark usa `number` en todas partes; cada valor cabe cómodamente por debajo de 2^53. La nota al pie sobre BigInt era correcta, real, y un problema que merecía arreglarse — y lo arreglamos, por separado, en v0.5.736. Pero no tenía nada que ver con ABC451D.

El costo de perseguir primero la hipótesis equivocada fue de aproximadamente un día. La lección — que me gustaría afirmar que ya conocíamos — fue: haz profiling antes de comprometerte con una teoría, incluso cuando la teoría viene de una fuente creíble y coincide con tus prejuicios. Especialmente entonces.

## Reproduciendo el bench

Lo primero que hicimos una vez que dejamos de perseguir BigInt fue reproducir los números de aya\_koto de forma limpia. Esperábamos aterrizar cerca de sus 1.219 s en Perry. Aterrizamos en **2.998 s** en Perry v0.5.729.

Eso es una regresión de 2.5× entre la versión que él probó y nuestro main de entonces. Deno y Bun se reprodujeron dentro del 50% de sus números (hardware distinto, deriva de versiones). El gap de Perry había crecido de 3.85× a 6.59× sin que nadie estuviera mirando.

No hicimos bisect de qué commit causó la regresión — quedó fuera del alcance de esta investigación. Pero la ausencia de una barandilla de CI que hubiera atrapado la deriva es en sí misma un hallazgo, y volveremos a ello al final.

## Diagnóstico guiado por profiling

Compilado con `PERRY_DEBUG_SYMBOLS=1` y grabado con `samply`, la imagen del self-time era inequívoca:

```
% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator
```

**El 76% del self time era maquinaria de GC.** El tiempo inclusivo coincidía: `gc_collect_minor` al 80%, `Arena::alloc` al 76%, `js_array_alloc` al 45%, `js_array_push_f64` al 22%. El `search()` recursivo estaba caliente, pero estaba caliente por debajo de la fase de marcado del GC. Cada llamada estaba disparando suficiente allocation como para gatillar una colección.

Un microbenchmark de control negativo confirmó que la ralentización no era general. `fib(80) × 100_000` con enteros apretados, sin allocation: Perry **6.1 ms** vs Bun **24.7 ms** — Perry 4× más rápido. El codegen para bucles calientes sin allocation ya iba por delante de Bun. El gap de ABC451D estaba concentrado en un camino de código específico: throughput de allocation más el mark-sweep del GC sobre esta forma de allocation en particular.

## La pistola humeante

Teníamos un flag — `PERRY_GC_DIAG=1` — que imprimía estadísticas de GC por ciclo. La salida fue la observación de carga del cojín de toda la investigación:

```
[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+
```

Cada ciclo, el mismo patrón. El sweep identificaba correctamente que **el 55–60% de los objetos alocados estaban muertos**. Y la arena recuperaba **cero bloques**. El heap crecía de forma monótona durante la ejecución, mientras el GC seguía pagando el costo del mark-sweep sobre un working set cada vez mayor.

¿Por qué `block_reclaim=0` a pesar de que más de la mitad de los objetos estaban muertos? Porque el GC de arena de Perry recupera a granularidad de bloque. Un bloque de 1 MB se resetea solo cuando cada objeto dentro de él está muerto. En ABC451D, el `search()` recursivo mantiene referencias vivas — el array `answers` del frame padre — dispersas por cada bloque activo. Ningún bloque está nunca enteramente muerto. El mark-sweep identifica correctamente los objetos muertos, no tiene camino de recuperación por objeto, y así no hace nada con ellos. El heap crece, los gatillos del GC disparan sobre una cinta de correr, y el costo de cada ciclo sube a medida que sube el working set.

## El trade-off deliberado

Lo más informativo que encontramos no estaba en el profile. Estaba en el sweep mismo, en `crates/perry-runtime/src/gc.rs:2733`, como un comentario que explicaba el diseño:

> Deliberadamente NO empujamos objetos muertos a la `ARENA_FREE_LIST` global. El bump allocator inline nunca lee la free list — usa el reset por bloque en su lugar. Empujar objetos muertos a la free list costaría ~50ns por objeto × ~700k objetos por GC × ~12 ciclos de GC por benchmark = 420ms de puro desperdicio en `object_create`.

Esto es exactamente correcto para la carga de trabajo contra la que se afinó. `object_create` es un benchmark que nos importa, donde las allocations mueren en un bucle apretado y bloques enteros sí quedan vacíos entre ciclos. Añadir un pase de free-list por objeto quemaría 420 ms de contabilidad sin sentido para esa carga, y el camino de reset por bloque captura la misma memoria más barato.

Es un mal ajuste para la forma de ABC451D, donde las referencias vivas se quedan dispersas y el reset por bloque nunca dispara. La arquitectura tenía un trade-off deliberado codificado en ella, y nunca habíamos hecho benchmark del caso donde el trade-off va por el camino equivocado.

Esa es la lección real. El GC no estaba roto. Estaba afinado para una distribución de patrones de allocation distinta a la que representa el bench de aya\_koto, y no habíamos notado que la distribución para la que estaba afinado excluía toda una clase de cargas reales — búsqueda recursiva, recorridos de árboles, cualquier cosa que mantenga estado vivo en cada nivel de la pila mientras hace allocation de vida corta por debajo.

## Cosas que no funcionaron

Antes de llegar a un fix real, varias palancas de apariencia plausible resultaron ser palancas equivocadas. Reportamos estas con números porque fueron la mitad más interesante de la investigación:

-   **`PERRY_GEN_GC_EVACUATE=1`** — Perry ya tenía un pase de copia-evacuación opt-in. Activarlo para ABC451D: **11.4 segundos**, cuatro veces más lento que el baseline. El pase corre cada ciclo sea útil o no, y su costo de copia por objeto más reescritura de referencias es catastrófico cuando el live set son objetos pequeños de vida corta. Vale la pena conservarlo para las cargas que se benefician, pero no es la respuesta aquí.
-   **`PERRY_GEN_GC=0`** (mark-sweep completo en lugar de generacional) — 3.06 s, esencialmente idéntico al baseline. La elección de estrategia no es lo que ata; la ausencia de recuperación por objeto sí.
-   **Limpieza estructural de `ValidPointerSet` (commit 0fa42e0b).** Fusionó los dos vectores ordenados separados (punteros de arena y punteros con malloc) en uno, añadió un prefiltro de rango min/max, hizo inline del rechazo de tags de `try_mark_value`. Redujo a la mitad el costo por llamada de `contains()` — que era el bucle interno caliente que el profile señaló. El bench de ABC451D pasó de 3.07 s a 3.21 s. Empate, dentro del ruido. El cambio aún aporta valor para cargas donde `contains()` realmente es la restricción que ata (benchmarks con forma de ECS, cadenas compose de hono), pero no era la restricción que ataba aquí. El volumen absoluto de llamadas — impulsado por la presión de allocation alimentando la fase de marcado — dominaba incluso a costo cero por llamada.

El patrón a través de las tres: la estrategia de GC y los costos del bucle interno por llamada eran de segundo orden. La restricción que ataba era la falta de un camino de recuperación para objetos muertos en bloques que no quedan totalmente vacíos. Hasta que eso se abordó, nada más movió la aguja.

## Dónde aterrizamos

Entre v0.5.737 y v0.5.875, a lo largo de aproximadamente 137 versiones patch, el gap se cerró. Estamos siendo deliberados al escribir esto: no hicimos bisect hasta un único commit heroico. El fix aterrizó a través de una serie de cambios en el subsistema del GC que hicieron el trade-off deliberado de “sin free list por objeto” condicional en lugar de permanente — cuando `block_reclaim` se queda en cero a lo largo de ciclos consecutivos, el sweep empieza a poblar una free list segmentada por tamaño y el bump allocator gana un camino de fallback. La secuencia exacta y cuánto contribuyó cada patch requeriría un bisect cuidadoso que debemos pero aún no hemos hecho.

El resultado, en el bench y comando exactos de aya\_koto, en Apple M-series, macOS 26.4:

```
Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)
```

Dos notas de honestidad sobre esta tabla. Primera, el margen de 1.01× de Perry sobre Bun está dentro de las barras de error — la palabra correcta es “empatado,” no “más rápido.” Segunda, la varianza en los tres runtimes es significativa (el máximo de Perry es 745 ms contra una media de 425 ms), y cualquier ejecución individual puede caer en cualquiera de las colas. Hemos mostrado el min y el max junto a la media por esa razón; preferimos que veas la dispersión.

## Lo que sigue imperfecto

Algunas cosas que no estamos disimulando:

La regresión de 1.2 s a 3.0 s que ocurrió entre la medición de aya\_koto y el inicio de esta investigación nos dice que no teníamos una barandilla de CI que atrapara esta clase de ralentización. Estamos añadiendo `abc451d-perry.ts` y una pequeña suite circundante al CI de Perry como puerta de regresión de perf antes de que este post salga al aire. Si este bench se degrada en silencio en una release futura, debería fallar un build, no un benchmark de un crítico dentro de tres meses.

El fix relaja un trade-off deliberado en una dirección específica. Estamos vigilando el benchmark `object_create` y compañía — cargas que la elección original de “sin free list” estaba protegiendo — para asegurarnos de que el camino condicional de free-list no las regrese. Los números tempranos están dentro del ruido, pero este es el tipo de cosa donde la confianza viene del tiempo, no de una sola ejecución de benchmark.

No hicimos bisect del rango de 137 versiones. Lo haremos. Importa para la documentación, e importa para entender cuáles de los mecanismos de free-list condicional están haciendo el trabajo.

## Crédito

El artículo de aya\_koto fue exactamente el tipo de reseña que un proyecto de código abierto necesita y rara vez recibe. Midió con cuidado, publicó su repo de pruebas, señaló fricción específica en el camino de instalación, y llegó a la conclusión honesta de que Perry no estaba listo para el caso de uso que estaba evaluando. Esa conclusión era correcta cuando la hizo. Habría seguido siendo correcta más tiempo si no hubiera escrito sobre ella.

Su repo de pruebas está en [github.com/AXT-AyaKoto/perry-ts-test-2026-0421](https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421). Su artículo está en [zenn.dev/aya\_koto/articles/553ce04b1d5ac4](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4). Ambos merecen leerse incluso después de este seguimiento — el artículo especialmente, porque documenta una evaluación honesta de un compilador en etapa temprana de alguien sin incentivo para ser cortés.

Dos cosas específicas en su artículo que deberíamos anotar. La fricción del camino de instalación que señaló — que la cabecera de perryts.com apuntaba a un método mientras los docs recomendaban otro — ha sido arreglada; el camino de npm es ahora la opción prominente en la landing page, coincidiendo con los docs. La frustración de “cosas fuera del doc de limitaciones que no compilan” que señaló — recorrimos cada archivo `.ts` de su repo de pruebas contra el Perry actual; los huecos genuinos recibieron issues, y las limitaciones documentadas se ampliaron.

La nota al pie sobre BigInt en su artículo era, como se discutió arriba, no relacionada con ABC451D pero real por sí misma — la implementación de BigInt de Perry era en efecto un entero de 1024 bits de ancho fijo por debajo, y los programas con uso intensivo de BigInt lo pagaban. Eso está arreglado en v0.5.736, con un camino inline de valor pequeño y `num-bigint` como fallback de precisión arbitraria. El crédito ahí pertenece al lector que dejó la nota al pie en el artículo de aya\_koto; no sabemos quién es, pero si estás leyendo esto: gracias.

## Reproducción

Si quieres reproducir estos números tú mismo:

```
git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \
  './abc451d-perry < abc451d-input.txt' \
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \
  'bun run abc451d-bun.ts < abc451d-input.txt'
```

Tus números variarán con el hardware y las versiones de runtime. Si varían de formas que parecen incorrectas, [abre un issue](https://github.com/PerryTS/perry/issues) — preferimos enterarnos.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
