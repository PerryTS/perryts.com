/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { Layout } from '../layout.js';
import { site } from '../cms.js';
import { localize, type Translator } from '../i18n.js';
import type { ContentPublic } from '@skelpo/cms-client';

interface ShowcaseFields {
  tagline?: string;
  description?: string;
  platforms?: string[];
  tags?: string[];
  githubUrl?: string;
  logoUrl?: string;
  hasFeaturePage?: boolean;
  // Rich feature-page fields (optional — only used when hasFeaturePage)
  headline?: string;
  badge?: string;
  ctaPrimary?: string;
  ctaPrimaryUrl?: string;
  ctaSecondary?: string;
  ctaSecondaryUrl?: string;
  features?: { title: string; description: string }[];
  howItsBuilt?: { title: string; description: string }[];
  platformDetails?: { name: string; framework: string; status: string }[];
  gallery?: string[];
  galleryNote?: string;
  [k: string]: unknown;
}

const PageHead: FC<{ eyebrow?: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <div class="pt-20 pb-10 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-gradient-to-b from-amber-950/10 to-transparent">
    <div class="max-w-3xl mx-auto text-center">
      {eyebrow ? <div class="text-xs uppercase tracking-[0.18em] font-semibold text-amber-400 mb-3">{eyebrow}</div> : null}
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">{title}</h1>
      {subtitle ? <p class="text-lg text-slate-400">{subtitle}</p> : null}
    </div>
  </div>
);

