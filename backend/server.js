require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");

const db = require("./database");
const authRoutes = require("./auth");
const aiRoutes = require("./routes/ai");
const roadmapRoutes = require("./routes/roadmap");

const app = express();
const PORT = process.env.PORT || 3000;

// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session
app.use(session({
    secret: process.env.SESSION_SECRET || "simple-secret",
    resave: false,
    saveUninitialized: false
}));

// logger
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// static
app.use(express.static(path.join(__dirname, "..", "public")));

// routes
app.use("/auth", authRoutes);
app.use("/api", aiRoutes);
app.use("/roadmap", roadmapRoutes);

// 404
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// start server after DB ready
db.ready.then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("DB failed:", err.message);
    process.exit(1);
});