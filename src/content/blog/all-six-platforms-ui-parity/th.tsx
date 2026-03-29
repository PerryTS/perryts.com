import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        เมื่อเราเปิดตัวระบบ UI เนทีฟเวอร์ชันแรกของ Perry &quot;ข้ามแพลตฟอร์ม&quot; หมายความว่า macOS ทำงานได้ดีและอีกห้าแพลตฟอร์มเป็น stubs วันนี้ด้วย v0.2.162 นั่นไม่จริงอีกต่อไป ทั้งหกแพลตฟอร์ม — macOS, iOS, iPadOS, Android, Linux และ Windows — ตอนนี้มีความเท่าเทียมกันของฟีเจอร์อย่างเต็มที่ โค้ด TypeScript เดียวกันคอมไพล์เป็นวิดเจ็ตเนทีฟบนทุกเป้าหมาย
      </p>
      <p>
        โพสต์นี้เดินผ่านสิ่งที่เราเปิดตัวระหว่าง v0.2.152 และ v0.2.164: วิดเจ็ต Canvas การใช้งาน NSTableView แบบเต็ม วิดเจ็ต UI มากกว่า 20 ตัว โมดูล{" "}
        <code className="text-amber-400">perry/system</code> การรองรับหลายหน้าต่าง การแจ้งเตือนของระบบ การเข้าถึง keychain การลดขนาดไบนารีอัตโนมัติ และระบบปลั๊กอินในเวลาคอมไพล์ มีเรื่องเกิดขึ้นมากมาย
      </p>

      <h2>สปรินต์วิดเจ็ต: คอมโพเนนต์ UI เนทีฟมากกว่า 20 ตัว</h2>
      <p>
        การกระโดดครั้งใหญ่ที่สุดมาใน v0.2.155 ซึ่งเปิดตัววิดเจ็ต UI มากกว่า 20 ตัวข้ามทุกแพลตฟอร์ม API UI TypeScript ของ Perry ตอนนี้ครอบคลุมคอมโพเนนต์ที่คุณต้องการจริงๆ เพื่อส่งแอปจริง:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>เลย์เอาต์</strong> — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView</li>
        <li><strong>อินพุต</strong> — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker</li>
        <li><strong>การแสดงผล</strong> — Text, Label, Image, ProgressView, Divider, Spacer</li>
        <li><strong>ข้อมูล</strong> — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)</li>
        <li><strong>ซ้อนทับ</strong> — Alert, Sheet, Popover, Toolbar, NavigationBar</li>
        <li><strong>การวาด</strong> — Canvas (API วาด 2D เร่งด้วยฮาร์ดแวร์ต่อแพลตฟอร์ม)</li>
      </ul>
      <p>
        เหล่านี้ไม่ใช่ wrapper รอบเรนเดอร์แบบกำหนดเอง แต่ละวิดเจ็ตคอมไพล์เป็นคอมโพเนนต์เนทีฟของแพลตฟอร์มเอง: <code className="text-amber-400">NSButton</code> บน macOS{" "}
        <code className="text-amber-400">UIButton</code> บน iOS{" "}
        <code className="text-amber-400">GtkButton</code> บน Linux{" "}
        <code className="text-amber-400">android.widget.Button</code> บน Android ผ่าน JNI และ{" "}
        <code className="text-amber-400">CreateWindowEx</code> บน Windows ระบบปฏิบัติการวาด ใส่ธีม และจัดการการเข้าถึง — Perry แค่เชื่อมต่อ API TypeScript
      </p>

      <h2>Canvas: การวาด 2D จาก TypeScript</h2>
      <p>
        หนึ่งในการเพิ่มที่น่าสนใจทางเทคนิคมากที่สุดคือวิดเจ็ต Canvas (v0.2.152) มันเปิดเผย API วาด 2D ที่คุ้นเคยจาก TypeScript โดยตรง — เส้นโค้งเบเซียร์ การเติม การลากเส้น การ blit ภาพ — และคอมไพล์เป็นแบ็กเอนด์ 2D ที่เร่งด้วยฮาร์ดแวร์ของแพลตฟอร์ม: Core Graphics บน macOS/iOS, Cairo บน Linux, Direct2D บน Windows และ Skia บน Android
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">canvas.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Canvas, Color }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3 text-slate-500">// Compiles to Core Graphics on macOS, Cairo on Linux, etc.</p>
          <p><span className="text-blue-400">const</span> canvas = <span className="text-blue-400">new</span> <span className="text-amber-400">Canvas</span>({`{ width: 400, height: 300 }`});</p>
          <p className="mt-2">canvas.<span className="text-amber-400">onDraw</span>((ctx) =&gt; {`{`}</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillStyle</span> = Color.<span className="text-amber-400">amber</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">fillRect</span>(10, 10, 100, 60);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">strokeStyle</span> = Color.<span className="text-amber-400">blue</span>;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">lineWidth</span> = 2;</p>
          <p className="ml-4">ctx.<span className="text-amber-400">beginPath</span>();</p>
          <p className="ml-4">ctx.<span className="text-amber-400">arc</span>(200, 150, 80, 0, Math.<span className="text-amber-400">PI</span> * 2);</p>
          <p className="ml-4">ctx.<span className="text-amber-400">stroke</span>();</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>วิดเจ็ต Table: NSTableView มาถึง TypeScript</h2>
      <p>
        v0.2.163 เปิดตัววิดเจ็ต Table — คอมโพเนนต์ที่ซับซ้อนที่สุดในไลบรารี บน macOS มันแมปเป็น <code className="text-amber-400">NSTableView</code> พร้อมการเชื่อมต่อ delegate/data source แบบเต็ม บน Linux ใช้ <code className="text-amber-400">GtkTreeView</code> ของ GTK4 บน Windows คอนโทรล <code className="text-amber-400">ListView</code> ของ Win32 บน Android ผูกกับ <code className="text-amber-400">RecyclerView</code> ผ่าน JNI
      </p>
      <p>
        API TypeScript เป็นแบบ declarative: คุณกำหนดคอลัมน์ ให้แหล่งข้อมูล และ Perry จัดการการเชื่อมต่อเฉพาะแพลตฟอร์มในเวลาคอมไพล์ การเรียงลำดับคอลัมน์ การจัดการการเลือก และการปรับแต่งความสูงของแถวทำงานได้ทันที
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">table.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Table, Column }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> table = <span className="text-blue-400">new</span> <span className="text-amber-400">Table</span>({`{`}</p>
          <p className="ml-4">columns: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Name", key: "name", width: 200 }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Column</span>({`{ title: "Size", key: "size", width: 80 }`}),</p>
          <p className="ml-4">],</p>
          <p className="ml-4">rows: files,  <span className="text-slate-500">// TypeScript array of objects</span></p>
          <p className="ml-4">onSelect: (row) =&gt; console.<span className="text-amber-400">log</span>(row.name),</p>
          <p>{`});`}</p>
        </div>
      </div>

      <h2>โมดูล perry/system</h2>
      <p>
        v0.2.155 ยังเปิดตัว <code className="text-amber-400">perry/system</code> — โมดูล TypeScript ที่เปิดเผย API ระบบแพลตฟอร์มโดยไม่มีรันไทม์: กล่องเปิดไฟล์ กล่องบันทึก การแจ้งเตือน sheets การเข้าถึง keychain การแจ้งเตือนระบบ และการจัดการหลายหน้าต่าง
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><code className="text-amber-400">system.showOpenDialog()</code> — ตัวเลือกไฟล์เนทีฟ</li>
        <li><code className="text-amber-400">system.showSaveDialog()</code> — กล่องบันทึกเนทีฟ</li>
        <li><code className="text-amber-400">system.showAlert()</code> — แผงแจ้งเตือนเนทีฟ</li>
        <li><code className="text-amber-400">system.notify()</code> — การแจ้งเตือน OS</li>
        <li><code className="text-amber-400">system.keychain.get/set()</code> — Keychain Services / Secret Service / Windows Credential Store</li>
        <li><code className="text-amber-400">system.openWindow()</code> — การจัดการหลายหน้าต่าง</li>
      </ul>

      <h2>ความเท่าเทียมฟีเจอร์หกแพลตฟอร์ม: v0.2.162</h2>
      <p>
        เหตุการณ์สำคัญ v0.2.162 เป็นเรื่องของการปิดช่องว่าง ก่อนรุ่นนี้ macOS มีชุดฟีเจอร์ครบถ้วนที่สุด iOS เกือบจะถึง Linux/Windows/Android ตามหลัง v0.2.162 นำทุกแพลตฟอร์มมาสู่ระดับเดียวกัน:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>macOS</strong> — AppKit ชุดวิดเจ็ตสมบูรณ์ Keychain การแจ้งเตือน หลายหน้าต่าง toolbar</li>
        <li><strong>iOS / iPadOS</strong> — UIKit ความเท่าเทียมวิดเจ็ตเต็มกับ macOS วงจรชีวิต scene</li>
        <li><strong>Android</strong> — JNI bridge วิดเจ็ตทั้งหมดผ่าน Android Views คอมไพล์ข้ามแพลตฟอร์ม NDK</li>
        <li><strong>Linux</strong> — GTK4 ชุดวิดเจ็ตสมบูรณ์รวม Table กล่องไฟล์ keychain ของ libsecret</li>
        <li><strong>Windows</strong> — Win32 วิดเจ็ตทั้งหมด Windows Credential Store การแจ้งเตือน WinRT</li>
      </ul>

      <h2>การลดขนาดไบนารีอัตโนมัติ</h2>
      <p>
        v0.2.153 เปิดตัวการลดขนาดไบนารีอัตโนมัติ — คอมไพเลอร์ strip เส้นทางโค้ดที่ไม่ได้ใช้อย่างเข้มงวด กำจัดฟังก์ชัน stdlib ที่เข้าถึงไม่ได้ และลบนิยามสัญลักษณ์ที่ซ้ำกัน เครื่องมือ CLI ที่เคยคอมไพล์ได้ ~4 MB ตอนนี้ต่ำกว่า 2 MB โดยไม่ต้องเปลี่ยนซอร์ส
      </p>

      <h2>ระบบปลั๊กอินในเวลาคอมไพล์</h2>
      <p>
        v0.2.152 เปิดตัวระบบปลั๊กอินของ Perry — ไม่มีการโหลดปลั๊กอินในรันไทม์ ไม่มี IPC ไม่มี <code className="text-amber-400">require()</code> แบบไดนามิก ปลั๊กอินเป็นโมดูล TypeScript ที่ Perry แก้ไขและคอมไพล์ในเวลา build
      </p>
      <p>
        เราเขียนเกี่ยวกับปรัชญาเบื้องหลังสิ่งนี้ใน{" "}
        <Link href="/blog/plugin-systems-are-a-performance-tax" className="text-amber-400 hover:text-amber-300">
          ระบบปลั๊กอินเป็นภาษีประสิทธิภาพ
        </Link> สถาปัตยกรรมปลั๊กอินรันไทม์แลกประสิทธิภาพกับความสามารถในการขยาย การผสมรวมในเวลา build ให้ทั้งสองอย่าง
      </p>

      <h2>การปรับปรุงภาษา</h2>
      <p>
        สปรินต์ UI ไม่ได้เกิดขึ้นอย่างโดดเดี่ยว — คอมไพเลอร์เองก็มีความสามารถมากขึ้นเรื่อยๆ:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>นิพจน์คลาส</strong> — <code className="text-amber-400">const Foo = class extends Bar {`{}`}</code> คอมไพล์ถูกต้องแล้ว</li>
        <li><strong>การแปลง generators</strong> — <code className="text-amber-400">function*</code> และ <code className="text-amber-400">yield</code> คอมไพล์เป็น state machines เนทีฟ</li>
        <li><strong>Map/Set เป็นฟิลด์คลาส</strong> — <code className="text-amber-400">private items = new Map()</code> ทำงานใน codegen</li>
        <li><strong>การบังคับชนิดพารามิเตอร์ FFI</strong> — การเรียกไลบรารีเนทีฟจัดการการบังคับชนิดโดยอัตโนมัติ</li>
        <li><code className="text-amber-400">string.match()</code> — รองรับเต็มรูปแบบแล้ว</li>
        <li><strong>เป้าหมาย web</strong> — Perry คอมไพล์เป็นเอาต์พุตที่เข้ากันได้กับ web ได้แล้ว</li>
      </ul>

      <h2>ขั้นตอนถัดไป</h2>
      <p>
        ด้วยความเท่าเทียม UI หกแพลตฟอร์มที่เปิดตัวแล้ว เฟสถัดไปคือความลึกมากกว่าความกว้าง เรากำลังทำงานใน:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>การรองรับ RegExp เต็มรูปแบบ</li>
        <li>ลากและวาง เมนูบริบทแบบกำหนดเอง และ labels การเข้าถึง</li>
        <li>ส่วนขยาย VS Code สำหรับการวินิจฉัย Perry</li>
        <li>การรวมเข้ากับตัวจัดการแพ็กเกจ</li>
        <li>เป้าหมายการคอมไพล์ WASM</li>
        <li>Multi-threading ผ่านเธรด <code className="text-amber-400">Worker</code></li>
      </ul>
      <p>
        ถ้าคุณต้องการติดตาม{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          รีโป Perry
        </a>{" "}
        เป็นโอเพนซอร์ส ดู{" "}
        <Link href="/showcase" className="text-amber-400 hover:text-amber-300">showcase</Link>
        {" "}หรือเรียกดู{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">แผนงาน</Link>
        {" "}สำหรับภาพรวมทั้งหมด
      </p>
    </>
  );
}
