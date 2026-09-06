import { useEffect, useMemo, useState } from 'react';
import { Search, UserCheck, Plus, Edit2, Trash2, X } from 'lucide-react';
import { apiRequest } from '../api';

const emptyForm = { exam_id: '', room_id: '', faculty_id: '' };

export default function Invigilation() {
  const [assignments, setAssignments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const load = async () => {
    try {
      const [assignmentData, facultyData, examData, roomData] = await Promise.all([
        apiRequest('/api/invigilation'), apiRequest('/api/faculty'), apiRequest('/api/exams'), apiRequest('/api/rooms')
      ]);
      setAssignments(assignmentData.assignments || []);
      setFaculty(facultyData.faculty || []);
      setExams(examData.exams || []);
      setRooms(roomData.rooms || []);
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, []);
  const reset = () => { setForm(emptyForm); setEditing(null); setShowForm(false); };
  const submit = async (event) => {
    event.preventDefault();
    try {
      await apiRequest(editing ? `/api/invigilation/${editing.assignment_id}` : '/api/invigilation', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) });
      reset();
      load();
    } catch (err) { setError(err.message); }
  };
  const remove = async (item) => {
    if (!window.confirm('Remove this invigilator assignment?')) return;
    try { await apiRequest(`/api/invigilation/${item.assignment_id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  };
  const filtered = useMemo(() => assignments.filter((item) => `${item.faculty_name} ${item.room_number} ${item.course_code} ${item.course_title} ${item.exam_id}`.toLowerCase().includes(searchTerm.toLowerCase())), [assignments, searchTerm]);
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Invigilation Duties</h1><p className="text-slate-500 mt-1">Assign faculty to exam rooms.</p></div><button type="button" onClick={() => (showForm ? reset() : setShowForm(true))} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Plus size={18} />{showForm ? 'Close' : 'Add Invigilator'}</button></div>
    {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>}
    {showForm && <form onSubmit={submit} className="bg-white rounded-2xl border p-5 grid grid-cols-1 md:grid-cols-3 gap-4"><div className="md:col-span-3 flex justify-between"><h2 className="font-semibold">{editing ? 'Edit Invigilator Assignment' : 'Add Invigilator'}</h2><button type="button" onClick={reset}><X size={18} /></button></div>
      <label className="text-sm font-medium">Exam<select required value={form.exam_id} onChange={(e) => setForm({ ...form, exam_id: e.target.value })} className="mt-1 w-full border rounded-xl px-3 py-2.5"><option value="">Select exam</option>{exams.map((exam) => <option key={exam.exam_id} value={exam.exam_id}>{exam.course_title ? `${exam.course_title} ${exam.course_code}` : exam.course_code} - {String(exam.exam_date).slice(0, 10)} {String(exam.start_time || '').slice(0, 5)}</option>)}</select></label>
      <label className="text-sm font-medium">Room<select required value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="mt-1 w-full border rounded-xl px-3 py-2.5"><option value="">Select room</option>{rooms.map((room) => <option key={room.room_id} value={room.room_id}>{room.building} {room.room_number}</option>)}</select></label>
      <label className="text-sm font-medium">Faculty<select required value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })} className="mt-1 w-full border rounded-xl px-3 py-2.5"><option value="">Select faculty</option>{faculty.map((member) => <option key={member.user_id} value={member.user_id}>{member.full_name}</option>)}</select></label>
      <div className="md:col-span-3 flex justify-end"><button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl">Save Assignment</button></div>
    </form>}
    <div className="bg-white rounded-2xl border overflow-hidden"><div className="p-4 border-b"><div className="relative w-full sm:w-96"><Search size={17} className="absolute left-3 top-2.5 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search faculty, room or exam..." className="w-full pl-10 border rounded-xl py-2 text-sm" /></div></div>{!filtered.length ? <div className="p-10 text-center text-slate-500"><UserCheck className="mx-auto mb-2 text-slate-300" />No invigilation assignments found.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-5 py-3">Faculty</th><th className="px-5 py-3">Exam</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y">{filtered.map((item) => <tr key={item.assignment_id}><td className="px-5 py-3 text-sm font-medium">{item.faculty_name}</td><td className="px-5 py-3 text-sm">{item.course_title ? `${item.course_title} ${item.course_code}` : item.course_code || `Exam ${item.exam_id}`}</td><td className="px-5 py-3 text-sm">{item.building} {item.room_number}</td><td className="px-5 py-3 text-sm">{item.exam_date} {String(item.start_time || '').slice(0, 5)}-{String(item.end_time || '').slice(0, 5)}</td><td className="px-5 py-3 flex gap-3"><button type="button" onClick={() => { setEditing(item); setForm({ exam_id: String(item.exam_id), room_id: String(item.room_id), faculty_id: String(item.faculty_id) }); setShowForm(true); }}><Edit2 size={16} /></button><button type="button" onClick={() => remove(item)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}</div>
  </div>;
}
