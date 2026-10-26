---
title: "Ottimizzare tutto: una settimana, 68 release e uno speedup JSON 547x"
excerpt: "Perry v0.5.13 → v0.5.80 in sette giorni. JSON.parse chiude un divario 547x con Node. mimalloc diventa l'allocatore globale. Inline cache, transizioni di shape, slot Buffer tipizzati, operazioni bitwise native in i32, scalar replacement e un event loop nativo che tiene vivi i server Fastify e WebSocket."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
L'ultimo articolo del blog è uscito con Perry alla v0.5.12. Oggi siamo alla v0.5.80. Sono **68 patch release in sette giorni**, concentrate quasi interamente su una cosa sola: trasformare ogni percorso lento rimasto in un percorso veloce.

Il passaggio a LLVM nella v0.5.0 è tornato alla parità con Cranelift entro la v0.5.12. Quella era la fine di una storia e l'inizio di un'altra. LLVM ora vede tutto. La domanda ha smesso di essere “perché questo è lento?” ed è diventata “perché questo non è già veloce?” — una domanda molto più trattabile.

Questo articolo è una panoramica della settimana. JSON ha ottenuto uno speedup di 547x. mimalloc è diventato l'allocatore globale. L'accesso alle proprietà ha guadagnato una inline cache monomorfica. I Buffer hanno ottenuto slot di puntatori tipizzati con metadati `noalias`. I server Fastify e WebSocket hanno smesso di crashare dopo un minuto. E i benchmark si sono mossi di nuovo.

## 1\. JSON: colmare un divario di 547x

Alla v0.5.29, JSON.parse di Perry su un array di 20 record era **547x più lento di Node**. Alla v0.5.46 era 1,3x. Quel numero è il più grande delta singolo della settimana, e vale la pena ripercorrerlo perché ogni altra ottimizzazione in questo articolo è una variazione sullo stesso tema: non fare lavoro che non devi fare.

Il parser originale allocava un Vec per ogni proprietà, un Vec di chiavi per ogni oggetto, e un thread-local protetto da RefCell per la cache delle chiavi. Copiava ogni stringa. Ri-hashava ogni nome di campo. Costruiva uno shape di oggetto nuovo di zecca per ogni record, anche quando tutti e 20 i record avevano esattamente gli stessi campi nello stesso ordine. Il parser di Node gestisce questo notando il pattern e condividendo un singolo shape fra tutti i record. Quello di Perry no.

La soluzione è arrivata in quattro passi:

