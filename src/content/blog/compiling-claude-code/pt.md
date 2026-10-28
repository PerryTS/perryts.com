---
title: "Compilar o Claude Code: um bundle minificado, 160 correções no compilador"
excerpt: "Tentámos transformar num binário nativo o ficheiro cli.js minificado de 13 MB que o npm distribui para o Claude Code. Um mês depois, inicia, autentica-se, recebe respostas reais da API em streaming e apresenta os caracteres digitados. Pelo caminho, 160 pull requests foram integrados no Perry: de um MessageChannel que não fazia nada a uma barreira de escrita do GC em falta nos cabeçalhos RegExp."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
Em 16 de junho a instrução era uma frase: *“encontre a pasta de código claude e obtenha o javascript (compilado, minificado) de lá… vamos ver se conseguimos compilá-lo :D”* Quando a objeção óbvia voltou — de que isso seria brutal — a resposta foi a tese real: *“é brutal, mas também um verdadeiro teste de nossas capacidades e limites, é por isso que quero fazer isso. Nada substitui os aplicativos do mundo real em termos de encontrar limites.”*

Um mês depois, um binário compilado por Perry do Anthropic do Claude Code CLI é iniciado e executado `/login` por meio do fluxo OAuth, transmite uma resposta real da API e pinta os caracteres que você digita. Para chegar lá, foram necessárias **160 pull requests mescladas em Perry entre 20 de junho e 17 de julho** — um `MessageChannel`, uma barreira de gravação GC ausente em RegExp, uma instrução `continue` que apenas girou na API real e nunca em nossa simulação, e cerca de cento e cinquenta mais.

Esta postagem é o tour. Não porque compilar a CLI de outra pessoa seja um produto - nós não lançamos este binário e nunca o faremos - mas porque é o instrumento de localização de bugs mais produtivo que já apontamos para Perry.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="Um terminal macOS executando um binário Perrycompilado por Claude Code de /tmp/verify: o banner v2.1.112, um /login bem-sucedido, o prompt “incrível, quem você está?”, uma resposta transmitida e uma saída limpa de volta para o shell." width="1708" height="926"><figcaption>Não há <code>node</code> nessa linha de comando. <code>/tmp/verify/cc_fptest_dbg25</code> é um único executável nativo produzido por <code>perry compile</code> a partir do <code>cli.js</code> — fazendo login, transmitindo uma resposta real e saindo corretamente em Ctrl-C. Como o nome do arquivo levanta a questão: <code>dbg25</code> é a 25ª compilação de uma série de diagnósticos da investigação GC ainda em execução enquanto isso foi escrito - símbolos de depuração, além da elisão da barreira de gravação desativada para que <em>cada</em> armazenamento de array emita uma barreira. Ele carrega mais sobrecarga do que uma construção comum, e não menos. A tabela de desempenho mais abaixo foi medida em diferentes binários não instrumentados.</figcaption></figure>

## O que “compilar Claude Code” realmente significa

O destino da compilação é o arquivo distribuído no pacote npm. `npm pack @anthropic-ai/claude-code@2.1.112` fornece um `cli.js`: **13 MB de JavaScript** minificado e autoexecutável com um `#!/usr/bin/env node` shebang. Nenhuma fonte, nenhum mapa de origem, nenhuma etapa de construção nossa. Apontamos `perry compile` para esse arquivo, não modificado, e solicitamos um executável nativo.

Perry mastiga-o por cerca de 37 minutos e produz aproximadamente 207 MB de IR em **16.023 funções**, que se vinculam a um binário de aproximadamente 180 MB. Cada uma dessas funções tem nomes de uma letra e nenhuma anotação de tipo, e tudo tem que funcionar antecipadamente - sem JIT, sem `eval`, sem resgate preguiçoso para um intérprete quando o compilador adivinha errado. Se Perry reduzir incorretamente uma dessas 16.023 funções, não há nada que possa detectá-lo.

