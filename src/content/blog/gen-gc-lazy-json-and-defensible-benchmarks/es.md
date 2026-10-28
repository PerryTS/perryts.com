---
title: "GC generacional, JSON perezoso y benchmarks que aguantan el escrutinio"
excerpt: "Perry v0.5.174 → v0.5.306 en tres días, más el trabajo de GC y JSON que aterrizó en paralelo. El GC generacional pasa a ser el predeterminado. La Small String Optimization pasa a ser predeterminada. La pipeline de JSON estrena una cinta perezosa que aterriza en 75 ms de mediana en validate-and-roundtrip — la mejor del pelotón de tipado dinámico. La página de benchmarks se reescribe con mediana RUNS=11 + p95 + σ, simdjson y AssemblyScript+json-as añadidos como pares, y cada debilidad de Perry expuesta con honestidad."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
El artículo anterior cerraba con **v0.5.174** y un titular: Perry por fin ganaba todos los benchmarks de la suite in-tree contra Node y Bun. Tres días de trabajo y una cola de commits de GC + JSON después, Perry está en **v0.5.306** — eso son **132 releases de parche** — y la historia es otra. El titular no es un speedup de 547x ni una nueva columna de victorias. Es el trabajo que hace que esas victorias sean defendibles.

-   El **GC generacional** se envía como predeterminado. Las fases A a D aterrizaron entre v0.5.217 y v0.5.237.
-   La **Small String Optimization** se envía como predeterminada. Los pasos 1.5 → 2 aterrizaron en v0.5.213–v0.5.216.
-   El **pipeline de JSON** recibió un parser basado en tape, parse perezoso, stringify perezoso y materialización dispersa por elemento. El validate-and-roundtrip por defecto está ahora en **75 ms de mediana** — el mejor del grupo de tipado dinámico.
-   La **página de benchmarks** está reescrita de extremo a extremo con **RUNS=11 mediana + p95 + σ + min + max**, simdjson y AssemblyScript+json-as añadidos como pares, las pruebas de optimización separadas de las comparaciones reales, y cada debilidad de Perry expuesta con honestidad.

El reparto secundario es una racha sostenida de arreglos de corrección: FIFO de microtareas de Promise, igualdad de NaN y formato de números ECMAScript, complemento a dos de BigInt, AsyncLocalStorage de extremo a extremo, runtimes de decimal.js + ioredis + commander, y un segfault de JSON.stringify sobre un f64 plano que estaba escondido bajo los caminos del tape. Más el toolchain de Windows que por fin se vuelve ligero: LLVM + xwin, sin necesidad de instalar Visual Studio.

## 1\. GC generacional, activado por defecto

El GC generacional ha sido un despliegue por fases durante dos meses. El resumen de las fases que se cerraron en esta ventana:

-   **v0.5.217–v0.5.221** — Fase A: andamiaje del runtime de shadow-stack, emisión de push/pop, threading del slot-map, mirroring shadow de `Let`/`LocalSet`, y el escáner de raíces.
-   **v0.5.222** — Fase B: separación de arenas nursery + old-gen.
-   **v0.5.223–v0.5.225** — Fase C1–C2: infraestructura runtime de write-barrier, codegen emite la barrera, cada store al heap pasa por ella.
-   **v0.5.226–v0.5.228** — Fase C3a–C4: las raíces del remembered-set fluyen al mark + clear; el trace de minor GC salta el old-gen; tenuring no-moving.
-   **v0.5.229–v0.5.236** — Fase C4b α/β/γ/δ: infraestructura de forwarding-pointer, pase de pinning + evacuation, escáner + pinning transitivo, reescritura de referencias, bloques de nursery inactivos devueltos al SO, trigger del GC capado al umbral inicial.
-   **v0.5.237** — Fase D parte 1: `PERRY_GEN_GC=1` por defecto.
-   **v0.5.238** — Fase D parte 2: `PERRY_SHADOW_STACK=1` por defecto.
-   **v0.5.239–v0.5.240** — docs de cierre: roadmap finalizada, apéndice de linaje académico + industrial (Bartlett 1988, Ungar 1984, Cheney 1970).

