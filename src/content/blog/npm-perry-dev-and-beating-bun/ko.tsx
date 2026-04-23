export default function Content() {
  return (
    <>
      <p>
        지난 글은 Perry v0.5.80과 함께, 벤치마크 표에서 완강히 남아 있던 한 가지 패배로 끝났습니다. <code>JSON.parse</code>/<code>stringify</code> 라운드트립이 여전히 Node보다 1.6배 느렸던 것입니다. 6일 후 Perry는 <strong>v0.5.174</strong>가 되었고 &mdash; 즉 <strong>94개의 패치 릴리스</strong>를 의미합니다 &mdash; 다른 무엇보다 먼저 짚고 넘어갈 가치가 있는 세 가지가 바뀌었습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code>가 <strong>npm</strong>에 출시되었습니다. 한 번의 명령으로 지원되는 모든 플랫폼에 Perry를 설치합니다.</li>
        <li><strong><code>perry dev</code></strong>는 새로운 인메모리 AST 캐시와 모듈별 디스크 오브젝트 캐시 위에 워치 모드 자동 재컴파일을 더했습니다.</li>
        <li><code>json_roundtrip</code> 패배가 닫혔습니다. 이제 Perry는 메인 스위트의 <strong>모든 벤치마크에서 Node와 Bun을 이깁니다</strong>(둘 다 상대로 15/15).</li>
      </ul>
      <p>
        글의 나머지는 조연들입니다. WebAssembly 수정, 드디어 엔드투엔드로 컴파일되는 watchOS, 나머지까지 모두 배선된 <code>perry/thread</code> 프리미티브, 그리고 조용한 누락을 진짜 에러로 바꾸는 컴파일 타임 엄격성 한 묶음.
      </p>

      <h2>1. npm의 <code>@perryts/perry</code></h2>
      <p>
        Perry는 항상 macOS에서는 Homebrew를 통해, Debian/Ubuntu에서는 APT를 통해 설치되었습니다. 해당 플랫폼의 개발자에게는 충분한 커버리지지만, 소스에서 빌드하지 않는 한 Windows 사용자에게는 전혀 없었고, Mac과 Linux와 Windows가 섞인 팀에서는 통일된 방법이 전혀 없었습니다. v0.5.107이 그 문제를 없앴습니다.
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        이 패키지는 플랫폼별 7개의 옵셔널 패키지에 의존하는 얇은 런처입니다 &mdash; macOS arm64/x64, glibc 및 musl 모두의 Linux x64/arm64, Windows x64 &mdash; 그리고 npm은 여러분의 머신에 맞는 것 하나만 설치합니다. 플랫폼당 바이너리 크기는 한 자릿수 메가바이트의 낮은 수준입니다. 설치 자체는 몇 초 만에 끝납니다. 선호한다면 전역 설치 경로(<code>npm install -g @perryts/perry</code>)도 있지만, 프로젝트 로컬 설치는 컴파일러 버전을 의존성 옆에 고정시키며, 그것이 올바른 기본값입니다.
      </p>
      <p>
        배포는 OIDC Trusted Publisher를 통해 진행되었으므로 모든 릴리스는 출처가 증명되며 그것을 빌드한 CI 잡에 다시 묶입니다. 그것은 그것대로 하루짜리 CI 작업이었고 &mdash; 올바른 <code>--provenance</code> / npm 버전 / 워크플로 경로 조합을 추적하는 여러 개의 <code>v0.5.107</code> CI 커밋이 있었습니다 &mdash; 하지만 안착했고, 이후의 모든 릴리스는 깨끗했습니다. 이제 Windows 사용자는 1급 시민이며, &ldquo;당신의 OS가 좋아하는 방식으로 설치하세요&rdquo;라는 팀 간의 마찰은 사라졌습니다.
      </p>

      <h2>2. <code>perry dev</code> &mdash; 워치 모드</h2>
      <p>
        v0.5.143은 새로운 CLI 서브커맨드를 추가했습니다:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        그게 다입니다. 프로젝트를 감시하고, 저장 시 재컴파일하고, 바이너리를 재실행합니다. 영감은 Vite와 <code>nodemon</code>에서 왔고, 요지는 컴파일러-투-바이너리 워크플로가 런타임보다 느리게 느껴질 수밖에 없다는 척을 그만두는 것입니다. 대부분의 프로젝트에서 <code>perry dev</code>는 따뜻한 캐시에서 1초 이내에 다시 빌드합니다.
      </p>
      <p>
        &ldquo;따뜻한 캐시&rdquo; 부분이 중요합니다. <code>perry dev</code>와 함께 두 가지 새 캐시가 안착했습니다:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>인메모리 AST 캐시</strong> (v0.5.156). 단일 <code>perry dev</code> 세션의 재빌드 전반에 걸쳐, Perry는 디스크에서 변경되지 않은 모든 모듈의 파싱된 AST를 유지합니다. 한 파일을 편집하면 한 파일만 다시 파싱하며, 전체 모듈 그래프를 다시 파싱하지 않습니다.
        </li>
        <li>
          <strong>모듈별 디스크 오브젝트 캐시(V2.2)</strong>. 각 모듈은 자신의 <code>.o</code> 파일로 컴파일되며 해싱됩니다. 변경되지 않은 모듈은 코드젠을 완전히 건너뛰고 링커가 캐시된 오브젝트를 가져갑니다. 캐시의 verbose 출력은 <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a>의 스펙과 일치하며, v0.5.160의 감사 강화 라운드는 헤더 변경 후에도 오래된 캐시 엔트리가 살아남을 수 있었던 엣지 케이스를 닫았습니다.
        </li>
      </ul>
      <p>
        두 캐시는 쌓입니다. 세션의 첫 편집은 전체 컴파일이며, 그 이후의 모든 것은 실제로 변경한 것에 비례하는 만큼의 작업만 합니다. 이것이 이번 주의 가장 큰 단일 DX 변화입니다.
      </p>

      <h2>3. 모든 벤치마크에서 Bun을 이기기</h2>
      <p>
        v0.5.166 시점에 README에는 솔직한 경고 하나가 있었습니다. Perry는 <code>json_roundtrip</code>(1MB, 10K개 항목 블롭에 대한 50× <code>JSON.parse</code> + <code>JSON.stringify</code>)에서 Node보다 1.6배 느렸고, Bun보다는 2.4배 느렸습니다. 이슈 <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a>가 후속을 추적했습니다. v0.5.173 &mdash; 7일 후 &mdash; 이 격차는 닫혔습니다.
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">워크로드</th>
              <th className="text-right py-2 px-3">Perry v0.5.173</th>
              <th className="text-right py-2 px-3">Node v25</th>
              <th className="text-right py-2 px-3">Bun 1.3</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>json_roundtrip</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">314ms</td><td className="text-right py-2 px-3">377ms</td><td className="text-right py-2 px-3">250ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>closure</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">10ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3">51ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>factorial</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">31ms</td><td className="text-right py-2 px-3">596ms</td><td className="text-right py-2 px-3">98ms</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3"><code>fibonacci(40)</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">320ms</td><td className="text-right py-2 px-3">1033ms</td><td className="text-right py-2 px-3">521ms</td></tr>
            <tr><td className="py-2 px-3"><code>mandelbrot</code></td><td className="text-right py-2 px-3 text-green-400 font-semibold">23ms</td><td className="text-right py-2 px-3">25ms</td><td className="text-right py-2 px-3">30ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        이제 Perry는 메인 벤치마크 스위트의 모든 워크로드에서 이깁니다 &mdash; macOS ARM64에서 5회 실행 중 최고, <strong>Node 상대로 15/15, Bun 상대로 15/15</strong>. Bun 1.3은 여전히 최대 RSS에서 앞서 있으므로(<code>json_roundtrip</code>에서 Perry의 310MB 대비 84MB), 할당자 압력이 다음으로 좁혀야 할 것이지만, 원시 지연시간은 Perry의 것입니다.
      </p>
      <p>
        JSON 격차를 닫은 것은 단일 변경이 아니었습니다 &mdash; 이번 주 내내 진행된 객체 레이아웃 패리티 작업의 축적이었습니다. 1단계 객체 리터럴 셰이프 추론(v0.5.167), 자유 함수, 클래스 메서드, getter, 화살표 함수에 대한 4단계 본문 기반 리턴 타입 추론(v0.5.169), 그리고 4.1단계 메서드 호출 리턴 타입 추론(v0.5.170). 주제는 지난 글과 동일합니다. LLVM에게 꿰뚫어 볼 수 있는 충분한 정적 구조를 주면, 옵티마이저가 나머지를 합니다.
      </p>
      <p>
        v0.5.164는 또한 순수 fadd 감소 루프에서 <code>&lt;2 x double&gt;</code> 병렬 누적기 자동 벡터화를 복원했는데, 이는 v0.5.9x→v0.5.16x 범위의 어느 시점에 조용히 회귀한 것이었습니다. 이것이 <code>math_intensive</code>와 <code>accumulate</code>를 Rust/C++/Go/Swift 대비 예전의 3-4배 우위로 되돌리는 것입니다 &mdash; 동일한 LLVM, 하나의 <code>reassoc contract</code> 플래그, 하나의 벡터화된 루프 본문.
      </p>

      <h2>4. <code>perry/ui</code>와 문서 테스트</h2>
      <p>
        남아 있던 perry/ui 격차 네 개가 v0.5.151에서 닫혔습니다. 그와 함께 v0.5.119는 조용한 perry/ui API 오용을 &ldquo;컴파일되고 아무 일도 하지 않음&rdquo;에서 하드 컴파일 에러로 전환했습니다 &mdash; 아래에서 볼 데코레이터에 적용된 v0.5.165와 동일한 논리입니다. 오용이 컴파일 타임에 드러나는 것은 런타임에 드러나는 것보다 항상 낫습니다.
      </p>
      <p>
        v0.5.123은 <strong>문서 예제 테스트 하니스</strong>와 위젯 갤러리를 출시했습니다. 이제 문서의 모든 TypeScript 예제는 모든 CI 실행에서 컴파일되며, 위젯 갤러리는 스크린샷을 공인된 기준선과 비교합니다. v0.5.125는 이를 크로스 컴파일 매트릭스로 확장했습니다. 모든 문서 예제는 호스트 플랫폼뿐만 아니라 iOS, tvOS, Android, WASM, 웹용으로도 빌드되므로, 타겟 간의 API 드리프트가 그것을 출시한 릴리스 사이클이 아니라 그것을 도입한 PR에서 잡힙니다.
      </p>
      <p>
        소소한 QoL 승리: <code>perry check</code>가 이제 HIR 낮춤 에러에 대해 <code>file:line:column</code>을 출력합니다(<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>). 이는 위치 없는 일반 메시지를 보여주는 대신 에디터의 점프-투-에러가 작동한다는 뜻입니다.
      </p>

      <h2>5. watchOS가 엔드투엔드로 컴파일됨</h2>
      <p>
        watchOS는 지난달에 컴파일 타겟으로 출시되었지만, 깨끗한 엔드투엔드 빌드에는 약간 거친 부분이 있었습니다. 이번 주의 watchOS 작업:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code>와 <code>--target watchos-simulator</code>가 이제 누적되어 있던 우회책 없이 엔드투엔드로 컴파일됩니다.</li>
        <li><strong>v0.5.114</strong>: Metal 표면 앱을 위한 <code>--features watchos-game-loop</code>.</li>
        <li><strong>v0.5.122</strong>: SwiftUI 호스팅 렌더링을 위한 <code>--features watchos-swift-app</code> &mdash; SwiftUI가 앱 수명 주기를 소유하고 Perry가 그 안에서 UI를 구성하길 원할 때.</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code>가 perry-ui-ios와 perry-ui-tvos에 배선되어, Geisterhand UI 테스팅이 macOS와 Linux에서 작동하는 것과 같은 방식으로 이 두 타겟에서도 실행됩니다.</li>
      </ul>

      <h2>6. <code>perry/thread</code> 프리미티브 완전 배선</h2>
      <p>
        v0.5.174(오늘)은 <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>를 닫았습니다. <code>parallelMap</code>, <code>parallelFilter</code>, <code>spawn</code>이 컴파일 타임 안전성 강제와 함께 코드젠 경로를 통해 완전히 배선되었습니다. 변경 가능한 캡처는 컴파일 타임에 거부됩니다 &mdash; perry/ui와 데코레이터가 이제 가지고 있는 것과 동일한 컴파일-타임-정확성 자세입니다. v0.4.0 발표 이후 부분적으로 배선되어 있던 스레드 프리미티브가 이제 엔드투엔드로 완성되었습니다.
      </p>

      <h2>7. WebAssembly와 웹 타겟</h2>
      <p>
        짚고 넘어갈 만한 WASM 수정 두 가지:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: <code>--target web</code>(WASM 출력 경로)의 서로 마스킹하던 다섯 개의 복합 버그. 일괄 수정되어 이제 웹 타겟이 전체 <code>perry/ui</code> 표면에서 버텨냅니다(<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>).</li>
        <li><strong>v0.5.161</strong>: 루프 내부 <code>if</code> 안의 <code>break</code>/<code>continue</code>가 WASM에서 멈추고 있었습니다 &mdash; 네이티브 타겟에서는 재현되지 않던 코드젠 버그. 수정됨(<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>).</li>
      </ul>
      <p>
        또한 정확성 측면에서: v0.5.157은 Android에서 <code>obj.field</code>가 <code>NaN</code>을 반환하던 문제를 수정했으며(<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>), v0.5.162는 <code>sendToClient</code>와 <code>closeClient</code>가 조용한 노옵(no-op)으로 컴파일되고 있던 저주받은 ws 버그를 수정했습니다(<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>).
      </p>

      <h2>8. 컴파일 타임 엄격성 승리</h2>
      <p>
        이번 주의 주제: 예전에 조용한 실패였던 것은 무엇이든 이제 컴파일 에러입니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: TypeScript 데코레이터가 HIR로 파싱된 다음 조용히 누락되고 있었습니다. 이제 데코레이션 지점에서 명확한 메시지와 함께 에러를 냅니다(<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>). perry/ui에 적용된 v0.5.119와 동일한 경고→중단 추론.</li>
        <li><strong>v0.5.119</strong>: perry/ui API 오용이 노옵 바이너리를 생성하는 대신 컴파일 타임에 거부됩니다.</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code>가 이제 메시지만 에코하는 대신 stderr에 진짜 네이티브 백트레이스를 내보냅니다(<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>). 심볼화된 프레임에는 <code>PERRY_DEBUG_SYMBOLS=1</code>이 필요합니다. 없으면 주소를 얻는데, 이것은 그것이 대체한 메시지 에코 동작보다는 여전히 더 많습니다.</li>
      </ul>

      <h2>9. 마무리</h2>
      <p>
        이번 주의 패턴: <strong>배포</strong>(npm), <strong>개발자 경험</strong>(<code>perry dev</code>, 증분 캐시), 그리고 <strong>마지막 남은 벤치마크 패배가 닫힘</strong>. 더해서 조용한 누락을 진짜 에러로 바꾸는 컴파일 타임 엄격성 한 묶음. 6일, 94개의 패치 릴리스, 하나의 주요 DX 변화.
      </p>
      <p>
        시도해 보세요:
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows)
winget install PerryTS.Perry

# Watch mode for iterative dev
perry dev`}</code></pre>
      <p>
        소스: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; 문서: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; 체인지로그: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
