import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Comece com o Perry — Instale e Compile TypeScript para Nativo",
  description:
    "Instale o Perry com Homebrew, APT ou winget e compile seu primeiro arquivo TypeScript em um executável nativo em menos de um minuto. Sem necessidade de Node.js.",
  breadcrumb: "Primeiros passos",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Comece com o <span className="gradient-text">Perry</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Do zero a um executável nativo funcionando em três passos. Sem
            Node.js, sem bundler, sem runtime para instalar na máquina de destino.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            Seu primeiro binário, passo a passo
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Depois que o Perry estiver instalado, compilar TypeScript para um
            executável nativo é um único comando. Escreva um arquivo:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">hello.ts</span>
            </div>
            <pre className="text-sm text-slate-300">
              <code>{`const name = process.argv[2] ?? "World";
console.log(\`Hello, \${name}!\`);`}</code>
            </pre>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            Compile e execute o resultado — a saída é um binário de código de
            máquina autocontido, não um script empacotado:
          </p>

          <div className="code-block mb-8">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">terminal</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">$</span>{" "}
                <span className="text-cyan-400">perry</span> compile hello.ts
              </p>
              <p className="text-green-400">✓ Compiled executable: hello</p>
              <p>
                <span className="text-slate-500">$</span> ./hello Perry
              </p>
              <p className="text-slate-300">Hello, Perry!</p>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-12">
            Esse binário inicia em cerca de um milissegundo e roda em qualquer
            máquina com o mesmo SO e arquitetura — nada para instalar antes.
            Leia mais sobre{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              como o Perry compila TypeScript para um binário
            </Link>{" "}
            ou o que acontece dentro do{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              compilador nativo de TypeScript
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Para onde ir agora</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Documentação
              </h3>
              <p className="text-slate-400 text-sm">
                Guias para a CLI, widgets do perry/ui, threading, i18n e todos
                os alvos de compilação — em docs.perryts.com.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Aplicações reais compiladas com o Perry, disponíveis na App
                Store e além.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Comparar
              </h3>
              <p className="text-slate-400 text-sm">
                Como o Perry se compara a Bun, Deno, Electron, Tauri, React
                Native e Static Hermes.
              </p>
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                GitHub
              </h3>
              <p className="text-slate-400 text-sm">
                Código-fonte, issues e discussions — o Perry é de código
                aberto.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
