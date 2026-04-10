const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./database");

// signup
router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
        return res.status(400).json({ error: "All fields required" });

    const hash = await bcrypt.hash(password, 10);

    db.query(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, hash],
        (err) => {
            if (err) return res.status(500).json({ error: "User exists" });
            res.json({ message: "Signup success" });
        }
    );
});

// login
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!result.length) return res.status(400).json({ error: "User not found" });

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(400).json({ error: "Wrong password" });

        req.session.user = { id: user.id, username: user.username };

        res.json({ message: "Login success", username: user.username });
    });
});

// logout
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out" });
    });
});

module.exports = router;