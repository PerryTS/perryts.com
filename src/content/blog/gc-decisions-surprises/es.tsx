import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `**TL;DR.** Perry compila TypeScript a binarios nativos y utiliza un recolector de trazado móvil, generacional y con raíces precisas, no conteo de referencias. Después de un mes en el que casi todo el trabajo del GC consistió en *averiguar qué estaba haciendo realmente el recolector*, Perry gana ahora a Node en 9 de 19 benchmarks con forma de GC (antes eran 3), gana al competidor AOT con conteo de referencias en 14 de 19 y queda a menos de 1,3× de Node en 15 de 19. Por el camino encontramos una clase de bug que no deja pruebas forenses, variables de entorno que no controlaban nada, puertas de CI estructuralmente incapaces de fallar, un comentario de documentación que hizo que se distribuyera silenciosamente un recolector distinto y una medición final que muestra que la brecha restante está en el *layout* de los objetos, no en la recolección. Las nueve reglas que extrajimos están al final, y la mayoría no tiene nada que ver con la recolección de basura.

Perry compila TypeScript directamente a un ejecutable nativo: SWC lo analiza, nosotros lo bajamos a HIR, LLVM emite código máquina y \`cc\` lo enlaza. No hay intérprete ni bytecode. Aun así, el lenguaje que compilamos tiene closures que escapan, objetos que sobreviven a sus ámbitos y ciclos de referencias, así que detrás de ese binario nativo tiene que haber un recolector de basura real.

Este texto trata de las decisiones que tomamos al construirlo, de las cosas que nos sorprendieron —casi todas desagradables— y de dónde están hoy los números. El recolector lleva meses siendo el área más activa del código: **201 commits tocaron \`crates/perry-runtime/src/{gc,arena}\` desde el 1 de julio de 2026, 110 de ellos en los últimos doce días**, repartidos entre 127 archivos y unas 75.000 líneas. 135 de los 572 fragmentos de changelog aún no publicados llevan nombres relacionados con el GC.

Casi nada de eso fue «implementar un recolector». Fue averiguar qué estaba haciendo realmente nuestro recolector.

---

## Parte 1 — Lo que elegimos

### Nada de conteo de referencias

La primera pregunta que hace cualquiera es si un compilador AOT no debería limitarse a usar conteo de referencias. Encaja de forma obvia: no hay problema de descubrimiento de raíces, no hacen falta safepoints ni cooperación con el optimizador. El compilador TypeScript AOT contra el que hacemos benchmarks sigue exactamente esa ruta.

Nosotros elegimos de todos modos un recolector de trazado, porque el conteo de referencias obliga al caso común a pagar por el raro: cada escritura de puntero actualiza un contador, los ciclos necesitan igualmente un trazador de respaldo y JS asigna cantidades enormes de objetos que mueren de inmediato, justo el caso que una nursery resuelve gratis. Hoy esa decisión parece correcta en 14 de nuestros 19 benchmarks de GC e incorrecta en 5; volveremos a ellos al final.

### Los valores usan NaN-boxing — y estamos deshaciendo parte de ello

Cada valor JS ocupa una palabra de 64 bits. Usamos los aproximadamente 2⁵² patrones NaN libres de IEEE 754 para etiquetar punteros, enteros pequeños y singletons, y dejamos que todo lo demás sea un \`f64\` normal:

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

Para el recolector es un trato realmente bueno: «¿es esta palabra un puntero?» se resuelve con una máscara y una comparación, sin consultar el tipo de cada valor durante el trazado; además, un número en reposo ya son sus propios bits IEEE, de modo que un campo numérico no necesita ni caja ni cabecera.

Para el *mutator*, en cambio, es la mayor barrera individual entre nosotros y V8, y la estamos eliminando activamente. El problema es que \`double\` con NaN-boxing no es solo *una* representación, sino la **canónica**. Los tipos máquina nativos solo existen como overlays locales a una región, mientras toda una familia \`materialize_*_to_js_value\` vuelve a encajonar en cada frontera visible para JS. En el IR emitido eso significa que un acumulador de bucle demostrablemente \`i32\` vive en un \`alloca double\`, sobrevive a \`-O3\` como un \`phi double\` a través de la arista de retorno y paga una ida y vuelta \`fptosi\` + \`sitofp\` **en cada iteración**. Los parámetros de función son uniformemente \`double %argN\`, por lo que una función caliente vuelve a desencajonar sus argumentos millones de veces; incluso registrábamos locales numéricas como raíces de GC aunque un número jamás pueda ser un puntero.

La medición que resolvió la discusión: una versión fiel y desenrollada de \`_encipher\` de bcryptjs tarda 834 ms frente a 184 ms en Node, y *añadir anotaciones de tipos lo empeoró*, de 834 a 2732 ms, porque dominaron unos 80 guards por lectura y la rematerialización en las fronteras. Los fast paths a nivel de expresión no pueden arreglar un problema de representación: cada uno es otro overlay encima de un canon encajonado, y en código desenrollado se vuelven contraproducentes.

La dirección (\`docs/representation-selection-rfc.md\` y la campaña unbox-by-default) es hacer canónica la forma nativa sin caja para cada valor probado estáticamente —escalares, strings, objetos, typed arrays y closures— de extremo a extremo a través de locales, parámetros, retornos y slots de heap tipados, y limitar el NaN-boxing a valores demostrablemente polimórficos. Sigue siendo la representación *predeterminada*, pero deja de ser la *única*. Las fases 1, 2, 3a, 3b, 4a y 4b están integradas. Static Hermes demuestra que es posible. El argumento AOT es que tenemos que *probar* tipos donde un JIT puede especular; también es nuestra ventaja, porque un kernel probado no necesita calentamiento ni puede deoptimizarse.

Esto afecta directamente al GC en ambos sentidos. El unboxing elimina raíces que el recolector tendría que escanear —un escalar probado no es una raíz— y a la vez añade una obligación: cuando un slot del heap guarda algo que no sea una palabra con NaN-boxing, el recolector ya no puede deducir del valor si es un puntero y debe consultar una máscara de layout por shape. Esa maquinaria —\`pointer_mask\`, \`raw_f64_mask\` y las notas de layout— originó varios de los bugs que aparecen más adelante.

### Un heap por hilo, sin compartir

Perry es single-threaded por defecto; \`perry/thread\` proporciona \`spawn\` y \`parallelMap\`, y los valores cruzan las fronteras entre hilos mediante copia profunda (\`SerializedValue\`), no compartiendo memoria. Tiene un coste ergonómico real, pero le compra algo grande al recolector: **nunca se sincroniza con otro hilo.** No hay protocolo global de safepoints, handshakes ni read barriers para invariantes entre hilos. Cada arena, cada escáner de raíces y cada remembered set es local al hilo.

### Generacional, porque la distribución de asignaciones lo exige

Hay dos regiones por hilo: una nursery (\`ARENA\`, bloques de 1 MB) y una generación vieja (\`OLD_ARENA\`), una \`GcHeader\` de 8 bytes por asignación, dos bits de envejecimiento (\`HAS_SURVIVED\` y \`TENURED\`) en lugar de un contador, y \`PROMOTION_AGE = 2\`. El plan original, escrito el 24 de abril de 2026 antes de que hubiera código, lo explicó con claridad: más del 90 % de las asignaciones JS mueren en el ámbito que las creó, así que una arena plana se pasa la vida remarcando objetos que estaban trivialmente muertos.

El plan también identificó correctamente el requisito previo, y de esta decisión depende todo lo demás:

> **Un GC generacional necesita raíces precisas.**

Un escáner conservador sirve para un recolector que no mueve: un falso positivo solo conserva un objeto muerto durante otro ciclo. Un recolector *móvil* no puede funcionar así. Si no puedes enumerar las raíces con precisión, no puedes reescribirlas; y si no puedes reescribirlas, no puedes mover nada.

### Raíces: un análisis, dos lowerings y statepoints de LLVM por defecto

LLVM puede mantener valores en registros, rematerializarlos y derramarlos donde quiera; el recolector no puede inspeccionar nada de eso. La respuesta de Perry tiene dos capas, y separarlas nos llevó vergonzosamente demasiado tiempo.

El **análisis** —qué locales contienen punteros de GC y dónde debe seguir vivo cada uno— es independiente del backend. El **lowering** de esa respuesta al código emitido es una elección:

- *Shadow stack.* \`js_shadow_frame_push(n)\` al entrar, un \`js_shadow_slot_bind\` por cada local de nivel JS y \`js_shadow_frame_pop\` al salir. El recolector recorre un frame alojado en el heap.
- *Stack maps nativos mediante RS4GC.* Las allocas raíz se convierten en \`ptr addrspace(1)\`, las funciones se etiquetan con \`gc "statepoint-example"\` y cada módulo pasa por \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\`. LLVM inserta por sí mismo cada statepoint, cada relocation y la reescritura de usos posteriores; durante la recolección leemos las raíces de una sección compacta \`__perry_gcmap\`.

**Desde #7370 el lowering de statepoints es el predeterminado.** Ya no hay que escribir \`PERRY_RS4GC=1\`; \`PERRY_RS4GC=0\` vuelve al shadow stack para hacer una bisección. La elección depende del target, no es indiscriminada, porque \`gc_map\` se niega a emitir un mapa si la runtime no puede resolver las bases de frame de ese target: un mapa que nadie lee pierde raíces en silencio. La regla es raíces nativas donde la runtime puede recorrer el stack y shadow stack donde no puede. aarch64/arm64 y x86-64 reciben statepoints; watchOS \`arm64_32\` y Windows ARM64 conservan el shadow frame. Caer al fallback no significa «sin raíces», sino usar el otro lowering del mismo análisis.

La evidencia para cambiar el valor predeterminado, sin variables de entorno: la suite completa de 479 tests de brecha con **0 regresiones y 0 fallos de compilación**; los **128 tests que contienen \`try\`** compilaron, justo la clase que el antiguo puente de statepoints escrito a mano nunca pudo manejar; las 10 probes ratchet de GC produjeron bytes idénticos a Node; el tiempo de ejecución bajó un 1–2 % —ligeramente más rápido— y el tamaño del binario subió un 1,86 % en los 81 módulos de zod.

Lo importante frente a decir «emitimos un shadow stack» no es ese 1–2 %. Un statepoint lleva **semántica de relocation que el optimizador debe respetar**; un shadow stack solo es correcto mientras el optimizador no haga nada inteligente con un valor que olvidamos derramar. Tenemos pruebas de esa diferencia, y aparecen en la Parte 3.

Además hay **79 escáneres de raíces de runtime registrados** para estado que vive en la runtime, no en el código del usuario: promises pendientes, callbacks de timers, estado de excepciones, stacks de contexto async, caches de shapes, la tabla de internado de strings y tablas temporales de JSON.

También existe un escáner conservador del stack nativo. Nuestro documento de arquitectura lo describe como uno de tres mecanismos equivalentes; ese texto está desactualizado, y descubrirlo al escribir este artículo fue instructivo. En la configuración de producción distribuida, \`conservative_stack_scan_decision()\` resuelve a \`SkipDisabled\`: la liveness depende por completo del mapa preciso de raíces —statepoints o shadow frame en targets de fallback— más \`RuntimeHandleScope\` en helpers de runtime. El camino conservador sigue existiendo para modos específicos, sobre todo la recolección en el punto de asignación, no como red de seguridad bajo el preciso.

### Write barriers, armadas de forma perezosa

El peligro generacional son los punteros viejo→joven: un minor GC que solo traza la nursery debe conocerlos. Codegen emite llamadas a \`js_write_barrier\` al escribir punteros y la runtime mantiene un remembered set.

La invariante que distribuimos para armarla en #7250 es una de las piezas de diseño más reutilizables del recolector:

> Mientras está desarmada, la barrera no registra nada. A cambio, la primera *lectura* del remembered set en un hilo no confía en absoluto en el log: reconstruye desde el heap el conjunto completo de aristas viejo→joven y arma la barrera al terminar.

Se impone estructuralmente, no por convención: \`remembered_dirty_snapshot()\` es \`pub(super)\`, tiene siete call sites y todos están dentro de \`gc/\`.

*(Nota para quien lea el código: Perry tiene dos cosas sin relación llamadas «la barrera»: la write barrier del GC y una barrera de promoción \`Ptr<Shape>\` en tiempo de compilación dentro del pase de selección de representación. Tres issues distintos quemaron tiempo por confundirlas. Nombrad siempre el archivo.)*

---

## Parte 2 — Las sorpresas

### 1. La clase de bug que no deja pruebas

La invariante de rooting cabe en una frase:

> Todo valor gestionado por el GC que siga vivo a través de un punto de recolección debe ser alcanzable desde una raíz antes de ese punto. Un valor leído de una raíz y conservado en un registro SSA durante una llamada **no está enraizado**: es una copia, y el recolector no puede ver copias.

Romperla produce la peor experiencia de depuración del proyecto. En el momento de la recolección no hay *nada que el recolector pueda encontrar*: ninguna referencia colgante, ningún slot sin forwarding, ninguna anomalía. La nursery recicla después la dirección; el puntero obsoleto lee un objeto válido pero distinto y el programa muere uno o varios ciclos más tarde, en otra función, con \`TypeError: value is not a function\`.

Todas nuestras probes de GC en runtime son ciegas a ello. Los scans de from-space salen limpios. Los pases de verificación salen limpios. \`PERRY_GC_VERIFY_EVACUATION\` comprueba que los slots alcanzables fueron reenviados, pero no puede comprobar un registro cuya existencia desconoce.

Ya hemos catalogado cinco formas distintas, todas ellas distribuidas:

| # | Forma | Por qué sobrevivió a la revisión |
|---|---|---|
| #7184 | Store de raíz emitido en un índice fuera del frame apilado | \`js_shadow_slot_bind\` comprueba límites y no hace nada en silencio; el IR *dice* que quedó enraizado |
| #7192 | Store de raíz emitido *después* de una llamada que asigna | El slot termina enraizado **y** colgante; supera cualquier pregunta de «¿está enraizado?» |
| #7206 | Se carga el receptor de un método, luego se bajan los argumentos —cada uno puede asignar— y después se usa | La carga parece obviamente correcta de forma aislada |
| #7206 | \`base[key]\`: materializar la base, bajar la expresión de la clave y usar después la base obsoleta | Dos operandos; uno se evalúa primero y se usa al final |
| #7226/#7239 | Una celda thread-local o estática cachea un puntero de heap que ningún escáner reescribe | No aparece en el IR |

Cuatro se distribuyeron **en un solo día**. La corrección de cada una fueron unas pocas líneas; el coste siempre fue el retraso en detectarla. Solo la primera es específica del shadow stack. Las demás son independientes del lowering y sobrevivieron sin cambios al paso a statepoints, porque el error está en *cuándo emite el lowering la raíz*, no en qué es una raíz.

La única heurística realmente útil: **un bug de GC perfectamente reproducible significa una tabla, no un registro.** Un registro sin raíz solo se corrompe cuando una recolección cae dentro de su ventana, así que es intermitente; un cache sin raíz se corrompe en la recolección #0 y continúa mal. Hay una única excepción conocida: una sexta forma que ningún rooting puede arreglar, un \`&str\` o \`&[u8]\` prestado de un \`StringHeader\` del heap y mantenido durante una llamada que asigna. El rooting reescribe el *slot*; un préstamo no es un slot. La única solución correcta es copiar los bytes fuera del heap antes de la primera asignación.

### 2. Dejamos de inspeccionar y empezamos a construir instrumentos

El punto de inflexión de #7154 no fue una corrección, sino abandonar la inspección después de diez rondas y construir herramientas que convierten el bug en un fallo inmediato.

**Cuarentena de from-space.** Después de un minor evacuante no se recicla el from-space. Los bloques retirados se separan en un anillo acotado, se rellenan con una palabra venenosa cuyo primer byte se lee como un \`obj_type\` inválido (\`0xDE\`), y se aplica \`mprotect(PROT_NONE)\` al interior alineado a páginas. Una dereferencia obsoleta provoca ahora SIGSEGV *en la instrucción culpable*, mientras el poseedor sigue en el stack. El reporter instalado nombra la dirección, qué minor retiró esa página y qué objeto vivía allí; luego restaura \`SIG_DFL\` y vuelve a provocar el fallo para que el depurador vea el lugar real.

**GC zeal.** Fuerza un minor evacuante en cada safepoint para que un valor sin raíz se mueva en su primera exposición, no cuando una ráfaga de asignaciones independiente coincida por casualidad con la ventana. Está inspirado en \`--stress-scavenge\` de V8 y \`gcZeal\` de SpiderMonkey.

**Un control de profundidad que nadie esperaba necesitar.** La cuarentena es un anillo de *N* conjuntos de páginas retiradas, por defecto 4. El reproductor \`new C(…)\` de #7154 no falla con profundidad 4, ni 8, ni 100. El cuerpo del constructor cruza unos 600 polls de back-edge; cuando el return override publica el registro obsoleto del caller, la página tiene ya 600 retiradas de antigüedad. Con \`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\` falla al primer uso. «Aumenta la profundidad» es ahora el primer consejo ante un bug sospechoso que se niega a reproducirse.

Los propios instrumentos se **prueban mediante sabotaje**, no solo se ejecutan. \`quarantine_catches_a_planted_stale_from_space_deref\` planta la forma de #7184/#7192 y exige que el instrumento detecte veneno donde el control no instrumentado lee un objeto reciclado perfectamente válido. Ese control es el punto: demuestra que sin la herramienta el bug es realmente invisible.

También hay un instrumento estático: \`scripts/gc_root_dominance_check.py\` lee el IR de LLVM emitido y comprueba que los stores de raíces dominen todos los lugares posteriores que pueden recolectar. Tiene una puerta de CI cuya allowlist de incidencias conocidas está actualmente **vacía**, por lo que cualquier incidencia nueva pone el build en rojo. Es estructuralmente ciego a tres clases —tablas de runtime, locales sin raíz en Rust de runtime y cualquier cosa que sus conjuntos de símbolos no nombren— y lo decimos expresamente, porque dos veces se tomó un informe limpio como evidencia de algo que no podía haber comprobado.

### 3. La mitad de nuestros controles no controlaba nada

Esta sorpresa cambió más nuestra política de ingeniería que nuestro código.

Durante meses, \`PERRY_GEN_GC_EVACUATE\` era la variable que se activaba para demostrar que un cambio era seguro bajo evacuación. Cuando por fin la medimos correctamente —binarios idénticos, el mismo host y diff celda por celda de 12 probes ratchet × 8 contadores— cambió **0 de 96 celdas**. Medianas idénticas bit a bit. El mismo procedimiento con \`PERRY_GEN_GC=0\` cambió 79 celdas, así que el harness sí era sensible; esa variable concreta no lo era. Controlaba un fallback del que no procedían los contadores.

Su único efecto vivo era una trampa: vetaba la evacuación forzada. Un \`PERRY_GEN_GC_EVACUATE=0\` ambiental desarmaba silenciosamente \`PERRY_GC_ZEAL\` —el instrumento de la sección anterior— y una ejecución zeal podía declararse limpia sin haber movido nada.

No estaba sola:

- \`PERRY_GC_FORCE_EVACUATE\` solo se leía **en el camino minor**, mientras todos los tests que lo usaban provocaban la recolección mediante \`gc()\`, que ejecutaba un full mark-sweep tras un scan conservador forzado. Meses de «pasa bajo evacuación forzada» no significaban nada.
- El control \`--pressure\` de la matriz de estrés desactivaba el mismo camino que medía: el hard cap de aplazamiento y el techo del trigger de arena compartían fórmula y colapsaban juntos; el brazo \`default\` ejecutaba cero copying minors en las 22 filas.
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\` era totalmente inerte por sí solo. El scan nunca se ejecutaba, nada abortaba y la ejecución informaba éxito. Quien buscaba el interruptor de abortar en mitad de una investigación recibía verde y ningún scan.
- El comentario de \`gc_incremental_enabled\` decía «EXPERIMENTAL — default OFF» ocho líneas por encima de un comentario del body que decía «DEFAULT ON». Una decisión de merge se tomó basándose en el equivocado.

La política resultante es ahora vinculante en \`CLAUDE.md\`:

> **Cada variable de entorno del GC tiene un brazo de CI obligatorio que ejercita su estado OFF o se elimina después de una release de asentamiento.** Puede existir como máximo una variable solo diagnóstica, y debe estar marcada como no probada.
>
> **Un modo que todavía existe es una decisión que aún no se ha tomado.**

\`PERRY_GEN_GC_EVACUATE\` se eliminó, no se arregló. En cada lugar quedó un comentario lápida explicando qué había y por qué ya no está: cinco, justo donde de otro modo alguien reintroduciría la conjunción. Una auditoría de CI deriva los nombres aceptados de parsers de producción no comentados y falla ante cualquier afirmación viva sobre una variable borrada. Su self-test planta una variable eliminada tras un parser comentado y demuestra que ninguno puede pasar.

### 4. Puertas incapaces de fallar

\`CLAUDE.md\` enumera cuatro maneras en las que una puerta de CI puede ser estructuralmente incapaz de volver rojo un merge. Las cuatro han golpeado este repositorio, tres en una semana:

1. \`continue-on-error: true\`: \`gc-stress\` lo llevó durante meses siendo el único job que cubría la corrección del GC.
2. No estar en los contexts obligatorios de branch protection: un job que informa un fallo pero no bloquea es documentación, no una puerta.
3. \`concurrency\` con \`cancel-in-progress\` incondicional: con una cola lenta, cada merge nuevo cancela la ejecución anterior antes de que llegue a un runner. \`gc-ratchet\` tuvo tres ejecuciones consecutivas de \`main\` canceladas y cero ejecutadas.
4. **La puerta se ejecuta, pero su sujeto nunca lo hizo**, la más peligrosa porque el job es genuinamente verde.

Después encontramos dos más. \`gc-stress\` *jamás se había ejecutado en \`main\`*: el trigger \`push:\` del workflow solo aceptaba tags y la condición \`if:\` del job omitía \`schedule\`, por lo que 12 de 12 nightlies aparecieron como \`skipped\`. Y \`lint\` —un context *obligatorio*— llevaba más de tres nightlies rojo por 16 archivos que habían superado el límite de 2000 líneas; todos los merges entraban mediante bypass de administrador. Branch protection era teatro, y una nueva puerta bien construida y conectada a \`lint\` habría sido inerte al llegar.

La consecuencia que reaprendemos: **una puerta debe afirmar que su sujeto estuvo vivo**, no solo que nada lanzó una excepción. Nuestras ejecuciones zeal imprimen al salir \`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\` y **terminan con 70 si alguno es cero**. Una ejecución que no ejercitó nada queda roja, no verde.

### 5. El recolector seguía programando recolecciones que no podían ayudar

Un bug estructural recurrente, tres instancias independientes y una forma: *un predicado programa una recolección incapaz de cambiar la cantidad que el predicado lee.*

**La entrega de promoción de supervivientes (#7592).** Un predicado sustituía un minor por un full mark-sweep para hacer sitio en old-gen a los supervivientes que iban a promocionarse. Pero un full mark-sweep no mueve; no promociona nada. No podía aliviar la presión que lo programó y volvía a ser cierto en el minor siguiente. Medido en una pipeline JSON de 200.000 registros: **19 de 22 recolecciones fueron esos fulls, cada uno liberó 0,0 MB a unos 400 ms.** 7,6 s de una fase de 8,6 s. El copying minor que habría hecho la promoción no se ejecutó ni una vez.

**El límite de nursery (#7690).** Un cap basado en ocupación de from-space aplicado a un minor *no móvil*, que barre in place y deja ocupado el from-space. Un trigger limitado que dispara un minor no móvil vuelve a vencer en el bloque siguiente: una recolección de toda la arena por cada 1 MB asignado, cuadrática en el conjunto vivo.

**El límite proporcional a lo vivo que era un punto fijo.** Un intento de escalar el cap con el conjunto vivo usaba \`max(base, arena_in_use)\`. La prueba de vencimiento compara la *ocupación de from-space* con el cap y, en ese workload, from-space ≈ vivo. El from-space nunca podía cruzar su propio límite y el scavenging se detenía. Midió una mejora de 5,9× por no hacer trabajo.

Salieron dos reglas que sostienen nuestro pacing:

> **Nunca marques el ritmo de una recolección con una cantidad que esa recolección no cambia.**
>
> **Ninguna banda constante debe marcar el ritmo de un recolector cuyo coste por ciclo es O(vivo)**: el trabajo total se vuelve cuadrático en el conjunto vivo, y una constante mayor solo desplaza el precipicio.

Arreglar esa familia llevó un workload JSON de **60,4 s a 3,86 s**, manteniendo el coste por registro dentro de aproximadamente un 30 % a lo largo de un rango de tamaño 20× donde antes crecía 70×.

### 6. Y una vez el recolector documentó un cambio que nunca hizo

La línea más cara de esta historia es un comentario de documentación.

#7690 escribió el argumento completo para activar por defecto los polls móviles de back-edge de bucle en dos comentarios —uno en runtime y otro en codegen— y **no cambió ninguno de los bodies**. Ambos seguían aceptando \`1|on|true\`, es decir, default OFF, y ningún test fijaba el valor en dirección alguna. El comentario de runtime incluso decía que el espejo de codegen «MUST agree»; estaban de acuerdo, pero en el valor que la documentación afirmaba haber cambiado.

No es una configuración más lenta, sino un recolector diferente. La presión de nursery solo tiene dos puntos precisos de recolección: el poll de back-edge y el límite exterior de la bomba de microtasks. Sin poll emitido, un programa solo de cómputo no alcanza ninguno. Cada recolección de nursery caía en el punto de asignación, donde una corrección anterior había hecho correctamente que fueran no móviles. **El recolector distribuido no evacuaba la nursery en absoluto** y caía a full collections de toda la arena.

| benchmark | \`main\` distribuido | polls realmente activos |
|---|--:|--:|
| tree | 5,10 s | **1,63 s** |
| tree_wide | 7,26 s | **2,12 s** |
| retain | 2,33 s | **1,32 s** |
| churn | 1,00 s | **0,46 s** |
| cycles | 0,29 s | **0,19 s** |

Un benchmark ejecutó **13 full collections de toda la arena —0,477 s de pausa—** donde el mismo programa unas semanas antes ejecutaba **105 copying minors —0,016 s—**. La pausa total de GC de \`tree\` bajó de 4,107 s a 0,550 s; la máxima, de 266 ms a 16 ms.

Lo encontró no el tiempo de pared, sino los *tipos* de ciclos en \`PERRY_GC_TRACE=1\`: \`{'full': 13}\` donde debía haber \`{'minor': 105}\`.

Tres tests fijan ahora el default, incluido el brazo de valor no reconocido, y otro fija que ambos crates coincidan. El desacuerdo es silencioso en ambos sentidos —polls que nadie consume o aplazamiento que nadie drena—, así que necesita una aserción, no dos comentarios diciendo que coinciden.

La clase no está cerrada. Una ronda de profiling encontró esta semana la misma forma en la write barrier: **codegen emite una carga \`seq_cst\` del contador barrier-active —un \`ldar\` en aarch64, con 42 lugares en \`evalNode\`— mientras runtime lee el mismo global con \`Relaxed\` para la misma decisión**. El comentario de codegen promete «one relaxed load of a \`static\`». Dos lectores discrepan sobre el ordering necesario y la documentación se pone contra el código. Como máximo uno tiene razón; si runtime es quien se equivoca, el bug es mucho más serio que el \`ldar\`. Está registrado pero no arreglado a propósito: adivinar mal puede omitir una insertion barrier, invisible durante la recolección y visible ciclos después como \`TypeError: value is not a function\`.

### 7. El trabajo de GC más rápido es el que se elimina

Eliminados los bugs de pacing, el coste restante resultó una y otra vez ser trabajo que no debía existir.

**Un heap donde nada moría se marcaba una y otra vez.** \`retain.ts\` construye un array de 3 millones de registros y no descarta ninguno. Perry pasó **1,26 s de una ejecución de 1,31 s dentro del recolector**, el 96 %. Node lo hace en 0,13 s. Dos full mark-sweeps recuperaron 4 MB entre ambos; uno no cambió la ocupación ni un byte. El predicado de escalada se basaba en crecimiento: un conjunto vivo creciente cruza un umbral cada vez que se duplica. Solución: valorar un full por lo que recupera y desplazar el umbral cuando demuestra ser improductivo.

**Cada objeto evacuado tomaba un mutex global para hacer hash sobre un mapa vacío.** Un hook de movimiento ejecutaba un \`remove\` SipHash contra el registro residual de \`Object.setPrototypeOf\`, vacío en cualquier programa que no cambie prototipos. Ya existía un latch que lo indicaba; el hook era el único lector que lo ignoraba. Promocionar 3 millones de registros pagó 2,5 millones de adquisiciones de mutex sin contención pero reales para nada.

**Luego dejamos de mover los objetos.** Cuando la nursery de un copying minor está casi completamente viva, evacuar objeto a objeto es puro overhead: nueva asignación old-gen, \`memcpy\`, transferencia de layout, accounting, hooks, forwarding stub y reescritura de cada slot referente, para poner un objeto donde no necesitaba ir. La promoción in place de bloques completos —page promotion en V8— solo reetiqueta la generación del bloque. Nada se mueve, nada se reescribe:

| workload | antes | después |
|---|--:|--:|
| retain | 0,81 s | **0,53 s** |
| retain_wide | 1,33 s | **1,07 s** |
| deeplist | 0,30 s | **0,24 s** |
| coste de promoción/objeto | 243 ns | **105 ns** |

**Y después dejamos de trazarlos.** Aun entonces, tres pases recorrían cada superviviente: el scan dirty del remembered set lo marcaba, el drain lo tocaba de nuevo y \`clear_marks\` una tercera vez. En un ciclo donde nada se mueve ni puede liberarse, el trazado costaba unos 55–67 ns por objeto y el recorrido que realmente promociona, unos 9 ns. Un ciclo de promoción omite ahora el trazado si la última survival ratio medida está en el régimen totalmente vivo; se niega explícitamente cuando alguna suposición cuesta algo: un holder de weak targets registrado, un registro malloc no vacío, un mark incremental activo o cualquiera de los tres instrumentos de verificación. Todos usan el trazado como sujeto; sin marcas podrían informar éxito sin examinar nada. Resultado: \`retain\` −33,6 %, \`deeplist\` −43 % y ciclos que antes costaban 243 ns por objeto ahora cuestan **8,9 ns**.

La política se basa en una *medición*, no una suposición. No se conoce la liveness de un bloque antes del trace, así que la decisión de cada ciclo usa la survival ratio joven medida en el anterior. La población resultó bimodal a lo largo de tres órdenes de magnitud:

| familia de workloads | copying minors | survival ratio joven |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0,999 – 1,000 |
| churn, churn_alloc, push_cls | 105 | 0,000 – 0,004 |
| push_num, cycles | 16–18 | 0,000 |
| tree, tree_wide, churn_read | 0 | *no se ejecuta ningún copying minor* |

Un ciclo mal predicho retiene como máximo unos puntos porcentuales de una nursery, un ciclo de promoción sigue trazando con frecuencia suficiente para medirse y un cap continuo sobre bytes muertos promocionados limita el estado estable.

Conviene decirlo sin rodeos: **la historia de «un solo mecanismo» suele ser falsa y el perfil se mueve bajo tus pies.** Fracciones de pausa actuales, medidas en el mismo commit que la clasificación final:

| programa | wall | pausa GC | fracción de pausa | ciclos |
|---|--:|--:|--:|--:|
| retain | 159,5 ms | 52,0 ms | 33 % | 5 |
| retain1 | 71,4 ms | 38,7 ms | 54 % | 3 |
| retain_wide | 206,2 ms | 75,4 ms | 37 % | 8 |
| shapes | 64,8 ms | 4,6 ms | **7 %** | 1 |
| asyncpipe | 127 ms | 0 ms | **0 %** | 0 |

Dos de ellas eran 93 % y 62 % una semana antes; el trabajo de esta sección las mató. \`shapes\` al 7 % ya no es un benchmark de GC: antes del bug de \`8 tenía 94 ms de GC dentro de 139 ms, y lo clasificamos como «GC de alta supervivencia» por esa proporción. Las palancas de GC ya no lo moverán. Una proporción uniforme entre benchmarks era coincidencia aritmética, no una causa común.

### 7b. «Cero ciclos» no significa «sin coste de GC»: un contador que leímos como conclusión

La fila \`asyncpipe\` dice 0 ms de pausa en 0 ciclos y la describimos internamente como «programa de mutator puro; toda palanca de GC es irrelevante». Una ronda de profiling informada con esa premisa la refutó.

\`asyncpipe\` nunca imprime una línea \`[gc]\`, pero **alrededor del 33 % de su perfil de hojas es maquinaria del recolector**: write barriers, side tables de layout por objeto y rooting con \`RuntimeHandleScope\`. Desactivar los polls móviles de back-edge mide **−14,1 % mientras el programa sigue ejecutando cero ciclos**. Un mark/sweep incremental old-gen avanza en esos polls sin completar nunca un ciclo, por lo que no informa ninguno. Fue la mayor palanca de la ronda, y nuestra premisa apartó al profiler de ella. (\`PERRY_WRITE_BARRIERS=0\` da +0,9 %, así que las barreras de codegen quedan absueltas; no el drive incremental.)

> **Un contador de ciclos mide recolecciones, no el coste del recolector.**

Barreras, mantenimiento de side tables, rooting y slices incrementales son costes del lado mutator, invisibles estructuralmente en una traza por ciclo. \`0 cycles\` parece una conclusión y solo observa un mecanismo.

La trampa relacionada: \`asyncpipe_big.ts\` **no es** una versión escalada válida. A 120 batches ejecuta cero ciclos, a 240 dos copying minors y a 1200 domina el GC. Escalar para superar el ruido temporal produjo silenciosamente otro benchmark, la misma forma que las variantes «realistas» vacías de \`9; solo se detectó porque alguien comprobó que la propiedad estudiada sobrevivía al escalado.

### 8. Dieciséis bytes por encima de una línea

El mejor bug individual de la campaña. \`shapes\` gastaba 94 ms de una ejecución de 139 ms en dos minor collections, informando survival ratios jóvenes de 739‰ y 925‰ aunque su conjunto vivo real rondaba 3200 objetos.

\`arena_alloc_gc\` crea cualquier cosa mayor que \`LARGE_OBJECT_THRESHOLD_BYTES\` —16 KB— directamente en old-gen y la marca \`TENURED\`. El backing store de un \`Node2D[]\` de 2000 elementos ocupa 16.400 bytes. **Dieciséis bytes por encima.**

Por eso el array de cada ronda quedaba vivo permanentemente —un minor nunca barre old-gen—, la write barrier registraba fielmente una arista viejo→joven en cada uno de sus 2000 stores y el scan del remembered set de cada minor siguiente remarcaba los 2000 como vivos: 94.000 y luego 118.006 slots remarcados.

La solución es interesante porque «subir el umbral» era incorrecto. Cruzarlo intercambia *coste de copia* por *coste de retención*. Para un objeto sin punteros ambas cantidades están limitadas por su tamaño, así que se mantienen 16 KB. En un objeto con punteros la retención es transitiva e ilimitada; arrays, objetos y closures reciben 128 KB —\`kMaxRegularHeapObjectSize\` de V8 traza la misma línea por la misma razón—. La selección usa el flag existente \`pointer_free\`, no una lista de tipos; un tipo desconocido conserva el valor conservador.

\`shapes\` bajó de 0,139 s a 0,061 s en esa ronda —0,058 s y 1,39× *más rápido* que Node en el cierre de la Parte 4— y el RSS máximo de 71,4 MB a 32,3 MB. Los demás 18 programas se movieron dentro de ±1,3 %.

### 9. Medir resultó más difícil que arreglar

Lista parcial de cosas que produjeron una conclusión equivocada con plena confianza:

- **Hicimos benchmarks contra un \`main\` roto.** Durante días los programas intensivos en asignaciones eran unas 20× más lentos —la sorpresa #6—, de modo que todo A/B era inútil. La firma era independiente de carga y decisiva: 105 → 1304 recolecciones. Nadie la miró porque los tiempos eran solo *malos*, no absurdos.
- **El relink auto-optimize reconstruye runtime con \`--no-default-features\`**, eliminando silenciosamente \`diagnostics\`. \`PERRY_GC_TRACE\` no imprime nada y el recuento parece **0**. Una investigación concluyó «cero recolecciones» para tres brazos antes de notarlo.
- **Una baseline ratchet fijada en otro host y treinta versiones atrás** informó 29 «regresiones» que eran deriva. Siempre A/B de ambos brazos consecutivamente en una máquina.
- **Una mejora de pretenuring de 108 MB → 0 era un confound**: el brazo base precedía a otro cambio. El mecanismo era correcto, pero el objetivo no —la cohorte movida era un árbol de parseo asignado por runtime, no literales visibles para codegen— y el techo era aproximadamente 1 MB.
- **Cronometramos durante semanas un programa que se estrellaba.** El binario de un competidor imprime la respuesta correcta de \`deeplist\` y luego termina con −11 (SIGSEGV) en un drop recursivo de refcounts. Registramos esa columna como derrota. Ahora todo harness guarda exit codes por celda.
- **\`grep -c\` sale con 1 cuando hay cero coincidencias**, truncando cadenas \`&&\` en scripts de benchmark. También una pipe \`PERRY_GC_TRACE\` que recibe SIGPIPE y sale con 141.

Las reglas supervivientes: cita el contador del censo, no el reloj —es independiente de la carga—; compara los *binarios* antes que los tiempos; afirma que la comparación comparó algo; y comprueba que el brazo supuestamente probado estuvo vivo.

---

## Parte 3 — Los dos caminos largos

### Statepoints: el camino elegido, tras cuatro meses y tres habilitadores

\`gc.statepoint\` de LLVM fue desde el primer prototipo el mecanismo obviamente superior en corrección. Proporciona **semántica de relocation que el optimizador debe respetar**, mientras un shadow stack solo es correcto si el optimizador no hace nada inteligente con un valor que olvidaste derramar. Lo interesante es todo lo que ocurrió entre «obviamente mejor» y «distribuido por defecto», porque ningún retraso fue por rendimiento.

**Lo bloquearon cosas que no eran el GC.** Las excepciones bajaban a \`setjmp\`/\`longjmp\`, y un \`longjmp\` puede saltar *más allá* de un \`gc.relocate\`, de modo que el puntero reubicado nunca se escribe. Con RS4GC es peor: \`mem2reg\` no promociona las allocas volatile necesarias para la corrección de setjmp, así que las raíces de regiones \`try\` nunca entran en SSA ni se reubican. \`gc.statepoint\` tiene una forma invoke precisamente para esto. El camino pasó por borrar todo el lowering setjmp de excepciones de Perry y sustituirlo por invoke/landingpad (#7302/#7305), y por llevar LLVM dentro del proceso (#7301) para controlar la pipeline de pases. Ninguno era un ticket de GC.

**El compromiso tentador era la trampa.** «Conservar shadow stack para funciones con \`try\`» habría cimentado dos mecanismos de raíces para siempre. También se propuso «borrar shadow stack y conservar statepoints», que resultó no ser *expresable*: los statepoints son un lowering alternativo del análisis del conjunto de raíces del shadow stack, no un mecanismo independiente. Separar el predicado (#7340) hizo posibles el default por target y una futura eliminación. Antes, \`PERRY_SHADOW_STACK=0\` con statepoints producía un binario **sin raíces precisas**, sin sección \`__perry_gcmap\`, con salida correcta y sin forma de distinguirlo de un build bueno hasta que una recolección liberaba algo vivo.

**Uno de los dos backends tenía que morir.** Mantuvimos un puente de statepoints escrito a mano junto a RS4GC. Nunca fueron pares: el puente no podía enraizar un \`invoke\` y rechazaba funciones con \`try\`; además era el fallback silencioso de RS4GC, justo la configuración no probada que evita la política de eliminar knobs. Antes de borrarlo medimos **1574 funciones entre una app Drizzle real y las probes ratchet: todas bajaron como RS4GC, ninguna cayó al fallback.** Desaparecieron el puente, su análisis de liveness sobre CFG, parser de llamadas, emisor, enum \`PreciseRootBackend\` y knob \`PERRY_STATEPOINTS\`. Ahora un bail es un fallo duro que nombra la función, no un downgrade.

**Y el default se distribuyó sin cobertura.** Las raíces nativas llevaban meses por defecto en targets recorribles mientras **nueve mecánicas de lowering de raíces no tenían ninguna aserción contra el lowering real de Perry**. Tres tests que parecían cobertura no medían nada: afirmaban que \`js_shadow_slot_bind\` estaba *ausente*, algo cierto para cualquier programa bajo el default nativo, con raíces o sin ellas. Otra vez el hazard 4, en el subsistema encargado de no perder raíces en silencio. #7653 lo arregló desde tres perspectivas —IR pre-\`opt\`, bundles \`"gc-live"\` post-RS4GC y blob \`__perry_gcmap\` decodificado— porque cada una ve lo que la siguiente no. El checker estático tenía el problema inverso: se anclaba en \`@js_shadow_slot_bind\`, por lo que su corpus usaba \`PERRY_RS4GC=0\`. Comprobaba un lowering que ya no distribuíamos hasta que #7663 le enseñó statepoints.

El experimento dejó una ley de diseño pagada con un resultado negativo: **los metadatos de raíces sin semántica de relocation son incorrectos bajo un compilador optimizador.** Un esquema compacto por función generó mapas 10–13× menores y corrompió determinísticamente un bucle churn de diez líneas. El mapa no estaba mal; el mutator leía from-space mediante valores SSA derivados del heap y obsoletos que solo una relocation puede corregir. Las barreras restringen ordering de memoria, no flujo de datos.

### Unboxing: en curso y ahora el acontecimiento principal

El otro camino largo es el de la Parte 1: hacer canónica la representación nativa sin caja y relegar NaN-boxing al fallback polimórfico. Están integradas las fases 1 —locales escalares—, 2 —ABI especializada—, 3a/3b —strings y locales puntero \`Ptr<Shape>\`— y 4a/4b —heap tipado: arrays numéricos y después la contabilidad innecesaria del layout boxed—.

Hay dos cosas que contar con honestidad.

**Una subfase se evaluó y rechazó, por una razón que halaga al NaN-boxing.** Los *campos de objeto* sin caja, titular original de 4b, se descartaron tras la exploración. Un slot \`number\` ya guarda bits IEEE crudos, porque NaN-boxing solo reserva \`0x7FF9..=0x7FFF\`; \`raw_f64_mask\` es un *bit de prueba*, no un cambio de almacenamiento, y el guard de lectura ya había desaparecido. Handles crudos de string romperían la optimización de strings pequeños al materializarlos en heap sin motivo. Slots \`i1\`/\`i32\` crudos requerirían una tercera máscara y una consulta de layout en unas 25 lecturas directas, incluidas \`JSON.stringify\`, \`util.inspect\` y serde de \`v8\`: caminos calientes, no raros. Lo distribuido fue elisión: un store de campo en un receptor probado retira su nota de layout si el valor no puede ser puntero por construcción, y su addref de string si no puede ser string de heap.

**El GC entregó el siguiente objetivo.** La medición final de la Parte 4 dice que el recolector ya no limita nuestro cluster más difícil: lo hace el mutator, concretamente que **un literal de objeto de dos campos ocupa 72 bytes**. Es un problema de representación exactamente en el sentido del RFC, y allí continúa «objetos reales».

### Caminos no tomados

**Concurrencia.** La directiva del propietario:

> «No quiero perseguir paralelismo/concurrencia por sí mismos. Deben ser un último recurso para trabajo que tenga que hacerse, pero no a costa del hot path.»

La restricción *decide* el diseño. Las tres familias difieren en dónde cobran al mutator: stop-the-world paralelo no le cobra nada —los hilos GC solo viven dentro de la pausa—; marking concurrente cobra una store barrier por cada escritura de puntero; compaction concurrente cobra una **load barrier** por cada lectura. Las lecturas superan ampliamente a las escrituras, así que la última es el no más claro. STW paralelo es el único diseño admisible y queda tercero tras eliminar trabajo por objeto innecesario y pretenurear la cohorte inmortal. Paralelizar 2,1 millones de visitas que no deberían existir es usar cuatro cores para hacer más rápido lo equivocado.

La medición coincidió aún con más fuerza. Tras \`7, las visitas del peor caso de promoción se dividían entre trabajo eliminado y **9,6 ms de un programa de 159 ms**. Ya no hay suficiente tiempo de recolector para paralelizar: duplicar su velocidad daría un 3 % al programa. GC paralelo no es un plan aplazado, sino una no-palanca medida.

También hay un argumento de corrección más serio: hoy «un bug perfectamente reproducible significa tabla, no registro» es una heurística útil. Un recolector paralelo la destruye y convierte 79 escáneres de raíces y cada cache \`thread_local!\` en posibles data races.

**Desfragmentación de páginas viejas: activada por defecto y revertida el mismo día.** Es el ejemplo más reciente y limpio de la regla 1.

Compactar páginas viejas parcialmente vivas estaba desactivado desde un bug de julio de 2026: una referencia no-heap obsoleta a un objeto viejo movido se corrompía 6/6 veces. Reactivarlo era un proyecto de *contrato de reescritura*, no un cambio de variable. El issue exigía enumerar todo camino de metadata/IC/cache capaz de conservar una dirección vieja móvil y **«reactivar defrag solo cuando el reproductor y un corpus de estrés a escala de dependencias estén limpios».**

El trabajo de contrato llegó y supera auditorías: la allowlist de dominancia sigue vacía, así que unos 40 hits antes exentos se arreglaron de verdad; la política de holders se *endureció* para que \`open_gap\` y \`unverified\` fallen; los dos caches cuya seguridad dependía de «only old-gen defrag can move them» se arreglaron. Incluso se respetó un tripwire: la exención eliminada nombraba exactamente el trigger en \`becomes_real_when\`.

El **cambio de default** viajó con ello sin evidencia, porque nuestra suite no puede producirla. La selección exige \`dead_bytes >= live_bytes\` en una página vieja: promover y luego morir a escala. La familia \`retain\` sobrevive al 999–1000‰ y \`churn\` casi no promociona; **ningún benchmark propio produce una página candidata.** La suite no ofrece señal de beneficio ni regresión, pero hereda toda la superficie de reescritura de direcciones viejas. Todas las puertas de GC seguían además en cola al hacer merge.

Conservamos el trabajo de corrección y revertimos el default a opt-in hasta tener un workload de fragmentación que lo ejercite. Entonces se eliminará el brazo perdedor. Nueva regla:

> **Una función que tu suite no puede activar tampoco puede defenderla.** Distribúyela desactivada hasta que exista un workload, o acepta que ambos brazos están sin probar.

**Pretenuring.** Construido dos veces, medido, refutado y aparcado con condición escrita de reapertura. Lo arquitectónicamente correcto —crear objetos longevos en old-gen— perdió contra lo emergentemente suficiente —una semilla promote-on-first-copy limita cualquier cohorte a un salto—. Bajo toda carga construible los brazos fueron indistinguibles. Metalección: **prueba primero la forma que discrimina, luego construye la invariante.**

---

## Parte 4 — Cómo va

Barrido final, 12 de agosto de 2026, M1 mini fijado y tranquilo, mejor de 5, exit codes comprobados y salida verificada byte a byte contra \`node --experimental-strip-types\` antes de medir. 19 benchmarks con forma de GC contra Node 26.5.1 y un competidor AOT con conteo de referencias.

**Perry gana a Node en 9 de 19** —eran 3 al empezar—, **al compilador con refcounts en 14 de 19** y queda **dentro de 1,3× de Node en 15 de 19.**

| bench | perry | node | P/node | Δ esta ronda |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

Quedan dos clusters **separados**, y tratarlos como un mecanismo es un error ya cometido:

1. **Frente a Node: dispatch y mutator, casi no GC.** \`iso_miss\`, \`interp\`, \`pipeline\`, \`asyncpipe\`. Sobre todo dispatch polimórfico de propiedades, inline caches y selección de representación, otra campaña. Pero lee la corrección siguiente antes de interpretar el 0 % de \`asyncpipe\` como «aquí no hay GC».
2. **Frente al compilador con refcounts: la familia \`retain\`.** \`retain1\` 1,80×, \`retain_wide1\` 1,67×, \`retain_wide\` 1,65×. Todos ya ganan a Node. Nada muere, justo donde esperábamos que un trazador rindiera peor; la expectativa resulta equivocada de forma interesante.

El hallazgo final replantea la campaña: **en el segundo cluster el recolector ya no es la restricción; lo es el mutator.** Restando *toda* la pausa GC, \`retain_wide\` —130,8 ms de mutator puro— y \`shapes\` —60,2 ms— aún pierden. \`retain\` necesitaría GC exactamente cero. El coste real es que **un objeto de dos campos ocupa 72 bytes**: escribe **216 MB para guardar 48 MB de números**, amplificación 4,5×. La ventaja del competidor no era refcounting, sino compacidad. Ahora es un problema de representación (#7916), no de recolector: unbox-by-default aplicado al layout de objetos.

Hay un defecto simétrico en el otro cluster: \`asyncpipe\` recolecta a 1200–1650 ns por objeto, incluida una **minor collection de 122 ms que manejó cero objetos**, más larga que el programa. Coste independiente del número de objetos es overhead fijo y es la última pieza del recolector visible en el critical path (#7915).

Resultado negativo obvio pero importante: **no reduzcas la primera nursery.** El ciclo 0 representa 58–81 % de la pausa de \`retain\`; limitarlo parece gratis y a 2 MB baja de 52 a 31 ms. Pero \`asyncpipe\` pasa de 0 a 4 recolecciones, 385 ms en un programa de 127 ms, y la promoción anterior vuelve a temporizar old-gen hacia full mark-sweeps extra (\`retain_wide1\` +182 %).

Para dimensionar el inicio: la pipeline JSON pasó de 60,4 s a 3,86 s. La familia \`retain\` mejoró 36–46 % en una sola ronda. El recolector conserva un kill switch a full mark-sweep (\`PERRY_GEN_GC=0\`) que seguimos ejercitando, porque el día que no podamos bisectar contra él dejaremos de confiar en estos números.

---

## Las reglas con las que trabajamos ahora

La mayoría se generaliza más allá del GC:

1. **Un modo que aún existe es una decisión aún no tomada.** Elimina la rama perdedora o conserva un brazo que la ejercite. Deja una lápida donde la borraste.
2. **Una puerta debe afirmar que su sujeto estuvo vivo**, no solo que nada lanzó. «Verde porque no ejecutó nada» es peor que rojo.
3. **Nunca marques un feedback loop con una cantidad que no puede mover.** Tres livelocks, una forma.
4. **Ninguna banda constante debe marcar un proceso O(vivo).** Una constante mayor solo mueve el precipicio.
5. **Cuando una clase de bug no deja pruebas, deja de investigar y construye el instrumento.** Pruébalo con sabotaje, incluido el control no instrumentado que demuestra la invisibilidad.
6. **Un comentario no es un cambio.** Fija defaults con tests, incluido el valor no reconocido, y fija el acuerdo entre componentes.
7. **Mide ambos brazos en un host, desde el mismo árbol, y comprueba el exit code.**
8. **Prueba la forma discriminante antes de construir la invariante.**
9. **Rechaza el híbrido permanente.** «Conservar el mecanismo antiguo para casos difíciles» convierte una migración en dos mecanismos eternos. Haz funcionar el caso difícil o no migres.

El recolector no está terminado. Por primera vez es *legible*: cada control gobierna algo, cada puerta puede fallar, cada default está fijado por un test y cada número publicado se midió en una máquina tranquila verificando primero la salida. Esa legibilidad costó más trabajo que el propio recolector y es la única razón por la que se movieron los números del último mes.
`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
