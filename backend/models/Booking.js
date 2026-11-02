const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    status: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    appliance: { type: mongoose.Schema.Types.ObjectId, ref: "Appliance", required: true },
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    rentAmount: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    // REQ-23..26: full lifecycle
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "ongoing", "completed", "cancelled"],
      default: "pending",
    },
    statusHistory: [historySchema], // REQ-26: booking history
    bookingDate: { type: Date, default: Date.now },

    // REQ-25: cancellation details
    cancellation: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      byRole: String,
      reason: String,
      at: Date,
    },

    // REQ-18..21: payment
    payment: {
      status: { type: String, enum: ["unpaid", "paid", "refunded", "partially_refunded"], default: "unpaid" },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
    },
    // REQ-21: refund tracking
    refund: {
      razorpayRefundId: String,
      amount: { type: Number, default: 0 },
      status: String,
      at: Date,
    },

    // REQ-22: damage dispute + deposit deduction
    dispute: {
      reported: { type: Boolean, default: false },
      reportedNote: String,
      deductionAmount: { type: Number, default: 0 },
      deductionReason: String,
      resolved: { type: Boolean, default: false },
    },

    // 4.6 technician service (delivery address visible only to parties + assigned technician, REQ-29)
    deliveryAddress: { type: String },
    deliveryCoordinates: { lat: Number, lng: Number },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    technicianStatus: {
      type: String,
      enum: ["none", "assigned", "on_the_way", "arrived", "done"],
      default: "none",
    },
  },
  { timestamps: true }
);

bookingSchema.index({ appliance: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ consumer: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });
bookingSchema.index({ technician: 1 });

bookingSchema.methods.pushStatus = function (status, by, note) {
  this.bookingStatus = status;
  this.statusHistory.push({ status, by, note });
};

module.exports = mongoose.model("Booking", bookingSchema);
