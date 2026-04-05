import { useDashboardStore } from '../store/DashboardStore';

function formatResponseMetric(snapshot, valueMode, formatters) {
  if (!snapshot) {
    return 'Not available';
  }

  if (valueMode === 'zscore') {
    return formatters.formatSignedNumber(snapshot.response.zDelta, 2);
  }

  return formatters.formatSignedNumber(snapshot.response.valueDelta, 2);
}

export default function InsightPanel() {
  const {
    selectedEvent,
    selectedIndicator,
    selectedIndicatorSnapshot,
    selectedLens,
    valueMode,
    layerSummaries,
    focusSnapshots,
    timelineOffsetMonths,
    currentDate,
    formatters,
  } = useDashboardStore();

  const focusLeader = focusSnapshots[0] ?? null;
  const policyMoveLabel =
    selectedEvent.basis_points > 0
      ? `+${selectedEvent.basis_points} bp`
      : `${selectedEvent.basis_points} bp`;

  return (
    <section className="dashboard-card h-100">
      <div className="card-header-row">
        <div>
          <p className="eyebrow">Interpretation</p>
          <h2>Reading Guide And Context</h2>
        </div>
        <p className="panel-copy">
          This panel translates the radial metaphor into plain-language insights
          drawn from the cleaned data and the glossary definitions in the repo.
        </p>
      </div>

      <article className="guide-item guide-item-featured">
        <h3>Time range</h3>
        <p>
          The current story window runs from{' '}
          {formatters.toMonthLabel(selectedEvent.month)} to{' '}
          {formatters.toMonthLabel(currentDate)}, which is{' '}
          {timelineOffsetMonths === 1
            ? '1 month'
            : `${timelineOffsetMonths} months`}{' '}
          after the selected event.
        </p>
      </article>

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-label">Focus indicator</span>
          <strong>{selectedIndicator.label}</strong>
          <p>{selectedIndicator.description}</p>
        </article>

        <article className="metric-card">
          <span className="metric-label">Current response</span>
          <strong>
            {formatResponseMetric(
              selectedIndicatorSnapshot,
              valueMode,
              formatters,
            )}
          </strong>
          <p>
            {valueMode === 'zscore'
              ? 'Measured as standardized distance from the event month.'
              : 'Measured in the indicator\'s native units.'}
          </p>
        </article>

        <article className="metric-card">
          <span className="metric-label">Most reactive in lens</span>
          <strong>{focusLeader ? focusLeader.short_label : 'Not available'}</strong>
          <p>
            {focusLeader
              ? `${focusLeader.label} shows the strongest standardized change ${timelineOffsetMonths} months after the primary event.`
              : 'No active response is available for this lens yet.'}
          </p>
        </article>

        <article className="metric-card">
          <span className="metric-label">Policy move</span>
          <strong>{policyMoveLabel}</strong>
          <p>
            Rates moved from {formatters.formatCompactNumber(selectedEvent.rate_before)} to{' '}
            {formatters.formatCompactNumber(selectedEvent.rate_after)} at the selected
            FOMC event.
          </p>
        </article>
      </div>

      <div className="comparison-story-grid">
        <article className="story-note-card">
          <span className="metric-label">Primary event</span>
          <strong>{selectedEvent.label}</strong>
          <p>
            Target month 0 starts at {formatters.toMonthLabel(selectedEvent.month)}.
          </p>
        </article>

        <article className="story-note-card">
          <span className="metric-label">Current timeline month</span>
          <strong>{formatters.toMonthLabel(currentDate)}</strong>
          <p>
            The ripple view is currently showing {timelineOffsetMonths} months
            after the main event.
          </p>
        </article>

        <article className="story-note-card">
          <span className="metric-label">Selected lens</span>
          <strong>{selectedLens.label}</strong>
          <p>{selectedLens.description}</p>
        </article>
      </div>

      <div className="data-notes">
        {layerSummaries.map((layer) => (
          <div className="data-note" key={layer.id}>
            <strong>{layer.label}</strong>
            <span>
              {layer.snapshots.length} tracked indicators with an average ripple
              magnitude of{' '}
              {layer.avgMagnitude === null
                ? 'Not available'
                : formatters.formatCompactNumber(layer.avgMagnitude, 2)}
              .
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
