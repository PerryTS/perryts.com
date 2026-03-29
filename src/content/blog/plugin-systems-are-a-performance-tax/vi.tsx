export default function Content() {
  return (
    <>
      <p>
        Bạn cài VS Code. Nó nhanh. Bạn thêm 15 extension. Bây giờ nó mất 4 giây để khởi động và Extension Host ngốn 800 MB RAM. Chuyện gì đã xảy ra?
      </p>
      <p>
        Pattern này lặp lại ở khắp nơi: WordPress, Eclipse, Chrome, Figma, Slack. Ứng dụng ra mắt nhanh. Plugin làm nó chậm. Không ai ngạc nhiên nữa — chúng ta đã chấp nhận nó như chi phí của khả năng mở rộng.
      </p>
      <p>
        Nhưng hệ thống plugin không chỉ là vấn đề hiệu năng. Chúng là vấn đề triết lý thiết kế. Ngành công nghiệp đã nhầm lẫn &quot;khả năng mở rộng&quot; với &quot;tính động runtime&quot; khi thường câu trả lời tốt hơn là tổ hợp tại thời điểm biên dịch. Plugin hiệu quả duy nhất là những plugin ngừng là plugin tại thời điểm biên dịch.
      </p>

      <h2>Phổ hiệu năng của khả năng mở rộng</h2>
      <p>
        Không phải mọi khả năng mở rộng đều tốn kém như nhau. Có một phổ từ chi phí bằng không đến chi phí tối đa, và phần lớn ngành công nghiệp đã chọn phía đắt đỏ:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Liên kết tĩnh / module thời gian biên dịch</strong> — chi phí bằng không. Thư viện C, crate Rust, package Go. Ranh giới module biến mất hoàn toàn trong binary cuối cùng.</li>
        <li><strong>Thư viện chia sẻ được nạp khi khởi động</strong> — gần bằng không. Module nginx, module kernel Linux. Chi phí một lần khi nạp, sau đó là gọi hàm trực tiếp.</li>
        <li><strong>Dispatch động qua interface / vtable</strong> — overhead nhỏ. Plugin game engine C++. Một lần gián tiếp con trỏ mỗi lần gọi.</li>
        <li><strong>Plugin interpreted cùng tiến trình</strong> — overhead vừa phải. Plugin PHP WordPress, bundle Eclipse OSGi.</li>
        <li><strong>Plugin tiến trình riêng qua IPC</strong> — overhead đáng kể. Extension VS Code, extension Chrome.</li>
        <li><strong>Plugin sandbox qua IPC tuần tự hóa</strong> — nặng. Plugin Figma, content script extension trình duyệt.</li>
      </ol>

      <h2>Thiệt hại thực tế</h2>
      <h3>WordPress</h3>
      <p>Mỗi plugin hook vào vòng đời request. 30 plugin nghĩa là 30 lớp gọi hàm mỗi lần tải trang. Kết quả: các plugin caching tồn tại chỉ để giảm thiểu thiệt hại từ các plugin khác. Plugin hiệu năng để sửa vấn đề hiệu năng mà plugin tạo ra. Sự mỉa mai tự viết nên.</p>
      <h3>VS Code</h3>
      <p>Các extension chia sẻ một event loop Node.js trong một tiến trình riêng. Một extension hoạt động sai sẽ chặn tất cả các extension khác. Extension Host thường xuất hiện là tiến trình tiêu thụ CPU hàng đầu trên máy của developer. Microsoft đã xây dựng công cụ profiling, lệnh bisect, và hệ thống activation event — cả một cơ sở hạ tầng để quản lý vấn đề mà extension tạo ra.</p>
      <h3>Eclipse</h3>
      <p>Câu chuyện cảnh báo. Phân giải bundle OSGi, overhead class loading, đồ thị dependency khổng lồ. Từng là IDE phổ biến nhất, giờ phần lớn bị developer chính thống bỏ rơi. Kiến trúc plugin được cho là sức mạnh lớn nhất đã trở thành điểm yếu quyết định.</p>
      <h3>Electron</h3>
      <p>Vấn đề plugin ở cấp nền tảng. Mỗi ứng dụng Electron đi kèm runtime Chromium + Node.js đầy đủ. VS Code là Electron. Slack là Electron. Discord là Electron. Mỗi cái độc lập tiêu thụ 300–500 MB RAM để render thực chất chỉ là một cửa sổ chat hoặc trình soạn thảo văn bản.</p>

      <h2>Tại sao ngành công nghiệp vẫn chọn Plugin</h2>
      <p>Nếu plugin tốn kém như vậy, tại sao mọi người vẫn xây dựng chúng? Lý do chủ yếu là tổ chức, không phải kỹ thuật.</p>

      <h2>Giải pháp thay thế: Tổ hợp tại thời điểm biên dịch</h2>
      <p>Nếu khả năng mở rộng xảy ra tại thời điểm build thay vì runtime thì sao?</p>
      <p>Đây không phải là giả thuyết. Có những tiền lệ đã được chứng minh trong các ngôn ngữ hệ thống:</p>

      <h2>Điều này có ý nghĩa gì cho TypeScript</h2>
      <p>TypeScript là ngôn ngữ phổ biến nhất cho xây dựng công cụ mở rộng — và tệ nhất về hiệu năng runtime. Toàn bộ hệ sinh thái TypeScript chạy trên Node.js, chạy trên V8, JIT-biên dịch JavaScript.</p>
      <p>Đây là nơi Perry xuất hiện. Perry biên dịch TypeScript trực tiếp thành binary native. Không V8, không khởi động JIT, không tạm dừng garbage collection, không ranh giới IPC.</p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">terminal</span>
        </div>
        <div className="space-y-1">
          <p className="text-slate-500"># Your app, your dependencies, your &quot;plugins&quot; — one binary</p>
          <p><span className="text-slate-500">$</span> <span className="text-cyan-400">perry</span> compile server.ts -o server</p>
          <p className="text-slate-500">Compiling server.ts + 43 modules...</p>
          <p className="text-green-400">{"✓"} Built executable: server (1.8 MB, 0.7s)</p>
          <p className="mt-3"><span className="text-slate-500">$</span> ./server</p>
          <p className="text-slate-300">Listening on port 3000</p>
        </div>
      </div>

      <h2>Khả năng mở rộng bạn thực sự cần</h2>
      <p>Phản đối là hiển nhiên: &quot;Nhưng tôi cần khả năng mở rộng runtime. Người dùng cần cài plugin mà không cần biên dịch lại.&quot;</p>
      <p>Thực sự không? Đối với hầu hết ứng dụng, tập hợp extension được biết tại thời điểm build.</p>

      <h2>Con đường phía trước</h2>
      <p>Sự nghiện ngập của ngành công nghiệp đối với kiến trúc plugin là triệu chứng của việc chấp nhận overhead runtime là không thể tránh khỏi. Nhưng không phải vậy. Trình biên dịch có thể làm công việc đó. Tổ hợp tại thời điểm build mang lại khả năng mở rộng mà không phải trả thuế.</p>
      <p>
        Hệ thống plugin nhanh nhất là hệ thống không tồn tại tại runtime.
      </p>
    </>
  );
}
