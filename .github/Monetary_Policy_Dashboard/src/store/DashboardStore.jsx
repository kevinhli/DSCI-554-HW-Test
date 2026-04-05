import { createContext, useContext, useEffect, useState } from 'react';

const DashboardContext = createContext(null);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toDateLabel(dateString, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(dateString));
}

function toMonthLabel(dateString) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatCompactNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Not available';
  }

  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: digits,
  }).format(value);
}

function formatSignedNumber(value, digits = 2, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Not available';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCompactNumber(value, digits)}${suffix}`;
}

function buildSeriesById(data) {
  return Object.fromEntries(data.series.map((series) => [series.id, series]));
}

function defaultIndicator(data) {
  return data.series.find((series) => series.layer !== 'policy') ?? data.series[0];
}

function buildEventsById(data) {
  return Object.fromEntries(data.events.map((event) => [event.id, event]));
}

function buildDateIndex(data) {
  return Object.fromEntries(data.dates.map((date, index) => [date, index]));
}

function getSeriesValue(data, mode, seriesId, index) {
  const source = mode === 'zscore' ? data.zscores : data.values;
  const values = source?.[seriesId] ?? [];
  return values[index] ?? null;
}

function getResponse(data, seriesId, eventMonthIndex, offsetMonths) {
  const currentIndex = clamp(eventMonthIndex + offsetMonths, 0, data.dates.length - 1);
  const baselineValue = getSeriesValue(data, 'values', seriesId, eventMonthIndex);
  const currentValue = getSeriesValue(data, 'values', seriesId, currentIndex);
  const baselineZ = getSeriesValue(data, 'zscore', seriesId, eventMonthIndex);
  const currentZ = getSeriesValue(data, 'zscore', seriesId, currentIndex);

  const valueDelta =
    baselineValue === null || currentValue === null
      ? null
      : currentValue - baselineValue;
  const percentDelta =
    baselineValue === null ||
    currentValue === null ||
    baselineValue === 0
      ? null
      : ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100;
  const zDelta =
    baselineZ === null || currentZ === null ? null : currentZ - baselineZ;

  return {
    baselineValue,
    currentValue,
    valueDelta,
    percentDelta,
    zDelta,
    baselineDate: data.dates[eventMonthIndex],
    currentDate: data.dates[currentIndex],
    currentIndex,
  };
}

function sortByMagnitude(items) {
  return [...items].sort((left, right) => {
    const leftMagnitude = Math.abs(left.response.zDelta ?? 0);
    const rightMagnitude = Math.abs(right.response.zDelta ?? 0);
    return rightMagnitude - leftMagnitude;
  });
}

