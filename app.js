const esc = value => String(value ?? "").replace(/[&<>"'`]/g, character => `&#${character.charCodeAt(0)};`);
const $ = selector => document.querySelector(selector);
const PAGE = location.pathname.split("/").pop() || "index.html";

async function api(path, body, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${CFG.SUPA}/functions/v1/${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: CFG.KEY,
        Authorization: `Bearer ${token || CFG.KEY}`
      },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
    return result;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The request timed out. Please check your connection and try again.");
    if (error.message === "Failed to fetch") throw new Error("Network error. Please check your connection.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const pageLink = (href, label) => `<a href="${href}"${PAGE === href ? ' aria-current="page"' : ""}>${label}</a>`;

if ($("#nav")) {
  $("#nav").innerHTML = `<a class="skip" href="#main">Skip to content</a><header class="nav"><div class="container nav-inner"><a href="index.html" class="logo"><img src="assets/logo-horizontal.svg" alt="JS Health Initiative East Africa"></a><button class="burger" aria-label="Open navigation menu" aria-expanded="false" aria-controls="links">☰</button><nav class="nav-links" id="links" aria-label="Main navigation">${pageLink("index.html", "Home")}<a href="index.html#work">What we do</a><a href="services.html">Services</a><a href="team.html">Team</a><a href="partners.html">Partners</a><a href="index.html#where">Where we work</a>${pageLink("get-involved.html", "Get involved")}${pageLink("contact.html", "Contact")}<a href="donate.html" class="btn">Donate</a></nav></div></header>`;
}

const burger = $(".burger");
if (burger) {
  burger.onclick = () => {
    const links = $("#links");
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  };
}

document.querySelectorAll(".nav-links a").forEach(link => link.addEventListener("click", () => {
  if (burger) {
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open navigation menu");
  }
  const links = $("#links");
  if (links) links.classList.remove("open");
}));

if ($("#foot")) {
  const subscribeFooter = PAGE === "unsubscribe.html" ? "" : `<form class="stacked-form" data-type="subscribe" data-turnstile data-turnstile-action="subscribe" novalidate><div class="cf-turnstile" aria-label="Security check"></div><label>Get occasional updates<input name="email" type="email" placeholder="you@example.com" maxlength="254" autocomplete="email" required></label><button class="btn">Subscribe</button><p class="form-status" role="status" aria-live="polite"></p></form>`;
  $("#foot").innerHTML = `<footer><div class="container footer-inner"><div><p><strong>JS Health Initiative East Africa</strong></p><p class="muted">Building healthier communities and creating opportunities across Western Uganda.</p><p class="muted">Mbarara · Company limited by guarantee</p><p><strong>Follow us</strong></p><div class="social-links footer-social" aria-label="Follow us"></div><p><a href="services.html">Services</a> · <a href="team.html">Team</a> · <a href="partners.html">Partners</a> · <a href="get-involved.html">Get involved</a> · <a href="get-involved.html#partner">Partner</a> · <a href="volunteer.html">Volunteer</a> · <a href="donate.html">Donate</a> · <a href="contact.html">Contact</a></p><p><a href="privacy.html">Privacy</a> · <a href="cookies.html">Cookies</a> · <button class="text-link footer-cookie-settings" type="button">Cookie settings</button></p></div>${subscribeFooter}</div></footer>`;
  $(".footer-cookie-settings")?.addEventListener("click", () => window.jhieCookieSettings?.());
}
window.jhieSocial?.init();

const PAYMENT_HOST = /^((([\w-]+\.)*flutterwave\.com)|(([\w-]+\.)*dev-flutterwave\.com)|ravemodal-dev\.herokuapp\.com)$/;
const CURRENCIES = ["USD", "EUR", "GBP", "UGX"];
const MAX_AMOUNT = { USD: 10000, EUR: 10000, GBP: 10000, UGX: 40000000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let lastSubmission = 0;

document.querySelectorAll("form[data-type]").forEach(form => {
  form.dataset.renderedAt = String(Date.now());
  form.insertAdjacentHTML("afterbegin", '<input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">');
  form.querySelectorAll("[data-a]").forEach(button => {
    button.onclick = () => {
      form.amount.value = button.dataset.a;
      form.querySelectorAll("[data-a]").forEach(item => item.classList.toggle("active", item === button));
    };
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const status = form.querySelector(".form-status");
    const button = form.querySelector('button:not([type="button"])');
    const setStatus = (message, className) => {
      status.textContent = message;
      status.className = `form-status ${className || ""}`;
    };
    if (button.disabled) return;
    if (form.matches("[data-turnstile]") && form.dataset.turnstileReady !== "true") {
      setStatus("Please complete the security check before submitting.", "err");
      return;
    }
    if (Date.now() - Number(form.dataset.renderedAt) < 1200) {
      setStatus("Please take a moment to review the form before sending.", "err");
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.type = form.dataset.type;
    Object.keys(data).forEach(key => {
      if (typeof data[key] === "string") data[key] = data[key].trim();
    });
    if (data.email && !EMAIL.test(data.email)) {
      setStatus("Please enter a valid email address.", "err");
      return;
    }
    if (data.website) {
      setStatus("Thank you!", "ok");
      form.reset();
      window.jhieTurnstileReset?.(form);
      return;
    }
    if (Date.now() - lastSubmission < 3000) {
      setStatus("Please wait a moment before trying again.", "err");
      return;
    }
    if (data.type === "donate") {
      const amount = Number(data.amount);
      if (!CURRENCIES.includes(data.currency) || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT[data.currency]) {
        setStatus("Please enter a valid amount and currency.", "err");
        return;
      }
      data.amount = amount;
    }
    lastSubmission = Date.now();
    button.disabled = true;
    setStatus(data.type === "donate" ? "Opening secure payment page…" : "Sending…");
    try {
      const result = await api(data.type === "donate" ? "donate" : "submit", data);
      const link = result.link || result.url || (result.data && (result.data.link || result.data.url));
      if (data.type === "donate" && !link) throw new Error(result.message || result.error || "The payment service did not return a checkout link. Please try again.");
      if (link) {
        let url;
        try {
          url = new URL(link);
        } catch {
          url = null;
        }
        if (!url || url.protocol !== "https:" || !PAYMENT_HOST.test(url.hostname)) throw new Error("Could not open the payment page safely. Please try again.");
        location.href = url.href;
        return;
      }
      setStatus(result.message || "Thank you!", "ok");
      if (window.jhieTrack) window.jhieTrack(data.type === "volunteer" ? "volunteer_submit" : data.type === "subscribe" ? "subscribe" : "form_submit");
      form.reset();
      window.jhieTurnstileReset?.(form);
    } catch (error) {
      setStatus(error.message, "err");
    }
    window.jhieTurnstileReset?.(form);
    button.disabled = false;
  });
});

if ($("#banner")) {
  const status = new URLSearchParams(location.search).get("status");
  if (status) $("#banner").innerHTML = status === "successful" || status === "completed"
    ? '<div class="banner" role="status">Thank you! If your payment went through, a receipt will be emailed to you once it is confirmed.</div>'
    : '<div class="banner bad" role="status">The payment was not completed. You can try again below.</div>';
}

if ($("#updates")) {
  fetch(`${CFG.SUPA}/rest/v1/updates?select=title,body,image_url,created_at&published=eq.true&order=created_at.desc&limit=20`, { headers: { apikey: CFG.KEY } })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Could not load updates.")))
    .then(updates => {
      const formatDate = value => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      };
      const fieldUpdates = (PAGE === "services.html" ? updates.filter(update => /service|equipment|biomedical|maintenance|training/i.test(`${update.title} ${update.body}`)) : updates).slice(0, 3);
      $("#updates").innerHTML = Array.isArray(fieldUpdates) && fieldUpdates.length
        ? fieldUpdates.map(update => {
          const article = document.createElement("article");
          article.className = "feature";
          if (/^https:\/\//.test(update.image_url || "")) {
            const image = document.createElement("img");
            image.src = update.image_url;
            image.alt = "";
            image.loading = "lazy";
            article.appendChild(image);
          }
          article.insertAdjacentHTML("beforeend", `<span class="feature-date">${esc(formatDate(update.created_at))}</span><h3>${esc(update.title)}</h3><p>${esc(update.body)}</p>`);
          article.appendChild(window.jhieSocial.shareLinks(update.title));
          return article.outerHTML;
        }).join("")
        : '<p class="updates-empty">Field notes from our sessions and programs will appear here. To hear first, subscribe at the bottom of this page.</p>';
    })
    .catch(error => {
      console.error("Updates could not be loaded:", error);
      $("#updates").innerHTML = '<p class="updates-empty">Updates are temporarily unavailable. Please check back soon.</p>';
    });
}
