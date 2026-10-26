---
title: "tvOS, Linux에서 iOS 크로스 컴파일, Perry Login"
excerpt: "Perry v0.4.24: 10번째 컴파일 타겟인 tvOS, ld64.lld를 통한 Linux에서 iOS 및 macOS 크로스 컴파일, 사용량 기반 과금의 perry login, Windows UI 개편, macOS 공증, 5일간 120개 커밋."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
5일, 120개 커밋, Perry가 v0.4.0에서 v0.4.24로 도약했습니다. 하이라이트: tvOS가 10번째 컴파일 대상이 되고, iOS와 macOS 앱을 이제 Linux에서 완전히 빌드할 수 있으며, perry login으로 사용량 기반 과금이 도입되고, Windows UI가 전면 개편되었습니다. 출시된 모든 내용을 소개합니다.

## tvOS: 10번째 컴파일 대상

Perry가 이제 Apple TV로 컴파일됩니다. tvOS 대상은 watchOS와 동일한 SwiftUI 렌더러를 사용하여, Perry가 UI 트리를 구축하고 함께 제공되는 Swift 호스트 앱이 네이티브로 렌더링하는 데이터 기반 아키텍처를 공유합니다. 기존 `@perry/threads` WASM 통합과 결합하여, tvOS 앱은 UI를 반응적으로 유지하면서 백그라운드에서 무거운 작업을 실행할 수 있습니다.

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

총 대상 수가 **10개**가 되었습니다: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly, Web/JavaScript. 하나의 TypeScript 코드베이스, 10개의 네이티브 출력.

## Linux에서 iOS와 macOS 크로스 컴파일

Perry가 이제 `ld64.lld`를 Mach-O 링커로 사용하여 Linux 머신에서 완전히 iOS와 macOS 바이너리를 빌드할 수 있습니다. 완전 자동화된 CI/CD의 마지막 퍼즐 — Linux 서버에 TypeScript를 푸시하면 macOS 빌드 머신 없이 모든 Apple 플랫폼용 서명된 네이티브 바이너리를 얻을 수 있습니다.

여기에 도달하려면 링커 문제의 연쇄를 해결해야 했습니다:

-   **Mach-O 코드 생성 트리플** — Cranelift용 `aarch64-apple-macos`와 `aarch64-apple-ios` 타겟 트리플 추가
-   **프레임워크 링킹** — 크로스 컴파일용 CoreGraphics, Metal, IOKit, DiskArbitration 프레임워크 검색 경로
-   **`-lobjc`** — 모든 Apple 타겟에 필요한 ObjC 런타임 심볼
-   **SDK 버전** — ld64.lld에서 `sdk_version 26.0` (Apple이 iOS 18+ 요구)
-   **데드 스트리핑** — Mach-O 링커용 `-Wl,-dead_strip` 대신 `-dead_strip`
-   **런타임 중복 제거** — 링크 오류를 피하기 위해 UI 정적 라이브러리에서 중복 `perry_runtime` 제거

기존 Linux → Windows 크로스 컴파일(v0.2.195+)과 결합하여, Perry는 이제 **Linux에서 모든 플랫폼으로** 크로스 컴파일할 수 있습니다 — iOS, macOS, Windows, Android, WASM, Web.

## iOS App Store 준비

이 사이클의 주요 초점은 Perry로 컴파일된 iOS 앱을 App Store에 완전히 준수하도록 만드는 것이었습니다:

-   **전체 Info.plist** — Apple 필수 키 모두: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — 표준 iOS 아이콘 명명(`AppIcon60x60@2x` 등) 폴백 해상도 포함
-   **perry.toml에서 버전** — `version`과 `build_number` 필드가 Info.plist에 직접 반영
-   **UILaunchScreen** — `UILaunchStoryboardName` 대신 모던 키 사용 (스토리보드 파일 불필요)
-   **프로비저닝 프로파일** — App Store 및 TestFlight 배포용 macOS 프로비저닝 프로파일 지원

## Perry Login과 과금

