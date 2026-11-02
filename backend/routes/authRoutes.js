const express = require("express");
const router = express.Router();
const { register, verifyOtp, resendOtp, login, refresh, logout, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
