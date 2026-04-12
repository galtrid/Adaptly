async function checkAuth() {
    try {
        const res = await fetch("/roadmap/user", { credentials: "include" });
        if (!res.ok) {
            window.location.href = "login.html";
        }
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

    document.getElementById("roadmapSearch").addEventListener("input", function(e) {
        filterRoadmaps(e.target.value);
    });
}

function filterRoadmaps(query) {
    const items = document.querySelectorAll(".sidebar-roadmap-item");
    items.forEach(function(el) {
        const title = el.dataset.title.toLowerCase();
        el.style.display = title.includes(query.toLowerCase()) ? "" : "none";
    });
}

function getDueDate(id) {
    return localStorage.getItem("due_" + id) || "";
}

function setDueDate(id, value) {
    if (value) {
        localStorage.setItem("due_" + id, value);
    } else {
        localStorage.removeItem("due_" + id);
    }
}

function formatDue(dateStr) {
    if (!dateStr) return "";
    const days = Math.round((new Date(dateStr) - new Date()) / 86400000);
    if (days < 0) return Math.abs(days) + "d overdue";
    if (days === 0) return "Due today";
    return "in " + days + "d";
}

function isOverdue(dateStr) {
    return !!dateStr && new Date(dateStr) < new Date();
}

async function loadRoadmaps() {
    const list = document.getElementById("roadmapsList");
    if (!list) return;

    try {
        const data = await apiFetch("/roadmap/user");
        const roadmaps = data.roadmaps;

        if (!roadmaps.length) {
            list.innerHTML = `<p class="sidebar-roadmaps__empty" style="margin-top: 10px; color: #676767; font-size: 14px;">No Roadmaps available</p>`;
            return;
        }

        list.innerHTML = roadmaps.map(function(r) {
            const pct = r.total_items > 0 ? Math.round((r.completed_items / r.total_items) * 100) : 0;
            const due = getDueDate(r.id);
            const dueLabel = formatDue(due);
            const overdue = isOverdue(due);

            return `<div class="sidebar-roadmap-item" data-id="${r.id}" data-title="${r.title.replace(/"/g, '&quot;')}">
                <div class="rm-info">
                    <span class="rm-title">${r.title}</span>
                    <div class="rm-meta">
                        <span class="rm-progress">${pct}%</span>
                        <label class="rm-due-label${overdue ? " rm-due--over" : ""}" title="Set due date">
                            <input type="date" class="rm-due-input" value="${due}">
                            <span class="rm-due-display">${dueLabel || "📅"}</span>
                        </label>
                    </div>
                </div>
                <button class="rm-delete-btn" title="Delete">🗑</button>
            </div>`;
        }).join("");

        list.querySelectorAll(".sidebar-roadmap-item").forEach(function(el) {
            el.querySelector(".rm-title").addEventListener("click", function() {
                loadRoadmap(+el.dataset.id, el.dataset.title);
            });

            el.querySelector(".rm-delete-btn").addEventListener("click", function(e) {
                e.stopPropagation();
                deleteRoadmap(+el.dataset.id);
            });

            const dateInput = el.querySelector(".rm-due-input");
            const dueLabel = el.querySelector(".rm-due-label");
            const dueDisplay = el.querySelector(".rm-due-display");

            dueDisplay.addEventListener("click", function(e) {
                e.stopPropagation();
                try { dateInput.showPicker(); } catch { dateInput.click(); }
            });

            dateInput.addEventListener("change", function() {
                setDueDate(+el.dataset.id, dateInput.value);
                dueDisplay.textContent = formatDue(dateInput.value) || "📅";
                dueLabel.classList.toggle("rm-due--over", isOverdue(dateInput.value));
            });
        });

        const searchQuery = document.getElementById("roadmapSearch")?.value;
        if (searchQuery) filterRoadmaps(searchQuery);

    } catch (err) {
        console.error("Failed to load roadmaps:", err);
    }
}

async function deleteRoadmap(id) {
    if (!confirm("Delete this roadmap?")) return;
    await apiFetch("/roadmap/" + id, "DELETE");
    document.getElementById("roadmapSection").style.display = "none";
    loadRoadmaps();
}

let currentRoadmap = null;

async function loadRoadmap(id, title) {
    try {
        const data = await apiFetch("/roadmap/" + id + "/items");
        currentRoadmap = {
            id: id,
            title: title,
            items: data.items.map(function(item) {
                return {
                    id: item.id,
                    text: item.text,
                    indent_level: item.indent_level,
                    completed: item.completed,
                    sort_order: item.sort_order
                };
            })
        };
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
        method: method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : null
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}

document.getElementById("generateForm").addEventListener("submit", async function(e) {
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

    canvas.innerHTML = `
        <div class="skeleton-path">
            <div class="skeleton-node skeleton-node--left"></div>
            <div class="skeleton-line-v"></div>
            <div class="skeleton-node skeleton-node--right"></div>
            <div class="skeleton-line-v"></div>
            <div class="skeleton-node skeleton-node--left"></div>
            <div class="skeleton-line-v"></div>
            <div class="skeleton-node skeleton-node--right"></div>
        </div>`;

    try {
        const data = await apiFetch("/roadmap/generate", "POST", { skill });
        renderRoadmap(data.roadmap);
        status.textContent = "Done!";
        loadRoadmaps();
    } catch (err) {
        status.textContent = "Error: " + err.message;
    } finally {
        btn.disabled = false;
    }
});

function groupIntoPhases(items) {
    const phases = [];
    let currentPhase = null;

    for (const item of items) {
        if (item.indent_level === 0) {
            currentPhase = { ...item, children: [] };
            phases.push(currentPhase);
        } else if (currentPhase) {
            currentPhase.children.push(item);
        }
    }

    return phases;
}

function getPhaseStates(phases) {
    let foundCurrent = false;

    return phases.map(function(phase) {
        const allDone = phase.children.length > 0 && phase.children.every(c => c.completed);

        if (foundCurrent) {
            return "locked";
        } else if (allDone) {
            return "completed";
        } else {
            foundCurrent = true;
            return "current";
        }
    });
}

function renderRoadmap(roadmap) {
    const canvas = document.getElementById("roadmapCanvas");
    document.getElementById("roadmapTitle").textContent = roadmap.title || "Roadmap";
    document.getElementById("completionBanner")?.remove();

    const phases = groupIntoPhases(roadmap.items);
    const states = getPhaseStates(phases);
    const icons = { completed: "✅", current: "⭐", locked: "🔒" };
    const sides = ["node-left", "node-right"];

    canvas.innerHTML = `<div class="roadmap-path">${phases.map(function(phase, i) {
        const state = states[i];

        const timeMatch = phase.text.match(/\[([^\]]+)\]$/);
        const phaseTitle = timeMatch ? phase.text.slice(0, timeMatch.index).trim() : phase.text;
        const timeBadge = timeMatch ? `<span class="phase-time">${timeMatch[1]}</span>` : "";

        const lastChild = phase.children[phase.children.length - 1];
        const lastChildSort = lastChild ? lastChild.sort_order : phase.sort_order;

        const tasks = phase.children.map(function(t) {
            return `
            <label class="task-item ${t.completed ? "task-item--done" : ""} ${t.indent_level === 2 ? "task-item--sub" : ""}">
                <input type="checkbox" data-id="${t.id}" ${t.completed ? "checked" : ""} ${state === "locked" ? "disabled" : ""}>
                <span>${t.text}</span>
                <button class="task-delete-btn" data-id="${t.id}" title="Remove">✕</button>
            </label>`;
        }).join("");

        const pathLine = i > 0 ? `<div class="path-line ${states[i-1] === "completed" ? "path-line--done" : ""}"></div>` : "";

        return `
            ${pathLine}
            <div class="path-node path-node--${state} ${sides[i % 2]}">
                <div class="path-node__bubble">
                    <div class="path-node__icon">${icons[state]}</div>
                    <div class="path-node__title" data-phase-id="${phase.id}" data-phase-text="${phase.text.replace(/"/g, '&quot;')}" title="Double-click to edit">${phaseTitle}</div>
                    ${timeBadge}
                    <div class="path-node__chevron">▾</div>
                    <button class="phase-delete-btn" data-id="${phase.id}" title="Delete phase">✕</button>
                </div>
                <div class="path-node__tasks" style="display:none">
                    ${tasks}
                    <button class="add-task-btn" data-roadmap-id="${roadmap.id}" data-after-sort="${lastChildSort}">+ Add task</button>
                </div>
            </div>`;
    }).join("")}</div>`;

    // Expand / collapse a phase when clicking the bubble
    canvas.querySelectorAll(".path-node__bubble").forEach(function(bubble) {
        bubble.addEventListener("click", function() {
            const node = bubble.closest(".path-node");
            const panel = node.querySelector(".path-node__tasks");
            if (!panel) return;

            const isOpen = panel.style.display !== "none";
            panel.style.display = isOpen ? "none" : "block";
            bubble.classList.toggle("is-open", !isOpen);
        });
    });

    // Save checkbox state and refresh the phase progress
    canvas.querySelectorAll("input[type=checkbox]").forEach(function(cb) {
        cb.addEventListener("change", function() {
            apiFetch("/roadmap/items/" + cb.dataset.id + "/complete", "PATCH", { completed: cb.checked });
            cb.closest("label").classList.toggle("task-item--done", cb.checked);
            refreshPhaseStates();
            loadRoadmaps();
            checkCompletion();
        });
    });

    // Auto-open the current phase on load
    const currentNode = canvas.querySelector(".path-node--current");
    if (currentNode) {
        const panel = currentNode.querySelector(".path-node__tasks");
        if (panel) {
            panel.style.display = "block";
            currentNode.querySelector(".path-node__bubble").classList.add("is-open");
        }
    }

    // Double-click a task to edit its text
    canvas.addEventListener("dblclick", function(e) {
        const span = e.target.closest(".task-item span");
        if (!span) return;

        const cb = span.closest("label").querySelector("input[type=checkbox]");
        const input = document.createElement("input");
        input.value = span.textContent;
        input.className = "task-edit-input";
        span.replaceWith(input);
        input.focus();
        input.select();

        function saveTaskText() {
            const text = input.value.trim() || span.textContent;
            if (text !== span.textContent) {
                apiFetch("/roadmap/items/" + cb.dataset.id + "/text", "PATCH", { text });
            }
            const newSpan = document.createElement("span");
            newSpan.textContent = text;
            input.replaceWith(newSpan);
        }

        input.addEventListener("blur", saveTaskText, { once: true });
        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") input.blur();
        });
    });

    // Double-click a phase title to edit it
    canvas.querySelectorAll(".path-node__title").forEach(function(titleEl) {
        titleEl.addEventListener("dblclick", function(e) {
            e.stopPropagation();
            editPhaseTitle(titleEl);
        });
    });

    // Delete a phase
    canvas.querySelectorAll(".phase-delete-btn").forEach(function(btn) {
        btn.addEventListener("click", async function(e) {
            e.stopPropagation();
            if (!confirm("Delete this phase and all its tasks?")) return;
            await apiFetch("/roadmap/items/" + btn.dataset.id, "DELETE");
            reloadCurrentRoadmap();
        });
    });

    // Delete a task
    canvas.querySelectorAll(".task-delete-btn").forEach(function(btn) {
        btn.addEventListener("click", async function(e) {
            e.stopPropagation();
            e.preventDefault();
            await apiFetch("/roadmap/items/" + btn.dataset.id, "DELETE");
            btn.closest("label").remove();
            refreshPhaseStates();
            loadRoadmaps();
        });
    });

    // Add a new task inside a phase
    canvas.querySelectorAll(".add-task-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
            showInlineInput(btn, "task-add-input", "New task name…", async function(text) {
                await apiFetch("/roadmap/" + btn.dataset.roadmapId + "/items", "POST", {
                    text: text,
                    indent_level: 1,
                    after_sort_order: +btn.dataset.afterSort
                });
                reloadCurrentRoadmap();
            });
        });
    });
}

