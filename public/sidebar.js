(function () {
  const STORAGE_KEY = "sidebar-theme";

  function getPreferredTheme() {
    const explicitTheme = document.body.dataset.sidebarTheme;
    if (explicitTheme === "light" || explicitTheme === "dark") {
      return explicitTheme;
    }

    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") {
      return;
    }

    document.body.dataset.sidebarTheme = theme;
  }

  function applyTheme() {
    setTheme(getPreferredTheme());

    window.setSidebarTheme = function (theme) {
      if (theme !== "light" && theme !== "dark") {
        return;
      }
      localStorage.setItem(STORAGE_KEY, theme);
      setTheme(theme);
    };
  }

  function iconHome() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
      </svg>
    `;
  }

  function iconApps() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="7" cy="7" r="2.5" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="12" cy="17" r="2.5" />
        <path d="M9.2 8.4l1.5 6" />
        <path d="M14.8 8.4l-1.5 6" />
      </svg>
    `;
  }

  function iconSettings() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.86.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.8a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.8a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.86-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.4.6.67 1 .6h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1 .4 1.7 1.7 0 0 0-.6 1Z" />
      </svg>
    `;
  }

  function iconProfile() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    `;
  }

  function buildSidebar() {
    if (document.querySelector(".app-sidebar")) {
      return;
    }

    document.body.classList.add("has-sidebar");

    const sidebar = document.createElement("aside");
    sidebar.className = "app-sidebar";
    sidebar.setAttribute("aria-label", "Primary navigation");

    sidebar.innerHTML = `
      <div class="app-sidebar__rail">
        <button class="app-sidebar__brand" type="button" aria-label="Ureeka home">
          <span class="app-sidebar__brand-mark">α</span>
        </button>

        <button class="app-sidebar__item app-sidebar__item--active app-sidebar__item--home" type="button" aria-label="Home">
          ${iconHome()}
        </button>

        <button class="app-sidebar__item app-sidebar__item--apps" type="button" aria-label="Roadmaps">
          ${iconApps()}
        </button>

        <button class="app-sidebar__item app-sidebar__item--settings" type="button" aria-label="Settings">
          ${iconSettings()}
        </button>

        <button id="logoutBtn" class="app-sidebar__item app-sidebar__item--profile" type="button" aria-label="Sign out">
          ${iconProfile()}
        </button>
      </div>

      <div class="app-sidebar__panel" aria-hidden="true">
        <div class="app-sidebar__panel-frame">
          <div class="app-sidebar__panel-surface"></div>
        </div>
      </div>
    `;

    document.body.insertBefore(sidebar, document.body.firstChild);
  }

  function init() {
    applyTheme();
    buildSidebar();
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
