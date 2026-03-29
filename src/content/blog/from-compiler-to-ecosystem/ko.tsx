import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        일주일 전, Perry는 UI 툴킷을 갖춘 컴파일러였습니다. TypeScript를 작성하고, 네이티브 바이너리로
        컴파일하고, 6개 플랫폼에 배포할 수 있었습니다. 그것이 이야기였습니다. 오늘 이야기는
        더 커졌습니다: Perry는 에코시스템으로 진화하고 있습니다. 3개의 데이터베이스 ORM, 유니버설 푸시 알림,
        App Store와 Play Store 게시를 포함한 분산 빌드, React 호환 레이어,
        그리고 자동화된 앱 검증 — 모두 지난 한 주 동안 출시되었습니다.
      </p>
      <p>
        이 글에서는 출시된 내용, 그것이 중요한 이유, 그리고 코드가 어떻게 보이는지 다룹니다.
      </p>

      <h2>perry/ui: 기반</h2>
      <p>
        새로운 라이브러리를 살펴보기 전에, 모든 것의 중심에 있는 것을 강조할 필요가 있습니다:
        <code className="text-amber-400">perry/ui</code>. 이것은 Perry 자체의
        네이티브 UI 툴킷으로, 6개 모든 타겟에서 플랫폼 네이티브 컴포넌트로 직접 컴파일되는 20개 이상의 위젯을 포함합니다.
        래퍼가 아니고, 추상화 레이어가 아니며, 웹 뷰가 아닙니다.
        모든 <code className="text-amber-400">Button</code>은 macOS에서{" "}
        <code className="text-amber-400">NSButton</code>이 되고, iOS에서{" "}
        <code className="text-amber-400">UIButton</code>이 되고, Linux에서{" "}
        <code className="text-amber-400">GtkButton</code>이 되고, Android에서{" "}
        <code className="text-amber-400">android.widget.Button</code>이 되며, Windows에서{" "}
        <code className="text-amber-400">CreateWindowEx</code> 컨트롤이 됩니다.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code>는 Perry의 주요하고 가장 진보된
        UI 서피스입니다. 리액티브 상태 관리, 레이아웃 컨테이너(VStack, HStack,
        ZStack, SplitView), 하드웨어 가속 Canvas, 컬럼 정렬이 있는 Table 뷰,
        파일 다이얼로그, 키체인 접근, 알림, 멀티 윈도우를 위한{" "}
        <code className="text-amber-400">perry/system</code> 모듈을 포함합니다 — 모두 TypeScript에서,
        모두 플랫폼 API 직접 호출로 컴파일됩니다. React 호환 레이어를 포함한 Perry의 다른 모든 UI 접근 방식은
        <code className="text-amber-400">perry/ui</code> 위에 구축되어 그 위젯으로 매핑됩니다.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        리액티브 <code className="text-amber-400">State</code> 객체가 핵심 프리미티브입니다.
        State 값이 변경되면, 해당 상태에 바인딩된 위젯만 업데이트됩니다 — 가상 DOM
        비교 없음, 전체 트리 재렌더링 없음, 재조정 패스 없음. TypeScript에서 네이티브 플랫폼 UI로의
        가장 직접적인 경로입니다.
      </p>

      <h2>React 호환성: perry/ui 위의 얇은 레이어</h2>
      <p>
        React에서 오는 개발자를 위해, <code className="text-amber-400">perry-react</code>{" "}
        는 React의 컴포넌트 모델을{" "}
        <code className="text-amber-400">perry/ui</code> 위젯에 매핑하는 호환 레이어를 제공합니다.{" "}
        <code className="text-amber-400">useState</code>,{" "}
        <code className="text-amber-400">useRef</code>,{" "}
        <code className="text-amber-400">useReducer</code>, 그리고 JSX를 사용할 수 있으며 — Perry가
        동일한 네이티브 위젯으로 컴파일합니다. 이것은 편의를 위한 브릿지이지, 별도의 렌더링 엔진이 아닙니다.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        내부적으로 모든 JSX 요소는 <code className="text-amber-400">perry/ui</code>{" "}
        위젯에 매핑됩니다: <code className="text-amber-400">{`<div>`}</code>는 VStack이 되고,{" "}
        <code className="text-amber-400">{`<button>`}</code>는 Button이 되며,{" "}
        <code className="text-amber-400">useState</code>는 Perry의 리액티브 State로 구현됩니다.
        아직 초기 단계입니다 — 전체 트리 재렌더링과 전역 훅 스토리지의 페이즈 1이지만,
        기존 React 코드가 Perry를 통해 네이티브 플랫폼을 타겟으로 할 수 있음을 증명합니다.
        유사한 방식으로 Angular과 Ionic 호환성도 탐색 중입니다.
      </p>

      <h2>3개의 데이터베이스 ORM: Prisma API, 네이티브 성능</h2>
      <p>
        데이터베이스와 통신하는 서버나 데스크톱 앱을 구축하고 있다면, Perry는 이제
        Prisma 호환 3개의 ORM으로 지원합니다:{" "}
        <code className="text-amber-400">perry-prisma</code> (MySQL),{" "}
        <code className="text-amber-400">perry-sqlite</code> (SQLite),{" "}
        <code className="text-amber-400">perry-postgres</code> (PostgreSQL). 3개 모두
        <code className="text-amber-400">@prisma/client</code>의 드롭인 대체품입니다. 같은 API, 같은
        쿼리 패턴이지만, 데이터베이스 직접 FFI를 가진 네이티브 코드로 컴파일됩니다 — Prisma 엔진 없음,
        Node.js 없음.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Same Prisma API — compiled to native SQL via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        내부적으로 각 ORM은{" "}
        <code className="text-amber-400">sqlx</code>를 사용하는 Rust FFI 레이어로 지원되는 TypeScript 프론트엔드입니다.
        쿼리 흐름: TypeScript가 쿼리를 JSON으로 직렬화하고, FFI 경계를 통해 전달하고, Rust가 매개변수화된 SQL을 구축하고,
        커넥션 풀을 통해 실행하고, 결과를 직렬화하여 반환합니다. Prisma 스키마는 빌드 시에 읽힙니다
         — 런타임 파싱 제로.
      </p>
      <p>
        3개의 구현은 코드의 약 95%를 공유합니다. 차이점은 예상대로입니다:
        식별자 인용(<code className="text-amber-400">`col`</code> vs{" "}
        <code className="text-amber-400">&quot;col&quot;</code>), 플레이스홀더 구문({" "}
        <code className="text-amber-400">?</code> vs{" "}
        <code className="text-amber-400">$1, $2</code>), 트랜잭션 의미론. 3개 모두
        전체 Prisma CRUD 서피스를 지원합니다: findMany, findFirst, findUnique, create, createMany,
        update, updateMany, upsert, delete, deleteMany, count — 더불어 raw SQL, 트랜잭션,
        10개 이상의 WHERE 필터 연산자.
      </p>

      <h2>perry-push: 유니버설 푸시 알림</h2>
      <p>
        <code className="text-amber-400">perry-push</code>는 모든 플랫폼에서 푸시 알림을 처리하는
        단일 라이브러리입니다: APNs (iOS/macOS), FCM (Android), Web Push (브라우저),
        WNS (Windows). 각 프로바이더는 정확히 3개의 함수를 가진 Rust FFI 모듈입니다:{" "}
        <code className="text-amber-400">*_provider_new</code>,{" "}
        <code className="text-amber-400">*_provider_close</code>,{" "}
        <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Unified result type for all providers</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        암호화는{" "}
        <code className="text-amber-400">ring</code>으로 처리됩니다 — APNs와 VAPID용 ES256 JWT,
        FCM 서비스 계정용 RS256, Web Push 페이로드 암호화용 AES-GCM. 모두 네이티브 코드로 컴파일됩니다.
        <code className="text-amber-400">node-gyp</code> 없음, OpenSSL 의존성 없음.
      </p>

      <h2>Perry Hub + 빌더: 분산 클라우드 빌드</h2>
      <p>
        이것이 인프라 플레이입니다. <code className="text-amber-400">perry-hub</code>는
        빌드 오케스트레이션 서버로 — Perry 자체에 의해 TypeScript에서 컴파일된 — 빌드 워커 풀을 관리합니다.
        프로젝트를 푸시하면, 허브가 타겟 플랫폼에 따라 적절한 워커에 디스패치하고,
        워커가 컴파일, 서명, 그리고 선택적으로 앱을 게시합니다.
      </p>
      <p>
        현재 2개의 워커가 존재합니다: macOS 빌더(macOS, iOS, Android 타겟 처리)와
        Linux 빌더(Linux와 Android 처리). 둘 다 WebSocket을 통해 허브에 연결하고,
        소스 tarball을 다운로드하고, Perry 컴파일러를 실행하고, 아티팩트를 업로드하는 Rust 바이너리입니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>코드 서명</strong> — macOS용 Apple 공증, iOS용 프로비저닝 프로파일, Android 키스토어 서명</li>
        <li><strong>App Store 게시</strong> — App Store Connect와 Google Play Store에 직접 업로드</li>
        <li><strong>아티팩트 관리</strong> — 빌드된 바이너리가 TTL 기반 정리와 함께 허브에 업로드</li>
        <li><strong>라이선스 관리</strong> — 라이선스별 속도 제한, 우선순위 큐잉(프로 티어 우선)</li>
      </ul>
      <p>
        허브 자체는 흥미로운 사례 연구입니다. 약 1,500줄의 TypeScript 파일이 Perry에 의해 2 MB 네이티브 바이너리로
        컴파일됩니다. HTTP용으로 포트 3456에서 Fastify를, WebSocket용으로 포트 3457에서{" "}
        <code className="text-amber-400">ws</code>를 실행합니다. 모든 상태는 JSON 영속성을 가진
        인메모리입니다 — 외부 데이터베이스 없음. <code className="text-amber-400">scp</code>와
        systemd 유닛 파일로 배포할 수 있는 종류의 서버입니다.
      </p>

      <h2>perry-verify: 자동화된 앱 검증</h2>
      <p>
        <code className="text-amber-400">perry-verify</code>는 컴파일된 바이너리와 설정을 받아
        검증 파이프라인을 실행하고, 스크린샷과 함께 구조화된 pass/fail 결과를 반환하는 독립형 HTTP 서비스입니다.
        앱을 실행하고, 인증 플로우(결정적 또는 AI 지원)를 실행하고, 상태를 확인하고, 증거를 캡처합니다.
      </p>
      <p>
        macOS(접근성 API를 통해), Linux(AT-SPI), iOS Simulator와 Android Emulator용 스텁의
        플랫폼 어댑터가 존재합니다. AI 레이어는 결정적 검사가 불가능할 때 폴백 인증과
        상태 검증을 위해 Claude를 사용합니다. 허브의 빌드 파이프라인에 포스트 빌드 단계로
        삽입되도록 설계되었습니다: 컴파일, 서명, 검증, 게시.
      </p>

      <h2>Pry, 어디서나 출시</h2>
      <p>
        Perry 쇼케이스로 구축한 네이티브 JSON 뷰어인{" "}
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>가
        이제 5개 플랫폼에서 출시됩니다.{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Mac App Store
        </a>{" "}
        와{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Google Play
        </a>에 있으며, Linux와 Windows용 네이티브 바이너리도 있습니다. 같은 TypeScript 코드베이스,
        5개의 플랫폼별 엔트리 포인트, 5개의 네이티브 바이너리. 이 전체 접근 방식이 처음부터 끝까지
        작동한다는 가장 구체적인 증거입니다 — TypeScript 소스에서 App Store 등록까지.
      </p>

      <h2>이것이 의미하는 바</h2>
      <p>
        컴파일러는 흥미롭습니다. 에코시스템은 유용합니다. 지난 한 주 동안 Perry는
        &quot;TypeScript를 네이티브로 컴파일할 수 있다&quot;에서 &quot;네이티브 UI, Prisma 데이터베이스, 푸시 알림,
        App Store에 자동 게시하는 빌드를 갖춘 풀 앱을 만들 수 있다&quot;로 진화했습니다.
      </p>
      <p>
        조각들이 연결되기 시작하고 있습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong>는 TypeScript에서 네이티브 플랫폼 UI로의 가장 직접적인 경로 — 리액티브 상태, 20개 이상의 위젯, 추상화 레이어 제로</li>
        <li><strong>perry-prisma/sqlite/postgres</strong>는 기존 데이터베이스 코드가 최소한의 변경으로 이식됨을 의미합니다</li>
        <li><strong>perry-push</strong>는 플랫폼별 라이브러리 없이 네이티브 푸시 알림을 의미합니다</li>
        <li><strong>perry-hub + 빌더</strong>는 <code className="text-amber-400">perry publish</code>에서 App Store까지 한 단계로 갈 수 있음을 의미합니다</li>
        <li><strong>perry-verify</strong>는 소스뿐만 아니라 컴파일된 출력의 자동화된 테스트를 의미합니다</li>
        <li><strong>perry-react</strong>는 React 개발자가 익숙한 패턴을 사용하여 Perry에 쉽게 진입할 수 있으며, 모두 내부적으로 perry/ui에 매핑됨을 의미합니다</li>
      </ul>
      <p>
        이것들은 이론적인 것이 아닙니다. 여기 나열된 모든 라이브러리에는 작동하는 코드, 테스트,
        문서가 있습니다. 여러 개는 이미 프로덕션에서 사용되고 있습니다 — Perry 랜딩 사이트 자체가
        Perry로 컴파일된 Fastify 서버에서 실행되며, Pry는 2개의 앱 스토어에서 라이브입니다.
      </p>

      <h2>다음 단계</h2>
      <p>
        즉각적인 로드맵:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui 확장</strong> — 드래그 앤 드롭, 접근성 레이블, 커스텀 컨텍스트 메뉴, 더 많은 레이아웃 프리미티브</li>
        <li><strong>perry-verify 통합</strong> — 빌드 파이프라인에서의 자동화된 검증</li>
        <li><strong>프레임워크 호환성</strong> — perry/ui로의 온램프로서 React, Angular, Ionic 레이어 개선</li>
        <li><strong>완전한 정규표현식 지원</strong> — 네이티브로 컴파일되는 ECMAScript 호환 정규표현식 엔진</li>
      </ul>
      <p>
        진행 상황은{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>에서 팔로우하거나,{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">로드맵</Link>
        {" "}에서 전체 그림을 확인하세요.
      </p>
    </>
  );
}