export const ShowcaseIndex: FC<{
  items: ContentPublic<ShowcaseFields>[]; t: Translator; locales: string[];
}> = ({ items, t, locales }) => (
  <Layout
    title={`${t('showcase.title', 'Showcase')} · Perry`}
    description={t('showcase.subtitle', 'Native apps built with Perry.')}
    site={site} t={t} locales={locales} pathForSwitcher="/showcase"
  >
    <PageHead eyebrow={t('showcase.title', 'Showcase')} title={t('appShowcase.title', 'Built with Perry')} subtitle={t('showcase.subtitle', 'Real apps, real platforms, real binaries.')} />
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((p) => (
          <a class="feature-card group flex flex-col" href={p.url ?? `/showcase/${p.slug}`}>
            <div class="flex items-center gap-3 mb-3">
              {p.fields.logoUrl
                ? <img src={String(p.fields.logoUrl)} alt="" class="w-10 h-10 rounded-lg" width="40" height="40" />
                : <span class="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center text-amber-950 font-bold text-base">{p.title.charAt(0)}</span>}
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-white group-hover:text-amber-300 transition-colors truncate">{p.title}</h3>
                <div class="text-xs text-slate-500">{(p.fields.platforms ?? []).length} platforms</div>
              </div>
            </div>
            <p class="text-slate-400 mb-4 text-sm leading-relaxed flex-1">{p.fields.tagline}</p>
            <div class="flex flex-wrap gap-1.5 mt-auto">
              {(p.fields.tags ?? []).slice(0, 4).map((tag) => (
                <span class="text-[11px] bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  </Layout>
);

// Rich feature page — driven entirely by structured CMS fields. Used
// when the showcase row has `hasFeaturePage: true` and a populated
// `features` repeater. Falls through to <ShowcaseDetail> otherwise.
export const ShowcaseFeatureDetail: FC<{
  item: ContentPublic<ShowcaseFields>; t: Translator; locales: string[];
}> = ({ item, t, locales }) => {
  const f = item.fields;
  const features = f.features ?? [];
  const howItsBuilt = f.howItsBuilt ?? [];
  const platformDetails = f.platformDetails ?? [];
  const gallery = f.gallery ?? [];

  return (
    <Layout
      title={`${item.title} · ${t('showcase.title', 'Showcase')} · Perry`}
      content={item} site={site} t={t} locales={locales}
      pathForSwitcher={`/showcase/${item.slug}`}
    >
      {/* Hero */}
      <section class="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-[#0a0a0f] to-[#0a0a0f] pointer-events-none" />
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/[0.08] rounded-full blur-3xl pointer-events-none" />
        <div class="relative max-w-4xl mx-auto">
          <a href={localize('/showcase', t.locale)} class="text-sm text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 mb-6">
            ← {t('showcase.title', 'Showcase')}
          </a>
          {f.badge ? (
            <div class="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-5">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span class="text-xs text-amber-300 uppercase tracking-wider">{f.badge}</span>
            </div>
          ) : null}
          <div class="flex items-center gap-5 mb-5">
            {f.logoUrl
              ? <img src={f.logoUrl} alt="" class="w-16 h-16 rounded-2xl" width="64" height="64" />
              : <span class="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center text-amber-950 font-bold text-2xl">{item.title.charAt(0)}</span>}
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">{item.title}</h1>
          </div>
          {f.headline ? <p class="text-2xl text-slate-300 leading-snug mb-4 max-w-3xl">{f.headline}</p> : null}
          <p class="text-lg text-slate-400 leading-relaxed mb-8 max-w-3xl">{f.tagline ?? f.description}</p>

          {(f.ctaPrimaryUrl || f.ctaSecondaryUrl) ? (
            <div class="flex flex-col sm:flex-row gap-3">
              {f.ctaPrimaryUrl ? (
                <a class="btn-primary inline-flex items-center gap-2" href={f.ctaPrimaryUrl}
                   {...(/^https?:/.test(f.ctaPrimaryUrl) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {f.ctaPrimary ?? t('common.viewOnGithub', 'Open')} →
                </a>
              ) : null}
              {f.ctaSecondaryUrl ? (
                <a class="btn-secondary inline-flex items-center gap-2" href={f.ctaSecondaryUrl}
                   {...(/^https?:/.test(f.ctaSecondaryUrl) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {f.ctaSecondary ?? 'Learn more'}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Features */}
      {features.length > 0 ? (
        <section class="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-3xl font-bold text-white mb-10">{t('pry.features', 'Features')}</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feat) => (
                <div class="feature-card">
                  <h3 class="font-semibold text-white mb-2">{feat.title}</h3>
                  <p class="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How it's built */}
      {howItsBuilt.length > 0 ? (
        <section class="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div class="max-w-4xl mx-auto">
            <h2 class="text-3xl font-bold text-white mb-3">{t('pry.howItsBuilt', "How it's built")}</h2>
            <p class="text-slate-400 mb-10 max-w-2xl">{t('pry.howItsBuiltDesc', '')}</p>
            <div class="grid md:grid-cols-3 gap-5">
              {howItsBuilt.map((step, i) => (
                <div class="feature-card">
                  <div class="text-amber-400 text-xs uppercase tracking-wider font-semibold mb-2">Step {i + 1}</div>
                  <h3 class="font-semibold text-white mb-2">{step.title}</h3>
                  <p class="text-sm text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Platform support */}
      {platformDetails.length > 0 ? (
        <section class="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div class="max-w-4xl mx-auto">
            <h2 class="text-3xl font-bold text-white mb-10">{t('pry.platformSupport', 'Platform support')}</h2>
            <div class="grid md:grid-cols-3 gap-4">
              {platformDetails.map((p) => (
                <div class="feature-card text-center">
                  <h3 class="font-semibold text-white text-lg">{p.name}</h3>
                  <p class="text-xs text-slate-500 mt-1 mb-3">{p.framework}</p>
                  <span class="inline-block text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Screenshots */}
      {gallery.length > 0 || f.galleryNote ? (
        <section class="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div class="max-w-5xl mx-auto">
            <h2 class="text-3xl font-bold text-white mb-10">{t('pry.screenshots', 'Screenshots')}</h2>
            {gallery.length > 0 ? (
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                {gallery.map((src) => (
                  <div class="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                    <img src={src} alt="" class="w-full h-auto" loading="lazy" />
                  </div>
                ))}
              </div>
            ) : null}
            {f.galleryNote ? (
              <p class="text-center text-slate-500 text-sm mt-6">{f.galleryNote}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Tags + GitHub fallback */}
      <section class="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div class="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-6">
          {Array.isArray(f.tags) && f.tags.length > 0 ? (
            <div class="flex flex-wrap gap-1.5">
              {f.tags.map((tag) => (
                <span class="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          ) : <span />}
          {f.githubUrl && f.ctaPrimaryUrl !== f.githubUrl ? (
            <a class="text-sm text-slate-400 hover:text-white inline-flex items-center gap-2" href={f.githubUrl} target="_blank" rel="noopener noreferrer">
              {t('common.viewOnGithub', 'View on GitHub')} →
            </a>
          ) : null}
        </div>
      </section>
    </Layout>
  );
};

export const ShowcaseDetail: FC<{
  item: ContentPublic<ShowcaseFields>; t: Translator; locales: string[];
}> = ({ item, t, locales }) => (
  <Layout
    title={`${item.title} · ${t('showcase.title', 'Showcase')} · Perry`}
    content={item} site={site} t={t} locales={locales}
    pathForSwitcher={`/showcase/${item.slug}`}
  >
    <article class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="text-sm text-amber-400 mb-3">
        <a href={localize('/showcase', t.locale)} class="hover:text-amber-300">← {t('showcase.title', 'Showcase')}</a>
      </div>
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">{item.title}</h1>
      <p class="text-xl text-slate-400 mb-8 leading-relaxed">{item.fields.tagline}</p>
      <p class="text-slate-300 leading-relaxed mb-10">{item.fields.description}</p>

      <div class="mb-10">
        <h2 class="text-xs uppercase tracking-wider text-slate-500 mb-3">Platforms</h2>
        <div class="flex flex-wrap gap-2">
          {(item.fields.platforms ?? []).map((p) => (
            <span class="bg-white/5 border border-white/10 px-3 py-1.5 rounded-md text-sm text-slate-300">{p}</span>
          ))}
        </div>
      </div>

      {Array.isArray(item.fields.tags) && (item.fields.tags ?? []).length > 0 ? (
        <div class="mb-10">
          <h2 class="text-xs uppercase tracking-wider text-slate-500 mb-3">Tags</h2>
          <div class="flex flex-wrap gap-1.5">
            {(item.fields.tags ?? []).map((tag) => (
              <span class="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      ) : null}

      {item.fields.githubUrl ? (
        <a class="btn-primary inline-flex items-center gap-2" href={item.fields.githubUrl}>
          {t('common.viewOnGithub', 'View on GitHub')} →
        </a>
      ) : null}
    </article>
  </Layout>
);
