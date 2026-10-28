---
title: "Từ trình biên dịch đến hệ sinh thái: React, cơ sở dữ liệu và build trên đám mây"
excerpt: "Perry phát triển từ trình biên dịch thành hệ sinh thái hoàn chỉnh. perry/ui làm cốt lõi, ORM tương thích Prisma cho MySQL/PostgreSQL/SQLite, thông báo đẩy toàn cầu, build phân tán kèm xuất bản App Store và lớp tương thích React — tất cả trong một tuần."
date: 2026-03-06
tags: ["ecosystem", "perry/ui", "databases", "infrastructure", "milestone"]
---
Một tuần trước, Perry là một trình biên dịch với bộ công cụ UI. Bạn có thể viết TypeScript, biên dịch nó thành binary native, và phân phối trên sáu nền tảng. Đó là câu chuyện. Hôm nay câu chuyện lớn hơn: Perry đang trở thành một hệ sinh thái. Ba ORM cơ sở dữ liệu, push notification đa nền tảng, build phân tán với xuất bản App Store và Play Store, lớp tương thích React, và xác minh ứng dụng tự động — tất cả đã ra mắt trong tuần qua.

Bài đăng này đề cập đến những gì đã được vận chuyển, lý do nó quan trọng và mã trông như thế nào.

## perry/ui: Nền tảng

Trước khi sử dụng các thư viện mới, cần nhấn mạnh điều gì là trung tâm của mọi thứ: `perry/ui`. Đây là bộ công cụ giao diện người dùng gốc của Perry — hơn 20 tiện ích biên dịch trực tiếp thành các thành phần gốc của nền tảng trên tất cả sáu mục tiêu. Nó không phải là một trình bao bọc, không phải là lớp trừu tượng, không phải là chế độ xem web. Mọi `Button` đều trở thành `NSButton` trên macOS, `UIButton` trên iOS, `GtkButton` trên Linux, điều khiển `android.widget.Button` trên Android và điều khiển `CreateWindowEx` trên Windows.

`perry/ui` là Perry bề mặt giao diện người dùng chính và nâng cao nhất. Nó bao gồm quản lý trạng thái phản ứng, vùng chứa bố cục (VStack, HStack, ZStack, SplitView), Canvas, Table với sắp xếp cột, mô-đun `perry/system` cho hộp thoại tệp, truy cập chuỗi khóa, thông báo và nhiều cửa sổ — tất cả từ TypeScript, tất cả được biên dịch sang nền tảng trực tiếp API. Mọi phương pháp tiếp cận giao diện người dùng khác trong Perry, bao gồm cả lớp tương thích React, đều được xây dựng dựa trên `perry/ui` và ánh xạ trở lại các tiện ích của nó.

**app.ts**

```typescript
import { Window, VStack, Button, Text, State } from 'perry/ui';
const count = new State(0);
const window = new Window({ title: "Counter" });
window.setContent(
  new VStack({ children: [
    new Text({ text: count }),
    new Button({ title: "+1", onClick: () => count.set(count.get() + 1) }),
  ] })
);
```

Đối tượng `State` phản ứng là khóa nguyên thủy. Khi giá trị State thay đổi, chỉ các tiện ích được liên kết với bản cập nhật trạng thái đó — không có khác biệt DOM ảo, không hiển thị lại toàn cây, không vượt qua đối chiếu. Đó là con đường trực tiếp nhất từ ​​TypeScript đến giao diện người dùng nền tảng gốc hiện có.

## Tương thích React: Một lớp mỏng trên perry/ui

Đối với các nhà phát triển đến từ React, `perry-react` cung cấp một lớp tương thích ánh xạ mô hình thành phần của React tới các tiện ích `perry/ui`. Bạn có thể sử dụng `useState`, `useRef`, `useReducer` và JSX — đồng thời Perry biên dịch nó thành cùng các tiện ích gốc bên dưới. Đó là một cầu nối tiện lợi chứ không phải một công cụ kết xuất riêng biệt.

**counter.tsx**

