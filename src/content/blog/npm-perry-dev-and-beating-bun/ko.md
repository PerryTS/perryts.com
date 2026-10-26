---
title: "npm 배포, perry dev, 그리고 모든 벤치마크에서 승리"
excerpt: "Perry v0.5.80 → v0.5.174를 6일 만에 달성. @perryts/perry가 지원되는 7개 플랫폼 모두에 npm으로 출시. perry dev가 인메모리 AST 캐시와 모듈별 디스크 오브젝트 캐시 위에 워치 모드 자동 재컴파일을 추가. json_roundtrip의 마지막 격차가 닫힘 — 이제 Perry는 Node.js와 Bun을 상대로 모든 벤치마크에서 승리."
date: 2026-04-23
tags: ["npm", "developer-experience", "performance", "watch-mode", "milestone"]
---
지난 글은 Perry v0.5.80과 함께, 벤치마크 표에서 완강히 남아 있던 한 가지 패배로 끝났습니다. `JSON.parse`/`stringify` 라운드트립이 여전히 Node보다 1.6배 느렸던 것입니다. 6일 후 Perry는 **v0.5.174**가 되었고 — 즉 **94개의 패치 릴리스**를 의미합니다 — 다른 무엇보다 먼저 짚고 넘어갈 가치가 있는 세 가지가 바뀌었습니다:

-   `@perryts/perry`가 **npm**에 출시되었습니다. 한 번의 명령으로 지원되는 모든 플랫폼에 Perry를 설치합니다.
-   **`perry dev`**는 새로운 인메모리 AST 캐시와 모듈별 디스크 오브젝트 캐시 위에 워치 모드 자동 재컴파일을 더했습니다.
-   `json_roundtrip` 패배가 닫혔습니다. 이제 Perry는 메인 스위트의 **모든 벤치마크에서 Node와 Bun을 이깁니다**(둘 다 상대로 15/15).

글의 나머지는 조연들입니다. WebAssembly 수정, 드디어 엔드투엔드로 컴파일되는 watchOS, 나머지까지 모두 배선된 `perry/thread` 프리미티브, 그리고 조용한 누락을 진짜 에러로 바꾸는 컴파일 타임 엄격성 한 묶음.

## 1\. npm의 `@perryts/perry`

Perry는 항상 macOS에서는 Homebrew를 통해, Debian/Ubuntu에서는 APT를 통해 설치되었습니다. 해당 플랫폼의 개발자에게는 충분한 커버리지지만, 소스에서 빌드하지 않는 한 Windows 사용자에게는 전혀 없었고, Mac과 Linux와 Windows가 섞인 팀에서는 통일된 방법이 전혀 없었습니다. v0.5.107이 그 문제를 없앴습니다.

```
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp
```

이 패키지는 플랫폼별 7개의 옵셔널 패키지에 의존하는 얇은 런처입니다 — macOS arm64/x64, glibc 및 musl 모두의 Linux x64/arm64, Windows x64 — 그리고 npm은 여러분의 머신에 맞는 것 하나만 설치합니다. 플랫폼당 바이너리 크기는 한 자릿수 메가바이트의 낮은 수준입니다. 설치 자체는 몇 초 만에 끝납니다. 선호한다면 전역 설치 경로(`npm install -g @perryts/perry`)도 있지만, 프로젝트 로컬 설치는 컴파일러 버전을 의존성 옆에 고정시키며, 그것이 올바른 기본값입니다.

배포는 OIDC Trusted Publisher를 통해 진행되었으므로 모든 릴리스는 출처가 증명되며 그것을 빌드한 CI 잡에 다시 묶입니다. 그것은 그것대로 하루짜리 CI 작업이었고 — 올바른 `--provenance` / npm 버전 / 워크플로 경로 조합을 추적하는 여러 개의 `v0.5.107` CI 커밋이 있었습니다 — 하지만 안착했고, 이후의 모든 릴리스는 깨끗했습니다. 이제 Windows 사용자는 1급 시민이며, “당신의 OS가 좋아하는 방식으로 설치하세요”라는 팀 간의 마찰은 사라졌습니다.

## 2\. `perry dev` — 워치 모드

v0.5.143은 새로운 CLI 서브커맨드를 추가했습니다:

```
perry dev
```

그게 다입니다. 프로젝트를 감시하고, 저장 시 재컴파일하고, 바이너리를 재실행합니다. 영감은 Vite와 `nodemon`에서 왔고, 요지는 컴파일러-투-바이너리 워크플로가 런타임보다 느리게 느껴질 수밖에 없다는 척을 그만두는 것입니다. 대부분의 프로젝트에서 `perry dev`는 따뜻한 캐시에서 1초 이내에 다시 빌드합니다.

“따뜻한 캐시” 부분이 중요합니다. `perry dev`와 함께 두 가지 새 캐시가 안착했습니다:

