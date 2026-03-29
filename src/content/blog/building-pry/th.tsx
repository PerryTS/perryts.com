import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry เป็นตัวดู JSON เนทีฟที่สร้างขึ้นทั้งหมดด้วย TypeScript และคอมไพล์ด้วย Perry ไม่ใช่
        การสาธิตเทคโนโลยี — มันเป็นเครื่องมือจริงที่เราใช้ทุกวันเพื่อตรวจสอบการตอบกลับ API ไฟล์
        คอนฟิก และดัมพ์ข้อมูล โพสต์นี้อธิบายวิธีการสร้าง วิธีการคอมไพล์ และประสบการณ์
        ของนักพัฒนาเป็นอย่างไรเมื่อ TypeScript ของคุณคอมไพล์เป็นแอปเนทีฟ
      </p>

      <h2>Pry ทำอะไร</h2>
      <p>
        Pry อ่านไฟล์ JSON (หรือรับ JSON จาก stdin) และเรนเดอร์เป็นต้นไม้แบบโต้ตอบที่
        สามารถนำทางได้ในหน้าต่างเนทีฟ ถ้าคุณเคยใช้ Quick Look ในตัวของ macOS
        สำหรับ JSON ลองจินตนาการแบบนั้น — แต่เร็วกว่า ค้นหาได้ และมีการนำทางด้วยคีย์บอร์ด
      </p>
      <p>
        ชุดฟีเจอร์:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>มุมมองต้นไม้</strong> — โหนดที่ยุบได้สำหรับออบเจ็กต์และอาร์เรย์ พร้อมตัวบ่งชี้ความลึกและขยาย/ยุบทั้งหมด</li>
        <li><strong>ค้นหา</strong> — ค้นหาข้อความเต็มรูปแบบในคีย์และค่าพร้อมการไฮไลท์แบบเรียลไทม์และการนำทางผลลัพธ์</li>
        <li><strong>ปุ่มลัด</strong> — ปุ่มลูกศรเพื่อนำทาง Enter เพื่อขยาย/ยุบ สแลชเพื่อค้นหา <code className="text-perry-400">⌘C</code> เพื่อคัดลอก</li>
        <li><strong>คลิปบอร์ด</strong> — คัดลอกโหนดหรือต้นไม้ย่อยเป็น JSON ที่จัดรูปแบบแล้ว</li>
        <li><strong>การระบายสี syntax</strong> — สตริงเป็นสีเขียว ตัวเลขเป็นสีส้ม บูลีนเป็นสีม่วง null เป็นสีแดง</li>
        <li><strong>แถบสถานะ</strong> — แสดงจำนวนโหนดทั้งหมด ความลึกปัจจุบัน ขนาดไฟล์ และเวลาในการแยกวิเคราะห์</li>
      </ul>

      <h2>ซอร์สโค้ด</h2>
      <p>
        Pry เขียนด้วย TypeScript มาตรฐาน ไม่มีไวยากรณ์พิเศษ ไม่มีมาโคร ไม่มี
        การสร้างโค้ดในเวลา build ใช้ API UI ของ Perry ซึ่งจัดเตรียมวิดเจ็ตเนทีฟ
        ที่คอมไพล์เป็นโค้ดเฉพาะแพลตฟอร์ม
      </p>
      <p>
        นี่คือจุดเริ่มต้น (ทำให้เรียบง่ายเพื่อความชัดเจน):
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">pry.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">App</span>, <span className="text-cyan-400">VStack</span>, <span className="text-cyan-400">TreeView</span>, <span className="text-cyan-400">SearchBar</span>, <span className="text-cyan-400">StatusBar</span>, <span className="text-cyan-400">State</span> {"}"}</p>
          <p>  <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/ui&quot;</span>;</p>
          <p><span className="text-purple-400">import</span> {"{"} <span className="text-cyan-400">readFile</span>, <span className="text-cyan-400">readStdin</span> {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&quot;perry/fs&quot;</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Read input from file arg or stdin</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">input</span> = process.argv[<span className="text-orange-400">2</span>]</p>
          <p>  ? <span className="text-yellow-400">readFile</span>(process.argv[<span className="text-orange-400">2</span>])</p>
          <p>  : <span className="text-yellow-400">readStdin</span>();</p>
          <p className="mt-3"><span className="text-purple-400">const</span> <span className="text-cyan-400">startTime</span> = Date.<span className="text-yellow-400">now</span>();</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">data</span> = JSON.<span className="text-yellow-400">parse</span>(<span className="text-cyan-400">input</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">parseMs</span> = Date.<span className="text-yellow-400">now</span>() - <span className="text-cyan-400">startTime</span>;</p>
          <p className="mt-3"><span className="text-slate-500">// Reactive state</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">searchQuery</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-green-400">&quot;&quot;</span>);</p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">matchCount</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">State</span>(<span className="text-orange-400">0</span>);</p>
          <p className="mt-3"><span className="text-slate-500">// Build the app</span></p>
          <p><span className="text-purple-400">const</span> <span className="text-cyan-400">app</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">App</span>(<span className="text-green-400">&quot;Pry&quot;</span>, {"{"}</p>
          <p>  width: <span className="text-orange-400">800</span>,</p>
          <p>  height: <span className="text-orange-400">600</span>,</p>
          <p>  minWidth: <span className="text-orange-400">400</span>,</p>
          <p>  minHeight: <span className="text-orange-400">300</span>,</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">body</span>(() =&gt; {"{"}</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-yellow-400">VStack</span>({"{"} spacing: <span className="text-orange-400">0</span> {"}"}, [</p>
          <p>    <span className="text-yellow-400">SearchBar</span>({"{"}</p>
          <p>      placeholder: <span className="text-green-400">&quot;Search keys and values...&quot;</span>,</p>
          <p>      onSearch: (<span className="text-cyan-400">q</span>) =&gt; <span className="text-cyan-400">searchQuery</span>.value = <span className="text-cyan-400">q</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">TreeView</span>(<span className="text-cyan-400">data</span>, {"{"}</p>
          <p>      collapsible: <span className="text-orange-400">true</span>,</p>
          <p>      syntaxHighlight: <span className="text-orange-400">true</span>,</p>
          <p>      searchQuery: <span className="text-cyan-400">searchQuery</span>,</p>
          <p>      onMatchCount: (<span className="text-cyan-400">n</span>) =&gt; <span className="text-cyan-400">matchCount</span>.value = <span className="text-cyan-400">n</span>,</p>
          <p>      copyOnClick: <span className="text-orange-400">true</span>,</p>
          <p>    {"}"}),</p>
          <p>    <span className="text-yellow-400">StatusBar</span>([</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>){"}"} nodes`</span>,</p>
          <p>      <span className="text-green-400">`Parsed in ${"{"}<span className="text-cyan-400">parseMs</span>{"}"}ms`</span>,</p>
          <p>      <span className="text-green-400">`${"{"}<span className="text-cyan-400">matchCount</span>.value{"}"} matches`</span>,</p>
          <p>    ]),</p>
          <p>  ]);</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;/&quot;</span>, () =&gt; <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusSearchBar</span>());</p>
          <p><span className="text-cyan-400">app</span>.<span className="text-yellow-400">registerShortcut</span>(<span className="text-green-400">&quot;Escape&quot;</span>, () =&gt; {"{"}</p>
          <p>  <span className="text-cyan-400">searchQuery</span>.value = <span className="text-green-400">&quot;&quot;</span>;</p>
          <p>  <span className="text-cyan-400">app</span>.<span className="text-yellow-400">focusTree</span>();</p>
          <p>{"}"});</p>
          <p className="mt-3"><span className="text-cyan-400">app</span>.<span className="text-yellow-400">run</span>();</p>
        </div>
      </div>
      <p>
        นั่นคือแกนหลักของแอปพลิเคชันเนทีฟ ไม่มี boilerplate ของเฟรมเวิร์ก ไม่มีการกำหนดค่า build
        ไม่มีไฟล์เฉพาะแพลตฟอร์ม ไฟล์ TypeScript ไฟล์เดียว
      </p>

      <h3>ฟังก์ชันช่วยเหลือ</h3>
      <p>
        Pry ยังมียูทิลิตี้ <code className="text-perry-400">countNodes</code> ที่
        นับโหนดทั้งหมดในต้นไม้ JSON แบบ recursive และตัวช่วย{" "}
        <code className="text-perry-400">formatBytes</code> สำหรับแสดงขนาดไฟล์ เหล่านี้
        เป็นฟังก์ชัน TypeScript มาตรฐาน — ไม่มีอะไรเฉพาะของ Perry คอมไพล์เป็น
        โค้ดเนทีฟเหมือนกับทุกอย่างอื่น
      </p>
      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">utils.ts</span>
        </div>
        <div className="space-y-1">
          <p><span className="text-purple-400">export function</span> <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">data</span>: <span className="text-cyan-400">unknown</span>): <span className="text-cyan-400">number</span> {"{"}</p>
          <p>  <span className="text-purple-400">if</span> (<span className="text-cyan-400">data</span> === <span className="text-orange-400">null</span> || <span className="text-purple-400">typeof</span> <span className="text-cyan-400">data</span> !== <span className="text-green-400">&quot;object&quot;</span>) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span>;</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">if</span> (Array.<span className="text-yellow-400">isArray</span>(<span className="text-cyan-400">data</span>)) {"{"}</p>
          <p>    <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">data</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">item</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">item</span>), <span className="text-orange-400">0</span>);</p>
          <p>  {"}"}</p>
          <p>  <span className="text-purple-400">const</span> <span className="text-cyan-400">values</span> = Object.<span className="text-yellow-400">values</span>(<span className="text-cyan-400">data</span> <span className="text-purple-400">as</span> Record&lt;<span className="text-cyan-400">string</span>, <span className="text-cyan-400">unknown</span>&gt;);</p>
          <p>  <span className="text-purple-400">return</span> <span className="text-orange-400">1</span> + <span className="text-cyan-400">values</span>.<span className="text-yellow-400">reduce</span>((<span className="text-cyan-400">sum</span>, <span className="text-cyan-400">val</span>) =&gt; <span className="text-cyan-400">sum</span> + <span className="text-yellow-400">countNodes</span>(<span className="text-cyan-400">val</span>), <span className="text-orange-400">0</span>);</p>
          <p>{"}"}</p>
        </div>
      </div>

      <h2>การคอมไพล์ Pry</h2>
      <p>
        การคอมไพล์ Pry ด้วย Perry เป็นคำสั่งเดียว ไม่ต้องมีโปรเจกต์ Xcode ไม่มีการกำหนดค่า Gradle
        ไม่มีคอนฟิก webpack แค่ชี้ Perry ไปที่ไฟล์เริ่มต้นและระบุเป้าหมายของคุณ
      </p>

      <h3>macOS (ARM64)</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target macos-arm64</p>
          <p className="text-slate-500">Parsing pry.ts...</p>
          <p className="text-slate-500">Resolving imports: perry/ui, perry/fs</p>
          <p className="text-slate-500">Compiling (cranelift, arm64)...</p>
          <p className="text-slate-500">Linking with AppKit.framework...</p>
          <p className="text-green-400">✓ Built executable: pry (48 MB)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> file pry</p>
          <p className="text-slate-300">pry: Mach-O 64-bit executable arm64</p>
          <p className="mt-3"><span className="text-slate-500">$</span> otool -L pry | head -5</p>
          <p className="text-slate-400">pry:</p>
          <p className="text-slate-400">  /System/Library/Frameworks/AppKit.framework/AppKit</p>
          <p className="text-slate-400">  /System/Library/Frameworks/Foundation.framework/Foundation</p>
          <p className="text-slate-400">  /usr/lib/libSystem.B.dylib</p>
        </div>
      </div>
      <p>
        ไบนารีมีขนาด 48 MB เพราะรวมสแต็ก UI AppKit ทั้งหมด — การเรนเดอร์ tree view
        การไฮไลท์การค้นหา การระบายสี syntax และการจัดการคีย์บอร์ด เมื่อเปรียบเทียบแล้ว แอปเดียวกัน
        ใน Electron จะมีขนาด 200+ MB แอป Perry แบบ CLI อย่างเดียวคอมไพล์ได้ 2-5 MB
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        Build สำหรับ iOS เชื่อมต่อกับ UIKit แทน AppKit Perry แมป API{" "}
        <code className="text-perry-400">TreeView</code> เดียวกันเป็น <code className="text-perry-400">UITableView</code> พร้อม
        ส่วนที่ขยายได้ <code className="text-perry-400">SearchBar</code> เป็น{" "}
        <code className="text-perry-400">UISearchBar</code> และอีเวนต์สัมผัสแทนที่อีเวนต์เมาส์
        Build สำหรับ iOS สามารถติดตั้งบนอุปกรณ์จริงและ simulator
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Build สำหรับ Android สร้างไลบรารีเนทีฟที่โหลดผ่าน JNI บรรจุลงใน APK{" "}
        <code className="text-perry-400">TreeView</code> แมปเป็น <code className="text-perry-400">RecyclerView</code> พร้อม
        view holders ที่ขยายได้ <code className="text-perry-400">SearchBar</code> แมปเป็น{" "}
        <code className="text-perry-400">EditText</code> พร้อม <code className="text-perry-400">TextWatcher</code> และ
        แถบสถานะแมปเป็น <code className="text-perry-400">TextView</code> ที่ด้านล่างของเลย์เอาต์
      </p>

      <h2>สิ่งที่เกิดขึ้นเบื้องหลัง</h2>
      <p>
        เมื่อ Perry คอมไพล์ Pry มันผ่านหลายเฟส:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>แยกวิเคราะห์</strong> — SWC แยกวิเคราะห์ซอร์ส TypeScript เป็น AST การนำเข้าจาก{" "}
          <code className="text-perry-400">perry/ui</code> และ <code className="text-perry-400">perry/fs</code> ถูก
          แก้ไขไปยังการใช้งานโมดูลในตัวของ Perry
        </li>
        <li>
          <strong>วิเคราะห์ชนิดข้อมูล</strong> — Perry แก้ไขชนิดข้อมูลทั้งหมด รวมถึงเจเนอริก{" "}
          <code className="text-perry-400">State&lt;string&gt;</code> และ{" "}
          <code className="text-perry-400">State&lt;number&gt;</code> ทำให้เป็นชนิดข้อมูลที่เป็นรูปธรรม
        </li>
        <li>
          <strong>การแก้ไขแพลตฟอร์ม</strong> — ตามแฟล็กเป้าหมาย Perry เลือก
          แบ็กเอนด์ UI ที่เหมาะสม ทุกการเรียก <code className="text-perry-400">TreeView</code>,{" "}
          <code className="text-perry-400">SearchBar</code> และ <code className="text-perry-400">Button</code>
          ถูกแก้ไขไปยังการใช้งานเฉพาะแพลตฟอร์ม
        </li>
        <li>
          <strong>สร้าง IR</strong> — Perry สร้าง intermediate representation ที่
          รวมการเรียก API เนทีฟ — การส่งข้อความ Objective-C สำหรับ macOS/iOS การเรียก JNI สำหรับ
          Android การเรียกฟังก์ชัน C สำหรับ GTK4/Win32
        </li>
        <li>
          <strong>สร้างโค้ด</strong> — Cranelift คอมไพล์ IR เป็นโค้ดเครื่องเนทีฟ
          สำหรับสถาปัตยกรรมเป้าหมาย
        </li>
        <li>
          <strong>เชื่อมต่อ</strong> — โค้ดเนทีฟถูกเชื่อมต่อกับเฟรมเวิร์กของแพลตฟอร์ม
          (AppKit, UIKit, Android NDK, GTK4 หรือ Win32) เพื่อสร้างไฟล์เรียกทำงานสุดท้าย
        </li>
      </ol>

      <h2>ไม่มี Runtime ไม่มี Web Views</h2>
      <p>
        สิ่งนี้คุ้มค่าที่จะเน้นเพราะเป็นความแตกต่างหลักระหว่าง Perry กับทุก
        แนวทาง TypeScript-เป็น-เนทีฟ อื่นๆ ไบนารี Pry ที่คอมไพล์แล้วมี:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>ไม่มีเอนจิน JavaScript</strong> — ไม่มี V8 ไม่มี Hermes ไม่มี JavaScriptCore</li>
        <li><strong>ไม่มี web views</strong> — ไม่มี Chromium ไม่มี WebKit ไม่มี WKWebView</li>
        <li><strong>ไม่มีเลเยอร์ bridge</strong> — ไม่มีข้อความที่ซีเรียลไลซ์ระหว่าง JS และเนทีฟ</li>
        <li><strong>ไม่มี runtime ของเฟรมเวิร์ก</strong> — ไม่มี React ไม่มีเอนจิน Flutter ไม่มี Dart VM</li>
      </ul>
      <p>
        ไบนารีเรียก API ของแพลตฟอร์มโดยตรง บน macOS มันเรียก{" "}
        <code className="text-perry-400">objc_msgSend</code> เพื่อโต้ตอบกับออบเจ็กต์ AppKit บน Android
        มันเรียกฟังก์ชัน JNI เพื่อสร้างและจัดการ Views เหมือนกับที่แอปเนทีฟ
        Swift หรือ Kotlin จะทำ
      </p>
      <p>
        ผลลัพธ์เชิงปฏิบัติ: Pry เปิดขึ้นทันที ไม่มีการเริ่มต้น VM ไม่มีการอุ่น JIT
        ไม่มีการแยกวิเคราะห์สคริปต์ โปรเซสเริ่ม หน้าต่างปรากฏ JSON ถูกเรนเดอร์
        การใช้หน่วยความจำเป็นเศษส่วนของสิ่งที่ Electron เทียบเท่าจะใช้
      </p>

      <h2>ประสบการณ์ของนักพัฒนา</h2>
      <p>
        การสร้าง Pry รู้สึกคล้ายคลึงกับการสร้างแอปพลิเคชัน TypeScript ทั่วไปอย่างน่าทึ่ง
        เวิร์กโฟลว์คือ:
      </p>
      <ol className="list-decimal list-inside">
        <li>เขียน TypeScript ในเอดิเตอร์ของคุณ (VS Code, Zed, Neovim หรืออะไรก็ตามที่คุณชอบ)</li>
        <li>รัน <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>รัน <code className="text-perry-400">./pry test.json</code></li>
        <li>ทำซ้ำ</li>
      </ol>
      <p>
        ไม่ต้องกำหนดค่าโปรเจกต์ Xcode ไม่ต้องติดตั้ง Android Studio ไม่มี build Gradle ที่ใช้เวลา
        45 วินาที ตัวคอมไพเลอร์ Perry เองก็เร็ว — การแยกวิเคราะห์และคอมไพล์ Pry ใช้เวลาไม่กี่
        วินาที และเรากำลังทำงานเพื่อให้มันเร็วขึ้น
      </p>
      <p>
        TypeScript ที่คุณเขียนเป็น TypeScript มาตรฐาน การตรวจสอบชนิดข้อมูลของเอดิเตอร์
        autocomplete และเครื่องมือ refactoring ทำงานได้ทั้งหมด คุณสามารถแยกฟังก์ชัน สร้างโมดูล
        ใช้เจเนอริก — รูปแบบ TypeScript ทั้งหมดที่คุณรู้จักอยู่แล้ว
      </p>

      <h2>สิ่งที่เราเรียนรู้</h2>
      <p>
        การสร้าง Pry สอนเราหลายอย่างเกี่ยวกับสิ่งที่ API UI ของ Perry ต้องรองรับ บทเรียนบางอย่าง:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Tree views มีความซับซ้อน</strong> การขยาย การยุบ การไฮไลท์การค้นหา
          การนำทางด้วยคีย์บอร์ด และการรวมเข้ากับคลิปบอร์ดต้องประสานงานกัน วิดเจ็ต{" "}
          <code className="text-perry-400">TreeView</code> ของ Perry จัดการสิ่งนี้ภายใน แต่เราต้อง
          มั่นใจว่าการใช้งานเนทีฟสอดคล้องกันข้ามทั้งสามแพลตฟอร์ม
        </li>
        <li>
          <strong>ปุ่มลัดต้องเป็นไปตามอนุสัญญาของแพลตฟอร์ม</strong> บน macOS คือ{" "}
          <code className="text-perry-400">⌘C</code> เพื่อคัดลอก บน Linux และ Android คือ{" "}
          <code className="text-perry-400">Ctrl+C</code> ระบบปุ่มลัดของ Perry ทำ abstraction สิ่งนี้
          แต่ต้องมีการใช้งานอย่างระมัดระวังเพื่อให้ถูกต้อง
        </li>
        <li>
          <strong>แถบสถานะนั้นซับซ้อนอย่างน่าประหลาดใจ</strong> แต่ละแพลตฟอร์มมีอนุสัญญาที่แตกต่างกัน
          สำหรับตำแหน่งและวิธีการแสดงข้อมูลสถานะ AppKit ใช้แถบด้านล่างของหน้าต่าง
          UIKit ใช้ toolbar Android ใช้ view ด้านล่างในเลย์เอาต์{" "}
          <code className="text-perry-400">StatusBar</code> ของ Perry แมปไปยังแต่ละแบบอย่างถูกต้อง
        </li>
        <li>
          <strong>การรองรับ stdin ต้องมีการรับรู้แพลตฟอร์ม</strong> บน macOS และ Linux การอ่าน
          จาก stdin ทำได้ง่าย บน iOS และ Android &quot;stdin&quot; ไม่มีอยู่จริง
          ในแบบเดียวกัน ดังนั้น Pry ใช้การเลือกไฟล์บนแพลตฟอร์มมือถือแทน{" "}
          <code className="text-perry-400">readStdin</code> ของ Perry จัดการสิ่งนี้อย่างโปร่งใส
        </li>
      </ul>

      <h2>ประสิทธิภาพ</h2>
      <p>
        Pry จัดการไฟล์ JSON ขนาดใหญ่ได้สบาย ในการทดสอบของเรา:
      </p>
      <ul className="list-disc list-inside">
        <li>ไฟล์ JSON ขนาด 1 MB (10,000+ โหนด) แยกวิเคราะห์และเรนเดอร์ในเวลาน้อยกว่า 50 ms</li>
        <li>ไฟล์ JSON ขนาด 10 MB เรนเดอร์ในเวลาน้อยกว่า 200 ms</li>
        <li>การค้นหาใน 10,000 โหนดส่งคืนผลลัพธ์ขณะที่คุณพิมพ์ โดยไม่มีความล่าช้าที่เห็นได้</li>
        <li>การใช้หน่วยความจำอยู่ต่ำกว่า 50 MB แม้สำหรับไฟล์ขนาดใหญ่</li>
      </ul>
      <p>
        นี่คือข้อได้เปรียบของการคอมไพล์เนทีฟ การแยกวิเคราะห์ JSON ใน Perry ถูกคอมไพล์เป็น
        ลูปเนทีฟที่แน่นโดยไม่มีการหยุด GC การเรนเดอร์ต้นไม้ใช้ list views แบบ virtualized
        ของแพลตฟอร์มเอง (NSOutlineView, UITableView, RecyclerView) ซึ่งผ่านการทดสอบ
        ด้านประสิทธิภาพมาอย่างดี
      </p>

      <h2>ซอร์สโค้ดและดาวน์โหลด</h2>
      <p>
        Pry เป็นโอเพนซอร์ส คุณสามารถเรียกดูซอร์สทั้งหมด สร้างมันเอง หรือแค่ดู
        โค้ดเพื่อเข้าใจว่าแอป UI เนทีฟ Perry มีโครงสร้างอย่างไร
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/nicktrebes/perry-pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            รีโป GitHub
          </a>{" "}
          — ซอร์สโค้ดทั้งหมดและคำแนะนำการ build
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            หน้า showcase
          </Link>{" "}
          — ภาพหน้าจอ รายการฟีเจอร์ และรายละเอียดแพลตฟอร์ม
        </li>
      </ul>
      <p>
        ถ้าคุณกำลังสร้างอะไรด้วย Perry เราอยากรู้ เปิด
        issue บน{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          รีโป Perry
        </a>{" "}
        หรือเริ่มการสนทนา เรากำลังสร้าง Perry แบบเปิดเผยและข้อเสนอแนะจากผู้ใช้จริง
        ที่สร้างแอปจริงนั้นมีค่ามาก
      </p>
    </>
  );
}
