/* ═══════════════════════════════════════════════════════════════
   Ureeka — Login Page Script (FIXED: Session-based, NO JWT)
   ═══════════════════════════════════════════════════════════════ */

const loginForm   = document.getElementById("loginForm");
const loginEmail  = document.getElementById("loginEmail");
const loginPwd    = document.getElementById("loginPassword");
const statusEl    = document.getElementById("loginStatus");
const loginBtn    = document.getElementById("loginBtn");

// ── Submit handler ────────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus();

  const email    = loginEmail.value.trim();
  const password = loginPwd.value;

  // validation
  if (!email || !password) {
    return showError("Please enter your email and password.");
  }
  if (!isValidEmail(email)) {
    return showError("Invalid email format.");
  }
  if (password.length < 6) {
    return showError("Password must be at least 6 characters.");
  }

  setLoading(true);

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ✅ IMPORTANT (session!)
      body: JSON.stringify({ email, password })
    });

    const data = await parseJSON(res);

    if (!res.ok) {
      return showError(data.error || "Login failed");
    }

    // ✅ store ONLY username (no JWT anymore)
    localStorage.setItem("username", data.username);

    showSuccess("Login successful!");

    // redirect
    setTimeout(() => {
      window.location.href = "home.html";
    }, 800);

  } catch (err) {
    showError("Network error — server might be down.");
  } finally {
    setLoading(false);
  }
});

// ── Helpers ───────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoading(on) {
  loginBtn.disabled = on;
  loginBtn.textContent = on ? "Signing in…" : "Sign in";
}

function showError(msg) {
  statusEl.textContent = msg;
  statusEl.className = "status is-error";
}

function showSuccess(msg) {
  statusEl.textContent = msg;
  statusEl.className = "status is-success";
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.className = "status";
}

async function parseJSON(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { message: text }; }
}