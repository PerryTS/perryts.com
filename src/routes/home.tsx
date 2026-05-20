/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import { Layout } from '../layout.js';
import { site } from '../cms.js';
import { type Translator } from '../i18n.js';
import { rich } from '../icu.js';
import type { ContentPublic } from '@skelpo/cms-client';

const PLATFORMS = [
  { name: 'macOS', icon: '🍎' }, { name: 'iOS', icon: '📱' }, { name: 'iPadOS', icon: '📲' },
  { name: 'watchOS', icon: '⌚' }, { name: 'tvOS', icon: '📺' }, { name: 'Android', icon: '🤖' },
  { name: 'Linux', icon: '🐧' }, { name: 'Windows', icon: '🪟' }, { name: 'Wasm', icon: '🌐' },
  { name: 'Web', icon: '💻' },
];
const FEATURE_KEYS = [
  'noRuntime', 'fastCompilation', 'smallBinaries', 'deterministicBuilds',
  'stdLib', 'v8Runtime', 'widgets', 'plugins', 'threading', 'i18n',
];

const SHIPPED_APPS: { name: string; tagline: string; href: string; external: boolean; iconSrc?: string; iconFallback?: string }[] = [
  { name: 'Mango',   tagline: 'Native MongoDB GUI. ~7 MB binary, <1s cold start.',     href: 'https://github.com/MangoQuery/app', external: true,  iconSrc: '/showcase/mango-logo.svg' },
  { name: 'Hone',    tagline: 'Native code editor with built-in terminal, Git, LSP, sync.', href: 'https://hone.codes',          external: true,  iconSrc: '/showcase/hone-icon.svg' },
  { name: 'dB Meter',tagline: 'Real-time decibel meter with 60 fps live waveform.',    href: 'https://dbmeter.app',              external: true,  iconSrc: '/showcase/dbmeter-icon.png' },
  { name: 'Pry',     tagline: 'Fast native JSON viewer — tree, search, keyboard shortcuts.', href: '/showcase/pry',              external: false, iconFallback: '{ }' },
];

const FEATURE_TABLE: { name: string; rows: { name: string; note: string }[] }[] = [
  { name: 'Core Language', rows: [
    { name: 'Numbers',  note: '64-bit floating point (f64)' },
    { name: 'Strings',  note: 'UTF-8, all common methods' },
    { name: 'Booleans', note: 'true/false, logical operators' },
    { name: 'Arrays',   note: 'Typed and mixed-type arrays' },
    { name: 'Objects',  note: 'Object literals and field access' },
    { name: 'BigInt',   note: '256-bit integer support' },
    { name: 'Enums',    note: 'Numeric and string enums' },
  ]},
  { name: 'Functions', rows: [
    { name: 'Function Declaration', note: 'Named functions' },
    { name: 'Arrow Functions',      note: '() => {} syntax' },
    { name: 'Default Parameters',   note: 'Parameters with defaults' },
    { name: 'Rest Parameters',      note: '...args syntax' },
    { name: 'Closures',             note: 'Including mutable captures' },
    { name: 'Higher-Order',         note: 'Functions as arguments/returns' },
    { name: 'Async/Await',          note: 'Async function support' },
  ]},
  { name: 'Classes', rows: [
    { name: 'Class Declaration',     note: 'Basic class syntax' },
    { name: 'Constructors',          note: 'With parameters' },
    { name: 'Private Fields (#)',    note: 'ES2022 #privateField syntax' },
    { name: 'Static Methods/Fields', note: 'Class-level members' },
    { name: 'Getters/Setters',       note: 'get/set accessors' },
    { name: 'Inheritance',           note: 'extends keyword' },
    { name: 'Super Calls',           note: 'super() constructor calls' },
  ]},
  { name: 'Type System', rows: [
    { name: 'Type Annotations', note: 'Explicit type declarations' },
    { name: 'Type Inference',   note: 'Automatic type detection' },
    { name: 'Generics',         note: 'Monomorphization (like Rust)' },
    { name: 'Interfaces',       note: 'Interface declarations' },
    { name: 'Union Types',      note: 'string | number support' },
    { name: 'Type Guards',      note: 'typeof operator' },
    { name: 'Type Aliases',     note: 'type X = ... declarations' },
  ]},
  { name: 'Standard Library', rows: [
    { name: 'fs',             note: 'readFileSync, writeFileSync, existsSync, etc.' },
    { name: 'path',           note: 'join, dirname, basename, extname, resolve' },
    { name: 'crypto',         note: 'randomBytes, randomUUID, sha256, md5' },
    { name: 'os',             note: 'platform, arch, hostname, memory info' },
    { name: 'Buffer',         note: 'from, alloc, toString, slice, copy' },
    { name: 'child_process',  note: 'execSync, spawnSync' },
    { name: 'JSON/Math/Date', note: 'Full implementations' },
  ]},
];

