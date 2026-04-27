import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry는 TypeScript로 완전히 구축되고 Perry로 컴파일된 네이티브 JSON 뷰어입니다.
        기술 데모가 아닙니다 — API 응답, 설정 파일, 데이터 덤프를 검사하는 데 매일 사용하는
        실제 도구입니다. 이 글에서는 어떻게 구축되었고, 어떻게 컴파일되며, TypeScript가
        네이티브 앱으로 컴파일될 때 개발 경험이 어떤지를 안내합니다.
      </p>

      <h2>Pry의 기능</h2>
      <p>
        Pry는 JSON 파일을 읽거나(또는 stdin에서 JSON을 받아) 네이티브 창에서 인터랙티브하고
        탐색 가능한 트리로 렌더링합니다. macOS의 내장 Quick Look으로 JSON을 본 적이 있다면,
        그것을 상상하세요 — 하지만 더 빠르고, 검색 가능하며, 키보드 기반 내비게이션이 있습니다.
      </p>
      <p>
        기능 세트:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>트리 뷰</strong> — 객체와 배열의 접을 수 있는 노드, 깊이 표시기, 모두 펼치기/접기</li>
        <li><strong>검색</strong> — 키와 값의 전체 텍스트 검색, 실시간 하이라이팅, 매치 내비게이션</li>
        <li><strong>키보드 단축키</strong> — 화살표 키로 탐색, Enter로 펼치기/접기, 슬래시로 검색, <code className="text-perry-400">⌘C</code>로 복사</li>
        <li><strong>클립보드</strong> — 모든 노드 또는 하위 트리를 포맷된 JSON으로 복사</li>
        <li><strong>구문 색상 지정</strong> — 문자열은 녹색, 숫자는 주황색, 불리언은 보라색, null은 빨간색</li>
        <li><strong>상태 바</strong> — 총 노드 수, 현재 깊이, 파일 크기, 파싱 시간 표시</li>
      </ul>

      <h2>소스 코드</h2>
      <p>
        Pry는 표준 TypeScript로 작성되었습니다. 특별한 문법도, 매크로도, 빌드 시점 코드 생성도
        없습니다. 플랫폼별 코드로 컴파일되는 네이티브 위젯을 제공하는 Perry의 UI API를 사용합니다.
      </p>
      <p>
        다음은 진입점입니다(명확성을 위해 간소화):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        이것이 네이티브 애플리케이션의 핵심입니다. 프레임워크 보일러플레이트 없이, 빌드 설정 없이,
        플랫폼별 파일 없이. 하나의 TypeScript 파일입니다.
      </p>

      <h3>헬퍼 함수</h3>
      <p>
        Pry에는 JSON 트리의 모든 노드를 재귀적으로 세는 <code className="text-perry-400">countNodes</code>
        유틸리티와 파일 크기를 표시하기 위한 <code className="text-perry-400">formatBytes</code>
        헬퍼도 포함되어 있습니다. 이들은 표준 TypeScript 함수이며 Perry 고유의 것은 없습니다.
        다른 모든 것과 마찬가지로 네이티브 코드로 컴파일됩니다.
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>Pry 컴파일</h2>
      <p>
        Perry로 Pry를 컴파일하는 것은 단일 명령입니다. Xcode 프로젝트도, Gradle 설정도,
        webpack 설정도 없습니다. Perry를 진입 파일에 지정하고 타겟을 설정하면 됩니다.
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        바이너리가 48 MB인 이유는 전체 AppKit UI 스택 — 트리 뷰 렌더링, 검색 하이라이팅,
        구문 색상 지정, 키보드 처리를 포함하기 때문입니다. 비교하면 같은 앱이 Electron에서는
        200+ MB입니다. CLI 전용 Perry 앱은 2~5 MB로 컴파일됩니다.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        iOS 빌드는 AppKit 대신 UIKit에 링크합니다. Perry는 동일한{" "}
        <code className="text-perry-400">TreeView</code> API를 확장 가능한 섹션이 있는
        <code className="text-perry-400">UITableView</code>에, <code className="text-perry-400">SearchBar</code>를{" "}
        <code className="text-perry-400">UISearchBar</code>에 매핑하고, 터치 이벤트가 마우스 이벤트를 대체합니다.
        iOS 빌드는 실제 기기와 시뮬레이터에 배포할 수 있습니다.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Android 빌드는 JNI를 통해 로드되는 네이티브 라이브러리를 생성하여 APK에 패키징합니다.{" "}
        <code className="text-perry-400">TreeView</code>는 확장 가능한 뷰 홀더가 있는
        <code className="text-perry-400">RecyclerView</code>에 매핑되고,
        <code className="text-perry-400">SearchBar</code>는 <code className="text-perry-400">TextWatcher</code>가 있는{" "}
        <code className="text-perry-400">EditText</code>에 매핑되며, 상태 바는 레이아웃 하단의
        <code className="text-perry-400">TextView</code>에 매핑됩니다.
      </p>

      <h2>내부적으로 일어나는 일</h2>
      <p>
        Perry가 Pry를 컴파일할 때 여러 단계를 거칩니다:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>파싱</strong> — SWC가 TypeScript 소스를 AST로 파싱합니다.{" "}
          <code className="text-perry-400">perry/ui</code>와 <code className="text-perry-400">perry/fs</code>에서의
          import는 Perry의 내장 모듈 구현으로 해석됩니다.
        </li>
        <li>
          <strong>타입 분석</strong> — Perry는 제네릭{" "}
          <code className="text-perry-400">State&lt;string&gt;</code>과{" "}
          <code className="text-perry-400">State&lt;number&gt;</code>를 포함한 모든 타입을 해석하여
          구체적인 타입으로 단형화합니다.
        </li>
        <li>
          <strong>플랫폼 해석</strong> — 타겟 플래그에 따라 Perry는 적절한 UI 백엔드를 선택합니다.
          각 <code className="text-perry-400">TreeView</code>,{" "}
          <code className="text-perry-400">SearchBar</code>, <code className="text-perry-400">Button</code> 호출이
          플랫폼별 구현으로 해석됩니다.
        </li>
        <li>
          <strong>IR 생성</strong> — Perry는 네이티브 API 호출을 포함하는 중간 표현을 생성합니다 —
          macOS/iOS용 Objective-C 메시지 전송, Android용 JNI 호출, GTK4/Win32용 C 함수 호출.
        </li>
        <li>
          <strong>코드 생성</strong> — Cranelift가 대상 아키텍처용 네이티브 머신 코드로 IR을 컴파일합니다.
        </li>
        <li>
          <strong>링킹</strong> — 네이티브 코드가 플랫폼 프레임워크(AppKit, UIKit, Android NDK, GTK4, Win32)에
          링크되어 최종 실행 파일이 생성됩니다.
        </li>
      </ol>

      <h2>런타임 없음, 웹 뷰 없음</h2>
      <p>
        이것은 Perry와 다른 모든 TypeScript-to-native 접근 방식의 핵심적인 차이이므로
        강조할 가치가 있습니다. 컴파일된 Pry 바이너리에는:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>JavaScript 엔진 없음</strong> — V8 없음, Hermes 없음, JavaScriptCore 없음</li>
        <li><strong>웹 뷰 없음</strong> — Chromium 없음, WebKit 없음, WKWebView 없음</li>
        <li><strong>브리지 레이어 없음</strong> — JS와 네이티브 간의 직렬화된 메시지 없음</li>
        <li><strong>프레임워크 런타임 없음</strong> — React 없음, Flutter 엔진 없음, Dart VM 없음</li>
      </ul>
      <p>
        바이너리는 플랫폼 API를 직접 호출합니다. macOS에서는 AppKit 객체와 상호작용하기 위해{" "}
        <code className="text-perry-400">objc_msgSend</code>를 호출합니다. Android에서는
        뷰를 생성하고 조작하기 위해 JNI 함수를 호출합니다. 네이티브 Swift나 Kotlin 앱과
        동일한 일을 합니다.
      </p>
      <p>
        실질적인 결과: Pry는 즉시 시작됩니다. VM 시작 없음, JIT 워밍업 없음,
        스크립트 파싱 없음. 프로세스가 시작되고, 창이 나타나고, JSON이 렌더링됩니다.
        메모리 사용량은 Electron 동등품이 소비하는 것의 일부입니다.
      </p>

      <h2>개발 경험</h2>
      <p>
        Pry를 구축하는 것은 일반적인 TypeScript 애플리케이션을 구축하는 것과 놀라울 정도로 유사했습니다.
        워크플로우:
      </p>
      <ol className="list-decimal list-inside">
        <li>선호하는 에디터(VS Code, Zed, Neovim 등)에서 TypeScript 작성</li>
        <li><code className="text-perry-400">perry compile pry.ts</code> 실행</li>
        <li><code className="text-perry-400">./pry test.json</code> 실행</li>
        <li>반복</li>
      </ol>
      <p>
        설정할 Xcode 프로젝트 없음. 설치할 Android Studio 없음. 45초 걸리는
        Gradle 빌드 없음. Perry 컴파일러 자체는 빠르며 — Pry의 파싱과 컴파일에 몇 초밖에
        걸리지 않으며, 더 빠르게 만들기 위해 적극적으로 작업 중입니다.
      </p>
      <p>
        작성하는 TypeScript는 표준 TypeScript입니다. 에디터의 타입 체킹, 자동 완성,
        리팩터링 도구가 모두 작동합니다. 함수 추출, 모듈 생성, 제네릭 사용 —
        이미 알고 있는 모든 TypeScript 패턴을 사용할 수 있습니다.
      </p>

      <h2>배운 것들</h2>
      <p>
        Pry를 구축하면서 Perry의 UI API가 무엇을 지원해야 하는지에 대해 많이 배웠습니다. 몇 가지 교훈:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>트리 뷰는 복잡합니다.</strong> 펼치기, 접기, 검색 하이라이팅, 키보드 내비게이션,
          클립보드 통합 모두를 조율해야 합니다. Perry의{" "}
          <code className="text-perry-400">TreeView</code> 위젯이 내부적으로 이를 처리하지만,
          네이티브 구현이 세 플랫폼 모두에서 일관되도록 확인해야 했습니다.
        </li>
        <li>
          <strong>키보드 단축키에는 플랫폼 관례가 필요합니다.</strong> macOS에서 복사는{" "}
          <code className="text-perry-400">⌘C</code>입니다. Linux와 Android에서는{" "}
          <code className="text-perry-400">Ctrl+C</code>입니다. Perry의 단축키 시스템이 이를 추상화하지만,
          올바르게 작동하도록 신중한 구현이 필요했습니다.
        </li>
        <li>
          <strong>상태 바는 의외로 간단하지 않습니다.</strong> 각 플랫폼은 상태 정보를 어디에 어떻게
          표시할지에 대한 다른 관례를 가지고 있습니다. AppKit은 창의 하단 바, UIKit은 툴바,
          Android는 레이아웃 내 하단 뷰를 사용합니다. Perry의{" "}
          <code className="text-perry-400">StatusBar</code>는 각각에 올바르게 매핑됩니다.
        </li>
        <li>
          <strong>stdin 지원에는 플랫폼 인식이 필요했습니다.</strong> macOS와 Linux에서는
          stdin에서 읽는 것이 간단합니다. iOS와 Android에서는 &quot;stdin&quot;이 같은 방식으로
          존재하지 않으므로, Pry는 모바일 플랫폼에서 파일 선택을 대신 사용합니다. Perry의{" "}
          <code className="text-perry-400">readStdin</code>이 이를 투명하게 처리합니다.
        </li>
      </ul>

      <h2>성능</h2>
      <p>
        Pry는 큰 JSON 파일을 편안하게 처리합니다. 테스트 결과:
      </p>
      <ul className="list-disc list-inside">
        <li>1 MB JSON 파일(10,000+ 노드)을 50 ms 미만으로 파싱 및 렌더링</li>
        <li>10 MB JSON 파일을 200 ms 미만으로 렌더링</li>
        <li>10,000 노드의 검색 결과가 입력하는 동안 실시간으로 표시, 눈에 보이는 지연 없음</li>
        <li>큰 파일에서도 메모리 사용량이 50 MB 미만</li>
      </ul>
      <p>
        이것이 네이티브 컴파일의 장점입니다. Perry에서의 JSON 파싱은 GC 일시 중지 없는
        밀접한 네이티브 루프로 컴파일됩니다. 트리 렌더링에는 플랫폼 고유의 가상화 리스트 뷰
        (NSOutlineView, UITableView, RecyclerView)를 사용하며,
        성능이 검증되어 있습니다.
      </p>

      <h2>소스 및 다운로드</h2>
      <p>
        Pry는 오픈 소스입니다. 전체 소스를 탐색하거나, 직접 빌드하거나,
        Perry 네이티브 UI 앱의 구조를 이해하기 위해 코드를 살펴볼 수 있습니다.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/perryts/pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            GitHub 저장소
          </a>{" "}
          — 전체 소스 코드와 빌드 지침
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            쇼케이스 페이지
          </Link>{" "}
          — 스크린샷, 기능 목록, 플랫폼 상세 정보
        </li>
      </ul>
      <p>
        Perry로 무언가를 구축하고 있다면, 알려주세요.{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          Perry 저장소
        </a>{" "}
        에서 이슈를 열거나 토론을 시작하세요. 우리는 공개적으로 Perry를 개발하고 있으며,
        실제 앱을 만드는 실제 사용자의 피드백은 매우 소중합니다.
      </p>
    </>
  );
}
