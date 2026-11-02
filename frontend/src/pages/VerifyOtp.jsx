import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/auth/resend-otp", { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend OTP");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white border border-ink/10 rounded-card p-8">
        <div className="mb-6">
          <span className="inline-block w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center font-display font-semibold mb-4">RE</span>
          <h1 className="font-display font-semibold text-xl text-ink">Verify your email</h1>
          <p className="text-sm text-ink/50 mt-1">Enter the 6-digit OTP sent to your email.</p>
        </div>

        {error && <p className="text-sm text-tag-800 bg-tag-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {message && <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2 mb-4">{message}</p>}

        <form onSubmit={verify} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit OTP"
            className="w-full border border-ink/15 rounded-lg px-3 py-2.5 text-sm tracking-[0.3em] focus:outline-none focus:border-brand-400"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <button disabled={loading} type="submit" className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <button onClick={resend} className="w-full mt-3 border border-ink/15 rounded-lg py-2.5 text-sm font-medium hover:bg-paper">
          Resend OTP
        </button>

        <p className="text-sm text-center mt-5 text-ink/60">
          <Link to="/login" className="text-brand-700 font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;
