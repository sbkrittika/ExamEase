import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bot,
    Mail,
    Lock,
    ArrowRight,
    UserPlus
} from "lucide-react";

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(
                    data.message ||
                        "Invalid email or password."
                );
                return;
            }

         
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            sessionStorage.setItem(
                "token",
                data.token
            );

            if (data.user) {
                sessionStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );
            }

            sessionStorage.setItem(
                "examease_session",
                "active"
            );

            navigate("/admin", {
                replace: true
            });
        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            alert(
                "Cannot connect to server. Make sure backend is running on port 5000."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-dark rounded-3xl p-8 sm:p-12 w-full animate-fade-in-up">

            {/* Logo */}
            <div className="flex flex-col items-center mb-10">

                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                    <Bot
                        size={32}
                        className="text-white"
                    />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    Welcome to ExamEase
                </h1>

                <p className="text-slate-400 text-center">
                    AI-Powered University Exam Management System
                </p>

            </div>


            {/* Login Form */}
            <form
                onSubmit={handleLogin}
                className="space-y-6"
            >

                {/* Email */}
                <div>

                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        University Email
                    </label>

                    <div className="relative">

                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail
                                size={20}
                                className="text-slate-500"
                            />
                        </div>

                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="student@eastdelta.edu.bd"
                        />

                    </div>

                </div>


                {/* Password */}
                <div>

                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Password
                    </label>

                    <div className="relative">

                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock
                                size={20}
                                className="text-slate-500"
                            />
                        </div>

                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                            className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="••••••••"
                        />

                    </div>

                </div>


                {/* Remember */}
                <div className="flex items-center justify-between text-sm">

                    <label className="flex items-center space-x-2 cursor-pointer">

                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-800/50"
                        />

                        <span className="text-slate-400">
                            Remember me
                        </span>

                    </label>

                    <button
                        type="button"
                        onClick={() =>
                            alert(
                                "Please contact the administrator to reset your password."
                            )
                        }
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Forgot password?
                    </button>

                </div>


                {/* Sign In */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 group"
                >

                    <span>
                        {loading
                            ? "Signing In..."
                            : "Sign In"}
                    </span>

                    {!loading && (
                        <ArrowRight
                            size={20}
                            className="group-hover:translate-x-1 transition-transform"
                        />
                    )}

                </button>

            </form>


            {/* Create Account */}
            <div className="mt-8 pt-6 border-t border-slate-700 text-center">

                <p className="text-slate-400 text-sm mb-3">
                    Don't have an account?
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate("/register")
                    }
                    className="w-full flex items-center justify-center gap-2 border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 py-3 px-4 rounded-xl font-medium transition-all duration-200"
                >
                    <UserPlus size={19} />
                    Create University Account
                </button>

            </div>

        </div>
    );
}