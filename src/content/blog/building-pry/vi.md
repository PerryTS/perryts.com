---
title: "Xây dựng Pry: Trình xem JSON gốc bằng TypeScript"
excerpt: "Hướng dẫn xây dựng Pry, một trình xem JSON gốc được biên dịch từ TypeScript thành mã máy có thời gian chạy Perry và GC được liên kết trong đó và không có chế độ xem web."
date: 2025-02-20
tags: ["tutorial", "showcase", "Pry"]
---
Pry là một trình xem JSON native được xây dựng hoàn toàn bằng TypeScript và biên dịch với Perry. Đây không phải là một bản demo công nghệ — đây là một công cụ thực sự mà chúng tôi sử dụng hàng ngày để kiểm tra phản hồi API, tệp cấu hình, và data dump. Bài viết này hướng dẫn cách nó được xây dựng, cách biên dịch, và trải nghiệm phát triển ra sao khi TypeScript được biên dịch thành ứng dụng native.

## Pry làm gì

Pry đọc một tệp JSON (hoặc nhận JSON từ stdin) và render nó như một cây tương tác, có thể điều hướng trong một cửa sổ native. Nếu bạn đã dùng Quick Look tích hợp của macOS cho JSON, hãy tưởng tượng như vậy — nhưng nhanh hơn, có thể tìm kiếm, và với điều hướng bằng bàn phím.

Bộ tính năng:

-   **Chế độ xem cây** — các nút có thể thu gọn cho đối tượng và mảng, với chỉ báo độ sâu và mở rộng/thu gọn tất cả
-   **Tìm kiếm** — tìm kiếm toàn văn bản trên khóa và giá trị với highlight thời gian thực và điều hướng kết quả
-   **Phím tắt** — phím mũi tên để điều hướng, enter để mở rộng/thu gọn, dấu gạch chéo để tìm kiếm, `⌘C` để sao chép
-   **Clipboard** — sao chép bất kỳ nút hoặc cây con nào dưới dạng JSON đã định dạng
-   **Tô màu cú pháp** — chuỗi màu xanh lá, số màu cam, boolean màu tím, null màu đỏ
-   **Thanh trạng thái** — hiển thị tổng số nút, độ sâu hiện tại, kích thước tệp, và thời gian phân tích

## Mã nguồn

Pry được viết bằng TypeScript tiêu chuẩn. Không có cú pháp đặc biệt, không có macro, không có sinh mã tại thời điểm build. Nó sử dụng API UI của Perry, cung cấp các widget native biên dịch thành mã dành riêng cho từng nền tảng.

Đây là điểm khởi đầu (đã đơn giản hóa cho rõ ràng):

**pry.ts**

```typescript
import { App, VStack, TreeView, SearchBar, StatusBar, State }
from "perry/ui";
import { readFile, readStdin } from "perry/fs";
// Read input from file arg or stdin
const input = process.argv[2]
? readFile(process.argv[2])
: readStdin();
const startTime = Date.now();
const data = JSON.parse(input);
const parseMs = Date.now() - startTime;
// Reactive state
const searchQuery = new State("");
const matchCount = new State(0);
// Build the app
const app = new App("Pry", {
width: 800,
height: 600,
minWidth: 400,
minHeight: 300,
});
app.body(() => {
return VStack({ spacing: 0 }, [
SearchBar({
placeholder: "Search keys and values...",
onSearch: (q) => searchQuery.value = q,
}),
TreeView(data, {
collapsible: true,
syntaxHighlight: true,
searchQuery: searchQuery,
onMatchCount: (n) => matchCount.value = n,
copyOnClick: true,
}),
StatusBar([
`${countNodes(data)} nodes`,
`Parsed in ${parseMs}ms`,
`${matchCount.value} matches`,
]),
]);
});
app.registerShortcut("/", () => app.focusSearchBar());
app.registerShortcut("Escape", () => {
searchQuery.value = "";
app.focusTree();
});
app.run();
```

Đó là cốt lõi của một ứng dụng native. Không có boilerplate framework, không có cấu hình build, không có tệp dành riêng cho nền tảng. Một tệp TypeScript.

### Các hàm trợ giúp

Pry cũng bao gồm tiện ích `countNodes` đệ quy đếm tất cả các nút trong cây JSON, và hàm trợ giúp `formatBytes` để hiển thị kích thước tệp. Đây là các hàm TypeScript tiêu chuẩn — không có gì đặc thù Perry. Chúng được biên dịch thành mã native giống như mọi thứ khác.

**utils.ts**

