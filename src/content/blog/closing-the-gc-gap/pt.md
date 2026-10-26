---
title: "O que o benchmark de aya_koto nos ensinou sobre o GC do Perry"
excerpt: "Um leitor benchmarkeou o Perry no AtCoder ABC451D e o mediu 3,85× mais lento que o Bun. Uma regressão silenciosa tinha ampliado o gap para 6,59× desde então. O fix não estava onde esperávamos, o trade-off deliberado do GC que ele expôs era real, e o Perry v0.5.875 agora empata com o Bun no mesmo bench: 425 ms vs 431 ms."
date: 2026-05-12
tags: ["GC", "performance", "benchmarks", "community"]
---
Algumas semanas atrás, [Ayasaka-Koto](https://zenn.dev/aya_koto) (@axt\_ayakoto no X) publicou [um benchmark de Perry contra Deno e Bun](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4) no problema ABC451D do AtCoder, “Concat Power of 2.” A medição dele: Perry rodou **3,85× mais lento que Bun**. A conclusão foi educada mas firme — Perry não estava pronto para ser um runtime de programação competitiva, e talvez nem estivesse quando amadurecesse.

Devemos a ele um follow-up. Eis onde chegamos no mesmo benchmark, com o mesmo comando `hyperfine`, na mesma classe de máquina:

```
Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster
```

Fechar esse gap exigiu uma investigação que começou com uma hipótese errada, encontrou um trade-off real mas deliberado da arquitetura do GC, e produziu um resultado que achamos digno de escrever sobre — não porque alcançamos, mas porque a forma como o trade-off apareceu sob profiling é interessante em si.

## O benchmark

O `abc451d-perry.ts` de aya\_koto faz uma busca em profundidade recursiva sobre concatenações de strings de potências de 2, deduplicadas através de um `Set<number>` e ordenadas. A função quente é curta:

```
function search(before: string, powersOfTwoStr: string[]): string[] {
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
}
```

O formato é a história. Cada chamada aloca um novo `string[]`. A recursão é profunda — fator de ramificação de até cerca de 30 no topo — e cada frame pai mantém seu array `answers` vivo enquanto itera o array do filho e empurra para o seu próprio. Alocações de vida curta, recursão profunda, referências vivas espalhadas por todo bloco de arena ativo. Acabou sendo exatamente a carga de trabalho contra a qual o GC de Perry *não* estava ajustado.

## A hipótese errada

Um leitor tinha deixado uma nota de rodapé no artigo de aya\_koto apontando que o BigInt de Perry era internamente um inteiro de tamanho fixo de 1024 bits, e que programas pesados em BigInt rodavam cerca de 4× mais lento que Bun. O ABC451D envolve potências de 2 — números grandes pareciam plausíveis — e então o primeiro instinto foi: BigInt é o culpado, corrija o caminho do BigInt, o gap fecha.

Não era. `grep -i bigint abc451d-perry.ts` não retornou nada. O benchmark usa `number` em tudo; todo valor cabe confortavelmente abaixo de 2^53. A nota de rodapé sobre BigInt estava correta, real, e era um problema que valia a pena corrigir — e o corrigimos, separadamente, em v0.5.736. Mas não tinha nada a ver com ABC451D.

O custo de perseguir a hipótese errada primeiro foi cerca de um dia. A lição — que eu gostaria de alegar que já sabíamos — foi: faça profiling antes de se comprometer com uma teoria, mesmo quando a teoria vem de uma fonte credível e bate com suas crenças prévias. Especialmente então.

## Reproduzindo o bench

A primeira coisa que fizemos depois de parar de perseguir BigInt foi reproduzir os números de aya\_koto de forma limpa. Esperávamos chegar perto dos 1,219 s dele no Perry. Chegamos a **2,998 s** no Perry v0.5.729.

Isso é uma regressão de 2,5× entre a versão que ele testou e o nosso main de então. Deno e Bun reproduziram dentro de 50% dos números dele (hardware diferente, drift de versão). O gap de Perry tinha crescido de 3,85× para 6,59× enquanto ninguém estava olhando.

Não fizemos bisect de qual commit causou a regressão — ficou fora do escopo desta investigação. Mas a ausência de uma guardrail de CI que teria pego o drift é em si uma descoberta, e voltaremos a isso no fim.

## Diagnóstico guiado por profile

Compilado com `PERRY_DEBUG_SYMBOLS=1` e gravado com `samply`, o quadro de self-time era inequívoco:

```
% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator
```

**76% do self time era maquinaria do GC.** O tempo inclusivo concordava: `gc_collect_minor` em 80%, `Arena::alloc` em 76%, `js_array_alloc` em 45%, `js_array_push_f64` em 22%. A `search()` recursiva estava quente, mas estava quente por baixo da fase de mark do GC. Cada chamada estava disparando alocação suficiente para acionar uma coleta.

Um microbenchmark de controle negativo confirmou que a lentidão não era geral. `fib(80) × 100_000` de inteiros apertados, sem alocação: Perry **6,1 ms** vs Bun **24,7 ms** — Perry 4× mais rápido. O codegen para loops quentes sem alocação já estava à frente de Bun. O gap do ABC451D estava concentrado em um caminho de código específico: throughput de alocação mais mark-sweep do GC neste formato de alocação em particular.

## A prova cabal

Tínhamos uma flag — `PERRY_GC_DIAG=1` — que imprimia estatísticas de GC por ciclo. A saída foi a observação de carga da investigação inteira:

```
[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+
```

Todo ciclo, o mesmo padrão. O sweep identificava corretamente que **55–60% dos objetos alocados estavam mortos**. E a arena reclamava **zero blocos**. O heap crescia monotonicamente ao longo da run, enquanto o GC continuava pagando o custo de mark-sweep sobre um working set cada vez maior.

Por que `block_reclaim=0` apesar de mais da metade dos objetos estarem mortos? Porque o GC de arena de Perry reclama na granularidade de bloco. Um bloco de 1 MB só é resetado quando todo objeto dentro dele está morto. No ABC451D, a `search()` recursiva mantém referências vivas — o array `answers` do frame pai — espalhadas por todo bloco ativo. Nenhum bloco fica jamais inteiramente morto. O mark-sweep identifica corretamente os objetos mortos, não tem caminho de reclaim por objeto, e então não faz nada com eles. O heap cresce, os gatilhos de GC disparam numa esteira, e o custo de cada ciclo sobe à medida que o working set sobe.

## O trade-off deliberado

A coisa mais informativa que encontramos não estava no profile. Estava no próprio sweep, em `crates/perry-runtime/src/gc.rs:2733`, como um comentário explicando o design:

> Deliberadamente NÃO empurramos objetos mortos para a ARENA\_FREE\_LIST global. O bump allocator inline nunca lê a free list — ele usa o reset por bloco em vez disso. Empurrar objetos mortos para a free list custaria ~50ns por objeto × ~700k objetos por GC × ~12 ciclos de GC por benchmark = 420ms de pura perda em `object_create`.

Isso está exatamente correto para a carga de trabalho contra a qual foi ajustado. `object_create` é um benchmark que nos importa, onde as alocações morrem num loop apertado e blocos inteiros de fato esvaziam entre ciclos. Adicionar um passe de free-list por objeto queimaria 420 ms de bookkeeping inútil para essa carga, e o caminho de block-reset captura a mesma memória mais barato.

É um mau encaixe para o formato do ABC451D, onde as referências vivas ficam espalhadas e o block-reset nunca dispara. A arquitetura tinha um trade-off deliberado codificado nela, e nunca tínhamos feito benchmark do caso onde o trade-off vai para o lado errado.

Essa é a lição de verdade. O GC não estava quebrado. Estava ajustado para uma distribuição de padrões de alocação diferente da que o bench de aya\_koto representa, e não tínhamos percebido que a distribuição para a qual estava ajustado excluía uma classe de cargas de trabalho reais — busca recursiva, tree walks, qualquer coisa que segura estado vivo em todo nível da stack enquanto faz alocação de vida curta por baixo.

## Coisas que não funcionaram

Antes de chegarmos a um fix real, várias alavancas de aparência plausível acabaram sendo alavancas erradas. Reportamos estas com números porque foram a metade mais interessante da investigação:

-   **`PERRY_GEN_GC_EVACUATE=1`** — Perry já tinha um passe opt-in de evacuação por cópia. Ligá-lo para o ABC451D: **11,4 segundos**, quatro vezes mais lento que a baseline. O passe roda todo ciclo, útil ou não, e seu custo de cópia por objeto mais reescrita de referência é catastrófico quando o live set é objetos pequenos de vida curta. Vale manter para as cargas que se beneficiam, mas não é a resposta aqui.
-   **`PERRY_GEN_GC=0`** (mark-sweep completo em vez de geracional) — 3,06 s, essencialmente idêntico à baseline. A escolha de estratégia não é o que limita; a ausência de reclaim por objeto é.
-   **Limpeza estrutural do `ValidPointerSet` (commit 0fa42e0b).** Mesclou os dois vetores ordenados separados (ponteiros de arena e ponteiros de malloc) em um, adicionou um pré-filtro de range min/max, inlinou a rejeição de tag de `try_mark_value`. Cortou pela metade o custo por chamada de `contains()` — que era o loop interno quente que o profile sinalizava. O bench do ABC451D moveu de 3,07 s para 3,21 s. Empate, dentro do ruído. A mudança ainda entrega valor para cargas onde `contains()` de fato é a restrição limitante (benchmarks de formato ECS, cadeias de compose de hono), mas não era a restrição limitante aqui. O volume absoluto de chamadas — impulsionado pela pressão de alocação alimentando a fase de mark — dominava mesmo com custo por chamada zero.

O padrão nas três: a estratégia do GC e os custos de loop interno por chamada eram de segunda ordem. A restrição limitante era a falta de um caminho de reclaim para objetos mortos em blocos que não esvaziam completamente. Até isso ser endereçado, nada mais mexeu o ponteiro.

## Onde chegamos

Entre v0.5.737 e v0.5.875, ao longo de cerca de 137 versões patch, o gap fechou. Estamos sendo deliberados ao escrever isto: não fizemos bisect até um único commit herói. O fix aterrissou ao longo de uma série de mudanças no subsistema do GC que tornaram o trade-off deliberado de “sem free list por objeto” condicional em vez de permanente — quando `block_reclaim` fica em zero por ciclos consecutivos, o sweep começa a popular uma free list dividida por tamanho e o bump allocator ganha um caminho de fallback. O sequenciamento exato e quanto cada patch contribuiu exigiria um bisect cuidadoso que devemos mas ainda não fizemos.

O resultado, no bench e comando exatos de aya\_koto, em Apple M-series, macOS 26.4:

```
Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)
```

Duas notas de honestidade sobre esta tabela. Primeiro, a margem de 1,01× de Perry sobre Bun está dentro das barras de erro — a palavra correta é “empate,” não “mais rápido.” Segundo, a variância nos três runtimes é significativa (o max de Perry é 745 ms contra uma média de 425 ms), e qualquer run isolada pode cair em qualquer das caudas. Mostramos min e max ao lado da média por essa razão; preferimos que você veja a dispersão.

## O que ainda é imperfeito

Algumas coisas que não estamos encobrindo:

A regressão de 1,2 s para 3,0 s que aconteceu entre a medição de aya\_koto e o início desta investigação nos diz que não tínhamos uma guardrail de CI pegando essa classe de lentidão. Estamos adicionando `abc451d-perry.ts` e uma pequena suíte ao redor ao CI de Perry como um portão de regressão de perf antes deste post ir ao ar. Se este bench degradar silenciosamente numa release futura, deve falhar um build, não um benchmark de um crítico daqui a três meses.

O fix relaxa um trade-off deliberado numa direção específica. Estamos observando o benchmark `object_create` e seus amigos — cargas que a escolha original de “sem free list” estava protegendo — para garantir que o caminho condicional de free list não os regrida. Os números iniciais estão dentro do ruído, mas este é o tipo de coisa onde a confiança vem do tempo, não de uma run de benchmark isolada.

Não fizemos bisect da faixa de 137 versões. Vamos fazer. Importa para a documentação, e importa para entender quais dos mecanismos de free list condicional estão fazendo o trabalho.

## Crédito

O artigo de aya\_koto foi exatamente o tipo de writeup que um projeto open-source precisa e raramente recebe. Ele mediu com cuidado, publicou seu repo de teste, apontou atrito específico no caminho de instalação, e chegou à conclusão honesta de que Perry não estava pronto para o caso de uso que ele estava avaliando. Aquela conclusão estava correta quando ele a fez. Teria ficado correta por mais tempo se ele não tivesse escrito sobre ela.

O repo de teste dele está em [github.com/AXT-AyaKoto/perry-ts-test-2026-0421](https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421). O artigo dele está em [zenn.dev/aya\_koto/articles/553ce04b1d5ac4](https://zenn.dev/aya_koto/articles/553ce04b1d5ac4). Ambos valem a leitura mesmo depois deste follow-up — o artigo especialmente, porque documenta uma avaliação honesta de um compilador em estágio inicial feita por alguém sem nenhum incentivo para ser educado.

Duas coisas específicas no artigo dele que devemos notar. O atrito do caminho de instalação que ele sinalizou — que o topo de perryts.com apontava para um método enquanto os docs recomendavam outro — foi corrigido; o caminho via npm agora é a opção proeminente na landing page, batendo com os docs. A frustração de “coisas fora do doc de limitações que não compilam” que ele sinalizou — passamos por todo arquivo `.ts` no repo de teste dele contra o Perry atual; as lacunas genuínas viraram issues, e as limitações documentadas foram expandidas.

A nota de rodapé sobre BigInt no artigo dele era, como discutido acima, não relacionada ao ABC451D mas real por conta própria — a implementação de BigInt de Perry era de fato um inteiro de largura fixa de 1024 bits por baixo dos panos, e programas pesados em BigInt pagavam por isso. Isso está corrigido em v0.5.736, com um caminho inline para valores pequenos e `num-bigint` como fallback de precisão arbitrária. O crédito ali pertence ao leitor que deixou a nota de rodapé no artigo de aya\_koto; não sabemos quem é, mas se você está lendo isto: obrigado.

## Reprodução

Se você quiser reproduzir esses números você mesmo:

```
git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \
  './abc451d-perry < abc451d-input.txt' \
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \
  'bun run abc451d-bun.ts < abc451d-input.txt'
```

Seus números vão variar com hardware e versões de runtime. Se variarem de formas que parecem erradas, [abra uma issue](https://github.com/PerryTS/perry/issues) — preferimos saber disso.

Source: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues)

— Ralph
