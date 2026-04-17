import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { T } from "../utils/theme";

const VB_W = 420;
const VB_H = 220;
const MARGIN = { top: 18, right: 20, bottom: 34, left: 48 };
const INNER_W = VB_W - MARGIN.left - MARGIN.right;
const INNER_H = VB_H - MARGIN.top - MARGIN.bottom;

const DAY_MS = 86400000;

const MATURITIES = [
  { key: "DGS2", label: "2Y", x: 2 },
  { key: "DGS10", label: "10Y", x: 10 },
  { key: "DGS30", label: "30Y", x: 30 },
];

function avgInWindow(rows, centerDate, offsetDays, windowSize) {
  const start = new Date(centerDate.getTime() + offsetDays * DAY_MS);
  const end = new Date(start.getTime() + windowSize * DAY_MS);
  const values = rows.filter(
    (row) => row.date >= start && row.date <= end && !isNaN(row.value)
  );
  if (!values.length) return null;
  return values.reduce((sum, row) => sum + row.value, 0) / values.length;
}

const DIRECTION_COLORS = { hike: T.hike, cut: T.cut, hold: T.hold };
const FONT_FAMILY =
  '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif';

export default function YieldCurveChart({ indicatorData, event, direction }) {
  const svgRef = useRef(null);
  const previousEventRef = useRef(null);

  const hasSeries =
    indicatorData &&
    MATURITIES.every(
      (maturity) =>
        indicatorData[maturity.key] && indicatorData[maturity.key].length > 0
    );

  const curveData = useMemo(() => {
    if (!hasSeries || !event) return null;
    const eventDate =
      event.date instanceof Date ? event.date : new Date(event.date);

    const points = MATURITIES.map((maturity) => {
      const rows = indicatorData[maturity.key];
      return {
        label: maturity.label,
        x: maturity.x,
        before: avgInWindow(rows, eventDate, -10, 10),
        after: avgInWindow(rows, eventDate, 2, 10),
      };
    });

    if (points.some((point) => point.before == null || point.after == null)) {
      return null;
    }

    return points;
  }, [event, hasSeries, indicatorData]);

  useEffect(() => {
    if (!curveData || !event) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chart = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const allValues = curveData.flatMap((point) => [point.before, point.after]);
    const minValue = (d3.min(allValues) ?? 0) - 0.2;
    const maxValue = (d3.max(allValues) ?? 0) + 0.2;

    const x = d3.scaleLinear().domain([0, 32]).range([0, INNER_W]);
    const y = d3.scaleLinear().domain([minValue, maxValue]).range([INNER_H, 0]);

    chart
      .append("g")
      .attr("transform", `translate(0,${INNER_H})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues([2, 10, 30])
          .tickFormat((value) => ({ 2: "2Y", 10: "10Y", 30: "30Y" }[value]))
          .tickSize(3)
      )
      .call((axis) => axis.select(".domain").attr("stroke", T.cardBorder))
      .call((axis) => axis.selectAll(".tick line").attr("stroke", T.cardBorder))
      .call((axis) =>
        axis
          .selectAll(".tick text")
          .attr("fill", T.textMuted)
          .attr("font-size", 10)
          .attr("font-family", FONT_FAMILY)
      );

    chart
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((value) => `${value.toFixed(1)}%`)
          .tickSize(-INNER_W)
      )
      .call((axis) => axis.select(".domain").remove())
      .call((axis) =>
        axis
          .selectAll(".tick line")
          .attr("stroke", T.cardBorderLight)
          .attr("stroke-dasharray", "2,2")
      )
      .call((axis) =>
        axis
          .selectAll(".tick text")
          .attr("fill", T.textMuted)
          .attr("font-size", 9)
          .attr("font-family", FONT_FAMILY)
      );

    const line = d3
      .line()
      .x((point) => x(point.x))
      .curve(d3.curveMonotoneX);

    const beforeLine = line.y((point) => y(point.before));
    const afterLine = line.y((point) => y(point.after));

    const fillColor =
      (d3.mean(curveData, (point) => point.after) ?? 0) >=
      (d3.mean(curveData, (point) => point.before) ?? 0)
        ? T.positive
        : T.negative;

    const area = d3
      .area()
      .x((point) => x(point.x))
      .y0((point) => y(point.before))
      .y1((point) => y(point.after))
      .curve(d3.curveMonotoneX);

    chart
      .append("path")
      .datum(curveData)
      .attr("d", area)
      .attr("fill", fillColor)
      .attr("fill-opacity", 0.15)
      .attr("stroke", "none");

    chart
      .append("path")
      .datum(curveData)
      .attr("d", beforeLine)
      .attr("fill", "none")
      .attr("stroke", T.textDim)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3");

    const isNewEvent =
      !previousEventRef.current ||
      previousEventRef.current.dateStr !== event.dateStr;

    const afterPath = chart
      .append("path")
      .datum(curveData)
      .attr("fill", "none")
      .attr("stroke", T.accent)
      .attr("stroke-width", 2.2);

    if (isNewEvent) {
      afterPath
        .attr("d", beforeLine)
        .transition()
        .duration(520)
        .ease(d3.easeCubicOut)
        .attr("d", afterLine);
    } else {
      afterPath.attr("d", afterLine);
    }

    const tooltip = chart.append("g").style("display", "none");
    const tooltipRect = tooltip
      .append("rect")
      .attr("rx", 6)
      .attr("fill", T.cardBg)
      .attr("stroke", T.cardBorder)
      .attr("opacity", 0.96);
    const tooltipTitle = tooltip
      .append("text")
      .attr("fill", T.textSecondary)
      .attr("font-size", 9)
      .attr("font-family", FONT_FAMILY);
    const tooltipValue = tooltip
      .append("text")
      .attr("fill", T.textPrimary)
      .attr("font-size", 10)
      .attr("font-weight", 700)
      .attr("font-family", FONT_FAMILY);

    function showTooltip(point, which) {
      const pointX = x(point.x);
      const value = which === "before" ? point.before : point.after;
      const pointY = y(value);
      const title = `${point.label} | ${which === "before" ? "Before" : "After"}`;
      const formattedValue = value != null ? `${value.toFixed(2)}%` : "N/A";

      tooltipTitle.text(title);
      tooltipValue.text(formattedValue);

      const isRightSide = pointX < INNER_W / 2;
      const textX = isRightSide ? pointX + 10 : pointX - 10;
      const anchor = isRightSide ? "start" : "end";

      tooltipTitle
        .attr("x", textX)
        .attr("y", pointY - 7)
        .attr("text-anchor", anchor);

      tooltipValue
        .attr("x", textX)
        .attr("y", pointY + 6)
        .attr("text-anchor", anchor);

      const titleBounds = tooltipTitle.node().getBBox();
      const valueBounds = tooltipValue.node().getBBox();
      const width = Math.max(titleBounds.width, valueBounds.width) + 12;
      const rectX = isRightSide ? textX - 6 : textX - width + 6;

      tooltipRect
        .attr("x", rectX)
        .attr("y", pointY - 20)
        .attr("width", width)
        .attr("height", 31);

      tooltip.style("display", null);
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    chart
      .selectAll(".dot-before")
      .data(curveData)
      .join("circle")
      .attr("cx", (point) => x(point.x))
      .attr("cy", (point) => y(point.before))
      .attr("r", 3.2)
      .attr("fill", T.textDim)
      .style("cursor", "pointer")
      .on("mouseover", (_, point) => showTooltip(point, "before"))
      .on("mouseout", hideTooltip);

    const afterDots = chart
      .selectAll(".dot-after")
      .data(curveData)
      .join("circle")
      .attr("cx", (point) => x(point.x))
      .attr("r", 3.5)
      .attr("fill", T.accent)
      .style("cursor", "pointer")
      .on("mouseover", (_, point) => showTooltip(point, "after"))
      .on("mouseout", hideTooltip);

    if (isNewEvent) {
      afterDots
        .attr("cy", (point) => y(point.before))
        .transition()
        .duration(520)
        .ease(d3.easeCubicOut)
        .attr("cy", (point) => y(point.after));
    } else {
      afterDots.attr("cy", (point) => y(point.after));
    }

    const after2Y = curveData.find((point) => point.x === 2)?.after;
    const after10Y = curveData.find((point) => point.x === 10)?.after;

    if (after10Y != null && after2Y != null && after10Y < after2Y) {
      chart
        .append("text")
        .attr("x", INNER_W)
        .attr("y", 4)
        .attr("text-anchor", "end")
        .attr("fill", T.negative)
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .text("Curve inverted");
    }

    const legend = chart
      .append("g")
      .attr("transform", `translate(0, ${INNER_H + 24})`);

    legend
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 16)
      .attr("y2", 0)
      .attr("stroke", T.textDim)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3");
    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 3)
      .attr("fill", T.textSecondary)
      .attr("font-size", 10)
      .attr("font-family", FONT_FAMILY)
      .text("Before");

    legend
      .append("line")
      .attr("x1", 68)
      .attr("y1", 0)
      .attr("x2", 84)
      .attr("y2", 0)
      .attr("stroke", T.accent)
      .attr("stroke-width", 2.2);
    legend
      .append("text")
      .attr("x", 88)
      .attr("y", 3)
      .attr("fill", T.textSecondary)
      .attr("font-size", 10)
      .attr("font-family", FONT_FAMILY)
      .text("After");

    previousEventRef.current = event;
  }, [curveData, event]);

  if (!hasSeries || !event || !curveData) {
    return (
      <div style={styles.emptyContainer}>
        <span style={{ color: T.textDim, fontSize: 13 }}>
          Yield curve data unavailable for the selected event.
        </span>
      </div>
    );
  }

  return (
    <div
      className="dash-card"
      style={{
        ...styles.container,
        borderLeft: `3px solid ${DIRECTION_COLORS[direction] || T.accent}`,
      }}
    >
      <div style={styles.header}>
        <div style={styles.title}>Yield curve</div>
        <span style={styles.meta}>10-day average before / after</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}

const styles = {
  container: {
    background: `linear-gradient(135deg, ${T.cardBg} 0%, ${T.cardBgAlt} 100%)`,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 16,
    padding: 18,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    marginBottom: 10,
    fontFamily: FONT_FAMILY,
  },
  title: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  meta: {
    color: T.textDim,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  emptyContainer: {
    background: T.cardBg,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 16,
    padding: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
};
