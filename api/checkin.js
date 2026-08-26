/**
 * api/checkin.js
 * ---------------
 * POST { id, name } -> records/overwrites a check-in for this Student ID.
 * GET  (with admin auth) -> returns one record per Student ID, using
 *                            the most recent check-in time for each.
 *
 * This file only runs on Vercel (serverless function). It does nothing
 * when the site is opened as plain static HTML (e.g. via a local
 * python http.server) - the front-end simply won't call it there.
 *
 * Storage: Upstash Redis, connected via the Vercel Marketplace
 * ("Storage" tab -> Add a Redis database). Vercel injects the
 * connection as either UPSTASH_REDIS_REST_URL/TOKEN or the legacy
 * KV_REST_API_URL/TOKEN names depending on how it was provisioned -
 * both are checked below so this works either way.
 *
 * Data model: a single Redis hash (checkins:byId) where each field is
 * a Student ID and each value is the JSON record for that student's
 * latest check-in. Checking in again with the same ID simply
 * overwrites that field - so /admin always shows one row per person.
 */

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const HASH_KEY = "checkins:byId";

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

      const cleanId = id.trim().toUpperCase();
      const record = {
        id: cleanId,
        name: name.trim(),
        at: new Date().toISOString(),
      };

      // hset on an existing field overwrites it - this is what gives
      // "one row per person, latest timestamp wins" in /admin.
      await redis.hset(HASH_KEY, { [cleanId]: JSON.stringify(record) });

      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error: " + (err && err.message ? err.message : String(err)) });
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
      const all = await redis.hgetall(HASH_KEY);
      const records = Object.values(all || {})
        .map((r) => {
          if (r && typeof r === "object") return r; // already deserialized
          try {
            return JSON.parse(r);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.at) - new Date(a.at));

      res.status(200).json({ ok: true, records });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Server error: " + (err && err.message ? err.message : String(err)) });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ ok: false, error: "Method not allowed." });
}
