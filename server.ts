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

function mimeTypeFromName(filePath: string): string {
  const name = filePath.split("/").pop() || "";
  if (name.includes("opengraph-image")) return "image/png";
  if (name.includes("apple-icon")) return "image/png";
  if (name.includes("icon")) return "image/png";
  return "application/octet-stream";
}

function sendFile(filePath: string, mime: string, reply: any) {
  reply.header("content-type", mime).send(fs.readFileSync(filePath, "utf-8"));
}

app.get("/*", async (req: any, reply: any) => {
  const urlPath = (req.url as string).split("?")[0];
  const relative = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  const base = outDir + "/" + relative;

  // Try directory index
  const indexPath = base + "/index.html";
  if (fs.existsSync(indexPath)) {
    sendFile(indexPath, "text/html; charset=utf-8", reply);
    return;
  }

  // Try exact file
  if (relative && fs.existsSync(base) && fs.statSync(base).isFile()) {
    let mime = mimeType(base);
    if (mime === "application/octet-stream") {
      mime = mimeTypeFromName(base);
    }
    sendFile(base, mime, reply);
    return;
  }

  // Try adding .html
  const htmlPath = base + ".html";
  if (fs.existsSync(htmlPath)) {
    sendFile(htmlPath, "text/html; charset=utf-8", reply);
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
