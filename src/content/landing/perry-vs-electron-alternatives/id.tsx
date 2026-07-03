import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "Alternatif Electron untuk TypeScript: Perry vs Tauri vs Bun",
  description:
    "Mencari alternatif Electron dalam TypeScript? Bandingkan Electron, Tauri, pendekatan berbasis Bun, dan Perry dari segi ukuran binary, memori, stack UI, dan bahasa.",
  breadcrumb: "Alternatif Electron untuk TypeScript",
};

export default function Content() {
  return (
    <>
            <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Kembali ke perbandingan
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              Alternatif Electron untuk Developer TypeScript
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron membuat aplikasi desktop mudah diakses oleh developer
            web, dan biaya ukuran serta memorinya menjadikan &ldquo;alternatif
            Electron&rdquo; sebagai kueri pencarian abadi. Jika TypeScript
            adalah bahasa Anda, ada empat jalur realistis di 2026: tetap
            dengan Electron, pindah ke Tauri, membangun binary dengan
            runtime tertanam menggunakan Bun, atau mengompilasi ke native
            dengan Perry. Masing-masing membuat trade-off yang sangat
            berbeda.
          </p>

          <h2 className="text-2xl font-bold mb-6">Empat pendekatan</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — baseline
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Membundel Chromium dan Node.js dengan setiap aplikasi. Sisi
                positifnya adalah kematangan produksi selama satu dekade
                dan stack UI (HTML/CSS/JS) yang sudah dikenal tim Anda —
                VS Code, Slack, dan Discord dikirim dengan ini. Sisi
                negatifnya adalah biaya dasarnya: installer hello-world
                sekitar 80–150 MB, banyak proses Chromium, dan ratusan MB
                RAM saat idle. Hanya desktop.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perbandingan lengkap Perry vs Electron
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — UI web di webview sistem, backend Rust
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri mempertahankan frontend web tetapi melepas Chromium
                yang dibundel: UI dirender di webview OS (WKWebView,
                WebView2, WebKitGTK), sehingga installer berada dalam
                kisaran MB satu digit. Ini stabil, terdokumentasi dengan
                baik, dan Tauri 2 menambahkan iOS/Android. Trade-off-nya:
                backend-nya adalah Rust, bukan TypeScript — logika
                aplikasi di luar UI berarti menulis Rust dan melintasi
                bridge IPC — dan rendering sedikit berbeda per platform
                karena setiap OS mengirim webview yang berbeda.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perbandingan lengkap Perry vs Tauri
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — binary file tunggal, tanpa lapisan GUI
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Orang yang mencari &ldquo;bun electron&rdquo; biasanya
                menginginkan kenyamanan Electron tanpa bobotnya.{" "}
                <code className="text-slate-300">bun build --compile</code>{" "}
                menghasilkan satu executable dengan menanamkan runtime Bun
                bersama TypeScript yang dibundel — sangat baik untuk CLI
                dan server, dengan kompatibilitas npm penuh karena inilah
                runtime itu sendiri secara harfiah. Tetapi binary-nya
                berukuran sekitar 60 MB (macOS arm64) hingga 100+ MB
                (Linux/Windows), kodenya tetap dieksekusi secara JIT, dan
                Bun tidak memiliki framework UI — aplikasi desktop tetap
                membutuhkan Electron, Tauri, atau library webview di
                atasnya.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Perbandingan lengkap Perry vs Bun
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — TypeScript dikompilasi menjadi widget native
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry mengompilasi TypeScript secara ahead-of-time menjadi
                kode mesin dan merender UI melalui widget platform asli —
                AppKit, UIKit, GTK4, Win32, Android via JNI — tanpa
                webview dan tanpa bridge IPC. Satu bahasa untuk UI dan
                logika, hello world ~330 KB, binary tipikal 2–5 MB,
                startup ~1 ms, dan sepuluh target termasuk mobile, watch,
                dan TV. Catatan jujurnya: Perry masih pra-1.0, API UI-nya
                adalah miliknya sendiri (deklaratif, gaya SwiftUI — bukan
                HTML/CSS), dan ekosistemnya masih muda dibandingkan
                Electron.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Berdampingan</h2>
          <div className="overflow-x-auto mb-16 border border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300"></th>
                  <th className="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Electron</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Tauri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Bun (--compile)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Bahasa</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript di mana-mana</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">Frontend JS/TS, backend Rust</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Pendekatan UI</td>
                  <td className="px-4 py-3 text-slate-400">Widget platform native</td>
                  <td className="px-4 py-3 text-slate-400">Chromium yang dibundel</td>
                  <td className="px-4 py-3 text-slate-400">Webview sistem</td>
                  <td className="px-4 py-3 text-slate-400">Tidak ada (CLI/server)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Ukuran hello-world</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB tergantung platform</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Eksekusi</td>
                  <td className="px-4 py-3 text-slate-400">Kode mesin AOT</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JS engine webview) + Rust native</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Memori saat idle</td>
                  <td className="px-4 py-3 text-slate-400">Puluhan MB (satu proses native)</td>
                  <td className="px-4 py-3 text-slate-400">Ratusan MB (Chromium multi-proses)</td>
                  <td className="px-4 py-3 text-slate-400">Lebih rendah dari Electron (webview OS)</td>
                  <td className="px-4 py-3 text-slate-400">Tipikal runtime</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mobile / watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">Tidak</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">Tidak</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Kematangan</td>
                  <td className="px-4 py-3 text-slate-400">Pra-1.0</td>
                  <td className="px-4 py-3 text-slate-400">Lebih dari satu dekade di produksi</td>
                  <td className="px-4 py-3 text-slate-400">Stabil (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Stabil</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            Bagaimana dengan React Native atau Flutter?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Keduanya selalu muncul di setiap thread diskusi Electron,
            tetapi menjawab pertanyaan yang berbeda. React Native adalah
            mobile-first: JavaScript Anda berjalan di engine Hermes dan
            menggerakkan native view melalui bridge, dan dukungan desktop
            hanya ada melalui fork komunitas/Microsoft yang terpisah —
            bukan pengganti Electron yang bisa langsung dipakai (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter mencakup desktop dan mobile tetapi berarti
            meninggalkan TypeScript demi Dart, dan ia menggambar
            widget-nya sendiri alih-alih menggunakan widget platform.
            Jika tetap menggunakan TypeScript adalah batasannya, daftar
            pendek desktop yang realistis tetaplah empat opsi di atas.
          </p>

          <h2 className="text-2xl font-bold mb-6">Mana yang harus Anda pilih?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tetap dengan stack web
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Jika UI Anda sudah dibangun dengan React/Vue/Svelte dan
                Anda butuh distribusi desktop yang sudah teruji
                pertempuran hari ini, Electron tetap menjadi pilihan
                dengan risiko paling rendah — Anda membayarnya dengan
                ukuran dan memori. Jika biaya itu mengganggu Anda dan Anda
                nyaman menulis backend dalam Rust, Tauri memberi Anda
                sebagian besar pengalaman stack web dengan footprint yang
                jauh lebih kecil.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tinggalkan webview
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Jika yang sebenarnya Anda inginkan adalah TypeScript
                masuk, aplikasi native keluar — satu bahasa, widget
                platform asli, binary kecil, dan mobile/watch/TV dari
                kode sumber yang sama — itulah persis celah yang diisi
                oleh Perry, dengan kematangan pra-1.0 sebagai harga yang
                harus dibayar. Dan jika Anda hanya butuh CLI atau server
                sebagai satu file dengan risiko kompatibilitas nol,{" "}
                <code className="text-slate-300">--compile</code> milik
                Bun adalah pilihan yang pragmatis.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Lihat sendiri
            </h2>
            <p className="text-slate-400 mb-6">
              Instal Perry dan kirim aplikasi native dari TypeScript.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Mulai
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Lihat di GitHub
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