function editPhaseTitle(titleEl) {
    const phaseId = titleEl.dataset.phaseId;
    const originalText = titleEl.dataset.phaseText;

    const input = document.createElement("input");
    input.className = "task-edit-input";
    input.value = originalText;
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    async function savePhaseTitleText() {
        const text = input.value.trim() || originalText;

        if (text !== originalText) {
            await apiFetch("/roadmap/items/" + phaseId + "/text", "PATCH", { text });
        }

        const timeMatch = text.match(/\[([^\]]+)\]$/);
        const displayTitle = timeMatch ? text.slice(0, timeMatch.index).trim() : text;

        const newTitleEl = document.createElement("div");
        newTitleEl.className = "path-node__title";
        newTitleEl.dataset.phaseId = phaseId;
        newTitleEl.dataset.phaseText = text;
        newTitleEl.title = "Double-click to edit";
        newTitleEl.textContent = displayTitle;

        newTitleEl.addEventListener("dblclick", function(e) {
            e.stopPropagation();
            editPhaseTitle(newTitleEl);
        });

        input.replaceWith(newTitleEl);
    }

    input.addEventListener("blur", savePhaseTitleText, { once: true });
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") input.blur();
    });
}

function showInlineInput(anchorBtn, className, placeholder, onSave) {
    anchorBtn.style.display = "none";

    const input = document.createElement("input");
    input.className = className;
    input.placeholder = placeholder;
    anchorBtn.parentNode.insertBefore(input, anchorBtn);
    input.focus();

    async function finish() {
        const text = input.value.trim();
        input.remove();
        anchorBtn.style.display = "";
        if (text) await onSave(text);
    }

    input.addEventListener("blur", finish, { once: true });
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") {
            input.value = "";
            input.blur();
        }
    });
}

