import JSZip from 'jszip';
import * as XLSX from 'xlsx';

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toCourseCode(raw) {
  if (!raw) return 'UNKNOWN';
  return normalizeText(raw)
    .replace(/–/g, '-')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9()\-\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toCourseTitle(raw) {
  if (!raw) return 'Imported Course';
  const text = normalizeText(raw).replace(/\s+/g, ' ');
  return text.length ? text : 'Imported Course';
}

export async function importStudentListFromZip(file) {
  if (!file) throw new Error('A ZIP file is required.');

  const zip = await JSZip.loadAsync(file);
  const xlsxEntry = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.xlsx'));

  if (!xlsxEntry) {
    throw new Error('No .xlsx file found inside the uploaded ZIP.');
  }

  const xlsxBytes = await zip.file(xlsxEntry).async('uint8array');
  const workbook = XLSX.read(xlsxBytes, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

  let courseCode = 'UNKNOWN';
  let courseTitle = 'Imported Course';
  let studentHeaderIndex = -1;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const rowText = row.map((cell) => normalizeText(cell)).join(' | ');

    if (rowText.toLowerCase().includes('course')) {
      const candidate = row[1];
      if (candidate) {
        courseCode = toCourseCode(candidate);
      }
    }

    if (rowText.toLowerCase().includes('class')) {
      const candidate = row[1];
      if (candidate) {
        courseCode = toCourseCode(candidate);
      }
    }

    if ((row[0] || '').toString().toLowerCase().includes('id number') || (row[0] || '').toString().toLowerCase().includes('student id')) {
      studentHeaderIndex = i;
      break;
    }
  }

  const courseRow = rows.find((row) => {
    const firstCell = normalizeText(row[0]);
    const secondCell = normalizeText(row[1]);
    return firstCell.toLowerCase() === 'course' || firstCell.toLowerCase() === 'class';
  });

  if (courseRow && courseRow[1]) {
    courseCode = toCourseCode(courseRow[1]);
    courseTitle = toCourseTitle(courseRow[1]);
  }

  if (studentHeaderIndex === -1) {
    throw new Error('The uploaded ZIP does not contain a recognizable student list table.');
  }

  const students = [];
  for (let i = studentHeaderIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const studentId = normalizeText(row[0]);
    if (!studentId || !/\d/.test(studentId)) continue;

    const name = normalizeText(row[1]);
    const email = normalizeText(row[3] || row[2] || '');
    const department = normalizeText(row[4] || '');
    const year = normalizeText(row[6] || '');

    const student = {
      id: studentId,
      name: name || 'Unknown Student',
      email: email || `${studentId}@eastdelta.edu.bd`,
      department: department || 'General',
      year: year || 'N/A',
      courseCode: courseCode,
      courseTitle: courseTitle,
    };

    students.push(student);
  }

  const courseList = [
    {
      code: courseCode,
      title: courseTitle,
      credit: 3,
      department: students[0]?.department || 'General',
    },
  ];

  return { students, courses: courseList };
}
