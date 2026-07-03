import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Compile TypeScript para um Binário (Executáveis Standalone)",
  description:
    "Compile TypeScript para um binário: executáveis nativos standalone de 2–5 MB, sem Node.js. Como o Perry se compara a bun build --compile e Node SEA.",
  breadcrumb: "Compile TypeScript para um Binário",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Compile TypeScript <span className="gradient-text">para um Binário</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Um único comando transforma <code className="text-slate-300">main.ts</code>{" "}
            em um executável nativo standalone. Sem Node.js na máquina de
            destino, sem runtime empacotado, sem etapa de instalação para seus
            usuários.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Instalar o Perry
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

          <div className="max-w-2xl mx-auto text-left">
            <div className="code-block glow">
              <div className="flex items-center gap-2 mb-4 text-slate-500">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs">terminal</span>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-slate-500">$</span>{" "}
                  <span className="text-cyan-400">perry</span> compile main.ts
                </p>
                <p className="text-green-400">
                  ✓ Compiled executable: main (2.3 MB)
                </p>
                <p className="mt-4">
                  <span className="text-slate-500">$</span> ./main
                </p>
                <p className="text-slate-300">Hello, World!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Três coisas que as pessoas chamam de &ldquo;compilar
            TypeScript&rdquo;
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Quando desenvolvedores pesquisam como compilar TypeScript para um
            binário, geralmente encontram três técnicas bem diferentes que
            compartilham uma palavra:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Transpilação.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC e esbuild
              transformam TypeScript em JavaScript. A saída ainda precisa de
              Node.js, Bun ou um navegador para rodar. Nenhum binário está
              envolvido.
            </li>
            <li>
              <strong className="text-slate-300">Runtime embutido.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code> e as Single
              Executable Applications (SEA) do Node.js concatenam seu
              JavaScript empacotado com uma cópia completa do runtime. Você
              obtém um único arquivo, mas o motor viaja junto dentro dele e
              seu código ainda é analisado e compilado via JIT toda vez que o
              processo inicia.
            </li>
            <li>
              <strong className="text-slate-300">
                Compilação nativa ahead-of-time.
              </strong>{" "}
              É isso que o Perry faz. O TypeScript é analisado com SWC, os
              tipos são resolvidos, os generics são monomorfizados, e o LLVM
              emite código de máquina. O linker produz um executável normal —
              a mesma classe de artefato que um toolchain de Rust, Go ou C++
              produz. Não há motor JavaScript algum no binário.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Como não há motor para inicializar nem nada para analisar na
            inicialização, um binário do Perry inicia em cerca de um
            milissegundo. O próprio pipeline é descrito com mais
            profundidade na página do{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilador nativo de TypeScript
            </Link>{" "}
            e em{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              detalhes internos do compilador
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Qual é o tamanho do binário?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            O tamanho depende do que você importa, porque apenas o código que
            você realmente usa é compilado e vinculado:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              Um hello world tem cerca de{" "}
              <strong className="text-slate-300">330 KB</strong>.
            </li>
            <li>
              Ferramentas de CLI típicas ficam em{" "}
              <strong className="text-slate-300">2–5 MB</strong>.
            </li>
            <li>
              Aplicações completas que vinculam frameworks grandes (Fastify,
              mysql2 e afins) ficam em cerca de{" "}
              <strong className="text-slate-300">48 MB</strong>.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Para efeito de comparação: um executável Node SEA é uma cópia do
            próprio binário <code className="text-slate-300">node</code>,
            então ele começa em cerca de 88–118 MB dependendo da plataforma
            antes mesmo de adicionar seu código, e um hello world compilado
            com o Bun mede cerca de 60 MB no macOS arm64 e cerca de 100 MB no
            Linux x64, porque todo o runtime do Bun é embutido.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Os três te dão um único arquivo que você pode entregar a alguém.
            Fora isso, são ferramentas muito diferentes, e cada uma é a
            resposta certa para alguém:
          </p>
          <div className="overflow-x-auto mb-8 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">
                    Perry
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    bun build --compile
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">
                    Node SEA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    O que produz
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Código de máquina compilado AOT (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JS empacotado + runtime do Bun embutido
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Cópia do binário node com seu script empacotado injetado
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Modelo de execução
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Código nativo, sem motor JS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (JavaScriptCore) em tempo de execução
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    JIT (V8) em tempo de execução
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Tamanho do hello world
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64) a mais de ~100 MB (Linux/Windows)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (tamanho do binário node)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Inicialização
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Compilação cruzada
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10 alvos, incluindo Windows/macOS/iOS a partir do Linux
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Sim — Linux, Windows, macOS via --target
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Não — em vez disso, copie um binário node específico da
                    plataforma
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Compatibilidade JS/npm
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Crescente: axios, zod v4, express, fastify, hono compilam
                    nativamente; runtime V8 opcional para o restante
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Completa — é o próprio runtime do Bun
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    Semântica completa do Node; requer pré-empacotamento,
                    apenas CommonJS no Node 24 LTS
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Status
                  </td>
                  <td className="px-4 py-3 text-slate-400">Pré-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Estável</td>
                  <td className="px-4 py-3 text-slate-400">
                    Estabilidade &ldquo;em desenvolvimento ativo&rdquo; no
                    Node 24 LTS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Colocando as coisas com honestidade: se sua aplicação depende do
            ecossistema npm completo e você quer risco zero de
            compatibilidade, Bun e Node SEA rodam exatamente a semântica de
            motor contra a qual você já desenvolve — essa é a força deles, e
            o custo de tamanho pode não importar para o seu deployment. O
            Perry é uma troca diferente. Você ganha compilação
            ahead-of-time de verdade, binários pequenos e inicialização em
            milissegundos; em troca, você adota um compilador pré-1.0 cuja
            conformidade com JavaScript é medida e publicada (test262:
            String 79%, Array 72% na v0.5.1146) em vez de herdada do V8.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Comparações detalhadas:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>{" "}
            e{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . Para como os pacotes npm compilam, veja{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Pacotes npm reais e uma varredura de conformidade
            </Link>
            .
          </p>
        </article>
      </section>

      {/* Benchmark table (shared section) */}
      <Performance />

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Compile seu primeiro binário hoje
            </h2>
            <p className="text-slate-400 mb-6">
              Instale com Homebrew, APT ou winget — depois{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
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
