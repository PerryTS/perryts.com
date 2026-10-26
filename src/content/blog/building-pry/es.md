---
title: "Construyendo Pry: un visor de JSON nativo en TypeScript"
excerpt: "A walkthrough of building Pry, a native JSON viewer compiled from TypeScript to machine code with the Perry runtime and GC linked in and no webview."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry es un visor JSON nativo construido completamente en TypeScript y compilado con Perry. No es una demo técnica — es una herramienta real que usamos a diario para inspeccionar respuestas de API, archivos de configuración y volcados de datos. Este artículo recorre cómo fue construido, cómo compila y cómo es la experiencia de desarrollo cuando tu TypeScript compila a una app nativa.

## Qué hace Pry

Pry lee un archivo JSON (o acepta JSON desde stdin) y lo renderiza como un árbol interactivo y navegable en una ventana nativa. Si has usado el Quick Look integrado de macOS para JSON, imagina eso — pero más rápido, con búsqueda y con navegación por teclado.

El conjunto de funcionalidades:

-   **Vista de árbol** — nodos plegables para objetos y arrays, con indicadores de profundidad y expandir/colapsar todo
-   **Búsqueda** — búsqueda de texto completo en claves y valores con resaltado en tiempo real y navegación de coincidencias
-   **Atajos de teclado** — flechas para navegar, enter para expandir/colapsar, barra para buscar, `⌘C` para copiar
-   **Portapapeles** — copiar cualquier nodo o subárbol como JSON formateado
-   **Coloreo de sintaxis** — strings en verde, números en naranja, booleanos en púrpura, null en rojo
-   **Barra de estado** — muestra el conteo total de nodos, profundidad actual, tamaño de archivo y tiempo de análisis

## El código fuente

Pry está escrito en TypeScript estándar. No hay sintaxis especial, no hay macros, no hay generación de código en tiempo de compilación. Usa la API de UI de Perry, que proporciona widgets nativos que compilan a código específico de plataforma.

Aquí está el punto de entrada (simplificado para claridad):

pry.ts

import { App, VStack, TreeView, SearchBar, StatusBar, State }

from "perry/ui";

import { readFile, readStdin } from "perry/fs";

// Leer entrada desde argumento de archivo o stdin

const input = process.argv\[2\]

? readFile(process.argv\[2\])

: readStdin();

const startTime = Date.now();

const data = JSON.parse(input);

const parseMs = Date.now() - startTime;

// Estado reactivo

const searchQuery = new State("");

const matchCount = new State(0);

// Construir la app

const app = new App("Pry", {

width: 800,

height: 600,

minWidth: 400,

minHeight: 300,

});

