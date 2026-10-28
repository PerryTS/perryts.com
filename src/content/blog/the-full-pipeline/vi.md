---
title: "Pipeline hoàn chỉnh: Tài liệu, phân phối và WidgetKit"
excerpt: "82 commit trong một tuần: trang tài liệu 49 trang, xuất bản tự động trên App Store và Play Store, gói Homebrew và APT, phần mở rộng WidgetKit gốc từ TypeScript, widget mới, module http/https và trình biên dịch LLVM tự lưu trữ."
date: 2026-03-13
tags: ["distribution", "documentation", "WidgetKit", "milestone"]
---
82 commit trong bảy ngày. Trang tài liệu với 49 trang. Xuất bản App Store và Play Store tự động. Gói Homebrew và APT. Extension WidgetKit native biên dịch từ TypeScript. Trình biên dịch LLVM tự host. Và hàng chục bản sửa lỗi trên mọi nền tảng.

Bài đăng này bao gồm mọi thứ được gửi trong Perry từ ngày 6 tháng 3 đến ngày 13 tháng 3 năm 2026. Chủ đề đã hoàn tất — lấp đầy khoảng trống giữa "Tôi đã viết một số TypeScript" và "ứng dụng của tôi nằm trong App Store."

## docs.perryts.com

Perry hiện có trang web tài liệu thực sự. 49 trang được xây dựng bằng mdBook, bao gồm mọi thứ từ bước bắt đầu đến tài liệu tham khảo CLI. Các tài liệu được sắp xếp thành các phần:

-   **Bắt đầu** — cài đặt, dự án đầu tiên, cấu trúc dự án
-   **Tính năng ngôn ngữ** — mọi thứ Perry hỗ trợ từ TypeScript
-   **Giao diện người dùng gốc** — 12 trang bao gồm tất cả các loại tiện ích, bố cục, quản lý trạng thái và hành vi dành riêng cho nền tảng
-   **Nền tảng** — các trang dành riêng cho từng nền tảng trong số 6 nền tảng mục tiêu
-   **Thư viện tiêu chuẩn** — Hơn 50 cách triển khai gói gốc được ghi lại
-   **API hệ thống** — hộp thoại tệp, chuỗi khóa, thông báo, nhiều cửa sổ
-   **WidgetKit** — mô-đun tiện ích mở rộng tiện ích mới
-   **Plugin** — kiến trúc plugin tại thời điểm biên dịch
-   **CLI Tham chiếu** — mọi lệnh và cờ

