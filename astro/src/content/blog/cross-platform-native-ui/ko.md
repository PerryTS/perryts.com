---
title: "TypeScript로 크로스 플랫폼 네이티브 UI 구현"
excerpt: "How Perry maps one TypeScript codebase to platform widgets across its documented targets, including the platform-specific limitations and prerequisites."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Perry의 가장 야심찬 목표 중 하나는 단일 TypeScript 코드베이스에서 진정한 네이티브 GUI 애플리케이션을 제공하는 것입니다. 네이티브 셸로 감싼 웹 뷰가 아닙니다. 자체 픽셀을 그리는 커스텀 렌더링 엔진도 아닙니다. 각 플랫폼 고유의 UI 프레임워크가 렌더링하는 실제 네이티브 위젯을, 빌드 시점에 TypeScript에서 컴파일합니다.

이 글에서는 그 작동 방식 — 아키텍처, 플랫폼 매핑, 트레이드오프, 그리고 현재 상태에 대해 설명합니다.

## 현재 접근 방식의 문제점

크로스 플랫폼 GUI 개발은 수십 년간 어려운 문제였습니다. 모든 주요 프레임워크가 서로 다른 타협을 해왔습니다:

### Electron / Tauri (웹 기반)

Electron은 Chromium과 Node.js를 번들링하여 웹 브라우저를 앱 셸로 제공합니다. 웹 플랫폼에 완전히 접근할 수 있지만, "네이티브" 앱이 150+ MB 다운로드이며 창 하나를 표시하는 데만 수백 MB의 RAM을 사용합니다. Tauri는 Chromium을 OS 웹 뷰로 대체하여 크기를 크게 줄이지만, UI는 여전히 웹 뷰에서 렌더링되는 HTML/CSS이며 네이티브 위젯이 아닙니다.

### React Native (브리지 기반)

React Native는 JavaScript를 JS 엔진(Hermes 또는 V8)에서 실행하고 직렬화된 메시지 큐를 통해 네이티브 위젯으로 브리지합니다. 실제 네이티브 위젯을 얻지만, 브리지가 제스처와 애니메이션에서 지연을 추가합니다. 복잡한 상호작용에는 네이티브 코드(Swift/Kotlin)로 내려가야 하며, 단일 코드베이스의 약속을 깨뜨립니다.

### Flutter (커스텀 렌더러)

Flutter는 Dart를 네이티브 코드로 컴파일하고 자체 Skia 기반 렌더링 엔진으로 모든 것을 그립니다. 성능은 우수하지만 위젯이 네이티브가 아닙니다 — 픽셀 퍼펙트 복제품입니다. 즉, 플랫폼 관례(스크롤 물리, 텍스트 선택, 접근성 동작)를 상속하는 대신 재구현해야 합니다. 데스크톱에서는 차이가 더욱 눈에 띕니다.

### KMP + Compose Multiplatform (부분 네이티브)

Kotlin Multiplatform은 Android에서는 JVM으로, iOS에서는 네이티브로 컴파일하지만, Compose Multiplatform을 통한 공유 UI는 커스텀 Skia 기반 렌더러를 사용합니다 — Flutter와 같은 트레이드오프입니다. 진정한 네이티브 UI를 위해서는 플랫폼별 코드를 다시 작성해야 합니다.

## Perry의 접근 방식: 네이티브 툴킷으로 컴파일

Perry는 근본적으로 다른 접근 방식을 취합니다. 런타임에서 코드를 실행하고 네이티브 위젯으로 브리지하거나 커스텀 픽셀을 그리는 대신, Perry는 TypeScript UI 코드를 빌드 시점에 각 플랫폼의 네이티브 툴킷 호출로 직접 컴파일합니다.

핵심 차이점: **코드와 플랫폼 SDK 사이에 런타임 레이어가 없습니다.** 컴파일된 바이너리는 AppKit, UIKit, Android Views, GTK4, Win32를 직접 호출합니다. Swift, Kotlin, C++로 작성된 앱과 정확히 동일합니다.

## 통합 UI API

Perry는 사용자 인터페이스를 구축하기 위한 공통 TypeScript API를 제공합니다. 이 API는 의도적으로 높은 수준입니다 — UI에 무엇을 포함하고 어떻게 동작해야 하는지를 기술하면, Perry가 적절한 네이티브 구성으로 매핑합니다.

counter.ts

import { App, Text, Button, VStack, State } from "perry/ui";

const count = new State(0);

const app = new App("Counter", { width: 400, height: 300 });

