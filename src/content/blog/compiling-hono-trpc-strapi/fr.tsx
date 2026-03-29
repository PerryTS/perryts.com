export default function Content() {
  return (
    <>
      <p>
        Perry compile désormais trois frameworks TypeScript majeurs — Hono, tRPC et Strapi — en exécutables natifs ARM64. Ils compilent en moins d&apos;une seconde, produisent des binaires de moins de 2 Mo et s&apos;exécutent sans crash.
      </p>
      <p>Cet article couvre ce qui fonctionne, ce qui ne fonctionne pas encore et ce que nous avons appris en poussant le compilateur contre du code réel.</p>

      <h2>Les projets</h2>
      <p>Nous avons choisi ces trois parce qu&apos;ils représentent différentes formes de TypeScript :</p>
      <ul className="list-disc list-inside">
        <li><strong>Hono</strong> — Un framework web léger (29 modules). Usage intensif de génériques, héritage de classes, assignation dynamique de méthodes et des APIs web <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>. Sa structure d&apos;export utilise des ré-exports nommés à travers des fichiers barrel.</li>
        <li><strong>tRPC</strong> — Un framework RPC typé (52 modules). Chaînes de ré-export profondes sur 4+ niveaux, pattern builder avec rétrécissement de type générique, instanciation de classes au niveau module et streaming via Web Streams.</li>
        <li><strong>Strapi</strong> — Un cœur de CMS headless (4 modules compilés nativement, le reste résolu comme externe). Monorepo avec résolution de packages workspace, ré-exports de namespace (<code className="text-perry-400">export * as X</code>), pattern de conteneur de services avec <code className="text-perry-400">Map</code> et fonctions factory.</li>
      </ul>

      <h2>Résultats de compilation</h2>
      <p>Les trois compilent en binaires natifs avec zéro erreur de compilation :</p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Projet</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Modules compilés</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Taille du binaire</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Temps de compilation</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">Hono</td><td className="py-3 px-4 text-slate-400">29</td><td className="py-3 px-4 text-slate-400">1.6 Mo</td><td className="py-3 px-4 text-slate-400">0.59s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">tRPC</td><td className="py-3 px-4 text-slate-400">52</td><td className="py-3 px-4 text-slate-400">1.8 Mo</td><td className="py-3 px-4 text-slate-400">0.97s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-3 px-4 text-slate-300">Strapi</td><td className="py-3 px-4 text-slate-400">4</td><td className="py-3 px-4 text-slate-400">1.9 Mo</td><td className="py-3 px-4 text-slate-400">0.80s</td></tr>
          </tbody>
        </table>
      </div>
      <p>Chaque module source passe par le pipeline complet : analyse SWC, abaissement HIR, codegen Cranelift, émission de fichier objet et liaison native. Les temps de compilation incluent tout — de l&apos;analyse à la liaison finale.</p>
      <p>Pour contexte, <code className="text-perry-400">tsc --noEmit</code> seul sur tRPC prend plusieurs secondes. Perry compile 52 modules en un binaire natif lié en moins d&apos;une.</p>

      <h2>Ce qui fonctionne à l&apos;exécution</h2>
      <h3>Instanciation de classes inter-modules</h3>
      <p>C&apos;était le grand jalon. La structure d&apos;export de Hono ressemble à :</p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500"><div className="w-3 h-3 rounded-full bg-red-500/50" /><div className="w-3 h-3 rounded-full bg-yellow-500/50" /><div className="w-3 h-3 rounded-full bg-green-500/50" /><span className="ml-2 text-xs">hono export chain</span></div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>Cet <code className="text-perry-400">export {"{"} Hono {"}"}</code> est un ré-export nommé — pas <code className="text-perry-400">export * from</code> ni <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code>. Dans la HIR de Perry, cela devient <code className="text-perry-400">Export::Named</code>. Auparavant, la propagation de classes du compilateur ne suivait que les chaînes <code className="text-perry-400">ExportAll</code> et <code className="text-perry-400">ReExport</code>. Désormais Perry trace <code className="text-perry-400">Export::Named</code> à travers les imports du module pour trouver la définition de classe originale et la propager.</p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>

      <h3>Résolution de ré-export multi-niveaux</h3>
      <p>Le <code className="text-perry-400">initTRPC</code> de tRPC vit à 4 niveaux de profondeur :</p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>C&apos;est <code className="text-perry-400">ExportAll</code> → <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>. Perry résout la chaîne complète.</p>

      <h3>Filtrage des exports type-only</h3>
      <p>Perry vérifie désormais le flag <code className="text-perry-400">type_only</code> de SWC sur les déclarations <code className="text-perry-400">ExportNamed</code> et <code className="text-perry-400">is_type_only</code> sur les spécificateurs individuels, les sautant lors de l&apos;abaissement HIR. Cela a éliminé la génération de stubs morts à partir des ré-exports de types dans les trois projets.</p>

      <h2>Ce qui ne fonctionne pas encore</h2>
      <p>Nous sommes précis ici car les lacunes en disent autant que les succès.</p>

      <h3>Assignation dynamique de propriétés sur <code className="text-perry-400">this</code></h3>
      <p>Perry ne supporte pas encore <code className="text-perry-400">this[variable] = value</code>, donc les méthodes HTTP de Hono comme <code className="text-perry-400">app.get</code>, <code className="text-perry-400">app.post</code> ne sont pas disponibles. C&apos;est la plus grande lacune pour Hono.</p>

      <h3>Appels de constructeur au niveau module</h3>
      <p><code className="text-perry-400">export const initTRPC = new TRPCBuilder()</code> n&apos;exécute pas le constructeur à l&apos;exécution, donc <code className="text-perry-400">initTRPC.create()</code> est <code className="text-perry-400">undefined</code>.</p>

      <h3>Propriétés héritées</h3>
      <p><code className="text-perry-400">TRPCError extends Error</code>, et bien que <code className="text-perry-400">err.code</code> fonctionne, <code className="text-perry-400">err.message</code> (hérité de <code className="text-perry-400">Error</code>) n&apos;est pas accessible. La chaîne de prototypes pour la recherche de propriétés n&apos;est pas entièrement implémentée.</p>

      <h3>Classes built-in de l&apos;API Web</h3>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700"><th className="text-left py-3 px-4 font-semibold text-slate-300">Classe</th><th className="text-left py-3 px-4 font-semibold text-slate-300">Nombre</th></tr></thead>
          <tbody>
            {[["Response","11"],["TransformStream","7"],["ReadableStream","5"],["Request","4"],["Headers","3"],["Proxy","2"],["TextEncoderStream","2"],["WritableStream","1"],["DOMException","1"]].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800"><td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td><td className="py-2 px-4 text-slate-400">{count}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code> et <code className="text-perry-400">Headers</code> sont les éléments critiques pour tout framework HTTP. Ceux-ci ont besoin d&apos;un support codegen built-in similaire à ce que nous avons déjà pour <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>, <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>, <code className="text-perry-400">AbortController</code> et autres.</p>

      <h2>Ce que cela nous apprend</h2>
      <p>La bonne nouvelle : le pipeline de compilation de Perry gère du vrai code de framework. Les lacunes sont des lacunes d&apos;exécution, pas de compilation. Le travail restant est :</p>
      <ol className="list-decimal list-inside">
        <li><strong>Assignation dynamique de propriétés</strong> — nécessaire pour les frameworks qui configurent des méthodes programmatiquement</li>
        <li><strong>Expressions d&apos;initialisation au niveau module</strong> — <code className="text-perry-400">export const x = new Foo()</code> doit réellement exécuter le constructeur</li>
        <li><strong>Chaîne de prototypes</strong> — propriétés et méthodes héritées</li>
        <li><strong>Built-ins de l&apos;API Web</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> pour les frameworks HTTP</li>
      </ol>
      <p>Ce sont des problèmes concrets et bien délimités. Aucun ne nécessite de changements architecturaux — ce sont des extensions de patterns qui fonctionnent déjà pour des cas plus simples.</p>
      <p>Nous continuerons à travailler dessus. L&apos;objectif est que <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code> produise un serveur HTTP fonctionnel dans un binaire natif.</p>
    </>
  );
}
