import { line, quantileSorted, scaleLinear, scalePoint } from "d3";
import { T } from "../utils/theme";
import { formatPercent, formatShare } from "../utils/housingProcessing";

const VB_W = 980;
const VB_H = 430;
const MARGIN = { top: 44, right: 48, bottom: 54, left: 64 };
const INNER_W = VB_W - MARGIN.left - MARGIN.right;
const INNER_H = VB_H - MARGIN.top - MARGIN.bottom;
const DOT_R = 5.5;
const COLUMN_LIMIT = 70;

function dodge(points, centerX, radius = DOT_R, gap = 2) {
  const placed = [];
  const minDistance = radius * 2 + gap;

  return [...points]
    .sort((left, right) => left.y - right.y)
    .map((point) => {
      const candidates = [centerX];

      placed.forEach((other) => {
        const dy = Math.abs(point.y - other.y);
        if (dy >= minDistance) return;
        const dx = Math.sqrt(minDistance ** 2 - dy ** 2);
        candidates.push(other.x - dx, other.x + dx);
      });

      const valid = candidates
        .filter((candidateX) =>
          placed.every((other) => {
            const dx = candidateX - other.x;
            const dy = point.y - other.y;
            return Math.sqrt(dx * dx + dy * dy) >= minDistance;
          })
        )
        .filter((candidateX) => Math.abs(candidateX - centerX) <= COLUMN_LIMIT);

      const chosen =
        valid.sort(
          (left, right) => Math.abs(left - centerX) - Math.abs(right - centerX)
        )[0] ?? centerX;

      const next = { ...point, x: chosen };
      placed.push(next);
      return next;
    });
}

function dotColor(response) {
  if ((response.acceleration ?? 0) < -0.35) return "rgba(79,140,255,0.46)";
  if ((response.acceleration ?? 0) > 0.35) return "rgba(245,158,11,0.46)";
  return "rgba(160,160,168,0.34)";
}

function buildHeadline(matrix) {
  if (!matrix?.length) return "Not enough history to show the full neighborhood spread yet.";
  const widest = [...matrix].sort((left, right) => right.spread - left.spread)[0];
  const broadestCooling = [...matrix].sort(
    (left, right) => (right.summary.coolingShare ?? 0) - (left.summary.coolingShare ?? 0)
  )[0];

  return `The neighborhood spread is widest ${widest.description.toLowerCase()}, and the slowdown is broadest ${broadestCooling.description.toLowerCase()}, when ${formatShare(
    broadestCooling.summary.coolingShare
  )} of neighborhoods are cooling versus their earlier pace.`;
}

