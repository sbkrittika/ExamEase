import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

const API_URL = 'https://examease-backend-r8s4.onrender.com';

export default function Faculty() {
  const [searchTerm, setSearchTerm] = useState('');
  const [faculty, setFaculty] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/data/faculty`)
      .then((response) => response.json())
      .then((data) => setFaculty(data.faculty || []))
      .catch(() => setFaculty([]));
  }, []);

  const visibleFaculty = faculty.filter((member) =>
    `${member.full_name} ${member.email} ${member.department}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Management</h1>
          <p className="text-slate-500 mt-1">Manage university faculty members and assign duties.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Faculty ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleFaculty.map((member) => (
                <tr key={member.user_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{member.user_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{member.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{member.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {member.department}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.designation || 'Faculty'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-400">Managed from university records</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
