/** @jsxImportSource hono/jsx */
// Perry-native customer site for perry.land. Hono + JSX (server-rendered),
// fetches from Skelpo CMS via @skelpo/cms-client, SEO via @skelpo/site-kit,
// locale-aware routing + translated chrome via i18n.<locale> settings.

import { Hono, type Context } from 'hono';
import { TrieRouter } from 'hono/router/trie-router';
import { cms, site } from './cms.js';
import { Home } from './routes/home.js';
import { BlogIndex, BlogPost, NotFound } from './routes/blog.js';
import { ShowcaseIndex, ShowcaseDetail, ShowcaseFeatureDetail } from './routes/showcase.js';
import {
  RoadmapPage, PricingPage, EnterprisePage, InternalsPage, PublishPage,
  NewsletterPage, RichtextPage, CompareIndex, CompareItemPage,
} from './routes/pages.js';
import { renderTipTap, renderMarkdown } from '@skelpo/site-kit';

// Body field is now markdown after the bulk conversion. Old TipTap-JSON
// rows (objects with type: 'doc') still render via renderTipTap, so the
// site stays correct even if some rows haven't migrated yet.
function renderBody(body: unknown): string {
  if (!body) return '';
  if (typeof body === 'string') return renderMarkdown(body);
  return renderTipTap(body as never);
}
import { makeT, getConfiguredLocales, localize } from './i18n.js';
import {
  sitemapXml,
  sitemapFromContent,
  robotsTxt,
  llmsTxt,
  rssXml,
} from '@skelpo/site-kit';

// TrieRouter handles overlapping literal+param routes (`/showcase/foo.svg`
// + `/showcase/:slug`) without the conflict that RegExpRouter rejects.
const app = new Hono({ router: new TrieRouter() });

// ── Static assets: built Tailwind CSS from public/ ───────────────────────
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
// Static serve from public/. Path-allowed only when it matches the safe
// patterns below — no traversal possible.
const MIME: Record<string, string> = {
  css: 'text/css; charset=utf-8', svg: 'image/svg+xml', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  ico: 'image/x-icon', json: 'application/json',
  webmanifest: 'application/manifest+json',
};
const SAFE_SEG = /^[a-zA-Z0-9._-]+$/;
const TOP_LEVEL_OK = new Set(['styles.css', 'favicon.ico', 'manifest.webmanifest']);
const PERRY_BRAND = new Set([
  'perry-icon.svg', 'perry-favicon.svg', 'perry-logo-horizontal-dark.svg', 'perry-social-banner.svg',
  'ralph-kuepper.jpg',
]);
const SHOWCASE_FILES = new Set([
  'mango-logo.svg', 'hone-icon.svg', 'dbmeter-icon.png',
  'hone-screenshot.png', 'mango-screenshot-1.png', 'mango-screenshot-2.png',
]);
const _cache = new Map<string, Buffer | string>();

app.get('/styles.css', staticHandler);
app.get('/favicon.ico', staticHandler);
for (const f of PERRY_BRAND) app.get(`/${f}`, staticHandler);
// Explicit per-file showcase asset routes (avoids `/showcase/*` wildcard
// conflicting with the `/showcase/:slug` detail route in RegExpRouter).
for (const f of SHOWCASE_FILES) app.get(`/showcase/${f}`, staticHandler);

async function staticHandler(c: Context): Promise<Response> {
  const url = new URL(c.req.url);
  const path = url.pathname; // e.g. "/showcase/pry/foo.svg"

  // Validate safe path: leading slash, no '..', every segment safe.
  const segs = path.slice(1).split('/');
  if (segs.length === 0 || segs.some((s) => !SAFE_SEG.test(s))) return c.notFound();

  // Permission check: top-level allow-list OR /showcase/* OR /perry-brand.svg
  const allowed =
    (segs.length === 1 && (TOP_LEVEL_OK.has(segs[0]!) || PERRY_BRAND.has(segs[0]!))) ||
    segs[0] === 'showcase';
  if (!allowed) return c.notFound();

  const ext = segs[segs.length - 1]!.split('.').pop()!.toLowerCase();
  const type = MIME[ext];
  if (!type) return c.notFound();

  let body = _cache.get(path);
  if (body === undefined) {
    try {
      const isText = type.startsWith('text/') || type.includes('svg') || type.includes('json');
      const abs = resolve(PUBLIC_DIR, segs.join('/'));
      if (!abs.startsWith(PUBLIC_DIR + '/') && abs !== PUBLIC_DIR) return c.notFound();
      body = isText ? await readFile(abs, 'utf8') : await readFile(abs);
      _cache.set(path, body);
    } catch {
      return c.notFound();
    }
  }
  return c.body(body as never, 200, {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=86400',
  });
}

