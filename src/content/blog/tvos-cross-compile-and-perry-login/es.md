---
title: "tvOS, compilación cruzada de iOS desde Linux y Perry Login"
excerpt: "Perry v0.4.24: tvOS como 10.º objetivo de compilación, compilación cruzada de iOS y macOS desde Linux vía ld64.lld, perry login con facturación por uso, renovación de la UI de Windows, notarización de macOS y 120 commits en 5 días."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Cinco días, 120 commits, y Perry salta de v0.4.0 a v0.4.24. Lo destacado: tvOS se convierte en el 10.º objetivo de compilación, las apps de iOS y macOS ahora pueden construirse completamente desde Linux, perry login trae facturación basada en uso, y la UI de Windows recibe una renovación completa. Aquí está todo lo que se lanzó.

## tvOS: El 10.º objetivo de compilación

Perry ahora compila para Apple TV. El objetivo tvOS usa el mismo renderizador SwiftUI que watchOS, compartiendo la arquitectura basada en datos donde Perry construye un árbol de UI y una app host Swift incluida lo renderiza de forma nativa. Combinado con la integración WASM existente de `@perry/threads`, las apps de tvOS pueden ejecutar cargas de trabajo pesadas en segundo plano mientras mantienen la interfaz de usuario receptiva.

```
# Compilar para Apple TV
perry compile main.ts --target tvos

# Ejecutar en el simulador de tvOS
perry run tvos
```

Esto eleva el recuento total de objetivos a **10**: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly y Web/JavaScript. Una base de código TypeScript, diez salidas nativas.

## Compilación cruzada de iOS y macOS desde Linux

Perry ahora puede construir binarios de iOS y macOS completamente desde una máquina Linux usando `ld64.lld` como enlazador Mach-O. Esta es la pieza que faltaba para CI/CD completamente automatizado — enviar TypeScript a un servidor Linux y obtener binarios nativos firmados para cada plataforma Apple sin una máquina de compilación macOS.

Llegar aquí requirió resolver una cascada de problemas del enlazador:

-   **Triple de codegen Mach-O** — se añadieron los triples de destino `aarch64-apple-macos` y `aarch64-apple-ios` para Cranelift
-   **Enlace de frameworks** — rutas de búsqueda de frameworks CoreGraphics, Metal, IOKit, DiskArbitration para compilación cruzada
-   **`-lobjc`** — símbolos del runtime ObjC necesarios para todos los objetivos Apple
-   **Versión del SDK** — `sdk_version 26.0` en ld64.lld (Apple requiere iOS 18+)
-   **Dead stripping** — `-dead_strip` en lugar de `-Wl,-dead_strip` para el enlazador Mach-O
-   **Deduplicación del runtime** — eliminar `perry_runtime` duplicado de las bibliotecas estáticas de UI para evitar errores de enlace

Combinado con la compilación cruzada existente de Linux → Windows (v0.2.195+), Perry ahora puede compilar cruzadamente a **todas las plataformas desde Linux** — iOS, macOS, Windows, Android, WASM y Web.

## Preparación para el App Store de iOS

Un enfoque principal de este ciclo fue hacer que las apps iOS compiladas con Perry sean totalmente compatibles con el App Store:

-   **Info.plist completo** — todas las claves requeridas por Apple: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — nomenclatura estándar de iconos iOS (`AppIcon60x60@2x`, etc.) con resolución de respaldo
-   **Versión desde perry.toml** — los campos `version` y `build_number` fluyen directamente a la Info.plist
-   **UILaunchScreen** — usa la clave moderna en lugar de `UILaunchStoryboardName` (no necesita archivo de storyboard)
-   **Perfiles de aprovisionamiento** — soporte de perfiles de aprovisionamiento macOS para distribución App Store y TestFlight

## Perry Login y facturación

