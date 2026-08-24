const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Set a reasonable connect timeout so requests fail fast if DB is unreachable
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10),
    ssl: {
        rejectUnauthorized: false
    }
});

// Log and rethrow connection errors so API handlers don't hang indefinitely
db.on('error', (err) => {
    console.error('MySQL connection error (event):', err && err.message ? err.message : err);
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected successfully!");
    console.log("DATABASE:", process.env.DB_NAME);
    console.log("HOST:", process.env.DB_HOST);
});

module.exports = db;