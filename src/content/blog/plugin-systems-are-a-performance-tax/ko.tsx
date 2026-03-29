export default function Content() {
  return (
    <>
      <p>
        VS Code를 설치합니다. 빠릅니다. 확장 15개를 추가합니다. 이제 시작에 4초가 걸리고
        Extension Host가 800 MB RAM을 소모합니다. 무슨 일이 일어난 걸까요?
      </p>
      <p>
        이 패턴은 어디서나 반복됩니다: WordPress, Eclipse, Chrome, Figma, Slack. 앱은
        빠르게 출시됩니다. 플러그인이 느리게 만듭니다. 아무도 더 이상 놀라지 않습니다 —
        확장성의 비용으로 받아들였습니다.
      </p>
      <p>
        하지만 플러그인 시스템은 단순한 성능 문제가 아닙니다. 설계 철학 문제입니다. 업계는
        &quot;확장성&quot;을 &quot;런타임 동적성&quot;과 혼동해왔지만, 더 나은 답은 종종
        컴파일 타임 합성입니다. 유일하게 성능이 좋은 플러그인은 컴파일 시점에 플러그인이기를
        멈추는 것입니다.
      </p>

      <h2>확장성의 성능 스펙트럼</h2>
      <p>
        모든 확장성이 같은 비용이 아닙니다. 제로 코스트에서 최대 코스트까지의 스펙트럼이 있으며,
        업계 대부분은 비용이 높은 쪽에 정착했습니다:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>정적 링킹 / 컴파일 타임 모듈</strong> — 오버헤드 제로. C 라이브러리,
          Rust 크레이트, Go 패키지. 모듈 경계가 최종 바이너리에서 완전히 사라집니다.
        </li>
        <li>
          <strong>시작 시 로드되는 공유 라이브러리</strong> — 거의 제로. nginx 모듈,
          Linux 커널 모듈. 로드 시 일회성 비용, 이후 직접 함수 호출.
        </li>
        <li>
          <strong>인터페이스 / vtable을 통한 동적 디스패치</strong> — 작은 오버헤드.
          C++ 게임 엔진 플러그인. 호출당 포인터 간접 참조 하나.
        </li>
        <li>
          <strong>동일 프로세스 내 인터프리터 플러그인</strong> — 중간. WordPress PHP 플러그인,
          Eclipse OSGi 번들. 모든 플러그인 호출이 인터프리터를 거침.
        </li>
        <li>
          <strong>IPC를 통한 별도 프로세스 플러그인</strong> — 상당함. VS Code 확장,
          Chrome 확장. 모든 상호작용이 프로세스 경계를 넘고 데이터를 직렬화.
        </li>
        <li>
          <strong>직렬화된 IPC를 통한 샌드박스 플러그인</strong> — 무거움. Figma 플러그인,
          브라우저 확장 콘텐츠 스크립트. 모든 호출에서 직렬화, 역직렬화, 샌드박스 적용.
        </li>
      </ol>
      <p>
        핵심 인사이트: 유일하게 성능이 좋은 플러그인은 컴파일 시점에 플러그인이기를
        멈추는 것입니다. 레벨 1과 2가 빠른 이유는 &quot;플러그인&quot;이 최종 아티팩트에서
        호스트 코드와 구별할 수 없게 되기 때문입니다.
      </p>

      <h2>실제 피해</h2>

      <h3>WordPress</h3>
      <p>
        모든 플러그인이 요청 생명주기에 연결됩니다. 30개 플러그인은 페이지 로드당 30개 레이어의
        함수 호출을 의미합니다. 결과: 다른 플러그인의 피해를 완화하기 위해서만 캐싱 플러그인이
        존재합니다. 플러그인이 만든 성능 문제를 해결하는 성능 플러그인. 메타적 아이러니입니다.
      </p>

      <h3>VS Code</h3>
      <p>
        확장들이 별도 프로세스의 단일 Node.js 이벤트 루프를 공유합니다. 하나의 문제 있는
        확장이 다른 모든 것을 차단합니다. Extension Host는 정기적으로 개발자 머신에서
        CPU 소비 1위로 나타납니다. Microsoft는 프로파일링 도구, bisect 명령,
        활성화 이벤트 시스템을 구축했습니다 — 확장이 만드는 문제를 관리하기 위한
        전체 인프라입니다.
      </p>

      <h3>Eclipse</h3>
      <p>
        경고적 사례입니다. OSGi 번들 해석, 클래스 로딩 오버헤드, 거대한 의존성 그래프.
        한때 가장 인기 있는 IDE였지만, 현재 메인스트림 개발자들에게 대부분 버려졌습니다.
        최대 강점이 되어야 했던 플러그인 아키텍처가 결정적 약점이 되었습니다.
      </p>

      <h3>Electron 자체</h3>
      <p>
        플랫폼 수준의 플러그인 문제입니다. 모든 Electron 앱이 완전한
        Chromium + Node.js 런타임을 포함합니다. VS Code는 Electron. Slack은 Electron. Discord는
        Electron. 각각 독립적으로 300~500 MB RAM을 소비하여 본질적으로 채팅 창이나
        텍스트 에디터를 렌더링합니다. 여기서 &quot;플러그인&quot;은 전체 웹 플랫폼이며,
        애플리케이션마다 새로 번들됩니다.
      </p>

      <h2>왜 업계는 계속 플러그인을 선택하는가</h2>
      <p>
        플러그인이 그렇게 비싸다면, 왜 모두가 계속 만드는 걸까요? 이유는 주로
        기술적이 아닌 조직적입니다:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>개발자 경험</strong> — 성능을 신경 쓰지 않으면 플러그인은 작성하기 쉽습니다.
          JS 파일을 출시하고, 이벤트에 연결하면 끝.
        </li>
        <li>
          <strong>에코시스템 성장</strong> — 플러그인은 네트워크 효과와 커뮤니티 참여를 생성합니다.
          30,000개 확장의 마켓플레이스는 강력한 해자입니다.
        </li>
        <li>
          <strong>조직적 편의</strong> — 플러그인은 팀이 설계 결정을 미루도록 합니다.
          &quot;누군가 그것에 대한 플러그인을 작성할 것&quot;은 아키텍처 버전의
          &quot;포스트프로덕션에서 고칠 것&quot;입니다.
        </li>
        <li>
          <strong>비즈니스 모델</strong> — 플러그인 마켓플레이스는 수익과 락인을 생성합니다.
          플랫폼이 에코시스템에서 가치를 포착합니다.
        </li>
      </ul>
      <p>
        불편한 진실: 플러그인은 종종 코어에 무엇이 속하는지에 대한 어려운
        아키텍처 결정을 피하는 방법입니다. 불완전한 것을 출시하고
        &quot;확장 가능&quot;이라고 부를 수 있게 해줍니다.
      </p>

      <h2>대안: 컴파일 타임 합성</h2>
      <p>
        확장성이 런타임 대신 빌드 시점에 일어난다면?
      </p>
      <p>
        이것은 가설이 아닙니다. 시스템 언어에서 잘 입증된 선례가 있습니다:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Rust proc 매크로</strong> — 컴파일 시점에 실행되어 제로 오버헤드 네이티브 코드를
          생성하는 임의의 코드. Serde 직렬화, Tokio async 런타임 설정, Axum 라우팅 —
          모두 프로그램 시작 전에 해결됩니다.
        </li>
        <li>
          <strong>Zig comptime</strong> — 모든 런타임 분기를 제거하는 컴파일 타임 실행.
          제네릭 데이터 구조는 단형화되고, 설정은 해결되고, 데드 코드는 제거됩니다.
          남는 것은 정확히 실행되는 것뿐입니다.
        </li>
        <li>
          <strong>C++ 템플릿 / constexpr</strong> — 제로 런타임 비용의 컴파일 타임 다형성.
          STL이 모든 제네릭 알고리즘을 컴파일 시점에 특수화하기 때문에
          뛰어난 성능을 달성합니다.
        </li>
        <li>
          <strong>번들러의 트리 셰이킹</strong> — JavaScript에 적용된 이 아이디어의 부분적이고
          불완전한 버전. Webpack과 Rollup이 빌드 시점에 사용되지 않는 내보내기를 제거합니다.
          한계는 코드를 제거할 수만 있고 특수화할 수 없다는 것입니다.
        </li>
      </ul>
      <p>
        패턴은 일관됩니다: 결정을 런타임에서 빌드 시점으로 이동시키는 것.
        포함하지 않는 것은 비용이 들지 않습니다. 포함하는 것은 간접 참조 없이
        네이티브 코드로 컴파일됩니다. 모듈 경계는 소스 수준의 조직 도구가 되며,
        런타임 성능 경계가 아닙니다.
      </p>

      <h2>TypeScript에 대한 의미</h2>
      <p>
        TypeScript는 확장 가능한 도구를 구축하기 위한 가장 인기 있는 언어이면서
        런타임 성능에서 가장 나쁩니다. TypeScript 에코시스템 전체가 Node.js에서 실행되고,
        Node.js는 V8에서 실행되며, V8는 JavaScript를 JIT 컴파일합니다. 모든 레이어가
        오버헤드를 추가합니다: JIT 워밍업 시간, 가비지 컬렉션 일시 중지, 모든 프로퍼티
        접근에서의 동적 디스패치, 프로세스 간 IPC 경계.
      </p>
      <p>
        여기서 Perry가 등장합니다. Perry는 TypeScript를 네이티브 바이너리로 직접 컴파일합니다.
        V8 없이, JIT 워밍업 없이, 가비지 컬렉션 일시 중지 없이, IPC 경계 없이.
      </p>
      <p>
        모듈이 네이티브 코드로 컴파일되면, &quot;플러그인&quot;은 그냥... 모듈이 됩니다.
        빌드 시점에 합성됩니다. 최종 바이너리에는 플러그인 오버헤드가 없습니다.
        플러그인이 없기 때문입니다 — 네이티브 코드만 있습니다. Express 라우트 핸들러,
        미들웨어 함수, 유틸리티 라이브러리 — 모두 같은 바이너리 내의 직접 함수 호출로
        컴파일됩니다. 동적 로딩 없이, 직렬화 없이, 프로세스 경계 없이.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Your app, your dependencies, your &quot;plugins&quot; — one binary</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <p>
        이것은 이론이 아닙니다. Perry는 이미 실제 TypeScript 프레임워크 — Hono, tRPC, Strapi —
        를 2 MB 미만의 네이티브 ARM64 바이너리로 1초 미만에 컴파일합니다. 이 프레임워크를 구성하는
        모듈이 컴파일되고, 링크되고, 단일 실행 파일에 인라인됩니다. Node.js에서는 런타임 오버헤드가
        있는 플러그인 아키텍처가 되는 것이 Perry 바이너리에서는 제로 코스트 합성이 됩니다.
      </p>

      <h2>실제로 필요한 확장성</h2>
      <p>
        반론은 명백합니다: &quot;하지만 런타임 확장성이 필요합니다. 사용자가 재컴파일 없이
        플러그인을 설치할 수 있어야 합니다.&quot;
      </p>
      <p>
        정말인가요? 대부분의 애플리케이션에서 확장 세트는 빌드 시점에 알려져 있습니다.
        Express 미들웨어, 데이터베이스 드라이버, 인증 라이브러리, 로깅 프레임워크를 선택한 후
        배포합니다. &quot;확장성&quot;은{" "}
        <code className="text-perry-400">package.json</code>에 있으며,{" "}
        <code className="text-perry-400">npm install</code> 시점에 해석됩니다. 런타임이 아닙니다.
      </p>
      <p>
        런타임 플러그인 로딩이 진정으로 필요한 애플리케이션 — VS Code, WordPress,
        브라우저 — 은 예외이지 규칙이 아닙니다. 그것들마저도 큰 대가를 치릅니다.
        나머지 모든 것에 대해, 컴파일 타임 합성은 오버헤드 없이 동일한 유연성을 제공합니다.
      </p>
      <p>
        차이는 아키텍처적 정직함입니다. 모든 애플리케이션에 플러그인 시스템이
        필요한 척하는 대신 질문합니다: 이 확장성이 런타임에 일어나야 하는가,
        아니면 컴파일러가 할 수 있는가?
      </p>

      <h2>앞으로의 길</h2>
      <p>
        업계의 플러그인 아키텍처에 대한 중독은 런타임 오버헤드를 불가피한 것으로
        받아들이는 것의 증상입니다. 불가피하지 않습니다. 컴파일러가 할 수 있습니다.
        빌드 타임 합성은 세금 없는 확장성을 제공합니다.
      </p>
      <p>
        TypeScript 개발자가 사랑하는 언어를 포기하지 않고도 네이티브 성능을 누릴 자격이 있다고
        믿어 Perry를 구축하고 있습니다. 모듈은 빌드 시점에 합성되고, 직접 함수 호출로
        컴파일되며, &quot;확장성&quot;을 가능하게 하기 위해서만 존재하는 런타임의
        오버헤드 없이 실행되어야 합니다.
      </p>
      <p>
        가장 빠른 플러그인 시스템은 런타임에 존재하지 않는 것입니다.
      </p>
    </>
  );
}
