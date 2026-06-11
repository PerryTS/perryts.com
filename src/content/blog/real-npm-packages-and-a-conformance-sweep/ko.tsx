export default function Content() {
  return (
    <>
      <p>
        지난 글은 <strong>v0.5.875</strong>에서 GC 이야기로 마무리됐습니다 — aya_koto의 벤치마크가 드러낸 갭을 좁히는 것이었죠. 그 글은 하나의 벤치마크를 이기는 이야기였습니다. 이번 글은 다른 종류의 작업에 관한 것입니다: <strong>v0.5.875와 v0.5.1146 사이의 대략 270개 릴리스</strong>로, 약 4주에 걸쳐 안착했고, 그중 거의 어느 것도 벤치마크 헤드라인이 아닙니다. 테마는 &ldquo;마이크로벤치마크에서 빠르게 가기&rdquo;에서 <strong>&ldquo;실제 TypeScript와 실제 npm 패키지가 실제로 컴파일되고 실행되게 하기&rdquo;</strong>로 옮겨갔습니다. 더해서 그 과정에서 Windows의 전면적 비주얼 정비와 한 무더기의 새 위젯이 함께했습니다.
      </p>
      <p>
        무엇이 출시됐는지, 실제로 무엇을 위한 것이었는지로 묶어 정리합니다.
      </p>

      <h2>이제 실제 npm 패키지가 컴파일됩니다</h2>
      <p>
        이 윈도우를 관통하는 가장 큰 단일 스레드는 인기 있는 npm 패키지가 네이티브 바이너리로 컴파일되고 동작 테스트를 통과하게 만드는 작업입니다 — 단지 &ldquo;에러 없이 링크&rdquo;가 아니라, 실행되고 올바른 출력을 내는 것까지. <code>perry.compilePackages</code>를 통해 이제 동작하는 목록에는 <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, Colyseus</strong>가 포함됩니다.
      </p>
      <p>
        각각은 저마다의 이유로 실패했고, 각 수정은 그 자체로 하나의 작은 이야기입니다:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong>는 <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code>로 크래시했습니다. 근본 원인(v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>F</code>가 다른 모듈에서 임포트된 함수일 때 <code>new F()</code>가 조용히 빈 객체를 만들었습니다 — 생성자 본문이 결코 실행되지 않아, 모든 <code>$ZodCheckMinLength</code> 형태의 체크가 <code>_zod</code> 프로퍼티가 벗겨진 채 돌아왔습니다.</li>
        <li><strong>axios + jose</strong>는 Perry에 아직 없던 crypto와 압축이 필요했습니다: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, AES-GCM을 위한 <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code>, 그리고 <code>randomFillSync</code>(v0.5.972–976).</li>
        <li><strong>fastify</strong>는 <code>wait_for_promise</code>의 1초 폴링 타임아웃에서 데드락에 빠지고 있었습니다; 우리는 그것을 condvar 대기로 교체하고, 거부된 프로미스가 멈추는 대신 <code>HTTP 500</code>으로 드러나게 만들었습니다(v0.5.912).</li>
        <li><strong>@hono/node-server</strong>는 POST 본문을 읽지 못했습니다 — v0.5.1142의 부모 등록 수정 전까지 <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code>가 POST/PUT에서 빈 값을 반환했습니다.</li>
        <li><strong>chalk, ms, debug, express</strong>는 모두 같은 형태에 부딪혔습니다: <em>프로퍼티가 붙은 호출 가능한 값</em>(<code>chalk.red</code>, <code>express()</code>에 더해 <code>express.Router</code>). 그 패턴의 세 가지 변형이 v0.5.935와 그 주변의 npm 스윕에 걸쳐 수정됐고, express의 발목을 풀기 위한 <code>util.inherits</code> + 스트림 프로토타입 스캐폴드도 더해졌습니다(v0.5.990).</li>
        <li><strong>dayjs</strong>는 미니파이된 번들로 배포되며, Perry가 잘못 lowering하던 JS-클래식 프로토타입 메서드 디스패치(<code>Class.prototype.m = fn</code>)를 행사했습니다(v0.5.924/932).</li>
      </ul>
      <p>
        그 모든 것 아래에는 Perry가 네이티브로 컴파일<em>할 수 없는</em> 패키지를 여전히 실행되게 만드는 부분이 있습니다: 이 윈도우에서 <strong>V8 폴백 런타임</strong>이 실체를 갖췄습니다. 그 ModuleLoader는 이제 임베디드 모듈 맵에서 읽으므로, 폴백 바이너리도 여전히 <strong>자기 완결적</strong>입니다 — 런타임에 떠도는 <code>node_modules</code>가 없습니다(v0.5.994). <code>createServer</code>는 실제 hyper 서버에 다리를 놓고(v0.5.999), <code>Response</code> / <code>Request</code> / <code>Headers</code> Web Fetch 전역이 폴백 경로에 존재합니다(v0.5.1006). 그리고 <strong>컴파일 타임 동적 <code>import()</code></strong> — 빌드 타임에 해소되는 문자열 리터럴 <code>await import(&apos;./foo.ts&apos;)</code> — 가 마침내 안착했습니다(v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>).
      </p>

      <h2>test262 적합성 스윕</h2>
      <p>
        다른 지배적 스레드는 적합성입니다. 우리는 test262 서브셋 레이더에 대해 집중 패스를 돌렸고, 실제 코드가 가장 강하게 기대는 빌트인에서 바늘을 움직였습니다:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        String 점프는 모든 <code>String.prototype</code> 메서드에 제네릭-<code>this</code> 디스패치를 부여하고 <code>slice</code>/<code>substring</code> 인덱스 강제 변환을 고친 데서 왔습니다. Array 점프는 밀집 배열 콜백(<code>forEach</code>/<code>map</code>/<code>filter</code>/…)의 <code>thisArg</code>, 배열형 <code>ToLength</code>, 스펙 연산 순서, 그리고 인자 0개 검증이었습니다. 디스트럭처링은 평범한, 제너레이터, async-제너레이터, 정적, 그리고 private 클래스 메서드 전반의 파라미터 디스트럭처링을 챙겼습니다.
      </p>
      <p>
        헤드라인 숫자 옆으로, 긴 꼬리의 정확성이 안착했습니다: <code>JSON.parse</code>는 이제 실제 <code>SyntaxError</code>(<code>TypeError</code>가 아님)를 던지고 후행 토큰을 거부합니다; 그 reviver는 스펙 <code>InternalizeJSONProperty</code> 알고리즘을 통해 걷습니다; <code>Object.prototype.toString</code>은 타입드 배열, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp에 대해 올바르게 브랜딩합니다; <code>RegExp.prototype.toString</code>은 <code>/source/flags</code>를 반환합니다; async 제너레이터는 그 <code>yield</code>-awaits-operand 시맨틱을 바르게 잡았습니다. 이것들은 전체 스위트가 아니라 서브셋 레이더입니다 — Perry는 여전히 올라가는 중입니다 — 하지만 이번 달의 오름은 가팔랐습니다.
      </p>

      <h2>Windows가 Fluent로</h2>
      <p>
        Windows는 비주얼 정비를 받았습니다(<a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a> 시리즈). 이제 Perry 윈도우는 기본적으로 현대적 DWM 크롬을 채택합니다 — <strong>Mica 백드롭</strong>, 둥근 모서리, 테마 인식 타이틀 바 — 그리고 공통 컨트롤은 Windows 95 시대의 기본값 대신 <strong>comctl32 v6</strong>를 통해 렌더링됩니다. 윈도우 프로시저는 이제 <code>WM_DPICHANGED</code>를 처리하므로, 스케일링이 섞인 모니터 사이로 윈도우를 끌어도 비트맵으로 늘어나는 대신 또렷하게 유지됩니다.
      </p>
      <p>
        결정적으로, 이 중 어느 것도 옛 <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> &ldquo;리사이즈 후 검은 영역&rdquo; 회귀를 재도입하지 않았습니다: 클라이언트 영역은 여전히 불투명하게 칠해지고, 풀프레임 Mica/Acrylic 블러스루는 명시적 <code>app.setVibrancy(...)</code> 옵트인으로 남아 있습니다. 완전히 현대적인 스택을 원하는 앱을 위한 새 <code>--target windows-winui</code> 백엔드 스캐폴드(WinUI 3)도 있고, <code>perry compile main.ts -o main</code>이 Windows에서 <code>main.exe</code>를 생성해 PowerShell이 실제로 그것을 실행하게 만드는 작지만 실재하는 수정도 있습니다(v0.5.1146).
      </p>

      <h2>새 위젯, 모든 플랫폼</h2>
      <p>
        바로 지난 하루에 두 위젯이 안착했고, 둘 다 Perry가 타깃하는 모든 UI 플랫폼을 아우릅니다:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong>(<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — 컴팩트한 필드 스타일 날짜 컨트롤: macOS의 <code>NSDatePicker</code>, iOS/visionOS의 <code>UIDatePicker</code>(.compact), Windows의 <code>SysDateTimePick32</code>, Android의 <code>android.widget.DatePicker</code>, Linux의 GTK4. 이 모두를 가로지르는 하나의 TS 표면.</li>
        <li><strong>드래그 &amp; 드롭</strong>(<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — 어떤 위젯도 텍스트/파일/URL에 대한 드롭 대상이자 드래그 소스가 될 수 있으며, <code>NSDraggingDestination</code>(AppKit), <code>UIDropInteraction</code>(UIKit), <code>View.setOnDragListener</code>(Android)에 매핑됩니다.</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        이 윈도우 초반에 위젯 선반도 데스크톱과 모바일에 걸쳐 채워졌습니다 — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, 그리고 스와이프 가능한 ImageGallery — 각각 모든 플랫폼에서 실제 네이티브 컨트롤로 뒷받침됩니다. HarmonyOS(ArkTS)는 Chart와 TreeView를 얻어(v0.5.893), 다른 것들과 동등성에 도달하기 위해 필요했던 마지막 두 위젯을 채웠습니다.
      </p>

      <h2>GC, 내부, 그리고 안정성</h2>
      <p>
        그 270개 릴리스의 대부분은 헤드라인이 아닙니다 — 버그 수정과 내부이며, 그것이 이 단계의 핵심입니다. 짚어둘 만한 몇 가지:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC가 이어졌습니다.</strong> GC 글의 조건부 프리 리스트 작업이 계속 자리를 잡았고, 한 부류의 날카로운 버그가 닫혔습니다: 네이티브 브리지된 프로미스는 이제 tokio 워커에서 처리 중인 동안 <strong>핀 처리</strong>되어, GC가 해소가 안착하기 전에 그것들을 스윕할 수 없습니다(v0.5.923). 부하 상태에서 async fetch를 실행하다 유령 컬렉션을 봤다면, 그게 이것이었습니다.</li>
        <li><strong>메모리 모델이 문서화됐습니다.</strong> 이제 <code>internals/memory-model.md</code> 심층 분석이 있습니다 — NaN-박싱, 세대별 GC, 섀도 스택, 그리고 쓰기 배리어 — 가 문서 사이트에 연결됐습니다(v0.5.933).</li>
        <li><strong>npm 스윕이 드러낸 codegen 안정성 수정의 물결</strong>: 재개된 async 스텝 안에서 호출된 모듈 레벨 <code>const</code> 화살표 함수가 더 이상 SIGSEGV하지 않고(v0.5.953), <code>{`try { await rejected } catch { return X }`}</code>가 더 이상 영원히 멈추지 않으며(v0.5.870), 실제 번들이 걸려 넘어지던 한 줌의 <code>js_is_truthy</code> / raw-포인터-범위 크래시가 있었습니다.</li>
      </ul>

      <h2>Apple 정리</h2>
      <p>
        더 작지만 실재하는 것: <code>perry setup ios --development</code>는 이제 개발 빌드용으로 프로비저닝하고(v0.5.1023), Apple 크로스 라이브러리 빌드/링크 경로가 중복 제거되고 포인터 폭 이식성을 갖추게 됐습니다(v0.5.1121/1125) — 이것이 막혀 있던 npm / Homebrew / APT / winget 게시 매트릭스의 발목을 푼 것입니다.
      </p>

      <h2>이로써 도달한 지점</h2>
      <p>
        Perry 뒤의 베팅은 언제나, &ldquo;네이티브 TypeScript&rdquo;는 <em>실제</em> TypeScript가 돌 때에만 의미가 있다는 것이었습니다 — 장난감 서브셋이 아니라, 사람들이 <code>npm install</code>하는 실제 패키지. 이번 달은 대부분 그 작업이었습니다: 자랑할 단일 숫자라기보다는, &ldquo;컴파일된다&rdquo;와 &ldquo;동작한다&rdquo; 사이의 갭을 좁히려는 길고 화려하지 않은 밀어붙임. 적합성 레이더와 npm 동등성 테스트가 우리가 지금 지켜보는 스코어보드이며, 우리는 계속 숫자를 게시할 것입니다 — 좋은 것도, 여전히 불완전한 것도.
      </p>
      <p>
        소스: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
