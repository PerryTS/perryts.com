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
            <div className="relative group">
              <Link
                href="/publish"
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                {t("publish")}
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                <div className="bg-[#1a1a1e] border border-white/10 rounded-xl py-2 px-1 min-w-[140px] shadow-xl">
                  <Link
                    href="/publish"
                    className="block px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {t("overview")}
                  </Link>
                  <Link
                    href="/pricing"
                    className="block px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {t("pricing")}
                  </Link>
                </div>
              </div>
            </div>
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
              <Link
                href="/pricing"
                className="text-slate-400 hover:text-white transition-colors pl-4 text-sm"
              >
                {t("pricing")}
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
