import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Cinq jours, 120 commits, et Perry passe de v0.4.0 à v0.4.24. Les points forts : tvOS devient la 10e cible de compilation, les apps iOS et macOS peuvent désormais être construites entièrement depuis Linux, perry login apporte la facturation à l&apos;usage, et l&apos;interface Windows reçoit une refonte complète. Voici tout ce qui a été livré.
      </p>

      <h2>tvOS : La 10e cible de compilation</h2>
      <p>
        Perry compile désormais pour Apple TV. La cible tvOS utilise le même moteur de rendu SwiftUI que watchOS, partageant l&apos;architecture pilotée par les données où Perry construit un arbre d&apos;interface et une app hôte Swift livrée le rend nativement. Combiné avec l&apos;intégration WASM existante de <code>@perry/threads</code>, les apps tvOS peuvent exécuter des charges de travail lourdes en arrière-plan tout en gardant l&apos;interface réactive.
      </p>
      <pre><code>{`# Compiler pour Apple TV
perry compile main.ts --target tvos

# Exécuter sur le simulateur tvOS
perry run tvos`}</code></pre>
      <p>
        Cela porte le nombre total de cibles à <strong>10</strong> : macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly et Web/JavaScript. Une base de code TypeScript, dix sorties natives.
      </p>

      <h2>Compilation croisée iOS et macOS depuis Linux</h2>
      <p>
        Perry peut désormais construire des binaires iOS et macOS entièrement depuis une machine Linux en utilisant <code>ld64.lld</code> comme éditeur de liens Mach-O. C&apos;est la pièce manquante pour un CI/CD entièrement automatisé — envoyer du TypeScript sur un serveur Linux et obtenir des binaires natifs signés pour chaque plateforme Apple sans machine de compilation macOS.
      </p>
      <p>
        Y parvenir a nécessité la résolution d&apos;une cascade de problèmes d&apos;édition de liens :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Triple de codegen Mach-O</strong> — ajout des triples cibles <code>aarch64-apple-macos</code> et <code>aarch64-apple-ios</code> pour Cranelift</li>
        <li><strong>Liaison de frameworks</strong> — chemins de recherche des frameworks CoreGraphics, Metal, IOKit, DiskArbitration pour la compilation croisée</li>
        <li><strong><code>-lobjc</code></strong> — symboles du runtime ObjC nécessaires pour toutes les cibles Apple</li>
        <li><strong>Version du SDK</strong> — <code>sdk_version 26.0</code> dans ld64.lld (Apple exige iOS 18+)</li>
        <li><strong>Dead stripping</strong> — <code>-dead_strip</code> au lieu de <code>-Wl,-dead_strip</code> pour l&apos;éditeur de liens Mach-O</li>
        <li><strong>Déduplication du runtime</strong> — suppression des doublons de <code>perry_runtime</code> dans les bibliothèques statiques UI pour éviter les erreurs de liaison</li>
      </ul>
      <p>
        Combiné avec la compilation croisée existante Linux → Windows (v0.2.195+), Perry peut désormais effectuer une compilation croisée vers <strong>toutes les plateformes depuis Linux</strong> — iOS, macOS, Windows, Android, WASM et Web.
      </p>

      <h2>Conformité App Store iOS</h2>
      <p>
        Un axe majeur de ce cycle était de rendre les apps iOS compilées par Perry entièrement conformes à l&apos;App Store :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Info.plist complet</strong> — toutes les clés requises par Apple : <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — nommage standard des icônes iOS (<code>AppIcon60x60@2x</code>, etc.) avec résolution de secours</li>
        <li><strong>Version depuis perry.toml</strong> — les champs <code>version</code> et <code>build_number</code> alimentent directement l&apos;Info.plist</li>
        <li><strong>UILaunchScreen</strong> — utilise la clé moderne au lieu de <code>UILaunchStoryboardName</code> (pas de fichier storyboard nécessaire)</li>
        <li><strong>Profils de provisionnement</strong> — prise en charge des profils de provisionnement macOS pour la distribution App Store et TestFlight</li>
      </ul>

      <h2>Perry Login et facturation</h2>
      <p>
        Perry dispose désormais de comptes et d&apos;une facturation à l&apos;usage, alimentés par une nouvelle commande CLI <code>perry login</code> et un tableau de bord sur <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>.
      </p>
      <h3>Comment ça fonctionne</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — flux d&apos;authentification GitHub OAuth par appareil, ouvre le navigateur, interroge l&apos;état de complétion</li>
        <li><strong>Offre gratuite</strong> — 15 compilations/mois, projets illimités avec un compte GitHub</li>
        <li><strong>Offre Pro</strong> — compilations illimitées via abonnement Polar.sh</li>
        <li><strong>Jetons d&apos;API</strong> — générer et gérer des jetons depuis le tableau de bord pour le CI/CD</li>
        <li><strong>Suivi d&apos;utilisation</strong> — compteurs mensuels de publication et vérification avec barres d&apos;utilisation en temps réel</li>
      </ul>
      <p>
        Le tableau de bord lui-même est un serveur Fastify compilé par Perry avec une exportation statique Next.js — construit avec Perry, au service des utilisateurs Perry.
      </p>

      <h2>Notarisation macOS et signature de code</h2>
      <p>
        Deux nouvelles capacités de signature :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — bascule automatiquement vers le certificat Developer ID (au lieu du certificat App Store), soumet au service de notarisation d&apos;Apple et agrafe le résultat</li>
        <li><strong>Signature de code GCloud KMS</strong> — les compilations Windows peuvent désormais être signées avec des clés Google Cloud KMS, permettant une signature automatisée en CI sans exposer les clés privées</li>
      </ul>

      <h2>Refonte de l&apos;interface Windows</h2>
      <p>
        Le backend de l&apos;interface Windows a reçu sa mise à jour la plus complète à ce jour :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Mise à l&apos;échelle sensible au DPI</strong> — la taille des fenêtres, les polices et les dimensions des widgets s&apos;adaptent correctement sur les écrans haute résolution</li>
        <li><strong>APIs de fenêtre de type lanceur</strong> — fenêtres sans bordure avec positionnement personnalisé pour les interfaces de type lanceur/spotlight</li>
        <li><strong>Raccourcis clavier globaux</strong> — raccourcis clavier système qui fonctionnent même lorsque l&apos;application n&apos;est pas au premier plan</li>
        <li><strong>Icônes d&apos;application</strong> — API <code>getAppIcon</code> pour afficher les icônes d&apos;application dans les interfaces de type lanceur</li>
        <li><strong>Disposition sûre en cas de réentrance</strong> — le rendu basé sur <code>RefCell</code> a été remplacé par le stockage HWND <code>SetPropW</code> pour éviter les panics lors de messages WM_PAINT imbriqués</li>
        <li><strong>Intégration Geisterhand</strong> — tous les types de widgets enregistrés auprès du framework de test d&apos;interface, <code>/type</code> utilise <code>SendMessageW</code> via la carte HWND</li>
        <li><strong>Support caméra Android</strong> — API de capture caméra étendue à Android via JNI</li>
      </ul>

      <h2>Performance</h2>
      <p>
        v0.4.14 a livré un audit de performance complet :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>fcmp</code> natif</strong> — les comparaisons en virgule flottante utilisent les instructions CPU natives au lieu d&apos;appels de fonctions du runtime. Benchmark Mandelbrot <strong>30 % plus rapide</strong>.</li>
        <li><strong>Append de chaîne in-place</strong> — <code>str += &quot;text&quot;</code> modifie le tampon directement au lieu d&apos;allouer une nouvelle chaîne. <strong>125x plus rapide</strong> pour la concaténation répétée.</li>
        <li><strong>Court-circuit AND/OR</strong> — <code>&amp;&amp;</code> et <code>||</code> sautent l&apos;évaluation de l&apos;opérande droit lorsque le résultat est déjà déterminé.</li>
        <li><strong>Repliement des littéraux négatifs</strong> — <code>-1</code>, <code>-0.5</code> etc. sont repliés en constantes au niveau HIR au lieu d&apos;émettre une instruction de négation.</li>
      </ul>

      <h2>Compilations parallèles du Hub</h2>
      <p>
        Le serveur d&apos;orchestration de compilation prend désormais en charge les compilations concurrentes par worker :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Dispatch basé sur les slots</strong> — les workers signalent leur capacité <code>max_concurrent</code>, le Hub suit les tâches actives par worker</li>
        <li><strong>Plus de 429</strong> — les tâches sont mises en file d&apos;attente au lieu d&apos;être rejetées quand tous les workers sont occupés</li>
        <li><strong>Téléchargements d&apos;artefacts en Base64</strong> — les artefacts binaires sont servis en Base64 lorsque le runtime Perry ne peut pas gérer les réponses HTTP binaires brutes</li>
        <li><strong>WebSocket avec reconnexion automatique</strong> — les connexions de surveillance de compilation se reconnectent automatiquement en cas de déconnexion</li>
      </ul>

      <h2>Nouveau paquet : perry/appstorereview</h2>
      <p>
        Un nouveau paquet de première partie pour demander des avis sur les magasins d&apos;applications :
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Ouvre la boîte de dialogue native d'avis
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        Une fonction, deux plateformes, interface d&apos;avis native. Le timing et la logique d&apos;affichage sont entièrement laissés au développeur.
      </p>

      <h2>Corrections de codegen</h2>
      <p>
        120 commits signifient beaucoup de corrections de bugs. Les plus impactantes :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Égalité stricte (===)</strong> — trois bugs distincts corrigés dans v0.4.2 : comparaison d&apos;étiquettes de type, gestion de NaN et distinction null/undefined</li>
        <li><strong>Comparaison de chaînes concaténées</strong> — <code>===</code> échouait en comparant des chaînes construites par concaténation en raison d&apos;une comparaison de pointeurs au lieu du contenu</li>
        <li><strong>Résolution des constructeurs</strong> — <code>new X(args)</code> résout désormais correctement les constructeurs importés entre modules et les fonctions constructrices basées sur des closures</li>
        <li><strong>Push d&apos;array au niveau module</strong> — les valeurs ajoutées aux arrays de niveau module dans des appels de fonctions imbriqués dans des boucles étaient perdues à cause de pointeurs obsolètes après réallocation</li>
        <li><strong>Coercition arithmétique de null</strong> — <code>null + 1</code> produit désormais correctement <code>1</code> via <code>js_number_coerce</code></li>
        <li><strong>Wrapping du NOT bit à bit</strong> — <code>~x</code> est désormais ramené à i32 conformément à la sémantique ECMAScript</li>
        <li><strong>fetch().then()</strong> — les callbacks ne se déclenchaient jamais dans les apps UI natives en raison d&apos;un manque de vidange de la boucle d&apos;événements (v0.4.3)</li>
        <li><strong>Modulo et exponentiation WASM</strong> — les opérateurs <code>%</code> et <code>**</code> causaient des erreurs de validation WASM (v0.4.5)</li>
      </ul>

      <h2>En chiffres</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 commits</strong> sur le compilateur principal Perry en 5 jours</li>
        <li><strong>24 versions correctives</strong> : v0.4.1 → v0.4.24</li>
        <li><strong>Cibles de compilation</strong> : 9 → 10 (ajout de tvOS)</li>
        <li><strong>Cibles de compilation croisée depuis Linux</strong> : Windows → Windows, iOS, macOS (tout Apple + Windows)</li>
        <li><strong>Nouveaux paquets</strong> : perry/appstorereview</li>
        <li><strong>Nouvelle infrastructure</strong> : tableau de bord app.perryts.com, CLI perry login, facturation Polar.sh</li>
        <li><strong>Gains de performance</strong> : Mandelbrot 30 % plus rapide (fcmp natif), concaténation de chaînes 125x plus rapide</li>
      </ul>

      <h2>Et ensuite</h2>
      <p>
        La compilation croisée d&apos;iOS et macOS depuis Linux signifie que le Hub peut désormais compiler pour chaque plateforme depuis un seul serveur Linux — plus besoin de machines de compilation macOS dédiées pour la compilation (uniquement pour la signature). L&apos;infrastructure de facturation ouvre la voie à la bêta publique du Hub. Et avec l&apos;ajout de tvOS, Perry couvre chaque plateforme Apple : macOS, iOS, iPadOS, watchOS et tvOS.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Bêta publique du Hub</strong> — les utilisateurs externes peuvent envoyer du TypeScript et obtenir des binaires natifs</li>
        <li><strong>Support complet des regex</strong> — la dernière grande lacune du langage</li>
        <li><strong>Extension de perry/ui</strong> — glisser-déposer, accessibilité, DatePicker</li>
        <li><strong>Source maps &amp; informations de débogage</strong> — informations de débogage DWARF pour le débogage natif</li>
      </ul>
      <p>
        Suivez la progression sur{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, lisez la documentation sur{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, ou consultez la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">feuille de route</Link>
        {" "}pour le tableau complet.
      </p>
    </>
  );
}
