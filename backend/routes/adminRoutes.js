const express = require("express");
const router = express.Router();
const {
  getPendingApprovals,
  approveUser,
  rejectUser,
  toggleUserActive,
  getAllListingsForModeration,
  toggleListingSuspension,
  approveListing,
  getAnalytics,
} = require("../controllers/adminController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");

router.use(protect, authorize("admin")); // REQ-30: all admin endpoints admin-only

router.get("/pending-approvals", getPendingApprovals);
router.patch("/users/:id/approve", approveUser);
router.patch("/users/:id/reject", rejectUser);
router.patch("/users/:id/suspend", toggleUserActive);

router.get("/listings", getAllListingsForModeration);
router.patch("/listings/:id/approve", approveListing);
router.patch("/listings/:id/suspend", toggleListingSuspension);

router.get("/analytics", getAnalytics);

module.exports = router;
