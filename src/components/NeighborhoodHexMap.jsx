import {
  extent,
  geoIdentity,
  geoPath,
  interpolateRgb,
  line,
  pointer,
  scaleLinear,
} from "d3";
import { useMemo, useState } from "react";
import { T } from "../utils/theme";
import { formatPercent, formatShare } from "../utils/housingProcessing";
import { LA_CLUSTERS, LA_CLUSTER_BY_ID } from "../utils/laNeighborhoods";

const TIMELINE_VB_W = 940;
const TIMELINE_VB_H = 210;
const TIMELINE_MARGIN = { top: 22, right: 18, bottom: 42, left: 48 };
const TIMELINE_W = TIMELINE_VB_W - TIMELINE_MARGIN.left - TIMELINE_MARGIN.right;
const TIMELINE_H = TIMELINE_VB_H - TIMELINE_MARGIN.top - TIMELINE_MARGIN.bottom;
const MAP_VB_W = 940;
const MAP_VB_H = 720;
const MAP_INSET = 22;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mixColors(start, end, t) {
  return interpolateRgb(start, end)(clamp(t, 0, 1));
}

function metricColor(value, scaleMax) {
  if (value == null || Number.isNaN(value)) return "rgba(71,74,82,0.62)";
  const normalized = clamp(Math.abs(value) / Math.max(scaleMax, 0.001), 0, 1);
  if (normalized < 0.16) return "rgba(104,104,113,0.9)";
  if (value < 0) return mixColors("#243247", "#4f8cff", normalized ** 0.82);
  if (value > 0) return mixColors("#55381d", "#f59e0b", normalized ** 0.82);
  return "rgba(82,82,91,0.95)";
}

function brighten(color, amount = 0.22) {
  return mixColors(color, "#ffffff", amount);
}

function darken(color, amount = 0.28) {
  return mixColors(color, "#0b0d12", amount);
}

function findClusterInsight(clusterSummaries) {
  if (!clusterSummaries?.length) return null;
  const strongestCooling = [...clusterSummaries]
    .filter((item) => item.summary?.medianAcceleration != null)
    .sort((left, right) => left.summary.medianAcceleration - right.summary.medianAcceleration)[0];
  const firmest = [...clusterSummaries]
    .filter((item) => item.summary?.medianChange != null)
    .sort((left, right) => right.summary.medianChange - left.summary.medianChange)[0];
  if (!strongestCooling || !firmest) return null;
  return `${strongestCooling.clusterLabel} cooled the most, while ${firmest.clusterLabel} held up best.`;
}

function timelineTooltipRows(clusterSeries, selectedSeries, offset) {
  const rows = clusterSeries
    .map((cluster) => ({
      id: cluster.clusterId,
      label: cluster.clusterLabel,
      color: cluster.color,
      point: cluster.points.find((item) => item.offset === offset) || null,
    }))
    .filter((item) => item.point);

  if (selectedSeries?.length) {
    const selectedPoint = selectedSeries.find((item) => item.offset === offset) || null;
    if (selectedPoint) {
      rows.unshift({
        id: "selected",
        label: "Selected neighborhood",
        color: T.accent,
        point: selectedPoint,
      });
    }
  }

  return rows;
}

function safeCentroid(path, feature) {
  const [cx, cy] = path.centroid(feature);
  if (Number.isFinite(cx) && Number.isFinite(cy)) {
    return { x: cx, y: cy };
  }
  const bounds = path.bounds(feature);
  return {
    x: (bounds[0][0] + bounds[1][0]) / 2,
    y: (bounds[0][1] + bounds[1][1]) / 2,
  };
}

