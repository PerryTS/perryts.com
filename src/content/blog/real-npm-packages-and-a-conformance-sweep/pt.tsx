export default function Content() {
  return (
    <>
      <p>
        O último post terminou em <strong>v0.5.875</strong> com a história do GC — fechando o gap que o benchmark de aya_koto expôs. Aquele post era sobre vencer um benchmark. Este é sobre um tipo de trabalho diferente: as cerca de <strong>270 releases entre v0.5.875 e v0.5.1146</strong>, aterrissadas ao longo de cerca de quatro semanas, quase nenhuma delas sendo manchete de benchmark. O tema mudou de &ldquo;ir rápido num microbenchmark&rdquo; para <strong>&ldquo;fazer TypeScript do mundo real e pacotes npm reais de fato compilarem e rodarem.&rdquo;</strong> Mais uma revisão visual completa do Windows e uma pilha de novos widgets pelo caminho.
      </p>
      <p>
        Eis o que saiu, agrupado pelo que de fato servia.
      </p>

      <h2>Pacotes npm reais compilam agora</h2>
      <p>
        O maior fio único através desta janela é uma varredura para fazer pacotes npm populares compilarem para binários nativos e passarem em testes comportamentais — não apenas &ldquo;linkar sem erros,&rdquo; mas rodar e produzir a saída certa. A lista que agora funciona através de <code>perry.compilePackages</code> inclui <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, e Colyseus</strong>.
      </p>
      <p>
        Cada um falhava por sua própria razão, e cada fix é sua própria pequena história:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> crashava com <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>. Causa raiz (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code> onde <code>F</code> é uma função importada de outro módulo silenciosamente produzia um objeto vazio — o corpo do construtor nunca rodava, então toda checagem estilo <code>$ZodCheckMinLength</code> voltava despida de sua propriedade <code>_zod</code>.</li>
        <li><strong>axios + jose</strong> precisavam de crypto e compressão que Perry ainda não tinha: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> para AES-GCM, e <code>randomFillSync</code> (v0.5.972–976).</li>
        <li><strong>fastify</strong> estava em deadlock num timeout de polling de um segundo em <code>wait_for_promise</code>; o substituímos por uma espera com condvar e fizemos promises rejeitadas aparecerem como <code>HTTP 500</code> em vez de travar (v0.5.912).</li>
        <li><strong>@hono/node-server</strong> não conseguia ler um body de POST — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> retornavam vazio em POST/PUT até um fix de registro de pai em v0.5.1142.</li>
        <li><strong>chalk, ms, debug, express</strong> todos batiam no mesmo formato: um <em>valor chamável com propriedades anexadas</em> (<code>chalk.red</code>, <code>express()</code> mais <code>express.Router</code>). Três variações desse padrão foram corrigidas ao longo de v0.5.935 e da varredura npm ao redor, mais <code>util.inherits</code> + um scaffold de prototype de stream para destravar express (v0.5.990).</li>
        <li><strong>dayjs</strong>, distribuído como um bundle minificado, exercitava o dispatch de método de prototype JS-clássico (<code>Class.prototype.m = fn</code>) que Perry lowereava errado (v0.5.924/932).</li>
      </ul>
      <p>
        Por baixo de tudo isso está a parte que faz pacotes que Perry <em>não consegue</em> compilar nativamente ainda rodarem: o <strong>runtime de fallback V8</strong> ficou real nesta janela. Seu ModuleLoader agora lê de um mapa de módulos embutido, então um binário de fallback ainda é <strong>autossuficiente</strong> — sem <code>node_modules</code> soltos em runtime (v0.5.994). <code>createServer</code> faz ponte para um servidor hyper real (v0.5.999), e os globais Web Fetch <code>Response</code> / <code>Request</code> / <code>Headers</code> existem no caminho de fallback (v0.5.1006). E o <strong><code>import()</code> dinâmico em tempo de compilação</strong> — <code>await import(&apos;./foo.ts&apos;)</code> com string literal resolvido em tempo de build — finalmente aterrissou (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>Uma varredura de conformidade test262</h2>
      <p>
        O outro fio dominante é a conformidade. Rodamos passes focados contra os radares do subconjunto test262 e movemos o ponteiro nos built-ins em que código real mais se apoia:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        O salto de String veio de dar a todo método de <code>String.prototype</code> dispatch genérico de <code>this</code> e corrigir a coerção de índice de <code>slice</code>/<code>substring</code>. O salto de Array foi <code>thisArg</code> nos callbacks de array denso (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), <code>ToLength</code> array-like, ordenação de operações da spec, e validação de zero argumentos. Destructuring ganhou destructuring de parâmetros em métodos de classe plain, generator, async-generator, static, e private.
      </p>
      <p>
        Ao lado dos números de manchete, uma longa cauda de correção aterrissou: <code>JSON.parse</code> agora lança um <code>SyntaxError</code> real (não um <code>TypeError</code>) e rejeita tokens à direita; seu reviver caminha via o algoritmo da spec <code>InternalizeJSONProperty</code>; <code>Object.prototype.toString</code> branda corretamente para typed arrays, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp; <code>RegExp.prototype.toString</code> retorna <code>/source/flags</code>; async generators acertaram sua semântica de <code>yield</code>-aguarda-operando. Estes são radares de subconjunto, não a suíte completa — Perry ainda está escalando — mas a escalada deste mês foi íngreme.
      </p>

      <h2>Windows fica Fluent</h2>
      <p>
        O Windows ganhou uma revisão visual (a série <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>). Janelas de Perry agora optam pela chrome DWM moderna por padrão — <strong>backdrop Mica</strong>, cantos arredondados, e uma barra de título com consciência de tema — e os controles comuns renderizam através do <strong>comctl32 v6</strong> em vez dos defaults da era Windows 95. O window proc agora trata <code>WM_DPICHANGED</code>, então uma janela permanece nítida quando você a arrasta entre monitores com escala mista em vez de ficar esticada por bitmap.
      </p>
      <p>
        Crucialmente, nada disso reintroduziu a antiga regressão <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> de &ldquo;área preta após resize&rdquo;: a área cliente ainda é pintada opaca, e o blur-through Mica/Acrylic de quadro completo permanece um opt-in explícito via <code>app.setVibrancy(...)</code>. Há também um novo scaffold de backend <code>--target windows-winui</code> (WinUI 3) para apps que querem o stack totalmente moderno, e um fix pequeno mas real que faz <code>perry compile main.ts -o main</code> produzir <code>main.exe</code> no Windows para que o PowerShell de fato o lance (v0.5.1146).
      </p>

      <h2>Novos widgets, em toda plataforma</h2>
      <p>
        Dois widgets aterrissaram só no último dia, e ambos abrangem toda plataforma de UI que Perry mira:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — um controle de data compacto, estilo campo: <code>NSDatePicker</code> no macOS, <code>UIDatePicker</code> (.compact) no iOS/visionOS, <code>SysDateTimePick32</code> no Windows, <code>android.widget.DatePicker</code> no Android, GTK4 no Linux. Uma superfície TS para todos eles.</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — qualquer widget pode ser um destino de drop e uma fonte de drag para text/files/URLs, mapeado para <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit), e <code>View.setOnDragListener</code> (Android).</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        Mais cedo na janela a prateleira de widgets também se preencheu por desktop e mobile — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, e uma ImageGallery com swipe — cada um respaldado pelo controle nativo real em toda plataforma. O HarmonyOS (ArkTS) ganhou Chart e TreeView (v0.5.893), os dois últimos widgets que precisava para alcançar paridade com os outros.
      </p>

      <h2>GC, internals, e estabilidade</h2>
      <p>
        A maioria dessas 270 releases não são manchetes — são correções de bug e internals, e esse é o ponto desta fase. Algumas que vale destacar:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>O GC continuou.</strong> O trabalho de free list condicional do post do GC continuou se assentando, e uma classe aguda de bug foi fechada: Promises com ponte nativa agora são <strong>fixadas enquanto em voo num worker tokio</strong> para que o GC não possa varrê-las antes da resolução aterrissar (v0.5.923). Se você rodou um fetch async sob carga e viu uma coleta fantasma, era isto.</li>
        <li><strong>O modelo de memória está documentado.</strong> Há agora um mergulho profundo <code>internals/memory-model.md</code> — NaN-boxing, o GC geracional, a shadow stack, e write barriers — ligado ao site de docs (v0.5.933).</li>
        <li><strong>Uma onda de fixes de estabilidade de codegen</strong> aflorou pela varredura npm: uma arrow <code>const</code> em nível de módulo chamada dentro de um passo async retomado não dá mais SIGSEGV (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> não trava mais para sempre (v0.5.870), e um punhado de crashes de <code>js_is_truthy</code> / range de ponteiro cru que bundles reais disparavam.</li>
      </ul>

      <h2>Faxina da Apple</h2>
      <p>
        Menor mas real: <code>perry setup ios --development</code> agora provisiona para builds de desenvolvimento (v0.5.1023), e o caminho de build/link de bibliotecas cruzadas da Apple foi deduplicado e tornado portável quanto à largura de ponteiro (v0.5.1121/1125) — que é o que destravou a matriz de publicação npm / Homebrew / APT / winget que estava emperrada.
      </p>

      <h2>Onde isso deixa as coisas</h2>
      <p>
        A aposta por trás de Perry sempre foi que &ldquo;TypeScript nativo&rdquo; só importa se TypeScript <em>real</em> rodar — não um subconjunto de brinquedo, os pacotes de verdade que as pessoas dão <code>npm install</code>. Este mês foi principalmente esse trabalho: menos um número único para se gabar, mais um empurrão longo e sem glamour para fechar o gap entre &ldquo;compila&rdquo; e &ldquo;funciona.&rdquo; Os radares de conformidade e os testes de paridade npm são o placar que estamos observando agora, e vamos continuar postando os números — os bons e os ainda imperfeitos.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
