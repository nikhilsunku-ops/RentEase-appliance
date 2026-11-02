// Run: start the API (PORT=5055, RAZORPAY keys unset => mock mode, MOCK_RAZORPAY_SECRET=testsecret), seed, then `node tests/e2e.js`
// End-to-end scenario test against a live server (node >=18 fetch)
const BASE = "http://localhost:5055/api";
let pass = 0, failn = 0;
const ok = (c, m) => { c ? pass++ : failn++; console.log((c ? "PASS " : "FAIL ") + m); };
const call = async (method, path, token, body) => {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }) }, body: body && JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  return { s: r.status, ...j };
};
const login = async (e) => (await call("POST", "/auth/login", null, { email: e, password: "password123" })).data.accessToken;
const day = 86400000; const iso = (n) => new Date(Date.now() + n * day).toISOString().slice(0, 10);

(async () => {
  await require("mongoose").connect(process.env.MONGO_URI);
  const C = await login("consumer@rentease.test"), O = await login("owner@rentease.test"),
        A = await login("admin@rentease.test"), T = await login("technician@rentease.test");
  const list = await call("GET", "/appliances?limit=10", null);
  const app = (list.data || [])[0];
  ok(!!app, "listing available (" + (app && app.title) + ")");

  // ---- booking creation -> pending, deposit math
  let b = await call("POST", "/bookings", C, { applianceId: app._id, startDate: iso(10), endDate: iso(40), deliveryAddress: "12 Anna Nagar, Chennai", deliveryCoordinates: { lat: 13.08, lng: 80.21 } });
  ok(b.s === 201 && b.data.bookingStatus === "pending", "booking created as pending");
  ok(b.data.totalAmount === b.data.rentAmount + b.data.securityDeposit, "REQ-17 total = rent + deposit");
  const id = b.data._id;
  const dup = await call("POST", "/bookings", C, { applianceId: app._id, startDate: iso(20), endDate: iso(30) });
  ok(dup.s === 409, "REQ-16 overlap -> 409");

  // ---- RBAC on lifecycle
  ok((await call("PATCH", `/bookings/${id}/confirm`, C)).s === 403, "consumer cannot confirm (403)");
  ok((await call("PATCH", `/bookings/${id}/confirm`)).s === 401, "no token -> 401");

  // ---- payment: tampered signature rejected, valid accepted
  const ord = await call("POST", "/payments/order", C, { bookingId: id });
  ok(ord.s === 201 && ord.data.amount === b.data.totalAmount, "REQ-18 order amount = rent + deposit");
  const bad = await call("POST", "/payments/verify", C, { bookingId: id, razorpay_order_id: ord.data.order.id, razorpay_payment_id: "pay_fake", razorpay_signature: "deadbeef" });
  ok(bad.s === 400, "REQ-19/20 forged signature rejected");
  let chk = await call("GET", `/bookings/${id}`, C);
  ok(chk.data.payment.status === "unpaid", "booking still unpaid after forged claim");
  const mc = await call("POST", "/payments/mock-checkout", C, { bookingId: id });
  const good = await call("POST", "/payments/verify", C, { bookingId: id, ...mc.data });
  ok(good.s === 200 && good.data.payment.status === "paid", "valid HMAC signature -> paid");

  // ---- owner confirm, assign technician, start
  ok((await call("PATCH", `/bookings/${id}/confirm`, O)).data.bookingStatus === "confirmed", "REQ-23 owner confirms");
  const asg = await call("PATCH", `/bookings/${id}/assign-technician`, O, { technicianId: (await call("GET", "/technicians", O)).data[0]._id });
  ok(asg.s === 200 && asg.data.technicianStatus === "assigned", "REQ-27 technician assigned");
  ok((await call("PATCH", `/technician/jobs/${id}/status`, C, { status: "on_the_way" })).s === 403, "REQ-28 consumer cannot update job status");
  ok((await call("PATCH", `/technician/jobs/${id}/status`, T, { status: "done" })).s === 409, "illegal job transition blocked");
  ok((await call("PATCH", `/technician/jobs/${id}/status`, T, { status: "on_the_way" })).s === 200, "technician: on_the_way");
  const dir = await call("GET", `/technician/jobs/${id}/directions`, T);
  ok(dir.s === 200 && dir.data.url.includes("google.com/maps/dir"), "directions link built (" + dir.data.leg + ")");
  const jobs = await call("GET", "/technician/jobs", T);
  ok(jobs.data.length >= 1 && jobs.data[0].deliveryAddress, "REQ-29 assigned technician sees delivery address");
  ok((await call("PATCH", `/technician/jobs/${id}/status`, T, { status: "arrived" })).s === 200 && (await call("PATCH", `/technician/jobs/${id}/status`, T, { status: "done" })).s === 200, "technician: arrived -> done");
  ok((await call("PATCH", `/bookings/${id}/start`, O)).data.bookingStatus === "ongoing", "owner starts rental (paid)");

  // ---- damage dispute blocks completion; admin deduction w/ reason (REQ-22)
  ok((await call("POST", `/bookings/${id}/report-damage`, O, { note: "Cracked lid" })).s === 200, "owner reports damage");
  ok((await call("PATCH", `/bookings/${id}/complete`, O)).s === 409, "completion blocked while dispute open");
  ok((await call("PATCH", `/bookings/${id}/resolve-dispute`, A, { deductionAmount: 300 })).s === 400, "REQ-22 deduction without reason rejected");
  const res = await call("PATCH", `/bookings/${id}/resolve-dispute`, A, { deductionAmount: 300, reason: "Replacement lid" });
  ok(res.s === 200 && res.data.bookingStatus === "completed", "admin resolves -> completed");
  ok(res.refunded === b.data.securityDeposit - 300, `REQ-21 partial refund = deposit - 300 (got ${res.refunded})`);
  ok(res.data.refund.razorpayRefundId && res.data.payment.status === "partially_refunded", "refund id + status stored");

  // ---- reject path refunds fully; cancel policy
  const b2 = await call("POST", "/bookings", C, { applianceId: app._id, startDate: iso(60), endDate: iso(70) });
  const o2 = await call("POST", "/payments/order", C, { bookingId: b2.data._id });
  const m2 = await call("POST", "/payments/mock-checkout", C, { bookingId: b2.data._id });
  await call("POST", "/payments/verify", C, { bookingId: b2.data._id, ...m2.data });
  const rj = await call("PATCH", `/bookings/${b2.data._id}/reject`, O, { reason: "Not available" });
  ok(rj.s === 200 && rj.refunded === b2.data.totalAmount && rj.data.payment.status === "refunded", "reject -> 100% refund");

  const b3 = await call("POST", "/bookings", C, { applianceId: app._id, startDate: iso(3), endDate: iso(10) });
  const m3o = await call("POST", "/payments/order", C, { bookingId: b3.data._id });
  const m3 = await call("POST", "/payments/mock-checkout", C, { bookingId: b3.data._id });
  await call("POST", "/payments/verify", C, { bookingId: b3.data._id, ...m3.data });
  ok((await call("PATCH", `/bookings/${b3.data._id}/cancel`, C, {})).s === 400, "REQ-25 cancel needs a reason");
  const cx = await call("PATCH", `/bookings/${b3.data._id}/cancel`, C, { reason: "Plans changed" });
  const expected = b3.data.securityDeposit + Math.floor(b3.data.rentAmount * 0.5);
  ok(cx.s === 200 && cx.refunded === expected, `consumer cancel 3 days out -> deposit + 50% rent (${cx.refunded}/${expected})`);
  ok(cx.data.cancellation.reason === "Plans changed" && cx.data.cancellation.byRole === "consumer" && cx.data.cancellation.at, "REQ-25 who/why/when stored");
  ok((await call("PATCH", `/bookings/${b3.data._id}/cancel`, C, { reason: "again" })).s === 409, "REQ-24 cannot cancel a cancelled booking");

  // ---- REQ-26 role-aware list + history
  const mine = await call("GET", "/bookings/my-bookings", O);
  ok(mine.s === 200 && mine.total >= 3, "REQ-26 owner sees their bookings");
  const full = await call("GET", `/bookings/${id}`, C);
  ok(full.data.statusHistory.length >= 5, "status history recorded (" + full.data.statusHistory.length + " entries)");

  // ---- webhook signature
  const raw = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_x", order_id: "none" } } } });
  const w1 = await fetch(BASE + "/payments/webhook", { method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": "bad" }, body: raw });
  ok(w1.status === 400, "webhook with bad signature rejected");
  const sig = require("crypto").createHmac("sha256", process.env.MOCK_RAZORPAY_SECRET).update(raw).digest("hex");
  const w2 = await fetch(BASE + "/payments/webhook", { method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": sig }, body: raw });
  ok(w2.status === 200, "webhook with valid HMAC accepted");

  // ---- notifications logged
  const Notification = require("../models/Notification");
  const n = await Notification.countDocuments();
  ok(n >= 10, "REQ-34/35 notifications logged without SMTP (" + n + ")");

  // ---- auto-complete sweep
  const Booking = require("../models/Booking");
  const { sweepCompletedBookings } = require("../utils/bookingService");
  const b4 = await call("POST", "/bookings", C, { applianceId: app._id, startDate: iso(100), endDate: iso(110) });
  const m4o = await call("POST", "/payments/order", C, { bookingId: b4.data._id });
  const m4 = await call("POST", "/payments/mock-checkout", C, { bookingId: b4.data._id });
  await call("POST", "/payments/verify", C, { bookingId: b4.data._id, ...m4.data });
  await call("PATCH", `/bookings/${b4.data._id}/confirm`, O); await call("PATCH", `/bookings/${b4.data._id}/start`, O);
  await Booking.updateOne({ _id: b4.data._id }, { endDate: new Date(Date.now() - day) });
  const swept = await sweepCompletedBookings();
  const after = await Booking.findById(b4.data._id);
  ok(swept >= 1 && after.bookingStatus === "completed" && after.refund.amount === after.securityDeposit, "auto-complete after end date refunds full deposit");

  console.log(`\n${pass} passed, ${failn} failed`);
  process.exit(failn ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(2); });
