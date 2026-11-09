(() => {
  const fallback = [
    { name: "Dr. Solomon Ondoma Mugisha", role_title: "Founder" },
    { name: "Biryomumeisho Joshua", role_title: "Co-founder" },
    { name: "Gabriel Rumaya", role_title: "Chief Technical Officer" },
    { name: "Ninsima Doreen", role_title: "Projects Coordinator" },
    { name: "Lofoga Innocent", role_title: "Digital Operations Manager / Technical Lead – Digital Skilling" },
    { name: "Asingwiire Bruce", role_title: "Team Lead – Surgical, Emergency & Critical Care Equipment" }
  ];
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
  const card = member => `<article class="team-card ${/founder|chief|lead/i.test(member.role_title) ? "team-card-lead" : ""}"><div class="team-avatar">${member.photo_url ? `<img src="${esc(member.photo_url)}" alt="${esc(member.name)}" loading="lazy">` : `<span aria-hidden="true">${esc(initials(member.name))}</span>`}</div><div class="team-card-copy"><h3>${esc(member.name)}</h3><p class="team-role">${esc(member.role_title)}</p>${member.department ? `<p class="team-department">${esc(member.department)}</p>` : ""}<p class="team-bio" data-collapsed="true">${esc(member.bio || "Working with colleagues and partners to strengthen practical healthcare support in our communities.")}</p>${member.bio && member.bio.length > 180 ? '<button class="text-link team-more" type="button">Read more</button>' : ""}<div class="team-contact">${member.show_email && member.email ? `<a href="mailto:${esc(member.email)}">${esc(member.email)}</a>` : ""}${member.show_phone && member.phone ? `<a href="tel:${esc(member.phone)}">${esc(member.phone)}</a>` : ""}${member.linkedin_url ? `<a href="${esc(member.linkedin_url)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>` : ""}</div></div></article>`;
  const render = (target, members) => {
    if (!target) return;
    target.innerHTML = members.map(card).join("");
    target.querySelectorAll(".team-more").forEach(button => button.onclick = () => {
      const bio = button.previousElementSibling;
      const collapsed = bio.dataset.collapsed === "true";
      bio.dataset.collapsed = String(!collapsed);
      button.textContent = collapsed ? "Show less" : "Read more";
    });
  };
  const targets = [$("#team-grid"), $("#team-preview")].filter(Boolean);
  if (!targets.length) return;
  fetch(`${CFG.SUPA}/rest/v1/team_members?select=*&published=eq.true&order=sort_order.asc`, { headers: { apikey: CFG.KEY } })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Team unavailable")))
    .then(data => {
      const members = Array.isArray(data) && data.length ? data : fallback;
      targets.forEach(target => render(target, target.id === "team-preview" ? members.slice(0, 4) : members));
    })
    .catch(() => targets.forEach(target => render(target, target.id === "team-preview" ? fallback.slice(0, 4) : fallback)));
})();
