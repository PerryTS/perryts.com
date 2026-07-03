import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Alternativas ao Electron para TypeScript: Perry vs Tauri vs Bun",
  description:
    "Procurando uma alternativa ao Electron em TypeScript? Compare Electron, Tauri, Bun e Perry em tamanho de binário, memória, stack de UI e linguagem.",
  breadcrumb: "Alternativas ao Electron para TypeScript",
};

export default function Content() {
  return (
    <>
            <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Voltar às comparações
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Alternativas ao Electron para Desenvolvedores TypeScript
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            O Electron tornou as aplicações desktop acessíveis para
            desenvolvedores web, e seus custos de tamanho e memória fizeram
            de &ldquo;alternativa ao Electron&rdquo; uma pesquisa
            permanente. Se TypeScript é a sua linguagem, existem quatro
            caminhos realistas em 2026: ficar com o Electron, migrar para o
            Tauri, construir binários com runtime embutido usando o Bun, ou
            compilar para nativo com o Perry. Eles fazem trade-offs muito
            diferentes.
          </p>

          <h2 className="text-2xl font-bold mb-6">As quatro abordagens</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — o ponto de partida
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Empacota Chromium e Node.js com cada aplicação. A vantagem é
                uma década de maturidade em produção e uma stack de UI
                (HTML/CSS/JS) que sua equipe já conhece — VS Code, Slack e
                Discord rodam nele. A desvantagem é o custo básico:
                instaladores de hello world de aproximadamente 80–150 MB,
                múltiplos processos Chromium e centenas de MB de RAM em
                ociosidade. Apenas desktop.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparação completa Perry vs Electron
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — UI web na webview do sistema, backend em Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                O Tauri mantém o frontend web mas descarta o Chromium
                empacotado: a UI é renderizada na webview do SO (WKWebView,
                WebView2, WebKitGTK), então os instaladores ficam na faixa
                de MB de um único dígito. É estável, bem documentado, e o
                Tauri 2 adicionou iOS/Android. Os trade-offs: o backend é
                Rust, não TypeScript — lógica de aplicação além da UI
                significa escrever Rust e cruzar uma ponte IPC — e a
                renderização varia um pouco por plataforma porque cada SO
                traz uma webview diferente.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparação completa Perry vs Tauri
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — binários de arquivo único, sem camada GUI
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Pessoas pesquisando &ldquo;bun electron&rdquo; geralmente
                querem a conveniência do Electron sem o seu peso.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                produz um único executável embutindo o runtime do Bun com
                seu TypeScript empacotado — excelente para CLIs e
                servidores, com compatibilidade total com npm já que
                literalmente é o runtime. Mas o binário fica em torno de 60
                MB (macOS arm64) a mais de 100 MB (Linux/Windows), o código
                ainda é executado via JIT, e o Bun não tem framework de UI —
                uma aplicação desktop ainda precisa de Electron, Tauri ou
                uma biblioteca de webview por cima.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Comparação completa Perry vs Bun
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript compilado para widgets nativos
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                O Perry compila TypeScript ahead-of-time para código de
                máquina e renderiza a UI através de widgets reais da
                plataforma — AppKit, UIKit, GTK4, Win32, Android via JNI —
                sem webview e sem ponte IPC. Uma única linguagem para UI e
                lógica, ~330 KB para um hello world, binários típicos de
                2–5 MB, ~1 ms de inicialização, e dez alvos incluindo
                mobile, relógio e TV. A ressalva honesta: o Perry é
                pré-1.0, sua API de UI é própria (declarativa, estilo
                SwiftUI — não HTML/CSS), e o ecossistema é jovem perto do
                Electron.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Lado a lado</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Linguagem</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript em todo lugar</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">Frontend JS/TS, backend Rust</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Abordagem de UI</td>
                  <td className="px-4 py-3 text-slate-400">Widgets nativos da plataforma</td>
                  <td className="px-4 py-3 text-slate-400">Chromium empacotado</td>
                  <td className="px-4 py-3 text-slate-400">Webview do sistema</td>
                  <td className="px-4 py-3 text-slate-400">Nenhuma (CLI/servidor)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Tamanho do hello world</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB dependendo da plataforma</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Execução</td>
                  <td className="px-4 py-3 text-slate-400">Código de máquina AOT</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (motor JS da webview) + Rust nativo</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Memória em ociosidade</td>
                  <td className="px-4 py-3 text-slate-400">Dezenas de MB (processo nativo único)</td>
                  <td className="px-4 py-3 text-slate-400">Centenas de MB (Chromium multi-processo)</td>
                  <td className="px-4 py-3 text-slate-400">Menor que o Electron (webview do SO)</td>
                  <td className="px-4 py-3 text-slate-400">Típico de runtime</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mobile / relógio / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">Não</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">Não</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Maturidade</td>
                  <td className="px-4 py-3 text-slate-400">Pré-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Mais de uma década em produção</td>
                  <td className="px-4 py-3 text-slate-400">Estável (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Estável</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            E quanto a React Native ou Flutter?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Eles aparecem em toda thread sobre Electron, mas respondem a uma
            pergunta diferente. O React Native é mobile-first: seu
            JavaScript roda no motor Hermes e aciona views nativas através
            de uma ponte, e o suporte a desktop existe apenas através de
            forks separados da comunidade/Microsoft — não é um substituto
            direto para o Electron (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). O Flutter cobre desktop e mobile, mas significa deixar o
            TypeScript pelo Dart, e ele desenha os próprios widgets em vez
            de usar os da plataforma. Se permanecer em TypeScript é a
            restrição, a lista realista para desktop continua sendo as
            quatro opções acima.
          </p>

          <h2 className="text-2xl font-bold mb-6">Qual você deveria escolher?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Fique com a stack web
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Se sua UI já está construída em React/Vue/Svelte e você
                precisa de distribuição desktop testada em batalha hoje, o
                Electron continua sendo a escolha de menor risco — você
                paga em tamanho e memória. Se esse custo incomoda e você
                está confortável escrevendo o backend em Rust, o Tauri te
                dá a maior parte da experiência da stack web a uma fração
                do footprint.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Deixe a webview para trás
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Se o que você realmente quer é TypeScript entrando,
                aplicação nativa saindo — uma única linguagem, widgets
                reais da plataforma, binários pequenos, e mobile/relógio/TV
                a partir do mesmo código — essa é exatamente a lacuna que o
                Perry existe para preencher, com a maturidade pré-1.0 como
                preço de entrada. E se você só precisa de uma CLI ou
                servidor como um único arquivo com risco zero de
                compatibilidade, o{" "}
                <code className="text-slate-300">--compile</code> do Bun é
                a escolha pragmática.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Veja com seus próprios olhos
            </h2>
            <p className="text-slate-400 mb-6">
              Instale o Perry e entregue uma aplicação nativa a partir de
              TypeScript.
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
      </article>
    </>
  );
}
