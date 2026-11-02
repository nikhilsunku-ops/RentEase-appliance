import { useEffect, useState } from "react";
import api from "../api/axios";
import ApplianceCard from "../components/ApplianceCard";
import { useCategories } from "../api/useCategories";

const Browse = () => {
  const categories = useCategories();
  const [filters, setFilters] = useState({ keyword: "", category: "", city: "", minPrice: "", maxPrice: "" });
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchResults = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { ...filters, page: pageNum, limit: 12 };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const { data } = await api.get("/appliances", { params });
      setResults(data.data);
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResults(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display font-semibold text-3xl text-ink">Rent what you need,<br />from someone nearby.</h1>
        <p className="text-ink/50 mt-2">Browse appliances listed by owners in your area.</p>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-white border border-ink/10 rounded-card p-4 flex flex-wrap gap-3 mb-8"
      >
        <input
          placeholder="Search title, description, brand..."
          className="border border-ink/15 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-brand-400"
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
        />
        <select
          className="border border-ink/15 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-400"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.categoryName}
            </option>
          ))}
        </select>
        <input
          placeholder="City"
          className="border border-ink/15 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:border-brand-400"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
        />
        <input
          type="number"
          placeholder="Min ₹/month"
          className="border border-ink/15 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:border-brand-400"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max ₹/month"
          className="border border-ink/15 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:border-brand-400"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />
        <button className="bg-brand-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-brand-700 transition-colors">
          Search
        </button>
      </form>

      {loading ? (
        <p className="text-ink/40 text-sm">Loading...</p>
      ) : results.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-ink/15 rounded-card">
          <p className="text-ink/50">No listings match your filters yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {results.map((a) => (
            <ApplianceCard key={a._id} appliance={a} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchResults(p)}
              className={`w-8 h-8 rounded-full text-sm transition-colors ${
                p === page ? "bg-brand-600 text-white" : "bg-white border border-ink/10 text-ink/60"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Browse;
