# perryts.com

Landing site for [Perry](https://github.com/nicholasgasior/perry) — a TypeScript-to-native compiler built on Rust, SWC, and Cranelift.

## Stack

- **Next.js 16** with static export (`next build` → `out/`)
- **Tailwind CSS v4** for styling
- **Perry-compiled server** for production hosting

## How it's served

This site used to deploy on Vercel, but we kept hitting routing issues — sub-routes like `/blog/building-pry` would 404 on page reload because Vercel's static hosting couldn't resolve clean URLs properly despite various `vercel.json` rewrites.

So we dogfooded Perry instead.

`server.ts` is a ~90-line static file server written in TypeScript using Perry's native HTTP server API (FFI bindings to a Rust/hyper HTTP server). It handles:

- Static file serving from the `out/` directory
- Clean URL resolution (`/blog` → `out/blog/index.html`)
- Correct MIME types for all asset types
- 404 fallback page
- URL percent-decoding for Next.js data file paths

The server compiles to a **2 MB native binary** in under a second:

```
$ perry compile server.ts -o server
```

In production, nginx handles TLS termination and serves the static files directly (Perry can't cross-compile to Linux yet, so the binary runs on macOS for local dev). The full build pipeline:

```
npm run build:site    # next build → out/
npm run build:server  # perry compile server.ts → ./server
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
npm run serve         # starts Perry binary on port 3000
```

## Deployment

Static files are deployed to the server via rsync and served by nginx:

```bash
npm run build:site
rsync -avz --delete out/ root@webserver.skelpo.net:/var/www/perryts.com/out/
```
