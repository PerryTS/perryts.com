---
title: "Los sistemas de plugins son un impuesto al rendimiento"
excerpt: "Las arquitecturas de plugins sacrifican rendimiento por extensibilidad. Pero ¿y si la extensibilidad ocurriera en tiempo de compilación en vez de en runtime? La composición en tiempo de compilación te da ambas cosas — cero overhead, máxima flexibilidad."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
Instalas VS Code. Es rápido. Añades 15 extensiones. Ahora tarda 4 segundos en iniciar y el Extension Host consume 800 MB de RAM. ¿Qué pasó?

El patrón se repite en todas partes: WordPress, Eclipse, Chrome, Figma, Slack. La app se lanza rápida. Los plugins la hacen lenta. Nadie se sorprende ya — lo hemos aceptado como el coste de la extensibilidad.

Pero los sistemas de plugins no son solo un problema de rendimiento. Son un problema de filosofía de diseño. La industria ha confundido "extensibilidad" con "dinamismo en tiempo de ejecución" cuando a menudo la mejor respuesta es la composición en tiempo de compilación. Los únicos plugins con buen rendimiento son los que dejan de ser plugins en tiempo de compilación.

## El espectro de rendimiento de la extensibilidad

No toda la extensibilidad cuesta lo mismo. Hay un espectro de coste cero a coste máximo, y la mayor parte de la industria se ha asentado en el extremo caro:

1.  **Enlace estático / módulos en tiempo de compilación** — cero sobrecarga. Bibliotecas C, crates de Rust, paquetes Go. El límite del módulo desaparece completamente en el binario final.
2.  **Bibliotecas compartidas cargadas al inicio** — casi cero. Módulos de nginx, módulos del kernel de Linux. Coste único en la carga, luego llamadas a funciones directas.
3.  **Dispatch dinámico vía interfaces / vtables** — sobrecarga pequeña. Plugins de motores de juegos en C++. Una indirección de puntero por llamada.
4.  **Plugins interpretados en el mismo proceso** — moderado. Plugins PHP de WordPress, bundles OSGi de Eclipse. Cada invocación de plugin pasa por un intérprete.
5.  **Plugins en proceso separado vía IPC** — significativo. Extensiones de VS Code, extensiones de Chrome. Cada interacción cruza un límite de proceso y serializa datos.
6.  **Plugins en sandbox vía IPC serializado** — pesado. Plugins de Figma, content scripts de extensiones de navegador. Serialización, deserialización y aplicación de sandbox en cada llamada.

La idea clave: los únicos plugins con buen rendimiento son los que dejan de ser plugins en tiempo de compilación. Los niveles 1 y 2 son rápidos precisamente porque el "plugin" se vuelve indistinguible del código host en el artefacto final.

## El daño en el mundo real

### WordPress

Cada plugin se engancha al ciclo de vida de las peticiones. 30 plugins significan 30 capas de llamadas a funciones por carga de página. El resultado: los plugins de caché existen únicamente para mitigar el daño de otros plugins. Plugins de rendimiento para solucionar el problema de rendimiento que los plugins crearon. La meta-ironía se escribe sola.

### VS Code

Las extensiones comparten un único event loop de Node.js en un proceso separado. Una extensión con mal comportamiento bloquea a todas las demás. El Extension Host aparece regularmente como el mayor consumidor de CPU en las máquinas de los desarrolladores. Microsoft ha construido herramientas de perfilado, comandos de bisección y sistemas de eventos de activación — toda una infraestructura para gestionar el problema que las extensiones crean.

### Eclipse

La historia de advertencia. Resolución de bundles OSGi, sobrecarga de carga de clases, grafos de dependencias masivos. Una vez el IDE más popular, ahora abandonado en gran medida por los desarrolladores mainstream. La arquitectura de plugins que se suponía era su mayor fortaleza se convirtió en su debilidad definitoria.

### Electron en sí

El problema de plugins a nivel de plataforma. Cada app Electron incluye un runtime completo de Chromium + Node.js. VS Code es Electron. Slack es Electron. Discord es Electron. Cada uno consumiendo independientemente 300–500 MB de RAM para renderizar lo que es esencialmente una ventana de chat o un editor de texto. El "plugin" aquí es toda la plataforma web, empaquetada de nuevo para cada aplicación.

## Por qué la industria sigue eligiendo plugins de todos modos

Si los plugins son tan caros, ¿por qué todos siguen construyéndolos? Las razones son mayormente organizativas, no técnicas:

-   **Experiencia del desarrollador** — los plugins son fáciles de escribir cuando no te importa el rendimiento. Envía un archivo JS, engancha algunos eventos, listo.
-   **Crecimiento del ecosistema** — los plugins crean efectos de red y compromiso de la comunidad. Un marketplace de 30.000 extensiones es un foso poderoso.
-   **Conveniencia organizativa** — los plugins permiten a los equipos diferir decisiones de diseño. "Alguien escribirá un plugin para eso" es el equivalente arquitectónico de "lo arreglaremos en postproducción."
-   **Modelo de negocio** — los marketplaces de plugins crean ingresos y dependencia. La plataforma captura valor del ecosistema.

