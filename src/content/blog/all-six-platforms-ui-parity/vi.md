---
title: "Cả sáu nền tảng, đồng bộ tính năng hoàn toàn"
excerpt: "Hơn 20 widget UI gốc, widget Canvas, Table view, thông báo hệ thống, truy cập keychain, hỗ trợ nhiều cửa sổ và đồng bộ tính năng hoàn toàn trên macOS, iOS, iPadOS, Android, Linux và Windows — tất cả từ một mã nguồn TypeScript duy nhất."
date: 2026-02-28
tags: ["UI", "cross-platform", "release", "milestone"]
---
Khi chúng tôi ra mắt phiên bản đầu tiên của hệ thống UI native Perry, "đa nền tảng" có nghĩa là macOS hoạt động tốt và năm nền tảng còn lại chỉ là stub. Hôm nay, với v0.2.162, điều đó không còn đúng nữa. Tất cả sáu nền tảng — macOS, iOS, iPadOS, Android, Linux, và Windows — giờ chia sẻ đầy đủ tính năng tương đương. Cùng một mã TypeScript biên dịch thành widget native trên mọi target.

Bài viết này trình bày những gì chúng tôi ra mắt giữa v0.2.152 và v0.2.164: widget Canvas, triển khai NSTableView đầy đủ, hơn 20 widget UI, module `perry/system` module, hỗ trợ đa cửa sổ, thông báo hệ thống, truy cập keychain, tự động giảm kích thước binary, và hệ thống plugin thời gian biên dịch. Rất nhiều thứ đã xảy ra.

## Sprint Widget: Hơn 20 Component UI Native

Bước nhảy lớn nhất đến trong v0.2.155, ra mắt hơn 20 widget UI trên tất cả nền tảng. API UI TypeScript của Perry giờ bao gồm các component bạn thực sự cần để ra mắt ứng dụng thực:

-   **Layout** — VStack, HStack, ZStack, LazyVStack, ScrollView, SplitView
-   **Input** — Button, TextField, TextEditor, Checkbox, Toggle, Slider, Picker
-   **Hiển thị** — Text, Label, Hình ảnh, ProgressView, Divider, Spacer
-   **Dữ liệu** — List, Table (NSTableView / GTK4 TreeView / Win32 ListView)
-   **Overlay** — Alert, Sheet, Popover, Toolbar, NavigationBar
-   **Bản vẽ** — Canvas (Bản vẽ 2D API, được tăng tốc phần cứng trên mỗi nền tảng)

Đây không phải là wrapper xung quanh renderer tùy chỉnh. Mỗi widget biên dịch thành component native riêng của nền tảng: `NSButton` on macOS, `UIButton` on iOS, `GtkButton` on Linux, `android.widget.Button` on Android via JNI, and `CreateWindowEx` trên Windows. Hệ điều hành vẽ chúng, áp dụng theme, và xử lý trợ năng — Perry chỉ nối API TypeScript.

## Canvas: Vẽ 2D từ TypeScript

Một trong những bổ sung thú vị về mặt kỹ thuật là widget Canvas (v0.2.152). Nó cung cấp API vẽ 2D quen thuộc trực tiếp từ TypeScript — đường cong bezier, fill, stroke, blitting hình ảnh — và biên dịch thành backend 2D tăng tốc của nền tảng: Core Graphics trên macOS/iOS, Cairo trên Linux, Direct2D trên Windows, và Skia trên Android.

**canvas.ts**

```typescript
import { Canvas, Color } from 'perry/ui';
// Compiles to Core Graphics on macOS, Cairo on Linux, etc.
const canvas = new Canvas({ width: 400, height: 300 });
canvas.onDraw((ctx) => {
  ctx.fillStyle = Color.amber;
  ctx.fillRect(10, 10, 100, 60);
  ctx.strokeStyle = Color.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(200, 150, 80, 0, Math.PI * 2);
  ctx.stroke();
});
```

## Widget Table: NSTableView đến với TypeScript

