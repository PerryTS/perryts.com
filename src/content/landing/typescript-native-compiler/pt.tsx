import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compilador Nativo de TypeScript: Como o Perry Compila TS para Código de Máquina",
  description:
    "Perry é um compilador nativo de TypeScript escrito em Rust: parsing SWC, HIR tipado, monomorfização, codegen LLVM. Binários nativos para 10 plataformas, sem VM.",
  breadcrumb: "Compilador Nativo de TypeScript",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Um Compilador Nativo de TypeScript,{" "}
            <span className="gradient-text">Construído em Rust</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            O Perry compila o TypeScript que você já escreve para código de
            máquina — da mesma forma que um toolchain de Rust ou Go compila
            sua linguagem. Sem JavaScript transpilado, sem máquina virtual,
            sem runtime no sistema de destino.
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Não é um transpilador. Não é um runtime.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            A maior parte das ferramentas de TypeScript se divide em duas
            famílias. Transpiladores —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild —
            verificam e removem os tipos, depois emitem JavaScript para um
            motor executar depois. Runtimes — Node.js, Bun, Deno — são esses
            motores: eles analisam, interpretam e compilam o JavaScript via
            JIT toda vez que seu programa inicia.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Um compilador nativo é a terceira família, e para TypeScript ela
            tem estado praticamente vazia. O Perry trata as anotações de
            tipo não como documentação a ser removida, mas como a entrada
            que direciona a geração de código. O resultado de{" "}
            <code className="text-slate-300">perry compile main.ts</code> é
            um executável standalone contendo código de máquina —
            tipicamente{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB, iniciando em cerca de um milissegundo
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">O pipeline, passo a passo</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Análise (SWC).</strong> Os
              arquivos-fonte são analisados com o SWC, o parser de
              TypeScript nativo em Rust, então até projetos grandes são
              analisados em milissegundos. A geração de código dos módulos,
              os passes de transformação e a varredura de símbolos rodam em
              paralelo entre os núcleos.
            </li>
            <li>
              <strong className="text-slate-300">Resolução de tipos.</strong>{" "}
              O compilador resolve os tipos declarados e infere o restante,
              dando a cada expressão um tipo concreto antes do início da
              geração de código.
            </li>
            <li>
              <strong className="text-slate-300">
                HIR tipado e monomorfização.
              </strong>{" "}
              A AST é rebaixada para um IR tipado de alto nível. Funções e
              classes genéricas são monomorfizadas — cada instanciação como{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> é
              compilada separadamente com seus tipos concretos, então os
              generics não custam nada em tempo de execução. Onde os tipos
              são conhecidos, chamadas de método se tornam dispatch estático
              e campos de objeto se tornam acessos diretos, de deslocamento
              fixo.
            </li>
            <li>
              <strong className="text-slate-300">Codegen (LLVM).</strong> O
              HIR é rebaixado para LLVM IR e passa pelo pipeline de
              otimização do LLVM — inlining, otimizações de loop,
              vetorização — depois é emitido como código de máquina para o
              alvo.
            </li>
            <li>
              <strong className="text-slate-300">Link.</strong> A saída é um
              executável normal da plataforma: Mach-O no macOS, ELF no
              Linux, PE no Windows — além de alvos mobile, relógio, TV e
              WebAssembly.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            O lado do LLVM nisso tudo — por que o LLVM foi escolhido em vez
            do Cranelift, como o NaN-boxing representa valores dinâmicos, o
            que o otimizador faz com IR tipado — tem seu próprio
            aprofundamento:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript sobre LLVM
            </Link>
            . Detalhes de implementação como NaN-boxing, dispatch estático e
            abstrações de custo zero são cobertos em{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              detalhes internos do compilador
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            E quanto a código dinâmico e npm?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript continua sendo JavaScript por baixo, e um compilador
            nativo de TypeScript precisa ser honesto sobre isso. A
            conformidade do Perry com a suíte oficial test262 é medida e
            publicada — na v0.5.1146, a semântica de String está em 79% e a
            de Array em 72%, ambas subindo a cada release. Pacotes npm de
            TypeScript/JavaScript puro compilam nativamente via{" "}
            <code className="text-slate-300">perry.compilePackages</code>:
            axios, zod v4, express, fastify e hono compilam e rodam hoje.
            Código que precisa da semântica completa de um motor pode optar
            por um runtime V8 embutido opcional com{" "}
            <code className="text-slate-300">--enable-js-runtime</code>.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            A história completa está em{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Pacotes npm reais e uma varredura de conformidade
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Como o Perry se relaciona com outros esforços de &ldquo;TypeScript
            nativo&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            O Perry não é o único projeto que olhou para as anotações de
            tipo do TypeScript e viu uma oportunidade de compilação — mas as
            abordagens diferem drasticamente. O AssemblyScript compila uma
            linguagem estrita parecida com TypeScript apenas para
            WebAssembly: ele é deliberadamente incompatível com JavaScript,
            e não produz executáveis de SO nem UI nativa. O Static Hermes da
            Meta compila ahead-of-time um subconjunto tipado de JavaScript
            dentro do motor Hermes, principalmente para o React Native — em
            meados de 2026 ele continua sendo um projeto de pesquisa que
            precisa ser compilado a partir do código-fonte, e o motor Hermes
            V1 que de fato chegou ao React Native não inclui os recursos
            estáticos (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              comparação completa
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            A aposta do Perry é diferente em ambos os eixos: TypeScript
            padrão como linguagem de entrada, e executáveis comuns da
            plataforma — CLI, servidor e GUI — como saída, instaláveis hoje
            via Homebrew, APT, winget ou npm.
          </p>

          <h2 className="text-2xl font-bold mb-6">Um compilador, dez alvos</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Como a geração de código passa pelo LLVM, um único código
            compila para macOS, iOS, iPadOS, Android, Linux, Windows,
            watchOS, tvOS, WebAssembly e Web/JS puro — incluindo compilação
            cruzada de binários Windows, macOS e iOS a partir de uma máquina
            Linux. Aplicações GUI usam{" "}
            <code className="text-slate-300">perry/ui</code>, uma API
            declarativa sobre widgets reais da plataforma (AppKit, UIKit,
            GTK4, Win32, Android via JNI) — sem nenhum webview envolvido.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Como isso se compara a outras abordagens:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native e Static
              Hermes
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
              Experimente o compilador
            </h2>
            <p className="text-slate-400 mb-6">
              Instale o Perry e compile seu primeiro binário nativo em menos
              de um minuto.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Começar
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Ler a Documentação
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
