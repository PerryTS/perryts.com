export default function Content() {
  return (
    <>
      <p>
        โพสต์ที่แล้วปิดท้ายที่ <strong>v0.5.174</strong> ด้วยพาดหัวเดียว: ในที่สุด Perry ก็ชนะทุกเบนช์มาร์กในชุดหลักทั้งเทียบกับ Node และ Bun สามวันของงานและกอง commit ด้าน GC + JSON ที่ค้างอยู่ผ่านไป Perry ก็ขึ้นมาที่ <strong>v0.5.306</strong> นั่นคือ <strong>132 patch release</strong> และเรื่องราวก็เป็นคนละเรื่องกัน พาดหัวไม่ใช่การเร่งความเร็ว 547 เท่าหรือคอลัมน์ชัยชนะใหม่ ๆ มันคืองานที่ทำให้ชัยชนะเหล่านั้นยืนหยัดต่อการตรวจสอบได้
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Generational GC</strong> ส่งเป็นค่าเริ่มต้นแล้ว Phase A ถึง D ลงจอดข้าม v0.5.217–v0.5.237</li>
        <li><strong>Small String Optimization</strong> ส่งเป็นค่าเริ่มต้นแล้ว Step 1.5 → 2 ลงจอดใน v0.5.213–v0.5.216</li>
        <li><strong>JSON pipeline</strong> ได้ tape-based parser, lazy parse, lazy stringify และ per-element sparse materialization ค่าเริ่มต้น validate-and-roundtrip ตอนนี้อยู่ที่ <strong>75 ms median</strong> ดีที่สุดในกลุ่ม dynamic-typing</li>
        <li><strong>หน้าเบนช์มาร์ก</strong> ถูกเขียนใหม่หมดด้วย <strong>RUNS=11 median + p95 + σ + min + max</strong> เพิ่ม simdjson และ AssemblyScript+json-as เป็น peer แยก optimization probe ออกจากการเปรียบเทียบจริง และทุกจุดอ่อนของ Perry ถูกนำเสนออย่างซื่อสัตย์</li>
      </ul>
      <p>
        ทีมสนับสนุนคือชุดของการแก้ไขความถูกต้องที่สม่ำเสมอ: Promise microtask FIFO, NaN equality และ ECMAScript number formatting, BigInt two&apos;s complement, AsyncLocalStorage end-to-end, runtime ของ decimal.js + ioredis + commander และ JSON.stringify segfault บน plain f64 ที่ซ่อนอยู่ภายใต้ tape path บวกกับ Windows toolchain ที่ในที่สุดก็เบาขึ้น: LLVM + xwin ไม่ต้องติดตั้ง Visual Studio
      </p>

      <h2>1. Generational GC เปิดเป็นค่าเริ่มต้น</h2>
      <p>
        Generational GC เป็นการ roll-out แบบเป็นขั้นตอนมาสองเดือน สรุป phase ที่ปิดในช่วงนี้:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.217–v0.5.221</strong> — Phase A: shadow-stack runtime scaffolding, push/pop emission, slot-map threading, <code>Let</code>/<code>LocalSet</code> shadow mirroring และ root scanner</li>
        <li><strong>v0.5.222</strong> — Phase B: nursery + old-gen arena split</li>
        <li><strong>v0.5.223–v0.5.225</strong> — Phase C1–C2: write-barrier runtime infrastructure, codegen ส่ง barrier ออกมา ทุก heap store ผ่านมัน</li>
        <li><strong>v0.5.226–v0.5.228</strong> — Phase C3a–C4: remembered-set root ไหลเข้าสู่ mark + clear; minor GC trace ข้าม old-gen; non-moving tenuring</li>
        <li><strong>v0.5.229–v0.5.236</strong> — Phase C4b α/β/γ/δ: forwarding-pointer infrastructure, pinning + evacuation pass, scanner + transitive pinning, reference rewriting, idle nursery block ถูกคืนให้ OS, GC trigger ถูก cap ที่ initial threshold</li>
        <li><strong>v0.5.237</strong> — Phase D part 1: <code>PERRY_GEN_GC=1</code> เป็นค่าเริ่มต้น</li>
        <li><strong>v0.5.238</strong> — Phase D part 2: <code>PERRY_SHADOW_STACK=1</code> เป็นค่าเริ่มต้น</li>
        <li><strong>v0.5.239–v0.5.240</strong> — ปิดท้าย doc: roadmap finalized, ภาคผนวก lineage ทางวิชาการ + อุตสาหกรรม (Bartlett 1988, Ungar 1984, Cheney 1970)</li>
      </ul>
      <p>
        ชัยชนะที่วัดได้ที่สำคัญที่สุด: <code>test_memory_json_churn</code> peak RSS ลดจาก <strong>115 MB → 91 MB</strong> ทันทีที่ค่าเริ่มต้นของ gen-GC ถูกพลิก การถดถอยด้านการคำนวณมีเล็กน้อยและลิสต์อย่างไม่ขอโทษ — <code>nested_loops</code> 8 → 18 ms, <code>accumulate</code> 24 → 34 ms, <code>object_create</code> 0 → 1 ms, <code>array_read</code> / <code>array_write</code> เพิ่มอย่างละ 1 ms ทางออก (<code>PERRY_GEN_GC=0</code>) คืนตัวเลขเดิม trade-off นั้นจงใจ และหน้าเบนช์มาร์กตอนนี้แสดงทั้งสองแถวคู่กันเพื่อให้ผู้อ่านเลือกเองได้
      </p>

      <h2>2. Small String Optimization เปิดเป็นค่าเริ่มต้น</h2>
      <p>
        SSO คือ representation แบบ inline-string ขนาด 22-byte ที่หลีกเลี่ยงการ allocate บน heap สำหรับ string สั้น ๆ — JSON key ทั่วไป (2–8 byte) และ value สั้น ๆ ลงจอดในรูปแบบ inline การ rollout ดูเล็กที่ผิว แต่ใหญ่อยู่ใต้ฝา:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.213</strong>: SSO infrastructure (representation + accessor)</li>
        <li><strong>v0.5.214</strong>: Step 1 consumer arms + <code>PERRY_SSO_FORCE</code> gate สำหรับการทดสอบ</li>
        <li><strong>v0.5.215</strong>: Step 1.5 codegen <code>PropertyGet</code> three-way branch — fast path สำหรับ inline string, fast path สำหรับ heap string, slow path สำหรับส่วนที่เหลือ</li>
        <li><strong>v0.5.216</strong>: Step 2 พลิก — emit SSO เป็นค่าเริ่มต้น</li>
      </ul>
      <p>
        การ follow-up ใน v0.5.279 ปิดบั๊ก property-read NaN ตัวสุดท้ายที่โผล่หลังจาก SSO ร้อน และการแก้ไข chained cross-module getter dispatch ใน v0.5.272 ปิดอีกหนึ่งบั๊ก ทั้งคู่อยู่ใน punch list ก่อนที่ค่าเริ่มต้นจะพลิก ทั้งคู่ส่งโดยไม่มีการถดถอยด้าน perf
      </p>

      <h2>3. JSON: tape-based parse, lazy เป็นค่าเริ่มต้น</h2>
      <p>
        JSON pipeline ได้รับการเขียนใหม่ที่ลึกที่สุดในช่วงนี้ พฤติกรรมเก่า: <code>JSON.parse</code> สร้าง tree ของ NaN-boxed value ที่ materialize เต็มรูปแบบ พฤติกรรมใหม่: <code>JSON.parse</code> สร้าง tape ขนาด 12-byte ต่อ value และ materialize แบบ lazy — เฉพาะ value ที่คุณอ่านจริง ๆ เท่านั้นที่จ่ายค่า materialization Stringify บน parse ที่ไม่ถูกแก้ไขตอนนี้คือ memcpy ของ input ต้นฉบับ ซึ่งเป็น fast-path trick เดียวกับที่ simdjson ใช้กับ <code>raw_json()</code>
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.200</strong>: <code>JSON.parse&lt;T&gt;(blob)</code> schema-directed parse (Step 1) shape ที่รู้ตอน compile-time ทำให้ compiler ส่ง pre-resolved key access ออกมาได้</li>
        <li><strong>v0.5.203</strong>: รากฐาน tape-based parse — Step 2 Phase 1</li>
        <li><strong>v0.5.204</strong>: lazy parse + lazy stringify — Step 2 Phase 2+4</li>
        <li><strong>v0.5.206</strong>: lazy-safe indexed access + edge case — Step 2 Phase 3</li>
        <li><strong>v0.5.208</strong>: per-element sparse materialization — Step 2 Phase 5b</li>
        <li><strong>v0.5.209</strong>: walk cursor + adaptive materialize threshold</li>
        <li><strong>v0.5.210</strong>: พลิก lazy parse เป็นค่าเริ่มต้นสำหรับ blob ≥1 KB</li>
      </ul>
      <p>
        ผลลัพธ์บน workload ที่ lazy tape ถูกออกแบบมาเพื่อ (10k record, blob ~1 MB, parse → stringify โดยไม่มีการ iterate ระหว่างทาง):
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Implementation</th>
              <th className="text-right py-2 px-3">Median (ms)</th>
              <th className="text-right py-2 px-3">p95 (ms)</th>
              <th className="text-right py-2 px-3">σ</th>
              <th className="text-right py-2 px-3">Peak RSS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">c++ <code>-O3 -flto</code> (simdjson)</td><td className="text-right py-2 px-3">24</td><td className="text-right py-2 px-3">28</td><td className="text-right py-2 px-3">1.2</td><td className="text-right py-2 px-3">8 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3 text-amber-400 font-semibold">perry (gen-gc + lazy tape)</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">75</td><td className="text-right py-2 px-3">91</td><td className="text-right py-2 px-3">6.9</td><td className="text-right py-2 px-3">85 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">rust serde_json (LTO)</td><td className="text-right py-2 px-3">185</td><td className="text-right py-2 px-3">190</td><td className="text-right py-2 px-3">1.7</td><td className="text-right py-2 px-3">11 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">bun</td><td className="text-right py-2 px-3">259</td><td className="text-right py-2 px-3">342</td><td className="text-right py-2 px-3">26.1</td><td className="text-right py-2 px-3">82 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">node</td><td className="text-right py-2 px-3">394</td><td className="text-right py-2 px-3">602</td><td className="text-right py-2 px-3">60.1</td><td className="text-right py-2 px-3">127 MB</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">kotlin (kotlinx.serialization)</td><td className="text-right py-2 px-3">473</td><td className="text-right py-2 px-3">533</td><td className="text-right py-2 px-3">21.4</td><td className="text-right py-2 px-3">606 MB</td></tr>
            <tr><td className="py-2 px-3">assemblyscript+json-as (wasmtime)</td><td className="text-right py-2 px-3">598</td><td className="text-right py-2 px-3">621</td><td className="text-right py-2 px-3">10.5</td><td className="text-right py-2 px-3">58 MB</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Perry ที่ <strong>75 ms median</strong> เป็น runtime แบบ dynamic-typing ที่เร็วที่สุดในการเปรียบเทียบ — ชนะ Bun (259 ms), ชนะ Node (394 ms), ชนะ JIT บน server ของ Kotlin (453 ms) simdjson ที่ 24 ms คือเพดาน C++ ที่เร่งด้วย SIMD และอยู่บนหน้านี้โดยตั้งใจ ไม่ใช่ซ่อนหลังการเลือกเฉพาะ Perry ไม่ได้ชนะมัน ประเด็นคือแสดงช่องว่างเพื่อให้การปิดมันมีเป้าหมาย — ติดตามใน <code>docs/json-typed-parse-plan.md</code>
      </p>
      <p>
        เบนช์ที่ตรงไปตรงมาคู่กันคือ <strong>parse-and-iterate</strong>: blob เดียวกัน แต่ทุก iteration รวม <code>nested.x</code> ของทุก record ซึ่งบังคับให้ lazy tape ต้อง materialize ที่นั่น Perry ลงจอดที่ <strong>466 ms</strong> — ช้ากว่าทางออก mark-sweep ที่ 375 ms เพราะ tape จ่ายค่า overhead ที่มัน amortize ไม่ได้ แถวนั้นอยู่ใน TL;DR §B เมื่อคุณหลีกเลี่ยงงานไม่ได้ lazy tape ก็ไม่แสร้งว่าทำได้
      </p>

      <h2>4. หน้าเบนช์มาร์กที่เขียนใหม่</h2>
      <p>
        สามอย่างที่เปลี่ยนไปเกี่ยวกับวิธีที่ Perry นำเสนอตัวเลข performance
      </p>
      <p>
        <strong>RUNS=11 median + p95 + σ + min + max ไม่ใช่ best-of-N</strong> Best-of-N ตัด tail latency ออกแบบเงียบ ๆ; บน hardware นี้มันซ่อน outlier ของ Python <code>accumulate</code> ที่ 9.4 วินาที และ p95 spike ของ Swift JSON ที่ 5.3 วินาที Median ใส่ tail กลับมาบนหน้านี้ การเปลี่ยนแปลง methodology ลงจอดใน v0.5.248; ทุก cell ใน TL;DR §A และ §B เป็น RUNS=11 ใหม่สด ณ วันที่ <strong>2026-04-25</strong>
      </p>
      <p>
        <strong>Optimization probe ถูกแยกออกจาก runtime perf จริง</strong> ห้า cell ที่แสดง Perry ที่ 12–34 ms เทียบกับ Rust/C++ ที่ 98 ms — <code>loop_overhead</code>, <code>math_intensive</code>, <code>accumulate</code>, <code>array_read</code>, <code>array_write</code> — วัด compiler flag posture ไม่ใช่ silicon ตอนนี้พวกมันอยู่ในหัวข้อย่อยของตัวเอง พร้อมย่อหน้าเหนือพวกมันที่อธิบายว่า <code>clang++ -O3 -ffast-math</code> ปิดช่องว่างให้เหลือภายใน 1 มิลลิวินาที headline kernel ของ runtime จริงคือ <code>loop_data_dependent</code>: Perry 235 ms, Rust 229, Swift 233, Java 229, Bun 232 — Perry นั่งอยู่กลางกลุ่ม no-FMA-contract บน kernel ที่ compiler พับงานทิ้งไม่ได้จริง ๆ นั่นคือการเปรียบเทียบที่ซื่อสัตย์
      </p>
      <p>
        <strong>เพิ่ม peer</strong> simdjson (4.3.0) ตอนนี้อยู่ในตาราง JSON ทั้งสอง — เพดาน parse-throughput ของ C++ บนหน้านี้เพื่อให้ผู้อ่านเห็นช่องว่าง AssemblyScript กับ json-as (1.3.2) เป็น peer แบบ TS-to-native ที่ติดตั้งได้ใกล้ที่สุด; porffor segfault บน workload ที่ขนาดนี้, Static Hermes ติดตั้งบน macOS arm64 ไม่ได้ Kotlin กับ kotlinx.serialization เข้าร่วม polyglot JSON ใน v0.5.241–v0.5.242 ทุกแถวเป็นของจริง ทุก disclaimer อยู่บนหน้านี้
      </p>

      <h2>5. ตาราง compute แบบ polyglot</h2>
      <p>
        Headline kernel ที่ fold ไม่ได้จริง ๆ, RUNS=11 median, refresh 2026-04-25 ที่ v0.5.249:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Rust</th>
              <th className="text-right py-2 px-3">C++</th>
              <th className="text-right py-2 px-3">Java</th>
              <th className="text-right py-2 px-3">Node</th>
              <th className="text-right py-2 px-3">Bun</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">318</td><td className="text-right py-2 px-3">330</td><td className="text-right py-2 px-3">315</td><td className="text-right py-2 px-3">282</td><td className="text-right py-2 px-3">1022</td><td className="text-right py-2 px-3">589</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_data_dependent</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">235</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">129</td><td className="text-right py-2 px-3">229</td><td className="text-right py-2 px-3">322</td><td className="text-right py-2 px-3">232</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">1</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">0</td><td className="text-right py-2 px-3">5</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">6</td></tr>
            <tr><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3 text-amber-400 font-semibold">18</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">8</td><td className="text-right py-2 px-3">11</td><td className="text-right py-2 px-3">18</td><td className="text-right py-2 px-3">21</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        ใน <code>fibonacci</code> Perry เทียบเคียงกลุ่ม compiled ภายใน 3–15 ms HotSpot JIT ของ Java เร็วกว่า ~11% จากการ inline recursive call ใน <code>loop_data_dependent</code> kernel แยกเป็นสอง cluster ของ FP-contract: กลุ่ม FMA-contract ที่ ~128 ms (Go default, <code>g++ -O3</code> บน Apple Clang — ทั้งคู่ fuse <code>sum * a + b</code> เป็น FMADDD ตัวเดียว) และกลุ่ม no-contract ที่ 229–235 ms (Perry, Rust default, Swift, Java โดยไม่มี <code>-XX:+UseFMA</code>, Bun) ที่รัน scalar FMUL + FADD LLVM เทียบเคียงกลุ่ม FMA ด้วย <code>-ffp-contract=fast</code>; Perry ไม่เปิดสิ่งนั้นเป็นค่าเริ่มต้น <code>nested_loops</code> ถูก bound ด้วย cache ไม่ใช่ compute; ทุกคนลงจอดที่ 8–21 ms
      </p>

      <h2>6. Windows toolchain เบาขึ้น</h2>
      <p>
        ผู้ใช้ Windows ไม่ต้องติดตั้ง Visual Studio อีกต่อไป <strong>v0.5.199</strong> ปิด <a href="https://github.com/PerryTS/perry/issues/176" className="text-amber-400 hover:text-amber-300">#176</a>: <code>perry setup windows</code> + winget LLVM + xwin แทนที่ tree ของ VS BuildTools ทั้งหมด <code>v0.5.201</code> ตัด cfg gate บน <code>find_lld_link</code> / <code>find_perry_windows_sdk</code> ดังนั้นการค้นหา path ทำงานบนทุกแพลตฟอร์มที่ target Windows ไม่ใช่แค่ host macOS
      </p>
      <pre><code>{`# Windows host
winget install LLVM.LLVM
perry setup windows
perry compile src/main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. รอบของการแก้ความถูกต้องของ runtime</h2>
      <p>
        ธีมของช่วงเวลานี้: การเบี่ยงเบนของ runtime แบบเงียบ ๆ จาก V8/JSC กลายเป็นการแก้ไขหรือ compile error ตัวที่ไม่ trivial:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.255</strong>: <code>BigInt.fromTwos</code>/<code>toTwos</code> two&apos;s complement</li>
        <li><strong>v0.5.263</strong>: <code>Promise.all</code>/<code>race</code>/<code>any</code> non-promise type discrimination</li>
        <li><strong>v0.5.281</strong>: <code>NaN==NaN</code> + ECMAScript number formatting (<code>3 → &quot;3&quot;</code>, ไม่ใช่ <code>&quot;3.0&quot;</code>; <code>-0 → &quot;0&quot;</code>; ฯลฯ)</li>
        <li><strong>v0.5.280</strong>: <code>NaN</code>/<code>Infinity</code> ToInt32 coercion ใน <code>(x) | 0</code></li>
        <li><strong>v0.5.284</strong>: Promise microtask FIFO + thrown-handler propagation</li>
        <li><strong>v0.5.286</strong>: <code>JSON.stringify</code> ของ plain f64 segfault ภายใต้ tape path</li>
        <li><strong>v0.5.277</strong>: <code>fs.readFileSync</code> คืน Buffer เมื่อไม่มีการส่ง encoding (ตรงกับ Node)</li>
        <li><strong>v0.5.272</strong>: chained cross-module getter dispatch คืน <code>undefined</code></li>
      </ul>
      <p>
        การ follow-up ของ stdlib สำหรับ issue <a href="https://github.com/PerryTS/perry/issues/187" className="text-amber-400 hover:text-amber-300">#187</a> ถูกเติมเต็ม: AsyncLocalStorage end-to-end (v0.5.261), commander runtime + codegen ที่เรียก <code>.action()</code> จริง ๆ (v0.5.250), code ของ decimal.js (v0.5.259), Redis ioredis end-to-end (v0.5.270), pg + mongo async-factory pattern (v0.5.275) และบั๊ก async-factory เดียวกันบน EE/LRU/WSS (v0.5.252)
      </p>
      <p>
        ทางฝั่ง <code>perry/ui</code>: notification tap callback (#97) เชื่อมต่อข้ามทั้ง Apple (v0.5.254) และ Android (v0.5.258); schedule + cancel local notification (#96, v0.5.244); FCM register + receive บน Android (v0.5.262)
      </p>

      <h2>8. ปิดท้าย</h2>
      <p>
        รูปแบบของช่วงนี้ไม่ใช่ตัวเลขพาดหัว มันคืองานที่ทำให้ชัยชนะที่มีอยู่รอดจากการตรวจสอบได้: generational GC ที่จับ workload allocation ที่ต่อเนื่อง, SSO ที่ปิดช่องว่างต้นทุนของ string สั้น, JSON pipeline ที่ใช้ประโยชน์จากโครงสร้าง &ldquo;ไม่มีการแก้ไข&rdquo; ของ workload ที่พบมากที่สุด และหน้าเบนช์มาร์กที่วัด median แทน best-of-N และแสดงเพดาน parse 24 ms ของ simdjson บนแถวเดียวกับ 75 ms ของ Perry ผู้อ่านได้เห็นช่องว่าง — และตำแหน่งที่ Perry นั่งอยู่เทียบกับพื้น
      </p>
      <p>
        ลองดู:
      </p>
      <pre><code>{`# npm (any platform)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# winget (Windows — no VS install needed)
winget install PerryTS.Perry

# Default benchmark suite
cd benchmarks/json_polyglot && ./run.sh
cd benchmarks/polyglot && ./run_all.sh`}</code></pre>
      <p>
        ซอร์ส: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Benchmarks: <a href="https://github.com/PerryTS/perry/blob/main/benchmarks/README.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">benchmarks/README.md</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
