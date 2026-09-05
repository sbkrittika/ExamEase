import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  X,
  UploadCloud
} from 'lucide-react';

import { apiRequest } from '../api';

function autoAllocateStudents(
  students,
  roomCount,
  maxCoursesPerRoom = 4
) {
  if (
    !Array.isArray(students) ||
    students.length === 0 ||
    !roomCount
  ) {
    return [];
  }

  const byCourse = {};

  students.forEach((student) => {
    const key = student.course || 'UNASSIGNED';

    if (!byCourse[key]) {
      byCourse[key] = [];
    }

    byCourse[key].push(student);
  });

  const rooms = Array.from(
    { length: Number(roomCount) },
    (_, index) => ({
      room: `Room ${index + 1}`,
      courses: new Set(),
      students: []
    })
  );

  const orderedCourses = Object.entries(byCourse).sort(
    (a, b) => b[1].length - a[1].length
  );

  orderedCourses.forEach(
    ([course, courseStudents]) => {
      courseStudents.forEach((student) => {
        const candidates = rooms.filter(
          (room) =>
            room.courses.size < maxCoursesPerRoom
        );

        const better = candidates.sort(
          (a, b) =>
            a.students.length - b.students.length
        );

        const pickedRoom =
          better[0] || rooms[0];

        pickedRoom.students.push(student);
        pickedRoom.courses.add(course);
      });
    }
  );

  return rooms.map((room) => ({
    room: room.room,
    students: room.students
  }));
}

function getCourseCode(course) {
  if (!course) return '';

  return String(course)
    .split(':')[0]
    .trim();
}

