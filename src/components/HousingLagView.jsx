import { curveMonotoneX, line } from "d3";
import { useState } from "react";
import { T } from "../utils/theme";
import { formatPercent, formatShare } from "../utils/housingProcessing";

const VB_W = 980;
const VB_H = 280;
const BASE_Y = 162;
const STAGE_X = [88, 276, 474, 672, 870];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stageTone(stage, strongestHousingId) {
  if (stage.kind === "fed") {
    return stage.direction === "hike"
      ? T.hike
      : stage.direction === "cut"
      ? T.cut
      : T.hold;
  }

  if (stage.kind === "mortgage") {
    if (stage.change == null) return T.accent;
    if ((stage.change ?? 0) > 0.08) return T.hike;
    if ((stage.change ?? 0) < -0.08) return T.cut;
    return T.accent;
  }

  if ((stage.coolingShare ?? 0) >= 0.55 || (stage.acceleration ?? 0) < -0.4) return "#4f8cff";
  if (stage.id === strongestHousingId) return "#f59e0b";
  if ((stage.acceleration ?? 0) > 0.75) return "#c084fc";
  return "#8b8b93";
}

function lagHeadline(mortgageStage, strongestStage) {
  if (!mortgageStage || !strongestStage) return "Not enough history to estimate the lag yet.";
  if ((strongestStage.coolingShare ?? 0) <= 0.02) {
    return `Mortgage rates repriced ${mortgageStage.mainValue.toLowerCase()} first. Even ${strongestStage.title.toLowerCase()}, almost no neighborhoods were slowing versus their earlier pace.`;
  }

  return `Mortgage rates repriced ${mortgageStage.mainValue.toLowerCase()} first. The broadest housing slowdown showed up ${strongestStage.title.toLowerCase()}, when ${formatShare(
    strongestStage.coolingShare
  )} of neighborhoods were cooling versus their earlier pace.`;
}

function stageNarrative(stage) {
  if (stage.kind === "fed") return stage.note;
  if (stage.kind === "mortgage") return stage.note;
  if ((stage.coolingShare ?? 0) >= 0.65) return "Cooling was broad by this point.";
  if ((stage.coolingShare ?? 0) >= 0.45) return "The slowdown had spread across many neighborhoods.";
  return "Housing had started to react, but unevenly.";
}

