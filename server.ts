import fs from "fs";
import path from "path";
import crypto from "crypto"; // triggers stdlib linking for Perry native HTTP

// Perry native HTTP server API
declare function js_http_server_create(port: number): number;
declare function js_http_server_accept_v2(server: number): number;
declare function js_http_request_method(req: number): string;
declare function js_http_request_path(req: number): string;
declare function js_http_respond_with_headers(
  req: number,
  status: number,
  body: string,
  headersJson: string,
): boolean;
declare function js_http_respond_html(
  req: number,
  status: number,
  body: string,
): boolean;

const port = Number(process.env.PORT) || 3000;
const outDir = "./out";

function mimeType(ext: string): string {
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".woff2") return "font/woff2";
  if (ext === ".woff") return "font/woff";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".xml") return "application/xml";
  return "application/octet-stream";
}

function resolveFile(urlPath: string): string {
  const relative = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  const exact = path.join(outDir, relative);

  // Try as directory index first (most common for page routes)
  const indexPath = path.join(exact, "index.html");
  if (fs.existsSync(indexPath)) return indexPath;

  // Try exact file (static assets like .js, .css, .txt)
  const ext = path.extname(exact);
  if (ext !== "" && fs.existsSync(exact)) return exact;

  // Try adding .html (clean URLs without trailing slash)
  const htmlPath = exact + ".html";
  if (fs.existsSync(htmlPath)) return htmlPath;

  return "";
}

const server = js_http_server_create(port);
console.log(`perryts.com running on port ${port}`);

while (true) {
  const req = js_http_server_accept_v2(server);
  if (req < 0) break;

  let urlPath = js_http_request_path(req);

  // Decode percent-encoded characters (hyper doesn't decode them)
  while (urlPath.indexOf("%24") !== -1) {
    urlPath = urlPath.replace("%24", "$");
  }
  while (urlPath.indexOf("%20") !== -1) {
    urlPath = urlPath.replace("%20", " ");
  }

  const filePath = resolveFile(urlPath);

  if (filePath === "") {
    // 404
    const page404 = path.join(outDir, "404.html");
    if (fs.existsSync(page404)) {
      const body = fs.readFileSync(page404, "utf-8");
      js_http_respond_html(req, 404, body);
    } else {
      js_http_respond_html(req, 404, "<h1>404 Not Found</h1>");
    }
  } else {
    // Serve the file
    const content = fs.readFileSync(filePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();
    const mime = mimeType(ext);
    const headers = JSON.stringify({ "content-type": mime });
    js_http_respond_with_headers(req, 200, content, headers);
  }
}
