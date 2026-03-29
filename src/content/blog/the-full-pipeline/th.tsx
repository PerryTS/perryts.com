import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        82 คอมมิตใน 7 วัน เว็บไซต์เอกสาร 49 หน้า การเผยแพร่ App Store และ Play Store อัตโนมัติ
        แพ็กเกจ Homebrew และ APT ส่วนขยาย WidgetKit เนทีฟที่คอมไพล์จาก TypeScript
        คอมไพเลอร์ LLVM แบบ self-hosting และการแก้ไขบั๊กหลายสิบรายการในทุกแพลตฟอร์ม
      </p>
      <p>
        โพสต์นี้ครอบคลุมทุกอย่างที่เปิดตัวใน Perry ระหว่างวันที่ 6 ถึง 13 มีนาคม 2026 ธีมคือ
        การทำให้สมบูรณ์ — เติมเต็มช่องว่างระหว่าง &quot;ฉันเขียน TypeScript&quot; กับ &quot;แอปของฉัน
        อยู่บน App Store&quot;
      </p>

      <h2>docs.perryts.com</h2>
      <p>
        Perry ตอนนี้มีเว็บไซต์เอกสารจริงๆ แล้ว 49 หน้าสร้างด้วย mdBook ครอบคลุมทุกอย่างตั้งแต่
        เริ่มต้นใช้งานจนถึงอ้างอิง CLI เอกสารจัดเป็นหมวดหมู่:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>เริ่มต้นใช้งาน</strong> — การติดตั้ง โปรเจกต์แรก โครงสร้างโปรเจกต์</li>
        <li><strong>ฟีเจอร์ภาษา</strong> — ทุกอย่างที่ Perry รองรับจาก TypeScript</li>
        <li><strong>UI เนทีฟ</strong> — 12 หน้าครอบคลุมวิดเจ็ตทุกประเภท เลย์เอาต์ การจัดการสถานะ และพฤติกรรมเฉพาะแพลตฟอร์ม</li>
        <li><strong>แพลตฟอร์ม</strong> — หน้าเฉพาะสำหรับแต่ละใน 6 แพลตฟอร์มเป้าหมาย</li>
        <li><strong>ไลบรารีมาตรฐาน</strong> — เอกสารการใช้งานแพ็กเกจเนทีฟกว่า 50 ตัว</li>
        <li><strong>API ระบบ</strong> — ไดอะล็อกไฟล์ keychain การแจ้งเตือน หลายหน้าต่าง</li>
        <li><strong>WidgetKit</strong> — โมดูลส่วนขยายวิดเจ็ตใหม่</li>
        <li><strong>ปลั๊กอิน</strong> — สถาปัตยกรรมปลั๊กอินแบบคอมไพล์ไทม์</li>
        <li><strong>อ้างอิง CLI</strong> — ทุกคำสั่งและ flag</li>
      </ul>
      <p>
        เว็บไซต์ยังรวมไฟล์ <code className="text-amber-400">llms.txt</code> สำหรับ
        การค้นหาโดย AI และ deploy ผ่าน GitHub Pages พร้อมโดเมนที่กำหนดเองที่{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a>
      </p>

      <h2>ติดตั้ง Perry ด้วยคำสั่งเดียว</h2>
      <p>
        Perry ตอนนี้แจกจ่ายผ่าน Homebrew และ APT นอกเหนือจากการบิลด์จากซอร์ส ไปป์ไลน์รีลีส
        GitHub Actions ใหม่บิลด์ไบนารีสำหรับ macOS (arm64 และ x86_64) และ
        Linux (x86_64 และ arm64) แล้วอัปเดต Homebrew tap และ APT repository โดยอัตโนมัติ
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500"># macOS</span></p>
          <p><span className="text-cyan-400">brew</span> tap PerryTS/perry</p>
          <p><span className="text-cyan-400">brew</span> install perry</p>
          <p className="mt-3"><span className="text-slate-500"># Debian/Ubuntu</span></p>
          <p><span className="text-cyan-400">sudo</span> apt update &amp;&amp; sudo apt install perry</p>
        </div>
      </div>

      <p>
        ไม่ต้องโคลน repo และบิลด์ด้วย Cargo อีกต่อไป ติดตั้ง Perry เหมือนกับที่คุณติดตั้ง
        เครื่องมืออื่นๆ
      </p>

      <h2>การเผยแพร่ App Store อัตโนมัติ</h2>
      <p>
        นี่คือการเปลี่ยนแปลงที่ลดขั้นตอนแบบ manual มากที่สุด การรัน{" "}
        <code className="text-amber-400">perry publish ios</code> ตอนนี้จัดการไปป์ไลน์การแจกจ่าย iOS ทั้งหมด
        โดยอัตโนมัติ:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li>สร้างคีย์ RSA และ CSR ผ่าน App Store Connect API</li>
        <li>สร้างใบรับรองการแจกจ่ายและรวมเป็น <code className="text-amber-400">.p12</code></li>
        <li>ลงทะเบียน bundle ID</li>
        <li>สร้างและดาวน์โหลด provisioning profile</li>
        <li>สร้างเรคอร์ดแอปบน App Store Connect</li>
        <li>บิลด์ ลงนาม และอัปโหลดไปยัง TestFlight หรือ App Store</li>
      </ol>
      <p>
        ไม่ต้องใช้ Xcode ไม่ต้องเข้าพอร์ทัลด้วยตัวเอง ไม่ต้องดาวน์โหลดใบรับรองจากเบราว์เซอร์ วิซาร์ดการตั้งค่า
        รันอัตโนมัติในครั้งแรกที่คุณเผยแพร่ นำทางผ่านการกำหนดค่า API key
        และบันทึกข้อมูลรับรองใน <code className="text-amber-400">perry.toml</code>
      </p>
      <p>
        การแจกจ่าย macOS ก็อัตโนมัติเช่นกัน Perry รองรับ 3 โหมด: TestFlight, DMG ที่ผ่านการรับรอง
        และโหมด <strong>&quot;ทั้งสอง&quot;</strong> ใหม่ที่เผยแพร่ไปยัง App Store และสร้าง
        DMG ที่ผ่านการรับรองพร้อมกัน ใบรับรอง 3 ประเภทถูกสร้างอัตโนมัติ:{" "}
        <code className="text-amber-400">MAC_APP_DISTRIBUTION</code>,{" "}
        <code className="text-amber-400">MAC_INSTALLER_DISTRIBUTION</code> และ{" "}
        <code className="text-amber-400">DEVELOPER_ID_APPLICATION</code>
      </p>
      <p>
        การเผยแพร่ Android ก็ได้รับวิซาร์ดการตั้งค่าอัตโนมัติเช่นกัน ทั้ง 3 แพลตฟอร์มตอนนี้ทำตาม
        รูปแบบเดียวกัน: การรันครั้งแรกจะทริกเกอร์การตั้งค่า ข้อมูลรับรองจะถูกบันทึกไว้ในโปรเจกต์ การรัน
        ครั้งต่อไปไม่ต้องกำหนดค่าเลย
      </p>
      <p>
        การตรวจสอบก่อนบินจับปัญหาก่อนที่บิลด์จะเริ่ม — bundle ID ของ provisioning profile ไม่ตรง
        ใบรับรองหมดอายุ ไม่มีไอคอนแอป รูปแบบเวอร์ชันไม่ถูกต้อง team ID ผิด
        และ <code className="text-amber-400">encryption_exempt</code> ใน{" "}
        <code className="text-amber-400">perry.toml [ios]</code> ตั้งค่าคีย์{" "}
        <code className="text-amber-400">ITSAppUsesNonExemptEncryption</code> ใน Info.plist อัตโนมัติ ข้าม
        พรอมต์การปฏิบัติตามการส่งออกแบบ manual ใน App Store Connect
      </p>

      <h2>perry/widget: WidgetKit จาก TypeScript</h2>
      <p>
        Perry ตอนนี้สามารถคอมไพล์ TypeScript เป็นส่วนขยาย WidgetKit SwiftUI เนทีฟได้ นี่ไม่ใช่ wrapper
        หรือ bridge — คอมไพเลอร์เดินผ่านต้นไม้เรนเดอร์ที่ระดับ HIR และปล่อยซอร์สโค้ด SwiftUI
        โดยตรง ผลลัพธ์เป็นบันเดิลส่วนขยาย WidgetKit สมบูรณ์ที่ Xcode (หรือไปป์ไลน์บิลด์ของ
        Perry) สามารถฝังในแอปของคุณ
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-cyan-400">perry</span> widget.ts --target ios-widget --app-bundle-id com.example.app -o out/</p>
        </div>
      </div>

      <p>
        แนวทางนี้แตกต่างอย่างพื้นฐานจากการคอมไพล์อื่นๆ ของ Perry โค้ด Perry ปกติ
        ผ่าน Cranelift ไปยังโค้ดเครื่องเนทีฟ โค้ดวิดเจ็ตผ่าน HIR ไปยังผลลัพธ์ข้อความ SwiftUI
        เพราะ WidgetKit ต้องการ SwiftUI — ไม่มีทางที่จะสร้างส่วนขยายวิดเจ็ตด้วยโค้ด UIKit หรือ
        AppKit แบบ imperative Perry แก้ปัญหานี้โดยปฏิบัติต่อต้นไม้เรนเดอร์ของวิดเจ็ตเป็น
        เทมเพลตเวลาคอมไพล์ ไม่ใช่โค้ดรันไทม์
      </p>

      <h2>วิดเจ็ตใหม่และการปรับปรุงแพลตฟอร์ม</h2>
      <p>
        วิดเจ็ตใหม่ 4 ประเภทมาถึงสัปดาห์นี้:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>TextArea</strong> — การแก้ไขข้อความหลายบรรทัดบน macOS, iOS และ Android</li>
        <li><strong>SecureField</strong> — ช่องป้อนรหัสผ่านบน iOS และ macOS</li>
        <li><strong>QR Code</strong> — การสร้าง QR code เนทีฟบน iOS, macOS และ Android</li>
        <li><strong>Splash Screen</strong> — สตอรี่บอร์ด LaunchScreen ที่สร้างอัตโนมัติ (iOS) และธีม splash (Android)</li>
      </ul>

      <h3>iPad เป็นเนทีฟ</h3>
      <p>
        Perry ตอนนี้สร้างแอป iPad เนทีฟเต็มรูปแบบ: <code className="text-amber-400">UIDeviceFamily [1,2]</code>,
        รองรับการหมุนหน้าจอ, <code className="text-amber-400">UIRequiresFullScreen</code> และสตอรี่บอร์ด
        LaunchScreen ที่คอมไพล์ผ่าน ibtool ฟังก์ชัน <code className="text-amber-400">getDeviceIdiom()</code>{" "}
        ใหม่ตรวจจับโทรศัพท์ vs. iPad ขณะรันไทม์ และ <code className="text-amber-400">PerryFrameSplit</code>{" "}
        ให้คอนเทนเนอร์แยกแนวนอนแบบเฟรมสำหรับเลย์เอาต์ iPad
      </p>

      <h3>Windows</h3>
      <p>
        Windows ได้รับการรองรับ timer (ติ๊ก <code className="text-amber-400">WM_TIMER</code> 50ms),
        ปุ่ม owner-drawn พร้อมพื้นหลังธีมมืด และการแก้ไขบั๊ก use-after-free ใน{" "}
        <code className="text-amber-400">to_wide().as_ptr()</code> ในไฟล์วิดเจ็ต 18 ไฟล์ V8 runtime
        ตอนนี้ทำงานบน Windows โดยมีไลบรารีระบบที่จำเป็นลิงก์แล้ว
      </p>

      <h3>GTK4 (Linux)</h3>
      <p>
        แบ็กเอนด์ GTK4 ได้รับการปรับปรุงภาพเพื่อให้ตรงกับ macOS: CSS padding สำหรับ edge insets, สไตล์ปุ่ม
        Adwaita, การแก้ไขมาร์จิน VStack และนโยบายแนวนอน ScrollView
      </p>

      <h2>http/https และ better-sqlite3</h2>
      <p>
        เพิ่มเติม stdlib ที่สำคัญ 2 รายการ:
      </p>
      <p>
        โมดูลเนทีฟ <code className="text-amber-400">http</code> และ{" "}
        <code className="text-amber-400">https</code> ใหม่ให้ HTTP ฝั่งไคลเอนต์
        โดยใช้ reqwest ภายใน API ตรงกับ Node.js:{" "}
        <code className="text-amber-400">request()</code>,{" "}
        <code className="text-amber-400">get()</code>,{" "}
        <code className="text-amber-400">ClientRequest</code> พร้อม write/end/on และ{" "}
        <code className="text-amber-400">IncomingMessage</code> พร้อม statusCode และ event handler
      </p>
      <p>
        <code className="text-amber-400">better-sqlite3</code> ตอนนี้รองรับเต็มที่:{" "}
        <code className="text-amber-400">new Database()</code>,{" "}
        <code className="text-amber-400">prepare</code>,{" "}
        <code className="text-amber-400">exec</code>,{" "}
        <code className="text-amber-400">run</code>,{" "}
        <code className="text-amber-400">get</code>,{" "}
        <code className="text-amber-400">all</code> — พร้อม NaN-boxing ที่เหมาะสมและอ็อบเจ็กต์แถว
        พร้อมการเข้าถึง property ที่ตั้งชื่อ
      </p>
      <p>
        การปรับปรุง stdlib อื่นๆ: <code className="text-amber-400">crypto.randomBytes()</code> ตอนนี้
        ส่งคืน Buffer (ตรงกับ Node.js), MongoDB ได้รับ{" "}
        <code className="text-amber-400">listDatabases</code> และ{" "}
        <code className="text-amber-400">listCollections</code> พร้อมการแก้ไข thread-safety และ
        INSERT/UPDATE/DELETE ของ mysql2 ตอนนี้ส่งคืน{" "}
        <code className="text-amber-400">ResultSetHeader</code> พร้อม{" "}
        <code className="text-amber-400">insertId</code>
      </p>

      <h2>การแก้ไข GC และความถูกต้อง</h2>
      <p>
        การแก้ไข garbage collector และความถูกต้องของ runtime ที่สำคัญหลายรายการเปิดตัวสัปดาห์นี้:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>ตัวป้องกันการเข้าซ้ำ GC</strong> — ป้องกันการเก็บขยะระหว่างการจัดสรร แก้ไข panic ของ RefCell double-borrow</li>
        <li><strong>การติดตาม Map ของ GC</strong> — Map ถูกติดตามอย่างเหมาะสมระหว่างเฟส mark ป้องกันการเก็บคีย์สตริง</li>
        <li><strong>การแก้ไข aliasing สตริง</strong> — string append ตอนนี้จัดสรรสตริงใหม่เสมอ แก้ไขการเสียหายจาก aliasing การคัดลอกพอยน์เตอร์</li>
        <li><strong>เลขคณิต BigInt</strong> — right-shift ใช้ arithmetic shift สำหรับจำนวนลบ การดำเนินการ bitwise ใช้ wrapping semantics แบบ ToInt32</li>
        <li><strong>Map.get() undefined</strong> — ส่งคืน <code className="text-amber-400">TAG_UNDEFINED</code> ที่ถูกต้องสำหรับคีย์ที่หายไปแทนแท็ก NaN ที่ผิด</li>
        <li><strong>รากฐาน GC ของฟิลด์สแตติก</strong> — ค่า BigInt ในฟิลด์สแตติกของคลาสลงทะเบียนเป็นราก GC</li>
      </ul>
      <p>
        สิ่งเหล่านี้ไม่ใช่การแก้ไขเล็กน้อย การแก้ไขการเข้าซ้ำ GC เพียงอย่างเดียวแก้ไขคลาสทั้งหมดของ
        crash แบบสุ่ม การแก้ไข aliasing สตริงมีผลกระทบต่อโปรแกรมใดก็ตามที่กำหนดตัวแปรสตริงหนึ่ง
        ไปยังอีกตัวแล้วแก้ไขตัวใดตัวหนึ่ง เหล่านี้เป็นประเภทของบั๊กที่ปรากฏเฉพาะภายใต้
        ภาระงานจริง และการแก้ไขพวกเขาคือสิ่งที่ทำให้คอมไพเลอร์พร้อมสำหรับโปรดักชัน
      </p>

      <h2>perry-verify: เสริมความแข็งแกร่ง</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> บริการตรวจสอบแอปอัตโนมัติ
        ได้รับการเสริมความปลอดภัย: การทำงานแบบ sandbox ผ่าน{" "}
        <code className="text-amber-400">bwrap</code> บน Linux และ{" "}
        <code className="text-amber-400">sandbox-exec</code> บน macOS, โทเค็นยืนยันตัวตนบน WebSocket
        handshake และการดาวน์โหลดไบนารี, จำกัดอัตราต่อ IP, job ID แบบ UUID เต็มเพื่อป้องกันการนับ
        และจำกัดขนาด body ที่ลดลง
      </p>

      <h2>perrysdad: คอมไพเลอร์ Self-Hosting</h2>
      <p>
        ในความพยายามคู่ขนาน <code className="text-amber-400">perrysdad</code> — คอมไพเลอร์ LLVM IR แบบ self-hosting
        ที่เขียนด้วย TypeScript — ไปจากศูนย์ถึงการคอมไพล์ตัวเองใน 5 เฟสตลอดสัปดาห์:
      </p>
      <ol className="list-decimal list-inside space-y-1">
        <li><strong>เฟส 0-1</strong> — โครงร่าง end-to-end: HIR เป็นข้อความ LLVM IR เป็น clang, ลิงก์กับ <code className="text-amber-400">libperry_runtime.a</code> ของ Perry</li>
        <li><strong>เฟส 2</strong> — พาร์เซอร์ recursive descent เขียนด้วยมือพร้อม Pratt expression parsing สำหรับไฟล์ <code className="text-amber-400">.ts</code> จริง</li>
        <li><strong>เฟส 3</strong> — อาร์เรย์ อ็อบเจ็กต์ และ map พร้อม runtime FFI รวมถึงการแก้ไข ABI mismatch ที่สำคัญ (JSValue ประกาศเป็น double ใน LLVM IR แทนที่จะเป็น i64)</li>
        <li><strong>เฟส 4</strong> — คลาส enum closure การคอมไพล์หลายไฟล์พร้อมการค้นหาโมดูลและการเรียงลำดับแบบ topological</li>
      </ol>
      <p>
        จุดสำคัญ: ไบนารี <code className="text-amber-400">anvil</code> ที่คอมไพล์ตัวเองตอนนี้สามารถ
        คอมไพล์โปรแกรมทดสอบและสร้างผลลัพธ์ที่ถูกต้องตรงกับเวอร์ชันที่คอมไพล์ด้วย node คอมไพเลอร์ TypeScript
        ที่คอมไพล์โดย Perry เป็นโค้ดเนทีฟ คอมไพล์ TypeScript เพิ่มเติมเป็นโค้ดเนทีฟ เต่าซ้อนเต่า
        จนถึงก้นบึ้ง
      </p>

      <h2>ตัวเลข</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>82 คอมมิต</strong>ไปยังคอมไพเลอร์ Perry หลัก</li>
        <li><strong>1 รีลีส</strong>: v0.2.173 (8 มีนาคม)</li>
        <li><strong>49 หน้าเอกสาร</strong>ที่ docs.perryts.com</li>
        <li><strong>4 วิดเจ็ตใหม่</strong>: TextArea, SecureField, QR Code, Splash Screen</li>
        <li><strong>3 ช่องทางการแจกจ่าย</strong>: Homebrew, APT, ซอร์ส</li>
        <li><strong>3 ไปป์ไลน์สโตร์อัตโนมัติ</strong>: App Store, TestFlight, Google Play</li>
        <li><strong>ทั้ง 6 แพลตฟอร์ม</strong>ได้รับการปรับปรุงสัปดาห์นี้</li>
      </ul>

      <h2>ขั้นตอนถัดไป</h2>
      <p>
        ไปป์ไลน์กำลังเติมเต็ม คุณสามารถเขียน TypeScript คอมไพล์เป็น 6 แพลตฟอร์ม แจกจ่ายผ่าน
        Homebrew หรือ APT เผยแพร่ไปยัง App Store และ Play Store เพิ่มวิดเจ็ตหน้าจอหลัก และอ่าน
        เอกสารครบถ้วน — ทั้งหมดโดยไม่ต้องออกจาก toolchain ของ Perry สิ่งที่เหลือ:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>รองรับ regex เต็มรูปแบบ</strong> — ช่องว่างภาษาสำคัญสุดท้าย</li>
        <li><strong>การขยาย perry/ui</strong> — ลากและวาง ป้ายกำกับการเข้าถึง DatePicker</li>
        <li><strong>การเติบโตของ perrysdad</strong> — ขยายคอมไพเลอร์ self-hosting ไปสู่ความเท่าเทียมกับ Perry เต็มรูปแบบ</li>
        <li><strong>Hub เบต้าสาธารณะ</strong> — เปิดบิลด์แบบกระจายให้ผู้ใช้ภายนอก</li>
      </ul>
      <p>
        ติดตามความคืบหน้าบน{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a> อ่านเอกสารใหม่ที่{" "}
        <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          docs.perryts.com
        </a> หรือดู{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">แผนงาน</Link>
        {" "}สำหรับภาพรวมทั้งหมด
      </p>
    </>
  );
}
