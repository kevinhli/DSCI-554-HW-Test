import { scaleLinear } from "d3";
import { T } from "../utils/theme";
import { formatPercent, formatShare } from "../utils/housingProcessing";

const VB_W = 420;
const VB_H = 180;
const MARGIN = { top: 28, right: 18, bottom: 30, left: 18 };
const INNER_W = VB_W - MARGIN.left - MARGIN.right;

export default function HousingForecastPanel({
  event,
  forecast,
  summary,
  horizonLabel,
}) {
  if (!event || !forecast) return null;

  const values = [
    forecast.lowerBound,
    forecast.upperBound,
    forecast.predictedMedianChange,
    summary?.medianChange,
    ...forecast.analogs.map((analog) => analog.summary.medianChange),
  ].filter((value) => value != null && !Number.isNaN(value));
  const minValue = Math.min(...values) - 0.8;
  const maxValue = Math.max(...values) + 0.8;
  const x = scaleLinear().domain([minValue, maxValue]).range([0, INNER_W]);

  return (
    <section className="dashboard-surface dash-card" style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>What similar meetings suggested</div>
        <div style={styles.badge}>{forecast.confidenceLabel}</div>
      </div>

      <p style={styles.copy}>
        This forecast looks at the closest earlier meetings, then estimates what a
        typical housing response usually looks like
        {` ${horizonLabel.toLowerCase()} later.`}
      </p>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Model forecast</span>
          <strong style={styles.statValue}>
            {formatPercent(forecast.predictedMedianChange)}
          </strong>
          <span style={styles.statNote}>Typical state home-price change</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Chance growth slows</span>
          <strong style={styles.statValue}>
            {formatShare(forecast.predictedCoolingShare)}
          </strong>
          <span style={styles.statNote}>States likely to cool versus before</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <line
            x1={0}
            x2={INNER_W}
            y1={74}
            y2={74}
            stroke={T.cardBorderLight}
            strokeOpacity={0.7}
          />
          <line
            x1={x(forecast.lowerBound)}
            x2={x(forecast.upperBound)}
            y1={74}
            y2={74}
            stroke={T.cardBorder}
            strokeWidth="8"
            strokeLinecap="round"
          />

          {forecast.analogs.map((analog, index) => (
            <g key={analog.event.dateStr} transform={`translate(${x(analog.summary.medianChange)},${28 + index * 16})`}>
              <circle
                r={Math.max(3.5, 7 - index * 0.6)}
                fill={T.accent}
                opacity={Math.max(0.4, 0.92 - index * 0.1)}
              />
              <text
                x={10}
                y={4}
                fill={T.textDim}
                fontSize="10"
              >
                {analog.event.dateStr}
              </text>
            </g>
          ))}

          <line
            x1={x(forecast.predictedMedianChange)}
            x2={x(forecast.predictedMedianChange)}
            y1={58}
            y2={104}
            stroke={T.accent}
            strokeWidth="2.6"
          />
          <text
            x={x(forecast.predictedMedianChange)}
            y={120}
            textAnchor="middle"
            fill={T.textPrimary}
            fontSize="10"
            fontWeight="700"
          >
            Model
          </text>

          {summary?.medianChange != null && (
            <>
              <line
                x1={x(summary.medianChange)}
                x2={x(summary.medianChange)}
                y1={58}
                y2={104}
                stroke={T.positive}
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <text
                x={x(summary.medianChange)}
                y={136}
                textAnchor="middle"
                fill={T.textSecondary}
                fontSize="10"
                fontWeight="700"
              >
                Actual
              </text>
            </>
          )}

          <text x={0} y={152} fill={T.textDim} fontSize="10">
            {formatPercent(minValue)}
          </text>
          <text x={INNER_W} y={152} textAnchor="end" fill={T.textDim} fontSize="10">
            {formatPercent(maxValue)}
          </text>
        </g>
      </svg>

      <div style={styles.caption}>
        Forecast band {formatPercent(forecast.lowerBound)} to {formatPercent(forecast.upperBound)} based on the six closest historical analogs.
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
    gap: 12,
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.03em",
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
  copy: {
    margin: "0 0 10px",
    color: T.textSecondary,
    fontSize: 11.5,
    lineHeight: 1.45,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    marginBottom: 10,
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
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  statNote: {
    color: T.textSecondary,
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  caption: {
    marginTop: 4,
    color: T.textDim,
    fontSize: 10.5,
    lineHeight: 1.45,
  },
};
