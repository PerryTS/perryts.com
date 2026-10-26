---
title: "Les vrais packages npm compilent désormais : axios, zod, express — et une passe de conformité"
excerpt: "Les ~270 releases de v0.5.875 à v0.5.1146 ne portaient pas sur un seul benchmark — elles portaient sur le fait de faire compiler et tourner de vrais packages npm. axios, zod v4, express, fastify et hono fonctionnent désormais ; la parité test262 a bondi (String 60→79 %, Array 61→72 %) ; Windows est passé à Fluent avec Mica ; et DatePicker + drag & drop ont atterri sur chaque plateforme."
date: 2026-06-09
tags: ["npm", "test262", "Windows", "widgets", "milestone"]
---
Le précédent billet s'est arrêté à **v0.5.875** sur l'histoire du GC — combler l'écart que le benchmark d'aya\_koto avait exposé. Ce billet-là parlait de gagner un benchmark. Celui-ci parle d'un autre genre de travail : les quelque **270 releases entre v0.5.875 et v0.5.1146**, livrées sur environ quatre semaines, dont presque aucune n'est un titre de benchmark. Le thème est passé de “aller vite sur un microbenchmark” à **“faire en sorte que du vrai TypeScript et de vrais packages npm compilent et tournent réellement.”** Plus une refonte visuelle complète de Windows et une pile de nouveaux widgets en chemin.

Voici ce qui a été livré, regroupé par sa vraie raison d'être.

## Les vrais packages npm compilent désormais

Le plus gros fil conducteur de cette fenêtre est une passe pour faire compiler les packages npm populaires en binaires natifs et leur faire passer des tests comportementaux — pas seulement “linker sans erreurs,” mais tourner et produire la bonne sortie. La liste qui fonctionne désormais via `perry.compilePackages` inclut **axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, et Colyseus**.

Chacun échouait pour sa propre raison, et chaque correctif est sa propre petite histoire :

