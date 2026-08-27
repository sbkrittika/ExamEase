const db = require("../config/db");



const addCourse = (req, res) => {
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

    db.query(
        sql, [course_code, section, course_title, semester, department],
        (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        success: false,
                        message: "This course and section already exist."
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: "Failed to add course.",
                    error: err.message
                });
            }

            res.status(201).json({
                success: true,
                message: "Course added successfully."
            });
        }
    );
};



const getCourses = (req, res) => {

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

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch courses.",
                error: err.message
            });
        }

        res.json({
            success: true,
            courses: results
        });
    });
};

const deleteCourse = (req, res) => db.query("DELETE FROM courses WHERE course_code = ?", [req.params.code], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to delete course.", error: err.message });
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Course not found." });
    res.json({ success: true, message: "Course deleted successfully." });
});

module.exports = {
    addCourse,
    getCourses,
    deleteCourse
};