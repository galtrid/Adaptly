async function checkAuth() {
    try {
        const res = await fetch("/roadmap/user", { credentials: "include" });
        if (!res.ok) window.location.href = "login.html";
    } catch {
        window.location.href = "login.html";
    }
}

function loadUser() {
    const username = localStorage.getItem("username") || "User";
    document.getElementById("welcomeName").textContent = username;
}

function setupSidebarRoadmaps() {
    const surface = document.getElementById("sidebarContentRoadmaps");
    if (!surface) return;
    surface.innerHTML = `
        <div class="sidebar-roadmaps">
            <p class="sidebar-roadmaps__title" style="margin-top: 0; padding-top: 10px;">My Roadmaps</p>
            <div id="roadmapsList"></div>
        </div>
    `;
}

async function loadRoadmaps() {
    try {
        const data = await apiFetch("/roadmap/user");
        const list = document.getElementById("roadmapsList");
        if (!list) return;
        if (!data.roadmaps.length) { list.innerHTML = `<p class="sidebar-roadmaps__empty">No roadmaps yet</p>`; return; }

        list.innerHTML = data.roadmaps.map(r =>
            `<div class="sidebar-roadmap-item" data-id="${r.id}" data-title="${r.title.replace(/"/g, '&quot;')}">
                <span>${r.title}</span>
                <button class="rm-delete-btn" title="Delete">🗑</button>
            </div>`
        ).join("");

        list.querySelectorAll(".sidebar-roadmap-item").forEach(el => {
            el.querySelector("span").addEventListener("click", () => loadRoadmap(+el.dataset.id, el.dataset.title));
            el.querySelector(".rm-delete-btn").addEventListener("click", e => { e.stopPropagation(); deleteRoadmap(+el.dataset.id); });
        });
    } catch (err) {
        console.error("Failed to load roadmaps:", err);
    }
}

async function deleteRoadmap(id) {
    if (!confirm("Delete this roadmap?")) return;
    await apiFetch(`/roadmap/${id}`, "DELETE");
    document.getElementById("roadmapSection").style.display = "none";
    loadRoadmaps();
}

async function loadRoadmap(id, title) {
    try {
        const data = await apiFetch(`/roadmap/${id}/items`);
        const roadmap = { id, title, items: data.items.map(item => ({ id: item.id, text: item.text, indent_level: item.indent_level, completed: item.completed })) };
        renderRoadmap(roadmap);
        document.getElementById("roadmapSection").style.display = "block";
    } catch (err) {
        console.error("Failed to load roadmap:", err);
    }
}

async function apiFetch(path, method = "GET", body) {
    const res = await fetch(path, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : null
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}

document.getElementById("generateForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const skill = document.getElementById("skillInput").value.trim();
    const btn = document.getElementById("generateBtn");
    const status = document.getElementById("generateStatus");
    const canvas = document.getElementById("roadmapCanvas");

    if (!skill) {
        status.textContent = "Enter a skill";
        return;
    }

    btn.disabled = true;
    status.textContent = "Generating...";
    document.getElementById("roadmapSection").style.display = "block";
    canvas.innerHTML = "Loading...";

    try {
        const data = await apiFetch("/roadmap/generate", "POST", { skill });

        renderRoadmap(data.roadmap);
        status.textContent = "Done!";
        loadRoadmaps(); // refresh the list
    } catch (err) {
        status.textContent = "Error: " + err.message;
    } finally {
        btn.disabled = false;
    }
});

// Group flat items into phases (indent 0 = phase header)
function groupIntoPhases(items) {
    const phases = [];
    let current = null;
    for (const item of items) {
        if (item.indent_level === 0) {
            current = { ...item, children: [] };
            phases.push(current);
        } else if (current) {
            current.children.push(item);
        }
    }
    return phases;
}

// completed → current → locked (strictly sequential)
function getPhaseStates(phases) {
    let foundCurrent = false;
    return phases.map(phase => {
        const allDone = phase.children.length > 0 && phase.children.every(c => c.completed);
        if (foundCurrent)      return "locked";
        if (allDone)           return "completed";
        foundCurrent = true;   return "current";
    });
}