A escala de pontuação vem do nosso conjunto de estresse interno e é deliberadamente implacável:

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

`correct` é o único nível que conta. Node v26 é o oráculo; qualquer coisa que não seja idêntica em bytes ao que Node imprime é um bug de Perry até prova em contrário.

## Por que este aplicativo em particular

Um agente de codificação CLI é uma pilha incomumente hostil de JavaScript para compilar antecipadamente. Em um binário você obtém: React reconciliando em um terminal através de Ink, um leitor stdin de modo bruto, um renderizador ANSI/emoji saturado que executa regexes em cada quadro, um streaming SSE cliente HTTP, esquemas zod criados na inicialização, um fluxo OAuth, `worker_threads`, `MessageChannel` usado como um agendador de macrotarefas, WeakMaps contendo estado de fibra, `require` dinâmico e uma camada de sistema de arquivos que grava em stdout por descritor de arquivo.

Cada um deles é um subsistema diferente de Perry, e o aplicativo os exercita *juntos*, em escala, sob pressão de GC, por minutos de cada vez. Nossos próprios conjuntos de testes — 3.000 testes de unidade Rust, milhares de programas de regressão TypeScript, a matriz de paridade Node API, test262 — são todos orientados para fixar comportamentos conhecidos. Este pacote é orientado a encontrar comportamentos que ninguém pensou em identificar.

## A sequência de obstáculos

O trabalho seguiu apenas em uma direção: limpar a parede atual, encontrar a próxima. Comprimido:

| Data| Marco |
| --- | --- |
| 21 de junho| `--help` é executado nativamente, código de saída 0 |
| 22 de junho| Subcomandos reais param de travar na inicialização |
| 23 de junho| `-p` abre um soquete TCP ESTABELECIDO para api.anthropic.com |
| 24 de junho| Os esquemas zod são construídos corretamente; caminho de autenticação alcançado |
| 27 de junho| A TUI renderiza — logotipo, caixa de boas-vindas, quadro de entrada |
| 9 de julho| Primeira viagem de ida e volta completa: `-p` contra a API imprime a resposta, sai 0 |
| 10 de julho| Node-vs-Perry chicote diferencial: 12/12 idêntico |
| 13 de julho| Byte idêntico ao Node em `-p` texto + JSON, TUI renderização, sistema de arquivos |
| 16 de julho| Os caracteres digitados finalmente aparecem na linha de entrada |
| 17 de julho| Loop completo validado manualmente: inicialização → `/login` → API → digitação |

Cada correção foi upstream como uma solicitação pull independente com uma reprodução genérica mínima. Nenhum deles menciona o aplicativo de onde vieram – essa era uma regra desde o primeiro dia. Um usuário Perry que lê o changelog vê “`continue` em drivers for-await ignorados o avanço do iterador", e não "estávamos tentando compilar a CLI de alguém. Os bugs são reais, independentemente do veículo que os encontrou.

## Cinco bugs de software que vale a pena discutir

### 1. MessageChannel foi um ambiente autônomo e educado

`--help` funcionou em 21 de junho. Cada subcomando *real* — `doctor`, `agents`, `mcp list` — travado para sempre. Não ocupado: `sample` mostrou o processo estacionado, `lsof` não mostrou nenhum processo filho, nenhum soquete, apenas dois pipes.

O `MessageChannel` de Perry instalou `postMessage` como autônomo e `onmessage` como `null`. Isso é inofensivo até você conhecer o padrão de agendador React, que usa um canal de mensagens como agendador de macrotarefas:

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

