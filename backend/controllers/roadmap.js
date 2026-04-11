const db = require("../database");
const askAI = require("../services/openai");

// Generate a new roadmap using AI
async function generate(req, res) {
    const { skill } = req.body;

    if (!skill) {
        return res.status(400).json({ error: "Skill required" });
    }

    try {
        const aiResponse = await askAI(
            `Create a detailed learning roadmap for ${skill}.
Return ONLY a JSON array of objects like:
[
  { "text": "Phase 1: Basics", "indent": 0 },
  { "text": "Variables & Data Types", "indent": 1 },
  { "text": "Read: JavaScript.info chapter 1", "indent": 2 }
]
indent 0 = main topic, indent 1 = subtopic, indent 2 = learning material/resource`
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

        // Save each step and collect real DB IDs
        const savedItems = [];
        for (let i = 0; i < items.length; i++) {
            const [row] = await db.query(
                "INSERT INTO roadmap_items (roadmap_id, sort_order, text, indent_level) VALUES (?, ?, ?, ?)",
                [roadmapId, i, items[i].text, items[i].indent]
            );
            savedItems.push({ id: row.insertId, text: items[i].text, indent_level: items[i].indent, completed: false });
        }

        res.json({
            success: true,
            roadmap: { id: roadmapId, title: skill + " Roadmap", items: savedItems }
        });

    } catch (err) {
        console.error("Roadmap error:", err.message);
        res.status(500).json({ error: err.message });
    }
}

// Get all roadmaps for the logged-in user
async function getUserRoadmaps(req, res) {
    const [rows] = await db.query(
        "SELECT * FROM roadmaps WHERE user_id = ?",
        [req.user.id]
    );
    res.json({ roadmaps: rows });
}

// Get all steps inside a roadmap
async function getRoadmapItems(req, res) {
    const [items] = await db.query(
        "SELECT * FROM roadmap_items WHERE roadmap_id = ? ORDER BY sort_order",
        [req.params.id]
    );
    res.json({ items });
}

// Delete a roadmap and all its items
async function deleteRoadmap(req, res) {
    await db.query("DELETE FROM roadmap_items WHERE roadmap_id = ?", [req.params.id]);
    await db.query("DELETE FROM roadmaps WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ success: true });
}

// Edit the text of a roadmap item
async function updateItemText(req, res) {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });
    await db.query("UPDATE roadmap_items SET text = ? WHERE id = ?", [text, req.params.id]);
    res.json({ success: true });
}

// Save checkbox state when a user checks/unchecks a step
async function updateComplete(req, res) {
    const { completed } = req.body;
    await db.query(
        "UPDATE roadmap_items SET completed = ? WHERE id = ?",
        [completed ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
}

// Helper: pull JSON array out of the AI response
function extractJSON(text) {
    const clean = str => str.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) throw new Error("AI did not return JSON");
        try {
            return JSON.parse(match[0]);
        } catch {
            return JSON.parse(clean(match[0]));
        }
    }
}

module.exports = { generate, getUserRoadmaps, getRoadmapItems, updateComplete, deleteRoadmap, updateItemText };
