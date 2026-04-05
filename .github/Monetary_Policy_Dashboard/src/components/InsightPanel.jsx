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
    data,
    selectedEvent,
    comparisonEvent,
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
  const guideItems = [
    {
      title: 'Start at the center',
      text: `${selectedEvent.label} anchors the ripple and defines month 0 for the rest of the dashboard.`,
    },
    {
      title: 'Follow the highlighted layers',
      text: selectedLens.description,
    },
    {
      title: 'Validate with evidence',
      text: `Use the timeline slider to see ${selectedIndicator.label} move from ${formatters.toMonthLabel(
        selectedEvent.month,
      )} to ${formatters.toMonthLabel(currentDate)}.`,
    },
  ];

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
          <span className="metric-label">Coverage</span>
          <strong>
            {data.meta.series_count} series / {data.meta.event_count} FOMC events
          </strong>
          <p>
            Monthly-aligned static assets generated for GitHub Pages deployment.
          </p>
        </article>
      </div>

      <div className="guide-list">
        {guideItems.map((item) => (
          <article className="guide-item" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
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
          <span className="metric-label">Comparison event</span>
          <strong>{comparisonEvent.label}</strong>
          <p>
            This gives you a second policy pulse to contrast against the same
            indicator and timeline offset.
          </p>
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
