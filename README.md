# perryts.com — Perry-native rewrite

> **Branch `perry-native`.** Intended to eventually replace the Next.js
> implementation on `main`. Same site, different stack: Perry-compiled
> [Hono](https://hono.dev/) + JSX, served as a single native binary,
> content from [Skelpo CMS](https://github.com/skelpo/cms).

## Stack

| Layer            | What                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| Server           | [Hono](https://hono.dev/) (Node, Bun, or Perry-native)               |
| Templates        | Server-rendered JSX (`/** @jsxImportSource hono/jsx */`)             |
| Styles           | Tailwind v4 (`@tailwindcss/cli`)                                     |
| CMS              | [`@skelpo/cms-client`](https://www.npmjs.com/package/@skelpo/cms-client) → `http://127.0.0.1:3137` |
| SEO              | [`@skelpo/site-kit`](https://www.npmjs.com/package/@skelpo/site-kit) |
| i18n             | 13 locales (en, de, es, fr, it, pt, ja, ko, zh-Hans, id, th, tr, vi) |
| Build target     | Perry → single ~10 MB native binary (Node + Bun also supported)      |

## Routes

`/`, `/blog`, `/blog/<slug>`, `/showcase`, `/showcase/<slug>` (rich
template for projects with `hasFeaturePage`), `/compare`,
`/compare/<slug>`, `/roadmap`, `/pricing`, `/enterprise`, `/internals`,
`/publish`, `/newsletter`, `/privacy`, `/imprint`. All also work under
a locale prefix `/de/...`, `/ja/...`, etc.

SEO/agent routes: `/sitemap.xml`, `/robots.txt`, `/llms.txt`,
`/feed.xml`, `/og/blog/<slug>.svg` (composed per-post OG banner).
Static: `/styles.css`, `/favicon.ico`, `/manifest.webmanifest`,
`/perry-*.svg`, `/showcase/<asset>`.

## Run locally

```bash
# 1. Skelpo CMS must be running on :3137 (see github.com/skelpo/cms)

# 2. Install deps + build CSS
npm install
npm run build:css

# 3. Serve (pick one)
npm run dev          # tsx watch + auto-rebuild CSS
npm run start        # Node
npm run start:bun    # Bun
npm run build:perry && npm run start:perry   # Perry-compiled native binary
```

Defaults: site on `http://127.0.0.1:4200`, CMS on
`http://127.0.0.1:3137`. Override with `PORT`, `HOST`, `CMS_URL`.

## Why this exists

`main` is Next.js. It's fine. But Perry is a native-TypeScript compiler
and the canonical sample site should *use* it: server-rendered,
single-binary, no Node runtime in production, no JS shipped to the
browser by default. This branch proves it.

The CMS is its own product ([@skelpo/cms](https://github.com/skelpo/cms),
MIT) — this site is its first sample case.

## License

MIT (matches the rest of the Perry org).
