import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Courses from './pages/Courses';
import Faculty from './pages/Faculty';
import Rooms from './pages/Rooms';
import Exams from './pages/Exams';
import SeatPlan from './pages/SeatPlan';
import Invigilation from './pages/Invigilation';
import AIAssistant from './pages/AIAssistant';


function ProtectedRoute({ children }) {

  const token = sessionStorage.getItem('token');
  const session = sessionStorage.getItem('examease_session');

  if (!token || session !== 'active') {
    sessionStorage.clear();

    return <Navigate to="/login" replace />;
  }

  return children;
}


function App() {

  return (
    <Router>

      <Routes>

        {/* LOGIN */}

        <Route element={<AuthLayout />}>

          <Route
            path="/login"
            element={<Login />}
          />

        </Route>


        {/* PROTECTED ADMIN AREA */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >

          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="students"
            element={<Students />}
          />

          <Route
            path="courses"
            element={<Courses />}
          />

          <Route
            path="faculty"
            element={<Faculty />}
          />

          <Route
            path="rooms"
            element={<Rooms />}
          />

          <Route
            path="exams"
            element={<Exams />}
          />

          <Route
            path="seat-plan"
            element={<SeatPlan />}
          />

          <Route
            path="invigilation"
            element={<Invigilation />}
          />

          <Route
            path="ai-assistant"
            element={<AIAssistant />}
          />

        </Route>


        {/* HOME */}

        <Route
          path="/"
          element={
            <Navigate
              to="/admin"
              replace
            />
          }
        />


        {/* UNKNOWN URL */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>

    </Router>
  );
}

export default App;