function checkCompletion() {
    const allBoxes = [...document.querySelectorAll("#roadmapCanvas input[type=checkbox]")];
    const allChecked = allBoxes.length > 0 && allBoxes.every(function(cb) { return cb.checked; });
    if (allChecked) showCompletionBanner();
}

function showCompletionBanner() {
    if (document.getElementById("completionBanner")) return;

    const banner = document.createElement("div");
    banner.id = "completionBanner";
    banner.className = "completion-banner";
    banner.innerHTML = `
        <div class="completion-banner__confetti">🎉</div>
        <div class="completion-banner__body">
            <p class="completion-banner__title">Roadmap Complete!</p>
            <p class="completion-banner__sub">Amazing work — you finished every phase. What will you learn next?</p>
        </div>
        <button class="completion-banner__close" onclick="this.closest('.completion-banner').remove()">✕</button>
    `;

    document.getElementById("roadmapSection").prepend(banner);
}

function refreshPhaseStates() {
    const nodes = [...document.querySelectorAll(".path-node")];
    const icons = { completed: "✅", current: "⭐", locked: "🔒" };
    let foundCurrent = false;

    nodes.forEach(function(node) {
        const boxes = [...node.querySelectorAll("input[type=checkbox]")];
        const allDone = boxes.length > 0 && boxes.every(function(cb) { return cb.checked; });

        let state;
        if (foundCurrent) {
            state = "locked";
        } else if (allDone) {
            state = "completed";
        } else {
            state = "current";
            foundCurrent = true;
        }

        node.classList.remove("path-node--completed", "path-node--current", "path-node--locked");
        node.classList.add("path-node--" + state);
        node.querySelector(".path-node__icon").textContent = icons[state];
        boxes.forEach(function(cb) { cb.disabled = state === "locked"; });

        if (state === "locked") {
            const panel = node.querySelector(".path-node__tasks");
            const bubble = node.querySelector(".path-node__bubble");
            if (panel) panel.style.display = "none";
            if (bubble) bubble.classList.remove("is-open");
        }
    });

    document.querySelectorAll(".path-line").forEach(function(line, i) {
        const isDone = nodes[i]?.classList.contains("path-node--completed");
        line.classList.toggle("path-line--done", isDone);
    });
}

(async () => {
    await checkAuth();
    loadUser();
    setupSidebarRoadmaps();
    loadRoadmaps();
})();
