---
title: "Đưa ứng dụng chỉ dành cho Apple Watch lên App Store khi mọi cách khác đều thất bại"
excerpt: "Mọi cách được tài liệu hướng dẫn để tải ứng dụng watchOS độc lập lên App Store đều thất bại: altool, iTMSTransporter, xcodebuild và cả Organizer của Xcode 26 đều từ chối nền tảng này. Giải pháp chưa được ghi trong tài liệu nhưng hoạt động và giữ arm64_32 cho Watch đời cũ là một stub iOS được đánh dấu ITSWatchOnlyContainer, tải lên bằng iTMSTransporter."
date: 2026-07-07
tags: ["watchOS", "App Store", "iOS", "how-to"]
---
**dB Meter** là máy đo mức âm thanh dành cho Apple Watch — một ứng dụng watchOS độc lập không có iPhone, được biên soạn từ một TypeScript tệp có Perry. Việc xây dựng và chạy nó trên đồng hồ thông minh là phần mà chúng tôi cho rằng sẽ khó khăn. Phần thực sự tốn một ngày là đưa ứng dụng *vào App Store*. Mọi đường dẫn tải lên được ghi lại đều từ chối một ứng dụng watchOS độc lập và cách giải quyết hiệu quả hầu như không được viết ra. Bài đăng này là trang bị thiếu đó.

Phiên bản ngắn: để phát hành một ứng dụng chỉ dành cho đồng hồ thông minh, bạn gói nó trong một iOS *sơ khai vùng chứa* được gắn cờ `ITSWatchOnlyContainer` và tải nó lên bằng `iTMSTransporter` — không phải Xcode, không phải `altool`. Phiên bản dài có ba quả mìn mà mỗi quả phải tốn một chuyến khứ hồi đến máy chủ của Apple để khám phá.

## Ứng dụng

dB Meter là một ứng dụng `WKWatchOnly`: nó tự chạy trên đồng hồ thông minh mà không cần ứng dụng iPhone được ghép nối. Perry biên dịch TypeScript thẳng thành tệp nhị phân watchOS gốc và phân phối dưới dạng lát **phổ quát** — `arm64` cho Series 9/10/11 và Ultras, cùng với `arm64_32` (ILP32: thanh ghi 64 bit, con trỏ 32 bit) cho Series 4 đến 8 và SE. Phần thứ hai rất quan trọng: không có nó, mọi thứ từ Series 4 đến SE 2 đều không thể cài đặt ứng dụng. Việc duy trì `arm64_32` tồn tại hóa ra lại là hạn chế loại trừ giải pháp hiển nhiên.

## Không có gì có thể tải lên ứng dụng đồng hồ thông minh độc lập

`.ipa` chỉ dành cho đồng hồ thông minh là một gói có ứng dụng cấp cao nhất khai báo `CFBundleSupportedPlatforms = [WatchOS]`. Công cụ phân phối dòng lệnh của Apple không biết phải làm gì với điều đó:

```
# altool has no watchOS product type
$ xcrun altool --validate-app -f Watch.ipa --type ios ...
ERROR: Cannot determine the 'platform' from the info.plist. (19)

# iTMSTransporter's asset-file mode rejects the platform alias outright
$ xcrun iTMSTransporter -m upload -assetFile Watch.ipa -apiKey ... -apiIssuer ...
ERROR: Could not resolve the software platform: Unknown platform alias received: watchOS
```

Vì vậy, bạn chuyển sang Xcode. Nhưng `xcodebuild -exportArchive` với `method: app-store-connect` không thành công trong quá trình liệt kê phương thức và lý do mang tính hướng dẫn — trên Xcode 26, sổ đăng ký phương thức phân phối có *không có App Store tùy chọn* cho kho lưu trữ watchOS:

```
Accepted distribution method WatchOSAdHoc
Accepted distribution method WatchOSEnterprise
Accepted distribution method WatchOSDevelopmentSigned
error: exportArchive exportOptionsPlist error for key "method"
       expected one {release-testing, enterprise, debugging} but found app-store-connect
```

GUI tổ chức hiển thị chính xác ba ô giống nhau — Kiểm tra bản phát hành, Doanh nghiệp, Gỡ lỗi và "Tùy chỉnh" không dẫn đến hữu ích gì. Đặc biệt, doanh nghiệp, phát triển. Không có App Store. Trên phiên bản Xcode được cài đặt ngày hôm nay, không có cách nào được hỗ trợ để đẩy ứng dụng đồng hồ thông minh độc lập lên App Store Connect thông qua cửa trước của chính Apple.

## Bẫy đồng hành

