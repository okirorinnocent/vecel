(() => {
  const VERSION = "1";
  const read = name => document.cookie.split("; ").find(x => x.startsWith(`${name}=`))?.split("=")[1] || "";
  const write = (name, value, maxAge) => { document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`; };
  const dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  const parse = () => { try { return JSON.parse(decodeURIComponent(read("jhie_consent"))); } catch { return null; } };
  const getDevice = () => /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "desktop";
  const getBrowser = () => /Edg/i.test(navigator.userAgent) ? "Edge" : /Chrome/i.test(navigator.userAgent) ? "Chrome" : /Firefox/i.test(navigator.userAgent) ? "Firefox" : /Safari/i.test(navigator.userAgent) ? "Safari" : "Other";
  const getOs = () => /Windows/i.test(navigator.userAgent) ? "Windows" : /Mac OS/i.test(navigator.userAgent) ? "macOS" : /Android/i.test(navigator.userAgent) ? "Android" : /iPhone|iPad/i.test(navigator.userAgent) ? "iOS" : /Linux/i.test(navigator.userAgent) ? "Linux" : "Other";
  const allowed = () => { const c = parse(); return c && c.analytics === true && !dnt; };
  const track = (event, meta = {}) => {
    if (!allowed() || !window.CFG) return;
    let visitor = read("jhie_vid"), session = sessionStorage.getItem("jhie_sid");
    if (!visitor) { visitor = crypto.randomUUID(); write("jhie_vid", visitor, 31536000); }
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem("jhie_sid", session); }
    let referrer = ""; try { referrer = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
    fetch(`${CFG.SUPA}/functions/v1/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitor_id: visitor, session_id: session, event, path: location.pathname.slice(0, 200), title: document.title.slice(0, 150), referrer_domain: referrer, screen: `${Math.min(screen.width, 1920)}x${Math.min(screen.height, 1920)}`, language: navigator.language, device: getDevice(), browser: getBrowser(), os: getOs(), consent_version: VERSION, ...meta }), keepalive: true }).catch(() => {});
  };
  window.jhieTrack = track;
  const setChoice = analytics => {
    write("jhie_consent", JSON.stringify({ version: VERSION, analytics }), 31536000);
    document.querySelector(".cookie-consent")?.remove();
    if (analytics) track("page_view");
  };
  const show = () => {
    if (parse()) return;
    const banner = document.createElement("aside");
    banner.className = "cookie-consent";
    banner.innerHTML = `<div><strong>Cookies and privacy</strong><p>We use essential cookies to keep the site working. With your permission, anonymous analytics help us improve the website. <a href="privacy.html">Privacy policy</a> · <a href="cookies.html">Cookie details</a></p></div><div class="cookie-actions"><button class="btn" data-consent="accept">Accept all</button><button class="btn btn-ghost" data-consent="reject">Reject non-essential</button><button class="text-link" data-consent="customize">Customize</button></div>`;
    document.body.appendChild(banner);
    banner.onclick = event => { const choice = event.target.dataset.consent; if (choice === "accept") setChoice(true); if (choice === "reject") setChoice(false); if (choice === "customize") { banner.querySelector(".cookie-actions").innerHTML = `<button class="btn" data-consent="save">Allow analytics</button><button class="btn btn-ghost" data-consent="reject">Essential only</button>`; } if (event.target.dataset.consent === "save") setChoice(true); };
  };
  window.jhieCookieSettings = () => { write("jhie_consent", "", 0); show(); };
  document.addEventListener("DOMContentLoaded", () => { show(); if (allowed()) track("page_view"); document.querySelector("#change-cookie-settings")?.addEventListener("click", () => window.jhieCookieSettings()); document.querySelectorAll('a[href="donate.html"]').forEach(a => a.addEventListener("click", () => track("donate_click"))); });
})();
