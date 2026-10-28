---
title: "De compilador a ecosistema: React, bases de datos y builds en la nube"
excerpt: "Perry crece de compilador a un ecosistema completo. perry/ui en el núcleo, ORMs compatibles con Prisma para MySQL/PostgreSQL/SQLite, notificaciones push universales, builds distribuidos con publicación en App Store y una capa de compatibilidad con React — todo en una semana."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Hace una semana, Perry era un compilador con un toolkit de UI. Podías escribir TypeScript, compilarlo a un binario nativo y distribuirlo en seis plataformas. Esa era la historia. Hoy la historia es más grande: Perry se está convirtiendo en un ecosistema. Tres ORMs de base de datos, notificaciones push universales, compilaciones distribuidas con publicación en App Store y Play Store, una capa de compatibilidad React y verificación automatizada de apps — todo aterrizó en la última semana.

Este artículo cubre lo que se lanzó, por qué importa y cómo se ve el código.

## perry/ui: La base

Antes de entrar en las nuevas bibliotecas, vale la pena enfatizar lo que está en el centro de todo: `perry/ui`. Este es el toolkit de UI nativo propio de Perry — más de 20 widgets que compilan directamente a componentes nativos de plataforma en los seis objetivos. No es un wrapper, no es una capa de abstracción, no es una vista web. Cada `Button` se convierte en un `NSButton` en macOS, un `UIButton` en iOS, un `GtkButton` en Linux, un `android.widget.Button` en Android y un control `CreateWindowEx` en Windows.

`perry/ui` es la superficie de UI primaria y más avanzada de Perry. Incluye gestión de estado reactiva, contenedores de layout (VStack, HStack, ZStack, SplitView), un Canvas acelerado por hardware, Table views con ordenación de columnas, el módulo `perry/system` para diálogos de archivo, acceso al llavero, notificaciones y multi-ventana — todo desde TypeScript, todo compilado a llamadas directas a la API de la plataforma. Cada otro enfoque de UI en Perry, incluyendo la capa de compatibilidad React, está construido sobre `perry/ui` y se mapea de vuelta a sus widgets.

**app.ts**

```typescript
import { Window, VStack, Button, Text, State } from 'perry/ui';
const count = new State(0);
const window = new Window({ title: "Counter" });
window.setContent(
  new VStack({ children: [
    new Text({ text: count }),
    new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),
  ] })
);
```

El objeto reactivo `State` es la primitiva clave. Cuando un valor de State cambia, solo se actualizan los widgets vinculados a ese estado — sin diffing de DOM virtual, sin re-renderizados de todo el árbol, sin pase de reconciliación. Es el camino más directo de TypeScript a UI nativa de plataforma que existe.

## Compatibilidad React: Una capa delgada sobre perry/ui

Para desarrolladores que vienen de React, `perry-react` proporciona una capa de compatibilidad que mapea el modelo de componentes de React a widgets de `perry/ui`. Puedes usar `useState`, `useRef`, `useReducer` y JSX — y Perry lo compila a los mismos widgets nativos debajo. Es un puente de conveniencia, no un motor de renderizado separado.

**contador.tsx**

