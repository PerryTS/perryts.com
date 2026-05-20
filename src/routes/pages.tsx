/** @jsxImportSource hono/jsx */
// Page templates driven by CMS message keys (already in settings).
// Used for: roadmap, pricing, enterprise, internals, publish, newsletter,
// privacy, imprint, compare-index/detail.

import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import { Layout } from '../layout.js';
import { site } from '../cms.js';
import { type Translator } from '../i18n.js';
import { rich } from '../icu.js';

interface CompareItem {
  slug: string;
  competitor: string;
  category: 'runtime' | 'compiler' | 'ui-framework';
  updated: string;
}

const PageHead: FC<{ eyebrow?: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <div class="pt-20 pb-10 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-gradient-to-b from-amber-950/10 to-transparent">
    <div class="max-w-3xl mx-auto text-center">
      {eyebrow ? <div class="text-xs uppercase tracking-[0.18em] font-semibold text-amber-400 mb-3">{eyebrow}</div> : null}
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">{raw(rich(title))}</h1>
      {subtitle ? <p class="text-lg text-slate-400">{raw(rich(subtitle))}</p> : null}
    </div>
  </div>
);

const Section: FC<{ children: unknown; narrow?: boolean }> = ({ children, narrow }) => (
  <div class={`${narrow ? 'max-w-3xl' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-16`}>{children as never}</div>
);

const Grid3: FC<{ children: unknown }> = ({ children }) => (
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">{children as never}</div>
);

const Grid2: FC<{ children: unknown }> = ({ children }) => (
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">{children as never}</div>
);

// ── Roadmap ─────────────────────────────────────────────────────────────

export const RoadmapPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title={`${t('roadmap.title', 'Roadmap')} · Perry`} description={t('roadmap.subtitle', '')} site={site} t={t} locales={locales} pathForSwitcher="/roadmap">
    <PageHead eyebrow={t('roadmap.title', 'Roadmap')} title={t('roadmap.title', 'Roadmap')} subtitle={t('roadmap.subtitle', '')} />
    <Section>
      <Grid3>
        <div class="feature-card"><h3 class="text-lg font-semibold text-emerald-400 mb-3">✓ {t('roadmap.shipped', 'Shipped')}</h3><p class="text-slate-400 text-sm leading-relaxed">{raw(rich(t('roadmap.vision', '')))}</p></div>
        <div class="feature-card"><h3 class="text-lg font-semibold text-amber-300 mb-3">⋯ {t('roadmap.inProgress', 'In progress')}</h3><p class="text-slate-400 text-sm leading-relaxed">{raw(rich(t('roadmap.subtitle', '')))}</p></div>
        <div class="feature-card"><h3 class="text-lg font-semibold text-slate-300 mb-3">○ {t('roadmap.planned', 'Planned')}</h3><p class="text-slate-400 text-sm leading-relaxed"><a class="text-amber-300 hover:text-amber-200" href="https://github.com/PerryTS/perry/issues">github.com/PerryTS/perry/issues</a></p></div>
      </Grid3>
    </Section>
  </Layout>
);

// ── Pricing ─────────────────────────────────────────────────────────────

export const PricingPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title={`${t('pricing.title', 'Pricing')} · Perry`} description={t('pricing.subtitle', '')} site={site} t={t} locales={locales} pathForSwitcher="/pricing">
    <PageHead eyebrow={t('pricing.breadcrumbPricing', 'Pricing')} title={t('pricing.title', 'Pricing')} subtitle={t('pricing.subtitle', '')} />
    <Section>
      <Grid2>
        <div class="feature-card">
          <div class="text-xs uppercase tracking-wider text-slate-500 mb-2">{t('pricing.free', 'Free')}</div>
          <div class="text-4xl font-bold text-white mb-2">€0<span class="text-base font-normal text-slate-500">/{t('pricing.perMonth', 'month')}</span></div>
          <p class="text-slate-400 mb-4 text-sm">{t('pricing.noAccountRequired', 'No account required.')}</p>
          <ul class="text-sm text-slate-300 space-y-2 mb-6">
            <li class="flex gap-2"><span class="text-amber-400">✓</span>{t('pricing.feature_lightVerify', 'Light verification')}</li>
            <li class="flex gap-2"><span class="text-amber-400">✓</span>{t('hero.viewOnGithub', 'Open source')}</li>
          </ul>
        </div>
        <div class="feature-card relative border-amber-500/40 bg-amber-500/[0.04]">
          <span class="absolute -top-3 right-4 bg-amber-500 text-amber-950 text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full">{t('pricing.mostPopular', 'Most popular')}</span>
          <div class="text-xs uppercase tracking-wider text-amber-300 mb-2">{t('pricing.pro', 'Pro')}</div>
          <div class="text-4xl font-bold text-white mb-2">€19<span class="text-base font-normal text-slate-500">/{t('pricing.perMonth', 'month')}</span></div>
          <p class="text-slate-400 mb-4 text-sm">{t('pricing.forDevs', 'For devs shipping cross-platform.')}</p>
          <ul class="text-sm text-slate-300 space-y-2 mb-6">
            <li class="flex gap-2"><span class="text-amber-400">✓</span>{t('pricing.feature_publishes15', '15 publishes / mo')}</li>
            <li class="flex gap-2"><span class="text-amber-400">✓</span>{t('pricing.feature_deepVerify2', 'Deep verification × 2')}</li>
          </ul>
          <a class="btn-primary inline-block w-full text-center" href="https://perryts.com/pricing">{t('pricing.subscribeToPro', 'Subscribe to Pro')}</a>
        </div>
      </Grid2>
    </Section>
  </Layout>
);

