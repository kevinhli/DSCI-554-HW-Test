import { ALL_INDICATORS, LAYERS } from "./indicators";

const RATE_KEYS = new Set([
  "DFF",
  "DFEDTARU",
  "DFEDTARL",
  "DGS2",
  "DGS10",
  "DGS30",
  "T10Y2Y",
  "BAA",
  "MORTGAGE30US",
  "DPRIME",
]);

const INDICATOR_MAP = Object.fromEntries(
  ALL_INDICATORS.map((indicator) => [indicator.key, indicator])
);

export function getIndicatorMeta(key) {
  return INDICATOR_MAP[key] ?? null;
}

export function isDivergentIndicator(indicatorOrKey, change, direction) {
  if (change == null || change === 0 || direction === "hold") return false;

  const key =
    typeof indicatorOrKey === "string"
      ? indicatorOrKey
      : indicatorOrKey?.key;

  if (!key) return false;

  const isRate = RATE_KEYS.has(key);

  if (direction === "hike") {
    return isRate ? change < -0.05 : change > 0.5;
  }

  if (direction === "cut") {
    return isRate ? change > 0.05 : change < -0.5;
  }

  return false;
}

export function getDisplayMagnitude(changeInfo, scaleMode = "raw") {
  if (!changeInfo) return null;

  if (scaleMode === "zscore" && changeInfo.zScore != null) {
    return Math.abs(changeInfo.zScore);
  }

  return changeInfo.change != null ? Math.abs(changeInfo.change) : null;
}

export function getTopMover(
  changes,
  scaleMode = "raw",
  { excludeKeys = [] } = {}
) {
  if (!changes?.length) return null;

  const excluded = new Set(excludeKeys);

  return (
    [...changes]
      .filter(
        (changeInfo) =>
          !excluded.has(changeInfo.key) &&
          getDisplayMagnitude(changeInfo, scaleMode) != null
      )
      .sort(
        (left, right) =>
          (getDisplayMagnitude(right, scaleMode) ?? -1) -
          (getDisplayMagnitude(left, scaleMode) ?? -1)
      )[0] ?? null
  );
}

export function countDivergences(changes, direction) {
  if (!changes?.length) return 0;

  return changes.reduce((count, changeInfo) => {
    const indicator = getIndicatorMeta(changeInfo.key);
    return count +
      (indicator && isDivergentIndicator(indicator, changeInfo.change, direction)
        ? 1
        : 0);
  }, 0);
}

export function getDominantLayer(changes, scaleMode = "raw") {
  if (!changes?.length) return null;

  const layerScore = LAYERS.map((layer) => ({
    layer,
    score: changes
      .filter((changeInfo) => changeInfo.layerId === layer.id)
      .reduce(
        (total, changeInfo) =>
          total + (getDisplayMagnitude(changeInfo, scaleMode) ?? 0),
        0
      ),
  })).sort((left, right) => right.score - left.score);

  return layerScore[0]?.score ? layerScore[0].layer : null;
}
