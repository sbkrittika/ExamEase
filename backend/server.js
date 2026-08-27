const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
console.log("DB NAME FROM RENDER:", process.env.DB_NAME);
console.log("DB HOST FROM RENDER:", process.env.DB_HOST);
const authRoutes = require("./routes/authRoutes");
const dataRoutes = require("./routes/dataRoutes");
const courseRoutes = require("./routes/courseRoutes");

const app = express();

const corsOptions = {
    origin: [
        "https://examease-81dojdr99-krittika4.vercel.app",
        "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "ExamEase Backend is Running!"
    });
});

const createUsersTable = `CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
    role ENUM('student', 'faculty') NOT NULL, designation VARCHAR(150),
    department VARCHAR(150) NOT NULL, phone VARCHAR(30), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;
const createStudentsTable = `CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY, student_number VARCHAR(64), name VARCHAR(255) NOT NULL,
    email VARCHAR(255), department VARCHAR(150), semester INT, course_code VARCHAR(64)
)`;
const createCoursesTable = `CREATE TABLE IF NOT EXISTS courses (
    course_code VARCHAR(64) PRIMARY KEY, section VARCHAR(10) NOT NULL DEFAULT 'A',
    course_title VARCHAR(255) NOT NULL, semester INT NOT NULL DEFAULT 1, department VARCHAR(150) NOT NULL DEFAULT 'General'
)`;
const createRoomsTable = `CREATE TABLE IF NOT EXISTS rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY, room_number VARCHAR(20) NOT NULL UNIQUE,
    building VARCHAR(100), capacity INT NOT NULL, status ENUM('Available','Unavailable') DEFAULT 'Available'
)`;
const createStudentCourses = `CREATE TABLE IF NOT EXISTS student_courses (
    student_id VARCHAR(20), course_code VARCHAR(64), PRIMARY KEY (student_id, course_code),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`;
const createExamsTable = `CREATE TABLE IF NOT EXISTS exams (
    exam_id INT AUTO_INCREMENT PRIMARY KEY, exam_date DATE NOT NULL, start_time TIME NOT NULL,
    end_time TIME NOT NULL, exam_type VARCHAR(30), created_by INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
)`;
const createExamCourses = `CREATE TABLE IF NOT EXISTS exam_courses (
    exam_course_id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT NOT NULL, course_code VARCHAR(64) NOT NULL,
    total_students INT NOT NULL, FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (course_code) REFERENCES courses(course_code)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`;
const createExamAllocations = `CREATE TABLE IF NOT EXISTS exam_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT, room_id INT, student_id VARCHAR(64),
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`;
const createInvigilationTable = `CREATE TABLE IF NOT EXISTS invigilator_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT NOT NULL, room_id INT NOT NULL,
    faculty_id INT NOT NULL, assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id), FOREIGN KEY (faculty_id) REFERENCES users(user_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`;

const tables = [createUsersTable, createStudentsTable, createCoursesTable, createRoomsTable, createStudentCourses, createExamsTable, createExamCourses, createExamAllocations, createInvigilationTable];

(function createAll(i) {
    if (i >= tables.length) {
        console.log('All tables ready');
        // mount routes after tables ready
        app.use('/api/auth', authRoutes);
        app.use('/api/data', dataRoutes);
        app.use('/api/courses', courseRoutes);

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
            createAll(i + 1);
            return;
        }
        console.log('Created table', i);
        createAll(i + 1);
    });
})(0);