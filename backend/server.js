const express = require("express");
const cors = require("cors");
require("dotenv").config();

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

app.use(
    "/api/auth",
    authRoutes
);

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `ExamEase server running on port ${PORT}`
        );
    }
);