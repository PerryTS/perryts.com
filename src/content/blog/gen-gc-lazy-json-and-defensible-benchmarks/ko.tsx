export default function Content() {
  return (
    <>
      <p>
        지난 글은 <strong>v0.5.174</strong>에서 한 가지 헤드라인과 함께 마무리되었습니다. Perry가 마침내 인트리(in-tree) 스위트의 모든 벤치마크에서 Node와 Bun을 모두 이기고 있다는 것이었죠. 사흘간의 작업과 GC + JSON 커밋의 백로그를 거친 후, Perry는 <strong>v0.5.306</strong>에 도달했습니다 &mdash; 즉 <strong>132개의 패치 릴리스</strong>입니다 &mdash; 그리고 이야기는 다른 것입니다. 헤드라인은 547배 속도 향상이나 새로운 승리 컬럼이 아닙니다. 그 승리들을 변호 가능하게(defensible) 만드는 작업입니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>세대별 GC(generational GC)</strong>가 기본값으로 출시됩니다. 페이즈 A부터 D까지 v0.5.217–v0.5.237에 걸쳐 안착했습니다.</li>
        <li><strong>Small String Optimization</strong>이 기본값으로 출시됩니다. Step 1.5 → 2가 v0.5.213–v0.5.216에 안착했습니다.</li>
        <li><strong>JSON 파이프라인</strong>은 테이프 기반 파서, 레이지 파스, 레이지 stringify, 그리고 요소별 희소(sparse) 머터리얼라이제이션을 얻었습니다. 이제 기본 validate-and-roundtrip은 <strong>중앙값 75 ms</strong>입니다 &mdash; 동적 타이핑 그룹에서 최고입니다.</li>
        <li><strong>벤치마크 페이지</strong>는 <strong>RUNS=11 중앙값 + p95 + σ + 최소 + 최대</strong>로 처음부터 끝까지 다시 작성되었고, simdjson과 AssemblyScript+json-as가 동료로 추가되었으며, 최적화 프로브는 진짜 비교에서 분리되었고, Perry가 가진 모든 약점이 정직하게 드러나 있습니다.</li>
      </ul>
      <p>
        조연들은 꾸준한 정확성 수정의 행렬입니다. Promise 마이크로태스크 FIFO, NaN 동등성과 ECMAScript 숫자 포매팅, BigInt 2의 보수, AsyncLocalStorage 엔드투엔드, decimal.js + ioredis + commander 런타임, 그리고 테이프 경로 아래에 숨어 있던 일반 f64에 대한 JSON.stringify 세그폴트. 더해서 Windows 툴체인이 마침내 가벼워졌습니다. LLVM + xwin, Visual Studio 설치 불필요.
      </p>

      <h2>1. 세대별 GC, 기본값으로 활성화</h2>
      <p>
        세대별 GC는 두 달간 단계별로 롤아웃되었습니다. 이 기간에 닫힌 페이즈들의 요약:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> &mdash; 페이즈 A: 섀도우 스택 런타임 스캐폴딩, push/pop 발행, 슬롯-맵 스레딩, <code>Let</code>/<code>LocalSet</code> 섀도우 미러링, 그리고 루트 스캐너.</li>
        <li><strong>v0.5.222</strong> &mdash; 페이즈 B: 너서리(nursery) + 올드젠(old-gen) 아레나 분리.</li>
        <li><strong>v0.5.223–v0.5.225</strong> &mdash; 페이즈 C1–C2: 라이트 배리어 런타임 인프라, 코드젠이 배리어를 발행, 모든 힙 저장이 그것을 거칩니다.</li>
        <li><strong>v0.5.226–v0.5.228</strong> &mdash; 페이즈 C3a–C4: 리멤버드 셋 루트가 마크 + 클리어로 흘러들어가고, 마이너 GC 트레이스는 올드젠을 건너뛰며, 비이동 테뉴어링.</li>
        <li><strong>v0.5.229–v0.5.236</strong> &mdash; 페이즈 C4b α/β/γ/δ: 포워딩 포인터 인프라, 핀닝 + 이배큐에이션 패스, 스캐너 + 추이적 핀닝, 레퍼런스 재작성, 유휴 너서리 블록은 OS로 반환, GC 트리거는 초기 임계값으로 캡 설정.</li>
        <li><strong>v0.5.237</strong> &mdash; 페이즈 D 파트 1: <code>PERRY_GEN_GC=1</code>이 기본값.</li>
        <li><strong>v0.5.238</strong> &mdash; 페이즈 D 파트 2: <code>PERRY_SHADOW_STACK=1</code>이 기본값.</li>
        <li><strong>v0.5.239–v0.5.240</strong> &mdash; 마무리 문서: 로드맵 확정, 학술 + 산업 계보 부록(Bartlett 1988, Ungar 1984, Cheney 1970).</li>
      </ul>
      <p>
        가장 중요했던 측정된 승리는 <code>test_memory_json_churn</code>이 gen-GC 기본값이 켜진 순간 피크 RSS가 <strong>115 MB → 91 MB</strong>로 떨어진 것이었습니다. 컴퓨트 리그레션은 작았고 변명 없이 나열되었습니다 &mdash; <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> 각각 +1 ms. 이스케이프 해치(<code>PERRY_GEN_GC=0</code>)는 옛 숫자를 회복시킵니다. 트레이드오프는 의도적이었으며, 이제 벤치마크 페이지는 두 행을 나란히 나열하므로 독자가 선택할 수 있습니다.
      </p>

      <h2>2. Small String Optimization, 기본값으로 활성화</h2>
      <p>
        SSO는 짧은 문자열에 대해 힙 할당을 회피하는 22바이트 인라인 문자열 표현입니다 &mdash; 일반적인 JSON 키(2–8바이트)와 짧은 값이 인라인 형태에 들어맞습니다. 표면상 롤아웃은 작았지만 그 아래는 컸습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: SSO 인프라(표현 + 액세서).</li>
        <li><strong>v0.5.214</strong>: Step 1 컨슈머 무장 + 테스트용 <code>PERRY_SSO_FORCE</code> 게이트.</li>
        <li><strong>v0.5.215</strong>: Step 1.5 코드젠 <code>PropertyGet</code> 3-way 분기 &mdash; 인라인 문자열용 패스트 패스, 힙 문자열용 패스트 패스, 잔여물용 슬로우 패스.</li>
        <li><strong>v0.5.216</strong>: Step 2 플립 &mdash; 기본값으로 SSO 발행.</li>
      </ul>
      <p>
        v0.5.279의 후속은 SSO가 핫해진 후 드러난 마지막 프로퍼티 읽기 NaN 버그를 닫았고, v0.5.272의 연쇄적 크로스 모듈 게터 디스패치 수정은 또 다른 것을 닫았습니다. 둘 다 기본값이 뒤집히기 전 펀치 리스트에 있었고, 둘 다 성능 리그레션 없이 출시되었습니다.
      </p>

      <h2>3. JSON: 테이프 기반 파스, 기본적으로 레이지</h2>
      <p>
        JSON 파이프라인은 이 기간 동안 가장 침습적인 재작성을 받았습니다. 이전 동작: <code>JSON.parse</code>가 NaN-박스 값들의 완전 머터리얼라이즈된 트리를 만들었습니다. 새 동작: <code>JSON.parse</code>는 값당 12바이트 테이프를 만들고 레이지하게 머터리얼라이즈합니다 &mdash; 실제로 읽는 값들만 머터리얼라이제이션 비용을 지불합니다. 변경되지 않은 파스에 대한 stringify는 이제 원본 입력의 memcpy이며, 이는 simdjson이 <code>raw_json()</code>으로 사용하는 동일한 패스트 패스 트릭입니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> 스키마 지향 파스(Step 1). 컴파일 타임에 알려진 셰이프는 컴파일러가 사전 해결된 키 액세스를 발행하게 합니다.</li>
        <li><strong>v0.5.203</strong>: 테이프 기반 파스 토대 &mdash; Step 2 페이즈 1.</li>
        <li><strong>v0.5.204</strong>: 레이지 파스 + 레이지 stringify &mdash; Step 2 페이즈 2+4.</li>
        <li><strong>v0.5.206</strong>: 레이지 안전 인덱스 액세스 + 엣지 케이스 &mdash; Step 2 페이즈 3.</li>
        <li><strong>v0.5.208</strong>: 요소별 희소 머터리얼라이제이션 &mdash; Step 2 페이즈 5b.</li>
        <li><strong>v0.5.209</strong>: 워크 커서 + 적응형 머터리얼라이즈 임계값.</li>
        <li><strong>v0.5.210</strong>: ≥1 KB 블롭에 대해 레이지 파스를 기본값으로 플립.</li>
      </ul>
      <p>
        레이지 테이프가 설계된 워크로드(레코드 10k개, ~1 MB 블롭, 중간 반복 없이 parse → stringify)에서의 결과:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">구현</th>
              <th className="text-right py-2 px-3">중앙값 (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">피크 RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry는 <strong>중앙값 75 ms</strong>로 비교 대상 중 가장 빠른 동적 타이핑 런타임입니다 &mdash; Bun(259 ms)을 이기고, Node(394 ms)를 이기고, Kotlin의 서버 JIT(453 ms)를 이깁니다. simdjson의 24 ms는 SIMD 가속 C++의 천장이며, 체리피킹 뒤에 숨겨지지 않고 의도적으로 페이지에 남아 있습니다. Perry는 이를 이기지 못합니다. 요점은 격차를 보여주어 그것을 닫는 것에 목표가 생기게 하는 것입니다 &mdash; <code>docs/json-typed-parse-plan.md</code>에서 추적됩니다.
      </p>
      <p>
        정직한 동반 벤치는 <strong>parse-and-iterate</strong>입니다. 동일한 블롭이지만 매 반복마다 모든 레코드의 <code>nested.x</code>를 합산하므로 레이지 테이프가 머터리얼라이즈되도록 강제합니다. 거기서 Perry는 <strong>466 ms</strong>에 안착합니다 &mdash; 마크-스윕 이스케이프 해치의 375 ms보다 느린 이유는 테이프가 상각할 수 없는 오버헤드를 지불하기 때문입니다. 그 행은 TL;DR §B에 있습니다. 작업을 피할 수 없을 때, 레이지 테이프는 그런 척하지 않습니다.
      </p>

      <h2>4. 벤치마크 페이지, 다시 작성됨</h2>
      <p>
        Perry가 성능 숫자를 제시하는 방식에 대해 세 가지가 바뀌었습니다.
      </p>
      <p>
        <strong>RUNS=11 중앙값 + p95 + σ + 최소 + 최대, best-of-N이 아님.</strong> Best-of-N은 테일 레이턴시를 조용히 떨어뜨립니다. 이 하드웨어에서는 9.4초의 Python <code>accumulate</code> 이상치와 Swift JSON의 5.3초 p95 스파이크를 숨기고 있었습니다. 중앙값은 테일을 다시 페이지에 올립니다. 방법론 변경은 v0.5.248에 안착했습니다. TL;DR §A와 §B의 모든 셀은 <strong>2026-04-25</strong> 기준 RUNS=11 신선합니다.
      </p>
      <p>
        <strong>최적화 프로브는 진짜 런타임 성능에서 분리됩니다.</strong> Perry가 12–34 ms vs Rust/C++가 98 ms인 다섯 셀 &mdash; <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> &mdash; 은 실리콘이 아니라 컴파일러 플래그 자세를 측정합니다. 이제 이것들은 자체 서브섹션에 있고, 그 위에는 <code>clang++ -O3 -ffast-math</code>가 이를 1밀리초 이내로 좁힌다는 것을 설명하는 단락이 있습니다. 헤드라인 진짜 런타임 커널은 <code>loop_data_dependent</code>입니다: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 &mdash; Perry는 컴파일러가 진짜로 작업을 접어 없앨 수 없는 커널에서 no-FMA-contract 그룹의 한가운데 자리합니다. 그것이 정직한 비교입니다.
      </p>
      <p>
        <strong>동료 추가됨.</strong> simdjson(4.3.0)은 이제 두 JSON 표 모두에 있습니다 &mdash; C++ 파스 처리량 천장이 페이지에 있어 독자가 격차를 볼 수 있습니다. json-as(1.3.2)와 함께 있는 AssemblyScript는 가장 가까운 설치 가능한 TS-to-네이티브 동료입니다. porffor는 이 크기의 워크로드에서 세그폴트했고, Static Hermes는 macOS arm64에 설치되지 않았습니다. kotlinx.serialization과 함께 있는 Kotlin은 v0.5.241–v0.5.242에서 JSON 폴리글롯에 합류했습니다. 모든 행은 진짜이고, 모든 면책 조항은 페이지에 있습니다.
      </p>

      <h2>5. 폴리글롯 컴퓨트 표</h2>
      <p>
        진짜로-접을-수-없는 헤드라인 커널, RUNS=11 중앙값, v0.5.249에서 2026-04-25에 새로고침:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">벤치마크</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>fibonacci</code>에서 Perry는 컴파일된 그룹을 3–15 ms 이내로 따라잡습니다. Java의 HotSpot JIT는 재귀 호출 인라이닝으로 ~11% 더 빠릅니다. <code>loop_data_dependent</code>에서 커널은 두 개의 FP-contract 클러스터로 나뉩니다: ~128 ms의 FMA-contract 그룹(Go 기본값, Apple Clang의 <code>g++ -O3</code> &mdash; 둘 다 <code>sum * a + b</code>를 단일 FMADDD로 융합) 그리고 229–235 ms의 no-contract 그룹(Perry, Rust 기본값, Swift, <code>-XX:+UseFMA</code> 없는 Java, Bun)이 스칼라 FMUL + FADD를 실행합니다. LLVM은 <code>-ffp-contract=fast</code>로 FMA 그룹과 일치합니다. Perry는 그것을 기본값으로 활성화하지 않습니다. <code>nested_loops</code>는 컴퓨트 바운드가 아닌 캐시 바운드입니다. 모두가 8–21 ms에 안착합니다.
      </p>

      <h2>6. Windows 툴체인, 가벼워짐</h2>
      <p>
        Windows 사용자는 더 이상 Visual Studio 설치가 필요하지 않습니다. <strong>v0.5.199</strong>가 <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>을 닫았습니다. <code>perry setup windows</code> + winget LLVM + xwin이 전체 VS BuildTools 트리를 대체합니다. <code>v0.5.201</code>은 <code>find_lld_link</code> / <code>find_perry_windows_sdk</code>의 cfg 게이트를 떨어뜨려 macOS 호스트뿐만 아니라 Windows를 타겟팅하는 모든 플랫폼에서 경로 디스커버리가 작동하도록 했습니다.
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. 런타임 정확성 패스</h2>
      <p>
        이 기간의 주제: V8/JSC와의 조용한 런타임 발산은 수정이 되었거나 컴파일 에러가 되었습니다. 사소하지 않은 것들:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: <code>BigInt.fromTwos</code>/<code>toTwos</code> 2의 보수.</li>
        <li><strong>v0.5.263</strong>: <code>Promise.all</code>/<code>race</code>/<code>any</code> 비-프로미스 타입 판별.</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + ECMAScript 숫자 포매팅(<code>3 → &quot;3&quot;</code>, <code>&quot;3.0&quot;</code>이 아님; <code>-0 → &quot;0&quot;</code>; 등).</li>
        <li><strong>v0.5.280</strong>: <code>(x) | 0</code>에서 <code>NaN</code>/<code>Infinity</code> ToInt32 강제 변환.</li>
        <li><strong>v0.5.284</strong>: Promise 마이크로태스크 FIFO + 던져진 핸들러 전파.</li>
        <li><strong>v0.5.286</strong>: 일반 f64에 대한 <code>JSON.stringify</code>가 테이프 경로 아래에서 세그폴트.</li>
        <li><strong>v0.5.277</strong>: 인코딩이 전달되지 않으면 <code>fs.readFileSync</code>가 Buffer를 반환합니다(Node와 일치).</li>
        <li><strong>v0.5.272</strong>: 연쇄적 크로스 모듈 게터 디스패치가 <code>undefined</code>를 반환했습니다.</li>
      </ul>
      <p>
        이슈 <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a>에 대한 stdlib 후속 작업이 채워졌습니다: AsyncLocalStorage 엔드투엔드(v0.5.261), commander 런타임 + 실제로 <code>.action()</code>을 호출하는 코드젠(v0.5.250), decimal.js 코드(v0.5.259), Redis ioredis 엔드투엔드(v0.5.270), pg + mongo 비동기 팩토리 패턴(v0.5.275), 그리고 EE/LRU/WSS의 동일한 비동기 팩토리 버그(v0.5.252).
      </p>
      <p>
        <code>perry/ui</code> 측에서: 알림 탭 콜백(#97)이 Apple(v0.5.254)과 Android(v0.5.258) 양쪽에 배선됨; 로컬 알림 스케줄 + 취소(#96, v0.5.244); Android에서 FCM 등록 + 수신(v0.5.262).
      </p>

      <h2>8. 마무리</h2>
      <p>
        이번 구간의 패턴은 헤드라인 숫자가 아닙니다. 기존 승리들이 정밀 조사에서 살아남게 만드는 작업입니다. 지속적 할당 워크로드를 잡아내는 세대별 GC, 짧은 문자열 비용 격차를 닫는 SSO, 가장 흔한 워크로드의 &ldquo;수정 없음&rdquo; 구조를 활용하는 JSON 파이프라인, 그리고 best-of-N 대신 중앙값을 측정하고 Perry의 75 ms와 같은 행에 simdjson의 24 ms 파스 천장을 보여주는 벤치마크 페이지. 독자는 격차를 볼 수 있고 &mdash; Perry가 바닥에 비해 어디에 자리하는지를 봅니다.
      </p>
      <p>
        시도해 보세요:
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        소스: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; 벤치마크: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}&mdash; 체인지로그: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