Perry에 계정과 사용량 기반 과금이 추가되었습니다. 새로운 `perry login` CLI 명령과 [app.perryts.com](https://app.perryts.com) 대시보드로 구동됩니다.

### 작동 방식

-   **`perry login`** — GitHub OAuth 디바이스 플로우, 브라우저를 열고 완료를 폴링
-   **무료 티어** — 월 15회 빌드, GitHub 계정으로 무제한 프로젝트
-   **Pro 티어** — Polar.sh 구독으로 무제한 빌드
-   **API 토큰** — CI/CD용으로 대시보드에서 토큰 생성 및 관리
-   **사용량 추적** — 실시간 사용량 바가 있는 월간 publish 및 verify 카운터

대시보드 자체가 Perry로 컴파일된 Fastify 서버와 Next.js 정적 내보내기입니다 — Perry로 만들어져 Perry 사용자에게 서비스를 제공합니다.

## macOS 공증과 코드 서명

두 가지 새로운 서명 기능:

-   **`perry publish macos --notarize`** — 자동으로 Developer ID 인증서로 전환(App Store 인증서 대신), Apple 공증 서비스에 제출하고 결과를 스테이플
-   **GCloud KMS 코드 서명** — Windows 빌드를 Google Cloud KMS 키로 서명 가능, 프라이빗 키를 노출하지 않고 CI에서 자동 서명 활성화

## Windows UI 전면 개편

Windows UI 백엔드가 가장 포괄적인 업데이트를 받았습니다:

-   **DPI 인식 스케일링** — 창 크기, 폰트, 위젯 치수가 고DPI 디스플레이에서 올바르게 스케일
-   **런처 스타일 윈도우 API** — 런처/스포트라이트 스타일 UI를 위한 보더리스 윈도우와 커스텀 포지셔닝
-   **글로벌 핫키** — 앱에 포커스가 없을 때도 작동하는 시스템 전역 키보드 단축키
-   **앱 아이콘** — 런처 UI에서 애플리케이션 아이콘을 표시하는 `getAppIcon` API
-   **재진입 안전 레이아웃** — 중첩된 WM\_PAINT 메시지 중 패닉을 방지하기 위해 `RefCell` 기반 페인팅을 `SetPropW` HWND 스토리지로 교체
-   **Geisterhand 통합** — 모든 위젯 타입이 UI 테스트 프레임워크에 등록, `/type`이 HWND 맵을 통해 `SendMessageW` 사용
-   **Android 카메라 지원** — JNI를 통해 Android에 카메라 캡처 API 확장

## 성능

v0.4.14에서 포괄적인 성능 감사 출시:

-   **네이티브 `fcmp`** — 부동소수점 비교가 런타임 함수 호출 대신 네이티브 CPU 명령 사용. 만델브로 벤치마크 **30% 빨라짐**.
-   **인플레이스 문자열 추가** — `str += "text"`가 새 문자열 할당 대신 버퍼를 인플레이스로 수정. 반복 연결에서 **125배 빨라짐**.
-   **단축 AND/OR** — `&&`과 `||`이 결과가 이미 결정된 경우 오른쪽 피연산자 평가를 건너뜀.
-   **음수 리터럴 폴딩** — `-1`, `-0.5` 등이 부정 명령을 출력하는 대신 HIR 수준에서 상수로 폴딩.

## Hub 병렬 빌드

빌드 오케스트레이션 서버가 이제 워커당 동시 빌드를 지원합니다:

-   **슬롯 기반 디스패치** — 워커가 `max_concurrent` 용량을 보고, Hub가 워커당 활성 작업을 추적
-   **더 이상 429 없음** — 모든 워커가 바쁠 때 작업이 거부되는 대신 큐잉
-   **Base64 아티팩트 다운로드** — Perry 런타임이 원시 바이너리 HTTP 응답을 처리할 수 없을 때 바이너리 아티팩트를 base64로 제공
-   **자동 재연결 WebSocket** — 빌드 모니터링 연결이 연결 해제 시 자동 재연결

## 새 패키지: perry/appstorereview

앱 스토어 리뷰를 요청하기 위한 새로운 퍼스트파티 패키지:

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

하나의 함수, 두 플랫폼, 네이티브 리뷰 UI. 타이밍과 표시 로직은 전적으로 개발자에게 맡겨집니다.

## 코드 생성 수정

120개 커밋은 많은 버그 수정을 의미합니다. 가장 영향력 있는 것들:

-   **엄격한 동등성 (===)** — v0.4.2에서 세 가지 별도 버그 수정: 타입 태그 비교, NaN 처리, null/undefined 구분
-   **연결된 문자열의 문자열 비교** — 내용 비교 대신 포인터 비교로 인해 연결을 통해 구축된 문자열 비교 시 `===` 실패
-   **생성자 해석** — `new X(args)`가 이제 크로스 모듈 임포트된 생성자와 클로저 기반 생성자 함수를 올바르게 해석
-   **모듈 수준 배열 push** — 루프 내 중첩 함수 호출에서 모듈 수준 배열에 push된 값이 재할당 후 오래된 포인터로 인해 손실
-   **null 산술 변환** — `null + 1`이 이제 `js_number_coerce`를 통해 올바르게 `1`을 생성
-   **비트와이즈 NOT 래핑** — `~x`가 이제 ECMAScript 시맨틱에 따라 i32로 래핑
-   **fetch().then()** — 누락된 이벤트 루프 드레인으로 인해 네이티브 UI 앱에서 콜백이 발화되지 않음 (v0.4.3)
-   **WASM 모듈러와 지수** — `%`와 `**` 연산자가 WASM 유효성 검사 오류 유발 (v0.4.5)

## 숫자로 보기

-   **~120개 커밋** (5일간 Perry 메인 컴파일러에)
-   **24개 패치 릴리스**: v0.4.1 → v0.4.24
-   **컴파일 대상**: 9 → 10 (tvOS 추가)
-   **Linux에서의 크로스 컴파일 대상**: Windows → Windows, iOS, macOS (모든 Apple + Windows)
-   **새 패키지**: perry/appstorereview
-   **새 인프라**: app.perryts.com 대시보드, perry login CLI, Polar.sh 과금
-   **성능 향상**: 만델브로 30% 빨라짐 (네이티브 fcmp), 문자열 연결 125배 빨라짐

## 다음 계획

Linux에서의 iOS와 macOS 크로스 컴파일로 Hub가 이제 단일 Linux 서버에서 모든 플랫폼용으로 빌드할 수 있습니다 — 컴파일을 위한 전용 macOS 빌드 머신이 더 이상 필요 없습니다(서명만 필요). 과금 인프라가 Hub 공개 베타의 길을 엽니다. tvOS 추가로 Perry는 모든 Apple 플랫폼을 커버합니다: macOS, iOS, iPadOS, watchOS, tvOS.

-   **Hub 공개 베타** — 외부 사용자가 TypeScript를 푸시하고 네이티브 바이너리를 받을 수 있음
-   **완전한 정규식 지원** — 마지막 주요 언어 갭
-   **perry/ui 확장** — 드래그 앤 드롭, 접근성, DatePicker
-   **소스 맵 및 디버그 정보** — 네이티브 디버깅용 DWARF 디버그 정보

진행 상황은 [GitHub](https://github.com/PerryTS/perry)에서 팔로우하고, 문서는 [docs.perryts.com](https://docs.perryts.com)에서 읽고, 전체 그림은 [로드맵](/ko/roadmap/) 을 확인하세요.
