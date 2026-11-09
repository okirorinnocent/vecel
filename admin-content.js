(() => {
  const imageTypes = ["image/jpeg", "image/png", "image/webp"];
  const val = (form, name) => String(new FormData(form).get(name) || "").trim();
  const checked = (form, name) => new FormData(form).get(name) === "on";
  const formFields = (fields, row = {}) => fields.map(([name, label, type]) => type === "textarea"
    ? `<label>${label}<textarea name="${name}" maxlength="${name === "body" || name === "bio" ? 5000 : 3000}">${esc(row[name] || "")}</textarea></label>`
    : type === "file" ? `<label>${label}<input name="${name}" type="file" accept="image/jpeg,image/png,image/webp"></label>`
    : type === "checkbox" ? `<label class="check"><input name="${name}" type="checkbox"${row[name] ? " checked" : ""}>${label}</label>`
    : `<label>${label}<input name="${name}" type="${type || "text"}" value="${esc(row[name] || "")}" maxlength="${name === "email" ? 254 : 300}"></label>`).join("");
  const edit = (title, fields, row = {}, extras = "") => `<h2>${title}</h2><form class="stacked-form content-edit">${formFields(fields, row)}${extras}<button class="btn">Save</button><button type="button" class="btn btn-ghost cancel-edit">Cancel</button><p class="form-status" role="status"></p></form>`;
  const refresh = (view, fn) => fn(view);
  const save = async (table, id, form, fields) => {
    const data = Object.fromEntries(fields.map(([name]) => [name, val(form, name)]));
    const { error } = id ? await sb.from(table).update(data).eq("id", id) : await sb.from(table).insert(data);
    if (error) throw error;
  };
  const upload = async (bucket, file, max) => {
    if (!file || !file.size) return null;
    if (!imageTypes.includes(file.type) || file.type === "image/svg+xml") throw new Error("Use a JPG, PNG or WebP file.");
    if (file.size > max) throw new Error(`File is too large (maximum ${max / 1024 / 1024} MB).`);
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
  const table = (rows, columns, actions = true, reorder = false) => `<div class="scroll"><table><thead><tr>${columns.map(x => `<th>${esc(x[1])}</th>`).join("")}${actions ? "<th>Actions</th>" : ""}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(([key]) => `<td>${esc(row[key] ?? "")}</td>`).join("")}${actions ? `<td><button class="btn btn-ghost edit-row" data-id="${esc(row.id)}">Edit</button> <button class="btn btn-ghost delete-row" data-id="${esc(row.id)}">${reorder ? "Delete" : "Delete"}</button>${reorder ? ` <button class="btn btn-ghost move-row" data-id="${esc(row.id)}" data-dir="-1" aria-label="Move up">↑</button><button class="btn btn-ghost move-row" data-id="${esc(row.id)}" data-dir="1" aria-label="Move down">↓</button>` : ""}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
  async function contentAdmin(view, tableName, title, fields, columns, options = {}) {
    const { data, error } = await sb.from(tableName).select("*").order("sort_order", { ascending: true });
    if (error) { view.textContent = `Could not load ${title}: ${error.message}`; return; }
    view.innerHTML = `<div class="section-heading"><h2>${title} (${data.length})</h2><button class="btn" id="new-content">Add new</button></div>${data.length ? table(data, columns, true, options.reorder) : '<p class="muted">Nothing added yet.</p>'}`;
    const open = row => {
      view.innerHTML = edit(row ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`, fields, row || {}, options.extras ? options.extras(row || {}) : "");
      const form = view.querySelector("form"), uploadField = form.querySelector('input[type="file"]');
      form.querySelector(".cancel-edit").onclick = () => contentAdmin(view, tableName, title, fields, columns, options);
      form.onsubmit = async event => {
        event.preventDefault();
        try {
          const dataToSave = Object.fromEntries(fields.filter(x => x[2] !== "file" && x[0] !== "published" && x[0] !== "show_email" && x[0] !== "show_phone").map(([name]) => [name, val(form, name)]));
          ["published", "show_email", "show_phone"].forEach(name => { if (fields.some(x => x[0] === name)) dataToSave[name] = checked(form, name); });
          if (options.validate) options.validate(dataToSave);
          if (options.slugFromTitle && !dataToSave.slug) dataToSave.slug = dataToSave.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          if (options.removeUpload && form.querySelector("[name=remove_upload]")?.checked) dataToSave[options.uploadColumn] = null;
          if (uploadField && uploadField.files[0]) dataToSave[options.uploadColumn] = await upload(options.bucket, uploadField.files[0], options.max);
          if (options.selects) Object.assign(dataToSave, options.selects(form));
          const result = row ? await sb.from(tableName).update(dataToSave).eq("id", row.id) : await sb.from(tableName).insert(dataToSave);
          if (result.error) throw result.error;
          await contentAdmin(view, tableName, title, fields, columns, options);
        } catch (error) { form.querySelector(".form-status").textContent = error.message; }
      };
    };
    view.querySelector("#new-content")?.addEventListener("click", () => open(null));
    view.querySelectorAll(".edit-row").forEach(button => button.onclick = () => open(data.find(row => row.id === button.dataset.id)));
    view.querySelectorAll(".delete-row").forEach(button => button.onclick = async () => { if (!confirm("Delete this item?")) return; const { error: deleteError } = await sb.from(tableName).delete().eq("id", button.dataset.id); if (deleteError) alert(deleteError.message); else contentAdmin(view, tableName, title, fields, columns, options); });
    view.querySelectorAll(".move-row").forEach(button => button.onclick = async () => {
      const index = data.findIndex(row => row.id === button.dataset.id), other = data[index + Number(button.dataset.dir)];
      if (!other) return;
      const first = await sb.from(tableName).update({ sort_order: other.sort_order }).eq("id", data[index].id);
      const second = await sb.from(tableName).update({ sort_order: data[index].sort_order }).eq("id", other.id);
      if (first.error || second.error) alert("Could not reorder items."); else contentAdmin(view, tableName, title, fields, columns, options);
    });
  }
  const teamFields = [["name", "Name", "text"], ["role_title", "Role title", "text"], ["department", "Department", "text"], ["bio", "Bio", "textarea"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["linkedin_url", "LinkedIn URL", "url"], ["sort_order", "Sort order", "number"], ["published", "Published", "checkbox"], ["show_email", "Show email (only with consent)", "checkbox"], ["show_phone", "Show phone (only with consent)", "checkbox"], ["photo", "Photo (JPG, PNG or WebP; max 2 MB)", "file"]];
  const partnerFields = [["name", "Name", "text"], ["partner_type", "Type (hospital, university, company, ngo, government, organisation)", "text"], ["description", "Description", "textarea"], ["website_url", "Website URL (HTTPS only)", "url"], ["partner_since", "Partner since", "text"], ["sort_order", "Sort order", "number"], ["published", "Published", "checkbox"], ["logo", "Logo (JPG, PNG or WebP; max 1 MB)", "file"]];
  const serviceFields = [["slug", "Slug", "text"], ["title", "Title", "text"], ["summary", "Summary", "textarea"], ["body", "Body", "textarea"], ["sort_order", "Sort order", "number"], ["published", "Published", "checkbox"]];
  window.teamAdmin = view => contentAdmin(view, "team_members", "Team members", teamFields, [["name", "Name"], ["role_title", "Role"], ["department", "Department"], ["published", "Published"]], { reorder: true, bucket: "team-photos", uploadColumn: "photo_url", max: 2 * 1024 * 1024, removeUpload: true, extras: () => '<label class="check"><input name="remove_upload" type="checkbox">Remove current photo</label>', validate: data => { if (!data.name || !data.role_title) throw new Error("Name and role are required."); } });
  window.partnersAdmin = view => contentAdmin(view, "partners", "Partners", partnerFields, [["name", "Name"], ["partner_type", "Type"], ["published", "Published"]], { bucket: "partner-logos", uploadColumn: "logo_url", max: 1024 * 1024, removeUpload: true, extras: () => '<label class="check"><input name="remove_upload" type="checkbox">Remove current logo</label>', validate: data => { if (!data.name || !data.partner_type) throw new Error("Name and type are required."); if (data.website_url && !/^https:\/\//i.test(data.website_url)) throw new Error("Website URL must use HTTPS."); } });
  window.servicesAdmin = view => contentAdmin(view, "services", "Services", serviceFields, [["title", "Title"], ["slug", "Slug"], ["sort_order", "Order"], ["published", "Published"]], { slugFromTitle: true, validate: data => { if (!data.title || !data.summary || !data.body) throw new Error("Title, summary and body are required."); if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error("Use a lowercase hyphenated slug."); } });
  window.serviceRequestsAdmin = async view => {
    const status = view.dataset.status || "all", query = sb.from("service_requests").select("*").order("created_at", { ascending: false });
    const { data, error } = await (status === "all" ? query : query.eq("status", status));
    if (error) { view.textContent = `Could not load service requests: ${error.message}`; return; }
    view.innerHTML = `<h2>Service requests (${data.length})</h2><p><label>Filter <select id="request-filter"><option value="all">All</option>${["new", "reviewed", "contacted", "done"].map(x => `<option ${x === status ? "selected" : ""}>${x}</option>`).join("")}</select></label> <button class="btn btn-ghost" id="requests-csv">Export CSV</button></p>${table(data, [["created_at", "Created"], ["facility_name", "Facility"], ["district", "District"], ["contact_name", "Contact"], ["email", "Email"], ["service_type", "Service"], ["status", "Status"]], false)} `;
    view.querySelectorAll("tbody tr").forEach((row, index) => { const cell = row.children[6]; cell.innerHTML = `<select data-id="${esc(data[index].id)}">${["new", "reviewed", "contacted", "done"].map(x => `<option ${x === data[index].status ? "selected" : ""}>${x}</option>`).join("")}</select>`; cell.querySelector("select").onchange = async event => { const { error: updateError } = await sb.from("service_requests").update({ status: event.target.value }).eq("id", event.target.dataset.id); if (updateError) alert(updateError.message); }; });
    view.querySelector("#request-filter").onchange = event => { view.dataset.status = event.target.value; serviceRequestsAdmin(view); };
    view.querySelector("#requests-csv").onclick = () => { const csv = [Object.keys(data[0] || {}).join(","), ...data.map(row => Object.values(row).map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))].join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "service-requests.csv"; link.click(); URL.revokeObjectURL(link.href); };
  };
})();
