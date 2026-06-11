export default function Content() {
  return (
    <>
      <p>
        Le précédent billet s&apos;est arrêté à <strong>v0.5.875</strong> sur l&apos;histoire du GC — combler l&apos;écart que le benchmark d&apos;aya_koto avait exposé. Ce billet-là parlait de gagner un benchmark. Celui-ci parle d&apos;un autre genre de travail : les quelque <strong>270 releases entre v0.5.875 et v0.5.1146</strong>, livrées sur environ quatre semaines, dont presque aucune n&apos;est un titre de benchmark. Le thème est passé de &ldquo;aller vite sur un microbenchmark&rdquo; à <strong>&ldquo;faire en sorte que du vrai TypeScript et de vrais packages npm compilent et tournent réellement.&rdquo;</strong> Plus une refonte visuelle complète de Windows et une pile de nouveaux widgets en chemin.
      </p>
      <p>
        Voici ce qui a été livré, regroupé par sa vraie raison d&apos;être.
      </p>

      <h2>Les vrais packages npm compilent désormais</h2>
      <p>
        Le plus gros fil conducteur de cette fenêtre est une passe pour faire compiler les packages npm populaires en binaires natifs et leur faire passer des tests comportementaux — pas seulement &ldquo;linker sans erreurs,&rdquo; mais tourner et produire la bonne sortie. La liste qui fonctionne désormais via <code>perry.compilePackages</code> inclut <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, et Colyseus</strong>.
      </p>
      <p>
        Chacun échouait pour sa propre raison, et chaque correctif est sa propre petite histoire :
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> plantait avec <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>. Cause racine (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>) : <code>new F()</code> où <code>F</code> est une fonction importée d&apos;un autre module produisait silencieusement un objet vide — le corps du constructeur ne tournait jamais, donc chaque vérification de style <code>$ZodCheckMinLength</code> revenait dépouillée de sa propriété <code>_zod</code>.</li>
        <li><strong>axios + jose</strong> avaient besoin de crypto et de compression que Perry n&apos;avait pas encore : <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> pour AES-GCM, et <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> se bloquait sur un timeout de polling d&apos;une seconde dans <code>wait_for_promise</code> ; nous l&apos;avons remplacé par une attente sur condvar et fait remonter les promesses rejetées en <code>HTTP 500</code> au lieu de pendre (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> ne pouvait pas lire un corps POST — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> renvoyaient du vide sur POST/PUT jusqu&apos;à un correctif d&apos;enregistrement parent en v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> heurtaient tous la même forme : une <em>valeur appelable avec des propriétés attachées</em> (<code>chalk.red</code>, <code>express()</code> plus <code>express.Router</code>). Trois variantes de ce motif ont été corrigées sur v0.5.935 et la passe npm environnante, plus <code>util.inherits</code> + un échafaudage de prototype de stream pour débloquer express (v0.5.990).</li>
        <li><strong>dayjs</strong>, livré sous forme de bundle minifié, exerçait un dispatch de méthode de prototype JS-classique (<code>Class.prototype.m = fn</code>) que Perry abaissait mal (v0.5.924/932).</li>
      </ul>
      <p>
        Sous tout cela repose la partie qui fait tourner les packages que Perry <em>ne peut pas</em> compiler nativement : le <strong>runtime de repli V8</strong> est devenu réel cette fenêtre. Son ModuleLoader lit désormais depuis une carte de modules embarquée, donc un binaire de repli reste <strong>autonome</strong> — pas de <code>node_modules</code> volants à l&apos;exécution (v0.5.994). <code>createServer</code> fait le pont vers un vrai serveur hyper (v0.5.999), et les globales Web Fetch <code>Response</code> / <code>Request</code> / <code>Headers</code> existent dans le chemin de repli (v0.5.1006). Et l&apos;<strong><code>import()</code> dynamique à la compilation</strong> — <code>await import(&apos;./foo.ts&apos;)</code> en littéral de chaîne résolu au build — a enfin atterri (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Une passe de conformité test262</h2>
      <p>
        L&apos;autre fil dominant est la conformité. Nous avons lancé des passes ciblées sur les radars du sous-ensemble test262 et fait bouger l&apos;aiguille sur les built-ins sur lesquels le vrai code s&apos;appuie le plus :
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        Le bond de String est venu de donner à chaque méthode <code>String.prototype</code> un dispatch générique sur <code>this</code> et de corriger la coercition d&apos;index de <code>slice</code>/<code>substring</code>. Le bond d&apos;Array était <code>thisArg</code> sur les callbacks de dense-array (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), <code>ToLength</code> sur les array-like, l&apos;ordonnancement des opérations de la spec, et la validation des arguments à zéro. Le destructuring a gagné le destructuring de paramètres à travers les méthodes de classe simples, génératrices, async-génératrices, statiques et privées.
      </p>
      <p>
        À côté des chiffres phares, une longue traîne de correction a atterri : <code>JSON.parse</code> lève désormais une vraie <code>SyntaxError</code> (pas une <code>TypeError</code>) et rejette les tokens en trop ; son reviver parcourt via l&apos;algorithme <code>InternalizeJSONProperty</code> de la spec ; <code>Object.prototype.toString</code> marque correctement les typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp ; <code>RegExp.prototype.toString</code> renvoie <code>/source/flags</code> ; les générateurs async ont obtenu la bonne sémantique de leurs <code>yield</code> qui attendent leur opérande. Ce sont des radars de sous-ensemble, pas la suite complète — Perry grimpe encore — mais la montée ce mois-ci était raide.
      </p>

      <h2>Windows passe à Fluent</h2>
      <p>
        Windows a eu une refonte visuelle (la série <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>). Les fenêtres Perry adoptent désormais le chrome DWM moderne par défaut — <strong>backdrop Mica</strong>, coins arrondis, et une barre de titre consciente du thème — et les contrôles communs s&apos;affichent via <strong>comctl32 v6</strong> au lieu des défauts de l&apos;ère Windows 95. La window proc gère maintenant <code>WM_DPICHANGED</code>, donc une fenêtre reste nette quand on la fait glisser entre des moniteurs à mise à l&apos;échelle mixte au lieu d&apos;être étirée en bitmap.
      </p>
      <p>
        Crucialement, rien de tout cela n&apos;a réintroduit l&apos;ancienne régression <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;zone noire après redimensionnement&rdquo; : la zone client est toujours peinte opaque, et le flou Mica/Acrylic plein cadre reste un opt-in explicite via <code>app.setVibrancy(...)</code>. Il y a aussi un nouvel échafaudage de backend <code>--target windows-winui</code> (WinUI 3) pour les apps qui veulent la pile pleinement moderne, et un correctif petit mais réel qui fait que <code>perry compile main.ts -o main</code> produit <code>main.exe</code> sur Windows pour que PowerShell le lance vraiment (v0.5.1146).
      </p>

      <h2>Nouveaux widgets, toutes les plateformes</h2>
      <p>
        Deux widgets ont atterri rien que le dernier jour, et tous deux couvrent chaque plateforme UI que Perry cible :
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — un contrôle de date compact en style champ : <code>NSDatePicker</code> sur macOS, <code>UIDatePicker</code> (.compact) sur iOS/visionOS, <code>SysDateTimePick32</code> sur Windows, <code>android.widget.DatePicker</code> sur Android, GTK4 sur Linux. Une seule surface TS pour tous.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — n&apos;importe quel widget peut être une destination de dépôt et une source de glissement pour texte/fichiers/URLs, mappé sur <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit), et <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Plus tôt dans la fenêtre, l&apos;étagère de widgets s&apos;est aussi remplie sur desktop et mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, et une ImageGallery glissable — chacun adossé au vrai contrôle natif sur chaque plateforme. HarmonyOS (ArkTS) a reçu Chart et TreeView (v0.5.893), les deux derniers widgets dont il avait besoin pour atteindre la parité avec les autres.
      </p>

      <h2>GC, internes et stabilité</h2>
      <p>
        La plupart de ces 270 releases ne sont pas des titres — ce sont des corrections de bugs et des internes, et c&apos;est tout l&apos;objet de cette phase. Quelques-unes méritent d&apos;être citées :
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Le GC a continué.</strong> Le travail de free list conditionnelle du billet sur le GC a continué de se stabiliser, et une classe de bug nette a été fermée : les Promises bridgées en natif sont désormais <strong>épinglées tant qu&apos;elles sont en vol sur un worker tokio</strong> pour que le GC ne puisse pas les balayer avant que la résolution n&apos;arrive (v0.5.923). Si vous avez lancé un fetch async sous charge et vu une collecte fantôme, c&apos;était ça.</li>
        <li><strong>Le modèle mémoire est documenté.</strong> Il y a maintenant un approfondissement <code>internals/memory-model.md</code> — NaN-boxing, le GC générationnel, la shadow stack, et les write barriers — câblé dans le site de docs (v0.5.933).</li>
        <li><strong>Une vague de correctifs de stabilité du codegen</strong> remontés par la passe npm : une arrow <code>const</code> au niveau module appelée à l&apos;intérieur d&apos;une étape async reprise ne fait plus SIGSEGV (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> ne pend plus à jamais (v0.5.870), et une poignée de crashes <code>js_is_truthy</code> / de plage de pointeur brut que de vrais bundles déclenchaient.</li>
      </ul>

      <h2>Ménage côté Apple</h2>
      <p>
        Plus petit mais réel : <code>perry setup ios --development</code> provisionne désormais pour les builds de développement (v0.5.1023), et le chemin de build/link des cross-libraries Apple a été dédupliqué et rendu portable en largeur de pointeur (v0.5.1121/1125) — ce qui a débloqué la matrice de publication npm / Homebrew / APT / winget qui était coincée.
      </p>

      <h2>Où cela nous mène</h2>
      <p>
        Le pari derrière Perry a toujours été que le &ldquo;TypeScript natif&rdquo; ne compte que si du <em>vrai</em> TypeScript tourne — pas un sous-ensemble jouet, les vrais packages que les gens <code>npm install</code>. Ce mois-ci, c&apos;était surtout ce travail : moins un chiffre unique dont se vanter, plus une longue poussée sans gloire pour combler l&apos;écart entre &ldquo;compile&rdquo; et &ldquo;marche.&rdquo; Les radars de conformité et les tests de parité npm sont le tableau de score que nous surveillons désormais, et nous continuerons de publier les chiffres — les bons et les encore-imparfaits.
      </p>
      <p>
        Source : <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues : <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
