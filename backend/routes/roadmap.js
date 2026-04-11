const express = require("express");
const router = express.Router();
const db = require("../database");
const askAI = require("../services/openai");

// Check if the user is logged in before allowing access
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    req.user = req.session.user;
    next();
}

// Generate a new roadmap using AI
router.post("/generate", requireAuth, async (req, res) => {
    const { skill } = req.body;

    if (!skill) {
        return res.status(400).json({ error: "Skill required" });
    }

    try {
        // Ask the AI to generate a roadmap
        const aiResponse = await askAI(
            `Create a learning roadmap for ${skill}.
Return ONLY a JSON array of objects like:
[
  { "text": "Phase 1: Basics", "indent": 0 },
  { "text": "Learn X", "indent": 1 }
]`
        );

        const items = extractJSON(aiResponse);

        if (!Array.isArray(items)) {
            throw new Error("AI did not return an array");
        }

        // Save the roadmap to the database
        const [result] = await db.query(
            "INSERT INTO roadmaps (user_id, title) VALUES (?, ?)",
            [req.user.id, skill + " Roadmap"]
        );
        const roadmapId = result.insertId;

        // Save each step of the roadmap
        for (let i = 0; i < items.length; i++) {
            await db.query(
                "INSERT INTO roadmap_items (roadmap_id, sort_order, text, indent_level) VALUES (?, ?, ?, ?)",
                [roadmapId, i, items[i].text, items[i].indent]
            );
        }

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
        console.error("Roadmap error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get all roadmaps for the logged-in user
router.get("/user", requireAuth, async (req, res) => {
    const [rows] = await db.query(
        "SELECT * FROM roadmaps WHERE user_id = ?",
        [req.user.id]
    );
    res.json({ roadmaps: rows });
});

// Get all steps inside a roadmap
router.get("/:id/items", requireAuth, async (req, res) => {
    const [items] = await db.query(
        "SELECT * FROM roadmap_items WHERE roadmap_id = ? ORDER BY sort_order",
        [req.params.id]
    );
    res.json({ items });
});

// Save checkbox state when a user checks/unchecks a step
router.patch("/items/:id/complete", requireAuth, async (req, res) => {
    const { completed } = req.body;
    await db.query(
        "UPDATE roadmap_items SET completed = ? WHERE id = ?",
        [completed ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
});

// Helper: pull JSON array out of the AI response
function extractJSON(text) {
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) throw new Error("AI did not return JSON");
        return JSON.parse(match[0]);
    }
}

module.exports = router;
