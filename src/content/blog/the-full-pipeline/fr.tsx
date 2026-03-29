import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        82 commits en sept jours. Un site de documentation de 49 pages. Publication automatisée sur l&apos;App Store et le Play Store. Paquets Homebrew et APT. Extensions natives WidgetKit compilées depuis TypeScript. Un compilateur LLVM auto-hébergé. Et des dizaines de corrections de bugs sur chaque plateforme.
      </p>
      <p>
        Cet article couvre tout ce qui a été livré dans Perry entre le 6 et le 13 mars 2026. Le thème est la complétion — combler les lacunes entre &quot;j&apos;ai écrit du TypeScript&quot; et &quot;mon app est sur l&apos;App Store.&quot;
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perry dispose désormais d&apos;un vrai site de documentation. 49 pages construites avec mdBook, couvrant tout, du démarrage à la référence CLI. La documentation est organisée en sections :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Démarrage</strong> — installation, premier projet, structure du projet</li>
        <li><strong>Fonctionnalités du langage</strong> — tout ce que Perry supporte de TypeScript</li>
        <li><strong>Interface native</strong> — 12 pages couvrant tous les types de widgets, la disposition, la gestion d&apos;état et le comportement spécifique à la plateforme</li>
        <li><strong>Plateformes</strong> — pages dédiées pour chacune des 6 plateformes cibles</li>
        <li><strong>Bibliothèque standard</strong> — plus de 50 implémentations de paquets natifs documentées</li>
        <li><strong>APIs système</strong> — dialogues de fichiers, trousseau, notifications, multi-fenêtres</li>
        <li><strong>WidgetKit</strong> — le nouveau module d&apos;extensions de widgets</li>
        <li><strong>Plugins</strong> — architecture de plugins à la compilation</li>
        <li><strong>Référence CLI</strong> — chaque commande et flag</li>
      </ul>
      <p>
        Le site inclut également un fichier <code className="text-amber-400">llms.txt</code> pour la découvrabilité par l&apos;IA, et est déployé via GitHub Pages avec un domaine personnalisé sur{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>.
      </p>

      <h2>Installer Perry en une commande</h2>
      <p>
        Perry est désormais distribué via Homebrew et APT, en plus de la compilation depuis les sources. Un nouveau pipeline de release GitHub Actions compile des binaires pour macOS (arm64 et x86_64) et Linux (x86_64 et arm64), puis met automatiquement à jour le tap Homebrew et le dépôt APT.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        Fini de cloner le dépôt et de compiler avec Cargo. Installez Perry comme n&apos;importe quel autre outil.
      </p>

      <h2>Publication automatisée sur l&apos;App Store</h2>
      <p>
        C&apos;est le changement qui élimine le plus d&apos;étapes manuelles. Exécuter{" "}
        <code className="text-amber-400">perry publish ios</code> gère désormais automatiquement tout le pipeline de distribution iOS :
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>Génère une clé RSA et un CSR via l&apos;API App Store Connect</li>
        <li>Crée un certificat de distribution et l&apos;empaquette dans un <code className="text-amber-400">.p12</code></li>
        <li>Enregistre le bundle ID</li>
        <li>Crée et télécharge un profil de provisionnement</li>
        <li>Crée l&apos;enregistrement de l&apos;app sur App Store Connect</li>
        <li>Compile, signe et téléverse vers TestFlight ou l&apos;App Store</li>
      </ol>
      <p>
        Pas de Xcode. Pas de visites manuelles du portail. Pas de téléchargement de certificats depuis un navigateur. L&apos;assistant de configuration s&apos;exécute automatiquement la première fois que vous publiez, guidant la configuration de la clé API et stockant les identifiants dans <code className="text-amber-400">perry.toml</code>.
      </p>
      <p>
        La distribution macOS est tout aussi automatisée. Perry supporte trois modes : TestFlight, DMG notarisé et un nouveau mode <strong>&quot;both&quot;</strong> qui publie sur l&apos;App Store et crée un DMG notarisé simultanément. Trois types de certificats sont auto-générés : <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>, <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code> et <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>.
      </p>
      <p>
        La publication Android a également gagné un assistant de configuration à déclenchement automatique. Les trois plateformes suivent désormais le même schéma : la première exécution déclenche la configuration, les identifiants sont sauvegardés dans le projet, les exécutions suivantes sont sans configuration.
      </p>
      <p>
        La validation pré-vol détecte les problèmes avant le début de la compilation — décalage de bundle ID du profil de provisionnement, expiration de certificat, icône d&apos;app manquante, format de version invalide, mauvais ID d&apos;équipe. Et <code className="text-amber-400">encryption_exempt</code> dans <code className="text-amber-400">perry.toml [ios]</code> définit automatiquement la clé <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> de l&apos;Info.plist, sautant l&apos;invite manuelle de conformité d&apos;exportation dans App Store Connect.
      </p>

      <h2>perry/widget : WidgetKit depuis TypeScript</h2>
      <p>
        Perry peut désormais compiler du TypeScript en extensions natives SwiftUI WidgetKit. Ce n&apos;est pas un wrapper ni un bridge — le compilateur parcourt l&apos;arbre de rendu au niveau HIR et émet du code source SwiftUI directement. Le résultat est un bundle d&apos;extension WidgetKit complet que Xcode (ou le pipeline de compilation de Perry) peut intégrer dans votre app.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        L&apos;approche est fondamentalement différente du reste de la compilation Perry. Le code Perry normal passe par Cranelift vers du code machine natif. Le code de widget passe par la HIR vers du texte SwiftUI, car WidgetKit exige SwiftUI — il n&apos;y a pas moyen de construire une extension widget avec du code impératif UIKit ou AppKit. Perry résout cela en traitant l&apos;arbre de rendu du widget comme un template à la compilation, pas du code à l&apos;exécution.
      </p>

      <h2>Nouveaux widgets et améliorations de plateforme</h2>
      <p>
        Quatre nouveaux types de widgets ont atterri cette semaine :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — édition de texte multiligne sur macOS, iOS et Android</li>
        <li><strong>SecureField</strong> — saisie de mot de passe sur iOS et macOS</li>
        <li><strong>QR Code</strong> — génération native de codes QR sur iOS, macOS et Android</li>
        <li><strong>Splash Screen</strong> — storyboards LaunchScreen auto-générés (iOS) et thèmes splash (Android)</li>
      </ul>

      <h3>L&apos;iPad devient natif</h3>
      <p>
        Perry génère désormais des apps entièrement natives iPad : <code className="text-amber-400">UIDeviceFamily [1,2]</code>, support d&apos;orientation, <code className="text-amber-400">UIRequiresFullScreen</code> et un storyboard LaunchScreen compilé via ibtool. Une nouvelle fonction <code className="text-amber-400">getDeviceIdiom()</code> détecte téléphone vs. iPad à l&apos;exécution, et <code className="text-amber-400">PerryFrameSplit</code> fournit des conteneurs de division horizontale basés sur les frames pour les dispositions iPad.
      </p>

      <h3>Windows</h3>
      <p>
        Windows a reçu le support des minuteries (tick de 50ms <code className="text-amber-400">WM_TIMER</code>), des boutons owner-drawn avec des fonds de thème sombre et des corrections pour un bug use-after-free dans <code className="text-amber-400">to_wide().as_ptr()</code> sur 18 fichiers de widgets. Le runtime V8 fonctionne désormais sur Windows avec les bibliothèques système requises liées.
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        Le backend GTK4 a reçu un polissage visuel pour correspondre à macOS : CSS padding pour les edge insets, style de boutons Adwaita, corrections de marges VStack et politique horizontale de ScrollView.
      </p>

      <h2>http/https et better-sqlite3</h2>
      <p>
        Deux ajouts significatifs à la stdlib :
      </p>
      <p>
        Les nouveaux modules natifs <code className="text-amber-400">http</code> et <code className="text-amber-400">https</code> fournissent du HTTP côté client utilisant reqwest en interne. L&apos;API correspond à Node.js : <code className="text-amber-400">request()</code>, <code className="text-amber-400">get()</code>, <code className="text-amber-400">ClientRequest</code> avec write/end/on et <code className="text-amber-400">IncomingMessage</code> avec statusCode et gestionnaires d&apos;événements.
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> est désormais entièrement supporté : <code className="text-amber-400">new Database()</code>, <code className="text-amber-400">prepare</code>, <code className="text-amber-400">exec</code>, <code className="text-amber-400">run</code>, <code className="text-amber-400">get</code>, <code className="text-amber-400">all</code> — avec un NaN-boxing correct et des objets de ligne avec accès aux propriétés nommées.
      </p>
      <p>
        Autres améliorations de la stdlib : <code className="text-amber-400">crypto.randomBytes()</code> retourne désormais un Buffer (correspondant à Node.js), MongoDB a gagné <code className="text-amber-400">listDatabases</code> et <code className="text-amber-400">listCollections</code> avec des corrections de thread-safety, et mysql2 INSERT/UPDATE/DELETE retourne désormais <code className="text-amber-400">ResultSetHeader</code> avec <code className="text-amber-400">insertId</code>.
      </p>

      <h2>Corrections du GC et de correction</h2>
      <p>
        Plusieurs corrections critiques du ramasse-miettes et de correction du runtime ont été livrées cette semaine :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Garde de réentrance du GC</strong> — empêche la collecte pendant l&apos;allocation, corrigeant les panics de double-emprunt RefCell</li>
        <li><strong>Traçage de Map du GC</strong> — les Maps sont désormais correctement tracées pendant la phase de marquage, empêchant la collecte des clés string</li>
        <li><strong>Correction d&apos;aliasing de chaînes</strong> — l&apos;append de chaîne alloue désormais toujours des chaînes fraîches, corrigeant la corruption par aliasing de copie de pointeur</li>
        <li><strong>Arithmétique BigInt</strong> — le décalage à droite utilise un décalage arithmétique pour les nombres négatifs, les opérations bit à bit utilisent la sémantique de wrapping ToInt32</li>
        <li><strong>Map.get() undefined</strong> — retourne le bon <code className="text-amber-400">TAG_UNDEFINED</code> pour les clés manquantes au lieu d&apos;un mauvais tag NaN</li>
        <li><strong>Racines GC de champs statiques</strong> — les valeurs BigInt dans les champs statiques de classes enregistrées comme racines GC</li>
      </ul>
      <p>
        Ce ne sont pas des détails mineurs. La correction de réentrance du GC à elle seule a résolu toute une classe de crashes intermittents. La correction d&apos;aliasing de chaînes affectait tout programme qui assignait une variable string à une autre puis mutait l&apos;une des deux. Ce sont le type de bugs qui ne se manifestent que sous des charges de travail réelles, et les corriger est ce qui rend le compilateur apte à la production.
      </p>

      <h2>perry-verify : Endurci</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>, le service de vérification automatisée d&apos;apps, a reçu un durcissement de sécurité : exécution en bac à sable via <code className="text-amber-400">bwrap</code> sur Linux et <code className="text-amber-400">sandbox-exec</code> sur macOS, jetons d&apos;auth sur le handshake WebSocket et le téléchargement de binaires, limitation de débit par IP, IDs de tâche UUID complets pour empêcher l&apos;énumération et limites de corps réduites.
      </p>

      <h2>perrysdad : Le compilateur auto-hébergé</h2>
      <p>
        En parallèle, <code className="text-amber-400">perrysdad</code> — un compilateur LLVM IR auto-hébergé écrit en TypeScript — est passé de zéro à l&apos;auto-compilation en cinq phases pendant la semaine :
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>Phase 0-1</strong> — squelette de bout en bout : HIR vers texte LLVM IR vers clang, lié contre <code className="text-amber-400">libperry_runtime.a</code> de Perry</li>
        <li><strong>Phase 2</strong> — parser à descente récursive fait main avec parsing d&apos;expressions Pratt pour de vrais fichiers <code className="text-amber-400">.ts</code></li>
        <li><strong>Phase 3</strong> — tableaux, objets et maps avec FFI runtime, plus correction d&apos;un décalage ABI critique (JSValue déclaré comme double en LLVM IR au lieu de i64)</li>
        <li><strong>Phase 4</strong> — classes, enums, closures, compilation multi-fichiers avec découverte de modules et tri topologique</li>
      </ol>
      <p>
        Le jalon : le binaire <code className="text-amber-400">anvil</code> auto-compilé peut désormais compiler des programmes de test et produire une sortie correcte correspondant à la version compilée par node. Un compilateur TypeScript, compilé par Perry en code natif, compilant plus de TypeScript en code natif. Des tortues tout en bas.
      </p>

      <h2>En chiffres</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 commits</strong> sur le compilateur principal Perry</li>
        <li><strong>1 release</strong> : v0.2.173 (8 mars)</li>
        <li><strong>49 pages de documentation</strong> sur docs.perryts.com</li>
        <li><strong>4 nouveaux widgets</strong> : TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 canaux de distribution</strong> : Homebrew, APT, source</li>
        <li><strong>3 pipelines de store automatisés</strong> : App Store, TestFlight, Google Play</li>
        <li><strong>Les 6 plateformes</strong> ont reçu des améliorations cette semaine</li>
      </ul>

      <h2>Et ensuite</h2>
      <p>
        Le pipeline se remplit. Vous pouvez écrire du TypeScript, compiler vers six plateformes, distribuer via Homebrew ou APT, publier sur l&apos;App Store et le Play Store, ajouter des widgets d&apos;écran d&apos;accueil et lire une documentation complète — le tout sans quitter la toolchain de Perry. Ce qui reste :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Support complet des regex</strong> — la dernière grande lacune du langage</li>
        <li><strong>Extension de perry/ui</strong> — glisser-déposer, labels d&apos;accessibilité, DatePicker</li>
        <li><strong>Maturation de perrysdad</strong> — étendre le compilateur auto-hébergé vers la parité complète avec Perry</li>
        <li><strong>Bêta publique du Hub</strong> — ouvrir les compilations distribuées aux utilisateurs externes</li>
      </ul>
      <p>
        Suivez la progression sur{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, lisez la nouvelle documentation sur{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>, ou consultez la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">feuille de route</Link>
        {" "}pour le tableau complet.
      </p>
    </>
  );
}
