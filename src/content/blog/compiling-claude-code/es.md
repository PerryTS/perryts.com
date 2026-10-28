---
title: "Compilar Claude Code: un bundle minificado y 160 correcciones del compilador"
excerpt: "Intentamos convertir en un binario nativo el archivo cli.js minificado de 13 MB que npm distribuye para Claude Code. Un mes después, arranca, inicia sesión, recibe respuestas reales de la API en streaming y muestra lo que escribes. Para lograrlo se integraron 160 pull requests en Perry, desde un MessageChannel que no hacía nada hasta una barrera de escritura del GC ausente en los encabezados RegExp."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
El 16 de junio, la instrucción era una frase: *“busque la carpeta de códigos de Claude y obtenga el javascript (compilado, minificado) desde allí... veamos si podemos compilarlo :D”* Cuando volvió la objeción obvia (que esto sería brutal), la respuesta fue la tesis real: *“es brutal pero también una prueba real de nuestras capacidades y límites, lo cual es Por qué quiero hacerlo. Nada reemplaza las aplicaciones del mundo real en términos de encontrar límites”.*

Un mes después, un binario compilado por Perry de Anthropic Claude Code CLI se inicia, ejecuta `/login` a través del flujo OAuth, transmite una respuesta real desde la API y pinta los caracteres que escribe. Para llegar allí se necesitaron **160 pull requests fusionadas en Perry entre el 20 de junio y el 17 de julio**: un `MessageChannel` no operativo, una barrera de escritura GC faltante en RegExp, una declaración `continue` que solo gira en la API real y nunca en nuestro simulacro, y alrededor de ciento cincuenta más.

Esta publicación es el recorrido. No porque compilar la CLI de otra persona sea un producto (no publicamos este binario y nunca lo haremos), sino porque es el instrumento de búsqueda de errores más productivo que jamás hayamos utilizado Perry.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="Un terminal macOS que ejecuta un binario Perry compilado por Claude Code desde /tmp/verify: el banner v2.1.112, un /login exitoso, el mensaje &quot;Genial, ¿quién eres?&quot;, una respuesta transmitida y una salida limpia de regreso al shell." width="1708" height="926"><figcaption>No hay <code>node</code> en esa línea de comando. <code>/tmp/verify/cc_fptest_dbg25</code> es un único ejecutable nativo producido por <code>perry compile</code> a partir del <code>cli.js</code>: iniciar sesión, transmitir una respuesta real y salir limpiamente en Ctrl-C. Dado que el nombre del archivo invita a la pregunta: <code>dbg25</code> es la compilación número 25 de una serie de diagnóstico de la investigación de GC que aún se ejecuta tal como se escribió: símbolos de depuración, además de elisión de barrera de escritura desactivada para que <em>cada</em> almacén de matrices emita una barrera. Conlleva más gastos generales que una construcción normal, no menos. La tabla de rendimiento más abajo se midió en diferentes binarios no instrumentados.</figcaption></figure>

## Qué significa realmente “compilar Claude Code”

El destino de la compilación es el archivo distribuido en el paquete npm. `npm pack @anthropic-ai/claude-code@2.1.112` le brinda un `cli.js`: **13 MB de JavaScript** minificado y autoejecutable con un `#!/usr/bin/env node` shebang. Sin fuente, sin mapa fuente, sin paso de compilación nuestro. Apuntamos `perry compile` a ese archivo, sin modificar, y solicitamos un ejecutable nativo.

Perry lo mastica durante unos 37 minutos y produce aproximadamente 207 MB de IR en **16.023 funciones**, que se vinculan en un binario de ~180 MB. Cada una de esas funciones tiene nombres de una letra y no tiene anotaciones de tipo, y todo tiene que funcionar con anticipación: no hay JIT, no `eval`, no hay rescate perezoso para un intérprete cuando el compilador adivina mal. Si Perry reduce mal una de esas 16.023 funciones, no hay nada que pueda detectarla.

La escala de puntuación proviene de nuestro conjunto de estrés interno y es deliberadamente implacable:

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

