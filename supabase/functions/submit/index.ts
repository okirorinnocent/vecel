import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
if (!SITE) throw new Error("SITE_URL is required");
const ORIGIN = new URL(SITE).origin;
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const FROM = Deno.env.get("FROM_EMAIL") ?? "JS Health Initiative <updates@jshealthinitiative.com>";
const NOTIFY = Deno.env.get("ADMIN_EMAIL") ?? "jshealthinitiativeeastafrica@gmail.com";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const s = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim().slice(0, max);
const esc = (value: string) => value.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const okEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
const cleanName = (name: string) => name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let lastMailError = "";
const hashIp = async (request: Request) => {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${Deno.env.get("IP_HASH_SALT") ?? "missing"}:${ip}`));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
};
const limit = async (key: string, count: number, seconds: number) => {
  const result = await db.rpc("consume_rate_limit", { p_key: key, p_limit: count, p_window_seconds: seconds });
  if (result.error) throw result.error;
  return result.data !== false;
};
const branded = (heading: string, body: string) => `<div style="font-family:Arial,sans-serif;max-width:620px;color:#314642"><h2 style="color:#123f39">${esc(heading)}</h2>${body}<p>JS Health Initiative East Africa<br>Mbarara, Uganda</p></div>`;
async function mail(to: string, subject: string, html: string, kind: string, replyTo?: string, headers?: Record<string, string>) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { lastMailError = "RESEND_API_KEY is missing"; await db.from("email_log").insert({ to_email: to, subject, kind, ok: false, error: lastMailError }); return false; }
  try {
    const body: Record<string, unknown> = { from: FROM, to: [to], subject: subject.replace(/[\r\n]/g, " ").slice(0, 150), html };
    if (replyTo) body.reply_to = replyTo;
    if (headers) body.headers = headers;
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const error = response.ok ? null : await response.text();
    lastMailError = error ?? "";
    await db.from("email_log").insert({ to_email: to, subject: String(body.subject), kind, ok: response.ok, error });
    return response.ok;
  } catch (error) {
    lastMailError = String(error);
    await db.from("email_log").insert({ to_email: to, subject, kind, ok: false, error: lastMailError });
    return false;
  }
}
async function confirmationMail(to: string, subject: string, html: string, kind: string) {
  if (!(await limit(`email:${to}:confirmation`, 3, 86400))) {
    await db.from("email_log").insert({ to_email: to, subject, kind, ok: false, error: "Recipient confirmation-email limit reached" });
    return false;
  }
  return mail(to, subject, html, kind);
}
async function verifyTurnstile(request: Request, token: string) {
  const secret = Deno.env.get("TURNSTILE_SECRET");
  if (!secret || !token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  return response.ok && Boolean((await response.json()).success);
}
async function isAdmin(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const { data } = await db.auth.getUser(token ?? "");
  if (!data.user) return null;
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return admin ? data.user : null;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.headers.get("Origin") && request.headers.get("Origin") !== ORIGIN) return json({ error: "Origin not allowed." }, 403);
  if (request.method !== "POST" || Number(request.headers.get("content-length") ?? 0) > 20_000) return json({ error: "Invalid request." }, 400);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (JSON.stringify(body).length > 20_000) return json({ error: "Request is too large." }, 413);
  if (body.website) return json({ message: "Thank you!" });
  const type = s(body.type, 30);
  try {
    const adminTypes = type === "broadcast" || type === "process_broadcast";
    const user = adminTypes ? await isAdmin(request) : null;
    if (adminTypes && !user) return json({ error: "Not authorised." }, 401);
    if (!adminTypes && !(await limit(`${await hashIp(request)}:${type}`, type === "subscribe" || type === "confirm" || type === "unsubscribe" ? 20 : 10, 3600))) return json({ error: "Too many requests. Please try again later." }, 429);
    const needsTurnstile = type === "contact" || type === "volunteer" || type === "service_request" || type === "subscribe";
    if (needsTurnstile && !await verifyTurnstile(request, s(body["cf-turnstile-response"], 4096))) return json({ error: "Please complete the security check and try again." }, 400);
    if (type === "contact") {
      const name = s(body.name, 100), email = s(body.email, 254), message = s(body.message, 3000);
      if (!name || !message || !okEmail(email)) return json({ error: "Please fill in all fields with a valid email." }, 400);
      const { error } = await db.from("messages").insert({ name, email, message, status: "new" }); if (error) throw error;
      await confirmationMail(email, "Thank you for contacting JS Health Initiative", branded("Thank you for contacting us", "<p>We received your message and will reply soon.</p>"), "contact-confirmation");
      await mail(NOTIFY, `New message from ${cleanName(name)}`, branded(`New message from ${cleanName(name)}`, `<p><b>${esc(name)}</b> (${esc(email)})</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`), "contact-notification", email);
      return json({ message: "Thank you! We have received your message and will reply soon." });
    }
    if (type === "volunteer") {
      const name = s(body.name, 100), email = s(body.email, 254), phone = s(body.phone, 30), skills = s(body.skills, 3000);
      if (!name || !skills || !okEmail(email) || (phone && !/^[+()\d\s-]{7,30}$/.test(phone))) return json({ error: "Please fill in all required fields with valid contact details." }, 400);
      const { error } = await db.from("applications").insert({ name, email, phone: phone || null, skills, status: "new" }); if (error) throw error;
      await confirmationMail(email, "Thank you for volunteering", branded("Thank you for volunteering", "<p>We received your application and will be in touch.</p>"), "volunteer-confirmation");
      await mail(NOTIFY, `New volunteer: ${cleanName(name)}`, branded(`New volunteer: ${cleanName(name)}`, `<p><b>${esc(name)}</b> (${esc(email)}, ${esc(phone)})</p><p>${esc(skills).replace(/\n/g, "<br>")}</p>`), "volunteer-notification", email);
      return json({ message: "Thank you for volunteering! We will be in touch." });
    }
    if (type === "service_request") {
      const facilityName = s(body.facility_name, 160), district = s(body.district, 100), contactName = s(body.contact_name, 100), email = s(body.email, 254), phone = s(body.phone, 30), serviceType = s(body.service_type, 150), equipment = s(body.equipment, 300), message = s(body.message, 3000);
      if (!facilityName || !district || !contactName || !serviceType || !equipment || !message || !okEmail(email) || !/^[+()\d\s-]{7,30}$/.test(phone)) return json({ error: "Please fill in all required fields with valid contact details." }, 400);
      const { error } = await db.from("service_requests").insert({ facility_name: facilityName, district, contact_name: contactName, email, phone, service_type: serviceType, equipment, message, status: "new" }); if (error) throw error;
      await confirmationMail(email, "Thank you for your service request", branded("We received your service request", "<p>Thank you. Our team will review your request and contact you soon.</p>"), "service-request-confirmation");
      await mail(NOTIFY, `New service request: ${cleanName(facilityName)}`, branded(`New service request: ${cleanName(facilityName)}`, `<p><b>Facility:</b> ${esc(facilityName)}<br><b>District:</b> ${esc(district)}<br><b>Contact:</b> ${esc(contactName)} (${esc(email)}, ${esc(phone)})<br><b>Service:</b> ${esc(serviceType)}<br><b>Equipment:</b> ${esc(equipment)}</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`), "service-request-notification", email);
      return json({ message: "Thank you! We received your service request and will contact you soon." });
    }
    if (type === "subscribe") {
      const email = s(body.email, 254).toLowerCase(); if (!okEmail(email)) return json({ error: "Please enter a valid email address." }, 400);
      const { data: existing, error: lookupError } = await db.from("subscribers").select("active,confirmed_at").eq("email", email).maybeSingle(); if (lookupError) throw lookupError;
      if (existing?.active && existing.confirmed_at) return json({ message: "Please check your email to confirm your subscription." });
      const token = crypto.randomUUID(); const { error } = await db.from("subscribers").upsert({ email, active: false, confirm_token: token, confirmed_at: null, unsubscribed_at: null }, { onConflict: "email" }); if (error) throw error;
      await confirmationMail(email, "Confirm your JS Health Initiative updates", branded("Confirm your subscription", `<p>Please confirm that you want occasional updates from us.</p><p><a href="${SITE}/unsubscribe.html?confirm=${token}">Confirm subscription</a></p>`), "subscribe-confirmation");
      return json({ message: "Please check your email to confirm your subscription." });
    }
    if (type === "confirm") {
      const token = s(body.token, 64); const { data, error } = await db.from("subscribers").update({ active: true, confirmed_at: new Date().toISOString(), confirm_token: null }).eq("confirm_token", token).select("email").maybeSingle(); if (error) throw error;
      if (!data) return json({ error: "That confirmation link is invalid or has already been used." }, 400); return json({ message: "Your subscription is confirmed. Thank you!" });
    }
    if (type === "unsubscribe") {
      const token = s(body.token, 64); const { data, error } = await db.from("subscribers").update({ active: false, unsubscribed_at: new Date().toISOString() }).eq("unsubscribe_token", token).select("email").maybeSingle(); if (error) throw error;
      if (!data) return json({ error: "That unsubscribe link is invalid or has already been used." }, 400); return json({ message: "You have been unsubscribed." });
    }
    if (type === "broadcast") {
      const subject = s(body.subject, 150), message = s(body.message, 10000), idempotencyKey = s(body.idempotency_key, 100); if (!subject || !message || !idempotencyKey) return json({ error: "Subject, message and idempotency key are required." }, 400);
      const { data: broadcast, error } = await db.from("broadcasts").insert({ subject, body: message, idempotency_key: idempotencyKey, created_by: user!.id }).select().single(); if (error?.code === "23505") return json({ message: "This broadcast has already been queued." }); if (error) throw error;
      const { data: subscribers } = await db.from("subscribers").select("email,unsubscribe_token").eq("active", true); if (subscribers?.length) await db.from("broadcast_recipients").insert(subscribers.map(x => ({ broadcast_id: broadcast.id, email: x.email, token: x.unsubscribe_token, status: "pending" })));
      return json({ message: `Broadcast queued for ${subscribers?.length ?? 0} subscribers.`, broadcast_id: broadcast.id });
    }
    if (type === "process_broadcast") {
      const broadcastId = s(body.broadcast_id, 64); const { data: broadcast } = await db.from("broadcasts").select("*").eq("id", broadcastId).maybeSingle(); if (!broadcast) return json({ error: "Broadcast not found." }, 404);
      const { data: recipients, error: claimError } = await db.rpc("claim_broadcast_recipients", { p_broadcast_id: broadcastId, p_limit: 50 }); if (claimError) throw claimError;
      let sent = 0, failed = 0;
      for (const recipient of recipients ?? []) {
        const unsubscribe = `${SITE}/unsubscribe.html?unsub=${recipient.token}`;
        const ok = await mail(recipient.email, broadcast.subject, branded(broadcast.subject, `<p>${esc(broadcast.body).replace(/\n/g, "<br>")}</p><p><a href="${unsubscribe}">Unsubscribe</a></p>`), "broadcast", undefined, { "List-Unsubscribe": `<${unsubscribe}>` });
        await db.from("broadcast_recipients").update({ status: ok ? "sent" : "failed", error: ok ? null : (lastMailError || "Email delivery failed"), sent_at: ok ? new Date().toISOString() : null }).eq("id", recipient.id);
        ok ? sent++ : failed++; await sleep(100);
      }
      const { count: pending } = await db.from("broadcast_recipients").select("id", { count: "exact", head: true }).eq("broadcast_id", broadcastId).in("status", ["pending", "sending"]);
      await db.from("broadcasts").update({ status: pending ? "processing" : "completed", sent_count: broadcast.sent_count + sent, failed_count: broadcast.failed_count + failed, completed_at: pending ? null : new Date().toISOString() }).eq("id", broadcastId);
      return json({ message: `Processed ${sent + failed}; ${pending ?? 0} remaining.`, remaining: pending ?? 0 });
    }
    return json({ error: "Unknown request." }, 400);
  } catch (error) { console.error(error); return json({ error: "Something went wrong. Please try again." }, 500); }
});
