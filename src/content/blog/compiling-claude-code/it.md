---
title: "Compilare Claude Code: un bundle minificato, 160 correzioni al compilatore"
excerpt: "Abbiamo provato a trasformare in un binario nativo il file cli.js minificato da 13 MB distribuito da npm per Claude Code. Un mese dopo si avvia, effettua l’accesso, riceve vere risposte dall’API in streaming e visualizza ciò che digiti. Nel frattempo sono state integrate 160 pull request in Perry: da un MessageChannel che non faceva nulla a una barriera di scrittura del GC mancante negli header RegExp."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
Il 16 giugno l'istruzione era una frase: *"trova la cartella del codice claude e prendi il javascript (compilato, minimizzato) da lì... vediamo se riusciamo a compilarlo :D"* Quando è arrivata l'ovvia obiezione - che sarebbe stato brutale - la risposta era la tesi vera e propria: *"è brutale ma anche una vera prova delle nostre capacità e dei nostri limiti, ecco perché voglio farlo. Niente può sostituire le app del mondo reale in termini di ricerca dei limiti."*

Un mese dopo, un binario compilato da Perry della Anthropic di Claude Code CLI di Anthropic lancia ed esegue `/login` attraverso il flusso OAuth, trasmette una risposta reale dall'API e dipinge i caratteri digitati. Per arrivarci ci sono volute **160 richieste pull unite in Perry tra il 20 giugno e il 17 luglio**: una barriera di scrittura `MessageChannel` no-op, una barriera di scrittura GC mancante su RegExp, un'istruzione `continue` che girava solo sulla vera API e mai sul nostro mock, e circa centocinquanta altre.

Questo post è il tour. Non perché compilare la CLI di qualcun altro sia un prodotto (non rilasciamo questo binario e mai lo faremo), ma perché è lo strumento di ricerca bug più produttivo che abbiamo mai indicato a Perry.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="Un terminale macOS che esegue un binario Perry compilato Claude Code da /tmp/verify: il banner v2.1.112, un /login riuscito, il messaggio &quot;fantastico, chi sei?&quot;, una risposta in streaming e un'uscita pulita alla shell." width="1708" height="926"><figcaption>Nessun <code>node</code> in quella riga di comando. <code>/tmp/verify/cc_fptest_dbg25</code> è un singolo eseguibile nativo prodotto dalla <code>perry compile</code> dal <code>cli.js</code> fornito: accesso, streaming di una risposta reale ed uscita in modo pulito su Ctrl-C. Poiché il nome del file invita alla domanda: <code>dbg25</code> è la venticinquesima build di una serie diagnostica dall'indagine GC ancora in esecuzione così come è stata scritta - simboli di debug, più elisione della barriera di scrittura disattivata in modo che <em>ogni</em> archivio di array emetta una barriera. Comporta più spese generali di una build ordinaria, non meno. La tabella delle prestazioni più in basso è stata misurata su diversi binari non strumentati.</figcaption></figure>

## Cosa significa in realtà “compilare Claude Code”

La destinazione della compilazione è il file distribuito nel pacchetto npm. `npm pack @anthropic-ai/claude-code@2.1.112` ti offre un `cli.js`: **13 MB di JavaScript** minimizzato e autoeseguibile con un `#!/usr/bin/env node` shebang. Nessuna fonte, nessuna mappa sorgente, nessuna nostra fase di creazione. Indichiamo `perry compile` a quel file, non modificato, e chiediamo un eseguibile nativo.

Perry lo analizza per circa 37 minuti e produce circa 207 MB di IR in **16.023 funzioni**, che si collegano a un file binario da ~180 MB. Ognuna di queste funzioni ha nomi di una lettera e nessuna annotazione di tipo, e il tutto deve funzionare in anticipo: niente JIT, niente `eval`, niente pigri aiuti a un interprete quando il compilatore indovina. Se Perry abbassa erroneamente una di queste 16.023 funzioni, non c'è nulla che possa rilevarlo.

La scala di punteggio deriva dalla nostra suite di stress interna ed è deliberatamente spietata:

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

`correct` è l'unico livello che conta. Node v26 è l'oracolo; tutto ciò che non è identico in byte a ciò che Node stampa è un bug Perry fino a prova contraria.

