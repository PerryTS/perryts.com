import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        103 คอมมิตในคอมไพเลอร์ Perry สัปดาห์นี้ ฟีเจอร์หลัก: ตอนนี้สามารถครอสคอมไพล์ไฟล์ปฏิบัติการ Windows จาก Linux ได้แล้ว, แอป iOS สามารถรันเกมลูปแบบบล็อกกิ้ง, คอมไพเลอร์รายงานการแครชสำหรับเทเลเมทรี และคอมไพเลอร์แบบเซลฟ์โฮสติ้งผ่านทุกเทสต์เชิงกำหนดที่เราทดสอบ นอกจากนี้ยังมีการอัปเกรดโครงสร้างพื้นฐาน Hub ครั้งใหญ่และแก้ไขบั๊กมากกว่า 50 รายการ
      </p>

      <h2>ครอสคอมไพล์ไปยัง Windows จาก Linux</h2>
      <p>
        Perry ตอนนี้สามารถผลิตไบนารี Windows <code className="text-amber-400">.exe</code> จากโฮสต์ Linux ได้แล้ว นี่คือชิ้นส่วนที่ขาดหายไปสำหรับไปป์ไลน์ CI/CD ที่ต้องการเป้าหมาย Windows โดยไม่ต้องรันเครื่องบิลด์ Windows สำหรับการคอมไพล์ทั้งหมด
      </p>
      <p>
        การใช้งานนี้แทนที่การตรวจสอบ <code className="text-amber-400">#[cfg]</code> ในเวลาคอมไพล์ด้วยการตรวจจับเป้าหมายในขณะรันไทม์ เมื่อคอมไพเลอร์เห็นเป้าหมาย Windows บนโฮสต์ที่ไม่ใช่ Windows จะค้นหา <code className="text-amber-400">lld-link</code>,{" "}
        <code className="text-amber-400">llvm-nm</code> และ{" "}
        <code className="text-amber-400">llvm-ar</code> จากทูลเชน Rust หรือ PATH ผ่านเฮลเปอร์ใหม่ <code className="text-amber-400">find_llvm_tool()</code> ไลบรารีระบบ Windows มาจาก sysroot สไตล์{" "}
        <a href="https://github.com/Jake-Shadle/xwin" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          xwin
        </a>{" "}
        ที่ชี้โดย <code className="text-amber-400">PERRY_WINDOWS_SYSROOT</code>
      </p>
      <p>
        ลิงก์เกอร์ใช้ <code className="text-amber-400">/FORCE:UNRESOLVED</code> โดยอัตโนมัติและสร้างสตับสำหรับสัญลักษณ์ UI ที่ขาดหายไป ดังนั้นแอป CLI จึงครอสคอมไพล์ได้อย่างราบรื่น เอาต์พุตจะเป็น <code className="text-amber-400">.exe</code> โดยค่าเริ่มต้นเมื่อเป้าหมายเป็น Windows รายละเอียดทั้งหมดอยู่ใน{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          เอกสารครอสคอมไพล์
        </a>
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal — Linux host</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile main.ts --target windows</p>
          <p className="text-slate-500">Compiling main.ts for windows-x86_64...</p>
          <p className="text-slate-500">Using lld-link from Rust toolchain</p>
          <p className="text-green-400">&#x2713; Compiled executable: main.exe (2.8 MB)</p>
        </div>
      </div>

      <h2>รองรับเกมลูปบน iOS</h2>
      <p>
        iOS ต้องการให้ UIKit เป็นเจ้าของเธรดหลัก ซึ่งไม่มีปัญหาสำหรับแอปที่ขับเคลื่อนด้วยเหตุการณ์ แต่เป็นปัญหาสำหรับเกมที่ต้องการลูปบล็อกกิ้ง <code className="text-amber-400">while (!shouldClose)</code> ตอนนี้ Perry แก้ปัญหานี้ด้วยแฟล็ก <code className="text-amber-400">--features ios-game-loop</code>
      </p>
      <p>
        เมื่อเปิดใช้งาน คอมไพเลอร์จะปล่อย{" "}
        <code className="text-amber-400">_perry_user_main</code> แทน{" "}
        <code className="text-amber-400">main</code> รันไทม์จัดเตรียม{" "}
        <code className="text-amber-400">main()</code> ที่เรียก{" "}
        <code className="text-amber-400">UIApplicationMain</code> บนเธรดหลักและสปอว์นโค้ดของคุณบนเธรดพื้นหลัง Scene delegate และ app delegate จัดการวงจรชีวิต UIKit เต็มรูปแบบในขณะที่เกมลูปของคุณรันโดยไม่ถูกบล็อก
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">main.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">// Your game loop runs on a background thread</span></p>
          <p><span className="text-blue-400">while</span> (!shouldClose) {"{"}</p>
          <p>  update();</p>
          <p>  render();</p>
          <p>  awaitNextFrame();</p>
          <p>{"}"}</p>
        </div>
      </div>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> run ios --features ios-game-loop</p>
        </div>
      </div>

      <p>
        สิ่งนี้เปิดใช้งานแอปทั้งหมวดหมู่ — เกม, การจำลอง, การแสดงผลแบบเรียลไทม์ — ที่ไม่สามารถทำได้จริงบน iOS ก่อนหน้านี้ เส้นทาง pump และ callback ของ iOS ตอนนี้ยังถูกห่อหุ้มด้วยการจัดการ panic ดังนั้นการแครชทั้งในเกมลูปและวงจรชีวิต UIKit จะถูกจับได้อย่างสะอาด
      </p>

      <h2>การรายงานการแครช</h2>
      <p>
        แอปที่คอมไพล์ด้วย Perry ตอนนี้ติดตั้ง panic hook และตัวจัดการสัญญาณสำหรับ{" "}
        <code className="text-amber-400">SIGSEGV</code>,{" "}
        <code className="text-amber-400">SIGBUS</code> และ{" "}
        <code className="text-amber-400">SIGABRT</code> เมื่อเริ่มต้น เมื่อเกิดการแครชร้ายแรง รายละเอียดจะถูกเขียนลง <code className="text-amber-400">~/.hone/crash.log</code> สำหรับระบบเทเลเมทรี Chirp แพนิคที่ถูกจับได้ (ใน{" "}
        <code className="text-amber-400">catch_callback_panic</code>) จะล้างล็อก ดังนั้นเฉพาะการแครชที่ไม่สามารถกู้คืนได้อย่างแท้จริงเท่านั้นที่จะถูกรายงาน
      </p>
      <p>
        นี่คือฟีเจอร์ความพร้อมสำหรับการใช้งานจริง เมื่อมีสิ่งผิดพลาดเกิดขึ้นในสนาม เราจะรู้ — และล็อกการแครชมีบริบทเพียงพอที่จะวินิจฉัยปัญหาโดยไม่ต้องให้ผู้ใช้รายงานอะไรด้วยตนเอง
      </p>

      <h2>Hub: ไปป์ไลน์บิลด์ Windows สองขั้นตอน</h2>
      <p>
        โครงสร้างพื้นฐานการบิลด์ของ Perry Hub ได้รับการอัปเกรดสถาปัตยกรรมอย่างสำคัญ ก่อนหน้านี้ การบิลด์สำหรับ Windows ต้องการเวิร์กเกอร์ Windows สำหรับการคอมไพล์ทั้งหมด ตอนนี้ไปป์ไลน์แบ่งออกเป็นสองขั้นตอน:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>เวิร์กเกอร์ Linux ครอสคอมไพล์อาร์ทิแฟกต์ Windows โดยใช้การรองรับ lld-link ใหม่</li>
        <li>Hub เก็บอาร์ทิแฟกต์ที่คอมไพล์ไว้ล่วงหน้าและส่งงานกลับเข้าคิวสำหรับเวิร์กเกอร์ Windows</li>
        <li>เวิร์กเกอร์ Windows จัดการเฉพาะการเซ็นชื่อและแพ็กเกจ — งานที่เบากว่ามาก</li>
      </ol>
      <p>
        เมื่อเวิร์กเกอร์ส่ง <code className="text-amber-400">complete</code> พร้อมกับ{" "}
        <code className="text-amber-400">needs_finishing: &quot;windows&quot;</code> Hub จะส่งงานกลับเข้าคิวอย่างโปร่งใส CLI เห็นประสบการณ์บิลด์เดียวที่ราบรื่น
      </p>
      <p>
        Hub ตอนนี้ยังเริ่มต้น VM Azure Windows อัตโนมัติเมื่อไม่มีเวิร์กเกอร์ Windows เชื่อมต่ออยู่ และเวิร์กเกอร์บิลด์อัปเดตอัตโนมัติเป็นเวอร์ชัน Perry ล่าสุดเมื่อมีรีลีสใหม่ จัดการโครงสร้างพื้นฐานด้วยตนเองน้อยลง บิลด์เร็วขึ้น
      </p>

      <h2>การปรับปรุงเอกสาร</h2>
      <p>
        การเขียนเอกสารใหม่ครั้งสำคัญสองรายการถูกเผยแพร่ในสัปดาห์นี้บน{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>อ้างอิง perry.toml</strong> — เอกสารส่วนที่ครอบคลุมทุกตัวเลือกการตั้งค่า, การแก้ไข bundle ID, การแก้ไขไฟล์เข้า, การเพิ่มหมายเลขบิลด์อัตโนมัติ และตัวอย่าง CI/CD
        </li>
        <li>
          <strong>อ้างอิง Geisterhand</strong> — เอกสาร API เต็มรูปแบบ, การตั้งค่าแพลตฟอร์ม, รูปแบบการทดสอบอัตโนมัติ และภาพรวมสถาปัตยกรรมสำหรับเฟรมเวิร์กทดสอบ UI ข้ามแพลตฟอร์ม
        </li>
      </ul>
      <p>
        เหล่านี้ไม่ใช่การอัปเดตเพิ่มเติม ทั้งสองเป็นการเขียนใหม่ตั้งแต่ต้นที่ครอบคลุมทุกฟีเจอร์และตัวเลือกการตั้งค่า หากคุณกำลังตั้งค่าโปรเจกต์ใหม่หรือเขียนเทสต์ ให้เริ่มที่นี่
      </p>

      <h2>API เมนูข้ามแพลตฟอร์ม</h2>
      <p>
        <code className="text-amber-400">menuClear</code> และ{" "}
        <code className="text-amber-400">menuAddStandardAction</code> ก่อนหน้านี้ใช้ได้เฉพาะ macOS ตอนนี้ใช้งานได้บนทั้ง 6 แพลตฟอร์มเนทีฟ ซึ่งรวมถึงการแก้ไข panic ของ <code className="text-amber-400">RefCell</code> re-entrancy ใน{" "}
        <code className="text-amber-400">dispatch_menu_item</code> บน Windows
      </p>

      <h3>Android: การจัดเรียงหน้า 16 KB</h3>
      <p>
        Google Play ตอนนี้ต้องการการจัดเรียงหน้า 16 KB สำหรับไลบรารีเนทีฟ Perry ตั้งค่า <code className="text-amber-400">CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS</code>{" "}
        ที่เหมาะสมโดยอัตโนมัติ และไฟล์ <code className="text-amber-400">.so</code> แบบคู่กันจะถูกคัดลอกไว้ข้างเอาต์พุตสำหรับการรวมเข้า APK/AAB
      </p>

      <h2>Perry React: บอร์ด Kanban</h2>
      <p>
        เลเยอร์ความเข้ากันได้ของ React ได้รับการทดสอบในโลกจริง: บอร์ด Kanban เต็มรูปแบบ 5 คอลัมน์พร้อมการย้าย เพิ่ม ลบ และดู การสร้างมันค้นพบและแก้ไขการเรนเดอร์ children อาร์เรย์ซ้อนใน JSX — ตัวจัดการแบบเรียกซ้ำ{" "}
        <code className="text-amber-400">_appendChildren</code> ตอนนี้ทำให้อาร์เรย์ที่ส่งกลับจากการเรียก <code className="text-amber-400">.map()</code> แบนราบอย่างถูกต้อง นอกจากนี้ยังมีเดโม Kitchen Sink WorkBench 14 ส่วนใหม่ที่ครอบคลุมรูปแบบ UI ต่างๆ
      </p>

      <h2>Anvil: ความเท่าเทียมเทสต์เชิงกำหนด 100%</h2>
      <p>
        <code className="text-amber-400">perrysdad</code> — คอมไพเลอร์ LLVM แบบเซลฟ์โฮสติ้งที่เขียนด้วย TypeScript และคอมไพล์โดย Perry — ตอนนี้ผ่าน <strong>68 จาก 68</strong> เทสต์เชิงกำหนด ตรงกับเอาต์พุตของคอมไพเลอร์หลักอย่างแม่นยำ ความแตกต่างเพียงอย่างเดียวคือสิ่งที่เป็นธรรมชาติ (timestamps, <code className="text-amber-400">Math.random()</code>) และ 11 เทสต์ถูกข้ามเนื่องจากต้องการ UI, ตัวจับเวลา, การเข้ารหัส หรือฟีเจอร์เฉพาะแพลตฟอร์มที่ยังไม่ได้ใช้งาน
      </p>
      <p>
        งานสำคัญที่ทำให้บรรลุเป้าหมาย:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>การดิสแพตช์เมธอดของอินเทอร์เฟซ</strong> — ตัวแปรที่มีชนิดเป็นอินเทอร์เฟซตอนนี้คืนค่าเมธอดที่ถูกต้องผ่านการดิสแพตช์ตาม class_id ใน ObjectHeader</li>
        <li><strong>การเข้าถึงคุณสมบัติแบบไดนามิก</strong> — การดิสแพตช์ขณะรันไทม์สำหรับชื่อคุณสมบัติที่คำนวณ</li>
        <li><strong>คลอเชอร์และ this-binding</strong> — ซีแมนทิกส์การจับที่ถูกต้องสำหรับเมธอดของอ็อบเจกต์</li>
        <li><strong>เฟส 6 กำลังดำเนินการ</strong> — async/await, เจนเนอเรเตอร์ และการแก้ไขเงื่อนไข</li>
      </ul>
      <p>
        ความเท่าเทียม 100% บนเทสต์เชิงกำหนดเป็นก้าวสำคัญ หมายความว่าไบนารี{" "}
        <code className="text-amber-400">anvil</code> ที่คอมไพล์ตัวเองผลิตเอาต์พุตเดียวกันทุกประการกับคอมไพเลอร์หลักสำหรับทุกสถานการณ์ที่ทดสอบได้ ช่องว่างกำลังลดลงมุ่งสู่การเซลฟ์โฮสติ้งเต็มรูปแบบ
      </p>

      <h2>แก้ไขบั๊กมากกว่า 50 รายการ</h2>
      <p>
        การผลักดันความถูกต้องครั้งใหญ่ในสัปดาห์นี้ ไฮไลท์:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>JSON.parse</strong> — อาร์เรย์ไม่ถูกตัดที่ 16 องค์ประกอบอีกต่อไป, อินพุตที่ไม่ถูกต้องถูกจัดการอย่างถูกต้อง</li>
        <li><strong>Uint8Array</strong> — คอนสตรักเตอร์จากตัวแปรอาร์เรย์, การใช้งาน <code className="text-amber-400">.set(source, offset)</code> (เคยเป็น no-op)</li>
        <li><strong>BigInt</strong> — NaN-boxing ด้วย <code className="text-amber-400">BIGINT_TAG</code> สำหรับการเรียกข้ามโมดูล, การแก้ไขการตัด 32 บิตของ keccak256</li>
        <li><strong>Optional chaining</strong> — นิพจน์เงื่อนไขซ้อน, การตรวจจับ toString, NaN-boxing ของค่าที่ส่งกลับ</li>
        <li><strong>IndexSet</strong> — แก้ไข NaN-boxing ของสตริงให้ใช้ <code className="text-amber-400">STRING_TAG</code> แทน <code className="text-amber-400">POINTER_TAG</code></li>
        <li><strong>MySQL</strong> — ชนิด DATETIME และ BLOB, คอนสตรักเตอร์ <code className="text-amber-400">Date(string)</code></li>
        <li><strong>Math.min/max</strong> — การจัดการอาร์กิวเมนต์ spread</li>
        <li><strong>การดิสแพตช์เมธอดเนทีฟ</strong> — field-scan-and-call สำหรับอ็อบเจกต์ <code className="text-amber-400">POINTER_TAG</code></li>
      </ul>
      <p>
        เหล่านี้ไม่ใช่กรณีขอบ JSON.parse ที่ตัดอาร์เรย์ที่ 16 องค์ประกอบจะทำลายแอปพลิเคชันจริงทุกตัว Uint8Array.set ที่เป็น no-op จะทำให้ข้อมูลเสียหายอย่างเงียบๆ เหล่านี้คือการแก้ไขที่ทำให้คอมไพเลอร์พร้อมสำหรับการใช้งานจริง หนึ่งบั๊กความถูกต้องในแต่ละครั้ง
      </p>

      <h2>ในตัวเลข</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>103 คอมมิต</strong>ในคอมไพเลอร์ Perry หลัก</li>
        <li><strong>3 เวอร์ชัน</strong>: v0.2.195, v0.2.196, v0.2.197</li>
        <li><strong>1 ฟีเจอร์หลัก</strong>: ครอสคอมไพล์ Windows จาก Linux</li>
        <li><strong>1 หมวดหมู่แอปใหม่</strong>: เกมลูป iOS</li>
        <li><strong>68/68</strong> ความเท่าเทียมเทสต์เชิงกำหนดใน perrysdad</li>
        <li><strong>แก้ไขบั๊กมากกว่า 50 รายการ</strong>ใน NaN-boxing, stdlib และ FFI เนทีฟ</li>
        <li><strong>2 การเขียนเอกสารใหม่</strong>: perry.toml และ Geisterhand</li>
        <li><strong>5 การปรับปรุง Hub</strong>: ไปป์ไลน์สองขั้นตอน, การเริ่มต้น Azure อัตโนมัติ, การอัปเดตเวิร์กเกอร์อัตโนมัติ</li>
      </ul>

      <h2>ขั้นตอนถัดไป</h2>
      <p>
        การครอสคอมไพล์ Windows เปิดประตูสู่ CI/CD หลายแพลตฟอร์มแบบอัตโนมัติเต็มรูปแบบ — พุช TypeScript รับไบนารีเนทีฟสำหรับทุกเป้าหมายโดยไม่ต้องมีเครื่องบิลด์เฉพาะสำหรับแต่ละ OS การรองรับเกมลูปปลดล็อกหมวดหมู่แอป iOS ใหม่ทั้งหมด และความเท่าเทียมเทสต์เชิงกำหนด 100% ใน perrysdad หมายความว่าการเซลฟ์โฮสติ้งกำลังกลายเป็นจริง สิ่งที่เหลือ:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>รองรับ regex เต็มรูปแบบ</strong> — ช่องว่างภาษาหลักสุดท้าย</li>
        <li><strong>การขยาย perry/ui</strong> — drag and drop, ป้ายกำกับการเข้าถึง, DatePicker</li>
        <li><strong>perrysdad เฟส 6</strong> — async/await, เจนเนอเรเตอร์, ขยายไปสู่ความเท่าเทียม Perry เต็มรูปแบบ</li>
        <li><strong>เบต้าสาธารณะ Hub</strong> — เปิดบิลด์แบบกระจายให้ผู้ใช้ภายนอก</li>
      </ul>
      <p>
        ติดตามความคืบหน้าบน{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a>, อ่านเอกสารที่{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>, หรือดู{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">แผนงาน</Link>
        {" "}สำหรับภาพรวมทั้งหมด
      </p>
    </>
  );
}
