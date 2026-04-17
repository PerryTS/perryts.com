export default function Content() {
  return (
    <>
      <p>
        B&agrave;i blog trước được ph&aacute;t h&agrave;nh c&ugrave;ng Perry v0.5.12. H&ocirc;m nay ch&uacute;ng t&ocirc;i đang ở v0.5.80. Đ&oacute; l&agrave; <strong>68 bản ph&aacute;t h&agrave;nh patch trong bảy ng&agrave;y</strong>, gần như ho&agrave;n to&agrave;n tập trung v&agrave;o một điều: biến mọi slow path c&ograve;n lại th&agrave;nh fast path.
      </p>
      <p>
        Việc chuyển sang LLVM ở v0.5.0 đ&atilde; phục hồi về ngang bằng với Cranelift v&agrave;o v0.5.12. Đ&oacute; l&agrave; kết th&uacute;c của một c&acirc;u chuyện v&agrave; khởi đầu của một c&acirc;u chuyện kh&aacute;c. Giờ đ&acirc;y LLVM nh&igrave;n thấy mọi thứ. C&acirc;u hỏi kh&ocirc;ng c&ograve;n l&agrave; &ldquo;tại sao c&aacute;i n&agrave;y chậm?&rdquo; m&agrave; bắt đầu trở th&agrave;nh &ldquo;tại sao c&aacute;i n&agrave;y chưa nhanh?&rdquo; &mdash; đ&oacute; l&agrave; một c&acirc;u hỏi dễ giải quyết hơn nhiều.
      </p>
      <p>
        B&agrave;i viết n&agrave;y l&agrave; một chuyến tham quan qua tuần vừa rồi. JSON nhận được tốc độ tăng 547 lần. mimalloc trở th&agrave;nh allocator to&agrave;n cục. Truy cập property c&oacute; được monomorphic inline cache. Buffer c&oacute; được c&aacute;c slot pointer c&oacute; kiểu với metadata <code>noalias</code>. C&aacute;c server Fastify v&agrave; WebSocket kh&ocirc;ng c&ograve;n crash sau một ph&uacute;t nữa. V&agrave; c&aacute;c benchmark lại dịch chuyển.
      </p>

      <h2>1. JSON: đ&oacute;ng lại khoảng c&aacute;ch 547 lần</h2>
      <p>
        Tại v0.5.29, JSON.parse của Perry tr&ecirc;n một mảng 20 bản ghi <strong>chậm hơn Node 547 lần</strong>. Đến v0.5.46 con số đ&oacute; l&agrave; 1,3 lần. Đ&acirc;y l&agrave; delta lớn nhất trong tuần, v&agrave; đ&aacute;ng để đi qua chi tiết v&igrave; mọi tối ưu h&oacute;a kh&aacute;c trong b&agrave;i n&agrave;y đều l&agrave; một biến thể của c&ugrave;ng một chủ đề: đừng l&agrave;m c&ocirc;ng việc m&agrave; bạn kh&ocirc;ng cần phải l&agrave;m.
      </p>
      <p>
        Parser ban đầu cấp ph&aacute;t một Vec cho mỗi property, một Vec key cho mỗi object, v&agrave; một thread-local được bảo vệ bởi RefCell cho key cache. N&oacute; copy mọi string. N&oacute; hash lại mọi t&ecirc;n field. N&oacute; x&acirc;y dựng một object shape ho&agrave;n to&agrave;n mới cho mỗi bản ghi, ngay cả khi cả 20 bản ghi c&oacute; ch&iacute;nh x&aacute;c c&ugrave;ng field theo c&ugrave;ng thứ tự. Parser của Node xử l&yacute; việc n&agrave;y bằng c&aacute;ch nhận ra mẫu v&agrave; chia sẻ một shape duy nhất cho tất cả bản ghi. Perry th&igrave; kh&ocirc;ng.
      </p>
      <p>Bản sửa được thực hiện trong bốn bước:</p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Key interning qua một <code>PARSE_KEY_CACHE</code> thread-local</strong> (v0.5.45). Bản ghi đầu ti&ecirc;n cấp ph&aacute;t N string key; c&aacute;c bản ghi từ 2 đến 20 kh&ocirc;ng cấp ph&aacute;t g&igrave; cả. Key lặp lại được ph&acirc;n giải về c&ugrave;ng một pointer, điều n&agrave;y l&agrave;m cho ch&uacute;ng c&oacute; thể sử dụng l&agrave;m key tra cứu shape-cache m&agrave; kh&ocirc;ng cần strcmp.</li>
        <li><strong>Chia sẻ shape qua transition cache</strong> (v0.5.45). C&aacute;c object được x&acirc;y dựng bởi <code>js_object_set_field_by_name</code> đi qua c&ugrave;ng một transition graph. Khi schema lặp lại, pointer <code>keys_array</code> được chia sẻ, v&agrave; đ&oacute; l&agrave; điều m&agrave; polymorphic inline cache cần để hit.</li>
        <li><strong>Parse string zero-copy + x&acirc;y dựng object tăng dần</strong> (v0.5.46). <code>parse_string_bytes</code> giờ trả về <code>ParsedStr::Borrowed(&amp;[u8])</code> khi kh&ocirc;ng c&oacute; backslash escape &mdash; đ&acirc;y l&agrave; trường hợp phổ biến cho mọi key v&agrave; hầu hết gi&aacute; trị. <code>parse_object</code> ghi trực tiếp field thay v&igrave; gom v&agrave;o một Vec trước.</li>
        <li><strong>Ng&atilde;n GC trong l&uacute;c parse</strong> (v0.5.60, đ&oacute;ng #59). Parse một mảng lớn cấp ph&aacute;t h&agrave;ng ngh&igrave;n object nhỏ trong một v&ograve;ng lặp chặt. Mỗi c&aacute;i đều k&iacute;ch hoạt kiểm tra ngưỡng GC. Đặt một cờ &ldquo;parsing in progress&rdquo; ho&atilde;n collection cho đến khi parse trả về &mdash; c&ugrave;ng k&iacute;ch thước heap hiệu dụng, &iacute;t nh&aacute;nh kế to&aacute;n hơn nhiều.</li>
      </ol>
      <p>
        Rồi đến stringify. JSON.stringify tr&ecirc;n c&aacute;c mảng đồng nhất &mdash; c&ugrave;ng shape, h&agrave;ng triệu lần &mdash; đang thực hiện lặp property đầy đủ cho mỗi object, đối với một mảng shape-ổn định th&igrave; đ&oacute; l&agrave; sự l&atilde;ng ph&iacute; thuần t&uacute;y. Bản sửa năm bước cũng đ&oacute;ng phần lớn khoảng c&aacute;ch đ&oacute;:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>v0.5.62: fast path itoa / ryu cho số, kiểm tra tham chiếu v&ograve;ng dựa tr&ecirc;n độ s&acirc;u thay v&igrave; HashSet.</li>
        <li>v0.5.63: guard <code>toJSON</code> + key cache bền vững + inline dispatch (ba chi ph&iacute; mỗi lời gọi cộng dồn lại).</li>
        <li>v0.5.65: template stringify cho shape đồng nhất + fast path escape ASCII. Khi mọi phần tử c&oacute; c&ugrave;ng shape, khung key/colon/comma được t&iacute;nh trước một lần.</li>
        <li>v0.5.70, v0.5.72, v0.5.75: cache template shape mỗi lời gọi, đ&oacute;ng khoảng c&aacute;ch GC d&agrave;nh dư sau parse, loại bỏ overhead cố định mỗi lời gọi c&ograve;n lại.</li>
        <li>v0.5.79: path gi&aacute; trị nhỏ. Số, boolean, v&agrave; string ngắn đi qua một path trực tiếp kh&ocirc;ng thiết lập bất cứ bộ m&aacute;y object n&agrave;o.</li>
      </ul>
      <p>
        Kết quả t&iacute;ch lũy: một pipeline JSON <strong>k&eacute;m Node 547 lần</strong> đầu tuần giờ đ&acirc;y khoảng <strong>k&eacute;m 1,3 lần tr&ecirc;n parse v&agrave; cạnh tranh tr&ecirc;n stringify</strong>, tr&ecirc;n c&aacute;c workload thực tế.
      </p>

      <h2>2. C&acirc;u chuyện allocator</h2>
      <p>
        Perry cấp ph&aacute;t rất nhiều. Mỗi object literal, mỗi array literal, mỗi ph&eacute;p nối string, mỗi closure. Allocator l&agrave; điểm n&oacute;ng, v&agrave; trong phần lớn v0.5 n&oacute; l&agrave; system allocator mặc định của Rust cộng với một arena thread-local cho c&aacute;c gi&aacute; trị tồn tại ngắn.
      </p>
      <p>
        v0.5.67 thay thế allocator to&agrave;n cục bằng <strong>mimalloc</strong>. Đ&acirc;y l&agrave; thay đổi một d&ograve;ng trong Cargo.toml trả lại ngay lập tức tr&ecirc;n bất kỳ workload n&agrave;o thực hiện nhiều cấp ph&aacute;t nhỏ &mdash; đ&oacute; l&agrave; mọi chương tr&igrave;nh TypeScript. v0.5.66 đi trước n&oacute; bằng c&aacute;ch hợp nhất tất cả trạng th&aacute;i thread-local của <code>gc_malloc</code> th&agrave;nh một truy cập TLS duy nhất mỗi lời gọi, để đường đi v&agrave;o mimalloc rẻ nhất c&oacute; thể.
      </p>
      <p>
        v0.5.68 đi xa hơn với <strong>string cấp ph&aacute;t từ arena</strong>. Chuỗi tồn tại ngắn (kết quả nối trung gian, c&aacute;c mảnh <code>split()</code>, nh&aacute;p parser) bỏ qua to&agrave;n bộ allocator to&agrave;n cục v&agrave; rơi v&agrave;o một bump arena theo thread được reset tại c&aacute;c ranh giới tự nhi&ecirc;n. Đối với parsing JSON, ri&ecirc;ng điều n&agrave;y đ&atilde; l&agrave; một chiến thắng hai con số phần trăm.
      </p>
      <p>
        V&agrave; hai tối ưu h&oacute;a kh&ocirc;ng cấp ph&aacute;t g&igrave; cả:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Thay thế scalar cho object kh&ocirc;ng tho&aacute;t</strong> (v0.5.17, sau đ&oacute; object literal v&agrave;o v0.5.76). Nếu một object kh&ocirc;ng bao giờ rời khỏi h&agrave;m bao quanh n&oacute;, n&oacute; kh&ocirc;ng cần tồn tại. C&aacute;c field của n&oacute; trở th&agrave;nh c&aacute;c biến cục bộ thuần t&uacute;y. LLVM xử l&yacute; điều n&agrave;y ngay khi bạn ngừng che giấu object đằng sau một lời gọi allocator kh&ocirc;ng minh bạch.</li>
        <li><strong>Thay thế scalar cho mảng kh&ocirc;ng tho&aacute;t</strong> (v0.5.73). C&ugrave;ng &yacute; tưởng &mdash; nếu mảng kh&ocirc;ng tho&aacute;t, c&aacute;c phần tử của n&oacute; trở th&agrave;nh gi&aacute; trị SSA v&agrave; to&agrave;n bộ cấp ph&aacute;t biến mất.</li>
      </ul>
      <p>
        Cụ thể cho đường đi array literal, v0.5.69 đ&atilde; th&ecirc;m <strong>fast path k&iacute;ch thước ch&iacute;nh x&aacute;c</strong> (bỏ qua bộ m&aacute;y tăng capacity khi k&iacute;ch thước đ&atilde; biết tại thời điểm bi&ecirc;n dịch), v&agrave; v0.5.74 inline IR bump-allocator cho array literal nhỏ để LLVM c&oacute; thể thấy cấp ph&aacute;t, gấp lại, n&acirc;ng ra, hoặc loại bỏ n&oacute;. C&aacute;c benchmark nặng về mảng tiến th&ecirc;m một bước.
      </p>
      <p>
        Khu&ocirc;n mặt cuối c&ugrave;ng, v0.5.25 sửa một bug &acirc;m thầm hơn: <code>gc_malloc</code> kh&ocirc;ng k&iacute;ch hoạt collection tr&ecirc;n đường đi của ch&iacute;nh n&oacute;, v&igrave; vậy c&aacute;c workload nặng malloc c&oacute; thể tăng heap v&ocirc; hạn trước khi bất cứ thứ g&igrave; kiểm tra. v0.5.61 th&ecirc;m k&iacute;ch thước bước th&iacute;ch ứng v&agrave;o ngưỡng, đ&oacute; l&agrave; điều bạn thực sự muốn: kiểm tra rẻ khi heap nhỏ, &iacute;t hơn khi heap lớn.
      </p>

      <h2>3. Truy cập property đ&atilde; c&oacute; một inline cache thực sự</h2>
      <p>
        Mọi engine JavaScript hiện đại đều c&oacute; một polymorphic inline cache (PIC) cho truy cập property. Trong phần lớn chuỗi v0.5 của Perry, PropertyGet đi qua một tra cứu shape-table với hash thread-local. Điều đ&oacute; ổn cho m&atilde; lạnh. Kh&ocirc;ng ổn khi 95% c&aacute;c lần đọc property tại một call site thấy c&ugrave;ng một shape, đ&oacute; gần như lu&ocirc;n lu&ocirc;n.
      </p>
      <p>
        v0.5.44 đưa v&agrave;o một <strong>monomorphic inline cache</strong> cho <code>PropertyGet</code>. Mỗi site PropertyGet nhận một mục cache theo call site: một pointer shape kỳ vọng v&agrave; một offset field. Đường hit l&agrave; một so s&aacute;nh đơn c&ugrave;ng một lần tải được đ&aacute;nh chỉ mục. Đường miss rơi xuống một helper chậm để cập nhật cache.
      </p>
      <pre><code>{`; Monomorphic IC fast path for obj.foo
%shape_ptr = load ptr, ptr %obj_shape_slot
%expected = load ptr, ptr @ic_expected_12
%hit = icmp eq ptr %shape_ptr, %expected
br i1 %hit, label %ic_hit, label %ic_miss

ic_hit:
  %off = load i32, ptr @ic_offset_12
  %addr = getelementptr i8, ptr %obj, i32 %off
  %val = load i64, ptr %addr
  ; ... use val
  br label %cont`}</code></pre>
      <p>
        v0.5.51 th&ecirc;m một <strong>cache shape-transition theo content-hash</strong> cho c&aacute;c ph&eacute;p ghi property động. Hai object tăng c&ugrave;ng field theo c&ugrave;ng thứ tự hash về c&ugrave;ng một transition, n&ecirc;n ch&uacute;ng kết th&uacute;c chia sẻ c&ugrave;ng một shape &mdash; v&agrave; điều đ&oacute; c&oacute; nghĩa l&agrave; ph&iacute;a đọc của PIC thực sự hit.
      </p>
      <p>
        v0.5.55 b&oacute;c lớp truy cập TLS cuối c&ugrave;ng ra khỏi transition cache. v0.5.46 sửa một bug trong handler miss của PIC nơi c&aacute;c object c&oacute; &gt;8 field đ&atilde; đọc vượt qua c&aacute;c slot inline v&agrave;o bộ nhớ chưa khởi tạo (đ&oacute;ng #55). v0.5.78 th&ecirc;m một guard để ngăn PIC của PropertyGet đ&aacute;nh chỉ mục v&agrave;o c&aacute;c receiver kh&ocirc;ng phải pointer như số thuần &mdash; điều c&oacute; thể xảy ra khi type refinement qu&aacute; lạc quan v&agrave; đ&acirc;y l&agrave; một trong những vấn đề ổn định cuối c&ugrave;ng trong IC.
      </p>
      <p>
        Hiệu ứng r&ograve;ng: m&atilde; nặng về property &mdash; trong thực tế c&oacute; nghĩa l&agrave; hầu hết TypeScript &mdash; nhanh hơn khoảng 2-3 lần so với một tuần trước, chỉ từ IC m&agrave; th&ocirc;i.
      </p>

      <h2>4. Số nguy&ecirc;n, ph&eacute;p bitwise, v&agrave; mẫu <code>| 0</code></h2>
      <p>
        NaN-boxing l&agrave;m cho mọi số đều l&agrave; f64. Lập tr&igrave;nh vi&ecirc;n TypeScript viết <code>x | 0</code> để &eacute;p ngữ nghĩa số nguy&ecirc;n. V8 đ&atilde; d&agrave;nh mười lăm năm để l&agrave;m điều đ&oacute; rẻ. Tuần n&agrave;y Perry đ&atilde; đuổi kịp.
      </p>
      <p>Ng&acirc;n xếp c&aacute;c thay đổi, theo thứ tự:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.48</strong>: <code>sdiv</code> cho <code>(int / const) | 0</code>. LLVM gấp th&agrave;nh <code>smulh + asr</code>, khoảng ~2 chu kỳ so với ~10 cho <code>fdiv</code>.</li>
        <li><strong>v0.5.48</strong>: <code>@llvm.assume</code> tr&ecirc;n giới hạn Uint8ArrayGet. Thay thế kim cương nh&aacute;nh+phi kiểm tra giới hạn bằng một khối cơ bản duy nhất m&agrave; vectorizer c&oacute; thể suy luận.</li>
        <li><strong>v0.5.49</strong>: sửa c&aacute;c ph&eacute;p bitwise với NaN/Infinity để tạo ra 0 theo spec ToInt32. T&iacute;nh đ&uacute;ng đắn l&ecirc;n trước.</li>
        <li><strong>v0.5.50</strong>: <code>toint32_fast</code> bỏ qua guard NaN/Inf 5 lệnh khi gi&aacute; trị đ&atilde; biết l&agrave; hữu hạn. Cộng <code>alwaysinline</code> tr&ecirc;n c&aacute;c helper nhỏ v&agrave; ph&aacute;t hiện clamp.</li>
        <li><strong>v0.5.52</strong>: nhắm trực tiếp c&aacute;c h&agrave;m clamp bằng intrinsics <code>smin</code>/<code>smax</code>. Clamp l&agrave; mẫu số nguy&ecirc;n phổ biến nhất sau increment.</li>
        <li><strong>v0.5.53</strong>: <code>x | 0</code> v&agrave; <code>x &gt;&gt;&gt; 0</code> tr&ecirc;n một gi&aacute; trị đ&atilde; biết l&agrave; hữu hạn trở th&agrave;nh noop &mdash; chỉ <code>fptosi + sitofp</code>, kh&ocirc;ng c&oacute; guard n&agrave;o cả.</li>
        <li><strong>v0.5.56</strong>: c&aacute;c ph&eacute;p bitwise i32 native; chỉ mục v&agrave; gi&aacute; trị i32 trong Uint8ArrayGet/Set.</li>
        <li><strong>v0.5.58, v0.5.60</strong>: <code>Math.imul</code> được lower th&agrave;nh ph&eacute;p nh&acirc;n i32 native thay v&igrave; đường polyfill. Ph&aacute;t hiện polyfill nhận ra c&aacute;c shim <code>Math.imul</code> do người d&ugrave;ng viết v&agrave; thay thế ch&uacute;ng.</li>
        <li><strong>v0.5.59</strong>: inlining init h&agrave;m thuần + seeding integer-local. Ph&acirc;n t&iacute;ch integer cục bộ trong h&agrave;m được thấy qua c&aacute;c ranh giới lời gọi khi callee nhỏ v&agrave; thuần.</li>
        <li><strong>v0.5.37-v0.5.40</strong>: fast path số học nguy&ecirc;n cho mẫu accumulator. V&ograve;ng lặp cổ điển <code>for (...) acc += f(i)</code> ở lại i32 từ đầu đến cuối khi kiểu cho ph&eacute;p.</li>
      </ul>
      <p>
        v0.5.41 l&agrave; c&aacute;i tinh tế. Khi codegen thấy một <code>const K: number[][] = [[...], ...]</code> ở cấp module, n&oacute; lower to&agrave;n bộ th&agrave;nh một hằng số <code>[N x i32]</code> phẳng trong <code>.rodata</code>. <code>K[y][x]</code> trở th&agrave;nh một <code>getelementptr + load i32</code> duy nhất. Kết hợp với cầu nối ph&acirc;n t&iacute;ch integer trong v0.5.43, đ&acirc;y l&agrave; c&aacute;i đ&atilde; cho <code>image_conv</code> (blur Gaussian 5&times;5 tr&ecirc;n khung RGB 4K) một <strong>tăng tốc 3 lần trong một bản ph&aacute;t h&agrave;nh</strong>.
      </p>

      <h2>5. Buffer v&agrave; Uint8Array</h2>
      <p>
        C&aacute;c workload nhị ph&acirc;n &mdash; crypto, xử l&yacute; ảnh, parsing, networking &mdash; sống trong Buffer v&agrave; Uint8Array. v0.5.64 cho ch&uacute;ng <strong>c&aacute;c slot pointer c&oacute; kiểu cộng với metadata <code>noalias</code></strong>. Nơi m&agrave; một Buffer trước đ&acirc;y l&agrave; một double được NaN-box trong một <code>alloca double</code>, giờ n&oacute; l&agrave; một pointer <code>i64</code> thuần trong một <code>alloca i64</code>, với ch&uacute; th&iacute;ch LLVM n&oacute;i với optimizer &ldquo;pointer n&agrave;y kh&ocirc;ng alias c&aacute;c pointer kh&aacute;c trong phạm vi.&rdquo; Điều đ&oacute; mở kho&aacute; sắp xếp lại load/store, vectorization, v&agrave; cấp ph&aacute;t thanh ghi m&agrave; optimizer sẽ từ chối l&agrave;m.
      </p>
      <p>
        v0.5.80 đ&oacute;ng vấn đề đ&uacute;ng đắn cuối c&ugrave;ng ở đ&acirc;y: một bộ đếm <code>alias-scope</code> buffer cấp module đang được reset theo h&agrave;m, c&oacute; thể trong những trường hợp hiếm khiến LLVM suy luận qua c&aacute;c phạm vi kh&ocirc;ng n&ecirc;n chia sẻ một scope ID. Giờ bộ đếm ở cấp module v&agrave; c&acirc;u chuyện <code>noalias</code> hoạt động kh&ocirc;ng k&ecirc; hở.
      </p>
      <p>
        v0.5.53 l&agrave;m <code>Uint8ArraySet</code> kh&ocirc;ng nh&aacute;nh &mdash; một store c&oacute; mask thay v&igrave; một if/else ghi 0 khi vượt giới hạn. v0.5.54 th&ecirc;m <strong>Two-Way indexOf</strong> cho c&aacute;c mẫu d&agrave;i hơn v&agrave; một <code>split</code> cấp ph&aacute;t từ arena, c&ugrave;ng nhau đ&oacute;ng phần lớn khoảng c&aacute;ch tr&ecirc;n parsing Buffer nặng về string.
      </p>

      <h2>6. String: ASCII l&agrave; fast path</h2>
      <p>
        String JavaScript l&agrave; UTF-16, nhưng hầu hết string thực tế (key, identifier, HTTP header, khung JSON) l&agrave; ASCII. v0.5.71 th&ecirc;m một <strong><code>charCodeAt</code> v&agrave; <code>codePointAt</code> O(1) cho string ASCII</strong> &mdash; kh&ocirc;ng qu&eacute;t UTF-16, chỉ một lần tải byte. v0.5.20 đ&atilde; l&agrave;m <code>indexOf</code>, <code>slice</code>, v&agrave; <code>charAt</code> bỏ qua qu&eacute;t UTF-16 tr&ecirc;n ASCII.
      </p>
      <p>
        Một ghi ch&uacute; về t&iacute;nh đ&uacute;ng đắn trong c&ugrave;ng bản ph&aacute;t h&agrave;nh đ&oacute;: <code>String.length</code> giờ trả về c&aacute;c đơn vị m&atilde; UTF-16 (spec ECMAScript) thay v&igrave; số byte. Đ&oacute; l&agrave; một bug ẩn nấp nơi <code>&quot;caf&eacute;&quot;.length</code> trả về 5 thay v&igrave; 4.
      </p>

      <h2>7. C&aacute;c server giờ thực sự vẫn chạy</h2>
      <p>
        C&ocirc;ng việc &iacute;t hấp dẫn nhất trong tuần cũng l&agrave; c&ocirc;ng việc dễ thấy nhất đối với người d&ugrave;ng: l&agrave;m cho c&aacute;c server kiểu Node chạy l&acirc;u d&agrave;i &mdash; Fastify, ws, http, net &mdash; kh&ocirc;ng crash sau v&agrave;i ph&uacute;t.
      </p>
      <p>
        Tất cả crash đều c&oacute; chung một nguy&ecirc;n nh&acirc;n gốc: GC kh&ocirc;ng biết về c&aacute;c closure listener. Khi bạn viết <code>wss.on(&apos;message&apos;, handler)</code>, closure capture c&aacute;c biến, sống dưới dạng field b&ecirc;n trong một cell được GC cấp ph&aacute;t. Nếu bộ qu&eacute;t gốc GC kh&ocirc;ng biết đến thăm c&aacute;c cell đ&oacute;, c&aacute;c capture của ch&uacute;ng bị thu hồi v&agrave; sự kiện message tiếp theo dereference bộ nhớ đ&atilde; giải ph&oacute;ng.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>v0.5.26</strong>: qu&eacute;t gốc c&aacute;c closure listener sự kiện <code>net.Socket</code> (đ&oacute;ng #35).</li>
        <li><strong>v0.5.27</strong>: mở rộng tới <code>ws</code>, <code>http</code>, <code>events</code>, <code>fastify</code>.</li>
        <li><strong>v0.5.28</strong>: đăng k&yacute; c&aacute;c biến to&agrave;n cục cấp module l&agrave;m gốc GC (đ&oacute;ng #36). Bug về v&ograve;ng đời ở một tầng cao hơn.</li>
        <li><strong>v0.5.21</strong>: an to&agrave;n <code>gc()</code> b&ecirc;n trong c&aacute;c handler request Fastify/WebSocket &mdash; lời gọi GC tường minh đang chạy trong khi c&aacute;c handler request giữ pointer v&agrave;o arena (đ&oacute;ng #31).</li>
      </ul>
      <p>
        C&ugrave;ng với c&ocirc;ng việc GC, v0.5.20 ph&aacute;t h&agrave;nh một <strong>event loop ch&iacute;nh</strong> &mdash; một c&aacute;i thực sự, kh&ocirc;ng phải placeholder &mdash; giữ cho c&aacute;c server WebSocket v&agrave; dựa tr&ecirc;n timer tồn tại thay v&igrave; tho&aacute;t sau khi lời gọi sync cuối c&ugrave;ng trả về (tham chiếu #28). Đ&acirc;y l&agrave; bản sửa c&oacute; t&aacute;c động lớn nhất đối với bất kỳ ai cố gắng chạy Perry l&agrave;m một HTTP server production. Fastify giờ vẫn chạy. C&aacute;c server WebSocket giờ vẫn chạy.
      </p>
      <p>
        v0.5.19 sửa lỗi kh&ocirc;ng khớp SysV AMD64 ABI cho args/returns JSValue FFI &mdash; một vấn đề tr&ecirc;n Linux nơi c&aacute;c lời gọi FFI native c&oacute; thể l&agrave;m hỏng tham số một c&aacute;ch im lặng. v0.5.18 th&ecirc;m dispatch native cho <code>axios</code> (get/post/put/delete/patch), bao gồm <code>response.status</code> v&agrave; <code>response.data</code>. v0.5.30 sửa dispatch <code>fastify request.header()</code> v&agrave; <code>request.headers[]</code>, vốn đ&atilde; trả về undefined cho tra cứu kh&ocirc;ng ph&acirc;n biệt chữ hoa chữ thường.
      </p>

      <h2>8. <code>@perry/postgres</code>: driver l&agrave;m cho tất cả những điều n&agrave;y trở n&ecirc;n cần thiết</h2>
      <p>
        Nhiều c&ocirc;ng việc trong tuần được th&uacute;c đẩy bởi một workload: l&agrave;m một <a href="https://github.com/PerryTS/postgres" className="text-amber-400 hover:text-amber-300">driver Postgres</a> tương th&iacute;ch đầy đủ với Node chạy tr&ecirc;n Perry-native. Driver c&oacute; khả năng TLS, c&oacute; một registry codec cross-module, hỗ trợ cancel/close/notify, v&agrave; giờ benchmark so với <code>pg</code>, <code>postgres.js</code>, v&agrave; <code>tokio-postgres</code>.
      </p>
      <p>C&ocirc;ng việc hiệu năng ở ph&iacute;a driver đi song song với ph&iacute;a compiler:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>N&acirc;ng codec theo cột</strong> v&agrave; bỏ c&aacute;c copy Buffer theo cell. BigInt(string) cho int8 để tr&aacute;nh cấp ph&aacute;t trung gian.</li>
        <li><strong>Constructor Row động theo shape</strong> cho c&aacute;c row dạng object. Nếu truy vấn của bạn lu&ocirc;n trả về c&ugrave;ng c&aacute;c cột, driver x&acirc;y dựng một constructor row chuy&ecirc;n biệt theo shape lần đầu v&agrave; t&aacute;i sử dụng n&oacute; &mdash; kết hợp với PIC của compiler, điều n&agrave;y l&agrave;m cho truy cập field tr&ecirc;n row nhanh như truy cập field tr&ecirc;n bất kỳ object n&agrave;o kh&aacute;c.</li>
        <li><strong>T&ugrave;y chọn opt-out <code>parseTypes: &apos;minimal&apos;</code></strong> cho caller muốn string th&ocirc; cho int8/numeric/date.</li>
      </ul>
      <p>
        Đ&acirc;y l&agrave; v&ograve;ng lặp phản hồi t&iacute;ch cực m&agrave; compiler lu&ocirc;n được định để cho ph&eacute;p. Một driver thực tạo ra những nghẽn cổ chai thực. Nghẽn cổ chai được nộp dưới dạng issue GitHub với một bản reproducer một d&ograve;ng. Một tuần sửa compiler sau, driver nhanh hơn v&agrave; compiler cũng nhanh hơn cho mọi người kh&aacute;c. Đ&oacute; l&agrave; to&agrave;n bộ kế hoạch, n&eacute;n lại th&agrave;nh bảy ng&agrave;y.
      </p>

      <h2>9. C&aacute;c bản sửa t&iacute;nh đ&uacute;ng đắn đ&aacute;ng nhắc t&ecirc;n</h2>
      <p>
        C&ocirc;ng việc hiệu năng l&agrave;m nổi l&ecirc;n c&aacute;c vấn đề t&iacute;nh đ&uacute;ng đắn theo c&aacute;ch n&aacute;o v&eacute;t một con s&ocirc;ng l&agrave;m nổi l&ecirc;n c&aacute;c xe đẩy si&ecirc;u thị. Một danh s&aacute;ch kh&ocirc;ng đầy đủ:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Promise.race</strong> đang đọc <code>.value</code> khi bị reject thay v&igrave; <code>.reason</code>, n&ecirc;n reject bị nuốt trong im lặng (v0.5.13-v0.5.14).</li>
        <li><strong>Promise.any</strong> giờ n&eacute;m một <code>AggregateError</code> đ&uacute;ng khi tất cả promise đầu v&agrave;o reject. Đ&atilde; th&ecirc;m <code>Promise.withResolvers</code> v&agrave; sửa thứ tự <code>queueMicrotask</code>.</li>
        <li><strong><code>[...&quot;hello&quot;]</code></strong> giờ tạo ra một mảng k&yacute; tự thay v&igrave; một object hỏng (đ&oacute;ng #16).</li>
        <li><strong>Số học BigInt v&agrave; &eacute;p kiểu <code>BigInt()</code></strong> (đ&oacute;ng #33). Fast path bigint i64 (v0.5.29) l&agrave;m cho trường hợp phổ biến trở n&ecirc;n rẻ.</li>
        <li><strong>Buffer.indexOf / Buffer.includes</strong> với tham số byte số đang so s&aacute;nh với pointer buffer thay v&igrave; gi&aacute; trị byte (đ&oacute;ng #56).</li>
        <li><strong>C&aacute;c ph&eacute;p bitwise với NaN/Infinity</strong> tạo ra 0 theo spec ToInt32 (đ&oacute;ng #57).</li>
        <li><strong>Windows x86_64</strong>: năm bản sửa cụ thể cho nền tảng &mdash; <code>localtime</code>, t&igrave;m kiếm <code>clang</code>, v&agrave; một v&agrave;i điều chỉnh codegen &mdash; đưa Windows x86_64 trở lại m&agrave;u xanh (v0.5.72).</li>
      </ul>

      <h2>10. C&aacute;c con số</h2>
      <p>
        Benchmark ti&ecirc;u đề từ b&agrave;i viết trước l&agrave; <code>factorial</code> nhanh hơn Node 24,6 lần. Con số đ&oacute; kh&ocirc;ng thay đổi. C&aacute;i đ&atilde; dịch chuyển trong tuần n&agrave;y l&agrave; mọi thứ xung quanh n&oacute;:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Workload</th>
              <th className="text-right py-2 px-3">v0.5.12</th>
              <th className="text-right py-2 px-3">v0.5.80</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">JSON.parse (schema 20 bản ghi)</td><td className="text-right py-2 px-3">chậm hơn Node 547 lần</td><td className="text-right py-2 px-3">chậm hơn Node 1,3 lần</td><td className="text-right py-2 px-3 text-green-400 font-semibold">~420x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">image_conv (blur 4K 5&times;5)</td><td className="text-right py-2 px-3">1.980ms</td><td className="text-right py-2 px-3">457ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">4.3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">M&atilde; nặng property (PIC hit)</td><td className="text-right py-2 px-3">baseline</td><td className="text-right py-2 px-3">2-3x</td><td className="text-right py-2 px-3 text-green-400">2-3x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">Fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">309ms</td><td className="text-right py-2 px-3 text-green-400">1.3x</td></tr>
            <tr><td className="py-2 px-3">Uptime Fastify dưới tải</td><td className="text-right py-2 px-3">~60s trước khi crash</td><td className="text-right py-2 px-3">v&ocirc; thời hạn</td><td className="text-right py-2 px-3 text-green-400">&infin;</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Bộ 15 benchmark đầy đủ so với Node vẫn l&agrave; 14 thắng v&agrave; 1 h&ograve;a &mdash; c&ugrave;ng bảng như b&agrave;i viết trước, với c&aacute;c con số tốt hơn một ch&uacute;t tr&ecirc;n to&agrave;n bộ. Dịch chuyển thực sự trong tuần n&agrave;y l&agrave; tr&ecirc;n c&aacute;c workload kh&ocirc;ng c&oacute; trong bộ đ&oacute;: JSON, xử l&yacute; ảnh, server chạy l&acirc;u d&agrave;i. Đ&oacute; l&agrave; nơi c&aacute;c khoảng c&aacute;ch tồn tại, v&agrave; đ&oacute; l&agrave; những g&igrave; đ&atilde; đ&oacute;ng lại.
      </p>

      <h2>11. Tiếp theo l&agrave; g&igrave;</h2>
      <p>
        Benchmark duy nhất ch&uacute;ng t&ocirc;i vẫn đang đuổi theo l&agrave; <code>image_conv</code> so với Zig. Perry ở 457ms; Zig ở 246ms. Khoảng c&aacute;ch đ&oacute; mang t&iacute;nh kiến tr&uacute;c, kh&ocirc;ng phải cấp pass tối ưu h&oacute;a, v&agrave; n&oacute; nằm ở ba nơi:
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li><strong>Buffer local c&oacute; kiểu</strong>. Phần lớn c&ocirc;ng việc Buffer đ&atilde; được thực hiện trong tuần n&agrave;y, nhưng c&aacute;c tham số h&agrave;m v&agrave; biến cục bộ kiểu buffer vẫn unbox tr&ecirc;n mỗi truy cập. C&aacute;ch tiếp cận slot <code>i64</code> ch&uacute;ng t&ocirc;i d&ugrave;ng cho biến đếm v&ograve;ng lặp cần mở rộng sang buffer.</li>
        <li><strong>T&aacute;ch v&ograve;ng lặp bi&ecirc;n/trong</strong>. V&ograve;ng lặp blur clamp mọi pixel, bao gồm cả 99,9% pixel kh&ocirc;ng cần. T&aacute;ch th&agrave;nh v&ugrave;ng bi&ecirc;n (clamp) v&agrave; v&ugrave;ng trong (kh&ocirc;ng clamp) cho ph&eacute;p LLVM vectorize phần trong bằng <code>ld3</code>/<code>st3</code> NEON.</li>
        <li><strong>Hash FNV-1a ABI k&eacute;p</strong>. Helper hash được gọi qua ABI NaN-box. Chuy&ecirc;n biệt n&oacute; th&agrave;nh i64 th&ocirc; v&agrave;o/ra cho c&aacute;c hot path l&agrave; v&agrave;i giờ c&ocirc;ng việc sẽ trả l&atilde;i tr&ecirc;n mọi workload nặng về hash.</li>
      </ol>
      <p>
        Những việc đ&oacute; được theo d&otilde;i trong <code>PERF_ROADMAP.md</code>. Mong được thấy ch&uacute;ng trong chu kỳ tiếp theo.
      </p>

      <h2>Tổng kết</h2>
      <p>
        Mẫu của tuần n&agrave;y &mdash; 68 bản ph&aacute;t h&agrave;nh patch, gần như to&agrave;n bộ về hiệu năng, một khoảng c&aacute;ch JSON đi từ 547 lần xuống 1,3 lần &mdash; l&agrave; điều xảy ra khi bạn vượt qua đến b&ecirc;n tốt của ngọn đồi LLVM-cutover. Optimizer giờ l&agrave; đồng minh thay v&igrave; một bức tường, v&agrave; hầu hết những g&igrave; c&ograve;n lại l&agrave; c&ocirc;ng việc nhỏ, cụ thể, đo lường được: t&igrave;m một slow path, t&igrave;m hiểu tại sao optimizer kh&ocirc;ng thể nh&igrave;n xuy&ecirc;n qua, lộ cấu tr&uacute;c ra, đo lại. Kh&ocirc;ng commit n&agrave;o trong số n&agrave;y l&agrave; kỳ lạ. Ch&uacute;ng chỉ được &aacute;p dụng ở nơi cần.
      </p>
      <p>
        Nếu bạn muốn thử bất kỳ điều g&igrave; trong số n&agrave;y:
      </p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        M&atilde; nguồn: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Changelog: <a href="https://github.com/PerryTS/perry/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">CHANGELOG.md</a>
      </p>
      <p>
        C&aacute;c issue, reproducer, v&agrave; benchmark chưa đủ nhanh: h&atilde;y tiếp tục gửi đến. Tốc độ n&agrave;y chỉ hoạt động v&igrave; c&aacute;c b&aacute;o c&aacute;o bug đủ cụ thể để biến th&agrave;nh reproducer một d&ograve;ng. Mọi commit trong b&agrave;i viết n&agrave;y c&oacute; một <code>#N</code> đ&iacute;nh k&egrave;m l&agrave; c&oacute; l&yacute; do.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