## Perché questa app in particolare

Un agente di codifica CLI è una pila insolitamente ostile di JavaScript da compilare in anticipo. In un binario ottieni: React che si riconcilia in un terminale tramite Ink, un lettore stdin in modalità raw, un renderer ANSI/emoji saturo che esegue regex su ogni fotogramma, un SSE client HTTP, schemi zod creati all'avvio, un flusso OAuth, `worker_threads`, `MessageChannel` utilizzato come pianificatore di macrotask, WeakMaps che contengono lo stato della fibra, `require` dinamico e un livello di filesystem che scrive su stdout tramite descrittore di file.

Ognuno di questi è un sottosistema diverso di Perry e l'app li esercita *insieme*, su larga scala, sotto la pressione GC, per minuti alla volta. Le nostre suite di test: 3.000 unit test Rust, migliaia di programmi di regressione TypeScript, matrice di parità Node API, test262: sono tutti orientati a individuare comportamenti noti. Questo pacchetto è orientato alla ricerca di comportamenti che nessuno ha pensato di individuare.

## La sequenza degli ostacoli

Il lavoro è andato in una sola direzione: eliminare il muro attuale e trovare quello successivo. Compresso:

| Data| Traguardo |
| --- | --- |
| 21 giugno| `--help` viene eseguito in modo nativo, codice di uscita 0 |
| 22 giugno| I veri sottocomandi smettono di bloccarsi all'avvio |
| 23 giugno| `-p` apre un socket TCP STABILITO su api.anthropic.com |
| 24 giugno| Gli schemi zod vengono costruiti correttamente; percorso di autenticazione raggiunto |
| 27 giugno| Il rendering TUI: logo, casella di benvenuto, frame di input |
| 9 luglio| Primo round trip completo: `-p` contro l'API reale stampa la risposta, exit 0 |
| 10 luglio| Cablaggio differenziale Node-vs-Perry: 12/12 identici |
| 13 luglio| Byte identico al Node su `-p` testo + JSON, TUI rendering, filesystem |
| 16 luglio| I caratteri digitati appaiono finalmente nella riga di input |
| 17 luglio| Ciclo completo convalidato manualmente: avvio → risposta `/login` → risposta API → digitazione |

Ogni correzione veniva upstream come richiesta pull autonoma con una riproduzione minima e generica. Nessuno di loro menziona l’app da cui provengono: quella era una regola fin dal primo giorno. Un utente Perry che legge il registro delle modifiche vede "`continue` nei driver for-await che hanno saltato l'avanzamento dell'iteratore", non "stavamo cercando di compilare la CLI di qualcuno." Gli insetti sono realmente indipendenti dal veicolo che li ha emersi.

## Cinque bug software di cui vale la pena discutere

### 1. MessageChannel è stato un educato no-op

`--help` ha funzionato il 21 giugno. Ogni sottocomando *real*: `doctor`, `agents`, `mcp list`: sospeso per sempre. Non occupato: `sample` ha mostrato il processo parcheggiato, `lsof` non ha mostrato processi figli, nessun socket, solo due pipe.

`MessageChannel` di Perry ha installato `postMessage` come no-op e `onmessage` come `null`. Ciò è innocuo fino a quando non incontri il modello di pianificazione React, che utilizza un canale di messaggi come pianificatore di macrotask:

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

Il messaggio è stato eliminato, la richiamata non è mai stata eseguita e il loop degli eventi è rimasto inattivo per sempre sul proprio canale di riattivazione. [#5530](https://github.com/PerryTS/perry/pull/5530) ha fornito alle porte una consegna reale sullo stesso thread: coppie intrecciate, una coda FIFO, consegna tramite la macrotask `setImmediate` e una macrotask GC root scanner in modo che i messaggi in coda sopravvivano alla raccolta.

### 2. Una funzione di accesso su Object.prototype costa 42 secondi

Prima del blocco, gli stessi sottocomandi erano vincolati alla CPU per decine di secondi. La profilazione puntava al percorso `[[Set]]` generico e la causa principale era un flag globale del processo.

Perry ha un percorso rapido per le scritture di proprietà dinamiche, basato su "`Object.prototype` attualmente contiene descrittori?" Il bundle installa esattamente una funzione di accesso su `Object.prototype` all'avvio. Ciò ha invertito il flag a livello di processo e da quel momento in poi *ogni* scrittura dinamica nel programma ha intrapreso il lento percorso di intercettazione, che è O (conteggio delle chiavi proprie). La costruzione di un oggetto ampio è diventata quadratica:

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) ha sostituito il flag globale con una domanda per chiave: *`Object.prototype` ha una proprietà propria per **questo** chiave?* Una chiave assente non può essere intercettata, quindi la scrittura è sicura per il percorso rapido. 42 s → 23 ms, con intercettazione ancora corretta.

