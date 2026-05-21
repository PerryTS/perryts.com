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

interface Milestone { title: string; description: string; status: 'shipped' | 'inProgress' | 'planned' | 'vision'; sortOrder?: number }

const ROADMAP_SECTIONS: { status: Milestone['status']; labelKey: string; fallback: string; color: string; border: string; bg: string; dot: string; icon: string }[] = [
  { status: 'shipped',    labelKey: 'roadmap.shipped',    fallback: 'Shipped',     color: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10',  dot: 'bg-green-500',  icon: '✓' },
  { status: 'inProgress', labelKey: 'roadmap.inProgress', fallback: 'In progress', color: 'text-amber-300',  border: 'border-amber-500/30',  bg: 'bg-amber-500/10',  dot: 'bg-amber-500',  icon: '⋯' },
  { status: 'planned',    labelKey: 'roadmap.planned',    fallback: 'Planned',     color: 'text-slate-300',  border: 'border-slate-500/30',  bg: 'bg-slate-500/10',  dot: 'bg-slate-500',  icon: '○' },
  { status: 'vision',     labelKey: 'roadmap.vision',     fallback: 'Vision',      color: 'text-purple-300', border: 'border-purple-500/30', bg: 'bg-purple-500/10', dot: 'bg-purple-500', icon: '◇' },
];

export const RoadmapPage: FC<{ t: Translator; locales: string[]; subtitle: string; milestones: Milestone[] }> = ({ t, locales, subtitle, milestones }) => {
  const groups = ROADMAP_SECTIONS.map((s) => ({
    ...s,
    items: milestones
      .filter((m) => m.status === s.status)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  }));

  return (
    <Layout title={`${t('roadmap.title', 'Roadmap')} · Perry`} description={subtitle} site={site} t={t} locales={locales} pathForSwitcher="/roadmap">
      <PageHead eyebrow={t('roadmap.title', 'Roadmap')} title={t('roadmap.title', 'Roadmap')} subtitle={subtitle} />
      <Section>
        <div class="space-y-16 max-w-5xl mx-auto">
          {groups.map((g) => g.items.length === 0 ? null : (
            <div>
              <div class={`inline-flex items-center gap-2 ${g.color} ${g.bg} ${g.border} border rounded-full px-3 py-1 mb-6`}>
                <span class="text-sm">{g.icon}</span>
                <span class="text-xs uppercase tracking-wider font-semibold">{t(g.labelKey, g.fallback)} · {g.items.length}</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {g.items.map((m) => (
                  <div class="feature-card">
                    <div class="flex items-start gap-3">
                      <span class={`mt-2 w-1.5 h-1.5 rounded-full ${g.dot} shrink-0`} />
                      <div>
                        <h3 class="font-semibold text-white mb-1.5 leading-snug">{m.title}</h3>
                        <p class="text-slate-400 text-sm leading-relaxed">{m.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p class="text-center text-sm text-slate-500 mt-16">
          <a class="text-amber-300 hover:text-amber-200" href="https://github.com/PerryTS/perry/issues">github.com/PerryTS/perry/issues</a> for the live tracker.
        </p>
      </Section>
    </Layout>
  );
};

// ── Pricing (CMS-driven: singleton row with tiers/compareRows/faqs) ─────

interface PricingTier { name: string; tagline?: string; priceLabel?: string; period?: string; popular?: boolean; features?: string; ctaLabel?: string; ctaUrl?: string; sortOrder?: number }
interface CompareRow { label: string; free: string; pro: string; sortOrder?: number }
interface Faq { question: string; answer: string; sortOrder?: number }
export interface PricingData {
  subtitle?: string;
  enterpriseBannerText?: string;
  enterpriseBannerLink?: string;
  enterpriseBannerUrl?: string;
  footnote?: string;
  tiers?: PricingTier[];
  compareRows?: CompareRow[];
  selfHostTitle?: string;
  selfHostDesc?: string;
  selfHostLinkLabel?: string;
  selfHostLinkUrl?: string;
  faqs?: Faq[];
}

export const PricingPage: FC<{ t: Translator; locales: string[]; data: PricingData }> = ({ t, locales, data }) => {
  const tiers = (data.tiers ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const rows = (data.compareRows ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const faqs = (data.faqs ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const subtitle = data.subtitle ?? t('pricing.subtitle', '');

  return (
    <Layout title={`${t('pricing.title', 'Pricing')} · Perry`} description={subtitle} site={site} t={t} locales={locales} pathForSwitcher="/pricing">
      <section class="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-5xl mx-auto">
          {/* Enterprise banner */}
          {data.enterpriseBannerText || data.enterpriseBannerLink ? (
            <div class="max-w-4xl mx-auto mb-10">
              <a
                href={data.enterpriseBannerUrl ?? '/enterprise'}
                class="block rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.08] hover:border-amber-500/50 transition-all duration-200 px-4 py-3 text-sm text-center"
              >
                {data.enterpriseBannerText ? <span class="text-slate-300">{data.enterpriseBannerText}</span> : null}{' '}
                {data.enterpriseBannerLink ? <span class="text-amber-400 font-semibold">{data.enterpriseBannerLink}</span> : null}
              </a>
            </div>
          ) : null}

          {/* Hero */}
          <div class="text-center mb-16">
            <p class="text-sm text-slate-500 mb-3">
              <a class="hover:text-slate-300 transition-colors" href="/publish">{t('pricing.breadcrumbPublish', 'Perry Publish')}</a>
              <span class="mx-2">/</span>
              <span class="text-slate-400">{t('pricing.breadcrumbPricing', 'Pricing')}</span>
            </p>
            <h1 class="text-4xl sm:text-5xl font-bold mb-4">
              <span class="gradient-text">{t('pricing.title', 'Pricing')}</span>
            </h1>
            <p class="text-xl text-slate-400 max-w-2xl mx-auto">{subtitle}</p>
          </div>

          {/* Tier cards */}
          {tiers.length > 0 ? (
            <div class={`grid gap-8 max-w-4xl mx-auto ${tiers.length >= 2 ? 'md:grid-cols-2' : ''}`}>
              {tiers.map((tier) => (
                <div class={`feature-card flex flex-col ${tier.popular ? 'border-amber-500/30 relative' : ''}`}>
                  {tier.popular ? (
                    <div class="absolute -top-3 left-6">
                      <span class="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">{t('pricing.mostPopular', 'Most popular')}</span>
                    </div>
                  ) : null}
                  <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-1 text-white">{tier.name}</h2>
                    {tier.tagline ? <p class="text-slate-500 text-sm">{tier.tagline}</p> : null}
                  </div>
                  <div class="mb-6">
                    <span class="text-4xl font-bold text-white">{tier.priceLabel ?? ''}</span>
                    {tier.period ? <span class="text-slate-500 ml-2">{tier.period}</span> : null}
                  </div>
                  {tier.features ? (
                    <ul class="space-y-3 mb-8 flex-1">
                      {tier.features.split('\n').map((f) => f.trim()).filter(Boolean).map((f) => (
                        <li class="flex items-start gap-3">
                          <svg class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                          <span class="text-slate-300">{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {tier.ctaUrl ? (
                    <a class={`${tier.popular ? 'btn-primary' : 'btn-secondary'} text-center`} href={tier.ctaUrl}
                       {...(/^https?:/.test(tier.ctaUrl) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      {tier.ctaLabel ?? t('hero.getStarted', 'Get started')}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Compare plans table */}
          {rows.length > 0 && tiers.length >= 2 ? (
            <div class="mt-20 max-w-4xl mx-auto">
              <h2 class="text-2xl font-bold text-center mb-8 text-white">{t('pricing.comparePlans', 'Compare plans')}</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b border-white/10">
                      <th class="py-3 pr-4 text-slate-400 font-medium" />
                      <th class="py-3 px-4 text-slate-300 font-semibold">{t('pricing.col_free', 'Free')}</th>
                      <th class="py-3 px-4 text-amber-400 font-semibold">{t('pricing.col_pro', 'Pro')}</th>
                    </tr>
                  </thead>
                  <tbody class="text-sm">
                    {rows.map((row) => (
                      <tr class="border-b border-white/5">
                        <td class="py-3 pr-4 text-slate-400">{row.label}</td>
                        <td class="py-3 px-4 text-slate-300">{row.free}</td>
                        <td class="py-3 px-4 text-slate-300">{row.pro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.footnote ? <p class="text-xs text-slate-500 mt-3">{data.footnote}</p> : null}
            </div>
          ) : null}

          {/* Self-host callout */}
          {data.selfHostTitle || data.selfHostDesc ? (
            <div class="mt-20 max-w-3xl mx-auto">
              <div class="feature-card text-center">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
                </div>
                {data.selfHostTitle ? <h2 class="text-xl font-bold mb-2 text-white">{data.selfHostTitle}</h2> : null}
                {data.selfHostDesc ? <p class="text-slate-400 mb-4 leading-relaxed">{data.selfHostDesc}</p> : null}
                {data.selfHostLinkUrl ? (
                  <a class="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1" href={data.selfHostLinkUrl}
                     {...(/^https?:/.test(data.selfHostLinkUrl) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {data.selfHostLinkLabel ?? 'Learn more'} →
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* FAQs */}
          {faqs.length > 0 ? (
            <div class="mt-20 max-w-3xl mx-auto">
              <h2 class="text-2xl font-bold text-center mb-8 text-white">{t('pricing.faq.title', 'Questions')}</h2>
              <div class="space-y-6">
                {faqs.map((q) => (
                  <details class="feature-card group">
                    <summary class="font-semibold text-white cursor-pointer flex justify-between items-center">
                      {q.question}
                      <span class="text-amber-400 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p class="mt-3 text-slate-400 text-sm leading-relaxed">{q.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
};

// ── Enterprise ──────────────────────────────────────────────────────────

// Pull a bullet list from a numbered key set (audience.item1..N / included.item1..N).
function bullets(t: Translator, prefix: string, max = 12): string[] {
  const out: string[] = [];
  for (let i = 1; i <= max; i++) {
    const v = t(`${prefix}.item${i}`, '');
    if (!v || v === `${prefix}.item${i}`) break;
    out.push(v);
  }
  return out;
}

function tierFeatures(t: Translator, prefix: string, max = 12): string[] {
  const out: string[] = [];
  for (let i = 1; i <= max; i++) {
    const v = t(`${prefix}.feature${i}`, '');
    if (!v || v === `${prefix}.feature${i}`) break;
    out.push(v);
  }
  return out;
}

interface EnterpriseFaqItem { q: string; a: string }
function enterpriseFaqs(t: Translator, max = 12): EnterpriseFaqItem[] {
  const out: EnterpriseFaqItem[] = [];
  for (let i = 1; i <= max; i++) {
    const q = t(`enterprise.faq.q${i}`, '');
    const a = t(`enterprise.faq.a${i}`, '');
    if (!q || !a || q === `enterprise.faq.q${i}`) break;
    out.push({ q, a });
  }
  return out;
}

export const EnterprisePage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => {
  const heroTitle = t('enterprise.hero.title', 'Perry for teams shipping in production');
  const heroSubtitle = t('enterprise.hero.subtitle', '');
  const heroCta = t('enterprise.hero.primaryCta', 'Email us');
  const audience = bullets(t, 'enterprise.audience');
  const included = bullets(t, 'enterprise.included');
  const faqs = enterpriseFaqs(t);
  const teamFeatures = tierFeatures(t, 'enterprise.tiers.team');
  const entFeatures  = tierFeatures(t, 'enterprise.tiers.enterprise');

  return (
    <Layout title={t('enterprise.metaTitle', 'Perry for Teams')} description={t('enterprise.metaDescription', '')} site={site} t={t} locales={locales} pathForSwitcher="/enterprise">
      {/* Hero */}
      <section class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto text-center">
          <div class="text-xs uppercase tracking-[0.18em] font-semibold text-amber-400 mb-4">Perry Enterprise</div>
          <h1 class="text-4xl sm:text-5xl font-bold mb-5"><span class="gradient-text">{heroTitle}</span></h1>
          <p class="text-xl text-slate-400 leading-relaxed mb-8">{heroSubtitle}</p>
          <a class="btn-primary inline-block" href="mailto:ralph@perryts.com">{heroCta}</a>
        </div>
      </section>

      {/* Who this is for */}
      {audience.length > 0 ? (
        <section class="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold text-center text-white mb-8">{t('enterprise.audience.title', 'Who this is for')}</h2>
            <ul class="space-y-3">
              {audience.map((item) => (
                <li class="flex gap-3 items-start">
                  <span class="text-amber-400 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span class="text-slate-300 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* What's included */}
      {included.length > 0 ? (
        <section class="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold text-center text-white mb-8">{t('enterprise.included.title', "What's included")}</h2>
            <div class="feature-card !p-8">
              <ul class="space-y-3">
                {included.map((item) => (
                  <li class="flex gap-3 items-start">
                    <svg class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <span class="text-slate-300 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* Plans */}
      <section class="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold text-white mb-3">{t('enterprise.tiers.title', 'Plans')}</h2>
            <p class="text-slate-400 max-w-2xl mx-auto">{t('enterprise.tiers.subtitle', '')}</p>
          </div>
          <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Team */}
            <div class="feature-card flex flex-col">
              <div class="mb-6">
                <h3 class="text-2xl font-bold text-white mb-1">{t('enterprise.tiers.team.name', 'Team')}</h3>
                <p class="text-slate-500 text-sm">{t('enterprise.tiers.team.tagline', '')}</p>
              </div>
              <div class="mb-6">
                <span class="text-4xl font-bold text-white">{t('enterprise.tiers.team.price', '$499')}</span>
                <span class="text-slate-500 ml-2">{t('enterprise.tiers.perMonth', '/month')}</span>
              </div>
              <ul class="space-y-3 mb-8 flex-1">
                {teamFeatures.map((f) => (
                  <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <span class="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>
              <a class="btn-secondary text-center" href="mailto:ralph@perryts.com">{t('enterprise.tiers.team.cta', 'Subscribe')}</a>
            </div>

            {/* Enterprise (recommended) */}
            <div class="feature-card flex flex-col border-amber-500/30 relative">
              <div class="absolute -top-3 left-6">
                <span class="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">{t('enterprise.tiers.recommended', 'Recommended')}</span>
              </div>
              <div class="mb-6">
                <h3 class="text-2xl font-bold text-white mb-1">{t('enterprise.tiers.enterprise.name', 'Enterprise')}</h3>
                <p class="text-slate-500 text-sm">{t('enterprise.tiers.enterprise.tagline', '')}</p>
              </div>
              <div class="mb-6">
                <span class="text-4xl font-bold text-white">{t('enterprise.tiers.enterprise.price', 'Custom')}</span>
              </div>
              {entFeatures.length > 0 ? <p class="text-xs uppercase tracking-wider text-slate-500 mb-3">{t('enterprise.tiers.enterprise.everythingIn', 'Everything in Team, plus:')}</p> : null}
              <ul class="space-y-3 mb-8 flex-1">
                {entFeatures.map((f) => (
                  <li class="flex items-start gap-3">
                    <svg class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    <span class="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>
              <a class="btn-primary text-center" href="mailto:ralph@perryts.com">{t('enterprise.tiers.enterprise.cta', 'Talk to us')}</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 ? (
        <section class="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold text-center text-white mb-8">{t('enterprise.faq.title', 'Questions')}</h2>
            <div class="space-y-4">
              {faqs.map((q) => (
                <details class="feature-card group">
                  <summary class="font-semibold text-white cursor-pointer flex justify-between items-center">
                    {q.q}
                    <span class="text-amber-400 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p class="mt-3 text-slate-400 text-sm leading-relaxed">{q.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Closing */}
      <section class="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div class="max-w-2xl mx-auto text-center">
          <div class="feature-card !p-8">
            <h2 class="text-2xl font-bold text-white mb-3">{t('enterprise.closing.title', 'Talk to the team')}</h2>
            <p class="text-slate-400 mb-6 leading-relaxed">{t('enterprise.closing.body', '')}</p>
            <a class="btn-primary inline-block" href="mailto:ralph@perryts.com">{t('enterprise.closing.emailCta', 'Email us')}</a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

// ── Internals ───────────────────────────────────────────────────────────

const INTERNALS_TOPICS: { num: string; key: string; name: string }[] = [
  { num: '01', key: 'nanBoxing',        name: 'NaN-Boxing' },
  { num: '02', key: 'monomorphization', name: 'Monomorphization' },
  { num: '03', key: 'staticDispatch',   name: 'Static Dispatch' },
  { num: '04', key: 'zeroCost',         name: 'Zero-Cost Abstractions' },
];

export const InternalsPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title="Compiler Internals · Perry" description={t('internals.subtitle', 'How Perry compiles TypeScript to native code.')} site={site} t={t} locales={locales} pathForSwitcher="/internals">
    <section class="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h1 class="text-4xl sm:text-5xl font-bold mb-4">{raw(rich(t('internals.title', 'Compiler <gradient>Internals</gradient>')))}</h1>
          <p class="text-xl text-slate-400 max-w-2xl mx-auto">{t('internals.subtitle', '')}</p>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          {INTERNALS_TOPICS.map((topic) => (
            <div class="feature-card">
              <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span class="text-amber-400">{topic.num}</span>
                {topic.name}
              </h3>
              <p class="text-slate-400 text-sm mb-4 leading-relaxed">{t(`internals.${topic.key}.p1`, '')}</p>
              <p class="text-slate-500 text-sm leading-relaxed">{t(`internals.${topic.key}.p2`, '')}</p>
            </div>
          ))}
        </div>
        <div class="text-center mt-12">
          <a class="btn-secondary inline-flex items-center gap-2" href="/">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
            {t('common.backToHome', '← Home')}
          </a>
        </div>
      </div>
    </section>
  </Layout>
);

// ── Publish ─────────────────────────────────────────────────────────────

export const PublishPage: FC<{ t: Translator; locales: string[] }> = ({ t, locales }) => (
  <Layout title="Perry Publish · Perry" description={t('publish.subtitle', '')} site={site} t={t} locales={locales} pathForSwitcher="/publish">
    <section class="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto text-center">
        <h1 class="text-4xl sm:text-5xl font-bold mb-6"><span class="gradient-text">{t('publish.title', 'Perry Publish')}</span></h1>
        <p class="text-xl text-slate-400 mb-12 leading-relaxed">{t('publish.subtitle', '')}</p>

        {/* Terminal mock */}
        <div class="code-block text-left mb-12 max-w-lg mx-auto">
          <div class="flex items-center gap-2 mb-4 text-slate-500">
            <span class="w-3 h-3 rounded-full bg-red-500/60" />
            <span class="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span class="w-3 h-3 rounded-full bg-green-500/60" />
            <span class="ml-2 text-xs">terminal</span>
          </div>
          <pre class="text-sm leading-relaxed"><code>{`$ `}<span class="text-amber-400">perry publish ios</span>{`
  `}<span class="text-slate-500">{t('publish.buildingForIos', 'Building for iOS...')}</span>{`
  `}<span class="text-slate-500">{t('publish.signingCert', 'Signing with your certificate...')}</span>{`
  `}<span class="text-slate-500">{t('publish.verifyingLaunch', 'Verifying — app launches successfully')}</span>{`
  `}<span class="text-green-400">{t('publish.publishedToAppStore', 'Published to App Store Connect.')}</span></code></pre>
        </div>

        {/* Three feature cards */}
        <div class="grid sm:grid-cols-3 gap-6 mb-16">
          <div class="feature-card text-center">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 class="font-semibold text-white mb-1">{t('publish.buildSign', 'Build & Sign')}</h3>
            <p class="text-sm text-slate-500">{t('publish.buildSignPlatforms', 'macOS, iOS, Android, Windows, Linux')}</p>
          </div>
          <div class="feature-card text-center">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 class="font-semibold text-white mb-1">{t('publish.distribute', 'Distribute')}</h3>
            <p class="text-sm text-slate-500">{t('publish.distributePlatforms', 'App Store, Play Store, direct download')}</p>
          </div>
          <div class="feature-card text-center">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4 mx-auto">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 class="font-semibold text-white mb-1">{t('publish.verify', 'Verify')}</h3>
            <p class="text-sm text-slate-500">{t('publish.verifyDesc', 'AI-powered cross-platform testing')}</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a class="btn-primary inline-flex items-center justify-center gap-2" href="/pricing">{t('common.seePricing', 'See pricing')}</a>
          <a class="btn-secondary inline-flex items-center justify-center gap-2" href="/">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
            {t('common.backToHome', 'Back to home')}
          </a>
        </div>
      </div>
    </section>
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

// ── Privacy / Imprint (CMS richtext) ────────────────────────────────────

export const RichtextPage: FC<{
  title: string; bodyHtml: string; t: Translator; locales: string[]; path: string;
}> = ({ title, bodyHtml, t, locales, path }) => (
  <Layout title={`${title} · Perry`} site={site} t={t} locales={locales} pathForSwitcher={path}>
    <section class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-4xl sm:text-5xl font-bold mb-3"><span class="gradient-text">{title}</span></h1>
        {/* CMS-rendered TipTap HTML — already sanitized server-side */}
        <div class="cms-prose mt-12 text-slate-300 leading-relaxed">{raw(bodyHtml)}</div>
      </div>
    </section>
  </Layout>
);

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

// Per-competitor structured copy (CMS-driven via i18n.<locale>.compare.items.<slug>).
interface CompareTableRow { feature: string; perry: string; competitor: string }
interface CompareData {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  tldr?: string;
  competitorWhat?: string;
  perryWhat?: string;
  table?: CompareTableRow[];
  perryWins?: string[];
  competitorWins?: string[];
  whenPerry?: string | string[];
  whenCompetitor?: string | string[];
  verdict?: string;
}

function uiText(t: Translator, key: string, fallback: string, values: Record<string, string> = {}): string {
  const raw = t(`compare.ui.${key}`, fallback);
  return raw.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

function whenText(v: string | string[] | undefined): string {
  if (!v) return '';
  if (Array.isArray(v)) return v.join(' ');
  return v;
}

export const CompareItemPage: FC<{ item: CompareItem; t: Translator; locales: string[] }> = ({ item, t, locales }) => {
  const data = (t.raw<CompareData>(`compare.items.${item.slug}`) ?? {}) as CompareData;
  const title = data.title ?? `Perry vs ${item.competitor}`;
  const metaTitle = data.metaTitle ?? title;
  const metaDescription = data.metaDescription ?? `How Perry compares to ${item.competitor}.`;
  const table = data.table ?? [];
  const perryWins = data.perryWins ?? [];
  const competitorWins = data.competitorWins ?? [];
  const categoryLabel = t(`compare.ui.category.${item.category}`, item.category);

  return (
    <Layout title={`${metaTitle} · Perry`} description={metaDescription} site={site} t={t} locales={locales} pathForSwitcher={`/compare/${item.slug}`} ogImagePath={`/og/compare/${item.slug}.svg`}>
      <article class="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
          <a class="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8" href="/compare">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
            {uiText(t, 'backToCompare', 'Back to comparisons')}
          </a>

          <div class="flex flex-wrap gap-2 mb-4">
            <span class="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{categoryLabel}</span>
          </div>

          <h1 class="text-4xl sm:text-5xl font-bold mb-6">
            <span class="gradient-text">{title}</span>
          </h1>

          {data.tldr ? <p class="text-lg text-slate-300 leading-relaxed mb-12">{data.tldr}</p> : null}

          <time class="text-sm text-slate-500 block mb-12">
            {uiText(t, 'lastUpdated', 'Last updated')} {formatDate(item.updated, t.locale)}
          </time>

          {/* What is X / What is Perry */}
          {(data.competitorWhat || data.perryWhat) ? (
            <div class="grid md:grid-cols-2 gap-6 mb-16">
              {data.competitorWhat ? (
                <div class="feature-card">
                  <h2 class="text-lg font-semibold text-white mb-3">{uiText(t, 'whatIs', 'What is {name}?', { name: item.competitor })}</h2>
                  <p class="text-slate-400 text-sm leading-relaxed">{data.competitorWhat}</p>
                </div>
              ) : null}
              {data.perryWhat ? (
                <div class="feature-card">
                  <h2 class="text-lg font-semibold text-white mb-3">{uiText(t, 'whatIs', 'What is {name}?', { name: 'Perry' })}</h2>
                  <p class="text-slate-400 text-sm leading-relaxed">{data.perryWhat}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Side-by-side comparison table */}
          {table.length > 0 ? (
            <>
              <h2 class="text-2xl font-bold mb-6">{uiText(t, 'sideBySide', 'Side by side')}</h2>
              <div class="overflow-x-auto mb-16 border border-white/10 rounded-xl">
                <table class="w-full text-sm">
                  <thead class="bg-white/5">
                    <tr>
                      <th class="text-left px-4 py-3 font-semibold text-slate-300">{uiText(t, 'feature', 'Feature')}</th>
                      <th class="text-left px-4 py-3 font-semibold text-amber-300">Perry</th>
                      <th class="text-left px-4 py-3 font-semibold text-slate-300">{item.competitor}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row) => (
                      <tr class="border-t border-white/5">
                        <td class="px-4 py-3 text-slate-300 font-medium">{row.feature}</td>
                        <td class="px-4 py-3 text-slate-400">{row.perry}</td>
                        <td class="px-4 py-3 text-slate-400">{row.competitor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {/* Perry wins / Competitor wins */}
          {(perryWins.length > 0 || competitorWins.length > 0) ? (
            <div class="grid md:grid-cols-2 gap-6 mb-16">
              {perryWins.length > 0 ? (
                <div>
                  <h2 class="text-xl font-semibold text-amber-300 mb-4">{uiText(t, 'wherePerryWins', 'Where Perry wins')}</h2>
                  <ul class="space-y-2 text-slate-300 text-sm">
                    {perryWins.map((p) => (
                      <li class="flex gap-2"><span class="text-amber-400 mt-0.5">+</span><span>{p}</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {competitorWins.length > 0 ? (
                <div>
                  <h2 class="text-xl font-semibold text-slate-300 mb-4">{uiText(t, 'whereCompetitorWins', 'Where {name} wins', { name: item.competitor })}</h2>
                  <ul class="space-y-2 text-slate-300 text-sm">
                    {competitorWins.map((p) => (
                      <li class="flex gap-2"><span class="text-slate-500 mt-0.5">+</span><span>{p}</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* When to choose */}
          {(data.whenPerry || data.whenCompetitor) ? (
            <div class="grid md:grid-cols-2 gap-6 mb-16">
              {data.whenPerry ? (
                <div class="feature-card">
                  <h2 class="text-lg font-semibold text-white mb-3">{uiText(t, 'whenChoose', 'When to choose {name}', { name: 'Perry' })}</h2>
                  <p class="text-slate-400 text-sm leading-relaxed">{whenText(data.whenPerry)}</p>
                </div>
              ) : null}
              {data.whenCompetitor ? (
                <div class="feature-card">
                  <h2 class="text-lg font-semibold text-white mb-3">{uiText(t, 'whenChoose', 'When to choose {name}', { name: item.competitor })}</h2>
                  <p class="text-slate-400 text-sm leading-relaxed">{whenText(data.whenCompetitor)}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Verdict */}
          {data.verdict ? (
            <>
              <h2 class="text-2xl font-bold mb-4">{uiText(t, 'verdict', 'Verdict')}</h2>
              <p class="text-slate-300 leading-relaxed mb-12">{data.verdict}</p>
            </>
          ) : null}

          {/* CTA */}
          <div class="feature-card text-center">
            <h3 class="text-2xl font-bold mb-3 gradient-text">{uiText(t, 'ctaTitle', 'Try Perry')}</h3>
            <p class="text-slate-400 mb-6">{uiText(t, 'ctaSubtitle', 'Compile your TypeScript to native today.')}</p>
            <a class="btn-primary inline-block" href="/">{t('hero.getStarted', 'Get started')}</a>
          </div>
        </div>
      </article>
    </Layout>
  );
};
