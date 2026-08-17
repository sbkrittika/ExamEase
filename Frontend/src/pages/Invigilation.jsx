import { useState } from 'react';
import { UserCheck, Search, ShieldAlert } from 'lucide-react';

export default function Invigilation() {
  const [searchTerm, setSearchTerm] = useState('');

  const assignments = [
    { id: 1, faculty: 'Dr. Alan Turing', course: 'CSE 311', room: '101', date: 'Oct 24, 2026', time: '10:00 AM', status: 'Confirmed' },
    { id: 2, faculty: 'Dr. Ada Lovelace', course: 'CSE 311', room: '102', date: 'Oct 24, 2026', time: '10:00 AM', status: 'Confirmed' },
    { id: 3, faculty: 'Dr. Isaac Newton', course: 'MTH 201', room: '205', date: 'Oct 25, 2026', time: '02:00 PM', status: 'Pending Conflict' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invigilation Duties</h1>
          <p className="text-slate-500 mt-1">Assign and manage faculty invigilation schedules.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2">
          <UserCheck size={18} />
          <span>Auto Assign</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by faculty name or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-blue-500">
              <option>Filter by Date</option>
              <option>Oct 24, 2026</option>
              <option>Oct 25, 2026</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Faculty Name</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Room</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{assignment.faculty}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{assignment.course}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">Room {assignment.room}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {assignment.date} at {assignment.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {assignment.status === 'Confirmed' ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {assignment.status}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100 flex items-center space-x-1 w-fit">
                        <ShieldAlert size={12} />
                        <span>{assignment.status}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-700">Reassign</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
