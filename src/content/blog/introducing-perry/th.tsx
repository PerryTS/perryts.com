import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        เรายินดีที่จะแนะนำ Perry — คอมไพเลอร์ TypeScript แบบเนทีฟที่เขียนด้วย Rust
        ซึ่งคอมไพล์ TypeScript ของคุณโดยตรงเป็นไฟล์เรียกทำงานแบบสแตนด์อโลน ไม่ต้องใช้รันไทม์ Node.js
        ไม่ต้องใช้ Electron wrapper ไม่มีการประนีประนอม แค่โค้ดของคุณ คอมไพล์เป็นไบนารีเนทีฟที่
        เริ่มต้นทันทีและรันได้ทุกที่
      </p>
      <p>
        Perry เป็นการคิดใหม่พื้นฐานเกี่ยวกับสิ่งที่ TypeScript สามารถเป็นได้ แทนที่จะ
        ปฏิบัติต่อมันเป็นซูเปอร์เซ็ตของ JavaScript ที่ต้องรันผ่านเอนจิน JS นั้น Perry
        ปฏิบัติต่อ TypeScript เป็นภาษาระบบ — ภาษาที่บังเอิญมีไวยากรณ์ที่นักพัฒนาหลายล้าน
        คนรู้จักและชื่นชอบอยู่แล้ว
      </p>

      <h2>ทำไมเราถึงสร้าง Perry</h2>
      <p>
        TypeScript ได้กลายเป็นภาษากลางของการพัฒนาซอฟต์แวร์สมัยใหม่ เป็น
        ภาษาที่อยู่เบื้องหลังฟรอนต์เอนด์เว็บส่วนใหญ่ ส่วนแบ่งที่เพิ่มขึ้นของแบ็กเอนด์ และเป็น
        ตัวเลือกสำหรับเครื่องมือ สคริปต์ และระบบอัตโนมัติมากขึ้นเรื่อยๆ แต่มันมีข้อจำกัด
        พื้นฐานอยู่เสมอ: มันคอมไพล์เป็น JavaScript และ JavaScript ต้องการรันไทม์
      </p>
      <p>
        รันไทม์นั้น — ไม่ว่าจะเป็น Node.js, Deno หรือ Bun — มาพร้อมกับข้อแลกเปลี่ยน
        เวลาเริ่มต้นแบบ Cold start วัดได้เป็นสิบหรือร้อยมิลลิวินาที โอเวอร์เฮดหน่วยความจำจาก
        คอมไพเลอร์ JIT และตัวเก็บขยะ การแจกจ่ายไบนารีที่ต้องบันเดิลรันไทม์ทั้งหมด
        หรือต้องการให้ผู้ใช้ติดตั้ง และสำหรับแอปพลิเคชัน GUI ตัวเลือกเดียว
        คือ Electron ซึ่งส่งเบราว์เซอร์ Chromium ทั้งหมดมาพร้อมกับแอปของคุณ
      </p>
      <p>
        เราถามว่า: จะเป็นอย่างไรถ้า TypeScript ไม่ต้องผ่าน JavaScript เลย? จะเป็นอย่างไรถ้า
        คุณสามารถคอมไพล์มันเป็นโค้ดเครื่องเนทีฟโดยตรง เหมือนกับที่คุณคอมไพล์ Rust,
        Go หรือ C++?
      </p>

      <h2>Perry ทำงานอย่างไร</h2>
      <p>
        ไปป์ไลน์การคอมไพล์ของ Perry มีสามขั้นตอน:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>การแยกวิเคราะห์</strong> — Perry ใช้ SWC (ตัวแยกวิเคราะห์ TypeScript/JavaScript ที่ใช้ Rust)
          เพื่อแยกวิเคราะห์ซอร์ส TypeScript ของคุณเป็น AST SWC เป็นตัวแยกวิเคราะห์เดียวกันที่ใช้โดย Next.js
          และมันเร็วมาก
        </li>
        <li>
          <strong>การคอมไพล์แบบขับเคลื่อนด้วยชนิดข้อมูล</strong> — Perry เดินผ่าน AST พร้อมข้อมูล
          ชนิดข้อมูลแบบเต็ม ต่างจากเอนจิน JS ที่ต้องจัดการกับชนิดข้อมูลแบบไดนามิกที่รันไทม์ Perry รู้
          ทุกชนิดข้อมูลในเวลาคอมไพล์ ซึ่งทำให้สามารถมอโนมอร์ฟไอเซชันของเจเนอริก ดิสแพตช์แบบสแตติก
          ของการเรียกเมธอด และการปรับแต่งเลย์เอาต์หน่วยความจำโดยตรง
        </li>
        <li>
          <strong>การสร้างโค้ด</strong> — Perry สร้างโค้ดเครื่องเนทีฟโดยใช้ Cranelift
          ตัวสร้างโค้ดเดียวกันที่ใช้โดย Wasmtime และส่วนต่างๆ ของ Firefox JIT Cranelift
          ผลิตโค้ดเนทีฟที่มีประสิทธิภาพสำหรับ x86_64 และ ARM64
        </li>
      </ol>
      <p>
        ผลลัพธ์คือไฟล์เรียกทำงานแบบสแตนด์อโลน — โดยทั่วไป 2-5 MB สำหรับเครื่องมือ CLI — ที่เริ่มต้น
        ทันทีโดยไม่มีเวลาอุ่นเครื่อง
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts</p>
          <p className="text-slate-500">Parsing app.ts...</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking...</p>
          <p className="text-green-400">✓ Built executable: app (2.3 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./app</p>
          <p className="text-slate-300">Hello from native TypeScript!</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file app</p>
          <p className="text-slate-300">app: Mach-O 64-bit executable arm64</p>
        </div>
      </div>

      <h2>ฟีเจอร์ TypeScript ใดบ้างที่รองรับ</h2>
      <p>
        Perry รองรับซับเซ็ตที่กว้างและเติบโตของ TypeScript เป้าหมายคือความเข้ากันได้อย่างเต็มที่
        กับภาษาอย่างที่นักพัฒนาใช้จริง ปัจจุบันรวมถึง:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>ชนิดข้อมูลพื้นฐานทั้งหมด</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>อินเทอร์เฟซและ type aliases</strong> — รวมถึง union types, intersection types และ mapped types</li>
        <li><strong>เจเนอริก</strong> — คอมไพล์ผ่านมอโนมอร์ฟไอเซชัน ดังนั้น <code className="text-perry-400">Array&lt;number&gt;</code> และ <code className="text-perry-400">Array&lt;string&gt;</code> สร้างเส้นทางโค้ดที่ปรับแต่งแยกกัน</li>
        <li><strong>คลาส</strong> — พร้อมการสืบทอด ฟิลด์ส่วนตัว (<code className="text-perry-400">#field</code>), สมาชิกสแตติก, getters/setters และ decorators</li>
        <li><strong>Async/await และ Promises</strong> — คอมไพล์เป็น state machine คล้ายกับวิธีที่ Rust จัดการ async</li>
        <li><strong>Generators และ iterators</strong> — <code className="text-perry-400">function*</code> และลูป <code className="text-perry-400">for...of</code></li>
        <li><strong>Closures</strong> — พร้อมซีแมนติกส์การจับค่าที่ถูกต้อง</li>
        <li><strong>การ Destructuring</strong> — อาร์เรย์ ออบเจ็กต์ รูปแบบซ้อนกัน และ rest elements</li>
        <li><strong>Template literals</strong> — รวมถึง tagged templates</li>
        <li><strong>โมดูล</strong> — ESM imports/exports ที่แก้ไขในเวลาคอมไพล์</li>
      </ul>

      <h2>UI เนทีฟข้ามแพลตฟอร์ม</h2>
      <p>
        Perry ไม่ได้จำกัดเฉพาะเครื่องมือ CLI และแอปพลิเคชันฝั่งเซิร์ฟเวอร์ มันมาพร้อมกับเฟรมเวิร์ก
        UI เนทีฟสำหรับหกแพลตฟอร์ม:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField และอื่นๆ)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (API เดียวกับ iOS พร้อมการปรับแต่งเฉพาะสำหรับ iPad)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, common controls, GDI)</li>
      </ul>
      <p>
        ข้อมูลเชิงลึกที่สำคัญคือ Perry แมป API TypeScript ทั่วไปไปยัง toolkit
        วิดเจ็ตเนทีฟของแต่ละแพลตฟอร์มในเวลาคอมไพล์ ไม่มีเลเยอร์บริดจ์ ไม่มี web view และ
        ไม่มีเอนจินเรนเดอร์แบบกำหนดเอง แอปของคุณใช้วิดเจ็ตแพลตฟอร์มจริง เรนเดอร์โดย
        ระบบปฏิบัติการเอง อ่านเพิ่มเติมในบทความเชิงลึกของเรา:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          UI เนทีฟข้ามแพลตฟอร์มจาก TypeScript
        </Link>.
      </p>

      <h2>มากกว่า 27 การใช้งานแพ็กเกจ npm แบบเนทีฟ</h2>
      <p>
        หนึ่งในความท้าทายเชิงปฏิบัติที่ใหญ่ที่สุดของคอมไพเลอร์ใหม่คือความเข้ากันได้กับระบบนิเวศ
        นักพัฒนาไม่ได้แค่เขียนโค้ดจากศูนย์ — พวกเขาใช้แพ็กเกจ Perry แก้ไข
        สิ่งนี้ด้วยการใช้งานเนทีฟของแพ็กเกจ npm ยอดนิยมมากกว่า 27 รายการ:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>ฐานข้อมูล</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>ความปลอดภัย</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>ยูทิลิตี้</strong> — uuid, chalk, dotenv, lodash (บางส่วน), moment</li>
        <li><strong>ระบบ</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        เหล่านี้ไม่ใช่ wrapper แบบบางๆ รอบโมดูล Node.js มันถูกคอมไพล์โดยตรง
        เข้าไปในไบนารีของคุณโดยใช้ไลบรารีระบบเนทีฟ — libpq สำหรับ PostgreSQL, OpenSSL สำหรับ
        crypto, libcurl สำหรับ HTTP พื้นผิว API ตรงกับสิ่งที่คุณคาดหวังจากแพ็กเกจ npm
        ดังนั้นการย้ายจึงทำได้ง่าย
      </p>

      <h2>เลเยอร์ความเข้ากันได้ V8 แบบเสริม</h2>
      <p>
        สำหรับแพ็กเกจ npm ที่ยังไม่มีการใช้งาน Perry แบบเนทีฟ Perry มีโหมด
        ฝัง V8 แบบเสริม เมื่อเปิดใช้งาน Perry จะบันเดิลรันไทม์ V8 และสามารถรัน
        แพ็กเกจ npm JavaScript มาตรฐานควบคู่กับ TypeScript ที่คอมไพล์แล้วของคุณ นี่เป็นทางออก
        ที่ใช้งานได้จริงซึ่งช่วยให้คุณนำ Perry มาใช้ทีละน้อย — คอมไพล์เส้นทางที่ร้อนเป็นโค้ด
        เนทีฟในขณะที่ยังเข้าถึงระบบนิเวศ npm ทั้งหมดสำหรับทุกอย่างอื่น
      </p>

      <h2>การคอมไพล์ข้ามแพลตฟอร์ม</h2>
      <p>
        Perry รองรับการคอมไพล์ข้ามแพลตฟอร์มตั้งแต่แกะกล่อง จากเครื่อง macOS สำหรับพัฒนาของคุณ
        คุณสามารถคอมไพล์สำหรับ Linux (x86_64 และ ARM64) และ iOS ซึ่งหมายความว่าคุณสามารถสร้าง
        ไปป์ไลน์ CI/CD บน macOS และผลิตไบนารีสำหรับเป้าหมายการปรับใช้ทั้งหมดของคุณโดย
        ไม่ต้องมีเครื่อง build เฉพาะสำหรับแต่ละแพลตฟอร์ม
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p className="text-slate-500"># Build for Linux from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target linux-x86_64</p>
          <p className="text-green-400">✓ Built executable: app (3.1 MB)</p>
          <p className="mt-3 text-slate-500"># Build for iOS from macOS</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build app.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: app (4.8 MB)</p>
        </div>
      </div>

      <h2>ประสิทธิภาพ</h2>
      <p>
        ไบนารีที่คอมไพล์โดย Perry นั้นเร็ว เนื่องจากไม่มีการอุ่น JIT ไม่มีโอเวอร์เฮดของ
        อินเทอร์พรีเตอร์ และไม่มีการหยุดชะงักของตัวเก็บขยะ ประสิทธิภาพจึงคาดเดาได้และสม่ำเสมอ
        ตั้งแต่การเรียกใช้ครั้งแรก
      </p>
      <p>
        จากการทดสอบประสิทธิภาพของเรา:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>เวลาเริ่มต้น</strong> — แทบ 0 ms (การเปิดโปรเซสเนทีฟ)</li>
        <li><strong>ขนาดไบนารี</strong> — 2-5 MB สำหรับเครื่องมือ CLI ทั่วไป (เทียบกับ 50+ MB สำหรับ Node.js ที่บันเดิล)</li>
        <li><strong>การใช้หน่วยความจำ</strong> — น้อยกว่า 5-10 เท่าเมื่อเทียบกับแอปพลิเคชัน Node.js ที่เทียบเท่า</li>
        <li><strong>ปริมาณงาน</strong> — แข่งขันได้กับ C ที่เขียนด้วยมือสำหรับงานที่ใช้การคำนวณมาก</li>
      </ul>
      <p>
        คุณสามารถดูการทดสอบประสิทธิภาพสดได้ที่{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a> ซึ่งเปรียบเทียบไฟล์เรียกทำงานที่คอมไพล์โดย Perry กับ Node.js และ Bun แบบเรียลไทม์
      </p>

      <h2>สถานะปัจจุบัน</h2>
      <p>
        Perry อยู่ในระหว่างการพัฒนาอย่างแข็งขัน คอมไพเลอร์มีเสถียรภาพโดยผ่าน 62 จาก 62 การทดสอบ
        ทั้งชุดทดสอบ แบ็กเอนด์ UI ทั้งหกแพลตฟอร์มทำงานได้ ฟีเจอร์หลัก
        ของภาษามีความแข็งแกร่งและกำลังขยายตัว
      </p>
      <p>
        เรากำลังทำงานอย่างแข็งขันในการขยายไลบรารีวิดเจ็ต UI ปรับปรุงประสิทธิภาพของสตริงและ
        ออบเจ็กต์ ทำให้การรองรับ regex สมบูรณ์ และสร้างโมดูล Stream ในระยะยาว
        เรากำลังวางแผนเป้าหมายการคอมไพล์ WASM, multi-threading, ส่วนขยาย VS Code
        และการรวมเข้ากับตัวจัดการแพ็กเกจ
      </p>
      <p>
        ดู<Link href="/roadmap" className="text-perry-400 hover:text-perry-300">แผนงาน</Link>ทั้งหมดสำหรับ
        รายละเอียดเกี่ยวกับสิ่งที่เปิดตัวแล้ว สิ่งที่กำลังดำเนินการ และสิ่งที่จะมาถัดไป
      </p>

      <h2>เริ่มต้นใช้งาน</h2>
      <p>
        Perry เป็นโอเพนซอร์ส คุณสามารถโคลนรีโป สร้างจากซอร์สโค้ด และเริ่มคอมไพล์
        TypeScript ได้วันนี้:
      </p>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> git clone https://github.com/PerryTS/perry.git</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">cd</span> perry</p>
          <p><span className="text-slate-500">$</span> cargo build --release</p>
          <p className="mt-3 text-slate-500"># Compile your first TypeScript file</p>
          <p><span className="text-slate-500">$</span> ./target/release/<span className="text-cyan-400">perry</span> build hello.ts</p>
          <p className="text-green-400">✓ Built executable: hello (2.1 MB)</p>
          <p><span className="text-slate-500">$</span> ./hello</p>
          <p className="text-slate-300">Hello, world!</p>
        </div>
      </div>
      <p>
        เรียกดูซอร์สโค้ดบน{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , ดู{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">showcase</Link>
        {" "}เพื่อดูว่ามีอะไรถูกสร้างด้วย Perry หรือกระโดดเข้าสู่โค้ดเลย
        เรารอไม่ไหวที่จะเห็นสิ่งที่คุณจะสร้าง
      </p>
    </>
  );
}
