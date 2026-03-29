export default function Content() {
  return (
    <>
      <p>
        Perry sekarang mengkompilasi tiga framework TypeScript utama — Hono, tRPC, dan Strapi — menjadi
        executable ARM64 native. Mereka dikompilasi dalam waktu kurang dari satu detik, menghasilkan binary
        di bawah 2 MB, dan berjalan tanpa crash.
      </p>
      <p>
        Artikel ini membahas apa yang berhasil, apa yang belum, dan apa yang kami pelajari saat mendorong
        compiler menghadapi kode dunia nyata.
      </p>

      <h2>Proyek-proyek</h2>
      <p>
        Kami memilih ketiganya karena mewakili bentuk TypeScript yang berbeda:
      </p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Hono</strong> — Framework web ringan (29 modul). Penggunaan berat generics,
          inheritance class, dynamic method assignment, dan Web API <code className="text-perry-400">Request</code>/<code className="text-perry-400">Response</code>.
          Struktur export menggunakan named re-export melalui barrel file.
        </li>
        <li>
          <strong>tRPC</strong> — Framework RPC type-safe (52 modul). Chain re-export dalam
          4+ level, builder pattern dengan generic type narrowing, instansiasi class di scope modul,
          dan streaming via Web Streams.
        </li>
        <li>
          <strong>Strapi</strong> — Core headless CMS (4 modul dikompilasi native, sisanya diselesaikan
          sebagai external). Monorepo dengan resolusi workspace package, namespace re-export
          (<code className="text-perry-400">export * as X</code>), service container pattern dengan{" "}
          <code className="text-perry-400">Map</code>, dan factory function.
        </li>
      </ul>

      <h2>Hasil Kompilasi</h2>
      <p>
        Ketiganya dikompilasi ke binary native dengan nol error kompilasi:
      </p>
      <div className="overflow-x-auto my-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Proyek</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Modul Dikompilasi</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Ukuran Binary</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-300">Waktu Kompilasi</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Hono</td>
              <td className="py-3 px-4 text-slate-400">29</td>
              <td className="py-3 px-4 text-slate-400">1.6 MB</td>
              <td className="py-3 px-4 text-slate-400">0.59s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">tRPC</td>
              <td className="py-3 px-4 text-slate-400">52</td>
              <td className="py-3 px-4 text-slate-400">1.8 MB</td>
              <td className="py-3 px-4 text-slate-400">0.97s</td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-4 text-slate-300">Strapi</td>
              <td className="py-3 px-4 text-slate-400">4</td>
              <td className="py-3 px-4 text-slate-400">1.9 MB</td>
              <td className="py-3 px-4 text-slate-400">0.80s</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Setiap modul sumber melewati pipeline lengkap: SWC parse, HIR lowering, Cranelift codegen,
        object file emission, dan native linking. Waktu kompilasi mencakup semuanya — dari parsing hingga
        link akhir.
      </p>
      <p>
        Sebagai konteks, <code className="text-perry-400">tsc --noEmit</code> pada tRPC saja memakan
        beberapa detik. Perry mengkompilasi 52 modul ke binary native yang ter-link dalam kurang dari satu detik.
      </p>

      <h2>Apa yang Berhasil di Runtime</h2>
      <h3>Instansiasi Class Lintas Modul</h3>
      <p>
        Ini adalah milestone besar. Perry sekarang melacak <code className="text-perry-400">Export::Named</code>
        kembali melalui import modul untuk menemukan definisi class asli dan menyebarkannya. Hasilnya:
        constructor Hono berjalan, menginisialisasi <code className="text-perry-400">SmartRouter</code>,
        dan mengembalikan objek nyata.
      </p>

      <h3>Resolusi Re-Export Multi-Level</h3>
      <p>
        <code className="text-perry-400">initTRPC</code> milik tRPC berada 4 level dalam: rantai
        <code className="text-perry-400">ExportAll</code> → <code className="text-perry-400">Named</code> → <code className="text-perry-400">ExportAll</code>.
        Perry menyelesaikan seluruh rantai.
      </p>

      <h3>Resolusi Package dalam Monorepo</h3>
      <p>
        Strapi menggunakan workspace package. Perry menyelesaikan bare specifier melalui field exports di{" "}
        <code className="text-perry-400">package.json</code>.
      </p>

      <h2>Apa yang Belum Berhasil</h2>

      <h3>Dynamic Property Assignment pada <code className="text-perry-400">this</code></h3>
      <p>
        Constructor Hono menyiapkan handler method HTTP secara dinamis. Perry belum mendukung
        <code className="text-perry-400">this[variable] = value</code>, jadi method ini hilang.
        Ini adalah gap terbesar untuk Hono.
      </p>

      <h3>Panggilan Constructor Level Modul</h3>
      <p>
        <code className="text-perry-400">export const initTRPC = new TRPCBuilder()</code> tidak mengeksekusi
        constructor saat runtime, menghasilkan referensi class alih-alih instance.
      </p>

      <h3>Properti yang Diwarisi</h3>
      <p>
        <code className="text-perry-400">err.code</code> berfungsi tapi <code className="text-perry-400">err.message</code>
        (diwarisi dari <code className="text-perry-400">Error</code>) tidak bisa diakses. Prototype chain
        belum sepenuhnya diimplementasikan.
      </p>

      <h2>Apa Artinya Ini</h2>
      <p>
        Kabar baiknya: pipeline kompilasi Perry menangani kode framework nyata. Proyek multi-file dengan
        chain re-export kompleks, type signature berat generics, hierarki class, dan resolusi package
        monorepo semuanya berhasil dikompilasi menjadi binary yang ter-link.
      </p>
      <p>
        Gap-nya ada di runtime, bukan kompilasi. Pekerjaan yang tersisa:
      </p>
      <ol className="list-decimal list-inside">
        <li><strong>Dynamic property assignment</strong> — diperlukan untuk framework yang menyiapkan method secara programatik</li>
        <li><strong>Ekspresi init level modul</strong> — <code className="text-perry-400">export const x = new Foo()</code> perlu benar-benar mengeksekusi constructor</li>
        <li><strong>Prototype chain</strong> — properti dan method yang diwarisi</li>
        <li><strong>Built-in Web API</strong> — <code className="text-perry-400">Response</code>, <code className="text-perry-400">Request</code>, <code className="text-perry-400">Headers</code> untuk framework HTTP</li>
      </ol>
      <p>
        Ini adalah masalah konkret dengan scope yang jelas. Tidak ada yang memerlukan perubahan arsitektur
        — mereka adalah ekstensi dari pola yang sudah berfungsi untuk kasus yang lebih sederhana.
      </p>
      <p>
        Kami akan terus mendorong ini. Tujuannya adalah{" "}
        <code className="text-perry-400">new Hono().get(&apos;/&apos;, (c) =&gt; c.text(&apos;hello&apos;))</code>{" "}
        menghasilkan HTTP server yang berfungsi dalam binary native.
      </p>
    </>
  );
}
