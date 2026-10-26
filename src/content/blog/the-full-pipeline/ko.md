---
title: "완전한 파이프라인: 문서, 배포, WidgetKit"
excerpt: "1주일간 82개 커밋: 49페이지 문서 사이트, App Store 및 Play Store 자동 배포, Homebrew 및 APT 패키지, TypeScript의 네이티브 WidgetKit 확장, 새로운 위젯, http/https 모듈, 셀프 호스팅 LLVM 컴파일러."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
7일 동안 82개의 커밋. 49페이지의 문서 사이트. 자동화된 App Store와 Play Store 게시. Homebrew와 APT 패키지. TypeScript에서 컴파일된 네이티브 WidgetKit 확장. 셀프 호스팅 LLVM 컴파일러. 그리고 모든 플랫폼에 걸친 수십 개의 버그 수정.

이 글은 2026년 3월 6일부터 3월 13일 사이에 Perry에서 출시된 모든 것을 다룹니다. 주제는 완성 — "TypeScript를 작성했다"와 "내 앱이 App Store에 있다" 사이의 격차를 메우는 것입니다.

## docs.perryts.com

Perry에 이제 진정한 문서 사이트가 있습니다. mdBook으로 구축된 49페이지로, 시작하기부터 CLI 레퍼런스까지 모든 것을 다룹니다. 문서는 섹션으로 구성되어 있습니다:

-   **시작하기** — 설치, 첫 프로젝트, 프로젝트 구조
-   **언어 기능** — Perry가 TypeScript에서 지원하는 모든 것
-   **네이티브 UI** — 모든 위젯 유형, 레이아웃, 상태 관리, 플랫폼별 동작을 다루는 12페이지
-   **플랫폼** — 6개 타겟 플랫폼 각각의 전용 페이지
-   **표준 라이브러리** — 50개 이상의 네이티브 패키지 구현 문서화
-   **시스템 API** — 파일 다이얼로그, 키체인, 알림, 멀티 윈도우
-   **WidgetKit** — 새로운 위젯 확장 모듈
-   **플러그인** — 컴파일 타임 플러그인 아키텍처
-   **CLI 레퍼런스** — 모든 커맨드와 플래그

