import { getTranslations } from "next-intl/server";
import { PRODUCT_FACTS } from "@/lib/product-facts";

type FeatureStatus = "tested" | "partial";

const categories: ReadonlyArray<{
  nameKey: "coreLanguage" | "functions" | "classes" | "typeSystem" | "standardLibrary";
  features: ReadonlyArray<{ name: string; status: FeatureStatus }>;
}> = [
  {
    nameKey: "coreLanguage",
    features: [
      { name: "Numbers (f64 + selected unboxed representations)", status: "tested" },
      { name: "Strings (UTF-8)", status: "tested" },
      { name: "Booleans", status: "tested" },
      { name: "Arrays", status: "tested" },
      { name: "Objects", status: "tested" },
      { name: "BigInt (fixed 1024-bit)", status: "tested" },
      { name: "Proxy", status: "partial" },
      { name: "eval / runtime-generated code", status: "partial" },
    ],
  },
  {
    nameKey: "functions",
    features: [
      { name: "Function declarations", status: "tested" },
      { name: "Arrow functions", status: "tested" },
      { name: "Default parameters", status: "tested" },
      { name: "Rest parameters", status: "tested" },
      { name: "Closures", status: "tested" },
      { name: "Higher-order functions", status: "tested" },
      { name: "Async / await", status: "tested" },
      { name: "Runtime-computed dynamic import", status: "partial" },
    ],
  },
  {
    nameKey: "classes",
    features: [
      { name: "Classes and constructors", status: "tested" },
      { name: "Private fields (#)", status: "tested" },
      { name: "Static methods / fields", status: "tested" },
      { name: "Getters / setters", status: "tested" },
      { name: "Inheritance and super", status: "tested" },
      { name: "Decorators and reflection", status: "partial" },
      { name: "Dynamic prototype manipulation", status: "partial" },
      { name: "Weak references / finalizers", status: "partial" },
    ],
  },
  {
    nameKey: "typeSystem",
    features: [
      { name: "Type annotations", status: "tested" },
      { name: "Local type inference", status: "tested" },
      { name: "Generics / specialization", status: "tested" },
      { name: "Interfaces", status: "tested" },
      { name: "Union types and guards", status: "tested" },
      { name: "Runtime type validation", status: "partial" },
    ],
  },
  {
    nameKey: "standardLibrary",
    features: [
      { name: "fs / path / os", status: "partial" },
      { name: "crypto", status: "partial" },
      { name: "Buffer and streams", status: "partial" },
      { name: "http / http2 / net / tls", status: "partial" },
      { name: "child_process / worker_threads", status: "partial" },
      { name: "WebAssembly global", status: "partial" },
      { name: `${PRODUCT_FACTS.nodeParity} Node suite · ${PRODUCT_FACTS.nodeModuleCount} modules`, status: "partial" },
    ],
  },
];

function StatusIcon({ status }: { status: FeatureStatus }) {
  return status === "tested" ? (
    <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] flex items-center justify-center">✓</span>
  ) : (
    <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] flex items-center justify-center">–</span>
  );
}

export async function FeatureTable() {
  const t = await getTranslations("featureTable");

  return (
    <section id="docs" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", {
              gradient: (chunks) => <span className="gradient-text">{chunks}</span>,
            })}
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">{t("subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.nameKey} className="feature-card">
              <h3 className="text-lg font-semibold mb-4 text-perry-400">{t(category.nameKey)}</h3>
              <ul className="space-y-2">
                {category.features.map((feature) => (
                  <li key={feature.name} className="flex items-start gap-2 text-sm">
                    <StatusIcon status={feature.status} />
                    <span className="text-slate-300">{feature.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-3">
            <span className="flex items-center gap-2"><StatusIcon status="tested" />{t("tested")}</span>
            <span className="flex items-center gap-2"><StatusIcon status="partial" />{t("partial")}</span>
          </div>
          <p className="text-slate-500">
            {t("limitationsNote")}{" "}
            <a href={PRODUCT_FACTS.limitationsUrl} target="_blank" rel="noopener noreferrer" className="text-perry-400 hover:text-white underline underline-offset-4">
              {t("limitationsLink")}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
