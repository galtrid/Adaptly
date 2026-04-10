const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || "railway",
    waitForConnections: true
});

db.ready = new Promise((resolve, reject) => {
    db.query(`CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE,
        email VARCHAR(150) UNIQUE,
        password VARCHAR(255)
    )`, err => { if (err) return reject(err);

    db.query(`CREATE TABLE IF NOT EXISTS roadmaps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        title VARCHAR(255),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, err => { if (err) return reject(err);

    db.query(`CREATE TABLE IF NOT EXISTS roadmap_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roadmap_id INT,
        sort_order INT,
        text TEXT,
        completed TINYINT DEFAULT 0,
        indent_level INT DEFAULT 1
    )`, err => { if (err) return reject(err);
        console.log("Connected to MySQL");
        resolve();
    });});});
});

module.exports = db;