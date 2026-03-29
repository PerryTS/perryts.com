import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        เมื่อสัปดาห์ที่แล้ว Perry เป็นคอมไพเลอร์ที่มีชุดเครื่องมือ UI คุณสามารถเขียน TypeScript คอมไพล์เป็น
        ไบนารีเนทีฟ และส่งมอบบน 6 แพลตฟอร์ม นั่นคือเรื่องราวทั้งหมด วันนี้เรื่องราวใหญ่ขึ้น:
        Perry กำลังกลายเป็นระบบนิเวศ ORM ฐานข้อมูล 3 ตัว การแจ้งเตือนแบบพุชแบบครอบคลุม
        บิลด์แบบกระจายพร้อมการเผยแพร่ไปยัง App Store และ Play Store เลเยอร์ความเข้ากันได้กับ React
        และการตรวจสอบแอปอัตโนมัติ — ทั้งหมดมาถึงในสัปดาห์ที่ผ่านมา
      </p>
      <p>
        โพสต์นี้ครอบคลุมสิ่งที่เปิดตัว ทำไมมันสำคัญ และโค้ดเป็นอย่างไร
      </p>

      <h2>perry/ui: รากฐาน</h2>
      <p>
        ก่อนจะเข้าสู่ไลบรารีใหม่ๆ ควรเน้นย้ำสิ่งที่อยู่ตรงกลางของทุกอย่าง:{" "}
        <code className="text-amber-400">perry/ui</code> นี่คือชุดเครื่องมือ UI เนทีฟของ Perry เอง —
        วิดเจ็ตกว่า 20 ตัวที่คอมไพล์โดยตรงเป็นคอมโพเนนต์เนทีฟของแพลตฟอร์มบนทั้ง 6 เป้าหมาย
        ไม่ใช่ wrapper ไม่ใช่ชั้นนามธรรม ไม่ใช่เว็บวิว
        ทุก <code className="text-amber-400">Button</code> กลายเป็น{" "}
        <code className="text-amber-400">NSButton</code> บน macOS,{" "}
        <code className="text-amber-400">UIButton</code> บน iOS,{" "}
        <code className="text-amber-400">GtkButton</code> บน Linux,{" "}
        <code className="text-amber-400">android.widget.Button</code> บน Android และ{" "}
        <code className="text-amber-400">CreateWindowEx</code> control บน Windows
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code> คือพื้นผิว UI หลักและก้าวหน้าที่สุดของ Perry
        รวมถึงการจัดการสถานะแบบรีแอคทีฟ คอนเทนเนอร์เลย์เอาต์ (VStack, HStack,
        ZStack, SplitView) Canvas ที่ใช้การเร่งด้วยฮาร์ดแวร์ มุมมอง Table พร้อมการเรียงลำดับคอลัมน์
        โมดูล <code className="text-amber-400">perry/system</code> สำหรับไดอะล็อกไฟล์ การเข้าถึง
        keychain การแจ้งเตือน และหลายหน้าต่าง — ทั้งหมดจาก TypeScript ทั้งหมดคอมไพล์เป็นการเรียก
        API ของแพลตฟอร์มโดยตรง แนวทาง UI อื่นๆ ทุกอย่างใน Perry รวมถึงเลเยอร์ความเข้ากันได้กับ
        React ถูกสร้างบน <code className="text-amber-400">perry/ui</code> และแมปกลับไปยังวิดเจ็ตของมัน
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        อ็อบเจ็กต์ <code className="text-amber-400">State</code> แบบรีแอคทีฟเป็นพื้นฐานสำคัญ
        เมื่อค่า State เปลี่ยน เฉพาะวิดเจ็ตที่ผูกกับสถานะนั้นเท่านั้นที่อัปเดต — ไม่มี
        การเปรียบเทียบ DOM เสมือน ไม่มีการเรนเดอร์ใหม่ทั้งต้นไม้ ไม่มีการปรับยอดใดๆ
        มันเป็นเส้นทางที่ตรงที่สุดจาก TypeScript ไปยัง UI เนทีฟของแพลตฟอร์มที่มีอยู่
      </p>

      <h2>ความเข้ากันได้กับ React: เลเยอร์บางๆ บน perry/ui</h2>
      <p>
        สำหรับนักพัฒนาที่มาจาก React <code className="text-amber-400">perry-react</code>{" "}
        ให้เลเยอร์ความเข้ากันได้ที่แมปโมเดลคอมโพเนนต์ของ React ไปยัง{" "}
        วิดเจ็ตของ <code className="text-amber-400">perry/ui</code> คุณสามารถใช้{" "}
        <code className="text-amber-400">useState</code>,{" "}
        <code className="text-amber-400">useRef</code>,{" "}
        <code className="text-amber-400">useReducer</code> และ JSX — แล้ว Perry จะคอมไพล์เป็น
        วิดเจ็ตเนทีฟเดียวกันข้างใต้ มันเป็นสะพานเพื่อความสะดวก ไม่ใช่เอนจินเรนเดอร์แยกต่างหาก
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        ภายใต้ฝากระโปรง ทุกเอลิเมนต์ JSX แมปไปยังวิดเจ็ต <code className="text-amber-400">perry/ui</code>:{" "}
        <code className="text-amber-400">{`<div>`}</code> กลายเป็น VStack,{" "}
        <code className="text-amber-400">{`<button>`}</code> กลายเป็น Button,{" "}
        <code className="text-amber-400">useState</code> รองรับโดย State แบบรีแอคทีฟของ Perry
        ยังอยู่ในช่วงเริ่มต้น — เฟส 1 พร้อมการเรนเดอร์ใหม่ทั้งต้นไม้และที่เก็บ hook แบบ global — แต่
        พิสูจน์ว่าโค้ด React ที่มีอยู่สามารถเป้าหมายแพลตฟอร์มเนทีฟผ่าน Perry ได้ เรายังกำลัง
        สำรวจความเข้ากันได้กับ Angular และ Ionic ในแนวทางเดียวกัน
      </p>

      <h2>ORM ฐานข้อมูล 3 ตัว: API แบบ Prisma, ประสิทธิภาพแบบเนทีฟ</h2>
      <p>
        หากคุณกำลังสร้างเซิร์ฟเวอร์หรือแอปเดสก์ท็อปที่สื่อสารกับฐานข้อมูล Perry ตอนนี้
        ครอบคลุมด้วย ORM ที่เข้ากันได้กับ Prisma 3 ตัว:{" "}
        <code className="text-amber-400">perry-prisma</code> (MySQL),{" "}
        <code className="text-amber-400">perry-sqlite</code> (SQLite) และ{" "}
        <code className="text-amber-400">perry-postgres</code> (PostgreSQL) ทั้ง 3 ตัวเป็นตัวแทนที่
        แบบ drop-in ของ <code className="text-amber-400">@prisma/client</code> API เดียวกัน
        รูปแบบคิวรีเดียวกัน แต่คอมไพล์เป็นโค้ดเนทีฟพร้อม FFI ตรงกับฐานข้อมูล — ไม่มีเอนจิน Prisma
        ไม่มี Node.js
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Same Prisma API — compiled to native SQL via Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        ภายใต้ฝากระโปรง ORM แต่ละตัวเป็นฟรอนต์เอนด์ TypeScript ที่รองรับด้วยเลเยอร์ FFI ของ Rust โดยใช้{" "}
        <code className="text-amber-400">sqlx</code> โฟลว์คิวรี: TypeScript ซีเรียลไลซ์คิวรีเป็น JSON
        ส่งผ่านขอบเขต FFI Rust สร้าง SQL แบบมีพารามิเตอร์ รันผ่านคอนเนกชันพูล
        และซีเรียลไลซ์ผลลัพธ์กลับ สกีมา Prisma จะถูกอ่านในเวลาบิลด์ — ไม่มีการพาร์สขณะรันไทม์
      </p>
      <p>
        ทั้ง 3 การใช้งานแชร์โค้ดประมาณ 95% ความแตกต่างเป็นสิ่งที่คาดหวังได้:
        การ quote ตัวระบุ (<code className="text-amber-400">`col`</code> vs{" "}
        <code className="text-amber-400">&quot;col&quot;</code>), ไวยากรณ์ placeholder ({" "}
        <code className="text-amber-400">?</code> vs{" "}
        <code className="text-amber-400">$1, $2</code>) และความหมายของทรานแซกชัน ทั้ง 3 ตัว
        รองรับพื้นผิว CRUD ทั้งหมดของ Prisma: findMany, findFirst, findUnique, create, createMany,
        update, updateMany, upsert, delete, deleteMany, count — พร้อม raw SQL, ทรานแซกชัน
        และตัวดำเนินการกรอง WHERE กว่า 10 ตัว
      </p>

      <h2>perry-push: การแจ้งเตือนแบบพุชแบบครอบคลุม</h2>
      <p>
        <code className="text-amber-400">perry-push</code> เป็นไลบรารีเดียวที่จัดการการแจ้งเตือนแบบ
        พุชข้ามทุกแพลตฟอร์ม: APNs (iOS/macOS), FCM (Android), Web Push (เบราว์เซอร์)
        และ WNS (Windows) แต่ละ provider เป็นโมดูล FFI ของ Rust ที่มีฟังก์ชันเพียง 3 ตัว:{" "}
        <code className="text-amber-400">*_provider_new</code>,{" "}
        <code className="text-amber-400">*_provider_close</code> และ{" "}
        <code className="text-amber-400">*_send</code>
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Unified result type for all providers</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        การเข้ารหัสจัดการโดย{" "}
        <code className="text-amber-400">ring</code> — JWT แบบ ES256 สำหรับ APNs และ VAPID, RS256 สำหรับ
        บัญชีบริการ FCM, AES-GCM สำหรับการเข้ารหัส payload ของ Web Push ทั้งหมดคอมไพล์เป็นโค้ดเนทีฟ
        ไม่มี <code className="text-amber-400">node-gyp</code> ไม่มีการพึ่งพา OpenSSL
      </p>

      <h2>Perry Hub + Builders: บิลด์คลาวด์แบบกระจาย</h2>
      <p>
        นี่คือการเคลื่อนไหวด้านโครงสร้างพื้นฐาน <code className="text-amber-400">perry-hub</code> เป็น
        เซิร์ฟเวอร์จัดการบิลด์ — ตัวมันเองคอมไพล์จาก TypeScript โดย Perry — ที่จัดการพูล
        ของ worker บิลด์ คุณพุชโปรเจกต์ ฮับส่งไปยัง worker ที่เหมาะสมตาม
        แพลตฟอร์มเป้าหมาย และ worker คอมไพล์ ลงนาม และเผยแพร่แอปของคุณตามต้องการ
      </p>
      <p>
        ปัจจุบันมี worker 2 ตัว: builder macOS (จัดการเป้าหมาย macOS, iOS และ Android) และ
        builder Linux (จัดการ Linux และ Android) ทั้งสองเป็นไบนารี Rust ที่เชื่อมต่อกับฮับ
        ผ่าน WebSocket ดาวน์โหลด tarball ซอร์ส รันคอมไพเลอร์ Perry และอัปโหลดอาร์ทิแฟกต์กลับ
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>การลงนามโค้ด</strong> — การรับรอง Apple สำหรับ macOS, provisioning profile สำหรับ iOS, การลงนาม keystore Android</li>
        <li><strong>การเผยแพร่ App Store</strong> — อัปโหลดโดยตรงไปยัง App Store Connect และ Google Play Store</li>
        <li><strong>การจัดการอาร์ทิแฟกต์</strong> — ไบนารีที่บิลด์แล้วอัปโหลดไปยังฮับพร้อมการล้างข้อมูลตาม TTL</li>
        <li><strong>การจัดการไลเซนส์</strong> — จำกัดอัตราต่อไลเซนส์ คิวตามลำดับความสำคัญ (ระดับ pro ได้รับความสำคัญก่อน)</li>
      </ul>
      <p>
        ฮับเองเป็นกรณีศึกษาที่น่าสนใจ เป็นไฟล์ TypeScript ประมาณ 1,500 บรรทัดที่คอมไพล์เป็น
        ไบนารีเนทีฟ 2 MB โดย Perry รัน Fastify บนพอร์ต 3456 สำหรับ HTTP และ{" "}
        <code className="text-amber-400">ws</code> บนพอร์ต 3457 สำหรับ WebSocket สถานะทั้งหมดอยู่
        ในหน่วยความจำพร้อมการเก็บข้อมูลแบบ JSON — ไม่มีฐานข้อมูลภายนอก เป็นเซิร์ฟเวอร์ประเภทที่
        คุณสามารถ deploy ด้วย <code className="text-amber-400">scp</code> และไฟล์ systemd unit
      </p>

      <h2>perry-verify: การตรวจสอบแอปอัตโนมัติ</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> เป็นบริการ HTTP แบบสแตนด์อโลนที่
        รับไบนารีที่คอมไพล์แล้วและการกำหนดค่า รันไปป์ไลน์การตรวจสอบ และส่งคืน
        ผลลัพธ์ pass/fail แบบมีโครงสร้างพร้อมภาพหน้าจอ มันเปิดแอป รันโฟลว์การยืนยันตัวตน
        (แบบกำหนดได้หรือช่วยเหลือด้วย AI) ตรวจสอบสถานะ และจับภาพหลักฐาน
      </p>
      <p>
        มีอะแดปเตอร์แพลตฟอร์มสำหรับ macOS (ผ่าน API การเข้าถึง), Linux (AT-SPI) และ stub
        สำหรับ iOS Simulator และ Android Emulator เลเยอร์ AI ใช้ Claude สำหรับการยืนยันตัวตนสำรอง
        และการตรวจสอบสถานะเมื่อการตรวจสอบแบบกำหนดได้ไม่สามารถทำได้ ออกแบบมา
        เพื่อแทรกเข้าไปในไปป์ไลน์บิลด์ของฮับเป็นขั้นตอนหลังบิลด์: คอมไพล์ ลงนาม ตรวจสอบ เผยแพร่
      </p>

      <h2>Pry ส่งมอบทุกที่</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>{" "}
        ตัวดู JSON เนทีฟที่เราสร้างเป็นตัวอย่างของ Perry ตอนนี้ส่งมอบบน 5 แพลตฟอร์ม อยู่บน{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Mac App Store
        </a>{" "}
        และ{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          Google Play
        </a>{" "}
        พร้อมไบนารีเนทีฟสำหรับ Linux และ Windows โค้ดเบส TypeScript เดียวกัน
        จุดเข้าเฉพาะแพลตฟอร์ม 5 จุด ไบนารีเนทีฟ 5 ตัว เป็นหลักฐานที่เป็นรูปธรรมที่สุด
        ว่าแนวทางทั้งหมดนี้ใช้งานได้ตั้งแต่ต้นจนจบ — จากซอร์ส TypeScript ถึงรายการบน App Store
      </p>

      <h2>ทั้งหมดนี้หมายความว่าอะไร</h2>
      <p>
        คอมไพเลอร์น่าสนใจ ระบบนิเวศมีประโยชน์ ในสัปดาห์ที่ผ่านมา Perry เปลี่ยนจาก
        &quot;คุณสามารถคอมไพล์ TypeScript เป็นเนทีฟ&quot; เป็น &quot;คุณสามารถสร้างแอปเต็มรูปแบบพร้อม
        UI เนทีฟ ฐานข้อมูล Prisma การแจ้งเตือนแบบพุช และบิลด์ที่เผยแพร่อัตโนมัติไปยัง
        App Store&quot;
      </p>
      <p>
        ชิ้นส่วนต่างๆ กำลังเริ่มเชื่อมต่อกัน:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> คือเส้นทางที่ตรงที่สุดจาก TypeScript ไปยัง UI เนทีฟของแพลตฟอร์ม — สถานะแบบรีแอคทีฟ วิดเจ็ตกว่า 20 ตัว ไม่มีชั้นนามธรรม</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> หมายความว่าโค้ดฐานข้อมูลที่มีอยู่ย้ายได้พร้อมการเปลี่ยนแปลงน้อยที่สุด</li>
        <li><strong>perry-push</strong> หมายความว่าการแจ้งเตือนแบบพุชเนทีฟโดยไม่ต้องมีไลบรารีเฉพาะแพลตฟอร์ม</li>
        <li><strong>perry-hub + builders</strong> หมายความว่าคุณสามารถจาก <code className="text-amber-400">perry publish</code> ไปถึง App Store ในขั้นตอนเดียว</li>
        <li><strong>perry-verify</strong> หมายความว่าการทดสอบอัตโนมัติของผลลัพธ์ที่คอมไพล์แล้ว ไม่ใช่แค่ซอร์ส</li>
        <li><strong>perry-react</strong> หมายความว่านักพัฒนา React สามารถเข้าสู่ Perry โดยใช้รูปแบบที่คุ้นเคย ทั้งหมดแมปไปยัง perry/ui ข้างใต้</li>
      </ul>
      <p>
        สิ่งเหล่านี้ไม่ใช่ทฤษฎี ทุกไลบรารีที่ระบุไว้ที่นี่มีโค้ดที่ทำงานได้ การทดสอบ และ
        เอกสารประกอบ หลายตัวถูกใช้งานจริงในโปรดักชันแล้ว — เว็บไซต์ landing ของ Perry เอง
        รันบนเซิร์ฟเวอร์ Fastify ที่คอมไพล์ด้วย Perry และ Pry เปิดให้บริการบน 2 แอปสโตร์
      </p>

      <h2>ขั้นตอนถัดไป</h2>
      <p>
        แผนงานในระยะใกล้:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>การขยาย perry/ui</strong> — ลากและวาง ป้ายกำกับการเข้าถึง เมนูบริบทที่กำหนดเอง พื้นฐานเลย์เอาต์เพิ่มเติม</li>
        <li><strong>การรวม perry-verify</strong> — การตรวจสอบอัตโนมัติในไปป์ไลน์บิลด์</li>
        <li><strong>ความเข้ากันได้ของเฟรมเวิร์ก</strong> — ปรับปรุงเลเยอร์ React, Angular และ Ionic เป็นทางเข้าสู่ perry/ui</li>
        <li><strong>รองรับ regex เต็มรูปแบบ</strong> — เอนจิน regex ที่เข้ากันได้กับ ECMAScript คอมไพล์เป็นเนทีฟ</li>
      </ul>
      <p>
        ติดตามความคืบหน้าบน{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
          GitHub
        </a> หรือดู{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">แผนงาน</Link>
        {" "}สำหรับภาพรวมทั้งหมด
      </p>
    </>
  );
}
