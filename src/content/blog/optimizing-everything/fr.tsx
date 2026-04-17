export default function Content() {
  return (
    <>
      <p>
        Le dernier billet de blog a été publié avec Perry en v0.5.12. Aujourd&apos;hui, nous en sommes à la v0.5.80. Soit <strong>68 releases de correctifs en sept jours</strong>, presque entièrement concentrées sur une seule chose : transformer chaque chemin lent restant en chemin rapide.
      </p>
      <p>
        La bascule vers LLVM en v0.5.0 a retrouvé la parité avec Cranelift en v0.5.12. C&apos;était la fin d&apos;une histoire et le début d&apos;une autre. LLVM voit tout désormais. La question est passée de « pourquoi est-ce lent ? » à « pourquoi n&apos;est-ce pas déjà rapide ? » — ce qui est une question beaucoup plus traitable.
      </p>
      <p>
        Ce billet est une visite guidée de la semaine. JSON a obtenu une accélération de 547x. mimalloc est devenu l&apos;allocateur global. L&apos;accès aux propriétés a gagné un inline cache monomorphe. Les buffers ont gagné des slots de pointeurs typés avec des métadonnées <code>noalias</code>. Les serveurs Fastify et WebSocket ont cessé de planter après une minute. Et les benchmarks ont bougé à nouveau.
      </p>

      <h2>1. JSON : combler un écart de 547x</h2>
      <p>
        En v0.5.29, le JSON.parse de Perry sur un tableau de 20 enregistrements était <strong>547x plus lent que Node</strong>. En v0.5.46, il était 1,3x. Ce chiffre est le plus grand delta unique de la semaine, et il vaut la peine d&apos;être parcouru parce que chaque autre optimisation dans ce billet est une variation sur le même thème : ne faites pas le travail que vous n&apos;avez pas à faire.
      </p>
      <p>
        Le parser original allouait un Vec par propriété, un Vec de clés par objet, et un thread-local gardé par RefCell pour le cache de clés. Il copiait chaque chaîne. Il re-hachait chaque nom de champ. Il construisait une toute nouvelle shape d&apos;objet pour chaque enregistrement, même quand les 20 enregistrements avaient exactement les mêmes champs dans exactement le même ordre. Le parser de Node gère cela en remarquant le motif et en partageant une seule shape entre tous les enregistrements. Celui de Perry ne le faisait pas.
      </p>
      <p>La correction s&apos;est déroulée en quatre étapes :</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Internement des clés via un <code>PARSE_KEY_CACHE</code> thread-local</strong> (v0.5.45). Le premier enregistrement alloue N chaînes de clés ; les enregistrements 2 à 20 en allouent zéro. Les clés répétées se résolvent vers le même pointeur, ce qui les rend utilisables comme clés de recherche du cache de shapes sans strcmp.</li>
        <li><strong>Partage de shapes via le cache de transitions</strong> (v0.5.45). Les objets construits par <code>js_object_set_field_by_name</code> parcourent le même graphe de transitions. Quand le schéma se répète, le pointeur <code>keys_array</code> est partagé, et c&apos;est ce dont un inline cache polymorphe a besoin pour toucher.</li>
        <li><strong>Parsing de chaînes sans copie + construction incrémentale d&apos;objets</strong> (v0.5.46). <code>parse_string_bytes</code> retourne maintenant <code>ParsedStr::Borrowed(&amp;[u8])</code> quand il n&apos;y a pas d&apos;échappements backslash — ce qui est le cas courant pour chaque clé et la plupart des valeurs. <code>parse_object</code> écrit les champs directement au lieu de les collecter d&apos;abord dans un Vec.</li>
        <li><strong>Suppression du GC pendant le parse</strong> (v0.5.60, ferme #59). Parser un grand tableau alloue des milliers de petits objets dans une boucle serrée. Chacun déclenchait la vérification du seuil GC. Positionner un drapeau « parsing en cours » diffère la collecte jusqu&apos;à ce que le parse retourne — même taille de tas effective, beaucoup moins de branches de comptabilité.</li>
      </ol>
      <p>
        Puis stringify. JSON.stringify sur des tableaux homogènes — la même shape, des millions de fois — faisait une itération complète des propriétés par objet, ce qui, pour un tableau à shape stable, est du pur gaspillage. Une correction en cinq étapes a également comblé la majeure partie de cet écart :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62 : chemins rapides itoa / ryu pour les nombres, vérification de référence circulaire basée sur la profondeur au lieu d&apos;un HashSet.</li>
        <li>v0.5.63 : garde <code>toJSON</code> + cache de clés persistant + dispatch inline (les trois coûts par appel qui s&apos;additionnaient).</li>
        <li>v0.5.65 : template de stringify pour shape homogène + chemin rapide d&apos;échappement ASCII. Quand chaque élément a la même shape, l&apos;échafaudage clé/deux-points/virgule est précalculé une fois.</li>
        <li>v0.5.70, v0.5.72, v0.5.75 : cache de template de shape par appel, fermeture de l&apos;écart GC restant après parse, élimination du surcoût fixe par appel restant.</li>
        <li>v0.5.79 : le chemin pour petites valeurs. Les nombres, booléens et chaînes courtes passent par un chemin direct qui ne met en place aucune de la machinerie d&apos;objets.</li>
      </ul>
      <p>
        Le résultat cumulé : un pipeline JSON qui était <strong>547x en retard sur Node</strong> au début de la semaine est maintenant à environ <strong>1,3x en retard sur le parse et compétitif sur stringify</strong>, sur des charges de travail réalistes.
      </p>

      <h2>2. L&apos;histoire de l&apos;allocateur</h2>
      <p>
        Perry alloue beaucoup. Chaque littéral d&apos;objet, chaque littéral de tableau, chaque concaténation de chaînes, chaque closure. L&apos;allocateur est chaud, et pendant la majeure partie de v0.5, c&apos;était l&apos;allocateur système par défaut de Rust plus une arena thread-local pour les valeurs à courte durée de vie.
      </p>
      <p>
        v0.5.67 a remplacé l&apos;allocateur global par <strong>mimalloc</strong>. C&apos;est un changement d&apos;une ligne dans Cargo.toml qui se rentabilise immédiatement sur toute charge de travail qui fait beaucoup de petites allocations — ce qui est le cas de tout programme TypeScript. v0.5.66 l&apos;a précédé en consolidant tout l&apos;état thread-local de <code>gc_malloc</code> en un seul accès TLS par appel, afin que le chemin vers mimalloc soit aussi peu coûteux que possible.
      </p>
      <p>
        v0.5.68 est allé plus loin avec les <strong>chaînes allouées en arena</strong>. Les chaînes à courte durée de vie (résultats de concat intermédiaires, morceaux de <code>split()</code>, scratch du parser) contournent entièrement l&apos;allocateur global et atterrissent dans une arena bump par thread qui se réinitialise aux frontières naturelles. Pour le parsing JSON, c&apos;était à lui seul un gain de pourcentage à deux chiffres.
      </p>
      <p>
        Et les deux optimisations qui n&apos;allouent pas du tout :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Remplacement scalaire des objets non-échappants</strong> (v0.5.17, puis littéraux d&apos;objets en v0.5.76). Si un objet ne quitte jamais sa fonction englobante, il n&apos;a pas besoin d&apos;exister. Ses champs deviennent de simples variables locales. LLVM gère cela d&apos;emblée une fois qu&apos;on arrête de cacher l&apos;objet derrière un appel d&apos;allocateur opaque.</li>
        <li><strong>Remplacement scalaire des tableaux non-échappants</strong> (v0.5.73). Même idée — si le tableau ne s&apos;échappe pas, ses éléments deviennent des valeurs SSA et toute l&apos;allocation disparaît.</li>
      </ul>
      <p>
        Pour le chemin des littéraux de tableau spécifiquement, v0.5.69 a ajouté un <strong>chemin rapide à taille exacte</strong> (sauter la machinerie de croissance de capacité quand la taille est connue à la compilation), et v0.5.74 a inliné l&apos;IR de l&apos;allocateur bump pour les petits littéraux de tableau afin que LLVM puisse voir l&apos;allocation, la replier, la hisser ou l&apos;éliminer. Les benchmarks lourds en tableaux ont bougé d&apos;un cran de plus.
      </p>
      <p>
        Pour compléter, v0.5.25 a corrigé un bug plus discret : <code>gc_malloc</code> ne déclenchait pas la collecte sur son propre chemin, donc les charges de travail lourdes en malloc pouvaient faire croître le tas sans limite avant que quoi que ce soit ne vérifie. v0.5.61 a ajouté un dimensionnement de pas adaptatif au seuil, ce qui est ce qu&apos;on veut réellement : vérifier à bon marché quand le tas est petit, moins souvent quand il est grand.
      </p>

      <h2>3. L&apos;accès aux propriétés a gagné un vrai inline cache</h2>
      <p>
        Chaque moteur JavaScript moderne a un polymorphic inline cache (PIC) sur l&apos;accès aux propriétés. Pendant la majeure partie de la série v0.5 de Perry, PropertyGet passait par une recherche dans une table de shapes avec un hash thread-local. C&apos;est bien pour du code froid. Ce n&apos;est pas bien quand 95% de vos lectures de propriétés sur un site d&apos;appel donné voient la même shape, ce qui est presque toujours le cas.
      </p>
      <p>
        v0.5.44 a livré un <strong>inline cache monomorphe</strong> pour <code>PropertyGet</code>. Chaque site PropertyGet obtient une entrée de cache par site d&apos;appel : un pointeur de shape attendu et un offset de champ. Le chemin de touche est une seule comparaison plus un chargement indexé. Le chemin de miss passe par un helper lent qui met à jour le cache.
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51 a ajouté un <strong>cache de transitions de shapes basé sur le hash du contenu</strong> pour les écritures de propriétés dynamiques. Deux objets qui font croître les mêmes champs dans le même ordre hashent vers la même transition, donc ils finissent par partager la même shape — et cela signifie que le côté lecture du PIC touche réellement.
      </p>
      <p>
        v0.5.55 a retiré le dernier accès TLS du cache de transitions. v0.5.46 a corrigé un bug dans le gestionnaire de miss du PIC où les objets avec &gt;8 champs lisaient au-delà des slots inline dans de la mémoire non initialisée (ferme #55). v0.5.78 a ajouté une garde pour empêcher le PIC de PropertyGet d&apos;indexer sur des receivers non-pointeur comme des nombres bruts — ce qui pouvait arriver sur un raffinement de types trop optimiste et était l&apos;un des derniers problèmes de stabilité dans l&apos;IC.
      </p>
      <p>
        Effet net : le code lourd en propriétés — ce qui signifie en pratique la plupart du TypeScript — est environ 2 à 3x plus rapide qu&apos;il y a une semaine, rien qu&apos;avec l&apos;IC seul.
      </p>

      <h2>4. Entiers, opérations bit à bit, et le motif <code>| 0</code></h2>
      <p>
        Le NaN-boxing fait que chaque nombre est un f64. Les programmeurs TypeScript écrivent <code>x | 0</code> pour forcer la sémantique entière. V8 a passé quinze ans à rendre cela peu coûteux. Perry a passé cette semaine à rattraper.
      </p>
      <p>La pile de changements, dans l&apos;ordre :</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong> : <code>sdiv</code> pour <code>(int / const) | 0</code>. LLVM replie vers <code>smulh + asr</code>, qui est ~2 cycles contre ~10 pour <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong> : <code>@llvm.assume</code> sur les bornes de Uint8ArrayGet. Remplace le diamant branch+phi de vérification de bornes par un seul bloc de base sur lequel le vectoriseur peut raisonner.</li>
        <li><strong>v0.5.49</strong> : corriger les ops bit à bit avec NaN/Infinity pour produire 0 selon la spec ToInt32. La correction d&apos;abord.</li>
        <li><strong>v0.5.50</strong> : <code>toint32_fast</code> qui saute la garde NaN/Inf de 5 instructions quand la valeur est connue finie. Plus <code>alwaysinline</code> sur les petits helpers et détection de clamp.</li>
        <li><strong>v0.5.52</strong> : cibler directement les fonctions clamp avec les intrinsèques <code>smin</code>/<code>smax</code>. Le clamp est le motif entier le plus courant après l&apos;incrémentation.</li>
        <li><strong>v0.5.53</strong> : <code>x | 0</code> et <code>x &gt;&gt;&gt; 0</code> sur une valeur connue finie deviennent un noop &mdash; juste <code>fptosi + sitofp</code>, aucune garde.</li>
        <li><strong>v0.5.56</strong> : ops bit à bit natives i32 ; index et valeur i32 dans Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong> : <code>Math.imul</code> descend vers le multiply i32 natif au lieu du chemin polyfill. La détection de polyfill reconnaît les shims <code>Math.imul</code> écrits par l&apos;utilisateur et les remplace.</li>
        <li><strong>v0.5.59</strong> : inlining d&apos;init de fonction pure + amorçage de locaux entiers. L&apos;analyse d&apos;entiers locaux à la fonction peut voir au-delà des frontières d&apos;appel quand la fonction appelée est petite et pure.</li>
        <li><strong>v0.5.37–v0.5.40</strong> : chemin rapide d&apos;arithmétique entière avec motif accumulateur. La boucle classique <code>for (...) acc += f(i)</code> reste en i32 de bout en bout quand les types le permettent.</li>
      </ul>
      <p>
        v0.5.41 est la subtile. Quand le codegen voit un <code>const K: number[][] = [[...], ...]</code> au niveau module, il abaisse le tout en une constante plate <code>[N x i32]</code> dans <code>.rodata</code>. <code>K[y][x]</code> devient un seul <code>getelementptr + load i32</code>. Combiné avec le pont d&apos;analyse d&apos;entiers en v0.5.43, c&apos;est ce qui a donné à <code>image_conv</code> (un flou gaussien 5×5 sur une image RGB 4K) une <strong>accélération de 3x en une seule release</strong>.
      </p>

      <h2>5. Buffers et Uint8Array</h2>
      <p>
        Les charges de travail binaires — crypto, traitement d&apos;images, parsing, réseau — vivent dans Buffer et Uint8Array. v0.5.64 leur a donné des <strong>slots de pointeurs typés plus des métadonnées <code>noalias</code></strong>. Là où un Buffer était auparavant un double NaN-boxé dans un <code>alloca double</code>, c&apos;est maintenant un pointeur <code>i64</code> brut dans un <code>alloca i64</code>, avec des annotations LLVM qui disent à l&apos;optimiseur « ce pointeur ne fait pas d&apos;alias avec d&apos;autres pointeurs en scope ». Cela débloque le réordonnancement load/store, la vectorisation et l&apos;allocation de registres que l&apos;optimiseur refuserait autrement de faire.
      </p>
      <p>
        v0.5.80 a fermé le dernier problème de correction ici : un compteur <code>alias-scope</code> à l&apos;échelle du module qui était réinitialisé par fonction, ce qui pouvait dans de rares cas laisser LLVM raisonner à travers des scopes qui ne devraient pas partager un scope ID. Maintenant le compteur est à l&apos;échelle du module et l&apos;histoire <code>noalias</code> est hermétique.
      </p>
      <p>
        v0.5.53 a rendu <code>Uint8ArraySet</code> sans branche — un store masqué au lieu d&apos;un if/else qui écrivait 0 hors bornes. v0.5.54 a ajouté un <strong>indexOf Two-Way</strong> pour les motifs plus longs et un <code>split</code> alloué en arena, qui ensemble ont fermé la majeure partie de l&apos;écart sur le parsing de Buffer lourd en chaînes.
      </p>

      <h2>6. Chaînes : ASCII est le chemin rapide</h2>
      <p>
        Les chaînes JavaScript sont en UTF-16, mais la plupart des chaînes du monde réel (clés, identifiants, en-têtes HTTP, échafaudage JSON) sont en ASCII. v0.5.71 a ajouté un <strong><code>charCodeAt</code> et <code>codePointAt</code> en O(1) pour les chaînes ASCII</strong> — pas de scan UTF-16, juste un load d&apos;octet. v0.5.20 avait déjà fait en sorte que <code>indexOf</code>, <code>slice</code> et <code>charAt</code> contournent le scan UTF-16 en ASCII.
      </p>
      <p>
        Une note de correction dans cette même release : <code>String.length</code> retourne maintenant les unités de code UTF-16 (spec ECMAScript) au lieu du nombre d&apos;octets. C&apos;était un bug latent où <code>&quot;caf&eacute;&quot;.length</code> retournait 5 au lieu de 4.
      </p>

      <h2>7. Les serveurs restent vraiment debout maintenant</h2>
      <p>
        Le travail le moins glamour de la semaine était aussi le plus visible pour l&apos;utilisateur : faire en sorte que les serveurs long-running de style Node — Fastify, ws, http, net — ne plantent pas après quelques minutes.
      </p>
      <p>
        Les plantages partageaient tous une cause racine : le GC ne connaissait pas les closures d&apos;écouteurs. Quand vous écrivez <code>wss.on(&apos;message&apos;, handler)</code>, la closure capture des variables, qui vivent comme champs à l&apos;intérieur d&apos;une cellule allouée par le GC. Si le scanner de racines du GC ne sait pas qu&apos;il doit visiter ces cellules, leurs captures sont récupérées et le prochain événement de message déréférence de la mémoire libérée.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong> : scan-racine des closures d&apos;écouteurs d&apos;événements <code>net.Socket</code> (ferme #35).</li>
        <li><strong>v0.5.27</strong> : étendre à <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>.</li>
        <li><strong>v0.5.28</strong> : enregistrer les globales au niveau module comme racines GC (ferme #36). Bug de durée de vie une couche au-dessus.</li>
        <li><strong>v0.5.21</strong> : sûreté de <code>gc()</code> à l&apos;intérieur des handlers de requêtes Fastify/WebSocket — l&apos;appel GC explicite s&apos;exécutait pendant que les handlers de requêtes tenaient des pointeurs vers l&apos;arena (ferme #31).</li>
      </ul>
      <p>
        Aux côtés du travail GC, v0.5.20 a livré une <strong>boucle d&apos;événements principale</strong> — une vraie, pas un placeholder — qui garde les serveurs basés sur WebSocket et timers en vie au lieu de quitter après que le dernier appel sync retourne (refs #28). C&apos;était la correction la plus impactante pour quiconque essayait d&apos;exécuter Perry comme serveur HTTP de production. Fastify reste debout maintenant. Les serveurs WebSocket restent debout maintenant.
      </p>
      <p>
        v0.5.19 a corrigé le mismatch d&apos;ABI SysV AMD64 pour les args/retours FFI JSValue — un problème sur Linux où les appels FFI natifs pouvaient corrompre silencieusement les arguments. v0.5.18 a ajouté le dispatch natif pour <code>axios</code> (get/post/put/delete/patch), y compris <code>response.status</code> et <code>response.data</code>. v0.5.30 a corrigé le dispatch de <code>fastify request.header()</code> et <code>request.headers[]</code>, qui retournait undefined pour les recherches insensibles à la casse.
      </p>

      <h2>8. <code>@perry/postgres</code> : le driver qui a rendu tout cela nécessaire</h2>
      <p>
        Une grande partie du travail de cette semaine a été motivée par une charge de travail : faire fonctionner un <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">driver Postgres</a> complet compatible Node sur Perry-native. Le driver gère TLS, a un registre de codecs inter-modules, supporte cancel/close/notify, et benchmarque maintenant contre <code>pg</code>, <code>postgres.js</code> et <code>tokio-postgres</code>.
      </p>
      <p>Le travail de perf côté driver a été parallèle à celui côté compilateur :</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Hisser le codec par colonne</strong> et supprimer les copies de Buffer par cellule. BigInt(string) pour int8 afin d&apos;éviter les allocations intermédiaires.</li>
        <li><strong>Constructeur de Row dynamique par shape</strong> pour les lignes au format objet. Si votre requête retourne toujours les mêmes colonnes, le driver construit un constructeur de ligne spécialisé à la shape la première fois et le réutilise — ce qui, en combinaison avec le PIC du compilateur, rend l&apos;accès aux champs sur les lignes aussi rapide que l&apos;accès aux champs sur n&apos;importe quel autre objet.</li>
        <li><strong>Opt-out <code>parseTypes: &apos;minimal&apos;</code></strong> pour les appelants qui veulent des chaînes brutes pour int8/numeric/date.</li>
      </ul>
      <p>
        C&apos;est la boucle de rétroaction positive que le compilateur était censé permettre. Un vrai driver fait remonter de vrais goulots d&apos;étranglement. Le goulot obtient un reproducteur d&apos;une ligne déposé comme issue GitHub. Une semaine de corrections du compilateur plus tard, le driver est plus rapide et le compilateur est plus rapide pour tous les autres aussi. C&apos;est le plan entier, compressé en sept jours.
      </p>

      <h2>9. Corrections de correction qui méritent d&apos;être nommées</h2>
      <p>
        Le travail de performance fait remonter les problèmes de correction comme le draguage d&apos;une rivière fait remonter les chariots de supermarché. Une liste partielle :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> lisait <code>.value</code> en cas de rejet au lieu de <code>.reason</code>, donc les rejets étaient silencieusement avalés (v0.5.13–v0.5.14).</li>
        <li><strong>Promise.any</strong> lève maintenant une <code>AggregateError</code> appropriée quand toutes les promesses d&apos;entrée rejettent. Ajout de <code>Promise.withResolvers</code> et correction de l&apos;ordre de <code>queueMicrotask</code>.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> produit maintenant un tableau de caractères au lieu d&apos;un objet cassé (ferme #16).</li>
        <li><strong>Arithmétique BigInt et coercition <code>BigInt()</code></strong> (ferme #33). Le chemin rapide bigint i64 (v0.5.29) rend le cas courant peu coûteux.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> avec un argument d&apos;octet numérique comparaient contre des pointeurs de buffer au lieu de valeurs d&apos;octets (ferme #56).</li>
        <li><strong>Ops bit à bit avec NaN/Infinity</strong> produisent 0 selon la spec ToInt32 (ferme #57).</li>
        <li><strong>Windows x86_64</strong> : cinq correctifs spécifiques à la plateforme — <code>localtime</code>, découverte de <code>clang</code>, et une poignée d&apos;ajustements de codegen — ont ramené Windows x86_64 au vert (v0.5.72).</li>
      </ul>

      <h2>10. Les chiffres</h2>
      <p>
        Le benchmark vedette du billet précédent était <code>factorial</code> à 24,6x plus rapide que Node. Ce chiffre est inchangé. Ce qui a bougé cette semaine, c&apos;est tout ce qui est autour :
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Charge de travail</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (schéma 20 enregistrements)</td><td className="text-right py-2 px-3">547x plus lent que Node</td><td className="text-right py-2 px-3">1,3x plus lent que Node</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (flou 5×5 sur 4K)</td><td className="text-right py-2 px-3">1 980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4,3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Code lourd en propriétés (touche PIC)</td><td className="text-right py-2 px-3">référence</td><td className="text-right py-2 px-3">2–3x</td><td className="text-right py-2 px-3 text-green-400">2–3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1,3x</td></tr>
            <tr><td className="py-2 px-3">Uptime Fastify sous charge</td><td className="text-right py-2 px-3">~60s avant plantage</td><td className="text-right py-2 px-3">indéfini</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        La suite complète de 15 benchmarks contre Node est toujours à 14 victoires et 1 égalité — le même tableau que le billet précédent, avec des chiffres légèrement meilleurs partout. Le vrai mouvement cette semaine est sur les charges de travail qui n&apos;étaient pas dans cette suite : JSON, traitement d&apos;images, serveurs long-running. C&apos;est là que vivaient les écarts, et c&apos;est ce qui s&apos;est fermé.
      </p>

      <h2>11. La suite</h2>
      <p>
        Le seul benchmark que nous poursuivons encore est <code>image_conv</code> vs Zig. Perry est à 457ms ; Zig est à 246ms. Cet écart est architectural, pas au niveau d&apos;une passe d&apos;optimisation, et il vit à trois endroits :
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Locales de buffer typées</strong>. La majeure partie du travail sur Buffer a atterri cette semaine, mais les paramètres de fonction et locales typés buffer se déballent encore à chaque accès. L&apos;approche de slot <code>i64</code> que nous utilisons pour les compteurs de boucle doit s&apos;étendre aux buffers.</li>
        <li><strong>Découpage de boucle intérieur/bordure</strong>. La boucle de flou clampe chaque pixel, y compris les 99,9% de pixels qui n&apos;en ont pas besoin. Découper en régions de bordure (clampées) et intérieur (sans clamp) permet à LLVM de vectoriser l&apos;intérieur avec les <code>ld3</code>/<code>st3</code> NEON.</li>
        <li><strong>Hash FNV-1a à double ABI</strong>. Le helper de hash est appelé via l&apos;ABI NaN-box. Le spécialiser en entrée/sortie i64 brutes pour les chemins chauds représente quelques heures de travail qui se rentabiliseront sur chaque charge de travail lourde en hachage.</li>
      </ol>
      <p>
        Ceux-ci sont suivis dans <code>PERF_ROADMAP.md</code>. Attendez-vous à les voir dans le prochain cycle.
      </p>

      <h2>Pour conclure</h2>
      <p>
        Le motif de cette semaine — 68 releases de correctifs, presque toutes de performance, un écart JSON passant de 547x à 1,3x — est ce qui se produit quand on passe du bon côté de la colline de la bascule LLVM. L&apos;optimiseur est désormais un allié au lieu d&apos;un mur, et la plupart de ce qui reste est du travail petit, spécifique, mesurable : trouver un chemin lent, comprendre pourquoi l&apos;optimiseur ne peut pas voir à travers, exposer la structure, mesurer à nouveau. Aucun de ces commits n&apos;est exotique. Ils sont juste appliqués là où ils sont nécessaires.
      </p>
      <p>
        Si vous voulez essayer tout ça :
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        Source : <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Docs : <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}— Changelog : <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        Issues, reproducteurs et benchmarks qui ne sont pas assez rapides : continuez à les envoyer. Ce rythme ne fonctionne que parce que les rapports de bugs sont assez spécifiques pour se transformer en reproducteurs d&apos;une ligne. Chaque commit dans ce billet a un <code>#N</code> attaché pour une raison.
      </p>
      <p>— Ralph</p>
    </>
  );
}