Bí quyết thoát hấp dẫn là ngừng chỉ sử dụng đồng hồ thông minh. Gửi một ứng dụng iOS thực sự để *nhúng* ứng dụng đồng hồ thông minh tại `Payload/YourApp.app/Watch/`, cách thức phân phối các ứng dụng đồng hồ thông minh trong nhiều năm. Tệp đó tải lên hoàn toàn bằng `altool --type ios`, vì gói cấp cao nhất là một ứng dụng iOS thông thường.

Nó cũng khiến bạn gặp phải hai vấn đề. Đầu tiên, App Store Connect hiện nhìn thấy một ứng dụng iPhone và **yêu cầu iPhone ảnh chụp màn hình** — và một ứng dụng iPhone không làm gì khác ngoài việc nói "mở cái này trên đồng hồ thông minh của bạn" là một ứng cử viên cho 4.2 từ chối chức năng tối thiểu. Thứ hai, và cũng là điều nguy hiểm đối với chúng tôi: tệp nhị phân iOS *cấp cao nhất* không được chứa lát cắt `arm64_32`. Trình xác thực của Apple từ chối nó:

```
Unsupported Architectures. The executable for YourApp.app
contains unsupported architectures '[arm64_32]'.
```

Vì vậy, cấu trúc đồng hành buộc bạn phải loại bỏ `arm64_32` và chuyển sang sử dụng arm64, loại bỏ mọi đồng hồ thông minh Series 4–8 và SE — bao gồm cả Series 7 mà chúng tôi đang thử nghiệm. Bẫy đồng hành trao đổi hỗ trợ đồng hồ thông minh cũ hơn của bạn để tải lên hoạt động. Chúng tôi không muốn giao dịch đó.

## Vùng chứa chỉ dành cho đồng hồ thông minh

Câu trả lời thực sự là giữ ứng dụng đồng hồ thông minh chỉ dành cho đồng hồ thông minh *và* giữ `arm64_32`. Bạn lồng ứng dụng đồng hồ thông minh bên trong một iOS **sơ khai vùng chứa** nhỏ và bạn gắn cờ sơ khai đó để App Store Connect coi toàn bộ nội dung này là một sản phẩm chỉ dành cho đồng hồ thông minh. Hai khóa Info.plist thực hiện việc gắn cờ và chúng là toàn bộ thủ thuật:

```
Payload/
  dB Meter.app/                     ← iOS stub, arm64, bundle id = the App Store record's id
    Info.plist                      ← ITSWatchOnlyContainer=true, LSApplicationLaunchProhibited=true
    Watch/
      dbmeter-watch.app/            ← the real app: watchOS, arm64_32 + arm64
        Info.plist                  ← WKWatchOnly=true, WKApplication=true
```

`ITSWatchOnlyContainer=true` cho App Store Connect biết rằng gói iOS này chỉ là phương tiện phân phối ứng dụng đồng hồ thông minh bên trong nó." Chìa khóa duy nhất đó chính là nguyên nhân khiến yêu cầu về ảnh chụp màn hình iPhone biến mất — cửa hàng phân loại sản phẩm là chỉ dành cho đồng hồ thông minh. `LSApplicationLaunchProhibited=true` cho biết bản sơ khai chưa bao giờ được khởi chạy, vì vậy nó không cần phải là một ứng dụng thực sự; nó chỉ cần tồn tại để nền tảng cấp cao nhất đọc là iOS và các công cụ phân phối ngừng phàn nàn. Ứng dụng đồng hồ thông minh bên trong giữ `WKWatchOnly=true` và *no* `WKCompanionAppBundleIdentifier` — nó không phải là bạn đồng hành với sơ khai, sơ khai là một lớp bao bọc xung quanh nó.

Các khóa Info.plist còn lại của sơ khai là bản soạn sẵn mà người xác thực yêu cầu: `UIDeviceFamily=[1,2]`, tất cả bốn `UISupportedInterfaceOrientations`, `CFBundleSupportedPlatforms=[iPhoneOS]`, và — vì sơ khai là arm64 — `UIRequiredDeviceCapabilities=[arm64]`. Sơ khai không mang biểu tượng nào cả; ứng dụng đồng hồ thông minh mang chúng.

Sau đó, bạn tải lên với `iTMSTransporter`, có chế độ `-assetFile` rất vui vì gói cấp cao nhất là iOS:

```
xcrun iTMSTransporter -m upload -assetFile "dB Meter.ipa" \
  -apiKey MPJ792KV5Z -apiIssuer <issuer>
...
1 package was uploaded successfully
```