v0.2.163 đã hạ cánh tiện ích Table — thành phần phức tạp nhất trong thư viện. Trên macOS, nó ánh xạ tới `NSTableView` với hệ thống dây nguồn dữ liệu/đại biểu đầy đủ. Trên Linux, nó sử dụng `GtkTreeView` của GTK4. Trên Windows, điều khiển `ListView` của Win32. Trên Android, nó liên kết với `RecyclerView` thông qua JNI.

TypeScript API mang tính khai báo: bạn xác định các cột, cung cấp nguồn dữ liệu và Perry xử lý việc nối dây dành riêng cho nền tảng tại thời gian biên dịch. Tất cả các tính năng sắp xếp cột, xử lý lựa chọn và tùy chỉnh chiều cao hàng đều hoạt động ngay lập tức.

**table.ts**

```typescript
import { Table, Column } from 'perry/ui';
const table = new Table({
  columns: [
    new Column({ title: "Name", key: "name", width: 200 }),
    new Column({ title: "Size", key: "size", width: 80 }),
  ],
  rows: files,  // TypeScript array of objects
  onSelect: (row) => console.log(row.name),
});
```

## Module perry/system

v0.2.155 cũng giới thiệu `perry/system` — mô-đun TypeScript hiển thị API hệ thống nền tảng mà không cần bất kỳ thời gian chạy nào: hộp thoại tệp, hộp thoại lưu, cảnh báo, trang tính, truy cập chuỗi khóa, thông báo hệ thống và quản lý nhiều cửa sổ.

-   `system.showOpenDialog()` — bộ chọn tệp gốc (NSOpenPanel / GTK FileChooser / Win32 OPENFILENAME)
-   `system.showSaveDialog()` — hộp thoại lưu gốc
-   `system.showAlert()` — bảng cảnh báo gốc
-   `system.notify()` — Thông báo hệ điều hành (UserNotifications / libnotify / WinRT)
-   `system.keychain.get/set()` — Dịch vụ chuỗi khóa / Dịch vụ bí mật / Cửa hàng thông tin xác thực Windows
-   `system.openWindow()` — quản lý nhiều cửa sổ

Tất cả các API này đều gọi trực tiếp API nền tảng gốc — không có Electron IPC, không có cầu nối xem web. Perry biên dịch trang web gọi TypeScript thành lệnh gọi hàm gốc trực tiếp vào nền tảng SDK.

## Tương đương tính năng sáu nền tảng: v0.2.162

Dấu mốc v0.2.162 là về việc thu hẹp khoảng cách. Trước bản phát hành này, macOS có bộ tính năng đầy đủ nhất, iOS hầu hết đều có ở đó và Linux/Windows/Android bị tụt hậu. v0.2.162 đưa cả sáu nền tảng lên cùng một cấp độ:

-   **macOS** — AppKit, bộ tiện ích hoàn chỉnh, Chuỗi khóa, thông báo, nhiều cửa sổ, thanh công cụ
-   **iOS / iPadOS** — UIKit, tính tương đương đầy đủ của tiện ích với macOS, vòng đời cảnh
-   **Android** — JNI cầu nối, tất cả tiện ích thông qua Chế độ xem Android, biên dịch chéo NDK
-   **Linux** — GTK4, bộ tiện ích đầy đủ bao gồm Table, hộp thoại tệp, chuỗi khóa libsecret
-   **Windows** — Win32, tất cả tiện ích, Windows Credential Store, thông báo WinRT

Đây là cột mốc khiến "một cơ sở mã, sáu nền tảng" trở thành hiện thực chứ không phải là khát vọng. Tệp TypeScript tương tự sẽ biên dịch thành ứng dụng gốc trên cả sáu mục tiêu mà không cần đường dẫn mã dành riêng cho nền tảng cho các trường hợp sử dụng thông thường.

## Tự động giảm kích thước Binary

v0.2.153 đã tự động giảm kích thước nhị phân — trình biên dịch giờ đây tích cực loại bỏ các đường dẫn mã không được sử dụng, loại bỏ các hàm stdlib không thể truy cập và loại bỏ các định nghĩa ký hiệu trùng lặp trong quá trình liên kết. Một công cụ CLI điển hình trước đây được biên dịch thành ~4 MB giờ đây có dung lượng dưới 2 MB mà không có thay đổi nào đối với nguồn của bạn.

