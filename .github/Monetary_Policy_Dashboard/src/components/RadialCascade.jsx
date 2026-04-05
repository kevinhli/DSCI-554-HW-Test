import { useMemo, useState } from 'react';
import { useDashboardStore } from '../store/DashboardStore';

const TAU = Math.PI * 2;
const CENTER = 280;
const RING_LAYOUT = {
  immediate: { inner: 112, outer: 162 },
  secondary: { inner: 172, outer: 222 },
  tertiary: { inner: 232, outer: 280 },
};

function polarToCartesian(radius, angle) {
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function buildArcPath(innerRadius, outerRadius, startAngle, endAngle) {
  const outerStart = polarToCartesian(outerRadius, startAngle);
  const outerEnd = polarToCartesian(outerRadius, endAngle);
  const innerStart = polarToCartesian(innerRadius, endAngle);
  const innerEnd = polarToCartesian(innerRadius, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function buildLabelTransform(innerRadius, outerRadius, startAngle, endAngle) {
  const radius = (innerRadius + outerRadius) / 2;
  const angle = (startAngle + endAngle) / 2;
  const point = polarToCartesian(radius, angle);
  let rotation = (angle * 180) / Math.PI + 90;

  if (rotation > 180) {
    rotation -= 360;
  }

  if (rotation > 90) {
    rotation -= 180;
  }

  if (rotation < -90) {
    rotation += 180;
  }

  return {
    x: point.x,
    y: point.y,
    rotation,
  };
}

function segmentColor(snapshot) {
  if (!snapshot.isActive) {
    return 'rgba(121, 143, 171, 0.18)';
  }

  if (!snapshot.isInLens) {
    return 'rgba(121, 143, 171, 0.28)';
  }

  const magnitude = Math.min(Math.abs(snapshot.response.zDelta ?? 0) / 2.5, 1);
  const opacity = 0.22 + magnitude * 0.58;

  if ((snapshot.response.zDelta ?? 0) >= 0) {
    return `rgba(46, 137, 232, ${opacity})`;
  }

  return `rgba(215, 94, 68, ${opacity})`;
}

function directionLabel(value) {
  if (value === null || value === undefined) {
    return 'Not available';
  }

  if (value > 0) {
    return 'Positive shift';
  }

  if (value < 0) {
    return 'Negative shift';
  }

  return 'Flat shift';
}

function labelClassName(snapshot) {
  let className = 'segment-label';

  if (snapshot.isSelected) {
    className += ' is-selected';
  }

  if (!snapshot.isActive) {
    className += ' is-muted';
  }

  return className;
}

function RingLegendPanel({ layers, activeDefinition, timelineOffsetMonths, formatters }) {
  const ringDescriptions = layers
    .filter((layer) => layer.id !== 'policy')
    .map((layer) => ({
      id: layer.id,
      title: layer.ring_label,
      subtitle: layer.label,
      description: layer.description,
    }));

  return (
    <aside className="ring-legend-panel">
      <div className="ring-legend-section">
        <p className="eyebrow">Glossary Focus</p>
        {activeDefinition ? (
          <>
            <h3>{activeDefinition.label}</h3>
            <p className="ring-legend-copy">{activeDefinition.description}</p>

            <div className="glossary-example glossary-example-in-panel">
              <span className="glossary-example-label">Example</span>
              <p>{activeDefinition.example}</p>
            </div>

            <div className="glossary-response-row">
              <span>
                Current shift:{' '}
                {formatters.formatSignedNumber(activeDefinition.response.zDelta, 2)}
              </span>
              <span>{timelineOffsetMonths}m after event</span>
            </div>
          </>
        ) : (
          <>
            <h3>Hover over a ring section</h3>
            <p className="ring-legend-copy">
              Move your cursor over any wedge in the ripple chart, or click one
              to focus it, and this panel will explain what that indicator means
              in plain language with an example.
            </p>
          </>
        )}
      </div>

      <div className="ring-legend-section">
        <p className="eyebrow">How To Read</p>
        <h3>Ring Structure</h3>
        <div className="ring-legend-list">
          {ringDescriptions.map((item) => (
            <article className="ring-legend-item" key={item.id}>
              <span className="ring-legend-kicker">{item.title}</span>
              <strong>{item.subtitle}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function RadialCascade() {
  const {
    data,
    selectedEvent,
    selectedIndicator,
    selectedLens,
    timelineOffsetMonths,
    currentDate,
    layerSummaries,
    focusSnapshots,
    formatters,
  } = useDashboardStore();
  const [hoveredIndicatorId, setHoveredIndicatorId] = useState(null);
  const [glossaryIndicatorId, setGlossaryIndicatorId] = useState(null);

  const ringLayers = data.layers.filter((layer) => layer.id !== 'policy');
  const strongestSignals = focusSnapshots.slice(0, 6);
  const allSnapshots = useMemo(
    () => layerSummaries.flatMap((layer) => layer.snapshots),
    [layerSummaries],
  );
  const activeDefinition =
    allSnapshots.find((snapshot) => snapshot.id === hoveredIndicatorId) ??
    allSnapshots.find((snapshot) => snapshot.id === glossaryIndicatorId) ??
    null;

  return (
    <section className="dashboard-card h-100">
      <div className="card-header-row">
        <div>
          <p className="eyebrow">Hero View</p>
          <h2>Policy Ripple Cascade</h2>
        </div>
        <p className="panel-copy">
          The concentric rings are now driven by the cleaned dataset. Segment
          color reflects the selected month&apos;s change from the event baseline,
          while hover and click interactions now surface glossary-style context
          for each wedge.
        </p>
      </div>

      <div className="ripple-layout">
        <RingLegendPanel
          layers={data.layers}
          activeDefinition={activeDefinition}
          timelineOffsetMonths={timelineOffsetMonths}
          formatters={formatters}
        />

        <div className="radial-stage">
          <svg
            className="radial-svg"
            viewBox="0 0 560 560"
            role="img"
            aria-label="Radial cascade view of policy ripple across indicator layers"
          >
            <defs>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#203346" />
                <stop offset="100%" stopColor="#08121b" />
              </radialGradient>
            </defs>

            <circle className="pulse-ring pulse-ring-one" cx={CENTER} cy={CENTER} r="52" />
            <circle className="pulse-ring pulse-ring-two" cx={CENTER} cy={CENTER} r="52" />

            {ringLayers.map((layer) => {
              const ring = RING_LAYOUT[layer.id];
              const layerSummary = layerSummaries.find(
                (summary) => summary.id === layer.id,
              );
              const snapshots = layerSummary?.snapshots ?? [];
              const gap = 0.045;
              const sliceAngle = TAU / Math.max(snapshots.length, 1);

              return snapshots.map((snapshot, index) => {
                const start = -Math.PI / 2 + index * sliceAngle + gap / 2;
                const end = -Math.PI / 2 + (index + 1) * sliceAngle - gap / 2;
                const label = buildLabelTransform(ring.inner, ring.outer, start, end);

                return (
                  <g
                    key={`${layer.id}-${snapshot.id}`}
                    onMouseEnter={() => setHoveredIndicatorId(snapshot.id)}
                    onMouseLeave={() => setHoveredIndicatorId(null)}
                    onFocus={() => setHoveredIndicatorId(snapshot.id)}
                    onBlur={() => setHoveredIndicatorId(null)}
                  >
                    <path
                      d={buildArcPath(ring.inner, ring.outer, start, end)}
                      fill={segmentColor(snapshot)}
                      stroke={
                        snapshot.isSelected
                          ? 'rgba(255, 212, 102, 0.95)'
                          : 'rgba(255, 255, 255, 0.6)'
                      }
                      strokeWidth={snapshot.isSelected ? 3 : 1.2}
                      role="button"
                      tabIndex={0}
                      aria-label={`${snapshot.label}. ${snapshot.description}`}
                      onClick={() => {
                        changeIndicator(snapshot.id);
                        setGlossaryIndicatorId(snapshot.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setGlossaryIndicatorId(snapshot.id);
                          changeIndicator(snapshot.id);
                        }
                      }}
                    >
                      <title>
                        {snapshot.label}: {directionLabel(snapshot.response.zDelta)}.
                        {` ${timelineOffsetMonths} months after the event.`}
                      </title>
                    </path>

                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${label.rotation} ${label.x} ${label.y})`}
                      className={labelClassName(snapshot)}
                      pointerEvents="none"
                    >
                      {snapshot.short_label}
                    </text>
                  </g>
                );
              });
            })}

            <circle cx={CENTER} cy={CENTER} r="84" fill="url(#centerGlow)" />
            <circle cx={CENTER} cy={CENTER} r="52" fill="rgba(255, 255, 255, 0.04)" />

            <text x={CENTER} y="246" textAnchor="middle" className="center-kicker">
              FOMC EVENT
            </text>
            <text x={CENTER} y="280" textAnchor="middle" className="center-year">
              {new Date(selectedEvent.date).getFullYear()}
            </text>
            <text x={CENTER} y="312" textAnchor="middle" className="center-event">
              {selectedEvent.direction.toUpperCase()}
            </text>
            <text x={CENTER} y="342" textAnchor="middle" className="center-bps">
              {selectedEvent.basis_points > 0 ? '+' : ''}
              {selectedEvent.basis_points} bp
            </text>
          </svg>

          <div className="radial-overlay-card">
            <span className="overlay-label">Selected story</span>
            <strong>{selectedLens.label}</strong>
            <span>{formatters.toDateLabel(selectedEvent.date)}</span>
            <span>{formatters.toMonthLabel(currentDate)}</span>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-1">
        {layerSummaries.map((layer) => (
          <div className="col-12 col-md-6 col-xl-3" key={layer.id}>
            <article className="layer-summary-card">
              <span className="layer-summary-label">{layer.label}</span>
              <strong>
                {layer.activeCount}/{layer.snapshots.length} active
              </strong>
              <p>
                {layer.leader
                  ? `${layer.leader.short_label} is showing the largest standardized move.`
                  : 'No series available in this layer.'}
              </p>
            </article>
          </div>
        ))}
      </div>

      <div className="signal-list">
        {strongestSignals.map((snapshot) => (
          <article className="signal-chip" key={snapshot.id}>
            <div>
              <span className="signal-source">{snapshot.layer}</span>
              <strong>{snapshot.short_label}</strong>
            </div>
            <div className="signal-metric">
              {formatters.formatSignedNumber(snapshot.response.zDelta, 2)}
              <span>{directionLabel(snapshot.response.zDelta)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
