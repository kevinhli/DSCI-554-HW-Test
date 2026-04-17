import { useState } from "react";
import { T } from "../utils/theme";

const DAY_MS = 86400000;

const PRESETS = [
  { id: "short", label: "0-3m", windows: [30, 60, 90] },
  { id: "medium", label: "3-6m", windows: [90, 120, 180] },
  { id: "long", label: "6m-1y", windows: [180, 270, 365] },
];

const FORWARD_INDICATORS = [
  { key: "GSPC", label: "S&P 500", unit: "index", freq: "daily" },
  { key: "DGS10", label: "10Y Treasury", unit: "percent", freq: "daily" },
  { key: "VIX", label: "VIX", unit: "index", freq: "daily" },
  { key: "MORTGAGE30US", label: "30Y Mortgage", unit: "percent", freq: "weekly" },
  { key: "UNRATE", label: "Unemployment", unit: "percent", freq: "monthly" },
  { key: "CPIAUCSL", label: "CPI", unit: "index", freq: "monthly" },
];

function findNearest(rows, targetDate, toleranceDays) {
  if (!rows?.length) return null;

  const target = targetDate.getTime();
  let lower = 0;
  let upper = rows.length - 1;

  while (lower < upper) {
    const midpoint = (lower + upper) >> 1;
    if (rows[midpoint].date.getTime() < target) lower = midpoint + 1;
    else upper = midpoint;
  }

  if (lower >= rows.length) lower = rows.length - 1;

  const candidates = [lower];
  if (lower > 0) candidates.push(lower - 1);

  let nearest = null;
  let nearestDistance = Infinity;

  for (const index of candidates) {
    const distance = Math.abs(rows[index].date.getTime() - target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = rows[index];
    }
  }

  return nearestDistance <= toleranceDays * DAY_MS ? nearest : null;
}

function formatChange(change, unit) {
  if (change == null || Number.isNaN(change)) return "N/A";
  const number = Number(change);
  const sign = number >= 0 ? "+" : "";
  if (unit === "percent") {
    return `${sign}${number.toFixed(2)} pp`;
  }
  return `${sign}${number.toFixed(1)}%`;
}

function changeColor(change) {
  if (change == null || Number.isNaN(change)) return T.textSecondary;
  return Number(change) >= 0 ? T.positive : T.negative;
}

function sortRowsByDate(rows) {
  if (!rows?.length) return [];
  return [...rows].sort((left, right) => left.date.getTime() - right.date.getTime());
}

export default function ForwardOutcomes({ indicatorData, event, direction }) {
  const [presetId, setPresetId] = useState("short");
  const activePreset = PRESETS.find((preset) => preset.id === presetId) || PRESETS[0];
  const windows = activePreset.windows;

  if (!event?.date) return null;

  const eventDate =
    event.date instanceof Date ? event.date : new Date(event.date);

  let latestDataMs = 0;

  for (const indicator of FORWARD_INDICATORS) {
    const rows = sortRowsByDate(indicatorData?.[indicator.key]);
    if (rows.length) {
      latestDataMs = Math.max(
        latestDataMs,
        rows[rows.length - 1].date.getTime()
      );
    }
  }

  const tooRecent =
    latestDataMs === 0 ||
    latestDataMs - eventDate.getTime() < Math.min(...windows) * DAY_MS;

  const outcomes = FORWARD_INDICATORS.map((indicator) => {
    const rows = sortRowsByDate(indicatorData?.[indicator.key]);
    const baselineTolerance =
      indicator.freq === "monthly" ? 20 : indicator.freq === "weekly" ? 7 : 3;
    const forwardTolerance =
      indicator.freq === "monthly" ? 25 : indicator.freq === "weekly" ? 12 : 7;

    const baseline = findNearest(rows, eventDate, baselineTolerance);

    const windowChanges = windows.map((days) => {
      if (!baseline) return null;

      const targetDate = new Date(eventDate.getTime() + days * DAY_MS);
      const future = findNearest(rows, targetDate, forwardTolerance);

      if (!future) return null;

      const baseValue = baseline.value;
      const futureValue = future.value;

      if (
        baseValue == null ||
        futureValue == null ||
        Number.isNaN(baseValue) ||
        Number.isNaN(futureValue)
      ) {
        return null;
      }

      if (indicator.unit === "percent") {
        return futureValue - baseValue;
      }

      if (Math.abs(baseValue) < 1e-12) return null;
      return ((futureValue - baseValue) / Math.abs(baseValue)) * 100;
    });

    return {
      key: indicator.key,
      label: indicator.label,
      unit: indicator.unit,
      windowChanges,
    };
  });

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: `linear-gradient(135deg, ${T.cardBg}, ${T.cardBgAlt})`,
        border: `1px solid ${T.cardBorder}`,
        borderLeft: `3px solid ${
          direction === "hike" ? T.hike : direction === "cut" ? T.cut : T.hold
        }`,
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <span
            style={{
              display: "block",
              color: T.textDim,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Forward outcomes
          </span>
          <div
            style={{
              color: T.textPrimary,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            After the decision
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setPresetId(preset.id)}
              aria-pressed={presetId === preset.id}
              style={{
                background: presetId === preset.id ? T.cardBgActive : "transparent",
                border: `1px solid ${
                  presetId === preset.id ? T.accent : T.cardBorderLight
                }`,
                color: presetId === preset.id ? T.textPrimary : T.textDim,
                borderRadius: 999,
                minHeight: 34,
                padding: "0 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily:
                  '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif',
                letterSpacing: "0.03em",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(150px, 1fr) repeat(3, minmax(82px, 90px))",
            gap: 0,
            minWidth: 420,
          }}
        >
          <div
            style={{
              color: T.textDim,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              paddingBottom: 8,
            }}
          >
            Indicator
          </div>

          {windows.map((days) => (
            <div
              key={days}
              style={{
                color: T.textDim,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textAlign: "center",
                paddingBottom: 8,
              }}
            >
              {days >= 365
                ? `${Math.round(days / 365)}y`
                : days >= 30
                ? `${Math.round(days / 30)}m`
                : `${days}d`}
            </div>
          ))}

          {outcomes.map((row) => (
            <div key={row.key} style={{ display: "contents" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.textPrimary,
                  padding: "9px 10px",
                  borderTop: `1px solid ${T.cardBorderLight}`,
                  borderLeft: `3px solid ${
                    row.windowChanges[0] != null
                      ? row.windowChanges[0] >= 0
                        ? T.positive
                        : T.negative
                      : T.neutral
                  }`,
                }}
              >
                {row.label}
              </div>

              {row.windowChanges.map((change, index) => (
                <div
                  key={`${row.key}-${windows[index]}`}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                    fontVariantNumeric: "tabular-nums",
                    padding: "9px 6px",
                    color: changeColor(change),
                    borderTop: `1px solid ${T.cardBorderLight}`,
                  }}
                >
                  {formatChange(change, row.unit)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {tooRecent && (
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 12,
            color: T.textDim,
            lineHeight: 1.55,
          }}
        >
          Later windows are unavailable because this event sits near the end of the dataset.
        </p>
      )}
    </div>
  );
}