La verdad incómoda: los plugins son a menudo una forma de evitar tomar decisiones arquitectónicas difíciles sobre lo que pertenece al núcleo. Te permiten enviar algo incompleto y llamarlo "extensible."

## La alternativa: Composición en tiempo de compilación

¿Qué pasaría si la extensibilidad ocurriera en tiempo de compilación en lugar de en tiempo de ejecución?

Esto no es hipotético. Hay precedentes bien probados en lenguajes de sistemas:

-   **Rust proc macros** — código arbitrario que se ejecuta en tiempo de compilación y genera código nativo con cero sobrecarga. Serialización Serde, configuración del runtime async Tokio, enrutamiento Axum — todo resuelto antes de que tu programa arranque.
-   **Zig comptime** — ejecución en tiempo de compilación que elimina todas las ramificaciones en tiempo de ejecución. Las estructuras de datos genéricas se monomorfisan, la configuración se resuelve, el código muerto se elimina. Lo que queda es exactamente lo que se ejecuta.
-   **Templates / constexpr de C++** — polimorfismo en tiempo de compilación con cero coste en tiempo de ejecución. La STL logra un rendimiento extraordinario porque cada algoritmo genérico se especializa en tiempo de compilación.
-   **Tree-shaking en bundlers** — una versión parcial e imperfecta de esta idea aplicada a JavaScript. Webpack y Rollup eliminan exportaciones no utilizadas en tiempo de compilación. La limitación es que solo pueden eliminar código, no especializarlo.

El patrón es consistente: mover decisiones del tiempo de ejecución al tiempo de compilación. Lo que no incluyes no cuesta nada. Lo que incluyes se compila a código nativo sin indirección. El límite del módulo se convierte en una herramienta de organización a nivel de código fuente, no en un límite de rendimiento en tiempo de ejecución.

## Qué significa esto para TypeScript

TypeScript es el lenguaje más popular para construir herramientas extensibles — y el peor en rendimiento en tiempo de ejecución. Todo el ecosistema TypeScript se ejecuta sobre Node.js, que se ejecuta sobre V8, que compila JavaScript con JIT. Cada capa añade sobrecarga: tiempo de calentamiento JIT, pausas de recolección de basura, dispatch dinámico para cada acceso a propiedades, límites IPC entre procesos.

Aquí es donde entra Perry. Perry compila TypeScript directamente a binarios nativos. Sin V8, sin calentamiento JIT, sin pausas de recolección de basura, sin límites IPC.

Cuando tus módulos compilan a código nativo, los "plugins" se convierten simplemente en... módulos. Se componen en tiempo de compilación. El binario final tiene cero sobrecarga de plugins porque no hay plugins — solo código nativo. Un manejador de rutas de Express, una función de middleware, una biblioteca de utilidades — todos compilan a llamadas de función directas en el mismo binario. Sin carga dinámica, sin serialización, sin límites de proceso.

```text
# Tu app, tus dependencias, tus "plugins" — un binario
$ perry compile server.ts -o server
Compiling server.ts + 43 modules...
✓ Built executable: server (1.8 MB, 0.7s)
$ ./server
Listening on port 3000
```

Esto no es teórico. Perry ya compila frameworks TypeScript del mundo real — Hono, tRPC, Strapi — a binarios nativos ARM64 de menos de 2 MB, en menos de un segundo. Los módulos que componen esos frameworks se compilan, enlazan e inlinan en un único ejecutable. Lo que sería una arquitectura de plugins con sobrecarga en tiempo de ejecución en Node.js se convierte en composición de coste cero en un binario Perry.

## La extensibilidad que realmente necesitas

La objeción es obvia: "Pero necesito extensibilidad en tiempo de ejecución. Los usuarios necesitan instalar plugins sin recompilar."

¿De verdad? Para la mayoría de las aplicaciones, el conjunto de extensiones se conoce en tiempo de compilación. Eliges tu middleware de Express, tu driver de base de datos, tu biblioteca de autenticación, tu framework de logging — y luego despliegas. La "extensibilidad" está en tu `package.json`, resuelta en `npm install`, no en tiempo de ejecución.

Las aplicaciones que genuinamente necesitan carga de plugins en tiempo de ejecución — VS Code, WordPress, navegadores — son la excepción, no la regla. E incluso estas pagan un alto precio por ello. Para todo lo demás, la composición en tiempo de compilación te da la misma flexibilidad sin ninguna sobrecarga.

La diferencia es honestidad arquitectónica. En lugar de pretender que cada aplicación necesita un sistema de plugins, preguntas: ¿necesita esta extensibilidad ocurrir en tiempo de ejecución, o puede el compilador hacer el trabajo?

## El camino a seguir

La adicción de la industria a las arquitecturas de plugins es un síntoma de aceptar la sobrecarga en tiempo de ejecución como inevitable. No lo es. El compilador puede hacer el trabajo. La composición en tiempo de compilación te da extensibilidad sin el impuesto.

Estamos construyendo Perry porque creemos que los desarrolladores TypeScript merecen rendimiento nativo sin renunciar al lenguaje que aman. Tus módulos deberían componerse en tiempo de compilación, compilar a llamadas de función directas y ejecutarse sin la sobrecarga de un runtime que existe solo para hacer posible la "extensibilidad".

El sistema de plugins más rápido es el que no existe en tiempo de ejecución.
