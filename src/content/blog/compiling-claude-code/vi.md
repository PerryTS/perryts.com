---
title: "Biên dịch Claude Code: một bundle đã minify, 160 bản sửa trình biên dịch"
excerpt: "Chúng tôi thử dùng Perry để chuyển tệp cli.js đã minify, dung lượng 13 MB mà npm phân phối cho Claude Code, thành một bản nhị phân native. Một tháng sau, chương trình khởi chạy, đăng nhập, nhận phản hồi thật từ API theo luồng và hiển thị ký tự được nhập. Để làm được điều đó, 160 pull request đã được hợp nhất vào Perry, từ MessageChannel không làm gì đến hàng rào ghi GC bị thiếu trong header RegExp."
date: 2026-07-25
tags: ["compiler", "GC", "debugging", "Node.js parity", "milestone"]
---
Vào ngày 16 tháng 6, hướng dẫn chỉ có một câu: *“tìm thư mục mã claude và lấy javascript (đã biên dịch, rút gọn) từ đó … hãy xem liệu chúng ta có thể biên dịch nó không :D”* Khi có sự phản đối rõ ràng — rằng điều này sẽ rất tàn bạo — câu trả lời là luận điểm thực tế: *“nó tàn bạo nhưng cũng là một bài kiểm tra thực sự về khả năng và giới hạn của chúng ta, đó là lý do tại sao tôi muốn làm nó. Không gì có thể thay thế được các ứng dụng trong thế giới thực về mặt tìm kiếm giới hạn.”*

Một tháng sau, bản nhị phân Claude Code CLI của Anthropic được biên dịch bằng Perry đã khởi chạy, thực hiện `/login` qua luồng OAuth, nhận phản hồi thực từ API theo luồng và hiển thị các ký tự bạn nhập. Để đạt được điều đó, **160 pull request đã được hợp nhất vào Perry từ ngày 20 tháng 6 đến ngày 17 tháng 7** — sửa một `MessageChannel` không làm gì, một hàng rào ghi GC bị thiếu trong header RegExp, một câu lệnh `continue` chỉ lặp vô hạn khi gặp API thật chứ không xảy ra với máy chủ giả lập, cùng khoảng một trăm năm mươi lỗi khác.

Bài đăng này là chuyến tham quan. Không phải vì việc biên soạn CLI của người khác là một sản phẩm — chúng tôi không phát hành tệp nhị phân này và sẽ không bao giờ phát hành — mà vì đây là công cụ tìm lỗi hiệu quả nhất mà chúng tôi từng chỉ ra Perry.

<figure><img src="/blog/compiling-claude-code/claude-code-session.png" alt="Một thiết bị đầu cuối macOS chạy một Perry do mã nhị phân Claude Code biên dịch từ /tmp/verify: biểu ngữ v2.1.112, /đăng nhập thành công, lời nhắc &quot;tuyệt vời, bạn là ai?&quot;, câu trả lời trực tiếp và một lối thoát sạch sẽ trở lại vỏ." width="1708" height="926"><figcaption>Không có <code>node</code> trong dòng lệnh đó. <code>/tmp/verify/cc_fptest_dbg25</code> là một tệp thực thi gốc duy nhất được tạo bởi <code>perry compile</code> từ <code>cli.js</code> đã được vận chuyển — đăng nhập, truyền phát câu trả lời thực và thoát hoàn toàn trên Ctrl-C. Vì tên tệp đặt ra câu hỏi: <code>dbg25</code> là bản dựng thứ 25 của loạt chẩn đoán từ cuộc điều tra GC vẫn đang chạy như đã viết — các biểu tượng gỡ lỗi, cộng với tính năng bỏ chọn rào cản ghi đã tắt để <em>mọi</em> cửa hàng mảng phát ra một rào cản. Nó mang lại nhiều chi phí hơn so với một công trình thông thường chứ không ít hơn. Bảng hiệu suất ở phía dưới được đo lường trên các tệp nhị phân khác nhau, không có công cụ.</figcaption></figure>

## Việc “biên dịch Claude Code” thực sự có nghĩa là gì

