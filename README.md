# perryts.com

Landing site for [Perry](https://github.com/PerryTS/perry) — a TypeScript-to-native compiler built with Rust, SWC, and LLVM.

## Stack

- **Next.js 16** with static export (`next build` → `out/`)
- **Tailwind CSS v4** for styling
- **Perry-compiled server** for production hosting

## How it's served

This site used to deploy on Vercel, but we kept hitting routing issues — sub-routes like `/blog/building-pry` would 404 on page reload because Vercel's static hosting couldn't resolve clean URLs properly despite various `vercel.json` rewrites.

So we dogfooded Perry instead.

`server.ts` is a small static file server written in TypeScript and compiled with Perry. It uses the Fastify-compatible native HTTP implementation and handles:

- Static file serving from the `out/` directory
- Clean URL resolution (`/blog` → `out/blog/index.html`)
- Correct MIME types for all asset types
- 404 fallback page
- URL percent-decoding for Next.js data file paths

The server compiles to a native binary. Exact size and compile time vary with the Perry version, host, and linked feature set:

```
$ npm run build:server
```

In production, the deployment script uploads the static export and TypeScript server, compiles `native-entry/server.ts` with Perry on the Linux host, and restarts the Perry service. A separate Node helper forwards newsletter subscriptions to Resend. It requires `RESEND_API_KEY` and `RESEND_AUDIENCE_ID`; `ALLOWED_ORIGINS` and `PORT` are optional. TLS and proxy configuration live outside this repository. The local build pipeline is:

```
npm run build:site    # next build → out/
npm run build:server  # compiles native-entry/server.ts → ./server
npm run serve         # runs the compiled binary
```

## Development

```bash
npm install
npm run dev           # next dev on localhost:3000
```

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
