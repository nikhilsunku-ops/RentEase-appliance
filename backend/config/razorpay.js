const crypto = require("crypto");

// Razorpay in test mode (SRS 6). If keys are absent we fall back to MOCK mode so the
// whole flow (order -> checkout -> HMAC verify -> refund) is demoable offline.
// Mock mode keeps the REAL server-side HMAC verification path; it only replaces the
// network calls to Razorpay and the browser checkout popup.
const hasKeys = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const isMock = () => !hasKeys();
const secret = () => process.env.RAZORPAY_KEY_SECRET || process.env.MOCK_RAZORPAY_SECRET || "mock_secret_change_me";

let client = null;
const getClient = () => {
  if (isMock()) return null;
  if (!client) {
    const Razorpay = require("razorpay");
    client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return client;
};

const rand = (p) => `${p}_${crypto.randomBytes(7).toString("hex")}`;

// amounts are in rupees at the API boundary; Razorpay needs paise
const createOrder = async (amountRupees, receipt) => {
  const c = getClient();
  if (!c) return { id: rand("order_mock"), amount: amountRupees * 100, currency: "INR", mock: true };
  const order = await c.orders.create({ amount: Math.round(amountRupees * 100), currency: "INR", receipt });
  return { ...order, mock: false };
};

// REQ-19: HMAC-SHA256 over "order_id|payment_id" with the key secret
const signPayment = (orderId, paymentId) =>
  crypto.createHmac("sha256", secret()).update(`${orderId}|${paymentId}`).digest("hex");

const verifySignature = (orderId, paymentId, signature) => {
  if (!orderId || !paymentId || !signature) return false;
  const expected = Buffer.from(signPayment(orderId, paymentId));
  const given = Buffer.from(String(signature));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

const verifyWebhookSignature = (rawBody, signature) => {
  const whSecret = process.env.RAZORPAY_WEBHOOK_SECRET || secret();
  const expected = crypto.createHmac("sha256", whSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const refundPayment = async (paymentId, amountRupees, notes = {}) => {
  const c = getClient();
  if (!c) return { id: rand("rfnd_mock"), amount: amountRupees * 100, status: "processed", mock: true };
  return c.payments.refund(paymentId, { amount: Math.round(amountRupees * 100), notes });
};

module.exports = { isMock, createOrder, signPayment, verifySignature, verifyWebhookSignature, refundPayment };
