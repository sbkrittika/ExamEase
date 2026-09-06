import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { apiRequest } from '../api';

const emptyForm = { full_name: '', email: '', password: '', department: '', designation: '', phone: '' };

export default function Faculty() {
  const [faculty, setFaculty] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const load = () => apiRequest('/api/faculty').then((data) => setFaculty(data.faculty || [])).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  const reset = () => { setForm(emptyForm); setEditing(null); setShowForm(false); };
  const submit = async (event) => {
    event.preventDefault();
    try {
      await apiRequest(editing ? `/api/faculty/${editing.user_id}` : '/api/faculty', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form)
      });
      reset();
      load();
    } catch (err) { setError(err.message); }
  };
  const edit = (member) => {
    setEditing(member);
    setForm({ full_name: member.full_name || '', email: member.email || '', password: '', department: member.department || '', designation: member.designation || '', phone: member.phone || '' });
    setShowForm(true);
  };
  const remove = async (member) => {
    if (!window.confirm(`Delete ${member.full_name}?`)) return;
    try { await apiRequest(`/api/faculty/${member.user_id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  };
  const filtered = useMemo(() => faculty.filter((member) => `${member.full_name} ${member.email} ${member.department}`.toLowerCase().includes(searchTerm.toLowerCase())), [faculty, searchTerm]);
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Faculty Management</h1><p className="text-slate-500 mt-1">Faculty accounts available for invigilation assignments.</p></div>
      <button type="button" onClick={() => (showForm ? reset() : setShowForm(true))} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><Plus size={18} />{showForm ? 'Close' : 'Add Faculty'}</button>
    </div>
    {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>}
    {showForm && <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 flex justify-between items-center"><h2 className="font-semibold">{editing ? 'Edit Faculty' : 'Add Faculty'}</h2><button type="button" onClick={reset}><X size={18} /></button></div>
      {[['full_name', 'Full name'], ['email', 'University email'], ['password', editing ? 'New password (optional)' : 'Password'], ['department', 'Department'], ['designation', 'Designation'], ['phone', 'Phone']].map(([name, label]) => <label key={name} className="text-sm font-medium text-slate-700">{label}<input required={['full_name', 'email', 'department'].includes(name) || (name === 'password' && !editing)} type={name === 'password' ? 'password' : 'text'} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 font-normal" /></label>)}
      <div className="md:col-span-2 flex justify-end"><button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl">Save Faculty</button></div>
    </form>}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b"><div className="relative w-full sm:w-96"><Search size={18} className="absolute left-3 top-2.5 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email or department..." className="w-full pl-10 pr-3 py-2 border rounded-xl text-sm" /></div></div>
      {!filtered.length ? <div className="p-10 text-center text-slate-500">No faculty accounts found.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Department</th><th className="px-6 py-4">Designation</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y">{filtered.map((member) => <tr key={member.user_id}><td className="px-6 py-4 text-sm font-medium">{member.full_name}</td><td className="px-6 py-4 text-sm text-slate-500">{member.email}</td><td className="px-6 py-4 text-sm">{member.department}</td><td className="px-6 py-4 text-sm text-slate-500">{member.designation || 'Faculty'}</td><td className="px-6 py-4 flex gap-3"><button type="button" onClick={() => edit(member)} title="Edit"><Edit2 size={16} /></button><button type="button" onClick={() => remove(member)} title="Delete"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
