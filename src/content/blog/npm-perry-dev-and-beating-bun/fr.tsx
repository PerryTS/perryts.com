export default function Content() {
  return (
    <>
      <p>
        Le dernier billet s&apos;est terminé avec Perry en v0.5.80 et une défaite tenace au tableau des benchmarks : le roundtrip <code>JSON.parse</code>/<code>stringify</code> était encore 1,6x plus lent que Node. Six jours plus tard, Perry est en <strong>v0.5.174</strong> — soit <strong>94 releases de correctifs</strong> — et trois choses ont changé qui valent la peine d&apos;être signalées avant toute autre :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> est livré sur <strong>npm</strong>. Une seule commande installe Perry sur chaque plateforme supportée.</li>
        <li><strong><code>perry dev</code></strong> ajoute la recompilation automatique en mode watch, au-dessus d&apos;un nouveau cache d&apos;AST en mémoire et d&apos;un cache d&apos;objets sur disque par module.</li>
        <li>La défaite sur <code>json_roundtrip</code> s&apos;est refermée. Perry <strong>bat maintenant Node et Bun sur chaque benchmark</strong> de la suite principale (15/15 contre les deux).</li>
      </ul>
      <p>
        Le reste du billet est le casting secondaire : corrections WebAssembly, watchOS qui compile enfin de bout en bout, les primitives <code>perry/thread</code> câblées jusqu&apos;au bout, et un lot de gains de rigueur à la compilation qui transforment des abandons silencieux en vraies erreurs.
      </p>

      <h2>1. <code>@perryts/perry</code> sur npm</h2>
      <p>
        Perry s&apos;est toujours installé via Homebrew sur macOS et APT sur Debian/Ubuntu. Bonne couverture pour les développeurs sur ces plateformes, rien du tout pour les utilisateurs Windows sauf s&apos;ils compilaient depuis les sources, et rien d&apos;uniforme dans une équipe qui mélange Mac, Linux et Windows. La v0.5.107 a fait disparaître ce problème.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        Le package est un lanceur léger qui dépend de sept packages optionnels spécifiques à chaque plateforme — macOS arm64/x64, Linux x64/arm64 à la fois sur glibc et musl, Windows x64 — et npm installe uniquement celui correspondant à votre machine. La taille du binaire par plateforme tient dans quelques méga-octets à un chiffre. L&apos;installation elle-même prend quelques secondes. Il existe aussi un chemin d&apos;installation globale (<code>npm install -g @perryts/perry</code>) si vous préférez, mais l&apos;installation locale au projet épingle la version du compilateur à côté de vos dépendances, ce qui est le bon défaut.
      </p>
      <p>
        La publication est passée par OIDC Trusted Publisher donc chaque release a une provenance et est liée au job CI qui l&apos;a construite. Cela a constitué une journée de travail CI à part entière — plusieurs commits CI <code>v0.5.107</code> à la poursuite de la bonne combinaison <code>--provenance</code> / version npm / chemin de workflow — mais c&apos;est en place, et chaque release depuis est propre. Les utilisateurs Windows sont maintenant des citoyens de première classe, et la friction inter-équipes du « installe-le comme ton OS le veut » a disparu.
      </p>

      <h2>2. <code>perry dev</code> — mode watch</h2>
      <p>
        La v0.5.143 a ajouté une nouvelle sous-commande CLI :
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        C&apos;est tout. Elle surveille votre projet, recompile à la sauvegarde, et relance votre binaire. L&apos;inspiration vient de Vite et <code>nodemon</code> ; l&apos;idée est d&apos;arrêter de prétendre qu&apos;un workflow compilateur-vers-binaire doit forcément paraître plus lent qu&apos;un runtime. Pour la plupart des projets, <code>perry dev</code> recompile en moins d&apos;une seconde sur un cache chaud.
      </p>
      <p>
        Le détail « cache chaud » compte. Deux nouveaux caches sont arrivés aux côtés de <code>perry dev</code> :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>Cache d&apos;AST en mémoire</strong> (v0.5.156). À travers les recompilations dans une même session <code>perry dev</code>, Perry garde l&apos;AST parsé pour chaque module qui n&apos;a pas changé sur disque. Éditer un fichier reparse un fichier, pas tout le graphe de modules.
        </li>
        <li>
          <strong>Cache d&apos;objets sur disque par module (V2.2)</strong>. Chaque module compile vers son propre fichier <code>.o</code> et est haché ; les modules inchangés sautent entièrement le codegen et le linker récupère l&apos;objet en cache. La sortie verbose du cache correspond à la spec dans <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>, et une phase de durcissement d&apos;audit en v0.5.160 a fermé les cas limites où des entrées de cache obsolètes pouvaient survivre à un changement d&apos;en-tête.
        </li>
      </ul>
      <p>
        Les deux caches s&apos;empilent. La première édition de la session est une compilation complète ; tout ce qui suit ne fait que le travail proportionnel à ce que vous avez réellement changé. C&apos;est le plus grand changement de DX de la semaine à lui seul.
      </p>

      <h2>3. Battre Bun sur chaque benchmark</h2>
      <p>
        À la v0.5.166, le README contenait une mise en garde honnête : Perry était 1,6x plus lent que Node sur <code>json_roundtrip</code> (50× <code>JSON.parse</code> + <code>JSON.stringify</code> sur un blob de 1 Mo et 10 000 éléments), et 2,4x plus lent que Bun. L&apos;issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> suivait la relance. En v0.5.173 — sept jours plus tard — cet écart s&apos;est refermé.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Charge de travail</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry gagne désormais chaque charge de travail de la suite principale de benchmarks — <strong>15/15 contre Node, 15/15 contre Bun</strong>, meilleure sur 5 exécutions sur macOS ARM64. Bun 1.3 reste en tête sur la RSS de pointe (84 Mo contre les 310 Mo de Perry sur <code>json_roundtrip</code>), donc la pression sur l&apos;allocateur est la prochaine chose à fermer, mais la latence brute appartient à Perry.
      </p>
      <p>
        La fermeture de l&apos;écart JSON n&apos;est pas le fait d&apos;un seul changement — c&apos;est l&apos;accumulation du travail de parité sur la disposition des objets qui a traversé cette semaine : inférence de shape des littéraux d&apos;objet phase 1 (v0.5.167), inférence de type de retour basée sur le corps phase 4 pour les fonctions libres, méthodes de classe, getters et flèches (v0.5.169), et inférence de type de retour sur appel de méthode phase 4.1 (v0.5.170). Le thème est le même que dans le billet précédent : donnez à LLVM assez de structure statique pour voir à travers, et l&apos;optimiseur fait le reste.
      </p>
      <p>
        La v0.5.164 a aussi restauré l&apos;autovectorisation à accumulateur parallèle <code>&lt;2 x double&gt;</code> sur les boucles de réduction fadd pures, qui avait silencieusement régressé à un moment dans la plage v0.5.9x→v0.5.16x. C&apos;est ce qui ramène <code>math_intensive</code> et <code>accumulate</code> à leur ancienne avance de 3 à 4x sur Rust/C++/Go/Swift — même LLVM, un seul drapeau <code>reassoc contract</code>, un seul corps de boucle vectorisé.
      </p>

      <h2>4. <code>perry/ui</code> et doc-tests</h2>
      <p>
        Quatre écarts restants de perry/ui se sont fermés en v0.5.151. À côté de cela, la v0.5.119 a basculé le mauvais usage silencieux de l&apos;API perry/ui de « compile et ne fait rien » à une erreur de compilation dure — même logique qu&apos;en v0.5.165 appliquée aux décorateurs (voir plus bas). Un mauvais usage qui remonte à la compilation est toujours meilleur qu&apos;à l&apos;exécution.
      </p>
      <p>
        La v0.5.123 a livré un <strong>harness de tests pour les exemples de la documentation</strong> et une galerie de widgets. Chaque exemple TypeScript dans la documentation est désormais compilé à chaque exécution CI, et la galerie de widgets compare les captures d&apos;écran contre des baselines bénies. La v0.5.125 a étendu cela à une matrice de cross-compilation : chaque exemple de doc est compilé pour iOS, tvOS, Android, WASM, et Web, ainsi que pour la plateforme hôte, afin que la dérive d&apos;API entre cibles soit attrapée sur la PR qui l&apos;a introduite plutôt que sur le cycle de release qui l&apos;a livrée.
      </p>
      <p>
        Une petite victoire de qualité de vie : <code>perry check</code> émet maintenant <code>file:line:column</code> pour les erreurs de lowering HIR (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>), ce qui signifie que le saut-à-l&apos;erreur de l&apos;éditeur fonctionne au lieu d&apos;afficher un message générique sans localisation.
      </p>

      <h2>5. watchOS compile de bout en bout</h2>
      <p>
        watchOS a été livré comme cible de compilation le mois dernier, mais une build propre de bout en bout avait quelques bords rugueux. Le travail watchOS de cette semaine :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong> : <code>--target watchos</code> et <code>--target watchos-simulator</code> compilent maintenant de bout en bout sans les contournements qui s&apos;étaient accumulés.</li>
        <li><strong>v0.5.114</strong> : <code>--features watchos-game-loop</code> pour les applications à surface Metal.</li>
        <li><strong>v0.5.122</strong> : <code>--features watchos-swift-app</code> pour le rendu hébergé par SwiftUI — quand vous voulez que SwiftUI possède le cycle de vie de l&apos;app et que Perry compose l&apos;UI à l&apos;intérieur.</li>
        <li><strong>v0.5.135</strong> : <code>PERRY_UI_TEST_MODE</code> câblé dans perry-ui-ios et perry-ui-tvos, afin que le test d&apos;UI Geisterhand s&apos;exécute de la même manière sur ces deux cibles que sur macOS et Linux.</li>
      </ul>

      <h2>6. Primitives <code>perry/thread</code> entièrement câblées</h2>
      <p>
        La v0.5.174 (aujourd&apos;hui) a fermé <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a> : <code>parallelMap</code>, <code>parallelFilter</code>, et <code>spawn</code> sont entièrement câblés à travers le chemin de codegen avec application de la sûreté à la compilation. Les captures mutables sont rejetées à la compilation — la même posture de correction-à-la-compilation que perry/ui et les décorateurs ont maintenant. Les primitives de thread qui étaient partiellement câblées depuis l&apos;annonce de la v0.4.0 sont maintenant complètes de bout en bout.
      </p>

      <h2>7. WebAssembly et la cible web</h2>
      <p>
        Deux corrections WASM qui valent la peine d&apos;être signalées :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong> : cinq bugs qui se composaient dans <code>--target web</code> (le chemin de sortie WASM) et qui se masquaient les uns les autres. Corrigés en lot, donc la cible web tient maintenant sous la surface complète de <code>perry/ui</code> (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong> : <code>break</code>/<code>continue</code> à l&apos;intérieur d&apos;un <code>if</code> à l&apos;intérieur d&apos;une boucle se bloquait sur WASM — un bug de codegen qui ne se reproduisait pas sur les cibles natives. Corrigé (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        Aussi côté correction : la v0.5.157 a corrigé <code>obj.field</code> qui retournait <code>NaN</code> sur Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), et la v0.5.162 a corrigé un bug maudit dans ws où <code>sendToClient</code> et <code>closeClient</code> compilaient vers des no-ops silencieux (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. Victoires de rigueur à la compilation</h2>
      <p>
        Un thème de cette semaine : tout ce qui était auparavant un échec silencieux est désormais une erreur de compilation.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong> : les décorateurs TypeScript étaient parsés en HIR puis silencieusement abandonnés. Ils émettent maintenant une erreur au point de décoration avec un message clair (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). Même raisonnement warn→bail qu&apos;en v0.5.119 appliqué à perry/ui.</li>
        <li><strong>v0.5.119</strong> : mauvais usage de l&apos;API perry/ui rejeté à la compilation au lieu de produire un binaire no-op.</li>
        <li><strong>v0.5.172</strong> : <code>console.trace()</code> émet maintenant une vraie backtrace native sur stderr au lieu de seulement répéter le message (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). Les frames symbolisées nécessitent <code>PERRY_DEBUG_SYMBOLS=1</code> ; sans cela vous obtenez des adresses, ce qui reste plus que le comportement de répétition de message qu&apos;il remplace.</li>
      </ul>

      <h2>9. Pour conclure</h2>
      <p>
        Le motif de la semaine : <strong>distribution</strong> (npm), <strong>expérience développeur</strong> (<code>perry dev</code>, caches incrémentaux), et <strong>la dernière défaite restante sur les benchmarks fermée</strong>. Plus un lot de rigueur à la compilation qui transforme des abandons silencieux en vraies erreurs. Six jours, 94 releases de correctifs, un changement de DX majeur.
      </p>
      <p>
        Essayez-le :
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev`}</code></pre>
      <p>
        Source : <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs : <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog : <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
