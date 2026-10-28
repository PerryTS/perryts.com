---
title: "Biên dịch chéo sang Windows, game loop trên iOS và 100% đồng bộ kiểm thử"
excerpt: "103 commit trong một tuần: biên dịch chéo sang Windows từ Linux qua lld-link, hỗ trợ game loop trên iOS, báo cáo lỗi, pipeline build Hub hai giai đoạn và trình biên dịch tự lưu trữ đạt đồng bộ kiểm thử deterministic 68/68."
date: 2026-03-20
tags: ["compiler", "cross-compilation", "infrastructure", "milestone"]
---
103 commit cho trình biên dịch Perry tuần này. Các tính năng nổi bật: bạn giờ có thể biên dịch chéo các tệp thực thi Windows từ Linux, ứng dụng iOS có thể chạy game loop blocking, trình biên dịch báo cáo crash cho telemetry, và trình biên dịch tự host vượt qua mọi bài kiểm tra xác định mà chúng tôi đưa ra. Cộng thêm nâng cấp hạ tầng Hub lớn và hơn 50 bản sửa lỗi.

## Biên dịch chéo sang Windows từ Linux

Perry hiện có thể tạo các tệp nhị phân Windows `.exe` từ máy chủ Linux. Đây là phần còn thiếu cho quy trình CI/CD cần nhắm mục tiêu Windows mà không cần chạy máy xây dựng Windows để thực hiện toàn bộ quá trình biên dịch.

