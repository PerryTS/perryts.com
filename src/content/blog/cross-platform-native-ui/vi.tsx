import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Một trong những mục tiêu tham vọng nhất của Perry là cung cấp các ứng dụng GUI thực sự gốc
        từ một codebase TypeScript duy nhất. Không phải web view bọc trong một vỏ native. Không phải
        một engine render tùy chỉnh vẽ pixel riêng. Các widget native thực sự, được render bởi framework
        UI riêng của từng nền tảng, biên dịch từ TypeScript tại thời điểm build.
      </p>
      <p>
        Bài viết này giải thích cách nó hoạt động — kiến trúc, ánh xạ nền tảng, các đánh đổi,
        và chúng tôi đang ở đâu hiện nay.
      </p>

      <h2>Vấn đề với các cách tiếp cận hiện tại</h2>
      <p>
        Phát triển GUI đa nền tảng đã là một bài toán khó trong nhiều thập kỷ. Mỗi framework lớn
        đã đưa ra những bộ thỏa hiệp khác nhau:
      </p>

      <h3>Electron / Tauri (Dựa trên Web)</h3>
      <p>
        Electron đóng gói Chromium và Node.js, cho bạn một trình duyệt web làm vỏ ứng dụng.
        Bạn có toàn quyền truy cập nền tảng web, nhưng ứng dụng &quot;native&quot; của bạn là bản
        tải 150+ MB sử dụng hàng trăm megabyte RAM chỉ để hiển thị một cửa sổ. Tauri thay thế
        Chromium bằng web view của hệ điều hành, giảm kích thước đáng kể, nhưng UI của bạn vẫn là
        HTML/CSS render trong web view — không phải widget native.
      </p>

      <h3>React Native (Dựa trên Bridge)</h3>
      <p>
        React Native chạy JavaScript trong JS engine (Hermes hoặc V8) và bridge tới widget native
        thông qua hàng đợi tin nhắn tuần tự hóa. Bạn có widget native thực, nhưng bridge thêm
        độ trễ, đặc biệt cho gesture và animation. Các tương tác phức tạp yêu cầu phải viết
        mã native (Swift/Kotlin), phá vỡ lời hứa một codebase duy nhất.
      </p>

      <h3>Flutter (Renderer tùy chỉnh)</h3>
      <p>
        Flutter biên dịch Dart thành mã gốc và vẽ mọi thứ bằng engine render dựa trên Skia.
        Hiệu năng xuất sắc, nhưng widget của bạn không phải native — chúng là bản sao pixel-perfect.
        Điều này có nghĩa các quy ước nền tảng (vật lý cuộn, chọn văn bản, hành vi trợ năng) phải
        được tái triển khai thay vì được kế thừa. Và trên desktop, sự khác biệt càng rõ ràng hơn.
      </p>

      <h3>KMP + Compose Multiplatform (Native một phần)</h3>
      <p>
        Kotlin Multiplatform biên dịch thành JVM trên Android và native trên iOS, nhưng UI chia sẻ
        thông qua Compose Multiplatform sử dụng renderer dựa trên Skia tùy chỉnh — cùng đánh đổi
        như Flutter. Để có UI thực sự native, bạn phải quay lại viết mã riêng cho từng nền tảng.
      </p>

      <h2>Cách tiếp cận của Perry: Biên dịch thành Toolkit Native</h2>
      <p>
        Perry áp dụng một cách tiếp cận hoàn toàn khác. Thay vì chạy mã trong runtime và bridge
        tới widget native, hoặc vẽ pixel tùy chỉnh, Perry biên dịch mã UI TypeScript trực tiếp
        thành các lệnh gọi tới toolkit native của từng nền tảng tại thời điểm build.
      </p>
      <p>
        Điểm khác biệt then chốt: <strong>không có lớp runtime nào giữa mã của bạn và SDK nền tảng.</strong>{" "}
        Binary đã biên dịch gọi trực tiếp AppKit, UIKit, Android Views, GTK4, hoặc Win32, chính xác
        như một ứng dụng viết bằng Swift, Kotlin, hoặc C++ sẽ làm.
      </p>

      <h2>API UI Thống nhất</h2>
      <p>
        Perry cung cấp một API TypeScript chung để xây dựng giao diện người dùng. API này có chủ đích
        ở mức cao — bạn mô tả UI nên chứa gì và hành xử như thế nào, và Perry ánh xạ nó tới
        các cấu trúc native phù hợp.
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
        Cùng một đoạn mã này biên dịch thành UI native trên cả sáu nền tảng. Không cần <code className="text-perry-400">#ifdef</code>,
        không cần kiểm tra nền tảng, không cần import có điều kiện.
      </p>

      <h2>Chi tiết ánh xạ nền tảng</h2>
      <p>
        Đây là cách Perry ánh xạ API thống nhất tới framework native của từng nền tảng:
      </p>

      <h3>macOS — AppKit</h3>
      <p>
        Trên macOS, Perry sinh mã tạo và quản lý các đối tượng AppKit trực tiếp.
        <code className="text-perry-400">App</code> trở thành <code className="text-perry-400">NSApplication</code> với
        một <code className="text-perry-400">NSWindow</code>.{" "}
        <code className="text-perry-400">Text</code> trở thành <code className="text-perry-400">NSTextField</code> (với editing bị tắt).{" "}
        <code className="text-perry-400">Button</code> trở thành <code className="text-perry-400">NSButton</code> với pattern target-action
        được nối tới callback của bạn.{" "}
        <code className="text-perry-400">VStack</code> trở thành <code className="text-perry-400">NSStackView</code> với hướng dọc.
        Layout sử dụng Auto Layout constraints.
      </p>
      <p>
        Binary đã biên dịch liên kết với framework AppKit và gọi trực tiếp các hàm Objective-C runtime.
        Đó chính xác là điều mà Swift biên dịch bởi Xcode sẽ làm.
      </p>

      <h3>iOS &amp; iPadOS — UIKit</h3>
      <p>
        Trên iOS, ánh xạ tương tự nhưng nhắm tới UIKit.{" "}
        <code className="text-perry-400">App</code> trở thành <code className="text-perry-400">UIApplication</code> với
        một <code className="text-perry-400">UIWindow</code> và root <code className="text-perry-400">UIViewController</code>.{" "}
        <code className="text-perry-400">Text</code> ánh xạ tới <code className="text-perry-400">UILabel</code>.{" "}
        <code className="text-perry-400">Button</code> ánh xạ tới <code className="text-perry-400">UIButton</code>.{" "}
        Layout sử dụng <code className="text-perry-400">UIStackView</code> và Auto Layout.
        Sự kiện chạm được xử lý thông qua chuỗi responder của UIKit.
      </p>

      <h3>Android — JNI + Views</h3>
      <p>
        Trên Android, Perry sinh một thư viện native được nạp qua JNI (Java Native Interface).{" "}
        <code className="text-perry-400">App</code> ánh xạ tới <code className="text-perry-400">Activity</code>.{" "}
        <code className="text-perry-400">Text</code> trở thành <code className="text-perry-400">TextView</code>.{" "}
        <code className="text-perry-400">Button</code> trở thành <code className="text-perry-400">android.widget.Button</code> với
        một <code className="text-perry-400">OnClickListener</code>.{" "}
        <code className="text-perry-400">VStack</code> ánh xạ tới <code className="text-perry-400">LinearLayout</code> dọc.
        Mã native gọi lại vào framework Android thông qua JNI, tạo và thao tác các view Android thực.
      </p>

      <h3>Linux — GTK4</h3>
      <p>
        Trên Linux, Perry nhắm tới GTK4.{" "}
        <code className="text-perry-400">App</code> trở thành <code className="text-perry-400">GtkApplication</code> với
        một <code className="text-perry-400">GtkApplicationWindow</code>.{" "}
        <code className="text-perry-400">Text</code> ánh xạ tới <code className="text-perry-400">GtkLabel</code>.{" "}
        <code className="text-perry-400">Button</code> ánh xạ tới <code className="text-perry-400">GtkButton</code> với
        một signal handler.{" "}
        <code className="text-perry-400">VStack</code> ánh xạ tới <code className="text-perry-400">GtkBox</code> với hướng dọc.
        CSS theming của GTK có nghĩa là ứng dụng tự động tuân theo theme desktop của người dùng.
      </p>

      <h3>Windows — Win32</h3>
      <p>
        Trên Windows, Perry sinh các lệnh gọi Win32 API.{" "}
        <code className="text-perry-400">App</code> tạo một window class, đăng ký nó, và chạy vòng lặp tin nhắn.{" "}
        <code className="text-perry-400">Button</code> trở thành control <code className="text-perry-400">BUTTON</code>
        được tạo bằng <code className="text-perry-400">CreateWindowEx</code>.{" "}
        <code className="text-perry-400">Text</code> ánh xạ tới control <code className="text-perry-400">STATIC</code>.
        Sự kiện được xử lý thông qua message pump Win32 (<code className="text-perry-400">WM_COMMAND</code>,{" "}
        <code className="text-perry-400">WM_NOTIFY</code>, v.v.).
      </p>

      <h2>Quản lý trạng thái</h2>
      <p>
        Primitive <code className="text-perry-400">State&lt;T&gt;</code> của Perry cung cấp quản lý trạng thái
        phản ứng biên dịch thành cơ chế cập nhật native của nền tảng. Khi một giá trị state thay đổi,
        Perry kích hoạt cập nhật UI thông qua hệ thống vô hiệu hóa riêng của nền tảng
        — <code className="text-perry-400">setNeedsDisplay</code> trên macOS/iOS,{" "}
        <code className="text-perry-400">invalidate()</code> trên Android,{" "}
        <code className="text-perry-400">gtk_widget_queue_draw</code> trên Linux.
      </p>
      <p>
        Không có virtual DOM diffing, không có bước reconciliation, không có tuần tự hóa. Thay đổi state
        lan truyền trực tiếp tới widget native hiển thị giá trị.
      </p>

      <h2>Tại sao không dùng cú pháp SwiftUI / Jetpack Compose?</h2>
      <p>
        Bạn có thể thắc mắc tại sao Perry không sử dụng cú pháp khai báo tương tự SwiftUI hoặc
        Jetpack Compose. Câu trả lời mang tính thực dụng: Perry biên dịch TypeScript, và TypeScript
        có các idiom riêng. Thay vì phát minh một DSL trông xa lạ với developer TypeScript, Perry
        sử dụng API kiểu builder cảm thấy tự nhiên trong TypeScript — constructor, gọi phương thức,
        callback, và closure. Đó chính là các pattern bạn đã sử dụng khi làm việc với Express,
        React hooks, hoặc bất kỳ thư viện TypeScript nào khác.
      </p>

      <h2>Có gì sẵn sàng hôm nay</h2>
      <p>
        Tất cả sáu backend nền tảng đều đã được triển khai và ổn định. Bộ widget hiện tại bao gồm:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Layout</strong> — VStack, HStack, Spacer, ScrollView, Divider</li>
        <li><strong>Hiển thị</strong> — Text, Image</li>
        <li><strong>Nhập liệu</strong> — Button, TextField, Toggle, Slider</li>
        <li><strong>Điều hướng</strong> — NavigationView, TabView, List</li>
        <li><strong>Container</strong> — TreeView, SearchBar, StatusBar</li>
        <li><strong>Trạng thái</strong> — State&lt;T&gt; cho cập nhật phản ứng</li>
      </ul>

      <h2>Sắp tới</h2>
      <p>
        Chúng tôi đang tích cực mở rộng thư viện widget. Tiếp theo:
      </p>
      <ul className="list-disc list-inside">
        <li><code className="text-perry-400">SecureField</code> — nhập mật khẩu với secure text entry native của nền tảng</li>
        <li><code className="text-perry-400">ProgressView</code> — chỉ báo tiến trình xác định và không xác định</li>
        <li><code className="text-perry-400">Alert</code> — hộp thoại cảnh báo native với nút và trường văn bản</li>
        <li><code className="text-perry-400">DatePicker</code> — chọn ngày/giờ native của nền tảng</li>
        <li><code className="text-perry-400">Menu</code> — thanh menu native và menu ngữ cảnh</li>
      </ul>
      <p>
        Mục tiêu là tương đương đầy đủ framework GUI trên tất cả nền tảng — mọi widget, layout,
        gesture, và animation đều có sẵn ở mọi nơi. Xem{" "}
        <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">lộ trình</Link> để có
        bức tranh toàn cảnh.
      </p>

      <h2>Dùng thử</h2>
      <p>
        Cách tốt nhất để hiểu UI native của Perry là nhìn nó hoạt động.{" "}
        <Link href="/showcase/pry" className="text-perry-400 hover:text-perry-300">Pry</Link> là một
        trình xem JSON native được xây dựng hoàn toàn bằng TypeScript với Perry — một ứng dụng thực
        với điều hướng dạng cây, tìm kiếm, và phím tắt, biên dịch thành binary native trên macOS,
        iOS, và Android. Đọc{" "}
        <Link href="/blog/building-pry" className="text-perry-400 hover:text-perry-300">hướng dẫn chi tiết</Link>{" "}
        về cách nó được xây dựng.
      </p>
    </>
  );
}
