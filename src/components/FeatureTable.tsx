import { getTranslations } from "next-intl/server";

export async function FeatureTable() {
  const t = await getTranslations("featureTable");
  const categories = [
    {
      name: "Core Language",
      features: [
        { name: "Numbers", status: "full", note: "64-bit floating point (f64)" },
        { name: "Strings", status: "full", note: "UTF-8, all common methods" },
        { name: "Booleans", status: "full", note: "true/false, logical operators" },
        { name: "Arrays", status: "full", note: "Typed and mixed-type arrays" },
        { name: "Objects", status: "full", note: "Object literals and field access" },
        { name: "BigInt", status: "full", note: "256-bit integer support" },
        { name: "Enums", status: "full", note: "Numeric and string enums" },
      ],
    },
    {
      name: "Functions",
      features: [
        { name: "Function Declaration", status: "full", note: "Named functions" },
        { name: "Arrow Functions", status: "full", note: "() => {} syntax" },
        { name: "Default Parameters", status: "full", note: "Parameters with defaults" },
        { name: "Rest Parameters", status: "full", note: "...args syntax" },
        { name: "Closures", status: "full", note: "Including mutable captures" },
        { name: "Higher-Order Functions", status: "full", note: "Functions as arguments/returns" },
        { name: "Async/Await", status: "full", note: "Async function support" },
      ],
    },
    {
      name: "Classes",
      features: [
        { name: "Class Declaration", status: "full", note: "Basic class syntax" },
        { name: "Constructors", status: "full", note: "With parameters" },
        { name: "Private Fields (#)", status: "full", note: "ES2022 #privateField syntax" },
        { name: "Static Methods/Fields", status: "full", note: "Class-level members" },
        { name: "Getters/Setters", status: "full", note: "get/set accessors" },
        { name: "Inheritance", status: "full", note: "extends keyword" },
        { name: "Super Calls", status: "full", note: "super() constructor calls" },
      ],
    },
    {
      name: "Type System",
      features: [
        { name: "Type Annotations", status: "full", note: "Explicit type declarations" },
        { name: "Type Inference", status: "full", note: "Automatic type detection" },
        { name: "Generics", status: "full", note: "Monomorphization (like Rust)" },
        { name: "Interfaces", status: "full", note: "Interface declarations" },
        { name: "Union Types", status: "full", note: "string | number support" },
        { name: "Type Guards", status: "full", note: "typeof operator" },
        { name: "Type Aliases", status: "full", note: "type X = ... declarations" },
      ],
    },
    {
      name: "Standard Library",
      features: [
        { name: "fs", status: "full", note: "readFileSync, writeFileSync, existsSync, etc." },
        { name: "path", status: "full", note: "join, dirname, basename, extname, resolve" },
        { name: "crypto", status: "full", note: "randomBytes, randomUUID, sha256, md5" },
        { name: "os", status: "full", note: "platform, arch, hostname, memory info" },
        { name: "Buffer", status: "full", note: "from, alloc, toString, slice, copy" },
        { name: "child_process", status: "full", note: "execSync, spawnSync" },
        { name: "JSON/Math/Date", status: "full", note: "Full implementations" },
      ],
    },
  ];

  return (
    <section id="docs" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t.rich("title", { gradient: (chunks) => <span className="gradient-text">{chunks}</span> })}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="feature-card">
              <h3 className="text-lg font-semibold mb-4 text-perry-400">
                {category.name}
              </h3>
              <ul className="space-y-2">
                {category.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-0.5">
                      {feature.status === "full" ? (
                        <svg
                          className="w-4 h-4 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : feature.status === "partial" ? (
                        <svg
                          className="w-4 h-4 text-yellow-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </span>
                    <div>
                      <span className="text-slate-300">{feature.name}</span>
                      <span className="text-slate-500 text-xs block">
                        {feature.note}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mt-8 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {t("fullSupport")}
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t("partial")}
          </div>
        </div>
      </div>
    </section>
  );
}
