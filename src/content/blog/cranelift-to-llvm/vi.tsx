export default function Content() {
  return (
    <>
      <p>
        Qu&aacute; tr&igrave;nh chuyển backend của Perry từ Cranelift sang LLVM đ&atilde; ho&agrave;n tất. Kể từ v0.5.12, LLVM l&agrave; backend sinh m&atilde; duy nhất, v&agrave; Perry giờ đ&acirc;y đ&aacute;nh bại Node.js tr&ecirc;n mọi benchmark &mdash; với bi&ecirc;n độ từ 1,7x đến 24,6x (với hai kết quả h&ograve;a).
      </p>
      <p>
        H&agrave;nh tr&igrave;nh đến đ&acirc;y kh&ocirc;ng hề thẳng tắp. Lần chuyển đổi ban đầu trong v0.5.0 khiến một số benchmark <strong>chậm hơn 70 lần</strong> so với phi&ecirc;n bản Cranelift m&agrave; n&oacute; thay thế. B&agrave;i viết n&agrave;y l&agrave; phi&ecirc;n bản chi tiết về những g&igrave; đ&atilde; xảy ra, tại sao ch&uacute;ng t&ocirc;i vẫn chuyển, c&aacute;i g&igrave; hỏng, c&aacute;i g&igrave; sửa được, v&agrave; c&aacute;c con số tr&ocirc;ng như thế n&agrave;o ở ph&iacute;a b&ecirc;n kia.
      </p>
      <p>
        Nếu bạn đang x&acirc;y dựng compiler, đ&aacute;nh gi&aacute; c&aacute;c codegen backend, hoặc chỉ đơn giản t&ograve; m&ograve; tại sao &ldquo;chuyển sang LLVM&rdquo; hiếm khi đơn giản như &acirc;m thanh của n&oacute;, b&agrave;i n&agrave;y d&agrave;nh cho bạn.
      </p>

      <h2>Phần 1: Tại Sao Phải Chuyển?</h2>
      <p>
        Perry bi&ecirc;n dịch TypeScript trực tiếp th&agrave;nh m&atilde; m&aacute;y gốc. Kh&ocirc;ng Node, kh&ocirc;ng V8, kh&ocirc;ng Electron, kh&ocirc;ng WebView. Lời đề nghị l&agrave; &ldquo;viết TypeScript, xuất binary gốc,&rdquo; v&agrave; to&agrave;n bộ gi&aacute; trị đề xuất sẽ sụp đổ nếu binary đ&oacute; thực sự kh&ocirc;ng nhanh.
      </p>
      <p>
        Trong c&aacute;c phi&ecirc;n bản minor đầu ti&ecirc;n của Perry, codegen backend l&agrave; <a href="https://cranelift.dev/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Cranelift</a>. Cranelift tuyệt vời &mdash; n&oacute; l&agrave; codegen đằng sau wasmtime, được sử dụng bởi baseline JIT của SpiderMonkey, v&agrave; l&agrave; c&ocirc;ng cụ được chọn khi bạn cần bi&ecirc;n dịch nhanh, c&oacute; thể dự đo&aacute;n với c&acirc;u chuyện nhúng sạch sẽ. Cho một dự &aacute;n đang bootstrap ng&ocirc;n ngữ mới, đ&oacute; l&agrave; điểm khởi đầu đ&uacute;ng đắn.
      </p>
      <p>
        Nhưng hai điều cuối c&ugrave;ng đ&atilde; đẩy ch&uacute;ng t&ocirc;i rời khỏi n&oacute;.
      </p>

      <h3>1. Trần của optimizer</h3>
      <p>
        Cranelift c&oacute; chủ đ&iacute;ch l&agrave; một compiler tối ưu h&oacute;a nhanh, đơn tầng. Nhiệm vụ của n&oacute; l&agrave; &ldquo;tạo m&atilde; kh&aacute; tốt một c&aacute;ch nhanh ch&oacute;ng,&rdquo; kh&ocirc;ng phải &ldquo;tạo m&atilde; tốt nhất c&oacute; thể với thời gian kh&ocirc;ng giới hạn.&rdquo; Đ&oacute; l&agrave; tradeoff đ&uacute;ng cho JIT. Đ&oacute; l&agrave; tradeoff sai cho một AOT compiler m&agrave; to&agrave;n bộ điểm b&aacute;n l&agrave; hiệu năng gốc.
      </p>
      <p>
        LLVM đ&atilde; c&oacute; hơn hai thập kỷ c&ocirc;ng sức đổ v&agrave;o middle-end. Loop vectorization, LICM, GVN, SCCP, instruction combining, inlining heuristics, fast-math reassociation, alias analysis &mdash; kh&ocirc;ng c&oacute; thế giới thực tế n&agrave;o m&agrave; một dự &aacute;n nhỏ hơn c&oacute; thể bắt kịp. Nếu Perry muốn tuy&ecirc;n bố &ldquo;nhanh hơn Node,&rdquo; ch&uacute;ng t&ocirc;i cần bộ m&aacute;y đ&oacute;.
      </p>

      <h3>2. Vấn đề arm64_32</h3>
      <p>
        Yếu tố b&uacute;c b&aacute;ch trực tiếp l&agrave; Apple Watch. <code>arm64_32</code> l&agrave; một ABI m&agrave; Apple giới thiệu cho Series 4 trở l&ecirc;n &mdash; lệnh 64-bit, pointer 32-bit. Cranelift kh&ocirc;ng hỗ trợ n&oacute;, v&agrave; kh&ocirc;ng c&oacute; con đường thực tế n&agrave;o để n&oacute; được th&ecirc;m v&agrave;o. Để Perry c&oacute; thể tuy&ecirc;n bố &ldquo;9 nền tảng từ một codebase&rdquo; một c&aacute;ch đ&aacute;ng tin, watchOS kh&ocirc;ng thể thiếu. LLVM hỗ trợ <code>arm64_32</code> ngay lập tức.
      </p>
      <p>
        Khi ch&uacute;ng t&ocirc;i chấp nhận rằng <em>một số</em> target sẽ y&ecirc;u cầu LLVM, việc duy tr&igrave; hai backend trở n&ecirc;n kh&ocirc;ng thể. Hai backend nghĩa l&agrave; hai bộ bug, hai bộ optimization pass, hai ma trận kiểm thử, hai baseline hiệu năng. C&acirc;u trả lời th&agrave;nh thật l&agrave;: chọn một.
      </p>
      <p>Ch&uacute;ng t&ocirc;i chọn LLVM.</p>

      <h2>Phần 2: V&agrave;i Lời Về Cranelift</h2>
      <p>
        Trước khi đi tiếp: b&agrave;i viết n&agrave;y kh&ocirc;ng phải l&agrave; ph&ecirc; ph&aacute;n Cranelift. Cranelift l&agrave; một kiệt t&aacute;c kỹ thuật, v&agrave; nếu bạn đang x&acirc;y dựng JIT, sandbox runtime, hoặc bất cứ thứ g&igrave; m&agrave; độ trễ bi&ecirc;n dịch quan trọng hơn throughput cao nhất, n&oacute; n&ecirc;n ở gần đầu danh s&aacute;ch của bạn. wasmtime sử dụng n&oacute; v&igrave; l&yacute; do ch&iacute;nh đ&aacute;ng. Bytecode Alliance đ&atilde; l&agrave;m c&ocirc;ng việc mẫu mực.
      </p>
      <p>
        Nhu cầu của Perry đơn giản l&agrave; kh&aacute;c. Ch&uacute;ng t&ocirc;i bi&ecirc;n dịch trước, giao binary một lần, v&agrave; người d&ugrave;ng chạy n&oacute; h&agrave;ng triệu lần. Sự bất đối xứng đ&oacute; &mdash; bi&ecirc;n dịch hiếm khi, thực thi lu&ocirc;n lu&ocirc;n &mdash; ch&iacute;nh x&aacute;c l&agrave; chế độ m&agrave; optimizer nặng hơn của LLVM tự ho&agrave;n vốn. C&ocirc;ng cụ kh&aacute;c cho c&ocirc;ng việc kh&aacute;c.
      </p>

      <h2>Phần 3: Thảm Họa Chuyển Đổi</h2>
      <p>
        v0.5.0 l&agrave; bản ph&aacute;t h&agrave;nh đầu ti&ecirc;n với LLVM l&agrave; backend duy nhất. Ch&uacute;ng t&ocirc;i kỳ vọng một hồi quy nhỏ về thời gian bi&ecirc;n dịch v&agrave; cải thiện đ&aacute;ng kể về hiệu năng runtime. Ch&uacute;ng t&ocirc;i nhận được điều ngược lại của c&aacute;i thứ hai.
      </p>
      <p>Đ&acirc;y l&agrave; bảng m&agrave; t&ocirc;i kh&ocirc;ng muốn đăng v&agrave;o l&uacute;c đ&oacute;:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Cranelift</th>
              <th className="text-right py-2 px-3">LLVM v0.5.0</th>
              <th className="text-right py-2 px-3">Delta</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3">1,084ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">chậm hơn 68 lần</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">5ms</td><td className="text-right py-2 px-3">318ms</td><td className="text-right py-2 px-3 text-red-400 font-semibold">chậm hơn 64 lần</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">61ms</td><td className="text-right py-2 px-3">184ms</td><td className="text-right py-2 px-3 text-red-400">chậm hơn 3 lần</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">370ms</td><td className="text-right py-2 px-3">131ms</td><td className="text-right py-2 px-3 text-green-400">nhanh hơn 2,8 lần</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">32ms</td><td className="text-right py-2 px-3">57ms</td><td className="text-right py-2 px-3 text-red-400">chậm hơn 1,8 lần</td></tr>
            <tr><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">505ms</td><td className="text-right py-2 px-3">1,156ms</td><td className="text-right py-2 px-3 text-red-400">chậm hơn 2,3 lần</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Một số workload nhanh hơn. Phần lớn tệ đi đ&aacute;ng kể. <code>method_calls</code> &mdash; một trong những benchmark quan trọng nhất v&igrave; n&oacute; đại diện cho c&aacute;ch sử dụng class TypeScript đ&uacute;ng chuẩn &mdash; tệ hơn gần 70 lần so với những g&igrave; ch&uacute;ng t&ocirc;i ph&aacute;t h&agrave;nh hai bản trước đ&oacute;.
      </p>

      <h3>Thực sự đ&atilde; sai ở đ&acirc;u</h3>
      <p>
        Perry sử dụng <strong>NaN-boxing</strong> để biểu diễn gi&aacute; trị. Mỗi gi&aacute; trị TypeScript l&agrave; một word 64-bit. Số f64 được lưu trực tiếp; mọi thứ kh&aacute;c (object, string, boolean, undefined, null) được m&atilde; h&oacute;a v&agrave;o c&aacute;c bit kh&ocirc;ng sử dụng của quiet NaN theo IEEE 754.
      </p>
      <p>
        Ưu điểm: số kh&ocirc;ng tốn chi ph&iacute;. Kh&ocirc;ng boxing, kh&ocirc;ng tagging, kh&ocirc;ng cấp ph&aacute;t bộ nhớ cho ph&eacute;p to&aacute;n.
      </p>
      <p>
        Nhược điểm: mỗi thao t&aacute;c tr&ecirc;n gi&aacute; trị kh&ocirc;ng phải số y&ecirc;u cầu thao t&aacute;c bit để giải n&eacute;n, xử l&yacute; v&agrave; đ&oacute;ng g&oacute;i lại. Nếu c&aacute;c chuỗi n&agrave;y tồn tại dưới dạng IR inline trong codegen, optimizer c&oacute; thể hợp nhất v&agrave; đơn giản h&oacute;a ch&uacute;ng. Nếu ch&uacute;ng tồn tại dưới dạng <strong>lời gọi đến h&agrave;m helper runtime</strong>, optimizer thấy một lời gọi kh&ocirc;ng minh bạch v&agrave; bỏ cuộc.
      </p>
      <p>
        Backend Cranelift của ch&uacute;ng t&ocirc;i đ&atilde; ph&aacute;t triển một số lượng lớn c&aacute;c inline lowering cho c&aacute;c thao t&aacute;c n&oacute;ng &mdash; tải property, dispatch method, cấp ph&aacute;t object, ph&eacute;p to&aacute;n số nguy&ecirc;n tr&ecirc;n gi&aacute; trị được tag f64. Việc chuyển sang LLVM, với mục ti&ecirc;u tạo ra m&atilde; <em>đ&uacute;ng</em> trước, đ&atilde; chuyển hướng gần như tất cả qua c&aacute;c helper runtime trong <code>perry-runtime</code>. Mỗi helper l&agrave; một lệnh <code>call</code> trong LLVM IR.
      </p>
      <p>
        LLVM tuyệt vời, nhưng n&oacute; kh&ocirc;ng thể inline một h&agrave;m m&agrave; n&oacute; chưa bao giờ thấy body. <code>perry-runtime</code> được bi&ecirc;n dịch ri&ecirc;ng, li&ecirc;n kết cuối c&ugrave;ng, v&agrave; từ g&oacute;c nh&igrave;n optimizer, mọi lời gọi helper l&agrave; hộp đen. Kết quả l&agrave; c&aacute;c v&ograve;ng lặp n&oacute;ng m&agrave; backend Cranelift đ&atilde; bi&ecirc;n dịch th&agrave;nh ~5 lệnh to&aacute;n học inline giờ đ&acirc;y được bi&ecirc;n dịch th&agrave;nh lời gọi h&agrave;m &mdash; lưu thanh ghi, thiết lập stack frame, đủ thứ &mdash; lặp lại h&agrave;ng triệu lần.
      </p>
      <p>
        Đ&oacute; l&agrave; nguồn gốc của 70x. Kh&ocirc;ng phải codegen tệ. M&agrave; l&agrave; <strong>ranh giới inlining</strong> tệ.
      </p>

      <h2>Phần 4: C&aacute;ch Sửa</h2>
      <p>
        C&ocirc;ng việc để phục hồi v&agrave; vượt qua c&aacute;c con số Cranelift chia th&agrave;nh khoảng s&aacute;u danh mục. Kh&ocirc;ng c&aacute;i n&agrave;o kỳ lạ. Phần lớn l&agrave; c&aacute;c tối ưu h&oacute;a compiler kiểu s&aacute;ch gi&aacute;o khoa chỉ cần được &aacute;p dụng đ&uacute;ng chỗ.
      </p>

      <h3>1. Inline bump allocator cho cấp ph&aacute;t object</h3>
      <p>
        <code>object_create</code> l&agrave; hồi quy tệ nhất sau <code>method_calls</code>. Đường đi cũ gọi <code>js_object_alloc_class_with_keys</code> cho mỗi <code>new Point()</code> &mdash; một lời gọi h&agrave;m, một truy cập arena thread-local, một tra cứu shape-cache, v&agrave; ghi header GC + header object.
      </p>
      <p>
        C&aacute;ch sửa: emit bump allocation <strong>inline</strong> trong LLVM IR. Mỗi h&agrave;m cấp ph&aacute;t object nhận một pointer được cache đến struct <code>InlineArenaState</code> thread-local. Việc cấp ph&aacute;t trở th&agrave;nh:
      </p>
      <pre><code>{`; state is a ptr to InlineArenaState { data: ptr, offset: i64, size: i64 }
%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr           ; current bump offset
%new_off = add i64 %offset, 96              ; GcHeader(8) + ObjectHeader(24) + 8 fields(64)
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr            ; current block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow
fast:
  store i64 %new_off, ptr %off_ptr          ; bump the offset
  %data = load ptr, ptr %state              ; data pointer at offset 0
  %raw  = getelementptr i8, ptr %data, i64 %offset
  store i64 <packed_gc_header>, ptr %raw    ; GcHeader as one i64
slow:
  call ptr @js_inline_arena_slow_alloc(ptr %state, i64 96, i64 8)`}</code></pre>
      <p>
        Fast path l&agrave; ~13 lệnh IR inline m&agrave; LLVM c&oacute; thể thấy, sắp xếp v&agrave; n&acirc;ng ra ngo&agrave;i v&ograve;ng lặp. <code>object_create</code> giảm từ 318ms xuống 9ms.
      </p>

      <h3>2. Biến đếm v&ograve;ng lặp i32</h3>
      <p>
        NaN-boxing nghĩa l&agrave; mọi số TypeScript l&agrave; f64. Bao gồm cả biến đếm v&ograve;ng lặp. Một v&ograve;ng lặp <code>{'for (let i = 0; i < 100_000_000; i++)'}</code> với biến induction f64 l&agrave; thảm họa: tăng f64, so s&aacute;nh f64, chuyển đổi f64-sang-i64 mỗi lần truy cập mảng.
      </p>
      <p>
        Codegen ph&aacute;t hiện c&aacute;c for-loop m&agrave; biến induction chứng minh được l&agrave; gi&aacute; trị nguy&ecirc;n v&agrave; cấp ph&aacute;t một <strong>slot stack i32 song song</strong>. Điều kiện v&ograve;ng lặp chuyển từ <code>fcmp</code> sang <code>icmp slt i32</code>, loại bỏ ho&agrave;n to&agrave;n biến đếm f64.
      </p>
      <p>
        Điều n&agrave;y đưa <code>array_write</code> từ 11ms xuống 3ms, <code>nested_loops</code> từ 18ms xuống 9ms, v&agrave; <code>array_read</code> từ 11ms xuống 4ms.
      </p>

      <h3>3. Cờ fast-math</h3>
      <p>
        Ch&uacute;ng t&ocirc;i đ&iacute;nh k&egrave;m cờ <code>reassoc contract</code> v&agrave;o mọi lệnh to&aacute;n học f64. <code>reassoc</code> cho ph&eacute;p LLVM ph&aacute; vỡ chuỗi accumulator nối tiếp th&agrave;nh song song, v&agrave; <code>contract</code> cho ph&eacute;p fused multiply-add. Ch&uacute;ng t&ocirc;i giữ <code>nnan</code> v&agrave; <code>ninf</code> tắt v&igrave; Perry sử dụng c&aacute;c bit NaN l&agrave;m tag gi&aacute; trị.
      </p>
      <p>
        Với c&aacute;c cờ đ&oacute;, loop vectorizer của LLVM hoạt động tr&ecirc;n <code>math_intensive</code>, giảm từ 131ms xuống 14ms &mdash; đ&aacute;nh bại Node 3,5 lần.
      </p>

      <h3>4. Fast path cho modulo số nguy&ecirc;n</h3>
      <p>
        <code>%</code> tr&ecirc;n f64 trong JavaScript l&agrave; <code>fmod</code>, l&agrave; lời gọi libm tr&ecirc;n ARM. Nhưng với c&aacute;c toand hạng f64 c&oacute; gi&aacute; trị nguy&ecirc;n, ch&uacute;ng ta c&oacute; thể l&agrave;m <code>fptosi &rarr; srem &rarr; sitofp</code> v&agrave; bỏ qua ho&agrave;n to&agrave;n chuyến đi khứ hồi libm. Codegen sử dụng ph&acirc;n t&iacute;ch tĩnh để ph&aacute;t hiện c&aacute;c toand hạng gi&aacute; trị nguy&ecirc;n &mdash; kh&ocirc;ng cần kiểm tra runtime.
      </p>
      <p>
        Đ&acirc;y l&agrave; to&agrave;n bộ l&yacute; do <code>factorial</code> giảm từ 1.553ms xuống 24ms &mdash; v&agrave; từ 591ms của Node xuống 24ms. <strong>Nhanh hơn Node 24,6 lần.</strong>
      </p>

      <h3>5. LICM cho v&ograve;ng lặp lồng nhau</h3>
      <p>
        LLVM l&agrave;m loop-invariant code motion mặc định, nhưng NaN-boxing ẩn cấu tr&uacute;c. <code>arr.length</code> được lower th&agrave;nh một lần tải qua pointer NaN-boxed với kiểm tra tag &mdash; kh&ocirc;ng r&otilde; r&agrave;ng l&agrave; invariant.
      </p>
      <p>
        Codegen ph&aacute;t hiện mẫu <code>{'for (...; i < arr.length; ...)'}</code> v&agrave; tải trước độ d&agrave;i v&agrave;o slot stack trước v&ograve;ng lặp, với walker tĩnh x&aacute;c minh rằng th&acirc;n v&ograve;ng lặp kh&ocirc;ng thể thay đổi độ d&agrave;i mảng. Khi biến đếm bị giới hạn bởi độ d&agrave;i được n&acirc;ng l&ecirc;n n&agrave;y, IndexGet/IndexSet bỏ qua kiểm tra giới hạn ho&agrave;n to&agrave;n.
      </p>

      <h3>6. Object c&oacute; shape-cache</h3>
      <p>
        Khi codegen biết class của một object, n&oacute; giải quyết offset field tại thời điểm bi&ecirc;n dịch v&agrave; emit <strong>c&aacute;c lần tải indexed trực tiếp</strong> &mdash; kh&ocirc;ng dispatch runtime. Cho dispatch method, <code>obj.method(args)</code> trở th&agrave;nh lời gọi trực tiếp <code>call @perry_method_Class_name(this, args)</code> &mdash; kh&ocirc;ng vtable, kh&ocirc;ng inline cache, kh&ocirc;ng hash lookup.
      </p>
      <p>
        Việc chuyển sang LLVM đ&atilde; l&agrave;m hồi quy phần n&agrave;y về slow path universal. Kh&ocirc;i phục static dispatch mang lại cho ch&uacute;ng t&ocirc;i sự phục hồi <code>method_calls</code> &mdash; từ 1.084ms quay về 1ms. <strong>Nhanh hơn Node 11 lần.</strong>
      </p>

      <h2>Phần 5: C&aacute;c Con Số H&ocirc;m Nay</h2>
      <p>Trung vị của ba lần chạy, macOS ARM64 (Apple Silicon, M1 Max), Node.js v25:</p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3">Benchmark</th>
              <th className="text-right py-2 px-3">Perry</th>
              <th className="text-right py-2 px-3">Node.js</th>
              <th className="text-right py-2 px-3">vs Node</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-800"><td className="py-2 px-3">factorial</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">591ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">24.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">method_calls</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">11ms</td><td className="text-right py-2 px-3 text-green-400 font-semibold">11x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">loop_overhead</td><td className="text-right py-2 px-3">12ms</td><td className="text-right py-2 px-3">53ms</td><td className="text-right py-2 px-3 text-green-400">4.4x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">math_intensive</td><td className="text-right py-2 px-3">14ms</td><td className="text-right py-2 px-3">49ms</td><td className="text-right py-2 px-3 text-green-400">3.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_read</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">13ms</td><td className="text-right py-2 px-3 text-green-400">3.2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">closure</td><td className="text-right py-2 px-3">97ms</td><td className="text-right py-2 px-3">303ms</td><td className="text-right py-2 px-3 text-green-400">3.1x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">array_write</td><td className="text-right py-2 px-3">3ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-green-400">2.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">string_concat</td><td className="text-right py-2 px-3">1ms</td><td className="text-right py-2 px-3">2ms</td><td className="text-right py-2 px-3 text-green-400">2x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">nested_loops</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">16ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">prime_sieve</td><td className="text-right py-2 px-3">4ms</td><td className="text-right py-2 px-3">7ms</td><td className="text-right py-2 px-3 text-green-400">1.7x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">matrix_multiply</td><td className="text-right py-2 px-3">21ms</td><td className="text-right py-2 px-3">34ms</td><td className="text-right py-2 px-3 text-green-400">1.6x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">fibonacci(40)</td><td className="text-right py-2 px-3">401ms</td><td className="text-right py-2 px-3">991ms</td><td className="text-right py-2 px-3 text-green-400">2.5x</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">binary_trees</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3 text-slate-400">h&ograve;a</td></tr>
            <tr className="border-b border-slate-800"><td className="py-2 px-3">mandelbrot</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3">24ms</td><td className="text-right py-2 px-3 text-slate-400">h&ograve;a</td></tr>
            <tr><td className="py-2 px-3">object_create</td><td className="text-right py-2 px-3">9ms</td><td className="text-right py-2 px-3">8ms</td><td className="text-right py-2 px-3 text-red-400">0.9x</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Mọi benchmark đều l&agrave; chiến thắng hoặc h&ograve;a. Sát nhất l&agrave; <code>object_create</code> (9ms vs 8ms), nơi allocator của V8 thực sự xuất sắc.
      </p>

      <h2>Phần 6: C&acirc;u Hỏi Thời Gian Bi&ecirc;n Dịch</h2>
      <p>
        L&yacute; do số một m&agrave; mọi người chọn Cranelift thay v&igrave; LLVM l&agrave; tốc độ bi&ecirc;n dịch. Vậy h&atilde;y n&oacute;i về n&oacute;.
      </p>
      <p>
        LLVM tăng thời gian bi&ecirc;n dịch mỗi file của Perry th&ecirc;m <strong>20-50ms</strong>, hoặc khoảng <strong>8-19%</strong>. Kh&ocirc;ng phải 5x. Kh&ocirc;ng phải 2x. Phần trăm một chữ số đến hai chữ số thấp.
      </p>
      <p>
        L&yacute; do l&agrave; codegen kh&ocirc;ng phải nút thắt cổ chai trong pipeline của Perry. Ph&acirc;n bổ cho một file điển h&igrave;nh:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>Parsing SWC: ~30%</li>
        <li>Lowering HIR (AST &rarr; IR, suy luận kiểu): ~25%</li>
        <li>C&aacute;c pass biến đổi IR (chuyển đổi closure, lowering async, inlining): ~15%</li>
        <li><strong>Codegen (ph&aacute;t văn bản LLVM IR + <code>clang -c -O3</code>): ~20%</strong></li>
        <li>Linking (<code>cc</code> + thư viện runtime): ~10%</li>
      </ul>
      <p>
        Codegen l&agrave; một phần trong năm. Ngay cả khi nh&acirc;n đ&ocirc;i phần đ&oacute;, tổng chỉ dịch chuyển 5-10%. Nếu bạn đang x&acirc;y dựng AOT compiler m&agrave; người d&ugrave;ng g&otilde; <code>perry compile</code> một lần rồi chạy binary m&atilde;i m&atilde;i, ph&eacute;p t&iacute;nh l&agrave;: chi th&ecirc;m 25ms khi bi&ecirc;n dịch, tiết kiệm tới 24x mỗi lần thực thi.
      </p>

      <h2>Phần 7: Những G&igrave; T&ocirc;i Sẽ L&agrave;m Kh&aacute;c</h2>
      <p>
        Nếu t&ocirc;i bắt đầu Perry h&ocirc;m nay v&agrave; c&oacute; thể nhảy thẳng sang LLVM, t&ocirc;i sẽ kh&ocirc;ng l&agrave;m vậy. Giai đoạn Cranelift thực sự c&oacute; gi&aacute; trị. N&oacute; cho ph&eacute;p ch&uacute;ng t&ocirc;i lặp lại tr&ecirc;n frontend m&agrave; kh&ocirc;ng phải chịu thuế phức tạp của LLVM, cho ch&uacute;ng t&ocirc;i một baseline hoạt động để so s&aacute;nh, v&agrave; buộc ch&uacute;ng t&ocirc;i giữ HIR đủ sạch để c&oacute; thể di chuyển giữa c&aacute;c backend.
      </p>
      <p>
        Điều t&ocirc;i sẽ l&agrave;m kh&aacute;c l&agrave; bản th&acirc;n việc chuyển đổi. Ch&uacute;ng t&ocirc;i ph&aacute;t h&agrave;nh v0.5.0 với phần lớn c&aacute;c thao t&aacute;c đi qua lời gọi helper runtime, dự định inline ch&uacute;ng sau. Đ&oacute; l&agrave; sai. Thứ tự đ&uacute;ng phải l&agrave;: x&aacute;c định c&aacute;c hot path trước, lower ch&uacute;ng inline trước khi chuyển đổi, v&agrave; chỉ ph&aacute;t h&agrave;nh khi backend LLVM &iacute;t nhất đạt ngang bằng.
      </p>
      <p>
        B&agrave;i học l&agrave; điều nhạt nhẽo: ranh giới tối ưu h&oacute;a quan trọng hơn chất lượng optimizer. LLVM l&agrave; một phần mềm đ&aacute;ng ch&uacute; &yacute;, nhưng n&oacute; kh&ocirc;ng thể gi&uacute;p bạn với m&atilde; m&agrave; n&oacute; kh&ocirc;ng nh&igrave;n thấy. Nếu codegen của bạn chuyển hướng mọi thứ qua c&aacute;c lời gọi runtime kh&ocirc;ng minh bạch, bạn đ&atilde; x&acirc;y một bức tường giữa chương tr&igrave;nh nguồn v&agrave; mọi optimization pass tồn tại.
      </p>

      <h2>Tổng Kết</h2>
      <p>
        Perry giờ chỉ sử dụng LLVM, nhanh hơn Node tr&ecirc;n mọi benchmark, v&agrave; đ&atilde; ph&aacute;t h&agrave;nh. Qu&aacute; tr&igrave;nh chuyển đổi mất nhiều thời gian hơn t&ocirc;i dự t&iacute;nh, đau đớn hơn t&ocirc;i kỳ vọng ở giữa chặng đường, v&agrave; r&otilde; r&agrave;ng l&agrave; quyết định đ&uacute;ng khi nh&igrave;n lại. Cranelift đưa ch&uacute;ng t&ocirc;i đến v0.5; LLVM đang đưa ch&uacute;ng t&ocirc;i đi tiếp.
      </p>
      <p>Nếu bạn muốn thử Perry:</p>
      <pre><code>{`brew install perryts/perry/perry
perry init my-app && cd my-app
perry compile src/main.ts -o my-app && ./my-app`}</code></pre>
      <p>
        M&atilde; nguồn: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}&mdash; Docs: <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">docs.perryts.com</a>
        {" "}&mdash; Tự chạy benchmark: <code>cd benchmarks/suite && ./run_benchmarks.sh</code>
      </p>
      <p>
        Nếu bạn c&oacute; c&acirc;u hỏi, t&igrave;m thấy bug, hoặc muốn tranh luận về codegen backend, GitHub issue đang mở. T&ocirc;i đọc tất cả.
      </p>
      <p>&mdash; Ralph</p>
    </>
  );
}
