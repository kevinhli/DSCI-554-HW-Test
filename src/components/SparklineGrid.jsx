import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ALL_INDICATORS, LAYERS } from "../utils/indicators";
import { T } from "../utils/theme";
import {
  getDisplayMagnitude,
  isDivergentIndicator,
} from "../utils/dashboardInsights";

const DAY_MS = 86400000;
const WINDOW = 90;
const FONT =
  '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif';

function formatChange(change, changeType, unit) {
  if (change == null) return "N/A";
  const sign = change > 0 ? "+" : "";
  if (changeType === "pp") return `${sign}${change.toFixed(2)} pp`;
  if (changeType === "pct") return `${sign}${change.toFixed(1)}%`;
  return `${sign}${change.toFixed(2)}${unit ? ` ${unit}` : ""}`;
}

function changeColor(change) {
  if (change == null) return T.textSecondary;
  return change > 0 ? T.positive : change < 0 ? T.negative : T.textSecondary;
}

function Sparkline({ data, eventDate, divergent }) {
  const pathRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    path.style.transition = "none";
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 300ms ease-out";
    path.style.strokeDashoffset = "0";
  }, [data, eventDate, divergent]);

  if (!data || data.length < 2) {
    return <svg viewBox="0 0 180 54" style={{ width: "100%", height: 54 }} />;
  }

  const x = d3
    .scaleTime()
    .domain([
      new Date(eventDate.getTime() - WINDOW * DAY_MS),
      new Date(eventDate.getTime() + WINDOW * DAY_MS),
    ])
    .range([0, 180]);

  const extent = d3.extent(data, (d) => d.value);
  const min = extent[0] ?? 0;
  const max = extent[1] ?? 0;
  const pad = (max - min) * 0.08 || 1;

  const y = d3
    .scaleLinear()
    .domain([min - pad, max + pad])
    .range([50, 4]);

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const eventX = x(eventDate);

  return (
    <svg
      viewBox="0 0 180 54"
      style={{ width: "100%", height: 54, display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        x1={eventX}
        y1={0}
        x2={eventX}
        y2={54}
        stroke={T.sparklineEventLine}
        strokeDasharray="2,3"
        opacity={0.55}
      />
      <path
        ref={pathRef}
        d={line(data)}
        fill="none"
        stroke={divergent ? T.divergence : T.sparklineStroke}
        strokeWidth={1.45}
      />
    </svg>
  );
}

const SORT_MODES = [
  { id: "layer", label: "By layer" },
  { id: "impact", label: "By impact" },
  { id: "name", label: "By name" },
];

const LAYER_COLORS = T.layerColors;

function pillStyle(active) {
  return {
    background: active ? T.cardBgActive : T.cardBg,
    border: `1px solid ${active ? T.accent : T.cardBorder}`,
    color: active ? T.textPrimary : T.textSecondary,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function IndicatorCard({
  indicator,
  changeInfo,
  active,
  event,
  windowedData,
  direction,
  onSelect,
}) {
  const divergent = changeInfo
    ? isDivergentIndicator(indicator, changeInfo.change, direction)
    : false;
  const showStatusRow = active || divergent;

  return (
    <button
      type="button"
      className="dash-card"
      onClick={() => onSelect(indicator.key)}
      aria-pressed={active}
      style={{
        background: active
          ? `linear-gradient(135deg, ${T.cardBgActive} 0%, ${T.cardBgAlt} 100%)`
          : `linear-gradient(135deg, ${T.cardBg} 0%, ${T.cardBgAlt} 100%)`,
        border: `1px solid ${
          active ? T.accent : divergent ? `${T.divergence}80` : T.cardBorderLight
        }`,
        borderLeft: `3px solid ${
          active
            ? T.accent
            : divergent
            ? T.divergence
            : changeInfo?.change != null && changeInfo.change !== 0
            ? changeInfo.change > 0
              ? T.positive
              : T.negative
            : T.neutral
        }`,
        borderRadius: 12,
        padding: 12,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        fontFamily: FONT,
        boxShadow: active ? `0 0 0 1px ${T.accentGlowStrong}` : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              color: T.textPrimary,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {indicator.label}
          </span>
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Layer {indicator.layerId}
            {indicator.cascade ? "  |  Cascade" : "  |  Supporting"}
          </span>
        </div>

        <span
          style={{
            color: changeColor(changeInfo?.change),
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.3,
            textAlign: "right",
          }}
        >
          {changeInfo
            ? formatChange(changeInfo.change, changeInfo.changeType, changeInfo.unit)
            : "N/A"}
        </span>
      </div>

      <Sparkline
        data={windowedData[indicator.key]}
        eventDate={event.date}
        divergent={divergent}
      />

      {showStatusRow && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {active ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 24,
                padding: "0 10px",
                borderRadius: 999,
                background: `${T.accent}24`,
                color: T.textPrimary,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Selected
            </span>
          ) : (
            <span />
          )}

          {divergent && (
            <span
              style={{
                color: T.divergence,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Divergent
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export default function SparklineGrid({
  indicatorData,
  event,
  changes,
  activeIndicator,
  onSelect,
  direction,
  scaleMode = "raw",
}) {
  const [sortMode, setSortMode] = useState("layer");
  const [collapsed, setCollapsed] = useState(false);

  const changeMap = useMemo(() => {
    if (!changes) return {};
    return Object.fromEntries(changes.map((changeInfo) => [changeInfo.key, changeInfo]));
  }, [changes]);

  const windowedData = useMemo(() => {
    if (!indicatorData || !event) return {};

    const lowerBound = event.date.getTime() - WINDOW * DAY_MS;
    const upperBound = event.date.getTime() + WINDOW * DAY_MS;

    const next = {};

    for (const indicator of ALL_INDICATORS) {
      const series = indicatorData[indicator.key];
      next[indicator.key] = (series || []).filter((row) => {
        const time = row.date.getTime();
        return time >= lowerBound && time <= upperBound;
      });
    }

    return next;
  }, [indicatorData, event]);

  const sortedIndicators = useMemo(() => {
    const list = [...ALL_INDICATORS];

    if (sortMode === "impact") {
      list.sort(
        (left, right) =>
          (getDisplayMagnitude(changeMap[right.key], scaleMode) ?? -1) -
          (getDisplayMagnitude(changeMap[left.key], scaleMode) ?? -1)
      );
    } else if (sortMode === "name") {
      list.sort((left, right) => left.label.localeCompare(right.label));
    }

    return list;
  }, [changeMap, scaleMode, sortMode]);

  if (!changes?.length || !event) return null;

  return (
    <section
      style={{
        marginTop: 0,
        fontFamily: FONT,
        paddingTop: 8,
      }}
      aria-label="All indicators"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ maxWidth: 580 }}>
          <div
            style={{
              color: T.textPrimary,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            All indicators
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="ghost-button"
            style={{ minHeight: 34, padding: "0 14px" }}
            aria-expanded={!collapsed}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>

          {!collapsed &&
            SORT_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                style={pillStyle(sortMode === mode.id)}
                onClick={() => setSortMode(mode.id)}
                aria-pressed={sortMode === mode.id}
              >
                {mode.label}
              </button>
            ))}
        </div>
      </div>

      {!collapsed && (
        <div style={{ animation: "fadeSlideIn 200ms ease both" }}>
          {sortMode === "layer" ? (
            LAYERS.map((layer) => {
              const layerIndicators = layer.indicators;
              const divergentCount = layerIndicators.filter((indicator) =>
                isDivergentIndicator(
                  indicator,
                  changeMap[indicator.key]?.change,
                  direction
                )
              ).length;

              return (
                <div key={layer.id} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        color: LAYER_COLORS[layer.id] || T.textDim,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: LAYER_COLORS[layer.id] || T.textDim,
                          display: "inline-block",
                        }}
                      />
                      {layer.name}
                    </span>

                    <span
                      style={{
                        color: T.textDim,
                        fontSize: 11,
                      }}
                    >
                      {layerIndicators.length} indicators
                    </span>

                    {divergentCount > 0 && (
                      <span
                        style={{
                          color: T.divergence,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {divergentCount} divergent
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {layerIndicators.map((indicator) => (
                      <IndicatorCard
                        key={indicator.key}
                        indicator={indicator}
                        changeInfo={changeMap[indicator.key]}
                        active={indicator.key === activeIndicator}
                        event={event}
                        windowedData={windowedData}
                        direction={direction}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {sortedIndicators.map((indicator) => (
                <IndicatorCard
                  key={indicator.key}
                  indicator={indicator}
                  changeInfo={changeMap[indicator.key]}
                  active={indicator.key === activeIndicator}
                  event={event}
                  windowedData={windowedData}
                  direction={direction}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
