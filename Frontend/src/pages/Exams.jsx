import { useRef, useState } from 'react';
import { Plus, Calendar, Clock, Edit2, Trash2, X, UploadCloud } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://examease-backend-r8s4.onrender.com';

const sampleStudents = [
  { id: '2023001', name: 'Alice Johnson', course: 'CSE 311' },
  { id: '2023002', name: 'Bob Smith', course: 'MTH 201' },
  { id: '2023003', name: 'Charlie Brown', course: 'PHY 101' },
  { id: '2023004', name: 'Diana Prince', course: 'BBA 101' },
  { id: '2023005', name: 'Evan Wright', course: 'CSE 311' },
  { id: '2023006', name: 'Frank Green', course: 'EEE 201' },
  { id: '2023007', name: 'Grace Lee', course: 'MTH 201' },
  { id: '2023008', name: 'Henry Wood', course: 'PHY 101' },
  { id: '2023009', name: 'Ivy Martin', course: 'CSE 311' },
];

function autoAllocateStudents(students, roomCount, maxCoursesPerRoom = 4) {
  if (!Array.isArray(students) || students.length === 0 || !roomCount) {
    return [];
  }

  const byCourse = {};
  students.forEach((student) => {
    const key = student.course || 'UNASSIGNED';
    if (!byCourse[key]) byCourse[key] = [];
    byCourse[key].push(student);
  });

  const rooms = Array.from({ length: Number(roomCount) }, (_, index) => ({
    room: `Room ${index + 1}`,
    courses: new Set(),
    students: []
  }));

  const orderedCourses = Object.entries(byCourse).sort((a, b) => b[1].length - a[1].length);

  orderedCourses.forEach(([course, courseStudents]) => {
    courseStudents.forEach((student) => {
      const candidates = rooms.filter((room) => room.courses.size < maxCoursesPerRoom);
      const better = candidates.sort((a, b) => a.students.length - b.students.length);
      const pickedRoom = better[0] || rooms[0];
      pickedRoom.students.push(student);
      pickedRoom.courses.add(course);
    });
  });

  return rooms.map((room) => ({ room: room.room, students: room.students }));
}