function renderRoadmap(roadmap) {
    const canvas = document.getElementById("roadmapCanvas");
    document.getElementById("roadmapTitle").textContent = roadmap.title || "Roadmap";

    const phases = groupIntoPhases(roadmap.items);
    const states = getPhaseStates(phases);
    const icons  = { completed: "✅", current: "⭐", locked: "🔒" };
    const sides  = ["node-left", "node-right"];

    canvas.innerHTML = `<div class="roadmap-path">${phases.map((phase, i) => {
        const state = states[i];
        const tasks = phase.children.map(t => `
            <label class="task-item ${t.completed ? "task-item--done" : ""} ${t.indent_level === 2 ? "task-item--sub" : ""}">
                <input type="checkbox" data-id="${t.id}" ${t.completed ? "checked" : ""} ${state === "locked" ? "disabled" : ""}>
                <span>${t.text}</span>
            </label>`).join("");

        return `
            ${i > 0 ? `<div class="path-line ${states[i-1] === "completed" ? "path-line--done" : ""}"></div>` : ""}
            <div class="path-node path-node--${state} ${sides[i % 2]}" data-index="${i}">
                <div class="path-node__bubble">
                    <div class="path-node__icon">${icons[state]}</div>
                    <div class="path-node__title">${phase.text}</div>
                    ${phase.children.length ? '<div class="path-node__chevron">▾</div>' : ""}
                </div>
                ${phase.children.length ? `<div class="path-node__tasks" style="display:none">${tasks}</div>` : ""}
            </div>`;
    }).join("")}</div>`;

    // Expand / collapse on click
    canvas.querySelectorAll(".path-node__bubble").forEach(bubble => {
        bubble.addEventListener("click", () => {
            const node = bubble.closest(".path-node");
            if (node.classList.contains("path-node--locked")) return;
            const panel = node.querySelector(".path-node__tasks");
            if (!panel) return;
            const open = panel.style.display !== "none";
            panel.style.display = open ? "none" : "block";
            bubble.classList.toggle("is-open", !open);
        });
    });

    // Checkbox changes → save + refresh states
    canvas.querySelectorAll("input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", () => {
            apiFetch(`/roadmap/items/${cb.dataset.id}/complete`, "PATCH", { completed: cb.checked });
            cb.closest("label").classList.toggle("task-item--done", cb.checked);
            refreshPhaseStates();
        });
    });

    // Auto-open the current phase
    const current = canvas.querySelector(".path-node--current");
    if (current) {
        const panel = current.querySelector(".path-node__tasks");
        if (panel) { panel.style.display = "block"; current.querySelector(".path-node__bubble").classList.add("is-open"); }
    }

    // Inline editing — double-click any task text to edit
    canvas.addEventListener("dblclick", e => {
        const span = e.target.closest(".task-item span");
        if (!span || span.querySelector) return; // already an input
        const cb = span.closest("label").querySelector("input[type=checkbox]");
        const inp = document.createElement("input");
        inp.value = span.textContent;
        inp.className = "task-edit-input";
        span.replaceWith(inp);
        inp.focus();
        inp.select();
        const save = () => {
            const text = inp.value.trim() || span.textContent;
            if (text !== span.textContent) apiFetch(`/roadmap/items/${cb.dataset.id}/text`, "PATCH", { text });
            const s = document.createElement("span");
            s.textContent = text;
            inp.replaceWith(s);
        };
        inp.addEventListener("blur", save, { once: true });
        inp.addEventListener("keydown", e => e.key === "Enter" && inp.blur());
    });
}

function refreshPhaseStates() {
    const nodes = [...document.querySelectorAll(".path-node")];
    const icons = { completed: "✅", current: "⭐", locked: "🔒" };
    let foundCurrent = false;

    nodes.forEach((node) => {
        const boxes = [...node.querySelectorAll("input[type=checkbox]")];
        const allDone = boxes.length > 0 && boxes.every(cb => cb.checked);
        const state = foundCurrent ? "locked" : allDone ? "completed" : (foundCurrent = true, "current");

        node.classList.remove("path-node--completed", "path-node--current", "path-node--locked");
        node.classList.add(`path-node--${state}`);
        const icon = node.querySelector(".path-node__icon");
        if (icon) icon.textContent = icons[state];
        boxes.forEach(cb => cb.disabled = state === "locked");

        // Close locked nodes
        if (state === "locked") {
            const panel = node.querySelector(".path-node__tasks");
            const bubble = node.querySelector(".path-node__bubble");
            if (panel) panel.style.display = "none";
            if (bubble) bubble.classList.remove("is-open");
        }
    });

    document.querySelectorAll(".path-line").forEach((line, i) => {
        line.classList.toggle("path-line--done", nodes[i]?.classList.contains("path-node--completed"));
    });
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("username");
    window.location.href = "login.html";
});

(async () => {
    await checkAuth();
    loadUser();
    setupSidebarRoadmaps();
    loadRoadmaps();
})();