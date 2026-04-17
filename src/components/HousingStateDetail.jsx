import { extent, line, scaleLinear } from "d3";
import { T } from "../utils/theme";
import { formatPercent } from "../utils/housingProcessing";

const VB_W = 420;
const VB_H = 196;
const MARGIN = { top: 18, right: 18, bottom: 34, left: 38 };
const INNER_W = VB_W - MARGIN.left - MARGIN.right;
const INNER_H = VB_H - MARGIN.top - MARGIN.bottom;

function buildNarrative(response) {
  if (!response) return "Select a neighborhood on the map to inspect its price path.";

  if (response.acceleration <= -1) {
    return "This neighborhood cooled meaningfully after the meeting compared with its earlier home-price growth pace.";
  }

  if (response.acceleration >= 1) {
    return "This neighborhood did not slow much after the meeting, suggesting local demand or supply stayed firmer than average.";
  }

  return "This neighborhood tracked the middle of the Los Angeles response without a sharp break from its earlier pace.";
}

export default function HousingStateDetail({
  animationKey,
  response,
  stateSeries,
  benchmarkSeries,
  horizonLabel,
}) {
  const allValues = [...(stateSeries || []), ...(benchmarkSeries || [])].map((point) => point.value);
  const yExtent = extent(allValues);
  const yMin = (yExtent[0] ?? 98.5) - 0.35;
  const yMax = (yExtent[1] ?? 101.5) + 0.35;
  const offsetExtent = extent([...(stateSeries || []), ...(benchmarkSeries || [])], (point) => point.offset);
  const minOffset = offsetExtent[0] ?? -6;
  const maxOffset = offsetExtent[1] ?? 12;
  const x = scaleLinear().domain([minOffset, maxOffset]).range([0, INNER_W]);
  const y = scaleLinear().domain([yMin, yMax]).range([INNER_H, 0]);
  const xTicks = [minOffset, -3, 0, 3, 6, 9, maxOffset]
    .filter((value, index, arr) => value >= minOffset && value <= maxOffset && arr.indexOf(value) === index)
    .sort((left, right) => left - right);

  const statePath = line()
    .x((point) => x(point.offset))
    .y((point) => y(point.value))(stateSeries || []);

  const benchmarkPath = line()
    .x((point) => x(point.offset))
    .y((point) => y(point.value))(benchmarkSeries || []);

  return (
    <section className="dashboard-surface dash-card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>{response ? response.stateName : "Neighborhood focus"}</div>
          <div style={styles.copy}>{buildNarrative(response)}</div>
        </div>
      </div>

      {response ? (
        <>
          <div style={styles.stats}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Price change after meeting</span>
              <strong style={styles.statValue}>{formatPercent(response.changePct)}</strong>
              <span style={styles.statNote}>{response.baselineMonth || response.baselineQuarter} to {response.targetMonth || response.targetQuarter}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Growth pace change</span>
              <strong style={styles.statValue}>{formatPercent(response.acceleration)}</strong>
              <span style={styles.statNote}>Compared with the same number of months before the meeting</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Compared with typical LA neighborhood</span>
              <strong style={styles.statValue}>{formatPercent(response.relativeToMedian)}</strong>
              <span style={styles.statNote}>{horizonLabel.toLowerCase()} after the meeting</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {y.ticks(4).map((tick) => (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={INNER_W}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke={T.cardBorderLight}
                    strokeOpacity={0.45}
                  />
                  <text x={-10} y={y(tick) + 4} textAnchor="end" fill={T.textDim} fontSize="10">
                    {tick}
                  </text>
                </g>
              ))}

              <line
                x1={x(0)}
                x2={x(0)}
                y1={0}
                y2={INNER_H}
                stroke={T.textMuted}
                strokeDasharray="4 4"
              />

              <path
                key={`benchmark-path-${animationKey || "base"}`}
                d={benchmarkPath || undefined}
                fill="none"
                stroke={T.textSecondary}
                strokeWidth="1.8"
                strokeDasharray="5 4"
                style={{
                  animation: `chartFadeUp 360ms cubic-bezier(0.22, 1, 0.36, 1) 60ms both`,
                }}
              />

              <path
                key={`state-path-${animationKey || "base"}`}
                d={statePath || undefined}
                fill="none"
                stroke={T.accent}
                strokeWidth="2.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset="1"
                style={{
                  animation: `chartLineDraw 720ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both`,
                }}
              />

              {xTicks.map((offset) => (
                <g key={offset} transform={`translate(${x(offset)},${INNER_H})`}>
                  <line y2="6" stroke={T.cardBorder} />
                  <text y="20" textAnchor="middle" fill={T.textDim} fontSize="10">
                    {offset === 0 ? "Event" : `${offset > 0 ? "+" : ""}${offset}m`}
                  </text>
                </g>
              ))}
            </g>
          </svg>

          <div style={styles.legend}>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: T.accent }} />
              Selected neighborhood
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: T.textSecondary, borderStyle: "dashed" }} />
              Typical LA path
            </span>
          </div>
        </>
      ) : (
        <div style={styles.empty}>Select a neighborhood on the map to inspect its home-price path.</div>
      )}
    </section>
  );
}

const styles = {
  card: {
    padding: 16,
  },
  header: {
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
    lineHeight: 1.45,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
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
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  statNote: {
    color: T.textSecondary,
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 6,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: 700,
  },
  legendSwatch: {
    width: 14,
    height: 0,
    borderTop: `3px solid ${T.accent}`,
    display: "inline-block",
  },
  empty: {
    minHeight: 168,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: T.textSecondary,
    fontSize: 13,
  },
};
