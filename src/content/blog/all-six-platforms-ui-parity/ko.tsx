import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Perry의 네이티브 UI 시스템 첫 번째 버전을 출시했을 때, &quot;크로스 플랫폼&quot;이란
        macOS가 잘 작동하고 나머지 5개 플랫폼은 스텁이라는 의미였습니다. v0.2.162인 오늘,
        더 이상 그렇지 않습니다. 6개 플랫폼 모두 — macOS, iOS, iPadOS, Android, Linux, Windows — 가
        완전한 기능 동등성을 공유합니다. 동일한 TypeScript 코드가 모든 타겟에서 네이티브 위젯으로 컴파일됩니다.
      </p>
      <p>
        이 글에서는 v0.2.152부터 v0.2.164 사이에 출시한 내용을 다룹니다: Canvas 위젯,
        완전한 NSTableView 구현, 20개 이상의 UI 위젯,{" "}
        <code className="text-amber-400">perry/system</code> 모듈, 멀티 윈도우 지원, 시스템
        알림, 키체인 액세스, 자동 바이너리 크기 축소, 그리고 컴파일 타임 플러그인 시스템.
        많은 일이 있었습니다.
      </p>

      <h2>위젯 스프린트: 20개 이상의 네이티브 UI 컴포넌트</h2>
      <p>
        가장 큰 도약은 v0.2.155에서 이루어졌으며, 모든 플랫폼에 걸쳐 20개 이상의 UI 위젯이 추가되었습니다.
        Perry의 TypeScript UI API는 이제 실제 앱을 출시하는 데 필요한 컴포넌트를 다룹니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>레이아웃</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>입력</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>표시</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>데이터</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>오버레이</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>드로잉</strong> — Canvas (2D 드로잉 API, 플랫폼별 하드웨어 가속)</li>
      </ul>
      <p>
        이것들은 커스텀 렌더러의 래퍼가 아닙니다. 각 위젯은 플랫폼 고유의 네이티브 컴포넌트로 컴파일됩니다:
        macOS에서는 <code className="text-amber-400">NSButton</code>,{" "}
        iOS에서는 <code className="text-amber-400">UIButton</code>,{" "}
        Linux에서는 <code className="text-amber-400">GtkButton</code>,{" "}
        Android에서는 JNI를 통한 <code className="text-amber-400">android.widget.Button</code>,{" "}
        Windows에서는 <code className="text-amber-400">CreateWindowEx</code>.
        OS가 이를 그리고, 테마를 적용하고, 접근성을 처리합니다 — Perry는 TypeScript API를 연결할 뿐입니다.
      </p>

      <h2>Canvas: TypeScript에서의 2D 드로잉</h2>
      <p>
        기술적으로 가장 흥미로운 추가 기능 중 하나가 Canvas 위젯(v0.2.152)입니다. TypeScript에서 직접
        익숙한 2D 드로잉 API — 베지어 곡선, 채우기, 스트로크, 이미지 블리팅 — 를 제공하며,
        플랫폼의 가속 2D 백엔드로 컴파일됩니다:
        macOS/iOS에서는 Core Graphics, Linux에서는 Cairo, Windows에서는 Direct2D, Android에서는 Skia.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compiles to Core Graphics on macOS, Cairo on Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>Table 위젯: NSTableView가 TypeScript로</h2>
      <p>
        v0.2.163에서 Table 위젯이 추가되었습니다 — 라이브러리에서 가장 복잡한 컴포넌트입니다. macOS에서는
        완전한 delegate/data source 연결을 갖춘 <code className="text-amber-400">NSTableView</code>에 매핑됩니다.
        Linux에서는 GTK4의 <code className="text-amber-400">GtkTreeView</code>를 사용합니다. Windows에서는
        Win32의 <code className="text-amber-400">ListView</code> 컨트롤. Android에서는 JNI를 통해{" "}
        <code className="text-amber-400">RecyclerView</code>에 바인딩됩니다.
      </p>
      <p>
        TypeScript API는 선언적입니다: 컬럼을 정의하고 데이터 소스를 제공하면, Perry가 컴파일 타임에
        플랫폼별 연결을 처리합니다. 컬럼 정렬, 선택 처리, 행 높이
        커스터마이징이 모두 기본으로 작동합니다.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// TypeScript array of objects</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>perry/system 모듈</h2>
      <p>
        v0.2.155에서는 <code className="text-amber-400">perry/system</code>도 도입되었습니다 — 런타임 없이
        플랫폼 시스템 API를 노출하는 TypeScript 모듈입니다: 파일 다이얼로그, 저장 다이얼로그, 알림,
        시트, 키체인 액세스, 시스템 알림, 멀티 윈도우 관리.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — 네이티브 파일 선택기 (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — 네이티브 저장 다이얼로그</li>
        <li><code className="text-amber-400">system.showAlert()</code> — 네이티브 알림 패널</li>
        <li><code className="text-amber-400">system.notify()</code> — OS 알림 (UserNotifications / libnotify / WinRT)</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — 멀티 윈도우 관리</li>
      </ul>
      <p>
        이 모든 것이 네이티브 플랫폼 API를 직접 호출합니다 — Electron IPC도, 웹 뷰 브리지도 없습니다.
        Perry는 TypeScript 호출 지점을 플랫폼 SDK로의 직접 네이티브 함수 호출로 컴파일합니다.
      </p>

      <h2>6개 플랫폼 기능 동등성: v0.2.162</h2>
      <p>
        v0.2.162 마일스톤은 격차를 좁히는 것이었습니다. 이 릴리스 전에는 macOS가 가장 완전한
        기능 세트를 가졌고, iOS는 거의 갖추어졌으며, Linux/Windows/Android는 뒤처져 있었습니다. v0.2.162는
        6개 플랫폼 모두를 같은 수준으로 끌어올렸습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit, 완전한 위젯 세트, Keychain, 알림, 멀티 윈도우, 툴바</li>
        <li><strong>iOS / iPadOS</strong> — UIKit, macOS와 완전한 위젯 동등성, 씬 라이프사이클</li>
        <li><strong>Android</strong> — JNI 브리지, Android Views를 통한 모든 위젯, NDK 크로스 컴파일</li>
        <li><strong>Linux</strong> — GTK4, Table을 포함한 완전한 위젯 세트, 파일 다이얼로그, libsecret 키체인</li>
        <li><strong>Windows</strong> — Win32, 모든 위젯, Windows Credential Store, WinRT 알림</li>
      </ul>
      <p>
        이것은 &quot;하나의 코드베이스, 6개 플랫폼&quot;을 열망이 아닌 현실로 만드는 마일스톤입니다.
        동일한 TypeScript 파일이 일반적인 사용 사례에 대해 플랫폼별
        코드 경로 없이 6개 타겟 모두에서 네이티브 앱으로 컴파일됩니다.
      </p>

      <h2>자동 바이너리 크기 축소</h2>
      <p>
        v0.2.153에서 자동 바이너리 크기 축소가 출시되었습니다 — 컴파일러가 이제 사용되지 않는 코드 경로를
        적극적으로 데드 스트리핑하고, 도달 불가능한 stdlib 함수를 제거하며, 링킹 중 심볼 정의를
        중복 제거합니다. 이전에 약 4 MB로 컴파일되던 일반적인 CLI 도구가 소스 변경 없이
        2 MB 미만으로 줄어듭니다.
      </p>
      <p>
        이것은 실제 배포에 중요합니다. 바이너리가 배포 단위인 경우 — 서버에 복사하거나,
        단일 파일로 배포하거나, 컨테이너에 임베드하는 경우 — 크기는 전송 시간과 스토리지 비용에
        직접 영향을 미칩니다. 바이너리 크기를 무료로 절반으로 줄이는 것은 의미 있는 개선입니다.
      </p>

      <h2>컴파일 타임 플러그인 시스템</h2>
      <p>
        v0.2.152에서 Perry의 플러그인 시스템이 도입되었습니다 — 그리고 이것은 TypeScript 생태계의
        다른 모든 플러그인 시스템과 아키텍처적으로 다릅니다. 런타임 플러그인 로딩 없음,
        IPC 없음, 동적 <code className="text-amber-400">require()</code> 없음. 플러그인은 Perry가 빌드 타임에
        해석하고 컴파일하는 TypeScript 모듈입니다.
      </p>
      <p>
        결과: 플러그인의 런타임 오버헤드가 정확히 제로입니다. 애플리케이션 코드와 같은 바이너리로 컴파일되며,
        플러그인 코드와 호스트 코드 간에 직접 함수 호출이 이루어집니다. 플러그인을 사용하지 않으면
        바이너리에 전혀 나타나지 않습니다. 사용하면 다른 모듈과 마찬가지로 인라인됩니다.
      </p>
      <p>
        이 뒤에 있는 철학에 대해{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          플러그인 시스템은 성능 세금이다
        </Link>에서 다루었습니다. 요약하면: 런타임 플러그인 아키텍처는 성능과 확장성을 트레이드오프합니다.
        빌드 타임 합성은 둘 다 제공합니다.
      </p>

      <h2>언어 개선</h2>
      <p>
        UI 스프린트가 단독으로 일어난 것은 아닙니다 — 컴파일러 자체도 계속 더 강력해졌습니다.
        이러한 릴리스를 통해:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>클래스 표현식</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code>가 올바르게 컴파일됩니다</li>
        <li><strong>제너레이터 변환</strong> — <code className="text-amber-400">function*</code>와 <code className="text-amber-400">yield</code>가 네이티브 스테이트 머신으로 컴파일됩니다</li>
        <li><strong>클래스 필드로서의 Map/Set</strong> — <code className="text-amber-400">private items = new Map()</code>가 코드 생성에서 작동합니다</li>
        <li><strong>FFI 파라미터 타입 강제</strong> — 네이티브 라이브러리 호출이 타입 강제를 자동으로 처리합니다</li>
        <li><strong>바운드 메서드 참조</strong> — <code className="text-amber-400">this.method</code> 참조가 네이티브 모듈(fs, os, path)에서 작동합니다</li>
        <li><code className="text-amber-400">string.match()</code> — 이제 완전히 지원됩니다</li>
        <li><code className="text-amber-400">path.isAbsolute()</code>, 다중 인수 <code className="text-amber-400">path.join()</code>, <code className="text-amber-400">path.resolve()</code></li>
        <li><strong>Web 타겟</strong> — Perry가 이제 하이브리드 배포를 위한 웹 호환 출력으로 컴파일할 수 있습니다</li>
      </ul>

      <h2>다음 단계</h2>
      <p>
        6개 플랫폼 UI 동등성이 출시되었으므로, 다음 단계는 넓이보다 깊이입니다. 현재 작업 중인 것:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>완전한 RegExp 지원 (<code className="text-amber-400">regex.test()</code>, <code className="text-amber-400">string.matchAll()</code>)</li>
        <li>위젯 시스템에서 드래그 앤 드롭, 커스텀 컨텍스트 메뉴, 접근성 레이블</li>
        <li>Perry 진단과 저장 시 컴파일을 위한 VS Code 확장</li>
        <li>패키지 매니저 통합 — Perry 네이티브 패키지를 하나의 명령으로 설치하고 컴파일</li>
        <li>브라우저 배포를 위한 WASM 컴파일 타겟</li>
        <li><code className="text-amber-400">Worker</code> 스레드를 통한 멀티스레딩</li>
      </ul>
      <p>
        따라가고 싶으시다면,{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Perry 저장소
        </a>
        가 공개되어 있습니다.{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">쇼케이스</Link>
        {" "}에서 이미 구축된 것들을 확인하거나,{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">로드맵</Link>
        {" "}에서 전체 그림을 확인하세요.
      </p>
    </>
  );
}
