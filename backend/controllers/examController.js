const AdmZip = require('adm-zip');
const XLSX = require('xlsx');
const db = require('../config/db');
const { allocateStudents } = require('../utils/allocator');

const fail = (res, message, err) => {
  console.error(message, err && err.message);

  return res.status(500).json({
    success: false,
    message
  });
};

const addExam = async (req, res) => {
  const {
    exam_date,
    start_time,
    end_time,
    exam_type,
    course_code,
    total_students
  } = req.body || {};

  if (
    !exam_date ||
    !start_time ||
    !end_time ||
    !course_code ||
    !Number.isInteger(Number(total_students)) ||
    Number(total_students) < 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'Exam date, times, course and student count are required.'
    });
  }

  try {
    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const [courses] = await connection.query(
        'SELECT course_code FROM courses WHERE course_code = ? LIMIT 1',
        [course_code]
      );

      if (!courses.length) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Course not found.'
        });
      }

      const [exam] = await connection.query(
        `INSERT INTO exams
        (exam_date, start_time, end_time, exam_type, created_by)
        VALUES (?, ?, ?, ?, ?)`,
        [
          exam_date,
          start_time,
          end_time,
          exam_type || null,
          req.user.user_id
        ]
      );

      await connection.query(
        `INSERT INTO exam_courses
        (exam_id, course_code, total_students)
        VALUES (?, ?, ?)`,
        [
          exam.insertId,
          course_code,
          Number(total_students)
        ]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        exam_id: exam.insertId,
        message: 'Exam created successfully.'
      });
    } catch (err) {
      await connection.rollback();
      fail(res, 'Failed to create exam.', err);
    } finally {
      connection.release();
    }
  } catch (err) {
    fail(res, 'Failed to create exam.', err);
  }
};

