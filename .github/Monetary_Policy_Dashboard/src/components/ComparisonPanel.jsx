import { useDashboardStore } from '../store/DashboardStore';

const OFFSETS = [0, 3, 6, 12];

function formatCell(response, mode, formatters) {
  if (!response) {
    return 'Not available';
  }

  if (mode === 'zscore') {
    return formatters.formatSignedNumber(response.zDelta, 2);
  }

  return formatters.formatSignedNumber(response.valueDelta, 2);
}

export default function ComparisonPanel() {
  const {
    selectedEvent,
    comparisonEvent,
    selectedIndicator,
    valueMode,
    getEventResponse,
    formatters,
  } = useDashboardStore();

  return (
    <section className="dashboard-card h-100">
      <div className="card-header-row">
        <div>
          <p className="eyebrow">Comparison View</p>
          <h2>Matched Event Scorecard</h2>
        </div>
        <p className="panel-copy">
          Compare the same indicator against two different FOMC decisions at the
          same checkpoints after each event.
        </p>
      </div>

      <div className="compare-event-grid">
        {[selectedEvent, comparisonEvent].map((event, index) => (
          <article className="compare-event-card" key={event.id}>
            <span className="metric-label">
              {index === 0 ? 'Primary event' : 'Comparison event'}
            </span>
            <strong>{event.label}</strong>
            <p>
              Rates moved from {formatters.formatCompactNumber(event.rate_before)} to{' '}
              {formatters.formatCompactNumber(event.rate_after)}.
            </p>
          </article>
        ))}
      </div>

      <div className="compare-table">
        <div className="compare-row compare-row-header">
          <span>Checkpoint</span>
          <span>{selectedEvent.direction}</span>
          <span>{comparisonEvent.direction}</span>
        </div>

        {OFFSETS.map((offset) => {
          const primary = getEventResponse(
            selectedEvent.id,
            selectedIndicator.id,
            offset,
          );
          const comparison = getEventResponse(
            comparisonEvent.id,
            selectedIndicator.id,
            offset,
          );

          return (
            <div className="compare-row" key={offset}>
              <span>{offset === 0 ? 'Event month' : `${offset} months`}</span>
              <span>{formatCell(primary, valueMode, formatters)}</span>
              <span>{formatCell(comparison, valueMode, formatters)}</span>
            </div>
          );
        })}
      </div>

      <div className="metric-card compare-footnote">
        <span className="metric-label">How to read this</span>
        <strong>{selectedIndicator.label}</strong>
        <p>
          {valueMode === 'zscore'
            ? 'Values are standardized so different units can be compared on the same visual scale.'
            : 'Values stay in the indicator\'s original units for direct reading.'}
        </p>
      </div>
    </section>
  );
}
