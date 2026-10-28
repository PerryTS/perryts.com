---
title: "진정한 멀티스레딩, 컴파일 타임 i18n, watchOS"
excerpt: "Perry v0.4.0: 컴파일 타임 안전성을 갖춘 실제 OS 스레드, 30개 이상 로케일을 위한 무설정 국제화 시스템, 9번째 컴파일 타겟인 watchOS, 오디오 및 카메라 API, 병렬 컴파일러 파이프라인."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0은 프로젝트 시작 이래 가장 큰 릴리스입니다. 한 사이클에서 세 번의 버전 점프 — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (멀티스레딩) — 그리고 컴파일러 자체도 이제 병렬입니다. 출시된 모든 내용을 소개합니다.

## 진정한 멀티스레딩

Perry에 실제 OS 스레드 병렬 처리가 추가되었습니다. 직렬화 오버헤드가 있는 Web Worker가 아닙니다. `Atomics`를 사용하는 `SharedArrayBuffer`도 아닙니다. 진짜 스레드 — 8MB 스택의 경량 OS 스레드로, 아무것도 공유하지 않으며 유휴 시 비용이 없습니다.

새로운 `perry/thread` 모듈이 세 가지 프리미티브를 제공합니다:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap`과 `parallelFilter`는 CPU 코어 수를 자동 감지하고 입력 배열을 분할합니다. 작은 배열에서는 스레딩을 완전히 건너뛰고 동기적으로 실행합니다 — 사소한 워크로드에 오버헤드가 없습니다.

`spawn`은 백그라운드 OS 스레드를 시작하고 Promise를 반환합니다. 결과는 마이크로태스크 처리 중 드레인되는 대기 결과 큐를 통해 반환되므로, 다른 비동기 작업처럼 `await`할 수 있습니다.

### 컴파일 타임 안전성

가장 중요한 부분은 API가 아니라 컴파일러가 *방지하는* 것입니다. Perry는 뮤터블 변수를 캡처하는 클로저를 정적으로 거부합니다:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

공유 뮤터블 상태가 없다는 것은 데이터 레이스가 없다는 것입니다. 락 없이, 뮤텍스 없이, `Atomics` 없이. 컴파일러가 머신 코드 한 줄이 생성되기 전에 스레드 안전성을 보장합니다.

### 내부 구조

각 워커 스레드는 `Drop` 정리가 있는 자체 메모리 아레나를 가집니다 — 스레드 간 GC 조정이 없습니다. 값은 `SerializedValue` 딥 카피를 통해 전송됩니다: 숫자는 제로 코스트, 문자열/배열/객체는 O(n). 구현은 단일 1,120줄 Rust 파일(`perry-runtime/src/thread.rs`)에 있으며 가비지 컬렉터 변경이 필요하지 않았습니다.

V8 아이솔레이트와 비교하면, 워커당 ~2MB 오버헤드의 별도 힙이 필요합니다. Perry의 스레드는 아레나가 있는 단순한 pthread입니다.

### 병렬 컴파일러 파이프라인

컴파일러 자체도 이제 병렬입니다. 모듈 코드 생성, 변환 패스(JS import, 네이티브 인스턴스, 단형화), `nm` 심볼 스캔이 모두 rayon을 통해 모든 CPU 코어에서 실행됩니다. Cranelift 0.121 업그레이드(0.113에서 — 레지스터 할당과 x64 개선의 8개 마이너 버전)와 결합하여 컴파일이 상당히 빨라졌습니다.

## 컴파일 타임 i18n (v0.3.0)

Perry의 국제화 시스템은 세레모니 제로입니다. UI 위젯의 문자열 리터럴은 자동으로 현지화 가능한 키로 취급됩니다. 번역 파일은 `locales/` 디렉토리의 플랫 JSON입니다. 모든 유효성 검사는 컴파일 시점에 수행됩니다.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

컴파일러가 모든 것을 검증합니다: 누락된 번역, 매개변수 불일치, 복수형 오류. 번역은 내장된 2D 문자열 테이블로 바이너리에 구워져 런타임 조회가 거의 제로입니다 — 시작 시 JSON 파싱이 없습니다.

### 포함된 기능

-   **CLDR 복수형 규칙**: 30개 이상 로케일에 `.one`/`.other`/`.few`/`.many`/`.zero`/`.two` 접미사
-   **포맷 래퍼**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **네이티브 로케일 감지**: 모든 플랫폼 — `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: TS/TSX 파일 스캔, 로케일 JSON 스캐폴드 생성 및 업데이트
-   **플랫폼 네이티브 리소스 생성**: iOS `.lproj` 및 Android `values-xx/` 디렉토리
-   **`import { t } from "perry/i18n"`**: 비 UI 문자열 현지화용

