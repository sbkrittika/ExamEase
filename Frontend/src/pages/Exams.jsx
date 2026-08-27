import { useEffect, useState } from 'react';
import { Calendar, Clock, Plus } from 'lucide-react';
import { apiRequest } from '../api';

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course_code: '', exam_date: '', start_time: '', end_time: '', total_students: '' });

  const loadData = () => Promise.all([
    apiRequest('/api/exams'),
    apiRequest('/api/courses')
  ]).then(([examData, courseData]) => {
    setExams(examData.exams || []);
    setCourses(courseData.courses || []);
  }).catch(() => { setExams([]); setCourses([]); });

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try { await apiRequest('/api/exams', { method: 'POST', body: JSON.stringify({ ...form, created_by: user.user_id }) }); }
    catch (error) { alert(error.message); return; }
    setForm({ course_code: '', exam_date: '', start_time: '', end_time: '', total_students: '' });
    setShowForm(false);
    loadData();
  };

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Exam Scheduling</h1><p className="text-slate-500 mt-1">Create and manage examinations from university records.</p></div>
      <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Plus size={18} />Schedule Exam</button>
    </div>
    {showForm && <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <select required value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm"><option value="">Select course</option>{courses.map((course) => <option key={course.course_code} value={course.course_code}>{course.course_code} - {course.course_title}</option>)}</select>
      <input required type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
      <input required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
      <input required type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
      <input required type="number" min="1" placeholder="Students" value={form.total_students} onChange={(e) => setForm({ ...form, total_students: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
      <div className="lg:col-span-5 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-slate-100">Cancel</button><button className="px-4 py-2 rounded-xl bg-blue-600 text-white">Save Exam</button></div>
    </form>}
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {exams.length === 0 ? <div className="p-10 text-center text-slate-500">No exams have been added yet.</div> : exams.map((exam) => <div key={exam.exam_id} className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{exam.course_code || 'Course not assigned'}</h2><div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-2"><span className="flex items-center gap-1"><Calendar size={14} />{exam.exam_date}</span><span className="flex items-center gap-1"><Clock size={14} />{exam.start_time} - {exam.end_time}</span></div></div><span className="text-sm text-slate-500">{exam.total_students || 0} students</span></div>)}
    </div>
  </div>;
}