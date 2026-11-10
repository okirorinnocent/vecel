import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTurnstile } from "../_shared/turnstile.ts";

const SITE = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
if (!SITE) throw new Error("SITE_URL is required");
const ORIGIN = new URL(SITE).origin;
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const s = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim().slice(0, max);
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
const currencies = new Set(["USD", "EUR", "GBP", "UGX"]);
const maxAmount: Record<string, number> = { USD: 10000, EUR: 10000, GBP: 10000, UGX: 40000000 };
const equal = (a: string, b: string) => {
  const left = new TextEncoder().encode(a), right = new TextEncoder().encode(b);
  let result = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) result |= (left[i % (left.length || 1)] ?? 0) ^ (right[i % (right.length || 1)] ?? 0);
  return result === 0;
};
const hashIp = async (request: Request) => {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${Deno.env.get("IP_HASH_SALT") ?? "missing"}:${ip}`));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.headers.get("Origin") && request.headers.get("Origin") !== ORIGIN) return json({ error: "Origin not allowed." }, 403);
  const secret = Deno.env.get("FLW_SECRET_KEY");
  if (!secret) return json({ error: "Payment service is not configured." }, 500);
  if (request.headers.get("verif-hash")) {
    const expected = Deno.env.get("FLW_WEBHOOK_HASH") ?? Deno.env.get("FLW_SECRET_HASH") ?? "";
    if (!expected || !equal(request.headers.get("verif-hash")!, expected)) return json({ error: "Invalid webhook signature." }, 401);
    const payload = await request.json().catch(() => null);
    const transactionId = String(payload?.data?.id ?? "");
    if (!transactionId) return json({ error: "Invalid webhook payload." }, 400);
    const verification = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, { headers: { Authorization: `Bearer ${secret}` } });
    const verified = await verification.json();
    const data = verified?.data;
    if (!verification.ok || data?.status !== "successful" || !currencies.has(data.currency)) return json({ error: "Payment could not be verified." }, 400);
    const { data: donation } = await db.from("donations").select("id,amount,currency,status").eq("tx_ref", data.tx_ref).maybeSingle();
    if (!donation) return json({ error: "Donation reference not found." }, 404);
    if (Number(donation.amount) !== Number(data.amount) || donation.currency !== data.currency) return json({ error: "Payment amount or currency mismatch." }, 400);
    if (donation.status !== "succeeded") await db.from("donations").update({ status: "succeeded", transaction_id: transactionId, provider: "flutterwave" }).eq("id", donation.id);
    return json({ ok: true });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const body = await request.json().catch(() => null);
  if (!await verifyTurnstile(request, String(body?.turnstile_token ?? ""), "donate")) return json({ error: "Please complete the security check and try again." }, 400);
  const amount = Number(body?.amount), currency = s(body?.currency, 3), name = s(body?.name, 100), email = s(body?.email, 254).toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0 || !currencies.has(currency) || amount > maxAmount[currency] || !name || !validEmail(email)) return json({ error: "Enter a valid donation amount, currency, name and email." }, 400);
  const rate = await db.rpc("consume_rate_limit", { p_key: `donate:${await hashIp(request)}`, p_limit: 5, p_window_seconds: 3600 });
  if (rate.error) return json({ error: "Donations are temporarily unavailable. Please try again later." }, 503);
  if (rate.data !== true) return json({ error: "Too many donation attempts. Please try again later." }, 429);
  const txRef = `jhie-${crypto.randomUUID()}`;
  const { error: insertError } = await db.from("donations").insert({ name, email, amount, currency, status: "pending", tx_ref: txRef });
  if (insertError) return json({ error: "Could not start the donation." }, 500);
  const payment = { tx_ref: txRef, amount, currency, redirect_url: `${SITE}/donate.html?status=completed`, payment_options: currency === "UGX" ? "card,mobilemoneyuganda" : "card", customer: { name, email }, customizations: { title: "JS Health Initiative East Africa", description: "Support our work in Western Uganda." } };
  const response = await fetch("https://api.flutterwave.com/v3/payments", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify(payment) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status !== "success" || !result.data?.link) { await db.from("donations").update({ status: "failed" }).eq("tx_ref", txRef); return json({ error: "The payment service could not start this donation." }, 502); }
  return json({ link: result.data.link, tx_ref: txRef });
});
