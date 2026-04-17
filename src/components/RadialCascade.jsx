import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import { LAYERS, ALL_INDICATORS } from "../utils/indicators";
import { T } from "../utils/theme";
import { getIndicatorMeta } from "../utils/dashboardInsights";

const TOTAL_ANIM_DURATION = 3500;

const CASCADE_KEYS = new Set(
  ALL_INDICATORS.filter((indicator) => indicator.cascade).map((indicator) => indicator.key)
);

const PALETTE = {
  bg: T.cascadeBg,
  ringStroke: T.cascadeRingStroke,
  segStroke: T.cascadeSegStroke,
  centerFill: T.cascadeCenterFill,
  centerStroke: T.cascadeCenterStroke,
  text: T.textPrimary,
  textMuted: T.textSecondary,
  textDim: T.textDim,
  neutral: T.neutral,
  layerLabel: T.cascadeLayerLabel,
  leaderLine: T.cascadeLeaderLine,
};

const TAU = 2 * Math.PI;
const SEG_PAD = 0.01;
const LABEL_H = 24;
const MIN_GAP = 2;
const RING_GAPS = [6, 12, 20, 0];

function segColor(change, maxAbs) {
  if (change == null) return PALETTE.neutral;
  const t = Math.min(Math.abs(change) / maxAbs, 1);
  const p = Math.pow(t, 0.55);
  if (change > 0) return d3.interpolateRgb("#1a3328", "#10b981")(p);
  return d3.interpolateRgb("#331a1a", "#ef4444")(p);
}

