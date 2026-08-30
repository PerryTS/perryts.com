// Newsletter subscribe helper.
// Small Node service kept separate from the Perry-compiled static file server.
// Run it only when newsletter signup is enabled for a deployment.

import http from "node:http";

const PORT = Number(process.env.PORT || 3851);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "";
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "https://perryts.com,https://www.perryts.com")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 8 * 1024;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const rateBuckets = new Map();

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

async function handleSubscribe(req, res) {
  const origin = req.headers.origin || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    json(res, 403, { error: "forbidden_origin" });
    return;
  }

  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const client = forwarded || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  if (rateBuckets.size > 10_000) {
    for (const [key, times] of rateBuckets) {
      if (!times.some((time) => now - time < RATE_WINDOW_MS)) rateBuckets.delete(key);
    }
  }
  const recent = (rateBuckets.get(client) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    json(res, 429, { error: "rate_limited" });
    return;
  }
  recent.push(now);
  rateBuckets.set(client, recent);

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) {
      json(res, 413, { error: "too_large" });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    json(res, 400, { error: "invalid_json" });
    return;
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const source =
    typeof body?.source === "string"
      ? body.source.slice(0, 64).replace(/[^a-zA-Z0-9:_-]/g, "")
      : "";

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    json(res, 400, { error: "invalid_email" });
    return;
  }

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    json(res, 500, { error: "not_configured" });
    return;
  }

  try {
    const upstream = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );

    if (upstream.ok) {
      json(res, 200, { ok: true });
      return;
    }

    const text = await upstream.text();
    if (upstream.status === 409 || text.toLowerCase().includes("already")) {
      json(res, 200, { ok: true, existed: true });
      return;
    }

    console.log(`[subscribe] resend status=${upstream.status} source=${source}`);
    json(res, 502, { error: "upstream" });
  } catch (e) {
    console.log(`[subscribe] exception: ${e?.message || e}`);
    json(res, 500, { error: "internal" });
  }
}

const server = http.createServer((req, res) => {
  const url = (req.url || "").split("?")[0];

  if (req.method === "POST" && url === "/api/subscribe") {
    handleSubscribe(req, res).catch((e) => {
      console.log(`[subscribe] unhandled: ${e?.message || e}`);
      if (!res.headersSent) json(res, 500, { error: "internal" });
    });
    return;
  }

  if (req.method === "GET" && url === "/api/health") {
    json(res, 200, { ok: true });
    return;
  }

  json(res, 404, { error: "not_found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`perryts-subscribe listening on 127.0.0.1:${PORT}`);
});
