---
title: "세대별 GC, 지연 JSON, 그리고 검증을 견디는 벤치마크"
excerpt: "Perry v0.5.174 → v0.5.306을 3일 만에 달성. 함께 머지된 GC와 JSON 작업도 포함. 세대별 GC가 기본값으로 승격. Small String Optimization도 기본값으로 승격. JSON 파이프라인은 지연 테이프를 도입해 validate-and-roundtrip에서 75ms 중앙값에 안착 — 동적 타입 런타임 그룹 중 최고. 벤치마크 페이지는 RUNS=11 중앙값 + p95 + σ로 다시 작성되었고, simdjson과 AssemblyScript+json-as가 동급 비교 대상으로 추가되었으며, Perry의 모든 약점이 솔직히 드러나 있습니다."
date: 2026-04-26
tags: ["GC", "JSON", "performance", "benchmarks", "milestone"]
---
지난 글은 **v0.5.174**에서 한 가지 헤드라인과 함께 마무리되었습니다. Perry가 마침내 인트리(in-tree) 스위트의 모든 벤치마크에서 Node와 Bun을 모두 이기고 있다는 것이었죠. 사흘간의 작업과 GC + JSON 커밋의 백로그를 거친 후, Perry는 **v0.5.306**에 도달했습니다 — 즉 **132개의 패치 릴리스**입니다 — 그리고 이야기는 다른 것입니다. 헤드라인은 547배 속도 향상이나 새로운 승리 컬럼이 아닙니다. 그 승리들을 변호 가능하게(defensible) 만드는 작업입니다.

-   **세대별 GC(generational GC)**가 기본값으로 출시됩니다. 페이즈 A부터 D까지 v0.5.217–v0.5.237에 걸쳐 안착했습니다.
-   **Small String Optimization**이 기본값으로 출시됩니다. Step 1.5 → 2가 v0.5.213–v0.5.216에 안착했습니다.
-   **JSON 파이프라인**은 테이프 기반 파서, 레이지 파스, 레이지 stringify, 그리고 요소별 희소(sparse) 머터리얼라이제이션을 얻었습니다. 이제 기본 validate-and-roundtrip은 **중앙값 75 ms**입니다 — 동적 타이핑 그룹에서 최고입니다.
-   **벤치마크 페이지**는 **RUNS=11 중앙값 + p95 + σ + 최소 + 최대**로 처음부터 끝까지 다시 작성되었고, simdjson과 AssemblyScript+json-as가 동료로 추가되었으며, 최적화 프로브는 진짜 비교에서 분리되었고, Perry가 가진 모든 약점이 정직하게 드러나 있습니다.

조연들은 꾸준한 정확성 수정의 행렬입니다. Promise 마이크로태스크 FIFO, NaN 동등성과 ECMAScript 숫자 포매팅, BigInt 2의 보수, AsyncLocalStorage 엔드투엔드, decimal.js + ioredis + commander 런타임, 그리고 테이프 경로 아래에 숨어 있던 일반 f64에 대한 JSON.stringify 세그폴트. 더해서 Windows 툴체인이 마침내 가벼워졌습니다. LLVM + xwin, Visual Studio 설치 불필요.

## 1\. 세대별 GC, 기본값으로 활성화

세대별 GC는 두 달간 단계별로 롤아웃되었습니다. 이 기간에 닫힌 페이즈들의 요약:

-   **v0.5.217–v0.5.221** — 페이즈 A: 섀도우 스택 런타임 스캐폴딩, push/pop 발행, 슬롯-맵 스레딩, `Let`/`LocalSet` 섀도우 미러링, 그리고 루트 스캐너.
-   **v0.5.222** — 페이즈 B: 너서리(nursery) + 올드젠(old-gen) 아레나 분리.
-   **v0.5.223–v0.5.225** — 페이즈 C1–C2: 라이트 배리어 런타임 인프라, 코드젠이 배리어를 발행, 모든 힙 저장이 그것을 거칩니다.
-   **v0.5.226–v0.5.228** — 페이즈 C3a–C4: 리멤버드 셋 루트가 마크 + 클리어로 흘러들어가고, 마이너 GC 트레이스는 올드젠을 건너뛰며, 비이동 테뉴어링.
-   **v0.5.229–v0.5.236** — 페이즈 C4b α/β/γ/δ: 포워딩 포인터 인프라, 핀닝 + 이배큐에이션 패스, 스캐너 + 추이적 핀닝, 레퍼런스 재작성, 유휴 너서리 블록은 OS로 반환, GC 트리거는 초기 임계값으로 캡 설정.
-   **v0.5.237** — 페이즈 D 파트 1: `PERRY_GEN_GC=1`이 기본값.
-   **v0.5.238** — 페이즈 D 파트 2: `PERRY_SHADOW_STACK=1`이 기본값.
-   **v0.5.239–v0.5.240** — 마무리 문서: 로드맵 확정, 학술 + 산업 계보 부록(Bartlett 1988, Ungar 1984, Cheney 1970).

