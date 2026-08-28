const AdmZip = require("adm-zip");
const XLSX = require("xlsx");
const db = require("../config/db");
const { allocateStudents } = require("../utils/allocator");

const fail = (res, message, err) => {
    console.error(message, err && err.message);
    return res.status(500).json({ success: false, message });
};

const addExam = async (req, res) => {
    const { exam_date, start_time, end_time, exam_type, course_code, total_students } = req.body || {};
    if (!exam_date || !start_time || !end_time || !course_code || !Number.isInteger(Number(total_students)) || Number(total_students) < 0) {
        return res.status(400).json({ success: false, message: "Exam date, times, course and student count are required." });
    }
    try {
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [courses] = await connection.query("SELECT course_code FROM courses WHERE course_code = ? LIMIT 1", [course_code]);
            if (!courses.length) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: "Course not found." });
            }
            const [exam] = await connection.query(
                "INSERT INTO exams (exam_date,start_time,end_time,exam_type,created_by) VALUES (?,?,?,?,?)",
                [exam_date, start_time, end_time, exam_type || null, req.user.user_id]
            );
            await connection.query("INSERT INTO exam_courses (exam_id,course_code,total_students) VALUES (?,?,?)", [exam.insertId, course_code, Number(total_students)]);
            await connection.commit();
            res.status(201).json({ success: true, exam_id: exam.insertId, message: "Exam created successfully." });
        } catch (err) {
            await connection.rollback();
            fail(res, "Failed to create exam.", err);
        } finally { connection.release(); }
    } catch (err) { fail(res, "Failed to create exam.", err); }
};

