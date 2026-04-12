const express = require("express");
const router = express.Router();
const controller = require("../controllers/roadmap");

// Check if the user is logged in before allowing access
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Not logged in" });
    }
    req.user = req.session.user;
    next();
}

router.post("/generate",             requireAuth, controller.generate);
router.get("/user",                  requireAuth, controller.getUserRoadmaps);
router.get("/:id/items",             requireAuth, controller.getRoadmapItems);
router.post("/:id/items",            requireAuth, controller.addItem);
router.delete("/:id",                requireAuth, controller.deleteRoadmap);
router.delete("/items/:id",          requireAuth, controller.deleteItem);
router.patch("/items/:id/complete",  requireAuth, controller.updateComplete);
router.patch("/items/:id/text",      requireAuth, controller.updateItemText);

module.exports = router;