가장 중요했던 측정된 승리는 `test_memory_json_churn`이 gen-GC 기본값이 켜진 순간 피크 RSS가 **115 MB → 91 MB**로 떨어진 것이었습니다. 컴퓨트 리그레션은 작았고 변명 없이 나열되었습니다 — `nested_loops` 8 → 18 ms, `accumulate` 24 → 34 ms, `object_create` 0 → 1 ms, `array_read` / `array_write` 각각 +1 ms. 이스케이프 해치(`PERRY_GEN_GC=0`)는 옛 숫자를 회복시킵니다. 트레이드오프는 의도적이었으며, 이제 벤치마크 페이지는 두 행을 나란히 나열하므로 독자가 선택할 수 있습니다.

## 2\. Small String Optimization, 기본값으로 활성화

SSO는 짧은 문자열에 대해 힙 할당을 회피하는 22바이트 인라인 문자열 표현입니다 — 일반적인 JSON 키(2–8바이트)와 짧은 값이 인라인 형태에 들어맞습니다. 표면상 롤아웃은 작았지만 그 아래는 컸습니다:

-   **v0.5.213**: SSO 인프라(표현 + 액세서).
-   **v0.5.214**: Step 1 컨슈머 무장 + 테스트용 `PERRY_SSO_FORCE` 게이트.
-   **v0.5.215**: Step 1.5 코드젠 `PropertyGet` 3-way 분기 — 인라인 문자열용 패스트 패스, 힙 문자열용 패스트 패스, 잔여물용 슬로우 패스.
-   **v0.5.216**: Step 2 플립 — 기본값으로 SSO 발행.

v0.5.279의 후속은 SSO가 핫해진 후 드러난 마지막 프로퍼티 읽기 NaN 버그를 닫았고, v0.5.272의 연쇄적 크로스 모듈 게터 디스패치 수정은 또 다른 것을 닫았습니다. 둘 다 기본값이 뒤집히기 전 펀치 리스트에 있었고, 둘 다 성능 리그레션 없이 출시되었습니다.

## 3\. JSON: 테이프 기반 파스, 기본적으로 레이지

JSON 파이프라인은 이 기간 동안 가장 침습적인 재작성을 받았습니다. 이전 동작: `JSON.parse`가 NaN-박스 값들의 완전 머터리얼라이즈된 트리를 만들었습니다. 새 동작: `JSON.parse`는 값당 12바이트 테이프를 만들고 레이지하게 머터리얼라이즈합니다 — 실제로 읽는 값들만 머터리얼라이제이션 비용을 지불합니다. 변경되지 않은 파스에 대한 stringify는 이제 원본 입력의 memcpy이며, 이는 simdjson이 `raw_json()`으로 사용하는 동일한 패스트 패스 트릭입니다.

-   **v0.5.200**: `JSON.parse<T>(blob)` 스키마 지향 파스(Step 1). 컴파일 타임에 알려진 셰이프는 컴파일러가 사전 해결된 키 액세스를 발행하게 합니다.
-   **v0.5.203**: 테이프 기반 파스 토대 — Step 2 페이즈 1.
-   **v0.5.204**: 레이지 파스 + 레이지 stringify — Step 2 페이즈 2+4.
-   **v0.5.206**: 레이지 안전 인덱스 액세스 + 엣지 케이스 — Step 2 페이즈 3.
-   **v0.5.208**: 요소별 희소 머터리얼라이제이션 — Step 2 페이즈 5b.
-   **v0.5.209**: 워크 커서 + 적응형 머터리얼라이즈 임계값.
-   **v0.5.210**: ≥1 KB 블롭에 대해 레이지 파스를 기본값으로 플립.

레이지 테이프가 설계된 워크로드(레코드 10k개, ~1 MB 블롭, 중간 반복 없이 parse → stringify)에서의 결과:

| 구현 | 중앙값 (ms) | p95 (ms) | σ | 피크 RSS |
| --- | --- | --- | --- | --- |
| C++ `-O3 -flto` (simdjson)| 24 | 28 | 1.2 | 8 MB |
| 페리(gen-gc + 게으른 테이프)| 75 | 91 | 6.9 | 85 MB |
| 녹 serde_json(LTO)| 185 | 190 | 1.7 | 11 MB |
| bun | 259 | 342 | 26.1 | 82 MB |
| node | 394 | 602 | 60.1 | 127 MB |
| 코틀린(kotlinx.serialization)| 473 | 533 | 21.4 | 606 MB |
| 어셈블리스크립트+json-as(wasmtime)| 598 | 621 | 10.5 | 58 MB |