1.  **Interning delle chiavi tramite una `PARSE_KEY_CACHE` thread-local** (v0.5.45). Il primo record alloca N stringhe di chiavi; i record dal 2 al 20 allocano zero. Le chiavi ripetute si risolvono nello stesso puntatore, il che le rende utilizzabili come chiavi di lookup della shape-cache senza uno strcmp.
2.  **Condivisione degli shape tramite la transition cache** (v0.5.45). Gli oggetti costruiti da `js_object_set_field_by_name` percorrono lo stesso grafo di transizioni. Quando lo schema si ripete, il puntatore `keys_array` è condiviso, ed è esattamente ciò di cui una inline cache polimorfica ha bisogno per colpire il bersaglio.
3.  **Parsing di stringhe zero-copy + costruzione incrementale dell'oggetto** (v0.5.46). `parse_string_bytes` ora restituisce `ParsedStr::Borrowed(&[u8])` quando non ci sono escape con backslash — che è il caso comune per ogni chiave e la maggior parte dei valori. `parse_object` scrive i campi direttamente invece di raccoglierli prima in un Vec.
4.  **Soppressione del GC durante il parse** (v0.5.60, chiude #59). Il parsing di un array grande alloca migliaia di piccoli oggetti in un ciclo stretto. Ognuno di essi stuzzicava il controllo della soglia del GC. Impostare un flag “parsing in corso” rimanda la collection fino al termine del parse — stessa dimensione effettiva dell'heap, molti meno branch di bookkeeping.

Poi la stringify. JSON.stringify su array omogenei — stesso shape, milioni di volte — faceva un'iterazione completa delle proprietà per ogni oggetto, che per un array shape-stabile è puro spreco. Una correzione in cinque passi ha chiuso anche la maggior parte di quel divario:

-   v0.5.62: fast path itoa / ryu per i numeri, controllo dei riferimenti circolari basato sulla profondità invece di un HashSet.
-   v0.5.63: guard `toJSON` + cache persistente delle chiavi + dispatch inline (i tre costi per chiamata che sommati facevano la differenza).
-   v0.5.65: template di stringify per shape omogenei + fast path per escape ASCII. Quando ogni elemento ha lo stesso shape, l'impalcatura di chiavi/due punti/virgole viene precalcolata una sola volta.
-   v0.5.70, v0.5.72, v0.5.75: cache dello shape-template per chiamata, chiusura del divario GC residuo del parse, eliminazione dell'overhead fisso per chiamata rimanente.
-   v0.5.79: il percorso per valori piccoli. Numeri, booleani e stringhe corte passano per un percorso diretto che non configura nessuna della machineria degli oggetti.

Il risultato cumulativo: una pipeline JSON che era **547x più lenta di Node** all'inizio della settimana è ora circa **1,3x più lenta sul parse e competitiva sulla stringify**, su workload realistici.

## 2\. La storia dell'allocatore

Perry alloca parecchio. Ogni literal di oggetto, ogni literal di array, ogni concatenazione di stringhe, ogni closure. L'allocatore è caldo, e per la maggior parte della v0.5 è stato l'allocatore di sistema predefinito di Rust più un'arena thread-local per i valori di breve durata.

La v0.5.67 ha sostituito l'allocatore globale con **mimalloc**. È una modifica di una sola riga in Cargo.toml che ripaga immediatamente su qualsiasi workload che fa molte piccole allocazioni — che è ogni programma TypeScript. La v0.5.66 l'ha preceduta consolidando tutto lo stato thread-local di `gc_malloc` in un singolo accesso TLS per chiamata, in modo che il percorso verso mimalloc fosse il più economico possibile.

La v0.5.68 ha spinto oltre con le **stringhe allocate in arena**. Le stringhe di breve durata (risultati intermedi di concat, pezzi di `split()`, scratch del parser) saltano completamente l'allocatore globale e atterrano in un'arena bump per-thread che si resetta ai confini naturali. Per il parsing JSON, questo da solo è stato un guadagno percentuale a due cifre.

E le due ottimizzazioni che non allocano affatto:

-   **Scalar replacement di oggetti non-escaping** (v0.5.17, poi object literal nella v0.5.76). Se un oggetto non lascia mai la sua funzione contenitore, non ha bisogno di esistere. I suoi campi diventano semplici locali. LLVM gestisce questo out-of-the-box, una volta che smetti di nascondere l'oggetto dietro una chiamata opaca all'allocatore.
-   **Scalar replacement di array non-escaping** (v0.5.73). Stessa idea — se l'array non esce dalla funzione, i suoi elementi diventano valori SSA e l'intera allocazione sparisce.

Per il percorso degli array literal in particolare, la v0.5.69 ha aggiunto un **fast path di dimensione esatta** (salta la machineria di crescita della capacità quando la dimensione è nota a tempo di compilazione), e la v0.5.74 ha inlineato l'IR del bump allocator per piccoli array literal in modo che LLVM possa vedere l'allocazione, piegarla, sollevarla o eliminarla. I benchmark array-heavy si sono mossi di un ulteriore passo.

A chiudere il cerchio, la v0.5.25 ha corretto un bug più silenzioso: `gc_malloc` non innescava la collection sul proprio percorso, quindi i workload malloc-heavy potevano far crescere l'heap senza limiti prima che qualcosa lo controllasse. La v0.5.61 ha aggiunto un dimensionamento adattivo dello step alla soglia, che è quello che vuoi davvero: controllare a basso costo quando l'heap è piccolo, meno spesso quando è grande.

## 3\. L'accesso alle proprietà ha guadagnato una vera inline cache

Ogni motore JavaScript moderno ha una inline cache polimorfica (PIC) sull'accesso alle proprietà. Per la maggior parte della serie v0.5 di Perry, PropertyGet passava per un lookup nella shape-table con un hash thread-local. Va bene per codice freddo. Non va bene quando il 95% delle letture di proprietà in un dato call site vedono lo stesso shape, che è quasi sempre il caso.

La v0.5.44 ha introdotto una **inline cache monomorfica** per `PropertyGet`. Ogni call site di PropertyGet ottiene una entry della cache per-callsite: un puntatore allo shape atteso e un offset del campo. Il percorso hit è un singolo compare più un load indicizzato. Il percorso miss cade in un helper lento che aggiorna la cache.

```
; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont
```

La v0.5.51 ha aggiunto una **shape-transition cache basata su content-hash** per le scritture dinamiche di proprietà. Due oggetti che crescono con gli stessi campi nello stesso ordine hashano alla stessa transizione, quindi finiscono per condividere lo stesso shape — e questo significa che il lato read della PIC effettivamente colpisce.

La v0.5.55 ha rimosso l'ultimo accesso TLS dalla transition cache. La v0.5.46 ha corretto un bug del miss-handler della PIC dove oggetti con >8 campi leggevano oltre gli slot inline in memoria non inizializzata (chiude #55). La v0.5.78 ha aggiunto un guard per impedire alla PIC di PropertyGet di indicizzare in receiver non-puntatore come numeri grezzi — cosa che poteva accadere con una raffinazione dei tipi troppo ottimistica ed era uno degli ultimi problemi di stabilità nella IC.

Effetto netto: il codice con molte proprietà — che in pratica significa la maggior parte del TypeScript — è circa 2–3x più veloce di quanto fosse una settimana fa, solo grazie alla IC.

## 4\. Interi, operazioni bitwise e il pattern `| 0`

Il NaN-boxing rende ogni numero un f64. I programmatori TypeScript scrivono `x | 0` per forzare la semantica intera. V8 ha passato quindici anni a rendere questo economico. Perry ha passato questa settimana a recuperare.

Lo stack dei cambiamenti, in ordine:

-   **v0.5.48**: `sdiv` per `(int / const) | 0`. LLVM piega a `smulh + asr`, che è ~2 cicli contro ~10 per `fdiv`.
-   **v0.5.48**: `@llvm.assume` sui bound di Uint8ArrayGet. Sostituisce il diamante branch+phi del bounds-check con un singolo basic block su cui il vettorizzatore può ragionare.
-   **v0.5.49**: correzione delle operazioni bitwise con NaN/Infinity per produrre 0 secondo la spec ToInt32. Prima la correttezza.
-   **v0.5.50**: `toint32_fast` che salta il guard NaN/Inf da 5 istruzioni quando il valore è noto come finito. Più `alwaysinline` su piccoli helper e rilevamento del clamp.
-   **v0.5.52**: target delle funzioni di clamp direttamente con intrinsic `smin`/`smax`. Il clamp è il pattern intero più comune dopo l'incremento.
-   **v0.5.53**: `x | 0` e `x >>> 0` su un valore noto come finito diventano un noop — solo `fptosi + sitofp`, nessun guard.
-   **v0.5.56**: operazioni bitwise native su i32; indice e valore i32 in Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60**: `Math.imul` abbassa a una moltiplicazione i32 nativa invece del percorso polyfill. Il rilevamento del polyfill riconosce gli shim `Math.imul` scritti dall'utente e li sostituisce.
-   **v0.5.59**: inlining dell'init delle funzioni pure + seeding degli interi locali. L'analisi degli interi function-local riesce a vedere oltre i confini delle chiamate quando la callee è piccola e pura.
-   **v0.5.37–v0.5.40**: fast path per l'aritmetica intera sul pattern accumulatore. Il classico ciclo `for (...) acc += f(i)` resta i32 end-to-end quando i tipi lo permettono.

La v0.5.41 è la più sottile. Quando il codegen vede un `const K: number[][] = [[...], ...]` a livello modulo, abbassa l'intera cosa a una costante piatta `[N x i32]` in `.rodata`. `K[y][x]` diventa un singolo `getelementptr + load i32`. Combinato con il ponte dell'analisi degli interi nella v0.5.43, è questo che ha dato a `image_conv` (una sfocatura Gaussiana 5×5 su un frame RGB 4K) uno **speedup di 3x in una singola release**.

## 5\. Buffer e Uint8Array

I workload binari — crypto, elaborazione immagini, parsing, networking — vivono in Buffer e Uint8Array. La v0.5.64 ha dato loro **slot di puntatori tipizzati più metadati `noalias`**. Dove un Buffer era un double NaN-boxed in un `alloca double`, ora è un puntatore grezzo `i64` in un `alloca i64`, con annotazioni LLVM che dicono all'ottimizzatore “questo puntatore non fa alias con altri puntatori nello scope”. Questo sblocca riordinamento di load/store, vettorizzazione e allocazione dei registri che l'ottimizzatore altrimenti si rifiuterebbe di fare.

La v0.5.80 ha chiuso l'ultimo problema di correttezza qui: un contatore `alias-scope` per i buffer a livello modulo che veniva resettato per-funzione, il che in rari casi poteva permettere a LLVM di ragionare attraverso scope che non dovrebbero condividere un ID di scope. Ora il contatore è a livello modulo e la storia `noalias` è a tenuta stagna.

La v0.5.53 ha reso `Uint8ArraySet` branchless — una store mascherata invece di un if/else che scriveva 0 in caso di out-of-bounds. La v0.5.54 ha aggiunto un **indexOf Two-Way** per pattern più lunghi e uno `split` allocato in arena, che insieme hanno chiuso la maggior parte del divario sul parsing di Buffer con molte stringhe.

## 6\. Stringhe: ASCII è il fast path

Le stringhe JavaScript sono UTF-16, ma la maggior parte delle stringhe del mondo reale (chiavi, identificatori, header HTTP, scaffolding JSON) sono ASCII. La v0.5.71 ha aggiunto un **`charCodeAt` e `codePointAt` O(1) per stringhe ASCII** — nessuna scansione UTF-16, solo un byte load. La v0.5.20 aveva già fatto sì che `indexOf`, `slice` e `charAt` bypassassero la scansione UTF-16 su ASCII.

Una nota di correttezza all'interno della stessa release: `String.length` ora restituisce le code unit UTF-16 (spec ECMAScript) invece del conteggio dei byte. Era un bug latente in cui `"café".length` restituiva 5 invece di 4.

## 7\. I server ora restano effettivamente attivi

Il lavoro meno glamour della settimana è stato anche il più visibile per gli utenti: far sì che i server long-running in stile Node — Fastify, ws, http, net — non crashassero dopo pochi minuti.

I crash condividevano tutti una causa radice: il GC non conosceva le closure dei listener. Quando scrivi `wss.on('message', handler)`, la closure cattura variabili, che vivono come campi all'interno di una cella allocata dal GC. Se il root scanner del GC non sa di dover visitare quelle celle, le loro catture vengono recuperate e il prossimo evento message dereferenzia memoria liberata.

-   **v0.5.26**: root-scan delle closure dei listener di evento di `net.Socket` (chiude #35).
-   **v0.5.27**: estensione a `ws`, `http`, `events`, `fastify`.
-   **v0.5.28**: registrazione dei global a livello modulo come root del GC (chiude #36). Bug di lifetime un livello sopra.
-   **v0.5.21**: sicurezza di `gc()` all'interno degli handler di request di Fastify/WebSocket — la chiamata GC esplicita veniva eseguita mentre gli handler di request tenevano puntatori nell'arena (chiude #31).

Accanto al lavoro sul GC, la v0.5.20 ha spedito un **main event loop** — uno vero, non un placeholder — che mantiene vivi i server WebSocket e basati su timer invece di uscire dopo il ritorno dell'ultima chiamata sincrona (refs #28). È stata la singola correzione più impattante per chiunque provasse a far girare Perry come server HTTP di produzione. Fastify ora rimane attivo. I server WebSocket ora rimangono attivi.

La v0.5.19 ha corretto il mismatch dell'ABI SysV AMD64 per gli argomenti/ritorni FFI di JSValue — un problema su Linux dove le chiamate FFI native potevano corrompere silenziosamente gli argomenti. La v0.5.18 ha aggiunto dispatch nativo per `axios` (get/post/put/delete/patch), inclusi `response.status` e `response.data`. La v0.5.30 ha corretto il dispatch di `fastify request.header()` e `request.headers[]`, che restituiva undefined per i lookup case-insensitive.

## 8\. `@perry/postgres`: il driver che ha reso tutto questo necessario

Gran parte del lavoro di questa settimana è stato guidato da un workload: far funzionare un [driver Postgres](https://github.com/PerryTS/postgres) completamente compatibile con Node su Perry-native. Il driver è TLS-capable, ha un registro di codec cross-module, supporta cancel/close/notify, e ora esegue benchmark contro `pg`, `postgres.js` e `tokio-postgres`.

Il lavoro di performance lato driver è stato parallelo a quello lato compilatore:

-   **Sollevamento del codec per colonna** ed eliminazione delle copie Buffer per cella. BigInt(string) per int8 per evitare allocazioni intermedie.
-   **Costruttore di Row dinamico per-shape** per righe in forma di oggetto. Se la tua query restituisce sempre le stesse colonne, il driver costruisce un costruttore di row specializzato per lo shape la prima volta e lo riutilizza — il che, in combinazione con la PIC del compilatore, rende l'accesso ai campi sulle row veloce quanto l'accesso ai campi su qualsiasi altro oggetto.
-   **Opt-out `parseTypes: 'minimal'`** per i chiamanti che vogliono stringhe grezze per int8/numeric/date.

Questo è il ciclo di feedback positivo che il compilatore era sempre stato pensato per abilitare. Un driver reale fa emergere colli di bottiglia reali. Il collo di bottiglia ottiene un riproduttore da una riga archiviato come issue GitHub. Una settimana di fix del compilatore dopo, il driver è più veloce e il compilatore è più veloce anche per tutti gli altri. È l'intero piano, compresso in sette giorni.

## 9\. Correzioni di correttezza degne di nota

Il lavoro sulle performance fa emergere problemi di correttezza nel modo in cui il dragaggio di un fiume fa emergere carrelli della spesa. Una lista parziale:

-   **Promise.race** leggeva `.value` al rigetto invece di `.reason`, quindi i reject venivano ingoiati silenziosamente (v0.5.13–v0.5.14).
-   **Promise.any** ora lancia un `AggregateError` appropriato quando tutte le promise in input vengono rigettate. Aggiunto `Promise.withResolvers` e corretto l'ordinamento di `queueMicrotask`.
-   **`[..."hello"]`** ora produce un array di caratteri invece di un oggetto rotto (chiude #16).
-   **Aritmetica BigInt e coercizione `BigInt()`** (chiude #33). Il fast path bigint i64 (v0.5.29) rende il caso comune economico.
-   **Buffer.indexOf / Buffer.includes** con un argomento byte numerico confrontavano contro puntatori di buffer invece di valori byte (chiude #56).
-   **Operazioni bitwise con NaN/Infinity** producono 0 secondo la spec ToInt32 (chiude #57).
-   **Windows x86\_64**: cinque fix specifici per piattaforma — `localtime`, discovery di `clang` e una manciata di aggiustamenti del codegen — hanno riportato Windows x86\_64 in verde (v0.5.72).

## 10\. I numeri

Il benchmark di punta dell'ultimo articolo era `factorial` a 24,6x più veloce di Node. Quel numero è invariato. Ciò che si è mosso questa settimana è tutto il resto:

| Workload | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (schema 20 record) | 547x più lento di Node | 1,3x più lento di Node | ~420x |
| image\_conv (sfocatura 5×5 su 4K) | 1.980ms | 457ms | 4,3x |
| Codice con molte proprietà (PIC hit) | baseline | 2–3x | 2–3x |
| Fibonacci(40) | 401ms | 309ms | 1,3x |
| Uptime di Fastify sotto carico | ~60s prima del crash | indefinito | ∞ |

La suite completa di 15 benchmark contro Node è ancora 14 vittorie e 1 pareggio — la stessa tabella dell'articolo precedente, con numeri leggermente migliori su tutta la linea. Il movimento reale di questa settimana è sui workload che non erano in quella suite: JSON, elaborazione immagini, server long-running. È lì che vivevano i divari, ed è ciò che si è chiuso.

## 11\. Cosa viene dopo

L'unico benchmark che stiamo ancora inseguendo è `image_conv` contro Zig. Perry è a 457ms; Zig è a 246ms. Quel divario è architetturale, non a livello di pass di ottimizzazione, e vive in tre punti:

1.  **Locali buffer tipizzati**. La maggior parte del lavoro sui Buffer è atterrata questa settimana, ma i parametri di funzione e i locali tipizzati come buffer si sboxano ancora ad ogni accesso. L'approccio a slot `i64` che usiamo per i contatori di ciclo deve estendersi ai buffer.
2.  **Splitting del ciclo interno/bordo**. Il ciclo di sfocatura fa clamp di ogni pixel, inclusi il 99,9% dei pixel che non ne hanno bisogno. Dividere in regioni di bordo (con clamp) e interno (senza clamp) permette a LLVM di vettorizzare l'interno con `ld3`/`st3` NEON.
3.  **Hash FNV-1a con doppia ABI**. L'helper di hash viene chiamato tramite l'ABI NaN-box. Specializzarlo a i64 grezzo in/out per i percorsi caldi è un lavoro di poche ore che ripagherà su ogni workload hash-heavy.

Questi sono tracciati in `PERF_ROADMAP.md`. Aspettateveli nel prossimo ciclo.

## In chiusura

Il pattern di questa settimana — 68 patch release, quasi tutte di performance, un divario JSON passato da 547x a 1,3x — è ciò che accade quando si attraversa la vetta e si arriva sul lato buono della collina del passaggio a LLVM. L'ottimizzatore ora è un alleato invece di un muro, e la maggior parte di ciò che resta è lavoro piccolo, specifico, misurabile: trovare un percorso lento, capire perché l'ottimizzatore non riesce a vederci attraverso, esporre la struttura, misurare di nuovo. Nessuno di questi commit è esotico. Sono semplicemente applicati dove servono.

Se vuoi provare qualcosa di tutto questo:

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs: [docs.perryts.com](https://docs.perryts.com) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issue, riproduttori e benchmark che non sono abbastanza veloci: continuate a mandarli. Questo ritmo funziona solo perché le segnalazioni di bug sono abbastanza specifiche da trasformarsi in riproduttori da una riga. Ogni commit in questo articolo ha un `#N` allegato per un motivo.

— Ralph
