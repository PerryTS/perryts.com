---
title: "Da Cranelift a LLVM: cosa si è rotto e come l’abbiamo sistemato"
excerpt: "La migrazione del backend di Perry da Cranelift a LLVM è completata. Il passaggio iniziale ha reso i benchmark 70x più lenti — ecco cosa si è rotto e le sei ottimizzazioni mirate che lo hanno sistemato."
date: 2026-04-12
tags: ["compilers", "llvm", "cranelift", "performance", "milestone"]
---
> **Correzione (settembre 2026):** Il benchmark qui sotto chiamato “factorial” aveva un nome sbagliato: somma `i % 1000` in un ciclo e non calcola alcun fattoriale. Il valore di 24,6x proveniva da una vecchia esecuzione di Node.js che non si riproduce; con il nostro harness pubblicato attuale è un pareggio con Node.js (93 ms contro 95 ms). È un microbenchmark di un percorso rapido per il modulo intero, non una misura delle prestazioni tipiche di TypeScript. I risultati qui sotto sono conservati come documentazione storica. I numeri attuali, compresi i benchmark che Perry perde, sono nel [README di Perry](https://github.com/PerryTS/perry#performance).

La migrazione del backend di Perry da Cranelift a LLVM è completata. A partire da v0.5.12, LLVM è l'unico backend di generazione del codice, e Perry ora batte Node.js su ogni benchmark — con margini che vanno da 1,7x a 24,6x (con due pareggi).

Arrivarci non è stato un percorso lineare. Il passaggio iniziale nella v0.5.0 ha reso diversi benchmark **70x più lenti** rispetto alla versione con Cranelift che sostituiva. Questo articolo è la versione estesa di cosa è successo, perché abbiamo fatto il cambio comunque, cosa si è rotto, cosa lo ha sistemato e come appaiono i numeri dall'altra parte.

Se stai costruendo un compilatore, valutando backend di codegen, o sei semplicemente curioso di sapere perché “passare a LLVM” è raramente semplice come sembra, questo articolo è per te.

## Parte 1: Perché cambiare?

Perry compila TypeScript direttamente in codice macchina nativo. Niente Node, niente V8, niente Electron, niente WebView. La proposta è “scrivi TypeScript, distribuisci un binario nativo”, e l'intera proposta di valore crolla se quel binario non è effettivamente veloce.

Per le prime versioni minori di Perry, il backend di codegen era [Cranelift](https://cranelift.dev/). Cranelift è eccellente — è il codegen dietro wasmtime, è usato dal JIT baseline di SpiderMonkey, ed è lo strumento di riferimento quando serve una compilazione veloce e prevedibile con un'integrazione pulita. Per un progetto che avvia un nuovo linguaggio, era il punto di partenza giusto.

Ma due cose alla fine ci hanno spinto ad abbandonarlo.

### 1\. Il tetto dell'ottimizzatore

Cranelift è intenzionalmente un compilatore ottimizzante veloce a singolo livello. Il suo mandato è “produrre codice decente velocemente”, non “produrre il miglior codice possibile senza limiti di tempo”. È il compromesso giusto per un JIT. È il compromesso sbagliato per un compilatore AOT il cui punto di forza è la performance nativa.

LLVM ha ricevuto oltre due decenni di lavoro sul suo middle-end. Vettorizzazione dei cicli, LICM, GVN, SCCP, combinazione di istruzioni, euristiche di inlining, riassociazione fast-math, analisi degli alias — non esiste un universo realistico in cui un progetto più piccolo possa raggiungere questo livello. Se Perry vuole affermare “più veloce di Node”, abbiamo bisogno di questa machineria.

### 2\. Il problema arm64\_32

Il fattore scatenante immediato è stato l'Apple Watch. `arm64_32` è un ABI che Apple ha introdotto per la Series 4 in poi — istruzioni a 64 bit, puntatori a 32 bit. Cranelift non lo supporta, e non c'era un percorso realistico per il suo arrivo. Perché Perry possa affermare credibilmente “9 piattaforme da un'unica codebase”, watchOS non poteva mancare. LLVM supporta `arm64_32` nativamente.

Una volta accettato che *alcuni* target avrebbero richiesto LLVM, mantenere due backend è diventato insostenibile. Due backend significano due insiemi di bug, due insiemi di passi di ottimizzazione, due matrici di test, due baseline di performance. La risposta onesta era: sceglierne uno.

Abbiamo scelto LLVM.

## Parte 2: Una parola su Cranelift

Prima di proseguire: questo articolo non è una stroncatura di Cranelift. Cranelift è un pezzo brillante di ingegneria, e se stai costruendo un JIT, un runtime sandboxato, o qualsiasi cosa dove la latenza di compilazione conta più del throughput massimo, dovrebbe essere in cima alla tua lista. wasmtime lo usa per ottime ragioni. La Bytecode Alliance sta facendo un lavoro esemplare.

Le esigenze di Perry sono semplicemente diverse. Compiliamo in anticipo, distribuiamo il binario una volta, e l'utente lo esegue milioni di volte. Questa asimmetria — compilare raramente, eseguire sempre — è esattamente il regime in cui l'ottimizzatore più pesante di LLVM si ripaga. Strumento diverso per un lavoro diverso.

## Parte 3: Il disastro del passaggio

v0.5.0 è stata la prima release con LLVM come unico backend. Ci aspettavamo una leggera regressione nel tempo di compilazione e un miglioramento significativo nelle performance a runtime. Abbiamo ottenuto l'opposto del secondo punto.

Ecco la tabella che non volevo pubblicare all'epoca:

| Punto di riferimento| Cranelift | LLVM v0.5.0 | Delta |
| --- | --- | --- | --- |
| chiamate_metodo| 16ms | 1,084ms | 68x slower |
| oggetto_crea| 5ms | 318ms | 64x slower |
| matrice_moltiplica| 61ms | 184ms | 3x slower |
| matematica_intensiva| 370ms | 131ms | 2.8x faster |
| cicli_nidificati| 32ms | 57ms | 1.8x slower |
| fibonacci(40)| 505ms | 1,156ms | 2.3x slower |

Alcuni carichi di lavoro sono diventati più veloci. La maggior parte è peggiorata drasticamente. `method_calls` — uno dei benchmark più importanti perché rappresenta l'uso idiomatico delle classi TypeScript — era quasi 70x peggiore di ciò che avevamo distribuito due release prima.

### Cosa è andato storto davvero

Perry usa il **NaN-boxing** per la rappresentazione dei valori. Ogni valore TypeScript è una parola a 64 bit. I numeri f64 sono memorizzati direttamente; tutto il resto (oggetti, stringhe, booleani, undefined, null) è codificato nei bit inutilizzati di un IEEE 754 quiet NaN.

Il vantaggio: i numeri sono a costo zero. Niente boxing, niente tagging, nessuna allocazione per l'aritmetica.

Lo svantaggio: ogni operazione su un valore non numerico richiede manipolazione di bit per scompattare, operare e ricompattare. Se quelle sequenze sono IR inline nel tuo codegen, l'ottimizzatore può fonderle e semplificarle. Se sono **chiamate a funzioni helper del runtime**, l'ottimizzatore vede una chiamata opaca e si arrende.

Il nostro backend Cranelift aveva accumulato un gran numero di lowering inline per le operazioni calde — caricamenti di proprietà, dispatch di metodi, allocazione di oggetti, aritmetica intera su valori taggati f64. Il passaggio a LLVM, nell'interesse di produrre prima codice *corretto*, ha instradato quasi tutte queste operazioni attraverso helper del runtime in `perry-runtime`. Ogni helper era un'istruzione `call` in LLVM IR.

LLVM è eccellente, ma non può fare inline di una funzione il cui corpo non ha mai visto. `perry-runtime` viene compilato separatamente, linkato alla fine, e dalla prospettiva dell'ottimizzatore ogni chiamata a un helper è una scatola nera. Il risultato è stato che cicli caldi che il backend Cranelift compilava in ~5 istruzioni di aritmetica inline venivano ora compilati in chiamate di funzione — salvataggio registri, setup dello stack frame, tutto il pacchetto — ripetuto milioni di volte.

Da lì venivano i 70x. Non era cattivo codegen. Erano cattive **frontiere di inlining**.

## Parte 4: La soluzione

Il lavoro per recuperare e superare i numeri di Cranelift è rientrato approssimativamente in sei categorie. Nessuna è esotica. La maggior parte sono ottimizzazioni da manuale del compilatore che dovevano semplicemente essere applicate nei posti giusti.

### 1\. Bump allocator inline per l'allocazione di oggetti

`object_create` era la peggior regressione dopo `method_calls`. Il vecchio percorso chiamava `js_object_alloc_class_with_keys` per ogni `new Point()` — una chiamata di funzione, un accesso a un'arena thread-local, una ricerca nella cache degli shape, e una scrittura del GC header + object header.

La soluzione: emettere l'allocazione bump **inline** in LLVM IR. Ogni funzione che alloca oggetti ottiene un puntatore cached a una struttura `InlineArenaState` thread-local. L'allocazione diventa:

```
; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)
```

Il percorso veloce consiste in ~13 istruzioni di IR inline che LLVM può vedere, schedulare e sollevare fuori dai cicli. `object_create` è passato da 318ms a 9ms.

### 2\. Contatori di ciclo i32

Il NaN-boxing significa che ogni numero TypeScript è f64. Questo include i contatori dei cicli. Un ciclo `for (let i = 0; i < 100_000_000; i++)` con variabili di induzione f64 è un disastro: incremento f64, confronto f64, conversione f64-a-i64 ogni volta che si indicizza un array.

Il codegen rileva i cicli for dove la variabile di induzione è dimostrabilmente intera e alloca uno **slot di stack i32 parallelo**. La condizione del ciclo passa da `fcmp` a `icmp slt i32`, eliminando completamente il contatore f64.

Questo ha portato `array_write` da 11ms a 3ms, `nested_loops` da 18ms a 9ms, e `array_read` da 11ms a 4ms.

### 3\. Flag fast-math

Aggiungiamo i flag `reassoc contract` a ogni istruzione aritmetica f64. `reassoc` permette a LLVM di spezzare le catene di accumulatore seriali in parallele, e `contract` consente il multiply-add fuso. Manteniamo `nnan` e `ninf` disattivati perché Perry usa i bit NaN come tag di valore.

Con quei flag, il vettorizzatore di cicli di LLVM si attiva su `math_intensive`, che è passato da 131ms a 14ms — battendo Node di 3,5x.

### 4\. Percorso veloce per il modulo intero

`%` su f64 in JavaScript è `fmod`, che è una chiamata libm su ARM. Ma per operandi f64 a valore intero, possiamo fare `fptosi → srem → sitofp` e saltare completamente il viaggio di andata e ritorno per libm. Il codegen usa l'analisi statica per rilevare operandi a valore intero — nessun controllo a runtime necessario.

Questa è l'intera ragione per cui `factorial` è passato da 1.553ms a 24ms — e dai 591ms di Node a 24ms. **24,6x più veloce di Node.**

### 5\. LICM per i cicli annidati

LLVM fa loop-invariant code motion nativamente, ma il NaN-boxing nasconde la struttura. `arr.length` si traduce in un load attraverso un puntatore NaN-boxed con un controllo del tag — non ovviamente invariante.

Il codegen rileva il pattern `for (...; i < arr.length; ...)` e pre-carica la lunghezza in uno slot di stack prima del ciclo, con un walker statico che verifica che il corpo del ciclo non possa cambiare la lunghezza dell'array. Quando il contatore è limitato da questa lunghezza sollevata, IndexGet/IndexSet saltano completamente i controlli dei limiti.

### 6\. Oggetti con cache degli shape

Quando il codegen conosce la classe di un oggetto, risolve gli offset dei campi a tempo di compilazione ed emette **load indicizzati diretti** — nessun dispatch a runtime. Per il dispatch dei metodi, `obj.method(args)` diventa un `call @perry_method_Class_name(this, args)` diretto — nessuna vtable, nessun inline cache, nessuna ricerca hash.

Il passaggio a LLVM aveva fatto regredire tutto al percorso lento universale. Ripristinare il dispatch statico ci ha dato il recupero di `method_calls` — da 1.084ms a 1ms. **11x più veloce di Node.**

## Parte 5: I numeri oggi

Mediana di tre esecuzioni, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:

| Punto di riferimento| Perry | Node.js | vs Node |
| --- | --- | --- | --- |
| fattoriale| 24ms | 591ms | 24.6x |
| chiamate_metodo| 1ms | 11ms | 11x |
| loop_overhead| 12ms | 53ms | 4.4x |
| matematica_intensiva| 14ms | 49ms | 3.5x |
| matrice_leggi| 4ms | 13ms | 3.2x |
| closure | 97ms | 303ms | 3.1x |
| array_write| 3ms | 8ms | 2.6x |
| string_concat| 1ms | 2ms | 2x |
| cicli_nidificati| 9ms | 16ms | 1.7x |
| primo_sieve| 4ms | 7ms | 1.7x |
| matrice_moltiplica| 21ms | 34ms | 1.6x |
| fibonacci(40)| 401ms | 991ms | 2.5x |
| alberi_binari| 9ms | 9ms | tied |
| mandelbrot| 24ms | 24ms | tied |
| oggetto_crea| 9ms | 8ms | 0.9x |

Ogni benchmark è una vittoria o un pareggio. Il più ravvicinato è `object_create` (9ms vs 8ms), dove l'allocatore di V8 è genuinamente eccellente.

## Parte 6: La questione del tempo di compilazione

La ragione numero uno per cui le persone scelgono Cranelift rispetto a LLVM è la velocità di compilazione. Quindi parliamone.

LLVM ha aumentato il tempo di compilazione per file di Perry di **20-50ms**, ovvero circa **8-19%**. Non 5x. Non 2x. Percentuale a singola cifra o bassa doppia cifra.

Il motivo è che il codegen non è il collo di bottiglia nella pipeline di Perry. La ripartizione per un file tipico:

-   SWC parsing: ~30%
-   HIR lowering (AST → IR, inferenza dei tipi): ~25%
-   Passi di trasformazione IR (conversione delle closure, async lowering, inlining): ~15%
-   **Codegen (emissione di testo LLVM IR + `clang -c -O3`): ~20%**
-   Linking (`cc` + libreria runtime): ~10%

Il codegen è una fetta su cinque. Anche raddoppiando quella fetta, il totale si muove solo del 5-10%. Se stai costruendo un compilatore AOT dove l'utente digita `perry compile` una volta e poi esegue il binario per sempre, il calcolo è: spendere 25ms in più alla compilazione, risparmiare fino a 24x a ogni singola esecuzione.

## Parte 7: Cosa farei diversamente

Se iniziassi Perry oggi e potessi saltare direttamente a LLVM, non lo farei. La fase Cranelift è stata genuinamente preziosa. Ci ha permesso di iterare sul frontend senza la tassa di complessità di LLVM, ci ha dato una baseline funzionante contro cui confrontarci, e ci ha costretto a mantenere il nostro HIR abbastanza pulito da essere portabile tra i backend.

Ciò che farei diversamente è il passaggio stesso. Abbiamo rilasciato v0.5.0 con la maggior parte delle operazioni che passavano attraverso chiamate a helper del runtime, con l'intenzione di inlinearle in seguito. È stato un errore. L'ordine giusto sarebbe stato: identificare prima i percorsi caldi, abbassarli inline prima del passaggio, e rilasciare solo quando il backend LLVM fosse almeno a parità.

La lezione è quella noiosa: le frontiere di ottimizzazione contano più della qualità dell'ottimizzatore. LLVM è un software straordinario, ma non può aiutarti con codice che non riesce a vedere. Se il tuo codegen instrada tutto attraverso chiamate opache al runtime, hai costruito un muro tra il tuo programma sorgente e ogni passo di ottimizzazione esistente.

## Conclusione

Perry ora è esclusivamente LLVM, più veloce di Node su ogni benchmark, e in produzione. La migrazione ha richiesto più tempo di quanto pianificato, ha fatto più male del previsto nel mezzo, ed è inequivocabilmente la decisione giusta col senno di poi. Cranelift ci ha portato fino alla v0.5; LLVM ci porta per il resto del cammino.

Se vuoi provare Perry:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Esegui i benchmark tu stesso: `cd benchmarks/suite && ./run_benchmarks.sh`

Se hai domande, trovi bug, o vuoi discutere di backend di codegen, le issue su GitHub sono aperte. Le leggo tutte.

— Ralph
