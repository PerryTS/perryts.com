export default function Content() {
  return (
    <>
      <p>
        Perry는 이제 세 가지 주요 TypeScript 프레임워크 — Hono, tRPC, Strapi — 를 네이티브 ARM64
        실행 파일로 컴파일합니다. 1초 미만으로 컴파일하고, 2 MB 미만의 바이너리를 생성하며,
        크래시 없이 실행됩니다.
      </p>
      <p>
        이 글에서는 무엇이 작동하는지, 아직 작동하지 않는 것은 무엇인지, 그리고 실제 코드에 대해
        컴파일러를 시험하면서 배운 것을 다룹니다.
      </p>

      <h2>프로젝트</h2>
      <p>
        TypeScript의 다양한 형태를 대표하기 때문에 이 세 가지를 선택했습니다:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — 경량 웹 프레임워크(29개 모듈). 제네릭, 클래스 상속, 동적 메서드 할당,
          <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>{" "}
          Web API를 많이 사용. 배럴 파일을 통한 이름 지정 재수출을 사용하는 내보내기 구조.
        </li>
        <li>
          <strong>tRPC</strong> — 타입 안전 RPC 프레임워크(52개 모듈). 4단계 이상의 깊은 재수출 체인,
          제네릭 타입 축소를 사용하는 빌더 패턴, 모듈 스코프에서의 클래스 인스턴스화,
          Web Streams를 통한 스트리밍.
        </li>
        <li>
          <strong>Strapi</strong> — 헤드리스 CMS 코어(4개 모듈이 네이티브 컴파일, 나머지는 외부로 해석).
          워크스페이스 패키지 해석을 포함한 모노레포, 네임스페이스 재수출
          (<code className="text-perry-400">export * as X</code>),{" "}
          <code className="text-perry-400">Map</code>을 사용한 서비스 컨테이너 패턴, 팩토리 함수.
        </li>
      </ul>

      <h2>컴파일 결과</h2>
      <p>
        세 가지 모두 컴파일 오류 없이 네이티브 바이너리로 컴파일됩니다:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">프로젝트</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">컴파일된 모듈</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">바이너리 크기</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">컴파일 시간</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        모든 소스 모듈이 전체 파이프라인을 거칩니다: SWC 파싱, HIR 로워링, Cranelift 코드 생성,
        오브젝트 파일 출력, 네이티브 링킹. 컴파일 시간에는 파싱부터 최종 링크까지 모두 포함됩니다.
      </p>
      <p>
        참고로, tRPC만의 <code className="text-perry-400">tsc --noEmit</code>에 수초가 걸립니다.
        Perry는 52개 모듈을 링크된 네이티브 바이너리로 1초 미만에 컴파일합니다.
      </p>

      <h2>런타임에서 작동하는 것</h2>

      <h3>크로스 모듈 클래스 인스턴스화</h3>
      <p>
        이것이 큰 이정표였습니다. Hono의 내보내기 구조:
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">hono export chain</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500">// hono/src/hono.ts</p>
          <p><span className="text-purple-400">export class</span> <span className="text-yellow-400">Hono</span> <span className="text-purple-400">extends</span> <span className="text-cyan-400">HonoBase</span> {"{"} ... {"}"}</p>
          <p className="mt-3 text-slate-500">// hono/src/index.ts</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;./hono&apos;</span></p>
          <p><span className="text-purple-400">export</span> {"{"} <span className="text-cyan-400">Hono</span> {"}"}</p>
        </div>
      </div>
      <p>
        이 <code className="text-perry-400">export {"{"} Hono {"}"}</code>는 이름 지정 재수출입니다 —
        <code className="text-perry-400">export * from</code>도{" "}
        <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code>도 아닙니다.
        Perry의 HIR에서 이것은 <code className="text-perry-400">Export::Named</code>가 되며,
        <code className="text-perry-400">Export::ReExport</code>나{" "}
        <code className="text-perry-400">Export::ExportAll</code>이 아닙니다. 이전에 컴파일러의 클래스 전파는
        <code className="text-perry-400">ExportAll</code>과 <code className="text-perry-400">ReExport</code>
        체인만 따라갔기 때문에, <code className="text-perry-400">index.ts</code>에서{" "}
        <code className="text-perry-400">Hono</code>를 가져오면 조용히 실패하여{" "}
        <code className="text-perry-400">new Hono()</code>가 <code className="text-perry-400">undefined</code>를
        반환했습니다.
      </p>
      <p>
        이제 Perry는 <code className="text-perry-400">Export::Named</code>를 모듈의 import를 거슬러
        원래 클래스 정의를 찾아 전파합니다. 결과:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> ./perry compile test_hono.ts -o /tmp/test-hono && /tmp/test-hono</p>
          <p className="mt-2"><span className="text-slate-400">[1] Class instantiation through named re-export chain</span></p>
          <p className="text-green-400">  PASS: new Hono() returned a real object</p>
          <p><span className="text-slate-400">[2] Constructor-initialized fields</span></p>
          <p className="text-green-400">  PASS: app.router initialized by constructor</p>
          <p className="text-green-400">  PASS: app.router.name = SmartRouter</p>
          <p><span className="text-slate-400">[5] Multiple instances</span></p>
          <p className="text-green-400">  PASS: second instance created with router</p>
          <p><span className="text-slate-400">[6] Constructor with options</span></p>
          <p className="text-green-400">  PASS: new Hono({"{"} strict: false {"}"}) accepted options</p>
        </div>
      </div>
      <p>
        Hono 생성자가 실행되고, <code className="text-perry-400">SmartRouter</code>(내부에서{" "}
        <code className="text-perry-400">RegExpRouter</code>와 <code className="text-perry-400">TrieRouter</code> 모두를
        생성)를 초기화하고, 실제 객체를 반환합니다. 독립적인 여러 인스턴스가 작동합니다.
        생성자 옵션도 수락됩니다.
      </p>

      <h3>다중 레벨 재수출 해석</h3>
      <p>
        tRPC의 <code className="text-perry-400">initTRPC</code>는 4단계 깊이에 있습니다:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">initTRPC.ts</span>                          <span className="text-slate-600">(export const initTRPC = ...)</span></p>
          <p><span className="text-slate-400">  -&gt; unstable-core-do-not-import.ts</span>  <span className="text-slate-600">(export * from &apos;./initTRPC&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; @trpc/server/index.ts</span>           <span className="text-slate-600">(export {"{"} initTRPC {"}"} from &apos;../../..&apos;)</span></p>
          <p><span className="text-slate-400">  -&gt; index.ts</span>                        <span className="text-slate-600">(export * from &apos;./@trpc/server&apos;)</span></p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">ExportAll</code> →{" "}
        <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>입니다.
        Perry는 전체 체인을 해석합니다 — <code className="text-perry-400">initTRPC</code>는 컴파일된 바이너리에서
        접근 가능합니다. 같은 경로를 따르는 <code className="text-perry-400">TRPCError</code>도 마찬가지입니다.
      </p>

      <h3>인수가 있는 크로스 모듈 클래스 인스턴스화</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">err</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCError</span>({"{"} code: <span className="text-green-400">&apos;NOT_FOUND&apos;</span>, message: <span className="text-green-400">&apos;resource missing&apos;</span> {"}"})</p>
          <p className="text-green-400">// PASS: new TRPCError() returned object</p>
          <p className="text-green-400">// PASS: err.code = NOT_FOUND</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">TRPCError</code>는 하나의 모듈에서 정의되고, 세 개의 중간 배럴 파일을 통해
        재수출되며, 테스트에서 가져와 옵션 객체로 인스턴스화됩니다.
        인스턴스의 <code className="text-perry-400">code</code> 필드에 접근 가능합니다.
      </p>

      <h3>모노레포에서의 패키지 해석</h3>
      <p>
        Strapi는 워크스페이스 패키지를 사용합니다 — <code className="text-perry-400">@strapi/core</code>는
        모노레포 내 형제 패키지이며, npm 의존성이 아닙니다. Perry는{" "}
        <code className="text-perry-400">package.json</code> exports 필드를 통해 베어 지정자를 해석합니다:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-green-400">&quot;exports&quot;</span>: {"{"}</p>
          <p>  <span className="text-green-400">&quot;.&quot;</span>: {"{"} <span className="text-green-400">&quot;source&quot;</span>: <span className="text-green-400">&quot;./src/index.ts&quot;</span>, <span className="text-green-400">&quot;import&quot;</span>: <span className="text-green-400">&quot;./dist/index.mjs&quot;</span> {"}"}</p>
          <p>{"}"}</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">createStrapi</code> 함수는{" "}
        <code className="text-perry-400">export * from &apos;@strapi/core&apos;</code>를 통해 호출 가능한
        함수로 올바르게 해석됩니다.
      </p>

      <h3>타입 전용 내보내기 필터링</h3>
      <p>
        TypeScript의 <code className="text-perry-400">export type {"{"} Foo {"}"}</code> 문법은 런타임에서
        의미가 없지만, 이전에 Perry는 이것들을 실제{" "}
        <code className="text-perry-400">Export::ReExport</code> 항목으로 변환하여 링커를 통해 전파하고
        스텁 심볼을 생성했습니다. Hono의 <code className="text-perry-400">index.ts</code>만으로도
        수십 개의 타입을 포함하는 4개의 <code className="text-perry-400">export type</code> 선언이 있습니다.
      </p>
      <p>
        이제 Perry는 <code className="text-perry-400">ExportNamed</code> 선언의 SWC{" "}
        <code className="text-perry-400">type_only</code> 플래그와 개별 지정자의{" "}
        <code className="text-perry-400">is_type_only</code>를 확인하여 HIR 로워링 중 건너뜁니다.
        이로써 세 프로젝트 모두에서 타입 재수출으로 인한 데드 스텁 생성이 제거되었습니다.
      </p>

      <h3>RegExp 생성자</h3>
      <p>
        <code className="text-perry-400">new RegExp(pattern, flags)</code>는 이제 Perry의 기존{" "}
        <code className="text-perry-400">js_regexp_new</code> 런타임 함수로 컴파일됩니다.
        런타임은 이미 RegExp를 지원했지만, <code className="text-perry-400">Expr::New</code> 코드 생성
        핸들러에 해당 케이스가 없어서 모든 <code className="text-perry-400">new RegExp(...)</code>가
        &quot;Unknown class&quot; 경고로 빠졌습니다. Hono의 <code className="text-perry-400">RegExpRouter</code>가
        이를 광범위하게 사용합니다.
      </p>

      <h2>아직 작동하지 않는 것</h2>
      <p>
        갭은 성공만큼이나 중요한 정보를 전달하므로 구체적으로 설명합니다.
      </p>

      <h3><code className="text-perry-400">this</code>에 대한 동적 프로퍼티 할당</h3>
      <p>
        Hono의 생성자는 HTTP 메서드 핸들러를 동적으로 설정합니다:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">allMethods</span> = [<span className="text-green-400">&apos;get&apos;</span>, <span className="text-green-400">&apos;post&apos;</span>, <span className="text-green-400">&apos;put&apos;</span>, <span className="text-green-400">&apos;delete&apos;</span>, ...]</p>
          <p><span className="text-cyan-400">allMethods</span>.<span className="text-yellow-400">forEach</span>((<span className="text-cyan-400">method</span>) =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">this</span>[<span className="text-cyan-400">method</span>] = (<span className="text-cyan-400">args1</span>, ...<span className="text-cyan-400">args</span>) =&gt; {"{"}</p>
          <p>    <span className="text-slate-500">// register route</span></p>
          <p>    <span className="text-purple-400">return this</span></p>
          <p>  {"}"}</p>
          <p>{"}"})</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">app.get</code>, <code className="text-perry-400">app.post</code>
        등은 정적으로 선언되지 않으며, 계산된 프로퍼티 이름을 통해 런타임에 할당됩니다.
        Perry는 아직 <code className="text-perry-400">this[variable] = value</code>를 지원하지 않으므로
        이 메서드들이 누락됩니다:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">[4] Dynamic method assignment (this[method] = ...)</span></p>
          <p className="text-amber-400">  INFO: app.get not available</p>
          <p className="text-amber-400">  INFO: app.on not available</p>
        </div>
      </div>
      <p>
        Hono에 대한 가장 큰 단일 갭입니다. Hono 클래스는 존재하고 라우터가 초기화되지만,
        라우트를 등록할 수 없습니다.
      </p>

      <h3>모듈 수준 생성자 호출</h3>
      <p>
        tRPC는 진입점을 다음과 같이 정의합니다:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">export const</span> <span className="text-cyan-400">initTRPC</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCBuilder</span>()</p>
        </div>
      </div>
      <p>
        런타임에서 <code className="text-perry-400">initTRPC</code>는{" "}
        <code className="text-perry-400">typeof object</code>가 아닌{" "}
        <code className="text-perry-400">typeof function</code>으로 나타납니다 —
        모듈 수준의 <code className="text-perry-400">new TRPCBuilder()</code> 표현식이 생성자를
        실행하지 않으므로 인스턴스가 아닌 클래스에 대한 참조를 얻습니다. 따라서{" "}
        <code className="text-perry-400">initTRPC.create()</code>와{" "}
        <code className="text-perry-400">initTRPC.context()</code>는 모두{" "}
        <code className="text-perry-400">undefined</code>입니다.
      </p>

      <h3>상속된 프로퍼티</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code>에서{" "}
        <code className="text-perry-400">TRPCError</code>에 직접 정의된{" "}
        <code className="text-perry-400">err.code</code>는 작동하지만,{" "}
        <code className="text-perry-400">Error</code>에서 상속된{" "}
        <code className="text-perry-400">err.message</code>에는 접근할 수 없습니다.
        프로퍼티 조회를 위한 프로토타입 체인이 완전히 구현되지 않았습니다.
      </p>

      <h3>복잡한 생성자 체인</h3>
      <p>
        Strapi의 <code className="text-perry-400">createStrapi()</code> 함수는 내부적으로{" "}
        <code className="text-perry-400">new Strapi(opts)</code>를 호출하며, 이는{" "}
        <code className="text-perry-400">Container</code>(<code className="text-perry-400">Map</code>으로 지원)를
        상속하고, <code className="text-perry-400">loadConfiguration()</code>을 호출하고, 프로바이더를 순회하며
        서비스를 등록합니다. 이 깊은 생성자 체인은 거짓 값을 반환합니다 — 크래시하지는 않지만
        사용 가능한 인스턴스도 생성하지 않습니다.
      </p>

      <h3>Web API 내장 클래스</h3>
      <p>
        세 프로젝트에서 남아있는 &quot;Unknown class&quot; 경고:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">클래스</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">횟수</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Response", "11"],
              ["TransformStream", "7"],
              ["ReadableStream", "5"],
              ["Request", "4"],
              ["Headers", "3"],
              ["Proxy", "2"],
              ["TextEncoderStream", "2"],
              ["WritableStream", "1"],
              ["DOMException", "1"],
            ].map(([cls, count]) => (
              <tr key={cls} className="border-b border-slate-800">
                <td className="py-2 px-4 text-slate-300 font-mono text-xs">{cls}</td>
                <td className="py-2 px-4 text-slate-400">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>,
        <code className="text-perry-400">Headers</code>가 모든 HTTP 프레임워크에 중요합니다.{" "}
        <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>,{" "}
        <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>,{" "}
        <code className="text-perry-400">AbortController</code> 등에 이미 있는 것과 유사한
        내장 코드 생성 지원이 필요합니다.
      </p>

      <h2>이것이 알려주는 것</h2>
      <p>
        좋은 소식: Perry의 컴파일 파이프라인이 실제 프레임워크 코드를 처리합니다.
        복잡한 재수출 체인, 제네릭이 많은 타입 시그니처, 클래스 계층 구조, 모노레포 패키지 해석을 가진
        다중 파일 프로젝트가 모두 링크된 바이너리까지 도달합니다.
      </p>
      <p>
        갭은 컴파일 갭이 아니라 런타임 갭입니다. 남은 작업:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>동적 프로퍼티 할당</strong> — 메서드를 프로그래밍적으로 설정하는 프레임워크에 필요</li>
        <li><strong>모듈 수준 초기화 표현식</strong> — <code className="text-perry-400">export const x = new Foo()</code>가 실제로 생성자를 실행해야 함</li>
        <li><strong>프로토타입 체인</strong> — 상속된 프로퍼티와 메서드</li>
        <li><strong>Web API 내장</strong> — HTTP 프레임워크를 위한 <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code></li>
      </ol>
      <p>
        이들은 구체적이고 범위가 명확한 문제입니다. 아키텍처 변경이 필요한 것은 없습니다 —
        더 간단한 경우에 이미 작동하는 패턴의 확장입니다.
      </p>
      <p>
        계속 작업하겠습니다. 목표는{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>가
        네이티브 바이너리에서 작동하는 HTTP 서버를 생성하는 것입니다.
      </p>
    </>
  );
}
