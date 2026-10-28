---
title: "GC generazionale, JSON lazy e benchmark che reggono il controllo"
excerpt: "Perry v0.5.174 → v0.5.306 in tre giorni, più il lavoro su GC e JSON atterrato in parallelo. Il GC generazionale diventa il default. La Small String Optimization diventa il default. La pipeline JSON ottiene una tape lazy che atterra a 75 ms di mediana su validate-and-roundtrip — la migliore del gruppo a tipizzazione dinamica. La pagina benchmark è riscritta con mediana RUNS=11 + p95 + σ, simdjson e AssemblyScript+json-as aggiunti come peer, e ogni debolezza di Perry esposta onestamente."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
L'ultimo articolo si chiudeva alla **v0.5.174** con un titolo solo: Perry stava finalmente vincendo ogni benchmark della suite in-tree sia contro Node che contro Bun. Tre giorni di lavoro e un arretrato di commit su GC + JSON dopo, Perry è alla **v0.5.306** — si tratta di **132 patch release** — e la storia è un'altra. Il titolo non è uno speedup di 547x o una nuova colonna di vittorie. È il lavoro che rende quelle vittorie difendibili.

-   Il **GC generazionale** viene spedito come default. Le fasi A fino a D sono atterrate fra la v0.5.217 e la v0.5.237.
-   La **Small String Optimization** viene spedita come default. Gli step 1.5 → 2 sono atterrati fra la v0.5.213 e la v0.5.216.
-   La **pipeline JSON** ha ottenuto un parser tape-based, parse lazy, stringify lazy, e materializzazione sparsa per-elemento. Il default validate-and-roundtrip è ora **75 ms mediani** — il migliore nel gruppo a tipizzazione dinamica.
-   La **pagina dei benchmark** è stata riscritta da capo a piedi con **RUNS=11 mediana + p95 + σ + min + max**, simdjson e AssemblyScript+json-as aggiunti come pari, le sonde di ottimizzazione separate dai confronti reali, e ogni debolezza di Perry è stata fatta emergere onestamente.

Il contorno è una serie costante di correzioni di correttezza: FIFO dei microtask delle Promise, uguaglianza NaN e formattazione dei numeri ECMAScript, complemento a due di BigInt, AsyncLocalStorage end-to-end, runtime di decimal.js + ioredis + commander, e un segfault in JSON.stringify su un f64 puro che si nascondeva sotto i percorsi tape. In più la toolchain Windows finalmente diventa leggera: LLVM + xwin, niente installazione di Visual Studio richiesta.

## 1\. GC generazionale, attivo di default

Il GC generazionale è stato un roll-out a fasi durato due mesi. Il riepilogo delle fasi che si sono chiuse in questa finestra:

-   **v0.5.217–v0.5.221** — Fase A: scaffolding del runtime per lo shadow-stack, emissione di push/pop, threading della slot-map, mirroring shadow di `Let`/`LocalSet`, e lo scanner delle root.
-   **v0.5.222** — Fase B: split arena nursery + old-gen.
-   **v0.5.223–v0.5.225** — Fase C1–C2: infrastruttura runtime delle write-barrier, il codegen emette la barrier, ogni store sull'heap ci passa attraverso.
-   **v0.5.226–v0.5.228** — Fase C3a–C4: le root del remembered-set fluiscono nel mark + clear; il trace della GC minor salta l'old-gen; tenuring non-moving.
-   **v0.5.229–v0.5.236** — Fase C4b α/β/γ/δ: infrastruttura dei forwarding-pointer, pass di pinning + evacuation, scanner + pinning transitivo, riscrittura dei riferimenti, blocchi nursery inattivi restituiti all'OS, trigger della GC con tetto alla soglia iniziale.
-   **v0.5.237** — Fase D parte 1: `PERRY_GEN_GC=1` di default.
-   **v0.5.238** — Fase D parte 2: `PERRY_SHADOW_STACK=1` di default.
-   **v0.5.239–v0.5.240** — chiusura della documentazione: roadmap finalizzata, appendice con la lineage accademica + industriale (Bartlett 1988, Ungar 1984, Cheney 1970).

