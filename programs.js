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
  return `<li class="program-card"><div class="program-card-top"><span class="program-number" aria-hidden="true"></span><span class="program-arrow" aria-hidden="true">${ARROW}</span></div>
<div class="program-card-copy"><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div>
<a class="program-link" href="${esc(href)}"${/^https:/.test(href)?' rel="noopener"':""}><span class="sr-only">Learn more about ${esc(p.title)}</span></a></li>`};

const grid=$("#programs");
if(grid)rest("select=slug,title,summary,icon,link_url&published=eq.true&order=sort_order.asc,created_at.asc")
  .then(a=>{if(Array.isArray(a)&&a.length)grid.innerHTML=a.map(card).join("")}) // on error/empty, the static HTML stays
  .catch(()=>{});

const det=$("#program");
if(det){
  // Built-in copy, used only if the database cannot be reached (never for hidden or deleted programs)
  const BASE={
    "digital-skilling":{title:"Digital skilling",icon:"💻",summary:"Practical digital skills for the modern economy."},
    "research-innovation":{title:"Research & innovation",icon:"🔬",summary:"Local research that responds to real challenges in our communities."},
    "public-health-education":{title:"Public health education",icon:"🩺",summary:"Critical health awareness delivered at community level."},
    "surgical-care-support":{title:"Surgical care support",icon:"🏥",summary:"Sourcing and subsidising essential equipment and implants so surgery is within reach."},
    "youth-empowerment":{title:"Youth empowerment",icon:"🌱",summary:"Skilling young people to build livelihoods and lead change."}
  };
  const PLACEHOLDER=/^describe this program here\.?$/i;
  const slug=new URLSearchParams(location.search).get("slug")||"";
  const fail=m=>det.innerHTML=`<p>${esc(m)}</p><p><a href="index.html#activities">← Back to all programs</a></p>`;
  const render=p=>{
    document.title=p.title+" — JS Health Initiative East Africa";
    const body=String(p.body||"").trim();
    const paras=(!body||PLACEHOLDER.test(body))
      ?["More details about this program are coming soon. If you would like to learn more, support it or get involved, please get in touch with us."]
      :body.split(/\n{2,}/).filter(Boolean);
    det.innerHTML=`<a class="back-link" href="index.html#activities">← All programs</a>
<div class="program-icon" aria-hidden="true">${esc(p.icon||"✨")}</div><h1>${esc(p.title)}</h1>
<p class="section-lead">${esc(p.summary)}</p>
<div class="prose">${paras.map(t=>`<p>${esc(t)}</p>`).join("")}</div>
<div class="hero-actions"><a href="donate.html" class="btn btn-large">Support this work</a><a href="volunteer.html" class="btn btn-large btn-ghost">Volunteer</a><a href="contact.html" class="btn btn-large btn-ghost">Contact us</a></div>`;
  };
  if(!slug)location.replace("index.html#activities"); // opened without ?slug=
  else if(!/^[a-z0-9-]{2,60}$/.test(slug))fail("We couldn't find that program.");
  else rest("select=*&limit=1&published=eq.true&slug=eq."+encodeURIComponent(slug)).then(a=>{
    const p=a&&a[0];if(!p)return fail("We couldn't find that program.");
    render(p);
  }).catch(()=>{
    const b=Object.prototype.hasOwnProperty.call(BASE,slug)?BASE[slug]:null;
    if(b)render({...b,slug,body:""});
    else fail("This page is unavailable right now. Please try again shortly.");
  });
}
})();
