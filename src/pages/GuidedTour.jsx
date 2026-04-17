import { useMemo } from "react";
import { T } from "../utils/theme";
import { computeCascadeChanges } from "../utils/dataProcessing";
import RadialCascade from "../components/RadialCascade";
import ForwardOutcomes from "../components/ForwardOutcomes";

const CASE_STUDIES = [
  {
    id: "covid-cut",
    dateStr: "2020-03-15",
    title: "The COVID Emergency Cut",
    subtitle: "March 15, 2020 — Cut of 150 bps to near-zero",
    accent: T.cut,
    setup: `By mid-March 2020, COVID-19 had shut down entire economies. The S&P 500 had fallen 20% in three weeks — the fastest bear market in history. Credit markets were seizing up as investors scrambled for cash. The Fed had already cut rates by 50 bps in an emergency meeting on March 3, but it wasn't enough. On Sunday, March 15 — before markets opened — the Fed slashed rates by another 100 bps to near-zero and announced $700 billion in asset purchases.`,
    decision: `This was extraordinary: a Sunday night emergency announcement, the largest single rate cut since the 2008 financial crisis, combined with immediate quantitative easing. The message was unmistakable — the Fed would do "whatever it takes" to prevent financial collapse.`,
    observations: [
      {
        label: "Immediate paradox",
        text: "Despite the massive cut, stocks initially fell further on Monday as the scale of the pandemic became clear. The VIX (fear gauge) remained elevated above 80 — its highest level ever recorded.",
      },
      {
        label: "Credit markets",
        text: "Corporate bond yields (BAA) initially spiked as credit stress overwhelmed the rate cut. Only after the Fed expanded its facilities to buy corporate bonds did spreads begin to normalize.",
      },
      {
        label: "Long-term seeds",
        text: "The forward outcomes tell the real story: S&P 500 +66% at one year, but unemployment still elevated +1.7 pp and CPI up +2.7% — the inflation that would dominate 2021-2022 was already being planted by the flood of liquidity.",
      },
    ],
    takeaway: "Emergency action prevented a financial meltdown, but the scale of monetary and fiscal response planted the seeds for the inflation surge that would force aggressive tightening two years later.",
  },
  {
    id: "first-75",
    dateStr: "2022-06-15",
    title: "The First 75 bp Hike",
    subtitle: "June 15, 2022 — Largest rate hike since 1994",
    accent: T.hike,
    setup: `By June 2022, inflation had reached 9.1% — the highest in 40 years. The Fed had been raising rates since March, but in measured 25-50 bp increments. Then, days before the June meeting, a hotter-than-expected CPI report forced a pivot. Markets had been pricing in 50 bps; suddenly 75 bps was on the table. Fed Chair Powell acknowledged the CPI data changed the calculus.`,
    decision: `The Fed delivered its first 75 bp hike since 1994, signaling that it would prioritize fighting inflation even at the risk of recession. The dot plot showed the most aggressive projected rate path in years. This was the moment the "Fed pivot" narrative died and "higher for longer" took hold.`,
    observations: [
      {
        label: "Yield surge",
        text: "Treasury yields jumped across the curve. The 2-year yield — most sensitive to policy expectations — surged as markets repriced the entire rate path upward.",
      },
      {
        label: "Crypto crash",
        text: "Bitcoin fell 25% in the surrounding period, part of a broader crypto meltdown as risk assets repriced for a world of expensive money. This was among the largest cross-asset moves in the cascade.",
      },
      {
        label: "Resilient labor market",
        text: "The forward outcomes show that despite aggressive tightening, unemployment barely budged over the next year. The labor market proved remarkably resilient — defying recession predictions.",
      },
    ],
    takeaway: "Aggressive tightening can work without triggering immediate recession. The 75 bp hike marked the beginning of the most aggressive tightening cycle in decades, yet the economy avoided the hard landing many predicted — at least through 2023.",
  },
  {
    id: "hold-pause",
    dateStr: "2023-06-14",
    title: 'The Strategic Pause',
    subtitle: "June 14, 2023 — Rate held at 5.00–5.25% after 10 consecutive hikes",
    accent: T.hold,
    setup: `After 10 consecutive rate hikes totaling 500 basis points — the fastest tightening cycle since the early 1980s — the Fed paused. Inflation was falling but still well above target. The banking sector had just survived the collapse of Silicon Valley Bank and Signature Bank in March. Markets were divided: was this a pause before more hikes, or the beginning of the end?`,
    decision: `The Fed held rates steady at 5.00–5.25%, its first pause since the tightening campaign began in March 2022. But the accompanying statement and dot plot were hawkish — projecting at least two more hikes. This was framed as a "skip," not a "stop."`,
    observations: [
      {
        label: "Muted cascade",
        text: "The radial cascade shows relatively small changes across most indicators — exactly what you'd expect when the decision matches expectations. The absence of surprise means the absence of a large market reaction.",
      },
      {
        label: "Divergence signals",
        text: "Look for divergence beacons: some indicators may move against the \"hold\" direction, reflecting the hawkish guidance that accompanied the pause rather than the rate decision itself.",
      },
      {
        label: "Forward clarity",
        text: "The forward outcomes show what happened next: the Fed hiked one more time in July, then held for the rest of 2023, with rates remaining at 5.25-5.50% — the 'higher for longer' regime the market had to accept.",
      },
    ],
    takeaway: "Sometimes the absence of action tells the story. A hold after 10 consecutive hikes was itself a policy signal, and the muted market reaction shows that when the Fed communicates clearly, markets pre-adjust — making the actual decision anticlimactic.",
  },
];

