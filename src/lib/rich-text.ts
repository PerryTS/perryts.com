const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Renders translated strings that mark links with tags, e.g. "see <bunLink>Bun</bunLink>",
 * as safe HTML. Text is escaped; known tags become links, unknown tags keep only their text.
 */
export function richText(text: string, links: Record<string, string>): string {
  const parts = text.split(/(<(\w+)>[\s\S]*?<\/\2>)/g);
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(/^<(\w+)>([\s\S]*?)<\/\1>$/);
    if (match) {
      const href = links[match[1]];
      html += href ? `<a href="${escape(href)}">${escape(match[2])}</a>` : escape(match[2]);
      i++; // skip the captured tag name
    } else {
      html += escape(parts[i]);
    }
  }
  return html;
}

/** Plain text without tags, for titles and structured data. */
export function stripTags(text: string): string {
  return text.replace(/<\/?\w+>/g, "");
}