La victoria medida que más importó: `test_memory_json_churn` bajó de **115 MB → 91 MB** de RSS pico en el momento en que el predeterminado del gen-GC se activó. Las regresiones de cómputo fueron pequeñas y se listaron sin disculpas — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` +1 ms cada uno. La vía de escape (`PERRY_GEN_GC=0`) recupera los números antiguos; el trade-off fue deliberado, y la página de benchmarks ahora lista ambas filas lado a lado para que el lector pueda elegir.

## 2\. Small String Optimization, activada por defecto

SSO es una representación de string inline de 22 bytes que evita la asignación en heap para strings cortos — las claves típicas de JSON (2–8 bytes) y los valores cortos caen en la forma inline. El despliegue fue diminuto en la superficie y grande por debajo:

-   **v0.5.213**: infraestructura SSO (representación + accessors).
-   **v0.5.214**: brazos del consumidor del Paso 1 + puerta `PERRY_SSO_FORCE` para testing.
-   **v0.5.215**: codegen del Paso 1.5 con rama de tres vías en `PropertyGet` — fast path para strings inline, fast path para strings en heap, slow path para el residuo.
-   **v0.5.216**: cambio del Paso 2 — emitir SSO por defecto.

Los seguimientos en v0.5.279 cerraron el último bug de NaN en lectura de propiedades que afloró cuando SSO estaba caliente, y el arreglo de despacho encadenado de getters cross-module en v0.5.272 cerró otro. Ambos estaban en la lista de pendientes antes del cambio del predeterminado; ambos se enviaron sin regresión de rendimiento.

## 3\. JSON: parse basado en tape, perezoso por defecto

El pipeline de JSON recibió la reescritura más invasiva del periodo. Comportamiento antiguo: `JSON.parse` construía un árbol completamente materializado de valores con NaN-boxing. Comportamiento nuevo: `JSON.parse` construye un tape de 12 bytes por valor y materializa de forma perezosa — solo los valores que realmente lees pagan el coste de materialización. Stringify sobre un parse no mutado es ahora un memcpy del input original, el mismo truco de fast-path que simdjson usa con `raw_json()`.

-   **v0.5.200**: parse dirigido por schema `JSON.parse<T>(blob)` (Paso 1). Una shape conocida en tiempo de compilación deja al compilador emitir acceso a claves pre-resuelto.
-   **v0.5.203**: cimientos del parse basado en tape — Paso 2 Fase 1.
-   **v0.5.204**: parse perezoso + stringify perezoso — Paso 2 Fases 2+4.
-   **v0.5.206**: acceso indexado lazy-safe + casos borde — Paso 2 Fase 3.
-   **v0.5.208**: materialización dispersa por elemento — Paso 2 Fase 5b.
-   **v0.5.209**: cursor de walk + umbral adaptativo de materialize.
-   **v0.5.210**: cambio del parse perezoso a predeterminado para blobs ≥1 KB.

El resultado en la carga de trabajo para la que se diseñó el lazy tape (10k registros, blob de ~1 MB, parse → stringify sin iteración intermedia):

| Implementación | Mediana (ms) | p95 (ms) | σ | RSS pico |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto`| 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + cinta perezosa)| 75 | 91 | 6.9 | 85 MB |
| óxido serde_json (LTO)| 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serialización)| 473 | 533 | 21.4 | 606 MB |
| ensamblador+json-as (wasmtime)| 598 | 621 | 10.5 | 58 MB |

Perry a **75 ms de mediana** es el runtime de tipado dinámico más rápido en la comparación — gana a Bun (259 ms), gana a Node (394 ms), gana al JIT del servidor de Kotlin (453 ms). simdjson a 24 ms es el techo C++ acelerado por SIMD y vive en la página a propósito, no escondido detrás de un cherry-pick. Perry no le gana. El objetivo es mostrar la brecha para que cerrarla tenga un blanco — registrado en `docs/json-typed-parse-plan.md`.

El bench compañero honesto es **parse-and-iterate**: mismo blob, pero cada iteración suma el `nested.x` de cada registro, lo que fuerza al lazy tape a materializar. Ahí Perry aterriza en **466 ms** — más lento que los 375 ms de la vía de escape mark-sweep porque el tape paga un overhead que no puede amortizar. Esa fila está en el TL;DR §B. Cuando no puedes evitar el trabajo, el lazy tape no finge poder hacerlo.

## 4\. La página de benchmarks, reescrita

Tres cosas cambiaron sobre cómo Perry presenta los números de rendimiento.

**RUNS=11 mediana + p95 + σ + min + max, no best-of-N.** Best-of-N descarta silenciosamente la latencia de cola; en este hardware estaba escondiendo outliers de Python `accumulate` de 9,4 segundos y picos de p95 de 5,3 segundos del JSON de Swift. La mediana devuelve las colas a la página. El cambio de metodología aterrizó en v0.5.248; cada celda en TL;DR §A y §B es RUNS=11 fresco a fecha de **2026-04-25**.