function CaseStudy({ cs, event, indicatorData, onJumpToExplorer }) {
  const changes = useMemo(() => {
    if (!event || !indicatorData) return null;
    return computeCascadeChanges(event, indicatorData);
  }, [event, indicatorData]);

  return (
    <article style={styles.caseStudy}>
      <div style={{ ...styles.caseHeader, borderLeftColor: cs.accent }}>
        <h2 style={styles.caseTitle}>{cs.title}</h2>
        <p style={styles.caseSubtitle}>{cs.subtitle}</p>
      </div>

      <div style={styles.narrativeBlock}>
        <h3 style={styles.narrativeLabel}>The Setup</h3>
        <p style={styles.body}>{cs.setup}</p>
      </div>

      <div style={styles.narrativeBlock}>
        <h3 style={styles.narrativeLabel}>The Decision</h3>
        <p style={styles.body}>{cs.decision}</p>
      </div>

      {changes && event && (
        <div style={styles.vizContainer}>
          <h3 style={styles.narrativeLabel}>The Cascade</h3>
          <p style={{ ...styles.body, fontSize: 12, color: T.textDim, marginBottom: 8 }}>
            Each ring shows how a layer of the economy responded. Inner rings
            react within days; outer rings take weeks to months.
          </p>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <RadialCascade
              changes={changes}
              event={event}
              activeIndicator={null}
              onSegmentClick={() => {}}
            />
          </div>
        </div>
      )}

      <div style={styles.observationsBlock}>
        <h3 style={styles.narrativeLabel}>Key Observations</h3>
        {cs.observations.map((obs, i) => (
          <div key={i} style={{ ...styles.observation, borderLeftColor: cs.accent }}>
            <strong style={{ color: T.textPrimary }}>{obs.label}:</strong>{" "}
            {obs.text}
          </div>
        ))}
      </div>

      {event && indicatorData && (
        <div style={styles.vizContainer}>
          <h3 style={styles.narrativeLabel}>What Happened After</h3>
          <ForwardOutcomes
            indicatorData={indicatorData}
            event={event}
            direction={event.direction}
          />
        </div>
      )}

      <div style={styles.takeawayBox}>
        <strong>Takeaway:</strong> {cs.takeaway}
      </div>

      <button
        onClick={() => onJumpToExplorer(cs.dateStr)}
        style={styles.jumpBtn}
      >
        Explore this event in the dashboard →
      </button>
    </article>
  );
}

