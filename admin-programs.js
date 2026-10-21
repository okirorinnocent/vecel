// Loaded after admin.js. Adds a "programs" tab: list, add, edit, reorder, show/hide, delete.
const slugify=s=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);
async function programsAdmin(v){
  v.textContent="Loading…";
  const{data,error}=await sb.from("programs").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  if(error)return v.textContent="Could not load programs: "+error.message;
  v.innerHTML=`<h2>Programs (${data.length})</h2>
  <div class="scroll"><table><tr><th>Icon</th><th>Title</th><th>Page</th><th>Visible</th><th>Order</th><th>Actions</th></tr>
  ${data.map((p,i)=>`<tr><td>${esc(p.icon)}</td><td>${esc(p.title)}</td><td>${esc(p.link_url||"program.html?slug="+p.slug)}</td><td>${p.published?"Yes":"Hidden"}</td><td>${i+1}</td>
  <td><div class="row-actions" data-id="${esc(p.id)}"><button class="btn btn-ghost" data-a="up"${i?"":" disabled"}>↑</button><button class="btn btn-ghost" data-a="down"${i<data.length-1?"":" disabled"}>↓</button><button class="btn btn-ghost" data-a="edit">Edit</button><button class="btn btn-ghost" data-a="del">Delete</button></div></td></tr>`).join("")}</table></div>
  ${data.length?"":'<p class="muted">No programs yet. Add the first one below.</p>'}
  <h2 id="pf-h">Add a program</h2>
  <form id="pf" class="stacked-form"><input type="hidden" name="id">
   <label>Title<input name="title" required maxlength="80"></label>
   <label>Short description (shown on the card)<textarea name="summary" rows="2" required maxlength="240"></textarea></label>
   <label>Icon (one emoji)<input name="icon" maxlength="8" value="✨"></label>
   <label>Page address (slug, letters/numbers/dashes; leave empty to generate)<input name="slug" maxlength="60" pattern="[a-z0-9\\-]{2,60}"></label>
   <label>Full page text (blank line = new paragraph)<textarea name="body" rows="8" maxlength="10000"></textarea></label>
   <label>Custom link (optional; overrides the program page, e.g. /donate.html or https://…)<input name="link_url" maxlength="300"></label>
   <label><span><input type="checkbox" name="published" checked> Show on the website</span></label>
   <div class="row-actions"><button class="btn" id="pf-save">Save program</button><button type="button" class="btn btn-ghost" id="pf-reset" hidden>Cancel edit</button></div></form>`;
  const f=$("#pf"),reset=()=>{f.reset();f.id.value="";f.published.checked=true;$("#pf-h").textContent="Add a program";$("#pf-reset").hidden=true};
  $("#pf-reset").onclick=reset;
  f.onsubmit=async e=>{e.preventDefault();const b=$("#pf-save");
    let link=f.link_url.value.trim();
    if(link){try{const u=new URL(link,location.origin);if(u.origin!==location.origin&&u.protocol!=="https:")throw 0}catch{return alert("Custom link must be a page on this site or an https:// address.")}}
    const row={title:f.title.value.trim(),summary:f.summary.value.trim(),icon:f.icon.value.trim()||"✨",body:f.body.value.trim(),
      slug:f.slug.value.trim()||slugify(f.title.value),link_url:link||null,published:f.published.checked};
    if(!/^[a-z0-9-]{2,60}$/.test(row.slug))return alert("The page address needs 2–60 letters, numbers or dashes.");
    b.disabled=true;
    const q=f.id.value?sb.from("programs").update({...row,updated_at:new Date().toISOString()}).eq("id",f.id.value)
      :sb.from("programs").insert({...row,sort_order:(data.length+1)*10});
    const{error}=await q;b.disabled=false;
    if(error)return alert(error.code==="23505"?"That page address is already used by another program.":error.message);
    programsAdmin(v)};
  v.querySelectorAll(".row-actions[data-id] button").forEach(btn=>btn.onclick=async()=>{
    const id=btn.parentElement.dataset.id,i=data.findIndex(p=>p.id===id),p=data[i],a=btn.dataset.a;
    if(a==="edit"){for(const k of["title","summary","icon","slug","body"])f[k].value=p[k]||"";f.link_url.value=p.link_url||"";f.published.checked=p.published;f.id.value=p.id;
      $("#pf-h").textContent="Edit: "+p.title;$("#pf-reset").hidden=false;f.scrollIntoView({behavior:"smooth"})}
    if(a==="del"&&confirm(`Delete "${p.title}"? This cannot be undone. (Tip: untick "Show on the website" to hide it instead.)`)){
      const{error}=await sb.from("programs").delete().eq("id",id);if(error)return alert(error.message);programsAdmin(v)}
    if(a==="up"||a==="down"){const j=a==="up"?i-1:i+1,arr=[...data];[arr[i],arr[j]]=[arr[j],arr[i]];
      const res=await Promise.all(arr.map((r,n)=>sb.from("programs").update({sort_order:(n+1)*10}).eq("id",r.id)));
      const bad=res.find(r=>r.error);if(bad)return alert(bad.error.message);programsAdmin(v)}
  });
}
