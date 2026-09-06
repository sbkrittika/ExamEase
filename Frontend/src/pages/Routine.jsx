import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { apiRequest } from '../api';

export default function Routine() {
  const [exams, setExams] = useState([]);
  const [semester, setSemester] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/exams').then((data) => setExams(data.exams || [])).catch((err) => setError(err.message));
  }, []);

  const rows = useMemo(() => exams.filter((exam) => {
    const sections = String(exam.sections || '').split(',').filter(Boolean);
    const semesters = sections.map((item) => item.split(':')[0]);
    return (!semester || semesters.includes(semester))
      && (!department || exam.department === department);
  }), [department, exams, semester]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Routine</h1>
          <p className="text-slate-500 mt-1">Semester-wise examination schedule by department and section.</p>
        </div>
        <CalendarDays className="text-blue-600" size={30} />
      </div>
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3">{error}</div>}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <select value={semester} onChange={(event) => setSemester(event.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
          <option value="">All semesters</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={String(value)}>Semester {value}</option>)}
        </select>
        <select value={department} onChange={(event) => setDepartment(event.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
          <option value="">All departments</option>
          {['CSE', 'EEE', 'BBA', 'Mathematics', 'Physics'].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Time</th><th className="px-6 py-4">Course</th><th className="px-6 py-4">Department</th><th className="px-6 py-4">Semester / Section</th><th className="px-6 py-4">Type</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((exam) => <tr key={exam.exam_id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm">{String(exam.exam_date).slice(0, 10)}</td>
                <td className="px-6 py-4 text-sm">{String(exam.start_time).slice(0, 5)} - {String(exam.end_time).slice(0, 5)}</td>
                <td className="px-6 py-4 text-sm font-semibold">{exam.course_title || exam.course_code}</td>
                <td className="px-6 py-4 text-sm">{exam.department || '—'}</td>
                <td className="px-6 py-4 text-sm">{String(exam.sections || '—').split(',').map((item) => item.replace(':', ' / ')).join(', ')}</td>
                <td className="px-6 py-4 text-sm">{exam.exam_type || 'Exam'}</td>
              </tr>)}
            </tbody>
          </table>
          {!rows.length && <div className="p-10 text-center text-slate-500">No exams match the selected filters.</div>}
        </div>
      </div>
    </div>
  );
}
