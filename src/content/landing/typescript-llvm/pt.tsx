import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript sobre LLVM: Monomorfização e Codegen Nativo",
  description:
    "Como o Perry rebaixa TypeScript para LLVM IR — HIR tipado, monomorfização, NaN-boxing — e por que o backend migrou de Cranelift para LLVM por desempenho AOT.",
  breadcrumb: "TypeScript sobre LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript sobre <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Como o Perry rebaixa uma linguagem projetada para motores JIT em
            LLVM IR — monomorfização, NaN-boxing, lowerings inline — e por
            que ele deixou o Cranelift.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Detalhes Internos do Compilador
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Ver no GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Por que LLVM para TypeScript?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Um compilador ahead-of-time vive em um regime diferente de um
            JIT. Um JIT compila enquanto o usuário espera, então a latência
            de compilação é a restrição. Um compilador AOT como o Perry
            compila uma vez — na máquina do desenvolvedor ou na CI — e o
            binário é executado milhões de vezes depois. Essa assimetria é
            exatamente onde um otimizador pesado se paga.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            O LLVM traz duas décadas de trabalho de middle-end: vetorização
            de loops, loop-invariant code motion, global value numbering,
            sparse conditional constant propagation, inlining agressivo,
            análise de alias. O trabalho do Perry é entregar a essa
            maquinaria um IR que ela realmente consiga otimizar — e é aí que
            entra a informação de tipos do TypeScript.
          </p>

          <h2 className="text-2xl font-bold mb-6">O pipeline de lowering</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            O código-fonte é analisado com SWC, depois rebaixado para um IR
            tipado de alto nível (HIR) onde as decisões interessantes
            acontecem antes mesmo do LLVM ver o código:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorfização.</strong>{" "}
              Funções e classes genéricas são especializadas por
              instanciação concreta, a mesma estratégia que Rust e C++
              usam.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> e{" "}
              <code className="text-slate-300">{`Stack<string>`}</code> se
              tornam duas funções independentes e totalmente tipadas — então
              o otimizador trabalha com tipos concretos em vez de um blob de
              dispatch genérico, e os generics não custam nada em tempo de
              execução.
            </li>
            <li>
              <strong className="text-slate-300">Dispatch estático.</strong>{" "}
              Quando o tipo do receptor é conhecido em tempo de compilação,
              as chamadas de método compilam para chamadas diretas que o
              LLVM pode inlinar, não buscas em hash-table.
            </li>
            <li>
              <strong className="text-slate-300">
                Acesso direto a campos.
              </strong>{" "}
              Os campos de objeto se resolvem para índices em tempo de
              compilação, então a leitura de uma propriedade é um load de
              deslocamento fixo — não uma busca em dicionário.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing e lowerings inline
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Onde os valores são dinâmicos, o Perry usa NaN-boxing: todo
            valor é uma palavra de 64 bits. Doubles são armazenados
            diretamente; objetos, strings, booleans,{" "}
            <code className="text-slate-300">null</code>, e{" "}
            <code className="text-slate-300">undefined</code> são
            codificados nos padrões de bits não utilizados de um NaN
            silencioso IEEE 754. Números têm custo zero — sem boxing, sem
            alocação para aritmética.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            O problema é que operações em valores que não são números
            precisam de sequências de bits de desempacotar-operar-reempacotar.
            Se essas sequências existirem como chamadas para um runtime
            compilado separadamente, o LLVM enxerga caixas-pretas opacas e
            não consegue otimizar através delas. Por isso o Perry emite
            operações frequentes — leituras de propriedade, dispatch de
            método, alocação de objetos — como LLVM IR inline que o
            otimizador pode fundir e simplificar. A alocação de objetos, por
            exemplo, compila para uma bump allocation inline thread-local:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — inline bump allocation</span>
            </div>
            <pre className="text-sm text-slate-300 overflow-x-auto">
              <code>{`%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr        ; current bump offset
%new_off = add i64 %offset, 96           ; headers + 8 fields
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr         ; block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow`}</code>
            </pre>
          </div>

          <h2 className="text-2xl font-bold mb-6">Por que não Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            O primeiro backend do Perry era o Cranelift — o codegen por trás
            do wasmtime, construído para compilação rápida e previsível. Foi
            o ponto de partida certo, e continua sendo uma excelente escolha
            para JITs e runtimes sandboxed. Duas coisas forçaram a mudança:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">O teto do otimizador.</strong>{" "}
              O Cranelift é deliberadamente um compilador rápido de camada
              única: &ldquo;código decente rapidamente&rdquo;, o que é a
              troca certa para um JIT e a errada para um compilador AOT cujo
              diferencial é o desempenho nativo máximo.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> O Apple
              Watch usa uma ABI (instruções de 64 bits, ponteiros de 32
              bits) que o Cranelift não suporta. Para o watchOS existir como
              alvo, o LLVM era necessário — e manter dois backends
              significava dois conjuntos de bugs, testes e baselines de
              desempenho.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            A migração não saiu de graça: o primeiro release apenas-LLVM
            regrediu alguns benchmarks em até 70x porque as operações
            frequentes inicialmente passavam por chamadas opacas a helpers
            do runtime. A recuperação — lowerings inline, o bump allocator
            acima, melhores limites de inlining — levou o backend a superar
            os números do Cranelift, e quando as coisas se estabilizaram o
            Perry venceu o Node.js em todos os benchmarks da sua suíte, de
            1,7x a 24,6x com dois empates (abril de 2026). O post-mortem
            completo vale a leitura:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              De Cranelift para LLVM
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Aprofundando</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            A{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              página de detalhes internos do compilador
            </Link>{" "}
            cobre NaN-boxing, monomorfização e dispatch estático em mais
            detalhes. No blog,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Otimizando tudo
            </Link>{" "}
            percorre o trabalho de otimização release por release, e{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              GC geracional, JSON preguiçoso e benchmarks que aguentam
              escrutínio
            </Link>{" "}
            explica como funciona a metodologia de benchmark (RUNS=11,
            mediana + p95). Para o panorama geral, comece pela{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              visão geral do compilador nativo de TypeScript
            </Link>
            .
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Veja a saída você mesmo
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              código de máquina nativo, sem motor anexado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Começar
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Ver no GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
