// Create (or promote) an admin account WITHOUT touching any other data.
// Usage:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword123 npm run create-admin
// Optional: ADMIN_NAME="Your Name"
// If the email already exists, that account is promoted to admin (and its password is
// reset when ADMIN_PASSWORD is given). Admins never need an email OTP to log in.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const run = async () => {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email) {
    console.error("Set ADMIN_EMAIL (and ADMIN_PASSWORD for a new account).");
    process.exit(1);
  }

  await connectDB();

  let user = await User.findOne({ email });
  if (!user) {
    if (!password || password.length < 8) {
      console.error("ADMIN_PASSWORD (min 8 chars) is required to create a new admin.");
      process.exit(1);
    }
    user = new User({ name: process.env.ADMIN_NAME || "Admin", email, password });
  } else if (password) {
    if (password.length < 8) {
      console.error("ADMIN_PASSWORD must be at least 8 chars.");
      process.exit(1);
    }
    user.password = password;
  }

  user.role = "admin";
  user.isApproved = true;
  user.isEmailVerified = true;
  user.isActive = true;
  await user.save();

  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
