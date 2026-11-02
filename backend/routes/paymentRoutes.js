const express = require("express");
const router = express.Router();
const { createPaymentOrder, mockCheckout, verifyPayment } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");

// webhook is registered in server.js (needs the raw body)
router.post("/order", protect, authorize("consumer"), createPaymentOrder);
router.post("/mock-checkout", protect, authorize("consumer"), mockCheckout);
router.post("/verify", protect, authorize("consumer"), verifyPayment);

module.exports = router;
