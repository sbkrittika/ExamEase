const fs = require('fs');
const path = require('path');
const db = require('../backend/config/db');

const idsPath = path.join(__dirname, '..', 'database', 'seed-student-ids.json');

async function seedInitialDataset() {
    const ids = JSON.parse(fs.readFileSync(idsPath, 'utf8'));
    if (!Array.isArray(ids) || ids.length !== 100 || ids.some((id) => !String(id).trim())) {
        throw new Error(`Provide exactly 100 real student IDs in ${idsPath} before seeding.`);
    }

    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM seat_allocations');
        await connection.query('DELETE FROM exam_sections');
        await connection.query('DELETE FROM exam_courses');
        await connection.query('DELETE FROM exams');
        await connection.query('DELETE FROM student_course_enrollments');
        await connection.query('DELETE FROM students');
        await connection.query('DELETE FROM courses');

        const courses = [
            ['CSE 223', '1', 'DIGITAL ELECTRONICS & PULSE TECHNIQUE', 7, 'CSE', 3],
            ['CSE 224', '1', 'DIGITAL ELECTRONICS & PULSE TECHNIQUE LAB', 7, 'CSE', 3],
            ['CSE 242', '1', 'Web Development', 7, 'CSE', 3]
        ];
        await connection.query('INSERT INTO courses (course_code, section, course_title, semester, department, credit) VALUES ?', [courses]);

        const students = ids.map((id, index) => [
            String(id).trim(),
            `Student ${String(id).trim()}`,
            7,
            String((index % 6) + 1),
            null,
            'CSE'
        ]);
        await connection.query('INSERT INTO students (student_id, student_name, semester, section, course_code, department) VALUES ?', [students]);

        const enrollments = ids.flatMap((id) => courses.map((course) => [String(id).trim(), course[0], course[1]]));
        await connection.query('INSERT INTO student_course_enrollments (student_id, course_code, course_section) VALUES ?', [enrollments]);
        await connection.commit();
        console.log('Seeded 100 real student IDs, three courses, and 300 enrollments.');
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

if (require.main === module) {
    seedInitialDataset().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = seedInitialDataset;
