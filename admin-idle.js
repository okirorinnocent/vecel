const ADMIN_IDLE_TIMEOUT_MS = 240000;

(() => {
  const ACTIVE_KEY = "jhie_admin_last_active";
  const WARNING_WINDOW_MS = 30000;
  const CHECK_INTERVAL_MS = 1000;
  const activityEvents = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click", "wheel"];
  let lastActivityWrite = 0;
  let lastActivity = 0;
  let timer = null;
  let warning = null;
  let timingOut = false;

  const panelVisible = () => {
    const panel = document.querySelector("#panel");
    return Boolean(panel && !panel.hidden);
  };

  const readActivity = () => {
    try {
      const value = Number(localStorage.getItem(ACTIVE_KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  };

  const writeActivity = value => {
    try {
      localStorage.setItem(ACTIVE_KEY, String(value));
    } catch {
      // In-memory timing still protects this tab when storage is unavailable.
    }
  };

  const removeActivity = () => {
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // The session is still signed out if storage is unavailable.
    }
  };

  const hideWarning = () => {
    if (warning) warning.remove();
    warning = null;
  };

  const showWarning = seconds => {
    if (!warning) {
      warning = document.createElement("aside");
      warning.className = "idle-warning";
      warning.setAttribute("role", "alert");
      document.body.appendChild(warning);
    }
    warning.textContent = `You will be signed out in ${seconds}s because of inactivity. Move your mouse or press a key to stay signed in.`;
  };

  const refreshActivity = now => {
    lastActivity = now;
    writeActivity(now);
    hideWarning();
  };

  const signOutForIdle = async () => {
    if (timingOut) return;
    timingOut = true;
    hideWarning();
    try {
      await window.jhieAudit?.("admin", "idle_signout", null, { reason: "inactivity" });
    } catch (error) {
      console.warn("Idle sign-out audit failed:", error);
    }
    try {
      await sb.auth.signOut();
    } catch (error) {
      console.warn("Idle sign-out failed:", error);
    }
    document.querySelector("#view").textContent = "";
    removeActivity();
    await window.boot?.();
    const status = document.querySelector("#ls");
    if (status) status.textContent = "You were signed out after 4 minutes of inactivity. Please sign in again.";
    timingOut = false;
  };

  const check = () => {
    if (!panelVisible()) {
      hideWarning();
      return;
    }
    const now = Date.now();
    const stored = readActivity();
    if (stored > lastActivity) lastActivity = stored;
    if (!lastActivity) refreshActivity(now);
    const elapsed = now - lastActivity;
    if (elapsed >= ADMIN_IDLE_TIMEOUT_MS) {
      signOutForIdle();
      return;
    }
    const remaining = ADMIN_IDLE_TIMEOUT_MS - elapsed;
    if (remaining <= WARNING_WINDOW_MS) showWarning(Math.max(0, Math.ceil(remaining / 1000)));
    else hideWarning();
  };

  const handleActivity = () => {
    if (!panelVisible() || timingOut) return;
    const now = Date.now();
    if (now - lastActivityWrite < 1000) return;
    lastActivityWrite = now;
    refreshActivity(now);
  };

  const start = () => {
    if (timer) return;
    lastActivity = readActivity();
    const now = Date.now();
    if (lastActivity && now - lastActivity >= ADMIN_IDLE_TIMEOUT_MS) {
      signOutForIdle();
      return;
    }
    refreshActivity(lastActivity || now);
    timer = window.setInterval(check, CHECK_INTERVAL_MS);
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
    hideWarning();
  };

  activityEvents.forEach(eventName => document.addEventListener(eventName, handleActivity, { passive: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("storage", event => {
    if (event.key !== ACTIVE_KEY || timingOut) return;
    if (event.newValue === null) {
      if (panelVisible()) signOutForIdle();
      return;
    }
    const value = Number(event.newValue);
    if (Number.isFinite(value) && value > lastActivity) {
      lastActivity = value;
      hideWarning();
    }
  });

  const observePanel = () => {
    if (panelVisible()) start();
    else stop();
  };
  window.jhieAdminIdle = { clear: removeActivity };
  const panel = document.querySelector("#panel");
  if (panel) new MutationObserver(observePanel).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("DOMContentLoaded", observePanel);
})();
