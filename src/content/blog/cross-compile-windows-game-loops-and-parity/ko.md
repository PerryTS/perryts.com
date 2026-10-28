---
title: "Windows 크로스 컴파일, iOS 게임 루프, 100% 테스트 패리티"
excerpt: "1주일간 103개 커밋: lld-link를 통한 Linux에서 Windows로의 크로스 컴파일, iOS 게임 루프 지원, 크래시 리포팅, 2단계 Hub 빌드 파이프라인, 셀프 호스팅 컴파일러가 68/68 결정론적 테스트 패리티 달성."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
이번 주 Perry 컴파일러에 103개의 커밋이 있었습니다. 주요 기능: Linux에서 Windows 실행 파일을 크로스 컴파일할 수 있게 되었고, iOS 앱에서 블로킹 게임 루프를 실행할 수 있으며, 컴파일러가 텔레메트리를 위한 크래시를 보고하고, 셀프 호스팅 컴파일러가 모든 결정론적 테스트를 통과합니다. 또한 주요 Hub 인프라 업그레이드와 50개 이상의 버그 수정이 포함되어 있습니다.

## Linux에서 Windows로 크로스 컴파일

Perry는 이제 Linux 호스트에서 Windows `.exe` 바이너리를 생성할 수 있습니다. 이것은 전체 컴파일을 위해 Windows 빌드 머신을 실행하지 않고도 Windows를 타겟으로 해야 하는 CI/CD 파이프라인에 없었던 마지막 퍼즐 조각입니다.

