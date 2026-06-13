import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NewsletterForm } from "@/components/NewsletterForm";

const DISCORD_URL = "https://discord.gg/chEmpGdTtZ";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");

  return (
    <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/perry-icon.svg" alt="Perry" className="w-8 h-8" />
              <span className="text-xl font-bold gradient-text">Perry</span>
            </Link>
            <p className="text-slate-400 text-sm max-w-md mb-6">
              {t("brand")}
            </p>
            <div className="max-w-md">
              <NewsletterForm variant="footer" source="footer" />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-300">{t("resources")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#installation" className="text-slate-400 hover:text-white transition-colors">
                  {t("gettingStarted")}
                </a>
              </li>
              <li>
                <Link href="/showcase" className="text-slate-400 hover:text-white transition-colors">
                  {nav("showcase")}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-slate-400 hover:text-white transition-colors">
                  {nav("blog")}
                </Link>
              </li>
              <li>
                <Link href="/newsletter" className="text-slate-400 hover:text-white transition-colors">
                  {t("newsletter")}
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-slate-400 hover:text-white transition-colors">
                  {nav("compare")}
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="text-slate-400 hover:text-white transition-colors">
                  {nav("roadmap")}
                </Link>
              </li>
              <li>
                <Link href="/publish" className="text-slate-400 hover:text-white transition-colors">
                  {t("perryPublish")}
                </Link>
              </li>
              <li>
                <Link href="/enterprise" className="text-slate-400 hover:text-white transition-colors">
                  {t("enterprise")}
                </Link>
              </li>
              <li>
                <a href="https://docs.perryts.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  {t("documentation")}
                </a>
              </li>
              <li>
                <a href="https://geisterhand.io" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  Geisterhand
                </a>
              </li>
              <li>
                <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  {nav("github")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-300">{t("community")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  {nav("discord")}
                </a>
              </li>
              <li>
                <a href="https://github.com/PerryTS/perry/issues" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  {t("issues")}
                </a>
              </li>
              <li>
                <a href="https://github.com/PerryTS/perry/discussions" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  {t("discussions")}
                </a>
              </li>
              <li>
                <a href="https://github.com/PerryTS/perry/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  {t("contributing")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {t("tagline")}
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/imprint" className="hover:text-white transition-colors">
              Impressum
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Datenschutz
            </Link>
            <a
              href="https://github.com/PerryTS/perry"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              {nav("github")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
