import { T } from "../utils/theme";
import { getDisplayMagnitude } from "../utils/dashboardInsights";

export default function MarketTiles({
  changes,
  scaleMode = "raw",
}) {
  if (!changes?.length) return null;

  const tiles = selectTiles(changes, scaleMode);
  if (!tiles.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="dash-card"
            style={{
              background: `linear-gradient(135deg, ${T.cardBg} 0%, ${T.cardBgAlt} 100%)`,
              border: `1px solid ${T.cardBorder}`,
            borderLeft: `3px solid ${
              tile.change != null && tile.change !== 0
                ? tile.change > 0
                  ? T.positive
                  : T.negative
                : T.neutral
            }`,
            borderRadius: 14,
            padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {tile.badge}
          </span>

          <div
            style={{
              color: T.textPrimary,
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {tile.label}
          </div>

          <div
            style={{
              color: changeColor(tile.change),
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1.15,
            }}
          >
            {formatChange(tile.change, tile.changeType)}
          </div>

          <div
            style={{
              color: T.textSecondary,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {formatBeforeAfter(tile.valueBefore, tile.valueAfter, tile.unit)}
          </div>
        </div>
      ))}
    </div>
  );
}

function selectTiles(changes, scaleMode) {
  const tiles = [];
  const usedKeys = new Set();

  const addTile = (tile, badge) => {
    if (!tile || usedKeys.has(tile.key)) return;
    usedKeys.add(tile.key);
    tiles.push({
      ...tile,
      badge,
    });
  };

  const policyRate = changes.find((changeInfo) => changeInfo.key === "DFF");
  addTile(policyRate, "Policy move");

  const ranked = [...changes]
    .filter((changeInfo) => changeInfo.change != null && changeInfo.key !== "DFF")
    .sort(
      (left, right) =>
        (getDisplayMagnitude(right, scaleMode) ?? -1) -
        (getDisplayMagnitude(left, scaleMode) ?? -1)
    );

  addTile(ranked[0], "Largest response");
  addTile(ranked[1], "Next strongest");

  const unemployment = changes.find((changeInfo) => changeInfo.key === "UNRATE");
  addTile(unemployment, "Labor signal");

  const inflation = changes.find((changeInfo) => changeInfo.key === "CPIAUCSL");
  addTile(inflation, "Inflation signal");

  return tiles.slice(0, 5);
}

function changeColor(value) {
  if (value == null || value === 0) return T.textSecondary;
  return value > 0 ? T.positive : T.negative;
}

function formatChange(value, type) {
  if (value == null) return "N/A";
  const sign = value > 0 ? "+" : "";
  const number = Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1);
  if (type === "pp") return `${sign}${number} pp`;
  return `${sign}${number}%`;
}

function formatValue(value, unit) {
  if (value == null) return "N/A";
  if (unit === "percent") return `${Number(value).toFixed(2)}%`;
  if (unit === "dollars") {
    return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (unit === "index") {
    return Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (unit === "billions") {
    return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}B`;
  }
  if (unit === "thousands") {
    return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  }
  return String(value);
}

function formatBeforeAfter(before, after, unit) {
  if (before == null && after == null) return "No before/after window available.";
  return `${formatValue(before, unit)} -> ${formatValue(after, unit)}`;
}
