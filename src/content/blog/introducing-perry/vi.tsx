import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Chúng tôi vui mừng giới thiệu Perry — một trình biên dịch TypeScript gốc được viết bằng Rust,
        biên dịch TypeScript của bạn trực tiếp thành các tệp thực thi độc lập. Không cần Node.js runtime,
        không cần Electron wrapper, không có sự thỏa hiệp. Chỉ có mã nguồn của bạn, được biên dịch thành
        tệp nhị phân gốc khởi động ngay lập tức và chạy được mọi nơi.
      </p>
      <p>
        Perry đại diện cho một sự tư duy lại căn bản về những gì TypeScript có thể làm được. Thay vì
        coi nó như một tập cha của JavaScript phải chạy qua một JS engine, Perry coi TypeScript như
        một ngôn ngữ hệ thống — một ngôn ngữ tình cờ có cú pháp mà hàng triệu nhà phát triển đã
        biết và yêu thích.
      </p>

      <h2>Tại sao chúng tôi xây dựng Perry</h2>
      <p>
        TypeScript đã trở thành ngôn ngữ chung của phát triển phần mềm hiện đại. Đây là ngôn ngữ
        đằng sau hầu hết các frontend web, một phần ngày càng lớn của backend, và ngày càng được
        lựa chọn cho công cụ, scripting và tự động hóa. Nhưng nó luôn mang theo một hạn chế cơ bản:
        nó biên dịch sang JavaScript, và JavaScript yêu cầu một runtime.
      </p>
      <p>
        Runtime đó — dù là Node.js, Deno, hay Bun — đi kèm với những đánh đổi.
        Thời gian khởi động lạnh được đo bằng hàng chục hoặc hàng trăm mili giây. Chi phí bộ nhớ
        từ trình biên dịch JIT và bộ thu gom rác. Bản phân phối nhị phân hoặc phải đóng gói toàn bộ
        runtime hoặc yêu cầu người dùng cài đặt một runtime. Và đối với ứng dụng GUI, lựa chọn duy nhất
        là Electron, đi kèm cả một trình duyệt Chromium với ứng dụng của bạn.
      </p>
      <p>
        Chúng tôi đã tự hỏi: nếu TypeScript không phải đi qua JavaScript thì sao? Nếu bạn có thể
        biên dịch nó trực tiếp thành mã máy gốc, giống như cách bạn biên dịch Rust, Go, hoặc C++
        thì sao?
      </p>

      <h2>Perry hoạt động như thế nào</h2>
      <p>
        Pipeline biên dịch của Perry có ba giai đoạn:
      </p>
      <ol className="list-decimal list-inside">
        <li>
          <strong>Phân tích cú pháp</strong> — Perry sử dụng SWC (trình phân tích cú pháp TypeScript/JavaScript
          dựa trên Rust) để phân tích mã nguồn TypeScript thành AST. SWC là cùng trình phân tích được sử dụng
          bởi Next.js, và nó cực kỳ nhanh.
        </li>
        <li>
          <strong>Biên dịch hướng kiểu</strong> — Perry duyệt AST với đầy đủ thông tin kiểu. Không giống
          một JS engine phải xử lý kiểu động tại runtime, Perry biết mọi kiểu tại thời điểm biên dịch.
          Điều này cho phép đơn hình hóa generics, gọi phương thức dispatch tĩnh, và tối ưu bố cục bộ nhớ trực tiếp.
        </li>
        <li>
          <strong>Sinh mã</strong> — Perry sinh mã máy gốc sử dụng Cranelift, cùng bộ sinh mã được sử dụng
          bởi Wasmtime và một số phần của Firefox JIT. Cranelift tạo ra mã gốc hiệu quả cho x86_64 và ARM64.
        </li>
      </ol>
      <p>
        Kết quả là một tệp thực thi độc lập — thường 2–5 MB cho một công cụ CLI — khởi động ngay lập tức
        với thời gian khởi động bằng không.
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

      <h2>Các tính năng TypeScript được hỗ trợ</h2>
      <p>
        Perry hỗ trợ một tập con rộng và đang phát triển của TypeScript. Mục tiêu là tương thích đầy đủ
        với ngôn ngữ theo cách các nhà phát triển thực sự sử dụng. Hiện tại, điều đó bao gồm:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Tất cả kiểu nguyên thủy</strong> — string, number, boolean, null, undefined, bigint, symbol</li>
        <li><strong>Interface và type alias</strong> — bao gồm union type, intersection type, và mapped type</li>
        <li><strong>Generics</strong> — được biên dịch qua đơn hình hóa, nên <code className="text-perry-400">Array&lt;number&gt;</code> và <code className="text-perry-400">Array&lt;string&gt;</code> tạo ra các đường dẫn mã tối ưu riêng biệt</li>
        <li><strong>Class</strong> — với kế thừa, trường private (<code className="text-perry-400">#field</code>), thành viên static, getter/setter, và decorator</li>
        <li><strong>Async/await và Promise</strong> — được biên dịch thành state machine, tương tự cách Rust xử lý async</li>
        <li><strong>Generator và iterator</strong> — <code className="text-perry-400">function*</code> và vòng lặp <code className="text-perry-400">for...of</code></li>
        <li><strong>Closure</strong> — với ngữ nghĩa capture đúng đắn</li>
        <li><strong>Destructuring</strong> — mảng, đối tượng, pattern lồng nhau, và rest element</li>
        <li><strong>Template literal</strong> — bao gồm tagged template</li>
        <li><strong>Module</strong> — ESM import/export được giải quyết tại thời điểm biên dịch</li>
      </ul>

      <h2>Giao diện người dùng gốc đa nền tảng</h2>
      <p>
        Perry không chỉ giới hạn ở công cụ CLI và ứng dụng phía server. Nó đi kèm với các framework
        UI gốc cho sáu nền tảng:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>macOS</strong> — AppKit (NSWindow, NSView, NSButton, NSTextField, và nhiều hơn nữa)</li>
        <li><strong>iOS</strong> — UIKit (UIViewController, UIView, UIButton, UITableView)</li>
        <li><strong>iPadOS</strong> — UIKit (cùng API với iOS, với các điều chỉnh dành riêng cho iPad)</li>
        <li><strong>Android</strong> — JNI + Android Views (Activity, View, Button, RecyclerView)</li>
        <li><strong>Linux</strong> — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)</li>
        <li><strong>Windows</strong> — Win32 (CreateWindowEx, common controls, GDI)</li>
      </ul>
      <p>
        Điểm mấu chốt là Perry ánh xạ một API TypeScript chung tới bộ công cụ widget gốc của từng
        nền tảng tại thời điểm biên dịch. Không có lớp bridge, không có web view, và không có engine
        render tùy chỉnh. Ứng dụng của bạn sử dụng widget nền tảng thực, được render bởi chính hệ
        điều hành. Đọc thêm trong bài phân tích chi tiết:{" "}
        <Link href="/blog/cross-platform-native-ui" className="text-perry-400 hover:text-perry-300">
          Giao diện người dùng gốc đa nền tảng từ TypeScript
        </Link>.
      </p>

      <h2>Hơn 27 triển khai gốc của gói npm</h2>
      <p>
        Một trong những thách thức thực tế lớn nhất của một trình biên dịch mới là tương thích hệ sinh thái.
        Các nhà phát triển không chỉ viết mã từ đầu — họ sử dụng các gói. Perry giải quyết điều này
        với các triển khai gốc của hơn 27 gói npm phổ biến:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Cơ sở dữ liệu</strong> — mysql2, pg, mongodb, better-sqlite3, ioredis</li>
        <li><strong>HTTP</strong> — axios, express, ws (WebSockets)</li>
        <li><strong>Bảo mật</strong> — bcrypt, jsonwebtoken, crypto</li>
        <li><strong>Tiện ích</strong> — uuid, chalk, dotenv, lodash (một phần), moment</li>
        <li><strong>Hệ thống</strong> — fs-extra, glob, chokidar, commander</li>
      </ul>
      <p>
        Đây không phải là các wrapper mỏng xung quanh các module Node.js. Chúng được biên dịch trực tiếp
        vào tệp nhị phân của bạn sử dụng các thư viện hệ thống gốc — libpq cho PostgreSQL, OpenSSL cho
        crypto, libcurl cho HTTP. Bề mặt API khớp với những gì bạn mong đợi từ gói npm, nên việc
        di chuyển rất đơn giản.
      </p>

      <h2>Lớp tương thích V8 tùy chọn</h2>
      <p>
        Đối với các gói npm chưa có triển khai gốc của Perry, Perry cung cấp một chế độ nhúng V8
        tùy chọn. Khi được bật, Perry đóng gói một runtime V8 và có thể thực thi các gói npm JavaScript
        tiêu chuẩn cùng với TypeScript đã biên dịch của bạn. Đây là một cửa thoát thực dụng cho phép
        bạn áp dụng Perry dần dần — biên dịch các đường dẫn nóng thành mã gốc trong khi vẫn truy cập
        toàn bộ hệ sinh thái npm cho mọi thứ khác.
      </p>

      <h2>Biên dịch chéo</h2>
      <p>
        Perry hỗ trợ biên dịch chéo ngay từ đầu. Từ máy phát triển macOS, bạn có thể biên dịch cho
        Linux (x86_64 và ARM64) và iOS. Điều này có nghĩa bạn có thể xây dựng pipeline CI/CD trên
        macOS và tạo ra các tệp nhị phân cho tất cả các nền tảng đích mà không cần máy build
        chuyên dụng cho từng nền tảng.
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

      <h2>Hiệu năng</h2>
      <p>
        Các tệp nhị phân do Perry biên dịch rất nhanh. Vì không có khởi động JIT, không có overhead
        interpreter, và không có tạm dừng bộ thu gom rác, hiệu năng có thể dự đoán được và nhất quán
        từ lần gọi đầu tiên.
      </p>
      <p>
        Trong các benchmark của chúng tôi:
      </p>
      <ul className="list-disc list-inside">
        <li><strong>Thời gian khởi động</strong> — thực tế 0 ms (khởi chạy tiến trình gốc)</li>
        <li><strong>Kích thước tệp nhị phân</strong> — 2–5 MB cho công cụ CLI thông thường (so với hơn 50 MB cho Node.js đi kèm)</li>
        <li><strong>Sử dụng bộ nhớ</strong> — thấp hơn 5–10 lần so với ứng dụng Node.js tương đương</li>
        <li><strong>Thông lượng</strong> — cạnh tranh với C viết tay cho khối lượng công việc tính toán nặng</li>
      </ul>
      <p>
        Bạn có thể xem các benchmark trực tiếp tại{" "}
        <a href="https://demo.perryts.com" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          demo.perryts.com
        </a>, so sánh các tệp thực thi do Perry biên dịch với Node.js và Bun theo thời gian thực.
      </p>

      <h2>Trạng thái hiện tại</h2>
      <p>
        Perry đang trong quá trình phát triển tích cực. Trình biên dịch ổn định với 62 trên 62 bài kiểm tra
        vượt qua trên toàn bộ bộ kiểm thử. Tất cả sáu backend UI nền tảng đều hoạt động. Các tính năng
        ngôn ngữ cốt lõi vững chắc và đang mở rộng.
      </p>
      <p>
        Chúng tôi đang tích cực mở rộng thư viện widget UI, cải thiện hiệu năng chuỗi và đối tượng,
        hoàn thiện hỗ trợ regex đầy đủ, và xây dựng module Stream. Trong dài hạn, chúng tôi đang lên
        kế hoạch cho mục tiêu biên dịch WASM, đa luồng, extension VS Code, và tích hợp trình quản lý gói.
      </p>
      <p>
        Xem toàn bộ <Link href="/roadmap" className="text-perry-400 hover:text-perry-300">lộ trình</Link> để
        biết chi tiết về những gì đã ra mắt, đang tiến hành, và sắp tới.
      </p>

      <h2>Bắt đầu</h2>
      <p>
        Perry là mã nguồn mở. Bạn có thể clone repo, build từ mã nguồn, và bắt đầu biên dịch
        TypeScript ngay hôm nay:
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
        Duyệt mã nguồn trên{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-perry-300">
          GitHub
        </a>
        , xem{" "}
        <Link href="/showcase" className="text-perry-400 hover:text-perry-300">showcase</Link>
        {" "}để thấy những gì đang được xây dựng với Perry, hoặc bắt tay ngay vào mã nguồn.
        Chúng tôi rất mong được thấy những gì bạn sẽ xây dựng.
      </p>
    </>
  );
}
