import { median } from "d3";
import {
  LA_CLUSTER_BY_ID,
  LA_NEIGHBORHOODS,
  LA_NEIGHBORHOODS_BY_ID,
} from "./laNeighborhoods";

const DAY_MS = 86_400_000;

export const HORIZON_OPTIONS = [
  { id: 3, label: "3M", description: "3 months later" },
  { id: 6, label: "6M", description: "6 months later" },
  { id: 9, label: "9M", description: "9 months later" },
  { id: 12, label: "12M", description: "1 year later" },
];

const LAG_OPTIONS = [
  { id: 3, label: "3M", description: "3 months later" },
  { id: 6, label: "6M", description: "6 months later" },
  { id: 9, label: "9M", description: "9 months later" },
  { id: 12, label: "12M", description: "1 year later" },
];

export const MAP_METRIC_OPTIONS = [
  { id: "absolute", label: "Who outpaced LA?" },
  { id: "acceleration", label: "Who started slowing down?" },
];

export function monthIndexFromDate(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

export function monthIndexFromDateString(dateString) {
  const [year, month] = dateString.split("-").map(Number);
  return year * 12 + (month - 1);
}

export function monthLabelFromIndex(index) {
  const year = Math.floor(index / 12);
  const month = index % 12;
  return new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function monthEndDateFromIndex(index) {
  const year = Math.floor(index / 12);
  const month = index % 12;
  return new Date(Date.UTC(year, month + 1, 0));
}

export function monthEndDateFromString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function averageInWindow(rows, anchorDate, startOffsetDays, windowDays) {
  if (!rows?.length) return null;
  const start = anchorDate.getTime() + startOffsetDays * DAY_MS;
  const end = start + windowDays * DAY_MS;
  const values = rows.filter(
    (row) => row.value != null && row.date.getTime() >= start && row.date.getTime() <= end
  );
  if (!values.length) return null;
  return values.reduce((sum, row) => sum + row.value, 0) / values.length;
}

function rateChangeInfo(change) {
  if (change == null) return "No follow-through yet";
  const basisPoints = Math.round(change * 100);
  if (basisPoints === 0) return "Flat";
  return `${basisPoints > 0 ? "+" : ""}${basisPoints} bps`;
}

function getNeighborhoodMeta(stateCode) {
  return LA_NEIGHBORHOODS_BY_ID[stateCode] || null;
}

export function computeMortgageResponse(rows, eventDate, options = {}) {
  const { beforeWindowDays = 28, afterLagDays = 7, afterWindowDays = 42 } = options;
  const before = averageInWindow(rows, eventDate, -beforeWindowDays, beforeWindowDays);
  const after = averageInWindow(rows, eventDate, afterLagDays, afterWindowDays);
  const change = before != null && after != null ? after - before : null;

  return {
    before,
    after,
    change,
    changeLabel: rateChangeInfo(change),
    beforeLabel: before != null ? `${before.toFixed(2)}%` : "N/A",
    afterLabel: after != null ? `${after.toFixed(2)}%` : "N/A",
  };
}

export function getLatestMonthIndex(seriesMap) {
  const sampleSeries = Object.values(seriesMap || {})[0] || [];
  if (!sampleSeries.length) return null;
  return sampleSeries[sampleSeries.length - 1].monthIndex;
}

export function getEligibleEvents(events, latestMonthIndex, horizonMonths) {
  if (!events?.length || latestMonthIndex == null) return [];
  return events.filter(
    (event) => monthIndexFromDate(event.date) + horizonMonths <= latestMonthIndex
  );
}

export function computeStateHousingResponses(event, seriesMap, horizonMonths) {
  if (!event || !seriesMap) return [];

  const eventMonthIndex = monthIndexFromDate(event.date);
  const targetMonthIndex = eventMonthIndex + horizonMonths;
  const previousMonthIndex = eventMonthIndex - horizonMonths;

  const responses = Object.entries(seriesMap).map(([stateCode, series]) => {
    const meta = getNeighborhoodMeta(stateCode);
    const baseline = series.find((row) => row.monthIndex === eventMonthIndex) || null;
    const target = series.find((row) => row.monthIndex === targetMonthIndex) || null;
    const previous = series.find((row) => row.monthIndex === previousMonthIndex) || null;

    const changePct =
      baseline && target && baseline.value !== 0
        ? ((target.value - baseline.value) / baseline.value) * 100
        : null;

    const previousChangePct =
      previous && baseline && previous.value !== 0
        ? ((baseline.value - previous.value) / previous.value) * 100
        : null;

    return {
      stateCode,
      stateName: meta?.name || stateCode,
      shortLabel: meta?.shortLabel || stateCode,
      clusterId: meta?.clusterId || "other",
      clusterLabel: LA_CLUSTER_BY_ID[meta?.clusterId]?.label || "Other neighborhoods",
      baselineQuarter: baseline ? monthLabelFromIndex(baseline.monthIndex) : null,
      targetQuarter: target ? monthLabelFromIndex(target.monthIndex) : null,
      baselineMonth: baseline ? monthLabelFromIndex(baseline.monthIndex) : null,
      targetMonth: target ? monthLabelFromIndex(target.monthIndex) : null,
      baselineValue: baseline?.value ?? null,
      targetValue: target?.value ?? null,
      changePct,
      previousChangePct,
      acceleration:
        changePct != null && previousChangePct != null
          ? changePct - previousChangePct
          : null,
    };
  });

  const valid = responses.filter((response) => response.changePct != null);
  const medianChange = median(valid, (response) => response.changePct) ?? 0;

  return valid
    .map((response) => ({
      ...response,
      relativeToMedian: response.changePct - medianChange,
    }))
    .sort((left, right) => left.stateName.localeCompare(right.stateName));
}

function interpolateSeriesValue(series, targetIndex) {
  if (!series?.length || targetIndex == null || Number.isNaN(targetIndex)) return null;

  const first = series[0];
  const last = series[series.length - 1];
  if (targetIndex < first.monthIndex || targetIndex > last.monthIndex) return null;

  const lowerIndex = Math.floor(targetIndex);
  const upperIndex = Math.ceil(targetIndex);
  const lower = series.find((row) => row.monthIndex === lowerIndex) || null;
  const upper = series.find((row) => row.monthIndex === upperIndex) || null;

  if (!lower || !upper) return null;
  if (lower.monthIndex === upper.monthIndex) return lower.value;

  const t = (targetIndex - lower.monthIndex) / (upper.monthIndex - lower.monthIndex);
  return lower.value + (upper.value - lower.value) * t;
}

export function computeInterpolatedHousingResponses(event, seriesMap, horizonDays) {
  if (!event || !seriesMap) return [];

  const eventMonthIndex = monthIndexFromDate(event.date);
  const monthOffset = horizonDays / 30;
  const targetMonthIndex = eventMonthIndex + monthOffset;
  const previousMonthIndex = eventMonthIndex - monthOffset;

  const responses = Object.entries(seriesMap).map(([stateCode, series]) => {
    const meta = getNeighborhoodMeta(stateCode);
    const baseline = interpolateSeriesValue(series, eventMonthIndex);
    const target = interpolateSeriesValue(series, targetMonthIndex);
    const previous = interpolateSeriesValue(series, previousMonthIndex);

    const changePct =
      baseline != null && target != null && baseline !== 0
        ? ((target - baseline) / baseline) * 100
        : null;

    const previousChangePct =
      previous != null && baseline != null && previous !== 0
        ? ((baseline - previous) / previous) * 100
        : null;

    return {
      stateCode,
      stateName: meta?.name || stateCode,
      shortLabel: meta?.shortLabel || stateCode,
      clusterId: meta?.clusterId || "other",
      clusterLabel: LA_CLUSTER_BY_ID[meta?.clusterId]?.label || "Other neighborhoods",
      baselineQuarter: monthLabelFromIndex(eventMonthIndex),
      targetQuarter: monthLabelFromIndex(Math.round(targetMonthIndex)),
      baselineMonth: monthLabelFromIndex(eventMonthIndex),
      targetMonth: monthLabelFromIndex(Math.round(targetMonthIndex)),
      baselineValue: baseline,
      targetValue: target,
      changePct,
      previousChangePct,
      acceleration:
        changePct != null && previousChangePct != null
          ? changePct - previousChangePct
          : null,
    };
  });

  const valid = responses.filter((response) => response.changePct != null);
  const medianChange = median(valid, (response) => response.changePct) ?? 0;

  return valid
    .map((response) => ({
      ...response,
      relativeToMedian: response.changePct - medianChange,
    }))
    .sort((left, right) => left.stateName.localeCompare(right.stateName));
}

export function summarizeResponses(responses) {
  if (!responses?.length) return null;

  const rankedByChange = [...responses].sort((left, right) => right.changePct - left.changePct);
  const rankedByRelative = [...responses].sort(
    (left, right) => left.relativeToMedian - right.relativeToMedian
  );
  const rankedByAcceleration = [...responses]
    .filter((response) => response.acceleration != null)
    .sort((left, right) => left.acceleration - right.acceleration);
  const responsesWithAcceleration = responses.filter(
    (response) => response.acceleration != null
  );

  return {
    medianChange: median(responses, (response) => response.changePct) ?? 0,
    medianAcceleration: median(
      responsesWithAcceleration,
      (response) => response.acceleration
    ) ?? 0,
    positiveShare:
      responses.filter((response) => response.changePct > 0).length / responses.length,
    coolingShare: responsesWithAcceleration.length
      ? responsesWithAcceleration.filter((response) => response.acceleration < 0).length /
        responsesWithAcceleration.length
      : 0,
    strongest: rankedByChange[0],
    weakest: rankedByChange[rankedByChange.length - 1],
    coolestRelative: rankedByRelative[0],
    hottestRelative: rankedByRelative[rankedByRelative.length - 1],
    sharpestCooler: rankedByAcceleration[0] || null,
    sharpestReheater: rankedByAcceleration[rankedByAcceleration.length - 1] || null,
  };
}

export function summarizeClusterResponses(responses) {
  if (!responses?.length) return [];

  return Object.values(
    responses.reduce((acc, response) => {
      if (!acc[response.clusterId]) {
        acc[response.clusterId] = {
          clusterId: response.clusterId,
          clusterLabel: response.clusterLabel,
          responses: [],
        };
      }
      acc[response.clusterId].responses.push(response);
      return acc;
    }, {})
  )
    .map((cluster) => {
      const summary = summarizeResponses(cluster.responses);
      return {
        ...cluster,
        color: LA_CLUSTER_BY_ID[cluster.clusterId]?.color,
        summary,
      };
    })
    .sort((left, right) => left.clusterLabel.localeCompare(right.clusterLabel));
}

export function buildEventResponseCatalog(events, mortgageRates, seriesMap, horizonMonths) {
  if (!events?.length || !mortgageRates || !seriesMap) return [];

  return events
    .map((event) => {
      const mortgageResponse = computeMortgageResponse(mortgageRates, event.date);
      const responses = computeStateHousingResponses(event, seriesMap, horizonMonths);
      const summary = summarizeResponses(responses);

      if (!summary) return null;

      return {
        event,
        mortgageResponse,
        responses,
        summary,
      };
    })
    .filter(Boolean);
}

function confidenceLabel(score) {
  if (score >= 0.74) return "Higher confidence";
  if (score >= 0.52) return "Medium confidence";
  return "Lower confidence";
}

export function buildAnalogForecast(selectedEvent, mortgageResponse, eventCatalog) {
  if (!selectedEvent || !mortgageResponse || !eventCatalog?.length) return null;

  const priorEvents = eventCatalog
    .filter(
      (candidate) =>
        candidate.event.dateStr < selectedEvent.dateStr &&
        candidate.mortgageResponse?.change != null
    )
    .map((candidate) => {
      const yearsAgo = Math.max(
        (selectedEvent.date.getTime() - candidate.event.date.getTime()) /
          (DAY_MS * 365.25),
        0
      );
      const directionPenalty =
        candidate.event.direction === selectedEvent.direction ? 0 : 2.4;
      const policyMoveDiff =
        Math.abs((candidate.event.changePct ?? 0) - (selectedEvent.changePct ?? 0)) * 4.2;
      const mortgageDiff =
        Math.abs((candidate.mortgageResponse.change ?? 0) - (mortgageResponse.change ?? 0)) *
        6.2;
      const levelDiff =
        Math.abs(
          (candidate.mortgageResponse.after ??
            candidate.mortgageResponse.before ??
            0) - (mortgageResponse.after ?? mortgageResponse.before ?? 0)
        ) * 0.55;
      const recencyPenalty = yearsAgo * 0.08;
      const distance =
        directionPenalty + policyMoveDiff + mortgageDiff + levelDiff + recencyPenalty;

      return {
        ...candidate,
        yearsAgo,
        distance,
        weight: 1 / (1 + distance),
      };
    })
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 6);

  if (!priorEvents.length) return null;

  const totalWeight = priorEvents.reduce((sum, item) => sum + item.weight, 0);
  const weightedAverage = (accessor) =>
    priorEvents.reduce((sum, item) => sum + accessor(item) * item.weight, 0) / totalWeight;
  const medianChanges = priorEvents.map((item) => item.summary.medianChange);
  const lowerBound = Math.min(...medianChanges);
  const upperBound = Math.max(...medianChanges);
  const averageDistance =
    priorEvents.reduce((sum, item) => sum + item.distance, 0) / priorEvents.length;
  const confidenceScore = Math.max(
    0.28,
    Math.min(0.88, 1 / (1 + averageDistance / 2.6))
  );

  return {
    predictedMedianChange: weightedAverage((item) => item.summary.medianChange),
    predictedCoolingShare: weightedAverage((item) => item.summary.coolingShare),
    predictedMedianAcceleration: weightedAverage((item) => item.summary.medianAcceleration),
    lowerBound,
    upperBound,
    confidenceScore,
    confidenceLabel: confidenceLabel(confidenceScore),
    analogs: priorEvents,
  };
}

function monthlyPayment(principal, annualRate, years = 30) {
  if (principal == null || annualRate == null) return null;
  const monthlyRate = annualRate / 100 / 12;
  const periods = years * 12;
  if (monthlyRate === 0) return principal / periods;
  return (
    (principal * monthlyRate * (1 + monthlyRate) ** periods) /
    ((1 + monthlyRate) ** periods - 1)
  );
}

function principalFromPayment(payment, annualRate, years = 30) {
  if (payment == null || annualRate == null) return null;
  const monthlyRate = annualRate / 100 / 12;
  const periods = years * 12;
  if (monthlyRate === 0) return payment * periods;
  return (
    (payment * ((1 + monthlyRate) ** periods - 1)) /
    (monthlyRate * (1 + monthlyRate) ** periods)
  );
}

export function computeAffordabilityShift(
  mortgageResponse,
  housingSummary,
  baseBudget = 400000
) {
  if (
    !mortgageResponse ||
    mortgageResponse.before == null ||
    mortgageResponse.after == null ||
    housingSummary?.medianChange == null
  ) {
    return null;
  }

  const baselineBudget = baseBudget;
  const beforePayment = monthlyPayment(baselineBudget, mortgageResponse.before);
  const afterPayment = monthlyPayment(baselineBudget, mortgageResponse.after);
  const samePaymentBudget = principalFromPayment(beforePayment, mortgageResponse.after);
  const priceAdjustedTarget = baselineBudget * (1 + housingSummary.medianChange / 100);
  const budgetGap = priceAdjustedTarget - samePaymentBudget;
  const borrowingPowerChangePct =
    samePaymentBudget != null && baselineBudget
      ? ((samePaymentBudget - baselineBudget) / baselineBudget) * 100
      : null;
  const paymentChange =
    afterPayment != null && beforePayment != null ? afterPayment - beforePayment : null;

  return {
    baselineBudget,
    beforePayment,
    afterPayment,
    paymentChange,
    samePaymentBudget,
    priceAdjustedTarget,
    budgetGap,
    borrowingPowerChangePct,
  };
}

export function buildLagSummarySeries(event, seriesMap, selectedStateCode) {
  if (!event || !seriesMap) return [];

  return LAG_OPTIONS.map((option) => {
    const responses = computeStateHousingResponses(event, seriesMap, option.id);
    const summary = summarizeResponses(responses);
    if (!summary) return null;

    return {
      horizonQuarters: option.id,
      label: option.label,
      description: option.description,
      summary,
      selectedState:
        responses.find((response) => response.stateCode === selectedStateCode) || null,
    };
  }).filter(Boolean);
}

export function buildHorizonResponseMatrix(event, seriesMap, selectedStateCode) {
  if (!event || !seriesMap) return [];

  return HORIZON_OPTIONS.map((option) => {
    const responses = computeStateHousingResponses(event, seriesMap, option.id);
    const summary = summarizeResponses(responses);
    if (!summary) return null;

    return {
      horizonQuarters: option.id,
      label: option.label,
      description: option.description,
      responses,
      summary,
      selectedState:
        responses.find((response) => response.stateCode === selectedStateCode) || null,
    };
  }).filter(Boolean);
}

export function buildIndexedMonthSeries(series, eventDate, startOffset = -6, endOffset = 12) {
  if (!series?.length || !eventDate) return [];
  const eventMonthIndex = monthIndexFromDate(eventDate);
  const baseline = series.find((row) => row.monthIndex === eventMonthIndex);
  if (!baseline || !baseline.value) return [];

  const points = [];
  for (let offset = startOffset; offset <= endOffset; offset += 1) {
    const row = series.find((item) => item.monthIndex === eventMonthIndex + offset);
    if (!row?.value) continue;
    points.push({
      offset,
      label: monthLabelFromIndex(eventMonthIndex + offset),
      value: (row.value / baseline.value) * 100,
    });
  }
  return points;
}

export function buildMedianIndexedSeries(
  seriesMap,
  eventDate,
  startOffset = -6,
  endOffset = 12
) {
  if (!seriesMap || !eventDate) return [];
  const eventMonthIndex = monthIndexFromDate(eventDate);
  const points = [];

  for (let offset = startOffset; offset <= endOffset; offset += 1) {
    const values = Object.values(seriesMap)
      .map((series) => {
        const baseline = series.find((row) => row.monthIndex === eventMonthIndex);
        const target = series.find((row) => row.monthIndex === eventMonthIndex + offset);
        if (!baseline?.value || !target?.value) return null;
        return (target.value / baseline.value) * 100;
      })
      .filter((value) => value != null);

    if (!values.length) continue;

    points.push({
      offset,
      label: monthLabelFromIndex(eventMonthIndex + offset),
      value: median(values),
    });
  }

  return points;
}

export function buildClusterIndexedSeries(
  seriesMap,
  eventDate,
  startOffset = -6,
  endOffset = 12
) {
  if (!seriesMap || !eventDate) return [];

  return Object.values(
    LA_NEIGHBORHOODS.reduce((acc, neighborhood) => {
      if (!acc[neighborhood.clusterId]) {
        acc[neighborhood.clusterId] = {
          clusterId: neighborhood.clusterId,
          clusterLabel: LA_CLUSTER_BY_ID[neighborhood.clusterId]?.label,
          color: LA_CLUSTER_BY_ID[neighborhood.clusterId]?.color,
          members: [],
        };
      }
      acc[neighborhood.clusterId].members.push(neighborhood.id);
      return acc;
    }, {})
  ).map((cluster) => {
    const points = [];
    const eventMonthIndex = monthIndexFromDate(eventDate);
    for (let offset = startOffset; offset <= endOffset; offset += 1) {
      const values = cluster.members
        .map((id) => {
          const series = seriesMap[id];
          if (!series?.length) return null;
          const baseline = series.find((row) => row.monthIndex === eventMonthIndex);
          const target = series.find((row) => row.monthIndex === eventMonthIndex + offset);
          if (!baseline?.value || !target?.value) return null;
          return (target.value / baseline.value) * 100;
        })
        .filter((value) => value != null);

      if (!values.length) continue;

      points.push({
        offset,
        label: monthLabelFromIndex(eventMonthIndex + offset),
        value: median(values),
      });
    }

    return {
      ...cluster,
      points,
    };
  });
}

export function formatBasisPoints(changePct) {
  const basisPoints = Math.round((changePct || 0) * 100);
  return `${basisPoints > 0 ? "+" : ""}${basisPoints} bps`;
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatShare(value) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value * 100)}%`;
}

export function formatCurrency(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
}
