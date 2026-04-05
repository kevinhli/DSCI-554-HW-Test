import { useDashboardStore } from '../store/DashboardStore';

const STORY_QUICK_OFFSETS = [0, 3, 6, 12, 18, 24, 36];
const EVIDENCE_QUICK_OFFSETS = [0, 3, 6, 12, 18, 24, 36];

function getOffsetLabel(offset) {
  if (offset === 0) {
    return 'Event month';
  }

  if (offset === 1) {
    return '1 month after';
  }

   if (offset === 12) {
    return '1 year after';
  }

  if (offset > 12 && offset % 12 === 0) {
    return `${offset / 12} years after`;
  }

  return `${offset} months after`;
}

function getChipLabel(offset) {
  if (offset === 0) {
    return '0m';
  }

  if (offset === 18) {
    return '1.5y';
  }

  if (offset >= 12 && offset % 12 === 0) {
    return `${offset / 12}y`;
  }

  return `${offset}m`;
}

export default function DashboardToolbar({ activeView }) {
  const {
    data,
    selectedEvent,
    comparisonEvent,
    selectedIndicator,
    selectedLens,
    valueMode,
    timelineOffsetMonths,
    maxTimelineOffsetMonths,
    currentDate,
    isPlaying,
    changePrimaryEvent,
    changeComparisonEvent,
    changeIndicator,
    changeLens,
    changeValueMode,
    changeTimelineOffset,
    togglePlay,
    stopPlay,
    formatters,
  } = useDashboardStore();
  const showRippleLens = activeView !== 'evidence-lab';
  const showComparisonEvent = activeView === 'evidence-lab';
  const isEvidenceView = activeView === 'evidence-lab';
  const storyControlColClass = 'col-12 col-md-6 col-xl-6';
  const evidenceControlColClass = 'col-12 col-md-6 col-xl-6';
  const indicatorColClass = showRippleLens
    ? storyControlColClass
    : evidenceControlColClass;
  const valueStyleColClass = showRippleLens
    ? storyControlColClass
    : evidenceControlColClass;
  const quickOffsets = isEvidenceView
    ? EVIDENCE_QUICK_OFFSETS
    : STORY_QUICK_OFFSETS;
  const timelineEyebrow = isEvidenceView
    ? 'Comparison Timeline'
    : 'Propagation Timeline';
  const playLabel = isEvidenceView ? 'Play timeline' : 'Play ripple';
  const pauseLabel = isEvidenceView ? 'Pause timeline' : 'Pause ripple';

  return (
    <section className="toolbar-card">
      <div className="toolbar-heading">
        <div>
          <p className="eyebrow">Linked Controls</p>
          <h2>Choose the event, metric, and time window</h2>
        </div>
        <p className="toolbar-copy">
          These controls keep the Story and Evidence views synced to the same
          policy timeline.
        </p>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <label className="control-field">
            <span className="control-label">Main event</span>
            <span className="control-help">
              This Fed decision drives the whole dashboard.
            </span>
            <select
              className="form-select control-select"
              value={selectedEvent.id}
              onChange={(event) => changePrimaryEvent(event.target.value)}
            >
              {data.events.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showRippleLens ? (
          <div className="col-12 col-xl-6">
            <label className="control-field">
              <span className="control-label">Ripple lens</span>
              <span className="control-help">
                Choose which part of the ripple chart to emphasize.
              </span>
              <select
                className="form-select control-select"
                value={selectedLens.id}
                onChange={(event) => changeLens(event.target.value)}
              >
                {data.lenses.map((lens) => (
                  <option key={lens.id} value={lens.id}>
                    {lens.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {showComparisonEvent ? (
          <div className={evidenceControlColClass}>
            <label className="control-field">
              <span className="control-label">Compare with</span>
              <span className="control-help">
                Used on the Evidence view to compare another Fed decision.
              </span>
              <select
                className="form-select control-select"
                value={comparisonEvent.id}
                onChange={(event) => changeComparisonEvent(event.target.value)}
              >
                {data.events.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className={indicatorColClass}>
          <label className="control-field">
            <span className="control-label">Indicator focus</span>
            <span className="control-help">
              Choose the metric shown in the chart, scorecard, and glossary.
            </span>
            <select
              className="form-select control-select"
              value={selectedIndicator.id}
              onChange={(event) => changeIndicator(event.target.value)}
            >
              {data.series
                .filter((series) => series.layer !== 'policy')
                .map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.label}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className={valueStyleColClass}>
          <label className="control-field">
            <span className="control-label">Value style</span>
            <span className="control-help">
              Switch between standardized comparisons and raw values.
            </span>
            <select
              className="form-select control-select"
              value={valueMode}
              onChange={(event) => changeValueMode(event.target.value)}
            >
              <option value="zscore">Standardized comparison</option>
              <option value="values">Raw indicator values</option>
            </select>
          </label>
        </div>
      </div>

      <div className="timeline-shell">
        <div className="timeline-summary">
          <div>
            <p className="eyebrow">{timelineEyebrow}</p>
            <h3>{getOffsetLabel(timelineOffsetMonths)}</h3>
            <p className="timeline-copy">
              Current playback point: {formatters.toMonthLabel(currentDate)}
            </p>
          </div>

          <div className="timeline-actions">
            <button
              type="button"
              className="btn timeline-button"
              onClick={togglePlay}
            >
              {isPlaying ? pauseLabel : playLabel}
            </button>
            <button
              type="button"
              className="btn timeline-button timeline-button-soft"
              onClick={() => {
                stopPlay();
                changeTimelineOffset(0);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <input
          className="form-range timeline-range"
          type="range"
          min="0"
          max={maxTimelineOffsetMonths}
          step="1"
          value={timelineOffsetMonths}
          onChange={(event) => {
            stopPlay();
            changeTimelineOffset(Number(event.target.value));
          }}
        />

        <div className="timeline-quick-row">
          {quickOffsets.filter((offset) => offset <= maxTimelineOffsetMonths).map(
            (offset) => (
              <button
                type="button"
                key={offset}
                className={`timeline-chip ${
                  offset === timelineOffsetMonths ? 'is-active' : ''
                }`}
                onClick={() => {
                  stopPlay();
                  changeTimelineOffset(offset);
                }}
              >
                {getChipLabel(offset)}
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
