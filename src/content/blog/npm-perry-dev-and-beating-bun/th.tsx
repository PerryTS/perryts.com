export default function Content() {
  return (
    <>
      <p>
        โพสต์ที่แล้วปิดท้ายด้วย Perry ที่ v0.5.80 และความพ่ายแพ้ดื้อ ๆ หนึ่งรายการบนตารางเบนช์มาร์ก: <code>JSON.parse</code>/<code>stringify</code> roundtrip ยังช้ากว่า Node 1.6 เท่า หกวันต่อมา Perry อยู่ที่ <strong>v0.5.174</strong> นั่นคือ <strong>94 patch release</strong> และมีสามสิ่งที่เปลี่ยนไปซึ่งคุ้มค่าที่จะกล่าวถึงก่อนสิ่งอื่นใด:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code>@perryts/perry</code> ส่งขึ้น <strong>npm</strong> แล้ว คำสั่งเดียวติดตั้ง Perry บนทุกแพลตฟอร์มที่รองรับ</li>
        <li><strong><code>perry dev</code></strong> เพิ่ม watch-mode auto-recompile บนโครง in-memory AST cache ใหม่และ on-disk per-module object cache</li>
        <li>ความพ่ายแพ้ใน <code>json_roundtrip</code> ปิดลงแล้ว Perry ตอนนี้ <strong>ชนะ Node และ Bun ในทุกเบนช์มาร์ก</strong>ในชุดหลัก (15/15 เทียบกับทั้งคู่)</li>
      </ul>
      <p>
        ส่วนที่เหลือของโพสต์เป็นตัวประกอบ: การแก้ไข WebAssembly, watchOS ที่ในที่สุดก็คอมไพล์ครบ end-to-end, primitive ของ <code>perry/thread</code> ที่เชื่อมต่อจนจบ และชุดของชัยชนะด้าน compile-time strictness ที่เปลี่ยนการตกหล่นเงียบ ๆ ให้เป็น error จริง ๆ
      </p>

      <h2>1. <code>@perryts/perry</code> บน npm</h2>
      <p>
        Perry ติดตั้งผ่าน Homebrew บน macOS และ APT บน Debian/Ubuntu มาตลอด ครอบคลุมดีสำหรับนักพัฒนาบนแพลตฟอร์มเหล่านั้น ไม่มีอะไรเลยสำหรับผู้ใช้ Windows เว้นแต่จะ build จาก source และไม่มีอะไรที่เป็นมาตรฐานเดียวกันข้ามทีมที่ผสม Mac, Linux และ Windows v0.5.107 ทำให้ปัญหานั้นหายไป
      </p>
      <pre><code>{`npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp`}</code></pre>
      <p>
        package เป็น launcher บาง ๆ ที่ขึ้นกับ optional package เจ็ดตัวต่อแพลตฟอร์ม &mdash; macOS arm64/x64, Linux x64/arm64 ทั้ง glibc และ musl, Windows x64 &mdash; และ npm ติดตั้งเฉพาะตัวที่ตรงกับเครื่องของคุณ ขนาด binary ต่อแพลตฟอร์มอยู่ในหลักเมกะไบต์ตัวเลขหลักเดียว การติดตั้งเองใช้เวลาเป็นวินาที มีเส้นทางการติดตั้งแบบ global ด้วย (<code>npm install -g @perryts/perry</code>) ถ้าคุณชอบแบบนั้น แต่การติดตั้งแบบ project-local จะตรึงเวอร์ชันของ compiler ไว้ข้าง dependency ของคุณ ซึ่งเป็นค่าเริ่มต้นที่ถูกต้อง
      </p>
      <p>
        การ publish ผ่าน OIDC Trusted Publisher เพื่อให้ทุก release มี provenance และผูกกลับไปที่ CI job ที่ build มัน นั่นคือหนึ่งวันของงาน CI ในตัวมันเอง &mdash; commit CI <code>v0.5.107</code> หลายอันไล่หาคอมบิเนชันของ <code>--provenance</code> / npm version / workflow path ที่ถูกต้อง &mdash; แต่มันลงจอด และทุก release ตั้งแต่นั้นก็สะอาด ผู้ใช้ Windows เป็นพลเมืองชั้นหนึ่งแล้ว และแรงเสียดทานข้ามทีมของ &ldquo;ติดตั้งตามที่ OS ของคุณชอบ&rdquo; หายไป
      </p>

      <h2>2. <code>perry dev</code> &mdash; watch mode</h2>
      <p>
        v0.5.143 เพิ่ม CLI subcommand ใหม่:
      </p>
      <pre><code>{`perry dev`}</code></pre>
      <p>
        แค่นั้น มันเฝ้าดูโปรเจกต์ของคุณ คอมไพล์ใหม่เมื่อ save และ relaunch binary ของคุณ แรงบันดาลใจคือ Vite และ <code>nodemon</code>; ประเด็นคือหยุดแสร้งว่า workflow แบบ compiler-to-binary ต้องรู้สึกช้ากว่า runtime สำหรับโปรเจกต์ส่วนใหญ่ <code>perry dev</code> rebuild ภายในไม่ถึงวินาทีบน cache ที่อุ่นแล้ว
      </p>
      <p>
        ส่วน &ldquo;cache ที่อุ่นแล้ว&rdquo; สำคัญ มี cache ใหม่สองตัวลงจอดควบคู่ไปกับ <code>perry dev</code>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>In-memory AST cache</strong> (v0.5.156) ข้าม rebuild ภายในเซสชัน <code>perry dev</code> เดียว Perry เก็บ AST ที่ parse แล้วไว้สำหรับทุก module ที่ไม่ได้เปลี่ยนบน disk การแก้ไฟล์หนึ่งไฟล์ทำการ re-parse หนึ่งไฟล์ ไม่ใช่ module graph ทั้งหมด
        </li>
        <li>
          <strong>On-disk per-module object cache (V2.2)</strong> แต่ละ module คอมไพล์เป็นไฟล์ <code>.o</code> ของตัวเองและถูก hash; module ที่ไม่เปลี่ยนจะข้าม codegen ไปโดยสิ้นเชิงและ linker จะหยิบ object ที่ cache ไว้ verbose output ของ cache ตรงกับ spec ใน <a href="https://github.com/PerryTS/perry/issues/131" className="text-amber-400 hover:text-amber-300">#131</a> และรอบของการ audit hardening ใน v0.5.160 ปิด edge case ที่ cache entry เก่า ๆ อาจรอดจากการเปลี่ยนแปลง header ได้
        </li>
      </ul>
      <p>
        cache ทั้งสองซ้อนทับกัน การแก้ไขครั้งแรกของเซสชันคือการคอมไพล์เต็ม; ทุกอย่างหลังจากนั้นทำงานเฉพาะสัดส่วนของสิ่งที่คุณเปลี่ยนจริง ๆ นี่คือการเปลี่ยนแปลง DX ที่ใหญ่ที่สุดของสัปดาห์
      </p>

      <h2>3. เอาชนะ Bun บนทุกเบนช์มาร์ก</h2>
      <p>
        ที่ v0.5.166 README มีข้อแม้ตามตรงหนึ่งอัน: Perry ช้ากว่า Node 1.6 เท่าใน <code>json_roundtrip</code> (50x <code>JSON.parse</code> + <code>JSON.stringify</code> บน blob ขนาด 1MB 10K รายการ) และช้ากว่า Bun 2.4 เท่า Issue <a href="https://github.com/PerryTS/perry/issues/149" className="text-amber-400 hover:text-amber-300">#149</a> ติดตามการ follow-up พอถึง v0.5.173 &mdash; เจ็ดวันต่อมา &mdash; ช่องว่างนั้นก็ปิด
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
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
        Perry ตอนนี้ชนะทุก workload ในชุดเบนช์มาร์กหลัก &mdash; <strong>15/15 เทียบกับ Node, 15/15 เทียบกับ Bun</strong> best of 5 run บน macOS ARM64 Bun 1.3 ยังนำหน้าใน peak RSS (84MB เทียบกับ 310MB ของ Perry ใน <code>json_roundtrip</code>) ดังนั้นแรงกดดันของ allocator เป็นสิ่งต่อไปที่จะปิด แต่ latency ดิบเป็นของ Perry
      </p>
      <p>
        การปิดช่องว่าง JSON ไม่ใช่การเปลี่ยนแปลงเดียว &mdash; มันเป็นการสะสมของงาน object-layout parity ที่รันผ่านสัปดาห์นี้: Phase 1 object-literal shape inference (v0.5.167), Phase 4 body-based return-type inference สำหรับ free function, class method, getter และ arrow (v0.5.169) และ Phase 4.1 method-call return-type inference (v0.5.170) ธีมเหมือนกับโพสต์ที่แล้ว: ให้ LLVM มีโครงสร้างแบบ static ที่มากพอที่จะมองทะลุได้ แล้ว optimizer จะจัดการส่วนที่เหลือเอง
      </p>
      <p>
        v0.5.164 ยังฟื้นฟู <code>&lt;2 x double&gt;</code> parallel-accumulator autovectorization บน pure-fadd reduction loop ซึ่งถอยหลังเงียบ ๆ ไปในบางจุดของช่วง v0.5.9x&rarr;v0.5.16x นั่นคือสิ่งที่ทำให้ <code>math_intensive</code> และ <code>accumulate</code> กลับมานำ Rust/C++/Go/Swift 3-4 เท่าเหมือนเดิม &mdash; LLVM เดียวกัน flag <code>reassoc contract</code> หนึ่งอัน body ของ loop ที่ vectorize แล้วหนึ่งอัน
      </p>

      <h2>4. <code>perry/ui</code> และ doc-test</h2>
      <p>
        ช่องว่างที่เหลือสี่อันใน perry/ui ปิดใน v0.5.151 ควบคู่กับนั้น v0.5.119 พลิกการใช้ API ของ perry/ui ผิดแบบเงียบ ๆ จาก &ldquo;คอมไพล์ผ่านและไม่ทำอะไรเลย&rdquo; เป็น compile error แบบแข็ง &mdash; ตรรกะเดียวกับ v0.5.165 ที่ใช้กับ decorator (ดูด้านล่าง) การใช้ผิดที่ surface ตอน compile time ดีกว่าตอน runtime เสมอ
      </p>
      <p>
        v0.5.123 ส่ง <strong>doc-examples test harness</strong> และ widget gallery ทุกตัวอย่าง TypeScript ในเอกสารตอนนี้ถูกคอมไพล์ทุก CI run และ widget gallery เปรียบเทียบ screenshot กับ baseline ที่ได้รับการรับรอง v0.5.125 ขยายสิ่งนั้นเป็น cross-compile matrix: ทุกตัวอย่างใน doc ถูก build สำหรับ iOS, tvOS, Android, WASM และ Web รวมถึงแพลตฟอร์ม host ดังนั้น API drift ข้าม target จะถูกจับบน PR ที่นำมันเข้ามา ไม่ใช่รอบ release ที่ส่งมัน
      </p>
      <p>
        ชัยชนะคุณภาพชีวิตเล็ก ๆ: <code>perry check</code> ตอนนี้ส่งออก <code>file:line:column</code> สำหรับ HIR lowering error (<a href="https://github.com/PerryTS/perry/issues/129" className="text-amber-400 hover:text-amber-300">#129</a>) ซึ่งหมายความว่าการ jump-to-error ของ editor ทำงาน แทนที่จะแสดงข้อความทั่วไปโดยไม่มีตำแหน่ง
      </p>

      <h2>5. watchOS คอมไพล์ครบ end-to-end</h2>
      <p>
        watchOS ส่งเป็นเป้าหมายการคอมไพล์เมื่อเดือนที่แล้ว แต่ build end-to-end ที่สะอาดยังมีขอบที่หยาบ งาน watchOS ของสัปดาห์นี้:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.113</strong>: <code>--target watchos</code> และ <code>--target watchos-simulator</code> ตอนนี้คอมไพล์ครบ end-to-end โดยไม่ต้องมี workaround ที่สะสมไว้</li>
        <li><strong>v0.5.114</strong>: <code>--features watchos-game-loop</code> สำหรับ app ที่ใช้ Metal surface</li>
        <li><strong>v0.5.122</strong>: <code>--features watchos-swift-app</code> สำหรับการ render ที่โฮสต์ด้วย SwiftUI &mdash; เมื่อคุณต้องการให้ SwiftUI เป็นเจ้าของ lifecycle ของ app และ Perry ประกอบ UI ภายในมัน</li>
        <li><strong>v0.5.135</strong>: <code>PERRY_UI_TEST_MODE</code> ถูกเชื่อมเข้ากับ perry-ui-ios และ perry-ui-tvos ดังนั้นการทดสอบ UI ของ Geisterhand รันในแบบเดียวกันบนทั้งสองเป้าหมายเหมือนที่มันทำบน macOS และ Linux</li>
      </ul>

      <h2>6. <code>perry/thread</code> primitive เชื่อมต่อครบ</h2>
      <p>
        v0.5.174 (วันนี้) ปิด <a href="https://github.com/PerryTS/perry/issues/146" className="text-amber-400 hover:text-amber-300">#146</a>: <code>parallelMap</code>, <code>parallelFilter</code> และ <code>spawn</code> ถูกเชื่อมต่อครบผ่านเส้นทาง codegen พร้อมการบังคับใช้ความปลอดภัยตอน compile time การจับตัวแปรแบบ mutable ถูกปฏิเสธตอน compile time &mdash; ท่าทาง compile-time-correctness แบบเดียวกับที่ perry/ui และ decorator มีตอนนี้ Thread primitive ที่เชื่อมต่อบางส่วนตั้งแต่การประกาศ v0.4.0 ตอนนี้เสร็จสมบูรณ์ครบ end-to-end
      </p>

      <h2>7. WebAssembly และเป้าหมาย web</h2>
      <p>
        การแก้ไข WASM สองอันที่ควรกล่าวถึง:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.158</strong>: บั๊กที่ทับซ้อนกันห้าอันใน <code>--target web</code> (เส้นทาง output ของ WASM) ที่ปิดบังกันและกัน แก้เป็นชุดเดียวเพื่อให้เป้าหมาย web ตอนนี้ทนทานภายใต้ surface เต็มของ <code>perry/ui</code> (<a href="https://github.com/PerryTS/perry/issues/133" className="text-amber-400 hover:text-amber-300">#133</a>)</li>
        <li><strong>v0.5.161</strong>: <code>break</code>/<code>continue</code> ภายใน <code>if</code> ภายใน loop กำลังค้างบน WASM &mdash; บั๊ก codegen ที่ไม่ reproduce บนเป้าหมายเนทีฟ แก้แล้ว (<a href="https://github.com/PerryTS/perry/issues/135" className="text-amber-400 hover:text-amber-300">#135</a>)</li>
      </ul>
      <p>
        ทางฝั่งความถูกต้องด้วย: v0.5.157 แก้ <code>obj.field</code> ที่คืน <code>NaN</code> บน Android (<a href="https://github.com/PerryTS/perry/issues/128" className="text-amber-400 hover:text-amber-300">#128</a>) และ v0.5.162 แก้บั๊ก ws ที่ต้องสาปซึ่ง <code>sendToClient</code> และ <code>closeClient</code> กำลังคอมไพล์เป็น no-op เงียบ ๆ (<a href="https://github.com/PerryTS/perry/issues/136" className="text-amber-400 hover:text-amber-300">#136</a>)
      </p>

      <h2>8. ชัยชนะของ compile-time strictness</h2>
      <p>
        ธีมของสัปดาห์นี้: อะไรก็ตามที่เคยเป็น failure เงียบ ๆ ตอนนี้เป็น compile error
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.165</strong>: decorator ของ TypeScript ถูก parse เข้า HIR แล้วตกหล่นไปเงียบ ๆ ตอนนี้พวกมัน error ที่จุด decoration พร้อมข้อความที่ชัดเจน (<a href="https://github.com/PerryTS/perry/issues/144" className="text-amber-400 hover:text-amber-300">#144</a>) เหตุผล warn&rarr;bail แบบเดียวกับ v0.5.119 ที่ใช้กับ perry/ui</li>
        <li><strong>v0.5.119</strong>: การใช้ API ของ perry/ui ผิดถูกปฏิเสธตอน compile time แทนที่จะผลิต binary แบบ no-op</li>
        <li><strong>v0.5.172</strong>: <code>console.trace()</code> ตอนนี้ส่ง backtrace เนทีฟจริง ๆ ไปยัง stderr แทนที่จะ echo ข้อความเท่านั้น (<a href="https://github.com/PerryTS/perry/issues/20" className="text-amber-400 hover:text-amber-300">#20</a>) frame ที่ symbolicate ต้องการ <code>PERRY_DEBUG_SYMBOLS=1</code>; ถ้าไม่มีคุณจะได้ address ซึ่งยังมากกว่าพฤติกรรม message-echo ที่มันแทนที่
        </li>
      </ul>

      <h2>9. ปิดท้าย</h2>
      <p>
        รูปแบบของสัปดาห์: <strong>การกระจาย</strong> (npm), <strong>ประสบการณ์ของนักพัฒนา</strong> (<code>perry dev</code>, cache แบบเพิ่มทีละส่วน) และ <strong>ความพ่ายแพ้เบนช์มาร์กสุดท้ายที่เหลืออยู่ถูกปิด</strong> บวกกับชุดของ compile-time strictness ที่เปลี่ยนการตกหล่นเงียบ ๆ ให้เป็น error จริง ๆ หกวัน 94 patch release การเปลี่ยนแปลง DX ใหญ่หนึ่งครั้ง
      </p>
      <p>
        ลองดู:
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
        ซอร์ส: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
