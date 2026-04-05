import { useDashboardStore } from '../store/DashboardStore';

const CHART_WIDTH = 860;
const CHART_HEIGHT = 340;
const MARGIN = { top: 24, right: 24, bottom: 42, left: 62 };

function getExtent(values) {
  const valid = values.filter((value) => value !== null && value !== undefined);
  if (valid.length === 0) {
    return [0, 1];
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) {
    return [min - 1, max + 1];
  }

  const padding = (max - min) * 0.12;
  return [min - padding, max + padding];
}

function buildLinePath(values, minY, maxY) {
  const innerWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  let command = '';

  values.forEach((value, index) => {
    if (value === null || value === undefined) {
      return;
    }

    const x =
      MARGIN.left +
      (index / Math.max(values.length - 1, 1)) * innerWidth;
    const y =
      MARGIN.top +
      ((maxY - value) / Math.max(maxY - minY, 0.0001)) * innerHeight;

    command += command ? ` L ${x.toFixed(2)} ${y.toFixed(2)}` : `M ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return command;
}

function axisValue(value) {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

function markerX(index, count) {
  const innerWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  return MARGIN.left + (index / Math.max(count - 1, 1)) * innerWidth;
}

export default function LineChart() {
  const {
    data,
    selectedEvent,
    comparisonEvent,
    selectedIndicator,
    selectedIndicatorSnapshot,
    selectedIndicatorSeries,
    fedFundsSeries,
    valueMode,
    currentDateIndex,
    getEventResponse,
    formatters,
  } = useDashboardStore();

  const primaryEventIndex = Math.max(
    data.dates.findIndex((date) => date === selectedEvent.month),
    0,
  );
  const comparisonEventIndex = Math.max(
    data.dates.findIndex((date) => date === comparisonEvent.month),
    0,
  );

  const plotValues =
    valueMode === 'zscore'
      ? [...selectedIndicatorSeries, ...fedFundsSeries]
      : selectedIndicatorSeries;
  const [minY, maxY] = getExtent(plotValues);
  const yTicks = [maxY, (maxY + minY) / 2, minY];
  const indicatorPath = buildLinePath(selectedIndicatorSeries, minY, maxY);
  const dffPath =
    valueMode === 'zscore'
      ? buildLinePath(fedFundsSeries, minY, maxY)
      : '';
  const yearTicks = [0, 72, 144, 216, 288].filter(
    (index) => index < data.dates.length,
  );
  const baselineResponse = getEventResponse(selectedEvent.id, selectedIndicator.id, 0);
  const sixMonthResponse = getEventResponse(selectedEvent.id, selectedIndicator.id, 6);
  const twelveMonthResponse = getEventResponse(selectedEvent.id, selectedIndicator.id, 12);

  return (
    <section className="dashboard-card h-100">
      <div className="card-header-row">
        <div>
          <p className="eyebrow">Evidence View</p>
          <h2>Full-History Indicator Trace</h2>
        </div>
        <p className="panel-copy">
          The selected indicator is charted across the full monthly timeline so
          the current ripple can be anchored in the broader macro history. In
          standardized mode, the Fed Funds Rate is overlaid for context.
        </p>
      </div>

      <div className="chart-shell">
        <svg
          className="history-chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Historical line chart for selected indicator"
        >
          {yTicks.map((tick) => {
            const y =
              MARGIN.top +
              ((maxY - tick) / Math.max(maxY - minY, 0.0001)) *
                (CHART_HEIGHT - MARGIN.top - MARGIN.bottom);

            return (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={CHART_WIDTH - MARGIN.right}
                  y1={y}
                  y2={y}
                  className="chart-grid-line"
                />
                <text x="16" y={y + 4} className="axis-text">
                  {axisValue(tick)}
                </text>
              </g>
            );
          })}

          {yearTicks.map((index) => {
            const x = markerX(index, data.dates.length);

            return (
              <g key={data.dates[index]}>
                <line
                  x1={x}
                  x2={x}
                  y1={MARGIN.top}
                  y2={CHART_HEIGHT - MARGIN.bottom}
                  className="chart-grid-line chart-grid-line-vertical"
                />
                <text
                  x={x}
                  y={CHART_HEIGHT - 10}
                  textAnchor="middle"
                  className="axis-text"
                >
                  {new Date(data.dates[index]).getFullYear()}
                </text>
              </g>
            );
          })}

          <line
            x1={MARGIN.left}
            x2={CHART_WIDTH - MARGIN.right}
            y1={CHART_HEIGHT - MARGIN.bottom}
            y2={CHART_HEIGHT - MARGIN.bottom}
            className="chart-axis-line"
          />

          <line
            x1={MARGIN.left}
            x2={MARGIN.left}
            y1={MARGIN.top}
            y2={CHART_HEIGHT - MARGIN.bottom}
            className="chart-axis-line"
          />

          {valueMode === 'zscore' ? (
            <path d={dffPath} className="chart-line chart-line-reference" />
          ) : null}
          <path d={indicatorPath} className="chart-line chart-line-primary" />

          <line
            x1={markerX(primaryEventIndex, data.dates.length)}
            x2={markerX(primaryEventIndex, data.dates.length)}
            y1={MARGIN.top}
            y2={CHART_HEIGHT - MARGIN.bottom}
            className="event-marker event-marker-primary"
          />
          <line
            x1={markerX(comparisonEventIndex, data.dates.length)}
            x2={markerX(comparisonEventIndex, data.dates.length)}
            y1={MARGIN.top}
            y2={CHART_HEIGHT - MARGIN.bottom}
            className="event-marker event-marker-comparison"
          />
          <line
            x1={markerX(currentDateIndex, data.dates.length)}
            x2={markerX(currentDateIndex, data.dates.length)}
            y1={MARGIN.top}
            y2={CHART_HEIGHT - MARGIN.bottom}
            className="event-marker event-marker-current"
          />
        </svg>
      </div>

      <div className="chart-legend">
        <span className="legend-chip legend-chip-primary">{selectedIndicator.short_label}</span>
        {valueMode === 'zscore' ? (
          <span className="legend-chip legend-chip-reference">Fed Funds</span>
        ) : null}
        <span className="legend-chip legend-chip-primary-outline">
          Primary event
        </span>
        <span className="legend-chip legend-chip-comparison">
          Comparison event
        </span>
        <span className="legend-chip legend-chip-current">Current month</span>
      </div>

      <div className="metrics-grid metrics-grid-tight">
        <article className="metric-card">
          <span className="metric-label">Event month</span>
          <strong>{formatters.toMonthLabel(selectedEvent.month)}</strong>
          <p>
            Response at month 0:{' '}
            {valueMode === 'zscore'
              ? formatters.formatSignedNumber(baselineResponse?.zDelta, 2)
              : formatters.formatSignedNumber(baselineResponse?.valueDelta, 2)}
          </p>
        </article>

        <article className="metric-card">
          <span className="metric-label">6-month response</span>
          <strong>
            {valueMode === 'zscore'
              ? formatters.formatSignedNumber(sixMonthResponse?.zDelta, 2)
              : formatters.formatSignedNumber(sixMonthResponse?.valueDelta, 2)}
          </strong>
          <p>{selectedIndicator.label} at six months after the event.</p>
        </article>

        <article className="metric-card">
          <span className="metric-label">12-month response</span>
          <strong>
            {valueMode === 'zscore'
              ? formatters.formatSignedNumber(twelveMonthResponse?.zDelta, 2)
              : formatters.formatSignedNumber(twelveMonthResponse?.valueDelta, 2)}
          </strong>
          <p>Longer-run movement relative to the event month.</p>
        </article>

        <article className="metric-card">
          <span className="metric-label">Current offset</span>
          <strong>
            {valueMode === 'zscore'
              ? formatters.formatSignedNumber(
                  selectedIndicatorSnapshot.response.zDelta,
                  2,
                )
              : formatters.formatSignedNumber(
                  selectedIndicatorSnapshot.response.valueDelta,
                  2,
                )}
          </strong>
          <p>
            Current month is {formatters.toMonthLabel(
              selectedIndicatorSnapshot.response.currentDate,
            )}
            .
          </p>
        </article>
      </div>
    </section>
  );
}
