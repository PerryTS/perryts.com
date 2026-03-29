import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry를 소개합니다. Perry는 Rust로 작성된 네이티브 TypeScript 컴파일러로,
        TypeScript를 독립 실행 파일로 직접 컴파일합니다. Node.js 런타임 없이,
        Electron 래퍼 없이, 타협 없이. 여러분의 코드가 즉시 시작되고
        어디서든 실행되는 네이티브 바이너리로 컴파일됩니다.
      </p>
      <p>
        Perry는 TypeScript가 될 수 있는 것에 대한 근본적인 재고를 나타냅니다.
        JavaScript의 상위 집합으로서 JS 엔진을 통해 실행되어야 하는 것으로 취급하는 대신,
        Perry는 TypeScript를 시스템 언어로 취급합니다. 수백만 명의 개발자가 이미 알고
        사랑하는 문법을 가진 시스템 언어로서.
      </p>

      <h2>Perry를 만든 이유</h2>
      <p>
        TypeScript는 현대 소프트웨어 개발의 공용어가 되었습니다. 대부분의 웹 프론트엔드,
        점점 늘어나는 백엔드 비율, 그리고 도구, 스크립팅, 자동화의 선택지로서
        사용되는 언어입니다. 하지만 항상 근본적인 한계를 가지고 있었습니다.
        JavaScript로 컴파일되며, JavaScript에는 런타임이 필요하다는 한계입니다.
      </p>
      <p>
        그 런타임 — Node.js든, Deno든, Bun이든 — 에는 트레이드오프가 따릅니다.
        수십에서 수백 밀리초로 측정되는 콜드 스타트 시간. JIT 컴파일러와 가비지 컬렉터의
        메모리 오버헤드. 전체 런타임을 번들링하거나 사용자에게 설치를 요구하는 바이너리 배포.
        그리고 GUI 애플리케이션의 경우, 유일한 선택지는 앱과 함께 전체 Chromium 브라우저를
        포함하는 Electron이었습니다.
      </p>
      <p>
        우리는 질문했습니다. TypeScript가 JavaScript를 거치지 않아도 된다면?
        Rust, Go, C++를 컴파일하는 것과 같은 방식으로 네이티브 머신 코드로 직접 컴파일할 수
        있다면?
      </p>

      <h2>Perry의 작동 방식</h2>
      <p>
        Perry의 컴파일 파이프라인에는 세 가지 단계가 있습니다:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>파싱</strong> — Perry는 SWC(Rust 기반 TypeScript/JavaScript 파서)를
          사용하여 TypeScript 소스를 AST로 파싱합니다. SWC는 Next.js에서도 사용되는
          동일한 파서이며, 매우 빠릅니다.
        </li>
        <li>
          <strong>타입 지향 컴파일</strong> — Perry는 완전한 타입 정보를 가지고 AST를 순회합니다.
          런타임에 동적 타입을 처리해야 하는 JS 엔진과 달리, Perry는 컴파일 시점에 모든 타입을
          알고 있습니다. 이를 통해 제네릭의 단형화, 메서드 호출의 정적 디스패치,
          메모리 레이아웃의 직접 최적화가 가능합니다.
        </li>
        <li>
          <strong>코드 생성</strong> — Perry는 Cranelift를 사용하여 네이티브 머신 코드를 생성합니다.
          Cranelift는 Wasmtime과 Firefox JIT의 일부에서 사용되는 코드 생성기입니다.
          x86_64와 ARM64용 효율적인 네이티브 코드를 생성합니다.
        </li>
      </ol>
      <p>
        결과물은 독립 실행 파일입니다. CLI 도구의 경우 일반적으로 2~5 MB이며,
        워밍업 시간 없이 즉시 시작됩니다.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>지원되는 TypeScript 기능</h2>
      <p>
        Perry는 TypeScript의 광범위하고 성장하는 하위 집합을 지원합니다. 목표는 개발자가
        실제로 사용하는 형태의 언어와 완전한 호환성을 갖추는 것입니다. 현재 지원 내용:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>모든 원시 타입</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>인터페이스와 타입 별칭</strong> — 유니온 타입, 교차 타입, 매핑된 타입 포함</li>
        <li><strong>제네릭</strong> — 단형화를 통해 컴파일되므로 <code className="text-perry-400">Array&lt;number&gt;</code>와 <code className="text-perry-400">Array&lt;string&gt;</code>는 각각 별도의 최적화된 코드 경로를 생성</li>
        <li><strong>클래스</strong> — 상속, 프라이빗 필드(<code className="text-perry-400">#field</code>), 정적 멤버, getter/setter, 데코레이터 지원</li>
        <li><strong>Async/await와 Promise</strong> — Rust가 async를 처리하는 방식과 유사하게 상태 머신으로 컴파일</li>
        <li><strong>제너레이터와 이터레이터</strong> — <code className="text-perry-400">function*</code>과 <code className="text-perry-400">for...of</code> 루프</li>
        <li><strong>클로저</strong> — 적절한 캡처 시맨틱 포함</li>
        <li><strong>구조 분해 할당</strong> — 배열, 객체, 중첩 패턴, 나머지 요소</li>
        <li><strong>템플릿 리터럴</strong> — 태그된 템플릿 포함</li>
        <li><strong>모듈</strong> — 컴파일 시점에 해석되는 ESM import/export</li>
      </ul>

      <h2>크로스 플랫폼 네이티브 UI</h2>
      <p>
        Perry는 CLI 도구와 서버사이드 애플리케이션에 국한되지 않습니다. 6개 플랫폼을 위한
        네이티브 UI 프레임워크를 제공합니다:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField 등)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (iOS와 동일한 API, iPad 전용 적응 포함)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, 공통 컨트롤, GDI)</li>
      </ul>
      <p>
        핵심 인사이트는 Perry가 공통 TypeScript API를 각 플랫폼의 네이티브 위젯 툴킷에
        컴파일 시점에 매핑한다는 것입니다. 브리지 레이어도, 웹 뷰도,
        커스텀 렌더링 엔진도 없습니다. 앱은 OS 자체가 렌더링하는 실제 플랫폼 위젯을
        사용합니다. 자세한 내용은 심층 분석 글에서 확인하세요:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          TypeScript에서의 크로스 플랫폼 네이티브 UI
        </Link>.
      </p>

      <h2>27개 이상의 네이티브 npm 패키지 구현</h2>
      <p>
        새로운 컴파일러의 가장 큰 실질적 과제 중 하나는 에코시스템 호환성입니다.
        개발자는 코드를 처음부터 작성하는 것만이 아니라 패키지를 사용합니다. Perry는
        27개 이상의 인기 npm 패키지의 네이티브 구현으로 이 문제를 해결합니다:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>데이터베이스</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSocket)</li>
        <li><strong>보안</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>유틸리티</strong> — uuid, chalk, dotenv, lodash (부분), moment</li>
        <li><strong>시스템</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        이들은 Node.js 모듈의 얇은 래퍼가 아닙니다. 네이티브 시스템 라이브러리를 사용하여
        바이너리에 직접 컴파일됩니다. PostgreSQL에는 libpq, 암호화에는 OpenSSL,
        HTTP에는 libcurl을 사용합니다. API 표면은 npm 패키지에서 기대하는 것과 일치하므로
        마이그레이션이 간단합니다.
      </p>

      <h2>선택적 V8 호환 레이어</h2>
      <p>
        아직 Perry 네이티브 구현이 없는 npm 패키지의 경우, Perry는 선택적 V8
        임베딩 모드를 제공합니다. 활성화하면 Perry는 V8 런타임을 번들링하여 컴파일된
        TypeScript와 함께 표준 JavaScript npm 패키지를 실행할 수 있습니다.
        이는 Perry를 점진적으로 도입할 수 있게 해주는 실용적인 탈출구입니다.
        핫 패스는 네이티브 코드로 컴파일하면서 나머지는 전체 npm 에코시스템에 접근할 수 있습니다.
      </p>

      <h2>크로스 컴파일</h2>
      <p>
        Perry는 크로스 컴파일을 기본적으로 지원합니다. macOS 개발 머신에서
        Linux(x86_64 및 ARM64)와 iOS용으로 컴파일할 수 있습니다. 이를 통해 macOS에서
        CI/CD 파이프라인을 구축하고 각 플랫폼 전용 빌드 머신 없이
        모든 배포 대상용 바이너리를 생성할 수 있습니다.
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>성능</h2>
      <p>
        Perry로 컴파일된 바이너리는 빠릅니다. JIT 워밍업, 인터프리터 오버헤드,
        가비지 컬렉터 일시 중지가 없기 때문에 첫 번째 호출부터 예측 가능하고
        일관된 성능을 보입니다.
      </p>
      <p>
        벤치마크 결과:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>시작 시간</strong> — 사실상 0 ms (네이티브 프로세스 시작)</li>
        <li><strong>바이너리 크기</strong> — 일반적인 CLI 도구에서 2~5 MB (번들된 Node.js의 50+ MB 대비)</li>
        <li><strong>메모리 사용량</strong> — 동등한 Node.js 애플리케이션 대비 5~10배 낮음</li>
        <li><strong>처리량</strong> — 연산 집중 워크로드에서 직접 작성한 C와 대등</li>
      </ul>
      <p>
        라이브 벤치마크는{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>에서 확인할 수 있으며, Perry 컴파일 실행 파일과 Node.js, Bun을 실시간으로 비교합니다.
      </p>

      <h2>현재 상태</h2>
      <p>
        Perry는 활발히 개발 중입니다. 컴파일러는 테스트 스위트에서 62개 중 62개 테스트가
        통과하며 안정적입니다. 6개 플랫폼 UI 백엔드가 모두 작동합니다.
        핵심 언어 기능은 견고하며 확장 중입니다.
      </p>
      <p>
        UI 위젯 라이브러리 확장, 문자열 및 객체 성능 개선, 완전한 정규식 지원 완성,
        Stream 모듈 구축에 적극적으로 작업하고 있습니다. 장기적으로는 WASM 컴파일 대상,
        멀티스레딩, VS Code 확장, 패키지 매니저 통합을 계획하고 있습니다.
      </p>
      <p>
        출시된 기능, 진행 중인 작업, 다음 계획의 자세한 내용은 전체 <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">로드맵</Link>을 확인하세요.
      </p>

      <h2>시작하기</h2>
      <p>
        Perry는 오픈 소스입니다. 저장소를 클론하고, 소스에서 빌드하여
        오늘부터 TypeScript 컴파일을 시작할 수 있습니다:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        소스 코드는{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        에서 탐색하고,{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">쇼케이스</Link>
        {" "}에서 Perry로 만들어지고 있는 것들을 확인하거나, 바로 코드에 뛰어드세요.
        여러분이 무엇을 만들지 기대됩니다.
      </p>
    </>
  );
}
