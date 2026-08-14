const db = require("../config/db");


const addExam = (req, res) => {

    const {
        exam_date,
        start_time,
        end_time,
        exam_type,
        created_by,
        course_code,
        total_students
    } = req.body;

    if (
        !exam_date ||
        !start_time ||
        !end_time ||
        !created_by ||
        !course_code ||
        !total_students
    ) {
        return res.status(400).json({
            success: false,
            message: "Required exam fields are missing."
        });
    }

  
    const checkCourse = `
        SELECT course_code
        FROM courses
        WHERE course_code = ?
        LIMIT 1
    `;

    db.query(checkCourse, [course_code], (err, courseResults) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: "Database error.",
                error: err.message
            });
        }

        if (courseResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Course not found."
            });
        }

        // Start transaction
        db.beginTransaction((err) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Could not start transaction.",
                    error: err.message
                });
            }

      
            const examSQL = `
                INSERT INTO exams
                (exam_date, start_time, end_time, exam_type, created_by)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.query(
                examSQL,
                [
                    exam_date,
                    start_time,
                    end_time,
                    exam_type || null,
                    created_by
                ],
                (err, examResult) => {

                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({
                                success: false,
                                message: "Failed to create exam.",
                                error: err.message
                            });
                        });
                    }

                    const examId = examResult.insertId;

                   
                    const examCourseSQL = `
                        INSERT INTO exam_courses
                        (exam_id, course_code, total_students)
                        VALUES (?, ?, ?)
                    `;

                    db.query(
                        examCourseSQL,
                        [
                            examId,
                            course_code,
                            total_students
                        ],
                        (err) => {

                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({
                                        success: false,
                                        message: "Failed to connect course to exam.",
                                        error: err.message
                                    });
                                });
                            }

                            db.commit((err) => {

                                if (err) {
                                    return db.rollback(() => {
                                        res.status(500).json({
                                            success: false,
                                            message: "Failed to save exam.",
                                            error: err.message
                                        });
                                    });
                                }

                                res.status(201).json({
                                    success: true,
                                    message: "Exam created successfully.",
                                    exam_id: examId
                                });
                            });
                        }
                    );
                }
            );
        });
    });
};



const getExams = (req, res) => {

    const sql = `
        SELECT
            e.exam_id,
            e.exam_date,
            e.start_time,
            e.end_time,
            e.exam_type,
            e.created_by,
            ec.course_code,
            ec.total_students
        FROM exams e
        LEFT JOIN exam_courses ec
            ON e.exam_id = ec.exam_id
        ORDER BY e.exam_date, e.start_time
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch exams.",
                error: err.message
            });
        }

        res.json({
            success: true,
            exams: results
        });
    });
};


module.exports = {
    addExam,
    getExams
};