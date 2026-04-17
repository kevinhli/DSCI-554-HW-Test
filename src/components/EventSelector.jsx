const dirStyle = {
  hike: { color: "#f87171", label: "▲" },
  cut: { color: "#34d399", label: "▼" },
  hold: { color: "#94a3b8", label: "●" },
};

export default function EventSelector({ events, selected, onSelect }) {
  if (!events) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <label
        style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em" }}
      >
        FOMC EVENT
      </label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          background: "#1a2736",
          color: "#e2e8f0",
          border: "1px solid #2a4060",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 14,
          fontWeight: 500,
          minWidth: 280,
          cursor: "pointer",
        }}
      >
        {events.map((ev) => {
          const d = dirStyle[ev.direction] || dirStyle.hold;
          return (
            <option key={ev.dateStr} value={ev.dateStr}>
              {d.label} {ev.dateStr} — {ev.direction.toUpperCase()} (
              {ev.changePct > 0 ? "+" : ""}
              {(ev.changePct * 100).toFixed(0)} bps)
            </option>
          );
        })}
      </select>
    </div>
  );
}
