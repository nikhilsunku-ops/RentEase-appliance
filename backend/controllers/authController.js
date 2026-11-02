const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
} = require("../utils/generateTokens");
const { sendOtpEmail } = require("../utils/otp");

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const createAndSendOtp = async (user) => {
  const otp = generateOtp();
  user.emailOtpHash = hashOtp(otp);
  user.emailOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  user.emailOtpAttempts = 0;
  await user.save({ validateBeforeSave: false });
  await sendOtpEmail(user.email, user.name, otp, OTP_EXPIRY_MINUTES);
};

// @desc    Register a new user (consumer, owner, or technician)
// @route   POST /api/auth/register
// @access  Public
// REQ-1: sign up as Consumer, Owner or Technician. Admin accounts cannot self-register.
// REQ-7: send email OTP for verification.
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }

    if (role === "admin") {
      return res.status(403).json({ success: false, message: "Admin accounts cannot be self-registered" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone,
      role: role && ["owner", "technician"].includes(role) ? role : "consumer",
      address,
      isEmailVerified: false,
    });

    try {
      await createAndSendOtp(user);
    } catch (emailErr) {
      // Remove an unverified account if OTP delivery cannot be initialized.
      await User.deleteOne({ _id: user._id });
      return res.status(503).json({
        success: false,
        message: "Registration could not send the verification OTP. Configure SMTP and try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. Check your email for the verification OTP.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isEmailVerified: false,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({ success: false, message: "Valid email and 6-digit OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+emailOtpHash +emailOtpExpiresAt +emailOtpAttempts");
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    if (user.isEmailVerified) {
      return res.status(200).json({ success: true, message: "Email is already verified" });
    }
    if (!user.emailOtpHash || !user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP has expired. Request a new OTP." });
    }
    if (user.emailOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Request a new OTP." });
    }

    if (hashOtp(String(otp)) !== user.emailOtpHash) {
      user.emailOtpAttempts += 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    user.emailOtpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (err) {
    next(err);
  }
};

// @desc    Resend email OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: "Email is already verified" });

    await createAndSendOtp(user);
    return res.status(200).json({ success: true, message: "A new verification OTP has been sent." });
  } catch (err) {
    next(err);
  }
};

// @desc    Log in and receive access token + refresh cookie
// @route   POST /api/auth/login
// @access  Public
// REQ-3: issue short-lived JWT access token + long-lived HTTP-only refresh cookie
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account has been deactivated" });
    }

    // Admin accounts are created internally (REQ-1) and may not have a mailbox for OTPs,
    // so email verification is only enforced for self-registered roles.
    if (user.role !== "admin" && !user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email with the OTP before logging in",
      });
    }

    // REQ-6: Owner/Technician accounts must be admin-approved
    if (["owner", "technician"].includes(user.role) && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Your account is pending admin approval",
      });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    return res.status(200).json({ success: true, data: { accessToken } });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

const logout = async (req, res) => {
  res.clearCookie("refreshToken");
  return res.status(200).json({ success: true, message: "Logged out" });
};

const getMe = async (req, res) => {
  return res.status(200).json({ success: true, data: req.user });
};

module.exports = { register, verifyOtp, resendOtp, login, refresh, logout, getMe };
