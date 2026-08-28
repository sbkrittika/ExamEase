import { useEffect, useMemo, useState } from 'react';
import { Search, UserCheck } from 'lucide-react';
import { apiRequest } from '../api';

export default function Invigilation() {
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/api/invigilation').then((data) => setAssignments(data.assignments || [])).catch((err) => setError(err.message)); }, []);
  const filtered = useMemo(() => assignments.filter((item) => `${item.faculty_name} ${item.room_number} ${item.exam_id}`.toLowerCase().includes(searchTerm.toLowerCase())), [assignments, searchTerm]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Invigilation Duties</h1><p className="text-slate-500 mt-1">Assignments loaded from the examination schedule.</p></div>
    {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>}
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"><div className="p-4 border-b"><div className="relative w-full sm:w-96"><Search size={17} className="absolute left-3 top-2.5 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search faculty, room or exam..." className="w-full pl-10 border rounded-xl py-2 text-sm" /></div></div>{!filtered.length ? <div className="p-10 text-center text-slate-500"><UserCheck className="mx-auto mb-2 text-slate-300" />No invigilation assignments found.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-5 py-3">Faculty</th><th className="px-5 py-3">Exam</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y">{filtered.map((item) => <tr key={item.assignment_id}><td className="px-5 py-3 text-sm font-medium">{item.faculty_name}</td><td className="px-5 py-3 text-sm">{item.exam_id}</td><td className="px-5 py-3 text-sm">{item.building} {item.room_number}</td><td className="px-5 py-3 text-sm">{item.exam_date} {item.start_time}</td></tr>)}</tbody></table></div>}</div>
  </div>;
}
