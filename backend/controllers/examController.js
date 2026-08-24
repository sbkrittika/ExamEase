const fs = require("fs");
const os = require("os");
const path = require("path");
const AdmZip = require("adm-zip");
const XLSX = require("xlsx");
const db = require("../config/db");
const { allocateStudents } = require("../utils/allocator");

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

    if (!exam_date || !start_time || !end_time || !created_by || !course_code || !total_students) {
        return res.status(400).json({
            success: false,
            message: "Required exam fields are missing."
        });
    }

    const checkCourse = `SELECT course_code FROM courses WHERE course_code = ? LIMIT 1`;
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

        db.beginTransaction((txErr) => {
            if (txErr) {
                return res.status(500).json({
                    success: false,
                    message: "Could not start transaction.",
                    error: txErr.message
                });
            }

            const examSQL = `
                INSERT INTO exams (exam_date, start_time, end_time, exam_type, created_by)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.query(examSQL, [exam_date, start_time, end_time, exam_type || null, created_by], (examErr, examResult) => {
                if (examErr) {
                    return db.rollback(() => {
                        res.status(500).json({
                            success: false,
                            message: "Failed to create exam.",
                            error: examErr.message
                        });
                    });
                }

                const examId = examResult.insertId;
                const examCourseSQL = `INSERT INTO exam_courses (exam_id, course_code, total_students) VALUES (?, ?, ?)`;

                db.query(examCourseSQL, [examId, course_code, total_students], (linkErr) => {
                    if (linkErr) {
                        return db.rollback(() => {
                            res.status(500).json({
                                success: false,
                                message: "Failed to connect course to exam.",
                                error: linkErr.message
                            });
                        });
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            return db.rollback(() => {
                                res.status(500).json({
                                    success: false,
                                    message: "Failed to save exam.",
                                    error: commitErr.message
                                });
                            });
                        }

                        res.status(201).json({
                            success: true,
                            message: "Exam created successfully.",
                            exam_id: examId
                        });
                    });
                });
            });
        });
    });
};

const getExams = (req, res) => {
    const sql = `
        SELECT e.exam_id, e.exam_date, e.start_time, e.end_time, e.exam_type, e.created_by, ec.course_code, ec.total_students
        FROM exams e
        LEFT JOIN exam_courses ec ON e.exam_id = ec.exam_id
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

        res.json({ success: true, exams: results });
    });
};

function parseXlsxBuffer(buffer) {
    const tmp = path.join(os.tmpdir(), 'exam-imp-' + Date.now() + '.xlsx');
    fs.writeFileSync(tmp, buffer);
    const workbook = XLSX.readFile(tmp);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    function colVal(row, names) {
        for (const n of names) if (row[n] !== undefined) return row[n];
        return '';
    }

    return data.map(r => ({
        student_id: String(colVal(r, ['student_id', 'Student ID', 'StudentID', 'id', 'ID'])).trim(),
        student_name: String(colVal(r, ['name', 'Name', 'student_name', 'Student Name'])).trim(),
        course_code: String(colVal(r, ['course_code', 'Course Code', 'Course', 'course'])).trim(),
        semester: String(colVal(r, ['semester', 'Semester'])).trim()
    })).filter(s => s.student_id);
}

const uploadZip = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'zip file required (multipart/form-data field name = file)' });

    try {
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();
        const xlsxEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.xlsx'));
        if (!xlsxEntry) return res.status(400).json({ error: 'no .xlsx file inside zip' });

        const students = parseXlsxBuffer(xlsxEntry.getData());
        if (!students.length) return res.status(400).json({ error: 'No student rows found in the Excel file.' });

        const insertCourse = `
            INSERT INTO courses (course_code, section, course_title, semester, department)
            VALUES (?, 'A', ?, ?, 'General')
            ON DUPLICATE KEY UPDATE course_title = VALUES(course_title), semester = VALUES(semester)
        `;

        const insertStudent = `
            INSERT INTO students (student_id, student_name, semester, course_code)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE student_name = VALUES(student_name), semester = VALUES(semester), course_code = VALUES(course_code)
        `;

        db.getConnection((err, conn) => {
            if (err) return res.status(500).json({ error: err.message });
            conn.beginTransaction((txErr) => {
                if (txErr) return res.status(500).json({ error: txErr.message });

                const run = async () => {
                    try {
                        for (const s of students) {
                            const sem = s.semester ? Number(s.semester) : 0;
                            if (s.course_code) {
                                await new Promise((resolve, reject) => {
                                    conn.query(insertCourse, [s.course_code, s.course_code, sem], (e) => e ? reject(e) : resolve());
                                });
                            }
                            await new Promise((resolve, reject) => {
                                conn.query(insertStudent, [s.student_id, s.student_name || 'Unknown', sem, s.course_code || ''], (e) => e ? reject(e) : resolve());
                            });
                        }

                        conn.commit((commitErr) => {
                            if (commitErr) return conn.rollback(() => res.status(500).json({ error: commitErr.message }));
                            conn.release();
                            res.json({ imported: students.length });
                        });
                    } catch (ex) {
                        conn.rollback(() => {
                            conn.release();
                            res.status(500).json({ error: ex.message });
                        });
                    }
                };

                run();
            });
        });
    } catch (ex) {
        res.status(500).json({ error: ex.message });
    }
};

const allocate = (req, res) => {
    const { exam_date, exam_time, roomIds, studentIds, maxCoursesPerRoom } = req.body;
    if (!exam_date || !exam_time || !Array.isArray(roomIds) || roomIds.length === 0) {
        return res.status(400).json({ error: 'exam_date, exam_time and roomIds are required' });
    }

    const fetchSql = studentIds && studentIds.length
        ? 'SELECT student_id, student_name AS name, course_code FROM students WHERE student_id IN (?)'
        : 'SELECT student_id, student_name AS name, course_code FROM students';

    db.query(fetchSql, studentIds && studentIds.length ? [studentIds] : [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const students = rows
            .filter(r => r.student_id)
            .map(r => ({ student_id: r.student_id, name: r.name || 'Unknown', course_code: r.course_code || 'UNASSIGNED' }));

        const { allocations, warnings } = allocateStudents(students, roomIds, { maxCoursesPerRoom: maxCoursesPerRoom || 4 });
        if (!allocations) return res.status(400).json({ error: 'Allocation failed', warnings });

        const insertExam = 'INSERT INTO exams (exam_date, start_time, end_time, exam_type, created_by) VALUES (?, ?, ?, ?, ?)';
        db.query(insertExam, [exam_date, exam_time, exam_time, 'BED_ALLOC', 0], (insertErr, insertResult) => {
            if (insertErr) {
                return res.status(500).json({ error: insertErr.message });
            }

            res.json({
                success: true,
                exam_id: insertResult.insertId,
                allocations,
                warnings
            });
        });
    });
};

module.exports = {
    addExam,
    getExams,
    uploadZip,
    allocate
};
