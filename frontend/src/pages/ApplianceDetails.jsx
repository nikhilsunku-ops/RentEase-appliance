import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const ApplianceDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [appliance, setAppliance] = useState(null);
  const [dates, setDates] = useState({ startDate: "", endDate: "" });
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    api.get(`/appliances/${id}`).then(({ data }) => {
      setAppliance(data.data);
      setActiveImage(0);
    });
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/bookings", { applianceId: id, ...dates, deliveryAddress: deliveryAddress || undefined });
      setMessage(
        `Request sent to the owner. Total payable: ₹${data.data.totalAmount} (incl. ₹${data.data.securityDeposit} refundable deposit). Pay from My bookings.`
      );
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed");
    }
  };

  if (!appliance) return <p className="text-center mt-16 text-ink/40 text-sm">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white border border-ink/10 rounded-card overflow-hidden">
        <div className="h-56 bg-brand-50 flex items-center justify-center text-brand-400 text-sm">
          {appliance.images?.[activeImage]?.url ? (
            <img src={appliance.images[activeImage].url} alt={appliance.title} className="h-full w-full object-cover" />
          ) : (
            "No image yet"
          )}
        </div>
        {appliance.images?.length > 1 && (
          <div className="flex gap-2 px-6 pt-4 overflow-x-auto">
            {appliance.images.map((img, i) => (
              <button
                key={img.publicId}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`Show image ${i + 1}`}
                className={`h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 ${
                  i === activeImage ? "border-brand-600" : "border-transparent"
                }`}
              >
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="font-display font-semibold text-2xl text-ink">{appliance.title}</h1>
            <span className="shrink-0 bg-tag-50 text-tag-800 text-sm font-medium px-3 py-1 rounded-full">
              ₹{appliance.rentPricePerMonth}/month
            </span>
          </div>
          <p className="text-ink/50 text-sm mb-4">
            {appliance.location?.city} · {appliance.category?.categoryName} · Listed by {appliance.owner?.name}
          </p>
          <p className="text-ink/80 mb-5">{appliance.description}</p>

          <div className="flex gap-6 text-sm mb-6 pb-6 border-b border-ink/10">
            <div>
              <p className="text-ink/40 text-xs mb-0.5">Security deposit</p>
              <p className="font-medium text-ink">₹{appliance.securityDeposit}</p>
            </div>
            <div>
              <p className="text-ink/40 text-xs mb-0.5">Condition</p>
              <p className="font-medium text-ink capitalize">{appliance.condition}</p>
            </div>
          </div>

          {user?.role === "consumer" ? (
            <form onSubmit={handleBook} className="space-y-3">
              <h2 className="font-medium text-ink">Request a booking</h2>
              {error && <p className="text-sm text-tag-800 bg-tag-50 rounded-lg px-3 py-2">{error}</p>}
              {message && <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">{message}</p>}
              <div className="flex flex-wrap gap-3">
                <input
                  type="date"
                  className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                  value={dates.startDate}
                  onChange={(e) => setDates({ ...dates, startDate: e.target.value })}
                  required
                />
                <input
                  type="date"
                  className="border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                  value={dates.endDate}
                  onChange={(e) => setDates({ ...dates, endDate: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Delivery address (optional)"
                  className="flex-1 min-w-[220px] border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
                <button className="bg-brand-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-brand-700 transition-colors">
                  Request booking
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-ink/40">Log in as a consumer to request a booking.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplianceDetails;
