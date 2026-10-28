---
title: "Hệ thống plugin là một loại thuế hiệu năng"
excerpt: "Kiến trúc plugin đánh đổi hiệu năng lấy khả năng mở rộng. Nhưng nếu khả năng mở rộng diễn ra lúc biên dịch thay vì lúc chạy thì sao? Kết hợp tại thời điểm biên dịch mang đến cả hai — không có chi phí, linh hoạt hoàn toàn."
date: 2026-02-27
tags: ["architecture", "performance", "compiler"]
---
Bạn cài VS Code. Nó nhanh. Bạn thêm 15 extension. Bây giờ nó mất 4 giây để khởi động và Extension Host ngốn 800 MB RAM. Chuyện gì đã xảy ra?

Pattern này lặp lại ở khắp nơi: WordPress, Eclipse, Chrome, Figma, Slack. Ứng dụng ra mắt nhanh. Plugin làm nó chậm. Không ai ngạc nhiên nữa — chúng ta đã chấp nhận nó như chi phí của khả năng mở rộng.

Nhưng hệ thống plugin không chỉ là vấn đề hiệu năng. Chúng là vấn đề triết lý thiết kế. Ngành công nghiệp đã nhầm lẫn "khả năng mở rộng" với "tính động runtime" khi thường câu trả lời tốt hơn là tổ hợp tại thời điểm biên dịch. Plugin hiệu quả duy nhất là những plugin ngừng là plugin tại thời điểm biên dịch.

## Phổ hiệu năng của khả năng mở rộng

Không phải mọi khả năng mở rộng đều tốn kém như nhau. Có một phổ từ chi phí bằng không đến chi phí tối đa, và phần lớn ngành công nghiệp đã chọn phía đắt đỏ:

1.  **Liên kết tĩnh / module thời gian biên dịch** — chi phí bằng không. Thư viện C, crate Rust, package Go. Ranh giới module biến mất hoàn toàn trong binary cuối cùng.
2.  **Thư viện chia sẻ được nạp khi khởi động** — gần bằng không. Module nginx, module kernel Linux. Chi phí một lần khi nạp, sau đó là gọi hàm trực tiếp.
3.  **Dispatch động qua interface / vtable** — overhead nhỏ. Plugin game engine C++. Một lần gián tiếp con trỏ mỗi lần gọi.
4.  **Plugin interpreted cùng tiến trình** — overhead vừa phải. Plugin PHP WordPress, bundle Eclipse OSGi.
5.  **Plugin tiến trình riêng qua IPC** — overhead đáng kể. Extension VS Code, extension Chrome.
6.  **Plugin sandbox qua IPC tuần tự hóa** — nặng. Plugin Figma, content script extension trình duyệt.

## Thiệt hại thực tế

### WordPress

Mỗi plugin hook vào vòng đời request. 30 plugin nghĩa là 30 lớp gọi hàm mỗi lần tải trang. Kết quả: các plugin caching tồn tại chỉ để giảm thiểu thiệt hại từ các plugin khác. Plugin hiệu năng để sửa vấn đề hiệu năng mà plugin tạo ra. Sự mỉa mai tự viết nên.

### VS Code

Các extension chia sẻ một event loop Node.js trong một tiến trình riêng. Một extension hoạt động sai sẽ chặn tất cả các extension khác. Extension Host thường xuất hiện là tiến trình tiêu thụ CPU hàng đầu trên máy của developer. Microsoft đã xây dựng công cụ profiling, lệnh bisect, và hệ thống activation event — cả một cơ sở hạ tầng để quản lý vấn đề mà extension tạo ra.

### Eclipse

Câu chuyện cảnh báo. Phân giải bundle OSGi, overhead class loading, đồ thị dependency khổng lồ. Từng là IDE phổ biến nhất, giờ phần lớn bị developer chính thống bỏ rơi. Kiến trúc plugin được cho là sức mạnh lớn nhất đã trở thành điểm yếu quyết định.

### Electron

Vấn đề plugin ở cấp nền tảng. Mỗi ứng dụng Electron đi kèm runtime Chromium + Node.js đầy đủ. VS Code là Electron. Slack là Electron. Discord là Electron. Mỗi cái độc lập tiêu thụ 300–500 MB RAM để render thực chất chỉ là một cửa sổ chat hoặc trình soạn thảo văn bản.

## Tại sao ngành công nghiệp vẫn chọn Plugin

Nếu plugin tốn kém như vậy, tại sao mọi người vẫn xây dựng chúng? Lý do chủ yếu là tổ chức, không phải kỹ thuật.

## Giải pháp thay thế: Tổ hợp tại thời điểm biên dịch

Nếu khả năng mở rộng xảy ra tại thời điểm build thay vì runtime thì sao?

Đây không phải là giả thuyết. Có những tiền lệ đã được chứng minh trong các ngôn ngữ hệ thống:

## Điều này có ý nghĩa gì cho TypeScript

TypeScript là ngôn ngữ phổ biến nhất cho xây dựng công cụ mở rộng — và tệ nhất về hiệu năng runtime. Toàn bộ hệ sinh thái TypeScript chạy trên Node.js, chạy trên V8, JIT-biên dịch JavaScript.

Đây là nơi Perry xuất hiện. Perry biên dịch TypeScript trực tiếp thành binary native. Không V8, không khởi động JIT, không tạm dừng garbage collection, không ranh giới IPC.

```text
# Your app, your dependencies, your "plugins" — one binary
$ perry compile server.ts -o server
Compiling server.ts + 43 modules...
✓ Built executable: server (1.8 MB, 0.7s)
$ ./server
Listening on port 3000
```

## Khả năng mở rộng bạn thực sự cần

Phản đối là hiển nhiên: "Nhưng tôi cần khả năng mở rộng runtime. Người dùng cần cài plugin mà không cần biên dịch lại."

Thực sự không? Đối với hầu hết ứng dụng, tập hợp extension được biết tại thời điểm build.

## Con đường phía trước

Sự nghiện ngập của ngành công nghiệp đối với kiến trúc plugin là triệu chứng của việc chấp nhận overhead runtime là không thể tránh khỏi. Nhưng không phải vậy. Trình biên dịch có thể làm công việc đó. Tổ hợp tại thời điểm build mang lại khả năng mở rộng mà không phải trả thuế.

Hệ thống plugin nhanh nhất là hệ thống không tồn tại tại runtime.