app.body(() => {

return VStack({ spacing: 16, alignment: "center" }, \[

Text(\`Count: ${count.value}\`, { fontSize: 32 }),

Button("Increment", () => count.value++),

Button("Reset", () => count.value = 0),

\]);

});

app.run();

동일한 코드가 6개 플랫폼 모두에서 네이티브 UI로 컴파일됩니다. `#ifdef` 없이, 플랫폼 체크 없이, 조건부 import 없이.

## 플랫폼 매핑 상세

Perry가 통합 API를 각 플랫폼의 네이티브 프레임워크에 어떻게 매핑하는지 설명합니다:

### macOS — AppKit

macOS에서 Perry는 AppKit 객체를 직접 생성하고 관리하는 코드를 생성합니다.`App`은 `NSWindow`를 가진`NSApplication`이 됩니다. `Text`는 `NSTextField`(편집 비활성화)가 됩니다. `Button`은 콜백에 연결된 target-action 패턴을 가진`NSButton`이 됩니다. `VStack`은 수직 방향의 `NSStackView`가 됩니다. 레이아웃은 Auto Layout 제약 조건을 사용합니다.

컴파일된 바이너리는 AppKit 프레임워크에 링크하고 Objective-C 런타임 함수를 직접 호출합니다. Xcode로 컴파일된 Swift와 동일한 일을 합니다.

### iOS 및 iPadOS — UIKit

iOS에서 매핑은 유사하지만 UIKit을 대상으로 합니다. `App`은 `UIWindow`와 루트 `UIViewController`를 가진`UIApplication`이 됩니다. `Text`는 `UILabel`에 매핑됩니다. `Button`은 `UIButton`에 매핑됩니다. 레이아웃은 `UIStackView`과 Auto Layout을 사용합니다. 터치 이벤트는 UIKit의 리스폰더 체인을 통해 처리됩니다.

### Android — JNI + Views

Android에서 Perry는 JNI(Java Native Interface)를 통해 로드되는 네이티브 라이브러리를 생성합니다. `App`은 `Activity`에 매핑됩니다. `Text`는 `TextView`가 됩니다. `Button`은 `OnClickListener`가 있는`android.widget.Button`이 됩니다. `VStack`은 수직 `LinearLayout`에 매핑됩니다. 네이티브 코드는 JNI를 통해 Android 프레임워크를 호출하여 실제 Android 뷰를 생성하고 조작합니다.

### Linux — GTK4

Linux에서 Perry는 GTK4를 대상으로 합니다. `App`은 `GtkApplicationWindow`를 가진`GtkApplication`이 됩니다. `Text`는 `GtkLabel`에 매핑됩니다. `Button`은 시그널 핸들러가 있는`GtkButton`에 매핑됩니다. `VStack`은 수직 방향의 `GtkBox`에 매핑됩니다. GTK의 CSS 테마 기능으로 앱이 사용자의 데스크톱 테마를 자동으로 따릅니다.

### Windows — Win32

Windows에서 Perry는 Win32 API 호출을 생성합니다. `App`은 윈도우 클래스를 생성하고 등록하며 메시지 루프를 실행합니다. `Button`은 `CreateWindowEx`로 생성된`BUTTON` 컨트롤이 됩니다. `Text`는 `STATIC` 컨트롤에 매핑됩니다. 이벤트는 Win32 메시지 펌프(`WM_COMMAND`, `WM_NOTIFY` 등)를 통해 처리됩니다.

## 상태 관리

Perry의 `State<T>` 프리미티브는 플랫폼 네이티브의 업데이트 메커니즘으로 컴파일되는 반응형 상태 관리를 제공합니다. 상태 값이 변경되면 Perry는 플랫폼 고유의 무효화 시스템을 통해 UI 업데이트를 트리거합니다 — macOS/iOS에서는`setNeedsDisplay`, Android에서는 `invalidate()`, Linux에서는 `gtk_widget_queue_draw`.

가상 DOM 비교도, 재조정 패스도, 직렬화도 없습니다. 상태 변경은 값을 표시하는 네이티브 위젯에 직접 전파됩니다.

## 왜 SwiftUI / Jetpack Compose 문법이 아닌가?

Perry가 SwiftUI나 Jetpack Compose와 유사한 선언적 문법을 사용하지 않는 이유가 궁금할 수 있습니다. 답은 실용적입니다: Perry는 TypeScript를 컴파일하며, TypeScript에는 고유한 관용구가 있습니다. TypeScript 개발자에게 낯선 DSL을 만드는 대신, Perry는 TypeScript에서 자연스럽게 느껴지는 빌더 스타일 API를 사용합니다 — 생성자, 메서드 호출, 콜백, 클로저. Express, React 훅, 기타 TypeScript 라이브러리에서 이미 사용하고 있는 것과 동일한 패턴입니다.

## 현재 사용 가능한 것

6개 플랫폼 백엔드 모두 구현되어 안정적입니다. 현재 위젯 세트:

-   **레이아웃** — VStack, HStack, Spacer, ScrollView, Divider
-   **표시** — Text, Image
-   **입력** — Button, TextField, Toggle, Slider
-   **내비게이션** — NavigationView, TabView, List
-   **컨테이너** — TreeView, SearchBar, StatusBar
-   **상태** — 반응형 업데이트를 위한 State<T>

## 향후 계획

위젯 라이브러리를 적극적으로 확장하고 있습니다. 다음 예정:

-   `SecureField` — 플랫폼 네이티브 보안 텍스트 입력을 사용한 비밀번호 입력
-   `ProgressView` — 확정 및 비확정 진행률 표시기
-   `Alert` — 버튼과 텍스트 필드가 있는 네이티브 경고 대화상자
-   `DatePicker` — 플랫폼 네이티브 날짜/시간 선택
-   `Menu` — 네이티브 메뉴 바와 컨텍스트 메뉴

목표는 모든 플랫폼에서 완전한 GUI 프레임워크 패리티를 달성하는 것입니다 — 모든 위젯, 레이아웃, 제스처, 애니메이션이 어디서든 사용 가능하도록. 전체 그림은 [로드맵](/ko/roadmap/)을 참조하세요.

## 직접 체험하기

Perry의 네이티브 UI를 이해하는 가장 좋은 방법은 실제로 동작하는 것을 보는 것입니다. [Pry](/ko/showcase/pry/)는 Perry로 완전히 TypeScript로 구축된 네이티브 JSON 뷰어입니다 — 트리 내비게이션, 검색, 키보드 단축키를 갖춘 실제 앱으로, macOS, iOS, Android에서 네이티브 바이너리로 컴파일됩니다. 구축 과정의 [전체 워크스루](/ko/blog/building-pry/) 를 읽어보세요.
