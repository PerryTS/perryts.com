import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Il y a une semaine, Perry était un compilateur avec un toolkit d&apos;interface. Vous pouviez écrire du TypeScript, le compiler en binaire natif et le distribuer sur six plateformes. C&apos;était l&apos;histoire. Aujourd&apos;hui l&apos;histoire est plus grande : Perry devient un écosystème. Trois ORMs de base de données, des notifications push universelles, des compilations distribuées avec publication sur l&apos;App Store et le Play Store, une couche de compatibilité React et une vérification automatisée des apps — tout cela a atterri la semaine dernière.
      </p>
      <p>
        Cet article couvre ce qui a été livré, pourquoi c&apos;est important et à quoi ressemble le code.
      </p>

      <h2>perry/ui : La fondation</h2>
      <p>
        Avant d&apos;aborder les nouvelles bibliothèques, il vaut la peine de souligner ce qui est au centre de tout : <code className="text-amber-400">perry/ui</code>. C&apos;est le toolkit d&apos;interface natif propre à Perry — plus de 20 widgets qui compilent directement en composants natifs de plateforme sur les six cibles. Ce n&apos;est pas un wrapper, pas une couche d&apos;abstraction, pas une vue web. Chaque <code className="text-amber-400">Button</code> devient un <code className="text-amber-400">NSButton</code> sur macOS, un <code className="text-amber-400">UIButton</code> sur iOS, un <code className="text-amber-400">GtkButton</code> sur Linux, un <code className="text-amber-400">android.widget.Button</code> sur Android et un contrôle <code className="text-amber-400">CreateWindowEx</code> sur Windows.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code> est la surface d&apos;interface primaire et la plus avancée de Perry. Elle inclut la gestion d&apos;état réactive, les conteneurs de disposition (VStack, HStack, ZStack, SplitView), un Canvas accéléré matériellement, des vues Table avec tri de colonnes, le module <code className="text-amber-400">perry/system</code> pour les dialogues de fichiers, l&apos;accès au trousseau, les notifications et le multi-fenêtres — le tout depuis TypeScript, le tout compilé en appels directs aux APIs de la plateforme. Chaque autre approche d&apos;interface dans Perry, y compris la couche de compatibilité React, est construite sur <code className="text-amber-400">perry/ui</code> et se mappe vers ses widgets.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        L&apos;objet réactif <code className="text-amber-400">State</code> est la primitive clé. Quand une valeur State change, seuls les widgets liés à cet état se mettent à jour — pas de diffing de DOM virtuel, pas de re-rendus complets de l&apos;arbre, pas de passe de réconciliation. C&apos;est le chemin le plus direct de TypeScript vers l&apos;interface native de plateforme qui existe.
      </p>

      <h2>Compatibilité React : Une couche mince sur perry/ui</h2>
      <p>
        Pour les développeurs venant de React, <code className="text-amber-400">perry-react</code> fournit une couche de compatibilité qui mappe le modèle de composants de React vers les widgets <code className="text-amber-400">perry/ui</code>. Vous pouvez utiliser <code className="text-amber-400">useState</code>, <code className="text-amber-400">useRef</code>, <code className="text-amber-400">useReducer</code> et JSX — et Perry les compile vers les mêmes widgets natifs en dessous. C&apos;est un pont de commodité, pas un moteur de rendu séparé.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        Sous le capot, chaque élément JSX correspond à un widget <code className="text-amber-400">perry/ui</code> : <code className="text-amber-400">{`<div>`}</code> devient un VStack, <code className="text-amber-400">{`<button>`}</code> devient un Button, <code className="text-amber-400">useState</code> est soutenu par le State réactif de Perry. C&apos;est précoce — Phase 1 avec des re-rendus complets de l&apos;arbre et un stockage global des hooks — mais cela prouve que du code React existant peut cibler des plateformes natives via Perry. Nous explorons également la compatibilité Angular et Ionic sur des lignes similaires.
      </p>

      <h2>Trois ORMs de base de données : API Prisma, performance native</h2>
      <p>
        Si vous construisez un serveur ou une app bureau qui communique avec une base de données, Perry vous couvre désormais avec trois ORMs compatibles Prisma : <code className="text-amber-400">perry-prisma</code> (MySQL), <code className="text-amber-400">perry-sqlite</code> (SQLite) et <code className="text-amber-400">perry-postgres</code> (PostgreSQL). Les trois sont des remplacements directs de <code className="text-amber-400">@prisma/client</code>. Même API, mêmes patterns de requêtes, mais compilés en code natif avec FFI direct vers la base de données — pas de moteur Prisma, pas de Node.js.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Même API Prisma — compilée en SQL natif via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Sous le capot, chaque ORM est un frontend TypeScript soutenu par une couche FFI Rust utilisant <code className="text-amber-400">sqlx</code>. Le flux de requête : TypeScript sérialise la requête en JSON, la passe à travers la frontière FFI, Rust construit du SQL paramétré, l&apos;exécute via le pool de connexions et sérialise le résultat de retour. Le schéma Prisma est lu au moment de la compilation — zéro parsing à l&apos;exécution.
      </p>
      <p>
        Les trois implémentations partagent ~95 % de leur code. Les différences sont ce à quoi vous vous attendez : quotation d&apos;identifiants (<code className="text-amber-400">`col`</code> vs <code className="text-amber-400">&quot;col&quot;</code>), syntaxe des placeholders (<code className="text-amber-400">?</code> vs <code className="text-amber-400">$1, $2</code>) et sémantique des transactions. Les trois supportent toute la surface CRUD Prisma : findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — plus le SQL brut, les transactions et plus de 10 opérateurs de filtre WHERE.
      </p>

      <h2>perry-push : Notifications push universelles</h2>
      <p>
        <code className="text-amber-400">perry-push</code> est une bibliothèque unique qui gère les notifications push sur toutes les plateformes : APNs (iOS/macOS), FCM (Android), Web Push (navigateurs) et WNS (Windows). Chaque fournisseur est un module FFI Rust avec exactement trois fonctions : <code className="text-amber-400">*_provider_new</code>, <code className="text-amber-400">*_provider_close</code> et <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Type de résultat unifié pour tous les fournisseurs</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        La cryptographie est gérée par <code className="text-amber-400">ring</code> — ES256 JWTs pour APNs et VAPID, RS256 pour les comptes de service FCM, AES-GCM pour le chiffrement de payload Web Push. Le tout compilé en code natif. Pas de <code className="text-amber-400">node-gyp</code>, pas de dépendance OpenSSL.
      </p>

      <h2>Perry Hub + Builders : Compilations cloud distribuées</h2>
      <p>
        C&apos;est le volet infrastructure. <code className="text-amber-400">perry-hub</code> est un serveur d&apos;orchestration de compilations — lui-même compilé depuis TypeScript par Perry — qui gère un pool de workers de compilation. Vous poussez votre projet, le hub le dispatche au bon worker en fonction de la plateforme cible, et le worker compile, signe et publie optionnellement votre app.
      </p>
      <p>
        Deux workers existent aujourd&apos;hui : un builder macOS (gère les cibles macOS, iOS et Android) et un builder Linux (gère Linux et Android). Les deux sont des binaires Rust qui se connectent au hub via WebSocket, téléchargent les archives source, exécutent le compilateur Perry et téléversent les artefacts en retour.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Signature de code</strong> — notarisation Apple pour macOS, profils de provisionnement pour iOS, signature keystore Android</li>
        <li><strong>Publication App Store</strong> — téléversement direct vers App Store Connect et Google Play Store</li>
        <li><strong>Gestion des artefacts</strong> — binaires compilés téléversés vers le hub avec nettoyage basé sur le TTL</li>
        <li><strong>Gestion des licences</strong> — limites de débit par licence, file d&apos;attente prioritaire (le niveau pro obtient la priorité)</li>
      </ul>
      <p>
        Le hub lui-même est une étude de cas fascinante. C&apos;est un fichier TypeScript d&apos;environ 1 500 lignes compilé en un binaire natif de 2 Mo par Perry. Il exécute Fastify sur le port 3456 pour HTTP et <code className="text-amber-400">ws</code> sur le port 3457 pour WebSocket. Tout l&apos;état est en mémoire avec persistance JSON — pas de base de données externe. C&apos;est le type de serveur que vous pouvez déployer avec <code className="text-amber-400">scp</code> et un fichier d&apos;unité systemd.
      </p>

      <h2>perry-verify : Vérification automatisée des apps</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> est un service HTTP autonome qui prend un binaire compilé et une configuration, exécute un pipeline de vérification et retourne des résultats structurés réussi/échoué avec des captures d&apos;écran. Il lance l&apos;app, exécute des flux d&apos;authentification (déterministes ou assistés par IA), vérifie l&apos;état et capture les preuves.
      </p>
      <p>
        Des adaptateurs de plateforme existent pour macOS (via les APIs d&apos;accessibilité), Linux (AT-SPI) et des stubs pour iOS Simulator et Android Emulator. La couche IA utilise Claude pour l&apos;authentification de repli et la vérification d&apos;état quand les vérifications déterministes ne sont pas possibles. Il est conçu pour s&apos;insérer dans le pipeline de compilation du hub comme étape post-compilation : compiler, signer, vérifier, publier.
      </p>

      <h2>Pry est partout</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>, le visualiseur JSON natif que nous avons construit comme vitrine de Perry, est désormais sur cinq plateformes. Il est sur le{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Mac App Store</a> et{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Google Play</a>, avec des binaires natifs pour Linux et Windows. La même base de code TypeScript, cinq points d&apos;entrée spécifiques à la plateforme, cinq binaires natifs. C&apos;est la preuve la plus concrète que toute cette approche fonctionne de bout en bout — du code source TypeScript à la fiche App Store.
      </p>

      <h2>Ce que tout cela signifie</h2>
      <p>
        Un compilateur est intéressant. Un écosystème est utile. La semaine dernière, Perry est passé de &quot;vous pouvez compiler TypeScript en natif&quot; à &quot;vous pouvez construire une app complète avec une interface native, une base de données Prisma, des notifications push et des compilations qui publient automatiquement sur l&apos;App Store.&quot;
      </p>
      <p>
        Les pièces commencent à se connecter :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> est le chemin le plus direct de TypeScript vers l&apos;interface native de plateforme — état réactif, plus de 20 widgets, zéro couche d&apos;abstraction</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> signifie que le code de base de données existant se porte avec des changements minimaux</li>
        <li><strong>perry-push</strong> signifie des notifications push natives sans bibliothèques par plateforme</li>
        <li><strong>perry-hub + builders</strong> signifie que vous pouvez passer de <code className="text-amber-400">perry publish</code> à l&apos;App Store en une étape</li>
        <li><strong>perry-verify</strong> signifie des tests automatisés de la sortie compilée, pas seulement du code source</li>
        <li><strong>perry-react</strong> signifie que les développeurs React peuvent adopter Perry avec des patterns familiers, le tout mappé vers perry/ui en dessous</li>
      </ul>
      <p>
        Ce n&apos;est pas théorique. Chaque bibliothèque listée ici a du code fonctionnel, des tests et de la documentation. Plusieurs sont déjà utilisées en production — le site de Perry lui-même tourne sur un serveur Fastify compilé par Perry, et Pry est en ligne sur deux magasins d&apos;apps.
      </p>

      <h2>Et ensuite</h2>
      <p>
        La feuille de route immédiate :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Extension de perry/ui</strong> — glisser-déposer, labels d&apos;accessibilité, menus contextuels personnalisés, plus de primitives de disposition</li>
        <li><strong>Intégration de perry-verify</strong> — vérification automatisée dans le pipeline de compilation</li>
        <li><strong>Compatibilité de frameworks</strong> — amélioration des couches React, Angular et Ionic comme rampes d&apos;accès vers perry/ui</li>
        <li><strong>Support complet des regex</strong> — moteur regex compatible ECMAScript compilé en natif</li>
      </ul>
      <p>
        Suivez la progression sur{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, ou consultez la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">feuille de route</Link>
        {" "}pour le tableau complet.
      </p>
    </>
  );
}
