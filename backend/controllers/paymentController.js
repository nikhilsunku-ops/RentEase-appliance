const Booking = require("../models/Booking");
const rzp = require("../config/razorpay");
const { notifyUser } = require("../utils/notify");

const loadOwnBooking = async (req, res) => {
  const booking = await Booking.findById(req.body.bookingId).populate("appliance", "title");
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return null;
  }
  if (booking.consumer.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: "Not your booking" });
    return null;
  }
  return booking;
};

// @route POST /api/payments/order   @access Consumer
// REQ-18: order amount = rentAmount + securityDeposit. Amount is computed from the stored
// booking, never from the client.
const createPaymentOrder = async (req, res, next) => {
  try {
    const booking = await loadOwnBooking(req, res);
    if (!booking) return;
    if (!["pending", "confirmed"].includes(booking.bookingStatus)) {
      return res.status(409).json({ success: false, message: `Cannot pay for a ${booking.bookingStatus} booking` });
    }
    if (booking.payment.status !== "unpaid") {
      return res.status(409).json({ success: false, message: "Booking is already paid" });
    }
    const amount = booking.rentAmount + booking.securityDeposit;
    const order = await rzp.createOrder(amount, String(booking._id));
    booking.payment.razorpayOrderId = order.id;
    await booking.save();
    res.status(201).json({
      success: true,
      data: { order, keyId: process.env.RAZORPAY_KEY_ID || null, mock: rzp.isMock(), amount, title: booking.appliance?.title },
    });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/payments/mock-checkout  (only when Razorpay keys are not configured)
// Simulates what Razorpay Checkout hands back to the browser: payment id + signature.
const mockCheckout = async (req, res, next) => {
  try {
    if (!rzp.isMock()) return res.status(404).json({ success: false, message: "Not available" });
    const booking = await loadOwnBooking(req, res);
    if (!booking) return;
    if (!booking.payment.razorpayOrderId) {
      return res.status(409).json({ success: false, message: "Create an order first" });
    }
    const paymentId = `pay_mock_${Date.now().toString(36)}`;
    res.json({
      success: true,
      data: {
        razorpay_order_id: booking.payment.razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: rzp.signPayment(booking.payment.razorpayOrderId, paymentId),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/payments/verify   @access Consumer
// REQ-19/20: HMAC-SHA256 verified server-side before the booking is marked paid.
// A client claiming "success" without a valid signature is rejected.
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const booking = await loadOwnBooking(req, res);
    if (!booking) return;

    if (booking.payment.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order does not match this booking" });
    }
    if (!rzp.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ success: false, message: "Payment signature verification failed" });
    }
    if (booking.payment.status === "unpaid") {
      booking.payment.status = "paid";
      booking.payment.razorpayPaymentId = razorpay_payment_id;
      booking.payment.paidAt = new Date();
      await booking.save();
      await notifyUser(booking.consumer, "Payment received", `We received ₹${booking.totalAmount} for your booking.`);
      await notifyUser(booking.owner, "Booking paid", `A booking for your appliance has been paid (₹${booking.totalAmount}).`);
    }
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/payments/webhook  (raw body; mounted in server.js before express.json)
// 5.3: webhook payloads are HMAC-verified before being trusted. Idempotent.
const webhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!Buffer.isBuffer(req.body) || !rzp.verifyWebhookSignature(req.body, signature)) {
    return res.status(400).json({ success: false, message: "Invalid webhook signature" });
  }
  try {
    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event === "payment.captured") {
      const p = event.payload.payment.entity;
      const booking = await Booking.findOne({ "payment.razorpayOrderId": p.order_id });
      if (booking && booking.payment.status === "unpaid") {
        booking.payment.status = "paid";
        booking.payment.razorpayPaymentId = p.id;
        booking.payment.paidAt = new Date();
        await booking.save();
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: "Malformed payload" });
  }
};

module.exports = { createPaymentOrder, mockCheckout, verifyPayment, webhook };
