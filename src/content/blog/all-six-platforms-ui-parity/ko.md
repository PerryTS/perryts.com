---
title: "6개 플랫폼 모두, 완전한 기능 패리티"
excerpt: "20개 이상의 네이티브 UI 위젯, Canvas 위젯, 테이블 뷰, 시스템 알림, 키체인 접근, 멀티 윈도우 지원, 그리고 macOS, iOS, iPadOS, Android, Linux, Windows에서의 완전한 기능 패리티 — 모두 하나의 TypeScript 코드베이스에서."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Perry의 네이티브 UI 시스템 첫 번째 버전을 출시했을 때, "크로스 플랫폼"이란 macOS가 잘 작동하고 나머지 5개 플랫폼은 스텁이라는 의미였습니다. v0.2.162인 오늘, 더 이상 그렇지 않습니다. 6개 플랫폼 모두 — macOS, iOS, iPadOS, Android, Linux, Windows — 가 완전한 기능 동등성을 공유합니다. 동일한 TypeScript 코드가 모든 타겟에서 네이티브 위젯으로 컴파일됩니다.

이 글에서는 v0.2.152부터 v0.2.164 사이에 출시한 내용을 다룹니다: Canvas 위젯, 완전한 NSTableView 구현, 20개 이상의 UI 위젯, `perry/system` 모듈, 멀티 윈도우 지원, 시스템 알림, 키체인 액세스, 자동 바이너리 크기 축소, 그리고 컴파일 타임 플러그인 시스템. 많은 일이 있었습니다.

## 위젯 스프린트: 20개 이상의 네이티브 UI 컴포넌트

가장 큰 도약은 v0.2.155에서 이루어졌으며, 모든 플랫폼에 걸쳐 20개 이상의 UI 위젯이 추가되었습니다. Perry의 TypeScript UI API는 이제 실제 앱을 출시하는 데 필요한 컴포넌트를 다룹니다:

-   **레이아웃** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **입력** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **표시** — Text, Label, Image, ProgressView, Divider, Spacer
-   **데이터** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **오버레이** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **드로잉** — Canvas (2D 드로잉 API, 플랫폼별 하드웨어 가속)

이것들은 커스텀 렌더러의 래퍼가 아닙니다. 각 위젯은 플랫폼 고유의 네이티브 컴포넌트로 컴파일됩니다: macOS에서는 `NSButton`, iOS에서는 `UIButton`, Linux에서는 `GtkButton`, Android에서는 JNI를 통한 `android.widget.Button`, Windows에서는 `CreateWindowEx`. OS가 이를 그리고, 테마를 적용하고, 접근성을 처리합니다 — Perry는 TypeScript API를 연결할 뿐입니다.

## Canvas: TypeScript에서의 2D 드로잉

기술적으로 가장 흥미로운 추가 기능 중 하나가 Canvas 위젯(v0.2.152)입니다. TypeScript에서 직접 익숙한 2D 드로잉 API — 베지어 곡선, 채우기, 스트로크, 이미지 블리팅 — 를 제공하며, 플랫폼의 가속 2D 백엔드로 컴파일됩니다: macOS/iOS에서는 Core Graphics, Linux에서는 Cairo, Windows에서는 Direct2D, Android에서는 Skia.

**canvas.ts**

```typescript
import { Canvas, Color } from 'perry/ui';
// Compiles to Core Graphics on macOS, Cairo on Linux, etc.
const canvas = new Canvas({ width: 400, height: 300 });
canvas.onDraw((ctx) => {
  ctx.fillStyle = Color.amber;
  ctx.fillRect(10, 10, 100, 60);
  ctx.strokeStyle = Color.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(200, 150, 80, 0, Math.PI * 2);
  ctx.stroke();
});
```

## Table 위젯: NSTableView가 TypeScript로

v0.2.163에서 Table 위젯이 추가되었습니다 — 라이브러리에서 가장 복잡한 컴포넌트입니다. macOS에서는 완전한 delegate/data source 연결을 갖춘 `NSTableView`에 매핑됩니다. Linux에서는 GTK4의 `GtkTreeView`를 사용합니다. Windows에서는 Win32의 `ListView` 컨트롤. Android에서는 JNI를 통해 `RecyclerView`에 바인딩됩니다.

TypeScript API는 선언적입니다: 컬럼을 정의하고 데이터 소스를 제공하면, Perry가 컴파일 타임에 플랫폼별 연결을 처리합니다. 컬럼 정렬, 선택 처리, 행 높이 커스터마이징이 모두 기본으로 작동합니다.

**table.ts**

```typescript
import { Table, Column } from 'perry/ui';
const table = new Table({
  columns: [
    new Column({ title: "Name", key: "name", width: 200 }),
    new Column({ title: "Size", key: "size", width: 80 }),
  ],
  rows: files,  // TypeScript array of objects
  onSelect: (row) => console.log(row.name),
});
```

## perry/system 모듈

v0.2.155에서는 `perry/system`도 도입되었습니다 — 런타임 없이 플랫폼 시스템 API를 노출하는 TypeScript 모듈입니다: 파일 다이얼로그, 저장 다이얼로그, 알림, 시트, 키체인 액세스, 시스템 알림, 멀티 윈도우 관리.

