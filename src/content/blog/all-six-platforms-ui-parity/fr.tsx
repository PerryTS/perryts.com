import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Lorsque nous avons livré la première version du système d&apos;interface native de Perry, &quot;multiplateforme&quot; signifiait que macOS fonctionnait bien et que les cinq autres plateformes étaient des stubs. Aujourd&apos;hui, avec la v0.2.162, ce n&apos;est plus le cas. Les six plateformes — macOS, iOS, iPadOS, Android, Linux et Windows — partagent désormais une parité complète des fonctionnalités. Le même code TypeScript compile en widgets natifs sur chaque cible.
      </p>
      <p>
        Cet article passe en revue ce que nous avons livré entre v0.2.152 et v0.2.164 : un widget Canvas, une implémentation complète de NSTableView, plus de 20 widgets d&apos;interface au total, le module{" "}
        <code className="text-amber-400">perry/system</code>, le support multi-fenêtres, les notifications système, l&apos;accès au trousseau, la réduction automatique de la taille du binaire et un système de plugins à la compilation. Il s&apos;est passé beaucoup de choses.
      </p>

      <h2>Le sprint des widgets : Plus de 20 composants d&apos;interface natifs</h2>
      <p>
        Le plus grand bond est venu avec v0.2.155, qui a apporté plus de 20 widgets d&apos;interface sur toutes les plateformes. L&apos;API d&apos;interface TypeScript de Perry couvre désormais les composants dont vous avez réellement besoin pour livrer une vraie application :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Disposition</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>Saisie</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>Affichage</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>Données</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>Superposition</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>Dessin</strong> — Canvas (API de dessin 2D, accéléré matériellement par plateforme)</li>
      </ul>
      <p>
        Ce ne sont pas des wrappers autour d&apos;un moteur de rendu personnalisé. Chaque widget compile vers le composant natif propre à la plateforme : <code className="text-amber-400">NSButton</code> sur macOS,{" "}
        <code className="text-amber-400">UIButton</code> sur iOS,{" "}
        <code className="text-amber-400">GtkButton</code> sur Linux,{" "}
        <code className="text-amber-400">android.widget.Button</code> sur Android via JNI, et{" "}
        <code className="text-amber-400">CreateWindowEx</code> sur Windows. Le système d&apos;exploitation les dessine, leur applique un thème et gère l&apos;accessibilité — Perry ne fait que câbler l&apos;API TypeScript.
      </p>

      <h2>Canvas : Dessin 2D depuis TypeScript</h2>
      <p>
        L&apos;une des ajouts les plus intéressants techniquement est le widget Canvas (v0.2.152). Il expose une API de dessin 2D familière directement depuis TypeScript — courbes de Bézier, remplissages, traits, transfert d&apos;images — et compile vers le backend 2D accéléré de la plateforme : Core Graphics sur macOS/iOS, Cairo sur Linux, Direct2D sur Windows et Skia sur Android.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compile vers Core Graphics sur macOS, Cairo sur Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Widget Table : NSTableView arrive en TypeScript</h2>
      <p>
        v0.2.163 a apporté le widget Table — le composant le plus complexe de la bibliothèque. Sur macOS, il correspond à <code className="text-amber-400">NSTableView</code> avec tout le câblage delegate/data source. Sur Linux, il utilise <code className="text-amber-400">GtkTreeView</code> de GTK4. Sur Windows, le contrôle <code className="text-amber-400">ListView</code> de Win32. Sur Android, il se lie à{" "}
        <code className="text-amber-400">RecyclerView</code> via JNI.
      </p>
      <p>
        L&apos;API TypeScript est déclarative : vous définissez les colonnes, fournissez une source de données, et Perry gère le câblage spécifique à la plateforme à la compilation. Le tri des colonnes, la gestion de la sélection et la personnalisation de la hauteur des lignes fonctionnent directement.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// Tableau d&apos;objets TypeScript</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Le module perry/system</h2>
      <p>
        v0.2.155 a également introduit <code className="text-amber-400">perry/system</code> — un module TypeScript qui expose les APIs système de la plateforme sans aucun runtime : dialogues de fichiers, dialogues de sauvegarde, alertes, feuilles, accès au trousseau, notifications système et gestion multi-fenêtres.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — sélecteur de fichiers natif (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — dialogue de sauvegarde natif</li>
        <li><code className="text-amber-400">system.showAlert()</code> — panneau d&apos;alerte natif</li>
        <li><code className="text-amber-400">system.notify()</code> — notification du système (UserNotifications / libnotify / WinRT)</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — gestion multi-fenêtres</li>
      </ul>
      <p>
        Tous ces appels utilisent directement les APIs natives de la plateforme — pas d&apos;IPC Electron, pas de pont de vue web. Perry compile le site d&apos;appel TypeScript en un appel de fonction native direct vers le SDK de la plateforme.
      </p>

      <h2>Parité des fonctionnalités sur six plateformes : v0.2.162</h2>
      <p>
        Le jalon v0.2.162 visait à combler les lacunes. Avant cette version, macOS avait l&apos;ensemble de fonctionnalités le plus complet, iOS était presque au point, et Linux/Windows/Android étaient en retard. v0.2.162 a amené les six plateformes au même niveau :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, ensemble complet de widgets, Trousseau, notifications, multi-fenêtres, barre d&apos;outils</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, parité complète de widgets avec macOS, cycle de vie de scène</li>
        <li><strong>Android</strong> — pont JNI, tous les widgets via Android Views, compilation croisée NDK</li>
        <li><strong>Linux</strong> — GTK4, ensemble complet de widgets y compris Table, dialogues de fichiers, trousseau libsecret</li>
        <li><strong>Windows</strong> — Win32, tous les widgets, Windows Credential Store, notifications WinRT</li>
      </ul>
      <p>
        C&apos;est le jalon qui rend &quot;une base de code, six plateformes&quot; réel plutôt qu&apos;aspirationnel. Le même fichier TypeScript compile en applications natives sur les six cibles sans chemins de code spécifiques à la plateforme pour les cas d&apos;utilisation courants.
      </p>

      <h2>Réduction automatique de la taille du binaire</h2>
      <p>
        v0.2.153 a livré la réduction automatique de la taille du binaire — le compilateur élimine désormais agressivement les chemins de code inutilisés, supprime les fonctions stdlib inaccessibles et déduplique les définitions de symboles lors de l&apos;édition de liens. Un outil CLI typique qui compilait auparavant à ~4 Mo se retrouve désormais sous les 2 Mo sans aucun changement dans votre code source.
      </p>
      <p>
        Cela compte pour les déploiements réels. Quand votre binaire est l&apos;unité de déploiement — copié sur un serveur, distribué en fichier unique, intégré dans un conteneur — la taille affecte directement le temps de transfert et le coût de stockage. Réduire de moitié la taille du binaire gratuitement est une amélioration significative.
      </p>

      <h2>Le système de plugins à la compilation</h2>
      <p>
        v0.2.152 a introduit le système de plugins de Perry — et il est architecturalement différent de tout autre système de plugins dans l&apos;écosystème TypeScript. Il n&apos;y a pas de chargement de plugins à l&apos;exécution, pas d&apos;IPC, pas de <code className="text-amber-400">require()</code> dynamique. Les plugins sont des modules TypeScript que Perry résout et compile au moment de la construction.
      </p>
      <p>
        Le résultat : les plugins ont exactement zéro surcharge à l&apos;exécution. Ils sont compilés dans le même binaire que le code de votre application, avec des appels de fonction directs entre le code du plugin et le code hôte. Si vous n&apos;utilisez pas un plugin, il n&apos;apparaît pas dans votre binaire. Si vous l&apos;utilisez, il est inliné comme n&apos;importe quel autre module.
      </p>
      <p>
        Nous avons écrit sur la philosophie derrière cela dans{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          Les systèmes de plugins sont un impôt sur la performance
        </Link>. La version courte : les architectures de plugins à l&apos;exécution échangent la performance contre l&apos;extensibilité. La composition à la compilation vous donne les deux.
      </p>

      <h2>Améliorations du langage</h2>
      <p>
        Le sprint d&apos;interface ne s&apos;est pas produit de manière isolée — le compilateur lui-même est devenu de plus en plus capable. À travers ces versions :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Expressions de classe</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> compile désormais correctement</li>
        <li><strong>Transformations de générateurs</strong> — <code className="text-amber-400">function*</code> et <code className="text-amber-400">yield</code> compilent en machines à états natives</li>
        <li><strong>Map/Set comme champs de classe</strong> — <code className="text-amber-400">private items = new Map()</code> fonctionne en codegen</li>
        <li><strong>Coercition des types de paramètres FFI</strong> — les appels aux bibliothèques natives gèrent automatiquement la coercition de type</li>
        <li><strong>Références de méthodes liées</strong> — les références <code className="text-amber-400">this.method</code> fonctionnent pour les modules natifs (fs, os, path)</li>
        <li><code className="text-amber-400">string.match()</code> — désormais entièrement supporté</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>, <code className="text-amber-400">path.join()</code> multi-arguments, <code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Cible web</strong> — Perry peut désormais compiler vers une sortie compatible web pour les déploiements hybrides</li>
      </ul>

      <h2>Et ensuite</h2>
      <p>
        Avec la parité d&apos;interface sur six plateformes livrée, la prochaine phase est la profondeur plutôt que l&apos;étendue. Nous travaillons sur :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Support complet des RegExp (<code className="text-amber-400">regex.test()</code>, <code className="text-amber-400">string.matchAll()</code>)</li>
        <li>Glisser-déposer, menus contextuels personnalisés et labels d&apos;accessibilité dans le système de widgets</li>
        <li>Une extension VS Code pour les diagnostics Perry et la compilation à la sauvegarde</li>
        <li>Intégration du gestionnaire de paquets — installer et compiler des paquets natifs Perry en une seule commande</li>
        <li>Cible de compilation WASM pour le déploiement navigateur</li>
        <li>Multi-threading via les threads <code className="text-amber-400">Worker</code></li>
      </ul>
      <p>
        Si vous voulez suivre le développement, le{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          dépôt Perry
        </a>{" "}
        est ouvert. Consultez le{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">showcase</Link>
        {" "}pour voir ce qui est déjà construit, ou parcourez la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">feuille de route</Link>
        {" "}pour le tableau complet.
      </p>
    </>
  );
}
