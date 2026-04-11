const mysql = require("mysql2/promise");

// Connect to MySQL using a connection pool
const db = mysql.createPool(process.env.MYSQL_URL || {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || "auth_app",
});

// Create the tables when the app starts
async function setupDatabase() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE,
            email VARCHAR(150) UNIQUE,
            password VARCHAR(255)
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS roadmaps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            title VARCHAR(255),
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS roadmap_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roadmap_id INT,
            sort_order INT,
            text TEXT,
            completed TINYINT DEFAULT 0,
            indent_level INT DEFAULT 1
        )
    `);

    console.log("Connected to MySQL");
}

db.ready = setupDatabase();

module.exports = db;