```typescript
export function countNodes(data: unknown): number {
if (data === null || typeof data !== "object") {
return 1;
}
if (Array.isArray(data)) {
return 1 + data.reduce((sum, item) => sum + countNodes(item), 0);
}
const values = Object.values(data as Record<string, unknown>);
return 1 + values.reduce((sum, val) => sum + countNodes(val), 0);
}
```

## Biên dịch Pry

Biên dịch Pry với Perry là một lệnh duy nhất. Không cần dự án Xcode, không cần cấu hình Gradle, không cần cấu hình webpack. Chỉ cần trỏ Perry tới tệp đầu vào và chỉ định target.

### macOS (ARM64)

```
$ perry build pry.ts --target macos-arm64
Parsing pry.ts...
Resolving imports: perry/ui, perry/fs
Compiling (cranelift, arm64)...
Linking with AppKit.framework...
✓ Built executable: pry (48 MB)
$ file pry
pry: Mach-O 64-bit executable arm64
$ otool -L pry | head -5
pry:
/System/Library/Frameworks/AppKit.framework/AppKit
/System/Library/Frameworks/Foundation.framework/Foundation
/usr/lib/libSystem.B.dylib
```

Binary có kích thước 48 MB vì nó bao gồm toàn bộ stack UI AppKit — render chế độ xem cây, highlight tìm kiếm, tô màu cú pháp, và xử lý bàn phím. Để so sánh, cùng ứng dụng trong Electron sẽ là 200+ MB. Một ứng dụng Perry chỉ CLI biên dịch thành 2–5 MB.

### iOS

```
$ perry build pry.ts --target ios-arm64
✓ Built executable: pry (52 MB)
```

Bản build iOS liên kết với UIKit thay vì AppKit. Perry ánh xạ cùng API `TreeView` tới `UITableView` với các section có thể mở rộng, `SearchBar` tới `UISearchBar`, và sự kiện chạm thay thế sự kiện chuột. Bản build iOS có thể triển khai lên thiết bị vật lý và simulator.

### Android

```
$ perry build pry.ts --target android-arm64
✓ Built: pry.apk
```

Bản build Android sinh một thư viện native được nạp qua JNI, đóng gói thành APK. `TreeView` ánh xạ tới `RecyclerView` với view holder có thể mở rộng, `SearchBar` ánh xạ tới `EditText` với `TextWatcher`, và thanh trạng thái ánh xạ tới `TextView` ở cuối layout.

## Chuyện gì xảy ra bên trong

Khi Perry biên dịch Pry, nó trải qua nhiều giai đoạn:

1.  **Phân tích cú pháp** — SWC phân tích mã nguồn TypeScript thành AST. Import từ `perry/ui` và `perry/fs` được giải quyết tới các triển khai module tích hợp của Perry.
2.  **Phân tích kiểu** — Perry giải quyết tất cả các kiểu, bao gồm generic `State<string>` và `State<number>`, đơn hình hóa chúng thành các kiểu cụ thể.
3.  **Giải quyết nền tảng** — Dựa trên cờ target, Perry chọn backend UI phù hợp. Mỗi lệnh gọi `TreeView`, `SearchBar`, và `Button` được giải quyết tới triển khai dành riêng cho nền tảng.
4.  **Sinh IR** — Perry sinh biểu diễn trung gian bao gồm các lệnh gọi API native — gửi tin nhắn Objective-C cho macOS/iOS, lệnh gọi JNI cho Android, lệnh gọi hàm C cho GTK4/Win32.
5.  **Sinh mã** — Cranelift biên dịch IR thành mã máy native cho kiến trúc đích.
6.  **Liên kết** — Mã native được liên kết với các framework nền tảng (AppKit, UIKit, Android NDK, GTK4, hoặc Win32) để tạo ra tệp thực thi cuối cùng.

## Không Runtime, Không Web View

Điều này đáng nhấn mạnh vì đó là sự khác biệt cốt lõi giữa Perry và mọi cách tiếp cận TypeScript-to-native khác. Binary Pry đã biên dịch có:

-   **Không JavaScript engine** — không V8, không Hermes, không JavaScriptCore
-   **Không web view** — không Chromium, không WebKit, không WKWebView
-   **Không lớp bridge** — không tin nhắn tuần tự hóa giữa JS và native
-   **Không framework runtime** — không React, không Flutter engine, không Dart VM

Binary gọi trực tiếp API nền tảng. Trên macOS, nó gọi `objc_msgSend` để tương tác với các đối tượng AppKit. Trên Android, nó gọi các hàm JNI để tạo và thao tác Views. Đó chính xác là điều một ứng dụng Swift hoặc Kotlin native sẽ làm.

