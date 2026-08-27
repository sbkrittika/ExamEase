const db = require("../config/db");

const addCourse = async (req, res) => {
    const {
        course_code,
        section,
        course_title,
        semester,
        department
    } = req.body;

    if (!course_code || !section || !course_title || !semester || !department) {
        return res.status(400).json({
            success: false,
            message: "All course fields are required."
        });
    }

    const sql = `
        INSERT INTO courses
        (course_code, section, course_title, semester, department)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        await db.promise().query(sql, [String(course_code).trim(), String(section).trim(), String(course_title).trim(), Number(semester), String(department).trim()]);
        res.status(201).json({ success: true, message: "Course added successfully." });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "This course and section already exist." });
        console.error("Add course error:", err.message);
        res.status(500).json({ success: false, message: "Failed to add course." });
    }
};



const getCourses = async (req, res) => {

    const sql = `
        SELECT
            course_code,
            section,
            course_title,
            semester,
            department
        FROM courses
        ORDER BY semester, course_code, section
    `;

    try {
        const [results] = await db.promise().query(sql);
        res.json({ success: true, courses: results });
    } catch (err) {
        console.error("Get courses error:", err.message);
        res.status(500).json({ success: false, message: "Failed to fetch courses." });
    }
};

const deleteCourse = async (req, res) => {
    try {
        await db.promise().query("DELETE FROM courses WHERE course_code = ? AND section = ?", [req.params.code, req.params.section || "A"]);
        res.json({ success: true, message: "Course deleted successfully." });
    } catch (err) {
        console.error("Delete course error:", err.message);
        res.status(500).json({ success: false, message: "Failed to delete course." });
    }
};

module.exports = {
    addCourse,
    getCourses,
    deleteCourse
};