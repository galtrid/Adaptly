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
      <img src="src/house.svg" alt="Home" id="sidebarHomeImg" style="width: 24px; height: 24px;" aria-hidden="true" />
    `;
  }

  function iconApps() {
    return `
      <img src="src/skills.svg" alt="Apps" id="sidebarAppsImg" style="width: 24px; height: 24px;" aria-hidden="true" />
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

  function iconThemeSun() {
    // Sun icon for light mode
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" stroke-width="2">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    `;
  }

  function iconThemeMoon() {
    // Moon icon for dark mode
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
          <img src="src/alpha.png" alt="Adaptly logo" class="app-sidebar__brand-mark" id="sidebarBrandImg" />
        </button>

        <div class="app-sidebar__active-bg" aria-hidden="true"></div>

        <button class="app-sidebar__item app-sidebar__item--active app-sidebar__item--home" type="button" aria-label="Home">
          ${iconHome()}
        </button>

        <button class="app-sidebar__item app-sidebar__item--apps" type="button" aria-label="Roadmaps">
          ${iconApps()}
        </button>

        <button id="themeToggleBtn" class="app-sidebar__item app-sidebar__item--theme" type="button" aria-label="Toggle theme">
          <span class="theme-icon-container"></span>
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
    
    // Theme toggle setup
    const themeBtn = document.getElementById("themeToggleBtn");
    const themeIconContainer = themeBtn.querySelector(".theme-icon-container");
    const brandImg = document.getElementById("sidebarBrandImg");
    const homeImg = document.getElementById("sidebarHomeImg");
    const appsImg = document.getElementById("sidebarAppsImg");

    function updateThemeUI(theme) {
      if (theme === "dark") {
        themeIconContainer.innerHTML = iconThemeMoon();
        brandImg.src = "src/alpha-dark.png";
        if (homeImg) homeImg.src = "src/home_dark.svg";
        if (appsImg) appsImg.src = "src/skills_dark.svg";
      } else {
        themeIconContainer.innerHTML = iconThemeSun();
        brandImg.src = "src/alpha.png";
        if (homeImg) homeImg.src = "src/house.svg";
        if (appsImg) appsImg.src = "src/skills.svg";
      }
    }

    // Set initial icon and internal state
    const currentTheme = getPreferredTheme();
    updateThemeUI(currentTheme);

    themeBtn.addEventListener("click", () => {
      const newTheme = document.body.dataset.sidebarTheme === "dark" ? "light" : "dark";
      window.setSidebarTheme(newTheme);
      updateThemeUI(newTheme);
    });
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
