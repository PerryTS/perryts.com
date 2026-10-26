---
title: "Las seis plataformas, paridad total de funcionalidades"
excerpt: "Más de 20 widgets UI nativos, un widget Canvas, vistas de tabla, notificaciones del sistema, acceso al llavero, soporte multi-ventana y paridad completa de funcionalidades en macOS, iOS, iPadOS, Android, Linux y Windows — todo desde un único código TypeScript."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Cuando lanzamos la primera versión del sistema de UI nativo de Perry, "multiplataforma" significaba que macOS funcionaba bien y las otras cinco plataformas eran stubs. Hoy, con v0.2.162, eso ya no es así. Las seis plataformas — macOS, iOS, iPadOS, Android, Linux y Windows — comparten ahora paridad completa de funcionalidades. El mismo código TypeScript compila a widgets nativos en cada objetivo.

Este artículo recorre lo que lanzamos entre v0.2.152 y v0.2.164: un widget Canvas, una implementación completa de NSTableView, más de 20 widgets de UI en total, el módulo `perry/system`, soporte multi-ventana, notificaciones del sistema, acceso al llavero, reducción automática del tamaño del binario y un sistema de plugins en tiempo de compilación. Pasaron muchas cosas.

## El sprint de widgets: Más de 20 componentes de UI nativos

El mayor salto individual llegó con v0.2.155, que introdujo más de 20 widgets de UI en todas las plataformas. La API de UI TypeScript de Perry ahora cubre los componentes que realmente necesitas para lanzar una app real:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Entrada** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Visualización** — Text, Label, Image, ProgressView, Divider, Spacer
-   **Datos** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Dibujo** — Canvas (API de dibujo 2D, acelerado por hardware por plataforma)

Estos no son wrappers alrededor de un renderizador personalizado. Cada widget compila al componente nativo propio de la plataforma: `NSButton` en macOS, `UIButton` en iOS, `GtkButton` en Linux, `android.widget.Button` en Android vía JNI, y `CreateWindowEx` en Windows. El SO los dibuja, les aplica tema y maneja la accesibilidad — Perry solo conecta la API TypeScript.

## Canvas: Dibujo 2D desde TypeScript

Una de las adiciones técnicamente más interesantes es el widget Canvas (v0.2.152). Expone una API de dibujo 2D familiar directamente desde TypeScript — curvas de Bézier, rellenos, trazos, transferencia de imágenes — y compila al backend 2D acelerado de la plataforma: Core Graphics en macOS/iOS, Cairo en Linux, Direct2D en Windows y Skia en Android.

canvas.ts

import { Canvas, Color } from 'perry/ui';

// Compila a Core Graphics en macOS, Cairo en Linux, etc.

const canvas = new Canvas({ width: 400, height: 300 });

canvas.onDraw((ctx) => {

ctx.fillStyle = Color.amber;

ctx.fillRect(10, 10, 100, 60);

ctx.strokeStyle = Color.blue;

ctx.lineWidth = 2;

ctx.beginPath();

ctx.arc(200, 150, 80, 0, Math.PI \* 2);

ctx.stroke();

});

## Widget Table: NSTableView llega a TypeScript

v0.2.163 trajo el widget Table — el componente más complejo de la biblioteca. En macOS se mapea a `NSTableView` con toda la conexión delegate/data source. En Linux usa `GtkTreeView` de GTK4. En Windows, el control `ListView` de Win32. En Android se vincula a `RecyclerView` a través de JNI.

La API TypeScript es declarativa: defines columnas, proporcionas una fuente de datos, y Perry maneja la conexión específica de la plataforma en tiempo de compilación. La ordenación de columnas, el manejo de selección y la personalización de altura de fila funcionan directamente.

table.ts

import { Table, Column } from 'perry/ui';

const table = new Table({

columns: \[

new Column({ title: "Name", key: "name", width: 200 }),

new Column({ title: "Size", key: "size", width: 80 }),

\],

rows: files, // Array de objetos TypeScript

onSelect: (row) => console.log(row.name),

});

## El módulo perry/system

v0.2.155 también introdujo `perry/system` — un módulo TypeScript que expone APIs del sistema de la plataforma sin ningún runtime: diálogos de archivos, diálogos de guardado, alertas, sheets, acceso al llavero, notificaciones del sistema y gestión multi-ventana.

