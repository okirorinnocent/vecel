(() => {
  const form = document.querySelector("#delete-analytics");
  if (!form) return;
  form.onsubmit = async event => {
    event.preventDefault();
    const status = form.querySelector(".form-status");
    const visitor = document.cookie.split("; ").find(x => x.startsWith("jhie_vid="))?.split("=")[1];
    if (!visitor) { status.textContent = "No analytics visitor cookie was found on this browser."; return; }
    try {
      const response = await fetch(`${CFG.SUPA}/rest/v1/rpc/delete_my_analytics`, { method: "POST", headers: { apikey: CFG.KEY, "Content-Type": "application/json" }, body: JSON.stringify({ p_visitor_id: decodeURIComponent(visitor) }) });
      if (!response.ok) throw new Error("We could not delete the analytics data.");
      status.textContent = "Your analytics data deletion request was completed.";
    } catch (error) { status.textContent = error.message; }
  };
})();
