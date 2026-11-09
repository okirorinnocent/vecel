(() => {
  const fallback = [
    { slug: "free-user-training", title: "Free user training", summary: "Practical guidance for health workers who use healthcare equipment.", body: "We help facility teams understand safe, confident day-to-day use of equipment." },
    { slug: "preventive-maintenance", title: "Preventive equipment maintenance", summary: "Simple maintenance guidance to help equipment remain available for care.", body: "We work with facility teams on checks, maintenance routines and documentation." },
    { slug: "equipment-checks", title: "Equipment checks and safety inspections", summary: "Basic checks that help identify equipment concerns early.", body: "We support teams to identify safety concerns and record equipment needs for follow-up." },
    { slug: "troubleshooting", title: "Troubleshooting and repair guidance", summary: "Practical help when equipment is not working as expected.", body: "We provide guidance on safe troubleshooting and help facilities identify when specialist repair support is needed." }
  ];
  const grid = $("#services-grid"), select = $("#service-type"), field = $("#service-details");
  if (!grid) return;
  const render = services => {
    grid.innerHTML = services.map(service => `<article id="${esc(service.slug)}" class="service-card"><h3>${esc(service.title)}</h3><p class="service-summary">${esc(service.summary)}</p><div class="service-body">${String(service.body || "").split(/\n{2,}/).filter(Boolean).map(paragraph => `<p>${esc(paragraph)}</p>`).join("")}</div></article>`).join("");
    if (select) select.innerHTML = services.map(service => `<option value="${esc(service.title)}">${esc(service.title)}</option>`).join("");
    if (field) field.textContent = services.length ? "Tell us what support your facility needs." : "Describe the equipment and support you need.";
  };
  fetch(`${CFG.SUPA}/rest/v1/services?select=*&published=eq.true&order=sort_order.asc`, { headers: { apikey: CFG.KEY } })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Services unavailable")))
    .then(data => render(Array.isArray(data) && data.length ? data : fallback))
    .catch(() => render(fallback));
})();
