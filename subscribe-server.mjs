// Newsletter subscribe helper.
// Temporary Node service — replace with Perry-compiled handler once the
// runtime stays alive past main() (see Task #13).

import http from "node:http";

const PORT = Number(process.env.PORT || 3851);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 8 * 1024;

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function handleSubscribe(req, res) {
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
  const source = typeof body?.source === "string" ? body.source.slice(0, 64) : "";

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
    if (upstream.status === 409 || text.includes("already")) {
      json(res, 200, { ok: true, existed: true });
      return;
    }

    console.log(`[subscribe] resend ${upstream.status} source=${source}: ${text}`);
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
