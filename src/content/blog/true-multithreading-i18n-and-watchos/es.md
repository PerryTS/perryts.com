---
title: "Multi-threading real, i18n en tiempo de compilación y watchOS"
excerpt: "Perry v0.4.0: hilos reales del sistema operativo con seguridad en tiempo de compilación, un sistema de internacionalización sin ceremonias para más de 30 idiomas, watchOS como 9.º objetivo de compilación, APIs de audio y cámara, y un pipeline de compilación en paralelo."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 es la versión más grande desde el inicio del proyecto. Tres saltos de versión en un ciclo — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — y el compilador en sí ahora es paralelo. Aquí está todo lo que se lanzó.

## Multi-Threading real

Perry ahora tiene paralelismo real basado en hilos del sistema operativo. No son web workers con sobrecarga de serialización. No es `SharedArrayBuffer` con `Atomics`. Hilos reales — hilos del SO ligeros con pila de 8 MB que no comparten nada y no cuestan nada cuando están inactivos.

El nuevo módulo `perry/thread` expone tres primitivas:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Dividir trabajo entre todos los núcleos de CPU, resultados en orden
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filtrar en paralelo
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Lanzar un hilo en segundo plano, obtener una Promise
const result = await spawn(() => {
  // se ejecuta en un hilo del SO separado
  return computeExpensiveResult();
});
```

`parallelMap` y `parallelFilter` detectan automáticamente el número de núcleos de CPU y dividen el array de entrada entre ellos. Para arrays pequeños, omiten el threading por completo y se ejecutan de forma síncrona — sin sobrecarga para cargas de trabajo triviales.

`spawn` lanza un hilo del SO en segundo plano y devuelve una Promise. El resultado fluye de vuelta a través de una cola de resultados pendientes que se drena durante el procesamiento de microtareas, por lo que se puede usar `await` como cualquier otra operación asíncrona.

### Seguridad en tiempo de compilación

La parte más importante no es la API — es lo que el compilador *previene*. Perry rechaza estáticamente los closures que capturan variables mutables:

```
let counter = 0;

// ✗ Error de compilación: closure captura variable mutable 'counter'
parallelMap(items, (item) => {
  counter++;  // rechazado en tiempo de compilación
  return item * 2;
});
```

Sin estado mutable compartido significa sin carreras de datos. Sin locks, sin mutexes, sin `Atomics`. El compilador impone la seguridad de hilos antes de que se emita una sola línea de código máquina.

### Bajo el capó

Cada hilo worker obtiene su propia arena de memoria con limpieza `Drop` — sin coordinación de GC entre hilos. Los valores se transfieren mediante copia profunda `SerializedValue`: coste cero para números, O(n) para strings, arrays y objetos. La implementación vive en un único archivo Rust de 1.120 líneas (`perry-runtime/src/thread.rs`) y no requirió cambios en el recolector de basura.

Compara esto con los aislados de V8, que requieren heaps separados por worker con ~2 MB de sobrecarga cada uno. Los hilos de Perry son simplemente pthreads con arenas.

### Pipeline de compilador paralelo

El compilador en sí ahora también es paralelo. La generación de código de módulos, las pasadas de transformación (imports de JS, instancias nativas, monomorfización) y el escaneo de símbolos con `nm` se ejecutan en todos los núcleos de CPU a través de rayon. Combinado con la actualización a Cranelift 0.121 (desde 0.113 — ocho versiones menores de asignación de registros y mejoras x64), la compilación es significativamente más rápida.

## i18n en tiempo de compilación (v0.3.0)

El sistema de internacionalización de Perry no tiene ceremonia. Los literales de cadena en widgets de UI se tratan automáticamente como claves localizables. Los archivos de traducción son JSON plano en un directorio `locales/`. Toda la validación ocurre en tiempo de compilación.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Tu código — usa strings normalmente
Button({ title: "greeting", action: () => {} })
```

El compilador valida todo: traducciones faltantes, desajustes de parámetros, errores de formas plurales. Las traducciones se integran en el binario como una tabla de cadenas 2D embebida con búsqueda en tiempo de ejecución cercana a cero — sin parsear JSON al inicio.

### Qué incluye

-   **Reglas de plural CLDR** para más de 30 locales con sufijos `.one`/`.other`/`.few`/`.many`/`.zero`/`.two`
-   **Wrappers de formato**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Detección nativa de locale** en todas las plataformas: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: escanea archivos TS/TSX, genera y actualiza scaffolds JSON de locales
-   **Generación de recursos nativos de plataforma**: directorios iOS `.lproj` y Android `values-xx/`
-   **`import { t } from "perry/i18n"`** para localizar strings fuera de la UI

