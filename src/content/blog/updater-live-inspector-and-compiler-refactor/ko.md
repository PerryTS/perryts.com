---
title: "자동 업데이트, 라이브 인스펙터, 그리고 스스로 반으로 줄인 컴파일러"
excerpt: "Perry v0.5.306 → v0.5.359 4일 만에 — 53번의 패치 릴리스, 약 30개 이슈 종결, 그리고 큰 세 가지가 도착: 데스크톱 자동 업데이트를 위한 perry/updater, localhost:7676의 라이브 인스펙터, 그리고 가장 큰 네 개 파일을 33–91% 줄인 컴파일러 리팩터링."
date: 2026-04-28
tags: ["updater", "devtools", "refactor", "community", "milestone"]
---
지난 글은 **v0.5.306**에서 gen-GC + JSON + 벤치마크 이야기로 마무리됐습니다. 4일이 지난 지금 Perry는 **v0.5.359**에 와 있고 — 그 사이 **53번의 패치 릴리스** — 이야기는 또 달라집니다. 그 릴리스들 중 어느 하나도 벤치마크 숫자를 헤드라인으로 내건 것은 없습니다. 거의 전부가 **트래커의 이슈가 닫히는** 이야기입니다.

-   **`perry/updater`** 도입 — 데스크톱 앱을 위한 Sparkle / Tauri 형태의 자동 업데이트(SHA-256 다이제스트에 대한 Ed25519, 센티넬 롤백, 분리 재시작). 커뮤니티 PR, **TheHypnoo**([#224](https://github.com/PerryTS/perry/pull/224)).
-   **Geisterhand 페이즈 D** — `http://localhost:7676`의 라이브 인스펙터. 위젯 트리, 위젯별 상세, 클릭 디스패치, `POST /style/:h`를 통한 라이브 스타일 편집.
-   **컴파일러 리팩터링.** v0.5.329 → v0.5.343에 걸쳐 가장 자주 언급되던 4개 파일이 분할: `lower::lower_expr` 6,687 → 624 LOC(−91%), `compile.rs` 9,391 → 3,783 LOC(−60%), `lower.rs` 13,591 → 7,554 LOC(−44%), `lower_call.rs` 7,000+ → 4,681 LOC(−33%). 새 `walker.rs`가 `_ =>` 캐치-올 버그 클래스를 컴파일 에러로 바꿉니다.
-   **UI 스타일링 페이즈 C 종결** — Apple, Android, GTK4, Windows, Web의 모든 위젯에서 인라인 `style: { ... }` 프로퍼티. Windows는 5개 스텁 중 4개를 연결(decoration / opacity / borders); 남은 것은 `widget.shadow`뿐(DirectComposition 후속 과제).
-   **Windows용 Scoop 버킷**: `scoop install perry-ts/perry`. 릴리스 워크플로의 SHA-256 사이드카.
-   **커뮤니티 이슈 픽스의 물결** — runtime, codegen, fetch, GTK4, Windows linker, async, stdlib에 걸쳐 약 30개 이슈가 닫혔습니다.

## 1\. perry/updater — 데스크톱 앱 자동 업데이트

픽스 전 Perry에는 업데이트 경로가 없었습니다. 앱은 출시되고, 출시되고, 그게 다였죠. **TheHypnoo**가 [#224](https://github.com/PerryTS/perry/pull/224)로 풀세트를 제안했습니다:

```
import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // 이전 실행이 크래시했다면 센티넬 롤백

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(`${pct}%`));
  await update.installAndRelaunch();
}

markHealthy(); // 새 빌드가 성공적으로 시작된 후 호출
```

신뢰 모델: **파일의 SHA-256 다이제스트에 대한 Ed25519**(파일 바이트가 아님 — 큰 바이너리에서도 검증을 저렴하게 유지). 매니페스트는 JSON, 스키마 버전 부여, `<os>-<arch>` 트리플당 한 항목. `<exe>.prev` 백업과 함께 원자적 설치, 분리 재시작(Unix는 `setsid`, Windows는 `DETACHED_PROCESS`). 모바일은 설계상 제외 — App Store / Play Store가 OS 수준에서 설치 파이프라인을 소유하기 때문입니다.

스모크 테스트를 작성하면서 Perry 런타임의 두 가지 특이점이 드러났고, 그 자리에서 함께 수정됐습니다:

-   **`response.arrayBuffer()`가 메타데이터 전용 스텁을 반환하고 있었음.** [#232](https://github.com/PerryTS/perry/pull/232)에서 수정(역시 TheHypnoo) — `js_response_array_buffer`는 이제 실제 `BufferHeader`를 할당하고 `resp.body`를 `memcpy`로 안에 넣습니다.
-   **`fs.appendFileSync`가 0 바이트를 썼음.** [#226](https://github.com/PerryTS/perry/issues/226)에서 수정 — namespace-import lowering 경로(`import * as fs from "fs"`)에 `appendFileSync` 분기가 없었고, LLVM codegen 쪽에도 HIR 변형용 분기가 없었습니다. 둘 다 연결됨.

문서는 `docs/src/updater/overview.md`에 있습니다.

## 2\. Geisterhand: localhost:7676의 라이브 인스펙터

Geisterhand는 Perry의 인-프로세스 UI 테스트 하네스였습니다 — 포트 7676의 HTTP API로 위젯 상태를 스냅샷하고 클릭을 디스패치. 페이즈 D는 이걸 어떤 브라우저에서든 열 수 있는 devtools 형태의 인스펙터로 바꿉니다.

-   **스텝 1(v0.5.349)** — `GET /`는 위젯 트리, 위젯별 상세(frame, value, raw JSON), 1.5초 자동 새로고침(일시정지/재개), “onClick 발사” 액션 버튼을 갖춘 단일 페이지 vanilla-JS UI를 제공합니다. codegen은 macOS lazy-load `-dead_strip`에 대해 `INSPECTOR_HTML`을 핀 처리해 릴리스 빌드에서도 살아남게 합니다.
-   **스텝 2(v0.5.350)** — `POST /style/:h`는 JSON 프로퍼티 백을 받아 라이브로 적용합니다. 9개 프로퍼티(`backgroundColor`, `color`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`, `padding`, `hidden`, `enabled`)가 기존 펌프 큐를 통해 HTTP 스레드 → 메인 스레드로 흐릅니다. 잘못된 JSON → 400; 잘못된 핸들 → 400; 알 수 없는 프로퍼티는 서버 측에서 필터링되며 응답은 통과한 항목을 나열합니다.

```
perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \
  -H 'content-type: application/json' \
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}
```

macOS 디스패처는 연결됐고; Linux / Windows / iOS / tvOS / visionOS / Android는 같은 형태로 다음 차례입니다.

## 3\. 컴파일러 리팩터링 — 가장 큰 4개 파일을 분할

트래커의 5개 이슈([#167](https://github.com/PerryTS/perry/issues/167), [#169](https://github.com/PerryTS/perry/issues/169), [#212](https://github.com/PerryTS/perry/issues/212), [#214](https://github.com/PerryTS/perry/issues/214), 그리고 긴 꼬리)는 같은 모양이었습니다: `ir.rs`에 새 `Expr` 변형이 추가됐는데, `lower.rs`의 4개 임시 워커 중 하나가 `_ =>` 캐치-올을 가지고 있어 새 변형을 조용히 잘못 컴파일했던 것입니다. 런타임에서 잡는 건 비쌉니다 — 보이지 않을 때도, SSO에서 SIGSEGV가 날 때도 있습니다.

**v0.5.329**는 `crates/perry-hir/src/walker.rs`를 도입했고 `walk_expr_children` / `walk_expr_children_mut`를 제공합니다 — 178개 `Expr` 변형 전체에 대한 exhaustive 매치, **캐치-올 없음**. 새 변형을 여기 등록 없이 추가하면 이제 컴파일 에러입니다. 4개 소비자(`substitute_locals`, `find_max_local_id::check_expr`, `collect_local_refs_expr`, `remap_local_ids_in_expr`)가 다음과 같이 줄었습니다:

| 함수 | 전 | 후 | Δ |
| --- | --- | --- | --- |
| `find_max_local_id::check_expr` | 225 | 57 | −75% |
| `substitute_locals` | 553 | 80 | −86% |
| `collect_local_refs_expr` | 720 | 70 | −90% |
| `remap_local_ids_in_expr` | 542 | 85 | −84% |

총합: **중복된 descent 1,830줄 감소**, **중앙 집중화된 워커 1,840줄로 대체** — 순증감은 평탄하지만, 버그 클래스는 사라졌습니다.

그 다음으로 나머지가 풀렸습니다. **v0.5.331 → v0.5.343**은 14개 커밋에 걸쳐 4개 모놀리스를 잘랐습니다. 헤드라인 숫자:

| 파일 | 전 | 후 | Δ |
| --- | --- | --- | --- |
| `lower::lower_expr` | 6,687 | 624 | −91% |
| `compile.rs` | 9,391 | 3,783 | −60% |
| `lower.rs` | 13,591 | 7,554 | −44% |
| `lower_call.rs` | 7,000+ | 4,681 | −33% |

분할은 19개의 새 초점화된 서브모듈로 안착했습니다: `compile/{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}.rs`, `lower/{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}.rs`, `lower_call/{ui_styling, builtin, native}.rs`, 그리고 UI / system / i18n 메서드 테이블의 단일 진실의 원천이 된 새 `crates/perry-dispatch` 크레이트(이슈 [#191](https://github.com/PerryTS/perry/issues/191)의 “macOS에서는 컴파일되지만 web에서 깨짐” 류 놀라움을 만들었던 `_ => "perry_ui_unknown"` 팬아웃은 이제 단 한 번의 룩업).

**Tier 4 퍼포먼스 개선**이 동행했습니다(v0.5.335–v0.5.336):

-   `inline_functions`의 두 패스와 `compile.rs`의 세 rayon 패스를 융합 — 컴파일당 모듈 스캔 5회 + 스케줄러 왕복 3회 절약.
-   `perry dev`의 파스 캐시를 500개 항목으로 제한, FIFO 추방. 픽스 전에는 `node_modules`를 도는 세션이 100MB 이상의 SWC AST를 들고 있을 수 있었습니다.
-   codegen 이후 `.ll` 쓰기 루프를 병렬화 — 50+ 모듈의 SSD에서 wall-time 2–4배 빠름.
-   로케일 테이블을 워커마다 클론하는 대신 `Arc<I18nTable>`.

워크스페이스 테스트는 모든 커밋에서 **434 passed / 0 failed / 5 ignored**를 유지; 갭 테스트는 25/28 베이스라인; 문서 테스트는 80/82 베이스라인.

## 4\. UI 스타일링 페이즈 C, 마무리

페이즈 C는 인라인 `style: { ... }`의 롤아웃이었습니다. 스텝 1–7이 이 윈도우에서 마감됐습니다:

-   **v0.5.305 → v0.5.306** — `StyleProps` 타입 표면 + Button의 인라인 `style:`.
-   **v0.5.307 → v0.5.309** — 모든 테이블 위젯에서 color/padding/shadow의 인라인 destructure, 이어서 VStack / HStack.
-   **v0.5.310 → v0.5.311** — hex 문자열 + 그라디언트 + 동적 값을 위한 런타임 `parseColor`.
-   **v0.5.312** — 스타일링 문서 + Windows 트래킹 이슈.

그리고 크로스 플랫폼 정리:

-   **GTK4**([#202](https://github.com/PerryTS/perry/issues/202), [#206](https://github.com/PerryTS/perry/issues/206)) — 스타일링 FFI 4개 연결, 그리고 Linux 문서 테스트 게이트를 막던 7개 누락 FFI(v0.5.322).
-   **macOS**(v0.5.324) — `widget.shadow`를 위한 `CALayer` 그림자 배관 + visual\_test 인프라; 비-`NSTextField` 위젯을 위한 `set_color` 클래스 프로브.
-   **iOS / tvOS / visionOS**(v0.5.346) — Button의 `color: ...`는 `UIButton`에서 `setTextColor:`를 치고 있었는데, 그 셀렉터를 구현하지 않고 있었습니다; `objc2` panic이 `extern "C"` 경계를 넘어가 프로세스가 abort됐죠. macOS와 동일한 클래스 프로브 패턴으로 수정 — UIButton은 이제 `setTitleColor:forState:UIControlStateNormal`로 라우팅됩니다.
-   **Windows**(v0.5.347) — 5개 스타일링 스텁 중 4개 연결(`text.decoration`은 `LOGFONT` 라운드트립을 통해, `widget.opacity`는 `WS_EX_LAYERED` + `SetLayeredWindowAttributes`를 통해, borders는 `SetWindowSubclass` + `WM_PAINT`를 통해). 남은 것은 `widget.shadow`뿐(DirectComposition 필요).

`docs/src/ui/styling-matrix.md`의 스타일링 매트릭스는 **Web 43/43 Wired**, **Windows 42/43 Wired**, 나머지는 완전 커버리지로 윈도우를 마칩니다.

## 5\. 런타임 정확성 패스 — 이슈별로

이 기간의 테마: 트래커로 들어온 모든 잘못된 컴파일은 픽스 또는 컴파일타임 에러로 변했습니다. 하이라이트:

-   **[#212](https://github.com/PerryTS/perry/issues/212)(v0.5.323)** — `fn` 안의 클래스 메서드가 둘러싸고 있는 fn의 로컬을 캡처하지 못했습니다. 멀티모듈 재현은 이제 Node와 바이트 단위로 일치합니다.
-   **[#214](https://github.com/PerryTS/perry/issues/214)(v0.5.321 + v0.5.330)** — 7개 문자열 피연산자 사이트에서 SSO-안전한 string-handle 언박싱: `arr.join`, `arr.toString`, `obj[stringKey]` get/set/delete, `string.match(re)`, `process.env[dynKey]`, crypto 다이제스트 입력. 픽스 전에는 인라인 문자열 피연산자에 대해 모두 조용히 쓰레기를 반환하거나 SIGSEGV였습니다.
-   **[#221](https://github.com/PerryTS/perry/issues/221)(v0.5.351)** — 모듈 레벨 빈 `const` 배열이 함수 안에서의 `arr[i]=` 쓰기를 떨어뜨렸습니다. Bloom-Engine/jump의 `discoverLevels()`가 `LEVEL_FILES`를 모듈 레벨에서 인덱스 할당으로 채울 때 레벨 선택 화면이 비어 표시되며 드러났습니다.
-   **[#233](https://github.com/PerryTS/perry/issues/233)(v0.5.357)** — async 함수 내부에서의 `Array.push`가 배열을 파라미터로 받았을 때 16개에서 조용히 막혔습니다. async 함수는 인라인되지 않습니다; 재할당은 호출자에게 보이지 않는 새 포인터를 반환했습니다. 픽스: 성장할 때마다 옛 위치에 포워딩 포인터를 설치, GC의 기존 `GC_FLAG_FORWARDED` 메커니즘을 재사용.
-   **[#235](https://github.com/PerryTS/perry/issues/235)(v0.5.358)** — 호출자가 후행 인자를 생략했을 때 메서드 기본 인자 디스패치가 쓰레기를 전달하고 있었습니다. 두 가지 기여 요소: cross-module 메서드 선언이 `arity + 1` 대신 6개 double을 하드코딩, 그리고 `lower_class_method`는 `build_default_param_stmts`를 전혀 호출하지 않았습니다. mongodb의 `findOne(filter, options = {})`가 조용히 멈추는 현상으로 표면화; 픽스는 로컬과 cross-module 디스패치 전반에 걸쳐 균일합니다.
-   **[#236](https://github.com/PerryTS/perry/issues/236)(v0.5.355)** — 하나의 재현에서 비롯된 세 개의 독립적 fetch + promise 버그: api.github.com이 익명에 403(이제 기본 User-Agent 설정), `.then(console.log)`가 영원히 멈춤(null 콜백이 TASK\_QUEUE 항목을 푸시하지 않았음), 모든 fetch 거부가 `Uncaught exception: [object Object]`를 출력(실제 `ErrorHeader` 대신 NaN-박싱된 맨 `*StringHeader`).
-   **[#234](https://github.com/PerryTS/perry/issues/234)(v0.5.359)** — `arrayBuffer` / `text` / `bytes` / `slice` 인스턴스 메서드를 갖춘 실제 `Blob`. 픽스 전에는 `await response.blob()`가 메타데이터 전용 스텁 `{size, type}`을 반환했습니다. 3부 픽스가 runtime + HIR + codegen에 걸쳐 안착.

그리고 작은 정리:

-   **[#181](https://github.com/PerryTS/perry/issues/181)** — strip-dedup이 Linux의 제네릭 단형화를 과하게 깎고 + GTK4 링크 사일런트 폴백. 픽스: 이름 패턴 필터링을 `llvm-nm`을 통한 **심볼 집합** 비교로 교체. 단 하나라도 고유 심볼을 가진 멤버는 유지. 링크 에러 없이 `libperry_ui_macos.a`를 196 → 35개 오브젝트로 정리.
-   **[#220](https://github.com/PerryTS/perry/issues/220)** — Windows 링크 라인에 `secur32.lib` 추가.
-   **[#198](https://github.com/PerryTS/perry/issues/198)** — i18n `FormatNumber` FP 라운드트립을 Ryū 경유.
-   **[#188](https://github.com/PerryTS/perry/issues/188)** — `perry/i18n` 포맷 래퍼용 codegen 디스패치 연결.
-   **[#189](https://github.com/PerryTS/perry/issues/189) / [#203](https://github.com/PerryTS/perry/issues/203)** — `perry/plugin` codegen 디스패치.
-   **[#190](https://github.com/PerryTS/perry/issues/190)** — Canvas 위젯을 LLVM codegen 경유로.
-   **[#191](https://github.com/PerryTS/perry/issues/191)** — CameraView를 codegen 경유로.
-   **[#192](https://github.com/PerryTS/perry/issues/192)** — Table 위젯을 codegen 경유로.
-   **[#193](https://github.com/PerryTS/perry/issues/193)**(부분) — stdlib 헬퍼 디스패치 분기 11개.
-   **[#98](https://github.com/PerryTS/perry/issues/98)** — iOS + Android의 백그라운드 알림 수신(warm-path).
-   **[#106](https://github.com/PerryTS/perry/issues/106)** — watchOS 게임 루프 FFI 훅용 약한 폴백.
-   **[#154](https://github.com/PerryTS/perry/issues/154)** — `using` / `await using` dispose 훅.
-   **[#167](https://github.com/PerryTS/perry/issues/167)** — `js_native_call_method` 인자 alloca를 entry 블록으로 호이스트.
-   **[#169](https://github.com/PerryTS/perry/issues/169)** — `substitute_locals` Uint8Array 분기.
-   **[#226](https://github.com/PerryTS/perry/issues/226)** — `fs.appendFileSync`를 엔드투엔드로 연결(커뮤니티 PR).

## 6\. Windows + Scoop

Windows 툴체인 이야기는 계속해서 단순화됩니다. **v0.5.353**은 호스트 빌드에서 `clang -target`을 핀 처리했습니다 — PATH 상의 비-MSVC clang(MinGW / MSYS2 / Anaconda / Rust GNU 번들)이 Perry의 `x86_64-pc-windows-msvc` IR을 조용히 `windows-gnu`로 다시 쓰고 있었고, lld-link는 LLVM의 mingw32 이미터가 삽입한 `__main` 참조를 해결하지 못하고 있었습니다. 새 `probe_clang_default_triple`은 프로세스당 한 번 `clang --version`을 실행하고, 호스트 기본값이 GNU인데 우리가 MSVC를 타깃하고 있을 때 정보 노트를 한 줄 출력합니다. `PERRY_NO_CLANG_PROBE=1`로 억제 가능.

**v0.5.345**는 Win64의 `perry-ui` ABI를 `perry-dispatch`와 정렬했습니다 — 3개 런타임 extern 시그니처가 어긋나 있었습니다(`perry_ui_navstack_create`, `perry_ui_menu_add_item_with_shortcut`, `perry_ui_app_set_timer`). Win64 ABI에서는 정수와 부동소수점 위치 인자가 슬롯 인덱스를 공유하므로, 미스매치는 초기화되지 않은 레지스터에서 쓰레기를 읽습니다. SysV(macOS / Linux)는 int/float 레지스터 풀이 분리돼 있고 우연히 유효한 비트가 떨어졌습니다 — Windows 한정 크래시, 8개의 perry-ui-\* 플랫폼 크레이트 전체에서 수정.

그리고: **`scoop install perry-ts/perry`**. 매니페스트는 v0.5.345에 핀(공식 MSVC 기본 LLVM을 자동으로 끌어오기 위해 `depends: main/llvm` 사용). 릴리스 워크플로는 이제 모든 아카이브 옆에 `<artifact>.sha256` 사이드카를 출력하며, 형식은 `sha256sum` 호환 — 모든 다운스트림 패키지 매니저 범퍼용.

```
# Windows 호스트
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\main.ts --target windows -o myapp.exe
```

## 7\. 마무리

이 기간의 패턴은 커뮤니티 참여와 내부 위생의 결합입니다. **TheHypnoo**는 의미 있는 PR을 셋 보냈고([#224](https://github.com/PerryTS/perry/pull/224) perry/updater, [#231](https://github.com/PerryTS/perry/pull/231) `fs.appendFileSync` 연결, [#232](https://github.com/PerryTS/perry/pull/232) `response.arrayBuffer`의 본문 바이트), 트래커는 약 30개 이슈가 비워졌고, 컴파일러는 가장 큰 파일에서 60% 줄었으며 4개 임시 워커 중 하나를 업데이트하지 않은 것을 런타임 잘못된 컴파일에서 `cargo build` 에러로 바꾸는 exhaustive 워커를 갖게 됐습니다. UI 스타일링은 Windows의 그림자만 빼면 모든 데스크톱 플랫폼에서 동등성을 달성. Geisterhand는 브라우저 기반의 devtools 표면을 키웠습니다. Windows 설치 경로는 명령 하나만큼 짧아졌습니다.

시도해 보세요:

```
# npm(아무 플랫폼)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew(macOS)
brew install PerryTS/perry/perry

# Scoop(Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# 데스크톱 앱 자동 업데이트
npm install @perry/updater

# 라이브 인스펙터
perry compile main.ts -o app --enable-geisterhand
./app &  # 그런 다음 http://localhost:7676 열기
```

소스: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — Issues: [github.com/PerryTS/perry/issues](https://github.com/PerryTS/perry/issues) — Changelog: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
