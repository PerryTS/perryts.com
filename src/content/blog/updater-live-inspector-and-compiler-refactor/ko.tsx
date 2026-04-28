export default function Content() {
  return (
    <>
      <p>
        지난 글은 <strong>v0.5.306</strong>에서 gen-GC + JSON + 벤치마크 이야기로 마무리됐습니다. 4일이 지난 지금 Perry는 <strong>v0.5.359</strong>에 와 있고 — 그 사이 <strong>53번의 패치 릴리스</strong> — 이야기는 또 달라집니다. 그 릴리스들 중 어느 하나도 벤치마크 숫자를 헤드라인으로 내건 것은 없습니다. 거의 전부가 <strong>트래커의 이슈가 닫히는</strong> 이야기입니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> 도입 — 데스크톱 앱을 위한 Sparkle / Tauri 형태의 자동 업데이트(SHA-256 다이제스트에 대한 Ed25519, 센티넬 롤백, 분리 재시작). 커뮤니티 PR, <strong>TheHypnoo</strong>(<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>).</li>
        <li><strong>Geisterhand 페이즈 D</strong> — <code>http://localhost:7676</code>의 라이브 인스펙터. 위젯 트리, 위젯별 상세, 클릭 디스패치, <code>POST /style/:h</code>를 통한 라이브 스타일 편집.</li>
        <li><strong>컴파일러 리팩터링.</strong> v0.5.329 → v0.5.343에 걸쳐 가장 자주 언급되던 4개 파일이 분할: <code>lower::lower_expr</code> 6,687 → 624 LOC(−91%), <code>compile.rs</code> 9,391 → 3,783 LOC(−60%), <code>lower.rs</code> 13,591 → 7,554 LOC(−44%), <code>lower_call.rs</code> 7,000+ → 4,681 LOC(−33%). 새 <code>walker.rs</code>가 <code>_ =&gt; {}</code> 캐치-올 버그 클래스를 컴파일 에러로 바꿉니다.</li>
        <li><strong>UI 스타일링 페이즈 C 종결</strong> — Apple, Android, GTK4, Windows, Web의 모든 위젯에서 인라인 <code>style: {`{ ... }`}</code> 프로퍼티. Windows는 5개 스텁 중 4개를 연결(decoration / opacity / borders); 남은 것은 <code>widget.shadow</code>뿐(DirectComposition 후속 과제).</li>
        <li><strong>Windows용 Scoop 버킷</strong>: <code>scoop install perry-ts/perry</code>. 릴리스 워크플로의 SHA-256 사이드카.</li>
        <li><strong>커뮤니티 이슈 픽스의 물결</strong> — runtime, codegen, fetch, GTK4, Windows linker, async, stdlib에 걸쳐 약 30개 이슈가 닫혔습니다.</li>
      </ul>

      <h2>1. perry/updater — 데스크톱 앱 자동 업데이트</h2>
      <p>
        픽스 전 Perry에는 업데이트 경로가 없었습니다. 앱은 출시되고, 출시되고, 그게 다였죠. <strong>TheHypnoo</strong>가 <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>로 풀세트를 제안했습니다:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // 이전 실행이 크래시했다면 센티넬 롤백

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // 새 빌드가 성공적으로 시작된 후 호출`}</code></pre>
      <p>
        신뢰 모델: <strong>파일의 SHA-256 다이제스트에 대한 Ed25519</strong>(파일 바이트가 아님 — 큰 바이너리에서도 검증을 저렴하게 유지). 매니페스트는 JSON, 스키마 버전 부여, <code>&lt;os&gt;-&lt;arch&gt;</code> 트리플당 한 항목. <code>&lt;exe&gt;.prev</code> 백업과 함께 원자적 설치, 분리 재시작(Unix는 <code>setsid</code>, Windows는 <code>DETACHED_PROCESS</code>). 모바일은 설계상 제외 — App Store / Play Store가 OS 수준에서 설치 파이프라인을 소유하기 때문입니다.
      </p>
      <p>
        스모크 테스트를 작성하면서 Perry 런타임의 두 가지 특이점이 드러났고, 그 자리에서 함께 수정됐습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code>가 메타데이터 전용 스텁을 반환하고 있었음.</strong> <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a>에서 수정(역시 TheHypnoo) — <code>js_response_array_buffer</code>는 이제 실제 <code>BufferHeader</code>를 할당하고 <code>resp.body</code>를 <code>memcpy</code>로 안에 넣습니다.</li>
        <li><strong><code>fs.appendFileSync</code>가 0 바이트를 썼음.</strong> <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a>에서 수정 — namespace-import lowering 경로(<code>import * as fs from &quot;fs&quot;</code>)에 <code>appendFileSync</code> 분기가 없었고, LLVM codegen 쪽에도 HIR 변형용 분기가 없었습니다. 둘 다 연결됨.</li>
      </ul>
      <p>
        문서는 <code>docs/src/updater/overview.md</code>에 있습니다.
      </p>

      <h2>2. Geisterhand: localhost:7676의 라이브 인스펙터</h2>
      <p>
        Geisterhand는 Perry의 인-프로세스 UI 테스트 하네스였습니다 — 포트 7676의 HTTP API로 위젯 상태를 스냅샷하고 클릭을 디스패치. 페이즈 D는 이걸 어떤 브라우저에서든 열 수 있는 devtools 형태의 인스펙터로 바꿉니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>스텝 1(v0.5.349)</strong> — <code>GET /</code>는 위젯 트리, 위젯별 상세(frame, value, raw JSON), 1.5초 자동 새로고침(일시정지/재개), &ldquo;onClick 발사&rdquo; 액션 버튼을 갖춘 단일 페이지 vanilla-JS UI를 제공합니다. codegen은 macOS lazy-load <code>-dead_strip</code>에 대해 <code>INSPECTOR_HTML</code>을 핀 처리해 릴리스 빌드에서도 살아남게 합니다.</li>
        <li><strong>스텝 2(v0.5.350)</strong> — <code>POST /style/:h</code>는 JSON 프로퍼티 백을 받아 라이브로 적용합니다. 9개 프로퍼티(<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>)가 기존 펌프 큐를 통해 HTTP 스레드 → 메인 스레드로 흐릅니다. 잘못된 JSON → 400; 잘못된 핸들 → 400; 알 수 없는 프로퍼티는 서버 측에서 필터링되며 응답은 통과한 항목을 나열합니다.</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        macOS 디스패처는 연결됐고; Linux / Windows / iOS / tvOS / visionOS / Android는 같은 형태로 다음 차례입니다.
      </p>

      <h2>3. 컴파일러 리팩터링 — 가장 큰 4개 파일을 분할</h2>
      <p>
        트래커의 5개 이슈(<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>, 그리고 긴 꼬리)는 같은 모양이었습니다: <code>ir.rs</code>에 새 <code>Expr</code> 변형이 추가됐는데, <code>lower.rs</code>의 4개 임시 워커 중 하나가 <code>_ =&gt; {}</code> 캐치-올을 가지고 있어 새 변형을 조용히 잘못 컴파일했던 것입니다. 런타임에서 잡는 건 비쌉니다 — 보이지 않을 때도, SSO에서 SIGSEGV가 날 때도 있습니다.
      </p>
      <p>
        <strong>v0.5.329</strong>는 <code>crates/perry-hir/src/walker.rs</code>를 도입했고 <code>walk_expr_children</code> / <code>walk_expr_children_mut</code>를 제공합니다 — 178개 <code>Expr</code> 변형 전체에 대한 exhaustive 매치, <strong>캐치-올 없음</strong>. 새 변형을 여기 등록 없이 추가하면 이제 컴파일 에러입니다. 4개 소비자(<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>)가 다음과 같이 줄었습니다:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">함수</th>
              <th className="text-right py-2 px-3">전</th>
              <th className="text-right py-2 px-3">후</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>find_max_local_id::check_expr</code></td><td className="text-right py-2 px-3">225</td><td className="text-right py-2 px-3">57</td><td className="text-right py-2 px-3">−75%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>substitute_locals</code></td><td className="text-right py-2 px-3">553</td><td className="text-right py-2 px-3">80</td><td className="text-right py-2 px-3">−86%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>collect_local_refs_expr</code></td><td className="text-right py-2 px-3">720</td><td className="text-right py-2 px-3">70</td><td className="text-right py-2 px-3">−90%</td></tr>
            <tr><td className="py-2 px-3"><code>remap_local_ids_in_expr</code></td><td className="text-right py-2 px-3">542</td><td className="text-right py-2 px-3">85</td><td className="text-right py-2 px-3">−84%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        총합: <strong>중복된 descent 1,830줄 감소</strong>, <strong>중앙 집중화된 워커 1,840줄로 대체</strong> — 순증감은 평탄하지만, 버그 클래스는 사라졌습니다.
      </p>
      <p>
        그 다음으로 나머지가 풀렸습니다. <strong>v0.5.331 → v0.5.343</strong>은 14개 커밋에 걸쳐 4개 모놀리스를 잘랐습니다. 헤드라인 숫자:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">파일</th>
              <th className="text-right py-2 px-3">전</th>
              <th className="text-right py-2 px-3">후</th>
              <th className="text-right py-2 px-3">Δ</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower::lower_expr</code></td><td className="text-right py-2 px-3">6,687</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">624</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−91%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>compile.rs</code></td><td className="text-right py-2 px-3">9,391</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">3,783</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">−60%</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>lower.rs</code></td><td className="text-right py-2 px-3">13,591</td><td className="text-right py-2 px-3">7,554</td><td className="text-right py-2 px-3">−44%</td></tr>
            <tr><td className="py-2 px-3"><code>lower_call.rs</code></td><td className="text-right py-2 px-3">7,000+</td><td className="text-right py-2 px-3">4,681</td><td className="text-right py-2 px-3">−33%</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        분할은 19개의 새 초점화된 서브모듈로 안착했습니다: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code>, 그리고 UI / system / i18n 메서드 테이블의 단일 진실의 원천이 된 새 <code>crates/perry-dispatch</code> 크레이트(이슈 <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a>의 &ldquo;macOS에서는 컴파일되지만 web에서 깨짐&rdquo; 류 놀라움을 만들었던 <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> 팬아웃은 이제 단 한 번의 룩업).
      </p>
      <p>
        <strong>Tier 4 퍼포먼스 개선</strong>이 동행했습니다(v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>inline_functions</code>의 두 패스와 <code>compile.rs</code>의 세 rayon 패스를 융합 — 컴파일당 모듈 스캔 5회 + 스케줄러 왕복 3회 절약.</li>
        <li><code>perry dev</code>의 파스 캐시를 500개 항목으로 제한, FIFO 추방. 픽스 전에는 <code>node_modules</code>를 도는 세션이 100MB 이상의 SWC AST를 들고 있을 수 있었습니다.</li>
        <li>codegen 이후 <code>.ll</code> 쓰기 루프를 병렬화 — 50+ 모듈의 SSD에서 wall-time 2–4배 빠름.</li>
        <li>로케일 테이블을 워커마다 클론하는 대신 <code>Arc&lt;I18nTable&gt;</code>.</li>
      </ul>
      <p>
        워크스페이스 테스트는 모든 커밋에서 <strong>434 passed / 0 failed / 5 ignored</strong>를 유지; 갭 테스트는 25/28 베이스라인; 문서 테스트는 80/82 베이스라인.
      </p>

      <h2>4. UI 스타일링 페이즈 C, 마무리</h2>
      <p>
        페이즈 C는 인라인 <code>style: {`{ ... }`}</code>의 롤아웃이었습니다. 스텝 1–7이 이 윈도우에서 마감됐습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — <code>StyleProps</code> 타입 표면 + Button의 인라인 <code>style:</code>.</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — 모든 테이블 위젯에서 color/padding/shadow의 인라인 destructure, 이어서 VStack / HStack.</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — hex 문자열 + 그라디언트 + 동적 값을 위한 런타임 <code>parseColor</code>.</li>
        <li><strong>v0.5.312</strong> — 스타일링 문서 + Windows 트래킹 이슈.</li>
      </ul>
      <p>그리고 크로스 플랫폼 정리:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong>(<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — 스타일링 FFI 4개 연결, 그리고 Linux 문서 테스트 게이트를 막던 7개 누락 FFI(v0.5.322).</li>
        <li><strong>macOS</strong>(v0.5.324) — <code>widget.shadow</code>를 위한 <code>CALayer</code> 그림자 배관 + visual_test 인프라; 비-<code>NSTextField</code> 위젯을 위한 <code>set_color</code> 클래스 프로브.</li>
        <li><strong>iOS / tvOS / visionOS</strong>(v0.5.346) — Button의 <code>color: ...</code>는 <code>UIButton</code>에서 <code>setTextColor:</code>를 치고 있었는데, 그 셀렉터를 구현하지 않고 있었습니다; <code>objc2</code> panic이 <code>extern &quot;C&quot;</code> 경계를 넘어가 프로세스가 abort됐죠. macOS와 동일한 클래스 프로브 패턴으로 수정 — UIButton은 이제 <code>setTitleColor:forState:UIControlStateNormal</code>로 라우팅됩니다.</li>
        <li><strong>Windows</strong>(v0.5.347) — 5개 스타일링 스텁 중 4개 연결(<code>text.decoration</code>은 <code>LOGFONT</code> 라운드트립을 통해, <code>widget.opacity</code>는 <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>를 통해, borders는 <code>SetWindowSubclass</code> + <code>WM_PAINT</code>를 통해). 남은 것은 <code>widget.shadow</code>뿐(DirectComposition 필요).</li>
      </ul>
      <p>
        <code>docs/src/ui/styling-matrix.md</code>의 스타일링 매트릭스는 <strong>Web 43/43 Wired</strong>, <strong>Windows 42/43 Wired</strong>, 나머지는 완전 커버리지로 윈도우를 마칩니다.
      </p>

      <h2>5. 런타임 정확성 패스 — 이슈별로</h2>
      <p>
        이 기간의 테마: 트래커로 들어온 모든 잘못된 컴파일은 픽스 또는 컴파일타임 에러로 변했습니다. 하이라이트:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>(v0.5.323)</strong> — <code>fn</code> 안의 클래스 메서드가 둘러싸고 있는 fn의 로컬을 캡처하지 못했습니다. 멀티모듈 재현은 이제 Node와 바이트 단위로 일치합니다.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a>(v0.5.321 + v0.5.330)</strong> — 7개 문자열 피연산자 사이트에서 SSO-안전한 string-handle 언박싱: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, crypto 다이제스트 입력. 픽스 전에는 인라인 문자열 피연산자에 대해 모두 조용히 쓰레기를 반환하거나 SIGSEGV였습니다.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a>(v0.5.351)</strong> — 모듈 레벨 빈 <code>const</code> 배열이 함수 안에서의 <code>arr[i]=</code> 쓰기를 떨어뜨렸습니다. Bloom-Engine/jump의 <code>discoverLevels()</code>가 <code>LEVEL_FILES</code>를 모듈 레벨에서 인덱스 할당으로 채울 때 레벨 선택 화면이 비어 표시되며 드러났습니다.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a>(v0.5.357)</strong> — async 함수 내부에서의 <code>Array.push</code>가 배열을 파라미터로 받았을 때 16개에서 조용히 막혔습니다. async 함수는 인라인되지 않습니다; 재할당은 호출자에게 보이지 않는 새 포인터를 반환했습니다. 픽스: 성장할 때마다 옛 위치에 포워딩 포인터를 설치, GC의 기존 <code>GC_FLAG_FORWARDED</code> 메커니즘을 재사용.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a>(v0.5.358)</strong> — 호출자가 후행 인자를 생략했을 때 메서드 기본 인자 디스패치가 쓰레기를 전달하고 있었습니다. 두 가지 기여 요소: cross-module 메서드 선언이 <code>arity + 1</code> 대신 6개 double을 하드코딩, 그리고 <code>lower_class_method</code>는 <code>build_default_param_stmts</code>를 전혀 호출하지 않았습니다. mongodb의 <code>findOne(filter, options = {`{}`})</code>가 조용히 멈추는 현상으로 표면화; 픽스는 로컬과 cross-module 디스패치 전반에 걸쳐 균일합니다.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a>(v0.5.355)</strong> — 하나의 재현에서 비롯된 세 개의 독립적 fetch + promise 버그: api.github.com이 익명에 403(이제 기본 User-Agent 설정), <code>.then(console.log)</code>가 영원히 멈춤(null 콜백이 TASK_QUEUE 항목을 푸시하지 않았음), 모든 fetch 거부가 <code>Uncaught exception: [object Object]</code>를 출력(실제 <code>ErrorHeader</code> 대신 NaN-박싱된 맨 <code>*StringHeader</code>).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a>(v0.5.359)</strong> — <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code> 인스턴스 메서드를 갖춘 실제 <code>Blob</code>. 픽스 전에는 <code>await response.blob()</code>가 메타데이터 전용 스텁 <code>{`{size, type}`}</code>을 반환했습니다. 3부 픽스가 runtime + HIR + codegen에 걸쳐 안착.</li>
      </ul>
      <p>그리고 작은 정리:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup이 Linux의 제네릭 단형화를 과하게 깎고 + GTK4 링크 사일런트 폴백. 픽스: 이름 패턴 필터링을 <code>llvm-nm</code>을 통한 <strong>심볼 집합</strong> 비교로 교체. 단 하나라도 고유 심볼을 가진 멤버는 유지. 링크 에러 없이 <code>libperry_ui_macos.a</code>를 196 → 35개 오브젝트로 정리.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — Windows 링크 라인에 <code>secur32.lib</code> 추가.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> FP 라운드트립을 Ryū 경유.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — <code>perry/i18n</code> 포맷 래퍼용 codegen 디스패치 연결.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — <code>perry/plugin</code> codegen 디스패치.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — Canvas 위젯을 LLVM codegen 경유로.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView를 codegen 경유로.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — Table 위젯을 codegen 경유로.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong>(부분) — stdlib 헬퍼 디스패치 분기 11개.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — iOS + Android의 백그라운드 알림 수신(warm-path).</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — watchOS 게임 루프 FFI 훅용 약한 폴백.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — <code>using</code> / <code>await using</code> dispose 훅.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — <code>js_native_call_method</code> 인자 alloca를 entry 블록으로 호이스트.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — <code>substitute_locals</code> Uint8Array 분기.</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — <code>fs.appendFileSync</code>를 엔드투엔드로 연결(커뮤니티 PR).</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        Windows 툴체인 이야기는 계속해서 단순화됩니다. <strong>v0.5.353</strong>은 호스트 빌드에서 <code>clang -target</code>을 핀 처리했습니다 — PATH 상의 비-MSVC clang(MinGW / MSYS2 / Anaconda / Rust GNU 번들)이 Perry의 <code>x86_64-pc-windows-msvc</code> IR을 조용히 <code>windows-gnu</code>로 다시 쓰고 있었고, lld-link는 LLVM의 mingw32 이미터가 삽입한 <code>__main</code> 참조를 해결하지 못하고 있었습니다. 새 <code>probe_clang_default_triple</code>은 프로세스당 한 번 <code>clang --version</code>을 실행하고, 호스트 기본값이 GNU인데 우리가 MSVC를 타깃하고 있을 때 정보 노트를 한 줄 출력합니다. <code>PERRY_NO_CLANG_PROBE=1</code>로 억제 가능.
      </p>
      <p>
        <strong>v0.5.345</strong>는 Win64의 <code>perry-ui</code> ABI를 <code>perry-dispatch</code>와 정렬했습니다 — 3개 런타임 extern 시그니처가 어긋나 있었습니다(<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>). Win64 ABI에서는 정수와 부동소수점 위치 인자가 슬롯 인덱스를 공유하므로, 미스매치는 초기화되지 않은 레지스터에서 쓰레기를 읽습니다. SysV(macOS / Linux)는 int/float 레지스터 풀이 분리돼 있고 우연히 유효한 비트가 떨어졌습니다 — Windows 한정 크래시, 8개의 perry-ui-* 플랫폼 크레이트 전체에서 수정.
      </p>
      <p>
        그리고: <strong><code>scoop install perry-ts/perry</code></strong>. 매니페스트는 v0.5.345에 핀(공식 MSVC 기본 LLVM을 자동으로 끌어오기 위해 <code>depends: main/llvm</code> 사용). 릴리스 워크플로는 이제 모든 아카이브 옆에 <code>&lt;artifact&gt;.sha256</code> 사이드카를 출력하며, 형식은 <code>sha256sum</code> 호환 — 모든 다운스트림 패키지 매니저 범퍼용.
      </p>
      <pre><code>{`# Windows 호스트
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. 마무리</h2>
      <p>
        이 기간의 패턴은 커뮤니티 참여와 내부 위생의 결합입니다. <strong>TheHypnoo</strong>는 의미 있는 PR을 셋 보냈고(<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> <code>fs.appendFileSync</code> 연결, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> <code>response.arrayBuffer</code>의 본문 바이트), 트래커는 약 30개 이슈가 비워졌고, 컴파일러는 가장 큰 파일에서 60% 줄었으며 4개 임시 워커 중 하나를 업데이트하지 않은 것을 런타임 잘못된 컴파일에서 <code>cargo build</code> 에러로 바꾸는 exhaustive 워커를 갖게 됐습니다. UI 스타일링은 Windows의 그림자만 빼면 모든 데스크톱 플랫폼에서 동등성을 달성. Geisterhand는 브라우저 기반의 devtools 표면을 키웠습니다. Windows 설치 경로는 명령 하나만큼 짧아졌습니다.
      </p>
      <p>시도해 보세요:</p>
      <pre><code>{`# npm(아무 플랫폼)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew(macOS)
brew install PerryTS/perry/perry

# Scoop(Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# 데스크톱 앱 자동 업데이트
npm install @perry/updater

# 라이브 인스펙터
perry compile main.ts -o app --enable-geisterhand
./app &  # 그런 다음 http://localhost:7676 열기`}</code></pre>
      <p>
        소스: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
