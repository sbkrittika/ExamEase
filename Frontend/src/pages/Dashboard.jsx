import { Users, BookOpen, GraduationCap, School, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/api/dashboard').then(setData).catch((err) => setError(err.message)); }, []);
  const counts = data?.stats || {};

  const stats = [
    { title: 'Total Students', value: counts.students ?? '—', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', trend: 'Live' },
    { title: 'Active Courses', value: counts.courses ?? '—', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: 'Live' },
    { title: 'Faculty Members', value: counts.faculty ?? '—', icon: GraduationCap, color: 'text-violet-600', bg: 'bg-violet-100', trend: 'Live' },
    { title: 'Exam Rooms', value: counts.rooms ?? '—', icon: School, color: 'text-amber-600', bg: 'bg-amber-100', trend: 'Live' },
  ];

  const upcomingExams = (data?.upcoming || []).map((exam) => ({
    course: exam.course_code || 'Exam', date: exam.exam_date, time: exam.start_time, rooms: '—', students: exam.students
  }));

  const handleGenerateSeatPlan = () => {
    navigate('/admin/seat-plan');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, here's the current exam status.</p>
        </div>

        <button
          onClick={handleGenerateSeatPlan}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20"
        >
          Generate New Seat Plan
          <ArrowRight size={17} />
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <Icon size={24} className={stat.color} />
                </div>
                <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
                  <TrendingUp size={14} />
                  <span>{stat.trend}</span>
                </div>
              </div>

              <h3 className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Upcoming Exams</h2>
          <button onClick={() => navigate('/admin/exams')} className="text-sm text-blue-600 font-medium hover:text-blue-700">View All</button>
        </div>

        <div className="divide-y divide-slate-100">
          {upcomingExams.length ? upcomingExams.map((exam, idx) => (
            <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{exam.course}</h3>
                <div className="flex items-center space-x-1 text-sm text-slate-500">
                  <Clock size={16} />
                  <span>{exam.date} at {exam.time}</span>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Rooms</p>
                  <p className="font-semibold text-slate-900">{exam.rooms}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Students</p>
                  <p className="font-semibold text-slate-900">{exam.students}</p>
                </div>
              </div>
            </div>
          )) : <div className="p-8 text-center text-slate-500">No upcoming exams scheduled.</div>}
        </div>
      </div>
    </div>
  );
}
