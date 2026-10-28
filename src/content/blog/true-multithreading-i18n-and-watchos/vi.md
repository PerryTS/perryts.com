---
title: "Đa luồng thực sự, i18n thời điểm biên dịch và watchOS"
excerpt: "Perry v0.4.0: thread OS thực sự với an toàn tại thời điểm biên dịch, hệ thống quốc tế hóa không rườm rà cho hơn 30 ngôn ngữ, watchOS là mục tiêu biên dịch thứ 9, API âm thanh và camera, và pipeline biên dịch song song."
date: 2026-03-23
tags: ["threading", "i18n", "watchOS", "compiler", "milestone"]
---
Perry v0.4.0 là bản phát hành lớn nhất kể từ khi dự án bắt đầu. Ba bước nhảy phiên bản trong một chu kỳ — v0.3.0 (i18n), v0.3.2 (watchOS), v0.4.0 (đa luồng) — và bản thân trình biên dịch giờ đã song song. Đây là mọi thứ đã ra mắt.

## Đa luồng thực sự

Perry hiện có tính năng song song thực sự theo luồng của hệ điều hành. Không phải nhân viên web với chi phí tuần tự hóa. Không phải `SharedArrayBuffer` với `Atomics`. Luồng thực — luồng hệ điều hành có dung lượng nhẹ 8MB, không chia sẻ gì và không tốn phí khi ở chế độ rảnh.

Mô-đun `perry/thread` mới hiển thị ba nguyên hàm:

```
import { parallelMap, parallelFilter, spawn } from "perry/thread";

// Split work across all CPU cores, results in order
const results = parallelMap(largeArray, (item) => heavyComputation(item));

// Filter in parallel
const matches = parallelFilter(data, (item) => expensiveCheck(item));

// Spawn a background thread, get a Promise
const result = await spawn(() => {
  // runs on a separate OS thread
  return computeExpensiveResult();
});
```

`parallelMap` và `parallelFilter` tự động phát hiện số lượng lõi CPU và phân chia mảng đầu vào cho chúng. Đối với các mảng nhỏ, chúng bỏ qua hoàn toàn phân luồng và chạy đồng bộ — không tốn chi phí cho khối lượng công việc tầm thường.

`spawn` khởi chạy một chuỗi hệ điều hành nền và trả về một Lời hứa. Kết quả sẽ quay trở lại thông qua hàng đợi kết quả đang chờ xử lý đã cạn kiệt trong quá trình xử lý vi tác vụ, vì vậy, bạn `await` kết quả đó giống như mọi thao tác không đồng bộ khác.

### An toàn thời gian biên dịch

Phần quan trọng nhất không phải là API — mà là thứ mà trình biên dịch *ngăn chặn*. Perry từ chối tĩnh các lần đóng nắm bắt các biến có thể thay đổi:

```
let counter = 0;

// ✗ Compile error: closure captures mutable variable 'counter'
parallelMap(items, (item) => {
  counter++;  // rejected at compile time
  return item * 2;
});
```

Không có trạng thái có thể thay đổi được chia sẻ có nghĩa là không có cuộc đua dữ liệu. Không có khóa, không có mutex, không có `Atomics`. Trình biên dịch thực thi an toàn luồng trước khi một dòng mã máy được phát ra.

### Bên trong

Mỗi luồng công việc có vùng bộ nhớ riêng với tính năng dọn dẹp `Drop` — không có sự phối hợp GC giữa các luồng. Các giá trị được truyền qua bản sao sâu `SerializedValue`: chi phí bằng 0 cho số, O(n) cho chuỗi, mảng và đối tượng. Việc triển khai tồn tại trong một tệp Rust dài 1.120 dòng (`perry-runtime/src/thread.rs`) và không yêu cầu thay đổi nào đối với trình thu gom rác.

So sánh điều này với các phân lập V8, yêu cầu các vùng nhớ riêng biệt cho mỗi nhân viên với tổng chi phí ~2 MB cho mỗi vùng. Perry chỉ là pthread với đấu trường.

### Pipeline biên dịch song song

