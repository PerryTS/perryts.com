import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript trên LLVM: Monomorphization và sinh mã gốc",
  description:
    "Cách Perry hạ cấp TypeScript xuống LLVM IR — một HIR có kiểu, monomorphization, NaN-boxing — và lý do backend chuyển từ Cranelift sang LLVM để đạt hiệu năng AOT.",
  breadcrumb: "TypeScript trên LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript trên <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Cách Perry hạ cấp một ngôn ngữ được thiết kế cho engine JIT xuống
            LLVM IR — monomorphization, NaN-boxing, inline lowering — và lý
            do nó rời bỏ Cranelift.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Cấu trúc bên trong trình biên dịch
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Xem trên GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Tại sao chọn LLVM cho TypeScript?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Một trình biên dịch ahead-of-time sống trong một chế độ khác
            hẳn so với JIT. JIT biên dịch trong lúc người dùng chờ đợi, nên
            độ trễ biên dịch là ràng buộc chính. Một trình biên dịch AOT
            như Perry chỉ biên dịch một lần — trên máy của nhà phát triển
            hoặc trong CI — và binary sau đó được thực thi hàng triệu lần.
            Sự bất đối xứng đó chính là nơi một trình tối ưu hóa hạng nặng
            tự trả được giá của mình.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM mang đến hai thập kỷ công việc middle-end: vector hóa vòng
            lặp, loop-invariant code motion, global value numbering, sparse
            conditional constant propagation, inlining mạnh mẽ, alias
            analysis. Nhiệm vụ của Perry là đưa cho cỗ máy đó một IR mà nó
            thực sự có thể tối ưu hóa — và đây chính là lúc thông tin kiểu
            của TypeScript phát huy tác dụng.
          </p>

          <h2 className="text-2xl font-bold mb-6">Pipeline hạ cấp</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Mã nguồn được parse bằng SWC, sau đó hạ cấp thành một IR bậc
            cao có kiểu (HIR) — nơi các quyết định thú vị diễn ra trước khi
            LLVM nhìn thấy mã:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorphization.</strong>{" "}
              Hàm và lớp generic được chuyên biệt hóa theo từng lần khởi
              tạo cụ thể, cùng chiến lược mà Rust và C++ sử dụng.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> và{" "}
              <code className="text-slate-300">{`Stack<string>`}</code> trở
              thành hai hàm độc lập, có kiểu đầy đủ — nên trình tối ưu hóa
              làm việc với kiểu cụ thể thay vì một khối dispatch generic,
              và generic không tốn chi phí gì lúc runtime.
            </li>
            <li>
              <strong className="text-slate-300">Static dispatch.</strong>{" "}
              Khi kiểu của receiver đã biết tại thời điểm biên dịch, lệnh
              gọi phương thức được biên dịch thành lệnh gọi trực tiếp mà
              LLVM có thể inline, không phải tra cứu hash-table.
            </li>
            <li>
              <strong className="text-slate-300">Truy cập trường trực tiếp.</strong>{" "}
              Trường đối tượng được giải quyết thành chỉ số tại thời điểm
              biên dịch, nên việc đọc một thuộc tính là một phép load với
              offset cố định — không phải tra cứu dictionary.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing và inline lowering
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Ở những nơi giá trị mang tính động, Perry dùng NaN-boxing: mỗi
            giá trị là một từ 64-bit. Số double được lưu trực tiếp; đối
            tượng, chuỗi, boolean, <code className="text-slate-300">null</code>, và{" "}
            <code className="text-slate-300">undefined</code> được mã hóa
            vào các mẫu bit chưa dùng của một quiet NaN theo chuẩn IEEE
            754. Số là zero-cost — không boxing, không cấp phát cho phép
            toán số học.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            Vấn đề là các phép toán trên giá trị không phải số cần chuỗi
            thao tác unpack-operate-repack trên bit. Nếu những chuỗi thao
            tác đó tồn tại dưới dạng lệnh gọi vào một runtime được biên
            dịch riêng, LLVM sẽ thấy chúng như những hộp đen mờ đục và
            không thể tối ưu hóa xuyên qua chúng. Vì vậy Perry phát ra các
            thao tác nóng — đọc thuộc tính, dispatch phương thức, cấp phát
            đối tượng — dưới dạng LLVM IR inline mà trình tối ưu hóa có
            thể gộp và đơn giản hóa. Ví dụ, việc cấp phát đối tượng được
            biên dịch thành một phép bump allocation thread-local dạng
            inline:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — inline bump allocation</span>
            </div>
            <pre className="text-sm text-slate-300 overflow-x-auto">
              <code>{`%off_ptr = getelementptr i8, ptr %state, i64 8
%offset  = load i64, ptr %off_ptr        ; current bump offset
%new_off = add i64 %offset, 96           ; headers + 8 fields
%sz_ptr  = getelementptr i8, ptr %state, i64 16
%size    = load i64, ptr %sz_ptr         ; block capacity
%fits    = icmp ule i64 %new_off, %size
br i1 %fits, label %fast, label %slow`}</code>
            </pre>
          </div>

          <h2 className="text-2xl font-bold mb-6">Tại sao không phải Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Backend đầu tiên của Perry là Cranelift — bộ sinh mã đứng sau
            wasmtime, được xây dựng cho việc biên dịch nhanh và có thể dự
            đoán được. Đó là điểm khởi đầu đúng đắn, và nó vẫn là một lựa
            chọn xuất sắc cho JIT và runtime sandbox. Hai điều đã buộc phải
            chuyển đổi:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Giới hạn của trình tối ưu hóa.</strong>{" "}
              Cranelift cố tình là một trình biên dịch một tầng, nhanh:
              &ldquo;mã tạm ổn, nhanh chóng,&rdquo; đây là sự đánh đổi đúng
              cho JIT nhưng sai cho một trình biên dịch AOT có điểm bán
              hàng là hiệu năng gốc đỉnh cao.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> Apple
              Watch sử dụng một ABI (lệnh 64-bit, con trỏ 32-bit) mà
              Cranelift không hỗ trợ. Để watchOS tồn tại như một mục tiêu
              biên dịch, LLVM là bắt buộc — và duy trì hai backend nghĩa
              là hai bộ lỗi, hai bộ kiểm thử và hai đường cơ sở hiệu năng.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Việc chuyển đổi không miễn phí: bản phát hành chỉ dùng LLVM
            đầu tiên khiến một số benchmark chậm đi tới 70 lần vì các thao
            tác nóng ban đầu phải đi qua các lệnh gọi helper runtime mờ
            đục. Quá trình khắc phục — inline lowering, bộ cấp phát bump ở
            trên, ranh giới inlining tốt hơn — đã đưa backend vượt qua các
            con số của Cranelift, và đến khi ổn định, Perry đã đánh bại
            Node.js trên mọi benchmark trong bộ của mình, nhanh hơn từ 1,7
            lần đến 24,6 lần với hai lần hòa (tháng 4/2026). Bài phân tích
            hậu kỳ đầy đủ rất đáng đọc:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Từ Cranelift đến LLVM
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Tìm hiểu sâu hơn</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            Trang{" "}
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              cấu trúc bên trong trình biên dịch
            </Link>{" "}
            trình bày chi tiết hơn về NaN-boxing, monomorphization và
            static dispatch. Trên blog,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Tối ưu hóa mọi thứ
            </Link>{" "}
            đi qua công việc tối ưu hóa theo từng bản phát hành, và{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              GC theo thế hệ, JSON lười và benchmark chịu được soi xét
            </Link>{" "}
            giải thích cách phương pháp benchmark hoạt động (RUNS=11, trung
            vị + p95). Để có bức tranh toàn cảnh hơn, hãy bắt đầu với tổng
            quan{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              trình biên dịch TypeScript gốc
            </Link>
            .
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Tự mình xem đầu ra
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              mã máy gốc, không có engine nào đi kèm.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Bắt đầu
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Xem trên GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
