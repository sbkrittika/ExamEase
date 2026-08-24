Exam Allocator

This small utility imports a student/course Excel file from a ZIP and allocates students into rooms such that each room contains students from at most 4 distinct courses.

Quick start:

1. Install dependencies in the exam-allocator folder:

   npm install

2. Import the ZIP (example):

   node importZip.js "C:/Users/USER/OneDrive/Documents/Downloads/Sample files.zip"

   This writes students.json in the current folder.

3. Run allocation (example):

   node demoAllocate.js students.json RoomA RoomB RoomC

API / Integration:

- importZip.js extracts the first .xlsx it finds inside the ZIP and converts the first sheet to students.json.
- allocator.js exports allocateStudents(students, roomIds, { maxCoursesPerRoom }) which returns { allocations, warnings }.

Notes:
- The Excel sheet should include columns like "Student ID" / "student_id", "Name" and "Course Code" / "course_code". The importer tries common column header names.
- If the number of distinct courses is greater than (rooms * 4) the allocator will return a warning and no allocation because the constraint cannot be met.

Feel free to ask for integration into your existing Express app (upload endpoint, persistent DB save, or custom seat-balancing rules).