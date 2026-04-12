export default function Content() {
  return (
    <>
      <p>
        Perry의 Cranelift에서 LLVM으로의 백엔드 마이그레이션이 완료되었습니다. v0.5.12 기준으로 LLVM이 유일한 코드 생성 백엔드이며, Perry는 이제 15개 벤치마크 중 14개에서 Node.js를 능가합니다. 그 차이는 1.06배에서 24.6배에 이릅니다.
      </p>
      <p>
        여기까지 오는 길은 순탄하지 않았습니다. v0.5.0에서의 초기 전환은 여러 벤치마크를 이전 Cranelift 버전보다 <strong>70배 느리게</strong> 만들었습니다. 이 글은 무슨 일이 있었는지, 그럼에도 왜 전환했는지, 무엇이 깨졌는지, 무엇이 고쳤는지, 그리고 지금 수치가 어떤지에 대한 상세한 이야기입니다.
      </p>
      <p>
        컴파일러를 만들고 있거나, codegen 백엔드를 평가하고 있거나, 단순히 &ldquo;LLVM으로 전환&rdquo;이 왜 말처럼 간단하지 않은지 궁금하다면, 이 글은 당신을 위한 것입니다.
      </p>

      <h2>파트 1: 애초에 왜 전환하는가?</h2>
      <p>
        Perry는 TypeScript를 네이티브 머신 코드로 직접 컴파일합니다. Node 없음, V8 없음, Electron 없음, WebView 없음. &ldquo;TypeScript를 작성하고, 네이티브 바이너리를 배포한다&rdquo;는 가치 제안은, 그 바이너리가 실제로 빠르지 않으면 무너집니다.
      </p>
      <p>
        Perry의 초기 마이너 버전 동안 codegen 백엔드는 <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>였습니다. Cranelift는 뛰어난 도구입니다. wasmtime의 codegen을 담당하고, SpiderMonkey의 베이스라인 JIT에도 사용되며, 빠르고 예측 가능한 컴파일과 깔끔한 임베딩이 필요할 때 최적의 선택입니다. 새로운 언어를 부트스트랩하는 프로젝트에게 올바른 출발점이었습니다.
      </p>
      <p>
        그러나 두 가지 이유가 결국 우리를 Cranelift에서 떠나게 만들었습니다.
      </p>

      <h3>1. 옵티마이저의 한계</h3>
      <p>
        Cranelift는 의도적으로 빠른 단일 티어 최적화 컴파일러입니다. 그 목표는 &ldquo;괜찮은 코드를 빠르게 생성하는 것&rdquo;이지, &ldquo;무한한 시간을 들여 최상의 코드를 생성하는 것&rdquo;이 아닙니다. JIT에게는 올바른 트레이드오프입니다. 하지만 네이티브 성능을 최대 판매 포인트로 삼는 AOT 컴파일러에게는 잘못된 트레이드오프입니다.
      </p>
      <p>
        LLVM에는 20년 이상의 개발이 투입되었습니다. 루프 벡터화, LICM, GVN, SCCP, 명령어 결합, 인라인 휴리스틱, fast-math 재결합, 앨리어스 분석 등. 더 작은 프로젝트가 따라잡을 수 있는 현실적인 세계는 없습니다. Perry가 &ldquo;Node보다 빠르다&rdquo;고 주장하려면 이 기계가 필요합니다.
      </p>

      <h3>2. arm64_32 문제</h3>
      <p>
        직접적인 계기는 Apple Watch였습니다. <code>arm64_32</code>는 Apple이 Series 4 이후에 도입한 ABI로, 64비트 명령어와 32비트 포인터를 가집니다. Cranelift는 이를 지원하지 않았고, 지원될 현실적인 가능성도 없었습니다. Perry가 &ldquo;하나의 코드베이스로 9개 플랫폼&rdquo;을 제대로 주장하려면, watchOS가 빠져서는 안 됩니다. LLVM은 <code>arm64_32</code>를 기본 지원합니다.
      </p>
      <p>
        <em>일부</em> 타겟에 LLVM이 필요하다는 것을 받아들인 순간, 두 개의 백엔드를 유지하는 것은 지속 불가능해졌습니다. 두 개의 백엔드는 두 세트의 버그, 두 세트의 최적화 패스, 두 개의 테스트 매트릭스, 두 개의 성능 베이스라인을 의미합니다. 솔직한 답은 하나를 선택하는 것이었습니다.
      </p>
      <p>LLVM을 선택했습니다.</p>

      <h2>파트 2: Cranelift에 대한 한마디</h2>
      <p>
        더 진행하기 전에, 이 글은 Cranelift를 비판하는 것이 아닙니다. Cranelift는 훌륭한 엔지니어링의 결과물이며, JIT, 샌드박스 런타임, 또는 컴파일 레이턴시가 피크 처리량보다 중요한 무엇이든 만들고 있다면, 후보 목록의 상위에 둬야 합니다. wasmtime이 이를 채택한 데는 이유가 있습니다. Bytecode Alliance는 모범적인 작업을 하고 있습니다.
      </p>
      <p>
        Perry의 요구사항이 다를 뿐입니다. 우리는 AOT로 컴파일하고, 바이너리를 한 번 배포하며, 사용자는 그것을 수백만 번 실행합니다. 이 비대칭성 -- 드물게 컴파일하고, 항상 실행 -- 이 바로 LLVM의 무거운 옵티마이저가 제 값을 하는 영역입니다. 다른 일에 다른 도구입니다.
      </p>

      <h2>파트 3: 전환의 재앙</h2>
      <p>
        v0.5.0은 LLVM을 유일한 백엔드로 삼은 첫 번째 릴리스였습니다. 컴파일 시간은 약간 증가하고 런타임 성능은 의미 있게 개선될 것으로 예상했습니다. 후자에 대해서는 정반대의 결과를 얻었습니다.
      </p>
      <p>당시에는 공개하고 싶지 않았던 표가 이것입니다:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">68x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">64x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">3x slower</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">2.8x faster</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">1.8x slower</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">2.3x slower</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        일부 워크로드는 빨라졌습니다. 대부분은 극적으로 나빠졌습니다. <code>method_calls</code>는 일반적인 TypeScript 클래스 사용을 나타내기 때문에 가장 중요한 벤치마크 중 하나인데, 두 릴리스 전에 배포한 것보다 거의 70배 나빠졌습니다.
      </p>

      <h3>실제로 무엇이 잘못되었는가</h3>
      <p>
        Perry는 값 표현에 <strong>NaN-boxing</strong>을 사용합니다. 모든 TypeScript 값은 64비트 워드입니다. f64 숫자는 직접 저장되고, 나머지(객체, 문자열, 불리언, undefined, null)는 IEEE 754 quiet NaN의 미사용 비트에 인코딩됩니다.
      </p>
      <p>
        장점: 숫자는 비용이 제로입니다. 박싱 없음, 태깅 없음, 산술을 위한 할당 없음.
      </p>
      <p>
        단점: 숫자가 아닌 모든 값에 대한 연산은 언패킹, 연산, 리패킹을 위한 비트 조작이 필요합니다. 이런 시퀀스가 codegen의 인라인 IR로 존재하면, 옵티마이저가 이를 융합하고 단순화할 수 있습니다. 하지만 <strong>런타임 헬퍼 함수 호출</strong>로 존재하면, 옵티마이저는 불투명한 호출로 보고 포기합니다.
      </p>
      <p>
        Cranelift 백엔드는 핫 연산을 위한 인라인 로워링을 다수 보유하고 있었습니다. 프로퍼티 로드, 메서드 디스패치, 객체 할당, f64 태그 값의 정수 연산 등입니다. LLVM 전환 시에는 먼저 <em>올바른</em> 코드를 출력하는 것을 우선시하여, 이들 거의 전부를 <code>perry-runtime</code>의 런타임 헬퍼를 통해 라우팅했습니다. 각 헬퍼는 LLVM IR에서 <code>call</code> 명령어가 됩니다.
      </p>
      <p>
        LLVM은 우수하지만, 본문을 본 적 없는 함수를 인라인할 수는 없습니다. <code>perry-runtime</code>은 별도로 컴파일되어 마지막에 링크되므로, 옵티마이저 관점에서 모든 헬퍼 호출은 블랙박스입니다. 결과적으로, Cranelift 백엔드가 약 5개의 인라인 산술 명령어로 컴파일하던 핫 루프가, 함수 호출 -- 레지스터 저장, 스택 프레임 설정 등 -- 로 컴파일되어 수백만 번 반복되었습니다.
      </p>
      <p>
        70배의 원인은 바로 거기에 있습니다. 나쁜 codegen이 아니라 나쁜 <strong>인라이닝 경계</strong>입니다.
      </p>

      <h2>파트 4: 수정</h2>
      <p>
        Cranelift 수치를 회복하고 넘어서기 위한 작업은 대략 여섯 가지 범주로 나뉩니다. 어느 것도 특별하지 않습니다. 대부분은 교과서적인 컴파일러 최적화를 올바른 위치에 적용한 것입니다.
      </p>

      <h3>1. 객체 할당을 위한 인라인 범프 할당자</h3>
      <p>
        <code>object_create</code>는 <code>method_calls</code> 다음으로 가장 큰 성능 후퇴였습니다. 기존 경로는 모든 <code>new Point()</code>에 대해 <code>js_object_alloc_class_with_keys</code>를 호출했습니다. 함수 호출, 스레드 로컬 아레나 접근, 셰이프 캐시 조회, GC 헤더와 객체 헤더 쓰기가 포함됩니다.
      </p>
      <p>
        수정: 범프 할당을 LLVM IR에서 <strong>인라인</strong>으로 출력합니다. 객체를 할당하는 각 함수는 스레드 로컬 <code>InlineArenaState</code> 구조체에 대한 캐시된 포인터를 받습니다. 할당은 다음과 같이 됩니다:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        패스트 패스는 LLVM이 보고, 스케줄링하고, 루프 밖으로 호이스트할 수 있는 약 13개의 인라인 IR 명령어입니다. <code>object_create</code>는 318ms에서 9ms로 개선되었습니다.
      </p>

      <h3>2. i32 루프 카운터</h3>
      <p>
        NaN-boxing으로 인해 모든 TypeScript 숫자는 f64입니다. 루프 카운터도 마찬가지입니다. f64 유도 변수를 가진 <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> 루프는 재앙입니다. f64 증가, f64 비교, 배열 인덱싱 시마다 f64에서 i64로의 변환이 발생합니다.
      </p>
      <p>
        codegen은 유도 변수가 증명 가능하게 정수값인 for 루프를 감지하고 <strong>병렬 i32 스택 슬롯</strong>을 할당합니다. 루프 조건이 <code>fcmp</code>에서 <code>icmp slt i32</code>로 전환되어 f64 카운터가 완전히 제거됩니다.
      </p>
      <p>
        이로 인해 <code>array_write</code>가 11ms에서 3ms로, <code>nested_loops</code>가 18ms에서 9ms로, <code>array_read</code>가 11ms에서 4ms로 개선되었습니다.
      </p>

      <h3>3. fast-math 플래그</h3>
      <p>
        모든 f64 산술 명령어에 <code>reassoc contract</code> 플래그를 부착합니다. <code>reassoc</code>는 LLVM이 직렬 누적기 체인을 병렬로 분리할 수 있게 하고, <code>contract</code>는 곱셈-덧셈 융합을 허용합니다. Perry는 NaN 비트를 값 태그로 사용하므로 <code>nnan</code>과 <code>ninf</code>는 끕니다.
      </p>
      <p>
        이 플래그들로 LLVM의 루프 벡터라이저가 <code>math_intensive</code>에서 작동하여, 131ms에서 14ms로 떨어졌고, Node보다 3.5배 빨라졌습니다.
      </p>

      <h3>4. 정수 나머지 연산 패스트 패스</h3>
      <p>
        JavaScript에서 f64의 <code>%</code>는 <code>fmod</code>이며, ARM에서는 libm 호출입니다. 하지만 정수값 f64 피연산자에 대해서는 <code>fptosi → srem → sitofp</code>로 libm 왕복을 완전히 건너뛸 수 있습니다. codegen은 정적 분석으로 정수값 피연산자를 감지합니다. 런타임 검사가 필요 없습니다.
      </p>
      <p>
        이것이 <code>factorial</code>이 1,553ms에서 24ms로 개선된 이유이며, Node의 591ms에서 24ms로 — <strong>Node.js보다 24.6배 빠릅니다.</strong>
      </p>

      <h3>5. 중첩 루프의 LICM</h3>
      <p>
        LLVM은 loop-invariant code motion을 기본적으로 수행하지만, NaN-boxing이 구조를 숨깁니다. <code>arr.length</code>는 NaN-boxed 포인터를 통한 태그 체크가 포함된 로드로 변환되어, 명백하게 루프 불변이 아닙니다.
      </p>
      <p>
        codegen은 <code>{'for (...; i < arr.length; ...)'}</code> 패턴을 감지하고 루프 전에 길이를 스택 슬롯에 미리 로드합니다. 정적 워커가 루프 본문에서 배열의 길이가 변경될 수 없음을 검증합니다. 카운터가 이 호이스트된 길이로 제한될 때, IndexGet/IndexSet은 경계 검사를 완전히 건너뜁니다.
      </p>

      <h3>6. 셰이프 캐시된 객체</h3>
      <p>
        codegen이 객체의 클래스를 알고 있으면, 컴파일 시점에 필드 오프셋을 확인하고 <strong>직접 인덱스 로드</strong>를 출력합니다. 런타임 디스패치가 필요 없습니다. 메서드 디스패치의 경우, <code>obj.method(args)</code>는 직접적인 <code>call @perry_method_Class_name(this, args)</code>가 됩니다. vtable 없음, 인라인 캐시 없음, 해시 조회 없음.
      </p>
      <p>
        LLVM 전환으로 이것이 범용 슬로우 패스로 후퇴했었습니다. 정적 디스패치를 복원하면서 <code>method_calls</code>가 1,084ms에서 1ms로 회복되었습니다. <strong>Node.js보다 11배 빠릅니다.</strong>
      </p>

      <h2>파트 5: 현재 수치</h2>
      <p>3회 실행 중앙값, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">tied</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        15전 14승. 유일한 패배는 <code>object_create</code>이며, V8의 할당자가 정말로 우수하고 그 차이는 12% 이내입니다.
      </p>

      <h2>파트 6: 컴파일 시간 문제</h2>
      <p>
        사람들이 LLVM 대신 Cranelift를 선택하는 가장 큰 이유는 컴파일 속도입니다. 이에 대해 이야기해 봅시다.
      </p>
      <p>
        LLVM은 Perry의 파일당 컴파일 시간을 <strong>20-50ms</strong>, 대략 <strong>8-19%</strong> 증가시켰습니다. 5배가 아닙니다. 2배도 아닙니다. 한 자릿수에서 낮은 두 자릿수 퍼센트입니다.
      </p>
      <p>
        이유는 codegen이 Perry 파이프라인의 병목이 아니기 때문입니다. 일반적인 파일의 내역은 다음과 같습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>SWC 파싱: ~30%</li>
        <li>HIR 로워링 (AST → IR, 타입 추론): ~25%</li>
        <li>IR 변환 패스 (클로저 변환, async lowering, 인라이닝): ~15%</li>
        <li><strong>Codegen (LLVM IR 텍스트 출력 + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>링킹 (<code>cc</code> + 런타임 라이브러리): ~10%</li>
      </ul>
      <p>
        Codegen은 다섯 조각 중 하나입니다. 그 조각을 두 배로 늘려도 전체는 5-10%만 증가합니다. 사용자가 <code>perry compile</code>을 한 번 입력하고 바이너리를 영원히 실행하는 AOT 컴파일러를 만들고 있다면, 계산은 명확합니다. 컴파일 시간에 25ms를 더 쓰고, 매 실행마다 최대 24배의 속도 향상을 얻는 것입니다.
      </p>

      <h2>파트 7: 다시 한다면 어떻게 할 것인가</h2>
      <p>
        오늘 Perry를 시작하면서 바로 LLVM으로 갈 수 있다 해도, 그렇게 하지 않았을 것입니다. Cranelift 단계는 진정으로 가치 있었습니다. LLVM의 복잡성 비용 없이 프론트엔드를 반복할 수 있게 해주었고, 비교 대상이 되는 작동하는 베이스라인을 제공했으며, HIR을 백엔드 간에 이식 가능할 만큼 깔끔하게 유지하도록 강제했습니다.
      </p>
      <p>
        다시 한다면 전환 자체를 다르게 했을 것입니다. v0.5.0에서 대부분의 연산을 런타임 헬퍼 호출을 통해 처리하고 나중에 인라인할 계획이었습니다. 그것은 잘못된 판단이었습니다. 올바른 순서는 먼저 핫 패스를 식별하고, 전환 전에 인라인으로 로워링하고, LLVM 백엔드가 최소한 동등한 수준이 된 후에야 릴리스하는 것이었습니다.
      </p>
      <p>
        교훈은 지루한 것입니다. 최적화 경계는 옵티마이저의 품질보다 중요합니다. LLVM은 놀라운 소프트웨어이지만, 볼 수 없는 코드에 대해서는 도울 수 없습니다. codegen이 모든 것을 불투명한 런타임 호출을 통해 라우팅하면, 소스 프로그램과 존재하는 모든 최적화 패스 사이에 벽을 세운 것입니다.
      </p>

      <h2>마무리</h2>
      <p>
        Perry는 이제 LLVM 전용이며, 15개 벤치마크 중 14개에서 Node.js보다 빠르고, 출시를 계속하고 있습니다. 마이그레이션은 계획보다 오래 걸렸고, 중간에 예상보다 더 아팠으며, 돌이켜 보면 의심할 여지 없이 올바른 결정이었습니다. Cranelift가 v0.5까지 이끌어 주었고, LLVM이 나머지 길을 함께합니다.
      </p>
      <p>Perry를 사용해 보고 싶다면:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        소스: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}-- 문서: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}-- 벤치마크를 직접 실행: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        질문이 있거나, 버그를 발견하거나, codegen 백엔드에 대해 논의하고 싶다면, GitHub 이슈가 열려 있습니다. 전부 읽고 있습니다.
      </p>
      <p>-- Ralph</p>
    </>
  );
}