// ── /manifest.webmanifest (composed inline, no file needed) ──────────────
app.get('/manifest.webmanifest', (c) => c.body(JSON.stringify({
  name: 'Perry', short_name: 'Perry', start_url: '/', display: 'standalone',
  background_color: '#0a0a0f', theme_color: '#0a0a0f',
  description: 'Native TypeScript compiler.',
  icons: [
    { src: '/perry-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/perry-favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
  ],
}), 200, { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' }));

// ── /og/blog/<slug>.svg — per-post OG banner composed from CMS data ─────
app.get('/og/blog/:filename', async (c) => {
  const filename = c.req.param('filename') ?? '';
  if (!filename.endsWith('.svg')) return c.notFound();
  const slug = filename.slice(0, -4);
  if (!/^[a-z0-9-]+$/.test(slug)) return c.notFound();
  let title = 'Perry';
  try {
    const { data } = await cms.content.bySlug('post', slug, { locale: 'en' });
    title = data.title;
  } catch { /* fall back to brand-only banner */ }
  return c.body(ogBannerSvg(title), 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600',
  });
});

// ── /og/home.svg — homepage OG banner ───────────────────────────────────
app.get('/og/home.svg', (c) =>
  c.body(ogBannerSvg('Native TypeScript. Standalone executables. No runtime.'), 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=86400',
  }),
);

// ── /og/compare/<slug>.svg — per-competitor OG banner ───────────────────
app.get('/og/compare/:filename', async (c) => {
  const filename = c.req.param('filename') ?? '';
  if (!filename.endsWith('.svg')) return c.notFound();
  const slug = filename.slice(0, -4);
  if (!/^[a-z0-9-]+$/.test(slug)) return c.notFound();
  let competitor = slug;
  try {
    const items = await cms.settings.get<{ slug: string; competitor: string }[]>('compare.items');
    competitor = items?.find((i) => i.slug === slug)?.competitor ?? slug;
  } catch { /* fall through */ }
  return c.body(ogBannerSvg(`Perry vs ${competitor}`), 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600',
  });
});

function ogBannerSvg(title: string): string {
  // Wrap title at ~26 chars per line, max 4 lines, ellipsize the rest.
  const lines: string[] = [];
  const words = title.split(/\s+/);
  let cur = '';
  for (const w of words) {
    if (lines.length === 3 && (cur + ' ' + w).length > 26) { cur = cur + '…'; break; }
    if ((cur + (cur ? ' ' : '') + w).length > 26) { lines.push(cur); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const titleY0 = 200;
  const lineH = 86;
  const tspans = lines.map((l, i) => `<tspan x="80" y="${titleY0 + i * lineH}">${esc(l)}</tspan>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1207"/>
      <stop offset="100%" stop-color="#0a0a0f"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="900" cy="120" r="280" fill="#f59e0b" opacity="0.08"/>
  <rect x="80" y="80" width="56" height="56" rx="14" fill="url(#accent)"/>
  <text x="156" y="120" fill="#f5f5f7" font-family="Rubik, Segoe UI, system-ui, sans-serif" font-size="36" font-weight="700">Perry</text>
  <text fill="#ffffff" font-family="Rubik, Segoe UI, system-ui, sans-serif" font-size="68" font-weight="700">
    ${tspans}
  </text>
  <rect x="80" y="520" width="80" height="4" rx="2" fill="url(#accent)"/>
  <text x="80" y="560" fill="#94a3b8" font-family="Rubik, Segoe UI, system-ui, sans-serif" font-size="22">Native TypeScript · Standalone executables · No runtime</text>
  <text x="80" y="595" fill="#64748b" font-family="Rubik, Segoe UI, system-ui, sans-serif" font-size="18">perry.land</text>
</svg>`;
}

declare module 'hono' {
  interface ContextVariableMap {
    locale: string;
  }
}

app.use('*', async (c, next) => {
  await next();
  c.header('X-Powered-By', 'Perry + Skelpo CMS');
  c.header('Content-Language', c.get('locale') ?? 'en');
});

// ── Maintenance gate ────────────────────────────────────────────────────
// When CMS settings flip `site.maintenance` on, all routes except the
// preview-cookie holders + health + static assets get a 503 with a
// "we'll be right back" page. Admins land here via a one-time link
// (?preview=<token>) which sets a session cookie + redirects.

import { getCookie, setCookie } from 'hono/cookie';

const PREVIEW_COOKIE = 'skelpoPreview';
// Maintenance state has to bypass the cms-client's auto-cache (which
// only invalidates on webhooks or local writes — toggling from the admin
// UI won't reach the customer site). We hit the CMS directly with a
// short 5 s TTL so toggle latency is bounded.
const CMS_URL = process.env.CMS_URL ?? 'http://127.0.0.1:3137';
let maintCache: { on: boolean; previewToken: string; until: number } = { on: false, previewToken: '', until: 0 };
async function maintenanceState(): Promise<{ on: boolean; previewToken: string }> {
  const now = Date.now();
  if (now < maintCache.until) return maintCache;
  try {
    const [mRes, tRes] = await Promise.all([
      fetch(`${CMS_URL}/api/v1/settings/site.maintenance`),
      fetch(`${CMS_URL}/api/v1/settings/site.previewToken`),
    ]);
    const m = await mRes.json() as { data?: Record<string, unknown> };
    const t = await tRes.json() as { data?: Record<string, unknown> };
    maintCache = {
      on: m.data?.['site.maintenance'] === true,
      previewToken: typeof t.data?.['site.previewToken'] === 'string' ? t.data['site.previewToken'] as string : '',
      until: now + 5000,
    };
  } catch {
    maintCache = { ...maintCache, until: now + 5000 };
  }
  return maintCache;
}

const MAINT_BYPASS_PREFIXES = ['/healthz', '/styles.css', '/favicon.ico', '/perry-', '/manifest.webmanifest', '/og/', '/showcase/'];
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  // 1. Preview token in query → set cookie, drop the param, redirect back.
  const previewParam = url.searchParams.get('preview');
  if (previewParam) {
    const { previewToken } = await maintenanceState();
    if (previewToken && previewParam === previewToken) {
      setCookie(c, PREVIEW_COOKIE, previewToken, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: c.req.url.startsWith('https://'),
        path: '/',
        maxAge: 60 * 60 * 24,    // 24 h
      });
      url.searchParams.delete('preview');
      return c.redirect(url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''), 302);
    }
    // Wrong token → fall through (still get the maintenance page if on).
  }

  // 2. Static-ish paths always serve (the maintenance page needs them).
  if (MAINT_BYPASS_PREFIXES.some((p) => path.startsWith(p))) return next();

  // 3. Check state. Cookie holders bypass.
  const { on, previewToken } = await maintenanceState();
  if (!on) return next();
  const cookie = getCookie(c, PREVIEW_COOKIE);
  if (cookie && previewToken && cookie === previewToken) return next();

  // 4. Serve maintenance page (503 + Retry-After hint).
  return c.html(await renderMaintenancePage(c), 503, {
    'Retry-After': '600',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
});

async function renderMaintenancePage(c: Context): Promise<string> {
  const [title, message] = await Promise.all([
    cms.settings.get<string>('site.maintenanceTitle').catch(() => "We'll be right back"),
    cms.settings.get<string>('site.maintenanceMessage').catch(() => "We're making some quick updates. Thanks for your patience."),
  ]);
  const safeTitle = (title || "We'll be right back").replace(/</g, '&lt;');
  const safeMsg = (message || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${safeTitle} · Perry</title>
<link rel="icon" type="image/svg+xml" href="/perry-favicon.svg">
<link rel="stylesheet" href="/styles.css">
<style>
  :root { color-scheme: dark; }
  body { background:#0a0a0f; color:#e5e7eb; margin:0; min-height:100vh;
         font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;
         display:flex;align-items:center;justify-content:center;padding:24px }
  .wrap { max-width:560px; text-align:center }
  .pulse { width:10px; height:10px; border-radius:999px; background:#f59e0b; display:inline-block;
           margin-right:8px; box-shadow:0 0 0 0 rgba(245,158,11,.4); animation:pulse 1.8s infinite; vertical-align:middle }
  @keyframes pulse { 70% { box-shadow:0 0 0 14px rgba(245,158,11,0) } 100% { box-shadow:0 0 0 0 rgba(245,158,11,0) } }
  .eyebrow { font-size:12px; text-transform:uppercase; letter-spacing:0.18em; color:#fbbf24; margin-bottom:18px }
  h1 { font-size:36px; line-height:1.1; margin:0 0 16px; font-weight:700;
       background:linear-gradient(90deg,#fbbf24,#f59e0b); -webkit-background-clip:text;
       background-clip:text; color:transparent }
  p { color:#9ca3af; margin:0 0 28px; font-size:18px }
  .logo { display:inline-flex; align-items:center; gap:10px; font-weight:700; color:#fff;
          font-size:18px; margin-bottom:48px; text-decoration:none }
  .logo img { width:28px; height:28px }
  footer { color:#52525b; font-size:12px; margin-top:48px }
</style>
</head><body>
<div class="wrap">
  <a class="logo" href="/"><img src="/perry-icon.svg" alt=""> Perry</a>
  <div class="eyebrow"><span class="pulse"></span>Maintenance</div>
  <h1>${safeTitle}</h1>
  <p>${safeMsg}</p>
  <footer>If this page persists, contact <a style="color:#fbbf24" href="mailto:support@skelpo.com">support@skelpo.com</a>.</footer>
</div>
</body></html>`;
}


// Locale resolver: strip /<locale>/ prefix → c.locale. Default 'en'.
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  const locales = await getConfiguredLocales();
  const m = url.pathname.match(/^\/([a-z]{2}(?:-[A-Za-z0-9]+)?)(\/|$)/);
  c.set('locale', m && locales.includes(m[1]!) ? m[1]! : 'en');
  await next();
});

async function uiCtx(c: Context) {
  const locale = c.get('locale');
  const [t, locales] = await Promise.all([makeT(locale), getConfiguredLocales()]);
  return { t, locales };
}

// ── Home ─────────────────────────────────────────────────────────────────
const home = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const { data } = await cms.content.list('post', { locale: t.locale, limit: 20, sort: '-publishedAt' });
  return c.html(<Home posts={data} t={t} locales={locales} />);
};
app.get('/', home);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}', home);

// ── Blog index ───────────────────────────────────────────────────────────
const blogIndex = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const { data } = await cms.content.list('post', { locale: t.locale, limit: 100, sort: '-publishedAt' });
  return c.html(<BlogIndex posts={data} t={t} locales={locales} />);
};
app.get('/blog', blogIndex);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/blog', blogIndex);

// ── Blog post (single) ───────────────────────────────────────────────────
// Try the active locale, then fall back to en when no translated row exists.
async function loadLocalizedContent(type: string, slug: string, locale: string) {
  try { return (await cms.content.bySlug(type, slug, { locale })).data; }
  catch {
    if (locale === 'en') return null;
    try { return (await cms.content.bySlug(type, slug, { locale: 'en' })).data; }
    catch { return null; }
  }
}

const blogPost = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const slug = c.req.param('slug');
  if (!slug) return c.html(<NotFound t={t} locales={locales} />, 404);
  const data = await loadLocalizedContent('post', slug, t.locale);
  if (!data) return c.html(<NotFound t={t} locales={locales} />, 404);
  return c.html(<BlogPost post={data} t={t} locales={locales} />);
};
app.get('/blog/:slug', blogPost);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/blog/:slug', blogPost);

// ── Showcase ─────────────────────────────────────────────────────────────
const showcaseIndex = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const { data } = await cms.content.list('showcase', { locale: t.locale, limit: 100 });
  return c.html(<ShowcaseIndex items={data} t={t} locales={locales} />);
};
app.get('/showcase', showcaseIndex);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/showcase', showcaseIndex);

const showcaseDetail = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const slug = c.req.param('slug');
  if (!slug) return c.html(<NotFound t={t} locales={locales} />, 404);
  const data = await loadLocalizedContent('showcase', slug, t.locale);
  if (!data) return c.html(<NotFound t={t} locales={locales} />, 404);
  const f = data.fields as { hasFeaturePage?: boolean; features?: unknown[] };
  const rich = f.hasFeaturePage === true && Array.isArray(f.features) && f.features.length > 0;
  return c.html(rich
    ? <ShowcaseFeatureDetail item={data} t={t} locales={locales} />
    : <ShowcaseDetail        item={data} t={t} locales={locales} />);
};
app.get('/showcase/:slug', showcaseDetail);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/showcase/:slug', showcaseDetail);

// ── Compare ──────────────────────────────────────────────────────────────
async function loadCompareItems(): Promise<{ slug: string; competitor: string; category: 'runtime'|'compiler'|'ui-framework'; updated: string }[]> {
  try {
    const v = await cms.settings.get<{ slug: string; competitor: string; category: 'runtime'|'compiler'|'ui-framework'; updated: string }[]>('compare.items');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
const compareIndex = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const items = await loadCompareItems();
  return c.html(<CompareIndex items={items} t={t} locales={locales} />);
};
app.get('/compare', compareIndex);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/compare', compareIndex);

const compareItem = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const slug = c.req.param('slug');
  const items = await loadCompareItems();
  const item = items.find((i) => i.slug === slug);
  if (!item) return c.html(<NotFound t={t} locales={locales} />, 404);
  return c.html(<CompareItemPage item={item} t={t} locales={locales} />);
};
app.get('/compare/:slug', compareItem);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/compare/:slug', compareItem);

// ── Roadmap (CMS-driven: singleton row with milestones repeater) ─────────
interface RoadmapMilestone { title: string; description: string; status: 'shipped'|'inProgress'|'planned'|'vision'; sortOrder?: number }
const roadmapPage = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const data = await loadLocalizedContent('roadmap', 'roadmap', t.locale);
  const fields = (data?.fields ?? {}) as { subtitle?: string; milestones?: RoadmapMilestone[] };
  const subtitle = fields.subtitle ?? t('roadmap.subtitle', '');
  const milestones = fields.milestones ?? [];
  return c.html(<RoadmapPage t={t} locales={locales} subtitle={subtitle} milestones={milestones} />);
};
app.get('/roadmap', roadmapPage);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/roadmap', roadmapPage);

// ── Pricing (CMS-driven: singleton row with tiers/compareRows/faqs) ─────
const pricingPage = async (c: Context) => {
  const { t, locales } = await uiCtx(c);
  const data = await loadLocalizedContent('pricing', 'pricing', t.locale);
  const fields = (data?.fields ?? {}) as import('./routes/pages.js').PricingData;
  return c.html(<PricingPage t={t} locales={locales} data={fields} />);
};
app.get('/pricing', pricingPage);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/pricing', pricingPage);

// ── Privacy + Imprint (CMS richtext page rows) ──────────────────────────
function richtextPageHandler(slug: 'privacy' | 'imprint', fallbackTitle: string) {
  return async (c: Context) => {
    const { t, locales } = await uiCtx(c);
    const data = await loadLocalizedContent('page', slug, t.locale);
    const body = (data?.fields as { body?: unknown } | undefined)?.body;
    const bodyHtml = body ? renderBody(body) : `<p>Page not yet available.</p>`;
    return c.html(<RichtextPage title={data?.title ?? fallbackTitle} bodyHtml={bodyHtml} t={t} locales={locales} path={`/${slug}`} />);
  };
}
app.get('/privacy', richtextPageHandler('privacy', 'Datenschutzerklärung'));
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/privacy', richtextPageHandler('privacy', 'Datenschutzerklärung'));
app.get('/imprint', richtextPageHandler('imprint', 'Impressum'));
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/imprint', richtextPageHandler('imprint', 'Impressum'));

// ── Static pages (message-driven) ────────────────────────────────────────
function pageHandler(Component: (p: { t: Awaited<ReturnType<typeof makeT>>; locales: string[] }) => unknown) {
  return async (c: Context) => {
    const { t, locales } = await uiCtx(c);
    return c.html(Component({ t, locales }) as never);
  };
}
const pages: [string, Parameters<typeof pageHandler>[0]][] = [
  ['/enterprise', EnterprisePage as Parameters<typeof pageHandler>[0]],
  ['/internals',  InternalsPage  as Parameters<typeof pageHandler>[0]],
  ['/publish',    PublishPage    as Parameters<typeof pageHandler>[0]],
  ['/newsletter', NewsletterPage as Parameters<typeof pageHandler>[0]],
];
for (const [path, comp] of pages) {
  app.get(path, pageHandler(comp));
  app.get(`/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}${path}`, pageHandler(comp));
}

// ── SEO routes (per locale) ──────────────────────────────────────────────
const sitemap = async (c: Context) => {
  const locale = c.get('locale');
  const { data } = await cms.content.list('post', { locale, limit: 1000 });
  const xml = sitemapXml(
    sitemapFromContent({ ...site, defaultLocale: locale }, data, { changefreq: 'weekly', priority: 0.7 }),
  );
  return c.body(xml.body, 200, { 'Content-Type': xml.contentType });
};
app.get('/sitemap.xml', sitemap);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/sitemap.xml', sitemap);

app.get('/robots.txt', (c) => {
  const r = robotsTxt(site);
  return c.body(r.body, 200, { 'Content-Type': r.contentType });
});

const llms = async (c: Context) => {
  const locale = c.get('locale');
  const { data } = await cms.content.list('post', { locale, limit: 1000 });
  const t = await makeT(locale);
  const intro = t('hero.subheadline', 'Native TypeScript. Standalone executables. No runtime.');
  const txt = llmsTxt(site, intro, [{ title: t('nav.blog', 'Blog'), items: data }]);
  return c.body(txt.body, 200, { 'Content-Type': txt.contentType });
};
app.get('/llms.txt', llms);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/llms.txt', llms);

const feed = async (c: Context) => {
  const locale = c.get('locale');
  const { data } = await cms.content.list('post', { locale, limit: 50 });
  const rss = rssXml(site, data, {
    title: `Perry Blog${locale === 'en' ? '' : ` (${locale})`}`,
    description: 'Engineering notes from the Perry compiler.',
    feedPath: localize('/feed.xml', locale),
  });
  return c.body(rss.body, 200, { 'Content-Type': rss.contentType });
};
app.get('/feed.xml', feed);
app.get('/:locale{[a-z]{2}(?:-[A-Za-z0-9]+)?}/feed.xml', feed);

// ── Health + 404 ─────────────────────────────────────────────────────────
app.get('/healthz', (c) => c.json({ status: 'ok' }));
app.notFound(async (c) => {
  const { t, locales } = await uiCtx(c);
  return c.html(<NotFound t={t} locales={locales} />, 404);
});
app.onError((err, c) => {
  console.error('[perry-landing] route error:', c.req.method, c.req.url);
  console.error(err instanceof Error ? err.stack : err);
  return c.text(`Internal error: ${err instanceof Error ? err.message : String(err)}`, 500);
});

// ── Boot ────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 4200);
const host = process.env.HOST ?? '127.0.0.1';
const bun = (globalThis as { Bun?: { serve: (o: { port: number; hostname: string; fetch: typeof app.fetch }) => unknown } }).Bun;
if (bun) {
  bun.serve({ port, hostname: host, fetch: app.fetch });
  console.log(`[perry-landing] listening at http://${host}:${port} (Bun/Perry)`);
} else {
  const { serve } = await import('@hono/node-server');
  serve({ port, hostname: host, fetch: app.fetch }, (info) => {
    console.log(`[perry-landing] listening at http://${info.address}:${info.port}`);
  });
}
