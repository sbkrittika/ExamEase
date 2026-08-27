import { useEffect, useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../api';

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ room_number: '', building: '', capacity: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiRequest('/api/data/rooms').then((data) => setRooms(data.rooms || [])).catch((error) => setMessage(error.message));
  }, []);
  const loadRooms = () => apiRequest('/api/data/rooms').then((data) => setRooms(data.rooms || []));
  const saveRoom = async (event) => { event.preventDefault(); try { await apiRequest('/api/data/rooms', { method: 'POST', body: JSON.stringify(form) }); setForm({ room_number: '', building: '', capacity: '' }); setShowForm(false); await loadRooms(); setMessage('Room added successfully.'); } catch (error) { setMessage(error.message); } };
  const removeRoom = async (id) => { if (!window.confirm('Delete this room?')) return; try { await apiRequest(`/api/data/rooms/${id}`, { method: 'DELETE' }); await loadRooms(); } catch (error) { setMessage(error.message); } };

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
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Plus size={18} />Add Room</button>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}
      {showForm && <form onSubmit={saveRoom} className="bg-white rounded-2xl border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-4"><input required placeholder="Room number" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" /><input placeholder="Building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" /><input required min="1" type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" /><button className="md:col-span-3 justify-self-end px-4 py-2 rounded-xl bg-blue-600 text-white">Save Room</button></form>}

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
                  <td className="px-6 py-4 whitespace-nowrap text-right"><button onClick={() => removeRoom(room.room_id)} className="text-red-600" title="Delete room"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
