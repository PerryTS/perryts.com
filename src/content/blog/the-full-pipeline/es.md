---
title: "El pipeline completo: documentación, distribución y WidgetKit"
excerpt: "82 commits en una semana: un sitio de documentación de 49 páginas, publicación automatizada en App Store y Play Store, paquetes Homebrew y APT, extensiones nativas de WidgetKit desde TypeScript, nuevos widgets, módulos http/https y un compilador LLVM autoalojado."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 commits en siete días. Un sitio de documentación con 49 páginas. Publicación automatizada en App Store y Play Store. Paquetes Homebrew y APT. Extensiones nativas de WidgetKit compiladas desde TypeScript. Un compilador LLVM auto-hospedado. Y docenas de correcciones de errores en cada plataforma.

Este artículo cubre todo lo que se lanzó en Perry entre el 6 y el 13 de marzo de 2026. El tema es completitud — rellenar los huecos entre "escribí algo de TypeScript" y "mi app está en el App Store."

## docs.perryts.com

Perry ahora tiene un sitio de documentación real. 49 páginas construidas con mdBook, cubriendo todo desde los primeros pasos hasta la referencia CLI. Los docs están organizados en secciones:

-   **Primeros pasos** — instalación, primer proyecto, estructura del proyecto
-   **Características del lenguaje** — todo lo que Perry soporta de TypeScript
-   **UI nativa** — 12 páginas cubriendo todos los tipos de widgets, layout, gestión de estado y comportamiento específico de plataforma
-   **Plataformas** — páginas dedicadas para cada una de las 6 plataformas objetivo
-   **Biblioteca estándar** — más de 50 implementaciones de paquetes nativos documentadas
-   **APIs del sistema** — diálogos de archivos, llavero, notificaciones, multi-ventana
-   **WidgetKit** — el nuevo módulo de extensiones de widgets
-   **Plugins** — arquitectura de plugins en tiempo de compilación
-   **Referencia CLI** — cada comando y flag

