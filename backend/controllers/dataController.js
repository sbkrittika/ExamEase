const db = require("../config/db");
const bcrypt = require("bcryptjs");

const getFaculty = (req, res) => {
    db.query(
        "SELECT user_id, full_name, email, department, designation, phone FROM users WHERE role = 'faculty' ORDER BY full_name",
        (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Failed to fetch faculty.", error: err.message });
            res.json({ success: true, faculty: results });
        }
    );
};

const getRooms = (req, res) => {
    db.query(
        "SELECT room_id, room_number, building, capacity, status FROM rooms ORDER BY building, room_number",
        (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Failed to fetch rooms.", error: err.message });
            res.json({ success: true, rooms: results });
        }
    );
};

const getStudents = (req, res) => {
    db.query(
        "SELECT student_id, student_number, name, email, department, semester, course_code FROM students ORDER BY student_id",
        (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Failed to fetch students.", error: err.message });
            res.json({ success: true, students: results });
        }
    );
};

const dashboard = (req, res) => {
    const queries = [
        "SELECT COUNT(*) AS count FROM students",
        "SELECT COUNT(*) AS count FROM users WHERE role = 'faculty'",
        "SELECT COUNT(*) AS count FROM courses",
        "SELECT COUNT(*) AS count FROM rooms",
        "SELECT COUNT(*) AS count FROM exams WHERE exam_date >= CURDATE()"
    ];
    Promise.all(queries.map((query) => new Promise((resolve, reject) => db.query(query, (err, rows) => err ? reject(err) : resolve(rows[0].count))))).then((counts) => {
        res.json({ success: true, counts: { students: counts[0], faculty: counts[1], courses: counts[2], rooms: counts[3], upcomingExams: counts[4] } });
    }).catch((err) => res.status(500).json({ success: false, message: "Failed to fetch dashboard data.", error: err.message }));
};

const addStudent = (req, res) => {
    const { student_id, student_number, name, email, department, semester, course_code } = req.body;
    if (!student_id || !name) return res.status(400).json({ success: false, message: "Student ID and name are required." });
    db.query("INSERT INTO students (student_id, student_number, name, email, department, semester, course_code) VALUES (?, ?, ?, ?, ?, ?, ?)", [student_id.trim(), student_number || null, name.trim(), email || null, department || null, semester || 1, course_code ? course_code.trim() : null], (err) => {
        if (err) return res.status(err.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, message: err.code === "ER_DUP_ENTRY" ? "Student ID already exists." : "Failed to add student.", error: err.message });
        res.status(201).json({ success: true, message: "Student added successfully." });
    });
};

const deleteStudent = (req, res) => {
    db.query("DELETE FROM students WHERE student_id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to delete student.", error: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Student not found." });
        res.json({ success: true, message: "Student deleted successfully." });
    });
};

const addRoom = (req, res) => {
    const { room_number, building, capacity, status } = req.body;
    if (!room_number || !Number.isInteger(Number(capacity)) || Number(capacity) < 1) return res.status(400).json({ success: false, message: "Room number and a positive capacity are required." });
    db.query("INSERT INTO rooms (room_number, building, capacity, status) VALUES (?, ?, ?, ?)", [room_number.trim(), building || null, Number(capacity), status || "Available"], (err) => {
        if (err) return res.status(err.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, message: err.code === "ER_DUP_ENTRY" ? "Room number already exists." : "Failed to add room.", error: err.message });
        res.status(201).json({ success: true, message: "Room added successfully." });
    });
};

const deleteRoom = (req, res) => {
    db.query("DELETE FROM rooms WHERE room_id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to delete room.", error: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Room not found." });
        res.json({ success: true, message: "Room deleted successfully." });
    });
};

const addFaculty = async(req, res) => {
    const { full_name, email, password, department, designation, phone } = req.body;
    if (!full_name || !email || !password || !department || password.length < 6) return res.status(400).json({ success: false, message: "Name, email, department and a password of at least 6 characters are required." });
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query("INSERT INTO users (full_name, email, password, role, department, designation, phone) VALUES (?, ?, ?, 'faculty', ?, ?, ?)", [full_name.trim(), email.trim().toLowerCase(), hashedPassword, department.trim(), designation || null, phone || null], (err) => {
        if (err) return res.status(err.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, message: err.code === "ER_DUP_ENTRY" ? "Faculty email already exists." : "Failed to add faculty.", error: err.message });
        res.status(201).json({ success: true, message: "Faculty added successfully." });
    });
};

const deleteFaculty = (req, res) => {
    db.query("DELETE FROM users WHERE user_id = ? AND role = 'faculty'", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to delete faculty.", error: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Faculty member not found." });
        res.json({ success: true, message: "Faculty deleted successfully." });
    });
};

const getAssignments = (req, res) => {
    const sql = `SELECT ia.assignment_id, ia.exam_id, ia.room_id, ia.faculty_id, u.full_name, u.email,
        r.room_number, e.exam_date, e.start_time, e.end_time, ec.course_code, c.course_title
        FROM invigilator_assignments ia JOIN users u ON u.user_id = ia.faculty_id
        JOIN rooms r ON r.room_id = ia.room_id JOIN exams e ON e.exam_id = ia.exam_id
        LEFT JOIN exam_courses ec ON ec.exam_id = e.exam_id LEFT JOIN courses c ON c.course_code = ec.course_code
        ORDER BY e.exam_date, e.start_time, r.room_number`;
    db.query(sql, (err, assignments) => err ? res.status(500).json({ success: false, message: "Failed to fetch assignments.", error: err.message }) : res.json({ success: true, assignments }));
};

const addAssignment = (req, res) => {
    const { exam_id, room_id, faculty_id } = req.body;
    if (!exam_id || !room_id || !faculty_id) return res.status(400).json({ success: false, message: "Exam, room, and faculty are required." });
    const sql = `SELECT ia.assignment_id FROM invigilator_assignments ia JOIN exams existing ON existing.exam_id = ia.exam_id
        JOIN exams selected ON selected.exam_id = ? WHERE ia.faculty_id = ? AND selected.exam_date = existing.exam_date
        AND selected.start_time < existing.end_time AND selected.end_time > existing.start_time`;
    db.query(sql, [exam_id, faculty_id], (err, conflicts) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to check invigilator conflict.", error: err.message });
        if (conflicts.length) return res.status(409).json({ success: false, message: "This faculty member is already assigned as an invigilator during this time." });
        db.query("INSERT INTO invigilator_assignments (exam_id, room_id, faculty_id) VALUES (?, ?, ?)", [exam_id, room_id, faculty_id], (insertError) => {
            if (insertError) return res.status(500).json({ success: false, message: "Failed to assign invigilator.", error: insertError.message });
            res.status(201).json({ success: true, message: "Invigilator assigned successfully." });
        });
    });
};

const deleteAssignment = (req, res) => {
    db.query("DELETE FROM invigilator_assignments WHERE assignment_id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to delete assignment.", error: err.message });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Assignment not found." });
        res.json({ success: true, message: "Assignment deleted successfully." });
    });
};

module.exports = { getFaculty, getRooms, getStudents, dashboard, addStudent, deleteStudent, addRoom, deleteRoom, addFaculty, deleteFaculty, getAssignments, addAssignment, deleteAssignment };