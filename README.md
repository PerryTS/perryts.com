# perryts.com

Landing site for [Perry](https://github.com/PerryTS/perry) — a JavaScript/TypeScript-to-native compiler built with Rust, SWC, and LLVM.

## Stack

- **Astro 7**, static output (`astro build` → `out/`), no client framework
- **Plain CSS** with design tokens in `src/styles/global.css`
- **13 locales** under prefixed URLs (`/en/`, `/es/`, …, `/zh-Hans/`); `/` redirects to `/en/`
- **Perry-compiled server** for production hosting

## How it's served

This site used to deploy on Vercel, but we kept hitting routing issues — sub-routes like `/blog/building-pry` would 404 on page reload because Vercel's static hosting couldn't resolve clean URLs properly despite various `vercel.json` rewrites.

So we dogfooded Perry instead.

`server.ts` is a small static file server written in TypeScript and compiled with Perry. It uses only `node:http`, `node:fs` and `node:path` (no npm dependencies) and handles:

- Static file serving from the `out/` directory
- Clean URL resolution (`/blog` → `out/blog/index.html`)
- Correct MIME types for all asset types
- 404 fallback page
- URL percent-decoding
- `/` → `/en/` and locale-less paths → `/en/...` redirects

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
npm run check         # astro check (types)
```

## Content

**Blog posts** live in `src/content/blog/<slug>/<locale>.md` (or `.mdx` when a post needs components). Every published post needs an English source and translations for all configured locales. During development, incomplete translations fall back to English with a notice; the beta deployment check requires complete coverage. Front matter:

```md
---
title: "Post title"
excerpt: "One or two sentences for the index and social cards."
date: 2026-10-26
tags: ["compiler", "milestone"]
---
```

Images and videos go in `public/blog/<slug>/` and are referenced as `/blog/<slug>/file.png`.

The published blog is translated into all 13 supported locales. Keep every post's
title, excerpt, and body in sync across those locale files, and use fenced blocks
for code examples. The homepage's latest-post list reads the same localized
collection as the blog index. After building, `npm run check:blog` checks complete
translation coverage, every article and index, language switches, canonical and
alternate URLs, sitemap entries, and local links/media. Beta deployment runs this
check before uploading.

**Page copy** lives in one JSON file per locale (`src/i18n/locales/<locale>.json`), grouped by page or section and read with `messages(lang)` (`src/i18n/messages.ts`). English is complete; any key a locale lacks falls back to English. `sitemap.xml` is generated after the build from every page whose canonical URL points at itself.

**Live figures** are read at build time, with committed fallbacks when the network fails:

- GitHub stars, forks, contributors and merged PRs: GitHub API (`src/lib/github.ts`).
- Benchmarks (table, headline wins, versions, machine, date): `benchmarks/results/public-node-bun-v1.json` in the Perry repo (`src/lib/perry-data.ts`, fallback `src/data/snapshots/benchmarks-snapshot.json`).
- Node 26 compatibility (passing / total tests, modules): `test-parity/node_suite_baseline.json` in the Perry repo (fallback `src/data/snapshots/node-parity-snapshot.json`).

Rebuilding the site picks up new numbers; refresh the snapshots occasionally so offline builds stay close.

## Production build

```bash
npm run build         # builds site + compiles server
npm run serve         # starts Perry binary on port 3850
```

## Deployment

### Beta

Beta runs at `https://beta.perryts.com/` on `webserver.skelpo.net`.
Nginx serves the Astro export from `/var/www/beta.perryts.com/current/out`.
Deploy the current checkout with `npm run deploy:beta`. Releases are stored in
`/var/www/beta.perryts.com/releases`; `current` is switched atomically, and older
releases are retained for rollback. This command requires the server setup below.

The [Check and deploy beta](.github/workflows/deploy-beta.yml) GitHub Actions
workflow runs type checks, builds the site, and verifies all blog translations on
every pull request. Pushes and merges to `main` automatically deploy beta after
those checks pass. It can also be run manually from the Actions tab on `main`.
Other branches only run the checks. Deployments are serialized, and failed server
health checks restore the previous release.

Actions connects as `perryts-beta-deploy`, using the repository secrets
`BETA_DEPLOY_SSH_KEY` and `BETA_DEPLOY_KNOWN_HOSTS`. The latter contains the server's
verified SSH host key; host verification is required. The dedicated account owns
the beta deployment directory and has passwordless sudo only for
`/usr/bin/systemctl restart perryts-beta-subscribe`. Its authorized key disables
SSH forwarding and PTYs. Production is deployed separately.

Local deployments default to the existing root SSH connection; set
`BETA_DEPLOY_SERVER=perryts-beta-deploy@webserver.skelpo.net` to use the CI account
with its key configured locally. CI uses `--skip-build` to upload the output it
already checked; blog verification still runs before upload. To rotate the CI
key, replace its entry in the account's `~/.ssh/authorized_keys` and update the
`BETA_DEPLOY_SSH_KEY` repository secret together.

The Nginx configuration is in `deploy/nginx-beta.conf`, installed at
`/etc/nginx/sites-available/beta.perryts.com` and linked from `sites-enabled`.
It uses the existing Certbot certificate, redirects `/` to `/en/`, handles clean
URLs, and excludes beta from indexing. Canonical URLs still point to production.

Newsletter requests use a separate `perryts-beta-subscribe` systemd service on
loopback port 3852 (`deploy/perryts-beta-subscribe.service`). It reads the existing
Resend credentials from `/etc/perryts.env`, followed by `/etc/perryts-beta.env`:

```dotenv
PORT=3852
ALLOWED_ORIGINS=https://beta.perryts.com
```

Beta signups use the same newsletter audience as production. No credentials are
stored in the repository. After installing the service and environment override,
run `systemctl daemon-reload` and `systemctl enable perryts-beta-subscribe`.
Validate Nginx with `nginx -t` before reloading it.

### Production

`deploy.sh` deploys the current production arrangement. It builds the static export, uploads it together with both server sources, compiles the Perry server remotely, restarts both services, and verifies the public homepage:

```bash
npm run deploy
```