export default function HousingSpreadView({
  horizonMatrix,
  animationKey,
  selectedStateCode,
  onSelectState,
}) {
  if (!horizonMatrix?.length) return null;

  const valueList = horizonMatrix.flatMap((stage) =>
    stage.responses.map((response) => response.changePct)
  );
  const minValue = Math.min(...valueList, 0) - 1;
  const maxValue = Math.max(...valueList, 0) + 1;
  const x = scalePoint()
    .domain(horizonMatrix.map((stage) => stage.label))
    .range([0, INNER_W])
    .padding(0.45);
  const y = scaleLinear().domain([maxValue, minValue]).range([0, INNER_H]);
  const ticks = y.ticks(6);

  const columns = horizonMatrix.map((stage) => {
    const centerX = x(stage.label);
    const sortedValues = [...stage.responses]
      .map((response) => response.changePct)
      .filter((value) => value != null)
      .sort((left, right) => left - right);
    const q1 = quantileSorted(sortedValues, 0.25) ?? stage.summary.medianChange;
    const q3 = quantileSorted(sortedValues, 0.75) ?? stage.summary.medianChange;
    const dots = dodge(
      stage.responses.map((response) => ({
        ...response,
        y: y(response.changePct),
      })),
      centerX
    );

    return {
      ...stage,
      centerX,
      q1,
      q3,
      dots,
      spread: q3 - q1,
    };
  });

  const selectedPath = columns
    .map((stage) =>
      stage.dots.find((dot) => dot.stateCode === selectedStateCode) || null
    )
    .filter(Boolean);
  const hasSelection = selectedPath.length > 0;
  const medianPath = columns.map((stage) => ({
    x: stage.centerX,
    y: y(stage.summary.medianChange),
  }));
  const pathBuilder = line()
    .x((point) => point.x)
    .y((point) => point.y);

  return (
    <section className="dashboard-surface" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Neighborhood spread</div>
          <div style={styles.copy}>
            Each dot is a neighborhood. Higher dots mean larger home-price increases after
            the meeting. The center band shows the middle half of LA neighborhoods, and the
            bright line tracks the selected neighborhood over time.
          </div>
        </div>
      </div>

      <div style={styles.headline}>{buildHeadline(columns)}</div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {ticks.map((tick) => (
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
                x={-12}
                y={y(tick) + 4}
                textAnchor="end"
                fill={T.textDim}
                fontSize="10"
              >
                {tick.toFixed(1)}%
              </text>
            </g>
          ))}

          <line
            x1={0}
            x2={INNER_W}
            y1={y(0)}
            y2={y(0)}
            stroke={T.cardBorder}
            strokeDasharray="5 5"
          />

          <path
            key={`median-path-${animationKey || "base"}`}
            d={pathBuilder(medianPath) || undefined}
            fill="none"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="1.8"
            strokeDasharray="6 6"
            style={{
              ...styles.motion,
              animation: `chartFadeUp 380ms cubic-bezier(0.22, 1, 0.36, 1) 60ms both`,
            }}
          />

          {selectedPath.length >= 2 && (
            <path
              key={`selected-path-${animationKey || "base"}`}
              d={pathBuilder(selectedPath) || undefined}
              fill="none"
              stroke={T.accent}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              style={{
                ...styles.motion,
                animation: `chartLineDraw 720ms cubic-bezier(0.22, 1, 0.36, 1) 140ms both`,
              }}
            />
          )}

          {columns.map((stage, stageIndex) => {
            const bandTop = y(stage.q3);
            const bandBottom = y(stage.q1);
            const bandHeight = Math.max(12, bandBottom - bandTop);
            const selectedDot =
              stage.dots.find((dot) => dot.stateCode === selectedStateCode) || null;

            return (
              <g key={`${stage.label}-${animationKey || "base"}`}>
                <rect
                  x={stage.centerX - 18}
                  y={bandTop}
                  width={36}
                  height={bandHeight}
                  rx={18}
                  fill="rgba(255,255,255,0.06)"
                  stroke={T.cardBorder}
                  style={{
                    animation: `chartFadeUp 340ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      70 + stageIndex * 90
                    }ms both`,
                  }}
                />
                <line
                  x1={stage.centerX - 16}
                  x2={stage.centerX + 16}
                  y1={y(stage.summary.medianChange)}
                  y2={y(stage.summary.medianChange)}
                  stroke={T.textPrimary}
                  strokeWidth="1.6"
                />

                {stage.dots.map((dot, dotIndex) => {
                  const isSelected = dot.stateCode === selectedStateCode;
                  const contextOpacity = hasSelection ? 0.42 : 0.78;
                  return (
                    <g
                      key={`${stage.label}-${dot.stateCode}-${animationKey || "base"}`}
                      transform={`translate(${dot.x},${dot.y})`}
                      style={{
                        ...styles.motion,
                        animation: `chartOpacityIn 260ms ease ${
                          120 + stageIndex * 80 + Math.min(140, dotIndex * 5)
                        }ms both`,
                      }}
                      onClick={() => onSelectState?.(dot.stateCode)}
                    >
                      {isSelected ? (
                        <circle
                          r={DOT_R + 5.2}
                          fill="rgba(34,211,238,0.16)"
                          opacity="0.95"
                        />
                      ) : null}
                      <circle
                        r={isSelected ? DOT_R + 2.4 : DOT_R}
                        fill={isSelected ? T.accent : dotColor(dot)}
                        opacity={isSelected ? 1 : contextOpacity}
                        stroke={isSelected ? T.textPrimary : T.cardBg}
                        strokeWidth={isSelected ? 1.1 : 0.6}
                        style={{ cursor: "pointer" }}
                      />
                      <title>
                        {`${dot.stateName}: ${formatPercent(dot.changePct)} after the meeting, pace shift ${formatPercent(
                          dot.acceleration
                        )}`}
                      </title>
                    </g>
                  );
                })}

                <text
                  x={stage.centerX}
                  y={INNER_H + 30}
                  textAnchor="middle"
                  fill={T.textPrimary}
                  fontSize="12"
                  fontWeight="700"
                >
                  {stage.label}
                </text>
                <text
                  x={stage.centerX}
                  y={INNER_H + 46}
                  textAnchor="middle"
                  fill={T.textDim}
                  fontSize="10"
                >
                  {stage.description}
                </text>

                {selectedDot && (
                  <text
                    x={selectedDot.x + 10}
                    y={selectedDot.y - 8}
                    fill={T.accent}
                    fontSize="10"
                    fontWeight="700"
                  >
                      {selectedDot.shortLabel}
                    </text>
                  )}
              </g>
            );
          })}
        </g>
      </svg>

      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendSwatch, background: "#4f8cff" }} />
          Slowed versus earlier pace
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendSwatch, background: "#f59e0b" }} />
          Re-accelerated
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendSwatch, background: T.accent }} />
          Selected neighborhood
        </span>
        <span style={styles.legendItem}>
          <span style={styles.medianRule} />
          Typical LA path
        </span>
      </div>
    </section>
  );
}

const styles = {
  card: {
    padding: 18,
  },
  header: {
    marginBottom: 10,
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
    maxWidth: 760,
  },
  headline: {
    marginBottom: 12,
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
    color: T.textPrimary,
    fontSize: 13,
    lineHeight: 1.55,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: 700,
  },
  legendSwatch: {
    width: 11,
    height: 11,
    borderRadius: "50%",
    display: "inline-block",
  },
  medianRule: {
    width: 18,
    height: 0,
    borderTop: `2px dashed ${T.textSecondary}`,
    display: "inline-block",
  },
  motion: {
    transition:
      "opacity 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
};
