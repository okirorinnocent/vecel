const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(request: Request, token: string, expectedAction: string) {
  const secret = Deno.env.get("TURNSTILE_SECRET");
  const expectedHostnames = new Set(
    (Deno.env.get("TURNSTILE_HOSTNAMES") ?? "")
      .split(",")
      .map(hostname => hostname.trim())
      .filter(Boolean)
  );
  if (!secret || !token || token.length > 2048 || expectedHostnames.size === 0) return false;

  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return false;
    const result = await response.json().catch(() => null);
    return Boolean(
      result?.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === "string" &&
      expectedHostnames.has(result.hostname)
    );
  } catch {
    return false;
  }
}
