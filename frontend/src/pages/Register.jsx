import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleOptions = [
  { value: "consumer", label: "Consumer — I want to rent appliances" },
  { value: "owner", label: "Owner — I want to list appliances" },
  { value: "technician", label: "Technician — I do delivery/installation" },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consumer" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      setSuccess("Registration successful. Check your email for the OTP.");
      setTimeout(() => navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`), 700);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white border border-ink/10 rounded-card p-8">
        <div className="mb-6">
          <span className="inline-block w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center font-display font-semibold mb-4">
            RE
          </span>
          <h1 className="font-display font-semibold text-xl text-ink">Create your account</h1>
        </div>

        {error && (
          <p className="text-sm text-tag-800 bg-tag-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}
        {success && (
          <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2 mb-4">{success}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Full name"
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 bg-white"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Register
          </button>
        </form>

        <p className="text-sm text-center mt-5 text-ink/60">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-700 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
