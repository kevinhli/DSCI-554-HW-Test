const steps = [
  {
    number: 1,
    title: "Select an Event",
    description:
      "The center circle shows the FOMC decision you've selected — the date, whether it was a rate hike or cut, and by how many basis points (1 basis point = 0.01%).",
  },
  {
    number: 2,
    title: "Read the Rings",
    description:
      "Each ring represents a layer of the economy. Inner rings react within days; outer rings take weeks to months. Ring 1 (innermost) = the Fed's policy action. Ring 2 = treasury yields and stock markets. Ring 3 = mortgage and corporate borrowing costs. Ring 4 (outermost) = jobs and inflation.",
  },
  {
    number: 3,
    title: "Decode the Colors",
    description:
      "Green segments show indicators that increased after the event. Red segments show decreases. Brighter colors mean larger changes. Gray means no data available. Click any segment to see its time-series chart.",
  },
];

const legendItems = [
  { color: "#10b981", label: "Positive change" },
  { color: "#334155", label: "Neutral / no data" },
  { color: "#ef4444", label: "Negative change" },
];

export default function ReadingGuide() {
  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>How to Read This Chart</h3>

      <div style={styles.steps}>
        {steps.map((step) => (
          <div key={step.number} style={styles.step}>
            <div style={styles.numberBadge}>{step.number}</div>
            <div style={styles.stepContent}>
              <div style={styles.stepTitle}>{step.title}</div>
              <div style={styles.stepDesc}>{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.legendBar}>
        {legendItems.map((item) => (
          <div key={item.label} style={styles.legendItem}>
            <div style={{ ...styles.swatch, background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#1a2736",
    border: "1px solid #2a4060",
    borderRadius: 12,
    padding: 20,
  },
  heading: {
    margin: "0 0 16px",
    fontSize: 15,
    fontWeight: 600,
    color: "#e2e8f0",
    letterSpacing: "-0.01em",
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  step: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  numberBadge: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(59, 130, 246, 0.12)",
    color: "#3b82f6",
    fontSize: 24,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  stepDesc: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 1.5,
  },
  legendBar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginTop: 18,
    paddingTop: 14,
    borderTop: "1px solid #2a4060",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#94a3b8",
    fontSize: 12,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
};