Poi la stessa forma è riapparsa per le istanze di classe, che il percorso rapido escludeva completamente: una build da 20.000 tasti su un oggetto semplice ha richiesto 25 ms, su un'istanza di `class` 44 secondi. Risolvere questo problema con attenzione era importante: un ingenuo controllo della catena di prototipi avrebbe saltato i setter ereditati e danneggiato silenziosamente i dati, quindi [#5528](https://github.com/PerryTS/perry/pull/5528) risolve il prototipo dell'istanza attraverso il registro della classe e aggiunge un indice a chiave larga O(1). Ritorno a 30 ms e di nuovo lineare.

### 3. Il bug che solo la vera API potrebbe attivare

Questo è quello di cui parliamo alla gente. All'inizio di luglio il binario compilato avrebbe fatto una rivolta `-p` completa contro il nostro server fittizio locale: connettersi, POST, leggere il flusso SSE, stampare la risposta, uscire da 0. Contro l'effettivo Anthropic API è rimasta bloccata per sempre, ogni volta.

La catena di debug era: un mock forward-proxy ha dimostrato che l'intera risposta 200 è arrivata intatta → un mock di replay, ha alimentato il flusso di byte reali catturati, ha riprodotto il blocco localmente → dividendo in due l'elenco degli eventi SSE ha trovato l'evento colpevole → una riproduzione di dieci righe.

La vera API invia `event: ping` frame. La nostra finta non è mai riuscita. E `ping` è l'unico evento che il ciclo di flusso dell'SDK salta con un semplice `continue`. Perry ha ridotto `for await` in un driver il cui avanzamento dell'iteratore si trovava nella *fondo* del corpo del loop:

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

Sei siti di abbassamento separati avevano la stessa forma. [#6196](https://github.com/PerryTS/perry/pull/6196) ha spostato l'anticipo in alto in tutti. La lezione che continuiamo a imparare di nuovo: una finzione che passa è la prova della finzione.

### 4. Una regex sopravvissuta alla propria stringa di modello

Il TUI esegue il rendering, quindi muore di `SIGBUS` in pochi secondi: 12 arresti anomali in 12 esecuzioni con un sistema di stress con ridimensionamento della finestra, ogni volta a indirizzi diversi in funzioni diverse. Settimane di indagini hanno riguardato le teorie GC che i test A/B hanno poi confutato, inclusa una delle nostre "correzioni" che si è rivelata non corretta e ha dovuto essere ritirata.

La vera causa principale erano quattro righe di Rust. `js_regexp_new` alloca un'intestazione RegExp e memorizza i suoi puntatori a stringa `pattern` e `flags` puntatori a stringa con scritture non elaborate — **nessuna scrittura barriera**. Un oggetto di vecchia generazione che punta ad una corda giovane e fresca, di cui il collezionista non ha mai parlato del limite. Il GC minore ha spazzato via quelle stringhe da un RegExp attivo e la lettura successiva dello slot liberato ha generato un errore.

Perché è apparso solo qui? Poiché l'interfaccia utente di un terminale è satura di regex (l'analisi ANSI e la misurazione della larghezza delle emoji vengono eseguite su ogni singolo fotogramma), quindi la finestra tra l'allocazione e la raccolta viene attraversata migliaia di volte al minuto. La nostra riproduzione minima, 6.000 espressioni regolari più un abbandono deliberato dell'allocazione, *non* l'ha mai attivata. Il pacchetto lo ha attivato ogni volta. [#6288](https://github.com/PerryTS/perry/pull/6288) ha aggiunto la barriera di cui entrambi i campi hanno sempre avuto bisogno.

