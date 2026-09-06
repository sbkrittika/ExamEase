
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
            `SELECT s.student_id, s.student_name, s.semester, s.section, s.course_code, s.department,
                    GROUP_CONCAT(DISTINCT e.course_code ORDER BY e.course_code SEPARATOR ',') AS enrolled_courses
             FROM students s
             LEFT JOIN student_course_enrollments e ON e.student_id = s.student_id
             GROUP BY s.student_id
             ORDER BY s.student_name, s.student_id`
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
        section,
        course_code,
        department
    } = req.body || {};

    if (!student_id || !student_name || !semester || !section) {
        return res.status(400).json({
            success: false,
            message: "Student ID, name, semester and section are required."
        });
    }

    try {
        await db.promise().query(
            "INSERT INTO students (student_id, student_name, semester, section, course_code, department) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE student_name=VALUES(student_name), semester=VALUES(semester), section=VALUES(section), course_code=VALUES(course_code), department=VALUES(department)",
            [
                String(student_id).trim(),
                String(student_name).trim(),
                Number(semester),
                String(section).trim(),
                course_code ? String(course_code).trim() : null,
                department || null
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

const updateStudent = async (req, res) => {
    const { student_name, semester, section, course_code, department } = req.body || {};
    if (!student_name || !semester || !section) {
        return res.status(400).json({ success: false, message: "Student name, semester and section are required." });
    }
    try {
        const [result] = await db.promise().query(
            "UPDATE students SET student_name = ?, semester = ?, section = ?, course_code = ?, department = ? WHERE student_id = ?",
            [String(student_name).trim(), Number(semester), String(section).trim(), course_code ? String(course_code).trim() : null, department || null, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Student not found." });
        res.json({ success: true, message: "Student updated successfully." });
    } catch (err) {
        asError(res, "Failed to update student.", err);
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

const listStudentCourses = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT c.course_code, c.section, c.course_title, c.department, c.semester, c.credit
             FROM student_course_enrollments e
             JOIN courses c ON c.course_code = e.course_code AND c.section = e.course_section
             WHERE e.student_id = ?
             ORDER BY c.semester, c.course_code`,
            [req.params.id]
        );
        res.json({ success: true, courses: rows });
    } catch (err) {
        asError(res, "Failed to fetch student courses.", err);
    }
};

const enrollStudent = async (req, res) => {
    const { course_code, course_section = "1" } = req.body || {};
    if (!course_code) return res.status(400).json({ success: false, message: "Course code is required." });
    try {
        const [students] = await db.promise().query("SELECT student_id FROM students WHERE student_id = ? LIMIT 1", [req.params.id]);
        if (!students.length) return res.status(404).json({ success: false, message: "Student not found." });
        const [courses] = await db.promise().query("SELECT course_code FROM courses WHERE course_code = ? AND section = ? LIMIT 1", [course_code, course_section]);
        if (!courses.length) return res.status(404).json({ success: false, message: "Course not found." });
        await db.promise().query(
            "INSERT INTO student_course_enrollments (student_id, course_code, course_section) VALUES (?, ?, ?)",
            [req.params.id, String(course_code).trim(), String(course_section).trim()]
        );
        res.status(201).json({ success: true, message: "Course enrolled successfully." });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Student is already enrolled in this course." });
        asError(res, "Failed to enroll student.", err);
    }
};

const removeEnrollment = async (req, res) => {
    try {
        const [result] = await db.promise().query(
            "DELETE FROM student_course_enrollments WHERE student_id = ? AND course_code = ? AND course_section = ?",
            [req.params.id, req.params.courseCode, req.params.section || "1"]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Enrollment not found." });
        res.json({ success: true, message: "Course removed from student." });
    } catch (err) {
        asError(res, "Failed to remove enrollment.", err);
    }
};

const listCourseStudents = async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT s.student_id, s.student_name, s.department, s.semester, s.section
             FROM student_course_enrollments e
             JOIN students s ON s.student_id = e.student_id
             WHERE e.course_code = ? AND e.course_section = ?
             ORDER BY s.section, s.student_id`,
            [req.params.code, req.params.section || "1"]
        );
        res.json({ success: true, students: rows });
    } catch (err) {
        asError(res, "Failed to fetch enrolled students.", err);
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

const updateFaculty = async (req, res) => {
    const { full_name, email, password, department, designation, phone } = req.body || {};
    if (!full_name || !email || !department) {
        return res.status(400).json({ success: false, message: "Name, email and department are required." });
    }
    try {
        const fields = [String(full_name).trim(), String(email).trim().toLowerCase(), String(department).trim(),
            designation ? String(designation).trim() : null, phone ? String(phone).trim() : null];
        let query = "UPDATE users SET full_name=?, email=?, department=?, designation=?, phone=?";
        if (password) {
            if (String(password).length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
            query += ", password=?";
            fields.push(await bcrypt.hash(String(password), 10));
        }
        query = query.replace("******", "password_hash=?");
        query += " WHERE user_id=? AND role='faculty'";
        fields.push(req.params.id);
        const [result] = await db.promise().query(query, fields);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Faculty member not found." });
        res.json({ success: true, message: "Faculty updated successfully." });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Faculty email already exists." });
        asError(res, "Failed to update faculty.", err);
    }
};

const deleteFaculty = async (req, res) => {
    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();
        await connection.query("DELETE FROM invigilator_assignments WHERE faculty_id=?", [req.params.id]);
        const [result] = await connection.query("DELETE FROM users WHERE user_id=? AND role='faculty'", [req.params.id]);
        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Faculty member not found." });
        }
        await connection.commit();
        res.json({ success: true, message: "Faculty deleted successfully." });
    } catch (err) {
        if (connection) await connection.rollback().catch(() => {});
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "This faculty member created an exam and cannot be deleted. Reassign or remove those exams first."
            });
        }
        asError(res, "Failed to delete faculty.", err);
    } finally {
        if (connection) connection.release();
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

const updateRoom = async (req, res) => {
    try {
        const roomNumber = String(req.body.room_number ?? "").trim();
        const capacity = Number(req.body.capacity);
        const status = String(req.body.status ?? "Available") === "Unavailable" ? "Unavailable" : "Available";
        if (!roomNumber || !Number.isInteger(capacity) || capacity < 1) {
            return res.status(400).json({ success: false, message: "Room number and a positive capacity are required." });
        }
        const [result] = await db.promise().query(
            "UPDATE rooms SET room_number=?, building=?, capacity=?, status=? WHERE room_id=?",
            [roomNumber, String(req.body.building ?? "").trim() || null, capacity, status, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Room not found." });
        res.json({ success: true, message: "Room updated successfully." });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "A room with this room number already exists." });
        asError(res, "Failed to update room.", err);
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
            `SELECT ia.assignment_id,ia.exam_id,ia.room_id,ia.faculty_id,e.exam_date,e.start_time,e.end_time,
                    GROUP_CONCAT(DISTINCT ec.course_code ORDER BY ec.course_code SEPARATOR ', ') AS course_code,
                    MAX(c.course_title) AS course_title,
                    r.room_number,r.building,u.full_name AS faculty_name
             FROM invigilator_assignments ia
             JOIN exams e ON e.exam_id=ia.exam_id
             LEFT JOIN exam_courses ec ON ec.exam_id=e.exam_id
             LEFT JOIN courses c ON c.course_code=ec.course_code
             JOIN rooms r ON r.room_id=ia.room_id
             JOIN users u ON u.user_id=ia.faculty_id
             GROUP BY ia.assignment_id,ia.exam_id,ia.room_id,ia.faculty_id,e.exam_date,e.start_time,e.end_time,r.room_number,r.building,u.full_name
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
        const [conflicts] = await db.promise().query(
            `SELECT ia.assignment_id
             FROM invigilator_assignments ia
             JOIN exams existing_exam ON existing_exam.exam_id = ia.exam_id
             JOIN exams selected_exam ON selected_exam.exam_id = ?
             WHERE ia.faculty_id = ?
               AND existing_exam.exam_id <> ?
               AND existing_exam.exam_date = selected_exam.exam_date
               AND existing_exam.start_time < selected_exam.end_time
               AND existing_exam.end_time > selected_exam.start_time
             LIMIT 1`,
            [exam_id, faculty_id, exam_id]
        );
        if (conflicts.length) {
            return res.status(409).json({ success: false, message: "This invigilator is already assigned during the selected exam time." });
        }
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

const updateAssignment = async (req, res) => {
    const { exam_id, room_id, faculty_id } = req.body || {};
    if (!exam_id || !room_id || !faculty_id) return res.status(400).json({ success: false, message: "Exam, room and faculty are required." });
    try {
        const [conflicts] = await db.promise().query(
            `SELECT ia.assignment_id FROM invigilator_assignments ia
             JOIN exams existing_exam ON existing_exam.exam_id=ia.exam_id
             JOIN exams selected_exam ON selected_exam.exam_id=?
             WHERE ia.faculty_id=? AND ia.assignment_id<>?
             AND existing_exam.exam_date=selected_exam.exam_date
             AND existing_exam.start_time<selected_exam.end_time
             AND existing_exam.end_time>selected_exam.start_time LIMIT 1`,
            [exam_id, faculty_id, req.params.id]
        );
        if (conflicts.length) return res.status(409).json({ success: false, message: "This invigilator is already assigned during the selected exam time." });
        const [result] = await db.promise().query(
            "UPDATE invigilator_assignments SET exam_id=?, room_id=?, faculty_id=? WHERE assignment_id=?",
            [exam_id, room_id, faculty_id, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Assignment not found." });
        res.json({ success: true, message: "Invigilator assignment updated successfully." });
    } catch (err) {
        asError(res, "Failed to update assignment.", err);
    }
};

module.exports = {
    listStudents,
    listStudentCourses,
    enrollStudent,
    removeEnrollment,
    listCourseStudents,
    saveStudent,
    updateStudent,
    deleteStudent,
    listFaculty,
    updateFaculty,
    deleteFaculty,
    listRooms,
    saveRoom,
    updateRoom,
    deleteRoom,
    dashboard,
    mySchedule,
    listAssignments,
    assignInvigilator,
    removeAssignment
    ,updateAssignment,
    saveFaculty
};