function resolveOverlaps(labels, halfH) {
  labels.sort((left, right) => left.idealY - right.idealY);
  const h = LABEL_H + MIN_GAP;
  for (let iteration = 0; iteration < 30; iteration += 1) {
    let moved = false;
    for (let i = 1; i < labels.length; i += 1) {
      if (labels[i].y - labels[i - 1].y < h) {
        const push = (h - (labels[i].y - labels[i - 1].y)) / 2 + 0.5;
        labels[i - 1].y -= push;
        labels[i].y += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const top = -halfH + 12;
  const bottom = halfH - 12;
  for (const label of labels) {
    label.y = Math.max(top, Math.min(bottom, label.y));
  }
}

export default function RadialCascade({
  changes,
  event,
  activeIndicator,
  onSegmentClick,
  scaleMode = "raw",
  rippleLens = "all",
}) {
  const svgRef = useRef();
  const onClickRef = useRef(onSegmentClick);

  const prevChangesRef = useRef();
  const prevEventRef = useRef();
  const drawRef = useRef(null);

  useEffect(() => {
    onClickRef.current = onSegmentClick;
  }, [onSegmentClick]);

  useEffect(() => {
    if (!changes || !event) return;

    const shouldAnimate =
      prevChangesRef.current !== changes ||
      prevEventRef.current !== event;
    prevChangesRef.current = changes;
    prevEventRef.current = event;

    const vbW = 1100;
    const vbH = 840;
    const cx = vbW / 2;
    const cy = vbH / 2;
    const ringAreaR = 340;
    const centerR = 58;
    const innerGap = 10;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${vbW} ${vbH}`);

    const defs = svg.append("defs");
    const glowFilter = defs.append("filter").attr("id", "glow");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "blur");
    const merge = glowFilter.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    defs.append("style").text(`
      @keyframes glow-pulse {
        0%, 100% { filter: drop-shadow(0 0 4px rgba(59,130,246,0.3)); }
        50% { filter: drop-shadow(0 0 10px rgba(59,130,246,0.6)); }
      }
    `);

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    let tooltipG;
    let tooltipLine1;
    let tooltipLine2;
    let tooltipLine3;
    let tooltipLine4;

    const layerCount = LAYERS.length;
    const totalGaps = RING_GAPS.reduce((sum, gap) => sum + gap, 0);
    const ringWidth =
      (ringAreaR - centerR - innerGap - totalGaps) / layerCount;

    const wfRange = ringAreaR + 30 - centerR;
    let preGap = 0;
    const layerDelays = [];
    for (let i = 0; i < layerCount; i += 1) {
      const innerRadius = centerR + innerGap + i * ringWidth + preGap;
      const outerRadius = innerRadius + ringWidth;
      layerDelays.push(
        TOTAL_ANIM_DURATION * (((innerRadius + outerRadius) / 2 - centerR) / wfRange)
      );
      preGap += RING_GAPS[i];
    }

    const cascadeChanges = changes.filter((changeInfo) => CASCADE_KEYS.has(changeInfo.key));
    const maxAbsChange = Math.max(
      0.5,
      ...cascadeChanges
        .filter((changeInfo) => changeInfo.change != null)
        .map((changeInfo) => Math.abs(changeInfo.change))
    );

    const hasActive =
      activeIndicator &&
      cascadeChanges.some((changeInfo) => changeInfo.key === activeIndicator);

    const leftLabels = [];
    const rightLabels = [];
    let cumulativeGap = 0;

    for (let li = 0; li < layerCount; li += 1) {
      const layer = LAYERS[li];
      const layerChanges = changes
        .filter((changeInfo) => changeInfo.layerId === layer.id && CASCADE_KEYS.has(changeInfo.key))
        .sort((left, right) => Math.abs(right.change ?? 0) - Math.abs(left.change ?? 0));
      const n = layerChanges.length;
      if (n === 0) {
        cumulativeGap += RING_GAPS[li];
        continue;
      }

      const innerR = centerR + innerGap + li * ringWidth + cumulativeGap;
      const outerR = innerR + ringWidth;
      cumulativeGap += RING_GAPS[li];

      if (li > 0) {
        g.append("circle")
          .attr("r", innerR - 1)
          .attr("fill", "none")
          .attr("stroke", T.cascadeRingGlow)
          .attr("stroke-width", RING_GAPS[li - 1] || 6)
          .attr("opacity", shouldAnimate ? 0 : 0.7);
        if (shouldAnimate) {
          g.select("circle:last-child")
            .transition()
            .delay(layerDelays[li])
            .duration(400)
            .attr("opacity", 0.7);
        }
      }

      const ringBg = g
        .append("circle")
        .attr("r", (innerR + outerR) / 2)
        .attr("fill", "none")
        .attr("stroke", PALETTE.ringStroke)
        .attr("stroke-width", outerR - innerR);

      if (shouldAnimate) {
        ringBg
          .attr("opacity", 0)
          .transition()
          .delay(layerDelays[li])
          .duration(250)
          .ease(d3.easeCubicOut)
          .attr("opacity", 0.4)
          .transition()
          .duration(300)
          .attr("opacity", 0.2);
      } else {
        ringBg.attr("opacity", 0.2);
      }

      const totalPad = n * SEG_PAD;
      const segAngle = (TAU - totalPad) / n;
      const arcGen = d3
        .arc()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .cornerRadius(2);

      const lensMatch = rippleLens === "all" || rippleLens === String(layer.id);
      const lensOpacity = lensMatch ? 1 : 0.15;

      const targetOpacity = (datum) => {
        const base = (() => {
          if (hasActive) return datum.key === activeIndicator ? 1 : 0.3;
          if (datum.change == null) return 0.35;
          return 0.5 + (Math.abs(datum.change) / maxAbsChange) * 0.5;
        })();
        return base * lensOpacity;
      };

      const segs = g
        .selectAll(`.seg-${li}`)
        .data(layerChanges)
        .enter()
        .append("path")
        .attr("class", `seg-${li}`)
        .attr("d", (_, index) => {
          const startAngle = -TAU / 4 + index * (segAngle + SEG_PAD);
          return arcGen({ startAngle, endAngle: startAngle + segAngle });
        })
        .attr("fill", (datum) => {
          const base = segColor(datum.change, maxAbsChange);
          if (hasActive && datum.key === activeIndicator) {
            return d3.color(base).brighter(1.3).toString();
          }
          return base;
        })
        .attr("stroke", (datum) =>
          hasActive && datum.key === activeIndicator ? "#ffffff" : PALETTE.segStroke
        )
        .attr("stroke-width", (datum) =>
          hasActive && datum.key === activeIndicator ? 2 : 1
        )
        .attr("filter", (datum) =>
          hasActive && datum.key === activeIndicator ? "url(#glow)" : null
        )
        .style("cursor", "pointer")
        .on("click", (_, datum) => onClickRef.current?.(datum.key))
        .on("mouseover", function (_event, datum) {
          const idx = layerChanges.indexOf(datum);
          const startAngle = -TAU / 4 + idx * (segAngle + SEG_PAD);
          const midAngle = startAngle + segAngle / 2;
          const tipR = outerR + 18;
          const tx = Math.cos(midAngle) * tipR;
          const ty = Math.sin(midAngle) * tipR;
          const isRight = midAngle > -Math.PI / 2 && midAngle < Math.PI / 2;
          const ox = isRight ? 8 : -228;

          tooltipLine1.text(datum.label);

          if (datum.change != null && datum.changeType != null) {
            let valText;
            let color;
            if (scaleMode === "zscore" && datum.zScore != null) {
              const sign = datum.zScore > 0 ? "+" : "";
              color =
                datum.zScore > 0
                  ? T.positive
                  : datum.zScore < 0
                  ? T.negative
                  : T.textSecondary;
              valText = `${sign}${datum.zScore.toFixed(2)} sd`;
            } else {
              const sign = datum.change > 0 ? "+" : "";
              const suffix = datum.changeType === "pp" ? " pp" : "%";
              const decimals = datum.changeType === "pp" ? 2 : 1;
              color =
                datum.change > 0
                  ? T.positive
                  : datum.change < 0
                  ? T.negative
                  : T.textSecondary;
              valText = `${sign}${datum.change.toFixed(decimals)}${suffix}`;
            }
            tooltipLine2.attr("fill", color).text(valText);
          } else {
            tooltipLine2.attr("fill", T.textSecondary).text("N/A");
          }

          const formatValue = (value) => (value == null ? "--" : Number(value).toFixed(2));
          tooltipLine3.text(
            `${formatValue(datum.valueBefore)} -> ${formatValue(datum.valueAfter)}`
          );

          const indicatorMeta = getIndicatorMeta(datum.key);
          tooltipLine4.text(indicatorMeta?.description || "");

          tooltipG
            .attr("transform", `translate(${tx + ox},${ty - 26})`)
            .attr("visibility", "visible");
        })
        .on("mouseout", function () {
          tooltipG.attr("visibility", "hidden");
        });

      if (shouldAnimate) {
        segs
          .attr("opacity", 0)
          .transition()
          .delay(layerDelays[li])
          .duration(300)
          .ease(d3.easeCubicOut)
          .attr("opacity", (datum) => Math.min(1, targetOpacity(datum) * 1.3))
          .transition()
          .duration(200)
          .attr("opacity", targetOpacity);
      } else {
        segs.attr("opacity", targetOpacity);
      }

      layerChanges.forEach((datum, index) => {
        const startAngle = -TAU / 4 + index * (segAngle + SEG_PAD);
        const midAngle = startAngle + segAngle / 2;
        const isRight = midAngle > -Math.PI / 2 && midAngle < Math.PI / 2;
        const edgeX = Math.cos(midAngle) * (outerR + 2);
        const edgeY = Math.sin(midAngle) * (outerR + 2);

        const label = {
          ...datum,
          midAngle,
          edgeX,
          edgeY,
          idealY: edgeY,
          y: edgeY,
          outerR,
          ringIndex: li,
        };

        if (isRight) rightLabels.push(label);
        else leftLabels.push(label);
      });
    }

    resolveOverlaps(rightLabels, cy);
    resolveOverlaps(leftLabels, cy);

    const elbowR = ringAreaR + 8;
    const textOffset = ringAreaR + 22;
    const labelG = g.append("g");

    function drawSide(labels, isRight) {
      labels.forEach((datum) => {
        const elbowX = isRight ? elbowR : -elbowR;
        const tx = isRight ? textOffset : -textOffset;
        const delay = shouldAnimate ? layerDelays[datum.ringIndex] : 0;
        const duration = shouldAnimate ? 400 : 0;
        const dimmed = hasActive && datum.key !== activeIndicator;
        const labelOpacity = dimmed ? 0.35 : 1;

        const line = labelG
          .append("path")
          .attr(
            "d",
            `M${datum.edgeX},${datum.edgeY} L${elbowX},${datum.y} L${tx},${datum.y}`
          )
          .attr("fill", "none")
          .attr("stroke", PALETTE.leaderLine)
          .attr("stroke-width", 0.7);

        const dot = labelG
          .append("circle")
          .attr("cx", datum.edgeX)
          .attr("cy", datum.edgeY)
          .attr("r", 1.5)
          .attr("fill", PALETTE.leaderLine);

        const anchor = isRight ? "start" : "end";
        const lx = isRight ? tx + 4 : tx - 4;

        const txt = labelG
          .append("text")
          .attr("x", lx)
          .attr("y", datum.y)
          .attr("text-anchor", anchor)
          .attr("dominant-baseline", "central")
          .attr("font-size", 14);

        txt
          .append("tspan")
          .attr("fill", PALETTE.text)
          .attr("font-weight", 500)
          .text(datum.label);

        if (datum.change != null && datum.changeType != null) {
          let valText;
          let color;
          if (scaleMode === "zscore" && datum.zScore != null) {
            const sign = datum.zScore > 0 ? "+" : "";
            color = datum.zScore > 0 ? T.positive : T.negative;
            valText = `  ${sign}${datum.zScore.toFixed(2)} sd`;
          } else {
            const sign = datum.change > 0 ? "+" : "";
            color = datum.change > 0 ? T.positive : T.negative;
            const suffix = datum.changeType === "pp" ? " pp" : "%";
            const decimals = datum.changeType === "pp" ? 2 : 1;
            valText = `  ${sign}${datum.change.toFixed(decimals)}${suffix}`;
          }
          txt
            .append("tspan")
            .attr("fill", color)
            .attr("font-weight", 600)
            .attr("font-size", 13)
            .text(valText);
        } else {
          txt
            .append("tspan")
            .attr("fill", PALETTE.textDim)
            .attr("font-weight", 600)
            .attr("font-size", 13)
            .text("  N/A");
        }

        if (shouldAnimate) {
          line
            .attr("opacity", 0)
            .transition()
            .delay(delay)
            .duration(duration)
            .attr("opacity", labelOpacity);
          dot
            .attr("opacity", 0)
            .transition()
            .delay(delay)
            .duration(duration)
            .attr("opacity", labelOpacity);
          txt
            .attr("opacity", 0)
            .transition()
            .delay(delay)
            .duration(duration)
            .attr("opacity", labelOpacity);
        } else {
          line.attr("opacity", labelOpacity);
          dot.attr("opacity", labelOpacity);
          txt.attr("opacity", labelOpacity);
        }
      });
    }

    drawSide(rightLabels, true);
    drawSide(leftLabels, false);

    cumulativeGap = 0;
    for (let li = 0; li < layerCount; li += 1) {
      const layer = LAYERS[li];
      const innerR = centerR + innerGap + li * ringWidth + cumulativeGap;
      const outerR = innerR + ringWidth;
      cumulativeGap += RING_GAPS[li];
      const r = (innerR + outerR) / 2;
      const span = 0.55;
      const pathId = `rl-${li}`;

      g.append("path")
        .attr("id", pathId)
        .attr(
          "d",
          `M ${-r * Math.sin(span)},${-r * Math.cos(span)} A ${r},${r} 0 0,1 ${r * Math.sin(span)},${-r * Math.cos(span)}`
        )
        .attr("fill", "none")
        .attr("stroke", "none");

      const layerText = g
        .append("text")
        .attr("fill", PALETTE.layerLabel)
        .attr("font-size", 9)
        .attr("font-weight", 600)
        .attr("letter-spacing", "0.08em");

      if (shouldAnimate) {
        layerText
          .attr("opacity", 0)
          .transition()
          .delay(layerDelays[li])
          .duration(400)
          .attr("opacity", 0.55);
      } else {
        layerText.attr("opacity", 0.55);
      }

      layerText
        .append("textPath")
        .attr("href", `#${pathId}`)
        .attr("startOffset", "50%")
        .attr("text-anchor", "middle")
        .text(layer.name.toUpperCase());
    }

    const centerGroup = g.append("g");
    centerGroup.append("circle")
      .attr("r", centerR)
      .attr("fill", PALETTE.centerFill)
      .attr("stroke", PALETTE.centerStroke)
      .attr("stroke-width", 2)
      .style("animation", "glow-pulse 3s ease-in-out 1");
    centerGroup.append("circle")
      .attr("r", centerR + 4)
      .attr("fill", "none")
      .attr("stroke", PALETTE.centerStroke)
      .attr("stroke-width", 0.5)
      .style("animation", "centerBreathe 4s ease-in-out infinite");

    const dirColors = { hike: T.hike, cut: T.cut, hold: T.textSecondary };
    centerGroup.append("text")
      .attr("y", -14)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.text)
      .attr("font-size", 15)
      .attr("font-weight", 700)
      .text(event.dateStr);
    centerGroup.append("text")
      .attr("y", 8)
      .attr("text-anchor", "middle")
      .attr("fill", dirColors[event.direction])
      .attr("font-size", 22)
      .attr("font-weight", 700)
      .text(event.direction.charAt(0).toUpperCase() + event.direction.slice(1));
    centerGroup.append("text")
      .attr("y", 26)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.textMuted)
      .attr("font-size", 13)
      .text(`${event.changePct > 0 ? "+" : ""}${(event.changePct * 100).toFixed(0)} bps`);

    if (shouldAnimate) {
      centerGroup
        .attr("opacity", 0)
        .attr("transform", "scale(0.92)")
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1)
        .attr("transform", "scale(1)");
    }

    function fireWavefront() {
      g.selectAll(".wavefront").remove();

      const wavefrontGrad = defs.append("radialGradient").attr("id", "wf-grad");
      wavefrontGrad.append("stop").attr("offset", "70%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0);
      wavefrontGrad.append("stop").attr("offset", "85%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.5);
      wavefrontGrad.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0);

      const wf = g.append("circle")
        .attr("class", "wavefront")
        .attr("r", centerR)
        .attr("fill", "none")
        .attr("stroke", "url(#wf-grad)")
        .attr("stroke-width", 40)
        .attr("opacity", 0.85);

      wf.transition()
        .duration(TOTAL_ANIM_DURATION)
        .ease(d3.easeLinear)
        .attr("r", ringAreaR + 30)
        .attr("opacity", 0)
        .remove();

      const wf2 = g.append("circle")
        .attr("class", "wavefront")
        .attr("r", centerR)
        .attr("fill", "none")
        .attr("stroke", "url(#wf-grad)")
        .attr("stroke-width", 16)
        .attr("opacity", 0);

      wf2.transition()
        .delay(250)
        .duration(0)
        .attr("opacity", 0.4)
        .transition()
        .duration(TOTAL_ANIM_DURATION)
        .ease(d3.easeLinear)
        .attr("r", ringAreaR + 30)
        .attr("opacity", 0)
        .remove();
    }

    if (shouldAnimate) {
      fireWavefront();
    }

    drawRef.current = fireWavefront;

    tooltipG = g.append("g").attr("visibility", "hidden");
    tooltipG
      .append("rect")
      .attr("width", 220)
      .attr("height", 74)
      .attr("rx", 6)
      .attr("fill", T.cardBg)
      .attr("stroke", T.cardBorder)
      .attr("stroke-width", 1)
      .attr("opacity", 0.97);
    tooltipLine1 = tooltipG
      .append("text")
      .attr("x", 8)
      .attr("y", 16)
      .attr("fill", T.textPrimary)
      .attr("font-size", 12)
      .attr("font-weight", 700);
    tooltipLine2 = tooltipG
      .append("text")
      .attr("x", 8)
      .attr("y", 30)
      .attr("fill", T.textPrimary)
      .attr("font-size", 12);
    tooltipLine3 = tooltipG
      .append("text")
      .attr("x", 8)
      .attr("y", 44)
      .attr("fill", T.textSecondary)
      .attr("font-size", 11);
    tooltipLine4 = tooltipG
      .append("text")
      .attr("x", 8)
      .attr("y", 60)
      .attr("fill", T.textDim)
      .attr("font-size", 9.5)
      .attr("font-style", "italic");
  }, [changes, event, activeIndicator, scaleMode, rippleLens]);

  const handleReplay = useCallback(() => {
    if (drawRef.current) drawRef.current();
  }, []);

  return (
    <div
      style={{ width: "100%", maxWidth: 1100, margin: "0 auto", position: "relative" }}
    >
      <button
        type="button"
        onClick={handleReplay}
        title="Replay cascade animation"
        aria-label="Replay cascade animation"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          minWidth: 72,
          height: 34,
          borderRadius: 999,
          border: `1px solid ${T.cardBorder}`,
          background: T.cardBg,
          color: T.textSecondary,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        Replay
      </button>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "auto",
          background: PALETTE.bg,
          borderRadius: 16,
          display: "block",
        }}
      />
    </div>
  );
}
