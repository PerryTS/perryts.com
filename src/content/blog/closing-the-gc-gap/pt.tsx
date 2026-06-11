export default function Content() {
  return (
    <>
      <p>
        Algumas semanas atrás, <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto no X) publicou <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">um benchmark de Perry contra Deno e Bun</a> no problema ABC451D do AtCoder, &ldquo;Concat Power of 2.&rdquo; A medição dele: Perry rodou <strong>3,85× mais lento que Bun</strong>. A conclusão foi educada mas firme — Perry não estava pronto para ser um runtime de programação competitiva, e talvez nem estivesse quando amadurecesse.
      </p>
      <p>
        Devemos a ele um follow-up. Eis onde chegamos no mesmo benchmark, com o mesmo comando <code>hyperfine</code>, na mesma classe de máquina:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        Fechar esse gap exigiu uma investigação que começou com uma hipótese errada, encontrou um trade-off real mas deliberado da arquitetura do GC, e produziu um resultado que achamos digno de escrever sobre — não porque alcançamos, mas porque a forma como o trade-off apareceu sob profiling é interessante em si.
      </p>

      <h2>O benchmark</h2>
      <p>
        O <code>abc451d-perry.ts</code> de aya_koto faz uma busca em profundidade recursiva sobre concatenações de strings de potências de 2, deduplicadas através de um <code>Set&lt;number&gt;</code> e ordenadas. A função quente é curta:
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
        O formato é a história. Cada chamada aloca um novo <code>string[]</code>. A recursão é profunda — fator de ramificação de até cerca de 30 no topo — e cada frame pai mantém seu array <code>answers</code> vivo enquanto itera o array do filho e empurra para o seu próprio. Alocações de vida curta, recursão profunda, referências vivas espalhadas por todo bloco de arena ativo. Acabou sendo exatamente a carga de trabalho contra a qual o GC de Perry <em>não</em> estava ajustado.
      </p>

      <h2>A hipótese errada</h2>
      <p>
        Um leitor tinha deixado uma nota de rodapé no artigo de aya_koto apontando que o BigInt de Perry era internamente um inteiro de tamanho fixo de 1024 bits, e que programas pesados em BigInt rodavam cerca de 4× mais lento que Bun. O ABC451D envolve potências de 2 — números grandes pareciam plausíveis — e então o primeiro instinto foi: BigInt é o culpado, corrija o caminho do BigInt, o gap fecha.
      </p>
      <p>
        Não era. <code>grep -i bigint abc451d-perry.ts</code> não retornou nada. O benchmark usa <code>number</code> em tudo; todo valor cabe confortavelmente abaixo de 2^53. A nota de rodapé sobre BigInt estava correta, real, e era um problema que valia a pena corrigir — e o corrigimos, separadamente, em v0.5.736. Mas não tinha nada a ver com ABC451D.
      </p>
      <p>
        O custo de perseguir a hipótese errada primeiro foi cerca de um dia. A lição — que eu gostaria de alegar que já sabíamos — foi: faça profiling antes de se comprometer com uma teoria, mesmo quando a teoria vem de uma fonte credível e bate com suas crenças prévias. Especialmente então.
      </p>

      <h2>Reproduzindo o bench</h2>
      <p>
        A primeira coisa que fizemos depois de parar de perseguir BigInt foi reproduzir os números de aya_koto de forma limpa. Esperávamos chegar perto dos 1,219 s dele no Perry. Chegamos a <strong>2,998 s</strong> no Perry v0.5.729.
      </p>
      <p>
        Isso é uma regressão de 2,5× entre a versão que ele testou e o nosso main de então. Deno e Bun reproduziram dentro de 50% dos números dele (hardware diferente, drift de versão). O gap de Perry tinha crescido de 3,85× para 6,59× enquanto ninguém estava olhando.
      </p>
      <p>
        Não fizemos bisect de qual commit causou a regressão — ficou fora do escopo desta investigação. Mas a ausência de uma guardrail de CI que teria pego o drift é em si uma descoberta, e voltaremos a isso no fim.
      </p>

      <h2>Diagnóstico guiado por profile</h2>
      <p>
        Compilado com <code>PERRY_DEBUG_SYMBOLS=1</code> e gravado com <code>samply</code>, o quadro de self-time era inequívoco:
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
        <strong>76% do self time era maquinaria do GC.</strong> O tempo inclusivo concordava: <code>gc_collect_minor</code> em 80%, <code>Arena::alloc</code> em 76%, <code>js_array_alloc</code> em 45%, <code>js_array_push_f64</code> em 22%. A <code>search()</code> recursiva estava quente, mas estava quente por baixo da fase de mark do GC. Cada chamada estava disparando alocação suficiente para acionar uma coleta.
      </p>
      <p>
        Um microbenchmark de controle negativo confirmou que a lentidão não era geral. <code>fib(80) × 100_000</code> de inteiros apertados, sem alocação: Perry <strong>6,1 ms</strong> vs Bun <strong>24,7 ms</strong> — Perry 4× mais rápido. O codegen para loops quentes sem alocação já estava à frente de Bun. O gap do ABC451D estava concentrado em um caminho de código específico: throughput de alocação mais mark-sweep do GC neste formato de alocação em particular.
      </p>

      <h2>A prova cabal</h2>
      <p>
        Tínhamos uma flag — <code>PERRY_GC_DIAG=1</code> — que imprimia estatísticas de GC por ciclo. A saída foi a observação de carga da investigação inteira:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Todo ciclo, o mesmo padrão. O sweep identificava corretamente que <strong>55–60% dos objetos alocados estavam mortos</strong>. E a arena reclamava <strong>zero blocos</strong>. O heap crescia monotonicamente ao longo da run, enquanto o GC continuava pagando o custo de mark-sweep sobre um working set cada vez maior.
      </p>
      <p>
        Por que <code>block_reclaim=0</code> apesar de mais da metade dos objetos estarem mortos? Porque o GC de arena de Perry reclama na granularidade de bloco. Um bloco de 1 MB só é resetado quando todo objeto dentro dele está morto. No ABC451D, a <code>search()</code> recursiva mantém referências vivas — o array <code>answers</code> do frame pai — espalhadas por todo bloco ativo. Nenhum bloco fica jamais inteiramente morto. O mark-sweep identifica corretamente os objetos mortos, não tem caminho de reclaim por objeto, e então não faz nada com eles. O heap cresce, os gatilhos de GC disparam numa esteira, e o custo de cada ciclo sobe à medida que o working set sobe.
      </p>

      <h2>O trade-off deliberado</h2>
      <p>
        A coisa mais informativa que encontramos não estava no profile. Estava no próprio sweep, em <code>crates/perry-runtime/src/gc.rs:2733</code>, como um comentário explicando o design:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        Deliberadamente NÃO empurramos objetos mortos para a ARENA_FREE_LIST global. O bump allocator inline nunca lê a free list — ele usa o reset por bloco em vez disso. Empurrar objetos mortos para a free list custaria ~50ns por objeto × ~700k objetos por GC × ~12 ciclos de GC por benchmark = 420ms de pura perda em <code>object_create</code>.
      </blockquote>
      <p>
        Isso está exatamente correto para a carga de trabalho contra a qual foi ajustado. <code>object_create</code> é um benchmark que nos importa, onde as alocações morrem num loop apertado e blocos inteiros de fato esvaziam entre ciclos. Adicionar um passe de free-list por objeto queimaria 420 ms de bookkeeping inútil para essa carga, e o caminho de block-reset captura a mesma memória mais barato.
      </p>
      <p>
        É um mau encaixe para o formato do ABC451D, onde as referências vivas ficam espalhadas e o block-reset nunca dispara. A arquitetura tinha um trade-off deliberado codificado nela, e nunca tínhamos feito benchmark do caso onde o trade-off vai para o lado errado.
      </p>
      <p>
        Essa é a lição de verdade. O GC não estava quebrado. Estava ajustado para uma distribuição de padrões de alocação diferente da que o bench de aya_koto representa, e não tínhamos percebido que a distribuição para a qual estava ajustado excluía uma classe de cargas de trabalho reais — busca recursiva, tree walks, qualquer coisa que segura estado vivo em todo nível da stack enquanto faz alocação de vida curta por baixo.
      </p>

      <h2>Coisas que não funcionaram</h2>
      <p>
        Antes de chegarmos a um fix real, várias alavancas de aparência plausível acabaram sendo alavancas erradas. Reportamos estas com números porque foram a metade mais interessante da investigação:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry já tinha um passe opt-in de evacuação por cópia. Ligá-lo para o ABC451D: <strong>11,4 segundos</strong>, quatro vezes mais lento que a baseline. O passe roda todo ciclo, útil ou não, e seu custo de cópia por objeto mais reescrita de referência é catastrófico quando o live set é objetos pequenos de vida curta. Vale manter para as cargas que se beneficiam, mas não é a resposta aqui.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (mark-sweep completo em vez de geracional) — 3,06 s, essencialmente idêntico à baseline. A escolha de estratégia não é o que limita; a ausência de reclaim por objeto é.</li>
        <li><strong>Limpeza estrutural do <code>ValidPointerSet</code> (commit 0fa42e0b).</strong> Mesclou os dois vetores ordenados separados (ponteiros de arena e ponteiros de malloc) em um, adicionou um pré-filtro de range min/max, inlinou a rejeição de tag de <code>try_mark_value</code>. Cortou pela metade o custo por chamada de <code>contains()</code> — que era o loop interno quente que o profile sinalizava. O bench do ABC451D moveu de 3,07 s para 3,21 s. Empate, dentro do ruído. A mudança ainda entrega valor para cargas onde <code>contains()</code> de fato é a restrição limitante (benchmarks de formato ECS, cadeias de compose de hono), mas não era a restrição limitante aqui. O volume absoluto de chamadas — impulsionado pela pressão de alocação alimentando a fase de mark — dominava mesmo com custo por chamada zero.</li>
      </ul>
      <p>
        O padrão nas três: a estratégia do GC e os custos de loop interno por chamada eram de segunda ordem. A restrição limitante era a falta de um caminho de reclaim para objetos mortos em blocos que não esvaziam completamente. Até isso ser endereçado, nada mais mexeu o ponteiro.
      </p>

      <h2>Onde chegamos</h2>
      <p>
        Entre v0.5.737 e v0.5.875, ao longo de cerca de 137 versões patch, o gap fechou. Estamos sendo deliberados ao escrever isto: não fizemos bisect até um único commit herói. O fix aterrissou ao longo de uma série de mudanças no subsistema do GC que tornaram o trade-off deliberado de &ldquo;sem free list por objeto&rdquo; condicional em vez de permanente — quando <code>block_reclaim</code> fica em zero por ciclos consecutivos, o sweep começa a popular uma free list dividida por tamanho e o bump allocator ganha um caminho de fallback. O sequenciamento exato e quanto cada patch contribuiu exigiria um bisect cuidadoso que devemos mas ainda não fizemos.
      </p>
      <p>
        O resultado, no bench e comando exatos de aya_koto, em Apple M-series, macOS 26.4:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Duas notas de honestidade sobre esta tabela. Primeiro, a margem de 1,01× de Perry sobre Bun está dentro das barras de erro — a palavra correta é &ldquo;empate,&rdquo; não &ldquo;mais rápido.&rdquo; Segundo, a variância nos três runtimes é significativa (o max de Perry é 745 ms contra uma média de 425 ms), e qualquer run isolada pode cair em qualquer das caudas. Mostramos min e max ao lado da média por essa razão; preferimos que você veja a dispersão.
      </p>

      <h2>O que ainda é imperfeito</h2>
      <p>
        Algumas coisas que não estamos encobrindo:
      </p>
      <p>
        A regressão de 1,2 s para 3,0 s que aconteceu entre a medição de aya_koto e o início desta investigação nos diz que não tínhamos uma guardrail de CI pegando essa classe de lentidão. Estamos adicionando <code>abc451d-perry.ts</code> e uma pequena suíte ao redor ao CI de Perry como um portão de regressão de perf antes deste post ir ao ar. Se este bench degradar silenciosamente numa release futura, deve falhar um build, não um benchmark de um crítico daqui a três meses.
      </p>
      <p>
        O fix relaxa um trade-off deliberado numa direção específica. Estamos observando o benchmark <code>object_create</code> e seus amigos — cargas que a escolha original de &ldquo;sem free list&rdquo; estava protegendo — para garantir que o caminho condicional de free list não os regrida. Os números iniciais estão dentro do ruído, mas este é o tipo de coisa onde a confiança vem do tempo, não de uma run de benchmark isolada.
      </p>
      <p>
        Não fizemos bisect da faixa de 137 versões. Vamos fazer. Importa para a documentação, e importa para entender quais dos mecanismos de free list condicional estão fazendo o trabalho.
      </p>

      <h2>Crédito</h2>
      <p>
        O artigo de aya_koto foi exatamente o tipo de writeup que um projeto open-source precisa e raramente recebe. Ele mediu com cuidado, publicou seu repo de teste, apontou atrito específico no caminho de instalação, e chegou à conclusão honesta de que Perry não estava pronto para o caso de uso que ele estava avaliando. Aquela conclusão estava correta quando ele a fez. Teria ficado correta por mais tempo se ele não tivesse escrito sobre ela.
      </p>
      <p>
        O repo de teste dele está em <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>. O artigo dele está em <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>. Ambos valem a leitura mesmo depois deste follow-up — o artigo especialmente, porque documenta uma avaliação honesta de um compilador em estágio inicial feita por alguém sem nenhum incentivo para ser educado.
      </p>
      <p>
        Duas coisas específicas no artigo dele que devemos notar. O atrito do caminho de instalação que ele sinalizou — que o topo de perryts.com apontava para um método enquanto os docs recomendavam outro — foi corrigido; o caminho via npm agora é a opção proeminente na landing page, batendo com os docs. A frustração de &ldquo;coisas fora do doc de limitações que não compilam&rdquo; que ele sinalizou — passamos por todo arquivo <code>.ts</code> no repo de teste dele contra o Perry atual; as lacunas genuínas viraram issues, e as limitações documentadas foram expandidas.
      </p>
      <p>
        A nota de rodapé sobre BigInt no artigo dele era, como discutido acima, não relacionada ao ABC451D mas real por conta própria — a implementação de BigInt de Perry era de fato um inteiro de largura fixa de 1024 bits por baixo dos panos, e programas pesados em BigInt pagavam por isso. Isso está corrigido em v0.5.736, com um caminho inline para valores pequenos e <code>num-bigint</code> como fallback de precisão arbitrária. O crédito ali pertence ao leitor que deixou a nota de rodapé no artigo de aya_koto; não sabemos quem é, mas se você está lendo isto: obrigado.
      </p>

      <h2>Reprodução</h2>
      <p>
        Se você quiser reproduzir esses números você mesmo:
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
        Seus números vão variar com hardware e versões de runtime. Se variarem de formas que parecem erradas, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">abra uma issue</a> — preferimos saber disso.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
