import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0 est la plus grande version depuis le début du projet. Trois sauts de version en un seul cycle — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — et le compilateur lui-même est désormais parallèle. Voici tout ce qui a été livré.
      </p>

      <h2>Vrai multi-threading</h2>
      <p>
        Perry dispose désormais d&apos;un vrai parallélisme basé sur les threads du système d&apos;exploitation. Pas de web workers avec surcharge de sérialisation. Pas de <code>SharedArrayBuffer</code> avec <code>Atomics</code>. De vrais threads — des threads OS légers avec une pile de 8 Mo qui ne partagent rien et ne coûtent rien au repos.
      </p>
      <p>
        Le nouveau module <code>perry/thread</code> expose trois primitives :
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Répartir le travail sur tous les cœurs CPU, résultats dans l'ordre
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filtrer en parallèle
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Lancer un thread en arrière-plan, obtenir une Promise
const result = await spawn(() => {
  // s'exécute sur un thread OS séparé
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> et <code>parallelFilter</code> détectent automatiquement le nombre de cœurs CPU et répartissent le tableau d&apos;entrée entre eux. Pour les petits tableaux, le threading est complètement ignoré et l&apos;exécution est synchrone — aucune surcharge pour les charges de travail triviales.
      </p>
      <p>
        <code>spawn</code> lance un thread OS en arrière-plan et retourne une Promise. Le résultat revient via une file de résultats en attente qui est vidée pendant le traitement des microtâches, ce qui permet de l&apos;utiliser avec <code>await</code> comme toute autre opération asynchrone.
      </p>

      <h3>Sécurité à la compilation</h3>
      <p>
        La partie la plus importante n&apos;est pas l&apos;API — c&apos;est ce que le compilateur <em>empêche</em>. Perry rejette statiquement les closures qui capturent des variables mutables :
      </p>
      <pre><code>{`let counter = 0;

// ✗ Erreur de compilation : closure capture la variable mutable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejeté à la compilation
  return item * 2;
});`}</code></pre>
      <p>
        Pas d&apos;état mutable partagé signifie pas de courses de données. Pas de verrous, pas de mutex, pas d&apos;<code>Atomics</code>. Le compilateur impose la sécurité des threads avant qu&apos;une seule ligne de code machine ne soit émise.
      </p>

      <h3>Sous le capot</h3>
      <p>
        Chaque thread worker obtient sa propre arène mémoire avec nettoyage <code>Drop</code> — pas de coordination GC entre les threads. Les valeurs sont transférées via une copie profonde <code>SerializedValue</code> : coût nul pour les nombres, O(n) pour les chaînes, tableaux et objets. L&apos;implémentation tient dans un seul fichier Rust de 1 120 lignes (<code>perry-runtime/src/thread.rs</code>) et n&apos;a nécessité aucune modification du ramasse-miettes.
      </p>
      <p>
        À comparer avec les isolats V8, qui nécessitent des heaps séparés par worker avec ~2 Mo de surcharge chacun. Les threads de Perry sont simplement des pthreads avec des arènes.
      </p>

      <h3>Pipeline de compilation parallèle</h3>
      <p>
        Le compilateur lui-même est désormais parallèle aussi. La génération de code des modules, les passes de transformation (imports JS, instances natives, monomorphisation) et le scan de symboles <code>nm</code> s&apos;exécutent sur tous les cœurs CPU via rayon. Combiné avec la mise à niveau vers Cranelift 0.121 (depuis 0.113 — huit versions mineures d&apos;allocation de registres et d&apos;améliorations x64), la compilation est nettement plus rapide.
      </p>

      <h2>i18n à la compilation (v0.3.0)</h2>
      <p>
        Le système d&apos;internationalisation de Perry est sans cérémonie. Les littéraux de chaîne dans les widgets d&apos;interface sont automatiquement traités comme des clés localisables. Les fichiers de traduction sont du JSON plat dans un répertoire <code>locales/</code>. Toute la validation se fait à la compilation.
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Votre code — utilisez les chaînes normalement
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        Le compilateur valide tout : traductions manquantes, décalages de paramètres, erreurs de formes plurielles. Les traductions sont intégrées dans le binaire sous forme de table de chaînes 2D embarquée avec une recherche quasi nulle à l&apos;exécution — pas d&apos;analyse JSON au démarrage.
      </p>

      <h3>Ce qui est inclus</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Règles de pluriel CLDR</strong> pour plus de 30 locales avec les suffixes <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code></li>
        <li><strong>Wrappers de format</strong> : <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>Détection native de la locale</strong> sur toutes les plateformes : <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI : scanne les fichiers TS/TSX, génère et met à jour les fichiers JSON de locale</li>
        <li><strong>Génération de ressources natives par plateforme</strong> : répertoires iOS <code>.lproj</code> et Android <code>values-xx/</code></li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> pour localiser les chaînes hors interface</li>
      </ul>
      <p>
        Configuration dans <code>perry.toml</code> :
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>Apps watchOS natives (v0.3.2)</h2>
      <p>
        Perry compile désormais pour watchOS — la 9e cible de compilation. Ce n&apos;est pas un wrapper ni une app companion. C&apos;est un binaire watchOS autonome avec une interface SwiftUI native.
      </p>
      <p>
        Le moteur de rendu watchOS utilise une <strong>approche pilotée par les données</strong> : Perry construit un arbre d&apos;interface via les appels FFI <code>perry_ui_*</code>, et un fichier <code>PerryWatchApp.swift</code> fourni interroge l&apos;arbre et rend les vues SwiftUI de manière réactive. 15 types de widgets sont supportés avec des stubs pour ceux non supportés.
      </p>
      <pre><code>{`# Compiler pour watchOS
perry compile main.ts --target watchos

# Exécuter sur le simulateur Apple Watch
perry run watchos

# Configurer la signature pour watchOS
perry setup watchos`}</code></pre>
      <p>
        Le flux complet fonctionne : <code>perry setup watchos</code> partage les identifiants App Store Connect avec iOS, <code>perry run watchos</code> détecte automatiquement les simulateurs Apple Watch, et <code>perry publish watchos</code> soumet à l&apos;App Store.
      </p>
      <p>
        Cela porte également le nombre total de <strong>cibles de widgets à quatre</strong> : iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) et Wear OS (Tiles). Chacun a sa propre cible de compilation et son backend de génération de code.
      </p>

      <h2>APIs audio et caméra</h2>
      <p>
        Deux nouvelles APIs matérielles sont livrées dans cette version :
      </p>
      <h3>Capture audio (<code>perry/system</code>)</h3>
      <p>
        Capture audio multiplateforme avec mesure dB(A) pondérée A :
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) avec lissage EMA
const waveform = audioGetWaveformSamples();  // buffer circulaire de 256 échantillons
audioStop();`}</code></pre>
      <p>
        Backends par plateforme : AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).
      </p>
      <h3>Capture caméra (<code>perry/ui</code>)</h3>
      <p>
        Aperçu caméra natif avec échantillonnage de couleur au niveau du pixel (iOS) :
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // moyenne 5x5`}</code></pre>

      <h2>Paquets de l&apos;écosystème</h2>
      <p>
        Deux paquets natifs de première partie ont été lancés :
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — Bindings de notifications push pour iOS/macOS : demandes de permission, récupération de token APNs, compteur de badges. Stub Android avec FCM prévu.</li>
        <li><strong>perry/storekit</strong> — Bindings d&apos;achats in-app StoreKit 2 : chargement de produits, achats avec reçus JWS, vérification d&apos;abonnements, restauration et écouteurs de transactions.</li>
      </ul>
      <p>
        Les deux suivent la même architecture : déclarations TypeScript → crate FFI Rust → pont Swift. Installer comme dépendance, importer les fonctions, <code>await</code> les résultats. Le compilateur gère tout le pontage natif.
      </p>

      <h2>Infrastructure</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — huit versions mineures d&apos;allocation de registres, corrections x64 et améliorations d&apos;alignement des slots de pile</li>
        <li><strong>Découpage de fonctions Windows</strong> — découpe automatiquement les fonctions de plus de 50 instructions en continuations pour contourner les problèmes de codegen Cranelift sur Windows</li>
        <li><strong>Chargement sélectif des variables de module</strong> — ne charge que les variables de niveau module référencées à l&apos;entrée de fonction, réduisant la taille du binaire Windows de 26 %</li>
        <li><strong>Amélioration d&apos;Array.sort()</strong> — du tri par insertion O(n²) au tri hybride TimSort O(n log n)</li>
        <li><strong>perry run android</strong> — pipeline complet de compilation APK : compilation, génération de projet Gradle, assembleDebug, installation, lancement</li>
        <li><strong>Entrées Info.plist personnalisées</strong> — <code>[ios.info_plist]</code> dans perry.toml pour les descriptions de confidentialité, schémas d&apos;URL, modes d&apos;arrière-plan</li>
      </ul>

      <h2>En chiffres</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Version</strong> : 0.2.197 → 0.4.0 (trois jalons majeurs)</li>
        <li><strong>Cibles de compilation</strong> : 8 → 9 (ajout de watchOS)</li>
        <li><strong>Cibles de widgets</strong> : 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>Nouveaux crates</strong> : perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>Nouvelle documentation</strong> : threading (4 pages), i18n (4 pages), watchOS, docs widgets étendus (3 → 8 pages)</li>
        <li><strong>Implémentation de perry/thread</strong> : 1 120 lignes de Rust, zéro modification du GC</li>
      </ul>

      <h2>Et ensuite</h2>
      <p>
        La fondation du threading ouvre de nombreuses possibilités : traitement parallèle des requêtes HTTP, opérations de fichiers concurrentes et charges de travail lourdes en calcul qui étaient auparavant bloquées par l&apos;exécution mono-thread. Côté langage, le support complet des regex reste la plus grande lacune, et l&apos;expansion de <code>perry/ui</code> (glisser-déposer, accessibilité, DatePicker) continue.
      </p>
      <p>
        Suivez la progression sur{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, lisez la documentation sur{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, ou consultez la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">feuille de route</Link>
        {" "}pour le tableau complet.
      </p>
    </>
  );
}
