
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    UserPlus,
    User,
    Mail,
    Lock,
    Phone,
    Building2,
    ArrowLeft
} from "lucide-react";

const API_URL = "https://examease-backend-r8s4.onrender.com";

export default function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirm_password: "",
        role: "",
        department: "",
        designation: "",
        phone: ""
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        const email = formData.email.trim().toLowerCase();

        if (!email.endsWith("@eastdelta.edu.bd")) {
            alert("Please use your East Delta University email.");
            return;
        }

        if (
            formData.role === "student" &&
            !/^\d{9}@eastdelta\.edu\.bd$/i.test(email)
        ) {
            alert(
                "Student email must contain exactly 9 digits before @eastdelta.edu.bd."
            );
            return;
        }

        if (
            formData.role === "faculty" &&
            !/^[a-z]+(?:[._-][a-z]+)+@eastdelta\.edu\.bd$/i.test(email)
        ) {
            alert(
                "Please enter a valid faculty email. Example: jahidul.h@eastdelta.edu.bd"
            );
            return;
        }

        if (formData.password !== formData.confirm_password) {
            alert("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        if (!formData.role) {
            alert("Please select your account type.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    full_name: formData.full_name.trim(),
                    email,
                    password: formData.password,
                    confirm_password: formData.confirm_password,
                    role: formData.role,
                    department: formData.department.trim(),
                    designation: formData.designation.trim(),
                    phone: formData.phone.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(
                    data.message ||
                    data.error ||
                    "Registration failed."
                );
                return;
            }

            alert(
                "Account created successfully! You can now sign in."
            );

            navigate("/login", {
                replace: true
            });
        } catch (error) {
            console.error("Registration error:", error);

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
                    <UserPlus
                        size={28}
                        className="text-white"
                    />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">
                    Create Account
                </h1>

                <p className="text-slate-400 text-center text-sm">
                    Use your East Delta University email
                </p>
            </div>

            <form
                onSubmit={handleRegister}
                className="space-y-4"
            >

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Full Name
                    </label>

                    <div className="relative">
                        <User
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                            type="text"
                            name="full_name"
                            required
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

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
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="242010712@eastdelta.edu.bd"
                            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Account Type
                    </label>

                    <select
                        name="role"
                        required
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">
                            Select account type
                        </option>

                        <option value="student">
                            Student
                        </option>

                        <option value="faculty">
                            Faculty
                        </option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Department
                    </label>

                    <div className="relative">
                        <Building2
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                            type="text"
                            name="department"
                            required
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="e.g. CSE"
                            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Designation
                        <span className="text-slate-500">
                            {" "} (Optional)
                        </span>
                    </label>

                    <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        placeholder="e.g. Lecturer / Student"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Phone
                        <span className="text-slate-500">
                            {" "} (Optional)
                        </span>
                    </label>

                    <div className="relative">
                        <Phone
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="01XXXXXXXXX"
                            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

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
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Minimum 6 characters"
                            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Confirm Password
                    </label>

                    <div className="relative">
                        <Lock
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                            type="password"
                            name="confirm_password"
                            required
                            value={formData.confirm_password}
                            onChange={handleChange}
                            placeholder="Enter password again"
                            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 mt-6"
                >
                    {loading
                        ? "Creating Account..."
                        : "Create Account"}
                </button>

            </form>

            <div className="mt-6 text-center">
                <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                >
                    <ArrowLeft size={17} />
                    Back to Sign In
                </button>
            </div>

        </div>
    );
}