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

function parseExamTime(timeRange) {
  const match = String(timeRange || '').match(/(\d{1,2}(?::|\.)\d{2})\s*(?:AM|PM)?\s*[-–]\s*(\d{1,2}(?::|\.)\d{2})\s*(?:AM|PM)?/i);
  return match ? { start: match[1].replace('.', ':'), end: match[2].replace('.', ':') } : null;
}

const addExam = async (req, res) => {
  const {
    exam_date,
    start_time,
    end_time,
    time_range,
    exam_type,
    course_code,
    department,
    total_students
  } = req.body || {};

  const parsedTime = time_range ? parseExamTime(time_range) : null;
  const examStart = parsedTime?.start || start_time;
  const examEnd = parsedTime?.end || end_time;
  const sections = Array.isArray(req.body.sections) ? req.body.sections : [];

  if (
    !exam_date ||
    !examStart ||
    !examEnd ||
    !course_code ||
    !department ||
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
        'SELECT course_code, section FROM courses WHERE course_code = ? AND department = ? LIMIT 1',
        [course_code, department]
      );

      if (!courses.length) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Course not found.'
        });
      }

      const [participantCount] = await connection.query(
        `SELECT COUNT(*) AS total_students
         FROM student_course_enrollments
         WHERE course_code = ?`,
        [course_code]
      );

      const [exam] = await connection.query(
        `INSERT INTO exams
        (exam_date, start_time, end_time, exam_type, created_by)
        VALUES (?, ?, ?, ?, ?)`,
        [
          exam_date,
          examStart,
          examEnd,
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
          Number(participantCount[0].total_students)
        ]
      );

      if (req.body.semester && sections.length) {
        await connection.query(
          'INSERT INTO exam_sections (exam_id, semester, section) VALUES ?',
          [sections.map((section) => [exam.insertId, Number(req.body.semester), String(section).trim()])]
        );
      }

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
          DISTINCT ec.course_code
          ORDER BY ec.course_code
          SEPARATOR ', '
        ) AS course_code,
        MAX(c.course_title) AS course_title,
        MAX(c.department) AS department,
        GROUP_CONCAT(DISTINCT CONCAT(es.semester, ':', es.section) ORDER BY es.semester, es.section SEPARATOR ', ') AS sections,
        (
          SELECT COALESCE(SUM(course_totals.total_students), 0)
          FROM exam_courses course_totals
          WHERE course_totals.exam_id = e.exam_id
        ) AS total_students
      FROM exams e
      LEFT JOIN exam_courses ec
        ON ec.exam_id = e.exam_id
      LEFT JOIN courses c
        ON c.course_code = ec.course_code
      LEFT JOIN exam_sections es
        ON es.exam_id = e.exam_id
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
    time_range,
    exam_type,
    course_code,
    total_students
  } = req.body || {};

  const parsedTime = time_range ? parseExamTime(time_range) : null;
  const examStart = parsedTime?.start || start_time;
  const examEnd = parsedTime?.end || end_time;
  if (!exam_date || !examStart || !examEnd) {
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
          examStart,
          examEnd,
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

        if (Array.isArray(req.body.sections) && req.body.semester) {
          await connection.query('DELETE FROM exam_sections WHERE exam_id = ?', [req.params.id]);
          if (req.body.sections.length) {
            await connection.query(
              'INSERT INTO exam_sections (exam_id, semester, section) VALUES ?',
              [req.body.sections.map((section) => [req.params.id, Number(req.body.semester), String(section).trim()])]
            );
          }
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

  const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const value = (row, names) => {
    const keys = Object.keys(row);
    const expected = names.map(normalizeHeader);
    const key = keys.find((item) => expected.includes(normalizeHeader(item)));
    return key ? row[key] : '';
  };

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
    .filter((student) => student.student_id && /\d/.test(student.student_id));

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
          section: '1'
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
        section: '1'
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
      } else if (['xlsx', 'xls', 'csv', 'docx'].includes(extension)) {
        students.push(...parseImportBuffer(file.buffer, file.originalname));
      }
    });

    const uniqueStudents = Array.from(students.reduce((map, student) => {
      const previous = map.get(student.student_id);
      map.set(student.student_id, {
        ...(previous || {}),
        ...student,
        student_name: student.student_name || previous?.student_name || ''
      });
      return map;
    }, new Map()).values());

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

      const courseRows = Array.from(
        new Map(
          uniqueStudents
             .filter((student) => student.course_code)
             .map((student) => [
               `${student.course_code}:${student.section || '1'}`,
               [
                 student.course_code,
                 student.section || '1',
                 student.course_code,
                 student.semester,
                 student.course_code.split(/\s+/)[0] || 'General',
                 3
               ]
             ])
        ).values()
      );

      if (courseRows.length) {
        await connection.query(
          `INSERT INTO courses
             (course_code, section, course_title, semester, department, credit)
           VALUES ?
           ON DUPLICATE KEY UPDATE
             semester = VALUES(semester),
             course_title = VALUES(course_title),
             department = VALUES(department)`,
          [courseRows]
        );
      }

      const studentRows = uniqueStudents.map((student) => [
        student.student_id,
        student.student_name || 'Unknown Student',
        student.semester,
        student.section || '1',
        student.course_code || 'UNASSIGNED',
        student.department || (student.course_code || '').split(/\s+/)[0] || 'General'
      ]);

      await connection.query(
        `INSERT INTO students
          (student_id, student_name, semester, section, course_code, department)
         VALUES ?
         ON DUPLICATE KEY UPDATE
          student_name = VALUES(student_name),
          semester = VALUES(semester),
          section = VALUES(section),
          course_code = VALUES(course_code),
          department = VALUES(department)`,
        [studentRows]
      );

      const enrollmentRows = uniqueStudents
        .filter((student) => student.course_code)
        .map((student) => [student.student_id, student.course_code, student.section || '1']);
      if (enrollmentRows.length) {
        await connection.query(
          `INSERT IGNORE INTO student_course_enrollments
            (student_id, course_code, course_section)
          VALUES ?`,
          [enrollmentRows]
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
      'SELECT exam_id, exam_date, start_time, end_time FROM exams WHERE exam_id = ? LIMIT 1',
      [exam_id]
    );

    if (!examRows.length) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found.'
      });
    }

    const [roomConflicts] = await db.promise().query(
      `SELECT DISTINCT r.room_number
       FROM seat_allocations existing_allocation
       JOIN exams existing_exam ON existing_exam.exam_id = existing_allocation.exam_id
       JOIN rooms r ON r.room_id = existing_allocation.room_id
       WHERE existing_allocation.exam_id <> ?
         AND existing_exam.exam_date = (SELECT exam_date FROM exams WHERE exam_id = ?)
         AND existing_exam.start_time < (SELECT end_time FROM exams WHERE exam_id = ?)
         AND existing_exam.end_time > (SELECT start_time FROM exams WHERE exam_id = ?)
         AND existing_allocation.room_id IN (?)`,
      [exam_id, exam_id, exam_id, exam_id, roomIds]
    );
    if (roomConflicts.length) {
      return res.status(409).json({
        success: false,
        message: `Room conflict: ${roomConflicts.map((room) => room.room_number).join(', ')} is already allocated during this exam time.`
      });
    }

    const [studentConflicts] = await db.promise().query(
      `SELECT DISTINCT enrollment.student_id, other_course.course_code
       FROM exam_courses current_course
       JOIN student_course_enrollments enrollment ON enrollment.course_code = current_course.course_code
       JOIN student_course_enrollments other_enrollment ON other_enrollment.student_id = enrollment.student_id
       JOIN exam_courses other_course ON other_course.course_code = other_enrollment.course_code
       JOIN exams other_exam ON other_exam.exam_id = other_course.exam_id
       WHERE current_course.exam_id = ?
         AND other_course.exam_id <> ?
         AND other_exam.exam_date = (SELECT exam_date FROM exams WHERE exam_id = ?)
         AND other_exam.start_time < (SELECT end_time FROM exams WHERE exam_id = ?)
         AND other_exam.end_time > (SELECT start_time FROM exams WHERE exam_id = ?)`,
      [exam_id, exam_id, exam_id, exam_id, exam_id]
    );
    if (studentConflicts.length) {
      return res.status(409).json({
        success: false,
        message: `Student exam conflict detected for ${studentConflicts.length} enrolled student(s).`
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

    const [examSections] = await db.promise().query(
      'SELECT semester, section FROM exam_sections WHERE exam_id = ?',
      [exam_id]
    );
    const hasSectionFilter = examSections.length > 0;
    const sectionParams = hasSectionFilter
      ? [examSections.map((item) => Number(item.semester)), examSections.map((item) => item.section)]
      : [];
    let rows;

    if (
      Array.isArray(studentIds) &&
      studentIds.length
    ) {
      [rows] = await db.promise().query(
        `SELECT
          enrolled_student.student_id,
          enrolled_student.student_name AS name,
          enrollment.course_code,
          enrolled_student.section,
          enrolled_student.semester
         FROM student_course_enrollments enrollment
         JOIN students enrolled_student ON enrolled_student.student_id = enrollment.student_id
         WHERE enrolled_student.student_id IN (?)
         AND enrollment.course_code IN (?)
         ${hasSectionFilter ? 'AND enrolled_student.semester IN (?) AND enrolled_student.section IN (?)' : ''}
         ORDER BY enrolled_student.section, enrolled_student.student_id`,
        [
         studentIds,
         courseCodes,
         ...sectionParams
        ]
      );
    } else {
      [rows] = await db.promise().query(
        `SELECT
          enrolled_student.student_id,
          enrolled_student.student_name AS name,
          enrollment.course_code,
          enrolled_student.section,
          enrolled_student.semester
         FROM student_course_enrollments enrollment
         JOIN students enrolled_student ON enrolled_student.student_id = enrollment.student_id
         WHERE enrollment.course_code IN (?)
         ${hasSectionFilter ? 'AND enrolled_student.semester IN (?) AND enrolled_student.section IN (?)' : ''}
         ORDER BY enrolled_student.section, enrolled_student.student_id`,
        [courseCodes, ...sectionParams]
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
          s.student_name,
          s.department,
          s.semester,
          s.section,
          (
            SELECT course_title
            FROM courses
            WHERE course_code = a.course_code
            ORDER BY section
            LIMIT 1
          ) AS course_title
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
