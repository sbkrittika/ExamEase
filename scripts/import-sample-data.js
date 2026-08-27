const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const projectRoot = path.join(__dirname, '..');
const studentListPath = path.join(projectRoot, '..', 'Sample Student List.md');
const seatPlanPath = path.join(projectRoot, '..', 'Sample Seat Plan.md');
const rooms = new Set();
const courses = new Map();
const students = new Map();
const enrollments = new Set();
const seatSlots = [];
const gridSlots = [];

function cells(line) {
    return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function isSeparator(line) {
    return /^\|\s*:?-{3,}/.test(line);
}

function normalizeCourse(value) {
    return value.replace(/\s+$/, '').replace(/\s+\(EEE\)/g, '(EEE)');
}

function courseCode(value) {
    return normalizeCourse(value.replace(/\s*\(\d+\)\s*$/, '').trim());
}

function addCourse(value) {
    const code = courseCode(value);
    if (!code || code === 'Course' || code === 'Total') return null;
    if (!courses.has(code)) courses.set(code, code);
    return code;
}

function parseStudentList(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().startsWith('|'));
    for (let index = 0; index < lines.length; index++) {
        if (isSeparator(lines[index])) continue;
        const header = cells(lines[index]);
        if (header[0] !== 'Course' || header.length < 3) continue;
        const roomHeaders = header.slice(1, -1);
        roomHeaders.forEach((room) => rooms.add(room));
        index += 1;
        for (; index < lines.length; index++) {
            if (isSeparator(lines[index])) continue;
            const row = cells(lines[index]);
            if (!row.length || row[0] === 'Total' || row[0] === 'Course') break;
            const course = addCourse(row[0]);
            if (!course) continue;
            row.slice(1, -1).forEach((cell, roomIndex) => {
                const room = roomHeaders[roomIndex];
                const ids = cell.match(/\b\d{9}\b/g) || [];
                ids.forEach((studentId) => {
                    students.set(studentId, { studentId, course });
                    enrollments.add(`${studentId}|${course}`);
                    seatSlots.push({ room, course, studentId });
                });
            });
        }
    }
}

function parseSeatPlan(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().startsWith('|'));
    let currentRoom = null;
    let rowNumber = 0;
    let inRoomTable = false;
    for (const line of lines) {
        if (isSeparator(line)) continue;
        const row = cells(line);
        if (row[0] === 'Room') continue;
        if (!row.length) continue;
        if (row[0] && /^(N-\d+|\d{3})$/.test(row[0])) {
            currentRoom = row[0];
            rooms.add(currentRoom);
            rowNumber = 0;
            inRoomTable = true;
        } else if (row[0]) {
            inRoomTable = false;
        }
        if (!inRoomTable || !currentRoom || !row[0] && row.length < 3) continue;
        rowNumber += 1;
        row.slice(1, -1).forEach((cell, columnIndex) => {
            if (!cell) return;
            const course = addCourse(cell);
            if (course) {
                const slot = { room: currentRoom, course, rowNumber, columnNumber: columnIndex + 1 };
                seatSlots.push(slot);
                gridSlots.push(slot);
            }
        });
    }
}

async function main() {
    parseStudentList(fs.readFileSync(studentListPath, 'utf8'));
    parseSeatPlan(fs.readFileSync(seatPlanPath, 'utf8'));
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    await connection.beginTransaction();
    try {
        await connection.query(`CREATE TABLE IF NOT EXISTS seat_plan_slots (
            slot_id INT AUTO_INCREMENT PRIMARY KEY,
            room_id INT NOT NULL,
            row_no INT NOT NULL,
            column_no INT NOT NULL,
            course_code VARCHAR(64) NOT NULL,
            UNIQUE KEY unique_seat_plan_slot (room_id, row_no, column_no),
            FOREIGN KEY (room_id) REFERENCES rooms(room_id),
            FOREIGN KEY (course_code) REFERENCES courses(course_code)
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
        for (const code of courses.keys()) {
            await connection.query(
                'INSERT INTO courses (course_code, section, course_title, semester, department) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE course_title = VALUES(course_title)', [code, 'A', code, 1, code.includes('(EEE)') || code.startsWith('EEE') ? 'EEE' : 'General']
            );
        }
        for (const room of rooms) {
            const capacity = seatSlots.filter((slot) => slot.room === room && slot.rowNumber).length || 1;
            await connection.query(
                'INSERT INTO rooms (room_number, building, capacity, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE capacity = GREATEST(capacity, VALUES(capacity))', [room, room.startsWith('N-') ? 'N Block' : 'Main Building', capacity, 'Available']
            );
        }
        await connection.query('DELETE FROM seat_plan_slots');
        for (const slot of gridSlots) {
            const [
                [room]
            ] = await connection.query('SELECT room_id FROM rooms WHERE room_number = ?', [slot.room]);
            await connection.query(
                'INSERT INTO seat_plan_slots (room_id, row_no, column_no, course_code) VALUES (?, ?, ?, ?)', [room.room_id, slot.rowNumber, slot.columnNumber, slot.course]
            );
        }
        for (const student of students.values()) {
            await connection.query(
                'INSERT INTO students (student_id, student_number, name, email, department, semester, course_code) VALUES (?, ?, ?, NULL, ?, ?, ?) ON DUPLICATE KEY UPDATE student_number = VALUES(student_number), course_code = VALUES(course_code)', [student.studentId, student.studentId, `Student ${student.studentId}`, student.course.includes('(EEE)') || student.course.startsWith('EEE') ? 'EEE' : 'General', 1, student.course]
            );
        }
        for (const enrollment of enrollments) {
            const [studentId, course] = enrollment.split('|');
            await connection.query('INSERT IGNORE INTO student_courses (student_id, course_code) VALUES (?, ?)', [studentId, course]);
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }

    console.log(`Imported ${students.size} students, ${courses.size} courses, ${rooms.size} rooms, and ${enrollments.size} enrollments.`);
    console.log(`Imported ${gridSlots.length} seat-plan slots into seat_plan_slots; exam-linked seat allocations were not created because no exam date/creator was supplied.`);
}

main().catch((error) => {
    console.error('Sample data import failed:', error.message);
    process.exitCode = 1;
});