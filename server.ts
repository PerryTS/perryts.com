// Static file server for the Astro build in ./out (compiled with Perry, see deploy.sh).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("./out");

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json",
};

const isFile = (p: string) => fs.existsSync(p) && fs.statSync(p).isFile();

http
  .createServer((req, res) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
    res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");

    const send = (status: number, type: string, body: string | Buffer = "") => {
      res.writeHead(status, { "content-type": type });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    const redirect = (status: number, location: string) => {
      res.writeHead(status, { location });
      res.end();
    };

    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "text/plain; charset=utf-8", "Method Not Allowed");

    const urlPath = (req.url ?? "/").split("?")[0];
    if (urlPath === "/") return redirect(308, "/en/");

    let relative: string;
    try {
      relative = decodeURIComponent(urlPath).replace(/^\/+/, "");
    } catch {
      return send(400, "text/plain; charset=utf-8", "Bad Request");
    }
    if (relative.includes("\0")) return send(400, "text/plain; charset=utf-8", "Bad Request");
    const base = path.resolve(outDir, relative);
    if (base !== outDir && !base.startsWith(outDir + path.sep)) return send(404, "text/plain; charset=utf-8", "Not Found");

    const file = [path.join(base, "index.html"), base, `${base}.html`].find(isFile);
    if (file) return send(200, types[path.extname(file)] ?? "application/octet-stream", fs.readFileSync(file));

    // Locale-less paths go to English when that page exists (/showcase -> /en/showcase/).
    const trimmed = relative.replace(/\/$/, "");
    if (trimmed && isFile(path.join(outDir, "en", trimmed, "index.html"))) return redirect(301, `/en/${trimmed}/`);

    send(404, "text/html; charset=utf-8", fs.readFileSync(path.join(outDir, "404.html")));
  })
  .listen(3850, "0.0.0.0", () => console.log("perryts.com running on port 3850"));
