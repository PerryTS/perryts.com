---
title: "Distribución en npm, perry dev y ganando cada benchmark"
excerpt: "Perry v0.5.80 → v0.5.174 en seis días. @perryts/perry se publica en npm para las siete plataformas soportadas. perry dev añade recompilación automática en modo watch sobre una cache de AST en memoria y una cache de objetos en disco por módulo. json_roundtrip cierra su último hueco — Perry ahora gana cada benchmark tanto a Node.js como a Bun."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
El artículo anterior cerraba con Perry en v0.5.80 y una derrota tozuda en la tabla de benchmarks: el roundtrip de `JSON.parse`/`stringify` seguía siendo 1,6x más lento que Node. Seis días después Perry está en **v0.5.174** — eso son **94 releases de parche** — y tres cosas cambiaron que vale la pena destacar antes que nada:

-   `@perryts/perry` se publica en **npm**. Un solo comando instala Perry en todas las plataformas soportadas.
-   **`perry dev`** añade recompilación automática en modo watch, sobre una nueva cache de AST en memoria y una cache de objetos en disco por módulo.
-   La derrota de `json_roundtrip` se cerró. Perry ahora **gana a Node y Bun en cada benchmark** de la suite principal (15/15 vs ambos).

El resto del artículo es el reparto secundario: arreglos de WebAssembly, watchOS compilando por fin de extremo a extremo, primitivas de `perry/thread` conectadas hasta el final, y un lote de victorias de estrictitud en tiempo de compilación que convierten caídas silenciosas en errores reales.

## 1\. `@perryts/perry` en npm

Perry siempre se ha instalado vía Homebrew en macOS y APT en Debian/Ubuntu. Buena cobertura para desarrolladores en esas plataformas, nada en absoluto para usuarios de Windows salvo que compilaran desde fuente, y nada uniforme para un equipo que mezcle Mac, Linux y Windows. v0.5.107 hizo desaparecer ese problema.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

El paquete es un lanzador delgado que depende de siete paquetes opcionales por plataforma — macOS arm64/x64, Linux x64/arm64 tanto en glibc como musl, Windows x64 — y npm instala solo el que coincide con tu máquina. El tamaño del binario por plataforma es de unos pocos megabytes. La instalación en sí dura segundos. También hay un camino de instalación global (`npm install -g @perryts/perry`) si lo prefieres, pero la instalación local al proyecto fija la versión del compilador junto a tus dependencias, que es el valor por defecto correcto.

La publicación pasó por OIDC Trusted Publisher, así que cada release tiene proveniencia y queda atada al job de CI que la construyó. Eso fue un día entero de trabajo en CI — varios commits de CI en `v0.5.107` persiguiendo la combinación correcta de `--provenance` / versión de npm / ruta del workflow — pero aterrizó, y cada release desde entonces ha sido limpia. Los usuarios de Windows son ciudadanos de primera clase ahora, y la fricción entre equipos de “instálalo como quiera tu SO” ha desaparecido.

## 2\. `perry dev` — modo watch

v0.5.143 añadió un nuevo subcomando a la CLI:

```
perry dev
```

Eso es todo. Observa tu proyecto, recompila al guardar y relanza tu binario. La inspiración es Vite y `nodemon`; la idea es dejar de fingir que un flujo de compilador-a-binario tiene que sentirse más lento que un runtime. Para la mayoría de proyectos `perry dev` reconstruye en menos de un segundo con cache caliente.

La parte de “cache caliente” es clave. Dos nuevas caches aterrizaron junto con `perry dev`:

