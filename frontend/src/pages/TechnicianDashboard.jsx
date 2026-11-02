import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";

const NEXT = { assigned: "on_the_way", on_the_way: "arrived", arrived: "done" };
const LABEL = { on_the_way: "Start trip", arrived: "I've arrived", done: "Mark job done" };

const TechnicianDashboard = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");

  const load = () => api.get("/technician/jobs").then(({ data }) => setJobs(data.data));
  useEffect(() => {
    if (user?.role === "technician") load();
  }, [user]);

  const advance = async (job) => {
    setError("");
    try {
      await api.patch(`/technician/jobs/${job._id}/status`, { status: NEXT[job.technicianStatus] });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  const openDirections = async (job) => {
    setError("");
    try {
      const { data } = await api.get(`/technician/jobs/${job._id}/directions`);
      window.open(data.data.url, "_blank", "noopener");
    } catch (err) {
      setError(err.response?.data?.message || "No directions available");
    }
  };

  if (user && user.role !== "technician") {
    return <p className="text-center mt-16 text-ink/40 text-sm">This page is for Technicians.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display font-semibold text-2xl text-ink mb-6">My jobs</h1>
      {error && <p className="text-sm text-tag-800 bg-tag-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
      {jobs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
          <p className="text-ink/50">No jobs assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j._id} className="bg-white border border-ink/10 rounded-card p-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-medium text-ink">{j.appliance?.title}</h3>
                  <p className="text-xs text-ink/50 mt-1">
                    Pick up: {j.owner?.name} · {j.appliance?.location?.address || j.appliance?.location?.city}
                  </p>
                  <p className="text-xs text-ink/50">
                    Deliver to: {j.consumer?.name} · {j.consumer?.phone || "no phone"}
                  </p>
                  <p className="text-xs text-ink/70 mt-1">{j.deliveryAddress || "No address given"}</p>
                  <p className="text-xs text-ink/40 mt-1">Rental starts {new Date(j.startDate).toLocaleDateString()}</p>
                </div>
                <StatusBadge value={j.technicianStatus} />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openDirections(j)} className="border border-ink/15 text-ink/60 text-sm px-3 py-1.5 rounded-lg hover:bg-ink/5">
                  Directions
                </button>
                {NEXT[j.technicianStatus] && (
                  <button onClick={() => advance(j)} className="bg-brand-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-700">
                    {LABEL[NEXT[j.technicianStatus]]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboard;