-   `system.showOpenDialog()` — 네이티브 파일 선택기 (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — 네이티브 저장 다이얼로그
-   `system.showAlert()` — 네이티브 알림 패널
-   `system.notify()` — OS 알림 (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — 키체인 서비스/비밀 서비스/Windows 자격 증명 저장소
-   `system.openWindow()` — 멀티 윈도우 관리

이 모든 것이 네이티브 플랫폼 API를 직접 호출합니다 — Electron IPC도, 웹 뷰 브리지도 없습니다. Perry는 TypeScript 호출 지점을 플랫폼 SDK로의 직접 네이티브 함수 호출로 컴파일합니다.

## 6개 플랫폼 기능 동등성: v0.2.162

v0.2.162 마일스톤은 격차를 좁히는 것이었습니다. 이 릴리스 전에는 macOS가 가장 완전한 기능 세트를 가졌고, iOS는 거의 갖추어졌으며, Linux/Windows/Android는 뒤처져 있었습니다. v0.2.162는 6개 플랫폼 모두를 같은 수준으로 끌어올렸습니다:

-   **macOS** — AppKit, 완전한 위젯 세트, Keychain, 알림, 멀티 윈도우, 툴바
-   **iOS / iPadOS** — UIKit, macOS와 완전한 위젯 동등성, 씬 라이프사이클
-   **Android** — JNI 브리지, Android Views를 통한 모든 위젯, NDK 크로스 컴파일
-   **Linux** — GTK4, Table을 포함한 완전한 위젯 세트, 파일 다이얼로그, libsecret 키체인
-   **Windows** — Win32, 모든 위젯, Windows Credential Store, WinRT 알림

이것은 "하나의 코드베이스, 6개 플랫폼"을 열망이 아닌 현실로 만드는 마일스톤입니다. 동일한 TypeScript 파일이 일반적인 사용 사례에 대해 플랫폼별 코드 경로 없이 6개 타겟 모두에서 네이티브 앱으로 컴파일됩니다.

## 자동 바이너리 크기 축소

v0.2.153에서 자동 바이너리 크기 축소가 출시되었습니다 — 컴파일러가 이제 사용되지 않는 코드 경로를 적극적으로 데드 스트리핑하고, 도달 불가능한 stdlib 함수를 제거하며, 링킹 중 심볼 정의를 중복 제거합니다. 이전에 약 4 MB로 컴파일되던 일반적인 CLI 도구가 소스 변경 없이 2 MB 미만으로 줄어듭니다.

이것은 실제 배포에 중요합니다. 바이너리가 배포 단위인 경우 — 서버에 복사하거나, 단일 파일로 배포하거나, 컨테이너에 임베드하는 경우 — 크기는 전송 시간과 스토리지 비용에 직접 영향을 미칩니다. 바이너리 크기를 무료로 절반으로 줄이는 것은 의미 있는 개선입니다.

## 컴파일 타임 플러그인 시스템

v0.2.152에서 Perry의 플러그인 시스템이 도입되었습니다 — 그리고 이것은 TypeScript 생태계의 다른 모든 플러그인 시스템과 아키텍처적으로 다릅니다. 런타임 플러그인 로딩 없음, IPC 없음, 동적 `require()` 없음. 플러그인은 Perry가 빌드 타임에 해석하고 컴파일하는 TypeScript 모듈입니다.

결과: 플러그인의 런타임 오버헤드가 정확히 제로입니다. 애플리케이션 코드와 같은 바이너리로 컴파일되며, 플러그인 코드와 호스트 코드 간에 직접 함수 호출이 이루어집니다. 플러그인을 사용하지 않으면 바이너리에 전혀 나타나지 않습니다. 사용하면 다른 모듈과 마찬가지로 인라인됩니다.

이 뒤에 있는 철학에 대해 [플러그인 시스템은 성능 세금이다](/ko/blog/plugin-systems-are-a-performance-tax/)에서 다루었습니다. 요약하면: 런타임 플러그인 아키텍처는 성능과 확장성을 트레이드오프합니다. 빌드 타임 합성은 둘 다 제공합니다.

## 언어 개선

UI 스프린트가 단독으로 일어난 것은 아닙니다 — 컴파일러 자체도 계속 더 강력해졌습니다. 이러한 릴리스를 통해:

-   **클래스 표현식** — `const Foo = class extends Bar {}`가 올바르게 컴파일됩니다
-   **제너레이터 변환** — `function*`와 `yield`가 네이티브 스테이트 머신으로 컴파일됩니다
-   **클래스 필드로서의 Map/Set** — `private items = new Map()`가 코드 생성에서 작동합니다
-   **FFI 파라미터 타입 강제** — 네이티브 라이브러리 호출이 타입 강제를 자동으로 처리합니다
-   **바운드 메서드 참조** — `this.method` 참조가 네이티브 모듈(fs, os, path)에서 작동합니다
-   `string.match()` — 이제 완전히 지원됩니다
-   `path.isAbsolute()`, 다중 인수 `path.join()`, `path.resolve()`
-   **Web 타겟** — Perry가 이제 하이브리드 배포를 위한 웹 호환 출력으로 컴파일할 수 있습니다

## 다음 단계

6개 플랫폼 UI 동등성이 출시되었으므로, 다음 단계는 넓이보다 깊이입니다. 현재 작업 중인 것:

-   완전한 RegExp 지원 (`regex.test()`, `string.matchAll()`)
-   위젯 시스템에서 드래그 앤 드롭, 커스텀 컨텍스트 메뉴, 접근성 레이블
-   Perry 진단과 저장 시 컴파일을 위한 VS Code 확장
-   패키지 매니저 통합 — Perry 네이티브 패키지를 하나의 명령으로 설치하고 컴파일
-   브라우저 배포를 위한 WASM 컴파일 타겟
-   `Worker` 스레드를 통한 멀티스레딩

따라가고 싶으시다면, [Perry 저장소](https://github.com/PerryTS/perry)가 공개되어 있습니다. [쇼케이스](/ko/showcase/) 에서 이미 구축된 것들을 확인하거나, [로드맵](/ko/roadmap/) 에서 전체 그림을 확인하세요.
