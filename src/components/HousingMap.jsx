import { useMemo, useState } from "react";
import { geoAlbersUsa, geoPath, max, min, scaleLinear } from "d3";
import { T } from "../utils/theme";
import { formatPercent } from "../utils/housingProcessing";

const MAP_WIDTH = 950;
const MAP_HEIGHT = 560;

function createColorScale(metricMode, values) {
  const validValues = values.filter((value) => value != null && !Number.isNaN(value));
  if (!validValues.length) {
    return () => T.neutral;
  }

  if (metricMode !== "absolute") {
    const maxAbs = Math.max(
      Math.abs(min(validValues) ?? 0),
      Math.abs(max(validValues) ?? 0),
      0.25
    );
    return scaleLinear()
      .domain([-maxAbs, 0, maxAbs])
      .range(["#2f68b3", "#5a5960", "#eb8f1c"]);
  }

  const lo = min(validValues) ?? 0;
  const hi = max(validValues) ?? 0;
  const mid = (lo + hi) / 2;

  return scaleLinear()
    .domain([lo, mid, hi])
    .range(["#355f98", "#66636a", "#eb8f1c"]);
}

export default function HousingMap({
  features,
  responses,
  summary,
  metricMode,
  animationKey,
  selectedStateCode,
  onSelectState,
  horizonLabel,
}) {
  const [tooltip, setTooltip] = useState(null);

  const responseMap = useMemo(
    () => new Map((responses || []).map((response) => [response.stateCode, response])),
    [responses]
  );

  const collection = useMemo(
    () => ({ type: "FeatureCollection", features: features || [] }),
    [features]
  );

  const projection = useMemo(() => {
    if (!features?.length) return null;
    return geoAlbersUsa().fitSize([MAP_WIDTH, MAP_HEIGHT], collection);
  }, [collection, features]);

  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);
  const stateAnimationMeta = useMemo(() => {
    if (!features?.length || !path) return new Map();

    return new Map(
      features.map((shape) => {
        const [x, y] = path.centroid(shape);
        const safeX = Number.isFinite(x) ? x : MAP_WIDTH / 2;
        const safeY = Number.isFinite(y) ? y : MAP_HEIGHT / 2;
        const delay = Math.max(0, Math.min(280, (safeX / MAP_WIDTH) * 260));

        return [shape.properties.code, { x: safeX, y: safeY, delay }];
      })
    );
  }, [features, path]);

  const metricValues = useMemo(
    () =>
      (responses || []).map((response) =>
        metricMode === "acceleration" ? response.acceleration : response.changePct
      ),
    [metricMode, responses]
  );

  const colorScale = useMemo(
    () => createColorScale(metricMode, metricValues),
    [metricMode, metricValues]
  );
  const focusStateCodes = useMemo(() => {
    const metricAccessor =
      metricMode === "acceleration"
        ? (response) => response.acceleration
        : (response) => response.changePct;

    return [...(responses || [])]
      .filter((response) => {
        const metric = metricAccessor(response);
        return metric != null && !Number.isNaN(metric);
      })
      .sort(
        (left, right) =>
          Math.abs(metricAccessor(right) ?? 0) - Math.abs(metricAccessor(left) ?? 0)
      )
      .slice(0, 3)
      .map((response) => response.stateCode);
  }, [metricMode, responses]);

  const valueRange = useMemo(() => {
    const values = metricValues.filter((value) => value != null && !Number.isNaN(value));
    if (!values.length) return null;

    if (metricMode !== "absolute") {
      const maxAbs = Math.max(Math.abs(min(values) ?? 0), Math.abs(max(values) ?? 0));
      return [-maxAbs, 0, maxAbs];
    }

    return [min(values) ?? 0, (min(values) + max(values)) / 2, max(values) ?? 0];
  }, [metricMode, metricValues]);

  if (!features?.length || !responses?.length || !path) {
    return null;
  }

  const tooltipResponse = tooltip ? responseMap.get(tooltip.stateCode) : null;

  const title =
    metricMode === "acceleration"
      ? "Where price growth cooled most"
      : "How home prices changed later";
  const copy =
    metricMode === "acceleration"
      ? `This compares price growth after the meeting with the same-length period right before it in each state.`
      : `State-level FHFA home-price change ${horizonLabel.toLowerCase()} after the selected meeting.`;
  const modeLabel =
    metricMode === "acceleration"
      ? "Blue = more slowdown, orange = more re-acceleration"
      : "Blue = lower later growth, orange = stronger later growth";
  const storyNote =
    metricMode === "acceleration"
      ? `${Math.round((summary?.coolingShare ?? 0) * 100)}% of states were still growing, but at a slower pace than before the meeting. Colors show direction, not good or bad.`
      : `Typical state move ${horizonLabel.toLowerCase()}: ${formatPercent(summary?.medianChange)}.`;
  const legendCaption =
    metricMode === "acceleration"
      ? "Blue states slowed more than before. Orange states sped back up."
      : "Blue states saw weaker later price growth. Orange states saw stronger later price growth.";
  const legendEnds =
    metricMode === "acceleration"
      ? ["More slowdown", "About the same", "More re-acceleration"]
      : ["Lower growth", "Middle", "Higher growth"];

  return (
    <section className="dashboard-surface" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>{title}</div>
          <div style={styles.copy}>{copy}</div>
        </div>

        <div style={styles.modePill}>{modeLabel}</div>
      </div>

      <div style={styles.storyNote}>{storyNote}</div>

      <div style={styles.mapFrame}>
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          style={{ width: "100%", display: "block" }}
          onMouseLeave={() => setTooltip(null)}
        >
          {features.map((shape) => {
            const response = responseMap.get(shape.properties.code);
            const metric =
              metricMode === "acceleration" ? response?.acceleration : response?.changePct;
            const fill =
              metric == null || Number.isNaN(metric) ? T.neutral : colorScale(metric);
            const isSelected = selectedStateCode === shape.properties.code;

            return (
              <path
                key={`${shape.properties.code}-${animationKey || "base"}`}
                d={path(shape) || undefined}
                fill={fill}
                stroke={isSelected ? T.textPrimary : T.pageBg}
                strokeWidth={isSelected ? 1.6 : 0.8}
                opacity={response ? 1 : 0.4}
                style={{
                  cursor: response ? "pointer" : "default",
                  animation:
                    response && animationKey
                      ? `mapStateFadeIn 620ms cubic-bezier(0.22, 1, 0.36, 1) ${
                          stateAnimationMeta.get(shape.properties.code)?.delay || 0
                        }ms both`
                      : "none",
                  transition: "fill 420ms ease, stroke 420ms ease, opacity 420ms ease",
                }}
                onClick={() => response && onSelectState?.(shape.properties.code)}
                onMouseMove={(event) => {
                  if (!response) return;
                  setTooltip({
                    x: event.nativeEvent.offsetX,
                    y: event.nativeEvent.offsetY,
                    stateCode: shape.properties.code,
                  });
                }}
              >
                <title>{`${shape.properties.name}: ${formatPercent(response?.changePct)}`}</title>
              </path>
            );
          })}

          {animationKey &&
            focusStateCodes.map((stateCode) => {
              const meta = stateAnimationMeta.get(stateCode);
              if (!meta) return null;

              return (
                <g key={`${stateCode}-${animationKey}`} pointerEvents="none">
                  <circle
                    cx={meta.x}
                    cy={meta.y}
                    r="9"
                    fill="none"
                    stroke={T.accent}
                    strokeWidth="2"
                    opacity="0"
                    style={{
                      animation: `mapFocusRing 980ms ease-out ${meta.delay + 180}ms 1 both`,
                    }}
                  />
                  <circle
                    cx={meta.x}
                    cy={meta.y}
                    r="3.5"
                    fill={T.accent}
                    opacity="0"
                    style={{
                      animation: `mapFocusDot 980ms ease-out ${meta.delay + 180}ms 1 both`,
                    }}
                  />
                </g>
              );
            })}
        </svg>

        {tooltip && tooltipResponse && (
          <div
            style={{
              ...styles.tooltip,
              left: Math.min(tooltip.x + 14, 700),
              top: Math.max(tooltip.y - 18, 12),
            }}
          >
            <strong style={styles.tooltipTitle}>{tooltipResponse.stateName}</strong>
            <span style={styles.tooltipLine}>
              Later price change: {formatPercent(tooltipResponse.changePct)}
            </span>
            <span style={styles.tooltipLine}>
              Growth shift: {formatPercent(tooltipResponse.acceleration)}
            </span>
            <span style={styles.tooltipLine}>
              {tooltipResponse.baselineQuarter} to {tooltipResponse.targetQuarter}
            </span>
          </div>
        )}
      </div>

      {valueRange && (
        <div style={styles.legendWrap}>
          <div style={styles.legendCaption}>{legendCaption}</div>
          <div
            style={{
              ...styles.legendBar,
              background:
                metricMode === "acceleration"
                  ? "linear-gradient(90deg, #2f68b3 0%, #5a5960 50%, #eb8f1c 100%)"
                  : "linear-gradient(90deg, #355f98 0%, #66636a 50%, #eb8f1c 100%)",
            }}
          />
          <div style={styles.legendEnds}>
            {legendEnds.map((label) => (
              <span key={label} style={styles.legendEndLabel}>
                {label}
              </span>
            ))}
          </div>
          <div style={styles.legendLabels}>
            {valueRange.map((value, index) => (
              <span key={`${value}-${index}`} style={styles.legendLabel}>
                {formatPercent(value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  card: {
    padding: 18,
    position: "relative",
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
  modePill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "0 12px",
    borderRadius: 999,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  storyNote: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
    color: T.textPrimary,
    fontSize: 12,
    lineHeight: 1.45,
  },
  mapFrame: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    background: `linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))`,
    border: `1px solid ${T.cardBorderLight}`,
  },
  tooltip: {
    position: "absolute",
    minWidth: 190,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(17, 17, 19, 0.95)",
    border: `1px solid ${T.cardBorder}`,
    boxShadow: "0 16px 32px rgba(0,0,0,0.25)",
    pointerEvents: "none",
  },
  tooltipTitle: {
    color: T.textPrimary,
    fontSize: 13,
  },
  tooltipLine: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.4,
  },
  legendWrap: {
    marginTop: 12,
  },
  legendCaption: {
    marginBottom: 6,
    color: T.textSecondary,
    fontSize: 11,
    lineHeight: 1.4,
  },
  legendBar: {
    height: 10,
    borderRadius: 999,
    border: `1px solid ${T.cardBorder}`,
  },
  legendEnds: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
  },
  legendEndLabel: {
    color: T.textSecondary,
    fontSize: 10.5,
    fontWeight: 700,
  },
  legendLabels: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 6,
  },
  legendLabel: {
    color: T.textDim,
    fontSize: 11,
    fontWeight: 700,
  },
};