function hexVertices(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

function polygonPoints(points) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function prismFaces(top, base) {
  return [1, 2, 3].map((index) => {
    const next = (index + 1) % top.length;
    return [top[index], top[next], base[next], base[index]];
  });
}

function metricContext(metricMode) {
  if (metricMode === "acceleration") {
    return {
      colorAccessor: (response) => response.acceleration,
      heightAccessor: (response) => Math.abs(response.acceleration ?? 0),
      headline:
        "Blue neighborhoods slowed more than they had before the meeting. Warm neighborhoods kept gaining speed.",
      subCopy:
        "Fill color compares each neighborhood's growth after the meeting with the same-length period before it.",
      legendStart: "Slowed more",
      legendEnd: "Kept speeding up",
      heightCopy: "Column height = size of the growth-pace shift",
      tooltipComparisonLabel: "Pace shift",
    };
  }

  return {
    colorAccessor: (response) => response.relativeToMedian,
    heightAccessor: (response) => Math.abs(response.relativeToMedian ?? 0),
    headline:
      "Orange neighborhoods beat the typical LA neighborhood after the meeting. Blue neighborhoods lagged the local pack.",
    subCopy: "Fill color shows whether each neighborhood finished above or below the typical LA move.",
    legendStart: "Below typical LA",
    legendEnd: "Above typical LA",
    heightCopy: "Column height = distance from the typical LA move",
    tooltipComparisonLabel: "Versus typical LA",
  };
}

export default function NeighborhoodHexMap({
  features,
  responses,
  summary,
  metricMode,
  animationKey,
  selectedStateCode,
  onSelectState,
  clusterSeries,
  selectedNeighborhoodSeries,
}) {
  const [tooltip, setTooltip] = useState(null);
  const [timelineHover, setTimelineHover] = useState(null);
  const context = metricContext(metricMode);

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
    return geoIdentity().reflectY(true).fitExtent(
      [
        [MAP_INSET, MAP_INSET],
        [MAP_VB_W - MAP_INSET, MAP_VB_H - MAP_INSET],
      ],
      collection
    );
  }, [collection, features]);
  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  const colorAccessor = context.colorAccessor;
  const heightAccessor = context.heightAccessor;

  const featureEntries = useMemo(() => {
    if (!path || !features?.length) return [];
    return features
      .map((feature) => {
        const response = responseMap.get(feature.properties.code) || null;
        const centroid = safeCentroid(path, feature);
        return {
          feature,
          response,
          centroid,
          pathData: path(feature) || undefined,
          delay: Math.round((centroid.x / MAP_VB_W) * 220),
        };
      })
      .sort((left, right) => left.centroid.y - right.centroid.y);
  }, [features, path, responseMap]);

  const selectedNeighborhood = responseMap.get(selectedStateCode) || responses?.[0] || null;
  const clusterSummaries = responses?.length
    ? Object.values(
        responses.reduce((acc, response) => {
          if (!acc[response.clusterId]) {
            acc[response.clusterId] = {
              clusterId: response.clusterId,
              clusterLabel: response.clusterLabel,
              color: LA_CLUSTER_BY_ID[response.clusterId]?.color,
              values: [],
            };
          }
          acc[response.clusterId].values.push(response);
          return acc;
        }, {})
      ).map((cluster) => ({
        ...cluster,
        summary: {
          medianChange:
            cluster.values
              .map((item) => item.changePct)
              .sort((left, right) => left - right)[Math.floor(cluster.values.length / 2)] ?? null,
          medianAcceleration:
            cluster.values
              .filter((item) => item.acceleration != null)
              .map((item) => item.acceleration)
              .sort((left, right) => left - right)[
              Math.floor(
                cluster.values.filter((item) => item.acceleration != null).length / 2
              )
            ] ?? null,
        },
      }))
    : [];

  const allMetricValues = (responses || [])
    .map((response) => colorAccessor(response))
    .filter((value) => value != null);
  const scaleMax = Math.max(
    1,
    ...(allMetricValues.length ? allMetricValues.map((value) => Math.abs(value)) : [1])
  );
  const columnValues = (responses || []).map((response) => heightAccessor(response));
  const columnExtent = extent(
    columnValues.filter((value) => value != null && !Number.isNaN(value))
  );
  const columnHeight = scaleLinear()
    .domain([
      0,
      columnExtent[1] != null && columnExtent[1] > 0 ? columnExtent[1] : 1,
    ])
    .range([8, 64]);

  const mapHeadline = context.headline;
  const insight = findClusterInsight(clusterSummaries);

  const offsets = [
    ...(selectedNeighborhoodSeries || []).map((point) => point.offset),
    ...(clusterSeries || []).flatMap((cluster) => cluster.points.map((point) => point.offset)),
  ];
  const timelineDomain = [
    Math.min(...(offsets.length ? offsets : [-6]), -6),
    Math.max(...(offsets.length ? offsets : [12]), 12),
  ];
  const timelineExtent = extent([
    0,
    ...(selectedNeighborhoodSeries || []).map((point) => point.value - 100),
    ...(clusterSeries || []).flatMap((cluster) =>
      cluster.points.map((point) => point.value - 100)
    ),
  ]);
  const yMin = Math.min(-2, (timelineExtent[0] ?? -1) - 0.8);
  const yMax = Math.max(2, (timelineExtent[1] ?? 1) + 0.8);
  const x = scaleLinear().domain(timelineDomain).range([0, TIMELINE_W]);
  const y = scaleLinear().domain([yMax, yMin]).range([0, TIMELINE_H]);
  const pathBuilder = line()
    .x((point) => x(point.offset))
    .y((point) => y(point.value - 100));
  const ticks = [-6, -3, 0, 3, 6, 9, 12].filter(
    (tick) => tick >= timelineDomain[0] && tick <= timelineDomain[1]
  );

  const hoverOffset = timelineHover?.offset;
  const hoverRows =
    hoverOffset != null
      ? timelineTooltipRows(clusterSeries || [], selectedNeighborhoodSeries, hoverOffset)
      : [];
  const hoverLabel =
    hoverOffset != null
      ? selectedNeighborhoodSeries?.find((point) => point.offset === hoverOffset)?.label ||
        clusterSeries
          ?.find((cluster) => cluster.points.find((point) => point.offset === hoverOffset))
          ?.points.find((point) => point.offset === hoverOffset)?.label ||
        null
      : null;

  const matchedNeighborhoodCount = responses?.length || 0;
  const coverageShare = features?.length ? matchedNeighborhoodCount / features.length : 0;
  const baselineValues = (responses || [])
    .map((response) => response.baselineValue)
    .filter((value) => value != null);
  const typicalMeetingValue = baselineValues.length
    ? [...baselineValues].sort((left, right) => left - right)[Math.floor(baselineValues.length / 2)]
    : null;
  const selectedSeriesEnd =
    selectedNeighborhoodSeries?.length ? selectedNeighborhoodSeries[selectedNeighborhoodSeries.length - 1] : null;

  if (!features?.length || !responses?.length || !path) {
    return null;
  }

  return (
    <section className="dashboard-surface" style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>Los Angeles neighborhood map</div>
        <div style={styles.copy}>
          Real Mapping L.A. neighborhood boundaries, colored by what happened after the
          meeting. Small hex columns show which neighborhoods already carried higher home
          values when the meeting happened.
        </div>
      </div>

      <div style={styles.headline}>
        <strong style={styles.headlineLead}>{mapHeadline}</strong>
        {insight ? <span style={styles.headlineTail}>{insight}</span> : null}
      </div>

      <div style={styles.timelineCard}>
        <div style={styles.timelineHeader}>
          <div>
            <div style={styles.subTitle}>Neighborhood and cluster timeline</div>
            <div style={styles.subCopy}>
              Selected neighborhood versus cluster medians, indexed to the meeting month.
            </div>
          </div>
          <div style={styles.timelineLegend}>
            {LA_CLUSTERS.map((cluster) => (
              <span
                key={cluster.id}
                style={{
                  ...styles.legendChip,
                  borderColor:
                    cluster.id === selectedNeighborhood?.clusterId
                      ? `${cluster.color}88`
                      : T.cardBorder,
                  color:
                    cluster.id === selectedNeighborhood?.clusterId
                      ? T.textPrimary
                      : T.textSecondary,
                }}
              >
                <span style={{ ...styles.legendDot, background: cluster.color }} />
                {cluster.shortLabel}
              </span>
            ))}
          </div>
        </div>

        <div style={styles.timelineWrap}>
          <svg viewBox={`0 0 ${TIMELINE_VB_W} ${TIMELINE_VB_H}`} style={{ width: "100%" }}>
            <g transform={`translate(${TIMELINE_MARGIN.left},${TIMELINE_MARGIN.top})`}>
              {y.ticks(5).map((tick) => (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={TIMELINE_W}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke={T.cardBorderLight}
                    strokeOpacity="0.45"
                  />
                  <text x={-10} y={y(tick) + 4} textAnchor="end" fill={T.textDim} fontSize="10">
                    {tick > 0 ? "+" : ""}
                    {tick.toFixed(1)}%
                  </text>
                </g>
              ))}

              <line
                x1={0}
                x2={TIMELINE_W}
                y1={y(0)}
                y2={y(0)}
                stroke={T.cardBorder}
                strokeDasharray="4 6"
              />
              <line
                x1={x(0)}
                x2={x(0)}
                y1={0}
                y2={TIMELINE_H}
                stroke={T.accent}
                strokeDasharray="5 5"
                opacity="0.8"
              />

              {(clusterSeries || []).map((cluster, index) => (
                <path
                  key={`${cluster.clusterId}-${animationKey || "base"}`}
                  d={pathBuilder(cluster.points) || undefined}
                  fill="none"
                  stroke={
                    cluster.clusterId === selectedNeighborhood?.clusterId
                      ? cluster.color
                      : mixColors(T.textMuted, "#d4d4d8", 0.08)
                  }
                  strokeWidth={cluster.clusterId === selectedNeighborhood?.clusterId ? 2.7 : 1.2}
                  opacity={cluster.clusterId === selectedNeighborhood?.clusterId ? 0.95 : 0.42}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                  style={{
                    animation: `chartLineDraw 720ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      80 + index * 60
                    }ms both`,
                  }}
                />
              ))}

              {selectedNeighborhoodSeries?.length ? (
                <>
                  <path
                    key={`selected-neighborhood-glow-${animationKey || "base"}`}
                    d={pathBuilder(selectedNeighborhoodSeries) || undefined}
                    fill="none"
                    stroke="rgba(34,211,238,0.2)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.95"
                  />
                  <path
                    key={`selected-neighborhood-${animationKey || "base"}`}
                    d={pathBuilder(selectedNeighborhoodSeries) || undefined}
                    fill="none"
                    stroke={T.accent}
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                    style={{
                      animation: "chartLineDraw 820ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both",
                    }}
                  />
                  {selectedNeighborhoodSeries.map((point, index) => (
                    <circle
                      key={`selected-dot-${point.offset}-${animationKey || "base"}`}
                      cx={x(point.offset)}
                      cy={y(point.value - 100)}
                      r={index === selectedNeighborhoodSeries.length - 1 ? 4.5 : 3.2}
                      fill={T.accent}
                      stroke={T.cardBg}
                      strokeWidth={1}
                      opacity={0.95}
                      style={{
                        animation: `chartOpacityIn 260ms ease ${220 + index * 36}ms both`,
                      }}
                    />
                  ))}
                </>
              ) : null}

              {selectedSeriesEnd ? (
                <text
                  x={Math.min(x(selectedSeriesEnd.offset) + 10, TIMELINE_W - 8)}
                  y={y(selectedSeriesEnd.value - 100) - 12}
                  fill={T.accent}
                  fontSize="10"
                  fontWeight="700"
                >
                  {selectedNeighborhood?.shortLabel || "Selected"}
                </text>
              ) : null}

              {ticks.map((tick) => (
                <g key={tick} transform={`translate(${x(tick)},${TIMELINE_H})`}>
                  <line y2="6" stroke={T.cardBorder} />
                  <text y="20" textAnchor="middle" fill={T.textDim} fontSize="10">
                    {tick === 0 ? "Event" : `${tick > 0 ? "+" : ""}${tick}m`}
                  </text>
                </g>
              ))}

              <text
                x={TIMELINE_W / 2}
                y={TIMELINE_H + 34}
                textAnchor="middle"
                fill={T.textSecondary}
                fontSize="10"
                fontWeight="700"
              >
                Months relative to the Fed meeting
              </text>

              <rect
                x={0}
                y={0}
                width={TIMELINE_W}
                height={TIMELINE_H}
                fill="transparent"
                onMouseLeave={() => setTimelineHover(null)}
                onMouseMove={(event) => {
                  const [localX] = pointer(event);
                  const snappedOffset = Math.round(x.invert(localX));
                  setTimelineHover({
                    offset: clamp(snappedOffset, timelineDomain[0], timelineDomain[1]),
                    x: clamp(localX, 0, TIMELINE_W),
                  });
                }}
              />

              {timelineHover ? (
                <line
                  x1={timelineHover.x}
                  x2={timelineHover.x}
                  y1={0}
                  y2={TIMELINE_H}
                  stroke="rgba(255,255,255,0.24)"
                  strokeDasharray="4 5"
                />
              ) : null}
            </g>
          </svg>

          {timelineHover && hoverRows.length ? (
            <div
              style={{
                ...styles.tooltip,
                left: `${clamp(
                  ((timelineHover.x + TIMELINE_MARGIN.left) / TIMELINE_VB_W) * 100 + 2,
                  4,
                  72
                )}%`,
                top: 18,
              }}
            >
              <strong style={styles.tooltipTitle}>{hoverLabel}</strong>
              {hoverRows.map((row) => (
                <div key={row.id} style={styles.tooltipRow}>
                  <span style={{ ...styles.tooltipDot, background: row.color }} />
                  <span style={styles.tooltipLabel}>{row.label}</span>
                  <strong style={styles.tooltipValue}>{formatPercent(row.point.value - 100)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={styles.metaRow}>
        <div>
          <div style={styles.subTitle}>Neighborhood boundary map</div>
          <div style={styles.subCopy}>
            {context.subCopy}
          </div>
        </div>
        <div style={styles.mapExplain}>
          Gray neighborhoods are boundary-only because the Zillow neighborhood series did
          not publish a direct match for them.
        </div>
      </div>

      <div style={styles.legendRow}>
        <span style={styles.scaleLabel}>{context.legendStart}</span>
        <div style={styles.scaleTrack}>
          <div style={styles.scaleBlue} />
          <div style={styles.scaleNeutral} />
          <div style={styles.scaleWarm} />
        </div>
        <span style={styles.scaleLabel}>{context.legendEnd}</span>
        <span style={styles.heightCopy}>{context.heightCopy}</span>
      </div>

      <div style={styles.mapFrame}>
        <svg
          viewBox={`0 0 ${MAP_VB_W} ${MAP_VB_H}`}
          style={{ width: "100%", display: "block" }}
          onMouseLeave={() => setTooltip(null)}
        >
          {featureEntries.map((entry) => {
            const metricValue = entry.response ? colorAccessor(entry.response) : null;
            const fill = metricColor(metricValue, scaleMax);
            const isSelected = entry.feature.properties.code === selectedStateCode;
            const hasData = Boolean(entry.response);

            return (
              <path
                key={`${entry.feature.properties.code}-${animationKey || "base"}-fill`}
                d={entry.pathData}
                fill={fill}
                stroke={isSelected ? "rgba(255,255,255,0.92)" : "rgba(18,20,24,0.9)"}
                strokeWidth={isSelected ? 2 : 1}
                opacity={hasData ? 0.96 : 0.42}
                style={{
                  cursor: hasData ? "pointer" : "default",
                  animation: `mapStateFadeIn 560ms cubic-bezier(0.22, 1, 0.36, 1) ${
                    entry.delay
                  }ms both`,
                  transition: "fill 420ms ease, stroke 420ms ease, opacity 320ms ease",
                }}
                onClick={() => hasData && onSelectState?.(entry.feature.properties.code)}
                onMouseMove={(event) =>
                  setTooltip({
                    x: event.nativeEvent.offsetX,
                    y: event.nativeEvent.offsetY,
                    feature: entry.feature,
                    response: entry.response,
                  })
                }
              />
            );
          })}

          {featureEntries
            .filter((entry) => entry.response)
            .map((entry, index) => {
              const color = metricColor(colorAccessor(entry.response), scaleMax);
              const radius = entry.feature.properties.code === selectedStateCode ? 7.2 : 5.2;
              const height = columnHeight(heightAccessor(entry.response));
              const base = hexVertices(entry.centroid.x, entry.centroid.y, radius);
              const top = hexVertices(entry.centroid.x, entry.centroid.y - height, radius);
              const isSelected = entry.feature.properties.code === selectedStateCode;

              return (
                <g
                  key={`${entry.feature.properties.code}-${animationKey || "base"}-column`}
                  pointerEvents="none"
                  opacity="0"
                  style={{
                    animation: `chartOpacityIn 420ms ease ${160 + entry.delay + index * 2}ms both`,
                  }}
                >
                  {prismFaces(top, base).map((face, faceIndex) => (
                    <polygon
                      key={`${entry.feature.properties.code}-face-${faceIndex}`}
                      points={polygonPoints(face)}
                      fill={darken(color, 0.32 + faceIndex * 0.08)}
                      opacity={isSelected ? 0.98 : 0.84}
                    />
                  ))}
                  <polygon
                    points={polygonPoints(top)}
                    fill={brighten(color, isSelected ? 0.3 : 0.2)}
                    stroke={isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)"}
                    strokeWidth={isSelected ? 1.4 : 0.8}
                  />
                </g>
              );
            })}
        </svg>

        {tooltip ? (
          <div
            style={{
              ...styles.tooltip,
              left: Math.min(tooltip.x + 16, 710),
              top: Math.max(tooltip.y - 18, 16),
            }}
          >
            <strong style={styles.tooltipTitle}>{tooltip.feature.properties.name}</strong>
            <span style={styles.tooltipBody}>{tooltip.feature.properties.clusterLabel}</span>
            {tooltip.response ? (
              <>
                <span style={styles.tooltipBody}>
                  Later price change: {formatPercent(tooltip.response.changePct)}
                </span>
                <span style={styles.tooltipBody}>
                  Growth shift: {formatPercent(tooltip.response.acceleration)}
                </span>
                <span style={styles.tooltipBody}>
                  {context.tooltipComparisonLabel}:{" "}
                  {formatPercent(
                    metricMode === "acceleration"
                      ? tooltip.response.acceleration
                      : tooltip.response.relativeToMedian
                  )}
                </span>
                <span style={styles.tooltipBody}>
                  Meeting-month value:{" "}
                  {tooltip.response.baselineValue?.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </>
            ) : (
              <span style={styles.tooltipBody}>
                Boundary available, but this neighborhood does not have a direct matched
                Zillow series in the current dataset.
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div style={styles.bottomRow}>
        <div style={styles.bottomStat}>
          <span style={styles.bottomLabel}>Typical neighborhood move</span>
          <strong style={styles.bottomValue}>{formatPercent(summary?.medianChange)}</strong>
        </div>
        <div style={styles.bottomStat}>
          <span style={styles.bottomLabel}>Neighborhoods cooling</span>
          <strong style={styles.bottomValue}>{formatShare(summary?.coolingShare)}</strong>
        </div>
        <div style={styles.bottomStat}>
          <span style={styles.bottomLabel}>Matched price coverage</span>
          <strong style={styles.bottomValue}>
            {matchedNeighborhoodCount} of {features.length}
          </strong>
          <span style={styles.bottomMeta}>
            Typical meeting-month value{" "}
            {typicalMeetingValue?.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }) || "N/A"}
          </span>
        </div>
      </div>

      <div style={styles.coverageNote}>
        Coverage now spans {formatShare(coverageShare)} of the Mapping L.A. neighborhoods.
      </div>
    </section>
  );
}

const styles = {
  card: { padding: 18 },
  header: { marginBottom: 12 },
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
    maxWidth: 780,
  },
  headline: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
  },
  headlineLead: { color: T.textPrimary, fontSize: 12.5, lineHeight: 1.5 },
  headlineTail: { color: T.textSecondary, fontSize: 12.5, lineHeight: 1.5 },
  timelineCard: {
    marginBottom: 14,
    padding: "14px 14px 12px",
    borderRadius: 16,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.02)",
  },
  timelineHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  subTitle: { color: T.textPrimary, fontSize: 14, fontWeight: 700, marginBottom: 3 },
  subCopy: { color: T.textSecondary, fontSize: 11.5, lineHeight: 1.45, maxWidth: 640 },
  timelineLegend: { display: "flex", flexWrap: "wrap", gap: 8 },
  legendChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
    fontSize: 10.5,
    fontWeight: 700,
  },
  legendDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  timelineWrap: { position: "relative" },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  mapExplain: { maxWidth: 320, color: T.textDim, fontSize: 11.5, lineHeight: 1.45 },
  legendRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  scaleTrack: {
    flex: "1 1 220px",
    minWidth: 220,
    display: "grid",
    gridTemplateColumns: "1fr 72px 1fr",
    gap: 6,
    alignItems: "center",
  },
  scaleBlue: { height: 10, borderRadius: 999, background: "linear-gradient(90deg, #1f3045 0%, #4f8cff 100%)" },
  scaleNeutral: { height: 10, borderRadius: 999, background: "rgba(82,82,91,0.92)" },
  scaleWarm: { height: 10, borderRadius: 999, background: "linear-gradient(90deg, #5a3a1f 0%, #f59e0b 100%)" },
  scaleLabel: { color: T.textSecondary, fontSize: 11, fontWeight: 700 },
  heightCopy: { color: T.textDim, fontSize: 11 },
  mapFrame: {
    position: "relative",
    borderRadius: 18,
    border: `1px solid ${T.cardBorder}`,
    background:
      "radial-gradient(circle at top left, rgba(34,211,238,0.045), transparent 24%), radial-gradient(circle at bottom center, rgba(245,158,11,0.05), transparent 26%), rgba(255,255,255,0.02)",
    overflow: "hidden",
    marginBottom: 10,
  },
  bottomRow: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  bottomStat: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
  },
  bottomLabel: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  bottomValue: { color: T.textPrimary, fontSize: 15, fontWeight: 700 },
  bottomMeta: { color: T.textDim, fontSize: 11, lineHeight: 1.35 },
  coverageNote: { color: T.textDim, fontSize: 11.5, lineHeight: 1.45 },
  tooltip: {
    position: "absolute",
    maxWidth: 270,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(17,17,19,0.96)",
    border: `1px solid ${T.cardBorder}`,
    boxShadow: "0 16px 32px rgba(0,0,0,0.25)",
    pointerEvents: "none",
  },
  tooltipTitle: { color: T.textPrimary, fontSize: 12 },
  tooltipBody: { color: T.textSecondary, fontSize: 11, lineHeight: 1.4 },
  tooltipRow: { display: "grid", gridTemplateColumns: "10px 1fr auto", gap: 8, alignItems: "center" },
  tooltipDot: { width: 8, height: 8, borderRadius: "50%" },
  tooltipLabel: { color: T.textSecondary, fontSize: 11 },
  tooltipValue: { color: T.textPrimary, fontSize: 11 },
};
