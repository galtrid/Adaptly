const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./database");

// Sign up a new user
router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
        );

        res.json({ message: "Signup success" });
    } catch (err) {
        res.status(500).json({ error: "Username or email already exists" });
    }
});

// Log in an existing user
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.status(400).json({ error: "User not found" });
        }

        const user = rows[0];

        // Check if the password is correct
        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.status(400).json({ error: "Wrong password" });
        }

        // Save the user in the session so they stay logged in
        req.session.user = { id: user.id, username: user.username };

        res.json({ message: "Login success", username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// Log out
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out" });
    });
});

module.exports = router;