사이트에는 AI 발견성을 위한 `llms.txt` 파일도 포함되어 있으며, [docs.perryts.com](https://docs.perryts.com)의 커스텀 도메인으로 GitHub Pages를 통해 배포됩니다.

## 하나의 명령으로 Perry 설치

Perry는 이제 소스 빌드 외에 Homebrew와 APT를 통해 배포됩니다. 새로운 GitHub Actions 릴리스 파이프라인이 macOS (arm64와 x86\_64) 및 Linux (x86\_64와 arm64)용 바이너리를 빌드한 다음, Homebrew 탭과 APT 리포지토리를 자동으로 업데이트합니다.

terminal

\# macOS

brew tap PerryTS/perry

brew install perry

\# Debian/Ubuntu

sudo apt update && sudo apt install perry

더 이상 리포를 클론하고 Cargo로 빌드할 필요가 없습니다. 다른 도구와 동일한 방식으로 Perry를 설치하세요.

## 자동화된 App Store 게시

이것이 가장 많은 수동 단계를 제거하는 변경입니다. `perry publish ios`를 실행하면 이제 전체 iOS 배포 파이프라인을 자동으로 처리합니다:

1.  App Store Connect API를 통해 RSA 키와 CSR을 생성
2.  배포 인증서를 만들고 `.p12`로 번들
3.  번들 ID를 등록
4.  프로비저닝 프로파일을 생성하고 다운로드
5.  App Store Connect 앱 레코드를 생성
6.  빌드, 서명, TestFlight 또는 App Store에 업로드

Xcode 없음. 수동 포털 방문 없음. 브라우저에서 인증서 다운로드 없음. 설정 마법사가 처음 게시할 때 자동으로 실행되어, API 키 구성을 안내하고 자격 증명을 `perry.toml`에 저장합니다.

macOS 배포도 마찬가지로 자동화되었습니다. Perry는 세 가지 모드를 지원합니다: TestFlight, 공증된 DMG, 그리고 App Store에 게시하고 동시에 공증된 DMG를 만드는 새로운 **"both"** 모드. 세 가지 인증서 유형이 자동 생성됩니다: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION`, `DEVELOPER_ID_APPLICATION`.

Android 게시에도 자동 트리거 설정 마법사가 추가되었습니다. 세 플랫폼 모두 동일한 패턴을 따릅니다: 첫 실행에서 설정이 트리거되고, 자격 증명이 프로젝트에 저장되며, 이후 실행은 제로 구성입니다.

프리플라이트 검증이 빌드 시작 전에 문제를 잡아냅니다 — 프로비저닝 프로파일 번들 ID 불일치, 인증서 만료, 누락된 앱 아이콘, 잘못된 버전 형식, 잘못된 팀 ID. 그리고 `perry.toml [ios]`의 `encryption_exempt`는 Info.plist의 `ITSAppUsesNonExemptEncryption` 키를 자동 설정하여 App Store Connect의 수동 수출 규정 준수 프롬프트를 건너뜁니다.

## perry/widget: TypeScript에서 WidgetKit

Perry는 이제 TypeScript를 네이티브 SwiftUI WidgetKit 확장으로 컴파일할 수 있습니다. 이것은 래퍼나 브릿지가 아닙니다 — 컴파일러가 HIR 수준에서 렌더 트리를 순회하고 SwiftUI 소스 코드를 직접 출력합니다. 출력은 Xcode(또는 Perry의 빌드 파이프라인)가 앱에 포함할 수 있는 완전한 WidgetKit 확장 번들입니다.

terminal

perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/

이 접근 방식은 Perry의 나머지 컴파일과 근본적으로 다릅니다. 일반 Perry 코드는 Cranelift을 거쳐 네이티브 머신 코드로 갑니다. 위젯 코드는 HIR에서 SwiftUI 텍스트 출력으로 갑니다. WidgetKit이 SwiftUI를 요구하기 때문입니다 — 명령형 UIKit이나 AppKit 코드로 위젯 확장을 빌드할 방법이 없습니다. Perry는 위젯 렌더 트리를 런타임 코드가 아닌 컴파일 타임 템플릿으로 처리하여 이를 해결합니다.

## 새로운 위젯과 플랫폼 개선

이번 주에 네 가지 새로운 위젯 유형이 추가되었습니다:

-   **TextArea** — macOS, iOS, Android에서의 다중 줄 텍스트 편집
-   **SecureField** — iOS와 macOS에서의 비밀번호 입력
-   **QR Code** — iOS, macOS, Android에서의 네이티브 QR 코드 생성
-   **Splash Screen** — 자동 생성된 LaunchScreen 스토리보드(iOS)와 스플래시 테마(Android)

### iPad가 네이티브로

Perry는 이제 완전한 iPad 네이티브 앱을 생성합니다: `UIDeviceFamily [1,2]`, 화면 방향 지원, `UIRequiresFullScreen`, 그리고 ibtool을 통한 컴파일된 LaunchScreen 스토리보드. 새로운 `getDeviceIdiom()` 함수가 런타임에 폰 vs. iPad를 감지하고, `PerryFrameSplit` 이 iPad 레이아웃을 위한 프레임 기반 수평 분할 컨테이너를 제공합니다.

### Windows

Windows가 타이머 지원(50ms `WM_TIMER` 틱), 다크 테마 배경의 오너 드로운 버튼, 18개 위젯 파일에 걸친 `to_wide().as_ptr()`의 use-after-free 버그 수정을 받았습니다. V8 런타임이 필요한 시스템 라이브러리가 링크된 상태로 Windows에서 작동합니다.

### GTK4 (Linux)

GTK4 백엔드가 macOS에 맞추기 위한 비주얼 폴리시를 받았습니다: 엣지 인셋용 CSS 패딩, Adwaita 버튼 스타일링, VStack 마진 수정, ScrollView 수평 정책.

## http/https와 better-sqlite3

두 가지 중요한 stdlib 추가:

새로운 `http`와 `https` 네이티브 모듈은 내부에서 reqwest를 사용하는 클라이언트 사이드 HTTP를 제공합니다. API는 Node.js와 일치: `request()`, `get()`, write/end/on이 있는 `ClientRequest`, statusCode와 이벤트 핸들러가 있는 `IncomingMessage`.

`better-sqlite3`가 이제 완전히 지원됩니다: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — 적절한 NaN-boxing과 이름 있는 프로퍼티 접근이 있는 행 객체 포함.

기타 stdlib 개선: `crypto.randomBytes()`가 이제 Buffer를 반환(Node.js와 일치), MongoDB가 `listDatabases`와 `listCollections`를 스레드 안전성 수정과 함께 획득, mysql2 INSERT/UPDATE/DELETE가 이제 `insertId`가 있는 `ResultSetHeader`를 반환.

## GC와 정확성 수정

이번 주에 여러 중요한 가비지 컬렉터와 런타임 정확성 수정이 출시되었습니다:

-   **GC 재진입 가드** — 할당 중 수집을 방지하여 RefCell 이중 차용 패닉을 수정
-   **GC Map 트레이싱** — Map이 이제 마크 페이즈 동안 적절히 트레이스되어 문자열 키 수집을 방지
-   **문자열 앨리어싱 수정** — 문자열 append가 이제 항상 새로운 문자열을 할당하여 포인터 복사 앨리어싱으로 인한 손상을 수정
-   **BigInt 산술** — 오른쪽 시프트가 음수에 대해 산술 시프트를 사용, 비트 연산이 ToInt32 래핑 의미론을 사용
-   **Map.get() undefined** — 누락된 키에 대해 잘못된 NaN 태그 대신 올바른 `TAG_UNDEFINED`를 반환
-   **정적 필드 GC 루트** — 정적 클래스 필드의 BigInt 값이 GC 루트로 등록

이것들은 사소한 수정이 아닙니다. GC 재진입 수정만으로 간헐적 크래시의 전체 클래스가 해결되었습니다. 문자열 앨리어싱 수정은 하나의 문자열 변수를 다른 변수에 할당하고 어느 쪽이든 변경하는 모든 프로그램에 영향을 미쳤습니다. 이것들은 실제 워크로드에서만 나타나는 종류의 버그이며, 이를 수정하는 것이 컴파일러를 프로덕션 등급으로 만드는 것입니다.

## perry-verify: 강화됨

자동화된 앱 검증 서비스인 `perry-verify`가 보안 강화 패스를 받았습니다: Linux에서 `bwrap`와 macOS에서 `sandbox-exec`를 통한 샌드박스 실행, WebSocket 핸드셰이크와 바이너리 다운로드에서의 인증 토큰, IP별 속도 제한, 열거를 방지하는 전체 UUID 작업 ID, 그리고 축소된 바디 제한.

## perrysdad: 셀프 호스팅 컴파일러

병렬 노력에서, TypeScript로 작성된 셀프 호스팅 LLVM IR 컴파일러인 `perrysdad`가 이 주에 다섯 단계를 거쳐 제로에서 셀프 컴파일에 도달했습니다:

1.  **페이즈 0-1** — 엔드투엔드 스켈레톤: HIR에서 LLVM IR 텍스트에서 clang, Perry의 `libperry_runtime.a`에 대해 링크
2.  **페이즈 2** — 실제 `.ts` 파일을 위한 Pratt 표현식 파싱이 있는 수작업 재귀 하강 파서
3.  **페이즈 3** — 런타임 FFI가 있는 배열, 객체, 맵, 더불어 중요한 ABI 불일치 수정(LLVM IR에서 JSValue가 i64 대신 double로 선언)
4.  **페이즈 4** — 클래스, 열거형, 클로저, 모듈 발견과 위상 정렬이 있는 다중 파일 컴파일

마일스톤: 셀프 컴파일된 `anvil` 바이너리가 이제 테스트 프로그램을 컴파일하고 node 컴파일 버전과 일치하는 올바른 출력을 생성할 수 있습니다. TypeScript 컴파일러가, Perry에 의해 네이티브 코드로 컴파일되어, 더 많은 TypeScript를 네이티브 코드로 컴파일합니다. 끝없는 재귀.

## 숫자로 보기

-   **82개 커밋**이 메인 Perry 컴파일러에
-   **1개 릴리스**: v0.2.173 (3월 8일)
-   **49개 문서 페이지**가 docs.perryts.com에
-   **4개 새로운 위젯**: TextArea, SecureField, QR Code, Splash Screen
-   **3개 배포 채널**: Homebrew, APT, 소스
-   **3개 자동화된 스토어 파이프라인**: App Store, TestFlight, Google Play
-   **모든 6개 플랫폼**이 이번 주에 개선을 받았습니다

## 다음 단계

파이프라인이 채워지고 있습니다. TypeScript를 작성하고, 6개 플랫폼으로 컴파일하고, Homebrew나 APT로 배포하고, App Store와 Play Store에 게시하고, 홈 화면 위젯을 추가하고, 포괄적인 문서를 읽을 수 있습니다 — 모두 Perry의 툴체인을 벗어나지 않고. 남은 것:

-   **완전한 정규표현식 지원** — 마지막 주요 언어 격차
-   **perry/ui 확장** — 드래그 앤 드롭, 접근성 레이블, DatePicker
-   **perrysdad 성숙** — 셀프 호스팅 컴파일러를 완전한 Perry 대등성으로 확장
-   **Hub 퍼블릭 베타** — 외부 사용자에게 분산 빌드 공개

진행 상황은 [GitHub](https://github.com/PerryTS/perry)에서 팔로우하고, 새 문서는 [docs.perryts.com](https://docs.perryts.com)에서 읽거나, [로드맵](/ko/roadmap/) 에서 전체 그림을 확인하세요.