Trang web này cũng bao gồm tệp `llms.txt` để phát hiện AI và được triển khai thông qua các trang GitHub có miền tùy chỉnh tại [docs.perryts.com](https://docs.perryts.com).

## Cài đặt Perry bằng một lệnh

Perry hiện được phân phối thông qua Homebrew và APT, ngoài việc xây dựng từ nguồn. Một quy trình phát hành GitHub Actions mới xây dựng các tệp nhị phân cho macOS (arm64 và x86_64) và Linux (x86_64 và arm64), sau đó tự động cập nhật vòi Homebrew và kho lưu trữ APT.

```text
# macOS
brew tap PerryTS/perry
brew install perry
# Debian/Ubuntu
sudo apt update && sudo apt install perry
```

Không cần sao chép kho lưu trữ và xây dựng bằng Cargo nữa. Cài đặt Perry giống như cách bạn cài đặt bất kỳ công cụ nào khác.

## Xuất bản App Store tự động

Đây là thay đổi thu gọn các bước thủ công nhất. Đang chạy `perry publish ios` hiện tự động xử lý toàn bộ đường dẫn phân phối iOS:

1.  Tạo khóa RSA và CSR thông qua App Store Connect API
2.  Tạo chứng chỉ phân phối và gói nó vào `.p12`
3.  Đăng ký ID gói
4.  Tạo và tải xuống hồ sơ cấp phép
5.  Tạo bản ghi ứng dụng App Store Connect
6.  Xây dựng, ký và tải lên TestFlight hoặc App Store

Không có Xcode. Không có lượt truy cập cổng thông tin thủ công. Không tải xuống chứng chỉ từ trình duyệt. Trình hướng dẫn thiết lập sẽ tự động chạy vào lần đầu tiên bạn xuất bản, xem qua cấu hình khóa API và lưu trữ thông tin xác thực trong `perry.toml`.

Quá trình phân phối macOS cũng được tự động hóa như nhau. Perry hỗ trợ ba chế độ: TestFlight, DMG được công chứng và chế độ **"cả hai"** mới xuất bản lên App Store và đồng thời tạo DMG được công chứng. Ba loại chứng chỉ được tạo tự động: `MAC_APP_DISTRIBUTION`, `MAC_INSTALLER_DISTRIBUTION` và `DEVELOPER_ID_APPLICATION`.

Xuất bản trên Android cũng có trình hướng dẫn thiết lập được kích hoạt tự động. Cả ba nền tảng hiện đều tuân theo cùng một mẫu: thiết lập trình kích hoạt lần chạy đầu tiên, thông tin đăng nhập được lưu vào dự án, các lần chạy tiếp theo không có cấu hình.

Xác thực trước chuyến bay phát hiện các vấn đề trước khi quá trình xây dựng bắt đầu — ID gói hồ sơ cấp phép không khớp, hết hạn chứng chỉ, thiếu biểu tượng ứng dụng, định dạng phiên bản không hợp lệ, ID nhóm sai. Và `encryption_exempt` trong `perry.toml [ios]` tự động đặt `ITSAppUsesNonExemptEncryption` Khóa Info.plist, bỏ qua lời nhắc tuân thủ xuất thủ công trong App Store Connect.

## perry/widget: WidgetKit từ TypeScript

Perry hiện có thể biên dịch TypeScript thành các tiện ích mở rộng SwiftUI WidgetKit gốc. Đây không phải là trình bao bọc hay cầu nối — trình biên dịch sẽ duyệt cây kết xuất ở cấp HIR và phát trực tiếp mã nguồn SwiftUI. Đầu ra là một gói tiện ích mở rộng WidgetKit hoàn chỉnh mà Xcode (hoặc Perry) có thể nhúng vào ứng dụng của bạn.

```text
perry widget.ts --target ios-widget --app-bundle-id com.example.app -o out/
```

Cách tiếp cận này về cơ bản khác với phần còn lại trong phần tổng hợp của Perry. Mã Perry thông thường sẽ đi qua Cranelift tới mã máy gốc. Mã tiện ích đi qua HIR tới đầu ra văn bản SwiftUI, vì WidgetKit yêu cầu SwiftUI — không có cách nào để xây dựng tiện ích mở rộng tiện ích với mã UIKit hoặc AppKit bắt buộc. Perry giải quyết vấn đề này bằng cách xử lý cây hiển thị tiện ích dưới dạng mẫu thời gian biên dịch chứ không phải mã thời gian chạy.

## Widget mới và cải tiến nền tảng

Bốn loại tiện ích mới đã ra mắt trong tuần này:

-   **TextArea** — chỉnh sửa văn bản nhiều dòng trên macOS, iOS và Android
-   **SecureField** — nhập mật khẩu trên iOS và macOS
-   **Mã QR** — tạo mã QR gốc trên iOS, macOS và Android
-   **Splash Screen** — bảng phân cảnh LaunchScreen được tạo tự động (iOS) và chủ đề giật gân (Android)

### iPad trở thành native

Perry hiện tạo ra các ứng dụng gốc iPad đầy đủ: `UIDeviceFamily [1,2]`, hỗ trợ định hướng, `UIRequiresFullScreen` và bảng phân cảnh LaunchScreen được biên dịch thông qua ibtool. Chức năng `getDeviceIdiom()` mới phát hiện điện thoại so với iPad trong thời gian chạy và `PerryFrameSplit` cung cấp các vùng chứa phân chia theo chiều ngang dựa trên khung cho bố cục iPad.

### Windows

Windows được hỗ trợ hẹn giờ (tick 50ms `WM_TIMER`), các nút do chủ sở hữu vẽ với nền chủ đề tối và sửa lỗi không sử dụng sau trong `to_wide().as_ptr()` trên 18 tệp tiện ích. Thời gian chạy V8 hiện hoạt động trên Windows với các thư viện hệ thống bắt buộc được liên kết.

### GTK4 (Linux)

Phần phụ trợ GTK4 đã được cải tiến về mặt hình ảnh để phù hợp với macOS: phần đệm CSS cho các phần bên trong cạnh, kiểu dáng nút Adwaita, sửa lỗi lề VStack và ScrollView chính sách theo chiều ngang.

## http/https và tốt hơn-sqlite3

Hai bổ sung đáng kể cho stdlib:

Các mô-đun gốc `http` và `https` mới cung cấp HTTP phía máy khách bằng cách sử dụng reqwest một cách cơ bản. API khớp với Node.js: `request()`, `get()`, `ClientRequest` với write/end/on và `IncomingMessage` với mã trạng thái và trình xử lý sự kiện.

`better-sqlite3` hiện được hỗ trợ đầy đủ: `new Database()`, `prepare`, `exec`, `run`, `get`, `all` — với các đối tượng hàng và hộp NaN thích hợp có quyền truy cập thuộc tính được đặt tên.

Các cải tiến khác của stdlib: `crypto.randomBytes()` hiện trả về Bộ đệm (khớp với Node.js), MongoDB đã nhận được `listDatabases` và `listCollections` với sửa lỗi an toàn luồng và mysql2 INSERT/UPDATE/DELETE hiện trả về `ResultSetHeader` với `insertId`.

## Sửa lỗi GC và tính đúng đắn

Một số bản sửa lỗi về tính chính xác và tính chính xác của thời gian chạy đã được phát hành trong tuần này:

-   **GC bảo vệ tái nhập** — ngăn chặn việc thu thập trong quá trình phân bổ, khắc phục tình trạng hoảng loạn vay mượn hai lần của RefCell
-   **GC Theo dõi bản đồ** — Bản đồ hiện được theo dõi chính xác trong giai đoạn đánh dấu, ngăn chặn việc thu thập khóa chuỗi
-   **Sửa bí danh chuỗi** — nối thêm chuỗi giờ đây luôn phân bổ các chuỗi mới, sửa lỗi do bí danh sao chép con trỏ
-   **Số học BigInt** — dịch chuyển sang phải sử dụng dịch chuyển số học cho số âm, hoạt động theo bit sử dụng ngữ nghĩa gói ToInt32
-   **Map.get() không xác định** — trả về `TAG_UNDEFINED` chính xác cho các khóa bị thiếu thay vì thẻ NaN sai
-   **Trường tĩnh GC** — Giá trị BigInt trong các trường lớp tĩnh được đăng ký dưới dạng GC gốc

Những điều này không hề nhỏ. Chỉ riêng bản sửa lỗi đăng nhập lại GC đã giải quyết được toàn bộ loại sự cố không liên tục. Bản sửa lỗi bí danh chuỗi đã ảnh hưởng đến bất kỳ chương trình nào gán một biến chuỗi này cho một biến chuỗi khác và sau đó bị biến đổi. Đây là những loại lỗi chỉ xuất hiện khi thực hiện khối lượng công việc thực tế và việc sửa chúng là điều khiến trình biên dịch đạt chất lượng sản xuất.

## perry-verify: Đã được làm cứng

`perry-verify`, dịch vụ xác minh ứng dụng tự động, đã nhận được giấy phép tăng cường bảo mật: thực thi trong hộp cát thông qua `bwrap` trên Linux và `sandbox-exec` trên macOS, auth mã thông báo trên WebSocket, giới hạn tốc độ trên mỗi IP, ID công việc UUID đầy đủ để ngăn chặn việc liệt kê và giảm giới hạn nội dung.

## perrysdad: Trình biên dịch tự lưu trữ

Trong một nỗ lực song song, `perrysdad` — một trình biên dịch LLVM IR tự lưu trữ được viết bằng TypeScript — đã chuyển từ 0 sang tự biên dịch trong năm giai đoạn trong suốt thời gian qua tuần:

1.  **Giai đoạn 0–1** — khung xuyên suốt từ đầu đến cuối: HIR → văn bản LLVM IR → clang, liên kết với `libperry_runtime.a` của Perry
2.  **Giai đoạn 2** — trình phân tích cú pháp gốc đệ quy được cuộn bằng tay với tính năng phân tích cú pháp biểu thức Pratt cho các tệp `.ts` thực
3.  **Giai đoạn 3** — mảng, đối tượng và bản đồ có thời gian chạy FFI, đồng thời sửa lỗi ABI nghiêm trọng không khớp (JSValue được khai báo là double trong LLVM IR thay vì i64)
4.  **Giai đoạn 4** — các lớp, enum, bao đóng, biên dịch nhiều tệp với tính năng khám phá mô-đun và sắp xếp cấu trúc liên kết

Cột mốc quan trọng: tệp nhị phân `anvil` tự biên dịch giờ đây có thể biên dịch các chương trình thử nghiệm và tạo ra đầu ra chính xác khớp với phiên bản do nút biên dịch. Trình biên dịch TypeScript, do Perry biên soạn thành mã gốc, biên dịch thêm TypeScript thành mã gốc. Rùa xuống hết.

## Bằng số liệu

-   **82 cam kết** với trình biên dịch Perry chính
-   **1 bản phát hành**: v0.2.173 (8 tháng 3)
-   **49 trang tài liệu** tại docs.perryts.com
-   **4 tiện ích mới**: TextArea, SecureField, QR Code, Splash Screen
-   **3 kênh phân phối**: Homebrew, APT, nguồn
-   **3 quy trình lưu trữ tự động**: App Store, TestFlight, Google Play
-   **Tất cả 6 nền tảng** đều nhận được cải tiến trong tuần này

## Tiếp theo là gì

Quy trình đang dần hoàn thiện. Bạn có thể viết TypeScript, biên dịch sang sáu nền tảng, phân phối qua Homebrew hoặc APT, xuất bản lên App Store và Play Store, thêm tiện ích màn hình chính và đọc tài liệu toàn diện — tất cả mà không cần rời khỏi Perry. Những gì còn lại:

-   **Hỗ trợ đầy đủ biểu thức chính quy** — khoảng cách ngôn ngữ lớn cuối cùng
-   **mở rộng perry/ui** — kéo và thả, nhãn trợ năng, DatePicker
-   **sự trưởng thành của perrysdad** — mở rộng trình biên dịch tự lưu trữ theo hướng ngang bằng Perry đầy đủ
-   **Hub beta công khai** — mở các bản dựng được phân phối cho người dùng bên ngoài

Theo dõi tiến trình trên [GitHub](https://github.com/PerryTS/perry), đọc tài liệu mới tại [docs.perryts.com](https://docs.perryts.com) hoặc kiểm tra [lộ trình](/vi/roadmap/) để có bức tranh toàn cảnh.
