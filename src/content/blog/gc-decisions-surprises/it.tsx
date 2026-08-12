import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `**TL;DR.** Perry compila TypeScript in binari nativi e usa un garbage collector tracing mobile, generazionale e con root precise, non il reference counting. Dopo un mese in cui quasi tutto il lavoro sul GC è consistito nel *capire che cosa stesse davvero facendo il collector*, Perry ora batte Node in 9 benchmark su 19 dalla forma tipica del GC — prima erano 3 —, batte il concorrente AOT con reference counting in 14 su 19 ed è entro 1,3× da Node in 15 su 19. Lungo il percorso abbiamo incontrato una classe di bug che non lascia prove forensi, variabili d’ambiente che non controllavano nulla, gate CI strutturalmente incapaci di fallire, un commento di documentazione che ha fatto distribuire in silenzio un collector diverso e una misurazione finale che mostra come il divario residuo sia nel *layout* degli oggetti, non nella raccolta. Le nove regole che ne abbiamo ricavato sono alla fine, e la maggior parte non riguarda affatto la garbage collection.

Perry compila TypeScript direttamente in un eseguibile nativo: SWC esegue il parsing, noi abbassiamo a HIR, LLVM emette codice macchina e \`cc\` effettua il linking. Non ci sono interprete né bytecode. Eppure il linguaggio ha closure che sfuggono al proprio scope, oggetti che sopravvivono ai loro ambiti e cicli di riferimenti: dietro quel binario nativo deve quindi esserci un vero garbage collector.

Questo articolo racconta le decisioni prese nel costruirlo, le cose che ci hanno sorpreso — quasi tutte spiacevolmente — e dove si trovano oggi i numeri. Da mesi il collector è l’area più attiva del codebase: **201 commit hanno toccato \`crates/perry-runtime/src/{gc,arena}\` dal 1º luglio 2026, 110 dei quali negli ultimi dodici giorni**, distribuiti su 127 file e circa 75.000 righe. 135 dei 572 frammenti di changelog non ancora pubblicati hanno nomi legati al GC.

Quasi nulla di tutto questo è stato «implementare un collector». È stato capire che cosa stesse davvero facendo il nostro collector.

---

## Parte 1 — Le nostre scelte

### Niente reference counting

La prima domanda è quasi sempre se un compilatore AOT non debba semplicemente usare il reference counting. È la soluzione ovvia: nessun problema di scoperta delle root, nessun safepoint, nessuna cooperazione necessaria con l’ottimizzatore. Il compilatore TypeScript AOT concorrente contro cui facciamo benchmark segue esattamente quella strada.

Noi abbiamo scelto comunque un tracing collector, perché il reference counting fa pagare il caso raro al caso comune: ogni store di puntatore aggiorna un contatore, i cicli richiedono comunque un tracer di riserva e JS alloca enormi quantità di oggetti che muoiono subito, precisamente il caso che una nursery gestisce gratuitamente. Oggi la scelta sembra giusta in 14 dei nostri 19 benchmark GC e sbagliata in 5; ci torneremo alla fine.

### I valori usano NaN-boxing — e stiamo in parte tornando indietro

Ogni valore JS occupa una parola da 64 bit. Usiamo i circa 2⁵² pattern NaN liberi di IEEE 754 per etichettare puntatori, piccoli interi e singleton, lasciando tutto il resto come un normale \`f64\`:

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

Per il collector è un ottimo compromesso: «questa parola è un puntatore?» richiede una maschera e un confronto, senza lookup del tipo per valore durante il tracing. Inoltre un numero a riposo contiene già i propri bit IEEE, quindi un campo numerico non costa né box né header.

Per il *mutator*, invece, è il maggiore ostacolo singolo tra noi e V8, e lo stiamo rimuovendo attivamente. Il problema non è soltanto che \`double\` NaN-boxed sia *una* rappresentazione, ma che sia quella **canonica**. I tipi macchina nativi esistono solo come overlay locali a una regione, mentre un’intera famiglia \`materialize_*_to_js_value\` re-boxa a ogni confine visibile da JS. Nell’IR emesso, un accumulatore di ciclo dimostrabilmente \`i32\` vive così in un \`alloca double\`, sopravvive a \`-O3\` come \`phi double\` sul back-edge e paga un round trip \`fptosi\` + \`sitofp\` **a ogni iterazione**. I parametri di funzione sono uniformemente \`double %argN\`, quindi una funzione hot deve de-boxare gli argomenti milioni di volte; persino le variabili numeriche venivano registrate come root GC, anche se un numero non può mai essere un puntatore.

La misura decisiva: una versione fedelmente unrolled di \`_encipher\` di bcryptjs impiega 834 ms contro i 184 ms di Node — e *aggiungere annotazioni di tipo l’ha peggiorata*, da 834 a 2732 ms, perché dominavano circa 80 guard per lettura e le rimaterializzazioni ai confini. I fast path a livello di espressione non possono correggere un problema di rappresentazione; ciascuno è un altro overlay sopra un canone boxed, e sul codice unrolled l’effetto si inverte.

La direzione (\`docs/representation-selection-rfc.md\` e la campagna unbox-by-default) consiste nel rendere canonica la forma nativa senza box per ogni valore provato staticamente — scalari, stringhe, oggetti, typed array e closure — end-to-end attraverso locali, parametri, ritorni e slot heap tipizzati, limitando il NaN-boxing ai valori dimostrabilmente polimorfici. Rimane la rappresentazione *predefinita*, ma smette di essere l’*unica*. Le fasi 1, 2, 3a, 3b, 4a e 4b sono state integrate. Static Hermes dimostra che è possibile. L’argomento AOT è che dobbiamo *provare* i tipi dove un JIT può speculare — ed è anche il nostro vantaggio, perché un kernel provato non richiede warmup e non può fare deopt.

Questo riguarda direttamente il GC in entrambe le direzioni. L’unboxing elimina root che il collector dovrebbe altrimenti scansionare — uno scalare provato non è affatto una root — e aggiunge contemporaneamente un obbligo: quando uno slot heap contiene qualcosa di diverso da una parola NaN-boxed, il collector non può più dedurre dal valore se sia un puntatore e deve consultare una maschera di layout per shape. Quella meccanica — \`pointer_mask\`, \`raw_f64_mask\` e le note di layout — è all’origine di diversi bug descritti più avanti.

### Un heap per thread, nessuna condivisione

Perry è single-threaded per impostazione predefinita; \`perry/thread\` fornisce \`spawn\` e \`parallelMap\`, e i valori attraversano i confini tra thread tramite copia profonda (\`SerializedValue\`), non tramite condivisione. Il costo ergonomico è reale, ma il collector ottiene un grande vantaggio: **non si sincronizza mai con un altro thread.** Nessun protocollo globale di safepoint, nessun handshake, nessuna read barrier per invarianti tra thread. Ogni arena, ogni root scanner e ogni remembered set è thread-local.

### Generazionale, perché lo dice la distribuzione delle allocazioni

Ogni thread ha due regioni: una nursery (\`ARENA\`, blocchi da 1 MB) e una old generation (\`OLD_ARENA\`), un \`GcHeader\` da 8 byte per allocazione, due bit di invecchiamento (\`HAS_SURVIVED\` e \`TENURED\`) invece di un contatore, e \`PROMOTION_AGE = 2\`. Il piano originale, scritto il 24 aprile 2026 prima di qualunque codice, esprimeva chiaramente il ragionamento: oltre il 90% delle allocazioni JS muore nello scope che le ha create, quindi un’arena piatta passa la vita a rimarcare oggetti banalmente morti.

Il piano identificava correttamente anche il prerequisito da cui dipende tutto il resto:

> **Un GC generazionale richiede root precise.**

Uno scanner conservativo va bene per un collector non mobile: un falso positivo conserva semplicemente un oggetto morto per un altro ciclo. Un collector *mobile* non può funzionare così. Se non puoi enumerare con precisione le root, non puoi riscriverle; se non puoi riscriverle, non puoi spostare nulla.

### Root: un’analisi, due lowering e statepoint LLVM di default

LLVM può tenere valori nei registri, rimaterializzarli e fare spill dove preferisce; il collector non può ispezionare nulla di ciò. La risposta di Perry ha due livelli, e separarli ci ha richiesto troppo tempo.

L’**analisi** — quali locali contengono puntatori GC e dove ciascuna deve restare viva — è indipendente dal backend. Il **lowering** della risposta nel codice emesso è una scelta:

- *Shadow stack.* \`js_shadow_frame_push(n)\` all’ingresso, un \`js_shadow_slot_bind\` per ogni variabile di livello JS e \`js_shadow_frame_pop\` all’uscita. Il collector percorre un frame memorizzato nell’heap.
- *Stack map native tramite RS4GC.* Le alloca root diventano \`ptr addrspace(1)\`, le funzioni ricevono \`gc "statepoint-example"\` e ogni modulo passa per \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\`. LLVM inserisce autonomamente statepoint, relocation e riscrittura degli usi successivi; durante la raccolta leggiamo le root da una sezione compatta \`__perry_gcmap\`.

**Da #7370 il lowering statepoint è il default.** Non occorre più impostare \`PERRY_RS4GC=1\`; \`PERRY_RS4GC=0\` torna allo shadow stack per una bisezione. La scelta dipende dal target perché \`gc_map\` rifiuta di emettere una mappa se la runtime non può risolverne le basi dei frame: una mappa che nessuno legge perde root in silenzio. La regola è root native dove la runtime può percorrere lo stack, shadow stack altrove. aarch64/arm64 e x86-64 ricevono statepoint; watchOS \`arm64_32\` e Windows ARM64 mantengono lo shadow frame. Il fallback non significa «nessuna root», ma l’altro lowering della stessa analisi.

Le prove del passaggio, senza variabili d’ambiente: la suite completa di 479 test del gap con **0 regressioni e 0 errori di compilazione**; tutti i **128 test contenenti \`try\`** compilati, proprio la classe che il vecchio bridge statepoint scritto a mano non poteva gestire; le 10 probe ratchet GC byte-identiche a Node; runtime −1–2%, quindi leggermente più veloce; dimensione del binario +1,86% sui 81 moduli di zod.

Il vantaggio vero rispetto a «emettiamo uno shadow stack» non è quell’1–2%. Uno statepoint porta **semantica di relocation che l’ottimizzatore deve rispettare**, mentre uno shadow stack è corretto solo finché l’ottimizzatore non fa nulla di intelligente con un valore che abbiamo dimenticato di spillare. Le prove arrivano nella Parte 3.

A questo si aggiungono **79 root scanner runtime registrati** per lo stato che vive nella runtime e non nel codice utente: promise in sospeso, callback dei timer, stato delle eccezioni, stack di contesto async, cache delle shape, tabella di intern delle stringhe e tabelle temporanee JSON.

Esiste anche uno scanner conservativo dello stack nativo. Il nostro documento di architettura lo descrive come uno di tre meccanismi equivalenti; quel testo è obsoleto, e scoprirlo scrivendo questo articolo è stato istruttivo. Nella configurazione di produzione distribuita, \`conservative_stack_scan_decision()\` restituisce \`SkipDisabled\`: la liveness dipende interamente dalla mappa precisa delle root — statepoint o shadow frame sui target fallback — più \`RuntimeHandleScope\` negli helper runtime. Il percorso conservativo sopravvive per modalità specifiche, soprattutto la raccolta al punto di allocazione, non come rete di sicurezza sotto quello preciso.

### Write barrier, armate pigramente

Il pericolo generazionale sono i puntatori vecchio→giovane: un minor GC che traccia solo la nursery deve conoscerli. Codegen emette \`js_write_barrier\` sugli store di puntatori e la runtime mantiene un remembered set.

L’invariante di armamento distribuita con #7250 è una delle parti più riutilizzabili del collector:

> Finché è disarmata, la barriera non registra nulla. In cambio, la prima *lettura* del remembered set in un thread non si fida affatto del log: ricostruisce dall’heap l’insieme completo degli archi vecchio→giovane e arma la barriera durante il passaggio.

È imposto strutturalmente: \`remembered_dirty_snapshot()\` è \`pub(super)\`, ha sette call site e sono tutti dentro \`gc/\`.

*(Nota per chi legge il sorgente: Perry possiede due cose indipendenti chiamate «la barriera» — la write barrier GC e una barriera di promozione \`Ptr<Shape>\` compile-time nel pass di representation selection. Tre issue hanno perso tempo confondendole. Indicate sempre il file.)*

---

## Parte 2 — Le sorprese

### 1. La classe di bug che non lascia prove

L’invariante di rooting è una frase:

> Qualunque valore gestito dal GC che resti vivo oltre un punto di raccolta deve essere raggiungibile da una root prima di quel punto. Un valore letto da una root e mantenuto in un registro SSA durante una chiamata **non è rootato**: è una copia, e il collector non vede le copie.

Violarla produce la peggiore esperienza di debugging del progetto. Al momento della raccolta non c’è *nulla da trovare*: nessun riferimento dangling, nessuno slot non forwardato, nessuna anomalia. La nursery ricicla poi l’indirizzo; il puntatore stale legge un altro oggetto valido e il programma muore uno o più cicli dopo, in un’altra funzione, con \`TypeError: value is not a function\`.

Tutte le nostre probe GC runtime sono cieche. Gli scan del from-space sono puliti. I pass di verifica sono puliti. \`PERRY_GC_VERIFY_EVACUATION\` controlla che gli slot raggiungibili siano stati forwardati, ma non può controllare un registro di cui ignora l’esistenza.

Abbiamo catalogato cinque forme distinte, tutte distribuite:

| # | Forma | Perché ha superato la review |
|---|---|---|
| #7184 | Store di root a un indice fuori dal frame pushed | \`js_shadow_slot_bind\` verifica i limiti e non fa nulla in silenzio; l’IR *dice* che è rootato |
| #7192 | Store di root emesso *dopo* una chiamata che alloca | Lo slot finisce rootato **e** dangling; supera ogni test «è rootato?» |
| #7206 | Receiver di metodo caricato, poi lowering degli argomenti — ognuno può allocare — prima dell’uso | Il load sembra ovviamente corretto isolatamente |
| #7206 | \`base[key]\`: materializzare la base, abbassare l’espressione key, usare poi la base stale | Due operandi; uno è valutato per primo e usato per ultimo |
| #7226/#7239 | Una cella thread-local o statica memorizza un puntatore heap che nessuno scanner riscrive | Invisibile nell’IR |

Quattro sono state distribuite **in un solo giorno**. Ogni fix era di poche righe; il costo era sempre il ritardo nella scoperta. Solo la prima è specifica dello shadow stack. Le altre sono indipendenti dal lowering e sono sopravvissute al passaggio agli statepoint, perché l’errore riguarda *quando il lowering emette la root*, non che cosa sia una root.

L’unica euristica davvero utile: **un bug GC perfettamente riproducibile significa una tabella, non un registro.** Un registro senza root si corrompe solo se una raccolta cade nella sua finestra, quindi in modo intermittente; una cache senza root si rompe alla raccolta #0 e resta rotta. Esiste un’unica eccezione: un \`&str\` o \`&[u8]\` preso in prestito da un \`StringHeader\` heap e mantenuto durante una chiamata che alloca. Il rooting riscrive lo *slot*; un borrow non è uno slot. L’unica soluzione corretta è copiare i byte fuori dall’heap prima della prima allocazione.

### 2. Abbiamo smesso di ispezionare e costruito strumenti

Il punto di svolta di #7154 non è stato un fix, ma abbandonare l’ispezione dopo dieci indagini e costruire strumenti che trasformano il bug in un fault immediato.

**Quarantena del from-space.** Dopo un minor evacuante, il from-space non viene riciclato. I blocchi ritirati sono separati in un anello limitato, riempiti con una poison word il cui primo byte appare come \`obj_type\` non valido (\`0xDE\`), e l’interno allineato alle pagine riceve \`mprotect(PROT_NONE)\`. Una dereference stale provoca ora SIGSEGV *all’istruzione colpevole*, con il detentore ancora nello stack. Il reporter indica indirizzo, minor che ha ritirato la pagina e oggetto che vi viveva, poi ripristina \`SIG_DFL\` e provoca di nuovo il fault affinché il debugger veda il sito reale.

**GC zeal.** Forza un minor evacuante a ogni safepoint, così un valore non rootato si sposta alla prima esposizione invece di quando una raffica di allocazioni indipendente coincide casualmente con la finestra. I modelli sono \`--stress-scavenge\` di V8 e \`gcZeal\` di SpiderMonkey.

**Una profondità che nessuno pensava servisse.** La quarantena è un anello di *N* insiemi di pagine ritirate, 4 di default. Il reproducer \`new C(…)\` di #7154 non va in fault a 4, né 8, né 100. Il corpo del constructor attraversa circa 600 poll di back-edge; quando il return override pubblica il registro stale del caller, la pagina ha 600 ritiri. Con \`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\` va in fault al primo uso. «Aumenta la profondità» è ora il primo consiglio quando un bug sospetto non si riproduce.

Gli strumenti sono **testati tramite sabotaggio**, non solo eseguiti: \`quarantine_catches_a_planted_stale_from_space_deref\` pianta la forma #7184/#7192 e richiede che lo strumento veda poison dove il controllo non strumentato legge un oggetto riciclato perfettamente valido. Quel controllo dimostra che il bug è davvero invisibile senza lo strumento.

Esiste anche uno strumento statico: \`scripts/gc_root_dominance_check.py\` legge l’IR LLVM emesso e verifica che gli store di root dominino tutti i siti successivi che possono raccogliere. Il suo gate CI ha attualmente un’allowlist **vuota**: ogni nuovo hit rende rosso il build. Rimane strutturalmente cieco a tre classi — tabelle runtime, locali non rootate nel Rust runtime e simboli che non nomina — e lo dichiariamo, perché due volte un report pulito è stato preso come prova di qualcosa che non poteva verificare.

### 3. Metà dei nostri controlli non controllava nulla

Questa sorpresa ha cambiato più la politica di ingegneria che il codice.

Per mesi \`PERRY_GEN_GC_EVACUATE\` era il knob usato per dimostrare che un cambiamento fosse sicuro sotto evacuazione. Quando lo abbiamo misurato correttamente — binari identici, stesso host, diff cella per cella di 12 probe ratchet × 8 contatori — ha spostato **0 celle su 96**. Mediane bit-identiche. Lo stesso metodo con \`PERRY_GEN_GC=0\` ne spostava 79: l’harness era sensibile, quel knob specifico no. Controllava un fallback da cui i contatori non provenivano.

Il suo unico effetto vivo era una trappola: vietava l’evacuazione forzata. Un \`PERRY_GEN_GC_EVACUATE=0\` ambientale disarmava in silenzio \`PERRY_GC_ZEAL\`, e un run zeal poteva dichiararsi pulito senza aver mosso nulla.

Non era solo:

- \`PERRY_GC_FORCE_EVACUATE\` veniva letto **solo sul percorso minor**, mentre tutti i test che lo usavano chiamavano \`gc()\`, che eseguiva un full mark-sweep dietro uno scan conservativo forzato. Mesi di «passa sotto evacuazione forzata» non significavano nulla.
- Il knob \`--pressure\` della matrice stress disabilitava il percorso che misurava: hard cap del defer e ceiling del trigger arena condividevano una formula e collassavano insieme; il braccio \`default\` eseguiva zero copying minor in tutte le 22 righe.
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\` era completamente inerte da solo: lo scan non partiva, nulla abortiva e il run riportava successo.
- Il doc comment di \`gc_incremental_enabled\` diceva «EXPERIMENTAL — default OFF» otto righe sopra un commento del body «DEFAULT ON». Una decisione di merge fu presa sul commento sbagliato.

La politica risultante è ora vincolante in \`CLAUDE.md\`:

> **Ogni variabile d’ambiente GC ha un braccio CI obbligatorio che esercita lo stato OFF, oppure viene eliminata dopo una release di assestamento.** Può esistere al massimo un knob solo diagnostico, marcato come non testato.
>
> **Una modalità che esiste ancora è una decisione non ancora presa.**

\`PERRY_GEN_GC_EVACUATE\` è stato eliminato, non corretto. In ogni sito resta un commento-lapide che spiega che cosa c’era e perché non c’è più — cinque, esattamente dove qualcuno reintrodurrebbe la congiunzione. Un audit CI deriva i nomi accettati dai parser production non commentati e fallisce per ogni affermazione viva su un knob eliminato. Il self-test pianta un knob cancellato dietro un parser commentato e dimostra che nessuno passa.

### 4. Gate che non possono fallire

\`CLAUDE.md\` elenca quattro modi in cui un gate CI può essere strutturalmente incapace di rendere rosso un merge. Tutti hanno colpito il repository, tre nella stessa settimana:

1. \`continue-on-error: true\`: \`gc-stress\` lo ha avuto per mesi pur essendo l’unico job sulla correttezza GC.
2. Non essere tra i context richiesti della branch protection: un job che segnala fallimento senza bloccare è documentazione, non un gate.
3. \`concurrency\` con \`cancel-in-progress\` incondizionato: in una coda lenta ogni merge cancella il precedente prima che raggiunga un runner. \`gc-ratchet\` ha avuto tre run \`main\` cancellati e zero eseguiti.
4. **Il gate gira, ma il suo soggetto non è mai girato**, il più pericoloso perché il job è davvero verde.

Poi ne abbiamo trovati altri due. \`gc-stress\` *non era mai girato su \`main\`*: il trigger \`push:\` accettava solo tag e la condizione \`if:\` ometteva \`schedule\`, quindi 12 nightly su 12 lo segnavano \`skipped\`. E \`lint\` — un context *richiesto* — era rosso da oltre tre nightly perché 16 file superavano 2000 righe; tutti i merge entravano tramite admin bypass. La branch protection era teatro, e un nuovo gate corretto collegato a \`lint\` sarebbe arrivato inerte.

La conseguenza: **un gate deve affermare che il suo soggetto fosse vivo**, non solo che nulla abbia lanciato. I run zeal stampano all’uscita \`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\` ed **escono 70 se uno vale zero**. Un run che non ha esercitato nulla è rosso, non verde.

### 5. Il collector continuava a pianificare raccolte che non potevano aiutarlo

Un bug strutturale ricorrente, tre istanze indipendenti e una forma: *un predicato pianifica una raccolta incapace di cambiare la quantità che legge.*

**Il passaggio di consegne della promozione (#7592).** Un predicato sostituiva un minor con un full mark-sweep per creare spazio old-gen ai sopravvissuti da promuovere. Ma un full mark-sweep non muove e non promuove; non alleviava la pressione e tornava vero al minor successivo. Su una pipeline JSON da 200.000 record: **19 raccolte su 22 erano questi full, ciascuno liberava 0,0 MB a circa 400 ms.** 7,6 s di una fase da 8,6 s. Il copying minor che avrebbe promosso davvero non è mai partito.

**Il cap della nursery (#7690).** Un limite basato sull’occupazione from-space applicato a un minor *non mobile*, che fa sweep in place e lascia occupato il from-space. Una volta attivato è di nuovo dovuto al blocco successivo: una raccolta dell’intera arena per ogni MB allocato, quadratica nell’insieme vivo.

**Il cap proporzionale al vivo che era un punto fisso.** Un tentativo usava \`max(base, arena_in_use)\`. Il test di scadenza confronta però l’occupazione *from-space* con il cap e in quel workload from-space ≈ vivo. Non poteva mai superare il proprio limite; lo scavenging si fermava. Il miglioramento 5,9× derivava dal non fare lavoro.

Due regole sostengono ora il pacing:

> **Non cadenzare mai una raccolta con una quantità che quella raccolta non modifica.**
>
> **Nessuna banda costante deve cadenzare un collector il cui costo per ciclo è O(vivo)**: il lavoro totale diventa quadratico e una costante più grande sposta soltanto il precipizio.

Correggere la famiglia ha portato un workload JSON da **60,4 s a 3,86 s**, mantenendo il costo per record entro circa il 30% su una variazione 20× dove prima cresceva 70×.

### 6. E una volta il collector ha documentato un cambiamento mai effettuato

La riga più costosa di questa storia è un commento di documentazione.

#7690 ha scritto l’argomento completo per attivare di default i poll mobili sui back-edge in due commenti — runtime e codegen — e **non ha cambiato nessun body**. Entrambi accettavano ancora \`1|on|true\`, dunque default OFF, senza test che fissasse il default. Il commento runtime diceva perfino che il mirror codegen «MUST agree»; concordavano, ma sul valore che la documentazione affermava di aver modificato.

Non è una configurazione più lenta, ma un collector diverso. La pressione nursery ha solo due punti precisi di raccolta: il poll di back-edge e il confine esterno del microtask pump. Senza poll emesso, un programma puramente computazionale non raggiunge nessuno. Ogni raccolta nursery cadeva al punto di allocazione, dove un fix precedente l’aveva giustamente resa non mobile. **Il collector distribuito non evacuava affatto la nursery** e ricadeva su full collection dell’intera arena.

| benchmark | \`main\` distribuito | poll realmente attivi |
|---|--:|--:|
| tree | 5,10 s | **1,63 s** |
| tree_wide | 7,26 s | **2,12 s** |
| retain | 2,33 s | **1,32 s** |
| churn | 1,00 s | **0,46 s** |
| cycles | 0,29 s | **0,19 s** |

Un benchmark eseguiva **13 full collection dell’intera arena — 0,477 s di pausa —** dove lo stesso programma poche settimane prima eseguiva **105 copying minor — 0,016 s —**. La pausa GC totale di \`tree\` è scesa da 4,107 s a 0,550 s; la massima da 266 ms a 16 ms.

A trovarlo non è stato il tempo, ma i *tipi* di ciclo in \`PERRY_GC_TRACE=1\`: \`{'full': 13}\` invece di \`{'minor': 105}\`.

Tre test fissano ora il default, incluso il braccio per valori non riconosciuti, e un altro impone l’accordo tra crate. Il disaccordo resta silenzioso in entrambe le direzioni — poll che nulla consuma o defer che nulla drena — e richiede un’assertion, non due commenti.

La classe non è chiusa. Un profiling recente ha trovato la stessa forma nella write barrier: **codegen emette un load \`seq_cst\` del contatore barrier-active — un \`ldar\` su aarch64, 42 siti in \`evalNode\` — mentre runtime legge lo stesso global con \`Relaxed\` per la stessa decisione**. Il commento codegen promette «one relaxed load of a \`static\`». Due lettori contraddicono l’ordering necessario e la documentazione sta contro il codice. Al massimo uno ha ragione; se sbaglia runtime, il bug è molto più grave del \`ldar\`. È registrato ma volutamente non corretto: indovinare male può mancare una insertion barrier, invisibile durante la raccolta e visibile cicli dopo come \`TypeError: value is not a function\`.

### 7. Il lavoro GC più veloce è quello eliminato

Rimossi i bug di pacing, il costo residuo si è rivelato più volte lavoro che non avrebbe dovuto esistere.

**Un heap dove nulla moriva veniva marcato di continuo.** \`retain.ts\` costruisce un array di 3 milioni di record e non ne scarta nessuno. Perry trascorreva **1,26 s di un run da 1,31 s nel collector**, il 96%. Node impiega 0,13 s. Due full mark-sweep recuperavano 4 MB complessivi; uno non cambiava l’occupazione di un byte, perché il predicato d’escalation dipendeva dalla crescita: un insieme vivo crescente supera una soglia a ogni raddoppio. Fix: valutare un full in base a ciò che recupera e spostare la soglia quando risulta improduttivo.

**Ogni oggetto evacuato prendeva un mutex globale per hashare una mappa vuota.** Un move hook eseguiva un \`remove\` SipHash sul registro residuo \`Object.setPrototypeOf\`, vuoto in ogni programma che non cambia prototipo. Esisteva già un latch; il hook era l’unico lettore a ignorarlo. Una promozione da 3 milioni di record pagava 2,5 milioni di acquisizioni di mutex reali ma inutili.

**Poi abbiamo smesso di spostare gli oggetti.** Se la nursery di un copying minor è quasi tutta viva, evacuare oggetto per oggetto è puro overhead: nuova allocazione old-gen, \`memcpy\`, trasferimento layout, accounting, hook, forwarding stub e riscrittura di ogni slot referente, per spostare un oggetto senza motivo. La promozione in place di blocchi interi — page promotion in V8 — cambia soltanto l’etichetta della generazione. Nulla si muove, nulla si riscrive:

| workload | prima | dopo |
|---|--:|--:|
| retain | 0,81 s | **0,53 s** |
| retain_wide | 1,33 s | **1,07 s** |
| deeplist | 0,30 s | **0,24 s** |
| costo promozione/oggetto | 243 ns | **105 ns** |

**Poi abbiamo smesso anche di tracciarli.** Tre pass percorrevano ancora ogni sopravvissuto: dirty scan del remembered set, drain e \`clear_marks\`. In un ciclo dove nulla si muove o può liberarsi, il trace costava 55–67 ns per oggetto e il percorso che promuove davvero circa 9 ns. Un ciclo di promozione ora omette il trace quando l’ultimo survival ratio misurato è nel regime interamente vivo, ma rifiuta esplicitamente se una premessa ha costo: holder di weak target registrato, registro malloc non vuoto, mark incrementale attivo o uno dei tre strumenti verify. Ognuno usa il trace come soggetto; senza mark potrebbero riportare successo senza esaminare nulla. Risultato: \`retain\` −33,6%, \`deeplist\` −43%, e cicli da 243 ns per oggetto ora a **8,9 ns**.

La politica è una *misura*, non un’ipotesi. La liveness del blocco non è nota prima del trace; la decisione usa il survival ratio giovane del ciclo precedente. La popolazione è risultata bimodale su tre ordini di grandezza:

| famiglia workload | copying minor | survival ratio giovane |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0,999 – 1,000 |
| churn, churn_alloc, push_cls | 105 | 0,000 – 0,004 |
| push_num, cycles | 16–18 | 0,000 |
| tree, tree_wide, churn_read | 0 | *non parte alcun copying minor* |

Un ciclo mal previsto conserva al massimo pochi punti percentuali di nursery, un ciclo di promozione traccia abbastanza spesso da misurarsi e un cap corrente sui byte morti promossi limita lo steady state.

Va detto chiaramente: **la storia del «meccanismo unico» di solito è falsa e il profilo si sposta sotto i piedi.** Frazioni di pausa attuali, misurate allo stesso commit della classifica finale:

| programma | wall | pausa GC | frazione pausa | cicli |
|---|--:|--:|--:|--:|
| retain | 159,5 ms | 52,0 ms | 33% | 5 |
| retain1 | 71,4 ms | 38,7 ms | 54% | 3 |
| retain_wide | 206,2 ms | 75,4 ms | 37% | 8 |
| shapes | 64,8 ms | 4,6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

Due valori erano 93% e 62% una settimana prima; il lavoro di questa sezione li ha eliminati. \`shapes\` al 7% non è più un benchmark GC: prima del bug di \`8, 94 ms su 139 ms erano GC, e l’avevamo classificato «GC ad alta sopravvivenza» in base al rapporto. Le leve GC non lo muoveranno. Un rapporto apparentemente uniforme era coincidenza aritmetica, non causa condivisa.

### 7b. «Zero cicli» non significa «nessun costo GC»: un contatore scambiato per conclusione

La riga \`asyncpipe\` indica 0 ms di pausa in 0 cicli. L’abbiamo descritta internamente come «mutator puro; ogni leva GC è irrilevante». Un profiling istruito su quella premessa l’ha confutata.

\`asyncpipe\` non stampa mai \`[gc]\`, eppure **circa il 33% del suo profilo leaf è meccanica del collector**: write barrier, side table di layout per oggetto e rooting \`RuntimeHandleScope\`. Disabilitare i poll mobili di back-edge misura **−14,1% mentre il programma esegue ancora zero cicli**. Un mark/sweep incrementale old-gen avanza su quei poll senza completare un ciclo e quindi senza riportarlo. Era la maggiore leva del round, e la nostra premessa allontanava il profiler. (\`PERRY_WRITE_BARRIERS=0\` dà +0,9%: le barrier codegen sono assolte, non il drive incrementale.)

> **Un contatore di cicli misura le raccolte, non il costo del collector.**

Barrier, side table, rooting e slice incrementali sono costi lato mutator, strutturalmente invisibili a una traccia per ciclo. \`0 cycles\` sembra una conclusione e osserva solo un meccanismo.

La trappola collegata: \`asyncpipe_big.ts\` **non è** una versione scalata valida. A 120 batch esegue zero cicli, a 240 due copying minor, a 1200 domina il GC. Scalare per superare il rumore temporale ha creato silenziosamente un benchmark diverso, la stessa forma delle varianti «realistiche» vuote di \`9; è emerso solo verificando che la proprietà studiata sopravvivesse allo scaling.

### 8. Sedici byte oltre una soglia

Il miglior singolo bug della campagna. \`shapes\` spendeva 94 ms di un run da 139 ms in due minor collection, riportando survival ratio di 739‰ e 925‰ anche se il live set reale era circa 3200 oggetti.

\`arena_alloc_gc\` crea tutto ciò che supera \`LARGE_OBJECT_THRESHOLD_BYTES\` — 16 KB — direttamente in old-gen e lo marca \`TENURED\`. Il backing store di un \`Node2D[]\` da 2000 elementi occupa 16.400 byte. **Sedici byte oltre la soglia.**

Ogni array restava vivo per sempre — un minor non fa sweep di old-gen —, la write barrier registrava fedelmente un arco vecchio→giovane per ciascuno dei 2000 store e ogni minor successivo li rimarcava tutti: 94.000 e poi 118.006 slot rimarcati.

Il fix è interessante perché «alzare la soglia» sarebbe stato sbagliato. Superarla scambia *costo di copia* con *costo di retention*. Per un oggetto senza puntatori entrambi sono limitati dalla sua dimensione, quindi restano 16 KB. Per un oggetto con puntatori la retention è transitiva e illimitata; array, oggetti e closure ricevono 128 KB — \`kMaxRegularHeapObjectSize\` di V8 traccia la stessa linea per lo stesso motivo. La selezione legge il flag \`pointer_free\` esistente, non una lista di tipi; un tipo ignoto conserva il valore conservativo.

\`shapes\` è sceso da 0,139 s a 0,061 s nel round — 0,058 s e 1,39× *più veloce* di Node nel sweep finale —, con RSS massimo da 71,4 a 32,3 MB. Gli altri 18 programmi sono rimasti entro ±1,3%.

### 9. Misurare è stato più difficile che correggere

Elenco parziale di cose che hanno prodotto una conclusione sicura e sbagliata:

- **Abbiamo benchmarkato contro un \`main\` rotto.** Per giorni i programmi con molte allocazioni erano circa 20× lenti — sorpresa #6 —, rendendo inutile ogni A/B. La firma era indipendente dal carico: 105 → 1304 raccolte. Nessuno l’ha guardata perché i tempi erano solo *cattivi*, non assurdi.
- **Il relink auto-optimize ricostruisce runtime con \`--no-default-features\`**, rimuovendo silenziosamente \`diagnostics\`. \`PERRY_GC_TRACE\` non stampa nulla e i cicli sembrano **0**. Un’indagine concluse «zero raccolte» per tre bracci prima di accorgersene.
- **Una baseline ratchet fissata su un altro host e trenta versioni prima** riportava 29 «regressioni» che erano puro drift. Misurare sempre entrambi i bracci consecutivamente sulla stessa macchina.
- **Un guadagno di pretenuring 108 MB → 0 era confuso**: il braccio base precedeva una modifica intermedia. Il meccanismo era corretto, il target sbagliato — un parse tree allocato dalla runtime, non letterali visibili a codegen — e il limite circa 1 MB.
- **Abbiamo cronometrato per settimane un programma che crashava.** Il binario di un concorrente stampa la risposta corretta per \`deeplist\` e poi esce −11 (SIGSEGV) su un drop ricorsivo di refcount. Segnavamo quella colonna come sconfitta. Ora ogni harness registra gli exit code.
- **\`grep -c\` esce 1 con zero match**, troncando catene \`&&\`. Anche una pipe \`PERRY_GC_TRACE\` che riceve SIGPIPE ed esce 141.

Le regole rimaste: citare il contatore di censimento, non l’orologio — è indipendente dal carico —; confrontare i *binari* prima dei timing; affermare che il confronto abbia realmente confrontato qualcosa; verificare che il braccio dichiarato fosse vivo.

---

## Parte 3 — Le due strade lunghe

### Statepoint: strada presa, dopo quattro mesi e tre prerequisiti

\`gc.statepoint\` di LLVM era dal primo prototipo il meccanismo chiaramente superiore per correttezza. Offre **semantica di relocation che l’ottimizzatore deve rispettare**, mentre uno shadow stack è corretto solo finché l’ottimizzatore non fa nulla di intelligente con un valore che abbiamo dimenticato di spillare. La parte interessante è tutto ciò tra «ovviamente migliore» e «distribuito di default», perché nessun ritardo riguardava le performance.

**Era bloccato da cose che non erano il GC.** Le eccezioni venivano abbassate a \`setjmp\`/\`longjmp\`, e un \`longjmp\` può saltare *oltre* un \`gc.relocate\`, quindi il puntatore relocated non viene mai riscritto. Con RS4GC è peggio: \`mem2reg\` non promuove le alloca volatile necessarie alla correttezza di setjmp; le root nelle regioni \`try\` non entrano mai in SSA e non vengono relocate. \`gc.statepoint\` ha una forma invoke proprio per questo. La strada è passata dall’eliminazione completa del lowering setjmp delle eccezioni di Perry a favore di invoke/landingpad (#7302/#7305), e dal portare LLVM in-process (#7301) per controllare la pipeline. Nessuno era un ticket GC.

**Il compromesso allettante era la trappola.** «Mantenere lo shadow stack per le funzioni \`try\`» avrebbe fissato per sempre due meccanismi di root. Anche «eliminare lo shadow stack e tenere gli statepoint» si è rivelato non *esprimibile*: gli statepoint sono un lowering alternativo dell’analisi del root set dello shadow stack, non un meccanismo indipendente. Separare il predicato (#7340) ha reso possibili default per target ed eliminazione futura. Prima, \`PERRY_SHADOW_STACK=0\` più statepoint produceva un binario **senza root precise**, senza sezione \`__perry_gcmap\`, con output corretto e indistinguibile da un buon build finché una raccolta non liberava qualcosa di vivo.

**Uno dei due backend doveva morire.** Abbiamo mantenuto un bridge statepoint scritto a mano accanto a RS4GC. Non erano pari: il bridge non poteva rootare un \`invoke\` e rifiutava le funzioni con \`try\`; era anche il fallback silenzioso di RS4GC, la configurazione non testata vietata dalla nostra policy. Prima di eliminarlo abbiamo misurato **1574 funzioni tra un’app Drizzle reale e le probe ratchet: tutte abbassate con RS4GC, nessun fallback.** Bridge, analisi di liveness CFG, parser delle chiamate, emitter, enum \`PreciseRootBackend\` e knob \`PERRY_STATEPOINTS\` sono scomparsi insieme. Un bail ora è un errore duro che nomina la funzione, non un downgrade.

**Poi il default è stato distribuito senza coverage.** Le root native erano default da mesi sui target percorribili mentre **nove meccaniche di lowering delle root non avevano assertion sul lowering realmente emesso**. Tre test che sembravano coverage non misuravano nulla: verificavano l’assenza di \`js_shadow_slot_bind\`, vera per ogni programma sotto il default nativo, rootato o no. Ancora hazard 4, nel sistema incaricato di non perdere root silenziosamente. #7653 lo ha corretto da tre punti di vista — IR pre-\`opt\`, bundle \`"gc-live"\` post-RS4GC e blob \`__perry_gcmap\` decodificato — ognuno vede ciò che il successivo perde. Il checker di dominanza aveva il problema opposto: ancorato a \`@js_shadow_slot_bind\`, compilava il corpus con \`PERRY_RS4GC=0\`. Fino a #7663 verificava un lowering non più distribuito.

Una legge di design è uscita dall’esperimento, pagata con un risultato negativo misurato: **metadata delle root senza semantica di relocation sono unsound sotto un compilatore ottimizzante.** Uno schema compatto per funzione generava mappe 10–13× più piccole e corrompeva deterministicamente un ciclo churn di dieci righe. La mappa non era sbagliata; il mutator leggeva from-space tramite valori SSA derivati dall’heap e stale che solo una relocation può correggere. Le barrier vincolano il memory ordering, non il dataflow.

### Unboxing: in corso e ora l’evento principale

L’altra strada viene dalla Parte 1: rendere canonica la rappresentazione nativa unboxed e relegare NaN-boxing al fallback polimorfico. Sono integrate le fasi 1 — locali scalari —, 2 — ABI specializzata —, 3a/3b — stringhe e locali puntatore \`Ptr<Shape>\` — e 4a/4b — heap tipizzato, prima array numerici e poi la contabilità inutile del layout boxed.

Due aspetti meritano onestà.

**Una sottofase è stata valutata e respinta, per una ragione che è un complimento al NaN-boxing.** I *campi oggetto* unboxed, titolo originale di 4b, sono stati scartati dopo la ricognizione. Uno slot \`number\` contiene già bit IEEE grezzi, perché NaN-boxing riserva solo \`0x7FF9..=0x7FFF\`; \`raw_f64_mask\` è quindi un *proof bit*, non un cambio di storage, e il guard di lettura era già sparito. Handle stringa grezzi romperebbero la small-string optimization materializzando inutilmente stringhe brevi nell’heap. Slot \`i1\`/\`i32\` grezzi richiederebbero una terza maschera e una query di layout in circa 25 letture dirette, incluse \`JSON.stringify\`, \`util.inspect\` e serde \`v8\`: percorsi hot. È stata distribuita l’elisione: uno store di campo su receiver provato ritira la nota di layout se il valore è non-puntatore per costruzione, e l’addref stringa se non può essere stringa heap.

**Il GC ha indicato il prossimo obiettivo.** La misura finale della Parte 4 mostra che il collector non limita più il cluster difficile: lo fa il mutator, precisamente perché **un object literal con due campi occupa 72 byte**. È un problema di rappresentazione nel senso esatto dell’RFC, e lì prosegue «oggetti reali».

### Strade non percorse

**Concorrenza.** Direttiva del proprietario:

> «Non voglio inseguire parallelismo/concorrenza per sé stessi. Devono essere un ricorso successivo per lavoro necessario, ma non a spese dell’hot path.»

Il vincolo *decide* il design. Le tre famiglie differiscono in dove addebitano il mutator: stop-the-world parallelo non costa nulla — i thread GC vivono solo nella pausa —; marking concorrente richiede una store barrier a ogni scrittura; compaction concorrente una **load barrier** a ogni lettura. Le letture superano di molto le scritture, quindi l’ultima è il no più netto. STW parallelo è l’unico ammissibile e viene terzo dopo eliminare il lavoro inutile per oggetto e pretenure la coorte immortale. Parallelizzare 2,1 milioni di visite che non dovrebbero esistere significa fare più velocemente la cosa sbagliata con quattro core.

La misura ha concordato ancora più nettamente. Dopo \`7, le visite nel peggior caso di promozione si dividevano tra lavoro eliminato e **9,6 ms di un programma da 159 ms**. Non resta abbastanza tempo GC da parallelizzare: raddoppiarne la velocità dà il 3% al programma. GC parallelo non è un piano rimandato, ma una non-leva misurata.

C’è inoltre un argomento di correttezza: oggi «un bug GC perfettamente riproducibile significa tabella, non registro» è diagnostico. Un collector parallelo lo distrugge e trasforma 79 root scanner e ogni cache \`thread_local!\` in possibile data race.

**Deframmentazione delle pagine old: attivata di default e revertita lo stesso giorno.** È l’esempio più recente della regola 1.

La compaction di pagine old parzialmente vive era disattivata da un bug del luglio 2026: riferimento non-heap stale a un oggetto old spostato, corruzione 6/6. Riattivarla era un *progetto di contratto di riscrittura*, non un flip. L’issue richiedeva di enumerare ogni percorso metadata/IC/cache capace di conservare un indirizzo old mobile e di **«riattivare defrag solo quando reproducer e corpus stress alla scala delle dipendenze sono puliti».**

Il lavoro di contratto è solido: allowlist di dominanza ancora vuota, quindi circa 40 hit prima esentati realmente corretti; policy degli holder *inasprita* per far fallire \`open_gap\` e \`unverified\`; due cache la cui sicurezza dipendeva da «only old-gen defrag can move them» corrette. Un’esenzione eliminata portava persino un \`becomes_real_when\` che nominava esattamente il trigger.

Il **flip del default** è arrivato senza evidenza, perché la suite non può strutturalmente produrla. La selezione richiede \`dead_bytes >= live_bytes\` su una pagina old: promote-then-die su larga scala. \`retain\` sopravvive al 999–1000‰ e \`churn\` promuove quasi nulla; **nessun benchmark genera una pagina candidata.** La suite non dà né segnale di beneficio né di regressione, ma eredita l’intera superficie di riscrittura degli indirizzi old. Tutti i gate GC erano ancora in coda al merge.

Abbiamo mantenuto il lavoro di correttezza e riportato il default a opt-in finché non esista un workload di frammentazione capace di esercitarlo. Allora il braccio perdente sarà eliminato. Nuova regola:

> **Una feature che la tua suite non può attivare non può nemmeno essere difesa dalla suite.** Distribuiscila off finché esiste un workload, oppure accetta che entrambi i bracci siano non testati.

**Pretenuring.** Costruito due volte, misurato, confutato e parcheggiato con condizione scritta di riapertura. La soluzione architettonicamente corretta — oggetti longevi creati direttamente in old-gen — ha perso contro quella emergentemente sufficiente — un seed promote-on-first-copy limita ogni coorte a un hop. Sotto ogni carico costruibile i bracci erano indistinguibili. Lezione: **testa la forma discriminante prima di costruire l’invariante.**

---

## Parte 4 — Come sta andando

Sweep finale del 12 agosto 2026, M1 mini fissato e tranquillo, best-of-5, exit code controllati, output verificato byte per byte contro \`node --experimental-strip-types\` prima del timing. 19 benchmark GC-shaped contro Node 26.5.1 e un concorrente AOT con reference counting.

**Perry batte Node in 9 su 19** — erano 3 all’inizio —, **il compilatore a refcount in 14 su 19** ed è **entro 1,3× da Node in 15 su 19.**

| bench | perry | node | P/node | Δ questo round |
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

Restano due cluster **disgiunti**, e trattarli come un meccanismo è un errore già commesso:

1. **Contro Node: dispatch e mutator, soprattutto non GC.** \`iso_miss\`, \`interp\`, \`pipeline\`, \`asyncpipe\`. Principalmente property dispatch polimorfico, inline cache e representation selection — un’altra campagna. Ma leggi la correzione seguente prima di interpretare lo 0% di \`asyncpipe\` come «nessun GC».
2. **Contro il compilatore a refcount: la famiglia \`retain\`.** \`retain1\` 1,80×, \`retain_wide1\` 1,67×, \`retain_wide\` 1,65×. Tutti battono già Node. Nulla muore, esattamente dove ci aspettavamo un tracing collector peggiore; l’aspettativa è sbagliata in modo interessante.

Il risultato finale riformula la campagna: **nel secondo cluster il collector non è più il vincolo, lo è il mutator.** Sottrarre *tutta* la pausa GC lascia \`retain_wide\` — 130,8 ms di mutator puro — e \`shapes\` — 60,2 ms — ancora perdenti. \`retain\` richiederebbe GC esattamente zero. Il costo reale è che **un oggetto a due campi occupa 72 byte**: scrive **216 MB per contenere 48 MB di numeri**, amplificazione 4,5×. Il vantaggio concorrente non era refcounting, ma compattezza. Ora è un problema di rappresentazione (#7916), non di collector: unbox-by-default applicato al layout oggetti.

Difetto simmetrico nell’altro cluster: \`asyncpipe\` raccoglie a 1200–1650 ns per oggetto, inclusa una **minor collection da 122 ms che ha gestito zero oggetti**, più lunga del programma. Costo indipendente dal numero di oggetti significa overhead fisso, l’ultimo pezzo del collector ancora sul critical path (#7915).

Risultato negativo da registrare: **non ridurre la prima nursery.** Il ciclo 0 è il 58–81% della pausa \`retain\`; il cap sembra gratuito e a 2 MB porta 52 → 31 ms. Ma \`asyncpipe\` passa da 0 a 4 raccolte, 385 ms in un programma da 127 ms, e la promozione anticipata ritara old-gen verso full mark-sweep extra (\`retain_wide1\` +182%).

Per la scala iniziale: la pipeline JSON è passata da 60,4 s a 3,86 s. La famiglia \`retain\` è migliorata 36–46% in un round. Il collector conserva un kill switch a full mark-sweep (\`PERRY_GEN_GC=0\`) che esercitiamo, perché il giorno in cui non potremo fare bisection contro di esso non potremo fidarci dei numeri.

---

## Le regole con cui lavoriamo ora

La maggior parte va oltre il GC:

1. **Una modalità che esiste ancora è una decisione non presa.** Elimina il branch perdente o mantieni un braccio che lo eserciti. Lascia una lapide dove l’hai cancellato.
2. **Un gate deve affermare che il soggetto fosse vivo**, non solo che nulla abbia lanciato. «Verde perché non ha eseguito nulla» è peggio del rosso.
3. **Non cadenzare mai un feedback loop con una quantità che non può modificare.** Tre livelock, una forma.
4. **Nessuna banda costante deve cadenzare un processo O(vivo).** Una costante maggiore sposta soltanto il precipizio.
5. **Quando una classe di bug non lascia prove, smetti di indagare e costruisci lo strumento.** Testalo con sabotaggio, compreso il controllo non strumentato.
6. **Un commento non è un cambiamento.** Fissa i default con test, incluso il valore non riconosciuto, e l’accordo tra componenti.
7. **Misura entrambi i bracci su un host, dallo stesso tree, e controlla l’exit code.**
8. **Testa la forma discriminante prima di costruire l’invariante.**
9. **Rifiuta l’ibrido permanente.** «Mantenere il vecchio meccanismo per i casi difficili» trasforma una migrazione in due meccanismi eterni. Fai funzionare il caso difficile o non migrare.

Il collector non è finito. Per la prima volta è *leggibile*: ogni knob controlla qualcosa, ogni gate può fallire, ogni default è fissato da un test e ogni numero pubblicato è stato misurato su una macchina tranquilla dopo aver verificato l’output. Questa leggibilità è costata più lavoro del collector stesso ed è l’unica ragione per cui i numeri dell’ultimo mese si sono mossi.
`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
