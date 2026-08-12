import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `**TL;DR.** Perry compila TypeScript em binários nativos e usa um coletor de rastreamento móvel, geracional e com raízes precisas — não contagem de referências. Depois de um mês em que quase todo o trabalho de GC consistiu em *descobrir o que o coletor realmente estava fazendo*, Perry agora vence o Node em 9 de 19 benchmarks com perfil de GC (antes eram 3), vence o concorrente AOT com contagem de referências em 14 de 19 e fica a menos de 1,3× do Node em 15 de 19. Pelo caminho encontramos uma classe de bug que não deixa evidências forenses, variáveis de ambiente que não controlavam nada, gates de CI estruturalmente incapazes de falhar, um comentário de documentação que fez outro coletor ser distribuído silenciosamente e uma medição final mostrando que a lacuna restante está no *layout* dos objetos, não na coleta. As nove regras que extraímos estão no fim, e a maioria não tem nada a ver com garbage collection.

Perry compila TypeScript diretamente para um executável nativo: SWC faz o parsing, nós baixamos para HIR, LLVM emite código de máquina e \`cc\` faz o link. Não há interpretador nem bytecode. Ainda assim, a linguagem tem closures que escapam, objetos que sobrevivem aos seus escopos e ciclos de referência — portanto, atrás desse binário nativo precisa existir um coletor de lixo real.

Este texto relata as decisões que tomamos ao construí-lo, as coisas que nos surpreenderam — quase todas de forma desagradável — e onde os números estão hoje. Há meses o coletor é a área mais ativa do código: **201 commits tocaram \`crates/perry-runtime/src/{gc,arena}\` desde 1º de julho de 2026, 110 deles nos últimos doze dias**, em 127 arquivos e cerca de 75 mil linhas. 135 dos 572 fragmentos de changelog ainda não publicados têm nomes ligados ao GC.

Quase nada disso foi “implementar um coletor”. Foi descobrir o que nosso coletor realmente estava fazendo.

---

## Parte 1 — O que escolhemos

### Sem contagem de referências

A primeira pergunta costuma ser se um compilador AOT não deveria simplesmente usar contagem de referências. Parece o encaixe óbvio: nenhum problema de descoberta de raízes, nenhum safepoint e nenhuma cooperação necessária com o otimizador. O compilador TypeScript AOT concorrente contra o qual medimos segue exatamente esse caminho.

Mesmo assim escolhemos um coletor de rastreamento, porque a contagem de referências faz o caso comum pagar pelo raro: cada store de ponteiro atualiza um contador, ciclos exigem um tracer de reserva de qualquer forma, e JS aloca quantidades enormes de objetos que morrem imediatamente — exatamente o caso que uma nursery resolve de graça. Hoje essa decisão parece certa em 14 dos nossos 19 benchmarks de GC e errada em 5; voltaremos a eles no fim.

### Os valores usam NaN-boxing — e estamos desfazendo parte disso

Cada valor JS ocupa uma palavra de 64 bits. Usamos os cerca de 2⁵² padrões NaN livres do IEEE 754 para marcar ponteiros, inteiros pequenos e singletons, deixando todo o resto como um \`f64\` comum:

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

Para o coletor, é um excelente acordo: “esta palavra é um ponteiro?” se resolve com máscara e comparação, sem lookup de tipo por valor durante o rastreamento. Além disso, um número em repouso já contém seus próprios bits IEEE, então um campo numérico não custa box nem header.

Para o *mutator*, porém, é a maior barreira individual entre nós e o V8, e estamos removendo-a ativamente. O problema não é apenas que \`double\` com NaN-boxing seja *uma* representação, mas que seja a **canônica**. Tipos nativos de máquina só existem como overlays locais a uma região, enquanto toda uma família \`materialize_*_to_js_value\` volta a fazer boxing em cada fronteira visível para JS. No IR emitido, um acumulador de loop comprovadamente \`i32\` vive em um \`alloca double\`, sobrevive a \`-O3\` como \`phi double\` através do back-edge e paga uma ida e volta \`fptosi\` + \`sitofp\` **a cada iteração**. Parâmetros de função são uniformemente \`double %argN\`, então uma função quente volta a fazer unboxing dos argumentos milhões de vezes; antes, até locais numéricas eram registradas como raízes GC, embora um número jamais possa ser ponteiro.

A medição decisiva: uma versão fielmente desenrolada de \`_encipher\` do bcryptjs leva 834 ms contra 184 ms no Node — e *adicionar anotações de tipo piorou*, de 834 para 2732 ms, porque dominaram cerca de 80 guards por leitura e a rematerialização nas fronteiras. Fast paths no nível de expressão não corrigem um problema de representação; cada um é outro overlay sobre um cânone boxed e, em código desenrolado, o efeito se inverte.

A direção (\`docs/representation-selection-rfc.md\` e a campanha unbox-by-default) é tornar canônica a forma nativa sem box para todo valor provado estaticamente — escalares, strings, objetos, typed arrays e closures — de ponta a ponta por locais, parâmetros, retornos e slots tipados do heap, restringindo NaN-boxing a valores comprovadamente polimórficos. Ele continua sendo a representação *padrão*, mas deixa de ser a *única*. As fases 1, 2, 3a, 3b, 4a e 4b foram integradas. Static Hermes é a prova de existência. O argumento AOT é que precisamos *provar* tipos onde um JIT pode especular — e isso também é vantagem: um kernel provado não precisa de warmup e não pode sofrer deopt.

Isso afeta o GC diretamente nos dois sentidos. Unboxing remove raízes que o coletor precisaria escanear — um escalar provado não é raiz — e acrescenta uma obrigação: quando um slot do heap guarda algo diferente de uma palavra NaN-boxed, o coletor não consegue mais inferir do valor se ele é ponteiro e precisa consultar uma máscara de layout por shape. Essa maquinaria — \`pointer_mask\`, \`raw_f64_mask\` e as notas de layout — originou vários bugs descritos adiante.

### Um heap por thread, sem compartilhamento

Perry é single-threaded por padrão; \`perry/thread\` oferece \`spawn\` e \`parallelMap\`, e valores cruzam fronteiras entre threads por cópia profunda (\`SerializedValue\`), não por compartilhamento. O custo ergonômico é real, mas o coletor ganha algo grande: **nunca sincroniza com outro thread.** Nenhum protocolo global de safepoint, handshake ou read barrier para invariantes entre threads. Cada arena, scanner de raízes e remembered set é thread-local.

### Geracional, porque a distribuição de alocações diz isso

Há duas regiões por thread: uma nursery (\`ARENA\`, blocos de 1 MB) e uma geração antiga (\`OLD_ARENA\`), um \`GcHeader\` de 8 bytes por alocação, dois bits de envelhecimento (\`HAS_SURVIVED\` e \`TENURED\`) no lugar de contador, e \`PROMOTION_AGE = 2\`. O plano original, escrito em 24 de abril de 2026 antes de qualquer código, resumiu o raciocínio: mais de 90% das alocações JS morrem no escopo que as criou, então uma arena plana passa a vida remarcando objetos obviamente mortos.

O plano também identificou corretamente o pré-requisito do qual depende todo o resto:

> **GC geracional exige raízes precisas.**

Um scanner conservador serve para um coletor que não move: um falso positivo apenas conserva um objeto morto por mais um ciclo. Um coletor *móvel* não pode funcionar assim. Se não for possível enumerar as raízes com precisão, não será possível reescrevê-las; sem reescrita, nada pode ser movido.

### Raízes: uma análise, dois lowerings e statepoints LLVM por padrão

LLVM pode manter valores em registradores, rematerializá-los e fazer spill onde quiser; o coletor não consegue inspecionar nada disso. A resposta do Perry tem duas camadas, e separá-las levou tempo demais.

A **análise** — quais locais contêm ponteiros GC e onde cada uma precisa continuar viva — é independente do backend. O **lowering** dessa resposta no código emitido é uma escolha:

- *Shadow stack.* \`js_shadow_frame_push(n)\` na entrada, um \`js_shadow_slot_bind\` por local de nível JS e \`js_shadow_frame_pop\` na saída. O coletor percorre um frame hospedado no heap.
- *Stack maps nativos via RS4GC.* Allocas de raiz viram \`ptr addrspace(1)\`, funções recebem \`gc "statepoint-example"\` e cada módulo passa por \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\`. LLVM insere sozinho cada statepoint, relocation e reescrita de usos posteriores; na coleta, lemos as raízes de uma seção compacta \`__perry_gcmap\`.

**Desde #7370, o lowering statepoint é padrão.** Não é mais preciso definir \`PERRY_RS4GC=1\`; \`PERRY_RS4GC=0\` volta ao shadow stack para bisseção. A decisão depende do target porque \`gc_map\` se recusa a emitir mapa para um target cujas bases de frame a runtime não sabe resolver — um mapa que ninguém lê perde raízes em silêncio. A regra é raízes nativas onde a runtime consegue caminhar, shadow stack onde não consegue. aarch64/arm64 e x86-64 recebem statepoints; watchOS \`arm64_32\` e Windows ARM64 mantêm o shadow frame. Fallback não significa “sem raízes”, mas o outro lowering da mesma análise.

As evidências para a troca, sem env definida: a suite completa de 479 testes do gap com **0 regressões e 0 falhas de compilação**; todos os **128 testes contendo \`try\`** compilaram, justamente a classe que a antiga bridge statepoint escrita à mão nunca conseguiu tratar; as 10 probes ratchet GC ficaram byte-idênticas ao Node; runtime −1–2%, ligeiramente mais rápido; binário +1,86% nos 81 módulos do zod.

A vantagem real sobre “emitimos um shadow stack” não é 1–2%. Um statepoint carrega **semântica de relocation que o otimizador precisa respeitar**, enquanto o shadow stack só é correto enquanto o otimizador não faz algo inteligente com um valor que esquecemos de spill. As provas aparecem na Parte 3.

Além disso há **79 scanners de raízes runtime registrados** para estado que vive na runtime e não no código do usuário: promises pendentes, callbacks de timers, estado de exceções, stacks de contexto async, caches de shapes, tabela de intern de strings e tabelas temporárias JSON.

Também existe um scanner conservador do stack nativo. Nosso documento de arquitetura o descreve como um de três mecanismos equivalentes; esse texto está desatualizado, e descobrir isso ao escrever foi instrutivo. Na configuração de produção, \`conservative_stack_scan_decision()\` resolve para \`SkipDisabled\`: liveness depende inteiramente do mapa preciso — statepoints, ou shadow frame nos targets de fallback — mais \`RuntimeHandleScope\` nos helpers runtime. O caminho conservador permanece para modos específicos, principalmente coleta no ponto de alocação, não como rede de segurança sob o preciso.

### Write barriers, armadas preguiçosamente

O perigo geracional são ponteiros velho→jovem: um minor GC que só rastreia a nursery precisa conhecê-los. Codegen emite \`js_write_barrier\` em stores de ponteiro e a runtime mantém um remembered set.

O invariante de armamento entregue em #7250 é uma das peças mais reutilizáveis do coletor:

> Enquanto desarmada, a barreira não registra nada. Em troca, a primeira *leitura* do remembered set em um thread não confia no log: reconstrói do heap o conjunto completo de arestas velho→jovem e arma a barreira durante o percurso.

Isso é imposto estruturalmente: \`remembered_dirty_snapshot()\` é \`pub(super)\`, tem sete call sites e todos ficam em \`gc/\`.

*(Nota para quem lê o source: Perry tem duas coisas sem relação chamadas “a barreira” — a write barrier do GC e uma barreira de promoção \`Ptr<Shape>\` em compile time no passe de seleção de representação. Três issues perderam tempo confundindo-as. Sempre diga o arquivo.)*

---

## Parte 2 — As surpresas

### 1. A classe de bug que não deixa evidência

O invariante de rooting cabe em uma frase:

> Qualquer valor gerenciado pelo GC que continue vivo através de um ponto de coleta precisa ser alcançável por uma raiz antes desse ponto. Um valor lido de uma raiz e mantido em registrador SSA durante uma chamada **não está enraizado**: é uma cópia, e o coletor não vê cópias.

Violar isso gera a pior experiência de debugging do projeto. No momento da coleta não há *nada para encontrar*: nenhuma referência pendente, nenhum slot sem forwarding, nenhuma anomalia. Depois a nursery recicla o endereço; o ponteiro stale lê outro objeto válido e o programa morre um ou mais ciclos adiante, em outra função, com \`TypeError: value is not a function\`.

Todas as nossas probes GC runtime são cegas. Scans de from-space saem limpos. Passes de verificação saem limpos. \`PERRY_GC_VERIFY_EVACUATION\` verifica que slots alcançáveis foram forwardados, mas não consegue verificar um registrador cuja existência desconhece.

Já catalogamos cinco formas distintas, todas distribuídas:

| # | Forma | Por que sobreviveu à revisão |
|---|---|---|
| #7184 | Store de raiz emitido em índice fora do frame empilhado | \`js_shadow_slot_bind\` checa limites e faz no-op silencioso; o IR *diz* que está enraizado |
| #7192 | Store de raiz emitido *depois* de chamada que aloca | O slot termina enraizado **e** pendente; passa em toda pergunta “está enraizado?” |
| #7206 | Receiver de método carregado, depois lowering dos argumentos — cada um pode alocar — antes do uso | O load parece obviamente correto isoladamente |
| #7206 | \`base[key]\`: materializar base, baixar expressão da chave e depois usar base stale | Dois operandos; um avaliado primeiro e usado por último |
| #7226/#7239 | Célula thread-local ou estática guarda ponteiro heap que nenhum scanner reescreve | Invisível no IR |

Quatro foram distribuídas **em um único dia**. Cada fix tinha poucas linhas; o custo sempre foi a demora de detecção. Só a primeira é específica do shadow stack. As outras são independentes do lowering e sobreviveram à mudança para statepoints, porque o erro está em *quando o lowering emite a raiz*, não no que é uma raiz.

A única heurística realmente útil: **um bug GC perfeitamente reproduzível significa tabela, não registrador.** Registrador sem raiz só se corrompe se a coleta cair na janela, portanto é intermitente; cache sem raiz quebra na coleta #0 e continua quebrado. Há uma exceção conhecida: um \`&str\` ou \`&[u8]\` emprestado de um \`StringHeader\` do heap e mantido durante chamada que aloca. Rooting reescreve o *slot*; borrow não é slot. A única correção sólida é copiar os bytes para fora do heap antes da primeira alocação.

### 2. Paramos de inspecionar e começamos a construir instrumentos

A virada de #7154 não foi um fix, mas desistir da inspeção depois de dez investigações e construir ferramentas que transformam o bug em falha imediata.

**Quarentena de from-space.** Depois de um minor evacuante, não reciclamos o from-space. Os blocos retirados vão para um anel limitado, são preenchidos com uma poison word cujo primeiro byte parece um \`obj_type\` inválido (\`0xDE\`), e o interior alinhado a páginas recebe \`mprotect(PROT_NONE)\`. Uma dereferência stale agora causa SIGSEGV *na instrução culpada*, com o holder ainda no stack. O reporter informa endereço, qual minor retirou a página e qual objeto vivia ali, restaura \`SIG_DFL\` e falha de novo para o debugger ver o local real.

**GC zeal.** Força um minor evacuante em todo safepoint para que um valor sem raiz seja movido na primeira exposição, não quando uma rajada independente de alocações coincidir por acaso com sua janela. Inspirado em \`--stress-scavenge\` do V8 e \`gcZeal\` do SpiderMonkey.

**Um controle de profundidade que ninguém esperava.** A quarentena é um anel de *N* conjuntos de páginas retiradas, padrão 4. O reproducer \`new C(…)\` de #7154 não falha em 4, 8 ou 100. O constructor cruza cerca de 600 polls de back-edge; quando o return override publica o registrador stale do caller, a página já tem 600 retiradas. Com \`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\`, falha no primeiro uso. “Aumente a profundidade” é agora a primeira dica quando um bug suspeito não reproduz.

Os instrumentos são **testados por sabotagem**, não apenas executados: \`quarantine_catches_a_planted_stale_from_space_deref\` planta a forma #7184/#7192 e exige que o instrumento veja poison onde o controle sem instrumentação lê um objeto reciclado perfeitamente válido. Esse controle mostra que o bug é de fato invisível sem a ferramenta.

Há ainda um instrumento estático: \`scripts/gc_root_dominance_check.py\` lê o IR LLVM emitido e verifica que stores de raízes dominem todos os sites posteriores que podem coletar. Seu gate CI tem allowlist **vazia**; qualquer novo hit deixa o build vermelho. Ainda é estruturalmente cego a tabelas runtime, locais não enraizadas em Rust runtime e símbolos que não nomeia, e dizemos isso explicitamente porque um relatório limpo já foi tratado duas vezes como prova do que ele não podia verificar.

### 3. Metade dos nossos controles não controlava nada

Essa surpresa mudou mais a política de engenharia que o código.

Durante meses, \`PERRY_GEN_GC_EVACUATE\` era o knob usado para provar que uma mudança era segura sob evacuação. Quando finalmente medimos direito — binários idênticos, mesmo host, diff célula a célula de 12 probes ratchet × 8 contadores — moveu **0 de 96 células**. Medianas bit-idênticas. O mesmo procedimento com \`PERRY_GEN_GC=0\` moveu 79 células; o harness era sensível, aquele knob não. Ele controlava um fallback de onde os contadores nunca vinham.

Seu único efeito vivo era uma armadilha: vetava evacuação forçada. Um \`PERRY_GEN_GC_EVACUATE=0\` no ambiente desarmava silenciosamente \`PERRY_GC_ZEAL\`, e um run zeal podia declarar “limpo” sem mover nada.

Não era o único:

- \`PERRY_GC_FORCE_EVACUATE\` era lido **somente no caminho minor**, enquanto todos os testes que o usavam chamavam \`gc()\`, que executava full mark-sweep após scan conservador forçado. Meses de “passa sob evacuação forçada” não significavam nada.
- O knob \`--pressure\` da matriz de stress desligava o caminho medido: hard cap de defer e teto do trigger arena compartilhavam fórmula e colapsavam juntos; o braço \`default\` executava zero copying minor nas 22 linhas.
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\` era totalmente inerte sozinho: scan nunca rodava, nada abortava e o run informava sucesso.
- O doc comment de \`gc_incremental_enabled\` dizia “EXPERIMENTAL — default OFF” oito linhas acima de um comentário no body “DEFAULT ON”. Uma decisão de merge usou o errado.

A política resultante é vinculante em \`CLAUDE.md\`:

> **Toda variável de ambiente GC tem um braço CI obrigatório que exercita o estado OFF ou é removida após uma release de maturação.** No máximo uma variável puramente diagnóstica pode existir por vez, marcada como não testada.
>
> **Um modo que ainda existe é uma decisão ainda não tomada.**

\`PERRY_GEN_GC_EVACUATE\` foi removido, não corrigido. Cada site mantém um comentário-lápide explicando o que havia e por que sumiu — cinco, exatamente onde alguém reintroduziria a conjunção. Uma auditoria CI deriva nomes aceitos dos parsers production não comentados e falha diante de afirmações vivas sobre knobs removidos. O self-test planta um knob apagado atrás de parser comentado e prova que nenhum passa.

### 4. Gates que não podem falhar

\`CLAUDE.md\` lista quatro formas de um gate CI ser estruturalmente incapaz de deixar um merge vermelho. Todas atingiram o repo, três na mesma semana:

1. \`continue-on-error: true\`: \`gc-stress\` manteve isso por meses sendo o único job de correção GC.
2. Não estar nos contexts obrigatórios da branch protection: job que sinaliza falha sem bloquear é documentação, não gate.
3. \`concurrency\` com \`cancel-in-progress\` incondicional: em fila lenta, cada merge cancela o anterior antes de chegar a um runner. \`gc-ratchet\` teve três runs \`main\` cancelados e zero executados.
4. **O gate roda, mas seu sujeito nunca rodou**, o mais perigoso porque o job é realmente verde.

Depois encontramos mais dois. \`gc-stress\` *nunca tinha rodado em \`main\`*: o trigger \`push:\` aceitava só tags e o \`if:\` do job omitia \`schedule\`, então 12 de 12 nightlies apareciam \`skipped\`. E \`lint\` — context *obrigatório* — estava vermelho há mais de três nightlies porque 16 arquivos passaram de 2000 linhas; todo merge entrava por admin bypass. Branch protection era teatro, e um gate novo bem feito ligado a \`lint\` chegaria inerte.

A consequência: **um gate precisa afirmar que o sujeito esteve vivo**, não apenas que nada lançou. Runs zeal imprimem ao sair \`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\` e **saem 70 se algum for zero**. Um run que não exercitou nada fica vermelho, não verde.

### 5. O coletor continuava agendando coletas que não podiam ajudar

Um bug estrutural recorrente, três instâncias independentes e uma forma: *um predicado agenda coleta incapaz de mudar a quantidade que lê.*

**A passagem de promoção dos sobreviventes (#7592).** Um predicado trocava minor por full mark-sweep para abrir espaço old-gen aos sobreviventes a promover. Mas full mark-sweep não move nem promove; não aliviava a pressão e voltava a ser verdadeiro no minor seguinte. Em pipeline JSON de 200 mil registros: **19 de 22 coletas eram esses fulls, cada um liberando 0,0 MB por cerca de 400 ms.** 7,6 s de uma fase de 8,6 s. O copying minor que faria a promoção nunca rodou.

**O cap da nursery (#7690).** Um limite baseado na ocupação de from-space aplicado a minor *não móvel*, que faz sweep in place e deixa from-space ocupado. Depois do trigger, volta a vencer no bloco seguinte: uma coleta de toda a arena por MB alocado, quadrática no conjunto vivo.

**O cap proporcional ao vivo que era ponto fixo.** Uma tentativa usou \`max(base, arena_in_use)\`. Mas o teste compara a ocupação do *from-space* ao cap e, nesse workload, from-space ≈ vivo. Nunca podia cruzar o próprio cap; scavenging parava. Mediu ganho de 5,9× por não fazer trabalho.

Duas regras sustentam nosso pacing:

> **Nunca cadencie uma coleta por uma quantidade que ela não altera.**
>
> **Nenhuma banda constante deve cadenciar um coletor cujo custo por ciclo é O(vivo)**: o trabalho total fica quadrático e uma constante maior só move o precipício.

Corrigir essa família levou um workload JSON de **60,4 s para 3,86 s**, mantendo custo por registro dentro de cerca de 30% num intervalo de tamanho 20× onde antes crescia 70×.

### 6. E uma vez o coletor documentou uma mudança que nunca fez

A linha mais cara da história é um comentário de documentação.

#7690 escreveu todo o argumento para ativar por padrão polls móveis de back-edge em dois comentários — runtime e codegen — e **não mudou nenhum body**. Ambos ainda aceitavam \`1|on|true\`, portanto default OFF, sem teste fixando o padrão. O comentário runtime até dizia que o espelho codegen “MUST agree”; concordavam, mas no valor que a documentação dizia ter mudado.

Não é configuração mais lenta, mas outro coletor. A pressão nursery tem só dois pontos precisos: poll de back-edge e fronteira externa do microtask pump. Sem poll emitido, programa só de computação não alcança nenhum. Toda coleta nursery caía no ponto de alocação, onde um fix anterior as tinha corretamente tornado não móveis. **O coletor distribuído não evacuava a nursery** e caía para full collections da arena inteira.

| benchmark | \`main\` distribuído | polls realmente ligados |
|---|--:|--:|
| tree | 5,10 s | **1,63 s** |
| tree_wide | 7,26 s | **2,12 s** |
| retain | 2,33 s | **1,32 s** |
| churn | 1,00 s | **0,46 s** |
| cycles | 0,29 s | **0,19 s** |

Um benchmark fazia **13 full collections de toda a arena — 0,477 s de pausa —** onde semanas antes fazia **105 copying minors — 0,016 s —**. Pausa total de \`tree\` caiu de 4,107 s para 0,550 s; máxima de 266 ms para 16 ms.

Não foi o tempo que achou, mas os *tipos* de ciclo em \`PERRY_GC_TRACE=1\`: \`{'full': 13}\` onde deveria haver \`{'minor': 105}\`.

Três testes fixam agora o default, incluindo valor desconhecido, e outro fixa o acordo entre crates. O desacordo é silencioso nos dois sentidos — polls que nada consome ou defer que nada drena — e precisa de assertion, não dois comentários.

A classe não está encerrada. Um profiling recente achou a mesma forma na write barrier: **codegen emite load \`seq_cst\` do contador barrier-active — \`ldar\` em aarch64, 42 sites em \`evalNode\` — enquanto runtime lê o mesmo global com \`Relaxed\` para a mesma decisão**. O comentário codegen promete “one relaxed load of a \`static\`”. Dois leitores discordam do ordering e a documentação fica contra o código. No máximo um está certo; se runtime estiver errado, é muito mais grave que \`ldar\`. Foi registrado, não corrigido de propósito: adivinhar errado pode omitir insertion barrier, invisível na coleta e visível ciclos depois como \`TypeError: value is not a function\`.

### 7. O trabalho GC mais rápido é o removido

Eliminados os bugs de pacing, o custo restante se revelou repetidamente trabalho que não deveria existir.

**Um heap onde nada morria era marcado sem parar.** \`retain.ts\` constrói array de 3 milhões de registros e não descarta nenhum. Perry passava **1,26 s de um run de 1,31 s no coletor**, 96%. Node leva 0,13 s. Dois full mark-sweeps recuperavam 4 MB juntos; um não mudava a ocupação em um byte, porque o predicado dependia de crescimento: conjunto vivo crescente cruza limiar a cada duplicação. Fix: precificar full pelo que recupera e mover limiar quando improdutivo.

**Cada objeto evacuado tomava mutex global para hashear map vazio.** Um move hook fazia \`remove\` SipHash no registro residual \`Object.setPrototypeOf\`, vazio em programa sem re-prototipagem. Já havia latch indicando isso; o hook era o único leitor que ignorava. Promover 3 milhões de registros pagava 2,5 milhões de aquisições reais e inúteis.

**Depois paramos de mover os objetos.** Se a nursery de copying minor está quase toda viva, evacuar objeto a objeto é overhead puro: nova alocação old-gen, \`memcpy\`, transferência de layout, accounting, hooks, forwarding stub e reescrita de todos os slots, para mover sem necessidade. Promoção in place de blocos inteiros — page promotion no V8 — só reetiqueta a geração. Nada se move, nada é reescrito:

| workload | antes | depois |
|---|--:|--:|
| retain | 0,81 s | **0,53 s** |
| retain_wide | 1,33 s | **1,07 s** |
| deeplist | 0,30 s | **0,24 s** |
| custo de promoção/objeto | 243 ns | **105 ns** |

**E depois paramos de rastreá-los também.** Três passes ainda percorriam cada sobrevivente: scan dirty do remembered set, drain e \`clear_marks\`. Num ciclo em que nada se move nem pode ser liberado, trace custava 55–67 ns por objeto e o walk que realmente promove cerca de 9 ns. Ciclo de promoção agora pula trace quando a última survival ratio está no regime totalmente vivo, mas recusa se alguma premissa custa: holder de weak target registrado, registro malloc não vazio, mark incremental em andamento ou qualquer dos três instrumentos verify. Cada um usa o trace como sujeito; sem marks poderiam anunciar sucesso sem examinar nada. Resultado: \`retain\` −33,6%, \`deeplist\` −43%, ciclos de 243 ns por objeto agora **8,9 ns**.

A política é uma *medição*, não palpite. Liveness do bloco é desconhecida antes do trace; a decisão usa a survival ratio jovem medida no ciclo anterior. A população foi bimodal por três ordens de grandeza:

| família de workloads | copying minors | survival ratio jovem |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0,999 – 1,000 |
| churn, churn_alloc, push_cls | 105 | 0,000 – 0,004 |
| push_num, cycles | 16–18 | 0,000 |
| tree, tree_wide, churn_read | 0 | *nenhum copying minor roda* |

Ciclo mal previsto retém no máximo alguns por cento da nursery, ciclo de promoção rastreia com frequência suficiente para se medir, e cap contínuo em bytes mortos promovidos limita o steady state.

É preciso dizer claramente: **a história de “um mecanismo” costuma estar errada, e o perfil muda sob seus pés.** Frações de pausa atuais, medidas no mesmo commit da classificação final:

| programa | wall | pausa GC | fração de pausa | ciclos |
|---|--:|--:|--:|--:|
| retain | 159,5 ms | 52,0 ms | 33% | 5 |
| retain1 | 71,4 ms | 38,7 ms | 54% | 3 |
| retain_wide | 206,2 ms | 75,4 ms | 37% | 8 |
| shapes | 64,8 ms | 4,6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

Dois valores eram 93% e 62% uma semana antes; o trabalho desta seção os matou. \`shapes\` em 7% já não é benchmark GC — antes do bug de \`8, 94 ms de 139 ms eram GC e o classificamos “GC de alta sobrevivência” com base nisso. Alavancas GC não o movem mais. Uma razão aparentemente uniforme entre benchmarks era coincidência aritmética, não causa comum.

### 7b. “Zero ciclos” não é “sem custo GC” — um contador lido como conclusão

A linha \`asyncpipe\` diz 0 ms de pausa em 0 ciclos. Internamente escrevemos “mutator puro; toda alavanca GC é irrelevante”. Uma rodada de profiling instruída nessa premissa a refutou.

\`asyncpipe\` nunca imprime \`[gc]\`, mas **cerca de 33% do perfil leaf é maquinaria do coletor**: write barriers, side tables por objeto e rooting \`RuntimeHandleScope\`. Desativar polls móveis de back-edge mede **−14,1% enquanto o programa ainda executa zero ciclos GC**. Um mark/sweep incremental old-gen avança nos polls sem completar ciclo e portanto sem reportar. Era a maior alavanca da rodada, e nossa premissa apontava para longe. (\`PERRY_WRITE_BARRIERS=0\` dá +0,9%: barriers codegen inocentadas, drive incremental não.)

> **Contador de ciclos mede coletas, não o custo do coletor.**

Barriers, manutenção de side table, rooting e slices incrementais ficam do lado mutator e são estruturalmente invisíveis na trace por ciclo. \`0 cycles\` parece conclusão e observa só um mecanismo.

A armadilha relacionada: \`asyncpipe_big.ts\` **não é** versão escalada válida. A 120 batches executa zero ciclos, a 240 dois copying minors, a 1200 GC domina. Escalar para superar ruído temporal criou silenciosamente outro benchmark, a mesma forma das variantes “realistas” vazias de \`9; só foi pego verificando que a propriedade estudada sobrevivia à escala.

### 8. Dezesseis bytes acima da linha

O melhor bug individual da campanha. \`shapes\` gastava 94 ms de run de 139 ms em duas minor collections, reportando survival ratios de 739‰ e 925‰ embora o conjunto vivo real tivesse cerca de 3200 objetos.

\`arena_alloc_gc\` cria qualquer coisa acima de \`LARGE_OBJECT_THRESHOLD_BYTES\` — 16 KB — direto em old-gen e marca \`TENURED\`. O backing store de \`Node2D[]\` com 2000 elementos tem 16.400 bytes. **Dezesseis bytes acima.**

Todo array ficava vivo permanentemente — minor nunca faz sweep de old-gen —, write barrier registrava fielmente aresta velho→jovem para cada store e cada minor seguinte remarcava os 2000: 94.000 e depois 118.006 slots remarcados.

O fix é interessante porque “subir o limiar” seria errado. Cruzá-lo troca *custo de cópia* por *custo de retenção*. Para objeto sem ponteiros, ambos são limitados pelo tamanho, então 16 KB permanece. Para objeto com ponteiros, retenção é transitiva e ilimitada; arrays, objetos e closures recebem 128 KB — \`kMaxRegularHeapObjectSize\` do V8 traça a mesma linha pelo mesmo motivo. A seleção lê o flag \`pointer_free\` existente, não lista de tipos; tipo desconhecido mantém valor conservador.

\`shapes\` caiu de 0,139 s para 0,061 s nessa rodada — 0,058 s e 1,39× *mais rápido* que Node no sweep final —, RSS máximo 71,4 MB → 32,3 MB. Os outros 18 programas ficaram em ±1,3%.

### 9. Medir foi mais difícil que corrigir

Lista parcial de coisas que produziram conclusão confiante e errada:

- **Benchmark contra \`main\` quebrado.** Por dias programas intensivos em alocação estavam cerca de 20× lentos — surpresa #6 —, tornando A/B inútil. Assinatura independente de carga: 105 → 1304 coletas. Ninguém olhou porque tempos eram apenas *ruins*, não absurdos.
- **Relink auto-optimize reconstrói runtime com \`--no-default-features\`**, removendo \`diagnostics\` silenciosamente. \`PERRY_GC_TRACE\` não imprime e ciclos parecem **0**. Uma investigação concluiu “zero coletas” em três braços.
- **Baseline ratchet fixada em outro host e trinta versões atrás** informou 29 “regressões” que eram drift. Sempre medir os dois braços em sequência na mesma máquina.
- **Ganho de pretenuring 108 MB → 0 era confound**: braço base precedia mudança intermediária. Mecanismo certo, alvo errado — árvore de parse alocada pela runtime, não literais visíveis ao codegen — e teto cerca de 1 MB.
- **Cronometramos programa que crashava por semanas.** Binário concorrente imprime resposta correta em \`deeplist\` e sai −11 (SIGSEGV) em drop recursivo de refcount. Registramos como derrota. Agora todo harness guarda exit code por célula.
- **\`grep -c\` sai 1 com zero matches**, truncando cadeias \`&&\`. Também pipe \`PERRY_GC_TRACE\` com SIGPIPE e saída 141.

Regras sobreviventes: cite contador do censo, não relógio — é independente de carga —; compare os *binários* antes dos timings; afirme que a comparação realmente comparou algo; confira que o braço alegado esteve vivo.

---

## Parte 3 — As duas estradas longas

### Statepoints: o caminho escolhido, após quatro meses e três pré-requisitos

Desde o primeiro protótipo, o \`gc.statepoint\` do LLVM era obviamente o mecanismo superior em correção. Ele oferece **semântica de relocation que o otimizador precisa respeitar**; o shadow stack só permanece correto enquanto o otimizador não fizer nada inteligente com um valor que esquecemos de fazer spill. O interessante é tudo entre “obviamente melhor” e “distribuído por padrão”, porque nenhum atraso foi sobre performance.

**Ele estava bloqueado por coisas que não eram GC.** Exceções eram baixadas para \`setjmp\`/\`longjmp\`, e um \`longjmp\` pode saltar *além* de um \`gc.relocate\`, impedindo a reescrita do ponteiro relocacionado. Sob RS4GC é pior: \`mem2reg\` não promove as allocas \`volatile\` exigidas pela correção de setjmp, então raízes da região \`try\` nunca entram em SSA nem são relocacionadas. \`gc.statepoint\` possui a forma \`invoke\` justamente para isso. Assim, a estrada até statepoints passou por apagar todo o lowering de exceções setjmp do Perry e substituí-lo por invoke/landingpad (#7302/#7305), e por levar o LLVM para dentro do processo (#7301) para controlarmos o pipeline de passes. Nenhum deles era ticket de GC.

**O compromisso tentador era a armadilha.** “Manter shadow stack para funções com \`try\`” esteve na mesa e teria cristalizado dois mecanismos de raízes para sempre. Também esteve “apagar shadow stack, manter statepoints” — algo que descobrimos não ser *expressável*, porque statepoints são um lowering alternativo da análise do conjunto de raízes do shadow stack, não um mecanismo independente. Separar o predicado (#7340) tornou possível tanto o padrão por target quanto uma futura remoção; antes disso, \`PERRY_SHADOW_STACK=0\` com statepoints produzia binário com **nenhuma raiz precisa**, sem seção \`__perry_gcmap\`, saída correta e nada que o distinguisse de um build bom até uma coleta liberar algo vivo.

**Um dos dois backends precisava morrer.** Por algum tempo mantivemos uma bridge statepoint explícita, escrita à mão, ao lado do RS4GC. Nunca foram pares: a bridge não conseguia enraizar um \`invoke\` e recusava funções com \`try\`; também era fallback silencioso do RS4GC, exatamente a configuração não testada que a política de eliminar knobs busca impedir. Antes de apagá-la medimos: **1.574 funções de um app Drizzle real e das probes ratchet foram todas baixadas como RS4GC; nenhuma caiu no fallback.** Foram embora a bridge, sua análise de liveness baseada em CFG, parser de calls, emitter, enum \`PreciseRootBackend\` e knob \`PERRY_STATEPOINTS\`. Agora um bail é falha dura que nomeia a função, não downgrade.

**E então o padrão foi distribuído sem cobertura.** Raízes nativas eram padrão em todo target caminhável havia meses, enquanto **nove mecânicas do lowering de raízes tinham zero assertions sobre o lowering que Perry realmente emite**. Três testes que pareciam cobertura não mediam nada: afirmavam que \`js_shadow_slot_bind\` estava *ausente*, o que no padrão nativo é verdade para qualquer programa, enraizado ou não. O hazard 4 de novo, justamente no sistema cuja função é não perder raízes silenciosamente. #7653 corrigiu com três pontos de observação — IR antes de \`opt\`, bundles \`"gc-live"\` após RS4GC e blob \`__perry_gcmap\` decodificado — porque cada um é cego ao que o seguinte captura. O verificador estático de dominância tinha o problema inverso: ancorava em \`@js_shadow_slot_bind\`, então compilava seu corpus com \`PERRY_RS4GC=0\`; verificava um lowering que já não distribuíamos até #7663 ensiná-lo sobre statepoints.

Uma lei de design saiu do experimento, paga por resultado negativo medido: **metadados de raízes sem semântica de relocation são incorretos sob compilador otimizador.** Um esquema compacto de metadados por função gerou mapas 10–13× menores e corrompeu deterministicamente um loop churn de 10 linhas — não por erro nos mapas, mas porque o mutator lê from-space por valores SSA derivados do heap que apenas relocation consegue corrigir. Barriers restringem ordem de memória; não restringem fluxo de dados.

### Unboxing: em andamento, e agora é o evento principal

A outra estrada longa vem da Parte 1: tornar a representação nativa sem box canônica e rebaixar NaN-boxing a fallback polimórfico. As fases 1 — locais escalares —, 2 — ABI especializada —, 3a/3b — strings e locais ponteiro \`Ptr<Shape>\` — e 4a/4b — heap tipado: arrays numéricos e depois bookkeeping que o layout boxed pagava sem necessidade — foram integradas.

Duas coisas merecem relato honesto.

**Uma subfase foi avaliada e rejeitada, e o motivo é um elogio ao NaN-boxing.** Campos de objeto *unboxed* — manchete original da fase 4b — foram descartados após reconhecimento, não construídos. Um slot de campo \`number\` já contém bits IEEE crus, porque NaN-boxing reserva apenas \`0x7FF9..=0x7FFF\`; portanto \`raw_f64_mask\` do layout é bit de *prova*, não alteração de armazenamento, e o guard de leitura já tinha sumido. Handles de string crus em repouso destruiriam a otimização de strings pequenas, materializando short strings no heap sem motivo. E slots \`i1\`/\`i32\` crus exigiriam terceira máscara e consulta ao layout em cerca de 25 sites de leitura direta, incluindo \`JSON.stringify\`, \`util.inspect\` e serde de \`v8\` — hot paths, não raridades como o argumento supunha. Em vez disso distribuímos elision: store em campo de receiver provado aposenta a nota de layout se o valor é não ponteiro por construção, e aposenta addref de string se o valor não pode ser heap string.

**E o GC entregou à campanha seu próximo alvo.** A medição final da Parte 4 mostra que o coletor já não é a restrição dominante no cluster mais difícil: o mutator é, especificamente porque **um objeto literal de dois campos ocupa 72 bytes**. Esse é problema de representação no sentido exato do RFC e é para onde “objetos reais” segue agora.

### Estradas não tomadas

**Concorrência.** A diretriz do proprietário, perguntada diretamente:

> “Não quero perseguir paralelismo/concorrência por si só. Deve ser um recurso posterior para trabalho que precisa acontecer, mas não às custas do hot path.”

Essa restrição *decide* o design em vez de adiá-lo. As três famílias diferem justamente onde cobram do mutator: stop-the-world paralelo não cobra nada dele — threads de GC vivem apenas dentro da pausa —; marking concorrente cobra store barrier em toda escrita de ponteiro; compaction concorrente cobra **load barrier** em toda leitura de ponteiro. Leituras superam stores de longe, então a última é o não mais forte. STW paralelo é o único design admissível e fica em terceiro, depois de (1) apagar trabalho por objeto que não deveria existir e (2) pretenure da coorte imortal. Paralelizar 2,1 milhões de visitas que não deveriam ocorrer é usar quatro cores para fazer mais rápido o trabalho errado.

A medição concordou de forma independente e ainda mais forte. Após o trabalho de §7, as visitas por objeto no pior caso de promoção se dividiram aproximadamente entre trabalho eliminado e **9,6 ms de um programa de 159 ms**. Não resta tempo de coletor suficiente para justificar paralelismo: 2× no trabalho GC daria 3% no programa. GC paralelo não é plano adiado; neste conjunto é uma não alavanca medida.

Há também argumento de correção que levamos mais a sério que o de performance: hoje, “bug GC perfeitamente reproduzível significa tabela, não registrador” é diagnóstico real. Coletor paralelo o destrói e transforma 79 scanners de raízes e cada cache \`thread_local!\` em possível data race.

**Desfragmentação de páginas antigas — distribuída ligada por padrão e revertida no mesmo dia.** É o caso mais recente e exemplo mais limpo da regra 1.

Compactar páginas antigas parcialmente vivas estava desligado desde bug de 2026-07 que reproduziu referência stale fora do heap para objeto antigo movido — corrupção 6/6 quando habilitado. Religar foi tratado como *projeto de contrato de reescrita*, não flip de env, e a issue definiu o critério: enumerar todos os caminhos de metadados/IC/cache que possam reter endereço antigo móvel e **“só reativar defrag após o reproducer e um corpus de stress em escala de dependências ficarem limpos”.**

O trabalho de contrato entrou e passa em auditoria: allowlist de dominância ainda vazia, então cerca de 40 hits antes excepcionados foram corrigidos, não suprimidos de novo; política de holders runtime foi *apertada*, fazendo veredictos \`open_gap\` e \`unverified\` falharem; e os dois caches cuja segurança dependia explicitamente de “só defrag de old-gen pode movê-los” foram corrigidos, não isentos. Até honrou um tripwire: a exceção apagada tinha cláusula \`becomes_real_when\` nomeando exatamente esse gatilho.

O **flip do padrão** veio junto, e essa parte não tinha evidência — porque estruturalmente não pode obter nenhuma na suite. Seleção exige \`dead_bytes >= live_bytes\` numa página antiga, ou seja, promover e depois morrer em escala. A família \`retain\` sobrevive a 999–1000‰ e a família \`churn\` quase nada promove, então **nenhum benchmark nosso produz página candidata.** A suite não oferece sinal de benefício nem de regressão, mas herda toda a superfície de reescrita de endereços antigos. Todos os gates GC ainda estavam na fila, sem executar, quando entrou.

Mantivemos todo o trabalho de correção e revertemos o padrão para opt-in até existir workload de fragmentação que realmente o exercite; então o braço perdedor será apagado, não deixado em pé. A nova regra:

> **Uma feature que sua suite de benchmarks não consegue acionar é uma feature que ela não consegue defender.** Distribua desligada até existir workload capaz disso, ou aceite que os dois braços não são testados.

**Pretenuring.** Construído duas vezes, medido, refutado e estacionado com condição escrita para reabrir. A solução arquitetonicamente correta — colocar objetos longevos em old-gen ao nascer — perdeu para a solução emergentemente suficiente — seed de promoção na primeira cópia que limita qualquer coorte a um salto. Em toda carga construível, os braços eram indistinguíveis. A meta-lição entrou direto na prática: **teste a forma discriminante antes de construir o invariante.**

---

## Parte 4 — Como está indo

Sweep final em 2026-08-12, M1 mini quieto e fixado, melhor de 5, exit code verificado, saída conferida byte a byte contra \`node --experimental-strip-types\` antes do timing. 19 benchmarks com perfil de GC contra Node 26.5.1 e concorrente AOT com contagem de referências.

**Perry vence Node em 9 de 19** — eram 3 de 19 no começo da rodada —, **vence o compilador com contagem de referências em 14 de 19** e fica **a menos de 1,3× do Node em 15 de 19.**

| bench | perry | node | P/node | Δ nesta rodada |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

Restam dois clusters **disjuntos**; tratá-los como um mecanismo é erro que já cometemos:

1. **Contra Node — dispatch e mutator, em geral não GC.** \`iso_miss\`, \`interp\`, \`pipeline\`, \`asyncpipe\`. Principalmente dispatch polimórfico de propriedades, inline caches e seleção de representação: outra campanha. Mas leia a correção abaixo antes de interpretar os 0% de \`asyncpipe\` como “não há GC aqui”.
2. **Contra o compilador com contagem de referências — família \`retain\`.** \`retain1\` 1,80×, \`retain_wide1\` 1,67×, \`retain_wide\` 1,65×. Todos já vencem Node. São linhas em que nada morre, precisamente onde esperávamos que coletor de rastreamento fosse pior — expectativa que se mostra errada de modo interessante.

E aqui está o achado que reformula a campanha inteira, vindo do sweep final: **nesse segundo cluster, o coletor já não é a restrição dominante — o mutator é.** Subtraia *toda* pausa GC e \`retain_wide\` — 130,8 ms de mutator puro — e \`shapes\` — 60,2 ms — ainda perdem. \`retain\` precisaria de GC exatamente zero para empatar. O custo real é que **um objeto literal de dois campos ocupa 72 bytes**, então \`retain\` escreve **216 MB de memória para armazenar 48 MB de números** — amplificação de escrita de 4,5×. A vantagem do concorrente nessas linhas nunca foi refcount; é compacidade. Agora é problema de representação (#7916), não de coletor: a campanha unbox-by-default da Parte 1 aplicada ao layout dos objetos, não aos escalares.

Há defeito correspondente no outro cluster: \`asyncpipe\` coleta a 1.200–1.650 ns por objeto, incluindo uma **minor collection de 122 ms que processou zero objetos** — mais longa que o programa inteiro. Custo por ciclo independente do número de objetos é overhead fixo, e é a última parte do coletor ainda visível no caminho crítico (#7915).

Uma tentativa que registramos como resultado negativo, porque é o próximo passo óbvio e está errada: **não reduza a primeira nursery.** Ciclo 0 é 58–81% da pausa GC na família retain, então limitar parece grátis: a 2 MB, a pausa de \`retain\` cai de 52 para 31 ms. Mas \`asyncpipe\` passa de 0 coletas a 4, custando 385 ms num programa de 127 ms, e a promoção mais cedo reposiciona o trigger old-gen em full mark-sweeps extras — \`retain_wide1\` +182%.

Para dimensionar o ponto de partida: o pipeline JSON que abriu a campanha foi de 60,4 s para 3,86 s. A família \`retain\` avançou 36–46% numa única rodada do trabalho acima. E o coletor inteiro ainda possui kill switch para full mark-sweep — \`PERRY_GEN_GC=0\` — que mantemos exercitado, porque no dia em que não pudermos fazer bisseção contra ele deixaremos de confiar em qualquer número daqui.

---

## As regras com que trabalhamos agora

Quase tudo que aprendemos se generaliza além de garbage collection:

1. **Um modo que ainda existe é uma decisão ainda não tomada.** Apague o braço perdedor ou mantenha um braço que o exercite. Deixe comentário-lápide onde o apagou.
2. **Um gate precisa afirmar que seu sujeito esteve vivo**, não apenas que nada lançou erro. “Verde porque não executou nada” é pior que vermelho.
3. **Nunca ritme loop de feedback por quantidade que ele não consegue mover.** Três livelocks independentes, uma forma.
4. **Nenhuma faixa constante pode ritmar processo O(vivos).** Constante maior apenas move o precipício.
5. **Quando uma classe de bug não deixa evidência, pare de investigar e construa o instrumento.** Depois teste-o por sabotagem, inclusive com controle sem instrumentação que prove que o bug era invisível.
6. **Um doc comment não é mudança.** Fixe defaults com testes, incluindo valor não reconhecido, e fixe a concordância entre componentes que precisam coincidir.
7. **Meça os dois braços no mesmo host, a partir da mesma árvore, e confira o exit code.**
8. **Teste a forma discriminante antes de construir o invariante.**
9. **Recuse o híbrido permanente.** “Manter o mecanismo antigo para casos difíceis” é como migração vira dois mecanismos para sempre. Faça o caso difícil funcionar ou não migre.

O coletor não está terminado. Pela primeira vez, está *legível*: cada knob controla algo, cada gate pode falhar, cada default é fixado por teste e todo número publicado foi medido em máquina quieta com saída verificada primeiro. Essa legibilidade deu mais trabalho que o coletor, e é a única razão para os números do último mês terem mudado.`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
