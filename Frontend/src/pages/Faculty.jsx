import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../api';

export default function Faculty() {
  const [searchTerm, setSearchTerm] = useState('');
  const [faculty, setFaculty] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', department: '', designation: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiRequest('/api/data/faculty').then((data) => setFaculty(data.faculty || [])).catch((error) => setMessage(error.message));
  }, []);
  const loadFaculty = () => apiRequest('/api/data/faculty').then((data) => setFaculty(data.faculty || []));
  const saveFaculty = async (event) => { event.preventDefault(); try { await apiRequest('/api/data/faculty', { method: 'POST', body: JSON.stringify(form) }); setForm({ full_name: '', email: '', password: '', department: '', designation: '' }); setShowForm(false); await loadFaculty(); setMessage('Faculty added successfully.'); } catch (error) { setMessage(error.message); } };
  const removeFaculty = async (id) => { if (!window.confirm('Delete this faculty member?')) return; try { await apiRequest(`/api/data/faculty/${id}`, { method: 'DELETE' }); await loadFaculty(); } catch (error) { setMessage(error.message); } };

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
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Plus size={18} />Add Faculty</button>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}
      {showForm && <form onSubmit={saveFaculty} className="bg-white rounded-2xl border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-5 gap-4">{[['full_name','Full name'],['email','University email'],['password','Temporary password'],['department','Department'],['designation','Designation']].map(([key, label]) => <input key={key} required={key !== 'designation'} type={key === 'email' ? 'email' : key === 'password' ? 'password' : 'text'} placeholder={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />)}<button className="md:col-span-5 justify-self-end px-4 py-2 rounded-xl bg-blue-600 text-white">Save Faculty</button></form>}

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
                  <td className="px-6 py-4 whitespace-nowrap text-right"><button onClick={() => removeFaculty(member.user_id)} className="text-red-600" title="Delete faculty"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