**Las pruebas de optimización están separadas del rendimiento real de runtime.** Las cinco celdas que muestran a Perry en 12–34 ms vs Rust/C++ en 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — miden la postura de flags del compilador, no el silicio. Están ahora en su propia subsección, con un párrafo encima explicando que `clang++ -O3 -ffast-math` las cierra hasta el milisegundo. El kernel real-runtime estrella es `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry se sienta justo en el grupo sin contrato FMA en un kernel donde el compilador genuinamente no puede plegar el trabajo. Esa es la comparación honesta.

**Pares añadidos.** simdjson (4.3.0) está ahora en ambas tablas de JSON — el techo de throughput de parse en C++, en la página para que el lector pueda ver la brecha. AssemblyScript con json-as (1.3.2) es el par TS-a-nativo instalable más cercano; porffor hacía segfault en la carga de trabajo a este tamaño, Static Hermes no se instalaba en macOS arm64. Kotlin con kotlinx.serialization se unió al políglota JSON en v0.5.241–v0.5.242. Cada fila es real, cada disclaimer está en la página.

## 5\. La tabla políglota de cómputo

Los kernels estrella genuinamente no plegables, mediana RUNS=11, refrescados 2026-04-25 en v0.5.249:

| Punto de referencia| Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci| 318 | 330 | 315 | 282 | 1022 | 589 |
| loop_data_dependiente| 235 | 229 | 129 | 229 | 322 | 232 |
| objeto_create| 1 | 0 | 0 | 5 | 11 | 6 |
| bucles_anidados| 18 | 8 | 8 | 11 | 18 | 21 |

En `fibonacci`, Perry iguala al grupo compilado dentro de 3–15 ms. El JIT HotSpot de Java es ~11% más rápido por inlinear la llamada recursiva. En `loop_data_dependent`, el kernel se separa en dos clústeres de FP-contract: el grupo con contrato FMA en ~128 ms (Go por defecto, `g++ -O3` en Apple Clang — ambos fusionan `sum * a + b` en un único FMADDD) y el grupo sin contrato en 229–235 ms (Perry, Rust por defecto, Swift, Java sin `-XX:+UseFMA`, Bun) corriendo FMUL + FADD escalares. LLVM iguala al grupo FMA con `-ffp-contract=fast`; Perry no lo activa por defecto. `nested_loops` está limitado por caché, no por cómputo; todos aterrizan en 8–21 ms.

## 6\. Toolchain de Windows, ligero

Los usuarios de Windows ya no necesitan instalar Visual Studio. **v0.5.199** cerró [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin reemplaza todo el árbol de VS BuildTools. `v0.5.201` quitó la puerta cfg sobre `find_lld_link` / `find_perry_windows_sdk` para que el descubrimiento de rutas funcione en cada plataforma que tenga como target Windows, no solo en hosts macOS.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Pase de corrección de runtime

Un tema del periodo: las divergencias silenciosas de runtime respecto a V8/JSC se convirtieron o en arreglos o en errores de compilación. Las no triviales:

-   **v0.5.255**: complemento a dos en `BigInt.fromTwos`/`toTwos`.
-   **v0.5.263**: discriminación de tipo no-promise en `Promise.all`/`race`/`any`.
-   **v0.5.281**: `NaN==NaN` + formato de números ECMAScript (`3 → "3"`, no `"3.0"`; `-0 → "0"`; etc.).
-   **v0.5.280**: coerción ToInt32 de `NaN`/`Infinity` en `(x) | 0`.
-   **v0.5.284**: FIFO de microtareas de Promise + propagación de handlers que lanzan.
-   **v0.5.286**: `JSON.stringify` de un f64 plano hacía segfault bajo los caminos del tape.
-   **v0.5.277**: `fs.readFileSync` devuelve Buffer cuando no se pasa encoding (coincide con Node).
-   **v0.5.272**: el despacho encadenado de getters cross-module devolvía `undefined`.

Los seguimientos de stdlib para el issue [#187](https://github.com/PerryTS/perry/issues/187) se completaron: AsyncLocalStorage de extremo a extremo (v0.5.261), runtime de commander + codegen invocando de verdad `.action()` (v0.5.250), código de decimal.js (v0.5.259), Redis ioredis de extremo a extremo (v0.5.270), patrón async-factory de pg + mongo (v0.5.275), y el mismo bug de async-factory en EE/LRU/WSS (v0.5.252).

Del lado de `perry/ui`: callback de tap de notificación (#97) cableado tanto en Apple (v0.5.254) como en Android (v0.5.258); programar + cancelar notificaciones locales (#96, v0.5.244); registro + recepción de FCM en Android (v0.5.262).

## 8\. Cerrando

El patrón de este tramo no son números de titular. Es el trabajo que hace que las victorias existentes sobrevivan al escrutinio: un GC generacional que captura cargas de trabajo de asignación sostenida, una SSO que cierra la brecha de coste de strings cortos, un pipeline de JSON que explota la estructura de “sin modificación” de la carga de trabajo más común, y una página de benchmarks que mide medianas en lugar de best-of-N y muestra el techo de parse de 24 ms de simdjson en la misma fila que los 75 ms de Perry. El lector llega a ver la brecha — y dónde se sitúa Perry respecto al suelo.

Pruébalo:

```
# npm (cualquier plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — sin necesidad de instalar VS)
winget install PerryTS.Perry

# Suite de benchmarks por defecto
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Fuente: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Puntos de referencia: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Registro de cambios: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
