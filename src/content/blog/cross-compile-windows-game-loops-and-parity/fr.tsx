import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        103 commits sur le compilateur Perry cette semaine. Les fonctionnalités phares : vous pouvez désormais compiler des exécutables Windows depuis Linux, les apps iOS peuvent exécuter des boucles de jeu bloquantes, le compilateur signale les crashes pour la télémétrie, et le compilateur auto-hébergé passe chaque test déterministe que nous lui soumettons. Plus une mise à niveau majeure de l&apos;infrastructure Hub et plus de 50 corrections de bugs.
      </p>

      <h2>Compilation croisée vers Windows depuis Linux</h2>
      <p>
        Perry peut désormais produire des binaires Windows <code className="text-amber-400">.exe</code> depuis un hôte Linux. C&apos;est la pièce manquante pour les pipelines CI/CD qui doivent cibler Windows sans faire tourner une machine de compilation Windows pour toute la compilation.
      </p>
      <p>
        L&apos;implémentation remplace les vérifications <code className="text-amber-400">#[cfg]</code> à la compilation par une détection de cible à l&apos;exécution. Quand le compilateur détecte une cible Windows sur un hôte non-Windows, il localise <code className="text-amber-400">lld-link</code>, <code className="text-amber-400">llvm-nm</code> et <code className="text-amber-400">llvm-ar</code> depuis la toolchain Rust ou le PATH via un nouveau helper <code className="text-amber-400">find_llvm_tool()</code>. Les bibliothèques système Windows proviennent d&apos;un sysroot de type{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">xwin</a> pointé par <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code>.
      </p>
      <p>
        L&apos;éditeur de liens utilise automatiquement <code className="text-amber-400">/FORCE:UNRESOLVED</code> et génère des stubs pour les symboles UI manquants, permettant aux apps CLI de se compiler proprement. La sortie est par défaut en <code className="text-amber-400">.exe</code> pour le ciblage Windows. Les détails complets sont dans la{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">documentation de compilation croisée</a>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>Support des boucles de jeu iOS</h2>
      <p>
        iOS exige que UIKit possède le thread principal. C&apos;est acceptable pour les apps événementielles, mais c&apos;est un problème pour les jeux qui ont besoin d&apos;une boucle <code className="text-amber-400">while (!shouldClose)</code> bloquante. Perry résout maintenant cela avec le flag <code className="text-amber-400">--features ios-game-loop</code>.
      </p>
      <p>
        Lorsqu&apos;il est activé, le compilateur émet <code className="text-amber-400">_perry_user_main</code> au lieu de <code className="text-amber-400">main</code>. Le runtime fournit un <code className="text-amber-400">main()</code> qui appelle <code className="text-amber-400">UIApplicationMain</code> sur le thread principal et lance votre code sur un thread d&apos;arrière-plan. Le scene delegate et l&apos;app delegate gèrent le cycle de vie UIKit complet pendant que votre boucle de jeu s&apos;exécute sans blocage.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Votre boucle de jeu s&apos;exécute sur un thread d&apos;arrière-plan</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        Cela ouvre toute une catégorie d&apos;applications — jeux, simulations, visualisations en temps réel — qui n&apos;étaient pas pratiques sur iOS auparavant. Les chemins de pompe et de callback iOS sont désormais également enveloppés dans la gestion des panics, de sorte que les crashes dans la boucle de jeu ou le cycle de vie UIKit sont capturés proprement.
      </p>

      <h2>Rapport de crashes</h2>
      <p>
        Les apps compilées par Perry installent désormais un hook de panic et des gestionnaires de signaux pour <code className="text-amber-400">SIGSEGV</code>, <code className="text-amber-400">SIGBUS</code> et <code className="text-amber-400">SIGABRT</code> au démarrage. Lors d&apos;un crash fatal, les détails sont écrits dans <code className="text-amber-400">~/.hone/crash.log</code> pour le système de télémétrie Chirp. Les panics capturés (dans <code className="text-amber-400">catch_callback_panic</code>) effacent le log, de sorte que seuls les crashes véritablement irrécupérables sont signalés.
      </p>
      <p>
        C&apos;est une fonctionnalité de préparation à la production. Quand quelque chose ne va pas sur le terrain, nous le saurons — et le log de crash contient suffisamment de contexte pour diagnostiquer le problème sans que les utilisateurs aient à signaler quoi que ce soit manuellement.
      </p>

      <h2>Hub : Pipeline de compilation Windows en deux étapes</h2>
      <p>
        L&apos;infrastructure de compilation du Perry Hub a reçu une mise à niveau architecturale significative. Auparavant, compiler pour Windows nécessitait un worker Windows pour toute la compilation. Désormais le pipeline se divise en deux étapes :
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Un worker Linux effectue la compilation croisée de l&apos;artefact Windows avec le nouveau support lld-link</li>
        <li>Le Hub conserve l&apos;artefact précompilé et remet la tâche en file d&apos;attente pour un worker Windows</li>
        <li>Le worker Windows ne gère que la signature et l&apos;empaquetage — une tâche beaucoup plus légère</li>
      </ol>
      <p>
        Quand un worker envoie <code className="text-amber-400">complete</code> avec <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code>, le Hub remet la tâche en file de manière transparente. La CLI voit une expérience de compilation unique et fluide.
      </p>
      <p>
        Le Hub démarre désormais automatiquement les VMs Windows Azure quand aucun worker Windows n&apos;est connecté, et les workers de compilation se mettent à jour automatiquement vers la dernière version de Perry lors de nouvelles releases. Moins de gestion manuelle d&apos;infrastructure, des compilations plus rapides.
      </p>

      <h2>Refonte de la documentation</h2>
      <p>
        Deux réécritures majeures de documentation ont atterri cette semaine sur{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a> :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Référence perry.toml</strong> — documentation complète par section couvrant chaque option de configuration, résolution de bundle ID, résolution du fichier d&apos;entrée, auto-incrémentation du numéro de build et exemples CI/CD</li>
        <li><strong>Référence Geisterhand</strong> — documentation complète de l&apos;API, configuration de plateforme, patterns d&apos;automatisation de tests et aperçu de l&apos;architecture du framework de test d&apos;interface multiplateforme</li>
      </ul>
      <p>
        Ce ne sont pas des mises à jour incrémentales. Ce sont des réécritures complètes qui couvrent chaque fonctionnalité et option de configuration. Si vous configurez un nouveau projet ou écrivez des tests, commencez ici.
      </p>

      <h2>APIs de menu multiplateformes</h2>
      <p>
        <code className="text-amber-400">menuClear</code> et <code className="text-amber-400">menuAddStandardAction</code> étaient auparavant réservés à macOS. Ils fonctionnent désormais sur les 6 plateformes natives. Cela inclut aussi une correction d&apos;un panic de réentrance <code className="text-amber-400">RefCell</code> dans <code className="text-amber-400">dispatch_menu_item</code> sur Windows.
      </p>

      <h3>Android : Alignement de page 16 Ko</h3>
      <p>
        Google Play exige désormais un alignement de page de 16 Ko pour les bibliothèques natives. Perry configure automatiquement les <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code> appropriés, et les fichiers <code className="text-amber-400">.so</code> compagnons sont copiés à côté de la sortie pour inclusion dans APK/AAB.
      </p>

      <h2>Perry React : Tableau Kanban</h2>
      <p>
        La couche de compatibilité React a eu un test grandeur nature : un tableau Kanban complet à 5 colonnes avec des opérations de déplacement, ajout, suppression et visualisation. Sa construction a révélé et corrigé le rendu d&apos;enfants de tableaux imbriqués en JSX — le gestionnaire récursif <code className="text-amber-400">_appendChildren</code> aplatit désormais correctement les tableaux retournés par les appels <code className="text-amber-400">.map()</code>. Il y a aussi une nouvelle démo Kitchen Sink WorkBench de 14 sections couvrant divers patterns d&apos;interface.
      </p>

      <h2>Anvil : 100% de parité de tests déterministes</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — le compilateur LLVM auto-hébergé écrit en TypeScript et compilé par Perry — passe désormais <strong>68 sur 68</strong> tests déterministes, correspondant exactement à la sortie du compilateur principal. Les seules différences sont inhérentes (horodatages, <code className="text-amber-400">Math.random()</code>), et 11 tests sont ignorés car ils nécessitent l&apos;interface, des minuteries, de la cryptographie ou des fonctionnalités spécifiques à une plateforme non encore implémentées.
      </p>
      <p>
        Travaux clés qui ont permis d&apos;y arriver :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Dispatch de méthodes d&apos;interface</strong> — les variables typées interface retournent désormais les bonnes méthodes via un dispatch basé sur class_id dans ObjectHeader</li>
        <li><strong>Accès dynamique aux propriétés</strong> — dispatch à l&apos;exécution pour les noms de propriétés calculés</li>
        <li><strong>Closures et liaison de this</strong> — sémantique de capture correcte pour les méthodes d&apos;objets</li>
        <li><strong>Phase 6 en cours</strong> — async/await, générateurs et corrections de conditions</li>
      </ul>
      <p>
        100% de parité sur les tests déterministes est un jalon significatif. Cela signifie que le binaire <code className="text-amber-400">anvil</code> auto-compilé produit exactement la même sortie que le compilateur principal pour chaque scénario testable. L&apos;écart vers l&apos;auto-hébergement complet se réduit.
      </p>

      <h2>Plus de 50 corrections de bugs</h2>
      <p>
        Un effort majeur de correction cette semaine. Points saillants :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — les tableaux ne sont plus tronqués à 16 éléments, les entrées invalides sont gérées correctement</li>
        <li><strong>Uint8Array</strong> — constructeur depuis une variable tableau, implémentation de <code className="text-amber-400">.set(source, offset)</code> (était un no-op)</li>
        <li><strong>BigInt</strong> — NaN-boxing avec <code className="text-amber-400">BIGINT_TAG</code> pour les appels inter-modules, corrections de troncation keccak256 32 bits</li>
        <li><strong>Optional chaining</strong> — expressions conditionnelles imbriquées, détection toString, NaN-boxing de valeur de retour</li>
        <li><strong>IndexSet</strong> — NaN-boxing de chaîne corrigé pour utiliser <code className="text-amber-400">STRING_TAG</code> au lieu de <code className="text-amber-400">POINTER_TAG</code></li>
        <li><strong>MySQL</strong> — types DATETIME et BLOB, constructeur <code className="text-amber-400">Date(string)</code></li>
        <li><strong>Math.min/max</strong> — gestion des arguments spread</li>
        <li><strong>Dispatch de méthodes natives</strong> — field-scan-and-call pour les objets <code className="text-amber-400">POINTER_TAG</code></li>
      </ul>
      <p>
        Ce ne sont pas des cas limites. JSON.parse tronquant les tableaux à 16 éléments casserait n&apos;importe quelle application réelle. Uint8Array.set étant un no-op corromprait silencieusement les données. Ce sont les corrections qui rendent le compilateur apte à la production, un bug de correction à la fois.
      </p>

      <h2>En chiffres</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 commits</strong> sur le compilateur principal Perry</li>
        <li><strong>3 versions</strong> : v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 fonctionnalité majeure</strong> : compilation croisée Windows depuis Linux</li>
        <li><strong>1 nouvelle catégorie d&apos;apps</strong> : boucles de jeu iOS</li>
        <li><strong>68/68</strong> parité de tests déterministes dans perrysdad</li>
        <li><strong>Plus de 50 corrections de bugs</strong> en NaN-boxing, stdlib et FFI natif</li>
        <li><strong>2 réécritures de documentation</strong> : perry.toml et Geisterhand</li>
        <li><strong>5 améliorations du Hub</strong> : pipeline à deux étapes, auto-démarrage Azure, auto-mise à jour des workers</li>
      </ul>

      <h2>Et ensuite</h2>
      <p>
        La compilation croisée Windows ouvre la porte au CI/CD multiplateforme entièrement automatisé — envoyer du TypeScript, obtenir des binaires natifs pour chaque cible sans machines de compilation dédiées pour chaque OS. Le support des boucles de jeu débloque toute une nouvelle catégorie d&apos;apps iOS. Et 100% de parité de tests déterministes dans perrysdad signifie que l&apos;auto-hébergement devient très réel. Ce qui reste :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Support complet des regex</strong> — la dernière grande lacune du langage</li>
        <li><strong>Extension de perry/ui</strong> — glisser-déposer, labels d&apos;accessibilité, DatePicker</li>
        <li><strong>perrysdad Phase 6</strong> — async/await, générateurs, progression vers la parité complète avec Perry</li>
        <li><strong>Bêta publique du Hub</strong> — ouvrir les compilations distribuées aux utilisateurs externes</li>
      </ul>
      <p>
        Suivez la progression sur{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, lisez la documentation sur{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>, ou consultez la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">feuille de route</Link>
        {" "}pour le tableau complet.
      </p>
    </>
  );
}
