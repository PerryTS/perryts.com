import { Link } from "@/i18n/navigation";
import { Installation } from "@/components/Installation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Perry 시작하기 — 설치하고 TypeScript를 네이티브로 컴파일하기",
  description:
    "Homebrew, APT, winget으로 Perry를 설치하고 1분 이내에 첫 TypeScript 파일을 네이티브 실행 파일로 컴파일하세요. Node.js 불필요.",
  breadcrumb: "시작하기",
  absoluteTitle: true,
};

export default function Content() {
  return (
    <>
            <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">Perry</span> 시작하기
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            세 단계만 거치면 제로에서 바로 실행되는 네이티브 실행 파일까지 도달합니다.
            대상 머신에 설치해야 할 Node.js도, 번들러도, 런타임도 없습니다.
          </p>
        </div>
      </section>

      <Installation />

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            첫 바이너리, 단계별로
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Perry를 설치하고 나면, TypeScript를 네이티브 실행 파일로 컴파일하는 데
            명령어 하나면 충분합니다. 먼저 파일을 작성하세요:
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
            컴파일한 뒤 결과물을 실행해보세요 — 출력물은 번들된 스크립트가 아니라
            자기 완결적인 머신 코드 바이너리입니다:
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
            그 바이너리는 약 1밀리초 만에 시작되며, 같은 OS와 아키텍처를 가진 어떤
            머신에서도 실행됩니다 — 미리 설치해야 할 것이 없습니다. Perry가{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript를 바이너리로 컴파일하는 방법
            </Link>{" "}
            또는{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              네이티브 TypeScript 컴파일러
            </Link>
            {" "}내부에서 무슨 일이 일어나는지 더 알아보세요.
          </p>

          <h2 className="text-2xl font-bold mb-6">다음으로 살펴볼 것</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="feature-card block group"
            >
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                문서
              </h3>
              <p className="text-slate-400 text-sm">
                CLI, perry/ui 위젯, 스레딩, i18n, 그리고 모든 컴파일 타겟에 대한
                가이드 — docs.perryts.com에서 확인하세요.
              </p>
            </a>
            <Link href="/showcase" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Showcase
              </h3>
              <p className="text-slate-400 text-sm">
                Perry로 컴파일되어 App Store 등에서 출시된 실제 앱들.
              </p>
            </Link>
            <Link href="/compare" className="feature-card block group">
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                비교
              </h3>
              <p className="text-slate-400 text-sm">
                Perry가 Bun, Deno, Electron, Tauri, React Native, Static
                Hermes와 비교해 어떤 위치에 있는지.
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
                소스 코드, 이슈, 디스커션 — Perry는 오픈 소스입니다.
              </p>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