-   `system.showOpenDialog()` — selector de archivos nativo (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — diálogo de guardado nativo
-   `system.showAlert()` — panel de alerta nativo
-   `system.notify()` — notificación del SO (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Keychain Services / Secret Service / Windows Credential Store
-   `system.openWindow()` — gestión multi-ventana

Todos estos llaman a APIs nativas de la plataforma directamente — sin IPC de Electron, sin puente de vista web. Perry compila el punto de llamada TypeScript a una llamada de función nativa directa al SDK de la plataforma.

## Paridad de funcionalidades en seis plataformas: v0.2.162

El hito v0.2.162 trató de cerrar brechas. Antes de esta versión, macOS tenía el conjunto de funcionalidades más completo, iOS estaba casi listo, y Linux/Windows/Android iban rezagados. v0.2.162 llevó las seis plataformas al mismo nivel:

-   **macOS** — AppKit, conjunto completo de widgets, Keychain, notificaciones, multi-ventana, toolbar
-   **iOS / iPadOS** — UIKit, paridad completa de widgets con macOS, ciclo de vida de scene
-   **Android** — puente JNI, todos los widgets vía Android Views, compilación cruzada NDK
-   **Linux** — GTK4, conjunto completo de widgets incluyendo Table, diálogos de archivo, llavero libsecret
-   **Windows** — Win32, todos los widgets, Windows Credential Store, notificaciones WinRT

Este es el hito que hace "una base de código, seis plataformas" real en lugar de aspiracional. El mismo archivo TypeScript compila a apps nativas en los seis objetivos sin necesidad de rutas de código específicas de plataforma para los casos de uso comunes.

## Reducción automática del tamaño del binario

v0.2.153 introdujo la reducción automática del tamaño del binario — el compilador ahora elimina agresivamente las rutas de código no utilizadas, elimina funciones stdlib inalcanzables y deduplica definiciones de símbolos durante el enlace. Una herramienta CLI típica que previamente compilaba a ~4 MB ahora queda por debajo de 2 MB sin cambios en tu código fuente.

Esto importa para despliegues reales. Cuando tu binario es la unidad de despliegue — copiado a un servidor, distribuido como un solo archivo, embebido en un contenedor — el tamaño afecta directamente al tiempo de transferencia y al coste de almacenamiento. Reducir el tamaño del binario a la mitad sin coste es una mejora significativa.

## El sistema de plugins en tiempo de compilación

v0.2.152 introdujo el sistema de plugins de Perry — y es arquitectónicamente diferente a cualquier otro sistema de plugins en el ecosistema TypeScript. No hay carga de plugins en tiempo de ejecución, no hay IPC, no hay `require()` dinámico. Los plugins son módulos TypeScript que Perry resuelve y compila en tiempo de compilación.

El resultado: los plugins tienen exactamente cero sobrecarga en tiempo de ejecución. Se compilan en el mismo binario que el código de tu aplicación, con llamadas a funciones directas entre el código del plugin y el código del host. Si no usas un plugin, no aparece en tu binario. Si lo usas, se inlinea como cualquier otro módulo.

Escribimos sobre la filosofía detrás de esto en [Los sistemas de plugins son un impuesto al rendimiento](/es/blog/plugin-systems-are-a-performance-tax/). La versión corta: las arquitecturas de plugins en tiempo de ejecución sacrifican rendimiento por extensibilidad. La composición en tiempo de compilación te da ambas cosas.

## Mejoras del lenguaje

El sprint de UI no ocurrió de forma aislada — el compilador en sí siguió siendo cada vez más capaz. A lo largo de estas versiones:

-   **Expresiones de clase** — `const Foo = class extends Bar {}` ahora compila correctamente
-   **Transformaciones de generadores** — `function*` y `yield` compilan a máquinas de estado nativas
-   **Map/Set como campos de clase** — `private items = new Map()` funciona en codegen
-   **Coerción de tipos de parámetros FFI** — las llamadas a bibliotecas nativas manejan la coerción de tipos automáticamente
-   **Referencias a métodos vinculados** — las referencias `this.method` funcionan para módulos nativos (fs, os, path)
-   `string.match()` — ahora completamente soportado
-   `path.isAbsolute()`, `path.join()` multi-argumento, `path.resolve()`
-   **Objetivo web** — Perry ahora puede compilar a una salida compatible con web para despliegues híbridos

## Qué viene después

Con la paridad de UI en seis plataformas lanzada, la siguiente fase es profundidad sobre amplitud. Estamos trabajando en:

-   Soporte completo de RegExp (`regex.test()`, `string.matchAll()`)
-   Arrastrar y soltar, menús contextuales personalizados y etiquetas de accesibilidad en el sistema de widgets
-   Una extensión de VS Code para diagnósticos de Perry y compilación al guardar
-   Integración con gestor de paquetes — instalar y compilar paquetes nativos de Perry con un solo comando
-   Objetivo de compilación WASM para despliegue en navegador
-   Multi-threading vía threads `Worker`

Si quieres seguir el desarrollo, el [repositorio de Perry](https://github.com/PerryTS/perry) es abierto. Echa un vistazo al [showcase](/es/showcase/) para ver qué se está construyendo, o consulta la [hoja de ruta](/es/roadmap/) para el panorama completo.
