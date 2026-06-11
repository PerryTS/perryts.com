export default function Content() {
  return (
    <>
      <p>
        몇 주 전, <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a>(X에서 @axt_ayakoto)가 AtCoder 문제 ABC451D &ldquo;Concat Power of 2&rdquo;에서 <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">Perry를 Deno 및 Bun과 비교한 벤치마크</a>를 게시했습니다. 그의 측정 결과: Perry는 <strong>Bun보다 3.85× 느렸습니다</strong>. 그의 결론은 정중했지만 단호했습니다 — Perry는 경쟁 프로그래밍 런타임이 될 준비가 되어 있지 않았고, 성숙한 뒤에도 그렇지 않을 수 있다는 것이었죠.
      </p>
      <p>
        그에게 후속 답변을 빚지고 있습니다. 같은 벤치마크에서, 같은 <code>hyperfine</code> 명령으로, 같은 머신 클래스에서 우리가 도달한 지점은 다음과 같습니다:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        그 갭을 좁히기까지는 잘못된 가설에서 출발해, 실재하지만 의도된 GC 아키텍처 트레이드오프를 발견하고, 우리가 글로 쓸 만하다고 여기는 결과를 만들어낸 조사가 필요했습니다 — 우리가 따라잡았기 때문이 아니라, 프로파일링 아래에서 그 트레이드오프가 어떤 모습으로 드러나는지 그 자체가 흥미롭기 때문입니다.
      </p>

      <h2>벤치마크</h2>
      <p>
        aya_koto의 <code>abc451d-perry.ts</code>는 2의 거듭제곱 문자열들의 연결에 대해 재귀적 깊이 우선 탐색을 수행하며, <code>Set&lt;number&gt;</code>를 통해 중복을 제거하고 정렬합니다. 핫 함수는 짧습니다:
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}`}</code></pre>
      <p>
        그 형태가 곧 이야기입니다. 매 호출마다 새로운 <code>string[]</code>를 할당합니다. 재귀는 깊고 — 최상단에서 분기 계수가 대략 30까지 — 모든 부모 프레임은 자식의 배열을 순회하며 자신의 배열에 푸시하는 동안 자신의 <code>answers</code> 배열을 살아 있게 유지합니다. 짧게 사는 할당, 깊은 재귀, 활성 아레나 블록마다 흩어진 라이브 참조. 이것은 결국 Perry의 GC가 튜닝되지 <em>않은</em> 바로 그 워크로드였습니다.
      </p>

      <h2>잘못된 가설</h2>
      <p>
        한 독자가 aya_koto의 글에 각주를 남겨, Perry의 BigInt가 내부적으로 고정 길이 1024비트 정수이며 BigInt를 많이 쓰는 프로그램이 Bun보다 대략 4× 느리게 돈다고 지적했습니다. ABC451D는 2의 거듭제곱을 다룹니다 — 큰 수가 관여할 법해 보였습니다 — 그래서 첫 직관은: 범인은 BigInt다, BigInt 경로를 고치면 갭이 좁혀진다, 였습니다.
      </p>
      <p>
        아니었습니다. <code>grep -i bigint abc451d-perry.ts</code>는 아무것도 반환하지 않았습니다. 이 벤치마크는 전체적으로 <code>number</code>를 사용하며, 모든 값이 2^53 아래에 넉넉히 들어맞습니다. BigInt 각주는 정확했고, 실재했으며, 고칠 가치가 있는 문제였습니다 — 그리고 우리는 그것을 v0.5.736에서 별도로 고쳤습니다. 하지만 ABC451D와는 아무 상관이 없었습니다.
      </p>
      <p>
        잘못된 가설을 먼저 쫓은 대가는 약 하루였습니다. 교훈은 — 우리가 이미 알고 있었다고 주장하고 싶은 것은 — 이론이 신뢰할 만한 출처에서 나오고 당신의 선입견과 들어맞을 때조차, 이론에 헌신하기 전에 프로파일하라는 것입니다. 특히 그럴 때 더욱.
      </p>

      <h2>벤치 재현</h2>
      <p>
        BigInt 추적을 멈춘 뒤 우리가 가장 먼저 한 일은 aya_koto의 숫자를 깔끔하게 재현하는 것이었습니다. Perry에서 그의 1.219초 근처에 도달하리라 예상했습니다. 우리는 Perry v0.5.729에서 <strong>2.998초</strong>에 도달했습니다.
      </p>
      <p>
        그가 테스트한 버전과 당시 우리의 현재 main 사이에 2.5× 회귀가 있었던 셈입니다. Deno와 Bun은 그의 숫자의 50% 이내로 재현됐습니다(하드웨어 차이, 버전 드리프트). 아무도 지켜보지 않는 사이 Perry 갭은 3.85×에서 6.59×로 벌어져 있었습니다.
      </p>
      <p>
        우리는 어느 커밋이 회귀를 일으켰는지 이등분(bisect)하지 않았습니다 — 그것은 이 조사의 범위를 벗어났습니다. 하지만 그 드리프트를 잡아냈을 CI 가드레일의 부재 자체가 하나의 발견이며, 끝에서 다시 다루겠습니다.
      </p>

      <h2>프로파일 기반 진단</h2>
      <p>
        <code>PERRY_DEBUG_SYMBOLS=1</code>로 컴파일하고 <code>samply</code>로 기록하니, self-time 그림은 명확했습니다:
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>self time의 76%가 GC 머신러리였습니다.</strong> 포함(inclusive) 시간도 일치했습니다: <code>gc_collect_minor</code> 80%, <code>Arena::alloc</code> 76%, <code>js_array_alloc</code> 45%, <code>js_array_push_f64</code> 22%. 재귀 <code>search()</code>는 핫했지만, GC 마크 페이즈 아래에서 핫했습니다. 각 호출은 컬렉션을 유발할 만큼의 할당을 촉발하고 있었습니다.
      </p>
      <p>
        네거티브 컨트롤 마이크로벤치마크는 이 느려짐이 일반적인 것이 아님을 확인해 주었습니다. 타이트한 정수 <code>fib(80) × 100_000</code>, 할당 없음: Perry <strong>6.1 ms</strong> vs Bun <strong>24.7 ms</strong> — Perry가 4× 빠릅니다. 할당이 없는 핫 루프의 codegen은 이미 Bun을 앞서 있었습니다. ABC451D의 갭은 하나의 특정 코드 경로에 집중돼 있었습니다: 할당 처리량 + 이 특정 할당 형태에 대한 GC 마크-스윕.
      </p>

      <h2>결정적 증거</h2>
      <p>
        사이클별 GC 통계를 출력하는 플래그 — <code>PERRY_GC_DIAG=1</code> — 가 있었습니다. 그 출력이 조사 전체에서 핵심을 지탱하는 관찰이었습니다:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        매 사이클, 같은 패턴이었습니다. 스윕은 <strong>할당된 객체의 55–60%가 죽었음</strong>을 정확히 식별했습니다. 그런데 아레나는 <strong>0개 블록</strong>을 회수했습니다. 힙은 실행 내내 단조 증가했고, GC는 점점 커지는 워킹 셋에 대해 마크-스윕 비용을 계속 지불했습니다.
      </p>
      <p>
        절반 이상의 객체가 죽었는데도 왜 <code>block_reclaim=0</code>일까요? Perry의 아레나 GC가 블록 단위로 회수하기 때문입니다. 1 MB 블록은 그 안의 모든 객체가 죽었을 때에만 리셋됩니다. ABC451D에서 재귀 <code>search()</code>는 라이브 참조 — 부모 프레임의 <code>answers</code> 배열 — 를 활성 블록마다 흩어진 채로 유지합니다. 어떤 블록도 완전히 죽지 않습니다. 마크-스윕은 죽은 객체를 정확히 식별하지만, 객체별 회수 경로가 없어 그것들에 대해 아무 일도 하지 않습니다. 힙은 자라고, GC 트리거는 트레드밀 위에서 발화하며, 워킹 셋이 커질수록 각 사이클의 비용도 올라갑니다.
      </p>

      <h2>의도된 트레이드오프</h2>
      <p>
        우리가 찾은 가장 시사적인 것은 프로파일에 있지 않았습니다. 그것은 스윕 자체, <code>crates/perry-runtime/src/gc.rs:2733</code>에, 설계를 설명하는 주석으로 있었습니다:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        우리는 의도적으로 죽은 객체를 전역 ARENA_FREE_LIST에 푸시하지 않습니다. 인라인 범프 할당기는 프리 리스트를 절대 읽지 않습니다 — 대신 블록별 리셋을 사용합니다. 죽은 객체를 프리 리스트에 푸시하는 것은 객체당 ~50ns × GC당 ~700k 객체 × 벤치마크당 ~12 GC 사이클 = <code>object_create</code>에서 420ms의 순수 낭비를 초래합니다.
      </blockquote>
      <p>
        이것은 튜닝 대상이었던 워크로드에 대해 정확히 옳습니다. <code>object_create</code>는 우리가 신경 쓰는 벤치마크로, 할당이 타이트한 루프에서 죽고 사이클 사이에 블록 전체가 실제로 비게 됩니다. 객체별 프리 리스트 패스를 추가하는 것은 그 워크로드에 대해 420 ms의 무의미한 부기를 태우는 것이며, 블록 리셋 경로가 같은 메모리를 더 저렴하게 회수합니다.
      </p>
      <p>
        그것은 ABC451D의 형태 — 라이브 참조가 흩어진 채로 남아 블록 리셋이 결코 발화하지 않는 — 에는 잘 맞지 않습니다. 아키텍처에는 의도된 트레이드오프가 인코딩돼 있었고, 우리는 그 트레이드오프가 반대 방향으로 가는 경우를 벤치마크해 본 적이 없었습니다.
      </p>
      <p>
        그것이 실제 교훈입니다. GC는 고장 나지 않았습니다. 그것은 aya_koto의 벤치가 대표하는 것과는 다른 할당 패턴 분포에 맞춰 튜닝돼 있었고, 우리는 그것이 튜닝된 분포가 실재하는 한 부류의 워크로드 — 재귀 탐색, 트리 워크, 그리고 스택의 모든 레벨에서 라이브 상태를 유지하면서 그 아래에서 짧게 사는 할당을 하는 모든 것 — 를 배제한다는 것을 알아채지 못했습니다.
      </p>

      <h2>효과가 없었던 것들</h2>
      <p>
        실제 수정에 이르기 전, 그럴듯해 보이던 여러 레버가 잘못된 레버로 드러났습니다. 이것들을 숫자와 함께 보고하는 이유는 그것들이 조사에서 더 흥미로운 절반이었기 때문입니다:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry에는 이미 옵트인 복사-퇴거(copying-evacuation) 패스가 있었습니다. ABC451D에서 켜보니: <strong>11.4초</strong>, 베이스라인보다 네 배 느렸습니다. 그 패스는 유용하든 아니든 매 사이클 돌고, 라이브 셋이 짧게 사는 작은 객체일 때 객체별 복사 + 참조 재작성 비용이 재앙적입니다. 이득을 보는 워크로드를 위해 유지할 가치는 있지만, 여기서의 답은 아니었습니다.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong>(세대별 대신 전체 마크-스윕) — 3.06초, 본질적으로 베이스라인과 동일. 구속하는 것은 전략의 선택이 아니라, 객체별 회수의 부재입니다.</li>
        <li><strong><code>ValidPointerSet</code> 구조적 정리(commit 0fa42e0b).</strong> 두 개의 별도 정렬 벡터(아레나 포인터와 malloc된 포인터)를 하나로 병합하고, min/max 범위 사전 필터를 추가하고, <code>try_mark_value</code>의 태그 거부를 인라인했습니다. <code>contains()</code>의 호출당 비용을 절반으로 줄였습니다 — 그것은 프로파일이 지목한 핫 이너 루프였죠. ABC451D 벤치는 3.07초에서 3.21초로 움직였습니다. 노이즈 이내, 무승부. 이 변경은 <code>contains()</code>가 실제로 구속 제약인 워크로드(ECS 형태 벤치마크, hono compose 체인)에는 여전히 가치를 제공하지만, 여기서는 구속 제약이 아니었습니다. 할당 압력이 마크 페이즈로 흘러들며 만든 절대 호출량은 호출당 비용이 0이어도 지배했습니다.</li>
      </ul>
      <p>
        세 가지 모두를 관통하는 패턴: GC 전략과 호출당 이너 루프 비용은 이차적이었습니다. 구속 제약은 완전히 비지 않는 블록의 죽은 객체에 대한 회수 경로의 부재였습니다. 그것이 해결되기 전까지는 다른 무엇도 바늘을 움직이지 못했습니다.
      </p>

      <h2>우리가 도달한 지점</h2>
      <p>
        v0.5.737과 v0.5.875 사이, 대략 137개의 패치 버전에 걸쳐 갭이 좁혀졌습니다. 이 글을 쓰면서 우리는 신중합니다: 우리는 단일 영웅 커밋으로 이등분하지 않았습니다. 수정은 의도된 &ldquo;객체별 프리 리스트 없음&rdquo; 트레이드오프를 영구적이 아니라 조건부로 만든 GC 서브시스템의 일련의 변경에 걸쳐 안착했습니다 — <code>block_reclaim</code>이 연속된 사이클에서 0으로 머무를 때, 스윕은 크기별 버킷 프리 리스트를 채우기 시작하고 범프 할당기는 폴백 경로를 얻습니다. 정확한 순서와 어느 패치가 얼마나 기여했는지는 우리가 빚지고 있지만 아직 하지 않은 신중한 이등분을 요할 것입니다.
      </p>
      <p>
        결과는, aya_koto의 정확한 벤치와 명령으로, Apple M 시리즈, macOS 26.4에서:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        이 표에 대한 두 가지 정직함의 주석. 첫째, Bun 대비 Perry의 1.01× 마진은 오차 막대 이내입니다 — 올바른 단어는 &ldquo;빠르다&rdquo;가 아니라 &ldquo;동률&rdquo;입니다. 둘째, 세 런타임 모두의 분산이 유의미하며(Perry의 최댓값은 평균 425 ms 대비 745 ms), 어떤 단일 실행도 어느 한쪽 꼬리에 떨어질 수 있습니다. 그 이유로 평균 옆에 최솟값과 최댓값을 보여드렸습니다; 우리는 당신이 그 폭을 보길 바랍니다.
      </p>

      <h2>여전히 불완전한 것</h2>
      <p>
        우리가 덮어 가리지 않는 몇 가지:
      </p>
      <p>
        aya_koto의 측정과 이 조사의 시작 사이에 일어난 1.2초에서 3.0초로의 회귀는, 우리가 이 부류의 느려짐을 잡아내는 CI 가드레일을 갖고 있지 않았음을 말해줍니다. 이 글이 공개되기 전에 우리는 <code>abc451d-perry.ts</code>와 그 주변의 작은 스위트를 perf 회귀 게이트로서 Perry의 CI에 추가하는 중입니다. 이 벤치가 미래 릴리스에서 조용히 저하된다면, 그것은 석 달 뒤 비평가의 벤치마크가 아니라 빌드를 실패시켜야 합니다.
      </p>
      <p>
        이 수정은 의도된 트레이드오프를 특정 방향으로 완화합니다. 우리는 <code>object_create</code> 벤치마크와 그 동료들 — 원래의 &ldquo;프리 리스트 없음&rdquo; 선택이 보호하던 워크로드 — 를 지켜보며 조건부 프리 리스트 경로가 그것들을 회귀시키지 않도록 확인하고 있습니다. 초기 숫자는 노이즈 이내이지만, 이런 종류의 일은 단일 벤치마크 실행이 아니라 시간에서 확신이 옵니다.
      </p>
      <p>
        우리는 137-버전 범위를 이등분하지 않았습니다. 할 것입니다. 그것은 문서화를 위해 중요하고, 어느 조건부 프리 리스트 메커니즘이 일을 하고 있는지 이해하기 위해 중요합니다.
      </p>

      <h2>감사</h2>
      <p>
        aya_koto의 글은 오픈소스 프로젝트가 필요로 하지만 좀처럼 받지 못하는 바로 그런 종류의 글이었습니다. 그는 신중하게 측정했고, 테스트 레포를 공개했고, 설치 경로의 구체적 마찰을 짚었으며, Perry가 그가 평가하던 사용 사례에 준비되지 않았다는 정직한 결론에 도달했습니다. 그 결론은 그가 내릴 당시에는 옳았습니다. 그가 그것에 대해 쓰지 않았다면 더 오래 옳았을 것입니다.
      </p>
      <p>
        그의 테스트 레포는 <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>에 있습니다. 그의 글은 <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>에 있습니다. 둘 다 이 후속 글 이후에도 읽을 가치가 있습니다 — 특히 그 글은, 정중할 인센티브가 전혀 없는 누군가가 초기 단계 컴파일러에 대한 정직한 평가를 기록하고 있기 때문입니다.
      </p>
      <p>
        그의 글에서 짚어둘 두 가지. 그가 지적한 설치 경로 마찰 — perryts.com 상단은 한 방법을 가리키는데 문서는 다른 방법을 권했다는 점 — 은 수정됐습니다; npm 경로가 이제 랜딩 페이지에서 두드러진 옵션이며, 문서와 일치합니다. 그가 짚은 &ldquo;제한 사항 문서 바깥에 있으면서 컴파일되지 않는 것들&rdquo; 좌절 — 우리는 그의 테스트 레포의 모든 <code>.ts</code> 파일을 현재 Perry에 대해 검토했습니다; 진짜 갭은 이슈로 등록됐고, 문서화된 제한 사항은 확장됐습니다.
      </p>
      <p>
        그의 글에 달린 BigInt 각주는, 위에서 논의했듯 ABC451D와는 무관했지만 그 자체로는 실재했습니다 — Perry의 BigInt 구현은 실제로 내부적으로 고정 폭 1024비트 정수였고, BigInt를 많이 쓰는 프로그램이 그 대가를 치렀습니다. 그것은 v0.5.736에서, 작은 값을 위한 인라인 경로와 임의 정밀도 폴백으로서의 <code>num-bigint</code>로 수정됐습니다. 그 공로는 aya_koto의 글에 각주를 남긴 독자에게 있습니다; 우리는 그들이 누구인지 모르지만, 이 글을 읽고 있다면: 감사합니다.
      </p>

      <h2>재현</h2>
      <p>
        이 숫자들을 직접 재현하고 싶다면:
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        당신의 숫자는 하드웨어와 런타임 버전에 따라 달라질 것입니다. 잘못돼 보이는 방식으로 달라진다면, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">이슈를 열어주세요</a> — 우리는 그것을 듣는 편을 선호합니다.
      </p>
      <p>
        소스: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
