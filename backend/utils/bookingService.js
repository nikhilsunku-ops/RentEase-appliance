const Booking = require("../models/Booking");
const { refundPayment } = require("../config/razorpay");
const { notifyUser } = require("./notify");

const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Cancellation policy (Appendix C, TBD-2 — "simple rule set").
// ASSUMPTION: confirm/adjust the percentages with your faculty before final submit.
//   Owner / Admin cancels, or Owner rejects ........ 100% refund (consumer not at fault)
//   Consumer cancels >= 7 days before start ......... 100% refund
//   Consumer cancels 2 to <7 days before start ...... deposit + 50% of rent
//   Consumer cancels < 2 days before start .......... deposit only (rent forfeited)
// ---------------------------------------------------------------------------
const cancellationRefundAmount = (booking, byRole, now = new Date()) => {
  if (byRole !== "consumer") return booking.totalAmount;
  const daysLeft = (booking.startDate - now) / DAY;
  if (daysLeft >= 7) return booking.totalAmount;
  if (daysLeft >= 2) return booking.securityDeposit + Math.floor(booking.rentAmount * 0.5);
  return booking.securityDeposit;
};

// REQ-21: refund (full or partial) through Razorpay Refunds API; store refund id + amount.
const refundBooking = async (booking, amountRupees, reason) => {
  if (booking.payment.status !== "paid" && booking.payment.status !== "partially_refunded") return 0;
  const alreadyRefunded = booking.refund?.amount || 0;
  const refundable = Math.max(0, booking.totalAmount - alreadyRefunded);
  const amount = Math.min(Math.floor(amountRupees), refundable);
  if (amount <= 0) return 0;

  const r = await refundPayment(booking.payment.razorpayPaymentId, amount, {
    bookingId: String(booking._id),
    reason: reason || "",
  });
  booking.refund = {
    razorpayRefundId: r.id,
    amount: alreadyRefunded + amount,
    status: r.status || "processed",
    at: new Date(),
  };
  booking.payment.status = booking.refund.amount >= booking.totalAmount ? "refunded" : "partially_refunded";
  return amount;
};

// Completion: refund the security deposit minus any admin-approved deduction (REQ-21/22).
const completeAndRefund = async (booking, by, note) => {
  const deduction = booking.dispute?.deductionAmount || 0;
  const depositBack = Math.max(0, booking.securityDeposit - deduction);
  booking.pushStatus("completed", by, note || "Rental completed");
  const refunded = await refundBooking(booking, depositBack, "Security deposit refund");
  await booking.save();
  await notifyUser(
    booking.consumer,
    "Rental completed",
    refunded > 0
      ? `Your rental has been completed. ₹${refunded} of your security deposit is being refunded${
          deduction ? ` (₹${deduction} deducted: ${booking.dispute.deductionReason})` : ""
        }. Please leave a review.`
      : "Your rental has been completed."
  );
  return refunded;
};

// "Booking end date passes with no dispute -> system marks completed" (SRS 4.5.2)
// Skips bookings with an unresolved damage report. Runs on an interval from server.js.
const sweepCompletedBookings = async () => {
  const due = await Booking.find({
    bookingStatus: "ongoing",
    endDate: { $lt: new Date() },
    $or: [{ "dispute.reported": { $ne: true } }, { "dispute.resolved": true }],
  });
  for (const b of due) {
    try {
      await completeAndRefund(b, null, "Auto-completed after end date");
    } catch (e) {
      console.error("Auto-complete failed for", b._id, e.message);
    }
  }
  return due.length;
};

module.exports = { cancellationRefundAmount, refundBooking, completeAndRefund, sweepCompletedBookings };