이 구현은 컴파일 타임 `#[cfg]` 검사를 런타임 타겟 감지로 대체합니다. 컴파일러가 비-Windows 호스트에서 Windows 타겟을 감지하면, 새로운 `find_llvm_tool()` 헬퍼를 통해 Rust 툴체인이나 PATH에서 `lld-link`, `llvm-nm`, 그리고 `llvm-ar`을 찾습니다. Windows 시스템 라이브러리는 `PERRY_WINDOWS_SYSROOT`가 가리키는 [xwin](https://github.com/Jake-Shadle/xwin) 스타일 sysroot에서 제공됩니다.

링커는 자동으로 `/FORCE:UNRESOLVED`를 사용하고 누락된 UI 심볼에 대한 스텁을 생성하므로 CLI 앱이 깔끔하게 크로스 컴파일됩니다. Windows를 타겟으로 할 때 출력은 기본적으로 `.exe`입니다. 자세한 내용은 [크로스 컴파일 문서](https://docs.perryts.com)에서 확인하세요.

**터미널 — Linux 호스트**

```
$ perry compile main.ts --target windows
Compiling main.ts for windows-x86_64...
Using lld-link from Rust toolchain
✓ Compiled executable: main.exe (2.8 MB)
```

## iOS 게임 루프 지원

iOS는 UIKit이 메인 스레드를 소유해야 합니다. 이벤트 기반 앱에는 문제없지만, 블로킹 `while (!shouldClose)` 루프가 필요한 게임에는 문제가 됩니다. Perry는 이제 `--features ios-game-loop` 플래그로 이 문제를 해결합니다.

활성화하면 컴파일러는 `main` 대신 `_perry_user_main`을 출력합니다. 런타임은 메인 스레드에서 `UIApplicationMain`을 호출하고 백그라운드 스레드에서 사용자 코드를 생성하는 `main()`을 제공합니다. Scene delegate와 app delegate가 전체 UIKit 라이프사이클을 처리하는 동안 게임 루프는 차단 없이 실행됩니다.

**main.ts**

```typescript
// Your game loop runs on a background thread
while (!shouldClose) {
update();
render();
awaitNextFrame();
}
```

```text
$ perry run ios --features ios-game-loop
```

이로써 게임, 시뮬레이션, 실시간 시각화 등 이전에는 iOS에서 실용적이지 않았던 앱의 전체 카테고리가 가능해졌습니다. iOS 펌프 및 콜백 경로도 이제 패닉 처리로 래핑되어, 게임 루프나 UIKit 라이프사이클에서의 크래시가 깔끔하게 캐치됩니다.

## 크래시 리포팅

Perry로 컴파일된 앱은 이제 시작 시 패닉 훅과 `SIGSEGV`, `SIGBUS`, 그리고 `SIGABRT`에 대한 시그널 핸들러를 설치합니다. 치명적인 크래시가 발생하면, Chirp 텔레메트리 시스템을 위해 `~/.hone/crash.log`에 상세 내용이 기록됩니다. 캐치된 패닉( `catch_callback_panic` 내)은 로그를 클리어하므로, 진정으로 복구 불가능한 크래시만 보고됩니다.

이것은 프로덕션 준비 기능입니다. 현장에서 문제가 발생하면 우리가 알 수 있으며 — 크래시 로그에는 사용자가 수동으로 보고할 필요 없이 문제를 진단할 수 있는 충분한 컨텍스트가 포함되어 있습니다.

## Hub: 2단계 Windows 빌드 파이프라인

Perry Hub 빌드 인프라가 중대한 아키텍처 업그레이드를 받았습니다. 이전에는 Windows용 빌드에 전체 컴파일을 위한 Windows 워커가 필요했습니다. 이제 파이프라인이 두 단계로 나뉩니다:

1.  Linux 워커가 새로운 lld-link 지원을 사용하여 Windows 아티팩트를 크로스 컴파일
2.  Hub이 사전 컴파일된 아티팩트를 보유하고 Windows 워커를 위해 작업을 다시 큐에 넣음
3.  Windows 워커는 서명과 패키징만 처리 — 훨씬 가벼운 작업

워커가 `complete`를 `needs_finishing: "windows"`와 함께 보내면, Hub은 투명하게 작업을 다시 큐에 넣습니다. CLI에서는 매끄러운 단일 빌드 경험으로 보입니다.

Hub은 이제 Windows 워커가 연결되어 있지 않을 때 Azure Windows VM을 자동 시작하며, 빌드 워커는 새 릴리스에서 최신 Perry 버전으로 자동 업데이트됩니다. 수동 인프라 관리가 줄어들고 빌드가 빨라집니다.

## 문서 개편

이번 주 [docs.perryts.com](https://docs.perryts.com)에 두 가지 주요 문서 재작성이 배포되었습니다:

-   **perry.toml 레퍼런스** — 모든 설정 옵션, 번들 ID 해석, 엔트리 파일 해석, 빌드 번호 자동 증가, CI/CD 예제를 포괄하는 완전한 섹션 문서
-   **Geisterhand 레퍼런스** — 크로스 플랫폼 UI 테스트 프레임워크의 전체 API 문서, 플랫폼 설정, 테스트 자동화 패턴, 아키텍처 개요

점진적 업데이트가 아닙니다. 모든 기능과 설정 옵션을 다루는 처음부터의 재작성입니다. 새 프로젝트를 설정하거나 테스트를 작성하고 있다면 여기서 시작하세요.

## 크로스 플랫폼 메뉴 API

`menuClear`와 `menuAddStandardAction`는 이전에 macOS 전용이었습니다. 이제 6개의 모든 네이티브 플랫폼에서 작동합니다. Windows에서 `dispatch_menu_item`의 `RefCell` 재진입 패닉 수정도 포함되어 있습니다.

### Android: 16 KB 페이지 정렬

Google Play는 이제 네이티브 라이브러리에 16 KB 페이지 정렬을 요구합니다. Perry는 적절한 `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` 를 자동으로 설정하며, 컴패니언 `.so` 파일이 APK/AAB 포함을 위해 출력 옆에 복사됩니다.

## Perry React: 칸반 보드

React 호환성 레이어가 실제 테스트를 받았습니다: 이동, 추가, 삭제, 보기 작업이 있는 전체 5열 칸반 보드입니다. 이를 빌드하면서 JSX의 중첩 배열 children 렌더링이 발견되고 수정되었습니다 — 재귀적 `_appendChildren` 핸들러가 이제 `.map()` 호출에서 반환된 배열을 적절히 평탄화합니다. 다양한 UI 패턴을 다루는 14개 섹션의 Kitchen Sink WorkBench 데모도 새로 추가되었습니다.

## Anvil: 100% 결정론적 테스트 동등성

`perrysdad` — TypeScript로 작성되고 Perry로 컴파일된 셀프 호스팅 LLVM 컴파일러 — 가 이제 **68개 중 68개**의 결정론적 테스트를 통과하여, 메인 컴파일러의 출력과 정확히 일치합니다. 유일한 차이점은 본질적인 것(타임스탬프, `Math.random()`)이며, 11개의 테스트는 아직 구현되지 않은 UI, 타이머, 암호화 또는 플랫폼별 기능을 필요로 하기 때문에 건너뜁니다.

이를 달성하기 위한 핵심 작업:

-   **인터페이스 메서드 디스패치** — 인터페이스 타입 변수가 ObjectHeader의 class\_id 기반 디스패치를 통해 올바른 메서드를 반환
-   **동적 속성 접근** — 계산된 속성 이름에 대한 런타임 디스패치
-   **클로저와 this 바인딩** — 객체 메서드에 대한 올바른 캡처 시맨틱
-   **6단계 진행 중** — async/await, 제너레이터, 조건 수정

결정론적 테스트 100% 동등성은 중요한 이정표입니다. 셀프 컴파일된 `anvil` 바이너리가 테스트 가능한 모든 시나리오에서 메인 컴파일러와 정확히 동일한 출력을 생성한다는 것을 의미합니다. 완전한 셀프 호스팅을 향한 격차가 좁혀지고 있습니다.

## 50개 이상의 버그 수정

이번 주 주요 정확성 개선 작업이 있었습니다. 하이라이트:

-   **JSON.parse** — 배열이 더 이상 16개 요소에서 잘리지 않으며, 잘못된 입력이 올바르게 처리됨
-   **Uint8Array** — 배열 변수로부터의 생성자, `.set(source, offset)` 구현 (이전에는 no-op)
-   **BigInt** — 크로스 모듈 호출을 위한 `BIGINT_TAG` NaN-boxing, keccak256 32비트 절단 수정
-   **Optional chaining** — 중첩된 조건식, toString 감지, 반환값 NaN-boxing
-   **IndexSet** — `POINTER_TAG` 대신 `STRING_TAG`를 사용하도록 문자열 NaN-boxing 수정
-   **MySQL** — DATETIME 및 BLOB 타입, `Date(string)` 생성자
-   **Math.min/max** — 스프레드 인수 처리
-   **네이티브 메서드 디스패치** — `POINTER_TAG` 객체에 대한 field-scan-and-call

이것들은 엣지 케이스가 아닙니다. JSON.parse가 배열을 16개 요소에서 잘라내면 실제 애플리케이션이 모두 깨집니다. Uint8Array.set이 no-op이면 데이터가 조용히 손상됩니다. 이것들은 한 번에 하나의 정확성 버그를 수정하며 컴파일러를 프로덕션 등급으로 만드는 수정입니다.

## 숫자로 보는 성과

-   **103 커밋**을 메인 Perry 컴파일러에
-   **3 버전**: v0.2.195, v0.2.196, v0.2.197
-   **1개의 주요 기능**: Linux에서 Windows로 크로스 컴파일
-   **1개의 새로운 앱 카테고리**: iOS 게임 루프
-   **68/68** perrysdad 결정론적 테스트 동등성
-   **50개 이상의 버그 수정**: NaN-boxing, stdlib, 네이티브 FFI 전반
-   **2개의 문서 재작성**: perry.toml과 Geisterhand
-   **5개의 Hub 개선**: 2단계 파이프라인, Azure 자동 시작, 워커 자동 업데이트

## 다음 단계

Windows 크로스 컴파일은 완전 자동화된 멀티 플랫폼 CI/CD의 문을 엽니다 — TypeScript를 푸시하면 각 OS 전용 빌드 머신 없이 모든 타겟에 대한 네이티브 바이너리를 얻을 수 있습니다. 게임 루프 지원은 iOS 앱의 완전히 새로운 카테고리를 열어줍니다. 그리고 perrysdad의 100% 결정론적 테스트 동등성은 셀프 호스팅이 매우 현실적이 되고 있음을 의미합니다. 남은 것:

-   **완전한 regex 지원** — 마지막 주요 언어 격차
-   **perry/ui 확장** — 드래그 앤 드롭, 접근성 라벨, DatePicker
-   **perrysdad 6단계** — async/await, 제너레이터, 완전한 Perry 동등성을 향한 확장
-   **Hub 퍼블릭 베타** — 분산 빌드를 외부 사용자에게 개방

진행 상황은 [GitHub](https://github.com/PerryTS/perry)에서 팔로우하고, 문서는 [docs.perryts.com](https://docs.perryts.com)에서 읽거나, [로드맵](/ko/roadmap/) 에서 전체 그림을 확인하세요.
