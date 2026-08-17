import { useState } from 'react';
import {
  Outlet,
  NavLink,
  useNavigate
} from 'react-router-dom';

import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  School,
  FileText,
  Grid,
  UserCheck,
  Bot,
  LogOut,
  Menu,
  X
} from 'lucide-react';


export default function AdminLayout() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();


  /* ================================
     NAVIGATION ITEMS
  ================================= */

  const navItems = [

    {
      name: 'Dashboard',
      path: '/admin',
      icon: LayoutDashboard
    },

    {
      name: 'Students',
      path: '/admin/students',
      icon: Users
    },

    {
      name: 'Courses',
      path: '/admin/courses',
      icon: BookOpen
    },

    {
      name: 'Faculty',
      path: '/admin/faculty',
      icon: GraduationCap
    },

    {
      name: 'Rooms',
      path: '/admin/rooms',
      icon: School
    },

    {
      name: 'Exams',
      path: '/admin/exams',
      icon: FileText
    },

    {
      name: 'Seat Plan',
      path: '/admin/seat-plan',
      icon: Grid
    },

    {
      name: 'Invigilation',
      path: '/admin/invigilation',
      icon: UserCheck
    },

    {
      name: 'AI Assistant',
      path: '/admin/ai-assistant',
      icon: Bot
    }

  ];


  /* ================================
     LOGOUT
  ================================= */

  const handleLogout = () => {
  sessionStorage.clear();

  localStorage.removeItem('token');
  localStorage.removeItem('user');

  navigate('/login', { replace: true });
};


  return (

    <div className="min-h-screen bg-slate-50 flex">


      {/* =========================
          MOBILE OVERLAY
      ========================== */}

      {isSidebarOpen && (

        <div
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />

      )}


      {/* =========================
          SIDEBAR
      ========================== */}

      <aside
        className={`
          fixed lg:static
          inset-y-0 left-0
          z-30
          w-64
          bg-slate-900
          text-white
          transform
          transition-transform
          duration-300
          ease-in-out
          flex flex-col
          ${
            isSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }
        `}
      >


        {/* Logo */}

        <div className="flex items-center justify-between p-6 border-b border-slate-800">

          <div className="flex items-center space-x-3">

            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">

              <Bot
                size={20}
                className="text-white"
              />

            </div>

            <span className="text-xl font-bold tracking-tight">
              ExamEase
            </span>

          </div>


          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >

            <X size={24} />

          </button>

        </div>


        {/* Navigation */}

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">

          {navItems.map((item) => {

            const Icon = item.icon;

            return (

              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/admin'}

                className={({ isActive }) =>
                  `
                  flex items-center
                  space-x-3
                  px-4 py-3
                  rounded-xl
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                  `
                }

                onClick={() =>
                  setIsSidebarOpen(false)
                }
              >

                <Icon size={20} />

                <span className="font-medium">
                  {item.name}
                </span>

              </NavLink>

            );

          })}

        </nav>


        {/* =========================
            LOGOUT
        ========================== */}

        <div className="p-4 border-t border-slate-800">

          <button
            onClick={handleLogout}
            className="
              flex items-center
              space-x-3
              px-4 py-3
              w-full
              rounded-xl
              text-slate-400
              hover:bg-slate-800
              hover:text-white
              transition-all
              duration-200
            "
          >

            <LogOut size={20} />

            <span className="font-medium">
              Logout
            </span>

          </button>

        </div>

      </aside>


      {/* =========================
          MAIN CONTENT
      ========================== */}

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">


        {/* Header */}

        <header
          className="
            bg-white
            border-b
            border-slate-200
            h-16
            flex
            items-center
            justify-between
            px-4
            sm:px-6
            lg:px-8
            z-10
            flex-shrink-0
          "
        >

          <div className="flex items-center">

            <button
              className="
                lg:hidden
                text-slate-500
                hover:text-slate-700
                p-2
                -ml-2
                rounded-lg
              "
              onClick={() =>
                setIsSidebarOpen(true)
              }
            >

              <Menu size={24} />

            </button>

          </div>


          {/* Right Side */}

          <div className="flex items-center space-x-4">

            <div className="hidden sm:flex items-center space-x-2 text-sm">

              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>

              <span className="text-slate-500 font-medium">
                System Online
              </span>

            </div>


            <div
              className="
                w-8 h-8
                rounded-full
                bg-blue-100
                flex items-center
                justify-center
                border
                border-blue-200
              "
            >

              <span className="text-sm font-bold text-blue-700">
                A
              </span>

            </div>

          </div>

        </header>


        {/* Page Content */}

        <div
          className="
            flex-1
            overflow-auto
            bg-slate-50
            p-4
            sm:p-6
            lg:p-8
          "
        >

          <div className="max-w-7xl mx-auto">

            <Outlet />

          </div>

        </div>

      </main>

    </div>

  );
}