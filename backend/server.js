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
    : [
        "https://examease-delta.vercel.app",
        "https://examease-81dojdr99-krittika4.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ];

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



app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/exams", examRoutes);
app.use("/api", resourceRoutes);


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
