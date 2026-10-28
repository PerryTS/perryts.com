---
title: "Compilación cruzada a Windows, game loops en iOS y 100 % de paridad en tests"
excerpt: "103 commits en una semana: compilación cruzada a Windows desde Linux vía lld-link, soporte de game loop en iOS, informes de fallos, un pipeline de build Hub en dos etapas y el compilador autoalojado alcanza 68/68 de paridad determinista en tests."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 commits al compilador de Perry esta semana. Las características principales: ahora puedes compilar cruzadamente ejecutables de Windows desde Linux, las apps de iOS pueden ejecutar game loops bloqueantes, el compilador reporta crashes para telemetría, y el compilador auto-hospedado pasa cada test determinístico que le lanzamos. Además, una actualización mayor de la infraestructura del Hub y más de 50 correcciones de errores.

## Compilación cruzada a Windows desde Linux

Perry ahora puede producir binarios Windows `.exe` desde un host Linux. Esta es la pieza que faltaba para pipelines CI/CD que necesitan apuntar a Windows sin ejecutar una máquina de compilación Windows para toda la compilación.

La implementación reemplaza las verificaciones `#[cfg]` en tiempo de compilación con detección de objetivo en tiempo de ejecución. Cuando el compilador detecta un objetivo Windows en un host no-Windows, localiza `lld-link`, `llvm-nm` y `llvm-ar` de la toolchain de Rust o el PATH mediante un nuevo helper `find_llvm_tool()`. Las bibliotecas del sistema Windows vienen de un sysroot estilo [xwin](https://github.com/Jake-Shadle/xwin) apuntado por `PERRY_WINDOWS_SYSROOT`.

El enlazador usa automáticamente `/FORCE:UNRESOLVED` y genera stubs para símbolos de UI faltantes, por lo que las apps CLI se compilan cruzadamente sin problemas. La salida por defecto es `.exe` al compilar para Windows. Los detalles completos están en la [documentación de compilación cruzada](https://docs.perryts.com).

**terminal: host Linux**

```
$ perry compile main.ts --target windows
Compiling main.ts for windows-x86_64...
Using lld-link from Rust toolchain
✓ Compiled executable: main.exe (2.8 MB)
```

## Soporte de Game Loop para iOS

iOS requiere que UIKit sea dueño del hilo principal. Eso está bien para apps basadas en eventos, pero es un problema para juegos que necesitan un bucle `while (!shouldClose)` bloqueante. Perry ahora resuelve esto con el flag `--features ios-game-loop`.

Cuando está habilitado, el compilador emite `_perry_user_main` en lugar de `main`. El runtime proporciona un `main()` que llama a `UIApplicationMain` en el hilo principal y lanza tu código en un hilo de fondo. El scene delegate y app delegate manejan el ciclo de vida completo de UIKit mientras tu game loop se ejecuta sin bloqueo.

**main.ts**

```typescript
// Tu game loop se ejecuta en un hilo de fondo
while (!shouldClose) {
update();
render();
awaitNextFrame();
}
```

```text
$ perry run ios --features ios-game-loop
```

Esto habilita toda una categoría de apps — juegos, simulaciones, visualizaciones en tiempo real — que no eran prácticas en iOS antes. Los caminos de pump y callback de iOS ahora también están envueltos en manejo de panic, por lo que los crashes tanto en el game loop como en el ciclo de vida UIKit se capturan limpiamente.

## Reporte de crashes

Las apps compiladas con Perry ahora instalan un hook de panic y manejadores de señal para `SIGSEGV`, `SIGBUS` y `SIGABRT` al inicio. Cuando ocurre un crash fatal, los detalles se escriben en `~/.hone/crash.log` para el sistema de telemetría Chirp. Los panics capturados (en `catch_callback_panic`) limpian el log, por lo que solo se reportan crashes genuinamente irrecuperables.

Esta es una característica de preparación para producción. Cuando algo sale mal en el campo, lo sabremos — y el log de crash incluye suficiente contexto para diagnosticar el problema sin requerir que los usuarios reporten nada manualmente.

## Hub: Pipeline de compilación Windows en dos etapas

La infraestructura de compilación del Perry Hub recibió una actualización arquitectónica significativa. Anteriormente, compilar para Windows requería un worker Windows para toda la compilación. Ahora el pipeline se divide en dos etapas:

1.  Un worker Linux compila cruzadamente el artefacto Windows usando el nuevo soporte lld-link
2.  El Hub retiene el artefacto precompilado y re-encola el trabajo para un worker Windows
3.  El worker Windows solo maneja la firma y el empaquetado — una tarea mucho más ligera

Cuando un worker envía `complete` con `needs_finishing: "windows"`, el Hub re-encola el trabajo de forma transparente. La CLI ve una experiencia de compilación única sin interrupciones.

El Hub también ahora auto-inicia VMs Windows de Azure cuando no hay un worker Windows conectado, y los workers de compilación se auto-actualizan a la última versión de Perry en nuevas versiones. Menos gestión manual de infraestructura, compilaciones más rápidas.

## Reescritura de documentación

Dos reescrituras mayores de documentación aterrizaron esta semana en [docs.perryts.com](https://docs.perryts.com):

-   **Referencia de perry.toml** — documentación completa de secciones cubriendo cada opción de configuración, resolución de bundle ID, resolución de archivo de entrada, auto-incremento de número de compilación y ejemplos de CI/CD
-   **Referencia de Geisterhand** — documentación completa de API, configuración de plataforma, patrones de automatización de pruebas y visión general de la arquitectura del framework de pruebas de UI multiplataforma

Estas no son actualizaciones incrementales. Ambas son reescrituras desde cero que cubren cada característica y opción de configuración. Si estás configurando un nuevo proyecto o escribiendo pruebas, comienza aquí.

## APIs de menú multiplataforma

`menuClear` y `menuAddStandardAction` eran anteriormente solo de macOS. Ahora funcionan en las 6 plataformas nativas. Esto también incluye una corrección para un panic de reentrancia `RefCell` en `dispatch_menu_item` en Windows.

### Android: Alineación de página de 16 KB

Google Play ahora requiere alineación de página de 16 KB para bibliotecas nativas. Perry establece los `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` apropiados automáticamente, y los archivos `.so` compañeros se copian junto a la salida para inclusión en APK/AAB.

## Perry React: Tablero Kanban

La capa de compatibilidad React tuvo una prueba del mundo real: un tablero Kanban completo de 5 columnas con operaciones de mover, añadir, eliminar y ver. Construirlo descubrió y corrigió el renderizado de hijos de array anidados en JSX — el manejador recursivo `_appendChildren` ahora aplana correctamente los arrays retornados por llamadas `.map()`. También hay una nueva demo Kitchen Sink WorkBench de 14 secciones cubriendo varios patrones de UI.

## Anvil: 100% de paridad de tests determinísticos

`perrysdad` — el compilador LLVM auto-hospedado escrito en TypeScript y compilado por Perry — ahora pasa **68 de 68** tests determinísticos, coincidiendo exactamente con la salida del compilador principal. Las únicas diferencias son inherentes (marcas de tiempo, `Math.random()`), y 11 tests se omiten porque requieren UI, temporizadores, criptografía o características específicas de plataforma aún no implementadas.

Trabajo clave que lo logró:

-   **Dispatch de métodos de interfaz** — las variables tipadas como interfaz ahora retornan métodos correctos vía dispatch basado en class\_id en ObjectHeader
-   **Acceso dinámico a propiedades** — dispatch en tiempo de ejecución para nombres de propiedades computados
-   **Closures y vinculación de this** — semántica de captura correcta para métodos de objetos
-   **Fase 6 en progreso** — async/await, generadores y correcciones de condiciones

100% de paridad en tests determinísticos es un hito significativo. Significa que el binario `anvil` auto-compilado produce exactamente la misma salida que el compilador principal para cada escenario testeable. La brecha hacia el auto-hospedaje completo se estrecha.

## Más de 50 correcciones de errores

Un gran impulso de corrección esta semana. Destacados:

-   **JSON.parse** — los arrays ya no se truncan a 16 elementos, la entrada inválida se maneja correctamente
-   **Uint8Array** — constructor desde variable de array, implementación de `.set(source, offset)` (era un no-op)
-   **BigInt** — NaN-boxing con `BIGINT_TAG` para llamadas entre módulos, correcciones de truncación keccak256 a 32 bits
-   **Optional chaining** — expresiones condicionales anidadas, detección de toString, NaN-boxing de valor de retorno
-   **IndexSet** — NaN-boxing de string corregido para usar `STRING_TAG` en lugar de `POINTER_TAG`
-   **MySQL** — tipos DATETIME y BLOB, constructor `Date(string)`
-   **Math.min/max** — manejo de argumentos spread
-   **Dispatch de métodos nativos** — field-scan-and-call para objetos `POINTER_TAG`

Estos no son casos extremos. JSON.parse truncando arrays a 16 elementos rompería cualquier aplicación real. Uint8Array.set siendo un no-op corrompería datos silenciosamente. Estas son las correcciones que hacen que el compilador sea apto para producción, un error de corrección a la vez.

## En números

-   **103 commits** al compilador principal de Perry
-   **3 versiones**: v0.2.195, v0.2.196, v0.2.197
-   **1 característica principal**: compilación cruzada de Windows desde Linux
-   **1 nueva categoría de apps**: game loops de iOS
-   **68/68** paridad de tests determinísticos en perrysdad
-   **Más de 50 correcciones** en NaN-boxing, stdlib y FFI nativo
-   **2 reescrituras de documentación**: perry.toml y Geisterhand
-   **5 mejoras del Hub**: pipeline de dos etapas, auto-inicio de Azure, auto-actualización de workers

## Qué viene después

La compilación cruzada de Windows abre la puerta a CI/CD multiplataforma completamente automatizado — enviar TypeScript, obtener binarios nativos para cada objetivo sin máquinas de compilación dedicadas para cada SO. El soporte de game loop desbloquea toda una nueva categoría de apps iOS. Y 100% de paridad de tests determinísticos en perrysdad significa que el auto-hospedaje se está volviendo muy real. Lo que queda:

-   **Soporte completo de regex** — la última gran brecha del lenguaje
-   **Expansión de perry/ui** — arrastrar y soltar, etiquetas de accesibilidad, DatePicker
-   **perrysdad Fase 6** — async/await, generadores, expandiendo hacia paridad completa con Perry
-   **Beta pública del Hub** — abrir compilaciones distribuidas a usuarios externos

Sigue el progreso en [GitHub](https://github.com/PerryTS/perry), lee la documentación en [docs.perryts.com](https://docs.perryts.com), o consulta la [hoja de ruta](/es/roadmap/) para el panorama completo.
