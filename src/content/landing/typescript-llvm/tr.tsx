import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "LLVM Üzerinde TypeScript: Monomorphization ve Yerel Kod Üretimi",
  description:
    "Perry'nin TypeScript'i LLVM IR'a nasıl indirgediği — tipli bir HIR, monomorphization, NaN-boxing — ve backend'in AOT performansı için neden Cranelift'ten LLVM'e taşındığı.",
  breadcrumb: "LLVM Üzerinde TypeScript",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="gradient-text">LLVM</span> Üzerinde TypeScript
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Perry, JIT motorları için tasarlanmış bir dili LLVM IR&apos;a nasıl
            indirgiyor — monomorphization, NaN-boxing, satır içi indirgemeler
            — ve neden Cranelift&apos;i geride bıraktı.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Derleyici İç Yapısı
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">TypeScript İçin Neden LLVM?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Bir AOT derleyici, bir JIT&apos;ten farklı bir rejimde yaşar. Bir
            JIT, kullanıcı beklerken derler, bu yüzden kısıtlayıcı olan
            derleme gecikmesidir. Perry gibi bir AOT derleyici ise bir kez
            derler — geliştiricinin kendi makinesinde veya CI&apos;da — ve
            ikili dosya bundan sonra milyonlarca kez çalıştırılır. Bu
            asimetri, tam olarak ağır bir optimize edicinin kendini amorti
            ettiği yerdir.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM, yirmi yıllık middle-end çalışmasını beraberinde getirir:
            loop vectorization, loop-invariant code motion, global value
            numbering, sparse conditional constant propagation, agresif
            satır içi alma, alias analysis. Perry&apos;nin işi, bu makineye
            gerçekten optimize edebileceği IR&apos;ı vermektir — ve burada
            devreye TypeScript&apos;in tip bilgisi girer.
          </p>

          <h2 className="text-2xl font-bold mb-6">İndirgeme hattı</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Kaynak kod SWC ile ayrıştırılır, ardından tipli bir yüksek
            seviyeli IR&apos;a (HIR) indirgenir; asıl ilginç kararlar LLVM
            kodu hiç görmeden önce burada verilir:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorphization.</strong>{" "}
              Generic fonksiyonlar ve sınıflar, her somut örnekleme
              (instantiation) için özelleştirilir — Rust ve C++&apos;ın
              kullandığı stratejinin aynısı.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> ve{" "}
              <code className="text-slate-300">{`Stack<string>`}</code> iki
              bağımsız, tamamen tipli fonksiyona dönüşür — böylece optimize
              edici generic bir dispatch blob&apos;u yerine somut tiplerle
              çalışır ve generic&apos;ler runtime&apos;da hiçbir şeye mal
              olmaz.
            </li>
            <li>
              <strong className="text-slate-300">Static dispatch.</strong>{" "}
              Alıcı (receiver) tipinin derleme zamanında bilindiği
              durumlarda, metot çağrıları hash tablosu aramaları değil,
              LLVM&apos;in satır içine alabileceği doğrudan çağrılara
              derlenir.
            </li>
            <li>
              <strong className="text-slate-300">Doğrudan alan erişimi.</strong>{" "}
              Nesne alanları derleme zamanı indekslerine çözümlenir, böylece
              bir özellik okuma işlemi bir sözlük araması değil, sabit
              ofsetli bir yükleme (load) işlemidir.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing ve satır içi indirgemeler
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Değerlerin dinamik olduğu durumlarda Perry, NaN-boxing kullanır:
            her değer 64-bit&apos;lik bir word&apos;dür. Double&apos;lar
            doğrudan saklanır; nesneler, dizeler, boolean&apos;lar,{" "}
            <code className="text-slate-300">null</code> ve{" "}
            <code className="text-slate-300">undefined</code> ise bir IEEE
            754 quiet NaN&apos;ın kullanılmayan bit kalıplarına kodlanır.
            Sayılar sıfır maliyetlidir (zero-cost) — aritmetik için boxing
            yok, allocation yok.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            İşin can alıcı noktası şu: sayı olmayan değerler üzerindeki
            işlemler unpack-operate-repack bit dizilerine ihtiyaç duyar. Bu
            diziler ayrı derlenmiş bir runtime&apos;a yapılan çağrılar olarak
            var olursa, LLVM onları opak kara kutular olarak görür ve
            aralarında optimizasyon yapamaz. Bu yüzden Perry, sık çalışan
            işlemleri — özellik okumaları, metot dispatch&apos;i, nesne
            allocation&apos;ı — optimize edicinin birleştirip
            sadeleştirebileceği satır içi LLVM IR olarak üretir. Örneğin
            nesne allocation&apos;ı, satır içi thread-local bir bump
            allocation&apos;a derlenir:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — satır içi bump allocation</span>
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

          <h2 className="text-2xl font-bold mb-6">Neden Cranelift Değil?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Perry&apos;nin ilk backend&apos;i Cranelift&apos;ti —
            wasmtime&apos;ın arkasındaki kod üretimi, hızlı ve öngörülebilir
            derleme için tasarlanmış. Doğru bir başlangıç noktasıydı ve
            JIT&apos;ler ile yalıtılmış runtime&apos;lar için hâlâ mükemmel
            bir seçim. İki şey bu geçişi zorunlu kıldı:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Optimize edicinin tavanı.</strong>{" "}
              Cranelift kasıtlı olarak hızlı, tek katmanlı bir derleyicidir:
              &ldquo;çabucak makul kod&rdquo;, bu da bir JIT için doğru takas
              iken, satış noktası tepe yerel performans olan bir AOT
              derleyici için yanlış takastır.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> Apple
              Watch, Cranelift&apos;in desteklemediği bir ABI (64-bit
              komutlar, 32-bit işaretçiler) kullanır. watchOS&apos;un bir
              hedef olarak var olabilmesi için LLVM gerekliydi — ve iki
              backend&apos;i sürdürmek, iki kat hata, test ve performans
              referans noktası (baseline) demekti.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Bu geçiş bedelsiz olmadı: yalnızca LLVM kullanan ilk sürüm, sık
            çalışan işlemler başlangıçta opak runtime yardımcı fonksiyon
            çağrıları üzerinden geçtiği için bazı benchmark&apos;ları 70 kata
            kadar yavaşlattı. Toparlanma — satır içi indirgemeler, yukarıdaki
            bump allocator, daha iyi satır içi alma sınırları —
            backend&apos;i Cranelift&apos;in rakamlarının ötesine taşıdı ve
            iş yerine oturduğunda Perry, kendi test paketindeki her
            benchmark&apos;ta Node.js&apos;i 1,7 kattan 24,6 kata kadar (iki
            eşitlikle) geride bıraktı (Nisan 2026). Tüm post-mortem yazısı
            okumaya değer:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Cranelift&apos;ten LLVM&apos;ye
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Daha derine inmek</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Derleyici iç yapısı sayfası
            </Link>{" "}
            NaN-boxing, monomorphization ve static dispatch konularını daha
            ayrıntılı ele alır. Blogda,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Her Şeyi Optimize Etmek
            </Link>{" "}
            yazısı optimizasyon çalışmasını sürüm sürüm anlatır ve{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Kuşaksal GC, lazy JSON ve savunulabilir benchmark&apos;lar
            </Link>{" "}
            yazısı benchmark metodolojisinin nasıl işlediğini açıklar
            (RUNS=11, medyan + p95). Daha büyük resim için{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              TypeScript yerel derleyicisi
            </Link>{" "}
            genel bakışıyla başlayın.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="feature-card text-center">
            <h2 className="text-2xl font-bold mb-3 gradient-text">
              Çıktıyı kendiniz görün
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              yerel makine kodu, bağlı motor yok.
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
      </section>
    </>
  );
}
