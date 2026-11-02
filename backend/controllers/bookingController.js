const Appliance = require("../models/Appliance");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { notifyUser } = require("../utils/notify");
const { cancellationRefundAmount, refundBooking, completeAndRefund } = require("../utils/bookingService");

const idOf = (v) => (v && v._id ? v._id : v).toString();
const POP = [
  ["appliance", "title images rentPricePerMonth location"],
  ["owner", "name email phone"],
  ["consumer", "name email phone"],
  ["technician", "name phone"],
];
const populateAll = (q) => POP.reduce((acc, [p, s]) => acc.populate(p, s), q);

const fail = (res, code, message) => res.status(code).json({ success: false, message });

// Loads a booking and checks the caller is the booking's owner (or admin if allowAdmin)
const loadForOwner = async (req, res, { allowAdmin = false } = {}) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return fail(res, 404, "Booking not found"), null;
  const isOwner = booking.owner.toString() === req.user._id.toString();
  if (!isOwner && !(allowAdmin && req.user.role === "admin")) {
    return fail(res, 403, "Only the owner of this appliance can do this"), null;
  }
  return booking;
};

// @route POST /api/bookings   @access Consumer
// REQ-16/17: overlap check -> 409; rent/deposit/total auto-calculated.
// REQ-23 restored: bookings start "pending" and wait for the Owner to confirm/reject.
const createBooking = async (req, res, next) => {
  try {
    const { applianceId, startDate, endDate, deliveryAddress, deliveryCoordinates } = req.body;
    if (!applianceId || !startDate || !endDate) {
      return fail(res, 400, "applianceId, startDate and endDate are required");
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || start >= end) return fail(res, 400, "Invalid date range");
    if (start < new Date(new Date().setHours(0, 0, 0, 0))) return fail(res, 400, "Start date cannot be in the past");

    const appliance = await Appliance.findById(applianceId);
    if (!appliance || appliance.availabilityStatus !== "available") {
      return fail(res, 404, "Listing not available for booking");
    }

    const overlap = await Booking.findOne({
      appliance: applianceId,
      bookingStatus: { $in: ["pending", "confirmed", "ongoing"] },
      startDate: { $lt: end },
      endDate: { $gt: start },
    });
    if (overlap) return fail(res, 409, "Selected dates overlap with an existing booking for this appliance");

    // per-month billing, rounded up, minimum 1 month (kept from Review 1)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const months = Math.max(1, Math.ceil(days / 30));
    const rentAmount = months * appliance.rentPricePerMonth;
    const securityDeposit = appliance.securityDeposit;

    const booking = new Booking({
      appliance: applianceId,
      consumer: req.user._id,
      owner: appliance.owner,
      startDate: start,
      endDate: end,
      rentAmount,
      securityDeposit,
      totalAmount: rentAmount + securityDeposit,
      deliveryAddress: deliveryAddress || req.user.address,
      deliveryCoordinates,
    });
    booking.pushStatus("pending", req.user._id, "Booking requested");
    await booking.save();

    await notifyUser(req.user, "Booking requested", `Your request for "${appliance.title}" was sent. Total: ₹${booking.totalAmount}.`);
    await notifyUser(appliance.owner, "New booking request", `Someone requested "${appliance.title}" from ${start.toDateString()} to ${end.toDateString()}.`);

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/bookings/my-bookings   @access Consumer, Owner
// REQ-26: status + history for both Consumer and Owner, paginated, each sees only their own.
const getMyBookings = async (req, res, next) => {
  try {
    const pageSize = Math.min(Number(req.query.limit) || 20, 50);
    const pageNum = Math.max(Number(req.query.page) || 1, 1);
    const filter = req.user.role === "owner" ? { owner: req.user._id } : { consumer: req.user._id };
    if (req.query.status) filter.bookingStatus = req.query.status;

    const [bookings, total] = await Promise.all([
      populateAll(Booking.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * pageSize).limit(pageSize)),
      Booking.countDocuments(filter),
    ]);
    res.json({ success: true, count: bookings.length, total, page: pageNum, totalPages: Math.ceil(total / pageSize), data: bookings });
  } catch (err) {
    next(err);
  }
};

const getOrdersForListing = async (req, res, next) => {
  try {
    const appliance = await Appliance.findById(req.params.applianceId);
    if (!appliance) return fail(res, 404, "Listing not found");
    if (appliance.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return fail(res, 403, "Not authorized to view these orders");
    }
    const bookings = await populateAll(Booking.find({ appliance: req.params.applianceId }).sort({ createdAt: -1 }));
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await populateAll(Booking.findById(req.params.id));
    if (!booking) return fail(res, 404, "Booking not found");
    const uid = req.user._id.toString();
    const allowed =
      idOf(booking.consumer) === uid ||
      idOf(booking.owner) === uid ||
      (booking.technician && idOf(booking.technician) === uid) ||
      req.user.role === "admin";
    if (!allowed) return fail(res, 403, "Not authorized to view this booking");
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/bookings/:id/confirm   @access owning Owner  (REQ-23)
const confirmBooking = async (req, res, next) => {
  try {
    const booking = await loadForOwner(req, res);
    if (!booking) return;
    if (booking.bookingStatus !== "pending") return fail(res, 409, `Only pending bookings can be confirmed (is ${booking.bookingStatus})`);
    booking.pushStatus("confirmed", req.user._id, "Confirmed by owner");
    await booking.save();
    await notifyUser(booking.consumer, "Booking confirmed", "Your booking was confirmed by the owner. Please complete payment if you haven't.");
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/bookings/:id/reject   @access owning Owner  (REQ-23)
// Paid bookings are refunded in full — the consumer isn't at fault.
const rejectBooking = async (req, res, next) => {
  try {
    const booking = await loadForOwner(req, res);
    if (!booking) return;
    if (booking.bookingStatus !== "pending") return fail(res, 409, `Only pending bookings can be rejected (is ${booking.bookingStatus})`);
    const reason = req.body.reason || "Rejected by owner";
    booking.pushStatus("rejected", req.user._id, reason);
    const refunded = await refundBooking(booking, booking.totalAmount, reason);
    await booking.save();
    await notifyUser(booking.consumer, "Booking rejected", `Your booking was rejected: ${reason}.${refunded ? ` ₹${refunded} is being refunded.` : ""}`);
    res.json({ success: true, data: booking, refunded });
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/bookings/:id/cancel   @access Consumer, Owner, Admin (parties only)
// REQ-24/25: allowed unless already completed/cancelled/rejected; who/why/when recorded.
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    const uid = req.user._id.toString();
    const isParty = booking.consumer.toString() === uid || booking.owner.toString() === uid;
    if (!isParty && req.user.role !== "admin") return fail(res, 403, "Not authorized to cancel this booking");
    if (["completed", "cancelled", "rejected"].includes(booking.bookingStatus)) {
      return fail(res, 409, `A ${booking.bookingStatus} booking cannot be cancelled`);
    }
    if (booking.bookingStatus === "ongoing" && req.user.role !== "admin") {
      return fail(res, 409, "An ongoing rental can only be cancelled by an admin");
    }
    const reason = (req.body.reason || "").trim();
    if (!reason) return fail(res, 400, "A cancellation reason is required");

    booking.cancellation = { by: req.user._id, byRole: req.user.role, reason, at: new Date() };
    booking.pushStatus("cancelled", req.user._id, reason);
    const refundAmount = cancellationRefundAmount(booking, req.user.role);
    const refunded = await refundBooking(booking, refundAmount, `Cancelled by ${req.user.role}: ${reason}`);
    await booking.save();

    const msg = `Booking cancelled by ${req.user.role}: ${reason}.${refunded ? ` ₹${refunded} is being refunded.` : ""}`;
    await notifyUser(booking.consumer, "Booking cancelled", msg);
    await notifyUser(booking.owner, "Booking cancelled", msg);
    res.json({ success: true, data: booking, refunded });
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/bookings/:id/start   @access owning Owner
// Hand-over: confirmed -> ongoing. Requires payment so the deposit is held first.
const startBooking = async (req, res, next) => {
  try {
    const booking = await loadForOwner(req, res);
    if (!booking) return;
    if (booking.bookingStatus !== "confirmed") return fail(res, 409, "Only confirmed bookings can be started");
    if (booking.payment.status !== "paid") return fail(res, 409, "Consumer has not paid yet; the deposit must be held before hand-over");
    booking.pushStatus("ongoing", req.user._id, "Appliance handed over");
    await booking.save();
    await notifyUser(booking.consumer, "Rental started", "Your rental is now ongoing.");
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/bookings/:id/complete   @access owning Owner, Admin
// Returns the appliance -> completed -> deposit refunded (minus any approved deduction).
const completeBooking = async (req, res, next) => {
  try {
    const booking = await loadForOwner(req, res, { allowAdmin: true });
    if (!booking) return;
    if (booking.bookingStatus !== "ongoing") return fail(res, 409, "Only ongoing rentals can be completed");
    if (booking.dispute.reported && !booking.dispute.resolved) {
      return fail(res, 409, "A damage report is open; an admin must resolve it first");
    }
    const refunded = await completeAndRefund(booking, req.user._id);
    res.json({ success: true, data: booking, refunded });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/bookings/:id/report-damage   @access owning Owner
// Blocks auto-completion until an admin resolves the dispute.
const reportDamage = async (req, res, next) => {
  try {
    const booking = await loadForOwner(req, res);
    if (!booking) return;
    if (!["ongoing", "completed"].includes(booking.bookingStatus)) return fail(res, 409, "Damage can only be reported on ongoing rentals");
    if (!req.body.note) return fail(res, 400, "Describe the damage");
    if (booking.bookingStatus === "completed" && booking.refund?.amount >= booking.securityDeposit) {
      return fail(res, 409, "Deposit was already refunded");
    }
    booking.dispute = { ...booking.dispute.toObject(), reported: true, reportedNote: req.body.note, resolved: false };
    booking.statusHistory.push({ status: booking.bookingStatus, by: req.user._id, note: `Damage reported: ${req.body.note}` });
    await booking.save();
    await notifyUser(booking.consumer, "Damage reported", "The owner reported damage on your rental. An admin will review it before your deposit is released.");
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/bookings/admin/disputes   @access Admin
const listDisputes = async (req, res, next) => {
  try {
    const bookings = await populateAll(
      Booking.find({ "dispute.reported": true, "dispute.resolved": false }).sort({ updatedAt: -1 })
    );
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/bookings/:id/resolve-dispute   @access Admin
// REQ-22: admin supplies a deduction amount AND a reason; then the remaining deposit is refunded.
const resolveDispute = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    if (!booking.dispute.reported || booking.dispute.resolved) return fail(res, 409, "No open dispute on this booking");

    const amount = Number(req.body.deductionAmount);
    const reason = (req.body.reason || "").trim();
    if (!Number.isFinite(amount) || amount < 0 || amount > booking.securityDeposit) {
      return fail(res, 400, `deductionAmount must be between 0 and ${booking.securityDeposit}`);
    }
    if (amount > 0 && !reason) return fail(res, 400, "A reason is required for a deposit deduction");

    booking.dispute.deductionAmount = amount;
    booking.dispute.deductionReason = reason;
    booking.dispute.resolved = true;

    let refunded = 0;
    if (booking.bookingStatus === "ongoing") {
      refunded = await completeAndRefund(booking, req.user._id, `Dispute resolved, ₹${amount} deducted`);
    } else {
      // already completed earlier: refund nothing extra, just record
      booking.statusHistory.push({ status: booking.bookingStatus, by: req.user._id, note: `Dispute resolved, ₹${amount} deducted` });
      await booking.save();
    }
    await notifyUser(booking.owner, "Dispute resolved", `Admin resolved the damage dispute. Deduction: ₹${amount}.`);
    res.json({ success: true, data: booking, refunded });
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/bookings/:id/assign-technician   @access owning Owner, Admin
// REQ-27: exactly one technician per booking (re-assigning replaces).
const assignTechnician = async (req, res, next) => {
  try {
    const booking = await loadForOwner(req, res, { allowAdmin: true });
    if (!booking) return;
    if (!["confirmed", "ongoing"].includes(booking.bookingStatus)) {
      return fail(res, 409, "A technician can only be assigned to a confirmed booking");
    }
    const tech = await User.findOne({ _id: req.body.technicianId, role: "technician", isApproved: true, isActive: true });
    if (!tech) return fail(res, 404, "Approved technician not found");
    if (booking.technicianStatus === "done") return fail(res, 409, "The technician job is already done");

    booking.technician = tech._id;
    booking.technicianStatus = "assigned";
    booking.statusHistory.push({ status: booking.bookingStatus, by: req.user._id, note: `Technician ${tech.name} assigned` });
    await booking.save();
    await notifyUser(tech, "New job assigned", "You have a new delivery/installation job. Open your dashboard for details.", "job");
    await notifyUser(booking.consumer, "Technician assigned", `${tech.name} will handle delivery/installation.`);
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getOrdersForListing,
  getBookingById,
  confirmBooking,
  rejectBooking,
  cancelBooking,
  startBooking,
  completeBooking,
  reportDamage,
  listDisputes,
  resolveDispute,
  assignTechnician,
};
