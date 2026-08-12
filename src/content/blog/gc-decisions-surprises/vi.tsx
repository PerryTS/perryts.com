import { BlogMarkdownContent } from "@/components/BlogMarkdownContent";

const markdown = String.raw`**Tóm tắt.** Perry biên dịch TypeScript thành binary native và dùng tracing collector dạng thế hệ, có thể di chuyển object với precise roots — không dùng reference counting. Sau một tháng mà gần như toàn bộ công việc GC là *tìm hiểu collector thực sự đang làm gì*, Perry hiện thắng Node ở 9/19 benchmark thiên về GC (từ 3), thắng đối thủ AOT dùng reference counting ở 14/19 và nằm trong 1,3× Node ở 15/19. Trên đường đi, chúng tôi gặp một lớp bug không để lại bằng chứng, các biến môi trường không điều khiển gì, CI gate về cấu trúc không thể thất bại, một doc comment khiến chúng tôi âm thầm phát hành một collector khác, và phép đo cuối cho thấy khoảng cách còn lại nằm ở *layout* object chứ không phải collection. Chín quy tắc rút ra nằm ở cuối; đa số không liên quan đến garbage collection.

Perry biên dịch TypeScript thẳng thành executable native: SWC parse, chúng tôi lower xuống HIR, LLVM phát machine code và ¤cc¤ link. Không có interpreter hay bytecode. Nhưng ngôn ngữ vẫn có closure thoát khỏi scope, object sống lâu hơn scope và reference cycle — nên phía sau binary native phải là một garbage collector thực sự.

Bài này kể các quyết định khi xây nó, những bất ngờ — gần như tất cả đều khó chịu — và các con số hôm nay. Collector đã là vùng hoạt động mạnh nhất của codebase nhiều tháng: **từ 1/7/2026, 201 commit chạm ¤crates/perry-runtime/src/{gc,arena}¤, 110 trong số đó ở mười hai ngày gần nhất**, trên 127 file và khoảng 75.000 dòng. 135 trong 572 changelog fragment chưa phát hành có tên liên quan GC.

Hầu như không việc nào là “implement một collector”. Đó là tìm hiểu collector của chúng tôi thực sự đang làm gì.

---

## Phần 1 — Những gì chúng tôi chọn

### Không dùng reference counting

Câu hỏi đầu thường là: trình biên dịch AOT sao không dùng reference counting luôn? Nó có vẻ rất hợp: không cần root discovery, safepoint hay hợp tác với optimizer. Trình biên dịch TypeScript AOT cạnh tranh mà chúng tôi đo cũng đi đúng hướng đó.

Nhưng chúng tôi chọn tracing collector vì reference counting bắt trường hợp phổ biến trả giá cho trường hợp hiếm: mỗi pointer store cập nhật counter, cycle vẫn cần tracer dự phòng, và JS allocate vô số object chết ngay — đúng trường hợp nursery xử lý gần như miễn phí. Hôm nay quyết định này có vẻ đúng ở 14/19 benchmark GC và sai ở 5; chúng ta sẽ quay lại cuối bài.

### Value dùng NaN-boxing — và chúng tôi đang tháo bỏ một phần

Mỗi JS value chiếm một word 64 bit. Chúng tôi dùng khoảng 2⁵² mẫu NaN trống của IEEE 754 để tag pointer, integer nhỏ và singleton; phần còn lại là ¤f64¤ thường:

¤¤¤
TAG_UNDEFINED = 0x7FFC_0000_0000_0001   BIGINT_TAG  = 0x7FFA (low 48 = ptr)
TAG_NULL      = 0x7FFC_0000_0000_0002   POINTER_TAG = 0x7FFD (low 48 = ptr)
TAG_FALSE/TRUE= 0x7FFC…0003 / …0004     INT32_TAG   = 0x7FFE (low 32 = int)
                                        STRING_TAG  = 0x7FFF (low 48 = ptr)
¤¤¤

Với collector, đây là thỏa thuận tuyệt vời: “word này có phải pointer?” chỉ cần mask-and-compare, không cần lookup type theo value khi tracing. Một số ở trạng thái nghỉ đã chứa bit IEEE của nó, nên numeric field không tốn box hay header.

Với *mutator*, đây lại là rào cản đơn lớn nhất giữa chúng tôi và V8, và chúng tôi đang chủ động gỡ bỏ. Vấn đề không chỉ là NaN-boxed ¤double¤ là *một* representation mà nó là representation **canonical**. Native machine type chỉ tồn tại như overlay cục bộ theo region, còn cả họ ¤materialize_*_to_js_value¤ box lại ở mỗi boundary nhìn thấy bởi JS. Trong IR phát ra, loop accumulator được chứng minh là ¤i32¤ sống trong ¤alloca double¤, qua ¤-O3¤ vẫn là ¤phi double¤ trên back-edge và trả giá ¤fptosi¤ + ¤sitofp¤ **mỗi iteration**. Parameter đồng loạt là ¤double %argN¤ nên hot function unbox lại argument hàng triệu lần; trước đây ngay cả numeric local cũng được đăng ký làm GC root dù số không bao giờ là pointer.

Phép đo quyết định: bản ¤_encipher¤ của bcryptjs được unroll trung thực mất 834 ms so với Node 184 ms — và *thêm type annotation còn tệ hơn*, từ 834 lên 2732 ms, vì khoảng 80 guard mỗi lần đọc và rematerialization ở boundary chi phối. Fast path cấp expression không sửa được representation problem; mỗi cái chỉ là overlay khác trên canonical boxed và với code unrolled hiệu ứng đảo ngược.

Hướng đi (¤docs/representation-selection-rfc.md¤ và chiến dịch unbox-by-default) là biến native form unboxed thành canonical cho mọi value được chứng minh tĩnh — scalar, string, object, typed array và closure — xuyên suốt local, parameter, return và typed heap slot; chỉ dùng NaN-boxing cho value được chứng minh polymorphic. Nó vẫn là representation *mặc định* nhưng không còn là *duy nhất*. Phase 1, 2, 3a, 3b, 4a và 4b đã merge. Static Hermes là existence proof. AOT phải *chứng minh* type nơi JIT có thể suy đoán, nhưng đó cũng là lợi thế: kernel đã chứng minh không cần warmup và không thể deopt.

Điều này tác động GC theo hai hướng. Unboxing loại roots mà collector phải scan — scalar đã chứng minh không phải root — đồng thời thêm nghĩa vụ: khi heap slot giữ thứ không phải NaN-boxed word, collector không thể suy ra từ value rằng nó là pointer và phải xem layout mask theo shape. Bộ máy ¤pointer_mask¤, ¤raw_f64_mask¤ và layout note này sinh ra vài bug bên dưới.

### Một heap mỗi thread, không chia sẻ

Perry mặc định single-threaded; ¤perry/thread¤ cung cấp ¤spawn¤ và ¤parallelMap¤, value qua thread boundary bằng deep copy (¤SerializedValue¤), không phải sharing. Chi phí ergonomics có thật nhưng collector được lợi lớn: **không bao giờ đồng bộ với thread khác.** Không global safepoint protocol, handshake hay read barrier cho invariant cross-thread. Mỗi arena, root scanner và remembered set là thread-local.

### Generational vì phân bố allocation cho thấy vậy

Mỗi thread có hai region: nursery (¤ARENA¤, block 1 MB) và old generation (¤OLD_ARENA¤), ¤GcHeader¤ 8 byte mỗi allocation, hai aging bit (¤HAS_SURVIVED¤ và ¤TENURED¤) thay counter, và ¤PROMOTION_AGE = 2¤. Kế hoạch ban đầu viết ngày 24/4/2026 trước khi có code đã tóm tắt: hơn 90% allocation JS chết trong scope tạo ra nó, nên flat arena dành đời mình remark những object rõ ràng đã chết.

Kế hoạch cũng xác định đúng prerequisite mà mọi thứ còn lại phụ thuộc:

> **Generational GC cần precise roots.**

Conservative scanner đủ cho collector không di chuyển: false positive chỉ giữ object chết thêm một cycle. Collector *moving* không thể vậy. Nếu không enumerate root chính xác, không rewrite được; không rewrite thì không di chuyển được gì.

### Roots: một analysis, hai lowering và LLVM statepoints mặc định

LLVM có thể giữ value trong register, rematerialize và spill ở bất cứ đâu; collector không thể inspect chúng. Câu trả lời của Perry có hai lớp và chúng tôi mất quá lâu mới tách chúng ra.

**Analysis** — local nào giữ GC pointer và mỗi cái phải live đến đâu — độc lập backend. **Lowering** câu trả lời đó vào emitted code là lựa chọn:

- *Shadow stack.* ¤js_shadow_frame_push(n)¤ lúc vào, một ¤js_shadow_slot_bind¤ mỗi JS-level local, ¤js_shadow_frame_pop¤ lúc ra; collector duyệt frame đặt trên heap.
- *Native stack maps qua RS4GC.* Root alloca thành ¤ptr addrspace(1)¤, function nhận ¤gc "statepoint-example"¤, mỗi module qua ¤opt -passes='function(mem2reg),rewrite-statepoints-for-gc'¤. LLVM tự chèn statepoint, relocation và rewrite use về sau; khi collection chúng tôi đọc roots từ section ¤__perry_gcmap¤ nhỏ gọn.

**Từ #7370, statepoint lowering là mặc định.** Không cần ¤PERRY_RS4GC=1¤; ¤PERRY_RS4GC=0¤ quay về shadow stack để bisection. Quyết định phụ thuộc target vì ¤gc_map¤ từ chối emit map khi runtime không giải được frame base — map không ai đọc sẽ âm thầm mất roots. Quy tắc là native roots nơi runtime walk được, shadow stack nơi không. aarch64/arm64 và x86-64 nhận statepoints; watchOS ¤arm64_32¤ và Windows ARM64 giữ shadow frame. Fallback không phải “không có roots”, mà là lowering kia của cùng analysis.

Bằng chứng cho chuyển đổi không đặt env: full gap suite 479 tests với **0 regression, 0 compile failure**; toàn bộ **128 test chứa ¤try¤** compile, đúng class bridge statepoint viết tay cũ không xử lý; 10 GC ratchet probe byte-identical với Node; runtime −1–2%, hơi nhanh hơn; binary +1,86% trên 81 module zod.

Ưu điểm thực so với “chúng tôi emit shadow stack” không phải 1–2%. Statepoint mang **relocation semantics optimizer phải tôn trọng**, còn shadow stack chỉ đúng khi optimizer không làm điều thông minh với value chúng tôi quên spill. Bằng chứng ở Phần 3.

Còn có **79 runtime root scanner được đăng ký** cho state sống trong runtime chứ không ở user code: pending promises, timer callbacks, exception state, async-context stacks, shape caches, string intern table và JSON scratch tables.

Một conservative native-stack scanner cũng tồn tại. Tài liệu kiến trúc gọi nó là một trong ba cơ chế tương đương; văn bản ấy đã cũ, và việc phát hiện trong lúc viết rất đáng suy nghĩ. Trong production, ¤conservative_stack_scan_decision()¤ trả ¤SkipDisabled¤: liveness phụ thuộc hoàn toàn precise map — statepoints hoặc shadow frame ở fallback target — cộng ¤RuntimeHandleScope¤ trong runtime helper. Conservative path còn cho mode cụ thể, chủ yếu collection ở allocation point, không phải safety net dưới precise path.

### Write barrier được arm một cách lazy

Nguy hiểm generational là pointer old→young: minor GC chỉ trace nursery phải biết chúng. Codegen emit ¤js_write_barrier¤ tại pointer store và runtime giữ remembered set.

Invariant arm từ #7250 là một trong những phần tái sử dụng tốt nhất:

> Khi disarmed, barrier không ghi gì. Đổi lại, lần *đọc* remembered set đầu trên thread không tin log; nó dựng lại đầy đủ tập edge old→young từ heap và arm barrier trong lúc đi.

Điều này được ép bằng cấu trúc: ¤remembered_dirty_snapshot()¤ là ¤pub(super)¤, có bảy call site và đều ở ¤gc/¤.

*(Ghi chú cho người đọc source: Perry có hai thứ không liên quan đều gọi là “barrier” — GC write barrier và compile-time promotion barrier ¤Ptr<Shape>¤ trong representation-selection pass. Ba issue mất thời gian vì nhầm chúng. Luôn nói cả file.)*

---

## Phần 2 — Những bất ngờ

### 1. Lớp bug không để lại bằng chứng

Rooting invariant gói trong một câu:

> Mọi GC-managed value còn live qua collection point phải reachable từ root trước point đó. Value đọc từ root rồi giữ trong SSA register qua một call **không được rooted**: đó là bản sao và collector không thấy bản sao.

Vi phạm tạo trải nghiệm debugging tệ nhất dự án. Tại collection *không có gì để tìm*: không dangling reference, slot chưa forward hay anomaly. Sau đó nursery recycle address; stale pointer đọc một object hợp lệ khác và chương trình chết một hay nhiều cycle sau, trong function khác, bằng ¤TypeError: value is not a function¤.

Mọi runtime GC probe đều mù. From-space scan và verify pass sạch. ¤PERRY_GC_VERIFY_EVACUATION¤ kiểm tra reachable slot đã forward nhưng không thể kiểm tra register mà nó không biết tồn tại.

Chúng tôi đã catalog năm dạng từng được phát hành:

| # | Dạng | Vì sao qua review |
|---|---|---|
| #7184 | Root store emit vào index ngoài frame đã push | ¤js_shadow_slot_bind¤ bounds-check rồi no-op im lặng; IR *nói* nó rooted |
| #7192 | Root store emit *sau* call có allocation | slot vừa rooted **vừa** dangling; qua mọi câu “đã rooted chưa?” |
| #7206 | Load method receiver, rồi lower arguments có thể allocate trước khi dùng | Nhìn riêng load thì rõ ràng đúng |
| #7206 | ¤base[key]¤: materialize base, lower key expression, rồi dùng stale base | hai operand; một cái evaluate đầu và dùng cuối |
| #7226/#7239 | Thread-local/static cell giữ heap pointer không scanner nào rewrite | vô hình trong IR |

Bốn dạng được **phát hành trong một ngày**. Mỗi fix chỉ vài dòng; chi phí luôn là detection lag. Chỉ dạng đầu đặc thù shadow stack. Các dạng khác độc lập lowering và sống sót qua statepoints vì lỗi nằm ở *khi nào lowering emit root*, không phải root là gì.

Heuristic hữu dụng duy nhất: **bug GC reproduce hoàn hảo nghĩa là table, không phải register.** Unrooted register chỉ hỏng khi collection rơi đúng window nên intermittent; unrooted cache hỏng ở collection #0 và tiếp tục hỏng. Có một ngoại lệ: ¤&str¤ hay ¤&[u8]¤ borrow từ heap ¤StringHeader¤ và giữ qua allocating call. Rooting rewrite *slot*; borrow không phải slot. Fix sound duy nhất là copy bytes ra ngoài heap trước allocation đầu.

### 2. Chúng tôi ngừng inspect và bắt đầu xây instrument

Bước ngoặt #7154 không phải fix; đó là bỏ inspection sau mười vòng investigation và xây tool biến bug thành fault ngay lập tức.

**From-space quarantine.** Sau evacuating minor, không recycle from-space. Các block retired vào ring giới hạn, được lấp poison word có byte đầu giống ¤obj_type¤ không hợp lệ (¤0xDE¤), và phần trong page-aligned nhận ¤mprotect(PROT_NONE)¤. Stale dereference giờ SIGSEGV *tại instruction gây lỗi* khi holder vẫn trên stack. Reporter nêu address, minor nào retire page và object từng sống đó, rồi khôi phục ¤SIG_DFL¤ và fault lại để debugger thấy đúng site.

**GC zeal.** Ép evacuating minor tại mọi safepoint để unrooted value di chuyển ở lần exposure đầu thay vì chờ allocation burst không liên quan trùng window. Dựa trên ¤--stress-scavenge¤ của V8 và ¤gcZeal¤ của SpiderMonkey.

**Depth knob không ai nghĩ sẽ cần.** Quarantine là ring *N* retired page-set, mặc định 4. Reproducer ¤new C(…)¤ của #7154 không fault ở 4, 8 hay 100; constructor qua khoảng 600 back-edge poll, đến lúc return override công bố stale register của caller thì page đã 600 lần retirement. Với ¤PERRY_GC_PROTECT_FROMSPACE_DEPTH=800¤ nó fault ngay lần dùng đầu. “Tăng depth” giờ là lời khuyên đầu tiên khi bug đáng ngờ không reproduce.

Instrument được **sabotage-test**, không chỉ chạy: ¤quarantine_catches_a_planted_stale_from_space_deref¤ cài dạng #7184/#7192 và yêu cầu instrument thấy poison trong khi control không instrument đọc recycled object hoàn toàn hợp lệ. Control chứng minh bug thật sự vô hình nếu thiếu tool.

Static instrument ¤scripts/gc_root_dominance_check.py¤ đọc LLVM IR emitted và kiểm tra root store dominate mọi site sau có thể collect. CI gate có allowlist **rỗng**; hit mới làm build đỏ. Nó vẫn mù theo cấu trúc với runtime table, unrooted local trong runtime Rust và symbol không biết tên; chúng tôi ghi rõ vì báo cáo sạch đã hai lần bị xem là bằng chứng cho thứ nó không thể kiểm tra.

### 3. Một nửa knob không gate gì

Bất ngờ này đổi chính sách kỹ thuật hơn là code.

Trong nhiều tháng, ¤PERRY_GEN_GC_EVACUATE¤ là knob chứng minh thay đổi an toàn dưới evacuation. Khi đo đúng — binary giống nhau, cùng host, diff từng cell của 12 ratchet probe × 8 counter — nó di chuyển **0/96 cell**. Median bit-identical. Cùng cách với ¤PERRY_GEN_GC=0¤ di chuyển 79 cell, nên harness nhạy; riêng knob kia thì không. Nó gate fallback path mà counter không bao giờ đến từ đó.

Tác dụng sống duy nhất là footgun: nó veto forced evacuation, nên ¤PERRY_GEN_GC_EVACUATE=0¤ trong environment âm thầm disarm ¤PERRY_GC_ZEAL¤ và zeal run có thể báo “clean” mà không di chuyển gì.

Nó không đơn độc:

- ¤PERRY_GC_FORCE_EVACUATE¤ được đọc **chỉ ở minor path**, trong khi mọi test dùng nó gọi ¤gc()¤, chạy full mark-sweep sau forced conservative scan. Nhiều tháng “pass dưới forced evacuation” không có nghĩa.
- Knob ¤--pressure¤ của stress matrix tắt đúng path nó đo: defer hard cap và arena trigger ceiling dùng chung công thức rồi collapse cùng nhau; arm ¤default¤ chạy zero copying minor cả 22 row.
- ¤PERRY_GC_FROMSPACE_SCAN_ABORT=1¤ hoàn toàn inert khi đứng một mình: scan không chạy, không gì abort, run báo success.
- Doc comment của ¤gc_incremental_enabled¤ nói “EXPERIMENTAL — default OFF” phía trên body comment “DEFAULT ON” tám dòng. Quyết định merge dùng cái sai.

Chính sách kết quả giờ bắt buộc trong ¤CLAUDE.md¤:

> **Mỗi GC env knob hoặc có required CI arm exercise trạng thái OFF, hoặc bị xóa sau một release soak.** Chỉ tối đa một diagnostic-only knob cùng lúc và phải ghi untested.
>
> **Mode còn tồn tại là quyết định chưa được đưa ra.**

¤PERRY_GEN_GC_EVACUATE¤ bị xóa, không sửa. Mỗi deletion site giữ tombstone comment giải thích từng có gì và vì sao mất — năm điểm đúng nơi người ta sẽ thêm lại conjunction. CI audit suy ra accepted knob từ production parser không comment và fail với claim sống về knob đã xóa; self-test cài knob xóa sau parser comment và chứng minh không cái nào qua.

### 4. Gate không thể thất bại

¤CLAUDE.md¤ liệt kê bốn cách CI gate về cấu trúc không thể biến merge thành đỏ. Cả bốn đã xảy ra, ba trong một tuần:

1. ¤continue-on-error: true¤ — ¤gc-stress¤ giữ nó nhiều tháng dù là job duy nhất cover GC correctness.
2. Không nằm trong required context của branch protection — job báo failure nhưng không block là documentation, không phải gate.
3. ¤concurrency¤ với ¤cancel-in-progress¤ vô điều kiện — runner queue chậm khiến merge mới cancel run trước khi tới runner; ¤gc-ratchet¤ có ba run ¤main¤ liên tiếp bị cancel, zero execution.
4. **Gate chạy nhưng subject không hề chạy** — nguy hiểm nhất vì job thật sự green.

Rồi thêm hai cái. ¤gc-stress¤ *chưa từng chạy trên ¤main¤*: trigger ¤push:¤ chỉ tag và điều kiện ¤if:¤ thiếu ¤schedule¤, nên 12/12 nightly báo ¤skipped¤. Còn ¤lint¤ — required context — đỏ hơn ba nightly vì 16 file vượt giới hạn 2000 dòng; mọi merge đều vào bằng admin bypass. Branch protection chỉ là sân khấu, và gate mới nối đúng vào ¤lint¤ sẽ inert ngay khi tới.

Hệ quả phải học đi học lại: **gate phải assert subject của nó live, không chỉ không gì throw.** Zeal run in ¤forced_collections=… copying_minors=… moved_objects=… loop_polls=…¤ khi exit và **exit 70 nếu bất kỳ cái nào bằng zero**; run không exercise gì là đỏ chứ không xanh.

### 5. Collector cứ schedule collection không thể giúp nó

Một structural bug lặp lại ba lần độc lập với cùng hình dạng: *predicate schedule collection không thể thay đổi quantity mà predicate đọc.*

**Survivor-promotion handoff (#7592).** Predicate thay minor bằng full mark-sweep để dọn chỗ old-gen cho survivor sắp promote. Nhưng full mark-sweep là non-moving — không promote gì — nên không giảm pressure gọi nó và lại true ở minor kế. Trên JSON pipeline 200k record: **19/22 collection là full kiểu này, mỗi cái free 0.0 MB ở khoảng 400 ms**: 7,6 s trong phase 8,6 s. Copying minor thực sự promote chưa chạy lần nào.

**Nursery cap (#7690).** Cap theo from-space occupancy được áp lên minor *non-moving* sweep tại chỗ và để from-space vẫn đầy. Trigger capped chạy non-moving minor thì đến block kế lại due: một whole-arena collection mỗi 1 MB allocated, quadratic theo live set.

**Live-proportional cap thành fixed point.** Dùng ¤max(base, arena_in_use)¤ để cap scale cùng live set, nhưng due test so *from-space occupancy* với cap và workload có from-space ≈ live; from-space không thể vượt cap của chính nó, scavenging dừng hoàn toàn. Nó đo thắng 5,9× vì không làm việc.

Hai quy tắc chịu lực trong pacing code:

> **Đừng pace collection bằng quantity mà collection đó không di chuyển được.**
>
> **Không constant band nào được pace collector có cost mỗi cycle O(live).** Tổng việc thành quadratic theo live set; constant lớn hơn chỉ dời vách đá.

Sửa family này đưa một JSON workload từ **60,4 s xuống 3,86 s**, với per-record cost phẳng trong khoảng ~30% qua dải size 20× trước đây tăng 70×.

### 6. Có lần collector ghi tài liệu cho thay đổi nó chưa hề làm

Dòng đơn đắt nhất câu chuyện là doc comment.

#7690 viết đầy đủ lý lẽ bật moving-loop back-edge polls mặc định vào hai doc comment — runtime và codegen — rồi **không đổi body nào**. Cả hai vẫn match ¤1|on|true¤, tức default OFF; không test nào pin default. Comment runtime còn nói “mirror của codegen MUST agree”; chúng đúng là agree, nhưng ở giá trị tài liệu nói đã bỏ.

Đây không chỉ là configuration chậm hơn mà là collector khác. Nursery pressure có đúng hai precise collection point: loop back-edge poll và outermost microtask-pump boundary. Không emit poll thì compute-only program không tới cái nào. Mọi nursery collection rơi vào allocation point, nơi fix trước đã đúng khi làm collection non-moving. **Collector phát hành không có nursery evacuation nào**, fallback sang whole-arena full collection.

| bench | ¤main¤ đã phát hành | polls bật thật |
|---|--:|--:|
| tree | 5.10 s | **1.63 s** |
| tree_wide | 7.26 s | **2.12 s** |
| retain | 2.33 s | **1.32 s** |
| churn | 1.00 s | **0.46 s** |
| cycles | 0.29 s | **0.19 s** |

Một benchmark chạy **13 whole-arena full collection (pause 0.477 s)** nơi vài tuần trước cùng program chạy **105 copying minor (0.016 s)**. Tổng GC pause của ¤tree¤ giảm 4.107 s → 0.550 s; max pause 266 ms → 16 ms. Diagnostic tìm ra không phải wall time mà là *loại* cycle trong ¤PERRY_GC_TRACE=1¤: ¤{'full': 13}¤ thay vì ¤{'minor': 105}¤.

Ba test giờ pin default gồm unrecognised-value arm, và test thứ ba pin hai crate đồng ý — disagreement im lặng cả hai hướng: poll không ai consume hoặc deferral không ai drain — nên cần assertion chứ không phải hai comment nói chúng giống nhau.

Class chưa đóng. Profiling tuần này thấy cùng hình dạng ở write barrier: **codegen emit ¤seq_cst¤ load của barrier-active counter — ¤ldar¤ trên aarch64, ¤evalNode¤ có 42 site — trong khi runtime đọc cùng global bằng ¤Relaxed¤ cho cùng quyết định**; doc comment codegen nói “one relaxed load of a ¤static¤”. Hai reader không đồng ý ordering và docs đứng phía đối diện code. Tối đa một bên đúng; nếu runtime sai thì nghiêm trọng hơn ¤ldar¤ nhiều. Nó được file thay vì đoán vì missed insertion barrier sẽ im lặng lúc collection rồi xuất hiện vài cycle sau thành ¤TypeError: value is not a function¤.

### 7. Công việc GC nhanh nhất là việc bạn xóa

Khi pacing bug biến mất, cost còn lại liên tục là việc không nên tồn tại.

**Heap không gì chết bị mark lặp lại.** ¤retain.ts¤ xây array 3M record và không drop gì. Perry dùng **1,26 s trong run 1,31 s ở collector** — 96%; Node 0,13 s. Hai full mark-sweep chỉ reclaim tổng 4 MB, một cái đổi arena occupancy đúng zero, vì escalation predicate theo growth và live set tăng sẽ qua threshold mỗi lần gấp đôi. Fix: định giá full theo thứ nó reclaim và dời threshold khi full không hiệu quả.

**Mỗi evacuated object lấy process-global mutex để hash map rỗng.** Move hook chạy SipHash ¤remove¤ trên registry dư của ¤Object.setPrototypeOf¤, rỗng trong program không re-prototype. Latch đã nói vậy nhưng move hook là reader duy nhất bỏ qua. Promotion 3M record trả 2,5M mutex acquisition thật mà vô ích.

**Rồi chúng tôi ngừng di chuyển object.** Khi nursery copying minor gần như toàn live, evacuation từng object là pure overhead: old-gen allocation mới, ¤memcpy¤, layout transfer, accounting, move hooks, forwarding stub và rewrite mọi referring slot để chuyển object không cần chuyển. Whole-block in-place promotion — V8 gọi page promotion — chỉ đổi generation label. Không gì move nên không rewrite:

| workload | trước | sau |
|---|--:|--:|
| retain | 0.81 s | **0.53 s** |
| retain_wide | 1.33 s | **1.07 s** |
| deeplist | 0.30 s | **0.24 s** |
| promotion cost/object | 243 ns | **105 ns** |

**Rồi chúng tôi ngừng trace chúng.** Ba pass vẫn walk mọi survivor: remembered-set dirty scan mark, drain chạm lại, ¤clear_marks¤ chạm lần ba. Trong cycle không gì move hay free, trace tốn ~55–67 ns/object còn walk promote thật ~9 ns. Promoting cycle giờ skip trace khi young-survival ratio đo trước ở fully-live regime; và từ chối nếu assumption nào tốn cost: registered weak-target holder, malloc registry không rỗng, incremental mark đang chạy hoặc một trong ba verify instrument armed — mỗi cái lấy trace làm subject và cycle không tạo marks có thể báo thành công mà không xem gì. ¤retain¤ −33,6%, ¤deeplist¤ −43%; cycle từ 243 ns/object còn **8,9 ns**.

Chính sách là *measurement*, không phải đoán. Không biết block liveness trước trace nên quyết định theo measured young-survival ratio cycle trước. Population hóa ra bimodal qua ba bậc độ lớn:

| họ workload | copying minors | young-survival ratio |
|---|--:|--:|
| retain, retain1, retain_wide, deeplist | 3–7 | 0.999 – 1.000 |
| churn, churn_alloc, push_cls | 105 | 0.000 – 0.004 |
| push_num, cycles | 16–18 | 0.000 |
| tree, tree_wide, churn_read | 0 | *không copying minor nào chạy* |

Cycle dự đoán sai giữ tối đa vài phần trăm một nursery, promoting cycle vẫn trace đủ thường để đo mình, và running cap trên promoted dead bytes giới hạn steady state.

Nói thẳng: **câu chuyện “một cơ chế” thường sai và profile đổi dưới chân bạn.** Pause fraction hôm nay, đo cùng commit với standings dưới:

| program | wall | GC pause | pause fraction | cycles |
|---|--:|--:|--:|--:|
| retain | 159.5 ms | 52.0 ms | 33% | 5 |
| retain1 | 71.4 ms | 38.7 ms | 54% | 3 |
| retain_wide | 206.2 ms | 75.4 ms | 37% | 8 |
| shapes | 64.8 ms | 4.6 ms | **7%** | 1 |
| asyncpipe | 127 ms | 0 ms | **0%** | 0 |

Hai số là 93% và 62% một tuần trước; việc trong section này giết chúng. ¤shapes¤ ở 7% không còn là GC benchmark — trước bug §8 nó có 94 ms GC trong program 139 ms và được xếp “high-survival GC” từ ratio đó. GC lever không move nó nữa. Ratio trông đồng đều giữa benchmark là trùng hợp số học, không phải common cause.

### 7b. “Zero cycle” không phải “không có GC cost” — counter bị đọc như kết luận

Hàng ¤asyncpipe¤ nói pause 0 ms qua 0 cycle và chúng tôi ghi “pure mutator; mọi GC lever không liên quan”. Một profiling round nhận đúng premise đó đã bác bỏ nó.

¤asyncpipe¤ không in dòng ¤[gc]¤ nhưng **~33% leaf profile vẫn là collector machinery**: write barriers, per-object layout side tables và rooting ¤RuntimeHandleScope¤. Tắt moving-loop back-edge polls đo **−14,1% khi program vẫn chạy zero GC cycle**: old-generation incremental mark/sweep được drive ở poll nhưng không hoàn tất cycle nên không report. Đây là lever lớn nhất round, còn premise chỉ sai hướng. (¤PERRY_WRITE_BARRIERS=0¤ là +0,9%, codegen barriers được minh oan; incremental drive thì không.)

> **Cycle counter đo collections, không đo cost của collector.**

Barrier, side-table maintenance, rooting và incremental slice ở phía mutator, vô hình về cấu trúc trong per-cycle trace. ¤0 cycles¤ trông như kết luận nhưng chỉ quan sát một cơ chế.

Bẫy liên quan: ¤asyncpipe_big.ts¤ **không phải scaled version hợp lệ**. 120 batches có zero cycle, 240 có hai copying minor, 1200 bị GC chi phối. Scale để vượt timing noise âm thầm tạo benchmark khác, cùng dạng “realistic” variant rỗng ở §9; chỉ bắt được khi kiểm tra thuộc tính nghiên cứu còn tồn tại qua scale.

### 8. Mười sáu byte trên ngưỡng

Bug đơn hay nhất chiến dịch. ¤shapes¤ tốn 94 ms trong run 139 ms ở hai minor collection, báo survival ratio 739‰ và 925‰ trong khi live set thật chỉ khoảng 3200 object.

¤arena_alloc_gc¤ tạo mọi thứ trên ¤LARGE_OBJECT_THRESHOLD_BYTES¤ — 16 KB — thẳng trong old-gen và mark ¤TENURED¤. Backing store ¤Node2D[]¤ 2000 element là 16.400 byte. **Mười sáu byte trên ngưỡng.**

Mọi array sống vĩnh viễn — minor không sweep old-gen —, write barrier trung thực ghi edge old→young mỗi store, minor kế remark cả 2000: 94.000 rồi 118.006 slot.

Fix thú vị vì “nâng threshold” là sai. Vượt ngưỡng đổi *copy cost* lấy *retention cost*. Object pointer-free có cả hai bị giới hạn bởi size nên giữ 16 KB. Với object có pointer, retention transitive và không giới hạn; array, object và closure nhận 128 KB — ¤kMaxRegularHeapObjectSize¤ của V8 vẽ cùng ranh giới vì cùng lý do. Selection đọc flag ¤pointer_free¤ sẵn có, không danh sách type; unknown type giữ giá trị conservative.

¤shapes¤ giảm 0,139 s → 0,061 s vòng đó — 0,058 s và nhanh hơn Node **1,39×** ở final sweep —, peak RSS 71,4 MB → 32,3 MB. 18 program khác trong ±1,3%.

### 9. Đo khó hơn sửa

Danh sách chưa đầy đủ những thứ cho kết luận sai đầy tự tin:

- **Benchmark với ¤main¤ hỏng.** Program allocation-heavy chậm ~20× nhiều ngày do surprise #6, làm A/B vô dụng. Signature độc lập load: 105 → 1304 collection. Không ai nhìn vì thời gian chỉ *tệ*, chưa phi lý.
- **Auto-optimize relink build runtime với ¤--no-default-features¤**, âm thầm bỏ ¤diagnostics¤. ¤PERRY_GC_TRACE¤ không in và cycle trông là **0**. Một investigation kết luận “zero collection” ở ba arm.
- **Ratchet baseline pin ở host khác và lùi ba mươi revision** báo 29 “regression” thật ra là drift. Luôn đo hai arm liên tiếp cùng máy.
- **Thắng lợi pretenuring 108 MB → 0 là confound**: baseline arm đứng trước thay đổi giữa chừng. Cơ chế đúng, target sai — parse tree runtime allocate, không phải literal codegen-visible — và trần khoảng 1 MB.
- **Chúng tôi timing program crash nhiều tuần.** Binary đối thủ in đáp án đúng ở ¤deeplist¤ rồi exit −11 (SIGSEGV) trong recursive refcount drop. Chúng tôi ghi là thua. Giờ mọi harness lưu exit code mỗi cell.
- **¤grep -c¤ exit 1 với zero match**, cắt chain ¤&&¤. Pipe ¤PERRY_GC_TRACE¤ cũng gặp SIGPIPE và output 141.

Quy tắc còn lại: dẫn census counter, không dẫn đồng hồ — nó độc lập load —; so *binary* trước timing; assert comparison thực sự so thứ gì; kiểm tra arm được nói tới thật sự live.

---

## Phần 3 — Hai con đường dài

### Statepoints: con đường đã chọn, sau bốn tháng và ba enabler

Từ prototype đầu, ¤gc.statepoint¤ của LLVM rõ ràng vượt trội về correctness. Nó cho **relocation semantics mà optimizer phải tôn trọng**, còn shadow stack chỉ đúng nếu optimizer không làm gì thông minh với value bạn quên spill. Điều đáng kể là mọi thứ giữa “rõ ràng tốt hơn” và “phát hành mặc định”, vì không chậm trễ nào do performance.

**Nó bị chặn bởi thứ không phải GC.** Exception lower thành ¤setjmp¤/¤longjmp¤, và ¤longjmp¤ có thể nhảy *qua* ¤gc.relocate¤ nên relocated pointer không được ghi lại. Với RS4GC còn tệ hơn: ¤mem2reg¤ không promote volatile alloca cần cho setjmp correctness, nên try-region roots không vào SSA hay relocate. ¤gc.statepoint¤ có invoke form chính vì việc này. Con đường statepoints đi qua xóa toàn bộ setjmp exception lowering của Perry và thay bằng invoke/landingpad (#7302/#7305), rồi đưa LLVM in-process (#7301) để kiểm soát pass pipeline. Không cái nào là GC ticket.

**Thỏa hiệp hấp dẫn là bẫy.** “Giữ shadow stack cho function có ¤try¤” sẽ đóng băng hai root mechanism mãi mãi. “Xóa shadow stack, giữ statepoints” lại không *biểu diễn được*: statepoints là lowering khác của root-set analysis từ shadow stack, không phải cơ chế độc lập. Tách predicate (#7340) mới cho phép default theo target và deletion tương lai; trước đó ¤PERRY_SHADOW_STACK=0¤ + statepoints tạo binary **không precise root nào**, không section ¤__perry_gcmap¤, output đúng và không phân biệt với build tốt tới khi collection free thứ live.

**Một trong hai backend phải chết.** Chúng tôi từng giữ bridge statepoint viết tay cạnh RS4GC. Chúng không ngang nhau: bridge không root được ¤invoke¤ nên từ chối function có try, đồng thời là silent fallback RS4GC — đúng dạng untested configuration mà knob kill-policy ngăn. Trước khi xóa, chúng tôi đo **1.574 function trên app Drizzle thật và ratchet probes đều lower bằng RS4GC, không fallback.** Bridge, CFG liveness analysis, call parser, emitter, enum ¤PreciseRootBackend¤ và knob ¤PERRY_STATEPOINTS¤ cùng biến mất; bail giờ là hard failure nêu function, không phải downgrade.

**Rồi default phát hành không coverage.** Native roots là default ở mọi walkable target nhiều tháng trong khi **chín root-lowering mechanic không có assertion nào với lowering Perry thật sự emit**; ba test trông như coverage đo zero: assert ¤js_shadow_slot_bind¤ *vắng mặt*, điều luôn đúng dưới native default dù program rooted hay không. Hazard 4 ngay trong hệ thống có nhiệm vụ không âm thầm mất roots. #7653 sửa bằng ba vantage — IR trước ¤opt¤, bundle ¤"gc-live"¤ sau RS4GC và blob ¤__perry_gcmap¤ decoded — vì mỗi cái mù với thứ cái sau bắt. Static root-dominance checker cũng anchor trên ¤@js_shadow_slot_bind¤, compile corpus bằng ¤PERRY_RS4GC=0¤ và kiểm lowering chúng tôi không phát hành tới khi #7663 dạy statepoints.

Một design law đến từ negative result đo được: **root metadata thiếu relocation semantics là unsound dưới optimizing compiler.** Scheme metadata mỗi function cho map nhỏ hơn 10–13× và deterministic corrupt churn loop 10 dòng — không vì map sai, mà mutator đọc from-space qua stale heap-derived SSA value chỉ relocation sửa được. Barrier giới hạn memory ordering, không giới hạn dataflow.

### Unboxing: đang tiến hành và giờ là sự kiện chính

Con đường dài kia từ Phần 1: biến unboxed native representation thành canonical và hạ NaN-boxing thành polymorphic fallback. Phase 1 (scalar locals), 2 (specialised ABI), 3a/3b (strings và ¤Ptr<Shape>¤ pointer locals), 4a/4b (typed heap: numeric arrays rồi bookkeeping boxed layout trả thừa) đã merge.

Hai điều cần báo cáo trung thực.

**Một sub-phase được đánh giá rồi từ chối, và lý do là lời khen NaN-boxing.** Unboxed *object fields* — headline gốc Phase 4b — bị scope out sau recon thay vì build. Slot field ¤number¤ đã giữ raw IEEE bits vì NaN-boxing chỉ dành ¤0x7FF9..=0x7FFF¤; ¤raw_f64_mask¤ của layout là *proof bit*, không phải đổi storage, và read guard đã mất. Raw string handle khi nghỉ sẽ phá small-string optimisation bằng heap-materialize short string vô ích. Raw ¤i1¤/¤i32¤ slot cần mask thứ ba và layout probe ở ~25 direct slot-read site gồm ¤JSON.stringify¤, ¤util.inspect¤ và ¤v8¤ serde — hot path chứ không hiếm. Thay vào đó là elision: field store trên proven receiver bỏ layout note khi value là non-pointer by construction, và bỏ string addref khi value không thể là heap string.

**GC đưa chiến dịch target kế.** Phép đo cuối Phần 4 nói collector không còn là binding constraint ở cluster khó nhất; mutator mới là, cụ thể vì **object literal hai field chiếm 72 byte**. Đây chính xác là representation problem theo RFC và “actual objects” đi tiếp ở đó.

### Những con đường không chọn

**Concurrency.** Chỉ thị của chủ dự án khi hỏi thẳng:

> “Tôi không muốn đuổi parallelism/concurrency chỉ vì bản thân nó. Nó nên là giải pháp sau cho việc bắt buộc, nhưng không đánh đổi hot path.”

Ràng buộc này *quyết định* design thay vì trì hoãn. Ba family khác nhau nơi tính phí mutator: parallel stop-the-world không tính gì — GC thread chỉ sống trong pause; concurrent marking tính store barrier mỗi pointer write; concurrent compaction tính **load barrier** mỗi pointer read. Load nhiều hơn store rất xa nên cái cuối là từ chối mạnh nhất. Parallel STW là design duy nhất chấp nhận được, đứng thứ ba sau (1) xóa per-object work không nên có và (2) pretenure immortal cohort. Parallelize 2,1M object visit không nên xảy ra là dùng bốn core làm việc sai nhanh hơn.

Measurement độc lập đồng ý mạnh hơn. Sau §7, visits ở promotion case tệ nhất chia khoảng nửa là việc đã xóa và nửa là **9,6 ms của program 159 ms**. Không còn đủ collector time đáng parallelize — 2× GC work chỉ là 3% program. Parallel GC không phải kế hoạch trì hoãn; trên workload này là non-lever đã đo.

Correctness còn quan trọng hơn perf: hôm nay “bug GC reproduce hoàn hảo nghĩa là table, không phải register” là diagnostic thật. Parallel collector phá nó và biến 79 root scanner cùng mọi ¤thread_local!¤ cache thành potential data race.

**Old-page defragmentation — phát hành bật mặc định rồi revert cùng ngày.** Compact old page partially-live đã tắt từ bug 2026-07 reproduce stale non-heap reference tới old object đã move (corruption 6/6 khi bật). Bật lại được theo dõi như *rewrite-contract project*, không phải env flip; acceptance bar là enumerate mọi metadata/IC/cache path giữ movable old address và **“chỉ re-enable defrag sau khi reproducer cùng dependency-scale stress corpus sạch.”**

Contract work merge tốt: static root-dominance allowlist vẫn rỗng nên ~40 hit cũ được fix thật, không suppress lại; runtime holder policy *chặt hơn* khiến ¤open_gap¤ và ¤unverified¤ fail; hai cache có safety dựa trên “chỉ old-gen defrag move được chúng” được fix thay vì exempt; exemption xóa còn có tripwire ¤becomes_real_when¤ gọi đúng trigger này.

Nhưng **default flip** đi cùng mà không bằng chứng, vì suite về cấu trúc không thể có. Selection cần ¤dead_bytes >= live_bytes¤ trong old page, tức promote-then-die ở scale. Family ¤retain¤ sống 999–1000‰ còn ¤churn¤ gần như không promote, nên **không benchmark nào tạo candidate page.** Suite không cho benefit hay regression signal nhưng vẫn nhận toàn old-address rewrite surface; mọi GC gate còn queued chưa chạy lúc merge.

Chúng tôi giữ toàn correctness work và revert default thành opt-in tới khi có fragmentation workload thực sự exercise; lúc đó arm thua sẽ bị xóa. Quy tắc mới:

> **Feature benchmark suite không trigger được là feature suite không bảo vệ được.** Phát hành default OFF tới khi có workload làm được, hoặc chấp nhận cả hai arm untested.

**Pretenuring.** Build hai lần, đo, bác bỏ và đỗ lại với điều kiện reopen ghi rõ. Điều đúng về kiến trúc — đặt long-lived object vào old-gen khi sinh — thua điều emergently đủ — seed promote-on-first-copy giới hạn cohort một hop. Ở mọi load dựng được, hai arm không phân biệt. Meta-lesson đi thẳng vào practice: **test discriminating shape trước khi build invariant.**

---

## Phần 4 — Tình hình hiện tại

Closing sweep 2026-08-12, M1 mini yên tĩnh được pin, best-of-5, check exit, output byte-verified với ¤node --experimental-strip-types¤ trước timing. 19 benchmark dạng GC so với Node 26.5.1 và đối thủ AOT reference counting.

**Perry thắng Node 9/19** (đầu round là 3), **thắng compiler reference counting 14/19**, và **trong 1,3× Node ở 15/19.**

| bench | perry | node | P/node | Δ round này |
|---|--:|--:|--:|--:|
| churn_read | 0.023 | 0.089 | **0.25** | −0.9% |
| fib40 | 0.393 | 1.036 | **0.38** | −0.2% |
| deeplist | 0.057 | 0.096 | **0.59** | −44.1% |
| push_num | 0.070 | 0.117 | **0.60** | −0.6% |
| shapes | 0.058 | 0.081 | **0.72** | **−58.0%** |
| retain1 | 0.069 | 0.086 | **0.80** | −36.9% |
| retain_wide1 | 0.071 | 0.091 | **0.78** | −46.5% |
| push_cls | 0.117 | 0.141 | **0.83** | −50.0% |
| churn_alloc | 0.118 | 0.141 | **0.84** | −50.8% |
| tree | 0.453 | 0.452 | 1.00 | +0.1% |
| churn | 0.171 | 0.167 | 1.02 | −40.7% |
| tree_wide | 0.951 | 0.916 | 1.04 | +0.0% |
| cycles | 0.084 | 0.076 | 1.11 | −2.4% |
| retain | 0.156 | 0.137 | 1.15 | −42.1% |
| retain_wide | 0.202 | 0.157 | 1.28 | −45.7% |
| asyncpipe | 0.127 | 0.078 | 1.63 | −3.8% |
| pipeline | 0.175 | 0.097 | 1.80 | −33.7% |
| interp | 0.674 | 0.323 | 2.09 | −20.1% |
| iso_miss | 0.966 | 0.334 | 2.89 | −21.5% |

Còn hai cluster **tách biệt**; coi là một cơ chế là lỗi đã từng mắc:

1. **So với Node — dispatch và mutator, hầu hết không GC.** ¤iso_miss¤, ¤interp¤, ¤pipeline¤, ¤asyncpipe¤. Chủ yếu polymorphic property dispatch, inline cache và representation selection — chiến dịch khác. Nhưng xem correction dưới trước khi đọc 0% của ¤asyncpipe¤ là “không GC”.
2. **So với compiler reference counting — family ¤retain¤.** ¤retain1¤ 1,80×, ¤retain_wide1¤ 1,67×, ¤retain_wide¤ 1,65×. Tất cả đã thắng Node. Đây là row không gì chết, đúng nơi mong tracing collector tệ nhất — kỳ vọng hóa ra sai thú vị.

Phát hiện closing sweep tái định hình chiến dịch: **ở cluster hai, collector không còn binding constraint — mutator mới là.** Trừ *mọi* GC pause, ¤retain_wide¤ (130,8 ms pure mutator) và ¤shapes¤ (60,2 ms) vẫn thua. ¤retain¤ cần đúng zero GC mới parity. Cost thật là **object literal hai field chiếm 72 byte**, nên ¤retain¤ viết **216 MB memory để chứa 48 MB số** — write amplification 4,5×. Edge của đối thủ chưa bao giờ là refcount; là compactness. Đây giờ là representation problem (#7916), không collector problem: chiến dịch unbox-by-default Phần 1 nhắm object layout thay scalar.

Defect tương ứng ở cluster kia: ¤asyncpipe¤ collect 1.200–1.650 ns/object, gồm **minor collection 122 ms xử lý zero object** — lâu hơn toàn program. Per-cycle cost độc lập object count là fixed overhead, phần cuối collector còn thấy trên critical path (#7915).

Một thử nghiệm được ghi negative result vì là bước kế rõ ràng nhưng sai: **đừng thu nhỏ nursery đầu.** Cycle 0 là 58–81% GC pause family retain nên cap trông miễn phí; ở 2 MB pause ¤retain¤ giảm 52 → 31 ms. Nhưng ¤asyncpipe¤ từ 0 lên 4 collection, tốn 385 ms trên program 127 ms; promotion sớm retime old-gen trigger thành thêm full mark-sweep (¤retain_wide1¤ +182%).

Về quy mô khởi đầu: JSON pipeline mở chiến dịch từ 60,4 s xuống 3,86 s. Family ¤retain¤ cải thiện 36–46% trong một round việc trên. Cả collector vẫn có kill switch sang full mark-sweep (¤PERRY_GEN_GC=0¤) được exercise, vì ngày không bisect được với nó là ngày không tin được con số nào ở đây.

---

## Các quy tắc chúng tôi dùng hiện nay

Phần lớn bài học vượt ra ngoài garbage collection:

1. **Mode còn tồn tại là quyết định chưa đưa ra.** Xóa branch thua hoặc giữ arm exercise nó; để tombstone comment nơi xóa.
2. **Gate phải assert subject live**, không chỉ không gì throw. “Green vì không chạy gì” tệ hơn red.
3. **Đừng pace feedback loop bằng quantity nó không move được.** Ba livelock độc lập, một hình dạng.
4. **Không constant band nào được pace process O(live).** Constant lớn chỉ dời vách đá.
5. **Khi bug class không để bằng chứng, dừng investigation và xây instrument.** Rồi sabotage-test, gồm uninstrumented control chứng minh bug vô hình.
6. **Doc comment không phải thay đổi.** Pin default bằng test, gồm unrecognised-value case, và pin agreement giữa component phải giống nhau.
7. **Đo cả hai arm trên một host, cùng tree, và kiểm tra exit code.**
8. **Test discriminating shape trước khi build invariant.**
9. **Từ chối permanent hybrid.** “Giữ cơ chế cũ cho case khó” là cách migration thành hai cơ chế mãi mãi. Làm case khó chạy hoặc đừng migrate.

Collector chưa hoàn thành. Lần đầu tiên nó *đọc hiểu được*: mỗi knob gate thứ gì, mỗi gate có thể fail, mọi default được pin bằng test, mọi số công bố đo trên máy yên tĩnh sau verify output. Sự đọc hiểu đó tốn công hơn collector, và là lý do duy nhất con số tháng qua di chuyển.
`.replaceAll("¤", "`");

export default function Content() {
  return <BlogMarkdownContent markdown={markdown} />;
}
