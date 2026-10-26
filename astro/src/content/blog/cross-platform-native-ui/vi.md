---
title: "UI gốc đa nền tảng từ TypeScript"
excerpt: "How Perry maps one TypeScript codebase to platform widgets across its documented targets, including the platform-specific limitations and prerequisites."
date: 2025-02-01
tags: ["architecture", "UI", "cross-platform"]
---
Một trong những mục tiêu tham vọng nhất của Perry là cung cấp các ứng dụng GUI thực sự gốc từ một codebase TypeScript duy nhất. Không phải web view bọc trong một vỏ native. Không phải một engine render tùy chỉnh vẽ pixel riêng. Các widget native thực sự, được render bởi framework UI riêng của từng nền tảng, biên dịch từ TypeScript tại thời điểm build.

Bài viết này giải thích cách nó hoạt động — kiến trúc, ánh xạ nền tảng, các đánh đổi, và chúng tôi đang ở đâu hiện nay.

## Vấn đề với các cách tiếp cận hiện tại

Phát triển GUI đa nền tảng đã là một bài toán khó trong nhiều thập kỷ. Mỗi framework lớn đã đưa ra những bộ thỏa hiệp khác nhau:

### Electron / Tauri (Dựa trên Web)

Electron đóng gói Chromium và Node.js, cho bạn một trình duyệt web làm vỏ ứng dụng. Bạn có toàn quyền truy cập nền tảng web, nhưng ứng dụng "native" của bạn là bản tải 150+ MB sử dụng hàng trăm megabyte RAM chỉ để hiển thị một cửa sổ. Tauri thay thế Chromium bằng web view của hệ điều hành, giảm kích thước đáng kể, nhưng UI của bạn vẫn là HTML/CSS render trong web view — không phải widget native.

### React Native (Dựa trên Bridge)

React Native chạy JavaScript trong JS engine (Hermes hoặc V8) và bridge tới widget native thông qua hàng đợi tin nhắn tuần tự hóa. Bạn có widget native thực, nhưng bridge thêm độ trễ, đặc biệt cho gesture và animation. Các tương tác phức tạp yêu cầu phải viết mã native (Swift/Kotlin), phá vỡ lời hứa một codebase duy nhất.

### Flutter (Renderer tùy chỉnh)

Flutter biên dịch Dart thành mã gốc và vẽ mọi thứ bằng engine render dựa trên Skia. Hiệu năng xuất sắc, nhưng widget của bạn không phải native — chúng là bản sao pixel-perfect. Điều này có nghĩa các quy ước nền tảng (vật lý cuộn, chọn văn bản, hành vi trợ năng) phải được tái triển khai thay vì được kế thừa. Và trên desktop, sự khác biệt càng rõ ràng hơn.

### KMP + Compose Multiplatform (Native một phần)

Kotlin Multiplatform biên dịch thành JVM trên Android và native trên iOS, nhưng UI chia sẻ thông qua Compose Multiplatform sử dụng renderer dựa trên Skia tùy chỉnh — cùng đánh đổi như Flutter. Để có UI thực sự native, bạn phải quay lại viết mã riêng cho từng nền tảng.

## Cách tiếp cận của Perry: Biên dịch thành Toolkit Native

Perry áp dụng một cách tiếp cận hoàn toàn khác. Thay vì chạy mã trong runtime và bridge tới widget native, hoặc vẽ pixel tùy chỉnh, Perry biên dịch mã UI TypeScript trực tiếp thành các lệnh gọi tới toolkit native của từng nền tảng tại thời điểm build.

Điểm khác biệt then chốt: **không có lớp runtime nào giữa mã của bạn và SDK nền tảng.** Binary đã biên dịch gọi trực tiếp AppKit, UIKit, Android Views, GTK4, hoặc Win32, chính xác như một ứng dụng viết bằng Swift, Kotlin, hoặc C++ sẽ làm.

## API UI Thống nhất

Perry cung cấp một API TypeScript chung để xây dựng giao diện người dùng. API này có chủ đích ở mức cao — bạn mô tả UI nên chứa gì và hành xử như thế nào, và Perry ánh xạ nó tới các cấu trúc native phù hợp.

counter.ts

import { App, Text, Button, VStack, State } from "perry/ui";

const count = new State(0);

const app = new App("Counter", { width: 400, height: 300 });

