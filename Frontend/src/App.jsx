import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import Faculty from "./pages/Faculty";
import Rooms from "./pages/Rooms";
import Exams from "./pages/Exams";
import SeatPlan from "./pages/SeatPlan";
import Invigilation from "./pages/Invigilation";
import StudentDashboard from "./pages/StudentDashboard";
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RoleRoute({ role, children }) {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    localStorage.removeItem("user");
  }
  if (!user || user.role !== role) {
    return <Navigate to={role === "student" ? "/admin" : "/student"} replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>

        {/* LOGIN / REGISTER */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <RoleRoute role="student">
                <StudentDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* ADMIN AREA */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute role="faculty">
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />

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

        </Route>

        {/* HOME */}
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* ANY UNKNOWN URL */}
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