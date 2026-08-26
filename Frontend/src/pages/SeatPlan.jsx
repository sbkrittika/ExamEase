import { useEffect, useState } from 'react';
import { Grid, Upload } from 'lucide-react';

const API_URL = 'https://examease-backend-r8s4.onrender.com';

export default function SeatPlan() {
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ exam_date: '', exam_time: '', course_code: '', student_ids: '', desired_room_id: '', room_ids: [] });

  const loadRecords = () => Promise.all([
    fetch(`${API_URL}/api/data/rooms`).then((response) => response.json()),
    fetch(`${API_URL}/api/data/students`).then((response) => response.json())
  ]).then(([roomData, studentData]) => { setRooms(roomData.rooms || []); setStudents(studentData.students || []); }).catch(() => { setRooms([]); setStudents([]); });

  useEffect(() => { loadRecords(); }, []);

  const toggleRoom = (roomId) => setForm((current) => ({ ...current, room_ids: current.room_ids.includes(roomId) ? current.room_ids.filter((id) => id !== roomId) : [...current.room_ids, roomId] }));

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${API_URL}/api/exams/upload-zip`, { method: 'POST', body });
    const data = await response.json();
    setMessage(response.ok ? `Imported ${data.imported} students.` : data.error || 'Import failed.');
    if (response.ok) loadRecords();
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    const studentIds = form.student_ids.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
    const response = await fetch(`${API_URL}/api/exams/allocate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam_date: form.exam_date, exam_time: form.exam_time, course_code: form.course_code || undefined, studentIds, roomIds: form.room_ids, desiredRoomId: form.desired_room_id || undefined }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || 'Allocation failed.'); setAllocation(null); return; }
    setAllocation(data.allocations);
    setMessage(`Seat plan generated for ${studentIds.length || students.length} students.`);
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Seat Plan Generation</h1><p className="text-slate-500 mt-1">Import students and allocate them automatically to selected rooms.</p></div>
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex flex-wrap gap-3 mb-6"><label className="cursor-pointer bg-slate-100 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Upload size={17} />Import ZIP or XLSX<input type="file" accept=".zip,.xlsx" onChange={handleImport} className="hidden" /></label>{message && <span className="text-sm text-slate-600 self-center">{message}</span>}</div>
      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input required type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
        <input required type="time" value={form.exam_time} onChange={(e) => setForm({ ...form, exam_time: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
        <input placeholder="Course code (optional)" value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
        <select value={form.desired_room_id} onChange={(e) => setForm({ ...form, desired_room_id: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm"><option value="">No desired room</option>{rooms.map((room) => <option key={room.room_id} value={room.room_id}>{room.building} - {room.room_number}</option>)}</select>
        <textarea placeholder="Student IDs, separated by spaces, commas, or new lines" value={form.student_ids} onChange={(e) => setForm({ ...form, student_ids: e.target.value })} className="md:col-span-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-24" />
        <div className="md:col-span-2"><p className="text-sm font-medium text-slate-700 mb-2">Rooms available for automatic allocation</p><div className="flex flex-wrap gap-2">{rooms.map((room) => <button type="button" key={room.room_id} onClick={() => toggleRoom(room.room_id)} className={`px-3 py-2 rounded-lg border text-sm ${form.room_ids.includes(room.room_id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}>{room.room_number}</button>)}</div></div>
        <button className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2"><Grid size={18} />Generate Automatic Seat Plan</button>
      </form>
    </div>
    {allocation && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Object.entries(allocation).map(([roomId, assigned]) => <div key={roomId} className="bg-white rounded-xl border border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Room {roomId}</h2><p className="text-sm text-slate-500 mb-3">{assigned.length} students</p><div className="space-y-1 text-sm">{assigned.map((student) => <div key={student.student_id} className="flex justify-between border-t border-slate-100 pt-2"><span>{student.student_id}</span><span className="text-slate-500">{student.course_code || 'Unassigned'}</span></div>)}</div></div>)}</div>}
  </div>;
}