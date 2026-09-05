import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { apiRequest } from '../api';

export default function Courses() {
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ code: '', title: '', credit: '3', department: 'CSE', semester: '1', section: '1' });

  useEffect(() => {
    const loadCourses = () => apiRequest('/api/courses').then((data) => setCourses((data.courses || []).map((course) => ({
      code: course.course_code, title: course.course_title, credit: course.credit || 3, department: course.department, semester: course.semester, section: course.section
    })))).catch((error) => setStatus(error.message));
    loadCourses();
    window.addEventListener('examease:data-imported', loadCourses);
    return () => window.removeEventListener('examease:data-imported', loadCourses);
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return courses.filter((course) => `${course.code} ${course.title} ${course.department}`.toLowerCase().includes(q));
  }, [searchTerm, courses]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleEdit = (course) => {
    setForm({ code: course.code, title: course.title, credit: String(course.credit || 3), department: course.department, semester: String(course.semester || 1), section: String(course.section || 1) });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.code || !form.title) {
      alert('Course code and title are required.');
      return;
    }

    const newCourse = {
      code: form.code.trim(),
      title: form.title.trim(),
      credit: Number(form.credit) || 3,
      department: form.department,
      semester: Number(form.semester),
      section: form.section,
    };

    try {
      await apiRequest('/api/courses', { method: 'POST', body: JSON.stringify({
        course_code: newCourse.code, section: newCourse.section, course_title: newCourse.title, semester: newCourse.semester, department: newCourse.department
      }) });
    } catch (error) { setStatus(error.message); return; }
    setCourses((prev) => {
      const index = prev.findIndex((item) => item.code === newCourse.code);
      if (index >= 0) {
        const next = [...prev];
        next[index] = newCourse;
        return next;
      }
      return [newCourse, ...prev];
    });

    setForm({ code: '', title: '', credit: '3', department: 'CSE', semester: '1', section: '1' });
    setShowForm(false);
    setStatus('Course added successfully.');
  };

  const handleImportZip = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus('');

    try {
      const payload = new FormData();
      payload.append('file', file);
      const result = await apiRequest('/api/exams/upload-zip', { method: 'POST', body: payload });
      const imported = [...new Set((result.students || []).map((student) => student.course_code).filter(Boolean))]
        .map((code) => ({ code, title: code, credit: 3, department: 'General' }));
      setCourses(imported);
      setStatus(`Imported ${imported.length} courses from ${file.name}.`);
    } catch (error) {
      alert(error.message || 'Unable to import the ZIP.');
      setStatus('');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Courses Management</h1>
          <p className="text-slate-500 mt-1">Import courses from the ZIP file or add them manually.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-emerald-600/20 flex items-center space-x-2"><Upload size={18} /><span>{uploading ? 'Importing...' : 'Import ZIP'}</span></button>
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImportZip} />
          <button type="button" onClick={() => setShowForm((prev) => !prev)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2"><Plus size={18} /><span>{showForm ? 'Close' : 'Add Course'}</span></button>
        </div>
      </div>

      {status && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div>}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-slate-900">Add Course</h2><button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={18} /></button></div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Course Code</label><input name="code" value={form.code} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="CSE 311" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Course Title</label><input name="title" value={form.title} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Database Systems" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Credit</label><select name="credit" value={form.credit} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Department</label><select name="department" value={form.department} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="CSE">CSE</option><option value="EEE">EEE</option><option value="BBA">BBA</option><option value="Physics">Physics</option><option value="Mathematics">Mathematics</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Semester</label><select name="semester" value={form.semester} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">{Array.from({ length: 12 }, (_, index) => index + 1).map((semester) => <option key={semester} value={semester}>{semester}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Section</label><select name="section" value={form.section} onChange={handleChange} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">{Array.from({ length: 7 }, (_, index) => index + 1).map((section) => <option key={section} value={section}>{section}</option>)}</select></div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button><button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Save Course</button></div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-slate-400" /></div><input type="text" placeholder="Search by course code or title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" /></div>
        </div>

        {courses.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No courses loaded yet. Upload the ZIP file or add a course manually.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="px-6 py-4">Course Code</th><th className="px-6 py-4">Course Title</th><th className="px-6 py-4">Semester</th><th className="px-6 py-4">Section</th><th className="px-6 py-4">Credit</th><th className="px-6 py-4">Department</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((course) => (
                  <tr key={`${course.code}-${course.section}`} className="hover:bg-slate-50 transition-colors group"><td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{course.code}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{course.title}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{course.semester}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{course.section}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{course.credit}.0</td><td className="px-6 py-4 whitespace-nowrap"><span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{course.department}</span></td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex items-center justify-end space-x-2"><button type="button" onClick={() => handleEdit(course)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button><button type="button" onClick={async () => { try { await apiRequest(`/api/courses/${encodeURIComponent(course.code)}/${encodeURIComponent(course.section)}`, { method: 'DELETE' }); setCourses((prev) => prev.filter((item) => !(item.code === course.code && item.section === course.section))); } catch (error) { setStatus(error.message); } }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
