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

        // Start transaction on a dedicated pool connection.
        db.getConnection((connectionError, transactionConnection) => {
            if (connectionError) return res.status(500).json({ success: false, message: "Could not connect to database.", error: connectionError.message });
            transactionConnection.beginTransaction((err) => {

                if (err) {
                    transactionConnection.release();
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

                transactionConnection.query(
                    examSQL, [
                        exam_date,
                        start_time,
                        end_time,
                        exam_type || null,
                        created_by
                    ],
                    (err, examResult) => {

                        if (err) {
                            return transactionConnection.rollback(() => {
                                transactionConnection.release();
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

                        transactionConnection.query(
                            examCourseSQL, [
                                examId,
                                course_code,
                                total_students
                            ],
                            (err) => {

                                if (err) {
                                    return transactionConnection.rollback(() => {
                                        transactionConnection.release();
                                        res.status(500).json({
                                            success: false,
                                            message: "Failed to connect course to exam.",
                                            error: err.message
                                        });
                                    });
                                }

                                transactionConnection.commit((err) => {

                                    if (err) {
                                        return transactionConnection.rollback(() => {
                                            transactionConnection.release();
                                            res.status(500).json({
                                                success: false,
                                                message: "Failed to save exam.",
                                                error: err.message
                                            });
                                        });
                                    }

                                    transactionConnection.release();
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
        res.json({ success: true, exams: results });
    });
};


const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const XLSX = require('xlsx');
const { allocateStudents } = require('../utils/allocator');

function parseXlsxBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
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

function parseRoomRows(buffer, extension) {
    if (extension === '.md' || extension === '.markdown') {
        const text = buffer.toString('utf8');
        const rooms = new Map();
        let currentRoom = null;
        let roomColumns = [];
        for (const line of text.split(/\r?\n/)) {
            const cells = line.split('|').map((cell) => cell.trim());
            if (cells.length < 3) continue;
            if (/^course$/i.test(cells[1])) {
                roomColumns = cells.slice(2).filter((cell) => cell && !/^total$/i.test(cell));
                roomColumns.forEach((roomNumber) => rooms.set(roomNumber, { room_number: roomNumber, capacity: 0 }));
                continue;
            }
            if (/^room$/i.test(cells[1]) || cells.some((cell) => /^column/i.test(cell) || /^invigilator$/i.test(cell))) continue;
            if (roomColumns.length && cells[1] && !/^[-:]+$/.test(cells[1])) {
                cells.slice(2, 2 + roomColumns.length).forEach((cell, index) => {
                    rooms.get(roomColumns[index]).capacity += (cell.match(/\d{9}/g) || []).length;
                });
                continue;
            }
            if (cells[1] && !/^[-:]+$/.test(cells[1]) && !/^course$/i.test(cells[1]) && !/^total$/i.test(cells[1])) currentRoom = cells[1];
            if (currentRoom) rooms.get(currentRoom).capacity += cells.slice(2).filter((cell) => /\d{9}/.test(cell)).flatMap((cell) => cell.match(/\d{9}/g) || []).length;
        }
        return Array.from(rooms.values()).filter((room) => room.capacity > 0);
    }
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = extension === '.json' ? JSON.parse(buffer.toString('utf8')) : XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.map((row) => {
        const value = (names) => names.map((name) => row[name]).find((item) => item !== undefined && item !== '');
        return { room_number: String(value(['room_number', 'Room Number', 'room', 'Room', 'room_name']) || '').trim(), building: String(value(['building', 'Building', 'location']) || '').trim(), capacity: Number(value(['capacity', 'Capacity', 'seats', 'Seats']) || 0) };
    }).filter((room) => room.room_number && room.capacity > 0);
}

function parseMarkdownStudents(buffer) {
    const students = [];
    for (const line of buffer.toString('utf8').split(/\r?\n/)) {
        const cells = line.split('|').map((cell) => cell.trim());
        if (cells.length < 3 || !cells[1] || /^(course|total)$/i.test(cells[1]) || /^[-:]+$/.test(cells[1])) continue;
        const courseCode = cells[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
        for (const cell of cells.slice(2))
            for (const studentId of cell.match(/\b\d{9}\b/g) || []) students.push({ student_id: studentId, name: '', course_code: courseCode });
    }
    return students;
}

function parseStudentRows(buffer, extension) {
    if (extension === '.json') {
        const rows = JSON.parse(buffer.toString('utf8'));
        return rows.map((row) => ({ student_id: String(row.student_id || row.id || '').trim(), name: String(row.name || row.student_name || '').trim(), course_code: String(row.course_code || row.course || '').trim() })).filter((student) => student.student_id);
    }
    return parseXlsxBuffer(buffer);
}

const uploadZip = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ZIP or XLSX file required (multipart/form-data field name = file)' });
    try {
        let workbookBuffer = req.file.buffer;
        let sourceExtension = path.extname(req.file.originalname).toLowerCase();
        let roomRows = [];
        let hasStudentData = sourceExtension !== '.zip';
        if (sourceExtension === '.md' || sourceExtension === '.markdown') roomRows = parseRoomRows(req.file.buffer, sourceExtension);
        if (sourceExtension !== '.zip' && /room|seat.?plan/i.test(req.file.originalname) && ['.xlsx', '.csv', '.json', '.md', '.markdown'].includes(sourceExtension)) {
            roomRows = parseRoomRows(req.file.buffer, sourceExtension);
            hasStudentData = false;
        }
        if (sourceExtension === '.zip') {
            const zip = new AdmZip(req.file.buffer);
            const entries = zip.getEntries();
            const roomEntry = entries.find((entry) => /room|seat.?plan/i.test(entry.entryName) && /\.(xlsx|csv|json|md|markdown)$/i.test(entry.entryName));
            if (roomEntry) {
                roomRows = parseRoomRows(roomEntry.getData(), path.extname(roomEntry.entryName).toLowerCase());
            }
            const dataEntry = entries.find((entry) => /\.(xlsx|csv|json)$/i.test(entry.entryName) && entry !== roomEntry);
            if (dataEntry) {
                workbookBuffer = dataEntry.getData();
                sourceExtension = path.extname(dataEntry.entryName).toLowerCase();
            } else hasStudentData = false;
        }

        const students = hasStudentData ? (sourceExtension === '.md' || sourceExtension === '.markdown' ? parseMarkdownStudents(workbookBuffer) : parseStudentRows(workbookBuffer, sourceExtension)) : [];

        // Insert students and courses into DB (upsert style)
        const insertStudent = `INSERT INTO students (student_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`;
        const insertEnroll = `INSERT INTO student_courses (student_id, course_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE student_id = student_id`;
        const insertRoom = `INSERT INTO rooms (room_number, building, capacity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE building = VALUES(building), capacity = VALUES(capacity)`;
        const insertCourse = `INSERT INTO courses (course_code, section, course_title, semester, department) VALUES (?, 'A', ?, 1, 'Imported') ON DUPLICATE KEY UPDATE course_code = VALUES(course_code)`;

        db.getConnection((err, conn) => {
            if (err) return res.status(500).json({ error: err.message });
            conn.beginTransaction(transactionErr => {
                if (transactionErr) return res.status(500).json({ error: transactionErr.message });

                (async() => {
                    try {
                        for (const s of students) {
                            await new Promise((resolve, reject) => conn.query(insertStudent, [s.student_id, s.name || s.student_id], (e) => e ? reject(e) : resolve()));
                            if (s.course_code) {
                                await new Promise((resolve, reject) => conn.query(insertCourse, [s.course_code, s.course_code], (e) => e ? reject(e) : resolve()));
                                const courseExists = await new Promise((resolve, reject) => conn.query('SELECT course_code FROM courses WHERE course_code = ?', [s.course_code], (e, rows) => e ? reject(e) : resolve(rows.length > 0)));
                                if (!courseExists) throw new Error(`Course not found: ${s.course_code}`);
                                await new Promise((resolve, reject) => conn.query(insertEnroll, [s.student_id, s.course_code], (e) => e ? reject(e) : resolve()));
                            }
                        }
                        for (const room of roomRows) {
                            await new Promise((resolve, reject) => conn.query(insertRoom, [room.room_number, room.building || null, room.capacity], (e) => e ? reject(e) : resolve()));
                        }
                        conn.commit(cErr => {
                            if (cErr) return conn.rollback(() => res.status(500).json({ error: cErr.message }));
                            conn.release();
                            res.json({ imported: students.length, roomsImported: roomRows.length });
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
    const fetchSql = `SELECT s.student_id, s.name, COALESCE(s.course_code, sc.course_code) AS course_code FROM students s LEFT JOIN student_courses sc ON s.student_id = sc.student_id WHERE 1 = 1${studentFilter}${courseFilter}`;
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
        db.query('SELECT room_id, room_number, capacity FROM rooms WHERE room_id IN (?) AND status = "Available"', [roomIds], (roomError, roomRows) => {
            if (roomError) return res.status(500).json({ error: roomError.message });
            if (roomRows.length !== roomIds.length) return res.status(400).json({ error: 'One or more selected rooms are unavailable or do not exist.' });
            const capacity = roomRows.reduce((total, room) => total + Number(room.capacity), 0);
            if (capacity < students.length) return res.status(400).json({ error: `Insufficient capacity. Students: ${students.length}; available capacity: ${capacity}; additional capacity required: ${students.length - capacity}.` });

            const { allocations, warnings } = allocateStudents(students, roomRows, { maxCoursesPerRoom: maxCoursesPerRoom || 4, preferredRoomId: desiredRoomId });
            if (!allocations) return res.status(400).json({ error: 'Allocation failed', warnings });

            // Save the exam and room-only allocations in one transaction.
            const insertExam = `INSERT INTO exams (exam_date, start_time, end_time, created_by) VALUES (?, ?, ?, ?)`;
            db.getConnection((cErr, conn) => {
                if (cErr) return res.status(500).json({ error: cErr.message });
                conn.beginTransaction(tErr => {
                    if (tErr) return res.status(500).json({ error: tErr.message });
                    const creator = (req.user && req.user.user_id) || req.body.created_by || null;
                    conn.query(insertExam, [exam_date, exam_time, req.body.end_time || exam_time, creator], (ieErr, ieRes) => {
                        if (ieErr) return conn.rollback(() => res.status(500).json({ error: ieErr.message }));
                        const examId = ieRes.insertId;
                        const courseTotals = new Map();
                        for (const student of students) {
                            if (student.course_code) courseTotals.set(student.course_code, (courseTotals.get(student.course_code) || 0) + 1);
                        }
                        const courseRows = Array.from(courseTotals.entries()).map(([code, total]) => [examId, code, total]);
                        const saveCourseRows = (courseError) => {
                            if (courseError) return conn.rollback(() => res.status(500).json({ error: courseError.message }));
                            const insertAlloc = `INSERT INTO exam_allocations (exam_id, room_id, student_id) VALUES ?`;
                            const rowsToInsert = [];
                            for (const roomId of Object.keys(allocations)) {
                                for (const s of allocations[roomId]) rowsToInsert.push([examId, roomId, s.student_id]);
                            }
                            if (rowsToInsert.length === 0) {
                                conn.commit(() => {
                                    conn.release();
                                    res.json({ allocations, warnings });
                                });
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
                        };
                        if (courseRows.length === 0) saveCourseRows(null);
                        else conn.query('INSERT INTO exam_courses (exam_id, course_code, total_students) VALUES ?', [courseRows], saveCourseRows);
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