Bản thân trình biên dịch bây giờ cũng chạy song song. Bộ mã hóa mô-đun, các thẻ chuyển đổi (nhập JS, phiên bản gốc, đơn hình hóa) và quét ký hiệu `nm` đều chạy trên tất cả các lõi CPU thông qua rayon. Kết hợp với bản nâng cấp Cranelift 0.121 (từ 0.113 — tám phiên bản nhỏ của phân bổ đăng ký và cải tiến x64), quá trình biên dịch nhanh hơn đáng kể.

## i18n thời gian biên dịch (v0.3.0)

Perry không có nghi lễ nào cả. Chuỗi ký tự trong tiện ích giao diện người dùng được tự động coi là khóa có thể bản địa hóa. Các tệp dịch là JSON phẳng trong thư mục `locales/`. Tất cả quá trình xác thực diễn ra tại thời điểm biên dịch.

```
// locales/en.json
{ "greeting": "Hello, {name}!" }

// locales/de.json
{ "greeting": "Hallo, {name}!" }

// Your code — just use strings normally
Button({ title: "greeting", action: () => {} })
```

Trình biên dịch xác thực mọi thứ: thiếu bản dịch, tham số không khớp, lỗi dạng số nhiều. Các bản dịch được đưa vào hệ nhị phân dưới dạng bảng chuỗi 2D được nhúng với khả năng tra cứu thời gian chạy gần như bằng 0 — không cần phân tích cú pháp JSON khi khởi động.

### Bao gồm gì

-   **Quy tắc số nhiều CLDR** cho hơn 30 ngôn ngữ với `.one`/`.other`/`.few`/`.many`/`.zero`/`.two` hậu tố
-   **Trình bao bọc định dạng**: `Currency`, `Percent`, `ShortDate`, `LongDate`, `FormatNumber`, `FormatTime`, `Raw`
-   **Phát hiện ngôn ngữ gốc** trên tất cả các nền tảng: `CFLocaleCopyCurrent` (macOS/iOS), `GetUserDefaultLocaleName` (Windows), `system_property_get` (Android), `LANG`/`LC_ALL` (Linux)
-   **`perry i18n extract`** CLI: quét các tệp TS/TSX, tạo và cập nhật JSON giàn giáo
-   **Tạo tài nguyên gốc nền tảng**: iOS `.lproj` và thư mục `values-xx/` của Android
-   **`import { t } from "perry/i18n"`** để bản địa hóa các chuỗi không phải giao diện người dùng

Định cấu hình nó trong `perry.toml`:

```
[i18n]
locales = ["en", "de", "ja", "es", "fr"]
default_locale = "en"
currencies = { USD = "en", EUR = "de", JPY = "ja" }
```

## Ứng dụng watchOS Native (v0.3.2)

Perry hiện biên dịch thành watchOS — mục tiêu biên dịch thứ 9. Đây không phải là một trình bao bọc hoặc một ứng dụng đồng hành. Đó là một tệp nhị phân watchOS độc lập với giao diện SwiftUI gốc.

Trình kết xuất watchOS sử dụng **cách tiếp cận dựa trên dữ liệu**: Perry xây dựng cây giao diện người dùng thông qua các lệnh gọi `perry_ui_*` FFI và `PerryWatchApp.swift` được vận chuyển sẽ truy vấn cây và hiển thị các chế độ xem SwiftUI một cách phản ứng. 15 loại tiện ích con được hỗ trợ kèm theo sơ khai cho những loại tiện ích không được hỗ trợ.

```
# Compile for watchOS
perry compile main.ts --target watchos

# Run on Apple Watch simulator
perry run watchos

# Setup signing for watchOS
perry setup watchos
```

Quy trình đầy đủ hoạt động: `perry setup watchos` chia sẻ App Store Connect thông tin đăng nhập với iOS, `perry run watchos` tự động phát hiện Apple Watch và `perry publish watchos` gửi tới App Store.

Điều này cũng nâng tổng số **số mục tiêu của tiện ích lên bốn**: iOS (WidgetKit), Android (Glance), watchOS (WidgetKit) và Wear OS (Gạch). Mỗi cái có mục tiêu biên dịch và phần phụ trợ codegen riêng.

## API Âm thanh & Camera

Hai bản phát hành API phần cứng mới trong bản phát hành này:

### Ghi âm (`perry/system`)

Ghi âm thanh đa nền tảng với phép đo dB(A) trọng số A:

