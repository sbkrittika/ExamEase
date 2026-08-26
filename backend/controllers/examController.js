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

    if (!exam_date ||
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
                examSQL, [
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
                        examCourseSQL, [
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


const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const XLSX = require('xlsx');
const { allocateStudents } = require('../utils/allocator');

function parseXlsxBuffer(buffer) {
    const tmp = path.join(os.tmpdir(), 'exam-imp-' + Date.now() + '.xlsx');
    fs.writeFileSync(tmp, buffer);
    const workbook = XLSX.readFile(tmp);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    function colVal(row, names) {
        for (const n of names)
            if (row[n] !== undefined) return row[n];
        return '';
    }

    return data.map(r => ({
        student_id: String(colVal(r, ['student_id', 'Student ID', 'StudentID', 'id', 'ID'])).trim(),
        name: String(colVal(r, ['name', 'Name'])).trim(),
        course_code: String(colVal(r, ['course_code', 'Course Code', 'Course', 'course'])).trim()
    })).filter(s => s.student_id);
}

const uploadZip = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ZIP or XLSX file required (multipart/form-data field name = file)' });
    try {
        let workbookBuffer = req.file.buffer;
        if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) {
            const zip = new AdmZip(req.file.buffer);
            const entries = zip.getEntries();
            const xlsxEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.xlsx'));
            if (!xlsxEntry) return res.status(400).json({ error: 'no .xlsx file inside ZIP' });
            workbookBuffer = xlsxEntry.getData();
        }

        const students = parseXlsxBuffer(workbookBuffer);

        // Insert students and courses into DB (upsert style)
        const insertStudent = `INSERT INTO students (student_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`;
        const insertCourse = `INSERT INTO courses (course_code) VALUES (?) ON DUPLICATE KEY UPDATE course_code = course_code`;
        const insertEnroll = `INSERT INTO student_courses (student_id, course_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE student_id = student_id`;

        db.getConnection((err, conn) => {
            if (err) return res.status(500).json({ error: err.message });
            conn.beginTransaction(transactionErr => {
                if (transactionErr) return res.status(500).json({ error: transactionErr.message });

                (async() => {
                    try {
                        for (const s of students) {
                            await new Promise((resolve, reject) => conn.query(insertStudent, [s.student_id, s.name || null], (e) => e ? reject(e) : resolve()));
                            if (s.course_code) {
                                await new Promise((resolve, reject) => conn.query(insertCourse, [s.course_code], (e) => e ? reject(e) : resolve()));
                                await new Promise((resolve, reject) => conn.query(insertEnroll, [s.student_id, s.course_code], (e) => e ? reject(e) : resolve()));
                            }
                        }
                        conn.commit(cErr => {
                            if (cErr) return conn.rollback(() => res.status(500).json({ error: cErr.message }));
                            conn.release();
                            res.json({ imported: students.length });
                        });
                    } catch (ex) {
                        conn.rollback(() => conn.release());
                        res.status(500).json({ error: ex.message });
                    }
                })();
            });
        });
    } catch (ex) {
        res.status(500).json({ error: ex.message });
    }
};

const allocate = (req, res) => {
    // body: { exam_date, exam_time, roomIds: [], studentIds: [] }
    const { exam_date, exam_time, roomIds, studentIds, course_code, desiredRoomId, maxCoursesPerRoom } = req.body;
    if (!exam_date || !exam_time || !Array.isArray(roomIds) || roomIds.length === 0) return res.status(400).json({ error: 'exam_date, exam_time and roomIds are required' });

    // fetch students either by provided ids or all students
    const studentFilter = studentIds && studentIds.length ? ' AND s.student_id IN (?)' : '';
    const courseFilter = course_code ? ' AND sc.course_code = ?' : '';
    const fetchSql = `SELECT s.student_id, s.name, sc.course_code FROM students s LEFT JOIN student_courses sc ON s.student_id = sc.student_id WHERE 1 = 1${studentFilter}${courseFilter}`;
    const fetchParams = [];
    if (studentIds && studentIds.length) fetchParams.push(studentIds);
    if (course_code) fetchParams.push(course_code);

    db.query(fetchSql, fetchParams, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // rows may contain multiple rows per student (one per course). Convert to per-student with course_code (if multiple courses choose first)
        const studentsMap = new Map();
        for (const r of rows) {
            if (!studentsMap.has(r.student_id)) studentsMap.set(r.student_id, { student_id: r.student_id, name: r.name, course_code: r.course_code });
            else if (!studentsMap.get(r.student_id).course_code && r.course_code) studentsMap.get(r.student_id).course_code = r.course_code;
        }
        const students = Array.from(studentsMap.values());

        const { allocations, warnings } = allocateStudents(students, roomIds, { maxCoursesPerRoom: maxCoursesPerRoom || 4, preferredRoomId: desiredRoomId });
        if (!allocations) return res.status(400).json({ error: 'Allocation failed', warnings });

        // Save allocations in DB: exams and exam_allocations
        const insertExam = `INSERT INTO exams (exam_date, exam_time) VALUES (?, ?)`;
        db.getConnection((cErr, conn) => {
            if (cErr) return res.status(500).json({ error: cErr.message });
            conn.beginTransaction(tErr => {
                if (tErr) return res.status(500).json({ error: tErr.message });
                conn.query(insertExam, [exam_date, exam_time], (ieErr, ieRes) => {
                    if (ieErr) return conn.rollback(() => res.status(500).json({ error: ieErr.message }));
                    const examId = ieRes.insertId;
                    const insertAlloc = `INSERT INTO exam_allocations (exam_id, room_id, student_id) VALUES ?`;
                    const rowsToInsert = [];
                    for (const roomId of Object.keys(allocations)) {
                        for (const s of allocations[roomId]) rowsToInsert.push([examId, roomId, s.student_id]);
                    }
                    if (rowsToInsert.length === 0) {
                        conn.commit(() => { conn.release();
                            res.json({ allocations, warnings }); });
                        return;
                    }
                    conn.query(insertAlloc, [rowsToInsert], (iaErr) => {
                        if (iaErr) return conn.rollback(() => res.status(500).json({ error: iaErr.message }));
                        conn.commit(cmtErr => {
                            if (cmtErr) return conn.rollback(() => res.status(500).json({ error: cmtErr.message }));
                            conn.release();
                            res.json({ allocations, warnings, examId });
                        });
                    });
                });
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