Bản dựng dựa trên App Store Connect dưới dạng bản dựng watchOS, `arm64_32` còn nguyên vẹn và phiên bản ngừng yêu cầu ảnh chụp màn hình iPhone.

## Ba quả mìn trên đường đi

Mỗi tệp trong số này đều là tệp tải lên không thành công được trả về từ trình xác thực của Apple, chứ không phải thứ mà công cụ địa phương phát hiện được:

1.  **Stub không thể là một bản nhị phân vừa tạo bằng `swiftc`.** Biên dịch một stub UIKit đơn giản bằng iOS SDK của Xcode đang cài đặt sẽ bị từ chối vì *“được tạo bằng SDK hoặc phiên bản Xcode không được hỗ trợ”* (lỗi 90534): SDK đó bị coi là bản phát hành trước. Chúng tôi đã có sẵn một bản nhị phân iOS thực sự mang phiên bản SDK được chấp nhận: đầu ra `--target ios` của Perry. Perry liên kết runtime riêng và ghi phiên bản SDK đã phát hành, nên vượt qua kiểm tra ở chỗ `swiftc` thất bại. Stub là một màn hình “đây là ứng dụng Apple Watch” được biên dịch bằng Perry nhưng thực tế không bao giờ chạy nhờ `LSApplicationLaunchProhibited`.

2.  **Các biểu tượng cần có lệnh chứ không chỉ khóa.** Ứng dụng đồng hồ thông minh không xác thực được với *“thiếu giá trị cho CFBundleIconName”* ngay cả khi `CFBundleIconName` đã được đặt và `Assets.car` đã có mặt. Người xác thực muốn có cấu trúc đầy đủ: `CFBundleIconName` *và* một từ điển `CFBundleIcons → CFBundlePrimaryIcon → {CFBundleIconName, CFBundleIconFiles}`. Chỉ đặt khóa cấp cao nhất và nó khẳng định khóa bị thiếu.

3.  **`WKWatchOnly` bị từ chối trên bản ghi đã phân phối bản dựng iOS.** Nếu bản ghi App Store của bạn đã từng gửi bản dựng iOS, việc tải lên chỉ dành cho đồng hồ thông minh bị từ chối và bạn cần một bản ghi ứng dụng mới (mà ASC API không thể tạo — `POST /apps` trả về 403 nên bạn tạo bản ghi đó trong giao diện người dùng web). Bản ghi chỉ có bản dựng *chưa được phân phối* là được.


Một vài bất biến nhỏ hơn: ứng dụng sơ khai và đồng hồ thông minh phải chia sẻ cùng một `CFBundleVersion` và bạn đăng nhập từ trong ra ngoài — ứng dụng đồng hồ thông minh trước, sau đó là sơ khai — bằng `--generate-entitlement-der` và `get-task-allow=false`.

## Tại sao đây là câu chuyện Perry

Không có hệ thống ống nước nào trong container là dành riêng cho Perry — nó áp dụng cho mọi ứng dụng watchOS độc lập, bất kể ứng dụng đó được xây dựng như thế nào. Nhưng Perry là lý do tại sao dB Meter là một tệp TypeScript 280 dòng duy nhất ngay từ đầu sẽ biên dịch thành tệp nhị phân gốc của đồng hồ thông minh và Perry là thứ đã tạo ra SDK-clean iOS sơ khai đã gặp lỗi 90534 khi `swiftc` không thể thực hiện được. Quá trình biên dịch cho `arm64_32` cũng đã loại bỏ một lỗi codegen thực sự — một trường chuỗi đối tượng đã nhập đang đọc lại dưới dạng rác trôi nổi trên ILP32 vì truy cập trường lớp nội tuyến được thực hiện ở kích thước tiêu đề đối tượng 64 bit (24 byte) thay vì nhận biết mục tiêu 20 — đại loại như vậy bạn chỉ tìm thấy khi bạn kiên quyết ủng hộ những chiếc đồng hồ cũ hơn thay vì lặng lẽ đánh rơi chúng.

Toàn bộ quy trình — TypeScript tới một bản dựng nhị phân watchOS phổ quát thành một bản dựng App Store phổ quát đã được ký kết, chỉ dành cho đồng hồ thông minh — hiện nằm trong một tập lệnh mà chúng tôi có thể chạy lại. Nếu bạn đang phát hành một ứng dụng đồng hồ thông minh độc lập và Xcode cho bạn biết điều đó không thể thực hiện được thì ứng dụng có thể: bọc ứng dụng đó, gắn cờ ứng dụng đó `ITSWatchOnlyContainer` và giao ứng dụng đó cho `iTMSTransporter`.
