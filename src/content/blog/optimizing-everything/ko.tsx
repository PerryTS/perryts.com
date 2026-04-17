export default function Content() {
  return (
    <>
      <p>
        지난 블로그 글은 Perry v0.5.12와 함께 공개되었습니다. 오늘은 v0.5.80입니다. <strong>7일 동안 68개의 패치 릴리스</strong>를 쏟아냈으며, 거의 전적으로 하나의 목표에 집중했습니다. 남아 있는 모든 느린 경로를 빠른 경로로 바꾸는 것입니다.
      </p>
      <p>
        v0.5.0의 LLVM 전환은 v0.5.12에 이르러 Cranelift 수준으로 회복되었습니다. 그것은 한 이야기의 끝이자 또 다른 이야기의 시작이었습니다. 이제 LLVM은 모든 것을 봅니다. 질문은 &ldquo;이게 왜 느린가?&rdquo;에서 &ldquo;왜 아직 빠르지 않은가?&rdquo;로 바뀌었고 &mdash; 이것이 훨씬 더 다루기 쉬운 질문입니다.
      </p>
      <p>
        이 글은 지난 한 주의 여정을 다룹니다. JSON이 547배 빨라졌습니다. mimalloc이 전역 할당자가 되었습니다. 프로퍼티 접근에는 monomorphic inline cache가 생겼습니다. 버퍼에는 <code>noalias</code> 메타데이터가 붙은 타입드 포인터 슬롯이 생겼습니다. Fastify와 WebSocket 서버가 1분 만에 크래시하는 일이 사라졌습니다. 그리고 벤치마크가 다시 움직였습니다.
      </p>

      <h2>1. JSON: 547배 격차 좁히기</h2>
      <p>
        v0.5.29 시점에 Perry의 JSON.parse는 20레코드 배열에서 <strong>Node보다 547배 느렸습니다</strong>. v0.5.46에서는 1.3배로 좁혀졌습니다. 이 수치는 이번 주의 단일 최대 변화량이며, 짚고 넘어갈 가치가 있습니다. 이 글의 다른 모든 최적화가 같은 주제의 변주이기 때문입니다. 할 필요 없는 일은 하지 마라.
      </p>
      <p>
        원래 파서는 프로퍼티마다 Vec 하나, 객체마다 키 Vec 하나, 그리고 키 캐시를 위한 RefCell로 보호되는 스레드 로컬 하나를 할당했습니다. 모든 문자열을 복사했습니다. 모든 필드 이름을 다시 해시했습니다. 20개 레코드 모두가 정확히 같은 순서로 정확히 같은 필드를 가지고 있어도, 모든 레코드마다 완전히 새로운 객체 셰이프를 만들었습니다. Node의 파서는 패턴을 인식해서 모든 레코드가 단일 셰이프를 공유하도록 처리합니다. Perry는 그러지 않았습니다.
      </p>
      <p>수정은 네 단계로 진행되었습니다:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>스레드 로컬 <code>PARSE_KEY_CACHE</code>를 통한 키 인터닝</strong> (v0.5.45). 첫 레코드는 N개의 키 문자열을 할당하지만, 2번째부터 20번째 레코드는 0개를 할당합니다. 반복되는 키는 같은 포인터로 해석되므로, strcmp 없이 셰이프 캐시 조회 키로 사용할 수 있습니다.</li>
        <li><strong>전환 캐시를 통한 셰이프 공유</strong> (v0.5.45). <code>js_object_set_field_by_name</code>으로 만들어진 객체들은 같은 전환 그래프를 따라갑니다. 스키마가 반복되면 <code>keys_array</code> 포인터가 공유되며, 이것이 polymorphic inline cache가 히트하기 위해 필요한 조건입니다.</li>
        <li><strong>제로 카피 문자열 파싱 + 증분 객체 빌드</strong> (v0.5.46). <code>parse_string_bytes</code>는 이제 백슬래시 이스케이프가 없을 때 <code>ParsedStr::Borrowed(&amp;[u8])</code>를 반환합니다 &mdash; 모든 키와 대부분의 값에서 흔한 경우입니다. <code>parse_object</code>는 먼저 Vec으로 수집하지 않고 필드를 직접 씁니다.</li>
        <li><strong>파싱 중 GC 억제</strong> (v0.5.60, closes #59). 큰 배열을 파싱하면 타이트한 루프에서 수천 개의 작은 객체를 할당합니다. 그때마다 GC 임계값 체크가 건드려졌습니다. &ldquo;파싱 진행 중&rdquo; 플래그를 세우면 파싱이 끝날 때까지 수집이 미뤄집니다 &mdash; 실질적인 힙 크기는 같으면서 부기(bookkeeping) 분기가 훨씬 줄어듭니다.</li>
      </ol>
      <p>
        다음은 stringify입니다. 동질적인 배열에서의 JSON.stringify &mdash; 수백만 번 같은 셰이프 &mdash; 는 객체마다 전체 프로퍼티 순회를 하고 있었는데, 셰이프가 안정된 배열에서는 이것이 순전한 낭비입니다. 다섯 단계 수정으로 그 격차의 대부분도 좁혀졌습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: 숫자에 대한 itoa / ryu 패스트 패스, HashSet 대신 깊이 기반 순환 참조 체크.</li>
        <li>v0.5.63: <code>toJSON</code> 가드 + 영속적 키 캐시 + 인라인 디스패치 (누적된 호출당 세 가지 비용).</li>
        <li>v0.5.65: 동질 셰이프 stringify 템플릿 + ASCII 이스케이프 패스트 패스. 모든 요소가 같은 셰이프일 때, 키/콜론/콤마 비계(scaffolding)가 한 번만 미리 계산됩니다.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: 호출당 셰이프 템플릿 캐시, 파싱 후 잔여 GC 격차 해소, 남은 고정 호출당 오버헤드 제거.</li>
        <li>v0.5.79: 작은 값 경로. 숫자, 불리언, 짧은 문자열은 객체 기계 장치를 전혀 설정하지 않는 직접 경로를 거칩니다.</li>
      </ul>
      <p>
        누적 결과: 주 초에 <strong>Node보다 547배 느렸던</strong> JSON 파이프라인이, 현실적인 워크로드 기준으로 이제 대략 <strong>파싱에서 1.3배 차이, stringify에서는 경쟁력 있는</strong> 수준이 되었습니다.
      </p>

      <h2>2. 할당자 이야기</h2>
      <p>
        Perry는 할당을 많이 합니다. 모든 객체 리터럴, 모든 배열 리터럴, 모든 문자열 연결, 모든 클로저마다 말입니다. 할당자는 핫 패스이며, v0.5의 대부분 동안은 Rust의 기본 시스템 할당자에 단기 수명 값을 위한 스레드 로컬 아레나가 더해진 형태였습니다.
      </p>
      <p>
        v0.5.67은 전역 할당자를 <strong>mimalloc</strong>으로 교체했습니다. 이것은 Cargo.toml의 한 줄 변경으로, 작은 할당을 많이 하는 워크로드 &mdash; 즉 모든 TypeScript 프로그램 &mdash; 에서 즉시 투자 대비 보상이 있습니다. v0.5.66은 그 앞에 있었는데, 모든 <code>gc_malloc</code> 스레드 로컬 상태를 호출당 단일 TLS 접근으로 통합해서, mimalloc으로 들어가는 경로가 최대한 저렴하도록 만들었습니다.
      </p>
      <p>
        v0.5.68은 이를 더 밀고 나가 <strong>아레나 할당 문자열</strong>을 도입했습니다. 단기 수명 문자열(중간 연결 결과, <code>split()</code> 조각, 파서 스크래치)은 전역 할당자를 아예 건너뛰고, 자연스러운 경계에서 리셋되는 스레드별 범프 아레나에 안착합니다. JSON 파싱에서는 이것 하나만으로도 두 자릿수 퍼센트의 승리였습니다.
      </p>
      <p>
        그리고 아예 할당하지 않는 두 가지 최적화:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>탈출(escape)하지 않는 객체의 스칼라 치환</strong> (v0.5.17, 그다음 v0.5.76의 객체 리터럴). 객체가 자신을 감싼 함수를 벗어나지 않는다면, 존재할 필요가 없습니다. 그 필드들은 일반 로컬이 됩니다. 불투명한 할당자 호출 뒤에 객체를 숨기는 것을 멈추기만 하면, LLVM은 이를 기본으로 처리합니다.</li>
        <li><strong>탈출하지 않는 배열의 스칼라 치환</strong> (v0.5.73). 같은 아이디어 &mdash; 배열이 탈출하지 않으면, 요소들은 SSA 값이 되고 전체 할당이 사라집니다.</li>
      </ul>
      <p>
        특히 배열 리터럴 경로에서, v0.5.69는 <strong>정확 크기 패스트 패스</strong>를 추가했고(크기가 컴파일 시점에 알려진 경우 용량 확장 기계 장치를 건너뜀), v0.5.74는 작은 배열 리터럴에 대해 범프 할당자 IR을 인라인해서 LLVM이 할당을 보고, 접고(fold), 호이스트하거나, 제거할 수 있게 했습니다. 배열 중심 벤치마크가 또 한 걸음 나아갔습니다.
      </p>
      <p>
        마무리로, v0.5.25는 더 조용한 버그 하나를 고쳤습니다. <code>gc_malloc</code>이 자체 경로에서 수집을 트리거하지 않아서, malloc 중심 워크로드는 무엇이든 체크하기 전에 힙을 무한정 키울 수 있었습니다. v0.5.61은 임계값에 적응형 스텝 사이징을 추가했는데, 이것이 실제로 원하는 것입니다. 힙이 작을 때는 저렴하게 체크하고, 클 때는 덜 자주 체크하는 것 말입니다.
      </p>

      <h2>3. 프로퍼티 접근에 진짜 inline cache가 생겼다</h2>
      <p>
        모든 현대 JavaScript 엔진은 프로퍼티 접근에 polymorphic inline cache(PIC)를 가지고 있습니다. Perry v0.5 시리즈의 대부분 기간 동안, PropertyGet은 스레드 로컬 해시를 사용한 셰이프 테이블 조회를 거쳤습니다. 콜드 코드에는 괜찮습니다. 하지만 어떤 호출 지점에서 프로퍼티 읽기의 95%가 같은 셰이프를 보는 경우 &mdash; 거의 항상 그렇습니다 &mdash; 에는 그렇지 않습니다.
      </p>
      <p>
        v0.5.44에서 <code>PropertyGet</code>을 위한 <strong>monomorphic inline cache</strong>가 도입되었습니다. 각 PropertyGet 지점은 호출 지점당 캐시 엔트리(예상 셰이프 포인터와 필드 오프셋)를 얻습니다. 히트 경로는 단일 비교와 인덱스 로드입니다. 미스 경로는 캐시를 업데이트하는 슬로우 헬퍼로 떨어집니다.
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51은 동적 프로퍼티 쓰기를 위한 <strong>콘텐츠 해시 셰이프 전환 캐시</strong>를 추가했습니다. 같은 순서로 같은 필드가 늘어나는 두 객체는 같은 전환으로 해시되므로, 결국 같은 셰이프를 공유하게 됩니다 &mdash; 이는 PIC의 읽기 쪽이 실제로 히트한다는 뜻입니다.
      </p>
      <p>
        v0.5.55는 전환 캐시에서 마지막 TLS 접근을 떼어냈습니다. v0.5.46은 &gt;8개 필드를 가진 객체가 인라인 슬롯을 넘어 초기화되지 않은 메모리까지 읽던 PIC 미스 핸들러 버그를 수정했습니다(closes #55). v0.5.78은 PropertyGet의 PIC가 원시 숫자 같은 비포인터 리시버로 인덱싱하는 것을 막는 가드를 추가했는데 &mdash; 과도하게 낙관적인 타입 정제에서 발생할 수 있었고, IC의 마지막 안정성 이슈 중 하나였습니다.
      </p>
      <p>
        순효과: 프로퍼티 중심 코드 &mdash; 실제로는 대부분의 TypeScript &mdash; 는 일주일 전보다 대략 2~3배 빨라졌습니다. IC 하나만으로도 그렇습니다.
      </p>

      <h2>4. 정수, 비트 연산, 그리고 <code>| 0</code> 패턴</h2>
      <p>
        NaN-boxing은 모든 숫자를 f64로 만듭니다. TypeScript 프로그래머는 정수 의미론을 강제하기 위해 <code>x | 0</code>을 씁니다. V8은 15년 동안 이것을 싸게 만드는 작업을 해 왔습니다. Perry는 이번 주에 따라잡았습니다.
      </p>
      <p>변경사항 스택은 순서대로:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>(int / const) | 0</code>에 대한 <code>sdiv</code>. LLVM이 <code>smulh + asr</code>로 접으며, <code>fdiv</code>의 ~10사이클에 비해 ~2사이클입니다.</li>
        <li><strong>v0.5.48</strong>: Uint8ArrayGet 경계에 <code>@llvm.assume</code>. 경계 검사 분기+phi 다이아몬드를 벡터라이저가 추론할 수 있는 단일 베이식 블록으로 대체합니다.</li>
        <li><strong>v0.5.49</strong>: NaN/Infinity와의 비트 연산이 ToInt32 스펙에 따라 0을 생성하도록 수정. 정확성 우선.</li>
        <li><strong>v0.5.50</strong>: 값이 유한함이 알려진 경우 5개 명령어 NaN/Inf 가드를 건너뛰는 <code>toint32_fast</code>. 여기에 작은 헬퍼에 <code>alwaysinline</code>과 클램프 감지 추가.</li>
        <li><strong>v0.5.52</strong>: <code>smin</code>/<code>smax</code> 인트린식으로 클램프 함수를 직접 타겟팅. 클램프는 증가 다음으로 가장 흔한 정수 패턴입니다.</li>
        <li><strong>v0.5.53</strong>: 유한함이 알려진 값에 대한 <code>x | 0</code>과 <code>x &gt;&gt;&gt; 0</code>은 노옵(noop)이 됩니다 &mdash; <code>fptosi + sitofp</code>만, 가드는 전혀 없습니다.</li>
        <li><strong>v0.5.56</strong>: i32 네이티브 비트 연산; Uint8ArrayGet/Set에서 i32 인덱스와 값.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code>이 폴리필 경로 대신 네이티브 i32 곱셈으로 낮춰집니다. 폴리필 감지는 사용자 작성 <code>Math.imul</code> 심(shim)을 인식해서 교체합니다.</li>
        <li><strong>v0.5.59</strong>: pure-function init 인라이닝 + 정수 로컬 시딩. 함수 로컬 정수 분석이, 콜리(callee)가 작고 순수할 때 호출 경계 너머를 볼 수 있게 됩니다.</li>
        <li><strong>v0.5.37~v0.5.40</strong>: 누적기 패턴 정수 산술 패스트 패스. 고전적인 <code>for (...) acc += f(i)</code> 루프가 타입이 허용하는 한 끝까지 i32에 머뭅니다.</li>
      </ul>
      <p>
        v0.5.41은 미묘한 것입니다. codegen이 모듈 레벨 <code>const K: number[][] = [[...], ...]</code>를 보면, 전체를 <code>.rodata</code>의 플랫 <code>[N x i32]</code> 상수로 낮춥니다. <code>K[y][x]</code>는 단일 <code>getelementptr + load i32</code>가 됩니다. v0.5.43의 정수 분석 브리지와 결합하면, 이것이 <code>image_conv</code>(4K RGB 프레임에 대한 5×5 가우시안 블러)에 <strong>단일 릴리스에서 3배 속도 향상</strong>을 준 원인입니다.
      </p>

      <h2>5. 버퍼와 Uint8Array</h2>
      <p>
        바이너리 워크로드 &mdash; 암호화, 이미지 처리, 파싱, 네트워킹 &mdash; 는 Buffer와 Uint8Array에 삽니다. v0.5.64는 이들에게 <strong>타입드 포인터 슬롯과 <code>noalias</code> 메타데이터</strong>를 주었습니다. Buffer가 예전에는 <code>alloca double</code>의 NaN-boxed double이었다면, 이제는 <code>alloca i64</code>의 원시 <code>i64</code> 포인터이며, 옵티마이저에게 &ldquo;이 포인터는 스코프 내 다른 포인터와 앨리어싱하지 않습니다&rdquo;라고 알려주는 LLVM 어노테이션이 붙어 있습니다. 이로써 옵티마이저가 원래는 거부했을 로드/스토어 재배치, 벡터화, 레지스터 할당이 풀립니다.
      </p>
      <p>
        v0.5.80은 여기서 마지막 정확성 이슈를 마무리했습니다. 모듈 전역 버퍼 <code>alias-scope</code> 카운터가 함수마다 리셋되고 있어서, 드문 경우에 LLVM이 스코프 ID를 공유하면 안 되는 스코프들 사이에서 추론할 수 있었습니다. 이제 카운터는 모듈 전역이며 <code>noalias</code> 논리는 빈틈없습니다.
      </p>
      <p>
        v0.5.53은 <code>Uint8ArraySet</code>을 브랜치리스로 만들었습니다 &mdash; 경계를 벗어나면 0을 쓰던 if/else 대신 마스킹된 스토어. v0.5.54는 긴 패턴을 위한 <strong>Two-Way indexOf</strong>와 아레나 할당 <code>split</code>을 추가했고, 이 둘이 함께 문자열 중심 Buffer 파싱의 격차 대부분을 좁혔습니다.
      </p>

      <h2>6. 문자열: ASCII가 패스트 패스</h2>
      <p>
        JavaScript 문자열은 UTF-16이지만, 실제 세계의 대부분 문자열(키, 식별자, HTTP 헤더, JSON 비계)은 ASCII입니다. v0.5.71은 <strong>ASCII 문자열에 대한 O(1) <code>charCodeAt</code>과 <code>codePointAt</code></strong>을 추가했습니다 &mdash; UTF-16 스캔 없이, 그냥 바이트 로드. v0.5.20은 이미 ASCII에서 <code>indexOf</code>, <code>slice</code>, <code>charAt</code>이 UTF-16 스캔을 건너뛰도록 했습니다.
      </p>
      <p>
        같은 릴리스 안의 정확성 노트 하나: <code>String.length</code>가 이제 바이트 수가 아니라 UTF-16 코드 유닛을 반환합니다(ECMAScript 스펙). <code>&quot;caf&eacute;&quot;.length</code>가 4 대신 5를 반환하던 숨은 버그였습니다.
      </p>

      <h2>7. 서버가 이제 실제로 살아 있다</h2>
      <p>
        이번 주의 가장 화려하지 않은 작업은 사용자 가시성이 가장 큰 것이기도 했습니다: 오래 실행되는 Node 스타일 서버 &mdash; Fastify, ws, http, net &mdash; 가 몇 분 후에 크래시하지 않도록 만드는 것.
      </p>
      <p>
        크래시는 모두 같은 근본 원인을 공유했습니다. GC가 리스너 클로저를 모르고 있었습니다. <code>wss.on(&apos;message&apos;, handler)</code>를 작성하면, 클로저는 변수를 캡처하고, 이 변수들은 GC 할당된 셀 안에서 필드로 살아갑니다. GC 루트 스캐너가 그 셀을 방문할 줄 모르면, 캡처는 회수되고 다음 메시지 이벤트는 해제된 메모리를 역참조합니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: <code>net.Socket</code> 이벤트 리스너 클로저 루트 스캔(closes #35).</li>
        <li><strong>v0.5.27</strong>: <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>까지 확장.</li>
        <li><strong>v0.5.28</strong>: 모듈 레벨 전역을 GC 루트로 등록(closes #36). 한 층 위의 수명 버그.</li>
        <li><strong>v0.5.21</strong>: Fastify/WebSocket 요청 핸들러 내부 <code>gc()</code> 안전성 &mdash; 명시적 GC 호출이 요청 핸들러가 아레나 포인터를 붙들고 있는 동안 실행되고 있었습니다(closes #31).</li>
      </ul>
      <p>
        GC 작업과 병행하여, v0.5.20은 <strong>메인 이벤트 루프</strong>를 출시했습니다 &mdash; 플레이스홀더가 아닌 진짜 하나를 &mdash; 이로써 마지막 동기 호출이 리턴한 후 종료되는 대신 WebSocket과 타이머 기반 서버가 살아 있도록 유지됩니다(refs #28). 이것이 Perry를 프로덕션 HTTP 서버로 실행하려는 누구에게든 가장 영향력 큰 단일 수정이었습니다. 이제 Fastify가 살아 있습니다. WebSocket 서버가 살아 있습니다.
      </p>
      <p>
        v0.5.19는 JSValue FFI 인자/반환값의 SysV AMD64 ABI 불일치를 수정했습니다 &mdash; 네이티브 FFI 호출이 조용히 인자를 손상시킬 수 있던 Linux 이슈. v0.5.18은 <code>axios</code>(get/post/put/delete/patch)에 대한 네이티브 디스패치를 추가했고, <code>response.status</code>와 <code>response.data</code>도 포함됩니다. v0.5.30은 대소문자 무시 조회에 대해 undefined를 반환하던 <code>fastify request.header()</code>와 <code>request.headers[]</code> 디스패치를 수정했습니다.
      </p>

      <h2>8. <code>@perry/postgres</code>: 이 모든 것을 필요하게 만든 드라이버</h2>
      <p>
        이번 주 작업의 상당수는 하나의 워크로드가 주도했습니다. 완전한 Node 호환 <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">Postgres 드라이버</a>를 Perry 네이티브에서 동작시키는 것. 이 드라이버는 TLS 지원, 크로스 모듈 codec 레지스트리, cancel/close/notify 지원을 갖추고 있으며, 이제 <code>pg</code>, <code>postgres.js</code>, <code>tokio-postgres</code>와 벤치마크됩니다.
      </p>
      <p>드라이버 쪽 성능 작업은 컴파일러 쪽과 병행되었습니다:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>컬럼별 codec을 호이스트</strong>하고 셀별 Buffer 복사를 제거. 중간 할당을 피하기 위해 int8에 BigInt(string) 사용.</li>
        <li><strong>객체 형태 행에 대한 셰이프별 동적 Row 생성자</strong>. 쿼리가 항상 같은 컬럼을 반환하면, 드라이버는 첫 번째 실행 시 셰이프 특수화된 행 생성자를 만들고 재사용합니다 &mdash; 컴파일러의 PIC와 결합되면, 행의 필드 접근이 다른 어떤 객체의 필드 접근만큼이나 빨라집니다.</li>
        <li>int8/numeric/date에 대해 원시 문자열을 원하는 호출자를 위한 <strong><code>parseTypes: &apos;minimal&apos;</code> 옵트아웃</strong>.</li>
      </ul>
      <p>
        이것이 컴파일러가 원래 가능하게 하려고 했던 양성 피드백 루프입니다. 실제 드라이버가 실제 병목을 드러냅니다. 병목은 한 줄 재현 코드로 GitHub 이슈에 등록됩니다. 일주일의 컴파일러 수정 후, 드라이버가 더 빨라지고, 다른 모든 사람을 위해서도 컴파일러가 더 빨라집니다. 그것이 7일로 압축된 전체 계획입니다.
      </p>

      <h2>9. 언급할 가치가 있는 정확성 수정</h2>
      <p>
        성능 작업은 강 바닥을 훑는 것이 장바구니 카트를 드러내는 방식으로 정확성 이슈를 드러냅니다. 부분 목록:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong>가 거부 시 <code>.reason</code> 대신 <code>.value</code>를 읽고 있어서, 거부가 조용히 삼켜지고 있었습니다(v0.5.13~v0.5.14).</li>
        <li><strong>Promise.any</strong>는 이제 모든 입력 Promise가 거부될 때 제대로 <code>AggregateError</code>를 throw합니다. <code>Promise.withResolvers</code>를 추가하고 <code>queueMicrotask</code> 순서를 수정했습니다.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong>가 이제 깨진 객체 대신 문자 배열을 생성합니다(closes #16).</li>
        <li><strong>BigInt 산술과 <code>BigInt()</code> 강제 변환</strong>(closes #33). i64 bigint 패스트 패스(v0.5.29)는 일반적인 경우를 싸게 만듭니다.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong>가 숫자 바이트 인수로 호출될 때 바이트 값이 아니라 버퍼 포인터와 비교하고 있었습니다(closes #56).</li>
        <li><strong>NaN/Infinity와의 비트 연산</strong>이 ToInt32 스펙에 따라 0을 생성합니다(closes #57).</li>
        <li><strong>Windows x86_64</strong>: 다섯 개의 플랫폼별 수정 &mdash; <code>localtime</code>, <code>clang</code> 탐지, 몇 가지 codegen 조정 &mdash; 으로 Windows x86_64가 다시 그린 상태로 돌아왔습니다(v0.5.72).</li>
      </ul>

      <h2>10. 수치</h2>
      <p>
        지난 글의 헤드라인 벤치마크는 Node보다 24.6배 빠른 <code>factorial</code>이었습니다. 그 수치는 변하지 않았습니다. 이번 주에 움직인 것은 그 주변의 모든 것입니다:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">워크로드</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">변화</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (20레코드 스키마)</td><td className="text-right py-2 px-3">Node보다 547배 느림</td><td className="text-right py-2 px-3">Node보다 1.3배 느림</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (4K 5×5 블러)</td><td className="text-right py-2 px-3">1,980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4.3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">프로퍼티 중심 코드 (PIC 히트)</td><td className="text-right py-2 px-3">기준선</td><td className="text-right py-2 px-3">2~3x</td><td className="text-right py-2 px-3 text-green-400">2~3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1.3x</td></tr>
            <tr><td className="py-2 px-3">부하 상태에서 Fastify 가동시간</td><td className="text-right py-2 px-3">크래시 전 ~60초</td><td className="text-right py-2 px-3">무기한</td><td className="text-right py-2 px-3 text-green-400">∞</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Node를 상대로 한 전체 15개 벤치마크 스위트는 여전히 14승 1무입니다 &mdash; 지난 글과 같은 표이지만 전반적으로 약간 더 좋은 수치입니다. 이번 주의 실제 움직임은 그 스위트에 없던 워크로드에 있습니다. JSON, 이미지 처리, 장시간 실행 서버. 그곳이 격차가 살던 곳이었고, 그곳이 닫혔습니다.
      </p>

      <h2>11. 다음은 무엇인가</h2>
      <p>
        아직 쫓고 있는 한 벤치마크는 Zig를 상대로 한 <code>image_conv</code>입니다. Perry는 457ms, Zig는 246ms입니다. 그 격차는 최적화 패스 수준이 아닌 아키텍처적이며, 세 곳에 걸쳐 있습니다:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>타입드 버퍼 로컬</strong>. 이번 주에 Buffer 작업의 대부분이 들어왔지만, 버퍼 타입 함수 파라미터와 로컬은 여전히 접근할 때마다 언박스됩니다. 루프 카운터에 사용하는 <code>i64</code> 슬롯 접근법이 버퍼로 확장되어야 합니다.</li>
        <li><strong>내부/경계 루프 분할</strong>. 블러 루프는 모든 픽셀을 클램프하는데, 99.9%의 픽셀은 그럴 필요가 없습니다. 경계 영역(클램프됨)과 내부(클램프 없음)로 분할하면, LLVM이 NEON <code>ld3</code>/<code>st3</code>로 내부를 벡터화할 수 있게 됩니다.</li>
        <li><strong>더블-ABI FNV-1a 해시</strong>. 해시 헬퍼는 NaN-box ABI를 통해 호출됩니다. 핫 패스에서 원시 i64 입출력으로 특수화하는 것은 몇 시간의 작업이며, 모든 해시 중심 워크로드에서 투자 대비 보상을 줍니다.</li>
      </ol>
      <p>
        이것들은 <code>PERF_ROADMAP.md</code>에서 추적됩니다. 다음 사이클에서 볼 수 있을 것으로 예상합니다.
      </p>

      <h2>마무리</h2>
      <p>
        이번 주의 패턴 &mdash; 68개의 패치 릴리스, 거의 전부 성능, JSON 격차 하나가 547배에서 1.3배로 &mdash; 은 LLVM 전환 언덕의 좋은 쪽으로 넘어왔을 때 일어나는 일입니다. 옵티마이저는 이제 벽이 아니라 동맹이며, 남은 것 대부분은 작고 구체적이고 측정 가능한 작업입니다. 느린 경로를 찾고, 옵티마이저가 왜 꿰뚫어 볼 수 없는지 알아내고, 구조를 드러내고, 다시 측정. 이 커밋들 중 어느 것도 특별하지 않습니다. 그저 필요한 곳에 적용되었을 뿐입니다.
      </p>
      <p>
        이 중 어떤 것이든 시도해 보고 싶다면:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        소스: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; 문서: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; 체인지로그: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        이슈, 재현 코드, 충분히 빠르지 않은 벤치마크. 계속 보내주세요. 이 속도가 통하는 이유는 버그 보고가 한 줄 재현 코드로 변환할 만큼 구체적이기 때문입니다. 이 글의 모든 커밋에 <code>#N</code>이 붙어 있는 데는 이유가 있습니다.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
