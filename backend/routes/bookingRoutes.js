const express = require("express");
const router = express.Router();
const b = require("../controllers/bookingController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");

router.post("/", protect, authorize("consumer"), b.createBooking); // REQ-16, REQ-17
router.get("/my-bookings", protect, authorize("consumer", "owner"), b.getMyBookings); // REQ-26
router.get("/admin/disputes", protect, authorize("admin"), b.listDisputes);
router.get("/listing/:applianceId", protect, authorize("owner", "admin"), b.getOrdersForListing);

router.patch("/:id/confirm", protect, authorize("owner"), b.confirmBooking); // REQ-23
router.patch("/:id/reject", protect, authorize("owner"), b.rejectBooking); // REQ-23
router.patch("/:id/cancel", protect, authorize("consumer", "owner", "admin"), b.cancelBooking); // REQ-24/25
router.patch("/:id/start", protect, authorize("owner"), b.startBooking);
router.patch("/:id/complete", protect, authorize("owner", "admin"), b.completeBooking);
router.post("/:id/report-damage", protect, authorize("owner"), b.reportDamage);
router.patch("/:id/resolve-dispute", protect, authorize("admin"), b.resolveDispute); // REQ-22
router.patch("/:id/assign-technician", protect, authorize("owner", "admin"), b.assignTechnician); // REQ-27

router.get("/:id", protect, b.getBookingById);

module.exports = router;
