const esc=s=>String(s??"").replace(/[&<>"'`]/g,c=>`&#${c.charCodeAt(0)};`);
const $=s=>document.querySelector(s);
const PAGE=location.pathname.split("/").pop()||"index.html";
async function api(path,body,token){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),15000);
  try{
    const r=await fetch(CFG.SUPA+"/functions/v1/"+path,{method:"POST",signal:ctl.signal,
      headers:{"Content-Type":"application/json",apikey:CFG.KEY,Authorization:"Bearer "+(token||CFG.KEY)},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||"Something went wrong. Please try again.");
    return j;
  }catch(e){throw new Error(e.name==="AbortError"?"The request timed out. Please check your connection and try again.":e.message==="Failed to fetch"?"Network error. Please check your connection.":e.message)}
  finally{clearTimeout(t)}
}
const L=(h,t)=>`<a href="${h}"${PAGE===h?' aria-current="page"':""}>${t}</a>`;
if($("#nav"))$("#nav").innerHTML=`<a class="skip" href="#main">Skip to content</a><header class="nav"><div class="container nav-inner"><a href="index.html" class="logo"><span class="logo-mark">JHIE</span><span class="logo-text">JS Health Initiative</span></a><button class="burger" aria-label="Open navigation menu" aria-expanded="false" aria-controls="links">☰</button><nav class="nav-links" id="links" aria-label="Main navigation">${L("index.html","Home")}<a href="index.html#about">About</a>${L("contact.html","Contact")}${L("volunteer.html","Volunteer")}<a href="donate.html" class="btn">Donate</a></nav></div></header>`;
const bg=$(".burger");if(bg)bg.onclick=()=>{const o=$("#links").classList.toggle("open");bg.setAttribute("aria-expanded",o)};
if($("#foot"))$("#foot").innerHTML=`<footer><div class="container footer-inner"><div><p>&copy; ${new Date().getFullYear()} JS Health Initiative East Africa Ltd. Registered in Uganda · Company limited by guarantee.</p><p class="muted">Mbarara · P.O. Box 424082</p><p class="muted"><a href="contact.html">Contact</a> · <a href="donate.html">Donate</a> · <a href="volunteer.html">Volunteer</a></p></div><form class="stacked-form" data-type="subscribe" novalidate><label>Get updates<input name="email" type="email" placeholder="you@example.com" maxlength="254" autocomplete="email" required></label><button class="btn">Subscribe</button><p class="form-status" role="status" aria-live="polite"></p></form></div></footer>`;

// Allowed checkout hosts: Flutterwave live + sandbox. Remove the heroku line once you only use live keys.
const PAYHOST=/^(([\w-]+\.)*flutterwave\.com|([\w-]+\.)*dev-flutterwave\.com|ravemodal-dev\.herokuapp\.com)$/;
const CURR=["USD","EUR","GBP","UGX"],MAXAMT={USD:10000,EUR:10000,GBP:10000,UGX:40000000};
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let last=0;
document.querySelectorAll("form[data-type]").forEach(f=>{
  f.insertAdjacentHTML("afterbegin",'<input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">');
  f.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{f.amount.value=b.dataset.a;f.querySelectorAll("[data-a]").forEach(x=>x.classList.toggle("active",x===b))});
  f.addEventListener("submit",async e=>{
    e.preventDefault();
    const s=f.querySelector(".form-status"),b=f.querySelector("button:not([type=button])"),set=(m,c)=>{s.textContent=m;s.className="form-status "+(c||"")};
    if(b.disabled)return;
    if(!f.checkValidity()){f.reportValidity();return}
    const d=Object.fromEntries(new FormData(f));d.type=f.dataset.type;
    Object.keys(d).forEach(k=>{if(typeof d[k]==="string")d[k]=d[k].trim()});
    if(d.email&&!EMAIL.test(d.email))return set("Please enter a valid email address.","err");
    if(d.website){set("Thank you!","ok");f.reset();return} // bot: pretend success
    if(Date.now()-last<3000)return set("Please wait a moment before trying again.","err");
    if(d.type==="donate"){
      const a=Number(d.amount);
      if(!CURR.includes(d.currency)||!isFinite(a)||a<=0||a>MAXAMT[d.currency])return set("Please enter a valid amount and currency.","err");
      d.amount=a;
    }
    last=Date.now();b.disabled=true;set(d.type==="donate"?"Opening secure payment page…":"Sending…");
    try{
      const j=await api(d.type==="donate"?"donate":"submit",d);
      const link=j.link||j.url||(j.data&&(j.data.link||j.data.url));
      if(d.type==="donate"&&!link){console.error("donate response:",j);throw new Error(j.message||j.error||"The payment service did not return a checkout link. Please try again.");}
      if(link){
        let u;try{u=new URL(link)}catch{}
        if(!u||u.protocol!=="https:"||!PAYHOST.test(u.hostname)){console.error("Blocked checkout link:",link);throw new Error("Could not open the payment page safely ("+(u?u.hostname:"invalid link")+"). Please try again.");}
        location.href=u.href;return;
      }
      set(j.message||"Thank you!","ok");f.reset();
    }catch(x){set(x.message,"err")}
    b.disabled=false;
  });
});

if($("#banner")){const st=new URLSearchParams(location.search).get("status");
  if(st)$("#banner").innerHTML=(st==="successful"||st==="completed")
    ?'<div class="banner" role="status">Thank you! If your payment went through, a receipt will be emailed to you once it is confirmed.</div>'
    :'<div class="banner bad" role="status">The payment was not completed. You can try again below.</div>';}

const un=new URLSearchParams(location.search).get("unsub");
if(un&&/^[\w-]{10,200}$/.test(un)){
  history.replaceState(null,"",location.pathname);
  if(confirm("Unsubscribe from JS Health Initiative updates?"))api("submit",{type:"unsubscribe",token:un}).then(j=>alert(j.message)).catch(x=>alert(x.message));
}

if($("#updates"))fetch(CFG.SUPA+"/rest/v1/updates?select=title,body,image_url,created_at&published=eq.true&order=created_at.desc&limit=3",{headers:{apikey:CFG.KEY}})
  .then(r=>r.ok?r.json():[]).then(a=>{$("#updates").innerHTML=Array.isArray(a)&&a.length
    ?a.map(u=>`<article class="feature">${/^https:\/\//.test(u.image_url||"")?`<img src="${esc(u.image_url)}" alt="" loading="lazy">`:""}<h3>${esc(u.title)}</h3><p>${esc(u.body)}</p></article>`).join("")
    :'<p class="muted">No updates yet. Subscribe below to be the first to hear from us.</p>'}).catch(()=>{$("#updates").innerHTML='<p class="muted">Updates are unavailable right now.</p>'});
