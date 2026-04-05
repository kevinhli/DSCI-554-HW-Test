import { useDashboardStore } from '../store/DashboardStore';

const QUICK_OFFSETS = [0, 3, 6, 12, 18];

function getOffsetLabel(offset) {
  if (offset === 0) {
    return 'Event month';
  }

  if (offset === 1) {
    return '1 month after';
  }

  return `${offset} months after`;
}

export default function DashboardToolbar() {
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

        <div className="col-12 col-xl-6">
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

        <div className="col-12 col-md-6 col-xl-4">
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

        <div className="col-12 col-md-6 col-xl-4">
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

        <div className="col-12 col-md-6 col-xl-4">
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
            <p className="eyebrow">Propagation Timeline</p>
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
              {isPlaying ? 'Pause ripple' : 'Play ripple'}
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
          {QUICK_OFFSETS.filter((offset) => offset <= maxTimelineOffsetMonths).map(
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
                {offset === 0 ? '0m' : `${offset}m`}
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
