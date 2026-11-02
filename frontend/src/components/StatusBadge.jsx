const styles = {
  pending: "bg-tag-50 text-tag-800",
  confirmed: "bg-brand-50 text-brand-700",
  ongoing: "bg-brand-50 text-brand-700",
  completed: "bg-ink/5 text-ink/50",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
  paid: "bg-brand-50 text-brand-700",
  unpaid: "bg-tag-50 text-tag-800",
  refunded: "bg-ink/5 text-ink/50",
  partially_refunded: "bg-ink/5 text-ink/50",
  assigned: "bg-tag-50 text-tag-800",
  on_the_way: "bg-brand-50 text-brand-700",
  arrived: "bg-brand-50 text-brand-700",
  done: "bg-ink/5 text-ink/50",
};

const StatusBadge = ({ value }) => (
  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[value] || "bg-ink/5 text-ink/40"}`}>
    {String(value).replace(/_/g, " ")}
  </span>
);

export default StatusBadge;
