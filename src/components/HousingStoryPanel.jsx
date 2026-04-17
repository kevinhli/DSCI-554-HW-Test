import { T } from "../utils/theme";
import { formatBasisPoints, formatPercent } from "../utils/housingProcessing";

function describeFedMove(event) {
  if (!event) return "Pick a meeting to start.";
  if (event.direction === "hold") {
    return `${event.dateStr} was a hold, but Fed language can still move borrowing expectations.`;
  }
  return `${event.dateStr} delivered a ${event.direction} of ${formatBasisPoints(event.changePct)}.`;
}

function describeMortgage(event, mortgageResponse) {
  if (!event || mortgageResponse?.change == null) {
    return "Mortgage-rate follow-through is not available for this meeting yet.";
  }

  if (event.direction === "hike") {
    return `Mortgage rates moved ${mortgageResponse.changeLabel.toLowerCase()} because lenders quickly reprice expected funding and Treasury yields.`;
  }

  if (event.direction === "cut") {
    return `Mortgage rates moved ${mortgageResponse.changeLabel.toLowerCase()} as financing expectations eased after the Fed cut.`;
  }

  return `Mortgage rates still moved ${mortgageResponse.changeLabel.toLowerCase()} even though the Fed held, which usually means markets repriced the statement or outlook.`;
}

function describeHousing(summary, horizonLabel) {
  if (!summary) return "Neighborhood price responses are not available for this horizon.";
  return `${horizonLabel} later, the median Los Angeles neighborhood moved ${formatPercent(
    summary.medianChange
  )}, and ${Math.round(summary.coolingShare * 100)}% of neighborhoods were growing more slowly than before the meeting.`;
}

export default function HousingStoryPanel({
  event,
  mortgageResponse,
  summary,
  horizonLabel,
}) {
  const takeaway =
    summary?.medianChange == null
      ? "No clear housing takeaway yet."
      : summary.medianAcceleration < 0
      ? "The cleaner signal is usually slower appreciation, not immediate neighborhood-wide price drops."
      : "This meeting did not line up with broad LA cooling, which suggests local demand, supply, or timing effects outweighed tighter policy.";

  return (
    <section className="dashboard-surface dash-card" style={styles.card}>
      <div style={styles.header}>
          <div style={styles.title}>Why neighborhoods react</div>
        <div style={styles.takeawayBadge}>Quick read</div>
      </div>

      <div style={styles.stack}>
        <div style={styles.block}>
          <span style={styles.label}>Policy</span>
          <p style={styles.body}>{describeFedMove(event)}</p>
        </div>

        <div style={styles.block}>
          <span style={styles.label}>Mortgages</span>
          <p style={styles.body}>{describeMortgage(event, mortgageResponse)}</p>
        </div>

        <div style={styles.block}>
          <span style={styles.label}>Housing</span>
          <p style={styles.body}>{describeHousing(summary, horizonLabel)}</p>
        </div>
      </div>

      <div style={styles.takeaway}>
        <span style={styles.takeawayLabel}>Takeaway</span>
        <p style={styles.takeawayText}>{takeaway}</p>
      </div>
    </section>
  );
}

const styles = {
  card: {
    padding: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  takeawayBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 26,
    padding: "0 10px",
    borderRadius: 999,
    border: `1px solid ${T.cardBorder}`,
    color: T.textSecondary,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: "rgba(255,255,255,0.03)",
  },
  stack: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
  },
  block: {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
  },
  label: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  body: {
    margin: "4px 0 0",
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.45,
  },
  takeaway: {
    marginTop: 10,
    padding: "11px 12px",
    borderRadius: 12,
    background: `linear-gradient(135deg, ${T.cardBgActive}, ${T.cardBgAlt})`,
    border: `1px solid ${T.cardBorder}`,
  },
  takeawayLabel: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  takeawayText: {
    margin: "4px 0 0",
    color: T.textPrimary,
    fontSize: 12,
    lineHeight: 1.45,
  },
};
