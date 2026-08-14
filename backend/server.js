require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const examRoutes = require("./routes/examRoutes");

const app = express();


app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/exams", examRoutes);


app.get("/", (req, res) => {
    res.json({
        message: "ExamEase Backend is Running!"
    });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ExamEase server running on port ${PORT}`);
});