import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        หนึ่งในเป้าหมายที่ทะเยอทะยานที่สุดของ Perry คือการส่งมอบแอปพลิเคชัน GUI ที่เป็นเนทีฟอย่างแท้จริง
        จากโค้ดเบส TypeScript เดียว ไม่ใช่ web views ที่ห่อด้วยเชลล์เนทีฟ ไม่ใช่
        เอนจินเรนเดอร์แบบกำหนดเองที่วาดพิกเซลของตัวเอง วิดเจ็ตเนทีฟจริงๆ เรนเดอร์โดย
        เฟรมเวิร์ก UI ของแต่ละแพลตฟอร์มเอง คอมไพล์จาก TypeScript ในเวลา build
      </p>
      <p>
        โพสต์นี้อธิบายว่ามันทำงานอย่างไร — สถาปัตยกรรม การแมปแพลตฟอร์ม ข้อแลกเปลี่ยน
        และเราอยู่ตรงไหนในวันนี้
      </p>

      <h2>ปัญหาของแนวทางปัจจุบัน</h2>
      <p>
        การพัฒนา GUI ข้ามแพลตฟอร์มเป็นปัญหาที่ยากมาหลายทศวรรษ ทุกเฟรมเวิร์กหลัก
        ได้ทำชุดของการประนีประนอมที่แตกต่างกัน:
      </p>

      <h3>Electron / Tauri (แบบ Web)</h3>
      <p>
        Electron บันเดิล Chromium และ Node.js ให้คุณได้เว็บเบราว์เซอร์เป็นเชลล์แอป
        คุณเข้าถึงแพลตฟอร์มเว็บได้เต็มที่ แต่แอป &quot;เนทีฟ&quot; ของคุณเป็นการดาวน์โหลด 150+ MB
        ที่ใช้หน่วยความจำหลายร้อยเมกะไบต์แค่เพื่อแสดงหน้าต่าง Tauri แทนที่
        Chromium ด้วย web view ของ OS ลดขนาดได้มาก แต่ UI ของคุณยังเป็น HTML/CSS
        ที่เรนเดอร์ใน web view — ไม่ใช่วิดเจ็ตเนทีฟ
      </p>

      <h3>React Native (แบบ Bridge)</h3>
      <p>
        React Native รัน JavaScript ของคุณในเอนจิน JS (Hermes หรือ V8) และทำ bridge ไปยังวิดเจ็ต
        เนทีฟผ่านคิวข้อความแบบซีเรียลไลซ์ คุณได้วิดเจ็ตเนทีฟจริง แต่ bridge
        เพิ่มความล่าช้า โดยเฉพาะสำหรับเจสเจอร์และแอนิเมชัน การโต้ตอบที่ซับซ้อนต้อง
        ลงไปเขียนโค้ดเนทีฟ (Swift/Kotlin) ทำลายคำสัญญาของโค้ดเบสเดียว
      </p>

      <h3>Flutter (เรนเดอร์แบบกำหนดเอง)</h3>
      <p>
        Flutter คอมไพล์ Dart เป็นโค้ดเนทีฟและวาดทุกอย่างด้วยเอนจินเรนเดอร์ที่ใช้ Skia
        ของตัวเอง ประสิทธิภาพยอดเยี่ยม แต่วิดเจ็ตของคุณไม่ใช่เนทีฟ — มันเป็น
        แบบจำลองที่สมบูรณ์แบบในระดับพิกเซล ซึ่งหมายความว่าอนุสัญญาของแพลตฟอร์ม (ฟิสิกส์การเลื่อน การเลือกข้อความ
        พฤติกรรมการเข้าถึง) ต้องถูกนำไปใช้ใหม่แทนที่จะสืบทอดมา และบนเดสก์ท็อป
        ความแตกต่างจะเห็นได้ชัดขึ้น
      </p>

      <h3>KMP + Compose Multiplatform (เนทีฟบางส่วน)</h3>
      <p>
        Kotlin Multiplatform คอมไพล์เป็น JVM บน Android และเนทีฟบน iOS แต่ UI ที่แชร์ผ่าน
        Compose Multiplatform ใช้เรนเดอร์ที่ใช้ Skia — ข้อแลกเปลี่ยนเดียวกับ Flutter สำหรับ
        UI ที่เป็นเนทีฟจริงๆ คุณต้องกลับไปเขียนโค้ดเฉพาะแพลตฟอร์ม
      </p>

      <h2>แนวทางของ Perry: คอมไพล์เป็น Toolkit เนทีฟ</h2>
      <p>
        Perry ใช้แนวทางที่แตกต่างกันโดยพื้นฐาน แทนที่จะรันโค้ดของคุณในรันไทม์
        แล้วทำ bridge ไปยังวิดเจ็ตเนทีฟ หรือวาดพิกเซลแบบกำหนดเอง Perry คอมไพล์โค้ด
        UI TypeScript ของคุณเป็นการเรียก toolkit เนทีฟของแต่ละแพลตฟอร์มโดยตรงในเวลา build
      </p>
      <p>
        ความแตกต่างที่สำคัญ: <strong>ไม่มีเลเยอร์รันไทม์ระหว่างโค้ดของคุณและ SDK ของแพลตฟอร์ม</strong>{" "}
        ไบนารีที่คอมไพล์แล้วเรียก AppKit, UIKit, Android Views, GTK4 หรือ Win32 โดยตรง เหมือนกับ
        แอปที่เขียนด้วย Swift, Kotlin หรือ C++ จะทำ
      </p>

      <h2>API UI แบบรวม</h2>
      <p>
        Perry จัดเตรียม API TypeScript ทั่วไปสำหรับสร้างอินเทอร์เฟซผู้ใช้ API นี้
        ถูกออกแบบให้เป็นระดับสูงโดยเจตนา — คุณอธิบายว่า UI ของคุณควรประกอบด้วยอะไรและควร
        ทำงานอย่างไร และ Perry จะแมปไปยังโครงสร้างเนทีฟที่เหมาะสม
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">Text</span>, <span className="text-cyan-400">Button</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">State</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">count</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-2"><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Counter&quot;</span>, {"{"} width: <span className="text-orange-400">400</span>, height: <span className="text-orange-400">300</span> {"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">16</span>, alignment: <span className="text-green-400">&quot;center&quot;</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">Text</span>(<span className="text-green-400">`Count: ${"{"}<span className="text-cyan-400">count</span>.value{"}"}`</span>, {"{"} fontSize: <span className="text-orange-400">32</span> {"}"}),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Increment&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value++),</p>
          <p>    <span className="text-yellow-400">Button</span>(<span className="text-green-400">&quot;Reset&quot;</span>, () =&gt; <span className="text-cyan-400">count</span>.value = <span className="text-orange-400">0</span>),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-2"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        โค้ดเดียวกันนี้คอมไพล์เป็น UI เนทีฟบนทั้งหกแพลตฟอร์ม ไม่มี <code className="text-perry-400">#ifdef</code>
        ไม่มีการตรวจสอบแพลตฟอร์ม ไม่มี import แบบมีเงื่อนไข
      </p>

      <h2>การแมปแพลตฟอร์มโดยละเอียด</h2>
      <p>
        นี่คือวิธีที่ Perry แมป API แบบรวมไปยังเฟรมเวิร์กเนทีฟของแต่ละแพลตฟอร์ม:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        บน macOS Perry สร้างโค้ดที่สร้างและจัดการออบเจ็กต์ AppKit โดยตรง
        <code className="text-perry-400">App</code> กลายเป็น <code className="text-perry-400">NSApplication</code> พร้อม
        <code className="text-perry-400">NSWindow</code>{" "}
        <code className="text-perry-400">Text</code> กลายเป็น <code className="text-perry-400">NSTextField</code> (ปิดการแก้ไข){" "}
        <code className="text-perry-400">Button</code> กลายเป็น <code className="text-perry-400">NSButton</code> พร้อมรูปแบบ target-action
        ที่เชื่อมต่อกับ callback ของคุณ{" "}
        <code className="text-perry-400">VStack</code> กลายเป็น <code className="text-perry-400">NSStackView</code> ในแนวตั้ง
        เลย์เอาต์ใช้ข้อจำกัด Auto Layout
      </p>
      <p>
        ไบนารีที่คอมไพล์แล้วเชื่อมต่อกับ AppKit framework และเรียกฟังก์ชัน Objective-C runtime
        โดยตรง เหมือนกับที่ Swift ที่คอมไพล์โดย Xcode จะทำ
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        บน iOS การแมปคล้ายกันแต่เป้าหมายคือ UIKit{" "}
        <code className="text-perry-400">App</code> กลายเป็น <code className="text-perry-400">UIApplication</code> พร้อม
        <code className="text-perry-400">UIWindow</code> และ <code className="text-perry-400">UIViewController</code> ราก{" "}
        <code className="text-perry-400">Text</code> แมปเป็น <code className="text-perry-400">UILabel</code>{" "}
        <code className="text-perry-400">Button</code> แมปเป็น <code className="text-perry-400">UIButton</code>{" "}
        เลย์เอาต์ใช้ <code className="text-perry-400">UIStackView</code> และ Auto Layout
        อีเวนต์สัมผัสจะถูกจัดการผ่าน responder chain ของ UIKit
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        บน Android Perry สร้างไลบรารีเนทีฟที่โหลดผ่าน JNI (Java Native Interface){" "}
        <code className="text-perry-400">App</code> แมปเป็น <code className="text-perry-400">Activity</code>{" "}
        <code className="text-perry-400">Text</code> กลายเป็น <code className="text-perry-400">TextView</code>{" "}
        <code className="text-perry-400">Button</code> กลายเป็น <code className="text-perry-400">android.widget.Button</code> พร้อม
        <code className="text-perry-400">OnClickListener</code>{" "}
        <code className="text-perry-400">VStack</code> แมปเป็น <code className="text-perry-400">LinearLayout</code> แนวตั้ง
        โค้ดเนทีฟเรียกกลับไปยัง Android framework ผ่าน JNI สร้างและ
        จัดการ Android views จริง
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        บน Linux Perry ใช้เป้าหมาย GTK4{" "}
        <code className="text-perry-400">App</code> กลายเป็น <code className="text-perry-400">GtkApplication</code> พร้อม
        <code className="text-perry-400">GtkApplicationWindow</code>{" "}
        <code className="text-perry-400">Text</code> แมปเป็น <code className="text-perry-400">GtkLabel</code>{" "}
        <code className="text-perry-400">Button</code> แมปเป็น <code className="text-perry-400">GtkButton</code> พร้อม
        signal handler{" "}
        <code className="text-perry-400">VStack</code> แมปเป็น <code className="text-perry-400">GtkBox</code> ในแนวตั้ง
        CSS theming ของ GTK หมายความว่าแอปของคุณจะติดตามธีมเดสก์ท็อปของผู้ใช้โดยอัตโนมัติ
      </p>

      <h3>Windows — Win32</h3>
      <p>
        บน Windows Perry สร้างการเรียก Win32 API{" "}
        <code className="text-perry-400">App</code> สร้าง window class ลงทะเบียน และรัน message
        loop{" "}
        <code className="text-perry-400">Button</code> กลายเป็นคอนโทรล <code className="text-perry-400">BUTTON</code>
        ที่สร้างด้วย <code className="text-perry-400">CreateWindowEx</code>{" "}
        <code className="text-perry-400">Text</code> แมปเป็นคอนโทรล <code className="text-perry-400">STATIC</code>
        อีเวนต์จะถูกจัดการผ่าน Win32 message pump (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code> เป็นต้น)
      </p>

      <h2>การจัดการสถานะ</h2>
      <p>
        พื้นฐาน <code className="text-perry-400">State&lt;T&gt;</code> ของ Perry ให้การจัดการ
        สถานะแบบรีแอคทีฟที่คอมไพล์เป็นกลไกอัปเดตเนทีฟของแพลตฟอร์ม เมื่อ
        ค่าสถานะเปลี่ยน Perry จะทริกเกอร์การอัปเดต UI ผ่านระบบ
        การทำให้ไม่ถูกต้องของแพลตฟอร์มเอง — <code className="text-perry-400">setNeedsDisplay</code> บน macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> บน Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> บน Linux
      </p>
      <p>
        ไม่มีการ diffing DOM เสมือน ไม่มี reconciliation pass ไม่มีการซีเรียลไลซ์ การเปลี่ยนแปลง
        สถานะจะส่งตรงไปยังวิดเจ็ตเนทีฟที่แสดงค่า
      </p>

      <h2>ทำไมไม่ใช้ไวยากรณ์ SwiftUI / Jetpack Compose?</h2>
      <p>
        คุณอาจสงสัยว่าทำไม Perry ไม่ใช้ไวยากรณ์แบบ declarative คล้ายกับ SwiftUI หรือ
        Jetpack Compose คำตอบคือเชิงปฏิบัติ: Perry คอมไพล์ TypeScript และ TypeScript
        มีสำนวนของตัวเอง แทนที่จะประดิษฐ์ DSL ที่ดูแปลกสำหรับนักพัฒนา TypeScript
        Perry ใช้ API แบบ builder ที่รู้สึกเป็นธรรมชาติใน TypeScript — constructors
        การเรียกเมธอด callbacks และ closures เป็นรูปแบบเดียวกับที่คุณใช้อยู่แล้วเมื่อ
        ทำงานกับ Express, React hooks หรือไลบรารี TypeScript อื่นๆ
      </p>

      <h2>สิ่งที่มีอยู่ในวันนี้</h2>
      <p>
        แบ็กเอนด์ทั้งหกแพลตฟอร์มถูกนำไปใช้งานและมีเสถียรภาพ ชุดวิดเจ็ตปัจจุบันประกอบด้วย:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>เลย์เอาต์</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>การแสดงผล</strong> — Text, Image</li>
        <li><strong>อินพุต</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>การนำทาง</strong> — NavigationView, TabView, List</li>
        <li><strong>คอนเทนเนอร์</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>สถานะ</strong> — State&lt;T&gt; สำหรับการอัปเดตแบบรีแอคทีฟ</li>
      </ul>

      <h2>สิ่งที่จะมาถัดไป</h2>
      <p>
        เรากำลังขยายไลบรารีวิดเจ็ตอย่างแข็งขัน รายการถัดไป:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — อินพุตรหัสผ่านพร้อมช่องข้อความปลอดภัยเนทีฟของแพลตฟอร์ม</li>
        <li><code className="text-perry-400">ProgressView</code> — ตัวบ่งชี้ความคืบหน้าแบบกำหนดและไม่กำหนด</li>
        <li><code className="text-perry-400">Alert</code> — กล่องโต้ตอบแจ้งเตือนเนทีฟพร้อมปุ่มและช่องข้อความ</li>
        <li><code className="text-perry-400">DatePicker</code> — การเลือกวันที่/เวลาเนทีฟของแพลตฟอร์ม</li>
        <li><code className="text-perry-400">Menu</code> — แถบเมนูและเมนูบริบทเนทีฟ</li>
      </ul>
      <p>
        เป้าหมายคือความเท่าเทียมของเฟรมเวิร์ก GUI เต็มรูปแบบข้ามทุกแพลตฟอร์ม — ทุกวิดเจ็ต เลย์เอาต์
        เจสเจอร์ และแอนิเมชันมีอยู่ทุกที่ ดู{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">แผนงาน</Link> สำหรับ
        ภาพรวมทั้งหมด
      </p>

      <h2>ลองใช้งาน</h2>
      <p>
        วิธีที่ดีที่สุดในการเข้าใจ UI เนทีฟของ Perry คือดูมันทำงานจริง{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> เป็นตัวดู
        JSON เนทีฟที่สร้างขึ้นทั้งหมดด้วย TypeScript กับ Perry — แอปจริงที่มีการนำทางแบบต้นไม้
        การค้นหา และปุ่มลัด คอมไพล์เป็นไบนารีเนทีฟบน macOS, iOS และ Android
        อ่าน{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">บทความแนะนำฉบับเต็ม</Link>{" "}
        เกี่ยวกับวิธีการสร้าง
      </p>
    </>
  );
}
