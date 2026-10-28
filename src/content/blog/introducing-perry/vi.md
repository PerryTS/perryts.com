---
title: "Giới thiệu Perry"
excerpt: "Perry biên dịch TypeScript được hỗ trợ thành các tệp thực thi gốc độc lập với thời gian chạy và GC được liên kết bên trong mà không yêu cầu cài đặt Node.js bên ngoài hoặc JavaScript."
date: 2025-01-15
tags: ["announcement", "compiler", "TypeScript"]
---
Chúng tôi vui mừng giới thiệu Perry — một trình biên dịch TypeScript gốc được viết bằng Rust, biên dịch TypeScript của bạn trực tiếp thành các tệp thực thi độc lập. Không cần Node.js runtime, không cần Electron wrapper, không có sự thỏa hiệp. Chỉ có mã nguồn của bạn, được biên dịch thành tệp nhị phân gốc khởi động ngay lập tức và chạy được mọi nơi.

Perry đại diện cho một sự tư duy lại căn bản về những gì TypeScript có thể làm được. Thay vì coi nó như một tập cha của JavaScript phải chạy qua một JS engine, Perry coi TypeScript như một ngôn ngữ hệ thống — một ngôn ngữ tình cờ có cú pháp mà hàng triệu nhà phát triển đã biết và yêu thích.

## Tại sao chúng tôi xây dựng Perry

TypeScript đã trở thành ngôn ngữ chung của phát triển phần mềm hiện đại. Đây là ngôn ngữ đằng sau hầu hết các frontend web, một phần ngày càng lớn của backend, và ngày càng được lựa chọn cho công cụ, scripting và tự động hóa. Nhưng nó luôn mang theo một hạn chế cơ bản: nó biên dịch sang JavaScript, và JavaScript yêu cầu một runtime.

Runtime đó — dù là Node.js, Deno, hay Bun — đi kèm với những đánh đổi. Thời gian khởi động lạnh được đo bằng hàng chục hoặc hàng trăm mili giây. Chi phí bộ nhớ từ trình biên dịch JIT và bộ thu gom rác. Bản phân phối nhị phân hoặc phải đóng gói toàn bộ runtime hoặc yêu cầu người dùng cài đặt một runtime. Và đối với ứng dụng GUI, lựa chọn duy nhất là Electron, đi kèm cả một trình duyệt Chromium với ứng dụng của bạn.

Chúng tôi đã tự hỏi: nếu TypeScript không phải đi qua JavaScript thì sao? Nếu bạn có thể biên dịch nó trực tiếp thành mã máy gốc, giống như cách bạn biên dịch Rust, Go, hoặc C++ thì sao?

## Perry hoạt động như thế nào

Pipeline biên dịch của Perry có ba giai đoạn:

1.  **Phân tích cú pháp** — Perry sử dụng SWC (trình phân tích cú pháp TypeScript/JavaScript dựa trên Rust) để phân tích mã nguồn TypeScript thành AST. SWC là cùng trình phân tích được sử dụng bởi Next.js, và nó cực kỳ nhanh.
2.  **Biên dịch hướng kiểu** — Perry duyệt AST với đầy đủ thông tin kiểu. Không giống một JS engine phải xử lý kiểu động tại runtime, Perry biết mọi kiểu tại thời điểm biên dịch. Điều này cho phép đơn hình hóa generics, gọi phương thức dispatch tĩnh, và tối ưu bố cục bộ nhớ trực tiếp.
3.  **Sinh mã** — Perry sinh mã máy gốc sử dụng Cranelift, cùng bộ sinh mã được sử dụng bởi Wasmtime và một số phần của Firefox JIT. Cranelift tạo ra mã gốc hiệu quả cho x86\_64 và ARM64.

Kết quả là một tệp thực thi độc lập — thường 2–5 MB cho một công cụ CLI — khởi động ngay lập tức với thời gian khởi động bằng không.

