export default function Content() {
  return (
    <>
      <p>
        โพสต์ที่แล้วจบลงที่ <strong>v0.5.875</strong> ด้วยเรื่อง GC — การปิด gap ที่ benchmark ของ aya_koto เปิดเผยออกมา โพสต์นั้นว่าด้วยการชนะ benchmark ตัวเดียว โพสต์นี้ว่าด้วยงานคนละแบบ: ราว <strong>270 release ระหว่าง v0.5.875 ถึง v0.5.1146</strong> ที่ลงจอดภายในราวสี่สัปดาห์ แทบไม่มีตัวไหนเป็นพาดหัวด้าน benchmark เลย ธีมขยับจาก &ldquo;วิ่งให้เร็วบน microbenchmark&rdquo; ไปสู่ <strong>&ldquo;ทำให้ TypeScript ในโลกจริงและ npm package จริงคอมไพล์และรันได้จริง&rdquo;</strong> บวกกับการยกเครื่องด้านภาพของ Windows เต็มรูปแบบและ widget ใหม่อีกกองหนึ่งระหว่างทาง
      </p>
      <p>
        นี่คือสิ่งที่ปล่อยออกมา จัดกลุ่มตามว่ามันมีไว้เพื่ออะไรจริง ๆ
      </p>

      <h2>Real npm packages compile now</h2>
      <p>
        เส้นเรื่องเดี่ยวที่ใหญ่ที่สุดตลอดช่วงนี้คือการกวาดเพื่อทำให้ npm package ยอดนิยมคอมไพล์เป็น native binary และผ่านการทดสอบเชิงพฤติกรรม — ไม่ใช่แค่ &ldquo;link โดยไม่มี error&rdquo; แต่รันและให้ผลลัพธ์ที่ถูกต้อง รายการที่ตอนนี้ทำงานได้ผ่าน <code>perry.compilePackages</code> รวมถึง <strong>axios, jose, zod v4, vitest, express, fastify, @hono/node-server, dayjs, chalk, ms, debug, lodash, ethers, argon2, และ Colyseus</strong>
      </p>
      <p>
        แต่ละตัวล้มด้วยเหตุผลของตัวเอง และการแก้แต่ละครั้งก็เป็นเรื่องราวเล็ก ๆ ของมันเอง:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>zod v4</strong> crash ด้วย <code>Cannot read properties of undefined (reading &apos;onattach&apos;)</code> ต้นเหตุ (v0.5.1144, <a href="https://github.com/PerryTS/perry/issues/4698" className="text-amber-400 hover:text-amber-300">#4698</a>): <code>new F()</code> ที่ <code>F</code> เป็นฟังก์ชันที่ import มาจากอีกโมดูลให้ object ว่างเปล่าแบบเงียบ ๆ — body ของ constructor ไม่เคยรัน ดังนั้น check สไตล์ <code>$ZodCheckMinLength</code> ทุกตัวกลับมาโดยถูกถอด property <code>_zod</code> ออก</li>
        <li><strong>axios + jose</strong> ต้องการ crypto และ compression ที่ Perry ยังไม่มี: <code>zlib.createBrotliDecompress</code>, <code>crypto.subtle.wrapKey</code>/<code>unwrapKey</code>, <code>subtle.generateKey</code> / <code>encrypt</code> / <code>decrypt</code> สำหรับ AES-GCM และ <code>randomFillSync</code> (v0.5.972–976)</li>
        <li><strong>fastify</strong> เกิด deadlock บน polling timeout หนึ่งวินาทีใน <code>wait_for_promise</code> เราแทนมันด้วยการรอแบบ condvar และทำให้ promise ที่ถูก reject ผุดขึ้นมาเป็น <code>HTTP 500</code> แทนที่จะค้าง (v0.5.912)</li>
        <li><strong>@hono/node-server</strong> อ่าน POST body ไม่ได้ — <code>c.req.text()</code> / <code>.json()</code> / <code>.formData()</code> คืนค่าว่างบน POST/PUT จนกระทั่งการแก้ parent-registration ใน v0.5.1142</li>
        <li><strong>chalk, ms, debug, express</strong> ชนรูปร่างเดียวกันทั้งหมด: <em>ค่าที่เรียกได้พร้อม property ติดมาด้วย</em> (<code>chalk.red</code>, <code>express()</code> บวก <code>express.Router</code>) รูปแบบนั้นสามแบบถูกแก้ตลอด v0.5.935 และการกวาด npm รอบ ๆ บวก <code>util.inherits</code> + โครง stream prototype เพื่อปลดล็อก express (v0.5.990)</li>
        <li><strong>dayjs</strong> ที่ปล่อยมาเป็น bundle แบบ minified ออกแรงกับ prototype-method dispatch สไตล์ JS-classic (<code>Class.prototype.m = fn</code>) ที่ Perry lower ผิด (v0.5.924/932)</li>
      </ul>
      <p>
        ใต้ทั้งหมดนั้นคือส่วนที่ทำให้ package ที่ Perry <em>คอมไพล์ native ไม่ได้</em> ยังรันได้: <strong>V8-fallback runtime</strong> เป็นจริงเป็นจังขึ้นในช่วงนี้ ModuleLoader ของมันตอนนี้อ่านจาก embedded module map ดังนั้น binary แบบ fallback ก็ยัง <strong>self-contained</strong> — ไม่มี <code>node_modules</code> กระจัดกระจายตอน runtime (v0.5.994) <code>createServer</code> เชื่อมไปยัง hyper server จริง (v0.5.999) และ global ของ Web Fetch อย่าง <code>Response</code> / <code>Request</code> / <code>Headers</code> มีอยู่ใน path แบบ fallback (v0.5.1006) และ <strong><code>import()</code> แบบ dynamic ที่ compile-time</strong> — <code>await import(&apos;./foo.ts&apos;)</code> แบบ string-literal ที่ resolve ตอน build — ในที่สุดก็ลงจอด (v0.5.905, <a href="https://github.com/PerryTS/perry/issues/100" className="text-amber-400 hover:text-amber-300">#100</a>)
      </p>

      <h2>A test262 conformance sweep</h2>
      <p>
        อีกเส้นเรื่องที่โดดเด่นคือ conformance เรารัน pass แบบโฟกัสเทียบกับ radar ของ subset test262 และขยับเข็มบน built-in ที่ code จริงพิงหนักที่สุด:
      </p>
      <pre><code>{`built-ins/String         60.2% → 79.3%   (v0.5.1128)
built-ins/Array          61.5% → 72.5%   (v0.5.1127)
language/.../destructuring 41.6% → 53.9%  (v0.5.1143)`}</code></pre>
      <p>
        การกระโดดของ String มาจากการให้ทุกเมธอด <code>String.prototype</code> มี dispatch แบบ generic-<code>this</code> และแก้ index coercion ของ <code>slice</code>/<code>substring</code> การกระโดดของ Array คือ <code>thisArg</code> บน callback ของ dense-array (<code>forEach</code>/<code>map</code>/<code>filter</code>/…), <code>ToLength</code> แบบ array-like, การจัดลำดับ spec operation และการ validate กรณีไม่มี argument Destructuring เก็บ parameter-destructuring ข้ามทั้ง plain, generator, async-generator, static และ private class method
      </p>
      <p>
        ควบคู่กับตัวเลขพาดหัว ความถูกต้องหางยาวก็ลงจอด: <code>JSON.parse</code> ตอนนี้โยน <code>SyntaxError</code> จริง (ไม่ใช่ <code>TypeError</code>) และปฏิเสธ token ที่ตามท้าย reviver ของมันเดินผ่านอัลกอริทึม <code>InternalizeJSONProperty</code> ตาม spec <code>Object.prototype.toString</code> brand ได้ถูกต้องสำหรับ typed array, Symbol, BigInt, Map/Set/WeakMap/WeakSet/Promise/RegExp <code>RegExp.prototype.toString</code> คืน <code>/source/flags</code> async generator ได้ semantics ของ <code>yield</code>-awaits-operand ถูกต้อง เหล่านี้เป็น subset radar ไม่ใช่ suite เต็ม — Perry ยังไต่อยู่ — แต่การไต่ของเดือนนี้ชันมาก
      </p>

      <h2>Windows goes Fluent</h2>
      <p>
        Windows ได้รับการยกเครื่องด้านภาพ (ชุด <a href="https://github.com/PerryTS/perry/issues/4681" className="text-amber-400 hover:text-amber-300">#4681</a>) หน้าต่าง Perry ตอนนี้เลือกใช้ DWM chrome สมัยใหม่โดย default — <strong>Mica backdrop</strong>, มุมโค้งมน และ title bar ที่รับรู้ธีม — และ common control เรนเดอร์ผ่าน <strong>comctl32 v6</strong> แทน default ยุค Windows 95 window proc ตอนนี้จัดการ <code>WM_DPICHANGED</code> ดังนั้นหน้าต่างยังคมเมื่อคุณลากมันระหว่างจอที่มี scaling ผสมกัน แทนที่จะถูกยืด bitmap
      </p>
      <p>
        ที่สำคัญ ไม่มีอะไรในนี้นำ regression <a href="https://github.com/PerryTS/perry/issues/1542" className="text-amber-400 hover:text-amber-300">#1542</a> เก่า &ldquo;พื้นที่ดำหลัง resize&rdquo; กลับมาอีก: client area ยังถูกวาดทึบแสง และ blur-through แบบ Mica/Acrylic เต็มเฟรมยังเป็น opt-in <code>app.setVibrancy(...)</code> แบบชัดเจน ยังมี backend scaffold <code>--target windows-winui</code> ตัวใหม่ (WinUI 3) สำหรับแอปที่อยากได้ stack สมัยใหม่เต็มตัว และการแก้เล็ก ๆ แต่เป็นเรื่องจริงที่ทำให้ <code>perry compile main.ts -o main</code> ผลิต <code>main.exe</code> บน Windows เพื่อให้ PowerShell launch มันได้จริง (v0.5.1146)
      </p>

      <h2>New widgets, every platform</h2>
      <p>
        widget สองตัวลงจอดในวันสุดท้ายพอดี และทั้งคู่ครอบทุกแพลตฟอร์ม UI ที่ Perry target:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>DatePicker</strong> (<a href="https://github.com/PerryTS/perry/issues/4772" className="text-amber-400 hover:text-amber-300">#4772</a>) — date control แบบ field กะทัดรัด: <code>NSDatePicker</code> บน macOS, <code>UIDatePicker</code> (.compact) บน iOS/visionOS, <code>SysDateTimePick32</code> บน Windows, <code>android.widget.DatePicker</code> บน Android, GTK4 บน Linux ผิว TS เดียวข้ามทั้งหมด</li>
        <li><strong>Drag &amp; drop</strong> (<a href="https://github.com/PerryTS/perry/issues/4773" className="text-amber-400 hover:text-amber-300">#4773</a>) — widget ใด ๆ เป็น drop destination และ drag source สำหรับ text/files/URLs ได้ แมปไปยัง <code>NSDraggingDestination</code> (AppKit), <code>UIDropInteraction</code> (UIKit), และ <code>View.setOnDragListener</code> (Android)</li>
      </ul>
      <pre><code>{`import { DatePicker } from "@perry/ui";

DatePicker(2026, 6, (iso) => {
  // iso is a POSIX-locale "yyyy-MM-dd" string
  console.log("picked", iso);
});`}</code></pre>
      <p>
        ก่อนหน้านี้ในช่วงเดียวกัน ชั้นวาง widget ก็เต็มขึ้นทั้งบน desktop และ mobile ด้วย — Combobox, TreeView, Calendar, Chart, CommandPalette, RichTextEditor, MapView, PdfView, BottomNavigation, และ ImageGallery แบบ swipe ได้ — แต่ละตัวหนุนด้วย native control จริงบนทุกแพลตฟอร์ม HarmonyOS (ArkTS) ได้ Chart และ TreeView (v0.5.893) สอง widget สุดท้ายที่มันต้องการเพื่อให้เทียบเท่ากับตัวอื่น
      </p>

      <h2>GC, internals, and stability</h2>
      <p>
        release 270 ตัวนั้นส่วนใหญ่ไม่ใช่พาดหัว — มันคือ bug fix และ internals และนั่นคือประเด็นของเฟสนี้ มีบางอย่างที่ควรกล่าวถึง:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong>GC เดินหน้าต่อ</strong> งาน conditional free-list จากโพสต์ GC ยังคงค่อย ๆ ลงตัว และ bug คลาสคม ๆ หนึ่งก็ถูกปิด: Promise ที่เชื่อม native ตอนนี้ <strong>ถูกปักหมุดไว้ขณะ in flight บน tokio worker</strong> เพื่อให้ GC ไม่สามารถ sweep มันก่อนที่การ resolve จะลงจอด (v0.5.923) ถ้าคุณรัน async fetch ภายใต้โหลดแล้วเห็นการ collect แบบผีหลอก นั่นคือเรื่องนี้</li>
        <li><strong>memory model มีเอกสารแล้ว</strong> ตอนนี้มี deep-dive <code>internals/memory-model.md</code> — NaN-boxing, generational GC, shadow stack และ write barrier — ต่อเข้ากับ docs site (v0.5.933)</li>
        <li><strong>คลื่นการแก้ความเสถียรของ codegen</strong> ที่การกวาด npm ทำให้ผุดขึ้นมา: arrow ที่เป็น <code>const</code> ระดับโมดูลที่เรียกข้างใน async step ที่ resume แล้วไม่ SIGSEGV อีก (v0.5.953), <code>{`try { await rejected } catch { return X }`}</code> ไม่ค้างชั่วนิรันดร์อีก (v0.5.870), และ crash แบบ <code>js_is_truthy</code> / raw-pointer-range อีกหยิบมือที่ bundle จริงสะดุด</li>
      </ul>

      <h2>Apple housekeeping</h2>
      <p>
        เล็กกว่าแต่เป็นเรื่องจริง: <code>perry setup ios --development</code> ตอนนี้ provision สำหรับ development build (v0.5.1023) และ path build/link ของ Apple cross-library ถูก dedup และทำให้ portable ด้านความกว้างของ pointer (v0.5.1121/1125) — ซึ่งเป็นสิ่งที่ปลดล็อก matrix การ publish npm / Homebrew / APT / winget ที่เคยติดขัดอยู่
      </p>

      <h2>Where this leaves things</h2>
      <p>
        เดิมพันเบื้องหลัง Perry มาตลอดคือ &ldquo;native TypeScript&rdquo; จะมีความหมายก็ต่อเมื่อ TypeScript <em>จริง</em> รันได้ — ไม่ใช่ subset ของเล่น แต่คือ package จริงที่คน <code>npm install</code> เดือนนี้ส่วนใหญ่คืองานนั้น: ไม่ใช่ตัวเลขเดียวไว้คุยโม้ แต่เป็นการดันอันยืดยาวไร้ความหรูหราเพื่อปิด gap ระหว่าง &ldquo;คอมไพล์ได้&rdquo; กับ &ldquo;ทำงานได้&rdquo; radar ของ conformance และ test ความเทียบเท่าของ npm คือ scoreboard ที่เราจับตาอยู่ตอนนี้ และเราจะโพสต์ตัวเลขต่อไป — ทั้งส่วนที่ดีและส่วนที่ยังไม่สมบูรณ์
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