```tsx
import React, { useState } from 'react';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

Ở bên dưới, mỗi phần tử JSX được ánh xạ tới một widget `perry/ui`: `<div>` trở thành VStack, `<button>` trở thành Button, còn `useState` dựa trên State phản ứng của Perry. Đây mới là giai đoạn đầu — Giai đoạn 1, với việc render lại toàn bộ cây và lưu trữ hook toàn cục — nhưng nó chứng minh rằng mã React hiện có có thể hướng tới các nền tảng native thông qua Perry. Chúng tôi cũng đang tìm hiểu khả năng tương thích với Angular và Ionic theo hướng tương tự.

## Ba ORM Cơ sở dữ liệu: API Prisma, Hiệu năng Native

Nếu bạn đang xây dựng một máy chủ hoặc một ứng dụng dành cho máy tính để bàn tương tác với cơ sở dữ liệu, Perry hiện đã hỗ trợ bạn ba Prisma: `perry-prisma` (MySQL), `perry-sqlite` (SQLite) và `perry-postgres` (PostgreSQL). Cả ba đều là những thay thế tùy ý cho `@prisma/client`. Cùng một API, cùng các mẫu truy vấn nhưng được biên dịch thành mã gốc với cơ sở dữ liệu trực tiếp FFI — không có công cụ Prisma, không có Node.js.

**database.ts**

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Same Prisma API — compiled to native SQL via Rust FFI
const users = await prisma.user.findMany({
  where: { email: { contains: "@perry.dev" } },
  orderBy: { createdAt: "desc" },
  take: 10,
});
await prisma.post.create({
  data: { title: "Hello", authorId: users[0].id },
});
```

Về cơ bản, mỗi ORM là một giao diện người dùng TypeScript được hỗ trợ bởi lớp Rust FFI bằng cách sử dụng lớp `sqlx`. Luồng truy vấn: TypeScript tuần tự hóa truy vấn thành JSON, chuyển truy vấn đó qua ranh giới FFI, Rust xây dựng SQL được tham số hóa, thực thi nó thông qua nhóm kết nối và tuần tự hóa kết quả trở lại. Lược đồ Prisma được đọc tại thời điểm xây dựng — không phân tích cú pháp trong thời gian chạy.

Ba cách triển khai này chia sẻ ~95% mã của chúng. Sự khác biệt chính là những gì bạn mong đợi: trích dẫn mã định danh (`` `col` `` so với `"col"`), cú pháp giữ chỗ ( `?` so với `$1, $2`) và ngữ nghĩa giao dịch. Cả ba đều hỗ trợ toàn bộ bề mặt CRUD Prisma: findMany, findFirst, findUnique, create, createMany, cập nhật, updateMany, upsert, xóa, deleteMany, count — cùng với SQL thô, giao dịch và hơn 10 toán tử bộ lọc WHERE.

## perry-push: Push Notification đa nền tảng

`perry-push` là một thư viện duy nhất xử lý thông báo đẩy trên mọi nền tảng: APNs (iOS/macOS), FCM (Android), Đẩy web (trình duyệt) và WNS (Windows). Mỗi nhà cung cấp là một mô-đun Rust FFI với chính xác ba chức năng: `*_provider_new`, `*_provider_close` và `*_send`.

**notify.ts**

```typescript
import { ApnProvider } from 'perry-push/apn';
import { FcmProvider } from 'perry-push/fcm';
const apn = new ApnProvider({ teamId, keyId, key });
const fcm = new FcmProvider({ serviceAccount });
// Unified result type for all providers
const result = await apn.send({
  deviceToken: token,
  title: "New message",
  body: "You have a new reply",
});
```

Mật mã được xử lý bởi `ring` — ES256 JWT cho APNs và VAPID, RS256 cho tài khoản dịch vụ FCM, AES-GCM cho mã hóa tải trọng Web Push. Tất cả được biên dịch thành mã gốc. Không có `node-gyp`, không có phụ thuộc OpenSSL.

## Perry Hub + Builder: Build đám mây phân tán

Đây là trò chơi về cơ sở hạ tầng. `perry-hub` là một máy chủ điều phối bản dựng — được biên soạn từ TypeScript bởi Perry — quản lý một nhóm công nhân xây dựng. Bạn đẩy dự án của mình, trung tâm sẽ gửi dự án đó đến đúng nhân viên dựa trên nền tảng mục tiêu và nhân viên đó sẽ biên dịch, ký và xuất bản ứng dụng của bạn theo tùy chọn.

Hiện nay có hai công nhân: một trình tạo macOS (xử lý macOS, iOS và các mục tiêu Android) và một trình tạo Linux (xử lý các mục tiêu Linux và Android). Cả hai đều là các tệp nhị phân Rust kết nối với trung tâm qua WebSocket, tải tarball nguồn xuống, chạy trình biên dịch Perry và tải lại các cấu phần phần mềm lên.

-   **Ký mã** — Công chứng của Apple cho macOS, cung cấp hồ sơ cho iOS, ký kho khóa Android
-   **App Store** — tải trực tiếp lên App Store Connect và Google Play Store
-   **Quản lý cấu phần phần mềm** — các tệp nhị phân được xây dựng được tải lên trung tâm với tính năng dọn dẹp dựa trên TTL
-   **Quản lý giấy phép** — giới hạn tỷ lệ trên mỗi giấy phép, xếp hàng ưu tiên (cấp chuyên nghiệp được ưu tiên)

