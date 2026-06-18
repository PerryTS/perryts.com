"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");
  const params = useParams();
  const currentLocale = (params?.locale as string) || "en";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/85 backdrop-blur-lg border-b border-white/8">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/perry-icon.svg" alt="Perry" className="w-8 h-8" />
            <span className="text-xl font-bold gradient-text">Perry</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/showcase"
              className="text-slate-400 hover:text-white transition-colors"
            >
              {t("showcase")}
            </Link>
            <Link
              href="/blog"
              className="text-slate-400 hover:text-white transition-colors"
            >
              {t("blog")}
            </Link>
            <Link
              href="/roadmap"
              className="text-slate-400 hover:text-white transition-colors"
            >
              {t("roadmap")}
            </Link>
            <Link
              href="/publish"
              className="text-slate-400 hover:text-white transition-colors"
            >
              {t("publish")}
            </Link>
            <a
              href="https://docs.perryts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              {t("docs")}
            </a>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              {t("github")}
            </a>
            <a
              href="https://discord.gg/chEmpGdTtZ"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
              {t("discord")}
            </a>

            {/* Language Switcher */}
            <div className="relative group">
              <button className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm uppercase">
                {currentLocale === "zh-Hans" ? "ZH" : currentLocale.toUpperCase()}
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                <div className="bg-[#1a1a1e] border border-white/10 rounded-xl py-2 px-1 min-w-[140px] shadow-xl max-h-80 overflow-y-auto">
                  {locales.map((locale) => (
                    <a
                      key={locale}
                      href={`/${locale}${typeof window !== "undefined" ? window.location.pathname.replace(/^\/[^/]+/, "") : "/"}`}
                      onClick={() => {
                        try { localStorage.setItem("perry-locale", locale); } catch {}
                      }}
                      className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        locale === currentLocale
                          ? "text-perry-400 bg-perry-500/10"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {localeNames[locale as Locale]}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col gap-4">
              <Link
                href="/showcase"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t("showcase")}
              </Link>
              <Link
                href="/blog"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t("blog")}
              </Link>
              <Link
                href="/roadmap"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t("roadmap")}
              </Link>
              <Link
                href="/publish"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t("publish")}
              </Link>
              <a
                href="https://docs.perryts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t("docs")}
              </a>
              <a
                href="https://github.com/PerryTS/perry"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t("github")}
              </a>
              <a
                href="https://discord.gg/chEmpGdTtZ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t("discord")}
              </a>
              {/* Mobile Language Switcher */}
              <div className="border-t border-slate-800 pt-4 mt-2">
                <div className="flex flex-wrap gap-2">
                  {locales.map((locale) => (
                    <a
                      key={locale}
                      href={`/${locale}/`}
                      onClick={() => {
                        try { localStorage.setItem("perry-locale", locale); } catch {}
                      }}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        locale === currentLocale
                          ? "text-perry-400 bg-perry-500/10 border border-perry-500/30"
                          : "text-slate-400 hover:text-white bg-slate-800/50 border border-slate-700"
                      }`}
                    >
                      {localeNames[locale as Locale]}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
