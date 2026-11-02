import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      const response = err.response?.data;
      setError(response?.message || "Login failed");
      if (response?.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(form.email);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-ink/10 rounded-card p-8">
        <div className="mb-6">
          <span className="inline-block w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center font-display font-semibold mb-4">
            RE
          </span>
          <h1 className="font-display font-semibold text-xl text-ink">Log in to RentEase</h1>
          <p className="text-sm text-ink/50 mt-1">Rent what you need, list what you don't.</p>
        </div>

        {error && (
          <p className="text-sm text-tag-800 bg-tag-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}
        {unverifiedEmail && (
          <Link to={`/verify-otp?email=${encodeURIComponent(unverifiedEmail)}`} className="block text-sm text-center text-brand-700 font-medium mb-4">Verify email with OTP</Link>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
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
            placeholder="Password"
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button
            type="submit"
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Log in
          </button>
        </form>

        <p className="text-sm text-center mt-5 text-ink/60">
          No account?{" "}
          <Link to="/register" className="text-brand-700 font-medium">
            Register
          </Link>
        </p>
        
      </div>
    </div>
  );
};

export default Login;
