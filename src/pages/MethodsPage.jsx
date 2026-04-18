import { T } from "../utils/theme";

const SOURCES = [
  {
    name: "FOMC event table",
    detail: "Static event list in the repo, used to anchor meeting dates and direction of move.",
  },
  {
    name: "FRED DFF",
    detail: "Effective federal funds rate, used as the policy backdrop.",
  },
  {
    name: "FRED MORTGAGE30US",
    detail: "Freddie Mac 30-year fixed mortgage rate series served through FRED.",
  },
  {
    name: "Zillow Neighborhood ZHVI",
    detail: "Monthly smoothed neighborhood home values, matched to Los Angeles neighborhoods plus Glendale, Pasadena, and Burbank for the interactive map and comparison views.",
  },
];

const NOTES = [
  "Mortgage-rate response is measured with average rates in a 4-week window before the meeting and a 6-week window beginning 1 week after the meeting.",
  "Home-price response is measured with monthly Zillow neighborhood home values, so the dashboard compares the meeting month with 3, 6, or 12 months after it.",
  "The neighborhood map shows either who outpaced the typical LA neighborhood after the meeting or who started slowing down compared with right before it.",
  "The trend line below the map uses cluster medians so viewers can see how different parts of Los Angeles moved over a significant pre/post-meeting window.",
  "A simple analog forecast looks for similar earlier meetings using policy change, mortgage follow-through, and recent rate level, then summarizes what Los Angeles neighborhoods usually did next.",
  "This is a descriptive timing tool. It shows how policy, mortgage rates, and home prices moved around the same events, but it does not prove causation.",
];

export default function MethodsPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>About & Methods</h1>
      <p style={styles.pageSubtitle}>
        What this narrower dashboard measures, where the data comes from, and how to read the housing response.
      </p>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Scope</h2>
        <p style={styles.body}>
          This version of Policy Ripple is intentionally narrower. Instead of showing
          a broad macro cascade, it focuses on one transmission path: how Federal
          Reserve decisions feed into 30-year mortgage rates and then into Los Angeles
          neighborhood home prices.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Design Approach</h2>
        <p style={styles.body}>
          The dashboard follows a form-follows-function approach inspired by Alberto
          Cairo&apos;s visualization wheel: prioritize truthful framing, functional task
          support, and insight before adding style. That is why the dashboard now
          uses the real Mapping L.A. neighborhood boundaries instead of a synthetic
          comparison layout. The city geography tells viewers where the effects showed
          up, while the timeline above the map explains when different parts of Los
          Angeles moved.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Data Sources</h2>
        <div style={styles.sourceList}>
          {SOURCES.map((source) => (
            <div key={source.name} style={styles.sourceCard}>
              <strong style={styles.sourceTitle}>{source.name}</strong>
              <span style={styles.sourceBody}>{source.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Reading the Views</h2>
        <ul style={styles.list}>
          {NOTES.map((note) => (
            <li key={note} style={styles.listItem}>
              {note}
            </li>
          ))}
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Limits</h2>
        <p style={styles.body}>
          Housing is slow. Mortgage rates move fast, but home prices adjust through
          listings, buyer demand, appraisals, inventory, and local supply constraints.
          That means a hike can raise borrowing costs quickly while prices continue
          rising for a time. The dashboard is most useful for seeing timing, lag, and
          neighborhood variation inside Los Angeles rather than claiming a one-for-one
          policy effect.
        </p>
      </section>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "40px 24px 72px",
    fontFamily:
      '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif',
  },
  pageTitle: {
    color: T.textPrimary,
    fontSize: "clamp(2rem, 4vw, 3rem)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    marginBottom: 8,
  },
  pageSubtitle: {
    color: T.textSecondary,
    fontSize: 15,
    lineHeight: 1.6,
    maxWidth: 760,
    marginBottom: 28,
  },
  section: {
    marginBottom: 22,
    padding: 20,
    background: `linear-gradient(145deg, ${T.cardBg}, ${T.cardBgAlt})`,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 18,
  },
  sectionTitle: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    margin: "0 0 10px",
  },
  body: {
    color: T.textSecondary,
    fontSize: 14,
    lineHeight: 1.65,
    margin: 0,
  },
  sourceList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  sourceCard: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 14,
    borderRadius: 14,
    border: `1px solid ${T.cardBorderLight}`,
    background: "rgba(255,255,255,0.03)",
  },
  sourceTitle: {
    color: T.textPrimary,
    fontSize: 13,
  },
  sourceBody: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  list: {
    margin: 0,
    paddingLeft: 20,
    color: T.textSecondary,
  },
  listItem: {
    marginBottom: 8,
    lineHeight: 1.6,
    fontSize: 14,
  },
};
