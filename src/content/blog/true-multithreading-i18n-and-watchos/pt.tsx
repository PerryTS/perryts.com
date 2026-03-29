import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry v0.4.0 &eacute; o maior lan&ccedil;amento desde o in&iacute;cio do projeto. Tr&ecirc;s saltos de vers&atilde;o num &uacute;nico ciclo — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (multi-threading) — e o pr&oacute;prio compilador agora &eacute; paralelo. Aqui est&aacute; tudo o que foi lan&ccedil;ado.
      </p>

      <h2>Multi-Threading Real</h2>
      <p>
        O Perry agora tem paralelismo real com threads do SO. N&atilde;o web workers com overhead de serializa&ccedil;&atilde;o. N&atilde;o <code>SharedArrayBuffer</code> com <code>Atomics</code>. Threads reais — threads leves do SO com stack de 8MB que n&atilde;o partilham nada e n&atilde;o custam nada quando ociosas.
      </p>
      <p>
        O novo m&oacute;dulo <code>perry/thread</code> exp&otilde;e tr&ecirc;s primitivas:
      </p>
      <pre><code>{`import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});`}</code></pre>
      <p>
        <code>parallelMap</code> e <code>parallelFilter</code> detetam automaticamente o n&uacute;mero de n&uacute;cleos de CPU e dividem o array de entrada entre eles. Para arrays pequenos, ignoram o threading e executam de forma s&iacute;ncrona — sem overhead para cargas triviais.
      </p>
      <p>
        <code>spawn</code> lan&ccedil;a uma thread do SO em segundo plano e retorna uma Promise. O resultado flui atrav&eacute;s de uma fila de resultados pendentes que &eacute; drenada durante o processamento de microtasks, ent&atilde;o faz <code>await</code> como qualquer outra opera&ccedil;&atilde;o ass&iacute;ncrona.
      </p>

      <h3>Seguran&ccedil;a em Tempo de Compila&ccedil;&atilde;o</h3>
      <p>
        A parte mais importante n&atilde;o &eacute; a API — &eacute; o que o compilador <em>impede</em>. O Perry rejeita estaticamente closures que capturam vari&aacute;veis mut&aacute;veis:
      </p>
      <pre><code>{`let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});`}</code></pre>
      <p>
        Sem estado mut&aacute;vel partilhado significa sem corridas de dados. Sem locks, sem mutexes, sem <code>Atomics</code>. O compilador garante a seguran&ccedil;a de threads antes de uma &uacute;nica linha de c&oacute;digo m&aacute;quina ser emitida.
      </p>

      <h3>Por Baixo do Cap&ocirc;</h3>
      <p>
        Cada thread de trabalho recebe a sua pr&oacute;pria arena de mem&oacute;ria com limpeza <code>Drop</code> — sem coordena&ccedil;&atilde;o de GC entre threads. Valores s&atilde;o transferidos via c&oacute;pia profunda <code>SerializedValue</code>: custo zero para n&uacute;meros, O(n) para strings, arrays e objetos. A implementa&ccedil;&atilde;o reside num &uacute;nico ficheiro Rust de 1.120 linhas (<code>perry-runtime/src/thread.rs</code>) e n&atilde;o exigiu altera&ccedil;&otilde;es no coletor de lixo.
      </p>
      <p>
        Compare com os isolates V8, que requerem heaps separados por worker com ~2MB de overhead cada. As threads do Perry s&atilde;o apenas pthreads com arenas.
      </p>

      <h3>Pipeline de Compilador Paralelo</h3>
      <p>
        O pr&oacute;prio compilador agora tamb&eacute;m &eacute; paralelo. Codegen de m&oacute;dulos, passes de transforma&ccedil;&atilde;o (imports JS, inst&acirc;ncias nativas, monomorfiza&ccedil;&atilde;o), e verifica&ccedil;&atilde;o de s&iacute;mbolos <code>nm</code> executam todos em todos os n&uacute;cleos de CPU via rayon. Combinado com a atualiza&ccedil;&atilde;o Cranelift 0.121 (de 0.113 — oito vers&otilde;es menores de aloca&ccedil;&atilde;o de registos e melhorias x64), a compila&ccedil;&atilde;o &eacute; significativamente mais r&aacute;pida.
      </p>

      <h2>i18n em Tempo de Compila&ccedil;&atilde;o (v0.3.0)</h2>
      <p>
        O sistema de internacionaliza&ccedil;&atilde;o do Perry tem zero cerim&oacute;nia. Literais de string em widgets de UI s&atilde;o automaticamente tratados como chaves localiz&aacute;veis. Ficheiros de tradu&ccedil;&atilde;o s&atilde;o JSON plano num diret&oacute;rio <code>locales/</code>. Toda a valida&ccedil;&atilde;o acontece em tempo de compila&ccedil;&atilde;o.
      </p>
      <pre><code>{`// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })`}</code></pre>
      <p>
        O compilador valida tudo: tradu&ccedil;&otilde;es em falta, incompatibilidades de par&acirc;metros, erros de formas plurais. As tradu&ccedil;&otilde;es s&atilde;o incorporadas no bin&aacute;rio como uma tabela de strings 2D embutida com consulta quase zero em runtime — sem parsing de JSON no arranque.
      </p>

      <h3>O Que Est&aacute; Inclu&iacute;do</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Regras de plural CLDR</strong> para mais de 30 locales com sufixos <code>.one</code>/<code>.other</code>/<code>.few</code>/<code>.many</code>/<code>.zero</code>/<code>.two</code></li>
        <li><strong>Wrappers de formato</strong>: <code>Currency</code>, <code>Percent</code>, <code>ShortDate</code>, <code>LongDate</code>, <code>FormatNumber</code>, <code>FormatTime</code>, <code>Raw</code></li>
        <li><strong>Dete&ccedil;&atilde;o nativa de locale</strong> em todas as plataformas: <code>CFLocaleCopyCurrent</code> (macOS/iOS), <code>GetUserDefaultLocaleName</code> (Windows), <code>system_property_get</code> (Android), <code>LANG</code>/<code>LC_ALL</code> (Linux)</li>
        <li><strong><code>perry i18n extract</code></strong> CLI: analisa ficheiros TS/TSX, gera e atualiza scaffolds de JSON de locale</li>
        <li><strong>Gera&ccedil;&atilde;o de recursos nativos da plataforma</strong>: diret&oacute;rios iOS <code>.lproj</code> e Android <code>values-xx/</code></li>
        <li><strong><code>import {`{ t }`} from &quot;perry/i18n&quot;</code></strong> para localizar strings n&atilde;o-UI</li>
      </ul>
      <p>
        Configure no <code>perry.toml</code>:
      </p>
      <pre><code>{`[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }`}</code></pre>

      <h2>Apps Nativas watchOS (v0.3.2)</h2>
      <p>
        O Perry agora compila para watchOS — o 9.&ordm; alvo de compila&ccedil;&atilde;o. Isto n&atilde;o &eacute; um wrapper ou uma app companheira. &Eacute; um bin&aacute;rio watchOS aut&oacute;nomo com uma interface SwiftUI nativa.
      </p>
      <p>
        O renderizador watchOS usa uma <strong>abordagem orientada por dados</strong>: o Perry constr&oacute;i uma &aacute;rvore de UI via chamadas FFI <code>perry_ui_*</code>, e uma <code>PerryWatchApp.swift</code> enviada consulta a &aacute;rvore e renderiza vistas SwiftUI de forma reativa. 15 tipos de widgets s&atilde;o suportados com stubs para os n&atilde;o suportados.
      </p>
      <pre><code>{`# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos`}</code></pre>
      <p>
        O fluxo completo funciona: <code>perry setup watchos</code> partilha credenciais do App Store Connect com iOS, <code>perry run watchos</code> deteta automaticamente simuladores de Apple Watch, e <code>perry publish watchos</code> submete para a App Store.
      </p>
      <p>
        Isto tamb&eacute;m eleva o <strong>total de alvos de widget para quatro</strong>: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) e Wear OS (Tiles). Cada um tem o seu pr&oacute;prio alvo de compila&ccedil;&atilde;o e backend de codegen.
      </p>

      <h2>APIs de &Aacute;udio e C&acirc;mara</h2>
      <p>
        Duas novas APIs de hardware neste lan&ccedil;amento:
      </p>
      <h3>Captura de &Aacute;udio (<code>perry/system</code>)</h3>
      <p>
        Captura de &aacute;udio cross-platform com medi&ccedil;&atilde;o de dB(A) ponderada em A:
      </p>
      <pre><code>{`import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();`}</code></pre>
      <p>
        Backends de plataforma: AVAudioEngine (macOS/iOS), AudioRecord via JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).
      </p>
      <h3>Captura de C&acirc;mara (<code>perry/ui</code>)</h3>
      <p>
        Pr&eacute;-visualiza&ccedil;&atilde;o nativa de c&acirc;mara com amostragem de cor ao n&iacute;vel do pixel (iOS):
      </p>
      <pre><code>{`import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging`}</code></pre>

      <h2>Pacotes do Ecossistema</h2>
      <p>
        Dois pacotes nativos de primeira parte foram lan&ccedil;ados:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/push</strong> — Bindings de notifica&ccedil;&otilde;es push para iOS/macOS: pedidos de permiss&atilde;o, obten&ccedil;&atilde;o de token APNs, contagem de badges. Stub Android com FCM planeado.</li>
        <li><strong>perry/storekit</strong> — Bindings de compras in-app StoreKit 2: carregamento de produtos, compras com recibos JWS, verifica&ccedil;&atilde;o de subscri&ccedil;&otilde;es, restauro e listeners de transa&ccedil;&otilde;es.</li>
      </ul>
      <p>
        Ambos seguem a mesma arquitetura: declara&ccedil;&otilde;es TypeScript → crate FFI Rust → ponte Swift. Instale como depend&ecirc;ncia, importe as fun&ccedil;&otilde;es, fa&ccedil;a <code>await</code> dos resultados. O compilador trata de toda a ponte nativa.
      </p>

      <h2>Infraestrutura</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Cranelift 0.113 → 0.121</strong> — oito vers&otilde;es menores de aloca&ccedil;&atilde;o de registos, corre&ccedil;&otilde;es x64 e melhorias de alinhamento de stack slot</li>
        <li><strong>Divis&atilde;o de fun&ccedil;&otilde;es Windows</strong> — divide automaticamente fun&ccedil;&otilde;es com mais de 50 instru&ccedil;&otilde;es em continua&ccedil;&otilde;es para contornar problemas de codegen Cranelift no Windows</li>
        <li><strong>Carregamento seletivo de vari&aacute;veis de m&oacute;dulo</strong> — carrega apenas vari&aacute;veis de n&iacute;vel de m&oacute;dulo referenciadas na entrada da fun&ccedil;&atilde;o, reduzindo o tamanho do bin&aacute;rio Windows em 26%</li>
        <li><strong>Atualiza&ccedil;&atilde;o Array.sort()</strong> — de ordena&ccedil;&atilde;o por inser&ccedil;&atilde;o O(n&sup2;) para h&iacute;brido estilo TimSort O(n log n)</li>
        <li><strong>perry run android</strong> — pipeline completo de build APK: compila&ccedil;&atilde;o, gera&ccedil;&atilde;o de projeto Gradle, assembleDebug, instala&ccedil;&atilde;o, lan&ccedil;amento</li>
        <li><strong>Entradas personalizadas Info.plist</strong> — <code>[ios.info_plist]</code> no perry.toml para descri&ccedil;&otilde;es de privacidade, esquemas de URL, modos de background</li>
      </ul>

      <h2>Em N&uacute;meros</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Vers&atilde;o</strong>: 0.2.197 → 0.4.0 (tr&ecirc;s marcos principais)</li>
        <li><strong>Alvos de compila&ccedil;&atilde;o</strong>: 8 → 9 (adicionado watchOS)</li>
        <li><strong>Alvos de widget</strong>: 1 → 4 (iOS, Android, watchOS, Wear OS)</li>
        <li><strong>Novos crates</strong>: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles</li>
        <li><strong>Nova documenta&ccedil;&atilde;o</strong>: threading (4 p&aacute;ginas), i18n (4 p&aacute;ginas), watchOS, documenta&ccedil;&atilde;o expandida de widgets (3 → 8 p&aacute;ginas)</li>
        <li><strong>Implementa&ccedil;&atilde;o perry/thread</strong>: 1.120 linhas de Rust, zero altera&ccedil;&otilde;es no GC</li>
      </ul>

      <h2>Pr&oacute;ximos Passos</h2>
      <p>
        A funda&ccedil;&atilde;o de threading abre muitas possibilidades: processamento paralelo de pedidos HTTP, opera&ccedil;&otilde;es de ficheiros concorrentes e cargas de trabalho computacionalmente pesadas que eram anteriormente bloqueadas pela execu&ccedil;&atilde;o single-threaded. No lado da linguagem, o suporte completo a regex continua a ser a maior lacuna, e a expans&atilde;o do <code>perry/ui</code> (drag and drop, acessibilidade, DatePicker) continua.
      </p>
      <p>
        Acompanhe o progresso no{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, leia a documenta&ccedil;&atilde;o em{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, ou consulte o{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">roadmap</Link>
        {" "}para o panorama completo.
      </p>
    </>
  );
}