Việc triển khai thay thế các kiểm tra `#[cfg]` tại thời gian biên dịch bằng tính năng phát hiện mục tiêu trong thời gian chạy. Khi trình biên dịch nhìn thấy mục tiêu Windows trên máy chủ không phải Windows, nó sẽ định vị `lld-link`, `llvm-nm` và `llvm-ar` từ chuỗi công cụ Rust hoặc PATH thông qua `find_llvm_tool()`. Các thư viện hệ thống Windows đến từ một sysroot kiểu [xwin](https://github.com/Jake-Shadle/xwin) được trỏ đến bởi `PERRY_WINDOWS_SYSROOT`.

Trình liên kết tự động sử dụng `/FORCE:UNRESOLVED` và tạo các phần sơ khai cho các ký hiệu giao diện người dùng bị thiếu, nhờ đó các ứng dụng CLI biên dịch chéo một cách rõ ràng. Đầu ra mặc định là `.exe` khi nhắm mục tiêu Windows. Thông tin chi tiết đầy đủ có trong [tài liệu biên dịch chéo](https://docs.perryts.com).

**thiết bị đầu cuối — Máy chủ Linux**

```
$ perry compile main.ts --target windows
Compiling main.ts for windows-x86_64...
Using lld-link from Rust toolchain
✓ Compiled executable: main.exe (2.8 MB)
```

## Hỗ trợ Game Loop iOS

iOS yêu cầu UIKit để sở hữu chuỗi chính. Điều đó tốt cho các ứng dụng hướng sự kiện, nhưng sẽ là vấn đề đối với các trò chơi cần vòng lặp `while (!shouldClose)` chặn. Perry hiện giải quyết vấn đề này bằng cờ `--features ios-game-loop`.

Khi được bật, trình biên dịch sẽ phát ra `_perry_user_main` thay vì `main`. Thời gian chạy cung cấp một `main()` gọi `UIApplicationMain` trên luồng chính và tạo mã của bạn trên luồng nền. Đại biểu cảnh và đại biểu ứng dụng xử lý toàn bộ vòng đời UIKit trong khi vòng lặp trò chơi của bạn chạy mà không bị chặn.

**main.ts**

```typescript
// Your game loop runs on a background thread
while (!shouldClose) {
update();
render();
awaitNextFrame();
}
```

```text
$ perry run ios --features ios-game-loop
```

Điều này cho phép toàn bộ danh mục ứng dụng — trò chơi, mô phỏng, trực quan hóa thời gian thực — mà trước đây không thực tế trên iOS. Đường dẫn gọi lại và bơm iOS hiện cũng được bao bọc trong xử lý hoảng loạn, do đó, các sự cố trong vòng lặp trò chơi hoặc vòng đời UIKit đều được xử lý rõ ràng.

## Báo cáo sự cố

Ứng dụng được biên dịch bằng Perry giờ cài đặt panic hook và trình xử lý tín hiệu cho `SIGSEGV`, `SIGBUS` và `SIGABRT` khi khởi động. Khi xảy ra sự cố nghiêm trọng, thông tin chi tiết được ghi vào `~/.hone/crash.log` cho hệ thống telemetry Chirp. Những panic đã được bắt trong `catch_callback_panic` sẽ xóa nhật ký, vì vậy chỉ các sự cố thực sự không thể phục hồi mới được báo cáo.

Đây là tính năng sẵn sàng sản xuất. Khi có sự cố xảy ra tại hiện trường, chúng tôi sẽ biết về điều đó — và nhật ký sự cố bao gồm đủ ngữ cảnh để chẩn đoán sự cố mà không yêu cầu người dùng phải báo cáo bất kỳ điều gì theo cách thủ công.

## Hub: Pipeline Build Windows hai giai đoạn

Cơ sở hạ tầng xây dựng Hub Perry đã nhận được nâng cấp kiến trúc đáng kể. Trước đây, việc xây dựng cho Windows yêu cầu một nhân viên Windows thực hiện toàn bộ quá trình biên dịch. Bây giờ, quy trình chia thành hai giai đoạn:

1.  Một nhân viên Linux biên dịch chéo tạo phẩm Windows bằng cách sử dụng hỗ trợ lld-link mới
2.  Trung tâm giữ cấu phần phần mềm được biên dịch trước và sắp xếp lại công việc cho nhân viên Windows
3.  Nhân viên Windows chỉ xử lý việc ký và đóng gói — một nhiệm vụ nhẹ nhàng hơn nhiều

Khi một nhân viên gửi `complete` với `needs_finishing: "windows"`, Hub sẽ xếp hàng lại công việc một cách minh bạch. CLI mang lại trải nghiệm xây dựng đơn lẻ liền mạch.

Hub hiện cũng tự động khởi động máy ảo Azure Windows khi không có nhân viên Windows nào được kết nối và nhân viên xây dựng tự động cập nhật lên phiên bản Perry mới nhất trên các bản phát hành mới. Quản lý cơ sở hạ tầng ít thủ công hơn, xây dựng nhanh hơn.

## Đại tu tài liệu

Hai bản viết lại tài liệu chính đã được cập nhật vào tuần này trên [docs.perryts.com](https://docs.perryts.com):

-   **tham khảo perry.toml** — tài liệu phần hoàn chỉnh bao gồm mọi tùy chọn cấu hình, độ phân giải ID gói, độ phân giải tệp mục nhập, tự động tăng số bản dựng và ví dụ CI/CD
-   **Tài liệu tham khảo Geisterhand** — tài liệu API đầy đủ, thiết lập nền tảng, mẫu tự động hóa thử nghiệm và tổng quan về kiến trúc cho khung thử nghiệm giao diện người dùng đa nền tảng

Đây không phải là những cập nhật gia tăng. Cả hai đều là bản viết lại cơ bản bao gồm mọi tính năng và tùy chọn cấu hình. Nếu bạn đang thiết lập một dự án mới hoặc viết bài kiểm tra, hãy bắt đầu tại đây.

## API Menu đa nền tảng

`menuClear` và `menuAddStandardAction` trước đây chỉ có trên macOS. Giờ chúng hoạt động trên cả 6 nền tảng native. Thay đổi này cũng sửa lỗi panic do tái nhập `RefCell` trong `dispatch_menu_item` trên Windows.

### Android: Căn chỉnh trang 16 KB

Google Play hiện yêu cầu căn chỉnh trang 16 KB cho các thư viện gốc. Perry tự động đặt `CARGO_TARGET_AARCH64_LINUX_ANDROID_RUSTFLAGS` thích hợp và các tệp `.so` đồng hành được sao chép bên cạnh đầu ra để đưa vào APK/AAB.

## Perry React: Bảng Kanban

Lớp tương thích React đã được kiểm tra trong thế giới thực: bảng Kanban 5 cột đầy đủ với các thao tác di chuyển, thêm, xóa và xem. Xây dựng kết xuất mảng con lồng nhau không được phát hiện và sửa lỗi trong JSX — trình xử lý đệ quy `_appendChildren` hiện đã làm phẳng chính xác các mảng được trả về từ lệnh gọi `.map()`. Ngoài ra còn có bản demo WorkBench bồn rửa nhà bếp gồm 14 phần mới bao gồm nhiều mẫu giao diện người dùng khác nhau.

## Anvil: 100% Tương đương bài kiểm tra xác định

`perrysdad` — trình biên dịch LLVM tự lưu trữ được viết bằng TypeScript và được biên dịch bởi Perry — hiện vượt qua **68 trong số 68** thử nghiệm xác định, khớp chính xác với đầu ra của trình biên dịch chính. Sự khác biệt duy nhất là cố hữu (dấu thời gian, `Math.random()`) và 11 bài kiểm tra bị bỏ qua vì chúng yêu cầu giao diện người dùng, bộ tính giờ, mật mã hoặc các tính năng dành riêng cho nền tảng chưa được triển khai.

Công việc chính đã đạt được điều đó:

-   **Gửi phương thức giao diện** — các biến kiểu giao diện hiện trả về các phương thức chính xác thông qua công văn dựa trên class_id trong ObjectHeader
-   **Quyền truy cập thuộc tính động** — gửi thời gian chạy cho tên thuộc tính được tính toán
-   **Đóng và liên kết này** — ngữ nghĩa nắm bắt chính xác cho các phương thức đối tượng
-   **Đang tiến hành giai đoạn 6** — không đồng bộ/chờ đợi, trình tạo và sửa lỗi điều kiện

Tính chẵn lẻ 100% trong các thử nghiệm xác định là một cột mốc quan trọng. Điều đó có nghĩa là tệp nhị phân `anvil` tự biên dịch tạo ra kết quả đầu ra giống hệt như trình biên dịch chính cho mọi kịch bản có thể kiểm tra. Khoảng cách đang thu hẹp theo hướng tự lưu trữ hoàn toàn.

## Hơn 50 bản sửa lỗi

Một bước tiến lớn về tính đúng đắn trong tuần này. Điểm nổi bật:

-   **JSON.parse** — mảng không còn bị cắt bớt ở 16 phần tử, dữ liệu nhập không hợp lệ được xử lý chính xác
-   **Uint8Array** — hàm tạo từ biến mảng, triển khai `.set(source, offset)` (không hoạt động)
-   **BigInt** — NaN-boxing với `BIGINT_TAG` cho lệnh gọi nhiều mô-đun, sửa lỗi cắt ngắn 32-bit keccak256
-   **Xâu chuỗi tùy chọn** — các biểu thức điều kiện lồng nhau, phát hiện toString, giá trị trả về NaN-boxing
-   **Bộ chỉ mục** — chuỗi NaN-boxing đã sửa để sử dụng `STRING_TAG` thay vì `POINTER_TAG`
-   **MySQL** — Các loại DATETIME và BLOB, `Date(string)`
-   **Math.min/max** — xử lý đối số trải rộng
-   **Gửi phương thức gốc** — quét trường và gọi cho các đối tượng `POINTER_TAG` đối tượng

Đây không phải là những trường hợp đặc biệt. JSON. Việc cắt bớt mảng ở 16 phần tử sẽ phá vỡ mọi ứng dụng thực tế. Uint8Array.set là một no-op sẽ âm thầm làm hỏng dữ liệu. Đây là các bản sửa lỗi khiến trình biên dịch gặp một lỗi về độ chính xác ở cấp độ sản xuất.

## Bằng số liệu

-   **103 cam kết** với trình biên dịch Perry chính
-   **3 phiên bản**: v0.2.195, v0.2.196, v0.2.197
-   **1 tính năng chính**: biên dịch chéo Windows từ Linux
-   **1 danh mục ứng dụng mới**: iOS vòng lặp trò chơi
-   **68/68** kiểm tra tính chẵn lẻ xác định ở perrysdad
-   **Hơn 50 bản sửa lỗi** trên NaN-boxing, stdlib và FFI gốc
-   **2 lần viết lại tài liệu**: perry.toml và Geisterhand
-   **5 cải tiến cho trung tâm**: quy trình hai giai đoạn, tự động khởi động Azure, tự động cập nhật cho nhân viên

## Tiếp theo là gì

Tính năng biên dịch chéo của Windows mở ra cơ hội cho CI/CD đa nền tảng hoàn toàn tự động — đẩy TypeScript, nhận các tệp nhị phân gốc cho mọi mục tiêu mà không cần máy xây dựng chuyên dụng cho từng hệ điều hành. Hỗ trợ vòng lặp trò chơi sẽ mở ra một danh mục ứng dụng iOS hoàn toàn mới. Và tính chẵn lẻ của thử nghiệm xác định 100% trong perrysdad có nghĩa là việc tự lưu trữ đang trở nên rất thực tế. Những gì còn lại:

-   **Hỗ trợ đầy đủ biểu thức chính quy** — khoảng cách ngôn ngữ lớn cuối cùng
-   **mở rộng perry/ui** — kéo và thả, nhãn trợ năng, DatePicker
-   **perrysdad Giai đoạn 6** — async/await, trình tạo, mở rộng tới Perry chẵn lẻ đầy đủ
-   **Hub beta công khai** — mở các bản dựng được phân phối cho người dùng bên ngoài

Theo dõi tiến trình trên [GitHub](https://github.com/PerryTS/perry), đọc tài liệu tại [docs.perryts.com](https://docs.perryts.com) hoặc kiểm tra [lộ trình](/vi/roadmap/) để có bức tranh toàn cảnh.
