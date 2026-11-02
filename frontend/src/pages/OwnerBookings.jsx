import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import BookingHistory from "../components/BookingHistory";

const OwnerBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [techs, setTechs] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = () => api.get("/bookings/my-bookings").then(({ data }) => setBookings(data.data));

  useEffect(() => {
    if (user?.role !== "owner") return;
    load();
    api.get("/technicians").then(({ data }) => setTechs(data.data));
  }, [user]);

  const run = async (fn, okText) => {
    setMsg({ type: "", text: "" });
    try {
      await fn();
      setMsg({ type: "ok", text: okText });
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Action failed" });
    }
  };

  const act = (id, action, body, okText) => run(() => api.patch(`/bookings/${id}/${action}`, body), okText);
  const reject = (b) => {
    const reason = window.prompt("Reason for rejecting?");
    if (reason) act(b._id, "reject", { reason }, "Booking rejected.");
  };
  const cancel = (b) => {
    const reason = window.prompt("Reason for cancelling?");
    if (reason) act(b._id, "cancel", { reason }, "Booking cancelled; consumer refunded.");
  };
  const damage = (b) => {
    const note = window.prompt("Describe the damage");
    if (note) run(() => api.post(`/bookings/${b._id}/report-damage`, { note }), "Damage reported; admin will review.");
  };

  if (user && user.role !== "owner") {
    return <p className="text-center mt-16 text-ink/40 text-sm">This page is for Owners.</p>;
  }

  const btn = "text-sm px-3 py-1.5 rounded-lg";
  const primary = `${btn} bg-brand-600 text-white hover:bg-brand-700`;
  const ghost = `${btn} border border-ink/15 text-ink/60 hover:bg-ink/5`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display font-semibold text-2xl text-ink mb-6">Booking requests</h1>
      {msg.text && (
        <p className={`text-sm rounded-lg px-3 py-2 mb-4 ${msg.type === "ok" ? "text-brand-700 bg-brand-50" : "text-tag-800 bg-tag-50"}`}>
          {msg.text}
        </p>
      )}
      {bookings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
          <p className="text-ink/50">No bookings on your listings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const s = b.bookingStatus;
            return (
              <div key={b._id} className="bg-white border border-ink/10 rounded-card p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-ink">{b.appliance?.title}</h3>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {b.consumer?.name} · {b.consumer?.phone || b.consumer?.email}
                    </p>
                    <p className="text-xs text-ink/40">
                      {new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}
                    </p>
                    {b.deliveryAddress && <p className="text-xs text-ink/50 mt-1">Deliver to: {b.deliveryAddress}</p>}
                    {b.dispute?.reported && !b.dispute.resolved && (
                      <p className="text-xs text-tag-800 mt-1">Damage report open: {b.dispute.reportedNote}</p>
                    )}
                    {b.technician && (
                      <p className="text-xs text-ink/50 mt-1">
                        Technician: {b.technician.name} · <StatusBadge value={b.technicianStatus} />
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-ink mb-1">₹{b.totalAmount}</p>
                    <div className="flex gap-1 justify-end">
                      <StatusBadge value={s} />
                      <StatusBadge value={b.payment?.status || "unpaid"} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {s === "pending" && (
                    <>
                      <button className={primary} onClick={() => act(b._id, "confirm", {}, "Booking confirmed.")}>Confirm</button>
                      <button className={ghost} onClick={() => reject(b)}>Reject</button>
                    </>
                  )}
                  {s === "confirmed" && (
                    <>
                      <button
                        className={primary}
                        disabled={b.payment?.status !== "paid"}
                        title={b.payment?.status !== "paid" ? "Waiting for consumer payment" : ""}
                        onClick={() => act(b._id, "start", {}, "Rental started.")}
                      >
                        Mark handed over
                      </button>
                      <select
                        className="border border-ink/15 rounded-lg px-2 py-1.5 text-sm"
                        defaultValue=""
                        onChange={(e) =>
                          e.target.value &&
                          act(b._id, "assign-technician", { technicianId: e.target.value }, "Technician assigned.")
                        }
                      >
                        <option value="">{b.technician ? "Reassign technician…" : "Assign technician…"}</option>
                        {techs.map((t) => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                  {s === "ongoing" && (
                    <>
                      <button className={primary} onClick={() => act(b._id, "complete", {}, "Completed; deposit refunded.")}>
                        Mark returned / complete
                      </button>
                      <button className={ghost} onClick={() => damage(b)}>Report damage</button>
                    </>
                  )}
                  {["pending", "confirmed"].includes(s) && <button className={ghost} onClick={() => cancel(b)}>Cancel</button>}
                </div>
                <BookingHistory history={b.statusHistory} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerBookings;