-   **Cache de AST en memoria** (v0.5.156). A través de recompilaciones en una única sesión de `perry dev`, Perry mantiene el AST parseado de cada módulo que no ha cambiado en disco. Editar un archivo re-parsea un archivo, no todo el grafo de módulos.
-   **Cache de objetos en disco por módulo (V2.2)**. Cada módulo compila a su propio archivo `.o` y se hashea; los módulos sin cambios saltan codegen por completo y el linker recoge el objeto cacheado. La salida verbose de la cache coincide con la spec en [#131](https://github.com/PerryTS/perry/issues/131), y una ronda de endurecimiento por auditoría en v0.5.160 cerró los casos borde en que entradas rancias de cache podían sobrevivir a un cambio de cabecera.

Las dos caches se acumulan. La primera edición de la sesión es compilación completa; todo lo demás solo hace trabajo proporcional a lo que realmente cambiaste. Este es el mayor cambio individual de DX de la semana.

## 3\. Ganando a Bun en cada benchmark

En v0.5.166 el README tenía una advertencia honesta: Perry era 1,6x más lento que Node en `json_roundtrip` (50× `JSON.parse` + `JSON.stringify` sobre un blob de 1MB y 10K ítems), y 2,4x más lento que Bun. El issue [#149](https://github.com/PerryTS/perry/issues/149) hacía seguimiento. Para v0.5.173 — siete días después — esa brecha se cerró.

| Carga de trabajo | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

Perry ahora gana en cada carga de trabajo de la suite principal de benchmarks — **15/15 vs Node, 15/15 vs Bun**, mejor de 5 ejecuciones en macOS ARM64. Bun 1.3 sigue por delante en RSS pico (84MB vs los 310MB de Perry en `json_roundtrip`), así que la presión sobre el allocator es lo siguiente a cerrar, pero la latencia en bruto es de Perry.

El cierre de la brecha de JSON no fue un único cambio — fue la acumulación del trabajo de paridad en el layout de objetos que recorrió esta semana: inferencia de shape de literales de objeto de Fase 1 (v0.5.167), inferencia de tipo de retorno basada en el cuerpo para funciones libres, métodos de clase, getters y arrows de Fase 4 (v0.5.169), e inferencia de tipo de retorno de llamadas a método de Fase 4.1 (v0.5.170). El tema es el mismo que en el artículo anterior: dale a LLVM suficiente estructura estática para ver a través, y el optimizador hace el resto.

v0.5.164 también restauró la autovectorización con acumulador paralelo `<2 x double>` sobre bucles de reducción de pure-fadd, que había regresionado silenciosamente en algún momento del rango v0.5.9x→v0.5.16x. Eso es lo que devuelve `math_intensive` y `accumulate` a su vieja ventaja de 3-4x sobre Rust/C++/Go/Swift — mismo LLVM, un flag `reassoc contract`, un cuerpo de bucle vectorizado.

## 4\. `perry/ui` y doc-tests

Cuatro huecos restantes de perry/ui se cerraron en v0.5.151. Junto con eso, v0.5.119 cambió el mal uso silencioso de la API de perry/ui de “compila y no hace nada” a un error de compilación duro — misma lógica que v0.5.165 aplicada a decoradores (ver abajo). Que el mal uso salga a la superficie en tiempo de compilación es siempre mejor que en tiempo de ejecución.

v0.5.123 entregó un **harness de tests para doc-examples** y una galería de widgets. Cada ejemplo TypeScript en la documentación se compila ahora en cada ejecución de CI, y la galería de widgets compara screenshots contra baselines aprobados. v0.5.125 extendió eso a una matriz de cross-compile: cada ejemplo de doc se construye para iOS, tvOS, Android, WASM y Web además de la plataforma host, así que la deriva de API entre targets se detecta en el PR que la introdujo en lugar de en el ciclo de release que la envió.

Una pequeña victoria de calidad de vida: `perry check` ahora emite `file:line:column` para errores de lowering de HIR ([#129](https://github.com/PerryTS/perry/issues/129)), lo que significa que jump-to-error del editor funciona en lugar de mostrar un mensaje genérico sin ubicación.

## 5\. watchOS compila de extremo a extremo

watchOS se envió como target de compilación el mes pasado, pero un build limpio de extremo a extremo tenía algunas asperezas. El trabajo de watchOS de esta semana:

-   **v0.5.113**: `--target watchos` y `--target watchos-simulator` ahora compilan de extremo a extremo sin los workarounds que se habían acumulado.
-   **v0.5.114**: `--features watchos-game-loop` para apps con superficie Metal.
-   **v0.5.122**: `--features watchos-swift-app` para renderizado hospedado por SwiftUI — cuando quieres que SwiftUI sea dueño del ciclo de vida de la app y que Perry componga la UI dentro.
-   **v0.5.135**: `PERRY_UI_TEST_MODE` conectado a perry-ui-ios y perry-ui-tvos, así que los tests de UI con Geisterhand corren igual en esos dos targets que en macOS y Linux.

## 6\. Primitivas de `perry/thread` completamente conectadas

v0.5.174 (hoy) cerró [#146](https://github.com/PerryTS/perry/issues/146): `parallelMap`, `parallelFilter` y `spawn` están completamente conectados a través del camino de codegen con aplicación de seguridad en tiempo de compilación. Las capturas mutables se rechazan en tiempo de compilación — la misma postura de corrección en tiempo de compilación que perry/ui y los decoradores tienen ahora. Las primitivas de threading que estaban parcialmente conectadas desde el anuncio de v0.4.0 están ahora completas de extremo a extremo.

## 7\. WebAssembly y el target web

Dos arreglos de WASM que vale la pena destacar:

-   **v0.5.158**: cinco bugs compuestos en `--target web` (el camino de salida a WASM) que se enmascaraban mutuamente. Arreglados en lote para que el target web aguante ahora toda la superficie de `perry/ui` ([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: `break`/`continue` dentro de un `if` dentro de un bucle se colgaba en WASM — un bug de codegen que no se reproducía en los targets nativos. Arreglado ([#135](https://github.com/PerryTS/perry/issues/135)).

También del lado de la correctitud: v0.5.157 arregló `obj.field` devolviendo `NaN` en Android ([#128](https://github.com/PerryTS/perry/issues/128)), y v0.5.162 arregló un bug maldito de ws donde `sendToClient` y `closeClient` habían estado compilando a no-ops silenciosos ([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. Victorias de estrictitud en tiempo de compilación

Un tema de esta semana: cualquier cosa que solía ser un fallo silencioso es ahora un error de compilación.

-   **v0.5.165**: los decoradores de TypeScript se parseaban a HIR y luego se descartaban silenciosamente. Ahora dan error en el punto de decoración con un mensaje claro ([#144](https://github.com/PerryTS/perry/issues/144)). El mismo razonamiento warn→bail de v0.5.119 aplicado a perry/ui.
-   **v0.5.119**: el mal uso de la API de perry/ui se rechaza en tiempo de compilación en lugar de producir un binario no-op.
-   **v0.5.172**: `console.trace()` ahora emite un backtrace nativo real a stderr en lugar de solo hacer eco del mensaje ([#20](https://github.com/PerryTS/perry/issues/20)). Los frames simbolicados requieren `PERRY_DEBUG_SYMBOLS=1`; sin él obtienes direcciones, que sigue siendo más que el comportamiento de eco del mensaje que reemplaza.

## 9\. Cerrando

El patrón de la semana: **distribución** (npm), **experiencia del desarrollador** (`perry dev`, caches incrementales) y **la última derrota pendiente en benchmarks cerrada**. Más un lote de estrictitud en tiempo de compilación que convierte caídas silenciosas en errores reales. Seis días, 94 releases de parche, un gran cambio de DX.

Pruébalo:

```
# npm (cualquier plataforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Modo watch para desarrollo iterativo
perry dev
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
