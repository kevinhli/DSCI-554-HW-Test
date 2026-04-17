import { extent, line, scaleLinear, scaleTime, timeFormat } from "d3";
import { T } from "../utils/theme";

const VB_W = 920;
const VB_H = 280;
const MARGIN = { top: 22, right: 22, bottom: 40, left: 52 };
const INNER_W = VB_W - MARGIN.left - MARGIN.right;
const INNER_H = VB_H - MARGIN.top - MARGIN.bottom;
const DAY_MS = 86_400_000;

const BEFORE_WINDOW_DAYS = 28;
const AFTER_LAG_DAYS = 7;
const AFTER_WINDOW_DAYS = 42;

export default function MortgageReactionChart({
  mortgageRates,
  event,
  response,
  animationKey,
}) {
  if (!mortgageRates?.length || !event) return null;

  const start = new Date(event.date.getTime() - 84 * DAY_MS);
  const end = new Date(event.date.getTime() + 140 * DAY_MS);
  const rows = mortgageRates.filter((row) => row.date >= start && row.date <= end);
  if (!rows.length) return null;

  const x = scaleTime().domain([start, end]).range([0, INNER_W]);
  const yExtent = extent(rows, (row) => row.value);
  const minValue = (yExtent[0] ?? 0) - 0.25;
  const maxValue = (yExtent[1] ?? 0) + 0.25;
  const y = scaleLinear().domain([minValue, maxValue]).range([INNER_H, 0]);

  const path = line()
    .x((row) => x(row.date))
    .y((row) => y(row.value))(rows);

  const eventX = x(event.date);
  const beforeStartX = x(new Date(event.date.getTime() - BEFORE_WINDOW_DAYS * DAY_MS));
  const beforeEndX = x(event.date);
  const afterStartX = x(new Date(event.date.getTime() + AFTER_LAG_DAYS * DAY_MS));
  const afterEndX = x(
    new Date(event.date.getTime() + (AFTER_LAG_DAYS + AFTER_WINDOW_DAYS) * DAY_MS)
  );

  const ticks = [
    start,
    new Date(event.date.getTime() - 42 * DAY_MS),
    event.date,
    new Date(event.date.getTime() + 42 * DAY_MS),
    new Date(event.date.getTime() + 84 * DAY_MS),
    end,
  ];

  return (
    <section className="dashboard-surface" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Mortgage rate response</div>
          <div style={styles.copy}>
            Weekly 30-year fixed mortgage rate before and after the selected Fed meeting,
            shown as the financing bridge into Los Angeles home prices.
          </div>
        </div>

        <div style={styles.metrics}>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Before meeting</span>
            <strong style={styles.metricValue}>{response?.beforeLabel || "N/A"}</strong>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>After meeting</span>
            <strong style={styles.metricValue}>{response?.afterLabel || "N/A"}</strong>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <rect
            key={`before-window-${animationKey || "base"}`}
            x={beforeStartX}
            y={0}
            width={Math.max(0, beforeEndX - beforeStartX)}
            height={INNER_H}
            fill={T.accentGlow}
            style={{
              ...styles.motion,
              animation: `chartFadeUp 360ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both`,
            }}
          />
          <rect
            key={`after-window-${animationKey || "base"}`}
            x={afterStartX}
            y={0}
            width={Math.max(0, afterEndX - afterStartX)}
            height={INNER_H}
            fill="rgba(74, 222, 128, 0.08)"
            style={{
              ...styles.motion,
              animation: `chartFadeUp 360ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both`,
            }}
          />

          {y.ticks(4).map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                x2={INNER_W}
                y1={y(tick)}
                y2={y(tick)}
                stroke={T.cardBorderLight}
                strokeOpacity={0.5}
              />
              <text
                x={-10}
                y={y(tick) + 4}
                textAnchor="end"
                fill={T.textDim}
                fontSize="10"
              >
                {tick.toFixed(1)}%
              </text>
            </g>
          ))}

          <path
            key={`mortgage-line-${animationKey || "base"}`}
            d={path || undefined}
            fill="none"
            stroke={T.accent}
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            style={{
              ...styles.motion,
              animation: `chartLineDraw 760ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both`,
            }}
          />

          <line
            key={`event-line-${animationKey || "base"}`}
            x1={eventX}
            x2={eventX}
            y1={0}
            y2={INNER_H}
            stroke={event.direction === "hike" ? T.hike : event.direction === "cut" ? T.cut : T.hold}
            strokeDasharray="5 5"
            strokeWidth="1.6"
            opacity="0.95"
            style={{
              ...styles.motion,
              animation: `chartMarkerReveal 360ms ease 260ms both`,
            }}
          />

          <text x={eventX} y={-8} textAnchor="middle" fill={T.textPrimary} fontSize="11" fontWeight="700">
            {event.dateStr}
          </text>

          {rows.map((row, index) => (
            <circle
              key={`${row.date.toISOString()}-${animationKey || "base"}`}
              cx={x(row.date)}
              cy={y(row.value)}
              r="2.5"
              fill={T.accent}
              style={{
                animation: `chartPointIn 260ms ease ${Math.min(340, 180 + index * 14)}ms both`,
                transformOrigin: "center",
                transformBox: "fill-box",
              }}
            >
              <title>{`${timeFormat("%b %d, %Y")(row.date)}: ${row.value.toFixed(2)}%`}</title>
            </circle>
          ))}

          {ticks.map((tick) => (
            <g key={tick.toISOString()} transform={`translate(${x(tick)},${INNER_H})`}>
              <line y2="6" stroke={T.cardBorder} />
              <text y="22" textAnchor="middle" fill={T.textDim} fontSize="10">
                {tick.getTime() === event.date.getTime()
                  ? "Event"
                  : timeFormat("%b '%y")(tick)}
              </text>
            </g>
          ))}

          <text x={beforeStartX + 8} y={16} fill={T.textDim} fontSize="10" fontWeight="700">
            4 weeks before
          </text>
          <text x={afterStartX + 8} y={16} fill={T.textDim} fontSize="10" fontWeight="700">
            Weeks 2 to 7 after
          </text>
        </g>
      </svg>
    </section>
  );
}

const styles = {
  card: {
    padding: 18,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 12,
  },
  title: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    marginBottom: 4,
  },
  copy: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  metrics: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  metric: {
    minWidth: 110,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
  },
  metricLabel: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  metricValue: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  motion: {
    transition: "all 420ms ease",
  },
};
