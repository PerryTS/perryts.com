import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry est un visualiseur JSON natif construit entièrement en TypeScript et compilé avec Perry. Ce n&apos;est pas une démo technique — c&apos;est un vrai outil que nous utilisons quotidiennement pour inspecter les réponses d&apos;API, les fichiers de configuration et les dumps de données. Cet article explique comment il a été construit, comment il compile et à quoi ressemble l&apos;expérience de développement quand votre TypeScript compile en une app native.
      </p>

      <h2>Ce que fait Pry</h2>
      <p>
        Pry lit un fichier JSON (ou accepte du JSON depuis stdin) et le rend sous forme d&apos;arbre interactif et navigable dans une fenêtre native. Si vous avez utilisé le Quick Look intégré de macOS pour le JSON, imaginez cela — mais plus rapide, avec recherche et navigation au clavier.
      </p>
      <p>Les fonctionnalités :</p>
      <ul className="list-disc list-inside">
        <li><strong>Vue arborescente</strong> — nœuds pliables pour les objets et tableaux, avec indicateurs de profondeur et tout développer/réduire</li>
        <li><strong>Recherche</strong> — recherche plein texte sur les clés et valeurs avec surlignage en temps réel et navigation des correspondances</li>
        <li><strong>Raccourcis clavier</strong> — flèches pour naviguer, entrée pour développer/réduire, barre oblique pour chercher, <code className="text-perry-400">⌘C</code> pour copier</li>
        <li><strong>Presse-papiers</strong> — copier n&apos;importe quel nœud ou sous-arbre en JSON formaté</li>
        <li><strong>Coloration syntaxique</strong> — chaînes en vert, nombres en orange, booléens en violet, null en rouge</li>
        <li><strong>Barre d&apos;état</strong> — affiche le nombre total de nœuds, la profondeur actuelle, la taille du fichier et le temps d&apos;analyse</li>
      </ul>

      <h2>Le code source</h2>
      <p>
        Pry est écrit en TypeScript standard. Pas de syntaxe spéciale, pas de macros, pas de génération de code à la compilation. Il utilise l&apos;API d&apos;interface de Perry, qui fournit des widgets natifs qui compilent en code spécifique à la plateforme.
      </p>
      <p>Voici le point d&apos;entrée (simplifié pour la clarté) :</p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Lire l&apos;entrée depuis un argument de fichier ou stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// État réactif</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Construire l&apos;app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        C&apos;est le cœur d&apos;une application native. Pas de boilerplate de framework, pas de configuration de build, pas de fichiers spécifiques à la plateforme. Un fichier TypeScript.
      </p>

      <h3>Les fonctions utilitaires</h3>
      <p>
        Pry inclut également un utilitaire <code className="text-perry-400">countNodes</code> qui compte récursivement tous les nœuds de l&apos;arbre JSON, et un helper <code className="text-perry-400">formatBytes</code> pour afficher les tailles de fichiers. Ce sont des fonctions TypeScript standard — rien de spécifique à Perry. Elles compilent en code natif comme tout le reste.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Compiler Pry</h2>
      <p>Compiler Pry avec Perry est une seule commande. Pas de projet Xcode, pas de configuration Gradle, pas de config webpack. Il suffit de pointer Perry vers le fichier d&apos;entrée et de spécifier votre cible.</p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        Le binaire fait 48 Mo car il inclut la pile complète d&apos;interface AppKit — rendu de vue arborescente, surlignage de recherche, coloration syntaxique et gestion du clavier. Pour comparaison, la même app en Electron ferait plus de 200 Mo. Une app Perry en CLI seul compile à 2-5 Mo.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        La compilation iOS lie contre UIKit au lieu d&apos;AppKit. Perry mappe la même API <code className="text-perry-400">TreeView</code> vers <code className="text-perry-400">UITableView</code> avec des sections extensibles, <code className="text-perry-400">SearchBar</code> vers <code className="text-perry-400">UISearchBar</code>, et les événements tactiles remplacent les événements souris. La compilation iOS peut être déployée sur des appareils physiques et des simulateurs.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        La compilation Android génère une bibliothèque native chargée via JNI, empaquetée dans un APK. <code className="text-perry-400">TreeView</code> correspond à un <code className="text-perry-400">RecyclerView</code> avec des view holders extensibles, <code className="text-perry-400">SearchBar</code> à un <code className="text-perry-400">EditText</code> avec un <code className="text-perry-400">TextWatcher</code>, et la barre d&apos;état à un <code className="text-perry-400">TextView</code> en bas de la disposition.
      </p>

      <h2>Ce qui se passe sous le capot</h2>
      <p>Quand Perry compile Pry, il passe par plusieurs phases :</p>
      <ol className="list-decimal list-inside">
        <li><strong>Analyse</strong> — SWC analyse le code source TypeScript en AST. Les imports de <code className="text-perry-400">perry/ui</code> et <code className="text-perry-400">perry/fs</code> sont résolus vers les implémentations de modules intégrés de Perry.</li>
        <li><strong>Analyse de types</strong> — Perry résout tous les types, y compris les génériques <code className="text-perry-400">State&lt;string&gt;</code> et <code className="text-perry-400">State&lt;number&gt;</code>, en les monomorphisant en types concrets.</li>
        <li><strong>Résolution de plateforme</strong> — En fonction du flag de cible, Perry sélectionne le backend d&apos;interface approprié. Chaque appel à <code className="text-perry-400">TreeView</code>, <code className="text-perry-400">SearchBar</code> et <code className="text-perry-400">Button</code> est résolu vers l&apos;implémentation spécifique à la plateforme.</li>
        <li><strong>Génération IR</strong> — Perry génère une représentation intermédiaire qui inclut des appels d&apos;API natifs — envois de messages Objective-C pour macOS/iOS, appels JNI pour Android, appels de fonctions C pour GTK4/Win32.</li>
        <li><strong>Génération de code</strong> — Cranelift compile l&apos;IR en code machine natif pour l&apos;architecture cible.</li>
        <li><strong>Liaison</strong> — Le code natif est lié contre les frameworks de la plateforme (AppKit, UIKit, Android NDK, GTK4 ou Win32) pour produire l&apos;exécutable final.</li>
      </ol>

      <h2>Pas de runtime, pas de vues web</h2>
      <p>Cela vaut la peine d&apos;être souligné car c&apos;est la différence centrale entre Perry et toute autre approche TypeScript-vers-natif. Le binaire compilé de Pry a :</p>
      <ul className="list-disc list-inside">
        <li><strong>Pas de moteur JavaScript</strong> — pas de V8, pas de Hermes, pas de JavaScriptCore</li>
        <li><strong>Pas de vues web</strong> — pas de Chromium, pas de WebKit, pas de WKWebView</li>
        <li><strong>Pas de couche bridge</strong> — pas de messages sérialisés entre JS et natif</li>
        <li><strong>Pas de runtime de framework</strong> — pas de React, pas de moteur Flutter, pas de VM Dart</li>
      </ul>
      <p>
        Le binaire appelle les APIs de la plateforme directement. Sur macOS, il appelle <code className="text-perry-400">objc_msgSend</code> pour interagir avec les objets AppKit. Sur Android, il appelle des fonctions JNI pour créer et manipuler des Views. C&apos;est la même chose qu&apos;une app native Swift ou Kotlin ferait.
      </p>
      <p>
        La conséquence pratique : Pry se lance instantanément. Pas de démarrage de VM, pas de chauffe JIT, pas d&apos;analyse de scripts. Le processus démarre, la fenêtre apparaît, le JSON est rendu. L&apos;utilisation mémoire est une fraction de ce qu&apos;un équivalent Electron consommerait.
      </p>

      <h2>Expérience de développement</h2>
      <p>Construire Pry a été remarquablement similaire à construire n&apos;importe quelle application TypeScript. Le workflow est :</p>
      <ol className="list-decimal list-inside">
        <li>Écrire du TypeScript dans votre éditeur (VS Code, Zed, Neovim, ce que vous préférez)</li>
        <li>Exécuter <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>Exécuter <code className="text-perry-400">./pry test.json</code></li>
        <li>Itérer</li>
      </ol>
      <p>
        Pas de projet Xcode à configurer. Pas d&apos;Android Studio à installer. Pas de build Gradle de 45 secondes. Le compilateur Perry lui-même est rapide — analyser et compiler Pry prend quelques secondes, et nous travaillons activement à le rendre plus rapide.
      </p>
      <p>
        Le TypeScript que vous écrivez est du TypeScript standard. La vérification de types, l&apos;autocomplétion et les outils de refactorisation de votre éditeur fonctionnent tous. Vous pouvez extraire des fonctions, créer des modules, utiliser des génériques — tous les patterns TypeScript que vous connaissez déjà.
      </p>

      <h2>Ce que nous avons appris</h2>
      <p>Construire Pry nous a beaucoup appris sur ce que l&apos;API d&apos;interface de Perry doit supporter. Quelques leçons :</p>
      <ul className="list-disc list-inside">
        <li><strong>Les vues arborescentes sont complexes.</strong> Développer, réduire, surlignage de recherche, navigation au clavier et intégration du presse-papiers doivent être coordonnés. Le widget <code className="text-perry-400">TreeView</code> de Perry gère cela en interne, mais nous avons dû nous assurer que l&apos;implémentation native était cohérente sur les trois plateformes.</li>
        <li><strong>Les raccourcis clavier ont besoin des conventions de plateforme.</strong> Sur macOS, c&apos;est <code className="text-perry-400">⌘C</code> pour copier. Sur Linux et Android, c&apos;est <code className="text-perry-400">Ctrl+C</code>. Le système de raccourcis de Perry abstrait cela, mais une implémentation soigneuse était nécessaire pour bien faire les choses.</li>
        <li><strong>Les barres d&apos;état sont étonnamment non triviales.</strong> Chaque plateforme a une convention différente pour où et comment afficher les informations d&apos;état. AppKit utilise la barre inférieure de la fenêtre, UIKit utilise une barre d&apos;outils, Android utilise une vue inférieure dans la disposition. La <code className="text-perry-400">StatusBar</code> de Perry correspond correctement à chacune.</li>
        <li><strong>Le support de stdin a nécessité une conscience de plateforme.</strong> Sur macOS et Linux, lire depuis stdin est direct. Sur iOS et Android, stdin n&apos;&quot;existe&quot; pas vraiment de la même manière, donc Pry utilise la sélection de fichiers sur les plateformes mobiles. Le <code className="text-perry-400">readStdin</code> de Perry gère cela de manière transparente.</li>
      </ul>

      <h2>Performance</h2>
      <p>Pry gère confortablement les gros fichiers JSON. Dans nos tests :</p>
      <ul className="list-disc list-inside">
        <li>Un fichier JSON de 1 Mo (plus de 10 000 nœuds) est analysé et rendu en moins de 50 ms</li>
        <li>Un fichier JSON de 10 Mo est rendu en moins de 200 ms</li>
        <li>La recherche parmi 10 000 nœuds retourne des résultats en tapant, sans délai visible</li>
        <li>L&apos;utilisation mémoire reste sous 50 Mo même pour les gros fichiers</li>
      </ul>
      <p>
        C&apos;est l&apos;avantage de la compilation native. L&apos;analyse JSON dans Perry est compilée en boucles natives serrées sans pauses du GC. Le rendu de l&apos;arbre utilise les vues de liste virtualisées propres à la plateforme (NSOutlineView, UITableView, RecyclerView), qui sont éprouvées pour la performance.
      </p>

      <h2>Code source et téléchargements</h2>
      <p>Pry est open source. Vous pouvez parcourir le code source complet, le compiler vous-même, ou simplement regarder le code pour comprendre comment une app d&apos;interface native Perry est structurée.</p>
      <ul className="list-disc list-inside">
        <li><a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">Dépôt GitHub</a>{" "} — code source complet et instructions de compilation</li>
        <li><Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Page du showcase</Link>{" "} — captures d&apos;écran, liste des fonctionnalités et détails de plateforme</li>
      </ul>
      <p>
        Si vous construisez quelque chose avec Perry, nous aimerions en entendre parler. Ouvrez un issue sur le{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">dépôt Perry</a>{" "}
        ou lancez une discussion. Nous construisons Perry de manière ouverte et les retours d&apos;utilisateurs réels construisant de vraies apps sont inestimables.
      </p>
    </>
  );
}