`perry.toml`에서 설정:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## watchOS 네이티브 앱 (v0.3.2)

Perry가 이제 watchOS로 컴파일됩니다 — 9번째 컴파일 대상입니다. 래퍼나 컴패니언 앱이 아닙니다. 네이티브 SwiftUI 인터페이스를 가진 독립형 watchOS 바이너리입니다.

watchOS 렌더러는 **데이터 기반 접근법**을 사용합니다: Perry가 `perry_ui_*` FFI 호출을 통해 UI 트리를 구축하고, 함께 제공되는 `PerryWatchApp.swift`가 트리를 쿼리하여 반응적으로 SwiftUI 뷰를 렌더링합니다. 15가지 위젯 타입이 지원되며 미지원 항목에는 스텁이 있습니다.

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

전체 플로우가 작동합니다: `perry setup watchos`는 App Store Connect 자격 증명을 iOS와 공유하고, `perry run watchos`는 Apple Watch 시뮬레이터를 자동 감지하며, `perry publish watchos`는 App Store에 제출합니다.

이로써 **위젯 대상 총 수가 4개**가 됩니다: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit), Wear OS (Tiles). 각각 고유한 컴파일 대상과 코드 생성 백엔드를 가집니다.

## 오디오 및 카메라 API

이 릴리스에서 두 가지 새로운 하드웨어 API:

### 오디오 캡처 (`perry/system`)

A 가중 dB(A) 측정이 포함된 크로스 플랫폼 오디오 캡처:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

플랫폼 백엔드: AVAudioEngine (macOS/iOS), JNI를 통한 AudioRecord (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### 카메라 캡처 (`perry/ui`)

픽셀 수준 색상 샘플링이 포함된 네이티브 카메라 미리보기 (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## 에코시스템 패키지

두 개의 퍼스트파티 네이티브 패키지 출시:

-   **perry/push** — iOS/macOS용 푸시 알림 바인딩: 권한 요청, APNs 토큰 검색, 배지 카운트. FCM이 계획된 Android 스텁.
-   **perry/storekit** — StoreKit 2 인앱 구매 바인딩: 제품 로딩, JWS 영수증을 통한 구매, 구독 확인, 복원, 트랜잭션 리스너.

둘 다 같은 아키텍처를 따릅니다: TypeScript 선언 → Rust FFI 크레이트 → Swift 브리지. 의존성으로 설치하고, 함수를 가져오고, 결과를 `await`합니다. 컴파일러가 모든 네이티브 브리징을 처리합니다.

## 인프라

-   **Cranelift 0.113 → 0.121** — 레지스터 할당, x64 수정, 스택 슬롯 정렬 개선의 8개 마이너 버전
-   **Windows 함수 분할** — 50개 이상 명령문이 있는 함수를 자동으로 연속으로 분할하여 Windows에서의 Cranelift 코드 생성 문제 우회
-   **선택적 모듈 변수 로딩** — 함수 진입 시 참조된 모듈 수준 변수만 로드하여 Windows 바이너리 크기 26% 감소
-   **Array.sort() 업그레이드** — O(n²) 삽입 정렬에서 O(n log n) TimSort 스타일 하이브리드로
-   **perry run android** — 전체 APK 빌드 파이프라인: 컴파일, Gradle 프로젝트 생성, assembleDebug, 설치, 실행
-   **커스텀 Info.plist 항목** — perry.toml의 `[ios.info_plist]`로 프라이버시 설명, URL 스킴, 백그라운드 모드 설정

## 숫자로 보기

-   **버전**: 0.2.197 → 0.4.0 (세 가지 주요 이정표)
-   **컴파일 대상**: 8 → 9 (watchOS 추가)
-   **위젯 대상**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **새 크레이트**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **새 문서**: 스레딩 (4페이지), i18n (4페이지), watchOS, 확장된 위젯 문서 (3 → 8페이지)
-   **perry/thread 구현**: 1,120줄 Rust, GC 변경 제로

## 다음 계획

스레딩 기반이 많은 것을 열어줍니다: 병렬 HTTP 요청 처리, 동시 파일 작업, 싱글스레드 실행으로 차단되었던 연산 집중 워크로드. 언어 측면에서는 완전한 정규식 지원이 가장 큰 갭으로 남아 있으며, `perry/ui` 확장(드래그 앤 드롭, 접근성, DatePicker)이 계속됩니다.

진행 상황은 [GitHub](https://github.com/PerryTS/perry)에서 팔로우하고, 문서는 [docs.perryts.com](https://docs.perryts.com)에서 읽고, 전체 그림은 [로드맵](/ko/roadmap/) 을 확인하세요.
