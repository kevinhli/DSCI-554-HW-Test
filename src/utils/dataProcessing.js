import { LAYERS, ALL_INDICATORS } from "./indicators";

const DAY_MS = 86_400_000;

function avgInWindow(rows, centerDate, offsetDays, windowSize) {
  const start = new Date(centerDate.getTime() + offsetDays * DAY_MS);
  const end = new Date(start.getTime() + windowSize * DAY_MS);
  const vals = rows.filter(
    (r) => r.date >= start && r.date <= end && !isNaN(r.value)
  );
  if (vals.length === 0) return null;
  return vals.reduce((s, r) => s + r.value, 0) / vals.length;
}

export function computeCascadeChanges(fomcEvent, indicatorData) {
  const eventDate = fomcEvent.date;
  const results = [];

  for (const layer of LAYERS) {
    const windowDays = layer.windowDays;

    for (const ind of layer.indicators) {
      const rows = indicatorData[ind.key];
      if (!rows || rows.length === 0) {
        results.push({
          key: ind.key,
          label: ind.label,
          layerId: layer.id,
          layerName: layer.name,
          change: null,
          valueBefore: null,
          valueAfter: null,
        });
        continue;
      }

      const before = avgInWindow(rows, eventDate, -windowDays, windowDays);
      const after = avgInWindow(rows, eventDate, 2, windowDays);

      let change = null;
      const useAbsolute = ind.unit === "percent" || ind.unit === "ratio";
      let changeType = null;

      if (before != null && after != null) {
        if (useAbsolute) {
          change = after - before;
          changeType = "pp";
        } else if (before !== 0) {
          change = ((after - before) / Math.abs(before)) * 100;
          changeType = "pct";
        }
      }

      results.push({
        key: ind.key,
        label: ind.label,
        layerId: layer.id,
        layerName: layer.name,
        unit: ind.unit,
        changeType,
        change: change != null ? Math.round(change * 100) / 100 : null,
        valueBefore: before != null ? Math.round(before * 100) / 100 : null,
        valueAfter: after != null ? Math.round(after * 100) / 100 : null,
      });
    }
  }

  return results;
}

export function computeIndicatorStdDevs(indicatorData) {
  const stdDevs = {};
  for (const ind of ALL_INDICATORS) {
    const rows = indicatorData[ind.key];
    if (!rows || rows.length < 10) { stdDevs[ind.key] = null; continue; }
    const vals = rows.map((r) => r.value).filter((v) => v != null && !isNaN(v));
    if (vals.length < 10) { stdDevs[ind.key] = null; continue; }
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    stdDevs[ind.key] = Math.sqrt(variance);
  }
  return stdDevs;
}

export function normalizeChanges(changes, stdDevs) {
  return changes.map((c) => {
    const sd = stdDevs[c.key];
    if (c.change == null || !sd || sd === 0) {
      return { ...c, zScore: null };
    }
    let rawDelta;
    if (c.changeType === "pp") {
      rawDelta = c.change;
    } else if (c.changeType === "pct" && c.valueBefore != null) {
      rawDelta = (c.change / 100) * Math.abs(c.valueBefore);
    } else {
      rawDelta = c.change;
    }
    return { ...c, zScore: Math.round((rawDelta / sd) * 100) / 100 };
  });
}
