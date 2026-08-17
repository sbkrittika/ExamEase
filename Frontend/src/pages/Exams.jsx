import { useState } from 'react';
import { Plus, Calendar, Clock, Edit2, Trash2 } from 'lucide-react';

export default function Exams() {
  const exams = [
    { id: 1, course: 'CSE 311: Database Systems', date: '2026-10-24', time: '10:00 AM', duration: '2 Hours', status: 'Scheduled' },
    { id: 2, course: 'MTH 201: Linear Algebra', date: '2026-10-25', time: '02:00 PM', duration: '3 Hours', status: 'Scheduled' },
    { id: 3, course: 'PHY 101: Mechanics', date: '2026-10-26', time: '10:00 AM', duration: '2 Hours', status: 'Draft' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Scheduling</h1>
          <p className="text-slate-500 mt-1">Create and manage upcoming examinations.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2">
          <Plus size={18} />
          <span>Schedule Exam</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Upcoming Exams</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {exams.map((exam) => (
              <div key={exam.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">{exam.course}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{exam.date}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock size={14} className="text-slate-400" />
                      <span>{exam.time} ({exam.duration})</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                    exam.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {exam.status}
                  </span>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Schedule Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit">
          <h2 className="font-semibold text-slate-900 mb-4">Quick Schedule</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Select a course...</option>
                <option>CSE 311: Database Systems</option>
                <option>MTH 201: Linear Algebra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                <input type="time" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option>2 Hours</option>
                  <option>3 Hours</option>
                </select>
              </div>
            </div>
            <button type="button" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors mt-2">
              Save Draft
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
