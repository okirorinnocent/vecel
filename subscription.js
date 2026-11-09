(() => {
  const box = document.querySelector("#subscription-action");
  if (!box) return;
  const params = new URLSearchParams(location.search);
  const token = params.get("unsub") || params.get("confirm");
  const type = params.get("confirm") ? "confirm" : "unsubscribe";
  if (!token) { box.innerHTML = "<p>This link is missing a valid token.</p>"; return; }
  box.innerHTML = `<p>${type === "confirm" ? "Confirm your subscription to receive occasional updates." : "Stop receiving occasional updates from JS Health Initiative?"}</p><button class="btn" id="subscription-submit">${type === "confirm" ? "Confirm subscription" : "Unsubscribe"}</button><p class="form-status" role="status"></p>`;
  box.querySelector("#subscription-submit").onclick = async event => {
    const status = box.querySelector(".form-status");
    event.target.disabled = true;
    try {
      const response = await fetch(`${CFG.SUPA}/functions/v1/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed.");
      status.textContent = result.message;
    } catch (error) {
      status.textContent = error.message;
      event.target.disabled = false;
    }
  };
})();
