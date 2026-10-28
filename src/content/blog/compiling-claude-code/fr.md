---
title: "Compiler Claude Code : un bundle minifié, 160 corrections du compilateur"
excerpt: "Nous avons demandé à Perry de compiler le fichier cli.js minifié de 13 Mo distribué par npm pour Claude Code en un binaire natif. Un mois plus tard, il démarre, se connecte, reçoit une véritable réponse de l’API en streaming et affiche les caractères saisis. Entre-temps, 160 pull requests ont été intégrées à Perry, d’un MessageChannel qui ne faisait rien à une barrière d’écriture manquante du GC dans les en-têtes RegExp."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
Le 16 juin, l'instruction était une phrase : *"Trouvez le dossier Claude Code et récupérez le javascript (compilé, minifié) à partir de là… voyons si nous pouvons le compiler :D"* Lorsque l'objection évidente est revenue - que ce serait brutal - la réponse a été la véritable thèse : *"C'est brutal mais aussi un véritable test de nos capacités et de nos limites, ce qui est pourquoi je veux le faire. Rien ne remplace les applications du monde réel en termes de recherche de limites. »*

Un mois plus tard, un binaire compilé par Perry du Anthropic Claude Code CLI se lance, exécute `/login` via le flux OAuth, renvoie une réponse réelle de l'API et peint les caractères que vous tapez. Pour y arriver, il a fallu **160 requêtes pull fusionnées dans Perry entre le 20 juin et le 17 juillet** – un `MessageChannel` sans opération, une barrière d'écriture GC manquante sur RegExp en-têtes, une instruction `continue` qui ne tournait que sur la véritable API et jamais sur notre simulation, et environ cent cinquante autres.

Ce message est la visite guidée. Non pas parce que compiler la CLI de quelqu'un d'autre est un produit - nous ne publions pas ce binaire et ne le ferons jamais - mais parce que c'est l'instrument de recherche de bogues le plus productif que nous ayons jamais pointé vers Perry.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="Un terminal macOS exécutant un binaire Perry compilé par Claude Code à partir de /tmp/verify : la bannière v2.1.112, une /connexion réussie, l'invite &quot;génial, qui es-tu ?&quot;, une réponse diffusée en continu et un retour propre au shell." width="1708" height="926"><figcaption>Aucun <code>node</code> dans cette ligne de commande. <code>/tmp/verify/cc_fptest_dbg25</code> est un exécutable natif unique produit par <code>perry compile</code> à partir du <code>cli.js</code> livré — se connectant, diffusant une vraie réponse et sortant proprement sur Ctrl-C. Puisque le nom du fichier invite à la question : <code>dbg25</code> est la 25ème version d'une série de diagnostics de l'enquête GC toujours en cours d'exécution comme ceci a été écrit - symboles de débogage, plus l'élision de barrière d'écriture désactivée afin que <em>chaque</em> magasin de tableaux émette une barrière. Il entraîne plus de frais généraux qu’une version ordinaire, pas moins. Le tableau des performances plus bas a été mesuré sur différents binaires non instrumentés.</figcaption></figure>

## Ce que signifie réellement « compiler le Claude Code »

La cible de compilation est le fichier distribué dans le package npm. `npm pack @anthropic-ai/claude-code@2.1.112` vous offre un `cli.js` : **13 Mo de JavaScript** minifié et auto-exécutable avec un `#!/usr/bin/env node` shebang. Pas de source, pas de sourcemap, aucune étape de construction de notre part. Nous pointons la `perry compile` sur ce fichier, non modifié, et demandons un exécutable natif.

Perry le mâche pendant environ 37 minutes et produit environ 207 Mo de IR à travers **16 023 fonctions**, qui sont liées dans un binaire d'environ 180 Mo. Chacune de ces fonctions a des noms d'une lettre et aucune annotation de type, et le tout doit fonctionner à l'avance - pas de JIT, pas de `eval`, pas de renflouement paresseux vers un interprète lorsque le compilateur se trompe. Si Perry abaisse mal l'une de ces 16 023 fonctions, il n'y a rien pour la rattraper.

L'échelle de notation provient de notre suite interne de stress et elle est délibérément impitoyable :

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