A mensagem foi descartada, o retorno de chamada nunca foi executado e o loop de eventos ficou inativo em seu próprio canal de ativação para sempre. [#5530](https://github.com/PerryTS/perry/pull/5530) deu às portas entrega real no mesmo thread - pares emaranhados, uma fila FIFO, entrega por meio da macrotarefa `setImmediate` e uma Verificador raiz do GC para que as mensagens na fila sobrevivam a uma coleção.

### 2. Um acessador em Object.prototype custa 42 segundos

Antes do travamento, os mesmos subcomandos ficavam vinculados à CPU por dezenas de segundos. A criação de perfil apontou para o caminho genérico `[[Set]]` e a causa raiz foi um sinalizador global do processo.

Perry tem um caminho rápido para gravações de propriedades dinâmicas, limitado em “`Object.prototype` atualmente carrega algum descritor?” O pacote instala exatamente um acessador em `Object.prototype` na inicialização. Isso inverteu o sinalizador em todo o processo e, a partir de então, *cada* gravação dinâmica no programa realizou a caminhada lenta de interceptação, que é O(contagem de chaves próprias). Construir um objeto amplo tornou-se quadrático:

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) substituiu o sinalizador global por uma pergunta por chave — *o `Object.prototype` tem uma propriedade própria para **isso** chave?* Uma chave ausente não pode ser interceptada, então a gravação é segura para o caminho rápido. 42 s → 23 ms, com interceptação ainda correta.

