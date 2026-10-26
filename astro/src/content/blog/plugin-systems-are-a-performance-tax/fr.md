---
title: "Les systèmes de plugins sont une taxe sur la performance"
excerpt: "Les architectures de plugins sacrifient la performance au profit de l'extensibilité. Mais si l'extensibilité se faisait au moment de la compilation plutôt qu'à l'exécution ? La composition au moment de la compilation offre les deux — zéro overhead, flexibilité totale."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
Vous installez VS Code. C'est rapide. Vous ajoutez 15 extensions. Maintenant, il met 4 secondes à démarrer et l'Extension Host consomme 800 Mo de RAM. Que s'est-il passé ?

Le schéma se répète partout : WordPress, Eclipse, Chrome, Figma, Slack. L'application est rapide au lancement. Les plugins la rendent lente. Plus personne n'est surpris — nous avons accepté cela comme le prix de l'extensibilité.

Mais les systèmes de plugins ne sont pas qu'un problème de performance. C'est un problème de philosophie de conception. L'industrie a confondu "extensibilité" avec "dynamisme à l'exécution" alors que souvent la meilleure réponse est la composition à la compilation. Les seuls plugins performants sont ceux qui cessent d'être des plugins à la compilation.

## Le spectre de performance de l'extensibilité

Toute extensibilité n'a pas le même coût. Il y a un spectre du coût zéro au coût maximum, et la majeure partie de l'industrie s'est installée du côté coûteux :

1.  **Édition de liens statique / modules à la compilation** — zéro surcharge. Bibliothèques C, crates Rust, packages Go. La frontière du module disparaît complètement dans le binaire final.
2.  **Bibliothèques partagées chargées au démarrage** — quasi nul. Modules nginx, modules du noyau Linux. Coût unique au chargement, puis appels de fonction directs.
3.  **Dispatch dynamique via interfaces / vtables** — faible surcharge. Plugins de moteurs de jeu en C++. Une indirection de pointeur par appel.
4.  **Plugins interprétés dans le même processus** — modéré. Plugins PHP WordPress, bundles OSGi Eclipse. Chaque invocation de plugin passe par un interpréteur.
5.  **Plugins dans un processus séparé via IPC** — significatif. Extensions VS Code, extensions Chrome. Chaque interaction traverse une frontière de processus et sérialise des données.
6.  **Plugins en bac à sable via IPC sérialisé** — lourd. Plugins Figma, content scripts d'extensions de navigateur. Sérialisation, désérialisation et application du bac à sable à chaque appel.

L'idée clé : les seuls plugins performants sont ceux qui cessent d'être des plugins à la compilation. Les niveaux 1 et 2 sont rapides précisément parce que le "plugin" devient indiscernable du code hôte dans l'artefact final.

## Les dégâts concrets

### WordPress

Chaque plugin s'accroche au cycle de vie des requêtes. 30 plugins signifient 30 couches d'appels de fonctions par chargement de page. Le résultat : les plugins de cache existent uniquement pour atténuer les dégâts des autres plugins. Des plugins de performance pour résoudre le problème de performance que les plugins ont créé. La méta-ironie s'écrit toute seule.

### VS Code

Les extensions partagent une seule boucle d'événements Node.js dans un processus séparé. Une extension défaillante bloque toutes les autres. L'Extension Host apparaît régulièrement comme le plus gros consommateur de CPU sur les machines des développeurs. Microsoft a construit des outils de profilage, des commandes de bisection et des systèmes d'événements d'activation — toute une infrastructure pour gérer le problème que les extensions créent.

### Eclipse

L'histoire d'avertissement. Résolution de bundles OSGi, surcharge de chargement de classes, graphes de dépendances massifs. Autrefois l'IDE le plus populaire, maintenant largement abandonné par les développeurs grand public. L'architecture de plugins qui était censée être sa plus grande force est devenue sa faiblesse déterminante.

### Electron lui-même

Le problème des plugins au niveau de la plateforme. Chaque application Electron embarque un runtime complet Chromium + Node.js. VS Code est Electron. Slack est Electron. Discord est Electron. Chacun consommant indépendamment 300–500 Mo de RAM pour afficher ce qui est essentiellement une fenêtre de chat ou un éditeur de texte. Le "plugin" ici est l'ensemble de la plateforme web, empaquetée à neuf pour chaque application.

## Pourquoi l'industrie continue de choisir les plugins malgré tout

Si les plugins sont si coûteux, pourquoi tout le monde continue de les construire ? Les raisons sont principalement organisationnelles, pas techniques :

-   **Expérience développeur** — les plugins sont faciles à écrire quand on ne se soucie pas de la performance. Livrer un fichier JS, s'accrocher à quelques événements, c'est fait.
-   **Croissance de l'écosystème** — les plugins créent des effets de réseau et de l'engagement communautaire. Un marketplace de 30 000 extensions est un avantage concurrentiel puissant.
-   **Commodité organisationnelle** — les plugins permettent aux équipes de reporter les décisions de conception. "Quelqu'un écrira un plugin pour ça" est l'équivalent architectural de "on corrigera en post-production."
-   **Modèle économique** — les marketplaces de plugins créent des revenus et de la dépendance. La plateforme capture de la valeur de l'écosystème.