Đích biên dịch là tệp được phân phối trong gói npm. `npm pack @anthropic-ai/claude-code@2.1.112` cung cấp cho bạn `cli.js`: **13 MB JavaScript** được rút gọn, tự thực thi với `#!/usr/bin/env node` shebang. Không có nguồn, không có sơ đồ nguồn, không có bước xây dựng của chúng tôi. Chúng tôi trỏ `perry compile` vào tệp đó, chưa sửa đổi và yêu cầu tệp thực thi gốc.

Perry nhai nó trong khoảng 37 phút và tạo ra khoảng 207 MB IR trên **16.023 hàm**, liên kết thành một tệp nhị phân ~180 MB. Mỗi hàm trong số đó đều có tên một chữ cái và không có chú thích kiểu, đồng thời toàn bộ phải hoạt động trước thời hạn — không có JIT, không có `eval`, không có sự trợ giúp lười biếng cho trình thông dịch khi trình biên dịch đoán sai. Nếu Perry hạ thấp sai một trong 16.023 hàm đó thì sẽ không có gì để phát hiện.

Thang tính điểm xuất phát từ mức độ căng thẳng nội bộ của chúng tôi và nó cố tình không tha thứ:

```
parse    → perry couldn't even parse it
compile  → parsed, but HIR/codegen errored
link     → codegen ok, but cc/ld failed
run      → linked, but the binary crashed / hung / exited non-zero
ran-ok   → binary exited 0
correct  → output byte-matches node --experimental-strip-types
```

`correct` là cấp duy nhất được tính. Node v26 là nhà tiên tri; bất kỳ thứ gì không giống byte với những gì Node in ra đều là lỗi Perry cho đến khi được chứng minh ngược lại.

## Tại sao cụ thể lại có ứng dụng này

Tác nhân mã hóa CLI là một đống JavaScript thù địch bất thường để biên dịch trước thời hạn. Trong một tệp nhị phân, bạn nhận được: React điều chỉnh với thiết bị đầu cuối thông qua Ink, trình đọc stdin ở chế độ thô, ANSI/emoji bão hòa chạy biểu thức chính quy trên mọi khung hình, SSE phát trực tuyến Máy khách HTTP, lược đồ zod được xây dựng khi khởi động, luồng OAuth, `worker_threads`, `MessageChannel` được sử dụng làm bộ lập lịch tác vụ macro, WeakMaps giữ trạng thái sợi, `require` động và một lớp hệ thống tệp ghi vào thiết bị xuất chuẩn bằng bộ mô tả tệp.

Mỗi hệ thống đó là một hệ thống con khác nhau của Perry và ứng dụng sẽ thực hiện chúng *cùng nhau*, trên quy mô lớn, dưới áp lực GC, trong nhiều phút mỗi lần. Bộ thử nghiệm riêng của chúng tôi — 3.000 bài kiểm tra đơn vị Rust, hàng nghìn chương trình hồi quy TypeScript, Node API ma trận chẵn lẻ, test262 — tất cả đều hướng tới việc ghim hành vi đã biết. Gói này hướng tới việc tìm kiếm hành vi mà chưa ai từng nghĩ tới.

## Dòng chướng ngại vật

Công việc chỉ đi theo một hướng: xóa bức tường hiện tại, tìm bức tường tiếp theo. Đã nén:

| Ngày| Cột mốc |
| --- | --- |
| Ngày 21 tháng 6| `--help` chạy nguyên bản, mã thoát 0 |
| ngày 22 tháng 6| Các lệnh con thực sự ngừng treo khi khởi động |
| Ngày 23 tháng 6| `-p` mở ổ cắm TCP ĐÃ THÀNH LẬP tới api.anthropic.com |
| ngày 24 tháng 6| Các lược đồ zod được xây dựng chính xác; đã đạt được đường dẫn xác thực |
| ngày 27 tháng 6| TUI hiển thị — logo, hộp chào mừng, khung đầu vào |
| Ngày 9 tháng 7| Chuyến đi khứ hồi đầy đủ đầu tiên: `-p` so với API thực sẽ in câu trả lời, exit 0 |
| Ngày 10 tháng 7| Node-vs-Perry dây nịt vi sai: 12/12 giống nhau |
| Ngày 13 tháng 7| Byte giống hệt với Node trên `-p` text + JSON, TUI kết xuất, hệ thống tệp |
| Ngày 16 tháng 7| Các ký tự gõ cuối cùng cũng xuất hiện ở dòng đầu vào |
| Ngày 17 tháng 7| Vòng lặp đầy đủ được xác thực bằng tay: khởi chạy → phản hồi `/login` → API → gõ |