Então a mesma forma reapareceu para instâncias de classe, que o caminho rápido excluiu completamente: uma construção de 20.000 chaves em um objeto simples levou 25 ms, em uma instância de `class` 44 segundos. Corrigir isso era importante - uma verificação ingênua da cadeia de protótipos teria ignorado os setters herdados e corrompido os dados silenciosamente - então [#5528](https://github.com/PerryTS/perry/pull/5528) resolve o protótipo da instância por meio do registro de classe e adiciona um índice de chave larga O(1). De volta aos 30 ms e linear novamente.

### 3. O bug que apenas a API real poderia acionar

Este é aquele sobre o qual contamos às pessoas. No início de julho, o binário compilado faria uma volta completa `-p` contra nosso servidor simulado local: conecte, POST, leia o fluxo SSE, imprima a resposta, saia 0. Contra o Anthropic API travava para sempre, sempre.

A cadeia de depuração foi: uma simulação de proxy direto provou que a resposta 200 completa chegou intacta → uma simulação de repetição, alimentou o fluxo de bytes reais capturados, reproduziu o travamento localmente → dividindo ao meio a lista de eventos SSE encontrou o evento culpado → uma reprodução de dez linhas.

A verdadeira API envia quadros de `event: ping`. Nossa simulação nunca aconteceu. E `ping` é o único evento que o loop de fluxo do SDK ignora com um simples `continue`. Perry reduziu `for await` em um driver cujo avanço do iterador estava na *parte inferior* do corpo do loop:

```
// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}
```

Seis locais de rebaixamento separados tinham o mesmo formato. [#6196](https://github.com/PerryTS/perry/pull/6196) moveu o avanço para o topo em todos eles. A lição que reaprendemos: um simulado aprovado é uma prova do simulado.

### 4. Uma regex que sobreviveu à sua própria string de padrão

O TUI seria renderizado e, em seguida, morreria do `SIGBUS` em segundos — 12 travamentos em 12 execuções sob um chicote de estresse de redimensionamento de janela, em endereços diferentes em funções diferentes a cada vez. Semanas de investigação foram dedicadas às teorias de GC que os testes A/B refutaram, incluindo uma de nossas próprias “correções” que se revelou inadequada e teve que ser retirada.

A verdadeira causa raiz foram quatro linhas de Rust. `js_regexp_new` aloca um cabeçalho RegExp e armazena seus ponteiros de string `pattern` e `flags` com gravações brutas - **não barreira de gravação**. Um objeto da velha geração apontando para uma corda nova e nova, com o colecionador nunca informado sobre o fio. O GC secundário varreu essas strings de um RegExp e a próxima leitura do slot liberado falhou.

Por que isso só apareceu aqui? Como uma UI de terminal é saturada com regex — análise ANSI e medição de largura de emoji executa padrões em cada quadro — então a janela entre a alocação e a coleta é cruzada milhares de vezes por minuto. Nossa reprodução mínima, 6.000 regexes mais rotatividade deliberada de alocação, *nunca* acionou isso. O pacote sempre o acionou. [#6288](https://github.com/PerryTS/perry/pull/6288) adicionou a barreira que ambos os campos sempre precisaram.

### 5. Os caracteres que você digitou estavam lá. A moldura os jogou fora.

A parede mais teimosa: toda a UI pintada perfeitamente — caixa de boas-vindas, quadro de entrada, bloco de cursor, linha de status. Digitar `/` abriu o menu de comando, então o pressionamento de tecla atingiu React. Mas as letras nunca apareceram na linha de entrada.

Construções instrumentadas mostraram Perry pintando o caractere digitado corretamente em todas as etapas e, em seguida, `onRender` jogando *após* a pintura — em um Ink `try/catch` que o engoliu. O quadro foi abandonado antes do commit, portanto, cada renderização subsequente foi construída em um quadro vazio. O aplicativo parecia completamente saudável enquanto ignorava você.

Dois bugs independentes estavam escondidos por trás desse sintoma:

-   [#6453](https://github.com/PerryTS/perry/pull/6453) — A transformação inline de `charAt`/`codePointAt`/`split` no Perry chamava ToString num receptor que não era uma string, sem a verificação obrigatória de possibilidade de coerção. Assim, `undefined.codePointAt(0)` retornava silenciosamente `117` — o ponto de código de `"u"`, da string `"undefined"` — em vez de lançar uma exceção. Um bug que *inventa* dados plausíveis é muito pior do que um que causa uma falha.

-   [#6471](https://github.com/PerryTS/perry/pull/6471) — o verdadeiro bloqueador. Quando um array cresce, Perry deixa um stub de encaminhamento permanente no endereço antigo. A varredura secundária estava recuperando esses stubs enquanto um pai da geração antiga ainda apontava para um: o cache de caracteres do renderizador mantinha um ponteiro de pré-crescimento em uma página que não estava suja. A leitura do stub obsoleto produziu um comprimento de lixo e cada quadro foi abortado. Os menores agora retêm todos os canhotos; traços completos os recuperam por marca.


Consertando aqueles expostos em uma terceira camada — objetos nascidos em preto durante a marcação incremental nunca foram rastreados, então qualquer coisa acessível apenas através deles foi varrida enquanto estava ao vivo ([#6494](https://github.com/PerryTS/perry/pull/6494)), e a máscara de layout subnotificou slots de overflow, então o coletor os ignorou ([#6506](https://github.com/PerryTS/perry/pull/6506)). Esses dois são o tipo de falha de integridade que produz uma falha misteriosa em *qualquer* programa compilado. Não os teríamos encontrado com um conjunto de testes.

## Como você depura um binário minificado de 13 MB

Nenhuma das opções acima pode ser encontrada pela leitura do código. As ferramentas que o tornaram tratável:

-   **Um aproveitamento diferencial com Node como oracle.** Cada hipótese se torna um pequeno programa TypeScript executado em `node --experimental-strip-types` e em um Perry binário, comparado byte por byte. Ele encontrou bugs por si só - uma expressão de classe usada apenas como um `instanceof` lado direito foi eliminada do código morto porque onze passagens de análise não puderam ver através desse tipo de nó ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Três servidores simulados de API.** Uma simulação de registro, um proxy de encaminhamento que captura bytes de resposta reais e um servidor de reprodução que alimenta esses bytes exatos de forma determinística. O servidor de reprodução é o que transformou “travamentos na produção” em uma reprodução local.

-   **Um equipamento PTY que responde a consultas de terminal.** Um pseudoterminal burro fornece 50 bytes e um bloqueio. O aplicativo verifica a posição do cursor (`ESC[6n`), atributos do dispositivo (`ESC[c`) e cor de fundo (`OSC 11`) e aguarda respostas antes de pintar. Responda e você terá a tela de boas-vindas completa de 3.331 bytes — e uma renderização comparável em bytes entre Node e Perry.

-   **Mapas de links para simbolização.** Binários despojados de 180 MB produzem relatórios de falhas cheios de compensações brutas; A saída `ld64 -map` mais um script bisect os transforma novamente em nomes de funções.

-   **A/B tudo.** A regra que surgiu, escrita no topo das notas de transferência em letras maiúsculas: *nunca herde uma teoria - teste-a.* Quatro hipóteses consecutivas de causa raiz para um bug foram refutadas por execuções A/B. Um sinal do verificador que perseguimos por dias (“445 arestas antigas → jovens ausentes”) acabou sendo um artefato de medição – a verificação ocorreu entre a limpeza e a restauração do conjunto lembrado. O próprio comentário do código alertou sobre isso.


## Onde realmente está

Honestamente: funciona e é lento.

Funcionando hoje, byte idêntico ao Node onde a saída é comparável: inicialização, `--help`, `--version`, modo one-shot `-p` contra a API real, incluindo a classificação de erros e o envelope JSON, a renderização TUI completa, o OAuth `/login` fluxo, streaming de respostas e digitação. Aqui está todo o loop de uma só vez - lançamento, `/login`, uma pergunta, uma resposta transmitida, saída:

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Seu navegador não suporta vídeo incorporado.</video><figcaption>63 segundos, sem áudio, cortado em dois lugares: a metade do navegador do handshake OAuth e um macOS prompt de chaves. Tudo no terminal é em tempo real e não editado — incluindo o atraso na inicialização, que é a coisa mais lenta neste post.</figcaption></figure>

Duas coisas ainda estão em aberto e podem muito bem ser uma coisa. A entrada para de ser registrada após aproximadamente um minuto de uso interativo contínuo – sem travamento, sem erro, ela simplesmente para. E `ESC` não interrompe uma resposta em andamento, embora `Ctrl-C` agora feche corretamente, o que não acontecia há uma semana (essa é a saída que você vê no final da gravação). Um caminho de saída que funciona enquanto um caminho de interrupção não aponta para o mesmo suspeito que a morte da entrada: eventos de pressionamento de tecla que param de chegar ao aplicativo, em vez de algo errado com os manipuladores do próprio aplicativo.

A imagem do desempenho, medida em relação ao Node executando o pacote idêntico, antes e depois da primeira rodada da campanha de velocidade que começou no dia em que a correção chegou. Eles foram lançados em `cc_final` e `cc_perf2` em 17 de julho - compilações comuns sem diagnóstico compilado, não o binário instrumentado na captura de tela acima:

| Métrica| Node| Perry (17 de julho)| Perry (depois) |
| --- | --- | --- | --- |
| `--version` | 328ms| 1.168ms| **227ms** |
| `--help` | 715ms| 5.071ms| 4.099ms |
| TUI primeira pintura| 0.76 s | 10.9 s | 8.4 s |
| Pressionamento de tecla → pintar (p50)| 2,2ms| 111–143ms| 119–138ms |
| Pegada de memória, ociosa| 290 MB fixos| ~420 MB subindo| ~420 MB subindo |

`--version` agora **supera Node**, e a vitória foi embaraçosa na origem: o executável compilado estava exportando 300.281 símbolos, então cerca de 80% desse lançamento foi dyld fazendo coalescência de definição fraca. Um sinalizador de vinculador levou as exportações para 3 e o binário de 228 MB para 197 MB ([#6533](https://github.com/PerryTS/perry/pull/6533)). Criar cada regex exclusivo uma vez em vez de duas ([#6534](https://github.com/PerryTS/perry/pull/6534)) e armazenar em cache a verificação de interceptação por loja ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) ficou com o resto.

Nesses 197 MB, antes que alguém comece: Perry vincula estaticamente seu próprio tempo de execução e emite código de máquina para todas as 16.023 funções antecipadamente, sem nada para eliminar — um pacote autoexecutável torna essencialmente tudo acessível, portanto, não há pacotes cruzados DCE para se apoiar - o que significa que 197 MB é um programa inteiro *mais* seu tempo de execução em um arquivo, contra os **138 MB que o binário Node v26 pesa antes de ler uma única linha do seu JavaScript**.

A linha de pressionamento de tecla é aquela que deve ser lida com atenção, porque o número “depois” parece pior. Não é: esses são intervalos entre execuções repetidas e se sobrepõem, de modo que a mediana não se moveu em nenhuma direção — isso é uma variância entre corridas, não uma regressão. Também é exatamente o que esperávamos. Todas as três alterações afetam a etapa do link, a construção da regex e o caminho *store*; a mediana de pressionamento de tecla é dominada pelo caminho da propriedade *read*, sobrecarga de root por chamada e etapas de GC de 40 a 80 ms dentro das janelas de pressionamento de tecla. A prova veio na próxima rodada: get/set fast lanes tornou um microbenchmark de acesso de campo 3× mais rápido e não moveu esse número em nada ([#6539](https://github.com/PerryTS/perry/pull/6539)). Uma vitória no microbenchmark que não aparece no aplicativo é um diagnóstico errado, e nós tivemos um.

A linha de memória é a campanha atual. O coletor de cópias de Perry *pode* compactar - o problema é que ele se torna elegível aproximadamente uma vez a cada 45 segundos de inatividade, então o berçário volta a crescer para aproximadamente 300 MB entre disparos enquanto o Node permanece plano compactando continuamente. Esse é um problema de frequência de disparo, não um problema de algoritmo, que é um lugar muito melhor para se estar do que onde estávamos em junho.

Nenhum deles está estacionado. A campanha de memória e desempenho está *ativa* enquanto esta postagem é publicada — o trabalho do gatilho GC está em execução hoje, neste binário exato — então a tabela de desempenho acima é a parte desta postagem que mais esperamos invalidar, e quanto mais cedo melhor. A correção levou um mês de paredes para ser transposta. O que resta é um problema de frequência de disparo e um problema de caminho de leitura, ambos compreendidos, ambos já em voo. Esperamos que isso pareça suave, em vez de apenas correto, e esperamos que isso aconteça em breve.

## Por que fazemos isso

Nenhuma das 160 correções é sobre o Claude Code. Uma barreira de gravação ausente nos cabeçalhos RegExp corrompe a memória em *qualquer* programa que cria expressões regulares sob carga. `for await` com um `continue` gira em qualquer consumidor de fluxo. `MessageChannel` descartar mensagens interrompe todos os aplicativos em forma de agendador React. O sinalizador do descritor `Object.prototype` tornou *cada* programa que toca `Object.prototype` quadrático em seu objeto mais amplo.

Esses bugs estavam todos no Perry enquanto o CI estava verde, enquanto os números do test262 subiram, enquanto a matriz de paridade do Node dizia 97%. Foram necessários treze megabytes do JavaScript reduzido de outra pessoa, fazendo um trabalho real em uma API real em um terminal real, para libertá-los.

Há mais uma coisa, e é a parte que achamos mais engraçada. Perry não foi escrito apenas à mão — grande parte dele, incluindo grande parte *desta* campanha, foi escrita com o Claude Code. Os servidores simulados, o equipamento PTY, o executor diferencial, as longas noites de divisão de um bug do GC às quatro da manhã: sessões de agente, revisadas e mescladas por um humano. Nem todo Perry, e não sem muitos argumentos. Mas o suficiente para que a frase seja verdadeira nos dois sentidos.

O compilador que comeu o Claude Code foi, em parte substancial, construído pelo Claude Code.

Continuaremos fazendo isso. Os próximos alvos já estão na fila.

* * *

Perry não é afiliado nem endossado pela Anthropic. Claude Code é uma marca registrada da Anthropic PBC. O binário descrito aqui foi criado a partir do pacote npm publicado publicamente apenas como um alvo de teste do compilador e não é distribuído.
