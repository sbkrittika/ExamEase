import { useEffect, useState } from 'react';
import { Grid, Printer, Download } from 'lucide-react';
import { apiRequest } from '../api';

function seatRows(students, columnCount) {
  const rows = [];
  for (let index = 0; index < students.length; index += columnCount) rows.push(students.slice(index, index + columnCount));
  return rows;
}

export default function SeatPlan() {
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState('');
  const load = async (examId) => {
    if (!examId) return;
    try { const data = await apiRequest(`/api/exams/${examId}/allocations`); setAllocations(data.allocations || []); } catch (err) { setError(err.message); }
  };
  useEffect(() => { Promise.all([apiRequest('/api/exams'), apiRequest('/api/rooms')]).then(([examData, roomData]) => { setExams(examData.exams || []); setRooms((roomData.rooms || []).filter((room) => room.status === 'Available')); }).catch((err) => setError(err.message)); }, []);
  useEffect(() => { load(selectedExam); }, [selectedExam]);
  const generate = async () => {
    if (!selectedExam || !rooms.length) return setError('Select an exam and add available rooms first.');
    try { await apiRequest('/api/exams/allocate', { method: 'POST', body: JSON.stringify({ exam_id: selectedExam, roomIds: rooms.map((room) => room.room_id) }) }); await load(selectedExam); } catch (err) { setError(err.message); }
  };
  const exportCsv = () => {
    const csv = ['Student ID,Name,Course,Room,Seat', ...allocations.map((item) => `${item.student_id},${item.student_name || item.name},${item.course_code},${item.room_number || item.room_id},${item.seat_no}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = `seat-plan-${selectedExam}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const byRoom = allocations.reduce((groups, item) => {
    const key = item.room_id;
    if (!groups[key]) groups[key] = { label: `${item.building || ''} ${item.room_number || item.room_id}`.trim(), seats: [] };
    groups[key].seats.push(item);
    return groups;
  }, {});
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Seat Plan Generation</h1>
        <p className="text-slate-500 mt-1">Allocate enrolled students to available rooms.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl border bg-white flex gap-2 items-center"><Printer size={17} /> Print</button>
        <button onClick={generate} className="px-4 py-2 rounded-xl bg-blue-600 text-white flex gap-2 items-center"><Grid size={17} /> Generate</button>
      </div>
    </div>
    {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>}
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <label className="block text-sm font-medium text-slate-700 mb-2">Select exam</label>
      <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="border rounded-xl px-3 py-2 w-full max-w-xl">
        <option value="">Choose an exam...</option>
        {exams.map((exam) => <option key={exam.exam_id} value={exam.exam_id}>{exam.course_code || 'Exam'} · {exam.exam_date}</option>)}
      </select>
    </div>
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-5 flex justify-between">
        <h2 className="font-semibold">Allocated seats ({allocations.length})</h2>
        <button onClick={exportCsv} disabled={!allocations.length} className="text-blue-600 flex gap-1 items-center disabled:text-slate-300"><Download size={16} /> Export CSV</button>
      </div>
      {!allocations.length ? <div className="p-10 text-center text-slate-500">Generate a plan to see seat assignments.</div> : (
        <div className="p-5 space-y-6">
          {Object.entries(byRoom).map(([roomId, room]) => <div key={roomId} className="border rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 font-semibold text-slate-800">Room {room.label}</div>
            <div className="overflow-x-auto"><table className="seat-table"><thead><tr><th>Course / Section</th>{[1, 2, 3, 4, 5, 6].map((column) => <th key={column}>Seat {column}</th>)}</tr></thead>
              <tbody>{seatRows(room.seats, 6).map((row, index) => <tr key={index}><th>{row[0]?.course_code || '—'}</th>{[0, 1, 2, 3, 4, 5].map((column) => { const item = row[column]; return <td key={column}>{item ? <><strong>{item.student_id}</strong><span>{item.student_name || item.name || ''}</span></> : '—'}</td>; })}</tr>)}</tbody>
            </table></div>
          </div>)}
        </div>
      )}
    </div>
  </div>;
}