`correct` es el único nivel que cuenta. Node v26 es el oráculo; cualquier cosa que no sea idéntica en bytes a lo que Node imprime es un error de Perry hasta que se demuestre lo contrario.

## Por qué esta aplicación en particular

Un agente de codificación CLI es una pila inusualmente hostil de JavaScript para compilar con anticipación. En un binario obtienes: React conciliando en un terminal a través de Ink, un lector estándar de modo sin formato, un ANSI/renderizador saturado de emojis que ejecuta expresiones regulares en cada fotograma, un streaming SSE cliente HTTP, esquemas zod creados al inicio, un flujo OAuth, `worker_threads`, `MessageChannel` se utiliza como programador de macrotareas, WeakMaps que contiene el estado de la fibra, `require` dinámico y una capa de sistema de archivos que escribe en la salida estándar mediante descriptor de archivo.

Cada uno de ellos es un subsistema diferente de Perry, y la aplicación los ejercita *juntos*, a escala, bajo GC presión, durante minutos a la vez. Nuestros propios conjuntos de pruebas: 3000 pruebas unitarias Rust, miles de programas de regresión TypeScript, la matriz de paridad Node API, test262: todos están orientados a fijar comportamientos conocidos. Este paquete está orientado a encontrar comportamientos que nadie ha pensado en fijar.

## La secuencia de obstáculos

El trabajo fue en una sola dirección: despejar el muro actual, encontrar el siguiente. Comprimido:

| Fecha| Hito |
| --- | --- |
| 21 de junio| `--help` se ejecuta de forma nativa, código de salida 0 |
| 22 de junio| Los subcomandos reales dejan de colgarse al inicio |
| 23 de junio| `-p` abre un socket ESTABLECIDO TCP en api.anthropic.com |
| 24 de junio| Los esquemas zod se construyen correctamente; ruta de autenticación alcanzada |
| 27 de junio| La TUI representa: logotipo, cuadro de bienvenida, marco de entrada |
| 9 de julio| Primer viaje de ida y vuelta completo: `-p` contra la API real imprime la respuesta, salida 0 |
| 10 de julio| Arnés diferencial Node-vs-Perry: 12/12 idéntico |
| 13 de julio| Byte idéntico al Node en `-p` texto + JSON, TUI renderizado, sistema de archivos |
| 16 de julio| Los caracteres escritos finalmente aparecen en la línea de entrada |
| 17 de julio| Bucle completo validado a mano: iniciar → `/login` → API respuesta → escribir |

Cada corrección se realizó como una solicitud de extracción independiente con una reproducción genérica mínima. Ninguno menciona la aplicación de la que proceden; esa fue una regla desde el primer día. Un usuario de Perry que lee el registro de cambios ve "`continue` en los controladores for-await omitió el avance del iterador", no "estábamos intentando compilar la CLI de alguien. Los errores son reales independientemente del vehículo que los haya aparecido.

## Cinco errores de software que vale la pena discutir

### 1. MessageChannel fue una no operación educada

`--help` funcionó el 21 de junio. Cada subcomando *real*: `doctor`, `agents`, `mcp list` - colgado para siempre. No ocupado: `sample` mostró el proceso estacionado, `lsof` no mostró procesos secundarios ni sockets, solo dos tuberías.

La implementación de `MessageChannel` de Perry instalaba `postMessage` como una operación vacía y `onmessage` como `null`. Eso parece inofensivo hasta que aparece el patrón del planificador de React, que utiliza un canal de mensajes para programar sus macrotareas:

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