### 5. I caratteri che hai digitato erano lì. La cornice li ha buttati via.

Il muro più ostinato: l'intera interfaccia utente dipinta perfettamente: casella di benvenuto, riquadro di input, blocco cursore, riga di stato. Digitando `/` si apriva il menu dei comandi, quindi la pressione del tasto raggiungeva React. Ma le lettere non sono mai apparse sulla riga di input.

Le build strumentate hanno mostrato che Perry dipingeva correttamente il carattere digitato in ogni fase, quindi `onRender` lanciava *dopo* il colore — in un Ink `try/catch` che lo ha inghiottito. Il frame è stato abbandonato prima del commit, quindi ogni rendering successivo è stato creato su un frame vuoto. L'app sembrava completamente sana mentre ti ignorava.

Dietro questo sintomo si nascondevano due bug indipendenti:

-   [#6453](https://github.com/PerryTS/perry/pull/6453) — Diminuzione in linea di Perry di `charAt`/`codePointAt`/`split` chiamato ToString su un ricevitore non di stringa senza la necessaria protezione di coercibilità. Quindi `undefined.codePointAt(0)` ha restituito tranquillamente `117` — il punto di codice di `"u"`, dalla stringa `"undefined"` — invece di lanciare. Un bug che *inventa* dati plausibili è molto peggio di uno che si blocca.

-   [#6471](https://github.com/PerryTS/perry/pull/6471): il vero bloccante. Quando un array cresce, Perry lascia uno stub di inoltro permanente al vecchio indirizzo. L'operazione minore stava recuperando quegli stub mentre un genitore di vecchia generazione ne indicava ancora uno: la cache dei caratteri del renderer conteneva un puntatore di pre-crescita su una pagina che non era sporca. La lettura dello stub stantio ha prodotto una lunghezza spazzatura e ogni frame è stato interrotto. I minorenni ora conservano tutti gli stub; le tracce complete le recuperano tramite mark.


Risolti quelli esposti a un terzo livello: gli oggetti nati neri durante la marcatura incrementale non venivano mai tracciati, quindi tutto ciò che era raggiungibile solo attraverso di essi veniva spazzato mentre era attivo ([#6494](https://github.com/PerryTS/perry/pull/6494)) e la maschera di layout segnalava slot di overflow sottostimati, quindi il raccoglitore li saltava ([#6506](https://github.com/PerryTS/perry/pull/6506)). Questi due sono il tipo di buchi di solidità che producono un crash misterioso uno su cinquanta in *qualsiasi* programma compilato. Non li avremmo trovati con una suite di test.

## Come eseguire il debug di un file binario minimizzato da 13 MB

Nessuno degli elementi precedenti è trovabile leggendo il codice. Gli strumenti che lo hanno reso trattabile:

-   **Un cablaggio differenziale con Node come oracolo.** Ogni ipotesi diventa un piccolo programma TypeScript eseguito sia sotto `node --experimental-strip-types` che sotto Perry binario, confrontato byte per byte. Ha rilevato dei bug da solo: un'espressione di classe utilizzata solo come `instanceof` lato destro è stata eliminata dal codice morto perché undici passaggi di analisi non riuscivano a vedere attraverso quel tipo di nodo ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Tre server API fittizi.** Un mock di registrazione, un proxy di inoltro che acquisisce byte di risposta reali e un server di riproduzione che restituisce in modo deterministico quei byte esatti. Il server di riproduzione è ciò che ha trasformato il "blocco della produzione" in una riproduzione locale.

-   **Un cablaggio PTY che risponde alle domande del terminale.** Uno stupido pseudo-terminale ti dà 50 byte e uno stallo. L'app verifica la posizione del cursore (`ESC[6n`), gli attributi del dispositivo (`ESC[c`) e il colore di sfondo (`OSC 11`) e attende le risposte prima di dipingere. Rispondi e otterrai la schermata di benvenuto completa da 3.331 byte e un rendering comparabile in byte tra Node e Perry.

-   **Mappe di collegamento per la simbolizzazione.** I file binari eliminati da 180 MB producono rapporti sugli arresti anomali pieni di offset grezzi; L'output `ld64 -map` più uno script bisect li trasforma nuovamente in nomi di funzioni.

-   **A/B tutto.** La regola emersa, scritta in maiuscolo in cima alle note di trasferimento: *non ereditare mai una teoria: testala.* Quattro ipotesi consecutive sulla causa principale di un bug sono state confutate ciascuna da esecuzioni A/B. Un segnale del verificatore che abbiamo inseguito per giorni ("445 bordi vecchi→giovani mancanti") si è rivelato essere un artefatto di misurazione: il controllo si svolgeva tra la cancellazione e il ripristino del set ricordato. Il commento stesso del codice metteva in guardia a riguardo.


## Dove si trova effettivamente

Onestamente: funziona ed è lento.

Funzionante oggi, identico in byte a Node dove l'output è comparabile: avvio, `--help`, `--version`, modalità one-shot `-p` rispetto a vera API inclusa la classificazione degli errori e la busta JSON, il rendering completo TUI, il flusso OAuth `/login`, streaming risposte e digitazione. Ecco l'intero ciclo in una sola ripresa: avvio, `/login`, una domanda, una risposta in streaming, uscita:

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Il tuo browser non supporta video incorporati.</video><figcaption>63 secondi, senza audio, tagliato in due punti: la metà del browser dell'handshake OAuth e un macOS. Tutto nel terminale è in tempo reale e non modificato, incluso il ritardo di avvio, che è la cosa più lenta in questo post.</figcaption></figure>

Due cose sono ancora aperte e potrebbero benissimo essere una cosa. L'input smette di essere registrato dopo circa un minuto di uso interattivo prolungato: nessun arresto anomalo, nessun errore, si ferma e basta. E `ESC` non interrompe una risposta in volo, anche se `Ctrl-C` ora si chiude in modo pulito, cosa che non accadeva una settimana fa (questa è l'uscita che vedi alla fine della registrazione). Un percorso di uscita che funziona mentre un percorso di interruzione non porta allo stesso sospetto della morte dell'input: eventi di pressione dei tasti che smettono di raggiungere l'app, piuttosto che qualcosa di sbagliato nei gestori dell'app.

Il quadro delle prestazioni, misurato rispetto a Node che esegue lo stesso pacchetto, prima e dopo il primo round della campagna sulla velocità che ha dato inizio al giorno in cui è arrivata la correttezza. Questi sono stati rilasciati da `cc_final` e `cc_perf2` il 17 luglio: build ordinarie senza diagnostica compilata, non il binario strumentato nello screenshot sopra:

| Metrica| Node| Perry (17 luglio)| Perry (dopo) |
| --- | --- | --- | --- |
| `--version` | 328 ms| 1.168 ms| **227 ms** |
| `--help` | 715 ms| 5.071 ms| 4.099 ms |
| TUI prima vernice| 0.76 s | 10.9 s | 8.4 s |
| Tasto da premere → colora (pag.50)| 2,2 ms| 111–143 ms| 119–138 ms |
| Spazio di memoria, inattivo| 290 MB totali| ~420 MB in salita| ~420 MB in salita |

`--version` ora **batte Node** e la vittoria è stata imbarazzante in origine: l'eseguibile compilato esportava 300.281 simboli, quindi circa l'80% di quel lancio era dyld eseguendo la coalescenza a definizione debole. Un flag del linker ha portato le esportazioni a 3 e il file binario da 228 MB a 197 MB ([#6533](https://github.com/PerryTS/perry/pull/6533)). Costruire ogni espressione regolare univoca una volta invece che due volte ([#6534](https://github.com/PerryTS/perry/pull/6534)) e memorizzare nella cache il controllo di intercettazione per negozio ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) ha fatto il resto.

Su quei 197 MB, prima che qualcuno lo porti avanti: Perry collega staticamente il proprio runtime ed emette codice macchina per tutte le 16.023 funzioni in anticipo senza nulla da eliminare: un bundle autoeseguibile rende essenzialmente tutto raggiungibile, quindi non esiste un bundle incrociato DCE su cui appoggiarsi, il che significa che 197 MB sono un intero programma *più* il suo runtime in un file, contro i **138 MB che il Node v26 pesa prima di aver letto una singola riga del tuo JavaScript**.

La riga della sequenza di tasti è quella da leggere attentamente, perché il numero "dopo" sembra peggiore. Non lo è: quelli sono intervalli tra esecuzioni ripetute e si sovrappongono, quindi la mediana non si è spostata in nessuna delle direzioni: si tratta di una varianza da esecuzione a esecuzione, non di una regressione. È anche esattamente quello che ci aspettavamo. Tutte e tre le modifiche riguardano il passaggio del collegamento, la costruzione dell'espressione regolare e il percorso *archivio*; la mediana della pressione dei tasti è dominata dal percorso *lettura* della proprietà, dall'overhead di rooting per chiamata e dai passi GC di 40–80 ms che arrivano all'interno delle finestre di pressione dei tasti. La prova è arrivata nel round successivo: get/set fast lanes ha reso un microbenchmark di accesso al campo 3 volte più veloce e ha spostato questo numero di un nulla ([#6539](https://github.com/PerryTS/perry/pull/6539)). Una vittoria del microbenchmark che non viene visualizzata nell'app è una diagnosi sbagliata e ne abbiamo avuta una.

La linea della memoria è la campagna corrente. Il raccoglitore di copie di Perry *può* compattare: il problema è che diventa idoneo circa una volta ogni 45 secondi di inattività, quindi il vivaio ricresce fino a ~300 MB tra un'attivazione e l'altra mentre Node rimane piatto compattandosi continuamente. Si tratta di un problema di frequenza di trigger, non di un problema di algoritmo, che è una situazione molto migliore in cui trovarsi rispetto a dove ci trovavamo a giugno.

Nessuno dei quali è parcheggiato. La campagna relativa a memoria e prestazioni è *attiva* man mano che questo post viene pubblicato: il lavoro di attivazione GC è in esecuzione oggi, su questo esatto codice binario, quindi la tabella delle prestazioni sopra è la parte di questo post che più ci aspettiamo di invalidare, e prima è, meglio è. La correttezza ha richiesto un mese di muri per superare. Ciò che resta è un problema di frequenza di trigger e un problema di percorso di lettura, entrambi compresi, entrambi già in atto. Ci aspettiamo che questa cosa sembri fluida piuttosto che semplicemente corretta, e ci aspettiamo che ciò accada presto.

## Perché lo facciamo

Nessuna delle 160 correzioni riguarda il Claude Code. Una barriera di scrittura mancante sulle intestazioni RegExp corrompe la memoria in *qualsiasi* programma che crea espressioni regolari sotto carico. `for await` con un `continue` gira in qualsiasi stream consumer. L'eliminazione dei messaggi da parte di `MessageChannel` interrompe ogni app a forma di pianificatore React. Il flag descrittore `Object.prototype` ha reso *ogni* programma che tocca `Object.prototype` quadratico nel suo oggetto più ampio.

Quei bug erano tutti presenti in Perry mentre CI era verde, mentre i numeri di test262 aumentavano, mentre la matrice di parità Node diceva il 97%. Ci sono voluti tredici megabyte di JavaScript minimizzato di qualcun altro, che hanno svolto un lavoro reale su una vera API in un terminale reale, per liberarli.

C'è ancora una cosa, ed è la parte che troviamo più divertente. Perry non è stato scritto a mano: gran parte di esso, inclusa gran parte di *questa* campagna, è stata scritta con Claude Code. I server fittizi, il cablaggio PTY, il corridore differenziale, le lunghe notti passate a dividere in due un bug GC alle quattro del mattino: sessioni di agenti, revisionate e unite da un essere umano. Non tutto Perry, e non senza molte discussioni. Ma basta che la frase sia vera in entrambi i sensi.

Il compilatore che ha mangiato Claude Code è stato, in parte sostanziale, creato da Claude Code.

Continueremo a farlo. I prossimi target sono già in coda.

* * *

Perry non è affiliato o approvato da Anthropic. Claude Code è un marchio di Anthropic PBC. Il binario qui descritto è stato creato dal pacchetto npm pubblicato pubblicamente esclusivamente come destinazione di test del compilatore e non è distribuito.
