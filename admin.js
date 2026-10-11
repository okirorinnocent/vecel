const sb=supabase.createClient(CFG.SUPA,CFG.KEY);
const T={applications:["created_at","name","email","phone","skills","status"],messages:["created_at","name","email","message","status"],subscribers:["created_at","email","active"],donations:["created_at","name","email","amount","currency","status"],updates:["created_at","title"]};
const ST=["new","reviewed","contacted","done"];let cur="applications";
const MAXIMG=3*1024*1024;
async function boot(){
  const{data:{session}}=await sb.auth.getSession();
  if(!session){$("#login").hidden=false;$("#panel").hidden=true;return}
  const{data,error}=await sb.from("admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(error||!data){await sb.auth.signOut();$("#login").hidden=false;$("#panel").hidden=true;$("#ls").textContent="This account is not an admin.";return}
  $("#login").hidden=true;$("#panel").hidden=false;
  $("#tabs").innerHTML=[...Object.keys(T),"compose"].map(k=>`<button class="btn btn-ghost" data-t="${k}">${k}</button>`).join("");
  show(cur);
}
function mark(t){document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("active",b.dataset.t===t))}
$("#tabs").onclick=e=>{const t=e.target.dataset.t;if(t){cur=t;show(t)}};
$("#login").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector("button");b.disabled=true;
  const{error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
  b.disabled=false;e.target.password.value="";
  if(error)$("#ls").textContent="Sign-in failed. Check your email and password.";else{$("#ls").textContent="";boot()}};
$("#out").onclick=async()=>{await sb.auth.signOut();boot()};
sb.auth.onAuthStateChange(ev=>{if(ev==="SIGNED_OUT"||ev==="TOKEN_REFRESH_FAILED")boot()});
async function show(t){
  mark(t);const v=$("#view");
  if(t==="compose"){
    v.innerHTML=`<h2>Post an update</h2><form id="up" class="stacked-form"><label>Title<input name="title" required maxlength="150"></label><label>Text<textarea name="body" rows="4" required maxlength="3000"></textarea></label><label>Image (optional, max 3 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="btn">Publish update</button></form>
    <h2>Email all subscribers</h2><form id="bc" class="stacked-form"><label>Subject<input name="subject" required maxlength="150"></label><label>Message<textarea name="message" rows="5" required maxlength="5000"></textarea></label><button class="btn">Send to subscribers</button></form>`;
    $("#up").onsubmit=async e=>{e.preventDefault();const form=e.target,btn=form.querySelector("button"),f=new FormData(form),file=f.get("image");let image_url=null;
      if(file&&file.size){
        if(!["image/jpeg","image/png","image/webp"].includes(file.type))return alert("Only JPG, PNG or WebP images are allowed.");
        if(file.size>MAXIMG)return alert("Image is too large (max 3 MB).");
      }
      btn.disabled=true;
      try{
        if(file&&file.size){const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type],p=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const{error}=await sb.storage.from("updates").upload(p,file,{contentType:file.type});if(error)throw error;
          image_url=sb.storage.from("updates").getPublicUrl(p).data.publicUrl}
        const{error}=await sb.from("updates").insert({title:f.get("title").trim(),body:f.get("body").trim(),image_url});
        if(error)throw error;alert("Published");form.reset();
      }catch(x){alert(x.message)}
      btn.disabled=false};
    $("#bc").onsubmit=async e=>{e.preventDefault();const form=e.target;if(!confirm("Send this email to ALL active subscribers? This cannot be undone."))return;
      const btn=form.querySelector("button");btn.disabled=true;
      try{const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error("Session expired. Please sign in again.");
        const d=Object.fromEntries(new FormData(form));
        alert((await api("submit",{type:"broadcast",subject:d.subject.trim(),message:d.message.trim()},session.access_token)).message);form.reset()}
      catch(x){alert(x.message)}
      btn.disabled=false};
    return;
  }
  v.textContent="Loading…";
  const{data,error}=await sb.from(t).select("*").order("created_at",{ascending:false}).limit(500);
  if(error)return v.textContent="Could not load data: "+error.message;
  let sum="";
  if(t==="donations"){const m={};data.filter(d=>d.status==="succeeded").forEach(d=>m[d.currency]=(m[d.currency]||0)+Number(d.amount));
    sum=`<p><b>Received:</b> ${esc(Object.entries(m).map(([c,a])=>a.toLocaleString()+" "+c).join(" · ")||"nothing yet")}</p>`}
  const hasStatus=t==="applications"||t==="messages";
  v.innerHTML=`<h2>${esc(t)} (${data.length})</h2>${sum}<div class="scroll"><table><tr>${T[t].map(c=>`<th>${esc(c.replace("_"," "))}</th>`).join("")}</tr>${data.map(r=>`<tr>${T[t].map(c=>
    c==="status"&&hasStatus?`<td><select data-id="${esc(r.id)}" data-prev="${esc(r.status)}" aria-label="Status">${ST.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("")}</select></td>`
    :`<td>${esc(c==="created_at"?new Date(r[c]).toLocaleString():r[c])}</td>`).join("")}</tr>`).join("")}</table></div>${data.length?"":'<p class="muted">Nothing here yet.</p>'}`;
  v.querySelectorAll("select").forEach(s=>s.onchange=async()=>{
    const{error}=await sb.from(t).update({status:s.value}).eq("id",s.dataset.id);
    if(error){alert("Update failed: "+error.message);s.value=s.dataset.prev}else s.dataset.prev=s.value});
}
boot();