El mensaje se eliminó, la devolución de llamada nunca se ejecutó y el bucle de eventos quedó inactivo en su propio canal de activación para siempre. [#5530](https://github.com/PerryTS/perry/pull/5530) proporcionó a los puertos una entrega real en el mismo hilo: pares entrelazados, una cola FIFO, entrega a través de la macrotarea `setImmediate` y una GC escáner raíz para que los mensajes en cola sobrevivan a una colección.

### 2. Un descriptor de acceso en Object.prototype cuesta 42 segundos

Antes del bloqueo, los mismos subcomandos estaban vinculados a la CPU durante decenas de segundos. El perfil apuntaba a la ruta genérica `[[Set]]` y la causa principal era una marca de proceso global.

Perry tiene una ruta rápida para escrituras de propiedades dinámicas, cerrada en "¿`Object.prototype` actualmente lleva algún descriptor?” El paquete instala exactamente un descriptor de acceso en `Object.prototype` al inicio. Eso cambió la bandera en todo el proceso y, a partir de ese momento, *cada* escritura dinámica en el programa tomó el camino de intercepción lenta, que es O (cuenta de claves propias). La construcción de un objeto ancho se volvió cuadrática:

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) reemplazó la marca global con una pregunta por clave: *¿`Object.prototype` tiene una propiedad propia para **esto** ¿clave?* Una clave ausente no se puede interceptar, por lo que la escritura es segura en la ruta rápida. 42 s → 23 ms, con la intercepción aún correcta.

