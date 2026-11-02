import { useEffect, useState } from "react";
import api from "../api/axios";

const tabs = [
  { id: "approvals", label: "Approvals" },
  { id: "listings", label: "Listings" },
  { id: "disputes", label: "Disputes" },
  { id: "analytics", label: "Analytics" },
];

const AdminDashboard = () => {
  const [tab, setTab] = useState("approvals");
  const [pending, setPending] = useState([]);
  const [listings, setListings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [deduction, setDeduction] = useState({});
  const [error, setError] = useState("");

  const loadPending = () => api.get("/admin/pending-approvals").then(({ data }) => setPending(data.data));
  const loadListings = () => api.get("/admin/listings").then(({ data }) => setListings(data.data));
  const loadAnalytics = () => api.get("/admin/analytics").then(({ data }) => setAnalytics(data.data));

  const loadDisputes = () => api.get("/bookings/admin/disputes").then(({ data }) => setDisputes(data.data));

  useEffect(() => {
    setError("");
    if (tab === "approvals") loadPending().catch(() => setError("Failed to load approvals"));
    if (tab === "listings") loadListings().catch(() => setError("Failed to load listings"));
    if (tab === "disputes") loadDisputes().catch(() => setError("Failed to load disputes"));
    if (tab === "analytics") loadAnalytics().catch(() => setError("Failed to load analytics"));
  }, [tab]);

  const handleApproveUser = async (id) => {
    await api.patch(`/admin/users/${id}/approve`);
    loadPending();
  };
  const handleRejectUser = async (id) => {
    await api.patch(`/admin/users/${id}/reject`);
    loadPending();
  };
  const handleToggleListing = async (id) => {
    await api.patch(`/admin/listings/${id}/suspend`);
    loadListings();
  };
  const handleApproveListing = async (id) => {
    await api.patch(`/admin/listings/${id}/approve`);
    loadListings();
  };

  // REQ-22: deduction amount + reason, then the rest of the deposit is refunded
  const handleResolve = async (b) => {
    const d = deduction[b._id] || {};
    setError("");
    try {
      await api.patch(`/bookings/${b._id}/resolve-dispute`, {
        deductionAmount: Number(d.amount || 0),
        reason: d.reason || "",
      });
      loadDisputes();
    } catch (err) {
      setError(err.response?.data?.message || "Could not resolve dispute");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display font-semibold text-2xl text-ink mb-6">Admin</h1>

      <div className="flex gap-2 mb-8 border-b border-ink/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-tag-800 bg-tag-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {tab === "approvals" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
              <p className="text-ink/50">No accounts waiting on approval.</p>
            </div>
          ) : (
            pending.map((u) => (
              <div key={u._id} className="bg-white border border-ink/10 rounded-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{u.name}</p>
                  <p className="text-xs text-ink/50">{u.email} · {u.role}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveUser(u._id)}
                    className="bg-brand-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectUser(u._id)}
                    className="border border-ink/15 text-ink/60 text-sm px-4 py-1.5 rounded-lg hover:bg-ink/5 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "listings" && (
        <div className="space-y-3">
          {listings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
              <p className="text-ink/50">No listings yet.</p>
            </div>
          ) : (
            listings.map((l) => (
              <div key={l._id} className="bg-white border border-ink/10 rounded-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{l.title}</p>
                  <p className="text-xs text-ink/50">
                    {l.owner?.name} · {l.category?.categoryName} · {l.availabilityStatus.replace("_", " ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {l.availabilityStatus === "pending_review" && (
                    <button
                      onClick={() => handleApproveListing(l._id)}
                      className="bg-brand-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {l.availabilityStatus !== "pending_review" && (
                    <button
                      onClick={() => handleToggleListing(l._id)}
                      className="border border-ink/15 text-ink/60 text-sm px-4 py-1.5 rounded-lg hover:bg-ink/5 transition-colors"
                    >
                      {l.availabilityStatus === "suspended" ? "Reinstate" : "Suspend"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "disputes" && (
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
              <p className="text-ink/50">No open damage disputes.</p>
            </div>
          ) : (
            disputes.map((b) => (
              <div key={b._id} className="bg-white border border-ink/10 rounded-card p-4">
                <p className="font-medium text-ink">{b.appliance?.title}</p>
                <p className="text-xs text-ink/50">
                  Owner {b.owner?.name} vs consumer {b.consumer?.name} · deposit ₹{b.securityDeposit}
                </p>
                <p className="text-sm text-ink/70 mt-2">"{b.dispute.reportedNote}"</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <input
                    type="number"
                    min="0"
                    max={b.securityDeposit}
                    placeholder="Deduction ₹"
                    className="w-32 border border-ink/15 rounded-lg px-3 py-1.5 text-sm"
                    onChange={(e) => setDeduction({ ...deduction, [b._id]: { ...deduction[b._id], amount: e.target.value } })}
                  />
                  <input
                    placeholder="Reason for deduction"
                    className="flex-1 min-w-[200px] border border-ink/15 rounded-lg px-3 py-1.5 text-sm"
                    onChange={(e) => setDeduction({ ...deduction, [b._id]: { ...deduction[b._id], reason: e.target.value } })}
                  />
                  <button
                    onClick={() => handleResolve(b)}
                    className="bg-brand-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-brand-700"
                  >
                    Resolve &amp; refund rest
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "analytics" && analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(analytics.usersByRole).map(([role, count]) => (
            <div key={role} className="bg-brand-50 rounded-card p-4">
              <p className="text-xs text-brand-700 mb-1 capitalize">{role}s</p>
              <p className="text-2xl font-display font-semibold text-brand-900">{count}</p>
            </div>
          ))}
          {Object.entries(analytics.listingsByStatus).map(([status, count]) => (
            <div key={status} className="bg-ink/5 rounded-card p-4">
              <p className="text-xs text-ink/50 mb-1 capitalize">{status.replace("_", " ")} listings</p>
              <p className="text-2xl font-display font-semibold text-ink">{count}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
