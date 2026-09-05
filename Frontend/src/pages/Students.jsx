import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, X, Printer } from 'lucide-react';
import { apiRequest } from '../api';

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [form, setForm] = useState({ id: '', name: '', email: '', department: 'CSE', year: '1st' });

  useEffect(() => {
    const loadStudents = () => apiRequest('/api/students').then((data) => setStudents((data.students || []).map((student) => ({
      id: student.student_id, name: student.student_name, email: `${student.student_id}@eastdelta.edu.bd`,
      department: student.course_code || 'General', year: student.semester
    })))).catch((error) => setStatus(error.message));
    loadStudents();
    window.addEventListener('examease:data-imported', loadStudents);
    return () => window.removeEventListener('examease:data-imported', loadStudents);
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return students.filter((student) => {
      const haystack = `${student.id} ${student.name} ${student.email} ${student.department}`.toLowerCase();
      return haystack.includes(q) && (!semesterFilter || String(student.year) === semesterFilter);
    });
  }, [searchTerm, semesterFilter, students]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleEdit = (student) => {
    setForm({ id: student.id, name: student.name, email: student.email, department: student.department, year: String(student.year || '1st') });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.id || !form.name || !form.email) {
      alert('Student ID, name and email are required.');
      return;
    }

    const newStudent = {
      id: form.id.trim(),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      department: form.department,
      year: form.year,
    };

    try {
      await apiRequest('/api/students', { method: 'POST', body: JSON.stringify({
        student_id: newStudent.id, student_name: newStudent.name, semester: Number(form.year.replace(/\D/g, '')) || 1, course_code: newStudent.department
      }) });
      setStudents((prev) => [newStudent, ...prev.filter((item) => item.id !== newStudent.id)]);
    } catch (error) { setStatus(error.message); return; }
    setForm({ id: '', name: '', email: '', department: 'CSE', year: '1st' });
    setShowForm(false);
    setStatus('Student added successfully.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students Management</h1>
          <p className="text-slate-500 mt-1">Import students from the ZIP file or add them manually.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.print()} disabled={!students.length} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"><Printer size={18} /> Print List</button>
          <button type="button" onClick={() => setShowForm((prev) => !prev)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2">
            <Plus size={18} />
            <span>{showForm ? 'Close' : 'Add Student'}</span>
          </button>
        </div>
      </div>

      {status && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div>}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Add Student</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label><input name="id" value={form.id} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="262002910" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input name="name" value={form.name} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nion Nath" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="student@eastdelta.edu.bd" /></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select name="department" value={form.department} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="CSE">CSE</option>
                <option value="EEE">EEE</option>
                <option value="BBA">BBA</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <select name="year" value={form.year} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-5 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Save Student</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-slate-400" /></div>
            <input type="text" placeholder="Search by name, ID or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" />
          </div>
          <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm"><option value="">All semesters</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}</select>
        </div>

        {students.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No students loaded yet. Upload the ZIP file or add a student manually.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Student ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Year</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{student.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{student.department}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{student.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex items-center justify-end space-x-2"><button type="button" onClick={() => handleEdit(student)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button><button type="button" onClick={async () => { try { await apiRequest(`/api/students/${student.id}`, { method: 'DELETE' }); setStudents((prev) => prev.filter((item) => item.id !== student.id)); } catch (error) { setStatus(error.message); } }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="student-list-print">
        <h1>STUDENT LIST</h1>
        <p>ExamEase student list</p>
        {Object.entries(filtered.reduce((groups, student) => {
          const key = student.department || 'UNASSIGNED';
          groups[key] = groups[key] || [];
          groups[key].push(student);
          return groups;
        }, {})).map(([course, courseStudents]) => (
          <section key={course}>
            <h2>{course} ({courseStudents.length})</h2>
            <table><thead><tr><th>Student ID</th><th>Name</th></tr></thead><tbody>{courseStudents.map((student) => <tr key={student.id}><td>{student.id}</td><td>{student.name}</td></tr>)}</tbody></table>
          </section>
        ))}
      </div>
    </div>
  );
}
