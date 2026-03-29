export default function Content() {
  return (
    <>
      <p>
        Vous installez VS Code. C&apos;est rapide. Vous ajoutez 15 extensions. Maintenant, il met 4 secondes à démarrer et l&apos;Extension Host consomme 800 Mo de RAM. Que s&apos;est-il passé ?
      </p>
      <p>
        Le schéma se répète partout : WordPress, Eclipse, Chrome, Figma, Slack. L&apos;application est rapide au lancement. Les plugins la rendent lente. Plus personne n&apos;est surpris — nous avons accepté cela comme le prix de l&apos;extensibilité.
      </p>
      <p>
        Mais les systèmes de plugins ne sont pas qu&apos;un problème de performance. C&apos;est un problème de philosophie de conception. L&apos;industrie a confondu &quot;extensibilité&quot; avec &quot;dynamisme à l&apos;exécution&quot; alors que souvent la meilleure réponse est la composition à la compilation. Les seuls plugins performants sont ceux qui cessent d&apos;être des plugins à la compilation.
      </p>

      <h2>Le spectre de performance de l&apos;extensibilité</h2>
      <p>
        Toute extensibilité n&apos;a pas le même coût. Il y a un spectre du coût zéro au coût maximum, et la majeure partie de l&apos;industrie s&apos;est installée du côté coûteux :
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Édition de liens statique / modules à la compilation</strong> — zéro surcharge. Bibliothèques C, crates Rust, packages Go. La frontière du module disparaît complètement dans le binaire final.
        </li>
        <li>
          <strong>Bibliothèques partagées chargées au démarrage</strong> — quasi nul. Modules nginx, modules du noyau Linux. Coût unique au chargement, puis appels de fonction directs.
        </li>
        <li>
          <strong>Dispatch dynamique via interfaces / vtables</strong> — faible surcharge. Plugins de moteurs de jeu en C++. Une indirection de pointeur par appel.
        </li>
        <li>
          <strong>Plugins interprétés dans le même processus</strong> — modéré. Plugins PHP WordPress, bundles OSGi Eclipse. Chaque invocation de plugin passe par un interpréteur.
        </li>
        <li>
          <strong>Plugins dans un processus séparé via IPC</strong> — significatif. Extensions VS Code, extensions Chrome. Chaque interaction traverse une frontière de processus et sérialise des données.
        </li>
        <li>
          <strong>Plugins en bac à sable via IPC sérialisé</strong> — lourd. Plugins Figma, content scripts d&apos;extensions de navigateur. Sérialisation, désérialisation et application du bac à sable à chaque appel.
        </li>
      </ol>
      <p>
        L&apos;idée clé : les seuls plugins performants sont ceux qui cessent d&apos;être des plugins à la compilation. Les niveaux 1 et 2 sont rapides précisément parce que le &quot;plugin&quot; devient indiscernable du code hôte dans l&apos;artefact final.
      </p>

      <h2>Les dégâts concrets</h2>

      <h3>WordPress</h3>
      <p>
        Chaque plugin s&apos;accroche au cycle de vie des requêtes. 30 plugins signifient 30 couches d&apos;appels de fonctions par chargement de page. Le résultat : les plugins de cache existent uniquement pour atténuer les dégâts des autres plugins. Des plugins de performance pour résoudre le problème de performance que les plugins ont créé. La méta-ironie s&apos;écrit toute seule.
      </p>

      <h3>VS Code</h3>
      <p>
        Les extensions partagent une seule boucle d&apos;événements Node.js dans un processus séparé. Une extension défaillante bloque toutes les autres. L&apos;Extension Host apparaît régulièrement comme le plus gros consommateur de CPU sur les machines des développeurs. Microsoft a construit des outils de profilage, des commandes de bisection et des systèmes d&apos;événements d&apos;activation — toute une infrastructure pour gérer le problème que les extensions créent.
      </p>

      <h3>Eclipse</h3>
      <p>
        L&apos;histoire d&apos;avertissement. Résolution de bundles OSGi, surcharge de chargement de classes, graphes de dépendances massifs. Autrefois l&apos;IDE le plus populaire, maintenant largement abandonné par les développeurs grand public. L&apos;architecture de plugins qui était censée être sa plus grande force est devenue sa faiblesse déterminante.
      </p>

      <h3>Electron lui-même</h3>
      <p>
        Le problème des plugins au niveau de la plateforme. Chaque application Electron embarque un runtime complet Chromium + Node.js. VS Code est Electron. Slack est Electron. Discord est Electron. Chacun consommant indépendamment 300&ndash;500 Mo de RAM pour afficher ce qui est essentiellement une fenêtre de chat ou un éditeur de texte. Le &quot;plugin&quot; ici est l&apos;ensemble de la plateforme web, empaquetée à neuf pour chaque application.
      </p>

      <h2>Pourquoi l&apos;industrie continue de choisir les plugins malgré tout</h2>
      <p>
        Si les plugins sont si coûteux, pourquoi tout le monde continue de les construire ? Les raisons sont principalement organisationnelles, pas techniques :
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Expérience développeur</strong> — les plugins sont faciles à écrire quand on ne se soucie pas de la performance. Livrer un fichier JS, s&apos;accrocher à quelques événements, c&apos;est fait.
        </li>
        <li>
          <strong>Croissance de l&apos;écosystème</strong> — les plugins créent des effets de réseau et de l&apos;engagement communautaire. Un marketplace de 30 000 extensions est un avantage concurrentiel puissant.
        </li>
        <li>
          <strong>Commodité organisationnelle</strong> — les plugins permettent aux équipes de reporter les décisions de conception. &quot;Quelqu&apos;un écrira un plugin pour ça&quot; est l&apos;équivalent architectural de &quot;on corrigera en post-production.&quot;
        </li>
        <li>
          <strong>Modèle économique</strong> — les marketplaces de plugins créent des revenus et de la dépendance. La plateforme capture de la valeur de l&apos;écosystème.
        </li>
      </ul>
      <p>
        La vérité inconfortable : les plugins sont souvent un moyen d&apos;éviter de prendre des décisions architecturales difficiles sur ce qui appartient au noyau. Ils vous permettent de livrer quelque chose d&apos;incomplet et de l&apos;appeler &quot;extensible.&quot;
      </p>

      <h2>L&apos;alternative : La composition à la compilation</h2>
      <p>
        Et si l&apos;extensibilité se produisait au moment de la compilation plutôt qu&apos;à l&apos;exécution ?
      </p>
      <p>
        Ce n&apos;est pas hypothétique. Il existe des précédents bien établis dans les langages systèmes :
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Rust proc macros</strong> — du code arbitraire qui s&apos;exécute à la compilation et génère du code natif sans surcharge. Sérialisation Serde, configuration du runtime async Tokio, routage Axum — tout résolu avant que votre programme ne démarre.
        </li>
        <li>
          <strong>Zig comptime</strong> — exécution à la compilation qui élimine toutes les branches à l&apos;exécution. Les structures de données génériques sont monomorphisées, la configuration est résolue, le code mort est éliminé. Ce qui reste est exactement ce qui s&apos;exécute.
        </li>
        <li>
          <strong>Templates / constexpr C++</strong> — polymorphisme à la compilation sans coût à l&apos;exécution. La STL atteint des performances extraordinaires parce que chaque algorithme générique se spécialise à la compilation.
        </li>
        <li>
          <strong>Tree-shaking dans les bundlers</strong> — une version partielle et imparfaite de cette idée appliquée au JavaScript. Webpack et Rollup éliminent les exports inutilisés au moment de la construction. La limitation est qu&apos;ils ne peuvent que supprimer du code, pas le spécialiser.
        </li>
      </ul>
      <p>
        Le schéma est constant : déplacer les décisions de l&apos;exécution vers la compilation. Ce que vous n&apos;incluez pas ne coûte rien. Ce que vous incluez compile en code natif sans indirection. La frontière du module devient un outil d&apos;organisation au niveau du code source, pas une frontière de performance à l&apos;exécution.
      </p>

      <h2>Ce que cela signifie pour TypeScript</h2>
      <p>
        TypeScript est le langage le plus populaire pour construire des outils extensibles — et le pire en performance à l&apos;exécution. Tout l&apos;écosystème TypeScript tourne sur Node.js, qui tourne sur V8, qui compile le JavaScript en JIT. Chaque couche ajoute de la surcharge : temps de chauffe JIT, pauses du ramasse-miettes, dispatch dynamique pour chaque accès de propriété, frontières IPC entre processus.
      </p>
      <p>
        C&apos;est là que Perry entre en jeu. Perry compile TypeScript directement en binaires natifs. Pas de V8, pas de chauffe JIT, pas de pauses du ramasse-miettes, pas de frontières IPC.
      </p>
      <p>
        Quand vos modules compilent en code natif, les &quot;plugins&quot; deviennent simplement... des modules. Ils se composent au moment de la construction. Le binaire final n&apos;a aucune surcharge de plugin car il n&apos;y a pas de plugins — juste du code natif. Un gestionnaire de route Express, une fonction middleware, une bibliothèque utilitaire — ils compilent tous en appels de fonction directs dans le même binaire. Pas de chargement dynamique, pas de sérialisation, pas de frontières de processus.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Votre app, vos dépendances, vos &quot;plugins&quot; — un seul binaire</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <p>
        Ce n&apos;est pas théorique. Perry compile déjà de vrais frameworks TypeScript — Hono, tRPC, Strapi — en binaires natifs ARM64 de moins de 2 Mo, en moins d&apos;une seconde. Les modules qui composent ces frameworks sont compilés, liés et inlinés dans un seul exécutable. Ce qui serait une architecture de plugins avec surcharge à l&apos;exécution dans Node.js devient une composition à coût zéro dans un binaire Perry.
      </p>

      <h2>L&apos;extensibilité dont vous avez réellement besoin</h2>
      <p>
        L&apos;objection est évidente : &quot;Mais j&apos;ai besoin d&apos;extensibilité à l&apos;exécution. Les utilisateurs doivent pouvoir installer des plugins sans recompiler.&quot;
      </p>
      <p>
        Vraiment ? Pour la plupart des applications, l&apos;ensemble des extensions est connu au moment de la construction. Vous choisissez votre middleware Express, votre driver de base de données, votre bibliothèque d&apos;authentification, votre framework de journalisation — puis vous déployez. L&apos;&quot;extensibilité&quot; est dans votre{" "}
        <code className="text-perry-400">package.json</code>, résolue au{" "}
        <code className="text-perry-400">npm install</code>, pas à l&apos;exécution.
      </p>
      <p>
        Les applications qui ont réellement besoin de chargement de plugins à l&apos;exécution — VS Code, WordPress, les navigateurs — sont l&apos;exception, pas la règle. Et même celles-ci paient un prix élevé pour cela. Pour tout le reste, la composition à la compilation vous offre la même flexibilité sans aucune surcharge.
      </p>
      <p>
        La différence est l&apos;honnêteté architecturale. Au lieu de prétendre que chaque application a besoin d&apos;un système de plugins, vous demandez : cette extensibilité doit-elle se produire à l&apos;exécution, ou le compilateur peut-il faire le travail ?
      </p>

      <h2>La voie à suivre</h2>
      <p>
        L&apos;addiction de l&apos;industrie aux architectures de plugins est un symptôme de l&apos;acceptation de la surcharge à l&apos;exécution comme inévitable. Elle ne l&apos;est pas. Le compilateur peut faire le travail. La composition à la compilation vous offre l&apos;extensibilité sans l&apos;impôt.
      </p>
      <p>
        Nous construisons Perry parce que nous croyons que les développeurs TypeScript méritent des performances natives sans renoncer au langage qu&apos;ils aiment. Vos modules devraient se composer au moment de la construction, compiler en appels de fonction directs et s&apos;exécuter sans la surcharge d&apos;un runtime qui n&apos;existe que pour rendre l&apos;&quot;extensibilité&quot; possible.
      </p>
      <p>
        Le système de plugins le plus rapide est celui qui n&apos;existe pas à l&apos;exécution.
      </p>
    </>
  );
}