El sitio también incluye un archivo `llms.txt` para descubribilidad por IA, y está desplegado vía GitHub Pages con un dominio personalizado en [docs.perryts.com](https://docs.perryts.com).

## Instalar Perry en un comando

Perry ahora se distribuye a través de Homebrew y APT, además de compilar desde el código fuente. Un nuevo pipeline de release de GitHub Actions compila binarios para macOS (arm64 y x86\_64) y Linux (x86\_64 y arm64), y luego actualiza automáticamente el tap de Homebrew y el repositorio APT.

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

Se acabó clonar el repo y compilar con Cargo. Instala Perry de la misma manera que instalas cualquier otra herramienta.

## Publicación automatizada en el App Store

Este es el cambio que colapsa más pasos manuales. Ejecutar `perry publish ios` ahora maneja automáticamente todo el pipeline de distribución iOS:

1.  Genera una clave RSA y CSR vía la API de App Store Connect
2.  Crea un certificado de distribución y lo empaqueta en un `.p12`
3.  Registra el bundle ID
4.  Crea y descarga un perfil de aprovisionamiento
5.  Crea el registro de la app en App Store Connect
6.  Compila, firma y sube a TestFlight o al App Store

Sin Xcode. Sin visitas manuales al portal. Sin descargar certificados desde un navegador. El asistente de configuración se ejecuta automáticamente la primera vez que publicas, guiándote a través de la configuración de la clave API y almacenando credenciales en `perry.toml`.

La distribución de macOS está igualmente automatizada. Perry soporta tres modos: TestFlight, DMG notarizado y un nuevo modo **"both"** que publica en el App Store y crea un DMG notarizado simultáneamente. Se auto-generan tres tipos de certificados: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` y `DEVELOPER_ID_APPLICATION`.

La publicación de Android también ganó un asistente de configuración con activación automática. Las tres plataformas ahora siguen el mismo patrón: la primera ejecución activa la configuración, las credenciales se guardan en el proyecto, las ejecuciones posteriores son sin configuración.

La validación pre-vuelo detecta problemas antes de que comience la compilación — desajuste de bundle ID del perfil de aprovisionamiento, expiración de certificados, ícono de app faltante, formato de versión inválido, ID de equipo incorrecto. Y `encryption_exempt` en `perry.toml [ios]` auto-establece la clave `ITSAppUsesNonExemptEncryption` del Info.plist, saltando la solicitud manual de cumplimiento de exportación en App Store Connect.

## perry/widget: WidgetKit desde TypeScript

Perry ahora puede compilar TypeScript a extensiones nativas de SwiftUI WidgetKit. Esto no es un wrapper ni un bridge — el compilador recorre el árbol de renderizado a nivel HIR y emite código fuente SwiftUI directamente. La salida es un bundle completo de extensión WidgetKit que Xcode (o el pipeline de compilación de Perry) puede embeber en tu app.

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

El enfoque es fundamentalmente diferente al resto de la compilación de Perry. El código normal de Perry pasa por Cranelift a código máquina nativo. El código de widget pasa por la HIR a texto de salida SwiftUI, porque WidgetKit requiere SwiftUI — no hay forma de construir una extensión de widget con código imperativo UIKit o AppKit. Perry resuelve esto tratando el árbol de renderizado del widget como una plantilla en tiempo de compilación, no como código en tiempo de ejecución.

## Nuevos widgets y mejoras de plataforma

Cuatro nuevos tipos de widget aterrizaron esta semana:

-   **TextArea** — edición de texto multilínea en macOS, iOS y Android
-   **SecureField** — entrada de contraseña en iOS y macOS
-   **QR Code** — generación nativa de códigos QR en iOS, macOS y Android
-   **Splash Screen** — storyboards de LaunchScreen auto-generados (iOS) y temas splash (Android)

### iPad se vuelve nativo

Perry ahora genera apps completamente nativas para iPad: `UIDeviceFamily [1,2]`, soporte de orientación, `UIRequiresFullScreen` y un storyboard LaunchScreen compilado vía ibtool. Una nueva función `getDeviceIdiom()` detecta teléfono vs. iPad en tiempo de ejecución, y `PerryFrameSplit` proporciona contenedores de división horizontal basados en frames para layouts de iPad.

### Windows

Windows obtuvo soporte de temporizadores (tick de 50ms `WM_TIMER`), botones owner-drawn con fondos de tema oscuro y correcciones para un bug use-after-free en `to_wide().as_ptr()` en 18 archivos de widgets. El runtime V8 ahora funciona en Windows con las bibliotecas del sistema requeridas enlazadas.

### GTK4 (Linux)

El backend GTK4 recibió pulido visual para coincidir con macOS: CSS padding para edge insets, estilo de botones Adwaita, correcciones de márgenes de VStack y política horizontal de ScrollView.

## http/https y better-sqlite3

Dos adiciones significativas a la stdlib:

Los nuevos módulos nativos `http` y `https` proporcionan HTTP del lado del cliente usando reqwest internamente. La API coincide con Node.js: `request()`, `get()`, `ClientRequest` con write/end/on e `IncomingMessage` con statusCode y manejadores de eventos.

`better-sqlite3` ahora está completamente soportado: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — con NaN-boxing correcto y objetos de fila con acceso a propiedades con nombre.

Otras mejoras de la stdlib: `crypto.randomBytes()` ahora devuelve un Buffer (coincidiendo con Node.js), MongoDB ganó `listDatabases` y `listCollections` con correcciones de thread-safety, y mysql2 INSERT/UPDATE/DELETE ahora devuelve `ResultSetHeader` con `insertId`.

## Correcciones de GC y corrección

Varias correcciones críticas del recolector de basura y de corrección del runtime se lanzaron esta semana:

-   **Guard de reentrancia del GC** — previene la recolección durante la asignación, corrigiendo panics de double-borrow de RefCell
-   **Trazado de Map del GC** — los Maps ahora se trazan correctamente durante la fase de marcado, previniendo la recolección de claves string
-   **Corrección de aliasing de strings** — el append de strings ahora siempre asigna strings frescos, corrigiendo corrupción por aliasing de copia de punteros
-   **Aritmética BigInt** — right-shift usa shift aritmético para números negativos, las ops bit a bit usan semántica de wrapping ToInt32
-   **Map.get() undefined** — devuelve el `TAG_UNDEFINED` correcto para claves faltantes en lugar de un tag NaN incorrecto
-   **Raíces GC de campos estáticos** — valores BigInt en campos estáticos de clases registrados como raíces GC

Estos no son menores. La corrección de reentrancia del GC por sí sola resolvió toda una clase de crashes intermitentes. La corrección de aliasing de strings afectaba a cualquier programa que asignaba una variable string a otra y luego mutaba cualquiera de las dos. Estos son el tipo de bugs que solo aparecen bajo cargas de trabajo reales, y corregirlos es lo que hace que el compilador sea apto para producción.

## perry-verify: Endurecido

`perry-verify`, el servicio de verificación automatizada de apps, recibió un pase de endurecimiento de seguridad: ejecución en sandbox vía `bwrap` en Linux y `sandbox-exec` en macOS, tokens de autenticación en el handshake WebSocket y descarga de binarios, limitación de tasa por IP, IDs de trabajo UUID completos para prevenir enumeración y límites de cuerpo reducidos.

## perrysdad: El compilador auto-hospedado

En un esfuerzo paralelo, `perrysdad` — un compilador LLVM IR auto-hospedado escrito en TypeScript — pasó de cero a auto-compilación en cinco fases durante la semana:

1.  **Fase 0-1** — esqueleto end-to-end: HIR a texto LLVM IR a clang, enlazado contra `libperry_runtime.a` de Perry
2.  **Fase 2** — parser de descenso recursivo hecho a mano con parsing de expresiones Pratt para archivos `.ts` reales
3.  **Fase 3** — arrays, objetos y maps con FFI de runtime, más corrección de un desajuste ABI crítico (JSValue declarado como double en LLVM IR en lugar de i64)
4.  **Fase 4** — clases, enums, closures, compilación multi-archivo con descubrimiento de módulos y ordenamiento topológico

El hito: el binario `anvil` auto-compilado ahora puede compilar programas de prueba y producir salida correcta que coincide con la versión compilada por node. Un compilador TypeScript, compilado por Perry a código nativo, compilando más TypeScript a código nativo. Tortugas hasta el fondo.

## En números

-   **82 commits** al compilador principal de Perry
-   **1 release**: v0.2.173 (8 de marzo)
-   **49 páginas de documentación** en docs.perryts.com
-   **4 nuevos widgets**: TextArea, SecureField, QR Code, Splash Screen
-   **3 canales de distribución**: Homebrew, APT, código fuente
-   **3 pipelines de tienda automatizados**: App Store, TestFlight, Google Play
-   **Las 6 plataformas** recibieron mejoras esta semana

## Qué viene después

El pipeline se está completando. Puedes escribir TypeScript, compilar a seis plataformas, distribuir vía Homebrew o APT, publicar en el App Store y Play Store, añadir widgets de pantalla de inicio y leer documentación completa — todo sin salir de la toolchain de Perry. Lo que queda:

-   **Soporte completo de regex** — la última gran brecha del lenguaje
-   **Expansión de perry/ui** — arrastrar y soltar, etiquetas de accesibilidad, DatePicker
-   **Maduración de perrysdad** — expandir el compilador auto-hospedado hacia paridad completa con Perry
-   **Beta pública del Hub** — abrir compilaciones distribuidas a usuarios externos

Sigue el progreso en [GitHub](https://github.com/PerryTS/perry), lee la nueva documentación en [docs.perryts.com](https://docs.perryts.com), o consulta la [hoja de ruta](/es/roadmap/) para el panorama completo.
