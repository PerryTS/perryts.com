---
title: "tvOS, biên dịch chéo iOS từ Linux và Perry Login"
excerpt: "Perry v0.4.24: tvOS là mục tiêu biên dịch thứ 10, biên dịch chéo iOS và macOS từ Linux qua ld64.lld, perry login với thanh toán theo sử dụng, cải tiến UI Windows, công chứng macOS và 120 commit trong 5 ngày."
date: 2026-03-28
tags: ["tvOS", "cross-compilation", "billing", "Windows", "milestone"]
---
Năm ngày, 120 commit, và Perry nhảy từ v0.4.0 lên v0.4.24. Các điểm nổi bật: tvOS trở thành mục tiêu biên dịch thứ 10, ứng dụng iOS và macOS giờ có thể được build hoàn toàn từ Linux, perry login mang đến thanh toán theo sử dụng, và UI Windows được đại tu toàn diện. Đây là mọi thứ đã ra mắt.

## tvOS: Mục tiêu biên dịch thứ 10

Perry hiện đã biên dịch sang Apple TV. Mục tiêu tvOS sử dụng cùng một trình kết xuất SwiftUI như watchOS, chia sẻ kiến ​​trúc theo hướng dữ liệu trong đó Perry xây dựng một cây giao diện người dùng và ứng dụng máy chủ Swift được vận chuyển hiển thị nó một cách nguyên bản. Kết hợp với việc tích hợp WASM `@perry/threads` hiện có, các ứng dụng tvOS có thể chạy khối lượng công việc điện toán nặng ở chế độ nền trong khi vẫn giữ cho giao diện người dùng phản hồi nhanh.

```
# Compile for Apple TV
perry compile main.ts --target tvos

# Run on tvOS simulator
perry run tvos
```

Điều này nâng tổng số mục tiêu lên **10**: macOS, iOS, iPadOS, Android, Linux, Windows, watchOS, tvOS, WebAssembly và Web/JavaScript. Một cơ sở mã TypeScript, 10 kết quả đầu ra gốc.

## Biên dịch chéo iOS và macOS từ Linux

Perry hiện có thể xây dựng các nhị phân iOS và macOS hoàn toàn từ máy Linux bằng cách sử dụng `ld64.lld` làm trình liên kết Mach-O. Đây là phần còn thiếu cho CI/CD hoàn toàn tự động — đẩy TypeScript tới máy chủ Linux, nhận các tệp nhị phân gốc đã được ký cho mọi nền tảng Apple mà không cần máy xây dựng macOS.

Để đạt được điều này đòi hỏi phải giải quyết hàng loạt vấn đề về trình liên kết:

-   **Bộ ba mã hóa Mach-O** — đã thêm `aarch64-apple-macos` và `aarch64-apple-ios` mục tiêu tăng gấp ba lần cho Cranelift
-   **Liên kết khung** — Đường dẫn tìm kiếm khung CoreGraphics, Metal, IOKit, DiskArbitration để biên dịch chéo
-   **`-lobjc`** — Ký hiệu thời gian chạy ObjC cần thiết cho tất cả các mục tiêu của Apple
-   **SDK** — `sdk_version 26.0` trong ld64.lld (Apple yêu cầu iOS 18+)
-   **Tước bỏ chết** — `-dead_strip` thay vì `-Wl,-dead_strip` cho trình liên kết Mach-O
-   **Khấu trừ thời gian chạy** — loại bỏ `perry_runtime` trùng lặp khỏi các lib tĩnh của giao diện người dùng để tránh lỗi liên kết

Được kết hợp với Linux hiện có → Biên dịch chéo Windows (v0.2.195+), Perry giờ đây có thể biên dịch chéo sang **mọi nền tảng từ Linux** — iOS, macOS, Windows, Android, WASM và Web.

## Sẵn sàng cho iOS App Store

Trọng tâm chính của chu kỳ này là làm cho các ứng dụng Perry do iOS biên dịch hoàn toàn tuân thủ App Store:

-   **Thông tin đầy đủ** — tất cả các khóa do Apple yêu cầu: `CFBundleIdentifier`, `CFBundleName`, `CFBundleShortVersionString`, `CFBundleVersion`, `UIDeviceFamily`, `UIRequiredDeviceCapabilities`
-   **CFBundleIcons** — đặt tên biểu tượng iOS tiêu chuẩn (`AppIcon60x60@2x`, v.v.) với độ phân giải dự phòng
-   **Phiên bản từ perry.toml** — các trường `version` và `build_number` chuyển trực tiếp vào Info.plist
-   **UILaunchScreen** — sử dụng khóa hiện đại thay vì `UILaunchStoryboardName` (không cần tệp bảng phân cảnh)
-   **Cấu hình cung cấp** — macOS hỗ trợ cấu hình cung cấp cho App Store và phân phối TestFlight

