export default function Content() {
  return (
    <>
      <p>
        Le dernier billet s&apos;est terminé en <strong>v0.5.174</strong> avec un seul gros titre : Perry remportait enfin chaque benchmark de la suite intégrée face à Node comme à Bun. Trois jours de travail et un arriéré de commits GC + JSON plus tard, Perry est en <strong>v0.5.306</strong> — soit <strong>132 releases de correctifs</strong> — et l&apos;histoire est différente. Le gros titre n&apos;est pas une accélération de 547x ni une nouvelle colonne de victoires. C&apos;est le travail qui rend ces victoires défendables.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Le <strong>GC générationnel</strong> est livré par défaut. Les phases A à D ont atterri entre v0.5.217 et v0.5.237.</li>
        <li>La <strong>Small String Optimization</strong> est livrée par défaut. Les étapes 1.5 → 2 ont atterri en v0.5.213–v0.5.216.</li>
        <li>Le <strong>pipeline JSON</strong> a reçu un parser à base de tape, un parse paresseux, un stringify paresseux, et une matérialisation creuse par élément. Le validate-and-roundtrip par défaut est désormais à <strong>75 ms en médiane</strong> — le meilleur du peloton à typage dynamique.</li>
        <li>La <strong>page benchmarks</strong> est réécrite de bout en bout avec <strong>RUNS=11 médiane + p95 + σ + min + max</strong>, simdjson et AssemblyScript+json-as ajoutés en pairs, sondes d&apos;optimisation séparées des comparaisons réelles, et chaque faiblesse de Perry exposée honnêtement.</li>
      </ul>
      <p>
        Le casting secondaire est un flux régulier de corrections de justesse : FIFO des microtâches Promise, égalité NaN et formatage des nombres ECMAScript, complément à deux pour BigInt, AsyncLocalStorage de bout en bout, runtimes decimal.js + ioredis + commander, et un segfault de JSON.stringify sur f64 brut qui se cachait sous les chemins tape. Et la toolchain Windows passe enfin en mode léger : LLVM + xwin, plus besoin d&apos;installer Visual Studio.
      </p>

      <h2>1. GC générationnel, activé par défaut</h2>
      <p>
        Le GC générationnel a fait l&apos;objet d&apos;un déploiement par étapes pendant deux mois. Le résumé des phases qui se sont conclues dans cette fenêtre :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> — Phase A : échafaudage runtime de la shadow stack, émission push/pop, threading de la slot map, miroir shadow de <code>Let</code>/<code>LocalSet</code>, et le scanner de racines.</li>
        <li><strong>v0.5.222</strong> — Phase B : séparation arène nursery + old-gen.</li>
        <li><strong>v0.5.223–v0.5.225</strong> — Phase C1–C2 : infrastructure runtime de write-barrier, le codegen émet la barrière, chaque store sur le tas y passe.</li>
        <li><strong>v0.5.226–v0.5.228</strong> — Phase C3a–C4 : les racines du remembered-set entrent dans mark + clear ; le minor GC trace saute l&apos;old-gen ; tenuring non-déplaçant.</li>
        <li><strong>v0.5.229–v0.5.236</strong> — Phase C4b α/β/γ/δ : infrastructure de pointeurs de forwarding, passe de pinning + évacuation, scanner + pinning transitif, réécriture des références, blocs de nursery inactifs rendus à l&apos;OS, déclencheur GC plafonné au seuil initial.</li>
        <li><strong>v0.5.237</strong> — Phase D partie 1 : <code>PERRY_GEN_GC=1</code> par défaut.</li>
        <li><strong>v0.5.238</strong> — Phase D partie 2 : <code>PERRY_SHADOW_STACK=1</code> par défaut.</li>
        <li><strong>v0.5.239–v0.5.240</strong> — clôture documentaire : roadmap finalisée, annexe sur la lignée académique + industrielle (Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        La victoire mesurée la plus marquante : <code>test_memory_json_churn</code> est passé de <strong>115 Mo → 91 Mo</strong> de RSS de pointe au moment où le défaut gen-GC a basculé. Les régressions compute étaient petites et listées sans excuse — <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> +1 ms chacun. La sortie de secours (<code>PERRY_GEN_GC=0</code>) récupère les anciens chiffres ; le compromis était délibéré, et la page benchmarks liste maintenant les deux lignes côte à côte pour que le lecteur puisse choisir.
      </p>

      <h2>2. Small String Optimization, activée par défaut</h2>
      <p>
        SSO est une représentation de chaîne inline de 22 octets qui évite l&apos;allocation sur le tas pour les chaînes courtes — les clés JSON typiques (2–8 octets) et les valeurs courtes atterrissent dans la forme inline. Le déploiement était minuscule en surface et énorme sous le capot :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong> : infrastructure SSO (représentation + accesseurs).</li>
        <li><strong>v0.5.214</strong> : armement des consommateurs étape 1 + porte <code>PERRY_SSO_FORCE</code> pour les tests.</li>
        <li><strong>v0.5.215</strong> : codegen étape 1.5, branche à trois voies <code>PropertyGet</code> — fast path pour les chaînes inline, fast path pour les chaînes sur le tas, slow path pour le résiduel.</li>
        <li><strong>v0.5.216</strong> : bascule étape 2 — émettre SSO par défaut.</li>
      </ul>
      <p>
        Les suites en v0.5.279 ont fermé le dernier bug NaN de lecture de propriété qui est apparu une fois SSO actif, et la correction du dispatch de getter chaîné cross-module en v0.5.272 en a fermé un autre. Les deux étaient sur la liste à régler avant la bascule du défaut ; les deux ont été livrés sans régression de perf.
      </p>

      <h2>3. JSON : parse à base de tape, paresseux par défaut</h2>
      <p>
        Le pipeline JSON a reçu la réécriture la plus invasive de la période. Ancien comportement : <code>JSON.parse</code> construisait un arbre entièrement matérialisé de valeurs NaN-boxed. Nouveau comportement : <code>JSON.parse</code> construit une tape de 12 octets par valeur et matérialise paresseusement — seules les valeurs que vous lisez réellement paient le coût de matérialisation. Le stringify sur un parse non muté est maintenant un memcpy de l&apos;entrée d&apos;origine, le même tour de fast-path qu&apos;utilise simdjson avec <code>raw_json()</code>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong> : <code>JSON.parse&lt;T&gt;(blob)</code> parse dirigé par schéma (étape 1). La forme connue à la compilation permet au compilateur d&apos;émettre un accès aux clés pré-résolu.</li>
        <li><strong>v0.5.203</strong> : fondation du parse à base de tape — étape 2 phase 1.</li>
        <li><strong>v0.5.204</strong> : parse paresseux + stringify paresseux — étape 2 phases 2+4.</li>
        <li><strong>v0.5.206</strong> : accès indexé safe en mode paresseux + cas limites — étape 2 phase 3.</li>
        <li><strong>v0.5.208</strong> : matérialisation creuse par élément — étape 2 phase 5b.</li>
        <li><strong>v0.5.209</strong> : curseur de parcours + seuil adaptatif de matérialisation.</li>
        <li><strong>v0.5.210</strong> : bascule du parse paresseux par défaut pour les blobs ≥1 Ko.</li>
      </ul>
      <p>
        Le résultat sur la charge de travail pour laquelle la lazy tape a été conçue (10k enregistrements, blob ~1 Mo, parse → stringify sans itération intermédiaire) :
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementation</th>
              <th className="text-right py-2 px-3">Médiane (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">RSS de pointe</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry à <strong>75 ms en médiane</strong> est le runtime à typage dynamique le plus rapide de la comparaison — bat Bun (259 ms), bat Node (394 ms), bat le JIT serveur de Kotlin (453 ms). simdjson à 24 ms est le plafond C++ accéléré par SIMD et figure sur la page à dessein, pas planqué derrière un cherry-pick. Perry ne le bat pas. L&apos;intérêt est de montrer l&apos;écart pour que sa fermeture ait une cible — suivi dans <code>docs/json-typed-parse-plan.md</code>.
      </p>
      <p>
        Le bench compagnon honnête est <strong>parse-and-iterate</strong> : même blob, mais chaque itération additionne le <code>nested.x</code> de chaque enregistrement, ce qui force la lazy tape à matérialiser. Là Perry atterrit à <strong>466 ms</strong> — plus lent que les 375 ms de la sortie de secours mark-sweep parce que la tape paie un overhead qu&apos;elle ne peut pas amortir. Cette ligne est dans TL;DR §B. Quand on ne peut pas éviter le travail, la lazy tape ne fait pas semblant.
      </p>

      <h2>4. La page benchmarks, réécrite</h2>
      <p>
        Trois choses ont changé dans la façon dont Perry présente les chiffres de performance.
      </p>
      <p>
        <strong>RUNS=11 médiane + p95 + σ + min + max, pas best-of-N.</strong> Best-of-N élimine silencieusement la latence en queue ; sur ce matériel, il dissimulait des outliers Python <code>accumulate</code> à 9,4 secondes et des pics p95 Swift JSON à 5,3 secondes. La médiane remet les queues sur la page. Le changement de méthodologie a atterri en v0.5.248 ; chaque cellule de TL;DR §A et §B est en RUNS=11 fraîche au <strong>2026-04-25</strong>.
      </p>
      <p>
        <strong>Les sondes d&apos;optimisation sont séparées des perfs runtime réelles.</strong> Les cinq cellules qui montrent Perry à 12–34 ms contre Rust/C++ à 98 ms — <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> — mesurent la posture des flags du compilateur, pas le silicium. Elles sont dans leur propre sous-section maintenant, avec un paragraphe au-dessus expliquant que <code>clang++ -O3 -ffast-math</code> les rapproche à une milliseconde près. Le kernel runtime réel en gros titre est <code>loop_data_dependent</code> : Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry est pile dans le peloton sans contrat FMA sur un kernel où le compilateur ne peut véritablement pas faire disparaître le travail. C&apos;est la comparaison honnête.
      </p>
      <p>
        <strong>Pairs ajoutés.</strong> simdjson (4.3.0) est désormais dans les deux tables JSON — le plafond C++ de débit de parse, sur la page pour que le lecteur voie l&apos;écart. AssemblyScript avec json-as (1.3.2) est le pair TS-vers-natif installable le plus proche ; porffor a fait un segfault sur la charge à cette taille, Static Hermes refusait de s&apos;installer sur macOS arm64. Kotlin avec kotlinx.serialization a rejoint le polyglot JSON en v0.5.241–v0.5.242. Chaque ligne est réelle, chaque avertissement est sur la page.
      </p>

      <h2>5. La table compute polyglot</h2>
      <p>
        Les kernels en gros titre véritablement non-foldables, médiane RUNS=11, rafraîchis le 2026-04-25 en v0.5.249 :
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Sur <code>fibonacci</code>, Perry s&apos;aligne avec le peloton compilé à 3–15 ms près. Le JIT HotSpot de Java est ~11% plus rapide grâce à l&apos;inlining de l&apos;appel récursif. Sur <code>loop_data_dependent</code>, le kernel se scinde en deux clusters de contrat FP : le peloton à contrat FMA à ~128 ms (Go par défaut, <code>g++ -O3</code> sur Apple Clang — les deux fusionnent <code>sum * a + b</code> en un seul FMADDD) et le peloton sans contrat à 229–235 ms (Perry, Rust par défaut, Swift, Java sans <code>-XX:+UseFMA</code>, Bun) qui exécutent FMUL + FADD scalaires. LLVM s&apos;aligne avec le peloton FMA via <code>-ffp-contract=fast</code> ; Perry ne l&apos;active pas par défaut. <code>nested_loops</code> est borné par le cache, pas par le compute ; tout le monde atterrit à 8–21 ms.
      </p>

      <h2>6. Toolchain Windows, légère</h2>
      <p>
        Les utilisateurs Windows n&apos;ont plus besoin d&apos;une installation Visual Studio. La <strong>v0.5.199</strong> a fermé <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a> : <code>perry setup windows</code> + winget LLVM + xwin remplace l&apos;arbre BuildTools VS au complet. La <code>v0.5.201</code> a supprimé la cfg gate sur <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> pour que la découverte de chemin fonctionne sur chaque plateforme qui cible Windows, pas seulement les hôtes macOS.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Passe de justesse runtime</h2>
      <p>
        Un thème de la période : les divergences runtime silencieuses avec V8/JSC sont devenues soit des corrections, soit des erreurs de compilation. Les non-triviales :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong> : <code>BigInt.fromTwos</code>/<code>toTwos</code> complément à deux.</li>
        <li><strong>v0.5.263</strong> : <code>Promise.all</code>/<code>race</code>/<code>any</code> discrimination de type non-promise.</li>
        <li><strong>v0.5.281</strong> : <code>NaN==NaN</code> + formatage de nombres ECMAScript (<code>3 → &quot;3&quot;</code>, pas <code>&quot;3.0&quot;</code> ; <code>-0 → &quot;0&quot;</code> ; etc.).</li>
        <li><strong>v0.5.280</strong> : coercition ToInt32 de <code>NaN</code>/<code>Infinity</code> dans <code>(x) | 0</code>.</li>
        <li><strong>v0.5.284</strong> : FIFO des microtâches Promise + propagation des handlers qui throw.</li>
        <li><strong>v0.5.286</strong> : <code>JSON.stringify</code> d&apos;un f64 brut faisait un segfault sous les chemins tape.</li>
        <li><strong>v0.5.277</strong> : <code>fs.readFileSync</code> retourne Buffer quand aucun encodage n&apos;est passé (correspond à Node).</li>
        <li><strong>v0.5.272</strong> : le dispatch de getter chaîné cross-module retournait <code>undefined</code>.</li>
      </ul>
      <p>
        Suites stdlib pour l&apos;issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> remplies : AsyncLocalStorage de bout en bout (v0.5.261), runtime commander + codegen invoquant réellement <code>.action()</code> (v0.5.250), code decimal.js (v0.5.259), Redis ioredis de bout en bout (v0.5.270), pattern async-factory pg + mongo (v0.5.275), et le même bug d&apos;async-factory sur EE/LRU/WSS (v0.5.252).
      </p>
      <p>
        Côté <code>perry/ui</code> : callback de tap sur notification (#97) câblé sur Apple (v0.5.254) et Android (v0.5.258) ; planification + annulation des notifications locales (#96, v0.5.244) ; enregistrement + réception FCM sur Android (v0.5.262).
      </p>

      <h2>8. Pour conclure</h2>
      <p>
        Le motif de cette période n&apos;est pas dans des chiffres en gros titre. C&apos;est le travail qui fait que les victoires existantes survivent à l&apos;examen : un GC générationnel qui rattrape les charges à allocation soutenue, une SSO qui ferme l&apos;écart de coût des chaînes courtes, un pipeline JSON qui exploite la structure « sans modification » de la charge la plus courante, et une page benchmarks qui mesure des médianes au lieu de best-of-N et qui montre le plafond de parse simdjson à 24 ms sur la même ligne que les 75 ms de Perry. Le lecteur voit l&apos;écart — et où Perry se situe par rapport au plancher.
      </p>
      <p>
        Essayez-le :
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        Source : <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Benchmarks : <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}— Changelog : <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
