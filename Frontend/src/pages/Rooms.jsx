import { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { apiRequest } from '../api';

const DEFAULT_FORM = {
  building: 'Main Building',
  roomNumber: '',
  capacity: '40',
  type: 'Classroom',
  status: 'Available'
};

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await apiRequest('/api/rooms');

      setRooms(
        (data.rooms || []).map((room) => ({
          id: room.room_id,
          building: room.building || 'Main Building',
          roomNumber: room.room_number || '',
          capacity: Number(room.capacity) || 0,
          type: room.type || 'Classroom',
          status: room.status || 'Available'
        }))
      );
    } catch (err) {
      setError(err.message || 'Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const filtered = rooms.filter((room) => {
    const q = searchTerm.toLowerCase();

    return `${room.building} ${room.roomNumber} ${room.type}`
      .toLowerCase()
      .includes(q);
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddForm = () => {
    setEditingRoomId(null);
    setForm(DEFAULT_FORM);
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRoomId(null);
    setForm(DEFAULT_FORM);
  };

  const handleEdit = (room) => {
    setEditingRoomId(room.id);

    setForm({
      building:
        room.building === 'Novas'
          ? 'Novas'
          : 'Main Building',
      roomNumber: String(room.roomNumber || ''),
      capacity: String(room.capacity || 40),
      type: room.type || 'Classroom',
      status:
        room.status === 'Maintenance'
          ? 'Maintenance'
          : 'Available'
    });

    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');

    const roomNumber = form.roomNumber.trim();
    const capacity = Number(form.capacity);

    if (!roomNumber) {
      setError('Room number is required.');
      return;
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError('Capacity must be a valid positive number.');
      return;
    }

    const payload = {
      room_number: roomNumber,
      building: form.building,
      capacity,
      status:
        form.status === 'Available'
          ? 'Available'
          : 'Maintenance'
    };

    try {
      setLoading(true);

      if (editingRoomId) {
        await apiRequest(`/api/rooms/${editingRoomId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/api/rooms', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      await loadRooms();

      closeForm();
    } catch (err) {
      setError(
        err.message ||
          (editingRoomId
            ? 'Failed to update room.'
            : 'Failed to add room.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (room) => {
    const confirmed = window.confirm(
      `Delete room ${room.roomNumber} from ${room.building}?`
    );

    if (!confirmed) return;

    try {
      setError('');

      await apiRequest(`/api/rooms/${room.id}`, {
        method: 'DELETE'
      });

      setRooms((prev) =>
        prev.filter((item) => item.id !== room.id)
      );

      if (editingRoomId === room.id) {
        closeForm();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete room.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Room Management
          </h1>

          <p className="text-slate-500 mt-1">
            Add and manage real exam rooms.
          </p>
        </div>

        <button
          type="button"
          onClick={showForm ? closeForm : openAddForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}

          <span>
            {showForm
              ? 'Close'
              : 'Add Room'}
          </span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              {editingRoomId
                ? 'Edit Room'
                : 'Add Room'}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Building
              </label>

              <select
                name="building"
                value={form.building}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Main Building">
                  Main Building
                </option>

                <option value="Novas">
                  Novas
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Room Number
              </label>

              <input
                name="roomNumber"
                value={form.roomNumber}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Capacity
              </label>

              <input
                name="capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Classroom">
                  Classroom
                </option>

                <option value="Lecture Hall">
                  Lecture Hall
                </option>

                <option value="Computer Lab">
                  Computer Lab
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Available">
                  Available
                </option>

                <option value="Maintenance">
                  Maintenance
                </option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-5 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? 'Saving...'
                  : editingRoomId
                  ? 'Update Room'
                  : 'Save Room'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search
                size={18}
                className="text-slate-400"
              />
            </div>

            <input
              type="text"
              placeholder="Search room number or building..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        {loading && rooms.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Loading rooms...
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No rooms added yet. Use the room form to create exam rooms.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No rooms match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">
                    Building
                  </th>

                  <th className="px-6 py-4">
                    Room Number
                  </th>

                  <th className="px-6 py-4">
                    Capacity
                  </th>

                  <th className="px-6 py-4">
                    Type
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map((room) => (
                  <tr
                    key={room.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {room.building}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {room.roomNumber}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {room.capacity} students
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {room.type}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                          room.status === 'Available'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(room)
                          }
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(room)
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
