// UI-string loader + t() helper. Messages are stored in Skelpo CMS as
// `i18n.<locale>` settings. We load once per locale (SDK auto-caches +
// webhook-invalidates), fall back to en for missing keys.

import { cms } from './cms.js';

export type MessageBag = Record<string, unknown>;

let configuredLocales: string[] | null = null;
const cache = new Map<string, MessageBag>();

export async function getConfiguredLocales(): Promise<string[]> {
  if (configuredLocales) return configuredLocales;
  try {
    const v = await cms.settings.get<string[]>('site.locales');
    configuredLocales = Array.isArray(v) && v.length > 0 ? v : ['en'];
  } catch {
    configuredLocales = ['en'];
  }
  return configuredLocales;
}

export async function loadMessages(locale: string): Promise<MessageBag> {
  const hit = cache.get(locale);
  if (hit) return hit;
  try {
    const v = await cms.settings.get<MessageBag>(`i18n.${locale}`);
    const bag = (v && typeof v === 'object' ? v : {}) as MessageBag;
    cache.set(locale, bag);
    return bag;
  } catch {
    cache.set(locale, {});
    return {};
  }
}

/** Drill a dot-path through nested message groups. */
function drill(bag: MessageBag, key: string): string | null {
  const parts = key.split('.');
  let cur: unknown = bag;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else return null;
  }
  return typeof cur === 'string' ? cur : null;
}

export interface Translator {
  (key: string, fallback?: string): string;
  locale: string;
}

/** Build a t() function bound to a locale, with en as fallback. */
export async function makeT(locale: string): Promise<Translator> {
  const [local, en] = await Promise.all([loadMessages(locale), loadMessages('en')]);
  const t = ((key: string, fallback?: string): string => {
    return drill(local, key) ?? drill(en, key) ?? fallback ?? key;
  }) as Translator;
  t.locale = locale;
  return t;
}

/** Strip a /:locale prefix from a path, returning [locale, restPath]. */
export function splitLocale(path: string, locales: string[]): { locale: string; rest: string } {
  const m = path.match(/^\/([a-z]{2}(?:-[A-Za-z0-9]+)?)(\/|$)/);
  if (m && locales.includes(m[1]!)) {
    return { locale: m[1]!, rest: path.slice(m[0]!.length - (m[2] === '/' ? 1 : 0)) || '/' };
  }
  return { locale: 'en', rest: path };
}

/** Build a locale-prefixed URL: localize('/blog', 'de') → '/de/blog'.
 *  en stays bare (no prefix). */
export function localize(path: string, locale: string): string {
  if (locale === 'en') return path;
  return `/${locale}${path === '/' ? '' : path}`;
}