export function DashboardProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [comparisonEventId, setComparisonEventId] = useState(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState(null);
  const [selectedLensId, setSelectedLensId] = useState(null);
  const [valueMode, setValueMode] = useState('zscore');
  const [timelineOffsetMonths, setTimelineOffsetMonths] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setStatus('loading');
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/dashboard-data.json`,
        );

        if (!response.ok) {
          throw new Error(`Failed to load dashboard data (${response.status})`);
        }

        const payload = await response.json();
        setData(payload);
        setSelectedEventId(payload.defaults.primary_event_id);
        setComparisonEventId(payload.defaults.comparison_event_id);
        setSelectedIndicatorId(payload.defaults.indicator_id ?? null);
        setSelectedLensId(payload.defaults.lens_id);
        setValueMode(payload.defaults.value_mode);
        setTimelineOffsetMonths(payload.defaults.timeline_offset_months);
        setStatus('ready');
      } catch (loadError) {
        setError(loadError);
        setStatus('error');
      }
    }

    load();
  }, []);

  const maxTimelineOffsetMonths =
    data?.defaults.max_timeline_offset_months ?? 18;

  useEffect(() => {
    if (!isPlaying || !data) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimelineOffsetMonths((currentValue) => {
        if (currentValue >= maxTimelineOffsetMonths) {
          setIsPlaying(false);
          return currentValue;
        }

        return currentValue + 1;
      });
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [data, isPlaying, maxTimelineOffsetMonths]);

  if (!data) {
    return (
      <DashboardContext.Provider
        value={{
          status,
          error,
        }}
      >
        {children}
      </DashboardContext.Provider>
    );
  }

  const seriesById = buildSeriesById(data);
  const eventsById = buildEventsById(data);
  const dateIndex = buildDateIndex(data);
  const selectedEvent = eventsById[selectedEventId] ?? data.events[0];
  const comparisonEvent =
    eventsById[comparisonEventId] ??
    data.events.find((event) => event.id !== selectedEvent.id) ??
    selectedEvent;
  const fallbackIndicator = defaultIndicator(data);
  const selectedIndicator =
    (selectedIndicatorId ? seriesById[selectedIndicatorId] : null) ??
    fallbackIndicator;
  const selectedLens =
    data.lenses.find((lens) => lens.id === selectedLensId) ?? data.lenses[0];
  const selectedEventMonthIndex = dateIndex[selectedEvent.month] ?? 0;
  const comparisonEventMonthIndex = dateIndex[comparisonEvent.month] ?? 0;
  const currentDateIndex = clamp(
    selectedEventMonthIndex + timelineOffsetMonths,
    0,
    data.dates.length - 1,
  );
  const currentDate = data.dates[currentDateIndex];

  const seriesSnapshots = data.series.map((series) => {
    const response = getResponse(
      data,
      series.id,
      selectedEventMonthIndex,
      timelineOffsetMonths,
    );
    const comparisonResponse = getResponse(
      data,
      series.id,
      comparisonEventMonthIndex,
      timelineOffsetMonths,
    );

    return {
      ...series,
      response,
      comparisonResponse,
      isActive: timelineOffsetMonths >= series.display_lag_months,
      isInLens: selectedLens.layers.includes(series.layer),
      isSelected: selectedIndicatorId !== null && series.id === selectedIndicator.id,
    };
  });

  const selectedIndicatorSnapshot =
    seriesSnapshots.find((snapshot) => snapshot.id === selectedIndicator.id) ??
    seriesSnapshots[0];
  const focusSnapshots = sortByMagnitude(
    seriesSnapshots.filter(
      (snapshot) =>
        snapshot.layer !== 'policy' &&
        snapshot.isInLens &&
        snapshot.isActive &&
        snapshot.response.zDelta !== null,
    ),
  );

  const layerSummaries = data.layers.map((layer) => {
    const snapshots = sortByMagnitude(
      seriesSnapshots.filter((snapshot) => snapshot.layer === layer.id),
    );
    const activeCount = snapshots.filter((snapshot) => snapshot.isActive).length;
    const avgMagnitude =
      snapshots.length === 0
        ? null
        : snapshots.reduce(
            (total, snapshot) =>
              total + Math.abs(snapshot.response.zDelta ?? 0),
            0,
          ) / snapshots.length;

    return {
      ...layer,
      snapshots,
      activeCount,
      avgMagnitude,
      leader: snapshots[0] ?? null,
    };
  });

  const chartValues = data[valueMode === 'zscore' ? 'zscores' : 'values'];
  const selectedIndicatorSeries = chartValues[selectedIndicator.id] ?? [];
  const fedFundsSeries =
    valueMode === 'zscore' ? data.zscores.DFF ?? [] : [];

  function changePrimaryEvent(nextEventId) {
    setSelectedEventId(nextEventId);
    setTimelineOffsetMonths(data.defaults.timeline_offset_months);
    setIsPlaying(false);
  }

  function changeComparisonEvent(nextEventId) {
    setComparisonEventId(nextEventId);
  }

  function changeIndicator(nextIndicatorId) {
    setSelectedIndicatorId(nextIndicatorId);
  }

  function changeLens(nextLensId) {
    setSelectedLensId(nextLensId);
  }

  function changeValueMode(nextValueMode) {
    setValueMode(nextValueMode);
  }

  function changeTimelineOffset(nextOffset) {
    setTimelineOffsetMonths(clamp(nextOffset, 0, maxTimelineOffsetMonths));
  }

  function togglePlay() {
    setIsPlaying((current) => !current);
  }

  function stopPlay() {
    setIsPlaying(false);
  }

  function getEventResponse(eventId, seriesId, offsetMonths) {
    const event = eventsById[eventId];
    if (!event) {
      return null;
    }

    const eventMonthIndex = dateIndex[event.month];
    if (eventMonthIndex === undefined) {
      return null;
    }

    return getResponse(data, seriesId, eventMonthIndex, offsetMonths);
  }

  const value = {
    status,
    error,
    data,
    seriesById,
    eventsById,
    dateIndex,
    selectedEvent,
    comparisonEvent,
    selectedIndicator,
    selectedLens,
    selectedIndicatorSeries,
    fedFundsSeries,
    seriesSnapshots,
    selectedIndicatorSnapshot,
    focusSnapshots,
    layerSummaries,
    valueMode,
    timelineOffsetMonths,
    maxTimelineOffsetMonths,
    currentDate,
    currentDateIndex,
    isPlaying,
    changePrimaryEvent,
    changeComparisonEvent,
    changeIndicator,
    changeLens,
    changeValueMode,
    changeTimelineOffset,
    togglePlay,
    stopPlay,
    getEventResponse,
    formatters: {
      toDateLabel,
      toMonthLabel,
      formatCompactNumber,
      formatSignedNumber,
    },
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardStore() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboardStore must be used inside DashboardProvider');
  }

  return context;
}