```tsx
import React, { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

Bajo el capó, cada elemento JSX se mapea a un widget de `perry/ui`: `<div>` se convierte en un VStack, `<button>` se convierte en un Button, `useState` está respaldado por el State reactivo de Perry. Es temprano — Fase 1 con re-renderizados de todo el árbol y almacenamiento de hooks global — pero demuestra que código React existente puede apuntar a plataformas nativas a través de Perry. También estamos explorando compatibilidad con Angular e Ionic siguiendo líneas similares.

## Tres ORMs de base de datos: API Prisma, rendimiento nativo

Si estás construyendo un servidor o una app de escritorio que habla con una base de datos, Perry ahora te cubre con tres ORMs compatibles con Prisma: `perry-prisma` (MySQL), `perry-sqlite` (SQLite) y `perry-postgres` (PostgreSQL). Los tres son reemplazos directos de `@prisma/client`. Misma API, mismos patrones de consulta, pero compilados a código nativo con FFI directo a la base de datos — sin engine de Prisma, sin Node.js.

**base de datos.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Misma API Prisma — compilada a SQL nativo vía Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

Bajo el capó, cada ORM es un frontend TypeScript respaldado por una capa FFI de Rust usando `sqlx`. El flujo de consultas: TypeScript serializa la consulta a JSON, la pasa a través de la frontera FFI, Rust construye SQL parametrizado, lo ejecuta vía el pool de conexiones y serializa el resultado de vuelta. El esquema Prisma se lee en tiempo de compilación — cero parsing en tiempo de ejecución.

Las tres implementaciones comparten ~95 % de su código. Las diferencias son lo que esperarías: entrecomillado de identificadores (`` `col` `` vs `"col"`), sintaxis de placeholders (`?` vs `$1, $2`) y semántica de transacciones. Las tres soportan toda la superficie CRUD de Prisma: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — más SQL crudo, transacciones y más de 10 operadores de filtro WHERE.

## perry-push: Notificaciones push universales

`perry-push` es una única biblioteca que maneja notificaciones push en todas las plataformas: APNs (iOS/macOS), FCM (Android), Web Push (navegadores) y WNS (Windows). Cada proveedor es un módulo FFI de Rust con exactamente tres funciones: `*_provider_new`, `*_provider_close` y `*_send`.

**notificar.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Tipo de resultado unificado para todos los proveedores
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

La criptografía es manejada por `ring` — ES256 JWTs para APNs y VAPID, RS256 para cuentas de servicio FCM, AES-GCM para cifrado de payload Web Push. Todo compilado a código nativo. Sin `node-gyp`, sin dependencia de OpenSSL.

## Perry Hub + Builders: Compilaciones distribuidas en la nube

Este es el juego de infraestructura. `perry-hub` es un servidor de orquestación de compilaciones — él mismo compilado desde TypeScript por Perry — que gestiona un pool de workers de compilación. Empujas tu proyecto, el hub lo despacha al worker correcto basándose en la plataforma objetivo, y el worker compila, firma y opcionalmente publica tu app.

Hoy existen dos workers: un builder macOS (maneja objetivos macOS, iOS y Android) y un builder Linux (maneja Linux y Android). Ambos son binarios Rust que se conectan al hub vía WebSocket, descargan tarballs de código fuente, ejecutan el compilador Perry y suben artefactos de vuelta.

-   **Firma de código** — notarización Apple para macOS, perfiles de aprovisionamiento para iOS, firma de keystore Android
-   **Publicación en App Store** — carga directa a App Store Connect y Google Play Store
-   **Gestión de artefactos** — binarios compilados subidos al hub con limpieza basada en TTL
-   **Gestión de licencias** — límites de tasa por licencia, encolamiento prioritario (nivel pro obtiene prioridad)

El hub en sí es un caso de estudio fascinante. Es un archivo TypeScript de ~1.500 líneas compilado a un binario nativo de 2 MB por Perry. Ejecuta Fastify en el puerto 3456 para HTTP y `ws` en el puerto 3457 para WebSocket. Todo el estado está en memoria con persistencia JSON — sin base de datos externa. Es el tipo de servidor que puedes desplegar con `scp` y un archivo de unidad systemd.

## perry-verify: Verificación automatizada de apps

`perry-verify` es un servicio HTTP independiente que toma un binario compilado y una configuración, ejecuta un pipeline de verificación y devuelve resultados estructurados de aprobado/fallido con capturas de pantalla. Lanza la app, ejecuta flujos de autenticación (determinísticos o asistidos por IA), verifica el estado y captura evidencia.

Existen adaptadores de plataforma para macOS (vía APIs de accesibilidad), Linux (AT-SPI) y stubs para iOS Simulator y Android Emulator. La capa de IA usa Claude para autenticación de respaldo y verificación de estado cuando los chequeos determinísticos no son posibles. Está diseñado para insertarse en el pipeline de compilación del hub como paso post-compilación: compilar, firmar, verificar, publicar.

## Pry está en todas partes

[Pry](/es/blog/building-pry/), el visor JSON nativo que construimos como showcase de Perry, ahora está en cinco plataformas. Está en el [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) y [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), con binarios nativos para Linux y Windows. La misma base de código TypeScript, cinco puntos de entrada específicos de plataforma, cinco binarios nativos. Es la prueba más concreta de que todo este enfoque funciona de principio a fin — desde el código fuente TypeScript hasta la ficha del App Store.

## Qué significa todo esto

Un compilador es interesante. Un ecosistema es útil. En la última semana, Perry pasó de "puedes compilar TypeScript a nativo" a "puedes construir una app completa con UI nativa, una base de datos Prisma, notificaciones push y compilaciones que auto-publican en el App Store."

Las piezas están empezando a conectarse:

-   **perry/ui** es el camino más directo de TypeScript a UI nativa de plataforma — estado reactivo, más de 20 widgets, cero capas de abstracción
-   **perry-prisma/sqlite/postgres** significa que el código de base de datos existente se porta con cambios mínimos
-   **perry-push** significa notificaciones push nativas sin bibliotecas por plataforma
-   **perry-hub + builders** significa que puedes ir de `perry publish` al App Store en un paso
-   **perry-verify** significa pruebas automatizadas de la salida compilada, no solo del código fuente
-   **perry-react** significa que los desarrolladores React pueden comenzar con Perry usando patrones familiares, todo mapeado a perry/ui debajo

Esto no es teórico. Cada biblioteca listada aquí tiene código funcional, tests y documentación. Varias ya se usan en producción — el propio sitio de Perry corre sobre un servidor Fastify compilado por Perry, y Pry está activo en dos tiendas de apps.

## Qué viene después

La hoja de ruta inmediata:

-   **Expansión de perry/ui** — arrastrar y soltar, etiquetas de accesibilidad, menús contextuales personalizados, más primitivas de layout
-   **Integración de perry-verify** — verificación automatizada en el pipeline de compilación
-   **Compatibilidad de frameworks** — mejorando las capas React, Angular e Ionic como rampas de acceso a perry/ui
-   **Soporte completo de regex** — motor regex compatible con ECMAScript compilado a nativo

Sigue el progreso en [GitHub](https://github.com/PerryTS/perry), o consulta la [hoja de ruta](/es/roadmap/) para el panorama completo.
