const db = require("../config/db");

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
        "SELECT student_id, name FROM students ORDER BY student_id",
        (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Failed to fetch students.", error: err.message });
            res.json({ success: true, students: results });
        }
    );
};

module.exports = { getFaculty, getRooms, getStudents };