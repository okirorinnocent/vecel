(() => {
  const render = () => {
    if (!window.turnstile || !window.CFG?.TURNSTILE_SITE_KEY) return;
    document.querySelectorAll("form[data-turnstile]").forEach(form => {
      const container = form.querySelector(".cf-turnstile");
      if (!container || container.dataset.rendered) return;
      container.dataset.rendered = "true";
      window.turnstile.render(container, {
        sitekey: window.CFG.TURNSTILE_SITE_KEY,
        callback: token => {
          let input = form.querySelector('input[name="cf-turnstile-response"]');
          if (!input) {
            input = document.createElement("input");
            input.type = "hidden";
            input.name = "cf-turnstile-response";
            form.appendChild(input);
          }
          input.value = token;
        },
        "expired-callback": () => {
          const input = form.querySelector('input[name="cf-turnstile-response"]');
          if (input) input.value = "";
        }
      });
    });
  };
  window.jhieTurnstileRender = render;
  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("load", render);
})();
