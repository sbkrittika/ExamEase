const fs = require('fs');
const path = require('path');
const { allocateStudents } = require('./allocator');

const studentsPath = process.argv[2] || path.join(process.cwd(), 'students.json');
const roomArgs = process.argv.slice(3);
if (!fs.existsSync(studentsPath)) {
  console.error('students.json not found. Run import first: node importZip.js <zipPath>');
  process.exit(1);
}
if (roomArgs.length === 0) {
  console.error('Usage: node demoAllocate.js <students.json> <room1> <room2> ...');
  process.exit(1);
}

const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
const roomIds = roomArgs;

const result = allocateStudents(students, roomIds, { maxCoursesPerRoom: 4 });
if (result.warnings && result.warnings.length) {
  console.warn('Warnings:', result.warnings.join('\n'));
}
console.log('Allocations:');
for (const r of roomIds) {
  console.log('\nRoom:', r, '->', (result.allocations[r] || []).length, 'students');
  (result.allocations[r] || []).forEach(s => console.log('  ', s.student_id, s.name, s.course_code));
}
