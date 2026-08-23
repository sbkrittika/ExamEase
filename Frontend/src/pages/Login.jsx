import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock } from "lucide-react";

const API_URL =
  "https://examease-backend-r8s4.onrender.com";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      alert("Please enter your email.");
      return;
    }

    if (!password) {
      alert("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
          data.error ||
          "Login failed."
        );
        return;
      }

      if (!data.token) {
        alert("Login failed: No token received.");
        return;
      }

      localStorage.setItem(
        "token",
        data.token
      );

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      alert("Login successful!");

      navigate("/admin", {
        replace: true,
      });

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      alert(
        "Cannot connect to ExamEase server."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-dark rounded-3xl p-8 sm:p-10 w-full animate-fade-in-up">

      <div className="flex flex-col items-center mb-8">

        <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
          <LogIn
            size={28}
            className="text-white"
          />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome Back
        </h1>

        <p className="text-slate-400 text-center text-sm">
          Sign in to ExamEase
        </p>

      </div>

      <form
        onSubmit={handleLogin}
        className="space-y-4"
      >

        {/* EMAIL */}

        <div>

          <label className="block text-sm font-medium text-slate-300 mb-2">
            University Email
          </label>

          <div className="relative">

            <Mail
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="242010712@eastdelta.edu.bd"
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

          </div>

        </div>

        {/* PASSWORD */}

        <div>

          <label className="block text-sm font-medium text-slate-300 mb-2">
            Password
          </label>

          <div className="relative">

            <Lock
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

          </div>

        </div>

        {/* LOGIN BUTTON */}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 mt-6"
        >
          {loading
            ? "Signing In..."
            : "Sign In"}
        </button>

      </form>

      {/* REGISTER */}

      <div className="mt-6 text-center">

        <button
          type="button"
          onClick={() =>
            navigate("/register")
          }
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Don't have an account?
          {" "}
          Create Account
        </button>

      </div>

    </div>
  );
}