`correct` est le seul niveau qui compte. Node v26 est l'oracle ; tout ce qui n'est pas identique en octets à ce que Node imprime est un bug de Perry jusqu'à preuve du contraire.

## Pourquoi cette application en particulier

Un agent de codage CLI est une pile inhabituellement hostile de JavaScript à compiler à l'avance. Dans un binaire, vous obtenez : React se réconciliant dans un terminal via Ink, un lecteur stdin en mode brut, un moteur de rendu ANSI/saturé emoji qui exécute des expressions régulières sur chaque image, un flux SSE, schémas zod construits au démarrage, un flux OAuth, `worker_threads`, `MessageChannel` utilisé comme planificateur de macrotâches, WeakMaps contenant l'état de la fibre, `require` dynamique et une couche de système de fichiers qui écrit sur la sortie standard par descripteur de fichier.

Chacun d'entre eux est un sous-système différent de Perry, et l'application les exerce *ensemble*, à grande échelle, sous la pression du GC, pendant quelques minutes à la fois. Nos propres suites de tests : 3 000 tests unitaires Rust, des milliers de programmes de régression TypeScript, la matrice de parité Node API, test262 — sont tous orientés vers l'épinglage des comportements connus. Cet ensemble vise à trouver des comportements que personne n'a pensé à épingler.

## La séquence d'obstacles

Le travail s'est déroulé dans une seule direction : dégager le mur actuel, trouver le suivant. Compressé :

| Date| Jalon |
| --- | --- |
| 21 juin| `--help` s'exécute de manière native, code de sortie 0 |
| 22 juin| Les vraies sous-commandes cessent de se bloquer au démarrage |
| 23 juin| `-p` ouvre un socket TCP ÉTABLI vers api.anthropic.com |
| 24 juin| Les schémas zod se construisent correctement ; chemin d'authentification atteint |
| 27 juin| Les rendus TUI : logo, boîte de bienvenue, cadre de saisie |
| 9 juillet| Premier aller-retour complet : `-p` contre la vraie API imprime la réponse, quittez 0 |
| 10 juillet| Harnais différentiel Node-vs-Perry : 12/12 identique |
| 13 juillet| Octet identique au Node sur `-p` texte + JSON, TUI rendu, système de fichiers |
| 16 juillet| Les caractères saisis apparaissent enfin dans la ligne de saisie |
| 17 juillet| Boucle complète validée manuellement : lancement → réponse `/login` → API → saisie |

Chaque correctif a été envoyé en amont sous la forme d'une demande d'extraction autonome avec une reproduction minimale et générique. Aucun d’entre eux ne mentionne l’application d’où ils proviennent – ​​c’était une règle depuis le premier jour. Un utilisateur de Perry qui lit le journal des modifications voit "`continue` dans les pilotes en attente a ignoré l'avance de l'itérateur", et non "nous essayions de compiler la CLI de quelqu'un. Les bugs sont réels, indépendamment du véhicule qui les a fait surface.

## Cinq bugs logiciels qui méritent d'être discutés

### 1. MessageChannel était un refus poli

`--help` a fonctionné le 21 juin. Chaque sous-commande *réelle* – `doctor`, `agents`, `mcp list` — accroché pour toujours. Pas occupé : `sample` a montré le processus parqué, `lsof` n'a montré aucun processus enfant, aucun socket, juste deux tuyaux.

L’implémentation de `MessageChannel` de Perry installait `postMessage` comme une opération sans effet et `onmessage` comme `null`. Cela paraît inoffensif jusqu’à ce qu’on rencontre le schéma de l’ordonnanceur React, qui utilise un canal de messages pour planifier ses macrotâches :

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

