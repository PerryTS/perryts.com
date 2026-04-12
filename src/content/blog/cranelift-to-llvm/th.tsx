export default function Content() {
  return (
    <>
      <p>
        การย้าย backend ของ Perry จาก Cranelift ไปยัง LLVM เสร็จสมบูรณ์แล้ว ตั้งแต่ v0.5.12 เป็นต้นไป LLVM เป็น backend สำหรับ code generation เพียงตัวเดียว และตอนนี้ Perry เอาชนะ Node.js ได้ 14 จาก 15 benchmark &mdash; ด้วยมาร์จินตั้งแต่ 1.06x ถึง 24.6x
      </p>
      <p>
        การมาถึงจุดนี้ไม่ได้ราบรื่น การเปลี่ยนครั้งแรกใน v0.5.0 ทำให้หลาย benchmark <strong>ช้าลง 70 เท่า</strong>เมื่อเทียบกับเวอร์ชัน Cranelift ที่มันมาแทนที่ บทความนี้เป็นเวอร์ชันฉบับเต็มของสิ่งที่เกิดขึ้น เหตุผลที่เราตัดสินใจเปลี่ยนอยู่ดี อะไรพัง อะไรแก้ไขมัน และตัวเลขเป็นอย่างไรหลังจากผ่านมาได้
      </p>
      <p>
        ถ้าคุณกำลังสร้าง compiler กำลังประเมิน codegen backend หรือแค่อยากรู้ว่าทำไม &ldquo;เปลี่ยนไปใช้ LLVM&rdquo; ถึงไม่ค่อยง่ายอย่างที่ฟังดู บทความนี้สำหรับคุณ
      </p>

      <h2>ส่วนที่ 1: ทำไมถึงต้องเปลี่ยน?</h2>
      <p>
        Perry คอมไพล์ TypeScript ตรงไปเป็นโค้ดเครื่องแบบเนทีฟ ไม่มี Node ไม่มี V8 ไม่มี Electron ไม่มี WebView ข้อเสนอคือ &ldquo;เขียน TypeScript ส่งออกเป็นไบนารีเนทีฟ&rdquo; และคุณค่าทั้งหมดจะพังทลายถ้าไบนารีนั้นไม่ได้เร็วจริง
      </p>
      <p>
        ในช่วงเวอร์ชันแรก ๆ ของ Perry backend สำหรับ codegen คือ <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a> Cranelift ยอดเยี่ยม &mdash; เป็น codegen เบื้องหลัง wasmtime ถูกใช้โดย baseline JIT ของ SpiderMonkey และเป็นเครื่องมือที่เหมาะสมเมื่อคุณต้องการคอมไพล์ที่เร็วและคาดเดาได้พร้อมการ embed ที่สะอาด สำหรับโปรเจกต์ที่กำลัง bootstrap ภาษาใหม่ มันเป็นจุดเริ่มต้นที่ถูกต้อง
      </p>
      <p>
        แต่มีสองสิ่งที่ทำให้เราต้องเปลี่ยน
      </p>

      <h3>1. เพดานของ optimizer</h3>
      <p>
        Cranelift ถูกออกแบบให้เป็น compiler ที่ปรับแต่งเร็วแบบ single-tier โดยเจตนา หน้าที่ของมันคือ &ldquo;สร้างโค้ดที่ใช้ได้เร็ว&rdquo; ไม่ใช่ &ldquo;สร้างโค้ดที่ดีที่สุดเท่าที่จะเป็นไปได้โดยไม่จำกัดเวลา&rdquo; นั่นเป็น tradeoff ที่ถูกต้องสำหรับ JIT แต่เป็น tradeoff ที่ผิดสำหรับ AOT compiler ที่จุดขายทั้งหมดคือประสิทธิภาพเนทีฟ
      </p>
      <p>
        LLVM มีการพัฒนามากกว่าสองทศวรรษที่เทลงไปใน middle-end Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis &mdash; ไม่มีโลกที่เป็นจริงที่โปรเจกต์เล็กกว่าจะตามทัน ถ้า Perry จะอ้างว่า &ldquo;เร็วกว่า Node&rdquo; เราต้องการเครื่องจักรเหล่านั้น
      </p>

      <h3>2. ปัญหา arm64_32</h3>
      <p>
        ปัจจัยบังคับโดยตรงคือ Apple Watch <code>arm64_32</code> เป็น ABI ที่ Apple เปิดตัวสำหรับ Series 4 เป็นต้นไป &mdash; คำสั่ง 64-bit พอยน์เตอร์ 32-bit Cranelift ไม่รองรับ และไม่มีเส้นทางที่เป็นจริงที่จะรองรับได้ เพื่อให้ Perry อ้างได้อย่างน่าเชื่อถือว่า &ldquo;9 แพลตฟอร์มจาก codebase เดียว&rdquo; watchOS ขาดไม่ได้ LLVM รองรับ <code>arm64_32</code> ได้ทันที
      </p>
      <p>
        เมื่อเรายอมรับว่า<em>บาง</em>เป้าหมายจะต้องใช้ LLVM การดูแลสอง backend ก็เป็นไปไม่ได้ สอง backend หมายถึงสอง set ของ bug สอง set ของ optimization pass สองเมทริกซ์การทดสอบ สอง baseline ด้านประสิทธิภาพ คำตอบที่ตรงไปตรงมาคือ: เลือกตัวเดียว
      </p>
      <p>เราเลือก LLVM</p>

      <h2>ส่วนที่ 2: ว่าด้วย Cranelift</h2>
      <p>
        ก่อนไปต่อ: บทความนี้ไม่ใช่การวิจารณ์ Cranelift Cranelift เป็นผลงานวิศวกรรมที่ยอดเยี่ยม และถ้าคุณกำลังสร้าง JIT, sandbox runtime หรืออะไรก็ตามที่เวลาคอมไพล์สำคัญกว่า throughput สูงสุด มันควรอยู่บนสุดของรายการคุณ wasmtime ใช้มันด้วยเหตุผลที่ดี Bytecode Alliance ทำงานได้อย่างน่ายกย่อง
      </p>
      <p>
        ความต้องการของ Perry แตกต่าง เราคอมไพล์ล่วงหน้า เราส่งไบนารีครั้งเดียว และผู้ใช้รันมันนับล้านครั้ง ความไม่สมมาตรนั้น &mdash; คอมไพล์นาน ๆ ที รันตลอดเวลา &mdash; เป็นระบอบที่ optimizer ที่หนักกว่าของ LLVM คุ้มค่า เครื่องมือต่างกันสำหรับงานที่ต่างกัน
      </p>

      <h2>ส่วนที่ 3: หายนะของการเปลี่ยน</h2>
      <p>
        v0.5.0 เป็นรีลีสแรกที่ใช้ LLVM เป็น backend เดียว เราคาดหวังว่าเวลาคอมไพล์จะถดถอยเล็กน้อยและประสิทธิภาพ runtime จะดีขึ้นอย่างมีนัยสำคัญ เราได้ตรงข้ามกับข้อที่สอง
      </p>
      <p>นี่คือตารางที่ตอนนั้นผมไม่อยากโพสต์:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">ช้าลง 68 เท่า</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">ช้าลง 64 เท่า</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">ช้าลง 3 เท่า</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">เร็วขึ้น 2.8 เท่า</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">ช้าลง 1.8 เท่า</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">ช้าลง 2.3 เท่า</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        บาง workload เร็วขึ้น ส่วนใหญ่แย่ลงอย่างมาก <code>method_calls</code> &mdash; หนึ่งใน benchmark ที่สำคัญที่สุดเพราะเป็นตัวแทนของการใช้ class ใน TypeScript แบบ idiomatic &mdash; แย่ลงเกือบ 70 เท่าจากที่เราเคยส่งออกไปสองรีลีสก่อนหน้า
      </p>

      <h3>สิ่งที่ผิดพลาดจริง ๆ</h3>
      <p>
        Perry ใช้ <strong>NaN-boxing</strong> สำหรับการแทนค่า ค่า TypeScript แต่ละตัวเป็น word 64-bit ตัวเลข f64 ถูกเก็บโดยตรง ส่วนอย่างอื่น (object, string, boolean, undefined, null) ถูกเข้ารหัสลงในบิตที่ไม่ได้ใช้ของ quiet NaN ตามมาตรฐาน IEEE 754
      </p>
      <p>
        ข้อดี: ตัวเลขไม่มีค่าใช้จ่าย ไม่มี boxing ไม่มี tagging ไม่มีการจัดสรรหน่วยความจำสำหรับเลขคณิต
      </p>
      <p>
        ข้อเสีย: ทุกการดำเนินการกับค่าที่ไม่ใช่ตัวเลขต้องมีการจัดการบิตเพื่อแกะ ดำเนินการ และห่อกลับ ถ้าลำดับเหล่านี้อยู่เป็น IR inline ใน codegen ของคุณ optimizer สามารถรวมและทำให้ง่ายขึ้นได้ ถ้ามันอยู่เป็น<strong>การเรียกฟังก์ชัน helper ของ runtime</strong> optimizer จะเห็นการเรียกที่ทึบแสงและยอมแพ้
      </p>
      <p>
        backend Cranelift ของเราได้พัฒนา inline lowering จำนวนมากสำหรับการดำเนินการที่ร้อนแรง &mdash; การโหลด property, dispatch ของ method, การจัดสรร object, เลขคณิตจำนวนเต็มบนค่าที่ tag เป็น f64 การเปลี่ยนไป LLVM เพื่อให้ได้โค้ดที่<em>ถูกต้อง</em>ก่อน ได้ส่งเกือบทุกอย่างผ่าน helper ของ runtime ใน <code>perry-runtime</code> แต่ละ helper เป็นคำสั่ง <code>call</code> ใน LLVM IR
      </p>
      <p>
        LLVM ยอดเยี่ยม แต่มันไม่สามารถ inline ฟังก์ชันที่ไม่เคยเห็น body ได้ <code>perry-runtime</code> ถูกคอมไพล์แยก เชื่อมต่อในตอนท้าย และจากมุมมองของ optimizer ทุกการเรียก helper เป็นกล่องดำ ผลลัพธ์คือ loop ที่ร้อนแรงซึ่ง backend Cranelift เคยคอมไพล์เป็น ~5 คำสั่งเลขคณิต inline ตอนนี้ถูกคอมไพล์เป็นการเรียกฟังก์ชัน &mdash; บันทึก register, ตั้งค่า stack frame, ทุกอย่าง &mdash; ทำซ้ำหลายล้านครั้ง
      </p>
      <p>
        นั่นคือที่มาของ 70x ไม่ใช่ codegen ที่แย่ แต่เป็น<strong>ขอบเขต inlining</strong> ที่แย่
      </p>

      <h2>ส่วนที่ 4: การแก้ไข</h2>
      <p>
        งานเพื่อกู้คืนและเกินตัวเลขของ Cranelift แบ่งออกเป็นประมาณหกหมวดหมู่ ไม่มีอะไรแปลกใหม่ ส่วนใหญ่เป็นการปรับแต่ง compiler แบบตำราเรียนที่แค่ต้องนำไปใช้ในจุดที่ถูกต้อง
      </p>

      <h3>1. Inline bump allocator สำหรับการจัดสรร object</h3>
      <p>
        <code>object_create</code> เป็นการถดถอยที่เลวร้ายที่สุดรองจาก <code>method_calls</code> เส้นทางเดิมเรียก <code>js_object_alloc_class_with_keys</code> สำหรับทุก <code>new Point()</code> &mdash; การเรียกฟังก์ชัน, การเข้าถึง arena แบบ thread-local, การค้นหา shape-cache และการเขียน header GC + header ของ object
      </p>
      <p>
        การแก้ไข: emit bump allocation <strong>inline</strong> ใน LLVM IR ทุกฟังก์ชันที่จัดสรร object จะได้รับ pointer ที่แคชไว้ไปยัง struct <code>InlineArenaState</code> แบบ thread-local การจัดสรรจะกลายเป็น:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        fast path คือ ~13 คำสั่ง IR inline ที่ LLVM สามารถเห็น จัดลำดับ และยกออกจาก loop ได้ <code>object_create</code> ลดจาก 318ms เหลือ 9ms
      </p>

      <h3>2. ตัวนับ loop แบบ i32</h3>
      <p>
        NaN-boxing หมายความว่าตัวเลข TypeScript ทุกตัวเป็น f64 ซึ่งรวมถึงตัวนับ loop ด้วย loop <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> ที่มีตัวแปร induction เป็น f64 เป็นหายนะ: increment f64, เปรียบเทียบ f64, แปลง f64-เป็น-i64 ทุกครั้งที่เข้าถึง array
      </p>
      <p>
        codegen ตรวจจับ for-loop ที่ตัวแปร induction พิสูจน์ได้ว่าเป็นจำนวนเต็มและจัดสรร <strong>slot stack i32 คู่ขนาน</strong> เงื่อนไข loop เปลี่ยนจาก <code>fcmp</code> เป็น <code>icmp slt i32</code> กำจัดตัวนับ f64 ทั้งหมด
      </p>
      <p>
        สิ่งนี้ทำให้ <code>array_write</code> ลดจาก 11ms เหลือ 3ms, <code>nested_loops</code> จาก 18ms เหลือ 9ms และ <code>array_read</code> จาก 11ms เหลือ 4ms
      </p>

      <h3>3. Flag fast-math</h3>
      <p>
        เราเพิ่ม flag <code>reassoc contract</code> ให้กับคำสั่งเลขคณิต f64 ทุกตัว <code>reassoc</code> อนุญาตให้ LLVM แตกห่วงโซ่ accumulator แบบ serial เป็นแบบ parallel และ <code>contract</code> อนุญาตให้ใช้ fused multiply-add เราปิด <code>nnan</code> และ <code>ninf</code> ไว้เพราะ Perry ใช้บิต NaN เป็น tag ของค่า
      </p>
      <p>
        ด้วย flag เหล่านี้ loop vectorizer ของ LLVM เริ่มทำงานกับ <code>math_intensive</code> ซึ่งลดจาก 131ms เหลือ 14ms &mdash; เอาชนะ Node ได้ 3.5x
      </p>

      <h3>4. Fast path สำหรับ modulo จำนวนเต็ม</h3>
      <p>
        <code>%</code> บน f64 ใน JavaScript คือ <code>fmod</code> ซึ่งเป็นการเรียก libm บน ARM แต่สำหรับ operand f64 ที่มีค่าเป็นจำนวนเต็ม เราสามารถทำ <code>fptosi &rarr; srem &rarr; sitofp</code> และข้ามการเดินทางไปกลับ libm ได้เลย codegen ใช้การวิเคราะห์แบบ static เพื่อตรวจจับ operand ที่มีค่าเป็นจำนวนเต็ม &mdash; ไม่ต้องตรวจสอบตอน runtime
      </p>
      <p>
        นี่คือเหตุผลเดียวที่ <code>factorial</code> ลดจาก 1,553ms เหลือ 24ms &mdash; และจาก 591ms ของ Node เหลือ 24ms <strong>เร็วกว่า Node 24.6 เท่า</strong>
      </p>

      <h3>5. LICM สำหรับ loop ซ้อน</h3>
      <p>
        LLVM ทำ loop-invariant code motion เป็นค่าเริ่มต้น แต่ NaN-boxing ซ่อนโครงสร้าง <code>arr.length</code> ถูก lower เป็นการโหลดผ่าน pointer ที่ NaN-boxed พร้อมการตรวจสอบ tag &mdash; ไม่ชัดเจนว่าเป็น invariant
      </p>
      <p>
        codegen ตรวจจับรูปแบบ <code>{'for (...; i < arr.length; ...)'}</code> และโหลดความยาวลงใน slot stack ก่อน loop โดยมี walker แบบ static ตรวจสอบว่า body ของ loop ไม่สามารถเปลี่ยนความยาวของ array ได้ เมื่อตัวนับถูกจำกัดด้วยความยาวที่ยกขึ้นมานี้ IndexGet/IndexSet จะข้ามการตรวจสอบขอบเขตทั้งหมด
      </p>

      <h3>6. Object ที่มี shape-cache</h3>
      <p>
        เมื่อ codegen รู้ class ของ object มันจะคำนวณ offset ของ field ตอนคอมไพล์และ emit <strong>การโหลดแบบ indexed ตรง ๆ</strong> &mdash; ไม่มี dispatch ตอน runtime สำหรับ dispatch ของ method, <code>obj.method(args)</code> จะกลายเป็นการเรียก <code>call @perry_method_Class_name(this, args)</code> โดยตรง &mdash; ไม่มี vtable ไม่มี inline cache ไม่มี hash lookup
      </p>
      <p>
        การเปลี่ยนไป LLVM ได้ทำให้ส่วนนี้ถดถอยกลับไปเป็น slow path แบบ universal การคืนค่า static dispatch ทำให้เราได้ <code>method_calls</code> กลับคืนมา &mdash; จาก 1,084ms กลับลงเหลือ 1ms <strong>เร็วกว่า Node 11 เท่า</strong>
      </p>

      <h2>ส่วนที่ 5: ตัวเลขในวันนี้</h2>
      <p>ค่ามัธยฐานจาก 3 ครั้ง, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">932ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">1.06x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">เสมอ</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">เสมอ</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        ชนะ 14 จาก 15 แพ้แค่ <code>object_create</code> ที่ allocator ของ V8 ดีจริง ๆ และเราห่างแค่ 12%
      </p>

      <h2>ส่วนที่ 6: คำถามเรื่องเวลาคอมไพล์</h2>
      <p>
        เหตุผลอันดับหนึ่งที่คนเลือก Cranelift แทน LLVM คือความเร็วในการคอมไพล์ มาพูดถึงเรื่องนี้กัน
      </p>
      <p>
        LLVM เพิ่มเวลาคอมไพล์ต่อไฟล์ของ Perry <strong>20-50ms</strong> หรือประมาณ <strong>8-19%</strong> ไม่ใช่ 5x ไม่ใช่ 2x เปอร์เซ็นต์หลักเดียวถึงสองหลักต่ำ ๆ
      </p>
      <p>
        เหตุผลคือ codegen ไม่ใช่คอขวดใน pipeline ของ Perry สัดส่วนสำหรับไฟล์ทั่วไป:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Parsing SWC: ~30%</li>
        <li>Lowering HIR (AST &rarr; IR, การอนุมานชนิด): ~25%</li>
        <li>Pass การแปลง IR (การแปลง closure, lowering async, inlining): ~15%</li>
        <li><strong>Codegen (การ emit ข้อความ LLVM IR + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + ไลบรารี runtime): ~10%</li>
      </ul>
      <p>
        Codegen เป็นหนึ่งในห้าส่วน แม้จะเพิ่มส่วนนั้นเป็นสองเท่า ก็ขยับผลรวมแค่ 5-10% ถ้าคุณกำลังสร้าง AOT compiler ที่ผู้ใช้พิมพ์ <code>perry compile</code> ครั้งเดียวแล้วรันไบนารีตลอดไป การคำนวณคือ: ใช้เวลาคอมไพล์เพิ่ม 25ms ประหยัดได้ถึง 24x ในทุกการรัน
      </p>

      <h2>ส่วนที่ 7: สิ่งที่ผมจะทำต่างออกไป</h2>
      <p>
        ถ้าผมเริ่มต้น Perry วันนี้และสามารถข้ามไปใช้ LLVM เลย ผมจะไม่ทำ ช่วง Cranelift มีคุณค่าจริง ๆ มันช่วยให้เราพัฒนา frontend ซ้ำ ๆ ได้โดยไม่มีภาระความซับซ้อนของ LLVM ให้ baseline ที่ใช้งานได้สำหรับเปรียบเทียบ และบังคับให้เรารักษา HIR ให้สะอาดพอที่จะพกพาข้าม backend ได้
      </p>
      <p>
        สิ่งที่ผมจะทำต่างออกไปคือการเปลี่ยนเอง เราปล่อย v0.5.0 โดยที่การดำเนินการส่วนใหญ่ผ่านการเรียก helper ของ runtime โดยตั้งใจจะทำ inline ทีหลัง นั่นผิด ลำดับที่ถูกต้องควรเป็น: ระบุ hot path ก่อน lower แบบ inline ก่อนการเปลี่ยน และปล่อยเมื่อ backend LLVM อย่างน้อยเทียบเท่าแล้วเท่านั้น
      </p>
      <p>
        บทเรียนเป็นเรื่องธรรมดา: ขอบเขตของการปรับแต่งสำคัญกว่าคุณภาพของ optimizer LLVM เป็นซอฟต์แวร์ที่น่าทึ่ง แต่มันช่วยคุณกับโค้ดที่มันมองไม่เห็นไม่ได้ ถ้า codegen ของคุณส่งทุกอย่างผ่านการเรียก runtime ที่ทึบแสง คุณได้สร้างกำแพงระหว่างโปรแกรมต้นทางของคุณกับทุก optimization pass ที่มีอยู่
      </p>

      <h2>สรุป</h2>
      <p>
        Perry ตอนนี้ใช้ LLVM อย่างเดียว เร็วกว่า Node ใน 14 จาก 15 benchmark และพร้อมใช้งาน การย้ายใช้เวลานานกว่าที่วางแผนไว้ เจ็บปวดกว่าที่คาดไว้ตรงกลาง และเป็นการตัดสินใจที่ถูกต้องอย่างปฏิเสธไม่ได้เมื่อมองย้อนกลับ Cranelift พาเราไปถึง v0.5 LLVM กำลังพาเราไปตลอดทาง
      </p>
      <p>ถ้าคุณอยากลอง Perry:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        ซอร์สโค้ด: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; รัน benchmark ด้วยตัวเอง: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        ถ้ามีคำถาม พบบั๊ก หรืออยากถกเถียงเรื่อง codegen backend GitHub issue เปิดอยู่ ผมอ่านทุกอัน
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