```text
$ perry build app.ts
Parsing app.ts...
Compiling (cranelift, arm64)...
Linking...
✓ Built executable: app (2.3 MB)
$ ./app
Hello from native TypeScript!
$ file app
app: Mach-O 64-bit executable arm64
```

## Các tính năng TypeScript được hỗ trợ

Perry hỗ trợ một tập con rộng và đang phát triển của TypeScript. Mục tiêu là tương thích đầy đủ với ngôn ngữ theo cách các nhà phát triển thực sự sử dụng. Hiện tại, điều đó bao gồm:

-   **Tất cả kiểu nguyên thủy** — string, number, boolean, null, undefined, bigint, symbol
-   **Interface và type alias** — bao gồm union type, intersection type, và mapped type
-   **Generics** — được biên dịch qua đơn hình hóa, nên `Array<number>` và `Array<string>` tạo ra các đường dẫn mã tối ưu riêng biệt
-   **Class** — với kế thừa, trường private (`#field`), thành viên static, getter/setter, và decorator
-   **Async/await và Promise** — được biên dịch thành state machine, tương tự cách Rust xử lý async
-   **Generator và iterator** — `function*` và vòng lặp `for...of`
-   **Closure** — với ngữ nghĩa capture đúng đắn
-   **Destructuring** — mảng, đối tượng, pattern lồng nhau, và rest element
-   **Template literal** — bao gồm tagged template
-   **Module** — ESM import/export được giải quyết tại thời điểm biên dịch

## Giao diện người dùng gốc đa nền tảng

Perry không chỉ giới hạn ở công cụ CLI và ứng dụng phía server. Nó đi kèm với các framework UI gốc cho sáu nền tảng:

-   **macOS** — AppKit (NSWindow, NSView, NSButton, NSTextField, và nhiều hơn nữa)
-   **iOS** — UIKit (UIViewController, UIView, UIButton, UITableView)
-   **iPadOS** — UIKit (cùng API với iOS, với các điều chỉnh dành riêng cho iPad)
-   **Android** — JNI + Chế độ xem Android (Hoạt động, Chế độ xem, Button, RecyclerView)
-   **Linux** — GTK4 (GtkWindow, GtkBox, GtkButton, GtkEntry)
-   **Windows** — Win32 (CreatWindowEx, điều khiển chung, GDI)

Điểm mấu chốt là Perry ánh xạ một API TypeScript chung tới bộ công cụ widget gốc của từng nền tảng tại thời điểm biên dịch. Không có lớp bridge, không có web view, và không có engine render tùy chỉnh. Ứng dụng của bạn sử dụng widget nền tảng thực, được render bởi chính hệ điều hành. Đọc thêm trong bài phân tích chi tiết: [Giao diện người dùng gốc đa nền tảng từ TypeScript](/vi/blog/cross-platform-native-ui/).

## Hơn 27 triển khai gốc của gói npm

Một trong những thách thức thực tế lớn nhất của một trình biên dịch mới là tương thích hệ sinh thái. Các nhà phát triển không chỉ viết mã từ đầu — họ sử dụng các gói. Perry giải quyết điều này với các triển khai gốc của hơn 27 gói npm phổ biến:

-   **Cơ sở dữ liệu** — mysql2, pg, mongodb, better-sqlite3, ioredis
-   **HTTP** — axios, express, ws (WebSockets)
-   **Bảo mật** — bcrypt, jsonwebtoken, crypto
-   **Tiện ích** — uuid, chalk, dotenv, lodash (một phần), moment
-   **Hệ thống** — fs-extra, glob, chokidar, commander

Đây không phải là các wrapper mỏng xung quanh các module Node.js. Chúng được biên dịch trực tiếp vào tệp nhị phân của bạn sử dụng các thư viện hệ thống gốc — libpq cho PostgreSQL, OpenSSL cho crypto, libcurl cho HTTP. Bề mặt API khớp với những gì bạn mong đợi từ gói npm, nên việc di chuyển rất đơn giản.

## Lớp tương thích V8 tùy chọn

