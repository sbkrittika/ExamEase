const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
console.log("DB NAME FROM RENDER:", process.env.DB_NAME);
console.log("DB HOST FROM RENDER:", process.env.DB_HOST);
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "ExamEase Backend is Running!"
    });
});

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'faculty') NOT NULL,
        designation VARCHAR(150),
        department VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const createStudentsTable = `
    CREATE TABLE IF NOT EXISTS students (
        student_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255)
    )
`;

const createCoursesTable = `
    CREATE TABLE IF NOT EXISTS courses (
        course_code VARCHAR(64) PRIMARY KEY
    )
`;

const createStudentCourses = `
    CREATE TABLE IF NOT EXISTS student_courses (
        student_id VARCHAR(64),
        course_code VARCHAR(64),
        PRIMARY KEY (student_id, course_code),
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
    )
`;

const createExamsTable = `
    CREATE TABLE IF NOT EXISTS exams (
        exam_id INT AUTO_INCREMENT PRIMARY KEY,
        exam_date DATE,
        exam_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const createExamAllocations = `
    CREATE TABLE IF NOT EXISTS exam_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id INT,
        room_id VARCHAR(128),
        student_id VARCHAR(64),
        FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE
    )
`;

const tables = [createUsersTable, createStudentsTable, createCoursesTable, createStudentCourses, createExamsTable, createExamAllocations];

(function createAll(i) {
    if (i >= tables.length) {
        console.log('All tables ready');
        // mount routes after tables ready
        app.use('/api/auth', authRoutes);

        // mount exam routes
        const examRoutes = require('./routes/examRoutes');
        app.use('/api/exams', examRoutes);

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`ExamEase server running on port ${PORT}`);
        });
        return;
    }
    db.query(tables[i], (err) => {
        if (err) {
            console.error('Table creation failed:', err.message);
            return;
        }
        console.log('Created table', i);
        createAll(i + 1);
    });
})(0);