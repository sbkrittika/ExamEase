import { useEffect, useState } from 'react';
import { Calendar, MapPin, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ user: null, schedule: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest('/api/me').then(setData).catch((err) => setError(err.message));
  }, []);
  const logout = () => { localStorage.clear(); navigate('/login', { replace: true }); };
  return <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center"><div><p className="text-sm text-blue-600 font-medium">ExamEase Student Portal</p><h1 className="text-2xl font-bold text-slate-900">My examination schedule</h1><p className="text-slate-500">{data.user?.full_name || 'Student'}</p></div><button onClick={logout} className="flex gap-2 items-center text-slate-600 hover:text-red-600"><LogOut size={17} /> Sign out</button></header>
      {error && <div className="rounded-xl bg-red-50 text-red-700 p-4">{error}</div>}
      {!error && !data.schedule.length && <div className="bg-white rounded-2xl p-10 text-center text-slate-500">No examination seat has been assigned yet.</div>}
      <div className="space-y-3">{data.schedule.map((exam) => <article key={`${exam.exam_id}-${exam.seat_no}`} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold text-slate-900">{exam.course_code}</h2><span className="text-sm text-slate-500 flex gap-1 items-center"><Calendar size={15} />{new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString()}</span></div><div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600"><span>{exam.start_time} – {exam.end_time}</span><span className="flex gap-1 items-center"><MapPin size={15} />{exam.building || ''} Room {exam.room_number || exam.room_id}</span><span>Seat {exam.seat_no}</span></div></article>)}</div>
    </div>
  </div>;
}
