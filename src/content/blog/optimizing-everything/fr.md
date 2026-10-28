---
title: "Tout optimiser : une semaine, 68 versions et une accélération JSON de 547x"
excerpt: "Perry v0.5.13 → v0.5.80 en sept jours. JSON.parse comble un écart de 547x avec Node. mimalloc devient l'allocateur global. Inline caches, transitions de shape, slots Buffer typés, opérations bitwise natives en i32, scalar replacement, et une event loop native qui garde les serveurs Fastify et WebSocket en vie."
date: 2026-04-17
tags: ["performance", "llvm", "JSON", "GC", "server", "milestone"]
---
Le dernier billet de blog a été publié avec Perry en v0.5.12. Aujourd'hui, nous en sommes à la v0.5.80. Soit **68 releases de correctifs en sept jours**, presque entièrement concentrées sur une seule chose : transformer chaque chemin lent restant en chemin rapide.

La bascule vers LLVM en v0.5.0 a retrouvé la parité avec Cranelift en v0.5.12. C'était la fin d'une histoire et le début d'une autre. LLVM voit tout désormais. La question est passée de « pourquoi est-ce lent ? » à « pourquoi n'est-ce pas déjà rapide ? » — ce qui est une question beaucoup plus traitable.

Ce billet est une visite guidée de la semaine. JSON a obtenu une accélération de 547x. mimalloc est devenu l'allocateur global. L'accès aux propriétés a gagné un inline cache monomorphe. Les buffers ont gagné des slots de pointeurs typés avec des métadonnées `noalias`. Les serveurs Fastify et WebSocket ont cessé de planter après une minute. Et les benchmarks ont bougé à nouveau.

## 1\. JSON : combler un écart de 547x

En v0.5.29, le JSON.parse de Perry sur un tableau de 20 enregistrements était **547x plus lent que Node**. En v0.5.46, il était 1,3x. Ce chiffre est le plus grand delta unique de la semaine, et il vaut la peine d'être parcouru parce que chaque autre optimisation dans ce billet est une variation sur le même thème : ne faites pas le travail que vous n'avez pas à faire.

Le parser original allouait un Vec par propriété, un Vec de clés par objet, et un thread-local gardé par RefCell pour le cache de clés. Il copiait chaque chaîne. Il re-hachait chaque nom de champ. Il construisait une toute nouvelle shape d'objet pour chaque enregistrement, même quand les 20 enregistrements avaient exactement les mêmes champs dans exactement le même ordre. Le parser de Node gère cela en remarquant le motif et en partageant une seule shape entre tous les enregistrements. Celui de Perry ne le faisait pas.

La correction s'est déroulée en quatre étapes :

