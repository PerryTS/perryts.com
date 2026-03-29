import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        L&apos;un des objectifs les plus ambitieux de Perry est de livrer des applications GUI véritablement natives à partir d&apos;une seule base de code TypeScript. Pas de vues web enveloppées dans un shell natif. Pas de moteur de rendu personnalisé dessinant ses propres pixels. De vrais widgets natifs, rendus par le framework d&apos;interface propre à chaque plateforme, compilés depuis TypeScript au moment de la construction.
      </p>
      <p>
        Cet article explique comment ça fonctionne — l&apos;architecture, le mapping de plateforme, les compromis et où nous en sommes aujourd&apos;hui.
      </p>

      <h2>Le problème avec les approches actuelles</h2>
      <p>
        Le développement d&apos;interfaces graphiques multiplateformes est un problème difficile depuis des décennies. Chaque framework majeur a fait un ensemble différent de compromis :
      </p>

      <h3>Electron / Tauri (Basé sur le web)</h3>
      <p>
        Electron embarque Chromium et Node.js, vous donnant un navigateur web comme shell d&apos;application. Vous avez un accès complet à la plateforme web, mais votre application &quot;native&quot; est un téléchargement de plus de 150 Mo qui utilise des centaines de mégaoctets de RAM juste pour afficher une fenêtre. Tauri remplace Chromium par la vue web du système, réduisant considérablement la taille, mais votre interface reste du HTML/CSS rendu dans une vue web — pas des widgets natifs.
      </p>

      <h3>React Native (Basé sur un bridge)</h3>
      <p>
        React Native exécute votre JavaScript dans un moteur JS (Hermes ou V8) et fait le pont vers des widgets natifs via une file de messages sérialisée. Vous obtenez de vrais widgets natifs, mais le bridge ajoute de la latence, surtout pour les gestes et les animations. Les interactions complexes nécessitent de descendre au code natif (Swift/Kotlin), ce qui défait la promesse d&apos;une base de code unique.
      </p>

      <h3>Flutter (Rendu personnalisé)</h3>
      <p>
        Flutter compile Dart en code natif et dessine tout avec son propre moteur de rendu basé sur Skia. Les performances sont excellentes, mais vos widgets ne sont pas natifs — ce sont des répliques parfaites au pixel près. Cela signifie que les conventions de plateforme (physique du défilement, sélection de texte, comportements d&apos;accessibilité) doivent être réimplémentées plutôt qu&apos;héritées. Et sur bureau, les différences deviennent plus visibles.
      </p>

      <h3>KMP + Compose Multiplatform (Partiellement natif)</h3>
      <p>
        Kotlin Multiplatform compile vers la JVM sur Android et en natif sur iOS, mais l&apos;interface partagée via Compose Multiplatform utilise un rendu personnalisé basé sur Skia — le même compromis que Flutter. Pour une interface véritablement native, vous revenez à écrire du code spécifique à la plateforme.
      </p>

      <h2>L&apos;approche de Perry : Compiler vers les toolkits natifs</h2>
      <p>
        Perry adopte une approche fondamentalement différente. Au lieu d&apos;exécuter votre code dans un runtime et de faire le pont vers des widgets natifs, ou de dessiner des pixels personnalisés, Perry compile votre code d&apos;interface TypeScript directement en appels au toolkit natif de chaque plateforme au moment de la construction.
      </p>
      <p>
        La différence clé : <strong>il n&apos;y a pas de couche runtime entre votre code et le SDK de la plateforme.</strong>{" "}
        Le binaire compilé appelle AppKit, UIKit, Android Views, GTK4 ou Win32 directement, exactement comme le ferait une application écrite en Swift, Kotlin ou C++.
      </p>

      <h2>L&apos;API d&apos;interface unifiée</h2>
      <p>
        Perry fournit une API TypeScript commune pour construire des interfaces utilisateur. Cette API est délibérément de haut niveau — vous décrivez ce que votre interface doit contenir et comment elle doit se comporter, et Perry la mappe aux constructions natives appropriées.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        Ce même code compile en interface native sur les six plateformes. Pas de <code className="text-perry-400">#ifdef</code>, pas de vérifications de plateforme, pas d&apos;imports conditionnels.
      </p>

      <h2>Mapping de plateforme en détail</h2>
      <p>
        Voici comment Perry mappe l&apos;API unifiée au framework natif de chaque plateforme :
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        Sur macOS, Perry génère du code qui crée et gère des objets AppKit directement. Un <code className="text-perry-400">App</code> devient une <code className="text-perry-400">NSApplication</code> avec une <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> devient <code className="text-perry-400">NSTextField</code> (avec l&apos;édition désactivée).{" "}
        <code className="text-perry-400">Button</code> devient <code className="text-perry-400">NSButton</code> avec un pattern target-action relié à votre callback.{" "}
        <code className="text-perry-400">VStack</code> devient un <code className="text-perry-400">NSStackView</code> avec une orientation verticale. La disposition utilise les contraintes Auto Layout.
      </p>
      <p>
        Le binaire compilé lie contre le framework AppKit et appelle directement les fonctions du runtime Objective-C. C&apos;est exactement ce que ferait du Swift compilé par Xcode.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        Sur iOS, le mapping est similaire mais cible UIKit.{" "}
        <code className="text-perry-400">App</code> devient une <code className="text-perry-400">UIApplication</code> avec une <code className="text-perry-400">UIWindow</code> et un <code className="text-perry-400">UIViewController</code> racine.{" "}
        <code className="text-perry-400">Text</code> correspond à <code className="text-perry-400">UILabel</code>.{" "}
        <code className="text-perry-400">Button</code> correspond à <code className="text-perry-400">UIButton</code>.{" "}
        La disposition utilise <code className="text-perry-400">UIStackView</code> et Auto Layout. Les événements tactiles sont gérés par la chaîne de répondeurs d&apos;UIKit.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        Sur Android, Perry génère une bibliothèque native chargée via JNI (Java Native Interface).{" "}
        <code className="text-perry-400">App</code> correspond à une <code className="text-perry-400">Activity</code>.{" "}
        <code className="text-perry-400">Text</code> devient un <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> devient un <code className="text-perry-400">android.widget.Button</code> avec un <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> correspond à un <code className="text-perry-400">LinearLayout</code> vertical. Le code natif rappelle le framework Android via JNI, créant et manipulant de vraies vues Android.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        Sur Linux, Perry cible GTK4.{" "}
        <code className="text-perry-400">App</code> devient une <code className="text-perry-400">GtkApplication</code> avec une <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> correspond à <code className="text-perry-400">GtkLabel</code>.{" "}
        <code className="text-perry-400">Button</code> correspond à <code className="text-perry-400">GtkButton</code> avec un gestionnaire de signal.{" "}
        <code className="text-perry-400">VStack</code> correspond à une <code className="text-perry-400">GtkBox</code> avec une orientation verticale. Le theming CSS de GTK4 signifie que votre application suit automatiquement le thème du bureau de l&apos;utilisateur.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        Sur Windows, Perry génère des appels à l&apos;API Win32.{" "}
        <code className="text-perry-400">App</code> crée une classe de fenêtre, l&apos;enregistre et exécute une boucle de messages.{" "}
        <code className="text-perry-400">Button</code> devient un contrôle <code className="text-perry-400">BUTTON</code> créé avec <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> correspond à un contrôle <code className="text-perry-400">STATIC</code>. Les événements sont gérés par la pompe de messages Win32 (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, etc.).
      </p>

      <h2>Gestion de l&apos;état</h2>
      <p>
        La primitive <code className="text-perry-400">State&lt;T&gt;</code> de Perry fournit une gestion d&apos;état réactive qui compile vers les mécanismes de mise à jour natifs de la plateforme. Lorsqu&apos;une valeur d&apos;état change, Perry déclenche une mise à jour de l&apos;interface via le système d&apos;invalidation propre à la plateforme — <code className="text-perry-400">setNeedsDisplay</code> sur macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> sur Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> sur Linux.
      </p>
      <p>
        Il n&apos;y a pas de diffing de DOM virtuel, pas de passe de réconciliation, pas de sérialisation. Les changements d&apos;état se propagent directement au widget natif qui affiche la valeur.
      </p>

      <h2>Pourquoi pas la syntaxe SwiftUI / Jetpack Compose ?</h2>
      <p>
        Vous pourriez vous demander pourquoi Perry n&apos;utilise pas une syntaxe déclarative similaire à SwiftUI ou Jetpack Compose. La réponse est pragmatique : Perry compile du TypeScript, et TypeScript a ses propres idiomes. Plutôt que d&apos;inventer un DSL qui semble étranger aux développeurs TypeScript, Perry utilise une API de style builder qui se sent naturelle en TypeScript — constructeurs, appels de méthodes, callbacks et closures. Ce sont les mêmes patterns que vous utilisez déjà en travaillant avec Express, les hooks React ou toute autre bibliothèque TypeScript.
      </p>

      <h2>Ce qui est disponible aujourd&apos;hui</h2>
      <p>
        Les six backends de plateforme sont implémentés et stables. L&apos;ensemble actuel de widgets comprend :
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Disposition</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Affichage</strong> — Text, Image</li>
        <li><strong>Saisie</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Navigation</strong> — NavigationView, TabView, List</li>
        <li><strong>Conteneurs</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>État</strong> — State&lt;T&gt; pour les mises à jour réactives</li>
      </ul>

      <h2>Ce qui arrive</h2>
      <p>
        Nous étendons activement la bibliothèque de widgets. Prochainement :
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — saisie de mot de passe avec entrée de texte sécurisée native de la plateforme</li>
        <li><code className="text-perry-400">ProgressView</code> — indicateurs de progression déterminés et indéterminés</li>
        <li><code className="text-perry-400">Alert</code> — dialogues d&apos;alerte natifs avec boutons et champs de texte</li>
        <li><code className="text-perry-400">DatePicker</code> — sélection native de date/heure de la plateforme</li>
        <li><code className="text-perry-400">Menu</code> — barres de menu et menus contextuels natifs</li>
      </ul>
      <p>
        L&apos;objectif est la parité complète du framework GUI sur toutes les plateformes — chaque widget, disposition, geste et animation disponible partout. Consultez la{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">feuille de route</Link> pour le tableau complet.
      </p>

      <h2>Essayez</h2>
      <p>
        La meilleure façon de comprendre l&apos;interface native de Perry est de la voir en action.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> est un visualiseur JSON natif construit entièrement en TypeScript avec Perry — une vraie application avec navigation arborescente, recherche et raccourcis clavier, compilée en binaires natifs sur macOS, iOS et Android. Lisez le{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">guide complet</Link>{" "}
        de sa construction.
      </p>
    </>
  );
}