Perry는 **중앙값 75 ms**로 비교 대상 중 가장 빠른 동적 타이핑 런타임입니다 — Bun(259 ms)을 이기고, Node(394 ms)를 이기고, Kotlin의 서버 JIT(453 ms)를 이깁니다. simdjson의 24 ms는 SIMD 가속 C++의 천장이며, 체리피킹 뒤에 숨겨지지 않고 의도적으로 페이지에 남아 있습니다. Perry는 이를 이기지 못합니다. 요점은 격차를 보여주어 그것을 닫는 것에 목표가 생기게 하는 것입니다 — `docs/json-typed-parse-plan.md`에서 추적됩니다.

정직한 동반 벤치는 **parse-and-iterate**입니다. 동일한 블롭이지만 매 반복마다 모든 레코드의 `nested.x`를 합산하므로 레이지 테이프가 머터리얼라이즈되도록 강제합니다. 거기서 Perry는 **466 ms**에 안착합니다 — 마크-스윕 이스케이프 해치의 375 ms보다 느린 이유는 테이프가 상각할 수 없는 오버헤드를 지불하기 때문입니다. 그 행은 TL;DR §B에 있습니다. 작업을 피할 수 없을 때, 레이지 테이프는 그런 척하지 않습니다.

## 4\. 벤치마크 페이지, 다시 작성됨

Perry가 성능 숫자를 제시하는 방식에 대해 세 가지가 바뀌었습니다.

**RUNS=11 중앙값 + p95 + σ + 최소 + 최대, best-of-N이 아님.** Best-of-N은 테일 레이턴시를 조용히 떨어뜨립니다. 이 하드웨어에서는 9.4초의 Python `accumulate` 이상치와 Swift JSON의 5.3초 p95 스파이크를 숨기고 있었습니다. 중앙값은 테일을 다시 페이지에 올립니다. 방법론 변경은 v0.5.248에 안착했습니다. TL;DR §A와 §B의 모든 셀은 **2026-04-25** 기준 RUNS=11 신선합니다.

**최적화 프로브는 진짜 런타임 성능에서 분리됩니다.** Perry가 12–34 ms vs Rust/C++가 98 ms인 다섯 셀 — `loop_overhead`, `math_intensive`, `accumulate`, `array_read`, `array_write` — 은 실리콘이 아니라 컴파일러 플래그 자세를 측정합니다. 이제 이것들은 자체 서브섹션에 있고, 그 위에는 `clang++ -O3 -ffast-math`가 이를 1밀리초 이내로 좁힌다는 것을 설명하는 단락이 있습니다. 헤드라인 진짜 런타임 커널은 `loop_data_dependent`입니다: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry는 컴파일러가 진짜로 작업을 접어 없앨 수 없는 커널에서 no-FMA-contract 그룹의 한가운데 자리합니다. 그것이 정직한 비교입니다.

**동료 추가됨.** simdjson(4.3.0)은 이제 두 JSON 표 모두에 있습니다 — C++ 파스 처리량 천장이 페이지에 있어 독자가 격차를 볼 수 있습니다. json-as(1.3.2)와 함께 있는 AssemblyScript는 가장 가까운 설치 가능한 TS-to-네이티브 동료입니다. porffor는 이 크기의 워크로드에서 세그폴트했고, Static Hermes는 macOS arm64에 설치되지 않았습니다. kotlinx.serialization과 함께 있는 Kotlin은 v0.5.241–v0.5.242에서 JSON 폴리글롯에 합류했습니다. 모든 행은 진짜이고, 모든 면책 조항은 페이지에 있습니다.

## 5\. 폴리글롯 컴퓨트 표

진짜로-접을-수-없는 헤드라인 커널, RUNS=11 중앙값, v0.5.249에서 2026-04-25에 새로고침:

| 벤치마크 | Perry | Rust | C++ | Java | Node | Bun |
| --- | --- | --- | --- | --- | --- | --- |
| 피보나치| 318 | 330 | 315 | 282 | 1022 | 589 |
| loop_data_dependent| 235 | 229 | 129 | 229 | 322 | 232 |
| object_create| 1 | 0 | 0 | 5 | 11 | 6 |
| 중첩_루프| 18 | 8 | 8 | 11 | 18 | 21 |

