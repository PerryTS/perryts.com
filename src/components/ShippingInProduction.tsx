import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface ShippedApp {
  name: string;
  tagline: string;
  href: string;
  external: boolean;
  iconSrc?: string;
  iconFallback?: React.ReactNode;
}

const apps: ShippedApp[] = [
  {
    name: "Mango",
    tagline: "Native MongoDB GUI. ~7 MB binary, <1s cold start.",
    href: "https://github.com/MangoQuery/app",
    external: true,
    iconSrc: "/showcase/mango-logo.svg",
  },
  {
    name: "Hone",
    tagline: "Native code editor with built-in terminal, Git, LSP, sync.",
    href: "https://hone.codes",
    external: true,
    iconSrc: "/showcase/hone-icon.svg",
  },
  {
    name: "dB Meter",
    tagline: "Real-time decibel meter with 60 fps live waveform.",
    href: "https://dbmeter.app",
    external: true,
    iconSrc: "/showcase/dbmeter-icon.png",
  },
  {
    name: "Pry",
    tagline: "Fast native JSON viewer — tree, search, keyboard shortcuts.",
    href: "/showcase/pry",
    external: false,
    iconFallback: (
      <span className="font-mono text-perry-400 text-sm font-semibold">
        {"{ }"}
      </span>
    ),
  },
];

export async function ShippingInProduction() {
  const t = await getTranslations("shipping");
  const tShowcase = await getTranslations("appShowcase");

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-amber-400/80 mb-2">
              {t("eyebrow")}
            </div>
            <p className="text-lg text-slate-300">{t("subtitle")}</p>
          </div>
          <Link
            href="/showcase"
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1 self-start sm:self-end"
          >
            {tShowcase("viewAll")}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {apps.map((app) => {
            const inner = (
              <div className="group h-full bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] rounded-xl p-5 transition-all duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {app.iconSrc ? (
                      <Image
                        src={app.iconSrc}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain"
                      />
                    ) : (
                      app.iconFallback
                    )}
                  </div>
                  <div className="font-semibold text-white">{app.name}</div>
                </div>
                <p className="text-sm text-slate-400 leading-snug">
                  {app.tagline}
                </p>
              </div>
            );
            if (app.external) {
              return (
                <a
                  key={app.name}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={app.name} href={app.href} className="block">
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
