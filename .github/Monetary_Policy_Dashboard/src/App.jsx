import { useState } from 'react';
import DashboardToolbar from './components/DashboardToolbar';
import RadialCascade from './components/RadialCascade';
import InsightPanel from './components/InsightPanel';
import LineChart from './components/LineChart';
import ComparisonPanel from './components/ComparisonPanel';
import { DashboardProvider, useDashboardStore } from './store/DashboardStore';

const VIEW_OPTIONS = [
  {
    id: 'ripple-explorer',
    kicker: 'Story View',
    title: 'Ripple Story',
    description:
      'Follow one policy story through the ripple chart, ring guide, and glossary explanations.',
  },
  {
    id: 'evidence-lab',
    kicker: 'Evidence View',
    title: 'Charts And Comparison',
    description:
      'Open the full-history trace and event scorecard for a deeper evidence check.',
  },
];

function DashboardContent() {
  const { status, error, data } = useDashboardStore();
  const [activeView, setActiveView] = useState(VIEW_OPTIONS[0].id);

  if (status === 'loading') {
    return (
      <main className="app-container py-4 py-lg-5">
        <section className="page-hero">
          <p className="eyebrow">Loading Data</p>
          <h1>Preparing the policy ripple dashboard...</h1>
          <p className="hero-copy">
            The app is loading the cleaned static data package generated from the
            repository&apos;s raw FRED and Yahoo files.
          </p>
        </section>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="app-container py-4 py-lg-5">
        <section className="page-hero">
          <p className="eyebrow">Data Load Error</p>
          <h1>The dashboard could not load its data.</h1>
          <p className="hero-copy">
            {error?.message ??
              'An unknown error occurred while loading dashboard-data.json.'}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-container py-4 py-lg-5">
      <header className="page-hero">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">DSCI 554 Demo</p>
            <h1>Policy Ripple Dashboard</h1>
            <p className="hero-copy">
              A functional React + Bootstrap dashboard for tracing how FOMC
              decisions propagate across markets, credit transmission channels,
              and slower macro outcomes.
            </p>
          </div>

          <div className="hero-stats">
            <article className="hero-stat-card">
              <span>Economic series</span>
              <strong>{data.meta.series_count}</strong>
            </article>
            <article className="hero-stat-card">
              <span>FOMC events</span>
              <strong>{data.meta.event_count}</strong>
            </article>
            <article className="hero-stat-card">
              <span>Coverage</span>
              <strong>
                {new Date(data.meta.date_start).getFullYear()}-
                {new Date(data.meta.date_end).getFullYear()}
              </strong>
            </article>
            <article className="hero-stat-card">
              <span>Deployment fit</span>
              <strong>Static GitHub Pages</strong>
            </article>
          </div>
        </div>
      </header>

      <section className="view-toolbar-card">
        <div className="view-toolbar-header">
          <div>
            <p className="eyebrow">Workspace Views</p>
            <h2>Choose a dashboard view</h2>
          </div>
          <p className="toolbar-copy">
            Start in Story for the ripple explanation, then switch to Evidence
            for the history chart and event comparison.
          </p>
        </div>

        <div className="view-pill-row">
          {VIEW_OPTIONS.map((view) => (
            <button
              type="button"
              key={view.id}
              className={`view-pill ${
                activeView === view.id ? 'is-active' : ''
              }`}
              onClick={() => setActiveView(view.id)}
            >
              <span>{view.kicker}</span>
              <strong>{view.title}</strong>
              <small>{view.description}</small>
            </button>
          ))}
        </div>
      </section>

      <DashboardToolbar />

      {activeView === 'ripple-explorer' ? (
        <div className="row g-4 mt-1">
          <div className="col-12 col-xxl-7">
            <RadialCascade />
          </div>
          <div className="col-12 col-xxl-5">
            <InsightPanel />
          </div>
        </div>
      ) : (
        <div className="row g-4 mt-1">
          <div className="col-12 col-xl-8">
            <LineChart />
          </div>
          <div className="col-12 col-xl-4">
            <ComparisonPanel />
          </div>
        </div>
      )}
    </main>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </div>
  );
}