function getCourseSection(course) {
  if (!course) return '';

  const text = String(course).trim();

  const match = text.match(
    /^([^:]+?)(?:[.:](\d+))?(?::|$)/
  );

  if (match?.[2]) {
    return `${match[1].trim()}.${match[2]}`;
  }

  return getCourseCode(course);
}

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    course: '',
    date: '',
    timeRange: '',
    semester: '',
    sections: [],
    examType: 'Midterm',
    roomCount: '2',
    studentList: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isImportingZip, setIsImportingZip] =
    useState(false);

  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [examData, courseData, studentData] =
        await Promise.all([
          apiRequest('/api/exams'),
          apiRequest('/api/courses'),
          apiRequest('/api/students')
        ]);

      const loadedExams = (
        examData.exams || []
      ).map((exam) => ({
        id: exam.exam_id,
        course: exam.course_code || '',
        date: exam.exam_date
          ? String(exam.exam_date).slice(0, 10)
          : '',
        timeRange: `${String(exam.start_time || '').slice(0, 5)}-${String(exam.end_time || '').slice(0, 5)}`,
        time: exam.start_time ? String(exam.start_time).slice(0, 5) : '',

        examType:
          exam.exam_type === 'Final'
            ? 'Final'
            : 'Midterm',

        roomCount: Number(
          exam.room_count || 0
        ),

        totalStudents: Number(
          exam.total_students || 0
        ),

        status: 'Scheduled',

        allocation: []
      }));

      setExams(loadedExams);
      setCourses(courseData.courses || []);
      setStudents(studentData.students || []);
    } catch (err) {
      setError(
        err.message ||
          'Failed to load exams.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleZipImport = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !file.name
        .toLowerCase()
        .endsWith('.zip')
    ) {
      alert(
        'Please select a .zip file containing the Excel roster.'
      );

      event.target.value = '';
      return;
    }

    const formData = new FormData();

    formData.append('file', file);

    try {
      setIsImportingZip(true);

      const data = await apiRequest(
        '/api/exams/upload-zip',
        {
          method: 'POST',
          body: formData
        }
      );

      const importedRows = Array.isArray(
        data?.students
      )
        ? data.students
        : [];

      if (importedRows.length > 0) {
        const nextStudentList =
          importedRows
            .map(
              (student) =>
                `${student.student_id},${
                  student.course_code ||
                  getCourseCode(form.course) ||
                  'UNASSIGNED'
                }`
            )
            .join('\n');

        setForm((prev) => ({
          ...prev,
          studentList: nextStudentList
        }));
      }

      alert(
        `Imported ${
          data.imported ?? importedRows.length
        } student records from ${file.name}.`
      );
    } catch (err) {
      console.error(
        'ZIP import error:',
        err
      );

      alert(
        err.message ||
          'Could not import the ZIP file.'
      );
    } finally {
      setIsImportingZip(false);
      event.target.value = '';
    }
  };

  const resetForm = () => {
    setForm({
      course: '',
      date: '',
      timeRange: '',
      semester: '',
      sections: [],
      examType: 'Midterm',
      roomCount: '2',
      studentList: ''
    });

    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (
      !form.course ||
      !form.date ||
      !form.timeRange ||
      !form.semester ||
      !form.sections.length
    ) {
      alert(
        'Please fill in course, date, time, semester and at least one section.'
      );

      return;
    }

    const parsedStudents = eligibleStudents.map((student) => ({
      id: student.student_id,
      name: student.student_name,
      course: student.course_code
    }));

    const [startTime, endTime] = form.timeRange.split('-');

    const courseCode =
      getCourseCode(form.course);

    try {
      setLoading(true);

      const payload = {
        exam_date: form.date,
        start_time: startTime,
        end_time: endTime,
        time_range: form.timeRange,
        exam_type: form.examType,
        course_code: courseCode,
        semester: Number(form.semester),
        sections: form.sections,
        total_students: parsedStudents.length
      };

      let response;

      if (!editingId) {
        response = await apiRequest(
          '/api/exams',
          {
            method: 'POST',
            body: JSON.stringify(payload)
          }
        );

        await loadData();

        resetForm();

        return;
      }

      response = await apiRequest(
        `/api/exams/${editingId}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload)
        }
      );

      console.log(
        'Exam updated:',
        response
      );

      await loadData();

      resetForm();
    } catch (err) {
      console.error(
        'Exam save/update error:',
        err
      );

      setError(
        err.message ||
          'Failed to save exam.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (exam) => {
    try {
      setError('');

      let studentList = '';

      try {
        const data = await apiRequest(
          `/api/exams/${exam.id}/allocations`
        );

        const allocations =
          data.allocations || [];

        studentList = allocations
          .map((student) => {
            const studentId =
              student.student_id || '';

            const course =
              student.course_code ||
              exam.course ||
              '';

            return `${studentId},${course}`;
          })
          .filter(
            (line) =>
              line.split(',')[0].trim()
          )
          .join('\n');
      } catch (allocationError) {
        console.warn(
          'Could not load allocations:',
          allocationError
        );
      }

      setForm({
        course: exam.course || '',
        date: exam.date || '',
        timeRange: `${exam.time || ''}-${exam.endTime || ''}`,
        semester: '',
        sections: [],

        examType:
          exam.examType === 'Final'
            ? 'Final'
            : 'Midterm',

        roomCount: String(
          exam.roomCount || 2
        ),

        studentList
      });

      setEditingId(exam.id);

      setShowForm(true);
    } catch (err) {
      setError(
        err.message ||
          'Could not edit this exam.'
      );
    }
  };

  const handleDelete = async (id) => {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this exam?'
      );

    if (!confirmed) return;

    try {
      setError('');
      setLoading(true);

      await apiRequest(
        `/api/exams/${id}`,
        {
          method: 'DELETE'
        }
      );

      await loadData();
    } catch (err) {
      console.error(
        'Delete exam error:',
        err
      );

      setError(
        err.message ||
          'Failed to delete exam.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';

    const parsed = new Date(
      `${date}T00:00:00`
    );

    if (
      Number.isNaN(parsed.getTime())
    ) {
      return date;
    }

    return parsed.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  };

  const formatTime = (time) => {
    if (!time) return '';

    const [hours, minutes] =
      String(time)
        .split(':')
        .map(Number);

    const date = new Date();

    date.setHours(
      hours,
      minutes,
      0,
      0
    );

    return date.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit'
      }
    );
  };

  const eligibleStudents = students.filter((student) =>
    (!form.course || String(student.course_code || '').trim() === getCourseCode(form.course))
    && (!form.semester || String(student.semester) === String(form.semester))
    && (!form.sections.length || form.sections.includes(String(student.section || '1')))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Exam Scheduling
          </h1>

          <p className="text-slate-500 mt-1">
            Create and manage upcoming examinations.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={isImportingZip}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <UploadCloud size={18} />

            <span>
              {isImportingZip
                ? 'Importing...'
                : 'Import ZIP'}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            hidden
            onChange={handleZipImport}
          />

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <Plus size={18} />

            <span>
              Schedule Exam
            </span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">
              {editingId
                ? 'Edit Exam'
                : 'Schedule New Exam'}
            </h2>

            <button
              type="button"
              onClick={resetForm}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Course *
              </label>

              <select
                name="course"
                value={form.course}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">
                  Select a course...
                </option>

                {courses.map((course) => (
                  <option
                    key={`${course.course_code}-${course.section}`}
                    value={`${course.course_code}${
                      course.section
                        ? `.${course.section}`
                        : ''
                    }: ${course.course_title}`}
                  >
                    {course.course_code}
                    {course.section
                      ? `.${course.section}`
                      : ''}
                    : {course.course_title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Type *
              </label>

              <select
                name="examType"
                value={form.examType}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Midterm">
                  Midterm Exam
                </option>

                <option value="Final">
                  Final Exam
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date *
              </label>

              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Time *
              </label>

              <input type="text" name="timeRange" value={form.timeRange} onChange={handleChange} placeholder="10.30-11.30" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester *</label>
              <select name="semester" value={form.semester} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select semester...</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sections *</label>
              <div className="flex flex-wrap gap-2 pt-2">{Array.from({ length: 7 }, (_, index) => String(index + 1)).map((section) => <label key={section} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.sections.includes(section)} onChange={() => setForm((previous) => ({ ...previous, sections: previous.sections.includes(section) ? previous.sections.filter((item) => item !== section) : [...previous.sections, section] }))} />{section}</label>)}</div>
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Student IDs / list ({eligibleStudents.length})</label>

              <textarea
                name="studentList"
                rows="5"
                value={eligibleStudents.map((student) => `${student.student_id} - ${student.student_name || 'Unknown'} (${student.section || '1'})`).join('\n')}
                readOnly
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Select a semester and section to load students."
              />

              <p className="text-xs text-slate-400 mt-1">
                Students are loaded automatically from the selected semester and sections.
              </p>
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
              >
                {loading
                  ? 'Saving...'
                  : editingId
                  ? 'Update Exam'
                  : 'Save Exam'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Upcoming Exams
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              {exams.length} exam
              {exams.length !== 1
                ? 's'
                : ''}{' '}
              scheduled
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Add Exam
          </button>
        </div>

        {loading && exams.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Loading exams...
          </div>
        ) : exams.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar
              size={40}
              className="mx-auto text-slate-300 mb-3"
            />

            <h3 className="font-semibold text-slate-700">
              No exams found
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Schedule your first examination to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-4 sm:p-6 hover:bg-slate-50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {exam.course}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-lg font-medium">
                      {exam.examType}
                    </span>

                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Calendar
                        size={14}
                        className="text-slate-400"
                      />

                      <span>
                        {formatDate(exam.date)}
                      </span>
                    </span>

                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock
                        size={14}
                        className="text-slate-400"
                      />

                      <span>
                        {formatTime(exam.time)} - {formatTime(exam.endTime)}
                      </span>
                    </span>

                    {exam.totalStudents > 0 && (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-1">
                        {exam.totalStudents}{' '}
                        students
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50 text-blue-700 border-blue-100">
                    Scheduled
                  </span>

                  <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(exam)
                      }
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit exam"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(exam.id)
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete exam"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
