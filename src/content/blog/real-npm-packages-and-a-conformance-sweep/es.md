---
title: "Paquetes npm reales ya compilan: axios, zod, express — y un barrido de conformidad"
excerpt: "Las ~270 releases de v0.5.875 a v0.5.1146 no fueron sobre un benchmark — fueron sobre hacer que paquetes npm reales compilen y corran. axios, zod v4, express, fastify y hono ahora funcionan; la paridad de test262 saltó (String 60→79%, Array 61→72%); Windows se volvió Fluent con Mica; y DatePicker + arrastrar y soltar aterrizaron en cada plataforma."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
El último post terminó en **v0.5.875** con la historia del GC — cerrando el gap que expuso el benchmark de aya\_koto. Aquel post fue sobre ganar un benchmark. Este es sobre un tipo distinto de trabajo: las aproximadamente **270 releases entre v0.5.875 y v0.5.1146**, aterrizadas a lo largo de unas cuatro semanas, casi ninguna de las cuales es un titular de benchmark. El tema cambió de “ir rápido en un microbenchmark” a **“hacer que TypeScript del mundo real y paquetes npm reales realmente compilen y corran.”** Más una revisión visual completa de Windows y un montón de nuevos widgets por el camino.

Esto es lo que se lanzó, agrupado por para qué servía realmente.

## Paquetes npm reales ahora compilan

El hilo individual más grande a través de esta ventana es un barrido para hacer que paquetes npm populares compilen a binarios nativos y pasen pruebas de comportamiento — no solo “enlazar sin errores,” sino correr y producir la salida correcta. La lista que ahora funciona a través de `perry.compilePackages` incluye **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, y Colyseus**.

Cada uno fallaba por su propia razón, y cada fix es su propia pequeña historia:

-   **zod v4** crasheaba con `Cannot read properties of undefined (reading 'onattach')`. Causa raíz (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)): `new F()` donde `F` es una función importada de otro módulo producía en silencio un objeto vacío — el cuerpo del constructor nunca corría, así que cada check tipo `$ZodCheckMinLength` volvía despojado de su propiedad `_zod`.
-   **axios + jose** necesitaban crypto y compresión que Perry aún no tenía: `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` para AES-GCM, y `randomFillSync` (v0.5.972–976).
-   **fastify** se bloqueaba en un timeout de polling de un segundo en `wait_for_promise`; lo reemplazamos por una espera condvar e hicimos que las promesas rechazadas aparecieran como `HTTP 500` en lugar de colgarse (v0.5.912).
-   **@hono/node-server** no podía leer un cuerpo POST — `c.req.text()` / `.json()` / `.formData()` devolvían vacío en POST/PUT hasta un fix de registro padre en v0.5.1142.
-   **chalk, ms, debug, express** todos chocaron con la misma forma: un *valor invocable con propiedades adjuntas* (`chalk.red`, `express()` más `express.Router`). Tres variantes de ese patrón se arreglaron a lo largo de v0.5.935 y el barrido npm circundante, más `util.inherits` + un andamiaje de prototipo de stream para desbloquear express (v0.5.990).
-   **dayjs**, enviado como un bundle minificado, ejercitaba el dispatch de método de prototipo JS-clásico (`Class.prototype.m = fn`) que Perry hacía lowering mal (v0.5.924/932).