Đối với các gói npm chưa có triển khai gốc của Perry, Perry cung cấp một chế độ nhúng V8 tùy chọn. Khi được bật, Perry đóng gói một runtime V8 và có thể thực thi các gói npm JavaScript tiêu chuẩn cùng với TypeScript đã biên dịch của bạn. Đây là một cửa thoát thực dụng cho phép bạn áp dụng Perry dần dần — biên dịch các đường dẫn nóng thành mã gốc trong khi vẫn truy cập toàn bộ hệ sinh thái npm cho mọi thứ khác.

## Biên dịch chéo

Perry hỗ trợ biên dịch chéo ngay từ đầu. Từ máy phát triển macOS, bạn có thể biên dịch cho Linux (x86\_64 và ARM64) và iOS. Điều này có nghĩa bạn có thể xây dựng pipeline CI/CD trên macOS và tạo ra các tệp nhị phân cho tất cả các nền tảng đích mà không cần máy build chuyên dụng cho từng nền tảng.

```
# Build for Linux from macOS
$ perry build app.ts --target linux-x86_64
✓ Built executable: app (3.1 MB)
# Build for iOS from macOS
$ perry build app.ts --target ios-arm64
✓ Built executable: app (4.8 MB)
```

## Hiệu năng

Các tệp nhị phân do Perry biên dịch rất nhanh. Vì không có khởi động JIT, không có overhead interpreter, và không có tạm dừng bộ thu gom rác, hiệu năng có thể dự đoán được và nhất quán từ lần gọi đầu tiên.

Trong các benchmark của chúng tôi:

-   **Thời gian khởi động** — thực tế 0 ms (khởi chạy tiến trình gốc)
-   **Kích thước tệp nhị phân** — 2–5 MB cho công cụ CLI thông thường (so với hơn 50 MB cho Node.js đi kèm)
-   **Sử dụng bộ nhớ** — thấp hơn 5–10 lần so với ứng dụng Node.js tương đương
-   **Thông lượng** — cạnh tranh với C viết tay cho khối lượng công việc tính toán nặng

Bạn có thể xem các benchmark trực tiếp tại [demo.perryts.com](https://demo.perryts.com), so sánh các tệp thực thi do Perry biên dịch với Node.js và Bun theo thời gian thực.

## Trạng thái hiện tại

Perry đang trong quá trình phát triển tích cực. Trình biên dịch ổn định với 62 trên 62 bài kiểm tra vượt qua trên toàn bộ bộ kiểm thử. Tất cả sáu backend UI nền tảng đều hoạt động. Các tính năng ngôn ngữ cốt lõi vững chắc và đang mở rộng.

Chúng tôi đang tích cực mở rộng thư viện widget UI, cải thiện hiệu năng chuỗi và đối tượng, hoàn thiện hỗ trợ regex đầy đủ, và xây dựng module Stream. Trong dài hạn, chúng tôi đang lên kế hoạch cho mục tiêu biên dịch WASM, đa luồng, extension VS Code, và tích hợp trình quản lý gói.

Xem toàn bộ [lộ trình](/vi/roadmap/) để biết chi tiết về những gì đã ra mắt, đang tiến hành, và sắp tới.

## Bắt đầu

Perry là mã nguồn mở. Bạn có thể clone repo, build từ mã nguồn, và bắt đầu biên dịch TypeScript ngay hôm nay:

```
$ git clone https://github.com/PerryTS/perry.git
$ cd perry
$ cargo build --release
# Compile your first TypeScript file
$ ./target/release/perry build hello.ts
✓ Built executable: hello (2.1 MB)
$ ./hello
Hello, world!
```

Duyệt mã nguồn trên [GitHub](https://github.com/PerryTS/perry), xem [showcase](/vi/showcase/) để thấy những gì đang được xây dựng với Perry, hoặc bắt tay ngay vào mã nguồn. Chúng tôi rất mong được thấy những gì bạn sẽ xây dựng.
