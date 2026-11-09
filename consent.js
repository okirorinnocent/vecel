(() => {
  const VERSION = "1";
  const debug = new URLSearchParams(location.search).get("analytics_debug") === "1";
  const isAdmin = /^\/admin(?:\.html)?\/?$/i.test(location.pathname) || /(^|\/)admin\.html$/i.test(location.pathname);
  const read = name => document.cookie.split("; ").find(item => item.startsWith(`${name}=`))?.split("=")[1] || "";
  const write = (name, value, maxAge) => { document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`; };
  const dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  const parse = () => { try { return JSON.parse(decodeURIComponent(read("jhie_consent"))); } catch { return null; } };
  const getDevice = () => /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
  const getBrowser = () => /Edg/i.test(navigator.userAgent) ? "Edge" : /Firefox/i.test(navigator.userAgent) ? "Firefox" : /Chrome/i.test(navigator.userAgent) ? "Chrome" : /Safari/i.test(navigator.userAgent) ? "Safari" : "Other";
  const getOs = () => /Windows/i.test(navigator.userAgent) ? "Windows" : /Mac OS/i.test(navigator.userAgent) ? "macOS" : /Android/i.test(navigator.userAgent) ? "Android" : /iPhone|iPad/i.test(navigator.userAgent) ? "iOS" : /Linux/i.test(navigator.userAgent) ? "Linux" : "Other";
  const allowed = () => { const choice = parse(); return Boolean(choice?.analytics && !dnt); };
  const endpoint = () => `${CFG.SUPA}/functions/v1/collect`;
  const request = async payload => {
    if (!window.CFG) return;
    const body = JSON.stringify(payload);
    if (debug) console.info("[analytics] request", endpoint(), payload);
    let response;
    try {
      response = await fetch(endpoint(), { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
      if (debug) console.info("[analytics] response", response.status);
      if (!response.ok && response.status >= 400) {
        const fallback = `${CFG.SUPA}/functions/v1/track`;
        response = await fetch(fallback, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
        if (debug) console.info("[analytics] fallback response", fallback, response.status);
      }
    } catch (error) {
      if (debug) console.warn("[analytics] request failed", error);
    }
  };
  const identifier = () => {
    let visitor = read("jhie_vid");
    if (!visitor) { visitor = crypto.randomUUID(); write("jhie_vid", visitor, 31536000); }
    let session = sessionStorage.getItem("jhie_sid");
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem("jhie_sid", session); }
    return { visitor, session };
  };
  const track = (event, meta = {}) => {
    if (isAdmin || !allowed() || !window.CFG) return;
    const { visitor, session } = identifier();
    let referrer = "";
    try { referrer = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
    request({ visitor_id: visitor, session_id: session, event, path: location.pathname.slice(0, 200), title: document.title.slice(0, 150), referrer_domain: referrer, screen: `${Math.min(screen.width, 1920)}x${Math.min(screen.height, 1920)}`, language: navigator.language, device: getDevice(), browser: getBrowser(), os: getOs(), consent_version: VERSION, ...meta });
  };
  const trackAnonymous = () => {
    if (isAdmin || dnt || allowed() || !window.CFG) return;
    request({ event: "anonymous_page_view", path: location.pathname.slice(0, 200), device: getDevice() });
  };
  window.jhieTrack = track;
  const removeAnalytics = () => { write("jhie_vid", "", 0); sessionStorage.removeItem("jhie_sid"); };
  const sendConsent = analytics => {
    if (isAdmin || !window.CFG) return;
    const visitor = analytics ? read("jhie_vid") || crypto.randomUUID() : null;
    if (analytics && !read("jhie_vid")) write("jhie_vid", visitor, 31536000);
    request({ event: "consent", visitor_id: visitor, analytics, consent_version: VERSION });
  };
  const setChoice = analytics => {
    if (!analytics) removeAnalytics();
    write("jhie_consent", JSON.stringify({ version: VERSION, analytics }), 31536000);
    sendConsent(analytics);
    document.querySelector(".cookie-consent")?.remove();
    if (analytics) track("page_view"); else trackAnonymous();
  };
  const show = () => {
    if (isAdmin || parse()) return;
    const notice = dnt ? `<p class="cookie-privacy-notice">Your browser's privacy setting is on, so analytics is off.</p>` : "";
    const banner = document.createElement("aside");
    banner.className = "cookie-consent";
    banner.innerHTML = `<div><strong>Cookies and privacy</strong><p>We use essential cookies to keep the site working. With your permission, anonymous analytics help us improve the website. <a href="privacy.html">Privacy policy</a> · <a href="cookies.html">Cookie details</a></p>${notice}</div><div class="cookie-actions"><button class="btn" data-consent="accept">Accept all</button><button class="btn btn-ghost" data-consent="reject">Reject non-essential</button><button class="text-link" data-consent="customize">Customize</button></div>`;
    document.body.appendChild(banner);
    banner.onclick = event => {
      const choice = event.target.dataset.consent;
      if (choice === "accept") setChoice(true);
      if (choice === "reject") setChoice(false);
      if (choice === "customize") banner.querySelector(".cookie-actions").innerHTML = `<button class="btn" data-consent="save">Allow analytics</button><button class="btn btn-ghost" data-consent="reject">Essential only</button>`;
      if (choice === "save") setChoice(true);
    };
  };
  window.jhieCookieSettings = () => { removeAnalytics(); write("jhie_consent", "", 0); sendConsent(false); show(); };
  document.addEventListener("DOMContentLoaded", () => {
    if (debug) console.info("[analytics] state", { consent: parse(), dnt, gpc: navigator.globalPrivacyControl === true, admin: isAdmin });
    show();
    if (allowed()) track("page_view"); else trackAnonymous();
    document.querySelector("#change-cookie-settings")?.addEventListener("click", () => window.jhieCookieSettings());
    document.querySelectorAll('a[href="donate.html"]').forEach(link => link.addEventListener("click", () => track("donate_click")));
  });
})();