Debajo de todo eso está la parte que hace que los paquetes que Perry *no puede* compilar nativamente sigan corriendo: el **runtime de fallback de V8** se volvió real en esta ventana. Su ModuleLoader ahora lee de un mapa de módulos embebido, así que un binario de fallback sigue siendo **autocontenido** — sin `node_modules` sueltos en runtime (v0.5.994). `createServer` hace de puente a un servidor hyper real (v0.5.999), y los globales Web Fetch `Response` / `Request` / `Headers` existen en el camino de fallback (v0.5.1006). Y el **`import()` dinámico en tiempo de compilación** — `await import('./foo.ts')` con string-literal resuelto en build time — por fin aterrizó (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Un barrido de conformidad de test262

El otro hilo dominante es la conformidad. Corrimos pases enfocados contra los radares del subconjunto de test262 y movimos la aguja en los built-ins en los que el código real más se apoya:

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

El salto de String vino de darle a cada método de `String.prototype` dispatch genérico de `this` y arreglar la coerción de índices de `slice`/`substring`. El salto de Array fue `thisArg` en los callbacks de array denso (`forEach`/`map`/`filter`/…), `ToLength` tipo array-like, ordenamiento de operaciones de la spec, y validación de cero argumentos. El destructuring recogió destructuring de parámetros a través de métodos de clase plain, generator, async-generator, static, y private.

Junto a los números titulares, aterrizó una larga cola de correctitud: `JSON.parse` ahora lanza un `SyntaxError` real (no un `TypeError`) y rechaza tokens sobrantes; su reviver recorre vía el algoritmo `InternalizeJSONProperty` de la spec; `Object.prototype.toString` marca correctamente para typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; `RegExp.prototype.toString` devuelve `/source/flags`; los async generators acertaron su semántica de `yield`\-awaits-operand. Estos son radares de subconjunto, no la suite completa — Perry sigue escalando — pero la escalada de este mes fue empinada.

## Windows se vuelve Fluent

Windows recibió una revisión visual (la serie [#4681](https://github.com/PerryTS/perry/issues/4681)). Las ventanas de Perry ahora optan por el chrome DWM moderno por defecto — **fondo Mica**, esquinas redondeadas, y una barra de título consciente del tema — y los controles comunes se renderizan a través de **comctl32 v6** en lugar de los defaults de la era de Windows 95. El window proc ahora maneja `WM_DPICHANGED`, así que una ventana se mantiene nítida cuando la arrastras entre monitores con escalado mixto en lugar de quedar estirada como bitmap.

Crucialmente, nada de esto reintrodujo la vieja regresión [#1542](https://github.com/PerryTS/perry/issues/1542) de “área negra tras redimensionar”: el área de cliente sigue pintándose opaca, y el blur-through Mica/Acrylic de marco completo se queda como un opt-in explícito de `app.setVibrancy(...)`. También hay un nuevo andamiaje de backend `--target windows-winui` (WinUI 3) para apps que quieren el stack completamente moderno, y un fix pequeño pero real que hace que `perry compile main.ts -o main` produzca `main.exe` en Windows para que PowerShell efectivamente lo lance (v0.5.1146).

## Nuevos widgets, cada plataforma

Dos widgets aterrizaron solo en el último día, y ambos abarcan cada plataforma de UI a la que Perry apunta:

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — un control de fecha compacto, estilo campo: `NSDatePicker` en macOS, `UIDatePicker` (.compact) en iOS/visionOS, `SysDateTimePick32` en Windows, `android.widget.DatePicker` en Android, GTK4 en Linux. Una sola superficie TS a través de todos ellos.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — cualquier widget puede ser destino de soltado y origen de arrastre para texto/archivos/URLs, mapeado a `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit), y `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Antes en la ventana la estantería de widgets también se llenó a lo largo de escritorio y móvil — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, y una ImageGallery deslizable — cada uno respaldado por el control nativo real en cada plataforma. HarmonyOS (ArkTS) recibió Chart y TreeView (v0.5.893), los dos últimos widgets que necesitaba para alcanzar paridad con los demás.

## GC, internals, y estabilidad

La mayoría de esas 270 releases no son titulares — son fixes de bugs e internals, y ese es el punto de esta fase. Algunos que vale la pena destacar:

-   **El GC continuó.** El trabajo de free-list condicional del post del GC siguió asentándose, y se cerró una clase aguda de bug: las Promises con puente nativo ahora están **fijadas mientras están en vuelo en un worker de tokio** para que el GC no pueda barrerlas antes de que aterrice la resolución (v0.5.923). Si corriste un fetch async bajo carga y viste una colección fantasma, era esto.
-   **El modelo de memoria está documentado.** Ahora hay un análisis a fondo en `internals/memory-model.md` — NaN-boxing, el GC generacional, la shadow stack, y las write barriers — cableado en el sitio de docs (v0.5.933).
-   **Una ola de fixes de estabilidad de codegen** aflorados por el barrido npm: una arrow `const` a nivel de módulo llamada dentro de un paso async reanudado ya no hace SIGSEGV (v0.5.953), `try { await rejected } catch { return X }` ya no se cuelga para siempre (v0.5.870), y un puñado de crashes de `js_is_truthy` / rango de raw-pointer que tropezaban los bundles reales.

## Tareas domésticas de Apple

Más pequeño pero real: `perry setup ios --development` ahora aprovisiona para builds de desarrollo (v0.5.1023), y el camino de build/link de cross-library de Apple se dedupicó y se hizo portable en ancho de puntero (v0.5.1121/1125) — que es lo que desbloqueó la matriz de publicación npm / Homebrew / APT / winget que había estado atascada.

## Dónde deja esto las cosas

La apuesta detrás de Perry siempre ha sido que “TypeScript nativo” solo importa si corre TypeScript *real* — no un subconjunto de juguete, los paquetes reales que la gente hace `npm install`. Este mes fue mayormente ese trabajo: menos un único número del que presumir, más un empuje largo y poco glamoroso para cerrar el gap entre “compila” y “funciona.” Los radares de conformidad y los tests de paridad npm son el marcador que estamos vigilando ahora, y seguiremos publicando los números — los buenos y los todavía imperfectos.

Fuente: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Problemas: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