const NATIVE_LIBS: { key: string; pkgs: string[] }[] = [
  { key: 'database',       pkgs: ['mysql2', 'pg', 'mongodb', 'better-sqlite3', 'ioredis'] },
  { key: 'security',       pkgs: ['bcrypt', 'argon2', 'jsonwebtoken', 'crypto'] },
  { key: 'http',           pkgs: ['http', 'https', 'axios', 'node-fetch', 'ws', 'nodemailer'] },
  { key: 'dataProcessing', pkgs: ['cheerio', 'sharp', 'zlib', 'lodash'] },
  { key: 'dateTime',       pkgs: ['dayjs', 'moment', 'date-fns', 'node-cron'] },
  { key: 'utilities',      pkgs: ['uuid', 'nanoid', 'slugify', 'validator', 'dotenv', 'rate-limiter-flexible'] },
];

const PIPELINE_STAGES = [
  { label: 'TypeScript', subKey: 'tsFiles',     color: 'text-amber-400', tone: 'card' as const, icon: 'doc' },
  { label: 'SWC',        subKey: 'fastParsing', color: 'text-cyan-400',  tone: 'card' as const, label2: 'parser' },
  { label: 'HIR',        subKey: '',            color: 'text-purple-400',tone: 'card' as const, label2: 'transform', subLiteral: 'Monomorphization' },
  { label: 'LLVM',       subKey: 'machineCode', color: 'text-orange-400',tone: 'card' as const, label2: 'codegen' },
  { label: '',           subKey: 'binarySize',  color: 'text-white',     tone: 'gradient' as const, label2: 'executable', icon: 'check' },
];

const SectionHead: FC<{ eyebrow?: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <div class="max-w-3xl mx-auto text-center mb-14">
    {eyebrow ? <div class="text-xs uppercase tracking-[0.18em] font-semibold text-amber-400 mb-3">{raw(rich(eyebrow))}</div> : null}
    <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">{raw(rich(title))}</h2>
    {subtitle ? <p class="text-lg text-slate-400 leading-relaxed">{raw(rich(subtitle))}</p> : null}
  </div>
);

