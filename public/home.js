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
            <input type="text" id="roadmapSearch" class="sidebar-roadmaps__search" placeholder="Search roadmaps…">
            <div id="roadmapsList"></div>
        </div>
    `;
    document.getElementById("roadmapSearch").addEventListener("input", e => filterRoadmaps(e.target.value));
}

function filterRoadmaps(query) {
    const q = query.toLowerCase();
    document.querySelectorAll(".sidebar-roadmap-item").forEach(el => {
        el.style.display = el.dataset.title.toLowerCase().includes(q) ? "" : "none";
    });
}

// Due date helpers — stored in localStorage per roadmap id
function getDueDate(id) { return localStorage.getItem(`due_${id}`) || ""; }
function setDueDate(id, val) {
    if (val) localStorage.setItem(`due_${id}`, val);
    else localStorage.removeItem(`due_${id}`);
}
function formatDue(dateStr) {
    if (!dateStr) return "";
    const days = Math.round((new Date(dateStr) - new Date()) / 86400000);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "Due today";
    return `in ${days}d`;
}
function isOverdue(dateStr) { return !!dateStr && new Date(dateStr) < new Date(); }

async function loadRoadmaps() {
    try {
        const data = await apiFetch("/roadmap/user");
        const list = document.getElementById("roadmapsList");
        if (!list) return;
        if (!data.roadmaps.length) { list.innerHTML = `<p class="sidebar-roadmaps__empty" style="margin-top: 10px; color: #676767; font-family: 'Inter', sans-serif; font-size: 14px;">No Roadmaps available</p>`; return; }

        list.innerHTML = data.roadmaps.map(r => {
            const pct = r.total_items > 0 ? Math.round((r.completed_items / r.total_items) * 100) : 0;
            const due = getDueDate(r.id);
            const dueLabel = formatDue(due);
            const over = isOverdue(due);
            return `<div class="sidebar-roadmap-item" data-id="${r.id}" data-title="${r.title.replace(/"/g, '&quot;')}">
                <div class="rm-info">
                    <span class="rm-title">${r.title}</span>
                    <div class="rm-meta">
                        <span class="rm-progress">${pct}%</span>
                        <label class="rm-due-label${over ? " rm-due--over" : ""}" title="Set due date">
                            <input type="date" class="rm-due-input" value="${due}">
                            <span class="rm-due-display">${dueLabel || "📅"}</span>
                        </label>
                    </div>
                </div>
                <button class="rm-delete-btn" title="Delete">🗑</button>
            </div>`;
        }).join("");

        list.querySelectorAll(".sidebar-roadmap-item").forEach(el => {
            el.querySelector(".rm-title").addEventListener("click", () => loadRoadmap(+el.dataset.id, el.dataset.title));
            el.querySelector(".rm-delete-btn").addEventListener("click", e => { e.stopPropagation(); deleteRoadmap(+el.dataset.id); });

            const dateInput = el.querySelector(".rm-due-input");
            const dueLabel = el.querySelector(".rm-due-label");
            const dueDisplay = el.querySelector(".rm-due-display");

            // clicking the display opens the native date picker
            dueDisplay.addEventListener("click", e => {
                e.stopPropagation();
                try { dateInput.showPicker(); } catch { dateInput.click(); }
            });
            dateInput.addEventListener("change", () => {
                setDueDate(+el.dataset.id, dateInput.value);
                dueDisplay.textContent = formatDue(dateInput.value) || "📅";
                dueLabel.classList.toggle("rm-due--over", isOverdue(dateInput.value));
            });
        });

        const q = document.getElementById("roadmapSearch")?.value;
        if (q) filterRoadmaps(q);
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

let currentRoadmap = null;

async function loadRoadmap(id, title) {
    try {
        const data = await apiFetch(`/roadmap/${id}/items`);
        currentRoadmap = { id, title, items: data.items.map(item => ({ id: item.id, text: item.text, indent_level: item.indent_level, completed: item.completed, sort_order: item.sort_order })) };
        renderRoadmap(currentRoadmap);
        document.getElementById("roadmapSection").style.display = "block";
    } catch (err) {
        console.error("Failed to load roadmap:", err);
    }
}

async function reloadCurrentRoadmap() {
    if (!currentRoadmap) return;
    await loadRoadmap(currentRoadmap.id, currentRoadmap.title);
    loadRoadmaps();
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

        // Parse optional "[X weeks]" time estimate embedded in phase text
        const timeMatch = phase.text.match(/\[([^\]]+)\]$/);
        const phaseTitle = timeMatch ? phase.text.slice(0, timeMatch.index).trim() : phase.text;
        const timeBadge = timeMatch ? `<span class="phase-time">${timeMatch[1]}</span>` : "";

        const tasks = phase.children.map(t => `
            <label class="task-item ${t.completed ? "task-item--done" : ""} ${t.indent_level === 2 ? "task-item--sub" : ""}">
                <input type="checkbox" data-id="${t.id}" ${t.completed ? "checked" : ""} ${state === "locked" ? "disabled" : ""}>
                <span>${t.text}</span>
                ${state !== "locked" ? `<button class="task-delete-btn" data-id="${t.id}" title="Remove task">✕</button>` : ""}
            </label>`).join("");

        const lastChildSort = phase.children.length ? phase.children[phase.children.length - 1].sort_order : phase.sort_order;
        const hasPanel = phase.children.length > 0 || state !== "locked";

        return `
            ${i > 0 ? `<div class="path-line ${states[i-1] === "completed" ? "path-line--done" : ""}"></div>` : ""}
            <div class="path-node path-node--${state} ${sides[i % 2]}" data-index="${i}">
                <div class="path-node__bubble">
                    <div class="path-node__icon">${icons[state]}</div>
                    <div class="path-node__title" data-phase-id="${phase.id}" data-phase-text="${phase.text.replace(/"/g, '&quot;')}" title="Double-click to edit">${phaseTitle}</div>
                    ${timeBadge}
                    ${hasPanel ? '<div class="path-node__chevron">▾</div>' : ""}
                    ${state !== "locked" ? `<button class="phase-delete-btn" data-id="${phase.id}" title="Delete phase">✕</button>` : ""}
                </div>
                ${hasPanel ? `<div class="path-node__tasks" style="display:none">
                    ${tasks}
                    ${state !== "locked" ? `<button class="add-task-btn" data-roadmap-id="${roadmap.id}" data-after-sort="${lastChildSort}">+ Add task</button>` : ""}
                </div>` : ""}
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

    // Phase title — double-click to edit
    canvas.querySelectorAll(".path-node__title").forEach(titleEl => {
        titleEl.addEventListener("dblclick", e => {
            e.stopPropagation();
            editPhaseTitle(titleEl);
        });
    });

    // Delete phase
    canvas.querySelectorAll(".phase-delete-btn").forEach(btn => {
        btn.addEventListener("click", async e => {
            e.stopPropagation();
            if (!confirm("Delete this phase and all its tasks?")) return;
            await apiFetch(`/roadmap/items/${btn.dataset.id}`, "DELETE");
            reloadCurrentRoadmap();
        });
    });

    // Delete task
    canvas.querySelectorAll(".task-delete-btn").forEach(btn => {
        btn.addEventListener("click", async e => {
            e.stopPropagation();
            e.preventDefault();
            await apiFetch(`/roadmap/items/${btn.dataset.id}`, "DELETE");
            btn.closest("label").remove();
            refreshPhaseStates();
            loadRoadmaps();
        });
    });

    // Add task
    canvas.querySelectorAll(".add-task-btn").forEach(btn => {
        btn.addEventListener("click", () => showInlineInput(btn, "task-add-input", "New task name…", async text => {
            await apiFetch(`/roadmap/${btn.dataset.roadmapId}/items`, "POST", { text, indent_level: 1, after_sort_order: +btn.dataset.afterSort });
            reloadCurrentRoadmap();
        }));
    });

}