-   **인메모리 AST 캐시** (v0.5.156). 단일 `perry dev` 세션의 재빌드 전반에 걸쳐, Perry는 디스크에서 변경되지 않은 모든 모듈의 파싱된 AST를 유지합니다. 한 파일을 편집하면 한 파일만 다시 파싱하며, 전체 모듈 그래프를 다시 파싱하지 않습니다.
-   **모듈별 디스크 오브젝트 캐시(V2.2)**. 각 모듈은 자신의 `.o` 파일로 컴파일되며 해싱됩니다. 변경되지 않은 모듈은 코드젠을 완전히 건너뛰고 링커가 캐시된 오브젝트를 가져갑니다. 캐시의 verbose 출력은 [#131](https://github.com/PerryTS/perry/issues/131)의 스펙과 일치하며, v0.5.160의 감사 강화 라운드는 헤더 변경 후에도 오래된 캐시 엔트리가 살아남을 수 있었던 엣지 케이스를 닫았습니다.

두 캐시는 쌓입니다. 세션의 첫 편집은 전체 컴파일이며, 그 이후의 모든 것은 실제로 변경한 것에 비례하는 만큼의 작업만 합니다. 이것이 이번 주의 가장 큰 단일 DX 변화입니다.

## 3\. 모든 벤치마크에서 Bun을 이기기

v0.5.166 시점에 README에는 솔직한 경고 하나가 있었습니다. Perry는 `json_roundtrip`(1MB, 10K개 항목 블롭에 대한 50× `JSON.parse` + `JSON.stringify`)에서 Node보다 1.6배 느렸고, Bun보다는 2.4배 느렸습니다. 이슈 [#149](https://github.com/PerryTS/perry/issues/149)가 후속을 추적했습니다. v0.5.173 — 7일 후 — 이 격차는 닫혔습니다.

| 워크로드 | Perry v0.5.173 | Node v25 | Bun 1.3 |
| --- | --- | --- | --- |
| `json_roundtrip` | 314ms | 377ms | 250ms |
| `closure` | 10ms | 309ms | 51ms |
| `factorial` | 31ms | 596ms | 98ms |
| `fibonacci(40)` | 320ms | 1033ms | 521ms |
| `mandelbrot` | 23ms | 25ms | 30ms |

이제 Perry는 메인 벤치마크 스위트의 모든 워크로드에서 이깁니다 — macOS ARM64에서 5회 실행 중 최고, **Node 상대로 15/15, Bun 상대로 15/15**. Bun 1.3은 여전히 최대 RSS에서 앞서 있으므로(`json_roundtrip`에서 Perry의 310MB 대비 84MB), 할당자 압력이 다음으로 좁혀야 할 것이지만, 원시 지연시간은 Perry의 것입니다.

JSON 격차를 닫은 것은 단일 변경이 아니었습니다 — 이번 주 내내 진행된 객체 레이아웃 패리티 작업의 축적이었습니다. 1단계 객체 리터럴 셰이프 추론(v0.5.167), 자유 함수, 클래스 메서드, getter, 화살표 함수에 대한 4단계 본문 기반 리턴 타입 추론(v0.5.169), 그리고 4.1단계 메서드 호출 리턴 타입 추론(v0.5.170). 주제는 지난 글과 동일합니다. LLVM에게 꿰뚫어 볼 수 있는 충분한 정적 구조를 주면, 옵티마이저가 나머지를 합니다.

v0.5.164는 또한 순수 fadd 감소 루프에서 `<2 x double>` 병렬 누적기 자동 벡터화를 복원했는데, 이는 v0.5.9x→v0.5.16x 범위의 어느 시점에 조용히 회귀한 것이었습니다. 이것이 `math_intensive`와 `accumulate`를 Rust/C++/Go/Swift 대비 예전의 3-4배 우위로 되돌리는 것입니다 — 동일한 LLVM, 하나의 `reassoc contract` 플래그, 하나의 벡터화된 루프 본문.

## 4\. `perry/ui`와 문서 테스트

남아 있던 perry/ui 격차 네 개가 v0.5.151에서 닫혔습니다. 그와 함께 v0.5.119는 조용한 perry/ui API 오용을 “컴파일되고 아무 일도 하지 않음”에서 하드 컴파일 에러로 전환했습니다 — 아래에서 볼 데코레이터에 적용된 v0.5.165와 동일한 논리입니다. 오용이 컴파일 타임에 드러나는 것은 런타임에 드러나는 것보다 항상 낫습니다.

v0.5.123은 **문서 예제 테스트 하니스**와 위젯 갤러리를 출시했습니다. 이제 문서의 모든 TypeScript 예제는 모든 CI 실행에서 컴파일되며, 위젯 갤러리는 스크린샷을 공인된 기준선과 비교합니다. v0.5.125는 이를 크로스 컴파일 매트릭스로 확장했습니다. 모든 문서 예제는 호스트 플랫폼뿐만 아니라 iOS, tvOS, Android, WASM, 웹용으로도 빌드되므로, 타겟 간의 API 드리프트가 그것을 출시한 릴리스 사이클이 아니라 그것을 도입한 PR에서 잡힙니다.

소소한 QoL 승리: `perry check`가 이제 HIR 낮춤 에러에 대해 `file:line:column`을 출력합니다([#129](https://github.com/PerryTS/perry/issues/129)). 이는 위치 없는 일반 메시지를 보여주는 대신 에디터의 점프-투-에러가 작동한다는 뜻입니다.

## 5\. watchOS가 엔드투엔드로 컴파일됨

watchOS는 지난달에 컴파일 타겟으로 출시되었지만, 깨끗한 엔드투엔드 빌드에는 약간 거친 부분이 있었습니다. 이번 주의 watchOS 작업:

-   **v0.5.113**: `--target watchos`와 `--target watchos-simulator`가 이제 누적되어 있던 우회책 없이 엔드투엔드로 컴파일됩니다.
-   **v0.5.114**: Metal 표면 앱을 위한 `--features watchos-game-loop`.
-   **v0.5.122**: SwiftUI 호스팅 렌더링을 위한 `--features watchos-swift-app` — SwiftUI가 앱 수명 주기를 소유하고 Perry가 그 안에서 UI를 구성하길 원할 때.
-   **v0.5.135**: `PERRY_UI_TEST_MODE`가 perry-ui-ios와 perry-ui-tvos에 배선되어, Geisterhand UI 테스팅이 macOS와 Linux에서 작동하는 것과 같은 방식으로 이 두 타겟에서도 실행됩니다.

## 6\. `perry/thread` 프리미티브 완전 배선

v0.5.174(오늘)은 [#146](https://github.com/PerryTS/perry/issues/146)를 닫았습니다. `parallelMap`, `parallelFilter`, `spawn`이 컴파일 타임 안전성 강제와 함께 코드젠 경로를 통해 완전히 배선되었습니다. 변경 가능한 캡처는 컴파일 타임에 거부됩니다 — perry/ui와 데코레이터가 이제 가지고 있는 것과 동일한 컴파일-타임-정확성 자세입니다. v0.4.0 발표 이후 부분적으로 배선되어 있던 스레드 프리미티브가 이제 엔드투엔드로 완성되었습니다.

## 7\. WebAssembly와 웹 타겟

짚고 넘어갈 만한 WASM 수정 두 가지:

-   **v0.5.158**: `--target web`(WASM 출력 경로)의 서로 마스킹하던 다섯 개의 복합 버그. 일괄 수정되어 이제 웹 타겟이 전체 `perry/ui` 표면에서 버텨냅니다([#133](https://github.com/PerryTS/perry/issues/133)).
-   **v0.5.161**: 루프 내부 `if` 안의 `break`/`continue`가 WASM에서 멈추고 있었습니다 — 네이티브 타겟에서는 재현되지 않던 코드젠 버그. 수정됨([#135](https://github.com/PerryTS/perry/issues/135)).

또한 정확성 측면에서: v0.5.157은 Android에서 `obj.field`가 `NaN`을 반환하던 문제를 수정했으며([#128](https://github.com/PerryTS/perry/issues/128)), v0.5.162는 `sendToClient`와 `closeClient`가 조용한 노옵(no-op)으로 컴파일되고 있던 저주받은 ws 버그를 수정했습니다([#136](https://github.com/PerryTS/perry/issues/136)).

## 8\. 컴파일 타임 엄격성 승리

이번 주의 주제: 예전에 조용한 실패였던 것은 무엇이든 이제 컴파일 에러입니다.

-   **v0.5.165**: TypeScript 데코레이터가 HIR로 파싱된 다음 조용히 누락되고 있었습니다. 이제 데코레이션 지점에서 명확한 메시지와 함께 에러를 냅니다([#144](https://github.com/PerryTS/perry/issues/144)). perry/ui에 적용된 v0.5.119와 동일한 경고→중단 추론.
-   **v0.5.119**: perry/ui API 오용이 노옵 바이너리를 생성하는 대신 컴파일 타임에 거부됩니다.
-   **v0.5.172**: `console.trace()`가 이제 메시지만 에코하는 대신 stderr에 진짜 네이티브 백트레이스를 내보냅니다([#20](https://github.com/PerryTS/perry/issues/20)). 심볼화된 프레임에는 `PERRY_DEBUG_SYMBOLS=1`이 필요합니다. 없으면 주소를 얻는데, 이것은 그것이 대체한 메시지 에코 동작보다는 여전히 더 많습니다.

## 9\. 마무리

이번 주의 패턴: **배포**(npm), **개발자 경험**(`perry dev`, 증분 캐시), 그리고 **마지막 남은 벤치마크 패배가 닫힘**. 더해서 조용한 누락을 진짜 에러로 바꾸는 컴파일 타임 엄격성 한 묶음. 6일, 94개의 패치 릴리스, 하나의 주요 DX 변화.

시도해 보세요:

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev
```

소스: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — 문서: [docs.perryts.com](https://docs.perryts.com) — 체인지로그: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