## Perry Login và thanh toán

Perry hiện có tài khoản và thanh toán dựa trên mức sử dụng, được hỗ trợ bởi lệnh `perry login` CLI mới và trang tổng quan tại [app.perryts.com](https://app.perryts.com).

### Cách thức hoạt động

-   **`perry login`** — GitHub OAuth luồng thiết bị, mở trình duyệt, thăm dò ý kiến để hoàn thành
-   **Cấp miễn phí** — 15 bản dựng/tháng, dự án không giới hạn với tài khoản GitHub
-   **Cấp chuyên nghiệp** — bản dựng không giới hạn thông qua đăng ký Polar.sh
-   **API** — tạo và quản lý mã thông báo từ trang tổng quan cho CI/CD
-   **Theo dõi mức sử dụng** — xuất bản hàng tháng và xác minh bộ đếm bằng các thanh mức sử dụng theo thời gian thực

Bản thân trang tổng quan là một máy chủ Fastify do Perry biên dịch với tính năng xuất tĩnh Next.js — được xây dựng với Perry, phục vụ người dùng Perry.

## Công chứng macOS và ký mã

Hai khả năng ký mới:

-   **`perry publish macos --notarize`** — tự động chuyển sang chứng chỉ ID nhà phát triển (thay vì App Store), gửi tới dịch vụ công chứng của Apple và ghim kết quả
-   **Ký mã GCloud KMS** — Giờ đây, các bản dựng Windows có thể được ký bằng khóa Google Cloud KMS, cho phép đăng nhập CI tự động mà không để lộ khóa riêng tư

## Đại tu UI Windows

Phần phụ trợ giao diện người dùng Windows đã nhận được bản cập nhật toàn diện nhất từ trước đến nay:

-   **Chia tỷ lệ nhận biết GDP** — kích thước cửa sổ, phông chữ và kích thước tiện ích sẽ chia tỷ lệ chính xác trên màn hình có độ phân giải cao
-   **API cửa sổ kiểu trình khởi chạy** — cửa sổ không viền với vị trí tùy chỉnh cho giao diện người dùng kiểu trình khởi chạy/tiêu điểm
-   **Phím nóng chung** — phím tắt trên toàn hệ thống hoạt động ngay cả khi ứng dụng không được tập trung
-   **Biểu tượng ứng dụng** — `getAppIcon` API để hiển thị biểu tượng ứng dụng trong giao diện người dùng trình khởi chạy
-   **Bố cục an toàn Reentrancy** — `RefCell` được thay thế bằng `SetPropW` để tránh hiện tượng hoảng loạn trong các thông báo WM_PAINT lồng nhau
-   **Tích hợp Geisterhand** — tất cả các loại tiện ích được đăng ký với khung kiểm tra giao diện người dùng, `/type` sử dụng `SendMessageW` qua bản đồ HWND
-   **Hỗ trợ máy ảnh Android** — chụp ảnh API được mở rộng sang Android thông qua JNI

## Hiệu năng

v0.4.14 đã tiến hành kiểm tra hiệu suất toàn diện:

-   **`fcmp`** gốc — so sánh dấu phẩy động sử dụng các lệnh CPU gốc thay vì gọi hàm thời gian chạy. Điểm chuẩn Mandelbrot **nhanh hơn 30%**.
-   **Nối chuỗi tại chỗ** — `str += "text"` sửa đổi bộ đệm tại chỗ thay vì phân bổ một chuỗi mới. **Nhanh hơn 125 lần** để nối liên tục.
-   **Đoản mạch VÀ/HOẶC** — `&&` và `||` bỏ qua việc đánh giá toán hạng bên phải khi kết quả đã được xác định.
-   **Gấp theo nghĩa đen** — `-1`, `-0.5`, v.v. được gấp thành các hằng số ở cấp HIR thay vì phát ra lệnh phủ định.

## Build song song trên Hub

Máy chủ điều phối bản dựng hiện hỗ trợ các bản dựng đồng thời cho mỗi máy chạy:

-   **Điều phối dựa trên vị trí** — báo cáo công suất `max_concurrent` của công nhân, Hub theo dõi các công việc đang hoạt động trên mỗi công nhân
-   **Không còn 429 nữa** — xếp hàng công việc thay vì bị từ chối khi tất cả công nhân đều bận
-   **Tải xuống cấu phần phần mềm Base64** — các cấu phần phần mềm nhị phân được phân phát dưới dạng base64 khi thời gian chạy Perry không thể xử lý các phản hồi HTTP nhị phân thô
-   **Tự động kết nối lại WebSocket** — xây dựng các kết nối giám sát tự động kết nối lại khi ngắt kết nối

## Gói mới: perry/appstorereview

Gói mới của bên thứ nhất giúp nhắc nhở đánh giá cửa hàng ứng dụng:

```
import { requestReview } from "perry/appstorereview";

// Opens the native review prompt
// iOS: SKStoreReviewController
// Android: Play In-App Review API
requestReview();
```

Một chức năng, hai nền tảng, giao diện người dùng đánh giá gốc. Logic thời gian và hiển thị hoàn toàn được giao cho nhà phát triển.

## Sửa lỗi Codegen

120 lần xác nhận có nghĩa là sửa được rất nhiều lỗi. Tác động mạnh nhất:

-   **Sự bình đẳng nghiêm ngặt (===)** — ba lỗi riêng biệt đã được sửa trong phiên bản 0.4.2: so sánh thẻ loại, xử lý NaN và phân biệt null/không xác định
-   **So sánh chuỗi cho các chuỗi được nối** — `===` không thành công khi so sánh các chuỗi được tạo thông qua nối do so sánh con trỏ thay vì so sánh nội dung
-   **Độ phân giải của hàm tạo** — `new X(args)` hiện giải quyết chính xác các hàm tạo được nhập mô-đun chéo và các hàm tạo dựa trên bao đóng
-   **Đẩy mảng cấp mô-đun** — các giá trị được đẩy đến mảng cấp mô-đun bên trong các lệnh gọi hàm lồng nhau trong vòng lặp đã bị mất do con trỏ cũ sau khi phân bổ lại
-   **Cưỡng chế số học Null** — `null + 1` hiện tạo ra `1` chính xác thông qua `js_number_coerce`
-   **KHÔNG gói theo bit** — `~x`
-   **fetch().then()** — lệnh gọi lại không bao giờ được kích hoạt trong ứng dụng giao diện người dùng gốc do thiếu thoát vòng lặp sự kiện (v0.4.3)
-   **Các toán tử mô-đun và số mũ WASM** — `%` và `**` các toán tử gây ra lỗi xác thực WASM (v0.4.5)

## Bằng số liệu

-   **với trình biên dịch Perry chính trong 5 ngày**
-   **24 bản vá lỗi**: v0.4.1 → v0.4.24
-   **Mục tiêu biên dịch**: 9 → 10 (đã thêm tvOS)
-   **Biên dịch chéo các mục tiêu từ Linux**: Windows → Windows, iOS, macOS (tất cả Apple + Windows)
-   **Gói mới**: perry/appstorereview
-   **Cơ sở hạ tầng mới**: trang tổng quan app.perryts.com, thông tin đăng nhập perry CLI, thanh toán Polar.sh
-   **Tăng hiệu suất**: mandelbrot (fcmp gốc) nhanh hơn 30%, nối chuỗi nhanh hơn 125 lần

## Tiếp theo là gì

Biên dịch chéo iOS và macOS từ Linux có nghĩa là Hub giờ đây có thể xây dựng cho mọi nền tảng từ một máy chủ Linux duy nhất — không còn các máy xây dựng macOS chuyên dụng để biên dịch (chỉ để ký). Cơ sở hạ tầng thanh toán mở ra đường dẫn tới phiên bản beta công khai của Hub. Và với tvOS được thêm vào, Perry sẽ hỗ trợ mọi nền tảng của Apple: macOS, iOS, iPadOS, watchOS và tvOS.

-   **Hub beta công khai** — người dùng bên ngoài có thể đẩy TypeScript và nhận các tệp nhị phân gốc
-   **Hỗ trợ đầy đủ biểu thức chính quy** — khoảng cách ngôn ngữ lớn cuối cùng
-   **mở rộng perry/ui** — kéo và thả, khả năng truy cập, DatePicker
-   **Bản đồ nguồn và thông tin gỡ lỗi** — Thông tin gỡ lỗi DWARF để gỡ lỗi gốc

Theo dõi tiến trình trên [GitHub](https://github.com/PerryTS/perry), đọc tài liệu tại [docs.perryts.com](https://docs.perryts.com) hoặc kiểm tra [lộ trình](/vi/roadmap/) để có bức tranh toàn cảnh.
