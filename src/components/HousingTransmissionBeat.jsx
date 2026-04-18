import { T } from "../utils/theme";
import { formatBasisPoints, formatPercent } from "../utils/housingProcessing";

function eventLabel(event) {
  if (!event) return "No event selected";
  if (event.direction === "hold") return "Held rates steady";
  return `${event.direction === "hike" ? "Rate hike" : "Rate cut"} ${formatBasisPoints(event.changePct)}`;
}

export default function HousingTransmissionBeat({
  event,
  mortgageResponse,
  housingSummary,
  horizonLabel,
}) {
  const steps = [
    {
      title: "Fed meeting",
      value: eventLabel(event),
      note: event ? event.dateStr : "Select a meeting",
      color: event?.direction === "hike" ? T.hike : event?.direction === "cut" ? T.cut : T.hold,
    },
    {
      title: "Mortgage rates",
      value: mortgageResponse?.changeLabel || "N/A",
      note: "30Y fixed rate in weeks 2 to 7 after",
      color:
        mortgageResponse?.change == null
          ? T.textDim
          : mortgageResponse.change >= 0
          ? T.hike
          : T.cut,
    },
    {
      title: "Home prices",
      value: formatPercent(housingSummary?.medianChange),
      note: `Median LA neighborhood ${horizonLabel.toLowerCase()}`,
      color:
        housingSummary?.medianChange == null
          ? T.textDim
          : housingSummary.medianChange >= 0
          ? T.positive
          : T.negative,
    },
  ];

  return (
    <section className="dashboard-surface dash-card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>How it reached LA</div>
          <div style={styles.copy}>
            Fed first, mortgages next, neighborhoods later.
          </div>
        </div>
      </div>

      <div style={styles.trackWrap}>
        <div style={styles.trackLine} />
        <div style={styles.pulse} />

        {steps.map((step, index) => (
          <div key={step.title} style={styles.step}>
            <div style={{ ...styles.node, borderColor: step.color, boxShadow: `0 0 0 1px ${step.color}22` }}>
              <span style={{ ...styles.nodeDot, background: step.color }} />
              <span style={styles.nodeTitle}>{step.title}</span>
              <strong style={styles.nodeValue}>{step.value}</strong>
              <span style={styles.nodeNote}>{step.note}</span>
            </div>

            {index < steps.length - 1 && (
              <span style={styles.lagLabel}>
                {index === 0 ? "~4 to 8 weeks" : `~${horizonLabel.toLowerCase()}`}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  card: {
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 10,
  },
  title: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    marginBottom: 4,
  },
  copy: {
    color: T.textSecondary,
    fontSize: 11.5,
    lineHeight: 1.35,
    maxWidth: 520,
  },
  trackWrap: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  trackLine: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: 54,
    height: 1,
    background: `linear-gradient(90deg, transparent, ${T.cardBorder}, transparent)`,
  },
  pulse: {
    position: "absolute",
    top: 48,
    left: "10%",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: `${T.accent}`,
    boxShadow: `0 0 0 6px ${T.accentGlow}`,
    animation: "beatTravel 4.8s ease-in-out infinite",
  },
  step: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  node: {
    position: "relative",
    minHeight: 96,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "12px 14px 12px 16px",
    borderRadius: 14,
    border: `1px solid ${T.cardBorder}`,
    background: `linear-gradient(135deg, ${T.cardBg}, ${T.cardBgAlt})`,
    transition: "transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  nodeTitle: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  nodeValue: {
    color: T.textPrimary,
    fontSize: 18,
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
    minHeight: 38,
    display: "flex",
    alignItems: "center",
  },
  nodeNote: {
    color: T.textSecondary,
    fontSize: 11,
    lineHeight: 1.35,
    marginTop: "auto",
  },
  lagLabel: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textAlign: "center",
  },
};
