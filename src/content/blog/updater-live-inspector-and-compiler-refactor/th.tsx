export default function Content() {
  return (
    <>
      <p>
        โพสต์ที่แล้วปิดท้ายที่ <strong>v0.5.306</strong> ด้วยเรื่อง gen-GC + JSON + benchmark สี่วันต่อมา Perry มาถึง <strong>v0.5.359</strong> — นั่นคือ <strong>53 patch release</strong> — และเรื่องราวก็ต่างออกไปอีกครั้ง ไม่มี release ไหนเป็นพาดหัวด้วยตัวเลข benchmark เลย เกือบทั้งหมดคือ <strong>การปิด issue จากตัว tracker</strong>
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry/updater</code></strong> มาแล้ว — auto-update สไตล์ Sparkle/Tauri สำหรับแอป desktop (Ed25519 บน digest SHA-256, sentinel-rollback, relaunch แบบแยกกระบวนการ) PR จากชุมชนโดย <strong>TheHypnoo</strong> (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a>)</li>
        <li><strong>Geisterhand เฟส D</strong> — inspector แบบ live ที่ <code>http://localhost:7676</code> มี widget tree, รายละเอียดต่อ widget, dispatch คลิก และแก้ style แบบ live ผ่าน <code>POST /style/:h</code></li>
        <li><strong>การ refactor compiler</strong> ตลอดช่วง v0.5.329 → v0.5.343 ไฟล์ที่ถูกอ้างถึงมากที่สุด 4 ไฟล์ถูกผ่าออก: <code>lower::lower_expr</code> 6,687 → 624 LOC (−91%), <code>compile.rs</code> 9,391 → 3,783 LOC (−60%), <code>lower.rs</code> 13,591 → 7,554 LOC (−44%), <code>lower_call.rs</code> 7,000+ → 4,681 LOC (−33%) <code>walker.rs</code> ตัวใหม่เปลี่ยน bug class แบบ catch-all <code>_ =&gt; {}</code> ให้กลายเป็น compile error</li>
        <li><strong>UI styling เฟส C ปิดงาน</strong> — props inline <code>style: {`{ ... }`}</code> บนทุก widget ใน Apple, Android, GTK4, Windows และ Web Windows ต่อสตับครบ 4 จาก 5 (decoration / opacity / borders) เหลือแค่ <code>widget.shadow</code> (follow-up ด้วย DirectComposition)</li>
        <li><strong>Bucket Scoop</strong> สำหรับ Windows: <code>scoop install perry-ts/perry</code> พร้อม sidecar SHA-256 ใน workflow release</li>
        <li><strong>คลื่นการแก้ issue จากชุมชน</strong> — ปิด issue ราว 30 รายการกระจายในด้าน runtime, codegen, fetch, GTK4, Windows linker, async และ stdlib</li>
      </ul>

      <h2>1. perry/updater — auto-update สำหรับแอป desktop</h2>
      <p>
        ก่อนหน้านี้ Perry ไม่มีเส้นทางอัปเดต แอปออก แล้วก็ออก แค่นั้น <strong>TheHypnoo</strong> เปิด <a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> พร้อมเรื่องราวทั้งชุด:
      </p>
      <pre><code>{`import { initUpdater, checkForUpdate, markHealthy } from "@perry/updater";

initUpdater(); // sentinel-rollback ถ้าการเปิดครั้งก่อน crash

const update = await checkForUpdate({
  manifestUrl: "https://example.com/updates/manifest.json",
  publicKey: "<ed25519 raw 32-byte hex>",
  currentVersion: "1.4.0",
});

if (update) {
  await update.download((pct) => console.log(\`\${pct}%\`));
  await update.installAndRelaunch();
}

markHealthy(); // เรียกหลัง build ใหม่บูตขึ้นมาเรียบร้อย`}</code></pre>
      <p>
        โมเดลความน่าเชื่อถือ: <strong>Ed25519 ลงนามบน digest SHA-256 ของไฟล์</strong> (ไม่ใช่บน byte ของไฟล์ — ทำให้การยืนยันถูกแม้กับ binary ขนาดใหญ่) Manifest เป็น JSON มี schema versioning หนึ่งรายการต่อ triple <code>&lt;os&gt;-&lt;arch&gt;</code> ติดตั้งแบบ atomic พร้อม backup <code>&lt;exe&gt;.prev</code>, relaunch แบบแยกกระบวนการ (Unix ใช้ <code>setsid</code>, Windows ใช้ <code>DETACHED_PROCESS</code>) มือถือถูกตัดออกตามดีไซน์ — App Store / Play Store เป็นเจ้าของไปป์ไลน์การติดตั้งในระดับ OS อยู่แล้ว
      </p>
      <p>
        ตอนเขียน smoke test มีลูกเล่นของ Perry runtime สองอย่างโผล่ขึ้นมา และได้ถูกแก้ไปด้วย:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>response.arrayBuffer()</code> คืนค่ามาเป็นแค่สตับ metadata</strong> แก้ใน <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> (TheHypnoo เช่นกัน) — <code>js_response_array_buffer</code> ตอนนี้จองพื้นที่ <code>BufferHeader</code> จริงและ <code>memcpy</code> <code>resp.body</code> เข้าไป</li>
        <li><strong><code>fs.appendFileSync</code> เขียน 0 ไบต์</strong> แก้ใน <a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a> — เส้นทาง lowering แบบ namespace-import (<code>import * as fs from &quot;fs&quot;</code>) ไม่มี arm สำหรับ <code>appendFileSync</code> และฝั่ง LLVM codegen ก็ไม่มี arm สำหรับตัวแปร HIR เช่นกัน ตอนนี้ต่อให้แล้วทั้งคู่</li>
      </ul>
      <p>
        เอกสารอยู่ที่ <code>docs/src/updater/overview.md</code>
      </p>

      <h2>2. Geisterhand: inspector แบบ live ที่ localhost:7676</h2>
      <p>
        Geisterhand เป็นชุดทดสอบ UI แบบ in-process ของ Perry — HTTP API บนพอร์ต 7676 เพื่อ snapshot สถานะ widget และ dispatch คลิก เฟส D เปลี่ยนมันให้กลายเป็น inspector สไตล์ devtools ที่เปิดได้จากเบราว์เซอร์ใดก็ได้
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>ขั้น 1 (v0.5.349)</strong> — <code>GET /</code> เสิร์ฟ UI แบบ vanilla-JS หน้าเดียว มี widget tree, รายละเอียดต่อ widget (frame, value, raw JSON), auto-refresh 1.5 วินาที พร้อม pause/resume และปุ่ม &laquo;ยิง onClick&raquo; codegen ปักหมุด <code>INSPECTOR_HTML</code> ไว้ตรงกับ lazy-load <code>-dead_strip</code> ของ macOS เพื่อให้รอด release build</li>
        <li><strong>ขั้น 2 (v0.5.350)</strong> — <code>POST /style/:h</code> รับชุด props JSON แล้วใช้แบบ live 9 props (<code>backgroundColor</code>, <code>color</code>, <code>borderColor</code>, <code>borderWidth</code>, <code>borderRadius</code>, <code>opacity</code>, <code>padding</code>, <code>hidden</code>, <code>enabled</code>) ไหลจาก HTTP thread → main thread ผ่าน pump-queue เดิม JSON ผิด → 400; handle ผิด → 400; props ที่ไม่รู้จักจะถูกกรองที่ฝั่งเซิร์ฟเวอร์ และ response ระบุว่าตัวไหนผ่านไปได้</li>
      </ul>
      <pre><code>{`perry compile main.ts -o app --enable-geisterhand
./app &
open http://localhost:7676
curl -X POST localhost:7676/style/3 \\
  -H 'content-type: application/json' \\
  -d '{"backgroundColor":"#1a1a1e","opacity":0.8}'
# => {"ok":true,"applied":["backgroundColor","opacity"]}`}</code></pre>
      <p>
        Dispatcher ฝั่ง macOS ต่อแล้ว ส่วน Linux / Windows / iOS / tvOS / visionOS / Android ใช้รูปแบบเดียวกันและจะตามมาเป็นถัดไป
      </p>

      <h2>3. การ refactor compiler — ผ่าไฟล์ใหญ่สุด 4 ไฟล์</h2>
      <p>
        issue 5 รายการใน tracker (<a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a>, <a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a>, <a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a>, <a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> และอีกหางยาว) มีรูปแบบเดียวกัน: มีการเพิ่ม <code>Expr</code> ตัวใหม่เข้าใน <code>ir.rs</code> แต่ ad-hoc walker หนึ่งใน 4 ตัวใน <code>lower.rs</code> มี <code>_ =&gt; {}</code> เป็น catch-all แล้ว compile ผิดเงียบ ๆ การจับเรื่องนี้ตอน runtime แพง — บางทีมองไม่เห็น บางทีก็ SIGSEGV ใต้ SSO
      </p>
      <p>
        <strong>v0.5.329</strong> เปิดตัว <code>crates/perry-hir/src/walker.rs</code> พร้อม <code>walk_expr_children</code> / <code>walk_expr_children_mut</code> — match แบบ exhaustive บน <code>Expr</code> ครบทั้ง 178 ตัวแปร <strong>ไม่มี catch-all</strong> การเพิ่มตัวแปรใหม่โดยไม่ลงทะเบียนที่นี่ ตอนนี้กลายเป็น compile error ผู้ใช้ทั้ง 4 ราย (<code>substitute_locals</code>, <code>find_max_local_id::check_expr</code>, <code>collect_local_refs_expr</code>, <code>remap_local_ids_in_expr</code>) จึงยุบลง:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">ฟังก์ชัน</th>
              <th className="text-right py-2 px-3">ก่อน</th>
              <th className="text-right py-2 px-3">หลัง</th>
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
        รวม: <strong>−1,830 บรรทัด descent ที่ซ้ำซ้อน</strong> ถูกแทนด้วย <strong>+1,840 บรรทัดของ walker รวมศูนย์</strong> — net เกือบเท่าเดิม แต่ bug class หายไปแล้ว
      </p>
      <p>
        นั่นปลดล็อกที่เหลือ <strong>v0.5.331 → v0.5.343</strong> ตัดผ่ามอนอลิธทั้ง 4 ใน 14 commit ตัวเลขพาดหัว:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">ไฟล์</th>
              <th className="text-right py-2 px-3">ก่อน</th>
              <th className="text-right py-2 px-3">หลัง</th>
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
        การแยกตัวลงจอดในรูปของ 19 sub-module ที่โฟกัสเฉพาะ: <code>compile/{`{parse_cache, strip_dedup, library_search, object_cache, resolve, collect_modules, optimized_libs, targets, link}`}.rs</code>, <code>lower/{`{expr_misc, expr_function, expr_object, expr_call, expr_member, expr_assign, expr_new}`}.rs</code>, <code>lower_call/{`{ui_styling, builtin, native}`}.rs</code> บวกกับ crate ใหม่ <code>crates/perry-dispatch</code> ที่กลายเป็นแหล่งความจริงเดียวสำหรับตารางเมธอด UI / system / i18n (fan-out <code>_ =&gt; &quot;perry_ui_unknown&quot;</code> ที่ทำให้เกิดเซอร์ไพรส์ &laquo;คอมไพล์ผ่านบน macOS แต่พังบน web&raquo; ใน issue <a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a> ตอนนี้กลายเป็นการ lookup ครั้งเดียว)
      </p>
      <p>
        <strong>กำไรด้านเพอร์ฟอร์แมนซ์ Tier 4</strong> ไปด้วยกัน (v0.5.335–v0.5.336):
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>รวม 2 พาสใน <code>inline_functions</code> และ 3 พาส rayon ใน <code>compile.rs</code> — ประหยัดการสแกนโมดูล 5 รอบ + การวนกลับของ scheduler 3 รอบต่อการ compile</li>
        <li>จำกัด parse cache ของ <code>perry dev</code> ที่ 500 entry, eviction แบบ FIFO ก่อนแก้ เซสชันที่ไล่ <code>node_modules</code> สามารถถือครอง SWC AST 100+ MB</li>
        <li>ทำขั้นเขียน <code>.ll</code> หลัง codegen ให้ขนานกัน — wall-time เร็วขึ้น 2–4 เท่าบน SSD ที่มี 50+ โมดูล</li>
        <li>ใช้ <code>Arc&lt;I18nTable&gt;</code> แทนการ clone ตาราง locale ต่อ worker</li>
      </ul>
      <p>
        การทดสอบ workspace อยู่ที่ <strong>434 passed / 0 failed / 5 ignored</strong> ทุก commit; gap test อยู่ที่ baseline 25/28; doc-test อยู่ที่ baseline 80/82
      </p>

      <h2>4. UI styling เฟส C เสร็จ</h2>
      <p>
        เฟส C คือการ rollout <code>style: {`{ ... }`}</code> แบบ inline ขั้น 1–7 ปิดในหน้าต่างนี้:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.305 → v0.5.306</strong> — type surface <code>StyleProps</code> + <code>style:</code> inline บน Button</li>
        <li><strong>v0.5.307 → v0.5.309</strong> — destructure inline สำหรับ color/padding/shadow บนทุก widget ตาราง แล้วต่อด้วย VStack / HStack</li>
        <li><strong>v0.5.310 → v0.5.311</strong> — string hex + gradient + <code>parseColor</code> ตอน runtime สำหรับค่าที่เป็นแบบ dynamic</li>
        <li><strong>v0.5.312</strong> — เอกสาร styling + issue tracking ฝั่ง Windows</li>
      </ul>
      <p>จากนั้นกวาด cross-platform:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>GTK4</strong> (<a href="https://github.com/PerryTS/perry/issues/202" className="text-amber-400 hover:text-amber-300">#202</a>, <a href="https://github.com/PerryTS/perry/issues/206" className="text-amber-400 hover:text-amber-300">#206</a>) — ต่อ FFI styling 4 ตัว บวก 7 FFI ที่ขาดและขวาง doc-tests ฝั่ง Linux (v0.5.322)</li>
        <li><strong>macOS</strong> (v0.5.324) — เดินท่อ shadow บน <code>CALayer</code> ให้ <code>widget.shadow</code> + โครงสร้าง visual_test รวมถึง class-probe สำหรับ <code>set_color</code> ของ widget ที่ไม่ใช่ <code>NSTextField</code></li>
        <li><strong>iOS / tvOS / visionOS</strong> (v0.5.346) — Button ที่มี <code>color: ...</code> เคยเรียก <code>setTextColor:</code> บน <code>UIButton</code> ซึ่งไม่ได้ implement selector ดังกล่าว; panic ของ <code>objc2</code> จึงข้ามขอบ <code>extern &quot;C&quot;</code> และโปรเซสถูก abort แก้ด้วย pattern class-probe เดียวกับ macOS — UIButton ตอนนี้วิ่งผ่าน <code>setTitleColor:forState:UIControlStateNormal</code></li>
        <li><strong>Windows</strong> (v0.5.347) — ต่อ stub styling 4 จาก 5 (<code>text.decoration</code> ผ่าน <code>LOGFONT</code> round-trip, <code>widget.opacity</code> ผ่าน <code>WS_EX_LAYERED</code> + <code>SetLayeredWindowAttributes</code>, borders ผ่าน <code>SetWindowSubclass</code> + <code>WM_PAINT</code>) เหลือแค่ <code>widget.shadow</code> (ต้องการ DirectComposition)</li>
      </ul>
      <p>
        ตาราง styling ใน <code>docs/src/ui/styling-matrix.md</code> ปิดหน้าต่างด้วย <strong>Web ที่ 43/43 Wired</strong>, <strong>Windows ที่ 42/43 Wired</strong> ส่วนที่เหลือคลุมเต็ม
      </p>

      <h2>5. รอบความถูกต้องของ runtime — ทีละ issue</h2>
      <p>
        ธีมของช่วงนี้คือ ทุก miscompile ที่เข้ามาผ่าน tracker กลายเป็นการแก้หรือกลายเป็น compile-time error ไฮไลต์:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/212" className="text-amber-400 hover:text-amber-300">#212</a> (v0.5.323)</strong> — class method ภายใน <code>fn</code> ไม่สามารถ capture local ของ fn รอบ ๆ ได้ การ repro แบบหลายโมดูลตอนนี้ตรงกับ Node ระดับไบต์ต่อไบต์</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/214" className="text-amber-400 hover:text-amber-300">#214</a> (v0.5.321 + v0.5.330)</strong> — การ unbox string-handle แบบ SSO-safe ใน 7 จุดที่ใช้ string เป็น operand: <code>arr.join</code>, <code>arr.toString</code>, <code>obj[stringKey]</code> get/set/delete, <code>string.match(re)</code>, <code>process.env[dynKey]</code>, input ของ crypto digest ก่อนแก้ ทุกอันคืนขยะเงียบ ๆ หรือไม่ก็ SIGSEGV เมื่อเจอ operand แบบ inline-string</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/221" className="text-amber-400 hover:text-amber-300">#221</a> (v0.5.351)</strong> — array <code>const</code> ระดับโมดูลที่ว่างทำให้ writes <code>arr[i]=</code> จากข้างในฟังก์ชันหายไป ปรากฏตอน <code>discoverLevels()</code> ของ Bloom-Engine/jump เติม <code>LEVEL_FILES</code> ที่ระดับโมดูลด้วย index-assign แล้วจอเลือกด่านขึ้นว่างเปล่า</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/233" className="text-amber-400 hover:text-amber-300">#233</a> (v0.5.357)</strong> — <code>Array.push</code> จากภายในฟังก์ชัน async ถูกจำกัดเงียบ ๆ ที่ 16 องค์ประกอบเมื่ออาเรย์ถูกส่งเข้ามาทางพารามิเตอร์ ฟังก์ชัน async ไม่ถูก inline; การ realloc คืนพอยน์เตอร์ใหม่ที่ผู้เรียกไม่เห็น แก้: ติด forwarding pointer ที่ตำแหน่งเดิมทุกครั้งที่ขยาย โดยใช้กลไก <code>GC_FLAG_FORWARDED</code> เดิมของ GC</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/235" className="text-amber-400 hover:text-amber-300">#235</a> (v0.5.358)</strong> — dispatch ของ default param ของ method ส่งขยะเมื่อผู้เรียกข้าม arg ท้าย ๆ ส่วนหลักที่ทำให้เกิดปัญหา 2 ส่วน: declare ของ method แบบ cross-module ฮาร์ดโค้ด 6 double แทนที่จะเป็น <code>arity + 1</code> และ <code>lower_class_method</code> ก็ไม่ได้เรียก <code>build_default_param_stmts</code> เลย ปรากฏใน <code>findOne(filter, options = {`{}`})</code> ของ mongodb ที่ค้างเงียบ ๆ; การแก้ครอบทั้ง dispatch ภายในและ cross-module อย่างเป็นเอกภาพ</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/236" className="text-amber-400 hover:text-amber-300">#236</a> (v0.5.355)</strong> — bug fetch + promise สามตัวแยกอิสระจาก repro เดียว: api.github.com 403 ให้คำขอแบบไม่ระบุตัว (ตอนนี้ตั้ง User-Agent default), <code>.then(console.log)</code> ค้างไม่จบ (callback null ไม่ push entry เข้า TASK_QUEUE), การ reject ของ fetch ทุกครั้งพิมพ์ <code>Uncaught exception: [object Object]</code> (<code>*StringHeader</code> เปล่าถูก NaN-box แทนที่จะเป็น <code>ErrorHeader</code> จริง)</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/234" className="text-amber-400 hover:text-amber-300">#234</a> (v0.5.359)</strong> — <code>Blob</code> จริงพร้อม method instance <code>arrayBuffer</code> / <code>text</code> / <code>bytes</code> / <code>slice</code> ก่อนแก้ <code>await response.blob()</code> คืนสตับ metadata <code>{`{size, type}`}</code> การแก้สามส่วนลงสู่ runtime + HIR + codegen</li>
      </ul>
      <p>บวกการตามเก็บเล็ก ๆ:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><a href="https://github.com/PerryTS/perry/issues/181" className="text-amber-400 hover:text-amber-300">#181</a></strong> — strip-dedup ตัด monomorphization แบบ generic บน Linux มากเกินไป + silent-fallback ของ link GTK4 แก้: เปลี่ยนจากการกรองด้วย name pattern เป็นการเปรียบเทียบ <strong>เซตของซิมโบล</strong> ผ่าน <code>llvm-nm</code> สมาชิกที่มีซิมโบลเฉพาะแม้แค่ตัวเดียวจะถูกเก็บไว้ ตัด <code>libperry_ui_macos.a</code> จาก 196 → 35 object โดยไม่มี link error</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/220" className="text-amber-400 hover:text-amber-300">#220</a></strong> — เพิ่ม <code>secur32.lib</code> ในบรรทัด link ของ Windows</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/198" className="text-amber-400 hover:text-amber-300">#198</a></strong> — i18n <code>FormatNumber</code> ทำ FP round-trip ผ่าน Ryū</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/188" className="text-amber-400 hover:text-amber-300">#188</a></strong> — ต่อ codegen dispatch สำหรับ wrapper format ของ <code>perry/i18n</code></li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/189" className="text-amber-400 hover:text-amber-300">#189</a> / <a href="https://github.com/PerryTS/perry/issues/203" className="text-amber-400 hover:text-amber-300">#203</a></strong> — codegen dispatch ของ <code>perry/plugin</code></li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/190" className="text-amber-400 hover:text-amber-300">#190</a></strong> — Canvas widget ผ่าน LLVM codegen</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/191" className="text-amber-400 hover:text-amber-300">#191</a></strong> — CameraView ผ่าน codegen</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/192" className="text-amber-400 hover:text-amber-300">#192</a></strong> — Table widget ผ่าน codegen</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/193" className="text-amber-400 hover:text-amber-300">#193</a></strong> (บางส่วน) — 11 arm dispatch ของ stdlib helper</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/98" className="text-amber-400 hover:text-amber-300">#98</a></strong> — รับ notification เบื้องหลังบน iOS + Android (warm-path)</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/106" className="text-amber-400 hover:text-amber-300">#106</a></strong> — fallback แบบอ่อนสำหรับ FFI hook ของ game-loop บน watchOS</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/154" className="text-amber-400 hover:text-amber-300">#154</a></strong> — hook dispose ของ <code>using</code> / <code>await using</code></li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/167" className="text-amber-400 hover:text-amber-300">#167</a></strong> — ยก alloca ของ args ของ <code>js_native_call_method</code> ขึ้นบล็อก entry</li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/169" className="text-amber-400 hover:text-amber-300">#169</a></strong> — arm Uint8Array ของ <code>substitute_locals</code></li>
        <li><strong><a href="https://github.com/PerryTS/perry/issues/226" className="text-amber-400 hover:text-amber-300">#226</a></strong> — ต่อ <code>fs.appendFileSync</code> end-to-end (PR ชุมชน)</li>
      </ul>

      <h2>6. Windows + Scoop</h2>
      <p>
        เรื่อง toolchain ของ Windows ทำตัวง่ายขึ้นเรื่อย ๆ <strong>v0.5.353</strong> ปักหมุด <code>clang -target</code> บน build ของ host — clang ที่ไม่ใช่ MSVC ใน PATH (MinGW / MSYS2 / Anaconda / bundle GNU ของ Rust) แอบเขียน IR ของ Perry จาก <code>x86_64-pc-windows-msvc</code> เป็น <code>windows-gnu</code> และ lld-link ไม่สามารถ resolve อ้างอิง <code>__main</code> ที่ emitter mingw32 ของ LLVM ใส่เข้าไป <code>probe_clang_default_triple</code> ตัวใหม่รัน <code>clang --version</code> ครั้งเดียวต่อโปรเซส และพิมพ์โน้ตข้อมูลบรรทัดเดียวเมื่อ default ของ host เป็น GNU แต่เรา target MSVC ปิดได้ด้วย <code>PERRY_NO_CLANG_PROBE=1</code>
      </p>
      <p>
        <strong>v0.5.345</strong> ปรับ ABI ของ <code>perry-ui</code> บน Win64 ให้ตรงกับ <code>perry-dispatch</code> — ลายเซ็น extern ของ runtime สามตัวเขยิบไปแล้ว (<code>perry_ui_navstack_create</code>, <code>perry_ui_menu_add_item_with_shortcut</code>, <code>perry_ui_app_set_timer</code>) บน ABI ของ Win64 อาร์กิวเมนต์เชิงตำแหน่งของ integer และ float ใช้ index slot ร่วมกัน ดังนั้น mismatch จึงอ่านขยะจาก register ที่ยังไม่ initialize SysV (macOS / Linux) ใช้ pool register int/float แยกกัน และบังเอิญตกอยู่ที่ bit ที่ใช้งานได้ — crash เฉพาะ Windows เท่านั้น และแก้ทั่วทั้ง 8 crate ของแพลตฟอร์ม perry-ui-*
      </p>
      <p>
        จากนั้น: <strong><code>scoop install perry-ts/perry</code></strong> manifest ปักหมุดที่ v0.5.345 (ใช้ <code>depends: main/llvm</code> เพื่อดึง LLVM ทางการแบบ default-MSVC อัตโนมัติ) workflow release ตอนนี้ปล่อย sidecar <code>&lt;artifact&gt;.sha256</code> ข้างทุก archive ในรูปแบบที่เข้ากันได้กับ <code>sha256sum</code> สำหรับ bumper ของ package manager ปลายทางอะไรก็ได้
      </p>
      <pre><code>{`# host Windows
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry
perry compile src\\main.ts --target windows -o myapp.exe`}</code></pre>

      <h2>7. ปิดท้าย</h2>
      <p>
        แพตเทิร์นของช่วงนี้คือ การมีส่วนร่วมของชุมชนบวกกับสุขอนามัยภายใน <strong>TheHypnoo</strong> ส่ง PR สำคัญ 3 ตัว (<a href="https://github.com/PerryTS/perry/pull/224" className="text-amber-400 hover:text-amber-300">#224</a> perry/updater, <a href="https://github.com/PerryTS/perry/pull/231" className="text-amber-400 hover:text-amber-300">#231</a> ต่อ <code>fs.appendFileSync</code>, <a href="https://github.com/PerryTS/perry/pull/232" className="text-amber-400 hover:text-amber-300">#232</a> byte ของ body ใน <code>response.arrayBuffer</code>) tracker ลดลงราว 30 issue compiler เล็กลง 60% บนไฟล์ที่ใหญ่ที่สุด และมี exhaustive walker ที่เปลี่ยน &laquo;ลืมอัปเดต ad-hoc walker ตัวหนึ่งใน 4 ตัว&raquo; จาก miscompile runtime ให้กลายเป็น <code>cargo build</code> error UI styling ถึงระดับเทียบเท่ากันบนทุกแพลตฟอร์ม desktop ยกเว้นเงาบน Windows Geisterhand ขยายไปสู่หน้า devtools บนเบราว์เซอร์ เส้นทางติดตั้งบน Windows สั้นลงไป 1 คำสั่ง
      </p>
      <p>ลอง:</p>
      <pre><code>{`# npm (ทุกแพลตฟอร์ม)
npm install @perryts/perry
npx perry compile src/main.ts -o myapp && ./myapp

# Homebrew (macOS)
brew install PerryTS/perry/perry

# Scoop (Windows)
scoop bucket add perry-ts https://github.com/PerryTS/perry
scoop install perry-ts/perry

# Auto-update สำหรับแอป desktop
npm install @perry/updater

# inspector แบบ live
perry compile main.ts -o app --enable-geisterhand
./app &  # แล้วเปิด http://localhost:7676`}</code></pre>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
        {" "}— Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
