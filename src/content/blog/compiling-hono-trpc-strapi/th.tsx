export default function Content() {
  return (
    <>
      <p>
        ตอนนี้ Perry คอมไพล์เฟรมเวิร์ก TypeScript หลักสามตัว — Hono, tRPC และ Strapi — เป็น
        ไฟล์เรียกทำงานเนทีฟ ARM64 คอมไพล์ในเวลาน้อยกว่าหนึ่งวินาที สร้างไบนารีที่มีขนาดต่ำกว่า 2 MB
        และรันโดยไม่ crash
      </p>
      <p>
        โพสต์นี้ครอบคลุมสิ่งที่ใช้ได้ สิ่งที่ยังใช้ไม่ได้ และสิ่งที่เราเรียนรู้จากการทดสอบ
        คอมไพเลอร์กับโค้ดจากโลกจริง
      </p>

      <h2>โปรเจกต์</h2>
      <p>
        เราเลือกสามตัวนี้เพราะเป็นตัวแทนของรูปแบบ TypeScript ที่แตกต่างกัน:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — เฟรมเวิร์กเว็บน้ำหนักเบา (29 โมดูล) ใช้เจเนอริกอย่างหนัก
          การสืบทอดคลาส การกำหนดเมธอดแบบไดนามิก และ Web API <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>{" "}
          โครงสร้างการส่งออกใช้ named re-exports ผ่าน barrel files
        </li>
        <li>
          <strong>tRPC</strong> — เฟรมเวิร์ก RPC แบบ type-safe (52 โมดูล) สาย re-export ที่ลึก
          ข้ามมากกว่า 4 ระดับ รูปแบบ builder พร้อมการ narrowing ชนิดข้อมูลเจเนอริก การสร้างอินสแตนซ์คลาสในขอบเขตโมดูล
          และ streaming ผ่าน Web Streams
        </li>
        <li>
          <strong>Strapi</strong> — แกน CMS แบบ headless (4 โมดูลคอมไพล์เนทีฟ ที่เหลือเป็น external)
          Monorepo พร้อมการแก้ไขแพ็กเกจ workspace re-exports แบบ namespace
          (<code className="text-perry-400">export * as X</code>) รูปแบบ service container ด้วย{" "}
          <code className="text-perry-400">Map</code> และฟังก์ชัน factory
        </li>
      </ul>

      <h2>ผลการคอมไพล์</h2>
      <p>
        ทั้งสามคอมไพล์เป็นไบนารีเนทีฟโดยไม่มีข้อผิดพลาดในการคอมไพล์:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">โปรเจกต์</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">โมดูลที่คอมไพล์</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">ขนาดไบนารี</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">เวลาคอมไพล์</th>
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
        ทุกโมดูลซอร์สผ่านไปป์ไลน์เต็มรูปแบบ: แยกวิเคราะห์ SWC, ลดระดับ HIR, สร้างโค้ด Cranelift,
        สร้างไฟล์ออบเจ็กต์ และลิงก์เนทีฟ เวลาคอมไพล์รวมทุกอย่าง —
        ตั้งแต่การแยกวิเคราะห์จนถึงลิงก์สุดท้าย
      </p>
      <p>
        เพื่อเปรียบเทียบ <code className="text-perry-400">tsc --noEmit</code> บน tRPC เพียงอย่างเดียวใช้เวลาหลาย
        วินาที Perry คอมไพล์ 52 โมดูลเป็นไบนารีเนทีฟที่ลิงก์แล้วในเวลาน้อยกว่าหนึ่งวินาที
      </p>

      <h2>สิ่งที่ทำงานได้ในรันไทม์</h2>

      <h3>การสร้างอินสแตนซ์คลาสข้ามโมดูล</h3>
      <p>
        นี่คือจุดเปลี่ยนสำคัญ โครงสร้างการส่งออกของ Hono มีลักษณะดังนี้:
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
        <code className="text-perry-400">export {"{"} Hono {"}"}</code> นั้นเป็น named re-export — ไม่ใช่{" "}
        <code className="text-perry-400">export * from</code> หรือ{" "}
        <code className="text-perry-400">export {"{"} Hono {"}"} from &apos;./hono&apos;</code> ใน HIR ของ Perry
        สิ่งนี้กลายเป็น <code className="text-perry-400">Export::Named</code> ไม่ใช่{" "}
        <code className="text-perry-400">Export::ReExport</code> หรือ{" "}
        <code className="text-perry-400">Export::ExportAll</code> ก่อนหน้านี้ การแพร่กระจายคลาสของคอมไพเลอร์
        ติดตามเฉพาะสาย <code className="text-perry-400">ExportAll</code> และ{" "}
        <code className="text-perry-400">ReExport</code> ดังนั้นการนำเข้า{" "}
        <code className="text-perry-400">Hono</code> จาก <code className="text-perry-400">index.ts</code> ล้มเหลว
        อย่างเงียบๆ — การค้นหาคลาสพลาดและ <code className="text-perry-400">new Hono()</code> ส่งคืน{" "}
        <code className="text-perry-400">undefined</code>
      </p>
      <p>
        ตอนนี้ Perry ติดตาม <code className="text-perry-400">Export::Named</code> กลับผ่านการนำเข้าของ
        โมดูลเพื่อค้นหานิยามคลาสดั้งเดิมและแพร่กระจาย ผลลัพธ์:
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
        Constructor ของ Hono ทำงาน เริ่มต้น <code className="text-perry-400">SmartRouter</code>{" "}
        (ซึ่งภายในสร้างทั้ง <code className="text-perry-400">RegExpRouter</code> และ{" "}
        <code className="text-perry-400">TrieRouter</code>) และส่งคืนออบเจ็กต์จริง อินสแตนซ์อิสระหลายตัว
        ทำงานได้ ตัวเลือก constructor ถูกรับ
      </p>

      <h3>การแก้ไข Re-export หลายระดับ</h3>
      <p>
        <code className="text-perry-400">initTRPC</code> ของ tRPC อยู่ลึก 4 ระดับ:
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
        นั่นคือ <code className="text-perry-400">ExportAll</code> →{" "}
        <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code> Perry
        แก้ไขสายทั้งหมด — <code className="text-perry-400">initTRPC</code> สามารถเข้าถึงได้ใน
        ไบนารีที่คอมไพล์แล้ว เช่นเดียวกับ <code className="text-perry-400">TRPCError</code> ซึ่งใช้เส้นทางเดียวกัน
      </p>

      <h3>การสร้างอินสแตนซ์คลาสข้ามโมดูลพร้อมอาร์กิวเมนต์</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">err</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCError</span>({"{"} code: <span className="text-green-400">&apos;NOT_FOUND&apos;</span>, message: <span className="text-green-400">&apos;resource missing&apos;</span> {"}"})</p>
          <p className="text-green-400">// PASS: new TRPCError() returned object</p>
          <p className="text-green-400">// PASS: err.code = NOT_FOUND</p>
        </div>
      </div>
      <p>
        <code className="text-perry-400">TRPCError</code> ถูกกำหนดในโมดูลหนึ่ง re-export ผ่าน
        barrel files ระดับกลางสามตัว นำเข้าในการทดสอบ และสร้างอินสแตนซ์ด้วยออบเจ็กต์ตัวเลือก
        ฟิลด์ <code className="text-perry-400">code</code> ของอินสแตนซ์สามารถเข้าถึงได้
      </p>

      <h3>การแก้ไขแพ็กเกจใน Monorepos</h3>
      <p>
        Strapi ใช้แพ็กเกจ workspace — <code className="text-perry-400">@strapi/core</code> เป็นแพ็กเกจ
        พี่น้องใน monorepo ไม่ใช่ dependency npm Perry แก้ไข bare specifier ผ่าน
        ฟิลด์ exports ใน <code className="text-perry-400">package.json</code>:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-green-400">&quot;exports&quot;</span>: {"{"}</p>
          <p>  <span className="text-green-400">&quot;.&quot;</span>: {"{"} <span className="text-green-400">&quot;source&quot;</span>: <span className="text-green-400">&quot;./src/index.ts&quot;</span>, <span className="text-green-400">&quot;import&quot;</span>: <span className="text-green-400">&quot;./dist/index.mjs&quot;</span> {"}"}</p>
          <p>{"}"}</p>
        </div>
      </div>
      <p>
        ฟังก์ชัน <code className="text-perry-400">createStrapi</code> ถูกแก้ไขอย่างถูกต้องเป็นฟังก์ชันที่เรียกได้
        ผ่าน <code className="text-perry-400">export * from &apos;@strapi/core&apos;</code>
      </p>

      <h3>การกรอง Export เฉพาะชนิดข้อมูล</h3>
      <p>
        ไวยากรณ์ <code className="text-perry-400">export type {"{"} Foo {"}"}</code> ของ TypeScript ไม่มี
        ความหมายในรันไทม์ — แต่ก่อนหน้านี้ Perry แปลงสิ่งเหล่านี้เป็นรายการ{" "}
        <code className="text-perry-400">Export::ReExport</code> จริงที่แพร่กระจายผ่าน linker
        และสร้างสัญลักษณ์ stub <code className="text-perry-400">index.ts</code> ของ Hono เพียงไฟล์เดียวมี
        สี่การประกาศ <code className="text-perry-400">export type</code> ที่ครอบคลุมชนิดข้อมูลหลายสิบตัว
      </p>
      <p>
        ตอนนี้ Perry ตรวจสอบแฟล็ก <code className="text-perry-400">type_only</code> ของ SWC ในการประกาศ{" "}
        <code className="text-perry-400">ExportNamed</code> และ{" "}
        <code className="text-perry-400">is_type_only</code> ในตัวระบุแต่ละตัว ข้ามพวกมันระหว่าง
        การลดระดับ HIR สิ่งนี้กำจัดการสร้าง stub ที่ตายจาก type re-exports ข้ามทั้งสาม
        โปรเจกต์
      </p>

      <h3>Constructor RegExp</h3>
      <p>
        <code className="text-perry-400">new RegExp(pattern, flags)</code> ตอนนี้คอมไพล์เป็นฟังก์ชันรันไทม์
        <code className="text-perry-400">js_regexp_new</code> ที่มีอยู่ของ Perry สิ่งนี้ทำได้ตรงไปตรงมา
        — รันไทม์รองรับ RegExp อยู่แล้ว — แต่ตัวจัดการ codegen{" "}
        <code className="text-perry-400">Expr::New</code> ไม่มีกรณีสำหรับมัน ดังนั้นทุก{" "}
        <code className="text-perry-400">new RegExp(...)</code> ตกไปเป็นคำเตือน &quot;Unknown class&quot;
        <code className="text-perry-400">RegExpRouter</code> ของ Hono ใช้สิ่งนี้อย่างกว้างขวาง
      </p>

      <h2>สิ่งที่ยังไม่ทำงาน</h2>
      <p>
        เราเจาะจงที่นี่เพราะช่องว่างบอกคุณได้มากเท่ากับชัยชนะ
      </p>

      <h3>การกำหนดคุณสมบัติแบบไดนามิกบน <code className="text-perry-400">this</code></h3>
      <p>
        Constructor ของ Hono ตั้งค่า handler เมธอด HTTP แบบไดนามิก:
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
        ซึ่งหมายความว่า <code className="text-perry-400">app.get</code>,{" "}
        <code className="text-perry-400">app.post</code> ฯลฯ ไม่ได้ถูกประกาศแบบสแตติก — มันถูก
        กำหนดในรันไทม์ผ่านชื่อคุณสมบัติแบบคำนวณ Perry ยังไม่รองรับ{" "}
        <code className="text-perry-400">this[variable] = value</code> ดังนั้นเมธอดเหล่านี้จึงหายไป:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-400">[4] Dynamic method assignment (this[method] = ...)</span></p>
          <p className="text-amber-400">  INFO: app.get not available</p>
          <p className="text-amber-400">  INFO: app.on not available</p>
        </div>
      </div>
      <p>
        นี่คือช่องว่างที่ใหญ่ที่สุดสำหรับ Hono คลาส Hono มีอยู่ router ของมันถูกเริ่มต้น
        แต่คุณไม่สามารถลงทะเบียนเส้นทางได้
      </p>

      <h3>การเรียก Constructor ระดับโมดูล</h3>
      <p>
        tRPC กำหนดจุดเริ่มต้นเป็น:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-purple-400">export const</span> <span className="text-cyan-400">initTRPC</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">TRPCBuilder</span>()</p>
        </div>
      </div>
      <p>
        ในรันไทม์ <code className="text-perry-400">initTRPC</code> แสดงเป็น{" "}
        <code className="text-perry-400">typeof function</code> แทนที่จะเป็น{" "}
        <code className="text-perry-400">typeof object</code> — นิพจน์{" "}
        <code className="text-perry-400">new TRPCBuilder()</code> ระดับโมดูลไม่ได้รัน
        constructor ดังนั้นสิ่งที่คุณได้คือการอ้างอิงไปยังคลาสแทนที่จะเป็นอินสแตนซ์ ซึ่งหมายความว่า{" "}
        <code className="text-perry-400">initTRPC.create()</code> และ{" "}
        <code className="text-perry-400">initTRPC.context()</code> เป็น{" "}
        <code className="text-perry-400">undefined</code> ทั้งคู่
      </p>

      <h3>คุณสมบัติที่สืบทอด</h3>
      <p>
        <code className="text-perry-400">TRPCError extends Error</code> และในขณะที่{" "}
        <code className="text-perry-400">err.code</code> (กำหนดโดยตรงบน{" "}
        <code className="text-perry-400">TRPCError</code>) ทำงาน{" "}
        <code className="text-perry-400">err.message</code> (สืบทอดจาก{" "}
        <code className="text-perry-400">Error</code>) ไม่สามารถเข้าถึงได้ สาย prototype สำหรับการค้นหา
        คุณสมบัติยังไม่ได้ถูกนำไปใช้อย่างเต็มที่
      </p>

      <h3>สายโซ่ Constructor ที่ซับซ้อน</h3>
      <p>
        ฟังก์ชัน <code className="text-perry-400">createStrapi()</code> ของ Strapi ภายในเรียก{" "}
        <code className="text-perry-400">new Strapi(opts)</code> ซึ่งสืบทอดจาก{" "}
        <code className="text-perry-400">Container</code> (รองรับด้วย{" "}
        <code className="text-perry-400">Map</code>) เรียก{" "}
        <code className="text-perry-400">loadConfiguration()</code> วนซ้ำผ่าน providers และลงทะเบียน
        services สายโซ่ constructor ที่ลึกนี้สร้างค่าส่งคืนที่เป็น falsy — ไม่ crash
        แต่ก็ไม่สร้างอินสแตนซ์ที่ใช้งานได้เช่นกัน
      </p>

      <h3>คลาส Built-in ของ Web API</h3>
      <p>
        เหล่านี้คือคำเตือน &quot;Unknown class&quot; ที่เหลือจากสามโปรเจกต์:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">คลาส</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">จำนวน</th>
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
        <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>
        และ <code className="text-perry-400">Headers</code> เป็นตัวสำคัญสำหรับเฟรมเวิร์ก HTTP ใดๆ
        สิ่งเหล่านี้ต้องการการรองรับ codegen แบบ built-in คล้ายกับที่เรามีอยู่แล้วสำหรับ{" "}
        <code className="text-perry-400">Map</code>, <code className="text-perry-400">Set</code>,{" "}
        <code className="text-perry-400">RegExp</code>, <code className="text-perry-400">Buffer</code>,{" "}
        <code className="text-perry-400">AbortController</code> และอื่นๆ
      </p>

      <h2>สิ่งที่สิ่งนี้บอกเรา</h2>
      <p>
        ข่าวดี: ไปป์ไลน์การคอมไพล์ของ Perry จัดการโค้ดเฟรมเวิร์กจริง โปรเจกต์หลายไฟล์
        ที่มีสาย re-export ที่ซับซ้อน ลายเซ็นชนิดข้อมูลที่มีเจเนอริกหนัก ลำดับชั้นคลาส
        และการแก้ไขแพ็กเกจ monorepo ทั้งหมดผ่านไปจนถึงไบนารีที่ลิงก์แล้ว
      </p>
      <p>
        ช่องว่างเป็นช่องว่างรันไทม์ ไม่ใช่ช่องว่างการคอมไพล์ งานที่เหลือคือ:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>การกำหนดคุณสมบัติแบบไดนามิก</strong> — จำเป็นสำหรับเฟรมเวิร์กที่ตั้งค่าเมธอดแบบโปรแกรม</li>
        <li><strong>นิพจน์เริ่มต้นระดับโมดูล</strong> — <code className="text-perry-400">export const x = new Foo()</code> ต้องรัน constructor จริงๆ</li>
        <li><strong>สาย prototype</strong> — คุณสมบัติและเมธอดที่สืบทอด</li>
        <li><strong>Built-ins ของ Web API</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> สำหรับเฟรมเวิร์ก HTTP</li>
      </ol>
      <p>
        เหล่านี้เป็นปัญหาที่เป็นรูปธรรมและมีขอบเขตชัดเจน ไม่มีอันไหนที่ต้องการการเปลี่ยนแปลงสถาปัตยกรรม —
        เป็นส่วนขยายของรูปแบบที่ทำงานได้แล้วสำหรับกรณีที่ง่ายกว่า
      </p>
      <p>
        เราจะทำงานต่อไปกับสิ่งเหล่านี้ เป้าหมายคือ{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        ที่สร้างเซิร์ฟเวอร์ HTTP ที่ทำงานได้ในไบนารีเนทีฟ
      </p>
    </>
  );
}
