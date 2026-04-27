import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Pry là một trình xem JSON native được xây dựng hoàn toàn bằng TypeScript và biên dịch với Perry. Đây
        không phải là một bản demo công nghệ — đây là một công cụ thực sự mà chúng tôi sử dụng hàng ngày để
        kiểm tra phản hồi API, tệp cấu hình, và data dump. Bài viết này hướng dẫn cách nó được xây dựng,
        cách biên dịch, và trải nghiệm phát triển ra sao khi TypeScript được biên dịch thành ứng dụng native.
      </p>

      <h2>Pry làm gì</h2>
      <p>
        Pry đọc một tệp JSON (hoặc nhận JSON từ stdin) và render nó như một cây tương tác, có thể điều hướng
        trong một cửa sổ native. Nếu bạn đã dùng Quick Look tích hợp của macOS cho JSON, hãy tưởng tượng
        như vậy — nhưng nhanh hơn, có thể tìm kiếm, và với điều hướng bằng bàn phím.
      </p>
      <p>
        Bộ tính năng:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Chế độ xem cây</strong> — các nút có thể thu gọn cho đối tượng và mảng, với chỉ báo độ sâu và mở rộng/thu gọn tất cả</li>
        <li><strong>Tìm kiếm</strong> — tìm kiếm toàn văn bản trên khóa và giá trị với highlight thời gian thực và điều hướng kết quả</li>
        <li><strong>Phím tắt</strong> — phím mũi tên để điều hướng, enter để mở rộng/thu gọn, dấu gạch chéo để tìm kiếm, <code className="text-perry-400">⌘C</code> để sao chép</li>
        <li><strong>Clipboard</strong> — sao chép bất kỳ nút hoặc cây con nào dưới dạng JSON đã định dạng</li>
        <li><strong>Tô màu cú pháp</strong> — chuỗi màu xanh lá, số màu cam, boolean màu tím, null màu đỏ</li>
        <li><strong>Thanh trạng thái</strong> — hiển thị tổng số nút, độ sâu hiện tại, kích thước tệp, và thời gian phân tích</li>
      </ul>

      <h2>Mã nguồn</h2>
      <p>
        Pry được viết bằng TypeScript tiêu chuẩn. Không có cú pháp đặc biệt, không có macro, không có
        sinh mã tại thời điểm build. Nó sử dụng API UI của Perry, cung cấp các widget native biên dịch
        thành mã dành riêng cho từng nền tảng.
      </p>
      <p>
        Đây là điểm khởi đầu (đã đơn giản hóa cho rõ ràng):
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
        Đó là cốt lõi của một ứng dụng native. Không có boilerplate framework, không có cấu hình build,
        không có tệp dành riêng cho nền tảng. Một tệp TypeScript.
      </p>

      <h3>Các hàm trợ giúp</h3>
      <p>
        Pry cũng bao gồm tiện ích <code className="text-perry-400">countNodes</code> đệ quy đếm tất cả
        các nút trong cây JSON, và hàm trợ giúp <code className="text-perry-400">formatBytes</code> để
        hiển thị kích thước tệp. Đây là các hàm TypeScript tiêu chuẩn — không có gì đặc thù Perry.
        Chúng được biên dịch thành mã native giống như mọi thứ khác.
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

      <h2>Biên dịch Pry</h2>
      <p>
        Biên dịch Pry với Perry là một lệnh duy nhất. Không cần dự án Xcode, không cần cấu hình Gradle,
        không cần cấu hình webpack. Chỉ cần trỏ Perry tới tệp đầu vào và chỉ định target.
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
        Binary có kích thước 48 MB vì nó bao gồm toàn bộ stack UI AppKit — render chế độ xem cây,
        highlight tìm kiếm, tô màu cú pháp, và xử lý bàn phím. Để so sánh, cùng ứng dụng trong
        Electron sẽ là 200+ MB. Một ứng dụng Perry chỉ CLI biên dịch thành 2–5 MB.
      </p>

      <h3>iOS</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target ios-arm64</p>
          <p className="text-green-400">✓ Built executable: pry (52 MB)</p>
        </div>
      </div>
      <p>
        Bản build iOS liên kết với UIKit thay vì AppKit. Perry ánh xạ cùng API{" "}
        <code className="text-perry-400">TreeView</code> tới <code className="text-perry-400">UITableView</code> với
        các section có thể mở rộng, <code className="text-perry-400">SearchBar</code> tới{" "}
        <code className="text-perry-400">UISearchBar</code>, và sự kiện chạm thay thế sự kiện chuột.
        Bản build iOS có thể triển khai lên thiết bị vật lý và simulator.
      </p>

      <h3>Android</h3>
      <div className="code-block my-8">
        <div className="space-y-1">
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> build pry.ts --target android-arm64</p>
          <p className="text-green-400">✓ Built: pry.apk</p>
        </div>
      </div>
      <p>
        Bản build Android sinh một thư viện native được nạp qua JNI, đóng gói thành APK.{" "}
        <code className="text-perry-400">TreeView</code> ánh xạ tới <code className="text-perry-400">RecyclerView</code> với
        view holder có thể mở rộng, <code className="text-perry-400">SearchBar</code> ánh xạ tới{" "}
        <code className="text-perry-400">EditText</code> với <code className="text-perry-400">TextWatcher</code>, và
        thanh trạng thái ánh xạ tới <code className="text-perry-400">TextView</code> ở cuối layout.
      </p>

      <h2>Chuyện gì xảy ra bên trong</h2>
      <p>
        Khi Perry biên dịch Pry, nó trải qua nhiều giai đoạn:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Phân tích cú pháp</strong> — SWC phân tích mã nguồn TypeScript thành AST. Import từ{" "}
          <code className="text-perry-400">perry/ui</code> và <code className="text-perry-400">perry/fs</code> được
          giải quyết tới các triển khai module tích hợp của Perry.
        </li>
        <li>
          <strong>Phân tích kiểu</strong> — Perry giải quyết tất cả các kiểu, bao gồm generic{" "}
          <code className="text-perry-400">State&lt;string&gt;</code> và{" "}
          <code className="text-perry-400">State&lt;number&gt;</code>, đơn hình hóa chúng thành
          các kiểu cụ thể.
        </li>
        <li>
          <strong>Giải quyết nền tảng</strong> — Dựa trên cờ target, Perry chọn backend UI phù hợp.
          Mỗi lệnh gọi <code className="text-perry-400">TreeView</code>,{" "}
          <code className="text-perry-400">SearchBar</code>, và <code className="text-perry-400">Button</code> được
          giải quyết tới triển khai dành riêng cho nền tảng.
        </li>
        <li>
          <strong>Sinh IR</strong> — Perry sinh biểu diễn trung gian bao gồm các lệnh gọi API native
          — gửi tin nhắn Objective-C cho macOS/iOS, lệnh gọi JNI cho Android, lệnh gọi hàm C cho GTK4/Win32.
        </li>
        <li>
          <strong>Sinh mã</strong> — Cranelift biên dịch IR thành mã máy native cho kiến trúc đích.
        </li>
        <li>
          <strong>Liên kết</strong> — Mã native được liên kết với các framework nền tảng (AppKit, UIKit,
          Android NDK, GTK4, hoặc Win32) để tạo ra tệp thực thi cuối cùng.
        </li>
      </ol>

      <h2>Không Runtime, Không Web View</h2>
      <p>
        Điều này đáng nhấn mạnh vì đó là sự khác biệt cốt lõi giữa Perry và mọi cách tiếp cận
        TypeScript-to-native khác. Binary Pry đã biên dịch có:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Không JavaScript engine</strong> — không V8, không Hermes, không JavaScriptCore</li>
        <li><strong>Không web view</strong> — không Chromium, không WebKit, không WKWebView</li>
        <li><strong>Không lớp bridge</strong> — không tin nhắn tuần tự hóa giữa JS và native</li>
        <li><strong>Không framework runtime</strong> — không React, không Flutter engine, không Dart VM</li>
      </ul>
      <p>
        Binary gọi trực tiếp API nền tảng. Trên macOS, nó gọi{" "}
        <code className="text-perry-400">objc_msgSend</code> để tương tác với các đối tượng AppKit. Trên Android,
        nó gọi các hàm JNI để tạo và thao tác Views. Đó chính xác là điều một ứng dụng Swift hoặc
        Kotlin native sẽ làm.
      </p>
      <p>
        Hệ quả thực tế: Pry khởi chạy ngay lập tức. Không có khởi động VM, không có khởi động JIT,
        không có phân tích script. Tiến trình khởi động, cửa sổ xuất hiện, JSON được render.
        Sử dụng bộ nhớ chỉ là một phần nhỏ so với Electron tương đương.
      </p>

      <h2>Trải nghiệm phát triển</h2>
      <p>
        Xây dựng Pry cảm thấy tương tự đáng ngạc nhiên với xây dựng bất kỳ ứng dụng TypeScript nào.
        Quy trình làm việc là:
      </p>
      <ol className="list-decimal list-inside">
        <li>Viết TypeScript trong trình soạn thảo (VS Code, Zed, Neovim, tùy bạn chọn)</li>
        <li>Chạy <code className="text-perry-400">perry compile pry.ts</code></li>
        <li>Thực thi <code className="text-perry-400">./pry test.json</code></li>
        <li>Lặp lại</li>
      </ol>
      <p>
        Không cần cấu hình dự án Xcode. Không cần cài Android Studio. Không có build Gradle mất 45 giây.
        Trình biên dịch Perry rất nhanh — phân tích và biên dịch Pry mất vài giây, và chúng tôi đang
        tích cực làm cho nó nhanh hơn.
      </p>
      <p>
        TypeScript bạn viết là TypeScript tiêu chuẩn. Kiểm tra kiểu, autocomplete, và công cụ
        refactoring của trình soạn thảo đều hoạt động. Bạn có thể tách hàm, tạo module, sử dụng
        generics — tất cả các pattern TypeScript bạn đã biết.
      </p>

      <h2>Những gì chúng tôi đã học</h2>
      <p>
        Xây dựng Pry đã dạy chúng tôi nhiều về những gì API UI của Perry cần hỗ trợ. Một số bài học:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Chế độ xem cây rất phức tạp.</strong> Mở rộng, thu gọn, highlight tìm kiếm,
          điều hướng bàn phím, và tích hợp clipboard đều cần phối hợp. Widget{" "}
          <code className="text-perry-400">TreeView</code> của Perry xử lý nội bộ điều này, nhưng chúng tôi
          phải đảm bảo triển khai native nhất quán trên cả ba nền tảng.
        </li>
        <li>
          <strong>Phím tắt cần tuân theo quy ước nền tảng.</strong> Trên macOS, đó là{" "}
          <code className="text-perry-400">⌘C</code> để sao chép. Trên Linux và Android, đó là{" "}
          <code className="text-perry-400">Ctrl+C</code>. Hệ thống phím tắt của Perry trừu tượng hóa điều này,
          nhưng cần triển khai cẩn thận để làm đúng.
        </li>
        <li>
          <strong>Thanh trạng thái phức tạp một cách đáng ngạc nhiên.</strong> Mỗi nền tảng có quy ước
          khác nhau về nơi và cách hiển thị thông tin trạng thái. AppKit sử dụng thanh dưới cùng của cửa sổ,
          UIKit sử dụng toolbar, Android sử dụng view ở cuối layout. Widget{" "}
          <code className="text-perry-400">StatusBar</code> của Perry ánh xạ đúng cho từng nền tảng.
        </li>
        <li>
          <strong>Hỗ trợ stdin yêu cầu nhận biết nền tảng.</strong> Trên macOS và Linux, đọc từ stdin
          rất đơn giản. Trên iOS và Android, &quot;stdin&quot; không thực sự tồn tại theo cách tương tự,
          nên Pry sử dụng chọn tệp trên nền tảng di động.{" "}
          <code className="text-perry-400">readStdin</code> của Perry xử lý điều này một cách trong suốt.
        </li>
      </ul>

      <h2>Hiệu năng</h2>
      <p>
        Pry xử lý tệp JSON lớn một cách thoải mái. Trong thử nghiệm:
      </p>
      <ul className="list-disc list-inside">
        <li>Tệp JSON 1 MB (hơn 10.000 nút) phân tích và render trong dưới 50 ms</li>
        <li>Tệp JSON 10 MB render trong dưới 200 ms</li>
        <li>Tìm kiếm trên 10.000 nút trả kết quả khi bạn gõ, không có lag nhìn thấy được</li>
        <li>Sử dụng bộ nhớ dưới 50 MB ngay cả với tệp lớn</li>
      </ul>
      <p>
        Đây là lợi thế của biên dịch native. Phân tích JSON trong Perry được biên dịch thành
        vòng lặp native chặt chẽ không có tạm dừng GC. Render cây sử dụng chế độ xem danh sách
        ảo hóa của nền tảng (NSOutlineView, UITableView, RecyclerView), đã được kiểm chứng
        về hiệu năng.
      </p>

      <h2>Mã nguồn và tải về</h2>
      <p>
        Pry là mã nguồn mở. Bạn có thể duyệt toàn bộ mã nguồn, tự build, hoặc chỉ xem mã
        để hiểu cấu trúc của một ứng dụng UI native Perry.
      </p>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://github.com/perryts/pry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
            Repo GitHub
          </a>{" "}
          — mã nguồn đầy đủ và hướng dẫn build
        </li>
        <li>
          <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">
            Trang showcase
          </Link>{" "}
          — ảnh chụp màn hình, danh sách tính năng, và chi tiết nền tảng
        </li>
      </ul>
      <p>
        Nếu bạn đang xây dựng thứ gì đó với Perry, chúng tôi muốn nghe về nó. Mở một issue trên{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          repo Perry
        </a>{" "}
        hoặc bắt đầu thảo luận. Chúng tôi đang xây dựng Perry một cách công khai và phản hồi từ
        người dùng thực xây dựng ứng dụng thực là vô giá.
      </p>
    </>
  );
}
