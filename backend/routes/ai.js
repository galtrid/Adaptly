const express = require("express");
const router = express.Router();
const askAI = require("../services/openai");

router.post("/ask", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    try {
        const reply = await askAI(prompt);
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;