import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { apiRequest } from '../api';

export default function Faculty() {
  const [searchTerm, setSearchTerm] = useState('');
  const [faculty, setFaculty] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/api/faculty').then((data) => setFaculty(data.faculty || [])).catch((err) => setError(err.message)); }, []);
  const filtered = useMemo(() => faculty.filter((member) => `${member.full_name} ${member.email} ${member.department}`.toLowerCase().includes(searchTerm.toLowerCase())), [faculty, searchTerm]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Faculty Management</h1><p className="text-slate-500 mt-1">Faculty accounts available for invigilation assignments.</p></div>
    {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100"><div className="relative w-full sm:w-96"><Search size={18} className="absolute left-3 top-2.5 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email or department..." className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none" /></div></div>
      {!filtered.length ? <div className="p-10 text-center text-slate-500">No faculty accounts found.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Department</th><th className="px-6 py-4">Designation</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((member) => <tr key={member.user_id}><td className="px-6 py-4 text-sm font-medium">{member.full_name}</td><td className="px-6 py-4 text-sm text-slate-500">{member.email}</td><td className="px-6 py-4 text-sm">{member.department}</td><td className="px-6 py-4 text-sm text-slate-500">{member.designation || 'Faculty'}</td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
