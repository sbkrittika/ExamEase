import { useEffect, useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../api';

const emptyForm = { student_id: '', student_number: '', name: '', email: '', department: '', semester: '' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadStudents = () => apiRequest('/api/data/students').then((data) => setStudents(data.students || []));
  useEffect(() => { loadStudents().catch((error) => setMessage(error.message)); }, []);

  const saveStudent = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await apiRequest('/api/data/students', { method: 'POST', body: JSON.stringify(form) }); setForm(emptyForm); setShowForm(false); await loadStudents(); setMessage('Student added successfully.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const removeStudent = async (id) => { if (!window.confirm('Delete this student?')) return; try { await apiRequest(`/api/data/students/${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadStudents(); } catch (error) { setMessage(error.message); } };
  const visible = students.filter((student) => `${student.student_id} ${student.name} ${student.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Students Management</h1><p className="text-slate-500 mt-1">Manage students stored in the university database.</p></div><button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Plus size={18} />Add Student</button></div>
    {message && <p className="text-sm text-slate-600">{message}</p>}
    {showForm && <form onSubmit={saveStudent} className="bg-white rounded-2xl border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">{[['student_id','Student ID'],['student_number','Roll/Number'],['name','Full name'],['email','Email'],['department','Department'],['semester','Semester']].map(([key, label]) => <input key={key} required={key === 'student_id' || key === 'name'} type={key === 'semester' ? 'number' : key === 'email' ? 'email' : 'text'} placeholder={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />)}<div className="md:col-span-3 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-slate-100">Cancel</button><button disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{busy ? 'Adding Student...' : 'Save Student'}</button></div></form>}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="p-4 border-b border-slate-100"><div className="relative w-full sm:w-96"><Search size={18} className="absolute left-3 top-2.5 text-slate-400" /><input placeholder="Search by name, ID or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none" /></div></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-6 py-4">Student ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Department</th><th className="px-6 py-4">Semester</th><th className="px-6 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((student) => <tr key={student.student_id}><td className="px-6 py-4 text-sm font-medium">{student.student_id}</td><td className="px-6 py-4 text-sm">{student.name}</td><td className="px-6 py-4 text-sm text-slate-500">{student.email || '-'}</td><td className="px-6 py-4 text-sm">{student.department || '-'}</td><td className="px-6 py-4 text-sm">{student.semester || '-'}</td><td className="px-6 py-4 text-right"><button onClick={() => removeStudent(student.student_id)} className="text-red-600" title="Delete student"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>{visible.length === 0 && <div className="p-10 text-center text-slate-500">No students added yet.</div>}</div>
  </div>;
}
