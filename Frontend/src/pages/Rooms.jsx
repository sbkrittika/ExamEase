import { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState('');

  const rooms = [
    { id: '1', building: 'Building A', roomNumber: '101', capacity: 40, type: 'Classroom', status: 'Available' },
    { id: '2', building: 'Building A', roomNumber: '102', capacity: 40, type: 'Classroom', status: 'Available' },
    { id: '3', building: 'Building B', roomNumber: '205', capacity: 120, type: 'Lecture Hall', status: 'Available' },
    { id: '4', building: 'Building C', roomNumber: 'Lab 1', capacity: 30, type: 'Computer Lab', status: 'Maintenance' },
    { id: '5', building: 'Building C', roomNumber: 'Lab 2', capacity: 30, type: 'Computer Lab', status: 'Available' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Room Management</h1>
          <p className="text-slate-500 mt-1">Manage university buildings, rooms, and their capacities.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2">
          <Plus size={18} />
          <span>Add Room</span>
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
              placeholder="Search by room number or building..."
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
                <th className="px-6 py-4">Building</th>
                <th className="px-6 py-4">Room Number</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{room.building}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{room.roomNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{room.capacity} students</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{room.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                      room.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {room.status}
                    </span>
                  </td>
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
      </div>
    </div>
  );
}
