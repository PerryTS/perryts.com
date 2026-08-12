import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `**TL;DR.** Perry compile TypeScript en binaires natifs et utilise un ramasse-miettes à traçage mobile, générationnel et à racines précises — pas du comptage de références. Après un mois durant lequel presque tout le travail sur le GC a consisté à *comprendre ce que le collecteur faisait réellement*, Perry bat désormais Node sur 9 des 19 benchmarks typés GC, contre 3 auparavant, bat le concurrent AOT à comptage de références sur 14 des 19 et reste à moins de 1,3× de Node sur 15 des 19. En chemin : une classe de bugs qui ne laisse aucune preuve forensique, des variables d’environnement qui ne contrôlaient rien, des barrières CI structurellement incapables d’échouer, un commentaire de documentation qui a silencieusement livré un autre collecteur, et une mesure finale montrant que l’écart restant vient de la *disposition* des objets, pas de la collecte. Les neuf règles que nous en avons tirées figurent à la fin, et la plupart n’ont rien à voir avec le ramasse-miettes.

Perry compile TypeScript directement en exécutable natif : SWC l’analyse, nous l’abaissons en HIR, LLVM émet le code machine et \`cc\` effectue l’édition de liens. Il n’y a ni interpréteur ni bytecode. Pourtant, le langage possède des closures qui s’échappent, des objets qui survivent à leur portée et des cycles de références : derrière ce binaire natif, il faut donc un véritable ramasse-miettes.

Voici le récit des décisions prises pour le construire, des choses qui nous ont surpris — pour la plupart désagréablement — et de l’état actuel des chiffres. Depuis des mois, le collecteur est la zone la plus active du dépôt : **201 commits ont touché \`crates/perry-runtime/src/{gc,arena}\` depuis le 1er juillet 2026, dont 110 au cours des douze derniers jours**, dans 127 fichiers et environ 75 000 lignes. 135 des 572 fragments de changelog non publiés portent un nom lié au GC.

Presque rien de tout cela n’était « implémenter un collecteur ». Il s’agissait de découvrir ce que notre collecteur faisait réellement.

---

## Partie 1 — Nos choix

### Pas de comptage de références

La première question est presque toujours de savoir si un compilateur AOT ne devrait pas simplement utiliser le comptage de références. L’adéquation paraît évidente : pas de problème de découverte des racines, pas de safepoints, aucune coopération requise avec l’optimiseur. Le compilateur TypeScript AOT concurrent que nous mesurons suit exactement cette voie.

Nous avons malgré tout choisi un collecteur à traçage, car le comptage de références fait payer le cas rare au cas courant : chaque écriture de pointeur met à jour un compteur, les cycles nécessitent de toute façon un traceur de secours, et JS alloue des quantités énormes d’objets qui meurent immédiatement — précisément le cas qu’une nursery gère gratuitement. Aujourd’hui, ce choix paraît juste sur 14 de nos 19 benchmarks GC et faux sur 5 ; nous y reviendrons à la fin.

### Les valeurs sont NaN-boxed — et nous sommes en train d’en sortir partiellement

Chaque valeur JS tient dans un mot de 64 bits. Nous exploitons les quelque 2⁵² motifs NaN disponibles d’IEEE 754 pour étiqueter les pointeurs, les petits entiers et les singletons, tandis que tout le reste reste un simple \`f64\` :

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

Pour le collecteur, c’est une excellente affaire : « ce mot est-il un pointeur ? » se résout par un masque et une comparaison, sans consulter le type de chaque valeur pendant le traçage. Un nombre au repos contient déjà ses bits IEEE ; un champ numérique ne coûte donc ni boîte ni en-tête.

Pour le *mutateur*, en revanche, c’est le principal obstacle qui nous sépare de V8, et nous le supprimons activement. Le problème n’est pas seulement que le \`double\` NaN-boxed soit *une* représentation : c’est la représentation **canonique**. Les types machine natifs n’existent que comme overlays locaux à une région, et toute une famille \`materialize_*_to_js_value\` ré-encapsule aux frontières visibles depuis JS. Dans l’IR émis, un accumulateur de boucle prouvé \`i32\` vit ainsi dans un \`alloca double\`, survit à \`-O3\` sous forme de \`phi double\` sur l’arête de retour et paie un aller-retour \`fptosi\` + \`sitofp\` **à chaque itération**. Les paramètres de fonction sont uniformément \`double %argN\` : une fonction chaude décompacte donc ses arguments des millions de fois. Les locales numériques étaient même enregistrées comme racines GC alors qu’un nombre ne peut jamais être un pointeur.

La mesure décisive : une version fidèlement déroulée de \`_encipher\` de bcryptjs prend 834 ms contre 184 ms dans Node — et *ajouter des annotations de types l’a aggravée*, de 834 à 2732 ms, parce qu’environ 80 guards par lecture et les rematérialisations aux frontières dominaient. Des fast paths à l’échelle des expressions ne corrigent pas un problème de représentation ; chacun ajoute un overlay au canon boxed, et sur du code déroulé leur effet s’inverse.

La direction (\`docs/representation-selection-rfc.md\` et la campagne unbox-by-default) consiste donc à rendre canonique la forme native non boxed pour toute valeur prouvée statiquement — scalaires, chaînes, objets, typed arrays, closures — de bout en bout à travers locales, paramètres, retours et slots typés du heap, et à réserver le NaN-boxing aux valeurs prouvées polymorphes. Il reste la représentation *par défaut*, mais cesse d’être la *seule*. Les phases 1, 2, 3a, 3b, 4a et 4b sont fusionnées. Static Hermes prouve que c’est possible. L’argument AOT est que nous devons *prouver* les types là où un JIT peut spéculer — ce qui constitue aussi notre avantage : un kernel prouvé n’a pas besoin de chauffe et ne peut pas déoptimiser.

Cela touche directement le GC dans les deux sens. L’unboxing retire des racines que le collecteur devrait autrement scanner — un scalaire prouvé n’est pas une racine — et ajoute en même temps une obligation : dès qu’un slot du heap contient autre chose qu’un mot NaN-boxed, le collecteur ne peut plus lire la nature pointeur dans la valeur et doit consulter un masque de layout par shape. Cette mécanique — \`pointer_mask\`, \`raw_f64_mask\` et les notes de layout — est à l’origine de plusieurs bugs décrits plus loin.

### Un heap par thread, aucun partage

Perry est single-threaded par défaut ; \`perry/thread\` fournit \`spawn\` et \`parallelMap\`, et les valeurs traversent les frontières de threads par copie profonde (\`SerializedValue\`), non par partage. Le coût ergonomique est réel, mais le collecteur y gagne beaucoup : **il ne se synchronise jamais avec un autre thread.** Aucun protocole global de safepoints, aucun handshake, aucune read barrier pour les invariants inter-threads. Chaque arena, chaque scanner de racines et chaque remembered set est local au thread.

### Générationnel, parce que la distribution des allocations le dit

Chaque thread possède deux régions : une nursery (\`ARENA\`, blocs de 1 Mo) et une ancienne génération (\`OLD_ARENA\`), un \`GcHeader\` de 8 octets par allocation, deux bits d’âge (\`HAS_SURVIVED\` et \`TENURED\`) plutôt qu’un compteur, et \`PROMOTION_AGE = 2\`. Le plan initial, écrit le 24 avril 2026 avant le moindre code, résumait le raisonnement : plus de 90 % des allocations JS meurent dans la portée qui les a créées ; une arena plate passe donc sa vie à remarquer des objets trivialement morts.

Le plan identifiait aussi correctement le préalable, dont dépend toute la suite :

> **Un GC générationnel exige des racines précises.**

Un scanner conservateur convient à un collecteur non mobile : un faux positif conserve simplement un objet mort pendant un cycle. Un collecteur *mobile* ne peut pas fonctionner ainsi. Si les racines ne peuvent pas être énumérées précisément, elles ne peuvent pas être réécrites ; sans réécriture, rien ne peut être déplacé.

### Racines : une analyse, deux lowerings et les statepoints LLVM par défaut

LLVM est libre de garder des valeurs dans les registres, de les rematérialiser et de les spiller où il veut, sans que le collecteur puisse l’inspecter. La réponse de Perry comporte deux couches, et leur séparation nous a pris beaucoup trop de temps.

L’**analyse** — quelles locales contiennent des pointeurs GC et où chacune doit rester vivante — est indépendante du backend. L’**abaissement** de cette réponse dans le code émis est un choix :

- *Shadow stack.* \`js_shadow_frame_push(n)\` à l’entrée, un \`js_shadow_slot_bind\` par locale de niveau JS, puis \`js_shadow_frame_pop\` à la sortie. Le collecteur parcourt un frame stocké dans le heap.
- *Stack maps natives via RS4GC.* Les allocas racines deviennent \`ptr addrspace(1)\`, les fonctions reçoivent \`gc "statepoint-example"\` et chaque module passe par \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\`. LLVM insère lui-même chaque statepoint, relocation et réécriture des usages en aval ; au moment de la collecte, nous lisons les racines dans une section compacte \`__perry_gcmap\`.

**Depuis #7370, le lowering statepoint est activé par défaut.** Il n’est plus nécessaire de définir \`PERRY_RS4GC=1\` ; \`PERRY_RS4GC=0\` revient au shadow stack pour une bisection. Le choix dépend de la cible, car \`gc_map\` refuse d’émettre une carte si la runtime ne peut pas résoudre ses bases de frames — une carte que personne ne lit perd silencieusement des racines. La règle est donc : racines natives là où la runtime sait parcourir le stack, shadow stack ailleurs. aarch64/arm64 et x86-64 reçoivent les statepoints ; watchOS \`arm64_32\` et Windows ARM64 gardent le shadow frame. Le fallback ne signifie pas « aucune racine », mais l’autre lowering de la même analyse.

Les preuves du basculement, sans variable d’environnement : les 479 tests de la suite de gap avec **0 régression et 0 échec de compilation** ; les **128 tests contenant \`try\`** compilés, soit la classe que l’ancien pont statepoint écrit à la main n’avait jamais pu gérer ; les 10 probes ratchet GC identiques octet pour octet à Node ; le runtime à −1–2 %, donc légèrement plus rapide ; la taille du binaire à +1,86 % sur les 81 modules de zod.

Le vrai avantage par rapport à « nous émettons un shadow stack » n’est pas ce 1–2 %. Un statepoint transporte une **sémantique de relocation que l’optimiseur doit respecter**, alors qu’un shadow stack n’est correct que tant que l’optimiseur ne fait rien d’intelligent avec une valeur que nous avons oublié de spiller. Les preuves arrivent dans la Partie 3.

À cela s’ajoutent **79 scanners de racines runtime enregistrés** pour l’état qui vit dans la runtime plutôt que dans le code utilisateur : promises en attente, callbacks de timers, état des exceptions, piles de contexte async, caches de shapes, table d’internement des chaînes et tables de travail JSON.

Il existe aussi un scanner conservateur du stack natif. Notre document d’architecture le présente comme l’un de trois mécanismes égaux ; ce texte est périmé, et le découvrir en écrivant ceci était instructif. Dans la configuration de production livrée, \`conservative_stack_scan_decision()\` vaut \`SkipDisabled\` : la liveness repose entièrement sur la carte précise des racines — statepoints, ou shadow frame sur les cibles fallback — ainsi que sur \`RuntimeHandleScope\` dans les helpers runtime. Le chemin conservateur subsiste pour certains modes, notamment la collecte au point d’allocation, pas comme filet de sécurité sous le chemin précis.

### Write barriers, armées paresseusement

Le danger générationnel vient des pointeurs ancien→jeune : un minor GC qui ne trace que la nursery doit les connaître. Codegen émet \`js_write_barrier\` lors des stores de pointeurs, et la runtime maintient un remembered set.

L’invariant d’armement livré avec #7250 est l’une des pièces les plus réutilisables du collecteur :

> Tant qu’elle est désarmée, la barrière n’enregistre rien. En échange, la première *lecture* du remembered set sur un thread ne fait aucune confiance au journal : elle reconstruit depuis le heap l’ensemble complet des arêtes ancien→jeune et arme la barrière au passage.

Cela est imposé structurellement : \`remembered_dirty_snapshot()\` est \`pub(super)\` et compte sept call sites, tous dans \`gc/\`.

*(À l’attention des lecteurs du code : Perry possède deux choses sans rapport appelées « la barrière » — la write barrier du GC et une barrière de promotion \`Ptr<Shape>\` à la compilation dans le passe de sélection de représentation. Trois issues ont perdu du temps à les confondre. Nommez toujours le fichier.)*

---

## Partie 2 — Les surprises

### 1. La classe de bugs qui ne laisse aucune preuve

L’invariant de rooting tient en une phrase :

> Toute valeur gérée par le GC et vivante au-delà d’un point de collecte doit être atteignable depuis une racine avant ce point. Une valeur lue depuis une racine puis conservée dans un registre SSA pendant un appel **n’est pas rootée** : c’est une copie, et le collecteur ne voit pas les copies.

Le violer produit la pire expérience de débogage du projet. Au moment de la collecte, il n’y a *rien à trouver* : aucune référence pendante, aucun slot non forwardé, aucune anomalie. La nursery recycle ensuite l’adresse ; le pointeur périmé lit un autre objet valide et le programme meurt un ou plusieurs cycles plus tard, dans une autre fonction, avec \`TypeError: value is not a function\`.

Toutes nos probes GC runtime y sont aveugles. Les scans du from-space sont propres. Les passes de vérification sont propres. \`PERRY_GC_VERIFY_EVACUATION\` vérifie que les slots atteignables ont été forwardés ; il ne peut pas vérifier un registre dont il ignore l’existence.

Nous avons catalogué cinq formes distinctes, toutes livrées :

| # | Forme | Pourquoi elle a survécu aux revues |
|---|---|---|
| #7184 | Store de racine à un index hors du frame poussé | \`js_shadow_slot_bind\` vérifie les bornes et ne fait rien silencieusement ; l’IR *dit* qu’il est rooté |
| #7192 | Store de racine émis *après* un appel allouant | Le slot finit rooté **et** pendant ; il réussit tout test « est-il rooté ? » |
| #7206 | Receiver de méthode chargé, puis abaissement des arguments — chacun peut allouer — avant usage | Le load paraît évidemment correct isolément |
| #7206 | \`base[key]\` : matérialiser la base, abaisser la clé, puis utiliser la base périmée | Deux opérandes ; l’un est évalué en premier et utilisé en dernier |
| #7226/#7239 | Une cellule thread-local ou statique cache un pointeur heap qu’aucun scanner ne réécrit | Invisible dans l’IR |

Quatre ont été livrées **le même jour**. Chaque correction faisait quelques lignes ; le coût venait toujours du délai de détection. Seule la première est spécifique au shadow stack. Les autres sont indépendantes du lowering et ont survécu au passage aux statepoints, car l’erreur concerne *le moment où le lowering émet la racine*, non la définition d’une racine.

La seule heuristique vraiment utile : **un bug GC parfaitement reproductible signifie une table, pas un registre.** Un registre non rooté ne se dégrade que si une collecte tombe dans sa fenêtre, donc de façon intermittente ; un cache non rooté casse à la collecte #0 et reste cassé. Il existe une exception connue, une sixième forme qu’aucun rooting ne peut corriger : un \`&str\` ou \`&[u8]\` emprunté à un \`StringHeader\` du heap et conservé pendant un appel allouant. Le rooting réécrit le *slot* ; un emprunt n’est pas un slot. La seule solution saine consiste à copier les octets hors du heap avant la première allocation.

### 2. Nous avons cessé d’inspecter et construit des instruments

Le tournant de #7154 ne fut pas une correction, mais l’abandon de l’inspection après dix enquêtes et la construction d’outils transformant le bug en faute immédiate.

**Quarantaine du from-space.** Après un minor évacuant, le from-space n’est pas recyclé. Les blocs retirés sont détachés dans un anneau borné, remplis d’un mot poison dont le premier octet se lit comme un \`obj_type\` invalide (\`0xDE\`), et l’intérieur aligné aux pages reçoit \`mprotect(PROT_NONE)\`. Une déréférence périmée provoque maintenant SIGSEGV *à l’instruction fautive*, avec le détenteur encore sur le stack. Le reporter indique l’adresse, le minor qui a retiré la page et l’objet qui y vivait, puis restaure \`SIG_DFL\` et refaute pour que le débogueur voie le véritable site.

**GC zeal.** Forcer un minor évacuant à chaque safepoint, afin qu’une valeur non rootée bouge dès sa première exposition plutôt que lorsqu’une rafale d’allocations indépendante tombe par hasard dans sa fenêtre. Le modèle est \`--stress-scavenge\` de V8 et \`gcZeal\` de SpiderMonkey.

**Un réglage de profondeur que personne n’attendait.** La quarantaine est un anneau de *N* ensembles de pages retirées, 4 par défaut. Le reproducteur \`new C(…)\` de #7154 ne faute ni à 4, ni à 8, ni à 100. Son constructeur traverse environ 600 polls de back-edge ; quand le return override publie le registre périmé du caller, la page a 600 retraits. Avec \`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\`, il faute au premier usage. « Augmentez la profondeur » est désormais notre premier conseil lorsqu’un bug suspect refuse de se reproduire.

Les instruments sont **testés par sabotage**, pas simplement exécutés : \`quarantine_catches_a_planted_stale_from_space_deref\` plante la forme #7184/#7192 et exige que l’instrument voie le poison là où le contrôle non instrumenté lit un objet recyclé parfaitement valide. Ce contrôle démontre que le bug est véritablement invisible sans l’outil.

Il existe aussi un instrument statique : \`scripts/gc_root_dominance_check.py\` lit l’IR LLVM émis et vérifie que les stores de racines dominent tout site ultérieur capable de collecter. Sa barrière CI possède actuellement une allowlist **vide** ; tout nouveau hit rougit le build. Elle reste structurellement aveugle à trois classes — tables runtime, locales non rootées dans le Rust runtime et symboles qu’elle ne nomme pas — et nous l’écrivons clairement, car un rapport propre a été pris deux fois pour une preuve portant sur ce qu’il ne pouvait pas vérifier.

### 3. La moitié de nos réglages ne contrôlaient rien

Cette surprise a davantage changé notre politique d’ingénierie que notre code.

Pendant des mois, \`PERRY_GEN_GC_EVACUATE\` servait à prouver qu’un changement était sûr sous évacuation. Quand nous l’avons enfin mesuré correctement — binaires identiques, même hôte, diff cellule par cellule sur 12 probes ratchet × 8 compteurs — il a déplacé **0 des 96 cellules**. Médianes identiques bit pour bit. La même méthode avec \`PERRY_GEN_GC=0\` en déplaçait 79 : le harness était sensible, ce réglage précis ne l’était pas. Il pilotait un fallback d’où ne venaient jamais les compteurs.

Son seul effet réel était un piège : il interdisait l’évacuation forcée. Un \`PERRY_GEN_GC_EVACUATE=0\` ambiant désarmait silencieusement \`PERRY_GC_ZEAL\`, et une exécution zeal pouvait annoncer « propre » sans avoir rien déplacé.

Il n’était pas seul :

- \`PERRY_GC_FORCE_EVACUATE\` était lu **uniquement sur le chemin minor**, tandis que tous les tests l’utilisant appelaient \`gc()\`, qui exécutait un full mark-sweep derrière un scan conservateur forcé. Des mois de « passe sous évacuation forcée » ne signifiaient rien.
- Le réglage \`--pressure\` de la matrice de stress désactivait le chemin qu’il mesurait : hard cap de report et plafond du trigger arena partageaient une formule et s’effondraient ensemble ; le bras \`default\` lançait zéro copying minor sur les 22 lignes.
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\` était totalement inerte seul : le scan ne s’exécutait jamais, donc rien n’avortait, et l’exécution annonçait un succès.
- Le commentaire de \`gc_incremental_enabled\` disait « EXPERIMENTAL — default OFF » huit lignes au-dessus d’un commentaire de body « DEFAULT ON ». Une décision de merge s’est fondée sur le mauvais.

La politique issue de cela est désormais contraignante dans \`CLAUDE.md\` :

> **Chaque variable d’environnement GC possède soit un bras CI obligatoire qui exerce son état OFF, soit elle est supprimée après une release de maturation.** Au plus une variable uniquement diagnostique peut exister à la fois, et elle doit être étiquetée non testée.
>
> **Un mode qui existe encore est une décision qui n’a pas été prise.**

\`PERRY_GEN_GC_EVACUATE\` a été supprimé, pas corrigé. Chaque site conserve un commentaire-lapidaire expliquant ce qui existait et pourquoi il n’existe plus — cinq exactement là où quelqu’un réintroduirait la conjonction. Un audit CI dérive les noms admis des parsers de production non commentés et échoue face à toute affirmation vivante sur une variable supprimée. Son self-test plante une variable supprimée derrière un parser commenté et prouve qu’aucun ne peut passer.

### 4. Des barrières incapables d’échouer

\`CLAUDE.md\` liste quatre façons dont une barrière CI peut être structurellement incapable de rougir un merge. Les quatre ont frappé ce dépôt, trois dans la même semaine :

1. \`continue-on-error: true\` : \`gc-stress\` l’a porté pendant des mois alors qu’il était le seul job couvrant la correction du GC.
2. Absence des contexts obligatoires de branch protection : un job qui signale un échec sans bloquer est une documentation, pas une barrière.
3. \`concurrency\` avec \`cancel-in-progress\` inconditionnel : dans une file lente, chaque merge annule le précédent avant qu’il n’atteigne un runner. \`gc-ratchet\` a connu trois exécutions \`main\` annulées et zéro exécutée.
4. **La barrière s’exécute mais son sujet ne l’a jamais fait**, la plus dangereuse puisque le job est réellement vert.

Puis nous en avons trouvé deux autres. \`gc-stress\` n’avait *jamais tourné sur \`main\`* : le trigger \`push:\` du workflow ne concernait que les tags et la condition \`if:\` omettait \`schedule\`, de sorte que 12 nightlies sur 12 l’annonçaient \`skipped\`. Et \`lint\` — un context *obligatoire* — était rouge depuis plus de trois nightlies à cause de 16 fichiers dépassant 2000 lignes ; tous les merges entraient par bypass admin. La branch protection était du théâtre, et une nouvelle barrière correcte branchée sur \`lint\` serait arrivée inerte.

La conséquence que nous réapprenons : **une barrière doit affirmer que son sujet était vivant**, pas seulement que rien n’a levé d’exception. Les runs zeal impriment à la sortie \`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\` et **sortent avec le code 70 si l’un vaut zéro**. Une exécution qui n’a rien exercé devient rouge, pas verte.

### 5. Le collecteur planifiait des collectes incapables de l’aider

Un bug structurel récurrent, trois instances indépendantes et une seule forme : *un prédicat programme une collecte qui ne peut pas modifier la quantité qu’il lit.*

**Le passage de relais de la promotion des survivants (#7592).** Un prédicat remplaçait un minor par un full mark-sweep pour faire de la place en old-gen aux survivants à promouvoir. Mais un full mark-sweep ne déplace rien, donc ne promeut rien ; il ne soulageait pas la pression et redevenait vrai au minor suivant. Mesuré sur un pipeline JSON de 200 000 enregistrements : **19 des 22 collectes étaient ces fulls, chacune libérant 0,0 Mo pour environ 400 ms.** 7,6 s d’une phase de 8,6 s. Le copying minor qui aurait réellement promu ne s’est jamais exécuté.

**Le plafond de nursery (#7690).** Un cap indexé sur l’occupation du from-space, appliqué à un minor *non mobile* qui sweep in place et laisse le from-space occupé. Une fois déclenché, il est à nouveau dû au bloc suivant : une collecte de toute l’arena par mégaoctet alloué, quadratique dans l’ensemble vivant.

**Le plafond proportionnel au vivant qui formait un point fixe.** Une tentative utilisait \`max(base, arena_in_use)\`. Mais le test compare l’occupation du *from-space* au cap, et sur ce workload from-space ≈ vivant. Il ne pouvait jamais franchir son propre plafond ; le scavenging s’arrêtait. L’amélioration mesurée de 5,9× venait d’un travail nul.

Deux règles en sont sorties et portent notre pacing :

> **Ne cadencez jamais une collecte par une quantité qu’elle ne modifie pas.**
>
> **Aucune bande constante ne doit cadencer un collecteur dont le coût par cycle est O(vivant)** : le travail total devient quadratique et agrandir la constante ne fait que déplacer la falaise.

Corriger cette famille a fait passer un workload JSON de **60,4 s à 3,86 s**, avec un coût par enregistrement stable à environ 30 % sur un facteur 20 de taille, là où il croissait auparavant de 70×.

### 6. Et une fois, le collecteur a documenté un changement jamais effectué

La ligne la plus coûteuse de cette histoire est un commentaire de documentation.

#7690 a écrit l’argument complet pour activer par défaut les polls mobiles de back-edge de boucle dans deux commentaires — runtime et codegen — et **n’a changé aucun body**. Tous deux acceptaient encore \`1|on|true\`, donc default OFF, sans test fixant le défaut. Le commentaire runtime affirmait même que le miroir codegen « MUST agree » ; ils concordaient, mais sur la valeur que la documentation disait avoir changée.

Ce n’est pas une configuration plus lente, mais un autre collecteur. La pression nursery n’a que deux points précis de collecte : le poll de back-edge et la frontière externe de la pompe microtask. Sans poll émis, un programme purement calculatoire n’atteint aucun des deux. Toute collecte nursery tombait donc au point d’allocation, où un correctif précédent les avait justement rendues non mobiles. **Le collecteur livré n’évacuait pas du tout la nursery** et retombait sur des full collections de toute l’arena.

| benchmark | \`main\` livré | polls réellement actifs |
|---|--:|--:|
| tree | 5,10 s | **1,63 s** |
| tree_wide | 7,26 s | **2,12 s** |
| retain | 2,33 s | **1,32 s** |
| churn | 1,00 s | **0,46 s** |
| cycles | 0,29 s | **0,19 s** |

Un benchmark exécutait **13 full collections de toute l’arena — 0,477 s de pause —** là où le même programme quelques semaines plus tôt lançait **105 copying minors — 0,016 s —**. La pause GC totale de \`tree\` passa de 4,107 s à 0,550 s, la maximale de 266 ms à 16 ms.

Ce ne fut pas le temps qui le révéla, mais les *types* de cycles dans \`PERRY_GC_TRACE=1\` : \`{'full': 13}\` au lieu de \`{'minor': 105}\`.

Trois tests fixent désormais le défaut, dont le bras valeur inconnue, et un autre impose l’accord des deux crates. Le désaccord est silencieux dans les deux sens — polls que rien ne consomme ou report que rien ne draine — et exige une assertion plutôt que deux commentaires.

Cette classe n’est pas close. Un profil récent a trouvé la même forme dans la write barrier : **codegen émet un load \`seq_cst\` du compteur barrier-active — un \`ldar\` sur aarch64, 42 sites dans \`evalNode\` — tandis que runtime lit le même global en \`Relaxed\` pour la même décision**. Le commentaire codegen promet « one relaxed load of a \`static\` ». Deux lecteurs se contredisent sur l’ordering, documentation contre code. Au plus un a raison ; si runtime se trompe, le bug dépasse largement le \`ldar\`. Il est enregistré mais volontairement non corrigé : deviner faux peut manquer une insertion barrier, invisible pendant la collecte puis visible plusieurs cycles plus tard comme \`TypeError: value is not a function\`.

### 7. Le travail GC le plus rapide est celui qu’on supprime

Une fois les bugs de pacing éliminés, le coût restant s’est révélé être, à plusieurs reprises, du travail qui n’aurait jamais dû exister.

**Un heap où rien ne meurt était marqué sans cesse.** \`retain.ts\` construit un tableau de 3 millions d’enregistrements sans en abandonner aucun. Perry passait **1,26 s d’un run de 1,31 s dans le collecteur**, soit 96 %. Node le fait en 0,13 s. Deux full mark-sweeps récupéraient 4 Mo à eux deux, l’un ne modifiant l’occupation d’aucun octet, parce que le prédicat d’escalade dépendait de la croissance : un ensemble vivant croissant franchit un seuil à chaque doublement. Correction : tarifer un full selon ce qu’il récupère et repousser le seuil lorsqu’il s’avère improductif.

**Chaque objet évacué prenait un mutex global pour hasher une map vide.** Un move hook lançait un \`remove\` SipHash dans le registre résiduel \`Object.setPrototypeOf\`, vide dans tout programme qui ne change pas les prototypes. Un latch l’indiquait déjà ; ce hook était le seul lecteur à l’ignorer. Une promotion de 3 millions d’enregistrements payait 2,5 millions d’acquisitions de mutex réelles mais inutiles.

**Puis nous avons cessé de déplacer les objets.** Si la nursery d’un copying minor est presque entièrement vivante, évacuer objet par objet est un pur overhead : nouvelle allocation old-gen, \`memcpy\`, transfert de layout, accounting, hooks, forwarding stub et réécriture de chaque slot référent, pour déplacer un objet sans raison. La promotion in place de blocs entiers — page promotion chez V8 — réétiquette simplement leur génération. Rien ne bouge, rien n’est réécrit :

| workload | avant | après |
|---|--:|--:|
| retain | 0,81 s | **0,53 s** |
| retain_wide | 1,33 s | **1,07 s** |
| deeplist | 0,30 s | **0,24 s** |
| coût de promotion/objet | 243 ns | **105 ns** |

**Puis nous avons aussi cessé de les tracer.** Trois passes parcouraient encore chaque survivant : le scan dirty du remembered set le marquait, le drain le retouchait et \`clear_marks\` une troisième fois. Dans un cycle où rien ne bouge ni ne peut être libéré, le trace coûtait 55–67 ns par objet, contre environ 9 ns pour le parcours qui promeut réellement. Un cycle de promotion saute maintenant le trace lorsque le dernier ratio de survie mesuré est dans le régime entièrement vivant, mais refuse explicitement dès qu’une hypothèse coûte quelque chose : holder de weak targets enregistré, registre malloc non vide, mark incrémental en cours ou l’un des trois instruments de vérification. Chacun prend le trace pour sujet ; sans marques, tous pourraient annoncer un succès sans examen. Résultat : \`retain\` −33,6 %, \`deeplist\` −43 %, et les cycles qui coûtaient 243 ns par objet en coûtent **8,9 ns**.

La politique repose sur une *mesure*, pas une intuition. La liveness d’un bloc est inconnue avant le trace ; la décision utilise donc le ratio de survie jeune du cycle précédent. La population s’est avérée bimodale sur trois ordres de grandeur :

| famille de workloads | copying minors | ratio de survie jeune |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0,999 – 1,000 |
| churn, churn_alloc, push_cls | 105 | 0,000 – 0,004 |
| push_num, cycles | 16–18 | 0,000 |
| tree, tree_wide, churn_read | 0 | *aucun copying minor ne s’exécute* |

Un cycle mal prédit retient au plus quelques pour cent d’une nursery, un cycle de promotion trace encore assez souvent pour se mesurer, et un cap courant sur les octets morts promus borne l’état stationnaire.

Il faut le dire clairement : **l’histoire du « mécanisme unique » est généralement fausse, et votre propre profil se déplace sous vos pieds.** Fractions de pause actuelles, mesurées au même commit que le classement final :

| programme | wall | pause GC | fraction de pause | cycles |
|---|--:|--:|--:|--:|
| retain | 159,5 ms | 52,0 ms | 33 % | 5 |
| retain1 | 71,4 ms | 38,7 ms | 54 % | 3 |
| retain_wide | 206,2 ms | 75,4 ms | 37 % | 8 |
| shapes | 64,8 ms | 4,6 ms | **7 %** | 1 |
| asyncpipe | 127 ms | 0 ms | **0 %** | 0 |

Deux de ces chiffres étaient 93 % et 62 % une semaine auparavant ; le travail de cette section les a tués. \`shapes\` à 7 % n’est plus du tout un benchmark GC — avant le bug de \`8, 94 ms sur 139 ms étaient du GC, et nous l’avions classé « GC à forte survie » sur ce ratio. Les leviers GC ne le déplaceront plus. Un ratio apparemment uniforme entre benchmarks était une coïncidence arithmétique, pas une cause commune.

### 7b. « Zéro cycle » ne signifie pas « aucun coût GC » : un compteur pris pour une conclusion

La ligne \`asyncpipe\` dit 0 ms de pause sur 0 cycle. Nous l’avons décrite en interne comme « mutateur pur, tout levier GC est inutile ». Un profil briefé avec cette prémisse l’a réfutée.

\`asyncpipe\` n’imprime jamais \`[gc]\`, mais **environ 33 % de son profil leaf reste de la mécanique du collecteur** : write barriers, side tables de layout par objet et rooting \`RuntimeHandleScope\`. Désactiver les polls mobiles de back-edge mesure **−14,1 % alors que le programme exécute toujours zéro cycle**. Un mark/sweep old-gen incrémental avance à ces polls sans terminer de cycle, donc sans en signaler. C’était le plus gros levier de la ronde, et notre prémisse en détournait le profiler. (\`PERRY_WRITE_BARRIERS=0\` donne +0,9 % : les barrières codegen sont innocentées, pas le drive incrémental.)

> **Un compteur de cycles mesure des collectes, pas le coût du collecteur.**

Barrières, side tables, rooting et slices incrémentales sont côté mutateur, structurellement invisibles pour une trace par cycle. \`0 cycles\` ressemble à une conclusion, mais n’observe qu’un mécanisme.

Le piège lié : \`asyncpipe_big.ts\` **n’est pas** une version valablement agrandie. À 120 batches il exécute zéro cycle, à 240 deux copying minors, à 1200 le GC domine. Agrandir pour dépasser le bruit temporel a silencieusement créé un autre benchmark, comme les variantes « réalistes » vacuement discriminantes de \`9 ; seul un contrôle de la propriété étudiée l’a révélé.

### 8. Seize octets au-dessus d’une limite

Le meilleur bug de la campagne. \`shapes\` dépensait 94 ms d’un run de 139 ms dans deux minor collections, annonçant des ratios de survie de 739‰ et 925‰ alors que son ensemble vivant réel comptait environ 3200 objets.

\`arena_alloc_gc\` crée tout ce qui dépasse \`LARGE_OBJECT_THRESHOLD_BYTES\` — 16 Ko — directement dans old-gen et le marque \`TENURED\`. Le backing store d’un \`Node2D[]\` de 2000 éléments mesure 16 400 octets. **Seize octets au-dessus de la limite.**

Chaque tableau restait donc vivant à jamais — un minor ne sweep jamais old-gen —, la write barrier enregistrait fidèlement une arête ancien→jeune pour chacun de ses 2000 stores, et chaque minor suivant les remarquait tous : 94 000 puis 118 006 slots remarqués.

La correction est intéressante, car « augmenter le seuil » aurait été faux. Le franchir échange *coût de copie* contre *coût de rétention*. Pour un objet sans pointeurs, les deux sont bornés par sa taille : 16 Ko restent. Pour un objet contenant des pointeurs, la rétention est transitive et illimitée ; tableaux, objets et closures obtiennent 128 Ko — le \`kMaxRegularHeapObjectSize\` de V8 pose la même limite pour la même raison. La sélection lit le flag \`pointer_free\` existant au lieu d’une liste de types ; un type inconnu garde la valeur conservatrice.

\`shapes\` est passé de 0,139 s à 0,061 s dans cette ronde — 0,058 s et 1,39× *plus rapide* que Node dans le sweep final —, avec un RSS maximal de 71,4 à 32,3 Mo. Les 18 autres programmes ont bougé de ±1,3 %.

### 9. Mesurer s’est révélé plus difficile que corriger

Liste partielle de choses ayant produit une conclusion assurée et fausse :

- **Nous avons benchmarké contre un \`main\` cassé.** Pendant plusieurs jours, les programmes riches en allocations étaient environ 20× trop lents — surprise #6 —, rendant chaque A/B inutile. La signature était indépendante de la charge : 105 → 1304 collectes. Personne ne l’a regardée parce que les temps étaient seulement *mauvais*, pas absurdes.
- **Le relink auto-optimize reconstruit la runtime avec \`--no-default-features\`**, supprimant silencieusement \`diagnostics\`. \`PERRY_GC_TRACE\` n’imprime rien et les cycles paraissent à **0**. Une enquête a conclu « zéro collecte » pour trois bras avant de le voir.
- **Une baseline ratchet figée sur un autre hôte et trente versions plus tôt** signalait 29 « régressions » qui n’étaient que du drift. Toujours mesurer les deux bras dos à dos sur la même machine.
- **Un gain de pretenuring de 108 Mo → 0 était confondu** : le bras base précédait un changement intermédiaire. Le mécanisme était correct, la cible fausse — un arbre de parsing alloué par runtime, pas les littéraux visibles de codegen — et le plafond autour de 1 Mo.
- **Nous avons chronométré un programme qui crashait pendant des semaines.** Le binaire d’un concurrent imprime la bonne réponse à \`deeplist\` puis sort −11 (SIGSEGV) lors d’un drop récursif de refcounts. Nous notions cette colonne comme une défaite. Chaque harness enregistre maintenant les codes de sortie.
- **\`grep -c\` sort avec 1 pour zéro correspondance**, tronquant silencieusement les chaînes \`&&\`. Même chose pour un pipe \`PERRY_GC_TRACE\` recevant SIGPIPE et sortant 141.

Les règles survivantes : citer le compteur de recensement, pas l’horloge — il est indépendant de la charge — ; comparer les *binaires* avant les timings ; affirmer que la comparaison a réellement comparé quelque chose ; vérifier que le bras prétendument testé était vivant.

---

## Partie 3 — Les deux longues routes

### Statepoints : route prise, après quatre mois et trois prérequis

\`gc.statepoint\` de LLVM était dès le premier prototype le mécanisme manifestement supérieur en correction. Il offre une **sémantique de relocation que l’optimiseur doit respecter**, là où un shadow stack n’est correct que tant que l’optimiseur ne fait rien d’intelligent avec une valeur qu’on a oublié de spiller. L’intéressant est tout ce qui sépare « évidemment meilleur » de « livré par défaut », car aucun retard ne concernait les performances.

**Il était bloqué par des choses qui n’étaient pas le GC.** Les exceptions étaient abaissées en \`setjmp\`/\`longjmp\`, et un \`longjmp\` peut sauter *au-delà* d’un \`gc.relocate\` : le pointeur relocalisé n’est jamais réécrit. Sous RS4GC, c’est pire : \`mem2reg\` ne promeut pas les allocas volatile nécessaires à setjmp ; les racines des régions \`try\` n’entrent donc jamais en SSA et ne sont jamais relocalisées. \`gc.statepoint\` possède précisément une forme invoke pour cela. La route a traversé la suppression complète du lowering setjmp des exceptions de Perry au profit d’invoke/landingpad (#7302/#7305), et l’intégration de LLVM dans le processus (#7301) pour contrôler la pipeline. Aucun n’était un ticket GC.

**Le compromis tentant était le piège.** « Garder le shadow stack pour les fonctions \`try\` » aurait figé deux mécanismes de racines à jamais. « Supprimer le shadow stack et garder les statepoints » s’est révélé non *exprimable* : les statepoints sont un lowering alternatif de l’analyse du jeu de racines du shadow stack, pas un mécanisme indépendant. Séparer le prédicat (#7340) a rendu possibles le défaut par cible et toute suppression future. Avant, \`PERRY_SHADOW_STACK=0\` plus statepoints produisait un binaire **sans racines précises**, sans section \`__perry_gcmap\`, avec sortie correcte et impossible à distinguer d’un bon build jusqu’à ce qu’une collecte libère du vivant.

**L’un des deux backends devait mourir.** Nous avons porté un pont statepoint explicite écrit à la main à côté de RS4GC. Ils n’étaient pas pairs : le pont ne pouvait pas rooter un \`invoke\` et refusait les fonctions avec \`try\` ; il servait aussi de fallback silencieux à RS4GC, la configuration non testée que notre politique interdit. Avant suppression, nous avons mesuré **1574 fonctions d’une vraie app Drizzle et des probes ratchet : toutes abaissées par RS4GC, aucune en fallback.** Le pont, son analyse de liveness CFG, parser d’appels, émetteur, l’enum \`PreciseRootBackend\` et \`PERRY_STATEPOINTS\` ont disparu ensemble. Un bail est désormais une erreur dure nommant la fonction, pas un downgrade.

**Puis le défaut a été livré sans couverture.** Les racines natives étaient par défaut sur les cibles parcourables depuis des mois, tandis que **neuf mécaniques du lowering des racines n’avaient aucune assertion sur le lowering réellement émis**. Trois tests ressemblant à une couverture ne mesuraient rien : ils affirmaient l’absence de \`js_shadow_slot_bind\`, vraie pour tout programme sous le défaut natif, rooté ou non. Hazard 4 encore, dans le système chargé de ne pas perdre silencieusement les racines. #7653 l’a corrigé depuis trois points de vue — IR pré-\`opt\`, bundles \`"gc-live"\` post-RS4GC et blob \`__perry_gcmap\` décodé — chacun voyant ce que le suivant manque. Le checker de dominance avait le problème inverse : ancré sur \`@js_shadow_slot_bind\`, son corpus compilait avec \`PERRY_RS4GC=0\`. Jusqu’à #7663, il vérifiait un lowering que nous ne livrions plus.

Une loi de conception est sortie de l’expérience, payée par un résultat négatif mesuré : **des métadonnées de racines sans sémantique de relocation sont incorrectes sous un compilateur optimisant.** Un schéma compact par fonction produisait des cartes 10–13× plus petites et corrompait déterministiquement une boucle churn de dix lignes. La carte n’était pas fautive ; le mutateur lisait le from-space via des valeurs SSA dérivées du heap et périmées que seule une relocation peut corriger. Les barrières contraignent l’ordering mémoire, pas le dataflow.

### Unboxing : en cours, et désormais le sujet principal

L’autre longue route vient de la Partie 1 : rendre canonique la représentation native non boxed et reléguer le NaN-boxing au fallback polymorphe. Les phases 1 — locales scalaires —, 2 — ABI spécialisée —, 3a/3b — chaînes et locales pointeur \`Ptr<Shape>\` — et 4a/4b — heap typé, d’abord tableaux numériques puis comptabilité inutile du layout boxed — sont fusionnées.

Deux éléments méritent un rapport honnête.

**Une sous-phase a été évaluée puis rejetée, pour une raison qui complimente le NaN-boxing.** Les *champs d’objet* non boxed, titre initial de 4b, ont été écartés après reconnaissance. Un slot \`number\` contient déjà des bits IEEE bruts, puisque le NaN-boxing ne réserve que \`0x7FF9..=0x7FFF\` ; \`raw_f64_mask\` est donc un *bit de preuve*, pas une modification de stockage, et le guard de lecture avait déjà disparu. Des handles de chaînes bruts casseraient l’optimisation des petites chaînes en les matérialisant inutilement dans le heap. Des slots \`i1\`/\`i32\` bruts exigeraient un troisième masque et une consultation de layout sur environ 25 lectures directes, dont \`JSON.stringify\`, \`util.inspect\` et le serde \`v8\` — des chemins chauds. Ce qui a été livré est l’élision : un store de champ sur receiver prouvé retire sa note de layout lorsque la valeur est non-pointeur par construction, et son addref de chaîne lorsqu’elle ne peut pas être une chaîne heap.

**Le GC a donné la prochaine cible.** La mesure finale de la Partie 4 montre que le collecteur ne contraint plus notre cluster difficile : le mutateur le fait, précisément parce qu’**un littéral objet à deux champs occupe 72 octets**. C’est un problème de représentation au sens exact du RFC, et c’est là que « vrais objets » continue.

### Routes non prises

**Concurrence.** Directive du propriétaire :

> « Je ne veux pas poursuivre parallélisme/concurrence pour eux-mêmes. Ce doit être un recours ultérieur pour du travail nécessaire, mais pas au détriment du hot path. »

La contrainte *décide* la conception. Les trois familles diffèrent par la charge imposée au mutateur : stop-the-world parallèle ne lui coûte rien — les threads GC n’existent que pendant la pause — ; marking concurrent impose une store barrier sur chaque écriture ; compaction concurrente impose une **load barrier** sur chaque lecture. Les lectures dominent largement les écritures, donc la dernière est le non le plus ferme. STW parallèle est seul admissible et arrive troisième après supprimer le travail inutile par objet et pretenure la cohorte immortelle. Paralléliser 2,1 millions de visites qui ne devraient pas exister revient à faire plus vite la mauvaise chose sur quatre cœurs.

La mesure a confirmé plus fortement encore. Après \`7, les visites du pire cas de promotion se répartissaient entre travail supprimé et **9,6 ms d’un programme de 159 ms**. Il ne reste pas assez de temps collecteur à paralléliser : doubler sa vitesse donne 3 % au programme. Le GC parallèle n’est pas un plan différé, mais un non-levier mesuré.

Argument de correction supplémentaire : « un bug GC parfaitement reproductible signifie table, pas registre » est aujourd’hui diagnostique. Un collecteur parallèle le détruit et transforme 79 scanners de racines et chaque cache \`thread_local!\` en data race possible.

**Défragmentation des anciennes pages : activée par défaut et annulée le jour même.** Exemple le plus récent de la règle 1.

La compaction de pages anciennes partiellement vivantes était désactivée depuis un bug de juillet 2026 : référence non-heap périmée vers un objet ancien déplacé, corruption 6/6. Sa réactivation était un *projet de contrat de réécriture*, pas un simple flip. L’issue exigeait d’énumérer tous les chemins metadata/IC/cache pouvant retenir une adresse ancienne mobile et de **« réactiver defrag seulement quand reproducteur et corpus de stress à l’échelle des dépendances sont propres ».**

Le travail de contrat est solide : allowlist de dominance toujours vide, donc environ 40 hits auparavant exemptés réellement corrigés ; politique des holders *resserrée* pour faire échouer \`open_gap\` et \`unverified\` ; deux caches dont la sécurité reposait sur « only old-gen defrag can move them » corrigés. Une exemption supprimée portait même un \`becomes_real_when\` nommant exactement ce déclencheur.

Le **flip par défaut** est arrivé sans preuve, car la suite ne peut structurellement en produire. La sélection exige \`dead_bytes >= live_bytes\` sur une ancienne page : promouvoir puis mourir à grande échelle. \`retain\` survit à 999–1000‰ et \`churn\` promeut presque rien ; **aucun benchmark ne crée de page candidate.** La suite ne fournit ni gain ni régression, tout en héritant de la surface de réécriture des anciennes adresses. Toutes les barrières GC étaient encore en file lors du merge.

Nous avons gardé tout le travail de correction et remis le défaut en opt-in jusqu’à l’existence d’un workload de fragmentation capable de l’exercer. Alors le bras perdant sera supprimé. Nouvelle règle :

> **Une fonctionnalité que votre suite ne peut pas déclencher ne peut pas être défendue par elle.** Livrez-la désactivée jusqu’à disposer d’un workload, ou acceptez que les deux bras restent non testés.

**Pretenuring.** Construit deux fois, mesuré, réfuté et garé avec condition écrite de réouverture. La solution architecturalement juste — placer les objets longue durée directement en old-gen — a perdu face à la solution émergente suffisante — une graine promote-on-first-copy borne toute cohorte à un saut. Sous toute charge constructible, les bras étaient indiscernables. Leçon : **testez la forme discriminante avant de construire l’invariant.**

---

## Partie 4 — Où nous en sommes

Sweep final du 12 août 2026, M1 mini épinglé et calme, meilleur sur 5, codes de sortie vérifiés, sortie comparée octet par octet à \`node --experimental-strip-types\` avant chronométrage. 19 benchmarks typés GC face à Node 26.5.1 et un concurrent AOT à comptage de références.

**Perry bat Node sur 9 des 19** — contre 3 au début —, **le compilateur à refcounts sur 14 des 19** et reste **à moins de 1,3× de Node sur 15 des 19.**

| bench | perry | node | P/node | Δ cette ronde |
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

Il reste deux clusters **disjoints**, et les traiter comme un seul mécanisme est une erreur déjà commise :

1. **Face à Node : dispatch et mutateur, surtout pas le GC.** \`iso_miss\`, \`interp\`, \`pipeline\`, \`asyncpipe\`. Principalement dispatch polymorphe, inline caches et sélection de représentation — une autre campagne. Mais lisez la correction suivante avant de prendre les 0 % de \`asyncpipe\` pour « aucun GC ».
2. **Face au compilateur à refcounts : la famille \`retain\`.** \`retain1\` 1,80×, \`retain_wide1\` 1,67×, \`retain_wide\` 1,65×. Tous battent déjà Node. Rien n’y meurt, exactement là où nous attendions un traceur au pire — attente incorrecte d’une façon intéressante.

Le résultat final recadre toute la campagne : **sur le second cluster, le collecteur n’est plus la contrainte, le mutateur l’est.** Soustraire *toute* la pause GC laisse \`retain_wide\` — 130,8 ms de mutateur pur — et \`shapes\` — 60,2 ms — perdants. \`retain\` aurait besoin d’un GC exactement nul. Le vrai coût est qu’**un objet à deux champs occupe 72 octets** : il écrit **216 Mo pour stocker 48 Mo de nombres**, amplification 4,5×. L’avantage concurrent n’était pas le refcounting, mais la compacité. C’est maintenant un problème de représentation (#7916), pas de collecteur : unbox-by-default appliqué au layout objet.

Défaut symétrique dans l’autre cluster : \`asyncpipe\` collecte à 1200–1650 ns par objet, dont une **minor collection de 122 ms traitant zéro objet**, plus longue que le programme. Un coût indépendant du nombre d’objets est un overhead fixe, dernière pièce du collecteur encore sur le critical path (#7915).

Résultat négatif à conserver : **ne réduisez pas la première nursery.** Le cycle 0 représente 58–81 % de la pause de \`retain\` ; le cap semble gratuit et à 2 Mo fait tomber la pause de 52 à 31 ms. Mais \`asyncpipe\` passe de 0 à 4 collectes, 385 ms sur un programme de 127 ms, et la promotion plus précoce recale old-gen vers des full mark-sweeps supplémentaires (\`retain_wide1\` +182 %).

Pour l’échelle du départ : le pipeline JSON est passé de 60,4 s à 3,86 s. La famille \`retain\` a gagné 36–46 % en une ronde. Le collecteur conserve un kill switch vers full mark-sweep (\`PERRY_GEN_GC=0\`) que nous exerçons, car le jour où nous ne pourrons plus bisecter contre lui, nous ne pourrons plus croire ces chiffres.

---

## Les règles selon lesquelles nous travaillons désormais

La plupart dépassent largement le GC :

1. **Un mode qui existe encore est une décision non prise.** Supprimez la branche perdante ou gardez un bras qui l’exerce. Laissez une pierre tombale à l’endroit supprimé.
2. **Une barrière doit affirmer que son sujet était vivant**, pas seulement que rien n’a levé d’exception. « Vert parce que rien n’a tourné » est pire que rouge.
3. **Ne cadencez jamais une boucle de rétroaction avec une quantité qu’elle ne peut pas modifier.** Trois livelocks, une forme.
4. **Aucune bande constante ne doit cadencer un processus O(vivant).** Une constante plus grande déplace seulement la falaise.
5. **Quand une classe de bugs ne laisse aucune preuve, cessez d’enquêter et construisez l’instrument.** Testez-le par sabotage, contrôle non instrumenté compris.
6. **Un commentaire de documentation n’est pas un changement.** Fixez les défauts par tests, valeur inconnue comprise, et fixez l’accord entre composants.
7. **Mesurez les deux bras sur un hôte, depuis le même arbre, et vérifiez le code de sortie.**
8. **Testez la forme discriminante avant de construire l’invariant.**
9. **Refusez l’hybride permanent.** « Garder l’ancien mécanisme pour les cas difficiles » transforme une migration en deux mécanismes éternels. Faites fonctionner le cas difficile ou ne migrez pas.

Le collecteur n’est pas terminé. Pour la première fois, il est *lisible* : chaque réglage contrôle quelque chose, chaque barrière peut échouer, chaque défaut est fixé par un test et chaque chiffre publié a été mesuré sur une machine calme après vérification de la sortie. Cette lisibilité a coûté plus de travail que le collecteur lui-même, et c’est la seule raison pour laquelle les chiffres du dernier mois ont bougé.
`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
