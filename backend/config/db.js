const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
    ssl: process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: false }
});

db.on("error", (err) => {
    console.error("MySQL pool error:", err && err.message ? err.message : err);
});

module.exports = db;