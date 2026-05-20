// Tiny renderer for the next-intl rich-text placeholder convention used
// in perry/landing's messages: `<platforms>foo</platforms>` → wrap with
// an HTML tag (we map to <span class="platforms">). Unknown tags are
// stripped to their inner text (safe degrade). Plain ICU `{var}` is
// substituted from the values map.
//
// Tag map is intentionally tiny — only what perry/landing actually uses.

const TAG_MAP: Record<string, string> = {
  // perry/landing uses these three:
  platforms: 'span class="platforms"',
  gradient:  'em class="accent"',
  brand:     'strong class="brand-inline"',
  // Common rich-text:
  strong: 'strong',
  em: 'em',
  code: 'code',
  highlight: 'span class="highlight"',
  badge: 'span class="badge-inline"',
};

function renderTags(s: string): string {
  return s.replace(
    /<([a-zA-Z][a-zA-Z0-9_-]*)>([\s\S]*?)<\/\1>/g,
    (_, tag: string, inner: string) => {
      const map = TAG_MAP[tag];
      const innerRendered = renderTags(inner);
      if (!map) return innerRendered;
      const closeTag = map.split(/\s/)[0]!;
      return `<${map}>${innerRendered}</${closeTag}>`;
    },
  );
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render an i18n message string for safe HTML output.
 * - escapes ALL text first (so user content can't inject markup)
 * - then re-activates the small set of allowed tag placeholders
 * - substitutes {var} from values
 */
export function rich(str: string, values: Record<string, string | number> = {}): string {
  if (!str) return '';
  let s = escapeText(str);
  // After escape: <platforms> is now &lt;platforms&gt;. Re-activate it.
  s = s.replace(
    /&lt;([a-zA-Z][a-zA-Z0-9_-]*)&gt;([\s\S]*?)&lt;\/\1&gt;/g,
    (_, tag: string, inner: string) => {
      const map = TAG_MAP[tag];
      if (!map) return inner;
      const closeTag = map.split(/\s/)[0]!;
      return `<${map}>${inner}</${closeTag}>`;
    },
  );
  // Then ICU vars.
  s = s.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in values ? escapeText(String(values[k])) : '',
  );
  return s;
}