1.  **Internement des clés via un `PARSE_KEY_CACHE` thread-local** (v0.5.45). Le premier enregistrement alloue N chaînes de clés ; les enregistrements 2 à 20 en allouent zéro. Les clés répétées se résolvent vers le même pointeur, ce qui les rend utilisables comme clés de recherche du cache de shapes sans strcmp.
2.  **Partage de shapes via le cache de transitions** (v0.5.45). Les objets construits par `js_object_set_field_by_name` parcourent le même graphe de transitions. Quand le schéma se répète, le pointeur `keys_array` est partagé, et c'est ce dont un inline cache polymorphe a besoin pour toucher.
3.  **Parsing de chaînes sans copie + construction incrémentale d'objets** (v0.5.46). `parse_string_bytes` retourne maintenant `ParsedStr::Borrowed(&[u8])` quand il n'y a pas d'échappements backslash — ce qui est le cas courant pour chaque clé et la plupart des valeurs. `parse_object` écrit les champs directement au lieu de les collecter d'abord dans un Vec.
4.  **Suppression du GC pendant le parse** (v0.5.60, ferme #59). Parser un grand tableau alloue des milliers de petits objets dans une boucle serrée. Chacun déclenchait la vérification du seuil GC. Positionner un drapeau « parsing en cours » diffère la collecte jusqu'à ce que le parse retourne — même taille de tas effective, beaucoup moins de branches de comptabilité.

Puis stringify. JSON.stringify sur des tableaux homogènes — la même shape, des millions de fois — faisait une itération complète des propriétés par objet, ce qui, pour un tableau à shape stable, est du pur gaspillage. Une correction en cinq étapes a également comblé la majeure partie de cet écart :

-   v0.5.62 : chemins rapides itoa / ryu pour les nombres, vérification de référence circulaire basée sur la profondeur au lieu d'un HashSet.
-   v0.5.63 : garde `toJSON` + cache de clés persistant + dispatch inline (les trois coûts par appel qui s'additionnaient).
-   v0.5.65 : template de stringify pour shape homogène + chemin rapide d'échappement ASCII. Quand chaque élément a la même shape, l'échafaudage clé/deux-points/virgule est précalculé une fois.
-   v0.5.70, v0.5.72, v0.5.75 : cache de template de shape par appel, fermeture de l'écart GC restant après parse, élimination du surcoût fixe par appel restant.
-   v0.5.79 : le chemin pour petites valeurs. Les nombres, booléens et chaînes courtes passent par un chemin direct qui ne met en place aucune de la machinerie d'objets.

Le résultat cumulé : un pipeline JSON qui était **547x en retard sur Node** au début de la semaine est maintenant à environ **1,3x en retard sur le parse et compétitif sur stringify**, sur des charges de travail réalistes.

## 2\. L'histoire de l'allocateur

Perry alloue beaucoup. Chaque littéral d'objet, chaque littéral de tableau, chaque concaténation de chaînes, chaque closure. L'allocateur est chaud, et pendant la majeure partie de v0.5, c'était l'allocateur système par défaut de Rust plus une arena thread-local pour les valeurs à courte durée de vie.

v0.5.67 a remplacé l'allocateur global par **mimalloc**. C'est un changement d'une ligne dans Cargo.toml qui se rentabilise immédiatement sur toute charge de travail qui fait beaucoup de petites allocations — ce qui est le cas de tout programme TypeScript. v0.5.66 l'a précédé en consolidant tout l'état thread-local de `gc_malloc` en un seul accès TLS par appel, afin que le chemin vers mimalloc soit aussi peu coûteux que possible.

v0.5.68 est allé plus loin avec les **chaînes allouées en arena**. Les chaînes à courte durée de vie (résultats de concat intermédiaires, morceaux de `split()`, scratch du parser) contournent entièrement l'allocateur global et atterrissent dans une arena bump par thread qui se réinitialise aux frontières naturelles. Pour le parsing JSON, c'était à lui seul un gain de pourcentage à deux chiffres.

Et les deux optimisations qui n'allouent pas du tout :

-   **Remplacement scalaire des objets non-échappants** (v0.5.17, puis littéraux d'objets en v0.5.76). Si un objet ne quitte jamais sa fonction englobante, il n'a pas besoin d'exister. Ses champs deviennent de simples variables locales. LLVM gère cela d'emblée une fois qu'on arrête de cacher l'objet derrière un appel d'allocateur opaque.
-   **Remplacement scalaire des tableaux non-échappants** (v0.5.73). Même idée — si le tableau ne s'échappe pas, ses éléments deviennent des valeurs SSA et toute l'allocation disparaît.

Pour le chemin des littéraux de tableau spécifiquement, v0.5.69 a ajouté un **chemin rapide à taille exacte** (sauter la machinerie de croissance de capacité quand la taille est connue à la compilation), et v0.5.74 a inliné l'IR de l'allocateur bump pour les petits littéraux de tableau afin que LLVM puisse voir l'allocation, la replier, la hisser ou l'éliminer. Les benchmarks lourds en tableaux ont bougé d'un cran de plus.

Pour compléter, v0.5.25 a corrigé un bug plus discret : `gc_malloc` ne déclenchait pas la collecte sur son propre chemin, donc les charges de travail lourdes en malloc pouvaient faire croître le tas sans limite avant que quoi que ce soit ne vérifie. v0.5.61 a ajouté un dimensionnement de pas adaptatif au seuil, ce qui est ce qu'on veut réellement : vérifier à bon marché quand le tas est petit, moins souvent quand il est grand.

## 3\. L'accès aux propriétés a gagné un vrai inline cache

Chaque moteur JavaScript moderne a un polymorphic inline cache (PIC) sur l'accès aux propriétés. Pendant la majeure partie de la série v0.5 de Perry, PropertyGet passait par une recherche dans une table de shapes avec un hash thread-local. C'est bien pour du code froid. Ce n'est pas bien quand 95% de vos lectures de propriétés sur un site d'appel donné voient la même shape, ce qui est presque toujours le cas.

v0.5.44 a livré un **inline cache monomorphe** pour `PropertyGet`. Chaque site PropertyGet obtient une entrée de cache par site d'appel : un pointeur de shape attendu et un offset de champ. Le chemin de touche est une seule comparaison plus un chargement indexé. Le chemin de miss passe par un helper lent qui met à jour le cache.

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

v0.5.51 a ajouté un **cache de transitions de shapes basé sur le hash du contenu** pour les écritures de propriétés dynamiques. Deux objets qui font croître les mêmes champs dans le même ordre hashent vers la même transition, donc ils finissent par partager la même shape — et cela signifie que le côté lecture du PIC touche réellement.

v0.5.55 a retiré le dernier accès TLS du cache de transitions. v0.5.46 a corrigé un bug dans le gestionnaire de miss du PIC où les objets avec >8 champs lisaient au-delà des slots inline dans de la mémoire non initialisée (ferme #55). v0.5.78 a ajouté une garde pour empêcher le PIC de PropertyGet d'indexer sur des receivers non-pointeur comme des nombres bruts — ce qui pouvait arriver sur un raffinement de types trop optimiste et était l'un des derniers problèmes de stabilité dans l'IC.

Effet net : le code lourd en propriétés — ce qui signifie en pratique la plupart du TypeScript — est environ 2 à 3x plus rapide qu'il y a une semaine, rien qu'avec l'IC seul.

## 4\. Entiers, opérations bit à bit, et le motif `| 0`

Le NaN-boxing fait que chaque nombre est un f64. Les programmeurs TypeScript écrivent `x | 0` pour forcer la sémantique entière. V8 a passé quinze ans à rendre cela peu coûteux. Perry a passé cette semaine à rattraper.

La pile de changements, dans l'ordre :

-   **v0.5.48** : `sdiv` pour `(int / const) | 0`. LLVM replie vers `smulh + asr`, qui est ~2 cycles contre ~10 pour `fdiv`.
-   **v0.5.48** : `@llvm.assume` sur les bornes de Uint8ArrayGet. Remplace le diamant branch+phi de vérification de bornes par un seul bloc de base sur lequel le vectoriseur peut raisonner.
-   **v0.5.49** : corriger les ops bit à bit avec NaN/Infinity pour produire 0 selon la spec ToInt32. La correction d'abord.
-   **v0.5.50** : `toint32_fast` qui saute la garde NaN/Inf de 5 instructions quand la valeur est connue finie. Plus `alwaysinline` sur les petits helpers et détection de clamp.
-   **v0.5.52** : cibler directement les fonctions clamp avec les intrinsèques `smin`/`smax`. Le clamp est le motif entier le plus courant après l'incrémentation.
-   **v0.5.53** : `x | 0` et `x >>> 0` sur une valeur connue finie deviennent un noop — juste `fptosi + sitofp`, aucune garde.
-   **v0.5.56** : ops bit à bit natives i32 ; index et valeur i32 dans Uint8ArrayGet/Set.
-   **v0.5.58, v0.5.60** : `Math.imul` descend vers le multiply i32 natif au lieu du chemin polyfill. La détection de polyfill reconnaît les shims `Math.imul` écrits par l'utilisateur et les remplace.
-   **v0.5.59** : inlining d'init de fonction pure + amorçage de locaux entiers. L'analyse d'entiers locaux à la fonction peut voir au-delà des frontières d'appel quand la fonction appelée est petite et pure.
-   **v0.5.37–v0.5.40** : chemin rapide d'arithmétique entière avec motif accumulateur. La boucle classique `for (...) acc += f(i)` reste en i32 de bout en bout quand les types le permettent.

v0.5.41 est la subtile. Quand le codegen voit un `const K: number[][] = [[...], ...]` au niveau module, il abaisse le tout en une constante plate `[N x i32]` dans `.rodata`. `K[y][x]` devient un seul `getelementptr + load i32`. Combiné avec le pont d'analyse d'entiers en v0.5.43, c'est ce qui a donné à `image_conv` (un flou gaussien 5×5 sur une image RGB 4K) une **accélération de 3x en une seule release**.

## 5\. Buffers et Uint8Array

Les charges de travail binaires — crypto, traitement d'images, parsing, réseau — vivent dans Buffer et Uint8Array. v0.5.64 leur a donné des **slots de pointeurs typés plus des métadonnées `noalias`**. Là où un Buffer était auparavant un double NaN-boxé dans un `alloca double`, c'est maintenant un pointeur `i64` brut dans un `alloca i64`, avec des annotations LLVM qui disent à l'optimiseur « ce pointeur ne fait pas d'alias avec d'autres pointeurs en scope ». Cela débloque le réordonnancement load/store, la vectorisation et l'allocation de registres que l'optimiseur refuserait autrement de faire.

v0.5.80 a fermé le dernier problème de correction ici : un compteur `alias-scope` à l'échelle du module qui était réinitialisé par fonction, ce qui pouvait dans de rares cas laisser LLVM raisonner à travers des scopes qui ne devraient pas partager un scope ID. Maintenant le compteur est à l'échelle du module et l'histoire `noalias` est hermétique.

v0.5.53 a rendu `Uint8ArraySet` sans branche — un store masqué au lieu d'un if/else qui écrivait 0 hors bornes. v0.5.54 a ajouté un **indexOf Two-Way** pour les motifs plus longs et un `split` alloué en arena, qui ensemble ont fermé la majeure partie de l'écart sur le parsing de Buffer lourd en chaînes.

## 6\. Chaînes : ASCII est le chemin rapide

Les chaînes JavaScript sont en UTF-16, mais la plupart des chaînes du monde réel (clés, identifiants, en-têtes HTTP, échafaudage JSON) sont en ASCII. v0.5.71 a ajouté un **`charCodeAt` et `codePointAt` en O(1) pour les chaînes ASCII** — pas de scan UTF-16, juste un load d'octet. v0.5.20 avait déjà fait en sorte que `indexOf`, `slice` et `charAt` contournent le scan UTF-16 en ASCII.

Une note de correction dans cette même release : `String.length` retourne maintenant les unités de code UTF-16 (spec ECMAScript) au lieu du nombre d'octets. C'était un bug latent où `"café".length` retournait 5 au lieu de 4.

## 7\. Les serveurs restent vraiment debout maintenant

Le travail le moins glamour de la semaine était aussi le plus visible pour l'utilisateur : faire en sorte que les serveurs long-running de style Node — Fastify, ws, http, net — ne plantent pas après quelques minutes.

Les plantages partageaient tous une cause racine : le GC ne connaissait pas les closures d'écouteurs. Quand vous écrivez `wss.on('message', handler)`, la closure capture des variables, qui vivent comme champs à l'intérieur d'une cellule allouée par le GC. Si le scanner de racines du GC ne sait pas qu'il doit visiter ces cellules, leurs captures sont récupérées et le prochain événement de message déréférence de la mémoire libérée.

-   **v0.5.26** : scan-racine des closures d'écouteurs d'événements `net.Socket` (ferme #35).
-   **v0.5.27** : étendre à `ws`, `http`, `events`, `fastify`.
-   **v0.5.28** : enregistrer les globales au niveau module comme racines GC (ferme #36). Bug de durée de vie une couche au-dessus.
-   **v0.5.21** : sûreté de `gc()` à l'intérieur des handlers de requêtes Fastify/WebSocket — l'appel GC explicite s'exécutait pendant que les handlers de requêtes tenaient des pointeurs vers l'arena (ferme #31).

Aux côtés du travail GC, v0.5.20 a livré une **boucle d'événements principale** — une vraie, pas un placeholder — qui garde les serveurs basés sur WebSocket et timers en vie au lieu de quitter après que le dernier appel sync retourne (refs #28). C'était la correction la plus impactante pour quiconque essayait d'exécuter Perry comme serveur HTTP de production. Fastify reste debout maintenant. Les serveurs WebSocket restent debout maintenant.

v0.5.19 a corrigé le mismatch d'ABI SysV AMD64 pour les args/retours FFI JSValue — un problème sur Linux où les appels FFI natifs pouvaient corrompre silencieusement les arguments. v0.5.18 a ajouté le dispatch natif pour `axios` (get/post/put/delete/patch), y compris `response.status` et `response.data`. v0.5.30 a corrigé le dispatch de `fastify request.header()` et `request.headers[]`, qui retournait undefined pour les recherches insensibles à la casse.

## 8\. `@perry/postgres` : le driver qui a rendu tout cela nécessaire

Une grande partie du travail de cette semaine a été motivée par une charge de travail : faire fonctionner un [driver Postgres](https://github.com/PerryTS/postgres) complet compatible Node sur Perry-native. Le driver gère TLS, a un registre de codecs inter-modules, supporte cancel/close/notify, et benchmarque maintenant contre `pg`, `postgres.js` et `tokio-postgres`.

Le travail de perf côté driver a été parallèle à celui côté compilateur :

-   **Hisser le codec par colonne** et supprimer les copies de Buffer par cellule. BigInt(string) pour int8 afin d'éviter les allocations intermédiaires.
-   **Constructeur de Row dynamique par shape** pour les lignes au format objet. Si votre requête retourne toujours les mêmes colonnes, le driver construit un constructeur de ligne spécialisé à la shape la première fois et le réutilise — ce qui, en combinaison avec le PIC du compilateur, rend l'accès aux champs sur les lignes aussi rapide que l'accès aux champs sur n'importe quel autre objet.
-   **Opt-out `parseTypes: 'minimal'`** pour les appelants qui veulent des chaînes brutes pour int8/numeric/date.

C'est la boucle de rétroaction positive que le compilateur était censé permettre. Un vrai driver fait remonter de vrais goulots d'étranglement. Le goulot obtient un reproducteur d'une ligne déposé comme issue GitHub. Une semaine de corrections du compilateur plus tard, le driver est plus rapide et le compilateur est plus rapide pour tous les autres aussi. C'est le plan entier, compressé en sept jours.

## 9\. Corrections de correction qui méritent d'être nommées

Le travail de performance fait remonter les problèmes de correction comme le draguage d'une rivière fait remonter les chariots de supermarché. Une liste partielle :

-   **Promise.race** lisait `.value` en cas de rejet au lieu de `.reason`, donc les rejets étaient silencieusement avalés (v0.5.13–v0.5.14).
-   **Promise.any** lève maintenant une `AggregateError` appropriée quand toutes les promesses d'entrée rejettent. Ajout de `Promise.withResolvers` et correction de l'ordre de `queueMicrotask`.
-   **`[..."hello"]`** produit maintenant un tableau de caractères au lieu d'un objet cassé (ferme #16).
-   **Arithmétique BigInt et coercition `BigInt()`** (ferme #33). Le chemin rapide bigint i64 (v0.5.29) rend le cas courant peu coûteux.
-   **Buffer.indexOf / Buffer.includes** avec un argument d'octet numérique comparaient contre des pointeurs de buffer au lieu de valeurs d'octets (ferme #56).
-   **Ops bit à bit avec NaN/Infinity** produisent 0 selon la spec ToInt32 (ferme #57).
-   **Windows x86\_64** : cinq correctifs spécifiques à la plateforme — `localtime`, découverte de `clang`, et une poignée d'ajustements de codegen — ont ramené Windows x86\_64 au vert (v0.5.72).

## 10\. Les chiffres

Le benchmark vedette du billet précédent était `factorial` à 24,6x plus rapide que Node. Ce chiffre est inchangé. Ce qui a bougé cette semaine, c'est tout ce qui est autour :

| Charge de travail | v0.5.12 | v0.5.80 | Delta |
| --- | --- | --- | --- |
| JSON.parse (schéma 20 enregistrements) | 547x plus lent que Node | 1,3x plus lent que Node | ~420x |
| image\_conv (flou 5×5 sur 4K) | 1 980ms | 457ms | 4,3x |
| Code lourd en propriétés (touche PIC) | référence | 2–3x | 2–3x |
| Fibonacci(40)| 401ms | 309ms | 1,3x |
| Uptime Fastify sous charge | ~60s avant plantage | indéfini | ∞ |

La suite complète de 15 benchmarks contre Node est toujours à 14 victoires et 1 égalité — le même tableau que le billet précédent, avec des chiffres légèrement meilleurs partout. Le vrai mouvement cette semaine est sur les charges de travail qui n'étaient pas dans cette suite : JSON, traitement d'images, serveurs long-running. C'est là que vivaient les écarts, et c'est ce qui s'est fermé.

## 11\. La suite

Le seul benchmark que nous poursuivons encore est `image_conv` vs Zig. Perry est à 457ms ; Zig est à 246ms. Cet écart est architectural, pas au niveau d'une passe d'optimisation, et il vit à trois endroits :

1.  **Locales de buffer typées**. La majeure partie du travail sur Buffer a atterri cette semaine, mais les paramètres de fonction et locales typés buffer se déballent encore à chaque accès. L'approche de slot `i64` que nous utilisons pour les compteurs de boucle doit s'étendre aux buffers.
2.  **Découpage de boucle intérieur/bordure**. La boucle de flou clampe chaque pixel, y compris les 99,9% de pixels qui n'en ont pas besoin. Découper en régions de bordure (clampées) et intérieur (sans clamp) permet à LLVM de vectoriser l'intérieur avec les `ld3`/`st3` NEON.
3.  **Hash FNV-1a à double ABI**. Le helper de hash est appelé via l'ABI NaN-box. Le spécialiser en entrée/sortie i64 brutes pour les chemins chauds représente quelques heures de travail qui se rentabiliseront sur chaque charge de travail lourde en hachage.

Ceux-ci sont suivis dans `PERF_ROADMAP.md`. Attendez-vous à les voir dans le prochain cycle.

## Pour conclure

Le motif de cette semaine — 68 releases de correctifs, presque toutes de performance, un écart JSON passant de 547x à 1,3x — est ce qui se produit quand on passe du bon côté de la colline de la bascule LLVM. L'optimiseur est désormais un allié au lieu d'un mur, et la plupart de ce qui reste est du travail petit, spécifique, mesurable : trouver un chemin lent, comprendre pourquoi l'optimiseur ne peut pas voir à travers, exposer la structure, mesurer à nouveau. Aucun de ces commits n'est exotique. Ils sont juste appliqués là où ils sont nécessaires.

Si vous voulez essayer tout ça :

```
brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app
```

Source : [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Docs : [docs.perryts.com](https://docs.perryts.com) — Changelog : [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

Issues, reproducteurs et benchmarks qui ne sont pas assez rapides : continuez à les envoyer. Ce rythme ne fonctionne que parce que les rapports de bugs sont assez spécifiques pour se transformer en reproducteurs d'une ligne. Chaque commit dans ce billet a un `#N` attaché pour une raison.

— Ralph
