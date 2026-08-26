import { useEffect, useState } from 'react';
import { Grid, Upload, Printer } from 'lucide-react';
import { API_URL, apiRequest } from '../api';

export default function SeatPlan() {
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [message, setMessage] = useState('');
  const [columns, setColumns] = useState(6);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ exam_date: '', exam_time: '', course_code: '', student_ids: '', desired_room_id: '', room_ids: [] });

  const loadRecords = () => Promise.all([
    fetch(`${API_URL}/api/data/rooms`).then((response) => response.json()),
    fetch(`${API_URL}/api/data/students`).then((response) => response.json())
  ]).then(([roomData, studentData]) => { const loadedRooms = roomData.rooms || []; setRooms(loadedRooms); setForm((current) => ({ ...current, room_ids: loadedRooms.map((room) => room.room_id) })); setStudents(studentData.students || []); }).catch((error) => setMessage(error.message || 'Unable to load students and rooms.'));

  useEffect(() => { loadRecords(); }, []);

  const toggleRoom = (roomId) => setForm((current) => ({ ...current, room_ids: current.room_ids.includes(roomId) ? current.room_ids.filter((id) => id !== roomId) : [...current.room_ids, roomId] }));

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${API_URL}/api/exams/upload-zip`, { method: 'POST', body });
    const data = await response.json();
    setMessage(response.ok ? `Imported ${data.imported} students and ${data.roomsImported || 0} rooms.` : data.error || 'Import failed.');
    if (response.ok) loadRecords();
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!rooms.length) { setMessage('No examination rooms are available.'); return; }
    if (!students.length) { setMessage('No students are available. Import or add students first.'); return; }
    if (!form.room_ids.length) { setMessage('Select at least one examination room.'); return; }
    setLoading(true);
    const studentIds = form.student_ids.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const data = await apiRequest('/api/exams/allocate', { method: 'POST', body: JSON.stringify({ exam_date: form.exam_date, exam_time: form.exam_time, course_code: form.course_code || undefined, studentIds, roomIds: form.room_ids, desiredRoomId: form.desired_room_id || undefined, created_by: user.user_id }) });
      setAllocation(data.allocations); setMessage(`Seat plan generated for ${studentIds.length || students.length} students.`);
    } catch (error) { setMessage(error.message); setAllocation(null); } finally { setLoading(false); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Seat Plan Generation</h1><p className="text-slate-500 mt-1">Import students and allocate them automatically to selected rooms.</p></div>
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex flex-wrap gap-3 mb-6"><label className="cursor-pointer bg-slate-100 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Upload size={17} />Import ZIP, XLSX or Markdown<input type="file" accept=".zip,.xlsx,.csv,.json,.md,.markdown" onChange={handleImport} className="hidden" /></label>{message && <span className="text-sm text-slate-600 self-center">{message}</span>}</div>
      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input required type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
        <input required type="time" value={form.exam_time} onChange={(e) => setForm({ ...form, exam_time: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
        <input placeholder="Course code (optional)" value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
        <select value={form.desired_room_id} onChange={(e) => setForm({ ...form, desired_room_id: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm"><option value="">No desired room</option>{rooms.map((room) => <option key={room.room_id} value={room.room_id}>{room.building} - {room.room_number}</option>)}</select>
        <textarea placeholder="Student IDs, separated by spaces, commas, or new lines" value={form.student_ids} onChange={(e) => setForm({ ...form, student_ids: e.target.value })} className="md:col-span-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-24" />
        <div className="md:col-span-2"><p className="text-sm font-medium text-slate-700 mb-2">Rooms available for automatic allocation</p><div className="flex flex-wrap gap-2">{rooms.map((room) => <button type="button" key={room.room_id} onClick={() => toggleRoom(room.room_id)} className={`px-3 py-2 rounded-lg border text-sm ${form.room_ids.includes(room.room_id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}>{room.room_number}</button>)}</div></div>
        <button disabled={loading} className="md:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2"><Grid size={18} />{loading ? 'Generating Seat Plan...' : 'Generate Automatic Seat Plan'}</button>
      </form>
    </div>
    {allocation && <section className="seat-plan-document">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden"><div><h2 className="text-xl font-bold text-slate-900">Generated Examination Allocation</h2><p className="text-sm text-slate-500">Room-wise student placement</p></div><div className="flex items-center gap-2"><label className="text-sm text-slate-600">Columns <select value={columns} onChange={(event) => setColumns(Number(event.target.value))} className="ml-2 border border-slate-200 rounded-lg px-2 py-1"><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="8">8</option></select></label><button onClick={() => window.print()} className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"><Printer size={16} />Print</button></div></div>
      <div className="seat-plan-header"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">ExamEase University Examination</p><h2>Room Allocation Plan</h2><p>{form.exam_date} <span>|</span> {form.exam_time}</p></div>
      {Object.entries(allocation).map(([roomId, assigned]) => { const room = rooms.find((item) => String(item.room_id) === String(roomId)); const courseCounts = assigned.reduce((counts, student) => ({ ...counts, [student.course_code || 'Unassigned']: (counts[student.course_code || 'Unassigned'] || 0) + 1 }), {}); return <article key={roomId} className="room-plan"><div className="room-plan-heading"><div><span className="room-kicker">Examination Room</span><h3>{room?.room_number || roomId}</h3></div><div className="room-metrics"><span>{assigned.length} students</span><span>{room ? `Capacity ${room.capacity}` : ''}</span></div></div><div className="course-summary">{Object.entries(courseCounts).map(([course, count]) => <span key={course}>{course} <strong>{count}</strong></span>)}</div><div className="student-grid" style={{ '--grid-columns': columns }}>{assigned.map((student) => <div key={student.student_id} className="student-cell"><strong>{student.course_code || 'Unassigned'}</strong><span>{student.student_id}</span></div>)}</div><div className="room-footer"><span>Invigilator: ____________________</span><span>Total allocated: {assigned.length}</span></div></article>; })}
    </section>}
  </div>;
}