Luego reapareció la misma forma para las instancias de clase, que la ruta rápida excluyó por completo: una compilación de 20.000 claves en un objeto simple tomó 25 ms, en una instancia `class` 44 segundos. Arreglar ese problema con cuidado era importante: una verificación ingenua de la cadena de prototipos habría omitido los configuradores heredados y habría corrompido silenciosamente los datos, por lo que [#5528](https://github.com/PerryTS/perry/pull/5528) resuelve el prototipo de la instancia a través del registro de clase y agrega un índice de clave ancha O(1). Vuelva a 30 ms y vuelva a ser lineal.

### 3. El error que solo la API real podría desencadenar

Este es el que le contamos a la gente. A principios de julio, el binario compilado haría un giro `-p` completo contra nuestro servidor simulado local: conectar, publicar, leer la transmisión SSE, imprimir la respuesta, salir 0. Contra el Anthropic API se colgaba para siempre, siempre.

La cadena de depuración fue: un simulacro de proxy directo demostró que la respuesta 200 completa llegó intacta → un simulacro de repetición, alimentó el flujo de bytes real capturado, reprodujo el bloqueo localmente → dividiendo la lista de eventos SSE encontró el evento culpable → una reproducción de diez líneas.

La API real envía `event: ping` fotogramas. Nuestro simulacro nunca lo hizo. Y `ping` es el único evento que el bucle de transmisión del SDK omite con un simple `continue`. Perry bajó `for await` a un controlador cuyo avance del iterador se encontraba en la *parte inferior* del cuerpo del bucle:

```
// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}
```

Seis sitios de descenso separados tenían la misma forma. [#6196](https://github.com/PerryTS/perry/pull/6196) movió el avance a la cima en todos ellos. La lección que seguimos reaprendiendo: un simulacro que pasa es evidencia del simulacro.

### 4. Una expresión regular que sobrevivió a su propia cadena de patrón

El TUI se renderizaría y luego moriría por `SIGBUS` en cuestión de segundos: 12 fallas en 12 ejecuciones bajo un arnés de estrés para cambiar el tamaño de la ventana, en diferentes direcciones en diferentes funciones cada vez. Se dedicaron semanas de investigación a teorías de GC que las pruebas A/B luego refutaron, incluida una de nuestras propias "soluciones" que resultó ser errónea y tuvo que ser retirada.

La causa raíz real fueron cuatro líneas de Rust. `js_regexp_new` asigna un encabezado RegExp y almacena sus punteros de cadena `pattern` y `flags` con escrituras sin formato: **sin barrera de escritura**. Un objeto de la vieja generación que apunta a una cuerda nueva y joven, y al coleccionista nunca se le informó sobre el borde. El GC menor eliminó esas cadenas de debajo de un RegExp activo y la siguiente lectura de la ranura liberada falló.

¿Por qué esto solo aparece aquí? Debido a que la interfaz de usuario de una terminal está saturada de expresiones regulares (el análisis ANSI y la medición del ancho de emoji se ejecutan en cada cuadro), la ventana entre la asignación y la recopilación se cruza miles de veces por minuto. Nuestra reproducción mínima, 6000 expresiones regulares más una rotación deliberada de asignaciones, *nunca* la activó. El paquete lo activó todo el tiempo. [#6288](https://github.com/PerryTS/perry/pull/6288) agregó la barrera que ambos campos siempre habían necesitado.

### 5. Los caracteres que escribiste estaban allí. El marco los arrojó.

La pared más rebelde: toda la interfaz de usuario se pintó perfectamente: cuadro de bienvenida, marco de entrada, bloque de cursor, línea de estado. Al escribir `/` se abrió el menú de comandos, por lo que la pulsación de tecla llegaba a React. Pero las letras nunca aparecieron en la línea de entrada.

Las compilaciones instrumentadas mostraron a Perry pintando el carácter escrito correctamente en cada etapa, y luego `onRender` arrojando *después* de la pintura, en un Ink `try/catch` que se lo tragó. El fotograma se abandonó antes de la confirmación, por lo que cada renderizado posterior se creó en un fotograma vacío. La aplicación parecía completamente saludable mientras te ignoraba.

Detrás de ese síntoma se escondían dos errores independientes:

-   [#6453](https://github.com/PerryTS/perry/pull/6453) — Perry reduce en línea `charAt`/`codePointAt`/`split` llamó a ToString en un receptor que no es de cadena sin la protección de coercibilidad requerida. Así que `undefined.codePointAt(0)` devolvió silenciosamente `117`, el punto de código de `"u"`, de la cadena `"undefined"`, en lugar de lanzarlo. Un error que *inventa* datos plausibles es mucho peor que uno que falla.

-   [#6471](https://github.com/PerryTS/perry/pull/6471): el verdadero bloqueador. Cuando una matriz crece, Perry deja un talón de reenvío permanente en la dirección anterior. El barrido menor fue recuperar esos trozos mientras un padre de la vieja generación todavía señalaba uno: el caché de caracteres del renderizador contenía un puntero de crecimiento previo en una página que no estaba sucia. La lectura del trozo obsoleto produjo una longitud de basura y cada cuadro fue abortado. Los menores ahora conservan todos los talones; trazas completas reclamarlas por marca.


Arreglando los expuestos en una tercera capa: los objetos que nacieron en negro durante el marcado incremental nunca fueron rastreados, por lo que cualquier cosa accesible solo a través de ellos fue barrido mientras estaba en vivo ([#6494](https://github.com/PerryTS/perry/pull/6494)), y la máscara de diseño no informó las ranuras de desbordamiento, por lo que el recopilador las omitió ([#6506](https://github.com/PerryTS/perry/pull/6506)). Esos dos son el tipo de agujeros de solidez que producen una falla misteriosa de cada cincuenta en *cualquier* programa compilado. No los habríamos encontrado con un conjunto de pruebas.

## Cómo se depura un binario minificado de 13 MB

Ninguno de los anteriores se puede encontrar leyendo el código. Las herramientas que lo hicieron manejable:

-   **Un arnés diferencial con Node como oráculo.** Cada hipótesis se convierte en un pequeño programa TypeScript que se ejecuta bajo un `node --experimental-strip-types` y un Perry binario, comparado byte por byte. Encontró errores por sí solo: una expresión de clase utilizada solo como `instanceof` del lado derecho fue eliminada por código inactivo porque once pases de análisis no pudieron ver a través de ese tipo de nodo ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Tres servidores API simulados.** Un simulacro de registro, un proxy de reenvío que captura bytes de respuesta reales y un servidor de reproducción que retroalimenta esos bytes exactos de forma determinista. El servidor de reproducción es lo que convirtió "los bloqueos contra la producción" en una reproducción local.

-   **Un arnés PTY que responde a las consultas del terminal.** Un pseudoterminal tonto te proporciona 50 bytes y un bloqueo. La aplicación busca la posición del cursor (`ESC[6n`), los atributos del dispositivo (`ESC[c`) y el color de fondo (`OSC 11`) y espera respuestas antes de pintar. Respóndelas y obtendrás la pantalla de bienvenida completa de 3331 bytes, y una representación de bytes comparable entre Node y Perry.

-   **Mapas de enlaces para simbolización.** Los archivos binarios eliminados de 180 MB producen informes de fallos llenos de compensaciones sin procesar; La salida `ld64 -map` más un script bisect los vuelve a convertir en nombres de funciones.

-   **A/B todo.** La regla que surgió, escrita en la parte superior de las notas de entrega en mayúsculas: *nunca heredes una teoría, pruébala.* Cuatro hipótesis consecutivas sobre la causa raíz de un error fueron refutadas mediante ejecuciones A/B. Una señal de verificación que perseguimos durante días (“445 bordes viejos → jóvenes faltantes”) resultó ser un artefacto de medición: la verificación se realizó entre la eliminación y la restauración del conjunto recordado. El propio comentario del código advertía de ello.


## Dónde se encuentra realmente

Honestamente: funciona y es lento.

Trabajando hoy, byte idéntico a Node donde la salida es comparable: inicio, `--help`, `--version`, modo one-shot `-p` contra la API real, incluida la clasificación de errores y el sobre JSON, el TUI completo, el OAuth `/login` flujo, transmisión de respuestas y escritura. Aquí está el bucle completo en una sola toma: inicio, `/login`, una pregunta, una respuesta transmitida, salir:

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Tu navegador no admite vídeo incrustado.</video><figcaption>63 segundos, sin audio, cortado en dos lugares: la mitad del navegador del apretón de manos OAuth y un macOS. Todo lo que hay en la terminal está en tiempo real y sin editar, incluido el retraso de inicio, que es lo más lento de esta publicación.</figcaption></figure>

Aún hay dos cosas abiertas, y bien podrían ser una. La entrada deja de registrarse después de aproximadamente un minuto de uso interactivo sostenido: no hay fallas ni errores, simplemente se detiene. Y `ESC` no interrumpe una respuesta en curso, aunque `Ctrl-C` ahora se cierra limpiamente, lo que no hizo hace una semana (esa es la salida que ve al final de la grabación). Una ruta de salida que funciona mientras que una ruta de interrupción no apunta al mismo sospechoso que la muerte de la entrada: eventos de pulsación de teclas que dejan de llegar a la aplicación, en lugar de cualquier problema con los propios controladores de la aplicación.

Imagen de rendimiento, medida en comparación con Node que ejecuta el paquete idéntico, antes y después de la primera ronda de la campaña de velocidad que inició el día en que llegó la corrección. Estos surgieron de `cc_final` y `cc_perf2` el 17 de julio: compilaciones ordinarias sin diagnósticos compilados, no el binario instrumentado en la captura de pantalla anterior:

| Métrica| Node| Perry (17 de julio)| Perry (después) |
| --- | --- | --- | --- |
| `--version` | 328 ms| 1.168 ms| **227 ms** |
| `--help` | 715 ms| 5.071 ms| 4.099 ms |
| TUI primera pintura| 0.76 s | 10.9 s | 8.4 s |
| Pulsación de tecla → pintar (p50)| 2,2 ms| 111-143 ms| 119-138 ms |
| Huella de memoria, inactiva| 290 MB planos| ~420 MB subiendo| ~420 MB subiendo |

`--version` ahora **supera a Node**, y la victoria fue vergonzosa en su origen: el ejecutable compilado exportaba 300.281 símbolos, por lo que ~80% de ese lanzamiento fue dyld haciendo fusión de definición débil. Un indicador del vinculador llevó las exportaciones a 3 y el binario de 228 MB a 197 MB ([#6533](https://github.com/PerryTS/perry/pull/6533)). Construyendo cada expresión regular única una vez en lugar de dos veces ([#6534](https://github.com/PerryTS/perry/pull/6534)) y almacenando en caché la verificación de interceptación por tienda ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) se llevó el resto.

En esos 197 MB, antes de que alguien empiece a utilizarlos: Perry vincula estáticamente su propio tiempo de ejecución y emite código de máquina para las 16.023 funciones por adelantado sin nada que eliminar; un paquete autoejecutable hace que prácticamente todo sea accesible, por lo que no hay paquetes cruzados DCE en el que apoyarse, lo que significa que 197 MB es un programa completo *más* su tiempo de ejecución en un archivo, frente a los **138 MB que pesa el binario Node v26 antes de haber leído una sola línea de su JavaScript**.

La fila de pulsaciones de teclas es la que se debe leer con atención, porque el número "después" se ve peor. No lo es: esos son rangos entre ejecuciones repetidas y se superponen, por lo que la mediana no se movió en ninguna dirección; es decir, una varianza entre ejecuciones, no una regresión. También es exactamente lo que esperábamos. Los tres cambios tocan el paso del enlace, la construcción de expresiones regulares y la ruta *almacenamiento*; la mediana de pulsaciones de teclas está dominada por la propiedad *read* ruta, la sobrecarga de enraizamiento por llamada y GC pasos de 40 a 80 ms que aterrizan dentro de las ventanas de pulsación de teclas. La prueba llegó en la siguiente ronda: get/set fast lanes hizo que un microbenchmark de acceso al campo fuera 3 veces más rápido y no movió este número en nada ([#6539](https://github.com/PerryTS/perry/pull/6539)). Una victoria en un microbenchmark que no aparece en la aplicación es un diagnóstico erróneo, y nosotros tuvimos uno.

La línea de memoria es la campaña actual. El recolector de copias de Perry *puede* compactar; el problema es que se vuelve elegible aproximadamente una vez cada 45 segundos de inactividad, por lo que el vivero vuelve a crecer a ~300 MB entre disparos, mientras que Node permanece plano al compactarse continuamente. Se trata de un problema de frecuencia de activación, no de algoritmo, que es un lugar mucho mejor para estar que donde estábamos en junio.

Ninguno de los cuales está estacionado. La campaña de memoria y rendimiento está *activa* a medida que se publica esta publicación (el trabajo de activación GC se ejecuta hoy, en este binario exacto), por lo que la tabla de rendimiento anterior es la parte de esta publicación que más esperamos invalidar, y cuanto antes, mejor. Lo correcto necesitó un mes de muros para superarlo. Lo que queda es un problema de frecuencia de activación y un problema de ruta de lectura, ambos entendidos, ambos ya en marcha. Esperamos que esto se sienta fluido en lugar de simplemente ser correcto, y lo esperamos pronto.

## Por qué hacemos esto

Ninguna de las 160 correcciones tiene que ver con Claude Code. Una barrera de escritura faltante en los encabezados RegExp corrompe la memoria en *cualquier* programa que genere expresiones regulares bajo carga. `for await` con un `continue` gira en cualquier consumidor de transmisión. `MessageChannel` que suelta mensajes interrumpe todas las aplicaciones con forma de programador React. El indicador del descriptor `Object.prototype` hizo que *cada* programa que toca `Object.prototype` sea cuadrático en su objeto más ancho.

Todos esos errores estaban en Perry mientras que CI estaba en verde, mientras que los números de test262 subieron, mientras que la matriz de paridad de Node decía 97%. Se necesitaron trece megabytes del JavaScript minificado de otra persona, haciendo un trabajo real contra una API real en una terminal real, para liberarlos.

Hay una cosa más, y es la parte que nos parece más divertida. Perry no está escrito solo a mano: gran parte de él, incluida gran parte de *esta* campaña, se escribió con Claude Code. Los servidores simulados, el arnés PTY, el corredor diferencial, las largas noches de dividir un error GC a las cuatro de la mañana: sesiones de agentes, revisadas y fusionadas por un humano. No todos los de Perry, y no sin muchos argumentos. Pero basta con que la frase sea cierta en ambos sentidos.

El compilador que consumió Claude Code fue, en gran parte, creado por Claude Code.

Seguiremos haciéndolo. Los próximos objetivos ya están en cola.

* * *

Perry no está afiliado ni respaldado por Anthropic. Claude Code es una marca comercial de Anthropic PBC. El binario descrito aquí se creó a partir del paquete npm publicado públicamente únicamente como objetivo de prueba del compilador y no se distribuye.
