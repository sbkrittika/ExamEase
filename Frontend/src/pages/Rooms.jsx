import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

const API_URL = 'https://examease-backend-r8s4.onrender.com';

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/data/rooms`)
      .then((response) => response.json())
      .then((data) => setRooms(data.rooms || []))
      .catch(() => setRooms([]));
  }, []);

  const visibleRooms = rooms.filter((room) =>
    `${room.room_number} ${room.building}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Room Management</h1>
          <p className="text-slate-500 mt-1">Manage university buildings, rooms, and their capacities.</p>
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
              {visibleRooms.map((room) => (
                <tr key={room.room_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{room.building}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{room.room_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{room.capacity} students</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Exam room</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                      room.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {room.status}
                    </span>
                  </td>
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
