// Netlify Function: stores the portfolio content in Netlify Blobs.
//   GET  /api/content                 → public, returns { content, updatedAt }
//   POST /api/content?action=login    → checks the admin password
//   PUT  /api/content                 → saves new content (password required)
//   GET  /api/content?backup=1        → previous save (password required)
// The password comes from the ADMIN_PASSWORD environment variable in Netlify.
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const STORE = "portfolio";
const KEY = "content";
const BACKUP_KEY = "content-previous";
const MAX_BYTES = 512 * 1024;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkAuth(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return {
      ok: false,
      status: 500,
      error: "ADMIN_PASSWORD isn't set. Add it in Netlify → Site configuration → Environment variables, then redeploy.",
    };
  }
  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  if (timingSafeEqual(a, b)) return { ok: true };
  await sleep(700); // slow down password guessing
  return { ok: false, status: 401, error: "Wrong password." };
}

export default async (req) => {
  const store = getStore(STORE);
  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      if (url.searchParams.has("backup")) {
        const auth = await checkAuth(req);
        if (!auth.ok) return json({ error: auth.error }, auth.status);
        const prev = await store.get(BACKUP_KEY, { type: "json", consistency: "strong" });
        return json(prev || { content: null, updatedAt: null });
      }
      const current = await store.get(KEY, { type: "json", consistency: "strong" });
      return json(current || { content: null, updatedAt: null });
    }

    if (req.method === "POST" && url.searchParams.get("action") === "login") {
      const auth = await checkAuth(req);
      return auth.ok ? json({ ok: true }) : json({ error: auth.error }, auth.status);
    }

    if (req.method === "PUT") {
      const auth = await checkAuth(req);
      if (!auth.ok) return json({ error: auth.error }, auth.status);

      const raw = await req.text();
      if (raw.length > MAX_BYTES) return json({ error: "Content is too large." }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON." }, 400); }
      const content = body && body.content;
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        return json({ error: "Missing content object." }, 400);
      }

      const current = await store.get(KEY, { type: "json", consistency: "strong" });
      if (current) await store.setJSON(BACKUP_KEY, current);
      const record = { content, updatedAt: new Date().toISOString() };
      await store.setJSON(KEY, record);
      return json({ ok: true, updatedAt: record.updatedAt });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Storage error: " + (err && err.message ? err.message : "unknown") }, 500);
  }
};

export const config = { path: "/api/content" };
