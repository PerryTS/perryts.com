/** @jsxImportSource hono/jsx */
// Shared chrome (head + header + footer + locale switcher). Loads the
// built Tailwind CSS at /styles.css; uses the perry-amber design tokens
// declared in globals.css. SEO head delegated to @skelpo/site-kit.

import type { FC, PropsWithChildren } from 'hono/jsx';
import { metaTagsToHtml, jsonLdToHtml, buildMetaTags, buildJsonLd } from '@skelpo/site-kit';
import type { MetaTag, SkContent, SkSite } from '@skelpo/site-kit';
import { raw } from 'hono/html';
import type { Translator } from './i18n.js';
import { localize } from './i18n.js';

export interface LayoutProps {
  title: string;
  description?: string;
  content?: SkContent;
  site: SkSite;
  t: Translator;
  locales: string[];
  pathForSwitcher: string;
  jsonLdImageUrl?: string;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title, description, content, site, t, locales, pathForSwitcher, jsonLdImageUrl, children,
}) => {
  let metaHtml = '';
  let ldHtml = '';
  if (content) {
    const meta: MetaTag[] = buildMetaTags(content, site, jsonLdImageUrl ? { imageUrl: jsonLdImageUrl } : {});
    metaHtml = metaTagsToHtml(meta);
    ldHtml = jsonLdToHtml(buildJsonLd(content, site, jsonLdImageUrl ? { imageUrl: jsonLdImageUrl } : {}));
  } else {
    metaHtml = `<title>${title}</title>` +
      (description ? `<meta name="description" content="${description.replace(/"/g, '&quot;')}">` : '');
  }
  return (
    <html lang={t.locale} class="scroll-smooth">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {raw(metaHtml)}
        {raw(ldHtml)}
        <link rel="alternate" type="application/rss+xml" href={localize('/feed.xml', t.locale)} />
        {locales.map((l) => (
          <link rel="alternate" hreflang={l} href={`${site.url}${localize(pathForSwitcher, l)}`} />
        ))}
        <link rel="icon" type="image/svg+xml" href="/perry-favicon.svg" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/perry-icon.svg" />
        <meta name="theme-color" content="#0a0a0f" />
        {!content ? <meta property="og:image" content={`${site.url}/perry-social-banner.svg`} /> : null}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap"
        />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-[#0a0a0f] text-slate-200 min-h-screen antialiased">
        <Header t={t} locales={locales} pathForSwitcher={pathForSwitcher} />
        <main class="min-h-[60vh]">{children}</main>
        <SiteFooter t={t} />
      </body>
    </html>
  );
};

const Header: FC<{ t: Translator; locales: string[]; pathForSwitcher: string }> = ({ t, locales, pathForSwitcher }) => (
  <header class="sticky top-0 z-30 backdrop-blur-md bg-[#0a0a0f]/75 border-b border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      <a class="flex items-center gap-2 font-bold text-lg tracking-tight text-white" href={localize('/', t.locale)}>
        <img src="/perry-icon.svg" alt="" class="w-7 h-7" width="28" height="28" />
        Perry
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm text-slate-400">
        <a class="hover:text-white transition-colors" href={localize('/showcase', t.locale)}>{t('nav.showcase', 'Showcase')}</a>
        <a class="hover:text-white transition-colors" href={localize('/blog', t.locale)}>{t('nav.blog', 'Blog')}</a>
        <a class="hover:text-white transition-colors" href={localize('/compare', t.locale)}>{t('nav.compare', 'Compare')}</a>
        <a class="hover:text-white transition-colors" href={localize('/roadmap', t.locale)}>{t('nav.roadmap', 'Roadmap')}</a>
        <a class="hover:text-white transition-colors" href={localize('/publish', t.locale)}>{t('nav.publish', 'Publish')}</a>
        <a class="hover:text-white transition-colors" href={localize('/pricing', t.locale)}>{t('nav.pricing', 'Pricing')}</a>
        <a class="hover:text-white transition-colors" href="https://github.com/PerryTS/perry">{t('nav.github', 'GitHub')}</a>
      </nav>
      <details class="relative">
        <summary class="cursor-pointer list-none flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400 hover:text-white border border-white/10 hover:border-amber-500/30 px-2.5 py-1.5 rounded-md transition-colors">
          {t.locale} <span class="text-amber-400">▾</span>
        </summary>
        <div class="absolute right-0 mt-2 bg-[#15161c] border border-white/10 rounded-lg p-2 grid grid-cols-3 gap-1 min-w-[180px] z-40 shadow-xl">
          {locales.map((l) => (
            <a class={`text-xs px-2 py-1 rounded text-center uppercase tracking-wider ${l === t.locale ? 'bg-amber-500 text-amber-950 font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} href={localize(pathForSwitcher, l)}>
              {l}
            </a>
          ))}
        </div>
      </details>
    </div>
  </header>
);

const SiteFooter: FC<{ t: Translator }> = ({ t }) => (
  <footer class="mt-32 border-t border-white/5 bg-[#0d0d12]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-10 text-sm">
      <div class="col-span-2 md:col-span-1">
        <a class="inline-flex items-center mb-3" href={localize('/', t.locale)}>
          <img src="/perry-logo-horizontal-dark.svg" alt="Perry" class="h-7 w-auto" height="28" />
        </a>
        <p class="text-slate-500 leading-relaxed">{t('footer.tagline', 'Native TypeScript. Standalone executables.')}</p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3 text-xs uppercase tracking-wider">{t('footer.resources', 'Resources')}</h4>
        <ul class="space-y-2 text-slate-400">
          <li><a class="hover:text-amber-300" href={localize('/blog', t.locale)}>{t('nav.blog', 'Blog')}</a></li>
          <li><a class="hover:text-amber-300" href={localize('/showcase', t.locale)}>{t('nav.showcase', 'Showcase')}</a></li>
          <li><a class="hover:text-amber-300" href={localize('/compare', t.locale)}>{t('nav.compare', 'Compare')}</a></li>
          <li><a class="hover:text-amber-300" href={localize('/internals', t.locale)}>{t('footer.documentation', 'Documentation')}</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3 text-xs uppercase tracking-wider">{t('footer.community', 'Community')}</h4>
        <ul class="space-y-2 text-slate-400">
          <li><a class="hover:text-amber-300" href="https://github.com/PerryTS/perry">GitHub</a></li>
          <li><a class="hover:text-amber-300" href="https://github.com/PerryTS/perry/issues">{t('footer.issues', 'Issues')}</a></li>
          <li><a class="hover:text-amber-300" href="https://github.com/PerryTS/perry/discussions">{t('footer.discussions', 'Discussions')}</a></li>
          <li><a class="hover:text-amber-300" href={localize('/newsletter', t.locale)}>Newsletter</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3 text-xs uppercase tracking-wider">{t('footer.enterprise', 'Enterprise')}</h4>
        <ul class="space-y-2 text-slate-400">
          <li><a class="hover:text-amber-300" href={localize('/pricing', t.locale)}>{t('nav.pricing', 'Pricing')}</a></li>
          <li><a class="hover:text-amber-300" href={localize('/enterprise', t.locale)}>{t('footer.enterprise', 'Enterprise')}</a></li>
          <li><a class="hover:text-amber-300" href={localize('/privacy', t.locale)}>Privacy</a></li>
          <li><a class="hover:text-amber-300" href={localize('/imprint', t.locale)}>Imprint</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <span>© {new Date().getFullYear()} Skelpo · {t('footer.brand', 'Perry')}</span>
        <span>
          Served by a Perry-native customer site on Skelpo CMS ·{' '}
          <a class="hover:text-amber-300" href={localize('/sitemap.xml', t.locale)}>sitemap</a> ·{' '}
          <a class="hover:text-amber-300" href={localize('/feed.xml', t.locale)}>rss</a> ·{' '}
          <a class="hover:text-amber-300" href={localize('/llms.txt', t.locale)}>llms.txt</a>
        </span>
      </div>
    </div>
  </footer>
);
