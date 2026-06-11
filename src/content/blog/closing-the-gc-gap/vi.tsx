export default function Content() {
  return (
    <>
      <p>
        Vài tuần trước, <a href="https://zenn.dev/aya_koto" className="text-amber-400 hover:text-amber-300">Ayasaka-Koto</a> (@axt_ayakoto trên X) đã đăng <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">một benchmark so Perry với Deno và Bun</a> trên bài toán AtCoder ABC451D, &ldquo;Concat Power of 2.&rdquo; Số đo của anh: Perry chạy <strong>chậm hơn Bun 3.85×</strong>. Kết luận của anh lịch sự nhưng dứt khoát — Perry chưa sẵn sàng làm một runtime cho competitive programming, và có lẽ kể cả khi trưởng thành cũng vẫn vậy.
      </p>
      <p>
        Chúng tôi nợ anh một bài tiếp nối. Đây là nơi chúng tôi đáp xuống trên cùng benchmark đó, với cùng lệnh <code>hyperfine</code>, trên cùng cấp máy:
      </p>
      <pre><code>{`Command                                Mean         Min      Max
Perry v0.5.875                         425.0 ± 78 ms  367 ms  745 ms
Bun 1.3.12                             430.7 ± 74 ms  376 ms  787 ms
Deno 2.7.14                            544.8 ± 140 ms 426 ms  984 ms

Perry vs Bun:   1.01× faster (statistical tie, within error)
Perry vs Deno:  1.28× faster
Perry vs aya_koto's published Perry number: 2.87× faster`}</code></pre>
      <p>
        Việc khép lại khoảng cách đó cần một cuộc điều tra khởi đầu từ một giả thuyết sai, tìm ra một sự đánh đổi kiến trúc GC có thật nhưng cố ý, và cho ra một kết quả mà chúng tôi nghĩ đáng viết về — không phải vì chúng tôi đã đuổi kịp, mà vì cách mà sự đánh đổi đó lộ ra dưới profiling tự thân nó đã thú vị.
      </p>

      <h2>Benchmark</h2>
      <p>
        File <code>abc451d-perry.ts</code> của aya_koto thực hiện một tìm kiếm theo chiều sâu đệ quy trên các phép nối chuỗi power-of-2, khử trùng lặp qua một <code>Set&lt;number&gt;</code> và sắp xếp. Hàm nóng thì ngắn:
      </p>
      <pre><code>{`function search(before: string, powersOfTwoStr: string[]): string[] {
    const answers: string[] = [];
    if (before.length > 0) answers.push(before);
    const remainDigits = 9 - before.length;
    for (let i = 0; i < powersOfTwoStr.length; i++) {
        const after = powersOfTwoStr[i];
        if (after.length > remainDigits) break;
        const child = search(before + after, powersOfTwoStr);
        for (let j = 0; j < child.length; j++) answers.push(child[j]);
    }
    return answers;
}`}</code></pre>
      <p>
        Hình dạng chính là câu chuyện. Mỗi lời gọi cấp phát một <code>string[]</code> mới toanh. Đệ quy thì sâu — hệ số phân nhánh lên tới khoảng 30 ở đỉnh — và mỗi frame cha giữ mảng <code>answers</code> của nó sống trong khi đang lặp qua mảng của con và push vào mảng của chính nó. Cấp phát ngắn hạn, đệ quy sâu, tham chiếu sống rải rác khắp mọi block arena đang hoạt động. Đây hóa ra chính là loại workload mà GC của Perry <em>không</em> được tinh chỉnh để đối phó.
      </p>

      <h2>Giả thuyết sai</h2>
      <p>
        Một độc giả đã để lại một chú thích cuối trang trên bài của aya_koto chỉ ra rằng BigInt của Perry bên trong là một số nguyên 1024-bit độ dài cố định, và rằng các chương trình nặng BigInt chạy chậm hơn Bun khoảng 4×. ABC451D liên quan đến các lũy thừa của 2 — các số lớn nghe có vẻ hợp lý — và thế là phản xạ đầu tiên là: BigInt là thủ phạm, sửa đường BigInt thì khoảng cách khép lại.
      </p>
      <p>
        Không phải vậy. <code>grep -i bigint abc451d-perry.ts</code> không trả về gì. Benchmark dùng <code>number</code> xuyên suốt; mọi giá trị đều nằm thoải mái dưới 2^53. Chú thích về BigInt là đúng, có thật, và là một vấn đề đáng sửa — và chúng tôi đã sửa nó, riêng biệt, trong v0.5.736. Nhưng nó chẳng dính dáng gì đến ABC451D.
      </p>
      <p>
        Cái giá của việc đuổi theo giả thuyết sai trước tiên là khoảng một ngày. Bài học — mà tôi muốn tự nhận là chúng tôi đã biết rồi — là: hãy profile trước khi cam kết với một lý thuyết, kể cả khi lý thuyết đến từ một nguồn đáng tin và khớp với định kiến của bạn. Đặc biệt là lúc đó.
      </p>

      <h2>Tái dựng benchmark</h2>
      <p>
        Việc đầu tiên chúng tôi làm khi ngừng đuổi theo BigInt là tái dựng các con số của aya_koto một cách sạch sẽ. Chúng tôi kỳ vọng đáp xuống gần con số 1.219 s của anh trên Perry. Chúng tôi đáp xuống <strong>2.998 s</strong> trên Perry v0.5.729.
      </p>
      <p>
        Đó là một regression 2.5× giữa phiên bản anh kiểm tra và main hiện tại của chúng tôi lúc đó. Deno và Bun tái dựng trong phạm vi 50% các con số của anh (phần cứng khác, version trôi). Khoảng cách của Perry đã nới rộng từ 3.85× lên 6.59× trong khi không ai để ý.
      </p>
      <p>
        Chúng tôi đã không bisect xem commit nào gây ra regression — việc đó nằm ngoài phạm vi cuộc điều tra này. Nhưng sự thiếu vắng một lan can bảo vệ CI lẽ ra đã bắt được sự trôi này tự thân nó là một phát hiện, và chúng tôi sẽ quay lại điểm đó ở cuối.
      </p>

      <h2>Chẩn đoán dựa trên profile</h2>
      <p>
        Biên dịch với <code>PERRY_DEBUG_SYMBOLS=1</code> và ghi lại bằng <code>samply</code>, bức tranh self-time rõ ràng không thể nhầm:
      </p>
      <pre><code>{`% Self    Function
41.2%     perry_runtime::gc::try_mark_value
12.7%     perry_runtime::gc::drain_trace_worklist_inner
 9.0%     perry_runtime::gc::build_valid_pointer_set
 8.5%     perry_runtime::arena::arena_walk_objects_with_block_index
 5.6%     perry_runtime::gc::try_mark_value_or_raw
 4.2%     js_number_coerce
 3.1%     js_array_sort_with_comparator`}</code></pre>
      <p>
        <strong>76% self time là bộ máy GC.</strong> Inclusive time đồng tình: <code>gc_collect_minor</code> ở 80%, <code>Arena::alloc</code> ở 76%, <code>js_array_alloc</code> ở 45%, <code>js_array_push_f64</code> ở 22%. Hàm đệ quy <code>search()</code> nóng, nhưng nó nóng bên dưới pha mark của GC. Mỗi lời gọi đang kích hoạt đủ cấp phát để vấp phải một lần thu gom.
      </p>
      <p>
        Một microbenchmark đối chứng âm xác nhận sự chậm chạp không mang tính tổng quát. Vòng lặp số nguyên chặt <code>fib(80) × 100_000</code>, không cấp phát: Perry <strong>6.1 ms</strong> so với Bun <strong>24.7 ms</strong> — Perry nhanh hơn 4×. Codegen cho các vòng lặp nóng không cấp phát vốn đã vượt Bun. Khoảng cách của ABC451D tập trung ở một đường mã cụ thể: thông lượng cấp phát cộng với mark-sweep của GC trên đúng hình dạng cấp phát này.
      </p>

      <h2>Bằng chứng quyết định</h2>
      <p>
        Chúng tôi có một flag — <code>PERRY_GC_DIAG=1</code> — in thống kê GC theo từng chu kỳ. Đầu ra là quan sát chịu lực của cả cuộc điều tra:
      </p>
      <pre><code>{`[gc-step] pre_in_use=67 MB  post_in_use=67 MB  sweep_freed=38 MB  block_reclaim=0  pct=57%
[gc-step] pre_in_use=100 MB post_in_use=100 MB sweep_freed=55 MB  block_reclaim=0  pct=55%
[gc-step] pre_in_use=119 MB post_in_use=119 MB sweep_freed=65 MB  block_reclaim=0  pct=55%
…
arena blocks: 61 → 84 → 100 → 116 → 131 → 145 → 157 → … → 270+`}</code></pre>
      <p>
        Mỗi chu kỳ, cùng một khuôn mẫu. Lần sweep nhận diện đúng rằng <strong>55–60% các đối tượng được cấp phát đã chết</strong>. Và arena thu hồi <strong>không block nào</strong>. Heap tăng đơn điệu suốt cả lần chạy, trong khi GC vẫn trả cái giá mark-sweep trên một working set ngày càng lớn.
      </p>
      <p>
        Tại sao <code>block_reclaim=0</code> dù hơn một nửa số đối tượng đã chết? Bởi vì arena GC của Perry thu hồi ở mức độ chi tiết là block. Một block 1 MB chỉ được reset khi mọi đối tượng bên trong nó đều đã chết. Trong ABC451D, hàm đệ quy <code>search()</code> giữ các tham chiếu sống — mảng <code>answers</code> của frame cha — rải rác khắp mọi block đang hoạt động. Không block nào từng hoàn toàn chết. Mark-sweep nhận diện đúng các đối tượng chết, không có đường thu hồi theo từng đối tượng, và vì thế chẳng làm gì với chúng. Heap tăng, các trigger GC bùng lên trên một guồng quay, và cái giá của mỗi chu kỳ leo lên khi working set leo lên.
      </p>

      <h2>Sự đánh đổi cố ý</h2>
      <p>
        Điều cung cấp nhiều thông tin nhất mà chúng tôi tìm thấy không nằm trong profile. Nó nằm trong chính lần sweep, tại <code>crates/perry-runtime/src/gc.rs:2733</code>, dưới dạng một comment giải thích thiết kế:
      </p>
      <blockquote className="border-l-4 border-amber-500/40 pl-4 my-6 text-slate-400 italic">
        We deliberately do NOT push dead objects onto the global ARENA_FREE_LIST. The inline bump allocator never reads the free list — it uses the per-block reset instead. Pushing dead objects to the free list would cost ~50ns per object × ~700k objects per GC × ~12 GC cycles per benchmark = 420ms of pure waste in <code>object_create</code>.
      </blockquote>
      <p>
        Điều này hoàn toàn đúng đối với workload mà nó được tinh chỉnh để đối phó. <code>object_create</code> là một benchmark chúng tôi quan tâm, nơi các cấp phát chết trong một vòng lặp chặt và toàn bộ block thực sự trở nên rỗng giữa các chu kỳ. Thêm một pass free-list theo từng đối tượng sẽ đốt 420 ms ghi sổ vô nghĩa cho workload đó, và đường block-reset thu được cùng lượng bộ nhớ với giá rẻ hơn.
      </p>
      <p>
        Nó là một sự khớp kém với hình dạng của ABC451D, nơi các tham chiếu sống nằm rải rác và block-reset không bao giờ kích hoạt. Kiến trúc có một sự đánh đổi cố ý được mã hóa trong nó, và chúng tôi chưa bao giờ benchmark trường hợp mà sự đánh đổi đi sai hướng.
      </p>
      <p>
        Đó là bài học thực sự. GC không hỏng. Nó được tinh chỉnh cho một phân phối khuôn mẫu cấp phát khác với cái mà bench của aya_koto đại diện, và chúng tôi đã không nhận ra rằng phân phối nó được tinh chỉnh cho đã loại trừ một lớp workload có thật — tìm kiếm đệ quy, đi cây, bất cứ thứ gì giữ trạng thái sống ở mọi cấp của stack trong khi làm cấp phát ngắn hạn bên dưới.
      </p>

      <h2>Những thứ không hiệu quả</h2>
      <p>
        Trước khi đến được một bản sửa thực sự, vài đòn bẩy trông có vẻ hợp lý hóa ra lại là những đòn bẩy sai. Báo cáo những thứ này kèm con số vì chúng là nửa thú vị hơn của cuộc điều tra:
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong><code>PERRY_GEN_GC_EVACUATE=1</code></strong> — Perry vốn đã có một pass copying-evacuation tùy chọn bật. Bật nó cho ABC451D: <strong>11.4 giây</strong>, chậm gấp bốn lần baseline. Pass này chạy mỗi chu kỳ bất kể có hữu ích hay không, và cái giá copy theo từng đối tượng cộng với viết lại tham chiếu của nó là thảm họa khi tập sống là các đối tượng nhỏ ngắn hạn. Đáng giữ cho các workload được hưởng lợi, nhưng không phải câu trả lời ở đây.</li>
        <li><strong><code>PERRY_GEN_GC=0</code></strong> (full mark-sweep thay vì generational) — 3.06 s, về cơ bản giống hệt baseline. Lựa chọn chiến lược không phải là thứ ràng buộc; sự thiếu vắng thu hồi theo từng đối tượng mới là.</li>
        <li><strong>Dọn dẹp cấu trúc <code>ValidPointerSet</code> (commit 0fa42e0b).</strong> Gộp hai vector đã sắp xếp riêng biệt (con trỏ arena và con trỏ được malloc) thành một, thêm một prefilter dải min/max, inline phần loại bỏ tag của <code>try_mark_value</code>. Cắt một nửa cái giá mỗi lời gọi của <code>contains()</code> — vốn là vòng lặp trong nóng mà profile đã đánh dấu. Bench ABC451D dịch từ 3.07 s xuống 3.21 s. Một sự hòa, trong phạm vi nhiễu. Thay đổi này vẫn mang lại giá trị cho các workload nơi <code>contains()</code> thực sự là ràng buộc chịu lực (benchmark hình dạng ECS, các chuỗi compose của hono), nhưng nó không phải ràng buộc chịu lực ở đây. Khối lượng lời gọi tuyệt đối — bị thúc đẩy bởi áp lực cấp phát nuôi pha mark — vẫn áp đảo kể cả khi cái giá mỗi lời gọi bằng không.</li>
      </ul>
      <p>
        Khuôn mẫu xuyên suốt cả ba: chiến lược GC và các cái giá vòng-lặp-trong mỗi lời gọi đều là bậc hai. Ràng buộc chịu lực là sự thiếu vắng một đường thu hồi cho các đối tượng chết trong các block không trở nên hoàn toàn rỗng. Cho đến khi điều đó được xử lý, không gì khác lay chuyển được kim chỉ.
      </p>

      <h2>Nơi chúng tôi đáp xuống</h2>
      <p>
        Giữa v0.5.737 và v0.5.875, qua khoảng 137 phiên bản patch, khoảng cách khép lại. Chúng tôi cố ý khi viết điều này: chúng tôi đã không bisect xuống một commit anh hùng duy nhất. Bản sửa đáp xuống qua một loạt thay đổi trong hệ thống con GC, biến sự đánh đổi cố ý &ldquo;không free list theo từng đối tượng&rdquo; thành có điều kiện thay vì vĩnh viễn — khi <code>block_reclaim</code> giữ ở không qua các chu kỳ liên tiếp, lần sweep bắt đầu điền vào một free list phân nhóm theo kích thước và bump allocator có được một đường dự phòng. Trình tự chính xác và patch nào đóng góp bao nhiêu sẽ cần một cú bisect cẩn thận mà chúng tôi nợ nhưng chưa làm.
      </p>
      <p>
        Kết quả, trên đúng bench và lệnh của aya_koto, trên Apple M-series, macOS 26.4:
      </p>
      <pre><code>{`Perry v0.5.875: 425.0 ± 78 ms  (367 – 745)
Bun 1.3.12:     430.7 ± 74 ms  (376 – 787)
Deno 2.7.14:    544.8 ± 140 ms (426 – 984)`}</code></pre>
      <p>
        Hai ghi chú trung thực về bảng này. Thứ nhất, biên 1.01× của Perry so với Bun nằm trong khoảng sai số — từ đúng là &ldquo;hòa,&rdquo; không phải &ldquo;nhanh hơn.&rdquo; Thứ hai, phương sai trên cả ba runtime đều đáng kể (max của Perry là 745 ms so với trung bình 425 ms), và bất kỳ lần chạy đơn nào cũng có thể rơi vào một trong hai đuôi. Chúng tôi đã hiển thị min và max bên cạnh trung bình vì lý do đó; chúng tôi thà bạn thấy độ phân tán.
      </p>

      <h2>Những gì còn chưa hoàn hảo</h2>
      <p>
        Vài điều chúng tôi không che giấu:
      </p>
      <p>
        Regression từ 1.2 s lên 3.0 s xảy ra giữa số đo của aya_koto và lúc bắt đầu cuộc điều tra này cho chúng tôi biết rằng chúng tôi đã không có một lan can CI bắt được lớp chậm chạp này. Chúng tôi đang thêm <code>abc451d-perry.ts</code> và một bộ nhỏ xung quanh vào CI của Perry như một cổng chặn regression hiệu năng trước khi bài này lên sóng. Nếu bench này lặng lẽ suy giảm trong một release tương lai, nó nên làm hỏng một build, chứ không phải làm hỏng một benchmark từ một người phê bình ba tháng sau.
      </p>
      <p>
        Bản sửa nới lỏng một sự đánh đổi cố ý theo một hướng cụ thể. Chúng tôi đang theo dõi benchmark <code>object_create</code> và các bạn của nó — những workload mà lựa chọn &ldquo;không free list&rdquo; ban đầu đang bảo vệ — để chắc rằng đường free-list có điều kiện không làm chúng regression. Các con số ban đầu nằm trong phạm vi nhiễu, nhưng đây là loại việc mà sự tự tin đến từ thời gian, không phải từ một lần chạy benchmark duy nhất.
      </p>
      <p>
        Chúng tôi đã không bisect dải 137 phiên bản. Chúng tôi sẽ làm. Nó quan trọng cho tài liệu, và quan trọng cho việc hiểu cơ chế free-list-có-điều-kiện nào đang gánh việc.
      </p>

      <h2>Ghi công</h2>
      <p>
        Bài viết của aya_koto đúng là loại tổng kết mà một dự án mã nguồn mở cần và hiếm khi có được. Anh đo cẩn thận, công bố repo test của mình, chỉ ra điểm vướng cụ thể trong đường cài đặt, và đi đến kết luận trung thực rằng Perry chưa sẵn sàng cho trường hợp sử dụng anh đang đánh giá. Kết luận đó đúng vào lúc anh đưa ra. Nó sẽ còn đúng lâu hơn nếu anh không viết về nó.
      </p>
      <p>
        Repo test của anh ở <a href="https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421" className="text-amber-400 hover:text-amber-300">github.com/AXT-AyaKoto/perry-ts-test-2026-0421</a>. Bài viết của anh ở <a href="https://zenn.dev/aya_koto/articles/553ce04b1d5ac4" className="text-amber-400 hover:text-amber-300">zenn.dev/aya_koto/articles/553ce04b1d5ac4</a>. Cả hai đều đáng đọc ngay cả sau bài tiếp nối này — bài viết đặc biệt, vì nó ghi lại một đánh giá trung thực về một compiler giai đoạn đầu từ một người không có động cơ gì để lịch sự.
      </p>
      <p>
        Hai điều cụ thể trong bài của anh chúng tôi nên ghi nhận. Điểm vướng trong đường cài đặt anh chỉ ra — rằng phần đầu perryts.com trỏ tới một phương pháp trong khi docs khuyến nghị một phương pháp khác — đã được sửa; đường npm giờ là lựa chọn nổi bật trên trang chủ, khớp với docs. Nỗi bực &ldquo;những thứ ngoài tài liệu limitations mà không compile&rdquo; anh chỉ ra — chúng tôi đã đi qua từng file <code>.ts</code> trong repo test của anh đối chiếu với Perry hiện tại; những lỗ hổng thực sự được lập issue, và các limitation đã ghi tài liệu được mở rộng.
      </p>
      <p>
        Chú thích về BigInt trong bài của anh, như đã bàn ở trên, không liên quan đến ABC451D nhưng tự thân có thật — cài đặt BigInt của Perry quả thực là một số nguyên 1024-bit độ rộng cố định bên dưới, và các chương trình nặng BigInt phải trả giá cho điều đó. Điều đó được sửa trong v0.5.736, với một đường inline cho giá trị nhỏ và <code>num-bigint</code> làm dự phòng độ chính xác tùy ý. Công lao ở đó thuộc về độc giả đã để lại chú thích trên bài của aya_koto; chúng tôi không biết họ là ai, nhưng nếu bạn đang đọc cái này: cảm ơn.
      </p>

      <h2>Tái dựng</h2>
      <p>
        Nếu bạn muốn tự tái dựng các con số này:
      </p>
      <pre><code>{`git clone https://github.com/AXT-AyaKoto/perry-ts-test-2026-0421.git /tmp/aya-koto-bench
cd /tmp/aya-koto-bench

npm install -g @perryts/perry@0.5.875
perry abc451d-perry.ts -o abc451d-perry

# Sanity (should print 328 for input 69):
./abc451d-perry < abc451d-input.txt

# The article's exact command:
hyperfine --warmup 10 --runs 100 --export-markdown abc451d-bench.md \\
  './abc451d-perry < abc451d-input.txt' \\
  'deno run --quiet --allow-all abc451d-deno.ts < abc451d-input.txt' \\
  'bun run abc451d-bun.ts < abc451d-input.txt'`}</code></pre>
      <p>
        Các con số của bạn sẽ thay đổi theo phần cứng và phiên bản runtime. Nếu chúng thay đổi theo cách trông có vẻ sai, <a href="https://github.com/PerryTS/perry/issues" className="text-amber-400 hover:text-amber-300">mở một issue</a> — chúng tôi thà nghe về nó.
      </p>
      <p>
        Source: <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry</a>
        {" "}— Issues: <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">github.com/PerryTS/perry/issues</a>
      </p>
      <p>— Ralph</p>
    </>
  );
}
