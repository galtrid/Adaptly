/* ═══════════════════════════════════════════════════════════════
   Adapty — Register Page
   ═══════════════════════════════════════════════════════════════ */

const form     = document.getElementById("registerForm");
const usernameEl = document.getElementById("regUsername");
const emailEl  = document.getElementById("regEmail");
const pwdEl    = document.getElementById("regPassword");
const confirmEl = document.getElementById("regConfirm");
const statusEl = document.getElementById("registerStatus");
const btnEl    = document.getElementById("registerBtn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const username = usernameEl.value.trim();
    const email    = emailEl.value.trim();
    const password = pwdEl.value;
    const confirm  = confirmEl.value;

    // ── Client-side validation ──────────────────────────────────
    if (!username || !email || !password || !confirm) {
        showError("Please fill in all fields.");
        return;
    }
    if (username.length < 3) {
        showError("Username must be at least 3 characters.");
        return;
    }
    if (!isValidEmail(email)) {
        showError("Please enter a valid email address.");
        return;
    }
    if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
    }
    if (password !== confirm) {
        showError("Passwords do not match.");
        return;
    }

    setLoading(true);

    try {
    const res  = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 🔥 ADD THIS
        body: JSON.stringify({ username, email, password }),
    });

        const data = await parseJSON(res);

        if (!res.ok) {
            showError(data.error || data.message || "Registration failed. Please try again.");
            return;
        }

        showSuccess("Account created! Redirecting to sign in…");
        form.reset();

        setTimeout(() => { window.location.href = "login.html"; }, 1400);

    } catch {
        showError("Network error — is the server running?");
    } finally {
        setLoading(false);
    }
});

// ── Helpers ────────────────────────────────────────────────────────
function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function setLoading(on) {
    btnEl.disabled = on;
    btnEl.innerHTML = on
        ? `<span class="btn-spinner"></span> Creating account…`
        : "Create account";
}

function showError(msg) {
    statusEl.textContent = msg;
    statusEl.className   = "auth-status is-error";
}

function showSuccess(msg) {
    statusEl.textContent = msg;
    statusEl.className   = "auth-status is-success";
}

function clearStatus() {
    statusEl.textContent = "";
    statusEl.className   = "auth-status";
}

async function parseJSON(res) {
    const text = await res.text();
    if (!text) return {};
    try { return JSON.parse(text); }
    catch { return { message: text }; }
}
