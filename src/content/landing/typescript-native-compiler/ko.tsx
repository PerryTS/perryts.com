import { Link } from "@/i18n/navigation";
import { Architecture } from "@/components/Architecture";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "네이티브 TypeScript 컴파일러: Perry가 TS를 머신 코드로 컴파일하는 방법",
  description:
    "Perry는 Rust로 작성된 네이티브 TypeScript 컴파일러입니다: SWC 파싱, 타입화된 HIR, 모노모픽화, LLVM 코드 생성. VM 없이 10개 플랫폼용 네이티브 바이너리를 만듭니다.",
  breadcrumb: "네이티브 TypeScript 컴파일러",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Rust로 만든{" "}
            <span className="gradient-text">네이티브 TypeScript 컴파일러</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry는 여러분이 이미 작성하고 있는 TypeScript를 머신 코드로
            컴파일합니다 — Rust나 Go 툴체인이 자신의 언어를 컴파일하는 것과
            같은 방식으로요. 트랜스파일된 JavaScript도, 가상 머신도, 대상
            시스템의 런타임도 없습니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/getting-started" className="btn-primary">
              시작하기
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
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            트랜스파일러도 아니고, 런타임도 아닙니다.
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            대부분의 TypeScript 도구는 두 부류로 나뉩니다. 트랜스파일러 —{" "}
            <code className="text-slate-300">tsc</code>, SWC, esbuild — 는
            타입을 검사하고 벗겨낸 뒤, 나중에 엔진이 실행할 JavaScript를
            방출합니다. 런타임 — Node.js, Bun, Deno — 은 바로 그 엔진들입니다:
            프로그램이 시작될 때마다 JavaScript를 파싱하고, 인터프리트하고,
            JIT 컴파일합니다.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            네이티브 컴파일러는 세 번째 부류이며, TypeScript에 있어서는
            지금까지 거의 비어 있던 자리였습니다. Perry는 타입 애노테이션을
            제거해야 할 문서가 아니라 코드 생성을 이끄는 입력으로 취급합니다.{" "}
            <code className="text-slate-300">perry compile main.ts</code>의
            결과물은 머신 코드를 담은 독립형 실행 파일입니다 — 일반적으로{" "}
            <Link
              href="/compile-typescript-to-binary"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              2–5 MB, 약 1밀리초 만에 시작
            </Link>
            합니다.
          </p>
        </article>
      </section>

      {/* Pipeline visual (shared section) */}
      <Architecture />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">파이프라인, 단계별로</h2>
          <ol className="space-y-4 text-slate-400 leading-relaxed mb-12 list-decimal pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">파싱 (SWC).</strong> 소스
              파일은 Rust 네이티브 TypeScript 파서인 SWC로 파싱되므로, 대규모
              프로젝트도 밀리초 단위로 파싱됩니다. 모듈 코드 생성, 변환 패스,
              심볼 스캐닝은 여러 코어에서 병렬로 실행됩니다.
            </li>
            <li>
              <strong className="text-slate-300">타입 해결.</strong>{" "}
              컴파일러는 선언된 타입을 해결하고 나머지는 추론하여, 코드
              생성이 시작되기 전에 모든 표현식에 구체적인 타입을 부여합니다.
            </li>
            <li>
              <strong className="text-slate-300">
                타입화된 HIR와 모노모픽화.
              </strong>{" "}
              AST는 타입화된 고수준 IR(HIR)로 변환됩니다. 제네릭 함수와
              클래스는 모노모픽화됩니다 —{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> 같은
              각 인스턴스화는 구체적인 타입으로 개별 컴파일되므로, 제네릭은
              런타임에 아무 비용도 들지 않습니다. 타입을 알 수 있는 경우,
              메서드 호출은 정적 디스패치가 되고 객체 필드는 직접적인 고정
              오프셋 로드가 됩니다.
            </li>
            <li>
              <strong className="text-slate-300">코드 생성 (LLVM).</strong>{" "}
              HIR은 LLVM IR로 변환되고 LLVM의 최적화 파이프라인 —
              인라이닝, 루프 최적화, 벡터화 — 을 거친 뒤, 대상 플랫폼을 위한
              머신 코드로 방출됩니다.
            </li>
            <li>
              <strong className="text-slate-300">링크.</strong> 출력물은
              평범한 플랫폼 실행 파일입니다: macOS의 Mach-O, Linux의 ELF,
              Windows의 PE — 그리고 모바일, 워치, TV, WebAssembly 타겟까지.
            </li>
          </ol>
          <p className="text-slate-400 leading-relaxed mb-12">
            이 중 LLVM에 관한 부분 — 왜 Cranelift 대신 LLVM을 선택했는지,
            NaN-boxing이 동적 값을 어떻게 표현하는지, 옵티마이저가 타입화된
            IR로 무엇을 하는지 — 은 별도의 심층 분석에서 다룹니다:{" "}
            <Link
              href="/typescript-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              LLVM 위의 TypeScript
            </Link>
            . NaN-boxing, 정적 디스패치, 제로 비용 추상화 같은 구현 세부
            사항은{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              컴파일러 내부 구조
            </Link>
            에서 다룹니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            동적 코드와 npm은 어떻게 되나요?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            TypeScript는 내부적으로 여전히 JavaScript이며, 네이티브
            TypeScript 컴파일러는 이 점에 솔직해야 합니다. Perry의 공식
            test262 스위트 대비 적합성은 측정되고 공개됩니다 — v0.5.1146
            기준으로 String 의미론은 79%, Array는 72%이며, 릴리스마다 계속
            올라가고 있습니다. 순수 TypeScript/JavaScript npm 패키지는{" "}
            <code className="text-slate-300">perry.compilePackages</code>를
            통해 네이티브로 컴파일됩니다: axios, zod v4, express, fastify,
            hono는 오늘 바로 컴파일되어 실행됩니다. 완전한 엔진 의미론이
            필요한 코드는{" "}
            <code className="text-slate-300">--enable-js-runtime</code>으로
            임베디드 V8 폴백을 선택할 수 있습니다.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            자세한 이야기는{" "}
            <Link
              href="/blog/real-npm-packages-and-a-conformance-sweep"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              실제 npm 패키지와 적합성 스윕
            </Link>
            에 있습니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">
            Perry는 다른 &ldquo;네이티브 TypeScript&rdquo; 시도들과 어떻게
            다른가
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry만이 TypeScript의 타입 애노테이션에서 컴파일 기회를 발견한
            프로젝트는 아니지만 — 접근 방식은 크게 다릅니다. AssemblyScript는
            엄격한 TypeScript 유사 언어를 오직 WebAssembly로만 컴파일합니다:
            의도적으로 JavaScript와 호환되지 않으며, OS 실행 파일이나
            네이티브 UI를 만들어내지 않습니다. Meta의 Static Hermes는 Hermes
            엔진 안에서 타입화된 JavaScript 부분 집합을 사전 컴파일하며,
            주로 React Native를 위한 것입니다 — 2026년 중반 기준으로 여전히
            소스에서 빌드해야 하는 연구 프로젝트로 남아 있으며, 실제로 React
            Native에 배포된 Hermes V1 엔진에는 정적 컴파일 기능이 포함되어
            있지 않습니다 (
            <Link
              href="/compare/static-hermes"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              전체 비교
            </Link>
            ).
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            Perry의 승부수는 두 축 모두에서 다릅니다: 입력 언어로는 표준
            TypeScript를, 출력물로는 평범한 플랫폼 실행 파일 — CLI, 서버,
            GUI — 을 택했으며, 오늘 바로 Homebrew, APT, winget, 또는 npm으로
            설치할 수 있습니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">하나의 컴파일러, 10개의 타겟</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            코드 생성이 LLVM을 거치기 때문에, 하나의 코드베이스가 macOS,
            iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly,
            그리고 순수 Web/JS로 컴파일됩니다 — Linux 머신에서 Windows,
            macOS, iOS 바이너리를 크로스 컴파일하는 것까지 포함해서요. GUI
            앱은 실제 플랫폼 위젯(AppKit, UIKit, GTK4, Win32, JNI를 통한
            Android) 위에 선언적 API를 제공하는{" "}
            <code className="text-slate-300">perry/ui</code>를 사용합니다 —
            웹뷰는 전혀 관여하지 않습니다.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            다른 접근 방식과 비교하면 어떨까요:{" "}
            <Link
              href="/compare"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs Bun, Deno, Electron, Tauri, React Native, Static
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
              컴파일러를 사용해보세요
            </h2>
            <p className="text-slate-400 mb-6">
              Perry를 설치하고 1분 이내에 첫 네이티브 바이너리를
              컴파일해보세요.
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
