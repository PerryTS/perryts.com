---
title: "Presentamos Perry"
excerpt: "Perry compiles supported TypeScript to standalone native executables with its runtime and GC linked in, without requiring an external Node.js installation or JavaScript engine."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Nos emociona presentar Perry — un compilador nativo de TypeScript escrito en Rust que compila tu TypeScript directamente a ejecutables independientes. Sin runtime de Node.js, sin wrapper de Electron, sin compromisos. Solo tu código, compilado a un binario nativo que arranca instantáneamente y se ejecuta en cualquier lugar.

Perry representa un replanteamiento fundamental de lo que TypeScript puede ser. En lugar de tratarlo como un superconjunto de JavaScript que debe ejecutarse a través de un motor JS, Perry trata TypeScript como un lenguaje de sistemas — uno que resulta tener una sintaxis que millones de desarrolladores ya conocen y aman.

## Por qué construimos Perry

TypeScript se ha convertido en la lingua franca del desarrollo de software moderno. Es el lenguaje detrás de la mayoría de los frontends web, una cuota creciente de backends, y cada vez más la elección para herramientas, scripting y automatización. Pero siempre ha llevado una limitación fundamental: compila a JavaScript, y JavaScript requiere un runtime.

Ese runtime — ya sea Node.js, Deno o Bun — viene con compromisos. Tiempos de arranque en frío medidos en decenas o cientos de milisegundos. Sobrecarga de memoria del compilador JIT y el recolector de basura. Distribuciones binarias que o empaquetan todo el runtime o requieren que el usuario instale uno. Y para aplicaciones GUI, la única opción ha sido Electron, que incluye un navegador Chromium completo con tu app.

Nos preguntamos: ¿y si TypeScript no tuviera que pasar por JavaScript en absoluto? ¿Y si pudieras compilarlo directamente a código máquina nativo, de la misma manera que compilas Rust, Go o C++?

## Cómo funciona Perry

La pipeline de compilación de Perry tiene tres etapas:

1.  **Análisis sintáctico** — Perry usa SWC (el parser de TypeScript/JavaScript basado en Rust) para analizar tu código fuente TypeScript en un AST. SWC es el mismo parser usado por Next.js, y es extremadamente rápido.
2.  **Compilación dirigida por tipos** — Perry recorre el AST con información completa de tipos. A diferencia de un motor JS que debe manejar tipos dinámicos en tiempo de ejecución, Perry conoce cada tipo en tiempo de compilación. Esto permite la monomorfización de genéricos, el dispatch estático de llamadas a métodos y la optimización directa del diseño de memoria.
3.  **Generación de código** — Perry genera código máquina nativo usando Cranelift, el mismo generador de código usado por Wasmtime y partes del JIT de Firefox. Cranelift produce código nativo eficiente para x86\_64 y ARM64.

El resultado es un ejecutable independiente — típicamente 2–5 MB para una herramienta CLI — que arranca instantáneamente sin tiempo de calentamiento.

terminal

$ perry build app.ts

Parsing app.ts...

Compiling (cranelift, arm64)...

Linking...

✓ Built executable: app (2.3 MB)

$ ./app

Hello from native TypeScript!

$ file app

app: Mach-O 64-bit executable arm64

## Qué características de TypeScript están soportadas

Perry soporta un subconjunto amplio y creciente de TypeScript. El objetivo es compatibilidad completa con el lenguaje tal como los desarrolladores lo usan realmente. Hoy, eso incluye:

-   **Todos los tipos primitivos** — string, number, boolean, null, undefined, bigint, symbol
-   **Interfaces y type aliases** — incluyendo tipos unión, tipos intersección y mapped types
-   **Genéricos** — compilados vía monomorfización, así que `Array<number>` y `Array<string>` generan caminos de código optimizados distintos
-   **Clases** — con herencia, campos privados (`#field`), miembros estáticos, getters/setters y decoradores
-   **Async/await y Promises** — compilados a una máquina de estados, similar a cómo Rust maneja async
-   **Generadores e iteradores** — `function*` y bucles `for...of`
-   **Closures** — con semántica de captura correcta
-   **Destructuring** — arrays, objetos, patrones anidados y elementos rest
-   **Template literals** — incluyendo tagged templates
-   **Módulos** — imports/exports ESM resueltos en tiempo de compilación

## UI nativa multiplataforma

Perry no se limita a herramientas CLI y aplicaciones del lado del servidor. Incluye frameworks de UI nativos para seis plataformas:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField y más)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (misma API que iOS, con adaptaciones específicas para iPad)
-   **Android** — JNI + Android Views (Activity, View, Button, RecyclerView)
-   **Linux** — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreateWindowEx, controles comunes, GDI)

