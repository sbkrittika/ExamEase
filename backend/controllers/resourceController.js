
const db = require("../config/db");
const bcrypt = require("bcryptjs");

const asError = (res, message, err) => {
    console.error(message, err && err.message);
    return res.status(500).json({
        success: false,
        message
    });
};

const listStudents = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            "SELECT student_id, student_name, semester, course_code FROM students ORDER BY student_name, student_id"
        );

        res.json({
            success: true,
            students: rows
        });
    } catch (err) {
        asError(res, "Failed to fetch students.", err);
    }
};

const saveStudent = async (req, res) => {
    const {
        student_id,
        student_name,
        semester,
        course_code
    } = req.body || {};

    if (!student_id || !student_name || !semester || !course_code) {
        return res.status(400).json({
            success: false,
            message: "Student ID, name, semester and course are required."
        });
    }

    try {
        await db.promise().query(
            "INSERT INTO students (student_id, student_name, semester, course_code) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE student_name=VALUES(student_name), semester=VALUES(semester), course_code=VALUES(course_code)",
            [
                String(student_id).trim(),
                String(student_name).trim(),
                Number(semester),
                String(course_code).trim()
            ]
        );

        res.status(201).json({
            success: true,
            message: "Student saved successfully."
        });
    } catch (err) {
        asError(res, "Failed to save student.", err);
    }
};

const deleteStudent = async (req, res) => {
    try {
        await db.promise().query(
            "DELETE FROM students WHERE student_id = ?",
            [req.params.id]
        );

        res.json({
            success: true,
            message: "Student deleted successfully."
        });
    } catch (err) {
        asError(res, "Failed to delete student.", err);
    }
};

const listFaculty = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            "SELECT user_id, full_name, email, department, designation, phone FROM users WHERE role = 'faculty' ORDER BY full_name"
        );

        res.json({
            success: true,
            faculty: rows
        });
    } catch (err) {
        asError(res, "Failed to fetch faculty.", err);
    }
};

const saveFaculty = async (req, res) => {
    const {
        full_name,
        email,
        password,
        department,
        designation,
        phone
    } = req.body || {};

    if (
        !full_name ||
        !email ||
        !password ||
        !department ||
        String(password).length < 6
    ) {
        return res.status(400).json({
            success: false,
            message: "Name, email, department and a password of at least 6 characters are required."
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(String(password), 10);

        await db.promise().query(
            "INSERT INTO users (full_name,email,password,role,department,designation,phone) VALUES (?,?,?,'faculty',?,?,?)",
            [
                String(full_name).trim(),
                String(email).trim().toLowerCase(),
                hashedPassword,
                String(department).trim(),
                designation ? String(designation).trim() : null,
                phone ? String(phone).trim() : null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Faculty added successfully."
        });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Faculty email already exists."
            });
        }

        asError(res, "Failed to add faculty.", err);
    }
};

const listRooms = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            "SELECT room_id, room_number, building, capacity, status FROM rooms ORDER BY building, room_number"
        );

        res.json({
            success: true,
            rooms: rows
        });
    } catch (err) {
        asError(res, "Failed to fetch rooms.", err);
    }
};

const saveRoom = async (req, res) => {
    try {
        const {
            room_number,
            building,
            capacity,
            status
        } = req.body || {};

        const roomNumber = String(room_number ?? "").trim();
        const buildingName = String(building ?? "").trim();
        const roomCapacity = Number(capacity);

        const roomStatus =
            String(status ?? "Available").trim() === "Unavailable"
                ? "Unavailable"
                : "Available";

        if (!roomNumber) {
            return res.status(400).json({
                success: false,
                message: "Room number is required."
            });
        }

        if (!Number.isInteger(roomCapacity) || roomCapacity < 1) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be a positive whole number."
            });
        }

        const [result] = await db.promise().query(
            "INSERT INTO rooms (room_number, building, capacity, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE building=VALUES(building), capacity=VALUES(capacity), status=VALUES(status)",
            [
                roomNumber,
                buildingName || null,
                roomCapacity,
                roomStatus
            ]
        );

        let roomId = result.insertId;

        if (!roomId) {
            const [rows] = await db.promise().query(
                "SELECT room_id FROM rooms WHERE room_number = ? LIMIT 1",
                [roomNumber]
            );

            roomId = rows.length ? rows[0].room_id : null;
        }

        res.status(201).json({
            success: true,
            room_id: roomId,
            message: "Room saved successfully."
        });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "A room with this room number already exists."
            });
        }

        asError(res, "Failed to save room.", err);
    }
};

const deleteRoom = async (req, res) => {
    try {
        const roomId = Number(req.params.id);

        if (!Number.isInteger(roomId) || roomId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID."
            });
        }

        const [result] = await db.promise().query(
            "DELETE FROM rooms WHERE room_id = ?",
            [roomId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Room not found."
            });
        }

        res.json({
            success: true,
            message: "Room deleted successfully."
        });
    } catch (err) {
        asError(res, "Failed to delete room.", err);
    }
};

