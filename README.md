# perryts.com

Landing site for [Perry](https://github.com/PerryTS/perry) — a TypeScript-to-native compiler built with Rust, SWC, and LLVM.

## Stack

- **Astro 7**, static output (`astro build` → `out/`), no client framework
- **Plain CSS** with design tokens in `src/styles/global.css` (mirrors the Pencil design system)
- **13 locales** under prefixed URLs (`/en/`, `/es/`, …, `/zh-Hans/`); `/` redirects to `/en/`
- **Perry-compiled server** for production hosting

## How it's served

This site used to deploy on Vercel, but we kept hitting routing issues — sub-routes like `/blog/building-pry` would 404 on page reload because Vercel's static hosting couldn't resolve clean URLs properly despite various `vercel.json` rewrites.

So we dogfooded Perry instead.

`server.ts` is a small static file server written in TypeScript and compiled with Perry. It uses the Fastify-compatible native HTTP implementation and handles:

- Static file serving from the `out/` directory
- Clean URL resolution (`/blog` → `out/blog/index.html`)
- Correct MIME types for all asset types
- 404 fallback page
- URL percent-decoding

The server compiles to a native binary. Exact size and compile time vary with the Perry version, host, and linked feature set:

```
$ npm run build:server
```

In production, the deployment script uploads the static export and TypeScript server, compiles `native-entry/server.ts` with Perry on the Linux host, and restarts the Perry service. A separate Node helper forwards newsletter subscriptions to Resend. It requires `RESEND_API_KEY` and `RESEND_AUDIENCE_ID`; `ALLOWED_ORIGINS` and `PORT` are optional. TLS and proxy configuration live outside this repository. The local build pipeline is:

```
npm run build:site    # astro build → out/
npm run build:server  # compiles native-entry/server.ts → ./server
npm run serve         # runs the compiled binary
```

## Development

```bash
npm install
npm run dev           # astro dev on localhost:4321
npm test              # logic tests (node --test)
npm run check         # astro check (types)
```

## Content

**Blog posts** live in `src/content/blog/<slug>/<locale>.md` (or `.mdx` when a post needs components). Every post needs `en.md`; other locales are optional and fall back to English with a notice. Front matter:

```md
---
title: "Post title"
excerpt: "One or two sentences for the index and social cards."
date: 2026-10-26
tags: ["compiler", "milestone"]
---
```

Images and videos go in `public/blog/<slug>/` and are referenced as `/blog/<slug>/file.png`.

**Page copy** lives next to the markup: each section or page has a `Copy` object keyed by locale (`src/i18n/index.ts`). English is required; missing locales fall back to English. `sitemap.xml` is generated after the build from every page whose canonical URL points at itself.

## Production build

```bash
npm run build         # builds site + compiles server
npm run serve         # starts Perry binary on port 3850
```

## Deployment

`deploy.sh` deploys the current production arrangement. It builds the static export, uploads it together with both server sources, compiles the Perry server remotely, restarts both services, and verifies the public homepage:

```bash
npm run deploy
```