Hệ quả thực tế: Pry khởi chạy ngay lập tức. Không có khởi động VM, không có khởi động JIT, không có phân tích script. Tiến trình khởi động, cửa sổ xuất hiện, JSON được render. Sử dụng bộ nhớ chỉ là một phần nhỏ so với Electron tương đương.

## Trải nghiệm phát triển

Xây dựng Pry cảm thấy tương tự đáng ngạc nhiên với xây dựng bất kỳ ứng dụng TypeScript nào. Quy trình làm việc là:

1.  Viết TypeScript trong trình soạn thảo (VS Code, Zed, Neovim, tùy bạn chọn)
2.  Chạy `perry compile pry.ts`
3.  Thực thi `./pry test.json`
4.  Lặp lại

Không cần cấu hình dự án Xcode. Không cần cài Android Studio. Không có build Gradle mất 45 giây. Trình biên dịch Perry rất nhanh — phân tích và biên dịch Pry mất vài giây, và chúng tôi đang tích cực làm cho nó nhanh hơn.

TypeScript bạn viết là TypeScript tiêu chuẩn. Kiểm tra kiểu, autocomplete, và công cụ refactoring của trình soạn thảo đều hoạt động. Bạn có thể tách hàm, tạo module, sử dụng generics — tất cả các pattern TypeScript bạn đã biết.

## Những gì chúng tôi đã học

Xây dựng Pry đã dạy chúng tôi nhiều về những gì API UI của Perry cần hỗ trợ. Một số bài học:

-   **Chế độ xem cây rất phức tạp.** Mở rộng, thu gọn, highlight tìm kiếm, điều hướng bàn phím, và tích hợp clipboard đều cần phối hợp. Widget `TreeView` của Perry xử lý nội bộ điều này, nhưng chúng tôi phải đảm bảo triển khai native nhất quán trên cả ba nền tảng.
-   **Phím tắt cần tuân theo quy ước nền tảng.** Trên macOS, đó là `⌘C` để sao chép. Trên Linux và Android, đó là `Ctrl+C`. Hệ thống phím tắt của Perry trừu tượng hóa điều này, nhưng cần triển khai cẩn thận để làm đúng.
-   **Thanh trạng thái phức tạp một cách đáng ngạc nhiên.** Mỗi nền tảng có quy ước khác nhau về nơi và cách hiển thị thông tin trạng thái. AppKit sử dụng thanh dưới cùng của cửa sổ, UIKit sử dụng toolbar, Android sử dụng view ở cuối layout. Widget `StatusBar` của Perry ánh xạ đúng cho từng nền tảng.
-   **Hỗ trợ stdin yêu cầu nhận biết nền tảng.** Trên macOS và Linux, đọc từ stdin rất đơn giản. Trên iOS và Android, "stdin" không thực sự tồn tại theo cách tương tự, nên Pry sử dụng chọn tệp trên nền tảng di động. `readStdin` của Perry xử lý điều này một cách trong suốt.

## Hiệu năng

Pry xử lý tệp JSON lớn một cách thoải mái. Trong thử nghiệm:

-   Tệp JSON 1 MB (hơn 10.000 nút) phân tích và render trong dưới 50 ms
-   Tệp JSON 10 MB render trong dưới 200 ms
-   Tìm kiếm trên 10.000 nút trả kết quả khi bạn gõ, không có lag nhìn thấy được
-   Sử dụng bộ nhớ dưới 50 MB ngay cả với tệp lớn

Đây là lợi thế của biên dịch native. Phân tích JSON trong Perry được biên dịch thành vòng lặp native chặt chẽ không có tạm dừng GC. Render cây sử dụng chế độ xem danh sách ảo hóa của nền tảng (NSOutlineView, UITableView, RecyclerView), đã được kiểm chứng về hiệu năng.

## Mã nguồn và tải về

Pry là mã nguồn mở. Bạn có thể duyệt toàn bộ mã nguồn, tự build, hoặc chỉ xem mã để hiểu cấu trúc của một ứng dụng UI native Perry.

-   [Repo GitHub](https://github.com/perryts/pry) — mã nguồn đầy đủ và hướng dẫn build
-   [Trang showcase](/vi/showcase/pry/) — ảnh chụp màn hình, danh sách tính năng, và chi tiết nền tảng

Nếu bạn đang xây dựng thứ gì đó với Perry, chúng tôi muốn nghe về nó. Mở một issue trên [repo Perry](https://github.com/PerryTS/perry) hoặc bắt đầu thảo luận. Chúng tôi đang xây dựng Perry một cách công khai và phản hồi từ người dùng thực xây dựng ứng dụng thực là vô giá.
