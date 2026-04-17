import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { Delaunay } from "d3-delaunay";
import { ERAS } from "../utils/eras";
import { T } from "../utils/theme";

const MARGIN = { top: 14, right: 20, bottom: 22, left: 50 };
const VB_W = 1000;
const VB_H = 120;
const INNER_W = VB_W - MARGIN.left - MARGIN.right;
const INNER_H = VB_H - MARGIN.top - MARGIN.bottom;
const FONT =
  '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif';

const PALETTE = {
  bg: T.cardBg,
  border: T.cardBorder,
  line: T.timelineLine,
  hike: T.hike,
  cut: T.cut,
  hold: T.hold,
  text: T.textPrimary,
  muted: T.textSecondary,
  dim: T.textMuted,
  activeBg: T.cardBgActive,
  activeBorder: T.accent,
  playhead: T.timelinePlayhead,
};

const DIR_META = {
  hike: { color: PALETTE.hike },
  cut: { color: PALETTE.cut },
  hold: { color: PALETTE.hold },
};

const pillBase = {
  background: PALETTE.bg,
  border: `1px solid ${PALETTE.border}`,
  color: PALETTE.muted,
  borderRadius: 999,
  minHeight: 32,
  padding: "0 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s",
  whiteSpace: "nowrap",
};

const pillActive = {
  ...pillBase,
  background: PALETTE.activeBg,
  border: `1px solid ${PALETTE.activeBorder}`,
  color: PALETTE.text,
};

function formatTooltip(event) {
  if (event.direction === "hold") return `${event.dateStr}  HOLD`;
  const basisPoints = Math.round(event.changePct * 100);
  return `${event.dateStr}  ${basisPoints > 0 ? "+" : ""}${basisPoints} bps`;
}