```
import { audioStart, audioStop, audioGetLevel, audioGetWaveformSamples } from "perry/system";

audioStart();
const level = audioGetLevel();    // dB(A) with EMA smoothing
const waveform = audioGetWaveformSamples();  // 256-sample ring buffer
audioStop();
```

Phần phụ trợ nền tảng: AVAudioEngine (macOS/iOS), AudioRecord qua JNI (Android), PulseAudio (Linux), WASAPI (Windows), getUserMedia + AnalyserNode (Web).

### Chụp bằng camera (`perry/ui`)

Xem trước máy ảnh gốc với lấy mẫu màu ở cấp pixel (iOS):

```
import { CameraView, cameraStart, cameraSampleColor } from "perry/ui";

cameraStart();
const [r, g, b] = cameraSampleColor(x, y);  // 5x5 averaging
```

## Gói hệ sinh thái

Đã ra mắt hai gói gốc của bên thứ nhất:

-   **perry/push** — Liên kết thông báo đẩy cho iOS/macOS: yêu cầu cấp quyền, truy xuất mã thông báo APNs, số lượng huy hiệu. Sơ khai Android có FCM đã được lên kế hoạch.
-   **perry/storekit** — Các ràng buộc mua hàng trong ứng dụng StoreKit 2: tải sản phẩm, mua hàng bằng biên lai JWS, kiểm tra đăng ký, khôi phục và trình xử lý giao dịch.

Cả hai đều tuân theo cùng một kiến ​​trúc: Khai báo TypeScript → Rust FFI thùng → Cầu nối Swift. Cài đặt dưới dạng phụ thuộc, nhập các hàm, `await` kết quả. Trình biên dịch xử lý tất cả các cầu nối gốc.

## Hạ tầng

-   **Cranelift 0.113 → 0.121** — tám phiên bản nhỏ của phân bổ đăng ký, sửa lỗi x64 và cải tiến căn chỉnh khe ngăn xếp
-   **Phân tách chức năng Windows** — tự động phân tách các chức năng có hơn 50 câu lệnh thành các phần tiếp theo để giải quyết các vấn đề về mã hóa Cranelift trên Windows
-   **Tải mô-đun-var có chọn lọc** — chỉ tải các biến cấp mô-đun được tham chiếu khi nhập hàm, giảm 26% kích thước nhị phân của Windows
-   **Nâng cấp Array.sort()** — từ sắp xếp chèn O(n²) sang sắp xếp kiểu TimSort O(n log n) kết hợp
-   **perry chạy android** — quy trình xây dựng APK đầy đủ: biên dịch, tạo dự án Gradle, AssembleDebug, cài đặt, khởi chạy
-   **Mục nhập Info.plist tùy chỉnh** — `[ios.info_plist]` trong perry.toml để biết mô tả về quyền riêng tư, lược đồ URL, chế độ nền

## Bằng số liệu

-   **Phiên bản**: 0.2.197 → 0.4.0 (ba cột mốc quan trọng)
-   **Mục tiêu biên dịch**: 8 → 9 (đã thêm watchOS)
-   **Mục tiêu của tiện ích**: 1 → 4 (iOS, Android, watchOS, Wear OS)
-   **Hộp mới**: perry-ui-watchos, perry-codegen-glance, perry-codegen-wear-tiles
-   **Tài liệu mới**: phân luồng (4 trang), i18n (4 trang), watchOS, tài liệu tiện ích mở rộng (3 → 8 trang)
-   **triển khai perry/thread**: 1.120 dòng Rust, không có thay đổi nào đối với GC

## Tiếp theo là gì

Nền tảng phân luồng mở ra rất nhiều điều: xử lý yêu cầu HTTP song song, thao tác tệp đồng thời và khối lượng công việc tính toán nặng mà trước đây bị chặn bởi thực thi đơn luồng. Về mặt ngôn ngữ, sự hỗ trợ đầy đủ của biểu thức chính quy vẫn là khoảng cách lớn nhất và việc mở rộng `perry/ui` (kéo và thả, khả năng truy cập, DatePicker) vẫn tiếp tục.

Theo dõi tiến trình trên [GitHub](https://github.com/PerryTS/perry), đọc tài liệu tại [docs.perryts.com](https://docs.perryts.com) hoặc kiểm tra [lộ trình](/vi/roadmap/) để có bức tranh toàn cảnh.