const getExams = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT e.exam_id,e.exam_date,e.start_time,e.end_time,e.exam_type,e.created_by,
                    GROUP_CONCAT(ec.course_code ORDER BY ec.course_code SEPARATOR ', ') AS course_code,
                    COALESCE(SUM(ec.total_students),0) AS total_students
             FROM exams e LEFT JOIN exam_courses ec ON ec.exam_id=e.exam_id
             GROUP BY e.exam_id ORDER BY e.exam_date,e.start_time`
        );
        res.json({ success: true, exams: rows });
    } catch (err) { fail(res, "Failed to fetch exams.", err); }
};

const deleteExam = async (req, res) => {
    try {
        await db.promise().query("DELETE FROM exams WHERE exam_id = ?", [req.params.id]);
        res.json({ success: true, message: "Exam deleted successfully." });
    } catch (err) { fail(res, "Failed to delete exam.", err); }
};

const updateExam = async (req, res) => {
    const { exam_date, start_time, end_time, exam_type } = req.body || {};
    if (!exam_date || !start_time || !end_time) return res.status(400).json({ success: false, message: "Exam date and times are required." });
    try {
        const [result] = await db.promise().query(
            "UPDATE exams SET exam_date=?,start_time=?,end_time=?,exam_type=? WHERE exam_id=?",
            [exam_date, start_time, end_time, exam_type || null, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Exam not found." });
        res.json({ success: true, message: "Exam updated successfully." });
    } catch (err) { fail(res, "Failed to update exam.", err); }
};

function parseXlsxBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const value = (row, names) => names.map((name) => row[name]).find((item) => item !== undefined) || "";
    return rows.map((row) => ({
        student_id: String(value(row, ["student_id", "Student ID", "StudentID", "id", "ID"])).trim(),
        student_name: String(value(row, ["name", "Name", "student_name", "Student Name"])).trim(),
        course_code: String(value(row, ["course_code", "Course Code", "Course", "course"])).trim(),
        semester: Number(value(row, ["semester", "Semester"])) || 1
    })).filter((student) => student.student_id);
}

const uploadZip = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "A ZIP file is required." });
    try {
        const isXlsx = req.file.originalname.toLowerCase().endsWith(".xlsx");
        const entry = isXlsx ? null : new AdmZip(req.file.buffer).getEntries().find((item) => item.entryName.toLowerCase().endsWith(".xlsx"));
        if (!isXlsx && !entry) return res.status(400).json({ success: false, message: "No .xlsx file was found inside the ZIP." });
        const students = parseXlsxBuffer(isXlsx ? req.file.buffer : entry.getData());
        if (!students.length) return res.status(400).json({ success: false, message: "No student rows found in the Excel file." });
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            for (const student of students) {
                if (student.course_code) {
                    await connection.query(
                        "INSERT INTO courses (course_code,section,course_title,semester,department) VALUES (?, 'A', ?, ?, 'General') ON DUPLICATE KEY UPDATE semester=VALUES(semester)",
                        [student.course_code, student.course_code, student.semester]
                    );
                }
                await connection.query(
                    "INSERT INTO students (student_id,student_name,semester,course_code) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE student_name=VALUES(student_name),semester=VALUES(semester),course_code=VALUES(course_code)",
                    [student.student_id, student.student_name || "Unknown Student", student.semester, student.course_code || "UNASSIGNED"]
                );
            }
            await connection.commit();
            res.json({ success: true, imported: students.length, students });
        } catch (err) {
            await connection.rollback();
            fail(res, "Failed to import students.", err);
        } finally { connection.release(); }
    } catch (err) { fail(res, "Invalid ZIP file.", err); }
};

const allocate = async (req, res) => {
    const { exam_id, exam_date, exam_time, roomIds, studentIds, maxCoursesPerRoom } = req.body || {};
    if ((!exam_id && (!exam_date || !exam_time)) || !Array.isArray(roomIds) || !roomIds.length) {
        return res.status(400).json({ success: false, message: "An exam (or date/time) and at least one room are required." });
    }
    try {
        const [rooms] = await db.promise().query("SELECT room_id,capacity FROM rooms WHERE room_id IN (?) AND status='Available'", [roomIds]);
        if (!rooms.length) return res.status(400).json({ success: false, message: "No available rooms were selected." });
        const studentSql = studentIds && studentIds.length ? "SELECT student_id,student_name AS name,course_code FROM students WHERE student_id IN (?)" : "SELECT student_id,student_name AS name,course_code FROM students";
        const [rows] = await db.promise().query(studentSql, studentIds && studentIds.length ? [studentIds] : []);
        const students = rows.map((row) => ({ student_id: row.student_id, name: row.name || "Unknown", course_code: row.course_code || "UNASSIGNED" }));
        const roomNames = rooms.map((room) => String(room.room_id));
        const capacities = Object.fromEntries(rooms.map((room) => [String(room.room_id), Number(room.capacity)]));
        if (students.length > rooms.reduce((total, room) => total + Number(room.capacity), 0)) {
            return res.status(400).json({ success: false, message: "Selected rooms do not have enough capacity for these students." });
        }
        const result = allocateStudents(students, roomNames, { maxCoursesPerRoom: Number(maxCoursesPerRoom) || 4, capacities });
        if (!result.allocations) return res.status(400).json({ success: false, message: "Allocation failed.", warnings: result.warnings });
        let targetExam = exam_id;
        if (!targetExam) {
            const [created] = await db.promise().query("INSERT INTO exams (exam_date,start_time,end_time,exam_type,created_by) VALUES (?,?,?,?,?)", [exam_date, exam_time, exam_time, "SEAT_PLAN", req.user.user_id]);
            targetExam = created.insertId;
        }
        await db.promise().query("DELETE FROM seat_allocations WHERE exam_id=?", [targetExam]);
        const inserts = [];
        Object.entries(result.allocations).forEach(([roomId, roomStudents]) => roomStudents.forEach((student, index) => {
            inserts.push([targetExam, student.student_id, student.course_code, Number(roomId), Math.floor(index / 6) + 1, (index % 6) + 1, index + 1]);
        }));
        if (inserts.length) await db.promise().query("INSERT INTO seat_allocations (exam_id,student_id,course_code,room_id,row_no,column_no,seat_no) VALUES ?", [inserts]);
        res.json({ success: true, exam_id: targetExam, allocations: result.allocations, warnings: result.warnings });
    } catch (err) { fail(res, "Failed to generate seat plan.", err); }
};

const getAllocations = async (req, res) => {
    try {
        const studentFilter = req.user.role === "student" ? " AND a.student_id = ?" : "";
        const params = req.user.role === "student" ? [req.params.id, req.user.email.split("@")[0]] : [req.params.id];
        const [rows] = await db.promise().query(
            `SELECT a.*, r.room_number, r.building, s.student_name
             FROM seat_allocations a LEFT JOIN rooms r ON r.room_id=a.room_id
             LEFT JOIN students s ON s.student_id=a.student_id WHERE a.exam_id=?${studentFilter} ORDER BY r.room_number,a.seat_no`,
            params
        );
        res.json({ success: true, allocations: rows });
    } catch (err) { fail(res, "Failed to fetch seat plan.", err); }
};

module.exports = { addExam, getExams, updateExam, deleteExam, uploadZip, allocate, getAllocations };