Bản thân trung tâm này đã là một trường hợp điển hình hấp dẫn. Đó là tệp TypeScript ~1.500 dòng được Perry biên dịch thành tệp nhị phân gốc 2 MB. Nó chạy Fastify trên cổng 3456 cho HTTP và `ws` trên cổng 3457 cho WebSocket. Tất cả trạng thái đều nằm trong bộ nhớ với tính bền vững JSON — không có cơ sở dữ liệu bên ngoài. Đó là loại máy chủ bạn có thể triển khai với `scp` và tệp đơn vị systemd.

## perry-verify: Xác minh ứng dụng tự động

`perry-verify` là một dịch vụ HTTP độc lập sử dụng tệp nhị phân và cấu hình được biên dịch, chạy quy trình xác minh và trả về kết quả đạt/không đạt có cấu trúc kèm theo ảnh chụp màn hình. Nó khởi chạy ứng dụng, chạy các luồng xác thực (xác định hoặc được AI hỗ trợ), kiểm tra trạng thái và thu thập bằng chứng.

Bộ điều hợp nền tảng tồn tại cho macOS (thông qua API trợ năng), Linux (AT-SPI) và các sơ khai cho iOS và Trình mô phỏng Android. Lớp AI sử dụng Claude để xác thực dự phòng và xác minh trạng thái khi không thể kiểm tra xác định. Nó được thiết kế để đưa vào quy trình xây dựng của trung tâm dưới dạng bước sau xây dựng: biên dịch, ký, xác minh, xuất bản.

## Pry ra mắt khắp nơi

[Pry](/vi/blog/building-pry/), trình xem JSON gốc mà chúng tôi xây dựng dưới dạng chương trình giới thiệu Perry, hiện phân phối trên năm nền tảng. Tính năng này có trên [Mac App Store](https://apps.apple.com/app/pry-json-viewer/id6759329040) và [Google Play](https://play.google.com/store/apps/details?id=com.perry.pry), với các tệp nhị phân gốc dành cho Linux và Windows. Cùng một cơ sở mã TypeScript, năm điểm nhập dành riêng cho nền tảng, năm tệp nhị phân gốc. Đây là bằng chứng cụ thể nhất cho thấy toàn bộ phương pháp tiếp cận này hoạt động từ đầu đến cuối — từ nguồn TypeScript đến danh sách App Store.

## Tất cả điều này có ý nghĩa gì

Một trình biên dịch rất thú vị. Một hệ sinh thái rất hữu ích. Trong tuần trước, Perry đã chuyển từ "bạn có thể biên dịch TypeScript sang gốc" thành "bạn có thể xây dựng một ứng dụng đầy đủ với giao diện người dùng gốc, cơ sở dữ liệu Prisma, thông báo đẩy và các bản dựng tự động xuất bản lên Ứng dụng App Store."

Các mảnh ghép đang bắt đầu kết nối:

-   **perry/ui** là con đường trực tiếp nhất từ TypeScript đến giao diện người dùng nền tảng gốc — trạng thái phản ứng, hơn 20 tiện ích, không có lớp trừu tượng nào
-   **perry-prisma/sqlite/postgres** nghĩa là các cổng mã cơ sở dữ liệu hiện có với những thay đổi tối thiểu
-   **perry-push** nghĩa là thông báo đẩy gốc không có thư viện trên mỗi nền tảng
-   **perry-hub + builders** nghĩa là bạn có thể đi từ `perry publish` tới App Store chỉ trong một bước
-   **perry-verify** có nghĩa là kiểm tra tự động kết quả đã biên dịch, không chỉ nguồn
-   **perry-react** nghĩa là React các nhà phát triển có thể dễ dàng tham gia Perry bằng cách sử dụng các mẫu quen thuộc, tất cả ánh xạ tới perry/ui bên dưới

Đây không phải là lý thuyết. Mọi thư viện được liệt kê ở đây đều có mã hoạt động, bài kiểm tra và tài liệu. Một số đã được sử dụng trong sản xuất — bản thân trang đích Perry chạy trên máy chủ Fastify do Perry biên dịch và Pry hiện có mặt trên hai cửa hàng ứng dụng.

## Tiếp theo là gì

Lộ trình trước mắt:

-   **mở rộng perry/ui** — kéo và thả, nhãn trợ năng, menu ngữ cảnh tùy chỉnh, nhiều bố cục gốc hơn
-   **tích hợp xác minh perry** — xác minh tự động trong quy trình xây dựng
-   **Khả năng tương thích khung** — cải thiện React, Angular và Ionic như các đường dẫn cho perry/ui
-   **Hỗ trợ toàn bộ biểu thức chính quy** — Công cụ biểu thức chính quy tương thích với ECMAScript được biên dịch thành bản gốc

Theo dõi tiến trình trên [GitHub](https://github.com/PerryTS/perry) hoặc kiểm tra [lộ trình](/vi/roadmap/) để có hình ảnh đầy đủ.
