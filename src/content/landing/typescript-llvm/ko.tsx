import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "LLVM 위의 TypeScript: 모노모픽화와 네이티브 코드 생성",
  description:
    "Perry가 TypeScript를 LLVM IR로 변환하는 방법 — 타입화된 HIR, 모노모픽화, NaN-boxing — 그리고 AOT 성능을 위해 백엔드가 Cranelift에서 LLVM으로 옮겨간 이유.",
  breadcrumb: "LLVM 위의 TypeScript",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="gradient-text">LLVM</span> 위의 TypeScript
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            JIT 엔진을 위해 설계된 언어를 Perry가 어떻게 LLVM IR로 변환하는지
            — 모노모픽화, NaN-boxing, 인라인 변환 — 그리고 왜 Cranelift를
            떠났는지.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              컴파일러 내부 구조
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
          <h2 className="text-2xl font-bold mb-6">왜 TypeScript에 LLVM인가?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            사전(AOT) 컴파일러는 JIT와는 전혀 다른 영역에서 동작합니다. JIT는
            사용자가 기다리는 동안 컴파일하므로, 컴파일 지연 시간이 제약
            조건이 됩니다. Perry 같은 AOT 컴파일러는 개발자의 머신이나
            CI에서 단 한 번 컴파일하고, 그 바이너리는 이후 수백만 번
            실행됩니다. 바로 이 비대칭성이 무거운 옵티마이저가 제값을 하는
            지점입니다.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM은 20년에 걸친 미들엔드 작업을 가져다줍니다: 루프 벡터화,
            루프 불변 코드 이동, 전역 값 번호 매기기, 희소 조건부 상수 전파,
            공격적인 인라인화, 별칭 분석. Perry가 할 일은 이 장치가 실제로
            최적화할 수 있는 IR을 건네주는 것입니다 — 바로 여기서
            TypeScript의 타입 정보가 쓰입니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">변환 파이프라인</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            소스는 SWC로 파싱된 뒤 타입화된 고수준 IR(HIR)로 변환됩니다.
            흥미로운 결정들은 LLVM이 코드를 보기도 전에, 바로 이 단계에서
            이루어집니다:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">모노모픽화.</strong> 제네릭
              함수와 클래스는 구체적인 인스턴스화마다 특수화됩니다 — Rust와
              C++이 사용하는 것과 같은 전략입니다.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code>와{" "}
              <code className="text-slate-300">{`Stack<string>`}</code>은
              서로 독립적인, 완전히 타입화된 두 개의 함수가 됩니다 — 그래서
              옵티마이저는 제네릭 디스패치 덩어리 대신 구체적인 타입을
              다루게 되고, 제네릭은 런타임에 아무 비용도 들지 않습니다.
            </li>
            <li>
              <strong className="text-slate-300">정적 디스패치.</strong>{" "}
              리시버 타입을 컴파일 타임에 알 수 있는 경우, 메서드 호출은
              해시 테이블 조회가 아니라 LLVM이 인라인할 수 있는 직접
              호출로 컴파일됩니다.
            </li>
            <li>
              <strong className="text-slate-300">직접 필드 접근.</strong>{" "}
              객체 필드는 컴파일 타임 인덱스로 해결되므로, 프로퍼티 읽기는
              고정 오프셋 로드입니다 — 딕셔너리 조회가 아닙니다.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing과 인라인 변환
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            값이 동적인 경우, Perry는 NaN-boxing을 사용합니다: 모든 값은
            64비트 워드입니다. 배정밀도 실수(double)는 직접 저장되고,
            객체·문자열·불리언·<code className="text-slate-300">null</code>·
            <code className="text-slate-300">undefined</code>는 IEEE 754
            quiet NaN의 사용되지 않는 비트 패턴에 인코딩됩니다. 숫자는 제로
            비용입니다 — 산술 연산에 박싱도, 할당도 필요 없습니다.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            문제는 숫자가 아닌 값에 대한 연산에는 언패킹-연산-재패킹 비트
            시퀀스가 필요하다는 점입니다. 이 시퀀스가 별도로 컴파일된
            런타임으로의 호출로 존재한다면, LLVM에게는 불투명한 블랙박스로
            보여서 그 경계를 넘어 최적화할 수 없습니다. 그래서 Perry는
            프로퍼티 로드, 메서드 디스패치, 객체 할당 같은 핫 연산을
            옵티마이저가 융합하고 단순화할 수 있는 인라인 LLVM IR로
            방출합니다. 예를 들어 객체 할당은 인라인 스레드 로컬 범프
            할당으로 컴파일됩니다:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — 인라인 범프 할당</span>
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

          <h2 className="text-2xl font-bold mb-6">왜 Cranelift가 아닌가?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry의 첫 번째 백엔드는 Cranelift였습니다 — wasmtime 뒤에 있는
            코드 생성기로, 빠르고 예측 가능한 컴파일을 위해 만들어졌습니다.
            시작점으로는 옳은 선택이었고, 지금도 JIT와 샌드박스 런타임에는
            훌륭한 선택으로 남아 있습니다. 전환을 강제한 것은 두 가지였습니다:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">옵티마이저의 한계.</strong>{" "}
              Cranelift는 의도적으로 빠른 단일 계층(single-tier)
              컴파일러입니다: &ldquo;괜찮은 코드를 빠르게&rdquo;라는
              트레이드오프는 JIT에는 옳은 선택이지만, 최고 수준의 네이티브
              성능이 강점인 AOT 컴파일러에는 맞지 않는 선택입니다.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> Apple
              Watch는 Cranelift가 지원하지 않는 ABI(64비트 명령어, 32비트
              포인터)를 사용합니다. watchOS를 타겟으로 존재하게 하려면
              LLVM이 필요했습니다 — 그리고 두 개의 백엔드를 유지한다는 것은
              버그, 테스트, 성능 기준선이 두 배가 된다는 뜻이었습니다.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            이 전환은 공짜가 아니었습니다: 핫 연산이 처음에는 불투명한
            런타임 헬퍼 호출을 거쳤기 때문에, 첫 LLVM 전용 릴리스는 일부
            벤치마크에서 최대 70배까지 성능이 후퇴했습니다. 회복 과정 —
            인라인 변환, 위에서 본 범프 할당자, 더 나은 인라이닝 경계 — 을
            거치며 백엔드는 Cranelift의 수치를 넘어섰고, 정착될 무렵에는
            Perry가 자체 벤치마크 스위트의 모든 항목에서 Node.js를
            이겼습니다, 1.7배에서 24.6배까지, 무승부 2건과 함께 (2026년
            4월). 전체 후기는 읽어볼 가치가 있습니다:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Cranelift에서 LLVM으로
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">더 깊이 알아보기</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              컴파일러 내부 구조 페이지
            </Link>
            에서 NaN-boxing, 모노모픽화, 정적 디스패치를 더 자세히
            다룹니다. 블로그에서는{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              모든 것을 최적화하기
            </Link>
            가 릴리스별 최적화 작업을 훑어보고,{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              세대별 GC, 지연 JSON, 그리고 검증을 견디는 벤치마크
            </Link>
            가 벤치마크 방법론(RUNS=11, 중앙값 + p95)이 어떻게 작동하는지
            설명합니다. 큰 그림을 보려면{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              네이티브 TypeScript 컴파일러
            </Link>{" "}
            개요부터 시작하세요.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              직접 결과물을 확인해보세요
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              엔진 없는 네이티브 머신 코드.
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
        </div>
      </section>
    </>
  );
}