// ── Enterprise ──────────────────────────────────────────────────────────

export const EnterprisePage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title={t('enterprise.metaTitle', 'Enterprise · Perry')} description={t('enterprise.metaDescription', '')} site={site} t={t} locales={locales} pathForSwitcher="/enterprise">
    <PageHead eyebrow="Perry Enterprise" title={t('enterprise.metaTitle', 'Perry for teams')} subtitle={t('enterprise.metaDescription', '')} />
    <Section narrow>
      <p class="text-slate-300 text-lg leading-relaxed">
        {t('common.viewOnGithub', 'Talk to us.')} — <a class="text-amber-300 hover:text-amber-200" href="mailto:enterprise@skelpo.com">enterprise@skelpo.com</a>
      </p>
    </Section>
  </Layout>
);

// ── Internals ───────────────────────────────────────────────────────────

export const InternalsPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title={`${t('internals.title', 'Internals')} · Perry`} description={t('internals.subtitle', '')} site={site} t={t} locales={locales} pathForSwitcher="/internals">
    <PageHead title={t('internals.title', 'Compiler internals')} subtitle={t('internals.subtitle', '')} />
    <Section>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        <div class="feature-card"><h3 class="font-semibold text-white mb-2">{t('internals.nanBoxing', 'NaN-boxing')}</h3><p class="text-slate-400 text-sm">All values fit in 64 bits via NaN-tagged pointers.</p></div>
        <div class="feature-card"><h3 class="font-semibold text-white mb-2">{t('internals.monomorphization', 'Monomorphization')}</h3><p class="text-slate-400 text-sm">Specialize generics, eliminate dispatch overhead.</p></div>
        <div class="feature-card"><h3 class="font-semibold text-white mb-2">{t('internals.staticDispatch', 'Static dispatch')}</h3><p class="text-slate-400 text-sm">Direct calls, no v-tables.</p></div>
        <div class="feature-card"><h3 class="font-semibold text-white mb-2">{t('internals.zeroCost', 'Zero-cost')}</h3><p class="text-slate-400 text-sm">Abstractions compile away at the LLVM stage.</p></div>
      </div>
    </Section>
  </Layout>
);

// ── Publish ─────────────────────────────────────────────────────────────

export const PublishPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title={`${t('publish.title', 'Publish')} · Perry`} description={t('publish.subtitle', '')} site={site} t={t} locales={locales} pathForSwitcher="/publish">
    <PageHead title={t('publish.title', 'Publish')} subtitle={t('publish.subtitle', '')} />
    <Section>
      <Grid3>
        <div class="feature-card"><div class="text-xs uppercase tracking-wider text-amber-400 mb-2">1</div><h3 class="font-semibold text-white mb-2">{t('publish.buildSign', 'Build & sign')}</h3><p class="text-slate-400 text-sm">{t('publish.buildSignPlatforms', 'iOS, macOS, Windows, Android.')}</p></div>
        <div class="feature-card"><div class="text-xs uppercase tracking-wider text-amber-400 mb-2">2</div><h3 class="font-semibold text-white mb-2">{t('publish.distribute', 'Distribute')}</h3><p class="text-slate-400 text-sm">{t('publish.distributePlatforms', 'App Store, Play Store, direct downloads.')}</p></div>
        <div class="feature-card"><div class="text-xs uppercase tracking-wider text-amber-400 mb-2">3</div><h3 class="font-semibold text-white mb-2">{t('publish.verify', 'Verify')}</h3><p class="text-slate-400 text-sm">{t('publish.verifyDesc', 'Source-to-binary integrity verification.')}</p></div>
      </Grid3>
      <p class="text-center mt-10"><a class="btn-primary inline-block" href="/pricing">{t('common.seePricing', 'See pricing')} →</a></p>
    </Section>
  </Layout>
);

