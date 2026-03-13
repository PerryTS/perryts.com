"use client";

import { useState } from "react";
import Link from "next/link";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              Showcase
            </Link>
            <Link
              href="/blog"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/roadmap"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Roadmap
            </Link>
            <Link
              href="/publish"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Publish
            </Link>
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
              GitHub
            </a>
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
                Showcase
              </Link>
              <Link
                href="/blog"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/roadmap"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Roadmap
              </Link>
              <Link
                href="/publish"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Publish
              </Link>
              <a
                href="https://github.com/PerryTS/perry"
                className="text-slate-400 hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