const dashboard = async (req, res) => {
    try {
        const [[students]] = await db.promise().query(
            "SELECT COUNT(*) AS count FROM students"
        );

        const [[courses]] = await db.promise().query(
            "SELECT COUNT(*) AS count FROM courses"
        );

        const [[faculty]] = await db.promise().query(
            "SELECT COUNT(*) AS count FROM users WHERE role='faculty'"
        );

        const [[rooms]] = await db.promise().query(
            "SELECT COUNT(*) AS count FROM rooms WHERE status='Available'"
        );

        const [upcoming] = await db.promise().query(
            "SELECT e.exam_id, e.exam_date, e.start_time, e.end_time, e.exam_type, GROUP_CONCAT(ec.course_code ORDER BY ec.course_code SEPARATOR ', ') AS course_code, COALESCE(SUM(ec.total_students), 0) AS students FROM exams e LEFT JOIN exam_courses ec ON ec.exam_id=e.exam_id WHERE e.exam_date >= CURRENT_DATE() GROUP BY e.exam_id ORDER BY e.exam_date, e.start_time LIMIT 5"
        );

        res.json({
            success: true,
            stats: {
                students: students.count,
                courses: courses.count,
                faculty: faculty.count,
                rooms: rooms.count
            },
            upcoming
        });
    } catch (err) {
        asError(res, "Failed to fetch dashboard data.", err);
    }
};

const mySchedule = async (req, res) => {
    try {
        const [userRows] = await db.promise().query(
            "SELECT user_id,full_name,email,role,department,designation FROM users WHERE user_id=?",
            [req.user.user_id]
        );

        if (!userRows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const [allocations] = await db.promise().query(
            `SELECT a.exam_id,e.exam_date,e.start_time,e.end_time,
                    r.room_number,
                    COALESCE(GROUP_CONCAT(DISTINCT u.full_name ORDER BY u.full_name SEPARATOR ', '), 'Not assigned') AS invigilator
             FROM seat_allocations a
             JOIN exams e ON e.exam_id=a.exam_id
             LEFT JOIN rooms r ON r.room_id=a.room_id
             LEFT JOIN invigilator_assignments ia ON ia.exam_id=a.exam_id AND ia.room_id=a.room_id
             LEFT JOIN users u ON u.user_id=ia.faculty_id
             WHERE a.student_id=?
             GROUP BY a.exam_id,e.exam_date,e.start_time,e.end_time,r.room_number
             ORDER BY e.exam_date,e.start_time`,
            [req.user.email.split("@")[0]]
        );

        res.json({
            success: true,
            user: userRows[0],
            schedule: allocations
        });
    } catch (err) {
        asError(res, "Failed to fetch your schedule.", err);
    }
};

const listAssignments = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT ia.assignment_id,ia.exam_id,ia.room_id,ia.faculty_id,e.exam_date,e.start_time,
                    r.room_number,r.building,u.full_name AS faculty_name
             FROM invigilator_assignments ia
             JOIN exams e ON e.exam_id=ia.exam_id
             JOIN rooms r ON r.room_id=ia.room_id
             JOIN users u ON u.user_id=ia.faculty_id
             ORDER BY e.exam_date,e.start_time,r.room_number`
        );

        res.json({
            success: true,
            assignments: rows
        });
    } catch (err) {
        asError(res, "Failed to fetch invigilation assignments.", err);
    }
};

const assignInvigilator = async (req, res) => {
    const {
        exam_id,
        room_id,
        faculty_id
    } = req.body || {};

    if (!exam_id || !room_id || !faculty_id) {
        return res.status(400).json({
            success: false,
            message: "Exam, room and faculty are required."
        });
    }

    try {
        await db.promise().query(
            "INSERT INTO invigilator_assignments (exam_id,room_id,faculty_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE room_id=VALUES(room_id)",
            [
                exam_id,
                room_id,
                faculty_id
            ]
        );

        res.status(201).json({
            success: true,
            message: "Invigilator assigned successfully."
        });
    } catch (err) {
        asError(res, "Failed to assign invigilator.", err);
    }
};

const removeAssignment = async (req, res) => {
    try {
        await db.promise().query(
            "DELETE FROM invigilator_assignments WHERE assignment_id=?",
            [req.params.id]
        );

        res.json({
            success: true,
            message: "Assignment removed successfully."
        });
    } catch (err) {
        asError(res, "Failed to remove assignment.", err);
    }
};

module.exports = {
    listStudents,
    saveStudent,
    deleteStudent,
    listFaculty,
    listRooms,
    saveRoom,
    deleteRoom,
    dashboard,
    mySchedule,
    listAssignments,
    assignInvigilator,
    removeAssignment,
    saveFaculty
};
