import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SITE = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
if (!SITE) throw new Error("SITE_URL is required");
const ORIGIN = new URL(SITE).origin;
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...cors, "Content-Type": "application/json" } });
const validId = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const hashIp = async (request: Request) => {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${Deno.env.get("IP_HASH_SALT") ?? "missing"}:${ip}`));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
};
Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.headers.get("Origin") !== ORIGIN) return json({ error: "Origin not allowed." }, 403);
  if (request.method !== "POST" || Number(request.headers.get("content-length") ?? 0) > 8000) return json({ error: "Invalid request." }, 400);
  const body = await request.json().catch(() => null);
  if (!body || !validId(body.visitor_id) || !validId(body.session_id)) return json({ error: "Invalid analytics payload." }, 400);
  const ua = request.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|headless/i.test(ua)) return json({ ok: true });
  if (!(await db.rpc("consume_rate_limit", { p_key: `${await hashIp(request)}:track`, p_limit: 120, p_window_seconds: 3600 })).data) return json({ error: "Rate limited." }, 429);
  const allowedEvents = ["page_view","donate_click","volunteer_submit","subscribe"];
  if (!allowedEvents.includes(body.event) || typeof body.path !== "string" || body.path.length > 200) return json({ error: "Invalid event." }, 400);
  const visitor = { visitor_id: body.visitor_id, last_seen: new Date().toISOString(), country: (request.headers.get("cf-ipcountry") ?? "").slice(0, 8), device: String(body.device ?? "unknown").slice(0, 30), browser: String(body.browser ?? "unknown").slice(0, 30), os: String(body.os ?? "unknown").slice(0, 30), consent_version: String(body.consent_version ?? "1").slice(0, 20) };
  await db.from("analytics_visitors").upsert(visitor, { onConflict: "visitor_id" });
  await db.from("analytics_events").insert({ visitor_id: body.visitor_id, session_id: body.session_id, event: body.event, path: body.path, referrer_domain: typeof body.referrer_domain === "string" ? body.referrer_domain.slice(0, 120) : null, meta: { screen: String(body.screen ?? "").slice(0, 20), language: String(body.language ?? "").slice(0, 20) } });
  return json({ ok: true });
});
