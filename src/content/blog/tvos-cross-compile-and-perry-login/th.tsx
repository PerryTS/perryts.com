import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        ห้าวัน 120 คอมมิต และ Perry กระโดดจาก v0.4.0 เป็น v0.4.24 ไฮไลท์: tvOS กลายเป็นเป้าหมายการคอมไพล์ลำดับที่ 10, แอป iOS และ macOS สามารถสร้างได้ทั้งหมดจาก Linux, perry login นำเสนอการเรียกเก็บเงินตามการใช้งาน และ UI ของ Windows ได้รับการปรับปรุงครั้งใหญ่ นี่คือทุกอย่างที่ส่งมอบ
      </p>

      <h2>tvOS: เป้าหมายการคอมไพล์ลำดับที่ 10</h2>
      <p>
        Perry ตอนนี้คอมไพล์ไปยัง Apple TV เป้าหมาย tvOS ใช้ตัวเรนเดอร์ SwiftUI เดียวกับ watchOS แชร์สถาปัตยกรรมที่ขับเคลื่อนด้วยข้อมูลโดย Perry สร้างต้นไม้ UI และแอป Swift host ที่ส่งมาเรนเดอร์แบบเนทีฟ ร่วมกับการรวม WASM <code>@perry/threads</code> ที่มีอยู่ แอป tvOS สามารถรันงานหนักด้านการคำนวณในพื้นหลังในขณะที่ UI ตอบสนองได้
      </p>
      <pre><code>{`# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos`}</code></pre>
      <p>
        สิ่งนี้ทำให้จำนวนเป้าหมายทั้งหมดเป็น <strong>10</strong>: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly และ Web/JavaScript โค้ดเบส TypeScript เดียว สิบเอาต์พุตเนทีฟ
      </p>

      <h2>ครอสคอมไพล์ iOS และ macOS จาก Linux</h2>
      <p>
        Perry ตอนนี้สามารถสร้างไบนารี iOS และ macOS ได้ทั้งหมดจากเครื่อง Linux โดยใช้ <code>ld64.lld</code> เป็นลิงก์เกอร์ Mach-O นี่คือชิ้นส่วนที่ขาดหายไปสำหรับ CI/CD อัตโนมัติเต็มรูปแบบ — พุช TypeScript ไปยังเซิร์ฟเวอร์ Linux รับไบนารีเนทีฟที่เซ็นชื่อสำหรับทุกแพลตฟอร์ม Apple โดยไม่ต้องมีเครื่องบิลด์ macOS
      </p>
      <p>
        การมาถึงจุดนี้ต้องแก้ปัญหาลิงก์เกอร์แบบลูกโซ่:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Triple codegen Mach-O</strong> — เพิ่ม target triple <code>aarch64-apple-macos</code> และ <code>aarch64-apple-ios</code> สำหรับ Cranelift</li>
        <li><strong>การลิงก์ Framework</strong> — เส้นทางค้นหา framework CoreGraphics, Metal, IOKit, DiskArbitration สำหรับครอสคอมไพล์</li>
        <li><strong><code>-lobjc</code></strong> — สัญลักษณ์ ObjC runtime ที่จำเป็นสำหรับเป้าหมาย Apple ทั้งหมด</li>
        <li><strong>เวอร์ชัน SDK</strong> — <code>sdk_version 26.0</code> ใน ld64.lld (Apple ต้องการ iOS 18+)</li>
        <li><strong>การตัดโค้ดตาย</strong> — <code>-dead_strip</code> แทน <code>-Wl,-dead_strip</code> สำหรับลิงก์เกอร์ Mach-O</li>
        <li><strong>การกำจัดรันไทม์ซ้ำ</strong> — ลบ <code>perry_runtime</code> ที่ซ้ำกันจาก static lib UI เพื่อหลีกเลี่ยงข้อผิดพลาดลิงก์</li>
      </ul>
      <p>
        ร่วมกับการครอสคอมไพล์ Linux → Windows ที่มีอยู่ (v0.2.195+) Perry ตอนนี้สามารถครอสคอมไพล์ไปยัง<strong>ทุกแพลตฟอร์มจาก Linux</strong> — iOS, macOS, Windows, Android, WASM และ Web
      </p>

      <h2>ความพร้อมสำหรับ App Store iOS</h2>
      <p>
        จุดสนใจหลักของรอบนี้คือการทำให้แอป iOS ที่คอมไพล์ด้วย Perry เป็นไปตามข้อกำหนด App Store อย่างสมบูรณ์:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Info.plist เต็มรูปแบบ</strong> — คีย์ที่ Apple กำหนดทั้งหมด: <code>CFBundleIdentifier</code>, <code>CFBundleName</code>, <code>CFBundleShortVersionString</code>, <code>CFBundleVersion</code>, <code>UIDeviceFamily</code>, <code>UIRequiredDeviceCapabilities</code></li>
        <li><strong>CFBundleIcons</strong> — การตั้งชื่อไอคอน iOS มาตรฐาน (<code>AppIcon60x60@2x</code>, ฯลฯ) พร้อมการแก้ไข fallback</li>
        <li><strong>เวอร์ชันจาก perry.toml</strong> — ฟิลด์ <code>version</code> และ <code>build_number</code> ไหลเข้า Info.plist โดยตรง</li>
        <li><strong>UILaunchScreen</strong> — ใช้คีย์สมัยใหม่แทน <code>UILaunchStoryboardName</code> (ไม่ต้องใช้ไฟล์ storyboard)</li>
        <li><strong>โปรไฟล์การจัดเตรียม</strong> — รองรับโปรไฟล์การจัดเตรียม macOS สำหรับการแจกจ่าย App Store และ TestFlight</li>
      </ul>

      <h2>Perry Login และการเรียกเก็บเงิน</h2>
      <p>
        Perry ตอนนี้มีบัญชีและการเรียกเก็บเงินตามการใช้งาน ขับเคลื่อนโดยคำสั่ง CLI <code>perry login</code> ใหม่และแดชบอร์ดที่ <a href="https://app.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">app.perryts.com</a>
      </p>
      <h3>วิธีการทำงาน</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry login</code></strong> — ขั้นตอนอุปกรณ์ GitHub OAuth เปิดเบราว์เซอร์ โพลล์เพื่อรอการเสร็จสิ้น</li>
        <li><strong>แผนฟรี</strong> — 15 บิลด์/เดือน โปรเจกต์ไม่จำกัดด้วยบัญชี GitHub</li>
        <li><strong>แผน Pro</strong> — บิลด์ไม่จำกัดผ่านการสมัครสมาชิก Polar.sh</li>
        <li><strong>โทเค็น API</strong> — สร้างและจัดการโทเค็นจากแดชบอร์ดสำหรับ CI/CD</li>
        <li><strong>การติดตามการใช้งาน</strong> — ตัวนับ publish และ verify รายเดือนพร้อมแถบการใช้งานแบบเรียลไทม์</li>
      </ul>
      <p>
        แดชบอร์ดเองเป็นเซิร์ฟเวอร์ Fastify ที่คอมไพล์ด้วย Perry พร้อม static export ของ Next.js — สร้างด้วย Perry ให้บริการผู้ใช้ Perry
      </p>

      <h2>การรับรอง macOS และการเซ็นโค้ด</h2>
      <p>
        ความสามารถในการเซ็นชื่อใหม่สองอย่าง:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>perry publish macos --notarize</code></strong> — เปลี่ยนเป็นใบรับรอง Developer ID โดยอัตโนมัติ (แทนใบรับรอง App Store) ส่งไปยังบริการรับรองของ Apple และแนบผลลัพธ์</li>
        <li><strong>การเซ็นโค้ด GCloud KMS</strong> — บิลด์ Windows ตอนนี้สามารถเซ็นด้วยคีย์ Google Cloud KMS ช่วยให้การเซ็นชื่ออัตโนมัติใน CI โดยไม่เปิดเผยคีย์ส่วนตัว</li>
      </ul>

      <h2>การปรับปรุง UI Windows</h2>
      <p>
        แบ็กเอนด์ UI ของ Windows ได้รับการอัปเดตที่ครอบคลุมที่สุด:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>การปรับขนาดตาม DPI</strong> — ขนาดหน้าต่าง ฟอนต์ และขนาดวิดเจ็ตปรับขนาดอย่างถูกต้องบนจอแสดงผล DPI สูง</li>
        <li><strong>API หน้าต่างสไตล์ launcher</strong> — หน้าต่างไร้ขอบพร้อมการวางตำแหน่งที่กำหนดเองสำหรับ UI สไตล์ launcher/spotlight</li>
        <li><strong>ปุ่มลัดทั่วระบบ</strong> — ทางลัดแป้นพิมพ์ทั้งระบบที่ทำงานแม้ว่าแอปจะไม่ได้โฟกัส</li>
        <li><strong>ไอคอนแอป</strong> — API <code>getAppIcon</code> สำหรับแสดงไอคอนแอปพลิเคชันใน UI ของ launcher</li>
        <li><strong>เลย์เอาต์ปลอดภัยจากการเข้าซ้ำ</strong> — การวาดตาม <code>RefCell</code> ถูกแทนที่ด้วย HWND storage <code>SetPropW</code> เพื่อป้องกัน panic ระหว่างข้อความ WM_PAINT ที่ซ้อนกัน</li>
        <li><strong>การรวม Geisterhand</strong> — วิดเจ็ตทุกประเภทลงทะเบียนกับเฟรมเวิร์กทดสอบ UI, <code>/type</code> ใช้ <code>SendMessageW</code> ผ่าน HWND map</li>
        <li><strong>รองรับกล้อง Android</strong> — API การจับภาพกล้องขยายไปยัง Android ผ่าน JNI</li>
      </ul>

      <h2>ประสิทธิภาพ</h2>
      <p>
        v0.4.14 ส่งมอบการตรวจสอบประสิทธิภาพอย่างครอบคลุม:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong><code>fcmp</code> เนทีฟ</strong> — การเปรียบเทียบจุดทศนิยมใช้คำสั่ง CPU เนทีฟแทนการเรียกฟังก์ชันรันไทม์ Benchmark Mandelbrot <strong>เร็วขึ้น 30%</strong></li>
        <li><strong>การต่อสตริงแบบ in-place</strong> — <code>str += &quot;text&quot;</code> แก้ไขบัฟเฟอร์ในที่แทนการจัดสรรสตริงใหม่ <strong>เร็วขึ้น 125 เท่า</strong>สำหรับการต่อซ้ำ</li>
        <li><strong>Short-circuit AND/OR</strong> — <code>&amp;&amp;</code> และ <code>||</code> ข้ามการประเมินตัวดำเนินการด้านขวาเมื่อผลลัพธ์ถูกกำหนดแล้ว</li>
        <li><strong>การพับค่าคงที่ลบ</strong> — <code>-1</code>, <code>-0.5</code> ฯลฯ ถูกพับเป็นค่าคงที่ในระดับ HIR แทนการปล่อยคำสั่งลบ</li>
      </ul>

      <h2>บิลด์ขนานบน Hub</h2>
      <p>
        เซิร์ฟเวอร์จัดการบิลด์ตอนนี้รองรับบิลด์พร้อมกันต่อเวิร์กเกอร์:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>การจัดส่งแบบสล็อต</strong> — เวิร์กเกอร์รายงานความจุ <code>max_concurrent</code>, Hub ติดตามงานที่ใช้งานอยู่ต่อเวิร์กเกอร์</li>
        <li><strong>ไม่มี 429 อีกต่อไป</strong> — งานเข้าคิวแทนที่จะถูกปฏิเสธเมื่อเวิร์กเกอร์ทั้งหมดยุ่ง</li>
        <li><strong>ดาวน์โหลดอาร์ทิแฟกต์ Base64</strong> — อาร์ทิแฟกต์ไบนารีให้บริการเป็น base64 เมื่อรันไทม์ Perry ไม่สามารถจัดการ HTTP response ไบนารีดิบ</li>
        <li><strong>WebSocket เชื่อมต่อใหม่อัตโนมัติ</strong> — การเชื่อมต่อการตรวจสอบบิลด์เชื่อมต่อใหม่โดยอัตโนมัติเมื่อตัดการเชื่อมต่อ</li>
      </ul>

      <h2>แพ็คเกจใหม่: perry/appstorereview</h2>
      <p>
        แพ็คเกจ first-party ใหม่สำหรับการขอรีวิว App Store:
      </p>
      <pre><code>{`import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();`}</code></pre>
      <p>
        ฟังก์ชันเดียว สองแพลตฟอร์ม UI รีวิวเนทีฟ ตรรกะการจับเวลาและการแสดงผลเป็นของนักพัฒนาทั้งหมด
      </p>

      <h2>การแก้ไข Codegen</h2>
      <p>
        120 คอมมิตหมายถึงการแก้ไขบั๊กจำนวนมาก สิ่งที่มีผลกระทบมากที่สุด:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>ความเท่าเทียมอย่างเข้มงวด (===)</strong> — แก้ไขบั๊กแยก 3 ตัวใน v0.4.2: การเปรียบเทียบแท็กชนิด การจัดการ NaN และการแยกแยะ null/undefined</li>
        <li><strong>การเปรียบเทียบสตริงที่ต่อกัน</strong> — <code>===</code> ล้มเหลวเมื่อเปรียบเทียบสตริงที่สร้างผ่านการต่อเนื่องจากการเปรียบเทียบตัวชี้แทนการเปรียบเทียบเนื้อหา</li>
        <li><strong>การแก้ไขคอนสตรักเตอร์</strong> — <code>new X(args)</code> ตอนนี้แก้ไขคอนสตรักเตอร์ที่นำเข้าข้ามโมดูลและฟังก์ชันคอนสตรักเตอร์ที่อิงจาก closure อย่างถูกต้อง</li>
        <li><strong>Array push ระดับโมดูล</strong> — ค่าที่พุชไปยังอาร์เรย์ระดับโมดูลภายในการเรียกฟังก์ชันซ้อนในลูปถูกสูญหายเนื่องจากตัวชี้ที่ล้าสมัยหลังการจัดสรรใหม่</li>
        <li><strong>การบังคับทางคณิตศาสตร์ของ null</strong> — <code>null + 1</code> ตอนนี้สร้าง <code>1</code> อย่างถูกต้องผ่าน <code>js_number_coerce</code></li>
        <li><strong>การห่อ Bitwise NOT</strong> — <code>~x</code> ตอนนี้ห่อเป็น i32 ตามซีแมนทิกส์ ECMAScript</li>
        <li><strong>fetch().then()</strong> — callback ไม่เคยทำงานในแอป UI เนทีฟเนื่องจากขาดการระบาย event loop (v0.4.3)</li>
        <li><strong>โมดูโลและเลขยกกำลัง WASM</strong> — ตัวดำเนินการ <code>%</code> และ <code>**</code> ทำให้เกิดข้อผิดพลาดการตรวจสอบ WASM (v0.4.5)</li>
      </ul>

      <h2>ในตัวเลข</h2>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>~120 คอมมิต</strong>ในคอมไพเลอร์ Perry หลักใน 5 วัน</li>
        <li><strong>24 patch release</strong>: v0.4.1 → v0.4.24</li>
        <li><strong>เป้าหมายการคอมไพล์</strong>: 9 → 10 (เพิ่ม tvOS)</li>
        <li><strong>เป้าหมายครอสคอมไพล์จาก Linux</strong>: Windows → Windows, iOS, macOS (Apple ทั้งหมด + Windows)</li>
        <li><strong>แพ็คเกจใหม่</strong>: perry/appstorereview</li>
        <li><strong>โครงสร้างพื้นฐานใหม่</strong>: แดชบอร์ด app.perryts.com, CLI perry login, การเรียกเก็บเงิน Polar.sh</li>
        <li><strong>เพิ่มประสิทธิภาพ</strong>: mandelbrot เร็วขึ้น 30% (fcmp เนทีฟ), การต่อสตริงเร็วขึ้น 125 เท่า</li>
      </ul>

      <h2>ขั้นตอนถัดไป</h2>
      <p>
        การครอสคอมไพล์ iOS และ macOS จาก Linux หมายความว่า Hub ตอนนี้สามารถสร้างสำหรับทุกแพลตฟอร์มจากเซิร์ฟเวอร์ Linux เดียว — ไม่ต้องมีเครื่องบิลด์ macOS เฉพาะสำหรับการคอมไพล์อีกต่อไป (เฉพาะสำหรับการเซ็นชื่อเท่านั้น) โครงสร้างพื้นฐานการเรียกเก็บเงินเปิดเส้นทางสู่เบต้าสาธารณะของ Hub และเมื่อเพิ่ม tvOS แล้ว Perry ครอบคลุมทุกแพลตฟอร์ม Apple: macOS, iOS, iPadOS, watchOS และ tvOS
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>เบต้าสาธารณะ Hub</strong> — ผู้ใช้ภายนอกสามารถพุช TypeScript และรับไบนารีเนทีฟ</li>
        <li><strong>รองรับ regex เต็มรูปแบบ</strong> — ช่องว่างภาษาหลักสุดท้าย</li>
        <li><strong>การขยาย perry/ui</strong> — drag and drop, การเข้าถึง, DatePicker</li>
        <li><strong>Source maps และข้อมูล debug</strong> — ข้อมูล debug DWARF สำหรับการ debug เนทีฟ</li>
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
