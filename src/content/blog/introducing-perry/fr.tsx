import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Nous sommes ravis de présenter Perry — un compilateur TypeScript natif écrit en Rust qui compile votre TypeScript directement en exécutables autonomes. Pas de runtime Node.js, pas de wrapper Electron, pas de compromis. Juste votre code, compilé en un binaire natif qui démarre instantanément et s&apos;exécute partout.
      </p>
      <p>
        Perry représente une refonte fondamentale de ce que TypeScript peut être. Au lieu de le traiter comme un sur-ensemble de JavaScript qui doit passer par un moteur JS, Perry traite TypeScript comme un langage système — un langage qui se trouve avoir une syntaxe que des millions de développeurs connaissent et aiment déjà.
      </p>

      <h2>Pourquoi nous avons construit Perry</h2>
      <p>
        TypeScript est devenu la lingua franca du développement logiciel moderne. C&apos;est le langage derrière la plupart des frontends web, une part croissante des backends, et de plus en plus le choix pour l&apos;outillage, le scripting et l&apos;automatisation. Mais il a toujours porté une limitation fondamentale : il compile en JavaScript, et JavaScript nécessite un runtime.
      </p>
      <p>
        Ce runtime — qu&apos;il s&apos;agisse de Node.js, Deno ou Bun — vient avec des compromis. Des temps de démarrage à froid mesurés en dizaines ou centaines de millisecondes. De la surcharge mémoire due au compilateur JIT et au ramasse-miettes. Des distributions binaires qui soit embarquent tout le runtime, soit exigent que l&apos;utilisateur en installe un. Et pour les applications GUI, la seule option a été Electron, qui embarque un navigateur Chromium complet avec votre application.
      </p>
      <p>
        Nous nous sommes demandé : et si TypeScript n&apos;avait pas besoin de passer par JavaScript du tout ? Et si vous pouviez le compiler directement en code machine natif, de la même façon que vous compilez Rust, Go ou C++ ?
      </p>

      <h2>Comment Perry fonctionne</h2>
      <p>
        Le pipeline de compilation de Perry a trois étapes :
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Analyse syntaxique</strong> — Perry utilise SWC (le parser TypeScript/JavaScript basé sur Rust) pour analyser votre code source TypeScript en un AST. SWC est le même parser utilisé par Next.js, et il est extrêmement rapide.
        </li>
        <li>
          <strong>Compilation dirigée par les types</strong> — Perry parcourt l&apos;AST avec des informations de type complètes. Contrairement à un moteur JS qui doit gérer les types dynamiques à l&apos;exécution, Perry connaît chaque type à la compilation. Cela permet la monomorphisation des génériques, le dispatch statique des appels de méthodes et l&apos;optimisation directe de la disposition mémoire.
        </li>
        <li>
          <strong>Génération de code</strong> — Perry génère du code machine natif avec Cranelift, le même générateur de code utilisé par Wasmtime et des parties du JIT de Firefox. Cranelift produit du code natif efficace pour x86_64 et ARM64.
        </li>
      </ol>
      <p>
        Le résultat est un exécutable autonome — typiquement 2–5 Mo pour un outil CLI — qui démarre instantanément sans temps de chauffe.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>Quelles fonctionnalités TypeScript sont supportées</h2>
      <p>
        Perry supporte un sous-ensemble large et croissant de TypeScript. L&apos;objectif est la compatibilité complète avec le langage tel que les développeurs l&apos;utilisent réellement. Aujourd&apos;hui, cela inclut :
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tous les types primitifs</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interfaces et alias de type</strong> — y compris les types union, les types intersection et les mapped types</li>
        <li><strong>Génériques</strong> — compilés via monomorphisation, donc <code className="text-perry-400">Array&lt;number&gt;</code> et <code className="text-perry-400">Array&lt;string&gt;</code> génèrent des chemins de code optimisés distincts</li>
        <li><strong>Classes</strong> — avec héritage, champs privés (<code className="text-perry-400">#field</code>), membres statiques, getters/setters et décorateurs</li>
        <li><strong>Async/await et Promises</strong> — compilés en machine à états, similaire à la façon dont Rust gère l&apos;async</li>
        <li><strong>Générateurs et itérateurs</strong> — <code className="text-perry-400">function*</code> et boucles <code className="text-perry-400">for...of</code></li>
        <li><strong>Closures</strong> — avec une sémantique de capture correcte</li>
        <li><strong>Déstructuration</strong> — tableaux, objets, patterns imbriqués et éléments rest</li>
        <li><strong>Template literals</strong> — y compris les tagged templates</li>
        <li><strong>Modules</strong> — imports/exports ESM résolus à la compilation</li>
      </ul>

      <h2>Interface native multiplateforme</h2>
      <p>
        Perry ne se limite pas aux outils CLI et aux applications côté serveur. Il est livré avec des frameworks d&apos;interface natifs pour six plateformes :
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField et plus)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (même API qu&apos;iOS, avec des adaptations spécifiques iPad)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, contrôles communs, GDI)</li>
      </ul>
      <p>
        L&apos;idée clé est que Perry mappe une API TypeScript commune au toolkit de widgets natif de chaque plateforme à la compilation. Il n&apos;y a pas de couche bridge, pas de vue web et pas de moteur de rendu personnalisé. Votre application utilise de vrais widgets de plateforme, rendus par le système d&apos;exploitation lui-même. Lisez-en plus dans notre analyse approfondie :{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          Interface native multiplateforme depuis TypeScript
        </Link>.
      </p>

      <h2>Plus de 27 implémentations natives de paquets npm</h2>
      <p>
        L&apos;un des plus grands défis pratiques d&apos;un nouveau compilateur est la compatibilité avec l&apos;écosystème. Les développeurs n&apos;écrivent pas seulement du code from scratch — ils utilisent des paquets. Perry y répond avec des implémentations natives de plus de 27 paquets npm populaires :
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Bases de données</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Sécurité</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Utilitaires</strong> — uuid, chalk, dotenv, lodash (partiel), moment</li>
        <li><strong>Système</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Ce ne sont pas de minces wrappers autour de modules Node.js. Ils sont compilés directement dans votre binaire en utilisant les bibliothèques système natives — libpq pour PostgreSQL, OpenSSL pour la cryptographie, libcurl pour HTTP. La surface d&apos;API correspond à ce que vous attendez du paquet npm, donc la migration est directe.
      </p>

      <h2>Couche de compatibilité V8 optionnelle</h2>
      <p>
        Pour les paquets npm qui n&apos;ont pas encore d&apos;implémentations natives Perry, Perry offre un mode d&apos;embarquement V8 optionnel. Lorsqu&apos;il est activé, Perry embarque un runtime V8 et peut exécuter des paquets npm JavaScript standard aux côtés de votre TypeScript compilé. C&apos;est une soupape de sécurité pragmatique qui vous permet d&apos;adopter Perry progressivement — compilez les chemins critiques en code natif tout en gardant accès à l&apos;écosystème npm complet pour tout le reste.
      </p>

      <h2>Compilation croisée</h2>
      <p>
        Perry supporte la compilation croisée nativement. Depuis votre machine de développement macOS, vous pouvez compiler pour Linux (x86_64 et ARM64) et iOS. Cela signifie que vous pouvez construire votre pipeline CI/CD sur macOS et produire des binaires pour toutes vos cibles de déploiement sans avoir besoin de machines de compilation dédiées pour chaque plateforme.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Compiler pour Linux depuis macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Compiler pour iOS depuis macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>Performance</h2>
      <p>
        Les binaires compilés par Perry sont rapides. Comme il n&apos;y a pas de chauffe JIT, pas de surcharge d&apos;interpréteur et pas de pauses du ramasse-miettes, les performances sont prévisibles et constantes dès la première invocation.
      </p>
      <p>
        Dans nos benchmarks :
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Temps de démarrage</strong> — effectivement 0 ms (lancement de processus natif)</li>
        <li><strong>Taille du binaire</strong> — 2–5 Mo pour les outils CLI typiques (vs 50+ Mo pour Node.js embarqué)</li>
        <li><strong>Utilisation mémoire</strong> — 5–10x inférieure aux applications Node.js équivalentes</li>
        <li><strong>Débit</strong> — compétitif avec du C écrit à la main pour les charges de travail de calcul intensif</li>
      </ul>
      <p>
        Vous pouvez voir les benchmarks en direct sur{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, qui compare les exécutables compilés par Perry à Node.js et Bun en temps réel.
      </p>

      <h2>État actuel</h2>
      <p>
        Perry est en développement actif. Le compilateur est stable avec 62 tests sur 62 réussis dans la suite de tests. Les six backends d&apos;interface de plateforme sont fonctionnels. Les fonctionnalités principales du langage sont solides et en expansion.
      </p>
      <p>
        Nous travaillons activement à l&apos;expansion de la bibliothèque de widgets d&apos;interface, à l&apos;amélioration des performances des chaînes et des objets, à l&apos;achèvement du support complet des regex et à la construction du module Stream. À plus long terme, nous planifions des cibles de compilation WASM, le multi-threading, une extension VS Code et l&apos;intégration de gestionnaire de paquets.
      </p>
      <p>
        Consultez la <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">feuille de route</Link> complète pour les détails sur ce qui a été livré, ce qui est en cours et ce qui arrive ensuite.
      </p>

      <h2>Démarrer</h2>
      <p>
        Perry est open source. Vous pouvez cloner le dépôt, compiler depuis les sources et commencer à compiler du TypeScript dès aujourd&apos;hui :
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compilez votre premier fichier TypeScript</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        Parcourez le code source sur{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , consultez le{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">showcase</Link>
        {" "}pour voir ce qui se construit avec Perry, ou plongez directement dans le code. Nous avons hâte de voir ce que vous construirez.
      </p>
    </>
  );
}
