// LOGIN (SESSION BASED)

const form = document.getElementById("loginForm");
const statusEl = document.getElementById("loginStatus");
const btn = document.getElementById("loginBtn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        statusEl.textContent = "Fill all fields";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in...";

    try {
        const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // 🔥 SESSION
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            statusEl.textContent = data.error || "Login failed";
            return;
        }

        // store username only (NO JWT)
        localStorage.setItem("username", data.username || email);

        window.location.href = "home.html";

    } catch {
        statusEl.textContent = "Server error";
    } finally {
        btn.disabled = false;
        btn.textContent = "Sign in";
    }
});