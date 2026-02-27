import Fastify from "fastify";
import fs from "fs";

const app = Fastify();
const outDir = "./out";

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

app.get("/*", async (req: any, reply: any) => {
  const urlPath = req.url;
  const relative = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  const base = outDir + "/" + relative;

  // Try directory index
  const indexPath = base + "/index.html";
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, "utf-8");
    reply.header("content-type", "text/html; charset=utf-8").send(content);
    return;
  }

  // Try exact file (only if relative has a dot = has extension)
  if (relative.indexOf(".") !== -1 && fs.existsSync(base)) {
    const content = fs.readFileSync(base, "utf-8");
    const mime = mimeType(base);
    reply.header("content-type", mime).send(content);
    return;
  }

  // Try adding .html
  const htmlPath = base + ".html";
  if (fs.existsSync(htmlPath)) {
    const content = fs.readFileSync(htmlPath, "utf-8");
    reply.header("content-type", "text/html; charset=utf-8").send(content);
    return;
  }

  // 404
  const page404 = outDir + "/404.html";
  if (fs.existsSync(page404)) {
    const body = fs.readFileSync(page404, "utf-8");
    reply.status(404).header("content-type", "text/html; charset=utf-8").send(body);
  } else {
    reply.status(404).header("content-type", "text/html; charset=utf-8").send("<h1>404 Not Found</h1>");
  }
});

app.listen({ port: 3850, host: "0.0.0.0" });
console.log("perryts.com running on port 3850");