Perry ahora tiene cuentas y facturación basada en uso, impulsado por un nuevo comando CLI `perry login` y un panel de control en [app.perryts.com](https://app.perryts.com).

### Cómo funciona

-   **`perry login`** — flujo de dispositivo GitHub OAuth, abre el navegador, consulta el estado de finalización
-   **Nivel gratuito** — 15 compilaciones/mes, proyectos ilimitados con una cuenta de GitHub
-   **Nivel Pro** — compilaciones ilimitadas mediante suscripción a Polar.sh
-   **Tokens de API** — generar y gestionar tokens desde el panel de control para CI/CD
-   **Seguimiento de uso** — contadores mensuales de publicación y verificación con barras de uso en tiempo real

El panel de control en sí es un servidor Fastify compilado con Perry con una exportación estática de Next.js — construido con Perry, sirviendo a usuarios de Perry.

## Notarización de macOS y firma de código

Dos nuevas capacidades de firma:

-   **`perry publish macos --notarize`** — cambia automáticamente al certificado Developer ID (en lugar del certificado App Store), envía al servicio de notarización de Apple y adjunta el resultado
-   **Firma de código con GCloud KMS** — las compilaciones de Windows ahora pueden firmarse usando claves de Google Cloud KMS, habilitando la firma automatizada en CI sin exponer claves privadas

## Renovación de la UI de Windows

El backend de UI de Windows recibió su actualización más completa hasta la fecha:

-   **Escalado consciente de DPI** — tamaño de ventana, fuentes y dimensiones de widgets escalan correctamente en pantallas de alto DPI
-   **APIs de ventana tipo launcher** — ventanas sin bordes con posicionamiento personalizado para interfaces tipo launcher/spotlight
-   **Hotkeys globales** — atajos de teclado a nivel de sistema que funcionan incluso cuando la app no está enfocada
-   **Iconos de app** — API `getAppIcon` para mostrar iconos de aplicación en interfaces tipo launcher
-   **Layout seguro ante reentrancia** — el pintado basado en `RefCell` fue reemplazado con almacenamiento HWND `SetPropW` para prevenir panics durante mensajes WM\_PAINT anidados
-   **Integración con Geisterhand** — todos los tipos de widgets registrados con el framework de pruebas de UI, `/type` usa `SendMessageW` a través del mapa HWND
-   **Soporte de cámara Android** — API de captura de cámara extendida a Android mediante JNI

## Rendimiento

v0.4.14 incluyó una auditoría de rendimiento exhaustiva:

-   **`fcmp` nativo** — las comparaciones de punto flotante usan instrucciones nativas de CPU en lugar de llamadas a funciones del runtime. Benchmark Mandelbrot **30 % más rápido**.
-   **Append de string in-place** — `str += "text"` modifica el búfer directamente en lugar de asignar un nuevo string. **125x más rápido** para concatenación repetida.
-   **Cortocircuito AND/OR** — `&&` y `||` omiten la evaluación del operando derecho cuando el resultado ya está determinado.
-   **Plegado de literales negativos** — `-1`, `-0.5` etc. se pliegan a constantes a nivel HIR en lugar de emitir una instrucción de negación.

## Compilaciones paralelas del Hub

El servidor de orquestación de compilaciones ahora soporta compilaciones concurrentes por worker:

-   **Despacho basado en slots** — los workers reportan capacidad `max_concurrent`, el Hub rastrea los trabajos activos por worker
-   **No más 429s** — los trabajos se encolan en lugar de rechazarse cuando todos los workers están ocupados
-   **Descargas de artefactos en Base64** — artefactos binarios servidos como Base64 cuando el runtime de Perry no puede manejar respuestas HTTP binarias crudas
-   **WebSocket con reconexión automática** — las conexiones de monitoreo de compilación se reconectan automáticamente al desconectarse

## Nuevo paquete: perry/appstorereview

Un nuevo paquete de primera parte para solicitar reseñas en las tiendas de aplicaciones:

```
import { requestReview } from "perry/appstorereview";

// Abre el diálogo nativo de reseña
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Una función, dos plataformas, UI de reseña nativa. El timing y la lógica de visualización quedan completamente en manos del desarrollador.

## Correcciones de codegen

120 commits significan muchas correcciones de errores. Las más impactantes:

-   **Igualdad estricta (===)** — tres bugs separados corregidos en v0.4.2: comparación de etiquetas de tipo, manejo de NaN y distinción null/undefined
-   **Comparación de strings concatenados** — `===` fallaba al comparar strings construidos mediante concatenación debido a comparación de punteros en lugar de contenido
-   **Resolución de constructores** — `new X(args)` ahora resuelve correctamente constructores importados entre módulos y funciones constructoras basadas en closures
-   **Array push a nivel de módulo** — los valores añadidos a arrays de nivel de módulo dentro de llamadas a funciones anidadas en bucles se perdían debido a punteros obsoletos después de la reasignación
-   **Coerción aritmética de null** — `null + 1` ahora produce correctamente `1` mediante `js_number_coerce`
-   **Wrapping de NOT bit a bit** — `~x` ahora se ajusta a i32 según la semántica ECMAScript
-   **fetch().then()** — los callbacks nunca se disparaban en apps de UI nativas debido a la falta de drenaje del bucle de eventos (v0.4.3)
-   **Módulo y exponente WASM** — los operadores `%` y `**` causaban errores de validación WASM (v0.4.5)

## En números

-   **~120 commits** al compilador principal de Perry en 5 días
-   **24 versiones de parche**: v0.4.1 → v0.4.24
-   **Objetivos de compilación**: 9 → 10 (se añadió tvOS)
-   **Objetivos de compilación cruzada desde Linux**: Windows → Windows, iOS, macOS (todo Apple + Windows)
-   **Nuevos paquetes**: perry/appstorereview
-   **Nueva infraestructura**: panel de control app.perryts.com, CLI perry login, facturación Polar.sh
-   **Mejoras de rendimiento**: Mandelbrot 30 % más rápido (fcmp nativo), concatenación de strings 125x más rápida

## Qué viene después

La compilación cruzada de iOS y macOS desde Linux significa que el Hub ahora puede compilar para todas las plataformas desde un único servidor Linux — no más máquinas de compilación macOS dedicadas para la compilación (solo para la firma). La infraestructura de facturación abre el camino a la beta pública del Hub. Y con tvOS añadido, Perry cubre todas las plataformas Apple: macOS, iOS, iPadOS, watchOS y tvOS.

-   **Beta pública del Hub** — usuarios externos pueden enviar TypeScript y obtener binarios nativos
-   **Soporte completo de regex** — la última gran brecha del lenguaje
-   **Expansión de perry/ui** — arrastrar y soltar, accesibilidad, DatePicker
-   **Source maps & info de depuración** — información de depuración DWARF para depuración nativa

Sigue el progreso en [GitHub](https://github.com/PerryTS/perry), lee la documentación en [docs.perryts.com](https://docs.perryts.com), o consulta la [hoja de ruta](/es/roadmap/) para el panorama completo.
