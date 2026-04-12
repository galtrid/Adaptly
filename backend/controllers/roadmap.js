const db = require("../database");
const askAI = require("../services/openai");

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
  { "text": "Phase 1: Basics [1-2 weeks]", "indent": 0 },
  { "text": "Variables & Data Types", "indent": 1 },
  { "text": "Read: JavaScript.info chapter 1", "indent": 2 }
]
indent 0 = main phase (add a time estimate in square brackets), indent 1 = subtopic, indent 2 = learning resource`
        );

        const items = extractJSON(aiResponse);

        if (!Array.isArray(items)) {
            throw new Error("AI did not return an array");
        }

        const [result] = await db.query(
            "INSERT INTO roadmaps (user_id, title) VALUES (?, ?)",
            [req.user.id, skill + " Roadmap"]
        );
        const roadmapId = result.insertId;

        const savedItems = [];
        for (let i = 0; i < items.length; i++) {
            const [row] = await db.query(
                "INSERT INTO roadmap_items (roadmap_id, sort_order, text, indent_level) VALUES (?, ?, ?, ?)",
                [roadmapId, i, items[i].text, items[i].indent]
            );
            savedItems.push({ id: row.insertId, text: items[i].text, indent_level: items[i].indent, completed: false, sort_order: i });
        }

        res.json({ success: true, roadmap: { id: roadmapId, title: skill + " Roadmap", items: savedItems } });

    } catch (err) {
        console.error("Roadmap error:", err.message);
        res.status(500).json({ error: err.message });
    }
}

async function getUserRoadmaps(req, res) {
    const [rows] = await db.query(`
        SELECT r.*, COUNT(ri.id) AS total_items, COALESCE(SUM(ri.completed), 0) AS completed_items
        FROM roadmaps r
        LEFT JOIN roadmap_items ri ON ri.roadmap_id = r.id AND ri.indent_level > 0
        WHERE r.user_id = ?
        GROUP BY r.id
    `, [req.user.id]);
    res.json({ roadmaps: rows });
}

async function getRoadmapItems(req, res) {
    const [items] = await db.query(
        "SELECT * FROM roadmap_items WHERE roadmap_id = ? ORDER BY sort_order",
        [req.params.id]
    );
    res.json({ items });
}

async function addItem(req, res) {
    const { text, indent_level, after_sort_order } = req.body;
    const roadmapId = req.params.id;

    if (!text) return res.status(400).json({ error: "Text required" });

    const [roadmapRows] = await db.query("SELECT id FROM roadmaps WHERE id = ? AND user_id = ?", [roadmapId, req.user.id]);
    if (roadmapRows.length === 0) return res.status(403).json({ error: "Unauthorized" });

    const insertAfter = after_sort_order !== undefined ? after_sort_order : -1;
    const newSortOrder = insertAfter + 1;
    const level = indent_level !== undefined ? indent_level : 1;

    await db.query(
        "UPDATE roadmap_items SET sort_order = sort_order + 1 WHERE roadmap_id = ? AND sort_order > ?",
        [roadmapId, insertAfter]
    );

    const [result] = await db.query(
        "INSERT INTO roadmap_items (roadmap_id, sort_order, text, indent_level) VALUES (?, ?, ?, ?)",
        [roadmapId, newSortOrder, text, level]
    );

    res.json({ success: true, item: { id: result.insertId, text, indent_level: level, completed: false, sort_order: newSortOrder } });
}

async function deleteItem(req, res) {
    const [itemRows] = await db.query("SELECT * FROM roadmap_items WHERE id = ?", [req.params.id]);
    const item = itemRows[0];

    if (!item) return res.status(404).json({ error: "Not found" });

    const [roadmapRows] = await db.query("SELECT id FROM roadmaps WHERE id = ? AND user_id = ?", [item.roadmap_id, req.user.id]);
    if (roadmapRows.length === 0) return res.status(403).json({ error: "Unauthorized" });

    if (item.indent_level === 0) {
        const [nextRows] = await db.query(
            "SELECT MIN(sort_order) AS nextSort FROM roadmap_items WHERE roadmap_id = ? AND indent_level = 0 AND sort_order > ?",
            [item.roadmap_id, item.sort_order]
        );
        const nextSort = nextRows[0].nextSort || 999999;
        await db.query(
            "DELETE FROM roadmap_items WHERE roadmap_id = ? AND sort_order > ? AND sort_order < ?",
            [item.roadmap_id, item.sort_order, nextSort]
        );
    }

    await db.query("DELETE FROM roadmap_items WHERE id = ?", [req.params.id]);
    res.json({ success: true });
}

async function deleteRoadmap(req, res) {
    await db.query("DELETE FROM roadmap_items WHERE roadmap_id = ?", [req.params.id]);
    await db.query("DELETE FROM roadmaps WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ success: true });
}

async function updateItemText(req, res) {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });
    await db.query("UPDATE roadmap_items SET text = ? WHERE id = ?", [text, req.params.id]);
    res.json({ success: true });
}

async function updateComplete(req, res) {
    const { completed } = req.body;
    await db.query("UPDATE roadmap_items SET completed = ? WHERE id = ?", [completed ? 1 : 0, req.params.id]);
    res.json({ success: true });
}

function extractJSON(text) {
    try {
        return JSON.parse(text);
    } catch {
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start === -1 || end === -1) throw new Error("AI did not return JSON");
        return JSON.parse(text.slice(start, end + 1));
    }
}

module.exports = { generate, getUserRoadmaps, getRoadmapItems, addItem, deleteItem, updateComplete, deleteRoadmap, updateItemText };