export default function HousingLagView({
  event,
  mortgageResponse,
  lagSeries,
  animationKey,
}) {
  const [tooltip, setTooltip] = useState(null);

  if (!event || !lagSeries?.length) return null;

  const stages = [
    {
      id: "fed",
      kind: "fed",
      title: "Meeting day",
      shortLabel: "Fed",
      mainValue:
        event.direction === "hold"
          ? "Held steady"
          : `${event.direction === "hike" ? "Hike" : "Cut"} ${Math.round(
              Math.abs((event.changePct ?? 0) * 100)
            )} bps`,
      note: event.dateStr,
      intensity: clamp(Math.abs((event.changePct ?? 0) * 4), 0.12, 1),
      direction: event.direction,
    },
    {
      id: "mortgage",
      kind: "mortgage",
      title: "Weeks 2 to 7",
      shortLabel: "Mortgages",
      mainValue:
        mortgageResponse?.change == null
          ? "No follow-through yet"
          : `${mortgageResponse.change > 0 ? "+" : ""}${Math.round(
              mortgageResponse.change * 100
            )} bps`,
      note:
        mortgageResponse?.before != null && mortgageResponse?.after != null
          ? `${mortgageResponse.before.toFixed(2)}% to ${mortgageResponse.after.toFixed(2)}%`
          : "Mortgage move not available",
      intensity: clamp(Math.abs(mortgageResponse?.change ?? 0) / 1.2, 0.14, 1),
      change: mortgageResponse?.change ?? null,
    },
    ...lagSeries.map((point) => ({
      id: `lag-${point.horizonQuarters}`,
      kind: "housing",
      title: point.description.replace("after", "later"),
      shortLabel: point.label,
      mainValue: `${formatShare(point.summary.coolingShare)} slowed`,
      note: `Typical neighborhood change ${formatPercent(point.summary.medianChange)}`,
      intensity: clamp(
        (point.summary.coolingShare ?? 0) * 0.78 +
          Math.abs(point.summary.medianAcceleration ?? 0) / 12,
        0.18,
        1
      ),
      coolingShare: point.summary.coolingShare,
      acceleration: point.summary.medianAcceleration,
      medianChange: point.summary.medianChange,
      selectedState: point.selectedState,
    })),
  ];

  const strongestStage = [...stages]
    .filter((stage) => stage.kind === "housing")
    .sort((left, right) => (right.coolingShare ?? 0) - (left.coolingShare ?? 0))[0];
  const pathPoints = stages.map((stage, index) => ({
    ...stage,
    x: STAGE_X[index],
    y: BASE_Y - stage.intensity * 70,
    radius: stage.kind === "housing" ? 20 + stage.intensity * 18 : 18 + stage.intensity * 14,
    color: stageTone(stage, strongestStage?.id),
  }));
  const pulsePath = line()
    .curve(curveMonotoneX)
    .x((point) => point.x)
    .y((point) => point.y)(pathPoints);
  const yTicks = [
    { y: BASE_Y - 64, label: "Stronger signal" },
    { y: BASE_Y - 34, label: "Moderate" },
    { y: BASE_Y, label: "Weaker signal" },
  ];
  const xLabels = [
    "Meeting day",
    "2 to 7 weeks",
    "1Q later",
    "2Q later",
    "1 year later",
  ];

  const tooltipText = (point) => {
    if (!point) return "";
    if (point.kind === "fed") return `${point.title}: ${point.note}`;
    if (point.kind === "mortgage") return `${point.title}: ${point.mainValue}. ${point.note}.`;
    return `${point.title}: ${point.mainValue}. ${point.note}. ${point.selectedState?.stateName || "Selected neighborhood"} later moved ${formatPercent(point.selectedState?.changePct)}.`;
  };

  return (
    <section className="dashboard-surface" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Response lag</div>
          <div style={styles.copy}>
            This view shows where the policy shock is most visible first, then where it
            spreads later through Los Angeles neighborhood prices.
          </div>
        </div>
      </div>

      <div style={styles.headline}>{lagHeadline(stages[1], strongestStage)}</div>

      <div style={styles.chartFrame}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ width: "100%", display: "block" }}
          onMouseLeave={() => setTooltip(null)}
        >
          <line
            x1={64}
            x2={64}
            y1={48}
            y2={BASE_Y + 4}
            stroke={T.cardBorder}
            strokeOpacity="0.75"
          />
          <line
            x1={64}
            x2={914}
            y1={BASE_Y}
            y2={BASE_Y}
            stroke={T.cardBorder}
            strokeDasharray="6 8"
            strokeOpacity="0.55"
          />

          {yTicks.map((tick) => (
            <g key={tick.label}>
              <line
                x1={58}
                x2={914}
                y1={tick.y}
                y2={tick.y}
                stroke={T.cardBorderLight}
                strokeOpacity="0.22"
              />
              <text
                x={48}
                y={tick.y + 4}
                textAnchor="end"
                fill={T.textDim}
                fontSize="10"
                fontWeight="700"
              >
                {tick.label}
              </text>
            </g>
          ))}

          <text
            x={20}
            y={118}
            textAnchor="middle"
            fill={T.textSecondary}
            fontSize="10"
            fontWeight="700"
            transform="rotate(-90 20 118)"
          >
            How clearly the effect shows up
          </text>

          <path
            key={`lag-path-${animationKey || "base"}`}
            d={pulsePath || undefined}
            fill="none"
            stroke={T.accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            style={{
              ...styles.motion,
              animation: `chartLineDraw 760ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both`,
            }}
          />

          {pathPoints.map((point, index) => (
            <g
              key={`${point.id}-${animationKey || "base"}`}
              transform={`translate(${point.x},${point.y})`}
              style={{
                animation: `chartOpacityIn 260ms ease ${180 + index * 90}ms both`,
              }}
              onMouseMove={(eventSvg) =>
                setTooltip({
                  x: eventSvg.nativeEvent.offsetX,
                  y: eventSvg.nativeEvent.offsetY,
                  point,
                })
              }
            >
              <circle r={point.radius + 12} fill={point.color} opacity="0.08" />
              <circle r={point.radius + 5} fill="none" stroke={point.color} opacity="0.22" />
              <circle
                r={point.radius}
                fill={T.cardBg}
                stroke={point.color}
                strokeWidth="2.4"
                style={styles.motion}
              />
              <circle r="4.5" fill={point.color} />
              <text
                y={-(point.radius + 18)}
                textAnchor="middle"
                fill={T.textDim}
                fontSize="10"
                fontWeight="700"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                {point.shortLabel}
              </text>
              <title>{tooltipText(point)}</title>
            </g>
          ))}

          {pathPoints.map((point, index) => (
            <g key={`axis-${point.id}-${animationKey || "base"}`}>
              <line
                x1={point.x}
                x2={point.x}
                y1={BASE_Y}
                y2={BASE_Y + 6}
                stroke={T.cardBorder}
              />
              <text
                x={point.x}
                y={BASE_Y + 22}
                textAnchor="middle"
                fill={T.textPrimary}
                fontSize="10"
                fontWeight="700"
              >
                {xLabels[index]}
              </text>
            </g>
          ))}

          <text
            x={VB_W / 2}
            y={BASE_Y + 40}
            textAnchor="middle"
            fill={T.textSecondary}
            fontSize="10"
            fontWeight="700"
          >
            Time after the meeting
          </text>
        </svg>

        {tooltip && (
          <div
            style={{
              ...styles.tooltip,
              left: Math.min(tooltip.x + 14, 730),
              top: Math.max(tooltip.y - 14, 10),
            }}
          >
            <strong style={styles.tooltipTitle}>{tooltip.point.title}</strong>
            <span style={styles.tooltipBody}>{tooltipText(tooltip.point)}</span>
          </div>
        )}
      </div>

      <div style={styles.stageGrid}>
        {stages.map((stage, index) => (
          <div
            key={`${stage.id}-${animationKey || "base"}`}
            style={{
              ...styles.stageCard,
              borderColor:
                stage.kind === "housing" && stage.id === strongestStage?.id
                  ? `${stageTone(stage, strongestStage?.id)}66`
                  : T.cardBorder,
              background:
                stage.kind === "housing" && stage.id === strongestStage?.id
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.03)",
              animation: `chartFadeUp 360ms cubic-bezier(0.22, 1, 0.36, 1) ${
                220 + index * 70
              }ms both`,
            }}
          >
            <span style={styles.stageTitle}>{stage.title}</span>
            <strong style={styles.stageValue}>{stage.mainValue}</strong>
            <span style={styles.stageNote}>{stage.note}</span>
            {stage.kind === "housing" && (
              <>
                <div style={styles.miniRule} />
                <span style={styles.stageSubtle}>{stageNarrative(stage)}</span>
                <span style={styles.stateLine}>
                  {stage.selectedState?.stateName || "Selected neighborhood"}:{" "}
                  {formatPercent(stage.selectedState?.changePct)} later
                </span>
              </>
            )}
          </div>
        ))}
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
  chartFrame: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
  },
  stageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
    gap: 10,
    marginTop: 8,
  },
  stageCard: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minHeight: 128,
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
    transition: "transform 240ms ease, border-color 240ms ease, opacity 240ms ease",
  },
  stageTitle: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  stageValue: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  stageNote: {
    color: T.textSecondary,
    fontSize: 11,
    lineHeight: 1.4,
  },
  miniRule: {
    width: 28,
    height: 1,
    background: T.cardBorder,
    margin: "2px 0",
  },
  stageSubtle: {
    color: T.textPrimary,
    fontSize: 11,
    lineHeight: 1.4,
  },
  stateLine: {
    color: T.accent,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  motion: {
    transition: "all 420ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  tooltip: {
    position: "absolute",
    maxWidth: 260,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(17, 17, 19, 0.96)",
    border: `1px solid ${T.cardBorder}`,
    boxShadow: "0 16px 32px rgba(0,0,0,0.25)",
    pointerEvents: "none",
  },
  tooltipTitle: {
    color: T.textPrimary,
    fontSize: 12,
  },
  tooltipBody: {
    color: T.textSecondary,
    fontSize: 11,
    lineHeight: 1.4,
  },
};
