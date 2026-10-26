---
title: "Compilar Hono, tRPC y Strapi a binarios nativos"
excerpt: "Perry ahora compila tres grandes frameworks TypeScript — Hono, tRPC y Strapi — en ejecutables ARM64 nativos. Se compilan en menos de un segundo, producen binarios de menos de 2 MB y funcionan sin fallos."
date: 2026-02-25
tags: ["compiler", "frameworks", "progress"]
---
Perry ahora compila tres frameworks TypeScript importantes — Hono, tRPC y Strapi — a ejecutables nativos ARM64. Compilan en menos de un segundo, producen binarios de menos de 2 MB y se ejecutan sin crashes.

Este artículo cubre qué funciona, qué aún no y qué aprendimos al empujar el compilador contra código del mundo real.

## Los proyectos

Elegimos estos tres porque representan diferentes formas de TypeScript:

-   **Hono** — Un framework web ligero (29 módulos). Uso intensivo de genéricos, herencia de clases, asignación dinámica de métodos y las APIs web `Request`/`Response`. Su estructura de exportación usa re-exportaciones nombradas a través de archivos barrel.
-   **tRPC** — Un framework RPC con seguridad de tipos (52 módulos). Cadenas de re-exportación profundas a través de 4+ niveles, patrón builder con estrechamiento de tipo genérico, instanciación de clases a nivel de módulo y streaming vía Web Streams.
-   **Strapi** — Un core de CMS headless (4 módulos compilados nativamente, el resto resuelto como externo). Monorepo con resolución de paquetes de workspace, re-exportaciones de namespace (`export * as X`), patrón de contenedor de servicios con `Map` y funciones factory.

## Resultados de compilación

Los tres compilan a binarios nativos con cero errores de compilación:

| Proyecto | Módulos compilados | Tamaño del binario | Tiempo de compilación |
| --- | --- | --- | --- |
| Hono | 29 | 1.6 MB | 0.59s |
| tRPC | 52 | 1.8 MB | 0.97s |
| Strapi | 4 | 1.9 MB | 0.80s |

Cada módulo fuente pasa por el pipeline completo: análisis SWC, bajada a HIR, codegen Cranelift, emisión de archivo objeto y enlace nativo. Los tiempos de compilación incluyen todo — desde el análisis hasta el enlace final.

Para contexto, `tsc --noEmit` solo en tRPC toma varios segundos. Perry compila 52 módulos a un binario nativo enlazado en menos de uno.

## Qué funciona en tiempo de ejecución

### Instanciación de clases entre módulos

Este fue el gran hito. La estructura de exportación de Hono se ve así:

hono export chain

// hono/src/hono.ts

export class Hono extends HonoBase { ... }

// hono/src/index.ts

import { Hono } from './hono'

export { Hono }

Ese `export { Hono }` es una re-exportación nombrada — no `export * from` ni `export { Hono } from './hono'`. En la HIR de Perry, esto se convierte en `Export::Named`, no `Export::ReExport` ni `Export::ExportAll`. Anteriormente, la propagación de clases del compilador solo seguía las cadenas `ExportAll` y `ReExport`, por lo que importar `Hono` desde `index.ts` fallaba silenciosamente. Ahora Perry rastrea `Export::Named` a través de los imports del módulo para encontrar la definición de clase original y la propaga.

$ ./perry compile test\_hono.ts -o /tmp/test-hono && /tmp/test-hono

\[1\] Class instantiation through named re-export chain

PASS: new Hono() returned a real object

\[2\] Constructor-initialized fields

PASS: app.router initialized by constructor

PASS: app.router.name = SmartRouter

\[5\] Multiple instances

PASS: second instance created with router

\[6\] Constructor with options

PASS: new Hono({ strict: false }) accepted options

### Resolución de re-exportación multi-nivel

El `initTRPC` de tRPC vive 4 niveles de profundidad:

initTRPC.ts (export const initTRPC = ...)

\-> unstable-core-do-not-import.ts (export \* from './initTRPC')

\-> @trpc/server/index.ts (export { initTRPC } from '../../..')

\-> index.ts (export \* from './@trpc/server')

Eso es `ExportAll` → `Named` → `ExportAll`. Perry resuelve la cadena completa.

### Filtrado de exportaciones solo de tipos

Perry ahora verifica el flag `type_only` de SWC en declaraciones `ExportNamed` y `is_type_only` en especificadores individuales, omittiéndolos durante el lowering a HIR. Esto eliminó la generación de stubs muertos de re-exportaciones de tipos en los tres proyectos.

## Qué aún no funciona

Somos específicos aquí porque las brechas dicen tanto como los éxitos.

### Asignación dinámica de propiedades en `this`

Perry no soporta `this[variable] = value` aún, por lo que los métodos HTTP de Hono como `app.get`, `app.post` no están disponibles. Esta es la brecha más grande para Hono.

### Llamadas a constructores a nivel de módulo

`export const initTRPC = new TRPCBuilder()` no ejecuta el constructor en tiempo de ejecución, por lo que `initTRPC.create()` es `undefined`.

### Propiedades heredadas

`TRPCError extends Error`, y mientras `err.code` funciona, `err.message` (heredado de `Error`) no es accesible. La cadena de prototipos para búsqueda de propiedades no está completamente implementada.

### Clases Built-In de Web API

| Clase | Cantidad |
| --- | --- |
| Response | 11 |
| TransformStream | 7 |
| ReadableStream | 5 |
| Request | 4 |
| Headers | 3 |
| Proxy | 2 |
| TextEncoderStream | 2 |
| WritableStream | 1 |
| DOMException | 1 |

`Response`, `Request` y `Headers` son los críticos para cualquier framework HTTP. Estos necesitan soporte de codegen built-in similar a lo que ya tenemos para `Map`, `Set`, `RegExp`, `Buffer`, `AbortController` y otros.

## Qué nos dice esto

La buena noticia: el pipeline de compilación de Perry maneja código real de frameworks. Las brechas son de runtime, no de compilación. El trabajo restante es:

1.  **Asignación dinámica de propiedades** — necesaria para frameworks que configuran métodos programáticamente
2.  **Expresiones init a nivel de módulo** — `export const x = new Foo()` necesita ejecutar el constructor
3.  **Cadena de prototipos** — propiedades y métodos heredados
4.  **Built-ins de Web API** — `Response`, `Request`, `Headers` para frameworks HTTP

Son problemas concretos y bien definidos. Ninguno requiere cambios arquitectónicos — son extensiones de patrones que ya funcionan para casos más simples.

Seguiremos trabajando en esto. El objetivo es que `new Hono().get('/', (c) => c.text('hello'))` produzca un servidor HTTP funcional en un binario nativo.
