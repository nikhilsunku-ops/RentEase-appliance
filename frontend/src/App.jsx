import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Browse from "./pages/Browse";
import ApplianceDetails from "./pages/ApplianceDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import OwnerListings from "./pages/OwnerListings";
import MyBookings from "./pages/MyBookings";
import AdminDashboard from "./pages/AdminDashboard";
import OwnerBookings from "./pages/OwnerBookings";
import TechnicianDashboard from "./pages/TechnicianDashboard";

function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/appliances/:id" element={<ApplianceDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/owner/listings" element={<OwnerListings />} />
        <Route path="/owner/bookings" element={<OwnerBookings />} />
        <Route path="/technician" element={<TechnicianDashboard />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

export default App;
