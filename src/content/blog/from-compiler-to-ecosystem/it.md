---
title: "Da compilatore a ecosistema: React, database e build cloud"
excerpt: "Perry cresce da compilatore a ecosistema completo. perry/ui al centro, ORM compatibili con Prisma per MySQL/PostgreSQL/SQLite, notifiche push universali, build distribuiti con pubblicazione su App Store e un layer di compatibilità React — tutto in una settimana."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Una settimana fa, Perry era un compilatore con un toolkit UI. Potevi scrivere TypeScript, compilarlo in un binario nativo e distribuirlo su sei piattaforme. Questa era la storia. Oggi la storia è più grande: Perry sta diventando un ecosistema. Tre ORM per database, notifiche push universali, build distribuite con pubblicazione su App Store e Play Store, un livello di compatibilità React e verifica automatica delle app — tutto arrivato nell'ultima settimana.

Questo post copre cosa è stato rilasciato, perché è importante e come appare il codice.

## perry/ui: Le Fondamenta

Prima di entrare nelle nuove librerie, vale la pena sottolineare cosa sta al centro di tutto: `perry/ui`. Questo è il toolkit UI nativo di Perry — oltre 20 widget che si compilano direttamente in componenti nativi della piattaforma su tutti e sei i target. Non è un wrapper, non è un livello di astrazione, non è una web view. Ogni `Button` diventa un `NSButton` su macOS, un `UIButton` su iOS, un `GtkButton` su Linux, un `android.widget.Button` su Android e un `CreateWindowEx` control su Windows.

`perry/ui` è la superficie UI primaria e più avanzata di Perry. Include gestione reattiva dello stato, contenitori di layout (VStack, HStack, ZStack, SplitView), un Canvas con accelerazione hardware, viste Table con ordinamento delle colonne, il modulo `perry/system` per dialoghi file, accesso al keychain, notifiche e multi-finestra — tutto da TypeScript, tutto compilato in chiamate dirette alle API della piattaforma. Ogni altro approccio UI in Perry, incluso il livello di compatibilità React, è costruito sopra `perry/ui` e si riconduce ai suoi widget.

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

L'oggetto reattivo `State` è la primitiva chiave. Quando un valore State cambia, solo i widget collegati a quello stato si aggiornano — nessun diffing del DOM virtuale, nessun re-rendering dell'intero albero, nessun passaggio di riconciliazione. È il percorso più diretto da TypeScript alla UI nativa della piattaforma che esista.

## Compatibilità React: Un Sottile Livello su perry/ui

Per gli sviluppatori provenienti da React, `perry-react` fornisce un livello di compatibilità che mappa il modello a componenti di React sui widget di `perry/ui`. Puoi usare `useState`, `useRef`, `useReducer` e JSX — e Perry li compila negli stessi widget nativi sottostanti. È un ponte di convenienza, non un motore di rendering separato.

**counter.tsx**

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

Sotto il cofano, ogni elemento JSX si mappa a un widget di `perry/ui`: `<div>` diventa un VStack, `<button>` diventa un Button, `useState` è supportato dallo State reattivo di Perry. È nelle fasi iniziali — Fase 1 con re-rendering dell'intero albero e storage globale degli hook — ma dimostra che il codice React esistente può puntare a piattaforme native attraverso Perry. Stiamo anche esplorando la compatibilità con Angular e Ionic lungo linee simili.

## Tre ORM per Database: API Prisma, Prestazioni Native

Se stai costruendo un server o un'app desktop che comunica con un database, Perry ora ti copre con tre ORM compatibili con Prisma: `perry-prisma` (MySQL), `perry-sqlite` (SQLite) e `perry-postgres` (PostgreSQL). Tutti e tre sono sostituti diretti di `@prisma/client`. Stessa API, stessi pattern di query, ma compilati in codice nativo con FFI diretta al database — nessun motore Prisma, nessun Node.js.

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Same Prisma API — compiled to native SQL via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

Sotto il cofano, ogni ORM è un front-end TypeScript supportato da un livello FFI Rust che usa `sqlx`. Il flusso delle query: TypeScript serializza la query in JSON, la passa attraverso il confine FFI, Rust costruisce SQL parametrizzato, lo esegue tramite il pool di connessioni e serializza il risultato indietro. Lo schema Prisma viene letto al momento della compilazione — zero parsing a runtime.

Le tre implementazioni condividono circa il 95% del codice. Le differenze sono quelle che ci si aspetterebbe: quoting degli identificatori (`` `col` `` vs `"col"`), sintassi dei placeholder ( `?` vs `$1, $2`) e semantica delle transazioni. Tutti e tre supportano l'intera superficie CRUD di Prisma: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — più SQL raw, transazioni e oltre 10 operatori di filtro WHERE.

## perry-push: Notifiche Push Universali

`perry-push` è una singola libreria che gestisce le notifiche push su ogni piattaforma: APNs (iOS/macOS), FCM (Android), Web Push (browser) e WNS (Windows). Ogni provider è un modulo FFI Rust con esattamente tre funzioni: `*_provider_new`, `*_provider_close` e `*_send`.