export default function Exams() {
  const [exams, setExams] = useState([
    {
      id: 1,
      course: 'CSE 311: Database Systems',
      date: '2026-10-24',
      time: '10:00',
      duration: '2 Hours',
      roomCount: 2,
      status: 'Scheduled',
      allocation: [
        { room: 'Room 1', students: [{ id: '2023001', name: 'Alice Johnson', course: 'CSE 311' }] },
        { room: 'Room 2', students: [{ id: '2023005', name: 'Evan Wright', course: 'CSE 311' }] }
      ]
    }
  ]);

  const [form, setForm] = useState({
    course: '',
    date: '',
    time: '',
    duration: '2 Hours',
    roomCount: '2',
    studentList: sampleStudents.map((s) => `${s.id},${s.course}`).join('\n')
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isImportingZip, setIsImportingZip] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleZipImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please select a .zip file containing the Excel roster.');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsImportingZip(true);
      const response = await fetch(`${API_URL}/api/exams/upload-zip`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'ZIP import failed.');
      }

      const importedRows = Array.isArray(data?.students) ? data.students : [];

      if (importedRows.length > 0) {
        const nextStudentList = importedRows
          .map((student) => `${student.student_id},${student.course_code || form.course.split(':')[0].trim() || 'UNASSIGNED'}`)
          .join('\n');

        setForm((prev) => ({
          ...prev,
          studentList: nextStudentList
        }));
      }

      alert(`Imported ${data.imported ?? importedRows.length} student records from ${file.name}.`);
    } catch (error) {
      console.error('ZIP import error:', error);
      alert(error.message || 'Could not import the ZIP file.');
    } finally {
      setIsImportingZip(false);
      event.target.value = '';
    }
  };

  const resetForm = () => {
    setForm({ course: '', date: '', time: '', duration: '2 Hours', roomCount: '2', studentList: sampleStudents.map((s) => `${s.id},${s.course}`).join('\n') });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.course || !form.date || !form.time || !form.studentList) {
      alert('Please fill in course, date, time and student list.');
      return;
    }

    const parsedStudents = form.studentList
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((entry, index) => {
        const parts = entry.split(',');
        const rawId = parts[0] || `AUTO-${index + 1}`;
        const rawCourse = parts[1] || form.course.split(':')[0].trim();
        return { id: rawId, name: `Student ${rawId}`, course: rawCourse };
      });

    const allocation = autoAllocateStudents(parsedStudents, Number(form.roomCount) || 1, 4);

    const newExam = {
      id: editingId || Date.now(),
      course: form.course,
      date: form.date,
      time: form.time,
      duration: form.duration,
      roomCount: Number(form.roomCount) || 1,
      status: 'Scheduled',
      allocation
    };

    if (editingId) {
      setExams((prev) => prev.map((exam) => (exam.id === editingId ? newExam : exam)));
    } else {
      setExams((prev) => [newExam, ...prev]);
    }

    resetForm();
  };

  const handleEdit = (exam) => {
    setForm({
      course: exam.course,
      date: exam.date,
      time: exam.time,
      duration: exam.duration,
      roomCount: String(exam.roomCount || 2),
      studentList: (exam.allocation || []).flatMap((room) => room.students.map((s) => `${s.id},${s.course}`)).join('\n')
    });
    setEditingId(exam.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this exam?');
    if (!confirmed) return;
    setExams((prev) => prev.filter((exam) => exam.id !== id));
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Scheduling</h1>
          <p className="text-slate-500 mt-1">Create and manage upcoming examinations.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImportingZip}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <UploadCloud size={18} />
            <span>{isImportingZip ? 'Importing...' : 'Import ZIP'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            hidden
            onChange={handleZipImport}
          />

          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2">
            <Plus size={18} />
            <span>Schedule Exam</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">{editingId ? 'Edit Exam' : 'Schedule New Exam'}</h2>
            <button type="button" onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
              <select name="course" value={form.course} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select a course...</option>
                <option value="CSE 311: Database Systems">CSE 311: Database Systems</option>
                <option value="CSE 312: Web Development">CSE 312: Web Development</option>
                <option value="MTH 201: Linear Algebra">MTH 201: Linear Algebra</option>
                <option value="PHY 101: Mechanics">PHY 101: Mechanics</option>
                <option value="EEE 201: Electrical Circuits">EEE 201: Electrical Circuits</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
              <input type="time" name="time" value={form.time} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
              <select name="duration" value={form.duration} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="1 Hour">1 Hour</option>
                <option value="2 Hours">2 Hours</option>
                <option value="3 Hours">3 Hours</option>
                <option value="4 Hours">4 Hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rooms</label>
              <input type="number" min="1" max="10" name="roomCount" value={form.roomCount} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Student IDs / list</label>
              <textarea name="studentList" rows="4" value={form.studentList} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={'2023001, CSE 311\n2023002, MTH 201\n2023003, PHY 101'} />
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingId ? 'Update Exam' : 'Save Exam'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Upcoming Exams</h2>
            <p className="text-sm text-slate-500 mt-1">{exams.length} exam{exams.length !== 1 ? 's' : ''} scheduled</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><Plus size={16} /> Add Exam</button>
        </div>

        {exams.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-semibold text-slate-700">No exams found</h3>
            <p className="text-sm text-slate-500 mt-1">Schedule your first examination to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {exams.map((exam) => (
              <div key={exam.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">{exam.course}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg"><Calendar size={14} className="text-slate-400" /><span>{formatDate(exam.date)}</span></span>
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg"><Clock size={14} className="text-slate-400" /><span>{formatTime(exam.time)} ({exam.duration})</span></span>
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-md px-2 py-1">{exam.roomCount} rooms</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(exam.allocation || []).map((room) => (
                      <div key={room.room} className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">{room.room}:</span>
                        <span className="text-xs text-slate-500">{room.students.length} students</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${exam.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{exam.status}</span>
                  <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(exam)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit exam"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete exam"><Trash2 size={16} /></button>
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
