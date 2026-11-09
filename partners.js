(() => {
  const grid = $("#partners-grid");
  if (!grid) return;
  const filter = $("#partner-filter");
  const render = partners => {
    const selected = filter?.value || "all";
    const visible = selected === "all" ? partners : partners.filter(partner => partner.partner_type === selected);
    grid.innerHTML = visible.length ? visible.map(partner => `<article class="partner-card"><div class="partner-logo">${partner.logo_url ? `<img src="${esc(partner.logo_url)}" alt="" loading="lazy">` : `<span aria-hidden="true">${esc(partner.name.slice(0, 2).toUpperCase())}</span>`}</div><span class="partner-type">${esc(partner.partner_type)}</span><h3>${esc(partner.name)}</h3>${partner.description ? `<p>${esc(partner.description)}</p>` : ""}${partner.partner_since ? `<p class="muted">Partner since ${esc(partner.partner_since)}</p>` : ""}${partner.website_url ? `<a class="text-link" href="${esc(partner.website_url)}" target="_blank" rel="noopener noreferrer">Visit website <span aria-hidden="true">↗</span></a>` : ""}</article>`).join("") : '<p class="updates-empty">We are welcoming organisations that share our commitment to practical healthcare support. Become a partner and let us explore how we can work together.</p>';
  };
  fetch(`${CFG.SUPA}/rest/v1/partners?select=*&published=eq.true&order=sort_order.asc`, { headers: { apikey: CFG.KEY } })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Partners unavailable")))
    .then(data => { const partners = Array.isArray(data) ? data : []; render(partners); if (filter) filter.onchange = () => render(partners); })
    .catch(() => { render([]); if (filter) filter.onchange = () => render([]); });
})();
