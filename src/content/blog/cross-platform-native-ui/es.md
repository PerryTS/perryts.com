---
title: "UI nativa multiplataforma desde TypeScript"
excerpt: "Cómo Perry asigna una base de código TypeScript a widgets de plataforma en sus objetivos documentados, incluidas las limitaciones y requisitos previos específicos de la plataforma."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Uno de los objetivos más ambiciosos de Perry es ofrecer aplicaciones GUI verdaderamente nativas desde una única base de código TypeScript. No son vistas web envueltas en un shell nativo. No es un motor de renderizado personalizado dibujando sus propios píxeles. Widgets nativos reales, renderizados por el framework de UI propio de cada plataforma, compilados desde TypeScript en tiempo de compilación.

Este artículo explica cómo funciona — la arquitectura, el mapeo de plataformas, los compromisos y dónde estamos hoy.

## El problema con los enfoques actuales

El desarrollo de GUI multiplataforma ha sido un problema difícil durante décadas. Cada framework importante ha hecho un conjunto diferente de compromisos:

### Electron / Tauri (Basado en web)

Electron empaqueta Chromium y Node.js, dándote un navegador web como shell de la app. Tienes acceso completo a la plataforma web, pero tu app "nativa" es una descarga de más de 150 MB que usa cientos de megabytes de RAM solo para mostrar una ventana. Tauri reemplaza Chromium con la vista web del SO, reduciendo el tamaño dramáticamente, pero tu UI sigue siendo HTML/CSS renderizado en una vista web — no widgets nativos.

### React Native (Basado en bridge)

React Native ejecuta tu JavaScript en un motor JS (Hermes o V8) y hace puente hacia widgets nativos a través de una cola de mensajes serializada. Obtienes widgets nativos reales, pero el bridge añade latencia, especialmente para gestos y animaciones. Las interacciones complejas requieren bajar a código nativo (Swift/Kotlin), derrotando la promesa de una única base de código.

### Flutter (Renderizador personalizado)

Flutter compila Dart a código nativo y dibuja todo con su propio motor de renderizado basado en Skia. El rendimiento es excelente, pero tus widgets no son nativos — son réplicas perfectas a nivel de píxel. Esto significa que las convenciones de la plataforma (física de desplazamiento, selección de texto, comportamientos de accesibilidad) deben reimplementarse en lugar de heredarse. Y en escritorio, las diferencias se notan más.

### KMP + Compose Multiplatform (Parcialmente nativo)

Kotlin Multiplatform compila a JVM en Android y nativo en iOS, pero la UI compartida a través de Compose Multiplatform usa un renderizador personalizado basado en Skia — el mismo compromiso que Flutter. Para UI verdaderamente nativa, vuelves a escribir código específico de plataforma.

## El enfoque de Perry: Compilar a toolkits nativos

Perry toma un enfoque fundamentalmente diferente. En lugar de ejecutar tu código en un runtime y hacer puente hacia widgets nativos, o dibujar píxeles personalizados, Perry compila tu código de UI TypeScript directamente en llamadas al toolkit nativo de cada plataforma en tiempo de compilación.

La diferencia clave: **no hay capa de runtime entre tu código y el SDK de la plataforma.** El binario compilado llama a AppKit, UIKit, Android Views, GTK4 o Win32 directamente, exactamente como lo haría una app escrita en Swift, Kotlin o C++.

## La API de UI unificada

Perry proporciona una API TypeScript común para construir interfaces de usuario. Esta API es deliberadamente de alto nivel — describes lo que tu UI debe contener y cómo debe comportarse, y Perry lo mapea a los constructos nativos apropiados.

**contador.ts**

```typescript
import { App, Text, Button, VStack, State } from "perry/ui";
const count = new State(0);
const app = new App("Counter", { width: 400, height: 300 });
app.body(() => {
return VStack({ spacing: 16, alignment: "center" }, [
Text(`Count: ${count.value}`, { fontSize: 32 }),
Button("Increment", () => count.value++),
Button("Reset", () => count.value = 0),
]);
});
app.run();
```

Este mismo código compila a UI nativa en las seis plataformas. Sin `#ifdef`, sin comprobaciones de plataforma, sin imports condicionales.

## Mapeo de plataformas en detalle

Así es como Perry mapea la API unificada al framework nativo de cada plataforma:

### macOS — AppKit

En macOS, Perry genera código que crea y gestiona objetos AppKit directamente. Un `App` se convierte en una `NSApplication` con un `NSWindow`. `Text` se convierte en `NSTextField` (con edición desactivada). `Button` se convierte en `NSButton` con un patrón target-action conectado a tu callback. `VStack` se convierte en un `NSStackView` con orientación vertical. El layout usa restricciones Auto Layout.

