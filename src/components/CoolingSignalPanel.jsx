import { T } from "../utils/theme";
import {
  formatPercent,
  formatShare,
} from "../utils/housingProcessing";

function slowdownLabel(share) {
  if (share == null) return "Signal unavailable";
  if (share >= 0.65) return "Widespread slowdown";
  if (share >= 0.4) return "Some slowdown";
  return "Very little slowdown";
}

export default function CoolingSignalPanel({
  animationKey,
  summary,
  forecast,
  mortgageResponse,
  horizonLabel,
}) {
  if (!summary) return null;

  const actualShare = Math.max(0, Math.min(1, summary.coolingShare ?? 0));
  const forecastShare =
    forecast?.predictedCoolingShare == null
      ? null
      : Math.max(0, Math.min(1, forecast.predictedCoolingShare));

  return (
    <section className="dashboard-surface dash-card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>How many neighborhoods slowed down?</div>
          <div style={styles.copy}>
            This answers a simple question: after the Fed meeting, what share of
            neighborhoods were growing more slowly than they were before?
          </div>
        </div>
        <div style={styles.badge}>{slowdownLabel(actualShare)}</div>
      </div>

      <div style={styles.mainRow}>
        <div style={styles.bigStat}>
          <span style={styles.bigLabel}>Neighborhoods slowing down</span>
          <strong style={styles.bigValue}>{formatShare(actualShare)}</strong>
          <span style={styles.bigNote}>{horizonLabel} after the meeting</span>
        </div>

        <div style={styles.gaugeWrap}>
          <div style={styles.gaugeLabels}>
            <span style={styles.gaugeEdge}>Few neighborhoods slowed</span>
            <span style={styles.gaugeEdge}>Most neighborhoods slowed</span>
          </div>
          <div style={styles.gaugeTrack}>
            <div
              key={`cooling-gauge-${animationKey || "base"}`}
              style={{
                ...styles.gaugeFill,
                width: `${actualShare * 100}%`,
                animation: `chartBarGrow 520ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both`,
              }}
            />
            {forecastShare != null && (
              <div
                key={`cooling-marker-${animationKey || "base"}`}
                style={{
                  ...styles.forecastMarker,
                  left: `calc(${forecastShare * 100}% - 1px)`,
                  animation: `chartMarkerReveal 360ms ease 260ms both`,
                }}
                title={`Model marker: ${formatShare(forecastShare)}`}
              />
            )}
          </div>
          <div style={styles.gaugeLegend}>
            <span style={styles.legendItem}>
              <span style={styles.legendSwatch} />
              Actual
            </span>
            <span style={styles.legendItem}>
              <span style={styles.legendRule} />
              Model marker
            </span>
          </div>
        </div>
      </div>

      <div style={styles.statGrid}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Typical neighborhood move</span>
          <strong style={styles.statValue}>{formatPercent(summary.medianChange)}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Mortgage move</span>
          <strong style={styles.statValue}>{mortgageResponse?.changeLabel || "Pending"}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Model expectation</span>
          <strong style={styles.statValue}>
            {forecast ? formatShare(forecast.predictedCoolingShare) : "Not enough analogs"}
          </strong>
        </div>
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
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
    lineHeight: 1.45,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
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
  mainRow: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 170px) minmax(0, 1fr)",
    gap: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  bigStat: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  bigLabel: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  bigValue: {
    color: T.textPrimary,
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },
  bigNote: {
    color: T.textSecondary,
    fontSize: 11,
    lineHeight: 1.35,
  },
  gaugeWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  gaugeLabels: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  },
  gaugeEdge: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
  },
  gaugeTrack: {
    position: "relative",
    height: 16,
    borderRadius: 999,
    overflow: "hidden",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${T.cardBorder}`,
  },
  gaugeFill: {
    position: "absolute",
    inset: 0,
    width: "0%",
    background: "linear-gradient(90deg, #315b9b 0%, #22d3ee 100%)",
    borderRadius: 999,
    transformOrigin: "left center",
    transition: "width 420ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  forecastMarker: {
    position: "absolute",
    top: -3,
    bottom: -3,
    width: 2,
    borderRadius: 999,
    background: "#f59e0b",
    boxShadow: "0 0 0 2px rgba(245, 158, 11, 0.18)",
    transition: "left 420ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  gaugeLegend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: T.textSecondary,
    fontSize: 10.5,
    fontWeight: 700,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
    display: "inline-block",
    background: "linear-gradient(90deg, #315b9b 0%, #22d3ee 100%)",
  },
  legendRule: {
    width: 2,
    height: 12,
    borderRadius: 999,
    display: "inline-block",
    background: "#f59e0b",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "8px 10px",
    borderRadius: 11,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
  },
  statLabel: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  statValue: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    lineHeight: 1.35,
  },
};
