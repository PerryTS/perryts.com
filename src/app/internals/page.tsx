import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compiler Internals",
  description:
    "How Perry compiles TypeScript to native code — NaN-Boxing, monomorphization, static dispatch, and zero-cost abstractions.",
};

export default function InternalsPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Compiler <span className="gradient-text">Internals</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              The key design decisions that make Perry fast
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">01</span>
                NaN-Boxing
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Values are stored as 64-bit floats with special bit patterns for
                pointers, enabling union types without runtime overhead. This
                allows{" "}
                <code className="text-perry-400">(string | number)[]</code> to
                work efficiently.
              </p>
              <p className="text-slate-500 text-sm">
                By encoding type information directly in the IEEE 754 NaN
                payload bits, Perry avoids the need for tagged unions or boxed
                values. A single 64-bit word can represent any JavaScript value
                type — numbers use their natural representation, while strings,
                objects, and other heap-allocated values use pointer bit
                patterns that fall within the NaN range.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">02</span>
                Monomorphization
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Generics are specialized at compile time, like Rust. Each type
                instantiation generates optimized code, eliminating runtime type
                checking overhead.
              </p>
              <p className="text-slate-500 text-sm">
                When you write <code className="text-perry-400">{"Array<number>"}</code>
                {" "}and <code className="text-perry-400">{"Array<string>"}</code>,
                Perry generates two separate, fully optimized implementations.
                This means array operations on numbers use direct machine
                arithmetic — no type guards, no dynamic dispatch, no boxing.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">03</span>
                Static Dispatch
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                No virtual tables. Method calls are resolved at compile time,
                enabling direct function calls and inlining optimizations.
              </p>
              <p className="text-slate-500 text-sm">
                Traditional OOP runtimes use vtables for method resolution,
                adding a layer of indirection on every call. Perry resolves all
                method calls statically during compilation, turning interface
                method calls into direct jumps. This also unlocks aggressive
                inlining — small methods are often folded directly into their
                call sites.
              </p>
            </div>

            <div className="feature-card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-perry-400">04</span>
                Zero-Cost Abstractions
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                TypeScript classes, interfaces, and generics compile to
                efficient native code with no runtime representation overhead.
              </p>
              <p className="text-slate-500 text-sm">
                TypeScript&apos;s type system exists only at compile time — and
                Perry takes this literally. Interfaces produce zero runtime
                code. Class hierarchies are flattened. Generic constraints are
                resolved to concrete types. The compiled binary contains only
                the actual logic, with none of the abstraction machinery that
                interpreters typically carry.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