function editPhaseTitle(titleEl) {
    const phaseId = titleEl.dataset.phaseId;
    const fullText = titleEl.dataset.phaseText;
    const inp = document.createElement("input");
    inp.className = "task-edit-input";
    inp.value = fullText;
    titleEl.replaceWith(inp);
    inp.focus();
    inp.select();

    const save = async () => {
        const text = inp.value.trim() || fullText;
        if (text !== fullText) await apiFetch(`/roadmap/items/${phaseId}/text`, "PATCH", { text });
        const timeMatch = text.match(/\[([^\]]+)\]$/);
        const displayTitle = timeMatch ? text.slice(0, timeMatch.index).trim() : text;
        const newEl = document.createElement("div");
        newEl.className = "path-node__title";
        newEl.dataset.phaseId = phaseId;
        newEl.dataset.phaseText = text;
        newEl.title = "Double-click to edit";
        newEl.textContent = displayTitle;
        newEl.addEventListener("dblclick", e => { e.stopPropagation(); editPhaseTitle(newEl); });
        inp.replaceWith(newEl);
    };
    inp.addEventListener("blur", save, { once: true });
    inp.addEventListener("keydown", e => e.key === "Enter" && inp.blur());
}

function showInlineInput(anchorEl, className, placeholder, onSave) {
    anchorEl.style.display = "none";
    const inp = document.createElement("input");
    inp.className = className;
    inp.placeholder = placeholder;
    anchorEl.parentNode.insertBefore(inp, anchorEl);
    inp.focus();

    const finish = async () => {
        const text = inp.value.trim();
        inp.remove();
        anchorEl.style.display = "";
        if (text) await onSave(text);
    };
    inp.addEventListener("blur", finish, { once: true });
    inp.addEventListener("keydown", e => {
        if (e.key === "Enter") inp.blur();
        if (e.key === "Escape") { inp.value = ""; inp.blur(); }
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

// Removed duplicate logoutBtn listener (handled in sidebar.js)

(async () => {
    await checkAuth();
    loadUser();
    setupSidebarRoadmaps();
    loadRoadmaps();
})();