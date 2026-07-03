import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript를 위한 Electron 대안: Perry vs Tauri vs Bun",
  description:
    "TypeScript용 Electron 대안을 찾고 있나요? Electron, Tauri, Bun 기반 접근 방식, 그리고 Perry를 바이너리 크기, 메모리, UI 스택, 언어 기준으로 비교합니다.",
  breadcrumb: "TypeScript를 위한 Electron 대안",
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
            비교 목록으로 돌아가기
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              TypeScript 개발자를 위한 Electron 대안
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron은 데스크톱 앱을 웹 개발자들도 쉽게 만들 수 있게
            해주었지만, 그 크기와 메모리 비용 때문에 &ldquo;Electron
            대안&rdquo;은 꾸준히 검색되는 질문이 되었습니다. TypeScript가
            여러분의 언어라면, 2026년 기준으로 네 가지 현실적인 길이
            있습니다: Electron에 남거나, Tauri로 옮기거나, Bun으로 런타임이
            내장된 바이너리를 만들거나, Perry로 네이티브로 컴파일하는
            것입니다. 이들은 서로 매우 다른 트레이드오프를 가집니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">네 가지 접근 방식</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — 기준점
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                모든 앱에 Chromium과 Node.js를 함께 묶어 배포합니다. 장점은
                10년에 걸친 프로덕션 성숙도와, 팀이 이미 알고 있는 UI
                스택(HTML/CSS/JS)입니다 — VS Code, Slack, Discord가 이
                위에서 동작합니다. 단점은 기본 비용입니다: 약 80–150 MB의
                hello-world 설치 파일, 여러 개의 Chromium 프로세스, 그리고
                유휴 상태에서도 수백 MB에 달하는 RAM. 데스크톱 전용입니다.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perry vs Electron 전체 비교
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — 시스템 웹뷰의 웹 UI, Rust 백엔드
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri는 웹 프런트엔드는 유지하되 번들된 Chromium은 버립니다:
                UI는 OS 웹뷰(WKWebView, WebView2, WebKitGTK)에서
                렌더링되므로, 설치 파일은 한 자릿수 MB대에 머무릅니다.
                안정적이고 문서화가 잘 되어 있으며, Tauri 2에서 iOS/Android가
                추가되었습니다. 트레이드오프는 이렇습니다: 백엔드가
                TypeScript가 아니라 Rust입니다 — UI 이상의 앱 로직을
                작성하려면 Rust를 쓰고 IPC 브리지를 건너야 합니다 — 그리고
                각 OS가 서로 다른 웹뷰를 탑재하기 때문에 렌더링이 플랫폼마다
                약간씩 달라집니다.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perry vs Tauri 전체 비교
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — 단일 파일 바이너리, GUI 레이어 없음
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                &ldquo;bun electron&rdquo;을 검색하는 사람들은 대체로
                Electron의 편리함을 그 무게 없이 원합니다.{" "}
                <code className="text-slate-300">bun build --compile</code>은
                번들링된 TypeScript와 함께 Bun 런타임을 내장하여 단일 실행
                파일을 만듭니다 — CLI와 서버에는 훌륭하며, 그 자체가
                런타임이기 때문에 npm과 완전히 호환됩니다. 하지만 바이너리는
                약 60 MB(macOS arm64)에서 100+ MB(Linux/Windows)에 이르고,
                코드는 여전히 JIT로 실행되며, Bun에는 UI 프레임워크가
                없습니다 — 데스크톱 앱을 만들려면 결국 그 위에 Electron,
                Tauri, 또는 웹뷰 라이브러리가 필요합니다.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perry vs Bun 전체 비교
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — 네이티브 위젯으로 컴파일된 TypeScript
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry는 TypeScript를 사전에 머신 코드로 컴파일하고, 실제
                플랫폼 위젯 — AppKit, UIKit, GTK4, Win32, JNI를 통한 Android
                — 을 통해 UI를 렌더링합니다. 웹뷰도, IPC 브리지도 없습니다.
                UI와 로직 모두 하나의 언어로, ~330 KB의 hello world, 2–5
                MB의 일반적인 바이너리, ~1 ms의 시작 시간, 그리고
                모바일·워치·TV를 포함한 10개의 타겟. 솔직한 단점: Perry는
                1.0 이전이고, UI API는 (HTML/CSS가 아니라 선언적인, SwiftUI
                스타일의) 독자적인 방식이며, 생태계는 Electron에 비해 아직
                젊습니다.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">나란히 비교</h2>
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
                  <td className="px-4 py-3 text-slate-300 font-medium">언어</td>
                  <td className="px-4 py-3 text-slate-400">모든 곳에서 TypeScript</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS 프런트엔드, Rust 백엔드</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">UI 접근 방식</td>
                  <td className="px-4 py-3 text-slate-400">네이티브 플랫폼 위젯</td>
                  <td className="px-4 py-3 text-slate-400">번들된 Chromium</td>
                  <td className="px-4 py-3 text-slate-400">시스템 웹뷰</td>
                  <td className="px-4 py-3 text-slate-400">없음 (CLI/서버)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Hello-world 크기</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">플랫폼별 ~60–116 MB</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">실행 방식</td>
                  <td className="px-4 py-3 text-slate-400">AOT 머신 코드</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (웹뷰 JS 엔진) + 네이티브 Rust</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">유휴 상태 메모리</td>
                  <td className="px-4 py-3 text-slate-400">수십 MB (단일 네이티브 프로세스)</td>
                  <td className="px-4 py-3 text-slate-400">수백 MB (멀티 프로세스 Chromium)</td>
                  <td className="px-4 py-3 text-slate-400">Electron보다 낮음 (OS 웹뷰)</td>
                  <td className="px-4 py-3 text-slate-400">런타임 특성에 따름</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">모바일 / 워치 / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">없음</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">없음</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">성숙도</td>
                  <td className="px-4 py-3 text-slate-400">1.0 이전</td>
                  <td className="px-4 py-3 text-slate-400">10년 이상 프로덕션 사용</td>
                  <td className="px-4 py-3 text-slate-400">안정적 (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">안정적</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            React Native나 Flutter는 어떨까요?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            모든 Electron 관련 논의에 등장하지만, 이들은 다른 질문에
            답합니다. React Native는 모바일 우선입니다: JavaScript는 Hermes
            엔진에서 실행되고 브리지를 통해 네이티브 뷰를 구동하며, 데스크톱
            지원은 별도의 커뮤니티·Microsoft 포크를 통해서만 존재합니다 —
            Electron을 그대로 대체할 수 있는 것은 아닙니다 (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter는 데스크톱과 모바일을 모두 다루지만 TypeScript를
            떠나 Dart를 써야 하며, 플랫폼의 위젯을 사용하는 대신 자체적으로
            위젯을 그립니다. TypeScript를 유지하는 것이 제약 조건이라면,
            현실적인 데스크톱 후보군은 여전히 위의 네 가지입니다.
          </p>

          <h2 className="text-2xl font-bold mb-6">어떤 것을 선택해야 할까요?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                웹 스택을 유지하기
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                UI가 이미 React/Vue/Svelte로 구축되어 있고 오늘 당장 검증된
                데스크톱 배포가 필요하다면, Electron이 여전히 가장 위험이
                낮은 선택입니다 — 크기와 메모리로 그 대가를 치르게 됩니다.
                그 비용이 신경 쓰이고 Rust로 백엔드를 작성하는 것이
                괜찮다면, Tauri는 훨씬 작은 설치 공간으로 웹 스택 경험의
                대부분을 제공합니다.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                웹뷰를 뒤로하기
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                여러분이 진짜로 원하는 것이 TypeScript를 넣으면 네이티브
                앱이 나오는 것 — 하나의 언어, 실제 플랫폼 위젯, 작은
                바이너리, 그리고 같은 코드베이스에서 나오는 모바일/워치/TV —
                이라면, 바로 그 빈틈을 채우기 위해 Perry가 존재합니다. 그
                대가로 치러야 하는 것은 1.0 이전이라는 성숙도입니다. 그리고
                호환성 위험이 전혀 없는 단일 파일 CLI나 서버만 필요하다면,
                Bun의 <code className="text-slate-300">--compile</code>이
                실용적인 선택입니다.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              직접 확인해보세요
            </h2>
            <p className="text-slate-400 mb-6">
              Perry를 설치하고 TypeScript로 네이티브 앱을 출시해보세요.
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
      </article>
    </>
  );
}