**notify.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Unified result type for all providers
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

La crittografia è gestita da `ring` — JWT ES256 per APNs e VAPID, RS256 per gli account di servizio FCM, AES-GCM per la crittografia dei payload Web Push. Tutto compilato in codice nativo. Nessun `node-gyp`, nessuna dipendenza da OpenSSL.

## Perry Hub + Builder: Build Cloud Distribuite

Questa è la mossa infrastrutturale. `perry-hub` è un server di orchestrazione build — esso stesso compilato da TypeScript con Perry — che gestisce un pool di worker di build. Carichi il tuo progetto, l'hub lo invia al worker giusto in base alla piattaforma target, e il worker compila, firma e opzionalmente pubblica la tua app.

Oggi esistono due worker: un builder macOS (gestisce i target macOS, iOS e Android) e un builder Linux (gestisce Linux e Android). Entrambi sono binari Rust che si connettono all'hub via WebSocket, scaricano i tarball dei sorgenti, eseguono il compilatore Perry e caricano gli artefatti.

-   **Firma del codice** — notarizzazione Apple per macOS, profili di provisioning per iOS, firma keystore Android
-   **Pubblicazione su App Store** — upload diretto su App Store Connect e Google Play Store
-   **Gestione degli artefatti** — i binari compilati vengono caricati sull'hub con pulizia basata su TTL
-   **Gestione delle licenze** — limiti di frequenza per licenza, code con priorità (il livello pro ha la priorità)

L'hub stesso è un caso di studio affascinante. È un file TypeScript di circa 1.500 righe compilato in un binario nativo da 2 MB da Perry. Esegue Fastify sulla porta 3456 per HTTP e `ws` sulla porta 3457 per WebSocket. Tutto lo stato è in memoria con persistenza JSON — nessun database esterno. È il tipo di server che puoi distribuire con `scp` e un file unit systemd.

## perry-verify: Verifica Automatica delle App

`perry-verify` è un servizio HTTP indipendente che prende un binario compilato e una configurazione, esegue una pipeline di verifica e restituisce risultati strutturati pass/fail con screenshot. Lancia l'app, esegue flussi di autenticazione (deterministici o assistiti da AI), controlla lo stato e cattura le prove.

Esistono adattatori per piattaforma per macOS (tramite API di accessibilità), Linux (AT-SPI) e stub per iOS Simulator e Android Emulator. Il livello AI usa Claude per l'autenticazione di fallback e la verifica dello stato quando i controlli deterministici non sono possibili. È progettato per inserirsi nella pipeline di build dell'hub come passaggio post-build: compila, firma, verifica, pubblica.

## Pry Arriva Ovunque

[Pry](/it/blog/building-pry/), il visualizzatore JSON nativo che abbiamo costruito come vetrina di Perry, ora è disponibile su cinque piattaforme. È sul [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) e su [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), con binari nativi per Linux e Windows. Stesso codebase TypeScript, cinque punti di ingresso specifici per piattaforma, cinque binari nativi. È la prova più concreta che l'intero approccio funziona da capo a fondo — dal sorgente TypeScript alla pubblicazione sull'App Store.

## Cosa Significa Tutto Questo

Un compilatore è interessante. Un ecosistema è utile. Nell'ultima settimana, Perry è passato da "puoi compilare TypeScript in nativo" a "puoi costruire un'app completa con UI nativa, un database Prisma, notifiche push e build che si auto-pubblicano sull'App Store."

I pezzi stanno iniziando a connettersi:

-   **perry/ui** è il percorso più diretto da TypeScript alla UI nativa della piattaforma — stato reattivo, oltre 20 widget, zero livelli di astrazione
-   **perry-prisma/sqlite/postgres** significa che il codice database esistente si porta con modifiche minime
-   **perry-push** significa notifiche push native senza librerie per-piattaforma
-   **perry-hub + builder** significa che puoi passare da `perry publish` all'App Store in un solo passaggio
-   **perry-verify** significa test automatici dell'output compilato, non solo dei sorgenti
-   **perry-react** significa che gli sviluppatori React possono avvicinarsi a Perry usando pattern familiari, tutti mappati su perry/ui sottostante

Queste non sono cose teoriche. Ogni libreria elencata qui ha codice funzionante, test e documentazione. Diverse sono già usate in produzione — il sito landing di Perry stesso gira su un server Fastify compilato con Perry, e Pry è attivo in due app store.

## Cosa Viene Dopo

La roadmap immediata:

-   **Espansione di perry/ui** — drag and drop, etichette di accessibilità, menu contestuali personalizzati, più primitive di layout
-   **Integrazione di perry-verify** — verifica automatica nella pipeline di build
-   **Compatibilità con i framework** — miglioramento dei livelli React, Angular e Ionic come rampe di accesso a perry/ui
-   **Supporto regex completo** — motore regex compatibile ECMAScript compilato in nativo

Segui i progressi su [GitHub](https://github.com/PerryTS/perry), o consulta la [roadmap](/it/roadmap/) per il quadro completo.
