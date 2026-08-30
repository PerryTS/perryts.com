export default function Content() {
  return (
    <>
      <p>
        6월 16일, 지시는 한 문장이었습니다: <em>&ldquo;Claude Code 폴더를 찾아서 거기 있는 (컴파일되고 압축된) 자바스크립트를 가져와… 우리가 그걸 컴파일할 수 있는지 한번 보자 :D&rdquo;</em> 당연히 나올 법한 반론 — 이건 가혹할 거라는 — 이 돌아오자, 답은 바로 그 진짜 논지였습니다: <em>&ldquo;가혹하긴 하지만 동시에 진짜 배짱 테스트이자 벽 테스트이기도 해, 그래서 하고 싶은 거야. 한계를 찾는 데는 실전 앱만 한 게 없거든.&rdquo;</em>
      </p>
      <p>
        한 달 뒤, Perry로 컴파일된 Anthropic의 Claude Code CLI 바이너리가 실행되고, <code>/login</code>으로 OAuth 플로우를 통과하고, API로부터 실제 응답을 스트리밍하고, 당신이 입력하는 글자를 화면에 그립니다. 거기까지 가는 데 <strong>6월 20일부터 7월 17일 사이 Perry에 머지된 풀 리퀘스트 160개</strong>가 필요했습니다 — no-op이었던 <code>MessageChannel</code>, RegExp 헤더에 빠져 있던 GC 쓰기 배리어, 실제 API에서만 돌고 우리 목(mock)에서는 절대 돌지 않았던 <code>continue</code> 문, 그리고 그 밖에 약 150개 더.
      </p>
      <p>
        이 글은 그 여정을 둘러보는 글입니다. 다른 누군가의 CLI를 컴파일하는 것이 제품이라서가 아니라 — 우리는 이 바이너리를 출시하지 않고, 앞으로도 그럴 일은 없습니다 — 이것이 우리가 지금까지 Perry에 겨눠본 것 중 단연 가장 생산적인 버그 발견 도구이기 때문입니다.
      </p>

      <figure className="my-8">
        <img
          src="/blog/compiling-claude-code/claude-code-session.png"
          alt="/tmp/verify에서 실행되는 Perry 컴파일 Claude Code 바이너리를 보여주는 macOS 터미널: v2.1.112 배너, 성공적인 /login, “awesome, who are you?”라는 프롬프트, 스트리밍되는 답변, 그리고 셸로 돌아가는 깔끔한 종료."
          width={1708}
          height={926}
          className="w-full rounded-lg border border-slate-800"
        />
        <figcaption className="text-sm text-slate-400 mt-3">
          저 명령줄에는 <code>node</code>가 없습니다. <code>/tmp/verify/cc_fptest_dbg25</code>는 배포된 <code>cli.js</code>로부터 <code>perry compile</code>이 만들어낸 단일 네이티브 실행 파일입니다 — 로그인하고, 실제 답변을 스트리밍하고, Ctrl-C로 깔끔하게 종료합니다. 파일명이 질문을 유발하니 미리 답하자면: <code>dbg25</code>는 이 글을 쓰는 시점에도 여전히 진행 중인 GC 조사에서 나온 진단 빌드 시리즈의 25번째 빌드입니다 — 디버그 심벌이 있고, 게다가 쓰기 배리어 생략(write-barrier elision)이 꺼져 있어 <em>모든</em> 배열 저장이 배리어를 발생시킵니다. 이것은 일반 빌드보다 오버헤드가 더 적은 게 아니라 더 많습니다. 아래쪽의 성능 표는 계측되지 않은 다른 바이너리로 측정한 것입니다.
        </figcaption>
      </figure>

      <h2>&ldquo;Claude Code를 컴파일한다&rdquo;는 것이 실제로 의미하는 것</h2>
      <p>
        대상은 npm이 배포하는 산출물입니다. <code>npm pack @anthropic-ai/claude-code@2.1.112</code>를 실행하면 <code>cli.js</code>가 나옵니다: <code>#!/usr/bin/env node</code> 셔뱅이 붙은 <strong>13 MB짜리 압축된, 자체 실행형 JavaScript</strong>입니다. 소스도 없고, 소스맵도 없고, 우리 쪽 빌드 단계도 없습니다. 우리는 그 파일을 수정하지 않은 채로 <code>perry compile</code>에 넘기고 네이티브 실행 파일을 요구합니다.
      </p>
      <p>
        Perry는 약 37분 동안 이것을 씹어 삼켜 <strong>16,023개 함수</strong>에 걸쳐 대략 207 MB의 IR을 만들어내고, 이는 약 180 MB짜리 바이너리로 링크됩니다. 그 함수들은 하나같이 한 글자짜리 이름을 갖고 있고 타입 애너테이션이 없으며, 전체가 ahead-of-time으로 동작해야 합니다 — JIT도 없고, <code>eval</code>도 없고, 컴파일러가 잘못 추측했을 때 인터프리터로 빠져나가는 지연 폴백도 없습니다. Perry가 그 16,023개 함수 중 하나라도 잘못 낮추면(mis-lower), 그것을 잡아줄 것은 아무것도 없습니다.
      </p>
      <p>
        채점 사다리는 우리 내부 스트레스 스위트에서 온 것이며, 의도적으로 가차 없습니다:
      </p>
      <pre><code>{`parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types`}</code></pre>
      <p>
        <code>correct</code>만이 유일하게 의미 있는 등급입니다. Node v26가 오라클이며, Node가 출력하는 것과 바이트 단위로 동일하지 않은 것은 반증되기 전까지는 모두 Perry의 버그입니다.
      </p>

      <h2>하필 이 앱인 이유</h2>
      <p>
        코딩 에이전트 CLI는 ahead-of-time으로 컴파일하기에는 유별나게 적대적인 JavaScript 더미입니다. 바이너리 하나 안에 이런 것들이 들어 있습니다: Ink를 통해 터미널로 재조정(reconcile)되는 React, raw-mode stdin 리더, 매 프레임마다 정규식을 돌리는 ANSI/이모지로 포화된 렌더러, 스트리밍 SSE HTTP 클라이언트, 시작 시 구성되는 zod 스키마, OAuth 플로우, <code>worker_threads</code>, 매크로태스크 스케줄러로 쓰이는 <code>MessageChannel</code>, 파이버 상태를 쥐고 있는 WeakMap, 동적 <code>require</code>, 그리고 파일 디스크립터로 stdout에 쓰는 파일시스템 레이어.
      </p>
      <p>
        이것들 하나하나가 Perry의 서로 다른 서브시스템이며, 이 앱은 그것들을 <em>한꺼번에</em>, 규모 있게, GC 압력 아래에서, 몇 분씩 이어서 돌립니다. 우리 자체 테스트 스위트 — Rust 유닛 테스트 3,000개, TypeScript 회귀 프로그램 수천 개, Node API 패리티 매트릭스, test262 — 는 모두 알려진 동작을 고정하는 데 초점이 맞춰져 있습니다. 이 번들은 아무도 고정할 생각조차 하지 못한 동작을 찾아내는 데 초점이 맞춰져 있습니다.
      </p>

      <h2>벽의 연쇄</h2>
      <p>
        작업은 오직 한 방향으로만 진행됐습니다: 지금의 벽을 넘고, 다음 벽을 찾는 것. 압축해서 정리하면:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">날짜</th>
              <th className="text-left py-2 px-3">마일스톤</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6월 21일</td><td className="py-2 px-3"><code>--help</code>가 네이티브로 실행됨, exit code 0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6월 22일</td><td className="py-2 px-3">실제 서브커맨드가 시작 시 멈추지 않게 됨</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6월 23일</td><td className="py-2 px-3"><code>-p</code>가 api.anthropic.com으로 ESTABLISHED TCP 소켓을 엶</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6월 24일</td><td className="py-2 px-3">zod 스키마가 올바르게 구성됨; 인증 경로 도달</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">6월 27일</td><td className="py-2 px-3">TUI가 렌더링됨 — 로고, 웰컴 박스, 입력 프레임</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7월 9일</td><td className="py-2 px-3">첫 완전한 왕복: 실제 API를 상대로 한 <code>-p</code>가 응답을 출력, exit 0</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7월 10일</td><td className="py-2 px-3">Node-대-Perry 차분 하네스: 12/12 동일</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7월 13일</td><td className="py-2 px-3"><code>-p</code> 텍스트 + JSON, TUI 렌더, 파일시스템에서 Node와 바이트 단위로 동일</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">7월 16일</td><td className="py-2 px-3">입력한 글자가 마침내 입력 줄에 나타남</td></tr>
            <tr><td className="py-2 px-3">7월 17일</td><td className="py-2 px-3">전체 루프를 수동으로 검증: 실행 → <code>/login</code> → API 응답 → 타이핑</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        모든 수정은 최소한의 일반적인(generic) 재현과 함께 독립된 풀 리퀘스트로 업스트림에 올라갔습니다. 그 어느 것도 자신이 어디서 나왔는지 언급하지 않습니다 — 이는 첫날부터의 규칙이었습니다. 체인지로그를 읽는 Perry 사용자는 &ldquo;for-await 드라이버에서 <code>continue</code>가 이터레이터 전진을 건너뛰었다&rdquo;를 보게 되지, &ldquo;우리는 누군가의 CLI를 컴파일하려던 중이었다&rdquo;를 보지 않습니다. 버그는 그것을 드러낸 수단과 무관하게 실재합니다.
      </p>

      <h2>여정을 값지게 만든 다섯 가지 버그</h2>

      <h3>1. MessageChannel은 얌전한 no-op이었다</h3>
      <p>
        <code>--help</code>는 6월 21일에 작동했습니다. <em>진짜</em> 서브커맨드들 — <code>doctor</code>, <code>agents</code>, <code>mcp list</code> — 은 전부 영원히 멈춰 있었습니다. 바쁘게 도는 것도 아니었습니다: <code>sample</code>은 프로세스가 그냥 주차돼 있음을 보여줬고, <code>lsof</code>는 자식 프로세스도, 소켓도 없이 파이프 두 개만 보여줬습니다.
      </p>
      <p>
        Perry의 <code>MessageChannel</code>은 <code>postMessage</code>를 no-op으로, <code>onmessage</code>를 <code>null</code>로 설치했습니다. 메시지 채널을 매크로태스크 스케줄러로 사용하는 React 스케줄러 패턴을 만나기 전까지는 무해합니다:
      </p>
      <pre><code>{`const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick`}</code></pre>
      <p>
        메시지는 버려졌고, 콜백은 한 번도 실행되지 않았고, 이벤트 루프는 자기 자신의 웨이크업 파이프에서 영원히 유휴 상태로 있었습니다. <a href="https://github.com/PerryTS/perry/pull/5530" className="text-amber-400 hover:text-amber-300">#5530</a>은 포트에 진짜 동일 스레드 전달을 부여했습니다 — 얽힌(entangled) 쌍, FIFO 큐, <code>setImmediate</code> 매크로태스크를 통한 전달, 그리고 큐에 쌓인 메시지가 컬렉션에서 살아남도록 하는 GC 루트 스캐너까지.
      </p>

      <h3>2. Object.prototype 위의 접근자 하나가 42초를 잡아먹었다</h3>
      <p>
        멈추기 전에도, 같은 서브커맨드들은 수십 초 동안 CPU에 묶여 있었습니다. 프로파일링은 범용 <code>[[Set]]</code> 경로를 가리켰고, 근본 원인은 프로세스 전역 플래그였습니다.
      </p>
      <p>
        Perry에는 동적 프로퍼티 쓰기를 위한 빠른 경로가 있고, 이는 &ldquo;지금 <code>Object.prototype</code>이 디스크립터를 하나라도 갖고 있는가?&rdquo;라는 조건으로 게이트돼 있습니다. 이 번들은 시작 시 <code>Object.prototype</code>에 딱 하나의 접근자를 설치합니다. 그것이 그 플래그를 프로세스 전체에 걸쳐 뒤집었고, 그 이후로는 프로그램 안의 <em>모든</em> 동적 쓰기가 O(자체-키-개수)인 느린 인터셉션 순회를 타게 됐습니다. 폭이 넓은 객체를 만드는 것이 이차(quadratic)가 돼버렸습니다:
      </p>
      <pre><code>{`20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms`}</code></pre>
      <p>
        <a href="https://github.com/PerryTS/perry/pull/5524" className="text-amber-400 hover:text-amber-300">#5524</a>는 그 전역 플래그를 키 단위 질문으로 교체했습니다 — <em><code>Object.prototype</code>이 <strong>바로 이</strong> 키에 대한 자체 프로퍼티를 갖고 있는가?</em> 존재하지 않는 키는 가로챌 수 없으니, 그 쓰기는 빠른 경로를 타도 안전합니다. 42초 → 23 ms, 인터셉션은 여전히 정확합니다.
      </p>
      <p>
        그런 다음 같은 형태가 클래스 인스턴스에서 다시 나타났고, 빠른 경로는 이를 아예 배제하고 있었습니다: 20,000개 키를 만드는 빌드가 평범한 객체에서는 25 ms였는데, <code>class</code> 인스턴스에서는 44초였습니다. 이것을 신중하게 고치는 게 중요했습니다 — 순진한 프로토타입 체인 검사는 상속된 세터를 건너뛰어 조용히 데이터를 손상시켰을 것입니다 — 그래서 <a href="https://github.com/PerryTS/perry/pull/5528" className="text-amber-400 hover:text-amber-300">#5528</a>은 클래스 레지스트리를 통해 인스턴스의 프로토타입을 해석하고 O(1) 폭넓은-키 인덱스를 추가합니다. 다시 30 ms로, 그리고 다시 선형으로.
      </p>

      <h3>3. 오직 실제 API만이 유발할 수 있었던 버그</h3>
      <p>
        이건 우리가 사람들에게 즐겨 이야기하는 버그입니다. 7월 초에는 컴파일된 바이너리가 우리 로컬 목 서버를 상대로 완전한 <code>-p</code> 턴을 수행했습니다: 연결하고, POST하고, SSE 스트림을 읽고, 응답을 출력하고, exit 0. 그런데 실제 Anthropic API를 상대로는 매번, 영원히 멈춰버렸습니다.
      </p>
      <p>
        디버깅 체인은 이랬습니다: 포워드 프록시 목이 완전한 200 응답이 손상 없이 도착했음을 증명 → 캡처된 실제 바이트 스트림을 먹인 리플레이 목이 그 멈춤을 로컬에서 재현 → SSE 이벤트 목록을 이등분(bisect)해 범인 이벤트를 발견 → 10줄짜리 재현.
      </p>
      <p>
        실제 API는 <code>event: ping</code> 프레임을 보냅니다. 우리 목은 한 번도 그러지 않았습니다. 그리고 <code>ping</code>은 SDK의 스트림 루프가 그냥 <code>continue</code>로 건너뛰는 그 하나의 이벤트입니다. Perry는 <code>for await</code>를 이터레이터 전진이 루프 본문의 <em>맨 아래</em>에 놓인 드라이버로 낮췄습니다:
      </p>
      <pre><code>{`// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}`}</code></pre>
      <p>
        낮춤(lowering) 지점 여섯 곳이 독립적으로 같은 형태를 갖고 있었습니다. <a href="https://github.com/PerryTS/perry/pull/6196" className="text-amber-400 hover:text-amber-300">#6196</a>은 그 모든 곳에서 전진을 맨 위로 옮겼습니다. 우리가 계속 다시 배우는 교훈: 통과하는 목은 그 목에 대한 증거일 뿐입니다.
      </p>

      <h3>4. 자신의 패턴 문자열보다 더 오래 살아남은 정규식</h3>
      <p>
        TUI는 렌더링되다가 몇 초 안에 <code>SIGBUS</code>로 죽곤 했습니다 — 윈도우 리사이즈 스트레스 하네스 아래에서 12번 실행 중 12번 크래시했고, 매번 다른 함수의 다른 주소에서였습니다. 조사에 몇 주가 GC 이론들에 쓰였는데, A/B 테스트가 그것들을 하나씩 반증했습니다. 우리 자신의 &ldquo;수정&rdquo; 하나도 결국 근거가 부실한 것으로 밝혀져 철회해야 했습니다.
      </p>
      <p>
        실제 근본 원인은 Rust 코드 네 줄이었습니다. <code>js_regexp_new</code>는 RegExp 헤더를 할당하고 그 <code>pattern</code>과 <code>flags</code> 문자열 포인터를 원시(raw) 쓰기로 저장합니다 — <strong>쓰기 배리어 없이</strong>. 올드젠 객체가 너서리에서 갓 태어난 문자열을 가리키고 있는데, 컬렉터는 그 엣지에 대해 전혀 통보받지 못했습니다. 마이너 GC가 살아 있는 RegExp 밑에서 그 문자열들을 쓸어가 버렸고, 해제된 슬롯을 다음번에 읽을 때 폴트가 났습니다.
      </p>
      <p>
        왜 하필 여기서만 드러났을까요? 터미널 UI는 정규식으로 포화 상태이기 때문입니다 — ANSI 파싱과 이모지 너비 측정이 매 프레임마다 패턴을 돌립니다 — 그래서 할당과 컬렉션 사이의 그 창(window)이 분당 수천 번씩 넘나들어집니다. 우리의 최소 재현 — 정규식 6,000개에 의도적인 할당 처리량(churn)을 더한 것 — 은 <em>단 한 번도</em> 이를 유발하지 못했습니다. 이 번들은 매번 유발했습니다. <a href="https://github.com/PerryTS/perry/pull/6288" className="text-amber-400 hover:text-amber-300">#6288</a>은 두 필드 모두가 줄곧 필요로 했던 배리어를 추가했습니다.
      </p>

      <h3>5. 당신이 입력한 글자는 분명 거기 있었다. 프레임이 그것을 버렸을 뿐.</h3>
      <p>
        가장 완고했던 벽: UI 전체는 완벽하게 그려졌습니다 — 웰컴 박스, 입력 프레임, 커서 블록, 상태 줄까지. <code>/</code>를 입력하면 커맨드 메뉴가 열렸으니, 키 입력은 React까지 분명 도달하고 있었습니다. 그런데 글자는 입력 줄에 절대 나타나지 않았습니다.
      </p>
      <p>
        계측된 빌드는 Perry가 모든 단계에서 입력된 문자를 정확히 그리고 있음을 보여줬고, 그런 다음 <code>onRender</code>가 그리기 <em>이후</em>에 예외를 던지고 있었습니다 — 그것을 삼켜버리는 Ink의 <code>try/catch</code> 안으로. 프레임은 커밋되기 전에 버려졌고, 그래서 이후의 모든 렌더가 빈 프레임 위에 쌓였습니다. 앱은 당신을 무시하면서도 완전히 건강해 보였습니다.
      </p>
      <p>
        그 하나의 증상 뒤에는 서로 독립된 두 개의 버그가 숨어 있었습니다:
      </p>
      <ul>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6453" className="text-amber-400 hover:text-amber-300">#6453</a> — Perry의 <code>charAt</code>/<code>codePointAt</code>/<code>split</code> 인라인 낮춤(lowering)은 필요한 강제변환 가능성(coercibility) 가드 없이 문자열이 아닌 수신자에 ToString을 호출했습니다. 그래서 <code>undefined.codePointAt(0)</code>은 예외를 던지는 대신 조용히 <code>117</code>을 반환했습니다 — 문자열 <code>&quot;undefined&quot;</code>에서 온, <code>&quot;u&quot;</code>의 코드 포인트입니다. 그럴싸한 데이터를 <em>지어내는</em> 버그는 그냥 크래시하는 버그보다 훨씬 나쁩니다.
          </p>
        </li>
        <li>
          <p>
            <a href="https://github.com/PerryTS/perry/pull/6471" className="text-amber-400 hover:text-amber-300">#6471</a> — 진짜 블로커였습니다. 배열이 커질 때, Perry는 예전 주소에 영구적인 포워딩 스텁을 남깁니다. 마이너 스윕은 올드젠 부모가 여전히 그 스텁 하나를 가리키고 있는 동안에도 그것들을 회수하고 있었습니다: 렌더러의 문자 캐시가 더러워지지(dirty) 않은 페이지 위에 성장 이전 포인터를 쥐고 있었던 것입니다. 오래된 스텁을 통해 읽으면 쓰레기 같은 길이 값이 나왔고, 매 프레임이 중단됐습니다. 이제 마이너 GC는 모든 스텁을 보존하며, 풀 트레이스가 마크를 통해 그것들을 회수합니다.
          </p>
        </li>
      </ul>
      <p>
        이것들을 고치자 세 번째 층이 드러났습니다 — 증분 마킹 도중 블랙(black)으로 태어난 객체는 한 번도 추적(trace)되지 않았고, 그래서 오직 그것들을 통해서만 도달 가능한 것들이 살아 있는 채로 쓸려나갔습니다(<a href="https://github.com/PerryTS/perry/pull/6494" className="text-amber-400 hover:text-amber-300">#6494</a>). 그리고 레이아웃 마스크가 오버플로 슬롯을 과소 보고해서 컬렉터가 그것들을 건너뛰었습니다(<a href="https://github.com/PerryTS/perry/pull/6506" className="text-amber-400 hover:text-amber-300">#6506</a>). 이 둘은 <em>모든</em> 컴파일된 프로그램에서 50번에 한 번꼴로 미스터리 크래시를 만들어내는 종류의 건전성 구멍입니다. 테스트 스위트로는 이것들을 찾아내지 못했을 것입니다.
      </p>

      <h2>13 MB짜리 압축 바이너리를 디버깅하는 법</h2>
      <p>
        위의 것들 중 무엇도 코드를 읽어서 찾을 수 있는 게 아닙니다. 이것을 다룰 수 있게 만들어준 도구들은:
      </p>
      <ul>
        <li>
          <p>
            <strong>Node를 오라클로 삼는 차분(differential) 하네스.</strong> 모든 가설은 <code>node --experimental-strip-types</code>와 Perry 바이너리 양쪽에서 돌아가는 작은 TypeScript 프로그램이 되고, 바이트 단위로 비교됩니다. 이것은 스스로 버그를 찾아내기도 했습니다 — <code>instanceof</code>의 우변으로만 쓰인 클래스 표현식이, 열한 개의 분석 패스 모두가 그 노드 타입을 꿰뚫어보지 못해 데드 코드로 제거된 사례입니다(<a href="https://github.com/PerryTS/perry/pull/6245" className="text-amber-400 hover:text-amber-300">#6245</a>).
          </p>
        </li>
        <li>
          <p>
            <strong>목 API 서버 세 개.</strong> 로깅 목, 실제 응답 바이트를 캡처하는 포워드 프록시, 그리고 그 정확한 바이트를 결정론적으로 되먹여주는 리플레이 서버. &ldquo;프로덕션을 상대로만 멈춘다&rdquo;를 로컬 재현으로 바꿔준 것이 바로 이 리플레이 서버였습니다.
          </p>
        </li>
        <li>
          <p>
            <strong>터미널 쿼리에 응답하는 PTY 하네스.</strong> 멍청한 의사 터미널(pseudo-terminal)은 50바이트와 멈춤만 안겨줍니다. 이 앱은 커서 위치(<code>ESC[6n</code>), 장치 속성(<code>ESC[c</code>), 배경색(<code>OSC 11</code>)을 탐지하고 그리기 전에 응답을 기다립니다. 그것들에 응답해주면 3,331바이트짜리 웰컴 화면 전체를 얻게 됩니다 — 그리고 Node와 Perry 사이에 바이트 단위로 비교 가능한 렌더도 함께요.
          </p>
        </li>
        <li>
          <p>
            <strong>심벌화를 위한 링크 맵.</strong> 스트립된 180 MB짜리 바이너리는 원시 오프셋으로 가득한 크래시 리포트를 만들어냅니다; <code>ld64 -map</code> 출력에 이등분 스크립트를 더하면 그것들이 다시 함수 이름으로 돌아옵니다.
          </p>
        </li>
        <li>
          <p>
            <strong>모든 것을 A/B로.</strong> 그렇게 나온 규칙은 인수인계 노트 맨 위에 대문자로 적혀 있습니다: <em>이론을 그냥 물려받지 말 것 — 검증할 것.</em> 버그 하나에 대해 연달아 나온 네 개의 근본 원인 가설이 각각 A/B 실행으로 반증됐습니다. 우리가 며칠 동안 쫓았던 한 검증기 신호(&ldquo;445개의 누락된 구→신 엣지&rdquo;)는 측정 아티팩트로 밝혀졌습니다 — 그 검사가 remembered set을 지우고 복원하는 사이에 실행되고 있었던 것입니다. 코드 자체의 주석이 이미 그것을 경고하고 있었습니다.
          </p>
        </li>
      </ul>

      <h2>실제로 어디까지 왔는가</h2>
      <p>
        솔직히 말하면: 작동은 합니다. 그리고 느립니다.
      </p>
      <p>
        오늘 기준으로 작동하는 것, 그리고 출력을 비교할 수 있는 곳에서는 Node와 바이트 단위로 동일한 것: 시작, <code>--help</code>, <code>--version</code>, 오류 분류와 JSON 봉투(envelope)를 포함한 실제 API 상대 원샷 <code>-p</code> 모드, TUI 전체 렌더, OAuth <code>/login</code> 플로우, 스트리밍 응답, 그리고 타이핑. 다음은 그 전체 루프를 한 테이크로 담은 것입니다 — 실행, <code>/login</code>, 질문, 스트리밍된 답변, 종료:
      </p>

      <figure className="my-8">
        <video
          controls
          playsInline
          preload="none"
          poster="/blog/compiling-claude-code/claude-code-demo-poster.png"
          className="w-full rounded-lg border border-slate-800"
        >
          <source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4" />
          브라우저가 임베드된 동영상을 지원하지 않습니다.
        </video>
        <figcaption className="text-sm text-slate-400 mt-3">
          63초, 오디오 없음, 두 군데를 잘라냈습니다: OAuth 핸드셰이크의 브라우저 쪽 절반, 그리고 불쑥 튀어나온 macOS 키체인 프롬프트. 터미널 안의 모든 것은 실시간이며 편집되지 않았습니다 — 이 글에서 가장 느린 부분인 시작 지연까지 포함해서요.
        </figcaption>
      </figure>

      <p>
        아직 열려 있는 것이 두 가지 있고, 어쩌면 이 둘은 사실 하나일지도 모릅니다. 지속적인 대화형 사용 약 1분 뒤부터 입력이 등록되지 않습니다 — 크래시도 없고, 에러도 없이, 그냥 멈춥니다. 그리고 <code>ESC</code>는 진행 중인 응답을 중단시키지 못하는데, <code>Ctrl-C</code>는 이제 깔끔하게 종료됩니다 — 일주일 전만 해도 그러지 못했습니다(녹화 끝부분에서 보이는 그 종료가 바로 그것입니다). 인터럽트 경로는 안 되는데 종료 경로는 되는 것은, 입력이 죽는 문제와 같은 용의자를 가리킵니다: 앱 자체의 핸들러가 뭔가 잘못됐다기보다는, 키 입력 이벤트가 앱에 도달하는 것 자체가 멈춘다는 것이죠.
      </p>
      <p>
        성능 그림입니다. 동일한 번들을 실행하는 Node를 기준으로, 정확성이 안착한 그날 시작된 속도 캠페인의 1차 라운드 전후를 측정했습니다. 이 수치들은 7월 17일에 <code>cc_final</code>과 <code>cc_perf2</code>에서 나온 것으로, 위 스크린샷 속 계측 바이너리가 아니라 진단 코드가 전혀 들어가지 않은 평범한 빌드입니다:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">지표</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Perry (7월 17일)</th>
              <th className="text-right py-2 px-3">Perry (이후)</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--version</code></td><td className="text-right py-2 px-3">328 ms</td><td className="text-right py-2 px-3">1,168 ms</td><td className="text-right py-2 px-3"><strong>227 ms</strong></td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>--help</code></td><td className="text-right py-2 px-3">715 ms</td><td className="text-right py-2 px-3">5,071 ms</td><td className="text-right py-2 px-3">4,099 ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">TUI 첫 페인트</td><td className="text-right py-2 px-3">0.76 s</td><td className="text-right py-2 px-3">10.9 s</td><td className="text-right py-2 px-3">8.4 s</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">키 입력 → 페인트 (p50)</td><td className="text-right py-2 px-3">2.2 ms</td><td className="text-right py-2 px-3">111–143 ms</td><td className="text-right py-2 px-3">119–138 ms</td></tr>
            <tr><td className="py-2 px-3">메모리 사용량, 유휴 상태</td><td className="text-right py-2 px-3">290 MB flat</td><td className="text-right py-2 px-3">~420 MB climbing</td><td className="text-right py-2 px-3">~420 MB climbing</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>--version</code>은 이제 <strong>Node를 이깁니다</strong>. 그런데 그 승리의 기원은 민망했습니다: 컴파일된 실행 파일이 300,281개의 심벌을 내보내고 있었고, 그 실행 시간의 약 80%는 dyld가 약한 정의(weak-definition) 합치기를 하는 데 쓰이고 있었습니다. 링커 플래그 하나로 내보내기가 3개로 줄었고, 바이너리는 228 MB에서 197 MB가 됐습니다(<a href="https://github.com/PerryTS/perry/pull/6533" className="text-amber-400 hover:text-amber-300">#6533</a>). 고유한 정규식마다 두 번이 아니라 한 번만 빌드하게 한 것(<a href="https://github.com/PerryTS/perry/pull/6534" className="text-amber-400 hover:text-amber-300">#6534</a>)과 저장별 인터셉션 검사를 캐싱한 것(<a href="https://github.com/PerryTS/perry/pull/6532" className="text-amber-400 hover:text-amber-300">#6532</a>, <a href="https://github.com/PerryTS/perry/pull/6541" className="text-amber-400 hover:text-amber-300">#6541</a>)이 나머지를 해결했습니다.
      </p>
      <p>
        그 197 MB에 대해, 누군가 그걸로 앞서 몰아가기 전에 먼저 말해두자면: Perry는 자체 런타임을 정적으로 링크하고 16,023개 함수 전부에 대해 데드-스트립할 것 없이 미리 머신 코드를 내놓습니다 — 자체 실행형 번들은 사실상 모든 것을 도달 가능하게 만들어서, 기댈 만한 번들 간(cross-bundle) DCE가 없습니다 — 즉 197 MB는 하나의 파일 안에 프로그램 전체<em>와</em> 런타임을 함께 담은 것인 반면, <strong>Node v26 바이너리는 당신의 JavaScript를 단 한 줄도 읽기 전부터 138 MB의 무게</strong>를 갖고 있습니다.
      </p>
      <p>
        키 입력 행은 신중하게 읽어야 하는 행입니다. &ldquo;이후&rdquo; 수치가 더 나빠 보이니까요. 실제로는 아닙니다: 그것들은 반복 실행에 걸친 범위이고 서로 겹치므로, 중앙값은 어느 방향으로도 움직이지 않았습니다 — 이는 회귀가 아니라 실행 간 변동성입니다. 그리고 이는 정확히 우리가 예상했던 바이기도 합니다. 세 변경 모두 링크 단계, 정규식 구성, 그리고 <em>저장(store)</em> 경로를 건드릴 뿐입니다; 키 입력 중앙값을 좌우하는 것은 프로퍼티 <em>읽기(read)</em> 경로, 호출당 루팅 오버헤드, 그리고 키 입력 구간 안에 떨어지는 40–80 ms짜리 GC 스텝입니다. 그 증거는 다음 라운드에서 나왔습니다: get/set 빠른 경로가 필드 접근 마이크로벤치마크를 3배 빠르게 만들었지만 이 수치는 조금도 움직이지 않았습니다(<a href="https://github.com/PerryTS/perry/pull/6539" className="text-amber-400 hover:text-amber-300">#6539</a>). 앱에서 나타나지 않는 마이크로벤치마크 승리는 잘못된 진단이며, 우리에게 바로 그런 것이 하나 있었습니다.
      </p>
      <p>
        메모리 항목은 지금 진행 중인 캠페인입니다. Perry의 복사형 컬렉터는 압축(compact)을 <em>할 수</em> 있습니다 — 문제는 그것이 유휴 상태 약 45초에 한 번꼴로만 자격을 얻는다는 것이고, 그래서 발화 사이에 너서리가 ~300 MB까지 다시 자라나는 반면 Node는 계속 압축함으로써 평평하게 유지된다는 것입니다. 이것은 알고리즘 문제가 아니라 트리거 빈도 문제이며, 이는 우리가 6월에 있던 곳보다 훨씬 나은 위치입니다.
      </p>
      <p>
        그 어느 것도 방치된 상태가 아닙니다. 이 글이 올라가는 지금도 메모리와 성능 캠페인은 <em>진행 중</em>입니다 — GC 트리거 작업은 바로 오늘, 바로 이 바이너리 위에서 돌고 있습니다 — 그래서 위의 성능 표는 이 글에서 우리가 가장 빨리 무효화되길 바라는 부분이고, 빠를수록 좋습니다. 정확성을 통과하는 데는 한 달치의 벽이 필요했습니다. 남은 것은 트리거 빈도 문제와 읽기 경로 문제이고, 둘 다 원인이 파악돼 있고, 둘 다 이미 진행 중입니다. 우리는 이것이 그저 정확한 것을 넘어 매끄럽게 느껴지길 기대하고 있고, 그것이 곧 오리라 기대합니다.
      </p>

      <h2>우리가 이 일을 하는 이유</h2>
      <p>
        160개 수정 중 어느 것도 Claude Code에 관한 것이 아닙니다. RegExp 헤더에 빠져 있던 쓰기 배리어는 부하 아래에서 정규식을 만드는 <em>모든</em> 프로그램에서 메모리를 손상시킵니다. <code>continue</code>를 쓰는 <code>for await</code>는 어떤 스트림 소비자에서든 스핀합니다. 메시지를 흘려버리는 <code>MessageChannel</code>은 React-스케줄러 형태를 가진 모든 앱을 망가뜨립니다. <code>Object.prototype</code> 디스크립터 플래그는 <code>Object.prototype</code>을 건드리는 <em>모든</em> 프로그램을 그것의 가장 폭넓은 객체에서 이차(quadratic)로 만들었습니다.
      </p>
      <p>
        그 버그들은 CI가 초록불인 동안에도, test262 수치가 계속 올라가는 동안에도, Node 패리티 매트릭스가 97%라고 말하는 동안에도, 모두 Perry 안에 그대로 앉아 있었습니다. 그것들을 흔들어 떨어뜨리는 데는 다른 누군가의 압축된 JavaScript 13메가바이트가, 실제 터미널에서 실제 API를 상대로 실제 작업을 하는 것이 필요했습니다.
      </p>
      <p>
        한 가지가 더 있고, 이것이 우리가 가장 재미있어하는 부분입니다. Perry는 손으로만 쓰인 게 아닙니다 — <em>이번</em> 캠페인의 상당 부분을 포함해, 그중 상당량이 Claude Code와 함께 쓰였습니다. 목 서버들, PTY 하네스, 차분 러너, 새벽 4시까지 GC 버그를 이등분하며 보낸 긴 밤들: 에이전트 세션이었고, 사람이 리뷰하고 머지했습니다. Perry 전부는 아니고, 논쟁 없이 그런 것도 아닙니다. 하지만 이 문장이 양방향 모두로 참이라고 할 만큼은 됩니다.
      </p>
      <p>
        Claude Code를 집어삼킨 컴파일러는, 상당 부분, Claude Code로 만들어졌습니다.
      </p>
      <p>
        우리는 계속할 겁니다. 다음 대상들은 이미 대기열에 올라 있습니다.
      </p>

      <hr className="border-slate-800 my-8" />
      <p className="text-sm text-slate-500">
        Perry는 Anthropic과 제휴 관계가 없으며 Anthropic의 보증을 받지 않습니다. Claude Code는 Anthropic PBC의 상표입니다. 여기서 설명한 바이너리는 순전히 컴파일러 테스트 대상으로서, 공개적으로 배포된 npm 패키지로부터 빌드된 것이며 배포되지 않습니다.
      </p>
    </>
  );
}
