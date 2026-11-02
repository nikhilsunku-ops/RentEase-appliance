const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ["consumer", "owner", "technician", "admin"],
      default: "consumer",
    },
    // REQ-6: Owner and Technician accounts must be approved by Admin
    // before they are visible/active. Consumers are auto-approved.
    isApproved: {
      type: Boolean,
      default: function () {
        return this.role === "consumer";
      },
    },
    address: { type: String },
    profileImage: {
      url: { type: String },
      publicId: { type: String },
    },
    isActive: { type: Boolean, default: true },
    // REQ-7: email OTP verification
    isEmailVerified: { type: Boolean, default: false },
    emailOtpHash: { type: String, select: false },
    emailOtpExpiresAt: { type: Date, select: false },
    emailOtpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// REQ-2: passwords hashed with bcrypt, min 12 salt rounds
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
