import Fastify from "fastify";
import fs from "fs";
import path from "path";

const app = Fastify();
const outDir = path.resolve("./out");

function mimeType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  if (filePath.endsWith(".woff")) return "font/woff";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (filePath.endsWith(".xml")) return "application/xml";
  return "application/octet-stream";
}

function mimeTypeFromName(filePath: string): string {
  const name = filePath.split("/").pop() || "";
  if (name.includes("opengraph-image")) return "image/png";
  if (name.includes("apple-icon")) return "image/png";
  if (name.includes("icon")) return "image/png";
  return "application/octet-stream";
}

app.get("/*", async (req: any, reply: any) => {
  const urlPath = (req.url as string).split("?")[0];
  reply
    .header("x-content-type-options", "nosniff")
    .header("x-frame-options", "DENY")
    .header("referrer-policy", "strict-origin-when-cross-origin")
    .header("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (urlPath === "/") {
    reply.status(308).header("location", "/en/").send("");
    return;
  }
  let relative: string;
  try {
    relative = decodeURIComponent(urlPath).replace(/^\/+/, "");
  } catch {
    reply.status(400).send("Bad Request");
    return;
  }
  if (relative.includes("\0")) {
    reply.status(400).send("Bad Request");
    return;
  }

  const base = path.resolve(outDir, relative);
  if (base !== outDir && !base.startsWith(outDir + path.sep)) {
    reply.status(404).send("Not Found");
    return;
  }

  // Try directory index
  const indexPath = path.join(base, "index.html");
  if (fs.existsSync(indexPath)) {
    reply
      .header("content-type", "text/html; charset=utf-8")
      .send(fs.readFileSync(indexPath));
    return;
  }

  // Try exact file
  if (relative && fs.existsSync(base) && fs.statSync(base).isFile()) {
    let mime = mimeType(base);
    if (mime === "application/octet-stream") {
      mime = mimeTypeFromName(base);
    }
    reply
      .header("content-type", mime)
      .send(fs.readFileSync(base));
    return;
  }

  // Try adding .html
  const htmlPath = `${base}.html`;
  if (fs.existsSync(htmlPath)) {
    reply
      .header("content-type", "text/html; charset=utf-8")
      .send(fs.readFileSync(htmlPath));
    return;
  }

  // Redirect locale-less paths to the default locale (/showcase -> /en/showcase)
  const trimmed = relative.endsWith("/") ? relative.slice(0, -1) : relative;
  const englishIndex = path.resolve(outDir, "en", trimmed, "index.html");
  if (
    trimmed &&
    englishIndex.startsWith(outDir + path.sep) &&
    fs.existsSync(englishIndex)
  ) {
    reply.status(301).header("location", `/en/${trimmed}/`).send("");
    return;
  }

  // 404
  const page404 = path.join(outDir, "404.html");
  if (fs.existsSync(page404)) {
    const body = fs.readFileSync(page404, "utf-8");
    reply.status(404).header("content-type", "text/html; charset=utf-8").send(body);
  } else {
    reply.status(404).header("content-type", "text/html; charset=utf-8").send("<h1>404 Not Found</h1>");
  }
});

app.listen({ port: 3850, host: "0.0.0.0" });
console.log("perryts.com running on port 3850");
