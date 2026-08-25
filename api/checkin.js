/**
 * api/checkin.js
 * ---------------
 * POST { id, name } -> stores one check-in record in Vercel KV.
 * GET  (with admin auth) -> returns all recorded check-ins as JSON.
 *
 * This file only runs on Vercel (serverless function). It does nothing
 * when the site is opened as plain static HTML (e.g. via a local
 * python http.server) - the front-end simply won't call it there.
 */

import { kv } from "@vercel/kv";

const LIST_KEY = "checkins:list";

function checkAdminAuth(req) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const sepIndex = decoded.indexOf(":");
  const user = decoded.slice(0, sepIndex);
  const pass = decoded.slice(sepIndex + 1);

  const expectedUser = process.env.ADMIN_USER || "";
  const expectedPass = process.env.ADMIN_PASS || "";

  return user === expectedUser && pass === expectedPass && expectedUser !== "";
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { id, name } = req.body || {};

      if (!id || !name || typeof id !== "string" || typeof name !== "string") {
        res.status(400).json({ ok: false, error: "Missing id or name." });
        return;
      }

      const record = {
        id: id.trim().toUpperCase(),
        name: name.trim(),
        at: new Date().toISOString(),
      };

      await kv.rpush(LIST_KEY, JSON.stringify(record));

      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error." });
    }
    return;
  }

  if (req.method === "GET") {
    if (!checkAdminAuth(req)) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
      res.status(401).json({ ok: false, error: "Unauthorized." });
      return;
    }

    try {
      const raw = await kv.lrange(LIST_KEY, 0, -1);
      const records = raw.map((r) => {
        try {
          return JSON.parse(r);
        } catch {
          return null;
        }
      }).filter(Boolean);

      res.status(200).json({ ok: true, records });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error." });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ ok: false, error: "Method not allowed." });
}