app.body(() => {

return VStack({ spacing: 16, alignment: "center" }, \[

Text(\`Count: ${count.value}\`, { fontSize: 32 }),

Button("Increment", () => count.value++),

Button("Reset", () => count.value = 0),

\]);

});

app.run();

Cùng một đoạn mã này biên dịch thành UI native trên cả sáu nền tảng. Không cần `#ifdef`, không cần kiểm tra nền tảng, không cần import có điều kiện.

## Chi tiết ánh xạ nền tảng

Đây là cách Perry ánh xạ API thống nhất tới framework native của từng nền tảng:

### macOS — AppKit

Trên macOS, Perry sinh mã tạo và quản lý các đối tượng AppKit trực tiếp.`App` trở thành `NSApplication` với một `NSWindow`. `Text` trở thành `NSTextField` (với editing bị tắt). `Button` trở thành `NSButton` với pattern target-action được nối tới callback của bạn. `VStack` trở thành `NSStackView` với hướng dọc. Layout sử dụng Auto Layout constraints.

Binary đã biên dịch liên kết với framework AppKit và gọi trực tiếp các hàm Objective-C runtime. Đó chính xác là điều mà Swift biên dịch bởi Xcode sẽ làm.

### iOS & iPadOS — UIKit

Trên iOS, ánh xạ tương tự nhưng nhắm tới UIKit. `App` trở thành `UIApplication` với một `UIWindow` và root `UIViewController`. `Text` ánh xạ tới `UILabel`. `Button` ánh xạ tới `UIButton`. Layout sử dụng `UIStackView` và Auto Layout. Sự kiện chạm được xử lý thông qua chuỗi responder của UIKit.

### Android — JNI + Views

Trên Android, Perry sinh một thư viện native được nạp qua JNI (Java Native Interface). `App` ánh xạ tới `Activity`. `Text` trở thành `TextView`. `Button` trở thành `android.widget.Button` với một `OnClickListener`. `VStack` ánh xạ tới `LinearLayout` dọc. Mã native gọi lại vào framework Android thông qua JNI, tạo và thao tác các view Android thực.

### Linux — GTK4

Trên Linux, Perry nhắm tới GTK4. `App` trở thành `GtkApplication` với một `GtkApplicationWindow`. `Text` ánh xạ tới `GtkLabel`. `Button` ánh xạ tới `GtkButton` với một signal handler. `VStack` ánh xạ tới `GtkBox` với hướng dọc. CSS theming của GTK có nghĩa là ứng dụng tự động tuân theo theme desktop của người dùng.

### Windows — Win32

Trên Windows, Perry sinh các lệnh gọi Win32 API. `App` tạo một window class, đăng ký nó, và chạy vòng lặp tin nhắn. `Button` trở thành control `BUTTON`được tạo bằng `CreateWindowEx`. `Text` ánh xạ tới control `STATIC`. Sự kiện được xử lý thông qua message pump Win32 (`WM_COMMAND`, `WM_NOTIFY`, v.v.).

## Quản lý trạng thái

Primitive `State<T>` của Perry cung cấp quản lý trạng thái phản ứng biên dịch thành cơ chế cập nhật native của nền tảng. Khi một giá trị state thay đổi, Perry kích hoạt cập nhật UI thông qua hệ thống vô hiệu hóa riêng của nền tảng — `setNeedsDisplay` trên macOS/iOS, `invalidate()` trên Android, `gtk_widget_queue_draw` trên Linux.

Không có virtual DOM diffing, không có bước reconciliation, không có tuần tự hóa. Thay đổi state lan truyền trực tiếp tới widget native hiển thị giá trị.

## Tại sao không dùng cú pháp SwiftUI / Jetpack Compose?

Bạn có thể thắc mắc tại sao Perry không sử dụng cú pháp khai báo tương tự SwiftUI hoặc Jetpack Compose. Câu trả lời mang tính thực dụng: Perry biên dịch TypeScript, và TypeScript có các idiom riêng. Thay vì phát minh một DSL trông xa lạ với developer TypeScript, Perry sử dụng API kiểu builder cảm thấy tự nhiên trong TypeScript — constructor, gọi phương thức, callback, và closure. Đó chính là các pattern bạn đã sử dụng khi làm việc với Express, React hooks, hoặc bất kỳ thư viện TypeScript nào khác.

## Có gì sẵn sàng hôm nay

Tất cả sáu backend nền tảng đều đã được triển khai và ổn định. Bộ widget hiện tại bao gồm:

-   **Layout** — VStack, HStack, Spacer, ScrollView, Divider
-   **Hiển thị** — Text, Image
-   **Nhập liệu** — Button, TextField, Toggle, Slider
-   **Điều hướng** — NavigationView, TabView, List
-   **Container** — TreeView, SearchBar, StatusBar
-   **Trạng thái** — State<T> cho cập nhật phản ứng

## Sắp tới

Chúng tôi đang tích cực mở rộng thư viện widget. Tiếp theo:

-   `SecureField` — nhập mật khẩu với secure text entry native của nền tảng
-   `ProgressView` — chỉ báo tiến trình xác định và không xác định
-   `Alert` — hộp thoại cảnh báo native với nút và trường văn bản
-   `DatePicker` — chọn ngày/giờ native của nền tảng
-   `Menu` — thanh menu native và menu ngữ cảnh

Mục tiêu là tương đương đầy đủ framework GUI trên tất cả nền tảng — mọi widget, layout, gesture, và animation đều có sẵn ở mọi nơi. Xem [lộ trình](/vi/roadmap/) để có bức tranh toàn cảnh.

## Dùng thử

Cách tốt nhất để hiểu UI native của Perry là nhìn nó hoạt động. [Pry](/vi/showcase/pry/) là một trình xem JSON native được xây dựng hoàn toàn bằng TypeScript với Perry — một ứng dụng thực với điều hướng dạng cây, tìm kiếm, và phím tắt, biên dịch thành binary native trên macOS, iOS, và Android. Đọc [hướng dẫn chi tiết](/vi/blog/building-pry/) về cách nó được xây dựng.
