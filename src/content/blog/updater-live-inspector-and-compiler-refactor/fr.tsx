export default function Content() {
  return (
    <>
      <p>
        Le précédent billet s&apos;est arrêté à <strong>v0.5.306</strong> sur l&apos;histoire gen-GC + JSON + benchmarks. Quatre jours plus tard, Perry est en <strong>v0.5.359</strong> — soit <strong>53 patch releases</strong> — et l&apos;histoire est encore différente. Aucune de ces releases n&apos;est un titre à coups de chiffres de benchmark. Presque toutes sont des <strong>issues du tracker qui se ferment</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> arrive — auto-update façon Sparkle/Tauri pour les apps desktop (Ed25519 sur un digest SHA-256, sentinel-rollback, relancement détaché). PR communautaire de <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand Phase D</strong> — un inspector live à <code>http://localhost:7676</code> avec arbre des widgets, détail par widget, dispatch de clic et édition de style en direct via <code>POST /style/:h</code>.</li>
        <li><strong>Le refactor du compilateur.</strong> Sur v0.5.329 → v0.5.343, les quatre fichiers les plus cités ont été découpés : <code>lower::lower_expr</code> 6 687 → 624 LOC (−91 %), <code>compile.rs</code> 9 391 → 3 783 LOC (−60 %), <code>lower.rs</code> 13 591 → 7 554 LOC (−44 %), <code>lower_call.rs</code> 7 000+ → 4 681 LOC (−33 %). Le nouveau <code>walker.rs</code> transforme la classe de bug du catch-all <code>_ =&gt; {}</code> en erreur de compilation.</li>
        <li><strong>Le styling UI Phase C boucle</strong> — props inline <code>style: {`{ ... }`}</code> sur chaque widget, sur Apple, Android, GTK4, Windows et Web. Windows obtient 4 stubs sur 5 câblés (decoration / opacity / borders) ; il ne reste que <code>widget.shadow</code> (suite à venir avec DirectComposition).</li>
        <li><strong>Un bucket Scoop</strong> pour Windows : <code>scoop install perry-ts/perry</code>. Sidecars SHA-256 dans le workflow de release.</li>
        <li><strong>Vague de fixes d&apos;issues communautaires</strong> — environ 30 issues fermées sur runtime, codegen, fetch, GTK4, linker Windows, async et stdlib.</li>
      </ul>

      <h2>1. perry/updater — auto-update pour apps desktop</h2>
      <p>
        Avant ce fix, Perry n&apos;avait aucune voie de mise à jour. Les apps étaient publiées, et puis voilà. <strong>TheHypnoo</strong> a ouvert <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> avec toute l&apos;histoire :
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback si le précédent lancement a crashé

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // à appeler après que le nouveau build a démarré correctement`}</code></pre>
      <p>
        Modèle de confiance : <strong>Ed25519 sur le digest SHA-256 du fichier</strong> (pas sur les octets du fichier — la vérification reste bon marché sur les gros binaires). Le manifest est en JSON, versionné par schéma, une entrée par triplet <code>&lt;os&gt;-&lt;arch&gt;</code>. Installation atomique avec backup <code>&lt;exe&gt;.prev</code>, relancement détaché (<code>setsid</code> sur Unix, <code>DETACHED_PROCESS</code> sur Windows). Le mobile est exclu par design — App Store / Play Store contrôlent l&apos;installation au niveau OS.
      </p>
      <p>
        Deux particularités du runtime Perry sont apparues en écrivant le smoke test, et ont été fixées dans la foulée :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> renvoyait un stub de métadonnées seules.</strong> Fixé dans <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (encore TheHypnoo) — <code>js_response_array_buffer</code> alloue désormais un vrai <code>BufferHeader</code> et <code>memcpy</code> <code>resp.body</code> dedans.</li>
        <li><strong><code>fs.appendFileSync</code> écrivait 0 octet.</strong> Fixé dans <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — le chemin de lowering namespace-import (<code>import * as fs from &quot;fs&quot;</code>) n&apos;avait pas de bras pour <code>appendFileSync</code>, et le codegen LLVM n&apos;avait pas non plus de bras pour la variante HIR. Les deux désormais câblés.</li>
      </ul>
      <p>
        La documentation vit dans <code>docs/src/updater/overview.md</code>.
      </p>

      <h2>2. Geisterhand : inspector live à localhost:7676</h2>
      <p>
        Geisterhand a été le harnais de tests UI in-process de Perry — une API HTTP sur le port 7676 pour snapshotter l&apos;état des widgets et dispatcher des clics. La Phase D le transforme en inspector style devtools que l&apos;on peut ouvrir depuis n&apos;importe quel navigateur.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Étape 1 (v0.5.349)</strong> — <code>GET /</code> sert une UI vanilla-JS mono-page avec arbre des widgets, détail par widget (frame, value, raw JSON), auto-refresh de 1,5 s avec pause/reprise, et un bouton « tirer onClick ». Le codegen épingle <code>INSPECTOR_HTML</code> contre le lazy-load <code>-dead_strip</code> de macOS pour qu&apos;il survive aux release builds.</li>
        <li><strong>Étape 2 (v0.5.350)</strong> — <code>POST /style/:h</code> prend un sac de props JSON et l&apos;applique en direct. 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) traversent du thread HTTP → thread principal via la pump-queue existante. JSON invalide → 400 ; handle invalide → 400 ; les props inconnues sont filtrées côté serveur et la réponse liste celles qui sont passées.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        Le dispatcher macOS est câblé ; Linux / Windows / iOS / tvOS / visionOS / Android suivent le même schéma et sont les prochains.
      </p>

      <h2>3. Le refactor du compilateur — découper les quatre plus gros fichiers</h2>
      <p>
        Cinq issues du tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, plus une longue queue) avaient la même forme : une nouvelle variante d&apos;<code>Expr</code> ajoutée à <code>ir.rs</code>, mais l&apos;un des quatre walkers ad-hoc dans <code>lower.rs</code> avait un catch-all <code>_ =&gt; {}</code> et compilait silencieusement la nouvelle variante de travers. Attraper ça à l&apos;exécution coûte cher — parfois invisible, parfois un SIGSEGV sous SSO.
      </p>
      <p>
        <strong>v0.5.329</strong> a introduit <code>crates/perry-hir/src/walker.rs</code> avec <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — matches exhaustifs sur les 178 variantes d&apos;<code>Expr</code>, <strong>pas de catch-all</strong>. Ajouter une nouvelle variante sans la lister ici devient une erreur de compilation. Les quatre consommateurs (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) ont fondu :
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Fonction</th>
              <th className="text-right py-2 px-3">Avant</th>
              <th className="text-right py-2 px-3">Après</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90 %</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84 %</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Total : <strong>−1 830 lignes de descente dupliquée</strong>, remplacées par <strong>+1 840 lignes d&apos;un walker centralisé</strong> — net plat, mais la classe de bug disparaît.
      </p>
      <p>
        Cela a débloqué le reste. <strong>v0.5.331 → v0.5.343</strong> ont taillé les quatre monolithes sur 14 commits. Les chiffres de couverture :
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Fichier</th>
              <th className="text-right py-2 px-3">Avant</th>
              <th className="text-right py-2 px-3">Après</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6 687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9 391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3 783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60 %</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13 591</td><td className="text-right py-2 px-3">7 554</td><td className="text-right py-2 px-3">−44 %</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7 000+</td><td className="text-right py-2 px-3">4 681</td><td className="text-right py-2 px-3">−33 %</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Le découpage a atterri sous forme de 19 nouveaux sous-modules ciblés : <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, plus une nouvelle crate <code>crates/perry-dispatch</code> devenue la source unique de vérité pour les tables de méthodes UI / system / i18n (le fan-out <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> qui causait les surprises &laquo; compile sur macOS, casse sur web &raquo; de l&apos;issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> est désormais un seul lookup).
      </p>
      <p>
        <strong>Les wins perf de Tier 4</strong> ont accompagné (v0.5.335–v0.5.336) :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Fusion de deux passes dans <code>inline_functions</code> et de trois passes rayon dans <code>compile.rs</code> — économise 5 scans de module + 3 allers-retours du scheduler par compilation.</li>
        <li>Borné le parse cache de <code>perry dev</code> à 500 entrées, eviction FIFO. Avant le fix, une session traversant <code>node_modules</code> pouvait retenir plus de 100 Mo d&apos;AST SWC.</li>
        <li>Parallélisation de la boucle d&apos;écriture <code>.ll</code> post-codegen — wall-time 2–4× plus rapide sur SSD avec 50+ modules.</li>
        <li><code>Arc&lt;I18nTable&gt;</code> au lieu de cloner la table de locales par worker.</li>
      </ul>
      <p>
        Les tests workspace sont restés à <strong>434 passed / 0 failed / 5 ignored</strong> à chaque commit ; gap tests à la baseline 25/28 ; doc-tests à la baseline 80/82.
      </p>

      <h2>4. UI styling Phase C, terminée</h2>
      <p>
        La Phase C était le rollout de <code>style: {`{ ... }`}</code> inline. Les étapes 1–7 ont fermé dans cette fenêtre :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — surface de type <code>StyleProps</code> + <code>style:</code> inline sur Button.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — destructure inline color/padding/shadow sur chaque widget de table, puis VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — chaînes hex + dégradé + <code>parseColor</code> runtime pour les valeurs dynamiques.</li>
        <li><strong>v0.5.312</strong> — docs de styling + issue de tracking Windows.</li>
      </ul>
      <p>Puis la passe cross-platform :</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 4 FFIs de styling câblés, plus 7 FFIs manquants qui bloquaient la porte des doc-tests Linux (v0.5.322).</li>
        <li><strong>macOS</strong> (v0.5.324) — plomberie d&apos;ombre <code>CALayer</code> pour <code>widget.shadow</code> + infrastructure visual_test ; sondage de classe <code>set_color</code> pour les widgets non-<code>NSTextField</code>.</li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button <code>color: ...</code> tapait <code>setTextColor:</code> sur <code>UIButton</code>, qui n&apos;implémente pas ce sélecteur ; le panic <code>objc2</code> traversait une frontière <code>extern &quot;C&quot;</code> et le processus s&apos;abortait. Fixé via le même pattern de sondage de classe que macOS — UIButton route maintenant via <code>setTitleColor:forState:UIControlStateNormal</code>.</li>
        <li><strong>Windows</strong> (v0.5.347) — 4 stubs de styling sur 5 câblés (<code>text.decoration</code> via round-trip <code>LOGFONT</code>, <code>widget.opacity</code> via <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders via <code>SetWindowSubclass</code> + <code>WM_PAINT</code>). Il ne reste que <code>widget.shadow</code> (nécessite DirectComposition).</li>
      </ul>
      <p>
        La matrice de styling dans <code>docs/src/ui/styling-matrix.md</code> termine la fenêtre avec <strong>Web à 43/43 Wired</strong>, <strong>Windows à 42/43 Wired</strong>, le reste en couverture complète.
      </p>

      <h2>5. La passe de correction du runtime — issue par issue</h2>
      <p>
        Un thème de la période : chaque miscompile entré par le tracker s&apos;est terminé en fix ou en erreur de compilation. Les points saillants :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — les méthodes de classe à l&apos;intérieur de <code>fn</code> ne pouvaient pas capturer les locals de la fn englobante. Les repros multi-modules correspondent maintenant à Node octet par octet.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — unboxing de string-handle SSO-safe sur 7 sites à opérande string : <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, input de digest crypto. Avant le fix, chacun rendait silencieusement du garbage ou faisait SIGSEGV sur des opérandes string inline.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — les arrays vides <code>const</code> au niveau module perdaient les écritures <code>arr[i]=</code> depuis l&apos;intérieur des fonctions. Apparu quand <code>discoverLevels()</code> de Bloom-Engine/jump remplissait <code>LEVEL_FILES</code> au niveau module via index-assign et l&apos;écran de sélection de niveau s&apos;affichait vide.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> depuis l&apos;intérieur d&apos;une fonction async était silencieusement plafonné à 16 éléments quand l&apos;array entrait en paramètre. Les fonctions async ne sont pas inlinées ; la réallocation rendait un nouveau pointeur que l&apos;appelant ne voyait jamais. Fix : installer un pointeur de forwarding à l&apos;ancienne position à chaque croissance, en réutilisant le mécanisme <code>GC_FLAG_FORWARDED</code> existant du GC.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — le dispatch des paramètres par défaut de méthode passait du garbage quand les appelants omettaient des args en queue. Deux contributeurs : les declares de méthode cross-module hardcodaient 6 doubles au lieu d&apos;<code>arity + 1</code>, et <code>lower_class_method</code> n&apos;appelait pas du tout <code>build_default_param_stmts</code>. Apparu dans <code>findOne(filter, options = {`{}`})</code> de mongodb se bloquant en silence ; le fix est uniforme entre dispatch local et cross-module.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — trois bugs indépendants fetch + promise depuis un seul repro : api.github.com renvoyait 403 en anonyme (User-Agent par défaut désormais positionné), <code>.then(console.log)</code> se bloquait pour toujours (les callbacks null ne poussaient pas d&apos;entrées dans la TASK_QUEUE), chaque rejet de fetch imprimait <code>Uncaught exception: [object Object]</code> (<code>*StringHeader</code> nu NaN-boxé au lieu d&apos;un vrai <code>ErrorHeader</code>).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — vrai <code>Blob</code> avec méthodes d&apos;instance <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code>. Avant le fix, <code>await response.blob()</code> rendait un stub de métadonnées seules <code>{`{size, type}`}</code>. Fix en trois parties atterrissant sur runtime + HIR + codegen.</li>
      </ul>
      <p>Plus les petits rattrapages :</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup sur-élaguait les monomorphisations génériques sous Linux + silent-fallback du link GTK4. Fix : remplacer le filtrage par pattern de nom par une comparaison d&apos;<strong>ensemble de symboles</strong> via <code>llvm-nm</code>. Les membres avec ne serait-ce qu&apos;un symbole unique sont conservés. <code>libperry_ui_macos.a</code> élagué de 196 → 35 objets sans erreurs de link.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — <code>secur32.lib</code> ajouté à la ligne de link Windows.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> round-trip FP via Ryū.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — codegen dispatch câblé pour les wrappers de format <code>perry/i18n</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — codegen dispatch <code>perry/plugin</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — widget Canvas via le codegen LLVM.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView via le codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — widget Table via le codegen.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (partiel) — 11 bras de dispatch d&apos;helpers stdlib.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — réception en arrière-plan des notifications sur iOS + Android (warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — fallbacks faibles pour les hooks FFI de game-loop watchOS.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — hooks de dispose <code>using</code> / <code>await using</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — alloca des args de <code>js_native_call_method</code> remontée au bloc d&apos;entrée.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — bras Uint8Array de <code>substitute_locals</code>.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code> câblé de bout en bout (PR communautaire).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        L&apos;histoire de la toolchain Windows continue de se simplifier. <strong>v0.5.353</strong> a épinglé <code>clang -target</code> sur les builds host — clang non-MSVC dans le PATH (MinGW / MSYS2 / Anaconda / bundles GNU de Rust) réécrivait silencieusement l&apos;IR <code>x86_64-pc-windows-msvc</code> de Perry vers <code>windows-gnu</code>, et lld-link ne pouvait pas résoudre la référence <code>__main</code> que l&apos;émetteur mingw32 de LLVM insérait. Le nouveau <code>probe_clang_default_triple</code> exécute <code>clang --version</code> une fois par processus et imprime une seule note informative quand le default du host est GNU mais qu&apos;on cible MSVC. Supprimer avec <code>PERRY_NO_CLANG_PROBE=1</code>.
      </p>
      <p>
        <strong>v0.5.345</strong> a aligné l&apos;ABI <code>perry-ui</code> Win64 avec <code>perry-dispatch</code> — trois signatures extern runtime avaient dérivé (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Sur ABI Win64, les args positionnels entiers et flottants partagent les indices de slot, donc un mismatch lit du garbage depuis des registres non-initialisés. SysV (macOS / Linux) utilise des pools de registres int/float séparés et faisait par hasard atterrir des bits valides — crash uniquement Windows, fixé sur les 8 crates de plateforme perry-ui-*.
      </p>
      <p>
        Puis : <strong><code>scoop install perry-ts/perry</code></strong>. Manifest épinglé à v0.5.345 (avec <code>depends: main/llvm</code> pour tirer automatiquement le LLVM officiel default-MSVC). Le workflow de release émet désormais des sidecars <code>&lt;artifact&gt;.sha256</code> à côté de chaque archive, au format compatible <code>sha256sum</code> pour tout bumper de package manager downstream.
      </p>
      <pre><code>{`# Host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. Pour conclure</h2>
      <p>
        Le motif de cette période est l&apos;engagement communautaire plus l&apos;hygiène interne. <strong>TheHypnoo</strong> a livré trois PRs significatifs (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> câblage de <code>fs.appendFileSync</code>, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> octets de body de <code>response.arrayBuffer</code>). Le tracker s&apos;est vidé d&apos;environ 30 issues. Le compilateur a perdu 60 % sur son plus gros fichier et a poussé un walker exhaustif qui transforme « j&apos;ai oublié de mettre à jour l&apos;un des quatre walkers ad-hoc » d&apos;un miscompile runtime en erreur <code>cargo build</code>. Le styling UI a atteint la parité sur chaque plateforme desktop sauf les ombres sous Windows. Geisterhand a obtenu une surface devtools navigateur. Le chemin d&apos;installation Windows s&apos;est raccourci d&apos;une commande.
      </p>
      <p>Essayez :</p>
      <pre><code>{`# npm (toute plateforme)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update pour apps desktop
npm install @perry/updater

# Inspector live
perry compile main.ts -o app --enable-geisterhand
./app &  # puis ouvrez http://localhost:7676`}</code></pre>
      <p>
        Source : <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues : <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog : <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
