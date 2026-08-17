import { useState } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');

  const students = [
    { id: '2023001', name: 'Alice Johnson', email: 'alice.j@university.edu', department: 'CSE', year: '3rd' },
    { id: '2023002', name: 'Bob Smith', email: 'bob.s@university.edu', department: 'EEE', year: '2nd' },
    { id: '2023003', name: 'Charlie Brown', email: 'charlie.b@university.edu', department: 'CSE', year: '4th' },
    { id: '2023004', name: 'Diana Prince', email: 'diana.p@university.edu', department: 'BBA', year: '1st' },
    { id: '2023005', name: 'Evan Wright', email: 'evan.w@university.edu', department: 'CSE', year: '3rd' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students Management</h1>
          <p className="text-slate-500 mt-1">Manage university students and their details.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2">
          <Plus size={18} />
          <span>Add Student</span>
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
              placeholder="Search by name, ID or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Departments</option>
              <option>CSE</option>
              <option>EEE</option>
              <option>BBA</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Year</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{student.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {student.department}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{student.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>Showing 1 to 5 of 4,289 entries</span>
          <div className="flex items-center space-x-1">
            <button className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg bg-blue-50 text-blue-600 border-blue-200 font-medium">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">2</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">3</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