Configúralo en `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## Apps nativas para watchOS (v0.3.2)

Perry ahora compila para watchOS — el 9.º objetivo de compilación. Esto no es un wrapper ni una app companion. Es un binario watchOS independiente con una interfaz nativa SwiftUI.

El renderizador watchOS usa un **enfoque basado en datos**: Perry construye un árbol de UI a través de llamadas FFI `perry_ui_*`, y un `PerryWatchApp.swift` incluido consulta el árbol y renderiza vistas SwiftUI de forma reactiva. Se soportan 15 tipos de widgets con stubs para los no soportados.

```
# Compilar para watchOS
perry compile main.ts --target watchos

# Ejecutar en el simulador de Apple Watch
perry run watchos

# Configurar firma para watchOS
perry setup watchos
```

El flujo completo funciona: `perry setup watchos` comparte las credenciales de App Store Connect con iOS, `perry run watchos` detecta automáticamente los simuladores de Apple Watch, y `perry publish watchos` envía al App Store.

Esto también eleva el recuento total de **objetivos de widgets a cuatro**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) y Wear OS (Tiles). Cada uno tiene su propio objetivo de compilación y backend de codegen.

## APIs de audio y cámara

Dos nuevas APIs de hardware se incluyen en esta versión:

### Captura de audio (`perry/system`)

Captura de audio multiplataforma con medición dB(A) ponderada en A:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) con suavizado EMA
const waveform = audioGetWaveformSamples();  // buffer circular de 256 muestras
audioStop();
```

Backends por plataforma: AVAudioEngine (macOS/iOS), AudioRecord vía JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Captura de cámara (`perry/ui`)

Vista previa de cámara nativa con muestreo de color a nivel de píxel (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // promedio 5x5
```

## Paquetes del ecosistema

Se lanzaron dos paquetes nativos de primera parte:

-   **perry/push** — Bindings de notificaciones push para iOS/macOS: solicitudes de permisos, obtención de token APNs, conteo de badges. Stub de Android con FCM planificado.
-   **perry/storekit** — Bindings de compras in-app StoreKit 2: carga de productos, compras con recibos JWS, verificación de suscripciones, restauración y listeners de transacciones.

Ambos siguen la misma arquitectura: declaraciones TypeScript → crate FFI Rust → puente Swift. Instalar como dependencia, importar las funciones, `await` los resultados. El compilador maneja todos los puentes nativos.

## Infraestructura

-   **Cranelift 0.113 → 0.121** — ocho versiones menores de asignación de registros, correcciones x64 y mejoras de alineación de slots de pila
-   **División de funciones en Windows** — divide automáticamente funciones con más de 50 declaraciones en continuaciones para evitar problemas de codegen de Cranelift en Windows
-   **Carga selectiva de variables de módulo** — solo carga variables de nivel de módulo referenciadas en la entrada de función, reduciendo el tamaño del binario de Windows en un 26 %
-   **Mejora de Array.sort()** — de ordenamiento por inserción O(n²) a híbrido TimSort O(n log n)
-   **perry run android** — pipeline completo de compilación de APK: compilar, generación de proyecto Gradle, assembleDebug, instalar, lanzar
-   **Entradas personalizadas de Info.plist** — `[ios.info_plist]` en perry.toml para descripciones de privacidad, esquemas URL, modos en segundo plano

## En números

-   **Versión**: 0.2.197 → 0.4.0 (tres hitos principales)
-   **Objetivos de compilación**: 8 → 9 (se añadió watchOS)
-   **Objetivos de widgets**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Nuevos crates**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Nueva documentación**: threading (4 páginas), i18n (4 páginas), watchOS, docs de widgets expandidos (3 → 8 páginas)
-   **Implementación de perry/thread**: 1.120 líneas de Rust, cero cambios en el GC

## Qué viene después

La base de threading abre muchas posibilidades: procesamiento paralelo de solicitudes HTTP, operaciones de archivo concurrentes y cargas de trabajo computacionalmente intensivas que antes estaban bloqueadas por la ejecución de un solo hilo. En el lado del lenguaje, el soporte completo de regex sigue siendo la mayor brecha, y la expansión de `perry/ui` (arrastrar y soltar, accesibilidad, DatePicker) continúa.

Sigue el progreso en [GitHub](https://github.com/PerryTS/perry), lee la documentación en [docs.perryts.com](https://docs.perryts.com), o consulta la [hoja de ruta](/es/roadmap/) para el panorama completo.