export default function RateTimeline({
  rateData,
  events,
  selectedDate,
  onSelect,
  collapsed,
}) {
  const svgRef = useRef(null);
  const firstRender = useRef(true);
  const [activeEra, setActiveEra] = useState(null);
  const [xDomain, setXDomain] = useState(null);

  const fullExtent = rateData?.length
    ? d3.extent(rateData, (row) => row.date)
    : [new Date("2000-01-01"), new Date()];

  const domain = xDomain || fullExtent;

  const handleEra = useCallback((era) => {
    if (era) {
      setActiveEra(era.id);
      setXDomain([new Date(era.start), new Date(era.end)]);
    } else {
      setActiveEra(null);
      setXDomain(null);
    }
  }, []);

  const selectedIndex = useMemo(() => {
    if (!events || !selectedDate) return -1;
    return events.findIndex((event) => event.dateStr === selectedDate);
  }, [events, selectedDate]);

  const stepEvent = useCallback(
    (delta, skipHolds) => {
      if (!events?.length) return;

      let index = selectedIndex;
      if (index < 0) index = events.length - 1;

      for (let iteration = 0; iteration < events.length; iteration += 1) {
        index += delta;
        if (index < 0) index = events.length - 1;
        if (index >= events.length) index = 0;
        if (!skipHolds || events[index].direction !== "hold") break;
      }

      onSelect(events[index].dateStr);
    },
    [events, onSelect, selectedIndex]
  );

  useEffect(() => {
    if (!rateData?.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .append("rect")
      .attr("width", VB_W)
      .attr("height", VB_H)
      .attr("rx", 12)
      .attr("fill", PALETTE.bg);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleTime().domain(domain).range([0, INNER_W]);
    const visibleData = rateData.filter(
      (row) => row.date >= domain[0] && row.date <= domain[1]
    );

    const extent = d3.extent(visibleData, (row) => row.value);
    const min = extent[0] ?? 0;
    const max = extent[1] ?? 0;
    const yPad = (max - min) * 0.15 || 0.25;
    const y = d3
      .scaleLinear()
      .domain([Math.max(0, min - yPad), max + yPad])
      .range([INNER_H, 0]);

    const bands = chart.append("g");
    ERAS.forEach((era) => {
      const eraStart = new Date(era.start);
      const eraEnd = new Date(era.end);
      if (eraEnd < domain[0] || eraStart > domain[1]) return;

      const x0 = Math.max(0, x(eraStart));
      const x1 = Math.min(INNER_W, x(eraEnd));
      if (x1 - x0 < 2) return;

      bands
        .append("rect")
        .attr("x", x0)
        .attr("y", 0)
        .attr("width", x1 - x0)
        .attr("height", INNER_H)
        .attr("fill", era.color)
        .attr("rx", 3);

      if (x1 - x0 > 44) {
        bands
          .append("text")
          .attr("x", (x0 + x1) / 2)
          .attr("y", INNER_H - 4)
          .attr("text-anchor", "middle")
          .attr("fill", PALETTE.dim)
          .attr("font-size", 8)
          .attr("font-family", FONT)
          .attr("opacity", 0.72)
          .text(era.label);
      }
    });

    chart
      .append("g")
      .attr("transform", `translate(0,${INNER_H})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickSize(3)
          .tickFormat((tick) => `'${String(tick.getFullYear()).slice(2)}`)
      )
      .call((selection) => selection.select(".domain").remove())
      .selectAll("text")
      .attr("fill", PALETTE.dim)
      .attr("font-size", 10)
      .attr("font-family", FONT);

    chart.selectAll(".tick line").attr("stroke", PALETTE.dim).attr("opacity", 0.28);

    chart
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(3)
          .tickSize(-INNER_W)
          .tickFormat((tick) => `${tick}%`)
      )
      .call((selection) => selection.select(".domain").remove())
      .selectAll("text")
      .attr("fill", PALETTE.dim)
      .attr("font-size", 9)
      .attr("font-family", FONT);

    chart.selectAll(".tick line").attr("stroke", PALETTE.dim).attr("opacity", 0.08);

    chart
      .append("text")
      .attr("x", -MARGIN.left + 4)
      .attr("y", -4)
      .attr("fill", PALETTE.dim)
      .attr("font-size", 8)
      .attr("font-family", FONT)
      .text("Fed rate");

    const area = d3
      .area()
      .curve(d3.curveStepAfter)
      .x((row) => x(row.date))
      .y0(INNER_H)
      .y1((row) => y(row.value));

    chart
      .append("path")
      .datum(visibleData)
      .attr("d", area)
      .attr("fill", PALETTE.line)
      .attr("opacity", 0.08);

    const line = d3
      .line()
      .curve(d3.curveStepAfter)
      .x((row) => x(row.date))
      .y((row) => y(row.value));

    const linePath = chart
      .append("path")
      .datum(visibleData)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", PALETTE.line)
      .attr("stroke-width", 1.5);

    if (firstRender.current) {
      const length = linePath.node().getTotalLength();
      linePath
        .attr("stroke-dasharray", length)
        .attr("stroke-dashoffset", length)
        .transition()
        .duration(1000)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
      firstRender.current = false;
    }

    const selectedEvent = (events || []).find(
      (event) => event.dateStr === selectedDate
    );

    if (
      selectedEvent &&
      selectedEvent.date >= domain[0] &&
      selectedEvent.date <= domain[1]
    ) {
      const pointX = x(selectedEvent.date);
      const color = DIR_META[selectedEvent.direction]?.color || PALETTE.hold;

      chart
        .append("line")
        .attr("x1", pointX)
        .attr("x2", pointX)
        .attr("y1", 0)
        .attr("y2", INNER_H)
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.62);

      chart
        .append("circle")
        .attr("cx", pointX)
        .attr("cy", y(selectedEvent.rateAfter))
        .attr("r", 4)
        .attr("fill", color)
        .attr("stroke", PALETTE.playhead)
        .attr("stroke-width", 1.5)
        .style("--ph-color", color)
        .style("animation", "playheadGlow 3s ease-in-out infinite");

      chart
        .append("text")
        .attr("x", pointX)
        .attr("y", -1)
        .attr("text-anchor", "middle")
        .attr("fill", PALETTE.text)
        .attr("font-size", 8)
        .attr("font-family", FONT)
        .attr("opacity", 0.84)
        .text(selectedEvent.dateStr);
    }

    const visibleEvents = (events || []).filter(
      (event) => event.date >= domain[0] && event.date <= domain[1]
    );

    if (visibleEvents.length) {
      const points = visibleEvents.map((event) => [
        x(event.date),
        y(event.rateAfter),
      ]);
      const delaunay = Delaunay.from(points);

      const hoverLine = chart
        .append("line")
        .attr("y1", 0)
        .attr("y2", INNER_H)
        .attr("stroke", PALETTE.muted)
        .attr("stroke-width", 0.6)
        .attr("stroke-dasharray", "3,2")
        .attr("opacity", 0)
        .style("pointer-events", "none");

      const tooltip = chart
        .append("text")
        .attr("text-anchor", "middle")
        .attr("fill", PALETTE.text)
        .attr("font-size", 9)
        .attr("font-family", FONT)
        .attr("opacity", 0)
        .style("pointer-events", "none");

      chart
        .append("rect")
        .attr("width", INNER_W)
        .attr("height", INNER_H)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mousemove", function (pointerEvent) {
          const [mouseX, mouseY] = d3.pointer(pointerEvent, this);
          const index = delaunay.find(mouseX, mouseY);
          if (index < 0 || index >= visibleEvents.length) return;

          const event = visibleEvents[index];
          const pointX = x(event.date);

          hoverLine.attr("x1", pointX).attr("x2", pointX).attr("opacity", 0.35);
          tooltip
            .attr("x", Math.min(INNER_W - 60, Math.max(60, pointX)))
            .attr("y", 11)
            .attr("opacity", 1)
            .text(formatTooltip(event));
        })
        .on("mouseleave", () => {
          hoverLine.attr("opacity", 0);
          tooltip.attr("opacity", 0);
        })
        .on("click", function (pointerEvent) {
          const [mouseX, mouseY] = d3.pointer(pointerEvent, this);
          const index = delaunay.find(mouseX, mouseY);
          if (index >= 0 && index < visibleEvents.length) {
            onSelect?.(visibleEvents[index].dateStr);
          }
        });
    }
  }, [domain, events, onSelect, rateData, selectedDate]);

  useEffect(() => {
    const handleKey = (event) => {
      const targetTag = event.target.tagName;
      if (
        targetTag === "INPUT" ||
        targetTag === "TEXTAREA" ||
        targetTag === "SELECT"
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepEvent(-1, event.shiftKey);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        stepEvent(1, event.shiftKey);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stepEvent]);

  if (collapsed) return null;

  return (
    <div
      style={{
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        animation: "fadeSlideIn 200ms ease both",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: PALETTE.text,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontFamily: FONT,
          }}
        >
          Rate timeline
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          style={activeEra === null ? pillActive : pillBase}
          onClick={() => handleEra(null)}
          aria-pressed={activeEra === null}
        >
          All
        </button>
        {ERAS.map((era) => (
          <button
            key={era.id}
            type="button"
            style={activeEra === era.id ? pillActive : pillBase}
            onClick={() => handleEra(era)}
            aria-pressed={activeEra === era.id}
            >
              {era.label}
            </button>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        style={{ display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
}