// ── Newsletter ──────────────────────────────────────────────────────────

export const NewsletterPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title={t('newsletter.pageTitle', 'Newsletter · Perry')} description={t('newsletter.pageDescription', '')} site={site} t={t} locales={locales} pathForSwitcher="/newsletter">
    <PageHead title={t('newsletter.pageTitle', 'Newsletter')} subtitle={t('newsletter.pageSubtitle', '')} />
    <Section narrow>
      <form class="feature-card !p-8">
        <p class="text-slate-400 text-sm mb-4">{t('newsletter.footerHint', 'Engineering updates. No spam.')}</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <input type="email" required placeholder={t('newsletter.placeholder', 'you@example.com')} class="flex-1 bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
          <button type="submit" class="btn-primary">{t('newsletter.subscribe', 'Subscribe')}</button>
        </div>
        <p class="text-xs text-slate-500 mt-3">{t('newsletter.privacy', 'We never share your address.')}</p>
      </form>
    </Section>
  </Layout>
);

// ── Privacy / Imprint ───────────────────────────────────────────────────

const TextOnly: FC<{ title: string; t: Translator; locales: string[]; path: string }> = ({ title, t, locales, path }) => (
  <Layout title={`${title} · Perry`} site={site} t={t} locales={locales} pathForSwitcher={path}>
    <PageHead title={title} />
    <Section narrow>
      <p class="text-slate-400">See <a class="text-amber-300 hover:text-amber-200" href="https://perryts.com">perryts.com</a> for the canonical text.</p>
    </Section>
  </Layout>
);
export const PrivacyPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => <TextOnly title="Privacy" t={t} locales={locales} path="/privacy" />;
export const ImprintPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => <TextOnly title="Imprint" t={t} locales={locales} path="/imprint" />;

// ── Compare ─────────────────────────────────────────────────────────────

export const CompareIndex: FC<{ items: CompareItem[]; t: Translator; locales: string[] }> = ({ items, t, locales }) => (
  <Layout title={`${t('nav.compare', 'Compare')} · Perry`} description="Perry vs other runtimes, compilers, and UI frameworks." site={site} t={t} locales={locales} pathForSwitcher="/compare">
    <PageHead eyebrow={t('nav.compare', 'Compare')} title="Perry vs. the rest" subtitle="Side-by-side against other runtimes, compilers, and UI frameworks." />
    <Section>
      <Grid3>
        {items.map((c) => (
          <a class="feature-card group" href={`/compare/${c.slug}`}>
            <div class="text-xs uppercase tracking-wider text-amber-400/80 mb-2">{c.category}</div>
            <h3 class="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors mb-2">Perry vs {c.competitor}</h3>
            <div class="text-xs text-slate-500">Updated {c.updated}</div>
          </a>
        ))}
      </Grid3>
    </Section>
  </Layout>
);

export const CompareItemPage: FC<{ item: CompareItem; t: Translator; locales: string[] }> = ({ item, t, locales }) => (
  <Layout title={`Perry vs ${item.competitor} · Perry`} description={`How Perry compares to ${item.competitor} (${item.category}).`} site={site} t={t} locales={locales} pathForSwitcher={`/compare/${item.slug}`}>
    <PageHead eyebrow={item.category} title={`Perry vs ${item.competitor}`} subtitle={`Updated ${item.updated}.`} />
    <Section narrow>
      <p class="text-slate-300 leading-relaxed mb-6">A side-by-side of Perry and {item.competitor}. The full comparison is queued for the next migration pass; for the short version, see the comparison table on the <a class="text-amber-300 hover:text-amber-200" href="/">home page</a>.</p>
      <a class="btn-secondary inline-block" href="/compare">← All comparisons</a>
    </Section>
  </Layout>
);