La idea clave es que Perry mapea una API TypeScript común al toolkit de widgets nativo de cada plataforma en tiempo de compilación. No hay capa de bridge, no hay vista web y no hay motor de renderizado personalizado. Tu app usa widgets reales de la plataforma, renderizados por el propio SO. Lee más en nuestro análisis profundo: [UI nativa multiplataforma desde TypeScript](/es/blog/cross-platform-native-ui/).

## Más de 27 implementaciones nativas de paquetes npm

Uno de los mayores desafíos prácticos de un nuevo compilador es la compatibilidad con el ecosistema. Los desarrolladores no solo escriben código desde cero — usan paquetes. Perry aborda esto con implementaciones nativas de más de 27 paquetes npm populares:

-   **Bases de datos** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSockets)
-   **Seguridad** — bcrypt, jsonwebtoken, crypto
-   **Utilidades** — uuid, chalk, dotenv, lodash (parcial), moment
-   **Sistema** — fs-extra, glob, chokidar, commander

Estos no son wrappers delgados alrededor de módulos Node.js. Se compilan directamente en tu binario usando bibliotecas nativas del sistema — libpq para PostgreSQL, OpenSSL para criptografía, libcurl para HTTP. La superficie de API coincide con lo que esperarías del paquete npm, por lo que la migración es directa.

## Capa de compatibilidad V8 opcional

Para paquetes npm que aún no tienen implementaciones nativas de Perry, Perry ofrece un modo de incrustación V8 opcional. Cuando está habilitado, Perry empaqueta un runtime V8 y puede ejecutar paquetes npm JavaScript estándar junto a tu TypeScript compilado. Esta es una válvula de escape pragmática que te permite adoptar Perry incrementalmente — compila los caminos calientes a código nativo mientras sigues accediendo al ecosistema npm completo para todo lo demás.

## Compilación cruzada

Perry soporta compilación cruzada de fábrica. Desde tu máquina de desarrollo macOS, puedes compilar para Linux (x86\_64 y ARM64) e iOS. Esto significa que puedes construir tu pipeline CI/CD en macOS y producir binarios para todos tus objetivos de despliegue sin necesitar máquinas de compilación dedicadas para cada plataforma.

\# Compilar para Linux desde macOS

$ perry build app.ts --target linux-x86\_64

✓ Built executable: app (3.1 MB)

\# Compilar para iOS desde macOS

$ perry build app.ts --target ios-arm64

✓ Built executable: app (4.8 MB)

## Rendimiento

Los binarios compilados con Perry son rápidos. Como no hay calentamiento JIT, no hay sobrecarga de intérprete y no hay pausas del recolector de basura, el rendimiento es predecible y consistente desde la primera invocación.

En nuestros benchmarks:

-   **Tiempo de arranque** — efectivamente 0 ms (lanzamiento de proceso nativo)
-   **Tamaño del binario** — 2–5 MB para herramientas CLI típicas (vs 50+ MB para Node.js empaquetado)
-   **Uso de memoria** — 5–10x menor que aplicaciones Node.js equivalentes
-   **Throughput** — competitivo con C escrito a mano para cargas de trabajo de cómputo intensivo

Puedes ver benchmarks en vivo en [demo.perryts.com](https://demo.perryts.com), que compara ejecutables compilados con Perry contra Node.js y Bun en tiempo real.

## Estado actual

Perry está en desarrollo activo. El compilador es estable con 62 de 62 tests pasando en la suite de pruebas. Los seis backends de UI de plataforma son funcionales. Las características principales del lenguaje son sólidas y se están expandiendo.

Estamos trabajando activamente en expandir la biblioteca de widgets de UI, mejorar el rendimiento de strings y objetos, completar el soporte completo de regex y construir el módulo Stream. A más largo plazo, planeamos objetivos de compilación WASM, multi-threading, una extensión de VS Code e integración con gestores de paquetes.

Consulta la [hoja de ruta](/es/roadmap/) completa para detalles sobre lo que se ha lanzado, lo que está en progreso y lo que viene después.

## Comenzar

Perry es open source. Puedes clonar el repositorio, compilar desde el código fuente y empezar a compilar TypeScript hoy:

$ git clone https://github.com/PerryTS/perry.git

$ cd perry

$ cargo build --release

\# Compila tu primer archivo TypeScript

$ ./target/release/perry build hello.ts

✓ Built executable: hello (2.1 MB)

$ ./hello

Hello, world!

Explora el código fuente en [GitHub](https://github.com/PerryTS/perry), echa un vistazo al [showcase](/es/showcase/) para ver qué se está construyendo con Perry, o sumérgete directamente en el código. No podemos esperar a ver qué construyes.