La vittoria misurata che ha contato di più: `test_memory_json_churn` è sceso da **115 MB → 91 MB** di RSS di picco nel momento esatto in cui il default del gen-GC è stato capovolto. Le regressioni di calcolo sono state piccole ed elencate senza scuse — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` +1 ms ciascuna. La via di fuga (`PERRY_GEN_GC=0`) recupera i vecchi numeri; il compromesso è stato deliberato, e la pagina dei benchmark ora elenca entrambe le righe affiancate così che chi legge possa scegliere.

## 2\. Small String Optimization, attiva di default

La SSO è una rappresentazione di stringa inline da 22 byte che evita l'allocazione sull'heap per le stringhe corte — le tipiche chiavi JSON (2–8 byte) e i valori brevi finiscono nella forma inline. Il rollout è stato minuscolo in superficie e grande sotto il cofano:

-   **v0.5.213**: infrastruttura SSO (rappresentazione + accessor).
-   **v0.5.214**: armamento dei consumer dello Step 1 + gate `PERRY_SSO_FORCE` per i test.
-   **v0.5.215**: branch a tre vie del codegen `PropertyGet` dello Step 1.5 — fast path per le stringhe inline, fast path per le stringhe sull'heap, slow path per il residuo.
-   **v0.5.216**: capovolgimento dello Step 2 — emissione SSO di default.

I follow-up nella v0.5.279 hanno chiuso l'ultimo bug NaN nelle property-read che è emerso una volta che la SSO era calda, e la correzione del dispatch dei getter cross-module concatenati nella v0.5.272 ne ha chiuso un altro. Entrambi erano sulla punch list prima che il default venisse capovolto; entrambi sono stati spediti senza una regressione di performance.

## 3\. JSON: parse tape-based, lazy di default

La pipeline JSON ha ricevuto la riscrittura più invasiva del periodo. Vecchio comportamento: `JSON.parse` costruiva un albero completamente materializzato di valori NaN-boxed. Nuovo comportamento: `JSON.parse` costruisce un tape da 12 byte per valore e materializza pigramente — solo i valori che leggi davvero pagano il costo di materializzazione. Lo stringify su un parse non modificato è ora una memcpy dell'input originale, lo stesso trucco fast-path che simdjson usa con `raw_json()`.

-   **v0.5.200**: `JSON.parse<T>(blob)` parse schema-directed (Step 1). Una shape nota a tempo di compilazione permette al compilatore di emettere accesso alle chiavi pre-risolto.
-   **v0.5.203**: fondamenta del parse tape-based — Step 2 Fase 1.
-   **v0.5.204**: parse lazy + stringify lazy — Step 2 Fasi 2+4.
-   **v0.5.206**: accesso indicizzato lazy-safe + casi limite — Step 2 Fase 3.
-   **v0.5.208**: materializzazione sparsa per-elemento — Step 2 Fase 5b.
-   **v0.5.209**: walk cursor + soglia di materializzazione adattiva.
-   **v0.5.210**: capovolgimento del parse lazy a default per i blob ≥1 KB.

Il risultato sul workload per cui il tape lazy è stato progettato (10k record, blob da ~1 MB, parse → stringify senza iterazione intermedia):

| Implementazione | Mediana (ms) | p95 (ms) | σ | RSS di picco |
| --- | --- | --- | --- | --- |
| c++ `-O3 -flto` (simdjson)| 24 | 28 | 1.2 | 8 MB |
| perry (gen-gc + nastro lazy)| 75 | 91 | 6.9 | 85 MB |
| ruggine serde_json (LTO)| 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| kotlin (kotlinx.serializzazione)| 473 | 533 | 21.4 | 606 MB |
| assemblyscript+json-as (wasmtime)| 598 | 621 | 10.5 | 58 MB |

Perry a **75 ms mediani** è il runtime a tipizzazione dinamica più veloce nel confronto — batte Bun (259 ms), batte Node (394 ms), batte il JIT server di Kotlin (453 ms). simdjson a 24 ms è il tetto del C++ accelerato SIMD e vive sulla pagina di proposito, non nascosto dietro un cherry-pick. Perry non lo batte. Il punto è mostrare il divario in modo che chiuderlo abbia un bersaglio — tracciato in `docs/json-typed-parse-plan.md`.

Il bench compagno onesto è **parse-and-iterate**: stesso blob, ma ogni iterazione somma `nested.x` di ogni record, il che forza il tape lazy a materializzarsi. Lì Perry atterra a **466 ms** — più lento dei 375 ms della via di fuga mark-sweep perché il tape paga un overhead che non riesce ad ammortizzare. Quella riga è in TL;DR §B. Quando non puoi evitare il lavoro, il tape lazy non finge di poterlo fare.

## 4\. La pagina dei benchmark, riscritta

Tre cose sono cambiate riguardo a come Perry presenta i numeri di performance.

**RUNS=11 mediana + p95 + σ + min + max, non best-of-N.** Il best-of-N fa silenziosamente sparire la latenza di coda; su questo hardware stava nascondendo gli outlier di `accumulate` di Python da 9,4 secondi e i picchi p95 da 5,3 secondi del JSON di Swift. La mediana rimette le code sulla pagina. Il cambio di metodologia è atterrato nella v0.5.248; ogni cella in TL;DR §A e §B è RUNS=11 fresca al **2026-04-25**.

**Le sonde di ottimizzazione sono separate dalla performance reale del runtime.** Le cinque celle che mostrano Perry a 12–34 ms contro Rust/C++ a 98 ms — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — misurano la postura sui flag del compilatore, non il silicio. Adesso sono in una loro sottosezione, con un paragrafo sopra che spiega che `clang++ -O3 -ffast-math` le chiude a entro un millisecondo. Il kernel headline di runtime reale è `loop_data_dependent`: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry sta esattamente al centro del gruppo no-FMA-contract su un kernel dove il compilatore davvero non può ripiegare via il lavoro. Quello è il confronto onesto.

**Pari aggiunti.** simdjson (4.3.0) è ora in entrambe le tabelle JSON — il tetto della throughput di parse C++, sulla pagina così che chi legge possa vedere il divario. AssemblyScript con json-as (1.3.2) è il pari TS-to-native installabile più vicino; porffor ha fatto segfault sul workload a questa dimensione, Static Hermes non si è voluto installare su macOS arm64. Kotlin con kotlinx.serialization si è unita al poliglotta JSON nelle v0.5.241–v0.5.242. Ogni riga è reale, ogni disclaimer è sulla pagina.

## 5\. La tabella di calcolo poliglotta

I kernel headline genuinamente non-foldable, mediana RUNS=11, aggiornati al 2026-04-25 alla v0.5.249:

| Punto di riferimento| Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| fibonacci| 318 | 330 | 315 | 282 | 1022 | 589 |
| loop_data_dependent| 235 | 229 | 129 | 229 | 322 | 232 |
| oggetto_crea| 1 | 0 | 0 | 5 | 11 | 6 |
| cicli_nidificati| 18 | 8 | 8 | 11 | 18 | 21 |

Su `fibonacci`, Perry si allinea al gruppo dei compilati entro 3–15 ms. Il JIT HotSpot di Java è ~11% più veloce grazie all'inlining della chiamata ricorsiva. Su `loop_data_dependent`, il kernel si divide in due cluster di FP-contract: il gruppo FMA-contract a ~128 ms (Go di default, `g++ -O3` su Apple Clang — entrambi fondono `sum * a + b` in un singolo FMADDD) e il gruppo no-contract a 229–235 ms (Perry, Rust di default, Swift, Java senza `-XX:+UseFMA`, Bun) che eseguono FMUL + FADD scalari. LLVM si allinea al gruppo FMA con `-ffp-contract=fast`; Perry non lo abilita di default. `nested_loops` è cache-bound, non compute-bound; tutti atterrano a 8–21 ms.

## 6\. Toolchain Windows, leggera

Gli utenti Windows non hanno più bisogno di un'installazione di Visual Studio. La **v0.5.199** ha chiuso la [#176](https://github.com/PerryTS/perry/issues/176): `perry setup windows` + winget LLVM + xwin sostituiscono l'intero albero VS BuildTools. La `v0.5.201` ha fatto cadere il cfg gate su `find_lld_link` / `find_perry_windows_sdk` così che la scoperta dei path funzioni su ogni piattaforma che fa target su Windows, non solo sugli host macOS.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. Pass di correttezza del runtime

Un tema del periodo: le divergenze silenziose di runtime da V8/JSC sono diventate o correzioni o errori di compilazione. Quelle non banali:

-   **v0.5.255**: complemento a due di `BigInt.fromTwos`/`toTwos`.
-   **v0.5.263**: discriminazione del tipo non-promise di `Promise.all`/`race`/`any`.
-   **v0.5.281**: `NaN==NaN` + formattazione dei numeri ECMAScript (`3 → "3"`, non `"3.0"`; `-0 → "0"`; ecc.).
-   **v0.5.280**: coercion ToInt32 di `NaN`/`Infinity` in `(x) | 0`.
-   **v0.5.284**: FIFO dei microtask delle Promise + propagazione degli handler che hanno fatto throw.
-   **v0.5.286**: `JSON.stringify` di un f64 puro faceva segfault sotto i percorsi tape.
-   **v0.5.277**: `fs.readFileSync` restituisce un Buffer quando non viene passato un encoding (combacia con Node).
-   **v0.5.272**: il dispatch dei getter cross-module concatenati restituiva `undefined`.

I follow-up della stdlib per la issue [#187](https://github.com/PerryTS/perry/issues/187) si sono riempiti: AsyncLocalStorage end-to-end (v0.5.261), runtime di commander + codegen che invoca davvero `.action()` (v0.5.250), codice di decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pattern async-factory di pg + mongo (v0.5.275), e lo stesso bug async-factory su EE/LRU/WSS (v0.5.252).

Sul lato `perry/ui`: la callback del tap delle notifiche (#97) cablata sia su Apple (v0.5.254) che su Android (v0.5.258); schedule + cancel delle notifiche locali (#96, v0.5.244); registrazione + ricezione FCM su Android (v0.5.262).

## 8\. In chiusura

Il pattern di questo periodo non sono numeri da titolo. È il lavoro che fa sopravvivere allo scrutinio le vittorie esistenti: un GC generazionale che cattura i workload ad allocazione sostenuta, una SSO che chiude il divario di costo delle stringhe corte, una pipeline JSON che sfrutta la struttura di “nessuna modifica” del workload più comune, e una pagina dei benchmark che misura mediane invece di best-of-N e mostra il tetto di parse di simdjson a 24 ms sulla stessa riga dei 75 ms di Perry. Chi legge può vedere il divario — e dove sta Perry rispetto al pavimento.

Provalo:

```
# npm (qualsiasi piattaforma)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — niente installazione VS richiesta)
winget install PerryTS.Perry

# Suite di benchmark di default
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

Fonte: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Benchmark: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — Registro delle modifiche: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