app.body(() => {

return VStack({ spacing: 0 }, \[

SearchBar({

placeholder: "Search keys and values...",

onSearch: (q) => searchQuery.value = q,

}),

TreeView(data, {

collapsible: true,

syntaxHighlight: true,

searchQuery: searchQuery,

onMatchCount: (n) => matchCount.value = n,

copyOnClick: true,

}),

StatusBar(\[

\`${countNodes(data)} nodes\`,

\`Parsed in ${parseMs}ms\`,

\`${matchCount.value} matches\`,

\]),

\]);

});

app.registerShortcut("/", () => app.focusSearchBar());

app.registerShortcut("Escape", () => {

searchQuery.value = "";

app.focusTree();

});

app.run();

Ese es el núcleo de una aplicación nativa. Sin boilerplate de framework, sin configuración de compilación, sin archivos específicos de plataforma. Un archivo TypeScript.

### Las funciones auxiliares

Pry también incluye una utilidad `countNodes` que cuenta recursivamente todos los nodos en el árbol JSON, y un helper `formatBytes` para mostrar tamaños de archivo. Son funciones TypeScript estándar — nada específico de Perry en ellas. Compilan a código nativo igual que todo lo demás.

utils.ts

export function countNodes(data: unknown): number {

if (data === null || typeof data !== "object") {

return 1;

}

if (Array.isArray(data)) {

return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);

}

const values = Object.values(data as Record<string, unknown\>);

return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);

}

## Compilando Pry

Compilar Pry con Perry es un solo comando. Sin proyecto Xcode, sin configuración Gradle, sin config de webpack. Solo apuntar Perry al archivo de entrada y especificar tu objetivo.

### macOS (ARM64)

$ perry build pry.ts --target macos-arm64

Parsing pry.ts...

Resolving imports: perry/ui, perry/fs

Compiling (cranelift, arm64)...

Linking with AppKit.framework...

✓ Built executable: pry (48 MB)

$ file pry

pry: Mach-O 64-bit executable arm64

$ otool -L pry | head -5

pry:

/System/Library/Frameworks/AppKit.framework/AppKit

/System/Library/Frameworks/Foundation.framework/Foundation

/usr/lib/libSystem.B.dylib

El binario tiene 48 MB porque incluye el stack completo de UI AppKit — renderizado de vista de árbol, resaltado de búsqueda, coloreo de sintaxis y manejo de teclado. Para comparación, la misma app en Electron sería de más de 200 MB. Una app Perry solo CLI compila a 2-5 MB.

### iOS

$ perry build pry.ts --target ios-arm64

✓ Built executable: pry (52 MB)

La compilación iOS enlaza contra UIKit en lugar de AppKit. Perry mapea la misma API `TreeView` a `UITableView` con secciones expandibles, `SearchBar` a `UISearchBar`, y los eventos táctiles reemplazan los eventos de ratón. La compilación iOS puede desplegarse en dispositivos físicos y simuladores.

### Android

$ perry build pry.ts --target android-arm64

✓ Built: pry.apk

La compilación Android genera una biblioteca nativa cargada a través de JNI, empaquetada en un APK. `TreeView` mapea a un `RecyclerView` con view holders expandibles, `SearchBar` mapea a un `EditText` con un `TextWatcher`, y la barra de estado mapea a un `TextView` en la parte inferior del layout.

## Qué pasa bajo el capó

Cuando Perry compila Pry, pasa por varias fases:

1.  **Análisis** — SWC analiza el código fuente TypeScript en un AST. Los imports de `perry/ui` y `perry/fs` se resuelven a las implementaciones de módulos incorporados de Perry.
2.  **Análisis de tipos** — Perry resuelve todos los tipos, incluyendo los genéricos `State<string>` y `State<number>`, monomorfizándolos en tipos concretos.
3.  **Resolución de plataforma** — Basándose en el flag de objetivo, Perry selecciona el backend de UI apropiado. Cada llamada a `TreeView`, `SearchBar` y `Button` se resuelve a la implementación específica de la plataforma.
4.  **Generación de IR** — Perry genera una representación intermedia que incluye llamadas a API nativas — envíos de mensajes Objective-C para macOS/iOS, llamadas JNI para Android, llamadas a funciones C para GTK4/Win32.
5.  **Generación de código** — Cranelift compila la IR a código máquina nativo para la arquitectura objetivo.
6.  **Enlace** — El código nativo se enlaza contra los frameworks de la plataforma (AppKit, UIKit, Android NDK, GTK4 o Win32) para producir el ejecutable final.

## Sin runtime, sin vistas web

Esto vale la pena enfatizarlo porque es la diferencia central entre Perry y cualquier otro enfoque TypeScript-a-nativo. El binario compilado de Pry tiene:

-   **Sin motor JavaScript** — sin V8, sin Hermes, sin JavaScriptCore
-   **Sin vistas web** — sin Chromium, sin WebKit, sin WKWebView
-   **Sin capa bridge** — sin mensajes serializados entre JS y nativo
-   **Sin runtime de framework** — sin React, sin motor Flutter, sin VM Dart

El binario llama a las APIs de la plataforma directamente. En macOS, llama a `objc_msgSend` para interactuar con objetos AppKit. En Android, llama a funciones JNI para crear y manipular Views. Es lo mismo que haría una app nativa Swift o Kotlin.

La consecuencia práctica: Pry se lanza instantáneamente. No hay arranque de VM, no hay calentamiento JIT, no hay análisis de scripts. El proceso arranca, la ventana aparece, el JSON se renderiza. El uso de memoria es una fracción de lo que un equivalente Electron consumiría.

## Experiencia de desarrollo

Construir Pry se sintió notablemente similar a construir cualquier aplicación TypeScript. El flujo de trabajo es:

1.  Escribir TypeScript en tu editor (VS Code, Zed, Neovim, lo que prefieras)
2.  Ejecutar `perry compile pry.ts`
3.  Ejecutar `./pry test.json`
4.  Iterar

Sin proyecto Xcode que configurar. Sin Android Studio que instalar. Sin compilación Gradle de 45 segundos. El compilador Perry en sí es rápido — analizar y compilar Pry toma unos pocos segundos, y estamos trabajando activamente en hacerlo más rápido.

El TypeScript que escribes es TypeScript estándar. La verificación de tipos de tu editor, el autocompletado y las herramientas de refactorización funcionan todas. Puedes extraer funciones, crear módulos, usar genéricos — todos los patrones TypeScript que ya conoces.

## Qué aprendimos

Construir Pry nos enseñó mucho sobre lo que la API de UI de Perry necesita soportar. Algunas lecciones:

-   **Las vistas de árbol son complejas.** Expandir, colapsar, resaltado de búsqueda, navegación por teclado e integración con el portapapeles necesitan estar coordinados. El widget `TreeView` de Perry maneja esto internamente, pero tuvimos que asegurarnos de que la implementación nativa fuera consistente en las tres plataformas.
-   **Los atajos de teclado necesitan convenciones de plataforma.** En macOS, es `⌘C` para copiar. En Linux y Android, es `Ctrl+C`. El sistema de atajos de Perry abstrae esto, pero requirió una implementación cuidadosa para hacerlo bien.
-   **Las barras de estado son sorprendentemente no triviales.** Cada plataforma tiene una convención diferente sobre dónde y cómo mostrar información de estado. AppKit usa la barra inferior de la ventana, UIKit usa una toolbar, Android usa una view inferior en el layout. La `StatusBar` de Perry mapea a cada una correctamente.
-   **El soporte de stdin requirió conciencia de plataforma.** En macOS y Linux, leer de stdin es directo. En iOS y Android, stdin no "existe" realmente de la misma manera, así que Pry usa selección de archivos en plataformas móviles. El `readStdin` de Perry maneja esto de forma transparente.

## Rendimiento

Pry maneja archivos JSON grandes cómodamente. En nuestras pruebas:

-   Un archivo JSON de 1 MB (más de 10.000 nodos) analiza y renderiza en menos de 50 ms
-   Un archivo JSON de 10 MB renderiza en menos de 200 ms
-   La búsqueda en 10.000 nodos devuelve resultados mientras escribes, sin retraso visible
-   El uso de memoria se mantiene por debajo de 50 MB incluso para archivos grandes

Esta es la ventaja de la compilación nativa. El análisis JSON en Perry se compila a bucles nativos ajustados sin pausas de GC. El renderizado del árbol usa las vistas de lista virtualizadas propias de la plataforma (NSOutlineView, UITableView, RecyclerView), que están probadas en batalla para rendimiento.

## Código fuente y descargas

Pry es open source. Puedes explorar el código fuente completo, compilarlo tú mismo, o simplemente mirar el código para entender cómo está estructurada una app de UI nativa de Perry.

-   [Repositorio GitHub](https://github.com/perryts/pry) — código fuente completo e instrucciones de compilación
-   [Página del showcase](/es/showcase/pry/) — capturas de pantalla, lista de funcionalidades y detalles de plataforma

Si estás construyendo algo con Perry, nos encantaría saberlo. Abre un issue en el [repositorio de Perry](https://github.com/PerryTS/perry) o inicia una discusión. Estamos construyendo Perry de forma abierta y el feedback de usuarios reales construyendo apps reales es invaluable.
