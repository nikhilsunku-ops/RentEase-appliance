import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useCategories } from "../api/useCategories";

const emptyForm = {
  category: "",
  title: "",
  description: "",
  brand: "",
  model: "",
  rentPricePerMonth: "",
  securityDeposit: "",
  city: "",
};

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const statusStyles = {
  pending_review: "bg-tag-50 text-tag-800",
  available: "bg-brand-50 text-brand-700",
  archived: "bg-ink/5 text-ink/40",
  suspended: "bg-ink/5 text-ink/40",
};

const orderStatusStyles = {
  pending: "bg-tag-50 text-tag-800",
  confirmed: "bg-brand-50 text-brand-700",
  ongoing: "bg-brand-50 text-brand-700",
  completed: "bg-ink/5 text-ink/50",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
};

const ListingCard = ({ listing }) => {
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleOrders = async () => {
    if (!showOrders && orders === null) {
      setLoading(true);
      try {
        const { data } = await api.get(`/bookings/listing/${listing._id}`);
        setOrders(data.data);
      } finally {
        setLoading(false);
      }
    }
    setShowOrders((prev) => !prev);
  };

  return (
    <div className="bg-white border border-ink/10 rounded-card p-4">
      {listing.images?.[0]?.url && (
        <img
          src={listing.images[0].url}
          alt={listing.title}
          className="h-32 w-full object-cover rounded-lg mb-3"
        />
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-ink">{listing.title}</h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
            statusStyles[listing.availabilityStatus] || "bg-ink/5 text-ink/40"
          }`}
        >
          {listing.availabilityStatus.replace("_", " ")}
        </span>
      </div>
      <p className="text-xs text-ink/40 mb-2">{listing.category?.categoryName}</p>
      <p className="text-sm text-tag-800 font-medium mb-3">₹{listing.rentPricePerMonth}/month</p>

      <button
        onClick={toggleOrders}
        className="text-xs font-medium text-brand-700 hover:text-brand-900 transition-colors"
      >
        {showOrders ? "Hide orders" : "View orders"}
      </button>

      {showOrders && (
        <div className="mt-3 pt-3 border-t border-ink/10 space-y-2">
          {loading ? (
            <p className="text-xs text-ink/40">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-xs text-ink/40">No orders on this listing yet.</p>
          ) : (
            orders.map((o) => (
              <div key={o._id} className="bg-paper rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-ink">{o.consumer?.name}</p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                      orderStatusStyles[o.bookingStatus] || "bg-ink/5 text-ink/40"
                    }`}
                  >
                    {o.bookingStatus}
                  </span>
                </div>
                <p className="text-xs text-ink/50">
                  {o.consumer?.email}
                  {o.consumer?.phone ? ` · ${o.consumer.phone}` : ""}
                </p>
                <p className="text-xs text-ink/50 mt-1">
                  {new Date(o.startDate).toLocaleDateString()} — {new Date(o.endDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-ink/40 mt-1">
                  Rent ₹{o.rentAmount} + deposit ₹{o.securityDeposit} = ₹{o.totalAmount}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const OwnerListings = () => {
  const categories = useCategories();
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]); // File objects chosen but not yet uploaded
  const [submitting, setSubmitting] = useState(false);

  // object URLs for the thumbnails; revoked when the selection changes
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file after removing it
    const tooBig = picked.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is larger than 5 MB`);
      return;
    }
    setError("");
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const loadListings = () => api.get("/appliances/my-listings").then(({ data }) => setListings(data.data));

  useEffect(() => {
    loadListings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.category) {
      setError("Choose a category before publishing");
      return;
    }
    setSubmitting(true);
    try {
      // REQ-9: upload photos to Cloudinary (via the API) first, then save the returned {url, publicId}
      let images = [];
      if (files.length > 0) {
        const body = new FormData();
        files.forEach((f) => body.append("images", f));
        const { data: uploaded } = await api.post("/appliances/images", body);
        images = uploaded.data;
      }
      await api.post("/appliances", {
        category: form.category,
        title: form.title,
        description: form.description,
        brand: form.brand,
        model: form.model,
        rentPricePerMonth: Number(form.rentPricePerMonth),
        securityDeposit: Number(form.securityDeposit),
        location: { city: form.city },
        images,
      });
      setForm(emptyForm);
      setFiles([]);
      loadListings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display font-semibold text-2xl text-ink mb-6">My listings</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-card p-6 mb-8 space-y-3">
        <h2 className="font-medium text-ink mb-1">List a new appliance</h2>
        {error && <p className="text-sm text-tag-800 bg-tag-50 rounded-lg px-3 py-2">{error}</p>}

        <select
          className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-400"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
        >
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.categoryName}
            </option>
          ))}
        </select>

        <input
          placeholder="Title, e.g. Instant Pot Duo 6L"
          className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          placeholder="Describe condition, included accessories, pickup notes"
          rows={3}
          className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <div className="flex gap-3">
          <input
            placeholder="Brand"
            className="border border-ink/15 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-brand-400"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <input
            placeholder="Model"
            className="border border-ink/15 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-brand-400"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </div>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Rent per month (₹)"
            className="border border-ink/15 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-brand-400"
            value={form.rentPricePerMonth}
            onChange={(e) => setForm({ ...form, rentPricePerMonth: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Security deposit (₹)"
            className="border border-ink/15 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-brand-400"
            value={form.securityDeposit}
            onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
            required
          />
          <input
            placeholder="City"
            className="border border-ink/15 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-brand-400"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">
            Photos (up to {MAX_IMAGES}, JPEG/PNG/WebP, 5 MB each)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFiles}
            disabled={files.length >= MAX_IMAGES}
            className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {previews.map((src, i) => (
                <div key={src} className="relative h-20 w-20 rounded-lg overflow-hidden border border-ink/10">
                  <img src={src} alt={`Selected ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute top-0.5 right-0.5 bg-ink/70 text-white rounded-full h-5 w-5 text-xs leading-5 text-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          disabled={submitting}
          className="bg-brand-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {submitting ? "Publishing..." : "Publish listing"}
        </button>
      </form>

      {listings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
          <p className="text-ink/50">You haven't listed anything yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listings.map((l) => (
            <ListingCard key={l._id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerListings;
