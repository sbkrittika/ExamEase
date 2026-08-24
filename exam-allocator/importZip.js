const AdmZip = require('adm-zip');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
  const zipPath = process.argv[2];
  if (!zipPath) {
    console.error('Usage: node importZip.js <zipPath>');
    process.exit(1);
  }

  if (!fs.existsSync(zipPath)) {
    console.error('ZIP file not found:', zipPath);
    process.exit(1);
  }

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const xlsxEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.xlsx'));
  if (!xlsxEntry) {
    console.error('No .xlsx file found inside the ZIP. Found entries:\n', entries.map(e=>e.entryName).join('\n'));
    process.exit(1);
  }

  const tmp = path.join(os.tmpdir(), 'exam-allocator-' + Date.now() + '.xlsx');
  fs.writeFileSync(tmp, xlsxEntry.getData());

  const workbook = XLSX.readFile(tmp);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  function colVal(row, names) {
    for (const n of names) if (row[n] !== undefined) return row[n];
    return '';
  }

  const students = data.map(r => ({
    student_id: String(colVal(r, ['student_id', 'Student ID', 'StudentID', 'id', 'ID'])).trim(),
    name: String(colVal(r, ['name', 'Name'])).trim(),
    course_code: String(colVal(r, ['course_code', 'Course Code', 'Course', 'course'])).trim()
  })).filter(s => s.student_id);

  const out = path.join(process.cwd(), 'students.json');
  fs.writeFileSync(out, JSON.stringify(students, null, 2), 'utf8');
  console.log('Wrote', out, 'with', students.length, 'students');
}

main().catch(err => { console.error(err); process.exit(1); });