const getExams = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT
        e.exam_id,
        e.exam_date,
        e.start_time,
        e.end_time,
        e.exam_type,
        e.created_by,
        GROUP_CONCAT(
          ec.course_code
          ORDER BY ec.course_code
          SEPARATOR ', '
        ) AS course_code,
        COALESCE(
          SUM(ec.total_students),
          0
        ) AS total_students
      FROM exams e
      LEFT JOIN exam_courses ec
        ON ec.exam_id = e.exam_id
      GROUP BY e.exam_id
      ORDER BY e.exam_date, e.start_time
    `);

    res.json({
      success: true,
      exams: rows
    });
  } catch (err) {
    fail(res, 'Failed to fetch exams.', err);
  }
};

const deleteExam = async (req, res) => {
  try {
    const [result] = await db.promise().query(
      'DELETE FROM exams WHERE exam_id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found.'
      });
    }

    res.json({
      success: true,
      message: 'Exam deleted successfully.'
    });
  } catch (err) {
    fail(res, 'Failed to delete exam.', err);
  }
};

const updateExam = async (req, res) => {
  const {
    exam_date,
    start_time,
    end_time,
    exam_type,
    course_code,
    total_students
  } = req.body || {};

  if (!exam_date || !start_time || !end_time) {
    return res.status(400).json({
      success: false,
      message: 'Exam date and times are required.'
    });
  }

  try {
    const connection = await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `UPDATE exams
         SET exam_date = ?,
             start_time = ?,
             end_time = ?,
             exam_type = ?
         WHERE exam_id = ?`,
        [
          exam_date,
          start_time,
          end_time,
          exam_type || null,
          req.params.id
        ]
      );

      if (!result.affectedRows) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Exam not found.'
        });
      }

      if (course_code) {
        const [courseRows] = await connection.query(
          `SELECT exam_course_id
           FROM exam_courses
           WHERE exam_id = ?
           ORDER BY exam_course_id
           LIMIT 1`,
          [req.params.id]
        );

        if (courseRows.length) {
          await connection.query(
            `UPDATE exam_courses
             SET course_code = ?,
                 total_students = ?
             WHERE exam_course_id = ?`,
            [
              course_code,
              Number(total_students) || 0,
              courseRows[0].exam_course_id
            ]
          );
        } else {
          await connection.query(
            `INSERT INTO exam_courses
             (exam_id, course_code, total_students)
             VALUES (?, ?, ?)`,
            [
              req.params.id,
              course_code,
              Number(total_students) || 0
            ]
          );
        }
      }

      await connection.commit();

      res.json({
        success: true,
        exam_id: Number(req.params.id),
        message: 'Exam updated successfully.'
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    fail(res, 'Failed to update exam.', err);
  }
};

function parseXlsxBuffer(buffer) {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: false
  });

  const sheet =
    workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(
    sheet,
    {
      defval: ''
    }
  );

  const value = (row, names) =>
    names
      .map((name) => row[name])
      .find((item) => item !== undefined) || '';

  const tabularStudents = rows
    .map((row) => ({
      student_id: String(
        value(row, [
          'student_id',
          'Student ID',
          'StudentID',
          'id',
          'ID'
        ])
      ).trim(),

      student_name: String(
        value(row, [
          'name',
          'Name',
          'student_name',
          'Student Name'
        ])
      ).trim(),

      course_code: String(
        value(row, [
          'course_code',
          'Course Code',
          'Course',
          'course'
        ])
      ).trim(),

      semester:
        Number(
          value(row, [
            'semester',
            'Semester'
          ])
        ) || 1,

      section: String(
        value(row, [
          'section',
          'Section'
        ])
      ).trim()
    }))
    .filter((student) => student.student_id);

  if (tabularStudents.length) return tabularStudents;

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const headingPattern = /((?:MATH|EEE|PHY)\s*\d{3}(?:\.\d+)?(?:\s*\([^)]+\))?\s*\(\d+\))/i;
  let currentCourse = '';
  const groupedStudents = [];

  matrix.forEach((row) => {
    const rowText = row.map((cell) => String(cell || '').trim()).filter(Boolean).join(' ');
    const heading = rowText.match(headingPattern);
    if (heading) {
      currentCourse = heading[1].replace(/\s+/g, ' ').replace(/\s*\(\d+\)\s*$/, '').trim();
    }

    (rowText.match(/\b\d{7,10}\b/g) || []).forEach((studentId) => {
      if (currentCourse) {
        groupedStudents.push({
          student_id: studentId,
          student_name: '',
          course_code: currentCourse,
          semester: 1,
          section: 'A'
        });
      }
    });
  });

  return groupedStudents;
}

function decodeXmlText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDocxBuffer(buffer) {
  const documentXml = new AdmZip(buffer).getEntry('word/document.xml');

  if (!documentXml) {
    throw new Error('The DOCX file does not contain a document.');
  }

  const xml = documentXml.getData().toString('utf8');
  const text = Array.from(xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
    .map((match) => decodeXmlText(match[1]))
    .filter(Boolean)
    .join(' ');
  const headingPattern = /((?:MATH|EEE|PHY)\s*\d{3}(?:\.\d+)?(?:\s*\([^)]+\))?\s*\(\d+\))/gi;
  const headings = Array.from(text.matchAll(headingPattern));
  const students = [];

  headings.forEach((heading, index) => {
    const rawCourse = heading[1].replace(/\s+/g, ' ').trim();
    const courseCode = rawCourse.replace(/\s*\(\d+\)\s*$/, '').trim();
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : text.length;
    const body = text.slice(heading.index + heading[0].length, bodyEnd);
    const ids = body.match(/\b\d{7,10}\b/g) || [];

    ids.forEach((studentId) => {
      students.push({
        student_id: studentId,
        student_name: '',
        course_code: courseCode,
        semester: 1,
        section: 'A'
      });
    });
  });

  return students;
}

function parseImportBuffer(buffer, filename) {
  const extension = String(filename || '').toLowerCase().split('.').pop();

  if (extension === 'docx') return parseDocxBuffer(buffer);
  if (extension === 'csv' || extension === 'xlsx' || extension === 'xls') {
    return parseXlsxBuffer(buffer);
  }

  throw new Error(`Unsupported import file: ${filename}`);
}

const uploadZip = async (req, res) => {
  const uploadedFiles = Array.isArray(req.files)
    ? req.files
    : req.file
      ? [req.file]
      : [];

  if (!uploadedFiles.length) {
    return res.status(400).json({
      success: false,
      message: 'Select an XLSX, CSV, DOCX, or ZIP file to import.'
    });
  }

  try {
    const students = [];

    uploadedFiles.forEach((file) => {
      const extension = file.originalname.toLowerCase().split('.').pop();

      if (extension === 'zip') {
        new AdmZip(file.buffer).getEntries()
          .filter((entry) => !entry.isDirectory)
          .forEach((entry) => {
            const entryExtension = entry.entryName.toLowerCase().split('.').pop();
            if (['xlsx', 'xls', 'csv', 'docx'].includes(entryExtension)) {
              students.push(...parseImportBuffer(entry.getData(), entry.entryName));
            }
          });
      } else {
        students.push(...parseImportBuffer(file.buffer, file.originalname));
      }
    });

    const uniqueStudents = Array.from(
      new Map(students.map((student) => [`${student.student_id}:${student.course_code}`, student])).values()
    );

    if (!uniqueStudents.length) {
      return res.status(400).json({
        success: false,
        message: 'No student records were found in the uploaded files.'
      });
    }

    const connection =
      await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      for (const student of uniqueStudents) {
        if (student.course_code) {
          await connection.query(
            `INSERT INTO courses
             (course_code, section, course_title, semester, department, credit)
            VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
              semester = VALUES(semester),
              course_title = VALUES(course_title),
              department = VALUES(department)`,
            [
             student.course_code,
             student.section || 'A',
             student.course_code,
             student.semester,
             student.course_code.split(/\s+/)[0] || 'General',
             3
            ]
          );
        }

        await connection.query(
          `INSERT INTO students
            (student_id, student_name, semester, course_code)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            student_name = VALUES(student_name),
            semester = VALUES(semester),
            course_code = VALUES(course_code)`,
          [
            student.student_id,
            student.student_name || 'Unknown Student',
            student.semester,
            student.course_code || 'UNASSIGNED'
          ]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        imported: uniqueStudents.length,
        students: uniqueStudents
      });
    } catch (err) {
      await connection.rollback();
      fail(res, 'Failed to import students.', err);
    } finally {
      connection.release();
    }
  } catch (err) {
    fail(res, 'Invalid ZIP file.', err);
  }
};

const allocate = async (req, res) => {
  const {
    exam_id,
    roomIds,
    studentIds,
    maxCoursesPerRoom
  } = req.body || {};

  if (!exam_id) {
    return res.status(400).json({
      success: false,
      message: 'Exam ID is required.'
    });
  }

  if (!Array.isArray(roomIds) || !roomIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least one room.'
    });
  }

  try {
    const [examRows] = await db.promise().query(
      'SELECT exam_id FROM exams WHERE exam_id = ? LIMIT 1',
      [exam_id]
    );

    if (!examRows.length) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found.'
      });
    }

    const [rooms] = await db.promise().query(
      `SELECT
        room_id,
        room_number,
        building,
        capacity
       FROM rooms
       WHERE room_id IN (?)
       AND status = 'Available'`,
      [roomIds]
    );

    if (!rooms.length) {
      return res.status(400).json({
        success: false,
        message: 'No available selected rooms were found.'
      });
    }

    if (rooms.length !== roomIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected rooms are no longer available.'
      });
    }

    const [examCourseRows] =
      await db.promise().query(
        `SELECT
          course_code,
          total_students
         FROM exam_courses
         WHERE exam_id = ?`,
        [exam_id]
      );

    if (!examCourseRows.length) {
      return res.status(400).json({
        success: false,
        message: 'No courses are assigned to this exam.'
      });
    }

    const courseCodes =
      examCourseRows.map(
        (row) => row.course_code
      );

    let rows;

    if (
      Array.isArray(studentIds) &&
      studentIds.length
    ) {
      [rows] = await db.promise().query(
        `SELECT
          student_id,
          student_name AS name,
          course_code,
          section,
          semester
         FROM students
         WHERE student_id IN (?)
         AND course_code IN (?)`,
        [
          studentIds,
          courseCodes
        ]
      );
    } else {
      [rows] = await db.promise().query(
        `SELECT
          student_id,
          student_name AS name,
          course_code,
          section,
          semester
         FROM students
         WHERE course_code IN (?)`,
        [courseCodes]
      );
    }

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'No students were found for the courses in this exam.'
      });
    }

    const students = rows.map((row) => ({
      student_id: row.student_id,
      name: row.name || 'Unknown',
      course_code: row.course_code || 'UNASSIGNED',
      section: row.section || '',
      semester: row.semester
    }));

    const capacities = Object.fromEntries(
      rooms.map((room) => [
        String(room.room_id),
        Number(room.capacity)
      ])
    );

    const roomLayouts = Object.fromEntries(
      rooms.map((room) => {
        const columns = 6;

        const rowsCount = Math.ceil(
          Number(room.capacity) / columns
        );

        return [
          String(room.room_id),
          {
            rows: rowsCount,
            columns
          }
        ];
      })
    );

    const totalCapacity =
      rooms.reduce(
        (total, room) =>
          total + Number(room.capacity || 0),
        0
      );

    if (students.length > totalCapacity) {
      return res.status(400).json({
        success: false,
        message: `Selected rooms have ${totalCapacity} seats, but ${students.length} students need seats.`,
        availableSeats: totalCapacity,
        requiredSeats: students.length
      });
    }

    const result = allocateStudents(
      students,
      rooms.map((room) => String(room.room_id)),
      {
        maxCoursesPerRoom:
          Number(maxCoursesPerRoom) || 4,
        capacities,
        roomLayouts
      }
    );

    if (!result.allocations) {
      return res.status(400).json({
        success: false,
        message: 'Allocation failed.',
        warnings: result.warnings || []
      });
    }

    const connection =
      await db.promise().getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        'DELETE FROM seat_allocations WHERE exam_id = ?',
        [exam_id]
      );

      const inserts = [];

      Object.entries(
        result.allocations
      ).forEach(
        ([roomId, roomStudents]) => {
          roomStudents.forEach((student) => {
            inserts.push([
              exam_id,
              student.student_id,
              student.course_code,
              Number(roomId),
              Number(student.row),
              Number(student.column),
              Number(student.seat_no)
            ]);
          });
        }
      );

      if (inserts.length) {
        await connection.query(
          `INSERT INTO seat_allocations
            (
              exam_id,
              student_id,
              course_code,
              room_id,
              row_no,
              column_no,
              seat_no
            )
           VALUES ?`,
          [inserts]
        );
      }

      await connection.commit();

      const roomMap =
        Object.fromEntries(
          rooms.map((room) => [
            String(room.room_id),
            room
          ])
        );

      const savedAllocations = {};

      Object.entries(
        result.allocations
      ).forEach(
        ([roomId, roomStudents]) => {
          const room = roomMap[roomId];

          savedAllocations[roomId] =
            roomStudents.map(
              (student) => ({
                student_id:
                  student.student_id,

                student_name:
                  student.name ||
                  student.student_name ||
                  '',

                course_code:
                  student.course_code,

                section:
                  student.section || '',

                building:
                  room?.building || '',

                room_number:
                  room?.room_number || '',

                room_id:
                  Number(roomId),

                seat_no:
                  Number(student.seat_no),

                row:
                  Number(student.row),

                column:
                  Number(student.column)
              })
            );
        }
      );

      res.json({
        success: true,
        exam_id,
        allocations: savedAllocations,
        roomInfo: result.roomInfo || {},
        warnings: result.warnings || []
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    fail(res, 'Failed to generate seat plan.', err);
  }
};

const getAllocations = async (req, res) => {
  try {
    const studentFilter =
      req.user.role === 'student'
        ? ' AND a.student_id = ?'
        : '';

    const params =
      req.user.role === 'student'
        ? [
            req.params.id,
            req.user.email.split('@')[0]
          ]
        : [req.params.id];

    const [rows] =
      await db.promise().query(
        `SELECT
          a.*,
          r.room_number,
          r.building,
          s.student_name
         FROM seat_allocations a
         LEFT JOIN rooms r
           ON r.room_id = a.room_id
         LEFT JOIN students s
           ON s.student_id = a.student_id
         WHERE a.exam_id = ?
         ${studentFilter}
         ORDER BY
           r.room_number,
           a.seat_no`,
        params
      );

    res.json({
      success: true,
      allocations: rows
    });
  } catch (err) {
    fail(res, 'Failed to fetch seat plan.', err);
  }
};

module.exports = {
  addExam,
  getExams,
  updateExam,
  deleteExam,
  uploadZip,
  allocate,
  getAllocations
};
