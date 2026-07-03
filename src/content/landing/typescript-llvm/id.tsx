import { Link } from "@/i18n/navigation";
import type { LandingMeta } from "../registry";

export const meta: LandingMeta = {
  title:
    "TypeScript di atas LLVM: Monomorphization dan Codegen Native",
  description:
    "Bagaimana Perry menurunkan TypeScript ke LLVM IR — HIR bertipe, monomorphization, NaN-boxing — dan mengapa backend berpindah dari Cranelift ke LLVM demi performa AOT.",
  breadcrumb: "TypeScript di atas LLVM",
};

export default function Content() {
  return (
    <>
            {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            TypeScript di atas <span className="gradient-text">LLVM</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Bagaimana Perry menurunkan bahasa yang dirancang untuk engine
            JIT menjadi LLVM IR — monomorphization, NaN-boxing, inline
            lowering — dan mengapa ia meninggalkan Cranelift.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/internals" className="btn-primary">
              Struktur Internal Kompiler
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
      </section>

      {/* Article */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Mengapa LLVM untuk TypeScript?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Kompiler ahead-of-time hidup dalam rezim yang berbeda dari JIT.
            JIT mengompilasi sambil pengguna menunggu, sehingga latensi
            kompilasi menjadi kendalanya. Kompiler AOT seperti Perry
            mengompilasi sekali — di mesin developer atau di CI — dan
            binary-nya dieksekusi jutaan kali setelahnya. Asimetri itulah
            yang membuat optimizer berat justru terbayar dengan sendirinya.
          </p>
          <p className="text-slate-400 leading-relaxed mb-12">
            LLVM membawa dua dekade pekerjaan middle-end: loop
            vectorization, loop-invariant code motion, global value
            numbering, sparse conditional constant propagation, aggressive
            inlining, alias analysis. Tugas Perry adalah menyerahkan IR ke
            mesin itu agar benar-benar bisa dioptimasi — dan di sinilah
            informasi tipe TypeScript berperan.
          </p>

          <h2 className="text-2xl font-bold mb-6">Pipeline lowering</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Source di-parse dengan SWC, lalu diturunkan menjadi high-level
            IR (HIR) bertipe, tempat keputusan-keputusan penting terjadi
            sebelum LLVM sempat melihat kodenya:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-12 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Monomorphization.</strong>{" "}
              Fungsi dan kelas generic dispesialisasi per instansiasi
              konkret, strategi yang sama seperti yang digunakan Rust dan
              C++.{" "}
              <code className="text-slate-300">{`Stack<number>`}</code> dan{" "}
              <code className="text-slate-300">{`Stack<string>`}</code>{" "}
              menjadi dua fungsi independen yang sepenuhnya bertipe —
              sehingga optimizer bekerja dengan tipe konkret, bukan blob
              dispatch generic, dan generic tidak memakan biaya sama
              sekali saat runtime.
            </li>
            <li>
              <strong className="text-slate-300">Static dispatch.</strong>{" "}
              Ketika tipe receiver diketahui pada waktu kompilasi,
              pemanggilan metode dikompilasi menjadi pemanggilan langsung
              yang bisa di-inline oleh LLVM, bukan pencarian hash-table.
            </li>
            <li>
              <strong className="text-slate-300">Direct field access.</strong>{" "}
              Field objek diselesaikan menjadi indeks waktu kompilasi,
              sehingga pembacaan properti adalah pemuatan dengan offset
              tetap — bukan pencarian dictionary.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mb-6">
            NaN-boxing dan inline lowering
          </h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Ketika nilai bersifat dinamis, Perry menggunakan NaN-boxing:
            setiap nilai adalah word 64-bit. Double disimpan langsung;
            objek, string, boolean, <code className="text-slate-300">null</code>, dan{" "}
            <code className="text-slate-300">undefined</code> dikodekan ke
            dalam pola bit yang tidak terpakai dari IEEE 754 quiet NaN.
            Angka bersifat zero-cost — tanpa boxing, tanpa alokasi untuk
            aritmatika.
          </p>
          <p className="text-slate-400 leading-relaxed mb-6">
            Tangkapannya adalah operasi pada nilai non-angka membutuhkan
            urutan bit unpack-operate-repack. Jika urutan itu hidup sebagai
            pemanggilan ke runtime yang dikompilasi terpisah, LLVM
            melihatnya sebagai black box buram dan tidak bisa mengoptimasi
            lintas batasnya. Karena itu Perry menghasilkan operasi hot —
            pembacaan properti, dispatch metode, alokasi objek — sebagai
            LLVM IR inline yang bisa digabung dan disederhanakan oleh
            optimizer. Alokasi objek, misalnya, dikompilasi menjadi alokasi
            bump thread-local inline:
          </p>

          <div className="code-block mb-12">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs">LLVM IR — alokasi bump inline</span>
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

          <h2 className="text-2xl font-bold mb-6">Mengapa bukan Cranelift?</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Backend pertama Perry adalah Cranelift — codegen di balik
            wasmtime, dibangun untuk kompilasi yang cepat dan dapat
            diprediksi. Itu adalah titik awal yang tepat, dan Cranelift
            tetap menjadi pilihan yang sangat baik untuk JIT dan runtime
            yang di-sandbox. Dua hal memaksa peralihan ini:
          </p>
          <ul className="space-y-4 text-slate-400 leading-relaxed mb-6 list-disc pl-6 marker:text-amber-400">
            <li>
              <strong className="text-slate-300">Batas atas optimizer.</strong>{" "}
              Cranelift memang sengaja dirancang sebagai kompiler
              single-tier yang cepat: &ldquo;kode yang cukup baik, dengan
              cepat,&rdquo; yang merupakan trade-off yang tepat untuk JIT
              tapi salah untuk kompiler AOT yang nilai jualnya adalah
              performa native puncak.
            </li>
            <li>
              <strong className="text-slate-300">arm64_32.</strong> Apple
              Watch menggunakan ABI (instruksi 64-bit, pointer 32-bit)
              yang tidak didukung Cranelift. Agar watchOS bisa menjadi
              target, LLVM diperlukan — dan mempertahankan dua backend
              berarti dua set bug, test, dan baseline performa.
            </li>
          </ul>
          <p className="text-slate-400 leading-relaxed mb-12">
            Migrasi ini tidak gratis: rilis pertama yang hanya
            menggunakan LLVM membuat beberapa benchmark mengalami regresi
            hingga 70x karena operasi hot awalnya melewati pemanggilan
            helper runtime yang buram. Proses pemulihan — inline lowering,
            bump allocator di atas, batas inlining yang lebih baik —
            membawa backend ini melampaui angka Cranelift, dan pada
            akhirnya Perry mengalahkan Node.js di setiap benchmark dalam
            suite-nya, dengan kelipatan 1,7x hingga 24,6x dengan dua hasil
            seri (April 2026). Post-mortem lengkapnya layak dibaca:{" "}
            <Link
              href="/blog/cranelift-to-llvm"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Dari Cranelift ke LLVM
            </Link>
            .
          </p>

          <h2 className="text-2xl font-bold mb-6">Menyelami lebih dalam</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            <Link
              href="/internals"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Halaman struktur internal kompiler
            </Link>{" "}
            membahas NaN-boxing, monomorphization, dan static dispatch
            lebih detail. Di blog,{" "}
            <Link
              href="/blog/optimizing-everything"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Mengoptimalkan Semuanya
            </Link>{" "}
            menelusuri pekerjaan optimasi rilis demi rilis, dan{" "}
            <Link
              href="/blog/gen-gc-lazy-json-and-defensible-benchmarks"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              GC generasional, lazy JSON, dan benchmark yang tahan
              pemeriksaan
            </Link>{" "}
            menjelaskan cara kerja metodologi benchmark (RUNS=11, median +
            p95). Untuk gambaran yang lebih besar, mulai dari overview{" "}
            <Link
              href="/typescript-native-compiler"
              className="text-perry-400 hover:text-white transition-colors underline underline-offset-2"
            >
              kompiler TypeScript native
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
              Lihat outputnya sendiri
            </h2>
            <p className="text-slate-400 mb-6">
              <code className="text-slate-300">perry compile main.ts</code> —
              kode mesin native, tanpa engine yang menyertai.
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
      </section>
    </>
  );
}
