// Loaded after config.js and app.js. Renders the home-page cards and the program detail page from Supabase.
(()=>{
const rest=q=>fetch(CFG.SUPA+"/rest/v1/programs?"+q,{headers:{apikey:CFG.KEY}}).then(r=>r.ok?r.json():Promise.reject());
// Only allow same-site paths or https links (blocks javascript:, data:, etc. if an admin pastes something bad)
const safe=h=>{if(!h)return null;try{const u=new URL(h,location.href);
  if(u.origin===location.origin)return u.pathname+u.search+u.hash;
  return u.protocol==="https:"?u.href:null}catch{return null}};
const ARROW='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const card=p=>{
  const href=safe(p.link_url)||"program.html?slug="+encodeURIComponent(p.slug);
  return `<li class="program-card"><div class="program-icon" aria-hidden="true">${esc(p.icon||"✨")}</div>
<h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>
<a class="program-link" href="${esc(href)}"${/^https:/.test(href)?' rel="noopener"':""}><span>Learn more<span class="sr-only"> about ${esc(p.title)}</span></span><span class="program-arrow">${ARROW}</span></a></li>`};

const grid=$("#programs");
if(grid)rest("select=slug,title,summary,icon,link_url&published=eq.true&order=sort_order.asc,created_at.asc")
  .then(a=>{if(Array.isArray(a)&&a.length)grid.innerHTML=a.map(card).join("")}) // on error/empty, the static HTML stays
  .catch(()=>{});

const det=$("#program");
if(det){
  const slug=new URLSearchParams(location.search).get("slug")||"";
  const fail=m=>det.innerHTML=`<p>${esc(m)}</p><p><a href="index.html#activities">← Back to all programs</a></p>`;
  if(!/^[a-z0-9-]{2,60}$/.test(slug))fail("We couldn't find that program.");
  else rest("select=*&limit=1&published=eq.true&slug=eq."+encodeURIComponent(slug)).then(a=>{
    const p=a&&a[0];if(!p)return fail("We couldn't find that program.");
    document.title=p.title+" — JS Health Initiative East Africa";
    det.innerHTML=`<a class="back-link" href="index.html#activities">← All programs</a>
<div class="program-icon" aria-hidden="true">${esc(p.icon||"✨")}</div><h1>${esc(p.title)}</h1>
<p class="section-lead">${esc(p.summary)}</p>
<div class="prose">${String(p.body||"").split(/\n{2,}/).filter(Boolean).map(t=>`<p>${esc(t)}</p>`).join("")}</div>
<div class="hero-actions"><a href="donate.html" class="btn btn-large">Support this work</a><a href="volunteer.html" class="btn btn-large btn-ghost">Volunteer</a></div>`;
  }).catch(()=>fail("This page is unavailable right now. Please try again shortly."));
}
})();
