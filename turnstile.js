(() => {
  const protectedForms = () => [...document.querySelectorAll("form[data-turnstile]")];
  const message = (form, text, retry = false) => {
    let box = form.querySelector(".turnstile-status");
    if (!box) {
      box = document.createElement("p");
      box.className = "form-status turnstile-status";
      box.setAttribute("role", "alert");
      form.querySelector(".cf-turnstile")?.after(box);
    }
    box.textContent = text;
    if (retry && !box.querySelector("button")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-link";
      button.textContent = "Try again";
      button.addEventListener("click", () => {
        box.textContent = "";
        window.jhieTurnstileRender?.(form);
      });
      box.append(" ", button);
    }
  };
  const setSubmitState = (form, enabled) => {
    const button = form.querySelector('button[type="submit"], button:not([type])');
    if (button) button.disabled = !enabled;
    form.dataset.turnstileReady = enabled ? "true" : "false";
  };
  const clearWidget = form => {
    const widget = form.dataset.turnstileWidget;
    if (widget && window.turnstile) {
      if (typeof window.turnstile.remove === "function") window.turnstile.remove(widget);
      else if (typeof window.turnstile.reset === "function") window.turnstile.reset(widget);
    }
    delete form.dataset.turnstileWidget;
  };
  const render = (form, force = false) => {
    if (!form) return;
    const container = form.querySelector(".cf-turnstile");
    if (!container) return;
    if (!force && form.dataset.turnstileWidget) return;
    setSubmitState(form, false);
    if (!window.CFG?.TURNSTILE_SITEKEY) {
      message(form, "Security verification is not configured. Please try again later.", true);
      return;
    }
    if (!window.turnstile || typeof window.turnstile.render !== "function") {
      message(form, "Security verification could not load. Check your connection or disable your ad blocker, then try again.", true);
      return;
    }
    clearWidget(form);
    container.replaceChildren();
    try {
      const widget = window.turnstile.render(container, {
        sitekey: window.CFG.TURNSTILE_SITEKEY,
        size: "flexible",
        action: form.dataset.turnstileAction || form.dataset.type || "submit",
        callback: token => {
          let input = form.querySelector('input[name="turnstile_token"]');
          if (!input) {
            input = document.createElement("input");
            input.type = "hidden";
            input.name = "turnstile_token";
            form.appendChild(input);
          }
          input.value = token;
          form.dataset.turnstileReady = "true";
          setSubmitState(form, true);
          message(form, "");
        },
        "error-callback": () => {
          clearWidget(form);
          setSubmitState(form, false);
          message(form, "Security verification failed. Please try again.", true);
        },
        "expired-callback": () => {
          const input = form.querySelector('input[name="turnstile_token"]');
          if (input) input.value = "";
          clearWidget(form);
          setSubmitState(form, false);
          message(form, "Security verification expired. Please try again.", true);
        }
      });
      form.dataset.turnstileWidget = String(widget);
    } catch (error) {
      clearWidget(form);
      console.error("Turnstile widget could not be rendered.", error);
      message(form, "Security verification could not load. Check your connection or disable your ad blocker, then try again.", true);
    }
  };
  const renderAll = () => protectedForms().forEach(render);
  window.jhieTurnstileRender = form => {
    if (form) render(form, true);
    else renderAll();
  };
  window.jhieTurnstileReset = form => {
    const input = form?.querySelector('input[name="turnstile_token"]');
    if (input) input.value = "";
    if (form) {
      const widget = form.dataset.turnstileWidget;
      if (widget && window.turnstile && typeof window.turnstile.reset === "function") {
        window.turnstile.reset(widget);
      }
      setSubmitState(form, false);
    }
  };
  window.jhieTurnstileScriptReady = () => renderAll();
  document.addEventListener("DOMContentLoaded", renderAll);
  window.addEventListener("load", renderAll);
})();
