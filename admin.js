const sb=supabase.createClient(CFG.SUPA,CFG.KEY);
const T={applications:["created_at","name","email","phone","skills","status"],messages:["created_at","name","email","message","status"],subscribers:["created_at","email","active"],donations:["created_at","name","email","amount","currency","status"],updates:["created_at","title","published"],cookie_consents:["created_at","visitor_id","analytics","version"],email_log:["created_at","to_email","subject","kind","ok","error"],broadcasts:["created_at","subject","status","sent_count","failed_count","total_count"],audit_log:["created_at","user_id","action","table_name","record_id","changes"]};
const ST=["new","reviewed","contacted","done"];let cur="applications";
const MAXIMG=3*1024*1024;
async function boot(){
  const{data:{session}}=await sb.auth.getSession();
  if(!session){$("#login").hidden=false;$("#panel").hidden=true;return}
  const{data,error}=await sb.from("admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(error||!data){await sb.auth.signOut();$("#login").hidden=false;$("#panel").hidden=true;$("#ls").textContent="This account is not an admin.";return}
  $("#login").hidden=true;$("#panel").hidden=false;
  $("#tabs").innerHTML=[...Object.keys(T),"programs","team","partners","services","service requests","compose","analytics"].map(k=>`<button class="btn btn-ghost" data-t="${k}">${k==="audit_log"?"audit log":k}</button>`).join("");
  const { count: newRequests } = await sb.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "new");
  const requestTab = [...$("#tabs").querySelectorAll("button")].find(button => button.dataset.t === "service requests");
  if (requestTab && newRequests) requestTab.innerHTML = `service requests <span class="badge">${esc(newRequests)}</span>`;
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
  if(t==="programs")return programsAdmin(v);
  if(t==="team")return teamAdmin(v);
  if(t==="partners")return partnersAdmin(v);
  if(t==="services")return servicesAdmin(v);
  if(t==="service requests")return serviceRequestsAdmin(v);
  if(t==="analytics")return analyticsAdmin(v);
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
        const d=Object.fromEntries(new FormData(form)),idempotency_key=form.dataset.idempotency||crypto.randomUUID();form.dataset.idempotency=idempotency_key;
        const queued=await api("submit",{type:"broadcast",subject:d.subject.trim(),message:d.message.trim(),idempotency_key},session.access_token);alert(queued.message);
        if(queued.broadcast_id){let remaining=1,processed=0;while(remaining&&processed<20){const result=await api("submit",{type:"process_broadcast",broadcast_id:queued.broadcast_id},session.access_token);remaining=Number(result.remaining||0);processed++;}alert(remaining?`${queued.message} Processing continues in batches.`:`${queued.message} All queued recipients were processed.`);}
        form.reset()}
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
async function analyticsAdmin(v){
  v.innerHTML=`<h2>Analytics</h2><label>Range <select id="analytics-range"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option></select></label><div id="analytics-output">Loading…</div>`;
  const load=async()=>{const days=Number($("#analytics-range").value),since=new Date(Date.now()-days*86400000).toISOString(),{data,error}=await sb.rpc("analytics_admin_summary",{p_since:since});if(error){v.querySelector("#analytics-output").textContent="Could not load analytics: "+error.message;return}const out=v.querySelector("#analytics-output"),list=(items,key)=>`<ul>${(items||[]).map(x=>`<li>${esc(x[key]??"unknown")}: ${esc(x.count)}</li>`).join("")||"<li>None</li>"}</ul>`,daily=data.daily||[],max=Math.max(1,...daily.map(x=>Number(x.count))),bars=daily.map((x,i)=>`<rect x="${i*22}" y="${100-(Number(x.count)/max*90)}" width="16" height="${Number(x.count)/max*90}" aria-label="${esc(x.day)} ${esc(x.count)}"></rect>`).join("");out.innerHTML=`<button class="btn btn-ghost" id="analytics-export">Export recent events CSV</button><div class="analytics-stats"><p><b>Total visitors:</b> ${esc(data.total_visitors)}</p><p><b>New:</b> ${esc(data.new_visitors)}</p><p><b>Returning:</b> ${esc(data.returning_visitors)}</p><p><b>Page views:</b> ${esc(data.page_views)}</p><p><b>Consent accepted:</b> ${esc(data.consent_accepted)}</p><p><b>Consent rejected:</b> ${esc(data.consent_rejected)}</p></div><div class="analytics-columns"><section><h3>Top pages</h3>${list(data.top_pages,"path")}</section><section><h3>Referrers</h3>${list(data.top_referrers,"referrer")}</section><section><h3>Countries</h3>${list(data.countries,"country")}</section><section><h3>Devices</h3>${list(data.devices,"device")}</section><section><h3>Browsers</h3>${list(data.browsers,"browser")}</section></div><h3>Daily page views</h3><svg class="analytics-chart" viewBox="0 0 ${Math.max(220,daily.length*22)} 110" role="img" aria-label="Daily page views">${bars}</svg><h3>Recent events</h3><div class="scroll"><table><tr><th>Time</th><th>Event</th><th>Path</th><th>Country</th></tr>${(data.recent_events||[]).map(x=>`<tr><td>${esc(new Date(x.created_at).toLocaleString())}</td><td>${esc(x.event)}</td><td>${esc(x.path)}</td><td>${esc(x.country||"unknown")}</td></tr>`).join("")}</table></div>`;v.querySelector("#analytics-export").onclick=()=>{const rows=[["created_at","event","path","country"],...(data.recent_events||[]).map(x=>[x.created_at,x.event,x.path,x.country||""])];const csv=rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")).join("\\n");const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));link.download="analytics-events.csv";link.click();URL.revokeObjectURL(link.href);};};
  $("#analytics-range").onchange=load;await load();
}
const auditAdmin = async (tableName, action, recordId, changes) => {
  const { data: session } = await sb.auth.getSession();
  const { error } = await sb.from("admin_audit_log").insert({ user_id: session.session?.user.id, action, table_name: tableName, record_id: recordId || null, changes });
  if (error) console.warn("Audit log write failed:", error.message);
};
window.jhieAudit = auditAdmin;
const csvDownload = (name, rows) => {
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};
const updateStoragePath = imageUrl => {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    if (url.origin !== new URL(CFG.SUPA).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/updates\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch { return null; }
};
const deleteRecords = async ({ table, records, view, removeRecord }) => {
  if (typeof HTMLDialogElement === "undefined" || typeof document.createElement("dialog").showModal !== "function") {
    if (!window.confirm(`Delete ${records.length === 1 ? records[0].title || "this update" : `${records.length} updates`} permanently?`)) return;
    return deleteRecordsNow({ table, records, view, removeRecord });
  }
  const dialog = document.createElement("dialog");
  const summary = records.length === 1
    ? `${records[0].title || "this update"} (${new Date(records[0].created_at).toLocaleString()})`
    : `${records.length} updates`;
  dialog.className = "confirm-dialog";
  dialog.innerHTML = `<form method="dialog"><h2>Delete permanently?</h2><p>You are about to delete ${esc(summary)}. This cannot be undone.</p><p class="form-status" role="alert" aria-live="polite"></p><div class="dialog-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button type="button" class="btn btn-danger" data-delete>Delete permanently</button></div></form>`;
  view.appendChild(dialog);
  const cancel = dialog.querySelector("[data-cancel]");
  const confirm = dialog.querySelector("[data-delete]");
  const status = dialog.querySelector(".form-status");
  const closeDialog = () => {
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      dialog.remove();
    }
  };
  const focusable = () => [...dialog.querySelectorAll("button:not([disabled]), [href], input, select, textarea")];
  const focusFirst = () => focusable()[0]?.focus();
  const onKeyDown = event => {
    if (event.key === "Escape") { event.preventDefault(); closeDialog(); return; }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  cancel.addEventListener("click", closeDialog);
  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    cancel.disabled = true;
    status.textContent = "Deleting…";
    try {
      await deleteRecordsNow({ table, records, view, removeRecord });
      closeDialog();
    } catch (error) {
      status.textContent = error.message || "Delete failed. Please try again.";
      confirm.disabled = false;
      cancel.disabled = false;
    }
  });
  dialog.addEventListener("keydown", onKeyDown);
  dialog.addEventListener("close", () => { if (dialog.isConnected) dialog.remove(); });
  try {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  } catch {
    dialog.remove();
    if (window.confirm(`Delete ${records.length === 1 ? records[0].title || "this update" : `${records.length} updates`} permanently?`)) {
      deleteRecordsNow({ table, records, view, removeRecord }).catch(error => {
        const notice = view.querySelector(".table-notice");
        if (notice) notice.textContent = error.message || "Delete failed. Please try again.";
      });
    }
    return;
  }
  focusFirst();
};
const deleteRecordsNow = async ({ table, records, view, removeRecord }) => {
  const { data: session } = await sb.auth.getSession();
  if (!session.session) throw new Error("Your session has expired. Please sign in again.");
  for (const record of records) {
    const { data: deleted, error } = await sb.from(table).delete().eq("id", record.id).select("id");
    if (error) throw new Error(`Delete failed: ${error.message}`);
    if (!deleted?.length) throw new Error("Delete was rejected. Apply supabase/admin-updates-delete.sql and verify this user is in public.admins.");
    const path = table === "updates" ? updateStoragePath(record.image_url) : null;
    if (path) {
      const { error: storageError } = await sb.storage.from("updates").remove([path]);
      if (storageError) console.warn("Update image cleanup failed:", storageError.message);
    }
    await auditAdmin(table, "delete", record.id, { title: record.title, email: session.session.user.email || "" });
    removeRecord(record);
  }
  const notice = document.createElement("p");
  notice.className = "form-status";
  notice.setAttribute("role", "status");
  notice.textContent = `Deleted ${records.length} ${records.length === 1 ? "update" : "updates"}.`;
  view.querySelector(".table-notice")?.replaceChildren(notice);
};
const tableAdmin = async (view, tableName) => {
  const columns = T[tableName], query = sb.from(tableName).select("*").order("created_at", { ascending: false }).limit(1000);
  const { data, error } = await query;
  if (error) { view.textContent = `Could not load ${tableName}: ${error.message}`; return; }
  const pageSize = 25, isUpdates = tableName === "updates";
  let currentPage = 1;
  const output = document.createElement("div");
  output.id = "table-output";
  const setNotice = message => {
    const notice = view.querySelector(".table-notice");
    if (notice) notice.textContent = message;
  };
  const updateRow = async (row, button) => {
    button.disabled = true;
    const original = row.published;
    button.textContent = "Saving…";
    const { data: updated, error: updateError } = await sb.from(tableName).update({ published: !original }).eq("id", row.id).select("id,published");
    if (updateError) {
      console.error(`Update failed for ${tableName}:${row.id}`, updateError);
      setNotice(updateError.message);
      button.disabled = false;
      button.textContent = original ? "Unpublish" : "Publish";
      return;
    }
    if (!updated?.length) {
      const error = new Error("Nothing was changed. Your admin account may not have permission (check the RLS policy for public.admins)");
      console.error(`Update affected zero rows for ${tableName}:${row.id}`, error);
      setNotice(error.message);
      button.disabled = false;
      button.textContent = original ? "Unpublish" : "Publish";
      return;
    }
    row.published = updated[0].published;
    await auditAdmin(tableName, row.published ? "publish" : "unpublish", row.id, { title: row.title });
    draw(currentPage);
  };
  const draw = (page = currentPage) => {
    const search = String(view.querySelector("#table-search")?.value || "").toLowerCase();
    const rows = data.filter(row => tableName !== "email_log" || row.ok === false).filter(row => !search || columns.some(column => String(row[column] ?? "").toLowerCase().includes(search)));
    const pages = Math.max(1, Math.ceil(rows.length / pageSize)), current = Math.min(page, pages), shown = rows.slice((current - 1) * pageSize, current * pageSize);
    currentPage = current;
    const status = tableName === "applications" || tableName === "messages";
    const headers = isUpdates ? `<th><input type="checkbox" id="select-page" aria-label="Select all updates on this page"></th>` : "";
    const body = shown.map(row => `<tr>${isUpdates ? `<td><input type="checkbox" class="row-select" data-id="${esc(row.id)}" aria-label="Select ${esc(row.title)}"></td>` : ""}${columns.map(column => column === "status" && status ? `<td><select data-id="${esc(row.id)}" data-prev="${esc(row.status)}">${ST.map(item => `<option ${item === row.status ? "selected" : ""}>${item}</option>`).join("")}</select></td>` : column === "published" && isUpdates ? `<td><button type="button" class="btn btn-ghost publish-toggle" data-id="${esc(row.id)}">${row.published ? "Unpublish" : "Publish"}</button></td>` : `<td>${esc(column === "created_at" ? new Date(row[column]).toLocaleString() : row[column])}</td>`).join("")}${isUpdates ? `<td><button type="button" class="btn btn-danger delete-one" data-id="${esc(row.id)}">Delete</button></td>` : ""}</tr>`).join("");
    output.innerHTML = `${isUpdates ? `<div class="table-toolbar"><button type="button" class="btn btn-danger" id="delete-selected" disabled>Delete selected</button><span class="muted">Select all on this page using the checkbox above.</span></div>` : ""}<div class="scroll"><table><thead><tr>${headers}${columns.map(column => `<th>${esc(column.replace("_", " "))}</th>`).join("")}${isUpdates ? "<th>Actions</th>" : ""}</tr></thead><tbody>${body}</tbody></table></div><p class="muted">Page ${current} of ${pages} · ${rows.length} matching records</p><button class="btn btn-ghost" id="prev-page" ${current === 1 ? "disabled" : ""}>Previous</button> <button class="btn btn-ghost" id="next-page" ${current === pages ? "disabled" : ""}>Next</button>`;
    output.querySelector("#prev-page").addEventListener("click", () => draw(current - 1));
    output.querySelector("#next-page").addEventListener("click", () => draw(current + 1));
    view.querySelectorAll("select[data-id]").forEach(select => select.onchange = async () => {
      const { error: updateError } = await sb.from(tableName).update({ status: select.value }).eq("id", select.dataset.id);
      if (updateError) { alert(`Update failed: ${updateError.message}`); select.value = select.dataset.prev; return; }
      await auditAdmin(tableName, "status_updated", select.dataset.id, { status: select.value });
      select.dataset.prev = select.value;
    });
    if (!isUpdates) return;
    const selected = () => [...output.querySelectorAll(".row-select:checked")];
    const updateDeleteButton = () => {
      const button = output.querySelector("#delete-selected");
      if (button) { button.disabled = selected().length === 0; button.textContent = selected().length ? `Delete selected (${selected().length})` : "Delete selected"; }
    };
    output.querySelector("#select-page").addEventListener("change", event => {
      output.querySelectorAll(".row-select").forEach(box => { box.checked = event.target.checked; });
      updateDeleteButton();
    });
    output.querySelectorAll(".row-select").forEach(box => box.addEventListener("change", updateDeleteButton));
  };
  view.innerHTML = `<h2 id="table-heading">${esc(tableName === "email_log" ? "Failed email log" : tableName.replace("_", " "))} (${data.length})</h2><p class="table-notice" role="status"></p><p><input id="table-search" type="search" placeholder="Search records" aria-label="Search records"> <button class="btn btn-ghost" id="table-export">Export CSV</button></p>`;
  view.appendChild(output);
  view.querySelector("#table-search").addEventListener("input", () => draw(1));
  view.querySelector("#table-export").addEventListener("click", () => csvDownload(`${tableName}.csv`, [columns, ...data.filter(row => tableName !== "email_log" || row.ok === false).map(row => columns.map(column => row[column]))]));
  if (isUpdates) output.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.id === "prev-page" || button.id === "next-page") return;
    if (button.classList.contains("publish-toggle")) {
      const row = data.find(item => item.id === button.dataset.id);
      if (row) updateRow(row, button);
    }
    if (button.classList.contains("delete-one")) {
      const row = data.find(item => item.id === button.dataset.id);
      if (row) deleteRecords({ table: tableName, records: [row], view, removeRecord: record => { const index = data.findIndex(item => item.id === record.id); if (index >= 0) data.splice(index, 1); view.querySelector("#table-heading").textContent = `updates (${data.length})`; draw(currentPage); } });
    }
    if (button.id === "delete-selected") {
      const records = [...output.querySelectorAll(".row-select:checked")].map(box => data.find(item => item.id === box.dataset.id)).filter(Boolean);
      if (records.length) deleteRecords({ table: tableName, records, view, removeRecord: record => { const index = data.findIndex(item => item.id === record.id); if (index >= 0) data.splice(index, 1); view.querySelector("#table-heading").textContent = `updates (${data.length})`; draw(currentPage); } });
    }
  });
  draw();
};
const showCompose = async v => {
  v.innerHTML = `<h2>Post an update</h2><form id="up" class="stacked-form"><label>Title<input name="title" required maxlength="150"></label><label>Text<textarea name="body" rows="4" required maxlength="3000"></textarea></label><label>Image (JPG, PNG or WebP; max 3 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="btn">Publish update</button><p class="form-status" role="status"></p></form><h2>Email all subscribers</h2><form id="bc" class="stacked-form"><label>Subject<input name="subject" required maxlength="150"></label><label>Message<textarea name="message" rows="5" required maxlength="5000"></textarea></label><button class="btn">Queue broadcast</button><p class="form-status" role="status"></p></form>`;
  v.querySelector("#up").onsubmit = async event => {
    event.preventDefault();
    const form = event.target, values = Object.fromEntries(new FormData(form)), file = form.querySelector("[name=image]").files[0], status = form.querySelector(".form-status"), button = form.querySelector("button");
    let path = null;
    button.disabled = true;
    try {
      if (file) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
        if (file.size > MAXIMG) throw new Error("Image is too large (maximum 3 MB).");
        const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
        path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const upload = await sb.storage.from("updates").upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
      }
      const image_url = path ? sb.storage.from("updates").getPublicUrl(path).data.publicUrl : null;
      const { data: created, error } = await sb.from("updates").insert({ title: String(values.title).trim(), body: String(values.body).trim(), image_url, published: true }).select("id").single();
      if (error) throw error;
      await auditAdmin("updates", "created", created.id, { title: values.title, image_url });
      status.textContent = "Published.";
      form.reset();
    } catch (error) {
      if (path) await sb.storage.from("updates").remove([path]);
      status.textContent = error.message || "Could not publish update.";
    } finally {
      button.disabled = false;
    }
  };
  v.querySelector("#bc").onsubmit = async event => {
    event.preventDefault();
    const form = event.target, values = Object.fromEntries(new FormData(form));
    try {
      const { data: session } = await sb.auth.getSession();
      const result = await api("submit", { type: "broadcast", subject: String(values.subject).trim(), message: String(values.message).trim(), idempotency_key: crypto.randomUUID() }, session.session?.access_token);
      form.querySelector(".form-status").textContent = result.message;
      form.reset();
    } catch (error) { form.querySelector(".form-status").textContent = error.message; }
  };
};
analyticsAdmin = async function (v) {
 v.innerHTML = `<h2>Analytics</h2><label>Range <select id="analytics-range"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option></select></label><div id="analytics-output">Loading...</div>`;
 const load = async () => {
   const days = Number($("#analytics-range").value), since = new Date(Date.now() - days * 86400000).toISOString();
   const [summary, health, anonymous] = await Promise.all([
     sb.rpc("analytics_admin_summary", { p_since: since }),
     sb.rpc("analytics_tracking_health"),
     sb.rpc("analytics_anonymous_summary", { p_since: since })
   ]);
   if (summary.error) { $("#analytics-output").textContent = `Could not load analytics: ${summary.error.message}`; return; }
   const data = summary.data || {}, h = health.data || {}, a = anonymous.data || {}, last = h.last_event ? new Date(h.last_event) : null;
   const list = (items, key) => `<ul>${(items || []).map(x => `<li>${esc(x[key] ?? "unknown")}: ${esc(x.count)}</li>`).join("") || "<li>None</li>"}</ul>`;
   const daily = data.daily || [], max = Math.max(1, ...daily.map(x => Number(x.count)));
   const bars = daily.map((x, i) => `<rect x="${i * 22}" y="${100 - (Number(x.count) / max * 90)}" width="16" height="${Number(x.count) / max * 90}"></rect>`).join("");
   const stale = !last || Date.now() - last.getTime() > 86400000;
   $("#analytics-output").innerHTML = `<section class="analytics-stats"><h3>Tracking health</h3><p><b>Last recorded event:</b> ${esc(last ? last.toLocaleString() : "Never")}</p><p><b>Events in the last hour:</b> ${esc(h.events_last_hour || 0)}</p>${stale ? '<p class="form-status">Warning: no event has arrived in the last 24 hours.</p>' : ""}</section><p><b>Anonymous (no cookies):</b> ${esc(a.views || 0)} page views in this range. Confirm this aggregate in the privacy policy before production use.</p><button class="btn btn-ghost" id="analytics-export">Export recent events CSV</button><div class="analytics-stats"><p><b>Total visitors:</b> ${esc(data.total_visitors)}</p><p><b>New:</b> ${esc(data.new_visitors)}</p><p><b>Returning:</b> ${esc(data.returning_visitors)}</p><p><b>Page views:</b> ${esc(data.page_views)}</p><p><b>Consent accepted:</b> ${esc(data.consent_accepted)}</p><p><b>Consent rejected:</b> ${esc(data.consent_rejected)}</p></div><div class="analytics-columns"><section><h3>Top pages</h3>${list(data.top_pages, "path")}</section><section><h3>Referrers</h3>${list(data.top_referrers, "referrer")}</section><section><h3>Countries</h3>${list(data.countries, "country")}</section><section><h3>Devices</h3>${list(data.devices, "device")}</section><section><h3>Browsers</h3>${list(data.browsers, "browser")}</section></div><h3>Daily page views</h3><svg class="analytics-chart" viewBox="0 0 ${Math.max(220, daily.length * 22)} 110" role="img" aria-label="Daily page views">${bars}</svg><h3>Recent events</h3><div class="scroll"><table><tr><th>Time</th><th>Event</th><th>Path</th><th>Country</th></tr>${(data.recent_events || []).map(x => `<tr><td>${esc(new Date(x.created_at).toLocaleString())}</td><td>${esc(x.event)}</td><td>${esc(x.path)}</td><td>${esc(x.country || "unknown")}</td></tr>`).join("")}</table></div>`;
   $("#analytics-export").onclick = () => csvDownload("analytics-events.csv", [["created_at", "event", "path", "country"], ...(data.recent_events || []).map(x => [x.created_at, x.event, x.path, x.country || ""])]);
 };
 $("#analytics-range").onchange = load;
 await load();
};
show = async function (t) {
  mark(t);
  const v = $("#view");
  if (t === "programs") return programsAdmin(v);
  if (t === "team") return teamAdmin(v);
  if (t === "partners") return partnersAdmin(v);
  if (t === "services") return servicesAdmin(v);
  if (t === "service requests") return serviceRequestsAdmin(v);
  if (t === "analytics") return analyticsAdmin(v);
  if (t === "compose") return showCompose(v);
  if (T[t]) return tableAdmin(v, t);
};
boot();