Le message a été supprimé, le rappel n'a jamais été exécuté et la boucle d'événements est restée inactive sur son propre canal de réveil pour toujours. [#5530](https://github.com/PerryTS/perry/pull/5530) a donné aux ports une véritable livraison sur le même thread : paires intriquées, une file d'attente FIFO, livraison via la macrotâche `setImmediate` et une GC root scanner afin que les messages en file d'attente survivent à une collection.

### 2. Un accesseur sur Object.prototype coûte 42 secondes

Avant le blocage, les mêmes sous-commandes étaient liées au processeur pendant des dizaines de secondes. Le profilage pointait vers le chemin générique `[[Set]]`, et la cause première était un indicateur global du processus.

Perry dispose d'un chemin rapide pour les écritures de propriétés dynamiques, limité à "Est-ce que `Object.prototype` contient actuellement des descripteurs ?" Le bundle installe exactement un accesseur sur `Object.prototype` au démarrage. Cela a inversé le drapeau à l'échelle du processus, et à partir de ce moment-là, *chaque* écriture dynamique dans le programme a suivi la lente marche d'interception, qui est O (own-key-count). Construire un objet large est devenu quadratique :

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) a remplacé l'indicateur global par une question par clé – *`Object.prototype` a-t-il sa propre propriété pour **ce** clé ?* Une clé absente ne peut pas être interceptée, donc l'écriture est sûre via un chemin rapide. 42 s → 23 ms, avec une interception toujours correcte.

