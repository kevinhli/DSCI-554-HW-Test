import { ALL_INDICATORS } from "../utils/indicators";
import { T } from "../utils/theme";

const CASCADE = ALL_INDICATORS.filter((indicator) => indicator.cascade);
const FONT =
  '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif';

function formatValue(changeInfo, unit) {
  const value = changeInfo?.change ?? null;
  if (value == null || Number.isNaN(value)) return "N/A";
  const sign = value >= 0 ? "+" : "";
  if (unit === "percent" || changeInfo?.changeType === "pp") {
    return `${sign}${Number(value).toFixed(2)} pp`;
  }
  return `${sign}${Number(value).toFixed(1)}%`;
}

function valueColor(changeInfo) {
  const value = changeInfo?.change;
  if (value == null || Number.isNaN(value)) return T.textDim;
  return value >= 0 ? T.positive : T.negative;
}

function getChange(changes, key) {
  if (!changes) return null;
  return changes.find((changeInfo) => changeInfo.key === key) ?? null;
}

function EventSummary({ event, changes }) {
  if (!event || !changes) {
    return (
      <div style={styles.summaryCard}>
        <span style={styles.summaryEmpty}>Select an event to compare</span>
      </div>
    );
  }

  const standout = changes
    .filter((changeInfo) => changeInfo.change != null)
    .sort((left, right) => Math.abs(right.change) - Math.abs(left.change))[0];

  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryDate}>{event.dateStr}</div>
      <div style={styles.summaryDirection}>
        {event.direction.toUpperCase()}{" "}
        {event.direction === "hold"
          ? "(0 bps)"
          : `(${event.changePct > 0 ? "+" : ""}${Math.round(
              event.changePct * 100
            )} bps)`}
      </div>
      <div style={styles.summaryMetric}>
        Rate after: <strong>{event.rateAfter}%</strong>
      </div>
      <div style={styles.summaryMetric}>
        Top move:{" "}
        <strong>{standout ? standout.label : "Not available"}</strong>
      </div>
    </div>
  );
}

export default function EventComparison({
  changes,
  compareChanges,
  event,
  compareEvent,
  events,
  compareDate,
  onCompareSelect,
}) {
  return (
    <section
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 16,
        padding: 20,
        fontFamily: FONT,
        animation: "fadeSlideIn 300ms ease both",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <span style={styles.kicker}>Comparison mode</span>
          <div style={styles.title}>Event comparison</div>
        </div>

        <select
          value={compareDate || ""}
          onChange={(eventValue) => onCompareSelect(eventValue.target.value)}
          style={styles.select}
          aria-label="Choose a comparison event"
        >
          <option value="">Choose an event</option>
          {events
            ?.filter((candidate) => candidate.dateStr !== event?.dateStr)
            .map((candidate) => (
              <option key={candidate.dateStr} value={candidate.dateStr}>
                {candidate.dateStr} | {candidate.direction} |{" "}
                {Math.round(Math.abs(candidate.changePct) * 100)} bps
              </option>
            ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <EventSummary event={event} changes={changes} />
        <EventSummary event={compareEvent} changes={compareChanges} />
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={styles.rowGrid}>
          <div style={styles.headerCell}>Indicator</div>
          <div style={styles.headerCell}>Selected event</div>
          <div style={styles.headerCell}>Delta</div>
          <div style={styles.headerCell}>Compared event</div>

          {CASCADE.map((indicator) => {
            const left = getChange(changes, indicator.key);
            const right = getChange(compareChanges, indicator.key);
            const difference =
              left?.change != null && right?.change != null
                ? left.change - right.change
                : null;

            return (
              <div key={indicator.key} style={{ display: "contents" }}>
                <div style={styles.indicatorCell}>{indicator.label}</div>
                <div style={{ ...styles.valueCell, color: valueColor(left) }}>
                  {formatValue(left, indicator.unit)}
                </div>
                <div
                  style={{
                    ...styles.valueCell,
                    color:
                      difference == null
                        ? T.textDim
                        : difference >= 0
                        ? T.positive
                        : T.negative,
                  }}
                >
                  {difference == null
                    ? "N/A"
                    : `${difference >= 0 ? "+" : ""}${difference.toFixed(
                        indicator.unit === "percent" ? 2 : 1
                      )}${indicator.unit === "percent" ? " pp" : "%"}`}
                </div>
                <div style={{ ...styles.valueCell, color: valueColor(right) }}>
                  {formatValue(right, indicator.unit)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const styles = {
  kicker: {
    display: "block",
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  select: {
    background: T.cascadeBg,
    color: T.textPrimary,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 12,
    minHeight: 40,
    padding: "0 14px",
    fontSize: 12,
    fontFamily: FONT,
    cursor: "pointer",
    outline: "none",
  },
  summaryCard: {
    background: `linear-gradient(135deg, ${T.cascadeBg}, ${T.cardBgAlt})`,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  summaryEmpty: {
    color: T.textDim,
    fontSize: 13,
    fontStyle: "italic",
  },
  summaryDate: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: 700,
  },
  summaryDirection: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  summaryMetric: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  rowGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 1fr) repeat(3, minmax(120px, 1fr))",
    minWidth: 620,
  },
  headerCell: {
    color: T.textDim,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    paddingBottom: 10,
  },
  indicatorCell: {
    color: T.textPrimary,
    fontSize: 12,
    fontWeight: 700,
    padding: "10px 8px 10px 0",
    borderTop: `1px solid ${T.cardBorderLight}`,
  },
  valueCell: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    textAlign: "center",
    padding: "10px 6px",
    borderTop: `1px solid ${T.cardBorderLight}`,
  },
};
