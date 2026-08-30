import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = `**요약.** Perry는 TypeScript를 네이티브 바이너리로 컴파일하며, 참조 카운팅이 아니라 이동식·세대별·정확한 루트 기반의 트레이싱 가비지 컬렉터를 사용합니다. GC 작업의 거의 전부가 *컬렉터가 실제로 무엇을 하고 있었는지 알아내는 일*이었던 한 달을 거친 뒤, Perry는 이제 GC 형태의 벤치마크 19개 중 9개에서 Node를 이기고(처음에는 3개), 참조 카운팅 AOT 경쟁자를 14개에서 이기며, 15개에서 Node의 1.3배 이내에 들어옵니다. 그 과정에서 포렌식 증거를 전혀 남기지 않는 버그 유형, 아무것도 제어하지 않던 환경 변수, 구조상 실패할 수 없던 CI 게이트, 다른 컬렉터를 조용히 배포하게 만든 문서 주석, 그리고 남은 격차가 수집이 아니라 객체 *레이아웃*에 있음을 보여 준 최종 측정을 만났습니다. 여기서 추출한 아홉 가지 규칙은 글 마지막에 있으며, 대부분은 가비지 컬렉션과 무관합니다.

Perry는 TypeScript를 곧바로 네이티브 실행 파일로 컴파일합니다. SWC가 파싱하고, 우리가 HIR로 로워링하며, LLVM이 머신 코드를 내보내고, \`cc\`가 링크합니다. 인터프리터도 바이트코드도 없습니다. 하지만 컴파일 대상 언어에는 스코프를 벗어나는 클로저, 자신의 스코프보다 오래 사는 객체, 참조 사이클이 있습니다. 따라서 그 네이티브 바이너리 뒤에는 진짜 가비지 컬렉터가 있어야 합니다.

이 글은 그것을 만들며 내린 결정, 우리를 놀라게 한 일들—대부분 불쾌한 놀라움이었습니다—그리고 현재 수치가 어디에 있는지를 기록합니다. 컬렉터는 수개월 동안 코드베이스에서 가장 활발한 영역이었습니다. **2026-07-01 이후 201개의 커밋이 \`crates/perry-runtime/src/{gc,arena}\`를 건드렸고, 그중 110개는 최근 12일 동안의 작업입니다.** 127개 파일과 약 75,000줄에 걸칩니다. 아직 릴리스되지 않은 changelog 조각 572개 중 135개가 GC 작업의 이름을 달고 있습니다.

그중 거의 어느 것도 “컬렉터를 구현하는 일”이 아니었습니다. 우리 컬렉터가 실제로 무엇을 하고 있는지 알아내는 일이었습니다.

---

## 1부 — 우리가 선택한 것

### 참조 카운팅을 사용하지 않기

가장 먼저 받는 질문은 AOT 컴파일러라면 그냥 참조 카운팅을 사용하면 되지 않느냐는 것입니다. 루트 탐색 문제가 없고, safepoint도 없으며, optimizer와의 협력도 필요하지 않으니 분명 잘 맞아 보입니다. 우리가 벤치마크하는 경쟁 AOT TypeScript 컴파일러는 정확히 그 길을 택했습니다.

그럼에도 트레이싱 컬렉터를 선택했습니다. 참조 카운팅은 드문 경우 때문에 흔한 경우에 비용을 지우기 때문입니다. 모든 포인터 저장이 카운터 갱신이고, 사이클에는 어차피 백업 트레이서가 필요하며, JS는 즉시 죽는 객체를 엄청나게 많이 할당합니다. 이는 nursery가 사실상 무료로 처리하는 경우입니다. 오늘날 이 선택은 GC 벤치마크 19개 중 14개에서는 옳고 5개에서는 틀려 보입니다. 뒤에서 자세히 다룹니다.

### 값은 NaN-boxed다 — 그리고 지금 그 일부를 되돌리고 있다

모든 JS 값은 64비트 워드 하나입니다. IEEE 754에서 남는 약 2⁵²개의 NaN 패턴으로 포인터, 작은 정수, singleton을 태그하고 나머지는 평범한 \`f64\`로 둡니다.

\`\`\`
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
\`\`\`

컬렉터 입장에서는 아주 좋은 거래입니다. “이 워드가 포인터인가?”는 마스크와 비교 한 번으로 답할 수 있고, 트레이싱 중 값마다 타입을 조회할 필요가 없습니다. 정지한 숫자는 이미 자신의 IEEE 비트이므로 숫자 필드는 box도 header도 필요 없습니다.

반면 *mutator*에게는 우리와 V8 사이의 가장 큰 단일 장애물이며, 적극적으로 제거하고 있습니다. 문제는 NaN-boxed \`double\`이 단지 *하나의* 표현이 아니라 **정규 표현**이라는 점입니다. 네이티브 머신 타입은 영역 로컬 overlay로만 존재하며, \`materialize_*_to_js_value\` 계열 전체가 JS-visible 경계마다 다시 boxing합니다. 방출된 IR에서는 명백히 \`i32\`임이 증명된 루프 누산기조차 \`alloca double\`에 살고, \`-O3\` 이후에도 back-edge를 가로지르는 \`phi double\`로 남아 **매 반복마다** \`fptosi\` + \`sitofp\` 왕복을 냅니다. 함수 매개변수는 모두 \`double %argN\`이므로 hot function은 수백만 호출마다 인자를 다시 unbox합니다. 숫자는 포인터가 될 수 없는데도 과거에는 숫자 로컬까지 GC 루트로 등록했습니다.

논쟁을 끝낸 측정은 이렇습니다. bcryptjs의 \`_encipher\`를 충실하게 unroll한 코드가 Node의 184ms에 비해 834ms 걸렸고, *타입 어노테이션을 추가하자 더 나빠져* 834 → 2732ms가 되었습니다. 읽기당 약 80개의 guard와 경계 재물질화가 지배했기 때문입니다. 식 수준의 fast path로는 표현 문제를 고칠 수 없습니다. 각각은 boxed canonical 위의 또 다른 overlay일 뿐이며, unrolled code에서는 효과가 뒤집힙니다.

따라서 방향(\`docs/representation-selection-rfc.md\`와 unbox-by-default 캠페인)은 정적으로 증명된 모든 값—스칼라, 문자열, 객체, typed array, closure—에 대해 로컬, 매개변수, 반환값, typed heap slot의 끝에서 끝까지 unboxed native form을 canonical로 만들고, NaN-boxing은 증명 가능한 polymorphic value로 제한하는 것입니다. 여전히 *기본* 표현이지만 더 이상 *유일한* 표현은 아닙니다. 1, 2, 3a, 3b, 4a, 4b 단계는 merge되었습니다. Static Hermes가 존재 증명입니다. AOT에서는 JIT이 추측할 수 있는 곳에서 타입을 *증명*해야 하지만, 이것은 장점이기도 합니다. 증명된 kernel은 warmup이 필요 없고 deopt할 수 없습니다.

이는 GC에 양방향으로 직접 영향을 줍니다. Unboxing은 컬렉터가 스캔했을 루트를 제거합니다. 증명된 스칼라는 애초에 루트가 아닙니다. 동시에 의무를 하나 더합니다. Heap slot이 NaN-boxed word가 아닌 값을 담으면 컬렉터는 값 자체에서 포인터 여부를 읽을 수 없고 shape별 layout mask를 조회해야 합니다. 이 기계장치—\`pointer_mask\`, \`raw_f64_mask\`, layout note—에서 뒤에 나오는 여러 버그가 생겼습니다.

### 스레드마다 하나의 힙, 공유 없음

Perry는 기본적으로 single-threaded입니다. \`perry/thread\`는 \`spawn\`과 \`parallelMap\`을 제공하고 값은 공유가 아니라 deep copy(\`SerializedValue\`)로 스레드 경계를 넘습니다. 실제 사용성 비용이 있지만 컬렉터에는 큰 이점이 있습니다. **다른 스레드와 동기화하지 않습니다.** 전역 safepoint 프로토콜도, handshake도, 스레드 간 invariant를 위한 read barrier도 없습니다. 모든 arena, root scanner, remembered set은 thread-local입니다.

### 할당 분포가 말해 주므로 세대별 수집

스레드마다 두 영역이 있습니다. Nursery(\`ARENA\`, 1MB 블록)와 old generation(\`OLD_ARENA\`)입니다. 할당마다 8바이트 \`GcHeader\`, 카운터 필드 대신 두 aging bit(\`HAS_SURVIVED\`, \`TENURED\`), \`PROMOTION_AGE = 2\`를 사용합니다. 코드가 하나도 없던 2026-04-24에 작성한 원래 계획은 이유를 분명히 했습니다. JS 할당의 90% 이상은 자신을 만든 스코프에서 죽으므로, flat arena는 명백히 죽은 객체를 다시 표시하는 데 생애를 보냅니다.

계획은 전제 조건도 정확히 짚었고, 이 글의 나머지는 모두 이 결정에 달려 있습니다.

> **세대별 GC에는 정확한 루트가 필요합니다.**

보수적 스캐너는 이동하지 않는 컬렉터라면 충분합니다. false positive는 죽은 객체를 한 사이클 더 유지할 뿐입니다. 하지만 *이동식* 컬렉터는 그렇게 동작할 수 없습니다. 루트를 정확히 열거할 수 없으면 다시 쓸 수 없고, 다시 쓸 수 없으면 아무것도 옮길 수 없습니다.

### 루트: 하나의 분석, 두 개의 로워링, 기본값은 LLVM statepoint

LLVM은 값을 레지스터에 두고, 다시 물질화하고, 원하는 곳에 spill할 수 있습니다. 컬렉터는 그 어느 것도 introspect할 수 없습니다. Perry의 답은 두 계층이며 둘을 분리하는 데 부끄러울 만큼 오래 걸렸습니다.

**분석**—어떤 로컬이 GC 포인터를 담고 어디까지 살아 있어야 하는가—은 backend-independent입니다. 그 답을 생성 코드로 옮기는 **로워링**에는 선택지가 있습니다.

- *Shadow stack.* 진입 시 \`js_shadow_frame_push(n)\`, JS-level 로컬마다 \`js_shadow_slot_bind\`, 종료 시 \`js_shadow_frame_pop\`. 컬렉터는 heap-backed frame을 순회합니다.
- *RS4GC 기반 네이티브 stack map.* Root alloca는 \`ptr addrspace(1)\`이 되고 함수는 \`gc "statepoint-example"\` 태그를 받으며 각 모듈은 \`opt -passes='function(mem2reg),rewrite-statepoints-for-gc'\`를 통과합니다. LLVM이 모든 statepoint, relocation, 후속 사용 재작성을 직접 삽입하고, 수집 시 compact한 \`__perry_gcmap\` 섹션에서 루트를 읽습니다.

**#7370부터 statepoint 로워링이 기본값입니다.** 더는 \`PERRY_RS4GC=1\`을 입력할 필요가 없고, \`PERRY_RS4GC=0\`으로 bisection용 shadow stack으로 되돌릴 수 있습니다. Target-aware이지 일괄 적용이 아닙니다. \`gc_map\`은 런타임이 frame base를 풀 수 없는 target에는 map 생성을 거부합니다. 아무도 읽지 않는 map은 루트를 조용히 잃기 때문입니다. 규칙은 런타임이 순회할 수 있는 곳에서는 native root, 그렇지 않은 곳에서는 shadow stack입니다. aarch64/arm64와 x86-64는 statepoint, watchOS \`arm64_32\`와 ARM64 Windows는 shadow frame을 사용합니다. Fallback은 “루트 없음”이 아니라 같은 분석의 다른 로워링입니다.

환경 변수를 설정하지 않은 전환 근거는 다음과 같습니다. 479개 전체 gap suite에서 **회귀 0, 컴파일 실패 0**. 오래된 수제 statepoint bridge가 처리하지 못한 **\`try\` 포함 테스트 128개** 전부 컴파일. GC ratchet probe 10개가 Node와 byte-identical. 런타임 −1~2%(조금 더 빠름), zod의 81개 모듈에서 바이너리 크기 +1.86%.

“shadow stack을 방출한다”보다 나은 이유는 1~2%가 아닙니다. Statepoint는 **optimizer가 존중해야 하는 relocation semantics**를 갖습니다. Shadow stack은 spill을 잊은 값에 optimizer가 영리한 일을 하지 않는 동안에만 맞습니다. 그 차이의 증거는 3부에 있습니다.

또한 사용자 코드가 아니라 런타임에 사는 상태를 위해 **등록된 runtime root scanner 79개**가 있습니다. 대기 중인 promise, timer callback, exception state, async-context stack, shape cache, string intern table, JSON scratch table 등입니다.

보수적 네이티브 스택 스캐너도 있습니다. 자체 아키텍처 문서는 이를 동등한 세 메커니즘 중 하나로 설명하지만, 그 글은 오래됐고 이 글을 쓰며 발견한 것 자체가 교훈이었습니다. 배포 production configuration에서 \`conservative_stack_scan_decision()\`은 \`SkipDisabled\`입니다. Liveness는 precise root map(statepoint, fallback target에서는 shadow frame)과 runtime helper의 \`RuntimeHandleScope\`에 완전히 의존합니다. 보수적 경로는 allocation-point collection 같은 특정 모드에 남아 있을 뿐, precise 경로 아래의 안전망이 아닙니다.

### Write barrier는 지연해서 무장한다

세대별 위험은 old→young 포인터입니다. Nursery만 tracing하는 minor GC는 이들을 알아야 합니다. Codegen은 포인터 store에 \`js_write_barrier\` 호출을 내보내고 런타임은 remembered set을 유지합니다.

#7250에서 배포한 무장 invariant는 컬렉터에서 가장 재사용 가능한 디자인 중 하나입니다.

> 무장되지 않은 동안 barrier는 아무것도 기록하지 않습니다. 그 대신 스레드에서 remembered set을 처음 *읽을* 때는 로그를 전혀 신뢰하지 않고 heap에서 완전한 old→young edge 집합을 재구축하며 지나가는 길에 barrier를 무장합니다.

관습이 아니라 구조로 강제됩니다. \`remembered_dirty_snapshot()\`은 \`pub(super)\`이며 call site는 일곱 개, 모두 \`gc/\` 안입니다.

*(소스를 읽는 분께: Perry에는 서로 무관한 두 “barrier”가 있습니다. GC write barrier와 representation-selection pass의 컴파일 타임 \`Ptr<Shape>\` promotion barrier입니다. 둘을 혼동한 세 issue가 시간을 태웠습니다. 항상 파일 이름을 함께 말하세요.)*

---

## 2부 — 놀라웠던 점

### 1. 증거를 남기지 않는 버그 유형

Rooting invariant는 한 문장입니다.

> 수집 지점을 넘어 살아 있는 GC 관리 값은 그 지점 전에 루트에서 도달 가능해야 합니다. 루트에서 읽은 값을 호출 동안 SSA 레지스터에 보관해도 그 값은 **rooted가 아닙니다**. 그것은 복사본이며 컬렉터는 복사본을 볼 수 없습니다.

이를 어기면 프로젝트 최악의 디버깅 경험이 생깁니다. 수집 순간 컬렉터가 찾을 것이 *아무것도 없습니다*. dangling reference도, forward되지 않은 slot도, 어떤 이상도 없습니다. 이후 nursery가 주소를 재활용하고 stale pointer는 유효하지만 다른 객체를 읽으며, 프로그램은 하나 이상의 사이클 뒤 다른 함수에서 \`TypeError: value is not a function\`으로 죽습니다.

우리가 가진 모든 runtime GC probe는 여기에 눈이 멉니다. From-space scan도 clean, verify pass도 clean. \`PERRY_GC_VERIFY_EVACUATION\`은 도달 가능한 slot이 forward됐는지 확인하지만, 존재를 모르는 레지스터는 확인할 수 없습니다.

지금까지 배포된 다섯 형태를 분류했습니다.

| # | 형태 | 리뷰를 통과한 이유 |
|---|---|---|
| #7184 | push한 frame 바깥 slot index에 root store 방출 | \`js_shadow_slot_bind\`가 bounds-check 후 조용히 no-op. IR은 *rooted라고 말함* |
| #7192 | 할당하는 호출 *뒤에* root store 방출 | slot이 rooted인 동시에 dangling. 모든 “rooted인가?” 검사 통과 |
| #7206 | method receiver를 load한 뒤 할당할 수 있는 argument expression을 lower하고 사용 | load만 보면 명백히 올바름 |
| #7206 | \`base[key]\`: base materialize, key expression lower, stale base 사용 | 두 operand 중 하나를 먼저 평가하고 마지막에 사용 |
| #7226/#7239 | scanner가 rewrite하지 않는 heap pointer를 thread-local/static cell이 cache | IR에 전혀 보이지 않음 |

네 개가 **하루에 배포**됐습니다. 각 fix는 몇 줄이었고 비용은 언제나 탐지 지연이었습니다. 첫 형태만 shadow-stack-specific입니다. 나머지는 lowering-independent라 statepoint 전환 뒤에도 그대로 남았습니다. 실수는 루트가 무엇인지가 아니라 *lowering이 언제 루트를 방출하는지*에 있기 때문입니다.

실제로 유용했던 유일한 heuristic은 **완전히 재현 가능한 GC 버그는 레지스터가 아니라 테이블을 뜻한다**는 것입니다. Root 없는 레지스터는 수집이 그 창에 떨어질 때만 망가져 간헐적입니다. Root 없는 cache는 collection #0에서 망가지고 계속 그렇습니다. 알려진 예외는 하나, 아무 rooting으로도 고칠 수 없는 여섯 번째 형태입니다. Heap \`StringHeader\`에서 빌린 \`&str\`/\`&[u8]\`를 할당 호출 동안 보관하는 경우입니다. Rooting은 *slot*을 rewrite하며 borrow는 slot이 아닙니다. 올바른 해결은 첫 할당 전에 바이트를 off-heap으로 복사하는 것뿐입니다.

### 2. 검사를 멈추고 instrument를 만들기 시작했다

#7154의 전환점은 fix가 아니었습니다. 열 번의 조사 뒤 inspection을 포기하고 버그를 즉시 fault로 바꾸는 도구를 만든 일이었습니다.

**From-space quarantine.** Evacuating minor 뒤 from-space를 재활용하지 않습니다. Retired block을 bounded ring으로 떼고 첫 바이트가 잘못된 \`obj_type\` (\`0xDE\`)로 읽히는 poison word로 채운 뒤, page-aligned interior를 \`mprotect(PROT_NONE)\`으로 보호합니다. Stale dereference는 holder가 아직 stack에 있는 동안 *문제 instruction에서* SIGSEGV가 됩니다. Reporter는 fault address, 어느 minor가 page를 retire했는지, 어떤 object가 살았는지 표시하고 \`SIG_DFL\`을 복원한 다음 다시 fault해 debugger도 실제 site를 보게 합니다.

**GC zeal.** 모든 safepoint에서 evacuating minor를 강제해 root 없는 값이 무관한 allocation burst와 우연히 겹칠 때가 아니라 첫 노출에 이동하도록 합니다. V8의 \`--stress-scavenge\`와 SpiderMonkey의 \`gcZeal\`을 본떴습니다.

**누구도 필요하리라 예상하지 못한 depth knob.** Quarantine은 *N*개의 retired page set으로 된 ring이며 기본값 4입니다. #7154의 \`new C(…)\` reproducer는 depth 4, 8, 100에서도 fault하지 않습니다. Constructor body가 back-edge poll 약 600개를 지나므로 return override가 caller의 stale register를 공개할 때 page는 600번 전의 retirement입니다. \`PERRY_GC_PROTECT_FROMSPACE_DEPTH=800\`에서는 첫 사용에 fault합니다. 의심스러운 버그가 재현되지 않을 때 “depth를 높여라”가 첫 조언입니다.

Instrument 자체도 단지 실행하지 않고 **sabotage-test**합니다. \`quarantine_catches_a_planted_stale_from_space_deref\`는 #7184/#7192 형태를 심고, instrument는 poison을 보고하는 반면 비계측 control은 완전히 유효한 recycled object를 읽는지 확인합니다. 이 control이 도구 없이는 정말 invisible임을 보여 줍니다.

Static instrument도 있습니다. \`scripts/gc_root_dominance_check.py\`는 방출 LLVM IR을 읽어 root store가 뒤의 모든 수집 가능 site를 dominate하는지 검사합니다. CI gate의 known-remaining allowlist는 현재 **비어** 있어서 새 hit은 red build입니다. 그래도 runtime table, runtime Rust의 unrooted local, symbol set이 이름 붙이지 못한 것은 구조적으로 볼 수 없습니다. Clean report가 확인할 수 없는 것의 증거로 두 번 오해됐기에 이를 명시합니다.

### 3. Knob의 절반은 아무것도 제어하지 않았다

코드보다 엔지니어링 정책을 바꾼 놀라움입니다.

수개월 동안 \`PERRY_GEN_GC_EVACUATE\`는 변경이 evacuation 아래 안전함을 증명하는 knob였습니다. 제대로 측정하자—identical binary, same host, 12 ratchet probe × 8 counter의 cell-by-cell diff—**96 cell 중 0개**를 움직였습니다. Median은 bit-identical. 같은 방식으로 \`PERRY_GEN_GC=0\`은 79 cell을 움직였으므로 harness는 sensitive했고 그 knob만 아니었습니다. Counter가 오지 않는 fallback path를 제어하고 있었습니다.

유일한 살아 있는 효과는 footgun이었습니다. Forced evacuation을 veto하므로 환경의 \`PERRY_GEN_GC_EVACUATE=0\`이 앞 절의 \`PERRY_GC_ZEAL\`을 조용히 disarm하고, 아무것도 이동하지 않은 zeal run이 “clean”을 보고할 수 있었습니다.

그뿐이 아니었습니다.

- \`PERRY_GC_FORCE_EVACUATE\`는 **minor path에서만** 읽혔지만, 이를 쓰는 모든 test는 \`gc()\`를 통해 수집을 몰았고 forced conservative scan 뒤 full mark-sweep이 실행됐습니다. 수개월의 “forced evacuation에서 pass”는 무의미했습니다.
- Stress matrix의 \`--pressure\` knob는 측정 대상 경로를 껐습니다. defer hard cap과 arena trigger ceiling이 수식을 공유해 함께 collapse했고 \`default\` arm은 22행 모두 copying minor 0.
- \`PERRY_GC_FROMSPACE_SCAN_ABORT=1\`은 단독으로 완전히 inert. Scan이 실행되지 않고 아무것도 abort하지 않으며 run은 성공.
- \`gc_incremental_enabled\`의 doc comment는 “EXPERIMENTAL — default OFF”, 여덟 줄 아래 body comment는 “DEFAULT ON”. Merge 결정이 잘못된 쪽을 근거로 내려졌습니다.

그 결과의 정책은 \`CLAUDE.md\`에서 binding입니다.

> **모든 GC env knob은 OFF 상태를 실행하는 required CI arm을 갖거나 한 릴리스 soak 뒤 삭제합니다.** 진단 전용 knob은 동시에 최대 하나이며 untested라고 표시합니다.
>
> **아직 존재하는 mode는 아직 내려지지 않은 결정입니다.**

\`PERRY_GEN_GC_EVACUATE\`는 고치지 않고 삭제했습니다. 각 삭제 site에는 무엇이 있었고 왜 사라졌는지 설명하는 tombstone comment가 남습니다. 누군가 conjunction을 다시 넣을 바로 그 위치에 다섯 개입니다. CI audit은 주석 아닌 production parser에서 허용 knob 이름을 만들고 삭제된 knob에 관한 살아 있는 주장을 fail합니다. Self-test는 commented-out parser 뒤에 삭제 knob을 심어 둘 다 통과할 수 없음을 증명합니다.

### 4. 실패할 수 없는 게이트

\`CLAUDE.md\`에는 CI gate가 구조상 merge를 red로 만들 수 없는 네 형태가 있습니다. 모두 이 repo를 덮쳤고 셋은 한 주 안에 일어났습니다.

1. \`continue-on-error: true\`. \`gc-stress\`는 GC correctness를 담당한 유일한 job인데 수개월 이를 가졌습니다.
2. Branch protection required context가 아님. 실패를 보고하지만 막지 않는 job은 gate가 아니라 documentation입니다.
3. 무조건 \`cancel-in-progress\`인 \`concurrency\`. 느린 runner queue에서는 새 merge가 이전 run이 runner에 닿기 전에 취소합니다. \`gc-ratchet\`는 연속 세 \`main\` run이 취소되고 실행 0.
4. **게이트는 실행되지만 그 대상은 실행된 적이 없음.** Job이 진짜 green이라 가장 위험합니다.

둘을 더 찾았습니다. \`gc-stress\`는 \`main\`에서 *한 번도 실행된 적이 없습니다*. Workflow의 \`push:\` trigger는 tag-only이고 job의 \`if:\`는 \`schedule\`을 빼서 nightly 12/12가 \`skipped\`. Required context인 \`lint\`도 2000줄 제한을 넘은 16개 파일 때문에 세 번 넘는 nightly 동안 red였고, 모든 merge가 admin bypass로 들어왔습니다. Branch protection은 연극이었고 \`lint\`에 연결한 제대로 만든 새 gate도 도착하자마자 inert였을 것입니다.

반복해서 배우는 결론은 **gate가 아무것도 throw하지 않았음이 아니라 대상이 live였음을 assert해야 한다**는 것입니다. Zeal run은 종료 시 \`forced_collections=… copying_minors=… moved_objects=… loop_polls=…\`를 출력하고 **하나라도 0이면 exit 70**. 아무것도 exercise하지 않은 run은 green이 아니라 red입니다.

### 5. 컬렉터는 도움이 되지 못하는 수집을 계속 예약했다

반복되는 구조적 버그, 독립된 세 인스턴스, 하나의 형태입니다. *Predicate가 자신이 읽는 양을 바꿀 수 없는 collection을 schedule한다.*

**Survivor-promotion handoff (#7592).** Promote될 survivor를 위한 old-gen 공간을 만들려고 predicate가 minor를 full mark-sweep으로 바꿨습니다. 그러나 full mark-sweep은 이동하지 않고 promote하지 않으므로 압력을 줄일 수 없고 다음 minor에서 다시 true. 20만 record JSON pipeline에서 **22 collection 중 19개가 이 full, 각각 약 400ms에 0.0MB free**. 8.6초 phase 중 7.6초. 실제 promotion할 copying minor는 한 번도 실행되지 않았습니다.

**Nursery cap (#7690).** From-space occupancy 기반 cap을 in-place sweep으로 from-space를 점유한 채인 *non-moving* minor에 적용. Cap trigger가 non-moving minor를 실행하면 다음 block에서 즉시 다시 due가 되어 1MB 할당마다 whole-arena collection, live set에 대해 quadratic.

**고정점이 된 live-proportional cap.** \`max(base, arena_in_use)\`로 nursery cap을 live set에 맞추려 했습니다. 하지만 due test는 *from-space occupancy*를 cap과 비교하고 그 workload에서는 from-space ≈ live. From-space가 자기 cap을 넘지 못해 scavenging이 완전히 멈췄습니다. 아무 일도 안 해서 5.9× 개선.

Pacing code를 떠받치는 두 규칙이 나왔습니다.

> **Collection이 움직일 수 없는 양으로 그 collection의 cadence를 정하지 마세요.**
>
> **사이클당 비용이 O(live)인 컬렉터를 constant band로 pace하지 마세요.** 전체 작업이 live set에 대해 quadratic이 되며 큰 상수는 절벽을 옮길 뿐입니다.

이를 고치자 JSON workload가 **60.4초에서 3.86초**로 줄었고, 과거 70× 증가하던 20× 크기 범위에서 record당 비용은 약 30% 이내로 평평해졌습니다.

### 6. 한 번은 컬렉터가 하지 않은 변경을 문서화했다

이 이야기에서 가장 비싼 한 줄은 doc comment입니다.

#7690은 moving loop back-edge poll을 기본 ON으로 바꾸는 전체 논리를 runtime과 codegen의 두 doc comment에 쓰고 **어느 body도 바꾸지 않았습니다.** 둘 다 \`1|on|true\`만 match해 default OFF였고, default를 어느 방향으로도 고정한 test가 없었습니다. Runtime comment는 codegen mirror와 “MUST agree”라고까지 했고, 문서가 바꿨다고 주장한 전 값에서 실제로 일치했습니다.

단순히 느린 configuration이 아니라 다른 collector입니다. Nursery pressure의 정확한 수집 지점은 loop back-edge poll과 가장 바깥 microtask-pump 경계 둘뿐입니다. Poll이 방출되지 않으면 compute-only program은 둘 다 만나지 않습니다. 따라서 모든 nursery collection이 allocation point에 떨어졌고 이전 fix 때문에 올바르게 non-moving이었습니다. **배포 컬렉터는 nursery evacuation을 전혀 하지 않고** whole-arena full collection으로 fallback했습니다.

| benchmark | 배포 \`main\` | poll 실제 ON |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

한 benchmark는 몇 주 전 **105 copying minor(0.016초)**였던 곳에서 **13 whole-arena full collection(0.477초 pause)**. \`tree\` 총 GC pause는 4.107초 → 0.550초, 최대 pause는 266ms → 16ms.

찾아낸 진단은 wall time이 아니라 \`PERRY_GC_TRACE=1\`의 사이클 *종류*였습니다. \`{'minor': 105}\`여야 할 곳에 \`{'full': 13}\`.

세 test가 unrecognized-value arm을 포함해 default를 고정하고 하나가 두 crate의 일치를 고정합니다. 불일치는 양방향으로 silent—아무것도 소비하지 않는 poll, 아무것도 drain하지 않는 deferral—이므로 일치를 주장하는 두 comment가 아니라 assertion이 필요합니다.

이 클래스는 닫히지 않았습니다. 이번 주 profiling에서 write barrier에 같은 형태가 나왔습니다. **Codegen은 barrier-active counter를 \`seq_cst\` load—aarch64의 \`ldar\`, \`evalNode\`에 42 site—하지만 runtime은 같은 결정의 같은 global을 \`Relaxed\`로 읽습니다.** Codegen doc comment는 “one relaxed load of a \`static\`”. 두 reader가 required ordering에 반대하고 documentation은 code에 반대합니다. 최대 하나만 맞습니다. Runtime이 틀리면 \`ldar\`보다 훨씬 심각합니다. 추측 실패가 insertion barrier를 놓치고 수집 당시 silent하다가 사이클 뒤 \`TypeError: value is not a function\`으로 나타나므로 의도적으로 file만 하고 fix하지 않았습니다.

### 7. 가장 빠른 GC 작업은 삭제한 작업

Pacing bug를 제거한 뒤 남은 비용은 계속 존재하지 말았어야 할 작업으로 드러났습니다.

**아무것도 죽지 않는 heap을 계속 mark.** \`retain.ts\`는 300만 record array를 만들고 하나도 버리지 않습니다. Perry는 **1.31초 중 1.26초를 collector 안에서**, 96%. Node는 0.13초. 두 full mark-sweep이 합쳐 4MB reclaim, 하나는 arena occupancy를 정확히 0만큼 바꿉니다. Escalation predicate가 growth에 기반해 증가하는 live set이 두 배가 될 때마다 threshold를 넘었기 때문입니다. Fix는 full을 reclaim 양으로 평가하고 생산적이지 않으면 threshold를 오른쪽으로 이동.

**모든 evacuated object가 빈 map을 hash하려고 process-global mutex 획득.** Move hook이 residual \`Object.setPrototypeOf\` registry에서 SipHash \`remove\`. Re-prototype하지 않는 program에서는 비어 있습니다. 이를 알리는 latch가 있었지만 move hook만 무시해 300만 record promotion이 250만 번의 uncontended-but-real mutex acquire를 냈습니다.

**그리고 object를 아예 옮기지 않게 했습니다.** Copying minor nursery가 거의 전부 live면 object-by-object evacuation은 순수 overhead입니다. 새 old-gen allocation, \`memcpy\`, layout transfer, accounting, move hook, forwarding stub, 모든 참조 slot rewrite—갈 이유 없는 곳으로 옮깁니다. Whole-block in-place promotion(V8의 page promotion)은 block generation label만 바꿉니다. 아무것도 움직이지 않아 rewrite도 없습니다.

| workload | 이전 | 이후 |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**다음에는 tracing도 멈췄습니다.** 그래도 세 pass가 survivor마다 순회했습니다. Remembered-set dirty scan이 mark, drain이 다시 touch, \`clear_marks\`가 세 번째. 아무것도 이동하거나 free할 수 없는 사이클에서 trace는 약 55~67ns/object, 실제 promotion walk는 약 9ns. 이전 사이클의 survival ratio가 fully-live regime이면 promoting cycle은 trace를 완전히 skip합니다. 단 registered weak-target holder, non-empty malloc registry, 진행 중 incremental mark, 세 verify instrument 중 하나라도 있으면 거부합니다. 각각 trace를 subject로 삼아 mark 없는 cycle이면 아무것도 보지 않고 success할 수 있기 때문입니다. 결과 \`retain\` −33.6%, \`deeplist\` −43%, 243ns/object였던 promoting cycle은 **8.9ns**.

정책은 추측이 아니라 *측정*입니다. Block liveness는 trace 전에 알 수 없으므로 이전 사이클의 measured young-survival ratio에서 매 사이클 결정합니다. 분포는 세 자릿수 범위에 걸쳐 bimodal이었습니다.

| workload family | copying minor | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *copying minor가 전혀 실행되지 않음* |

잘못 예측한 사이클은 nursery의 몇 퍼센트만 유지하고, promoting cycle은 자신을 측정할 만큼 자주 trace하며, promoted dead byte의 running cap이 steady state를 제한합니다.

분명히 말해야 합니다. **“하나의 메커니즘” 이야기는 대개 틀리고 프로필은 발밑에서 움직입니다.** 최종 순위와 같은 commit에서 측정한 현재 pause fraction:

| program | wall | GC pause | pause fraction | cycle |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

두 수치는 일주일 전 93%, 62%였습니다. 이 절의 작업이 없앴습니다. \`shapes\` 7%는 이제 GC benchmark가 아닙니다. \`8 버그 전에는 139ms 중 94ms가 GC였고 그 비율만으로 “high-survival GC”로 분류했습니다. GC 레버는 더는 움직이지 않습니다. 벤치마크마다 균일해 보이던 비율은 산술적 우연이지 공통 원인의 증거가 아닙니다.

### 7b. “0 cycle”은 “GC 비용 없음”이 아니다 — 결론으로 오독한 카운터

\`asyncpipe\` 행은 0 cycle, pause 0ms입니다. 내부적으로 “pure mutator program; 모든 GC 레버가 irrelevant”라고 썼습니다. 그 premise로 brief한 profiling round가 반박했습니다.

\`asyncpipe\`는 \`[gc]\` 줄을 한 번도 출력하지 않지만 **leaf profile 약 33%가 collector machinery**—write barrier, per-object layout side table, \`RuntimeHandleScope\` rooting. Moving loop back-edge poll을 끄면 **program이 여전히 0 GC cycle인데 −14.1%**. Incremental old-gen mark/sweep이 poll에서 drive되지만 사이클을 끝내지 않아 보고하지 않습니다. Round에서 가장 큰 레버였고 premise가 그 반대를 가리켰습니다. \`PERRY_WRITE_BARRIERS=0\`은 +0.9%라 codegen barrier는 무죄지만 incremental drive는 아닙니다.

> **사이클 카운터는 수집을 측정하지 컬렉터 비용을 측정하지 않습니다.**

Barrier, side-table maintenance, rooting, incremental slice는 mutator-side이며 per-cycle trace에 구조적으로 안 보입니다. \`0 cycles\`는 결론처럼 읽히지만 메커니즘 하나에 대한 관찰일 뿐입니다.

관련 함정: \`asyncpipe_big.ts\`는 유효하게 확대한 \`asyncpipe\`가 아닙니다. 120 batch는 0 cycle, 240은 copying minor 2개, 1200은 GC-dominated. Timing noise floor를 넘기려 확대한 순간 다른 benchmark가 조용히 생겼습니다. \`9의 vacuous “realistic” variant와 같은 형태이며, 연구 대상 속성이 scaling 후에도 남는지 확인해서만 발견했습니다.

### 8. 경계를 16바이트 넘다

캠페인 최고의 단일 버그. \`shapes\`는 139ms run 중 94ms를 두 minor collection에 쓰며 실제 live set은 약 3,200 object인데 young-survival ratio 739‰, 925‰를 보고했습니다.

\`arena_alloc_gc\`는 \`LARGE_OBJECT_THRESHOLD_BYTES\`(16KB)를 넘는 것을 old-gen에 바로 만들고 \`TENURED\`를 찍습니다. 2000 element \`Node2D[]\` backing store는 16,400바이트. **경계보다 16바이트 큽니다.**

매 round array는 영구 live—minor는 old-gen을 sweep하지 않음—, write barrier가 2000 store마다 old→young edge를 충실히 기록하고 뒤 minor의 remembered-set scan이 전부 다시 live로 mark. 94,000, 다음엔 118,006 slot remark.

“threshold를 올리기”는 틀렸으므로 fix가 흥미롭습니다. 경계 통과는 *copy cost*와 *retention cost*를 교환합니다. Pointer-free object는 둘 다 object size로 bounded해 16KB 유지. Pointer-bearing object retention은 transitive하고 unbounded하므로 array, object, closure는 128KB(V8의 \`kMaxRegularHeapObjectSize\`도 같은 이유로 같은 선). Selection은 hardcoded type list가 아니라 기존 \`pointer_free\` flag를 읽고 unknown type은 conservative value.

\`shapes\`는 fix round에서 0.139초 → 0.061초, 최종 sweep 0.058초로 Node보다 1.39× *빠름*. Peak RSS 71.4MB → 32.3MB. 다른 18 program은 ±1.3% 이내.

### 9. 측정은 수정보다 어려웠다

확신에 찬 잘못된 결론을 만든 것 일부:

- **고장 난 \`main\`으로 benchmark.** 며칠간 allocation-heavy program이 약 20× 느려(놀라움 #6) 모든 A/B 무의미. Load-independent signature—collection count 105 → 1304—는 결정적이지만 wall-clock이 단지 *나쁘고* 황당하지 않아 아무도 보지 않음.
- **Auto-optimize relink가 runtime을 \`--no-default-features\`로 rebuild**, \`diagnostics\`를 조용히 제거. \`PERRY_GC_TRACE\`가 아무것도 출력하지 않아 cycle count **0**. 한 조사가 세 arm에 “0 collection” 결론.
- **다른 host와 30 version 전 pinned ratchet baseline**이 pure drift인 29 “regression” 보고. 항상 같은 machine에서 두 A/B arm을 back-to-back.
- **Pretenuring gain 108MB → 0은 confound.** Base arm 뒤 다른 change가 landing. Mechanism은 맞고 target이 틀림(runtime-allocated parse tree, 접근 가능한 codegen-visible literal 아님), ceiling 약 1MB.
- **Crash하는 program을 수주간 timing.** 경쟁 binary는 \`deeplist\` 정답 출력 뒤 recursive refcount drop에서 −11(SIGSEGV). 그 column을 loss로 기록. 이제 모든 timing harness가 cell별 exit code 기록.
- **\`grep -c\`는 match 0이면 exit 1**, benchmark script의 \`&&\` chain을 조용히 끊음. exit 141 SIGPIPE의 \`PERRY_GC_TRACE\` pipe도 동일.

남은 규칙: 시계가 아니라 census counter 인용(load-independent). Timing보다 *binary* 먼저 비교. Comparison이 실제 무엇인가 비교했다고 assert. 테스트한다고 말한 arm이 live였는지 확인.

---

## 3부 — 두 개의 긴 길

### Statepoint: 4개월과 세 enabler 끝에 택한 길

LLVM의 \`gc.statepoint\`는 첫 prototype부터 correctness 면에서 명백히 우월한 mechanism이었습니다. **Optimizer가 존중해야 하는 relocation semantics**를 제공합니다. Shadow stack은 spill을 잊은 값을 optimizer가 영리하게 다루지 않는 동안에만 맞습니다. 흥미로운 것은 “명백히 더 좋음”과 “기본 배포” 사이 전부이며 지연 중 성능 때문인 것은 없습니다.

**GC가 아닌 것들이 막았습니다.** Exception은 \`setjmp\`/\`longjmp\`로 lower됐고, \`longjmp\`는 \`gc.relocate\`를 *건너뛸 수 있어* relocated pointer가 다시 쓰이지 않습니다. RS4GC에서는 더 나쁩니다. \`mem2reg\`가 setjmp correctness에 필요한 volatile alloca를 promote하지 않아 try-region root가 SSA에 들어가지도 relocate되지도 않습니다. \`gc.statepoint\`에는 바로 이를 위한 invoke form이 있습니다. Statepoint로 가는 길은 Perry의 setjmp exception lowering 전체를 지우고 invoke/landingpad로 교체(#7302/#7305), pass pipeline을 통제하려 LLVM을 in-process로 이동(#7301)하는 곳을 지났습니다. 어느 것도 GC ticket이 아니었습니다.

**매력적인 절충안이 함정이었습니다.** “\`try\` 함수에는 shadow stack 유지”는 두 root mechanism을 영원히 굳힙니다. “shadow stack 삭제, statepoint 유지”도 검토했지만 statepoint는 shadow stack root-set analysis의 alternative lowering이지 독립 mechanism이 아니어서 *표현 자체가 불가능*했습니다. Predicate 분리(#7340)가 per-target default와 미래 삭제를 가능하게 했습니다. 이전의 \`PERRY_SHADOW_STACK=0\` + statepoint는 **precise root 없는 binary**, \`__perry_gcmap\` section 없음, correct output, collection이 live object를 free하기 전까지 good build와 구분 불능이었습니다.

**두 backend 중 하나는 죽어야 했습니다.** RS4GC 옆에 손으로 쓴 explicit statepoint bridge를 유지했지만 동등하지 않았습니다. Bridge는 \`invoke\`를 root할 수 없어 \`try\` 함수를 거부했고, RS4GC의 silent fallback이기도 해 knob kill-policy가 막으려는 untested configuration이었습니다. 삭제 전 측정: **실제 Drizzle app과 ratchet probe의 1,574 function 모두 RS4GC lowering, fallback 0.** Bridge, CFG-based liveness analysis, call parser, emitter, \`PreciseRootBackend\` enum, \`PERRY_STATEPOINTS\` knob을 함께 삭제. Bail은 downgrade가 아니라 함수 이름을 대는 hard failure입니다.

**그다음 default가 coverage 없이 배포됐습니다.** Walkable target에서 native root가 수개월 기본값인데 **root-lowering mechanics 9개가 실제 Perry lowering에 대한 assertion 0**. Coverage처럼 보인 세 test는 \`js_shadow_slot_bind\`가 *없음*을 assert했는데 native default 아래 rooted든 아니든 모든 program에서 true라 아무것도 측정하지 않았습니다. 루트를 조용히 잃지 않는 것이 일인 시스템에서 다시 hazard 4. #7653은 pre-\`opt\` IR, post-RS4GC \`"gc-live"\` bundle, decoded \`__perry_gcmap\` blob의 세 관점으로 수정했습니다. 각각 다음의 blind spot을 채웁니다. Static root-dominance checker는 반대 방향으로 같았습니다. \`@js_shadow_slot_bind\`에 anchor해서 corpus가 \`PERRY_RS4GC=0\`으로 컴파일됐고 #7663 전까지 더는 배포하지 않는 lowering을 검사했습니다.

측정된 부정적 결과로 설계 법칙 하나를 얻었습니다. **Relocation semantics 없는 root metadata는 optimizing compiler 아래 unsound합니다.** Compact per-function metadata는 map을 10~13× 줄였지만 10줄 churn loop를 deterministic하게 corrupt했습니다. Map machinery가 아니라 mutator가 stale heap-derived SSA value로 from-space를 읽어 relocation만 고칠 수 있기 때문입니다. Barrier는 memory ordering을 제약하지 dataflow는 제약하지 않습니다.

### Unboxing: 진행 중이며 이제 주인공

다른 긴 길은 1부의 것입니다. Unboxed native representation을 canonical로 만들고 NaN-boxing을 polymorphic fallback으로 내립니다. 1단계(scalar local), 2(specialized ABI), 3a/3b(string과 \`Ptr<Shape>\` pointer local), 4a/4b(typed heap: 숫자 array, boxed layout이 불필요하게 지불한 bookkeeping)는 merge됐습니다.

정직하게 보고할 것이 둘 있습니다.

**한 sub-phase는 평가 후 거절됐고, 이유는 NaN-boxing에 대한 칭찬입니다.** 4b의 원래 headline인 unboxed *object field*는 조사 뒤 구현하지 않았습니다. \`number\` field slot은 이미 raw IEEE bit입니다. NaN-boxing이 \`0x7FF9..=0x7FFF\`만 reserve하므로 \`raw_f64_mask\`는 storage change가 아니라 *proof bit*이고 read-side guard도 이미 없어졌습니다. Raw string handle은 짧은 string을 쓸데없이 heap materialize해 small-string optimization을 깨뜨립니다. Raw \`i1\`/\`i32\` slot은 세 번째 mask와 약 25 direct slot-read site의 layout probe가 필요하고 \`JSON.stringify\`, \`util.inspect\`, \`v8\` serde 같은 hot path를 포함합니다. 대신 elision을 배포했습니다. Proven receiver의 field store는 값이 구조상 non-pointer면 layout note를, heap string일 수 없으면 string addref를 없앱니다.

**GC가 다음 타깃을 건넸습니다.** 4부 최종 측정은 가장 어려운 cluster의 제약이 collector가 아니라 mutator이고 구체적으로 **두 필드 object literal이 72바이트**임을 보여 줍니다. RFC가 말하는 정확한 representation problem이며 “실제 객체”는 다음에 그곳으로 갑니다.

### 가지 않은 길

**동시성.** 소유자의 직접 지시:

> “Parallelism/concurrency 자체를 위해 추구하고 싶지 않다. 필요한 일에 대한 나중 수단이어야 하며 hot path를 희생해서는 안 된다.”

제약이 설계를 *결정*합니다. 세 family는 mutator에 어디서 비용을 매기는지가 다릅니다. Parallel stop-the-world는 비용 없음(GC thread는 pause 안에만 존재), concurrent marking은 pointer write마다 store barrier, concurrent compaction은 pointer read마다 **load barrier**. Load가 store보다 훨씬 많아 마지막이 가장 강한 no입니다. Parallel STW만 허용 가능하고 (1) 존재하지 말아야 할 per-object work 삭제, (2) immortal cohort pretenuring 다음 세 번째입니다. 있어서는 안 되는 210만 object visit을 parallelize하는 것은 네 코어로 잘못된 일을 더 빨리 하는 것입니다.

측정은 지시보다 더 강하게 동의했습니다. \`7 이후 최악의 promotion case per-object visit은 삭제한 작업과 **159ms program 중 9.6ms**로 나뉩니다. Parallelize할 collector time이 부족하고 GC 작업 2×가 프로그램 3%입니다. Parallel GC는 미룬 계획이 아니라 이 workload set의 measured non-lever입니다.

Correctness 논거도 있습니다. 지금 “완전 재현 GC bug는 table이지 register가 아니다”는 진짜 진단입니다. Parallel collector는 이를 없애고 79 root scanner와 모든 \`thread_local!\` cache를 data race 후보로 만듭니다.

**Old-page defragmentation: 기본 ON 배포 후 같은 날 revert.** Rule 1의 가장 새롭고 깔끔한 예입니다.

부분적으로 live인 old page compaction은 2026-07 bug 이후 off였습니다. 이동한 old object로 향하는 stale non-heap reference가 활성 시 6/6 corruption. 다시 켜는 것은 env flip이 아니라 *rewrite-contract project*. Tracking issue는 old movable address를 유지할 모든 metadata/IC/cache path를 열거하고 **“reproducer와 dependency-scale stress corpus가 clean해진 뒤에만 defrag 재활성화”**하라고 acceptance bar를 적었습니다.

Contract 작업은 좋습니다. Static root-dominance allowlist는 여전히 빈 상태라 이전 exempt 약 40 hit이 다시 suppress된 게 아니라 실제 수정. Runtime holder policy는 *강화*해 \`open_gap\`과 \`unverified\`를 fail. 안전성이 “only old-gen defrag can move them”에 달렸던 두 cache도 exempt하지 않고 수정. 삭제 exemption의 \`becomes_real_when\`은 정확히 이 trigger를 이름 붙였습니다.

**Default flip**은 evidence 없이 따라왔습니다. Suite가 구조상 만들 수 없기 때문입니다. Selection은 old page에서 \`dead_bytes >= live_bytes\`, 즉 대규모 promote-then-die가 필요합니다. \`retain\` family는 999~1000‰ survive, \`churn\`은 거의 promote하지 않아 **후보 page를 만들 benchmark가 없습니다.** Benefit도 regression도 신호가 없고 old-address rewrite surface 전체만 물려받습니다. Merge 때 모든 GC gate도 queue에서 미실행이었습니다.

Correctness 작업은 모두 유지하고 실제 exercise할 fragmentation workload가 생길 때까지 default를 opt-in으로 되돌렸습니다. 그때 losing arm을 남기지 않고 삭제합니다. 새 규칙:

> **Benchmark suite가 trigger할 수 없는 feature를 그 suite는 방어할 수 없습니다.** Workload가 생길 때까지 default OFF로 배포하거나 두 arm 모두 untested임을 인정하세요.

**Pretenuring.** 두 번 build, 측정, 반박, 재개 조건을 문서화해 park. Architecturally correct한 “long-lived object를 birth 때 old-gen에 두기”는 emergently sufficient한 “promote-on-first-copy seed가 cohort를 한 hop으로 제한”에 졌습니다. 구성 가능한 모든 load에서 두 arm은 구분 불가. 메타 교훈: **invariant를 만들기 전에 discriminating shape을 test하세요.**

---

## 4부 — 현재 상황

2026-08-12 최종 sweep. 조용한 pinned M1 mini, best-of-5, exit 확인, timing 전 \`node --experimental-strip-types\`와 output byte 검증. Node 26.5.1 및 참조 카운팅 AOT 경쟁자를 상대로 GC-shaped benchmark 19개.

**Perry는 19개 중 9개에서 Node를 이기고**(시작은 3개), **refcounting compiler는 14개에서 이기며**, **15개에서 Node의 1.3× 이내**입니다.

| bench | perry | node | P/node | Δ 이번 라운드 |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

남은 것은 서로 **분리된 두 cluster**이며 하나의 mechanism으로 다루는 것은 이미 한 번 한 실수입니다.

1. **Node 상대: dispatch와 mutator, 대부분 GC가 아님.** \`iso_miss\`, \`interp\`, \`pipeline\`, \`asyncpipe\`. 주로 polymorphic property dispatch, inline cache, representation selection—다른 캠페인. 하지만 \`asyncpipe\` 0%를 “GC 없음”으로 읽기 전 아래 정정을 보세요.
2. **Refcounting compiler 상대: \`retain\` family.** \`retain1\` 1.80×, \`retain_wide1\` 1.67×, \`retain_wide\` 1.65×. 모두 이미 Node보다 빠릅니다. 아무것도 죽지 않아 tracing collector가 최악일 것으로 예상한 행이지만 그 예상은 흥미롭게 틀렸습니다.

최종 sweep의 발견이 캠페인 전체를 다시 규정합니다. **두 번째 cluster의 binding constraint는 컬렉터가 아니라 mutator입니다.** *모든* GC pause를 빼도 \`retain_wide\`(pure mutator 130.8ms)와 \`shapes\`(60.2ms)는 여전히 집니다. \`retain\`은 parity를 위해 정확히 zero GC가 필요합니다. 실제 비용은 **두 필드 객체가 72바이트**라서 \`retain\`이 **48MB 숫자를 저장하려 216MB 메모리를 씀**—4.5× write amplification. 경쟁자의 우위는 refcounting이 아니라 compactness였습니다. 이제 collector 문제가 아니라 representation 문제(#7916), 1부 unbox-by-default를 스칼라 대신 object layout에 적용합니다.

다른 cluster에 대응하는 defect도 있습니다. \`asyncpipe\`는 1200~1650ns/object로 수집하며, 그중 **0개 객체를 처리한 122ms minor collection**은 프로그램 전체보다 깁니다. Object count와 무관한 per-cycle cost는 fixed overhead이며 critical path에 남은 컬렉터 마지막 부분입니다(#7915).

명백한 다음 수지만 틀린 부정적 결과: **첫 nursery를 줄이지 마세요.** Cycle 0이 \`retain\` family GC pause의 58~81%. 2MB cap은 \`retain\` pause를 52 → 31ms로 줄여 무료처럼 보입니다. 하지만 \`asyncpipe\`는 0 collection → 4, 127ms 프로그램에 385ms이고, 이른 promotion이 old-gen trigger를 추가 full mark-sweep으로 retime(\`retain_wide1\` +182%).

출발 규모: 캠페인을 연 JSON pipeline은 60.4초 → 3.86초. \`retain\` family는 이 작업 한 round에서 36~46% 개선. 컬렉터 전체에는 full mark-sweep kill switch(\`PERRY_GEN_GC=0\`)가 있어 계속 exercise합니다. 이것과 bisect할 수 없는 날은 수치를 신뢰할 수 없는 날입니다.

---

## 이제 따르는 규칙

대부분은 GC 너머로 일반화됩니다.

1. **아직 존재하는 mode는 아직 내려지지 않은 결정입니다.** Losing branch를 지우거나 이를 exercise하는 arm을 유지하세요. 삭제한 곳에 tombstone comment를 남기세요.
2. **게이트는 대상이 live였다고 assert해야 하며**, 아무것도 throw하지 않았음만으로는 안 됩니다. “아무것도 안 돌아 green”은 red보다 나쁩니다.
3. **움직일 수 없는 양으로 feedback loop를 pace하지 마세요.** 세 개의 별도 livelock, 하나의 형태.
4. **O(live) process를 constant band로 pace하지 마세요.** 큰 상수는 절벽을 옮길 뿐입니다.
5. **증거를 남기지 않는 버그 유형은 조사를 멈추고 instrument를 만드세요.** 보이지 않았음을 증명하는 비계측 control까지 sabotage-test하세요.
6. **Doc comment는 변경이 아닙니다.** 인식되지 않는 값까지 default를 test로 고정하고 일치해야 할 component의 agreement도 고정하세요.
7. **같은 host, 같은 tree에서 두 arm을 측정하고 exit code를 확인하세요.**
8. **Invariant를 만들기 전에 discriminating shape을 test하세요.**
9. **영구 hybrid를 거부하세요.** “어려운 경우는 이전 mechanism 유지”가 migration을 영원한 두 mechanism으로 만듭니다. 어려운 경우를 작동시키거나 migrate하지 마세요.

컬렉터는 완성되지 않았습니다. 하지만 처음으로 *읽을 수 있게* 되었습니다. 모든 knob은 무언가를 gate하고, 모든 gate는 fail할 수 있고, 모든 default는 test로 고정되며, 공개한 모든 숫자는 output을 먼저 검증한 조용한 machine에서 측정했습니다. 이 가독성은 collector 자체보다 많은 작업을 요구했고, 지난 한 달의 숫자가 움직인 유일한 이유입니다.
`;

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
