import { useState } from "react";

// REQ-26: booking status history
const BookingHistory = ({ history = [] }) => {
  const [open, setOpen] = useState(false);
  if (!history.length) return null;
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="text-xs text-brand-700 hover:underline">
        {open ? "Hide history" : `History (${history.length})`}
      </button>
      {open && (
        <ol className="mt-2 space-y-1 border-l border-ink/10 pl-3">
          {history.map((h, i) => (
            <li key={i} className="text-xs text-ink/60">
              <span className="font-medium text-ink/80">{h.status}</span> · {h.note || ""}{" "}
              <span className="text-ink/30">{new Date(h.at).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default BookingHistory;
