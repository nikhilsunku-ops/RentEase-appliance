import { useEffect, useState } from "react";
import api from "../api/axios";
import { payBooking } from "../api/payments";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import BookingHistory from "../components/BookingHistory";

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState("");

  const load = () => api.get("/bookings/my-bookings").then(({ data }) => setBookings(data.data));

  useEffect(() => {
    if (user?.role === "consumer") load();
  }, [user]);

  const run = async (id, fn, okText) => {
    setBusy(id);
    setMsg({ type: "", text: "" });
    try {
      await fn();
      if (okText) setMsg({ type: "ok", text: okText });
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || err.message || "Action failed" });
    } finally {
      setBusy("");
    }
  };

  const handlePay = (b) => run(b._id, () => payBooking(b, user), "Payment verified.");
  const handleCancel = (b) => {
    const reason = window.prompt("Reason for cancelling?");
    if (!reason) return;
    run(b._id, () => api.patch(`/bookings/${b._id}/cancel`, { reason }), "Booking cancelled.");
  };

  if (user && user.role !== "consumer") {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
          <p className="text-ink/50">
            {user.role === "owner" ? "Owners manage orders from the Bookings page." : "This view is for Consumers only."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display font-semibold text-2xl text-ink mb-6">My bookings</h1>
      {msg.text && (
        <p className={`text-sm rounded-lg px-3 py-2 mb-4 ${msg.type === "ok" ? "text-brand-700 bg-brand-50" : "text-tag-800 bg-tag-50"}`}>
          {msg.text}
        </p>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
          <p className="text-ink/50">No bookings yet — browse listings to request one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const canPay = ["pending", "confirmed"].includes(b.bookingStatus) && b.payment?.status === "unpaid";
            const canCancel = ["pending", "confirmed"].includes(b.bookingStatus);
            return (
              <div key={b._id} className="bg-white border border-ink/10 rounded-card p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-medium text-ink">{b.appliance?.title}</h3>
                    <p className="text-xs text-ink/40 mt-0.5">
                      {new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-ink/50 mt-1">
                      Rent ₹{b.rentAmount} + refundable deposit ₹{b.securityDeposit}
                    </p>
                    {b.technician && (
                      <p className="text-xs text-ink/50 mt-1">
                        Technician: {b.technician.name} · <StatusBadge value={b.technicianStatus} />
                      </p>
                    )}
                    {b.refund?.amount > 0 && (
                      <p className="text-xs text-brand-700 mt-1">Refunded ₹{b.refund.amount}</p>
                    )}
                    {b.dispute?.deductionAmount > 0 && (
                      <p className="text-xs text-tag-800 mt-1">
                        Deposit deduction ₹{b.dispute.deductionAmount}: {b.dispute.deductionReason}
                      </p>
                    )}
                    {b.cancellation?.reason && (
                      <p className="text-xs text-ink/40 mt-1">Cancelled by {b.cancellation.byRole}: {b.cancellation.reason}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-ink mb-1">₹{b.totalAmount}</p>
                    <div className="flex gap-1 justify-end">
                      <StatusBadge value={b.bookingStatus} />
                      <StatusBadge value={b.payment?.status || "unpaid"} />
                    </div>
                  </div>
                </div>

                {(canPay || canCancel) && (
                  <div className="flex gap-2 mt-3">
                    {canPay && (
                      <button
                        disabled={busy === b._id}
                        onClick={() => handlePay(b)}
                        className="bg-brand-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                      >
                        Pay ₹{b.totalAmount}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        disabled={busy === b._id}
                        onClick={() => handleCancel(b)}
                        className="border border-ink/15 text-ink/60 text-sm px-4 py-1.5 rounded-lg hover:bg-ink/5 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
                <BookingHistory history={b.statusHistory} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
