import { extent, scaleLinear } from "d3";
import { T } from "../utils/theme";
import { formatPercent } from "../utils/housingProcessing";

const VB_W = 960;
const VB_H = 560;
const MARGIN = { top: 70, right: 140, bottom: 42, left: 140 };
const INNER_W = VB_W - MARGIN.left - MARGIN.right;
const INNER_H = VB_H - MARGIN.top - MARGIN.bottom;
const BEFORE_X = 0;
const AFTER_X = INNER_W;

export default function HousingPaceShiftView({
  animationKey,
  responses,
  selectedStateCode,
  onSelectState,
  horizonLabel,
}) {
  if (!responses?.length) return null;

  const filtered = responses.filter(
    (response) =>
      response.previousChangePct != null &&
      response.changePct != null
  );
  if (!filtered.length) return null;

  const ranked = [...filtered].sort(
    (left, right) => (left.acceleration ?? 0) - (right.acceleration ?? 0)
  );
  const valueExtent = extent(
    ranked.flatMap((response) => [response.previousChangePct, response.changePct])
  );
  const minValue = (valueExtent[0] ?? -1) - 0.8;
  const maxValue = (valueExtent[1] ?? 1) + 0.8;
  const y = scaleLinear().domain([maxValue, minValue]).range([0, INNER_H]);
  const slowestCode = ranked[0]?.stateCode || null;
  const fastestCode = ranked[ranked.length - 1]?.stateCode || null;
  const importantCodes = new Set([
    selectedStateCode,
    slowestCode,
    fastestCode,
  ]);
  const ticks = y.ticks(6);

  return (
    <section className="dashboard-surface" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Before vs after</div>
          <div style={styles.copy}>
            Each line compares neighborhood price growth before the meeting with growth {horizonLabel.toLowerCase()} after it. Downward lines cooled. Upward lines re-accelerated.
          </div>
        </div>

        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: T.accent }} />
            Selected neighborhood
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#4f8cff" }} />
            Biggest slowdown
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#f59e0b" }} />
            Biggest speed-up
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "rgba(255,255,255,0.28)" }} />
            Other neighborhoods
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={-28}
                x2={INNER_W + 28}
                y1={y(tick)}
                y2={y(tick)}
                stroke={T.cardBorderLight}
                strokeOpacity={0.45}
              />
              <text
                x={-40}
                y={y(tick) + 4}
                textAnchor="end"
                fill={T.textDim}
                fontSize="10"
              >
                {tick.toFixed(1)}%
              </text>
            </g>
          ))}

          <line x1={BEFORE_X} x2={BEFORE_X} y1={0} y2={INNER_H} stroke={T.cardBorder} />
          <line x1={AFTER_X} x2={AFTER_X} y1={0} y2={INNER_H} stroke={T.cardBorder} />

          <text x={BEFORE_X} y={-18} textAnchor="middle" fill={T.textPrimary} fontSize="13" fontWeight="700">
            Before the meeting
          </text>
          <text x={AFTER_X} y={-18} textAnchor="middle" fill={T.textPrimary} fontSize="13" fontWeight="700">
            After the meeting
          </text>
          <text x={BEFORE_X} y={-2} textAnchor="middle" fill={T.textDim} fontSize="10">
            Same-length period leading in
          </text>
          <text x={AFTER_X} y={-2} textAnchor="middle" fill={T.textDim} fontSize="10">
            {horizonLabel}
          </text>

          {ranked.map((response, index) => {
            const beforeY = y(response.previousChangePct);
            const afterY = y(response.changePct);
            const isSelected = response.stateCode === selectedStateCode;
            const isSlowest = response.stateCode === slowestCode && !isSelected;
            const isFastest = response.stateCode === fastestCode && !isSelected;
            const stroke = isSelected
              ? T.accent
              : isSlowest
              ? "#4f8cff"
              : isFastest
              ? "#f59e0b"
              : "rgba(255,255,255,0.17)";
            const delay = Math.min(280, index * 10);

            return (
              <g
                key={`${response.stateCode}-${animationKey || "base"}`}
                onClick={() => onSelectState?.(response.stateCode)}
                style={{
                  cursor: "pointer",
                  animation: `chartFadeUp 360ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
                }}
              >
                <line
                  x1={BEFORE_X}
                  x2={AFTER_X}
                  y1={beforeY}
                  y2={afterY}
                  stroke={stroke}
                  strokeWidth={isSelected ? 3.1 : isSlowest || isFastest ? 1.9 : 1.05}
                  opacity={isSelected ? 1 : isSlowest || isFastest ? 0.9 : 0.2}
                  style={styles.motionLine}
                />

                <circle
                  cx={BEFORE_X}
                  cy={beforeY}
                  r={isSelected ? 4.6 : isSlowest || isFastest ? 3.4 : 2.3}
                  fill={isSelected ? T.accent : "rgba(255,255,255,0.34)"}
                  opacity={isSelected ? 1 : isSlowest || isFastest ? 0.86 : 0.32}
                  style={styles.motionLine}
                />
                <circle
                  cx={AFTER_X}
                  cy={afterY}
                  r={isSelected ? 5.1 : isSlowest || isFastest ? 3.5 : 2.6}
                  fill={stroke}
                  opacity={isSelected ? 1 : isSlowest || isFastest ? 0.95 : 0.42}
                  style={styles.motionLine}
                />

                {(isSelected || importantCodes.has(response.stateCode)) && (
                  <>
                    <text
                      x={BEFORE_X - 10}
                      y={beforeY + 4}
                      textAnchor="end"
                      fill={isSelected ? T.accent : isSlowest ? "#93c5fd" : "#fbbf24"}
                      fontSize="10"
                      fontWeight={isSelected ? "700" : "600"}
                    >
                      {response.shortLabel}
                    </text>
                    <text
                      x={AFTER_X + 10}
                      y={afterY + 4}
                      textAnchor="start"
                      fill={isSelected ? T.accent : isSlowest ? "#93c5fd" : "#fbbf24"}
                      fontSize="10"
                      fontWeight={isSelected ? "700" : "600"}
                    >
                      {response.shortLabel}
                    </text>
                  </>
                )}

                <title>
                  {`${response.stateName}: before ${formatPercent(
                    response.previousChangePct
                  )}, after ${formatPercent(response.changePct)}, shift ${formatPercent(
                    response.acceleration
                  )}`}
                </title>
              </g>
            );
          })}
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
    maxWidth: 680,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-start",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: 700,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    display: "inline-block",
  },
  motionLine: {
    transition:
      "opacity 420ms ease, transform 420ms ease, stroke 420ms ease, stroke-width 420ms ease",
  },
};
