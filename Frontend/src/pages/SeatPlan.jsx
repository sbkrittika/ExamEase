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
  return <div className="space-y-6">

  </div>;
}