El binario compilado enlaza contra el framework AppKit y llama a funciones del runtime Objective-C directamente. Es lo mismo que haría Swift compilado por Xcode.

### iOS & iPadOS — UIKit

En iOS, el mapeo es similar pero apunta a UIKit. `App` se convierte en una `UIApplication` con un `UIWindow` y un `UIViewController` raíz. `Text` mapea a `UILabel`. `Button` mapea a `UIButton`. El layout usa `UIStackView` y Auto Layout. Los eventos táctiles se manejan a través de la cadena de respondedores de UIKit.

### Android: JNI + Vistas

En Android, Perry genera una biblioteca nativa cargada vía JNI (Java Native Interface). `App` mapea a una `Activity`. `Text` se convierte en un `TextView`. `Button` se convierte en un `android.widget.Button` con un `OnClickListener`. `VStack` mapea a un `LinearLayout` vertical. El código nativo llama de vuelta al framework Android a través de JNI, creando y manipulando vistas Android reales.

### Linux — GTK4

En Linux, Perry apunta a GTK4. `App` se convierte en una `GtkApplication` con un `GtkApplicationWindow`. `Text` mapea a `GtkLabel`. `Button` mapea a `GtkButton` con un manejador de señales. `VStack` mapea a una `GtkBox` con orientación vertical. El theming CSS de GTK4 significa que tu app sigue automáticamente el tema de escritorio del usuario.

### Windows: Win32

En Windows, Perry genera llamadas a la API Win32. `App` crea una clase de ventana, la registra y ejecuta un bucle de mensajes. `Button` se convierte en un control `BUTTON` creado con `CreateWindowEx`. `Text` mapea a un control `STATIC`. Los eventos se manejan a través de la bomba de mensajes Win32 (`WM_COMMAND`, `WM_NOTIFY`, etc.).

## Gestión de estado

La primitiva `State<T>` de Perry proporciona gestión de estado reactiva que compila a mecanismos de actualización nativos de la plataforma. Cuando un valor de estado cambia, Perry dispara una actualización de UI a través del sistema de invalidación propio de la plataforma — `setNeedsDisplay` en macOS/iOS, `invalidate()` en Android, `gtk_widget_queue_draw` en Linux.

No hay diffing de DOM virtual, no hay pase de reconciliación, no hay serialización. Los cambios de estado se propagan directamente al widget nativo que muestra el valor.

## ¿Por qué no la sintaxis de SwiftUI / Jetpack Compose?

Podrías preguntarte por qué Perry no usa una sintaxis declarativa similar a SwiftUI o Jetpack Compose. La respuesta es pragmática: Perry compila TypeScript, y TypeScript tiene sus propios modismos. En lugar de inventar un DSL que parezca extraño para los desarrolladores TypeScript, Perry usa una API estilo builder que se siente natural en TypeScript — constructores, llamadas a métodos, callbacks y closures. Son los mismos patrones que ya usas al trabajar con Express, hooks de React o cualquier otra biblioteca TypeScript.

## Qué está disponible hoy

Los seis backends de plataforma están implementados y estables. El conjunto actual de widgets incluye:

-   **Layout** — VStack, HStack, Spacer, ScrollView, Divider
-   **Visualización** — Text, Image
-   **Entrada** — Button, TextField, Toggle, Slider
-   **Navegación** — NavigationView, TabView, List
-   **Contenedores** — TreeView, SearchBar, StatusBar
-   **Estado** — State<T> para actualizaciones reactivas

## Qué viene

Estamos expandiendo activamente la biblioteca de widgets. Próximamente:

-   `SecureField` — entrada de contraseña con entrada de texto segura nativa de la plataforma
-   `ProgressView` — indicadores de progreso determinados e indeterminados
-   `Alert` — diálogos de alerta nativos con botones y campos de texto
-   `DatePicker` — selección de fecha/hora nativa de la plataforma
-   `Menu` — barras de menú y menús contextuales nativos

El objetivo es paridad completa del framework GUI en todas las plataformas — cada widget, layout, gesto y animación disponible en todas partes. Consulta la [hoja de ruta](/es/roadmap/) para el panorama completo.

## Pruébalo

La mejor manera de entender la UI nativa de Perry es verla en acción. [Pry](/es/showcase/pry/) es un visor JSON nativo construido completamente en TypeScript con Perry — una app real con navegación en árbol, búsqueda y atajos de teclado, compilada a binarios nativos en macOS, iOS y Android. Lee el [recorrido completo](/es/blog/building-pry/) de cómo fue construido.
