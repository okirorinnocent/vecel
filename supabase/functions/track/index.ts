import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const configuredSite = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const defaultOrigins = [
  "https://jshealthinitiative.com",
  "https://www.jshealthinitiative.com",
  "https://js-health-initiative-east-africa.vercel.app"
];
const origins = [...new Set([
  ...defaultOrigins,
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(value => value.trim()).filter(Boolean),
  ...(configuredSite ? [new URL(configuredSite).origin] : [])
])];
if (!configuredSite) console.warn("SITE_URL is not configured; using the known production origins.");
if (!Deno.env.get("IP_HASH_SALT")) console.warn("IP_HASH_SALT is not configured; using a process-local fallback for rate-limit hashing.");
const fallbackSalt = crypto.randomUUID();
const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && origins.includes(origin) ? origin : origins[0],
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin"
});
const json = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
const validId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const text = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim().slice(0, max);
const hashIp = async (request: Request) => {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const salt = Deno.env.get("IP_HASH_SALT") ?? fallbackSalt;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join("");
};
const device = (value: unknown) => text(value || "unknown", 30);

Deno.serve(async request => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (origin && !origins.includes(origin)) return json({ error: "Origin not allowed." }, 403, origin);
  if (request.method !== "POST" || Number(request.headers.get("content-length") ?? 0) > 8000) return json({ error: "Invalid request." }, 400, origin);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.event !== "string") return json({ error: "Invalid analytics payload." }, 400, origin);
  const userAgent = request.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|headless/i.test(userAgent)) return json({ ok: true }, 200, origin);
  try {
    const limited = await db.rpc("consume_rate_limit", { p_key: `${await hashIp(request)}:collect`, p_limit: 300, p_window_seconds: 3600 });
    if (!limited.error && limited.data === false) return json({ error: "Rate limited." }, 429, origin);
    if (limited.error) console.error("Analytics rate-limit RPC failed; recording event anyway.", limited.error);
    if (body.event === "consent") {
      const analytics = body.analytics === true;
      const { error } = await db.from("cookie_consents").insert({ visitor_id: analytics && validId(body.visitor_id) ? body.visitor_id : null, analytics, version: text(body.consent_version || "1", 20) });
      if (error) console.error("Could not record consent event.", error);
      return json({ ok: !error }, error ? 500 : 200, origin);
    }
    if (body.event === "anonymous_page_view") {
      if (body.visitor_id || body.session_id || typeof body.path !== "string" || body.path.length > 200) return json({ error: "Invalid anonymous payload." }, 400, origin);
      const { error } = await db.rpc("record_anonymous_page_view", { p_path: text(body.path, 200), p_country: text(request.headers.get("cf-ipcountry") || "unknown", 8), p_device: device(body.device) });
      if (error) console.error("Could not record anonymous daily page view.", error);
      return json({ ok: !error }, error ? 500 : 200, origin);
    }
    if (!validId(body.visitor_id) || !validId(body.session_id)) return json({ error: "Invalid analytics payload." }, 400, origin);
    const allowedEvents = ["page_view", "donate_click", "volunteer_submit", "subscribe", "form_submit"];
    if (!allowedEvents.includes(body.event) || typeof body.path !== "string" || body.path.length > 200) return json({ error: "Invalid event." }, 400, origin);
    const visitor = { visitor_id: body.visitor_id, last_seen: new Date().toISOString(), country: text(request.headers.get("cf-ipcountry") || "unknown", 8), device: device(body.device), browser: text(body.browser || "unknown", 30), os: text(body.os || "unknown", 30), consent_version: text(body.consent_version || "1", 20) };
    const visitorResult = await db.from("analytics_visitors").upsert(visitor, { onConflict: "visitor_id" });
    if (visitorResult.error) console.error("Could not upsert analytics visitor.", visitorResult.error);
    const eventResult = await db.from("analytics_events").insert({ visitor_id: body.visitor_id, session_id: body.session_id, event: body.event, path: text(body.path, 200), referrer_domain: typeof body.referrer_domain === "string" ? text(body.referrer_domain, 120) : null, meta: { screen: text(body.screen, 20), language: text(body.language, 20), title: text(body.title, 150) } });
    if (eventResult.error) console.error("Could not insert analytics event.", eventResult.error);
    return json({ ok: !visitorResult.error && !eventResult.error }, visitorResult.error || eventResult.error ? 500 : 200, origin);
  } catch (error) {
    console.error("Analytics collection failed.", error);
    return json({ ok: false }, 500, origin);
  }
});