La vérité inconfortable : les plugins sont souvent un moyen d'éviter de prendre des décisions architecturales difficiles sur ce qui appartient au noyau. Ils vous permettent de livrer quelque chose d'incomplet et de l'appeler "extensible."

## L'alternative : La composition à la compilation

Et si l'extensibilité se produisait au moment de la compilation plutôt qu'à l'exécution ?

Ce n'est pas hypothétique. Il existe des précédents bien établis dans les langages systèmes :

-   **Rust proc macros** — du code arbitraire qui s'exécute à la compilation et génère du code natif sans surcharge. Sérialisation Serde, configuration du runtime async Tokio, routage Axum — tout résolu avant que votre programme ne démarre.
-   **Zig comptime** — exécution à la compilation qui élimine toutes les branches à l'exécution. Les structures de données génériques sont monomorphisées, la configuration est résolue, le code mort est éliminé. Ce qui reste est exactement ce qui s'exécute.
-   **Templates / constexpr C++** — polymorphisme à la compilation sans coût à l'exécution. La STL atteint des performances extraordinaires parce que chaque algorithme générique se spécialise à la compilation.
-   **Tree-shaking dans les bundlers** — une version partielle et imparfaite de cette idée appliquée au JavaScript. Webpack et Rollup éliminent les exports inutilisés au moment de la construction. La limitation est qu'ils ne peuvent que supprimer du code, pas le spécialiser.

Le schéma est constant : déplacer les décisions de l'exécution vers la compilation. Ce que vous n'incluez pas ne coûte rien. Ce que vous incluez compile en code natif sans indirection. La frontière du module devient un outil d'organisation au niveau du code source, pas une frontière de performance à l'exécution.

## Ce que cela signifie pour TypeScript

TypeScript est le langage le plus populaire pour construire des outils extensibles — et le pire en performance à l'exécution. Tout l'écosystème TypeScript tourne sur Node.js, qui tourne sur V8, qui compile le JavaScript en JIT. Chaque couche ajoute de la surcharge : temps de chauffe JIT, pauses du ramasse-miettes, dispatch dynamique pour chaque accès de propriété, frontières IPC entre processus.

C'est là que Perry entre en jeu. Perry compile TypeScript directement en binaires natifs. Pas de V8, pas de chauffe JIT, pas de pauses du ramasse-miettes, pas de frontières IPC.

Quand vos modules compilent en code natif, les "plugins" deviennent simplement... des modules. Ils se composent au moment de la construction. Le binaire final n'a aucune surcharge de plugin car il n'y a pas de plugins — juste du code natif. Un gestionnaire de route Express, une fonction middleware, une bibliothèque utilitaire — ils compilent tous en appels de fonction directs dans le même binaire. Pas de chargement dynamique, pas de sérialisation, pas de frontières de processus.

terminal

\# Votre app, vos dépendances, vos "plugins" — un seul binaire

$ perry compile server.ts -o server

Compiling server.ts + 43 modules...

✓ Built executable: server (1.8 MB, 0.7s)

$ ./server

Listening on port 3000

Ce n'est pas théorique. Perry compile déjà de vrais frameworks TypeScript — Hono, tRPC, Strapi — en binaires natifs ARM64 de moins de 2 Mo, en moins d'une seconde. Les modules qui composent ces frameworks sont compilés, liés et inlinés dans un seul exécutable. Ce qui serait une architecture de plugins avec surcharge à l'exécution dans Node.js devient une composition à coût zéro dans un binaire Perry.

## L'extensibilité dont vous avez réellement besoin

L'objection est évidente : "Mais j'ai besoin d'extensibilité à l'exécution. Les utilisateurs doivent pouvoir installer des plugins sans recompiler."

Vraiment ? Pour la plupart des applications, l'ensemble des extensions est connu au moment de la construction. Vous choisissez votre middleware Express, votre driver de base de données, votre bibliothèque d'authentification, votre framework de journalisation — puis vous déployez. L'"extensibilité" est dans votre `package.json`, résolue au `npm install`, pas à l'exécution.

Les applications qui ont réellement besoin de chargement de plugins à l'exécution — VS Code, WordPress, les navigateurs — sont l'exception, pas la règle. Et même celles-ci paient un prix élevé pour cela. Pour tout le reste, la composition à la compilation vous offre la même flexibilité sans aucune surcharge.

La différence est l'honnêteté architecturale. Au lieu de prétendre que chaque application a besoin d'un système de plugins, vous demandez : cette extensibilité doit-elle se produire à l'exécution, ou le compilateur peut-il faire le travail ?

## La voie à suivre

L'addiction de l'industrie aux architectures de plugins est un symptôme de l'acceptation de la surcharge à l'exécution comme inévitable. Elle ne l'est pas. Le compilateur peut faire le travail. La composition à la compilation vous offre l'extensibilité sans l'impôt.

Nous construisons Perry parce que nous croyons que les développeurs TypeScript méritent des performances natives sans renoncer au langage qu'ils aiment. Vos modules devraient se composer au moment de la construction, compiler en appels de fonction directs et s'exécuter sans la surcharge d'un runtime qui n'existe que pour rendre l'"extensibilité" possible.

Le système de plugins le plus rapide est celui qui n'existe pas à l'exécution.
