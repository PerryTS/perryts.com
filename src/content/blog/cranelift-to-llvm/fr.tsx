export default function Content() {
  return (
    <>
      <p>
        La migration du backend de Perry de Cranelift vers LLVM est terminée. À partir de v0.5.12, LLVM est le seul backend de génération de code, et Perry bat désormais Node.js sur 14 des 15 benchmarks — avec des marges allant de 1,06x à 24,6x.
      </p>
      <p>
        Le chemin n&apos;a pas été une ligne droite. La bascule initiale en v0.5.0 a rendu plusieurs benchmarks <strong>70x plus lents</strong> que la version Cranelift qu&apos;elle remplaçait. Ce billet est la version longue de ce qui s&apos;est passé, pourquoi nous avons quand même fait le changement, ce qui a cassé, ce qui a réparé, et à quoi ressemblent les chiffres de l&apos;autre côté.
      </p>
      <p>
        Si vous construisez un compilateur, évaluez des backends de codegen, ou êtes simplement curieux de savoir pourquoi &ldquo;passer à LLVM&rdquo; est rarement aussi simple que ça en a l&apos;air, cet article est pour vous.
      </p>

      <h2>Partie 1 : Pourquoi changer ?</h2>
      <p>
        Perry compile TypeScript directement en code machine natif. Pas de Node, pas de V8, pas d&apos;Electron, pas de WebView. La promesse est &ldquo;écrivez du TypeScript, livrez un binaire natif&rdquo;, et toute la proposition de valeur s&apos;effondre si ce binaire n&apos;est pas réellement rapide.
      </p>
      <p>
        Pendant les premières versions mineures de Perry, le backend de codegen était <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. Cranelift est excellent — c&apos;est le codegen derrière wasmtime, il est utilisé par le JIT baseline de SpiderMonkey, et c&apos;est l&apos;outil de choix quand on a besoin d&apos;une compilation rapide et prévisible avec une intégration propre. Pour un projet qui amorce un nouveau langage, c&apos;était le bon point de départ.
      </p>
      <p>
        Mais deux choses nous en ont finalement éloignés.
      </p>

      <h3>1. Le plafond de l&apos;optimiseur</h3>
      <p>
        Cranelift est intentionnellement un compilateur optimisant rapide à un seul niveau. Son mandat est &ldquo;produire du code correct rapidement&rdquo;, pas &ldquo;produire le meilleur code possible sans limite de temps&rdquo;. C&apos;est le bon compromis pour un JIT. C&apos;est le mauvais compromis pour un compilateur AOT dont l&apos;argument de vente est la performance native.
      </p>
      <p>
        LLVM a bénéficié de plus de deux décennies de travail sur son middle-end. Vectorisation de boucles, LICM, GVN, SCCP, combinaison d&apos;instructions, heuristiques d&apos;inlining, réassociation fast-math, analyse d&apos;alias — il n&apos;existe aucun univers réaliste dans lequel un projet plus petit rattrape ce niveau. Si Perry veut affirmer &ldquo;plus rapide que Node&rdquo;, nous avons besoin de cette machinerie.
      </p>

      <h3>2. Le problème arm64_32</h3>
      <p>
        Le déclencheur immédiat a été l&apos;Apple Watch. <code>arm64_32</code> est un ABI qu&apos;Apple a introduit pour la Series 4 et ultérieures — instructions 64 bits, pointeurs 32 bits. Cranelift ne le supporte pas, et il n&apos;y avait pas de perspective réaliste que cela arrive. Pour que Perry puisse crédiblement affirmer &ldquo;9 plateformes depuis une seule base de code&rdquo;, watchOS ne pouvait pas manquer. LLVM supporte <code>arm64_32</code> nativement.
      </p>
      <p>
        Une fois que nous avons accepté que <em>certaines</em> cibles nécessiteraient LLVM, maintenir deux backends est devenu intenable. Deux backends signifient deux ensembles de bugs, deux ensembles de passes d&apos;optimisation, deux matrices de tests, deux lignes de base de performance. La réponse honnête était : en choisir un.
      </p>
      <p>Nous avons choisi LLVM.</p>

      <h2>Partie 2 : Un mot sur Cranelift</h2>
      <p>
        Avant d&apos;aller plus loin : cet article n&apos;est pas un réquisitoire contre Cranelift. Cranelift est une pièce d&apos;ingénierie brillante, et si vous construisez un JIT, un runtime sandboxé, ou quoi que ce soit où la latence de compilation compte plus que le débit maximal, il devrait être en haut de votre liste. wasmtime l&apos;utilise pour de bonnes raisons. La Bytecode Alliance fait un travail exemplaire.
      </p>
      <p>
        Les besoins de Perry sont simplement différents. Nous compilons à l&apos;avance, nous livrons le binaire une fois, et l&apos;utilisateur l&apos;exécute des millions de fois. Cette asymétrie — compiler rarement, exécuter toujours — est exactement le régime où l&apos;optimiseur plus lourd de LLVM se rentabilise. Outil différent pour un travail différent.
      </p>

      <h2>Partie 3 : Le désastre de la bascule</h2>
      <p>
        v0.5.0 a été le premier release avec LLVM comme seul backend. Nous nous attendions à une légère régression du temps de compilation et à une amélioration significative des performances à l&apos;exécution. Nous avons obtenu le contraire du second point.
      </p>
      <p>Voici le tableau que je ne voulais pas publier à l&apos;époque :</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2.8x faster</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1.8x slower</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2.3x slower</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Certaines charges de travail se sont accélérées. La plupart se sont considérablement dégradées. <code>method_calls</code> — l&apos;un des benchmarks les plus importants car il représente l&apos;utilisation idiomatique des classes TypeScript — était près de 70x pire que ce que nous avions livré deux releases plus tôt.
      </p>

      <h3>Ce qui a réellement mal tourné</h3>
      <p>
        Perry utilise le <strong>NaN-boxing</strong> pour la représentation des valeurs. Chaque valeur TypeScript est un mot de 64 bits. Les nombres f64 sont stockés directement ; tout le reste (objets, chaînes, booléens, undefined, null) est encodé dans les bits inutilisés d&apos;un IEEE 754 quiet NaN.
      </p>
      <p>
        L&apos;avantage : les nombres sont à coût nul. Pas de boxing, pas de tagging, pas d&apos;allocation pour l&apos;arithmétique.
      </p>
      <p>
        L&apos;inconvénient : chaque opération sur une valeur non numérique nécessite une manipulation de bits pour déballer, opérer et remballer. Si ces séquences sont du IR inline dans votre codegen, l&apos;optimiseur peut les fusionner et les simplifier. Si elles sont des <strong>appels à des fonctions helpers du runtime</strong>, l&apos;optimiseur voit un appel opaque et abandonne.
      </p>
      <p>
        Notre backend Cranelift avait accumulé un grand nombre de lowerings inline pour les opérations chaudes — chargements de propriétés, dispatch de méthodes, allocation d&apos;objets, arithmétique entière sur des valeurs taggées f64. La bascule vers LLVM, dans l&apos;intérêt de produire d&apos;abord du code <em>correct</em>, a routé presque toutes ces opérations vers des helpers du runtime dans <code>perry-runtime</code>. Chaque helper était une instruction <code>call</code> en LLVM IR.
      </p>
      <p>
        LLVM est excellent, mais il ne peut pas inliner une fonction dont il n&apos;a jamais vu le corps. <code>perry-runtime</code> est compilé séparément, lié à la fin, et du point de vue de l&apos;optimiseur, chaque appel de helper est une boîte noire. Le résultat était que des boucles chaudes que le backend Cranelift compilait en ~5 instructions d&apos;arithmétique inline étaient désormais compilées en appels de fonction — sauvegarde de registres, mise en place du stack frame, tout le tralala — répétés des millions de fois.
      </p>
      <p>
        C&apos;est de là que venaient les 70x. Pas du mauvais codegen. De mauvaises <strong>frontières d&apos;inlining</strong>.
      </p>

      <h2>Partie 4 : La correction</h2>
      <p>
        Le travail pour rattraper et dépasser les chiffres de Cranelift s&apos;est réparti en environ six catégories. Aucune n&apos;est exotique. La plupart sont des optimisations de compilateur classiques qui devaient simplement être appliquées aux bons endroits.
      </p>

      <h3>1. Bump allocator inline pour l&apos;allocation d&apos;objets</h3>
      <p>
        <code>object_create</code> était la pire régression après <code>method_calls</code>. L&apos;ancien chemin appelait <code>js_object_alloc_class_with_keys</code> pour chaque <code>new Point()</code> — un appel de fonction, un accès à une arena thread-local, une recherche dans le cache de shapes, et une écriture du GC header + object header.
      </p>
      <p>
        La correction : émettre l&apos;allocation bump <strong>inline</strong> en LLVM IR. Chaque fonction qui alloue des objets obtient un pointeur caché vers une structure <code>InlineArenaState</code> thread-locale. L&apos;allocation devient :
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        Le chemin rapide fait ~13 instructions de IR inline que LLVM peut voir, ordonnancer et hisser hors des boucles. <code>object_create</code> est passé de 318ms à 9ms.
      </p>

      <h3>2. Compteurs de boucle i32</h3>
      <p>
        Le NaN-boxing signifie que chaque nombre TypeScript est f64. Cela inclut les compteurs de boucle. Une boucle <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> avec des variables d&apos;induction f64 est un désastre : incrémentation f64, comparaison f64, conversion f64 vers i64 à chaque accès indexé dans un tableau.
      </p>
      <p>
        Le codegen détecte les boucles for où la variable d&apos;induction est prouvablement entière et alloue un <strong>slot de pile i32 parallèle</strong>. La condition de boucle passe de <code>fcmp</code> à <code>icmp slt i32</code>, éliminant entièrement le compteur f64.
      </p>
      <p>
        Cela a fait passer <code>array_write</code> de 11ms à 3ms, <code>nested_loops</code> de 18ms à 9ms, et <code>array_read</code> de 11ms à 4ms.
      </p>

      <h3>3. Drapeaux fast-math</h3>
      <p>
        Nous attachons les drapeaux <code>reassoc contract</code> à chaque instruction arithmétique f64. <code>reassoc</code> permet à LLVM de casser les chaînes d&apos;accumulateur sérielles en parallèles, et <code>contract</code> autorise le multiply-add fusionné. Nous gardons <code>nnan</code> et <code>ninf</code> désactivés parce que Perry utilise les bits NaN comme tags de valeur.
      </p>
      <p>
        Avec ces drapeaux, le vectoriseur de boucles de LLVM s&apos;active sur <code>math_intensive</code>, qui est passé de 131ms à 14ms — battant Node de 3,5x.
      </p>

      <h3>4. Chemin rapide pour le modulo entier</h3>
      <p>
        <code>%</code> sur f64 en JavaScript est <code>fmod</code>, qui est un appel libm sur ARM. Mais pour des opérandes f64 à valeur entière, on peut faire <code>fptosi → srem → sitofp</code> et sauter entièrement l&apos;aller-retour par libm. Le codegen utilise l&apos;analyse statique pour détecter les opérandes à valeur entière — aucune vérification à l&apos;exécution nécessaire.
      </p>
      <p>
        C&apos;est la raison pour laquelle <code>factorial</code> est passé de 1 553ms à 24ms — et des 591ms de Node à 24ms. <strong>24,6x plus rapide que Node.</strong>
      </p>

      <h3>5. LICM pour les boucles imbriquées</h3>
      <p>
        LLVM fait du loop-invariant code motion nativement, mais le NaN-boxing masque la structure. <code>arr.length</code> se traduit par un load à travers un pointeur NaN-boxé avec une vérification de tag — pas évidemment invariant.
      </p>
      <p>
        Le codegen détecte le motif <code>{'for (...; i < arr.length; ...)'}</code> et pré-charge la longueur dans un slot de pile avant la boucle, avec un walker statique qui vérifie que le corps de la boucle ne peut pas modifier la longueur du tableau. Quand le compteur est borné par cette longueur hissée, IndexGet/IndexSet sautent entièrement les vérifications de bornes.
      </p>

      <h3>6. Objets avec cache de shapes</h3>
      <p>
        Quand le codegen connaît la classe d&apos;un objet, il résout les offsets de champs au moment de la compilation et émet des <strong>loads indexés directs</strong> — pas de dispatch à l&apos;exécution. Pour le dispatch de méthodes, <code>obj.method(args)</code> devient un <code>call @perry_method_Class_name(this, args)</code> direct — pas de vtable, pas d&apos;inline cache, pas de recherche hash.
      </p>
      <p>
        La bascule LLVM avait régressé vers le chemin lent universel. Restaurer le dispatch statique nous a donné la récupération de <code>method_calls</code> — de 1 084ms à 1ms. <strong>11x plus rapide que Node.</strong>
      </p>

      <h2>Partie 5 : Les chiffres aujourd&apos;hui</h2>
      <p>Médiane de trois exécutions, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25 :</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        14 victoires sur 15. La seule défaite est <code>object_create</code>, où l&apos;allocateur de V8 est véritablement excellent et nous sommes à 12% d&apos;écart.
      </p>

      <h2>Partie 6 : La question du temps de compilation</h2>
      <p>
        La raison numéro un pour laquelle les gens choisissent Cranelift plutôt que LLVM est la vitesse de compilation. Parlons-en.
      </p>
      <p>
        LLVM a augmenté le temps de compilation par fichier de Perry de <strong>20 à 50ms</strong>, soit environ <strong>8 à 19%</strong>. Pas 5x. Pas 2x. Un pourcentage à un chiffre ou à deux chiffres faible.
      </p>
      <p>
        La raison est que le codegen n&apos;est pas le goulot d&apos;étranglement dans le pipeline de Perry. La répartition pour un fichier typique :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC parsing : ~30%</li>
        <li>HIR lowering (AST → IR, inférence de types) : ~25%</li>
        <li>Passes de transformation IR (conversion de closures, async lowering, inlining) : ~15%</li>
        <li><strong>Codegen (émission de texte LLVM IR + <code>clang -c -O3</code>) : ~20%</strong></li>
        <li>Linking (<code>cc</code> + bibliothèque runtime) : ~10%</li>
      </ul>
      <p>
        Le codegen est une tranche sur cinq. Même en doublant cette tranche, le total ne bouge que de 5 à 10%. Si vous construisez un compilateur AOT où l&apos;utilisateur tape <code>perry compile</code> une fois puis exécute le binaire indéfiniment, le calcul est : dépenser 25ms de plus à la compilation, économiser jusqu&apos;à 24x à chaque exécution.
      </p>

      <h2>Partie 7 : Ce que je ferais différemment</h2>
      <p>
        Si je démarrais Perry aujourd&apos;hui et pouvais passer directement à LLVM, je ne le ferais pas. La phase Cranelift a été véritablement précieuse. Elle nous a permis d&apos;itérer sur le frontend sans la taxe de complexité de LLVM, elle nous a donné une ligne de base fonctionnelle pour comparer, et elle nous a forcés à garder notre HIR assez propre pour être portable entre les backends.
      </p>
      <p>
        Ce que je ferais différemment, c&apos;est la bascule elle-même. Nous avons livré v0.5.0 avec la plupart des opérations passant par des appels à des helpers du runtime, avec l&apos;intention de les inliner plus tard. C&apos;était une erreur. Le bon ordre aurait été : identifier d&apos;abord les chemins chauds, les descendre en inline avant la bascule, et ne publier qu&apos;une fois le backend LLVM au moins à parité.
      </p>
      <p>
        La leçon est celle qui est ennuyeuse : les frontières d&apos;optimisation comptent plus que la qualité de l&apos;optimiseur. LLVM est un logiciel remarquable, mais il ne peut pas vous aider avec du code qu&apos;il ne peut pas voir. Si votre codegen route tout à travers des appels opaques au runtime, vous avez construit un mur entre votre programme source et chaque passe d&apos;optimisation qui existe.
      </p>

      <h2>Pour conclure</h2>
      <p>
        Perry est désormais uniquement LLVM, plus rapide que Node sur 14 des 15 benchmarks, et en production. La migration a pris plus de temps que prévu, a fait plus mal que je ne l&apos;attendais en cours de route, et est sans ambiguïté la bonne décision avec le recul. Cranelift nous a amenés jusqu&apos;à v0.5 ; LLVM nous emmène pour le reste du chemin.
      </p>
      <p>Si vous voulez essayer Perry :</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source : <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs : <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Lancez les benchmarks vous-même : <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Si vous avez des questions, trouvez des bugs, ou voulez débattre des backends de codegen, les issues GitHub sont ouvertes. Je les lis toutes.
      </p>
      <p>— Ralph</p>
    </>
  );
}