-   **zod v4** plantait avec `Cannot read properties of undefined (reading 'onattach')`. Cause racine (v0.5.1144, [#4698](https://github.com/PerryTS/perry/issues/4698)) : `new F()` où `F` est une fonction importée d'un autre module produisait silencieusement un objet vide — le corps du constructeur ne tournait jamais, donc chaque vérification de style `$ZodCheckMinLength` revenait dépouillée de sa propriété `_zod`.
-   **axios + jose** avaient besoin de crypto et de compression que Perry n'avait pas encore : `zlib.createBrotliDecompress`, `crypto.subtle.wrapKey`/`unwrapKey`, `subtle.generateKey` / `encrypt` / `decrypt` pour AES-GCM, et `randomFillSync` (v0.5.972–976).
-   **fastify** se bloquait sur un timeout de polling d'une seconde dans `wait_for_promise` ; nous l'avons remplacé par une attente sur condvar et fait remonter les promesses rejetées en `HTTP 500` au lieu de pendre (v0.5.912).
-   **@hono/node-server** ne pouvait pas lire un corps POST — `c.req.text()` / `.json()` / `.formData()` renvoyaient du vide sur POST/PUT jusqu'à un correctif d'enregistrement parent en v0.5.1142.
-   **chalk, ms, debug, express** heurtaient tous la même forme : une *valeur appelable avec des propriétés attachées* (`chalk.red`, `express()` plus `express.Router`). Trois variantes de ce motif ont été corrigées sur v0.5.935 et la passe npm environnante, plus `util.inherits` + un échafaudage de prototype de stream pour débloquer express (v0.5.990).
-   **dayjs**, livré sous forme de bundle minifié, exerçait un dispatch de méthode de prototype JS-classique (`Class.prototype.m = fn`) que Perry abaissait mal (v0.5.924/932).

Sous tout cela repose la partie qui fait tourner les packages que Perry *ne peut pas* compiler nativement : le **runtime de repli V8** est devenu réel cette fenêtre. Son ModuleLoader lit désormais depuis une carte de modules embarquée, donc un binaire de repli reste **autonome** — pas de `node_modules` volants à l'exécution (v0.5.994). `createServer` fait le pont vers un vrai serveur hyper (v0.5.999), et les globales Web Fetch `Response` / `Request` / `Headers` existent dans le chemin de repli (v0.5.1006). Et l'**`import()` dynamique à la compilation** — `await import('./foo.ts')` en littéral de chaîne résolu au build — a enfin atterri (v0.5.905, [#100](https://github.com/PerryTS/perry/issues/100)).

## Une passe de conformité test262

L'autre fil dominant est la conformité. Nous avons lancé des passes ciblées sur les radars du sous-ensemble test262 et fait bouger l'aiguille sur les built-ins sur lesquels le vrai code s'appuie le plus :

```
built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)
```

Le bond de String est venu de donner à chaque méthode `String.prototype` un dispatch générique sur `this` et de corriger la coercition d'index de `slice`/`substring`. Le bond d'Array était `thisArg` sur les callbacks de dense-array (`forEach`/`map`/`filter`/…), `ToLength` sur les array-like, l'ordonnancement des opérations de la spec, et la validation des arguments à zéro. Le destructuring a gagné le destructuring de paramètres à travers les méthodes de classe simples, génératrices, async-génératrices, statiques et privées.

À côté des chiffres phares, une longue traîne de correction a atterri : `JSON.parse` lève désormais une vraie `SyntaxError` (pas une `TypeError`) et rejette les tokens en trop ; son reviver parcourt via l'algorithme `InternalizeJSONProperty` de la spec ; `Object.prototype.toString` marque correctement les typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp ; `RegExp.prototype.toString` renvoie `/source/flags` ; les générateurs async ont obtenu la bonne sémantique de leurs `yield` qui attendent leur opérande. Ce sont des radars de sous-ensemble, pas la suite complète — Perry grimpe encore — mais la montée ce mois-ci était raide.

## Windows passe à Fluent

Windows a eu une refonte visuelle (la série [#4681](https://github.com/PerryTS/perry/issues/4681)). Les fenêtres Perry adoptent désormais le chrome DWM moderne par défaut — **backdrop Mica**, coins arrondis, et une barre de titre consciente du thème — et les contrôles communs s'affichent via **comctl32 v6** au lieu des défauts de l'ère Windows 95. La window proc gère maintenant `WM_DPICHANGED`, donc une fenêtre reste nette quand on la fait glisser entre des moniteurs à mise à l'échelle mixte au lieu d'être étirée en bitmap.

Crucialement, rien de tout cela n'a réintroduit l'ancienne régression [#1542](https://github.com/PerryTS/perry/issues/1542) “zone noire après redimensionnement” : la zone client est toujours peinte opaque, et le flou Mica/Acrylic plein cadre reste un opt-in explicite via `app.setVibrancy(...)`. Il y a aussi un nouvel échafaudage de backend `--target windows-winui` (WinUI 3) pour les apps qui veulent la pile pleinement moderne, et un correctif petit mais réel qui fait que `perry compile main.ts -o main` produit `main.exe` sur Windows pour que PowerShell le lance vraiment (v0.5.1146).

## Nouveaux widgets, toutes les plateformes

Deux widgets ont atterri rien que le dernier jour, et tous deux couvrent chaque plateforme UI que Perry cible :

-   **DatePicker** ([#4772](https://github.com/PerryTS/perry/issues/4772)) — un contrôle de date compact en style champ : `NSDatePicker` sur macOS, `UIDatePicker` (.compact) sur iOS/visionOS, `SysDateTimePick32` sur Windows, `android.widget.DatePicker` sur Android, GTK4 sur Linux. Une seule surface TS pour tous.
-   **Drag & drop** ([#4773](https://github.com/PerryTS/perry/issues/4773)) — n'importe quel widget peut être une destination de dépôt et une source de glissement pour texte/fichiers/URLs, mappé sur `NSDraggingDestination` (AppKit), `UIDropInteraction` (UIKit), et `View.setOnDragListener` (Android).

```
import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});
```

Plus tôt dans la fenêtre, l'étagère de widgets s'est aussi remplie sur desktop et mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, et une ImageGallery glissable — chacun adossé au vrai contrôle natif sur chaque plateforme. HarmonyOS (ArkTS) a reçu Chart et TreeView (v0.5.893), les deux derniers widgets dont il avait besoin pour atteindre la parité avec les autres.

## GC, internes et stabilité

La plupart de ces 270 releases ne sont pas des titres — ce sont des corrections de bugs et des internes, et c'est tout l'objet de cette phase. Quelques-unes méritent d'être citées :

-   **Le GC a continué.** Le travail de free list conditionnelle du billet sur le GC a continué de se stabiliser, et une classe de bug nette a été fermée : les Promises bridgées en natif sont désormais **épinglées tant qu'elles sont en vol sur un worker tokio** pour que le GC ne puisse pas les balayer avant que la résolution n'arrive (v0.5.923). Si vous avez lancé un fetch async sous charge et vu une collecte fantôme, c'était ça.
-   **Le modèle mémoire est documenté.** Il y a maintenant un approfondissement `internals/memory-model.md` — NaN-boxing, le GC générationnel, la shadow stack, et les write barriers — câblé dans le site de docs (v0.5.933).
-   **Une vague de correctifs de stabilité du codegen** remontés par la passe npm : une arrow `const` au niveau module appelée à l'intérieur d'une étape async reprise ne fait plus SIGSEGV (v0.5.953), `try { await rejected } catch { return X }` ne pend plus à jamais (v0.5.870), et une poignée de crashes `js_is_truthy` / de plage de pointeur brut que de vrais bundles déclenchaient.

## Ménage côté Apple

Plus petit mais réel : `perry setup ios --development` provisionne désormais pour les builds de développement (v0.5.1023), et le chemin de build/link des cross-libraries Apple a été dédupliqué et rendu portable en largeur de pointeur (v0.5.1121/1125) — ce qui a débloqué la matrice de publication npm / Homebrew / APT / winget qui était coincée.

## Où cela nous mène

Le pari derrière Perry a toujours été que le “TypeScript natif” ne compte que si du *vrai* TypeScript tourne — pas un sous-ensemble jouet, les vrais packages que les gens `npm install`. Ce mois-ci, c'était surtout ce travail : moins un chiffre unique dont se vanter, plus une longue poussée sans gloire pour combler l'écart entre “compile” et “marche.” Les radars de conformité et les tests de parité npm sont le tableau de score que nous surveillons désormais, et nous continuerons de publier les chiffres — les bons et les encore-imparfaits.

Source : [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues : [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
