import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript için Electron Alternatifleri: Perry vs Tauri vs Bun",
  description:
    "TypeScript'te bir Electron alternatifi mi arıyorsunuz? Electron, Tauri, Bun tabanlı yaklaşımları ve Perry'yi ikili dosya boyutu, bellek, UI yığını ve dil açısından karşılaştırın.",
  breadcrumb: "TypeScript için Electron Alternatifleri",
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
            Karşılaştırmalara geri dön
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">
              TypeScript Geliştiricileri için Electron Alternatifleri
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12">
            Electron, masaüstü uygulamalarını web geliştiricileri için
            erişilebilir kıldı; boyut ve bellek maliyetleri ise &ldquo;Electron
            alternatifi&rdquo;ni kalıcı bir arama sorgusu haline getirdi.
            Diliniz TypeScript ise 2026&apos;da dört gerçekçi yol var:
            Electron&apos;da kalmak, Tauri&apos;ye geçmek, Bun ile runtime
            gömülü ikili dosyalar inşa etmek ya da Perry ile yerele derlemek.
            Dördü de çok farklı takaslar yapar.
          </p>

          <h2 className="text-2xl font-bold mb-6">Dört yaklaşım</h2>

          <div className="space-y-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Electron — referans noktası
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Her uygulamayla birlikte Chromium ve Node.js&apos;i paketler.
                Artısı, on yıllık üretim olgunluğu ve ekibinizin zaten bildiği
                bir UI yığınıdır (HTML/CSS/JS) — VS Code, Slack ve Discord
                bunun üzerinde çalışır. Eksisi ise temel maliyettir: yaklaşık
                80–150 MB&apos;lik hello-world kurulum dosyaları, birden fazla
                Chromium süreci ve boştayken yüzlerce MB RAM. Sadece
                masaüstü.{" "}
                <Link
                  href="/compare/electron"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Tam Perry vs Electron karşılaştırması
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Tauri — sistem webview&apos;de web UI, Rust backend
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tauri, web frontend&apos;ini korur ama paketlenmiş
                Chromium&apos;u kaldırır: UI, işletim sisteminin webview&apos;inde
                (WKWebView, WebView2, WebKitGTK) render edilir, bu yüzden
                kurulum dosyaları tek haneli MB aralığında kalır. Kararlıdır,
                iyi belgelenmiştir ve Tauri 2, iOS/Android desteğini ekledi.
                Takaslar: backend TypeScript değil, Rust&apos;tur — UI&apos;nın
                ötesindeki uygulama mantığı Rust yazmak ve bir IPC köprüsünü
                geçmek anlamına gelir — ve her işletim sistemi farklı bir
                webview gönderdiği için render platforma göre hafifçe
                değişir.{" "}
                <Link
                  href="/compare/tauri"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Tam Perry vs Tauri karşılaştırması
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Bun — tek dosyalık ikili dosyalar, GUI katmanı yok
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                &ldquo;bun electron&rdquo; arayan insanlar genellikle
                Electron&apos;un kolaylığını ağırlığı olmadan ister.{" "}
                <code className="text-slate-300">bun build --compile</code>,
                Bun runtime&apos;ını paketlenmiş TypeScript&apos;inizle
                gömerek tek bir çalıştırılabilir dosya üretir — CLI&apos;ler ve
                sunucular için mükemmeldir, tam olarak runtime&apos;ın kendisi
                olduğu için tam npm uyumluluğuna sahiptir. Ancak ikili dosya
                kabaca 60 MB (macOS arm64) ile 100+ MB (Linux/Windows)
                arasındadır, kod hâlâ JIT ile çalıştırılır ve Bun&apos;ın bir
                UI framework&apos;ü yoktur — bir masaüstü uygulaması yine de
                üzerine Electron, Tauri veya bir webview kütüphanesi
                gerektirir.{" "}
                <Link
                  href="/compare/bun"
                  className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
                >
                  Tam Perry vs Bun karşılaştırması
                </Link>
                .
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Perry — yerel widget&apos;lara derlenen TypeScript
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Perry, TypeScript&apos;i ahead-of-time olarak makine koduna
                derler ve UI&apos;ı gerçek platform widget&apos;ları aracılığıyla
                render eder — AppKit, UIKit, GTK4, Win32, JNI ile Android —
                hiçbir webview ve IPC köprüsü olmadan. UI ve mantık için tek
                bir dil, ~330 KB hello world, 2–5 MB tipik ikili dosyalar, ~1
                ms başlatma süresi ve mobil, watch ve TV dahil on hedef.
                Dürüst uyarı: Perry 1.0 öncesidir, UI API&apos;si kendine
                özgüdür (bildirimsel, SwiftUI tarzı — HTML/CSS değil) ve
                ekosistem Electron&apos;unkinin yanında gençtir.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Yan yana</h2>
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
                  <td className="px-4 py-3 text-slate-300 font-medium">Dil</td>
                  <td className="px-4 py-3 text-slate-400">Her yerde TypeScript</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS + HTML/CSS</td>
                  <td className="px-4 py-3 text-slate-400">JS/TS frontend, Rust backend</td>
                  <td className="px-4 py-3 text-slate-400">TypeScript</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">UI yaklaşımı</td>
                  <td className="px-4 py-3 text-slate-400">Yerel platform widget&apos;ları</td>
                  <td className="px-4 py-3 text-slate-400">Paketlenmiş Chromium</td>
                  <td className="px-4 py-3 text-slate-400">Sistem webview&apos;i</td>
                  <td className="px-4 py-3 text-slate-400">Yok (CLI/sunucu)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Hello-world boyutu</td>
                  <td className="px-4 py-3 text-slate-400">~330 KB</td>
                  <td className="px-4 py-3 text-slate-400">~80–150 MB</td>
                  <td className="px-4 py-3 text-slate-400">~3–10 MB</td>
                  <td className="px-4 py-3 text-slate-400">~60–116 MB (platforma göre)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Yürütme</td>
                  <td className="px-4 py-3 text-slate-400">AOT makine kodu</td>
                  <td className="px-4 py-3 text-slate-400">JIT (V8)</td>
                  <td className="px-4 py-3 text-slate-400">JIT (webview JS motoru) + yerel Rust</td>
                  <td className="px-4 py-3 text-slate-400">JIT (JavaScriptCore)</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Boştayken bellek</td>
                  <td className="px-4 py-3 text-slate-400">Onlarca MB (tek bir yerel süreç)</td>
                  <td className="px-4 py-3 text-slate-400">Yüzlerce MB (çok süreçli Chromium)</td>
                  <td className="px-4 py-3 text-slate-400">Electron&apos;dan daha düşük (OS webview&apos;i)</td>
                  <td className="px-4 py-3 text-slate-400">Runtime için tipik</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Mobil / watch / TV</td>
                  <td className="px-4 py-3 text-slate-400">iOS, iPadOS, Android, watchOS, tvOS</td>
                  <td className="px-4 py-3 text-slate-400">Hayır</td>
                  <td className="px-4 py-3 text-slate-400">iOS, Android (Tauri 2)</td>
                  <td className="px-4 py-3 text-slate-400">Hayır</td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="px-4 py-3 text-slate-300 font-medium">Olgunluk</td>
                  <td className="px-4 py-3 text-slate-400">1.0 öncesi</td>
                  <td className="px-4 py-3 text-slate-400">Üretimde 10+ yıl</td>
                  <td className="px-4 py-3 text-slate-400">Kararlı (1.x/2.x)</td>
                  <td className="px-4 py-3 text-slate-400">Kararlı</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">
            Peki React Native veya Flutter?
          </h2>
          <p className="text-slate-400 leading-relaxed mb-16">
            Her Electron tartışmasında gündeme gelirler, ama farklı bir soruyu
            yanıtlarlar. React Native mobil önceliklidir: JavaScript&apos;iniz
            Hermes motorunda çalışır ve bir köprü üzerinden yerel görünümleri
            sürer; masaüstü desteği ise yalnızca ayrı topluluk/Microsoft
            fork&apos;ları aracılığıyla var olur — birebir bir Electron
            ikamesi değildir (
            <Link
              href="/compare/react-native"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Perry vs React Native
            </Link>
            ). Flutter masaüstünü ve mobili kapsar ama TypeScript&apos;i
            bırakıp Dart&apos;a geçmek anlamına gelir ve platformun
            widget&apos;larını kullanmak yerine kendi widget&apos;larını
            çizer. TypeScript&apos;te kalmak kısıtınız ise, gerçekçi masaüstü
            kısa listesi yukarıdaki dört seçenek olarak kalır.
          </p>

          <h2 className="text-2xl font-bold mb-6">Hangisini seçmelisiniz?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Web yığınında kalın
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                UI&apos;nız zaten React/Vue/Svelte ile inşa edilmişse ve bugün
                sahada kanıtlanmış bir masaüstü dağıtımına ihtiyacınız
                varsa, Electron en düşük riskli seçim olmaya devam eder —
                bedelini boyut ve bellekle ödersiniz. Bu maliyet sizi rahatsız
                ediyorsa ve backend&apos;i Rust&apos;ta yazmaktan
                çekinmiyorsanız, Tauri size web yığını deneyiminin çoğunu çok
                daha küçük bir ayak iziyle sunar.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="text-lg font-semibold text-white mb-3">
                Webview&apos;i geride bırakın
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Gerçekten istediğiniz şey TypeScript girdi, yerel uygulama
                çıktıysa — tek dil, gerçek platform widget&apos;ları, küçük
                ikili dosyalar ve aynı kod tabanından mobil/watch/TV — Perry&apos;nin
                doldurmak için var olduğu boşluk tam olarak budur; girişin
                bedeli ise 1.0 öncesi olgunluktur. Ve tek ihtiyacınız sıfır
                uyumluluk riski olan tek dosyalık bir CLI veya sunucuysa,
                Bun&apos;ın{" "}
                <code className="text-slate-300">--compile</code> komutu
                pragmatik seçimdir.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Kendiniz görün
            </h2>
            <p className="text-slate-400 mb-6">
              Perry&apos;yi kurun ve TypeScript&apos;ten yerel bir uygulama
              gönderin.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/getting-started" className="btn-primary">
                Başlayın
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                GitHub&apos;da Görüntüle
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
