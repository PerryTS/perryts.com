export default function Content() {
  return (
    <>
      <p>
        Il y a quelques semaines, <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto sur X) a publié <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">un benchmark de Perry face à Deno et Bun</a> sur le problème AtCoder ABC451D, &ldquo;Concat Power of 2.&rdquo; Sa mesure : Perry tournait <strong>3,85× plus lentement que Bun</strong>. Sa conclusion était polie mais ferme — Perry n&apos;était pas prêt à être un runtime de programmation compétitive, et ne le serait peut-être pas même une fois mûri.
      </p>
      <p>
        Nous lui devons une suite. Voici où nous en sommes arrivés sur le même benchmark, avec la même commande <code>hyperfine</code>, sur la même classe de machine :
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        Combler cet écart a demandé une investigation qui a commencé sur une mauvaise hypothèse, a trouvé un compromis architectural de GC réel mais délibéré, et a produit un résultat qui mérite selon nous d&apos;être raconté — non parce que nous avons rattrapé, mais parce que la manière dont ce compromis apparaissait sous le profilage est intéressante en elle-même.
      </p>

      <h2>Le benchmark</h2>
      <p>
        L&apos;<code>abc451d-perry.ts</code> d&apos;aya_koto effectue une recherche récursive en profondeur sur des concaténations de chaînes de puissances de 2, dédupliquées via un <code>Set&lt;number&gt;</code> et triées. La fonction chaude est courte :
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}`}</code></pre>
      <p>
        La forme est toute l&apos;histoire. Chaque appel alloue un nouveau <code>string[]</code>. La récursion est profonde — facteur de branchement jusqu&apos;à environ 30 au sommet — et chaque frame parent garde son array <code>answers</code> vivant pendant qu&apos;il itère sur l&apos;array de l&apos;enfant et pousse sur le sien. Allocations à courte durée de vie, récursion profonde, références vivantes éparpillées dans chaque bloc d&apos;arène actif. C&apos;est exactement la charge contre laquelle le GC de Perry n&apos;était <em>pas</em> réglé.
      </p>

      <h2>La mauvaise hypothèse</h2>
      <p>
        Un lecteur avait laissé une note de bas de page sur l&apos;article d&apos;aya_koto signalant que le BigInt de Perry était en interne un entier de 1024 bits à longueur fixe, et que les programmes lourds en BigInt tournaient environ 4× plus lentement que Bun. ABC451D implique des puissances de 2 — de grands nombres semblaient plausibles — et le premier réflexe a donc été : BigInt est le coupable, on corrige le chemin BigInt, l&apos;écart se ferme.
      </p>
      <p>
        Faux. <code>grep -i bigint abc451d-perry.ts</code> n&apos;a rien renvoyé. Le benchmark utilise <code>number</code> partout ; chaque valeur tient confortablement sous 2^53. La note BigInt était correcte, réelle, et un problème qui méritait d&apos;être corrigé — et nous l&apos;avons corrigé, séparément, en v0.5.736. Mais cela n&apos;avait rien à voir avec ABC451D.
      </p>
      <p>
        Le coût de poursuivre d&apos;abord la mauvaise hypothèse a été d&apos;environ une journée. La leçon — dont j&apos;aimerais prétendre que nous la connaissions déjà — était : profilez avant de vous engager dans une théorie, même quand la théorie vient d&apos;une source crédible et correspond à vos a priori. Surtout alors.
      </p>

      <h2>Reproduire le bench</h2>
      <p>
        La première chose que nous avons faite une fois que nous avons cessé de poursuivre BigInt a été de reproduire proprement les chiffres d&apos;aya_koto. Nous nous attendions à atterrir près de ses 1,219 s sur Perry. Nous avons atterri à <strong>2,998 s</strong> sur Perry v0.5.729.
      </p>
      <p>
        C&apos;est une régression de 2,5× entre la version qu&apos;il a testée et notre main d&apos;alors. Deno et Bun se sont reproduits à 50 % près de ses chiffres (matériel différent, dérive de version). L&apos;écart de Perry était passé de 3,85× à 6,59× pendant que personne ne regardait.
      </p>
      <p>
        Nous n&apos;avons pas bissecté quel commit a causé la régression — cela sortait du périmètre de cette investigation. Mais l&apos;absence d&apos;un garde-fou CI qui aurait attrapé la dérive est en soi un constat, et nous y reviendrons à la fin.
      </p>

      <h2>Diagnostic piloté par le profil</h2>
      <p>
        Compilé avec <code>PERRY_DEBUG_SYMBOLS=1</code> et enregistré avec <code>samply</code>, le tableau du temps propre était sans ambiguïté :
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>76 % du temps propre était de la machinerie GC.</strong> Le temps inclusif confirmait : <code>gc_collect_minor</code> à 80 %, <code>Arena::alloc</code> à 76 %, <code>js_array_alloc</code> à 45 %, <code>js_array_push_f64</code> à 22 %. Le <code>search()</code> récursif était chaud, mais il était chaud sous la phase de marquage du GC. Chaque appel déclenchait assez d&apos;allocation pour provoquer une collecte.
      </p>
      <p>
        Un microbenchmark de contrôle négatif a confirmé que le ralentissement n&apos;était pas général. <code>fib(80) × 100_000</code> en entiers serrés, sans allocation : Perry <strong>6,1 ms</strong> contre Bun <strong>24,7 ms</strong> — Perry 4× plus rapide. Le codegen pour les boucles chaudes sans allocation était déjà devant Bun. L&apos;écart d&apos;ABC451D se concentrait sur un chemin de code spécifique : le débit d&apos;allocation plus le mark-sweep du GC sur cette forme d&apos;allocation particulière.
      </p>

      <h2>L&apos;indice accablant</h2>
      <p>
        Nous avions un flag — <code>PERRY_GC_DIAG=1</code> — qui imprimait des statistiques GC par cycle. La sortie a été l&apos;observation porteuse de toute l&apos;investigation :
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Chaque cycle, le même motif. Le sweep identifiait correctement que <strong>55 à 60 % des objets alloués étaient morts</strong>. Et l&apos;arène récupérait <strong>zéro bloc</strong>. Le tas grandissait de façon monotone tout au long de l&apos;exécution, tandis que le GC continuait de payer le coût du mark-sweep sur un working set toujours plus grand.
      </p>
      <p>
        Pourquoi <code>block_reclaim=0</code> alors que plus de la moitié des objets étaient morts ? Parce que le GC d&apos;arène de Perry récupère à la granularité du bloc. Un bloc de 1 Mo n&apos;est réinitialisé que lorsque tous les objets qu&apos;il contient sont morts. Dans ABC451D, le <code>search()</code> récursif garde des références vivantes — l&apos;array <code>answers</code> du frame parent — éparpillées dans chaque bloc actif. Aucun bloc n&apos;est jamais entièrement mort. Le mark-sweep identifie correctement les objets morts, n&apos;a pas de chemin de récupération par objet, et donc ne fait rien avec eux. Le tas grandit, les déclenchements du GC s&apos;enchaînent sur un tapis roulant, et le coût de chaque cycle grimpe à mesure que le working set grimpe.
      </p>

      <h2>Le compromis délibéré</h2>
      <p>
        La chose la plus instructive que nous avons trouvée n&apos;était pas dans le profil. Elle était dans le sweep lui-même, à <code>crates/perry-runtime/src/gc.rs:2733</code>, sous forme d&apos;un commentaire expliquant le design :
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        Nous ne poussons délibérément PAS les objets morts sur la <code>ARENA_FREE_LIST</code> globale. L&apos;allocateur bump inline ne lit jamais la free list — il utilise le reset par bloc à la place. Pousser les objets morts sur la free list coûterait ~50ns par objet × ~700k objets par GC × ~12 cycles GC par benchmark = 420ms de pur gaspillage dans <code>object_create</code>.
      </blockquote>
      <p>
        C&apos;est exactement correct pour la charge contre laquelle il a été réglé. <code>object_create</code> est un benchmark qui nous tient à cœur, où les allocations meurent dans une boucle serrée et où des blocs entiers se vident bel et bien entre les cycles. Ajouter une passe de free list par objet brûlerait 420 ms de comptabilité inutile pour cette charge, et le chemin de reset par bloc capture la même mémoire moins cher.
      </p>
      <p>
        C&apos;est un mauvais ajustement pour la forme d&apos;ABC451D, où les références vivantes restent éparpillées et où le reset par bloc ne se déclenche jamais. L&apos;architecture avait un compromis délibéré encodé en elle, et nous n&apos;avions jamais benchmarké le cas où le compromis va dans le mauvais sens.
      </p>
      <p>
        C&apos;est la vraie leçon. Le GC n&apos;était pas cassé. Il était réglé pour une distribution de motifs d&apos;allocation différente de celle que représente le bench d&apos;aya_koto, et nous n&apos;avions pas remarqué que la distribution pour laquelle il était réglé excluait une classe de charges réelles — recherche récursive, parcours d&apos;arbres, tout ce qui maintient un état vivant à chaque niveau de la pile tout en faisant de l&apos;allocation à courte durée de vie en dessous.
      </p>

      <h2>Ce qui n&apos;a pas marché</h2>
      <p>
        Avant d&apos;arriver à un vrai correctif, plusieurs leviers d&apos;apparence plausible se sont révélés être de mauvais leviers. Nous les rapportons avec des chiffres parce qu&apos;ils ont été la moitié la plus intéressante de l&apos;investigation :
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry avait déjà une passe d&apos;évacuation par copie en opt-in. L&apos;activer pour ABC451D : <strong>11,4 secondes</strong>, quatre fois plus lent que la baseline. La passe tourne à chaque cycle qu&apos;elle soit utile ou non, et son coût de copie par objet plus réécriture des références est catastrophique quand le live set est constitué de petits objets à courte durée de vie. À conserver pour les charges qui en bénéficient, mais pas la réponse ici.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (mark-sweep complet au lieu de générationnel) — 3,06 s, essentiellement identique à la baseline. Le choix de la stratégie n&apos;est pas ce qui est contraignant ; c&apos;est l&apos;absence de récupération par objet.</li>
        <li><strong>Nettoyage structurel du <code>ValidPointerSet</code> (commit 0fa42e0b).</strong> Fusion des deux vecteurs triés séparés (pointeurs d&apos;arène et pointeurs malloc) en un seul, ajout d&apos;un préfiltre de plage min/max, inlining du rejet de tag de <code>try_mark_value</code>. A divisé par deux le coût par appel de <code>contains()</code> — qui était la boucle interne chaude signalée par le profil. Le bench ABC451D est passé de 3,07 s à 3,21 s. Du pareil au même, dans le bruit. Le changement apporte toujours de la valeur pour les charges où <code>contains()</code> est réellement la contrainte contraignante (benchmarks de forme ECS, chaînes de compose hono), mais ce n&apos;était pas la contrainte contraignante ici. Le volume absolu d&apos;appels — piloté par la pression d&apos;allocation alimentant la phase de marquage — dominait même à coût par appel nul.</li>
      </ul>
      <p>
        Le motif à travers les trois : la stratégie du GC et les coûts de boucle interne par appel étaient du second ordre. La contrainte contraignante était l&apos;absence d&apos;un chemin de récupération pour les objets morts dans les blocs qui ne se vident pas complètement. Tant que cela n&apos;était pas adressé, rien d&apos;autre ne faisait bouger l&apos;aiguille.
      </p>

      <h2>Où nous en sommes arrivés</h2>
      <p>
        Entre v0.5.737 et v0.5.875, sur environ 137 versions patch, l&apos;écart s&apos;est fermé. Nous sommes délibérés en l&apos;écrivant : nous n&apos;avons pas bissecté jusqu&apos;à un unique commit héros. Le correctif a atterri à travers une série de changements dans le sous-système GC qui ont rendu le compromis délibéré &ldquo;pas de free list par objet&rdquo; conditionnel plutôt que permanent — quand <code>block_reclaim</code> reste à zéro sur des cycles consécutifs, le sweep commence à peupler une free list par buckets de taille et l&apos;allocateur bump gagne un chemin de repli. Le séquençage exact et la contribution de chaque patch nécessiteraient une bissection soignée que nous devons mais n&apos;avons pas encore faite.
      </p>
      <p>
        Le résultat, sur le bench et la commande exacts d&apos;aya_koto, sur Apple M-series, macOS 26.4 :
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Deux notes d&apos;honnêteté sur ce tableau. D&apos;abord, la marge de 1,01× de Perry sur Bun est dans les barres d&apos;erreur — le mot correct est &ldquo;à égalité,&rdquo; pas &ldquo;plus rapide.&rdquo; Ensuite, la variance sur les trois runtimes est significative (le max de Perry est de 745 ms contre une moyenne de 425 ms), et une exécution isolée peut atterrir dans l&apos;une ou l&apos;autre queue. Nous avons montré le min et le max à côté de la moyenne pour cette raison ; nous préférons que vous voyiez la dispersion.
      </p>

      <h2>Ce qui reste imparfait</h2>
      <p>
        Quelques points que nous ne maquillons pas :
      </p>
      <p>
        La régression de 1,2 s à 3,0 s survenue entre la mesure d&apos;aya_koto et le début de cette investigation nous dit que nous n&apos;avions pas de garde-fou CI attrapant cette classe de ralentissement. Nous ajoutons <code>abc451d-perry.ts</code> et une petite suite environnante à la CI de Perry comme porte de régression de perf avant que ce billet ne soit publié. Si ce bench se dégrade silencieusement dans une future release, cela devrait faire échouer un build, pas un benchmark d&apos;un critique dans trois mois.
      </p>
      <p>
        Le correctif relâche un compromis délibéré dans une direction spécifique. Nous surveillons le benchmark <code>object_create</code> et ses semblables — les charges que le choix originel &ldquo;pas de free list&rdquo; protégeait — pour nous assurer que le chemin de free list conditionnel ne les fait pas régresser. Les premiers chiffres sont dans le bruit, mais c&apos;est le genre de chose où la confiance vient du temps, pas d&apos;une seule exécution de benchmark.
      </p>
      <p>
        Nous n&apos;avons pas bissecté la plage de 137 versions. Nous le ferons. Cela importe pour la documentation, et cela importe pour comprendre lesquels des mécanismes de free list conditionnelle font le travail.
      </p>

      <h2>Crédit</h2>
      <p>
        L&apos;article d&apos;aya_koto était exactement le genre de compte rendu dont un projet open-source a besoin et qu&apos;il reçoit rarement. Il a mesuré soigneusement, publié son dépôt de test, pointé des frictions spécifiques dans le chemin d&apos;installation, et atteint la conclusion honnête que Perry n&apos;était pas prêt pour le cas d&apos;usage qu&apos;il évaluait. Cette conclusion était correcte au moment où il l&apos;a faite. Elle serait restée correcte plus longtemps s&apos;il n&apos;en avait pas parlé.
      </p>
      <p>
        Son dépôt de test est à <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>. Son article est à <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>. Les deux valent la lecture même après cette suite — l&apos;article surtout, parce qu&apos;il documente une évaluation honnête d&apos;un compilateur en phase précoce par quelqu&apos;un qui n&apos;a aucune raison d&apos;être poli.
      </p>
      <p>
        Deux points spécifiques de son article que nous devrions noter. La friction du chemin d&apos;installation qu&apos;il a signalée — que le haut de perryts.com pointait vers une méthode tandis que les docs en recommandaient une autre — a été corrigée ; le chemin npm est désormais l&apos;option mise en avant sur la page d&apos;accueil, en accord avec les docs. La frustration des &ldquo;choses hors du doc des limitations qui ne compilent pas&rdquo; qu&apos;il a signalée — nous avons parcouru chaque fichier <code>.ts</code> de son dépôt de test face au Perry actuel ; les vraies lacunes ont fait l&apos;objet d&apos;issues, et les limitations documentées ont été étoffées.
      </p>
      <p>
        La note BigInt de son article était, comme discuté plus haut, sans rapport avec ABC451D mais réelle en elle-même — l&apos;implémentation BigInt de Perry était en effet un entier de 1024 bits à largeur fixe sous le capot, et les programmes lourds en BigInt le payaient. C&apos;est corrigé en v0.5.736, avec un chemin inline pour les petites valeurs et <code>num-bigint</code> comme repli en précision arbitraire. Le crédit revient ici au lecteur qui a laissé la note sur l&apos;article d&apos;aya_koto ; nous ne savons pas qui il est, mais si vous lisez ceci : merci.
      </p>

      <h2>Reproduction</h2>
      <p>
        Si vous voulez reproduire ces chiffres vous-même :
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        Vos chiffres varieront selon le matériel et les versions de runtime. S&apos;ils varient d&apos;une manière qui semble fausse, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">ouvrez une issue</a> — nous préférons en être informés.
      </p>
      <p>
        Source : <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues : <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
