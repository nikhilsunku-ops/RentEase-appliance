import { Link } from "react-router-dom";

const ApplianceCard = ({ appliance }) => (
  <Link
    to={`/appliances/${appliance._id}`}
    className="group relative block bg-white rounded-card border border-ink/10 hover:border-brand-200 hover:shadow-sm transition-all p-4"
  >
    <span className="absolute top-3 right-3 bg-tag-50 text-tag-800 text-xs font-medium px-2.5 py-1 rounded-full">
      ₹{appliance.rentPricePerMonth}/month
    </span>

    <div className="h-32 bg-brand-50 rounded-lg mb-3 flex items-center justify-center text-brand-400 text-xs overflow-hidden">
      {appliance.images?.[0]?.url ? (
        <img
          src={appliance.images[0].url}
          alt={appliance.title}
          className="h-full w-full object-cover"
        />
      ) : (
        "No image yet"
      )}
    </div>

    <h3 className="font-medium text-ink group-hover:text-brand-700 transition-colors">
      {appliance.title}
    </h3>
    <p className="text-xs text-ink/50 mt-0.5 mb-2">
      {appliance.location?.city} · {appliance.category?.categoryName}
    </p>
    <p className="text-xs text-ink/40">Deposit ₹{appliance.securityDeposit}</p>
  </Link>
);

export default ApplianceCard;
