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

        <div class="app-sidebar__active-bg" aria-hidden="true" id="sidebarActiveBg"></div>

        <button class="app-sidebar__item app-sidebar__item--active app-sidebar__item--home" id="homeBtn" type="button" aria-label="Home">
          ${iconHome()}
        </button>

        <button id="themeToggleBtn" class="app-sidebar__item app-sidebar__item--theme" type="button" aria-label="Toggle theme">
          <span class="theme-icon-container"></span>
        </button>

        <button id="profileBtn" class="app-sidebar__item app-sidebar__item--profile" type="button" aria-label="Sign out">
          ${iconProfile()}
        </button>
      </div>

      <div class="app-sidebar__panel" aria-hidden="true">
        <div class="app-sidebar__panel-frame">
          <div class="app-sidebar__panel-surface">
            <div id="sidebarContentRoadmaps" style="display: none; height: 100%;"></div>
            <div id="sidebarContentProfile" style="display: none; height: 100%; position: relative;">
               <div style="position: absolute; bottom: 33px; left: 23px;">
                  <p id="sidebarProfileUsername" style="font-family: 'Inter', sans-serif; font-weight: 600; font-size: 20px; color: var(--sidebar-icon); margin: 0; line-height: normal;">Username</p>
                  <p id="sidebarProfileEmail" style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 14px; color: #676767; margin: 0; line-height: normal; margin-top: 4px;">email@gmail.com</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertBefore(sidebar, document.body.firstChild);
    
    // Theme toggle setup
    const themeBtn = document.getElementById("themeToggleBtn");
    const themeIconContainer = themeBtn.querySelector(".theme-icon-container");
    const brandImg = document.getElementById("sidebarBrandImg");
    const homeImg = document.getElementById("sidebarHomeImg");
    
    // Sidebar behavior
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const sidebarRoadmaps = document.getElementById("sidebarContentRoadmaps");
    const sidebarProfile = document.getElementById("sidebarContentProfile");
    const sidebarActiveBg = document.getElementById("sidebarActiveBg");

    let currentOpenPanel = null; // 'home' or 'profile' or null

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      currentOpenPanel = null;
      homeBtn.classList.remove("app-sidebar__item--active");
      profileBtn.classList.remove("app-sidebar__item--active");
    }

    function openSidebar(panelName) {
      // Toggle off if clicking the same panel
      if (currentOpenPanel === panelName) {
        closeSidebar();
        return;
      }
      
      sidebar.classList.add("is-open");
      currentOpenPanel = panelName;
      
      // Update active state and background position
      homeBtn.classList.remove("app-sidebar__item--active");
      profileBtn.classList.remove("app-sidebar__item--active");
      
      if (panelName === 'home') {
        homeBtn.classList.add("app-sidebar__item--active");
        sidebarActiveBg.style.top = "116px";
        if (sidebarRoadmaps) sidebarRoadmaps.style.display = "block";
        if (sidebarProfile) sidebarProfile.style.display = "none";
      } else if (panelName === 'profile') {
        profileBtn.classList.add("app-sidebar__item--active");
        sidebarActiveBg.style.top = "15px"; // bottom:30px is 1024-30-24 = 970. Actually, we can use CSS transform or bottom coordinate.
        sidebarActiveBg.style.top = "auto";
        sidebarActiveBg.style.bottom = "18px"; // profile btn is at bottom 30px, btn height 24, bg is 48. Let's do bottom: 18px.
        if (sidebarRoadmaps) sidebarRoadmaps.style.display = "none";
        if (sidebarProfile) sidebarProfile.style.display = "block";
        
        // Populate profile info if available
        const username = localStorage.getItem("username") || "Username";
        const email = localStorage.getItem("email") || "email@gmail.com";
        const nameEl = document.getElementById("sidebarProfileUsername");
        const emailEl = document.getElementById("sidebarProfileEmail");
        if(nameEl) nameEl.textContent = username;
        if(emailEl) emailEl.textContent = email;
      }
    }

    homeBtn.addEventListener("click", () => {
      sidebarActiveBg.style.bottom = "auto";
      sidebarActiveBg.style.top = "116px";
      openSidebar('home');
    });

    profileBtn.addEventListener("click", () => {
      openSidebar('profile');
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!sidebar.contains(e.target) && currentOpenPanel !== null) {
        closeSidebar();
      }
    });

    function updateThemeUI(theme) {
      if (theme === "dark") {
        themeIconContainer.innerHTML = iconThemeMoon();
        brandImg.src = "src/alpha-dark.png";
        if (homeImg) homeImg.src = "src/home_dark.svg";
      } else {
        themeIconContainer.innerHTML = iconThemeSun();
        brandImg.src = "src/alpha.png";
        if (homeImg) homeImg.src = "src/house.svg";
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
