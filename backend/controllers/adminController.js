const User = require("../models/User");
const Appliance = require("../models/Appliance");

// @desc    List Owner/Technician accounts awaiting approval
// @route   GET /api/admin/pending-approvals
// @access  Private (Admin)
// REQ-31
const getPendingApprovals = async (req, res, next) => {
  try {
    const users = await User.find({
      role: { $in: ["owner", "technician"] },
      isApproved: false,
    }).select("-password");
    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve a pending Owner/Technician account
// @route   PATCH /api/admin/users/:id/approve
// @access  Private (Admin)
// REQ-31
const approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!["owner", "technician"].includes(user.role)) {
      return res.status(400).json({ success: false, message: "Only Owner/Technician accounts require approval" });
    }
    user.isApproved = true;
    await user.save();
    return res.status(200).json({ success: true, message: "Account approved", data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject a pending Owner/Technician account (deactivates it)
// @route   PATCH /api/admin/users/:id/reject
// @access  Private (Admin)
// REQ-31
const rejectUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isApproved = false;
    user.isActive = false;
    await user.save();
    return res.status(200).json({ success: true, message: "Account rejected", data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Suspend / reactivate any user account
// @route   PATCH /api/admin/users/:id/suspend
// @access  Private (Admin)
// REQ-32
const toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot suspend an Admin account" });
    }
    user.isActive = !user.isActive;
    await user.save();
    return res.status(200).json({
      success: true,
      message: user.isActive ? "Account reactivated" : "Account suspended",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List all listings, any status, for moderation
// @route   GET /api/admin/listings
// @access  Private (Admin)
// REQ-32
const getAllListingsForModeration = async (req, res, next) => {
  try {
    const listings = await Appliance.find()
      .populate("owner", "name email")
      .populate("category", "categoryName")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: listings.length, data: listings });
  } catch (err) {
    next(err);
  }
};

// @desc    Suspend / reinstate a listing
// @route   PATCH /api/admin/listings/:id/suspend
// @access  Private (Admin)
// REQ-32
const toggleListingSuspension = async (req, res, next) => {
  try {
    const listing = await Appliance.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    listing.availabilityStatus = listing.availabilityStatus === "suspended" ? "available" : "suspended";
    await listing.save();
    return res.status(200).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve a pending_review listing to make it publicly searchable
// @route   PATCH /api/admin/listings/:id/approve
// @access  Private (Admin)
// REQ-11 / REQ-32
const approveListing = async (req, res, next) => {
  try {
    const listing = await Appliance.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    listing.availabilityStatus = "available";
    await listing.save();
    return res.status(200).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
};

// @desc    Platform-wide counts for the admin dashboard
// @route   GET /api/admin/analytics
// @access  Private (Admin)
// REQ-33 — scoped to users and listings only. Booking-level detail is not
// surfaced to Admin; Owners see order details per-listing instead (see
// getOrdersForListing in bookingController).
const getAnalytics = async (req, res, next) => {
  try {
    const [userCounts, listingCounts] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Appliance.aggregate([{ $group: { _id: "$availabilityStatus", count: { $sum: 1 } } }]),
    ]);

    const toMap = (arr) => arr.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {});

    return res.status(200).json({
      success: true,
      data: {
        usersByRole: toMap(userCounts),
        listingsByStatus: toMap(listingCounts),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingApprovals,
  approveUser,
  rejectUser,
  toggleUserActive,
  getAllListingsForModeration,
  toggleListingSuspension,
  approveListing,
  getAnalytics,
};
