import {
  Users,
  BookOpen,
  GraduationCap,
  School,
  TrendingUp,
  Clock,
  Bot,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Total Students',
      value: '4,289',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      trend: '+12%'
    },
    {
      title: 'Active Courses',
      value: '156',
      icon: BookOpen,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      trend: '+3%'
    },
    {
      title: 'Faculty Members',
      value: '312',
      icon: GraduationCap,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
      trend: '+5%'
    },
    {
      title: 'Exam Rooms',
      value: '48',
      icon: School,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      trend: '0%'
    }
  ];

  const upcomingExams = [
    {
      course: 'CSE 311: Database Systems',
      date: 'Aug 20, 2026',
      time: '10:00 AM',
      rooms: 4,
      students: 120
    },
    {
      course: 'CSE 312: Web Development',
      date: 'Aug 21, 2026',
      time: '02:00 PM',
      rooms: 6,
      students: 180
    },
    {
      course: 'MTH 205: Mathematics',
      date: 'Aug 22, 2026',
      time: '10:00 AM',
      rooms: 8,
      students: 250
    }
  ];

  const handleGenerateSeatPlan = () => {
    navigate('/admin/seat-plan');
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Overview
          </h1>

          <p className="text-slate-500 mt-1">
            Welcome back, here's what's happening today.
          </p>
        </div>

        <button
          onClick={handleGenerateSeatPlan}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20"
        >
          Generate New Seat Plan
          <ArrowRight size={17} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >

              <div className="flex items-center justify-between mb-4">

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}
                >
                  <Icon size={24} className={stat.color} />
                </div>

                <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
                  <TrendingUp size={14} />
                  <span>{stat.trend}</span>
                </div>

              </div>

              <h3 className="text-3xl font-bold text-slate-900 mb-1">
                {stat.value}
              </h3>

              <p className="text-sm text-slate-500 font-medium">
                {stat.title}
              </p>

            </div>
          );
        })}

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Exams */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 col-span-1 lg:col-span-2 overflow-hidden">

          <div className="p-6 border-b border-slate-100 flex items-center justify-between">

            <h2 className="text-lg font-bold text-slate-900">
              Upcoming Exams
            </h2>

            <button
              onClick={() => navigate('/admin/exams')}
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              View All
            </button>

          </div>

          <div className="divide-y divide-slate-100">

            {upcomingExams.map((exam, idx) => (

              <div
                key={idx}
                className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >

                <div>

                  <h3 className="font-semibold text-slate-900 mb-1">
                    {exam.course}
                  </h3>

                  <div className="flex items-center space-x-1 text-sm text-slate-500">
                    <Clock size={16} />
                    <span>
                      {exam.date} at {exam.time}
                    </span>
                  </div>

                </div>

                <div className="flex items-center space-x-6">

                  <div className="text-center">
                    <p className="text-sm text-slate-500">
                      Rooms
                    </p>
                    <p className="font-semibold text-slate-900">
                      {exam.rooms}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-slate-500">
                      Students
                    </p>
                    <p className="font-semibold text-slate-900">
                      {exam.students}
                    </p>
                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-md p-6 text-white relative overflow-hidden">

          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

          <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <Bot size={24} className="text-blue-200" />
            <span>AI Insights</span>
          </h2>

          <div className="space-y-4 relative z-10">

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">

              <h3 className="font-semibold mb-1 text-blue-50">
                Conflict Detected
              </h3>

              <p className="text-sm text-blue-200">
                Dr. Smith is assigned to two rooms at 10:00 AM.
                AI suggests reassigning Dr. Taylor.
              </p>

              <button
                onClick={() => navigate('/admin/invigilation')}
                className="mt-3 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Resolve Now
              </button>

            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">

              <h3 className="font-semibold mb-1 text-blue-50">
                Room Optimization
              </h3>

              <p className="text-sm text-blue-200">
                Building A rooms are underutilized for CSE 312.
                Consolidating rooms can save 2 invigilators.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}