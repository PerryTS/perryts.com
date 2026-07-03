import { Link } from "@/i18n/navigation";
import { Performance } from "@/components/Performance";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript를 바이너리로 컴파일하기 (독립형 실행 파일)",
  description:
    "TypeScript를 바이너리로 컴파일: Node.js 없는 2–5 MB 독립형 네이티브 실행 파일. Perry가 bun build --compile 및 Node SEA와 어떻게 비교되는지 알아보세요.",
  breadcrumb: "TypeScript를 바이너리로 컴파일",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript를 <span className="gradient-text">바이너리로 컴파일</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            명령어 하나로{" "}
            <code className="text-slate-300">main.ts</code>가 독립형 네이티브
            실행 파일이 됩니다. 대상 머신에 Node.js도 필요 없고, 런타임을
            번들링할 필요도 없으며, 사용자를 위한 설치 과정도 없습니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/getting-started" className="btn-primary">
              Perry 설치하기
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              GitHub에서 보기
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
            사람들이 &ldquo;TypeScript 컴파일&rdquo;이라고 부르는 세 가지
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            개발자가 TypeScript를 바이너리로 컴파일하는 방법을 검색하면, 보통
            한 단어를 공유하지만 서로 매우 다른 세 가지 기법을 마주치게
            됩니다:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">트랜스파일링.</strong>{" "}
              <code className="text-slate-300">tsc</code>, SWC, esbuild는
              TypeScript를 JavaScript로 바꿉니다. 출력물을 실행하려면 여전히
              Node.js, Bun, 또는 브라우저가 필요합니다. 바이너리는 전혀
              관여하지 않습니다.
            </li>
            <li>
              <strong className="text-slate-300">런타임 임베딩.</strong>{" "}
              <code className="text-slate-300">bun build --compile</code>,{" "}
              <code className="text-slate-300">deno compile</code>, 그리고
              Node.js Single Executable Applications(SEA)는 번들링된
              JavaScript를 런타임 전체 사본과 함께 이어붙입니다. 파일은
              하나로 합쳐지지만, 엔진이 그 안에 함께 실려 있고 코드는
              프로세스가 시작될 때마다 여전히 파싱되고 JIT 컴파일됩니다.
            </li>
            <li>
              <strong className="text-slate-300">
                사전(AOT) 네이티브 컴파일.
              </strong>{" "}
              Perry가 하는 일이 바로 이것입니다. TypeScript는 SWC로 파싱되고,
              타입이 해결되고, 제네릭은 모노모픽화되며, LLVM이 머신 코드를
              방출합니다. 링커는 평범한 실행 파일을 만들어냅니다 — Rust, Go,
              C++ 툴체인이 만들어내는 것과 같은 종류의 산출물입니다. 바이너리
              안에는 JavaScript 엔진이 전혀 없습니다.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            부팅할 엔진도, 시작 시 파싱할 것도 없기 때문에, Perry 바이너리는
            약 1밀리초 만에 시작됩니다. 파이프라인 자체는{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              네이티브 TypeScript 컴파일러
            </Link>{" "}
            페이지와{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              컴파일러 내부 구조
            </Link>
            에서 더 깊이 다룹니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">바이너리는 얼마나 큰가요?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            실제로 사용하는 코드만 컴파일되고 링크되기 때문에, 크기는 무엇을
            가져다 쓰는지에 따라 달라집니다:
          </p>
          <ul className="space-y-3 text-slate-400 leading-relaxed mb-8 list-disc pl-6 marker:text-amber-400">
            <li>
              hello world는 약{" "}
              <strong className="text-slate-300">330 KB</strong>입니다.
            </li>
            <li>
              일반적인 CLI 도구는{" "}
              <strong className="text-slate-300">2–5 MB</strong> 수준입니다.
            </li>
            <li>
              대형 프레임워크(Fastify, mysql2 등)를 링크하는 완전한
              애플리케이션도 약{" "}
              <strong className="text-slate-300">48 MB</strong> 정도입니다.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            비교하자면: Node SEA 실행 파일은{" "}
            <code className="text-slate-300">node</code> 바이너리 자체의
            사본이기 때문에, 코드가 추가되기도 전에 플랫폼에 따라 약 88–118
            MB에서 시작합니다. Bun으로 컴파일한 hello world는 Bun 런타임
            전체가 내장되어 있어 macOS arm64에서 약 60 MB, Linux x64에서 약
            100 MB 정도입니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry vs bun build --compile vs Node SEA
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            세 가지 모두 다른 사람에게 건넬 수 있는 단일 파일을 만들어줍니다.
            그 외에는 매우 다른 도구들이며, 각각이 누군가에게는 정답이
            됩니다:
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
                    무엇을 만들어내는가
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    AOT 컴파일된 머신 코드 (LLVM)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    번들된 JS + 내장된 Bun 런타임
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    번들링된 스크립트가 주입된 node 바이너리의 사본
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    실행 모델
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    네이티브 코드, JS 엔진 없음
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    실행 시 JIT (JavaScriptCore)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    실행 시 JIT (V8)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    Hello-world 크기
                  </td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">
                    ~60 MB (macOS arm64)부터 ~100+ MB (Linux/Windows)까지
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ~88–118 MB (node 바이너리 크기)
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    시작 시간
                  </td>
                  <td className="px-4 py-3 text-slate-400">~1 ms</td>
                  <td className="px-4 py-3 text-slate-400">~10 ms</td>
                  <td className="px-4 py-3 text-slate-400">~30 ms</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    크로스 컴파일
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    10개 타겟, Linux에서 Windows/macOS/iOS 빌드 포함
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    가능 — --target으로 Linux, Windows, macOS
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    불가능 — 대신 플랫폼별 node 바이너리를 복사
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    JS/npm 호환성
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    확장 중: axios, zod v4, express, fastify, hono는 네이티브로
                    컴파일되며, 나머지는 선택적 V8 폴백 지원
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    완전함 — Bun 런타임 그 자체이므로
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    완전한 Node 의미론; 사전 번들링이 필요하며 Node 24
                    LTS에서는 CommonJS 전용
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    상태
                  </td>
                  <td className="px-4 py-3 text-slate-400">1.0 이전</td>
                  <td className="px-4 py-3 text-slate-400">안정적</td>
                  <td className="px-4 py-3 text-slate-400">
                    Node 24 LTS 기준 &ldquo;활발한 개발&rdquo; 단계의 안정성
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            솔직하게 말하면: 애플리케이션이 npm 생태계 전체에 의존하고
            호환성 위험을 전혀 감수하고 싶지 않다면, Bun과 Node SEA는
            여러분이 이미 개발 기준으로 삼고 있는 엔진 의미론을 그대로
            실행합니다 — 그것이 이들의 강점이며, 배포 환경에 따라 크기
            비용은 문제가 되지 않을 수 있습니다. Perry는 다른 거래를
            제안합니다. 진정한 사전(AOT) 컴파일, 작은 바이너리, 밀리초
            단위의 시작 시간을 얻는 대신, JavaScript 적합성이 V8에서 물려받은
            것이 아니라 직접 측정되고 공개되는(test262 기준: v0.5.1146 시점
            String 79%, Array 72%) 1.0 이전 컴파일러를 받아들이게 됩니다.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            상세 비교:{" "}
            <Link
              href="/compare/bun"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun
            </Link>
            과{" "}
            <Link
              href="/compare/deno"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Deno
            </Link>
            . npm 패키지가 어떻게 컴파일되는지는{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              실제 npm 패키지와 적합성 스윕
            </Link>
            을 참고하세요.
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
              오늘 바로 첫 바이너리를 컴파일하세요
            </h2>
            <p className="text-slate-400 mb-6">
              Homebrew, APT, 또는 winget으로 설치한 다음{" "}
              <code className="text-slate-300">perry compile main.ts</code>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                시작하기
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                문서 읽기
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
