import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { LAYERS } from "../utils/indicators";
import { T } from "../utils/theme";

const MARGIN = { top: 10, right: 20, bottom: 30, left: 55 };
const CHART_HEIGHT = 240;
const WINDOW_DAYS = 90;
const MS_PER_DAY = 86400000;

function formatYTick(unit) {
  switch (unit) {
    case "percent":
      return (value) => `${value}%`;
    case "billions":
      return (value) => `$${d3.format(",")(value)}B`;
    case "thousands":
      return (value) => `${d3.format(",")(value)}K`;
    case "index":
    default:
      return (value) => d3.format(",")(value);
  }
}

function formatChange(change, changeType) {
  if (change == null) return null;
  const sign = change >= 0 ? "+" : "";
  if (changeType === "pp") return `${sign}${change.toFixed(2)} pp`;
  if (changeType === "pct") return `${sign}${change.toFixed(1)}%`;
  return `${sign}${change.toFixed(2)}`;
}

function useContainerWidth(ref, fallback = 520) {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    if (!ref.current) return;

    const updateWidth = (nextWidth) => {
      if (!nextWidth) return;
      setWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth
      );
    };

    updateWidth(Math.round(ref.current.clientWidth));

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver((entries) => {
      updateWidth(Math.round(entries[0]?.contentRect.width));
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

const DIRECTION_COLORS = { hike: T.hike, cut: T.cut, hold: T.hold };

export default function TimeSeriesPanel({
  data,
  event,
  indicatorMeta,
  changeInfo,
  direction,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const prevDataKeyRef = useRef(null);
  const width = useContainerWidth(containerRef, 520);

  const windowedData = useMemo(() => {
    if (!data?.length || !event?.date) return [];
    const eventMs = event.date.getTime();
    const lowerBound = eventMs - WINDOW_DAYS * MS_PER_DAY;
    const upperBound = eventMs + WINDOW_DAYS * MS_PER_DAY;

    return data.filter((row) => {
      const time = row.date.getTime();
      return time >= lowerBound && time <= upperBound;
    });
  }, [data, event]);

  useEffect(() => {
    if (!svgRef.current || !windowedData.length || !event?.date || !indicatorMeta) {
      return;
    }

    const dataKey = `${indicatorMeta.key}-${event.dateStr}-${windowedData.length}-${width}`;
    const shouldAnimate = prevDataKeyRef.current !== dataKey;
    prevDataKeyRef.current = dataKey;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

    svg
      .attr("viewBox", `0 0 ${width} ${CHART_HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const chart = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const eventMs = event.date.getTime();
    const xDomain = [
      new Date(eventMs - WINDOW_DAYS * MS_PER_DAY),
      new Date(eventMs + WINDOW_DAYS * MS_PER_DAY),
    ];

    const x = d3.scaleTime().domain(xDomain).range([0, innerWidth]);

    const [minValue, maxValue] = d3.extent(windowedData, (row) => row.value);
    const yPadding = (maxValue - minValue) * 0.05 || 1;
    const y = d3
      .scaleLinear()
      .domain([minValue - yPadding, maxValue + yPadding])
      .range([innerHeight, 0]);

    const unit = indicatorMeta.unit || "index";
    const layer = LAYERS.find((entry) => entry.id === indicatorMeta.layerId);
    const windowDays = layer?.windowDays ?? 10;

    chart
      .selectAll(".grid-line")
      .data(y.ticks(4))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (tick) => y(tick))
      .attr("y2", (tick) => y(tick))
      .attr("stroke", T.cardBorderLight)
      .attr("stroke-opacity", 0.35);

    const beforeStart = new Date(eventMs - windowDays * MS_PER_DAY);
    const beforeEnd = event.date;
    const afterStart = new Date(eventMs + 2 * MS_PER_DAY);
    const afterEnd = new Date(eventMs + (2 + windowDays) * MS_PER_DAY);

    const beforeBand = chart
      .append("rect")
      .attr("x", x(beforeStart))
      .attr("y", 0)
      .attr("width", Math.max(0, x(beforeEnd) - x(beforeStart)))
      .attr("height", innerHeight)
      .attr("fill", T.accent)
      .attr("fill-opacity", shouldAnimate ? 0 : 0.08);

    const afterBand = chart
      .append("rect")
      .attr("x", x(afterStart))
      .attr("y", 0)
      .attr("width", Math.max(0, x(afterEnd) - x(afterStart)))
      .attr("height", innerHeight)
      .attr("fill", T.cut)
      .attr("fill-opacity", shouldAnimate ? 0 : 0.08);

    if (shouldAnimate) {
      beforeBand
        .transition()
        .duration(300)
        .attr("fill-opacity", 0.08);

      afterBand
        .transition()
        .delay(120)
        .duration(300)
        .attr("fill-opacity", 0.08);
    }

    const area = d3
      .area()
      .curve(d3.curveMonotoneX)
      .x((row) => x(row.date))
      .y0(innerHeight)
      .y1((row) => y(row.value));

    chart
      .append("path")
      .datum(windowedData)
      .attr("d", area)
      .attr("fill", T.accent)
      .attr("fill-opacity", 0.1);

    const line = d3
      .line()
      .curve(d3.curveMonotoneX)
      .x((row) => x(row.date))
      .y((row) => y(row.value));

    const linePath = chart
      .append("path")
      .datum(windowedData)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", T.accent)
      .attr("stroke-width", 2.1);

    if (shouldAnimate) {
      const length = linePath.node().getTotalLength();
      linePath
        .attr("stroke-dasharray", length)
        .attr("stroke-dashoffset", length)
        .transition()
        .duration(520)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    }

    const eventX = x(event.date);

    chart
      .append("line")
      .attr("x1", eventX)
      .attr("x2", eventX)
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", T.textPrimary)
      .attr("stroke-opacity", 0.38)
      .attr("stroke-dasharray", "4,4");

    chart
      .append("text")
      .attr("x", eventX)
      .attr("y", -3)
      .attr("text-anchor", "middle")
      .attr("fill", T.textSecondary)
      .attr("font-size", 10)
      .attr("font-family", FONT_FAMILY)
      .text(event.dateStr);

    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat(d3.timeFormat("%b '%y"))
      .tickSize(4);

    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select(".domain").attr("stroke", T.cardBorder);
    xAxisGroup.selectAll(".tick line").attr("stroke", T.cardBorder);
    xAxisGroup
      .selectAll(".tick text")
      .attr("fill", T.textMuted)
      .attr("font-size", 10)
      .attr("font-family", FONT_FAMILY);

    const yAxis = d3
      .axisLeft(y)
      .ticks(4)
      .tickFormat(formatYTick(unit))
      .tickSize(4);

    const yAxisGroup = chart.append("g").call(yAxis);
    yAxisGroup.select(".domain").attr("stroke", T.cardBorder);
    yAxisGroup.selectAll(".tick line").attr("stroke", T.cardBorder);
    yAxisGroup
      .selectAll(".tick text")
      .attr("fill", T.textMuted)
      .attr("font-size", 10)
      .attr("font-family", FONT_FAMILY);

    const hoverLine = chart
      .append("line")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", T.textPrimary)
      .attr("stroke-opacity", 0.28)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("display", "none");

    const hoverDot = chart
      .append("circle")
      .attr("r", 4)
      .attr("fill", T.accent)
      .attr("stroke", T.pageBg)
      .attr("stroke-width", 2)
      .style("display", "none");

    const tooltip = chart.append("g").style("display", "none");
    const tooltipRect = tooltip
      .append("rect")
      .attr("rx", 6)
      .attr("fill", T.cardBg)
      .attr("stroke", T.cardBorder)
      .attr("opacity", 0.96);
    const tooltipDate = tooltip
      .append("text")
      .attr("fill", T.textSecondary)
      .attr("font-size", 9)
      .attr("font-family", FONT_FAMILY);
    const tooltipValue = tooltip
      .append("text")
      .attr("fill", T.textPrimary)
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("font-family", FONT_FAMILY);

    const bisect = d3.bisector((row) => row.date).left;

    chart
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", (pointerEvent) => {
        const [mouseX] = d3.pointer(pointerEvent);
        const hoveredDate = x.invert(mouseX);
        const index = bisect(windowedData, hoveredDate, 1);
        const left = windowedData[index - 1];
        const right = windowedData[index];
        if (!left) return;

        const row =
          right &&
          hoveredDate - left.date > right.date - hoveredDate
            ? right
            : left;

        const pointX = x(row.date);
        const pointY = y(row.value);

        hoverLine.attr("x1", pointX).attr("x2", pointX).style("display", null);
        hoverDot.attr("cx", pointX).attr("cy", pointY).style("display", null);

        tooltipDate.text(d3.timeFormat("%b %d, %Y")(row.date));
        tooltipValue.text(formatYTick(unit)(row.value));

        const isRightSide = pointX < innerWidth / 2;
        const textX = isRightSide ? pointX + 10 : pointX - 10;
        const anchor = isRightSide ? "start" : "end";

        tooltipDate
          .attr("x", textX)
          .attr("y", pointY - 9)
          .attr("text-anchor", anchor);

        tooltipValue
          .attr("x", textX)
          .attr("y", pointY + 5)
          .attr("text-anchor", anchor);

        const dateBounds = tooltipDate.node().getBBox();
        const valueBounds = tooltipValue.node().getBBox();
        const rectWidth = Math.max(dateBounds.width, valueBounds.width) + 12;
        const rectX = isRightSide ? textX - 6 : textX - rectWidth + 6;

        tooltipRect
          .attr("x", rectX)
          .attr("y", pointY - 22)
          .attr("width", rectWidth)
          .attr("height", 32);

        tooltip.style("display", null);
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        hoverDot.style("display", "none");
        tooltip.style("display", "none");
      });
  }, [event, indicatorMeta, width, windowedData]);

  const layer = indicatorMeta
    ? LAYERS.find((entry) => entry.id === indicatorMeta.layerId)
    : null;
  const changeText =
    changeInfo?.change != null
      ? formatChange(changeInfo.change, changeInfo.changeType)
      : null;
  const changeColor =
    changeInfo?.change == null
      ? T.textSecondary
      : changeInfo.change >= 0
      ? T.positive
      : T.negative;
  const accentColor = DIRECTION_COLORS[direction] || T.accent;

  if (!data?.length || !event || !indicatorMeta) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <span style={{ color: T.textSecondary, fontSize: 14 }}>
            Select an indicator from the ripple or explorer to inspect it here.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="dash-card"
      style={{
        ...styles.container,
        borderLeft: `3px solid ${accentColor}`,
      }}
      ref={containerRef}
    >
      <div style={styles.header}>
        <div style={styles.headerCopy}>
          <div style={styles.indicatorName} title={indicatorMeta.description}>
            {indicatorMeta.label}
          </div>
        </div>

        {changeText && (
          <div
            style={{
              ...styles.changeBadge,
              color: changeColor,
              borderColor: `${changeColor}55`,
            }}
          >
            {changeText}
          </div>
        )}
      </div>

      <div style={styles.metaRow}>
        <span style={styles.metaPill}>
          Layer {indicatorMeta.layerId} | {indicatorMeta.layerName}
        </span>
        <span style={styles.metaNote}>
          {layer ? `${layer.windowDays}-day event window` : "Event window"}
        </span>
      </div>

      <svg
        ref={svgRef}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}

const FONT_FAMILY =
  '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif';

const styles = {
  container: {
    background: `linear-gradient(135deg, ${T.cardBg} 0%, ${T.cardBgAlt} 100%)`,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 16,
    padding: 18,
    fontFamily: FONT_FAMILY,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headerCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    maxWidth: 560,
  },
  indicatorName: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  changeBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid",
    background: "rgba(255,255,255,0.03)",
    fontSize: 14,
    fontWeight: 700,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "0 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${T.cardBorder}`,
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  metaNote: {
    color: T.textDim,
    fontSize: 12,
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
  },
};
