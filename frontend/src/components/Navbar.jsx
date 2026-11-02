import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-10 bg-paper/95 backdrop-blur border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-display font-semibold text-sm">
            RE
          </span>
          <span className="font-display font-semibold text-lg text-ink">RentEase</span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-ink/70 hover:text-brand-700 transition-colors">
            Browse
          </Link>
          {user?.role === "owner" && (
            <Link to="/owner/listings" className="text-ink/70 hover:text-brand-700 transition-colors">
              My listings
            </Link>
          )}
          {user?.role === "owner" && (
            <Link to="/owner/bookings" className="text-ink/70 hover:text-brand-700 transition-colors">
              Bookings
            </Link>
          )}
          {user?.role === "technician" && (
            <Link to="/technician" className="text-ink/70 hover:text-brand-700 transition-colors">
              My jobs
            </Link>
          )}
          {user?.role === "consumer" && (
            <Link to="/my-bookings" className="text-ink/70 hover:text-brand-700 transition-colors">
              My bookings
            </Link>
          )}
          {user?.role === "admin" && (
            <Link to="/admin" className="text-ink/70 hover:text-brand-700 transition-colors">
              Admin
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-ink/10">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-medium">
                  {user.name?.[0]?.toUpperCase()}
                </span>
                <span className="text-ink/60 text-xs">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-ink/50 hover:text-tag-600 transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 pl-4 border-l border-ink/10">
              <Link to="/login" className="text-ink/70 hover:text-brand-700 transition-colors">
                Log in
              </Link>
              <Link
                to="/register"
                className="bg-brand-600 text-white px-4 py-1.5 rounded-full hover:bg-brand-700 transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