Ensuite, la même forme est réapparue pour les instances de classe, que le chemin rapide excluait carrément : une construction de 20 000 clés sur un objet simple prenait 25 ms, sur une instance de `class` 44 secondes. Corriger celui-ci était important - une vérification naïve de la chaîne de prototype aurait ignoré les setters hérités et corrompu les données en silence - donc [#5528](https://github.com/PerryTS/perry/pull/5528) résout le prototype de l'instance via le registre de classes et ajoute un index à clé large O(1). Retour à 30 ms, et à nouveau linéaire.

### 3. Le bug que seule la véritable API pourrait déclencher

C'est celui dont nous parlons aux gens. Début juillet, le binaire compilé effectuerait un `-p` complet contre notre serveur fictif local : connectez-vous, POST, lisez le flux SSE, imprimez la réponse, quittez 0. Par rapport au réel Anthropic API, elle s'est bloquée pour toujours, à chaque fois.

La chaîne de débogage était : une simulation de proxy direct prouvait que la réponse complète de 200 était arrivée intacte → une simulation de relecture, alimentait le flux d'octets réel capturé, reproduisait le blocage localement → divisant en deux la liste d'événements SSE a trouvé l'événement coupable → une reproduction de dix lignes.

La véritable API envoie des trames `event: ping`. Notre simulation ne l’a jamais fait. Et `ping` est le seul événement que la boucle de flux du SDK saute avec un simple `continue`. Perry a abaissé `for await` dans un pilote dont l'avance de l'itérateur se trouvait au *bas* du corps de la boucle :

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

Six sites d'abaissement distincts avaient la même forme. [#6196](https://github.com/PerryTS/perry/pull/6196) a déplacé l'avance vers le haut dans chacun d'eux. La leçon que nous réapprenons sans cesse : une moquerie qui passe est une preuve de la moquerie.

### 4. Une expression régulière qui a survécu à sa propre chaîne de modèle

Le TUI s'afficherait, puis mourrait de `SIGBUS` en quelques secondes - 12 plantages en 12 exécutions sous un harnais de contrainte de redimensionnement de fenêtre, à des adresses différentes dans des fonctions différentes à chaque fois. Des semaines d'enquête ont été consacrées aux théories GC que les tests A/B ont ensuite réfutées, y compris l'une de nos propres « correctifs » qui s'est avérée douteuse et a dû être retirée.

La véritable cause était quatre lignes de Rust. `js_regexp_new` alloue un en-tête RegExp et stocke son `pattern` et ses `flags` pointeurs de chaîne avec des écritures brutes - **pas d'écriture barrière**. Un objet d'ancienne génération pointant vers une toute jeune corde, dont le collectionneur n'a jamais parlé du bord. Le GC mineur a balayé ces chaînes sous un RegExp en direct, et la lecture suivante de l'emplacement libéré a échoué.

Pourquoi cela n'apparaît-il qu'ici ? Parce qu'une interface utilisateur de terminal est saturée d'expressions régulières - l'analyse ANSI et la mesure de la largeur des emoji exécutent des modèles sur chaque image - de sorte que la fenêtre entre l'allocation et la collecte est franchie des milliers de fois par minute. Notre reproduction minimale, 6 000 expressions rationnelles plus une annulation d'allocation délibérée, *jamais* ne l'a déclenchée. Le bundle le déclenchait à chaque fois. [#6288](https://github.com/PerryTS/perry/pull/6288) a ajouté la barrière dont les deux domaines avaient toujours besoin.

### 5. Les caractères que vous avez tapés étaient là. Le cadre les a jetés.

Le mur le plus tenace : toute l'interface utilisateur est parfaitement peinte : boîte de bienvenue, cadre de saisie, bloc de curseur, ligne d'état. Taper `/` ouvrait le menu de commandes, donc la frappe atteignait React. Mais les lettres ne sont jamais apparues sur la ligne de saisie.

Les builds instrumentés montraient Perry peignant correctement le caractère tapé à chaque étape, puis `onRender` jetant *après* la peinture — dans un Ink `try/catch` qui l'a avalé. Le cadre a été abandonné avant la validation, de sorte que chaque rendu ultérieur est construit sur un cadre vide. L'application avait l'air complètement saine tout en vous ignorant.

Derrière ce symptôme se cachaient deux bugs indépendants :

-   [#6453](https://github.com/PerryTS/perry/pull/6453) — Perry de `charAt`/`codePointAt`/`split` appelé ToString sur un récepteur sans chaîne sans la garde de coercibilité requise. Ainsi, `undefined.codePointAt(0)` a tranquillement renvoyé `117` — le point de code de `"u"`, à partir de la chaîne `"undefined"` — au lieu de lancer. Un bug qui *invente* des données plausibles est bien pire qu'un bug qui plante.

-   [#6471](https://github.com/PerryTS/perry/pull/6471) — le véritable bloqueur. Lorsqu'un tableau s'agrandit, Perry laisse un talon de transfert permanent à l'ancienne adresse. Le balayage mineur consistait à récupérer ces talons alors qu'un parent de l'ancienne génération en pointait toujours un : le cache de caractères du moteur de rendu contenait un pointeur de pré-croissance sur une page qui n'était pas sale. La lecture du stub périmé a produit une longueur inutile et chaque image a été abandonnée. Les mineurs conservent désormais tous les talons ; les traces complètes les récupèrent par marque.


Correction de ceux exposés à une troisième couche : les objets nés noirs lors du marquage incrémentiel n'ont jamais été tracés, donc tout ce qui était accessible uniquement via eux a été balayé en direct ([#6494](https://github.com/PerryTS/perry/pull/6494)), et le masque de mise en page n'a pas signalé les emplacements de débordement, de sorte que le collecteur les a ignorés ([#6506](https://github.com/PerryTS/perry/pull/6506)). Ces deux-là sont le genre de failles de sécurité qui produisent un crash mystérieux sur cinquante dans *n'importe quel* programme compilé. Nous ne les aurions pas trouvés avec une suite de tests.

## Comment déboguer un binaire minifié de 13 Mo

Aucun des éléments ci-dessus n'est trouvable en lisant le code. L'outillage qui l'a rendu réalisable :

-   **Un harnais différentiel avec Node comme oracle.** Chaque hypothèse devient un petit programme TypeScript exécuté à la fois sous `node --experimental-strip-types` et un Binaire Perry, comparé octet par octet. Il a trouvé des bogues par lui-même : une expression de classe utilisée uniquement comme `instanceof` du côté droit a été éliminée du code mort car onze passes d'analyse ne pouvaient pas voir à travers ce type de nœud ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Trois serveurs API fictifs.** Un simulacre de journalisation, un proxy de transfert qui capture les octets de réponse réels et un serveur de relecture qui renvoie ces octets exacts de manière déterministe. Le serveur de relecture est ce qui a transformé les « blocages contre la production » en une reproduction locale.

-   **Un faisceau PTY qui répond aux requêtes du terminal.** Un pseudo-terminal stupide vous rapporte 50 octets et un décrochage. L'application recherche la position du curseur (`ESC[6n`), les attributs de l'appareil (`ESC[c`) et la couleur d'arrière-plan (`OSC 11`) et attend les réponses avant de peindre. Répondez-y et vous obtiendrez l'écran de bienvenue complet de 3 331 octets — et un rendu comparable en octets entre Node et Perry.

-   **Cartes de liens pour la symbolisation.** Les fichiers binaires supprimés de 180 Mo produisent des rapports d'erreur remplis de décalages bruts ; La sortie `ld64 -map` plus un script bisect les transforme en noms de fonctions.

-   **Tout A/B.** La règle qui a émergé, écrite en haut des notes de transfert en majuscules : *ne jamais hériter d'une théorie, la tester.* Quatre hypothèses consécutives sur les causes profondes d'un bug ont chacune été réfutées par des analyses A/B. Un signal de vérification que nous avons recherché pendant des jours (« 445 bords anciens → jeunes manquants ») s'est avéré être un artefact de mesure - la vérification s'est déroulée entre l'effacement et la restauration de l'ensemble mémorisé. Le propre commentaire du code en avertissait.


## Où il en est réellement

Honnêtement : ça marche, et c'est lent.

Fonctionne aujourd'hui, octet identique au Node où le résultat est comparable : démarrage, `--help`, `--version`, mode unique `-p` par rapport à la véritable API, y compris la classification des erreurs et l'enveloppe JSON, le rendu complet TUI, le OAuth `/login` flux, diffusion des réponses et saisie. Voici toute la boucle en une seule prise : lancement, `/login`, une question, une réponse en streaming, sortie :

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Votre navigateur ne prend pas en charge la vidéo intégrée.</video><figcaption>63 secondes, pas de son, coupé à deux endroits : la moitié du navigateur de la OAuth et un macOS. Tout dans le terminal est en temps réel et non modifié, y compris le délai de démarrage, qui est la chose la plus lente de cet article.</figcaption></figure>

Deux choses sont encore ouvertes, et elles pourraient bien n'en être qu'une. L’entrée cesse de s’enregistrer après environ une minute d’utilisation interactive soutenue – pas de crash, pas d’erreur, elle s’arrête simplement. Et `ESC` n'interrompt pas une réponse en vol, bien que `Ctrl-C` se ferme maintenant proprement, ce qu'il n'avait pas fait il y a une semaine (c'est la sortie que vous voyez à la fin de l'enregistrement). Un chemin de sortie qui fonctionne alors qu'un chemin d'interruption ne pointe pas vers le même suspect que la mort d'entrée : des événements de pression de touche qui cessent d'atteindre l'application, plutôt qu'un problème avec les propres gestionnaires de l'application.

L'image des performances, mesurée par rapport au Node exécutant le même bundle, avant et après le premier tour de la campagne de vitesse qui a commencé le jour où l'exactitude a atterri. Ceux-ci sont sortis de `cc_final` et `cc_perf2` le 17 juillet – des builds ordinaires sans diagnostics compilés, pas le binaire instrumenté dans la capture d'écran ci-dessus :

| Métrique| Node| Perry (17 juillet)| Perry (après) |
| --- | --- | --- | --- |
| `--version` | 328 ms| 1 168 ms| **227 ms** |
| `--help` | 715 ms| 5 071 ms| 4 099 ms |
| TUI première peinture| 0.76 s | 10.9 s | 8.4 s |
| Frappe → peindre (p50)| 2,2 ms| 111 à 143 ms| 119-138 ms |
| Empreinte mémoire, inactif| 290 Mo à plat| ~420 Mo en montée| ~420 Mo en montée |

`--version` maintenant **battit Node**, et la victoire était embarrassante dans son origine : l'exécutable compilé exportait 300 281 symboles, donc environ 80 % de ce lancement était dyld effectue une fusion de définition faible. Un indicateur de l'éditeur de liens a porté les exportations à 3 et le binaire de 228 Mo à 197 Mo ([#6533](https://github.com/PerryTS/perry/pull/6533)). Créer chaque expression régulière unique une fois au lieu de deux ([#6534](https://github.com/PerryTS/perry/pull/6534)) et mettre en cache le contrôle d'interception par magasin ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) a pris le reste.

Sur ces 197 Mo, avant que quiconque ne s'en occupe : Perry lie statiquement son propre environnement d'exécution et émet du code machine pour les 16 023 fonctions à l'avance sans rien à supprimer - un bundle auto-exécutable rend pratiquement tout accessible, il n'y a donc pas de bundle croisé DCE sur lequel s'appuyer - ce qui signifie que 197 Mo représentent un programme entier *plus* son exécution dans un seul fichier, contre les **138 Mo que pèse le binaire Node v26 avant d'avoir lu une seule ligne de votre JavaScript**.

La ligne de frappe est celle à lire attentivement, car le numéro « après » semble pire. Ce n'est pas le cas : il s'agit de plages réparties sur des analyses répétées et elles se chevauchent, de sorte que la médiane n'a bougé dans aucune direction - il s'agit d'une variance d'une analyse à l'autre, pas d'une régression. C'est aussi exactement ce à quoi nous nous attendions. Les trois modifications concernent l'étape de lien, la construction de l'expression régulière et le chemin du *store* ; la médiane de frappe est dominée par le chemin de propriété *read*, la surcharge d'enracinement par appel et les étapes GC de 40 à 80 ms d'atterrissage dans les fenêtres de frappe. La preuve est venue au tour suivant : obtenir/définir des voies rapides a rendu un microbenchmark d'accès sur le terrain 3 fois plus rapide et n'a déplacé ce nombre de rien ([#6539](https://github.com/PerryTS/perry/pull/6539)). Une victoire de microbenchmark qui n'apparaît pas dans l'application est un mauvais diagnostic, et nous en avons eu un.

La ligne mémoire est la campagne en cours. Le collecteur de copie de Perry *peut* compacter — le problème est qu'il devient éligible environ une fois toutes les 45 secondes d'inactivité, de sorte que la pépinière repousse à ~ 300 Mo entre les tirs tandis que Node reste plat en compactant continuellement. Il s'agit d'un problème de fréquence de déclenchement, pas d'un problème d'algorithme, ce qui est bien meilleur que là où nous étions en juin.

Dont aucun n'est garé. La campagne de mémoire et de performances est *en direct* au fur et à mesure que cet article progresse — le travail de déclenchement du GC est en cours d'exécution aujourd'hui, sur ce binaire exact — donc le tableau de performances ci-dessus est la partie de cet article que nous nous attendons le plus à invalider, et le plus tôt sera le mieux. L'exactitude a mis un mois à percer les murs. Ce qui reste est un problème de fréquence de déclenchement et un problème de chemin de lecture, tous deux compris, tous deux déjà en vol. Nous nous attendons à ce que cette chose soit fluide plutôt que simplement correcte, et nous l'espérons bientôt.

## Pourquoi nous faisons cela

Aucun des 160 correctifs ne concerne le Claude Code. Une barrière d'écriture manquante sur les en-têtes RegExp corrompt la mémoire dans *tout* programme qui crée des expressions régulières sous charge. `for await` avec un `continue` tourne dans n'importe quel consommateur de flux. La suppression de messages par `MessageChannel` interrompt chaque application en forme de planificateur React. L'indicateur de descripteur `Object.prototype` a rendu *chaque* programme qui touche `Object.prototype` quadratique dans son objet le plus large.

Ces bugs étaient tous présents à Perry alors que CI était vert, tandis que les chiffres du test262 grimpaient, tandis que la matrice de parité Node indiquait 97 %. Il a fallu treize mégaoctets de JavaScript minifié de quelqu'un d'autre, effectuant un véritable travail sur une véritable API dans un vrai terminal, pour les libérer.

Il y a encore une chose, et c'est la partie que nous trouvons la plus drôle. Perry n'est pas écrit uniquement à la main : une grande partie, y compris une grande partie de *cette* campagne, a été écrite avec le Claude Code. Les serveurs fictifs, le harnais PTY, le coureur différentiel, les longues nuits passées à diviser en deux un bug GC à quatre heures du matin : des sessions d'agent examinées et fusionnées par un humain. Pas tout le Perry, et non sans beaucoup d'arguments. Mais il suffit que la phrase soit vraie dans les deux sens.

Le compilateur qui a mangé Claude Code a été, en grande partie, construit par Claude Code.

Nous continuerons à le faire. Les cibles suivantes sont déjà en file d'attente.

* * *

Perry n'est ni affilié ni approuvé par Anthropic. Claude Code est une marque commerciale de Anthropic PBC. Le binaire décrit ici a été construit à partir du package npm publié publiquement uniquement comme cible de test du compilateur et n'est pas distribué.
