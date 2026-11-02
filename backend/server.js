require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const applianceRoutes = require("./routes/applianceRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const { webhook } = require("./controllers/paymentController");
const { sweepCompletedBookings } = require("./utils/bookingService");

connectDB();

const app = express();

// 5.3 Security Requirements
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
// Razorpay webhook needs the RAW body for HMAC verification, so it is registered before express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), webhook);
app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize()); // NoSQL injection protection
app.use(xss()); // XSS protection

// REQ: rate-limit auth endpoints against brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: "Too many attempts, please try again later" },
});
app.use("/api/auth", authLimiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "RentEase API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/appliances", applianceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/technician", technicianRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`RentEase API running on port ${PORT}`));
  // auto-complete ongoing rentals whose end date has passed (SRS 4.5.2)
  setInterval(() => sweepCompletedBookings().catch((e) => console.error("sweep error", e.message)), 60 * 60 * 1000);
}

module.exports = app;