`fibonacci`에서 Perry는 컴파일된 그룹을 3–15 ms 이내로 따라잡습니다. Java의 HotSpot JIT는 재귀 호출 인라이닝으로 ~11% 더 빠릅니다. `loop_data_dependent`에서 커널은 두 개의 FP-contract 클러스터로 나뉩니다: ~128 ms의 FMA-contract 그룹(Go 기본값, Apple Clang의 `g++ -O3` — 둘 다 `sum * a + b`를 단일 FMADDD로 융합) 그리고 229–235 ms의 no-contract 그룹(Perry, Rust 기본값, Swift, `-XX:+UseFMA` 없는 Java, Bun)이 스칼라 FMUL + FADD를 실행합니다. LLVM은 `-ffp-contract=fast`로 FMA 그룹과 일치합니다. Perry는 그것을 기본값으로 활성화하지 않습니다. `nested_loops`는 컴퓨트 바운드가 아닌 캐시 바운드입니다. 모두가 8–21 ms에 안착합니다.

## 6\. Windows 툴체인, 가벼워짐

Windows 사용자는 더 이상 Visual Studio 설치가 필요하지 않습니다. **v0.5.199**가 [#176](https://github.com/PerryTS/perry/issues/176)을 닫았습니다. `perry setup windows` + winget LLVM + xwin이 전체 VS BuildTools 트리를 대체합니다. `v0.5.201`은 `find_lld_link` / `find_perry_windows_sdk`의 cfg 게이트를 떨어뜨려 macOS 호스트뿐만 아니라 Windows를 타겟팅하는 모든 플랫폼에서 경로 디스커버리가 작동하도록 했습니다.

```
# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe
```

## 7\. 런타임 정확성 패스

이 기간의 주제: V8/JSC와의 조용한 런타임 발산은 수정이 되었거나 컴파일 에러가 되었습니다. 사소하지 않은 것들:

-   **v0.5.255**: `BigInt.fromTwos`/`toTwos` 2의 보수.
-   **v0.5.263**: `Promise.all`/`race`/`any` 비-프로미스 타입 판별.
-   **v0.5.281**: `NaN==NaN` + ECMAScript 숫자 포매팅(`3 → "3"`, `"3.0"`이 아님; `-0 → "0"`; 등).
-   **v0.5.280**: `(x) | 0`에서 `NaN`/`Infinity` ToInt32 강제 변환.
-   **v0.5.284**: Promise 마이크로태스크 FIFO + 던져진 핸들러 전파.
-   **v0.5.286**: 일반 f64에 대한 `JSON.stringify`가 테이프 경로 아래에서 세그폴트.
-   **v0.5.277**: 인코딩이 전달되지 않으면 `fs.readFileSync`가 Buffer를 반환합니다(Node와 일치).
-   **v0.5.272**: 연쇄적 크로스 모듈 게터 디스패치가 `undefined`를 반환했습니다.

이슈 [#187](https://github.com/PerryTS/perry/issues/187)에 대한 stdlib 후속 작업이 채워졌습니다: AsyncLocalStorage 엔드투엔드(v0.5.261), commander 런타임 + 실제로 `.action()`을 호출하는 코드젠(v0.5.250), decimal.js 코드(v0.5.259), Redis ioredis 엔드투엔드(v0.5.270), pg + mongo 비동기 팩토리 패턴(v0.5.275), 그리고 EE/LRU/WSS의 동일한 비동기 팩토리 버그(v0.5.252).

`perry/ui` 측에서: 알림 탭 콜백(#97)이 Apple(v0.5.254)과 Android(v0.5.258) 양쪽에 배선됨; 로컬 알림 스케줄 + 취소(#96, v0.5.244); Android에서 FCM 등록 + 수신(v0.5.262).

## 8\. 마무리

이번 구간의 패턴은 헤드라인 숫자가 아닙니다. 기존 승리들이 정밀 조사에서 살아남게 만드는 작업입니다. 지속적 할당 워크로드를 잡아내는 세대별 GC, 짧은 문자열 비용 격차를 닫는 SSO, 가장 흔한 워크로드의 “수정 없음” 구조를 활용하는 JSON 파이프라인, 그리고 best-of-N 대신 중앙값을 측정하고 Perry의 75 ms와 같은 행에 simdjson의 24 ms 파스 천장을 보여주는 벤치마크 페이지. 독자는 격차를 볼 수 있고 — Perry가 바닥에 비해 어디에 자리하는지를 봅니다.

시도해 보세요:

```
# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh
```

소스: [github.com/PerryTS/perry](https://github.com/PerryTS/perry) — 벤치마크: [benchmarks/README.md](https://github.com/PerryTS/perry/blob/main/benchmarks/README.md) — 체인지로그: [CHANGELOG.md](https://github.com/PerryTS/perry/blob/main/CHANGELOG.md)

— Ralph
