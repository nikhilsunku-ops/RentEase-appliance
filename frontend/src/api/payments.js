import api from "./axios";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(s);
  });

// Pays a booking. Server creates the order (amount computed server-side), the browser
// completes checkout, and the SERVER verifies the HMAC signature before marking it paid.
// With no Razorpay keys configured the backend is in mock mode and we skip the popup.
export const payBooking = async (booking, user) => {
  const { data } = await api.post("/payments/order", { bookingId: booking._id });
  const { order, keyId, mock, title } = data.data;

  if (mock) {
    if (!window.confirm(`[Test mode] Pay ₹${data.data.amount} (rent + refundable deposit)?`)) return null;
    const mc = await api.post("/payments/mock-checkout", { bookingId: booking._id });
    const res = await api.post("/payments/verify", { bookingId: booking._id, ...mc.data.data });
    return res.data.data;
  }

  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "RentEase",
      description: title,
      prefill: { name: user?.name, email: user?.email },
      handler: async (resp) => {
        try {
          const res = await api.post("/payments/verify", { bookingId: booking._id, ...resp });
          resolve(res.data.data);
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve(null) },
    });
    rz.open();
  });
};
