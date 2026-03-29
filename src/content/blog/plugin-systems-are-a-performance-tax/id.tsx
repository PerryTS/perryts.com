export default function Content() {
  return (
    <>
      <p>
        Anda menginstal VS Code. Cepat. Anda menambahkan 15 ekstensi. Sekarang butuh 4 detik untuk start dan Extension Host menghabiskan 800 MB RAM. Apa yang terjadi?
      </p>
      <p>
        Pola ini berulang di mana-mana: WordPress, Eclipse, Chrome, Figma, Slack. Aplikasi diluncurkan cepat. Plugin membuatnya lambat. Tidak ada yang terkejut lagi — kita sudah menerimanya sebagai biaya dari ekstensibilitas.
      </p>
      <p>
        Tapi sistem plugin bukan hanya masalah performa. Mereka adalah masalah filosofi desain. Industri telah mengacaukan &quot;ekstensibilitas&quot; dengan &quot;dinamisme runtime&quot; padahal seringkali jawaban yang lebih baik adalah komposisi waktu kompilasi. Plugin yang performan hanyalah yang berhenti menjadi plugin saat kompilasi.
      </p>

      <h2>Spektrum Performa Ekstensibilitas</h2>
      <p>
        Tidak semua ekstensibilitas memiliki biaya yang sama. Ada spektrum dari zero-cost hingga maximum-cost, dan sebagian besar industri telah memilih ujung yang mahal:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Static linking / modul waktu kompilasi</strong> — zero overhead. Library C, crate Rust, package Go. Batas modul hilang sepenuhnya di binary akhir.</li>
        <li><strong>Shared library yang dimuat saat startup</strong> — hampir nol. Modul nginx, modul kernel Linux. Biaya satu kali saat load, lalu panggilan fungsi langsung.</li>
        <li><strong>Dynamic dispatch via interface / vtable</strong> — overhead kecil. Plugin game engine C++. Satu pointer indirection per panggilan.</li>
        <li><strong>Plugin interpreted dalam proses yang sama</strong> — overhead sedang. Plugin PHP WordPress, bundle Eclipse OSGi.</li>
        <li><strong>Plugin proses terpisah via IPC</strong> — overhead signifikan. Ekstensi VS Code, ekstensi Chrome.</li>
        <li><strong>Plugin sandbox via IPC serial</strong> — berat. Plugin Figma, content script ekstensi browser.</li>
      </ol>

      <h2>Kerusakan Dunia Nyata</h2>
      <h3>WordPress</h3>
      <p>Setiap plugin hook ke dalam lifecycle request. 30 plugin berarti 30 lapisan pemanggilan fungsi per page load. Hasilnya: plugin caching ada semata-mata untuk mengurangi kerusakan dari plugin lain. Plugin performa untuk memperbaiki masalah performa yang diciptakan plugin. Ironi meta ini menulis dirinya sendiri.</p>
      <h3>VS Code</h3>
      <p>Ekstensi berbagi satu event loop Node.js dalam proses terpisah. Satu ekstensi bermasalah memblokir semua yang lain. Extension Host secara rutin muncul sebagai consumer CPU teratas di mesin developer. Microsoft telah membangun tool profiling, perintah bisect, dan sistem activation event — seluruh infrastruktur untuk mengelola masalah yang diciptakan ekstensi.</p>
      <h3>Eclipse</h3>
      <p>Kisah peringatan. Resolusi bundle OSGi, overhead class loading, graf dependensi masif. Dulunya IDE paling populer, sekarang sebagian besar ditinggalkan developer mainstream. Arsitektur plugin yang seharusnya menjadi kekuatan terbesarnya malah menjadi kelemahan terbesarnya.</p>
      <h3>Electron</h3>
      <p>Masalah plugin di level platform. Setiap aplikasi Electron membawa runtime Chromium + Node.js lengkap. VS Code adalah Electron. Slack adalah Electron. Discord adalah Electron. Masing-masing secara independen mengonsumsi 300-500 MB RAM untuk merender apa yang pada dasarnya adalah jendela chat atau editor teks.</p>

      <h2>Mengapa Industri Tetap Memilih Plugin</h2>
      <p>Jika plugin begitu mahal, mengapa semua orang terus membangunnya? Alasannya sebagian besar organisasional, bukan teknis.</p>

      <h2>Alternatifnya: Komposisi Waktu Kompilasi</h2>
      <p>Bagaimana jika ekstensibilitas terjadi pada waktu build alih-alih runtime?</p>
      <p>Ini bukan hipotetis. Ada preseden yang telah terbukti di bahasa sistem:</p>

      <h2>Apa Artinya bagi TypeScript</h2>
      <p>TypeScript adalah bahasa paling populer untuk membangun tool yang extensible — dan terburuk dalam performa runtime. Seluruh ekosistem TypeScript berjalan di Node.js, yang berjalan di V8, yang JIT-compile JavaScript.</p>
      <p>Di sinilah Perry berperan. Perry mengkompilasi TypeScript langsung ke binary native. Tanpa V8, tanpa pemanasan JIT, tanpa jeda garbage collection, tanpa batas IPC.</p>

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

      <h2>Ekstensibilitas yang Benar-Benar Anda Butuhkan</h2>
      <p>Keberatan itu jelas: &quot;Tapi saya butuh ekstensibilitas runtime. Pengguna perlu menginstal plugin tanpa kompilasi ulang.&quot;</p>
      <p>Benarkah? Untuk sebagian besar aplikasi, set ekstensi diketahui pada waktu build.</p>

      <h2>Jalan ke Depan</h2>
      <p>Kecanduan industri terhadap arsitektur plugin adalah gejala dari menerima runtime overhead sebagai hal yang tak terhindarkan. Itu tidak benar. Compiler bisa melakukan pekerjaannya. Komposisi waktu build memberikan ekstensibilitas tanpa pajak.</p>
      <p>
        Sistem plugin tercepat adalah yang tidak ada saat runtime.
      </p>
    </>
  );
}
