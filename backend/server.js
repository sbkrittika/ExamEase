const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
    cors({
        origin: "*",
        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "ExamEase Backend is Running!"
    });
});

app.use("/api/auth", authRoutes);

// ================================
// CREATE USERS TABLE IF NOT EXISTS
// ================================

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

db.query(createUsersTable, (err) => {
    if (err) {
        console.error(
            "Users table creation failed:",
            err.message
        );
    } else {
        console.log("Users table is ready!");
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `ExamEase server running on port ${PORT}`
    );
});