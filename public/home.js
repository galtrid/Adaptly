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

async function loadRoadmaps() {
    try {
        const data = await apiFetch("/roadmap/user");
        const list = document.getElementById("roadmapsList");
        list.innerHTML = data.roadmaps.map(roadmap => 
            `<div class="roadmap-item" data-id="${roadmap.id}" onclick="loadRoadmap(${roadmap.id}, '${roadmap.title}')">${roadmap.title}</div>`
        ).join("");
    } catch (err) {
        console.error("Failed to load roadmaps:", err);
    }
}

async function loadRoadmap(id, title) {
    try {
        const data = await apiFetch(`/roadmap/${id}/items`);
        const roadmap = { id, title, items: data.items.map((item, i) => ({ id: item.id, text: item.text, indent_level: item.indent_level })) };
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

function renderRoadmap(roadmap) {
    const canvas = document.getElementById("roadmapCanvas");
    const saved = JSON.parse(localStorage.getItem("checked_" + roadmap.id) || "{}");

    document.getElementById("roadmapTitle").textContent = roadmap.title || "Roadmap";

    canvas.innerHTML = roadmap.items.map((item, i) => {
        if (item.indent_level === 0) {
            return `<div class="rm-heading">${item.text}</div>`;
        }
        const checked = saved[item.id] ? "checked" : "";
        return `<label class="rm-item ${checked ? "rm-done" : ""}">
            <input type="checkbox" data-id="${item.id}" ${checked}> ${item.text}
        </label>`;
    }).join("");

    canvas.querySelectorAll("input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", () => {
            saved[cb.dataset.id] = cb.checked;
            localStorage.setItem("checked_" + roadmap.id, JSON.stringify(saved));
            cb.closest("label").classList.toggle("rm-done", cb.checked);
        });
    });
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    localStorage.clear();
    window.location.href = "login.html";
});

(async () => {
    await checkAuth();
    loadUser();
    loadRoadmaps();
})();