export const Home: FC<{
  posts: ContentPublic[];
  t: Translator;
  locales: string[];
}> = ({ posts, t, locales }) => (
  <Layout
    title={`Perry · ${t('hero.headline2', 'Native Performance.')}`}
    description={t('hero.subheadline', 'Native TypeScript. Standalone executables. No runtime.')}
    site={site} t={t} locales={locales} pathForSwitcher="/"
  >
    {/* ── Hero ───────────────────────────────────────────────── */}
    <section class="relative pt-28 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-amber-950/25 via-[#0a0a0f] to-[#0a0a0f] pointer-events-none" />
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/[0.08] rounded-full blur-3xl pointer-events-none" />
      <div class="relative max-w-7xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span class="text-sm text-amber-300">{raw(rich(t('hero.badge', '')))}</span>
        </div>
        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]">
          {raw(rich(t('hero.headline1', 'One codebase. Every platform.')))}<br />
          <span class="gradient-text">{raw(rich(t('hero.headline2', 'Native performance.')))}</span>
        </h1>
        <p class="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          {raw(rich(t('hero.subheadline', '')))}
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a href="#installation" class="btn-primary inline-flex items-center gap-2">
            {t('hero.getStarted', 'Get started')}
            <span aria-hidden="true">→</span>
          </a>
          <a href="https://github.com/PerryTS/perry" class="btn-secondary inline-flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
            {t('hero.viewOnGithub', 'View on GitHub')}
          </a>
        </div>

        {/* Terminal mock */}
        <div class="max-w-2xl mx-auto mb-16">
          <div class="code-block glow text-left">
            <div class="flex items-center gap-2 mb-4 text-slate-500">
              <span class="w-3 h-3 rounded-full bg-red-500/60" />
              <span class="w-3 h-3 rounded-full bg-yellow-500/60" />
              <span class="w-3 h-3 rounded-full bg-green-500/60" />
              <span class="ml-2 text-xs">terminal</span>
            </div>
            <pre class="text-slate-300 leading-relaxed text-sm"><code>{`$ `}<span class="text-cyan-400">perry</span>{` compile main.ts
`}<span class="text-slate-500">{t('hero.compiling', 'Compiling…')}</span>{`
`}<span class="text-green-400">{t('hero.compiled', 'Compiled in 0.4s → main (1.8 MB)')}</span>{`

$ ./main
Hello, World!`}</code></pre>
          </div>
        </div>

        {/* Stats */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <Stat value="10" label={t('hero.targetsLabel', 'targets')} />
          <Stat value="25+" label={t('hero.widgetsLabel', 'widgets')} />
          <Stat value="<50 ms" label={t('hero.startupLabel', 'cold start')} />
          <Stat value={t('hero.appStore', 'App Store')} label={t('hero.readyLabel', 'ready')} />
        </div>
      </div>
    </section>

    {/* ── ShippingInProduction ────────────────────────────────── */}
    <section class="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div class="text-xs uppercase tracking-[0.18em] text-amber-400/80 mb-2">{t('shipping.eyebrow', 'Shipping in production')}</div>
            <p class="text-lg text-slate-300">{t('shipping.subtitle', 'Real apps built with Perry, on the App Store and in the wild.')}</p>
          </div>
          <a href="/showcase" class="text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 self-start sm:self-end">
            {t('appShowcase.viewAll', 'View all')}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SHIPPED_APPS.map((a) => (
            <a class="block" href={a.href} {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              <div class="group h-full bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] rounded-xl p-5 transition-all duration-200">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {a.iconSrc
                      ? <img src={a.iconSrc} alt="" width="28" height="28" class="w-7 h-7 object-contain" />
                      : <span class="font-mono text-amber-400 text-sm font-semibold">{a.iconFallback}</span>}
                  </div>
                  <div class="font-semibold text-white">{a.name}</div>
                </div>
                <p class="text-sm text-slate-400 leading-snug">{a.tagline}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>

    {/* ── Features ───────────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('features.title', 'Built for production')} subtitle={t('features.subtitle', '')} />
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURE_KEYS.map((k) => (
            <div class="feature-card">
              <div class="flex items-start gap-3">
                <span class="text-amber-400 text-lg leading-none mt-0.5">●</span>
                <div class="text-slate-300 leading-relaxed">{raw(rich(t(`features.${k}`, k)))}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── AppShowcase ────────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('appShowcase.title', 'Real apps. Real platforms.')} subtitle={t('appShowcase.subtitle', '')} />
        <div class="space-y-16">
          {/* Mango */}
          <div class="feature-card !p-8">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <img src="/showcase/mango-logo.svg" alt="Mango" width="40" height="40" class="rounded-lg" />
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white">Mango</h3>
                <p class="text-slate-400">{t('appShowcase.mangoTagline', 'Native MongoDB GUI for Mac, Linux, and Windows.')}</p>
              </div>
              <div class="flex gap-2">
                {['macOS', 'Linux', 'Windows'].map((p) => (
                  <span class="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">{p}</span>
                ))}
              </div>
            </div>
            <div class="grid md:grid-cols-2 gap-6">
              <div class="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                <img src="/showcase/mango-screenshot-1.png" alt="Mango — document editor" width="1200" height="800" class="w-full h-auto" />
              </div>
              <div class="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                <img src="/showcase/mango-screenshot-2.png" alt="Mango — query explorer" width="1200" height="800" class="w-full h-auto" />
              </div>
            </div>
          </div>
          {/* Hone */}
          <div class="feature-card !p-8">
            <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <img src="/showcase/hone-icon.svg" alt="Hone" width="40" height="40" class="rounded-lg" />
              <div class="flex-1">
                <h3 class="text-2xl font-bold text-white">Hone</h3>
                <p class="text-slate-400">{t('appShowcase.honeTagline', 'Native AI-aware code editor with terminal, Git, and LSP.')}</p>
              </div>
              <div class="flex gap-2">
                {['macOS', 'iOS', 'Web'].map((p) => (
                  <span class="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">{p}</span>
                ))}
              </div>
            </div>
            <div class="rounded-xl overflow-hidden border border-white/5 shadow-2xl max-w-4xl mx-auto">
              <img src="/showcase/hone-screenshot.png" alt="Hone — native AI code editor" width="1200" height="800" class="w-full h-auto" />
            </div>
          </div>
        </div>
        <div class="text-center mt-12">
          <a class="btn-secondary inline-flex items-center gap-2" href="/showcase">
            {t('appShowcase.viewAll', 'View all')}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </a>
        </div>
      </div>
    </section>

    {/* ── Platforms ──────────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('platforms.title', 'Compiles to every platform')} subtitle={t('platforms.subtitle', '')} />
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PLATFORMS.map((p) => (
            <div class="feature-card text-center !p-5">
              <div class="text-3xl mb-2">{p.icon}</div>
              <div class="font-semibold text-white text-sm">{p.name}</div>
              <div class="text-xs text-amber-400/80 mt-1">{t('platforms.stable', 'Stable')}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── ShipIt ─────────────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('shipIt.title', 'Ship it everywhere')} subtitle={t('shipIt.subtitle', '')} />

        {/* Pipeline */}
        <div class="max-w-4xl mx-auto mb-16">
          <div class="relative">
            <div class="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20 hidden md:block" />
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-2">
              {[
                { label: 'perry compile', sub: t('shipIt.compileSign', 'Build + sign'),  color: 'text-amber-400', tone: 'card' as const },
                { label: 'perry publish', sub: t('shipIt.packageSubmit', 'Package + submit'), color: 'text-cyan-400',  tone: 'card' as const },
                { label: t('shipIt.storesDownloads', 'Stores + downloads'), sub: t('shipIt.storesList', 'App Store · Play · GitHub'), color: 'text-white', tone: 'gradient' as const },
                { label: 'perry verify', sub: t('shipIt.testEveryPlatform', 'Test every platform'), color: 'text-purple-400', tone: 'card' as const },
              ].map((s) => (
                <div class="relative flex flex-col items-center text-center">
                  <div class={`w-16 h-16 rounded-2xl flex items-center justify-center ${s.color} ${s.tone === 'gradient' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-slate-900 border border-slate-700'} z-10`}>
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span class="mt-3 text-sm font-medium text-slate-300">{s.label}</span>
                  <span class="text-xs text-slate-500">{s.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature trio */}
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(['buildSign', 'distribute', 'verify'] as const).map((k) => (
            <div class="feature-card">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400 mb-4">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 class="text-xl font-semibold text-white mb-2">{t(`shipIt.${k}.title`, k)}</h3>
              <p class="text-slate-400">{t(`shipIt.${k}.description`, '')}</p>
            </div>
          ))}
        </div>

        <p class="text-center mt-10 text-sm text-slate-500">
          {t('shipIt.freeForOpenSource', 'Free for open source.')}{' '}
          <a href="/publish" class="text-slate-400 hover:text-white transition-colors underline underline-offset-2">{t('shipIt.plansForTeams', 'Plans for teams')}</a>
          {' → /publish'}
        </p>
      </div>
    </section>

    {/* ── Comparison ─────────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead eyebrow={t('comparison.badge', 'Vs. the rest')} title={t('comparison.title', 'How Perry compares')} subtitle={t('comparison.subtitle', '')} />
        <div class="max-w-5xl mx-auto bg-[#15161c]/60 border border-white/10 rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-white/[0.03]">
                <tr class="text-xs uppercase tracking-wider text-slate-400">
                  <th class="text-left p-4 font-semibold">{t('comparison.framework', 'Framework')}</th>
                  <th class="text-left p-4 font-semibold">{t('comparison.language', 'Language')}</th>
                  <th class="text-left p-4 font-semibold">{t('comparison.nativeCode', 'Native code')}</th>
                  <th class="text-left p-4 font-semibold">{t('comparison.nativeWidgets', 'Widgets')}</th>
                  <th class="text-left p-4 font-semibold">{t('comparison.runtimeOverhead', 'Overhead')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr class="bg-amber-500/[0.03]">
                  <td class="p-4 font-bold text-white">Perry</td>
                  <td class="p-4 text-slate-300">TypeScript</td>
                  <td class="p-4"><span class="text-emerald-400">✓ {t('comparison.nativeCompiled', 'Native')}</span></td>
                  <td class="p-4"><span class="text-emerald-400">✓ {t('comparison.realPlatformWidgets', 'Platform widgets')}</span></td>
                  <td class="p-4"><span class="text-emerald-400">✓ {t('comparison.zeroRuntimeOverhead', 'Zero')}</span></td>
                </tr>
                <tr>
                  <td class="p-4 font-medium text-slate-200">React Native</td>
                  <td class="p-4 text-slate-400">JS / TS</td>
                  <td class="p-4 text-amber-400/90">JS bridge</td>
                  <td class="p-4 text-amber-400/90">{t('comparison.partial', 'Partial')}</td>
                  <td class="p-4 text-slate-400">JS engine + bridge</td>
                </tr>
                <tr>
                  <td class="p-4 font-medium text-slate-200">Flutter</td>
                  <td class="p-4 text-slate-400">Dart</td>
                  <td class="p-4 text-emerald-400">AOT</td>
                  <td class="p-4 text-amber-400/90">{t('comparison.noSharedUI', 'Skia rendering')}</td>
                  <td class="p-4 text-slate-400">Dart VM</td>
                </tr>
                <tr>
                  <td class="p-4 font-medium text-slate-200">Electron</td>
                  <td class="p-4 text-slate-400">JS / TS</td>
                  <td class="p-4 text-amber-400/90">Chromium runtime</td>
                  <td class="p-4 text-amber-400/90">HTML mimics</td>
                  <td class="p-4 text-slate-400">Chromium + Node</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    {/* ── CodeExample ────────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-slate-900/30">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('codeExample.title', 'Write TypeScript. Ship native.')} subtitle={t('codeExample.subtitle', '')} />
        <div class="max-w-4xl mx-auto">
          <div class="code-block">
            <div class="flex items-center gap-2 mb-4 text-slate-500">
              <span class="w-3 h-3 rounded-full bg-red-500/60" />
              <span class="w-3 h-3 rounded-full bg-yellow-500/60" />
              <span class="w-3 h-3 rounded-full bg-green-500/60" />
              <span class="ml-2 text-xs">hello.ts</span>
            </div>
            <pre class="text-sm leading-relaxed"><code class="text-slate-300">{`// hello.ts
`}<span class="text-purple-400">const</span>{` greeting `}<span class="text-purple-400">=</span>{` `}<span class="text-green-400">"Hello, World!"</span>{`;
console.`}<span class="text-cyan-400">log</span>{`(greeting);

`}<span class="text-slate-500">{`// Compiles to ~2MB native executable
// No runtime needed!`}</span></code></pre>
          </div>
          <div class="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div class="flex items-center gap-4">
              <div class="flex-1 font-mono text-sm">
                <span class="text-slate-500">$</span>{' '}
                <span class="text-cyan-400">perry</span>{' '}
                <span class="text-white">build</span>{' '}
                <span class="text-yellow-400">hello.ts</span>
              </div>
              <div class="text-green-400 text-sm inline-flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                {t('codeExample.nativeBinary', 'Native binary')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Performance ────────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('performance.title', 'Performance')} subtitle={t('performance.subtitle', '')} />
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <PerfCard label={t('performance.binarySize', 'Binary size')} value="1.8 MB" vs="Bun 96 MB · Node 110 MB" />
          <PerfCard label={t('performance.startupTime', 'Cold start')} value="<50 ms" vs="Bun ~200 ms · Node ~800 ms" />
          <PerfCard label={t('performance.runtimeDeps', 'Runtime deps')} value={t('performance.none', 'None')} vs="Bun + Node need runtimes" />
          <PerfCard label={t('performance.memoryOverhead', 'Memory')} value={t('performance.minimal', 'Minimal')} vs="Bun ~80 MB · Node ~120 MB" />
        </div>
      </div>
    </section>

    {/* ── Installation ───────────────────────────────────────── */}
    <section id="installation" class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('installation.title', 'Get Perry')} subtitle={t('installation.subtitle', 'One command per platform.')} />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <InstallCard title={t('installation.homebrew', 'Homebrew')} note={t('installation.homebrewNote', 'macOS & Linux')} cmd="brew install perry-ts/perry" />
          <InstallCard title={t('installation.apt', 'apt')}            note={t('installation.aptNote', 'Debian / Ubuntu')} cmd="apt-get install perry" />
          <InstallCard title={t('installation.windows', 'Windows')}    note={t('installation.windowsNote', 'Scoop bucket')} cmd="scoop install perry-ts/perry" />
        </div>
      </div>
    </section>

    {/* ── FeatureTable ───────────────────────────────────────── */}
    <section id="docs" class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('featureTable.title', 'TypeScript feature coverage')} subtitle={t('featureTable.subtitle', '')} />
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_TABLE.map((cat) => (
            <div class="feature-card">
              <h3 class="text-lg font-semibold mb-4 text-amber-400">{cat.name}</h3>
              <ul class="space-y-2">
                {cat.rows.map((r) => (
                  <li class="flex items-start gap-2 text-sm">
                    <span class="mt-0.5">
                      <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <div>
                      <span class="text-slate-300">{r.name}</span>
                      <span class="text-slate-500 text-xs block">{r.note}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div class="flex items-center justify-center gap-8 mt-8 text-sm text-slate-400">
          <div class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            {t('featureTable.fullSupport', 'Full support')}
          </div>
          <div class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('featureTable.partial', 'Partial')}
          </div>
        </div>
      </div>
    </section>

    {/* ── NativeLibraries ────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-slate-900/30">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('nativeLibs.title', 'Native libraries, batteries included')} subtitle={t('nativeLibs.subtitle', '')} />
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {NATIVE_LIBS.map((cat) => (
            <div class="feature-card">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center text-amber-400">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
                </div>
                <h3 class="text-lg font-semibold text-white">{t(`nativeLibs.${cat.key}`, cat.key)}</h3>
              </div>
              <div class="flex flex-wrap gap-2">
                {cat.pkgs.map((p) => (
                  <span class="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-sm text-slate-300">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div class="mt-12 text-center">
          <div class="inline-flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl px-6 py-4">
            <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span class="text-slate-300">{t('nativeLibs.info', 'Pure-TypeScript or Rust-native — no node-gyp, no shipping a runtime.')}</span>
          </div>
        </div>
      </div>
    </section>

    {/* ── Architecture ───────────────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('architecture.title', 'How Perry works')} subtitle={t('architecture.subtitle', '')} />
        <div class="max-w-4xl mx-auto">
          <div class="relative">
            <div class="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/50 to-amber-500/20 -translate-y-1/2 hidden md:block" />
            <div class="grid md:grid-cols-5 gap-6 md:gap-2">
              {PIPELINE_STAGES.map((s) => (
                <div class="relative flex flex-col items-center text-center">
                  <div class={`w-16 h-16 rounded-2xl flex items-center justify-center ${s.color} ${s.tone === 'gradient' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-slate-900 border border-slate-700'} z-10`}>
                    {s.icon === 'check'
                      ? <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                      : s.icon === 'doc'
                        ? <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        : <span class="text-lg font-bold">{s.label}</span>}
                  </div>
                  <span class="mt-3 text-sm font-medium text-slate-300">{s.label2 ? t(`architecture.${s.label2}`, s.label2) : s.label}</span>
                  <span class="text-xs text-slate-500">{s.subLiteral ?? (s.subKey ? t(`architecture.${s.subKey}`, '') : '')}</span>
                </div>
              ))}
            </div>
          </div>
          <p class="mt-12 text-center text-slate-400">
            {t('architecture.compilerInternalsPrompt', 'Want the deep dive?')}{' '}
            <a href="/internals" class="text-amber-400 hover:text-white transition-colors underline underline-offset-2">{t('architecture.compilerInternals', 'Compiler internals')}</a>
          </p>
        </div>
      </div>
    </section>

    {/* ── Latest from the blog ───────────────────────────────── */}
    <section class="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div class="max-w-7xl mx-auto">
        <SectionHead title={t('blog.title', 'Latest from the blog')} subtitle={`${posts.length} ${t('nav.blog', 'posts').toLowerCase()}`} />
        <ul class="max-w-3xl mx-auto divide-y divide-white/5">
          {posts.slice(0, 5).map((p) => (
            <li class="py-6 first:pt-0">
              <a class="block group" href={p.url ?? '#'}>
                <h3 class="text-xl font-semibold text-white group-hover:text-amber-300 transition-colors mb-1">{p.title}</h3>
                <div class="text-sm text-slate-500 mb-2">
                  <time datetime={p.publishedAt ?? ''}>{(p.publishedAt ?? '').slice(0, 10)}</time>
                </div>
                <p class="text-slate-400 leading-relaxed">{String(p.fields.excerpt ?? '').slice(0, 180)}…</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  </Layout>
);

const Stat: FC<{ value: string; label: string }> = ({ value, label }) => (
  <div class="text-center">
    <div class="text-3xl sm:text-4xl font-bold gradient-text">{value}</div>
    <div class="text-slate-500 text-sm mt-1.5">{label}</div>
  </div>
);

const PerfCard: FC<{ label: string; value: string; vs: string }> = ({ label, value, vs }) => (
  <div class="feature-card">
    <div class="text-xs uppercase tracking-wider text-slate-500 mb-2">{label}</div>
    <div class="text-2xl font-bold text-amber-300 mb-2">{value}</div>
    <div class="text-xs text-slate-500">{vs}</div>
  </div>
);

const InstallCard: FC<{ title: string; note: string; cmd: string }> = ({ title, note, cmd }) => (
  <div class="feature-card">
    <h4 class="text-white font-semibold mb-3">{title}</h4>
    <pre class="bg-[#0a0a0f] border border-white/10 rounded-lg p-3 text-sm font-mono text-slate-300 overflow-auto"><code>{cmd}</code></pre>
    <div class="text-xs text-slate-500 mt-2">{note}</div>
  </div>
);
