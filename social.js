(() => {
  const paths = {
    x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.681l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z",
    facebook: "M13.5 8H16V4.5h-2.5C10.46 4.5 8 6.96 8 10v2H5v3.5h3V22h3.5v-6.5H15L15.5 12h-4v-2c0-1.1.9-2 2-2Z",
    instagram: "M12 2.2c3.2 0 3.58.01 4.85.07 1.27.06 2.14.26 2.9.56a5.85 5.85 0 0 1 3.42 3.42c.3.76.5 1.63.56 2.9.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.06 1.27-.26 2.14-.56 2.9a5.85 5.85 0 0 1-3.42 3.42c-.76.3-1.63.5-2.9.56-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.27-.06-2.14-.26-2.9-.56a5.85 5.85 0 0 1-3.42-3.42c-.3-.76-.5-1.63-.56-2.9C.21 16.58.2 16.2.2 13s.01-3.58.07-4.85c.06-1.27.26-2.14.56-2.9A5.85 5.85 0 0 1 4.25 1.83c.76-.3 1.63-.5 2.9-.56C8.42 1.21 8.8 1.2 12 1.2Zm0 3.06c-3.15 0-3.52.01-4.76.07-1.15.05-1.77.24-2.19.4a2.78 2.78 0 0 0-1.62 1.62c-.16.42-.35 1.04-.4 2.19-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.05 1.15.24 1.77.4 2.19a2.78 2.78 0 0 0 1.62 1.62c.42.16 1.04.35 2.19.4 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c1.15-.05 1.77-.24 2.19-.4a2.78 2.78 0 0 0 1.62-1.62c.16-.42.35-1.04.4-2.19.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.05-1.15-.24-1.77-.4-2.19a2.78 2.78 0 0 0-1.62-1.62c-.42-.16-1.04-.35-2.19-.4-1.24-.06-1.61-.07-4.76-.07Zm0 2.08a5.66 5.66 0 1 1 0 11.32 5.66 5.66 0 0 1 0-11.32Zm0 9.24a3.58 3.58 0 1 0 0-7.16 3.58 3.58 0 0 0 0 7.16Zm7.21-9.47a1.32 1.32 0 1 1-2.64 0 1.32 1.32 0 0 1 2.64 0Z",
    whatsapp: "M20.52 3.48A11.83 11.83 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.93L.1 24l6.33-1.66a11.87 11.87 0 0 0 5.65 1.44h.01c6.54 0 11.87-5.33 11.87-11.88 0-3.17-1.23-6.15-3.44-8.42Zm-8.44 18.25h-.01a9.84 9.84 0 0 1-5.02-1.37l-.36-.21-3.76.99 1-3.66-.23-.38a9.86 9.86 0 0 1-1.51-5.22C2.19 6.45 6.62 2.02 12.08 2.02c2.64 0 5.12 1.03 6.98 2.9a9.88 9.88 0 0 1 2.89 7.02c0 5.46-4.43 9.89-9.87 9.89Zm5.42-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.7.63.72.23 1.38.2 1.9.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z",
    linkedin: "M5.2 3.6A2.1 2.1 0 1 1 1 3.6a2.1 2.1 0 0 1 4.2 0ZM1.3 8h4v12.7h-4V8Zm6.5 0h3.8v1.74h.05c.53-1 1.83-2.05 3.76-2.05 4.02 0 4.76 2.65 4.76 6.1v6.91h-4v-6.13c0-1.46-.03-3.34-2.04-3.34-2.04 0-2.35 1.59-2.35 3.24v6.23h-4V8Z",
    youtube: "M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.56 9.38.56 9.38.56s7.5 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z",
    tiktok: "M16.5 2h3.1c.2 1.7 1.2 3.1 2.8 4v3.2a8.6 8.6 0 0 1-2.8-1V15a7 7 0 1 1-7-7c.5 0 1 .1 1.4.2v3.4a3.6 3.6 0 1 0 2.5 3.4V2Z"
  };
  const order = ["x", "facebook", "instagram", "whatsapp", "linkedin", "youtube", "tiktok"];
  const config = () => window.CFG?.SOCIAL || {};
  const valid = item => item?.enabled && typeof item.url === "string" && item.url.startsWith("https://");
  const enabled = () => order.filter(platform => valid(config()[platform])).map(platform => ({ platform, ...config()[platform] }));
  const icon = platform => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[platform] || "");
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  };
  const link = (item, named) => {
    if (!item.url.startsWith("https://")) return null;
    const anchor = document.createElement("a");
    anchor.className = "social-link";
    anchor.href = item.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.dataset.platform = item.platform;
    anchor.setAttribute("aria-label", `${item.label.startsWith("Share") ? item.label : `Follow JS Health Initiative on ${item.label}`} (opens in a new tab)`);
    anchor.appendChild(icon(item.platform));
    if (named) {
      const name = document.createElement("span");
      name.textContent = item.label;
      anchor.appendChild(name);
    }
    anchor.addEventListener("click", () => window.jhieTrack?.("social_click", { platform: item.platform }));
    return anchor;
  };
  const renderLinks = (container, named) => enabled().forEach(item => {
    const anchor = link(item, named);
    if (anchor) container.appendChild(anchor);
  });
  const shareLinks = title => {
    const share = document.createElement("div");
    share.className = "share-links";
    share.setAttribute("aria-label", "Share this update");
    [["whatsapp", `https://wa.me/?text=${encodeURIComponent(`${title} ${location.href}`)}`], ["facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`], ["x", `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(location.href)}`], ["linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(location.href)}`]].filter(([platform]) => valid(config()[platform])).forEach(([platform, url]) => {
      const item = { platform, url, label: `Share on ${platform === "x" ? "X" : config()[platform]?.label || platform}` };
      const anchor = link(item, false);
      if (anchor) share.appendChild(anchor);
    });
    return share;
  };
  const init = () => {
    const placeholders = enabled().filter(item => /jshealthinitiative|256700000000/i.test(item.url)).map(item => item.label);
    if (placeholders.length) console.warn("Social links still use placeholder values:", placeholders);
    const footer = document.querySelector(".footer-social");
    if (footer) renderLinks(footer, false);
    const isAdmin = /^\/admin(?:\.html)?\/?$/i.test(location.pathname) || /(^|\/)admin\.html$/i.test(location.pathname);
    if (!isAdmin) {
      if (["contact.html", "get-involved.html"].includes(location.pathname.split("/").pop() || "")) {
        const section = document.createElement("section");
        section.className = "section social-connect";
        const inner = document.createElement("div");
        inner.className = "container";
        const heading = document.createElement("h2");
        heading.textContent = "Connect with us";
        const links = document.createElement("div");
        links.className = "social-links social-links-large";
        renderLinks(links, true);
        inner.append(heading, links);
        section.appendChild(inner);
        document.querySelector("main")?.appendChild(section);
      }
      if (location.pathname.endsWith("/") || location.pathname.endsWith("/index.html") || !location.pathname.split("/").pop()) {
        const strip = document.createElement("section");
        strip.className = "follow-strip";
        strip.innerHTML = '<div class="container"><strong>Follow our work</strong><div class="social-links"></div></div>';
        renderLinks(strip.querySelector(".social-links"), false);
        document.querySelector("main")?.appendChild(strip);
      }
      const whatsapp = enabled().find(item => item.platform === "whatsapp");
      if (whatsapp && localStorage.getItem("jhie_whatsapp_dismissed") !== "1") {
        const button = link(whatsapp, false);
        button.classList.add("whatsapp-float");
        button.dataset.tooltip = "Chat with us on WhatsApp";
        const close = document.createElement("button");
        close.type = "button";
        close.className = "whatsapp-dismiss";
        close.setAttribute("aria-label", "Dismiss WhatsApp chat button");
        close.textContent = "×";
        close.onclick = () => { localStorage.setItem("jhie_whatsapp_dismissed", "1"); button.parentElement.remove(); };
        const wrapper = document.createElement("div");
        wrapper.className = "whatsapp-widget";
        wrapper.append(button, close);
        document.body.appendChild(wrapper);
      }
    }
  };
  window.jhieSocial = { init, shareLinks, enabled };
})();