Mọi bản sửa lỗi đều được thực hiện ngược dòng dưới dạng một yêu cầu kéo độc lập với bản tái tạo chung, tối thiểu. Không ai trong số họ đề cập đến ứng dụng mà họ sử dụng - đó đã là quy tắc ngay từ ngày đầu. Người dùng Perry đọc nhật ký thay đổi sẽ thấy “`continue` trong trình điều khiển chờ đã bỏ qua bước tiến của trình vòng lặp", chứ không phải "chúng tôi đang cố gắng biên dịch CLI của ai đó." Các lỗi thực sự độc lập với phương tiện xuất hiện chúng.

## Năm lỗi phần mềm đáng bàn

### 1. MessageChannel là một lịch sự không hoạt động

`--help` đã hoạt động vào ngày 21 tháng 6. Mọi tiểu ban *real* — `doctor`, `agents`, `mcp list` — bị treo vĩnh viễn. Không bận: `sample` hiển thị quy trình chưa sử dụng, `lsof` hiển thị không có quy trình con, không có ổ cắm, chỉ có hai đường ống.

Perry `MessageChannel` đã cài đặt `postMessage` dưới dạng không hoạt động và `onmessage` dưới dạng `null`. Điều đó hoàn toàn vô hại cho đến khi bạn gặp mẫu React-lập lịch, sử dụng kênh thông báo làm trình lập lịch tác vụ macro:

```
const ch = new MessageChannel();
ch.port1.onmessage = flushWork;
ch.port2.postMessage(null);   // schedule the next tick
```

