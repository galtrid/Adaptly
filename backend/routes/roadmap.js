const express = require("express");
const router = express.Router();
const db = require("../database");
const askAI = require("../services/openai");

// auth middleware
function requireAuth(req, res, next) {
    if (!req.session.user)
        return res.status(401).json({ error: "Not logged in" });

    req.user = req.session.user;
    next();
}

// helper
function q(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => err ? reject(err) : resolve(res));
    });
}

router.post("/generate", requireAuth, async (req, res) => {
    const { skill } = req.body;
    if (!skill) return res.status(400).json({ error: "Skill required" });

    try {
        const aiText = await askAI(
            `Create a learning roadmap for ${skill}.
Return ONLY a JSON array of objects like:
[
  { "text": "Phase 1: Basics", "indent": 0 },
  { "text": "Learn X", "indent": 1 }
]`
        );

        console.log("=== AI RAW RESPONSE ===");
        console.log(aiText);
        console.log("=======================");

        // 🔥 USE SAFE PARSER (NOT JSON.parse directly)
        const items = extractJSON(aiText);

        if (!Array.isArray(items)) {
            throw new Error("AI did not return array");
        }

        const result = await q(
            "INSERT INTO roadmaps (user_id, title) VALUES (?, ?)",
            [req.user.id, skill + " Roadmap"]
        );

        const roadmapId = result.insertId;

        for (let i = 0; i < items.length; i++) {
            await q(
                "INSERT INTO roadmap_items (roadmap_id, sort_order, text, indent_level) VALUES (?, ?, ?, ?)",
                [roadmapId, i, items[i].text, items[i].indent]
            );
        }

        // 🔥 RETURN ITEMS (your frontend expects it)
        res.json({
            success: true,
            roadmap: {
                id: roadmapId,
                title: skill + " Roadmap",
                items: items.map((item, i) => ({
                    id: i,
                    text: item.text,
                    indent_level: item.indent
                }))
            }
        });

    } catch (err) {
        console.error("ROADMAP ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// get user roadmaps
router.get("/user", requireAuth, async (req, res) => {
    const rows = await q("SELECT * FROM roadmaps WHERE user_id = ?", [req.user.id]);
    res.json({ roadmaps: rows });
});

// get items
router.get("/:id/items", requireAuth, async (req, res) => {
    const items = await q(
        "SELECT * FROM roadmap_items WHERE roadmap_id = ? ORDER BY sort_order",
        [req.params.id]
    );
    res.json({ items });
});

// update checkbox
router.patch("/items/:id/complete", requireAuth, async (req, res) => {
    const { completed } = req.body;
    await q("UPDATE roadmap_items SET completed = ? WHERE id = ?", [completed ? 1 : 0, req.params.id]);
    res.json({ success: true });
});

function extractJSON(text) {
    try {
        return JSON.parse(text);
    } catch {
        // try extract array []
        const match = text.match(/\[[\s\S]*\]/);

        if (!match) {
            console.error("BAD AI RESPONSE:", text);
            throw new Error("AI did not return JSON array");
        }

        try {
            return JSON.parse(match[0]);
        } catch {
            console.error("STILL BAD JSON:", text);
            throw new Error("Invalid JSON format");
        }
    }
}

module.exports = router;