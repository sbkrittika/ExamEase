const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const examRoutes = require("./routes/examRoutes");
const resourceRoutes = require("./routes/resourceRoutes");

const app = express();
const configuredOrigins = (process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = configuredOrigins.length
    ? configuredOrigins
    : ["https://examease-81dojdr99-krittika4.vercel.app", "http://localhost:5173", "http://localhost:3000"];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => res.json({ success: true, message: "ExamEase Backend is running." }));
app.get("/api/health", async (req, res) => {
    try {
        await db.promise().query("SELECT 1");
        res.json({ success: true, database: "connected" });
    } catch {
        res.status(503).json({ success: false, database: "unavailable" });
    }
});

const tables = [
    `CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
        role ENUM('student','faculty') NOT NULL, designation VARCHAR(150),
        department VARCHAR(150) NOT NULL, phone VARCHAR(30), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS courses (
        course_code VARCHAR(30) NOT NULL, section VARCHAR(10) NOT NULL DEFAULT 'A',
        course_title VARCHAR(150) NOT NULL, semester INT NOT NULL, department VARCHAR(100) NOT NULL,
        credit DECIMAL(3,1) NOT NULL DEFAULT 3, PRIMARY KEY (course_code, section)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS students (
        student_id VARCHAR(30) PRIMARY KEY, student_name VARCHAR(150) NOT NULL,
        semester INT NOT NULL, course_code VARCHAR(30) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY course_code_idx (course_code)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS rooms (
        room_id INT AUTO_INCREMENT PRIMARY KEY, room_number VARCHAR(30) NOT NULL UNIQUE,
        building VARCHAR(100), capacity INT NOT NULL, status ENUM('Available','Unavailable') NOT NULL DEFAULT 'Available'
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS exams (
        exam_id INT AUTO_INCREMENT PRIMARY KEY, exam_date DATE NOT NULL, start_time TIME NOT NULL,
        end_time TIME NOT NULL, exam_type VARCHAR(50), created_by INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY exam_date_idx (exam_date)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS exam_courses (
        exam_course_id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT NOT NULL,
        course_code VARCHAR(30) NOT NULL, total_students INT NOT NULL DEFAULT 0,
        UNIQUE KEY exam_course_unique (exam_id, course_code)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS seat_allocations (
        allocation_id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT NOT NULL, student_id VARCHAR(30) NOT NULL,
        course_code VARCHAR(30) NOT NULL, room_id INT NOT NULL, row_no INT, column_no INT, seat_no INT,
        UNIQUE KEY exam_student_unique (exam_id, student_id)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS invigilator_assignments (
        assignment_id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT NOT NULL, room_id INT NOT NULL,
        faculty_id INT NOT NULL, assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY exam_faculty_unique (exam_id, faculty_id)
    ) ENGINE=InnoDB`
];
const migrations = [
    "ALTER TABLE users ADD COLUMN role ENUM('student','faculty') NOT NULL DEFAULT 'faculty'",
    "ALTER TABLE courses ADD COLUMN credit DECIMAL(3,1) NOT NULL DEFAULT 3",
    "ALTER TABLE students ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
];

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/exams", examRoutes);
app.use("/api", resourceRoutes);

app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    console.error("Unhandled request error:", err.message);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
});

async function start() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
        throw new Error("JWT_SECRET must be configured with a secure value.");
    }
    for (const table of tables) await db.promise().query(table);
    for (const migration of migrations) {
        try { await db.promise().query(migration); } catch (error) {
            // MySQL reports duplicate-column when an existing deployment is already up to date.
            if (error.code !== "ER_DUP_FIELDNAME") throw error;
        }
    }
    const port = Number(process.env.PORT || 5000);
    app.listen(port, "0.0.0.0", () => console.log(`ExamEase server running on port ${port}`));
}

if (require.main === module) {
    start().catch((error) => {
        console.error("Database startup failed:", error.message);
        process.exitCode = 1;
    });
}

module.exports = { app, start };