Thông báo đã bị hủy, lệnh gọi lại không bao giờ chạy và vòng lặp sự kiện vĩnh viễn không hoạt động trên ống đánh thức của chính nó. [#5530](https://github.com/PerryTS/perry/pull/5530) đã cung cấp cho các cổng phân phối cùng một luồng thực sự — các cặp vướng víu, hàng đợi FIFO, phân phối qua `setImmediate` macrotask và GC trình quét gốc để các thư được xếp hàng đợi tồn tại trong một bộ sưu tập.

### 2. Một trình truy cập trên Object.prototype tốn 42 giây

Trước khi bị treo, các lệnh phụ tương tự đã bị ràng buộc bởi CPU trong hàng chục giây. Hồ sơ chỉ vào đường dẫn `[[Set]]` chung và nguyên nhân cốt lõi là do cờ toàn cục của quy trình.

Perry có đường dẫn nhanh để ghi thuộc tính động, được kiểm soát "`Object.prototype` hiện có chứa bất kỳ bộ mô tả nào không?" Gói cài đặt chính xác một trình truy cập trên `Object.prototype` khi khởi động. Điều đó đã lật cờ trên toàn quy trình và từ đó trở đi *mọi* ghi động trong chương trình đều thực hiện bước đánh chặn chậm, tức là O(own-key-count). Xây dựng một đối tượng rộng trở thành bậc hai:

```
20,000-property build, clean process:                 16 ms
20,000-property build, after one Object.prototype accessor:  42,394 ms
```

[#5524](https://github.com/PerryTS/perry/pull/5524) đã thay thế cờ chung bằng một câu hỏi cho mỗi phím — *`Object.prototype` có thuộc tính riêng cho **khóa này** không?* Một khóa vắng mặt không thể bị chặn, vì vậy quá trình ghi được thực hiện an toàn theo đường dẫn nhanh. 42 giây → 23 mili giây, với phần chặn vẫn chính xác.

Sau đó, hình dạng tương tự xuất hiện lại cho các phiên bản lớp mà đường dẫn nhanh đã loại trừ hoàn toàn: quá trình xây dựng 20.000 khóa trên một đối tượng đơn giản mất 25 mili giây, trên phiên bản `class` là 44 giây. Việc khắc phục vấn đề quan trọng đó — một lần kiểm tra chuỗi nguyên mẫu đơn giản sẽ bỏ qua các phương thức thiết lập kế thừa và dữ liệu bị hỏng âm thầm — vì vậy [#5528](https://github.com/PerryTS/perry/pull/5528) giải quyết nguyên mẫu của phiên bản thông qua sổ đăng ký lớp và thêm chỉ mục khóa rộng O(1). Quay lại 30 mili giây và tuyến tính trở lại.

### 3. Lỗi mà chỉ API thực mới có thể kích hoạt

Đây là điều chúng tôi nói với mọi người. Vào đầu tháng 7, tệp nhị phân được biên dịch sẽ thực hiện một `-p` hoàn chỉnh chống lại máy chủ mô phỏng cục bộ của chúng tôi: kết nối, POST, đọc luồng SSE, in câu trả lời, thoát 0. Đối với Anthropic API thực tế, nó bị treo vĩnh viễn mọi lúc thời gian.

Chuỗi gỡ lỗi là: một mô hình proxy chuyển tiếp chứng minh rằng toàn bộ 200 phản hồi vẫn nguyên vẹn → một mô hình phát lại, cung cấp luồng byte thực đã bắt được, tái tạo lỗi treo cục bộ → chia đôi danh sách sự kiện SSE đã tìm thấy sự kiện thủ phạm → tái tạo mười dòng.

API thực sự gửi các khung `event: ping`. Mô hình của chúng tôi không bao giờ làm được. Và `ping` là một sự kiện mà vòng lặp luồng của SDK bỏ qua mà chỉ `continue`. Perry đã hạ `for await` vào trình điều khiển có trình vòng lặp nâng cao nằm ở *dưới cùng* của thân vòng lặp:

```
// what perry emitted
while (!done) {
  ...body...                   // a "continue" here skips the advance…
  result = await it.next();    // …so this never runs. Spin forever.
}

// what it emits now
while (true) {
  result = await it.next();
  if (result.done) break;
  ...body...
}
```

Sáu vị trí hạ thấp riêng biệt có hình dạng giống nhau. [#6196](https://github.com/PerryTS/perry/pull/6196) đã đưa tất cả chúng tiến lên vị trí dẫn đầu. Bài học chúng ta tiếp tục học lại: một mô hình trôi qua là bằng chứng về mô hình đó.

### 4. Một biểu thức chính quy tồn tại lâu hơn chuỗi mẫu của chính nó

TUI sẽ hiển thị, sau đó chết vì `SIGBUS` trong vòng vài giây — 12 sự cố trong 12 lần chạy dưới sự khai thác căng thẳng có thể thay đổi kích thước cửa sổ, tại các địa chỉ khác nhau trong các chức năng khác nhau mỗi lần. Nhiều tuần điều tra đã đi vào GC giả thuyết mà thử nghiệm A/B sau đó đã bác bỏ, bao gồm cả một trong những "bản sửa lỗi" của chính chúng tôi hóa ra là không có cơ sở và phải rút lại.

Nguyên nhân thực sự là do 4 dòng Rust. `js_regexp_new` phân bổ một con trỏ chuỗi RegExp và lưu trữ `pattern` và `flags` của nó bằng cách ghi thô — **không có rào cản ghi**. Một vật thế hệ cũ chỉ vào một sợi dây non tươi, với người sưu tầm chưa bao giờ kể về mép. GC nhỏ đã quét các chuỗi đó ra khỏi RegExp trực tiếp và lần đọc tiếp theo của khe trống đã bị lỗi.

Tại sao cái này chỉ hiển thị ở đây? Vì giao diện người dùng đầu cuối đã bão hòa với biểu thức chính quy — ANSI mẫu chạy đo lường độ rộng biểu tượng cảm xúc và phân tích cú pháp trên mỗi khung hình — nên khoảng cách giữa phân bổ và thu thập bị vượt qua hàng nghìn lần mỗi phút. Sự tái tạo tối thiểu của chúng tôi, 6.000 biểu thức chính quy cộng với sự phân bổ có chủ ý, *chưa bao giờ* kích hoạt nó. Gói này đã kích hoạt nó mọi lúc. [#6288](https://github.com/PerryTS/perry/pull/6288) đã thêm rào cản mà cả hai trường luôn cần đến.

### 5. Các ký tự bạn gõ đã ở đó. Khung đã ném chúng đi.

Bức tường cứng đầu nhất: toàn bộ giao diện người dùng được sơn hoàn hảo — hộp chào mừng, khung nhập, khối con trỏ, dòng trạng thái. Việc gõ `/` đã mở menu lệnh, do đó, thao tác nhấn phím đã đạt tới React. Nhưng các chữ cái không bao giờ xuất hiện trên dòng đầu vào.

Các bản dựng được thiết kế cho thấy Perry vẽ chính xác ký tự đã nhập ở mọi giai đoạn, sau đó `onRender` ném *sau* sơn — vào Ink `try/catch` đã nuốt nó. Khung đã bị hủy trước khi xác nhận, vì vậy mọi kết xuất tiếp theo đều được tạo trên một khung trống. Ứng dụng trông hoàn toàn bình thường khi phớt lờ bạn.

Hai lỗi độc lập ẩn sau một triệu chứng đó:

-   [#6453](https://github.com/PerryTS/perry/pull/6453) — Perry giảm nội tuyến `charAt`/`codePointAt`/`split` được gọi là ToString trên bộ thu không phải chuỗi mà không có bộ bảo vệ cưỡng chế cần thiết. Vì vậy, `undefined.codePointAt(0)` đã lặng lẽ trả về `117` — điểm mã của `"u"`, từ chuỗi `"undefined"` — thay vì ném. Một lỗi *phát minh ra* dữ liệu hợp lý còn tệ hơn nhiều so với lỗi bị hỏng.

-   [#6471](https://github.com/PerryTS/perry/pull/6471) — trình chặn thực sự. Khi một mảng phát triển, Perry sẽ để lại một cuống chuyển tiếp vĩnh viễn tại địa chỉ cũ. Cuộc quét nhỏ đang lấy lại những phần sơ khai đó trong khi cha mẹ thế hệ cũ vẫn chỉ vào một phần: bộ nhớ đệm ký tự của trình kết xuất giữ một con trỏ tiền tăng trưởng trên một trang không bị bẩn. Việc đọc qua phần sơ khai cũ tạo ra độ dài rác và mọi khung hình đều bị hủy. Trẻ vị thành niên bây giờ giữ lại tất cả sơ khai; dấu vết đầy đủ đòi lại chúng theo nhãn hiệu.


Sửa những phần bị lộ ở lớp thứ ba — các đối tượng có màu đen trong quá trình đánh dấu tăng dần không bao giờ được theo dõi, do đó, mọi thứ chỉ có thể truy cập thông qua chúng đều bị quét khi đang hoạt động ([#6494](https://github.com/PerryTS/perry/pull/6494)) và mặt nạ bố cục có các khe tràn được báo cáo dưới mức nên trình thu thập đã bỏ qua chúng ([#6506](https://github.com/PerryTS/perry/pull/6506)). Hai cái đó là loại lỗ hổng âm thanh tạo ra sự cố bí ẩn có 1/50 trong *bất kỳ* chương trình nào được biên soạn. Chúng tôi sẽ không tìm thấy chúng bằng bộ thử nghiệm.

## Cách bạn gỡ lỗi nhị phân được rút gọn 13 MB

Không tìm thấy nội dung nào ở trên bằng cách đọc mã. Công cụ giúp nó dễ điều khiển:

-   **Khai thác khác biệt với Node như oracle.** Mọi giả thuyết sẽ trở thành một chương trình TypeScript nhỏ chạy dưới cả `node --experimental-strip-types` và Perry nhị phân, so sánh từng byte. Nó tự tìm thấy lỗi — một biểu thức lớp chỉ được sử dụng dưới dạng `instanceof` phía bên phải đã bị loại bỏ mã chết vì 11 lượt phân tích không thể nhìn xuyên qua loại nút đó ([#6245](https://github.com/PerryTS/perry/pull/6245)).

-   **Ba máy chủ API mô phỏng.** Một mô hình ghi nhật ký, một proxy chuyển tiếp ghi lại các byte phản hồi thực và một máy chủ phát lại cung cấp lại các byte chính xác đó một cách xác định. Máy chủ phát lại là thứ đã biến việc "không được sản xuất" thành bản sao cục bộ.

-   **Một khai thác PTY giúp trả lời các truy vấn đầu cuối.** Một thiết bị đầu cuối giả ngu ngốc sẽ cung cấp cho bạn 50 byte và một điểm dừng. Ứng dụng sẽ thăm dò vị trí con trỏ (`ESC[6n`), thuộc tính thiết bị (`ESC[c`) và màu nền (`OSC 11`) và chờ phản hồi trước khi vẽ. Trả lời chúng và bạn sẽ có được màn hình chào mừng đầy đủ 3.331 byte — và kết xuất có thể so sánh theo byte giữa Node và Perry.

-   **Bản đồ liên kết dành cho ký hiệu.** Các tệp nhị phân 180 MB bị loại bỏ tạo ra các báo cáo sự cố chứa đầy các giá trị bù trừ thô; Đầu ra `ld64 -map` cộng với tập lệnh chia đôi biến chúng trở lại thành tên hàm.

-   **A/B mọi thứ.** Quy tắc xuất hiện, được viết ở đầu ghi chú bàn giao bằng chữ in hoa: *không bao giờ kế thừa một lý thuyết — hãy kiểm tra nó.* Bốn giả thuyết nguyên nhân gốc rễ liên tiếp cho một lỗi đều bị bác bỏ bởi các lần chạy A/B. Một tín hiệu xác minh mà chúng tôi đã theo đuổi trong nhiều ngày (“445 thiếu các cạnh cũ → trẻ”) hóa ra là một tạo phẩm đo lường — quá trình kiểm tra diễn ra giữa việc xóa và khôi phục tập hợp đã ghi nhớ. Nhận xét riêng của mã đã cảnh báo về điều đó.


## Vị trí thực sự của nó

Thành thật mà nói: nó hoạt động và chậm.

Hôm nay đang hoạt động, byte giống hệt với Node nơi đầu ra có thể so sánh được: khởi động, `--help`, `--version`, chế độ `-p` một lần so với API bao gồm phân loại lỗi và đường bao JSON, kết xuất TUI đầy đủ, luồng OAuth `/login`, truyền phát phản hồi và nhập. Đây là toàn bộ vòng lặp chỉ trong một lần thực hiện — khởi chạy, `/login`, một câu hỏi, một câu trả lời trực tiếp, thoát:

<figure><video controls="" playsinline="" preload="none" poster="/blog/compiling-claude-code/claude-code-demo-poster.png"><source src="/blog/compiling-claude-code/claude-code-demo.mp4" type="video/mp4">Trình duyệt của bạn không hỗ trợ video nhúng.</video><figcaption>63 giây, không có âm thanh, bị cắt ở hai vị trí: nửa trình duyệt của phần bắt tay OAuth và một chuỗi khóa macOS đi lạc nhắc nhở. Mọi thứ trong thiết bị đầu cuối đều theo thời gian thực và chưa được chỉnh sửa — bao gồm cả độ trễ khởi động, đây là điều chậm nhất trong bài đăng này.</figcaption></figure>

Có hai thứ vẫn còn bỏ ngỏ, và chúng có thể là một. Đầu vào ngừng đăng ký sau khoảng một phút sử dụng tương tác liên tục — không có sự cố, không có lỗi, nó chỉ dừng lại. Và `ESC` không làm gián đoạn phản hồi trong chuyến bay, mặc dù `Ctrl-C` hiện đã thoát hoàn toàn, điều này đã không xảy ra một tuần trước (đó là lối thoát mà bạn thấy ở cuối bản ghi). Đường dẫn thoát hoạt động trong khi đường dẫn gián đoạn không trỏ đến cùng một nghi phạm như trường hợp tử vong đầu vào: các sự kiện nhấn phím dừng truy cập ứng dụng chứ không phải bất kỳ sự cố nào xảy ra với trình xử lý của chính ứng dụng.

Hình ảnh hiệu suất, được đo dựa trên Node chạy cùng một gói, trước và sau vòng đầu tiên của chiến dịch tốc độ bắt đầu vào ngày mà tính chính xác đã hạ cánh. Chúng xuất hiện `cc_final` và `cc_perf2` vào ngày 17 tháng 7 — các bản dựng thông thường không có chẩn đoán được biên dịch vào, không phải tệp nhị phân được đo lường trong ảnh chụp màn hình ở trên:

| Số liệu| Node| Perry (17 tháng 7)| Perry (sau) |
| --- | --- | --- | --- |
| `--version` | 328 mili giây| 1.168 mili giây| **227 mili giây**
| `--help` | 715 mili giây| 5.071 mili giây| 4.099 mili giây |
| TUI lớp sơn đầu tiên| 0.76 s | 10.9 s | 8.4 s |
| Nhấn phím → sơn (p50)| 2,2 mili giây| 111–143 mili giây| 119–138 mili giây |
| Dung lượng bộ nhớ, không hoạt động| 290 MB phẳng| ~420 MB leo núi| ~420 MB leo núi |

`--version` hiện **đánh bại Node** và chiến thắng về nguồn gốc thật đáng xấu hổ: tệp thực thi được biên dịch đã xuất 300.281 ký hiệu, vì vậy ~ 80% lần khởi chạy đó là dyld thực hiện định nghĩa yếu kết tụ lại. Một cờ liên kết đã xuất thành 3 và tệp nhị phân từ 228 MB lên 197 MB ([#6533](https://github.com/PerryTS/perry/pull/6533)). Xây dựng mỗi biểu thức chính quy duy nhất một lần thay vì hai lần ([#6534](https://github.com/PerryTS/perry/pull/6534)) và lưu vào bộ nhớ đệm kiểm tra chặn chặn trên mỗi cửa hàng ([#6532](https://github.com/PerryTS/perry/pull/6532), [#6541](https://github.com/PerryTS/perry/pull/6541)) chiếm phần còn lại.

Trên 197 MB đó, trước khi có người sử dụng nó: Perry liên kết tĩnh thời gian chạy của chính nó và phát ra trước mã máy cho tất cả 16.023 chức năng mà không có dải chết — một gói tự thực thi về cơ bản giúp mọi thứ có thể truy cập được nên không có DCE gói chéo nào để dựa vào — có nghĩa là 197 MB là toàn bộ chương trình *cộng với* thời gian chạy của nó trong một tệp, so với **138 MB mà Node v26 nặng trước khi đọc một dòng JavaScript** của bạn.

Hàng gõ phím là hàng cần đọc kỹ vì số “sau” trông tệ hơn. Không phải vậy: đó là các phạm vi trong các lần chạy lặp lại và chúng trùng nhau, do đó, giá trị trung bình không di chuyển theo một trong hai hướng - đó là phương sai giữa các lần chạy, không phải là hồi quy. Đó cũng chính xác là những gì chúng tôi mong đợi. Tất cả ba thay đổi đều liên quan đến bước liên kết, cấu trúc biểu thức chính quy và đường dẫn *lưu trữ*; trung bình số lần nhấn phím bị chi phối bởi đường dẫn *đọc* thuộc tính, chi phí root cho mỗi cuộc gọi và GC các bước hạ cánh trong 40–80 mili giây bên trong cửa sổ nhấn phím. Bằng chứng được đưa ra ở vòng tiếp theo: get/set làn đường nhanh đã tạo ra điểm chuẩn vi mô truy cập hiện trường nhanh hơn gấp 3 lần và không làm thay đổi con số này chút nào ([#6539](https://github.com/PerryTS/perry/pull/6539)). Việc giành được điểm chuẩn vi mô không hiển thị trong ứng dụng là một chẩn đoán sai và chúng tôi đã có một chẩn đoán sai.

Dòng ký ức là chiến dịch hiện tại. Trình thu thập sao chép của *có thể của Perry có thể thu gọn — vấn đề là nó đủ điều kiện khoảng một lần trong mỗi 45 giây không hoạt động, do đó, vườn ươm sẽ tăng trở lại ~300 MB giữa các lần kích hoạt trong khi Node vẫn ổn định bằng cách nén liên tục. Đó là vấn đề về tần số kích hoạt, không phải vấn đề về thuật toán, đây là một nơi tốt hơn nhiều so với vị trí của chúng tôi vào tháng 6.*

Không có cái nào được đỗ. Chiến dịch bộ nhớ và hiệu suất *trực tiếp* khi bài đăng này xuất hiện — công việc kích hoạt GC đang chạy hôm nay, trên hệ nhị phân chính xác này — vì vậy, bảng hiệu suất ở trên là một phần của bài đăng này mà chúng tôi mong đợi sẽ vô hiệu hóa nhất và càng sớm càng tốt. Sự đúng đắn phải mất một tháng tường thành mới vượt qua được. Những gì còn lại là vấn đề tần số kích hoạt và vấn đề đường dẫn đọc, cả hai đều được hiểu, cả hai đều đã hoạt động. Chúng tôi hy vọng điều này sẽ diễn ra suôn sẻ chứ không chỉ đơn thuần là chính xác và chúng tôi mong đợi điều đó sẽ sớm xảy ra.

## Tại sao chúng tôi làm điều này

Không có bản sửa lỗi nào trong số 160 bản sửa lỗi liên quan đến Claude Code. Thiếu rào cản ghi trên tiêu đề RegExp sẽ làm hỏng bộ nhớ trong *bất kỳ* chương trình nào xây dựng biểu thức chính quy đang tải. `for await` với vòng quay `continue` trong bất kỳ ứng dụng tiêu dùng luồng nào. Việc thả tin nhắn `MessageChannel` sẽ phá vỡ mọi ứng dụng có dạng React-lập lịch. Cờ mô tả `Object.prototype` tạo *mọi* chương trình chạm vào `Object.prototype` bậc hai trong đối tượng rộng nhất của nó.

Những lỗi đó đều tồn tại trong Perry trong khi CI có màu xanh, trong khi số lượng test262 tăng lên, trong khi ma trận chẵn lẻ Node cho biết 97%. Phải mất mười ba megabyte JavaScript được rút gọn của người khác, thực hiện công việc thực sự dựa trên API thực trong một thiết bị đầu cuối thực, để loại bỏ chúng.

Còn một điều nữa, và đó là phần chúng tôi thấy buồn cười nhất. Perry không được viết bằng tay — phần lớn nội dung, bao gồm rất nhiều chiến dịch *này*, được viết bằng Claude Code. Các máy chủ mô phỏng, bộ khai thác PTY, bộ chạy vi sai, những đêm dài chia đôi lỗi GC vào lúc 4 giờ sáng: các phiên tác nhân, được con người xem xét và hợp nhất. Không phải tất cả Perry và không phải không có nhiều tranh cãi. Nhưng đủ để câu đó đúng cả hai mặt.

Trình biên dịch sử dụng Claude Code phần lớn được xây dựng bởi Claude Code.

Chúng tôi sẽ tiếp tục làm việc đó. Các mục tiêu tiếp theo đã được xếp hàng đợi.

* * *

Perry không được liên kết hoặc xác nhận bởi Anthropic. Claude Code là nhãn hiệu của Anthropic PBC. Tệp nhị phân được mô tả ở đây được xây dựng từ gói npm được xuất bản công khai hoàn toàn dưới dạng mục tiêu kiểm tra trình biên dịch và không được phân phối.