export default function GuidedTour({ allEvents, indicatorData, onNavigate }) {
  const eventsByDate = useMemo(() => {
    if (!allEvents) return {};
    const map = {};
    for (const ev of allEvents) map[ev.dateStr] = ev;
    return map;
  }, [allEvents]);

  const handleJump = (dateStr) => {
    onNavigate("dashboard", dateStr);
  };

  return (
    <div style={styles.page}>
      <div style={styles.intro}>
        <h1 style={styles.pageTitle}>Guided Tour</h1>
        <p style={styles.pageSubtitle}>
          Three landmark FOMC decisions that shaped the modern economy — each
          told as a mini-story with the data to back it up. After reading these,
          explore the full dashboard to discover your own patterns.
        </p>
        <div style={styles.tocBox}>
          <strong style={{ color: T.textPrimary, fontSize: 12 }}>In this tour:</strong>
          {CASE_STUDIES.map((cs, i) => (
            <a
              key={cs.id}
              href={`#${cs.id}`}
              style={{ ...styles.tocLink, color: cs.accent }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(cs.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {i + 1}. {cs.title}
            </a>
          ))}
        </div>
      </div>

      {CASE_STUDIES.map((cs) => (
        <div key={cs.id} id={cs.id}>
          <CaseStudy
            cs={cs}
            event={eventsByDate[cs.dateStr]}
            indicatorData={indicatorData}
            onJumpToExplorer={handleJump}
          />
        </div>
      ))}

      <div style={styles.ctaBlock}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: T.textPrimary }}>
          Ready to explore on your own?
        </h2>
        <p style={{ fontSize: 14, color: T.textSecondary, margin: "0 0 16px" }}>
          The dashboard has 217 FOMC events spanning 26 years. Use the stepper,
          keyboard arrows, comparison mode, and ripple lens to discover your own
          patterns.
        </p>
        <button
          onClick={() => onNavigate("dashboard")}
          style={{ ...styles.jumpBtn, fontSize: 14, padding: "10px 24px" }}
        >
          Open the Dashboard →
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 820,
    margin: "0 auto",
    padding: "32px 24px 64px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: T.textPrimary,
  },
  intro: {
    marginBottom: 48,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
  },
  pageSubtitle: {
    fontSize: 15,
    color: T.textSecondary,
    margin: "0 0 20px",
    lineHeight: 1.7,
  },
  tocBox: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: T.cardBg,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 8,
    padding: "12px 16px",
  },
  tocLink: {
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
    paddingLeft: 8,
  },
  caseStudy: {
    marginBottom: 64,
    paddingBottom: 48,
    borderBottom: `1px solid ${T.cardBorder}`,
  },
  caseHeader: {
    borderLeft: "4px solid",
    paddingLeft: 16,
    marginBottom: 24,
  },
  caseTitle: {
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 4px",
  },
  caseSubtitle: {
    fontSize: 13,
    color: T.textDim,
    margin: 0,
    fontWeight: 500,
  },
  narrativeBlock: {
    marginBottom: 20,
  },
  narrativeLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: T.textDim,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    margin: "0 0 8px",
  },
  body: {
    fontSize: 14,
    color: T.textSecondary,
    lineHeight: 1.75,
    margin: 0,
  },
  vizContainer: {
    margin: "24px 0",
    padding: "16px 0",
  },
  observationsBlock: {
    marginBottom: 20,
  },
  observation: {
    borderLeft: "3px solid",
    paddingLeft: 14,
    marginBottom: 12,
    fontSize: 13,
    color: T.textSecondary,
    lineHeight: 1.7,
  },
  takeawayBox: {
    background: `${T.accent}10`,
    border: `1px solid ${T.accent}30`,
    borderLeft: `3px solid ${T.accent}`,
    borderRadius: 6,
    padding: "14px 18px",
    fontSize: 14,
    color: T.textSecondary,
    lineHeight: 1.7,
    marginTop: 20,
  },
  jumpBtn: {
    marginTop: 16,
    background: "none",
    border: `1px solid ${T.accent}`,
    color: T.accent,
    borderRadius: 6,
    padding: "6px 16px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.15s ease",
  },
  ctaBlock: {
    textAlign: "center",
    padding: "48px 0",
  },
};