Điều này quan trọng đối với việc triển khai thực sự. Khi tệp nhị phân của bạn là đơn vị triển khai — được sao chép vào máy chủ, được phân phối dưới dạng một tệp duy nhất, được nhúng trong vùng chứa — kích thước sẽ ảnh hưởng trực tiếp đến thời gian truyền và chi phí lưu trữ. Giảm một nửa kích thước nhị phân miễn phí là một cải tiến có ý nghĩa.

## Hệ thống Plugin thời gian biên dịch

v0.2.152 đã giới thiệu hệ thống plugin của Perry — và về mặt kiến ​​trúc, nó không giống mọi hệ thống plugin khác trong hệ sinh thái TypeScript. Không có tải plugin thời gian chạy, không có IPC, không có `require()` động. Plugin là các mô-đun TypeScript mà Perry phân giải và biên dịch tại thời điểm xây dựng.

Kết quả: các plugin có chi phí thời gian chạy chính xác bằng 0. Chúng biên dịch thành cùng một tệp nhị phân như mã ứng dụng của bạn, với các lệnh gọi hàm trực tiếp giữa mã plugin và mã máy chủ. Nếu bạn không sử dụng plugin, nó sẽ không xuất hiện trong tệp nhị phân của bạn. Nếu bạn sử dụng nó, nó sẽ được nội tuyến giống như bất kỳ mô-đun nào khác.

Chúng tôi đã viết về triết lý đằng sau điều này trong [Hệ thống plugin là thuế hiệu suất](/vi/blog/plugin-systems-are-a-performance-tax/). Phiên bản ngắn: kiến ​​trúc plugin thời gian chạy đánh đổi hiệu suất để có khả năng mở rộng. Thành phần trong thời gian xây dựng mang lại cho bạn cả hai.

## Cải tiến ngôn ngữ

Việc chạy nước rút giao diện người dùng không diễn ra một cách biệt lập — bản thân trình biên dịch ngày càng có nhiều khả năng hơn. Trên các bản phát hành này:

-   **Biểu thức lớp** — `const Foo = class extends Bar {}` hiện biên dịch chính xác
-   **Biến đổi trình tạo** — `function*` và `yield` biên dịch sang các máy trạng thái gốc
-   **Bản đồ/Đặt làm trường lớp** — `private items = new Map()` hoạt động trong codegen
-   **FFI ép buộc kiểu thông số** — lệnh gọi thư viện gốc tự động xử lý việc ép buộc kiểu
-   **Tham chiếu phương thức liên kết** — Tham chiếu `this.method` hoạt động cho các mô-đun gốc (fs, os, path)
-   `string.match()` — hiện được hỗ trợ đầy đủ
-   `path.isAbsolute()`, nhiều đối số `path.join()`, `path.resolve()`
-   **Mục tiêu web** — Perry hiện có thể biên dịch thành đầu ra tương thích với web để triển khai kết hợp

## Tiếp theo là gì

Với tính năng tương đương của giao diện người dùng sáu nền tảng được cung cấp, giai đoạn tiếp theo là chiều sâu hơn chiều rộng. Chúng tôi đang làm việc trên:

-   Hỗ trợ RegExp đầy đủ (`regex.test()`, `string.matchAll()`)
-   Kéo và thả, menu ngữ cảnh tùy chỉnh và nhãn trợ năng trong hệ thống tiện ích
-   Tiện ích mở rộng Mã VS dành cho Perry chẩn đoán và biên dịch khi lưu
-   Tích hợp trình quản lý gói — cài đặt và biên dịch Perry-gói gốc bằng một lệnh
-   Mục tiêu biên dịch WASM để triển khai trình duyệt
-   Đa luồng thông qua `Worker`

Nếu bạn muốn theo dõi, [Perry repo](https://github.com/PerryTS/perry) đã mở. Xem [showcase](/vi/showcase/) để thấy những gì đang được xây dựng, hoặc duyệt [roadmap](/vi/roadmap/) để có bức tranh toàn cảnh.
